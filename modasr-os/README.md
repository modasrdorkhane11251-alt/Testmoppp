# MODASR HUB · AI-First Commerce OS

یک بک‌اند مرکزی، چند ویترین: **وب‌سایت، ربات تلگرام، Mini App، Telegram Business، کانال‌ها، n8n**.
هوش مرکزی **MODASR AI CORE** فروش، پشتیبانی، محتوا، بازاریابی، تحلیل و CRM را انجام می‌دهد؛
هر کاری که به پول یا قیمت دست می‌زند فقط **پیشنهاد** می‌شود و با یک کلیک ادمین اجرا می‌شود.

```
web/        Next.js 15 · TypeScript · Tailwind · RTL · سایت + Mini App (یک کدبیس)
backend/    FastAPI · SQLAlchemy 2 (async) · PostgreSQL · Redis · Celery
bot/        Aiogram 3 · webhook · Business mode · inline search
n8n/        workflow آماده (Webhook با امضای HMAC → CRM / Email / Analytics / Telegram)
infra/      Nginx (TLS، rate limit) · Prometheus · Grafana
scripts/    مهاجرت داده از فروشگاه فعلی
docs/       معماری، API، استقرار، امنیت، تلگرام، نقشه راه
```

## راه‌اندازی سریع
```bash
cp .env.example .env            # همه change-meها را با openssl rand -hex 32 پر کن
docker compose up -d postgres redis
docker compose run --rm api python -m app.bootstrap
docker compose up -d
```
بعد: [docs/TELEGRAM.md](docs/TELEGRAM.md) برای BotFather، Mini App و Business.

## تست
```bash
cd backend && python tests/test_core.py   # تأیید امضای تلگرام، قیمت‌گذاری، کوپن
```
