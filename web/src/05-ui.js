/* ==========================================================================
   DOPPEL — 05-ui.js
   Design system, shared components, dashboard, generator modal,
   run-modal (simulated launch), export modal, toasts.
   ========================================================================== */
'use strict';

/* ------------------------------------------------------------- persistence */
function safeLS(op, key, val) {
  try {
    if (typeof localStorage === 'undefined' || !localStorage) return null;
    if (op === 'get') return localStorage.getItem(key);
    if (op === 'set') return localStorage.setItem(key, val);
  } catch (e) { return null; }
}
const Store = (() => {
  const KEY = 'doppel.db.v3';
  const empty = () => ({ schema: SCHEMA_VERSION, profiles: [], settings: { defaultCountry: '', network: 'proxy', privacy: 'auto', autoValidate: true, theme: 'dark' }, groups: [], createdAt: U.nowISO() });
  let db = empty();
  let canPersist = false;

  async function probe() {
    try {
      if (window.storage && window.storage.set) { await window.storage.set(KEY, JSON.stringify({ probe: 1 })); canPersist = true; }
    } catch (e) { canPersist = false; }
    return canPersist;
  }
  async function load() {
    await probe();
    try {
      let raw = null;
      if (canPersist) { const r = await window.storage.get(KEY); raw = r && r.value; }
      else raw = safeLS('get', KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.profiles)) db = U.deepMerge(empty(), parsed);
      }
    } catch (e) { console.warn('load failed', e); }
    return db;
  }
  async function save() {
    db.updatedAt = U.nowISO();
    try {
      if (canPersist) await window.storage.set(KEY, JSON.stringify(db));
      else safeLS('set', KEY, JSON.stringify(db));
    } catch (e) { console.warn('save failed', e); }
  }
  return {
    get db() { return db; },
    get persist() { return canPersist; },
    load, save, reset() { db = empty(); return save(); },
    async importAll(json) {
      const parsed = typeof json === 'string' ? JSON.parse(json) : json;
      if (!parsed || !Array.isArray(parsed.profiles)) throw new Error('INVALID_FILE');
      const normalized = parsed.profiles.map((p) => U.deepMerge(FP.generate({ quiet: true }), p));
      db = U.deepMerge(empty(), { ...parsed, profiles: normalized });
      await save();
      return db;
    },
    async add(p) { db.profiles.unshift(p); await save(); return p; },
    async update(p) { const i = db.profiles.findIndex((x) => x.id === p.id); if (i >= 0) db.profiles[i] = p; else db.profiles.unshift(p); await save(); return p; },
    async remove(id) { db.profiles = db.profiles.filter((p) => p.id !== id); await save(); },
    async settings(patch) { db.settings = Object.assign({}, db.settings, patch); await save(); },
  };
})();

