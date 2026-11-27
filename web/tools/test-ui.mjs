#!/usr/bin/env node
/* Full-app smoke test in jsdom: boot, navigate, generate, edit, validate, export. */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/* Self-locating: works wherever the package is extracted.
   jsdom is resolved from the local node_modules, or installed with:
       npm install jsdom        (inside 05-web/)                      */
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
function loadJsdom() {
  const candidates = [
    'jsdom',
    join(root, 'node_modules/jsdom/lib/api.js'),
    join(process.cwd(), 'node_modules/jsdom/lib/api.js'),
  ];
  for (const c of candidates) {
    try { return require(c); } catch (e) { /* try next */ }
  }
  console.error('\n✗ jsdom not found. Install it with:\n    cd 05-web && npm install jsdom\n');
  process.exit(2);
}
const { JSDOM, VirtualConsole } = loadJsdom();

const html = readFileSync(join(root, 'doppel.html'), 'utf8');
const vc = new VirtualConsole();
const errors = [];
vc.on('jsdomError', (e) => errors.push('jsdomError: ' + e.message));
vc.on('error', (...a) => errors.push('console.error: ' + a.join(' ')));
vc.on('warn', (...a) => { /* ignore React-ish noise */ });
vc.on('log', () => {});

const dom = new JSDOM(html, {
  runScripts: 'dangerously',
  pretendToBeVisual: true,
  url: 'https://example.com/doppel.html',
  virtualConsole: vc,
  resources: 'usable',
});
const { window } = dom;
// jsdom lacks a few APIs used by Live module — stub them
window.matchMedia = window.matchMedia || (() => ({ matches: false, addListener(){}, removeListener(){}, addEventListener(){}, removeEventListener(){} }));
window.OfflineAudioContext = undefined;
window.RTCPeerConnection = undefined;

await new Promise((r) => setTimeout(r, 800));
const doc = window.document;
const results = [];
const t = (name, fn) => {
  try { const v = fn(); results.push([!!v, name, v === false || v === undefined ? 'returned false' : '']); }
  catch (e) { results.push([false, name, e.message]); }
};
const $ = (sel) => doc.querySelector(sel);
const $$ = (sel) => [...doc.querySelectorAll(sel)];
const click = (el) => { if (!el) throw new Error('element missing'); el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true })); };

t('app booted with sidebar', () => !!$('.sidebar') && !!$('.app'));
t('dashboard rendered', () => !!$('.hero') && !!$('.stats'));
t('one demo profile auto-seeded', () => (window.DOPPEL.Store ? window.DOPPEL.Store.db.profiles.length : -1) >= 1);

// open generator
click($('[data-action="gen-open"]'));
t('generator modal opens', () => !!$('.modal') && $$('#gen-device button').length === 3);

// set country to DE and count 2
const countrySel = $('#gen-country');
countrySel.value = 'DE';
countrySel.dispatchEvent(new window.Event('change', { bubbles: true }));
const cnt = $('#gen-count');
cnt.value = '2';
cnt.dispatchEvent(new window.Event('change', { bubbles: true }));
t('generator country select works', () => !!$('.modal'));

await window.DOPPEL.UI.actions['gen-run']();
await new Promise((r) => setTimeout(r, 100));
const profs = window.DOPPEL.Store.db.profiles;
t('generation added 2 German profiles', () => profs.filter((p) => p.geo.country === 'DE').length >= 2);
t('new profiles are contradiction-free', () => profs.slice(0, 2).every((p) => p.consistency.errors.length === 0));
t('new profiles all German-coherent', () => profs.slice(0, 2).every((p) => p.geo.country === 'DE' && window.DOPPEL.TZ_BY_ID[p.geo.tz].country === 'DE'));

// open first profile editor
const first = window.DOPPEL.Store.db.profiles[0];
window.DOPPEL.UI.go('editor', first.id);
t('editor renders with rail', () => !!$('.ed-head') && !!$('.ed-rail'));

