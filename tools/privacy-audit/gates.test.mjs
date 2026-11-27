import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateEvidence, compareRealms, REQUIRED_GATES } from './gates.mjs';
test('missing evidence cannot pass', () => {
  assert.equal(evaluateEvidence().status, 'INCOMPLETE');
});
test('legacy overall PASS is not gate evidence', () => {
  assert.equal(evaluateEvidence({ status: 'PASS', score: 100 }).status, 'INCOMPLETE');
});
test('failure dominates other gates', () => {
  assert.equal(evaluateEvidence({ 'secret-boundary': { status: 'FAIL' } }).status, 'FAIL');
});
test('unsubstantiated success becomes unknown', () => {
  assert.equal(evaluateEvidence({ 'exit-ip': { status: 'PASS' } }).gates[0].status, 'UNKNOWN');
});
test('all required measurements needed for scoped success', () => {
  const evidence = Object.fromEntries(REQUIRED_GATES.map(id => [id, {
    status: 'PASS', measurement: 'synthetic unit-test fixture', observedAt: '2026-11-27T00:00:00Z',
  }]));
  assert.equal(evaluateEvidence(evidence).status, 'PASS');
  evidence.webrtc.status = 'UNSUPPORTED';
  assert.equal(evaluateEvidence(evidence).status, 'INCOMPLETE');
});
test('worker errors and missing values are not parity', () => {
  assert.equal(compareRealms([{status:'OK',values:{ua:'a'}},{status:'ERROR'}], ['ua']), 'UNKNOWN');
  assert.equal(compareRealms([{status:'OK',values:{}},{status:'OK',values:{}}], ['ua']), 'UNKNOWN');
});
test('parity is distinguished from correctness', () => {
  const realm = ua => ({status:'OK', values:{ua}});
  assert.equal(compareRealms([realm('a'), realm('a')], ['ua']), 'PASS');
  assert.equal(compareRealms([realm('a'), realm('b')], ['ua']), 'FAIL');
});
