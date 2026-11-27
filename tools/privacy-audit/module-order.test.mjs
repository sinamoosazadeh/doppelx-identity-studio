import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { STATIC_MODULE_LINE, ORDERED_MODULE_LINE, prepareModuleOrder } from './module-order.mjs';
const dataURL = code => 'data:text/javascript;base64,' + Buffer.from(code).toString('base64');
function observedOrder(line) {
  const child = dataURL('globalThis.observed = globalThis.ready === true;');
  const bootstrap = new Function('isModule','prelude','abs',line)(true,'globalThis.ready=true;\n',child);
  const result = spawnSync(process.execPath,['--input-type=module','-e',
    `await import(${JSON.stringify(dataURL(bootstrap))}); console.log(globalThis.observed);`],
    {encoding:'utf8',timeout:10000});
  assert.equal(result.status,0,result.stderr);
  return result.stdout.trim();
}
test('reproduces static-import execution before bootstrap in real JS engine',()=>{
  assert.equal(observedOrder(STATIC_MODULE_LINE),'false');
});
test('dynamic import executes target after bootstrap in real JS engine',()=>{
  assert.equal(observedOrder(ORDERED_MODULE_LINE),'true');
});
test('exact runtime transformation changes only one line and preserves classic workers',()=>{
  // Source comparison established that the reviewed phone file only differs in
  // these version comments. Any executable change fails the pinned hash gate.
  const source=readFileSync(new URL('../../android/app/assets/js/spoof.js',import.meta.url),'utf8')
    .replaceAll('v3.2.1','v3.2.0');
  const fixed=prepareModuleOrder(source);
  assert.equal(fixed.replace(ORDERED_MODULE_LINE,STATIC_MODULE_LINE),source);
  assert.ok(fixed.includes("return prelude + 'importScripts('"));
  assert.ok(fixed.includes('new Proxy(OrigSW'));
  new Function(fixed);
});
test('unexpected source refuses transformation',()=>{
  assert.throws(()=>prepareModuleOrder('not reviewed'),/Unreviewed/);
});
