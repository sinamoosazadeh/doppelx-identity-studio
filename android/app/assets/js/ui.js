/* ==========================================================================
   DOPPEL X — ui.js  (DOM helpers, toasts, sheets, icons, dialogs)
   ========================================================================== */
'use strict';

const H = {
  esc: (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])),
  el(tag, attrs, html) {
    const e = document.createElement(tag);
    if (attrs) for (const k of Object.keys(attrs)) {
      if (k === 'class') e.className = attrs[k];
      else if (k.startsWith('on') && typeof attrs[k] === 'function') e.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] != null) e.setAttribute(k, attrs[k]);
    }
    if (html != null) e.innerHTML = html;
    return e;
  },
  qs: (sel, root) => (root || document).querySelector(sel),
  qsa: (sel, root) => Array.from((root || document).querySelectorAll(sel)),
  haptic(ms) {
    try {
      const active = !navigator.userActivation || navigator.userActivation.hasBeenActive;
      if (Store.settings.haptics && navigator.vibrate && active) navigator.vibrate(ms || 8);
    } catch (e) {}
    try { if (window.DXBridge && window.DXBridge.haptic) window.DXBridge.haptic(ms || 8); } catch (e) {}
  },
  copy(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    } catch (e) {}
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch (e) {}
    ta.remove();
    return Promise.resolve();
  },
  download(name, text, type) {
    try {
      if (window.DXBridge && window.DXBridge.save) { window.DXBridge.save(name, text); return; }
      const blob = new Blob([text], { type: type || 'text/plain' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = name;
      document.body.appendChild(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 600);
    } catch (e) { UI.toast('Download not available here', 'err'); }
  },
  bytes(n) { return n > 1e6 ? (n / 1e6).toFixed(1) + ' MB' : n > 1e3 ? (n / 1e3).toFixed(0) + ' KB' : n + ' B'; },
  ago(iso) {
    const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
    if (s < 60) return s + 's ago';
    if (s < 3600) return Math.floor(s / 60) + 'm ago';
    if (s < 86400) return Math.floor(s / 3600) + 'h ago';
    return Math.floor(s / 86400) + 'd ago';
  },
  flagOf(cc) {
    try { return String.fromCodePoint(...cc.toUpperCase().split('').map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)); } catch (e) { return cc; }
  },
};

const Icon = {
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2.4"><path d="M12 5v14M5 12h14"/></svg>',
  dice: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="8.5" cy="8.5" r="1.4" fill="currentColor"/><circle cx="15.5" cy="15.5" r="1.4" fill="currentColor"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/></svg>',
  copy: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8"><rect x="9" y="9" width="12" height="12" rx="2.5"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8"><path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14"/></svg>',
  edit: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8"><path d="M4 20h4L20 8l-4-4L4 16v4z"/></svg>',
  shield: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8"><path d="M12 3 5 6v6c0 4.5 3 7.6 7 9 4-1.4 7-4.5 7-9V6l-7-3z"/><path d="m9 12 2 2 4-4"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2.2"><path d="m5 13 4 4L19 7"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2.2"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  sparkle: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8"/></svg>',
  code: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8"><path d="m8 8-5 4 5 4M16 8l5 4-5 4"/></svg>',
  share: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/></svg>',
  download: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8"><path d="M12 3v12m0 0 5-5m-5 5-5-5"/><path d="M4 19h16"/></svg>',
  play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>',
  bolt: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8"><path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
  folder: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>',
  phone: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8"><rect x="6" y="2" width="12" height="20" rx="3"/><path d="M11 18h2"/></svg>',
  globe: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.5 3 14 0 18M12 3c-3 3.5-3 14 0 18"/></svg>',
  layers: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8"><path d="m12 3 9 5-9 5-9-5 9-5z"/><path d="m3 13 9 5 9-5"/></svg>',
  file: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8"><path d="M6 2h8l4 4v16H6z"/><path d="M14 2v5h5"/></svg>',
  lock: '<svg viewBox="0 0 24 24" fill="none" stroke-width="1.8"><rect x="4" y="10" width="16" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>',
};

