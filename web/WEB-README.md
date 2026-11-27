# DOPPEL — Fingerprint & Identity Studio

**استودیوی هویت دیجیتال منسجم** — ساخت، اعتبارسنجی و اجرای پروفایل‌های کامل مرورگری
(سیستم‌عامل، مرورگر، UA/Client Hints، سخت‌افزار، GPU، فونت، رزولوشن، تایم‌زون، زبان،
IP/پروکسی، WebRTC، Canvas/Audio، رفتار انسانی) به‌گونه‌ای که **هیچ سیگنالی با سیگنال دیگر
تناقض نداشته باشد** — همان اصل کاری که GoLogin/Multilogin بر آن بنا شده‌اند.

> این پروژه بر اساس فهرست ۳۲ سیگنالی تصویر شما ساخته شده و هر ۳۲ مورد + ۲۰+ سیگنال
> مهم دیگر را پوشش می‌دهد، با موتور «تولید زنجیره‌ای» که در حالت رندوم هم تناقض نمی‌سازد.

---

## ۱) فایل‌ها

| مسیر | توضیح |
|---|---|
| **`doppel.html`** | کل وب‌اپ در یک فایل مستقل (بدون CDN، بدون نیاز به اینترنت). همین را باز کنید. |
| **`doppel-extension/`** | افزونهٔ واقعی Chrome (MV3) برای اجرای پروفایل روی **همهٔ سایت‌ها** — این همان چیزی است که «ران کردن پروفایل» را واقعی می‌کند. |
| **`doppel-project.zip`** | همهٔ موارد بالا + سورس کد و تست‌ها در یک بسته. |
| `web/src/*.js` | سورس موتور (core / catalog / generate / agent / ui / editor / live / …) و `tools/build.js`. |

---

## ۲) شروع سریع (۶۰ ثانیه)

1. `doppel.html` را در Chrome باز کنید.
2. **«ساخت پروفایل»** → تعداد و (اختیاری) کشور را انتخاب کنید → «تولید و اعتبارسنجی».
   هر پروفایل بلافاصله با **۳۲ آزمون تناقض‌سنجی** سنجیده می‌شود (نمره/درجه A–F).
3. روی پروفایل کلیک کنید → هر سیگنالی را دستی تغییر دهید؛ تغییرهای ساختاری
   (کشور، OS، مرورگر، رزولوشن، …) به‌صورت خودکار کل زنجیره را **re-repair** می‌کنند
   (تایم‌زون ↔ شهر ↔ زبان ↔ ارز ↔ پروکسی ↔ UA ↔ GPU ↔ فونت).
4. **«شبیه‌سازی اجرا»** → نمای «چه چیزی سایت هدف می‌بیند» + گزارش تشخیص + لینک تست بیرونی.
5. **«خروجی»** → یکی از شش خروجی را بردارید (پایین).

---

## ۳) مسیرهای اجرای واقعی

### مسیر A — افزونهٔ DOPPEL Runtime (توصیه‌شده برای «همان مرورگر»)
افزونه هویت پروفایل را روی **هر تب و هر سایت** اعمال می‌کند:

- هدرهای شبکه با `declarativeNetRequest`: `User-Agent`, `sec-ch-ua*`, `Accept-Language`, `DNT/GPC`
- پروکسی `SOCKS5/HTTP` با احراز هویت (`chrome.proxy`)
- لایهٔ درون‌صفحه (`document_start`, MAIN world): `navigator.*`, `userAgentData`, زمان/تایم‌زون،
  screen/DPR، WebGL vendor/renderer، Canvas/Audio نویز پایدار per-profile، فونت‌ها، باتری،
  WebRTC-leak kill، MediaDevices، matchMedia، NetworkInformation

**نصب:** `chrome://extensions` → Developer mode → *Load unpacked* → پوشهٔ `doppel-extension`
**استفاده:** از استودیو: خروجی → **JSON پروفایل** (دانلود/کپی) → آیکون افزونه → چسباندن → «فعال‌سازی»
**تأیید:** تب «آزمون زنده» استودیو → «اسکن مرورگر فعلی» → باید مقادیر واقعی مرورگر با پروفایل یکی شوند.

