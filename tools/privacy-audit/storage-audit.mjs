// Sequential canary storage test. Does not open existing profile directories.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
const ORIGIN='https://doppelx-storage.invalid';
export const STORAGE_FIELDS=['local','cookie','indexedDB','cache'];
export async function storageOperation({key,value,write}) {
  const open=()=>new Promise((resolve,reject)=>{
    const request=indexedDB.open('dx-storage-canary',1);
    request.onupgradeneeded=()=>request.result.createObjectStore('canaries');
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(new Error('IndexedDB open failed'));
    request.onblocked=()=>reject(new Error('IndexedDB open blocked'));
  });
  const db=await open();
  try {
    if (write) {
      localStorage.setItem(key,value);
      document.cookie=key+'='+value+'; Max-Age=3600; Path=/; Secure; SameSite=Lax';
      await new Promise((resolve,reject)=>{
        const tx=db.transaction('canaries','readwrite');
        tx.objectStore('canaries').put(value,key);
        tx.oncomplete=resolve;
        tx.onerror=()=>reject(new Error('IndexedDB write failed'));
        tx.onabort=()=>reject(new Error('IndexedDB write aborted'));
      });
      const cache=await caches.open('dx-storage-canary');
      await cache.put('/'+key,new Response(value));
    }
    const idb=await new Promise((resolve,reject)=>{
      const tx=db.transaction('canaries','readonly');
      const request=tx.objectStore('canaries').get(key);
      request.onsuccess=()=>resolve(request.result ?? null);
      request.onerror=()=>reject(new Error('IndexedDB read failed'));
    });
    const cookie=document.cookie.split(';').map(x=>x.trim()).find(x=>x.startsWith(key+'='));
    const cache=await caches.open('dx-storage-canary');
    const response=await cache.match('/'+key);
    return {local:localStorage.getItem(key),cookie:cookie?cookie.slice(key.length+1):null,
      indexedDB:idb,cache:response?await response.text():null};
  } finally { db.close(); }
}
export function storageMatches(snapshot,value) {
  return STORAGE_FIELDS.every(key=>snapshot && Object.hasOwn(snapshot,key) && snapshot[key]===value);
}
export async function runStorageAudit(chromium,launchOptions,initScript,{parent=path.join(os.homedir(),'dx-storage-audits')}={}) {
  fs.mkdirSync(parent,{recursive:true,mode:0o700});
  const root=fs.mkdtempSync(path.join(parent,'run-'));
  const a='a'+randomUUID().replaceAll('-','');
  const b='b'+randomUUID().replaceAll('-','');
  const keyA='dx_a',keyB='dx_b';
  const checks=[];
  let context;
  const check=(id,condition)=>checks.push({id,status:condition?'PASS':'FAIL'});
  async function visit(directory,action) {
    // Each context is fully closed before the next is launched.
    context=await chromium.launchPersistentContext(path.join(root,directory),launchOptions);
    try {
      context.setDefaultTimeout(10000);
      await context.addInitScript(initScript);
      await context.route(ORIGIN+'/**',route=>route.fulfill({
        status:200,contentType:'text/html',body:'<!doctype html><title>Local storage canary</title>',
      }));
      const page=context.pages()[0] || await context.newPage();
      await page.goto(ORIGIN+'/test',{waitUntil:'domcontentloaded',timeout:15000});
      const op=async(key,value,write=false)=>{
        let timer;
        try {
          return await Promise.race([
            page.evaluate(storageOperation,{key,value,write}),
            new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Storage operation timeout')),10000);}),
          ]);
        } finally { clearTimeout(timer); }
      };
      await action(op);
    } finally { await context.close(); context=null; }
  }
  let errorType;
  try {
    await visit('A',async op=>{
      check('A-initially-empty',storageMatches(await op(keyA),null) && storageMatches(await op(keyB),null));
      check('A-write-read',storageMatches(await op(keyA,a,true),a));
    });
    await visit('B',async op=>{
      check('B-cannot-see-A',storageMatches(await op(keyA),null));
      check('B-write-read',storageMatches(await op(keyB,b,true),b));
    });
    await visit('A',async op=>{
      check('A-persists-after-reopen',storageMatches(await op(keyA),a));
      check('A-cannot-see-B',storageMatches(await op(keyB),null));
    });
    await visit('B',async op=>{
      check('B-persists-after-reopen',storageMatches(await op(keyB),b));
      check('B-still-cannot-see-A',storageMatches(await op(keyA),null));
    });
  } catch(e) { errorType=e.name; }
  const status=checks.some(c=>c.status==='FAIL')?'FAIL':errorType || checks.length!==8?'UNKNOWN':'PASS';
  const report={status,observedAt:new Date().toISOString(),checks,errorType,
    storageFields:STORAGE_FIELDS,directory:root,
    scope:'Four storage APIs in two NEW synthetic persistent contexts, launched sequentially with session launch settings and sanitized runtime. Not isolation proof for existing saved profiles or OS processes.',
    notTested:['service workers','HTTP cache','sessionStorage','cross-site storage','real server TLS','browser background network','atomic proxy switching'],
    retained:'Only generated canary directories retained; no existing session opened or deleted.'};
  console.log('STORAGE AUDIT:',JSON.stringify(report,null,2));
  return report;
}

export function addStorageAudit(source) {
  const marker="    console.log('SCOPED PASS: exit IP, selected surfaces and credential projection only; full audit incomplete.');";
  if (source.split(marker).length!==2) throw new Error('Storage audit insertion boundary mismatch');
  return source.replace(marker, `    if (process.argv.includes('--storage')) {
      const payload = 'window.__DOPPEL_PROFILE__ = ' + JSON.stringify(slim) + ';\\n' + spoofSrc;
      const storageGate = await runStorageAudit(chromium, launchOpts, payload);
      if (storageGate.status !== 'PASS') throw new Error('Storage audit failed or incomplete');
    }
` + marker);
}
