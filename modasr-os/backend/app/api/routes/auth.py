from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.db import get_db
from app.core.ratelimit import rate_limit
from app.core.security import create_token, decode_token, decrypt, verify_totp
from app.core.telegram_auth import TelegramAuthError, verify_login_widget, verify_webapp_init_data
from app.models import AuditLog, Role, Session, TelegramIdentity, User
from app.services.events import emit

router = APIRouter(prefix="/api/auth", tags=["auth"])


class WidgetLogin(BaseModel):
    id: int
    first_name: str | None = None
    last_name: str | None = None
    username: str | None = None
    photo_url: str | None = None
    auth_date: int
    hash: str


class WebAppLogin(BaseModel):
    init_data: str


class TwoFA(BaseModel):
    code: str


async def _upsert(db: AsyncSession, tg: dict, request: Request) -> dict:
    tid = int(tg["id"])
    ident = (await db.execute(select(TelegramIdentity).where(TelegramIdentity.telegram_id == tid))).scalar_one_or_none()
    new = ident is None
    if new:
        user = User(full_name=" ".join(filter(None, [tg.get("first_name"), tg.get("last_name")])) or None)
        db.add(user)
        await db.flush()
        ident = TelegramIdentity(user_id=user.id, telegram_id=tid)
        db.add(ident)
        await emit(db, "user.registered", {"user_id": str(user.id), "telegram_id": tid, "username": tg.get("username")})
    else:
        user = await db.get(User, ident.user_id)
    for f in ("username", "first_name", "last_name", "photo_url"):
        setattr(ident, f, tg.get(f))
    ident.auth_date = int(tg.get("auth_date") or 0)
    ident.last_login_at = datetime.now(timezone.utc)
    if user.role != Role.customer and user.totp_secret_enc:
        await db.commit()
        return {"requires_2fa": True, "challenge": create_token(str(user.id), "2fa", "2fa")}
    return await _issue(db, user, request, new)


async def _issue(db: AsyncSession, user: User, request: Request, new: bool = False) -> dict:
    refresh = create_token(str(user.id), user.role.value, "refresh")
    claims = decode_token(refresh, "refresh")
    db.add(Session(user_id=user.id, refresh_jti=claims["jti"], user_agent=request.headers.get("user-agent", "")[:300],
                   ip=request.client.host if request.client else None,
                   expires_at=datetime.now(timezone.utc) + timedelta(days=get_settings().refresh_ttl_days)))
    db.add(AuditLog(actor_id=user.id, action="auth.login", ip=request.client.host if request.client else None))
    await db.commit()
    return {"access_token": create_token(str(user.id), user.role.value), "refresh_token": refresh,
            "user": {"id": str(user.id), "name": user.full_name, "role": user.role.value}, "new_user": new}


@router.post("/telegram/widget", dependencies=[Depends(rate_limit("login", 20))])
async def telegram_widget(body: WidgetLogin, request: Request, db: AsyncSession = Depends(get_db)):
    try:
        data = verify_login_widget(body.model_dump(), get_settings().tg_bot_token)
    except TelegramAuthError as e:
        raise HTTPException(401, str(e)) from e
    return await _upsert(db, data, request)


@router.post("/telegram/webapp", dependencies=[Depends(rate_limit("login", 30))])
async def telegram_webapp(body: WebAppLogin, request: Request, db: AsyncSession = Depends(get_db)):
    try:
        data = verify_webapp_init_data(body.init_data, get_settings().tg_bot_token)
    except TelegramAuthError as e:
        raise HTTPException(401, str(e)) from e
    return await _upsert(db, {**data["user"], "auth_date": data["auth_date"]}, request)


@router.post("/2fa")
async def two_factor(body: TwoFA, request: Request, challenge: str, db: AsyncSession = Depends(get_db)):
    claims = decode_token(challenge, "2fa")
    user = await db.get(User, __import__("uuid").UUID(claims["sub"]))
    if not user or not verify_totp(decrypt(user.totp_secret_enc), body.code):
        raise HTTPException(401, "invalid code")
    return await _issue(db, user, request)


@router.post("/refresh")
async def refresh(token: str, db: AsyncSession = Depends(get_db)):
    claims = decode_token(token, "refresh")
    s = (await db.execute(select(Session).where(Session.refresh_jti == claims["jti"]))).scalar_one_or_none()
    if not s or s.revoked or s.expires_at < datetime.now(timezone.utc):
        raise HTTPException(401, "session expired")
    return {"access_token": create_token(claims["sub"], claims["role"])}


@router.post("/logout")
async def logout(token: str, db: AsyncSession = Depends(get_db)):
    claims = decode_token(token, "refresh")
    s = (await db.execute(select(Session).where(Session.refresh_jti == claims["jti"]))).scalar_one_or_none()
    if s:
        s.revoked = True
        await db.commit()
    return {"ok": True}
