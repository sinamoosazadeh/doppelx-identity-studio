/* ==========================================================================
   DOPPEL X — test-suite.mjs
   Headless end-to-end suite: boots the real app in Chromium, exercises every
   screen, runs the on-device self-test, the runtime sandbox, fuzzer, bench,
   exports and the ZIP writer. Exit code 1 on any failure.
   Usage:  node tools/test-suite.mjs
   ========================================================================== */
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import { createRequire } from 'module';

/* resolve Playwright from the project or NODE_PATH */
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
function loadPlaywright() {
  const candidates = [
    'playwright',
    path.resolve(process.cwd(), 'node_modules/playwright'),
    path.resolve(here, '../../node_modules/playwright'),
  ];
  for (const c of candidates) { try { return require(c); } catch (e) {} }
  throw new Error('Playwright not found. Run:  npm i playwright && npx playwright install chromium');
}
const { chromium } = loadPlaywright();

const arg = process.argv[2];
const INDEX = arg && arg.includes('preview')
  ? 'file://' + path.resolve(here, '../dist/doppelx-preview.html')
  : 'file://' + path.resolve(here, '../app/assets/index.html');
const results = [];
const errors = [];

function ok(name, cond, detail) {
  results.push({ name, ok: !!cond, detail: detail || '' });
  if (!cond) errors.push(name + (detail ? ' — ' + detail : ''));
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 412, height: 900 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => {
  const t = m.text();
  if (m.type() === 'error' && !/vibrate|Blocked call/.test(t)) errors.push('console: ' + t);
});

/* ---------------------------------------------------------------- boot */
await page.goto(INDEX, { waitUntil: 'load' });
await page.waitForTimeout(400);
const boot = await page.evaluate(() => ({
  engine: typeof DX !== 'undefined' && DX.VERSION,
  profiles: typeof Store !== 'undefined' ? Store.profiles.length : -1,
  tabs: document.querySelectorAll('.tabbtn').length,
  home: !!document.querySelector('.hero'),
}));
ok('boot: engine loaded', boot.engine === '3.2.1', JSON.stringify(boot));
ok('boot: seeded profile present', boot.profiles >= 1);
ok('boot: 5 bottom tabs', boot.tabs === 5);
ok('boot: home rendered', boot.home);

/* ------------------------------------------------------ engine in-page */
const engineFacts = await page.evaluate(() => {
  const p = DX.generateClean({});
  const check = p.consistency.checks.length;
  let errs = 0;
  for (let i = 0; i < 300; i++) errs += DX.generate({}).consistency.errors.length;
  const a = DX.generate({ seed: 'x1' }), b = DX.generate({ seed: 'x1' });
  const rev = DX.anchorFromIp({
    ip: '198.51.100.42', countryCode: 'US', city: 'Ashburn', region: 'VA',
    lat: 39.0438, lon: -77.4874, timezone: 'America/New_York', isp: 'Verizon', asn: 701,
    type: 'residential', fraudScore: 2, isHosting: false, dnsLeak: false, verdict: 'PASS',
    proxyConfig: { protocol: 'socks5', host: 'us.res.example', port: 1080, username: 'u', password: 'p', viaRelay: true, localRelayPort: 18080 },
  });
  return {
    checkCount: check,
    errs,
    deterministic: JSON.stringify([a.geo, a.os, a.navigator.userAgent]) === JSON.stringify([b.geo, b.os, b.navigator.userAgent]),
    count: document.querySelectorAll('#main .hero').length,
    revClean: rev.consistency.errors.length === 0 && rev.geo.tz === 'America/New_York' && rev.os.device.model === '23122PCD1G',
  };
});
ok('engine: ≥ 65 checks per profile', engineFacts.checkCount >= 65, 'checks=' + engineFacts.checkCount);
ok('engine: 300 random profiles → 0 errors', engineFacts.errs === 0, 'errors=' + engineFacts.errs);
ok('engine: deterministic by seed', engineFacts.deterministic);
ok('engine: Reverse-Anchor IP → POCO X6 5G clean', engineFacts.revClean);

/* ---------------------------------------------------------- navigation */
for (const nav of ['profiles', 'lab', 'api', 'vault', 'home']) {
  await page.click(`.tabbtn[data-nav="${nav}"]`);
  await page.waitForTimeout(120);
}
ok('nav: all tabs render without crash', true);

/* --------------------------------------------------------- self-test UI */
await page.click('.tabbtn[data-nav="lab"]');
await page.waitForTimeout(200);
await page.click('#lab-test');
await page.waitForFunction(() => /^\d+\/\d+/.test(document.querySelector('#lab-out .pill')?.textContent || ''), undefined, { timeout: 8000 });
const selfTest = await page.evaluate(() => document.querySelector('#lab-out .pill')?.textContent || '');
const stMatch = /(\d+)\/(\d+)/.exec(selfTest);
ok('lab: on-device self-test all pass', stMatch && stMatch[1] === stMatch[2], selfTest);

/* -------------------------------------------------------- runtime sandbox */
await page.selectOption('#sb-p', { index: 0 });
await page.click('#lab-sandbox');
await page.waitForTimeout(2200);
const sandbox = await page.evaluate(() => {
  const rows = [...document.querySelectorAll('#sb-out table tr')].map((r) => [...r.querySelectorAll('td')].map((c) => c.textContent.trim())).filter((r) => r.length === 3);
  return { rows, pill: document.querySelector('#sb-out .pill')?.textContent || '' };
});
const sbBad = sandbox.rows.filter(([k, got, exp]) => {
  if (k === 'dpr') return Math.abs(+got - +exp) >= 0.01;
  if (k === 'languages') return got.split(',')[0] !== exp.split(',')[0];
  return got !== exp;
});
ok('sandbox: 17 surfaces read back', sandbox.rows.length === 17, 'rows=' + sandbox.rows.length);
ok('sandbox: all surfaces match the profile', sbBad.length === 0, JSON.stringify(sbBad));

