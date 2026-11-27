/* DOPPEL Runtime popup — shows active profile, paste loader, quick actions */
'use strict';

const el = (h) => { const t = document.createElement('template'); t.innerHTML = h.trim(); return t.content.firstElementChild; };
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const FLAG = (cc) => cc && cc.length === 2 ? String.fromCodePoint(...[...cc.toUpperCase()].map((c) => 0x1f1e6 + 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.indexOf(c))) : '🏳️';

function render(state) {
  const c = document.getElementById('content');
  const p = state && state.profile;
  if (!p) {
    c.innerHTML = `
      <div class="card">
        <div class="pname">پروفایلی فعال نیست</div>
        <div class="pmeta">یک پروفایل از DOPPEL Studio وردارید و اینجا بچسبانید.</div>
      </div>
      <div class="card">
        <textarea id="paste" placeholder="JSON پروفایل را اینجا بچسبانید…"></textarea>
        <div class="err" id="err">JSON نامعتبر است.</div>
        <button class="btn primary" id="apply">فعال‌سازی پروفایل</button>
        <div class="hint">از تب «خروجی» استودیو، گزینهٔ «JSON پروفایل» را کپی کنید. پروفایل در حافظهٔ افزونه ذخیره می‌شود، پروکسی و هدرها اعمال می‌شوند و «همهٔ» تب‌های جدید و فعلی با آن اجرا می‌شوند.</div>
      </div>
      <div class="card">
        <b style="font-size:12px">پیش‌نیاز واقعی</b>
        <ol class="steps">
          <li>پروکسی residential همان شهر را در استودیو انتخاب کنید.</li>
          <li>Chrome را با <code>--load-extension</code> این پوشه اجرا کنید (یا unpacked).</li>
          <li>ادعای «fingerprint کامل» فقط با همین افزونه + پروکسی است؛ ظاهر UI جعل فقط پیش‌نمایش است.</li>
        </ol>
      </div>`;
    bindEmpty();
    return;
  }

  const px = p.network && p.network.proxy;
  c.innerHTML = `
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <span class="badge on"><span class="dot on"></span> فعال روی همهٔ سایت‌ها</span>
        <span class="flag">${FLAG(p.geo && p.geo.country)}</span>
      </div>
      <div class="pname">${esc(p.name || 'profile')}</div>
      <div class="pmeta">${esc((p.geo && p.geo.city) || '')} · ${esc((p.geo && p.geo.tz) || '')} · ${esc((p.browser && p.browser.name) || '')} ${esc((p.browser && p.browser.major) || '')}</div>
    </div>
    <div class="card">
      <div class="row"><span>UA</span><b>${esc((p.navigator && p.navigator.userAgent || '').slice(0, 48))}…</b></div>
      <div class="row"><span>زبان</span><b>${esc((p.locale && p.locale.languages || []).join(','))}</b></div>
      <div class="row"><span>پروکسی</span><b>${px ? esc(px.host + ':' + px.port + ' (' + px.type + ')') : 'مستقیم'}</b></div>
      <div class="row"><span>ZIP</span><b>${esc((p.geo && p.geo.tz) || '')}</b></div>
      <div class="row"><span>WebRTC</span><b>${esc((p.network && p.network.webrtc) || '')}</b></div>
      <div class="row"><span>seed</span><b>${esc(String((p.fingerprint && p.fingerprint.canvasNoiseSeed) || ''))}</b></div>
    </div>
    <div class="hint">این نسخهٔ عمومی هیچ بررسی خودکار بیرونی انجام نمی‌دهد. تنها روی محیطی که مالک یا مجاز به آزمون آن هستید اعتبارسنجی کنید.</div>
    <button class="btn ghost" id="replace">جایگزینی پروفایل</button>
    <button class="btn ghost" id="disable" style="color:var(--bad)">غیرفعال‌سازی و پاک کردن</button>
    <div class="hint">«غیرفعال‌سازی» پروکسی و هدرها را برمی‌دارد و تب‌های فعلی بعد از refresh به هویت واقعی برمی‌گردند.</div>
  `;
  document.getElementById('disable').onclick = async () => {
    await chrome.runtime.sendMessage({ type: 'DOPPEL_CLEAR' });
    const st = await chrome.runtime.sendMessage({ type: 'DOPPEL_STATE' });
    render(st);
  };
  document.getElementById('replace').onclick = async () => {
    await chrome.runtime.sendMessage({ type: 'DOPPEL_CLEAR' });
    render({});
  };
}

function bindEmpty() {
  const btn = document.getElementById('apply');
  if (!btn) return;
  btn.onclick = async () => {
    const raw = document.getElementById('paste').value.trim();
    const err = document.getElementById('err');
    try {
      const p = JSON.parse(raw);
      if (!p || !p.navigator || !p.geo) throw new Error('bad shape');
      const res = await chrome.runtime.sendMessage({ type: 'DOPPEL_SET', profile: p });
      if (!res || !res.ok) throw new Error('apply failed');
      const st = await chrome.runtime.sendMessage({ type: 'DOPPEL_STATE' });
      render(st);
    } catch (e) {
      err.style.display = 'block';
      err.textContent = 'پروفایل معتبر نیست — خروجی JSON استودیو را کامل بچسبانید.';
    }
  };
}

chrome.runtime.sendMessage({ type: 'DOPPEL_STATE' }).then(render).catch(() => render({}));