### مسیر B — Puppeteer/Playwright runner
خروجی «Puppeteer / Playwright runner» + `--user-data-dir` اختصاصی هر پروفایل + افزونهٔ
«SOCKS proxy-auth extension» (خروجی جدا). تایم‌زون/locale/geo/صفحه با CDP اعمال می‌شوند.

### مسیر C — userscript
برای Tampermonkey/Violentmonkey. سریع‌ترین راه؛ لایهٔ JS کامل است ولی هدرهای شبکه را
باید DNR/پروکسی سیستم انجام دهد (در راهنما توضیح داده شده).

### مسیر D — VM/کنتیتر مستقل برای هر هویت (بالاترین جداسازی)

---

## ۴) چه چیزی ساخته می‌شود (نقشهٔ ۳۲ سیگنال تصویر شما)

| # | سیگنال تصویر | در DOPPEL |
|---|---|---|
| 1 | دسته‌بندی ویژگی/منبع/مثال | اعتبارسنجی توصیفی + ماتریس پوشش/ریسک |
| 2 | HTTP Headers / User-Agent | UA ساخته‌شده از قطار انتشار + DNR روی هدرها |
| 3 | Accept (فرمت‌ها) | سربرگ کامل Accept در خروجی headers |
| 4 | Content-Encoding | `gzip, deflate, br, zstd` منطبق با نسخهٔ مرورگر |
| 5 | Content-Language | از `languages` پروفایل + `Intl` |
| 6 | ترتیب هدرها | ترتیب واقعی Chrome در خروجی payload/headers |
| 7 | Client Hints (`Sec-CH-UA-*`) | ایران‌ساخت کامل + هم‌خوان با UA/OS + قابل حذف برای Firefox |
| 8 | Device Model (JS/Headers) | مدل دقیق اندروید در UA + `userAgentData.model` |
| 9 | Serial/Hardware ID/WebGL | renderer/vendor جعلی پایدار + seed یکتا |
| 10 | CPU/GPU (cores, renderer) | کاتالوگ GPU واقعی به‌ازای OS + تعداد هسته/حافظهٔ منطقی |
| 11 | Device Memory | سقف API=8 و هم‌خوان با RAM دستگاه |
| 12 | Screen resolution/color depth | رزولوشن‌های واقعی هر دستگاه + DPR + avail/inner |
| 13 | Touch Support | `maxTouchPoints` = ۵ موبایل / ۰ دسکتاپ |
| 14 | Battery Status | باتری زندهٔ منطقی (charging/level) |
| 15 | Platform | `navigator.platform` هم‌خوان با OS (Win32/MacIntel/Linux armv81) |
| 16 | Timezone | موتور DST واقعی (US/EU/South/IL/EG) + قفل روی کشور IP |
| 17 | List of Fonts / Flash | کاتالوگ فونت هر OS + `FontFaceSet.check` + pluginهای PDF هر مرورگر |
| 18 | List of Plugins | Chrome=۵ PDF viewer، Firefox=۰، Safari=۱ |
| 19 | Cookies enabled | همیشه true + GlobalPrivacyControl |
| 20 | local/sessionStorage | فعال + سهمیهٔ ذخیره‌سازی قابل تنظیم |
| 21 | Do Not Track | DNT/GPC با هم‌خوانی کامل بین لایه‌ها |
| 22 | Ad Blocker | افزونه‌های کاتالوگ (uBlock/AdBlock) + پرچم blockAds هم‌خوان |
| 23 | Canvas | نویز **پایدار** (deterministic) با seed مخصوص پروفایل |
| 24 | WebGL Vendor | هم‌خوان با GPU/OS |
| 25 | WebGL Renderer | `ANGLE(...)` دقیق برای GPU انتخاب‌شده |
| 26 | WebGL Parameters | maxTextureSize و پارامترهای ثابت پروفایل |
| 27 | AudioContext | نویز deterministic روی `getChannelData` |
| 28 | Media Devices | تعداد دوربین/میکروفن/بلندگو هم‌خوان با دستگاه |
| 29 | IP Address | پروکسی/شهر/ISP/ASN + هم‌ترازی خودکار با geo |
| 30 | WebRTC Local IP | IP خصوصی LAN واقع‌نما + kill-switch در حالت پروکسی |
| 31 | Connection Type | cellular/wifi + effectiveType/rtt/downlink |
| 32 | Mouse/Touch Movements | مدل رفتار انسانی (Bezier + نویز گاوسی + WPM + jitter) |

