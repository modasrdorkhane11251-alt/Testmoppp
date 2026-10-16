# راه‌اندازی تلگرام

## BotFather
1. `/newbot` → نام `MODASR HUB` → یوزرنیم `modasrhub_bot` (اگر گرفته شده بود، نزدیک‌ترین گزینه).
2. `/setuserpic` لوگو، `/setdescription` و `/setabouttext` متن برند.
3. `/setdomain` → `modasrhub.com` (برای Login Widget الزامی).
4. `/setinline` → فعال (جستجوی inline محصولات).
5. **Bot Settings → Business Mode → Turn on** (برای Telegram Business).
6. توکن را فقط در `.env` سرور بگذار. اگر لو رفت: `/revoke`.

## Mini App
- آدرس: `https://modasrhub.com/tg`. ربات هنگام استارت دکمه منو را خودش تنظیم می‌کند (`set_chat_menu_button`).
- لینک مستقیم: `https://t.me/modasrhub_bot?startapp=p_<slug>` یا `ref_<code>`.
- احراز هویت: `initData` در سرور با HMAC(`WebAppData`) بررسی می‌شود؛ `initDataUnsafe` فقط برای UI.

## Telegram Business
- حساب شخصی تو باید Telegram Premium داشته باشد.
- Settings → Business → Chatbots → `@modasrhub_bot` → دسترسی پاسخ.
- AI به پیام مشتری‌ها از طرف خودت جواب می‌دهد. در هر چت:
  `/human` = AI ساکت، خودت جواب می‌دهی · `/ai` = برگشت به AI.
- AI هرگز پول برنمی‌گرداند، پرداخت تأیید نمی‌کند و قیمت عوض نمی‌کند؛ این‌ها فقط به ادمین ارجاع می‌شوند.

## کانال‌ها و گروه‌ها
- ربات را با کمترین دسترسی (فقط Post Messages) ادمین کانال کن.
- `/admin/channels` با `publish_mode`: `manual_approval` (پیش‌فرض) · `semi_auto` · `full_auto`.
- شناسه‌ها: `TG_ADMIN_CHAT_ID` (پیوی تو)، `TG_ADMIN_GROUP_ID`، `TG_SALES_CHANNEL_ID` (فید عمومی بدون اطلاعات مشتری).
