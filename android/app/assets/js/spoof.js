/* ==========================================================================
   DOPPEL X — spoof.js  v3.2.1  (Multi-Realm Anti-Detect Runtime)
   Runs in Browser MAIN world (Extension / Userscript / Playwright / WebView)
   AND self-propagates into Worker / SharedWorker / same-origin iframes.

   Hardening in v3.2.1:
   - Prototype-level getters (Navigator.prototype / WorkerNavigator.prototype /
     Screen.prototype) — zero own-property footprints on instances.
   - WeakMap-backed Function.prototype.toString native facade — zero own
     `toString` or expando markers on wrapped functions.
   - DST-accurate IANA timezone engine via native Intl.DateTimeFormat wall
     clock lookup + cross-Intl locale parity (DateTimeFormat, NumberFormat,
     Collator, PluralRules, RelativeTimeFormat, ListFormat).
   - Geolocation coordinates aligned to target geo anchor (getCurrentPosition /
     watchPosition) when lat/lon are present.
   - Idempotent stateless Canvas / OffscreenCanvas / Audio / ClientRects noise
     (repeated reads return byte-identical outputs; live canvas untouched).
   - Worker & SharedWorker realm propagation + OffscreenCanvas + WebGL.
   - Strict WebRTC SDP non-relay candidate scrubbing across onicecandidate,
     addEventListener('icecandidate'), createOffer/Answer, and localDescription.
   ========================================================================== */
