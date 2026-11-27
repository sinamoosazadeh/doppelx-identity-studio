/* ==========================================================================
   DOPPEL — 08-views.js
   Guide (coherence playbook + coverage matrix) and Settings (data,
   import/export, storage, reset).
   ========================================================================== */
'use strict';

const Guide = (() => {
  const MATRIX = [
    /* signal, group, coverage, risk, note */
    ['User-Agent', 'مرورگر', 'کامل', 'متوسط', 'در Chromium UA به‌شدت کاهش یافته؛ ارزش تشخیصی به Client Hints منتقل شده.'],
    ['Sec-CH-UA / full-version-list', 'مرورگر', 'کامل', 'بالا', 'تناقض UA با hints در همان اولین درخواست لو می‌رود.'],
    ['navigator.platform / vendor / appVersion', 'مرورگر', 'کامل', 'متوسط', 'باید از UA استخراج شوند، نه دستی.'],
    ['محدودهٔ نسخه‌ها', 'مرورگر', 'کامل', 'بالا', 'نسخهٔ خیلی قدیمی = ناهنجاری آماری؛ نسخهٔ آینده = جعلی.'],
    ['WebGL vendor/renderer', 'سخت‌افزار', 'کامل (JS)', 'بالا', 'باید با OS/دستگاه هم‌خوان باشد. GPU واقعی در سطح GPU process قابل خواندن است.'],
    ['Canvas fingerprint', 'سخت‌افزار', 'noise پایدار', 'بالا', 'noise باید deterministic باشد؛ نویز تصادفی هر بار = پرچم.'],
    ['AudioContext', 'سخت‌افزار', 'noise پایدار', 'بالا', 'همان قاعدهٔ canvas.'],
    ['ClientRects / text metrics', 'سخت‌افزار', 'اختیاری', 'متوسط', 'نویز بسیار کوچک؛ بیش از حد = برجستگی.'],
    ['فونت‌های نصب‌شده', 'سخت‌افزار', 'کاتالوگ OS', 'بالا', 'فونت‌های بومی‌سازی‌شده (مثل Vazir روی ویندوز آلمانی) فوراً لو می‌دهد.'],
    ['screen / DPR / viewport', 'صفحه', 'کامل', 'بالا', 'ترکیب غیرمعمول width×height@dpr روی موبایل = headless.'],
    ['hardwareConcurrency / deviceMemory', 'سخت‌افزار', 'کامل', 'متوسط', 'deviceMemory سقف ۸ دارد و باید با RAM منطقی باشد.'],
    ['maxTouchPoints', 'سخت‌افزار', 'کامل', 'وسط', 'دسکتاپ صفر؛ موبایل ۵.'],
    ['Timezone (JS)', 'زمان', 'کامل', 'بحرانی', 'تایم‌زون ≠ کشور IP = اولین تناقض؛ با auto-fix هم‌تراز است.'],
    ['Accept-Language / Intl', 'زبان', 'کامل', 'بالا', 'زبان باید در Allow-list منطقه باشد؛ فارسی روی IP آلمان خیلی خاص است.'],
    ['قالب تاریخ/عدد/ارز', 'زبان', 'کامل', 'متوسط', 'Intl و currency با locale باید یک خوشه باشند.'],
    ['WebRTC (STUN leak)', 'شبکه', 'کامل', 'بحرانی', 'در حالت پروکسی باید غیرفعال باشد؛ نشتی UDP = IP واقعی.'],
    ['DNS leak', 'شبکه', 'وابسته به پروکسی', 'بالا', 'SOCKS5 با DNS از راه دور؛ پروکسی دیتاسنتر خودش لو می‌رود.'],
    ['IPv6', 'شبکه', 'کامل (با پروکسی v6)', 'بالا', 'اگر پروکسی v6 ندارد ولی سایت v6 را می‌بیند، آی‌پی واقعی نشتی کرده.'],
    ['ASN / نوع اتصال', 'شبکه', 'خروجی پروکسی', 'بالا', 'residential/mobile در برابر datacenter.'],
    ['IP ⇄ Geolocation API', 'شبکه', 'کامل', 'بالا', 'مختصات باید در همان شهر IP با دقت باورپذیر باشد.'],
    ['TLS / JA3-JA4 / HTTP2', 'شبکه', 'نیازمند پچ بومی', 'بالا', 'با userscript قابل تغییر نیست؛ مرورگر واقعی با پروفایل بومی‌شده لازم است.'],
    ['plugins array', 'مرورگر', 'کامل', 'متوسط', 'Firefox خالی؛ Chrome پنج PDF viewer.'],
    ['افزونه‌های کروم', 'مرورگر', 'کاتالوگ', 'متوسط', 'web_accessible_resources قابل کشف است؛ لیست باید «انسانی» باشد.'],
    ['Battery API', 'سخت‌افزار', 'کامل', 'کم', 'در موبایل باورپذیر؛ دسکتاپ معمولاً ندارد.'],
    ['Do Not Track / GPC', 'حریم خصوصی', 'کامل', 'متوسط', 'ترکیب نادر بین ۱۰٪ کاربران = سیگنال.'],
    ['connection (NetworkInformation)', 'شبکه', 'کامل', 'کم', 'rtt/downlink باید از نوع اتصال تبعیت کند.'],
    ['storage quota', 'سخت‌افزار', 'کامل', 'کم', 'مقدار غیرمعمول = noise.'],
    ['WebGPU', 'سخت‌افزار', 'محدود', 'متوسط', 'در حال رشد؛ باید هم‌خوان با GPU باشد.'],
    ['Media Devices', 'سخت‌افزار', 'کامل', 'متوسط', 'تعداد دوربین/میکروفن باید با دستگاه هم‌خوان باشد.'],
    ['رفتار (ماوس/تایپ/اسکرول)', 'رفتار', 'مدل گاوسی', 'بحرانی', 'تشخیص bot رفتاری است، نه چیز دیگر؛ humanize + warm-up.'],
    ['کوکی/ذخیره‌سازی', 'حریم خصوصی', 'کامل', 'بحرانی', 'جدایی کامل پروایدرها؛ هرگز دو پروفایل با یک حساب/کوکی.'],
    ['پرداخت / KYC', 'خارج از مرورگر', 'خارج از محدوده', 'بحرانی', 'این لایه با هیچ ابزار مرورگری پوشش داده نمی‌شود.'],
  ];
  const toneFor = (risk) => (risk === 'بحرانی' ? 'bad' : risk === 'بالا' ? 'warn' : 'ok');

  function render() {
    return `<div class="page">
      <header class="page-h">
        <div><h1>${H.icon('book', 22)} راهنمای یکپارچگی</h1>
        <p>قواعدی که این استودیو بر اساس آن‌ها پروفایل می‌سازد، و مرزهای واقعی هر لایه در برابر تشخیص.</p></div>
      </header>

      ${F.card('۱۰ قاعدهٔ طلایی', `<div class="golden">
        <div class="g">${H.icon('globe', 16)}<div><b>زمان = مکان</b><span>IP، تایم‌زون ساعت سیستم، زبان و ارز باید یک خوشهٔ بسته بسازند.</span></div></div>
        <div class="g">${H.icon('cpu', 16)}<div><b>سخت‌افزار = سیستم‌عامل</b><span>GPU، فونت، DPR و رزولوشن از یک دستگاه واحد می‌آیند — نه چهار دستگاه.</span></div></div>
        <div class="g">${H.icon('code', 16)}<div><b>UA = Client Hints</b><span>هر دو از یک قطار انتشار؛ نسخهٔ UA و fullVersionList یکی.</span></div></div>
        <div class="g">${H.icon('shield', 16)}<div><b>WebRTC بدون نشتی</b><span>در حالت پروکسی، ICE باید relay یا غیرفعال باشد.</span></div></div>
        <div class="g">${H.icon('fingerprint', 16)}<div><b>نویز پایدار، نه تصادفی</b><span>canvas/audio seed ثابت؛ هر بار اجرا همان هش.</span></div></div>
        <div class="g">${H.icon('alert', 16)}<div><b>هیچ سیگنال یتیم نیست</b><span>هر مقدار باید حداقل با یک مقدار دیگر قفل باشد؛ auto-repair این کار را می‌کند.</span></div></div>
        <div class="g">${H.icon('user', 16)}<div><b>رفتار > اثرانگشت</b><span>bot خوب هم با کلیک‌های خطی و تایپ یکنواخت لو می‌رود.</span></div></div>
        <div class="g">${H.icon('lock', 16)}<div><b>یک پروفایل = یک هویت</b><span>کوکی، حساب، کارت و ایمیل نباید بین پروفایل‌ها مشترک باشند.</span></div></div>
        <div class="g">${H.icon('book', 16)}<div><b>گرم‌کردن</b><span>پروفایل تازه نباید روز اول وارد عمل سنگین شود.</span></div></div>
        <div class="g">${H.icon('eye', 16)}<div><b>راستی‌آزمایی مستقل</b><span>هیچ ادعایی بدون تست با ابزار مستقل قبول نیست.</span></div></div>
      </div>`, { icon: 'book' })}

      ${F.card('ماتریس پوشش و ریسک سیگنال‌ها', `
        <div class="tbl-wrap"><table class="matrix">
          <thead><tr><th>سیگنال</th><th>دسته</th><th>پوشش DOPPEL</th><th>ریسک</th><th>توضیح</th></tr></thead>
          <tbody>${MATRIX.map(([sig, grp, cov, risk, note]) => `<tr>
            <td><b>${H.esc(sig)}</b></td><td>${H.esc(grp)}</td>
            <td><span class="pill ghost">${H.esc(cov)}</span></td>
            <td><span class="pill ${toneFor(risk)}">${H.esc(risk)}</span></td>
            <td class="note">${H.esc(note)}</td>
          </tr>`).join('')}</tbody>
        </table></div>
        <div class="notice warn mt12">${H.icon('alert', 15)}<div><b>محدودهٔ صداقت:</b> این استودیو یک «هستهٔ هویت منسجم» می‌سازد و لایهٔ JS را کامل، و سرویس‌های واقعی مرورگر را با خروجی بومیِ runner (CDP/usrscript + پروکسی) هم‌تراز می‌کند. اما اثرانگشت TLS/HTTP2 و امضاهای سطح GPU/Binary فقط با بیلد بومی‌شدهٔ مرورگر (همان کاری که GoLogin/Multilogin انجام می‌دهند) کامل می‌شود؛ هیچ userscript‌ای نمی‌تواند آن‌ها را جعل کند. همچنین این ابزار تشخیص هویت را برای access غیرمجاز به سرویس‌ها ممکن نمی‌سازد؛ مسئولیت کاربرد با شماست.</div></div>`, { icon: 'shield' })}

      ${F.card('مسیرهای واقعی اجرا', `
        <div class="pathgrid">
          <div class="pathcard">
            <div class="ph">${H.icon('code', 16)}<b>مسیر A — userscript</b><span>سریع‌ترین، کمترین عمق</span></div>
            <ul>
              <li>در تب «خروجی» اسکریپت را دانلود و در Tampermonkey/Violentmonkey نصب کنید.</li>
              <li>پروکسی را در مرورگر یا سیستم عامل با همان شهر فعال کنید.</li>
              <li>UA/Hints را در خود مرورگر (devtools یا پروفایل اختصاصی) هم ست کنید.</li>
              <li>عمق پوشش: JS surface — TLS/GPU binary بدون تغییر می‌ماند.</li>
            </ul>
          </div>
          <div class="pathcard">
            <div class="ph">${H.icon('play', 16)}<b>مسیر B — Puppeteer/Playwright runner</b><span>کنترل کامل CDP</span></div>
            <ul>
              <li>runner تولیدشده را با puppeteer-core اجرا کنید (مسیر Chrome خودتان).</li>
              <li>Timezone/Locale/Geolocation/DeviceMetrics از CDP اعمال می‌شود.</li>
              <li>پروکسی SOCKS5 با افزونهٔ proxy-auth (خروجی جدا) احراز هویت می‌شود.</li>
              <li>عمق پوشش: همهٔ لایهٔ JS + شبکه؛ TLS هنوز امضای Chrome واقعی دارد (که با پروکسی residential طبیعی است).</li>
            </ul>
          </div>
          <div class="pathcard">
            <div class="ph">${H.icon('lock', 16)}<b>مسیر C — cloud/VM + browser build</b><span>بالاترین سطح جداسازی</span></div>
            <ul>
              <li>هر پروفایل روی VM/کانتینر مستقل با IP استاتیک همان منطقه.</li>
              <li>اگر جداسازی کامل TLS/GPU لازم است، از معماری پچ بومی مرورگر الگو بگیرید (منبع: پروژه‌های anti-detect).</li>
              <li>هرگز دو هویت روی یک host/کاربر ویندوز.</li>
            </ul>
          </div>
        </div>`, { icon: 'layers' })}

      ${F.card('اساس علمی — چرا هم‌خوانی مهم‌تر از تعداد سیگنال است', `
        <p class="prose">مرورگرها برای «کاهش اثرانگشت» تعداد سیگنال‌های مطمئن را کم کرده‌اند (UA reduction در کروم، محدودشدن فونت‌ها، frozen user-agent). نتیجه: سرویس‌های تشخیص امروز روی <b>هم‌خوانی بین سیگنال‌ها</b> و <b>احتمال آماری</b> کار می‌کنند. یک پروفایل با ۵۰ فیلد «تصادفی» نمرهٔ پایین می‌گیرد؛ پروفایلی با ۳۰ فیلد «قفل‌شده به هم» با دستگاه واقعی قابل تفکیک نیست. به همین دلیل این ابزار ابتدا کهن‌الگوی دستگاه را می‌سازد و بعد فیلدها را از آن مشتق می‌کند — دقیقاً برعکس ابزارهایی که فیلد به فیلد رندم می‌کنند.</p>
        <p class="prose">مطالعات میدانی (AmIUnique، Panopticlick، CreepJS) نشان می‌دهند ترکیب رزولوشن + فونت + canvas + تایم‌زون در ده‌ها بیت آنتروپی، شناسه‌ای پایدارتر از کوکی می‌سازد. بنابراین «نویز پایدار» (برای شکنندگی هش) و «هم‌خوانی مطلق» (برای باورپذیری) دو لبهٔ یک شمشیرند: canvas/audio را می‌شکنیم، اما بقیهٔ فیلدها را واقعی نگه می‌داریم.</p>`, { icon: 'beaker' })}
    </div>`;
  }
  return { render };
})();

