# معماری MODASR HUB

```
                ┌──────────── کانال‌های مشتری ─────────────┐
   Website ── Mini App ── Bot ── Telegram Business ── Channels ── Instagram*
        │          │        │            │                │
        └────── Nginx (TLS · rate-limit · /internal بسته) ─┘
                              │
                 ┌────────── FastAPI (api) ──────────┐
                 │ auth · catalog · commerce · support│
                 │ admin · internal(bot)              │
                 │        MODASR AI CORE              │
                 │  sales│support│content│marketing   │
                 │  analytics│crm│admin  + ToolBox    │
                 └──────┬─────────────┬───────────────┘
                PostgreSQL        Redis ── Celery worker/beat
                (+ outbox)          │      rates · reprice · suppliers
                                    │      posts · carts · CRM · reports
                                    └──→ EventOutbox ──HMAC──→ n8n → CRM/Email/…
                Gemini API  ← فقط از سرور
```
`*` آداپتر اینستاگرام: رابط آماده است، اتصال Meta Graph API در نقشه راه.

## اصول
1. **یک منبع حقیقت:** همه کانال‌ها از یک API و یک دیتابیس می‌خوانند؛ Mini App همان کد سایت است.
2. **قیمت فقط سمت سرور:** `quote → checkout(expected_total)`؛ اگر قیمت تغییر کرده باشد، سفارش ثبت نمی‌شود.
3. **AI با گاردریل:** ابزارهای خواندنی آزادند؛ `propose_action` برای کوپن، کمپین، قیمت، انتشار و بازگشت وجه → جدول `ai_actions` → تأیید انسانی → `execute_ai_action`.
4. **Outbox تراکنشی:** رویدادها در همان تراکنش کسب‌وکار ذخیره و با backoff نمایی و `Idempotency-Key` تحویل می‌شوند.
5. **نرخ واقعی یا هیچ:** میانه ۳ صرافی + حذف داده پرت ۴٪؛ نرخ قدیمی‌تر از ۳۰ دقیقه هرگز برای قیمت‌گذاری استفاده نمی‌شود.
6. **Multi-tenant ready:** همه جداول اصلی `tenant_id` دارند.

## AI CORE
| Agent | ابزارها | حد اختیار |
|---|---|---|
| Sales | search_products, get_policy, escalate | پیشنهاد، مقایسه، upsell |
| Support | get_order, my_recent_orders, get_policy, create_ticket, escalate | حل مشکل، ساخت تیکت |
| Content | search_products | متن محصول، سئو، پست، کپشن، FAQ |
| Marketing | best_sellers, sales_stats, propose_action | فقط پیشنهاد کمپین |
| Analytics | sales_stats, best_sellers, open_tickets | گزارش روزانه/هفتگی/ماهانه |
| CRM (task) | segment_customers | بخش‌بندی، VIP، at-risk |
| Admin | همه | دستور زبان طبیعی؛ تغییر حساس فقط پیشنهاد |

Router کلمات کلیدی پشتیبانی را به Support می‌فرستد؛ بقیه به Sales. حداکثر ۴ دور فراخوانی ابزار.

## جداول (خلاصه)
`users, telegram_identities, sessions, categories, products, variants, suppliers, stock_codes, carts, orders,
order_items, payments, wallet_transactions, coupons, affiliates, referrals, favorites, tickets, ticket_messages,
ai_conversations, ai_actions, knowledge_articles, channels, scheduled_posts, campaigns, event_outbox,
exchange_rates, audit_logs, settings` (تعریف کامل: `backend/app/models/__init__.py`)

کدهای تحویل، کلید API تأمین‌کننده‌ها و اطلاعات کانال‌ها با AES-256-GCM رمز می‌شوند.
