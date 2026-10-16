"""
Cross-Platform Inline Keyboard Builder for Telegram, Bale, and Rubika
Enforces standardized layout with mandatory 'Back to Main Menu' on all submenus.
"""
from core.unified_models import UnifiedInlineKeyboard, UnifiedInlineButton

def back_button() -> UnifiedInlineButton:
    """Standardized back button present across all inner screens."""
    return UnifiedInlineButton(text="🔙 بازگشت به منوی اصلی", callback_data="cb_main_menu")

def main_menu_keyboard(is_admin: bool = False) -> UnifiedInlineKeyboard:
    """The central primary inline dashboard."""
    kb = UnifiedInlineKeyboard()
    kb.add_row(
        UnifiedInlineButton(text="🤖 هوش مصنوعی و ویژن", callback_data="cb_mod_ai"),
        UnifiedInlineButton(text="📥 دانلودر و مدیا", callback_data="cb_mod_media"),
    )
    kb.add_row(
        UnifiedInlineButton(text="🛠 ابزارهای کاربردی", callback_data="cb_mod_tools"),
        UnifiedInlineButton(text="🎮 بازی‌ها و سرگرمی RP", callback_data="cb_mod_games"),
    )
    kb.add_row(
        UnifiedInlineButton(text="👤 حساب کاربری و الماس", callback_data="cb_menu_profile"),
        UnifiedInlineButton(text="🎁 زیرمجموعه‌گیری و سکه", callback_data="cb_menu_referral"),
    )
    kb.add_row(
        UnifiedInlineButton(text="🎫 پشتیبانی و تیکت", callback_data="cb_menu_support"),
        UnifiedInlineButton(text="💎 ارتقا به VIP", callback_data="cb_menu_vip"),
    )
    if is_admin:
        kb.add_row(
            UnifiedInlineButton(text="👑 پنل مدیریت ارشد (Admin)", callback_data="cb_admin_panel")
        )
    return kb

def ai_menu_keyboard() -> UnifiedInlineKeyboard:
    kb = UnifiedInlineKeyboard()
    kb.add_row(
        UnifiedInlineButton(text="💬 چت GPT-4 & DeepSeek", callback_data="cb_ai_chat"),
        UnifiedInlineButton(text="⚡️ Groq Llama-3.3 & Grok", callback_data="cb_ai_groq"),
    )
    kb.add_row(
        UnifiedInlineButton(text="💻 کدنویسی Blackbox AI", callback_data="cb_ai_blackbox"),
        UnifiedInlineButton(text="🎨 تولید تصویر (Dall-E)", callback_data="cb_ai_image"),
    )
    kb.add_row(
        UnifiedInlineButton(text="✨ انیمه و استایل Ghibli", callback_data="cb_ai_anime"),
        UnifiedInlineButton(text="🔍 افزایش کیفیت (Enhance)", callback_data="cb_ai_enhance"),
    )
    kb.add_row(
        UnifiedInlineButton(text="🏷 لوگوساز و افکت‌ساز (۱۴۰ استایل)", callback_data="cb_ai_logo"),
        UnifiedInlineButton(text="📝 استخراج متن عکس (OCR)", callback_data="cb_ai_ocr"),
    )
    kb.add_row(back_button())
    return kb

def media_menu_keyboard() -> UnifiedInlineKeyboard:
    kb = UnifiedInlineKeyboard()
    kb.add_row(
        UnifiedInlineButton(text="📸 اینستاگرام (پست/ریلز)", callback_data="cb_media_insta"),
        UnifiedInlineButton(text="▶️ یوتیوب (Shorts/ویدیو)", callback_data="cb_media_youtube"),
    )
    kb.add_row(
        UnifiedInlineButton(text="📱 تیک‌تاک بدون واترمارک", callback_data="cb_media_tiktok"),
        UnifiedInlineButton(text="📺 آپارات (تمام کیفیت‌ها)", callback_data="cb_media_aparat"),
    )
    kb.add_row(
        UnifiedInlineButton(text="🎶 ساندکلاد (موزیک MP3)", callback_data="cb_media_soundcloud"),
        UnifiedInlineButton(text="🎵 اسپاتیفای و رادیوجوان", callback_data="cb_media_music"),
    )
    kb.add_row(
        UnifiedInlineButton(text="🐦 توییتر / X", callback_data="cb_media_twitter"),
        UnifiedInlineButton(text="📌 پینترست", callback_data="cb_media_pinterest"),
    )
    kb.add_row(
        UnifiedInlineButton(text="🎧 شناسایی موزیک (Shazam)", callback_data="cb_media_shazam"),
        UnifiedInlineButton(text="✂️ استخراج صوت از ویدیو", callback_data="cb_media_extract_mp3"),
    )
    kb.add_row(back_button())
    return kb

