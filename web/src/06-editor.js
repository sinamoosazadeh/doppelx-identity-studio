/* ==========================================================================
   DOPPEL — 06-editor.js
   Profile editor: every signal editable, live validation rail,
   cascade rules (country→tz→lang, os→ua/gpu/screen), JSON tab.
   ========================================================================== */
'use strict';

const Editor = (() => {

  const TABS = [
    ['overview', 'نمای کلی', 'grid'],
    ['network', 'شبکه و موقعیت', 'globe'],
    ['hardware', 'سخت‌افزار', 'cpu'],
    ['browser', 'مرورگر و UA', 'code'],
    ['display', 'صفحه و نمایش', 'monitor'],
    ['locale', 'زبان و زمان', 'clock'],
    ['privacy', 'حریم خصوصی', 'shield'],
    ['behavior', 'رفتار انسانی', 'user'],
    ['json', 'JSON', 'layers'],
  ];

  /* which paths cascade into the rest of the profile */
  const CASCADE = [/^geo\.country$/, /^geo\.city$/, /^os\./, /^browser\.family$/, /^screen\./, /^device\./];

  function render(p) {
    if (!p) return F.empty('پروفایلی انتخاب نشده', 'از فهرست کنار یک پروفایل را انتخاب کنید یا پروفایل جدید بسازید.', '<button class="btn primary" data-action="gen-open">ساخت پروفایل</button>');
    const S = UI.S;
    S.prof = p;
    const v = p.consistency || FP.validate(p);
    const hasErr = v.errors.length > 0;
    return `<div class="editor">
      <header class="ed-head">
        <div class="ed-title">
          <button class="icon-btn back" data-action="go" data-view="dashboard" title="بازگشت">${H.icon('chevron', 16)}</button>
          <div class="ed-avatar">${H.flag(p.geo.country)}</div>
          <div class="ed-name">
            <input class="name-input" data-path="name" value="${H.esc(p.name)}" spellcheck="false">
            <div class="ed-sub">${H.esc(p.geo.city)}, ${H.esc(p.geo.countryName)} · ${H.esc(p.geo.tz)} · ${H.esc(p.browser.name)} ${p.browser.major} · ${H.esc(H.deviceLabel(p))}</div>
          </div>
        </div>
        <div class="ed-actions">
          ${hasErr ? `<button class="btn warnbtn" data-action="autofix">${H.icon('shield', 15)} اصلاح خودکار تناقض‌ها</button>` : ''}
          <button class="btn ghost" data-action="revalidate">${H.icon('check', 15)} اعتبارسنجی</button>
          <button class="btn ghost" data-action="run" data-id="${p.id}">${H.icon('play', 15)} شبیه‌سازی اجرا</button>
          <button class="btn ghost" data-action="export" data-id="${p.id}">${H.icon('download', 15)} خروجی</button>
          <button class="btn primary ${S.dirty ? 'pulse' : ''}" data-action="save">${S.dirty ? 'ذخیره' : 'ذخیره شد'} ${H.icon('check', 14)}</button>
        </div>
      </header>

      <div class="ed-tabs">${TABS.map(([k, l, ic]) => `<button class="ed-tab ${S.tab === k ? 'on' : ''}" data-action="tab" data-tab="${k}">${H.icon(ic, 15)}<span>${l}</span></button>`).join('')}</div>

      <div class="ed-body">
        <div class="ed-main">${tabContent(p, S.tab)}</div>
        <aside class="ed-rail">${rail(p, v)}</aside>
      </div>
    </div>`;
  }

  /* ------------------------------------------------------------------ rail */
  function rail(p, v) {
    const res = AGENT.analyze(p);
    const list = (items, tone) => items.slice(0, 6).map((c) => `<div class="rail-item ${tone}">${H.sevIcon(tone === 'fail' ? 'fail' : 'warn')}<span>${H.esc(c.label)}</span></div>`).join('');
    return `
      ${F.card('', `
        <div class="rail-score">${H.scoreRing(v.score, 92, 7)}
          <div><b class="grade-${v.grade}">درجهٔ ${v.grade}</b>
          <span>${v.checks.filter((c) => c.sev === 'pass').length} سیگنال سالم</span>
          <span>${v.checks.length} ردیف آزمون</span></div>
        </div>
        <div class="rail-strip">
          <span class="${v.errors.length ? 'bad' : 'ok'}">${v.errors.length} خطا</span>
          <span class="${v.warnings.length ? 'warn' : 'ok'}">${v.warnings.length} هشدار</span>
        </div>`, { cls: 'rail-card' })}
      ${v.errors.length ? F.card('تناقض‌های بحرانی', `${list(v.errors, 'fail')}${v.errors.length > 6 ? `<div class="rail-more">+${v.errors.length - 6} مورد</div>` : ''}<button class="btn small full" data-action="autofix" style="margin-top:10px">اصلاح خودکار</button>`, { icon: 'alert' }) : ''}
      ${v.warnings.length ? F.card('هشدارهای نرم', `${list(v.warnings, 'warn')}${v.warnings.length > 6 ? `<div class="rail-more">+${v.warnings.length - 6} مورد</div>` : ''}`) : ''}
      ${F.card('هش هویت پروفایل', `
        <code class="hash">${res.hash}</code>
        <p class="tiny muted" style="margin:8px 0 0">هش پایدار بر اساس UA، صفحه، GPU، seedهای canvas/audio و IP محلی. تکرار این هش بین دو پروفایل یعنی همبستگی.</p>`, { icon: 'fingerprint' })}
      ${F.card('نمای سایت هدف', `<div class="mini-site">
        <div class="mini-row"><span>IP</span><b class="ltr">${p.network.proxy ? H.esc(p.network.proxy.host) : 'مستقیم'}</b></div>
        <div class="mini-row"><span>Country</span><b>${H.flag(p.geo.country)} ${H.esc(p.geo.country)}</b></div>
        <div class="mini-row"><span>Timezone</span><b class="ltr">${H.esc(p.geo.tz)}</b></div>
        <div class="mini-row"><span>Lang</span><b class="ltr">${H.esc(p.locale.languages[0])}</b></div>
        <div class="mini-row"><span>UA</span><b class="ltr ellipsis">${H.esc(p.navigator.userAgent)}</b></div>
        <div class="mini-row"><span>GPU</span><b class="ltr ellipsis">${H.esc(p.hardware.gpu.device)}</b></div>
      </div>`, { icon: 'globe' })}`;
  }

  /* ------------------------------------------------------------- tab bodies */
  function tabContent(p, tab) {
    switch (tab) {
      case 'network': return tabNetwork(p);
      case 'hardware': return tabHardware(p);
      case 'browser': return tabBrowser(p);
      case 'display': return tabDisplay(p);
      case 'locale': return tabLocale(p);
      case 'privacy': return tabPrivacy(p);
      case 'behavior': return tabBehavior(p);
      case 'json': return tabJson(p);
      default: return tabOverview(p);
    }
  }

  function tabOverview(p) {
    const c = p.consistency || FP.validate(p);
    const groups = ['identity', 'network', 'device', 'privacy'];
    const gmap = {
      identity: ['alias', 'بخش‌های هویتی', [['geo.countryName', 'کشور'], ['geo.city', 'شهر'], ['geo.tz', 'تایم‌زون'], ['locale.locale', 'Locale'], ['network.localIp', 'LAN IP']]],
    };
    return `
      <div class="grid2">
        ${F.card('هویت', `<div class="kv-rows">
          <div><span>نام پروفایل</span><input data-path="name" value="${H.esc(p.name)}"></div>
          <div><span>گروه</span><input data-path="group" value="${H.esc(p.group || '')}" placeholder="مثلاً: کمپین الف"></div>
          <div><span>آیدی</span><code>${H.esc(p.id)}</code></div>
          <div><span>seed</span><code>${H.esc(p.seed)}</code></div>
          <div><span>ساخته‌شده</span><span>${new Date(p.createdAt).toLocaleDateString('fa-IR')}</span></div>
        </div>`, { icon: 'user' })}
        ${F.card('خلاصهٔ سیگنال‌ها', `<div class="kv-rows">
          <div><span>OS</span><b>${H.esc(p.os.osName)} ${H.esc(p.os.osVersion)}</b></div>
          <div><span>دستگاه</span><b>${H.esc(H.deviceLabel(p))}</b></div>
          <div><span>مرورگر</span><b>${H.esc(p.browser.name)} ${p.browser.major} <em>${H.esc(p.browser.engine)}</em></b></div>
          <div><span>زبان</span><b>${H.esc(p.locale.languages.join(', '))}</b></div>
          <div><span>زمان</span><b>${H.esc(p.geo.tz)} · ${H.esc(p.geo.tzAbbr)}</b></div>
          <div><span>واحد پول</span><b>${H.esc(p.locale.currency)}</b></div>
        </div>`, { icon: 'layers' })}
      </div>
      ${F.card('نقشهٔ زنجیرهٔ سازگاری', `<div class="chain">
        ${[['موقعیت', p.geo.city + ' · ' + p.geo.country], ['تایم‌زون', p.geo.tz], ['زبان', p.locale.languages[0]], ['قالب زمان/عدد', p.locale.timeFormat + ' · ' + p.locale.numberFormat], ['IP خروجی', p.network.proxy ? p.network.proxy.country + ' · ' + p.network.proxy.isp : 'direct']]
          .map(([k, v], i, arr) => `<div class="chain-node"><span>${k}</span><b>${H.esc(v)}</b></div>${i < arr.length - 1 ? '<i class="chain-link">→</i>' : ''}`).join('')}
      </div>
      <p class="tiny muted">این پنج مورد در بهترين حالت یک خوشهٔ بسته می‌سازند؛ تغییر دستی هر یک بدون auto-fix زنجیره را می‌شکند.</p>`, { icon: 'shield' })}
      ${notesCard(p)}
    `;
  }

  function notesCard(p) {
    return `<section class="card"><header class="card-h">${H.icon('book', 15)}<h3>یادداشت عملیاتی</h3></header>
      <div class="card-b"><textarea data-path="notes" class="notes" rows="3" placeholder="مثلاً: این پروفایل روی پروکسی X برای حساب Y استفاده می‌شود. هرگز با پروفایل دیگری کوکی/لاگین یکسان ندهید.">${H.esc(p.notes || '')}</textarea></div></section>`;
  }

  function tabNetwork(p) {
    const prox = p.network.proxy;
    const cats = (PROXY_CATALOG[p.geo.country] && PROXY_CATALOG[p.geo.country].length)
      ? PROXY_CATALOG[p.geo.country]
      : (GEO[p.geo.country] || []).slice(0, 3).map((g) => FP.demoProxy(makeRng(p.seed + g[0]), p.geo.country, g[0]));
    return `${F.card('موقعیت و IP', `
      <div class="form-grid">
        ${F.field('کشور', `<select data-path="geo.country">${GEO_NAMES.map((c) => `<option value="${c}" ${c === p.geo.country ? 'selected' : ''}>${H.flag(c)} ${GEO_META[c].name}</option>`).join('')}</select>`, 'تغییر = هم‌ترازی خودکار تایم‌زون/زبان')}
        ${F.field('شهر', `<select data-path="geo.city">${(GEO[p.geo.country] || []).map((g) => `<option value="${H.esc(g[0])}" ${g[0] === p.geo.city ? 'selected' : ''}>${H.esc(g[0])} · ${H.esc(g[3])}</option>`).join('')}</select>`)}
        ${F.field('مختصات', `<div class="row gap4"><input data-path="geo.lat" type="number" step="0.0001" value="${p.geo.lat}"><input data-path="geo.lon" type="number" step="0.0001" value="${p.geo.lon}"></div>`)}
        ${F.field('دقت GPS (متر)', F.number('geo.accuracy', p.geo.accuracy, 10, 20000, 10))}
      </div>
      ${F.kv([['تایم‌زون', `<code>${p.geo.tz}</code>`], ['آفست', `${H.esc(p.geo.tzLabel)} · ${H.esc(p.geo.tzAbbr)}`], ['ارز', H.esc(p.geo.currency)], ['نوع پیام «کجا هستم»', 'هم‌تراز با شهر انتخاب‌شده']])}`, { icon: 'globe' })}

      ${F.card('پروکسی / خروجی', `
      <div class="form-grid">
        ${F.field('حالت شبکه', F.seg('network.mode', [['proxy', 'پروکسی'], ['direct', 'مستقیم']], p.network.mode))}
        ${F.field('پروتکل', F.seg('network.proxyProtocol', [['socks5', 'SOCKS5'], ['http', 'HTTP(S)']], prox ? 'socks5' : 'socks5'))}
      </div>
      ${cats.length ? `<div class="preset-grid">
        <label class="field"><span class="flabel">انتخاب سریع از استخر دمو<em>هاست‌ها نمونه‌اند</em></span>
          <select id="proxy-preset">${cats.map((x, i) => `<option value="${i}">${H.esc(x.host + ':' + x.port)} · ${H.esc(x.city)} · ${H.esc(x.isp)} (${x.type})</option>`).join('')}</select>
        </label>
        <button class="btn small" data-action="proxy-from-preset">${H.icon('check', 13)} اعمال</button>
      </div>` : `<div class="notice">${H.icon('info', 15)}<div>برای این کشور پروکسی در استخر دمو نیست — می‌توانید دستی اضافه کنید.</div></div>`}
      <div class="form-grid">
        ${F.field('Host', F.text('network.proxy.host', prox ? prox.host : '', 'spellcheck="false" placeholder="residential.provider.net"'))}
        ${F.field('Port', F.number('network.proxy.port', prox ? prox.port : 1080, 1, 65535))}
        ${F.field('کاربر', F.text('network.proxy.username', prox ? prox.username || '' : '', 'autocomplete="off"'))}
        ${F.field('رمز', F.text('network.proxy.password', prox ? prox.password || '' : '', 'autocomplete="off"'))}
      </div>
      <div class="row gap8 wrap mt8">
        <button class="btn small" data-action="proxy-country">${H.icon('globe', 14)} هم‌ترازی با کشور (استخر)</button>
        <button class="btn small ghost" data-action="proxy-clear">حذف پروکسی</button>
      </div>
        <p class="tiny muted">هاست‌های استخر پیش‌فرض «نمونه» هستند؛ برای کار واقعی endpoint پروکسی residential/mobile اختصاصی همان شهر را در Host/Port بگذارید. پروکسی دیتاسنتر (Hetzner/DigitalOcean) در فهرست ASN سایت‌ها به‌سرعت به‌عنوان VPN شناسایی می‌شود.</p>`, { icon: 'lock', aside: prox ? H.pill(prox.type, prox.type === 'mobile' ? 'warn' : 'ok') : H.pill('direct', 'warn') })}

      ${F.card('WebRTC و اتصال', `
      <div class="form-grid">
        ${F.field('سیاست WebRTC', `<select data-path="network.webrtc">
          <option value="disabled" ${p.network.webrtc === 'disabled' ? 'selected' : ''}>disabled — بدون نشتی (پیشنهادی با پروکسی)</option>
          <option value="proxy" ${p.network.webrtc === 'proxy' ? 'selected' : ''}>آدرس‌های UDP پروکسی‌شده</option>
          <option value="public" ${p.network.webrtc === 'public' ? 'selected' : ''}>آزاد — نمایش IP عمومی</option>
        </select>`)}
        ${F.field('IP داخلی LAN', F.text('network.localIp', p.network.localIp, 'spellcheck="false"'))}
        ${F.field('نوع اتصال', `<select data-path="network.connection.type">${['wifi', 'ethernet', 'cellular'].map((t) => `<option ${p.network.connection.type === t ? 'selected' : ''}>${t}</option>`).join('')}</select>`)}
        ${F.field('effectiveType', `<select data-path="network.connection.effectiveType">${['4g', '5g', '3g'].map((t) => `<option ${p.network.connection.effectiveType === t ? 'selected' : ''}>${t}</option>`).join('')}</select>`)}
        ${F.field('Downlink (Mbps)', F.number('network.connection.downlink', p.network.connection.downlink, 1, 60))}
        ${F.field('RTT (ms)', F.number('network.connection.rtt', p.network.connection.rtt, 5, 400))}
        ${F.field('Latency پروفایل (ms)', F.number('network.latencyMs', p.network.latencyMs, 10, 300))}
        ${F.field('Jitter (ms)', F.number('network.jitterMs', p.network.jitterMs, 0, 60))}
      </div>`, { icon: 'shield' })}

      ${F.card('سربرگ‌های HTTP خروجی', `<pre class="code small">${H.esc(Object.entries(AGENT.headers(p)).map(([k, v]) => k + ': ' + v).join('\n'))}</pre>`, { icon: 'code' })}`;
  }

  function tabHardware(p) {
    const g = p.hardware.gpu;
    const cat = p.os.platform === 'android' ? GPUS.android : p.os.platform === 'macos' ? GPUS.mac : p.os.platform === 'linux' ? GPUS.linux : GPUS.win;
    return `${F.card('پردازنده و حافظه', `
      <div class="form-grid">
        ${F.field('هسته‌های منطقی', F.number('os.cores', p.os.cores, 1, 64))}
        ${F.field('حافظهٔ دستگاه (GB)', F.number('os.ramGB', p.os.ramGB, 1, 64))}
        ${F.field('hardwareConcurrency', F.number('navigator.hardwareConcurrency', p.navigator.hardwareConcurrency, 1, 64))}
        ${F.field('deviceMemory (سقف API = 8)', `<select data-path="navigator.deviceMemory">${[1, 2, 4, 8].map((v) => `<option ${p.navigator.deviceMemory === v ? 'selected' : ''}>${v}</option>`).join('')}</select>`)}
        ${F.field('معماری', `<select data-path="os.arch">${[['x86', 'x86'], ['x86_64', 'x86_64'], ['arm', 'arm (Apple Silicon)'], ['arm64', 'arm64'], ['aarch64', 'aarch64']].map(([v, l]) => `<option value="${v}" ${p.os.arch === v ? 'selected' : ''}>${l}</option>`).join('')}</select>`)}
        ${F.field('تعداد دوربین', F.number('hardware.cameraCount', p.hardware.cameraCount, 0, 6))}
        ${F.field('تعداد میکروفن', F.number('hardware.microphoneCount', p.hardware.microphoneCount, 0, 4))}
        ${F.field('تعداد بلندگو', F.number('hardware.speakerCount', p.hardware.speakerCount, 0, 8))}
      </div>`, { icon: 'cpu' })}

      ${F.card('کارت گرافیک و WebGL', `
      <div class="form-grid">
        ${F.field('GPU', `<select data-path="hardware.gpu.device">${cat.map((x) => `<option value="${H.esc(x.device)}" ${g.device === x.device ? 'selected' : ''}>${H.esc(x.device)} — ${H.esc(x.webglVendor)}</option>`).join('')}</select>`, 'فقط GPU سازگار با OS فعلی')}
        ${F.field('maxTextureSize', F.number('hardware.maxTex', 16384, 2048, 32768, 1024))}
      </div>
      ${F.kv([
        ['WebGL vendor', `<code>${H.esc(g.webglVendor)}</code>`],
        ['WebGL renderer', `<code class="break">${H.esc(g.renderer)}</code>`],
        ['Unmasked renderer', `<code class="break">${H.esc(g.unmaskedRenderer)}</code>`],
        ['WebGL2', 'فعال'], ['ColorGamut', 'srgb'],
      ])}`, { icon: 'beaker' })}

      ${F.card('افزونه‌های PDF و Plugin', `<div class="chips">${(p.fingerprint.plugins || []).map((x) => `<span class="chip">${H.esc(x.name)}</span>`).join('') || '<span class="muted tiny">خالی — مطابق Firefox/موبایل</span>'}</div>
        <p class="tiny muted" style="margin-top:10px">ترکیب plugin باید با خانوادهٔ مرورگر بخواند: Chrome/Edge پنج PDF viewer داخلی دارند، Firefox صفر و Safari یک WebKit PDF.</p>`, { icon: 'layers' })}`;
  }

  function tabBrowser(p) {
    const champ = `${H.flag(p.geo.country)} ${H.esc(p.geo.country)}`;
    return `${F.card('انتخاب مرورگر', `
      <div class="form-grid">
        ${F.field('خانواده', `<select data-path="browser.family">${[['chrome', 'Chrome'], ['edge', 'Edge'], ['firefox', 'Firefox'], ['safari', 'Safari']].map(([v, l]) => `<option value="${v}" ${p.browser.family === v ? 'selected' : ''}>${l}</option>`).join('')}</select>`, 'تغییر، UA/Hints را بازسازی می‌کند')}
        ${F.field('نسخهٔ Major', F.number('browser.major', p.browser.major, 80, 200))}
        ${F.field('FullVersion', F.text('browser.fullVersion', p.browser.fullVersion, 'spellcheck="false"'))}
        ${F.field('Vendor', F.text('navigator.vendor', p.navigator.vendor))}
      </div>
      <div class="notice info">${H.icon('info', 15)}<div>نسخهٔ کامل باید با همان قطار انتشار کروم هم‌خوان باشد. اگر نسخهٔ Major را تغییر می‌دهید، FullVersion را هم از کاتالوگ معتبر انتخاب کنید یا auto-repair را بزنید.</div></div>`, { icon: 'code' })}

      ${F.card('User-Agent', `<div class="ua-box"><code class="break">${H.esc(p.navigator.userAgent)}</code>
        <button class="icon-btn" data-action="copy-ua" title="کپی">${H.icon('copy', 14)}</button></div>
        ${F.kv([
          ['appVersion', `<code class="break">${H.esc(p.navigator.appVersion)}</code>`],
          ['navigator.platform', `<code>${H.esc(p.navigator.platform)}</code>`],
          ['productSub', `<code>${H.esc(p.navigator.productSub)}</code>`],
          ['webdriver', `<code>false</code>`],
          ['pdfViewerEnabled', `<code>${p.navigator.pdfViewerEnabled}</code>`],
        ])}`, { icon: 'globe' })}

      ${p.clientHints ? F.card('Client Hints (UA-CH)', `
        ${F.kv([
          ['brands', p.clientHints.brands.map((b) => `<span class="chip sm">${H.esc(b.brand)} v${H.esc(b.version)}</span>`).join(' ')],
          ['mobile', `<code>${p.clientHints.mobile}</code>`],
          ['platform', `<code>${H.esc(p.clientHints.platform)}</code>`],
          ['platformVersion', `<code>${H.esc(p.clientHints.platformVersion)}</code>`],
          ['architecture / bitness', `<code>${H.esc(p.clientHints.architecture || '—')} / ${H.esc(p.clientHints.bitness || '—')}</code>`],
          ['model', `<code>${H.esc(p.clientHints.model || '—')}</code>`],
          ['formFactors', `<code>${H.esc((p.clientHints.formFactors || []).join(', '))}</code>`],
        ])}`, { icon: 'layers' }) : F.card('Client Hints', `<div class="notice">${H.icon('info', 15)}<div>این مرورگر (${H.esc(p.browser.name)}) از UA-CH پشتیبانی نمی‌کند؛ null بودن userAgentData درست است.</div></div>`, { icon: 'layers' })}

      ${F.card('افزونه‌های نصب‌شده', `
        <div class="chips">${(p.extensions || []).map((e) => `<span class="chip">${H.esc(e.name)} <em>${H.esc(e.version)}</em></span>`).join('') || '<span class="muted tiny">هیچ افزونه‌ای — سطح تماس طبیعی‌تر برای پروفایل تازه</span>'}</div>
        <div class="row gap8 wrap mt10"><button class="btn small ghost" data-action="ext-add">${H.icon('plus', 13)} افزودن از کاتالوگ</button><button class="btn small ghost" data-action="ext-clear">پاک کردن</button></div>
        <p class="tiny muted" style="margin-top:10px">افزونهٔ نصب‌شده در سایت‌های فینگرپرینت قابل کشف است (web_accessible_resources)؛ لیست نباید با شهر/OS/شخصیت پروفایل تناقض داشته باشد.</p>`, { icon: 'shield' })}`;
  }

  function tabDisplay(p) {
    const d = p.display;
    return `${F.card('نمایشگر', `
      <div class="form-grid">
        ${F.field('CSS Width', F.number('screen.width', p.screen.width, 320, 7680))}
        ${F.field('CSS Height', F.number('screen.height', p.screen.height, 320, 4320))}
        ${F.field('devicePixelRatio', `<select data-path="screen.dpr">${[1, 1.25, 1.5, 1.75, 2, 2.625, 2.75, 2.8125, 3].map((v) => `<option value="${v}" ${Number(p.screen.dpr) === v ? 'selected' : ''}>${v}</option>`).join('')}</select>`)}
        ${F.field('رنگ‌عمق', F.number('display.colorDepth', d.colorDepth, 24, 30))}
      </div>
      ${F.kv([
        ['availWidth × availHeight', `${d.availWidth} × ${d.availHeight}`],
        ['innerWidth × innerHeight', `${d.innerWidth} × ${d.innerHeight}`],
        ['orientation', d.orientation],
        ['screen.width × screen.height', `${p.screen.width} × ${p.screen.height}`],
      ])}`, { icon: 'monitor' })}

      ${F.card('حدود viewport', `
      <div class="form-grid">
        ${F.field('innerWidth', F.number('display.innerWidth', d.innerWidth, 320, 7680))}
        ${F.field('innerHeight', F.number('display.innerHeight', d.innerHeight, 240, 4320))}
        ${F.field('availHeight', F.number('display.availHeight', d.availHeight, 240, 4320))}
        ${F.field('maxTouchPoints', `<select data-path="navigator.maxTouchPoints">${[0, 1, 2, 5, 10].map((v) => `<option ${p.navigator.maxTouchPoints === v ? 'selected' : ''}>${v}</option>`).join('')}</select>`)}
      </div>
      <div class="notice warn">${H.icon('alert', 15)}<div>innerWidth/Height بزرگ‌تر از screen = نشانهٔ headless. تفاوت طبیعی: پنجره‌های دسکتاپ معمولاً 40–130px کوچک‌تر از ارتفاع صفحه‌اند.</div></div>`, { icon: 'settings' })}

      ${F.card('رندر', `
      <div class="form-grid">
        ${F.field('Canvas', `<select data-path="fingerprint.canvas"><option value="noise" ${p.fingerprint.canvas === 'noise' ? 'selected' : ''}>noise — هش پایدار + یکتا</option><option value="off" ${p.fingerprint.canvas === 'off' ? 'selected' : ''}>off (خطرناک: اثرانگشت واقعی)</option><option value="block" ${p.fingerprint.canvas === 'block' ? 'selected' : ''}>block — نشت detectability</option></select>`)}
        ${F.field('Canvas seed', F.number('fingerprint.canvasNoiseSeed', p.fingerprint.canvasNoiseSeed, 100000, 999999))}
        ${F.field('AudioContext', `<select data-path="fingerprint.audio"><option value="noise" ${p.fingerprint.audio === 'noise' ? 'selected' : ''}>noise</option><option value="off" ${p.fingerprint.audio === 'off' ? 'selected' : ''}>off</option></select>`)}
        ${F.field('Audio seed', F.number('fingerprint.audioSeed', p.fingerprint.audioSeed, 100000, 999999))}
        ${F.field('Color scheme', `<select data-path="display.prefersColorScheme">${['light', 'dark'].map((v) => `<option ${p.display.prefersColorScheme === v ? 'selected' : ''}>${v}</option>`).join('')}</select>`)}
        ${F.field('ClientRects noise', F.seg('fingerprint.clientRectsNoise', [[true, 'فعال'], [false, 'خاموش']], !!p.fingerprint.clientRectsNoise))}
      </div>`, { icon: 'beaker' })}

      ${F.card('فونت‌ها', `
        ${F.field('حالت', `<select data-path="fingerprint.fontsMode"><option value="os-default" ${p.fingerprint.fontsMode === 'os-default' ? 'selected' : ''}>پیش‌فرض OS (کاتالوگ)</option><option value="custom" ${p.fingerprint.fontsMode === 'custom' ? 'selected' : ''}>سفارشی (زیرمجموعهٔ کاتالوگ)</option></select>`)}
        <div class="chips mt8">${(p.fingerprint.fontsMode === 'custom' ? p.fingerprint.fontOverride : p.fingerprint.fonts).slice(0, 28).map((f) => `<span class="chip sm">${H.esc(f)}</span>`).join('')}${(p.fingerprint.fonts || []).length > 28 ? `<span class="chip sm ghost">+${p.fingerprint.fonts.length - 28}</span>` : ''}</div>
        <p class="tiny muted" style="margin-top:8px">لیست فونت باید با OS بخواند: مک فونت‌های Apple، اندروید Roboto/Noto، ویندوز Segoe/Calibri. فونت غیربومی یک سیگنال پرسرعت تشخیص است.</p>`, { icon: 'layers' })}`;
  }

  function tabLocale(p) {
    const locs = LOCALES[p.geo.country] || ['en-US'];
    return `${F.card('زبان و منطقه', `
      <div class="form-grid">
        ${F.field('Locale اصلی', `<select data-path="locale.locale">${locs.map((l) => `<option value="${l}" ${p.locale.locale === l ? 'selected' : ''}>${H.esc(LOCALE_META[l][0])} — ${l}</option>`).join('')}</select>`, 'فقط localeهای رایج کشور')}
        ${F.field('Accept-Language', F.text('locale.languagesStr', p.locale.languages.join(','), 'spellcheck="false"'), 'با کاما جدا کنید')}
        ${F.field('جهت', `<select data-path="locale.direction"><option ${p.locale.direction === 'ltr' ? 'selected' : ''}>ltr</option><option ${p.locale.direction === 'rtl' ? 'selected' : ''}>rtl</option></select>`)}
        ${F.field('واحد پول', F.text('locale.currency', p.locale.currency, 'maxlength="4"'))}
        ${F.field('قالب زمان', `<select data-path="locale.timeFormat"><option ${p.locale.timeFormat === '24h' ? 'selected' : ''}>24h</option><option ${p.locale.timeFormat === '12h' ? 'selected' : ''}>12h</option></select>`)}
        ${F.field('نخستین روز هفته', `<select data-path="locale.firstDayOfWeek"><option ${p.locale.firstDayOfWeek === 'Monday' ? 'selected' : ''}>Monday</option><option ${p.locale.firstDayOfWeek === 'Sunday' ? 'selected' : ''}>Sunday</option></select>`)}
      </div>`, { icon: 'clock' })}

      ${F.card('تایم‌زون', `
      <div class="form-grid">
        ${F.field('IANA TimeZone', `<select data-path="geo.tz">${TZ_DB.map((z) => `<option value="${z.id}" ${p.geo.tz === z.id ? 'selected' : ''}>${z.id} · ${z.city} · UTC${z.std >= 0 ? '+' : ''}${(z.std / 60).toFixed(0)}</option>`).join('')}</select>`, 'تغییر = هم‌ترازی شهر با تایم‌زون')}
        ${F.field('آفست (دقیقه)', F.number('geo.tzOffset', p.geo.tzOffset, -720, 840))}
      </div>
      ${F.kv([['tzAbbr', p.geo.tzAbbr], ['tzLabel', p.geo.tzLabel], ['weekStart', String(p.locale.weekStart)], ['dateFormat', p.locale.dateFormat], ['numberFormat', p.locale.numberFormat]])}
      <p class="tiny muted">JS TimeZone و موقعیت IP باید یک خوشهٔ واحد باشند. مثلاً «IP استانبول + TZ تهران + زبان فارسی» = سه سیگنال متناقض در یک درخواست.</p>`, { icon: 'globe' })}`;
  }

  function tabPrivacy(p) {
    const pr = p.privacy;
    return `${F.card('سیگنال‌های حریم خصوصی', `
      <div class="form-grid">
        ${F.field('Do Not Track', F.seg('privacy.doNotTrack', [[false, 'خاموش'], [true, 'DNT=1']], !!pr.doNotTrack))}
        ${F.field('Global Privacy Control', F.seg('privacy.globalPrivacyControl', [[false, 'خاموش'], [true, 'GPC']], !!pr.globalPrivacyControl))}
        ${F.field('حالت سخت‌گیرانه', F.seg('privacy.mode', [['standard', 'استاندارد'], ['strict', 'strict']], pr.mode))}
      </div>
      <p class="tiny muted">توصیه: برای پروفایل‌های حساس DNT/GPC روشن منطقی‌تر است — اما کمتر از ۱۰٪ کاربران این گزینه را فعال می‌کنند و برخی سایت‌ها همین را سیگنال «کاربر حرفه‌ای» می‌گیرند. انتخاب با شماست؛ فقط باید با افزونه‌ها بخواند.</p>`, { icon: 'shield' })}

      ${F.card('حافظه و باکِت', `
      <div class="form-grid">
        ${F.field('Battery spoof', F.seg('fingerprint.spoofBattery', [[true, 'فعال'], [false, 'خاموش']], !!p.fingerprint.spoofBattery))}
        ${F.field('سطح باتری', F.number('fingerprint.battery.level', p.fingerprint.battery.level, 0, 1, 0.01))}
        ${F.field('شارژ', F.seg('fingerprint.battery.charging', [[true, 'در حال شارژ'], [false, 'دشارژ']], !!p.fingerprint.battery.charging))}
        ${F.field('سهم حافظه (MB)', F.number('storage.quotaMB', p.storage.quotaMB, 100, 100000))}
      </div>`, { icon: 'cpu' })}

      ${F.card('چک‌لیست تزریق', `<ul class="checklist-static">
        <li>${H.icon('check', 14)} Canvas/WebGL/Audio seed یکتا و پایدار (همان پروفایل همیشه همان هش)</li>
        <li>${H.icon('check', 14)} WebRTC در حالت پروکسی غیرفعال</li>
        <li>${H.icon('check', 14)} IP محلی LAN خصوصی (10/8، 172.16/12، 192.168/16)</li>
        <li>${H.icon('check', 14)} زمان سیستم هم‌تراز با IP (نه ساعت تهران روی IP آلمان)</li>
        <li>${H.icon('alert', 14)} مواردی که فقط در سطح کرنل/پچ C++ قابل مهارند: TLS/JA3، HTTP2 frame، Canvas در سطح GPU، فونت‌های نصب‌شده، WebGPU — با userscript کامل پوشش داده نمی‌شوند (راهنما → ستون «ریسک»)</li>
      </ul>`, { icon: 'alert' })}`;
  }

  function tabBehavior(p) {
    const b = p.behavior;
    return `${F.card('رفتار انسانی (Anti-Bot)', `
      <div class="form-grid">
        ${F.field('Humanize', F.seg('behavior.humanize', [[true, 'فعال'], [false, 'خاموش']], !!b.humanize))}
        ${F.field('سرعت تایپ (WPM)', F.number('behavior.typingWpm', b.typingWpm, 10, 160))}
        ${F.field('Jitter کلیک (px)', F.number('behavior.clickJitter', b.clickJitter, 0, 20))}
        ${F.field('منحنی ماوس', `<select data-path="behavior.mouseCurve"><option ${b.mouseCurve === 'bezier' ? 'selected' : ''}>bezier</option><option ${b.mouseCurve === 'linear' ? 'selected' : ''}>linear</option></select>`)}
        ${F.field('سرعت اسکرول', `<select data-path="behavior.scrollSpeed">${['slow', 'normal', 'fast'].map((v) => `<option ${b.scrollSpeed === v ? 'selected' : ''}>${v}</option>`).join('')}</select>`)}
        ${F.field('مدت اقامت (دقیقه)', `<div class="row gap4"><input data-path="behavior.dwellMin" type="number" value="${b.dwellMin}"><input data-path="behavior.dwellMax" type="number" value="${b.dwellMax}"></div>`)}
        ${F.field('Gaussian noise', F.seg('behavior.gaussianNoise', [[true, 'فعال'], [false, 'خاموش']], !!b.gaussianNoise))}
        ${F.field('Warm-up (روز)', F.number('behavior.warmupDays', b.warmupDays, 0, 30))}
      </div>
      <p class="tiny muted">حرکت‌های ماوس و تایپ با مدل Bezier + نویز گاوسی شبیه‌سازی می‌شوند. هیچ‌کدام جای رفتار واقعی را نمی‌گیرند: پروفایل جدید باید چند روز فقط مرور و مطالعه کند، سپس ثبت‌نام/فعالیت اصلی.</p>`, { icon: 'user' })}`;
  }

  function tabJson(p) {
    return `<div class="row gap8 between mb10">
        <p class="tiny muted" style="margin:0">پروفایل کامل — قابل ویرایش و Import در نسخهٔ دیگر. تغییرات را با «اعمال» ثبت کنید.</p>
        <div class="row gap6"><button class="btn small ghost" data-action="json-reset">بازگرداندن</button><button class="btn small" data-action="json-apply">اعمال JSON</button></div>
      </div>
      <textarea class="json-editor" id="json-editor" spellcheck="false">${H.esc(JSON.stringify(p, null, 2))}</textarea>`;
  }

  /* ------------------------------------------------------------- field apply */
  function applyField(el) {
    const path = el.dataset.path;
    const draft = UI.S.draft;
    if (!draft || !path) return;
    let val = el.type === 'checkbox' ? el.checked : el.value;
    if (el.type === 'number') val = el.value === '' ? null : +el.value;

    if (path === 'locale.languagesStr') {
      draft.locale.languages = String(val).split(',').map((s) => s.trim()).filter(Boolean);
      draft.navigator.languages = draft.locale.languages;
      draft.navigator.language = draft.locale.languages[0];
      UI.S.dirty = true;
      revalidateDraft();
      return;
    }
    U.setPath(draft, path, val);

    if (path === 'locale.locale') {
      const meta = LOCALE_META[val];
      if (meta) {
        draft.locale.languageCode = meta[1];
        draft.locale.currency = meta[2];
        draft.locale.direction = meta[3];
        draft.locale.hour12 = hour12(val);
        draft.locale.timeFormat = hour12(val) ? '12h' : '24h';
        draft.locale.languages = [val];
        draft.navigator.languages = [val];
        draft.navigator.language = val;
      }
    }
    if (path === 'hardware.gpu.device') {
      const cat = draft.os.platform === 'android' ? GPUS.android : draft.os.platform === 'macos' ? GPUS.mac : draft.os.platform === 'linux' ? GPUS.linux : GPUS.win;
      const g = cat.find((x) => x.device === val);
      if (g) draft.hardware.gpu = { vendor: g.vendor, webglVendor: g.webglVendor, renderer: g.webglRenderer, unmaskedVendor: g.unmaskedVendor, unmaskedRenderer: g.unmaskedRenderer, device: g.device };
    }

    UI.S.dirty = true;
    onStructural(path);
    revalidateDraft();
    UI.render();
  }

  /* cascade rules when a structural path changes */
  function onStructural(path) {
    const draft = UI.S.draft;
    if (!draft || !path) return;
    if (!CASCADE.some((rx) => rx.test(path))) return;
    if (path === 'geo.tz') {
      // tz → pick matching city, then rebuild
      const z = TZ_BY_ID[draft.geo.tz];
      const place = (GEO[draft.geo.country] || []).find((g) => g[3] === draft.geo.tz);
      if (place) draft.geo.city = place[0];
      else { draft.geo.country = z.country; draft.geo.city = (GEO[z.country] || []).find((g) => g[3] === z.id)?.[0] || ''; }
    }
    const fixed = FP.repair(draft);
    Object.keys(fixed).forEach((k) => { UI.S.draft[k] = fixed[k]; });
  }

  function revalidateDraft() {
    if (!UI.S.draft) return;
    UI.S.draft.consistency = FP.validate(UI.S.draft);
  }

  /* ------------------------------------------------------------- extra actions */
  const extra = {
    tab(el) { UI.S.tab = el.dataset.tab; UI.render(); },
    async save() {
      const d = UI.S.draft;
      if (!d) return;
      revalidateDraft();
      await Store.update(U.clone(d));
      UI.S.dirty = false;
      toast('پروفایل ذخیره شد');
      UI.render();
    },
    autofix() {
      const d = UI.S.draft;
      if (!d) return;
      const before = d.consistency ? d.consistency.errors.length : 0;
      const fixed = FP.repair(d);
      Object.keys(UI.S.draft).forEach((k) => delete UI.S.draft[k]);
      Object.assign(UI.S.draft, fixed);
      UI.S.dirty = true;
      const after = fixed.consistency.errors.length;
      toast(before > after ? `${before - after} تناقض اصلاح شد` : 'پروفایل از قبل سازگار بود', after ? 'bad' : 'ok');
      UI.render();
    },
    revalidate() {
      revalidateDraft();
      const d = UI.S.draft;
      const errs = d.consistency.errors.length;
      toast(errs ? `${errs} تناقض پیدا شد` : `سالم — امتیاز ${d.consistency.score}`, errs ? 'bad' : 'ok');
      UI.render();
    },
    async 'copy-ua'() {
      const d = UI.S.draft;
      await U.copy(d.navigator.userAgent);
      toast('UA کپی شد');
    },
    'proxy-from-preset'() {
      const sel = document.getElementById('proxy-preset');
      if (!sel || !UI.S.draft) return;
      const ctry = UI.S.draft.geo.country;
      const cat = (PROXY_CATALOG[ctry] && PROXY_CATALOG[ctry].length)
        ? PROXY_CATALOG[ctry]
        : (GEO[ctry] || []).slice(0, 3).map((g) => FP.demoProxy(makeRng(UI.S.draft.seed + g[0]), ctry, g[0]));
      const pr = cat[+sel.value];
      if (!pr) return;
      UI.S.draft.network.proxy = { host: pr.host, port: pr.port, protocol: 'socks5', country: pr.country, city: pr.city, isp: pr.isp, type: pr.type, asn: pr.asn, username: '', password: '' };
      UI.S.draft.network.mode = 'proxy';
      const fixed = FP.repair(UI.S.draft);
      Object.keys(UI.S.draft).forEach((k) => delete UI.S.draft[k]);
      Object.assign(UI.S.draft, fixed);
      UI.S.dirty = true;
      toast('پروکسی اعمال و زنجیره هم‌تراز شد');
      UI.render();
    },
    'proxy-country'() {
      const d = UI.S.draft;
      let cat = PROXY_CATALOG[d.geo.country];
      if (!cat || !cat.length) cat = [FP.demoProxy(makeRng(d.seed), d.geo.country, d.geo.city)];
      const pr = cat[0];
      d.network.proxy = { host: pr.host, port: pr.port, protocol: 'socks5', country: pr.country, city: pr.city, isp: pr.isp, type: pr.type, asn: pr.asn, username: '', password: '' };
      d.network.mode = 'proxy';
      const fixed = FP.repair(d);
      Object.keys(UI.S.draft).forEach((k) => delete UI.S.draft[k]);
      Object.assign(UI.S.draft, fixed);
      UI.S.dirty = true;
      UI.render();
    },
    'proxy-clear'() {
      const d = UI.S.draft;
      d.network.proxy = null;
      d.network.mode = 'direct';
      revalidateDraft();
      UI.S.dirty = true;
      UI.render();
    },
    'ext-add'() {
      const d = UI.S.draft;
      const used = new Set((d.extensions || []).map((e) => e.id));
      const pool = CHROME_EXTENSIONS.filter((e) => !used.has(e.id));
      if (!pool.length) { toast('همهٔ افزونه‌های کاتالوگ اضافه شده‌اند'); return; }
      const pick = pool[Math.floor(Math.random() * pool.length)];
      d.extensions = [...(d.extensions || []), { ...pick }];
      d.privacy.blockAds = d.extensions.some((e) => /uBlock|AdBlock/.test(e.name));
      revalidateDraft();
      UI.S.dirty = true;
      UI.render();
      toast(`${pick.name} اضافه شد`);
    },
    'ext-clear'() {
      const d = UI.S.draft;
      d.extensions = [];
      d.privacy.blockAds = false;
      revalidateDraft();
      UI.S.dirty = true;
      UI.render();
    },
    'json-reset'() {
      const p = Store.db.profiles.find((x) => x.id === UI.S.id);
      if (!p) return;
      UI.S.draft = U.clone(p);
      UI.S.dirty = false;
      UI.render();
      toast('نسخهٔ ذخیره‌شده بازگردانده شد');
    },
    'json-apply'() {
      const ta = document.getElementById('json-editor');
      if (!ta) return;
      try {
        const parsed = JSON.parse(ta.value);
        if (!parsed.id || !parsed.os) throw new Error('BAD');
        const fixed = FP.repair(U.deepMerge(UI.S.draft, parsed));
        Object.keys(UI.S.draft).forEach((k) => delete UI.S.draft[k]);
        Object.assign(UI.S.draft, fixed);
        UI.S.dirty = true;
        toast('JSON اعمال و اعتبارسنجی شد');
        UI.render();
      } catch (e) {
        toast('JSON نامعتبر است', 'bad');
      }
    },
  };

  /* merge editor-only actions into the shared action table (no extra listeners:
     field changes are handled centrally by UI's delegated 'change' handler) */
  function attach() {
    Object.assign(UI.actions, extra);
    return true;
  }

  return { render, applyField, onStructural, revalidateDraft, attach, TABS };
})();

Editor.attach();
