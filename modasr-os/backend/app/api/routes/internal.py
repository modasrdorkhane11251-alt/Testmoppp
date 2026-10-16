"""Bot ↔ API. Authenticated with a shared internal token on the private Docker network only."""
import hmac
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.db import get_db
from app.models import AIConversation, Payment, Role, TelegramIdentity, User
from app.services.ai.core import run_agent
from app.services.events import emit

router = APIRouter(prefix="/internal", include_in_schema=False)


async def guard(x_internal_token: str = Header("")):
    if not get_settings().internal_token or not hmac.compare_digest(x_internal_token, get_settings().internal_token):
        raise HTTPException(401)


class TgUser(BaseModel):
    id: int
    username: str | None = None
    first_name: str | None = None
    last_name: str | None = None


class BotChat(BaseModel):
    user: TgUser
    chat_id: int
    text: str
    channel: str = "bot"  # bot / business
    business_connection_id: str | None = None


async def user_for(db: AsyncSession, tg: TgUser) -> User:
    ident = (await db.execute(select(TelegramIdentity).where(TelegramIdentity.telegram_id == tg.id))).scalar_one_or_none()
    if ident:
        return await db.get(User, ident.user_id)
    u = User(full_name=" ".join(filter(None, [tg.first_name, tg.last_name])) or None)
    db.add(u); await db.flush()
    db.add(TelegramIdentity(user_id=u.id, telegram_id=tg.id, username=tg.username, first_name=tg.first_name,
                            last_name=tg.last_name, last_login_at=datetime.now(timezone.utc)))
    await emit(db, "user.registered", {"user_id": str(u.id), "telegram_id": tg.id, "source": "bot"})
    return u


@router.post("/bot/chat", dependencies=[Depends(guard)])
async def bot_chat(body: BotChat, db: AsyncSession = Depends(get_db)):
    u = await user_for(db, body.user)
    conv = (await db.execute(select(AIConversation).where(AIConversation.external_chat_id == str(body.chat_id),
            AIConversation.channel == body.channel))).scalar_one_or_none()
    if not conv:
        conv = AIConversation(user_id=u.id, channel=body.channel, external_chat_id=str(body.chat_id), messages=[])
        db.add(conv); await db.flush()
    if conv.human_takeover:
        await db.commit()
        return {"reply": None, "human": True}
    res = await run_agent(db, body.text, conv.messages, user_id=u.id, role="customer", channel=body.channel)
    conv.messages = [*conv.messages, {"role": "user", "content": body.text}, {"role": "assistant", "content": res["reply"]}][-30:]
    conv.escalated = conv.escalated or res["escalated"]
    await db.commit()
    return res


class Takeover(BaseModel):
    chat_id: int
    channel: str = "business"
    on: bool


@router.post("/bot/takeover", dependencies=[Depends(guard)])
async def takeover(body: Takeover, db: AsyncSession = Depends(get_db)):
    conv = (await db.execute(select(AIConversation).where(AIConversation.external_chat_id == str(body.chat_id),
            AIConversation.channel == body.channel))).scalar_one_or_none()
    if conv:
        conv.human_takeover = body.on
        await db.commit()
    return {"ok": True}


class Decision(BaseModel):
    payment_id: str
    admin_telegram_id: int
    approve: bool


@router.post("/bot/receipt-decision", dependencies=[Depends(guard)])
async def receipt_decision(body: Decision, db: AsyncSession = Depends(get_db)):
    ident = (await db.execute(select(TelegramIdentity).where(TelegramIdentity.telegram_id == body.admin_telegram_id))).scalar_one_or_none()
    admin = await db.get(User, ident.user_id) if ident else None
    if not admin or admin.role not in (Role.super_admin, Role.admin, Role.finance):
        raise HTTPException(403, "not an admin")
    pay = await db.get(Payment, uuid.UUID(body.payment_id))
    if body.approve:
        from app.workers.tasks import approve_receipt
        approve_receipt.delay(body.payment_id, str(admin.id))
        return {"status": "approved"}
    pay.status = "rejected"; await db.commit()
    return {"status": "rejected"}
