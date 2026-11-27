/* ==========================================================================
   DOPPEL — 02-catalog.js
   Hardware catalogs, browser version math, UA / Client-Hints construction,
   timezone resolver, font & extension catalogs.
   ========================================================================== */
'use strict';

/* ================================================== BROWSER VERSION MATH */
/* Deterministic: any date (even future) maps to a plausible release train. */
const BROWSERS = {
  chrome: {
    name: 'Google Chrome', vendor: 'Google Inc.', engine: 'Chromium', blink: true,
    // 4-week trains since M94 → ~31-day average including skips/holidays
    epochMajor: 89, epochDate: '2021-03-02', step: 31,
    platforms: { windows: 'Windows', macos: 'Macintosh', linux: 'Linux', android: 'Android', ios: 'iOS' },
  },
  edge: {
    name: 'Microsoft Edge', vendor: 'Microsoft Corporation', engine: 'Chromium', blink: true,
    epochMajor: 89, epochDate: '2021-04-01', step: 31,
    platforms: { windows: 'Windows', macos: 'Macintosh', linux: 'Linux', android: 'Android', ios: 'iOS' },
  },
  firefox: {
    name: 'Mozilla Firefox', vendor: 'Mozilla', engine: 'Gecko', blink: false,
    epochMajor: 87, epochDate: '2021-03-23', step: 30,
    platforms: { windows: 'Windows', macos: 'Macintosh', linux: 'Linux', android: 'Android' },
  },
  safari: {
    name: 'Safari', vendor: 'Apple Inc.', engine: 'WebKit', blink: false,
    epochMajor: 14, epochDate: '2020-09-16', step: 84, // Safari ~ yearly major
    platforms: { macos: 'Macintosh', ios: 'iOS' },
  },
};

function releaseTrain(browser, date) {
  const conf = BROWSERS[browser];
  const d = date instanceof Date ? date : new Date(date);
  const epoch = new Date(conf.epochDate + 'T00:00:00Z');
  const weeks = Math.floor((d.getTime() - epoch.getTime()) / (7 * 86400000));
  const major = conf.epochMajor + Math.max(0, Math.floor(weeks / (conf.step / 7)));
  const offsetDays = Math.round((d.getTime() - epoch.getTime()) / 86400000);
  const minor = browser === 'safari' ? 0 : (browser === 'firefox' ? 0 : Math.max(0, Math.min(0.6555, 0.0)));
  const patch = browser === 'chromium' ? 0 : 0;
  return { major, minor, patch, offsetDays };
}

/* milestone mapping for chromium-engine builds (major → full build base) */
function chromiumBuild(major, rng) {
  const base = [0x0f00, 0x1500, 0x1a00, 0x2100, 0x2500, 0x2a00, 0x2f00, 0x3200, 0x3500, 0x3a00, 0x3e00, 0x4300][major % 12];
  const build = 4300 + major * 22 + ((major * 37) % 97);
  const patch = rng.pick([0, 24, 47, 71, 88, 102, 119, 137, 156, 201, 218, 244, 288, 303, 335, 371, 404, 441]);
  return { major, build, patch };
}

function chromeVersion(major, rng) {
  const b = chromiumBuild(major, rng);
  return `${b.major}.0.${b.build}.${b.patch}`;
}
/* full versions must line up with the real chrome release archive
   e.g. 131.0.6778.x, 140.x.73xx — keep build in a believable band */
function chromeBuildFor(major) {
  return 4300 + major * 22 + ((major * 37) % 97); // M120→6940, M156→7700 roughly
}
function chromeMajorRange() {
  const t = releaseTrain('chrome', new Date());
  return { min: Math.max(120, t.major - 12), max: t.major };
}

