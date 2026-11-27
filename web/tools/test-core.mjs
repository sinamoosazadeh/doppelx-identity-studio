#!/usr/bin/env node
/* Core engine tests: run the src modules in a VM context with a minimal
   window shim (no DOM needed for core/catalog/generate/agent). */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = (f) => readFileSync(join(root, 'src', f), 'utf8');

const sandbox = {
  window: {},
  globalThis: {},
  console,
  performance,
  crypto: globalThis.crypto,
  TextEncoder,
  TextDecoder,
  navigator: { userAgent: 'node' },
  setTimeout, clearTimeout,
  location: { hash: '' },
  localStorage: {
    _d: {},
    getItem(k) { return this._d[k] ?? null; },
    setItem(k, v) { this._d[k] = String(v); },
    removeItem(k) { delete this._d[k]; },
  },
  document: {
    createElement: () => ({ style: {}, getContext: () => null, toDataURL: () => '', appendChild() {} }),
    getElementById: () => null,
    querySelector: () => null,
    addEventListener() {},
    body: { appendChild() {} },
  },
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;

const ctx = vm.createContext(sandbox);
const code = ['01-core.js', '02-catalog.js', '03-generate.js', '04-agent.js']
  .map((f) => `\n// ${f}\n${src(f)}\n`).join('\n');

vm.runInContext(code, ctx, { filename: 'core-bundle.js' });

const { FP, AGENT, GEO, GEO_META, GEO_NAMES, TZ_DB, TZ_BY_ID, LOCALES, LOCALE_META, U, makeRng, DOPPEL_VERSION } = vm.runInContext(
  '({FP, AGENT, GEO, GEO_META, GEO_NAMES, TZ_DB, TZ_BY_ID, LOCALES, LOCALE_META, U, makeRng, DOPPEL_VERSION})', ctx);

let pass = 0, fail = 0;
const t = (name, fn) => {
  try { const r = fn(); if (r === false) throw new Error('assertion returned false'); pass++; console.log('  ✔', name); }
  catch (e) { fail++; console.log('  ✘', name, '—', e.message); }
};

console.log(`\nDOPPEL core test suite  v${DOPPEL_VERSION}\n`);

console.log('[catalog integrity]');
t('every GEO place timezone resolves', () => {
  const badd = [];
  for (const cc of Object.keys(GEO)) for (const g of GEO[cc]) if (!TZ_BY_ID[g[3]]) badd.push(`${cc}:${g[0]}:${g[3]}`);
  if (badd.length) throw new Error(badd.join(', '));
  return true;
});
t('every GEO country has meta + locales', () => {
  const badd = GEO_NAMES.filter((c) => !GEO_META[c] || !LOCALES[c]);
  if (badd.length) throw new Error(badd.join(','));
  return true;
});
t('every locale in LOCALES has meta', () => {
  const badd = [...new Set(Object.values(LOCALES).flat())].filter((l) => !LOCALE_META[l]);
  if (badd.length) throw new Error(badd.join(','));
  return true;
});
t('every country has at least one TZ', () => {
  const badd = GEO_NAMES.filter((c) => !GEO[c].some((g) => TZ_BY_ID[g[3]]));
  if (badd.length) throw new Error(badd.join(','));
  return true;
});

console.log('\n[generation]');
const N = 300;
const profiles = [];
for (let i = 0; i < N; i++) profiles.push(FP.generate({}));
t(`${N} profiles generated`, () => profiles.length === N);
t('all profiles carry consistency report', () => profiles.every((p) => p.consistency && typeof p.consistency.score === 'number'));
const withErr = profiles.filter((p) => p.consistency.errors.length);
t('no critical contradictions in random mode', () => {
  if (withErr.length) throw new Error(withErr.slice(0, 3).map((p) => p.consistency.errors.map((e) => e.id + ':' + e.detail).join(' | ')).join('\n'));
  return true;
});
t('scores are A/B', () => profiles.every((p) => ['A', 'B'].includes(p.consistency.grade)) || (() => { throw new Error(profiles.map(p=>p.consistency.grade).join(',')); })());

t('random mode covers mobile and desktop', () => {
  const mob = profiles.filter((p) => ['android', 'ios'].includes(p.os.platform)).length;
  const desk = profiles.length - mob;
  if (mob < N * 0.2 || desk < N * 0.2) throw new Error(`mobile ${mob} desktop ${desk}`);
  return true;
});

t('tz always matches IP country', () => profiles.every((p) => TZ_BY_ID[p.geo.tz].country === p.geo.country));
t('city always matches tz', () => profiles.every((p) => {
  const place = (GEO[p.geo.country] || []).find((g) => g[0] === p.geo.city);
  return !place || place[3] === p.geo.tz;
}));
t('UA consistent with browser major', () => profiles.every((p) => {
  const ua = p.navigator.userAgent;
  if (p.browser.family === 'safari') return /Version\/\d+/.test(ua);
  if (p.browser.family === 'firefox') return ua.includes(`Firefox/${p.browser.major}`);
  return ua.includes(`Chrome/${p.browser.major}`);
}));
t('mobile UA has Mobile + Android and touch=5', () => profiles.filter((p) => p.os.platform === 'android').every((p) => /Android/.test(p.navigator.userAgent) && /Mobile/.test(p.navigator.userAgent) && p.navigator.maxTouchPoints === 5));
t('desktop profiles report maxTouchPoints=0', () => profiles.filter((p) => !['android', 'ios'].includes(p.os.platform)).every((p) => p.navigator.maxTouchPoints === 0));
t('Safari only on macOS/iOS', () => profiles.every((p) => p.browser.family !== 'safari' || ['macos', 'ios'].includes(p.os.platform)));
t('Client Hints only for Chromium', () => profiles.every((p) => (['chrome', 'edge'].includes(p.browser.family)) === !!p.clientHints));
t('Client Hints platform matches OS', () => profiles.filter((p) => p.clientHints).every((p) => ({
  windows: 'Windows', macos: 'macOS', linux: 'Linux', android: 'Android', ios: 'iOS',
}[p.os.platform]) === p.clientHints.platform));
t('GPU class matches device class', () => profiles.every((p) => {
  const r = p.hardware.gpu.renderer;
  const mobile = ['android', 'ios'].includes(p.os.platform);
  return mobile ? /Adreno|Mali|Apple/.test(r) : !/Adreno|Mali/.test(r);
}));
t('screen.dpr preserved across display', () => profiles.every((p) => Number(p.screen.dpr) === Number(p.display.dpr)));
t('innerHeight < screen height', () => profiles.every((p) => p.display.innerHeight <= p.display.height));
t('deviceMemory ≤ 8 and power of two', () => profiles.every((p) => p.navigator.deviceMemory <= 8 && (p.navigator.deviceMemory & (p.navigator.deviceMemory - 1)) === 0));
t('hardwareConcurrency matches CPU', () => profiles.every((p) => p.navigator.hardwareConcurrency === p.os.cores));
t('fonts match OS family', () => profiles.every((p) => {
  const f = p.fingerprint.fonts;
  if (p.os.platform === 'android') return f.includes('Roboto');
  if (p.os.platform === 'ios') return f.includes('Helvetica Neue');
  if (p.os.platform === 'windows') return f.includes('Calibri');
  return f.length > 5;
}));
t('WebRTC disabled whenever a proxy is present', () => profiles.filter((p) => p.network.mode === 'proxy' && p.network.proxy).every((p) => p.network.webrtc === 'disabled'));
t('LAN IP always private', () => profiles.every((p) => /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|127\.)/.test(p.network.localIp)));
t('currency matches locale meta', () => profiles.every((p) => LOCALE_META[p.locale.locale][2] === p.locale.currency));
t('languages[] starts with locale', () => profiles.every((p) => p.navigator.languages[0] === p.locale.locale));
t('plugins match browser family', () => profiles.every((p) => {
  if (p.browser.family === 'firefox') return p.fingerprint.plugins.length === 0;
  if (p.browser.family === 'safari') return p.fingerprint.plugins.length === 1;
  return p.fingerprint.plugins.length === 5;
}));
t('extensions never on mobile / firefox', () => profiles.filter((p) => ['android', 'ios'].includes(p.os.platform) || p.browser.family === 'firefox').every((p) => p.extensions.length === 0));
t('canvas/audio seeds unique per profile (mostly)', () => {
  const keys = new Set(profiles.map((p) => `${p.fingerprint.canvasNoiseSeed}|${p.fingerprint.audioSeed}`));
  if (keys.size < N * 0.99) throw new Error(`unique ${keys.size}/${N}`);
  return true;
});
t('navigator.appVersion == UA minus Mozilla/', () => profiles.every((p) => p.navigator.appVersion === p.navigator.userAgent.replace('Mozilla/', '')));

