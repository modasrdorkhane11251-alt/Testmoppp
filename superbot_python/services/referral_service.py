"""
Referral & Points System Service
Manages invite links, referral rewards, fraud prevention, and user balance auditing.
"""
from typing import Dict, Any, Optional
from database.database import db
from core.unified_models import UnifiedPlatform
from config import REFERRAL_BONUS_REFERRER, REFERRAL_BONUS_INVITED

class ReferralService:
    @staticmethod
    def get_referral_link(platform: str, platform_user_id: str, bot_username: str = "SuperBot") -> str:
        """Generates platform-appropriate invitation deep link."""
        platform_lower = platform.lower()
        if platform_lower == UnifiedPlatform.TELEGRAM:
            return f"https://t.me/{bot_username}?start=ref_{platform_user_id}"
        elif platform_lower == UnifiedPlatform.BALE:
            return f"https://ble.ir/{bot_username}?start=ref_{platform_user_id}"
        elif platform_lower == UnifiedPlatform.RUBIKA:
            return f"https://rubika.ir/{bot_username}?start=ref_{platform_user_id}"
        return f"https://t.me/{bot_username}?start=ref_{platform_user_id}"

    @staticmethod
    def parse_referral_code(start_payload: str) -> Optional[str]:
        """Extracts referrer user ID from start payload (e.g. 'ref_123456' -> '123456')."""
        if not start_payload:
            return None
        parts = start_payload.strip().split()
        target = parts[1] if len(parts) > 1 else parts[0]
        if target.startswith("ref_"):
            return target.replace("ref_", "").strip()
        return None

    @staticmethod
    def get_referral_stats(platform: str, platform_user_id: str) -> Dict[str, Any]:
        """Calculates total referrals and earned points for a user."""
        user = db.get_user(platform, platform_user_id)
        if not user:
            return {"referrals_count": 0, "total_earned_points": 0}

        count = user.get("referral_count", 0)
        total_earned = count * REFERRAL_BONUS_REFERRER

        return {
            "referrals_count": count,
            "total_earned_points": total_earned,
            "bonus_per_invite": REFERRAL_BONUS_REFERRER,
            "bonus_for_invited": REFERRAL_BONUS_INVITED,
            "current_points": user.get("points", 0),
            "current_diamonds": user.get("diamonds", 0),
        }
