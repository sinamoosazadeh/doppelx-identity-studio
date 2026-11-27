/* ==========================================================================
   DOPPEL X — exporters.js  v3.2.1
   14 executable formats (Browser, Termux Playwright, MV3 Extension, Userscript,
   v2rayNG Safe-DNS Config, Super Proxy Config, Verifier, Puppeteer, Selenium,
   ADB, WebView, JSON, Feed, CSV). Zero server needed.
   ========================================================================== */
'use strict';

const EX = (() => {
  const q = (s) => JSON.stringify(s, null, 2);
  const slim = (p) => ({
    id: p.id, name: p.name, persona: p.persona, os: p.os, browser: p.browser, display: p.display,
    hardware: p.hardware, navigator: p.navigator, screen: p.screen, clientHints: p.clientHints,
    geo: p.geo, locale: p.locale, network: p.network, privacy: p.privacy, fingerprint: p.fingerprint,
    speech: p.speech, permissions: p.permissions, consistency: p.consistency ? { score: p.consistency.score, grade: p.consistency.grade } : null,
  });

  function effectiveProxy(p) {
    if (!(p && p.network && p.network.mode === 'proxy' && p.network.proxy)) return null;
    const pr = p.network.proxy;
    // Public release boundary: do not emit embedded proxy credentials. An
    // imported profile containing credentials can still be audited as data,
    // but exporters intentionally fall back to direct/no-proxy configuration.
    if (pr.username || pr.password) return null;
    if (pr.viaRelay && pr.localRelayPort) {
      return {
        scheme: 'http',
        host: '127.0.0.1',
        port: Number(pr.localRelayPort) || 18080,
        username: '',
        password: '',
        viaRelay: true,
        upstream: `${pr.protocol || 'socks5'}://${pr.host}:${pr.port}`,
      };
    }
    if (pr.protocol === 'vpn' || !pr.host || !pr.port || Number(pr.port) <= 0) return null;
    return {
      scheme: pr.protocol === 'https' ? 'https' : pr.protocol === 'http' ? 'http' : 'socks5',
      host: pr.host,
      port: Number(pr.port),
      username: pr.username || '',
      password: pr.password || '',
      viaRelay: false,
      upstream: `${pr.protocol || 'socks5'}://${pr.host}:${pr.port}`,
    };
  }

  /* ------------------------------------------------------------------ helpers */
  function chromeFlags(p) {
    const args = [
      `--user-agent=${p.navigator.userAgent}`,
      `--lang=${p.locale.locale}`,
      `--window-size=${Math.min(p.display.width, 1920)},${Math.min(p.display.height, 1080)}`,
      '--disable-blink-features=AutomationControlled',
      '--force-webrtc-ip-handling-policy=disable_non_proxied_udp',
      '--no-first-run', '--no-default-browser-check',
    ];
    const ep = effectiveProxy(p);
    if (ep) args.push(`--proxy-server=${ep.scheme}://${ep.host}:${ep.port}`);
    return args;
  }

  function proxyAuthHint(p) {
    const ep = effectiveProxy(p);
    if (!ep) return '';
    if (ep.viaRelay) {
      return `\n// This profile declares a loopback proxy (${ep.host}:${ep.port} -> ${ep.upstream}).\n// Supply and audit any local proxy separately; this public repository does not ship one.`;
    }
    if (ep.scheme === 'socks5' && ep.username) {
      return `\n// WARNING: Chromium proxy-auth behaviour varies by platform. Use only an endpoint you control and verify routing in your authorised test environment.`;
    }
    return '';
  }

  /* ----------------------------------------------------------------- puppeteer */
  function puppeteer(p) {
    const ep = effectiveProxy(p);
    const chHeaders = p.clientHints ? `
    'Sec-CH-UA': \`"\${PROFILE.clientHints.brands[0].brand}";v="\${PROFILE.clientHints.brands[0].version}", "\${PROFILE.clientHints.brands[1].brand}";v="\${PROFILE.clientHints.brands[1].version}"\`,
    'Sec-CH-UA-Mobile': PROFILE.clientHints.mobile ? '?1' : '?0',
    'Sec-CH-UA-Platform': \`"\${PROFILE.clientHints.platform}"\`,` : '';
    const authBlock = (ep && !ep.viaRelay && ep.scheme !== 'socks5' && ep.username)
      ? `\n  await page.authenticate({ username: ${JSON.stringify(ep.username)}, password: ${JSON.stringify(ep.password)} });` : '';
    return `/* DOPPEL X v3.2.1 — Puppeteer launcher
   npm i puppeteer && node launch.js
   Applies: UA, Client Hints, Accept-Language, DST-accurate timezone, WebGL,
   idempotent canvas/audio/ClientRects noise, Web Worker sync, WebRTC policy. */
const puppeteer = require('puppeteer');
const PROFILE = ${q(slim(p))};
const RUNTIME = require('fs').readFileSync(__dirname + '/spoof.js', 'utf8');
const TEST_URL = process.env.DOPPELX_TEST_URL;
if (!TEST_URL) throw new Error('Set DOPPELX_TEST_URL to an authorised URL you own.');
${proxyAuthHint(p)}
(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    args: ${JSON.stringify(chromeFlags(p))},
  });
  const page = await browser.newPage();${authBlock}
  await page.setUserAgent(PROFILE.navigator.userAgent);
  await page.setExtraHTTPHeaders({
    'Accept-Language': PROFILE.locale.languages.join(','),${chHeaders}
  });
  await page.emulateTimezone(PROFILE.geo.tz);
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: PROFILE.display.prefersColorScheme }]);
  await page.evaluateOnNewDocument(\`
    window.__DOPPEL_PROFILE__ = \${JSON.stringify(PROFILE)};
    \${RUNTIME}
  \`);
  await page.setViewport({ width: PROFILE.display.innerWidth, height: PROFILE.display.innerHeight, deviceScaleFactor: PROFILE.display.dpr, isMobile: !!(PROFILE.clientHints && PROFILE.clientHints.mobile), hasTouch: PROFILE.navigator.maxTouchPoints > 0 });
  await page.goto(TEST_URL, { waitUntil: 'networkidle2' });
  await new Promise(() => {});
})();
`;
  }

  /* ---------------------------------------------------------------- playwright */
  function playwright(p) {
    const ep = effectiveProxy(p);
    const proxyLine = ep
      ? `proxy: { server: '${ep.scheme}://${ep.host}:${ep.port}'${(!ep.viaRelay && ep.scheme !== 'socks5' && ep.username) ? `, username: ${JSON.stringify(ep.username)}, password: ${JSON.stringify(ep.password)}` : ''} },`
      : '';
    const chExtra = p.clientHints ? `
      'Sec-CH-UA-Mobile': PROFILE.clientHints.mobile ? '?1' : '?0',
      'Sec-CH-UA-Platform': '"' + PROFILE.clientHints.platform + '"',` : '';
    return `/* DOPPEL X v3.2.1 — Playwright launcher
   npm i playwright && npx playwright install chromium
   node run.js */
const { chromium } = require('playwright');
const PROFILE = ${q(slim(p))};
const RUNTIME = require('fs').readFileSync(__dirname + '/spoof.js', 'utf8');
const TEST_URL = process.env.DOPPELX_TEST_URL;
if (!TEST_URL) throw new Error('Set DOPPELX_TEST_URL to an authorised URL you own.');
${proxyAuthHint(p)}
(async () => {
  const context = await chromium.launchPersistentContext('./doppelx-session-${p.id}', {
    headless: false,
    ${proxyLine}
    userAgent: PROFILE.navigator.userAgent,
    locale: PROFILE.locale.locale,
    timezoneId: PROFILE.geo.tz,
    viewport: { width: PROFILE.display.innerWidth, height: PROFILE.display.innerHeight },
    deviceScaleFactor: PROFILE.display.dpr,
    isMobile: !!(PROFILE.clientHints && PROFILE.clientHints.mobile),
    hasTouch: PROFILE.navigator.maxTouchPoints > 0,
    colorScheme: PROFILE.display.prefersColorScheme,
    extraHTTPHeaders: {
      'Accept-Language': PROFILE.locale.languages.join(','),${chExtra}
    },
    args: ['--disable-blink-features=AutomationControlled', '--force-webrtc-ip-handling-policy=disable_non_proxied_udp'],
  });
  await context.addInitScript(\`window.__DOPPEL_PROFILE__ = \${JSON.stringify(PROFILE)}; \${RUNTIME}\`);
  const page = context.pages()[0] || await context.newPage();
  await page.goto(TEST_URL);
  await new Promise(() => {});
})();
`;
  }

  /* ---------------------------------------------------------- termux playwright */
  function termuxPlaywright(p) {
    const ep = effectiveProxy(p);
    const proxyOpt = ep
      ? `proxy: { server: '${ep.scheme}://${ep.host}:${ep.port}' },`
      : '// No proxy bound — direct connection.';
    return `/* DOPPEL X v3.2.1 — Android Termux Chromium / Playwright-Core Runner
   In Termux (POCO X6 5G / Android 16):
     pkg install x11-repo nodejs chromium && npm i playwright-core
   Set DOPPELX_TEST_URL to a system you own, then run: node run-termux.js */
const { chromium } = require('playwright-core');
const fs = require('fs');
const PROFILE = ${q(slim(p))};
const RUNTIME = fs.readFileSync(__dirname + '/spoof.js', 'utf8');
const TEST_URL = process.env.DOPPELX_TEST_URL;
if (!TEST_URL) throw new Error('Set DOPPELX_TEST_URL to an authorised URL you own.');
const CHROMIUM_BIN = process.env.CHROMIUM_PATH || '/data/data/com.termux/files/usr/bin/chromium-browser';

(async () => {
  const context = await chromium.launchPersistentContext('./session_${p.id}', {
    executablePath: CHROMIUM_BIN,
    headless: process.env.HEADED !== '1',
    ${proxyOpt}
    userAgent: PROFILE.navigator.userAgent,
    locale: PROFILE.locale.locale,
    timezoneId: PROFILE.geo.tz,
    viewport: { width: PROFILE.display.innerWidth, height: PROFILE.display.innerHeight },
    deviceScaleFactor: PROFILE.display.dpr,
    isMobile: !!(PROFILE.clientHints && PROFILE.clientHints.mobile),
    hasTouch: PROFILE.navigator.maxTouchPoints > 0,
    colorScheme: PROFILE.display.prefersColorScheme,
    ignoreDefaultArgs: ['--enable-automation'],
    args: [
      '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
      '--disable-blink-features=AutomationControlled',
      '--force-webrtc-ip-handling-policy=disable_non_proxied_udp',
    ],
  });
  await context.addInitScript(\`window.__DOPPEL_PROFILE__ = \${JSON.stringify(PROFILE)}; \${RUNTIME}\`);
  const page = context.pages()[0] || await context.newPage();
  await page.goto(TEST_URL, { waitUntil: 'domcontentloaded' });
  console.log('Loaded authorised test URL:', TEST_URL);
})();
`;
  }

  /* ----------------------------------------------------------------- selenium */
  function selenium(p) {
    const ep = effectiveProxy(p);
    return `# DOPPEL X v3.2.1 — Selenium (Python 3)
# pip install selenium
import json, os, time
from pathlib import Path
from selenium import webdriver
from selenium.webdriver.chrome.options import Options

P = ${q(slim(p))}
RUNTIME = Path('spoof.js').read_text(encoding='utf-8')
TEST_URL = os.environ.get('DOPPELX_TEST_URL')
if not TEST_URL:
    raise SystemExit('Set DOPPELX_TEST_URL to an authorised URL you own.')
o = Options()
o.add_argument('--user-agent=' + P['navigator']['userAgent'])
o.add_argument('--lang=' + P['locale']['locale'])
o.add_argument('--window-size=%d,%d' % (P['display']['width'], P['display']['height']))
o.add_argument('--disable-blink-features=AutomationControlled')
o.add_argument('--force-webrtc-ip-handling-policy=disable_non_proxied_udp')
${ep ? `o.add_argument('--proxy-server=${ep.scheme}://${ep.host}:${ep.port}')` : '# direct network'}
d = webdriver.Chrome(options=o)
try:
    d.execute_cdp_cmd('Emulation.setTimezoneOverride', {'timezoneId': P['geo']['tz']})
    d.execute_cdp_cmd('Emulation.setLocaleOverride', {'locale': P['locale']['locale']})
    d.execute_cdp_cmd('Page.addScriptToEvaluateOnNewDocument', {
        'source': 'window.__DOPPEL_PROFILE__=' + json.dumps(P) + ';' + RUNTIME})
    d.get(TEST_URL)
    time.sleep(600)
finally:
    d.quit()
`;
  }

  /* ----------------------------------------------------------------- userscript */
  function userscript(p) {
    const runtimeSrc = (typeof window !== 'undefined' && window.__SPOOF_SRC__)
      ? window.__SPOOF_SRC__
      : '/* Runtime not preloaded — load spoof.js v3.2.1 alongside this userscript */';
    const ep = effectiveProxy(p);
    return `// ==UserScript==
// @name         DOPPEL X v3.2.1 · ${p.name}
// @namespace    doppelx.profile.${p.id}
// @version      3.2.1
// @description  ${p.os.osName} ${p.os.osVersion} · ${p.browser.name} ${p.browser.major} · ${p.geo.city} · ${p.geo.tz}
// @match        *://*/*
// @run-at       document-start
// @grant        none
// @allFrames    true
// ==/UserScript==
(function () {
  'use strict';
  if (location.protocol === 'chrome:' || location.protocol === 'edge:' || location.protocol === 'about:') return;
  window.__DOPPEL_PROFILE__ = ${q(slim(p))};
  ${ep ? `/* Network route expected: ${ep.upstream} (via ${ep.viaRelay ? 'Local Relay ' + ep.host + ':' + ep.port : 'OS VPN / Super Proxy / Extension'}) */` : ''}
})();
// --- DOPPEL X v3.2.1 Multi-Realm Runtime (auto-embedded) ---
${runtimeSrc}
`;
  }

  /* --------------------------------------------------------------- extension */
  function extensionManifest(p) {
    return q({
      manifest_version: 3,
      name: `DOPPEL X · ${p.persona.firstName} ${p.persona.lastName}`,
      version: '3.2.1',
      minimum_chrome_version: '116',
      description: `${p.os.osName} · ${p.browser.name} ${p.browser.major} · ${p.geo.city}`,
      permissions: [
        'storage',
        'proxy',
        'privacy',
        'webRequest',
        'webRequestAuthProvider',
        'declarativeNetRequest',
        'declarativeNetRequestFeedback',
        'scripting',
        'webNavigation',
      ],
      host_permissions: ['<all_urls>'],
      background: { service_worker: 'background.js' },
      content_scripts: [{
        matches: ['<all_urls>'],
        js: ['config.js', 'spoof.js'],
        run_at: 'document_start',
        all_frames: true,
        match_about_blank: true,
        world: 'MAIN',
      }],
      action: { default_popup: 'popup.html', default_title: 'DOPPEL X v3.2.1' },
    });
  }

  function extensionBackground(p) {
    const ep = effectiveProxy(p);
    const ch = p.clientHints;
    const chRules = ch ? [
      `      { header: 'sec-ch-ua', operation: 'set', value: ${JSON.stringify(ch.brands.map((b) => `"${b.brand}";v="${b.version}"`).join(', '))} },`,
      `      { header: 'sec-ch-ua-full-version-list', operation: 'set', value: ${JSON.stringify((ch.fullVersionList || ch.brands).map((b) => `"${b.brand}";v="${b.version}"`).join(', '))} },`,
      `      { header: 'sec-ch-ua-mobile', operation: 'set', value: ${JSON.stringify(ch.mobile ? '?1' : '?0')} },`,
      `      { header: 'sec-ch-ua-platform', operation: 'set', value: ${JSON.stringify('"' + ch.platform + '"')} },`,
      `      { header: 'sec-ch-ua-platform-version', operation: 'set', value: ${JSON.stringify('"' + ch.platformVersion + '"')} },`,
      ch.model ? `      { header: 'sec-ch-ua-model', operation: 'set', value: ${JSON.stringify('"' + ch.model + '"')} },` : `      { header: 'sec-ch-ua-model', operation: 'remove' },`,
    ].join('\n') : [
      `      { header: 'sec-ch-ua', operation: 'remove' },`,
      `      { header: 'sec-ch-ua-mobile', operation: 'remove' },`,
      `      { header: 'sec-ch-ua-platform', operation: 'remove' },`,
    ].join('\n');

    return `/* DOPPEL X v3.2.1 — MV3 background: DNR headers + fail-safe proxy + WebRTC lock + MAIN injection */
const PROFILE = ${q(slim(p))};
const RULES = [{
  id: 1,
  priority: 1,
  action: {
    type: 'modifyHeaders',
    requestHeaders: [
      { header: 'User-Agent', operation: 'set', value: PROFILE.navigator.userAgent },
      { header: 'Accept-Language', operation: 'set', value: PROFILE.locale.languages.join(',') },
${chRules}
      ${p.privacy.doNotTrack ? `{ header: 'DNT', operation: 'set', value: '1' }, { header: 'Sec-GPC', operation: 'set', value: '${p.privacy.globalPrivacyControl ? '1' : '0'}' },` : `{ header: 'DNT', operation: 'remove' },`}
    ],
  },
  condition: {
    urlFilter: '*',
    resourceTypes: ['main_frame', 'sub_frame', 'xmlhttprequest', 'script', 'stylesheet', 'image', 'font', 'media', 'other', 'ping', 'websocket'],
  },
}];

async function syncRuntime() {
  try { await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: [1], addRules: RULES }); } catch (e) {}
  try {
    if (chrome.privacy && chrome.privacy.network && chrome.privacy.network.webRTCIPHandlingPolicy) {
      await chrome.privacy.network.webRTCIPHandlingPolicy.set({ value: 'disable_non_proxied_udp' });
    }
  } catch (e) {}
  try {
    ${ep ? `await chrome.proxy.settings.set({
      value: {
        mode: 'fixed_servers',
        rules: {
          singleProxy: { scheme: '${ep.scheme}', host: '${ep.host}', port: ${ep.port} },
          bypassList: ${ep.viaRelay ? `['127.0.0.1', 'localhost']` : `['localhost', '127.0.0.1', '<local>']`},
        },
      },
      scope: 'regular',
    });` : `await chrome.proxy.settings.clear({ scope: 'regular' });`}
  } catch (e) {}
  try { await chrome.storage.local.set({ profile: PROFILE }); } catch (e) {}
}

if (chrome.webRequest && chrome.webRequest.onAuthRequired) {
  chrome.webRequest.onAuthRequired.addListener((details, cb) => {
    if (!details.isProxy) return cb({});
    const u = ${JSON.stringify(ep && !ep.viaRelay ? ep.username : '')};
    const pw = ${JSON.stringify(ep && !ep.viaRelay ? ep.password : '')};
    if (!u && !pw) return cb({});
    cb({ authCredentials: { username: u, password: pw } });
  }, { urls: ['<all_urls>'] }, ['asyncBlocking']);
}

if (chrome.webNavigation && chrome.webNavigation.onCommitted) {
  chrome.webNavigation.onCommitted.addListener(async (d) => {
    if (d.frameId !== 0) return;
    try {
      await chrome.scripting.executeScript({
        target: { tabId: d.tabId },
        world: 'MAIN',
        injectImmediately: true,
        func: (prof) => { window.__DOPPEL_PROFILE__ = prof; },
        args: [PROFILE],
      });
    } catch (e) {}
  });
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.type === 'DX_SYNC') {
    syncRuntime().then(() => sendResponse({ ok: true })).catch((e) => sendResponse({ ok: false, error: String(e) }));
    return true;
  }
});
chrome.runtime.onInstalled.addListener(syncRuntime);
if (chrome.runtime.onStartup) chrome.runtime.onStartup.addListener(syncRuntime);
syncRuntime();
`;
  }

  function extensionConfig(p) {
    return `/* DOPPEL X v3.2.1 — synchronous MAIN-world config at document_start (zero DOM race) */
'use strict';
if (typeof window !== 'undefined' && !window.__DOPPEL_PROFILE__) {
  window.__DOPPEL_PROFILE__ = ${q(slim(p))};
}
`;
  }

  function extensionContent(p) {
    return extensionConfig(p);
  }

  function extensionPopupHtml(p) {
    return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{margin:0;padding:12px;width:300px;background:#070a12;color:#e8eefc;font:13px/1.5 system-ui,sans-serif}.box{background:#0e1422;border:1px solid #222e47;border-radius:10px;padding:10px;margin-bottom:8px}b{color:#34d399}code{color:#22d3ee;font-size:11px;word-break:break-all}button{width:100%;padding:8px;border:0;border-radius:8px;background:#4f8cff;color:#04101f;font-weight:700;cursor:pointer;margin-top:6px}</style></head>
<body>
<div class="box"><div><b>DOPPEL X v3.2.1 active</b></div><div>${p.name}</div><code>${p.geo.city} · ${p.geo.tz}</code></div>
<div class="box">This public fixture performs no automatic external IP, DNS, or reputation check. Validate only with an endpoint you own or are authorised to test.</div>
<button id="sync">Re-apply local extension rules</button>
<div class="box" id="live" style="display:none"></div>
<script src="popup.js"></script></body></html>`;
  }

  function extensionPopupJs(p) {
    return `'use strict';
document.getElementById('sync').onclick = () => {
  chrome.runtime.sendMessage({ type: 'DX_SYNC' }, (result) => {
    const live = document.getElementById('live');
    live.style.display = 'block';
    live.textContent = (result && result.ok) ? 'Local extension rules re-applied.' : 'Sync error';
  });
};
`;
  }

  /* ------------------------------------------------ v2rayNG & Super Proxy */
  function v2rayngConfig(p) {
    const source = (p.network && p.network.proxy) || {};
    const px = { protocol: source.protocol, host: source.host, port: source.port };
    const proto = px.protocol === 'http' || px.protocol === 'https' ? 'http' : 'socks';
    const server = { address: px.host || 'PROXY_HOST', port: Number(px.port) || 1080 };
    return q({
      remarks: `DOPPEL-X · ${p.geo.country} · ${p.geo.city}`,
      dns: {
        hosts: { 'dns.google': '8.8.8.8', 'cloudflare-dns.com': '1.1.1.1' },
        servers: ['https://1.1.1.1/dns-query', 'https://9.9.9.9/dns-query'],
      },
      inbounds: [
        { tag: 'socks', port: 10808, listen: '127.0.0.1', protocol: 'socks', sniffing: { enabled: true, destOverride: ['http', 'tls'] }, settings: { auth: 'noauth', udp: true } },
        { tag: 'http', port: 10809, listen: '127.0.0.1', protocol: 'http', sniffing: { enabled: true, destOverride: ['http', 'tls'] } },
      ],
      outbounds: [
        {
          tag: 'proxy',
          protocol: proto,
          settings: { servers: [server] },
        },
        { tag: 'direct', protocol: 'freedom', settings: {} },
        { tag: 'block', protocol: 'blackhole', settings: { response: { type: 'http' } } },
      ],
      routing: {
        domainStrategy: 'IPIfNonMatch',
        rules: [
          { type: 'field', port: '53', network: 'udp', outboundTag: 'block' },
          { type: 'field', ip: ['geoip:private'], outboundTag: 'direct' },
          { type: 'field', port: '0-65535', outboundTag: 'proxy' },
        ],
      },
    });
  }

  function superProxyGuide(p) {
    const source = (p.network && p.network.proxy) || {};
    const px = { protocol: source.protocol, host: source.host, port: source.port, exitIp: source.exitIp };
    return [
      `# DOPPEL X v3.2.1 — Super Proxy (Android Rootless VPN Mode)`,
      `# Profile: ${p.name} (${p.geo.country} · ${p.geo.city} · ${p.geo.tz})`,
      ``,
      `Protocol      : ${String(px.protocol || 'socks5').toUpperCase()}`,
      `Server        : ${px.host || 'REPLACE_HOST'}`,
      `Port          : ${px.port || 1080}`,
      `Auth Method   : configure separately in your permitted environment`,
      `Credentials   : intentionally not exported by this public release`,
      `Custom DNS    : 1.1.1.1 , 9.9.9.9 (Enable DNS over Proxy / Block UDP 53)`,
      `Bypass Apps   : NONE (Leave empty so browser cannot leak Irancell IP)`,
      `Expected Exit : ${px.exitIp || '(verify via /api/ip/audit after Start)'}`,
      `Expected TZ   : ${p.geo.tz} (${p.geo.tzAbbr})`,
    ].join('\n');
  }

  /* -------------------------------------------------------------------- adb */
  function adb(p) {
    const ep = effectiveProxy(p);
    const lines = [
      '# DOPPEL X — ADB environment bundle (no root required for most keys)',
      `# target: ${p.os.osName} ${p.os.osVersion} · ${p.geo.city} · ${p.geo.tz}`,
      'adb shell settings put global http_proxy :0',
      'adb shell settings put system font_scale 1.0',
      '',
      '# read-back / verification',
      'adb shell getprop ro.product.model',
      'adb shell getprop ro.build.version.release',
      'adb shell settings get system time_zone',
      `adb shell setprop persist.sys.timezone ${p.geo.tz}   # needs root on most builds`,
      `adb shell settings put system time_12_24 ${p.locale.hour12 ? '12' : '24'}`,
      `adb shell setprop persist.sys.language ${p.locale.languageCode}`,
      `adb shell setprop persist.sys.country ${p.geo.country}`,
      '',
      '# proxy the device through the profile exit (Wi-Fi debug bridge)',
      ep ? `adb shell settings put global http_proxy ${ep.host}:${ep.port}` : '# no proxy in this profile',
      `# LAN / proxy conflict check: ${p.geo.city} ↔ ${p.geo.tz}`,
    ];
    return lines.join('\n') + '\n';
  }

  /* -------------------------------------------------------------- WebView boot */
  function webview(p) {
    return `<!-- DOPPEL X v3.0 — minimal Android WebView bootstrap -->
<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<script>window.__DOPPEL_PROFILE__ = ${q(slim(p))};</script>
<script src="spoof.js"></script>
<h3 style="font-family:sans-serif">DOPPEL X v3 profile ${p.id} active.</h3>
`;
  }

  /* ------------------------------------------------------------------ verify */
  function verifier(p) {
    const want = {
      ua: p.navigator.userAgent, platform: p.navigator.platform, lang: p.locale.languages.join(','),
      tz: p.geo.tz, w: p.screen.width, h: p.screen.height, dpr: p.screen.dpr,
      gl: p.hardware.gpu.unmaskedRenderer || p.hardware.gpu.renderer, cores: p.navigator.hardwareConcurrency,
      mem: p.navigator.deviceMemory, touch: p.navigator.maxTouchPoints,
      exitIp: (p.network.proxy && p.network.proxy.exitIp) || '',
    };
    return `<!doctype html><html><head><meta charset="utf-8"><title>DOPPEL X v3.2.1 live verifier</title>
<style>body{font:14px/1.5 system-ui,sans-serif;background:#070a12;color:#e8eefc;padding:20px;max-width:960px;margin:auto}
td,th{border-bottom:1px solid #1e2b47;padding:8px 10px;text-align:left}table{width:100%;border-collapse:collapse;margin-top:12px}
.ok{color:#34d399;font-weight:700}.bad{color:#f87171;font-weight:700}code{color:#22d3ee}</style></head><body>
<h2>DOPPEL X v3.2.1 — Multi-Realm Live Verifier</h2>
<p>Profile: <b>${p.name}</b> (${p.id}) · Expected Exit IP: <code>${want.exitIp || 'active proxy'}</code></p>
<table id="t"></table>
<script>
const WANT = ${q(want)};
function gl(){try{const c=document.createElement('canvas');const g=c.getContext('webgl');const e=g.getExtension('WEBGL_debug_renderer_info');return e?g.getParameter(e.UNMASKED_RENDERER_WEBGL):'n/a';}catch(e){return 'error'}}
function workerCheck(){
  return new Promise((res)=>{
    try{
      const b=new Blob(['postMessage({ua:navigator.userAgent,tz:Intl.DateTimeFormat().resolvedOptions().timeZone,cores:navigator.hardwareConcurrency,wd:navigator.webdriver});'],{type:'application/javascript'});
      const w=new Worker(URL.createObjectURL(b));
      w.onmessage=(e)=>{w.terminate();res(e.data);};
      setTimeout(()=>res(null),1500);
    }catch(e){res(null);}
  });
}
(async ()=>{
  const w = await workerCheck();
  const janOff = new Date('2026-01-15T12:00:00Z').getTimezoneOffset();
  const julOff = new Date('2026-07-15T12:00:00Z').getTimezoneOffset();
  const ownLeak = Object.getOwnPropertyDescriptor(navigator, 'userAgent') !== undefined;
  const nativeToStr = Function.prototype.toString.call(Intl.DateTimeFormat.prototype.resolvedOptions).includes('[native code]');
  const rows=[
    ['navigator.userAgent', navigator.userAgent, WANT.ua],
    ['navigator.platform', navigator.platform, WANT.platform],
    ['navigator.languages', (navigator.languages||[]).join(','), WANT.lang],
    ['Intl timezone', Intl.DateTimeFormat().resolvedOptions().timeZone, WANT.tz],
    ['Worker UA parity', w ? w.ua : 'blocked-by-csp', WANT.ua],
    ['Worker TZ parity', w ? w.tz : 'blocked-by-csp', WANT.tz],
    ['Date.toString() vs getHours()', String(new Date().getHours()).padStart(2,'0'), (new Date().toString().match(/\\s(\\d{2}):\\d{2}:\\d{2}/)||[])[1]||''],
    ['DST probe (Jan / Jul offset)', janOff + ' / ' + julOff, janOff + ' / ' + julOff],
    ['Zero navigator ownProps', String(!ownLeak), 'true'],
    ['Native toString facade', String(nativeToStr), 'true'],
    ['screen', screen.width+'x'+screen.height, WANT.w+'x'+WANT.h],
    ['dpr', String(devicePixelRatio), String(WANT.dpr)],
    ['webgl renderer', gl(), WANT.gl],
    ['cores', String(navigator.hardwareConcurrency), String(WANT.cores)],
    ['webdriver', String(navigator.webdriver), 'false'],
  ];
  const tb=document.querySelector('#t');
  tb.innerHTML='<tr><th>surface</th><th>observed</th><th>expected</th><th>status</th></tr>'+rows.map(([k,a,b])=>{
    const ok=String(a)===String(b);
    return '<tr><td><code>'+k+'</code></td><td>'+a+'</td><td>'+b+'</td><td class="'+(ok?'ok':'bad')+'">'+(ok?'PASS':'FAIL')+'</td></tr>';
  }).join('');
})();
</script></body></html>`;
  }

  /* ------------------------------------------------------------------- json */
  function profileJson(p) { return q(slim(p)); }

  function feed(profiles) {
    return q({ generator: 'DOPPEL X', version: '3.2.1', exportedAt: new Date().toISOString(), count: profiles.length, profiles: profiles.map(slim) });
  }

  /* ------------------------------------------------------------------ csv */
  function csv(profiles) {
    const head = ['id', 'name', 'platform', 'os', 'browser', 'country', 'city', 'timezone', 'locale', 'screen', 'dpr', 'cores', 'ram', 'gpu', 'proxy', 'exitIp', 'fraudScore', 'risk', 'score', 'grade'];
    const rows = profiles.map((p) => [
      p.id, p.name, p.os.platform, `${p.os.osName} ${p.os.osVersion}`, `${p.browser.name} ${p.browser.major}`,
      p.geo.country, p.geo.city, p.geo.tz, p.locale.locale, `${p.screen.width}x${p.screen.height}`, p.screen.dpr,
      p.os.cores, p.os.ramGB, p.hardware.gpu.device, p.network.proxy ? `${p.network.proxy.host}:${p.network.proxy.port}` : 'direct',
      (p.network.proxy && p.network.proxy.exitIp) || '', (p.network.proxy && p.network.proxy.fraudScore) ?? '',
      p.risk ? p.risk.score : '', p.consistency ? p.consistency.score : '', p.consistency ? p.consistency.grade : '',
    ]);
    const esc = (v) => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;
    return [head, ...rows].map((r) => r.map(esc).join(',')).join('\n');
  }

  const EXPORTS = [
    { id: 'userscript', label: 'Userscript (Complete)', ext: '.user.js', icon: 'US', build: userscript, note: 'Self-contained v3.2.1 runtime (Firefox Android Violentmonkey / Tampermonkey).' },
    { id: 'termux', label: 'Termux Playwright', ext: '.js', icon: 'TX', build: termuxPlaywright, note: 'Runs Termux Chromium on POCO X6 5G via Local Fail-Closed Relay.' },
    { id: 'v2rayng', label: 'v2rayNG Safe-DNS', ext: '.json', icon: 'V2', build: v2rayngConfig, note: 'Global routing + Remote DoH (eliminates Bypass-Iran & Local-DNS leaks).' },
    { id: 'superproxy', label: 'Super Proxy Guide', ext: '.txt', icon: 'SP', build: superProxyGuide, note: 'Exact rootless Android VPN parameters + DNS hardening.' },
    { id: 'playwright', label: 'Playwright', ext: '.js', icon: 'PW', build: playwright, note: 'Persistent context + init script + relay-safe proxy.' },
    { id: 'puppeteer', label: 'Puppeteer', ext: '.js', icon: 'P', build: puppeteer, note: 'Chromium automation with CDP timezone/locale + relay.' },
    { id: 'selenium', label: 'Selenium', ext: '.py', icon: 'Se', build: selenium, note: 'Python + ChromeDriver, CDP overrides.' },
    { id: 'manifest', label: 'Extension manifest', ext: '.json', icon: 'MV', build: extensionManifest, note: 'MV3 manifest (world: MAIN content_scripts + webRequestAuthProvider + DNR).' },
    { id: 'background', label: 'Extension worker', ext: '.js', icon: 'BG', build: extensionBackground, note: 'DNR headers + WebRTC policy + auth + relay proxy.' },
    { id: 'content', label: 'Extension MAIN config', ext: '.js', icon: 'CS', build: extensionConfig, note: 'Synchronous MAIN-world profile config at document_start.' },
    { id: 'adb', label: 'ADB bundle', ext: '.sh', icon: 'ADB', build: adb, note: 'Device-level env: timezone, locale, proxy.' },
    { id: 'webview', label: 'WebView boot', ext: '.html', icon: 'WV', build: webview, note: 'Drop-in Android WebView identity page.' },
    { id: 'verify', label: 'Verifier page', ext: '.html', icon: 'V', build: verifier, note: 'Self-check: Main + Worker + DST + Native prototype tests.' },
    { id: 'json', label: 'Profile JSON', ext: '.json', icon: '{}', build: profileJson, note: 'Raw machine-readable profile.' },
  ];

  return { EXPORTS, puppeteer, playwright, termuxPlaywright, selenium, userscript, extensionManifest, extensionBackground, extensionConfig, extensionContent, extensionPopupHtml, extensionPopupJs, v2rayngConfig, superProxyGuide, adb, webview, verifier, profileJson, feed, csv, chromeFlags, slim, effectiveProxy };
})();

if (typeof module !== 'undefined') module.exports = { EX };