console.log('\n[coherence: proxy ↔ geo]');
t('proxy country == profile country', () => profiles.filter((p) => p.network.proxy).every((p) => p.network.proxy.country === p.geo.country));
t('proxy city == profile city (when proxy present)', () => profiles.filter((p) => p.network.proxy).every((p) => p.geo.city.toLowerCase().startsWith(p.network.proxy.city.split(',')[0].toLowerCase())));

console.log('\n[determinism]');
t('same seed → identical fingerprint surface', () => {
  const a = FP.generate({ seed: 'fixed-seed-1' });
  const b = FP.generate({ seed: 'fixed-seed-1' });
  const strip = (p) => { const q = JSON.parse(JSON.stringify(p)); delete q.id; delete q.createdAt; delete q.updatedAt; delete q.consistency.at; return JSON.stringify(q); };
  return strip(a) === strip(b);
});
t('different seeds → different identities', () => {
  const a = FP.generate({ seed: 'aaa' });
  const b = FP.generate({ seed: 'bbb' });
  return a.navigator.userAgent !== b.navigator.userAgent || a.geo.city !== b.geo.city || a.fingerprint.canvasNoiseSeed !== b.fingerprint.canvasNoiseSeed;
});

console.log('\n[repair / cascade]');
t('changing country repairs tz + currency + proxy', () => {
  const p = FP.generate({ country: 'US' });
  p.geo.country = 'DE';
  const fixed = FP.repair(p);
  return TZ_BY_ID[fixed.geo.tz].country === 'DE' && fixed.geo.currency === 'EUR' && (!fixed.network.proxy || fixed.network.proxy.country === 'DE');
});
t('changing os to android repairs UA, GPU, touch, fonts, CH', () => {
  const p = FP.generate({ country: 'US', browser: 'chrome' });
  p.os.platform = 'android';
  const fixed = FP.repair(p);
  return /Android/.test(fixed.navigator.userAgent) && /Adreno|Mali/.test(fixed.hardware.gpu.renderer) && fixed.navigator.maxTouchPoints === 5 && fixed.clientHints.model === fixed.os.device.model;
});
t('safari on windows auto-repairs', () => {
  const p = FP.generate({ country: 'US', browser: 'safari' });
  p.os.platform = 'windows';
  p.os.platformString = 'Win32';
  const fixed = FP.repair(p);
  return fixed.browser.family !== 'safari';
});
t('repair produces valid profile', () => {
  const p = FP.generate({ country: 'TR' });
  p.browser.major = 40; // ancient
  p.navigator.userAgent = 'Mozilla/5.0 (Windows NT 6.1)';
  const fixed = FP.repair(p);
  return fixed.consistency.errors.length === 0;
});

