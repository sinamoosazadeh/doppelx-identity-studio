# راهنمای انتشار در GitHub

نام پیشنهادی و انتخاب‌شده برای repository:

```text
doppelx-identity-studio
```

**Description پیشنهادی:**

```text
Offline-first coherent profile modelling and QA tooling for authorised browser testing.
```

## ۱) ساخت repository در حساب GitHub

در GitHub یک repository جدید با تنظیمات زیر بسازید:

- **Repository name:** `doppelx-identity-studio`
- **Visibility:** `Public`، اگر قصد انتشار برای سایر کاربران دارید
- **Description:** متن پیشنهادی بالا
- **Initialize this repository with a README:** خاموش
- **Add .gitignore:** انتخاب نکنید
- **Choose a license:** انتخاب نکنید؛ مجوز MIT داخل پروژه وجود دارد
- **Template:** خالی

این repository باید در ابتدا خالی باشد تا commit، tag و فایل‌های استاندارد همین
بسته مرجع باقی بمانند.

## ۲) روش پیشنهادی: انتقال دقیق تاریخچه با Git bundle

اگر فایل `doppelx-identity-studio-v3.2.1.git.bundle` را دریافت کرده‌اید، این
روش commit اولیه و tag `v3.2.1` را بدون ساخت مجدد حفظ می‌کند:

```bash
git clone doppelx-identity-studio-v3.2.1.git.bundle doppelx-identity-studio
cd doppelx-identity-studio

git remote add origin https://github.com/YOUR-ACCOUNT/doppelx-identity-studio.git
git push -u origin main
git push origin v3.2.1
```

`YOUR-ACCOUNT` را با نام کاربری یا organisation خودتان جایگزین کنید.

## ۳) روش جایگزین: استفاده از Source ZIP

Source ZIP برای بررسی و انتشار فایل‌ها مناسب است، اما خودِ ZIP متادیتای Git را
حمل نمی‌کند. پس بعد از استخراج:

```bash
unzip doppelx-identity-studio-v3.2.1-source.zip
cd doppelx-identity-studio-v3.2.1-source

git init -b main
git add -A
git commit -m "chore: import DOPPEL X Identity Studio v3.2.1"
git tag -a v3.2.1 -m "DOPPEL X Identity Studio v3.2.1 source release candidate"
git remote add origin https://github.com/YOUR-ACCOUNT/doppelx-identity-studio.git
git push -u origin main
git push origin v3.2.1
```

## ۴) تنظیمات حرفه‌ای پیشنهادی پس از push

1. در **Settings → General**، بخش *Social preview* را با
   `assets/play-feature.png` تنظیم کنید.
2. در **Settings → Security → Code security and analysis**، CodeQL و private
   vulnerability reporting را فعال کنید.
3. در **Settings → Actions → General**، اجازهٔ اجرای GitHub Actions را فعال
   نگه دارید تا CI، CodeQL و Dependabot داخل پروژه کار کنند.
4. در **Settings → Branches**، برای `main` branch protection بسازید:
   - Require a pull request before merging
   - Require status checks to pass: `Source quality` و `Android asset and preview E2E`
   - Require conversation resolution before merging
   - Do not allow force pushes
5. در **About**، topics پیشنهادی را اضافه کنید:

   ```text
   android  webview  qa  privacy  testing  profile-validation  termux  offline-first
   ```

6. Release `v3.2.1` را به‌صورت **Pre-release** بسازید و فقط این فایل‌ها را
   attach کنید:
   - `doppelx-identity-studio-v3.2.1-source.zip`
   - `doppelx-identity-studio-v3.2.1-source.sha256`
   - در صورت نیاز، `doppelx-identity-studio-v3.2.1.git.bundle` و checksum آن

تا زمانی که APK/AAB با کلید خصوصی خودتان ساخته و روی دستگاه واقعی آزموده نشده،
آن‌ها را به عنوان production release منتشر نکنید.

## ۵) بررسی پیش از انتشار

```bash
npm ci
npx playwright install chromium
npm test
npm run archive:source
```

سپس دستورهای موجود در [RELEASE.md](RELEASE.md) را کامل اجرا کنید. فایل‌های
keystore، password، profile export، database، binary build output و هر اطلاعات
کاربر/شبکه نباید وارد Git شوند.