/* ====================================================== HARDWARE CATALOGS */
const GPUS = {
  win: [
    { vendor: 'Google Inc. (NVIDIA)', webglVendor: 'Google Inc. (NVIDIA)', webglRenderer: 'ANGLE (NVIDIA, NVIDIA GeForce GTX 1650 Direct3D11 vs_5_0 ps_5_0, D3D11)', unmaskedVendor: 'Google Inc. (NVIDIA)', unmaskedRenderer: 'ANGLE (NVIDIA, NVIDIA GeForce GTX 1650 Direct3D11 vs_5_0 ps_5_0, D3D11)', device: 'NVIDIA GeForce GTX 1650', tier: 1 },
    { vendor: 'Google Inc. (NVIDIA)', webglVendor: 'Google Inc. (NVIDIA)', webglRenderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 (0x00002504) Direct3D11 vs_5_0 ps_5_0, D3D11)', unmaskedVendor: 'Google Inc. (NVIDIA)', unmaskedRenderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 (0x00002504) Direct3D11 vs_5_0 ps_5_0, D3D11)', device: 'NVIDIA GeForce RTX 3060', tier: 2 },
    { vendor: 'Google Inc. (NVIDIA)', webglVendor: 'Google Inc. (NVIDIA)', webglRenderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Ti (0x00002489) Direct3D11 vs_5_0 ps_5_0, D3D11)', unmaskedVendor: 'Google Inc. (NVIDIA)', unmaskedRenderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Ti (0x00002489) Direct3D11 vs_5_0 ps_5_0, D3D11)', device: 'NVIDIA GeForce RTX 3060 Ti', tier: 2 },
    { vendor: 'Google Inc. (NVIDIA)', webglVendor: 'Google Inc. (NVIDIA)', webglRenderer: 'ANGLE (NVIDIA, NVIDIA GeForce GTX 650 Ti (0x00001E14) Direct3D11 vs_5_0 ps_5_0, D3D11)', unmaskedVendor: 'Google Inc. (NVIDIA)', unmaskedRenderer: 'ANGLE (NVIDIA, NVIDIA GeForce GTX 650 Ti (0x00001E14) Direct3D11 vs_5_0 ps_5_0, D3D11)', device: 'NVIDIA GeForce GTX 650 Ti', tier: 0 },
    { vendor: 'Google Inc. (NVIDIA)', webglVendor: 'Google Inc. (NVIDIA)', webglRenderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 4060 (0x00002882) Direct3D11 vs_5_0 ps_5_0, D3D11)', unmaskedVendor: 'Google Inc. (NVIDIA)', unmaskedRenderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 4060 (0x00002882) Direct3D11 vs_5_0 ps_5_0, D3D11)', device: 'NVIDIA GeForce RTX 4060', tier: 2 },
    { vendor: 'Google Inc. (Intel)', webglVendor: 'Google Inc. (Intel)', webglRenderer: 'ANGLE (Intel, Intel(R) UHD Graphics 630 (0x00003E9B) Direct3D11 vs_5_0 ps_5_0, D3D11)', unmaskedVendor: 'Google Inc. (Intel)', unmaskedRenderer: 'ANGLE (Intel, Intel(R) UHD Graphics 630 (0x00003E9B) Direct3D11 vs_5_0 ps_5_0, D3D11)', device: 'Intel UHD Graphics 630', tier: 0 },
    { vendor: 'Google Inc. (Intel)', webglVendor: 'Google Inc. (Intel)', webglRenderer: 'ANGLE (Intel, Intel(R) Iris(R) Xe Graphics (0x00009A49) Direct3D11 vs_5_0 ps_5_0, D3D11)', unmaskedVendor: 'Google Inc. (Intel)', unmaskedRenderer: 'ANGLE (Intel, Intel(R) Iris(R) Xe Graphics (0x00009A49) Direct3D11 vs_5_0 ps_5_0, D3D11)', device: 'Intel Iris Xe Graphics', tier: 1 },
    { vendor: 'Google Inc. (Intel)', webglVendor: 'Google Inc. (Intel)', webglRenderer: 'ANGLE (Intel, Intel(R) HD Graphics 520 (0x00001916) Direct3D11 vs_5_0 ps_5_0, D3D11)', unmaskedVendor: 'Google Inc. (Intel)', unmaskedRenderer: 'ANGLE (Intel, Intel(R) HD Graphics 520 (0x00001916) Direct3D11 vs_5_0 ps_5_0, D3D11)', device: 'Intel HD Graphics 520', tier: 0 },
    { vendor: 'Google Inc. (AMD)', webglVendor: 'Google Inc. (AMD)', webglRenderer: 'ANGLE (AMD, AMD Radeon RX 6600 XT Direct3D11 vs_5_0 ps_5_0, D3D11)', unmaskedVendor: 'Google Inc. (AMD)', unmaskedRenderer: 'ANGLE (AMD, AMD Radeon RX 6600 XT Direct3D11 vs_5_0 ps_5_0, D3D11)', device: 'AMD Radeon RX 6600 XT', tier: 2 },
    { vendor: 'Google Inc. (AMD)', webglVendor: 'Google Inc. (AMD)', webglRenderer: 'ANGLE (AMD, AMD Radeon(TM) Graphics (0x00001681) Direct3D11 vs_5_0 ps_5_0, D3D11)', unmaskedVendor: 'Google Inc. (AMD)', unmaskedRenderer: 'ANGLE (AMD, AMD Radeon(TM) Graphics (0x00001681) Direct3D11 vs_5_0 ps_5_0, D3D11)', device: 'AMD Radeon(TM) Graphics', tier: 1 },
    { vendor: 'Google Inc. (Microsoft)', webglVendor: 'Google Inc. (Microsoft)', webglRenderer: 'ANGLE (Microsoft, Microsoft Basic Render Driver Direct3D11 vs_5_0 ps_5_0, D3D11)', unmaskedVendor: 'Google Inc. (Microsoft)', unmaskedRenderer: 'ANGLE (Microsoft, Microsoft Basic Render Driver Direct3D11 vs_5_0 ps_5_0, D3D11)', device: 'Microsoft Basic Render Driver', tier: 0 },
  ],
  mac: [
    { vendor: 'Google Inc. (Apple)', webglVendor: 'Google Inc. (Apple)', webglRenderer: 'ANGLE (Apple, ANGLE Metal Renderer: Apple M1, Unspecified Version)', unmaskedVendor: 'Google Inc. (Apple)', unmaskedRenderer: 'ANGLE (Apple, ANGLE Metal Renderer: Apple M1, Unspecified Version)', device: 'Apple M1', tier: 1 },
    { vendor: 'Google Inc. (Apple)', webglVendor: 'Google Inc. (Apple)', webglRenderer: 'ANGLE (Apple, ANGLE Metal Renderer: Apple M2, Unspecified Version)', unmaskedVendor: 'Google Inc. (Apple)', unmaskedRenderer: 'ANGLE (Apple, ANGLE Metal Renderer: Apple M2, Unspecified Version)', device: 'Apple M2', tier: 2 },
    { vendor: 'Google Inc. (Apple)', webglVendor: 'Google Inc. (Apple)', webglRenderer: 'ANGLE (Apple, ANGLE Metal Renderer: Apple M1 Pro, Unspecified Version)', unmaskedVendor: 'Google Inc. (Apple)', unmaskedRenderer: 'ANGLE (Apple, ANGLE Metal Renderer: Apple M1 Pro, Unspecified Version)', device: 'Apple M1 Pro', tier: 2 },
    { vendor: 'Intel Inc.', webglVendor: 'Intel Inc.', webglRenderer: 'Intel Iris OpenGL Engine', unmaskedVendor: 'Intel Inc.', unmaskedRenderer: 'Intel Iris OpenGL Engine', device: 'Intel Iris', tier: 1 },
    { vendor: 'ATI Technologies Inc.', webglVendor: 'ATI Technologies Inc.', webglRenderer: 'AMD Radeon Pro 5500M OpenGL Engine', unmaskedVendor: 'ATI Technologies Inc.', unmaskedRenderer: 'AMD Radeon Pro 5500M OpenGL Engine', device: 'AMD Radeon Pro 5500M', tier: 1 },
  ],
  linux: [
    { vendor: 'Google Inc. (Intel)', webglVendor: 'Google Inc. (Intel)', webglRenderer: 'ANGLE (Intel, Mesa Intel(R) UHD Graphics 620 (KBL GT2), OpenGL 4.6)', unmaskedVendor: 'Google Inc. (Intel)', unmaskedRenderer: 'ANGLE (Intel, Mesa Intel(R) UHD Graphics 620 (KBL GT2), OpenGL 4.6)', device: 'Mesa Intel UHD 620', tier: 0 },
    { vendor: 'Google Inc. (AMD)', webglVendor: 'Google Inc. (AMD)', webglRenderer: 'ANGLE (AMD, AMD Radeon RX 580 (POLARIS10, DRM 3.42.0, 5.15.0-91-generic, LLVM 15.0.7), OpenGL 4.6)', unmaskedVendor: 'Google Inc. (AMD)', unmaskedRenderer: 'ANGLE (AMD, AMD Radeon RX 580 (POLARIS10, DRM 3.42.0, 5.15.0-91-generic, LLVM 15.0.7), OpenGL 4.6)', device: 'AMD Radeon RX 580', tier: 1 },
    { vendor: 'Google Inc. (NVIDIA)', webglVendor: 'Google Inc. (NVIDIA)', webglRenderer: 'ANGLE (NVIDIA, NVIDIA GeForce GTX 1060 6GB/PCIe/SSE2, OpenGL 4.5.0)', unmaskedVendor: 'Google Inc. (NVIDIA)', unmaskedRenderer: 'ANGLE (NVIDIA, NVIDIA GeForce GTX 1060 6GB/PCIe/SSE2, OpenGL 4.5.0)', device: 'NVIDIA GeForce GTX 1060 6GB', tier: 1 },
  ],
  android: [
    { vendor: 'Qualcomm', webglVendor: 'Qualcomm', webglRenderer: 'Adreno (TM) 730', unmaskedVendor: 'Qualcomm', unmaskedRenderer: 'Adreno (TM) 730', device: 'Adreno 730', tier: 2 },
    { vendor: 'Qualcomm', webglVendor: 'Qualcomm', webglRenderer: 'Adreno (TM) 650', unmaskedVendor: 'Qualcomm', unmaskedRenderer: 'Adreno (TM) 650', device: 'Adreno 650', tier: 1 },
    { vendor: 'Qualcomm', webglVendor: 'Qualcomm', webglRenderer: 'Adreno (TM) 642L', unmaskedVendor: 'Qualcomm', unmaskedRenderer: 'Adreno (TM) 642L', device: 'Adreno 642L', tier: 1 },
    { vendor: 'Qualcomm', webglVendor: 'Qualcomm', webglRenderer: 'Adreno (TM) 619', unmaskedVendor: 'Qualcomm', unmaskedRenderer: 'Adreno (TM) 619', device: 'Adreno 619', tier: 0 },
    { vendor: 'ARM', webglVendor: 'ARM', webglRenderer: 'Mali-G710', unmaskedVendor: 'ARM', unmaskedRenderer: 'Mali-G710', device: 'Mali-G710', tier: 1 },
    { vendor: 'ARM', webglVendor: 'ARM', webglRenderer: 'Mali-G52 MC2', unmaskedVendor: 'ARM', unmaskedRenderer: 'Mali-G52 MC2', device: 'Mali-G52 MC2', tier: 0 },
    { vendor: 'ARM', webglVendor: 'ARM', webglRenderer: 'Mali-G57 MC2', unmaskedVendor: 'ARM', unmaskedRenderer: 'Mali-G57 MC2', device: 'Mali-G57 MC2', tier: 0 },
  ],
  ios: [
    { vendor: 'Apple Inc.', webglVendor: 'Apple Inc.', webglRenderer: 'Apple GPU', unmaskedVendor: 'Apple Inc.', unmaskedRenderer: 'Apple GPU', device: 'Apple GPU', tier: 1 },
  ],
};

