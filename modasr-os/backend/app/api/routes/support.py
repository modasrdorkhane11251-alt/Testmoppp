from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import current_user
from app.core.config import get_settings
from app.core.db import get_db
from app.core.ratelimit import rate_limit, redis
from app.core.security import current_claims
from app.models import AIConversation, Ticket, TicketMessage, TicketPriority, User
from app.services.ai.core import run_agent
from app.services.events import emit

router = APIRouter(prefix="/api", tags=["support"])


class ChatIn(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    conversation_id: str | None = None
    channel: str = "web"


@router.post("/ai/chat", dependencies=[Depends(rate_limit("ai", 20))])
async def chat(body: ChatIn, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    key = f"ai:quota:{user.id}:{datetime.now(timezone.utc):%Y%m%d}"
    if await redis().incr(key) > get_settings().ai_daily_user_limit:
        raise HTTPException(429, "سقف گفتگوی امروز پر شده")
    await redis().expire(key, 90000)
    conv = await db.get(AIConversation, __import__("uuid").UUID(body.conversation_id)) if body.conversation_id else None
    if not conv or conv.user_id != user.id:
        conv = AIConversation(user_id=user.id, channel=body.channel, messages=[])
        db.add(conv)
        await db.flush()
    if conv.human_takeover:
        return {"conversation_id": str(conv.id), "reply": "یک همکار انسانی در حال پاسخ‌گویی است 🙏", "agent": "human"}
    res = await run_agent(db, body.message, conv.messages, user_id=user.id, role="customer", channel=body.channel)
    conv.messages = [*conv.messages, {"role": "user", "content": body.message}, {"role": "assistant", "content": res["reply"]}][-30:]
    conv.agent, conv.escalated = res["agent"], conv.escalated or res["escalated"]
    await db.commit()
    return {"conversation_id": str(conv.id), **res}


class TicketIn(BaseModel):
    subject: str = Field(max_length=200)
    body: str = Field(max_length=5000)
    priority: TicketPriority = TicketPriority.normal
    order_number: int | None = None


@router.post("/tickets")
async def create_ticket(body: TicketIn, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    t = Ticket(user_id=user.id, subject=body.subject, priority=body.priority)
    db.add(t)
    await db.flush()
    db.add(TicketMessage(ticket_id=t.id, author="user", body=body.body))
    await emit(db, "ticket.created", {"ticket_id": str(t.id), "priority": body.priority.value, "subject": body.subject})
    await db.commit()
    from app.workers.tasks import ai_first_response
    ai_first_response.delay(str(t.id))
    return {"id": str(t.id), "status": t.status.value}


@router.get("/tickets")
async def my_tickets(user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    rows = (await db.execute(select(Ticket).where(Ticket.user_id == user.id).order_by(desc(Ticket.created_at)))).scalars()
    return [{"id": str(t.id), "subject": t.subject, "status": t.status.value, "priority": t.priority.value} for t in rows]


@router.get("/tickets/{tid}")
async def ticket(tid: str, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    t = await db.get(Ticket, __import__("uuid").UUID(tid))
    if not t or t.user_id != user.id:
        raise HTTPException(404, "not found")
    msgs = (await db.execute(select(TicketMessage).where(TicketMessage.ticket_id == t.id, TicketMessage.internal_note.is_(False))
            .order_by(TicketMessage.created_at))).scalars()
    return {"id": str(t.id), "subject": t.subject, "status": t.status.value,
            "messages": [{"author": m.author, "body": m.body, "at": m.created_at.isoformat()} for m in msgs]}
