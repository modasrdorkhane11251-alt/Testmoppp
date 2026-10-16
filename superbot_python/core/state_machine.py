"""
Finite State Machine (FSM) Manager for Multi-Step Interactive Flows
Persisted directly to SQLite database for crash resilience across restarts.
"""
from typing import Dict, Any, Tuple, Optional
from database.database import db

class States:
    NONE = "NONE"

    # Admin States
    ADMIN_BROADCAST_TEXT = "ADMIN_BROADCAST_TEXT"
    ADMIN_ADD_CHANNEL = "ADMIN_ADD_CHANNEL"
    ADMIN_GIVE_POINTS_USER = "ADMIN_GIVE_POINTS_USER"
    ADMIN_GIVE_POINTS_AMOUNT = "ADMIN_GIVE_POINTS_AMOUNT"
    ADMIN_BAN_USER = "ADMIN_BAN_USER"
    ADMIN_UNBAN_USER = "ADMIN_UNBAN_USER"
    ADMIN_REPLY_TICKET = "ADMIN_REPLY_TICKET"

    # User Interactive States
    SUPPORT_WAITING_MESSAGE = "SUPPORT_WAITING_MESSAGE"
    AI_PROMPT_WAITING = "AI_PROMPT_WAITING"
    MEDIA_URL_WAITING = "MEDIA_URL_WAITING"
    OCR_IMAGE_WAITING = "OCR_IMAGE_WAITING"

class StateManager:
    @staticmethod
    def set(platform: str, user_id: str, state: str, data: Optional[Dict[str, Any]] = None):
        """Sets current state and attached context dictionary."""
        db.set_user_state(platform, user_id, state, data or {})

    @staticmethod
    def get(platform: str, user_id: str) -> Tuple[str, Dict[str, Any]]:
        """Returns (state_name, data_dict). Returns ('NONE', {}) if no state is set."""
        return db.get_user_state(platform, user_id)

    @staticmethod
    def clear(platform: str, user_id: str):
        """Resets user state to NONE."""
        db.clear_user_state(platform, user_id)

    @staticmethod
    def update_data(platform: str, user_id: str, **kwargs):
        """Updates specific fields in state data without changing the state name."""
        state, data = db.get_user_state(platform, user_id)
        data.update(kwargs)
        db.set_user_state(platform, user_id, state, data)
