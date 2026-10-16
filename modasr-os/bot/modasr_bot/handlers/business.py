"""Telegram Business: the bot answers on behalf of the owner's personal account (official Business API).
Owner enables it in Telegram → Settings → Business → Chatbots → @modasrhub_bot."""
from aiogram import F, Router
from aiogram.types import BusinessConnection, Message

from modasr_bot import api
from modasr_bot.config import settings

router = Router()
HUMAN_ON, HUMAN_OFF = "/human", "/ai"


@router.business_connection()
async def on_connection(bc: BusinessConnection):
    state = "✅ متصل شد" if bc.is_enabled else "⛔️ قطع شد"
    if settings.tg_admin_chat_id:
        await bc.bot.send_message(settings.tg_admin_chat_id, f"Telegram Business {state}\ncan_reply: {bc.can_reply}")


@router.business_message(F.text)
async def on_business_message(m: Message):
    # Messages the OWNER sends in a chat: commands to toggle AI for that chat
    conn = await m.bot.get_business_connection(m.business_connection_id)
    if m.from_user.id == conn.user.id:
        if m.text.strip() in (HUMAN_ON, HUMAN_OFF):
            await api.post("/internal/bot/takeover", {"chat_id": m.chat.id, "channel": "business", "on": m.text.strip() == HUMAN_ON})
        return
    res = await api.post("/internal/bot/chat", {"user": m.from_user.model_dump(include={"id", "username", "first_name", "last_name"}),
                                                "chat_id": m.chat.id, "text": m.text, "channel": "business",
                                                "business_connection_id": m.business_connection_id})
    if res.get("reply"):
        await m.bot.send_message(m.chat.id, res["reply"], business_connection_id=m.business_connection_id)
    if res.get("escalated") and settings.tg_admin_chat_id:
        await m.bot.send_message(settings.tg_admin_chat_id, f"🚨 گفتگوی بیزینس نیاز به شما دارد: {m.from_user.full_name}")