/* Platform / device archetypes with coherent specs */
const DEVICE_MODELS = {
  android: [
    { model: 'RMX1971', name: 'realme 5 Pro', brand: 'realme', release: '2019-08', cpu: 'Qualcomm Technologies, Inc SDM712', cores: 8, gpuKey: 'Adreno (TM) 616', ram: 4, screen: [1080, 2340], dpr: 2.75, browsers: ['chrome'], hintsModel: 'RMX1971' },
    { model: 'SM-A505F', name: 'Samsung Galaxy A50', brand: 'samsung', release: '2019-03', cpu: 'Samsung Exynos 7 Octa 9610', cores: 8, gpuKey: 'Mali-G72 MP3', ram: 4, screen: [1080, 2340], dpr: 2.625, browsers: ['chrome'], hintsModel: 'SM-A505F' },
    { model: 'Pixel 7', name: 'Google Pixel 7', brand: 'google', release: '2022-10', cpu: 'Google Tensor G2', cores: 8, gpuKey: 'Mali-G710', ram: 8, screen: [1080, 2400], dpr: 2.625, browsers: ['chrome'], hintsModel: 'Pixel 7' },
    { model: 'SM-S911B', name: 'Samsung Galaxy S23', brand: 'samsung', release: '2023-02', cpu: 'Qualcomm Snapdragon 8 Gen 2', cores: 8, gpuKey: 'Adreno (TM) 740', ram: 8, screen: [1080, 2340], dpr: 2.8125, browsers: ['chrome'], hintsModel: 'SM-S911B' },
    { model: '2211133G', name: 'Xiaomi 13', brand: 'xiaomi', release: '2023-02', cpu: 'Qualcomm Snapdragon 8 Gen 2', cores: 8, gpuKey: 'Adreno (TM) 740', ram: 8, screen: [1080, 2400], dpr: 2.75, browsers: ['chrome'], hintsModel: '2211133G' },
    { model: 'CPH2451', name: 'OPPO Reno8 T', brand: 'oppo', release: '2023-01', cpu: 'Qualcomm Snapdragon 695', cores: 8, gpuKey: 'Adreno (TM) 619', ram: 8, screen: [1080, 2400], dpr: 2.75, browsers: ['chrome'], hintsModel: 'CPH2451' },
    { model: 'M2101K6G', name: 'Xiaomi Redmi Note 10 Pro', brand: 'xiaomi', release: '2021-03', cpu: 'Qualcomm Snapdragon 732G', cores: 8, gpuKey: 'Adreno (TM) 618', ram: 6, screen: [1080, 2400], dpr: 2.75, browsers: ['chrome'], hintsModel: 'M2101K6G' },
    { model: 'V2140', name: 'vivo Y33s', brand: 'vivo', release: '2021-07', cpu: 'MediaTek Helio G80', cores: 8, gpuKey: 'Mali-G52 MC2', ram: 4, screen: [1080, 2400], dpr: 2.75, browsers: ['chrome'], hintsModel: 'V2140' },
    { model: '23021RAAEG', name: 'Redmi Note 12', brand: 'xiaomi', release: '2023-03', cpu: 'Qualcomm Snapdragon 685', cores: 8, gpuKey: 'Adreno (TM) 610', ram: 4, screen: [1080, 2400], dpr: 2.75, browsers: ['chrome'], hintsModel: '23021RAAEG' },
  ],
  ios: [
    { model: 'iPhone14,5', name: 'iPhone 13', brand: 'apple', release: '2021-09', cpu: 'Apple A15 Bionic', cores: 6, gpuKey: 'Apple GPU', ram: 4, screen: [390, 844], dpr: 3, browsers: ['safari'], osVersion: '17.4.1' },
    { model: 'iPhone15,2', name: 'iPhone 14 Pro', brand: 'apple', release: '2022-09', cpu: 'Apple A16 Bionic', cores: 6, gpuKey: 'Apple GPU', ram: 6, screen: [393, 852], dpr: 3, browsers: ['safari'], osVersion: '17.5' },
    { model: 'iPhone16,1', name: 'iPhone 15 Pro', brand: 'apple', release: '2023-09', cpu: 'Apple A17 Pro', cores: 6, gpuKey: 'Apple GPU', ram: 8, screen: [393, 852], dpr: 3, browsers: ['safari'], osVersion: '18.1' },
  ],
  windows: [
    { name: 'Windows 10 desktop', os: 'Windows 10', osBuild: '19045.3803', cores: [4, 6, 8, 12, 16], ram: [4, 8, 16, 32], gpuTier: [0, 1, 2], screens: [[1920, 1079, 1], [1920, 1080, 1], [1536, 864, 1.25], [2560, 1440, 1], [1366, 768, 1], [1280, 720, 1]] },
    { name: 'Windows 11 desktop', os: 'Windows 11', osBuild: '22631.3155', cores: [6, 8, 10, 12, 16, 20], ram: [8, 16, 32, 64], gpuTier: [1, 2], screens: [[1920, 1080, 1], [2560, 1440, 1], [1536, 864, 1.25], [3840, 2160, 1.5], [1920, 1200, 1]] },
    { name: 'Windows 10 laptop', os: 'Windows 10', osBuild: '19045.4046', cores: [4, 8, 6], ram: [4, 8, 16], gpuTier: [0, 1], screens: [[1366, 768, 1], [1536, 864, 1.25], [1920, 1080, 1]] },
    { name: 'Windows 11 laptop', os: 'Windows 11', osBuild: '22621.3155', cores: [8, 10, 12, 16], ram: [8, 16, 32], gpuTier: [1, 2], screens: [[1920, 1080, 1], [2256, 1504, 1.5], [2560, 1600, 2], [2880, 1800, 2]] },
  ],
  macos: [
    { name: 'MacBook Air M1', os: 'macOS 14.4.1', cores: [8], ram: [8, 16], screens: [[1440, 900, 2], [1470, 956, 2]], gpu: 'Apple M1' },
    { name: 'MacBook Pro 14 M2', os: 'macOS 14.5', cores: [10], ram: [16, 32], screens: [[1512, 982, 2], [1728, 1117, 2]], gpu: 'Apple M2' },
    { name: 'MacBook Air M2', os: 'macOS 15.1', cores: [8], ram: [8, 16, 24], screens: [[1470, 956, 2], [1440, 900, 2]], gpu: 'Apple M2' },
    { name: 'iMac 24 M1', os: 'macOS 14.2.1', cores: [8], ram: [16], screens: [[2240, 1260, 2], [1920, 1080, 2]], gpu: 'Apple M1' },
  ],
  linux: [
    { name: 'Ubuntu 22.04 desktop', os: 'Ubuntu', cores: [4, 8, 12, 16], ram: [4, 8, 16, 32], screens: [[1920, 1080, 1], [1366, 768, 1], [2560, 1440, 1]] },
    { name: 'Fedora 40 desktop', os: 'Fedora Linux', cores: [8, 12, 16], ram: [8, 16, 32], screens: [[1920, 1080, 1], [2560, 1440, 1]] },
  ],
};