'use strict';
(function (root) {
  /* Role 1: Chrome MV3 Extension ISOLATED content-script bridge */
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local && typeof document !== 'undefined' && typeof window !== 'undefined' && root === window) {
    if (window.__DOPPEL_BRIDGED__) return;
    window.__DOPPEL_BRIDGED__ = true;
    chrome.storage.local.get('profile').then(function (res) {
      if (!res || !res.profile) return;
      var p = res.profile;
      var slim = {
        id: p.id, name: p.name, browser: p.browser, os: p.os,
        fingerprint: p.fingerprint, privacy: p.privacy, locale: p.locale,
        geo: p.geo, display: p.display, hardware: p.hardware, screen: p.screen,
        network: p.network, navigator: p.navigator, clientHints: p.clientHints,
        behavior: p.behavior, speech: p.speech, permissions: p.permissions
      };
      var s = document.createElement('script');
      s.textContent = 'window.__DOPPEL_PROFILE__ = ' + JSON.stringify(slim) + ';';
      (document.documentElement || document.head || document).appendChild(s);
      s.remove();
      var selfScript = document.createElement('script');
      selfScript.src = chrome.runtime.getURL('spoof.js');
      selfScript.onload = function () { selfScript.remove(); };
      (document.head || document.documentElement).appendChild(selfScript);
    }).catch(function () {});
    return;
  }

  /* Role 2: MAIN-world / Worker-world runtime installer */
  function __dxInstall(W, profileArg) {
    var P = profileArg || (W && W.__DOPPEL_PROFILE__);
    if (!P || !P.navigator) return false;
    var KEY = '__DX_INSTALLED__';
    if (W[KEY]) return true;
    try {
      Object.defineProperty(W, KEY, { value: true, configurable: true, enumerable: false, writable: false });
    } catch (e) { W[KEY] = true; }

    var isWorker = typeof WorkerGlobalScope !== 'undefined' && (W instanceof WorkerGlobalScope || (!W.document && !!W.self));
    var N = W.navigator;
    if (!N) return false;

    /* ---------------- WeakMap native facade (zero own-property leaks) */
    var nativeStrings = new WeakMap();
    var origFnToStr = Function.prototype.toString;
    var nativeCodeStr = function (nm) { return 'function ' + (nm || '') + '() { [native code] }'; };
    var hide = function (fn, name) {
      if (typeof fn !== 'function') return fn;
      var nm = name != null ? String(name) : (fn.name || '');
      try { Object.defineProperty(fn, 'name', { value: nm, configurable: true }); } catch (e) {}
      nativeStrings.set(fn, nativeCodeStr(nm));
      return fn;
    };
    try {
      var patchedToString = function toString() {
        if (typeof this === 'function' && nativeStrings.has(this)) {
          return nativeStrings.get(this);
        }
        return origFnToStr.call(this);
      };
      Object.defineProperty(patchedToString, 'name', { value: 'toString', configurable: true });
      nativeStrings.set(patchedToString, nativeCodeStr('toString'));
      Function.prototype.toString = patchedToString;
    } catch (e) {}

    /* Define getter on prototype (preferred) or fallback instance without leaving instance ownProps */
    var defProto = function (proto, fallbackObj, key, value, enumerable) {
      var desc = null;
      try { desc = proto ? Object.getOwnPropertyDescriptor(proto, key) : null; } catch (e) {}
      if (desc && !desc.configurable) {
        if (!fallbackObj || fallbackObj === proto) return;
      }
      var getter = hide(function () { return value; }, 'get ' + key);
      var setter = (desc && desc.set) ? hide(function () {}, 'set ' + key) : undefined;
      var target = proto || fallbackObj;
      try {
        Object.defineProperty(target, key, {
          get: getter,
          set: setter,
          configurable: true,
          enumerable: enumerable !== false
        });
      } catch (e) {
        if (fallbackObj && fallbackObj !== target) {
          try {
            Object.defineProperty(fallbackObj, key, { get: getter, configurable: true, enumerable: enumerable !== false });
          } catch (e2) {}
        }
      }
    };

    /* Fast deterministic 32-bit hash (stateless, idempotent across repeated reads) */
    var hash32 = function (x) {
      x = x | 0;
      x = Math.imul(x ^ (x >>> 16), 0x85ebca6b);
      x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
      return (x ^ (x >>> 16)) >>> 0;
    };

    var B = P.browser || {};
    var n = P.navigator || {};
    var loc = P.locale || {};
    var geo = P.geo || {};
    var scr = P.screen || {};
    var disp = P.display || {};
    var hw = P.hardware || {};
    var fp = P.fingerprint || {};
    var net = P.network || {};
    var ch = P.clientHints;

    var NavProto = (W.Navigator && W.Navigator.prototype) || (W.WorkerNavigator && W.WorkerNavigator.prototype) || Object.getPrototypeOf(N);

    /* ----------------------------------------------------------- 1) Navigator */
    if (n.userAgent) {
      defProto(NavProto, N, 'userAgent', n.userAgent);
      defProto(NavProto, N, 'appVersion', n.appVersion || n.userAgent.replace('Mozilla/', ''));
      if ('oscpu' in N) defProto(NavProto, N, 'oscpu', n.oscpu || undefined);
    }
    if (n.platform) defProto(NavProto, N, 'platform', n.platform);
    if (n.vendor !== undefined && !isWorker) defProto(NavProto, N, 'vendor', n.vendor);
    if (n.productSub && !isWorker) defProto(NavProto, N, 'productSub', n.productSub);
    if (!isWorker) defProto(NavProto, N, 'appName', 'Netscape');
    if (loc.languages && loc.languages.length) {
      defProto(NavProto, N, 'language', loc.languages[0]);
      defProto(NavProto, N, 'languages', Object.freeze(loc.languages.slice()));
    }
    if (n.hardwareConcurrency) defProto(NavProto, N, 'hardwareConcurrency', n.hardwareConcurrency);
    if (B.family === 'firefox' || B.family === 'safari') {
      try { delete NavProto.deviceMemory; } catch (e) {}
      try { if ('deviceMemory' in N) defProto(NavProto, N, 'deviceMemory', undefined); } catch (e) {}
    } else if (n.deviceMemory != null) {
      defProto(NavProto, N, 'deviceMemory', n.deviceMemory);
    }
    if (!isWorker && n.maxTouchPoints != null) defProto(NavProto, N, 'maxTouchPoints', n.maxTouchPoints);
    if (!isWorker && n.pdfViewerEnabled != null) defProto(NavProto, N, 'pdfViewerEnabled', !!n.pdfViewerEnabled);
    defProto(NavProto, N, 'webdriver', false);
    if (!isWorker && 'doNotTrack' in N) defProto(NavProto, N, 'doNotTrack', P.privacy && P.privacy.doNotTrack ? '1' : null);
    if (!isWorker && 'globalPrivacyControl' in N) defProto(NavProto, N, 'globalPrivacyControl', !!(P.privacy && P.privacy.globalPrivacyControl));

    /* window.chrome on Chromium when missing (e.g. headless/webview) */
    if (!isWorker && B && B.family !== 'firefox' && B.family !== 'safari' && !W.chrome) {
      try {
        var chromeObj = {
          app: { isInstalled: false, InstallState: { DISABLED: 'disabled', INSTALLED: 'installed', NOT_INSTALLED: 'not_installed' }, RunningState: { CANNOT_RUN: 'cannot_run', READY_TO_RUN: 'ready_to_run', RUNNING: 'running' } },
          runtime: { OnInstalledReason: { CHROME_UPDATE: 'chrome_update', INSTALL: 'install', SHARED_MODULE_UPDATE: 'shared_module_update', UPDATE: 'update' }, OnRestartRequiredReason: { APP_UPDATE: 'app_update', OS_UPDATE: 'os_update', PERIODIC: 'periodic' }, PlatformArch: { ARM: 'arm', ARM64: 'arm64', MIPS: 'mips', MIPS64: 'mips64', X86_32: 'x86-32', X86_64: 'x86-64' }, PlatformOs: { ANDROID: 'android', CROS: 'cros', LINUX: 'linux', MAC: 'mac', OPENBSD: 'openbsd', WIN: 'win' }, RequestUpdateCheckStatus: { NO_UPDATE: 'no_update', THROTTLED: 'throttled', UPDATE_AVAILABLE: 'update_available' } },
          csi: hide(function csi() { return {}; }, 'csi'),
          loadTimes: hide(function loadTimes() { return {}; }, 'loadTimes')
        };
        Object.defineProperty(W, 'chrome', { value: chromeObj, configurable: true, enumerable: true, writable: true });
      } catch (e) {}
    }

    /* Client Hints (navigator.userAgentData — works in main & workers in Chromium) */
    if (ch && ('userAgentData' in N || B.family === 'chrome' || B.family === 'edge')) {
      var brands = (ch.brands || []).map(function (b) { return { brand: b.brand, version: b.version }; });
      var fullList = (ch.fullVersionList || brands).map(function (b) { return { brand: b.brand, version: b.version }; });
      var uaData = {
        brands: Object.freeze(brands),
        mobile: !!ch.mobile,
        platform: ch.platform,
        getHighEntropyValues: hide(function getHighEntropyValues(hints) {
          var full = {
            architecture: ch.architecture || '',
            bitness: ch.bitness || '',
            brands: brands.slice(),
            formFactors: (ch.formFactors || ['Desktop']).slice(),
            fullVersionList: fullList.slice(),
            model: ch.model || '',
            platform: ch.platform,
            platformVersion: ch.platformVersion || '',
            uaFullVersion: ch.fullVersion || '',
            wow64: !!ch.wow64
          };
          if (!Array.isArray(hints)) return Promise.resolve(full);
          var out = { brands: brands.slice(), mobile: !!ch.mobile, platform: ch.platform };
          for (var i = 0; i < hints.length; i++) {
            var hk = hints[i];
            if (hk in full) out[hk] = full[hk];
          }
          return Promise.resolve(out);
        }, 'getHighEntropyValues'),
        toJSON: hide(function toJSON() { return { brands: brands.slice(), mobile: !!ch.mobile, platform: ch.platform }; }, 'toJSON')
      };
      defProto(NavProto, N, 'userAgentData', uaData);
    } else if (!ch && 'userAgentData' in N) {
      try { delete NavProto.userAgentData; } catch (e) {}
      try { if ('userAgentData' in N) defProto(NavProto, N, 'userAgentData', undefined); } catch (e) {}
    }

    /* Plugins + MimeTypes (main thread) */
    if (!isWorker && Array.isArray(fp.plugins)) {
      var list = fp.plugins.map(function (pl) {
        var o = { name: pl.name, filename: pl.filename, description: pl.description, length: 1 };
        o.item = hide(function item(i) { return i === 0 ? o[0] : null; }, 'item');
        o.namedItem = hide(function namedItem(nm) { return nm === 'application/pdf' ? o[0] : null; }, 'namedItem');
        o[0] = { type: 'application/pdf', suffixes: 'pdf', description: pl.description, enabledPlugin: o };
        return o;
      });
      list.item = hide(function item(i) { return list[i] || null; }, 'item');
      list.namedItem = hide(function namedItem(nm) {
        for (var i = 0; i < list.length; i++) if (list[i].name === nm) return list[i];
        return null;
      }, 'namedItem');
      list.refresh = hide(function refresh() {}, 'refresh');
      defProto(NavProto, N, 'plugins', list);
      var mimes = list.map(function (pl) { return pl[0]; });
      mimes.item = hide(function item(i) { return mimes[i] || null; }, 'item');
      mimes.namedItem = hide(function namedItem(nm) {
        for (var i = 0; i < mimes.length; i++) if (mimes[i].type === nm) return mimes[i];
        return null;
      }, 'namedItem');
      defProto(NavProto, N, 'mimeTypes', mimes);
    }

    /* ---------------------------------------------------- 2) Screen & Display */
    if (!isWorker && W.Screen) {
      var ScrProto = W.Screen.prototype;
      if (scr.width) {
        defProto(ScrProto, W.screen, 'width', scr.width);
        defProto(ScrProto, W.screen, 'height', scr.height);
      }
      if (disp.availWidth) {
        defProto(ScrProto, W.screen, 'availWidth', disp.availWidth);
        defProto(ScrProto, W.screen, 'availHeight', disp.availHeight);
        defProto(ScrProto, W.screen, 'availLeft', 0);
        defProto(ScrProto, W.screen, 'availTop', 0);
      }
      if (disp.colorDepth) {
        defProto(ScrProto, W.screen, 'colorDepth', disp.colorDepth);
        defProto(ScrProto, W.screen, 'pixelDepth', disp.pixelDepth || disp.colorDepth);
      }
      if (disp.dpr) {
        try {
          Object.defineProperty(W, 'devicePixelRatio', { get: hide(function () { return disp.dpr; }, 'get devicePixelRatio'), configurable: true });
        } catch (e) {}
      }
      if (disp.orientation && W.screen && W.screen.orientation) {
        try {
          var oType = disp.orientation;
          var oAngle = oType.indexOf('portrait') === 0 ? 0 : 90;
          defProto(W.ScreenOrientation && W.ScreenOrientation.prototype, W.screen.orientation, 'type', oType);
          defProto(W.ScreenOrientation && W.ScreenOrientation.prototype, W.screen.orientation, 'angle', oAngle);
        } catch (e) {}
      }
    }

    /* ----------------------------------------- 3) DST-Accurate IANA Timezone */
    if (geo.tz && typeof Intl !== 'undefined' && Intl.DateTimeFormat) {
      var tz = geo.tz;
      var defLoc = loc.locale || 'en-US';
      var OrigDTF = Intl.DateTimeFormat;
      var origResolved = OrigDTF.prototype.resolvedOptions;

      /* Wall-clock lookup using host ICU database for exact IANA DST at any instant */
      var wallFmt = null;
      var longTzFmt = null;
      try {
        wallFmt = new OrigDTF('en-US', {
          timeZone: tz,
          year: 'numeric', month: '2-digit', day: '2-digit',
          weekday: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit',
          hour12: false, hourCycle: 'h23'
        });
        longTzFmt = new OrigDTF('en-US', { timeZone: tz, timeZoneName: 'long' });
      } catch (e) { wallFmt = null; }

      var WD_MAP = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
      var DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      var MONS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

      var tzWall = function (ms) {
        if (!wallFmt || !Number.isFinite(ms)) return null;
        var parts = wallFmt.formatToParts(new Date(ms));
        var m = {};
        for (var i = 0; i < parts.length; i++) m[parts[i].type] = parts[i].value;
        var y = +m.year, mo = +m.month, da = +m.day;
        var hr = (+m.hour === 24) ? 0 : +m.hour, mi = +m.minute, sc = +m.second;
        var wallUtc = Date.UTC(y, mo - 1, da, hr, mi, sc);
        var baseUtc = Math.floor(ms / 1000) * 1000;
        var offsetMin = Math.round((wallUtc - baseUtc) / 60000);
        return {
          year: y, month: mo - 1, date: da, day: WD_MAP[m.weekday] != null ? WD_MAP[m.weekday] : 0,
          hours: hr, minutes: mi, seconds: sc, ms: ((ms % 1000) + 1000) % 1000,
          offsetMin: offsetMin, tzOffset: -offsetMin
        };
      };
      var tzLongName = function (ms) {
        if (!longTzFmt) return geo.tzAbbr || 'Local';
        try {
          var ps = longTzFmt.formatToParts(new Date(ms));
          for (var i = 0; i < ps.length; i++) if (ps[i].type === 'timeZoneName') return ps[i].value;
        } catch (e) {}
        return geo.tzAbbr || 'Local';
      };

      try {
        OrigDTF.prototype.resolvedOptions = hide(function resolvedOptions() {
          var r = origResolved.call(this);
          try {
            if (!this.__dxExplicitTz) r.timeZone = tz;
            if (!this.__dxExplicitLocale && defLoc) r.locale = defLoc;
          } catch (e) {}
          return r;
        }, 'resolvedOptions');

        var patchDtfArgs = function (args) {
          var a0 = args[0] === undefined ? defLoc : args[0];
          var o = args[1] ? Object.assign({}, args[1]) : {};
          var explicitTz = !!(args[1] && args[1].timeZone);
          var explicitLoc = args[0] !== undefined;
          if (!o.timeZone) o.timeZone = tz;
          return { args: [a0, o], explicitTz: explicitTz, explicitLoc: explicitLoc };
        };

        var ProxyDTF = new Proxy(OrigDTF, {
          apply: function (target, thisArg, argList) {
            var p = patchDtfArgs(argList);
            var inst = Reflect.construct(target, p.args, target);
            try {
              Object.defineProperty(inst, '__dxExplicitTz', { value: p.explicitTz, enumerable: false });
              Object.defineProperty(inst, '__dxExplicitLocale', { value: p.explicitLoc, enumerable: false });
            } catch (e) {}
            return inst;
          },
          construct: function (target, argList, newTarget) {
            var p = patchDtfArgs(argList);
            var inst = Reflect.construct(target, p.args, newTarget || target);
            try {
              Object.defineProperty(inst, '__dxExplicitTz', { value: p.explicitTz, enumerable: false });
              Object.defineProperty(inst, '__dxExplicitLocale', { value: p.explicitLoc, enumerable: false });
            } catch (e) {}
            return inst;
          }
        });
        nativeStrings.set(ProxyDTF, nativeCodeStr('DateTimeFormat'));
        Intl.DateTimeFormat = ProxyDTF;
      } catch (e) {}

      try {
        var OrigNF = Intl.NumberFormat;
        var origNFResolved = OrigNF.prototype.resolvedOptions;
        OrigNF.prototype.resolvedOptions = hide(function resolvedOptions() {
          var r = origNFResolved.call(this);
          if (!this.__dxExplicitLocale && defLoc) r.locale = defLoc;
          return r;
        }, 'resolvedOptions');
        var ProxyNF = new Proxy(OrigNF, {
          apply: function (t, thisArg, argList) {
            var explicit = argList[0] !== undefined;
            var inst = Reflect.construct(t, [explicit ? argList[0] : defLoc, argList[1]], t);
            try { Object.defineProperty(inst, '__dxExplicitLocale', { value: explicit, enumerable: false }); } catch (e) {}
            return inst;
          },
          construct: function (t, argList, newTarget) {
            var explicit = argList[0] !== undefined;
            var inst = Reflect.construct(t, [explicit ? argList[0] : defLoc, argList[1]], newTarget || t);
            try { Object.defineProperty(inst, '__dxExplicitLocale', { value: explicit, enumerable: false }); } catch (e) {}
            return inst;
          }
        });
        nativeStrings.set(ProxyNF, nativeCodeStr('NumberFormat'));
        Intl.NumberFormat = ProxyNF;
      } catch (e) {}

      /* Cross-Intl locale parity (Collator, PluralRules, RelativeTimeFormat, ListFormat) */
      ['Collator', 'PluralRules', 'RelativeTimeFormat', 'ListFormat'].forEach(function (intlName) {
        try {
          var OrigIntl = Intl[intlName];
          if (typeof OrigIntl !== 'function' || !OrigIntl.prototype || !OrigIntl.prototype.resolvedOptions) return;
          var origRes = OrigIntl.prototype.resolvedOptions;
          OrigIntl.prototype.resolvedOptions = hide(function resolvedOptions() {
            var r = origRes.call(this);
            if (!this.__dxExplicitLocale && defLoc) r.locale = defLoc;
            return r;
          }, 'resolvedOptions');
          var ProxyIntl = new Proxy(OrigIntl, {
            apply: function (t, thisArg, argList) {
              var explicit = argList[0] !== undefined;
              var inst = Reflect.construct(t, [explicit ? argList[0] : defLoc, argList[1]], t);
              try { Object.defineProperty(inst, '__dxExplicitLocale', { value: explicit, enumerable: false }); } catch (e) {}
              return inst;
            },
            construct: function (t, argList, newTarget) {
              var explicit = argList[0] !== undefined;
              var inst = Reflect.construct(t, [explicit ? argList[0] : defLoc, argList[1]], newTarget || t);
              try { Object.defineProperty(inst, '__dxExplicitLocale', { value: explicit, enumerable: false }); } catch (e) {}
              return inst;
            }
          });
          nativeStrings.set(ProxyIntl, nativeCodeStr(intlName));
          Intl[intlName] = ProxyIntl;
        } catch (e) {}
      });

      /* Date.prototype getters + formatters aligned to exact IANA wall clock */
      try {
        var origGetTime = Date.prototype.getTime;
        var msOf = function (self) {
          return self instanceof Date ? origGetTime.call(self) : NaN;
        };
        var fallbackOffset = -(geo.tzOffset || 0);

        Date.prototype.getTimezoneOffset = hide(function getTimezoneOffset() {
          var ms = msOf(this);
          if (!Number.isFinite(ms)) return NaN;
          var w = tzWall(ms);
          return w ? w.tzOffset : fallbackOffset;
        }, 'getTimezoneOffset');

        var mapGetters = {
          getFullYear: 'year', getMonth: 'month', getDate: 'date', getDay: 'day',
          getHours: 'hours', getMinutes: 'minutes', getSeconds: 'seconds', getMilliseconds: 'ms'
        };
        Object.keys(mapGetters).forEach(function (fn) {
          var field = mapGetters[fn];
          var orig = Date.prototype[fn];
          Date.prototype[fn] = hide(function () {
            var ms = msOf(this);
            if (!Number.isFinite(ms)) return orig.call(this);
            var w = tzWall(ms);
            return w ? w[field] : orig.call(this);
          }, fn);
        });
        Date.prototype.getYear = hide(function getYear() {
          var ms = msOf(this);
          if (!Number.isFinite(ms)) return NaN;
          var w = tzWall(ms);
          return (w ? w.year : new Date(ms).getUTCFullYear()) - 1900;
        }, 'getYear');

        var p2 = function (v) { return String(v).padStart(2, '0'); };
        var fmtDatePart = function (w) { return DAYS[w.day] + ' ' + MONS[w.month] + ' ' + p2(w.date) + ' ' + w.year; };
        var fmtTimePart = function (w, ms) {
          var off = w.offsetMin;
          var sign = off >= 0 ? '+' : '-';
          var abs = Math.abs(off);
          return p2(w.hours) + ':' + p2(w.minutes) + ':' + p2(w.seconds) + ' GMT' + sign + p2(Math.floor(abs / 60)) + p2(abs % 60) + ' (' + tzLongName(ms) + ')';
        };
        Date.prototype.toDateString = hide(function toDateString() {
          var ms = msOf(this);
          if (!Number.isFinite(ms)) return 'Invalid Date';
          var w = tzWall(ms);
          return w ? fmtDatePart(w) : 'Invalid Date';
        }, 'toDateString');
        Date.prototype.toTimeString = hide(function toTimeString() {
          var ms = msOf(this);
          if (!Number.isFinite(ms)) return 'Invalid Date';
          var w = tzWall(ms);
          return w ? fmtTimePart(w, ms) : 'Invalid Date';
        }, 'toTimeString');
        Date.prototype.toString = hide(function toString() {
          var ms = msOf(this);
          if (!Number.isFinite(ms)) return 'Invalid Date';
          var w = tzWall(ms);
          return w ? (fmtDatePart(w) + ' ' + fmtTimePart(w, ms)) : 'Invalid Date';
        }, 'toString');

        var _ls = Date.prototype.toLocaleString, _ld = Date.prototype.toLocaleDateString, _lt = Date.prototype.toLocaleTimeString;
        Date.prototype.toLocaleString = hide(function toLocaleString(l, o) {
          return _ls.call(this, l || defLoc, Object.assign({ timeZone: tz }, o || {}));
        }, 'toLocaleString');
        Date.prototype.toLocaleDateString = hide(function toLocaleDateString(l, o) {
          return _ld.call(this, l || defLoc, Object.assign({ timeZone: tz }, o || {}));
        }, 'toLocaleDateString');
        Date.prototype.toLocaleTimeString = hide(function toLocaleTimeString(l, o) {
          return _lt.call(this, l || defLoc, Object.assign({ timeZone: tz }, o || {}));
        }, 'toLocaleTimeString');
        if (typeof W.Date === 'function') {
          var OrigDate = W.Date;
          var ProxyDate = new Proxy(OrigDate, {
            apply: function (target) {
              return new target().toString();
            }
          });
          nativeStrings.set(ProxyDate, nativeCodeStr('Date'));
          W.Date = ProxyDate;
        }
      } catch (e) {}
    }

    /* ----------------------------------------------- 4) WebGL + WebGL2 + GPU */
    var gpu = hw.gpu || {};
    var patchGL = function (proto) {
      if (!proto) return;
      var origGet = proto.getParameter;
      proto.getParameter = hide(function getParameter(param) {
        if (param === 37445) return gpu.unmaskedVendor || gpu.vendor;
        if (param === 37446) return gpu.unmaskedRenderer || gpu.renderer;
        if (param === 7936) return gpu.webglVendor || gpu.vendor;
        if (param === 7937) return gpu.renderer;
        if (param === 3379) return 16384;
        if (param === 34047) return 16;
        if (param === 35661) return 32;
        if (param === 36349) return 1024;
        return origGet.call(this, param);
      }, 'getParameter');
      var origExt = proto.getExtension;
      proto.getExtension = hide(function getExtension(name) {
        if (String(name).toLowerCase() === 'webgl_debug_renderer_info') {
          return { UNMASKED_VENDOR_WEBGL: 37445, UNMASKED_RENDERER_WEBGL: 37446 };
        }
        return origExt.call(this, name);
      }, 'getExtension');
      var origPrecision = proto.getShaderPrecisionFormat;
      if (origPrecision) {
        proto.getShaderPrecisionFormat = hide(function getShaderPrecisionFormat(a, b) {
          var r = origPrecision.call(this, a, b);
          return r || { rangeMin: 127, rangeMax: 127, precision: 23 };
        }, 'getShaderPrecisionFormat');
      }
    };
    try { patchGL(W.WebGLRenderingContext && W.WebGLRenderingContext.prototype); } catch (e) {}
    try { patchGL(W.WebGL2RenderingContext && W.WebGL2RenderingContext.prototype); } catch (e) {}

    /* WebGPU */
    if (!isWorker) {
      if (fp.webgpu === 'absent') {
        try { delete NavProto.gpu; } catch (e) { defProto(NavProto, N, 'gpu', undefined); }
      } else if (fp.webgpu === 'present' && W.GPUAdapter && W.GPUAdapter.prototype && W.GPUAdapter.prototype.requestAdapterInfo) {
        W.GPUAdapter.prototype.requestAdapterInfo = hide(function requestAdapterInfo() {
          return Promise.resolve({
            vendor: (gpu.vendor || 'arm').toLowerCase(),
            architecture: 'gen-3',
            device: (P.os && (P.os.platform === 'android' || P.os.platform === 'ios')) ? 'mobile' : 'desktop',
            description: gpu.renderer || '',
            isFallbackAdapter: false
          });
        }, 'requestAdapterInfo');
      }
    }

    /* ---------------------- 5) Idempotent Canvas & OffscreenCanvas Noise */
    var seedCanvas = (fp.canvasNoiseSeed || 123456) | 0;
    var seedAudio = (fp.audioSeed || 654321) | 0;
    var seedRect = (fp.audioSeed || fp.canvasNoiseSeed || 98765) | 0;

    var perturbImageData = function (data, w, h, rx, ry) {
      if (!data || !data.length) return;
      var stride = 4;
      for (var i = 0; i < data.length; i += stride) {
        if (data[i + 3] === 0) continue;
        var px = (i >> 2) % Math.max(1, w);
        var py = Math.floor((i >> 2) / Math.max(1, w));
        var hsh = hash32(seedCanvas ^ ((px + rx) * 73856093) ^ ((py + ry) * 19349663) ^ (w * 83492791));
        if ((hsh & 7) < 4) {
          var dR = ((hsh >>> 3) & 1) ? 1 : -1;
          var dG = ((hsh >>> 4) & 3) === 0 ? (((hsh >>> 6) & 1) ? 1 : -1) : 0;
          data[i] = Math.max(0, Math.min(255, data[i] + dR));
          data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + dG));
        }
      }
    };

    if (fp.canvas === 'noise') {
      /* Clone to a detached offscreen canvas so the live canvas is NEVER double-mutated! */
      var snapshotCanvas = function (srcCanvas) {
        var w = srcCanvas.width | 0, h = srcCanvas.height | 0;
        if (!w || !h || typeof document === 'undefined') return null;
        var tmp = document.createElement('canvas');
        tmp.width = w; tmp.height = h;
        var tctx = tmp.getContext('2d');
        if (!tctx) return null;
        tctx.drawImage(srcCanvas, 0, 0);
        var iw = Math.min(w, 64), ih = Math.min(h, 64);
        var img = tctx.getImageData(0, 0, iw, ih);
        perturbImageData(img.data, w, h, 0, 0);
        tctx.putImageData(img, 0, 0);
        return tmp;
      };

      if (!isWorker && W.HTMLCanvasElement) {
        var origToDataURL = W.HTMLCanvasElement.prototype.toDataURL;
        W.HTMLCanvasElement.prototype.toDataURL = hide(function toDataURL() {
          try {
            var tmp = snapshotCanvas(this);
            if (tmp) return origToDataURL.apply(tmp, arguments);
          } catch (e) {}
          return origToDataURL.apply(this, arguments);
        }, 'toDataURL');

        var origToBlob = W.HTMLCanvasElement.prototype.toBlob;
        if (origToBlob) {
          W.HTMLCanvasElement.prototype.toBlob = hide(function toBlob() {
            try {
              var tmp = snapshotCanvas(this);
              if (tmp) return origToBlob.apply(tmp, arguments);
            } catch (e) {}
            return origToBlob.apply(this, arguments);
          }, 'toBlob');
        }
      }

      var patch2D = function (proto) {
        if (!proto || !proto.getImageData) return;
        var origGid = proto.getImageData;
        proto.getImageData = hide(function getImageData(sx, sy, sw, sh) {
          var out = origGid.apply(this, arguments);
          try { perturbImageData(out.data, sw || out.width, sh || out.height, sx | 0, sy | 0); } catch (e) {}
          return out;
        }, 'getImageData');
      };
      if (!isWorker && W.CanvasRenderingContext2D) patch2D(W.CanvasRenderingContext2D.prototype);
      if (W.OffscreenCanvasRenderingContext2D) patch2D(W.OffscreenCanvasRenderingContext2D.prototype);

      if (W.OffscreenCanvas && W.OffscreenCanvas.prototype) {
        var origOCBlob = W.OffscreenCanvas.prototype.convertToBlob;
        if (origOCBlob) {
          W.OffscreenCanvas.prototype.convertToBlob = hide(function convertToBlob(opts) {
            try {
              var w = this.width | 0, h = this.height | 0;
              if (w && h) {
                var scratch = new W.OffscreenCanvas(w, h);
                var sctx = scratch.getContext('2d');
                if (sctx) {
                  sctx.drawImage(this, 0, 0);
                  var iw = Math.min(w, 64), ih = Math.min(h, 64);
                  var im = sctx.getImageData(0, 0, iw, ih);
                  perturbImageData(im.data, w, h, 0, 0);
                  sctx.putImageData(im, 0, 0);
                  return origOCBlob.call(scratch, opts);
                }
              }
            } catch (e) {}
            return origOCBlob.apply(this, arguments);
          }, 'convertToBlob');
        }
      }
    }

    /* -------------------------------------- 6) Audio (idempotent via WeakSet) */
    if (!isWorker && fp.audio === 'noise') {
      try {
        var tintedBuffers = new WeakSet();
        if (W.AudioBuffer && W.AudioBuffer.prototype.getChannelData) {
          var origGcd = W.AudioBuffer.prototype.getChannelData;
          W.AudioBuffer.prototype.getChannelData = hide(function getChannelData(chIdx) {
            var arr = origGcd.apply(this, arguments);
            var tag = this;
            if (!tintedBuffers.has(tag)) {
              tintedBuffers.add(tag);
              var step = Math.max(1, Math.floor(arr.length / 256));
              for (var i = 0; i < arr.length; i += step) {
                var u = (hash32(seedAudio ^ ((chIdx | 0) * 131) ^ i) / 4294967296) - 0.5;
                arr[i] += u * 1e-7;
              }
            }
            return arr;
          }, 'getChannelData');
        }
        if (W.AnalyserNode && W.AnalyserNode.prototype.getFloatFrequencyData) {
          var origFreq = W.AnalyserNode.prototype.getFloatFrequencyData;
          W.AnalyserNode.prototype.getFloatFrequencyData = hide(function getFloatFrequencyData(arr) {
            origFreq.call(this, arr);
            for (var i = 0; i < arr.length; i++) {
              var u = (hash32(seedAudio ^ i ^ 0x517cc1b7) / 4294967296) - 0.5;
              arr[i] += u * 1e-4;
            }
          }, 'getFloatFrequencyData');
        }
      } catch (e) {}
    }

    /* ------------------------ 7) ClientRects & Fonts (idempotent per Element) */
    if (!isWorker && fp.clientRectsNoise && W.Element && W.DOMRect) {
      try {
        var rectCache = new WeakMap();
        var elSeq = 0;
        var rectOffset = function (el) {
          var hit = rectCache.get(el);
          if (hit) return hit;
          elSeq++;
          var h1 = hash32(seedRect ^ elSeq);
          var h2 = hash32(seedRect ^ (elSeq * 2654435761));
          hit = {
            dx: ((h1 / 4294967296) - 0.5) * 0.015,
            dy: ((h2 / 4294967296) - 0.5) * 0.015
          };
          rectCache.set(el, hit);
          return hit;
        };
        var origGcr = W.Element.prototype.getBoundingClientRect;
        W.Element.prototype.getBoundingClientRect = hide(function getBoundingClientRect() {
          var r = origGcr.call(this);
          if (!r || Math.abs(r.width) < 0.5 || Math.abs(r.height) < 0.5) return r;
          var d = rectOffset(this);
          return new W.DOMRect(r.x + d.dx, r.y + d.dy, r.width + d.dx, r.height + d.dy);
        }, 'getBoundingClientRect');
      } catch (e) {}
    }

    if (!isWorker && Array.isArray(fp.fonts) && fp.fonts.length && W.FontFaceSet) {
      try {
        var fset = new Set(fp.fonts.map(function (f) { return f.toLowerCase(); }));
        var origCheck = W.FontFaceSet.prototype.check;
        W.FontFaceSet.prototype.check = hide(function check(font) {
          var m = /^\s*(?:\d+(?:\.\d+)?(?:px|pt|em|rem)\s+)?["']?([^,"']+)/.exec(String(font));
          if (m) {
            var fam = m[1].trim().toLowerCase();
            if (['serif', 'sans-serif', 'monospace', 'cursive', 'fantasy', 'system-ui'].indexOf(fam) === -1 && !fam.startsWith('ui-')) {
              return fset.has(fam);
            }
          }
          return origCheck.apply(this, arguments);
        }, 'check');
      } catch (e) {}
    }

    /* ------------------------------------------ 8) Battery / Media / Network */
    if (!isWorker && fp.spoofBattery && N.getBattery) {
      var bat = fp.battery || { level: 0.85, charging: true };
      defProto(NavProto, N, 'getBattery', hide(function getBattery() {
        return Promise.resolve({
          charging: !!bat.charging,
          chargingTime: bat.charging ? 0 : Infinity,
          dischargingTime: bat.charging ? Infinity : 9000,
          level: bat.level,
          addEventListener: function () {}, removeEventListener: function () {},
          onchargingchange: null, onlevelchange: null, onchargingtimechange: null, ondischargingtimechange: null
        });
      }, 'getBattery'));
    }

    if (!isWorker && W.matchMedia) {
      try {
        var origMm = W.matchMedia;
        W.matchMedia = hide(function matchMedia(q) {
          var str = String(q);
          var m;
          if (/prefers-color-scheme:\s*dark/i.test(str)) m = disp.prefersColorScheme === 'dark';
          else if (/prefers-color-scheme:\s*light/i.test(str)) m = disp.prefersColorScheme !== 'dark';
          else if (/prefers-reduced-motion:\s*reduce/i.test(str)) m = !!disp.prefersReducedMotion;
          else return origMm.call(W, q);
          return {
            matches: m, media: str,
            addEventListener: function () {}, removeEventListener: function () {},
            addListener: function () {}, removeListener: function () {}, onchange: null
          };
        }, 'matchMedia');
      } catch (e) {}
    }

    if (net.connection && 'connection' in N) {
      var c = net.connection;
      var connObj = {
        effectiveType: c.effectiveType || '4g',
        type: c.type || 'wifi',
        rtt: c.rtt || 50,
        downlink: c.downlink || 10,
        saveData: !!c.saveData,
        addEventListener: function () {}, removeEventListener: function () {}, onchange: null
      };
      defProto(NavProto, N, 'connection', connObj);
    }

    if (!isWorker && N.mediaDevices && N.mediaDevices.enumerateDevices) {
      try {
        var mdProto = Object.getPrototypeOf(N.mediaDevices);
        mdProto.enumerateDevices = hide(function enumerateDevices() {
          var out = [];
          var push = function (kind, count) {
            for (var i = 0; i < (count || 0); i++) {
              out.push({ kind: kind, deviceId: kind + '-' + i, groupId: 'g' + (i % 2), label: '' });
            }
          };
          push('videoinput', hw.cameraCount || 0);
          push('audioinput', hw.microphoneCount || 0);
          push('audiooutput', hw.speakerCount || 0);
          return Promise.resolve(out);
        }, 'enumerateDevices');
      } catch (e) {}
    }

    if (!isWorker && Array.isArray(P.speech) && P.speech.length && W.speechSynthesis) {
      try {
        var voices = P.speech.map(function (v) {
          return { name: v.name, lang: v.lang, localService: !!v.localService, default: !!v.default, voiceURI: v.name };
        });
        W.speechSynthesis.getVoices = hide(function getVoices() { return voices.slice(); }, 'getVoices');
      } catch (e) {}
    }

    if (!isWorker && P.permissions && N.permissions && N.permissions.query) {
      try {
        var origPerm = N.permissions.query;
        var pm = P.permissions;
        N.permissions.query = hide(function query(desc) {
          var nm = desc && desc.name;
          if (nm && pm[nm]) {
            return Promise.resolve({ state: pm[nm], name: nm, onchange: null, addEventListener: function () {}, removeEventListener: function () {} });
          }
          return origPerm.apply(this, arguments);
        }, 'query');
      } catch (e) {}
    }

    /* ----------------------------------------- 9) WebRTC & Geolocation Leak Scrubbing */
    if (!isWorker && geo.lat != null && geo.lon != null && N.geolocation) {
      try {
        var geoProto = W.Geolocation && W.Geolocation.prototype;
        var mkPos = function () {
          var acc = 18 + (hash32((seedCanvas || 42) ^ 0x9e3779b9) % 24);
          return {
            coords: {
              latitude: Number(geo.lat),
              longitude: Number(geo.lon),
              altitude: null,
              accuracy: acc,
              altitudeAccuracy: null,
              heading: null,
              speed: null
            },
            timestamp: Date.now()
          };
        };
        if (geoProto) {
          geoProto.getCurrentPosition = hide(function getCurrentPosition(okCb) {
            if (typeof okCb === 'function') setTimeout(function () { okCb(mkPos()); }, 12);
          }, 'getCurrentPosition');
          geoProto.watchPosition = hide(function watchPosition(okCb) {
            if (typeof okCb === 'function') setTimeout(function () { okCb(mkPos()); }, 12);
            return 1;
          }, 'watchPosition');
        }
      } catch (e) {}
    }

    if (!isWorker && net.webrtc === 'disabled') {
      var scrubSdp = function (sdp) {
        if (!sdp) return sdp;
        return String(sdp)
          .replace(/a=candidate:.*(?:\r?\n|$)/gi, '')
          .replace(/a=raddr:.*(?:\r?\n|$)/gi, '')
          .replace(/c=IN IP4 (?!0\.0\.0\.0)\d+\.\d+\.\d+\.\d+/gi, 'c=IN IP4 0.0.0.0');
      };
      var scrubDesc = function (d) {
        if (!d || !d.sdp) return d;
        var clean = scrubSdp(d.sdp);
        try { return new W.RTCSessionDescription({ type: d.type, sdp: clean }); } catch (e) { return { type: d.type, sdp: clean }; }
      };
      ['RTCPeerConnection', 'webkitRTCPeerConnection', 'mozRTCPeerConnection'].forEach(function (k) {
        var Orig = W[k];
        if (!Orig) return;
        var Wrapped = hide(function RTCPeerConnection(cfg) {
          var safeCfg = Object.assign({}, cfg || {}, { iceServers: [], iceTransportPolicy: 'relay' });
          var pc = new Orig(safeCfg);
          if (pc.setLocalDescription) {
            var origSld = pc.setLocalDescription.bind(pc);
            pc.setLocalDescription = hide(function setLocalDescription(d) {
              return origSld(scrubDesc(d));
            }, 'setLocalDescription');
          }
          ['createOffer', 'createAnswer'].forEach(function (mName) {
            if (typeof pc[mName] === 'function') {
              var origM = pc[mName].bind(pc);
              pc[mName] = hide(function () {
                return origM.apply(pc, arguments).then(function (desc) { return scrubDesc(desc); });
              }, mName);
            }
          });
          ['localDescription', 'currentLocalDescription', 'pendingLocalDescription'].forEach(function (prop) {
            try {
              var desc = Object.getOwnPropertyDescriptor(Orig.prototype, prop);
              if (desc && desc.get) {
                Object.defineProperty(pc, prop, {
                  get: hide(function () { return scrubDesc(desc.get.call(pc)); }, 'get ' + prop),
                  configurable: true
                });
              }
            } catch (e) {}
          });
          var origAddListener = pc.addEventListener.bind(pc);
          pc.addEventListener = hide(function addEventListener(type, fn, opts) {
            if (type === 'icecandidate' && typeof fn === 'function') {
              return origAddListener(type, function (ev) {
                if (ev && ev.candidate) return;
                return fn.call(this, ev);
              }, opts);
            }
            return origAddListener(type, fn, opts);
          }, 'addEventListener');
          try {
            Object.defineProperty(pc, 'onicecandidate', {
              set: function (fn) {
                origAddListener('icecandidate', function (ev) {
                  if (ev && ev.candidate) return;
                  if (typeof fn === 'function') fn.call(pc, ev);
                });
              },
              configurable: true
            });
          } catch (e) {}
          return pc;
        }, k);
        Wrapped.prototype = Orig.prototype;
        try { W[k] = Wrapped; } catch (e) {}
      });
    }

    /* ---------------------------- 10) Iframe & Worker Realm Propagation */
    if (!isWorker) {
      /* Same-origin / blank iframes */
      try {
        var IframeProto = W.HTMLIFrameElement && W.HTMLIFrameElement.prototype;
        if (IframeProto) {
          var cwDesc = Object.getOwnPropertyDescriptor(IframeProto, 'contentWindow');
          var cdDesc = Object.getOwnPropertyDescriptor(IframeProto, 'contentDocument');
          if (cwDesc && cwDesc.get) {
            Object.defineProperty(IframeProto, 'contentWindow', {
              get: hide(function contentWindow() {
                var cw = cwDesc.get.call(this);
                try { if (cw && !cw[KEY]) __dxInstall(cw, P); } catch (e) {}
                return cw;
              }, 'get contentWindow'),
              configurable: true
            });
          }
          if (cdDesc && cdDesc.get) {
            Object.defineProperty(IframeProto, 'contentDocument', {
              get: hide(function contentDocument() {
                var cd = cdDesc.get.call(this);
                try {
                  var cw = cd && cd.defaultView;
                  if (cw && !cw[KEY]) __dxInstall(cw, P);
                } catch (e) {}
                return cd;
              }, 'get contentDocument'),
              configurable: true
            });
          }
        }
      } catch (e) {}

      /* Worker & SharedWorker propagation (eliminates Worker vs Main leaks) */
      try {
        var slimWorkerProfile = {
          id: P.id, name: P.name, browser: P.browser, os: P.os,
          locale: P.locale, geo: P.geo, hardware: P.hardware,
          fingerprint: { canvas: fp.canvas, canvasNoiseSeed: fp.canvasNoiseSeed, audioSeed: fp.audioSeed },
          network: { connection: net.connection },
          navigator: {
            userAgent: n.userAgent, appVersion: n.appVersion, platform: n.platform,
            hardwareConcurrency: n.hardwareConcurrency, deviceMemory: n.deviceMemory
          },
          clientHints: ch
        };
        var buildWorkerScript = function (url, isModule) {
          var abs = String(url);
          try { abs = new URL(abs, W.location && W.location.href ? W.location.href : undefined).href; } catch (e) {}
          var prelude = 'self.__DOPPEL_PROFILE__=' + JSON.stringify(slimWorkerProfile) + ';\n' +
            '(' + __dxInstall.toString() + ')(self);\n';
          if (isModule) return prelude + 'import ' + JSON.stringify(abs) + ';\n';
          return prelude + 'importScripts(' + JSON.stringify(abs) + ');\n';
        };
        if (typeof W.Worker === 'function') {
          var OrigWorker = W.Worker;
          var PatchedWorker = new Proxy(OrigWorker, {
            construct: function (target, args, newTarget) {
              try {
                var url = args[0], opts = args[1] || {};
                if (url && typeof W.Blob === 'function' && W.URL && W.URL.createObjectURL) {
                  var isMod = opts.type === 'module';
                  var code = buildWorkerScript(url, isMod);
                  var blobUrl = W.URL.createObjectURL(new W.Blob([code], { type: 'application/javascript' }));
                  var wInst = Reflect.construct(target, [blobUrl, opts], newTarget || target);
                  setTimeout(function () { try { W.URL.revokeObjectURL(blobUrl); } catch (e) {} }, 15000);
                  return wInst;
                }
              } catch (e) {}
              return Reflect.construct(target, args, newTarget || target);
            }
          });
          nativeStrings.set(PatchedWorker, nativeCodeStr('Worker'));
          W.Worker = PatchedWorker;
        }
        if (typeof W.SharedWorker === 'function') {
          var OrigSW = W.SharedWorker;
          var PatchedSW = new Proxy(OrigSW, {
            construct: function (target, args, newTarget) {
              try {
                var url = args[0], opts = args[1];
                if (url && typeof W.Blob === 'function' && W.URL && W.URL.createObjectURL) {
                  var isMod = opts && typeof opts === 'object' && opts.type === 'module';
                  var code = buildWorkerScript(url, isMod);
                  var blobUrl = W.URL.createObjectURL(new W.Blob([code], { type: 'application/javascript' }));
                  var swInst = Reflect.construct(target, opts ? [blobUrl, opts] : [blobUrl], newTarget || target);
                  setTimeout(function () { try { W.URL.revokeObjectURL(blobUrl); } catch (e) {} }, 15000);
                  return swInst;
                }
              } catch (e) {}
              return Reflect.construct(target, args, newTarget || target);
            }
          });
          nativeStrings.set(PatchedSW, nativeCodeStr('SharedWorker'));
          W.SharedWorker = PatchedSW;
        }
      } catch (e) {}
    }

    /* Clean prototype webdriver flag */
    try { delete Object.getPrototypeOf(NavProto).webdriver; } catch (e) {}
    return true;
  }

  root.__dxInstall = function (profile) { return __dxInstall(root, profile); };
  if (root.__DOPPEL_PROFILE__) __dxInstall(root, root.__DOPPEL_PROFILE__);
})(typeof window !== 'undefined' ? window : self);
