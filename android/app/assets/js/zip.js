/* ==========================================================================
   DOPPEL X — zip.js   Minimal ZIP writer (store, no compression, CRC32)
   Lets the app build a ready-to-load MV3 extension bundle on-device.
   ========================================================================== */
'use strict';
const Zip = (() => {
  const table = (() => {
    const t = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[i] = c >>> 0;
    }
    return t;
  })();
  function crc32(bytes) {
    let c = 0xffffffff;
    for (let i = 0; i < bytes.length; i++) c = table[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }
  const enc = (s) => new TextEncoder().encode(s);
  function u16(n) { return [n & 255, (n >>> 8) & 255]; }
  function u32(n) { return [n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255]; }

  function build(files, opts) {
    const entries = Object.keys(files).map((name) => {
      const data = typeof files[name] === 'string' ? enc(files[name]) : files[name];
      const nameB = enc(name);
      return { name: nameB, data, crc: crc32(data), date: new Date() };
    });
    const chunks = [];
    let offset = 0;
    const central = [];
    entries.forEach((e) => {
      const local = [];
      local.push(...u32(0x04034b50), ...u16(20), ...u16(0x0800), ...u16(0));
      const t = ((e.date.getHours() << 11) | (e.date.getMinutes() << 5) | Math.floor(e.date.getSeconds() / 2)) & 0xffff;
      const d = (((e.date.getFullYear() - 1980) << 9) | ((e.date.getMonth() + 1) << 5) | e.date.getDate()) & 0xffff;
      local.push(...u16(t), ...u16(d), ...u32(e.crc), ...u32(e.data.length), ...u32(e.data.length), ...u16(e.name.length), ...u16(0));
      const head = new Uint8Array(local);
      chunks.push(head, e.name, e.data);
      central.push({ ...e, offset, t, d });
      offset += head.length + e.name.length + e.data.length;
    });
    const cdStart = offset;
    central.forEach((e) => {
      const c = [];
      c.push(...u32(0x02014b50), ...u16(20), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(e.t), ...u16(e.d));
      c.push(...u32(e.crc), ...u32(e.data.length), ...u32(e.data.length), ...u16(e.name.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0));
      c.push(...u32(0), ...u32(e.offset));
      const head = new Uint8Array(c);
      chunks.push(head, e.name);
      offset += head.length + e.name.length;
    });
    const end = new Uint8Array([
      ...u32(0x06054b50), ...u16(0), ...u16(0), ...u16(entries.length), ...u16(entries.length),
      ...u32(offset - cdStart), ...u32(cdStart), ...u16(0),
    ]);
    const all = [...chunks, end];
    const total = all.reduce((a, b) => a + b.length, 0);
    const out = new Uint8Array(total);
    let p = 0;
    all.forEach((b) => { out.set(b, p); p += b.length; });
    /* base64 for the native bridge / data URL path */
    let b64 = '';
    if (typeof btoa === 'function') {
      let s = '';
      for (let i = 0; i < out.length; i += 0x8000) s += String.fromCharCode.apply(null, out.subarray(i, i + 0x8000));
      b64 = btoa(s);
    }
    return {
      bytes: out, base64: b64,
      dataUrl: 'data:application/zip;base64,' + b64,
      size: out.length, entries: entries.length,
      binary() { return out; },
    };
  }
  function buildDataUrl(files) { return build(files).dataUrl; }
  return { build, buildDataUrl, crc32 };
})();