/* ------------------------------------------------ Android/iPhone OS matrix */
const ANDROID_VERSIONS = [
  { v: '11', api: 30, minRelease: '2020-09' },
  { v: '12', api: 31, minRelease: '2021-10' },
  { v: '13', api: 33, minRelease: '2022-08' },
  { v: '14', api: 34, minRelease: '2023-10' },
  { v: '15', api: 35, minRelease: '2024-10' },
];

/* --------------------------------------------------------- FONT CATALOGS */
const FONT_SETS = {
  windows11: ['Arial', 'Calibri', 'Cambria', 'Candara', 'Comic Sans MS', 'Consolas', 'Constantia', 'Corbel', 'Courier New', 'Ebrima', 'Franklin Gothic Medium', 'Gabriola', 'Gadugi', 'Georgia', 'HoloLens MDL2 Assets', 'Impact', 'Ink Free', 'Javanese Text', 'Leelawadee UI', 'Lucida Console', 'Lucida Sans Unicode', 'Marlett', 'Microsoft Himalaya', 'Microsoft JhengHei', 'Microsoft New Tai Lue', 'Microsoft PhagsPa', 'Microsoft Sans Serif', 'Microsoft Tai Le', 'Microsoft YaHei', 'Microsoft Yi Baiti', 'MingLiU-ExtB', 'Mongolian Baiti', 'MS Gothic', 'MV Boli', 'Myanmar Text', 'Nirmala UI', 'Palatino Linotype', 'Segoe MDL2 Assets', 'Segoe Print', 'Segoe Script', 'Segoe UI', 'Segoe UI Emoji', 'Segoe UI Historic', 'Segoe UI Symbol', 'SimSun', 'Sitka Banner', 'Sitka Display', 'Sitka Heading', 'Sitka Small', 'Sitka Subheading', 'Sitka Text', 'Sylfaen', 'Symbol', 'Tahoma', 'Times New Roman', 'Trebuchet MS', 'Verdana', 'Webdings', 'Wingdings', 'Yu Gothic'],
  windows10: ['Arial', 'Calibri', 'Cambria', 'Candara', 'Comic Sans MS', 'Consolas', 'Constantia', 'Corbel', 'Courier New', 'Ebrima', 'Franklin Gothic Medium', 'Gabriola', 'Gadugi', 'Georgia', 'Impact', 'Javanese Text', 'Leelawadee UI', 'Lucida Console', 'Lucida Sans Unicode', 'Marlett', 'Microsoft Himalaya', 'Microsoft JhengHei', 'Microsoft New Tai Lue', 'Microsoft PhagsPa', 'Microsoft Sans Serif', 'Microsoft Tai Le', 'Microsoft YaHei', 'Microsoft Yi Baiti', 'MingLiU-ExtB', 'Mongolian Baiti', 'MS Gothic', 'MV Boli', 'Myanmar Text', 'Nirmala UI', 'Palatino Linotype', 'Segoe MDL2 Assets', 'Segoe Print', 'Segoe Script', 'Segoe UI', 'Segoe UI Emoji', 'Segoe UI Historic', 'Segoe UI Symbol', 'SimSun', 'Sitka Banner', 'Sitka Display', 'Sitka Heading', 'Sitka Small', 'Sitka Subheading', 'Sitka Text', 'Sylfaen', 'Symbol', 'Tahoma', 'Times New Roman', 'Trebuchet MS', 'Verdana', 'Webdings', 'Wingdings', 'Yu Gothic'],
  mac: ['American Typewriter', 'Andale Mono', 'Apple Chancery', 'Apple Color Emoji', 'Apple SD Gothic Neo', 'Apple Symbols', 'Arial', 'Arial Black', 'Avenir', 'Avenir Next', 'Ayuthaya', 'Baskerville', 'Big Caslon', 'Bodoni 72', 'Brush Script MT', 'Chalkboard', 'Chalkduster', 'Chicago', 'Cochin', 'Copperplate', 'Courier', 'Courier New', 'Didot', 'Futura', 'Geneva', 'Georgia', 'Gill Sans', 'Helvetica', 'Helvetica Neue', 'Herculanum', 'Hoefler Text', 'Impact', 'Lucida Grande', 'Luminari', 'Marker Felt', 'Menlo', 'Monaco', 'Noteworthy', 'Optima', 'Palatino', 'Papyrus', 'Phosphate', 'Rockwell', 'Savoye LET', 'SignPainter', 'Skia', 'Snell Roundhand', 'Symbol', 'Tahoma', 'Times', 'Times New Roman', 'Trattatello', 'Trebuchet MS', 'Verdana', 'Webdings', 'Zapf Dingbats'],
  linux: ['DejaVu Sans', 'DejaVu Sans Mono', 'DejaVu Serif', 'Liberation Mono', 'Liberation Sans', 'Liberation Serif', 'Noto Color Emoji', 'Noto Sans', 'Noto Sans Mono', 'Noto Serif', 'Ubuntu', 'Ubuntu Condensed', 'Ubuntu Light', 'Ubuntu Mono', 'FreeSans', 'FreeSerif', 'Nimbus Roman', 'Cantarell', 'Droid Sans', 'C059', 'P052', 'URW Gothic'],
  android: ['Roboto', 'Roboto Mono', 'Noto Sans', 'Noto Serif', 'Noto Color Emoji', 'Droid Sans', 'Droid Sans Mono', 'Cutive Mono', 'Coming Soon', 'Dancing Script', 'Droid Serif', 'Cutive', 'Carrois Gothic SC', 'Cormorant', 'Cormorant Garamond', 'Exo', 'Exo 2', 'Lato', 'Merriweather', 'Nunito', 'Open Sans', 'Oswald', 'PT Sans', 'PT Serif', 'Raleway', 'Roboto Condensed', 'Rubik', 'Source Sans Pro', 'Tinos', 'Arimo'],
  ios: ['Academy Engraved LET', 'Academy Engraved LET Plain', 'Al Nile', 'American Typewriter', 'Apple Color Emoji', 'Apple SD Gothic Neo', 'Arial', 'Arial Hebrew', 'Arial Rounded MT Bold', 'Avenir', 'Avenir Next', 'Baskerville', 'Bodoni 72', 'Bradley Hand', 'Chalkboard SE', 'Chalkduster', 'Cochin', 'Copperplate', 'Courier', 'Courier New', 'Damascus', 'Didot', 'Futura', 'Geeza Pro', 'Georgia', 'Gill Sans', 'Helvetica', 'Helvetica Neue', 'Hiragino Sans', 'Hoefler Text', 'Kailasa', 'Kefa', 'Marker Felt', 'Menlo', 'Mishafi', 'Noteworthy', 'Noto Nastaliq Urdu', 'Optima', 'Palatino', 'Papyrus', 'Party LET', 'Rockwell', 'Savoye LET', 'Snell Roundhand', 'Symbol', 'System Font', 'Tahoma', 'Thonburi', 'Times New Roman', 'Trebuchet MS', 'Verdana', 'Zapf Dingbats'],
};

