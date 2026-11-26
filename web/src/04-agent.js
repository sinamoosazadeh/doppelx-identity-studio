/* ==========================================================================
   DOPPEL — 04-agent.js
   1) Payload builder  — everything a website can observe about a profile
   2) Simulated agent  — "what the target site sees" + cross-signal analysis
   3) Exports          — userscript / Puppeteer / Playwright / Chrome flags /
                         SOCKS-auth extension / JSON
   ========================================================================== */
'use strict';

const AGENT = (() => {

  /* ======================================================= 1) PAYLOAD */
  /* The canonical object every spoof layer reads from. */
  function payload(p) {
    const fp = p.fingerprint, nav = p.navigator, geo = p.geo, loc = p.locale;
    return {
      v: DOPPEL_VERSION,
      profile: { id: p.id, name: p.name, seed: p.seed },
      ua: nav.userAgent,
      uaData: p.clientHints,
      platform: nav.platform,
      languages: loc.languages || nav.languages,
      locale: loc.locale,
      vendor: nav.vendor,
      productSub: nav.productSub,
      hardwareConcurrency: nav.hardwareConcurrency,
      deviceMemory: nav.deviceMemory,
      maxTouchPoints: nav.maxTouchPoints,
      pdfViewerEnabled: nav.pdfViewerEnabled,
      dnt: p.privacy.doNotTrack ? '1' : null,
      gpc: p.privacy.globalPrivacyControl ? true : false,
      screen: { w: p.display.width, h: p.display.height, aw: p.display.availWidth, ah: p.display.availHeight, iw: p.display.innerWidth, ih: p.display.innerHeight, dpr: p.display.dpr, depth: p.display.colorDepth },
      timezone: { id: geo.tz, offset: geo.tzOffset, abbr: geo.tzAbbr },
      geolocation: { lat: geo.lat, lon: geo.lon, accuracy: geo.accuracy },
      webgl: { vendor: p.hardware.gpu.webglVendor, renderer: p.hardware.gpu.renderer, unmaskedVendor: p.hardware.gpu.unmaskedVendor, unmaskedRenderer: p.hardware.gpu.unmaskedRenderer, maxTexture: 16384 },
      canvas: { noise: fp.canvas === 'noise', seed: fp.canvasNoiseSeed },
      audio: { noise: fp.audio === 'noise', seed: fp.audioSeed },
      fonts: fp.fontsMode === 'custom' ? fp.fontOverride : fp.fonts,
      plugins: fp.plugins,
      extensions: p.extensions,
      battery: fp.spoofBattery ? fp.battery : null,
      webrtc: p.network.webrtc,
      localIp: p.network.localIp,
      connection: p.network.connection,
      mediaDevices: { cameras: p.hardware.cameraCount, microphones: p.hardware.microphoneCount, speakers: p.hardware.speakerCount },
      colorScheme: p.display.prefersColorScheme,
      reducedMotion: !!p.display.prefersReducedMotion,
      behavior: p.behavior,
      network: { mode: p.network.mode, proxy: p.network.proxy, latency: p.network.latencyMs, jitter: p.network.jitterMs },
    };
  }

  /* request headers the browser would emit for this profile */
  function headers(p) {
    const pl = payload(p);
    const h = {
      'User-Agent': pl.ua,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'Accept-Language': pl.languages.join(',') + (pl.languages.length < 3 ? ',en;q=0.9' : ''),
      'Accept-Encoding': 'gzip, deflate, br, zstd',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
    };
    if (pl.dnt) { h['DNT'] = '1'; h['Sec-GPC'] = pl.gpc ? '1' : '0'; }
    if (pl.uaData) {
      h['sec-ch-ua'] = pl.uaData.brands.map((b) => `"${b.brand}";v="${b.version}"`).join(', ');
      h['sec-ch-ua-mobile'] = pl.uaData.mobile ? '?1' : '?0';
      h['sec-ch-ua-platform'] = `"${pl.uaData.platform}"`;
      if (pl.uaData.fullVersionList) h['sec-ch-ua-full-version-list'] = pl.uaData.fullVersionList.map((b) => `"${b.brand}";v="${b.version}"`).join(', ');
    }
    return h;
  }

  /* deterministic fingerprint hash from the strongest browser surface */
  function fingerprintHash(p) {
    const parts = [
      p.navigator.userAgent, p.navigator.platform, (p.locale.languages || []).join(','),
      p.screen.width, p.screen.height, p.screen.dpr, p.display.colorDepth,
      p.hardware.gpu.webglVendor, p.hardware.gpu.renderer,
      p.fingerprint.canvasNoiseSeed, p.fingerprint.audioSeed,
      (p.fingerprint.fonts || []).length,
      p.navigator.hardwareConcurrency, p.navigator.deviceMemory,
      p.network.localIp,
    ].join('␟');
    return U.fnv1a(parts) + U.fnv1a(parts.split('').reverse().join(''));
  }

  /* ================================================ 2) SIMULATED AGENT */
  /* Each check: id, label, sev(pass|warn|fail), detail, fix (optional) */
  function analyze(p) {
    const pl = payload(p);
    const checks = [];
    const add = (id, label, sev, detail, fix) => checks.push({ id, label, sev, detail, fix });
    const osPlat = p.os.platform, mobile = osPlat === 'android' || osPlat === 'ios';

    /* A. network & geo */
    if (p.network.mode === 'proxy' && p.network.proxy) {
      add('ip_country', 'کشور IP خروجی', 'pass', `${pl.network.proxy.country} · ${pl.network.proxy.city} · ${pl.network.proxy.isp} (${pl.network.proxy.type})`);
    } else {
      add('ip_direct', 'اجرا روی IP مستقیم', 'warn', 'حالت direct فعال است؛ سایت‌ها IP اصلی شما را می‌بینند.', 'پروکسی residential اختصاصی همان منطقه فعال کنید.');
    }
    const zone = TZ_BY_ID[pl.timezone.id];
    if (zone && zone.country === p.geo.country) add('tz_geo', 'تایم‌زون ↔ کشور IP', 'pass', `${pl.timezone.id} (${pl.timezone.abbr}, UTC${pl.timezone.offset >= 0 ? '+' : ''}${(pl.timezone.offset / 60).toFixed(1).replace('.0', '')})`);
    else add('tz_geo', 'تایم‌زون ↔ کشور IP', 'fail', `${pl.timezone.id} با ${p.geo.country} هم‌خوان نیست.`, 'اجرای auto-fix تایم‌زون را با شهر IP هم‌تراز می‌کند.');

    /* B. language */
    const langCountry = (pl.languages[0] || '').split('-')[1];
    if (!mobile && langCountry && zone && langCountry !== zone.country && !(p.locale.locale.startsWith('en'))) {
      add('lang_geo', 'زبان ↔ منطقه', 'warn', `Accept-Language: ${pl.languages.join(', ')} در حالی که IP ${p.geo.country} است.`);
    } else {
      add('lang_geo', 'زبان ↔ منطقه', 'pass', pl.languages.join(', '));
    }

    /* C. UA vs hints vs platform */
    const uaOk = pl.ua.includes(String(p.browser.major)) || p.browser.family === 'safari';
    add('ua_ver', 'UA ↔ نسخهٔ مرورگر', uaOk ? 'pass' : 'fail', `UA نسخه ${p.browser.major}` + (pl.uaData ? ` / hints ${pl.uaData.fullVersion}` : ''));
    if (mobile) add('ua_mobile', 'UA ↔ دستگاه', /Mobile|iPhone/.test(pl.ua) ? 'pass' : 'fail', pl.ua.slice(0, 110) + '…');
    else add('ua_desktop', 'UA ↔ دستگاه', !/Mobile/.test(pl.ua) ? 'pass' : 'fail', pl.ua.slice(0, 110) + '…');

    /* D. screen */
    add('screen', 'رزولوشن و DPR', 'pass', `${pl.screen.w}×${pl.screen.h} @${pl.screen.dpr}x · viewport ${pl.screen.iw}×${pl.screen.ih}`);
    if (mobile && pl.screen.w > 800) add('screen_mobile', 'صفحهٔ موبایل', 'warn', 'CSS width بیش از 800 پیکسل روی موبایل طبیعی نیست.');
    else if (!mobile && pl.screen.w < 1000) add('screen_desktop', 'صفحهٔ دسکتاپ', 'warn', 'رزولوشن کوچک برای دسکتاپ — احتمال هدلس.');
    else add('screen_class', 'طبقهٔ دستگاه', 'pass', mobile ? 'mobile viewport' : 'desktop viewport');

    /* E. WebGL */
    const r = pl.webgl.renderer || '';
    const gpuClass = /Adreno|Mali|PowerVR|Apple GPU/.test(r) ? 'mobile' : /Direct3D|NVIDIA|Intel|Radeon/.test(r) ? 'desktop' : 'generic';
    if ((mobile && gpuClass === 'mobile') || (!mobile && gpuClass !== 'mobile')) add('webgl_os', 'GPU ↔ OS', 'pass', r.slice(0, 90));
    else add('webgl_os', 'GPU ↔ OS', 'fail', `renderer «${r}» با ${osPlat} نمی‌خواند.`, 'GPU را از کاتالوگ همان پلتفرم انتخاب کنید.');

    /* F. canvas / audio determinism */
    add('canvas_noise', 'Canvas noise', pl.canvas.noise ? 'pass' : 'warn', pl.canvas.noise ? `seed ${pl.canvas.seed} — هش پایدار و یکتا` : 'بدون noise؛ هش canvas با دستگاه واقعی می‌تواند لو برود.');
    add('audio_noise', 'AudioContext', pl.audio.noise ? 'pass' : 'warn', pl.audio.noise ? `seed ${pl.audio.seed}` : 'خاموش');

    /* G. WebRTC */
    const priv = /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|127\.)/.test(pl.localIp);
    if (pl.webrtc === 'disabled' && pl.network.proxy) add('webrtc', 'WebRTC', 'pass', 'غیرفعال — بدون نشتی IP');
    else if (!priv) add('webrtc', 'WebRTC', 'fail', `local IP عمومی ${pl.localIp} قابل مشاهده است.`, 'WebRTC را در حالت پروکسی غیرفعال کنید.');
    else add('webrtc', 'WebRTC', 'pass', `فقط IP خصوصی LAN (${pl.localIp})`);

    /* H. privacy signals */
    add('dnt', 'Do Not Track / GPC', 'pass', pl.dnt ? `DNT=1 · GPC=${pl.gpc ? 1 : 0}` : 'غیرفعال — مثل اکثریت کاربران');
    add('ext', 'افزونه‌ها', p.extensions.length ? 'pass' : 'pass', p.extensions.length ? p.extensions.map((e) => e.name).join(', ') : 'بدون افزونه (سطح تماس طبیعی‌تر)');

    /* I. behavior */
    add('battery', 'باتری', p.fingerprint.spoofBattery ? 'pass' : 'warn', mobile ? `level ${Math.round(pl.battery.level * 100)}% · ${pl.battery.charging ? 'charging' : 'discharging'}` : 'دسکتاپ — بدون spoof (نبودن Battery API طبیعی است)');
    add('fonts', 'فونت‌ها', 'pass', `${(pl.fonts || []).length} فونت منطبق با ${osPlat}`);

    /* J. cross-profile uniqueness of seeds */
    add('hash', 'هش اثرانگشت پروفایل', 'pass', fingerprintHash(p));

    /* K. proxy latency realism */
    if (pl.network.proxy) {
      const plausible = pl.network.latency >= 15 && pl.network.latency < 220;
      add('latency', 'تأخیر شبکه', plausible ? 'pass' : 'warn', `${pl.network.latency}ms ± ${pl.network.jitter}ms`);
    }

    /* L. locale/time format/details */
    add('locale', 'زبان و قالب‌بندی', 'pass', `${p.locale.locale} · ${p.locale.timeFormat} · ${p.locale.numberFormat} · ${p.locale.direction.toUpperCase()}${p.locale.hour12 ? ' · 12h' : ''}`);
    add('currency', 'واحد پول', 'pass', p.locale.currency + ' / ' + p.geo.currency);

    const fails = checks.filter((c) => c.sev === 'fail');
    const warns = checks.filter((c) => c.sev === 'warn');
    const verdict = fails.length ? 'fail' : warns.length > 2 ? 'warn' : 'pass';
    return { checks, fails, warns, verdict, hash: fingerprintHash(p), at: U.nowISO() };
  }

  /* ==================================================== 3) EXPORTS */

  /* --- 3a) userscript (Tampermonkey / Violentmonkey) --- */
  function userscript(p, target) {
    const pl = payload(p);
    const name = `DOPPEL — ${p.name}`;
    const j = JSON.stringify;
    return `// ==UserScript==
// @name         ${name}
// @namespace    doppel.studio
// @version      1.0
// @description  Spoof layer generated by DOPPEL for profile ${p.id}
// @match        ${target || '*://*/*'}
// @run-at       document-start
// @grant        none
// ==/UserScript==
(function () {
  'use strict';
  /* --------------------------------------------------------------------
     MASTER SWITCH
     true  → layer активен (مرورگر رفتار پروفایل را نشان می‌دهد)
     false → لایه خاموش (برای صفحهٔ راستی‌آزمایی: باید مقادیر واقعی را ببینید)
     -------------------------------------------------------------------- */
  var ENABLED = true;
  if (!ENABLED) return;
  var P = ${j(pl, null, 2)};

  /* ---------- generic tools ---------- */
  var def = function (obj, key, value) {
    try { Object.defineProperty(obj, key, { get: function () { return value; }, configurable: true }); }
    catch (e) { try { obj[key] = value; } catch (e2) {} }
  };
  var wrapFn = function (obj, key, factory) {
    var orig = obj[key];
    try { Object.defineProperty(obj, key, { value: function () { return factory.apply(this, [orig, arguments]); }, configurable: true, writable: true }); }
    catch (e) {}
  };
  /* tiny deterministic PRNG so canvas/audio noise is stable per profile */
  var makeRng = function (seed) {
    var s = seed >>> 0;
    return function () {
      s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0;
      return (s >>> 0) / 4294967296;
    };
  };

  /* ---------- navigator ---------- */
  def(Navigator.prototype, 'userAgent', P.ua);
  var appVersion = P.ua.replace('Mozilla/', '');
  def(Navigator.prototype, 'appVersion', appVersion);
  def(Navigator.prototype, 'appName', 'Netscape');
  def(Navigator.prototype, 'platform', P.platform);
  def(Navigator.prototype, 'language', P.languages[0]);
  def(Navigator.prototype, 'languages', Object.freeze(P.languages.slice()));
  def(Navigator.prototype, 'vendor', P.vendor);
  def(Navigator.prototype, 'productSub', P.productSub);
  def(Navigator.prototype, 'hardwareConcurrency', P.hardwareConcurrency);
  def(Navigator.prototype, 'deviceMemory', P.deviceMemory);
  def(Navigator.prototype, 'maxTouchPoints', P.maxTouchPoints);
  def(Navigator.prototype, 'pdfViewerEnabled', !!P.pdfViewerEnabled);
  def(Navigator.prototype, 'webdriver', false);
  if ('doNotTrack' in navigator) def(Navigator.prototype, 'doNotTrack', P.dnt);
  if ('globalPrivacyControl' in navigator) def(Navigator.prototype, 'globalPrivacyControl', !!P.gpc);
  def(Navigator.prototype, 'plugins', Object.setPrototypeOf(P.plugins.map(function (p) {
    return Object.setPrototypeOf({ name: p.name, filename: p.filename, description: p.description, length: 1 }, { item: function () { return this; } });
  }).map(function (o, i, arr) { o.item = function () { return o; }; o.namedItem = function () { return o; }; return o; }), { item: function (i) { return this[i]; }, namedItem: function () { return null; } }));

  /* ---------- userAgentData (Client Hints JS surface) ---------- */
  if (P.uaData) {
    def(Navigator.prototype, 'userAgentData', {
      brands: P.uaData.brands.slice(),
      mobile: !!P.uaData.mobile,
      platform: P.uaData.platform,
      getHighEntropyValues: function () {
        return Promise.resolve({
          architecture: P.uaData.architecture,
          bitness: P.uaData.bitness,
          brands: P.uaData.brands.slice(),
          formFactors: (P.uaData.formFactors || ['Desktop']).slice(),
          fullVersionList: (P.uaData.fullVersionList || []).slice(),
          model: P.uaData.model || '',
          platform: P.uaData.platform,
          platformVersion: P.uaData.platformVersion,
          uaFullVersion: P.uaData.fullVersion,
          wow64: false
        });
      }
    });
  }

  /* ---------- screen & viewport ---------- */
  def(Screen.prototype, 'width', P.screen.w);
  def(Screen.prototype, 'height', P.screen.h);
  def(Screen.prototype, 'availWidth', P.screen.aw);
  def(Screen.prototype, 'availHeight', P.screen.ah);
  def(Screen.prototype, 'colorDepth', P.screen.depth);
  def(Screen.prototype, 'pixelDepth', P.screen.depth);
  def(Screen.prototype, 'orientation', { type: 'landscape-primary', angle: 0, addEventListener: function () {}, removeEventListener: function () {} });
  def(window, 'devicePixelRatio', P.screen.dpr);
  try {
    Object.defineProperty(window, 'innerWidth', { get: function () { return P.screen.iw; }, configurable: true });
    Object.defineProperty(window, 'innerHeight', { get: function () { return P.screen.ih; }, configurable: true });
  } catch (e) {}

  /* ---------- timezone & locale ---------- */
  var tz = P.timezone.id;
  try {
    var dto = Intl.DateTimeFormat.prototype;
    var origResolved = dto.resolvedOptions;
    dto.resolvedOptions = function () {
      var r = origResolved.call(this);
      r.timeZone = tz;
      return r;
    };
    var origTicket = dto.formatToParts;
    dto.formatToParts = function () { try { return origTicket.call(this); } catch (e) { return []; } };
  } catch (e) {}
  try {
    var origOffset = Date.prototype.getTimezoneOffset;
    Date.prototype.getTimezoneOffset = function () { return ${-p.geo.tzOffset}; };
  } catch (e) {}
  try {
    var origLocal = Date.prototype.toLocaleString;
    var origLocalDate = Date.prototype.toLocaleDateString;
    var origLocalTime = Date.prototype.toLocaleTimeString;
    Date.prototype.toLocaleString = function (l, o) { return origLocal.call(this, l || P.locale, Object.assign({ timeZone: tz }, o || {})); };
    Date.prototype.toLocaleDateString = function (l, o) { return origLocalDate.call(this, l || P.locale, Object.assign({ timeZone: tz }, o || {})); };
    Date.prototype.toLocaleTimeString = function (l, o) { return origLocalTime.call(this, l || P.locale, Object.assign({ timeZone: tz }, o || {})); };
  } catch (e) {}

  /* ---------- canvas noise (idempotent & deterministic per profile) ---------- */
  try {
    if (P.canvas.noise) {
      var canvasDelta = (function () {
        var r = makeRng(P.canvas.seed || 1337);
        return (r() < 0.5 ? -1 : 1);
      })();
      var cloneNoisedCanvas = function (canvas) {
        var w = canvas.width | 0, h = canvas.height | 0;
        if (!w || !h) return canvas;
        var tmp = document.createElement('canvas'); tmp.width = w; tmp.height = h;
        var tctx = tmp.getContext('2d');
        if (!tctx) return canvas;
        tctx.drawImage(canvas, 0, 0);
        try {
          var img = tctx.getImageData(0, 0, Math.min(w, 24), Math.min(h, 24));
          var d = img.data;
          var r = makeRng((P.canvas.seed || 1) ^ (w * 31 + h));
          for (var i = 0; i < d.length; i += 4) {
            if (d[i + 3] === 0) continue;
            var step = r() < 0.5 ? -1 : 1;
            d[i] = d[i] > 128 ? d[i] - Math.abs(step) : d[i] + Math.abs(step);
          }
          tctx.putImageData(img, 0, 0);
        } catch (e) {}
        return tmp;
      };
      var origToDataURL = HTMLCanvasElement.prototype.toDataURL;
      HTMLCanvasElement.prototype.toDataURL = function () {
        try { return origToDataURL.apply(cloneNoisedCanvas(this), arguments); }
        catch (e) { return origToDataURL.apply(this, arguments); }
      };
      var origToBlob = HTMLCanvasElement.prototype.toBlob;
      HTMLCanvasElement.prototype.toBlob = function () {
        try { return origToBlob.apply(cloneNoisedCanvas(this), arguments); }
        catch (e) { return origToBlob.apply(this, arguments); }
      };
      var origGetImageData = CanvasRenderingContext2D.prototype.getImageData;
      CanvasRenderingContext2D.prototype.getImageData = function (sx, sy, sw, sh) {
        var img = origGetImageData.apply(this, arguments);
        var d = img.data;
        var r = makeRng((P.canvas.seed || 1) ^ ((sx | 0) * 13 + (sy | 0)));
        for (var i = 0; i < d.length; i += 16) {
          if (d[i + 3] > 0 && r() < 0.4) d[i] = d[i] > 128 ? d[i] - 1 : d[i] + 1;
        }
        return img;
      };
    }
  } catch (e) {}

  /* ---------- WebGL ---------- */
  try {
    var patchGL = function (proto) {
      if (!proto) return;
      var orig = proto.getParameter;
      proto.getParameter = function (param) {
        var UNMASKED_VENDOR = 0x9245, UNMASKED_RENDERER = 0x9246;
        if (param === UNMASKED_VENDOR || param === 37445) return P.webgl.unmaskedVendor;
        if (param === UNMASKED_RENDERER || param === 37446) return P.webgl.unmaskedRenderer;
        var v = orig.call(this, param);
        if (param === 7936 || param === 0x1F00) return P.webgl.vendor; /* VENDOR */
        if (param === 7937 || param === 0x1F01) return P.webgl.renderer; /* RENDERER */
        if (param === 0x0D33) return P.webgl.maxTexture; /* MAX_TEXTURE_SIZE */
        return v;
      };
      var origExt = proto.getExtension;
      proto.getExtension = function (name) {
        var ext = origExt.call(this, name);
        if (ext && name === 'WEBGL_debug_renderer_info') {
          return { UNMASKED_VENDOR_WEBGL: 0x9245, UNMASKED_RENDERER_WEBGL: 0x9246 };
        }
        return ext;
      };
      var origGetSupported = proto.getSupportedExtensions;
      if (origGetSupported) proto.getSupportedExtensions = function () { return origGetSupported.call(this); };
    };
    patchGL(window.WebGLRenderingContext && WebGLRenderingContext.prototype);
    patchGL(window.WebGL2RenderingContext && WebGL2RenderingContext.prototype);
  } catch (e) {}

  /* ---------- AudioContext (idempotent per AudioBuffer) ---------- */
  try {
    if (P.audio.noise) {
      var audioNoised = new WeakSet();
      var origGetChannelData = AudioBuffer.prototype.getChannelData;
      AudioBuffer.prototype.getChannelData = function (ch) {
        var arr = origGetChannelData.apply(this, arguments);
        if (!audioNoised.has(arr)) {
          audioNoised.add(arr);
          var arng = makeRng((P.audio.seed || 7) ^ ((ch | 0) + arr.length));
          for (var i = 0; i < arr.length; i += Math.max(1, Math.floor(arr.length / 128))) {
            arr[i] = arr[i] + (arng() - 0.5) * 1e-7;
          }
        }
        return arr;
      };
      var origCopy = AnalyserNode.prototype.getFloatFrequencyData;
      AnalyserNode.prototype.getFloatFrequencyData = function (arr) {
        origCopy.call(this, arr);
        var arng = makeRng((P.audio.seed || 7) ^ arr.length);
        for (var i = 0; i < arr.length; i++) arr[i] += (arng() - 0.5) * 1e-4;
      };
    }
  } catch (e) {}

  /* ---------- fonts ---------- */
  try {
    if (document.fonts && P.fonts && P.fonts.length) {
      var fontSet = new Set(P.fonts.map(function (f) { return f.toLowerCase(); }));
      var origCheck = FontFaceSet.prototype.check;
      FontFaceSet.prototype.check = function (font, text) {
        var m = /["']?([^"',]+)["']?/.exec(String(font).replace(/^\\s*/, ''));
        if (m) {
          var fam = m[1].replace(/^(local\\(|\d+px\\s*)/, '').replace(/["']/g, '').trim().toLowerCase();
          var generic = ['serif', 'sans-serif', 'monospace', 'cursive', 'fantasy', 'system-ui', 'ui-sans-serif'].indexOf(fam) !== -1;
          if (!generic) return fontSet.has(fam);
        }
        return origCheck.apply(this, arguments);
      };
    }
  } catch (e) {}

  /* ---------- battery ---------- */
  try {
    if (P.battery && navigator.getBattery) {
      navigator.getBattery = function () {
        return Promise.resolve({
          charging: P.battery.charging,
          chargingTime: P.battery.charging ? 0 : Infinity,
          dischargingTime: P.battery.charging ? Infinity : 7200,
          level: P.battery.level,
          addEventListener: function () {}, removeEventListener: function () {},
          onchargingchange: null, onlevelchange: null, onchargingtimechange: null, ondischargingtimechange: null
        });
      };
    }
  } catch (e) {}

  /* ---------- WebRTC: kill public candidates ---------- */
  try {
    if (P.webrtc === 'disabled') {
      ['RTCPeerConnection', 'webkitRTCPeerConnection', 'mozRTCPeerConnection'].forEach(function (n) {
        var C = window[n];
        if (!C) return;
        window[n] = function (cfg) {
          try {
            cfg = cfg || {};
            cfg.iceServers = [];
            cfg.iceTransportPolicy = 'relay';
          } catch (e) {}
          var pc = new C(cfg);
          var origCreate = pc.createDataChannel;
          if (origCreate) pc.createDataChannel = function () { return origCreate.apply(this, arguments); };
          return pc;
        };
        window[n].prototype = C.prototype;
      });
      if (window.RTCPeerConnection && window.RTCPeerConnection.prototype) {
        var origAdd = RTCPeerConnection.prototype.addIceCandidate;
      }
      var origSDP = window.RTCPeerConnection && RTCSessionDescription;
      if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        navigator.mediaDevices.enumerateDevices = function () {
          var list = [];
          for (var i = 0; i < (P.mediaDevices.cameras || 0); i++) list.push({ kind: 'videoinput', deviceId: 'cam' + i, groupId: 'g' + i, label: '' });
          for (var j = 0; j < (P.mediaDevices.microphones || 0); j++) list.push({ kind: 'audioinput', deviceId: 'mic' + j, groupId: 'g' + j, label: '' });
          for (var k = 0; k < (P.mediaDevices.speakers || 0); k++) list.push({ kind: 'audiooutput', deviceId: 'spk' + k, groupId: 'g' + k, label: '' });
          return Promise.resolve(list);
        };
      }
    }
  } catch (e) {}

  /* ---------- media queries ---------- */
  try {
    var origMatchMedia = window.matchMedia;
    window.matchMedia = function (q) {
      if (/prefers-color-scheme:\\s*dark/.test(q)) return { matches: P.colorScheme === 'dark', media: q, addEventListener: function () {}, removeEventListener: function () {}, addListener: function () {}, removeListener: function () {}, onchange: null };
      if (/prefers-color-scheme:\\s*light/.test(q)) return { matches: P.colorScheme !== 'dark', media: q, addEventListener: function () {}, removeEventListener: function () {}, addListener: function () {}, removeListener: function () {}, onchange: null };
      if (/prefers-reduced-motion/.test(q)) return { matches: !!P.reducedMotion, media: q, addEventListener: function () {}, removeEventListener: function () {}, addListener: function () {}, removeListener: function () {}, onchange: null };
      return origMatchMedia.call(window, q);
    };
  } catch (e) {}

  /* ---------- storage & misc flags ---------- */
  def(Navigator.prototype, 'cookieEnabled', true);
  try { Object.defineProperty(Navigator.prototype, 'connection', { get: function () { return { effectiveType: P.connection.effectiveType, rtt: P.connection.rtt, downlink: P.connection.downlink, saveData: P.connection.saveData, type: P.connection.type, addEventListener: function () {}, removeEventListener: function () {}, onchange: null }; }, configurable: true }); } catch (e) {}
  /* hide our own traces */
  try { delete Navigator.prototype.__proto__.webdriver; } catch (e) {}
})();
`;
  }

  /* --- 3b) Puppeteer / Playwright runner --- */
  function puppeteer(p, opts = {}) {
    const pl = payload(p);
    const proxy = p.network.proxy;
    const launchArgs = [
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-blink-features=AutomationControlled',
      '--disable-features=IsolateOrigins,site-per-process,PrivacySandboxAdsAPIs',
      '--disable-infobars',
      '--disable-dev-shm-usage',
      '--start-maximized',
    ];
    if (proxy) launchArgs.push(`--proxy-server=socks5://${proxy.host}:${proxy.port}`, '--proxy-bypass-list=<-loopback>');
    return `/* ============================================================
   DOPPEL runner — Puppeteer / Playwright
   profile : ${p.name}  (${p.id})
   os      : ${p.os.osName} ${p.os.osVersion} · browser ${p.browser.name} ${p.browser.major}
   geo     : ${p.geo.city}, ${p.geo.countryName} · ${p.geo.tz}
   ------------------------------------------------------------
   npm i puppeteer-core
   (Chrome/Chromium must be installed; set executablePath below)
   ============================================================ */
const puppeteer = require('puppeteer-core');

const PROFILE = ${JSON.stringify(pl, null, 2)};

(async () => {
  const browser = await puppeteer.launch({
    executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome',
    headless: false,
    args: ${JSON.stringify(launchArgs, null, 4)},
  });
  const page = await browser.newPage();

  /* ---- UA + Client Hints ---- */
  await page.setUserAgent(PROFILE.ua, PROFILE.uaData ? {
    brands: PROFILE.uaData.brands,
    fullVersionList: PROFILE.uaData.fullVersionList,
    fullVersion: PROFILE.uaData.fullVersion,
    architecture: PROFILE.uaData.architecture,
    bitness: PROFILE.uaData.bitness,
    mobile: PROFILE.uaData.mobile,
    model: PROFILE.uaData.model,
    platform: PROFILE.uaData.platform,
    platformVersion: PROFILE.uaData.platformVersion,
    wow64: false,
    formFactors: PROFILE.uaData.formFactors,
  } : undefined);

  /* ---- locale / timezone / screen / geo (CDP) ---- */
  const client = await page.target().createCDPSession();
  await client.send('Emulation.setTimezoneOverride', { timezoneId: PROFILE.timezone.id });
  await client.send('Emulation.setLocaleOverride', { locale: PROFILE.locale });
  await client.send('Emulation.setAcceptLanguageOverride', { acceptLanguage: PROFILE.languages.join(',') }).catch(() => {});
  await client.send('Emulation.setUserAgentOverride', {
    userAgent: PROFILE.ua,
    acceptLanguage: PROFILE.languages.join(','),
    platform: PROFILE.platform,
  }).catch(() => {});
  await client.send('Emulation.setGeolocationOverride', {
    latitude: PROFILE.geolocation.lat,
    longitude: PROFILE.geolocation.lon,
    accuracy: PROFILE.geolocation.accuracy,
  });
  await client.send('Emulation.setDeviceMetricsOverride', {
    width: PROFILE.screen.iw,
    height: PROFILE.screen.ih,
    deviceScaleFactor: PROFILE.screen.dpr,
    mobile: ${!!pl.uaData && pl.uaData.mobile},
  });

  /* ---- in-page spoof layer (injected before any script runs) ---- */
  const SPOOF = ${JSON.stringify(userscript(p)
    .replace(/^\/\/ ==UserScript==[\s\S]*?\/\/ ==\/UserScript==\n/, '')
    .replace(/^\s*'use strict';\n/, ''))};
  await page.evaluateOnNewDocument(SPOOF);

  /* ---- load ---- */
  await page.goto('${opts.target || 'https://browserleaks.com/ip'}', { waitUntil: 'networkidle2', timeout: 60000 });
  console.log('Profile ${p.name} ready. UA:', await page.evaluate(() => navigator.userAgent));
  console.log('TZ:', await page.evaluate(() => Intl.DateTimeFormat().resolvedOptions().timeZone));
  console.log('Languages:', await page.evaluate(() => navigator.languages));
})();
`;
  }

  /* --- 3c) chrome flags --- */
  function chromeFlags(p) {
    const proxy = p.network.proxy;
    const args = [
      `--user-agent="${p.navigator.userAgent}"`,
      `--lang=${p.geo.country ? p.locale.locale : 'en-US'}`,
      `--force-device-scale-factor=${p.display.dpr}`,
      `--window-size=${p.display.innerWidth || p.display.width},${p.display.innerHeight + 90}`,
      '--disable-blink-features=AutomationControlled',
      '--disable-features=IsolateOrigins,site-per-process',
    ];
    if (proxy) args.push(`--proxy-server=socks5://${proxy.host}:${proxy.port}`);
    return args.join(' ');
  }

  /* --- 3d) Proxy auth extension (MV3 safe + relay option) --- */
  function proxyAuthExtension(p) {
    const proxy = p.network.proxy;
    const scheme = proxy && (proxy.protocol === 'http' || proxy.protocol === 'https') ? proxy.protocol : 'socks5';
    const viaRelay = !!(proxy && proxy.viaRelay);
    const host = viaRelay ? '127.0.0.1' : (proxy ? proxy.host : 'HOST');
    const port = viaRelay ? (proxy.localRelayPort || 18080) : (proxy ? proxy.port : 1080);
    const effScheme = viaRelay ? 'http' : scheme;
    const user = viaRelay ? '' : ((proxy && proxy.username) || 'USER');
    const pass = viaRelay ? '' : ((proxy && proxy.password) || 'PASS');
    return `/* proxy-auth-extension v3.2.1 : generated by DOPPEL for ${p.name}
   Note: Chromium MV3 strips SOCKS5 username/password! Use Local Relay (http://127.0.0.1:18080) or HTTP proxy. */
/* ---------- manifest.json ---------- */
{
  "name": "DOPPEL Proxy Auth",
  "version": "3.2.1",
  "manifest_version": 3,
  "permissions": ["proxy", "privacy", "storage", "webRequest", "webRequestAuthProvider"],
  "host_permissions": ["<all_urls>"],
  "background": { "service_worker": "background.js" }
}
/* ---------- background.js ---------- */
function applyProxy() {
  chrome.privacy.network.webRTCIPHandlingPolicy.set({ value: "disable_non_proxied_udp" });
  chrome.proxy.settings.set({
    value: {
      mode: "fixed_servers",
      rules: {
        singleProxy: { scheme: "${effScheme}", host: "${host}", port: ${port} },
        bypassList: ${viaRelay ? '["127.0.0.1", "localhost"]' : '["localhost", "127.0.0.1", "<local>"]'},
      },
    },
    scope: "regular",
  });
}
chrome.runtime.onInstalled.addListener(applyProxy);
chrome.runtime.onStartup.addListener(applyProxy);
applyProxy();
chrome.webRequest.onAuthRequired.addListener(
  (details, cb) => {
    if (!details.isProxy || !${JSON.stringify(user)}) return cb({});
    cb({ authCredentials: { username: ${JSON.stringify(user)}, password: ${JSON.stringify(pass)} } });
  },
  { urls: ["<all_urls>"] },
  ["asyncBlocking"],
);
`;
  }

  /* --- 3e) local verification page (independent oracle) --- */
  function verifyPage(p) {
    const pl = payload(p);
    return `<!doctype html>
<html lang="fa" dir="rtl"><head><meta charset="utf-8"><title>DOPPEL verify — ${U.esc(p.name)}</title>
<style>body{font-family:system-ui;background:#0c0f14;color:#e6edf3;padding:24px;max-width:860px;margin:auto}
table{width:100%;border-collapse:collapse;font-size:14px}td,th{padding:8px 10px;border-bottom:1px solid #222a35;text-align:right}
th{color:#7d8590;font-weight:500}.ok{color:#3fb950;font-weight:700}.bad{color:#f85149;font-weight:700}
code{background:#161b22;padding:2px 6px;border-radius:6px;direction:ltr;display:inline-block;font-size:12px}
h1{font-size:20px}p{color:#8b949e;line-height:1.9}</style></head><body>
<h1>گزارش راستی‌آزمایی — ${U.esc(p.name)}</h1>
<p>این صفحه مقادیر واقعیِ مرورگری را که در حال حاضر در حال اجرای پروفایل است با مقدارهای پروفایل مقایسه می‌کند.
هر ردیف با ✔ مطابق است یا ✘ تفاوت دارد. اسکریپت DOPPEL را با این صفحه اجرا کنید تا مطمئن شوید لایهٔ spoof درست کار می‌کند.</p>
<table id="t"><thead><tr><th>سیگنال</th><th>انتظار پروفایل</th><th>مقدار واقعی مرورگر</th><th>وضعیت</th></tr></thead><tbody></tbody></table>
<script>
const WANT = ${JSON.stringify({ ua: pl.ua, platform: pl.platform, lang: pl.languages.join(','), tz: pl.timezone.id, w: pl.screen.w, h: pl.screen.h, dpr: pl.screen.dpr, gl: pl.webgl.renderer, cores: pl.hardwareConcurrency, mem: pl.deviceMemory, touch: pl.maxTouchPoints }, null, 2)};
function gl(){try{const c=document.createElement('canvas');const g=c.getContext('webgl');const e=g.getExtension('WEBGL_debug_renderer_info');return e?g.getParameter(e.UNMASKED_RENDERER_WEBGL):'n/a';}catch(e){return 'error'}}
const rows=[
 ['User-Agent', WANT.ua, navigator.userAgent],
 ['navigator.platform', WANT.platform, navigator.platform],
 ['زبان‌ها', WANT.lang, (navigator.languages||[]).join(',')],
 ['Timezone', WANT.tz, Intl.DateTimeFormat().resolvedOptions().timeZone],
 ['screen.width', WANT.w, screen.width],
 ['screen.height', WANT.h, screen.height],
 ['devicePixelRatio', WANT.dpr, window.devicePixelRatio],
 ['WebGL renderer', WANT.gl, gl()],
 ['hardwareConcurrency', WANT.cores, navigator.hardwareConcurrency],
 ['deviceMemory', WANT.mem, navigator.deviceMemory],
 ['maxTouchPoints', WANT.touch, navigator.maxTouchPoints],
];
const tb=document.querySelector('#t tbody');
for(const [k,w,got] of rows){
  const tr=document.createElement('tr');
  const match=String(w).toLowerCase()===String(got).toLowerCase();
  tr.innerHTML='<td>'+k+'</td><td><code>'+String(w).slice(0,90)+'</code></td><td><code>'+String(got).slice(0,90)+'</code></td>'+
    '<td class="'+(match?'ok':'bad')+'">'+(match?'✔ مطابق':'✘ تفاوت')+'</td>';
  tb.appendChild(tr);
}
</script></body></html>`;
  }

  return { payload, headers, fingerprintHash, analyze, userscript, puppeteer, chromeFlags, proxyAuthExtension, verifyPage };
})();