// switch tabs
for (const tab of ['network', 'hardware', 'browser', 'display', 'locale', 'privacy', 'behavior', 'json']) {
  const btn = $(`.ed-tab[data-tab="${tab}"]`);
  click(btn);
  t(`tab ${tab} renders`, () => !!$('.ed-main') && $('.ed-main').innerHTML.length > 200);
}
// back to overview; change country via select
click($('.ed-tab[data-tab="network"]'));
const cSel = $('[data-path="geo.country"]');
cSel.value = 'JP';
cSel.dispatchEvent(new window.Event('change', { bubbles: true }));
await new Promise((r) => setTimeout(r, 50));
const draft = window.DOPPEL.UI.S.draft;
t('changing country cascades timezone', () => draft.geo.country === 'JP' && window.DOPPEL.TZ_BY_ID[draft.geo.tz].country === 'JP');
t('cascading does not introduce errors', () => draft.consistency.errors.length === 0);

// autofix action
click($('.ed-tab[data-tab="overview"]'));
// save
await window.DOPPEL.UI.actions.save();
t('save persists draft', () => window.DOPPEL.Store.db.profiles.find((p) => p.id === draft.id).geo.country === 'JP');

// run simulation modal
window.DOPPEL.UI.actions.run({ dataset: { id: draft.id } });
await new Promise((r) => setTimeout(r, 3200));
t('run modal produced console steps', () => !!$('.run-console') && $$('.run-line').length >= 4);
t('run verdict rendered', () => !!$('.verdict'));

// export modal
window.DOPPEL.UI.actions.export({ dataset: { id: draft.id } });
t('export modal opens with userscript', () => !!$('#export-code') && $('#export-code').textContent.includes('==UserScript=='));
click($('[data-action="export-kind"][data-kind="puppeteer"]'));
t('puppeteer export renders', () => $('#export-code').textContent.includes('Emulation.setTimezoneOverride'));
click($('[data-action="export-kind"][data-kind="verify"]'));
t('verify page export renders', () => $('#export-code').textContent.includes('<!doctype html>'));
window.DOPPEL.UI.S.modal = null;

// playground
window.DOPPEL.UI.go('playground');
t('playground compare tab renders', () => !!$('.compare-head'));
click($('[data-action="pg-tab"][data-tab="batch"]'));
click($('[data-action="pg-run-batch"]'));
t('batch test runs 200 profiles', () => window.DOPPEL.Playground.P.batch && window.DOPPEL.Playground.P.batch.n === 200 && window.DOPPEL.Playground.P.batch.criticalFree === 200);
click($('[data-action="pg-tab"][data-tab="leaks"]'));
t('leaks tab renders', () => !!$('.linklist'));

// guide + settings
window.DOPPEL.UI.go('guide');
t('guide matrix renders 35 rows', () => $$('.matrix tbody tr').length >= 30);
window.DOPPEL.UI.go('settings');
t('settings renders', () => !!$('#import-file') && !!$('.btnstack'));

// live scan
window.DOPPEL.UI.go('live');
t('live view renders', () => !!$('.live-bar'));
await window.DOPPEL.Live.scanNow();
t('live scan collects real values', () => window.DOPPEL.Live.LV.scan && window.DOPPEL.Live.LV.scan.ua && window.DOPPEL.Live.LV.scan.tz);
t('live compare table renders', () => $$('.live-tbl tbody tr').length > 15);

const failed = results.filter((r) => !r[0]);
for (const [ok, name, why] of results) console.log(ok ? '  ✔' : '  ✘', name, ok ? '' : '— ' + why);
console.log(`\n${results.length - failed.length} passed, ${failed.length} failed`);
if (errors.length) { console.log('\nbrowser errors captured:'); errors.slice(0, 10).forEach((e) => console.log('  ', e)); }
process.exit(failed.length ? 1 : 0);
