# وضعیت واقعی

## ساخته و تست‌شده
- تأیید امضای Telegram Login و Mini App، قیمت‌گذاری، کوپن (تست واحد)
- کامپایل کامل بک‌اند و ربات

## ساخته‌شده، نیازمند اجرای واقعی با کلیدها
- API کامل، AI CORE با function calling، Celery جاب‌ها، ربات + Business، سایت/Mini App، n8n، Docker/Nginx

## باقی‌مانده (به ترتیب اولویت)
1. Alembic migrations (الان `bootstrap.py` جدول‌ها را می‌سازد)
2. صفحات CRUD ادمین برای محصول/دسته/کوپن/کاربر (API ها آماده‌اند)
3. UI فعال‌سازی 2FA و مدیریت نشست‌ها
4. آداپتر Instagram (Meta Graph API رسمی) و WhatsApp
5. پرداخت پورسانت افیلیت و درخواست تسویه
6. آداپتر اختصاصی هر تأمین‌کننده (الان generic JSON)
7. تست‌های یکپارچه با Postgres واقعی و تست بار
8. کامپوننت‌های shadcn/ui و انیمیشن‌های Framer Motion