**اضافه بر تصویر:** Accept-CH/UA-Full-Version-List، `Sec-Fetch-*`، سهمیهٔ storage، `webdriver=false`،
`pdfViewerEnabled`، `prefers-color-scheme/reduced-motion`، ClientRects noise، جدول ارز/قالب تاریخ/عدد،
نرمال‌سازی پروکسی↔شهر، `Sec-GPC`، و کل ماتریس «پوشش/ریسک» در تب راهنما.

---

## ۵) اعتبارسنجی و تست‌ها (این پروژه ادعا نمی‌کند؛ آزمایش می‌کند)

| مجموعه | دستور | نتیجه |
|---|---|---|
| موتور هسته (۶۰ تست) | `node web/tools/test-core.mjs` | ✅ ۶۰/۶۰ |
| UI کامل در DOM (۳۳ تست) | `node web/tools/test-ui.mjs` | ✅ ۳۳/۳۳ |
| لایهٔ spoof افزونه (۱۶ سیگنال) | `.cache/test/spoof-test.mjs` | ✅ ۱۶/۱۶ مطابق |
| تست دسته‌ای ۲۰۰ پروفایل رندوم | در UI: آزمایشگاه → «آزمون انسجام دسته‌ای» | ✅ ۲۰۰/۲۰۰ بدون تناقض |

---

## ۶) محدودیت‌های صادقانه (چیزی که هیچ وب‌اپلیکیشنی نمی‌تواند جعل کند)

- **TLS/JA3-JA4 و HTTP/2 fingerprint**: امضای بیلد مرورگر است؛ با JS/افزونه تغییر نمی‌کند.
  برای پوشش کامل باید از مرورگر واقعی با پروفایل بومی‌شده یا VM استفاده شود (مسیر B/C).
- **امضای GPU در سطح فرایند** و فونت‌های واقعاً نصب‌شده در سیستم: افزونه فقط سطح JS را می‌پوشاند.
- **IP**: بدون پروکسی residential/mobile هم‌شهر، هیچ پروفایلی معتبر نیست. استخر پیش‌فرض فقط «نمونه/دمو» است.
- **لایهٔ حساب/پرداخت/KYC**: خارج از مرورگر است و هیچ ابزار anti-detect جای آن را نمی‌گیرد.
- این پروژه **دروازهٔ ورود جادویی نیست**؛ «نمرهٔ اعتماد» نمایشی نمی‌سازد. هر جا عددی می‌بینید
  از آزمون واقعی همین مرورگر آمده است (تب «آزمون زنده») و هر جا ادعایی هست، محدودیتش هم نوشته شده.

> استفاده مسئولانه: فقط روی حساب‌ها/سرویس‌هایی که مالک آن‌ها هستید یا چندحسابی در آن‌ها مجاز است.
> دور زدن بَن/تقلب/آسیب به سرویس‌ها هدف این پروژه نیست.

---

## ۷) نقشهٔ فنی کوتاه

```
01-core      → ابزارها، RNG seed‌دار، GEO (۴۴ کشور / ۱۵۰+ شهر)، پروکسی، locale
02-catalog   → نسخه‌های مرورگر (قطار انتشار واقعی) + کاتالوگ GPU/فونت/افزونه + موتور DST
03-generate  → تولید زنجیره‌ای پروفایل + اعتبارسنج ۳۲ قاعده‌ای + auto-repair آبشاری
04-agent     → payload/headers/هش هویت + تحلیل‌گر سایت هدف + ۶ خروجی (userscript، runner، …)
05..08 UI    → داشبورد، مودال تولید، ویرایشگر ۹ تب، آزمایشگاه، راهنما، تنظیمات
09-live      → اسکن واقعی مرورگر (TZ، WebGL، Canvas، Audio، WebRTC، فونت، …) و مقایسه
doppel-extension → MV3: DNR headers + proxy + bridge + spoof.js (MAIN world)
```
