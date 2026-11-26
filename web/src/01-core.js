/* ==========================================================================
   DOPPEL — Fingerprint & Identity Studio
   01-core.js : utilities, catalogs (geo / hardware / fonts / extensions),
                seeded RNG, deterministic version math, storage
   --------------------------------------------------------------------------
   همه‌چیز در این فایل «داده» و «ابزار» است. منطق ساخت پروفایل در 02-generate.js
   قرار دارد. این فایل اول لود می‌شود و هیچ وابستگی خارجی ندارد.
   ========================================================================== */
'use strict';

const DOPPEL_VERSION = '3.2.1';
const SCHEMA_VERSION = 3;

/* ------------------------------------------------------------------ utils */
const U = {
  clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
  rnd: (a = 0, b = 1) => a + Math.random() * (b - a),
  clone: (o) => JSON.parse(JSON.stringify(o)),
  uid: (p = 'id') => p + '_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4),
  pad: (n, l = 2) => String(n).padStart(l, '0'),
  fmtDate: (d) => d.toISOString().slice(0, 10),
  nowISO: () => new Date().toISOString(),
  esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  },
  // Deep get/set with dotted path ("navigator.platform")
  getPath(obj, path) {
    return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
  },
  setPath(obj, path, val) {
    const ks = path.split('.');
    let o = obj;
    for (let i = 0; i < ks.length - 1; i++) { if (o[ks[i]] == null || typeof o[ks[i]] !== 'object') o[ks[i]] = {}; o = o[ks[i]]; }
    o[ks[ks.length - 1]] = val;
    return obj;
  },
  bytes(n) { return n == null ? '—' : (n >= 1024 ** 3 ? (n / 1024 ** 3).toFixed(n % 1024 ** 3 ? 1 : 0) + ' GB' : (n / 1024 ** 2).toFixed(0) + ' MB'); },
  download(name, text, type = 'application/json') {
    const blob = new Blob([text], { type });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 800);
  },
  copy(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch (e) {}
    ta.remove(); return Promise.resolve();
  },
  debounce(fn, ms = 250) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; },
  // sha256 (for integrity / namespaced identity derivation)
  async sha256(str) {
    if (window.crypto && crypto.subtle) {
      const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
      return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
    }
    return 'fnv1a:' + U.fnv1a(str);
  },
  fnv1a(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    return (h >>> 0).toString(16);
  },
  isPlainObject: (v) => v != null && typeof v === 'object' && !Array.isArray(v),
  // merge defaults (for forward-compatible stored profiles)
  deepMerge(base, patch) {
    const out = Array.isArray(base) ? base.slice() : Object.assign({}, base);
    if (!U.isPlainObject(patch)) return out;
    for (const k of Object.keys(patch)) {
      if (U.isPlainObject(out[k]) && U.isPlainObject(patch[k])) out[k] = U.deepMerge(out[k], patch[k]);
      else out[k] = patch[k];
    }
    return out;
  },
  // Fisher–Yates with injected rng
  shuffle(arr, rng) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  },
  pickWeighted(list, rng, weightFn) {
    if (typeof weightFn !== 'function') weightFn = () => 1;
    const ws = list.map((x) => Math.max(0, +weightFn(x) || 0));
    const total = ws.reduce((a, b) => a + b, 0);
    if (total <= 0) return list[Math.floor(rng() * list.length)];
    let r = rng() * total;
    for (let i = 0; i < list.length; i++) { r -= ws[i]; if (r <= 0) return list[i]; }
    return list[list.length - 1];
  },
  sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
};

/* ------------------------------------------------------- seeded RNG (xoshiro128**) */
function makeRng(...seeds) {
  let s0, s1, s2, s3;
  const h1 = U.fnv1a(String(seeds.map(String).join('|')));
  const h2 = U.fnv1a(String(seeds.map(String).join('#') + 'salt'));
  s0 = parseInt(h1.slice(0, 8) || '1', 16) ^ 0x9e3779b9;
  s1 = parseInt(h2.slice(0, 8) || '1', 16) ^ 0x243f6a88;
  s2 = (s0 ^ 0x85ebca6b) >>> 0;
  s3 = (s1 ^ 0xc2b2ae35) >>> 0;
  if (!(s0 | s1 | s2 | s3)) s0 = 1;
  const rotl = (x, k) => ((x << k) | (x >>> (32 - k))) >>> 0;
  const next = () => {
    const r = (Math.imul(rotl(Math.imul(s1, 5) >>> 0, 7), 9) >>> 0);
    const t = (s1 << 9) >>> 0;
    s2 = (s2 ^ s0) >>> 0; s3 = (s3 ^ s1) >>> 0; s1 = (s1 ^ s2) >>> 0; s0 = (s0 ^ s3) >>> 0;
    s2 = (s2 ^ t) >>> 0; s3 = rotl(s3, 11) >>> 0;
    return (r >>> 0) / 4294967296;
  };
  for (let i = 0; i < 12; i++) next(); // warmup
  const rng = () => next();
  rng.int = (a, b) => a + Math.floor(rng() * (b - a + 1));           // [a,b] inclusive
  rng.pick = (arr) => arr[Math.floor(rng() * arr.length)];
  rng.picks = (arr, n) => U.shuffle(arr, rng).slice(0, n);            // unique items
  rng.chance = (p) => rng() < p;
  rng.float = (a, b, step = 0.01) => +(a + Math.floor((rng() * (b - a)) / step) * step).toFixed(String(step).split('.')[1]?.length || 0);
  rng.weighted = (list, weightFn) => U.pickWeighted(list, rng, weightFn);
  return rng;
}

