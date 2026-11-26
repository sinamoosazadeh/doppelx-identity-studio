/* ==========================================================================
   DOPPEL X Runtime v3.2.1 — background service worker
   - keeps the active profile
   - applies network layer: HTTP/HTTPS/SOCKS5 proxy (or clears for OS VPN) +
     WebRTC IP-leak policy + full DNR header overrides (User-Agent,
     Accept-Language, full Client Hints including model & platform-version)
   - passes the profile to every tab before navigation
   ========================================================================== */
'use strict';

let active = null;
const RULES_ID = 1001;

async function load() {
  const { profile } = await chrome.storage.local.get('profile');
  active = profile || null;
  return active;
}

async function applyWebRTC(p) {
  if (!chrome.privacy || !chrome.privacy.network || !chrome.privacy.network.webRTCIPHandlingPolicy) return;
  try {
    const mode = p && p.network && p.network.webrtc;
    const value = mode === 'disabled' ? 'disable_non_proxied_udp'
      : mode === 'relay' ? 'disable_non_proxied_udp'
      : 'default_public_interface_only';
    await chrome.privacy.network.webRTCIPHandlingPolicy.set({ value });
  } catch (e) { console.warn('[DOPPEL X] webrtc policy', e); }
}

async function applyProxy(p) {
  if (!p || !p.network || p.network.mode !== 'proxy' || !p.network.proxy) {
    await chrome.proxy.settings.clear({ scope: 'regular' }).catch(() => {});
    return;
  }
  const px = p.network.proxy;
  // Prefer local fail-closed relay when configured (solves Chromium SOCKS5 auth limitation)
  const useRelay = !!(px.viaRelay && px.localRelayPort);
  if (!useRelay && (px.protocol === 'vpn' || px.protocol === 'os_vpn' || !px.host || !px.port || Number(px.port) <= 0)) {
    await chrome.proxy.settings.clear({ scope: 'regular' }).catch(() => {});
    return;
  }
  const scheme = useRelay ? 'http'
    : px.protocol === 'https' ? 'https'
    : px.protocol === 'http' ? 'http'
    : 'socks5';
  const host = useRelay ? '127.0.0.1' : px.host;
  const port = useRelay ? Number(px.localRelayPort) : Number(px.port);
  const config = {
    mode: 'fixed_servers',
    rules: {
      singleProxy: { scheme, host, port },
      bypassList: useRelay ? ['127.0.0.1', 'localhost'] : ['localhost', '127.0.0.1', '<local>'],
    },
  };
  await chrome.proxy.settings.set({ value: config, scope: 'regular' }).catch((e) => console.warn('[DOPPEL X] proxy', e));
}

if (chrome.webRequest && chrome.webRequest.onAuthRequired) {
  chrome.webRequest.onAuthRequired.addListener(
    (details, callback) => {
      if (!details.isProxy) return callback({});
      if (!active || !active.network || !active.network.proxy) return callback({});
      const px = active.network.proxy;
      if (px.viaRelay) return callback({});
      if (!px.username && !px.password) return callback({});
      callback({ authCredentials: { username: px.username || '', password: px.password || '' } });
    },
    { urls: ['<all_urls>'] },
    ['asyncBlocking'],
  );
}

