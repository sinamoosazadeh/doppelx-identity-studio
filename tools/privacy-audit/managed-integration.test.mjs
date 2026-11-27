// Synthetic subprocess integration, not Android/browser operational evidence.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {execFile,spawn} from 'node:child_process';
import {promisify} from 'node:util';
import {fileURLToPath} from 'node:url';
const exec=promisify(execFile);
test('managed lifecycle writes scoped report, serializes canaries and cleans lock on exit mismatch',{timeout:20000},async()=>{
  const home=fs.mkdtempSync(path.join(os.tmpdir(),'dx-managed-unit-'));
  const write=(p,s)=>{fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,s);};
  const p={id:'prf_test',name:'Synthetic',browser:{family:'chrome'},navigator:{userAgent:'Mozilla/5.0 Chrome/156.0.0.0 Mobile',maxTouchPoints:5},
    clientHints:{brands:[{brand:'Chromium',version:'156'},{brand:'Google Chrome',version:'156'}],mobile:true,platform:'Android'},
    locale:{locale:'de-DE',languages:['de-DE','de']},geo:{tz:'Europe/Berlin'},display:{innerWidth:407,innerHeight:904,dpr:3},
    network:{proxy:{exitIp:'1.1.1.1',password:'CANARY_SECRET'}},persona:{password:'CANARY_SECRET'}};
  const server=http.createServer((req,res)=>{res.setHeader('content-type','application/json');
    res.end(JSON.stringify(req.url==='/api/health'?{relay:{running:true,listenPort:18080},scheduler:{running:false}}:{profiles:[p]}));});
  try{
    await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(8787,'127.0.0.1',resolve);});
    const runtime=fs.readFileSync(new URL('../../android/app/assets/js/spoof.js',import.meta.url),'utf8').replaceAll('v3.2.1','v3.2.0');
    write(path.join(home,'DOPPEL-X/02-android/app/assets/js/spoof.js'),runtime);
    write(path.join(home,'dx-runner/node_modules/playwright-core/index.js'),fs.readFileSync(new URL('./fixtures/fake-playwright.cjs',import.meta.url)));
    const binary=path.join(home,'bin/chromium');write(binary,'#!/bin/sh\necho "Chromium 158.0.8127.36"\n');fs.chmodSync(binary,0o700);
    const env={...process.env,HOME:home,CHROMIUM_BIN:binary};
    for(const k of ['DX_ROOT','RUNNER_DIR','PW_CORE','DOPPELX_HUB','SESS_ROOT'])delete env[k];
    const runner=fileURLToPath(new URL('./managed-runner.mjs',import.meta.url));
    let output;
    try{await exec(process.execPath,[runner,'--profile','prf_test'],{env,timeout:12000});assert.fail('Incomplete audit must not exit 0');}
    catch(e){assert.equal(e.code,1);output=e.stdout;}
    const reports=path.join(home,'dx-managed/reports');
    const report=JSON.parse(fs.readFileSync(path.join(reports,fs.readdirSync(reports)[0])));
    assert.equal(report.status,'INCOMPLETE');assert.equal(report.cleanup,'CLOSED');
    assert.equal(report.gates['storage-scratch'].status,'PASS');assert.equal(report.gates['model-version'].status,'PASS');
    assert.equal(fs.existsSync(path.join(home,'dx-managed/runner.lock')),false);
    assert.equal(output.includes('CANARY_SECRET'),false);assert.equal(JSON.stringify(report).includes('CANARY_SECRET'),false);
    assert.equal(fs.readFileSync(path.join(home,'synthetic-close-events'),'utf8').trim().split('\n').length,5);
    try{await exec(process.execPath,[runner,'--profile','prf_test'],{env:{...env,TEST_MISMATCH:'1'},timeout:12000});assert.fail('Mismatch must not pass');}
    catch(e){assert.equal(e.code,1);}
    const all=fs.readdirSync(reports).map(n=>JSON.parse(fs.readFileSync(path.join(reports,n))));
    const mismatch=all.find(r=>r.gates['exit-ip'].status==='FAIL');
    assert.ok(mismatch);assert.equal(mismatch.cleanup,'CLOSED');assert.equal(mismatch.gates['headers-strict'].status,'UNKNOWN');
    assert.equal(fs.existsSync(path.join(home,'dx-managed/runner.lock')),false);
    const signalExit=await new Promise((resolve,reject)=>{
      const child=spawn(process.execPath,[runner,'--profile','prf_test','--open'],{env,stdio:['ignore','pipe','pipe']});
      let text='',signaled=false;
      const timer=setTimeout(()=>{child.kill('SIGKILL');reject(new Error('Synthetic open test timeout'));},10000);
      child.stdout.on('data',chunk=>{text+=chunk;if(!signaled && text.includes('OPEN:')){signaled=true;child.kill('SIGINT');}});
      child.on('error',reject);child.on('close',(code,signal)=>{clearTimeout(timer);resolve({code,signal,signaled});});
    });
    assert.equal(signalExit.signaled,true);assert.equal(signalExit.signal,null);assert.equal(signalExit.code,1);
    assert.equal(fs.existsSync(path.join(home,'dx-managed/runner.lock')),false);
    assert.equal(fs.readFileSync(path.join(home,'synthetic-close-events'),'utf8').trim().split('\n').length,7);
  }finally{await new Promise(resolve=>server.close(resolve));fs.rmSync(home,{recursive:true,force:true});}
});