/* ================================================================ GEO DATA */
/* Each place: [name, lat, lon, tz] — tz offets/abbr resolved in tz.js */
const GEO = {
  US: [
    ['New York, NY', 40.7128, -74.0060, 'America/New_York'],
    ['Brooklyn, NY', 40.6782, -73.9442, 'America/New_York'],
    ['Jersey City, NJ', 40.7178, -74.0431, 'America/New_York'],
    ['Boston, MA', 42.3601, -71.0589, 'America/New_York'],
    ['Philadelphia, PA', 39.9526, -75.1652, 'America/New_York'],
    ['Atlanta, GA', 33.7490, -84.3880, 'America/New_York'],
    ['Miami, FL', 25.7617, -80.1918, 'America/New_York'],
    ['Charlotte, NC', 35.2271, -80.8431, 'America/New_York'],
    ['Washington, DC', 38.9072, -77.0369, 'America/New_York'],
    ['Chicago, IL', 41.8781, -87.6298, 'America/Chicago'],
    ['Nashville, TN', 36.1627, -86.7816, 'America/Chicago'],
    ['Austin, TX', 30.2672, -97.7431, 'America/Chicago'],
    ['Dallas, TX', 32.7767, -96.7970, 'America/Chicago'],
    ['Houston, TX', 29.7604, -95.3698, 'America/Chicago'],
    ['Minneapolis, MN', 44.9778, -93.2650, 'America/Chicago'],
    ['Denver, CO', 39.7392, -104.9903, 'America/Denver'],
    ['Phoenix, AZ', 33.4484, -112.0740, 'America/Phoenix'],
    ['Los Angeles, CA', 34.0522, -118.2437, 'America/Los_Angeles'],
    ['San Francisco, CA', 37.7749, -122.4194, 'America/Los_Angeles'],
    ['San Jose, CA', 37.3382, -121.8863, 'America/Los_Angeles'],
    ['San Diego, CA', 32.7157, -117.1611, 'America/Los_Angeles'],
    ['Seattle, WA', 47.6062, -122.3321, 'America/Los_Angeles'],
    ['Portland, OR', 45.5152, -122.6784, 'America/Los_Angeles'],
    ['Las Vegas, NV', 36.1699, -115.1398, 'America/Los_Angeles'],
    ['Salt Lake City, UT', 40.7608, -111.8910, 'America/Denver'],
  ],
  CA: [
    ['Toronto, ON', 43.6532, -79.3832, 'America/Toronto'],
    ['Montreal, QC', 45.5017, -73.5673, 'America/Toronto'],
    ['Ottawa, ON', 45.4215, -75.6972, 'America/Toronto'],
    ['Vancouver, BC', 49.2827, -123.1207, 'America/Vancouver'],
    ['Calgary, AB', 51.0447, -114.0719, 'America/Edmonton'],
    ['Edmonton, AB', 53.5461, -113.4938, 'America/Edmonton'],
    ['Winnipeg, MB', 49.8951, -97.1384, 'America/Winnipeg'],
    ['Halifax, NS', 44.6488, -63.5752, 'America/Halifax'],
  ],
  GB: [
    ['London, England', 51.5072, -0.1276, 'Europe/London'],
    ['Manchester, England', 53.4808, -2.2426, 'Europe/London'],
    ['Birmingham, England', 52.4862, -1.8904, 'Europe/London'],
    ['Leeds, England', 53.8008, -1.5491, 'Europe/London'],
    ['Bristol, England', 51.4545, -2.5879, 'Europe/London'],
    ['Glasgow, Scotland', 55.8642, -4.2518, 'Europe/London'],
    ['Edinburgh, Scotland', 55.9533, -3.1883, 'Europe/London'],
    ['Cardiff, Wales', 51.4816, -3.1791, 'Europe/London'],
    ['Belfast, N. Ireland', 54.5973, -5.9301, 'Europe/London'],
  ],
  DE: [
    ['Berlin', 52.5200, 13.4050, 'Europe/Berlin'],
    ['Munich', 48.1351, 11.5820, 'Europe/Berlin'],
    ['Hamburg', 53.5511, 9.9937, 'Europe/Berlin'],
    ['Cologne', 50.9375, 6.9603, 'Europe/Berlin'],
    ['Frankfurt', 50.1109, 8.6821, 'Europe/Berlin'],
    ['Stuttgart', 48.7758, 9.1829, 'Europe/Berlin'],
    ['Düsseldorf', 51.2277, 6.7735, 'Europe/Berlin'],
    ['Leipzig', 51.3397, 12.3731, 'Europe/Berlin'],
  ],
  FR: [
    ['Paris', 48.8566, 2.3522, 'Europe/Paris'],
    ['Lyon', 45.7640, 4.8357, 'Europe/Paris'],
    ['Marseille', 43.2965, 5.3698, 'Europe/Paris'],
    ['Toulouse', 43.6047, 1.4442, 'Europe/Paris'],
    ['Lille', 50.6292, 3.0573, 'Europe/Paris'],
    ['Bordeaux', 44.8378, -0.5792, 'Europe/Paris'],
    ['Nice', 43.7102, 7.2620, 'Europe/Paris'],
  ],
  NL: [
    ['Amsterdam', 52.3676, 4.9041, 'Europe/Amsterdam'],
    ['Rotterdam', 51.9244, 4.4777, 'Europe/Amsterdam'],
    ['The Hague', 52.0705, 4.3007, 'Europe/Amsterdam'],
    ['Utrecht', 52.0907, 5.1214, 'Europe/Amsterdam'],
    ['Eindhoven', 51.4416, 5.4697, 'Europe/Amsterdam'],
  ],
  ES: [
    ['Madrid', 40.4168, -3.7038, 'Europe/Madrid'],
    ['Barcelona', 41.3874, 2.1686, 'Europe/Madrid'],
    ['Valencia', 39.4699, -0.3763, 'Europe/Madrid'],
    ['Seville', 37.3891, -5.9845, 'Europe/Madrid'],
    ['Bilbao', 43.2630, -2.9350, 'Europe/Madrid'],
    ['Málaga', 36.7213, -4.4214, 'Europe/Madrid'],
  ],
  IT: [
    ['Milan', 45.4642, 9.1900, 'Europe/Rome'],
    ['Rome', 41.9028, 12.4964, 'Europe/Rome'],
    ['Turin', 45.0703, 7.6869, 'Europe/Rome'],
    ['Naples', 40.8518, 14.2681, 'Europe/Rome'],
    ['Bologna', 44.4949, 11.3426, 'Europe/Rome'],
    ['Florence', 43.7696, 11.2558, 'Europe/Rome'],
  ],
  SE: [
    ['Stockholm', 59.3293, 18.0686, 'Europe/Stockholm'],
    ['Gothenburg', 57.7089, 11.9746, 'Europe/Stockholm'],
    ['Malmö', 55.6050, 13.0038, 'Europe/Stockholm'],
  ],
  PL: [
    ['Warsaw', 52.2297, 21.0122, 'Europe/Warsaw'],
    ['Kraków', 50.0647, 19.9450, 'Europe/Warsaw'],
    ['Gdańsk', 54.3520, 18.6466, 'Europe/Warsaw'],
    ['Wrocław', 51.1079, 17.0385, 'Europe/Warsaw'],
    ['Poznań', 52.4064, 16.9252, 'Europe/Warsaw'],
  ],
  CH: [
    ['Zurich', 47.3769, 8.5417, 'Europe/Zurich'],
    ['Geneva', 46.2044, 6.1432, 'Europe/Zurich'],
    ['Basel', 47.5596, 7.5886, 'Europe/Zurich'],
    ['Bern', 46.9480, 7.4474, 'Europe/Zurich'],
  ],
  AT: [
    ['Vienna', 48.2082, 16.3738, 'Europe/Vienna'],
    ['Graz', 47.0707, 15.4395, 'Europe/Vienna'],
    ['Salzburg', 47.8095, 13.0550, 'Europe/Vienna'],
  ],
  PT: [
    ['Lisbon', 38.7223, -9.1393, 'Europe/Lisbon'],
    ['Porto', 41.1579, -8.6291, 'Europe/Lisbon'],
  ],
  IE: [
    ['Dublin', 53.3498, -6.2603, 'Europe/Dublin'],
    ['Cork', 51.8985, -8.4756, 'Europe/Dublin'],
  ],
  FI: [
    ['Helsinki', 60.1699, 24.9384, 'Europe/Helsinki'],
    ['Tampere', 61.4978, 23.7610, 'Europe/Helsinki'],
  ],
  NO: [
    ['Oslo', 59.9139, 10.7522, 'Europe/Oslo'],
    ['Bergen', 60.3913, 5.3221, 'Europe/Oslo'],
  ],
  DK: [
    ['Copenhagen', 55.6761, 12.5683, 'Europe/Copenhagen'],
    ['Aarhus', 56.1629, 10.2039, 'Europe/Copenhagen'],
  ],
  TR: [
    ['Istanbul', 41.0082, 28.9784, 'Europe/Istanbul'],
    ['Ankara', 39.9334, 32.8597, 'Europe/Istanbul'],
    ['Izmir', 38.4237, 27.1428, 'Europe/Istanbul'],
    ['Antalya', 36.8969, 30.7133, 'Europe/Istanbul'],
    ['Bursa', 40.1885, 29.0610, 'Europe/Istanbul'],
  ],
  AE: [
    ['Dubai', 25.2048, 55.2708, 'Asia/Dubai'],
    ['Abu Dhabi', 24.4539, 54.3773, 'Asia/Dubai'],
    ['Sharjah', 25.3463, 55.4209, 'Asia/Dubai'],
  ],
  IN: [
    ['Mumbai', 19.0760, 72.8777, 'Asia/Kolkata'],
    ['Delhi', 28.7041, 77.1025, 'Asia/Kolkata'],
    ['Bengaluru', 12.9716, 77.5946, 'Asia/Kolkata'],
    ['Hyderabad', 17.3850, 78.4867, 'Asia/Kolkata'],
    ['Pune', 18.5204, 73.8567, 'Asia/Kolkata'],
    ['Chennai', 13.0827, 80.2707, 'Asia/Kolkata'],
    ['Ahmedabad', 23.0225, 72.5714, 'Asia/Kolkata'],
  ],
  ID: [
    ['Jakarta', -6.2088, 106.8456, 'Asia/Jakarta'],
    ['Surabaya', -7.2575, 112.7521, 'Asia/Jakarta'],
    ['Bandung', -6.9175, 107.6191, 'Asia/Jakarta'],
    ['Denpasar', -8.6500, 115.2167, 'Asia/Makassar'],
    ['Medan', 3.5952, 98.6722, 'Asia/Jakarta'],
  ],
  SG: [['Singapore', 1.3521, 103.8198, 'Asia/Singapore']],
  MY: [
    ['Kuala Lumpur', 3.1390, 101.6869, 'Asia/Kuala_Lumpur'],
    ['Penang', 5.4141, 100.3288, 'Asia/Kuala_Lumpur'],
    ['Johor Bahru', 1.4927, 103.7414, 'Asia/Kuala_Lumpur'],
  ],
  JP: [
    ['Tokyo', 35.6762, 139.6503, 'Asia/Tokyo'],
    ['Osaka', 34.6937, 135.5023, 'Asia/Tokyo'],
    ['Yokohama', 35.4437, 139.6380, 'Asia/Tokyo'],
    ['Nagoya', 35.1815, 136.9066, 'Asia/Tokyo'],
    ['Fukuoka', 33.5904, 130.4017, 'Asia/Tokyo'],
  ],
  KR: [
    ['Seoul', 37.5665, 126.9780, 'Asia/Seoul'],
    ['Busan', 35.1796, 129.0756, 'Asia/Seoul'],
    ['Incheon', 37.4563, 126.7052, 'Asia/Seoul'],
  ],
  VN: [
    ['Ho Chi Minh City', 10.8231, 106.6297, 'Asia/Ho_Chi_Minh'],
    ['Hanoi', 21.0278, 105.8342, 'Asia/Ho_Chi_Minh'],
    ['Da Nang', 16.0544, 108.2022, 'Asia/Ho_Chi_Minh'],
  ],
  TH: [
    ['Bangkok', 13.7563, 100.5018, 'Asia/Bangkok'],
    ['Chiang Mai', 18.7883, 98.9853, 'Asia/Bangkok'],
    ['Phuket', 7.8804, 98.3923, 'Asia/Bangkok'],
  ],
  PH: [
    ['Manila', 14.5995, 120.9842, 'Asia/Manila'],
    ['Cebu City', 10.3157, 123.8854, 'Asia/Manila'],
    ['Davao', 7.1907, 125.4553, 'Asia/Manila'],
  ],
  SA: [
    ['Riyadh', 24.7136, 46.6753, 'Asia/Riyadh'],
    ['Jeddah', 21.4858, 39.1925, 'Asia/Riyadh'],
    ['Dammam', 26.4207, 50.0888, 'Asia/Riyadh'],
  ],
  QA: [['Doha', 25.2854, 51.5310, 'Asia/Qatar']],
  IL: [
    ['Tel Aviv', 32.0853, 34.7818, 'Asia/Jerusalem'],
    ['Haifa', 32.7940, 34.9896, 'Asia/Jerusalem'],
    ['Jerusalem', 31.7683, 35.2137, 'Asia/Jerusalem'],
  ],
  BR: [
    ['São Paulo', -23.5505, -46.6333, 'America/Sao_Paulo'],
    ['Rio de Janeiro', -22.9068, -43.1729, 'America/Sao_Paulo'],
    ['Belo Horizonte', -19.9167, -43.9345, 'America/Sao_Paulo'],
    ['Curitiba', -25.4284, -49.2733, 'America/Sao_Paulo'],
    ['Porto Alegre', -30.0346, -51.2177, 'America/Sao_Paulo'],
    ['Brasília', -15.8267, -47.9218, 'America/Sao_Paulo'],
  ],
  MX: [
    ['Mexico City', 19.4326, -99.1332, 'America/Mexico_City'],
    ['Guadalajara', 20.6597, -103.3496, 'America/Mexico_City'],
    ['Monterrey', 25.6866, -100.3161, 'America/Monterrey'],
    ['Puebla', 19.0414, -98.2063, 'America/Mexico_City'],
  ],
  AR: [
    ['Buenos Aires', -34.6037, -58.3816, 'America/Argentina/Buenos_Aires'],
    ['Córdoba', -31.4201, -64.1888, 'America/Argentina/Cordoba'],
  ],
  CL: [['Santiago', -33.4489, -70.6693, 'America/Santiago']],
  CO: [
    ['Bogotá', 4.7110, -74.0721, 'America/Bogota'],
    ['Medellín', 6.2442, -75.5812, 'America/Bogota'],
  ],
  ZA: [
    ['Johannesburg', -26.2041, 28.0473, 'Africa/Johannesburg'],
    ['Cape Town', -33.9249, 18.4241, 'Africa/Johannesburg'],
    ['Durban', -29.8587, 31.0218, 'Africa/Johannesburg'],
  ],
  NG: [['Lagos', 6.5244, 3.3792, 'Africa/Lagos'], ['Abuja', 9.0765, 7.3986, 'Africa/Lagos']],
  KE: [['Nairobi', -1.2921, 36.8219, 'Africa/Nairobi']],
  EG: [['Cairo', 30.0444, 31.2357, 'Africa/Cairo'], ['Alexandria', 31.2001, 29.9187, 'Africa/Cairo']],
  AU: [
    ['Sydney, NSW', -33.8688, 151.2093, 'Australia/Sydney'],
    ['Melbourne, VIC', -37.8136, 144.9631, 'Australia/Melbourne'],
    ['Brisbane, QLD', -27.4698, 153.0251, 'Australia/Brisbane'],
    ['Perth, WA', -31.9523, 115.8613, 'Australia/Perth'],
    ['Adelaide, SA', -34.9285, 138.6007, 'Australia/Adelaide'],
  ],
  NZ: [['Auckland', -36.8485, 174.7633, 'Pacific/Auckland'], ['Wellington', -41.2866, 174.7756, 'Pacific/Auckland']],
};

