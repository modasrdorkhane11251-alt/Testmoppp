# API

| Method | Path | Auth | کار |
|---|---|---|---|
| POST | /api/auth/telegram/widget | - | ورود با Telegram Login Widget (HMAC سمت سرور) |
| POST | /api/auth/telegram/webapp | - | ورود Mini App با initData |
| POST | /api/auth/2fa?challenge= | - | TOTP برای ادمین‌ها |
| POST | /api/auth/refresh · /logout | refresh | مدیریت نشست |
| GET | /api/categories · /api/products · /api/products/{slug} | - | کاتالوگ، جستجو، فیلتر، مرتب‌سازی، صفحه‌بندی |
| GET | /api/rates | - | نرخ زنده + منابع + سلامت |
| GET | /api/kb/{slug} | - | قوانین و صفحات |
| POST | /api/quote | - | محاسبه سبد + کوپن |
| POST | /api/checkout | JWT | ثبت سفارش (online / wallet / card_to_card) با idempotency |
| GET | /api/pay/callback | - | بازگشت زرین‌پال + verify + تحویل |
| POST | /api/pay/receipt | JWT | آپلود رسید → بررسی AI → تأیید ادمین در تلگرام |
| GET | /api/me · /api/my/orders · /api/my/orders/{n} · /api/my/wallet | JWT | داشبورد کاربر |
| POST | /api/coupons/validate | - | اعتبارسنجی کوپن |
| POST | /api/ai/chat | JWT | گفتگو با AI (سقف روزانه + rate limit) |
| POST/GET | /api/tickets · /api/tickets/{id} | JWT | تیکت با پاسخ اول AI |
| GET | /admin/dashboard | analytics | KPI، صف، نرخ حل خودکار، سلامت تأمین‌کننده |
| POST | /admin/ai/command | ai | دستیار ادمین با زبان طبیعی |
| GET/POST | /admin/ai/proposals · /{id}/{approve\|reject} | ai | صف تأیید |
| POST | /admin/stock | products | افزودن کد تحویل خودکار (رمز می‌شود) |
| POST | /admin/channels · /admin/posts/draft · /posts/{id}/approve | channels | اتوماسیون کانال |
| GET | /admin/audit | super_admin | لاگ ممیزی |

نمونه checkout:
```json
POST /api/checkout
{ "items":[{"sku":"tg-premium-3m","qty":1}], "coupon":"OFF10", "method":"online",
  "expected_total":1250000, "channel":"miniapp", "idempotency_key":"7f1c…" }
→ { "order": 2610018452, "redirect": "https://payment.zarinpal.com/pg/StartPay/A0000…" }
→ { "price_changed": true, "total": 1290000 }
```

رویدادهای n8n: `user.registered, order.created, order.paid, order.delivered, order.failed, ticket.created,
ticket.closed, ticket.escalated, supplier.price_changed, supplier.out_of_stock, supplier.down, receipt.flagged, cart.abandoned`
هدرها: `X-Modasr-Signature = HMAC_SHA256(secret, "{ts}." + body)`, `X-Modasr-Timestamp`, `Idempotency-Key`.
