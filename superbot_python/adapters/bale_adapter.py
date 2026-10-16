"""
Bale Platform Adapter (Bale Messenger Bot API)
Connects directly to https://tapi.bale.ai/bot{token}/
"""
from typing import Optional, Dict, Any, Union
from adapters.base_adapter import BasePlatformAdapter
from core.unified_models import UnifiedPlatform, UnifiedInlineKeyboard
from core.http_client import AsyncHttpClient

class BaleAdapter(BasePlatformAdapter):
    def __init__(self, token: str):
        super().__init__(UnifiedPlatform.BALE, token)
        self.base_url = f"https://tapi.bale.ai/bot{token}"

    def format_keyboard(self, keyboard: Optional[UnifiedInlineKeyboard]) -> Optional[Dict[str, Any]]:
        if not keyboard or not keyboard.rows:
            return None
        formatted_rows = []
        for row in keyboard.rows:
            formatted_buttons = []
            for btn in row:
                btn_dict = {"text": btn.text}
                if btn.url:
                    btn_dict["url"] = btn.url
                elif btn.callback_data:
                    btn_dict["callback_data"] = btn.callback_data
                formatted_buttons.append(btn_dict)
            if formatted_buttons:
                formatted_rows.append(formatted_buttons)
        return {"inline_keyboard": formatted_rows}

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
        }
        kb = self.format_keyboard(reply_markup)
        if kb:
            payload["reply_markup"] = kb

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
            "message_id": int(message_id),
            "text": text,
        }
        kb = self.format_keyboard(reply_markup)
        if kb:
            payload["reply_markup"] = kb

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
            "photo": photo,
        }
        if caption:
            payload["caption"] = caption
        kb = self.format_keyboard(reply_markup)
        if kb:
            payload["reply_markup"] = kb

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
            "video": video,
        }
        if caption:
            payload["caption"] = caption
        kb = self.format_keyboard(reply_markup)
        if kb:
            payload["reply_markup"] = kb

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
            "document": document,
        }
        if caption:
            payload["caption"] = caption
        kb = self.format_keyboard(reply_markup)
        if kb:
            payload["reply_markup"] = kb

        return await AsyncHttpClient.post(f"{self.base_url}/sendDocument", payload)

    async def answer_callback_query(
        self,
        callback_query_id: str,
        text: Optional[str] = None,
        show_alert: bool = False
    ) -> bool:
        payload: Dict[str, Any] = {
            "callback_query_id": str(callback_query_id),
            "show_alert": show_alert,
        }
        if text:
            payload["text"] = text
        res = await AsyncHttpClient.post(f"{self.base_url}/answerCallbackQuery", payload)
        return res.get("ok", False)

    async def check_channel_member(
        self,
        channel_id: str,
        user_id: Union[str, int]
    ) -> bool:
        """
        Bale getChatMember endpoint to verify membership.
        """
        payload = {
            "chat_id": str(channel_id),
            "user_id": int(user_id)
        }
        res = await AsyncHttpClient.post(f"{self.base_url}/getChatMember", payload)
        if not res.get("ok"):
            return False
        status = res.get("result", {}).get("status", "")
        return status in ["creator", "administrator", "member"]