const GEO_META = {
  US: { name: 'United States', orgs: ['Comcast', 'Verizon', 'AT&T', 'Charter', 'Cox', 'CenturyLink'], bank: 'Chase', currency: 'USD', weekStart: 0, dirms: false, speedUnit: 'mph', temp: 'F' },
  CA: { name: 'Canada', orgs: ['Bell Canada', 'Rogers', 'Telus', 'Shaw'], bank: 'RBC', currency: 'CAD', weekStart: 0, dirms: false, speedUnit: 'km/h', temp: 'C' },
  GB: { name: 'United Kingdom', orgs: ['BT', 'Virgin Media', 'Sky Broadband', 'TalkTalk'], bank: 'Barclays', currency: 'GBP', weekStart: 1, dirms: false, speedUnit: 'mph', temp: 'C' },
  DE: { name: 'Germany', orgs: ['Deutsche Telekom', 'Vodafone', '1&1', 'O2'], bank: 'Deutsche Bank', currency: 'EUR', weekStart: 1, dirms: true, speedUnit: 'km/h', temp: 'C' },
  FR: { name: 'France', orgs: ['Orange', 'Free', 'SFR', 'Bouygues'], bank: 'BNP Paribas', currency: 'EUR', weekStart: 1, dirms: false, speedUnit: 'km/h', temp: 'C' },
  NL: { name: 'Netherlands', orgs: ['KPN', 'Ziggo', 'T-Mobile NL'], bank: 'ING', currency: 'EUR', weekStart: 1, dirms: false, speedUnit: 'km/h', temp: 'C' },
  ES: { name: 'Spain', orgs: ['Movistar', 'Orange ES', 'Vodafone ES'], bank: 'Santander', currency: 'EUR', weekStart: 1, dirms: false, speedUnit: 'km/h', temp: 'C' },
  IT: { name: 'Italy', orgs: ['TIM', 'Vodafone IT', 'Fastweb'], bank: 'Intesa Sanpaolo', currency: 'EUR', weekStart: 1, dirms: false, speedUnit: 'km/h', temp: 'C' },
  SE: { name: 'Sweden', orgs: ['Telia', 'Bahnhof', 'Tele2'], bank: 'SEB', currency: 'SEK', weekStart: 1, dirms: false, speedUnit: 'km/h', temp: 'C' },
  PL: { name: 'Poland', orgs: ['Orange PL', 'Play', 'Plus'], bank: 'PKO BP', currency: 'PLN', weekStart: 1, dirms: false, speedUnit: 'km/h', temp: 'C' },
  CH: { name: 'Switzerland', orgs: ['Swisscom', 'Sunrise', 'Salt'], bank: 'UBS', currency: 'CHF', weekStart: 1, dirms: false, speedUnit: 'km/h', temp: 'C' },
  AT: { name: 'Austria', orgs: ['A1', 'Magenta AT'], bank: 'Erste Bank', currency: 'EUR', weekStart: 1, dirms: false, speedUnit: 'km/h', temp: 'C' },
  PT: { name: 'Portugal', orgs: ['MEO', 'NOS', 'Vodafone PT'], bank: 'Millennium BCP', currency: 'EUR', weekStart: 1, dirms: false, speedUnit: 'km/h', temp: 'C' },
  IE: { name: 'Ireland', orgs: ['Eir', 'Virgin Media IE'], bank: 'AIB', currency: 'EUR', weekStart: 1, dirms: false, speedUnit: 'km/h', temp: 'C' },
  FI: { name: 'Finland', orgs: ['Elisa', 'Telia FI'], bank: 'Nordea', currency: 'EUR', weekStart: 1, dirms: false, speedUnit: 'km/h', temp: 'C' },
  NO: { name: 'Norway', orgs: ['Telenor', 'Telia NO'], bank: 'DNB', currency: 'NOK', weekStart: 1, dirms: false, speedUnit: 'km/h', temp: 'C' },
  DK: { name: 'Denmark', orgs: ['TDC', 'Telenor DK'], bank: 'Danske Bank', currency: 'DKK', weekStart: 1, dirms: false, speedUnit: 'km/h', temp: 'C' },
  TR: { name: 'Türkiye', orgs: ['Türk Telekom', 'Turkcell Superonline', 'Vodafone TR'], bank: 'Ziraat Bankası', currency: 'TRY', weekStart: 1, dirms: false, speedUnit: 'km/h', temp: 'C' },
  AE: { name: 'United Arab Emirates', orgs: ['e& (Etisalat)', 'du'], bank: 'Emirates NBD', currency: 'AED', weekStart: 1, dirms: false, speedUnit: 'km/h', temp: 'C' },
  IN: { name: 'India', orgs: ['Airtel', 'Jio', 'BSNL', 'ACT Fibernet'], bank: 'HDFC Bank', currency: 'INR', weekStart: 1, dirms: false, speedUnit: 'km/h', temp: 'C' },
  ID: { name: 'Indonesia', orgs: ['Telkomsel', 'IndiHome', 'XL Axiata'], bank: 'Bank Mandiri', currency: 'IDR', weekStart: 1, dirms: false, speedUnit: 'km/h', temp: 'C' },
  SG: { name: 'Singapore', orgs: ['Singtel', 'StarHub', 'M1'], bank: 'DBS', currency: 'SGD', weekStart: 1, dirms: false, speedUnit: 'km/h', temp: 'C' },
  MY: { name: 'Malaysia', orgs: ['TM Unifi', 'Maxis', 'Celcom'], bank: 'Maybank', currency: 'MYR', weekStart: 1, dirms: false, speedUnit: 'km/h', temp: 'C' },
  JP: { name: 'Japan', orgs: ['NTT Docomo', 'SoftBank', 'KDDI'], bank: 'MUFG', currency: 'JPY', weekStart: 0, dirms: false, speedUnit: 'km/h', temp: 'C' },
  KR: { name: 'South Korea', orgs: ['KT', 'SK Broadband', 'LG U+'], bank: 'KB Kookmin', currency: 'KRW', weekStart: 0, dirms: false, speedUnit: 'km/h', temp: 'C' },
  VN: { name: 'Vietnam', orgs: ['Viettel', 'VNPT', 'FPT Telecom'], bank: 'Vietcombank', currency: 'VND', weekStart: 1, dirms: false, speedUnit: 'km/h', temp: 'C' },
  TH: { name: 'Thailand', orgs: ['AIS', 'True', '3BB'], bank: 'Kasikornbank', currency: 'THB', weekStart: 1, dirms: false, speedUnit: 'km/h', temp: 'C' },
  PH: { name: 'Philippines', orgs: ['PLDT', 'Globe', 'Converge'], bank: 'BDO', currency: 'PHP', weekStart: 0, dirms: false, speedUnit: 'km/h', temp: 'C' },
  SA: { name: 'Saudi Arabia', orgs: ['STC', 'Mobily', 'Zain'], bank: 'Al Rajhi', currency: 'SAR', weekStart: 0, dirms: false, speedUnit: 'km/h', temp: 'C' },
  QA: { name: 'Qatar', orgs: ['Ooredoo', 'Vodafone QA'], bank: 'QNB', currency: 'QAR', weekStart: 0, dirms: false, speedUnit: 'km/h', temp: 'C' },
  IL: { name: 'Israel', orgs: ['Bezeq', 'Partner', 'Cellcom'], bank: 'Bank Leumi', currency: 'ILS', weekStart: 0, dirms: false, speedUnit: 'km/h', temp: 'C' },
  BR: { name: 'Brazil', orgs: ['Vivo', 'Claro', 'TIM BR', 'Oi'], bank: 'Itaú', currency: 'BRL', weekStart: 0, dirms: false, speedUnit: 'km/h', temp: 'C' },
  MX: { name: 'Mexico', orgs: ['Telmex', 'Izzi', 'Totalplay'], bank: 'BBVA México', currency: 'MXN', weekStart: 0, dirms: false, speedUnit: 'km/h', temp: 'C' },
  AR: { name: 'Argentina', orgs: ['Telecom Argentina', 'Telefónica AR'], bank: 'Banco Nación', currency: 'ARS', weekStart: 1, dirms: false, speedUnit: 'km/h', temp: 'C' },
  CL: { name: 'Chile', orgs: ['Movistar CL', 'Entel'], bank: 'Banco de Chile', currency: 'CLP', weekStart: 1, dirms: false, speedUnit: 'km/h', temp: 'C' },
  CO: { name: 'Colombia', orgs: ['Claro CO', 'ETB', 'Tigo'], bank: 'Bancolombia', currency: 'COP', weekStart: 0, dirms: false, speedUnit: 'km/h', temp: 'C' },
  ZA: { name: 'South Africa', orgs: ['Telkom SA', 'Vodacom', 'MTN'], bank: 'Standard Bank', currency: 'ZAR', weekStart: 0, dirms: false, speedUnit: 'km/h', temp: 'C' },
  NG: { name: 'Nigeria', orgs: ['MTN NG', 'Glo', 'Airtel NG'], bank: 'GTBank', currency: 'NGN', weekStart: 0, dirms: false, speedUnit: 'km/h', temp: 'C' },
  KE: { name: 'Kenya', orgs: ['Safaricom', 'Jamii Telecom'], bank: 'KCB', currency: 'KES', weekStart: 0, dirms: false, speedUnit: 'km/h', temp: 'C' },
  EG: { name: 'Egypt', orgs: ['TE Data', 'Vodafone EG', 'Orange EG'], bank: 'NBE', currency: 'EGP', weekStart: 6, dirms: false, speedUnit: 'km/h', temp: 'C' },
  AU: { name: 'Australia', orgs: ['Telstra', 'Optus', 'TPG', 'Aussie Broadband'], bank: 'CBA', currency: 'AUD', weekStart: 1, dirms: false, speedUnit: 'km/h', temp: 'C' },
  NZ: { name: 'New Zealand', orgs: ['Spark NZ', 'Vodafone NZ', '2degrees'], bank: 'ANZ NZ', currency: 'NZD', weekStart: 1, dirms: false, speedUnit: 'km/h', temp: 'C' },
};

