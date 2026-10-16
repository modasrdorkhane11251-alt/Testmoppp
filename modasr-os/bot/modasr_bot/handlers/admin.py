from aiogram import F, Router
from aiogram.types import CallbackQuery

from modasr_bot import api

router = Router()


@router.callback_query(F.data.startswith("pay_ok:") | F.data.startswith("pay_no:"))
async def receipt_decision(c: CallbackQuery):
    approve, pid = c.data.startswith("pay_ok:"), c.data.split(":", 1)[1]
    try:
        r = await api.post("/internal/bot/receipt-decision", {"payment_id": pid, "admin_telegram_id": c.from_user.id, "approve": approve})
    except Exception:  # noqa: BLE001
        return await c.answer("دسترسی ندارید", show_alert=True)
    await c.message.edit_reply_markup(reply_markup=None)
    await c.message.reply(f"{'✅ تأیید شد' if r['status'] == 'approved' else '❌ رد شد'} توسط {c.from_user.full_name}")
    await c.answer()
