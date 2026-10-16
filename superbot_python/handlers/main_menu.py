"""
Main Menu & User Navigation Handler
Handles /start, force join checks, module submenus, profile, referrals, and support ticketing.
"""
from typing import Dict, Any, Optional
from datetime import date
from database.database import db
from core.unified_models import UnifiedUpdate, UnifiedPlatform, UnifiedInlineKeyboard, UnifiedInlineButton
from core.unified_sender import unified_sender
from core.state_machine import StateManager, States
from services.force_join import ForceJoinService
from services.referral_service import ReferralService
from keyboards.inline_menus import (
    main_menu_keyboard,
    ai_menu_keyboard,
    media_menu_keyboard,
    tools_menu_keyboard,
    games_menu_keyboard,
    profile_menu_keyboard,
    cancel_state_keyboard,
    back_button,
)
from handlers.admin_panel import is_admin, AdminPanelHandler
from config import DAILY_FREE_POINTS

class MainMenuHandler:
    @classmethod
    async def handle_start(cls, update: UnifiedUpdate):
        user = update.user
        if not user:
            return

        chat_id = update.chat_id
        text_payload = update.message.effective_text if update.message else ""
        ref_id = ReferralService.parse_referral_code(text_payload)

        # 1. Register or fetch user
        user_record, is_new = db.get_or_create_user(
            platform=user.platform.value,
            platform_user_id=user.id,
            username=user.username,
            first_name=user.first_name,
            referrer_platform_id=ref_id
        )

        # 2. Check if user is banned
        if user_record.get("is_banned"):
            ban_reason = user_record.get("ban_reason") or "نقض قوانین ربات"
            await unified_sender.send_message(
                user.platform,
                chat_id,
                f"🚫 <b>حساب کاربری شما مسدود شده است!</b>\n\nعلت: {ban_reason}\nبرای بررسی با پشتیبانی تماس بگیرید."
            )
            return

        # 3. Check Maintenance Mode
        maintenance = db.get_setting("maintenance_mode", "0") == "1"
        if maintenance and not is_admin(user.id):
            await unified_sender.send_message(
                user.platform,
                chat_id,
                "⚙️ <b>ربات در حال حاضر در وضعیت تعمیرات و بروزرسانی است.</b>\n\nلطفاً دقایقی دیگر مجدداً تلاش فرمایید."
            )
            return

        # 4. Enforce Mandatory Channel Subscription
        allowed, lock_text, lock_kb = await ForceJoinService.verify_membership(user.platform.value, user.id)
        if not allowed and lock_text and lock_kb:
            await unified_sender.send_message(user.platform, chat_id, lock_text, lock_kb)
            return

        # 5. Send Welcome Dashboard
        await cls.send_main_dashboard(update, user_record, is_new)

    @classmethod
    async def send_main_dashboard(cls, update: UnifiedUpdate, user_record: Dict[str, Any], is_new: bool = False):
        user = update.user
        chat_id = update.chat_id

        platform_badge = {
            UnifiedPlatform.TELEGRAM: "🔹 تلگرام (Telegram)",
            UnifiedPlatform.BALE: "🔸 بله (Bale)",
            UnifiedPlatform.RUBIKA: "🔻 روبیکا (Rubika)",
        }.get(user.platform, user.platform.value)

        welcome_title = "🎉 <b>به سوپر ربات همه‌کاره خوش آمدید!</b>" if is_new else "👋 <b>درود بر شما، خوش آمدید!</b>"

        text = (
            f"{welcome_title}\n\n"
            f"👤 <b>کاربر:</b> {user.full_name}\n"
            f"🌐 <b>پلتفرم فعال:</b> {platform_badge}\n"
            f"🆔 <b>شناسه عددی:</b> <code>{user.id}</code>\n"
            f"💰 <b>موجودی سکه:</b> <b>{user_record.get('points', 0):,}</b> سکه\n"
            f"💎 <b>الماس‌ها:</b> <b>{user_record.get('diamonds', 0):,}</b> عدد\n"
            f"⭐️ <b>سطح کاربری:</b> {user_record.get('role', 'user').upper()} (سطح {user_record.get('level', 1)})\n\n"
            "جهت استفاده از خدمات، یکی از ماژول‌های ۵گانه زیر را انتخاب کنید:"
        )

        kb = main_menu_keyboard(is_admin=is_admin(user.id))

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
        """Handles navigation between modules and submenus."""
        cb = update.callback_query
        if not cb:
            return False

        user = cb.from_user
        data = cb.data
        chat_id = update.chat_id
        msg_id = cb.message.message_id if cb.message else 0

        # Verify ban
        user_record = db.get_user(user.platform.value, user.id)
        if user_record and user_record.get("is_banned"):
            await unified_sender.answer_callback(user.platform, cb.id, "حساب شما مسدود است.", show_alert=True)
            return True

        # Check membership verification button
        if data == "cb_check_force_join":
            allowed, lock_text, lock_kb = await ForceJoinService.verify_membership(user.platform.value, user.id)
            if not allowed:
                await unified_sender.answer_callback(
                    user.platform,
                    cb.id,
                    "⚠️ شما هنوز در تمام کانال‌ها عضو نشده‌اید. لطفاً عضو شوید سپس کلیک کنید.",
                    show_alert=True
                )
                return True
            else:
                await unified_sender.answer_callback(user.platform, cb.id, "✅ عضویت شما تایید شد!")
                user_rec = db.get_user(user.platform.value, user.id) or {}
                await cls.send_main_dashboard(update, user_rec)
                return True

        # Return to Main Menu
        if data == "cb_main_menu":
            StateManager.clear(user.platform, user.id)
            user_rec = db.get_user(user.platform.value, user.id) or {}
            await cls.send_main_dashboard(update, user_rec)
            return True

        # Cancel active state
        if data == "cb_cancel_state":
            StateManager.clear(user.platform, user.id)
            await unified_sender.answer_callback(user.platform, cb.id, "عملیات لغو شد.")
            user_rec = db.get_user(user.platform.value, user.id) or {}
            await cls.send_main_dashboard(update, user_rec)
            return True

        # ================= MODULE A: AI & VISION =================
        if data == "cb_mod_ai":
            text = (
                "🤖 <b>ماژول A: هوش مصنوعی و پردازش تصویر (AI & Vision)</b>\n\n"
                "• چت هوشمند چندمدله (GPT-4o, DeepSeek, Grok, Groq, Blackbox)\n"
                "• تولید عکس با Dall-E و تبدیل عکس به سبک انیمه / Ghibli\n"
                "• افزایش رزولوشن و شفافیت تصویر (Enhance)\n"
                "• لوگوساز با ۱۴۰ استایل و افکت‌ساز حرفه‌ای\n"
                "• استخراج متن فارسی و انگلیسی از عکس (OCR)\n\n"
                "<i>یکی از ابزارهای زیر را برای شروع انتخاب کنید:</i>"
            )
            await unified_sender.edit_message_text(user.platform, chat_id, msg_id, text, ai_menu_keyboard())
            await unified_sender.answer_callback(user.platform, cb.id)
            return True

        # ================= MODULE B: MEDIA & DOWNLOADER =================
        if data == "cb_mod_media":
            text = (
                "📥 <b>ماژول B: رسانه، موزیک و دانلودر همه‌کاره</b>\n\n"
                "• دانلود بدون واترمارک از اینستاگرام (پست، ریلز، استوری)\n"
                "• آنالیز آماری پیج اینستاگرام (فالوور، نرخ تعامل، عکس پروفایل)\n"
                "• دانلود ویدیوهای یوتیوب با کیفیت‌های مختلف (FullHD, 720p, 480p)\n"
                "• دانلود مستقیم موزیک از اسپاتیفای و رادیوجوان با بالاترین کیفیت ۳۲۰\n"
                "• دانلود از روبیکا و تیک‌تاک\n"
                "• شناسایی نام موزیک (Shazam) از روی فایل صوتی یا ویدیویی\n"
                "• استخراج صدای MP3 از هر ویدیویی با یک کلیک\n\n"
                "<i>سرویس موردنظر خود را برگزینید:</i>"
            )
            await unified_sender.edit_message_text(user.platform, chat_id, msg_id, text, media_menu_keyboard())
            await unified_sender.answer_callback(user.platform, cb.id)
            return True

        # ================= MODULE C: UTILITIES =================
        if data == "cb_mod_tools":
            text = (
                "🛠 <b>ماژول C: ابزارهای کاربردی و خدمات روزانه</b>\n\n"
                "• نرخ لحظه‌ای ارز و رمزارزها (بایننس، نوبیتکس، ارزدیجیتال) با کش ۵ دقیقه‌ای\n"
                "• توزیع کانفیگ‌های VPN پرسرعت (Vmess, Vless, Trojan, Shadowsocks)\n"
                "• آپلودر دائمی و فایل‌گیر با توکن اختصاصی و دیپ‌لینک\n"
                "• اسکرین‌شات از وب‌سایت‌ها (معمولی و فول‌پیج)\n"
                "• کوتاه‌کننده لینک، کامپایلر آنلاین کدهای پایتون/JS/PHP\n"
                "• مزاحم‌یاب و نام‌یاب شماره، نتایج زنده فوتبال، آیدی‌یاب تلگرام/بله/روبیکا\n\n"
                "<i>بخش موردنظر خود را انتخاب فرمایید:</i>"
            )
            await unified_sender.edit_message_text(user.platform, chat_id, msg_id, text, tools_menu_keyboard())
            await unified_sender.answer_callback(user.platform, cb.id)
            return True

        # ================= MODULE D: GAMES & RP =================
        if data == "cb_mod_games":
            text = (
                "🎮 <b>ماژول D: بازی‌های گروهی، سرگرمی و شبیه‌ساز زندگی</b>\n\n"
                "• <b>شبیه‌ساز زندگی و شهر (Life RP):</b>\n"
                "  سن، انرژی، سلامت، تحصیل، ۱۱ شغل با درآمد واقعی، بانکداری و کارت بانکی، "
                "  بورس سهام و طلا، ازدواج، انتخابات شهردار گروه، پلیس و دادگاه!\n"
                "• <b>بازی مافیا آنلاین:</b> سناریوهای ۹ و ۱۲ نفره، توزیع نقش در پیوی، شب و روز، رأی‌گیری شیشه‌ای\n"
                "• <b>هاپ‌پوینت:</b> فارم امتیاز، نبرد حیوانات دست‌آموز در گروه‌ها\n\n"
                "<i>بازی مورد علاقه خود را انتخاب کنید:</i>"
            )
            await unified_sender.edit_message_text(user.platform, chat_id, msg_id, text, games_menu_keyboard())
            await unified_sender.answer_callback(user.platform, cb.id)
            return True

        # ================= PROFILE & ECONOMY =================
        if data == "cb_menu_profile":
            u = db.get_user(user.platform.value, user.id) or {}
            text = (
                "👤 <b>پروفایل کاربری و وضعیت دارایی</b>\n"
                "━━━━━━━━━━━━━━━━━━━━\n"
                f"• نام نمایشی: <b>{user.full_name}</b>\n"
                f"• شناسه در پلتفرم: <code>{user.id}</code>\n"
                f"• پلتفرم: <b>{user.platform.value.upper()}</b>\n"
                f"• موجودی سکه: <b>{u.get('points', 0):,}</b> سکه\n"
                f"• الماس‌ها: <b>{u.get('diamonds', 0):,}</b> 💎\n"
                f"• سطح کاربری: <b>{u.get('role', 'user').upper()}</b> (Lv. {u.get('level', 1)})\n"
                f"• وضعیت VIP: <b>{'فعال ✅' if u.get('is_vip') else 'عادی ⚪️'}</b>\n"
                f"• تعداد معرفی‌ها: <b>{u.get('referral_count', 0):,}</b> کاربر\n"
                "━━━━━━━━━━━━━━━━━━━━\n"
                "💡 هر روز با ورود به ربات می‌توانید هدیه روزانه دریافت کنید."
            )
            await unified_sender.edit_message_text(user.platform, chat_id, msg_id, text, profile_menu_keyboard())
            await unified_sender.answer_callback(user.platform, cb.id)
            return True

        # ================= REFERRAL SYSTEM =================
        if data == "cb_menu_referral":
            ref_link = ReferralService.get_referral_link(user.platform.value, user.id)
            ref_stats = ReferralService.get_referral_stats(user.platform.value, user.id)
            text = (
                "🎁 <b>سیستم کسب سکه با دعوت از دوستان (Referral)</b>\n\n"
                f"به ازای هر کاربری که با لینک اختصاصی شما وارد ربات شود، "
                f"<b>{ref_stats['bonus_per_invite']} سکه رایگان</b> به شما و "
                f"<b>{ref_stats['bonus_for_invited']} سکه هدیه</b> به دوستتان تعلق می‌گیرد!\n\n"
                f"📊 <b>آمار دعوت‌های شما:</b>\n"
                f"• تعداد دوستان معرفی‌شده: <b>{ref_stats['referrals_count']:,}</b> نفر\n"
                f"• مجموع سکه‌های کسب شده: <b>{ref_stats['total_earned_points']:,}</b> سکه\n\n"
                f"🔗 <b>لینک دعوت اختصاصی شما:</b>\n"
                f"<code>{ref_link}</code>\n\n"
                "<i>متن بالا را کپی کرده و برای دوستان و گروه‌های خود بفرستید.</i>"
            )
            kb = UnifiedInlineKeyboard()
            kb.add_row(UnifiedInlineButton(text="🔙 بازگشت به منوی اصلی", callback_data="cb_main_menu"))
            await unified_sender.edit_message_text(user.platform, chat_id, msg_id, text, kb)
            await unified_sender.answer_callback(user.platform, cb.id)
            return True

        # ================= DAILY CLAIM =================
        if data == "cb_claim_daily":
            today_str = date.today().isoformat()
            user_rec = db.get_user(user.platform.value, user.id)
            if not user_rec:
                return True

            with db.get_connection() as conn:
                cur = conn.cursor()
                cur.execute("SELECT id FROM daily_rewards WHERE user_id = ? AND claim_date = ?;", (user_rec["id"], today_str))
                already_claimed = cur.fetchone()

            if already_claimed:
                await unified_sender.answer_callback(
                    user.platform,
                    cb.id,
                    "⚠️ شما هدیه امروز خود را قبلاً دریافت کرده‌اید! فردا دوباره سر بزنید.",
                    show_alert=True
                )
                return True

            # Award daily bonus
            with db.get_connection() as conn:
                cur = conn.cursor()
                cur.execute("""
                    INSERT INTO daily_rewards (user_id, claim_date, points_awarded, created_at)
                    VALUES (?, ?, ?, datetime('now'));
                """, (user_rec["id"], today_str, DAILY_FREE_POINTS))
                conn.commit()

            new_points = db.add_points(user.platform.value, user.id, DAILY_FREE_POINTS, reason="هدیه ورود روزانه")
            await unified_sender.answer_callback(
                user.platform,
                cb.id,
                f"🎉 تبریک! {DAILY_FREE_POINTS} سکه هدیه روزانه به حساب شما افزوده شد.\nموجودی جدید: {new_points:,}",
                show_alert=True
            )
            return True

        # ================= SUPPORT TICKET =================
        if data == "cb_menu_support":
            StateManager.set(user.platform, user.id, States.SUPPORT_WAITING_MESSAGE)
            text = (
                "🎫 <b>ارسال تیکت و پیام به پشتیبانی</b>\n\n"
                "لطفاً انتقاد، پیشنهاد یا مشکل خود را به صورت یک پیام ارسال کنید. "
                "پیام شما به صورت مستقیم برای مدیران ربات ارسال شده و پاسخ در همینجا به دست شما خواهد رسید."
            )
            await unified_sender.edit_message_text(user.platform, chat_id, msg_id, text, cancel_state_keyboard())
            await unified_sender.answer_callback(user.platform, cb.id)
            return True

        # ================= VIP INFO =================
        if data == "cb_menu_vip":
            text = (
                "💎 <b>مزایای عضویت ویژه (VIP Membership)</b>\n\n"
                "• درخواست‌های نامحدود روزانه (بدون محدودیت ۳۰تایی)\n"
                "• اولویت پردازش بالا در تمام مدل‌های هوش مصنوعی (GPT-4o و Grok)\n"
                "• دانلود بدون معطلی و با پهنای باند اختصاصی\n"
                "• دسترسی به تمام ۱۴۰ استایل لوگو و افکت‌های پریمیوم\n"
                "• تگ مخصوص VIP در بازی‌ها و شبیه‌ساز زندگی\n\n"
                "برای فعال‌سازی یا خرید اشتراک VIP، از طریق دکمه «پشتیبانی و تیکت» با ادمین در ارتباط باشید."
            )
            kb = UnifiedInlineKeyboard()
            kb.add_row(UnifiedInlineButton(text="🎫 پیام به ادمین برای VIP", callback_data="cb_menu_support"))
            kb.add_row(back_button())
            await unified_sender.edit_message_text(user.platform, chat_id, msg_id, text, kb)
            await unified_sender.answer_callback(user.platform, cb.id)
            return True

        # Placeholder notices for features ready in next phases
        if data.startswith("cb_ai_") or data.startswith("cb_media_") or data.startswith("cb_tool_") or data.startswith("cb_game_"):
            await unified_sender.answer_callback(
                user.platform,
                cb.id,
                "⚡️ این قابلیت در فازهای بعدی فعال خواهد شد. (فاز ۱: هسته و معماری آماده است)",
                show_alert=True
            )
            return True

        return False

    @classmethod
    async def handle_user_state_input(cls, update: UnifiedUpdate, state: str, data: Dict[str, Any]) -> bool:
        """Handles user message input when in an active state."""
        msg = update.message
        if not msg or not msg.text:
            return False

        user = msg.from_user
        chat_id = update.chat_id
        text = msg.text.strip()

        if state == States.SUPPORT_WAITING_MESSAGE:
            StateManager.clear(user.platform, user.id)
            ticket_id = db.create_support_ticket(user.platform.value, user.id, text)
            response_text = (
                f"✅ <b>تیکت شما با شماره #{ticket_id} با موفقیت ثبت شد!</b>\n\n"
                "مدیریت ربات در اسرع وقت پیام شما را بررسی کرده و پاسخ را از طریق همین ربات برای شما ارسال خواهد نمود."
            )
            kb = UnifiedInlineKeyboard()
            kb.add_row(UnifiedInlineButton(text="🔙 بازگشت به منوی اصلی", callback_data="cb_main_menu"))
            await unified_sender.send_message(user.platform, chat_id, response_text, kb)

            # Notify admins of new ticket
            admin_notice = (
                f"📬 <b>تیکت جدید دریافت شد (#{ticket_id})</b>\n\n"
                f"فرستنده: {user.full_name} (<code>{user.id}</code> در {user.platform.value})\n"
                f"متن پیام: {text}"
            )
            admin_kb = UnifiedInlineKeyboard()
            admin_kb.add_row(UnifiedInlineButton(text="✉️ پاسخ به این تیکت", callback_data=f"cb_reply_t_{ticket_id}"))
            for admin_id in db.get_setting("admin_notification_ids", "").split(","):
                if admin_id.strip():
                    try:
                        await unified_sender.send_message(user.platform, admin_id.strip(), admin_notice, admin_kb)
                    except Exception:
                        pass
            return True

        return False