const GEO_NAMES = Object.keys(GEO).filter((c) => GEO[c].length).sort();

/* ---------------------------------------------------------- locale catalog */
/* locales per country: [primary, ...secondary] (BCP-47) */
const LOCALES = {
  US: ['en-US'], CA: ['en-CA', 'fr-CA'], GB: ['en-GB'], DE: ['de-DE'], FR: ['fr-FR'], NL: ['nl-NL'], ES: ['es-ES'],
  IT: ['it-IT'], SE: ['sv-SE'], PL: ['pl-PL'], CH: ['de-CH', 'fr-CH'], AT: ['de-AT'], PT: ['pt-PT'], IE: ['en-IE'],
  FI: ['fi-FI'], NO: ['nb-NO'], DK: ['da-DK'], TR: ['tr-TR'], AE: ['ar-AE', 'en-AE'], IN: ['en-IN', 'hi-IN'],
  ID: ['id-ID'], SG: ['en-SG'], MY: ['ms-MY', 'en-MY'], JP: ['ja-JP'], KR: ['ko-KR'], VN: ['vi-VN'], TH: ['th-TH'],
  PH: ['en-PH'], SA: ['ar-SA'], QA: ['ar-QA'], IL: ['he-IL'], BR: ['pt-BR'], MX: ['es-MX'], AR: ['es-AR'],
  CL: ['es-CL'], CO: ['es-CO'], ZA: ['en-ZA'], NG: ['en-NG'], KE: ['en-KE'], EG: ['ar-EG'], AU: ['en-AU'], NZ: ['en-NZ'],
};
const LOCALE_META = { // [language native name, language code, currency]
  'en-US': ['English (US)', 'en', 'USD', 'ltr'], 'en-CA': ['English (Canada)', 'en', 'CAD', 'ltr'], 'fr-CA': ['Français (Canada)', 'fr', 'CAD', 'ltr'],
  'en-GB': ['English (UK)', 'en', 'GBP', 'ltr'], 'de-DE': ['Deutsch', 'de', 'EUR', 'ltr'], 'fr-FR': ['Français', 'fr', 'EUR', 'ltr'],
  'nl-NL': ['Nederlands', 'nl', 'EUR', 'ltr'], 'es-ES': ['Español (España)', 'es', 'EUR', 'ltr'], 'it-IT': ['Italiano', 'it', 'EUR', 'ltr'],
  'sv-SE': ['Svenska', 'sv', 'SEK', 'ltr'], 'pl-PL': ['Polski', 'pl', 'PLN', 'ltr'], 'de-CH': ['Deutsch (Schweiz)', 'de', 'CHF', 'ltr'],
  'fr-CH': ['Français (Suisse)', 'fr', 'CHF', 'ltr'], 'de-AT': ['Deutsch (Österreich)', 'de', 'EUR', 'ltr'], 'pt-PT': ['Português (Portugal)', 'pt', 'EUR', 'ltr'],
  'en-IE': ['English (Ireland)', 'en', 'EUR', 'ltr'], 'fi-FI': ['Suomi', 'fi', 'EUR', 'ltr'], 'nb-NO': ['Norsk Bokmål', 'nb', 'NOK', 'ltr'],
  'da-DK': ['Dansk', 'da', 'DKK', 'ltr'], 'tr-TR': ['Türkçe', 'tr', 'TRY', 'ltr'], 'ar-AE': ['العربية (الإمارات)', 'ar', 'AED', 'rtl'],
  'en-AE': ['English (UAE)', 'en', 'AED', 'ltr'], 'en-IN': ['English (India)', 'en', 'INR', 'ltr'], 'hi-IN': ['हिन्दी', 'hi', 'INR', 'ltr'],
  'id-ID': ['Bahasa Indonesia', 'id', 'IDR', 'ltr'], 'en-SG': ['English (Singapore)', 'en', 'SGD', 'ltr'], 'ms-MY': ['Bahasa Melayu', 'ms', 'MYR', 'ltr'],
  'en-MY': ['English (Malaysia)', 'en', 'MYR', 'ltr'], 'ja-JP': ['日本語', 'ja', 'JPY', 'ltr'], 'ko-KR': ['한국어', 'ko', 'KRW', 'ltr'],
  'vi-VN': ['Tiếng Việt', 'vi', 'VND', 'ltr'], 'th-TH': ['ไทย', 'th', 'THB', 'ltr'], 'en-PH': ['English (Philippines)', 'en', 'PHP', 'ltr'],
  'ar-SA': ['العربية (السعودية)', 'ar', 'SAR', 'rtl'], 'ar-QA': ['العربية (قطر)', 'ar', 'QAR', 'rtl'], 'he-IL': ['עברית', 'he', 'ILS', 'rtl'],
  'pt-BR': ['Português (Brasil)', 'pt', 'BRL', 'ltr'], 'es-MX': ['Español (México)', 'es', 'MXN', 'ltr'], 'es-AR': ['Español (Argentina)', 'es', 'ARS', 'ltr'],
  'es-CL': ['Español (Chile)', 'es', 'CLP', 'ltr'], 'es-CO': ['Español (Colombia)', 'es', 'COP', 'ltr'], 'en-ZA': ['English (South Africa)', 'en', 'ZAR', 'ltr'],
  'en-NG': ['English (Nigeria)', 'en', 'NGN', 'ltr'], 'en-KE': ['English (Kenya)', 'en', 'KES', 'ltr'], 'ar-EG': ['العربية (مصر)', 'ar', 'EGP', 'rtl'],
  'en-AU': ['English (Australia)', 'en', 'AUD', 'ltr'], 'en-NZ': ['English (New Zealand)', 'en', 'NZD', 'ltr'], 'ru-RU': ['Русский', 'ru', 'RUB', 'ltr'],
};

