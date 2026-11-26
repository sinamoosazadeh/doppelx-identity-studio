/* ==========================================================================
   DOPPEL — 07-playground.js
   Compare two profiles side-by-side, batch consistency test (live),
   URL / leak checks and independent test links.
   ========================================================================== */
'use strict';

const Playground = (() => {
  const P = { a: null, b: null, url: '', batch: null, tab: 'compare' };

  function render() {
    const ps = Store.db.profiles;
    if (!P.a && ps[0]) P.a = ps[0].id;
    if (!P.b && ps[1]) P.b = ps[1].id;
    const tabs = [['compare', 'مقایسهٔ دو پروفایل'], ['batch', 'آزمون انسجام دسته‌ای'], ['leaks', 'آزمون لو رفتن']];
    return `<div class="page">
      <header class="page-h">
        <div><h1>${H.icon('beaker', 22)} آزمایشگاه</h1>
        <p>مقایسهٔ سیگنال‌ها بین پروفایل‌ها، آزمون آماری انسجام و چک‌لیست لو رفتن — همه در همین محیط.</p></div>
      </header>
      <div class="ed-tabs">${tabs.map(([k, l]) => `<button class="ed-tab ${P.tab === k ? 'on' : ''}" data-action="pg-tab" data-tab="${k}">${l}</button>`).join('')}</div>
      ${P.tab === 'batch' ? batchView() : P.tab === 'leaks' ? leaksView() : compareView(ps)}
    </div>`;
  }

  /* ------------------------------------------------------------- compare */
  const ROWS = [
    ['هویت', 'geo.countryName', 'کشور', (p) => H.flag(p.geo.country) + ' ' + p.geo.country],
    ['هویت', 'geo.city', 'شهر', (p) => p.geo.city],
    ['شبکه', 'geo.tz', 'تایم‌زون', (p) => p.geo.tz],
    ['شبکه', 'geo.tzLabel', 'آفست', (p) => p.geo.tzLabel + ' ' + p.geo.tzAbbr],
    ['شبکه', 'network.proxy', 'پروکسی', (p) => p.network.proxy ? `${p.network.proxy.host}:${p.network.proxy.port}` : 'direct'],
    ['شبکه', 'network.isp', 'ISP / ASN', (p) => p.network.proxy ? `${p.network.proxy.isp} · AS${p.network.proxy.asn}` : '—'],
    ['شبکه', 'network.localIp', 'LAN IP', (p) => p.network.localIp],
    ['شبکه', 'network.webrtc', 'WebRTC', (p) => p.network.webrtc],
    ['شبکه', 'network.connection', 'اتصال', (p) => `${p.network.connection.type} · ${p.network.connection.effectiveType}`],
    ['زبان', 'locale.locale', 'Locale', (p) => p.locale.locale],
    ['زبان', 'locale.languages', 'زبان‌ها', (p) => p.locale.languages.join(', ')],
    ['زبان', 'locale.currency', 'ارز', (p) => p.locale.currency],
    ['زبان', 'locale.timeFormat', 'قالب زمان', (p) => p.locale.timeFormat + ' · ' + p.locale.firstDayOfWeek],
    ['OS', 'os.osName', 'سیستم‌عامل', (p) => p.os.osName + ' ' + p.os.osVersion],
    ['OS', 'os.arch', 'معماری', (p) => p.os.arch],
    ['مرورگر', 'browser', 'مرورگر', (p) => p.browser.name + ' ' + p.browser.major],
    ['مرورگر', 'navigator.userAgent', 'UA', (p) => p.navigator.userAgent],
    ['مرورگر', 'navigator.platform', 'platform', (p) => p.navigator.platform],
    ['مرورگر', 'navigator.vendor', 'vendor', (p) => p.navigator.vendor || '(خالی)'],
    ['مرورگر', 'clientHints', 'Client Hints', (p) => p.clientHints ? `${p.clientHints.platform} ${p.clientHints.platformVersion} · arch ${p.clientHints.architecture || '—'}` : 'null'],
    ['سخت‌افزار', 'navigator.hardwareConcurrency', 'هسته‌ها', (p) => p.navigator.hardwareConcurrency],
    ['سخت‌افزار', 'navigator.deviceMemory', 'deviceMemory', (p) => p.navigator.deviceMemory + ' GB'],
    ['سخت‌افزار', 'hardware.gpu.device', 'GPU', (p) => p.hardware.gpu.device],
    ['سخت‌افزار', 'navigator.maxTouchPoints', 'maxTouchPoints', (p) => p.navigator.maxTouchPoints],
    ['صفحه', 'screen', 'رزولوشن', (p) => `${p.screen.width}×${p.screen.height} @${p.screen.dpr}x`],
    ['صفحه', 'display.inner', 'viewport', (p) => `${p.display.innerWidth}×${p.display.innerHeight}`],
    ['صفحه', 'display.colorScheme', 'تم', (p) => p.display.prefersColorScheme],
    ['اثرانگشت', 'fingerprint.canvasNoiseSeed', 'Canvas seed', (p) => p.fingerprint.canvasNoiseSeed],
    ['اثرانگشت', 'fingerprint.audioSeed', 'Audio seed', (p) => p.fingerprint.audioSeed],
    ['اثرانگشت', 'fingerprint.fonts', 'تعداد فونت', (p) => (p.fingerprint.fonts || []).length],
    ['اثرانگشت', 'fingerprint.plugins', 'Plugin', (p) => (p.fingerprint.plugins || []).length + ' مورد'],
    ['حریم خصوصی', 'privacy.doNotTrack', 'DNT', (p) => p.privacy.doNotTrack ? 'روشن' : 'خاموش'],
    ['حریم خصوصی', 'extensions', 'افزونه', (p) => (p.extensions || []).map((e) => e.name).join(', ') || '—'],
    ['امتیاز', 'consistency.score', 'Consistency', (p) => `${p.consistency.score}/100 (${p.consistency.grade})`],
    ['هش', 'hash', 'هش هویت', (p) => AGENT.fingerprintHash(p)],
  ];

  function compareView(ps) {
    if (ps.length < 2) return F.empty('حداقل دو پروفایل لازم است', 'با دو پروفایل می‌توانید قطرات همبستگی را پیدا کنید: هر ردیفی که مشترک است، یک رشتهٔ اتصال بین دو هویت است.', '<button class="btn primary" data-action="gen-open">ساخت پروفایل</button>');
    const a = ps.find((x) => x.id === P.a) || ps[0];
    const b = ps.find((x) => x.id === P.b) || ps[1];
    const opt = (sel) => ps.map((p) => `<option value="${p.id}" ${p.id === sel.id ? 'selected' : ''}>${H.esc(p.name)}</option>`).join('');
    const rows = ROWS.map(([group, key, label, fn]) => {
      const va = String(fn(a)), vb = String(fn(b));
      const same = va === vb;
      return `<tr class="${same ? 'same' : ''}">
        <td class="grp">${H.esc(group)}</td>
        <td class="lbl">${H.esc(label)}</td>
        <td class="val ltr"><span>${H.esc(va.length > 64 ? va.slice(0, 62) + '…' : va)}</span></td>
        <td class="val ltr"><span>${H.esc(vb.length > 64 ? vb.slice(0, 62) + '…' : vb)}</span></td>
        <td class="flag">${same ? H.pill('مشترک', 'warn') : H.pill('متفاوت', 'ok')}</td>
      </tr>`;
    }).join('');
    const sameCount = ROWS.filter((r) => String(r[3](a)) === String(r[3](b))).length;
    const risk = sameCount > ROWS.length * 0.55 ? 'بالا' : sameCount > ROWS.length * 0.3 ? 'متوسط' : 'کم';
    return `
      <div class="compare-head">
        <div class="cmp-pick"><label>پروفایل A</label><select id="cmp-a">${opt(a)}</select><span class="cmp-sub">${H.flag(a.geo.country)} ${H.esc(a.geo.city)} · ${H.esc(a.browser.name)} · ${H.esc(H.deviceLabel(a))}</span></div>
        <div class="cmp-vs">${H.icon('shuffle', 18)}</div>
        <div class="cmp-pick"><label>پروفایل B</label><select id="cmp-b">${opt(b)}</select><span class="cmp-sub">${H.flag(b.geo.country)} ${H.esc(b.geo.city)} · ${H.esc(b.browser.name)} · ${H.esc(H.deviceLabel(b))}</span></div>
      </div>
      <div class="notice ${risk === 'بالا' ? 'warn' : 'info'}">${H.icon(risk === 'بالا' ? 'alert' : 'info', 15)}
        <div><b>${sameCount} از ${ROWS.length} سیگنال مشترک است — ریسک همبستگی: ${risk}.</b>
        سیگنال‌های «مشترک» لزوماً بد نیستند (مثلاً DNT خاموش برای همه طبیعی است)، اما هرچه دو پروفایل در سخت‌افزار، فونت، canvas seed و رزولوشن شریک باشند، احتمال اینکه تحلیل‌گر آن‌ها را یکی ببیند بیشتر می‌شود.</div></div>
      <div class="tbl-wrap"><table class="cmp">
        <thead><tr><th>گروه</th><th>سیگنال</th><th>A</th><th>B</th><th>—</th></tr></thead>
        <tbody>${rows}</tbody>
      </table></div>`;
  }

  /* ---------------------------------------------------------------- batch */
  function batchView() {
    const r = P.batch;
    return `<div class="grid2">
      ${F.card('آزمون آماری انسجام', `
        <p class="lead-sm">این آزمون ۲۰۰ پروفایل رندوم را با موتور تولید می‌سازد و بلافاصله اعتبارسنجی می‌کند — بدون هیچ ورودی دستی. اگر قواعد زنجیره‌ای درست پیاده شده باشند، نرخ خطای بحرانی باید صفر باشد.</p>
        <button class="btn primary" data-action="pg-run-batch">${H.icon('play', 14)} اجرای ۲۰۰ تست</button>
        ${r ? `
        <div class="batch-stats">
          <div class="bs"><span>پروفایل تست‌شده</span><b>${r.n}</b></div>
          <div class="bs"><span>بدون خطای بحرانی</span><b class="${r.criticalFree === r.n ? 'ok' : 'bad'}">${r.criticalFree}</b></div>
          <div class="bs"><span>میانگین امتیاز</span><b>${r.avg}</b></div>
          <div class="bs"><span>درجهٔ A</span><b>${r.gradeA}</b></div>
          <div class="bs"><span>پروفایل موبایل</span><b>${r.mobile}</b></div>
          <div class="bs"><span>پروفایل دسکتاپ</span><b>${r.desktop}</b></div>
          <div class="bs"><span>بیشترین خطای دیده‌شده</span><b class="${r.maxErr ? 'bad' : 'ok'}">${r.maxErr}</b></div>
          <div class="bs"><span>زمان اجرا</span><b>${r.ms}ms</b></div>
        </div>
        <div class="batch-detail">${Object.entries(r.failIds).map(([k, v]) => `<div class="bd-row">${H.sevIcon('fail')}<span>${H.esc(K_LABEL[k] || k)}</span><b>${v}</b></div>`).join('') || '<div class="notice ok-notice">هیچ خطای قاعده‌ای در ۲۰۰ نمونه پیدا نشد ✓</div>'}</div>` : ''}`, { icon: 'beaker' })}
      ${F.card('توزیع پلتفرم در آزمون', r ? `<div class="dist">
        ${Object.entries(r.dist).map(([k, v]) => `<div class="dist-row"><span>${H.esc(k)}</span><div class="bar"><i style="width:${Math.round((v / r.n) * 100)}%"></i></div><b>${v}</b></div>`).join('')}
      </div>
      <div class="dist">
        ${Object.entries(r.tzDist).map(([k, v]) => `<div class="dist-row"><span class="ltr">${H.esc(k)}</span><div class="bar"><i style="width:${Math.round((v / r.n) * 100)}%"></i></div><b>${v}</b></div>`).join('')}
      </div>` : '<p class="muted">پس از اجرا، توزیع سیستم‌عامل و تایم‌زون‌ها اینجا نمایش داده می‌شود — برای تشخیص سوگیری موتور تولید.</p>', { icon: 'layers' })}
      ${F.card('قواعدی که در هر نمونه آزموده می‌شوند', `<ul class="rules">
        <li>تایم‌زون ⇄ کشور IP ⇄ شهر</li>
        <li>زبان ⇄ کشور (Allow-list هر کشور)</li>
        <li>UA ⇄ نسخهٔ مرورگر ⇄ Client Hints</li>
        <li>UA ⇄ OS ⇄ platform ⇄ معماری</li>
        <li>Safari فقط روی macOS/iOS</li>
        <li>GPU ⇄ طبقهٔ دستگاه (موبایل/دسکتاپ)</li>
        <li>رزولوشن ⇄ DPR ⇄ OS</li>
        <li>maxTouchPoints ⇄ موبایل/دسکتاپ</li>
        <li>hardwareConcurrency/deviceMemory ⇄ مشخصات</li>
        <li>WebRTC ⇄ پروکسی (بدون نشتی)</li>
        <li>plugin/extensions ⇄ مرورگر و پلتفرم</li>
        <li>Currency ⇄ Locale ⇄ کشور</li>
      </ul>`, { icon: 'shield' })}
    </div>`;
  }

  const K_LABEL = {
    tz_invalid: 'تایم‌زون نامعتبر', tz_country: 'تناقض تایم‌زون/کشور', city_tz: 'تناقض شهر/تایم‌زون', tz_offset: 'آفست DST',
    locale_tz: 'تناقض locale/تایم‌زون', proxy_country: 'تناقض پروکسی/لوکیشن', lang_country: 'تناقض زبان/کشور',
    currency: 'تناقض ارز', safari_os: 'Safari روی OS نادرست', browser_platform: 'مرورگر ناموجود در OS',
    ua_version: 'تناقض UA/نسخه', ua_android: 'UA بدون Android', ua_model: 'مدل در UA نیست', ua_windows: 'UA ویندوز نادرست',
    ua_mac: 'UA مک نادرست', nav_platform: 'platform نادرست', ch_platform: 'تناقض Client Hints/OS', ch_winver: 'نسخهٔ ویندوز در CH',
    ch_model: 'مدل در CH', ch_mobile: 'پرچم mobile', ch_forbidden: 'CH روی مرورگر ناسازگار', ch_missing: 'CH غایب',
    screen_mismatch: 'تناقض screen.width', dpr: 'تناقض DPR', touch_mobile: 'لمس موبایل', gpu_android: 'GPU دسکتاپی روی موبایل',
    gpu_win: 'GPU موبایلی روی ویندوز', gpu_mac: 'GPU ناسازگار مک', cores: 'تناقض هسته‌ها', plugins_ff: 'plugin فایرفاکس',
    ext_mobile: 'افزونه روی موبایل', webrtc_leak: 'نشتی WebRTC', dnt: 'تناقض DNT', adblock: 'تناقض ادبلاک',
    memory: 'حافظه', screen_rare: 'رزولوشن کمیاب', inner_gt_screen: 'inner > screen', fonts_android: 'فونت اندروید',
  };

  function runBatch() {
    const t0 = performance.now();
    const n = 200;
    const failIds = {};
    const dist = {}, tzDist = {};
    let criticalFree = 0, sum = 0, gradeA = 0, mobile = 0, desktop = 0, maxErr = 0;
    for (let i = 0; i < n; i++) {
      const p = FP.generate({});
      const v = p.consistency;
      if (!v.errors.length) criticalFree++;
      else maxErr = Math.max(maxErr, v.errors.length);
      v.errors.forEach((e) => { failIds[e.id] = (failIds[e.id] || 0) + 1; });
      sum += v.score;
      if (v.grade === 'A') gradeA++;
      if (p.os.platform === 'android' || p.os.platform === 'ios') mobile++; else desktop++;
      const k = p.os.platform;
      dist[k] = (dist[k] || 0) + 1;
      // count timezone country-continent pairs only
      const zone = TZ_BY_ID[p.geo.tz];
      tzDist[zone ? zone.id : p.geo.tz] = (tzDist[zone ? zone.id : p.geo.tz] || 0) + 1;
    }
    // top 10 timezones only
    const topTz = Object.entries(tzDist).sort((a, b) => b[1] - a[1]).slice(0, 8);
    P.batch = { n, criticalFree, avg: Math.round(sum / n), gradeA, mobile, desktop, ms: Math.round(performance.now() - t0), failIds, dist, tzDist: Object.fromEntries(topTz), maxErr };
    UI.render();
    toast(P.batch.criticalFree === n ? `۲۰۰/۲۰۰ پروفایل بدون تناقض — میانگین ${P.batch.avg}` : 'برخی قواعد شکستند — جزئیات را ببینید', P.batch.criticalFree === n ? 'ok' : 'bad');
  }

  /* ---------------------------------------------------------------- leaks */
  function leaksView() {
    const p = Store.db.profiles.find((x) => x.id === P.a) || Store.db.profiles[0];
    const res = p ? AGENT.analyze(p) : null;
    return `<div class="grid2">
      ${F.card('پروفایل هدف', p ? `
        <select id="cmp-a" class="mb10">${Store.db.profiles.map((x) => `<option value="${x.id}" ${x.id === p.id ? 'selected' : ''}>${H.esc(x.name)}</option>`).join('')}</select>
        <div class="checklist">${res.checks.map((c) => `<div class="checkrow">${H.sevIcon(c.sev)}<span class="ck-label">${H.esc(c.label)}</span><span class="ck-detail ltr">${H.esc(c.detail)}</span></div>`).join('')}</div>
        <div class="row gap8 mt12"><button class="btn small" data-action="export" data-id="${p.id}">${H.icon('download', 14)} خروجی اسکریپت</button><button class="btn small ghost" data-action="verify-page" data-id="${p.id}">${H.icon('eye', 14)} صفحهٔ راستی‌آزمایی</button></div>
      ` : '<p class="muted">پروفایلی وجود ندارد.</p>', { icon: 'shield' })}
      ${F.card('آزمون لو رفتن بیرونی', `
        <p class="lead-sm">این آزمون‌ها را بعد از اجرای پروفایل (userscript یا runner) انجام دهید. هر لینک یک وجه مستقل از هویت را بررسی می‌کند — از IP و DNS تا TLS و WebGL. اگر همه با یک خروجی هم‌خوان بودند، زنجیره سالم است.</p>
        <div class="linklist">
          ${[
            ['https://browserleaks.com/ip', 'IP، WebRTC و DNS leak', 'اولین تست بعد از اتصال پروکسی'],
            ['https://browserleaks.com/canvas', 'Canvas fingerprint', 'هش باید پایدار و متفاوت از دستگاه واقعی باشد'],
            ['https://browserleaks.com/webgl', 'WebGL / GPU', 'renderer باید با OS و کاتالوگ هم‌خوان باشد'],
            ['https://browserleaks.com/fonts', 'فونت‌های نصب‌شده', 'لیست باید با OS بخواند'],
            ['https://abrahamjuliot.github.io/creepjs/', 'CreepJS — لایه‌های عمیق', 'تناقض‌سنج مستقل؛ نمرهٔ trust را ببینید'],
            ['https://tls.peet.ws/', 'TLS / JA3 / HTTP2', 'اثرانگشت TLS مرورگر واقعی'],
            ['https://fingerprint.com/products/fingerprintjs/', 'FingerprintJS demo', 'visitorId دو پروفایل باید متفاوت باشد'],
            ['https://whoer.net/', 'Whoer — شبکه و منطقه', 'تایم‌زون/زبان/IP در یک صفحه'],
            ['https://ipleak.net/', 'DNS + IPv6 leak', 'مهم برای پروکسی SOCKS'],
            ['https://microsoft.com', 'تجربهٔ صفحه واقعی', 'UI/فونت/زبان باید طبیعی دیده شود'],
          ].map(([u, t, d]) => `<a class="linkrow" href="${u}" target="_blank" rel="noopener noreferrer">
            ${H.icon('globe', 16)}<div><b>${H.esc(t)}</b><span>${H.esc(d)}</span></div><code class="ltr">${H.esc(u.replace('https://', ''))}</code></a>`).join('')}
        </div>`, { icon: 'eye' })}
      ${F.card('پروتکل اجرای امن', `<ol class="steps">
        <li><b>خروجی بگیرید</b> — userscript یا runner پروفایل را از تب خروجی دانلود کنید.</li>
        <li><b>مرورگر اختصاصی</b> — یک پروفایل/کاربر مستقل مرورگر (یا کاربر جدید سیستم) برای هر هویت؛ هرگز کوکی بین دو پروفایل شریک نشود.</li>
        <li><b>اعتبار IP</b> — با استاتیک residential همان شهر کار کنید؛ پروکسی مشترک datacenter با صدها کاربر = شناسایی فوری.</li>
        <li><b>راستی‌آزمایی</b> — صفحهٔ Verify آفلاین + ۲ سایت مستقل (CreepJS، browserleaks) قبل از هر فعالیت.</li>
        <li><b>گرم‌کردن</b> — ۳ تا ۷ روز اول فقط مرور؛ بعد ثبت‌نام؛ بعد فعالیت. جهش ناگهانی رفتار = پرچم قرمز.</li>
        <li><b>جداسازی کیف پول/کارت</b> — پرداخت با کارت مشترک، همهٔ کار را خنثی می‌کند؛ این خارج از محدودهٔ مرورگر است.</li>
      </ol>`, { icon: 'lock' })}
    </div>`;
  }

  /* actions */
  Object.assign(UI.actions, {
    'pg-tab'(el) { P.tab = el.dataset.tab; UI.render(); },
    'pg-run-batch'() { runBatch(); },
  });

  document.addEventListener('change', (e) => {
    if (e.target.id === 'cmp-a') { P.a = e.target.value; UI.render(); }
    if (e.target.id === 'cmp-b') { P.b = e.target.value; UI.render(); }
  });

  return { render, P, runBatch };
})();