const Install = (() => {
  function render() {
    return `<div class="page">
      <header class="page-h"><div><h1>${H.icon('layers', 22)} راه‌اندازی اجرای واقعی</h1>
      <p>این استودیو پروفایل را «می‌سازد و اعتبارسنجی می‌کند». برای اینکه پروفایل روی همهٔ سایت‌ها اجرا شود، سه مسیر واقعی وجود دارد — به ترتیب از ساده به کامل.</p></div></header>

      ${F.card('مسیر ۱ — افزونهٔ DOPPEL Runtime (مقصد: همان مرورگر)', `
        <p class="lead-sm">افزونهٔ همراه پروژه (<code>doppel-extension/</code>) هویت را روی هر تب و هر سایت اعمال می‌کند: User-Agent و Client Hints در سطح شبکه (DNR)، Accept-Language، پروکسی SOCKS/HTTP، تایم‌زون، ناوبراتور، صفحه، WebGL، canvas/audio، WebRTC و … .
        Project zip: <code>doppel-project.zip</code> در کنار همین فایل.</p>
        <ol class="steps">
          <li>افزونه را نصب کنید: <code>chrome://extensions</code> ← حالت Developer ← Load unpacked ← پوشهٔ <code>doppel-extension</code></li>
          <li>در همین استودیو، پروفایل مورد نظر را باز کنید و از تب «خروجی» → «JSON پروفایل» ← دانلود کنید.</li>
          <li>آیکون افزونه را بزنید، JSON را بچسبانید، «فعال‌سازی پروفایل».</li>
          <li>از این لحظه هر سایت و هر تبی که باز کنید (بعد از refresh) هویت پروفایل را می‌بیند.</li>
          <li>راستی‌آزمایی: در تب «آزمون زنده» روی همین مرورگر «اسکن» بزنید؛ باید مقادیر با پروفایل یکی شوند.</li>
        </ol>
        <div class="notice warn">${H.icon('alert', 15)}<div><b>مرز واقعیت:</b> افزونه می‌تواند UA/هدر/تایم‌زون/WebGL/canvas/صفحه/زبان/پروکسی را جعل کند، ولی <b>TLS (JA3/JA4)</b>، اثرانگشت GPU در سطح فرایند و HTTP2 fingerprint همچنان امضای Chrome واقعی شماست. برای جداسازی کامل، مسیر ۲ یا ۳ (بیلد پچ‌شده/VM) لازم است.</div></div>`, { icon: 'beaker' })}

      ${F.card('مسیر ۲ — Puppeteer / Playwright runner (جداسازی کامل هر پروفایل)', `
        <ol class="steps">
          <li>از تب «خروجی» فایل runner را دانلود کنید.</li>
          <li><code>npm i puppeteer-core</code> و مسیر Chrome خودتان را در <code>CHROME_PATH</code> بگذارید.</li>
          <li>runner تایم‌زون، locale، صفحه، مختصات، UA و Client Hints را از CDP اعمال می‌کند و پروکسی SOCKS5 را با افزونهٔ احراز هویت جدا (خروجی «SOCKS proxy-auth extension») فعال می‌کند.</li>
          <li>هر پروفایل = یک پروفایل کاربری مستقل Chrome با <code>--user-data-dir</code> اختصاصی.</li>
        </ol>
        <button class="btn small" data-action="feed-download">${H.icon('download', 14)} دانلود فید همهٔ پروفایل‌ها</button>`, { icon: 'code' })}

      ${F.card('مسیر ۳ — VM/کنتیتر مجزا برای هر هویت (بالاترین جداسازی)', `
        <ol class="steps">
          <li>برای هر هویت یک VM/کاربر سیستم مستقل با IP استاتیک همان شهر.</li>
          <li>مرورگر را با پروفایل کاربری جدید + افزونهٔ DOPPEL + پروکسی اجرا کنید.</li>
          <li>هرگز کوکی/حساب/کیف پول بین VMها مشترک نباشد؛ این لایه بیرون از مرورگر است و هیچ ابزاری جای آن را نمی‌گیرد.</li>
        </ol>`, { icon: 'lock' })}

      ${F.card('چه چیزی «اجرا» را تأیید می‌کند؟', `
        <div class="tbl-wrap"><table class="matrix"><thead><tr><th>بررسی</th><th>ابزار مستقل</th><th>معیار موفقیت</th></tr></thead><tbody>
          <tr><td>IP / تایم‌زون / زبان</td><td>browserleaks.com/ip، whoer.net</td><td>کشور و TZ = پروفایل، WebRTC بدون IP عمومی</td></tr>
          <tr><td>UA / Client Hints</td><td>tls.peet.ws، httpbin</td><td>هم‌خوانی نسخه و پلتفرم</td></tr>
          <tr><td>Canvas / WebGL</td><td>browserleaks.com/canvas، creepjs</td><td>هش پایدار و متفاوت از دستگاه واقعی</td></tr>
          <tr><td>فونت‌ها</td><td>browserleaks.com/fonts</td><td>لیست هم‌خوان با OS</td></tr>
          <tr><td>TLS</td><td>tls.peet.ws</td><td>JA3/JA4 = Chrome نسخهٔ اعلامی (نه ابزار دیگر)</td></tr>
          <tr><td>هم‌خوانی کلی</td><td>CreepJS</td><td>نمرهٔ trust و «lies» فقط موارد سطح بومی</td></tr>
        </tbody></table></div>`, { icon: 'eye' })}
    </div>`;
  }
  return { render };
})();