/* ------------------------------------------------------- proxy catalog */
/* DEMO pool — hostnames are placeholders. For real work replace with your own
   residential/mobile proxy endpoints of the same city/country. */
const PROXY_CATALOG = {
  US: [
    { host: 'gw.chi1.sockpool.net', port: 8000, country: 'US', city: 'Chicago, IL', lat: 41.8781, lon: -87.6298, isp: 'Comcast', type: 'residential', asn: 7922 },
    { host: 'gw.nyc3.sockpool.net', port: 8000, country: 'US', city: 'New York, NY', lat: 40.7128, lon: -74.0060, isp: 'Verizon', type: 'residential', asn: 701 },
    { host: 'gw.lax4.sockpool.net', port: 8000, country: 'US', city: 'Los Angeles, CA', lat: 34.0522, lon: -118.2437, isp: 'AT&T', type: 'residential', asn: 7018 },
  ],
  GB: [
    { host: 'gw.lon2.sockpool.net', port: 8000, country: 'GB', city: 'London, England', lat: 51.5072, lon: -0.1276, isp: 'Virgin Media', type: 'residential', asn: 5089 },
    { host: 'gw.man1.sockpool.net', port: 8000, country: 'GB', city: 'Manchester, England', lat: 53.4808, lon: -2.2426, isp: 'BT', type: 'residential', asn: 2856 },
  ],
  DE: [
    { host: 'gw.ber1.sockpool.net', port: 8000, country: 'DE', city: 'Berlin', lat: 52.5200, lon: 13.4050, isp: 'Deutsche Telekom', type: 'residential', asn: 3320 },
    { host: 'gw.fra2.sockpool.net', port: 8000, country: 'DE', city: 'Frankfurt', lat: 50.1109, lon: 8.6821, isp: 'Vodafone DE', type: 'residential', asn: 3209 },
  ],
  NL: [{ host: 'gw.ams1.sockpool.net', port: 8000, country: 'NL', city: 'Amsterdam', lat: 52.3676, lon: 4.9041, isp: 'KPN', type: 'residential', asn: 1136 }],
  FR: [{ host: 'gw.par1.sockpool.net', port: 8000, country: 'FR', city: 'Paris', lat: 48.8566, lon: 2.3522, isp: 'Orange', type: 'residential', asn: 3215 }],
  CA: [{ host: 'gw.tor1.sockpool.net', port: 8000, country: 'CA', city: 'Toronto, ON', lat: 43.6532, lon: -79.3832, isp: 'Bell Canada', type: 'residential', asn: 577 }],
  TR: [{ host: 'gw.ist1.sockpool.net', port: 8000, country: 'TR', city: 'Istanbul', lat: 41.0082, lon: 28.9784, isp: 'Türk Telekom', type: 'residential', asn: 9121 }],
  AU: [{ host: 'gw.syd1.sockpool.net', port: 8000, country: 'AU', city: 'Sydney, NSW', lat: -33.8688, lon: 151.2093, isp: 'Telstra', type: 'residential', asn: 1221 }],
  IN: [{ host: 'gw.bom1.sockpool.net', port: 8000, country: 'IN', city: 'Mumbai', lat: 19.0760, lon: 72.8777, isp: 'Airtel', type: 'mobile', asn: 9498 }],
  SG: [{ host: 'gw.sin1.sockpool.net', port: 8000, country: 'SG', city: 'Singapore', lat: 1.3521, lon: 103.8198, isp: 'Singtel', type: 'residential', asn: 7473 }],
};
const PROXY_LABEL = { us: 'US', gb: 'GB', de: 'DE', nl: 'NL', fr: 'FR', ca: 'CA', tr: 'TR', au: 'AU', in: 'IN', sg: 'SG' };
