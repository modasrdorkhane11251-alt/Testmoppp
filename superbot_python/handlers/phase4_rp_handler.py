"""
SuperBot Phase 4 Handler: Life RP (Career, Economy, Assets, Family, City Governance & Underworld)
Enterprise Python implementation matching multi-platform specifications (Telegram, Bale, Rubika).
"""
import time
import html
from typing import Dict, Any, Optional

from core.unified_models import (
    UnifiedUpdate,
    UnifiedInlineKeyboard,
    UnifiedInlineButton,
)
from core.unified_sender import unified_sender
from database.database import db
from services.phase4_rp_services import LifeRPServices
from keyboards.rp_keyboards import (
    rp_main_dashboard_keyboard,
    rp_jobs_keyboard,
    rp_properties_keyboard,
    rp_crimes_keyboard,
    rp_bank_keyboard,
    rp_hospital_keyboard,
    rp_university_keyboard,
    rp_city_keyboard,
)


class Phase4RPHandler:
    """Dispatches callbacks and state messages for Life RP simulator."""

    @classmethod
    async def handle_callback(cls, update: UnifiedUpdate) -> bool:
        """Processes all Life RP callback queries."""
        cb = update.callback_query
        if not cb or not cb.data:
            return False

        data = cb.data
        user = cb.from_user
        chat_id = update.chat_id
        msg_id = cb.message.message_id if cb.message else None
        platform = user.platform.value
        platform_user_id = str(user.id)

        # 1. Main RP Hub / Status Card
        if data in ("cb_game_rp", "cb_rp_stats", "cb_rp_refresh"):
            card = LifeRPServices.get_citizen_card(platform, platform_user_id)
            u = card["user"]
            stats = card["stats"]
            is_jailed = card["is_jailed"]

            jail_notice = ""
            if is_jailed:
                jail_notice = (
                    f"\n🚨 <b>وضعیت قضایی: در حال گذراندن حبس در زندان!</b>\n"
                    f"<i>مدت باقیمانده: {card['remaining_jail']} ثانیه (می‌توانید با وثیقه آزاد شوید)</i>\n"
                )

            # Format status bars
            energy_bar = "🟩" * (stats["energy"] // 10) + "⬜️" * (10 - (stats["energy"] // 10))
            health_bar = "❤️" * (stats["health"] // 10) + "🤍" * (10 - (stats["health"] // 10))

            text = (
                f"🏙 <b>کارت شهروندی و شبیه‌ساز زندگی (Life RP)</b>\n"
                f"━━━━━━━━━━━━━━━━━━━\n"
                f"👤 <b>نام شهروند:</b> {html.escape(user.first_name or 'شهروند')}\n"
                f"🆔 <b>شناسه ملی:</b> <code>{platform}:{user.id}</code>\n"
                f"⭐ <b>سطح (Level):</b> {u.get('level', 1)} | <b>تجربه (XP):</b> {u.get('xp', 0):,}\n"
                f"💼 <b>شغل فعلی:</b> <b>{card['job_title']}</b>\n"
                f"💍 <b>وضعیت تاهل:</b> {card['partner_display']}\n"
                f"{jail_notice}━━━━━━━━━━━━━━━━━━━\n"
                f"📊 <b>علائم حیاتی و وضعیت روحی:</b>\n"
                f"⚡️ <b>انرژی:</b> {stats['energy']}%  {energy_bar}\n"
                f"💉 <b>سلامتی:</b> {stats['health']}%  {health_bar}\n"
                f"😄 <b>شادی و انگیزه:</b> {stats['happiness']}%\n"
                f"🧠 <b>سطح هوش و دانش:</b> {stats['intelligence']}\n"
                f"⚡️ <b>استرس:</b> {stats['stress']}% | 🍕 <b>گرسنگی:</b> {stats['hunger']}%\n"
                f"━━━━━━━━━━━━━━━━━━━\n"
                f"💰 <b>اقتصاد و دارایی‌ها:</b>\n"
                f"💵 <b>کیف پول نقد:</b> <b>{u.get('points', 0):,} سکه</b>\n"
                f"🏦 <b>سپرده بانکی:</b> {stats.get('bank_balance', 0):,} سکه\n"
                f"📉 <b>بدهی وام:</b> {stats.get('loan', 0):,} سکه\n"
                f"💎 <b>کل ثروت خالص:</b> <b>{card['net_worth']:,} سکه</b>\n"
                f"🏢 <b>درآمد املاک:</b> <b>+{card['hourly_income']:,} سکه/ساعت</b>\n"
                f"━━━━━━━━━━━━━━━━━━━\n"
                f"<i>از دکمه‌های زیر برای تعامل با شهر، کار، سرمایه‌گذاری و تفریح استفاده کنید:</i>"
            )

            kb = rp_main_dashboard_keyboard(is_jailed=is_jailed)
            if msg_id:
                await unified_sender.edit_message_text(user.platform, chat_id, msg_id, text, kb)
            else:
                await unified_sender.send_message(user.platform, chat_id, text, kb)
            await unified_sender.answer_callback(user.platform, cb.id)
            return True

        # 2. Jobs Menu
        if data == "cb_rp_jobs":
            stats = db.get_or_create_rp_stats(platform, platform_user_id)
            current_job_key = stats.get("job")
            job_info = LifeRPServices.JOBS.get(current_job_key or "", {})
            current_name = job_info.get("name", "بیکار و جویای کار")

            text = (
                f"💼 <b>مرکز کاریابی و بازار کار شهر</b>\n"
                f"━━━━━━━━━━━━━━━━━━━\n"
                f"• شغل فعلی شما: <b>{current_name}</b>\n"
            )
            if job_info:
                text += (
                    f"• دستمزد هر شیفت: <b>+{job_info['pay']:,} سکه</b>\n"
                    f"• مصرف انرژی: <b>{job_info['energy']}%</b>\n"
                    f"• تجربه دریافتی: <b>+{job_info['xp']} XP</b>\n"
                    f"• شرح وظایف: <i>{job_info['desc']}</i>\n"
                )
            text += (
                f"━━━━━━━━━━━━━━━━━━━\n"
                f"📋 <b>شرایط استخدام:</b>\n"
                f"برای تصاحب مشاغل سطح بالاتر مانند برنامه‌نویس، پزشک و مدیر به سطح لول بالاتر و هوش تحصیلی کافی (دانشگاه) نیاز دارید.\n\n"
                f"<i>یک شغل را جهت استخدام انتخاب کنید، یا در صورت داشتن شغل روی «شروع شیفت کاری» کلیک نمایید:</i>"
            )
            kb = rp_jobs_keyboard(current_job=current_job_key)
            await unified_sender.edit_message_text(user.platform, chat_id, msg_id, text, kb)
            await unified_sender.answer_callback(user.platform, cb.id)
            return True

        # 3. Perform Work Shift
        if data == "cb_rp_do_work":
            res = LifeRPServices.do_work(platform, platform_user_id)
            if not res["ok"]:
                await unified_sender.answer_callback(user.platform, cb.id, res["error"], show_alert=True)
                return True

            await unified_sender.answer_callback(user.platform, cb.id, f"✅ شیفت کاری با موفقیت انجام شد! +{res['wage']:,} سکه", show_alert=True)
            # Re-render jobs menu to reflect updated energy
            stats = db.get_or_create_rp_stats(platform, platform_user_id)
            kb = rp_jobs_keyboard(current_job=stats.get("job"))
            text = (
                f"{res['message']}\n\n"
                f"━━━━━━━━━━━━━━━━━━━\n"
                f"<i>می‌توانید پس از استراحت مجدداً شیفت کاری بعدی را شروع کنید.</i>"
            )
            await unified_sender.edit_message_text(user.platform, chat_id, msg_id, text, kb)
            return True

        # 4. Apply for a specific job
        if data.startswith("cb_rp_job_"):
            job_key = data.replace("cb_rp_job_", "")
            res = LifeRPServices.apply_job(platform, platform_user_id, job_key)
            if not res["ok"]:
                await unified_sender.answer_callback(user.platform, cb.id, res["error"], show_alert=True)
                return True

            await unified_sender.answer_callback(user.platform, cb.id, "🎉 استخدام شما تایید شد!", show_alert=True)
            kb = rp_jobs_keyboard(current_job=job_key)
            await unified_sender.edit_message_text(user.platform, chat_id, msg_id, res["message"], kb)
            return True

        # 5. Real Estate & Properties Menu
        if data == "cb_rp_properties":
            card = LifeRPServices.get_citizen_card(platform, platform_user_id)
            assets = card["assets"]
            u = card["user"]

            owned_summary = "هنوز ملکی خریداری نکرده‌اید."
            if assets:
                counts: Dict[str, int] = {}
                for a in assets:
                    counts[a["item_key"]] = counts.get(a["item_key"], 0) + 1
                lines = []
                for k, cnt in counts.items():
                    p_info = LifeRPServices.PROPERTIES.get(k, {})
                    lines.append(f"• {p_info.get('name', k)}: <b>{cnt} عدد</b> (+{p_info.get('income', 0) * cnt:,} سکه/ساعت)")
                owned_summary = "\n".join(lines)

            text = (
                f"🏢 <b>سامانه املاک و مستغلات و درآمد غیرفعال</b>\n"
                f"━━━━━━━━━━━━━━━━━━━\n"
                f"💵 موجودی نقد شما: <b>{u.get('points', 0):,} سکه</b>\n"
                f"📈 کل درآمد ساعتی املاک: <b>+{card['hourly_income']:,} سکه/ساعت</b>\n\n"
                f"🏡 <b>املاک تحت مالکیت شما:</b>\n"
                f"{owned_summary}\n"
                f"━━━━━━━━━━━━━━━━━━━\n"
                f"<i>برای خرید ملک روی گزینه‌های زیر کلیک کنید. درآمد املاک هر ساعت به طور خودکار محاسبه شده و می‌توانید با زدن دکمه «برداشت سود» آن را دریافت نمایید:</i>"
            )
            kb = rp_properties_keyboard(has_income_to_claim=card["hourly_income"] > 0)
            await unified_sender.edit_message_text(user.platform, chat_id, msg_id, text, kb)
            await unified_sender.answer_callback(user.platform, cb.id)
            return True

        # 6. Buy Property
        if data.startswith("cb_rp_buy_"):
            prop_key = data.replace("cb_rp_buy_", "")
            res = LifeRPServices.buy_property(platform, platform_user_id, prop_key)
            if not res["ok"]:
                await unified_sender.answer_callback(user.platform, cb.id, res["error"], show_alert=True)
                return True

            await unified_sender.answer_callback(user.platform, cb.id, "🎉 سند مالکیت با موفقیت ثبت شد!", show_alert=True)
            kb = rp_properties_keyboard(has_income_to_claim=True)
            await unified_sender.edit_message_text(user.platform, chat_id, msg_id, res["message"], kb)
            return True

        # 7. Claim Property Rent / Income
        if data == "cb_rp_claim_income":
            res = LifeRPServices.claim_property_income(platform, platform_user_id)
            if not res["ok"]:
                await unified_sender.answer_callback(user.platform, cb.id, res["error"], show_alert=True)
                return True

            await unified_sender.answer_callback(user.platform, cb.id, f"💰 مبلغ +{res['payout']:,} سکه واریز شد!", show_alert=True)
            kb = rp_properties_keyboard(has_income_to_claim=True)
            await unified_sender.edit_message_text(user.platform, chat_id, msg_id, res["message"], kb)
            return True

        # 8. Banking Hub
        if data == "cb_rp_bank":
            u = db.get_user(platform, platform_user_id) or {}
            stats = db.get_or_create_rp_stats(platform, platform_user_id)
            level = u.get("level", 1) or 1
            max_loan = min(200000, level * 25000 + 10000)

            text = (
                f"🏦 <b>بانک مرکزی و خدمات ارزی شهروندان</b>\n"
                f"━━━━━━━━━━━━━━━━━━━\n"
                f"💳 <b>شماره حساب شهروندی:</b> <code>RP-{platform_user_id}</code>\n"
                f"💵 موجودی نقد (کیف پول): <b>{u.get('points', 0):,} سکه</b>\n"
                f"🏛 موجودی حساب سپرده: <b>{stats.get('bank_balance', 0):,} سکه</b>\n"
                f"📉 بدهی تسهیلات (وام): <b>{stats.get('loan', 0):,} سکه</b>\n"
                f"━━━━━━━━━━━━━━━━━━━\n"
                f"🛡 سقف وام قابل دریافت برای سطح {level}: <b>{max_loan:,} سکه</b>\n\n"
                f"<i>عملیات بانکی مورد نظر خود را انتخاب کنید:</i>"
            )
            kb = rp_bank_keyboard()
            await unified_sender.edit_message_text(user.platform, chat_id, msg_id, text, kb)
            await unified_sender.answer_callback(user.platform, cb.id)
            return True

        # 9. Quick Bank Actions (Deposit, Withdraw, Loan, Repay)
        if data == "cb_rp_bank_deposit":
            u = db.get_user(platform, platform_user_id) or {}
            cash = u.get("points", 0) or 0
            if cash <= 0:
                await unified_sender.answer_callback(user.platform, cb.id, "موجودی نقد شما صفر است!", show_alert=True)
                return True
            # Deposit all cash
            res = LifeRPServices.deposit_to_bank(platform, platform_user_id, cash)
            await unified_sender.answer_callback(user.platform, cb.id, f"✅ مبلغ {cash:,} سکه واریز شد.", show_alert=True)
            kb = rp_bank_keyboard()
            await unified_sender.edit_message_text(user.platform, chat_id, msg_id, res["message"], kb)
            return True

        if data == "cb_rp_bank_withdraw":
            stats = db.get_or_create_rp_stats(platform, platform_user_id)
            bank_bal = stats.get("bank_balance", 0) or 0
            if bank_bal <= 0:
                await unified_sender.answer_callback(user.platform, cb.id, "موجودی حساب بانکی شما صفر است!", show_alert=True)
                return True
            # Withdraw 50% or 10,000
            withdraw_amt = min(bank_bal, max(5000, bank_bal // 2))
            res = LifeRPServices.withdraw_from_bank(platform, platform_user_id, withdraw_amt)
            await unified_sender.answer_callback(user.platform, cb.id, f"💵 مبلغ {withdraw_amt:,} سکه برداشت شد.", show_alert=True)
            kb = rp_bank_keyboard()
            await unified_sender.edit_message_text(user.platform, chat_id, msg_id, res["message"], kb)
            return True

        if data == "cb_rp_bank_loan":
            u = db.get_user(platform, platform_user_id) or {}
            level = u.get("level", 1) or 1
            max_loan = min(200000, level * 25000 + 10000)
            res = LifeRPServices.take_loan(platform, platform_user_id, max_loan)
            if not res["ok"]:
                await unified_sender.answer_callback(user.platform, cb.id, res["error"], show_alert=True)
                return True
            await unified_sender.answer_callback(user.platform, cb.id, "🏛 وام بانکی با موفقیت پرداخت شد!", show_alert=True)
            kb = rp_bank_keyboard()
            await unified_sender.edit_message_text(user.platform, chat_id, msg_id, res["message"], kb)
            return True

        if data == "cb_rp_bank_repay":
            stats = db.get_or_create_rp_stats(platform, platform_user_id)
            loan = stats.get("loan", 0) or 0
            if loan <= 0:
                await unified_sender.answer_callback(user.platform, cb.id, "شما بدهی بانکی ندارید!", show_alert=True)
                return True
            u = db.get_user(platform, platform_user_id) or {}
            cash = u.get("points", 0) or 0
            repay_amt = min(cash, loan)
            res = LifeRPServices.repay_loan(platform, platform_user_id, repay_amt)
            if not res["ok"]:
                await unified_sender.answer_callback(user.platform, cb.id, res["error"], show_alert=True)
                return True
            await unified_sender.answer_callback(user.platform, cb.id, f"✅ مبلغ {repay_amt:,} سکه از بدهی تسویه شد.", show_alert=True)
            kb = rp_bank_keyboard()
            await unified_sender.edit_message_text(user.platform, chat_id, msg_id, res["message"], kb)
            return True

        if data == "cb_rp_bank_transfer":
            text = (
                "💸 <b>انتقال کارت به کارت بین شهروندان</b>\n\n"
                "برای انتقال وجه، دستور زیر را در چت ارسال کنید:\n"
                "<code>انتقال 5000 به 12345678</code>\n\n"
                "(جایگزین کردن مبلغ و آیدی عددی کاربر مقصد)"
            )
            kb = rp_bank_keyboard()
            await unified_sender.edit_message_text(user.platform, chat_id, msg_id, text, kb)
            await unified_sender.answer_callback(user.platform, cb.id)
            return True

        # 10. Underworld & Crimes Menu
        if data == "cb_rp_crimes":
            stats = db.get_or_create_rp_stats(platform, platform_user_id)
            now_ts = time.time()
            is_jailed = stats["jailed_until"] > now_ts
            rem_sec = int(stats["jailed_until"] - now_ts) if is_jailed else 0

            text = (
                f"🚨 <b>دنیای زیرزمینی و سرقت‌های سازمان‌یافته</b>\n"
                f"━━━━━━━━━━━━━━━━━━━\n"
                f"⚠️ <i>هشدار: فعالیت‌های غیرقانونی سود مالی بسیار بالایی دارند اما در صورت هوشیاری پلیس، به زندان مرکزی منتقل شده و جریمه نقدی خواهید شد!</i>\n\n"
                f"• سابقه سرقت‌های شما: <b>{stats.get('total_crimes', 0)} مورد</b>\n"
                f"• سرقت‌های موفق: <b>{stats.get('successful_crimes', 0)} مورد</b>\n"
            )
            if is_jailed:
                text += f"\n⛔️ <b>شما هم‌اکنون در بازداشتگاه هستید! ({rem_sec} ثانیه مانده)</b>\n"

            kb = rp_crimes_keyboard()
            await unified_sender.edit_message_text(user.platform, chat_id, msg_id, text, kb)
            await unified_sender.answer_callback(user.platform, cb.id)
            return True

        # 11. Execute Crime
        if data.startswith("cb_rp_crime_"):
            crime_key = data.replace("cb_rp_crime_", "")
            res = LifeRPServices.commit_crime(platform, platform_user_id, crime_key)
            if not res["ok"]:
                await unified_sender.answer_callback(user.platform, cb.id, res["error"], show_alert=True)
                return True

            alert_msg = f"🥷 غنیمت +{res.get('loot', 0):,} سکه" if res.get("success") else f"🚨 دستگیر شدید! {res.get('jail_minutes')} دقیقه زندان"
            await unified_sender.answer_callback(user.platform, cb.id, alert_msg, show_alert=True)
            kb = rp_crimes_keyboard()
            await unified_sender.edit_message_text(user.platform, chat_id, msg_id, res["message"], kb)
            return True

        # 12. Pay Bail to Exit Jail
        if data == "cb_rp_bail":
            res = LifeRPServices.pay_bail(platform, platform_user_id)
            if not res["ok"]:
                await unified_sender.answer_callback(user.platform, cb.id, res["error"], show_alert=True)
                return True

            await unified_sender.answer_callback(user.platform, cb.id, "⚖️ سند وثیقه تایید شد و آزاد شدید!", show_alert=True)
            kb = rp_main_dashboard_keyboard(is_jailed=False)
            await unified_sender.edit_message_text(user.platform, chat_id, msg_id, res["message"], kb)
            return True

        # 13. Hospital & Healthcare
        if data == "cb_rp_hospital":
            stats = db.get_or_create_rp_stats(platform, platform_user_id)
            text = (
                f"🏥 <b>بیمارستان و اورژانس تخصصی شهر</b>\n"
                f"━━━━━━━━━━━━━━━━━━━\n"
                f"❤️ سلامت فعلی: <b>{stats['health']}%</b>\n"
                f"⚡️ انرژی فعلی: <b>{stats['energy']}%</b>\n"
                f"💤 استرس فعلی: <b>{stats['stress']}%</b>\n\n"
                f"<i>با مراجعه به پزشک، سلامت و انرژی شما به ۱۰۰٪ بازگشته و استرس شما کاملاً برطرف خواهد شد.</i>"
            )
            kb = rp_hospital_keyboard()
            await unified_sender.edit_message_text(user.platform, chat_id, msg_id, text, kb)
            await unified_sender.answer_callback(user.platform, cb.id)
            return True

        if data == "cb_rp_heal":
            res = LifeRPServices.visit_hospital(platform, platform_user_id)
            if not res["ok"]:
                await unified_sender.answer_callback(user.platform, cb.id, res["error"], show_alert=True)
                return True
            await unified_sender.answer_callback(user.platform, cb.id, "❤️ سلامتی شما به ۱۰۰٪ رسید!", show_alert=True)
            kb = rp_hospital_keyboard()
            await unified_sender.edit_message_text(user.platform, chat_id, msg_id, res["message"], kb)
            return True

        # 14. University & Education
        if data == "cb_rp_university":
            stats = db.get_or_create_rp_stats(platform, platform_user_id)
            text = (
                f"🎓 <b>دانشگاه و آکادمی عالی علوم کاربردی</b>\n"
                f"━━━━━━━━━━━━━━━━━━━\n"
                f"🧠 سطح هوش و تخصص شما: <b>{stats['intelligence']}</b>\n\n"
                f"📚 <b>حداقل هوش مورد نیاز مشاغل برتر:</b>\n"
                f"• برنامه‌نویس: هوش ۳۵\n"
                f"• پزشک و جراح: هوش ۵۰\n"
                f"• مدیر ارشد: هوش ۶۰\n"
                f"• سرمایه‌گذار بورس: هوش ۷۵\n\n"
                f"<i>با گذراندن هر ترم تحصیلی (شهریه: ۱,۵۰۰ سکه)، سطح هوش شما ۴ واحد ارتقا می‌یابد.</i>"
            )
            kb = rp_university_keyboard()
            await unified_sender.edit_message_text(user.platform, chat_id, msg_id, text, kb)
            await unified_sender.answer_callback(user.platform, cb.id)
            return True

        if data == "cb_rp_study":
            res = LifeRPServices.study_university(platform, platform_user_id)
            if not res["ok"]:
                await unified_sender.answer_callback(user.platform, cb.id, res["error"], show_alert=True)
                return True
            await unified_sender.answer_callback(user.platform, cb.id, f"🎓 هوش شما به {res['new_intel']} رسید!", show_alert=True)
            kb = rp_university_keyboard()
            await unified_sender.edit_message_text(user.platform, chat_id, msg_id, res["message"], kb)
            return True

        # 15. City Governance & Mayor
        if data == "cb_rp_city":
            city_data = LifeRPServices.get_city_dashboard(str(chat_id))
            text = (
                f"🏙 <b>شورای شهر و شهرداری: {city_data['name']}</b>\n"
                f"━━━━━━━━━━━━━━━━━━━\n"
                f"👑 <b>شهردار منتخب:</b> {city_data['mayor']}\n"
                f"🏛 <b>بودجه خزانه شهرداری:</b> {city_data['budget']:,} سکه\n"
                f"⭐ <b>امتیاز آبادانی شهر:</b> {city_data['score']}\n"
                f"📈 <b>نرخ مالیات شهری:</b> {int(city_data['tax_rate'] * 100)}%\n\n"
                f"<i>شهروندان می‌توانند با اهدای کمک مالی به توسعه و آبادانی شهر خود در گروه کمک کنند.</i>"
            )
            kb = rp_city_keyboard()
            await unified_sender.edit_message_text(user.platform, chat_id, msg_id, text, kb)
            await unified_sender.answer_callback(user.platform, cb.id)
            return True

        if data == "cb_rp_city_donate":
            res = LifeRPServices.donate_to_city(platform, platform_user_id, str(chat_id), 5000)
            if not res["ok"]:
                await unified_sender.answer_callback(user.platform, cb.id, res["error"], show_alert=True)
                return True
            await unified_sender.answer_callback(user.platform, cb.id, "🏛 ۵,۰۰۰ سکه به خزانه شهر اهدا شد!", show_alert=True)
            kb = rp_city_keyboard()
            await unified_sender.edit_message_text(user.platform, chat_id, msg_id, res["message"], kb)
            return True

        # 16. Family & Marriage
        if data == "cb_rp_family":
            stats = db.get_or_create_rp_stats(platform, platform_user_id)
            marriage = db.get_active_marriage(stats["uid"])
            if marriage:
                partner_uid = marriage["user2_uid"] if marriage["user1_uid"] == stats["uid"] else marriage["user1_uid"]
                text = (
                    f"💍 <b>کانون خانواده و وضعیت تاهل</b>\n"
                    f"━━━━━━━━━━━━━━━━━━━\n"
                    f"❤️ وضعیت: <b>متاهل</b>\n"
                    f"👤 همسر: <code>{partner_uid}</code>\n"
                    f"💎 مهریه ثبت‌شده: <b>{marriage['dowry']:,} سکه</b>\n"
                    f"📅 تاریخ عقد: <i>{marriage['married_at'][:10]}</i>\n\n"
                    f"<i>برای ثبت طلاق توافقی می‌توانید با پشتیبانی یا دستورات متنی اقدام کنید.</i>"
                )
            else:
                text = (
                    f"💍 <b>امور ازدواج و تشکیل خانواده</b>\n"
                    f"━━━━━━━━━━━━━━━━━━━\n"
                    f"وضعیت: <b>مجرد</b>\n\n"
                    f"برای خواستگاری و پیوند ازدواج با یک شهروند در گروه، روی پیام او ریپلای کرده و بنویسید:\n"
                    f"<code>خواستگاری 1000</code>\n"
                    f"(عدد مهریه به سکه)"
                )
            kb = UnifiedInlineKeyboard()
            kb.add_row(UnifiedInlineButton(text="🔙 بازگشت به Life RP", callback_data="cb_game_rp"))
            await unified_sender.edit_message_text(user.platform, chat_id, msg_id, text, kb)
            await unified_sender.answer_callback(user.platform, cb.id)
            return True

        # 17. Leaderboard (Forbes of Life RP)
        if data == "cb_rp_leaderboard":
            leaders = db.get_rp_leaderboard(10)
            lines = []
            medals = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"]
            for idx, citizen in enumerate(leaders):
                medal = medals[idx] if idx < len(medals) else f"#{idx+1}"
                name = html.escape(citizen.get("first_name") or citizen.get("username") or citizen.get("uid", "شهروند"))
                net_worth = (citizen.get("bank_balance", 0) or 0) + (citizen.get("cash_points", 0) or 0) - (citizen.get("loan", 0) or 0)
                job_k = citizen.get("job") or "بیکار"
                job_name = LifeRPServices.JOBS.get(job_k, {}).get("name", job_k)
                lines.append(f"{medal} <b>{name}</b> ({job_name})\n    💰 کل ثروت: <b>{net_worth:,} سکه</b>")

            board_text = "\n\n".join(lines) if lines else "هنوز داده‌ای برای رتبه‌بندی ثبت نشده است."
            text = (
                f"🏆 <b>فهرست ۱۰ ثروتمند برتر شهر (Forbes Life RP)</b>\n"
                f"━━━━━━━━━━━━━━━━━━━\n"
                f"{board_text}\n"
                f"━━━━━━━━━━━━━━━━━━━\n"
                f"<i>محاسبه بر اساس مجموع (پول نقد + سپرده بانکی - بدهی وام)</i>"
            )
            kb = UnifiedInlineKeyboard()
            kb.add_row(UnifiedInlineButton(text="🔙 بازگشت به Life RP", callback_data="cb_game_rp"))
            await unified_sender.edit_message_text(user.platform, chat_id, msg_id, text, kb)
            await unified_sender.answer_callback(user.platform, cb.id)
            return True

        # 18. Mafia Online Hub
        if data == "cb_game_mafia":
            text = (
                "🕵️‍♂️ <b>بازی آنلاین و گروهی مافیا (Mafia Online)</b>\n"
                "━━━━━━━━━━━━━━━━━━━━\n"
                "• <b>پلتفرم‌های پشتیبانی‌شده:</b> تلگرام، بله و روبیکا\n"
                "• <b>سیستم هوشمند:</b> توزیع محرمانه نقش‌ها در پیوی بازیکنان، اعلام خودکار فازهای شب و روز، "
                "امکان رأی‌گیری شیشه‌ای آنلاین و دفاعیه متهمان!\n\n"
                "🎭 <b>سناریوهای فعال:</b>\n"
                "  1️⃣ سناریو ۹ نفره کلاسیک (پدرخوانده، دکتر لکتر، شهروند ساده، کارآگاه، اسنایپر)\n"
                "  2️⃣ سناریو ۱۲ نفره بازپرس و ناتاشا (همراه با زره‌پوش و تفنگ‌دار)\n\n"
                "<i>یکی از گزینه‌های زیر را انتخاب فرمایید:</i>"
            )
            kb = UnifiedInlineKeyboard()
            kb.add_row(
                UnifiedInlineButton(text="🚀 ثبت‌نام و تشکیل لابی در گروه", callback_data="cb_mafia_lobby"),
                UnifiedInlineButton(text="📜 راهنمای کامل نقش‌ها", callback_data="cb_mafia_roles")
            )
            kb.add_row(
                UnifiedInlineButton(text="🎲 سناریوهای بازی", callback_data="cb_mafia_scenarios"),
                UnifiedInlineButton(text="🔙 بازگشت به منوی بازی‌ها", callback_data="cb_mod_games")
            )
            await unified_sender.edit_message_text(user.platform, chat_id, msg_id, text, kb)
            await unified_sender.answer_callback(user.platform, cb.id)
            return True

        if data == "cb_mafia_roles":
            text = (
                "🎭 <b>راهنمای نقش‌های بازی مافیا:</b>\n"
                "━━━━━━━━━━━━━━━━━━━━\n"
                "🔫 <b>پدرخوانده (Godfather):</b> رئیس تیم مافیا، استعلام کارآگاه برای او همیشه منفی (شهروند) است و تیر شب را شلیک می‌کند.\n"
                "🩺 <b>دکتر لکتر (Doctor Lecter):</b> پزشک تیم مافیا، می‌تواند هر شب یک عضو مافیا (یا یک بار خودش) را از شلیک اسنایپر نجات دهد.\n"
                "🕵️ <b>کارآگاه (Detective):</b> هر شب هویت یک بازیکن را استعلام می‌گیرد.\n"
                "💉 <b>پزشک شهر (Doctor):</b> هر شب یک نفر از شهروندان را درمان می‌کند تا در صورت شلیک مافیا زنده بماند.\n"
                "🎯 <b>تک‌تیرانداز / اسنایپر (Sniper):</b> هر شب می‌تواند شلیک کند؛ اگر مافیا را بزند کشته می‌شود و اگر به شهروند شلیک کند خودش از بازی حذف می‌شود!\n"
                "🛡 <b>زره‌پوش (Armored):</b> دارای زره محافظ است و در فاز شب با یک تیر کشته نمی‌شود."
            )
            kb = UnifiedInlineKeyboard()
            kb.add_row(UnifiedInlineButton(text="🔙 بازگشت به مافیا", callback_data="cb_game_mafia"))
            await unified_sender.edit_message_text(user.platform, chat_id, msg_id, text, kb)
            await unified_sender.answer_callback(user.platform, cb.id)
            return True

        if data == "cb_mafia_scenarios":
            text = (
                "🎲 <b>سناریوهای استاندارد بازی مافیا:</b>\n"
                "━━━━━━━━━━━━━━━━━━━━\n"
                "▫️ <b>سناریوی ۹ نفره:</b>\n"
                "  • تیم مافیا (۳ نفر): پدرخوانده، دکتر لکتر، مافیای ساده\n"
                "  • تیم شهروندی (۶ نفر): دکتر، کارآگاه، اسنایپر، ۳ شهروند ساده\n\n"
                "▫️ <b>سناریوی ۱۲ نفره:</b>\n"
                "  • تیم مافیا (۴ نفر): پدرخوانده، ماتادور، دکتر لکتر، مافیای ساده\n"
                "  • تیم شهروندی (۸ نفر): دکتر، کارآگاه، تک‌تیرانداز، تفنگ‌دار، زره‌پوش، ۳ شهروند ساده\n\n"
                "💡 <i>ربات به صورت کاملاً خودکار در گروه‌ها لابی تشکیل می‌دهد و استعلام شب را در پیام خصوصی (PV) دریافت و ارسال می‌کند.</i>"
            )
            kb = UnifiedInlineKeyboard()
            kb.add_row(UnifiedInlineButton(text="🔙 بازگشت به مافیا", callback_data="cb_game_mafia"))
            await unified_sender.edit_message_text(user.platform, chat_id, msg_id, text, kb)
            await unified_sender.answer_callback(user.platform, cb.id)
            return True

        if data == "cb_mafia_lobby":
            text = (
                "🚀 <b>راه‌اندازی بازی مافیا در گروه‌ها</b>\n\n"
                "برای شروع یک دست بازی هیجان‌انگیز مافیا، ربات را به گروه خود اضافه کرده و پیام زیر را در گروه بفرستید:\n"
                "<code>مافیا شروع</code> یا <code>/mafia</code>\n\n"
                "ربات پنل شیشه‌ای ثبت‌نام آنلاین با لیست زنده بازیکنان را باز خواهد کرد!"
            )
            kb = UnifiedInlineKeyboard()
            kb.add_row(UnifiedInlineButton(text="🔙 بازگشت به مافیا", callback_data="cb_game_mafia"))
            await unified_sender.edit_message_text(user.platform, chat_id, msg_id, text, kb)
            await unified_sender.answer_callback(user.platform, cb.id)
            return True

        # 19. HopPoint Pet Game
        if data in ("cb_game_hoppoint", "cb_hop_refresh"):
            uid = f"{platform}_{platform_user_id}"
            pet = db.get_or_create_pet(uid)
            text = (
                f"🐾 <b>سامانه هاپ‌پوینت و پرورش حیوان خانگی (HopPoint)</b>\n"
                f"━━━━━━━━━━━━━━━━━━━━\n"
                f"🐶 نام حیوان: <b>{html.escape(pet.get('pet_name') or 'گرگ قهرمان')}</b>\n"
                f"🧬 نژاد: <b>{pet.get('species')}</b>\n"
                f"⭐ سطح (Level): <b>{pet.get('level')}</b> (تجربه: {pet.get('xp')}/100)\n"
                f"⚡️ انرژی: <b>{pet.get('energy')}%</b>\n"
                f"🍗 گرسنگی: <b>{pet.get('hunger')}%</b>\n"
                f"⚔️ قدرت رزمی (Power): <b>{pet.get('power')}</b>\n"
                f"🏆 رکورد آرنا: <b>{pet.get('wins')} برد</b> | <b>{pet.get('losses')} باخت</b>\n"
                f"━━━━━━━━━━━━━━━━━━━━\n"
                f"💡 <i>با غذادادن و تمرین دادن به حیوان خود، آن را برای نبردهای جایزه‌دار آماده کنید!</i>"
            )
            kb = UnifiedInlineKeyboard()
            kb.add_row(
                UnifiedInlineButton(text="🍖 غذا دادن (-25% گرسنگی)", callback_data="cb_hop_feed"),
                UnifiedInlineButton(text="🏋️ تمرین (+قدرت، +XP)", callback_data="cb_hop_train")
            )
            kb.add_row(
                UnifiedInlineButton(text="⚔️ نبرد در آرنا (جایزه سکه)", callback_data="cb_hop_battle"),
                UnifiedInlineButton(text="🔄 بروزرسانی", callback_data="cb_hop_refresh")
            )
            kb.add_row(UnifiedInlineButton(text="🔙 بازگشت به منوی بازی‌ها", callback_data="cb_mod_games"))
            await unified_sender.edit_message_text(user.platform, chat_id, msg_id, text, kb)
            await unified_sender.answer_callback(user.platform, cb.id)
            return True

        if data == "cb_hop_feed":
            uid = f"{platform}_{platform_user_id}"
            pet = db.get_or_create_pet(uid)
            new_hunger = max(0, pet.get("hunger", 0) - 30)
            new_energy = min(100, pet.get("energy", 0) + 20)
            new_xp = pet.get("xp", 0) + 15
            db.update_pet(uid, hunger=new_hunger, energy=new_energy, xp=new_xp)
            await unified_sender.answer_callback(user.platform, cb.id, "🍖 غذای لذیذ به حیوان داده شد! انرژی و شادابی افزایش یافت.", show_alert=True)
            return True

        if data == "cb_hop_train":
            uid = f"{platform}_{platform_user_id}"
            pet = db.get_or_create_pet(uid)
            if pet.get("energy", 0) < 20:
                await unified_sender.answer_callback(user.platform, cb.id, "❌ انرژی حیوان کافی نیست! ابتدا به آن غذا بدهید یا استراحت کند.", show_alert=True)
                return True
            new_energy = max(0, pet.get("energy", 0) - 20)
            new_power = pet.get("power", 25) + 5
            new_xp = pet.get("xp", 0) + 25
            new_lvl = pet.get("level", 1)
            if new_xp >= 100:
                new_lvl += 1
                new_xp = new_xp - 100
                new_power += 10
            db.update_pet(uid, energy=new_energy, power=new_power, xp=new_xp, level=new_lvl)
            await unified_sender.answer_callback(user.platform, cb.id, f"🏋️ تمرین سنگین انجام شد! قدرت رزمی به {new_power} رسید.", show_alert=True)
            return True

        if data == "cb_hop_battle":
            uid = f"{platform}_{platform_user_id}"
            pet = db.get_or_create_pet(uid)
            if pet.get("energy", 0) < 25:
                await unified_sender.answer_callback(user.platform, cb.id, "❌ حیوان شما خسته است و توان مبارزه در آرنا را ندارد!", show_alert=True)
                return True
            opponents = ["گرگ درنده کوهستان", "ببر سایه", "عقاب سرسخت", "شاهین وحشی", "شیر خشمگین"]
            opp = random.choice(opponents)
            opp_power = random.randint(max(15, pet.get("power", 25) - 15), pet.get("power", 25) + 15)
            is_win = pet.get("power", 25) >= opp_power
            new_energy = max(0, pet.get("energy", 0) - 25)
            new_hunger = min(100, pet.get("hunger", 0) + 20)
            if is_win:
                new_wins = pet.get("wins", 0) + 1
                prize_coins = random.randint(300, 800)
                db.update_user_points(platform, user.id, prize_coins)
                db.update_pet(uid, energy=new_energy, hunger=new_hunger, wins=new_wins, xp=pet.get("xp", 0) + 30)
                msg_txt = f"🏆 پیروزی در آرنا! حیوان شما بر «{opp}» غلبه کرد و {prize_coins:,} سکه جایزه بردید!"
            else:
                new_losses = pet.get("losses", 0) + 1
                db.update_pet(uid, energy=new_energy, hunger=new_hunger, losses=new_losses)
                msg_txt = f"💔 شکست در آرنا! حیوان شما در برابر «{opp}» مغلوب شد. با تمرین بیشتر قوی‌تر شوید!"
            await unified_sender.answer_callback(user.platform, cb.id, msg_txt, show_alert=True)
            return True

        return False

    @classmethod
    async def handle_message(cls, update: UnifiedUpdate) -> bool:
        """Parses natural text commands for marriage, card-to-card transfer, and bail."""
        msg = update.message
        if not msg or not msg.text:
            return False

        text = msg.text.strip()
        user = msg.from_user
        chat_id = update.chat_id
        platform = user.platform.value
        platform_user_id = str(user.id)

        # 1. Card-to-card transfer: "انتقال 5000 به 123456"
        if text.startswith("انتقال") and "به" in text:
            import re
            m = re.search(r"انتقال\s+(\d+)\s+به\s+(\S+)", text)
            if m:
                amt = int(m.group(1))
                dest = m.group(2).strip()
                res = LifeRPServices.transfer_money(platform, platform_user_id, dest, amt)
                if not res["ok"]:
                    await unified_sender.send_message(user.platform, chat_id, f"❌ {res['error']}")
                else:
                    await unified_sender.send_message(user.platform, chat_id, res["message"])
                return True

        # 2. Marriage proposal: "خواستگاری 1000"
        if text.startswith("خواستگاری"):
            parts = text.split()
            dowry = int(parts[1]) if len(parts) > 1 and parts[1].isdigit() else 1000
            if msg.reply_to_message and msg.reply_to_message.from_user:
                partner = msg.reply_to_message.from_user
                if str(partner.id) == platform_user_id:
                    await unified_sender.send_message(user.platform, chat_id, "❌ نمی‌توانید با خودتان ازدواج کنید!")
                    return True
                # Register marriage
                user1_uid = f"{platform}_{platform_user_id}"
                user2_uid = f"{partner.platform.value}_{partner.id}"
                db.get_or_create_rp_stats(platform, platform_user_id)
                db.get_or_create_rp_stats(partner.platform.value, str(partner.id))
                db.register_marriage(user1_uid, user2_uid, dowry)
                resp = (
                    f"💍🎉 <b>پیوند آسمانی مبارک باد!</b>\n\n"
                    f"عقد رسمی بین {html.escape(user.first_name)} و {html.escape(partner.first_name)} "
                    f"با مهریه <b>{dowry:,} سکه</b> در دفترخانه شهر ثبت گردید!"
                )
                await unified_sender.send_message(user.platform, chat_id, resp)
                return True

        return False
