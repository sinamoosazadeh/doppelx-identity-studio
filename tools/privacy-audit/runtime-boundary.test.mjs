import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { buildRuntimeData, RUNTIME_SCHEMA } from './runtime-boundary.mjs';

const minimal = () => ({navigator:{userAgent:'SYNTHETIC TEST UA'}});
test('drops connection credentials and persona before serialization', () => {
  const p = minimal();
  p.persona = {username:'CANARY_PERSON',password:'CANARY_PERSON_SECRET'};
  p.network = {webrtc:'disabled', connection:{rtt:50}, proxy:{username:'CANARY_PROXY',password:'CANARY_PROXY_SECRET'}};
  p.navigator.password = 'CANARY_NESTED_SECRET';
  p.id = 'CANARY_ID';
  p.name = 'CANARY_NAME';
  const before = JSON.stringify(p);
  const out = buildRuntimeData(p);
  assert.equal(JSON.stringify(out).includes('CANARY'), false);
  assert.deepEqual(out.network, {webrtc:'disabled',connection:{rtt:50}});
  assert.equal(JSON.stringify(p), before);
});
test('filters nested array objects and produces independent data', () => {
  const p = minimal();
  p.clientHints = {brands:[{brand:'Chromium',version:'158',password:'SECRET'}]};
  const out = buildRuntimeData(p);
  assert.deepEqual(out.clientHints.brands, [{brand:'Chromium',version:'158'}]);
  out.clientHints.brands[0].version = 'changed';
  assert.equal(p.clientHints.brands[0].version, '158');
});
test('rejects invalid types without printing input values', () => {
  const p = minimal();
  p.navigator.hardwareConcurrency = {password:'SECRET'};
  assert.throws(() => buildRuntimeData(p), error =>
    error instanceof TypeError && !error.message.includes('SECRET'));
});
test('does not invoke getters', () => {
  const p = minimal();
  let called = false;
  Object.defineProperty(p.navigator, 'platform', {get(){called=true;return 'SECRET';}});
  assert.throws(() => buildRuntimeData(p), /Accessor/);
  assert.equal(called, false);
});
test('does not copy prototype pollution or unknown fields', () => {
  const p = JSON.parse('{"navigator":{"userAgent":"test","__proto__":{"polluted":true}},"__proto__":{"polluted":true}}');
  assert.deepEqual(buildRuntimeData(p), {navigator:{userAgent:'test'}});
  assert.equal({}.polluted, undefined);
});
test('rejects absent required navigator', () => {
  assert.throws(() => buildRuntimeData({}), /Missing/);
});

const root = new URL('../../android/app/assets/js/', import.meta.url);
const runtime = readFileSync(new URL('spoof.js', root), 'utf8');
test('all currently observed dot-access field dependencies are reviewed', () => {
  // Static tripwire only: not a substitute for browser regression tests.
  const aliases = {B:'browser',n:'navigator',loc:'locale',geo:'geo',scr:'screen',
    disp:'display',hw:'hardware',fp:'fingerprint',net:'network',ch:'clientHints'};
  for (const [alias, section] of Object.entries(aliases)) {
    const reads = [...runtime.matchAll(new RegExp('\\b'+alias+'\\.([A-Za-z_$][\\w$]*)','g'))];
    for (const [, key] of reads) assert.ok(Object.hasOwn(RUNTIME_SCHEMA[section], key), `${section}.${key} needs review`);
  }
});
test('generated profile settings survive projection across platform fixtures', () => {
  const ctx = vm.createContext({console, crypto:globalThis.crypto});
  for (const name of ['catalog.js','engine.js']) {
    vm.runInContext(readFileSync(new URL(name, root), 'utf8'), ctx);
  }
  for (const platform of ['android','windows','macos','linux','ios']) {
    // JSON transport mirrors the hub's actual API boundary.
    const p = JSON.parse(vm.runInContext(
      `JSON.stringify(DX.generate({platform:${JSON.stringify(platform)}}))`, ctx));
    const out = buildRuntimeData(p);
    for (const [section, schema] of Object.entries(RUNTIME_SCHEMA)) {
      if (p[section] == null) continue;
      if (Array.isArray(schema)) {
        assert.equal(out[section].length, p[section].length);
      } else {
        for (const key of Object.keys(schema)) {
          if (p[section][key] == null) continue;
          // Exact equality for scalar settings; structured projection tested separately.
          if (typeof schema[key] === 'string') assert.equal(out[section][key], p[section][key]);
        }
      }
    }
  }
});
