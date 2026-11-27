// Experimental DATA boundary only. Does not install or modify browser APIs.
// Schema is derived from reads in the repository's spoof.js, not the phone binary.
const fields = (names, type) => Object.fromEntries(names.split(' ').map(k => [k, type]));
const brand = { brand: 'string', version: 'string' };
export const RUNTIME_SCHEMA = {
  browser: { family: 'string' },
  os: { platform: 'string' },
  navigator: {
    ...fields('userAgent appVersion oscpu platform vendor productSub', 'string'),
    ...fields('deviceMemory hardwareConcurrency maxTouchPoints', 'number'),
    pdfViewerEnabled: 'boolean',
  },
  locale: { languages: ['string'], locale: 'string' },
  geo: { ...fields('lat lon tzOffset', 'number'), ...fields('tz tzAbbr', 'string') },
  screen: fields('height width', 'number'),
  display: {
    ...fields('availHeight availWidth colorDepth dpr pixelDepth innerWidth innerHeight', 'number'),
    ...fields('orientation prefersColorScheme', 'string'), prefersReducedMotion: 'boolean',
  },
  hardware: {
    ...fields('cameraCount microphoneCount speakerCount', 'number'),
    gpu: fields('renderer unmaskedRenderer unmaskedVendor vendor webglVendor', 'string'),
  },
  fingerprint: {
    ...fields('audio canvas webgpu', 'string'),
    ...fields('audioSeed canvasNoiseSeed', 'number'),
    ...fields('clientRectsNoise spoofBattery', 'boolean'),
    battery: { level: 'number', charging: 'boolean' },
    fonts: ['string'], plugins: [{ name: 'string', filename: 'string', description: 'string' }],
  },
  network: {
    webrtc: 'string', connection: {
      ...fields('downlink rtt', 'number'), ...fields('effectiveType type', 'string'), saveData: 'boolean',
    },
  },
  clientHints: {
    ...fields('architecture bitness fullVersion model platform platformVersion', 'string'),
    brands: [brand], fullVersionList: [brand], formFactors: ['string'],
    mobile: 'boolean', wow64: 'boolean',
  },
  privacy: fields('doNotTrack globalPrivacyControl', 'boolean'),
  speech: [{ ...fields('name lang', 'string'), ...fields('localService default', 'boolean') }],
  permissions: fields('geolocation notifications camera microphone clipboardRead midi backgroundSync', 'string'),
};

// Only plain JSON objects are supported. Accessors are rejected without invocation.
function project(input, schema, path) {
  if (typeof schema === 'string') {
    if (typeof input !== schema || (schema === 'number' && !Number.isFinite(input))) {
      throw new TypeError(`Invalid runtime field type at ${path}`);
    }
    return input;
  }
  if (Array.isArray(schema)) {
    if (!Array.isArray(input)) throw new TypeError(`Expected array at ${path}`);
    if (input.length > 4096) throw new RangeError(`Oversized array at ${path}`);
    return Array.from({length: input.length}, (_, i) => {
      const d = Object.getOwnPropertyDescriptor(input, String(i));
      if (!d || !Object.hasOwn(d, 'value')) throw new TypeError(`Invalid array entry at ${path}`);
      return project(d.value, schema[0], `${path}[${i}]`);
    });
  }
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new TypeError(`Expected object at ${path}`);
  }
  const proto = Object.getPrototypeOf(input);
  if (proto !== Object.prototype && proto !== null) throw new TypeError(`Expected JSON object at ${path}`);
  const out = {};
  for (const [key, rule] of Object.entries(schema)) {
    const d = Object.getOwnPropertyDescriptor(input, key);
    if (!d) continue;
    if (!Object.hasOwn(d, 'value')) throw new TypeError(`Accessor disallowed at ${path}.${key}`);
    if (d.value === undefined || d.value === null) continue;
    out[key] = project(d.value, rule, `${path}.${key}`);
  }
  return out;
}

export function buildRuntimeData(profile) {
  const result = project(profile, RUNTIME_SCHEMA, 'runtime');
  if (!result.navigator?.userAgent) throw new TypeError('Missing runtime navigator.userAgent');
  return result;
}
