# استقرار

**سرور:** Ubuntu 24.04 · 4 vCPU · 8GB RAM · 80GB SSD (برای شروع کافی است).
**دامنه‌ها:** `modasrhub.com`, `api.modasrhub.com`, `n8n.modasrhub.com` → IP سرور.

1. `apt install docker.io docker-compose-plugin` و کلون پروژه.
2. TLS: `certbot certonly --standalone -d modasrhub.com -d api.modasrhub.com -d n8n.modasrhub.com` → کپی به `infra/nginx/certs`.
3. `.env` را پر کن (BotFather، Gemini، زرین‌پال، اسرار تصادفی).
4. `docker compose up -d postgres redis && docker compose run --rm api python -m app.bootstrap`
5. مهاجرت داده فعلی: `scripts/import_base44.py`
6. `docker compose up -d` → ربات خودش webhook و دکمه Mini App را ثبت می‌کند.
7. n8n: ایمپورت `n8n/modasr-events.workflow.json` و تنظیم متغیرهای `CRM_URL` و `ANALYTICS_URL`.
8. Grafana روی شبکه داخلی؛ با SSH tunnel باز کن.

**Staging اول:** همین compose روی ساب‌دامین staging با `ZARINPAL_SANDBOX=true` و ربات تست جدا.
**Rollback:** `docker compose up -d --no-deps api@<tag-قبلی>` + بکاپ Postgres قبل از هر مهاجرت.
**مقیاس:** api و worker بدون state هستند؛ با `--scale worker=4` یا انتقال به k8s افقی بزرگ می‌شوند.

> نکته ایران: Gemini و برخی APIها IP ایران را رد می‌کنند و صرافی‌های ایرانی ممکن است IP خارجی را ببندند. سرور خارج از ایران + در صورت نیاز یک relay کوچک داخل ایران فقط برای نرخ و درگاه.
