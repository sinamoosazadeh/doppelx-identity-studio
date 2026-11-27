import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareSessionProfile,buildSessionHeaders,addSessionCoherence} from './session-coherence.mjs';
const profile=()=>({navigator:{userAgent:'Chrome/156'},locale:{languages:['de-DE','de']},network:{proxy:{password:'CANARY'}},
  clientHints:{mobile:true,platform:'Android',brands:[{brand:'Chromium',version:'156'},{brand:'Google Chrome',version:'156'},{brand:'Google Chrome',version:'156'},{brand:'Not)A;Brand',version:'99'}],
    fullVersionList:[{brand:'Google Chrome',version:'156.0.0.0'},{brand:'Google Chrome',version:'156.0.0.0'}]}});
test('deduplicates only identical brand entries without mutating stored input',()=>{
  const p=profile();const before=JSON.stringify(p);const out=prepareSessionProfile(p);
  assert.equal(out.clientHints.brands.length,3);
  assert.equal(out.clientHints.fullVersionList.length,1);
  assert.equal(out.navigator.userAgent,p.navigator.userAgent);
  assert.equal(out.network.proxy.password,'CANARY');
  assert.equal(JSON.stringify(p),before);
});
test('header builder includes all distinct model brands, including GREASE',()=>{
  const h=buildSessionHeaders(prepareSessionProfile(profile()));
  assert.equal(h['Sec-CH-UA'],'"Chromium";v="156", "Google Chrome";v="156", "Not)A;Brand";v="99"');
  assert.equal(h['Accept-Language'],'de-DE,de');
  assert.equal(JSON.stringify(h).includes('CANARY'),false);
});
test('conflicting duplicate versions stop rather than silently selecting one',()=>{
  const p=profile();p.clientHints.brands[2].version='158';
  assert.throws(()=>prepareSessionProfile(p),/Conflicting/);
});
test('rejects header newlines',()=>{
  const p=profile();p.locale.languages=['de-DE\r\nInjected: value'];
  assert.throws(()=>buildSessionHeaders(p),/Invalid outgoing/);
});
test('unknown launcher shape cannot be transformed',()=>{
  assert.throws(()=>addSessionCoherence('unexpected'),/Unexpected/);
});
