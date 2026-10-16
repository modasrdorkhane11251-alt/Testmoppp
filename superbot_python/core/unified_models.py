"""
Unified Cross-Platform Data Models for Telegram, Bale, and Rubika
Normalizes all platform-specific update payloads into standard python dataclasses.
"""
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional, List, Dict, Any

class UnifiedPlatform(str, Enum):
    TELEGRAM = "telegram"
    BALE = "bale"
    RUBIKA = "rubika"

@dataclass
class UnifiedUser:
    id: str                                     # Platform-specific unique user ID
    platform: UnifiedPlatform
    first_name: str = "کاربر"
    last_name: Optional[str] = None
    username: Optional[str] = None
    is_bot: bool = False

    @property
    def full_name(self) -> str:
        if self.last_name:
            return f"{self.first_name} {self.last_name}".strip()
        return self.first_name

    @property
    def display_tag(self) -> str:
        if self.username:
            return f"@{self.username}"
        return self.full_name

@dataclass
class UnifiedChat:
    id: str
    type: str = "private"                       # 'private', 'group', 'supergroup', 'channel'
    title: Optional[str] = None
    username: Optional[str] = None

@dataclass
class UnifiedInlineButton:
    text: str
    callback_data: Optional[str] = None
    url: Optional[str] = None

@dataclass
class UnifiedInlineKeyboard:
    rows: List[List[UnifiedInlineButton]] = field(default_factory=list)

    def add_row(self, *buttons: UnifiedInlineButton):
        self.rows.append(list(buttons))
        return self

@dataclass
class UnifiedMessage:
    message_id: str
    from_user: UnifiedUser
    chat: UnifiedChat
    text: Optional[str] = None
    caption: Optional[str] = None
    photo_file_id: Optional[str] = None
    video_file_id: Optional[str] = None
    audio_file_id: Optional[str] = None
    document_file_id: Optional[str] = None
    reply_to_message_id: Optional[str] = None
    reply_to_text: Optional[str] = None
    raw_payload: Dict[str, Any] = field(default_factory=dict)

    @property
    def effective_text(self) -> str:
        """Returns either text or caption, cleanly stripped."""
        return (self.text or self.caption or "").strip()

@dataclass
class UnifiedCallbackQuery:
    id: str
    from_user: UnifiedUser
    message: Optional[UnifiedMessage] = None
    data: str = ""
    raw_payload: Dict[str, Any] = field(default_factory=dict)

@dataclass
class UnifiedUpdate:
    update_id: str
    platform: UnifiedPlatform
    message: Optional[UnifiedMessage] = None
    callback_query: Optional[UnifiedCallbackQuery] = None
    raw_payload: Dict[str, Any] = field(default_factory=dict)

    @property
    def user(self) -> Optional[UnifiedUser]:
        if self.callback_query:
            return self.callback_query.from_user
        if self.message:
            return self.message.from_user
        return None

    @property
    def chat(self) -> Optional[UnifiedChat]:
        if self.callback_query and self.callback_query.message:
            return self.callback_query.message.chat
        if self.message:
            return self.message.chat
        return None

    @property
    def chat_id(self) -> Optional[str]:
        c = self.chat
        if c:
            return c.id
        if self.user:
            return self.user.id
        return None
