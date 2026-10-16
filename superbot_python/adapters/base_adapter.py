"""
Abstract Base Platform Adapter (Adapter Pattern Contract)
Defines uniform interface for Telegram, Bale, and Rubika bots.
"""
from abc import ABC, abstractmethod
from typing import Optional, Dict, Any, Union
from core.unified_models import UnifiedPlatform, UnifiedInlineKeyboard

class BasePlatformAdapter(ABC):
    def __init__(self, platform: UnifiedPlatform, token: str):
        self.platform = platform
        self.token = token

    @abstractmethod
    async def send_message(
        self,
        chat_id: Union[str, int],
        text: str,
        reply_markup: Optional[UnifiedInlineKeyboard] = None,
        parse_mode: str = "HTML"
    ) -> Dict[str, Any]:
        """Sends a text message with optional inline keyboard."""
        pass

    @abstractmethod
    async def edit_message_text(
        self,
        chat_id: Union[str, int],
        message_id: Union[str, int],
        text: str,
        reply_markup: Optional[UnifiedInlineKeyboard] = None,
        parse_mode: str = "HTML"
    ) -> Dict[str, Any]:
        """Edits an existing text message and its keyboard."""
        pass

    @abstractmethod
    async def send_photo(
        self,
        chat_id: Union[str, int],
        photo: str,                             # URL or File ID
        caption: Optional[str] = None,
        reply_markup: Optional[UnifiedInlineKeyboard] = None
    ) -> Dict[str, Any]:
        """Sends a photo with optional caption."""
        pass

    @abstractmethod
    async def send_video(
        self,
        chat_id: Union[str, int],
        video: str,                             # URL or File ID
        caption: Optional[str] = None,
        reply_markup: Optional[UnifiedInlineKeyboard] = None
    ) -> Dict[str, Any]:
        """Sends a video with optional caption."""
        pass

    @abstractmethod
    async def send_document(
        self,
        chat_id: Union[str, int],
        document: str,
        caption: Optional[str] = None,
        reply_markup: Optional[UnifiedInlineKeyboard] = None
    ) -> Dict[str, Any]:
        """Sends a file/document."""
        pass

    @abstractmethod
    async def answer_callback_query(
        self,
        callback_query_id: str,
        text: Optional[str] = None,
        show_alert: bool = False
    ) -> bool:
        """Answers an inline button click."""
        pass

    @abstractmethod
    async def check_channel_member(
        self,
        channel_id: str,
        user_id: Union[str, int]
    ) -> bool:
        """Verifies if the user is a member of the mandatory channel."""
        pass

    @abstractmethod
    def format_keyboard(self, keyboard: Optional[UnifiedInlineKeyboard]) -> Any:
        """Translates UnifiedInlineKeyboard into platform-native JSON structure."""
        pass
