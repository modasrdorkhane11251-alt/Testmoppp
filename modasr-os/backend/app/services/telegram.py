"""Thin official Bot API client used by API + workers (the interactive bot lives in /bot)."""
import httpx

from app.core.config import get_settings


async def tg(method: str, **payload) -> dict:
    token = get_settings().tg_bot_token
    if not token:
        return {"ok": False, "description": "bot token missing"}
    async with httpx.AsyncClient(timeout=15) as c:
        r = await c.post(f"https://api.telegram.org/bot{token}/{method}", json=payload)
    return r.json()


async def send(chat_id: str | int, text: str, **kw) -> dict:
    return await tg("sendMessage", chat_id=chat_id, text=text, parse_mode="HTML", disable_web_page_preview=True, **kw)


def fmt_toman(n: int | float) -> str:
    return f"{int(n):,} تومان".replace(",", "٬")


def order_card(event: str, o: dict) -> str:
    title = {"order.created": "🛒 سفارش جدید", "order.paid": "✅ پرداخت موفق", "order.delivered": "📦 تحویل شد",
             "order.failed": "❌ پرداخت ناموفق"}.get(event, event)
    return (f"<b>{title}</b>\n\nمحصول: {o['product']}\nمبلغ: {fmt_toman(o['amount'])}\n"
            f"سفارش: #{o['number']}\nمشتری: {o.get('customer', '-')}\nروش: {o.get('payment_method', '-')}\n"
            f"زمان: {o['time']}\nوضعیت: {o.get('status', '-')}")


async def broadcast_sales(event: str, o: dict) -> None:
    s = get_settings()
    text = order_card(event, o)
    for target in (s.tg_admin_chat_id, s.tg_admin_group_id):
        if target:
            await send(target, text)
    if s.tg_sales_channel_id and event == "order.paid":  # public feed: no customer data
        public = f"🔥 خرید جدید\n{o['product']}\n⏱ {o['time']}"
        await send(s.tg_sales_channel_id, public)
