import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { collectRealms, assessRealms, PARITY_FIELDS } from './realm-audit.mjs';
const value = () => ({ua:'test', platform:'test', language:'de-DE', languages:['de-DE'],
  hints:{mobile:true}, boundary:{profilePresent:true,personaPresent:false,upstreamProxyPresent:false}});
const fixture = () => Object.fromEntries(['main','blankIframe','classicBlobWorker','moduleBlobWorker']
  .map(key=>[key,{status:'OK',values:value()}]));
test('equal measured fields pass only the named scope',()=>{
  const result=assessRealms(fixture());
  assert.equal(result.parity,'PASS');
  assert.equal(result.credentialObjects,'PASS');
  assert.ok(result.notTested.includes('server headers'));
});
test('worker timeout is unknown, not green',()=>{
  const report=fixture(); report.moduleBlobWorker={status:'TIMEOUT'};
  assert.equal(assessRealms(report).parity,'UNKNOWN');
  assert.equal(assessRealms(report).credentialObjects,'UNKNOWN');
});
test('credential object in any tested realm fails boundary',()=>{
  const report=fixture(); report.classicBlobWorker.values.boundary.upstreamProxyPresent=true;
  assert.equal(assessRealms(report).credentialObjects,'FAIL');
});
test('different worker surface fails parity',()=>{
  const report=fixture(); report.moduleBlobWorker.values.platform='different';
  assert.equal(assessRealms(report).parity,'FAIL');
});
test('collector is self-contained and executes in synthetic browser/worker harness',async()=>{
  const nav={userAgent:'test',platform:'test',language:'de-DE',languages:['de-DE'],
    userAgentData:{getHighEntropyValues:async()=>({mobile:true})}};
  const blobs=new Map(); let serial=0;
  class Blob { constructor(parts){this.code=parts.join('');} }
  const URL={createObjectURL(blob){const id='blob:'+serial++;blobs.set(id,blob.code);return id;},
    revokeObjectURL(id){blobs.delete(id);}};
  class Worker {
    constructor(url){queueMicrotask(()=>{
      try {vm.runInNewContext(blobs.get(url),{navigator:nav,
        postMessage:data=>this.onmessage?.({data}),__DOPPEL_PROFILE__:{navigator:{}}});}
      catch{this.onerror?.();}
    });}
    terminate(){}
  }
  const context=vm.createContext({navigator:nav,__DOPPEL_PROFILE__:{navigator:{}},
    document:{body:{appendChild(){}},createElement(){return {
      contentWindow:{navigator:nav,__DOPPEL_PROFILE__:{navigator:{}}},remove(){},
    };}}, Blob,URL,Worker,setTimeout,clearTimeout});
  const report=await vm.runInContext('('+collectRealms.toString()+')()',context);
  assert.equal(assessRealms(report).parity,'PASS');
  assert.equal(assessRealms(report).credentialObjects,'PASS');
  assert.equal(blobs.size,0);
  assert.ok(PARITY_FIELDS.includes('hints'));
});