console.log('\n[validator catches planted contradictions]');
const mk = (mut) => { const p = FP.generate({ country: 'DE', deviceType: 'desktop', browser: 'chrome' }); mut(p); return FP.validate(p); };
t('detects tz/country mismatch', () => mk((p) => { p.geo.tz = 'America/New_York'; }).errors.some((e) => e.id === 'tz_country'));
t('detects language/country mismatch', () => mk((p) => { p.locale.locale = 'ja-JP'; p.locale.languages = ['ja-JP']; p.navigator.languages = ['ja-JP']; }).warnings.some((w) => w.id === 'lang_country'));
t('detects UA version mismatch', () => mk((p) => { p.browser.major = p.browser.major + 9; }).errors.some((e) => e.id === 'ua_version'));
t('detects Safari on Windows', () => mk((p) => { p.browser.family = 'safari'; p.browser.name = 'Safari'; }).errors.some((e) => e.id === 'safari_os' || e.id === 'ua_version'));
t('detects desktop GPU on Android', () => mk((p) => { p.os.platform = 'android'; p.hardware.gpu.renderer = 'ANGLE (NVIDIA, NVIDIA GeForce GTX 650 Ti)'; p.hardware.gpu.device = 'GTX 650'; }).errors.some((e) => ['gpu_android', 'ua_android', 'nav_platform', 'ch_platform'].includes(e.id)));
t('detects CH missing for chromium', () => mk((p) => { p.clientHints = null; }).checks.some((e) => e.id === 'ch_missing' && !e.ok));
t('detects touch on desktop', () => mk((p) => { p.navigator.maxTouchPoints = 5; }).warnings.some((w) => w.id === 'touch_desktop'));
t('detects public localIp as WebRTC leak', () => mk((p) => { p.network.webrtc = 'public'; p.network.localIp = '8.8.8.8'; }).errors.some((e) => e.id === 'webrtc_leak'));

