import base64
import hashlib
import hmac
import os
import time
import uuid
from datetime import datetime, timedelta, timezone

import pyotp
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

from app.core.config import get_settings

ALG = "HS256"
bearer = HTTPBearer(auto_error=False)

ROLE_PERMISSIONS: dict[str, set[str]] = {
    "super_admin": {"*"},
    "admin": {"products", "orders", "customers", "tickets", "wallet", "coupons", "affiliates", "automation", "ai", "analytics", "reports", "channels"},
    "manager": {"products", "orders", "customers", "tickets", "coupons", "analytics", "channels"},
    "support": {"tickets", "orders:read", "customers:read"},
    "finance": {"wallet", "orders", "affiliates", "reports", "analytics"},
    "marketing": {"coupons", "channels", "automation", "analytics", "products:read"},
    "customer": set(),
}


def create_token(sub: str, role: str, kind: str = "access") -> str:
    s = get_settings()
    ttl = timedelta(minutes=s.jwt_ttl_minutes) if kind == "access" else timedelta(days=s.refresh_ttl_days)
    now = datetime.now(timezone.utc)
    return jwt.encode({"sub": sub, "role": role, "typ": kind, "iat": now, "exp": now + ttl, "jti": uuid.uuid4().hex}, s.jwt_secret, ALG)


def decode_token(token: str, kind: str = "access") -> dict:
    try:
        data = jwt.decode(token, get_settings().jwt_secret, algorithms=[ALG])
    except JWTError as e:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "invalid token") from e
    if data.get("typ") != kind:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "wrong token type")
    return data


async def current_claims(cred: HTTPAuthorizationCredentials | None = Depends(bearer)) -> dict:
    if not cred:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "auth required")
    return decode_token(cred.credentials)


def has_perm(role: str, perm: str) -> bool:
    perms = ROLE_PERMISSIONS.get(role, set())
    base = perm.split(":")[0]
    return "*" in perms or perm in perms or base in perms


def require(perm: str):
    async def dep(claims: dict = Depends(current_claims)) -> dict:
        if not has_perm(claims.get("role", "customer"), perm):
            raise HTTPException(status.HTTP_403_FORBIDDEN, "forbidden")
        return claims
    return dep


# ---- Secrets at rest (AES-256-GCM) ----
def _key() -> bytes:
    return bytes.fromhex(get_settings().encryption_key)[:32].ljust(32, b"\0")


def encrypt(plain: str) -> str:
    nonce = os.urandom(12)
    return base64.b64encode(nonce + AESGCM(_key()).encrypt(nonce, plain.encode(), None)).decode()


def decrypt(token: str) -> str:
    raw = base64.b64decode(token)
    return AESGCM(_key()).decrypt(raw[:12], raw[12:], None).decode()


# ---- 2FA (TOTP) ----
def new_totp_secret() -> str:
    return pyotp.random_base32()


def verify_totp(secret: str, code: str) -> bool:
    return pyotp.TOTP(secret).verify(code, valid_window=1)


# ---- Signed outbound webhooks ----
def sign_payload(body: bytes, secret: str, ts: int | None = None) -> tuple[str, int]:
    ts = ts or int(time.time())
    sig = hmac.new(secret.encode(), f"{ts}.".encode() + body, hashlib.sha256).hexdigest()
    return sig, ts
