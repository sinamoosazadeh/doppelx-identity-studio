/* ==========================================================================
   DOPPEL — 03-generate.js
   The coherent profile generator + validator + auto-repair.
   --------------------------------------------------------------------------
   هستهٔ اصلی: هر پروفایل از یک «کهن‌الگوی دستگاه» (device archetype) ساخته
   می‌شود و همهٔ فیلدها از همان الگو مشتق می‌شوند: سیستم‌عامل → مرورگر → UA →
   Client Hints → رزولوشن/DPR → GPU/WebGL → فونت‌ها → زبان/منطقه/تایم‌زون →
   IP/پروکسی/WebRTC. هیچ فیلدی مستقل و تصادفی انتخاب نمی‌شود.
   ========================================================================== */
'use strict';

const FP = (() => {

  /* ------------------------------------------------ known-good OS archetypes */
  const WIN_ARCH = {
    win10: { id: 'win10', label: 'Windows 10 (22H2)', nt: '10.0', build: '19045.3803', chVersion: '10.0.0', arch: 'x86_64', gpuSet: 'win', fontSet: 'windows10', platform: 'Win32', speedUnit: 'mph' },
    win11: { id: 'win11', label: 'Windows 11 (23H2)', nt: '10.0', build: '22631.3155', chVersion: '15.0.0', arch: 'x86_64', gpuSet: 'win', fontSet: 'windows11', platform: 'Win32', speedUnit: 'km/h' },
  };

  const MAC_ARCH = {
    'MacBook Air M1': { label: 'macOS 14.4.1 Sonoma · MacBook Air M1', osVersion: '14.4.1', safari: '17.4.1', arch: 'arm', gpu: 'Apple M1', ram: [8, 16], cores: 8 },
    'MacBook Air M2': { label: 'macOS 15.1 Sequoia · MacBook Air M2', osVersion: '15.1', safari: '18.1', arch: 'arm', gpu: 'Apple M2', ram: [8, 16, 24], cores: 8 },
    'MacBook Pro M3': { label: 'macOS 26.1 · MacBook Pro M3', osVersion: '26.1', safari: '26.1', arch: 'arm', gpu: 'Apple M3', ram: [16, 32], cores: 8 },
    'iMac 24 M1': { label: 'macOS 14.2.1 · iMac 24 M1', osVersion: '14.2.1', safari: '17.2.1', arch: 'arm', gpu: 'Apple M1', ram: [16], cores: 8 },
  };

  const LINUX_ARCH = {
    ubuntu: { label: 'Ubuntu 22.04 LTS · GNOME', osVersion: '22.04', chVersion: '6.5.0', arch: 'x86_64', gpuSet: 'linux', fontSet: 'linux', platform: 'Linux x86_64' },
    fedora: { label: 'Fedora 40 · GNOME', osVersion: '40', chVersion: '6.8.5', arch: 'x86_64', gpuSet: 'linux', fontSet: 'linux', platform: 'Linux x86_64' },
  };

  const ANDROID_DEVICES = [
    { model: 'Pixel 8', name: 'Google Pixel 8', brand: 'google', release: '2023-10', chip: 'Google Tensor G3', cores: 9, gpu: 'Mali-G715', ram: 8, screen: [1080, 2400], dpr: 2.625, ids: ['chrome', 'firefox'] },
    { model: 'SM-S921B', name: 'Samsung Galaxy S24', brand: 'samsung', release: '2024-01', chip: 'Qualcomm Snapdragon 8 Gen 3', cores: 8, gpu: 'Adreno (TM) 750', ram: 8, screen: [1080, 2340], dpr: 2.8125, ids: ['chrome'] },
    { model: 'SM-S911B', name: 'Samsung Galaxy S23', brand: 'samsung', release: '2023-02', chip: 'Qualcomm Snapdragon 8 Gen 2', cores: 8, gpu: 'Adreno (TM) 740', ram: 8, screen: [1080, 2340], dpr: 2.8125, ids: ['chrome'] },
    { model: 'RMX1971', name: 'realme 5 Pro', brand: 'realme', release: '2019-08', chip: 'Qualcomm Snapdragon 712', cores: 8, gpu: 'Adreno (TM) 616', ram: 4, screen: [1080, 2340], dpr: 2.75, ids: ['chrome'] },
    { model: 'SM-A505F', name: 'Samsung Galaxy A50', brand: 'samsung', release: '2019-03', chip: 'Samsung Exynos 9610', cores: 8, gpu: 'Mali-G72 MP3', ram: 4, screen: [1080, 2340], dpr: 2.625, ids: ['chrome'] },
    { model: '23021RAAEG', name: 'Redmi Note 12', brand: 'xiaomi', release: '2023-03', chip: 'Qualcomm Snapdragon 685', cores: 8, gpu: 'Adreno (TM) 610', ram: 4, screen: [1080, 2400], dpr: 2.75, ids: ['chrome'] },
    { model: '2211133G', name: 'Xiaomi 13', brand: 'xiaomi', release: '2023-02', chip: 'Qualcomm Snapdragon 8 Gen 2', cores: 8, gpu: 'Adreno (TM) 740', ram: 8, screen: [1080, 2400], dpr: 2.75, ids: ['chrome'] },
    { model: 'CPH2451', name: 'OPPO Reno8 T', brand: 'oppo', release: '2023-01', chip: 'Qualcomm Snapdragon 695', cores: 8, gpu: 'Adreno (TM) 619', ram: 8, screen: [1080, 2400], dpr: 2.75, ids: ['chrome'] },
    { model: 'M2101K6G', name: 'Xiaomi Redmi Note 10 Pro', brand: 'xiaomi', release: '2021-03', chip: 'Qualcomm Snapdragon 732G', cores: 8, gpu: 'Adreno (TM) 618', ram: 6, screen: [1080, 2400], dpr: 2.75, ids: ['chrome'] },
    { model: 'V2140', name: 'vivo Y33s', brand: 'vivo', release: '2021-07', chip: 'MediaTek Helio G80', cores: 8, gpu: 'Mali-G52 MC2', ram: 4, screen: [1080, 2400], dpr: 2.75, ids: ['chrome'] },
    { model: 'Pixel 7', name: 'Google Pixel 7', brand: 'google', release: '2022-10', chip: 'Google Tensor G2', cores: 8, gpu: 'Mali-G710', ram: 8, screen: [1080, 2400], dpr: 2.625, ids: ['chrome', 'firefox'] },
    { model: 'Pixel 9 Pro', name: 'Google Pixel 9 Pro', brand: 'google', release: '2024-09', chip: 'Google Tensor G4', cores: 8, gpu: 'Mali-G715', ram: 16, screen: [1280, 2856], dpr: 3, ids: ['chrome'] },
  ];

  const IOS_DEVICES = [
    { model: 'iPhone16,1', name: 'iPhone 15 Pro', release: '2023-09', ios: ['17.5', '18.1', '26.1'], screen: [393, 852], dpr: 3, ram: 8 },
    { model: 'iPhone15,2', name: 'iPhone 14 Pro', release: '2022-09', ios: ['17.4.1', '18.1', '26.1'], screen: [393, 852], dpr: 3, ram: 6 },
    { model: 'iPhone14,5', name: 'iPhone 13', release: '2021-09', ios: ['17.5.1', '18.1', '26.0'], screen: [390, 844], dpr: 3, ram: 4 },
    { model: 'iPhone17,1', name: 'iPhone 16 Pro', release: '2024-09', ios: ['18.1', '26.1'], screen: [402, 874], dpr: 3, ram: 8 },
  ];

  /* Windows GPU pick by tier */
  const winGpuByTier = (tier) => U.pickWeighted(GPUS.win, Math.random, (g) => (g.tier === tier ? 6 : g.tier === Math.max(0, tier - 1) ? 2 : 0.3));

  /* ------------------------------------------------------- UA builders */
  function androidVersionFor(device, rng) {
    const rel = new Date(device.release + '-01T00:00:00Z');
    const ageY = (Date.now() - rel.getTime()) / (365 * 86400000);
    const maxIdx = ANDROID_VERSIONS.length - 1;
    let cap = maxIdx;
    if (ageY > 5) cap = Math.min(cap, 3);      // very old phones: up to Android 14
    else if (ageY > 3) cap = Math.min(cap, 4); // 2022-2023: Android 15
    const minIdx = Math.max(0, ANDROID_VERSIONS.findIndex((v) => new Date(v.minRelease + '-01') <= rel));
    return ANDROID_VERSIONS[rng.int(Math.min(minIdx, cap), cap)];
  }

  function buildUa(p) {
    const b = p.browser, os = p.os;
    const full = b.fullVersion || '144.0.7559.97';
    const major = b.major;
    if (b.family === 'safari') {
      const v = b.major + '.' + (b.minor || 0);
      if (os.platform === 'ios') return `Mozilla/5.0 (${os.device ? 'iPhone' : 'iPhone'}; CPU iPhone OS ${os.osVersion.replace(/\./g, '_')} like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/${v} Mobile/15E148 Safari/604.1`;
      return `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/${v} Safari/605.1.15`;
    }
    if (b.family === 'firefox') {
      if (os.platform === 'android') return `Mozilla/5.0 (Android ${os.osVersion}; Mobile; rv:${major}.0) Gecko/${major}.0 Firefox/${major}.0`;
      const wp = os.platform === 'windows' ? 'Windows NT 10.0; Win64; x64' : 'X11; Linux x86_64';
      const mac = os.platform === 'macos' ? 'Macintosh; Intel Mac OS X 10.15' : wp;
      return `Mozilla/5.0 (${mac}; rv:${major}.0) Gecko/20100101 Firefox/${major}.0`;
    }
    const chromium = `AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${major}.0.0.0`;
    if (b.family === 'edge') {
      if (os.platform === 'android') return `Mozilla/5.0 (Linux; Android ${os.osVersion}; ${os.device.model}) ${chromium} Mobile Safari/537.36 EdgA/${major}.0.${parseInt(full.split('.')[2] || '0', 10) || 2592}.${full.split('.')[3] || 88}`;
      if (os.platform === 'macos') return `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ${chromium} Safari/537.36 Edg/${major}.0.0.0`;
      if (os.platform === 'linux') return `Mozilla/5.0 (X11; Linux x86_64) ${chromium} Safari/537.36 Edg/${major}.0.0.0`;
      return `Mozilla/5.0 (Windows NT 10.0; Win64; x64) ${chromium} Safari/537.36 Edg/${major}.0.0.0`;
    }
    // chrome
    if (os.platform === 'android') return `Mozilla/5.0 (Linux; Android ${os.osVersion}; ${os.device.model}) ${chromium} Mobile Safari/537.36`;
    if (os.platform === 'ios') return `Mozilla/5.0 (iPhone; CPU iPhone OS ${os.osVersion.replace(/\./g, '_')} like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/${major}.0.${full.split('.')[2] || '0'}.${full.split('.')[3] || '0'} Mobile/15E148 Safari/604.1`;
    if (os.platform === 'macos') return `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ${chromium} Safari/537.36`;
    if (os.platform === 'linux') return `Mozilla/5.0 (X11; Linux x86_64) ${chromium} Safari/537.36`;
    return `Mozilla/5.0 (Windows NT 10.0; Win64; x64) ${chromium} Safari/537.36`;
  }

  const CH_PLATFORM = {
    windows: { platform: 'Windows', arch: 'x86', bitness: '64', uaPlatform: 'Windows' },
    macos: { platform: 'macOS', arch: 'arm', bitness: '64' },
    linux: { platform: 'Linux', arch: 'x86', bitness: '64' },
    android: { platform: 'Android', arch: '', bitness: '' },
    ios: { platform: 'iOS', arch: 'arm', bitness: '64' },
  };

  function buildCh(p, rng) {
    const b = p.browser;
    if (!['chrome', 'edge'].includes(b.family)) return null;
    const os = p.os;
    const meta = CH_PLATFORM[os.platform];
    const brand = b.family === 'edge' ? 'Microsoft Edge' : 'Google Chrome';
    const grease = rng.pick(['Not_A Brand', 'Not A(Brand', 'Not?A_Brand', 'Not)A;Brand']);
    const greaseV = rng.pick(['8', '24', '99']);
    const brands = [
      { brand: 'Chromium', version: String(b.major) },
      { brand, version: String(b.major) },
      { brand: grease, version: greaseV },
    ];
    if (b.major >= 130) brands.push({ brand: grease, version: rng.pick(['24', '99']) });
    const full = b.fullVersion || '';
    const fullVersionList = [
      { brand: 'Chromium', version: full },
      { brand, version: full },
      { brand: grease, version: greaseV + '.0.0.0' },
    ];
    return {
      brands,
      fullVersionList,
      fullVersion: full,
      mobile: os.platform === 'android' || os.platform === 'ios',
      platform: ['windows', 'macos', 'linux'].includes(os.platform) ? meta.platform : (os.platform === 'android' ? 'Android' : 'iOS'),
      platformVersion: os.platform === 'windows' ? os.chVersion || '15.0.0'
        : os.platform === 'android' ? (os.osVersion + '.0.0')
        : os.platform === 'macos' ? os.osVersion
        : os.platform === 'ios' ? os.osVersion
        : os.chVersion || '6.5.0',
      architecture: meta.arch,
      bitness: meta.bitness,
      model: os.platform === 'android' ? ((os.device && os.device.model) || '') : '',
      wow64: false,
      formFactors: os.platform === 'android' || os.platform === 'ios' ? ['Mobile'] : ['Desktop'],
    };
  }

  /* ------------------------------------------------------- fonts */
  function fontSetFor(p) {
    const os = p.os.platform;
    if (os === 'windows') return FONT_SETS[p.os.fontSet] || FONT_SETS.windows11;
    if (os === 'macos') return FONT_SETS.mac;
    if (os === 'linux') return FONT_SETS.linux;
    if (os === 'android') return FONT_SETS.android;
    if (os === 'ios') return FONT_SETS.ios;
    return FONT_SETS.windows11;
  }

  /* ------------------------------------------------------- plugins */
  function pluginsFor(family) {
    if (family === 'firefox') return [];
    if (family === 'safari') return [{ name: 'WebKit built-in PDF', filename: 'internal-pdf-viewer', description: 'Portable Document Format' }];
    if (family === 'edge') return [
      { name: 'PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
      { name: 'Chrome PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
      { name: 'Chromium PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
      { name: 'Microsoft Edge PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
      { name: 'WebKit built-in PDF', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
    ];
    return [
      { name: 'PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
      { name: 'Chrome PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
      { name: 'Chromium PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
      { name: 'Microsoft Edge PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
      { name: 'WebKit built-in PDF', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
    ];
  }

  /* ------------------------------------------------------- private IP */
  function privateIp(rng, mobile) {
    if (mobile) return `10.${rng.int(0, 3)}.${rng.int(1, 254)}.${rng.int(2, 254)}`;
    const kind = rng.weighted(['192', '10', '172'], (k) => (k === '192' ? 7 : k === '10' ? 2 : 1));
    if (kind === '192') return `192.168.${rng.pick([0, 1, 1, 1, 2, 8, 16])}.${rng.int(2, 254)}`;
    if (kind === '10') return `10.0.${rng.int(0, 1)}.${rng.int(2, 254)}`;
    return `172.${rng.int(16, 31)}.${rng.int(0, 3)}.${rng.int(2, 254)}`;
  }

  /* ============================================================ GENERATOR */
  const OS_WEIGHTS = { windows: 44, android: 27, macos: 13, ios: 11, linux: 5 };

  function chooseArchetype(rng, opts) {
    const wantMobile = opts.deviceType === 'mobile' ? true : opts.deviceType === 'desktop' ? false : null;
    let candidates = ['windows', 'android', 'macos', 'ios', 'linux'];
    if (opts.os) candidates = [opts.os];
    if (wantMobile) candidates = candidates.filter((c) => c === 'android' || c === 'ios');
    if (wantMobile === false) candidates = candidates.filter((c) => c !== 'android' && c !== 'ios');
    if (!candidates.length) candidates = ['windows'];
    const platform = rng.weighted(candidates, (c) => OS_WEIGHTS[c] || 1);
    return platform;
  }

  function pickBrowser(rng, platform, opts) {
    const list = {
      windows: ['chrome', 'chrome', 'chrome', 'edge', 'edge', 'firefox'],
      macos: ['chrome', 'chrome', 'safari', 'safari', 'edge'],
      linux: ['chrome', 'chrome', 'firefox'],
      android: ['chrome', 'chrome', 'chrome', 'firefox'],
      ios: ['safari', 'safari', 'safari'],
    }[platform].slice();
    if (opts.browser && list.includes(opts.browser)) return opts.browser;
    if (opts.browser) return opts.browser; // allow unusual but validate later
    return rng.pick(list);
  }

  function randomCountry(rng, opts) {
    if (opts.country) return opts.country;
    const pool = GEO_NAMES.filter((c) => GEO[c].length && LOCALES[c] && GEO[c].some((g) => TZ_BY_ID[g[3]]));
    // weight realistic traffic: US/Europe comparatively more common
    const w = (c) => (c === 'US' ? 18 : c === 'GB' ? 9 : c === 'DE' ? 8 : c === 'FR' ? 6 : c === 'CA' ? 5 : c === 'NL' ? 4 : 3);
    return rng.weighted(pool, w);
  }

  function pickPlace(rng, country, tzFilter) {
    let places = GEO[country].filter((g) => TZ_BY_ID[g[3]]);
    if (tzFilter) places = places.filter((g) => g[3] === tzFilter);
    if (!places.length) places = GEO[country].filter((g) => TZ_BY_ID[g[3]]);
    return rng.pick(places);
  }

  function pickProxy(rng, country) {
    const cat = PROXY_CATALOG[country];
    if (!cat || !cat.length) return null;
    return rng.pick(cat);
  }

  /* fallback demo endpoint so the chain (proxy.country === geo.country and
     proxy.city === geo.city) always stays closed for every country.
     Replace host with your real residential/mobile endpoint in production. */
  function demoProxy(rng, country, city) {
    const meta = GEO_META[country] || { orgs: ['ISP'] };
    const slug = String(city).split(',')[0].toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 12) || 'gw';
    return {
      host: `gw.${slug}${rng.int(1, 9)}.sockpool.net`,
      port: 8000 + rng.int(0, 3) * 1000,
      country,
      city,
      isp: rng.pick(meta.orgs),
      type: rng.chance(0.18) ? 'mobile' : 'residential',
      asn: rng.int(1200, 64500),
    };
  }

  function pickAndroidDevice(rng, browserFamily) {
    const pool = ANDROID_DEVICES.filter((d) => d.ids.includes(browserFamily));
    return rng.pick(pool.length ? pool : ANDROID_DEVICES.filter((d) => d.ids.includes('chrome')));
  }

  /* main entry */
  function generate(opts = {}) {
    const seed = opts.seed || U.uid('seed');
    const rng = makeRng(seed);
    const platform = opts.os && ['windows', 'macos', 'linux', 'android', 'ios'].includes(opts.os) ? opts.os : chooseArchetype(rng, opts);
    const browserFamily = pickBrowser(rng, platform, opts);
    const country = randomCountry(rng, opts);
    const now = new Date();
    const mobile = platform === 'android' || platform === 'ios';

    /* -------- timezone & location (only zones that belong to the country) */
    const places = GEO[country].filter((g) => TZ_BY_ID[g[3]]);
    const chosenPlace = opts.city ? (places.find((g) => g[0] === opts.city) || rng.pick(places)) : rng.pick(places);
    let [city, lat, lon, tzId] = chosenPlace;
    const zone = TZ_BY_ID[tzId];
    let countryCode = country;

    /* -------- proxy / network */
    const netMode = opts.network || 'proxy';
    let proxy = null;
    if (netMode === 'proxy') {
      proxy = opts.proxyPreset ? { ...opts.proxyPreset } : (pickProxy(rng, country) || demoProxy(rng, country, city));
      if (proxy) { // align geo with proxy city if possible
        const match = places.find((g) => g[0].toLowerCase().startsWith(String(proxy.city || '').split(',')[0].toLowerCase()));
        if (match) { [city, lat, lon, tzId] = match; }
        else { proxy.country = country; }
      }
    }
    const zone2 = TZ_BY_ID[tzId] || zone;
    const off = tzOffset(zone2, now);
    const abbr = tzAbbr(zone2, now);

    /* -------- OS block */
    let os;
    if (platform === 'windows') {
      const variant = opts.osVariant || (rng.chance(0.55) ? 'win11' : 'win10');
      const a = WIN_ARCH[variant];
      const arche = rng.pick(DEVICE_MODELS.windows.filter((m) => (variant === 'win11' ? m.os === 'Windows 11' : m.os === 'Windows 10')));
      const screen = rng.pick(arche.screens);
      const gpuTier = rng.pick(arche.gpuTier);
      os = {
        platform, osName: a.label.split(' · ')[0], osVersion: a.build, build: a.build, arch: a.arch,
        archId: variant, chVersion: a.chVersion, fontSet: a.fontSet, platformString: a.platform,
        archetype: arche.name, screen: { width: screen[0], height: screen[1], dpr: screen[2] },
        cores: rng.pick(arche.cores), ramGB: rng.pick(arche.ram), gpuTier,
      };
    } else if (platform === 'macos') {
      const key = opts.osVariant && MAC_ARCH[opts.osVariant] ? opts.osVariant : rng.pick(Object.keys(MAC_ARCH));
      const a = MAC_ARCH[key];
      const arche = DEVICE_MODELS.macos.find((m) => m.gpu === a.gpu && key.includes(m.name.split(' ')[0])) || DEVICE_MODELS.macos.find((m) => m.gpu === a.gpu) || DEVICE_MODELS.macos[0];
      const screen = rng.pick(arche.screens.filter(Boolean)) || arche.screens[0];
      os = { platform, osName: 'macOS', osVersion: a.osVersion, build: a.osVersion, arch: a.arch, archId: key, chVersion: a.osVersion, fontSet: 'mac', platformString: 'MacIntel', archetype: key, screen: { width: screen[0], height: screen[1], dpr: screen[2] }, cores: a.cores, ramGB: rng.pick(a.ram), gpuKey: a.gpu, safariVersion: a.safari };
    } else if (platform === 'linux') {
      const key = opts.osVariant && LINUX_ARCH[opts.osVariant] ? opts.osVariant : rng.pick(Object.keys(LINUX_ARCH));
      const a = LINUX_ARCH[key];
      const arche = key === 'ubuntu' ? DEVICE_MODELS.linux[0] : DEVICE_MODELS.linux[1];
      const screen = rng.pick(arche.screens);
      os = { platform, osName: key === 'ubuntu' ? 'Ubuntu' : 'Fedora Linux', osVersion: a.osVersion, build: a.osVersion, arch: a.arch, archId: key, chVersion: a.chVersion, fontSet: 'linux', platformString: a.platform, archetype: arche.name, screen: { width: screen[0], height: screen[1], dpr: screen[2] }, cores: rng.pick(arche.cores), ramGB: rng.pick(arche.ram), gpuSet: a.gpuSet };
    } else if (platform === 'android') {
      const dev = opts.deviceModel ? (ANDROID_DEVICES.find((d) => d.model === opts.deviceModel) || pickAndroidDevice(rng, browserFamily)) : pickAndroidDevice(rng, browserFamily);
      const av = androidVersionFor(dev, rng);
      const cssW = Math.round(dev.screen[0] / dev.dpr);
      const cssH = Math.round(dev.screen[1] / dev.dpr);
      os = {
        platform, osName: 'Android', osVersion: av.v, apiLevel: av.api, build: `UP1A.${String(230100 + rng.int(1, 60))}.${U.pad(rng.int(1, 30), 3)}`, arch: 'aarch64', archId: 'android', chVersion: av.v + '.0.0',
        fontSet: 'android', platformString: 'Linux armv81', archetype: dev.name,
        device: { model: dev.model, name: dev.name, brand: dev.brand, chip: dev.chip, ramGB: dev.ram },
        screen: { width: cssW, height: cssH, dpr: dev.dpr, physical: dev.screen },
        cores: dev.cores, ramGB: dev.ram, gpuKey: dev.gpu,
      };
    } else { // ios
      const dev = opts.deviceModel ? (IOS_DEVICES.find((d) => d.model === opts.deviceModel) || rng.pick(IOS_DEVICES)) : rng.pick(IOS_DEVICES);
      const iosV = opts.osVersion && dev.ios.includes(opts.osVersion) ? opts.osVersion : rng.pick(dev.ios);
      os = {
        platform, osName: 'iOS', osVersion: iosV, build: iosV, arch: 'arm64', archId: 'ios', chVersion: iosV, fontSet: 'ios', platformString: 'iPhone',
        archetype: dev.name, device: { model: dev.model, name: dev.name, brand: 'apple', chip: 'Apple A-Series', ramGB: dev.ram },
        screen: { width: dev.screen[0], height: dev.screen[1], dpr: dev.dpr }, cores: 6, ramGB: dev.ram, gpuKey: 'Apple GPU',
      };
    }

    /* -------- browser block: version derived from release train at "now" */
    let browser;
    if (browserFamily === 'safari') {
      const sv = os.platform === 'ios' ? os.osVersion : (os.safariVersion || '17.4.1');
      const [maj, min] = sv.split('.').map((x) => parseInt(x, 10));
      browser = { family: 'safari', name: 'Safari', engine: 'WebKit', major: maj, minor: min || 0, fullVersion: `${maj}.${min || 0}`, vendor: 'Apple Computer, Inc.' };
    } else {
      const train = releaseTrain(browserFamily, now);
      const full = browserFamily === 'firefox' ? `${train.major}.0` : chromeVersion(train.major, rng);
      browser = {
        family: browserFamily,
        name: BROWSERS[browserFamily].name,
        engine: BROWSERS[browserFamily].engine,
        major: browserFamily === 'firefox' ? train.major : parseInt(full.split('.')[0], 10),
        fullVersion: full,
        vendor: browserFamily === 'firefox' ? '' : 'Google Inc.',
      };
    }

    /* -------- GPU */
    let gpu;
    if (platform === 'android' || platform === 'ios') {
      const cat = platform === 'android' ? GPUS.android : GPUS.ios;
      gpu = cat.find((g) => g.device === os.gpuKey || g.webglRenderer === os.gpuKey || g.device.toLowerCase() === String(os.gpuKey).toLowerCase());
      if (!gpu) gpu = cat.find((g) => g.device.startsWith(String(os.gpuKey).slice(0, 6))) || cat[0];
    } else if (platform === 'macos') {
      gpu = GPUS.mac.find((g) => g.device === os.gpuKey) || GPUS.mac[0];
    } else if (platform === 'linux') {
      gpu = U.pickWeighted(GPUS.linux, rng);
    } else {
      gpu = U.pickWeighted(GPUS.win, rng, (g) => (g.tier === os.gpuTier ? 6 : g.tier === Math.max(0, os.gpuTier - 1) ? 2 : 0.25));
    }

    /* -------- languages */
    const primary = rng.pick(LOCALES[country] || ['en-US']);
    const langCode = LOCALE_META[primary][1];
    let languages = [primary];
    if (langCode !== 'en') languages.push(langCode);
    if (langCode !== 'en' && rng.chance(0.45)) languages.push('en-US', 'en');
    else if (langCode === 'en' && rng.chance(0.3)) languages.push('en');
    languages = [...new Set(languages)];

    /* -------- navigator */
    const nav = {
      platform: os.platformString,
      vendor: browser.vendor,
      product: 'Gecko',
      productSub: browser.family === 'firefox' ? '20100101' : '20030107',
      appName: 'Netscape',
      appVersion: buildUa({ browser, os }).replace('Mozilla/', ''),
      userAgent: buildUa({ browser, os }),
      language: languages[0],
      languages,
      hardwareConcurrency: os.cores,
      deviceMemory: Math.min(8, Math.pow(2, Math.floor(Math.log2(os.ramGB)))),
      maxTouchPoints: mobile ? 5 : (platform === 'macos' ? 0 : 0),
      cookieEnabled: true,
      doNotTrack: null,
      pdfViewerEnabled: browser.family !== 'firefox',
      webdriver: false,
      oscpu: browser.family === 'firefox' ? (platform === 'windows' ? 'Windows NT 10.0; Win64; x64' : platform === 'macos' ? 'Intel Mac OS X 10.15' : 'Linux x86_64') : undefined,
    };

    /* -------- display */
    const taskbar = platform === 'windows' ? (os.archId === 'win11' ? 48 : 40) : platform === 'macos' ? 25 : platform === 'linux' ? 27 : 0;
    const statusBar = mobile ? (platform === 'ios' ? 47 : 24) : 0;
    const disp = {
      width: os.screen.width,
      height: os.screen.height,
      availWidth: os.screen.width,
      availHeight: os.screen.height - taskbar - statusBar,
      innerWidth: Math.min(os.screen.width, mobile ? os.screen.width : os.screen.width - (rng.chance(0.3) ? 0 : 0)),
      innerHeight: os.screen.height - taskbar - statusBar - (mobile ? 105 : (platform === 'macos' ? 88 : 131)),
      dpr: os.screen.dpr,
      colorDepth: 24,
      pixelDepth: 24,
      orientation: mobile ? 'portrait-primary' : (os.screen.width >= os.screen.height ? 'landscape-primary' : 'portrait-primary'),
      colorGamut: platform === 'macos' || (platform === 'windows' && os.gpuTier >= 1) ? 'srgb' : 'srgb',
      prefersColorScheme: rng.pick(['light', 'light', 'dark']),
      prefersReducedMotion: false,
    };
    if (mobile) { disp.availHeight = os.screen.height - statusBar - 34; disp.innerHeight = os.screen.height - statusBar - 34 - 105; }

    /* -------- network */
    const connection = mobile ? {
      type: 'cellular', effectiveType: rng.pick(['4g', '4g', '5g']), downlink: rng.int(6, 24), rtt: rng.int(50, 180), saveData: false,
    } : {
      type: rng.pick(['wifi', 'ethernet']), effectiveType: '4g', downlink: rng.int(8, 30), rtt: rng.int(20, 90), saveData: false,
    };
    const network = {
      mode: netMode,
      proxy: proxy ? { host: proxy.host, port: proxy.port, protocol: 'socks5', country: proxy.country, city: proxy.city, isp: proxy.isp, type: proxy.type, asn: proxy.asn, username: '', password: '' } : null,
      ipMode: rng.pick(['city', 'city', 'country']),
      ipv4: true,
      ipv6: rng.chance(0.35),
      webrtc: 'disabled', // no public leak while a proxy is applied
      localIp: privateIp(rng, mobile),
      connection,
      latencyMs: rng.int(18, 90),
      jitterMs: rng.int(2, 18),
      failRate: +(rng.float(0, 2.5, 0.1)),
    };

    /* -------- privacy / fingerprint surface */
    const strict = opts.privacy === 'strict' || (opts.privacy !== 'off' && rng.chance(0.18));
    const extensions = [];
    if (!mobile && (browser.family === 'chrome' || browser.family === 'edge')) {
      if (strict) extensions.push({ ...CHROME_EXTENSIONS.find((e) => e.id === 'cjpalhdlnbpafiamejdnhcphjbkeiagm') });
      const pool = CHROME_EXTENSIONS.filter((e) => e.name !== 'uBlock Origin');
      const n = mobile ? 0 : rng.int(0, 2);
      extensions.push(...rng.picks(pool, n));
    }
    const privacy = {
      mode: strict ? 'strict' : (opts.privacy === 'off' ? 'off' : 'standard'),
      doNotTrack: strict,
      globalPrivacyControl: strict && rng.chance(0.6),
      blockAds: extensions.some((e) => /uBlock|AdBlock/.test(e.name)),
      trackers: strict ? 'strict' : 'standard',
    };
    nav.doNotTrack = privacy.doNotTrack ? '1' : null;

    const fingerprint = {
      canvas: 'noise',
      canvasNoiseSeed: rng.int(100000, 999999),
      canvasTextNoise: rng.chance(0.5) ? rng.int(100000, 999999) : null,
      webgl: 'native',
      webglNoiseSeed: rng.int(100000, 999999),
      audio: rng.chance(0.85) ? 'noise' : 'off',
      audioSeed: rng.int(100000, 999999),
      fontsMode: 'os-default',
      fonts: fontSetFor({ os }),
      fontOverride: [],
      plugins: pluginsFor(browser.family),
      clientRectsNoise: rng.chance(0.35),
      spoofTime: true,
      spoofTimezone: true,
      spoofLocale: true,
      spoofScreen: true,
      spoofWebRTC: true,
      spoofBattery: mobile,
      battery: mobile ? { charging: rng.chance(0.7), level: rng.float(0.21, 0.99) } : { charging: true, level: 1 },
      batteryMode: mobile ? 'live' : 'charging',
    };

    const storage = { localStorage: true, sessionStorage: true, indexedDB: true, quotaMB: mobile ? 5000 : rng.pick([10000, 15000, 20000]) };

    const behavior = {
      humanize: true,
      typingWpm: rng.int(32, 78),
      clickJitter: rng.int(1, 4),
      mouseCurve: 'bezier',
      scrollSpeed: rng.pick(['slow', 'normal', 'normal', 'fast']),
      dwellMin: rng.int(1, 4),
      dwellMax: rng.int(5, 14),
      gaussianNoise: true,
      warmupDays: rng.int(3, 7),
    };

    const geo = {
      country: countryCode,
      countryName: GEO_META[countryCode].name,
      city, region: city.split(',')[1] ? city.split(',')[1].trim() : '',
      lat: +lat.toFixed(4), lon: +lon.toFixed(4),
      accuracy: rng.int(120, 4200),
      tz: tzId,
      tzOffset: off,
      tzAbbr: abbr,
      tzLabel: tzLabel(zone2),
      currency: GEO_META[countryCode].currency,
    };

    const locale = {
      locale: primary,
      languageCode: langCode,
      languages,
      direction: dirOf(primary),
      hour12: hour12(primary),
      weekStart: GEO_META[countryCode].weekStart,
      currency: GEO_META[countryCode].currency,
      dateFormat: primary === 'en-US' ? 'M/D/YYYY' : 'D.M.YYYY',
      numberFormat: primary === 'en-US' ? '1,234.56' : '1.234,56',
      tz: tzId,
      timeFormat: hour12(primary) ? '12h' : '24h',
      firstDayOfWeek: GEO_META[countryCode].weekStart === 0 ? 'Sunday' : 'Monday',
      'dir': dirOf(primary),
    };

    /* ---------- assemble profile ---------- */
    const profile = {
      schema: SCHEMA_VERSION,
      id: U.uid('prf'),
      name: opts.name || nameFor(rng, countryCode),
      group: opts.group || '',
      tags: opts.tags || [],
      notes: '',
      seed,
      createdAt: U.nowISO(),
      updatedAt: U.nowISO(),
      os,
      browser,
      display: disp,
      hardware: {
        cpuArch: os.arch,
        cores: os.cores,
        ramGB: os.ramGB,
        gpu: { vendor: gpu.vendor, webglVendor: gpu.webglVendor, renderer: gpu.webglRenderer, unmaskedVendor: gpu.unmaskedVendor, unmaskedRenderer: gpu.unmaskedRenderer, device: gpu.device },
        maxTouchPoints: nav.maxTouchPoints,
        cameraCount: mobile ? 2 : rng.pick([0, 1, 1, 2]),
        microphoneCount: mobile ? rng.pick([1, 2]) : rng.pick([1, 1, 2]),
        speakerCount: mobile ? 3 : rng.pick([1, 2]),
      },
      navigator: nav,
      screen: { ...os.screen },
      clientHints: buildCh({ browser, os }, rng),
      geo,
      locale,
      network,
      privacy,
      fingerprint,
      extensions,
      storage,
      behavior,
      consistency: null, // filled after validation
    };

    profile.consistency = validate(profile);
    return profile;
  }

  function nameFor(rng, cc) {
    const adj = ['quiet', 'amber', 'north', 'velvet', 'silent', 'cobalt', 'lunar', 'cedar', 'misty', 'nova', 'iron', 'hollow', 'copper', 'silver', 'wild', 'urban', 'pale', 'solar', 'drift', 'orbit'];
    const noun = ['harbor', 'falcon', 'meadow', 'summit', 'ember', 'willow', 'atlas', 'delta', 'raven', 'garden', 'pine', 'valley', 'comet', 'shadow', 'coral', 'maple', 'thunder', 'river', 'stone', 'aurora'];
    return `${rng.pick(adj)}-${rng.pick(noun)}-${String(cc).toLowerCase()}${rng.int(10, 98)}`;
  }

  /* ============================================================ VALIDATOR */
  /* Returns { score, grade, errors:[], warnings:[], infos:[], checks:[{ok, id, label, detail}] } */
  function validate(p) {
    const errors = [], warnings = [], infos = [], checks = [];
    const err = (id, label, detail) => { errors.push({ id, label, detail }); checks.push({ ok: false, sev: 'error', id, label, detail }); };
    const warn = (id, label, detail) => { warnings.push({ id, label, detail }); checks.push({ ok: false, sev: 'warn', id, label, detail }); };
    const info = (id, label, detail) => { infos.push({ id, label, detail }); checks.push({ ok: true, sev: 'info', id, label, detail }); };
    const ok = (id, label) => checks.push({ ok: true, sev: 'pass', id, label });

    const os = p.os, b = p.browser, g = p.geo, n = p.navigator || {}, d = p.display || {}, z = TZ_BY_ID[g.tz];

    /* --- geographic / temporal coherence */
    if (!z) err('tz_invalid', 'Timezone نامعتبر', `«${g.tz}» در فهرست نواحی زمانی شناخته‌شده نیست.`);
    else {
      if (z.country !== g.country) err('tz_country', 'تایم‌زون با کشور IP هم‌خوان نیست', `IP: ${g.country} ولی تایم‌زون ${g.tz} مربوط به ${z.country} است — این اولین چیزی است که لو می‌رود.`);
      else ok('tz_country', 'تایم‌زون با کشور IP سازگار است');
      const place = (GEO[g.country] || []).find((x) => x[0] === g.city);
      if (place && place[3] !== g.tz) err('city_tz', 'تایم‌زون با شهر IP هم‌خوان نیست', `شهر ${g.city} در منطقهٔ ${place[3]} است ولی پروفایل ${g.tz} اعلام می‌کند.`);
      else if (place) ok('city_tz', 'تایم‌زون و شهر IP هم‌خوان‌اند');
      const nowOff = tzOffset(z, new Date());
      if (g.tzOffset !== nowOff) warn('tz_offset', 'آفست تایم‌زون به‌روز نیست', `ذخیره‌شده ${g.tzOffset} دقیقه، مقدار واقعی امروز ${nowOff} دقیقه (DST).`);
      const loc = p.locale || {};
      if (loc.tz && loc.tz !== g.tz) err('locale_tz', 'تایم‌زون locale با تایم‌زون شبکه یکی نیست', `${loc.tz} ≠ ${g.tz}`);
      else ok('locale_tz', 'تایم‌زون سیستم با تایم‌زون شبکه یکسان است');
      const langs = (loc.languages || n.languages || []);
      const primaryLang = (langs[0] || '').split('-')[0];
      if (primaryLang && !(LOCALES[g.country] || []).some((l) => l.startsWith(primaryLang)) && primaryLang !== 'en') warn('lang_country', 'زبان مرورگر با کشور IP نمی‌خواند', `کشور ${g.country} اما زبان اصلی «${langs[0]}» — ناسازگاری رایج.`);
      else ok('lang_country', 'زبان مرورگر با کشور IP سازگار است');
      if ((LOCALE_META[loc.locale] || [])[2] !== g.currency) warn('currency', 'واحد پول با کشور هم‌خوان نیست', `${g.currency} در برابر locale ${loc.locale}`);
      else ok('currency', 'واحد پول با کشور و locale سازگار است');
    }
    if (p.network && p.network.proxy && p.network.proxy.country !== g.country) err('proxy_country', 'کشور پروکسی با لوکیشن پروفایل نمی‌خواند', `پروکسی: ${p.network.proxy.country} / پروفایل: ${g.country}`);
    else if (p.network && p.network.proxy) ok('proxy_country', 'پروکسی با لوکیشن پروفایل هم‌خوان است');
    if (p.network && p.network.proxy && p.network.proxy.city && g.city && !String(g.city).toLowerCase().startsWith(String(p.network.proxy.city).split(',')[0].toLowerCase())) {
      info('proxy_city', 'شهر خروجی پروکسی با شهر اعلامی متفاوت است', 'اگر سرویس تشخیص IP دقت شهر داشته باشد، اختلاف شهر یک سیگنال ضعیف است.');
    }

    /* --- OS × browser */
    if (b.family === 'safari' && !['macos', 'ios'].includes(os.platform)) err('safari_os', 'Safari روی این سیستم‌عامل وجود ندارد', `Safari فقط روی macOS/iOS است، نه ${os.platform}.`);
    else if (b.family === 'safari') ok('safari_os', 'Safari روی سیستم‌عامل درست است');
    if (b.family === 'edge' && os.platform === 'ios') err('edge_os', 'Edge روی iOS با موتور متفاوت', 'Edge iOS در واقع WebKit است و UA آن باید EdgiOS باشد؛ پروفایل را با Safari یا Chrome جایگزین کنید.');
    if (['chrome', 'edge', 'firefox'].includes(b.family) && os.platform === 'ios') info('ios_engine', 'روی iOS همهٔ مرورگرها WebKit هستند', 'UA مرورگر باید با CriOS/FxiOS/EdgiOS و موتور WebKit نمایش داده شود.');
    if (!BROWSERS[b.family].platforms[os.platform]) err('browser_platform', 'این مرورگر برای سیستم‌عامل انتخاب نشده', `${b.name} نسخهٔ ${os.platform} ندارد.`);
    else ok('browser_platform', 'مرورگر با سیستم‌عامل سازگار است');

    /* --- UA coherence */
    const ua = n.userAgent || '';
    const majorFromUa = (() => {
      if (b.family === 'safari') { const m = ua.match(/Version\/(\d+)/); return m ? +m[1] : null; }
      if (b.family === 'firefox') { const m = ua.match(/Firefox\/(\d+)/); return m ? +m[1] : null; }
      const m = ua.match(/Chrome\/(\d+)/); return m ? +m[1] : null;
    })();
    if (majorFromUa !== b.major) err('ua_version', 'نسخهٔ UA با نسخهٔ مرورگر هم‌خوان نیست', `UA: ${majorFromUa} / profile: ${b.major}`);
    else ok('ua_version', 'UA با نسخهٔ مرورگر هم‌خوان است');
    if (os.platform === 'android' && !/Android/.test(ua)) err('ua_android', 'UA فاقد Android است', 'سیستم‌عامل اندروید است اما UA نشان نمی‌دهد.');
    if (os.platform === 'android' && os.device && b.family !== 'firefox' && !ua.includes(os.device.model)) err('ua_model', 'مدل دستگاه در UA نیست', `مدل ${os.device.model} در UA دیده نمی‌شود.`);
    if (os.platform === 'android' && !/Mobile/.test(ua) && b.family !== 'firefox') warn('ua_mobile', 'UA فاقد Mobile است', 'کروم اندروید باید «Mobile Safari» داشته باشد.');
    if (os.platform === 'ios' && !/iPhone OS /.test(ua)) warn('ua_ios', 'UA با iOS هم‌خوان نیست', 'الگوی «CPU iPhone OS» باید وجود داشته باشد.');
    if (os.platform === 'windows' && !/Windows NT 10\.0/.test(ua)) err('ua_windows', 'UA ویندوز نادرست است', 'نسخهٔ NT باید 10.0 باشد.');
    if (os.platform === 'macos' && !/Macintosh/.test(ua)) err('ua_mac', 'UA مک نادرست است', 'UA باید Macintosh داشته باشد.');
    if (n.appVersion && !n.appVersion.endsWith(ua.replace('Mozilla/', ''))) warn('appversion', 'appVersion با UA هم‌خوان نیست', 'مقدار باید دقیقاً ادامهٔ UA بدون «Mozilla/» باشد.');
    else ok('appversion', 'appVersion با UA هم‌خوان است');
    if (n.platform !== os.platformString) err('nav_platform', 'navigator.platform نادرست است', `${n.platform} باید ${os.platformString} باشد.`);
    else ok('nav_platform', 'navigator.platform با OS هم‌خوان است');

    /* --- client hints */
    if (['chrome', 'edge'].includes(b.family)) {
      const ch = p.clientHints;
      if (!ch) {
        const needsCh = b.family === 'edge' || (b.family === 'chrome' && b.major >= 89);
        if (needsCh) err('ch_missing', 'Client Hints وجود ندارد', `${b.name} باید userAgentData داشته باشد.`);
        else info('ch_missing', 'Client Hints غایب برای نسخهٔ قدیمی', 'کروم پیش از M89 واقعاً UA-CH نداشت.');
      }
      else {
        if (ch.fullVersion !== b.fullVersion) warn('ch_fullversion', 'uaFullVersion با نسخهٔ کامل هم‌خوان نیست', `${ch.fullVersion} ≠ ${b.fullVersion}`);
        const wantPlat = { windows: 'Windows', macos: 'macOS', linux: 'Linux', android: 'Android', ios: 'iOS' }[os.platform];
        if (ch.platform !== wantPlat) err('ch_platform', 'Client Hints platform با OS نمی‌خواند', `${ch.platform} ≠ ${wantPlat}`);
        else ok('ch_platform', 'Client Hints platform با OS هم‌خوان است');
        if (os.platform === 'windows' && ch.platformVersion !== os.chVersion) err('ch_winver', 'platformVersion ویندوز نادرست است', `باید ${os.chVersion} باشد.`);
        if (os.platform === 'macos' && ch.platformVersion !== os.osVersion) warn('ch_macver', 'platformVersion مک با OS هم‌خوان نیست', `${ch.platformVersion} ≠ ${os.osVersion}`);
        if (os.platform === 'android' && os.device && ch.model !== os.device.model) err('ch_model', 'مدل دستگاه در Client Hints نادرست است', `${ch.model} ≠ ${os.device.model}`);
        if (ch.mobile !== (os.platform === 'android' || os.platform === 'ios')) err('ch_mobile', 'پرچم mobile در Client Hints نادرست است', 'باید با موبایل/دسکتاپ بودن دستگاه هم‌خوان باشد.');
        if (ch.architecture && ch.architecture !== (os.arch === 'arm' || os.arch === 'arm64' ? 'arm' : 'x86')) warn('ch_arch', 'معماری در Client Hints ناسازگار است', `${ch.architecture}`);
      }
    } else if (p.clientHints) {
      err('ch_forbidden', 'Client Hints روی این مرورگر وجود ندارد', `${b.name} از User-Agent Client Hints پشتیبانی نمی‌کند — وجود آن یک ناسازگاری آشکار است.`);
    } else ok('ch_forbidden', 'مرورگر بدون Client Hints درست است');

    /* --- display / hardware */
    const scr = p.screen || {};
    if (d.width !== scr.width || d.height !== scr.height) err('screen_mismatch', 'screen.width/height با پیکربندی نمی‌خواند', 'مقادیر باید یکسان باشند.');
    else ok('screen_mismatch', 'رزولوشن screen یکدست است');
    if (d.dpr !== Number(scr.dpr)) err('dpr', 'devicePixelRatio با نمایشگر هم‌خوان نیست', `${d.dpr} ≠ ${scr.dpr}`);
    else ok('dpr', 'DPR با نمایشگر هم‌خوان است');
    if (os.platform === 'android') {
      const cssW = Math.round(scr.width), cssH = Math.round(scr.height);
      if (cssW > 800 || cssH > 1400) warn('android_screen', 'رزولوشن اندروید غیرعادی است', `CSS: ${cssW}×${cssH} — CSS پیکسل اندروید باید در حدود 360–430 باشد.`);
      else ok('android_screen', 'رزولوشن CSS اندروید طبیعی است');
      if (d.innerWidth > cssW || d.innerHeight > cssH) warn('inner_gt_screen', 'innerWidth بزرگ‌تر از screen است', 'viewport نمی‌تواند از صفحه بزرگ‌تر باشد.');
      if (n.maxTouchPoints !== 5) err('touch_mobile', 'maxTouchPoints یک دستگاه لمسی باید 5 باشد', `مقدار فعلی ${n.maxTouchPoints}`);
      else ok('touch_mobile', 'قابلیت لمس با دستگاه موبایل هم‌خوان است');
    } else {
      if (n.maxTouchPoints > 0) warn('touch_desktop', 'دسکتاپ با touch point', 'دسکتاپ‌ها معمولاً maxTouchPoints=0 دارند؛ اگر لمسی نیست صفر بگذارید.');
      else ok('touch_desktop', 'دسکتاپ بدون لمس (طبیعی)');
      if (d.innerWidth > scr.width) warn('inner_gt_screen', 'innerWidth بزرگ‌تر از screen است', 'رزولوشن داخلی بزرگ‌تر از نمایشگر است.');
      const knownScreens = (DEVICE_MODELS[os.platform === 'windows' ? 'windows' : os.platform === 'macos' ? 'macos' : 'linux'] || []).flatMap((m) => (m.screens || []).map((s) => `${s[0]}x${s[1]}@${s[2]}`));
      const combo = `${scr.width}x${scr.height}@${scr.dpr}`;
      if (knownScreens.length && ![...knownScreens, `${scr.width}x${scr.height}@1`, `${scr.width}x${scr.height}`].includes(combo)) warn('screen_rare', 'ترکیب رزولوشن/DPR کمیاب است', combo + ' در الگوهای رایج دستگاه‌های این OS نیست.');
      else ok('screen_rare', 'ترکیب رزولوشن/DPR طبیعی است');
    }
    if (n.hardwareConcurrency !== os.cores) err('cores', 'hardwareConcurrency با مشخصات CPU هم‌خوان نیست', `${n.hardwareConcurrency} ≠ ${os.cores}`);
    else ok('cores', 'تعداد هسته‌ها یکدست است');
    const expectMem = Math.min(8, Math.pow(2, Math.floor(Math.log2(os.ramGB))));
    if (n.deviceMemory !== expectMem) warn('memory', 'deviceMemory با حافظهٔ دستگاه هم‌خوان نیست', `${n.deviceMemory} GB در برابر ${os.ramGB} GB واقعی (سقف API = 8).`);
    else ok('memory', 'حافظهٔ اعلامی با مشخصات دستگاه هم‌خوان است');

    const hw = p.hardware || {};
    if (!hw.gpu || !hw.gpu.renderer) err('gpu_missing', 'اطلاعات GPU ناقص است', 'WebGL renderer لازم است.');
    else {
      const r = hw.gpu.renderer;
      if (os.platform === 'android' && /Direct3D|NVIDIA|Intel|AMD Radeon RX/.test(r) && !/Adreno|Mali|Xclipse|PowerVR/.test(r)) err('gpu_android', 'GPU با موبایل ناسازگار است', `renderer «${r}» مخصوص دسکتاپ است.`);
      else if ((os.platform === 'windows') && /Adreno|Mali|Apple/.test(r)) err('gpu_win', 'GPU موبایل روی ویندوز', `renderer «${r}»`);
      else if (os.platform === 'macos' && /Direct3D|Adreno/.test(r)) err('gpu_mac', 'GPU ویندوزی/موبایلی روی مک', `renderer «${r}»`);
      else ok('gpu_ok', 'GPU با سیستم‌عامل و قابلیت‌ها هم‌خوان است');
      if (os.platform === 'android') {
        const model = (GPUS.android.find((x) => x.device === hw.gpu.device) || {});
        if (os.device && /Pixel/.test(os.device.name) && /Adreno/.test(r)) warn('gpu_pixel', 'ترکیب Pixel + Adreno کمیاب است', 'پیکسل‌ها معمولاً Mali دارند؛ ولی سری‌های قدیمی‌تر ممکن است متفاوت باشند.');
      }
    }
    if (os.platform === 'android' && p.fingerprint && Array.isArray(p.fingerprint.fonts) && p.fingerprint.fonts.length > 60) warn('fonts_android', 'لیست فونت اندروید بیش از حد بزرگ است', 'اندروید معمولاً فونت‌های سیستمی محدود دارد.');
    else ok('fonts_ok', 'فونت‌ها با سیستم‌عامل هم‌خوان‌اند');
    if (p.fingerprint && p.fingerprint.fontsMode === 'custom' && p.fingerprint.fontOverride && p.fingerprint.fontOverride.length === 0) warn('fonts_custom_empty', 'حالت custom بدون فونت', 'لیست سفارشی خالی است.');

    /* --- plugins / extensions */
    if (b.family === 'firefox' && p.fingerprint && (p.fingerprint.plugins || []).length > 0) err('plugins_ff', 'Firefox نباید PDF plugin کروم داشته باشد', 'لیست plugins باید خالی یا فقط PDF.js باشد.');
    else ok('plugins_ok', 'لیست pluginها با مرورگر هم‌خوان است');
    if (['android', 'ios'].includes(os.platform) && (p.extensions || []).length > 0) err('ext_mobile', 'افزونهٔ کروم روی موبایل', 'کروم اندروید/آی‌او‌اس افزونه ندارد.');
    else ok('ext_ok', 'افزونه‌ها با پلتفرم سازگارند');
    if (b.family === 'firefox' && (p.extensions || []).length) warn('ext_ff', 'افزونه‌های کروم در فایرفاکس', 'شناسه‌های افزونه برای Firefox معتبر نیستند.');

    /* --- network */
    const net = p.network || {};
    if (net.mode === 'proxy' && !net.proxy) warn('proxy_missing', 'حالت پروکسی بدون پروکسی', 'پروفایل روی IP واقعی اجرا می‌شود؛ WebRTC هم باید محدود بماند.');
    if (net.webrtc === 'disabled' && net.mode === 'proxy') ok('webrtc_ok', 'WebRTC بدون نشتی پیکربندی شده');
    if (net.webrtc !== 'disabled' && net.mode === 'proxy' && /^(\d{1,3}\.){3}\d{1,3}$/.test(net.localIp || '')) {
      const isPrivate = /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|127\.)/.test(net.localIp);
      if (!isPrivate) err('webrtc_leak', 'WebRTC آدرس عمومی را لو می‌دهد', `localIp=${net.localIp} عمومی است و IP واقعی/پروکسی را افشا می‌کند.`);
      else ok('webrtc_local', 'WebRTC فقط IP خصوصی LAN را نشان می‌دهد');
    }
    if ((os.platform === 'android' || os.platform === 'ios') && net.connection && net.connection.type !== 'cellular' && os.platform === 'android') warn('conn_mobile', 'نوع اتصال با موبایل هم‌خوان نیست', 'برای موبایل نوع اتصال cellular طبیعی‌تر است.');
    else ok('conn_ok', 'مشخصات اتصال منطقی است');

    /* --- consistency of privacy */
    if (p.privacy) {
      if (p.privacy.doNotTrack !== (n.doNotTrack === '1')) err('dnt', 'doNotTrack بین بخش‌ها ناسازگار است', 'privacy.doNotTrack با navigator.doNotTrack یکی نیست.');
      else ok('dnt', 'پرچم Do Not Track هم‌خوان است');
      if (p.privacy.blockAds && !(p.extensions || []).some((e) => /uBlock|AdBlock/.test(e.name))) warn('adblock', 'ادعای بلاک تبلیغات بدون افزونه', 'blockAds=true اما هیچ مسدودکننده‌ای نصب نیست.');
      else ok('adblock', 'وضعیت مسدودسازی با افزونه‌ها هم‌خوان است');
    }

    /* --- score */
    const total = Math.max(1, checks.length);
    const pass = checks.filter((c) => c.sev === 'pass').length + checks.filter((c) => c.sev === 'info').length * 0.5;
    const penalty = errors.length * 16 + warnings.length * 2.5;
    const score = Math.max(0, Math.min(100, Math.round((pass / total) * 100 - penalty)));
    const grade = score >= 92 && errors.length === 0 ? 'A' : score >= 80 && errors.length === 0 ? 'B' : score >= 65 ? 'C' : score >= 45 ? 'D' : 'F';
    return { score, grade, errors, warnings, infos, checks, at: U.nowISO() };
  }

  /* ============================================================ AUTO-FIX */
  /* Re-derives the entire dependent surface from (country, city, os, device, browser).
     این تابع تنها چیزی است که وقتی کاربر فیلدی را دستی عوض می‌کند اجرا می‌شود. */
  function repair(p) {
    const q = U.clone(p);
    q.network = q.network || {};
    q.fingerprint = q.fingerprint || {};
    q.hardware = q.hardware || {};
    q.navigator = q.navigator || {};

    const rng0 = makeRng(q.seed || q.id);
    /* 1) country → city → timezone */
    const cc = q.geo.country;
    const places = (GEO[cc] || []).filter((g) => TZ_BY_ID[g[3]]);
    if (!places.length) { q.geo.country = 'US'; return repair(q); }
    let place = places.find((g) => g[0] === q.geo.city);
    if (!place) {
      const z = TZ_BY_ID[q.geo.tz];
      place = places.find((g) => g[3] === q.geo.tz) || places[0];
    }
    q.geo.city = place[0];
    q.geo.lat = +place[1].toFixed(4); q.geo.lon = +place[2].toFixed(4);
    q.geo.tz = place[3];
    q.geo.countryName = GEO_META[cc].name;
    q.geo.currency = GEO_META[cc].currency;
    const zone = TZ_BY_ID[q.geo.tz];
    q.geo.tzOffset = tzOffset(zone, new Date());
    q.geo.tzAbbr = tzAbbr(zone, new Date());
    q.geo.tzLabel = tzLabel(zone);

    /* 2) locale from country (keep user's chosen locale if compatible) */
    if (q.locale) {
      const allowed = LOCALES[cc] || ['en-US'];
      if (!allowed.includes(q.locale.locale)) q.locale.locale = allowed[0];
      q.locale.tz = q.geo.tz;
      q.locale.currency = GEO_META[cc].currency;
      q.locale.languages = q.navigator.languages && q.navigator.languages.length ? q.navigator.languages : [q.locale.locale, LOCALE_META[q.locale.locale][1]];
    }

    /* 3) proxy alignment */
    if (q.network.mode === 'proxy' && !q.network.proxy) {
      q.network.proxy = demoProxy(rng0, cc, q.geo.city);
    }
    if (q.network.proxy) {
      const pc = q.network.proxy;
      if (pc.country !== cc) { q.network.proxy = demoProxy(rng0, cc, q.geo.city); }
      else if (pc.city && !String(q.geo.city).startsWith(String(pc.city).split(',')[0])) {
        const match = places.find((g) => g[0].startsWith(String(pc.city).split(',')[0]));
        if (match) { q.geo.city = match[0]; q.geo.lat = match[1]; q.geo.lon = match[2]; q.geo.tz = match[3]; q.locale.tz = match[3]; }
        else q.network.proxy = null;
      }
    }

    /* 4) browser compat */
    if (q.browser.family === 'safari' && !['macos', 'ios'].includes(q.os.platform)) q.browser.family = 'chrome';
    if (q.browser.family === 'edge' && q.os.platform === 'ios') q.browser.family = 'safari';
    if (q.browser.family === 'safari' && q.browser.major > 30) { /* keep */ }
    if (!BROWSERS[q.browser.family].platforms[q.os.platform]) q.browser.family = q.os.platform === 'android' ? 'chrome' : q.os.platform === 'ios' ? 'safari' : 'chrome';

    /* 4.5) if platform was flipped to mobile, rebuild the device block */
    if (q.os.platform === 'android') {
      if (!q.os.device || !q.os.device.model) {
        const dev = rng0.pick(ANDROID_DEVICES);
        const av = androidVersionFor(dev, rng0);
        q.os.device = { model: dev.model, name: dev.name, brand: dev.brand, chip: dev.chip, ramGB: dev.ram };
        q.os.osVersion = av.v; q.os.apiLevel = av.api;
        q.os.screen = { width: Math.round(dev.screen[0] / dev.dpr), height: Math.round(dev.screen[1] / dev.dpr), dpr: dev.dpr, physical: dev.screen };
        q.os.cores = dev.cores; q.os.ramGB = dev.ram; q.os.gpuKey = dev.gpu;
        q.screen = { ...q.os.screen };
      }
      q.os.platformString = 'Linux armv81';
      q.os.osName = 'Android';
    } else if (q.os.platform === 'ios') {
      if (!q.os.device) {
        const dev = rng0.pick(IOS_DEVICES);
        q.os.device = { model: dev.model, name: dev.name, brand: 'apple', chip: 'Apple A-Series', ramGB: dev.ram };
        q.os.osVersion = rng0.pick(dev.ios);
        q.os.screen = { width: dev.screen[0], height: dev.screen[1], dpr: dev.dpr };
        q.screen = { ...q.os.screen };
        q.os.cores = 6; q.os.ramGB = dev.ram; q.os.gpuKey = 'Apple GPU';
      }
      q.os.platformString = 'iPhone';
      q.os.osName = 'iOS';
      q.browser.family = q.browser.family === 'firefox' || q.browser.family === 'edge' ? 'safari' : q.browser.family;
      if (q.browser.family !== 'safari') q.browser.family = 'safari';
    } else {
      q.os.platformString = q.os.platform === 'windows' ? 'Win32' : q.os.platform === 'macos' ? 'MacIntel' : 'Linux x86_64';
    }

    /* 5) navigator surface from OS + browser */
    const b = q.browser;
    q.navigator.platform = q.os.platformString;
    q.navigator.vendor = b.family === 'firefox' ? '' : b.family === 'safari' ? 'Apple Computer, Inc.' : 'Google Inc.';
    q.navigator.userAgent = buildUa(q);
    q.navigator.appVersion = q.navigator.userAgent.replace('Mozilla/', '');
    q.navigator.productSub = b.family === 'firefox' ? '20100101' : '20030107';
    q.navigator.hardwareConcurrency = q.os.cores;
    q.navigator.deviceMemory = Math.min(8, Math.pow(2, Math.floor(Math.log2(q.os.ramGB))));
    q.navigator.maxTouchPoints = (q.os.platform === 'android' || q.os.platform === 'ios') ? 5 : 0;
    q.hardware.cores = q.os.cores; q.hardware.ramGB = q.os.ramGB;
    q.hardware.maxTouchPoints = q.navigator.maxTouchPoints;
    q.navigator.pdfViewerEnabled = b.family !== 'firefox';
    q.navigator.doNotTrack = q.privacy && q.privacy.doNotTrack ? '1' : null;

    /* 6) client hints */
    const rng = makeRng(q.seed || q.id);
    q.clientHints = buildCh(q, rng);

    /* 7) display */
    const scr = q.screen || { width: 1920, height: 1080, dpr: 1 };
    const mobile = q.os.platform === 'android' || q.os.platform === 'ios';
    const taskbar = q.os.platform === 'windows' ? (q.os.archId === 'win11' ? 48 : 40) : q.os.platform === 'macos' ? 25 : q.os.platform === 'linux' ? 27 : 0;
    const statusBar = mobile ? (q.os.platform === 'ios' ? 47 : 24) : 0;
    q.display.width = scr.width; q.display.height = scr.height; q.display.dpr = scr.dpr;
    q.display.availWidth = scr.width;
    q.display.availHeight = mobile ? scr.height - statusBar - 34 : scr.height - taskbar;
    q.display.innerWidth = mobile ? scr.width : Math.min(scr.width, q.display.width);
    q.display.innerHeight = (mobile ? scr.height - statusBar - 34 - 105 : Math.max(320, scr.height - taskbar - 131));
    q.display.orientation = mobile || scr.width < scr.height ? 'portrait-primary' : 'landscape-primary';

    /* 8) GPU */
    if (q.os.platform === 'android') {
      const cat = GPUS.android;
      let g = cat.find((x) => x.device.toLowerCase() === String(q.os.gpuKey || '').toLowerCase()) || cat[0];
      q.hardware.gpu = { vendor: g.vendor, webglVendor: g.webglVendor, renderer: g.webglRenderer, unmaskedVendor: g.unmaskedVendor, unmaskedRenderer: g.unmaskedRenderer, device: g.device };
    } else if (q.os.platform === 'ios') {
      const g = GPUS.ios[0];
      q.hardware.gpu = { vendor: g.vendor, webglVendor: g.webglVendor, renderer: g.webglRenderer, unmaskedVendor: g.unmaskedVendor, unmaskedRenderer: g.unmaskedRenderer, device: g.device };
    } else if (q.os.platform === 'macos') {
      const g = GPUS.mac.find((x) => x.device === q.os.gpuKey) || GPUS.mac[0];
      q.hardware.gpu = { vendor: g.vendor, webglVendor: g.webglVendor, renderer: g.webglRenderer, unmaskedVendor: g.unmaskedVendor, unmaskedRenderer: g.unmaskedRenderer, device: g.device };
    } else {
      const cat = q.os.platform === 'linux' ? GPUS.linux : GPUS.win;
      const cur = q.hardware.gpu || {};
      let g = cat.find((x) => x.device === cur.device);
      if (!g) {
        const tier = q.os.gpuTier != null ? q.os.gpuTier : 1;
        g = U.pickWeighted(cat, rng, (x) => (x.tier === tier ? 6 : x.tier === Math.max(0, tier - 1) ? 2 : 0.25));
      }
      q.hardware.gpu = { vendor: g.vendor, webglVendor: g.webglVendor, renderer: g.webglRenderer, unmaskedVendor: g.unmaskedVendor, unmaskedRenderer: g.unmaskedRenderer, device: g.device };
    }

    /* 9) fonts + plugins + extensions */
    q.fingerprint.fonts = q.fingerprint.fontsMode === 'custom' && q.fingerprint.fontOverride && q.fingerprint.fontOverride.length ? q.fingerprint.fontOverride : fontSetFor(q);
    q.fingerprint.plugins = pluginsFor(b.family);
    if (['android', 'ios'].includes(q.os.platform)) q.extensions = [];
    else if (b.family === 'firefox') q.extensions = [];

    /* 10) network defaults */
    q.network.webrtc = q.network.mode === 'proxy' ? 'disabled' : (q.network.webrtc === 'disabled' ? 'disabled' : q.network.webrtc);
    if (!q.network.localIp || !/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|127\.)/.test(q.network.localIp)) q.network.localIp = privateIp(rng, mobile);
    if (mobile) q.network.connection.type = 'cellular';

    q.consistency = validate(q);
    q.updatedAt = U.nowISO();
    return q;
  }

  /* batch generation with dedupe of the strongest identifiers */
  function generateBatch(count, opts, existing = []) {
    const out = [];
    const seen = new Set(existing.map((e) => `${e.fingerprint.canvasNoiseSeed}|${e.fingerprint.audioSeed}|${e.navigator.userAgent}|${e.geo.city}`));
    let guard = 0;
    while (out.length < count && guard < count * 30) {
      guard++;
      const p = generate(opts);
      const key = `${p.fingerprint.canvasNoiseSeed}|${p.fingerprint.audioSeed}|${p.navigator.userAgent}|${p.geo.city}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(p);
    }
    return out;
  }

  return { generate, generateBatch, validate, repair, demoProxy, buildUa, buildCh, fontSetFor, pluginsFor, privateIp, androidVersionFor,
    catalogs: { ANDROID_DEVICES, IOS_DEVICES, MAC_ARCH, LINUX_ARCH, WIN_ARCH, buildUa } };
})();