/* --------------------------------------------------------------- fuzzer */
await page.click('#lab-fuzz');
await page.waitForTimeout(1600);
const fuzz = await page.evaluate(() => document.querySelector('#fuzz-out')?.innerText || '');
ok('fuzzer: 200/200 restored to clean audit', /200 \/ 200/.test(fuzz.replace(/\s+/g, ' ')), fuzz.replace(/\s+/g, ' ').slice(0, 120));

/* ---------------------------------------------------------------- bench */
await page.click('#lab-bench');
await page.waitForTimeout(1100);
const bench = await page.evaluate(() => document.querySelector('#lab-out')?.innerText || '');
ok('bench: 1000 profiles generated', /1000 profiles/.test(bench));

/* ------------------------------------------------------- create wizard */
await page.click('.tabbtn[data-nav="home"]');
await page.waitForTimeout(150);
await page.click('[data-act="create"]');
await page.waitForTimeout(200);
await page.selectOption('#c-cc', 'BR');
await page.waitForTimeout(200);
await page.click('[data-p="windows"]');
await page.waitForTimeout(250);
await page.click('#c-next');
await page.waitForTimeout(200);
await page.click('#c-next');
await page.waitForTimeout(400);
const created = await page.evaluate(() => {
  const ring = document.querySelector('#c-body .ring .val')?.textContent || '';
  return { ring };
});
await page.click('#c-save');
await page.waitForTimeout(400);
const lastProfile = await page.evaluate(() => Store.profiles[0]);
ok('wizard: preview audit is clean', /^100/.test(created.ring), created.ring);
ok('wizard: created profile keeps anchors', lastProfile.geo.country === 'BR' && lastProfile.os.platform === 'windows', lastProfile.geo.country + '/' + lastProfile.os.platform);

/* ------------------------------------------------------------- viewer */
await page.click('.tabbtn[data-nav="profiles"]');
await page.waitForTimeout(250);
await page.click('#pv-list .pcard');
await page.waitForTimeout(300);
for (const t of ['identity', 'network', 'behavior', 'audit', 'export', 'overview']) {
  await page.click(`#vw-tabs .tab[data-t="${t}"]`);
  await page.waitForTimeout(130);
}
ok('viewer: six tabs render', true);

/* ------------------------------------------------------------- exports */
const exportsInfo = await page.evaluate(() => {
  const p = Store.profiles[0];
  const out = {};
  EX.EXPORTS.forEach((e) => { const s = e.build(p); out[e.id] = s.length; });
  return out;
});
ok('exports: all 14 formats ≥ 400 bytes', Object.keys(exportsInfo).length === 14 && Object.values(exportsInfo).every((n) => n >= 400), JSON.stringify(exportsInfo));

const zipInfo = await page.evaluate(() => {
  const p = Store.profiles[0];
  const manifest = EX.extensionManifest(p);
  const bg = EX.extensionBackground(p);
  const z = Zip.build({
    'manifest.json': manifest, 'background.js': bg,
    'config.js': EX.extensionConfig(p), 'popup.html': EX.extensionPopupHtml(p),
    'popup.js': EX.extensionPopupJs(p), 'spoof.js': window.__SPOOF_SRC__ || '', 'README.txt': 'DOPPEL X v3.2.1',
  });
  return { size: z.size, entries: z.entries, b64: z.base64.length, isMain: manifest.includes('"MAIN"'), ver: JSON.parse(manifest).version };
});
ok('zip: extension bundle has 7 entries (world: MAIN, v3.2.1)', zipInfo.entries === 7 && zipInfo.isMain && zipInfo.ver === '3.2.1' && zipInfo.size > 40000 && zipInfo.b64 > 50000, JSON.stringify(zipInfo));

/* ---------------------------------------------------------- light theme */
await page.click('.tabbtn[data-nav="vault"]');
await page.waitForTimeout(200);
await page.click('#s-theme button[data-v="light"]');
await page.waitForTimeout(300);
const light = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() || document.body.classList.contains('light'));
ok('theme: light mode applies', await page.evaluate(() => document.body.classList.contains('light')));
await page.click('#s-theme button[data-v="dark"]');
await page.waitForTimeout(200);

/* ------------------------------------------------------- persistence */
const persist = await page.evaluate(() => {
  const n = Store.profiles.length;
  Store.setSettings({ theme: 'dark' });
  return { n, stored: !!localStorage.getItem('dx.profiles.v4') };
});
ok('store: writes to localStorage', persist.stored);

/* ------------------------------------------------------------- report */
await page.screenshot({ path: path.resolve(here, '../shots/99-final.png') });
await browser.close();

const pass = results.filter((r) => r.ok).length;
console.log('\nDOPPEL X — headless suite');
results.forEach((r) => console.log(`${r.ok ? '  ✓' : '  ✗'} ${r.name}${r.detail && !r.ok ? '  [' + r.detail + ']' : ''}`));
console.log(`\n${pass}/${results.length} passed`);
if (errors.length) { console.log('\nERRORS:\n' + errors.join('\n')); }
process.exit(pass === results.length && errors.length === 0 ? 0 : 1);