console.log('\n[agent]');
const p0 = profiles[0];
t('payload includes all signal groups', () => {
  const pl = AGENT.payload(p0);
  return ['ua', 'uaData', 'platform', 'languages', 'screen', 'timezone', 'geolocation', 'webgl', 'canvas', 'audio', 'fonts', 'plugins', 'behavior', 'network'].every((k) => k in pl);
});
t('headers include UA + accept-language', () => {
  const h = AGENT.headers(p0);
  return h['User-Agent'] === p0.navigator.userAgent && !!h['Accept-Language'];
});
t('fingerprint hash is stable per profile and unique across', () => {
  const h1 = AGENT.fingerprintHash(p0);
  const h2 = AGENT.fingerprintHash(profiles[1]);
  const h1b = AGENT.fingerprintHash(JSON.parse(JSON.stringify(p0)));
  return h1 === h1b && h1 !== h2;
});
t('analyze returns checks + verdict', () => {
  const r = AGENT.analyze(p0);
  return r.checks.length > 10 && ['pass', 'warn', 'fail'].includes(r.verdict);
});
t('userscript is syntactically valid JS', () => {
  const code = AGENT.userscript(p0);
  new vm.Script(code.replace(/^\/\/ ==UserScript==[\s\S]*?\/\/ ==\/UserScript==/, ''));
  return code.includes('userAgentData') && code.includes('WEBGL_debug_renderer_info');
});
t('puppeteer exporter references CDP overrides', () => {
  const code = AGENT.puppeteer(p0);
  return code.includes('Emulation.setTimezoneOverride') && code.includes('evaluateOnNewDocument');
});
t('verify page is valid html with the wanted values', () => {
  const html = AGENT.verifyPage(p0);
  return html.startsWith('<!doctype html>') && html.includes('screen.width');
});
t('proxy extension mentions socks5 target', () => {
  const code = AGENT.proxyAuthExtension(p0);
  return /scheme: "socks5"/.test(code);
});

console.log('\n[timezone engine]');
t('DST US summer vs winter', () => {
  const z = TZ_BY_ID['America/New_York'];
  const summer = require_ctx('tzOffset')(z, new Date('2026-07-15T12:00:00Z'));
  const winter = require_ctx('tzOffset')(z, new Date('2026-01-15T12:00:00Z'));
  return summer === -240 && winter === -300;
});
t('DST EU summer vs winter', () => {
  const z = TZ_BY_ID['Europe/Berlin'];
  const summer = require_ctx('tzOffset')(z, new Date('2026-07-15T12:00:00Z'));
  const winter = require_ctx('tzOffset')(z, new Date('2026-01-15T12:00:00Z'));
  return summer === 120 && winter === 60;
});
t('DST southern hemisphere inverted', () => {
  const z = TZ_BY_ID['Australia/Sydney'];
  const jan = require_ctx('tzOffset')(z, new Date('2026-01-15T12:00:00Z'));
  const jul = require_ctx('tzOffset')(z, new Date('2026-07-15T12:00:00Z'));
  return jan === 660 && jul === 600;
});
t('no-DST zones constant', () => {
  const z = TZ_BY_ID['Asia/Tokyo'];
  return require_ctx('tzOffset')(z, new Date('2026-01-15T12:00:00Z')) === 540 && require_ctx('tzOffset')(z, new Date('2026-07-15T12:00:00Z')) === 540;
});

function require_ctx(name) { return ctx[name]; }
sandbox.tzOffset = vm.runInContext('tzOffset', ctx);

console.log('\n[version train]');
t('chrome major plausible for today', () => {
  const p = FP.generate({ browser: 'chrome', os: 'windows' });
  const now = 2026;
  return p.browser.major >= 130 && p.browser.major <= 160;
});

console.log(`\n${pass} passed, ${fail} failed\n`);
const sample = profiles[0];
console.log('sample profile:', sample.name, '|', sample.geo.city, '|', sample.os.platform, '|', sample.browser.name, sample.browser.major, '| score', sample.consistency.score, '|', sample.navigator.userAgent.slice(0, 80));
process.exit(fail ? 1 : 0);