const Settings = (() => {
  function render() {
    const d = Store.db;
    return `<div class="page">
      <header class="page-h"><div><h1>${H.icon('settings', 22)} تنظیمات و داده‌ها</h1>
        <p>مدیریت ذخیره‌سازی، پشتیبان‌گیری، ورود/خروج پروفایل و ریست کامل.</p></div></header>
      <div class="grid2">
        ${F.card('ذخیره‌سازی', `
          <div class="kv-rows">
            <div><span>وضعیت</span><b class="${Store.persist ? 'ok' : 'warn'}">${Store.persist ? 'مرورگر ابری (window.storage) — ذخیره دائمی' : 'حافظهٔ محلی این تب (بدون اتصال ابری)'}</b></div>
            <div><span>پروفایل‌ها</span><b>${d.profiles.length}</b></div>
            <div><span>حجم تخمینی</span><b>${(JSON.stringify(d).length / 1024).toFixed(1)} KB</b></div>
            <div><span>آخرین تغییر</span><b>${d.updatedAt ? new Date(d.updatedAt).toLocaleString('fa-IR') : '—'}</b></div>
          </div>
          ${!Store.persist ? `<div class="notice warn mt10">${H.icon('alert', 15)}<div>برای ماندگاری دائمی، فایل را دانلود کنید و در محیط خودتان اجرا کنید (داده‌ها در مرورگر شما ذخیره می‌شود). پشتیبان کامل با «خروجی همه» گرفته شود.</div></div>` : ''}`, { icon: 'lock' })}

        ${F.card('پشتیبان‌گیری', `
          <div class="btnstack">
            <button class="btn full" data-action="export-all">${H.icon('download', 14)} خروجی همهٔ پروفایل‌ها (JSON)</button>
            <label class="btn full ghost filebtn">${H.icon('upload', 14)} ورود از فایل JSON<input type="file" id="import-file" accept="application/json,.json" hidden></label>
            <button class="btn full ghost" data-action="load-sample">${H.icon('shuffle', 14)} ساخت ۳ پروفایل نمونه</button>
          </div>
          <p class="tiny muted">فایل خروجی کل دیتابیس (پروفایل‌ها + تنظیمات) است؛ در نسخهٔ دیگر همان فایل را وارد کنید تا دقیقاً بازسازی شود.</p>`, { icon: 'layers' })}

        ${F.card('تنظیمات پیش‌فرض تولید', `
          <div class="form-grid">
            ${F.field('شبکهٔ پیش‌فرض', `<select id="set-network">${[['proxy', 'پروکسی'], ['direct', 'مستقیم']].map(([v, l]) => `<option value="${v}" ${d.settings.network === v ? 'selected' : ''}>${l}</option>`).join('')}</select>`)}
            ${F.field('کشور پیش‌فرض', `<select id="set-country"><option value="">تصادفی</option>${GEO_NAMES.map((c) => `<option value="${c}" ${d.settings.defaultCountry === c ? 'selected' : ''}>${GEO_META[c].name}</option>`).join('')}</select>`)}
            ${F.field('حریم خصوصی', `<select id="set-privacy">${[['auto', 'خودکار'], ['optout', 'همیشه opt-out']].map(([v, l]) => `<option value="${v}" ${d.settings.privacy === v ? 'selected' : ''}>${l}</option>`).join('')}</select>`)}
          </div>`, { icon: 'settings' })}

        ${F.card('منطقهٔ خطر', `
          <p class="tiny muted">حذف کامل همهٔ پروفایل‌ها و تنظیمات. این عمل قابل بازگشت نیست.</p>
          <button class="btn danger full" data-action="wipe">${H.icon('trash', 14)} پاک کردن کامل دیتابیس</button>`, { icon: 'alert' })}
      </div>
      ${F.card('دربارهٔ DOPPEL', `<p class="prose">
        DOPPEL یک استودیوی «هویت منسجم» است: پروفایل‌ها را از یک کهن‌الگوی دستگاه می‌سازد، ۳۲ آزمون تناقض‌سنجی روی آن اجرا می‌کند، و برای هر پروفایل خروجی اجرایی (userscript، runner، افزونهٔ پروکسی، صفحهٔ راستی‌آزمایی) می‌دهد.
        نسخه ${DOPPEL_VERSION} · اسکیمای داده ${SCHEMA_VERSION} · تولیدکنندهٔ کاملاً آفلاین.</p>
        <p class="prose">برای استفادهٔ مسئولانه: تنها روی حساب‌ها/سرویس‌هایی که مالک آن‌ها هستید یا مجاز به استفاده از چند حساب در آن‌ها هستید. این ابزار برای دور زدن محدودیت‌های سرویس‌ها در جهت سوءاستفاده طراحی نشده است.</p>`, { icon: 'book' })}
    </div>`;
  }

  Object.assign(UI.actions, {
    'export-all'() {
      U.download(`doppel-backup-${U.fmtDate(new Date())}.json`, JSON.stringify(Store.db, null, 2));
      toast('پشتیبان دانلود شد');
    },
    async 'load-sample'() {
      for (let i = 0; i < 3; i++) {
        const p = FP.repair(FP.generate({ network: Store.db.settings.network }));
        await Store.add(p);
      }
      toast('۳ پروفایل نمونه ساخته شد');
      UI.render();
    },
    async wipe() {
      if (!confirm('همهٔ پروفایل‌ها پاک شوند؟ این عمل بازگشت‌پذیر نیست.')) return;
      await Store.reset();
      UI.S.id = null;
      UI.go('dashboard');
      toast('دیتابیس خالی شد');
    },
  });

  document.addEventListener('change', async (e) => {
    const t = e.target;
    if (t.id === 'import-file' && t.files && t.files[0]) {
      try {
        const text = await t.files[0].text();
        await Store.importAll(text);
        toast('دیتابیس وارد شد');
        UI.render();
      } catch (err) { toast('فایل نامعتبر است', 'bad'); }
    }
    if (t.id === 'set-network') { await Store.settings({ network: t.value }); }
    if (t.id === 'set-country') { await Store.settings({ defaultCountry: t.value }); }
    if (t.id === 'set-privacy') { await Store.settings({ privacy: t.value }); }
  });

  return { render };
})();
