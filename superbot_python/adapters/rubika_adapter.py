"""
Rubika Platform Adapter (Rubika Messenger Bot API v3)
Connects to official Rubika Bot API: https://botapi.rubika.ir/v3/{token}/
Supports:
- inline_keypad: Glass buttons under messages
- chat_keypad: Persistent buttons above chat input
"""

from typing import Optional, Dict, Any, Union
from adapters.base_adapter import BasePlatformAdapter
from core.unified_models import UnifiedPlatform, UnifiedInlineKeyboard
from core.http_client import AsyncHttpClient

DEFAULT_RUBIKA_CHAT_KEYPAD = {
    "rows": [
        {
            "buttons": [
                {"id": "btn_dl", "type": "Simple", "button_text": "📥 دانلودر همه‌کاره"},
                {"id": "btn_media", "type": "Simple", "button_text": "📸 اینستاگرام و یوتیوب"},
            ]
        },
        {
            "buttons": [
                {"id": "btn_games", "type": "Simple", "button_text": "🎮 مافیا و گیم"},
                {"id": "btn_tools", "type": "Simple", "button_text": "🛠️ ابزارها و خدمات"},
            ]
        },
        {
            "buttons": [
                {"id": "btn_wallet", "type": "Simple", "button_text": "💳 کیف پول و حساب"},
                {"id": "btn_start", "type": "Simple", "button_text": "🔙 منوی اصلی /start"},
            ]
        }
    ],
    "resize_keyboard": True,
    "on_time_keyboard": False
}

class RubikaAdapter(BasePlatformAdapter):
    def __init__(self, token: str):
        super().__init__(UnifiedPlatform.RUBIKA, token)
        self.base_url = f"https://botapi.rubika.ir/v3/{token}"

    def format_keyboard(self, keyboard: Optional[UnifiedInlineKeyboard]) -> Optional[Dict[str, Any]]:
        """
        Translates UnifiedInlineKeyboard into Rubika v3 inline_keypad structure:
        {"rows": [{"buttons": [{"id": ..., "type": "Simple"|"Link", "button_text": ...}]}]}
        """
        if not keyboard or not keyboard.rows:
            return None

        rows_data = []
        for row in keyboard.rows:
            buttons_in_row = []
            for btn in row:
                if btn.url:
                    buttons_in_row.append({
                        "id": btn.callback_data or "btn_link",
                        "type": "Link",
                        "button_text": btn.text,
                        "url": btn.url,
                    })
                else:
                    buttons_in_row.append({
                        "id": btn.callback_data or btn.text,
                        "type": "Simple",
                        "button_text": btn.text,
                    })
            if buttons_in_row:
                rows_data.append({"buttons": buttons_in_row})

        return {"rows": rows_data}

    async def send_message(
        self,
        chat_id: Union[str, int],
        text: str,
        reply_markup: Optional[UnifiedInlineKeyboard] = None,
        parse_mode: str = "HTML"
    ) -> Dict[str, Any]:
        payload: Dict[str, Any] = {
            "chat_id": str(chat_id),
            "text": text,
            "chat_keypad_type": "New",
            "chat_keypad": DEFAULT_RUBIKA_CHAT_KEYPAD,
        }
        kb = self.format_keyboard(reply_markup)
        if kb and kb["rows"]:
            payload["inline_keypad"] = kb

        return await AsyncHttpClient.post(f"{self.base_url}/sendMessage", payload)

    async def edit_message_text(
        self,
        chat_id: Union[str, int],
        message_id: Union[str, int],
        text: str,
        reply_markup: Optional[UnifiedInlineKeyboard] = None,
        parse_mode: str = "HTML"
    ) -> Dict[str, Any]:
        payload: Dict[str, Any] = {
            "chat_id": str(chat_id),
            "message_id": str(message_id),
            "text": text,
        }
        kb = self.format_keyboard(reply_markup)
        if kb and kb["rows"]:
            payload["inline_keypad"] = kb

        return await AsyncHttpClient.post(f"{self.base_url}/editMessageText", payload)

    async def send_photo(
        self,
        chat_id: Union[str, int],
        photo: str,
        caption: Optional[str] = None,
        reply_markup: Optional[UnifiedInlineKeyboard] = None
    ) -> Dict[str, Any]:
        payload: Dict[str, Any] = {
            "chat_id": str(chat_id),
            "photo_url": photo,
            "chat_keypad_type": "New",
            "chat_keypad": DEFAULT_RUBIKA_CHAT_KEYPAD,
        }
        if caption:
            payload["caption"] = caption
        kb = self.format_keyboard(reply_markup)
        if kb and kb["rows"]:
            payload["inline_keypad"] = kb

        return await AsyncHttpClient.post(f"{self.base_url}/sendPhoto", payload)

    async def send_video(
        self,
        chat_id: Union[str, int],
        video: str,
        caption: Optional[str] = None,
        reply_markup: Optional[UnifiedInlineKeyboard] = None
    ) -> Dict[str, Any]:
        payload: Dict[str, Any] = {
            "chat_id": str(chat_id),
            "video_url": video,
            "chat_keypad_type": "New",
            "chat_keypad": DEFAULT_RUBIKA_CHAT_KEYPAD,
        }
        if caption:
            payload["caption"] = caption
        kb = self.format_keyboard(reply_markup)
        if kb and kb["rows"]:
            payload["inline_keypad"] = kb

        return await AsyncHttpClient.post(f"{self.base_url}/sendVideo", payload)

    async def send_document(
        self,
        chat_id: Union[str, int],
        document: str,
        caption: Optional[str] = None,
        reply_markup: Optional[UnifiedInlineKeyboard] = None
    ) -> Dict[str, Any]:
        payload: Dict[str, Any] = {
            "chat_id": str(chat_id),
            "file_url": document,
            "chat_keypad_type": "New",
            "chat_keypad": DEFAULT_RUBIKA_CHAT_KEYPAD,
        }
        if caption:
            payload["caption"] = caption
        kb = self.format_keyboard(reply_markup)
        if kb and kb["rows"]:
            payload["inline_keypad"] = kb

        return await AsyncHttpClient.post(f"{self.base_url}/sendFile", payload)

    async def answer_callback_query(
        self,
        callback_query_id: str,
        text: Optional[str] = None,
        show_alert: bool = False
    ) -> bool:
        payload: Dict[str, Any] = {
            "callback_id": str(callback_query_id),
        }
        if text:
            payload["text"] = text
        res = await AsyncHttpClient.post(f"{self.base_url}/answerCallback", payload)
        return res.get("ok", True)

    async def check_channel_member(
        self,
        channel_id: str,
        user_id: Union[str, int]
    ) -> bool:
        payload = {
            "channel_guid": str(channel_id),
            "user_guid": str(user_id)
        }
        res = await AsyncHttpClient.post(f"{self.base_url}/getChatMember", payload)
        if not res.get("ok"):
            return False
        return res.get("result", {}).get("is_member", False)
