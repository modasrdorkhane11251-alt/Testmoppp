"""
SuperBot Phase 3 Handler (Utilities, Crypto, Compiler, Screenshot, Shortener, Wikipedia, Numberbook, Football, VPN & Uploader)
Enterprise Python Implementation matching multi-platform specifications.
"""
import re
import html
from typing import Dict, Any, Optional, List
from database.database import db
from core.state_machine import StateManager
from core.unified_sender import UnifiedSender
from core.unified_models import (
    UnifiedUpdate,
    UnifiedInlineKeyboard,
    UnifiedInlineButton,
    UnifiedPlatform
)
from services.phase3_services import Phase3Services
from keyboards.inline_menus import tools_menu_keyboard, back_button, cancel_state_keyboard
from config import DAILY_REQUEST_LIMIT_FREE, DAILY_REQUEST_LIMIT_VIP, DEFAULT_REQUEST_COST_POINTS

class Phase3Handler:

    @classmethod
    async def can_handle(cls, update: UnifiedUpdate) -> bool:
        """Determines if the update is relevant to Phase 3 features."""
        user = update.user
        if not user:
            return False

        # 1. Callback query check
        if update.is_callback_query:
            data = update.callback_data or ""
            phase3_prefixes = [
                "cb_tool_", "cb_p3_", "p3_",
                "tool_crypto", "tool_screenshot", "tool_compiler",
                "tool_shortener", "tool_numberbook", "tool_football",
                "tool_id_finder", "tool_wiki", "tool_vpn", "tool_uploader"
            ]
            return any(data.startswith(p) for p in phase3_prefixes)

        # 2. State machine check
        state, _ = StateManager.get_state(update.platform.value, user.id)
        if state and state.startswith("p3_"):
            return True

        # 3. Deep-link start parameter check (e.g. /start dl_xxxx)
        if update.message and update.message.text:
            txt = update.message.text.strip()
            if txt.startswith("/start dl_") or txt.startswith("dl_"):
                return True

        return False

    @classmethod
    async def handle_update(cls, update: UnifiedUpdate) -> bool:
        """Main entry point for Phase 3 handling."""
        if update.is_callback_query:
            return await cls.handle_callback(update)
        elif update.message:
            return await cls.handle_message(update)
        return False

    # ==================== CALLBACK ROUTING ====================
    @classmethod
    async def handle_callback(cls, update: UnifiedUpdate) -> bool:
        cb = update.callback_query
        data = cb.data or ""
        platform = update.platform
        user = update.user
        chat_id = update.chat.id if update.chat else user.id

        # Check quota & VIP status
        has_quota, reason = cls._check_quota(platform.value, user.id)
        if not has_quota:
            await UnifiedSender.send_message(
                platform, chat_id,
                f"⚠️ **محدودیت دسترسی:**\n{reason}\n\n💎 جهت افزایش اعتبار یا ارتقا به VIP از بخش «حساب کاربری» اقدام کنید.",
                reply_markup=tools_menu_keyboard()
            )
            return True

        # ---- ۱. ارز و کریپتو ----
        if data in ["cb_tool_crypto", "tool_crypto"]:
            kb = cls._crypto_menu_keyboard()
            await UnifiedSender.send_message(
                platform, chat_id,
                "📈 **سامانه استعلام لحظه‌ای ارزهای دیجیتال و طلا:**\n\n"
                "یکی از ارزهای محبوب زیر را انتخاب کنید یا نماد دلخواه خود (مانند BTC, SOL, TON) را جستجو نمایید:",
                reply_markup=kb
            )
            return True

        if data.startswith("cb_p3_crypto:"):
            symbol = data.split(":", 1)[1]
            if symbol == "FIAT":
                res = await Phase3Services.get_fiat_and_gold_rates()
                lines = ["🪙 **نرخ لحظه‌ای طلا، سکه و ارزهای شاخص:**\n"]
                for it in res["items"]:
                    lines.append(f"▫️ {it['title']}: **{it['price']}**")
                lines.append("\n⏱ *منبع: نوبیتکس و پایانه لحظه‌ای بازار تهران*")
                await UnifiedSender.send_message(
                    platform, chat_id, "\n".join(lines),
                    reply_markup=cls._crypto_menu_keyboard()
                )
            elif symbol == "CUSTOM":
                StateManager.set_state(platform.value, user.id, "p3_crypto_input")
                await UnifiedSender.send_message(
                    platform, chat_id,
                    "🔤 لطفاً نماد انگلیسی ارز دیجیتال مورد نظر را ارسال کنید:\n\n*(مثال: BTC, ETH, TON, NOT, DOGE, ADA)*",
                    reply_markup=cancel_state_keyboard()
                )
            else:
                await cls._send_crypto_result(platform, chat_id, symbol)
            return True

        # ---- ۲. اسکرین‌شات وب‌سایت ----
        if data in ["cb_tool_screenshot", "tool_screenshot"]:
            StateManager.set_state(platform.value, user.id, "p3_screenshot_input")
            await UnifiedSender.send_message(
                platform, chat_id,
                "📸 **اسکرین‌شات آنلاین از وب‌سایت‌ها:**\n\n"
                "🌐 آدرس اینترنتی (URL) سایت مورد نظر را ارسال کنید:\n"
                "*(مثال: google.com یا https://wikipedia.org)*",
                reply_markup=cancel_state_keyboard()
            )
            return True

        # ---- ۳. کامپایلر آنلاین کد ----
        if data in ["cb_tool_compiler", "tool_compiler"]:
            kb = cls._compiler_languages_keyboard()
            await UnifiedSender.send_message(
                platform, chat_id,
                "⚡️ **کامپایلر و مفسر آنلاین کد:**\n\n"
                "زبان برنامه‌نویسی مورد نظر خود را جهت اجرا انتخاب نمایید:",
                reply_markup=kb
            )
            return True

        if data.startswith("cb_p3_compiler_lang:"):
            lang = data.split(":", 1)[1]
            StateManager.set_state(platform.value, user.id, f"p3_compiler_input:{lang}")
            await UnifiedSender.send_message(
                platform, chat_id,
                f"💻 زبان انتخاب شده: **{lang.upper()}**\n\n"
                "اکنون سورس کد خود را در قالب یک پیام متنی ارسال کنید تا روی سرور اجرا شود:",
                reply_markup=cancel_state_keyboard()
            )
            return True

        # ---- ۴. کوتاه‌کننده لینک ----
        if data in ["cb_tool_shortener", "tool_shortener"]:
            StateManager.set_state(platform.value, user.id, "p3_shortener_input")
            await UnifiedSender.send_message(
                platform, chat_id,
                "🔗 **کوتاه‌کننده پرسرعت لینک:**\n\n"
                "لطفاً لینک بلند خود را ارسال کنید تا نسخه کوتاه و دائمی آن ساخته شود:",
                reply_markup=cancel_state_keyboard()
            )
            return True

        # ---- ۵. دانشنامه ویکی‌پدیا ----
        if data in ["cb_tool_wiki", "tool_wiki"]:
            StateManager.set_state(platform.value, user.id, "p3_wiki_input")
            await UnifiedSender.send_message(
                platform, chat_id,
                "📖 **جستجوی دانشنامه ویکی‌پدیا:**\n\n"
                "عنوان یا موضوع مورد نظر خود را بنویسید (مثلاً: *فناوری نانو*، *هوش مصنوعی*، *کوروش بزرگ*):",
                reply_markup=cancel_state_keyboard()
            )
            return True

        # ---- ۶. مزاحم‌یاب و نام‌خوان تلفن ----
        if data in ["cb_tool_numberbook", "tool_numberbook"]:
            StateManager.set_state(platform.value, user.id, "p3_numberbook_input")
            await UnifiedSender.send_message(
                platform, chat_id,
                "📞 **مزاحم‌یاب و استعلام شماره تلفن:**\n\n"
                "شماره موبایل مورد نظر را ارسال کنید:\n*(مثال: 09121234567 یا 09351234567)*",
                reply_markup=cancel_state_keyboard()
            )
            return True

        # ---- ۷. نتایج زنده فوتبال ----
        if data in ["cb_tool_football", "tool_football"]:
            kb = cls._football_menu_keyboard()
            await UnifiedSender.send_message(
                platform, chat_id,
                "⚽️ **پایگاه نتایج زنده فوتبال و لیگ‌ها:**\n\nلیگ مورد نظر خود را انتخاب نمایید:",
                reply_markup=kb
            )
            return True

        if data.startswith("cb_p3_football:"):
            league = data.split(":", 1)[1]
            res = await Phase3Services.get_football_matches(league)
            matches = res.get("matches", [])
            lines = [f"⚽️ **نتایج و بازی‌های مسابقات ({league.upper()}):**\n"]
            for m in matches:
                lines.append(f"▪️ **{m['home']}** {m['score']} **{m['away']}**")
                lines.append(f"   ⏱ وضعیت: {m['status']} | زمان: {m['time']}")
            lines.append("\n🔄 *داده‌ها به‌صورت لحظه‌ای بروزرسانی می‌گردند.*")
            await UnifiedSender.send_message(
                platform, chat_id, "\n".join(lines),
                reply_markup=cls._football_menu_keyboard()
            )
            return True

        # ---- ۸. کانفیگ VPN روزانه ----
        if data in ["cb_tool_vpn", "tool_vpn"]:
            res = await Phase3Services.get_daily_vpn_configs()
            cfgs = res.get("configs", [])
            lines = [
                "🛡 **کانفیگ‌های رایگان و پرسرعت ضد فیلتر:**\n",
                "برای استفاده، متن هر کانفیگ را لمس کنید تا کپی شود و سپس وارد برنامه اختصاصی نمایید:\n"
            ]
            for c in cfgs:
                lines.append(f"**{c['title']}** ({c['protocol']}):")
                lines.append(f"`{c['config']}`\n")
            lines.append(f"💡 {res.get('instructions')}")
            await UnifiedSender.send_message(
                platform, chat_id, "\n".join(lines),
                reply_markup=tools_menu_keyboard()
            )
            return True

        # ---- ۹. آیدی‌یاب پیام و کاربر ----
        if data in ["cb_tool_id_finder", "tool_id_finder"]:
            info_text = Phase3Services.get_id_info_text(update)
            await UnifiedSender.send_message(
                platform, chat_id, info_text,
                reply_markup=tools_menu_keyboard()
            )
            return True

        # ---- ۱۰. آپلودر دائمی فایل ----
        if data in ["cb_tool_uploader", "tool_uploader"]:
            StateManager.set_state(platform.value, user.id, "p3_uploader_waiting")
            await UnifiedSender.send_message(
                platform, chat_id,
                "☁️ **سامانه آپلودر دائمی و دیپ‌لینک (Deep-Link):**\n\n"
                "هر نوع فایل، فیلم، موسیقی، عکس یا برنامه تا سقف **۲ گیگابایت** ارسال کنید تا فوراً لینک دانلود مستقیم و قابل اشتراک در تمام پلتفرم‌ها دریافت نمایید.",
                reply_markup=cancel_state_keyboard()
            )
            return True

        return False

    # ==================== MESSAGE & INPUT ROUTING ====================
    @classmethod
    async def handle_message(cls, update: UnifiedUpdate) -> bool:
        user = update.user
        platform = update.platform
        chat_id = update.chat.id if update.chat else user.id
        msg = update.message
        text = (msg.text or "").strip()

        # Handle deep-link direct start: e.g. /start dl_a7f9
        if text.startswith("/start dl_") or text.startswith("dl_"):
            code = text.replace("/start ", "").strip()
            return await cls._serve_download_deep_link(platform, chat_id, code)

        # Check user state
        state, state_data = StateManager.get_state(platform.value, user.id)

        # Handle cancel command
        if text in ["/cancel", "لغو", "انصراف", "بازگشت"]:
            StateManager.clear_state(platform.value, user.id)
            await UnifiedSender.send_message(
                platform, chat_id, "عملیات لغو شد.",
                reply_markup=tools_menu_keyboard()
            )
            return True

        # --- Uploader File Reception ---
        if state == "p3_uploader_waiting":
            file_info = cls._extract_file_info(msg)
            if not file_info:
                await UnifiedSender.send_message(
                    platform, chat_id,
                    "⚠️ هیچ فایلی دریافت نشد! لطفاً فایل، ویدیو یا تصویری که می‌خواهید آپلود شود را ارسال کنید:",
                    reply_markup=cancel_state_keyboard()
                )
                return True

            file_code = db.save_uploaded_file(
                platform=platform.value,
                platform_user_id=user.id,
                file_type=file_info["type"],
                file_id=file_info["file_id"],
                file_name=file_info.get("file_name"),
                file_size=file_info.get("file_size", 0),
                caption=msg.caption or ""
            )

            StateManager.clear_state(platform.value, user.id)

            # Generate multi-platform deep links
            tg_link = f"https://t.me/SuperBot?start={file_code}"
            bale_link = f"https://ble.ir/SuperBot?start={file_code}"
            rubika_link = f"https://rubika.ir/SuperBot?start={file_code}"

            response_text = (
                "✅ **فایل شما با موفقیت در فضای ابری ذخیره و شناسه یکتا صادر گردید!**\n\n"
                f"📁 **نام فایل:** `{file_info.get('file_name', 'نامشخص')}`\n"
                f"📦 **نوع فایل:** `{file_info['type'].upper()}`\n"
                f"🔑 **کد رهگیری دانلود:** `{file_code}`\n\n"
                "🔗 **لینک‌های اشتراک‌گذاری دیپ‌لینک در پیام‌رسان‌ها:**\n"
                f"🔹 تلگرام: `{tg_link}`\n"
                f"🔹 بله: `{bale_link}`\n"
                f"🔹 روبیکا: `{rubika_link}`\n\n"
                "💡 *هر کاربری در هر پیام‌رسانی لینک بالا را باز کند، فایل بلافاصله برای او ارسال خواهد شد.*"
            )
            await UnifiedSender.send_message(platform, chat_id, response_text, reply_markup=tools_menu_keyboard())
            return True

        # --- Crypto Input ---
        if state == "p3_crypto_input":
            StateManager.clear_state(platform.value, user.id)
            await cls._send_crypto_result(platform, chat_id, text)
            return True

        # --- Screenshot Input ---
        if state == "p3_screenshot_input":
            StateManager.clear_state(platform.value, user.id)
            await UnifiedSender.send_chat_action(platform, chat_id, "upload_photo")
            res = await Phase3Services.take_screenshot(text)
            if res.get("ok") and res.get("image_url"):
                caption = f"📸 **اسکرین‌شات از سایت:**\n🔗 `{res['url']}`\n\n" + (res.get("note", ""))
                await UnifiedSender.send_photo(
                    platform, chat_id,
                    photo=res["image_url"],
                    caption=caption,
                    reply_markup=tools_menu_keyboard()
                )
            else:
                await UnifiedSender.send_message(
                    platform, chat_id,
                    "❌ دریافت تصویر از این وب‌سایت با خطا مواجه شد. لطفاً از درستی آدرس اطمینان حاصل کنید.",
                    reply_markup=tools_menu_keyboard()
                )
            return True

        # --- Compiler Input ---
        if state and state.startswith("p3_compiler_input:"):
            lang = state.split(":", 1)[1]
            StateManager.clear_state(platform.value, user.id)
            await UnifiedSender.send_chat_action(platform, chat_id, "typing")
            res = await Phase3Services.compile_code(text, lang)
            if res.get("ok"):
                output_clean = res.get("output", "").strip()
                result_msg = (
                    f"⚡️ **خروجی اجرای کد ({lang.upper()}):**\n\n"
                    f"```\n{output_clean}\n```\n"
                    f"⏱ وضعیت: موفقیت‌آمیز"
                )
            else:
                result_msg = f"❌ **خطا در اجرای کد:**\n\n{res.get('error', 'خطای ناشناخته')}"
            await UnifiedSender.send_message(platform, chat_id, result_msg, reply_markup=tools_menu_keyboard())
            return True

        # --- Shortener Input ---
        if state == "p3_shortener_input":
            StateManager.clear_state(platform.value, user.id)
            res = await Phase3Services.shorten_url(text)
            if res.get("ok"):
                short = res["short_url"]
                msg_out = (
                    "✅ **لینک کوتاه اختصاصی شما ایجاد شد:**\n\n"
                    f"🔗 **لینک کوتاه:** `{short}`\n"
                    f"🌐 **لینک اصلی:** `{res['original']}`"
                )
            else:
                msg_out = f"❌ خطا: {res.get('error', 'امکان کوتاه‌سازی وجود ندارد.')}"
            await UnifiedSender.send_message(platform, chat_id, msg_out, reply_markup=tools_menu_keyboard())
            return True

        # --- Wikipedia Input ---
        if state == "p3_wiki_input":
            StateManager.clear_state(platform.value, user.id)
            await UnifiedSender.send_chat_action(platform, chat_id, "typing")
            res = await Phase3Services.search_wikipedia(text)
            if res.get("ok"):
                summary = (
                    f"📖 **{res['title']}** (ویکی‌پدیا):\n\n"
                    f"{res['extract']}\n\n"
                    f"🔗 [مطالعه کامل مقاله در ویکی‌پدیا]({res['url']})"
                )
                if res.get("image_url"):
                    await UnifiedSender.send_photo(
                        platform, chat_id,
                        photo=res["image_url"],
                        caption=summary,
                        reply_markup=tools_menu_keyboard()
                    )
                else:
                    await UnifiedSender.send_message(platform, chat_id, summary, reply_markup=tools_menu_keyboard())
            else:
                await UnifiedSender.send_message(
                    platform, chat_id,
                    f"❌ {res.get('error', 'مقاله‌ای یافت نشد.')}",
                    reply_markup=tools_menu_keyboard()
                )
            return True

        # --- Numberbook Input ---
        if state == "p3_numberbook_input":
            StateManager.clear_state(platform.value, user.id)
            await UnifiedSender.send_chat_action(platform, chat_id, "typing")
            res = await Phase3Services.lookup_numberbook(text)
            if res.get("ok"):
                names_text = "\n".join([f"👤 {n}" for n in res["names"]]) if res["names"] else "نامی در بانک شماره‌ها یافت نشد."
                out_msg = (
                    f"📞 **اطلاعات و استعلام شماره {res['phone']}:**\n\n"
                    f"📡 **اپراتور:** {res['operator']}\n"
                    f"🏙 **منطقه/استان:** {res['province']}\n"
                    f"💳 **نوع سیم‌کارت:** {res['sim_type']}\n\n"
                    f"📋 **اسامی ثبت‌شده:**\n{names_text}"
                )
            else:
                out_msg = f"❌ {res.get('error', 'شماره نامعتبر است.')}"
            await UnifiedSender.send_message(platform, chat_id, out_msg, reply_markup=tools_menu_keyboard())
            return True

        return False

    # ==================== HELPERS ====================
    @classmethod
    async def _send_crypto_result(cls, platform: UnifiedPlatform, chat_id: Any, symbol: str):
        res = await Phase3Services.get_crypto_price(symbol)
        if res.get("ok"):
            text = (
                f"📈 **نرخ لحظه‌ای ارز {res['symbol']}**\n\n"
                f"💵 **قیمت به دلار:** `${res['formatted_usd']}`\n"
                f"🇮🇷 **معادل تومان:** `{res['formatted_toman']} تومان`\n"
                f"₮ **نرخ تتر محاسبه‌شده:** `{int(res['tether_rate']):,} تومان`\n"
                f"🏛 **منبع داده:** {res['source']}"
            )
        else:
            text = f"❌ {res.get('error', 'خطا در دریافت قیمت')}"

        await UnifiedSender.send_message(
            platform, chat_id, text,
            reply_markup=cls._crypto_menu_keyboard()
        )

    @classmethod
    async def _serve_download_deep_link(cls, platform: UnifiedPlatform, chat_id: Any, file_code: str) -> bool:
        """Finds file in DB and sends back to user directly."""
        file_record = db.get_uploaded_file(file_code, increment_download=True)
        if not file_record:
            await UnifiedSender.send_message(
                platform, chat_id,
                "❌ **فایل مورد نظر یافت نشد یا منقضی شده است.**\n\nاز طریق منوی زیر می‌توانید فایل‌های جدید آپلود نمایید.",
                reply_markup=tools_menu_keyboard()
            )
            return True

        f_type = file_record["file_type"]
        f_id = file_record["file_id"]
        caption = (
            f"📥 **دانلود فایل اختصاصی:**\n\n"
            f"📄 نام: `{file_record['file_name']}`\n"
            f"🔢 دفعات دانلود: `{file_record['downloads_count']}` بار\n"
            f"💬 توضیحات: {file_record.get('caption', '')}"
        )

        if f_type == "photo":
            await UnifiedSender.send_photo(platform, chat_id, photo=f_id, caption=caption)
        elif f_type == "video":
            await UnifiedSender.send_video(platform, chat_id, video=f_id, caption=caption)
        elif f_type in ["audio", "voice"]:
            await UnifiedSender.send_audio(platform, chat_id, audio=f_id, caption=caption)
        else:
            await UnifiedSender.send_document(platform, chat_id, document=f_id, caption=caption)

        return True

    @classmethod
    def _extract_file_info(cls, msg: Any) -> Optional[Dict[str, Any]]:
        """Extracts file_id, type, name and size from a UnifiedMessage or platform message."""
        # Check UnifiedMessage attributes
        if getattr(msg, "document_file_id", None):
            raw = getattr(msg, "raw_payload", {})
            doc_data = raw.get("document", {}) if isinstance(raw, dict) else {}
            return {
                "type": "document",
                "file_id": msg.document_file_id,
                "file_name": doc_data.get("file_name", "document.file"),
                "file_size": doc_data.get("file_size", 0)
            }
        if getattr(msg, "photo_file_id", None):
            return {
                "type": "photo",
                "file_id": msg.photo_file_id,
                "file_name": "photo.jpg",
                "file_size": 0
            }
        if getattr(msg, "video_file_id", None):
            raw = getattr(msg, "raw_payload", {})
            vid_data = raw.get("video", {}) if isinstance(raw, dict) else {}
            return {
                "type": "video",
                "file_id": msg.video_file_id,
                "file_name": vid_data.get("file_name", "video.mp4"),
                "file_size": vid_data.get("file_size", 0)
            }
        if getattr(msg, "audio_file_id", None):
            raw = getattr(msg, "raw_payload", {})
            aud_data = raw.get("audio", {}) if isinstance(raw, dict) else {}
            return {
                "type": "audio",
                "file_id": msg.audio_file_id,
                "file_name": aud_data.get("file_name", "audio.mp3"),
                "file_size": aud_data.get("file_size", 0)
            }

        # Check native nested attributes
        doc = getattr(msg, "document", None)
        if doc:
            return {
                "type": "document",
                "file_id": getattr(doc, "file_id", str(doc)),
                "file_name": getattr(doc, "file_name", "document"),
                "file_size": getattr(doc, "file_size", 0)
            }
        photo = getattr(msg, "photo", None)
        if photo:
            p_item = photo[-1] if isinstance(photo, list) else photo
            return {
                "type": "photo",
                "file_id": getattr(p_item, "file_id", str(p_item)),
                "file_name": "photo.jpg",
                "file_size": getattr(p_item, "file_size", 0)
            }
        video = getattr(msg, "video", None)
        if video:
            return {
                "type": "video",
                "file_id": getattr(video, "file_id", str(video)),
                "file_name": getattr(video, "file_name", "video.mp4"),
                "file_size": getattr(video, "file_size", 0)
            }
        audio = getattr(msg, "audio", None)
        if audio:
            return {
                "type": "audio",
                "file_id": getattr(audio, "file_id", str(audio)),
                "file_name": getattr(audio, "file_name", "audio.mp3"),
                "file_size": getattr(audio, "file_size", 0)
            }
        voice = getattr(msg, "voice", None)
        if voice:
            return {
                "type": "voice",
                "file_id": getattr(voice, "file_id", str(voice)),
                "file_name": "voice.ogg",
                "file_size": getattr(voice, "file_size", 0)
            }
        return None

    @classmethod
    def _crypto_menu_keyboard(cls) -> UnifiedInlineKeyboard:
        kb = UnifiedInlineKeyboard()
        kb.add_row(
            UnifiedInlineButton(text="🟠 بیت‌کوین (BTC)", callback_data="cb_p3_crypto:BTC"),
            UnifiedInlineButton(text="🔷 اتریوم (ETH)", callback_data="cb_p3_crypto:ETH"),
        )
        kb.add_row(
            UnifiedInlineButton(text="💎 تون‌کوین (TON)", callback_data="cb_p3_crypto:TON"),
            UnifiedInlineButton(text="⚡️ نات‌کوین (NOT)", callback_data="cb_p3_crypto:NOT"),
        )
        kb.add_row(
            UnifiedInlineButton(text="🐶 دوج‌کوین (DOGE)", callback_data="cb_p3_crypto:DOGE"),
            UnifiedInlineButton(text="🟣 سولانا (SOL)", callback_data="cb_p3_crypto:SOL"),
        )
        kb.add_row(
            UnifiedInlineButton(text="🔴 ترون (TRX)", callback_data="cb_p3_crypto:TRX"),
            UnifiedInlineButton(text="🪙 طلا و ارزهای شاخص", callback_data="cb_p3_crypto:FIAT"),
        )
        kb.add_row(
            UnifiedInlineButton(text="🔍 استعلام نماد دلخواه", callback_data="cb_p3_crypto:CUSTOM"),
        )
        kb.add_row(back_button())
        return kb

    @classmethod
    def _compiler_languages_keyboard(cls) -> UnifiedInlineKeyboard:
        kb = UnifiedInlineKeyboard()
        kb.add_row(
            UnifiedInlineButton(text="🐍 پایتون (Python 3)", callback_data="cb_p3_compiler_lang:python"),
            UnifiedInlineButton(text="🐘 پی‌اچ‌پی (PHP)", callback_data="cb_p3_compiler_lang:php"),
        )
        kb.add_row(
            UnifiedInlineButton(text="🟨 جاوااسکریپت (Node.js)", callback_data="cb_p3_compiler_lang:javascript"),
            UnifiedInlineButton(text="⚙️ سی‌پلاس‌پلاس (C++)", callback_data="cb_p3_compiler_lang:cpp"),
        )
        kb.add_row(
            UnifiedInlineButton(text="☕️ جاوا (Java)", callback_data="cb_p3_compiler_lang:java"),
            UnifiedInlineButton(text="🐚 شل لینوکس (Bash)", callback_data="cb_p3_compiler_lang:bash"),
        )
        kb.add_row(back_button())
        return kb

    @classmethod
    def _football_menu_keyboard(cls) -> UnifiedInlineKeyboard:
        kb = UnifiedInlineKeyboard()
        kb.add_row(
            UnifiedInlineButton(text="🇮🇷 لیگ برتر ایران (خلیج فارس)", callback_data="cb_p3_football:iran"),
            UnifiedInlineButton(text="🏴󠁧󠁢󠁥󠁮󠁧󠁿 لیگ برتر انگلیس", callback_data="cb_p3_football:premier"),
        )
        kb.add_row(
            UnifiedInlineButton(text="🇪🇸 لالیگا اسپانیا", callback_data="cb_p3_football:laliga"),
            UnifiedInlineButton(text="🏆 لیگ قهرمانان اروپا", callback_data="cb_p3_football:ucl"),
        )
        kb.add_row(back_button())
        return kb

    @classmethod
    def _check_quota(cls, platform: str, user_id: str) -> tuple[bool, str]:
        user_row = db.get_user(platform, user_id)
        if not user_row:
            return True, ""

        if user_row.get("role") in ["admin", "superadmin", "owner"]:
            return True, ""

        is_vip = db.is_user_vip(platform, user_id)
        max_daily = DAILY_REQUEST_LIMIT_VIP if is_vip else DAILY_REQUEST_LIMIT_FREE

        req_count = user_row.get("daily_requests_count", 0)
        if req_count >= max_daily:
            return False, f"سقف درخواست‌های رایگان روزانه شما ({max_daily} درخواست) به پایان رسیده است."

        points = user_row.get("points", 0)
        cost = DEFAULT_REQUEST_COST_POINTS
        if not is_vip and points < cost:
            return False, f"امتیاز شما کافی نیست (امتیاز فعلی: {points} - هزینه: {cost} امتیاز)."

        return True, ""
