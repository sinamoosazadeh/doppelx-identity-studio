import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {profileSummary,modelObservations,foreignBrowserCommands,exactProfile,acquireLock,reportSummary} from './managed-support.mjs';
import {bindEngineVersion} from './engine-binding.mjs';
import {observeSurfaces} from './surface-audit.mjs';
test('profile listing cannot serialize credentials',()=>{
  const p={id:'prf_a',name:'test',network:{proxy:{exitIp:'1.1.1.1',password:'SECRET'}},persona:{password:'SECRET'}};
  assert.equal(JSON.stringify(profileSummary(p)).includes('SECRET'),false);
});
test('requires exact profile ID rather than name substring',()=>{
  assert.equal(exactProfile([{id:'prf_abc'}],'prf_abc').id,'prf_abc');
  assert.throws(()=>exactProfile([{id:'prf_abc',name:'abc'}],'abc'));
});
test('detects project Chromium without flagging unrelated browser roots',()=>{
  assert.equal(foreignBrowserCommands([['chromium','--user-data-dir=/home/test/dx-sessions/prf_a']],['/home/test/dx-sessions']),1);
  assert.equal(foreignBrowserCommands([['chromium','--user-data-dir=/home/test/dx-sessions-other']],['/home/test/dx-sessions']),0);
});
test('managed lock excludes second launch and release permits later launch',()=>{
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'dx-lock-test-'));
  try {
    const lock=path.join(tmp,'lock');const release=acquireLock(lock);
    assert.throws(()=>acquireLock(lock),{code:'EEXIST'});release();
    acquireLock(lock)();
  } finally {fs.rmSync(tmp,{recursive:true,force:true});}
});
test('unknown gates remain incomplete and failure is retained',()=>{
  assert.equal(reportSummary({x:{status:'UNKNOWN'}}),'INCOMPLETE');
  assert.equal(reportSummary({x:{status:'FAIL'},y:{status:'PASS'}}),'FAIL');
});
test('engine/model mismatch is observed rather than certified',()=>{
  assert.equal(modelObservations({navigator:{userAgent:'Chrome/156.0.0.0'}},'158.0.8127.36').versionAgreement,'FAIL');
});
const p=()=>({browser:{family:'chrome'},navigator:{userAgent:'Mozilla/5.0 Chrome/156.0.0.0 Mobile'},
  clientHints:{brands:[{brand:'Chromium',version:'156'},{brand:'Not)A;Brand',version:'99'}],
    fullVersionList:[{brand:'Chromium',version:'156.0.1.2'}]}});
test('binds session version to installed engine without mutating database input',()=>{
  const original=p();const before=JSON.stringify(original);
  const out=bindEngineVersion(original,'Chromium 158.0.8127.36').profile;
  assert.ok(out.navigator.userAgent.includes('Chrome/158.0.0.0'));
  assert.equal(out.clientHints.fullVersion,'158.0.8127.36');
  assert.equal(out.clientHints.brands[1].version,'99');
  assert.equal(JSON.stringify(original),before);
});
test('cannot silently rebrand non-Chromium models or unknown binary output',()=>{
  const original=p();original.browser.family='safari';
  assert.throws(()=>bindEngineVersion(original,'Chromium 158.0.8127.36'));
  assert.throws(()=>bindEngineVersion(p(),'unknown'));
});
test('surface observer parses and contains no API mutation installer',()=>{
  new Function('return ('+observeSurfaces.toString()+')');
  assert.ok(!observeSurfaces.toString().includes('defineProperty'));
});
