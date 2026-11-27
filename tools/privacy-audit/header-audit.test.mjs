import test from 'node:test';
import assert from 'node:assert/strict';
import { selectHeaders, assessHeaders, runHeaderAudit } from './header-audit.mjs';
const js={ua:'UA',languages:['de-DE','de'],hints:{mobile:true,platform:'Android',brands:[{brand:'Chromium',version:'156'}]}};
const headers={'User-Agent':'UA','Accept-Language':'de-DE,de;q=0.9',
  'Sec-Ch-Ua':'"Chromium";v="156"','Sec-Ch-Ua-Mobile':'?1','Sec-Ch-Ua-Platform':'"Android"'};
test('echo output excludes arbitrary and credential headers',()=>{
  const output=selectHeaders({...headers,Authorization:'SECRET',Cookie:'SECRET','X-Anything':'SECRET'});
  assert.equal(JSON.stringify(output).includes('SECRET'),false);
});
test('compares selected reflected headers with JS',()=>assert.equal(assessHeaders(headers,js).status,'PASS'));
test('missing header is unknown, not pass',()=>{
  const h={...headers}; delete h['Sec-Ch-Ua'];
  assert.equal(assessHeaders(h,js).status,'UNKNOWN');
});
test('duplicate brand mismatch is preserved',()=>{
  const j=structuredClone(js);j.hints.brands.push({...j.hints.brands[0]});
  assert.equal(assessHeaders(headers,j).checks.find(c=>c.id==='ch-brands').status,'FAIL');
});
test('UA mismatch is rejected',()=>assert.equal(assessHeaders(headers,{...js,ua:'different'}).status,'FAIL'));
test('echo outage is unknown and route is cleaned up',async()=>{
  let removed=false;
  const page={route:async()=>{},goto:async()=>{throw new Error('synthetic');},unroute:async()=>{removed=true;}};
  assert.equal((await runHeaderAudit(page)).status,'UNKNOWN');
  assert.equal(removed,true);
});