/* ---------------------------------------------- Chrome extension catalog */
const CHROME_EXTENSIONS = [
  { id: 'nkbihfbeogaeaoehlefnkodbefgpgknn', name: 'MetaMask', version: '11.16.0' },
  { id: 'hdokiejnpimakedhajhdlcegeplioahd', name: 'LastPass', version: '4.129.0' },
  { id: 'cjpalhdlnbpafiamejdnhcphjbkeiagm', name: 'uBlock Origin', version: '1.57.2' },
  { id: 'gighmmpiobklfepjocnamgkkbiglidom', name: 'AdBlock', version: '5.15.0' },
  { id: 'fmkadmapgofadopljbjfkapdkoienihi', name: 'React Developer Tools', version: '5.1.0' },
  { id: 'aeblfdkhhhdcdjpifhhbdiojplfjncoa', name: '1Password', version: '8.10.36' },
  { id: 'ghbmnnjooekpmoecnnnilnnbdlolhkhi', name: 'Google Docs Offline', version: '1.77.0' },
  { id: 'pkehgijcmpdhfbdbbnkijodmdjhbjlgp', name: 'Privacy Badger', version: '2024.6.7' },
  { id: 'mnjggcdmjocbbbhaepdhchncahnbgone', name: 'SponsorBlock', version: '5.5.5' },
  { id: 'bkdgflcldnnnapblkhphbgpggdiikppg', name: 'Bypass Paywalls', version: '3.1.4' },
  { id: 'kbfnbcaeplbcioakkpcpgfkobkghlhen', name: 'Grammarly', version: '14.1120.0' },
  { id: 'lkbebcjgcmobigpeffafkodonchffocl', name: 'Honey', version: '16.1.0' },
];

