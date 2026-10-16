"""
Mandatory Channel Membership Verification Service (Force Join)
Enforces membership across Telegram, Bale, and Rubika channels before allowing bot access.
"""
from typing import Tuple, List, Dict, Any, Optional
from database.database import db
from core.unified_models import UnifiedInlineKeyboard, UnifiedInlineButton, UnifiedPlatform
from core.unified_sender import unified_sender

class ForceJoinService:
    @classmethod
    async def verify_membership(
        cls,
        platform: str,
        user_id: str
    ) -> Tuple[bool, Optional[str], Optional[UnifiedInlineKeyboard]]:
        """
        Verifies if user has joined all required channels for their platform.
        Returns:
            (is_allowed, lock_message, inline_keyboard)
        """
        # 1. Check if force join is globally enabled
        enabled_setting = db.get_setting("force_join_enabled", "1")
        if enabled_setting != "1":
            return True, None, None

        # 2. Get active channels for this platform
        channels = db.get_active_force_channels(platform)
        if not channels:
            return True, None, None

        unjoined_channels: List[Dict[str, Any]] = []

        # 3. Check membership for each channel
        for ch in channels:
            channel_id = ch["channel_id"]
            try:
                is_member = await unified_sender.check_channel_member(platform, channel_id, user_id)
                if not is_member:
                    unjoined_channels.append(ch)
            except Exception:
                # If API call fails or bot lacks admin in channel, don't lock user out
                pass

        if not unjoined_channels:
            return True, None, None

        # 4. Build Lock Screen and Inline Buttons
        text = (
            "🔒 <b>عضویت در کانال‌های رسمی الزامی است!</b>\n\n"
            "برای استفاده رایگان و نامحدود از سوپر ربات همه‌کاره، "
            "لطفاً در کانال(های) اسپانسر زیر عضو شوید، سپس دکمه <b>«تایید و بررسی عضویت»</b> را لمس کنید:"
        )

        kb = UnifiedInlineKeyboard()
        for idx, ch in enumerate(unjoined_channels, start=1):
            btn_title = f"📢 عضویت در {ch.get('channel_title', f'کانال {idx}')}"
            kb.add_row(UnifiedInlineButton(text=btn_title, url=ch["channel_url"]))

        # Check button
        kb.add_row(UnifiedInlineButton(text="🔄 تایید و بررسی عضویت", callback_data="cb_check_force_join"))

        return False, text, kb
