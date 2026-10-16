"""
Unified Sender Layer
Routes outgoing actions to the corresponding platform adapter (Telegram, Bale, Rubika).
Supports both instance (unified_sender.send_message) and classmethod (UnifiedSender.send_message) calls.
"""
import asyncio
from typing import Dict, Any, Optional, Union, List, Tuple
from core.unified_models import UnifiedPlatform, UnifiedInlineKeyboard
from adapters.base_adapter import BasePlatformAdapter
from adapters.telegram_adapter import TelegramAdapter
from adapters.bale_adapter import BaleAdapter
from adapters.rubika_adapter import RubikaAdapter
from config import TELEGRAM_BOT_TOKEN, BALE_BOT_TOKEN, RUBIKA_BOT_TOKEN

class UnifiedSender:
    _instance: Optional["UnifiedSender"] = None

    def __init__(self):
        self.adapters: Dict[UnifiedPlatform, BasePlatformAdapter] = {
            UnifiedPlatform.TELEGRAM: TelegramAdapter(TELEGRAM_BOT_TOKEN),
            UnifiedPlatform.BALE: BaleAdapter(BALE_BOT_TOKEN),
            UnifiedPlatform.RUBIKA: RubikaAdapter(RUBIKA_BOT_TOKEN),
        }
        UnifiedSender._instance = self

    @classmethod
    def get_instance(cls) -> "UnifiedSender":
        if cls._instance is None:
            cls._instance = UnifiedSender()
        return cls._instance

    def get_adapter(self, platform: Union[UnifiedPlatform, str]) -> BasePlatformAdapter:
        if isinstance(platform, str):
            platform = UnifiedPlatform(platform.lower())
        adapter = self.adapters.get(platform)
        if not adapter:
            raise ValueError(f"No adapter registered for platform: {platform}")
        return adapter

    async def _send_message(
        self,
        platform: Union[UnifiedPlatform, str],
        chat_id: Union[str, int],
        text: str,
        reply_markup: Optional[UnifiedInlineKeyboard] = None,
        parse_mode: str = "HTML"
    ) -> Dict[str, Any]:
        adapter = self.get_adapter(platform)
        return await adapter.send_message(chat_id, text, reply_markup, parse_mode)

    async def _edit_message_text(
        self,
        platform: Union[UnifiedPlatform, str],
        chat_id: Union[str, int],
        message_id: Union[str, int],
        text: str,
        reply_markup: Optional[UnifiedInlineKeyboard] = None,
        parse_mode: str = "HTML"
    ) -> Dict[str, Any]:
        adapter = self.get_adapter(platform)
        return await adapter.edit_message_text(chat_id, message_id, text, reply_markup, parse_mode)

    async def _send_photo(
        self,
        platform: Union[UnifiedPlatform, str],
        chat_id: Union[str, int],
        photo: str,
        caption: Optional[str] = None,
        reply_markup: Optional[UnifiedInlineKeyboard] = None
    ) -> Dict[str, Any]:
        adapter = self.get_adapter(platform)
        return await adapter.send_photo(chat_id, photo, caption, reply_markup)

    async def _send_video(
        self,
        platform: Union[UnifiedPlatform, str],
        chat_id: Union[str, int],
        video: str,
        caption: Optional[str] = None,
        reply_markup: Optional[UnifiedInlineKeyboard] = None
    ) -> Dict[str, Any]:
        adapter = self.get_adapter(platform)
        return await adapter.send_video(chat_id, video, caption, reply_markup)

    async def _send_document(
        self,
        platform: Union[UnifiedPlatform, str],
        chat_id: Union[str, int],
        document: str,
        caption: Optional[str] = None,
        reply_markup: Optional[UnifiedInlineKeyboard] = None
    ) -> Dict[str, Any]:
        adapter = self.get_adapter(platform)
        return await adapter.send_document(chat_id, document, caption, reply_markup)

    async def _send_audio(
        self,
        platform: Union[UnifiedPlatform, str],
        chat_id: Union[str, int],
        audio: str,
        caption: Optional[str] = None,
        reply_markup: Optional[UnifiedInlineKeyboard] = None
    ) -> Dict[str, Any]:
        adapter = self.get_adapter(platform)
        if hasattr(adapter, "send_audio"):
            return await adapter.send_audio(chat_id, audio, caption, reply_markup)
        return await adapter.send_document(chat_id, audio, caption, reply_markup)

    async def _send_chat_action(
        self,
        platform: Union[UnifiedPlatform, str],
        chat_id: Union[str, int],
        action: str = "typing"
    ) -> Dict[str, Any]:
        adapter = self.get_adapter(platform)
        if hasattr(adapter, "send_chat_action"):
            return await adapter.send_chat_action(chat_id, action)
        return {"ok": True}

    async def _answer_callback(
        self,
        platform: Union[UnifiedPlatform, str],
        callback_query_id: str,
        text: Optional[str] = None,
        show_alert: bool = False
    ) -> bool:
        adapter = self.get_adapter(platform)
        return await adapter.answer_callback_query(callback_query_id, text, show_alert)

    async def _check_channel_member(
        self,
        platform: Union[UnifiedPlatform, str],
        channel_id: str,
        user_id: Union[str, int]
    ) -> bool:
        adapter = self.get_adapter(platform)
        return await adapter.check_channel_member(channel_id, user_id)

    # ---- Classmethod / Instance Hybrid Interfaces ----
    @classmethod
    async def send_message(cls, platform: Union[UnifiedPlatform, str], chat_id: Union[str, int], text: str, reply_markup: Optional[UnifiedInlineKeyboard] = None, parse_mode: str = "HTML") -> Dict[str, Any]:
        return await cls.get_instance()._send_message(platform, chat_id, text, reply_markup, parse_mode)

    @classmethod
    async def edit_message_text(cls, platform: Union[UnifiedPlatform, str], chat_id: Union[str, int], message_id: Union[str, int], text: str, reply_markup: Optional[UnifiedInlineKeyboard] = None, parse_mode: str = "HTML") -> Dict[str, Any]:
        return await cls.get_instance()._edit_message_text(platform, chat_id, message_id, text, reply_markup, parse_mode)

    @classmethod
    async def send_photo(cls, platform: Union[UnifiedPlatform, str], chat_id: Union[str, int], photo: str, caption: Optional[str] = None, reply_markup: Optional[UnifiedInlineKeyboard] = None) -> Dict[str, Any]:
        return await cls.get_instance()._send_photo(platform, chat_id, photo, caption, reply_markup)

    @classmethod
    async def send_video(cls, platform: Union[UnifiedPlatform, str], chat_id: Union[str, int], video: str, caption: Optional[str] = None, reply_markup: Optional[UnifiedInlineKeyboard] = None) -> Dict[str, Any]:
        return await cls.get_instance()._send_video(platform, chat_id, video, caption, reply_markup)

    @classmethod
    async def send_document(cls, platform: Union[UnifiedPlatform, str], chat_id: Union[str, int], document: str, caption: Optional[str] = None, reply_markup: Optional[UnifiedInlineKeyboard] = None) -> Dict[str, Any]:
        return await cls.get_instance()._send_document(platform, chat_id, document, caption, reply_markup)

    @classmethod
    async def send_audio(cls, platform: Union[UnifiedPlatform, str], chat_id: Union[str, int], audio: str, caption: Optional[str] = None, reply_markup: Optional[UnifiedInlineKeyboard] = None) -> Dict[str, Any]:
        return await cls.get_instance()._send_audio(platform, chat_id, audio, caption, reply_markup)

    @classmethod
    async def send_chat_action(cls, platform: Union[UnifiedPlatform, str], chat_id: Union[str, int], action: str = "typing") -> Dict[str, Any]:
        return await cls.get_instance()._send_chat_action(platform, chat_id, action)

    @classmethod
    async def answer_callback(cls, platform: Union[UnifiedPlatform, str], callback_query_id: str, text: Optional[str] = None, show_alert: bool = False) -> bool:
        return await cls.get_instance()._answer_callback(platform, callback_query_id, text, show_alert)

    @classmethod
    async def check_channel_member(cls, platform: Union[UnifiedPlatform, str], channel_id: str, user_id: Union[str, int]) -> bool:
        return await cls.get_instance()._check_channel_member(platform, channel_id, user_id)

    @classmethod
    async def broadcast(
        cls,
        targets: List[Tuple[str, str]],
        text: str,
        reply_markup: Optional[UnifiedInlineKeyboard] = None
    ) -> Tuple[int, int]:
        instance = cls.get_instance()
        success = 0
        fail = 0

        async def _send_one(target_platform: str, user_id: str):
            nonlocal success, fail
            try:
                res = await instance._send_message(target_platform, user_id, text, reply_markup)
                if res.get("ok", True):
                    success += 1
                else:
                    fail += 1
            except Exception:
                fail += 1

        chunk_size = 20
        for i in range(0, len(targets), chunk_size):
            chunk = targets[i:i + chunk_size]
            tasks = [_send_one(p, uid) for p, uid in chunk]
            await asyncio.gather(*tasks)
            await asyncio.sleep(0.1)

        return success, fail

# Global singleton sender instance
unified_sender = UnifiedSender.get_instance()
