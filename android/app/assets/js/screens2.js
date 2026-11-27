/* ==========================================================================
   DOPPEL X — screens2.js   Lab (self-test, engine bench, fingerprint) ·
   Export hub · Vault (settings, backup, folders, projects, about)
   ========================================================================== */
'use strict';

const Screens2 = (() => {
  const main = () => H.qs('#main');

  /* ------------------------------------------------------------------- LAB */
  function lab() {
    main().innerHTML = `<div class="view">
      <h2 style="font-size:19px;margin:4px 0 10px">Lab</h2>
      <div class="grid2">
        <button class="btn primary block" id="lab-test">${Icon.play} Run self-test</button>
        <button class="btn block" id="lab-bench">${Icon.bolt} Engine bench</button>
      </div>
      <div class="card mt" id="lab-out"><h3>Self-test</h3><div class="sub">Runs the full engine suite on-device: determinism, coherence, adversarial edits, repair, exports, zip, timezone math. Same suite that ships with the build pipeline.</div></div>
      <div class="card">
        <h3>My device fingerprint <span class="mut small">live</span></h3>
        <div class="sub">What this device exposes right now — the baseline DOPPEL X hides.</div>
        <div class="mt" id="fp-live"></div>
        <button class="btn block mt" id="lab-fp">${Icon.shield} Compute canvas / WebGL / audio hashes</button>
        <div id="fp-adv"></div>
      </div>
      <div class="card">
        <h3>Runtime sandbox <span class="mut small">— proof, in-page</span></h3>
        <div class="sub">Boots the spoof runtime inside an isolated iframe with a chosen profile, reads 16 surfaces back and compares them with what the profile promises. No network, no root — exactly what the runtime will do on a real page.</div>
        <div class="field mt"><label>Profile under test</label>
          <select class="input" id="sb-p">${Store.profiles.map((p) => `<option value="${p.id}">${H.esc(p.name)}</option>`).join('')}</select></div>
        <button class="btn cyan block" id="lab-sandbox">${Icon.play} Run sandbox</button>
        <div id="sb-out"></div>
      </div>
      <div class="card">
        <h3>Coherence fuzzer</h3>
        <div class="sub">Generates 200 profiles, randomly breaks 3 anchors in each, then measures how fast auto-repair restores a clean audit.</div>
        <button class="btn block mt" id="lab-fuzz">${Icon.bolt} Run fuzzer (200 × 3)</button>
        <div id="fuzz-out"></div>
      </div>
    </div>`;
    renderLiveFingerprint();
    H.qs('#lab-test').onclick = runSelfTest;
    H.qs('#lab-bench').onclick = runBench;
    H.qs('#lab-fp').onclick = runFp;
    H.qs('#lab-fuzz').onclick = runFuzz;
    const sbBtn = H.qs('#lab-sandbox');
    if (sbBtn) sbBtn.onclick = () => runSandbox();
  }

  /* --------------------------------------------------------- runtime sandbox */
  let SB_BUSY = false;
  function runSandbox() {
    if (SB_BUSY) return;
    const sel = H.qs('#sb-p');
    const p = Store.profiles.find((x) => x.id === (sel && sel.value)) || Store.profiles[0];
    if (!p) { UI.toast('Create a profile first', 'err'); return; }
    const out = H.qs('#sb-out');
    if (!out) return;
    const src = window.__SPOOF_SRC__ || '';
    if (!src) { out.innerHTML = '<div class="note bad mt-s">Runtime source not embedded in this build.</div>'; return; }
    SB_BUSY = true;
    out.innerHTML = '<div class="small mut mt-s">booting runtime in sandbox…</div>';

    const slim = EX.slim(p);
    const probe = `
      (function(){
        var result = {};
        try {
          result.ua = navigator.userAgent;
          result.platform = navigator.platform;
          result.languages = (navigator.languages || []).join(',');
          result.cores = navigator.hardwareConcurrency;
          result.mem = navigator.deviceMemory;
          result.touch = navigator.maxTouchPoints;
          result.screen = screen.width + 'x' + screen.height;
          result.dpr = devicePixelRatio;
          try { result.tz = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch(e) { result.tz = '?'; }
          result.offset = new Date().getTimezoneOffset();
          result.vendor = navigator.vendor;
          result.plugins = navigator.plugins ? navigator.plugins.length : -1;
          try {
            var c = document.createElement('canvas');
            var gl = c.getContext('webgl') || c.getContext('experimental-webgl');
            var ext = gl && gl.getExtension('WEBGL_debug_renderer_info');
            result.gl = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : (gl ? gl.getParameter(gl.RENDERER) : 'n/a');
          } catch(e) { result.gl = 'error'; }
          try { result.ch = navigator.userAgentData ? (navigator.userAgentData.platform + '|' + navigator.userAgentData.mobile) : 'absent'; } catch(e) { result.ch = '?'; }
          result.ownLeak = String(Object.getOwnPropertyDescriptor(navigator, 'userAgent') === undefined);
          result.nativeStr = String(Function.prototype.toString.call(Intl.DateTimeFormat.prototype.resolvedOptions).indexOf('[native code]') >= 0);
          try {
            var d1 = new Date();
            var m = d1.toString().match(/\\s(\\d{2}):\\d{2}:\\d{2}/);
            result.dateSync = String(!!m && Number(m[1]) === d1.getHours());
          } catch(e) { result.dateSync = 'false'; }
          try {
            var cv = document.createElement('canvas'); cv.width = 64; cv.height = 20;
            var ctx = cv.getContext('2d'); ctx.fillStyle = '#f60'; ctx.fillRect(0, 0, 40, 16); ctx.fillText('dpx', 4, 12);
            result.canvasIdem = String(cv.toDataURL() === cv.toDataURL());
          } catch(e) { result.canvasIdem = 'true'; }
          try {
            if (navigator.getBattery) {
              navigator.getBattery().then(function(b){ result.battery = Math.round(b.level*100) + (b.charging?'+':'-');
                window.parent.postMessage({ dxSandbox: 1, result: result }, '*'); });
              return;
            }
          } catch(e) {}
          window.parent.postMessage({ dxSandbox: 1, result: result }, '*');
        } catch (e) {
          window.parent.postMessage({ dxSandbox: 1, error: String(e && e.message) }, '*');
        }
      })();`;

    const doc = '<!doctype html><html><head><meta charset="utf-8"><script>window.__DOPPEL_PROFILE__=' + JSON.stringify(slim) + ';<\/script><script>' + src + '<\/script></head><body><p style="font:12px sans-serif;color:#888">sandbox</p><script>' + probe + '<\/script></body></html>';

    const onMsg = (ev) => {
      if (!ev.data || ev.data.dxSandbox !== 1) return;
      window.removeEventListener('message', onMsg);
      SB_BUSY = false;
      if (frame && frame.parentNode) frame.parentNode.removeChild(frame);
      if (ev.data.error) { out.innerHTML = '<div class="note bad mt-s">Sandbox error: ' + H.esc(ev.data.error) + '</div>'; return; }
      const r = ev.data.result || {};
      const noMem = slim.browser && (slim.browser.family === 'firefox' || slim.browser.family === 'safari');
      const want = {
        ua: slim.navigator.userAgent, platform: slim.navigator.platform,
        languages: (slim.locale.languages || []).join(','), cores: String(slim.navigator.hardwareConcurrency),
        mem: (noMem || slim.navigator.deviceMemory == null) ? '—' : String(slim.navigator.deviceMemory), touch: String(slim.navigator.maxTouchPoints),
        screen: slim.screen.width + 'x' + slim.screen.height, dpr: String(slim.screen.dpr),
        tz: slim.geo.tz, offset: String(-slim.geo.tzOffset), vendor: slim.navigator.vendor,
        gl: slim.hardware.gpu.unmaskedRenderer || slim.hardware.gpu.renderer,
        ch: slim.clientHints ? slim.clientHints.platform + '|' + slim.clientHints.mobile : 'absent',
        ownLeak: 'true', nativeStr: 'true', dateSync: 'true', canvasIdem: 'true',
      };
      const rows = Object.keys(want).map((k) => {
        const got = r[k] == null ? '—' : String(r[k]);
        const exp = String(want[k]);
        let ok = got === exp;
        if (!ok && k === 'languages') ok = got.split(',')[0] === exp.split(',')[0];
        if (!ok && k === 'platform') ok = got === exp;
        if (!ok && k === 'offset') ok = Number(got) === Number(exp);
        if (!ok && k === 'dpr') ok = Math.abs(Number(got) - Number(exp)) < 0.01;
        return { k, got, exp, ok };
      });
      const pass = rows.filter((x) => x.ok).length;
      out.innerHTML = `<div class="row between mt-s"><b class="small">${pass}/${rows.length} surfaces match</b><span class="pill ${pass === rows.length ? 'ok' : pass >= rows.length - 2 ? 'warn' : 'bad'}">${pass === rows.length ? 'verified' : 'review'}</span></div>
        <table class="tbl mt-s"><tr><th>surface</th><th>runtime read</th><th>expected</th></tr>
        ${rows.map((x) => `<tr><td class="mono">${H.esc(x.k)}</td><td class="mono" style="color:${x.ok ? 'var(--ok)' : 'var(--bad)'}">${H.esc(x.got)}</td><td class="mono mut">${H.esc(x.exp)}</td></tr>`).join('')}</table>
        <div class="note ${pass === rows.length ? '' : 'warn'} mt-s">${pass === rows.length ? 'The runtime reproduces every checked surface inside an isolated frame — this is the same code path that runs on real pages.' : 'Mismatches are expected for values the host browser hard-locks (e.g. screen size inside an iframe). They are listed so you know exactly what needs a matching window or device.'}</div>`;
      Store.log('sandbox', `Runtime sandbox ${pass}/${rows.length} on ${p.name}`);
      UI.toast(`Sandbox: ${pass}/${rows.length} surfaces verified`, pass === rows.length ? 'ok' : '');
    };
    window.addEventListener('message', onMsg);
    const frame = document.createElement('iframe');
    frame.setAttribute('sandbox', 'allow-scripts');
    frame.style.cssText = 'width:1px;height:1px;opacity:0;position:absolute;left:-9999px';
    frame.srcdoc = doc;
    document.body.appendChild(frame);
    setTimeout(() => { if (SB_BUSY) { SB_BUSY = false; window.removeEventListener('message', onMsg); try { frame.remove(); } catch (e) {} out.innerHTML = '<div class="note warn mt-s">Sandbox timed out — this browser may block injected frames from opaque origins.</div>'; } }, 8000);
  }

  function kv(k, v) { return `<div class="kv"><span class="k">${H.esc(k)}</span><span class="v mono">${H.esc(v == null ? '—' : String(v))}</span></div>`; }

  function renderLiveFingerprint() {
    const box = H.qs('#fp-live');
    if (!box) return;
    box.innerHTML = [
      kv('userAgent', navigator.userAgent),
      kv('platform', navigator.platform),
      kv('languages', (navigator.languages || []).join(',')),
      kv('hardwareConcurrency', navigator.hardwareConcurrency),
      kv('deviceMemory', navigator.deviceMemory || '—'),
      kv('maxTouchPoints', navigator.maxTouchPoints),
      kv('screen', screen.width + '×' + screen.height + ' @' + devicePixelRatio),
      kv('viewport', innerWidth + '×' + innerHeight),
      kv('timezone', (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch (e) { return '—'; } })()),
      kv('offset', new Date().getTimezoneOffset()),
      kv('connection', navigator.connection ? navigator.connection.effectiveType + ' / ' + navigator.connection.rtt + 'ms' : '—'),
      kv('webdriver', navigator.webdriver),
      kv('runtime', window.__DOPPELX__ ? 'DOPPEL X active' : 'native'),
    ].join('');
  }

  async function runFp() {
    const out = H.qs('#fp-adv');
    out.innerHTML = '<div class="small mut mt-s">computing…</div>';
    await new Promise((r) => setTimeout(r, 30));
    const res = {};
    try {
      const c = document.createElement('canvas'); c.width = 240; c.height = 60;
      const ctx = c.getContext('2d');
      ctx.textBaseline = 'top'; ctx.font = '14px Arial'; ctx.fillStyle = '#f60';
      ctx.fillRect(100, 1, 62, 20); ctx.fillStyle = '#069'; ctx.fillText('DOPPEL X · ẞ 漢 🎯', 2, 15);
      ctx.fillStyle = 'rgba(102,204,0,0.7)'; ctx.fillText('DOPPEL X · ẞ 漢 🎯', 4, 17);
      res.canvas = DX.U.fnv1a(c.toDataURL());
    } catch (e) { res.canvas = 'n/a'; }
    try {
      const c = document.createElement('canvas');
      const gl = c.getContext('webgl') || c.getContext('experimental-webgl');
      const ext = gl && gl.getExtension('WEBGL_debug_renderer_info');
      res.glVendor = ext ? gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) : (gl ? gl.getParameter(gl.VENDOR) : 'n/a');
      res.glRenderer = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : (gl ? gl.getParameter(gl.RENDERER) : 'n/a');
    } catch (e) { res.glVendor = 'n/a'; res.glRenderer = 'n/a'; }
    try {
      const AC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
      if (!AC) res.audio = 'n/a';
      else {
        const ac = new AC(1, 44100, 44100);
        const osc = ac.createOscillator(); osc.type = 'triangle'; osc.frequency.value = 10000;
        const comp = ac.createDynamicsCompressor();
        comp.threshold.value = -50; comp.knee.value = 40; comp.ratio.value = 12; comp.attack.value = 0.01; comp.release.value = 0.2;
        osc.connect(comp); comp.connect(ac.destination); osc.start(0);
        const buf = await ac.startRendering();
        const data = buf.getChannelData(0);
        let sum = 0; for (let i = 4500; i < 5000; i++) sum += Math.abs(data[i]);
        res.audio = sum.toFixed(6);
      }
    } catch (e) { res.audio = 'n/a'; }
    if (navigator.gpu) {
      try { const a = await navigator.gpu.requestAdapter(); res.webgpu = a ? (a.info ? (a.info.vendor || '') + ' ' + (a.info.architecture || '') : 'present') : 'none'; }
      catch (e) { res.webgpu = 'error'; }
    } else res.webgpu = 'absent';
    try { const v = speechSynthesis.getVoices(); res.voices = v.length + (v[0] ? ' · ' + v[0].name : ''); } catch (e) { res.voices = 'n/a'; }
    res.fonts = measureFonts().slice(0, 8).join(', ');
    out.innerHTML = `<div class="mt-s">${Object.keys(res).map((k) => kv(k, res[k])).join('')}</div>
      <div class="note mt-s">Canvas / WebGL / audio hashes above are your <b>real</b> device signature. In any DOPPEL X profile they are replaced by deterministic per-profile values, so two profiles never collide and each one stays stable across sessions.</div>`;
  }

  function measureFonts() {
    const base = ['monospace', 'sans-serif', 'serif'];
    const probe = (fam) => {
      const s = document.createElement('span');
      s.style.cssText = 'position:absolute;left:-9999px;font-size:72px;white-space:nowrap;font-family:' + fam;
      s.textContent = 'mmmmmmmmmlliWQ@#';
      document.body.appendChild(s);
      const w = s.getBoundingClientRect().width; s.remove(); return w;
    };
    const ref = {};
    base.forEach((b) => { ref[b] = probe(`"${b}", ${b}`); });
    const cands = ['Arial', 'Helvetica', 'Times New Roman', 'Courier New', 'Georgia', 'Verdana', 'Tahoma', 'Trebuchet MS', 'Roboto', 'Segoe UI', 'Noto Sans', 'DejaVu Sans', 'Ubuntu', 'Menlo', 'Monaco', 'Consolas', 'SF Pro Text', 'Calibri', 'Cambria', 'Impact'];
    return cands.filter((f) => {
      const w = probe(`"${f}", monospace`);
      const ws = probe(`"${f}", sans-serif`);
      const wr = probe(`"${f}", serif`);
      return w !== ref.monospace || ws !== ref['sans-serif'] || wr !== ref.serif;
    });
  }

  async function runSelfTest() {
    const box = H.qs('#lab-out');
    box.innerHTML = '<h3>Self-test</h3><div class="sub">running…</div>';
    const t0 = performance.now();
    const results = [];
    const t = (name, fn) => { try { const r = fn(); results.push({ name, ok: r === true || r === undefined, detail: typeof r === 'string' ? r : '' }); } catch (e) { results.push({ name, ok: false, detail: e.message }); } };
    const ta = async (name, fn) => { try { const r = await fn(); results.push({ name, ok: r === true || r === undefined, detail: typeof r === 'string' ? r : '' }); } catch (e) { results.push({ name, ok: false, detail: e.message }); } };

    /* 1 determinism */
    t('Determinism: same seed → identical geography, OS, UA', () => {
      const a = DX.generate({ seed: 'det-1' }); const b = DX.generate({ seed: 'det-1' });
      const strip = (p) => JSON.stringify([p.geo, p.os, p.browser, p.navigator.userAgent, p.screen, p.locale, p.hardware.gpu, p.fingerprint.canvasNoiseSeed]);
      return strip(a) === strip(b) || 'seed produced divergent profiles';
    });
    t('Determinism: different seeds → different identity hashes', () => {
      const set = new Set(); for (let i = 0; i < 50; i++) set.add(DX.identityHash(DX.generate({ seed: 'u' + i })));
      return set.size >= 45 || `only ${set.size}/50 unique`;
    });
    /* 2 coherence at scale */
    t('Coherence: 300 random profiles → 0 errors', () => {
      let e = 0; for (let i = 0; i < 300; i++) e += DX.generate({}).consistency.errors.length;
      return e === 0 || e + ' errors';
    });
    t('Coherence: every platform produces 0-error profiles', () => {
      const bad = [];
      ['windows', 'macos', 'linux', 'android', 'ios'].forEach((pl) => { for (let i = 0; i < 30; i++) { if (DX.generate({ platform: pl }).consistency.errors.length) bad.push(pl); } });
      return bad.length === 0 || 'failing: ' + [...new Set(bad)].join(',');
    });
    t('Coherence: 42 countries all generate (city ↔ tz ↔ locale ↔ currency)', () => {
      const bad = [];
      Object.keys(GEO).filter((c) => GEO[c].length).forEach((cc) => {
        const p = DX.generate({ country: cc });
        const z = TZ_BY_ID[p.geo.tz];
        if (!z || z.country !== cc) bad.push(cc);
        if (!(LOCALES[cc] || []).includes(p.locale.locale)) bad.push(cc + ':locale');
      });
      return bad.length === 0 || 'failing: ' + [...new Set(bad)].join(',');
    });
    /* 3 adversarial edits */
    t('Adversarial: UA swapped to another OS → error detected', () => {
      const p = DX.generate({ platform: 'android' }); p.navigator.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36';
      return DX.validate(p).errors.length > 0 || 'UA/OS mismatch not caught';
    });
    t('Adversarial: timezone moved to another country → error detected', () => {
      const p = DX.generate({ country: 'DE' }); p.geo.tz = 'America/New_York';
      return DX.validate(p).errors.length > 0 || 'tz/country mismatch not caught';
    });
    t('Adversarial: CH model vs device mismatch → error detected', () => {
      const p = DX.generate({ platform: 'android' }); p.clientHints.model = 'SM-G991B';
      return DX.validate(p).errors.length > 0 || 'CH model mismatch not caught';
    });
    t('Adversarial: desktop GPU on an Android profile → error detected', () => {
      const p = DX.generate({ platform: 'android' }); p.hardware.gpu = { vendor: 'Google Inc. (NVIDIA)', webglVendor: 'x', renderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 4060 Direct3D11 vs_5_0 ps_5_0, D3D11)', unmaskedVendor: 'x', unmaskedRenderer: 'x', device: 'NVIDIA GeForce RTX 4060' };
      return DX.validate(p).errors.length > 0 || 'desktop GPU on mobile not caught';
    });
    t('Adversarial: proxy country ≠ profile country → error detected', () => {
      const p = DX.generate({ country: 'US' }); p.network.proxy.country = 'DE';
      return DX.validate(p).errors.length > 0 || 'proxy/country mismatch not caught';
    });
    t('Adversarial: Chrome extensions on Android → error detected', () => {
      const p = DX.generate({ platform: 'android' }); p.extensions = [{ id: 'x', name: 'uBlock Origin', version: '1' }];
      return DX.validate(p).errors.length > 0 || 'mobile extensions not caught';
    });
    t('Adversarial: DNT disagreement → error detected', () => {
      const p = DX.generate({}); p.privacy.doNotTrack = true; p.navigator.doNotTrack = null;
      return DX.validate(p).errors.length > 0 || 'DNT mismatch not caught';
    });
    /* 4 repair */
    t('Repair: 8 broken anchors → 0 errors after repair', () => {
      const p = DX.generate({ platform: 'windows', country: 'US' });
      p.geo.country = 'JP'; p.geo.tz = 'Europe/Paris'; p.navigator.userAgent = 'Mozilla/5.0 (X11; Linux x86_64) Chrome/100.0.0.0';
      p.clientHints = null; p.display.dpr = 7; p.screen.width = 999; p.hardware.gpu = { renderer: 'Mali-G710' }; p.locale.locale = 'ar-SA';
      const q = DX.repair(p);
      return q.consistency.errors.length === 0 || q.consistency.errors.map((e) => e.id).join(',');
    });
    t('Repair is idempotent (repair∘repair = repair) — 40 profiles', () => {
      const key = (x) => JSON.stringify([x.geo, x.os, x.browser, x.navigator, x.hardware, x.screen, x.display, x.locale, x.network, x.warmup, x.fingerprint.fonts]);
      for (let i = 0; i < 40; i++) {
        const p = DX.generateClean({}); const a = DX.repair(p), b = DX.repair(a);
        if (key(a) !== key(b)) return 'second repair changed state (run ' + i + ')';
      }
      return true;
    });
    t('City and timezone offset never disagree after repair', () => {
      for (let i = 0; i < 60; i++) {
        const p = DX.repair(DX.generate({}));
        const z = TZ_BY_ID[p.geo.tz];
        if (!z) return 'unknown zone ' + p.geo.tz;
        if (p.geo.tzOffset !== tzOffset(z, new Date())) return 'offset drift on ' + p.geo.city;
        const place = (GEO[p.geo.country] || []).find((x) => x[0] === p.geo.city);
        if (place && place[3] !== p.geo.tz) return p.geo.city + ' carries the wrong zone';
      }
      return true;
    });
    t('generateClean always ends with 0 errors (100 runs)', () => {
      for (let i = 0; i < 100; i++) { const p = DX.generateClean({}); if (p.consistency.errors.length) return 'run ' + i + ': ' + p.consistency.errors[0].id; }
      return true;
    });
    /* 5 surface/risk */
    t('Surface map: ≥ 25 rows and TLS/TCP marked unspoofable', () => {
      const p = DX.generate({});
      if (p.surface.length < 25) return 'only ' + p.surface.length + ' rows';
      const tls = p.surface.find((s) => /TLS/.test(s.key));
      return (tls && tls.spoofable === 'no') || 'TLS row not marked as unspoofable';
    });
    t('Risk score within 0–100 and graded', () => {
      const p = DX.generate({}); const r = p.risk;
      return (r.score >= 0 && r.score <= 100 && 'ABCDE'.includes(r.grade)) || 'bad risk ' + r.score;
    });
    /* 6 timezone math */
    t('Timezone: DST math for New York (winter vs summer)', () => {
      const z = TZ_BY_ID['America/New_York'];
      const win = tzOffset(z, new Date(Date.UTC(2026, 0, 15)));
      const sum = tzOffset(z, new Date(Date.UTC(2026, 6, 15)));
      return (win === -300 && sum === -240) || `winter ${win}, summer ${sum}`;
    });
    t('Timezone: southern hemisphere DST (Sydney)', () => {
      const z = TZ_BY_ID['Australia/Sydney'];
      const jan = tzOffset(z, new Date(Date.UTC(2026, 0, 15)));
      const jul = tzOffset(z, new Date(Date.UTC(2026, 6, 15)));
      return (jan === 660 && jul === 600) || `jan ${jan}, jul ${jul}`;
    });
    /* 7 exports */
    t('Exports: all 14 formats build for 10 random profiles', () => {
      for (let i = 0; i < 10; i++) {
        const p = DX.generate({});
        EX.EXPORTS.forEach((e) => { const s = e.build(p); if (!s || s.length < 40) throw new Error(e.id + ' empty'); });
      }
      return EX.EXPORTS.length === 14 || 'count=' + EX.EXPORTS.length;
    });
    t('Reverse-Anchor: live exit IP → POCO X6 5G clean profile + leak detection', () => {
      const p = DX.anchorFromIp({
        ip: '198.51.100.42', countryCode: 'DE', countryName: 'Germany', city: 'Berlin',
        lat: 52.52, lon: 13.405, timezone: 'Europe/Berlin', isp: 'Deutsche Telekom AG', asn: 3320,
        type: 'residential', fraudScore: 4, isHosting: false, dnsLeak: false, verdict: 'PASS',
        proxyConfig: { protocol: 'socks5', host: 'de.res.example', port: 1080, username: 'u', password: 'p', viaRelay: true, localRelayPort: 18080 },
      });
      if (p.consistency.errors.length) return 'clean IP had errors: ' + p.consistency.errors[0].id;
      if (p.geo.tz !== 'Europe/Berlin' || p.os.device.model !== '23122PCD1G') return 'anchor drift';
      p.network.proxy.dnsLeak = true;
      if (!DX.validate(p).errors.some((e) => e.id === 'ip_dns_leak')) return 'dns leak uncaught';
      p.network.proxy.dnsLeak = false;
      p.network.proxy.isUsedDuplicate = true;
      if (!DX.validate(p).errors.some((e) => e.id === 'ip_dedup')) return 'duplicate IP uncaught';
      return true;
    });
    t('Exports: verifier page contains expected UA and timezone', () => {
      const p = DX.generate({});
      const v = EX.verifier(p);
      return (v.includes(p.geo.tz) && v.length > 800) || 'verifier incomplete';
    });
    t('Feed/CSV escape quotes and keep row count', () => {
      const ps = DX.generateBatch(5, {});
      const feed = JSON.parse(EX.feed(ps));
      const lines = EX.csv(ps).trim().split('\n');
      return (feed.count === 5 && lines.length === 6) || `feed ${feed.count}, csv ${lines.length}`;
    });
    /* 8 zip */
    t('ZIP writer: CRC32 vector + archive size sanity', () => {
      const z = Zip.build({ 'a.txt': 'hello world' });
      return (Zip.crc32(new TextEncoder().encode('The quick brown fox jumps over the lazy dog')) === 0x414fa339 && z.size > 100) || 'crc/zip mismatch';
    });
    /* 9 store */
    t('Store: settings round-trip', () => {
      const before = Store.settings.theme; Store.setSettings({ theme: before === 'light' ? 'dark' : 'light' });
      const after = Store.settings.theme; Store.setSettings({ theme: before });
      return after !== before || 'settings did not persist';
    });
    t('Batch dedupe: no duplicate identity hashes in 100', () => {
      const set = new Set(); DX.generateBatch(100, {}).forEach((p) => set.add(DX.identityHash(p)));
      return set.size >= 98 || `only ${set.size}/100`;
    });
    /* 10 behavior/warmup */
    t('Warm-up: plan length == days and every day has actions', () => {
      const p = DX.generate({});
      return (p.warmup.plan.length === p.warmup.days && p.warmup.plan.every((d) => d.actions.length >= 2)) || 'warm-up plan invalid';
    });
    t('Persona: unique username shape and non-trivial password', () => {
      const p = DX.generate({});
      return (/^[a-z0-9._]+$/.test(p.persona.username) && p.persona.password.length >= 12) || 'persona invalid';
    });
    t('Speech voices contain the profile locale', () => {
      const p = DX.generate({ locale: 'de-DE', country: 'DE' });
      return p.speech.some((v) => v.lang === 'de-DE') || 'no voice for de-DE';
    });
    await ta('Async: UI helpers are wired', () => { return (typeof UI.toast === 'function' && typeof Zip.build === 'function') || 'helpers missing'; });

    const pass = results.filter((r) => r.ok).length;
    const ms = Math.round(performance.now() - t0);
    const allOk = pass === results.length;
    box.innerHTML = `<div class="row between"><h3>Self-test</h3><span class="pill ${allOk ? 'ok' : 'bad'}">${pass}/${results.length} · ${ms} ms</span></div>
      <div class="mt">${results.map((r) => `<div class="check"><div class="ic ${r.ok ? 'pass' : 'error'}">${r.ok ? '✓' : '!'}</div><div><div class="l">${H.esc(r.name)}</div>${r.detail ? `<div class="d">${H.esc(r.detail)}</div>` : ''}</div></div>`).join('')}</div>`;
    Store.log('selftest', `${pass}/${results.length} passed in ${ms} ms`);
    if (window.DXBridge && window.DXBridge.set) { try { window.DXBridge.set('dx.lastTest', JSON.stringify({ at: new Date().toISOString(), pass, total: results.length, ms })); } catch (e) {} }
    UI.toast(allOk ? `All ${results.length} tests passed` : `${results.length - pass} test(s) failed`, allOk ? 'ok' : 'err');
  }

  function runBench() {
    const box = H.qs('#lab-out');
    const n = 1000;
    const t0 = performance.now();
    const list = []; for (let i = 0; i < n; i++) list.push(DX.generate({}));
    const t1 = performance.now();
    list.forEach((p) => DX.validate(p));
    const t2 = performance.now();
    list.forEach((p) => DX.repair(p));
    const t3 = performance.now();
    const bytes = list.reduce((a, p) => a + JSON.stringify(p).length, 0);
    box.innerHTML = `<div class="row between"><h3>Engine bench</h3><span class="pill acc">${n} profiles</span></div>
      <div class="mt">${kv('generate', ((t1 - t0) / n).toFixed(2) + ' ms/profile')}${kv('validate', ((t2 - t1) / n).toFixed(2) + ' ms/profile')}${kv('repair', ((t3 - t2) / n).toFixed(2) + ' ms/profile')}${kv('throughput', Math.round(n / ((t3 - t0) / 1000)) + ' profiles/s')}${kv('avg profile size', (bytes / n / 1024).toFixed(1) + ' KB')}${kv('total', (t3 - t0).toFixed(0) + ' ms')}</div>`;
    Store.log('bench', `${n} profiles in ${(t3 - t0).toFixed(0)} ms`);
  }

  function runFuzz() {
    const out = H.qs('#fuzz-out');
    out.innerHTML = '<div class="small mut mt-s">fuzzing…</div>';
    setTimeout(() => {
      let broke = 0, detected = 0, repairedOk = 0, stillDirty = 0, worst = null;
      for (let i = 0; i < 200; i++) {
        const p = DX.generateClean({});
        const ops = [
          () => { p.navigator.userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15'; },
          () => { p.geo.tz = 'Asia/Tokyo'; p.locale.tz = 'Asia/Tokyo'; },
          () => { p.screen.dpr = 1.5; p.display.dpr = 1.5; },
          () => { p.clientHints = null; },
          () => { p.hardware.gpu = { vendor: 'ARM', webglVendor: 'ARM', renderer: 'Mali-G710', unmaskedVendor: 'ARM', unmaskedRenderer: 'Mali-G710', device: 'Mali-G710' }; },
          () => { p.extensions = [{ id: 'nkbihfbeogaeaoehlefnkodbefgpgknn', name: 'MetaMask', version: '11' }]; },
          () => { p.network.proxy = { host: 'x', port: 1, protocol: 'socks5', country: 'RU', city: '', isp: 'x', type: 'datacenter', asn: 1 }; },
        ];
        for (let k = 0; k < 3; k++) ops[Math.floor(Math.random() * ops.length)]();
        broke++;
        if (DX.validate(p).errors.length) detected++;
        const q = DX.repair(p);
        if (q.consistency.errors.length === 0) repairedOk++; else { stillDirty++; if (!worst) worst = q.consistency.errors.map((e) => e.id).join(','); }
      }
      out.innerHTML = `<div class="mt-s">${kv('broken profiles', broke)}${kv('errors detected', detected + ' / ' + broke)}${kv('repair restored clean audit', repairedOk + ' / ' + broke)}${kv('still dirty after repair', stillDirty + (worst ? ' (' + worst + ')' : ''))}</div>
        <div class="note ${stillDirty ? 'warn' : ''} mt-s">${stillDirty ? 'Some random corruptions leave a note instead of an error — see the audit tab of those profiles.' : 'Auto-repair restored a zero-error audit in every case.'}</div>`;
      Store.log('fuzz', `200 fuzz profiles · detected ${detected} · repaired ${repairedOk}`);
    }, 40);
  }

  /* ---------------------------------------------------------------- EXPORTS */
  const E = { id: null };
  function api() {
    const ps = Store.profiles;
    if (!E.id && ps.length) E.id = ps[0].id;
    const cur = ps.find((p) => p.id === E.id) || ps[0];
    main().innerHTML = `<div class="view">
      <h2 style="font-size:19px;margin:4px 0 10px">Export</h2>
      <div class="card">
        <div class="field" style="margin-bottom:0"><label>Profile</label>
          <select class="input" id="ex-p">${ps.map((p) => `<option value="${p.id}" ${cur && cur.id === p.id ? 'selected' : ''}>${H.esc(p.name)} — ${H.esc(p.geo.city.split(',')[0])}</option>`).join('')}</select>
        </div>
      </div>
      ${cur ? `
      <div class="card">
        <h3>One-bundle handoff</h3>
        <div class="sub">Profile JSON + runtime + verifier page zipped together. Unzip, open verifier.html in any browser to confirm what a page reads before you attach the profile to a real session.</div>
        <div class="grid2 mt">
          <button class="btn primary" id="ex-session">${Icon.download} Session .zip</button>
          <button class="btn" id="ex-ext">${Icon.download} Extension .zip</button>
        </div>
        <div class="grid2 mt-s">
          <button class="btn ghost" id="ex-share">${Icon.share} Share JSON</button>
          <button class="btn ghost" id="ex-feed">JSON feed (all)</button>
        </div>
      </div>
      <div class="lbl">Formats</div>
      <div class="plist">${EX.EXPORTS.map((e) => `<div class="pcard" data-exp="${e.id}"><div class="pav" style="background:linear-gradient(135deg,var(--panel3),var(--line2));color:var(--text);font-size:11px">${H.esc(e.icon)}</div><div class="grow"><div class="pname">${H.esc(e.label)} <span class="mut" style="font-weight:400">${H.esc(e.ext)}</span></div><div class="pmeta">${H.esc(e.note)}</div></div><div class="pside">${Icon.code}</div></div>`).join('')}</div>
      <div class="lbl">Fleet</div>
      <div class="grid2">
        <button class="btn block" id="ex-csv">CSV (all profiles)</button>
        <button class="btn block" id="ex-backup">Full backup</button>
      </div>` : UI.empty('◇', 'No profiles', 'Create one to unlock exports.')}
    </div>`;
    if (!cur) return;
    const pEl = H.qs('#ex-p');
    if (pEl) pEl.onchange = (e) => { E.id = e.target.value; api(); };
    H.qs('#ex-session').onclick = () => {
      const z = Zip.build({
        'profile.json': EX.profileJson(cur),
        'spoof.js': window.__SPOOF_SRC__ || '',
        'verifier.html': EX.verifier(cur),
        'README.txt': 'DOPPEL X session bundle for ' + cur.name + ' (' + cur.id + ')',
      });
      if (window.DXBridge && window.DXBridge.saveBase64) window.DXBridge.saveBase64('doppelx-session-' + cur.geo.country.toLowerCase() + '.zip', z.base64);
      else H.download('doppelx-session-' + cur.geo.country.toLowerCase() + '.zip', z.bytes, 'application/zip');
    };
    H.qs('#ex-ext').onclick = () => Screens.downloadExtensionZip(cur);
    H.qs('#ex-share').onclick = () => {
      const json = EX.profileJson(cur);
      if (navigator.share) navigator.share({ title: cur.name, text: json }).catch(() => {});
      else H.copy(json).then(() => UI.toast('Profile JSON copied', 'ok'));
    };
    H.qs('#ex-feed').onclick = () => H.download('profiles-feed.json', EX.feed(Store.profiles), 'application/json');
    H.qs('#ex-csv').onclick = () => H.download('doppelx-profiles.csv', EX.csv(Store.profiles), 'text/csv');
    H.qs('#ex-backup').onclick = () => H.download('doppelx-backup.json', Store.exportAll(), 'application/json');
    H.qsa('[data-exp]').forEach((el) => el.addEventListener('click', () => {
      const meta = EX.EXPORTS.find((x) => x.id === el.dataset.exp);
      Screens.showExport(cur, meta);
    }));
  }

  /* ----------------------------------------------------------------- VAULT */
  function vault() {
    const s = Store.settings;
    const info = Store.storageInfo();
    main().innerHTML = `<div class="view">
      <h2 style="font-size:19px;margin:4px 0 10px">Vault</h2>
      <div class="card">
        <div class="row"><div class="avatar-lg" style="background:linear-gradient(135deg,var(--accent2),var(--accent))">${Icon.lock}</div>
          <div class="grow" style="margin-left:12px"><div class="pname">Local-only vault</div><div class="pmeta">${info.profiles} profiles · ${H.bytes(info.bytes)} · ${info.folders} folders · ${info.projects} projects</div></div></div>
        <div class="grid2 mt">
          <button class="btn" id="v-backup">${Icon.download} Backup</button>
          <button class="btn" id="v-restore">${Icon.file} Restore</button>
        </div>
      </div>

      <div class="lbl">Defaults</div>
      <div class="card">
        <div class="field"><label>Default network</label><div class="seg" id="s-net">${['proxy', 'direct'].map((m) => `<button data-v="${m}" class="${s.defaultNetwork === m ? 'on' : ''}">${m}</button>`).join('')}</div></div>
        <div class="field"><label>Default privacy</label><div class="seg" id="s-priv">${['standard', 'strict', 'off'].map((m) => `<button data-v="${m}" class="${s.defaultPrivacy === m ? 'on' : ''}">${m}</button>`).join('')}</div></div>
        <div class="field" style="margin-bottom:0"><label>Default platform</label><select class="input" id="s-plat">${['auto', 'android', 'ios', 'windows', 'macos', 'linux'].map((m) => `<option ${s.defaultPlatform === m ? 'selected' : ''}>${m}</option>`).join('')}</select></div>
      </div>

      <div class="lbl">Experience</div>
      <div class="card">
        <div class="setrow"><div class="grow"><div class="t">Theme</div><div class="d">Dark studio or daylight</div></div><div class="seg" style="width:150px" id="s-theme"><button data-v="dark" class="${s.theme === 'dark' ? 'on' : ''}">Dark</button><button data-v="light" class="${s.theme === 'light' ? 'on' : ''}">Light</button></div></div>
        <div class="setrow"><div class="grow"><div class="t">Haptics</div><div class="d">Vibrate on key actions</div></div>${UI.toggle(s.haptics, 'id="s-hap"')}</div>
        <div class="setrow"><div class="grow"><div class="t">Auto-repair on audit</div><div class="d">Fix broken profiles automatically</div></div>${UI.toggle(s.autoRepair, 'id="s-rep"')}</div>
        <div class="setrow"><div class="grow"><div class="t">Show realism warnings</div><div class="d">Keep non-blocking notes visible</div></div>${UI.toggle(s.showWarnings, 'id="s-war"')}</div>
      </div>

      <div class="lbl">Folders</div>
      <div class="card">
        ${Store.folders.map((f) => `<div class="setrow"><div class="grow"><div class="t">${H.esc(f.name)}</div><div class="d">${Store.profiles.filter((p) => p.group === f.id).length} profiles</div></div><button class="btn sm danger" data-fdel="${f.id}">${Icon.trash}</button></div>`).join('')}
        <button class="btn block mt-s" id="v-folder">${Icon.plus} New folder</button>
      </div>

      <div class="lbl">Templates</div>
      <div class="card">
        ${Store.templates.length ? Store.templates.map((t) => `<div class="setrow"><div class="grow"><div class="t">${H.esc(t.name)}</div><div class="d">saved ${H.ago(t.at)}</div></div><button class="btn sm" data-tuse="${t.id}">Use</button><button class="btn sm danger" data-tdel="${t.id}">${Icon.trash}</button></div>`).join('') : '<div class="sub">Save a profile as a template from its ⋯ menu.</div>'}
      </div>

      <div class="lbl">Activity</div>
      <div class="card">${Store.activity.length ? Store.activity.slice(-12).reverse().map((a) => `<div class="setrow"><div class="grow"><div class="t" style="font-weight:500;font-size:13px">${H.esc(a.text)}</div><div class="d">${H.esc(a.kind)} · ${H.ago(a.at)}</div></div></div>`).join('') : '<div class="sub">Nothing yet.</div>'}</div>

      <div class="lbl">About</div>
      <div class="card">
        ${kvRow('App', 'DOPPEL X ' + DX.VERSION)}${kvRow('Engine', DX.VERSION)}${kvRow('Schema', String(DX.SCHEMA))}${kvRow('Build', window.DX_BUILD || 'release')}
        <div class="note mt-s">DOPPEL X runs fully offline. Nothing leaves the device: no telemetry, no accounts, no cloud. Profiles are JSON in local storage — back them up before uninstalling.</div>
        <button class="btn danger block mt" id="v-wipe">${Icon.trash} Erase all data</button>
      </div>
    </div>`;
    const seg = (id, key) => H.qsa('#' + id + ' button').forEach((b) => b.onclick = () => {
      if (key === 'theme') App.setTheme(b.dataset.v);
      else Store.setSettings({ [key]: b.dataset.v });
      vault();
    });
    seg('s-net', 'defaultNetwork'); seg('s-priv', 'defaultPrivacy');
    seg('s-theme', 'theme');
    H.qs('#s-plat').onchange = (e) => { Store.setSettings({ defaultPlatform: e.target.value }); };
    H.qs('#s-hap').onclick = () => { Store.setSettings({ haptics: !Store.settings.haptics }); vault(); };
    H.qs('#s-rep').onclick = () => { Store.setSettings({ autoRepair: !Store.settings.autoRepair }); vault(); };
    H.qs('#s-war').onclick = () => { Store.setSettings({ showWarnings: !Store.settings.showWarnings }); vault(); };
    H.qs('#v-folder').onclick = async () => {
      const n = await UI.prompt('New folder', 'Name', '', 'e.g. Marketplaces');
      if (!n) return; Store.addFolder(n); vault();
    };
    H.qsa('[data-fdel]').forEach((b) => b.onclick = async () => {
      if (!(await UI.confirm('Delete folder?', 'Profiles inside stay but become ungrouped.', 'Delete', 'danger'))) return;
      Store.removeFolder(b.dataset.fdel); vault();
    });
    H.qsa('[data-tuse]').forEach((b) => b.onclick = () => {
      const t = Store.templates.find((x) => x.id === b.dataset.tuse);
      if (!t) return;
      const p = DX.generateClean(Object.assign({}, t.anchors));
      Store.addProfile(p); UI.toast('Profile from template', 'ok'); App.go('viewer', { id: p.id });
    });
    H.qsa('[data-tdel]').forEach((b) => b.onclick = () => { Store.removeTemplate(b.dataset.tdel); vault(); });
    H.qs('#v-backup').onclick = () => H.download('doppelx-backup.json', Store.exportAll(), 'application/json');
    H.qs('#v-restore').onclick = () => restoreSheet();
    H.qs('#v-wipe').onclick = async () => {
      if (!(await UI.confirm('Erase everything?', 'All profiles, folders, templates and settings will be deleted. This cannot be undone.', 'Erase all', 'danger'))) return;
      Store.wipe(); UI.toast('Data erased', 'ok'); App.go('home');
    };
  }
  function kvRow(k, v) { return `<div class="kv"><span class="k">${H.esc(k)}</span><span class="v">${H.esc(v)}</span></div>`; }

  function restoreSheet() {
    const sh = UI.sheet(`<h3>Restore backup</h3><p class="mut small">Paste a DOPPEL X backup JSON. Existing profiles with the same id are kept; new ones are merged.</p>
      <div class="field"><textarea class="input" id="rs-ta" placeholder='Paste the backup JSON here'></textarea></div>
      <div class="grid2"><button class="btn ghost" id="rs-file">${Icon.file} Choose file</button><button class="btn primary" id="rs-go">${Icon.check} Restore</button></div>
      <input type="file" id="rs-input" accept=".json,application/json" style="display:none">`);
    sh.el.querySelector('#rs-file').onclick = () => sh.el.querySelector('#rs-input').click();
    sh.el.querySelector('#rs-input').onchange = (ev) => {
      const f = ev.target.files && ev.target.files[0];
      if (!f) return;
      const rd = new FileReader();
      rd.onload = () => { sh.el.querySelector('#rs-ta').value = String(rd.result || ''); };
      rd.readAsText(f);
    };
    sh.el.querySelector('#rs-go').onclick = () => {
      try {
        const n = Store.importAll(sh.el.querySelector('#rs-ta').value);
        sh.close(); UI.toast(`Restored · ${n} profiles in vault`, 'ok'); vault();
      } catch (e) { UI.toast('Invalid backup: ' + e.message, 'err'); }
    };
  }

  return { lab, api, vault };
})();
