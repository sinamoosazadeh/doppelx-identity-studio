import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {addStorageAudit,runStorageAudit,storageMatches,STORAGE_FIELDS,storageOperation} from './storage-audit.mjs';
test('missing storage values are not accepted as empty',()=>{
  assert.equal(storageMatches({},null),false);
  assert.equal(storageMatches(Object.fromEntries(STORAGE_FIELDS.map(k=>[k,null])),null),true);
});
test('storage browser operation and insertion parse without executing browser',()=>{
  new Function('return ('+storageOperation.toString()+')');
  assert.throws(()=>addStorageAudit('unexpected'),/boundary/);
});
function fakeDriver(shared=false) {
  const stores=new Map(); let active=0,max=0,launches=0;
  const chromium={async launchPersistentContext(dir){
    active++;launches++;max=Math.max(max,active);
    const key=shared?'shared':dir;
    if(!stores.has(key))stores.set(key,new Map());
    const store=stores.get(key);
    const page={async goto(){},async evaluate(fn,args){
      if(args.write)store.set(args.key,args.value);
      return Object.fromEntries(STORAGE_FIELDS.map(k=>[k,store.get(args.key) ?? null]));
    }};
    return {setDefaultTimeout(){},async addInitScript(){},async route(){},pages(){return [page];},async close(){active--;}};
  }};
  return {chromium,stats:()=>({active,max,launches})};
}
test('synthetic driver is sequential and reopens both persistent directories',async()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'dx-unit-'));
  try {
    const driver=fakeDriver();
    const result=await runStorageAudit(driver.chromium,{},'synthetic',{parent:root});
    assert.equal(result.status,'PASS');
    assert.equal(result.checks.length,8);
    assert.deepEqual(driver.stats(),{active:0,max:1,launches:4});
  } finally {fs.rmSync(root,{recursive:true,force:true});}
});
test('synthetic shared storage is detected, not marked isolated',async()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'dx-unit-'));
  try {
    const driver=fakeDriver(true);
    const result=await runStorageAudit(driver.chromium,{},'synthetic',{parent:root});
    assert.equal(result.status,'FAIL');
    assert.ok(result.checks.some(c=>c.id==='B-cannot-see-A' && c.status==='FAIL'));
  } finally {fs.rmSync(root,{recursive:true,force:true});}
});