/* ------------------------------------------------------------------ helpers */
const H = {
  esc: U.esc,
  flag(cc) { if (!cc) return '🏳️'; const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'; if (cc.length !== 2) return '🏳️'; return String.fromCodePoint(...[...cc.toUpperCase()].map((c) => 0x1f1e6 + A.indexOf(c))); },
  scoreColor(s) { return s >= 90 ? 'ok' : s >= 75 ? 'warn' : 'bad'; },
  scoreRing(score, size = 56, stroke = 5) {
    const r = (size - stroke) / 2, c = 2 * Math.PI * r, off = c * (1 - score / 100);
    const col = score >= 90 ? 'var(--ok)' : score >= 75 ? 'var(--warn)' : 'var(--bad)';
    return `<svg class="ring" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="var(--line)" stroke-width="${stroke}"/>
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${col}" stroke-width="${stroke}" stroke-linecap="round"
        stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}" transform="rotate(-90 ${size / 2} ${size / 2})"/>
      <text x="50%" y="52%" text-anchor="middle" dominant-baseline="middle" fill="var(--txt)" font-size="${size * 0.3}" font-weight="700">${score}</text>
    </svg>`;
  },
  pill(text, tone = '') { return `<span class="pill ${tone}">${text}</span>`; },
  icon(name, size = 16) {
    const p = {
      grid: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
      fingerprint: 'M12 11v3a3 3 0 0 1-3 3M8 12a4 4 0 0 1 8 0v2a7 7 0 0 1-.5 2.5M5 12a7 7 0 0 1 14 0v2M2 12a10 10 0 0 1 20 0v3M12 8a2 2 0 0 1 2 2v3',
      play: 'M5 3l14 9-14 9V3z',
      plus: 'M12 5v14M5 12h14',
      trash: 'M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14',
      copy: 'M9 9h11v11H9zM4 15V4h11',
      download: 'M12 3v12M7 10l5 5 5-5M4 21h16',
      upload: 'M12 21V9M7 14l5-5 5 5M4 3h16',
      shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z',
      globe: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18M12 3c2.5 2.5 3.5 5.5 3.5 9s-1 6.5-3.5 9c-2.5-2.5-3.5-5.5-3.5-9S9.5 5.5 12 3z',
      cpu: 'M6 6h12v12H6zM9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4',
      monitor: 'M3 4h18v12H3zM8 20h8M12 16v4',
      clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2',
      phone: 'M7 2h10v20H7zM11 18h2',
      laptop: 'M5 4h14v10H5zM2 18h20l-2 2H4l-2-2z',
      book: 'M4 4h7v16H4zM13 4h7v16h-7zM6 8h3M15 8h3',
      settings: 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.3 1a7 7 0 0 0-1.7-1L14.5 3h-4l-.4 2.6a7 7 0 0 0-1.7 1l-2.3-1-2 3.4L6 10.5a7 7 0 0 0 0 2L4 14l2 3.4 2.3-1a7 7 0 0 0 1.7 1l.4 2.6h4l.4-2.6a7 7 0 0 0 1.7-1l2.3 1 2-3.4-2-1.5c.1-.3.1-.7.1-1z',
      search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM21 21l-5-5',
      check: 'M4 12l5 5L20 6',
      x: 'M6 6l12 12M18 6L6 18',
      alert: 'M12 3l10 18H2L12 3zM12 9v5M12 17h.01',
      info: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 11v6M12 8h.01',
      user: 'M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM4 21c0-4 3.5-6 8-6s8 2 8 6',
      shuffle: 'M3 6h4l10 12h4M3 18h4L17 6h4M17 3l4 3-4 3M17 15l4 3-4 3',
      eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
      chevron: 'M9 6l6 6-6 6',
      beaker: 'M9 3h6M10 3v6l-6 11h16L14 9V3',
      code: 'M8 6l-5 6 5 6M16 6l5 6-5 6',
      layers: 'M12 3l9 5-9 5-9-5 9-5zM3 13l9 5 9-5M3 17l9 5 9-5',
      lock: 'M6 11V8a6 6 0 0 1 12 0v3M5 11h14v10H5z',
    }[name] || 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z';
    return `<svg class="ic" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="${p}"/></svg>`;
  },
  sevIcon(sev) {
    if (sev === 'pass') return '<span class="dot ok"></span>';
    if (sev === 'warn') return '<span class="dot warn"></span>';
    if (sev === 'fail') return '<span class="dot bad"></span>';
    return '<span class="dot dim"></span>';
  },
  rel(iso) {
    const d = (Date.now() - new Date(iso).getTime()) / 60000;
    if (d < 1) return 'همین حالا';
    if (d < 60) return `${Math.floor(d)} دقیقه پیش`;
    if (d < 1440) return `${Math.floor(d / 60)} ساعت پیش`;
    return `${Math.floor(d / 1440)} روز پیش`;
  },
  deviceLabel(p) {
    switch (p.os.platform) {
      case 'android': case 'ios': return p.os.device ? p.os.device.name : 'Mobile';
      case 'macos': return p.os.archetype || 'Mac';
      default: return p.os.archetype || p.os.osName;
    }
  },
  osLabel(p) {
    const m = { windows: 'Windows', macos: 'macOS', linux: 'Linux', android: 'Android', ios: 'iOS' };
    return `${m[p.os.platform] || p.os.platform} ${p.os.platform === 'windows' ? p.os.archId.replace('win', '') : ''}`.trim();
  },
  browserLabel(p) { return `${p.browser.name} ${p.browser.major}`; },
};

/* field components */
const F = {
  field(label, control, hint = '') {
    return `<label class="field"><span class="flabel">${label}${hint ? `<em>${hint}</em>` : ''}</span>${control}</label>`;
  },
  select(path, options, value, attrs = '') {
    const opt = options.map((o) => {
      const [v, l, sub] = Array.isArray(o) ? o : [o, o];
      return `<option value="${H.esc(v)}" ${String(v) === String(value) ? 'selected' : ''}>${H.esc(l)}${sub ? ` — ${H.esc(sub)}` : ''}</option>`;
    }).join('');
    return `<select data-path="${path}" ${attrs}>${opt}</select>`;
  },
  text(path, value, attrs = '') { return `<input type="text" data-path="${path}" value="${H.esc(value ?? '')}" ${attrs}>`; },
  number(path, value, min, max, step = 1, attrs = '') { return `<input type="number" data-path="${path}" value="${value}" min="${min}" max="${max}" step="${step}" ${attrs}>`; },
  toggle(path, checked, label = '') {
    return `<label class="switch"><input type="checkbox" data-path="${path}" ${checked ? 'checked' : ''}><span class="track"></span><span class="lb">${label}</span></label>`;
  },
  seg(path, options, value) {
    return `<div class="seg">${options.map(([v, l]) => `<button type="button" class="${String(v) === String(value) ? 'on' : ''}" data-action="seg" data-path="${path}" data-value="${H.esc(v)}">${l}</button>`).join('')}</div>`;
  },
  chips(list, tone = '') { return `<div class="chips">${list.map((x) => `<span class="chip ${tone}">${x}</span>`).join('')}</div>`; },
  card(title, body, opts = {}) {
    return `<section class="card ${opts.cls || ''}">
      ${title ? `<header class="card-h">${opts.icon ? H.icon(opts.icon, 15) : ''}<h3>${title}</h3>${opts.aside || ''}</header>` : ''}
      <div class="card-b ${opts.bodyCls || ''}">${body}</div>
    </section>`;
  },
  kv(rows) {
    return `<dl class="kv">${rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>`;
  },
  empty(title, body, actionHtml = '') {
    return `<div class="empty">${H.icon('fingerprint', 40)}<h2>${title}</h2><p>${body}</p>${actionHtml}</div>`;
  },
};

/* ------------------------------------------------------------------- Toasts */
function toast(msg, tone = 'ok', ttl = 3600) {
  const host = document.getElementById('toasts');
  if (!host) return;
  const el = document.createElement('div');
  el.className = `toast ${tone}`;
  el.innerHTML = `<span>${tone === 'ok' ? H.icon('check', 15) : tone === 'bad' ? H.icon('x', 15) : H.icon('info', 15)}</span><div>${msg}</div>`;
  host.appendChild(el);
  requestAnimationFrame(() => el.classList.add('in'));
  setTimeout(() => { el.classList.remove('in'); setTimeout(() => el.remove(), 300); }, ttl);
}

/* ============================================================ UI (main app) */
const UI = (() => {
  const S = {
    view: 'dashboard', id: null, tab: 'overview', draft: null, dirty: false,
    search: '', filter: 'all', modal: null, run: null,
    gen: { count: 3, country: '', device: 'any', os: 'any', browser: 'any', privacy: 'auto', network: 'proxy' },
  };
  let root = null;

  /* ------------------------------------------------------------ navigation */
  function go(view, id = null) {
    S.view = view;
    if (id !== undefined) S.id = id;
    S.dirty = false;
    if (view === 'editor' && S.id) {
      const p = Store.db.profiles.find((x) => x.id === S.id);
      if (p) S.draft = U.clone(p);
    }
    if (view !== 'editor') S.draft = null;
    render();
  }
  function current() { return S.draft || Store.db.profiles.find((x) => x.id === S.id) || null; }

  /* --------------------------------------------------------------- sidebar */
  function sidebar() {
    const d = Store.db;
    const navItem = (key, icon, label) => `<button class="nav ${S.view === key ? 'on' : ''}" data-action="go" data-view="${key}">${H.icon(icon, 17)}<span>${label}</span></button>`;
    const list = d.profiles.filter((p) => !S.search || (p.name + ' ' + p.geo.city + ' ' + p.geo.countryName).toLowerCase().includes(S.search.toLowerCase()));
    return `<aside class="sidebar">
      <div class="brand">
        <div class="logo">${H.icon('fingerprint', 22)}</div>
        <div><b>DOPPEL</b><small>Fingerprint Studio</small></div>
      </div>
      <nav class="navlist">
        ${navItem('dashboard', 'grid', 'داشبورد')}
        ${navItem('live', 'eye', 'آزمون زنده')}
        ${navItem('playground', 'beaker', 'مقایسه و تست')}
        ${navItem('install', 'layers', 'راه‌اندازی اجرا')}
        ${navItem('guide', 'book', 'راهنمای یکپارچگی')}
        ${navItem('settings', 'settings', 'تنظیمات')}
      </nav>
      <div class="plist-head"><span>پروفایل‌ها <b>${d.profiles.length}</b></span>
        <button class="icon-btn" data-action="gen-open" title="تولید پروفایل">${H.icon('plus', 15)}</button></div>
      <div class="plist-search"><div class="inwrap">${H.icon('search', 14)}<input id="q" placeholder="جستجو…" value="${H.esc(S.search)}" autocomplete="off"></div></div>
      <div class="plist">${list.length ? list.map((p) => `
        <button class="pitem ${S.id === p.id && S.view === 'editor' ? 'on' : ''}" data-action="open" data-id="${p.id}">
          <span class="pflag">${H.flag(p.geo.country)}</span>
          <span class="pname">${H.esc(p.name)}<small>${H.esc(p.geo.city)} · ${H.osLabel(p)}</small></span>
          <span class="pscore ${H.scoreColor(p.consistency.score)}">${p.consistency.score}</span>
        </button>`).join('') : '<div class="plist-empty">هنوز پروفایلی نساخته‌اید</div>'}
      </div>
      <div class="sidebar-foot">
        <button class="btn ghost sm full" data-action="gen-open">${H.icon('plus', 14)} پروفایل جدید</button>
        <span class="eng">${Store.persist ? 'ذخیره‌سازی ابری فعال' : 'ذخیره‌سازی محلی (بدون اتصال ابر)'} · v${DOPPEL_VERSION}</span>
      </div>
    </aside>`;
  }

  /* -------------------------------------------------------------- dashboard */
  function profileRow(p) {
    const c = p.consistency;
    return `<article class="pcard" data-action="open" data-id="${p.id}">
      <div class="pcard-top">
        <div class="pavatar">${H.flag(p.geo.country)}</div>
        ${H.scoreRing(c.score, 52, 5)}
      </div>
      <h3>${H.esc(p.name)}</h3>
      <div class="psub">${H.esc(p.geo.city)}, ${H.esc(p.geo.countryName)} · ${H.esc(p.geo.tzLabel)}</div>
      <div class="tagrow">
        ${H.pill(p.os.platform === 'android' || p.os.platform === 'ios' ? p.os.device?.name || 'Mobile' : p.os.osName, 'ghost')}
        ${H.pill(p.browser.name + ' ' + p.browser.major, 'ghost')}
        ${H.pill(p.network.proxy ? (p.network.proxy.type === 'mobile' ? 'Mobile proxy' : 'Residential') : 'Direct', p.network.proxy ? 'ok' : 'warn')}
      </div>
      <div class="pcard-meta">
        <span>${H.esc(p.navigator.userAgent.slice(0, 42))}…</span>
      </div>
      <div class="pcard-foot">
        <span class="muted">${H.rel(p.updatedAt)}</span>
        <div class="row gap4">
          <button class="icon-btn" data-action="run" data-id="${p.id}" title="اجرای پروفایل">${H.icon('play', 14)}</button>
          <button class="icon-btn" data-action="dup" data-id="${p.id}" title="تکثیر">${H.icon('copy', 14)}</button>
          <button class="icon-btn" data-action="export" data-id="${p.id}" title="خروجی">${H.icon('download', 14)}</button>
          <button class="icon-btn danger" data-action="del" data-id="${p.id}" title="حذف">${H.icon('trash', 14)}</button>
        </div>
      </div>
    </article>`;
  }

  function dashboard() {
    const ps = Store.db.profiles;
    const avg = ps.length ? Math.round(ps.reduce((a, p) => a + p.consistency.score, 0) / ps.length) : 0;
    const aGrade = ps.filter((p) => p.consistency.grade === 'A').length;
    const errs = ps.reduce((a, p) => a + p.consistency.errors.length, 0);
    const stats = `<div class="stats">
      <div class="stat"><span>پروفایل‌ها</span><b>${ps.length}</b><small>${aGrade} پروفایل درجه A</small></div>
      <div class="stat"><span>میانگین یکپارچگی</span><b>${avg}<i>/100</i></b><small>مبنای اعتبارسنجی داخلی</small></div>
      <div class="stat"><span>تناقض بحرانی</span><b class="${errs ? 'bad' : 'ok'}">${errs}</b><small>${errs ? 'نیازمند auto-fix' : 'همه پروفایل‌ها سازگارند'}</small></div>
      <div class="stat wide"><span>پوشش سیگنال‌ها</span><b>32+</b><small>سخت‌افزار، شبکه، زمان، زبان، canvas/WebGL/audio و …</small></div>
    </div>`;

    const hero = `<section class="hero">
      <div class="hero-copy">
        <div class="eyebrow">${H.icon('shield', 14)} Coherent identity engine</div>
        <h1>هر پروفایل، یک انسان باورپذیر.</h1>
        <p>پروفایل‌ها از یک «کهن‌الگوی دستگاه» زاده می‌شوند: سیستم‌عامل ← مرورگر ← UA و Client Hints ← رزولوشن ← GPU ← فونت ← زبان ← تایم‌زون ← IP. هیچ فیلدی مستقل و تصادفی نیست؛ همین است که پروفایل را از لو رفتن نجات می‌دهد.</p>
        <div class="row gap8 wrap">
          <button class="btn primary" data-action="gen-open">${H.icon('plus', 15)} ساخت پروفایل</button>
          <button class="btn" data-action="quick-random">${H.icon('shuffle', 15)} ترکیب کاملاً رندوم منسجم</button>
          <button class="btn ghost" data-action="go" data-view="guide">${H.icon('book', 15)} قواعد یکپارچگی</button>
        </div>
      </div>
      <div class="hero-side">
        <div class="hero-badge">${H.icon('lock', 18)}</div>
        <div><b>تضمین سازگاری</b><span>۳۲ آزمون پیوسته قبل از ذخیره</span></div>
        <div><b>Auto-repair</b><span>تصحیح زنجیره‌ای تایم‌زون/زبان/کارت گرافیک</span></div>
        <div><b>Zero contradiction</b><span>گذارنده در حالت رندوم</span></div>
      </div>
    </section>`;

    const body = ps.length
      ? `<div class="pgrid">${ps.map(profileRow).join('')}</div>`
      : F.empty('اولین پروفایل خود را بسازید', 'یک هویت کامل با سخت‌افزار، شبکه و اثرانگشت چسبندهٔ منسجم؛ آمادهٔ خروجی به userscript، Puppeteer و Playwright.', `<button class="btn primary" data-action="gen-open">${H.icon('plus', 15)} ساخت پروفایل</button>`);

    return `${hero}${stats}<div class="section-h"><h2>پروفایل‌ها</h2><span class="muted">${ps.length} پروفایل ذخیره‌شده</span></div>${body}`;
  }

  /* ---------------------------------------------------------------- modals */
  function modalGen() {
    const g = S.gen;
    const countries = [['', 'تصادفی (منسجم)'], ...GEO_NAMES.map((c) => [c, `${H.flag(c)} ${GEO_META[c].name}`])];
    return `<div class="modal-back" data-action="modal-close">
      <div class="modal" data-stop>
        <header class="modal-h"><h2>${H.icon('shuffle', 17)} تولید پروفایل</h2><button class="icon-btn" data-action="modal-close">${H.icon('x', 16)}</button></header>
        <div class="modal-b">
          <p class="lead">هر مقدار از یک کهن‌الگوی سازگار مشتق می‌شود. اگر کشور را انتخاب کنید، همهٔ شهر/تایم‌زون/زبان/ارز با همان هم‌تراز می‌شوند.</p>
          <div class="form-grid">
            ${F.field('تعداد', F.number('gen.count', g.count, 1, 20, 1, 'id="gen-count"'))}
            ${F.field('کشور', `<select id="gen-country">${countries.map(([v, l]) => `<option value="${v}" ${g.country === v ? 'selected' : ''}>${l}</option>`).join('')}</select>`, 'خالی = کاملاً تصادفی')}
            ${F.field('نوع دستگاه', `<div class="seg" id="gen-device">${[['any', 'هردو'], ['desktop', 'دسکتاپ'], ['mobile', 'موبایل']].map(([v, l]) => `<button type="button" class="${g.device === v ? 'on' : ''}" data-g="device" data-v="${v}">${l}</button>`).join('')}</div>`)}
            ${F.field('سیستم‌عامل', `<select id="gen-os"><option value="any">تصادفی</option>${[['windows', 'Windows'], ['macos', 'macOS'], ['linux', 'Linux'], ['android', 'Android'], ['ios', 'iOS']].map(([v, l]) => `<option value="${v}" ${g.os === v ? 'selected' : ''}>${l}</option>`).join('')}</select>`)}
            ${F.field('مرورگر', `<select id="gen-browser">${[['any', 'تصادفی'], ['chrome', 'Chrome'], ['edge', 'Edge'], ['firefox', 'Firefox'], ['safari', 'Safari']].map(([v, l]) => `<option value="${v}" ${g.browser === v ? 'selected' : ''}>${l}</option>`).join('')}</select>`)}
            ${F.field('شبکه', `<select id="gen-network">${[['proxy', 'پروکسی (هم‌خوان با شهر)'], ['direct', 'مستقیم (IP واقعی)']].map(([v, l]) => `<option value="${v}" ${g.network === v ? 'selected' : ''}>${l}</option>`).join('')}</select>`)}
          </div>
          <div class="notice warn">${H.icon('alert', 15)}<div>در حالت «رندوم» موتور تولید ابتدا کهن‌الگوی دستگاه را انتخاب می‌کند و بقیهٔ ۳۲ سیگنال را از آن مشتق می‌کند؛ بنابراین تناقض ساختاری ممکن نیست. پس از تولید، هر پروفایل مجدداً اعتبارسنجی می‌شود.</div></div>
        </div>
        <footer class="modal-f">
          <button class="btn ghost" data-action="modal-close">انصراف</button>
          <button class="btn primary" data-action="gen-run">${H.icon('play', 15)} تولید و اعتبارسنجی</button>
        </footer>
      </div>
    </div>`;
  }

  function modalExport() {
    const p = current(); if (!p) return '';
    const kind = S.exportKind || 'userscript';
    const kinds = [['userscript', 'Userscript (Tampermonkey/Violentmonkey)'], ['puppeteer', 'Puppeteer / Playwright runner'], ['flags', 'Chrome launch flags'], ['proxyext', 'SOCKS proxy-auth extension'], ['verify', 'صفحهٔ راستی‌آزمایی'], ['json', 'پروفایل JSON']];
    let content = '';
    if (kind === 'userscript') content = AGENT.userscript(p, S.exportTarget || '*://*/*');
    else if (kind === 'puppeteer') content = AGENT.puppeteer(p, { target: S.exportTarget || '' });
    else if (kind === 'flags') content = AGENT.chromeFlags(p);
    else if (kind === 'proxyext') content = AGENT.proxyAuthExtension(p);
    else if (kind === 'verify') content = AGENT.verifyPage(p);
    else content = JSON.stringify(p, null, 2);
    const ext = kind === 'verify' ? 'html' : kind === 'json' ? 'json' : kind === 'flags' ? 'txt' : 'js';
    return `<div class="modal-back" data-action="modal-close">
      <div class="modal wide" data-stop>
        <header class="modal-h"><h2>${H.icon('download', 17)} خروجی اجرا — ${H.esc(p.name)}</h2><button class="icon-btn" data-action="modal-close">${H.icon('x', 16)}</button></header>
        <div class="modal-b">
          <div class="seg tall" id="export-kinds">${kinds.map(([k, l]) => `<button type="button" class="${k === kind ? 'on' : ''}" data-action="export-kind" data-kind="${k}">${l}</button>`).join('')}</div>
          ${['userscript', 'puppeteer'].includes(kind) ? `<div class="inline-field"><label>آدرس هدف (match / start URL)</label><input id="export-target" value="${H.esc(S.exportTarget || '*://*/*')}" spellcheck="false"></div>` : ''}
          <pre class="code" id="export-code">${H.esc(content)}</pre>
        </div>
        <footer class="modal-f">
          <span class="muted grow">${content.length.toLocaleString()} کاراکتر · ${kind === 'verify' ? 'HTML مستقل' : kind === 'json' ? 'JSON' : 'کد آمادهٔ اجرا'}</span>
          <button class="btn ghost" data-action="ext-jump">${H.icon('layers', 14)} راه‌اندازی افزونهٔ اجرا</button>
          <button class="btn ghost" data-action="export-copy">${H.icon('copy', 14)} کپی</button>
          <button class="btn primary" data-action="export-download" data-ext="${ext}" data-kind="${kind}">${H.icon('download', 14)} دانلود</button>
        </footer>
      </div>
    </div>`;
  }

  function modalRun() {
    const r = S.run; if (!r) return '';
    const p = Store.db.profiles.find((x) => x.id === r.id);
    if (!p) return '';
    const res = AGENT.analyze(p);
    const steps = r.steps || [];
    return `<div class="modal-back" data-action="modal-close">
      <div class="modal wide" data-stop>
        <header class="modal-h">
          <h2>${H.icon('play', 17)} اجرای پروفایل — ${H.esc(p.name)}</h2>
          <button class="icon-btn" data-action="modal-close">${H.icon('x', 16)}</button>
        </header>
        <div class="modal-b run-b">
          <div class="run-console" id="run-console">
            ${steps.map((s) => `<div class="run-line ${s.t}"><span class="tm">${s.time}</span><span>${H.esc(s.msg)}</span></div>`).join('')}
            ${r.done ? '' : '<div class="run-line cursor"><span class="tm">…</span><span>در حال راه‌اندازی</span></div>'}
          </div>
          ${r.done ? `
          <div class="verdict ${res.verdict}">
            ${res.verdict === 'pass' ? H.icon('check', 18) : res.verdict === 'warn' ? H.icon('alert', 18) : H.icon('x', 18)}
            <div><b>${res.verdict === 'pass' ? 'هویت یکدست — آمادهٔ فعالیت' : res.verdict === 'warn' ? 'قابل قبول با هشدار' : 'تناقض بحرانی — اجرا نکنید'}</b>
            <span>هش: ${res.hash} · ${res.checks.filter((c) => c.sev === 'pass').length} سیگنال سالم · ${res.fails.length} خطا · ${res.warns.length} هشدار</span></div>
          </div>
          <div class="run-grid">
            ${F.card('نمای سایت هدف', `<div class="sitelook">
              <div class="browserbar"><span class="b-dot r"></span><span class="b-dot y"></span><span class="b-dot g"></span>
                <div class="url">${H.esc(S.runUrl || 'https://browserleaks.com/ip')}</div>
              </div>
              <div class="sitebody">
                <div><span>IP</span><b>${p.network.proxy ? H.esc(p.network.proxy.host + ':' + p.network.proxy.port) : 'مستقیم (IP واقعی)'}</b></div>
                <div><span>موقعیت</span><b>${H.flag(p.geo.country)} ${H.esc(p.geo.city)} · ${H.esc(p.geo.tzLabel)}</b></div>
                <div><span>UA</span><b class="ltr">${H.esc(p.navigator.userAgent.slice(0, 66))}…</b></div>
                <div><span>زبان</span><b>${H.esc((p.locale.languages || []).join(', '))}</b></div>
                <div><span>صفحه</span><b>${p.display.width}×${p.display.height} @${p.display.dpr}x</b></div>
                <div><span>GPU</span><b class="ltr">${H.esc(p.hardware.gpu.device)}</b></div>
              </div>
            </div>`, { icon: 'monitor' })}
            ${F.card('گزارش تشخیص', `<div class="checklist">${res.checks.slice(0, 12).map((c) => `
              <div class="checkrow">${H.sevIcon(c.sev)}<span class="ck-label">${H.esc(c.label)}</span><span class="ck-detail">${H.esc(c.detail)}</span></div>`).join('')}</div>`, { icon: 'shield' })}
          </div>
          <div class="openbar">
            <div class="inwrap grow">${H.icon('globe', 14)}<input id="run-url" value="${H.esc(S.runUrl || 'https://browserleaks.com/ip')}" spellcheck="false" placeholder="https://…"></div>
            <button class="btn small primary" data-action="open-site" data-id="${p.id}">${H.icon('play', 13)} باز کردن سایت</button>
            <div class="quicklinks">${[['browserleaks.com/ip', 'https://browserleaks.com/ip'], ['CreepJS', 'https://abrahamjuliot.github.io/creepjs/'], ['Whoer', 'https://whoer.net/'], ['TLS', 'https://tls.peet.ws/']].map(([l, u]) => `<button class="chip sm ql" data-quick="${u}">${l}</button>`).join('')}</div>
            <span class="tiny muted">اگر افزونهٔ DOPPEL روی همین مرورگر فعال و پروفایل اعمال شده باشد، این تب با همان هویت باز می‌شود. بدون افزونه، فقط یک تب معمولی است — و ما این را پنهان نمی‌کنیم.</span>
          </div>
          <div class="row gap8 wrap">
            <button class="btn" data-action="export" data-id="${p.id}">${H.icon('download', 14)} خروجی userscript / Puppeteer</button>
            <button class="btn ghost" data-action="open" data-id="${p.id}">${H.icon('settings', 14)} ویرایش پروفایل</button>
            <button class="btn ghost" data-action="verify-page" data-id="${p.id}">${H.icon('eye', 14)} صفحهٔ راستی‌آزمایی محلی</button>
          </div>` : ''}
        </div>
      </div>
    </div>`;
  }

  function modalShell() {
    if (!S.modal) return '';
    if (S.modal === 'gen') return modalGen();
    if (S.modal === 'export') return modalExport();
    if (S.modal === 'run') return modalRun();
    return '';
  }

  /* ----------------------------------------------------------------- render */
  function view() {
    switch (S.view) {
      case 'editor': return Editor.render(current());
      case 'live': return Live.render();
      case 'install': return Install.render();
      case 'playground': return Playground.render();
      case 'guide': return Guide.render();
      case 'settings': return Settings.render();
      default: return dashboard();
    }
  }

  function render() {
    if (!root) return;
    root.innerHTML = `<div class="app">${sidebar()}<main class="main" id="main">${view()}</main></div>${modalShell()}<div id="toasts"></div>`;
    const q = document.getElementById('q');
    if (q) { q.oninput = U.debounce((e) => { S.search = e.target.value; const p = document.querySelector('.plist'); if (p) { render(); document.getElementById('q').focus(); const v = document.getElementById('q'); v.setSelectionRange(v.value.length, v.value.length); } }, 160); }
  }

  /* ------------------------------------------------------------- actions */
  const actions = {
    go(el) { go(el.dataset.view); },
    open(el) { go('editor', el.dataset.id); },
    async quickRandom() {
      const p = FP.generate({ network: Store.db.settings.network || 'proxy', privacy: 'auto' });
      await Store.add(p);
      toast(`پروفایل «${p.name}» با امتیاز ${p.consistency.score} ساخته شد`);
      go('editor', p.id);
    },
    'gen-open'() { S.modal = 'gen'; render(); },
    'modal-close'(el, e) {
      const inModal = e.target.closest('.modal');
      if (inModal && !e.target.closest('.modal-h [data-action="modal-close"]')) return;
      S.modal = null; render();
    },
    async 'gen-run'() {
      const g = S.gen;
      const made = [];
      for (let i = 0; i < g.count; i++) {
        const p = FP.generate({
          country: g.country || undefined,
          deviceType: g.device === 'any' ? undefined : g.device,
          os: g.os === 'any' ? undefined : g.os,
          browser: g.browser === 'any' ? undefined : g.browser,
          network: g.network,
        });
        // enforce requested OS/browser coherence by repairing
        const fixed = FP.repair(p);
        await Store.add(fixed);
        made.push(fixed);
      }
      S.modal = null;
      toast(`${made.length} پروفایل تولید و اعتبارسنجی شد`);
      if (made.length === 1) go('editor', made[0].id); else { go('dashboard'); }
    },
    async dup(el) {
      const p = Store.db.profiles.find((x) => x.id === el.dataset.id);
      if (!p) return;
      const c = U.clone(p);
      c.id = U.uid('prf'); c.seed = U.uid('seed'); c.name = p.name + '-copy'; c.createdAt = c.updatedAt = U.nowISO();
      c.fingerprint.canvasNoiseSeed = Math.floor(Math.random() * 900000 + 100000);
      c.fingerprint.audioSeed = Math.floor(Math.random() * 900000 + 100000);
      c.network.localIp = FP.privateIp(makeRng(c.seed), ['android', 'ios'].includes(c.os.platform));
      c.consistency = FP.validate(c);
      await Store.add(c);
      toast('پروفایل تکثیر شد (seed اثرانگشت جدید)');
      render();
    },
    async del(el) {
      const p = Store.db.profiles.find((x) => x.id === el.dataset.id);
      if (!p) return;
      if (!confirm(`پروفایل «${p.name}» حذف شود؟`)) return;
      await Store.remove(p.id);
      if (S.id === p.id) go('dashboard');
      toast('حذف شد');
    },
    export(el) { S.id = el.dataset.id || S.id; S.exportKind = 'userscript'; S.modal = 'export'; render(); },
    'export-kind'(el) { S.exportKind = el.dataset.kind; render(); },
    async 'export-copy'() {
      const code = document.getElementById('export-code');
      await U.copy(code.innerText);
      toast('کد کپی شد');
    },
    'export-download'(el) {
      const code = document.getElementById('export-code').innerText;
      const p = current();
      const base = (p ? p.name : 'doppel').replace(/[^\w-]+/g, '-');
      const names = { userscript: 'userscript', puppeteer: 'runner', flags: 'flags', proxyext: 'proxy-auth-extension', verify: 'verify', json: 'profile' };
      U.download(`${base}.${names[el.dataset.kind]}.${el.dataset.ext}`, code, el.dataset.ext === 'html' ? 'text/html' : el.dataset.ext === 'json' ? 'application/json' : 'text/plain');
      toast('فایل دانلود شد');
    },
    'seg'(el) {
      const path = el.dataset.path, val = el.dataset.value;
      if (!S.draft) return;
      let v = val;
      if (v === 'true') v = true; else if (v === 'false') v = false;
      else if (/^-?\d+(\.\d+)?$/.test(v)) v = +v;
      U.setPath(S.draft, path, v);
      S.dirty = true;
      Editor.onStructural(path);
      render();
    },
    async run(el) {
      const id = el.dataset.id;
      S.run = { id, steps: [], done: false };
      S.modal = 'run';
      render();
      const p = Store.db.profiles.find((x) => x.id === id);
      const push = (msg, t = 'info') => { S.run.steps.push({ msg, t, time: new Date().toLocaleTimeString('en-GB') }); if (S.modal === 'run') render(); };
      const seq = p.network.proxy ? [
        ['اتصال به پروکسی ' + p.network.proxy.host + ':' + p.network.proxy.port, 'info'],
        ['IP خروجی: ' + p.geo.city + ' · ' + p.geo.countryName + ' · ' + p.network.proxy.isp, 'ok'],
        ['تنظیم تایم‌زون ' + p.geo.tz + ' و locale ' + p.locale.locale, 'info'],
        ['تزریق UA و Client Hints (' + p.browser.name + ' ' + p.browser.major + ')', 'info'],
        ['پیکربندی WebGL: ' + p.hardware.gpu.device, 'info'],
        ['فونت‌ها، canvas seed #' + p.fingerprint.canvasNoiseSeed + ' و audio seed #' + p.fingerprint.audioSeed + ' اعمال شد', 'info'],
        ['WebRTC محدود شد — IP خصوصی ' + p.network.localIp, 'ok'],
        ['اعتبارسنجی نهایی: ' + p.consistency.score + '/100', p.consistency.errors.length ? 'bad' : 'ok'],
      ] : [
        ['حالت مستقیم — IP واقعی دستگاه شما استفاده می‌شود', 'warn'],
        ['تنظیم تایم‌زون ' + p.geo.tz + ' و locale ' + p.locale.locale, 'info'],
        ['تزریق UA و Client Hints', 'info'],
        ['اعتبارسنجی: ' + p.consistency.score + '/100', p.consistency.errors.length ? 'bad' : 'ok'],
      ];
      for (const [msg, t] of seq) { await U.sleep(340); push(msg, t); }
      S.run.done = true;
      render();
      if (p.consistency.errors.length) toast('پروفایل تناقض دارد — auto-fix را اجرا کنید', 'bad');
    },
    'verify-page'(el) {
      const p = Store.db.profiles.find((x) => x.id === el.dataset.id);
      if (!p) return;
      U.download(`${p.name}.verify.html`, AGENT.verifyPage(p), 'text/html');
      toast('صفحهٔ راستی‌آزمایی دانلود شد — در همان مرورگرِ پروفایل باز کنید');
    },
    'feed-download'() {
      U.download('profiles-feed.json', JSON.stringify({ schema: SCHEMA_VERSION, app: 'doppel', feed: true, generatedAt: U.nowISO(), profiles: Store.db.profiles }, null, 2));
      toast('فید پروفایل‌ها دانلود شد — در افزونه یا runner استفاده کنید');
    },
    'open-site'() {
      const u = document.getElementById('run-url');
      const url = (u && u.value || 'https://browserleaks.com/ip').trim();
      UI.S.runUrl = url;
      window.open(url, '_blank', 'noopener');
      toast('تب جدید باز شد — هویت فقط با افزونه/runner فعال اعمال می‌شود', 'info', 5000);
    },
    'ext-jump'() { S.modal = null; go('install'); },
    'gen-device'() {}, // handled by input event
    'batch-del'() {},
    'data-action-none'() {},
  };

  /* wire events once — delegation on document so modals survive re-renders */
  function bind() {
    document.addEventListener('click', (e) => {
      const onSeg = e.target.closest('[data-g]');
      if (onSeg) { S.gen[onSeg.dataset.g] = onSeg.dataset.v; render(); return; }
      const q = e.target.closest('[data-quick]');
      if (q) { const inp = document.getElementById('run-url'); if (inp) inp.value = q.dataset.quick; S.runUrl = q.dataset.quick; toast('آدرس تنظیم شد — دکمهٔ باز کردن را بزنید'); return; }
      const el = e.target.closest('[data-action]');
      if (!el) return;
      const fn = actions[el.dataset.action];
      if (fn) { e.preventDefault(); fn(el, e); }
    });
    document.addEventListener('change', (e) => {
      const el = e.target;
      if (el.id === 'gen-country') { S.gen.country = el.value; S.gen.os = 'any'; return; }
      if (el.id === 'gen-os') { S.gen.os = el.value; return; }
      if (el.id === 'gen-browser') { S.gen.browser = el.value; return; }
      if (el.id === 'gen-network') { S.gen.network = el.value; return; }
      if (el.id === 'export-target') { S.exportTarget = el.value; return; }
      if (el.id === 'gen-count') { S.gen.count = +el.value || 1; return; }
      if (el.dataset.path && S.draft && S.view === 'editor') { Editor.applyField(el); }
      if (el.dataset.path && S.modal === 'gen' && el.dataset.path.startsWith('gen.')) { U.setPath(S.gen, el.dataset.path, el.value); }
    });
    document.addEventListener('input', (e) => {
      const el = e.target;
      if (el.id === 'gen-count') { S.gen.count = +el.value || 1; }
      if (el.dataset.path === 'name' && S.draft) { S.draft.name = el.value; S.dirty = true; }
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && S.modal) { S.modal = null; render(); }
    });
  }

  /* ------------------------------------------------------------------- init */
  async function init(node) {
    root = node;
    await Store.load();
    bind();
    render();
  }

  return { init, render, go, S, current, actions };
})();
