"""
SuperBot Phase 2 Handler (AI, Vision, Media Downloaders, Shazam & OCR)
Integrates Phase 2 services seamlessly with Telegram, Bale, and Rubika.
"""
import re
import html
from typing import Dict, Any, Optional, List
from database.database import db
from core.unified_models import (
    UnifiedUpdate,
    UnifiedPlatform,
    UnifiedInlineKeyboard,
    UnifiedInlineButton,
)
from core.unified_sender import unified_sender
from core.state_machine import StateManager, States
from services.phase2_services import Phase2Services
from handlers.admin_panel import is_admin
from config import DEFAULT_REQUEST_COST_POINTS
from core.downloader_core import DownloaderCore, DownloaderLogger

def back_btn(target: str = "cb_main_menu") -> UnifiedInlineKeyboard:
    kb = UnifiedInlineKeyboard()
    kb.add_row(UnifiedInlineButton(text="🔙 بازگشت", callback_data=target))
    return kb

IG_MEDIA_CACHE: Dict[str, Any] = {}
ACTIVE_DOWNLOAD_CACHE: Dict[str, Any] = {}

class Phase2Handler:
    IG_MEDIA_CACHE = IG_MEDIA_CACHE
    ACTIVE_DOWNLOAD_CACHE = ACTIVE_DOWNLOAD_CACHE
    @classmethod
    async def check_quota(cls, platform: UnifiedPlatform, platform_user_id: str) -> bool:
        """Verifies daily request limit and point balance before running task."""
        if is_admin(platform_user_id):
            return True

        user, _ = db.get_or_create_user(platform.value, platform_user_id)
        if user.get("role") in ("admin", "superadmin"):
            return True

        limit = 1000 if user.get("is_vip") else 30
        cost = DEFAULT_REQUEST_COST_POINTS

        daily_count = user.get("daily_requests_count", 0)
        points = user.get("points", 0)

        if daily_count >= limit:
            await unified_sender.send_message(
                platform,
                platform_user_id,
                f"⛔️ <b>سهمیه درخواست روزانه شما ({limit} درخواست) به پایان رسیده است.</b>\n"
                "فردا مجدداً سهمیه شما تمدید خواهد شد یا می‌توانید حساب خود را به VIP ارتقا دهید.",
                back_btn("cb_menu_vip")
            )
            return False

        if points < cost:
            await unified_sender.send_message(
                platform,
                platform_user_id,
                f"⛔️ <b>امتیاز شما کافی نیست (نیاز به {cost} سکه).</b>\n\n"
                "💡 از بخش «👤 حساب کاربری» با دریافت هدیه روزانه یا دعوت دوستان سکه رایگان دریافت کنید!",
                back_btn("cb_menu_referral")
            )
            return False

        return True

    @classmethod
    def charge_user(cls, platform: UnifiedPlatform, platform_user_id: str, metric_key: str):
        """Deducts request cost from user and records transaction."""
        cost = DEFAULT_REQUEST_COST_POINTS
        db.add_points(
            platform.value,
            platform_user_id,
            -cost,
            reason=f"Phase 2 Service: {metric_key}"
        )
        db.increment_daily_requests(platform.value, platform_user_id)

    @classmethod
    async def send_media_universal(
        cls,
        platform: UnifiedPlatform,
        chat_id: str,
        media_type: str,
        url: str,
        caption: str = "",
        reply_markup: Optional[UnifiedInlineKeyboard] = None
    ):
        """Cross-platform media sender with Rubika link fallback and Telegram/Bale direct send."""
        if platform == UnifiedPlatform.RUBIKA:
            text = f"{caption}\n\n🔗 <b>لینک مستقیم فایل:</b>\n{url}" if caption else f"🔗 <b>لینک مستقیم فایل:</b>\n{url}"
            await unified_sender.send_message(platform, chat_id, text, reply_markup)
            return

        success = False
        if media_type == "photo":
            res = await unified_sender.send_photo(platform, chat_id, url, caption=caption, reply_markup=reply_markup)
            success = res.get("ok", False)
        elif media_type == "video":
            res = await unified_sender.send_video(platform, chat_id, url, caption=caption, reply_markup=reply_markup)
            success = res.get("ok", False)
        elif media_type in ("audio", "voice"):
            res = await unified_sender.send_document(platform, chat_id, url, caption=caption, reply_markup=reply_markup)
            success = res.get("ok", False)

        # Fallback to direct download link if provider rejects remote URL
        if not success:
            fallback_text = (
                f"<b>{caption}</b>\n\n📥 <b>لینک دانلود مستقیم:</b>\n{url}"
                if caption
                else f"📥 <b>لینک دانلود مستقیم:</b>\n{url}"
            )
            await unified_sender.send_message(platform, chat_id, fallback_text, reply_markup)

    # ==========================================================
    # 1. CALLBACK QUERY ROUTING (INLINE BUTTONS)
    # ==========================================================
    @classmethod
    async def handle_callback(cls, update: UnifiedUpdate) -> bool:
        cb = update.callback_query
        if not cb:
            return False

        user = cb.from_user
        platform = user.platform
        chat_id = update.chat_id
        msg_id = cb.message.message_id if cb.message else "0"
        data = cb.data

        # --- A) AI CHAT & MODELS ---
        if data in ("cb_ai_chat", "ai_chat_menu"):
            kb = UnifiedInlineKeyboard()
            kb.add_row(
                UnifiedInlineButton(text="🧠 GPT-3.5 / 4", callback_data="set_ai:gpt"),
                UnifiedInlineButton(text="🚀 GPT-4 Turbo", callback_data="set_ai:gpt4"),
            )
            kb.add_row(
                UnifiedInlineButton(text="🔬 DeepSeek", callback_data="set_ai:deepseek"),
                UnifiedInlineButton(text="⚡️ Grok AI", callback_data="set_ai:grok"),
            )
            kb.add_row(UnifiedInlineButton(text="🔙 بازگشت به منوی هوش مصنوعی", callback_data="cb_mod_ai"))

            StateManager.set(platform.value, user.id, "p2_ai_chat", {"model": "gpt"})
            text = (
                "🤖 <b>چت هوشمند چندمدله (Multi-Model AI Chat)</b>\n\n"
                "مدل‌های مختلف هوش مصنوعی آماده پاسخ به سوالات شما هستند.\n"
                "می‌توانید مدل مورد نظر را انتخاب نمایید یا <b>مستقیماً سوال خود را ارسال کنید:</b>"
            )
            await unified_sender.edit_message_text(platform, chat_id, msg_id, text, kb)
            await unified_sender.answer_callback(platform, cb.id)
            return True

        if data.startswith("set_ai:"):
            model = data.split(":", 1)[1]
            StateManager.set(platform.value, user.id, "p2_ai_chat", {"model": model})
            await unified_sender.answer_callback(platform, cb.id, f"✅ مدل روی {model.upper()} تنظیم شد!", show_alert=False)
            text = (
                f"✅ مدل هوش مصنوعی فعال: <b>{model.upper()}</b>\n\n"
                "✍️ <b>اکنون پیام یا سوال خود را ارسال کنید:</b>"
            )
            await unified_sender.edit_message_text(platform, chat_id, msg_id, text, back_btn("cb_ai_chat"))
            return True

        if data in ("cb_ai_blackbox", "ai_blackbox"):
            StateManager.set(platform.value, user.id, "p2_blackbox")
            text = (
                "🦾 <b>هوش مصنوعی Blackbox AI (متخصص کدنویسی و دیباگ)</b>\n\n"
                "✍️ سوال برنامه‌نویسی، درخواست نوشتن اسکریپت یا کد خود را ارسال کنید:"
            )
            await unified_sender.edit_message_text(platform, chat_id, msg_id, text, back_btn("cb_mod_ai"))
            await unified_sender.answer_callback(platform, cb.id)
            return True

        # --- B) AI IMAGE GENERATION ---
        if data in ("cb_ai_image", "ai_photo_menu"):
            kb = UnifiedInlineKeyboard()
            kb.add_row(
                UnifiedInlineButton(text="⚡️ موتور Fast-Creat", callback_data="p2_photo_fast"),
                UnifiedInlineButton(text="🎨 موتور Dall-E 3", callback_data="p2_photo_dalle"),
            )
            kb.add_row(UnifiedInlineButton(text="🔙 بازگشت", callback_data="cb_mod_ai"))
            text = "🖼 <b>تولید تصویر با هوش مصنوعی</b>\n\nیکی از موتورهای تصویرساز زیر را انتخاب کنید:"
            await unified_sender.edit_message_text(platform, chat_id, msg_id, text, kb)
            await unified_sender.answer_callback(platform, cb.id)
            return True

        if data in ("p2_photo_fast", "p2_photo_dalle"):
            StateManager.set(platform.value, user.id, data)
            engine = "Dall-E 3" if data == "p2_photo_dalle" else "Fast-Creat"
            text = (
                f"🖼 <b>تولید تصویر با موتور {engine}</b>\n\n"
                "✍️ لطفاً متن توصیف تصویر مورد نظر خود را به فارسی یا انگلیسی ارسال کنید:\n"
                "<i>مثال: A futuristic cyberpunk city in neon rain</i>"
            )
            await unified_sender.edit_message_text(platform, chat_id, msg_id, text, back_btn("cb_ai_image"))
            await unified_sender.answer_callback(platform, cb.id)
            return True

        # --- C) ANIME & GHIBLI STYLE ---
        if data in ("cb_ai_anime", "ai_anime_menu"):
            kb = UnifiedInlineKeyboard()
            kb.add_row(
                UnifiedInlineButton(text="⚡️ استایل انیمه مدرن", callback_data="p2_anime_fast"),
                UnifiedInlineButton(text="🎌 استایل استودیو Ghibli", callback_data="p2_anime_ghibli"),
            )
            kb.add_row(UnifiedInlineButton(text="🔙 بازگشت", callback_data="cb_mod_ai"))
            text = "🧩 <b>تبدیل عکس به انیمه</b>\n\nلطفاً استایل مورد نظر خود را انتخاب نمایید:"
            await unified_sender.edit_message_text(platform, chat_id, msg_id, text, kb)
            await unified_sender.answer_callback(platform, cb.id)
            return True

        if data in ("p2_anime_fast", "p2_anime_ghibli"):
            StateManager.set(platform.value, user.id, data)
            text = "🧩 لطفاً <b>لینک مستقیم عکس</b> (شروع با http/https) را ارسال کنید:"
            await unified_sender.edit_message_text(platform, chat_id, msg_id, text, back_btn("cb_ai_anime"))
            await unified_sender.answer_callback(platform, cb.id)
            return True

        # --- D) 4K ENHANCE & LOGO/EFFECT MAKER ---
        if data in ("cb_ai_enhance", "ai_enhance"):
            StateManager.set(platform.value, user.id, "p2_enhance")
            text = (
                "🔥 <b>افزایش کیفیت عکس (4K Enhance)</b>\n\n"
                "لطفاً <b>لینک مستقیم عکس</b> خود را ارسال فرمایید تا رزولوشن و وضوح آن افزایش یابد:"
            )
            await unified_sender.edit_message_text(platform, chat_id, msg_id, text, back_btn("cb_mod_ai"))
            await unified_sender.answer_callback(platform, cb.id)
            return True

        if data in ("cb_ai_logo", "ai_logo_menu"):
            kb = UnifiedInlineKeyboard()
            kb.add_row(
                UnifiedInlineButton(text="🎯 ساخت لوگو اسمی (۱۴۰ استایل)", callback_data="p2_logo"),
                UnifiedInlineButton(text="✨ افکت‌گذاری روی عکس (۸۰ استایل)", callback_data="p2_effect"),
            )
            kb.add_row(UnifiedInlineButton(text="🔙 بازگشت", callback_data="cb_mod_ai"))
            text = "🎯 <b>بخش لوگوساز و افکت‌های گرافیکی</b>\n\nیکی از گزینه‌های زیر را انتخاب نمایید:"
            await unified_sender.edit_message_text(platform, chat_id, msg_id, text, kb)
            await unified_sender.answer_callback(platform, cb.id)
            return True

        if data == "p2_logo":
            StateManager.set(platform.value, user.id, "p2_logo")
            text = (
                "🎯 <b>لوگوساز حرفه‌ای</b>\n\n"
                "یک عدد بین <b>1 تا 140</b> به همراه متن انگلیسی خود با یک فاصله ارسال کنید.\n"
                "💡 <i>مثال:</i> <code>15 MegaBot</code>"
            )
            await unified_sender.edit_message_text(platform, chat_id, msg_id, text, back_btn("cb_ai_logo"))
            await unified_sender.answer_callback(platform, cb.id)
            return True

        if data == "p2_effect":
            StateManager.set(platform.value, user.id, "p2_effect")
            text = (
                "✨ <b>افکت‌گذاری روی عکس</b>\n\n"
                "یک عدد بین <b>1 تا 80</b> به همراه لینک مستقیم عکس خود با فاصله ارسال فرمایید.\n"
                "💡 <i>مثال:</i> <code>12 https://example.com/photo.jpg</code>"
            )
            await unified_sender.edit_message_text(platform, chat_id, msg_id, text, back_btn("cb_ai_logo"))
            await unified_sender.answer_callback(platform, cb.id)
            return True

        # --- E) INSTAGRAM DOWNLOADER & INFO ---
        if data.startswith("p2_ig_pick:"):
            choice = data.split(":", 1)[1]
            cache_key = f"{platform}_{user.id}"
            cached = cls.IG_MEDIA_CACHE.get(cache_key)
            if not cached:
                await unified_sender.answer_callback(user.platform, cb.id, "❌ زمان نشست دانلود منقضی شده، لطفاً لینک را دوباره ارسال فرمایید.", show_alert=True)
                return True

            media_list = cached.get("media", [])
            thumb = cached.get("thumb")
            caption = cached.get("caption", "")
            cap_text = (caption[:700] + "...") if len(caption) > 700 else caption

            if choice == "cover":
                if thumb:
                    await cls.send_media_universal(user.platform, chat_id, "photo", thumb, caption="🖼 <b>کاور اصلی و باکیفیت پست اینستاگرام</b>", reply_markup=back_btn("cb_media_insta"))
                else:
                    await unified_sender.send_message(user.platform, chat_id, "❌ تصویری به عنوان کاور یافت نشد.", back_btn("cb_media_insta"))
                await unified_sender.answer_callback(user.platform, cb.id)
                return True

            if choice == "audio":
                v_url = None
                for m in media_list:
                    u = m.get("url", "")
                    if ".mp4" in u.lower() or "video" in u.lower() or m.get("type") == "video":
                        v_url = u
                        break
                if v_url:
                    await unified_sender.answer_callback(user.platform, cb.id, "🎵 در حال استخراج صوت...")
                    audio_res = await Phase2Services.extract_audio(v_url)
                    if audio_res:
                        await cls.send_media_universal(user.platform, chat_id, "audio", audio_res, caption="🎵 <b>صدای استخراج شده از اینستاگرام (MP3)</b>", reply_markup=back_btn("cb_media_insta"))
                        return True
                await unified_sender.send_message(user.platform, chat_id, "❌ استخراج صوت برای این رسانه امکان‌پذیر نبود.", back_btn("cb_media_insta"))
                await unified_sender.answer_callback(user.platform, cb.id)
                return True

            # For 1080p, 720p or direct
            await unified_sender.answer_callback(user.platform, cb.id, f"📥 در حال ارسال رسانه ({choice})...")
            sent = False
            for m in media_list:
                m_url = m.get("url") or ""
                if not m_url or "thumbnail" in m_url.lower():
                    continue
                is_video = ".mp4" in m_url.lower() or "video" in m_url.lower() or m.get("type") == "video"
                cap_clean = html.escape(cap_text)
                caption_msg = f"📸 <b>دانلود شده از اینستاگرام ({choice})</b>\n\n{cap_clean}"
                await cls.send_media_universal(
                    user.platform,
                    chat_id,
                    "video" if is_video else "photo",
                    m_url,
                    caption=caption_msg,
                    reply_markup=back_btn("cb_media_insta")
                )
                sent = True
            if not sent:
                await unified_sender.send_message(user.platform, chat_id, "❌ فایل ویدیویی معتبر برای این کیفیت یافت نشد.", back_btn("cb_media_insta"))
            return True

        if data in ("cb_media_insta", "dl_instagram"):
            kb = UnifiedInlineKeyboard()
            kb.add_row(
                UnifiedInlineButton(text="📥 دانلود پست / ریلز / استوری", callback_data="p2_ig_dl"),
                UnifiedInlineButton(text="👤 دریافت اطلاعات و عکس پیج", callback_data="p2_ig_info"),
            )
            kb.add_row(UnifiedInlineButton(text="🔙 بازگشت", callback_data="cb_mod_media"))
            text = "📸 <b>خدمات اینستاگرام (Instagram Downloader)</b>\n\nکدام قابلیت را می‌خواهید؟"
            await unified_sender.edit_message_text(platform, chat_id, msg_id, text, kb)
            await unified_sender.answer_callback(platform, cb.id)
            return True

        if data == "p2_ig_dl":
            StateManager.set(platform.value, user.id, "p2_ig_dl")
            text = "📥 لطفاً <b>لینک پست، ریلز یا استوری اینستاگرام</b> را ارسال فرمایید:"
            await unified_sender.edit_message_text(platform, chat_id, msg_id, text, back_btn("cb_media_insta"))
            await unified_sender.answer_callback(platform, cb.id)
            return True

        if data in ("cb_media_insta_info", "p2_ig_info"):
            StateManager.set(platform.value, user.id, "p2_ig_info")
            text = "👤 لطفاً <b>یوزرنیم پیج اینستاگرام</b> (مثلاً <code>cristiano</code> یا <code>@instagram</code>) را بفرستید:"
            await unified_sender.edit_message_text(platform, chat_id, msg_id, text, back_btn("cb_media_insta"))
            await unified_sender.answer_callback(platform, cb.id)
            return True

                # --- DOWNLOADER CORE SPECIFIC PLATFORMS ---
        if data == "cb_media_tiktok":
            StateManager.set(platform.value, user.id, "p2_tt_dl")
            text = "📱 لطفاً <b>لینک ویدیوی تیک‌تاک (TikTok)</b> را ارسال فرمایید تا نسخه باکیفیت و <b>بدون واترمارک</b> برایتان استخراج و دانلود شود:"
            await unified_sender.edit_message_text(platform, chat_id, msg_id, text, back_btn("cb_mod_media"))
            await unified_sender.answer_callback(platform, cb.id)
            return True

        if data == "cb_media_aparat":
            StateManager.set(platform.value, user.id, "p2_aparat_dl")
            text = "📺 لطفاً <b>لینک ویدیوی آپارات (Aparat)</b> را بفرستید (مثال: <code>https://www.aparat.com/v/XXXXX</code>) تا تمام کیفیت‌های موجود (1080p, 720p, 480p, ...) همراه با پخش مستقیم برایتان آماده شود:"
            await unified_sender.edit_message_text(platform, chat_id, msg_id, text, back_btn("cb_mod_media"))
            await unified_sender.answer_callback(platform, cb.id)
            return True

        if data == "cb_media_soundcloud":
            StateManager.set(platform.value, user.id, "p2_sc_dl")
            text = "🎶 لطفاً <b>لینک ترک یا آهنگ ساندکلاد (SoundCloud)</b> را ارسال فرمایید تا فایل صوتی باکیفیت MP3 دانلود و تقدیم گردد:"
            await unified_sender.edit_message_text(platform, chat_id, msg_id, text, back_btn("cb_mod_media"))
            await unified_sender.answer_callback(platform, cb.id)
            return True

        if data == "cb_media_twitter":
            StateManager.set(platform.value, user.id, "p2_tw_dl")
            text = "🐦 لطفاً <b>لینک توییت یا پست توییتر / X</b> حاوی عکس یا ویدیو را ارسال فرمایید:"
            await unified_sender.edit_message_text(platform, chat_id, msg_id, text, back_btn("cb_mod_media"))
            await unified_sender.answer_callback(platform, cb.id)
            return True

        if data == "cb_media_pinterest":
            StateManager.set(platform.value, user.id, "p2_pin_dl")
            text = "📌 لطفاً <b>لینک پین پینترست (Pinterest)</b> را ارسال فرمایید تا فایل تصویر یا ویدیوی اصلی دانلود شود:"
            await unified_sender.edit_message_text(platform, chat_id, msg_id, text, back_btn("cb_mod_media"))
            await unified_sender.answer_callback(platform, cb.id)
            return True

        # Callback actions for downloaded items
        if data.startswith("cb_dl_qual:"):
            parts = data.split(":")
            req_id = parts[1]
            q_idx = int(parts[2]) if len(parts) > 2 and parts[2].isdigit() else 0
            cached = cls.ACTIVE_DOWNLOAD_CACHE.get(req_id)
            if cached and cached.get("qualities") and len(cached["qualities"]) > q_idx:
                q_info = cached["qualities"][q_idx]
                await unified_sender.answer_callback(user.platform, cb.id, f"📥 در حال دانلود کیفیت {q_info.get('profile')}...")
                ok_dl, file_path, dl_err = DownloaderCore.download_file_to_disk(req_id, q_info["url"], "mp4")
                if ok_dl and file_path and os.path.exists(file_path):
                    await cls.send_media_universal(user.platform, chat_id, "video", file_path, caption=f"🎬 <b>کیفیت {q_info.get('profile')}</b>\n🆔 <code>{req_id}</code>", reply_markup=back_btn("cb_mod_media"))
                    try:
                        os.remove(file_path)
                    except Exception:
                        pass
                else:
                    await unified_sender.send_message(user.platform, chat_id, f"❌ خطا در دانلود کیفیت: {dl_err}", back_btn("cb_mod_media"))
                return True

        if data.startswith("cb_dl_audio:"):
            req_id = data.split(":")[1]
            cached = cls.ACTIVE_DOWNLOAD_CACHE.get(req_id)
            if cached and cached.get("music_url"):
                await unified_sender.answer_callback(user.platform, cb.id, "🎵 در حال استخراج و دریافت صوت...")
                ok_dl, file_path, dl_err = DownloaderCore.download_file_to_disk(req_id, cached["music_url"], "mp3", cached.get("headers"))
                if ok_dl and file_path and os.path.exists(file_path):
                    await cls.send_media_universal(user.platform, chat_id, "audio", file_path, caption=f"🎵 <b>صوت استخراج شده با بالاترین کیفیت</b>\n🆔 <code>{req_id}</code>", reply_markup=back_btn("cb_mod_media"))
                    try:
                        os.remove(file_path)
                    except Exception:
                        pass
                else:
                    await unified_sender.send_message(user.platform, chat_id, f"❌ خطا در دریافت صوت: {dl_err}", back_btn("cb_mod_media"))
                return True

        if data.startswith("cb_dl_cover:"):
            req_id = data.split(":")[1]
            cached = cls.ACTIVE_DOWNLOAD_CACHE.get(req_id)
            if cached and cached.get("cover"):
                await cls.send_media_universal(user.platform, chat_id, "photo", cached["cover"], caption=f"🖼 <b>کاور اصلی و باکیفیت</b>\n🆔 <code>{req_id}</code>", reply_markup=back_btn("cb_mod_media"))
                await unified_sender.answer_callback(user.platform, cb.id)
                return True

