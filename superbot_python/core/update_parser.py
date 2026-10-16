"""
Unified Update Parser for Telegram, Bale, and Rubika
Transforms heterogeneous platform webhooks into normalized UnifiedUpdate dataclasses.
"""
from typing import Dict, Any, Optional
from core.unified_models import (
    UnifiedPlatform,
    UnifiedUpdate,
    UnifiedMessage,
    UnifiedCallbackQuery,
    UnifiedUser,
    UnifiedChat,
)

class UnifiedUpdateParser:
    @classmethod
    def parse(cls, payload: Dict[str, Any], platform_hint: Optional[str] = None) -> Optional[UnifiedUpdate]:
        """
        Parses raw webhook JSON payload into a UnifiedUpdate.
        Auto-detects platform if not explicitly supplied.
        """
        if not isinstance(payload, dict):
            return None

        platform = cls._detect_platform(payload, platform_hint)
        if platform == UnifiedPlatform.TELEGRAM:
            return cls._parse_telegram(payload)
        elif platform == UnifiedPlatform.BALE:
            return cls._parse_bale(payload)
        elif platform == UnifiedPlatform.RUBIKA:
            return cls._parse_rubika(payload)

        # Fallback to telegram format
        return cls._parse_telegram(payload)

    @classmethod
    def _detect_platform(cls, payload: Dict[str, Any], hint: Optional[str] = None) -> UnifiedPlatform:
        if hint:
            hint_lower = hint.lower()
            if "bale" in hint_lower:
                return UnifiedPlatform.BALE
            if "rubika" in hint_lower:
                return UnifiedPlatform.RUBIKA
            if "telegram" in hint_lower:
                return UnifiedPlatform.TELEGRAM

        # Heuristic detection based on unique payload keys
        if "author_guid" in str(payload) or "button_clicked" in payload or "guid" in payload:
            return UnifiedPlatform.RUBIKA
        if payload.get("source") == "bale" or "bale" in str(payload.get("origin", "")).lower():
            return UnifiedPlatform.BALE

        return UnifiedPlatform.TELEGRAM

    @classmethod
    def _parse_telegram(cls, payload: Dict[str, Any]) -> UnifiedUpdate:
        update_id = str(payload.get("update_id", "0"))
        unified = UnifiedUpdate(
            update_id=update_id,
            platform=UnifiedPlatform.TELEGRAM,
            raw_payload=payload
        )

        # 1. Message update
        if "message" in payload and isinstance(payload["message"], dict):
            msg = payload["message"]
            from_dict = msg.get("from", {})
            user = UnifiedUser(
                id=str(from_dict.get("id", "0")),
                platform=UnifiedPlatform.TELEGRAM,
                first_name=from_dict.get("first_name", "کاربر"),
                last_name=from_dict.get("last_name"),
                username=from_dict.get("username"),
                is_bot=from_dict.get("is_bot", False)
            )

            chat_dict = msg.get("chat", {})
            chat = UnifiedChat(
                id=str(chat_dict.get("id", user.id)),
                type=chat_dict.get("type", "private"),
                title=chat_dict.get("title"),
                username=chat_dict.get("username")
            )

            # Reply to message extraction
            reply_id = None
            reply_text = None
            if "reply_to_message" in msg and isinstance(msg["reply_to_message"], dict):
                reply_id = str(msg["reply_to_message"].get("message_id", ""))
                reply_text = msg["reply_to_message"].get("text") or msg["reply_to_message"].get("caption")

            photo_id = None
            if "photo" in msg and isinstance(msg["photo"], list) and msg["photo"]:
                photo_id = msg["photo"][-1].get("file_id")

            video_id = msg.get("video", {}).get("file_id") if isinstance(msg.get("video"), dict) else None
            audio_id = msg.get("audio", {}).get("file_id") if isinstance(msg.get("audio"), dict) else None
            doc_id = msg.get("document", {}).get("file_id") if isinstance(msg.get("document"), dict) else None

            unified.message = UnifiedMessage(
                message_id=str(msg.get("message_id", "0")),
                from_user=user,
                chat=chat,
                text=msg.get("text"),
                caption=msg.get("caption"),
                photo_file_id=photo_id,
                video_file_id=video_id,
                audio_file_id=audio_id,
                document_file_id=doc_id,
                reply_to_message_id=reply_id,
                reply_to_text=reply_text,
                raw_payload=msg
            )

        # 2. Callback query update
        elif "callback_query" in payload and isinstance(payload["callback_query"], dict):
            cb = payload["callback_query"]
            from_dict = cb.get("from", {})
            user = UnifiedUser(
                id=str(from_dict.get("id", "0")),
                platform=UnifiedPlatform.TELEGRAM,
                first_name=from_dict.get("first_name", "کاربر"),
                last_name=from_dict.get("last_name"),
                username=from_dict.get("username"),
                is_bot=from_dict.get("is_bot", False)
            )

            msg_obj = None
            if "message" in cb and isinstance(cb["message"], dict):
                msg_dict = cb["message"]
                chat_dict = msg_dict.get("chat", {})
                chat = UnifiedChat(
                    id=str(chat_dict.get("id", user.id)),
                    type=chat_dict.get("type", "private"),
                    title=chat_dict.get("title")
                )
                msg_obj = UnifiedMessage(
                    message_id=str(msg_dict.get("message_id", "0")),
                    from_user=user,
                    chat=chat,
                    text=msg_dict.get("text"),
                    raw_payload=msg_dict
                )

            unified.callback_query = UnifiedCallbackQuery(
                id=str(cb.get("id", "0")),
                from_user=user,
                message=msg_obj,
                data=str(cb.get("data", "")),
                raw_payload=cb
            )

        return unified

    @classmethod
    def _parse_bale(cls, payload: Dict[str, Any]) -> UnifiedUpdate:
        """Parses Bale updates (Bale API is largely Telegram-compatible)."""
        up = cls._parse_telegram(payload)
        up.platform = UnifiedPlatform.BALE
        if up.message:
            up.message.from_user.platform = UnifiedPlatform.BALE
        if up.callback_query:
            up.callback_query.from_user.platform = UnifiedPlatform.BALE
        return up

    @classmethod
    def _parse_rubika(cls, payload: Dict[str, Any]) -> UnifiedUpdate:
        """Parses Rubika's official webhook payloads."""
        update_id = str(payload.get("update_id", payload.get("id", "0")))
        unified = UnifiedUpdate(
            update_id=update_id,
            platform=UnifiedPlatform.RUBIKA,
            raw_payload=payload
        )

        # Rubika button click event
        if "button_clicked" in payload:
            btn = payload["button_clicked"]
            user = UnifiedUser(
                id=str(btn.get("author_guid", btn.get("user_id", "0"))),
                platform=UnifiedPlatform.RUBIKA,
                first_name=btn.get("author_title", "کاربر روبیکا"),
            )
            chat = UnifiedChat(
                id=str(btn.get("chat_id", user.id)),
                type="private"
            )
            msg_obj = UnifiedMessage(
                message_id=str(btn.get("message_id", "0")),
                from_user=user,
                chat=chat,
                text="",
                raw_payload=btn
            )
            unified.callback_query = UnifiedCallbackQuery(
                id=str(btn.get("callback_id", btn.get("id", "0"))),
                from_user=user,
                message=msg_obj,
                data=str(btn.get("button_id", btn.get("data", ""))),
                raw_payload=btn
            )
            return unified

        # Rubika new message event
        msg_payload = payload.get("new_message", payload.get("message", payload))
        author_guid = str(msg_payload.get("author_guid", msg_payload.get("author_id", msg_payload.get("chat_id", "0"))))
        first_name = msg_payload.get("author_title", msg_payload.get("first_name", "کاربر روبیکا"))

        user = UnifiedUser(
            id=author_guid,
            platform=UnifiedPlatform.RUBIKA,
            first_name=first_name,
            username=msg_payload.get("username")
        )
        chat = UnifiedChat(
            id=str(msg_payload.get("chat_id", author_guid)),
            type=msg_payload.get("chat_type", "private"),
            title=msg_payload.get("chat_title")
        )

        unified.message = UnifiedMessage(
            message_id=str(msg_payload.get("message_id", "0")),
            from_user=user,
            chat=chat,
            text=msg_payload.get("text", msg_payload.get("content")),
            caption=msg_payload.get("caption"),
            photo_file_id=msg_payload.get("photo_url") or msg_payload.get("photo"),
            video_file_id=msg_payload.get("video_url") or msg_payload.get("video"),
            reply_to_message_id=str(msg_payload.get("reply_to_message_id", "")) if msg_payload.get("reply_to_message_id") else None,
            raw_payload=msg_payload
        )

        return unified
