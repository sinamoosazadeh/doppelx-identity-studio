/* ==========================================================================
   DOPPEL X — engine.js
   Coherent identity generation · validation · auto-repair · risk simulation
   Pure JS, no DOM. The heart of the app (shared by UI and the in-app tests).
   ========================================================================== */
'use strict';

const DX = (() => {
  const VERSION = '3.2.1';
  const SCHEMA = 5;

  /* ------------------------------------------------------------------ utils */
  const U = {
    clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
    clone: (o) => JSON.parse(JSON.stringify(o)),
    uid: (p = 'id') => {
      let r;
      try { r = (crypto.randomUUID && crypto.randomUUID().replace(/-/g, '')).slice(0, 12); } catch (e) { r = null; }
      if (!r) r = Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 8);
      return p + '_' + r;
    },
    pad: (n, l = 2) => String(n).padStart(l, '0'),
    nowISO: () => new Date().toISOString(),
    esc(s) {
      return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    },
    fmtDate: (d) => (d instanceof Date ? d : new Date(d)).toISOString().slice(0, 10),
    isObj: (v) => v != null && typeof v === 'object' && !Array.isArray(v),
    deepMerge(base, patch) {
      const out = Array.isArray(base) ? base.slice() : Object.assign({}, base);
      if (!U.isObj(patch)) return out;
      for (const k of Object.keys(patch)) {
        if (U.isObj(out[k]) && U.isObj(patch[k])) out[k] = U.deepMerge(out[k], patch[k]);
        else out[k] = patch[k];
      }
      return out;
    },
    shuffle(arr, rng) {
      const a = arr.slice();
      for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
      return a;
    },
    pickWeighted(list, rng, weightFn) {
      const w = typeof weightFn === 'function' ? weightFn : () => 1;
      const ws = list.map((x) => Math.max(0, +w(x) || 0));
      const total = ws.reduce((a, b) => a + b, 0);
      if (total <= 0) return list[Math.floor(rng() * list.length)];
      let r = rng() * total;
      for (let i = 0; i < list.length; i++) { r -= ws[i]; if (r <= 0) return list[i]; }
      return list[list.length - 1];
    },
    fnv1a(str) {
      let h = 0x811c9dc5;
      for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
      return (h >>> 0).toString(16).padStart(8, '0');
    },
    sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
    bytes(n) {
      if (n == null) return '—';
      if (n >= 1e9) return (n / 1e9).toFixed(1) + ' GB';
      if (n >= 1e6) return (n / 1e6).toFixed(0) + ' MB';
      return (n / 1e3).toFixed(0) + ' KB';
    },
  };

  /* ------------------------------------------------------- seeded xoshiro128** */
  function makeRng(...seeds) {
    const h1 = U.fnv1a(seeds.map(String).join('|'));
    const h2 = U.fnv1a(seeds.map(String).join('#') + '$dx');
    let s0 = (parseInt(h1.slice(0, 8) || '1', 16) ^ 0x9e3779b9) >>> 0;
    let s1 = (parseInt(h2.slice(0, 8) || '1', 16) ^ 0x243f6a88) >>> 0;
    let s2 = (s0 ^ 0x85ebca6b) >>> 0;
    let s3 = (s1 ^ 0xc2b2ae35) >>> 0;
    if (!(s0 | s1 | s2 | s3)) s0 = 1;
    const rotl = (x, k) => ((x << k) | (x >>> (32 - k))) >>> 0;
    const next = () => {
      const r = (Math.imul(rotl(Math.imul(s1, 5) >>> 0, 7), 9) >>> 0);
      const t = (s1 << 9) >>> 0;
      s2 = (s2 ^ s0) >>> 0; s3 = (s3 ^ s1) >>> 0; s1 = (s1 ^ s2) >>> 0; s0 = (s0 ^ s3) >>> 0;
      s2 = (s2 ^ t) >>> 0; s3 = rotl(s3, 11) >>> 0;
      return (r >>> 0) / 4294967296;
    };
    for (let i = 0; i < 12; i++) next();
    const rng = () => next();
    rng.int = (a, b) => a + Math.floor(rng() * (b - a + 1));
    rng.pick = (arr) => arr[Math.floor(rng() * arr.length)];
    rng.picks = (arr, n) => U.shuffle(arr, rng).slice(0, Math.max(0, Math.min(n, arr.length)));
    rng.chance = (p) => rng() < p;
    rng.float = (a, b, digits = 2) => +(a + rng() * (b - a)).toFixed(digits);
    rng.weighted = (list, w) => U.pickWeighted(list, rng, w);
    return rng;
  }

  /* ---------------------------------------------------- Android device catalog */
  /* [model, marketing name, brand, release(YYYY-MM), chipset, cores, GPU key, RAM GB,
      screen [w,h], dpr, android versions allowed, webglRenderer, unmaskedVendor] */
  const ANDROID_EXT = [
    { model: '23122PCD1G', name: 'POCO X6 5G', brand: 'xiaomi', release: '2024-01', chip: 'Qualcomm Snapdragon 7s Gen 2', cores: 8, gpuKey: 'Adreno (TM) 710', ram: 12, screen: [1220, 2712], dpr: 3.0, av: ['14', '15', '16'], hintsModel: '23122PCD1G', browsers: ['chrome', 'firefox'] },
    { model: '24129PN74G', name: 'Xiaomi 15', brand: 'xiaomi', release: '2025-02', chip: 'Qualcomm Snapdragon 8 Elite', cores: 8, gpuKey: 'Adreno (TM) 830', ram: 12, screen: [1200, 2670], dpr: 3.0, av: ['15', '16'], hintsModel: '24129PN74G', browsers: ['chrome', 'firefox'] },
    { model: 'SM-S938B', name: 'Samsung Galaxy S25 Ultra', brand: 'samsung', release: '2025-01', chip: 'Qualcomm Snapdragon 8 Elite', cores: 8, gpuKey: 'Adreno (TM) 830', ram: 12, screen: [1440, 3120], dpr: 3.5, av: ['15', '16'], hintsModel: 'SM-S938B', browsers: ['chrome', 'firefox'] },
    { model: 'Pixel 10', name: 'Google Pixel 10', brand: 'google', release: '2025-08', chip: 'Google Tensor G5', cores: 8, gpuKey: 'Immortalis-G715', ram: 12, screen: [1080, 2424], dpr: 2.625, av: ['16', '17'], hintsModel: 'Pixel 10', browsers: ['chrome', 'firefox'] },
    { model: 'Pixel 9 Pro', name: 'Google Pixel 9 Pro', brand: 'google', release: '2024-09', chip: 'Google Tensor G4', cores: 8, gpuKey: 'Immortalis-G715', ram: 16, screen: [1280, 2856], dpr: 3, av: ['15', '16'], hintsModel: 'Pixel 9 Pro' },
    { model: 'Pixel 8', name: 'Google Pixel 8', brand: 'google', release: '2023-10', chip: 'Google Tensor G3', cores: 9, gpuKey: 'Mali-G715', ram: 8, screen: [1080, 2400], dpr: 2.625, av: ['14', '15'], hintsModel: 'Pixel 8' },
    { model: 'Pixel 7', name: 'Google Pixel 7', brand: 'google', release: '2022-10', chip: 'Google Tensor G2', cores: 8, gpuKey: 'Mali-G710', ram: 8, screen: [1080, 2400], dpr: 2.625, av: ['13', '14', '15'], hintsModel: 'Pixel 7' },
    { model: 'SM-S928B', name: 'Samsung Galaxy S24 Ultra', brand: 'samsung', release: '2024-01', chip: 'Qualcomm Snapdragon 8 Gen 3', cores: 8, gpuKey: 'Adreno (TM) 750', ram: 12, screen: [1440, 3120], dpr: 3.5, av: ['14', '15'], hintsModel: 'SM-S928B' },
    { model: 'SM-S921B', name: 'Samsung Galaxy S24', brand: 'samsung', release: '2024-01', chip: 'Samsung Exynos 2400', cores: 10, gpuKey: 'Xclipse 940', ram: 8, screen: [1080, 2340], dpr: 2.8125, av: ['14', '15'], hintsModel: 'SM-S921B' },
    { model: 'SM-S911B', name: 'Samsung Galaxy S23', brand: 'samsung', release: '2023-02', chip: 'Qualcomm Snapdragon 8 Gen 2', cores: 8, gpuKey: 'Adreno (TM) 740', ram: 8, screen: [1080, 2340], dpr: 2.8125, av: ['13', '14', '15'], hintsModel: 'SM-S911B' },
    { model: 'SM-A546B', name: 'Samsung Galaxy A54', brand: 'samsung', release: '2023-03', chip: 'Samsung Exynos 1380', cores: 8, gpuKey: 'Mali-G68 MP5', ram: 8, screen: [1080, 2340], dpr: 2.8125, av: ['13', '14', '15'], hintsModel: 'SM-A546B' },
    { model: 'SM-A155F', name: 'Samsung Galaxy A15', brand: 'samsung', release: '2023-12', chip: 'MediaTek Helio G99', cores: 8, gpuKey: 'Mali-G57 MC2', ram: 4, screen: [1080, 2340], dpr: 2.8125, av: ['14', '15'], hintsModel: 'SM-A155F' },
    { model: '2201117TY', name: 'Redmi Note 11', brand: 'xiaomi', release: '2022-01', chip: 'Qualcomm Snapdragon 680', cores: 8, gpuKey: 'Adreno (TM) 610', ram: 4, screen: [1080, 2400], dpr: 2.75, av: ['12', '13', '14'], hintsModel: '2201117TY' },
    { model: '23127PN0CG', name: 'Xiaomi 14', brand: 'xiaomi', release: '2023-10', chip: 'Qualcomm Snapdragon 8 Gen 3', cores: 8, gpuKey: 'Adreno (TM) 750', ram: 12, screen: [1200, 2670], dpr: 3.2, av: ['14', '15'], hintsModel: '23127PN0CG' },
    { model: '23049PCD8G', name: 'POCO F5', brand: 'xiaomi', release: '2023-05', chip: 'Qualcomm Snapdragon 7+ Gen 2', cores: 8, gpuKey: 'Adreno (TM) 725', ram: 8, screen: [1080, 2400], dpr: 2.75, av: ['13', '14', '15'], hintsModel: '23049PCD8G' },
    { model: 'CPH2449', name: 'OnePlus 11', brand: 'oneplus', release: '2023-02', chip: 'Qualcomm Snapdragon 8 Gen 2', cores: 8, gpuKey: 'Adreno (TM) 740', ram: 12, screen: [1440, 3216], dpr: 3.5, av: ['13', '14', '15'], hintsModel: 'CPH2449' },
    { model: 'A065', name: 'Nothing Phone (2)', brand: 'nothing', release: '2023-07', chip: 'Qualcomm Snapdragon 8+ Gen 1', cores: 8, gpuKey: 'Adreno (TM) 730', ram: 12, screen: [1080, 2412], dpr: 2.75, av: ['13', '14', '15'], hintsModel: 'A065' },
    { model: 'V2254A', name: 'vivo V27', brand: 'vivo', release: '2023-03', chip: 'MediaTek Dimensity 7200', cores: 8, gpuKey: 'Mali-G610 MC4', ram: 8, screen: [1080, 2400], dpr: 2.75, av: ['13', '14'], hintsModel: 'V2254A' },
    { model: 'RMX3771', name: 'realme 11 Pro', brand: 'realme', release: '2023-05', chip: 'MediaTek Dimensity 7050', cores: 8, gpuKey: 'Mali-G68 MC4', ram: 8, screen: [1080, 2412], dpr: 2.75, av: ['13', '14'], hintsModel: 'RMX3771' },
    { model: 'moto g84 5G', name: 'Moto G84', brand: 'motorola', release: '2023-09', chip: 'Qualcomm Snapdragon 695', cores: 8, gpuKey: 'Adreno (TM) 619', ram: 8, screen: [1080, 2400], dpr: 2.75, av: ['13', '14'], hintsModel: 'moto g84 5G' },
    { model: 'Pixel 6a', name: 'Google Pixel 6a', brand: 'google', release: '2022-07', chip: 'Google Tensor', cores: 8, gpuKey: 'Mali-G78 MP20', ram: 6, screen: [1080, 2400], dpr: 2.625, av: ['13', '14', '15'], hintsModel: 'Pixel 6a' },
  ];
  const A_GPU_EXT = [
    { device: 'Adreno (TM) 830', vendor: 'Qualcomm', webglRenderer: 'Adreno (TM) 830' },
    { device: 'Adreno (TM) 750', vendor: 'Qualcomm', webglRenderer: 'Adreno (TM) 750' },
    { device: 'Adreno (TM) 740', vendor: 'Qualcomm', webglRenderer: 'Adreno (TM) 740' },
    { device: 'Adreno (TM) 730', vendor: 'Qualcomm', webglRenderer: 'Adreno (TM) 730' },
    { device: 'Adreno (TM) 725', vendor: 'Qualcomm', webglRenderer: 'Adreno (TM) 725' },
    { device: 'Adreno (TM) 710', vendor: 'Qualcomm', webglRenderer: 'Adreno (TM) 710' },
    { device: 'Adreno (TM) 619', vendor: 'Qualcomm', webglRenderer: 'Adreno (TM) 619' },
    { device: 'Adreno (TM) 610', vendor: 'Qualcomm', webglRenderer: 'Adreno (TM) 610' },
    { device: 'Mali-G715', vendor: 'ARM', webglRenderer: 'Mali-G715' },
    { device: 'Immortalis-G715', vendor: 'ARM', webglRenderer: 'Mali-G715-Immortalis MC11' },
    { device: 'Mali-G710', vendor: 'ARM', webglRenderer: 'Mali-G710' },
    { device: 'Mali-G78 MP20', vendor: 'ARM', webglRenderer: 'Mali-G78 MP20' },
    { device: 'Mali-G68 MP5', vendor: 'ARM', webglRenderer: 'Mali-G68 MP5' },
    { device: 'Mali-G68 MC4', vendor: 'ARM', webglRenderer: 'Mali-G68 MC4' },
    { device: 'Mali-G57 MC2', vendor: 'ARM', webglRenderer: 'Mali-G57 MC2' },
    { device: 'Mali-G610 MC4', vendor: 'ARM', webglRenderer: 'Mali-G610 MC4' },
    { device: 'Xclipse 940', vendor: 'Samsung', webglRenderer: 'Xclipse 940' },
  ];
  // Merge extras into the shared catalogs (idempotent).
  if (typeof DEVICE_MODELS !== 'undefined') {
    const have = new Set(DEVICE_MODELS.android.map((d) => d.model));
    ANDROID_EXT.forEach((d) => { if (!have.has(d.model)) DEVICE_MODELS.android.push(Object.assign({ browsers: ['chrome'] }, d)); });
    const ghave = new Set(GPUS.android.map((g) => g.device));
    A_GPU_EXT.forEach((g) => {
      if (ghave.has(g.device)) return;
      GPUS.android.push({ vendor: g.vendor, webglVendor: g.vendor, webglRenderer: g.webglRenderer, unmaskedVendor: g.vendor, unmaskedRenderer: g.webglRenderer, device: g.device, tier: 1 });
    });
  }

  /* ------------------------------------------------------------- name pools */
  const NAME_POOL = {
    anglo: [['James','Carter'],['Emily','Brooks'],['Noah','Sullivan'],['Olivia','Hayes'],['Liam','Bennett'],['Ava','Foster'],['Ethan','Reed'],['Mia','Palmer'],['Lucas','Ward'],['Grace','Hudson'],['Henry','Lawson'],['Chloe','Doyle']],
    latin: [['Mateo','Rojas'],['Valentina','Ferreyra'],['Santiago','Medina'],['Camila','Suárez'],['Lucas','Almeida'],['Isabella','Moretti'],['Diego','Navarro'],['Sofía','Castillo'],['Andrés','Vargas'],['Lucía','Romero'],['Tomás','Benitez'],['Martina','Costa']],
    germanic: [['Lukas','Weber'],['Anna','Schmidt'],['Felix','Hoffmann'],['Lea','Fischer'],['Jonas','Becker'],['Emma','Wagner'],['Maximilian','Koch'],['Sophie','Richter'],['Paul','Klein'],['Marie','Wolf'],['Finn','Neumann'],['Lena','Braun']],
    nordic: [['Emil','Larsen'],['Nora','Hansen'],['Oskar','Johansson'],['Astrid','Nilsson'],['Magnus','Berg'],['Elin','Dahl'],['Sander','Møller'],['Ingrid','Lund'],['Kasper','Eriksen'],['Sigrid','Holm'],['Leif','Andersen'],['Freja','Sørensen']],
    slavic: [['Jakub','Nowak'],['Zofia','Kowalski'],['Piotr','Wiśniewski'],['Anna','Lewandowska'],['Marek','Zieliński'],['Ewa','Szymańska'],['Tomasz','Kaczmarek'],['Magda','Wójcik'],['Oleg','Petrov'],['Irina','Sokolova'],['Dmitri','Volkov'],['Natalia','Morozova']],
    turkic: [['Emre','Yılmaz'],['Zeynep','Kaya'],['Mert','Demir'],['Elif','Şahin'],['Burak','Çelik'],['Selin','Aydın'],['Can','Öztürk'],['Deniz','Arslan'],['Kerem','Doğan'],['Ece','Kılıç'],['Umut','Aslan'],['Derin','Koç']],
    arabic: [['Omar','Al-Farsi'],['Layla','Haddad'],['Yousef','Nasser'],['Noor','Saleh'],['Karim','Mansour'],['Hana','Khalil'],['Tariq','Aziz'],['Rania','Hassan'],['Faisal','Rahman'],['Amira','Sultan'],['Zaid','Fahmy'],['Lina','Khoury']],
    indic: [['Arjun','Sharma'],['Priya','Patel'],['Rohan','Iyer'],['Ananya','Nair'],['Vikram','Singh'],['Meera','Gupta'],['Karthik','Reddy'],['Isha','Mehta'],['Aditya','Verma'],['Sneha','Joshi'],['Rahul','Desai'],['Divya','Kulkarni']],
    eastasia: [['Haruto','Sato'],['Yui','Tanaka'],['Min-jun','Kim'],['Seo-yeon','Park'],['Ren','Suzuki'],['Aoi','Watanabe'],['Ji-hoon','Lee'],['Ha-eun','Choi'],['Sota','Takahashi'],['Hina','Ito'],['Do-yun','Jung'],['Su-bin','Kang']],
    seasia: [['Adi','Santoso'],['Putri','Wijaya'],['Minh','Nguyen'],['Linh','Tran'],['Somchai','Chai'],['Mali','Srisuk'],['Jose','Reyes'],['Maria','Santos'],['Ahmad','Rahman'],['Siti','Aziz'],['Bao','Pham'],['Thao','Le']],
    african: [['Sipho','Dlamini'],['Thandi','Nkosi'],['Chidi','Okafor'],['Amara','Adeyemi'],['Tunde','Balogun'],['Nia','Mwangi'],['Kofi','Mensah'],['Zanele','Khumalo'],['Emeka','Eze'],['Aisha','Bello'],['Juma','Otieno'],['Farida','Wanjiku']],
    hebrew: [['Noam','Levi'],['Tamar','Cohen'],['Eitan','Mizrahi'],['Yael','Peretz'],['Ariel','Biton'],['Shira','Dahan'],['Omer','Avraham'],['Maya','Friedman'],['Daniel','Shapiro'],['Roni','Barak'],['Yonatan','Golan'],['Lior','Weiss']],
    oceania: [['Jack','Thompson'],['Ruby','Mitchell'],['Lachlan','Harrison'],['Isla','Campbell'],['Cooper','Roberts'],['Matilda','Ellis'],['Hunter','Fraser'],['Zoe','Mackenzie'],['Beau','Walsh'],['Imogen','Stewart'],['Flynn','Webb'],['Harper','Lowe']],
  };
  const COUNTRY_NAMES = {
    US: 'anglo', CA: 'anglo', GB: 'anglo', IE: 'anglo', AU: 'oceania', NZ: 'oceania', ZA: 'african', NG: 'african', KE: 'african', EG: 'arabic',
    AE: 'arabic', SA: 'arabic', QA: 'arabic', IL: 'hebrew', TR: 'turkic', DE: 'germanic', AT: 'germanic', CH: 'germanic', NL: 'germanic',
    SE: 'nordic', NO: 'nordic', DK: 'nordic', FI: 'nordic', PL: 'slavic', ES: 'latin', PT: 'latin', IT: 'latin', FR: 'latin', BR: 'latin',
    MX: 'latin', AR: 'latin', CL: 'latin', CO: 'latin', IN: 'indic', ID: 'seasia', SG: 'seasia', MY: 'seasia', VN: 'seasia', TH: 'seasia',
    PH: 'seasia', JP: 'eastasia', KR: 'eastasia',
  };

  const TOP_SITES = {
    US: ['google.com', 'youtube.com', 'reddit.com', 'amazon.com'], CA: ['google.ca', 'youtube.com', 'cbc.ca', 'kijiji.ca'],
    GB: ['google.co.uk', 'bbc.co.uk', 'ebay.co.uk', 'reddit.com'], DE: ['google.de', 'spiegel.de', 'amazon.de', 'ebay.de'],
    FR: ['google.fr', 'lemonde.fr', 'amazon.fr', 'leboncoin.fr'], NL: ['google.nl', 'nu.nl', 'marktplaats.nl', 'bol.com'],
    ES: ['google.es', 'elpais.com', 'amazon.es', 'milanuncios.com'], IT: ['google.it', 'corriere.it', 'amazon.it', 'subito.it'],
    SE: ['google.se', 'aftonbladet.se', 'blocket.se', 'prisjakt.nu'], PL: ['google.pl', 'onet.pl', 'allegro.pl', 'olx.pl'],
    CH: ['google.ch', '20min.ch', 'galaxus.ch', 'tutti.ch'], AT: ['google.at', 'orf.at', 'willhaben.at', 'derstandard.at'],
    PT: ['google.pt', 'publico.pt', 'olx.pt', 'worten.pt'], IE: ['google.ie', 'rte.ie', 'donegaldaily.com', 'daft.ie'],
    FI: ['google.fi', 'yle.fi', 'tori.fi', 'verkkokauppa.com'], NO: ['google.no', 'vg.no', 'finn.no', 'komplett.no'],
    DK: ['google.dk', 'dr.dk', 'dba.dk', 'proshop.dk'], TR: ['google.com.tr', 'hurriyet.com.tr', 'sahibinden.com', 'trendyol.com'],
    AE: ['google.ae', 'gulfnews.com', 'dubizzle.com', 'noon.com'], IN: ['google.co.in', 'timesofindia.com', 'flipkart.com', 'olx.in'],
    ID: ['google.co.id', 'detik.com', 'tokopedia.com', 'olx.co.id'], SG: ['google.com.sg', 'straitstimes.com', 'lazada.sg', 'carousell.sg'],
    MY: ['google.com.my', 'thestar.com.my', 'shopee.com.my', 'mudah.my'], JP: ['google.co.jp', 'yahoo.co.jp', 'rakuten.co.jp', 'mercari.com'],
    KR: ['google.co.kr', 'naver.com', 'coupang.com', 'daum.net'], VN: ['google.com.vn', 'vnexpress.net', 'shopee.vn', 'chotot.com'],
    TH: ['google.co.th', 'thairath.co.th', 'lazada.co.th', 'kaidee.com'], PH: ['google.com.ph', 'inquirer.net', 'lazada.com.ph', 'olx.ph'],
    SA: ['google.com.sa', 'alarabiya.net', 'noon.com', 'haraj.com.sa'], QA: ['google.qa', 'aljazeera.net', 'qatarliving.com', 'noon.com'],
    IL: ['google.co.il', 'ynet.co.il', 'yad2.co.il', 'ksp.co.il'], BR: ['google.com.br', 'globo.com', 'mercadolivre.com.br', 'olx.com.br'],
    MX: ['google.com.mx', 'eluniversal.com.mx', 'mercadolibre.com.mx', 'amazon.com.mx'], AR: ['google.com.ar', 'clarin.com', 'mercadolibre.com.ar', 'olx.com.ar'],
    CL: ['google.cl', 'latercera.com', 'mercadolibre.cl', 'yapo.cl'], CO: ['google.com.co', 'eltiempo.com', 'mercadolibre.com.co', 'olx.com.co'],
    ZA: ['google.co.za', 'news24.com', 'takealot.com', 'gumtree.co.za'], NG: ['google.com.ng', 'punchng.com', 'jumia.com.ng', 'olx.com.ng'],
    KE: ['google.co.ke', 'nation.africa', 'jumia.co.ke', 'pigiapple.com'], EG: ['google.com.eg', 'youm7.com', 'jumia.com.eg', 'olx.com.eg'],
    AU: ['google.com.au', 'news.com.au', 'gumtree.com.au', 'ebay.com.au'], NZ: ['google.co.nz', 'stuff.co.nz', 'trademe.co.nz', 'thewarehouse.co.nz'],
  };

  /* ------------------------------------------------------ Android version map */
  const A_VERSIONS = [
    { v: '11', api: 30, y: 2020 }, { v: '12', api: 31, y: 2021 }, { v: '13', api: 33, y: 2022 },
    { v: '14', api: 34, y: 2023 }, { v: '15', api: 35, y: 2024 }, { v: '16', api: 36, y: 2025 },
    { v: '17', api: 37, y: 2026 },
  ];

  function subnet24(ip) {
    const m = /^(\d+\.\d+\.\d+)\.\d+$/.exec(String(ip || '').trim());
    return m ? m[1] + '.0/24' : '';
  }
  function geoDistanceKm(lat1, lon1, lat2, lon2) {
    if ([lat1, lon1, lat2, lon2].some((x) => x == null || isNaN(+x))) return 0;
    const R = 6371, r = Math.PI / 180;
    const dLat = (lat2 - lat1) * r, dLon = (lon2 - lon1) * r;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(dLon / 2) ** 2;
    return Math.round(2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  }

  /* ------------------------------------------------------------- small helpers */
  function privateIp(rng, mobile) {
    if (mobile) return `${rng.chance(0.6) ? '10' : '192.168'}.${rng.int(0, 255)}.${rng.int(1, 254)}.${rng.int(2, 254)}`;
    const p = rng.pick(['192.168.1.', '192.168.0.', '10.0.0.', '10.0.4.', '172.16.0.']);
    return p + rng.int(2, 254);
  }
  function pluginsFor(family) {
    if (family === 'firefox') return [];
    return [
      { name: 'PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format', version: '1.0.0.0' },
      { name: 'Chrome PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format', version: '1.0.0.0' },
      { name: 'Chromium PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format', version: '1.0.0.0' },
      { name: 'Microsoft Edge PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format', version: '1.0.0.0' },
      { name: 'WebKit built-in PDF', filename: 'internal-pdf-viewer', description: 'Portable Document Format', version: '1.0.0.0' },
    ];
  }
  function fontSetFor(p) {
    const fp = p.fingerprint || {};
    if (fp.fontsMode === 'custom' && Array.isArray(fp.fontOverride) && fp.fontOverride.length) return fp.fontOverride.slice();
    const key = p.os.platform === 'windows' ? (p.os.archId === 'win11' ? 'windows11' : 'windows10')
      : p.os.platform === 'macos' ? 'mac'
      : p.os.platform === 'android' ? 'android'
      : p.os.platform === 'ios' ? 'ios' : 'linux';
    return (FONT_SETS[key] || FONT_SETS.linux).slice();
  }

  /* GPU resolver — a device's GPU string can never contradict its model.
     Looks up the WebGL catalog; if absent, synthesises a coherent entry. */
  function norm(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]/g, ''); }
  function gpuForDevice(gpuKey) {
    const key = norm(gpuKey);
    const hit = GPUS.android.find((g) => norm(g.device) === key || norm(g.webglRenderer) === key)
      || GPUS.android.find((g) => { const a = norm(g.device), b = key; return a.includes(b) || b.includes(a); });
    if (hit) return hit;
    const vendor = /adreno/i.test(gpuKey) ? 'Qualcomm' : /xclipse/i.test(gpuKey) ? 'Samsung' : /powervr/i.test(gpuKey) ? 'Imagination Technologies' : 'ARM';
    return { vendor, webglVendor: vendor, webglRenderer: gpuKey, unmaskedVendor: vendor, unmaskedRenderer: gpuKey, device: gpuKey, tier: 1 };
  }
  function gpuMatcher(a, b) { // true when two GPU strings share a meaningful token
    const A = norm(a), B = norm(b);
    if (!A || !B) return true;
    if (A.includes(B) || B.includes(A)) return true;
    for (let i = 0; i + 4 <= B.length; i++) if (A.includes(B.slice(i, i + 4))) return true;
    return false;
  }

  /* ------------------------------------------------------------------ UA / CH */
  function androidVersionFor(dev, rng) {
    if (dev.av && dev.av.length) return A_VERSIONS.find((x) => x.v === rng.pick(dev.av)) || A_VERSIONS[A_VERSIONS.length - 1];
    const relY = parseInt(dev.release.slice(0, 4), 10);
    const cap = A_VERSIONS.filter((x) => x.y <= relY + 3);
    const choices = cap.length ? cap : A_VERSIONS;
    return rng.pick(choices);
  }
  function buildUa(p) {
    const b = p.browser, os = p.os, full = b.fullVersion || '144.0.7559.97', major = b.major;
    if (b.family === 'safari') {
      const v = major + '.' + (b.minor || 0);
      if (os.platform === 'ios') return `Mozilla/5.0 (iPhone; CPU iPhone OS ${String(os.osVersion).replace(/\./g, '_')} like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/${v} Mobile/15E148 Safari/604.1`;
      return `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/${v} Safari/605.1.15`;
    }
    const chromium = `AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${major}.0.0.0`;
    if (b.family === 'firefox') {
      if (os.platform === 'android') return `Mozilla/5.0 (Android ${os.osVersion}; Mobile; rv:${major}.0) Gecko/${major}.0 Firefox/${major}.0`;
      const plat = os.platform === 'windows' ? 'Windows NT 10.0; Win64; x64' : os.platform === 'macos' ? 'Macintosh; Intel Mac OS X 10.15' : 'X11; Linux x86_64';
      return `Mozilla/5.0 (${plat}; rv:${major}.0) Gecko/20100101 Firefox/${major}.0`;
    }
    if (b.family === 'edge') {
      if (os.platform === 'android') return `Mozilla/5.0 (Linux; Android ${os.osVersion}; ${os.device ? os.device.model : ''}) ${chromium} Mobile Safari/537.36 EdgA/${major}.0.${full.split('.')[2] || 0}.${full.split('.')[3] || 0}`;
      if (os.platform === 'macos') return `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ${chromium} Safari/537.36 Edg/${major}.0.0.0`;
      if (os.platform === 'linux') return `Mozilla/5.0 (X11; Linux x86_64) ${chromium} Safari/537.36 Edg/${major}.0.0.0`;
      return `Mozilla/5.0 (Windows NT 10.0; Win64; x64) ${chromium} Safari/537.36 Edg/${major}.0.0.0`;
    }
    if (os.platform === 'android') return `Mozilla/5.0 (Linux; Android ${os.osVersion}; ${os.device ? os.device.model : ''}) ${chromium} Mobile Safari/537.36`;
    if (os.platform === 'ios') return `Mozilla/5.0 (iPhone; CPU iPhone OS ${String(os.osVersion).replace(/\./g, '_')} like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/${major}.0.${full.split('.')[2] || 0}.${full.split('.')[3] || 0} Mobile/15E148 Safari/604.1`;
    if (os.platform === 'macos') return `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ${chromium} Safari/537.36`;
    if (os.platform === 'linux') return `Mozilla/5.0 (X11; Linux x86_64) ${chromium} Safari/537.36`;
    return `Mozilla/5.0 (Windows NT 10.0; Win64; x64) ${chromium} Safari/537.36`;
  }
  function chPlatform(os) {
    return ({ windows: 'Windows', macos: 'macOS', linux: 'Linux', android: 'Android', ios: 'iOS' })[os.platform];
  }
  function buildCh(p, rng) {
    const b = p.browser;
    if (!['chrome', 'edge'].includes(b.family)) return null;
    const os = p.os;
    const brand = b.family === 'edge' ? 'Microsoft Edge' : 'Google Chrome';
    const grease = rng.pick(['Not_A Brand', 'Not A(Brand', 'Not?A_Brand', 'Not)A;Brand']);
    const gv = rng.pick(['8', '24', '99']);
    const brands = [{ brand: 'Chromium', version: String(b.major) }, { brand, version: String(b.major) }];
    if (b.major >= 130) brands.push({ brand, version: String(b.major) });
    brands.push({ brand: grease, version: gv });
    const arch = os.platform === 'android' ? '' : os.arch === 'arm' || os.arch === 'arm64' ? 'arm' : 'x86';
    const bitness = os.platform === 'android' ? '' : '64';
    const fullList = brands.map((x) => ({ brand: x.brand, version: x.brand === 'Chromium' || x.brand === brand ? b.fullVersion : x.version }));
    return {
      brands,
      fullVersionList: fullList,
      mobile: os.platform === 'android' || os.platform === 'ios',
      platform: chPlatform(os),
      platformVersion: os.platform === 'windows' ? os.chVersion : os.platform === 'macos' ? os.osVersion : os.platform === 'android' ? os.osVersion + '.0.0' : os.osVersion,
      architecture: arch,
      bitness,
      model: os.platform === 'android' && os.device ? os.device.model : '',
      fullVersion: b.fullVersion,
      wow64: false,
      formFactors: [os.platform === 'android' || os.platform === 'ios' ? 'Mobile' : 'Desktop'],
    };
  }

  /* ------------------------------------------------------------- speech voices */
  function speechVoices(locale, platform) {
    const lang = locale.split('-')[0];
    const sys = platform === 'android' ? 'Android' : platform === 'ios' ? 'iOS' : platform === 'macos' ? 'macOS' : 'Windows';
    const out = [];
    const base = { en: [['Google US English', 'en-US'], ['Google UK English Female', 'en-GB'], ['Samantha', 'en-US']], de: [['Google Deutsch', 'de-DE'], ['Anna', 'de-DE']], fr: [['Google français', 'fr-FR'], ['Thomas', 'fr-FR']], es: [['Google español', 'es-ES'], ['Mónica', 'es-ES']], it: [['Alice', 'it-IT']], pt: [['Luciana', 'pt-BR']], nl: [['Google Nederlands', 'nl-NL']], sv: [['Alva', 'sv-SE']], pl: [['Google polski', 'pl-PL']], tr: [['Yelda', 'tr-TR']], ar: [['Majed', 'ar-SA']], he: [['Carmit', 'he-IL']], hi: [['Lekha', 'hi-IN']], id: [['Damayanti', 'id-ID']], ja: [['Google 日本語', 'ja-JP']], ko: [['Google 한국의', 'ko-KR']], vi: [['Google Tiếng Việt', 'vi-VN']], th: [['Kanya', 'th-TH']], fi: [['Satu', 'fi-FI']], nb: [['Nora', 'nb-NO']], da: [['Sara', 'da-DK']] }[lang] || [['Google US English', 'en-US']];
    base.forEach(([name, l]) => out.push({ name, lang: l, localService: sys === 'Android', default: false }));
    out.push({ name: sys + ' System Voice', lang: locale, localService: true, default: true });
    const exact = out.find((v) => v.lang === locale && v.name.indexOf('System') === -1) || out.find((v) => v.lang === locale);
    out.forEach((v) => { v.default = false; });
    if (exact) exact.default = true;
    if (!out.some((v) => v.default)) out[0].default = true;
    return out;
  }

  /* ----------------------------------------------------------------- generate */
  /* opts: { seed, country, city, platform, osVariant, deviceModel, browser, name,
             network:'proxy'|'direct', privacy:'standard'|'strict'|'off', group, tags } */
  function generate(opts = {}) {
    const seed = opts.seed || U.uid('seed');
    const rng = makeRng(seed);
    const platform = (opts.platform && ['windows', 'macos', 'linux', 'android', 'ios'].includes(opts.platform)) ? opts.platform : choosePlatform(rng, opts);
    const mobile = platform === 'android' || platform === 'ios';
    let browserFamily = opts.browser && BROWSERS[opts.browser] ? opts.browser : pickBrowser(rng, platform);
    if (!BROWSERS[browserFamily].platforms[platform]) browserFamily = platform === 'ios' ? 'safari' : platform === 'android' ? 'chrome' : 'chrome';
    const country = (opts.country && GEO[opts.country]) ? opts.country : randomCountry(rng, opts);
    const now = new Date();

    /* geo */
    const places = (GEO[country] || []).filter((g) => TZ_BY_ID[g[3]]);
    const place = (opts.city && places.find((g) => g[0] === opts.city)) || rng.pick(places);
    const [city, lat, lon, tzId] = place;
    const zone = TZ_BY_ID[tzId];

    /* os block */
    let os;
    if (platform === 'android') {
      const pool = DEVICE_MODELS.android.filter((d) => (d.browsers || ['chrome']).includes(browserFamily));
      const dev = (opts.deviceModel && DEVICE_MODELS.android.find((d) => d.model === opts.deviceModel)) || rng.pick(pool.length ? pool : DEVICE_MODELS.android);
      const av = A_VERSIONS.find((x) => x.v === opts.osVersion) || androidVersionFor(dev, rng);
      os = {
        platform, osName: 'Android', osVersion: av.v, apiLevel: av.api, build: `UP1A.${rng.int(2301, 2405)}.${rng.int(10, 99)}.${rng.int(1, 30)}`,
        arch: 'aarch64', archId: 'android', chVersion: av.v + '.0.0', fontSet: 'android', platformString: 'Linux armv81',
        archetype: dev.name, device: { model: dev.model, name: dev.name, brand: dev.brand, chip: dev.chip, ramGB: dev.ram },
        screen: { width: Math.round(dev.screen[0] / dev.dpr), height: Math.round(dev.screen[1] / dev.dpr), dpr: dev.dpr, physical: dev.screen },
        cores: dev.cores, ramGB: dev.ram, gpuKey: dev.gpuKey,
      };
    } else if (platform === 'ios') {
      const dev = (opts.deviceModel && IOS_DEVICES.find((d) => d.model === opts.deviceModel)) || rng.pick(IOS_DEVICES);
      const v = opts.osVersion && dev.ios.includes(opts.osVersion) ? opts.osVersion : rng.pick(dev.ios);
      os = {
        platform, osName: 'iOS', osVersion: v, build: v, arch: 'arm64', archId: 'ios', chVersion: v, fontSet: 'ios', platformString: 'iPhone',
        archetype: dev.name, device: { model: dev.model, name: dev.name, brand: 'apple', chip: 'Apple A-Series', ramGB: dev.ram },
        screen: { width: dev.screen[0], height: dev.screen[1], dpr: dev.dpr }, cores: 6, ramGB: dev.ram, gpuKey: 'Apple GPU',
      };
    } else if (platform === 'macos') {
      const key = opts.osVariant && MAC_ARCH[opts.osVariant] ? opts.osVariant : rng.pick(Object.keys(MAC_ARCH));
      const a = MAC_ARCH[key];
      const arche = DEVICE_MODELS.macos.find((m) => m.gpu === a.gpu) || DEVICE_MODELS.macos[0];
      const screens = (arche.screens || []).filter(Boolean);
      const screen = screens.length ? rng.pick(screens) : [1440, 900, 2];
      os = { platform, osName: 'macOS', osVersion: a.osVersion, build: a.osVersion, arch: 'arm', archId: key, chVersion: a.osVersion, fontSet: 'mac', platformString: 'MacIntel', archetype: key, screen: { width: screen[0], height: screen[1], dpr: screen[2] }, cores: a.cores, ramGB: rng.pick(a.ram), gpuKey: a.gpu, safariVersion: a.safari };
    } else if (platform === 'linux') {
      const key = opts.osVariant && LINUX_ARCH[opts.osVariant] ? opts.osVariant : rng.pick(Object.keys(LINUX_ARCH));
      const a = LINUX_ARCH[key];
      const arche = DEVICE_MODELS.linux[key === 'ubuntu' ? 0 : 1];
      const screen = rng.pick(arche.screens);
      os = { platform, osName: key === 'ubuntu' ? 'Ubuntu' : 'Fedora Linux', osVersion: a.osVersion, build: a.osVersion, arch: a.arch, archId: key, chVersion: a.chVersion, fontSet: 'linux', platformString: a.platform, archetype: arche.name, screen: { width: screen[0], height: screen[1], dpr: screen[2] }, cores: rng.pick(arche.cores), ramGB: rng.pick(arche.ram), gpuSet: 'linux' };
    } else {
      const variant = opts.osVariant && WIN_ARCH[opts.osVariant] ? opts.osVariant : (rng.chance(0.58) ? 'win11' : 'win10');
      const a = WIN_ARCH[variant];
      const arche = rng.pick(DEVICE_MODELS.windows.filter((m) => (variant === 'win11' ? m.os === 'Windows 11' : m.os === 'Windows 10')));
      const screen = rng.pick(arche.screens);
      os = { platform, osName: a.label.split(' · ')[0], osVersion: a.build, build: a.build, arch: 'x86_64', archId: variant, chVersion: a.chVersion, fontSet: a.fontSet, platformString: 'Win32', archetype: arche.name, screen: { width: screen[0], height: screen[1], dpr: screen[2] }, cores: rng.pick(arche.cores), ramGB: rng.pick(arche.ram), gpuTier: rng.pick(arche.gpuTier) };
    }

    /* browser: version derived from today's release train */
    let browser;
    if (browserFamily === 'safari') {
      const sv = platform === 'ios' ? os.osVersion : (os.safariVersion || '17.4.1');
      const [maj, min] = String(sv).split('.').map((x) => parseInt(x, 10));
      browser = { family: 'safari', name: 'Safari', engine: 'WebKit', major: maj, minor: min || 0, fullVersion: `${maj}.${min || 0}`, vendor: 'Apple Computer, Inc.' };
    } else {
      const train = releaseTrain(browserFamily, now);
      const full = browserFamily === 'firefox' ? `${train.major}.0` : chromeVersion(train.major, rng);
      browser = { family: browserFamily, name: BROWSERS[browserFamily].name, engine: BROWSERS[browserFamily].engine, major: parseInt(full.split('.')[0], 10), fullVersion: full, vendor: browserFamily === 'firefox' ? '' : 'Google Inc.' };
    }

    /* gpu */
    let gpu;
    if (platform === 'android') gpu = gpuForDevice(os.gpuKey);
    else if (platform === 'ios') gpu = GPUS.ios[0];
    else if (platform === 'macos') gpu = GPUS.mac.find((g) => g.device === os.gpuKey) || GPUS.mac[0];
    else if (platform === 'linux') gpu = U.pickWeighted(GPUS.linux, rng);
    else gpu = U.pickWeighted(GPUS.win, rng, (g) => (g.tier === os.gpuTier ? 6 : g.tier === Math.max(0, os.gpuTier - 1) ? 2 : 0.25));

    /* locale */
    const primary = (opts.locale && (LOCALES[country] || []).includes(opts.locale)) ? opts.locale : rng.pick(LOCALES[country] || ['en-US']);
    const langCode = LOCALE_META[primary][1];
    let languages = [primary];
    if (langCode !== 'en') { if (rng.chance(0.55)) languages.push(langCode); if (rng.chance(0.4)) languages.push('en-US', 'en'); }
    else if (rng.chance(0.25)) languages.push('en');
    languages = [...new Set(languages)];

    /* navigator */
    const ua = buildUa({ browser, os });
    const nav = {
      platform: os.platformString, vendor: browser.vendor, product: 'Gecko', productSub: browser.family === 'firefox' ? '20100101' : '20030107',
      appName: 'Netscape', appVersion: ua.replace('Mozilla/', ''), userAgent: ua, language: languages[0], languages,
      hardwareConcurrency: os.cores, deviceMemory: Math.min(8, Math.pow(2, Math.floor(Math.log2(os.ramGB)))),
      maxTouchPoints: mobile ? 5 : 0, cookieEnabled: true, doNotTrack: null, pdfViewerEnabled: browser.family !== 'firefox', webdriver: false,
      oscpu: browser.family === 'firefox' ? (platform === 'windows' ? 'Windows NT 10.0; Win64; x64' : platform === 'macos' ? 'Intel Mac OS X 10.15' : 'Linux x86_64') : undefined,
    };

    /* display */
    const taskbar = platform === 'windows' ? (os.archId === 'win11' ? 48 : 40) : platform === 'macos' ? 25 : platform === 'linux' ? 27 : 0;
    const statusBar = platform === 'ios' ? 47 : platform === 'android' ? 24 : 0;
    const disp = {
      width: os.screen.width, height: os.screen.height, availWidth: os.screen.width,
      availHeight: mobile ? os.screen.height - statusBar - 34 : os.screen.height - taskbar,
      innerWidth: os.screen.width,
      innerHeight: mobile ? os.screen.height - statusBar - 34 - 105 : Math.max(320, os.screen.height - taskbar - 131),
      dpr: os.screen.dpr, colorDepth: 24, pixelDepth: 24,
      orientation: mobile ? 'portrait-primary' : os.screen.width >= os.screen.height ? 'landscape-primary' : 'portrait-primary',
      colorGamut: 'srgb', prefersColorScheme: rng.pick(['light', 'light', 'dark']), prefersReducedMotion: false,
    };

    /* network */
    const netMode = opts.network === 'direct' ? 'direct' : 'proxy';
    let proxy = null;
    if (netMode === 'proxy') {
      proxy = opts.proxyPreset ? Object.assign({}, opts.proxyPreset) : (pickProxy(rng, country) || demoProxy(rng, country, city));
      proxy.country = country;
      if (proxy.city) {
        const match = places.find((g) => g[0].toLowerCase().startsWith(String(proxy.city).split(',')[0].toLowerCase()));
        if (match) proxy.city = match[0];
      }
    }
    const connection = mobile
      ? { type: 'cellular', effectiveType: rng.pick(['4g', '4g', '5g']), downlink: rng.int(6, 24), rtt: rng.int(50, 180), saveData: false }
      : { type: rng.pick(['wifi', 'ethernet']), effectiveType: '4g', downlink: rng.int(8, 30), rtt: rng.int(20, 90), saveData: false };
    const network = {
      mode: netMode,
      proxy: proxy ? { host: proxy.host, port: proxy.port, protocol: proxy.protocol || 'socks5', country: proxy.country, city: proxy.city, isp: proxy.isp, type: proxy.type, asn: proxy.asn, username: '', password: '' } : null,
      ipMode: rng.pick(['city', 'city', 'country']), ipv4: true, ipv6: rng.chance(0.35),
      webrtc: 'disabled', localIp: privateIp(rng, mobile), connection,
      latencyMs: rng.int(18, 90), jitterMs: rng.int(2, 18), failRate: rng.float(0, 2.5, 2),
    };

    /* privacy */
    const strict = opts.privacy === 'strict' || (opts.privacy !== 'off' && rng.chance(0.16));
    const extensions = [];
    if (!mobile && (browserFamily === 'chrome' || browserFamily === 'edge')) {
      const pool = CHROME_EXTENSIONS.filter((e) => e.name !== 'uBlock Origin' || strict);
      const n = strict ? rng.int(2, 4) : rng.int(0, 2);
      extensions.push(...rng.picks(pool, n));
      if (strict && !extensions.some((e) => e.name === 'uBlock Origin')) extensions.push(CHROME_EXTENSIONS.find((e) => e.name === 'uBlock Origin'));
    }
    const privacy = {
      mode: opts.privacy === 'off' ? 'off' : strict ? 'strict' : 'standard',
      doNotTrack: strict ? true : false,
      globalPrivacyControl: strict && platform !== 'ios' && rng.chance(0.6),
      blockAds: extensions.some((e) => /uBlock|AdBlock/.test(e.name)),
      trackers: strict ? 'strict' : 'standard',
      cookies: rng.pick(['allow', 'allow', 'allow-3p-blocked', 'session-only']),
    };
    nav.doNotTrack = privacy.doNotTrack ? '1' : null;

    /* fingerprint surface controls */
    const fingerprint = {
      canvas: 'noise', canvasNoiseSeed: rng.int(100000, 999999), canvasTextNoise: rng.chance(0.5) ? rng.int(100000, 999999) : null,
      webgl: 'native', webglNoiseSeed: rng.int(100000, 999999),
      audio: rng.chance(0.85) ? 'noise' : 'off', audioSeed: rng.int(100000, 999999),
      fontsMode: 'os-default', fonts: null, fontOverride: [],
      plugins: pluginsFor(browserFamily),
      clientRectsNoise: rng.chance(0.35),
      spoofTime: true, spoofTimezone: true, spoofLocale: true, spoofScreen: true, spoofWebRTC: true,
      spoofBattery: mobile, battery: mobile ? { charging: rng.chance(0.7), level: rng.float(0.21, 0.99) } : { charging: true, level: 1 },
      batteryMode: mobile ? 'live' : 'charging',
      webgpu: browserFamily === 'chrome' || browserFamily === 'edge' ? (platform === 'android' ? 'present' : 'present') : 'absent',
      speech: 'native', permissions: 'native', mediaDevices: 'native', storageEstimate: mobile ? rng.int(2000, 6000) : rng.int(8000, 24000),
    };
    fingerprint.fonts = fontSetFor({ os, fingerprint });

    const storage = { localStorage: true, sessionStorage: true, indexedDB: true, quotaMB: mobile ? 5000 : rng.pick([10000, 15000, 20000]) };

    const behavior = {
      humanize: opts.humanize !== false, typingWpm: rng.int(32, 78), clickJitter: rng.int(1, 4), mouseCurve: 'bezier',
      scrollSpeed: rng.pick(['slow', 'normal', 'normal', 'fast']), dwellMin: rng.int(1, 4), dwellMax: rng.int(5, 14),
      gaussianNoise: true, warmupDays: rng.int(3, 7), sessionCapMin: rng.int(25, 90),
    };

    const geo = {
      country, countryName: GEO_META[country].name, city, region: city.split(',')[1] ? city.split(',')[1].trim() : '',
      lat: +lat.toFixed(4), lon: +lon.toFixed(4), accuracy: rng.int(120, 4200), tz: tzId,
      tzOffset: tzOffset(zone, now), tzAbbr: tzAbbr(zone, now), tzLabel: tzLabel(zone), currency: GEO_META[country].currency,
      isp: proxy ? proxy.isp : rng.pick(GEO_META[country].orgs), asn: proxy ? proxy.asn : rng.int(1000, 65000),
    };

    const locale = {
      locale: primary, languageCode: langCode, languages, direction: dirOf(primary), hour12: hour12(primary),
      weekStart: GEO_META[country].weekStart, currency: GEO_META[country].currency,
      dateFormat: primary === 'en-US' ? 'M/D/YYYY' : 'D.M.YYYY', numberFormat: primary === 'en-US' ? '1,234.56' : '1.234,56',
      tz: tzId, timeFormat: hour12(primary) ? '12h' : '24h', firstDayOfWeek: GEO_META[country].weekStart === 0 ? 'Sunday' : 'Monday',
      measurement: GEO_META[country].speedUnit === 'mph' ? 'imperial' : 'metric', temperature: GEO_META[country].temp === 'F' ? 'F' : 'C',
    };

    /* persona */
    const pool = NAME_POOL[COUNTRY_NAMES[country] || 'anglo'];
    const nm = rng.pick(pool);
    const birth = new Date(Date.UTC(rng.int(1972, 2004), rng.int(0, 11), rng.int(1, 28)));
    const persona = {
      firstName: nm[0], lastName: nm[1], birthdate: U.fmtDate(birth),
      age: Math.floor((now - birth) / (365.25 * 86400000)),
      username: (nm[0] + '.' + nm[1]).toLowerCase().replace(/[^a-z0-9.]/g, '') + String(rng.int(11, 99)),
      password: makePassword(rng),
      tone: rng.pick(['concise', 'friendly', 'formal', 'casual']),
      timezone: tzId, locale: primary,
    };

    const profile = {
      schema: SCHEMA, engine: VERSION, id: U.uid('prf'), name: opts.name || `${persona.firstName} ${persona.lastName} · ${city.split(',')[0]}`,
      group: opts.group || '', tags: opts.tags || [], notes: '', seed,
      createdAt: U.nowISO(), updatedAt: U.nowISO(),
      persona, os, browser, display: disp,
      hardware: {
        cpuArch: os.arch, cores: os.cores, ramGB: os.ramGB,
        gpu: { vendor: gpu.vendor, webglVendor: gpu.webglVendor, renderer: gpu.webglRenderer, unmaskedVendor: gpu.unmaskedVendor, unmaskedRenderer: gpu.unmaskedRenderer, device: gpu.device },
        maxTouchPoints: nav.maxTouchPoints,
        cameraCount: mobile ? 2 : rng.pick([0, 1, 1, 2]), microphoneCount: mobile ? rng.pick([1, 2]) : rng.pick([1, 1, 2]), speakerCount: mobile ? 3 : rng.pick([1, 2]),
        webgpuAdapter: fingerprint.webgpu === 'present' ? ({ android: 'Mali/Adreno (Vulkan)', ios: '', macos: 'Apple', windows: 'D3D12', linux: 'Vulkan' }[platform] || '') : '',
      },
      navigator: nav, screen: Object.assign({}, os.screen), clientHints: buildCh({ browser, os }, rng),
      geo, locale, network, privacy, fingerprint, extensions, storage, behavior,
      speech: speechVoices(primary, platform),
      permissions: defaultPermissions(browserFamily, mobile),
      consistency: null,
    };

    /* derived: surface map, risk, warmup, story */
    profile.surface = surfaceOf(profile);
    profile.risk = riskOf(profile);
    profile.warmup = warmupPlan(profile, makeRng(seed + '|warmup'));
    profile.consistency = validate(profile);
    return profile;
  }

  function choosePlatform(rng, opts) {
    const w = Object.assign({ android: 30, windows: 40, macos: 15, ios: 9, linux: 6 }, opts.platformWeights || {});
    return rng.weighted(Object.keys(w), (k) => w[k]);
  }
  function pickBrowser(rng, platform) {
    if (platform === 'ios') return 'safari';
    if (platform === 'android') return rng.chance(0.9) ? 'chrome' : 'firefox';
    return rng.weighted(['chrome', 'edge', 'firefox', 'safari'], (k) => ({ chrome: 62, edge: 14, firefox: 13, safari: platform === 'macos' ? 11 : 0 }[k]));
  }
  function randomCountry(rng, opts) {
    const w = { US: 20, GB: 9, DE: 9, FR: 6, NL: 4, CA: 5, AU: 4, IN: 7, BR: 5, JP: 4, TR: 3, AE: 3, ID: 3, SG: 2, SA: 2, ES: 3, IT: 3, PL: 2, SE: 2, CH: 2, MX: 3, KR: 2, VN: 2, TH: 2, PH: 2, ZA: 2, NG: 2, EG: 2, MY: 2, IL: 2, AT: 1, PT: 1, IE: 1, FI: 1, NO: 1, DK: 1, QA: 1, AR: 2, CL: 1, CO: 1, KE: 1, NZ: 1 };
    const list = Object.keys(w).filter((c) => GEO[c] && GEO[c].length);
    return U.pickWeighted(list, rng, (c) => w[c] || 1);
  }
  function pickProxy(rng, country) {
    const list = PROXY_CATALOG[country];
    if (!list || !list.length) return null;
    const p = rng.pick(list);
    return Object.assign({}, p);
  }
  function demoProxy(rng, country, city) {
    const meta = GEO_META[country] || { isp: 'ISP' };
    const orgs = meta.orgs || ['ISP'];
    const slug = String(city || 'core').split(',')[0].toLowerCase().replace(/[^a-z]/g, '').slice(0, 8) || 'core';
    return {
      isDemo: true,
      host: `gw.${slug}${rng.int(1, 9)}.dpx-edge.net`, port: rng.pick([8000, 8080, 9000]), protocol: 'socks5',
      country, city, isp: rng.pick(orgs), type: rng.pick(['residential', 'residential', 'mobile']), asn: rng.int(1000, 65000),
    };
  }
  function makePassword(rng) {
    const a = 'ABCDEFGHJKLMNPQRSTUVWXYZ', b = 'abcdefghijkmnopqrstuvwxyz', d = '23456789', s = '!@#$%^&*-_=+';
    const pick = (str) => str[rng.int(0, str.length - 1)];
    let out = pick(a) + pick(b) + pick(d) + pick(s);
    for (let i = 0; i < 10; i++) out += pick(a + b + d);
    return out;
  }
  function defaultPermissions(family, mobile) {
    const base = { geolocation: 'prompt', notifications: 'default', camera: 'prompt', microphone: 'prompt', clipboardRead: 'prompt', midi: 'prompt', backgroundSync: 'granted' };
    if (family === 'firefox') base.midi = 'denied';
    if (mobile) base.geolocation = 'granted';
    return base;
  }

  /* --------------------------------------------------------------- risk model */
  /* Weighted, explainable 0–100 risk (higher = easier to blend in). */
  function riskOf(p) {
    const f = [];
    const add = (id, label, w, why) => f.push({ id, label, w, why });
    const countryPop = { US: 1, GB: 0.9, DE: 0.9, IN: 0.85, BR: 0.8, FR: 0.75, JP: 0.7, CA: 0.7, AU: 0.65, NL: 0.5, SG: 0.4, QA: 0.15, KE: 0.2, NG: 0.25, NZ: 0.3 };
    add('country', 'Country commonness', (countryPop[p.geo.country] || 0.4) * 18, `Traffic share of ${p.geo.countryName} — dense countries blend in easier.`);
    add('os_share', 'OS market share', ({ windows: 1, android: 0.95, macos: 0.7, ios: 0.6, linux: 0.35 }[p.os.platform] || 0.4) * 16, `${p.os.platform} share on the web.`);
    add('browser_share', 'Browser share', ({ chrome: 1, safari: 0.7, edge: 0.6, firefox: 0.45 }[p.browser.family] || 0.4) * 14, `Share of ${p.browser.name}.`);
    add('proxy', 'Proxy quality', (p.network.mode === 'proxy' ? (p.network.proxy && p.network.proxy.type === 'mobile' ? 1 : p.network.proxy && p.network.proxy.type === 'residential' ? 0.85 : 0.4) : 0.3) * 16, p.network.mode === 'proxy' ? `Exit type: ${p.network.proxy ? p.network.proxy.type : 'none'}.` : 'Direct IP — datacenter/VPN reputation risk is on you.');
    add('locale', 'Locale coherence', ((LOCALES[p.geo.country] || []).includes(p.locale.locale) ? 1 : 0.2) * 10, `Locale ${p.locale.locale} vs country ${p.geo.country}.`);
    add('screen', 'Display rarity', (String(p.screen.width) + 'x' + p.screen.height).length && p.os.platform === 'android' ? 0.8 : 0.7, 'DPR/screen pair vs catalogued devices.');
    add('privacy', 'Privacy posture', (p.privacy.mode === 'standard' ? 1 : p.privacy.mode === 'strict' ? 0.8 : 0.6) * 8, `Mode ${p.privacy.mode}; DNT ${p.privacy.doNotTrack}.`);
    add('behavior', 'Behavior model', (p.behavior && p.behavior.humanize ? 1 : 0.4) * 8, 'Humanized input timing enabled.');
    const score = Math.round(U.clamp(f.reduce((a, b) => a + b.w, 0), 0, 100));
    const grade = score >= 85 ? 'A' : score >= 72 ? 'B' : score >= 58 ? 'C' : score >= 45 ? 'D' : 'E';
    return { score, grade, factors: f, at: U.nowISO() };
  }

  /* --------------------------------------------------------------- warm-up plan */
  function warmupPlan(p, rng) {
    const sites = TOP_SITES[p.geo.country] || ['google.com', 'wikipedia.org', 'youtube.com'];
    const days = Math.max(3, Math.min(10, p.behavior.warmupDays));
    const acts = ['Open home page, scroll 2–3 screens, leave', 'Search a local query, open 2 results', 'Visit 1 store category, view 3 products', 'Read an article to the end, 3–5 min dwell', 'Play a short video, watch 40%+', 'Return visit via direct URL (not a link)', 'Sign-up form: fill 2 fields then abandon', 'Full session: 3 sites, natural pauses'];
    const plan = [];
    for (let d = 1; d <= days; d++) {
      plan.push({
        day: d, minutes: rng.int(8 + d * 3, 15 + d * 6),
        actions: rng.picks(acts, Math.min(acts.length, 2 + Math.floor(d / 2))).map((a) => ({ site: rng.pick(sites), task: a })),
      });
    }
    return { days, plan, note: 'Consistency beats volume: same hours, same timezone, no sudden bursts.' };
  }

  /* --------------------------------------------------------------- surface map */
  /* Flattened list of what a page will read, how it is applied and whether it can
     be spoofed without root. This is the honesty core of DOPPEL X. */
  function surfaceOf(p) {
    const n = p.navigator || {}, s = p.screen || {}, d = p.display || {}, g = p.geo || {};
    const rows = [
      ['navigator.userAgent', n.userAgent, 'network+runtime', 'yes'],
      ['navigator.platform', n.platform, 'runtime', 'yes'],
      ['navigator.vendor', n.vendor, 'runtime', 'yes'],
      ['navigator.languages', (p.locale.languages || []).join(','), 'runtime', 'yes'],
      ['navigator.hardwareConcurrency', String(n.hardwareConcurrency), 'runtime', 'yes'],
      ['navigator.deviceMemory', String(n.deviceMemory), 'runtime', 'yes'],
      ['navigator.maxTouchPoints', String(n.maxTouchPoints), 'runtime', 'yes'],
      ['uaData.platform / mobile / model', p.clientHints ? `${p.clientHints.platform} / ${p.clientHints.mobile} / ${p.clientHints.model || '—'}` : 'absent', 'network+runtime', 'yes'],
      ['Sec-CH-UA / -Mobile / -Platform', p.clientHints ? `v${p.browser.major} / ?${p.clientHints.mobile ? 1 : 0} / "${p.clientHints.platform}"` : 'not sent', 'network', 'yes'],
      ['screen.width × height', `${s.width}×${s.height} @${s.dpr}`, 'runtime', 'yes'],
      ['screen.availWidth × availHeight', `${d.availWidth}×${d.availHeight}`, 'runtime', 'yes'],
      ['devicePixelRatio', String(d.dpr), 'runtime', 'yes'],
      ['Intl timezone', g.tz, 'runtime', 'yes'],
      ['getTimezoneOffset()', String(-g.tzOffset), 'runtime', 'yes'],
      ['WebGL vendor / renderer', p.hardware.gpu.unmaskedRenderer, 'runtime', 'yes'],
      ['WebGPU adapter', p.hardware.webgpuAdapter || 'absent', 'runtime', 'partial'],
      ['Canvas hash', p.fingerprint.canvas === 'noise' ? 'stable per-profile noise' : 'native', 'runtime', 'yes'],
      ['AudioContext hash', p.fingerprint.audio, 'runtime', 'yes'],
      ['Font list', `${(p.fingerprint.fonts || []).length} families`, 'runtime', 'yes'],
      ['ClientRects', p.fingerprint.clientRectsNoise ? 'sub-pixel noise' : 'native', 'runtime', 'yes'],
      ['Battery', p.fingerprint.spoofBattery ? `${Math.round(p.fingerprint.battery.level * 100)}% ${p.fingerprint.battery.charging ? 'charging' : 'discharging'}` : 'native', 'runtime', 'yes'],
      ['SpeechSynthesis voices', `${(p.speech || []).length} voices`, 'runtime', 'yes'],
      ['Permissions', Object.keys(p.permissions || {}).map((k) => `${k}=${p.permissions[k]}`).slice(0, 4).join(' '), 'runtime', 'yes'],
      ['mediaDevices counts', `${p.hardware.cameraCount}c/${p.hardware.microphoneCount}m/${p.hardware.speakerCount}s`, 'runtime', 'yes'],
      ['Storage quota', U.bytes((p.storage.quotaMB || 0) * 1e6), 'runtime', 'partial'],
      ['WebRTC local/STUN', p.network.webrtc === 'disabled' ? 'blocked (no candidates)' : p.network.localIp, 'runtime', 'yes'],
      ['Public IP / ASN / city', p.network.proxy ? `${p.network.proxy.host} · ${p.geo.isp} · ${g.city}` : `direct · ${p.geo.isp}`, 'network', 'proxy'],
      ['TLS / JA3–JA4', `must match ${p.browser.name} ${p.browser.major}`, 'transport', 'no'],
      ['TCP/IP stack (p0f)', `must match ${p.os.osName}`, 'transport', 'no'],
      ['CPU timing class', p.os.platform === 'android' ? 'ARM phone SoC' : 'desktop x86 timing', 'hardware', 'no'],
      ['Font raster metrics (native)', p.os.platform === 'android' ? 'device font engine' : 'desktop rasterizer', 'hardware', 'no'],
    ];
    return rows.map(([k, v, via, spoofable]) => ({ key: k, value: v == null ? '' : String(v), via, spoofable }));
  }

  /* ================================================================ VALIDATOR */
  function validate(p) {
    const errors = [], warnings = [], checks = [];
    const err = (id, label, detail) => { errors.push({ id, label, detail }); checks.push({ ok: false, sev: 'error', id, label, detail }); };
    const warn = (id, label, detail) => { warnings.push({ id, label, detail }); checks.push({ ok: false, sev: 'warn', id, label, detail }); };
    const ok = (id, label, detail) => checks.push({ ok: true, sev: 'pass', id, label, detail: detail || '' });
    const info = (id, label, detail) => checks.push({ ok: true, sev: 'info', id, label, detail: detail || '' });
    const os = p.os || {}, b = p.browser || {}, g = p.geo || {}, n = p.navigator || {}, d = p.display || {}, z = TZ_BY_ID[g.tz];
    const loc = p.locale || {}, f = p.fingerprint || {}, net = p.network || {}, hw = p.hardware || {};
    const mobile = os.platform === 'android' || os.platform === 'ios';

    /* 1 — geography & time */
    if (!z) err('tz_valid', 'Timezone exists', `"${g.tz}" is not a known IANA zone.`);
    else {
      if (z.country !== g.country) err('tz_country', 'Timezone matches IP country', `IP says ${g.country}, zone ${g.tz} belongs to ${z.country}.`);
      else ok('tz_country', 'Timezone matches IP country');
      const place = (GEO[g.country] || []).find((x) => x[0] === g.city);
      if (place && place[3] !== g.tz) err('city_tz', 'City matches timezone', `${g.city} lives in ${place[3]}, profile claims ${g.tz}.`);
      else if (place) ok('city_tz', 'City and timezone agree');
      const nowOff = tzOffset(z, new Date());
      if (g.tzOffset !== nowOff) warn('tz_offset', 'Timezone offset is current', `stored ${g.tzOffset} min, today it is ${nowOff} min (DST drift).`);
      else ok('tz_offset', 'Timezone offset is current (DST-aware)');
      if (g.tzAbbr !== tzAbbr(z, new Date())) warn('tz_abbr', 'Timezone abbreviation is current', `${g.tzAbbr} vs ${tzAbbr(z, new Date())}`);
      else ok('tz_abbr', 'Timezone abbreviation is current');
    }
    if (p.locale && p.locale.tz !== g.tz) err('locale_tz', 'System timezone equals network timezone', `${p.locale.tz} ≠ ${g.tz}`);
    else ok('locale_tz', 'System timezone equals network timezone');
    const langs = (p.locale && p.locale.languages) || n.languages || [];
    const primaryLang = String(langs[0] || '').split('-')[0];
    const allowedLangs = LOCALES[g.country] || [];
    if (primaryLang && !allowedLangs.some((l) => l.startsWith(primaryLang)) && primaryLang !== 'en') warn('lang_country', 'Language fits the IP country', `${langs[0]} on ${g.country}`);
    else ok('lang_country', 'Language fits the IP country');
    if ((LOCALE_META[p.locale.locale] || [])[2] !== g.currency) warn('currency', 'Currency fits country and locale', `${g.currency} vs locale ${p.locale.locale}`);
    else ok('currency', 'Currency fits country and locale');
    if (p.locale.direction !== dirOf(p.locale.locale)) err('dir', 'Text direction fits locale', `dir=${p.locale.direction} for ${p.locale.locale}`);
    else ok('dir', 'Text direction fits locale');
    if (p.locale.hour12 !== hour12(p.locale.locale)) warn('hour12', 'Clock format fits locale', `${p.locale.hour12} vs expected ${hour12(p.locale.locale)}`);
    else ok('hour12', 'Clock format fits locale');
    if (p.locale.weekStart !== GEO_META[g.country].weekStart) warn('week_start', 'Week starts on the local day', `${p.locale.weekStart} vs ${GEO_META[g.country].weekStart}`);
    else ok('week_start', 'Week starts on the local day');

    /* 2 — OS × browser */
    if (b.family === 'safari' && !['macos', 'ios'].includes(os.platform)) err('safari_os', 'Safari runs on Apple OSes only', `Safari on ${os.platform}.`);
    else if (b.family === 'safari') ok('safari_os', 'Safari on a valid OS');
    if (b.family === 'edge' && os.platform === 'ios') err('edge_ios', 'Edge on iOS must be WebKit', 'Edge iOS reports EdgiOS; use Safari or Chrome.');
    if (!BROWSERS[b.family] || !BROWSERS[b.family].platforms[os.platform]) err('browser_platform', 'Browser exists for this OS', `${b.name} has no ${os.platform} build.`);
    else ok('browser_platform', 'Browser exists for this OS');

    /* 3 — UA coherence */
    const ua = n.userAgent || '';
    const majorFromUa = (() => {
      if (b.family === 'safari') { const m = ua.match(/Version\/(\d+)/); return m ? +m[1] : null; }
      if (b.family === 'firefox') { const m = ua.match(/Firefox\/(\d+)/); return m ? +m[1] : null; }
      const m = ua.match(/Chrome\/(\d+)/); return m ? +m[1] : null;
    })();
    if (majorFromUa !== b.major) err('ua_version', 'UA version equals browser version', `UA ${majorFromUa} vs profile ${b.major}`);
    else ok('ua_version', 'UA version equals browser version');
    if (os.platform === 'android' && !/Android/.test(ua)) err('ua_android', 'UA mentions Android', 'Android OS but UA is not Android.');
    if (os.platform === 'android' && os.device && b.family !== 'firefox' && !ua.includes(os.device.model)) err('ua_model', 'UA contains device model', `Model ${os.device.model} missing from UA.`);
    if (os.platform === 'android' && !/Mobile/.test(ua) && b.family !== 'firefox') warn('ua_mobile', 'UA contains Mobile token', 'Chrome Android should write "Mobile Safari".');
    if (os.platform === 'ios' && !/iPhone OS /.test(ua)) err('ua_ios', 'UA matches iOS', 'Expected "CPU iPhone OS".');
    if (os.platform === 'windows' && !/Windows NT 10\.0/.test(ua)) err('ua_windows', 'Windows UA uses NT 10.0', 'Expected "Windows NT 10.0".');
    if (os.platform === 'macos' && !/Macintosh/.test(ua)) err('ua_mac', 'macOS UA contains Macintosh', 'Expected "Macintosh".');
    if (n.appVersion && !n.appVersion.endsWith(ua.replace('Mozilla/', ''))) warn('appversion', 'appVersion continues the UA', 'Must equal UA without "Mozilla/".');
    else ok('appversion', 'appVersion continues the UA');
    if (n.platform !== os.platformString) err('nav_platform', 'navigator.platform fits the OS', `${n.platform} vs ${os.platformString}`);
    else ok('nav_platform', 'navigator.platform fits the OS');
    if (os.platform === 'android' && os.device && os.device.model && !/Pixel/.test(os.device.name || '')) { /* fine */ }

    /* 4 — Client Hints */
    if (['chrome', 'edge'].includes(b.family)) {
      const ch = p.clientHints;
      if (!ch) err('ch_present', 'Client Hints present for Chromium', `${b.name} must expose userAgentData.`);
      else {
        ok('ch_present', 'Client Hints present for Chromium');
        if (ch.platform !== chPlatform(os)) err('ch_platform', 'CH platform equals the OS', `${ch.platform} vs ${chPlatform(os)}`);
        else ok('ch_platform', 'CH platform equals the OS');
        if (ch.fullVersion !== b.fullVersion) warn('ch_fullversion', 'CH full version equals the browser', `${ch.fullVersion} vs ${b.fullVersion}`);
        else ok('ch_fullversion', 'CH full version equals the browser');
        if (os.platform === 'windows' && ch.platformVersion !== os.chVersion) err('ch_winver', 'CH Windows version matches build', `${ch.platformVersion} vs ${os.chVersion}`);
        if (os.platform === 'macos' && ch.platformVersion !== os.osVersion) warn('ch_macver', 'CH macOS version matches OS', `${ch.platformVersion} vs ${os.osVersion}`);
        if (os.platform === 'android' && os.device && ch.model !== os.device.model) err('ch_model', 'CH model equals device model', `${ch.model} vs ${os.device.model}`);
        if (ch.mobile !== (os.platform === 'android' || os.platform === 'ios')) err('ch_mobile', 'CH mobile flag fits the device', String(ch.mobile));
        else ok('ch_mobile', 'CH mobile flag fits the device');
        const wantArch = os.arch === 'arm' || os.arch === 'arm64' ? 'arm' : 'x86';
        if (ch.architecture && ch.architecture !== wantArch) warn('ch_arch', 'CH architecture fits the CPU', `${ch.architecture} vs ${wantArch}`);
        else ok('ch_arch', 'CH architecture fits the CPU');
        const brandMajor = (ch.brands.find((x) => x.brand === 'Chromium') || {}).version;
        if (brandMajor && +brandMajor !== b.major) err('ch_brand_major', 'CH brand version equals UA major', `${brandMajor} vs ${b.major}`);
        else ok('ch_brand_major', 'CH brand version equals UA major');
      }
    } else if (p.clientHints) err('ch_forbidden', 'No Client Hints on non-Chromium', `${b.name} does not ship UA-CH.`);
    else ok('ch_forbidden', 'No Client Hints on non-Chromium');

    /* 5 — display & hardware */
    const scr = p.screen || {};
    if (d.width !== scr.width || d.height !== scr.height) err('screen_match', 'screen.* equals profile resolution', 'They must be identical.');
    else ok('screen_match', 'screen.* equals profile resolution');
    if (Number(d.dpr) !== Number(scr.dpr)) err('dpr', 'devicePixelRatio equals profile DPR', `${d.dpr} vs ${scr.dpr}`);
    else ok('dpr', 'devicePixelRatio equals profile DPR');
    if (os.platform === 'ios') {
      if (n.maxTouchPoints !== 5) err('touch_mobile', 'Touch points = 5 on mobile', String(n.maxTouchPoints));
      else ok('touch_mobile', 'Touch points = 5 on mobile');
      if (scr.width > scr.height) warn('mobile_orientation', 'Mobile screen is portrait', 'Most phones are used in portrait.');
      else ok('mobile_orientation', 'Mobile screen is portrait');
      const ios = IOS_DEVICES.find((x) => x.model === (os.device && os.device.model));
      if (ios) {
        if (Number(scr.dpr) !== ios.dpr) err('dpr_device', 'DPR equals the device catalog value', `${scr.dpr} vs ${ios.dpr} for ${ios.name}`);
        else ok('dpr_device', 'DPR equals the device catalog value');
        if (scr.width !== ios.screen[0] || scr.height !== ios.screen[1]) warn('css_device', 'CSS viewport fits the device', `${scr.width}×${scr.height} vs ${ios.screen[0]}×${ios.screen[1]}`);
        else ok('css_device', 'CSS viewport fits the device');
      }
    } else if (os.platform === 'android' && os.device) {
      const dev = DEVICE_MODELS.android.find((x) => x.model === os.device.model);
      if (dev) {
        if (Math.abs(Number(scr.dpr) - dev.dpr) > 0.001) err('dpr_device', 'DPR equals the device catalog value', `${scr.dpr} vs ${dev.dpr} for ${dev.name}`);
        else ok('dpr_device', 'DPR equals the device catalog value');
        const wantW = Math.round(dev.screen[0] / dev.dpr), wantH = Math.round(dev.screen[1] / dev.dpr);
        if (scr.width !== wantW || scr.height !== wantH) warn('css_device', 'CSS viewport fits the device', `${scr.width}×${scr.height} vs ${wantW}×${wantH}`);
        else ok('css_device', 'CSS viewport fits the device');
        if (scr.width > 600) warn('android_css_range', 'Android CSS width is phone-like', `${scr.width}px — phones are 360–430px.`);
        else ok('android_css_range', 'Android CSS width is phone-like');
      }
      if (n.maxTouchPoints !== 5) err('touch_mobile', 'Touch points = 5 on mobile', String(n.maxTouchPoints));
      else ok('touch_mobile', 'Touch points = 5 on mobile');
      if (scr.width > scr.height) warn('mobile_orientation', 'Mobile screen is portrait', 'Most phones are used in portrait.');
      else ok('mobile_orientation', 'Mobile screen is portrait');
    } else {
      if (n.maxTouchPoints > 0) warn('touch_desktop', 'Desktop has no touch points', 'Desktop devices usually report 0.');
      else ok('touch_desktop', 'Desktop has no touch points');
      const known = (DEVICE_MODELS[os.platform] || []).flatMap((m) => (m.screens || []).map((s) => `${s[0]}x${s[1]}@${s[2]}`));
      const combo = `${scr.width}x${scr.height}@${scr.dpr}`;
      if (known.length && !known.includes(combo)) warn('screen_rare', 'Resolution/DPR combo is common', combo);
      else ok('screen_rare', 'Resolution/DPR combo is common');
    }
    if (d.innerWidth > d.width || d.innerHeight > d.height) warn('inner_gt_screen', 'Viewport fits inside the screen', `${d.innerWidth}×${d.innerHeight} > ${d.width}×${d.height}`);
    else ok('inner_gt_screen', 'Viewport fits inside the screen');
    if (n.hardwareConcurrency !== os.cores) err('cores', 'hardwareConcurrency equals CPU cores', `${n.hardwareConcurrency} vs ${os.cores}`);
    else ok('cores', 'hardwareConcurrency equals CPU cores');
    const expectMem = Math.min(8, Math.pow(2, Math.floor(Math.log2(os.ramGB))));
    if (n.deviceMemory !== expectMem) warn('memory', 'deviceMemory reflects real RAM (capped at 8)', `${n.deviceMemory} vs ${os.ramGB} GB → ${expectMem}`);
    else ok('memory', 'deviceMemory reflects real RAM (capped at 8)');

    /* 6 — GPU */
    if (!hw.gpu || !hw.gpu.renderer) err('gpu_present', 'GPU info present', 'WebGL renderer required.');
    else {
      const r = hw.gpu.renderer;
      if (os.platform === 'android' && /Direct3D|NVIDIA GeForce|AMD Radeon|Intel\(R\)|ANGLE \(Apple/.test(r)) err('gpu_android', 'Android GPU is mobile-class', `"${r}" is a desktop renderer.`);
      else if (os.platform === 'windows' && /Adreno|Mali|Xclipse|Apple/.test(r)) err('gpu_win', 'Windows GPU is desktop-class', `"${r}"`);
      else if (os.platform === 'macos' && /Direct3D|Adreno|Mali/.test(r)) err('gpu_mac', 'macOS GPU is Apple-class', `"${r}"`);
      else ok('gpu_class', 'GPU class fits the OS');
      if (os.platform === 'android' && os.device) {
        const dev = DEVICE_MODELS.android.find((x) => x.model === os.device.model);
        if (dev && !gpuMatcher(r, dev.gpuKey)) warn('gpu_device', 'GPU matches the device model', `${r} vs ${dev.gpuKey} for ${dev.name}`);
        else ok('gpu_device', 'GPU matches the device model');
        if (/Pixel/i.test(os.device.name) && /Adreno/.test(r)) warn('gpu_pixel', 'Pixel + Adreno is rare', 'Pixels normally ship Mali/Immortalis.');
      }
      if (hw.gpu.unmaskedVendor && hw.gpu.unmaskedVendor !== hw.gpu.vendor && os.platform === 'android') warn('gpu_vendor', 'WebGL vendor strings agree', `${hw.gpu.vendor} vs ${hw.gpu.unmaskedVendor}`);
      else ok('gpu_vendor', 'WebGL vendor strings agree');
    }

    /* 7 — fonts & plugins */
    if (!Array.isArray(f.fonts) || !f.fonts.length) err('fonts_present', 'Font list present', 'An empty list is a strong signal.');
    else if (os.platform === 'android' && f.fonts.length > 60) warn('fonts_android', 'Android font list is small', `${f.fonts.length} families`);
    else ok('fonts_present', 'Font list present');
    if (os.platform === 'windows' && Array.isArray(f.fonts) && f.fonts.some((x) => /Helvetica Neue|Lucida Grande/.test(x))) warn('fonts_os', 'Fonts fit the OS family', 'macOS-only families on Windows.');
    else ok('fonts_os', 'Fonts fit the OS family');
    if (f.fontsMode === 'custom' && (!f.fontOverride || !f.fontOverride.length)) warn('fonts_custom_empty', 'Custom font mode has fonts', 'Empty override list falls back to OS defaults.');
    if (b.family === 'firefox' && (f.plugins || []).length > 0) err('plugins_ff', 'Firefox has no Chromium PDF plugin', 'Expected an empty plugin array.');
    else ok('plugins_ok', 'Plugin list fits the browser');
    if (['android', 'ios'].includes(os.platform) && (p.extensions || []).length > 0) err('ext_mobile', 'No extensions on mobile', 'Mobile browsers cannot install extensions.');
    else ok('ext_ok', 'Extensions fit the platform');
    if (b.family === 'firefox' && (p.extensions || []).length) warn('ext_ff', 'Chrome extension IDs are not valid on Firefox', 'Use empty lists for Firefox.');
    if ((p.extensions || []).length && p.privacy.blockAds && !p.extensions.some((e) => /uBlock|AdBlock/.test(e.name))) warn('adblock', 'Ad-block claim matches an installed extension', 'blockAds=true without a blocker.');
    else ok('adblock_ok', 'Ad-block claim is consistent');

    /* 8 — network */
    if (net.mode === 'proxy' && !net.proxy) warn('proxy_missing', 'Proxy mode has a proxy', 'Running on the real IP.');
    else if (net.mode === 'proxy') ok('proxy_present', 'Proxy mode has a proxy');
    if (net.proxy && net.proxy.country !== g.country) err('proxy_country', 'Proxy country equals profile country', `${net.proxy.country} vs ${g.country}`);
    else ok('proxy_country', 'Proxy country equals profile country');
    if (net.mode === 'proxy' && net.webrtc !== 'disabled') warn('webrtc_state', 'WebRTC blocked under proxy', 'STUN can reveal the real IP.');
    else ok('webrtc_state', 'WebRTC policy fits the network mode');
    if (net.localIp && /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|127\.)/.test(net.localIp) === false) err('webrtc_leak', 'localIp is private', `${net.localIp} is public.`);
    else ok('webrtc_leak', 'localIp is private');
    if ((os.platform === 'android' || os.platform === 'ios') && net.connection && net.connection.type !== 'cellular') warn('conn_mobile', 'Mobile connection type is cellular', net.connection.type);
    else ok('conn_ok', 'Connection type is coherent');
    if (net.proxy && net.proxy.type === 'residential' && net.proxy.isp && /datacenter|hosting|cloud|digitalocean|ovh|hetzner/i.test(net.proxy.isp)) err('proxy_isp', 'Residential exit has a consumer ISP', net.proxy.isp);
    else ok('proxy_isp', 'Residential exit has a consumer ISP');
    if (net.failRate != null && (net.failRate < 0 || net.failRate > 5)) warn('fail_rate', 'Proxy fail rate is plausible', `${net.failRate}%`);
    else ok('fail_rate', 'Proxy fail rate is plausible');

    /* 9 — privacy */
    if (p.privacy) {
      if (p.privacy.doNotTrack !== (n.doNotTrack === '1')) err('dnt', 'Do Not Track flag agrees everywhere', 'privacy.doNotTrack vs navigator.doNotTrack');
      else ok('dnt', 'Do Not Track flag agrees everywhere');
      if (p.privacy.globalPrivacyControl && b.family === 'safari' && os.platform === 'ios') warn('gpc_ios', 'GPC on iOS Safari is rare', 'Global Privacy Control is uncommon on iOS.');
      else ok('gpc', 'GPC state is plausible');
      if (p.privacy.mode === 'off' && p.privacy.doNotTrack) warn('privacy_off_dnt', 'Privacy mode is internally consistent', 'mode=off but DNT on.');
      else ok('privacy_mode', 'Privacy mode is internally consistent');
    }

    /* 10 — mobile extras */
    if (os.platform === 'android' || os.platform === 'ios') {
      if (f.spoofBattery !== true) warn('battery_mobile', 'Battery API is modelled on mobile', 'Mobile devices expose BatteryManager.');
      else ok('battery_mobile', 'Battery API is modelled on mobile');
      if (!f.battery || f.battery.level == null) err('battery_values', 'Battery values present', 'Missing level/charging.');
      else ok('battery_values', 'Battery values present');
      if ((p.hardware.cameraCount || 0) < 1) warn('cam_mobile', 'Mobile has cameras', 'cameraCount=0 on a phone.');
      else ok('cam_mobile', 'Mobile has cameras');
      if (!Array.isArray(p.speech) || !p.speech.length) warn('speech_voices', 'Speech voices present', 'An empty voice list is unusual.');
      else if (!p.speech.some((v) => v.lang === p.locale.locale)) warn('speech_locale', 'A voice exists for the profile locale', `no ${p.locale.locale} voice`);
      else ok('speech_locale', 'A voice exists for the profile locale');
      if (p.permissions && p.permissions.notifications === 'granted') warn('perm_default', 'Notification permission is default', 'granted without a user gesture is suspicious.');
      else ok('perm_default', 'Notification permission is default');
      if (os.platform === 'android' && os.osVersion && +os.osVersion < 11 && b.major >= 130) warn('os_browser_age', 'Browser major fits the OS version', `Chrome ${b.major} on Android ${os.osVersion} is unlikely.`);
      else ok('os_browser_age', 'Browser major fits the OS version');
    } else {
      if (f.batteryMode === 'live') warn('battery_desktop', 'Desktop battery is steady', 'Desktop devices are usually plugged in.');
      else ok('battery_desktop', 'Desktop battery is steady');
    }

    /* 11 — WebGPU / storage */
    if (f.webgpu === 'present' && (os.platform === 'ios' || (b.family === 'firefox' && b.major < 141))) warn('webgpu', 'WebGPU availability fits the browser', `${f.webgpu} on ${b.name} ${b.major}`);
    else ok('webgpu', 'WebGPU availability fits the browser');
    if (p.storage && p.storage.quotaMB && p.storage.quotaMB < 300) warn('quota', 'Storage quota is realistic', `${p.storage.quotaMB} MB`);
    else ok('quota', 'Storage quota is realistic');

    /* 11.5 — cross-surface parity & plausibility */
    if (/HeadlessChrome/.test(n.userAgent) || /Headless/.test(n.appVersion)) err('headless_ua', 'No headless marker in the UA', 'HeadlessChrome in the UA is an instant block.');
    else ok('headless_ua', 'No headless marker in the UA');
    if (n.webdriver !== false) err('webdriver_false', 'navigator.webdriver is false', String(n.webdriver));
    else ok('webdriver_false', 'navigator.webdriver is false');
    const platTok = os.platform === 'windows' ? /Windows NT/.test(ua) : os.platform === 'macos' ? /Macintosh/.test(ua) : os.platform === 'linux' ? /X11|Linux/.test(ua) : /Android|iPhone/.test(ua);
    if (!platTok) err('ua_platform_token', 'UA carries the platform token', `UA does not look like ${os.platform}.`);
    else ok('ua_platform_token', 'UA carries the platform token');
    const navTok = { windows: 'Win32', macos: 'MacIntel', linux: 'Linux', android: 'Linux', ios: 'iPhone' }[os.platform];
    if (navTok && !String(n.platform).startsWith(navTok.slice(0, 4))) warn('platform_token', 'navigator.platform matches the UA family', `${n.platform} vs ${navTok}`);
    else ok('platform_token', 'navigator.platform matches the UA family');
    if ((loc.languages || [])[0] !== loc.locale) warn('lang_primary', 'Primary language equals navigator.language', `${(loc.languages || [])[0]} vs ${loc.locale}`);
    else ok('lang_primary', 'Primary language equals navigator.language');
    if (b.family === 'firefox' && n.deviceMemory !== undefined) { info('dm_firefox', 'deviceMemory presence fits the browser', 'Firefox hides it in this profile build.'); }
    else if (b.family === 'firefox') ok('dm_firefox', 'deviceMemory presence fits the browser');
    else ok('dm_firefox', 'deviceMemory presence fits the browser');
    if (b.family !== 'firefox' && n.deviceMemory == null && !mobile) warn('dm_missing', 'deviceMemory present on Chromium', 'Chromium exposes deviceMemory; its absence is a tell.');
    else ok('dm_chromium_present', 'deviceMemory presence fits the engine');
    if (n.hardwareConcurrency < 4 || n.hardwareConcurrency > 24) warn('cores_range', 'Core count is plausible', String(n.hardwareConcurrency));
    else ok('cores_range', 'Core count is plausible');
    if (d.width < 320 || d.height < 320) err('viewport_min', 'Screen is at least 320px', `${d.width}×${d.height}`);
    else ok('viewport_min', 'Screen is at least 320px');
    if (!mobile && d.availHeight >= d.height) warn('avail_shrink', 'Desktop availHeight accounts for the OS chrome', `${d.availWidth}×${d.availHeight} vs ${d.width}×${d.height}`);
    else if (!mobile) ok('avail_shrink', 'Desktop availHeight accounts for the OS chrome');
    else ok('avail_shrink', 'Mobile availHeight accounts for system bars');
    if (!mobile && d.availWidth !== d.width) warn('avail_width', 'Desktop availWidth equals screen width', `${d.availWidth} vs ${d.width}`);
    else ok('avail_width', 'availWidth fits the platform');
    if (![24, 30, 48].includes(Number(d.colorDepth))) warn('color_depth', 'Color depth is standard', String(d.colorDepth));
    else ok('color_depth', 'Color depth is standard');
    if (mobile && (f.plugins || []).length > 5) warn('plugins_mobile', 'Mobile plugin list is minimal', `${(f.plugins || []).length} entries`);
    else if (!mobile && b.family !== 'firefox' && (f.plugins || []).length === 0) warn('plugins_desktop', 'Chromium desktop lists the PDF plugin', 'Empty plugin list on desktop Chromium is unusual.');
    else ok('plugins_platform', 'Plugin count fits the platform');
    if (Array.isArray(p.speech) && p.speech.length) {
      const defs = p.speech.filter((v) => v.default).length;
      if (defs !== 1) warn('speech_default', 'Exactly one default speech voice', `${defs} defaults`);
      else ok('speech_default', 'Exactly one default speech voice');
    } else ok('speech_default', 'Speech voice list present');
    if (p.behavior && (p.behavior.sessionCapMin < 10 || p.behavior.sessionCapMin > 180)) warn('session_cap', 'Session cap is human-scale', `${p.behavior.sessionCapMin} min`);
    else ok('session_cap', 'Session cap is human-scale');
    if (p.persona && (p.persona.age < 18 || p.persona.age > 75)) warn('persona_age', 'Persona age is adult and plausible', String(p.persona.age));
    else ok('persona_age', 'Persona age is adult and plausible');
    if (net.proxy && /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|localhost)/i.test(String(net.proxy.host))) err('proxy_private', 'Proxy host is not a private address', net.proxy.host);
    else ok('proxy_private', 'Proxy host is not a private address');
    if (p.privacy && !['allow', 'allow-3p-blocked', 'session-only'].includes(p.privacy.cookies)) warn('cookie_enum', 'Cookie policy value is known', String(p.privacy.cookies));
    else ok('cookie_enum', 'Cookie policy value is known');

    /* 12 — identity & operations */
    if (!p.persona || !p.persona.firstName) warn('persona', 'Persona present', 'Mail/account creation needs a persona.');
    else ok('persona', 'Persona present');
    if (p.behavior) {
      if (p.behavior.typingWpm < 20 || p.behavior.typingWpm > 110) warn('wpm', 'Typing speed is human', `${p.behavior.typingWpm} WPM`);
      else ok('wpm', 'Typing speed is human');
      if (p.behavior.dwellMin > p.behavior.dwellMax) err('dwell', 'Dwell range is ordered', `${p.behavior.dwellMin} > ${p.behavior.dwellMax}`);
      else ok('dwell', 'Dwell range is ordered');
      if (!p.behavior.humanize) warn('humanize', 'Input humanization on', 'Raw events are a behavioural red flag.');
      else ok('humanize', 'Input humanization on');
    }
    if (Array.isArray(p.surface) && p.surface.length < 20) warn('surface', 'Surface map complete', `${p.surface.length} rows`);

    /* 13 — real IP audit, SOCKS5 relay safety, deduplication & native-engine match */
    if (net.mode === 'proxy' && net.proxy) {
      const px = net.proxy;
      if (px.isDemo) info('proxy_demo', 'Proxy endpoint status', 'Demo placeholder endpoint; bind a verified residential/ISP proxy before live launch.');
      else ok('proxy_live', 'Real proxy endpoint bound', `${px.host}:${px.port}`);

      if (px.protocol === 'socks5' && px.username && !px.viaRelay) {
        warn('socks5_chromium_auth', 'Chromium SOCKS5 auth safety', 'Chromium ignores SOCKS5 user:pass and can fall back to direct IP! Enable Local Fail-Closed Relay or Super Proxy.');
      } else {
        ok('socks5_chromium_auth', 'Proxy auth transport is browser-safe', px.viaRelay ? `Local fail-closed relay (127.0.0.1:${px.localRelayPort || 18080})` : 'Direct/VPN/HTTP auth safe');
      }

      if (px.exitIp) {
        ok('ip_audited', 'Exit IP live-verified', `${px.exitIp} (${px.subnet24 || subnet24(px.exitIp)})`);
        if (px.verdict === 'BLOCK' || px.isHosting) err('ip_clean', 'Exit IP passes residential/ISP reputation', `Flagged (${px.verdict || 'HOSTING'}, risk=${px.fraudScore ?? '?'})`);
        else if ((px.fraudScore != null && px.fraudScore >= 30) || px.verdict === 'CAUTION') warn('ip_clean', 'Exit IP reputation is borderline', `Risk score ${px.fraudScore ?? '?'}/100`);
        else ok('ip_clean', 'Exit IP passes fraud/hosting reputation', `Score ${px.fraudScore ?? 0}/100 · ${px.type || 'residential'}`);

        if (px.isUsedDuplicate) err('ip_dedup', 'Exit IP is unique (never reused)', `${px.exitIp} already exists in Used-IP Vault.`);
        else ok('ip_dedup', 'Exit IP is unique in Vault');

        if (px.subnetCollision) warn('ip_subnet', '/24 subnet has no prior collision', `${px.subnet24 || subnet24(px.exitIp)} used in a previous session.`);
        else ok('ip_subnet', '/24 subnet has no prior collision');

        if (px.dnsLeak) err('ip_dns_leak', 'DNS resolver stays inside proxy exit', 'DNS resolved outside target region (Iran/local DNS leak).');
        else ok('ip_dns_leak', 'DNS resolver matches proxy tunnel');

        if (px.lat != null && px.lon != null && g.lat != null && g.lon != null) {
          const km = geoDistanceKm(g.lat, g.lon, px.lat, px.lon);
          if (km > 250) warn('ip_geo_dist', 'Profile coordinates match exit IP city', `${km} km drift (${g.city} vs ${px.city || '?'})`);
          else ok('ip_geo_dist', 'Profile coordinates aligned to exit IP', `${km} km`);
        }
      } else {
        info('ip_audited', 'Exit IP live audit pending', 'Run IP Audit in Unified Hub before opening target sites.');
      }
    }
    if (os.platform === 'android' && ['chrome', 'firefox'].includes(b.family)) {
      ok('native_engine', 'TLS/V8/TCP stack matches real Android phone', `${b.engine} on ARM64 Linux/Android (TTL=64)`);
    }

    /* score */
    const total = checks.length;
    const pass = checks.filter((c) => c.ok).length;
    const score = Math.max(0, Math.round((pass / Math.max(1, total)) * 100 - 16 * errors.length - 2.5 * warnings.length));
    const grade = score >= 92 && !errors.length ? 'A' : score >= 84 && !errors.length ? 'B' : score >= 70 ? 'C' : score >= 55 ? 'D' : 'E';
    return { score, grade, errors, warnings, checks, at: U.nowISO() };
  }

  /* ================================================================ AUTO-REPAIR */
  /* Re-derive every dependent surface from the anchors: country/city, platform,
     device, browser. This is what runs after a manual edit. */
  function repair(p) {
    const q = U.clone(p);
    q.geo = q.geo || { country: 'US', city: 'New York, NY' };
    q.locale = q.locale || {};
    q.network = q.network || {};
    q.fingerprint = q.fingerprint || {};
    q.hardware = q.hardware || {};
    q.navigator = q.navigator || {};
    q.display = q.display || {};
    q.browser = q.browser || { family: 'chrome' };
    q.os = q.os || { platform: 'windows' };

    const rng = makeRng(q.seed || q.id || U.uid('r'));

    /* 1) country → city → zone */
    const cc = GEO[q.geo.country] ? q.geo.country : 'US';
    q.geo.country = cc;
    const places = GEO[cc].filter((g) => TZ_BY_ID[g[3]]);
    let place = places.find((g) => g[0] === q.geo.city);
    if (!place) place = places.find((g) => g[3] === q.geo.tz) || places[0];
    const hasAuditedProxy = !!(q.network.proxy && !q.network.proxy.isDemo && q.network.proxy.exitIp);
    if (hasAuditedProxy) {
      q.geo.city = q.network.proxy.city || q.geo.city || place[0];
      q.geo.lat = q.network.proxy.lat != null ? +Number(q.network.proxy.lat).toFixed(4) : +place[1].toFixed(4);
      q.geo.lon = q.network.proxy.lon != null ? +Number(q.network.proxy.lon).toFixed(4) : +place[2].toFixed(4);
      q.geo.tz = (TZ_BY_ID[q.geo.tz] && TZ_BY_ID[q.geo.tz].country === cc) ? q.geo.tz : place[3];
    } else {
      q.geo.city = place[0]; q.geo.lat = +place[1].toFixed(4); q.geo.lon = +place[2].toFixed(4); q.geo.tz = place[3];
    }
    q.geo.countryName = GEO_META[cc].name; q.geo.currency = GEO_META[cc].currency;
    const zone = TZ_BY_ID[q.geo.tz];
    q.geo.tzOffset = tzOffset(zone, new Date()); q.geo.tzAbbr = tzAbbr(zone, new Date()); q.geo.tzLabel = tzLabel(zone);

    /* 2) browser compatibility */
    let fam = BROWSERS[q.browser.family] ? q.browser.family : 'chrome';
    if (!BROWSERS[fam].platforms[q.os.platform]) fam = q.os.platform === 'ios' ? 'safari' : 'chrome';
    if (fam === 'safari' && !['macos', 'ios'].includes(q.os.platform)) fam = 'chrome';
    if (fam === 'edge' && q.os.platform === 'ios') fam = 'safari';
    q.browser.family = fam;
    const train = releaseTrain(fam, new Date());
    if (fam === 'safari') {
      const sv = q.os.platform === 'ios' ? q.os.osVersion : (MAC_ARCH[q.os.archId] ? MAC_ARCH[q.os.archId].safari : '17.4.1');
      const [maj, min] = String(sv || '17.4.1').split('.').map(Number);
      Object.assign(q.browser, { name: 'Safari', engine: 'WebKit', major: maj, minor: min || 0, fullVersion: `${maj}.${min || 0}`, vendor: 'Apple Computer, Inc.' });
    } else {
      const keep = q.browser.fullVersion && q.browser.family === fam &&
        parseInt(String(q.browser.fullVersion).split('.')[0], 10) === train.major &&
        (fam === 'firefox' ? !String(q.browser.fullVersion).includes('.', 2) : String(q.browser.fullVersion).split('.').length === 4);
      const full = keep ? q.browser.fullVersion : (fam === 'firefox' ? `${train.major}.0` : chromeVersion(train.major, rng));
      Object.assign(q.browser, { name: BROWSERS[fam].name, engine: BROWSERS[fam].engine, major: parseInt(full.split('.')[0], 10), fullVersion: full, vendor: fam === 'firefox' ? '' : 'Google Inc.' });
    }

    /* 3) device block */
    if (q.os.platform === 'android') {
      const dev = DEVICE_MODELS.android.find((d) => d.model === (q.os.device && q.os.device.model)) || rng.pick(DEVICE_MODELS.android.filter((d) => (d.browsers || ['chrome']).includes(fam)));
      const av = A_VERSIONS.find((x) => x.v === q.os.osVersion) || androidVersionFor(dev, rng);
      q.os.osName = 'Android'; q.os.osVersion = av.v; q.os.apiLevel = av.api;
      q.os.device = { model: dev.model, name: dev.name, brand: dev.brand, chip: dev.chip, ramGB: dev.ram };
      q.os.screen = { width: Math.round(dev.screen[0] / dev.dpr), height: Math.round(dev.screen[1] / dev.dpr), dpr: dev.dpr, physical: dev.screen };
      q.os.cores = dev.cores; q.os.ramGB = dev.ram; q.os.gpuKey = dev.gpuKey;
      q.os.platformString = 'Linux armv81'; q.os.arch = 'aarch64'; q.os.fontSet = 'android';
      q.screen = Object.assign({}, q.os.screen);
    } else if (q.os.platform === 'ios') {
      const dev = IOS_DEVICES.find((d) => d.model === (q.os.device && q.os.device.model)) || rng.pick(IOS_DEVICES);
      q.os.device = { model: dev.model, name: dev.name, brand: 'apple', chip: 'Apple A-Series', ramGB: dev.ram };
      q.os.osVersion = dev.ios.includes(q.os.osVersion) ? q.os.osVersion : rng.pick(dev.ios);
      q.os.screen = { width: dev.screen[0], height: dev.screen[1], dpr: dev.dpr };
      q.screen = Object.assign({}, q.os.screen);
      q.os.cores = 6; q.os.ramGB = dev.ram; q.os.gpuKey = 'Apple GPU';
      q.os.platformString = 'iPhone'; q.os.osName = 'iOS'; q.os.arch = 'arm64';
    } else if (q.os.platform === 'macos') {
      const key = MAC_ARCH[q.os.archId] ? q.os.archId : 'MacBook Air M1';
      const a = MAC_ARCH[key];
      q.os.archetype = key; q.os.osVersion = a.osVersion; q.os.build = a.osVersion; q.os.chVersion = a.osVersion;
      q.os.arch = 'arm'; q.os.platformString = 'MacIntel'; q.os.fontSet = 'mac'; q.os.gpuKey = a.gpu; q.os.cores = a.cores;
      q.os.ramGB = a.ram.includes(q.os.ramGB) ? q.os.ramGB : rng.pick(a.ram);
      q.os.safariVersion = a.safari;
      const arche = DEVICE_MODELS.macos.find((m) => m.gpu === a.gpu) || DEVICE_MODELS.macos[0];
      const screens = (arche.screens || []).filter(Boolean);
      const scr = q.screen && q.screen.dpr ? q.screen : (screens.length ? rng.pick(screens) : [1440, 900, 2]);
      q.os.screen = { width: scr.width, height: scr.height, dpr: scr.dpr };
      q.screen = Object.assign({}, q.os.screen);
    } else if (q.os.platform === 'linux') {
      const key = q.os.archId === 'fedora' ? 'fedora' : 'ubuntu';
      const a = LINUX_ARCH[key];
      q.os.osName = key === 'ubuntu' ? 'Ubuntu' : 'Fedora Linux'; q.os.osVersion = a.osVersion; q.os.archId = key;
      q.os.arch = 'x86_64'; q.os.platformString = 'Linux x86_64'; q.os.fontSet = 'linux'; q.os.chVersion = a.chVersion;
      q.os.cores = q.os.cores || 8; q.os.ramGB = q.os.ramGB || 16;
      if (!q.screen || !q.screen.dpr) { q.screen = { width: 1920, height: 1080, dpr: 1 }; }
      q.os.screen = Object.assign({}, q.screen);
    } else {
      const variant = q.os.archId === 'win10' ? 'win10' : 'win11';
      const a = WIN_ARCH[variant];
      q.os.archId = variant; q.os.osName = a.label.split(' · ')[0]; q.os.osVersion = a.build; q.os.build = a.build; q.os.chVersion = a.chVersion;
      q.os.arch = 'x86_64'; q.os.platformString = 'Win32'; q.os.fontSet = a.fontSet;
      q.os.gpuTier = q.os.gpuTier != null ? q.os.gpuTier : 1;
      q.os.cores = q.os.cores || 8; q.os.ramGB = q.os.ramGB || 16;
      if (!q.screen || !q.screen.dpr) q.screen = { width: 1920, height: 1080, dpr: 1 };
      q.os.screen = Object.assign({}, q.screen);
    }

    /* 4) navigator */
    const b = q.browser;
    q.navigator.platform = q.os.platformString;
    q.navigator.vendor = b.family === 'firefox' ? '' : b.family === 'safari' ? 'Apple Computer, Inc.' : 'Google Inc.';
    q.navigator.userAgent = buildUa(q);
    q.navigator.appVersion = q.navigator.userAgent.replace('Mozilla/', '');
    q.navigator.productSub = b.family === 'firefox' ? '20100101' : '20030107';
    q.navigator.hardwareConcurrency = q.os.cores;
    q.navigator.deviceMemory = Math.min(8, Math.pow(2, Math.floor(Math.log2(q.os.ramGB))));
    const mobile = q.os.platform === 'android' || q.os.platform === 'ios';
    q.navigator.maxTouchPoints = mobile ? 5 : 0;
    q.navigator.pdfViewerEnabled = b.family !== 'firefox';
    q.navigator.doNotTrack = q.privacy && q.privacy.doNotTrack ? '1' : null;
    q.navigator.oscpu = b.family === 'firefox' ? (q.os.platform === 'windows' ? 'Windows NT 10.0; Win64; x64' : q.os.platform === 'macos' ? 'Intel Mac OS X 10.15' : 'Linux x86_64') : undefined;
    q.hardware.cores = q.os.cores; q.hardware.ramGB = q.os.ramGB; q.hardware.maxTouchPoints = q.navigator.maxTouchPoints;
    q.hardware.cameraCount = mobile ? Math.max(1, q.hardware.cameraCount || 2) : (q.hardware.cameraCount || 0);

    /* 5) client hints */
    q.clientHints = buildCh(q, rng);

    /* 6) display */
    const scr = q.screen;
    const taskbar = q.os.platform === 'windows' ? (q.os.archId === 'win11' ? 48 : 40) : q.os.platform === 'macos' ? 25 : q.os.platform === 'linux' ? 27 : 0;
    const statusBar = q.os.platform === 'ios' ? 47 : q.os.platform === 'android' ? 24 : 0;
    q.display.width = scr.width; q.display.height = scr.height; q.display.dpr = scr.dpr;
    q.display.availWidth = scr.width; q.display.availHeight = mobile ? scr.height - statusBar - 34 : scr.height - taskbar;
    q.display.innerWidth = scr.width; q.display.innerHeight = mobile ? scr.height - statusBar - 34 - 105 : Math.max(320, scr.height - taskbar - 131);
    q.display.colorDepth = 24; q.display.pixelDepth = 24;
    q.display.orientation = mobile || scr.width < scr.height ? 'portrait-primary' : 'landscape-primary';

    /* 7) GPU ← device/OS */
    let g;
    if (q.os.platform === 'android') g = gpuForDevice(q.os.gpuKey);
    else if (q.os.platform === 'ios') g = GPUS.ios[0];
    else if (q.os.platform === 'macos') g = GPUS.mac.find((x) => x.device === q.os.gpuKey) || GPUS.mac[0];
    else {
      const cat = q.os.platform === 'linux' ? GPUS.linux : GPUS.win;
      g = cat.find((x) => x.device === (q.hardware.gpu && q.hardware.gpu.device)) || U.pickWeighted(cat, rng, (x) => (x.tier === (q.os.gpuTier || 1) ? 6 : x.tier === Math.max(0, (q.os.gpuTier || 1) - 1) ? 2 : 0.25));
    }
    q.hardware.gpu = { vendor: g.vendor, webglVendor: g.webglVendor, renderer: g.webglRenderer, unmaskedVendor: g.unmaskedVendor, unmaskedRenderer: g.unmaskedRenderer, device: g.device };
    q.hardware.webgpuAdapter = (b.family === 'chrome' || b.family === 'edge') ? ({ android: 'Mali/Adreno (Vulkan)', ios: '', macos: 'Apple', windows: 'D3D12', linux: 'Vulkan' }[q.os.platform] || '') : '';

    /* 8) locale ← country (keep user's choice if still legal) */
    const allowed = LOCALES[q.geo.country] || ['en-US'];
    if (!allowed.includes(q.locale.locale)) q.locale.locale = allowed[0];
    q.locale.languageCode = LOCALE_META[q.locale.locale][1];
    q.locale.languages = (q.locale.languages && q.locale.languages.length && q.locale.languages[0].startsWith(q.locale.languageCode)) ? q.locale.languages : [q.locale.locale, ...(q.locale.languageCode !== 'en' ? [q.locale.languageCode] : [])];
    q.locale.tz = q.geo.tz; q.locale.currency = GEO_META[q.geo.country].currency;
    q.locale.direction = dirOf(q.locale.locale); q.locale.hour12 = hour12(q.locale.locale);
    q.locale.timeFormat = q.locale.hour12 ? '12h' : '24h';
    q.locale.weekStart = GEO_META[q.geo.country].weekStart;
    q.locale.firstDayOfWeek = q.locale.weekStart === 0 ? 'Sunday' : 'Monday';
    q.locale.dateFormat = q.locale.locale === 'en-US' ? 'M/D/YYYY' : 'D.M.YYYY';
    q.locale.numberFormat = q.locale.locale === 'en-US' ? '1,234.56' : '1.234,56';
    q.locale.measurement = GEO_META[q.geo.country].speedUnit === 'mph' ? 'imperial' : 'metric';
    q.locale.temperature = GEO_META[q.geo.country].temp;

    /* 9) proxy alignment */
    if (q.network.mode === 'proxy' && !q.network.proxy) q.network.proxy = demoProxy(rng, q.geo.country, q.geo.city);
    if (q.network.proxy) {
      const keepReal = q.network.proxy.isDemo === false || !!(q.network.proxy.username || q.network.proxy.exitIp);
      if (q.network.proxy.country !== q.geo.country && !keepReal) {
        q.network.proxy = Object.assign(demoProxy(rng, q.geo.country, q.geo.city), { country: q.geo.country });
      } else if (keepReal) {
        q.network.proxy.country = q.network.proxy.country || q.geo.country;
        q.network.proxy.city = q.network.proxy.city || q.geo.city;
      } else if (q.network.proxy.city) {
        const m = places.find((x) => x[0].toLowerCase().startsWith(String(q.network.proxy.city).split(',')[0].toLowerCase()));
        if (m) {
          q.geo.city = m[0]; q.geo.lat = m[1]; q.geo.lon = m[2]; q.geo.tz = m[3]; q.locale.tz = m[3];
          /* zone fields must follow the city — otherwise a profile can claim Chicago on EST */
          const zx = TZ_BY_ID[m[3]];
          if (zx) {
            q.geo.tzOffset = tzOffset(zx, new Date());
            q.geo.tzAbbr = tzAbbr(zx, new Date());
            q.geo.tzLabel = tzLabel(zx);
          }
        } else q.network.proxy.city = q.geo.city;
      }
      q.network.proxy.isp = q.network.proxy.isp || q.geo.isp;
    }
    q.network.webrtc = q.network.mode === 'proxy' ? 'disabled' : q.network.webrtc || 'disabled';
    if (!q.network.localIp || !/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|127\.)/.test(q.network.localIp)) q.network.localIp = privateIp(rng, mobile);
    q.network.connection = q.network.connection || {};
    if (mobile) Object.assign(q.network.connection, { type: 'cellular', effectiveType: q.network.connection.effectiveType || '4g' });
    else if (q.network.connection.type === 'cellular') q.network.connection.type = 'wifi';

    /* 10) fonts / plugins / extensions / speech / permissions */
    q.fingerprint.fonts = q.fingerprint.fontsMode === 'custom' && q.fingerprint.fontOverride && q.fingerprint.fontOverride.length ? q.fingerprint.fontOverride.slice() : fontSetFor(q);
    q.fingerprint.plugins = pluginsFor(b.family);
    if (mobile || b.family === 'firefox') q.extensions = [];
    q.privacy = q.privacy || {};
    q.privacy.blockAds = (q.extensions || []).some((e) => /uBlock|AdBlock/.test(e.name));
    q.fingerprint.spoofBattery = mobile;
    q.fingerprint.battery = q.fingerprint.battery || (mobile ? { charging: rng.chance(0.7), level: rng.float(0.2, 0.99) } : { charging: true, level: 1 });
    q.fingerprint.batteryMode = mobile ? 'live' : 'charging';
    q.speech = speechVoices(q.locale.locale, q.os.platform);
    q.permissions = defaultPermissions(b.family, mobile);
    q.storage = q.storage || { localStorage: true, sessionStorage: true, indexedDB: true, quotaMB: mobile ? 5000 : 15000 };

    /* 11) derived blocks */
    q.persona = q.persona || {};
    if (!q.persona.firstName) {
      const pool = NAME_POOL[COUNTRY_NAMES[q.geo.country] || 'anglo'];
      const nm = rng.pick(pool);
      const birth = new Date(Date.UTC(rng.int(1972, 2004), rng.int(0, 11), rng.int(1, 28)));
      Object.assign(q.persona, {
        firstName: nm[0], lastName: nm[1], birthdate: U.fmtDate(birth), age: Math.floor((Date.now() - birth) / (365.25 * 86400000)),
        username: (nm[0] + '.' + nm[1]).toLowerCase().replace(/[^a-z0-9.]/g, '') + String(rng.int(11, 99)),
        password: makePassword(rng), tone: q.persona.tone || 'concise', timezone: q.geo.tz, locale: q.locale.locale,
      });
    }
    q.persona.timezone = q.geo.tz; q.persona.locale = q.locale.locale;
    q.behavior = q.behavior || { humanize: true, typingWpm: 55, clickJitter: 2, mouseCurve: 'bezier', scrollSpeed: 'normal', dwellMin: 2, dwellMax: 8, gaussianNoise: true, warmupDays: 5, sessionCapMin: 45 };
    if (q.behavior.dwellMin > q.behavior.dwellMax) { const t = q.behavior.dwellMin; q.behavior.dwellMin = q.behavior.dwellMax; q.behavior.dwellMax = t; }
    q.surface = surfaceOf(q);
    q.risk = riskOf(q);
    q.warmup = warmupPlan(q, makeRng(String(q.seed || q.id) + '|warmup'));
    q.consistency = validate(q);
    q.updatedAt = U.nowISO();
    return q;
  }

  /* ------------------------------------------------------------- batch & dedupe */
  function generateBatch(count, opts = {}, existing = []) {
    const out = [];
    const keyOf = (p) => `${p.fingerprint.canvasNoiseSeed}|${p.fingerprint.audioSeed}|${p.navigator.userAgent}|${p.geo.city}|${p.screen.width}x${p.screen.height}`;
    const seen = new Set(existing.map(keyOf));
    let guard = 0;
    while (out.length < count && guard < count * 40) {
      guard++;
      const p = generate(opts);
      const k = keyOf(p);
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(p);
    }
    return out;
  }

  /* fingerprint of the strong identifiers (stable short hash) */
  function identityHash(p) {
    const s = [p.navigator.userAgent, p.navigator.platform, p.navigator.hardwareConcurrency, p.navigator.deviceMemory,
      p.screen.width, p.screen.height, p.screen.dpr, p.hardware.gpu.unmaskedRenderer, p.geo.tz,
      (p.locale.languages || []).join(','), p.fingerprint.canvasNoiseSeed].join('|');
    return U.fnv1a(s) + U.fnv1a(s.split('').reverse().join(''));
  }

  /* generate → validate → repair → validate until clean (max 3 rounds) */
  function generateClean(opts = {}) {
    let p = generate(opts);
    let rounds = 0;
    while ((p.consistency.errors.length || p.consistency.warnings.length) && rounds < 3) { p = repair(p); rounds++; }
    p.repairRounds = rounds;
    return p;
  }

  /* ------------------------------------------------------------------- story */
  function story(p) {
    const g = p.geo, b = p.browser, os = p.os, d = p.display;
    const tzNow = new Date().toLocaleString('en-US', { timeZone: g.tz, hour: '2-digit', minute: '2-digit', hour12: p.locale.hour12 });
    return `${p.persona.firstName} ${p.persona.lastName} is a ${p.persona.age}-year-old user in ${g.city}, ${g.countryName}. ` +
      `${p.persona.firstName} runs ${os.osName} ${os.osVersion} on a ${os.archetype} (${p.hardware.gpu.device}) with ${os.cores} cores and ${os.ramGB} GB RAM, ` +
      `surfing on ${b.name} ${b.fullVersion} at ${d.width}×${d.height} @${d.dpr}x. ` +
      `The clock there reads ${tzNow} (${g.tzAbbr}, ${g.tzLabel}); the interface is in ${LOCALE_META[p.locale.locale][0]} and prices show in ${g.currency}. ` +
      (p.network.proxy ? `Traffic leaves through a ${p.network.proxy.type} ${p.network.proxy.protocol.toUpperCase()} exit at ${p.network.proxy.host} (${g.isp}). ` : `Traffic is direct — no proxy attached. `) +
      (p.privacy.mode === 'strict' ? 'Privacy posture is strict: DNT on, tracker blocking, WebRTC sealed.' : 'Privacy posture is standard, like a typical consumer browser.') +
      ` Uniqueness hash: ${identityHash(p)}.`;
  }

  /* ---------------------------------------------- Reverse-Anchor from Live Exit IP */
  /* Takes a real multi-oracle exit IP audit result + optional proxy config and
     synthesizes a 100%-coherent identity anchored directly to that exit IP. */
  function anchorFromIp(audit, opts = {}) {
    const a = audit || {};
    let cc = String(a.countryCode || '').toUpperCase();
    if (!GEO[cc]) {
      const tzHit = a.timezone && TZ_BY_ID[a.timezone];
      cc = (tzHit && GEO[tzHit.country]) ? tzHit.country : 'US';
    }
    const places = (GEO[cc] || GEO.US).filter((g) => TZ_BY_ID[g[3]]);
    let bestPlace = places[0];
    if (a.lat != null && a.lon != null) {
      let bestD = Infinity;
      for (const pl of places) {
        const d = geoDistanceKm(+a.lat, +a.lon, pl[1], pl[2]) + (a.timezone && pl[3] !== a.timezone ? 3000 : 0);
        if (d < bestD) { bestD = d; bestPlace = pl; }
      }
    } else if (a.timezone) {
      bestPlace = places.find((pl) => pl[3] === a.timezone) || places[0];
    }

    const platform = opts.platform || 'android';
    const browser = opts.browser || (platform === 'ios' ? 'safari' : 'chrome');
    const devModel = opts.deviceModel || (platform === 'android' ? '23122PCD1G' : undefined);
    const osVer = opts.osVersion || (platform === 'android' ? '16' : undefined);

    const p = generateClean({
      seed: opts.seed || U.uid('ip'),
      country: cc,
      city: bestPlace[0],
      platform,
      deviceModel: devModel,
      osVersion: osVer,
      browser,
      network: 'proxy',
      privacy: opts.privacy || 'standard',
      name: opts.name || undefined,
    });

    const tzValidForCc = !!(a.timezone && TZ_BY_ID[a.timezone] && TZ_BY_ID[a.timezone].country === cc);
    const tzId = tzValidForCc ? a.timezone : bestPlace[3];
    const zone = TZ_BY_ID[tzId] || TZ_BY_ID[bestPlace[3]];
    const now = new Date();
    const liveCity = a.city ? (a.region && cc === 'US' && a.region.length === 2 ? `${a.city}, ${a.region}` : a.city) : bestPlace[0];

    p.geo.city = liveCity;
    p.geo.liveCity = liveCity;
    p.geo.lat = a.lat != null ? +Number(a.lat).toFixed(4) : bestPlace[1];
    p.geo.lon = a.lon != null ? +Number(a.lon).toFixed(4) : bestPlace[2];
    p.geo.tz = tzId;
    p.geo.tzOffset = zone ? tzOffset(zone, now) : Math.round((a.offsetSec || 0) / 60);
    p.geo.tzAbbr = zone ? tzAbbr(zone, now) : 'Local';
    p.geo.tzLabel = zone ? tzLabel(zone) : `UTC${p.geo.tzOffset >= 0 ? '+' : ''}${(p.geo.tzOffset / 60).toFixed(1)}`;
    p.geo.isp = a.isp || a.org || p.geo.isp;
    p.geo.asn = a.asn || p.geo.asn;
    p.geo.exitIp = a.ip || '';
    p.locale.tz = tzId;
    p.persona.timezone = tzId;
    if (!opts.name) p.name = `${p.persona.firstName} ${p.persona.lastName} · ${liveCity.split(',')[0]}`;

    const pxIn = a.proxyConfig || opts.proxyConfig || {};
    const isOsVpn = pxIn.mode === 'os_vpn' || pxIn.mode === 'vpn' || pxIn.protocol === 'vpn';
    p.network.mode = 'proxy';
    p.network.webrtc = 'disabled';
    p.network.proxy = {
      isDemo: false,
      protocol: isOsVpn ? 'vpn' : (pxIn.protocol || 'socks5'),
      host: isOsVpn ? 'active-vpn' : (pxIn.host || (a.ip || 'active-vpn')),
      port: isOsVpn ? 0 : (Number(pxIn.port) || 0),
      username: pxIn.username || '',
      password: pxIn.password || '',
      viaRelay: !!pxIn.viaRelay,
      localRelayPort: Number(pxIn.localRelayPort) || 18080,
      country: cc,
      city: liveCity,
      lat: p.geo.lat,
      lon: p.geo.lon,
      isp: p.geo.isp,
      asn: a.asn || p.geo.asn,
      type: a.type || (a.isMobile ? 'mobile' : 'residential'),
      exitIp: a.ip || '',
      subnet24: subnet24(a.ip),
      fraudScore: a.fraudScore != null ? Number(a.fraudScore) : 0,
      isHosting: !!a.isHosting,
      isProxy: !!a.isProxy,
      dnsLeak: !!a.dnsLeak,
      verdict: a.verdict || 'PASS',
      isUsedDuplicate: !!a.isUsedDuplicate,
      subnetCollision: !!a.subnetCollision,
      auditedAt: a.auditedAt || U.nowISO(),
    };

    p.surface = surfaceOf(p);
    p.risk = riskOf(p);
    p.warmup = warmupPlan(p, makeRng(p.seed + '|warmup'));
    p.consistency = validate(p);
    p.updatedAt = U.nowISO();
    return p;
  }

  return {
    VERSION, SCHEMA, U, makeRng, generate, generateBatch, generateClean, anchorFromIp, validate, repair,
    riskOf, surfaceOf, warmupPlan, speechVoices, identityHash, story, demoProxy, privateIp, fontSetFor,
    pluginsFor, buildUa, buildCh, androidVersionFor, gpuForDevice, gpuMatcher, choosePlatform, pickBrowser, randomCountry,
    subnet24, geoDistanceKm, NAME_POOL, TOP_SITES,
  };
})();
