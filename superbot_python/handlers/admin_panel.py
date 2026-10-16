"""
Admin Panel Handler (Full Implementation)
Handles administration callbacks, stats, broadcasts, force join channel management, and banning.
"""
from typing import Dict, Any, Optional
from database.database import db
from core.unified_models import UnifiedUpdate, UnifiedPlatform, UnifiedInlineKeyboard, UnifiedInlineButton
from core.unified_sender import unified_sender
from core.state_machine import StateManager, States
from keyboards.inline_menus import admin_menu_keyboard, cancel_state_keyboard, back_button
from config import ADMIN_USER_IDS

def is_admin(platform_user_id: str) -> bool:
    """Verifies whether the platform user ID has administrative privileges."""
    return str(platform_user_id).strip() in ADMIN_USER_IDS

class AdminPanelHandler:
    @classmethod
    async def show_admin_panel(cls, update: UnifiedUpdate):
        user = update.user
        if not user or not is_admin(user.id):
            return

        chat_id = update.chat_id
        text = (
            "👑 <b>پنل مدیریت ارشد سوپر ربات همه‌کاره</b>\n\n"
            "از طریق گزینه‌های زیر می‌توانید کل سیستم را در سه پلتفرم "
            "<b>تلگرام</b>، <b>بله</b> و <b>روبیکا</b> به صورت یکپارچه مدیریت کنید:"
        )

        kb = admin_menu_keyboard()
        if update.callback_query and update.callback_query.message:
            await unified_sender.edit_message_text(
                user.platform,
                chat_id,
                update.callback_query.message.message_id,
                text,
                kb
            )
            await unified_sender.answer_callback(user.platform, update.callback_query.id)
        else:
            await unified_sender.send_message(user.platform, chat_id, text, kb)

    @classmethod
    async def handle_callback(cls, update: UnifiedUpdate) -> bool:
        """Processes all admin callback queries. Returns True if handled."""
        cb = update.callback_query
        if not cb:
            return False

        user = cb.from_user
        if not is_admin(user.id):
            await unified_sender.answer_callback(user.platform, cb.id, "⛔️ دسترسی غیرمجاز!", show_alert=True)
            return True

        data = cb.data
        chat_id = update.chat_id
        msg_id = cb.message.message_id if cb.message else 0

        # 1. Main Admin Panel
        if data == "cb_admin_panel":
            await cls.show_admin_panel(update)
            return True

        # 2. Detailed Statistics
        if data == "cb_admin_stats":
            stats = db.get_system_stats()
            text = (
                "📊 <b>آمار زنده و تجمیعی سوپر ربات</b>\n"
                "━━━━━━━━━━━━━━━━━━━━\n"
                f"👥 <b>کل کاربران:</b> {stats['total_users']:,} نفر\n"
                f"├ 🔹 کاربران تلگرام: {stats['telegram_users']:,}\n"
                f"├ 🔸 کاربران بله: {stats['bale_users']:,}\n"
                f"└ 🔻 کاربران روبیکا: {stats['rubika_users']:,}\n\n"
                f"⚡️ <b>کاربران فعال امروز:</b> {stats['today_active_users']:,}\n"
                f"💎 <b>کاربران ویژه (VIP):</b> {stats['vip_users']:,}\n"
                f"🚫 <b>کاربران مسدود شده:</b> {stats['banned_users']:,}\n"
                f"🔗 <b>مجموع معرفی‌ها:</b> {stats['total_referrals']:,}\n"
                f"🎫 <b>تیکت‌های باز:</b> {stats['open_tickets']:,}\n"
                f"⚙️ <b>حالت تعمیرات:</b> {'فعال 🔴' if stats['maintenance_mode'] else 'غیرفعال (عادی) 🟢'}\n"
                "━━━━━━━━━━━━━━━━━━━━"
            )
            kb = UnifiedInlineKeyboard()
            kb.add_row(UnifiedInlineButton(text="🔄 بروزرسانی آمار", callback_data="cb_admin_stats"))
            kb.add_row(UnifiedInlineButton(text="🔙 بازگشت به پنل ادمین", callback_data="cb_admin_panel"))

            await unified_sender.edit_message_text(user.platform, chat_id, msg_id, text, kb)
            await unified_sender.answer_callback(user.platform, cb.id)
            return True

        # 3. Toggle Maintenance Mode
        if data == "cb_admin_maintenance":
            current = db.get_setting("maintenance_mode", "0")
            new_val = "0" if current == "1" else "1"
            db.set_setting("maintenance_mode", new_val)
            db.log_admin_action(user.id, user.platform, "toggle_maintenance", details=f"Set to {new_val}")

            status_text = "فعال 🔴" if new_val == "1" else "غیرفعال (عادی) 🟢"
            await unified_sender.answer_callback(
                user.platform,
                cb.id,
                f"وضعیت تعمیرات تغییر کرد: {status_text}",
                show_alert=True
            )
            await cls.show_admin_panel(update)
            return True

        # 4. Broadcast Prompt
        if data == "cb_admin_broadcast":
            StateManager.set(user.platform, user.id, States.ADMIN_BROADCAST_TEXT)
            text = (
                "📢 <b>ارسال پیام همگانی به تمام کاربران</b>\n\n"
                "پیام موردنظر خود را ارسال کنید تا به تمام کاربران فعال در "
                "<b>تلگرام</b>، <b>بله</b> و <b>روبیکا</b> ارسال شود.\n\n"
                "💡 متن می‌تواند دارای اموجی و فرمت باشد."
            )
            await unified_sender.edit_message_text(user.platform, chat_id, msg_id, text, cancel_state_keyboard())
            await unified_sender.answer_callback(user.platform, cb.id)
            return True

        # 5. Manage Force Join Channels
        if data == "cb_admin_channels":
            channels = db.get_active_force_channels("all")
            text = "🔒 <b>مدیریت کانال‌های جوین اجباری</b>\n\n"
            kb = UnifiedInlineKeyboard()

            if not channels:
                text += "در حال حاضر هیچ کانالی برای جوین اجباری ثبت نشده است."
            else:
                for ch in channels:
                    text += f"• <b>{ch['channel_title']}</b> ({ch['platform']}): {ch['channel_id']}\n"
                    kb.add_row(
                        UnifiedInlineButton(text=f"❌ حذف {ch['channel_title']}", callback_data=f"cb_del_ch_{ch['channel_id']}")
                    )

            kb.add_row(UnifiedInlineButton(text="➕ افزودن کانال جدید", callback_data="cb_add_ch_prompt"))
            kb.add_row(UnifiedInlineButton(text="🔙 بازگشت به پنل ادمین", callback_data="cb_admin_panel"))

            await unified_sender.edit_message_text(user.platform, chat_id, msg_id, text, kb)
            await unified_sender.answer_callback(user.platform, cb.id)
            return True

        # 6. Add Channel Prompt
        if data == "cb_add_ch_prompt":
            StateManager.set(user.platform, user.id, States.ADMIN_ADD_CHANNEL)
            text = (
                "➕ <b>افزودن کانال جوین اجباری</b>\n\n"
                "اطلاعات کانال را با فرمت زیر در یک خط ارسال کنید:\n\n"
                "<code>پلتفرم | آیدی کانال | عنوان کانال | لینک جوین</code>\n\n"
                "مثال:\n"
                "<code>all | @MyChannel | کانال رسمی | https://t.me/MyChannel</code>"
            )
            await unified_sender.edit_message_text(user.platform, chat_id, msg_id, text, cancel_state_keyboard())
            await unified_sender.answer_callback(user.platform, cb.id)
            return True

        # 7. Delete Channel
        if data.startswith("cb_del_ch_"):
            ch_id = data.replace("cb_del_ch_", "").strip()
            db.remove_force_channel(ch_id)
            db.log_admin_action(user.id, user.platform, "remove_channel", details=ch_id)
            await unified_sender.answer_callback(user.platform, cb.id, f"کانال {ch_id} حذف شد.", show_alert=True)
            # Re-render channels list
            update.callback_query.data = "cb_admin_channels"
            return await cls.handle_callback(update)

        # 8. Give Points Prompt
        if data == "cb_admin_give_points":
            StateManager.set(user.platform, user.id, States.ADMIN_GIVE_POINTS_USER)
            text = (
                "🎁 <b>اهدای امتیاز به کاربر</b>\n\n"
                "لطفاً آیدی عددی کاربر و تعداد امتیاز را با فاصله ارسال کنید:\n\n"
                "فرمت:\n"
                "<code>پلتفرم آیدی_کاربر مقدار</code>\n\n"
                "مثال:\n"
                "<code>telegram 584920194 500</code>"
            )
            await unified_sender.edit_message_text(user.platform, chat_id, msg_id, text, cancel_state_keyboard())
            await unified_sender.answer_callback(user.platform, cb.id)
            return True

        # 9. Ban User Prompt
        if data == "cb_admin_ban":
            StateManager.set(user.platform, user.id, States.ADMIN_BAN_USER)
            text = (
                "🚫 <b>مسدودسازی کاربر (Ban)</b>\n\n"
                "پلتفرم و آیدی عددی کاربر را با فرمت زیر ارسال کنید:\n\n"
                "<code>پلتفرم آیدی_عددی_کاربر</code>\n\n"
                "مثال:\n"
                "<code>telegram 12345678</code>"
            )
            await unified_sender.edit_message_text(user.platform, chat_id, msg_id, text, cancel_state_keyboard())
            await unified_sender.answer_callback(user.platform, cb.id)
            return True

        # 10. Unban User Prompt
        if data == "cb_admin_unban":
            StateManager.set(user.platform, user.id, States.ADMIN_UNBAN_USER)
            text = (
                "✅ <b>رفع مسدودیت کاربر (Unban)</b>\n\n"
                "پلتفرم و آیدی عددی کاربر را با فرمت زیر ارسال کنید:\n\n"
                "<code>پلتفرم آیدی_عددی_کاربر</code>\n\n"
                "مثال:\n"
                "<code>telegram 12345678</code>"
            )
            await unified_sender.edit_message_text(user.platform, chat_id, msg_id, text, cancel_state_keyboard())
            await unified_sender.answer_callback(user.platform, cb.id)
            return True

        # 11. Open Tickets
        if data == "cb_admin_tickets":
            tickets = db.get_open_tickets(limit=10)
            text = "🎫 <b>تیکت‌های باز و بدون پاسخ:</b>\n\n"
            kb = UnifiedInlineKeyboard()
            if not tickets:
                text += "هیچ تیکت بازی وجود ندارد. تمام پیام‌ها پاسخ داده شده‌اند. ✅"
            else:
                for t in tickets:
                    text += (
                        f"🔹 <b>تیکت #{t['id']}</b> ({t['platform']}):\n"
                        f"فرستنده: <code>{t['platform_user_id']}</code>\n"
                        f"پیام: {t['message_text'][:100]}\n"
                        "───────────────\n"
                    )
                    kb.add_row(
                        UnifiedInlineButton(text=f"✉️ پاسخ به تیکت #{t['id']}", callback_data=f"cb_reply_t_{t['id']}")
                    )

            kb.add_row(UnifiedInlineButton(text="🔙 بازگشت به پنل ادمین", callback_data="cb_admin_panel"))
            await unified_sender.edit_message_text(user.platform, chat_id, msg_id, text, kb)
            await unified_sender.answer_callback(user.platform, cb.id)
            return True

        if data.startswith("cb_reply_t_"):
            ticket_id = data.replace("cb_reply_t_", "")
            StateManager.set(user.platform, user.id, States.ADMIN_REPLY_TICKET, {"ticket_id": ticket_id})
            text = f"✍️ لطفاً متن پاسخ خود به <b>تیکت #{ticket_id}</b> را ارسال کنید:"
            await unified_sender.edit_message_text(user.platform, chat_id, msg_id, text, cancel_state_keyboard())
            await unified_sender.answer_callback(user.platform, cb.id)
            return True

        return False

    @classmethod
    async def handle_state_input(cls, update: UnifiedUpdate, state: str, data: Dict[str, Any]) -> bool:
        """Processes message text input when an admin is in an active state."""
        msg = update.message
        if not msg or not msg.text:
            return False

        user = msg.from_user
        if not is_admin(user.id):
            return False

        chat_id = update.chat_id
        raw_text = msg.text.strip()

        # Handle Broadcast State
        if state == States.ADMIN_BROADCAST_TEXT:
            StateManager.clear(user.platform, user.id)
            status_msg = await unified_sender.send_message(
                user.platform, chat_id, "⏳ در حال ارسال همگانی پیام به کاربران سه پلتفرم..."
            )
            targets = db.get_all_user_platform_ids()
            success, fail = await unified_sender.broadcast(targets, raw_text)
            db.log_admin_action(user.id, user.platform, "broadcast", details=f"Success: {success}, Fail: {fail}")

            report = (
                "✅ <b>ارسال همگانی با موفقیت پایان یافت!</b>\n\n"
                f"• تعداد ارسال موفق: <b>{success:,}</b>\n"
                f"• تعداد ناموفق / بلاک: <b>{fail:,}</b>\n"
                f"• مجموع گیرندگان: <b>{len(targets):,}</b>"
            )
            kb = UnifiedInlineKeyboard()
            kb.add_row(UnifiedInlineButton(text="🔙 بازگشت به پنل ادمین", callback_data="cb_admin_panel"))
            await unified_sender.send_message(user.platform, chat_id, report, kb)
            return True

        # Handle Add Channel State
        if state == States.ADMIN_ADD_CHANNEL:
            StateManager.clear(user.platform, user.id)
            parts = [p.strip() for p in raw_text.split("|")]
            if len(parts) < 4:
                await unified_sender.send_message(
                    user.platform,
                    chat_id,
                    "❌ فرمت ارسال شده نادرست بود. لطفاً دوباره تلاش کنید.",
                    cancel_state_keyboard()
                )
                return True

            platform_val, ch_id, title, url = parts[0], parts[1], parts[2], parts[3]
            ok = db.add_force_channel(platform_val, ch_id, title, url)
            db.log_admin_action(user.id, user.platform, "add_channel", details=f"{ch_id} ({platform_val})")

            text = "✅ کانال با موفقیت به لیست جوین اجباری افزوده شد!" if ok else "❌ خطا در ثبت کانال."
            kb = UnifiedInlineKeyboard()
            kb.add_row(UnifiedInlineButton(text="🔒 مشاهده لیست کانال‌ها", callback_data="cb_admin_channels"))
            await unified_sender.send_message(user.platform, chat_id, text, kb)
            return True

        # Handle Give Points State
        if state == States.ADMIN_GIVE_POINTS_USER:
            StateManager.clear(user.platform, user.id)
            parts = raw_text.split()
            if len(parts) < 3:
                await unified_sender.send_message(
                    user.platform,
                    chat_id,
                    "❌ فرمت نادرست. مثال: <code>telegram 123456 100</code>",
                    cancel_state_keyboard()
                )
                return True

            target_platform, target_uid, amount_str = parts[0], parts[1], parts[2]
            try:
                amount = int(amount_str)
            except ValueError:
                await unified_sender.send_message(user.platform, chat_id, "❌ مقدار امتیاز باید عدد باشد.")
                return True

            new_bal = db.add_points(target_platform, target_uid, amount, reason="اهدای امتیاز توسط ادمین")
            db.log_admin_action(user.id, user.platform, "grant_points", target_uid, f"Amount: {amount}")

            # Notify target user
            try:
                await unified_sender.send_message(
                    target_platform,
                    target_uid,
                    f"🎁 <b>تبریک!</b>\n\nتعداد <b>{amount:,} امتیاز</b> از طرف مدیریت به حساب شما افزوده شد.\nموجودی جدید: <b>{new_bal:,}</b>"
                )
            except Exception:
                pass

            kb = UnifiedInlineKeyboard()
            kb.add_row(UnifiedInlineButton(text="🔙 بازگشت به پنل ادمین", callback_data="cb_admin_panel"))
            await unified_sender.send_message(
                user.platform,
                chat_id,
                f"✅ تعداد {amount:,} امتیاز به کاربر {target_uid} ({target_platform}) اضافه شد. موجودی جدید: {new_bal:,}",
                kb
            )
            return True

        # Handle Ban State
        if state == States.ADMIN_BAN_USER:
            StateManager.clear(user.platform, user.id)
            parts = raw_text.split()
            if len(parts) < 2:
                await unified_sender.send_message(user.platform, chat_id, "❌ فرمت نادرست. مثال: <code>telegram 123456</code>")
                return True
            target_p, target_uid = parts[0], parts[1]
            ok = db.ban_user(target_p, target_uid, reason="تصمیم مدیریت")
            db.log_admin_action(user.id, user.platform, "ban_user", target_uid)
            text = f"🚫 کاربر {target_uid} در پلتفرم {target_p} مسدود شد." if ok else "❌ کاربر پیدا نشد."
            kb = UnifiedInlineKeyboard()
            kb.add_row(UnifiedInlineButton(text="🔙 بازگشت به پنل ادمین", callback_data="cb_admin_panel"))
            await unified_sender.send_message(user.platform, chat_id, text, kb)
            return True

        # Handle Unban State
        if state == States.ADMIN_UNBAN_USER:
            StateManager.clear(user.platform, user.id)
            parts = raw_text.split()
            if len(parts) < 2:
                await unified_sender.send_message(user.platform, chat_id, "❌ فرمت نادرست. مثال: <code>telegram 123456</code>")
                return True
            target_p, target_uid = parts[0], parts[1]
            ok = db.unban_user(target_p, target_uid)
            db.log_admin_action(user.id, user.platform, "unban_user", target_uid)
            text = f"✅ کاربر {target_uid} در پلتفرم {target_p} رفع مسدودیت شد." if ok else "❌ کاربر پیدا نشد."
            kb = UnifiedInlineKeyboard()
            kb.add_row(UnifiedInlineButton(text="🔙 بازگشت به پنل ادمین", callback_data="cb_admin_panel"))
            await unified_sender.send_message(user.platform, chat_id, text, kb)
            return True

        # Handle Reply Ticket State
        if state == States.ADMIN_REPLY_TICKET:
            ticket_id = data.get("ticket_id")
            StateManager.clear(user.platform, user.id)
            if not ticket_id:
                return False

            t_record = db.reply_ticket(int(ticket_id), raw_text, user.id)
            if t_record:
                # Send reply to user
                target_platform = t_record["platform"]
                target_uid = t_record["platform_user_id"]
                try:
                    await unified_sender.send_message(
                        target_platform,
                        target_uid,
                        f"✉️ <b>پاسخ پشتیبانی به تیکت #{ticket_id}:</b>\n\n{raw_text}"
                    )
                except Exception:
                    pass

                kb = UnifiedInlineKeyboard()
                kb.add_row(UnifiedInlineButton(text="🎫 لیست تیکت‌ها", callback_data="cb_admin_tickets"))
                await unified_sender.send_message(user.platform, chat_id, f"✅ پاسخ به تیکت #{ticket_id} ارسال شد.", kb)
            return True

        return False