/* ----------------------------------------------------------- TIMEZONES */
/* IANA zone data (offset in minutes at reference; DST-aware where needed).
   For every zone we track its city + country so nothing can drift. */
const TZ_DB = [
  { id: 'America/New_York', city: 'New York', country: 'US', std: -300, dst: -240, abbr: ['EST', 'EDT'], dstRule: 'us' },
  { id: 'America/Chicago', city: 'Chicago', country: 'US', std: -360, dst: -300, abbr: ['CST', 'CDT'], dstRule: 'us' },
  { id: 'America/Denver', city: 'Denver', country: 'US', std: -420, dst: -360, abbr: ['MST', 'MDT'], dstRule: 'us' },
  { id: 'America/Phoenix', city: 'Phoenix', country: 'US', std: -420, dst: -420, abbr: ['MST', 'MST'], dstRule: 'none' },
  { id: 'America/Los_Angeles', city: 'Los Angeles', country: 'US', std: -480, dst: -420, abbr: ['PST', 'PDT'], dstRule: 'us' },
  { id: 'America/Anchorage', city: 'Anchorage', country: 'US', std: -540, dst: -480, abbr: ['AKST', 'AKDT'], dstRule: 'us' },
  { id: 'Pacific/Honolulu', city: 'Honolulu', country: 'US', std: -600, dst: -600, abbr: ['HST', 'HST'], dstRule: 'none' },
  { id: 'America/Toronto', city: 'Toronto', country: 'CA', std: -300, dst: -240, abbr: ['EST', 'EDT'], dstRule: 'us' },
  { id: 'America/Halifax', city: 'Halifax', country: 'CA', std: -240, dst: -180, abbr: ['AST', 'ADT'], dstRule: 'us' },
  { id: 'America/Vancouver', city: 'Vancouver', country: 'CA', std: -480, dst: -420, abbr: ['PST', 'PDT'], dstRule: 'us' },
  { id: 'America/Edmonton', city: 'Edmonton', country: 'CA', std: -420, dst: -360, abbr: ['MST', 'MDT'], dstRule: 'us' },
  { id: 'America/Winnipeg', city: 'Winnipeg', country: 'CA', std: -360, dst: -300, abbr: ['CST', 'CDT'], dstRule: 'us' },
  { id: 'America/Mexico_City', city: 'Mexico City', country: 'MX', std: -360, dst: -360, abbr: ['CST', 'CST'], dstRule: 'none' },
  { id: 'America/Monterrey', city: 'Monterrey', country: 'MX', std: -360, dst: -360, abbr: ['CST', 'CST'], dstRule: 'none' },
  { id: 'America/Sao_Paulo', city: 'São Paulo', country: 'BR', std: -180, dst: -180, abbr: ['BRT', 'BRT'], dstRule: 'none' },
  { id: 'America/Argentina/Buenos_Aires', city: 'Buenos Aires', country: 'AR', std: -180, dst: -180, abbr: ['ART', 'ART'], dstRule: 'none' },
  { id: 'America/Argentina/Cordoba', city: 'Córdoba', country: 'AR', std: -180, dst: -180, abbr: ['ART', 'ART'], dstRule: 'none' },
  { id: 'America/Santiago', city: 'Santiago', country: 'CL', std: -240, dst: -180, abbr: ['CLT', 'CLST'], dstRule: 'south' },
  { id: 'America/Bogota', city: 'Bogotá', country: 'CO', std: -300, dst: -300, abbr: ['COT', 'COT'], dstRule: 'none' },
  { id: 'Europe/London', city: 'London', country: 'GB', std: 0, dst: 60, abbr: ['GMT', 'BST'], dstRule: 'eu' },
  { id: 'Europe/Dublin', city: 'Dublin', country: 'IE', std: 0, dst: 60, abbr: ['GMT', 'IST'], dstRule: 'eu' },
  { id: 'Europe/Lisbon', city: 'Lisbon', country: 'PT', std: 0, dst: 60, abbr: ['WET', 'WEST'], dstRule: 'eu' },
  { id: 'Europe/Paris', city: 'Paris', country: 'FR', std: 60, dst: 120, abbr: ['CET', 'CEST'], dstRule: 'eu' },
  { id: 'Europe/Berlin', city: 'Berlin', country: 'DE', std: 60, dst: 120, abbr: ['CET', 'CEST'], dstRule: 'eu' },
  { id: 'Europe/Amsterdam', city: 'Amsterdam', country: 'NL', std: 60, dst: 120, abbr: ['CET', 'CEST'], dstRule: 'eu' },
  { id: 'Europe/Madrid', city: 'Madrid', country: 'ES', std: 60, dst: 120, abbr: ['CET', 'CEST'], dstRule: 'eu' },
  { id: 'Europe/Rome', city: 'Rome', country: 'IT', std: 60, dst: 120, abbr: ['CET', 'CEST'], dstRule: 'eu' },
  { id: 'Europe/Zurich', city: 'Zurich', country: 'CH', std: 60, dst: 120, abbr: ['CET', 'CEST'], dstRule: 'eu' },
  { id: 'Europe/Vienna', city: 'Vienna', country: 'AT', std: 60, dst: 120, abbr: ['CET', 'CEST'], dstRule: 'eu' },
  { id: 'Europe/Stockholm', city: 'Stockholm', country: 'SE', std: 60, dst: 120, abbr: ['CET', 'CEST'], dstRule: 'eu' },
  { id: 'Europe/Warsaw', city: 'Warsaw', country: 'PL', std: 60, dst: 120, abbr: ['CET', 'CEST'], dstRule: 'eu' },
  { id: 'Europe/Prague', city: 'Prague', country: 'CZ', std: 60, dst: 120, abbr: ['CET', 'CEST'], dstRule: 'eu' },
  { id: 'Europe/Oslo', city: 'Oslo', country: 'NO', std: 60, dst: 120, abbr: ['CET', 'CEST'], dstRule: 'eu' },
  { id: 'Europe/Copenhagen', city: 'Copenhagen', country: 'DK', std: 60, dst: 120, abbr: ['CET', 'CEST'], dstRule: 'eu' },
  { id: 'Europe/Helsinki', city: 'Helsinki', country: 'FI', std: 120, dst: 180, abbr: ['EET', 'EEST'], dstRule: 'eu' },
  { id: 'Europe/Kyiv', city: 'Kyiv', country: 'UA', std: 120, dst: 180, abbr: ['EET', 'EEST'], dstRule: 'eu' },
  { id: 'Europe/Bucharest', city: 'Bucharest', country: 'RO', std: 120, dst: 180, abbr: ['EET', 'EEST'], dstRule: 'eu' },
  { id: 'Europe/Athens', city: 'Athens', country: 'GR', std: 120, dst: 180, abbr: ['EET', 'EEST'], dstRule: 'eu' },
  { id: 'Europe/Istanbul', city: 'Istanbul', country: 'TR', std: 180, dst: 180, abbr: ['TRT', 'TRT'], dstRule: 'none' },
  { id: 'Europe/Moscow', city: 'Moscow', country: 'RU', std: 180, dst: 180, abbr: ['MSK', 'MSK'], dstRule: 'none' },
  { id: 'Asia/Dubai', city: 'Dubai', country: 'AE', std: 240, dst: 240, abbr: ['GST', 'GST'], dstRule: 'none' },
  { id: 'Asia/Qatar', city: 'Doha', country: 'QA', std: 180, dst: 180, abbr: ['AST', 'AST'], dstRule: 'none' },
  { id: 'Asia/Riyadh', city: 'Riyadh', country: 'SA', std: 180, dst: 180, abbr: ['AST', 'AST'], dstRule: 'none' },
  { id: 'Asia/Tehran', city: 'Tehran', country: 'IR', std: 210, dst: 210, abbr: ['+0330', '+0330'], dstRule: 'none' },
  { id: 'Asia/Jerusalem', city: 'Jerusalem', country: 'IL', std: 120, dst: 180, abbr: ['IST', 'IDT'], dstRule: 'il' },
  { id: 'Asia/Kolkata', city: 'Mumbai', country: 'IN', std: 330, dst: 330, abbr: ['IST', 'IST'], dstRule: 'none' },
  { id: 'Asia/Karachi', city: 'Karachi', country: 'PK', std: 300, dst: 300, abbr: ['PKT', 'PKT'], dstRule: 'none' },
  { id: 'Asia/Dhaka', city: 'Dhaka', country: 'BD', std: 360, dst: 360, abbr: ['BST', 'BST'], dstRule: 'none' },
  { id: 'Asia/Jakarta', city: 'Jakarta', country: 'ID', std: 420, dst: 420, abbr: ['WIB', 'WIB'], dstRule: 'none' },
  { id: 'Asia/Makassar', city: 'Denpasar', country: 'ID', std: 480, dst: 480, abbr: ['WITA', 'WITA'], dstRule: 'none' },
  { id: 'Asia/Singapore', city: 'Singapore', country: 'SG', std: 480, dst: 480, abbr: ['SGT', 'SGT'], dstRule: 'none' },
  { id: 'Asia/Kuala_Lumpur', city: 'Kuala Lumpur', country: 'MY', std: 480, dst: 480, abbr: ['MYT', 'MYT'], dstRule: 'none' },
  { id: 'Asia/Manila', city: 'Manila', country: 'PH', std: 480, dst: 480, abbr: ['PST', 'PST'], dstRule: 'none' },
  { id: 'Asia/Bangkok', city: 'Bangkok', country: 'TH', std: 420, dst: 420, abbr: ['ICT', 'ICT'], dstRule: 'none' },
  { id: 'Asia/Ho_Chi_Minh', city: 'Ho Chi Minh City', country: 'VN', std: 420, dst: 420, abbr: ['ICT', 'ICT'], dstRule: 'none' },
  { id: 'Asia/Hong_Kong', city: 'Hong Kong', country: 'HK', std: 480, dst: 480, abbr: ['HKT', 'HKT'], dstRule: 'none' },
  { id: 'Asia/Shanghai', city: 'Shanghai', country: 'CN', std: 480, dst: 480, abbr: ['CST', 'CST'], dstRule: 'none' },
  { id: 'Asia/Tokyo', city: 'Tokyo', country: 'JP', std: 540, dst: 540, abbr: ['JST', 'JST'], dstRule: 'none' },
  { id: 'Asia/Seoul', city: 'Seoul', country: 'KR', std: 540, dst: 540, abbr: ['KST', 'KST'], dstRule: 'none' },
  { id: 'Australia/Sydney', city: 'Sydney', country: 'AU', std: 600, dst: 660, abbr: ['AEST', 'AEDT'], dstRule: 'south' },
  { id: 'Australia/Melbourne', city: 'Melbourne', country: 'AU', std: 600, dst: 660, abbr: ['AEST', 'AEDT'], dstRule: 'south' },
  { id: 'Australia/Brisbane', city: 'Brisbane', country: 'AU', std: 600, dst: 600, abbr: ['AEST', 'AEST'], dstRule: 'none' },
  { id: 'Australia/Perth', city: 'Perth', country: 'AU', std: 480, dst: 480, abbr: ['AWST', 'AWST'], dstRule: 'none' },
  { id: 'Australia/Adelaide', city: 'Adelaide', country: 'AU', std: 570, dst: 630, abbr: ['ACST', 'ACDT'], dstRule: 'south' },
  { id: 'Pacific/Auckland', city: 'Auckland', country: 'NZ', std: 720, dst: 780, abbr: ['NZST', 'NZDT'], dstRule: 'south' },
  { id: 'Africa/Johannesburg', city: 'Johannesburg', country: 'ZA', std: 120, dst: 120, abbr: ['SAST', 'SAST'], dstRule: 'none' },
  { id: 'Africa/Lagos', city: 'Lagos', country: 'NG', std: 60, dst: 60, abbr: ['WAT', 'WAT'], dstRule: 'none' },
  { id: 'Africa/Nairobi', city: 'Nairobi', country: 'KE', std: 180, dst: 180, abbr: ['EAT', 'EAT'], dstRule: 'none' },
  { id: 'Africa/Cairo', city: 'Cairo', country: 'EG', std: 120, dst: 180, abbr: ['EET', 'EEST'], dstRule: 'eg' },
];