def tools_menu_keyboard() -> UnifiedInlineKeyboard:
    kb = UnifiedInlineKeyboard()
    kb.add_row(
        UnifiedInlineButton(text="📈 نرخ لحظه‌ای ارز و کریپتو", callback_data="cb_tool_crypto"),
        UnifiedInlineButton(text="🛡 دریافت کانفیگ VPN روزانه", callback_data="cb_tool_vpn"),
    )
    kb.add_row(
        UnifiedInlineButton(text="☁️ آپلودر دائمی (Deep-Link)", callback_data="cb_tool_uploader"),
        UnifiedInlineButton(text="📸 اسکرین‌شات وب‌سایت", callback_data="cb_tool_screenshot"),
    )
    kb.add_row(
        UnifiedInlineButton(text="🔗 کوتاه‌کننده لینک", callback_data="cb_tool_shortener"),
        UnifiedInlineButton(text="⚡️ کامپایلر آنلاین کد", callback_data="cb_tool_compiler"),
    )
    kb.add_row(
        UnifiedInlineButton(text="📞 مزاحم‌یاب (Numberbook)", callback_data="cb_tool_numberbook"),
        UnifiedInlineButton(text="⚽️ نتایج زنده فوتبال و لیگ", callback_data="cb_tool_football"),
    )
    kb.add_row(
        UnifiedInlineButton(text="🆔 آیدی‌یاب پیام و کاربر", callback_data="cb_tool_id_finder"),
        UnifiedInlineButton(text="📖 جستجوی دانشنامه ویکی‌پدیا", callback_data="cb_tool_wiki"),
    )
    kb.add_row(back_button())
    return kb

def games_menu_keyboard() -> UnifiedInlineKeyboard:
    kb = UnifiedInlineKeyboard()
    kb.add_row(
        UnifiedInlineButton(text="🏙 شبیه‌ساز زندگی و شهر (Life RP)", callback_data="cb_game_rp"),
    )
    kb.add_row(
        UnifiedInlineButton(text="🕵️ بازی مافیا آنلاین گروهی", callback_data="cb_game_mafia"),
        UnifiedInlineButton(text="🐾 هاپ‌پوینت و پرورش حیوان", callback_data="cb_game_hoppoint"),
    )
    kb.add_row(back_button())
    return kb

def profile_menu_keyboard() -> UnifiedInlineKeyboard:
    kb = UnifiedInlineKeyboard()
    kb.add_row(
        UnifiedInlineButton(text="🎁 دریافت هدیه روزانه", callback_data="cb_claim_daily"),
        UnifiedInlineButton(text="💎 خرید الماس و VIP", callback_data="cb_menu_vip"),
    )
    kb.add_row(
        UnifiedInlineButton(text="📜 تاریخچه تراکنش‌ها", callback_data="cb_tx_history"),
        UnifiedInlineButton(text="👥 دوستان دعوت شده", callback_data="cb_menu_referral"),
    )
    kb.add_row(back_button())
    return kb

def admin_menu_keyboard() -> UnifiedInlineKeyboard:
    kb = UnifiedInlineKeyboard()
    kb.add_row(
        UnifiedInlineButton(text="📊 آمار تفکیکی پلتفرم‌ها", callback_data="cb_admin_stats"),
        UnifiedInlineButton(text="📢 ارسال همگانی (Broadcast)", callback_data="cb_admin_broadcast"),
    )
    kb.add_row(
        UnifiedInlineButton(text="🔒 مدیریت کانال‌های جوین اجباری", callback_data="cb_admin_channels"),
        UnifiedInlineButton(text="⚙️ تغییر وضعیت تعمیرات", callback_data="cb_admin_maintenance"),
    )
    kb.add_row(
        UnifiedInlineButton(text="🎁 اهدای امتیاز به کاربر", callback_data="cb_admin_give_points"),
        UnifiedInlineButton(text="🚫 مسدودسازی کاربر (Ban)", callback_data="cb_admin_ban"),
    )
    kb.add_row(
        UnifiedInlineButton(text="✅ رفع مسدودیت (Unban)", callback_data="cb_admin_unban"),
        UnifiedInlineButton(text="🎫 پاسخ به تیکت‌های باز", callback_data="cb_admin_tickets"),
    )
    kb.add_row(back_button())
    return kb

def cancel_state_keyboard() -> UnifiedInlineKeyboard:
    """Button to abort active FSM state."""
    kb = UnifiedInlineKeyboard()
    kb.add_row(UnifiedInlineButton(text="❌ انصراف و لغو عملیات", callback_data="cb_cancel_state"))
    return kb
