# امنیت

- **احراز هویت:** فقط Telegram Login رسمی و initData با بررسی HMAC و انقضای ۲۴ ساعته. JWT دسترسی ۶۰ دقیقه + refresh ثبت‌شده در `sessions` (قابل ابطال).
- **2FA:** TOTP برای همه نقش‌های غیرمشتری؛ secret با AES-GCM رمز می‌شود.
- **RBAC:** `super_admin, admin, manager, support, finance, marketing, customer` در `core/security.py`.
- **اسرار:** فقط در `.env` سرور. کدهای تحویل و کلیدهای تأمین‌کننده رمزنگاری‌شده در DB.
- **وب‌هوک تلگرام:** `secret_token`؛ Nginx مسیر `/internal` و `/metrics` را از بیرون می‌بندد.
- **Rate limit:** Nginx (لایه ۱) + Redis per-route (لایه ۲) + سقف روزانه AI برای هر کاربر.
- **پول:** مبلغ فقط سمت سرور، `expected_total`، `idempotency_key`، قفل ردیف برای کیف پول، verify قبل از تحویل.
- **AI:** هیچ ابزاری برای انتقال پول ندارد؛ اقدامات حساس → `ai_actions` → تأیید انسانی → لاگ ممیزی.
- **هدرها:** CSP، HSTS، nosniff، frame-ancestors محدود به Telegram.
- **لاگ ممیزی:** ورود، دستورات ادمین، تأیید پیشنهادهای AI، تغییر موجودی.

چک‌لیست قبل از لانچ: همه `change-me`ها عوض شوند · `ZARINPAL_SANDBOX=false` بعد از تست · بکاپ روزانه Postgres · Sentry فعال · 2FA همه ادمین‌ها.