# --- F) YOUTUBE SEARCH & DOWNLOAD ---
        if data in ("cb_media_youtube", "dl_youtube"):
            kb = UnifiedInlineKeyboard()
            kb.add_row(
                UnifiedInlineButton(text="🔎 جستجو در یوتیوب", callback_data="p2_yt_search"),
                UnifiedInlineButton(text="⬇️ دانلود با لینک مستقیم", callback_data="p2_yt_dl"),
            )
            kb.add_row(UnifiedInlineButton(text="🔙 بازگشت", callback_data="cb_mod_media"))
            text = "▶️ <b>خدمات یوتیوب (YouTube)</b>\n\nانتخاب کنید:"
            await unified_sender.edit_message_text(platform, chat_id, msg_id, text, kb)
            await unified_sender.answer_callback(platform, cb.id)
            return True

        if data == "p2_yt_search":
            StateManager.set(platform.value, user.id, "p2_yt_search")
            text = "🔎 عبارت مورد نظر برای <b>جستجو در یوتیوب</b> را تایپ و ارسال کنید:"
            await unified_sender.edit_message_text(platform, chat_id, msg_id, text, back_btn("cb_media_youtube"))
            await unified_sender.answer_callback(platform, cb.id)
            return True

        if data == "p2_yt_dl":
            StateManager.set(platform.value, user.id, "p2_yt_dl")
            text = "⬇️ لطفاً <b>لینک ویدیوی یوتیوب</b> را ارسال نمایید:"
            await unified_sender.edit_message_text(platform, chat_id, msg_id, text, back_btn("cb_media_youtube"))
            await unified_sender.answer_callback(platform, cb.id)
            return True

        # --- G) SPOTIFY & RADIO JAVAN ---
        if data in ("cb_media_music", "dl_spotify"):
            kb = UnifiedInlineKeyboard()
            kb.add_row(
                UnifiedInlineButton(text="🔎 جستجوی آهنگ در اسپاتیفای", callback_data="p2_sp_search"),
                UnifiedInlineButton(text="⬇️ دانلود با لینک اسپاتیفای", callback_data="p2_sp_dl"),
            )
            kb.add_row(UnifiedInlineButton(text="📻 رادیوجوان (جستجو و دانلود)", callback_data="p2_rj_menu"))
            kb.add_row(UnifiedInlineButton(text="🔙 بازگشت", callback_data="cb_mod_media"))
            text = "🎵 <b>سرویس موسیقی اسپاتیفای و رادیوجوان</b>\n\nگزینه مورد نظر را انتخاب فرمایید:"
            await unified_sender.edit_message_text(platform, chat_id, msg_id, text, kb)
            await unified_sender.answer_callback(platform, cb.id)
            return True

        if data == "p2_sp_search":
            StateManager.set(platform.value, user.id, "p2_sp_search")
            text = "🔎 نام خواننده یا عنوان موزیک را برای <b>جستجو در اسپاتیفای</b> بفرستید:"
            await unified_sender.edit_message_text(platform, chat_id, msg_id, text, back_btn("cb_media_music"))
            await unified_sender.answer_callback(platform, cb.id)
            return True

        if data == "p2_sp_dl":
            StateManager.set(platform.value, user.id, "p2_sp_dl")
            text = "⬇️ لطفاً <b>لینک ترک یا آهنگ اسپاتیفای</b> را ارسال نمایید:"
            await unified_sender.edit_message_text(platform, chat_id, msg_id, text, back_btn("cb_media_music"))
            await unified_sender.answer_callback(platform, cb.id)
            return True

        if data in ("p2_rj_menu", "dl_rj"):
            kb = UnifiedInlineKeyboard()
            kb.add_row(UnifiedInlineButton(text="🔎 جستجو در رادیوجوان", callback_data="p2_rj_search"))
            kb.add_row(
                UnifiedInlineButton(text="🎧 دانلود MP3 با شناسه (ID)", callback_data="p2_rj_mp3"),
                UnifiedInlineButton(text="🎬 دانلود ویدیو با شناسه", callback_data="p2_rj_mp4"),
            )
            kb.add_row(UnifiedInlineButton(text="🔙 بازگشت", callback_data="cb_media_music"))
            text = "📻 <b>سرویس اختصاصی رادیو جوان (RadioJavan)</b>\n\nانتخاب کنید:"
            await unified_sender.edit_message_text(platform, chat_id, msg_id, text, kb)
            await unified_sender.answer_callback(platform, cb.id)
            return True

        if data == "p2_rj_search":
            StateManager.set(platform.value, user.id, "p2_rj_search")
            text = "🔎 نام خواننده یا عنوان آهنگ را برای <b>جستجو در رادیوجوان</b> بفرستید:"
            await unified_sender.edit_message_text(platform, chat_id, msg_id, text, back_btn("p2_rj_menu"))
            await unified_sender.answer_callback(platform, cb.id)
            return True

        if data in ("p2_rj_mp3", "p2_rj_mp4"):
            StateManager.set(platform.value, user.id, data)
            t = "صوت MP3" if data == "p2_rj_mp3" else "ویدیوی MP4"
            text = f"🔢 لطفاً <b>کد عددی (ID)</b> مربوط به {t} را که از بخش جستجو دریافت کرده‌اید ارسال کنید:"
            await unified_sender.edit_message_text(platform, chat_id, msg_id, text, back_btn("p2_rj_menu"))
            await unified_sender.answer_callback(platform, cb.id)
            return True

        # --- H) SHAZAM MUSIC IDENTIFIER ---
        if data in ("cb_media_shazam", "dl_shazam"):
            StateManager.set(platform.value, user.id, "p2_shazam")
            text = (
                "🎤 <b>شناسایی هوشمند موزیک (Shazam)</b>\n\n"
                "لطفاً لینک مستقیم فایل صوتی (MP3) یا لینک ریلز اینستاگرام حاوی موزیک را بفرستید "
                "تا مشخصات و لینک دانلود آهنگ برایتان استخراج شود:"
            )
            await unified_sender.edit_message_text(platform, chat_id, msg_id, text, back_btn("cb_mod_media"))
            await unified_sender.answer_callback(platform, cb.id)
            return True

        # --- I) AUDIO EXTRACTION & OCR ---
        if data in ("cb_ai_ocr", "cb_media_extract_mp3", "dl_ocr_audio"):
            kb = UnifiedInlineKeyboard()
            kb.add_row(UnifiedInlineButton(text="🎧 استخراج صوت (MP3) از لینک ویدیو", callback_data="p2_ext_audio"))
            kb.add_row(
                UnifiedInlineButton(text="📝 استخراج متن فارسی (OCR)", callback_data="p2_ocr:fa"),
                UnifiedInlineButton(text="📝 استخراج متن انگلیسی", callback_data="p2_ocr:en"),
            )
            kb.add_row(UnifiedInlineButton(text="🌐 استخراج ترکیبی (فارسی + انگلیسی)", callback_data="p2_ocr:both"))
            kb.add_row(UnifiedInlineButton(text="🔙 بازگشت", callback_data="cb_main_menu"))
            text = "🎧 <b>ابزارهای استخراج صوت و نویسه‌خوان هوشمند (OCR)</b>\n\nیکی از گزینه‌های زیر را انتخاب نمایید:"
            await unified_sender.edit_message_text(platform, chat_id, msg_id, text, kb)
            await unified_sender.answer_callback(platform, cb.id)
            return True

        if data == "p2_ext_audio":
            StateManager.set(platform.value, user.id, "p2_ext_audio")
            text = "🎧 لطفاً <b>لینک مستقیم ویدیوی MP4</b> را ارسال کنید تا صدای آن به صورت MP3 استخراج شود:"
            await unified_sender.edit_message_text(platform, chat_id, msg_id, text, back_btn("dl_ocr_audio"))
            await unified_sender.answer_callback(platform, cb.id)
            return True

        if data.startswith("p2_ocr:"):
            StateManager.set(platform.value, user.id, data)
            text = "📝 لطفاً <b>لینک مستقیم عکس</b> حاوی متن را ارسال فرمایید:"
            await unified_sender.edit_message_text(platform, chat_id, msg_id, text, back_btn("dl_ocr_audio"))
            await unified_sender.answer_callback(platform, cb.id)
            return True

        return False

    # ==========================================================
    # 2. STATE INPUT ROUTING (TEXT MESSAGES IN FSM STATES)
    # ==========================================================
    @classmethod
    async def handle_state(cls, update: UnifiedUpdate, state: str, data: Dict[str, Any]) -> bool:
        if not state.startswith("p2_"):
            return False

        user = update.user
        platform = user.platform
        chat_id = update.chat_id
        text = update.message.effective_text if update.message else ""
        text = text.strip()

        # Quota and points checking
        if not await cls.check_quota(platform, user.id):
            return True

        # 1. AI Chat & Blackbox
        if state in ("p2_ai_chat", "p2_blackbox"):
            model = "blackbox" if state == "p2_blackbox" else data.get("model", "gpt")
            await unified_sender.send_message(
                platform, chat_id, f"⏳ در حال پردازش پاسخ توسط <b>{model.upper()}</b>..."
            )
            ans = await Phase2Services.chat_ai(text, model)
            if len(ans) > 3900:
                ans = ans[:3900] + "\n...(ادامه دارد)"

            await unified_sender.send_message(
                platform, chat_id, f"🤖 <b>پاسخ {model.upper()}:</b>\n\n{html.escape(ans)}", back_btn("cb_ai_chat")
            )
            cls.charge_user(platform, user.id, f"ai_chat_{model}")
            # Keep in state to permit ongoing multi-turn conversation
            return True

        # 2. AI Image Generation
        if state in ("p2_photo_fast", "p2_photo_dalle"):
            await unified_sender.send_message(
                platform, chat_id, "🎨 در حال طراحی و خلق تصویر شما با هوش مصنوعی... لطفاً چند لحظه صبر کنید."
            )
            if state == "p2_photo_dalle":
                imgs = await Phase2Services.generate_photo_dalle(text)
            else:
                imgs = await Phase2Services.generate_photo_fast(text)

            if not imgs:
                await unified_sender.send_message(
                    platform, chat_id, "❌ متاسفانه تصویری تولید نشد. لطفاً متن دیگری را امتحان فرمایید.", back_btn("cb_ai_image")
                )
                return True

            for img_url in imgs[:4]:
                await cls.send_media_universal(
                    platform,
                    chat_id,
                    "photo",
                    img_url,
                    caption=f"🎨 <b>ساخته شده با هوش مصنوعی</b>\n📝 <i>{html.escape(text)}</i>",
                    reply_markup=back_btn("cb_ai_image")
                )

            cls.charge_user(platform, user.id, state)
            StateManager.clear(platform.value, user.id)
            return True

        # 3. Anime and 4K Enhance
        if state in ("p2_anime_fast", "p2_anime_ghibli", "p2_enhance"):
            match = re.search(r"https?://\S+", text, re.IGNORECASE)
            if not match:
                await unified_sender.send_message(platform, chat_id, "❌ لطفاً یک لینک معتبر عکس (شروع با http/https) بفرستید:")
                return True

            url = match.group(0)
            await unified_sender.send_message(platform, chat_id, "⏳ در حال پردازش تصویر... لطفاً صبر کنید.")

            if state == "p2_anime_fast":
                imgs = await Phase2Services.to_anime_fast(url)
            elif state == "p2_anime_ghibli":
                imgs = await Phase2Services.to_anime_ghibli(url)
            else:
                imgs = await Phase2Services.enhance_quality(url)

            if not imgs:
                await unified_sender.send_message(
                    platform, chat_id, "❌ پردازش تصویر ناموفق بود. از معتبر و در دسترس بودن لینک عکس مطمئن شوید.", back_btn("cb_mod_ai")
                )
                return True

            for img_url in imgs[:2]:
                await cls.send_media_universal(platform, chat_id, "photo", img_url, caption="✨ <b>تصویر پردازش شده شما</b>", reply_markup=back_btn("cb_mod_ai"))

            cls.charge_user(platform, user.id, state)
            StateManager.clear(platform.value, user.id)
            return True

        # 4. Logo and Effects
        if state == "p2_logo":
            parts = text.split(maxsplit=1)
            if len(parts) < 2 or not parts[0].isdigit() or not (1 <= int(parts[0]) <= 140):
                await unified_sender.send_message(
                    platform, chat_id, "❌ فرمت نادرست! یک عدد بین 1 تا 140 و سپس متن دلخواه را با فاصله ارسال کنید.\n<i>مثال:</i> <code>25 MegaBot</code>"
                )
                return True

            logo_id = int(parts[0])
            logo_text = parts[1]
            await unified_sender.send_message(platform, chat_id, f"🎯 در حال طراحی لوگو با استایل شماره {logo_id}...")
            imgs = await Phase2Services.make_logo(logo_id, logo_text)
            if not imgs:
                await unified_sender.send_message(platform, chat_id, "❌ خطا در ساخت لوگو.", back_btn("cb_ai_logo"))
                return True

            await cls.send_media_universal(platform, chat_id, "photo", imgs[0], caption="🎯 <b>لوگوی طراحی شده شما</b>", reply_markup=back_btn("cb_ai_logo"))
            cls.charge_user(platform, user.id, "logo_maker")
            StateManager.clear(platform.value, user.id)
            return True

        if state == "p2_effect":
            parts = text.split(maxsplit=1)
            if len(parts) < 2 or not parts[0].isdigit() or not (1 <= int(parts[0]) <= 80) or not parts[1].startswith("http"):
                await unified_sender.send_message(
                    platform, chat_id, "❌ فرمت نادرست! شماره افکت (1 تا 80) و لینک عکس را بفرستید.\n<i>مثال:</i> <code>10 https://example.com/pic.jpg</code>"
                )
                return True

            effect_id = int(parts[0])
            pic_url = parts[1]
            await unified_sender.send_message(platform, chat_id, f"✨ در حال اعمال افکت شماره {effect_id} روی تصویر...")
            imgs = await Phase2Services.make_effect(effect_id, pic_url)
            if not imgs:
                await unified_sender.send_message(platform, chat_id, "❌ خطا در اعمال افکت روی تصویر.", back_btn("cb_ai_logo"))
                return True

            await cls.send_media_universal(platform, chat_id, "photo", imgs[0], caption="✨ <b>تصویر افکت‌گذاری شده</b>", reply_markup=back_btn("cb_ai_logo"))
            cls.charge_user(platform, user.id, "effect_maker")
            StateManager.clear(platform.value, user.id)
            return True

        # 5. Instagram Downloader & Info
        if state == "p2_ig_dl":
            if not text.startswith("http") or "instagram.com" not in text:
                await unified_sender.send_message(platform, chat_id, "❌ لطفاً لینک معتبر اینستاگرام را ارسال فرمایید:")
                return True
            return await cls.process_instagram_url(platform, chat_id, user, text)

        if state == "p2_ig_info":
            await unified_sender.send_message(platform, chat_id, "🔍 در حال استخراج اطلاعات پیج اینستاگرام...")
            res = await Phase2Services.instagram_profile_info(text)
            if not res.get("ok"):
                await unified_sender.send_message(platform, chat_id, "❌ پیج مورد نظر یافت نشد.", back_btn("cb_media_insta"))
                return True

            r = res.get("info", {})
            u_name = res.get("username", "")
            full_name = html.escape(str(r.get("full_name") or r.get("name") or "—"))
            followers = str(r.get("follower") or r.get("followers") or "—")
            following = str(r.get("following") or "—")
            posts = str(r.get("posts") or r.get("media_count") or "—")
            bio = html.escape(str(r.get("biography") or ""))

            out_text = (
                f"👤 <b>اطلاعات حساب کاربری اینستاگرام</b>\n"
                f"━━━━━━━━━━━━━━━━━━━━\n"
                f"▫️ <b>یوزرنیم:</b> @{u_name}\n"
                f"▫️ <b>نام:</b> {full_name}\n"
                f"▫️ <b>دنبال‌کنندگان (Followers):</b> <b>{followers}</b>\n"
                f"▫️ <b>دنبال‌شوندگان (Following):</b> <b>{following}</b>\n"
                f"▫️ <b>تعداد پست‌ها:</b> <b>{posts}</b>\n"
            )
            if bio:
                out_text += f"\n📝 <b>بیوگرافی:</b>\n{bio}"

            pic = r.get("profile_pic_url_hd") or r.get("profile_pic_url")
            if pic:
                await cls.send_media_universal(platform, chat_id, "photo", pic, caption=out_text, reply_markup=back_btn("cb_media_insta"))
            else:
                await unified_sender.send_message(platform, chat_id, out_text, back_btn("cb_media_insta"))

            cls.charge_user(platform, user.id, "ig_info")
            StateManager.clear(platform.value, user.id)
            return True

        # 6. YouTube Search & Download
        if state == "p2_yt_search":
            res = await Phase2Services.youtube_search(text)
            d = res.get("data", {})
            items = d.get("result") or d.get("items") or []
            if not items:
                await unified_sender.send_message(platform, chat_id, "❌ موردی در یوتیوب یافت نشد.", back_btn("cb_media_youtube"))
                return True

            lines = ["▶️ <b>نتایج جستجوی یوتیوب:</b>\n"]
            for it in items[:8]:
                title = html.escape(str(it.get("title") or it.get("snippet", {}).get("title") or "ویدیو"))
                u = str(it.get("url") or it.get("link") or it.get("id", {}).get("videoId") or "")
                if u and not u.startswith("http"):
                    u = f"https://www.youtube.com/watch?v={u}"
                if u:
                    lines.append(f"• <b>{title}</b>\n🔗 <code>{u}</code>")

            lines.append("\n💡 <i>لینک ویدیو را کپی کرده و در بخش دانلود با لینک ارسال فرمایید.</i>")
            await unified_sender.send_message(platform, chat_id, "\n\n".join(lines), back_btn("cb_media_youtube"))
            cls.charge_user(platform, user.id, "yt_search")
            StateManager.clear(platform.value, user.id)
            return True

        if state in ("p2_ig_dl", "p2_yt_dl", "p2_tt_dl", "p2_aparat_dl", "p2_sc_dl", "p2_tw_dl", "p2_pin_dl", "p2_sp_dl"):
            return await cls.process_universal_downloader(update, text)

        # 7. Spotify Search
        if state == "p2_sp_search":
            res = await Phase2Services.spotify_search(text)
            d = res.get("data", {})
            items = d.get("result") or d.get("items") or []
            if not items:
                await unified_sender.send_message(platform, chat_id, "❌ آهنگی در اسپاتیفای یافت نشد.", back_btn("cb_media_music"))
                return True

            lines = ["🎵 <b>نتایج جستجوی اسپاتیفای:</b>\n"]
            for it in items[:8]:
                title = html.escape(str(it.get("title") or it.get("name") or "آهنگ"))
                artists = it.get("artists")
                artist = str(it.get("artist") or (artists[0].get("name") if isinstance(artists, list) and artists else "—"))
                u = str(it.get("url") or it.get("link") or "")
                lines.append(f"🎵 <b>{title}</b> — {artist}\n🔗 <code>{u}</code>")

            await unified_sender.send_message(platform, chat_id, "\n\n".join(lines), back_btn("cb_media_music"))
            cls.charge_user(platform, user.id, "sp_search")
            StateManager.clear(platform.value, user.id)
            return True

        # 8. RadioJavan Search & Download
        if state == "p2_rj_search":
            res = await Phase2Services.rj_search(text)
            d = res.get("data", {})
            lines = ["📻 <b>نتایج رادیوجوان:</b>\n"]
            for sec in ("music", "video", "podcast"):
                sec_items = d.get(sec)
                if isinstance(sec_items, list) and sec_items:
                    lines.append(f"── <b>{sec.upper()}</b> ──")
                    for it in sec_items[:5]:
                        t = html.escape(str(it.get("title") or it.get("name") or ""))
                        m_id = str(it.get("id") or it.get("media_id") or "")
                        if t and m_id:
                            lines.append(f"• {t} | 🆔 کد: <code>{m_id}</code>")

            if len(lines) == 1:
                lines.append("موردی یافت نشد.")
            else:
                lines.append("\n💡 <i>کد عددی (ID) را کپی کرده و در بخش دانلود MP3 یا MP4 رادیوجوان بفرستید.</i>")

            await unified_sender.send_message(platform, chat_id, "\n".join(lines), back_btn("p2_rj_menu"))
            cls.charge_user(platform, user.id, "rj_search")
            StateManager.clear(platform.value, user.id)
            return True

        if state in ("p2_rj_mp3", "p2_rj_mp4"):
            digits = re.sub(r"\D", "", text)
            if not digits:
                await unified_sender.send_message(platform, chat_id, "❌ لطفاً فقط کد عددی معتبر (ID) را ارسال نمایید:")
                return True

            act = "mp3" if state == "p2_rj_mp3" else "mp4"
            await unified_sender.send_message(platform, chat_id, f"📻 در حال دریافت لینک دانلود {act.upper()}...")
            links = await Phase2Services.rj_download(act, int(digits))
            if not links:
                await unified_sender.send_message(platform, chat_id, "❌ فایلی با این کد پیدا نشد.", back_btn("p2_rj_menu"))
                return True

            out = f"📻 <b>لینک‌های دانلود مستقیم ({act.upper()}):</b>\n\n" + "\n\n".join(links)
            await unified_sender.send_message(platform, chat_id, out, back_btn("p2_rj_menu"))
            cls.charge_user(platform, user.id, f"rj_{act}")
            StateManager.clear(platform.value, user.id)
            return True

        # 9. Shazam Music Identifier
        if state == "p2_shazam":
            await unified_sender.send_message(platform, chat_id, "🎤 در حال گوش دادن و شناسایی هوشمند موزیک...")
            res = await Phase2Services.shazam_recognize(text)
            title = res.get("title", "")
            artist = res.get("artist", "")
            dl_url = res.get("download", "")

            if not res.get("ok") or (not title and not dl_url):
                await unified_sender.send_message(
                    platform, chat_id, "❌ متاسفانه اثری با این مشخصات صوتی شناسایی نشد.", back_btn("cb_mod_media")
                )
                return True

            cap = (
                f"🎤 <b>موزیک با موفقیت شناسایی شد:</b>\n"
                f"🎵 <b>عنوان:</b> {html.escape(title)}\n"
                f"👤 <b>خواننده / اثر:</b> {html.escape(artist)}"
            )
            if dl_url:
                await cls.send_media_universal(platform, chat_id, "audio", dl_url, caption=cap, reply_markup=back_btn("cb_mod_media"))
            else:
                await unified_sender.send_message(platform, chat_id, cap, back_btn("cb_mod_media"))

            cls.charge_user(platform, user.id, "shazam")
            StateManager.clear(platform.value, user.id)
            return True

        # 10. Extract Audio from MP4
        if state == "p2_ext_audio":
            await unified_sender.send_message(platform, chat_id, "🎧 در حال جداسازی و تبدیل صدای ویدیو به MP3...")
            audio_url = await Phase2Services.extract_audio(text)
            if not audio_url:
                await unified_sender.send_message(
                    platform, chat_id, "❌ استخراج صدا ناموفق بود. اطمینان حاصل کنید لینک مستقیم MP4 است.", back_btn("dl_ocr_audio")
                )
                return True

            await cls.send_media_universal(platform, chat_id, "audio", audio_url, caption="🎧 <b>صدای استخراج شده (MP3)</b>", reply_markup=back_btn("dl_ocr_audio"))
            cls.charge_user(platform, user.id, "extract_audio")
            StateManager.clear(platform.value, user.id)
            return True

        # 11. OCR Text Extraction
        if state.startswith("p2_ocr:"):
            lang = state.split(":", 1)[1]
            await unified_sender.send_message(platform, chat_id, "📝 در حال خواندن و استخراج نویسه‌های تصویر (OCR)...")
            extracted = await Phase2Services.extract_ocr(text, lang)
            if not extracted:
                await unified_sender.send_message(
                    platform, chat_id, "❌ متنی در این تصویر یافت نشد یا کیفیت تصویر بسیار پایین است.", back_btn("dl_ocr_audio")
                )
                return True

            clean_text = extracted[:3800]
            out = f"📝 <b>متن استخراج شده از تصویر:</b>\n\n<pre>{html.escape(clean_text)}</pre>"
            await unified_sender.send_message(platform, chat_id, out, back_btn("dl_ocr_audio"))
            cls.charge_user(platform, user.id, "ocr")
            StateManager.clear(platform.value, user.id)
            return True

        return False

    @classmethod
    async def process_universal_downloader(cls, update: UnifiedUpdate, raw_url: str) -> bool:
        """
        Processes any media URL with the 10-step DownloaderCore engine:
        1. Logs steps 1-5
        2. Detects platform (TikTok, Aparat, SoundCloud, Instagram, YouTube, etc.)
        3. Extracts metadata, title, author, cover, stream URL
        4. Downloads real file with size & magic bytes validation (steps 6-8)
        5. Sends the file to user directly (step 9)
        6. Logs final result (step 10)
        7. If failed, shows honest cause and trace ID (no fake success!)
        """
        msg = update.message
        chat_id = update.chat_id
        user = msg.from_user if msg else update.user
        platform = user.platform

        await unified_sender.send_message(platform, chat_id, "⏳ <b>در حال پردازش و اعتبارسنجی لینک رسانه...</b>")

        req_id, res = await DownloaderCore.process_url(raw_url)
        cls.ACTIVE_DOWNLOAD_CACHE[req_id] = res

        if not res.get("ok"):
            err_msg = res.get("error", "خطای ناشناخته در استخراج رسانه.")
            out_err = (
                f"❌ <b>خطا در پردازش رسانه</b>\n"
                f"━━━━━━━━━━━━━━━━━━━━\n"
                f"🆔 <b>شناسه پیگیری:</b> <code>{req_id}</code>\n"
                f"⚠️ <b>علت:</b> {err_msg}"
            )
            if res.get("cover"):
                await cls.send_media_universal(platform, chat_id, "photo", res["cover"], caption=out_err, reply_markup=back_btn("cb_mod_media"))
            else:
                await unified_sender.send_message(platform, chat_id, out_err, back_btn("cb_mod_media"))
            StateManager.clear(platform.value, user.id)
            return True

        # Successful extraction!
        title = res.get("title", "رسانه آنلاین")
        author = res.get("author", "ناشناس")
        duration = res.get("duration", 0)
        cover = res.get("cover", "")
        play_url = res.get("play_url")
        media_platform = res.get("platform", "online")

        # Step 5: Inform user about extracted media
        info_lines = [
            f"📥 <b>رسانه با موفقیت شناسایی شد:</b>",
            f"━━━━━━━━━━━━━━━━━━━━",
            f"🆔 <b>شناسه پیگیری:</b> <code>{req_id}</code>",
            f"🌐 <b>پلتفرم:</b> <b>{media_platform.upper()}</b>",
            f"🎬 <b>عنوان:</b> {html.escape(title[:100])}",
            f"👤 <b>ناشر / کانال:</b> {html.escape(author)}",
        ]
        if duration:
            mins = duration // 60
            secs = duration % 60
            info_lines.append(f"⏱ <b>مدت زمان:</b> {mins:02d}:{secs:02d}")

        qualities = res.get("qualities", [])
        if qualities:
            q_names = ", ".join([q.get("profile", "") for q in qualities])
            info_lines.append(f"🎞 <b>کیفیت‌های در دسترس:</b> <code>{q_names}</code>")

        info_lines.append("━━━━━━━━━━━━━━━━━━━━")
        info_lines.append("<i>در حال دریافت و ارسال فایل با بالاترین کیفیت...</i>")
        info_text = "\n".join(info_lines)

        # Build interactive action buttons
        kb = UnifiedInlineKeyboard()
        if qualities:
            row_q = []
            for idx, q_item in enumerate(qualities[:3]):
                row_q.append(UnifiedInlineButton(text=f"🎥 {q_item.get('profile')}", callback_data=f"cb_dl_qual:{req_id}:{idx}"))
            kb.add_row(*row_q)

        row_actions = []
        if res.get("music_url"):
            row_actions.append(UnifiedInlineButton(text="🎵 دانلود صوت (MP3)", callback_data=f"cb_dl_audio:{req_id}"))
        if cover:
            row_actions.append(UnifiedInlineButton(text="🖼 دانلود کاور HD", callback_data=f"cb_dl_cover:{req_id}"))
        if row_actions:
            kb.add_row(*row_actions)
        kb.add_row(UnifiedInlineButton(text="🔙 بازگشت به منوی رسانه", callback_data="cb_mod_media"))

        if cover:
            await cls.send_media_universal(platform, chat_id, "photo", cover, caption=info_text, reply_markup=kb)
        else:
            await unified_sender.send_message(platform, chat_id, info_text, kb)

        # Now execute real download to disk, file validation & dispatch (Stages 6, 7, 8, 9)
        if play_url:
            ext = res.get("ext", "mp4")
            ok_dl, file_path, dl_err = DownloaderCore.download_file_to_disk(req_id, play_url, ext, res.get("headers"))
            if ok_dl and file_path and os.path.exists(file_path):
                # Stage 9: Send file to user
                DownloaderLogger.log_step(req_id, 9, "ارسال فایل به کاربر (Dispatching File)", {
                    "file_path": file_path,
                    "size_bytes": os.path.getsize(file_path)
                })
                caption = f"✅ <b>{html.escape(title[:80])}</b>\n🆔 <code>{req_id}</code>"
                media_type = "audio" if ext == "mp3" else "video"
                await cls.send_media_universal(platform, chat_id, media_type, file_path, caption=caption, reply_markup=back_btn("cb_mod_media"))
                DownloaderLogger.log_step(req_id, 10, "نتیجه نهایی (Success)", {"status": "dispatched"})
                try:
                    os.remove(file_path)
                except Exception:
                    pass
            else:
                fail_msg = (
                    f"⚠️ <b>خطا در دریافت فایل:</b>\n"
                    f"{dl_err or 'فایل دانلود نشد.'}\n"
                    f"🔗 <b>لینک مستقیم استریم:</b> <a href=\"{play_url}\">کلیک جهت پخش مستقیم</a>"
                )
                DownloaderLogger.log_step(req_id, 10, "نتیجه نهایی (Stream Link Fallback)", {"error": dl_err})
                await unified_sender.send_message(platform, chat_id, fail_msg, back_btn("cb_mod_media"))

        cls.charge_user(platform, user.id, "universal_download")
        StateManager.clear(platform.value, user.id)
        return True

    @classmethod
    async def handle_message(cls, update: UnifiedUpdate) -> bool:
        """Auto-detects any media URLs (TikTok, Aparat, SoundCloud, Instagram, YouTube, etc.) sent in chat."""
        msg = update.message
        if not msg or not msg.text:
            return False
        text = msg.text.strip()

        if "http://" in text or "https://" in text:
            return await cls.process_universal_downloader(update, text)

        return False