const TZ_BY_ID = Object.fromEntries(TZ_DB.map((z) => [z.id, z]));

/* DST rules: return true if dst applied at given UTC date.
   us: 2nd Sunday March 02:00 local → 1st Sunday Nov 02:00
   eu: last Sunday March 01:00 UTC → last Sunday Oct 01:00 UTC
   south: first Sunday Oct → first Sunday April (Southern hemisphere)
   il: last Friday March → last Sunday Oct
   eg: last Friday April → last Thursday Oct
   none: never */
function _nthWeekday(year, month, weekday, nth) { // month 0-based, weekday 0=Sun
  if (nth > 0) {
    const first = new Date(Date.UTC(year, month, 1));
    const firstWd = first.getUTCDay();
    const day = 1 + ((weekday - firstWd + 7) % 7) + (nth - 1) * 7;
    return new Date(Date.UTC(year, month, day));
  }
  const last = new Date(Date.UTC(year, month + 1, 0));
  const lastWd = last.getUTCDay();
  const day = last.getUTCDate() - ((lastWd - weekday + 7) % 7) - (-nth - 1) * 7;
  return new Date(Date.UTC(year, month, day));
}
function dstActive(zone, date) {
  const rule = zone.dstRule;
  if (rule === 'none' || zone.std === zone.dst) return false;
  const y = date.getUTCFullYear();
  const t = date.getTime();
  if (rule === 'us') {
    const start = _nthWeekday(y, 2, 0, 2); start.setUTCHours(7); // 02:00 EST = 07:00 UTC
    const end = _nthWeekday(y, 10, 0, 1); end.setUTCHours(6);
    return t >= start.getTime() && t < end.getTime();
  }
  if (rule === 'eu') {
    const start = _nthWeekday(y, 2, 0, -1); start.setUTCHours(1);
    const end = _nthWeekday(y, 9, 0, -1); end.setUTCHours(1);
    return t >= start.getTime() && t < end.getTime();
  }
  if (rule === 'south') {
    const start = _nthWeekday(y, 9, 0, 1); start.setUTCHours(16); // 02:00 AEST = 16:00 UTC prev day handled by month boundaries
    const end = _nthWeekday(y, 3, 0, 1); end.setUTCHours(16);
    const yStart = new Date(Date.UTC(y, 9, 1)).getTime();
    if (t < start.getTime()) {
      const endPrev = _nthWeekday(y - 1, 3, 0, 1); endPrev.setUTCHours(16);
      return t >= endPrev.getTime() && t < end.getTime();
    }
    return t >= start.getTime() && t < new Date(Date.UTC(y + 1, 3, 1)).getTime();
  }
  if (rule === 'il') {
    const start = _nthWeekday(y, 2, 5, -1); start.setUTCHours(0);
    const end = _nthWeekday(y, 9, 0, -1); end.setUTCHours(1);
    return t >= start.getTime() && t < end.getTime();
  }
  if (rule === 'eg') {
    const start = _nthWeekday(y, 3, 5, -1); start.setUTCHours(22);
    const end = _nthWeekday(y, 9, 4, -1); end.setUTCHours(21);
    return t >= start.getTime() && t < end.getTime();
  }
  return false;
}
function tzOffset(zone, date = new Date()) {
  return dstActive(zone, date) ? zone.dst : zone.std;
}
function tzAbbr(zone, date = new Date()) {
  return dstActive(zone, date) ? zone.abbr[1] : zone.abbr[0];
}
function tzLabel(zone) {
  const off = tzOffset(zone, new Date());
  const sign = off < 0 ? '-' : '+';
  const abs = Math.abs(off);
  return `UTC${sign}${U.pad(Math.floor(abs / 60), 1)}${abs % 60 ? ':' + U.pad(abs % 60) : ''}`;
}

/* text direction helper */
function dirOf(locale) { return (LOCALE_META[locale] || [])[3] || 'ltr'; }

/* locale time format hints: 12h for en-US, en-CA(en), ar, he; 24h others */
function hour12(locale) { return ['en-US', 'en-AE', 'en-PH', 'ar-AE', 'ar-SA', 'ar-QA', 'he-IL'].includes(locale); }