const UI = (() => {
  function toast(msg, tone, ms) {
    const w = H.qs('#toasts');
    if (!w) return;
    const t = H.el('div', { class: 'toast ' + (tone || '') }, H.esc(msg));
    w.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .25s'; setTimeout(() => t.remove(), 260); }, ms || 2400);
  }
  function sheet(html, opts) {
    const bg = H.qs('#sheet-bg'), s = H.qs('#sheet');
    s.innerHTML = '<div class="grip"></div>' + html;
    bg.classList.add('on');
    requestAnimationFrame(() => s.classList.add('on'));
    const close = () => { s.classList.remove('on'); bg.classList.remove('on'); if (opts && opts.onClose) opts.onClose(); };
    bg.onclick = close;
    s.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', close));
    return { close, el: s };
  }
  function closeSheet() {
    const bg = H.qs('#sheet-bg'), s = H.qs('#sheet');
    if (s) s.classList.remove('on');
    if (bg) bg.classList.remove('on');
  }
  function confirm(title, text, okLabel, tone) {
    return new Promise((resolve) => {
      const sh = sheet(`
        <h3>${H.esc(title)}</h3>
        <p class="mut small">${H.esc(text)}</p>
        <div class="row mt">
          <button class="btn ghost grow" data-no>Cancel</button>
          <button class="btn ${tone === 'danger' ? 'danger' : 'primary'} grow" data-yes>${H.esc(okLabel || 'Confirm')}</button>
        </div>`, { onClose: () => resolve(false) });
      sh.el.querySelector('[data-yes]').onclick = () => { sh.close(); resolve(true); };
      sh.el.querySelector('[data-no]').onclick = () => { sh.close(); resolve(false); };
    });
  }
  function prompt(title, label, value, placeholder) {
    return new Promise((resolve) => {
      const sh = sheet(`
        <h3>${H.esc(title)}</h3>
        <div class="field mt"><label>${H.esc(label)}</label>
        <input class="input" id="pm" value="${H.esc(value || '')}" placeholder="${H.esc(placeholder || '')}"></div>
        <div class="row"><button class="btn ghost grow" data-no>Cancel</button><button class="btn primary grow" data-yes>Save</button></div>`,
      { onClose: () => resolve(null) });
      const inp = sh.el.querySelector('#pm');
      setTimeout(() => inp.focus(), 220);
      sh.el.querySelector('[data-yes]').onclick = () => { const v = inp.value.trim(); sh.close(); resolve(v); };
      sh.el.querySelector('[data-no]').onclick = () => { sh.close(); resolve(null); };
    });
  }
  function ring(score, label) {
    const r = 40, c = 2 * Math.PI * r;
    const off = c - (Math.max(0, Math.min(100, score)) / 100) * c;
    const col = score >= 92 ? 'var(--ok)' : score >= 80 ? 'var(--accent2)' : score >= 60 ? 'var(--warn)' : 'var(--bad)';
    return `<div class="ring"><svg width="92" height="92" viewBox="0 0 92 92">
      <circle cx="46" cy="46" r="${r}" fill="none" stroke="var(--panel3)" stroke-width="8"/>
      <circle cx="46" cy="46" r="${r}" fill="none" stroke="${col}" stroke-width="8" stroke-linecap="round"
        stroke-dasharray="${c}" stroke-dashoffset="${off}"/></svg>
      <div class="val">${score}<small>${H.esc(label || 'SCORE')}</small></div></div>`;
  }
  function bar(name, value, max, cls) {
    const pct = Math.max(0, Math.min(100, (value / (max || 100)) * 100));
    return `<div class="bar-row"><div class="n">${H.esc(name)}</div><div class="bar-track"><div class="bar-fill ${cls || ''}" style="width:${pct}%"></div></div><div class="v">${value}</div></div>`;
  }
  function avatar(p) {
    const cls = p.os.platform;
    const ini = (p.persona && p.persona.firstName ? p.persona.firstName[0] : '') + (p.persona && p.persona.lastName ? p.persona.lastName[0] : '');
    return `<div class="pav ${cls}">${H.esc(ini || 'DX')}</div>`;
  }
  function gradeBadge(p) {
    const g = p.consistency ? p.consistency.grade : '?';
    return `<span class="grade ${g}">${g}</span>`;
  }
  function toggle(on, attrs) {
    return `<div class="switch ${on ? 'on' : ''}" ${attrs || ''}></div>`;
  }
  function empty(big, title, sub) {
    return `<div class="empty"><div class="big">${big}</div><b>${H.esc(title)}</b><div class="small mt-s">${H.esc(sub || '')}</div></div>`;
  }
  return { toast, sheet, closeSheet, confirm, prompt, ring, bar, avatar, gradeBadge, toggle, empty };
})();
