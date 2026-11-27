/* ==========================================================================
   DOPPEL — 09-live.js
   LIVE DIAGNOSTICS  (راستی‌آزمایی واقعی، بدون ادعا)
   --------------------------------------------------------------------------
   این ماژول مقادیر «واقعیِ» مرورگری را که همین حالا در آن هستید می‌خواند
   (UA، تایم‌زون، رزولوشن، WebGL، فونت‌ها، Canvas hash، Audio hash، WebRTC leak،
   Device Memory، هسته‌ها، …) و آن را با پروفایل انتخاب‌شده مقایسه می‌کند.
   هیچ mock/جعلی در کار نیست: اگر جاوااسکریپت مرورگر مقدار را بدهد، اینجا
   دیده می‌شود. این تنها راه صادقانهٔ «راستی‌آزمایی» در یک وب‌اپ است.
   ========================================================================== */
'use strict';

const Live = (() => {
  const LV = { profileId: null, scan: null, busy: false };

  /* ------------------------------------------------ real-value collectors */
  function gl() {
    try {
      const c = document.createElement('canvas');
      c.width = 300; c.height = 64;
      const g = c.getContext('webgl') || c.getContext('experimental-webgl');
      if (!g) return { ok: false, vendor: '—', renderer: '—', maxTexture: '—' };
      const ext = g.getExtension('WEBGL_debug_renderer_info');
      const vendor = ext ? g.getParameter(ext.UNMASKED_VENDOR_WEBGL) : g.getParameter(g.VENDOR);
      const renderer = ext ? g.getParameter(ext.UNMASKED_RENDERER_WEBGL) : g.getParameter(g.RENDERER);
      return { ok: true, vendor, renderer, maxTexture: g.getParameter(g.MAX_TEXTURE_SIZE) };
    } catch (e) { return { ok: false, vendor: '—', renderer: '—', maxTexture: '—' }; }
  }

  function canvasHash() {
    try {
      const c = document.createElement('canvas');
      c.width = 240; c.height = 60;
      const ctx = c.getContext('2d');
      if (!ctx) return 'n/a';
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = 'rgba(102,204,0,0.7)';
      ctx.fillRect(0, 0, 120, 30);
      ctx.fillStyle = 'rgba(255,99,71,0.85)';
      ctx.font = '18px "Arial"';
      ctx.fillText('DOPPEL \( ◕‿◕ ) 2026', 6, 42);
      ctx.fillStyle = 'rgba(10,80,200,0.62)';
      ctx.font = 'bold 13px "Segoe UI", sans-serif';
      ctx.fillText('fingerprint·canvas·αβγ', 96, 22);
      ctx.beginPath(); ctx.arc(200, 40, 14, 0, Math.PI * 2); ctx.fillStyle = 'rgba(200,20,90,0.55)'; ctx.fill();
      const data = c.toDataURL();
      return U.fnv1a(data) + '-' + U.fnv1a(data.split('').reverse().join(''));
    } catch (e) { return 'error'; }
  }

  function audioHash() {
    return new Promise((resolve) => {
      try {
        const AC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
        if (!AC) return resolve('unsupported');
        const ctx = new AC(1, 44100, 44100);
        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.value = 10000;
        const comp = ctx.createDynamicsCompressor();
        osc.connect(comp); comp.connect(ctx.destination);
        osc.start(0);
        const started = Date.now();
        ctx.startRendering().then((buf) => {
          const d = buf.getChannelData(0);
          let sum = 0;
          for (let i = 4500; i < 5000; i++) sum += Math.abs(d[i]);
          resolve(U.fnv1a(sum.toFixed(12)) + ' ' + (sum * 1e6).toFixed(3));
        }).catch(() => resolve('error'));
        setTimeout(() => resolve('timeout'), 3000);
      } catch (e) { resolve('error'); }
    });
  }

  function webRTCLeak(timeout = 3000) {
    return new Promise((resolve) => {
      const out = { ips: [], publicIp: null, local: [], ms: 0 };
      try {
        const RTCPeerConnection = window.RTCPeerConnection || window.webkitRTCPeerConnection || window.mozRTCPeerConnection;
        if (!RTCPeerConnection) return resolve({ ...out, unsupported: true });
        const t0 = Date.now();
        const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
        pc.createDataChannel('d');
        const re = /([0-9]{1,3}(\.[0-9]{1,3}){3})/g;
        pc.onicecandidate = (ev) => {
          if (!ev.candidate) return;
          const found = String(ev.candidate.candidate).match(re) || [];
          found.forEach((ip) => {
            if (out.ips.includes(ip)) return;
            out.ips.push(ip);
            const priv = /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|127\.|0\.)/.test(ip);
            if (priv) out.local.push(ip); else out.publicIp = out.publicIp || ip;
          });
        };
        pc.createOffer().then((o) => pc.setLocalDescription(o)).catch(() => {});
        setTimeout(() => {
          out.ms = Date.now() - t0;
          try { pc.close(); } catch (e) {}
          resolve(out);
        }, timeout);
      } catch (e) { resolve({ ...out, error: String(e) }); }
    });
  }

  function fontProbe() {
    // detect a curated set of OS-signature fonts using width comparison
    const tests = ['Segoe UI', 'Calibri', 'Tahoma', 'Candara', 'MS Gothic', 'Helvetica Neue', 'Menlo', 'Lucida Grande', 'Apple Color Emoji', 'Roboto', 'Noto Sans', 'Ubuntu', 'DejaVu Sans', 'Liberation Sans', 'Arial', 'Verdana', 'Times New Roman', 'Courier New', 'Georgia'];
    const base = ['monospace', 'sans-serif', 'serif'];
    const probe = (font) => {
      const c = document.createElement('canvas'); const ctx = c.getContext('2d');
      const text = 'mmMwWLliI0O&1--□□ll';
      const out = [];
      for (const b of base) {
        ctx.font = `72px ${b}`;
        const w1 = ctx.measureText(text).width;
        ctx.font = `72px "${font}", ${b}`;
        const w2 = ctx.measureText(text).width;
        out.push(Math.abs(w1 - w2) > 0.1);
      }
      return out.some(Boolean);
    };
    const found = [];
    for (const f of tests) { try { if (probe(f)) found.push(f); } catch (e) {} }
    const sig = {
      mac: found.filter((f) => ['Helvetica Neue', 'Menlo', 'Lucida Grande', 'Apple Color Emoji'].includes(f)),
      win: found.filter((f) => ['Segoe UI', 'Calibri', 'Candara', 'MS Gothic'].includes(f)),
      linux: found.filter((f) => ['Ubuntu', 'DejaVu Sans', 'Liberation Sans'].includes(f)),
      android: found.filter((f) => ['Roboto', 'Noto Sans'].includes(f)),
    };
    const osGuess = sig.mac.length >= 2 ? 'macOS' : sig.win.length >= 2 ? 'Windows' : sig.android.length >= 2 && sig.linux.length < 2 ? 'Android' : sig.linux.length >= 1 ? 'Linux' : 'unknown';
    return { found, sig, osGuess };
  }

  function gpuVendorClass(renderer) {
    const r = String(renderer || '');
    if (/Adreno|Mali|PowerVR|Apple GPU|Xclipse/.test(r)) return 'mobile';
    if (/NVIDIA|Radeon|Intel|Direct3D|ANGLE \(.*D3D/.test(r)) return 'desktop';
    if (/ANGLE \(Apple|Metal/.test(r)) return 'mac';
    return 'generic';
  }

  /* the full real snapshot */
  async function collect() {
    const n = navigator;
    const uaData = n.userAgentData
      ? await n.userAgentData.getHighEntropyValues(['architecture', 'bitness', 'fullVersionList', 'model', 'platformVersion', 'uaFullVersion', 'formFactors'])
        .catch(() => null)
      : null;
    const [audio, rtc] = await Promise.all([audioHash(), webRTCLeak()]);
    const type = n.connection || n.mozConnection || n.webkitConnection;
    return {
      at: U.nowISO(),
      ua: n.userAgent,
      uaData: uaData ? {
        platform: n.userAgentData.platform,
        mobile: n.userAgentData.mobile,
        brands: (uaData.brands || []).map((b) => `${b.brand} ${b.version}`),
        fullVersionList: (uaData.fullVersionList || []).map((b) => `${b.brand} ${b.version}`),
        architecture: uaData.architecture, bitness: uaData.bitness,
        model: uaData.model, platformVersion: uaData.platformVersion, formFactors: uaData.formFactors,
      } : null,
      platform: n.platform, vendor: n.vendor,
      language: n.language, languages: (n.languages || []).slice(),
      languagesStr: (n.languages || []).join(', '),
      hardwareConcurrency: n.hardwareConcurrency, deviceMemory: n.deviceMemory ?? null,
      maxTouchPoints: n.maxTouchPoints, pdfViewerEnabled: n.pdfViewerEnabled ?? null,
      cookieEnabled: n.cookieEnabled, dnt: n.doNotTrack ?? null,
      gpc: n.globalPrivacyControl ?? null, webdriver: n.webdriver ?? false,
      screen: {
        w: screen.width, h: screen.height, aw: screen.availWidth, ah: screen.availHeight,
        iw: innerWidth, ih: innerHeight, dpr: devicePixelRatio,
        depth: screen.colorDepth, availLeft: screen.availLeft ?? null, availTop: screen.availTop ?? null,
      },
      tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
      tzOffset: new Date().getTimezoneOffset(),
      tzLocale: Intl.DateTimeFormat().resolvedOptions().locale,
      offsetMin: -new Date().getTimezoneOffset(),
      intlNow: new Intl.DateTimeFormat('en-US', { timeZoneName: 'longOffset' }).formatToParts(new Date()).find((p) => p.type === 'timeZoneName')?.value,
      dateStr: new Date().toString(),
      webgl: gl(),
      canvasHash: canvasHash(),
      audioHash: audio,
      fonts: fontProbe(),
      rtc,
      timezoneSupported: (() => { try { new Intl.DateTimeFormat('en-US', { timeZone: 'UTC' }); return true; } catch (e) { return false; } })(),
      colorScheme: matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
      reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
      connection: type ? { effectiveType: type.effectiveType, rtt: type.rtt, downlink: type.downlink, saveData: type.saveData, type: type.type || null } : null,
      plugins: Array.from(n.plugins || []).map((p) => p.name),
      mimeTypes: (n.mimeTypes || []).length,
      battery: await (n.getBattery ? n.getBattery().then((b) => ({ level: b.level, charging: b.charging })).catch(() => null) : Promise.resolve(null)),
      mediaDevices: (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices)
        ? await navigator.mediaDevices.enumerateDevices().then((d) => ({
          cameras: d.filter((x) => x.kind === 'videoinput').length,
          mics: d.filter((x) => x.kind === 'audioinput').length,
          speakers: d.filter((x) => x.kind === 'audiooutput').length,
        })).catch(() => null) : null,
      storage: (navigator.storage && navigator.storage.estimate) ? await navigator.storage.estimate().then((q) => q.quota || 0).catch(() => 0) : 0,
      doNotTrackAll: [n.doNotTrack, window.doNotTrack, navigator.msDoNotTrack].map((v) => String(v)),
    };
  }

  /* ------------------------------------------- compare real vs. profile */
  function compare(real, p) {
    if (!p) return { rows: [], score: 0 };
    const rows = [];
    const add = (label, want, got, match, sev, note = '') => rows.push({ label, want, got, match, sev, note });
    const soft = (label, want, got, note = '') => {
      const w = String(want).toLowerCase(), g = String(got).toLowerCase();
      add(label, want, got, w && g && (w === g || g.includes(w) || w.includes(g)), 'info', note);
    };

    // User-Agent
    add('User-Agent', p.navigator.userAgent, real.ua, real.ua === p.navigator.userAgent, 'high', 'باید بایت‌به‌بایت یکی باشد');
    // Client Hints
    if (p.clientHints && real.uaData) {
      add('CH platform', p.clientHints.platform, real.uaData.platform, String(real.uaData.platform) === String(p.clientHints.platform), 'high');
      add('CH platformVersion', p.clientHints.platformVersion, real.uaData.platformVersion, String(real.uaData.platformVersion) === String(p.clientHints.platformVersion), 'med');
      add('CH architecture', p.clientHints.architecture || '—', real.uaData.architecture || '—', String(real.uaData.architecture || '') === String(p.clientHints.architecture || ''), 'med');
      add('CH model', p.clientHints.model || '—', real.uaData.model || '—', String(real.uaData.model || '') === String(p.clientHints.model || ''), 'med', 'فقط اندروید مقدار دارد');
      const wantBrands = (p.clientHints.brands || []).map((b) => `${b.brand} ${b.version}`).join(' | ');
      const gotBrands = (real.uaData.brands || []).join(' | ');
      add('CH brands', wantBrands, gotBrands, wantBrands === gotBrands, 'low');
    } else if (p.clientHints && !real.uaData) {
      add('Client Hints', 'پروفایل UA-CH دارد', 'این مرورگر UA-CH ندارد', false, 'med');
    } else if (!p.clientHints && real.uaData) {
      add('Client Hints', 'null', 'مرورگر UA-CH دارد', false, 'high', 'پروفایل Firefox/Safari است ولی مرورگر فعلی Chromium است');
    }
    add('navigator.platform', p.navigator.platform, real.platform, real.platform === p.navigator.platform, 'high');
    add('زبان‌ها', (p.locale.languages || []).join(','), real.languagesStr.replace(/\s/g, ''), (p.locale.languages || []).join(',') === (real.languages || []).join(','), 'high');
    add('Timezone', p.geo.tz, real.tz, real.tz === p.geo.tz, 'critical');
    add('آفست دقیقه', p.geo.tzOffset, real.offsetMin, Number(real.offsetMin) === Number(p.geo.tzOffset), 'high');
    add('screen.width', p.screen.width, real.screen.w, +real.screen.w === +p.screen.width, 'med');
    add('screen.height', p.screen.height, real.screen.h, +real.screen.h === +p.screen.height, 'med');
    add('devicePixelRatio', p.display.dpr, real.screen.dpr, +real.screen.dpr === +p.display.dpr, 'med');
    add('innerWidth', p.display.innerWidth, real.screen.iw, Math.abs(real.screen.iw - p.display.innerWidth) <= 2, 'low', '±۲px تلورانس پنجره');
    add('colorDepth', p.display.colorDepth, real.screen.depth, +real.screen.depth === +p.display.colorDepth, 'low');
    add('WebGL renderer', p.hardware.gpu.renderer, real.webgl.renderer, String(real.webgl.renderer) === String(p.hardware.gpu.renderer), 'high');
    add('WebGL vendor', p.hardware.gpu.webglVendor, real.webgl.vendor, String(real.webgl.vendor) === String(p.hardware.gpu.webglVendor), 'med');
    add('maxTextureSize', '16384', real.webgl.maxTexture, +real.webgl.maxTexture === 16384, 'low');
    add('hardwareConcurrency', p.navigator.hardwareConcurrency, real.hardwareConcurrency, +real.hardwareConcurrency === +p.navigator.hardwareConcurrency, 'med');
    add('deviceMemory', p.navigator.deviceMemory, real.deviceMemory ?? '—', +real.deviceMemory === +p.navigator.deviceMemory, 'med', 'سقف API = 8');
    add('maxTouchPoints', p.navigator.maxTouchPoints, real.maxTouchPoints, +real.maxTouchPoints === +p.navigator.maxTouchPoints, 'med');
    add('Canvas hash', 'seed ' + p.fingerprint.canvasNoiseSeed, real.canvasHash, false, 'info', 'هش canvas واقعی؛ اجرای userscript باید آن را تغییر دهد');
    add('Audio hash', 'seed ' + p.fingerprint.audioSeed, real.audioHash, false, 'info');
    add('فونت‌های شناسایی‌شده', `${(p.fingerprint.fonts || []).length} فونت کاتالوگ`, `${real.fonts.found.length} مورد — حدس OS: ${real.fonts.osGuess}`, real.fonts.osGuess.toLowerCase().includes(p.os.platform === 'macos' ? 'mac' : p.os.platform === 'windows' ? 'win' : p.os.platform), 'high', 'فونت‌ها قوی‌ترین سیگنال OS هستند');
    add('WebRTC IPs', p.network.webrtc === 'disabled' ? 'بدون نشتی' : 'مجاز', real.rtc.ips.length ? real.rtc.ips.join(', ') : 'بدون candidate', !(real.rtc.publicIp && p.network.mode === 'proxy'), 'critical', 'IP عمومی در candidates = نشتی');
    add('Color scheme', p.display.prefersColorScheme, real.colorScheme, real.colorScheme === p.display.prefersColorScheme, 'low');
    add('Do Not Track', p.privacy.doNotTrack ? '1' : 'null', real.dnt, String(real.dnt) === String(p.privacy.doNotTrack ? '1' : null), 'low');
    add('PDF viewer', p.navigator.pdfViewerEnabled, real.pdfViewerEnabled, !!real.pdfViewerEnabled === !!p.navigator.pdfViewerEnabled, 'low');
    add('افزونه‌های گزارش‌شده', (p.extensions || []).length + ' مورد', real.plugins.length + ' PDF plugin', true, 'info', 'افزونه‌ها معمولاً از صفحه قابل‌شمارش نیستند مگر با probe خاص');
    return summarize(rows);
  }

  function summarize(rows) {
    const weight = { critical: 30, high: 12, med: 5, low: 1, info: 0 };
    let lost = 0, total = 0;
    rows.forEach((r) => { const w = weight[r.sev] || 0; total += w; if (!r.match) lost += w; });
    const score = total ? Math.max(0, Math.round(100 - (lost / total) * 100)) : 100;
    const fails = rows.filter((r) => !r.match && (r.sev === 'critical' || r.sev === 'high'));
    return { rows, score, fails };
  }

  /* -------------------------------------------------------------- render */
  function render() {
    const ps = Store.db.profiles;
    const p = ps.find((x) => x.id === LV.profileId) || ps[0] || null;
    const scan = LV.scan;
    const cmp = scan && p ? compare(scan, p) : null;
    const sel = `<select id="live-profile" class="mb10">${ps.length ? ps.map((x) => `<option value="${x.id}" ${p && x.id === p.id ? 'selected' : ''}>${H.esc(x.name)} — ${H.esc(x.geo.city)}</option>`).join('') : '<option>پروفایلی وجود ندارد</option>'}</select>`;

    const head = `<header class="page-h"><div><h1>${H.icon('beaker', 22)} آزمون زندهٔ مرورگر</h1>
      <p>مقادیر «واقعی» مرورگری که همین حالا در آن هستید با پروفایل انتخابی مقایسه می‌شود — بدون شبیه‌سازی. اگر می‌خواهید پروفایل را اجرا کنید، از تب «شبیه‌سازی اجرا» یا خروجی userscript/runner استفاده کنید و این صفحه را مجدداً همین‌جا باز کنید.</p></div></header>`;

    const actionBar = `<div class="live-bar">
      <div class="live-pick">${F.field('پروفایل مقایسه', sel)}</div>
      <button class="btn primary ${LV.busy ? 'busy' : ''}" data-action="live-scan" ${LV.busy ? 'disabled' : ''}>${H.icon('search', 15)}${LV.busy ? 'در حال اسکن…' : 'اسکن مرورگر فعلی'}</button>
      ${scan ? `<span class="muted">آخرین اسکن: ${H.rel(scan.at)}</span>` : '<span class="muted">هنوز اسکنی انجام نشده</span>'}
    </div>`;

    if (!scan) {
      return `<div class="page">${head}${actionBar}
        <div class="live-hint">
          ${F.card('این صفحه چه می‌کند؟', `<ol class="steps">
            <li>مقادیر واقعی مرورگر (UA، تایم‌زون، نمایشگر، WebGL، فونت، WebRTC، canvas/audio hash) را می‌خواند.</li>
            <li>انتظارِ پروفایل را با آن مقایسه می‌کند و هر اختلاف را با وزن ریسک گزارش می‌دهد.</li>
            <li>اگر اینجا همه‌چیز «قرمز» است، یعنی هنوز هیچ لایهٔ spoof در مرورگر فعلی فعال نیست — طبیعی است. بعد از نصب userscript یا اجرای runner دوباره اسکن کنید.</li>
          </ol>`, { icon: 'info' })}
          ${F.card('چرا این تنها آزمون صادقانه است', `<p class="prose">ابزارهایی که «permission score» ساختگی نشان می‌دهند، فقط داده‌های ورودی را به شما برمی‌گردانند. DOPPEL از مرورگر واقعی می‌خواند؛ پس نتیجه یا واقعیت است یا هیچ.</p>`, { icon: 'shield' })}
        </div>
      </div>`;
    }

    const s = scan;
    const riskPill = (sev) => sev === 'critical' ? H.pill('بحرانی', 'bad') : sev === 'high' ? H.pill('بالا', 'warn') : sev === 'med' ? H.pill('متوسط', 'ghost') : H.pill('کم', 'ok');

    const realCard = F.card('اسکن واقعی مرورگر', `
      ${F.kv([
        ['User-Agent', `<code class="break">${H.esc(s.ua)}</code>`],
        ['UA-CH platform', `<code>${s.uaData ? H.esc(s.uaData.platform) + ' ' + H.esc(s.uaData.platformVersion || '') : 'null'}</code>`],
        ['زبان / locale', `<code>${H.esc(s.languagesStr)} · ${H.esc(s.tzLocale)}</code>`],
        ['تایم‌زون', `<code>${H.esc(s.tz)} · offset ${s.offsetMin}min · ${H.esc(s.intlNow || '')}</code>`],
        ['نمایشگر', `${s.screen.w}×${s.screen.h} @${s.screen.dpr}x · avail ${s.screen.aw}×${s.screen.ah} · viewport ${s.screen.iw}×${s.screen.ih}`],
        ['WebGL', `<code class="break">${H.esc(s.webgl.renderer)}</code>`],
        ['Canvas hash', `<code>${H.esc(s.canvasHash)}</code>`],
        ['Audio hash', `<code>${H.esc(s.audioHash)}</code>`],
        ['هسته / حافظه', `${s.hardwareConcurrency} cores · ${s.deviceMemory ?? 'n/a'} GB · touch ${s.maxTouchPoints}`],
        ['فونت‌ها', `${s.fonts.found.length} شناسایی‌شده (${H.esc(s.fonts.osGuess)})`],
        ['WebRTC', s.rtc.publicIp ? `<b class="bad">IP عمومی ${H.esc(s.rtc.publicIp)}</b>` : (s.rtc.local.length ? `فقط LAN: ${H.esc(s.rtc.local.join(', '))}` : 'بدون candidate')],
        ['اتصال', s.connection ? `${H.esc(s.connection.effectiveType || '')} · rtt ${s.connection.rtt ?? '—'} · ${s.connection.downlink ?? '—'}Mbps` : 'n/a'],
        ['باتری', s.battery ? `${Math.round(s.battery.level * 100)}% ${s.battery.charging ? '· charging' : ''}` : 'n/a'],
      ])}`, { icon: 'eye' });

    const cmpCard = F.card('مقایسه با پروفایل', `
      ${p ? `<div class="live-score">
        ${H.scoreRing(cmp.score, 76, 6)}
        <div><b class="${cmp.score >= 90 ? 'ok' : cmp.score >= 65 ? 'warn' : 'bad'}">${cmp.score}٪ مطابقت واقعی</b>
        <span>${cmp.rows.filter((r) => r.match).length} از ${cmp.rows.length} سیگنال مطابق</span>
        <span>${cmp.fails.length} اختلاف مهم (critical/high)</span></div>
      </div>
      <div class="tbl-wrap"><table class="live-tbl">
        <thead><tr><th>سیگنال</th><th>انتظار پروفایل</th><th>واقعیت مرورگر</th><th>ریسک</th><th>وضعیت</th></tr></thead>
        <tbody>${cmp.rows.map((r) => `<tr class="${r.match ? 'same' : ''}">
          <td>${H.esc(r.label)}</td>
          <td><code class="break">${H.esc(String(r.want).slice(0, 90))}</code></td>
          <td><code class="break">${H.esc(String(r.got).slice(0, 90))}</code></td>
          <td>${riskPill(r.sev)}</td>
          <td>${r.match ? H.sevIcon('pass') : r.sev === 'info' ? H.sevIcon('info') : H.sevIcon(r.sev === 'critical' ? 'fail' : 'warn')}</td>
        </tr>`).join('')}</tbody>
      </table></div>
      <div class="notice mt12">${H.icon('info', 15)}<div>ردیف‌های «info» (canvas/audio hash) عمداً همیشه متفاوت‌اند: مقدار واقعی مرورگر باید با seed پروفایل فرق کند، وگرنه spoof کار نکرده است.</div></div>` : '<p class="muted">پروفایلی برای مقایسه وجود ندارد.</p>'}
    `, { icon: 'shield' });

    const probeCard = F.card('پروب مستقل (این裝置)', `
      <div class="chips">${s.fonts.found.map((f) => `<span class="chip sm">${H.esc(f)}</span>`).join('') || '<span class="muted tiny">هیچ فونت شاخصی شناسایی نشد</span>'}</div>
      <div class="notice warn mt12">${H.icon('alert', 15)}<div>این بخش «انگشت واقعی شما»ست. اگر پروفایل شما ادعای macOS دارد ولی اینجا فونت‌های Segoe UI/Calibri دیده می‌شوند، یعنی دستگاه ویندوزی است و هیچ پروفایلی نمی‌تواند این حقیقت را کامل پنهان کند مگر لایهٔ بومی‌شده (VM/بیلد پچ‌شده).</div></div>
    `, { icon: 'cpu' });

    return `<div class="page">${head}${actionBar}<div class="live-grid">${realCard}${cmpCard}${probeCard}</div></div>`;
  }

  async function scanNow() {
    if (LV.busy) return;
    LV.busy = true;
    UI.render();
    const t0 = performance.now();
    try {
      const real = await collect();
      LV.scan = real;
      const p = Store.db.profiles.find((x) => x.id === LV.profileId) || Store.db.profiles[0];
      if (p) LV.profileId = p.id;
      toast(`اسکن کامل شد در ${Math.round(performance.now() - t0)}ms`, 'ok');
    } catch (e) {
      console.error(e);
      toast('اسکن با خطا مواجه شد', 'bad');
    }
    LV.busy = false;
    UI.render();
  }

  Object.assign(UI.actions, {
    'live-scan'() { scanNow(); },
    'live-tab'() { UI.S.view = 'live'; UI.render(); },
  });

  document.addEventListener('change', (e) => {
    if (e.target.id === 'live-profile') { LV.profileId = e.target.value; UI.render(); }
  });

  return { render, scanNow, LV, collect, compare };
})();
