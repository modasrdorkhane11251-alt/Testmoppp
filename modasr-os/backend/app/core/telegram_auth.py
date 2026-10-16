"""Official Telegram verification (Login Widget + Mini App initData). Pure stdlib, unit-tested."""
import hashlib
import hmac
import json
import time
from urllib.parse import parse_qsl


class TelegramAuthError(ValueError):
    pass


def verify_login_widget(data: dict, bot_token: str, max_age: int = 86400) -> dict:
    """https://core.telegram.org/widgets/login#checking-authorization"""
    if not bot_token:
        raise TelegramAuthError("bot token not configured")
    payload = {k: str(v) for k, v in data.items() if v is not None}
    received = payload.pop("hash", None)
    if not received:
        raise TelegramAuthError("missing hash")
    check = "\n".join(f"{k}={payload[k]}" for k in sorted(payload))
    secret = hashlib.sha256(bot_token.encode()).digest()
    expected = hmac.new(secret, check.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, received):
        raise TelegramAuthError("invalid hash")
    if time.time() - int(payload.get("auth_date", 0)) > max_age:
        raise TelegramAuthError("auth expired")
    return payload


def verify_webapp_init_data(init_data: str, bot_token: str, max_age: int = 86400) -> dict:
    """https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app"""
    if not bot_token:
        raise TelegramAuthError("bot token not configured")
    pairs = dict(parse_qsl(init_data, keep_blank_values=True))
    received = pairs.pop("hash", None)
    if not received:
        raise TelegramAuthError("missing hash")
    check = "\n".join(f"{k}={pairs[k]}" for k in sorted(pairs))
    secret = hmac.new(b"WebAppData", bot_token.encode(), hashlib.sha256).digest()
    expected = hmac.new(secret, check.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, received):
        raise TelegramAuthError("invalid hash")
    if time.time() - int(pairs.get("auth_date", 0)) > max_age:
        raise TelegramAuthError("auth expired")
    if "user" in pairs:
        pairs["user"] = json.loads(pairs["user"])
    return pairs