function buildHeaders(p) {
  const h = [];
  const add = (header, operation, value) => h.push({ header, operation, value });
  add('User-Agent', 'set', p.navigator.userAgent);

  if (p.clientHints) {
    const ch = p.clientHints;
    const brands = ch.brands.map((b) => `"${b.brand}";v="${b.version}"`).join(', ');
    const full = (ch.fullVersionList || ch.brands).map((b) => `"${b.brand}";v="${b.version}"`).join(', ');
    add('sec-ch-ua', 'set', brands);
    add('sec-ch-ua-full-version-list', 'set', full);
    add('sec-ch-ua-mobile', 'set', ch.mobile ? '?1' : '?0');
    add('sec-ch-ua-platform', 'set', `"${ch.platform}"`);
    add('sec-ch-ua-platform-version', 'set', `"${ch.platformVersion}"`);
    if (ch.architecture) add('sec-ch-ua-arch', 'set', `"${ch.architecture}"`);
    else add('sec-ch-ua-arch', 'remove', '');
    if (ch.bitness) add('sec-ch-ua-bitness', 'set', `"${ch.bitness}"`);
    else add('sec-ch-ua-bitness', 'remove', '');
    if (ch.model) add('sec-ch-ua-model', 'set', `"${ch.model}"`);
    else add('sec-ch-ua-model', 'remove', '');
    add('sec-ch-ua-form-factors', 'set', ch.formFactors ? ch.formFactors.map((f) => `"${f}"`).join(', ') : '"Desktop"');
  } else {
    ['sec-ch-ua', 'sec-ch-ua-full-version-list', 'sec-ch-ua-mobile', 'sec-ch-ua-platform', 'sec-ch-ua-platform-version',
      'sec-ch-ua-arch', 'sec-ch-ua-bitness', 'sec-ch-ua-model', 'sec-ch-ua-form-factors'].forEach((x) => add(x, 'remove', ''));
  }

  const langs = (p.locale && p.locale.languages) || ['en-US'];
  add('Accept-Language', 'set', langs.join(',') + (langs.length < 3 && !langs.includes('en') ? ',en;q=0.9' : ''));
  if (p.privacy && p.privacy.doNotTrack) {
    add('DNT', 'set', '1');
    add('Sec-GPC', 'set', p.privacy.globalPrivacyControl ? '1' : '0');
  } else {
    add('DNT', 'remove', '');
    add('Sec-GPC', 'remove', '');
  }
  return h.filter((x) => x.operation === 'remove' || x.value !== '');
}

async function applyHeaders(p) {
  await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: [RULES_ID] }).catch(() => {});
  if (!p) return;
  const requestHeaders = buildHeaders(p);
  const rule = {
    id: RULES_ID,
    priority: 1,
    action: { type: 'modifyHeaders', requestHeaders },
    condition: {
      urlFilter: '*',
      resourceTypes: ['main_frame', 'sub_frame', 'xmlhttprequest', 'script', 'stylesheet', 'image', 'font', 'media', 'other', 'ping', 'websocket'],
    },
  };
  await chrome.declarativeNetRequest.updateDynamicRules({ addRules: [rule] }).catch((e) => console.warn('[DOPPEL X] dnr', e));
}

async function applyAll() {
  await load();
  await Promise.all([applyProxy(active), applyWebRTC(active), applyHeaders(active)]);
}

chrome.runtime.onInstalled.addListener(applyAll);
chrome.runtime.onStartup.addListener(applyAll);
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.profile) applyAll();
});

chrome.webNavigation.onCommitted.addListener(async (d) => {
  if (d.frameId !== 0) return;
  if (!active) await load();
  try {
    await chrome.scripting.executeScript({
      target: { tabId: d.tabId },
      world: 'MAIN',
      injectImmediately: true,
      func: (profile) => { if (profile) window.__DOPPEL_PROFILE__ = profile; },
      args: [active ? {
        id: active.id, name: active.name, browser: active.browser, os: active.os,
        fingerprint: active.fingerprint, privacy: active.privacy, locale: active.locale,
        geo: active.geo, display: active.display, hardware: active.hardware, screen: active.screen,
        network: active.network, navigator: active.navigator, clientHints: active.clientHints,
        behavior: active.behavior, speech: active.speech, permissions: active.permissions,
      } : null],
    });
  } catch (e) {}
});

chrome.runtime.onMessage.addListener((msg, sender, respond) => {
  if (msg && msg.type === 'DOPPEL_GET') {
    load().then((p) => respond({ profile: p }));
    return true;
  }
  if (msg && msg.type === 'DOPPEL_SET') {
    chrome.storage.local.set({ profile: msg.profile }).then(() => {
      active = msg.profile;
      Promise.all([applyProxy(active), applyWebRTC(active), applyHeaders(active)]).then(() => respond({ ok: true }));
    });
    return true;
  }
  if (msg && msg.type === 'DOPPEL_CLEAR') {
    chrome.storage.local.remove('profile').then(async () => {
      active = null;
      await chrome.proxy.settings.clear({ scope: 'regular' }).catch(() => {});
      await applyWebRTC(null);
      await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: [RULES_ID] }).catch(() => {});
      respond({ ok: true });
    });
    return true;
  }
  if (msg && msg.type === 'DOPPEL_STATE') {
    Promise.all([
      chrome.proxy.settings.get({ incognito: false }).catch(() => null),
      chrome.declarativeNetRequest.getDynamicRules().catch(() => []),
    ]).then(([proxy, rules]) => {
      load().then((p) => respond({ profile: p, proxy, rules, tabs: 'ok' }));
    });
    return true;
  }
});

load().then(() => applyAll());
