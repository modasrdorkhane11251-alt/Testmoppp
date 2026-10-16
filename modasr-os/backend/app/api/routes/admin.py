import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.security import encrypt, require
from app.models import (AIAction, AuditLog, Channel, Coupon, Order, OrderStatus, PublishMode, ScheduledPost, StockCode,
                        Supplier, Ticket, TicketStatus, User, Variant)
from app.services.ai import content as ai_content
from app.services.ai.core import run_agent

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/dashboard")
async def dashboard(claims=Depends(require("analytics")), db: AsyncSession = Depends(get_db)):
    since = datetime.now(timezone.utc) - timedelta(days=1)
    paid = (OrderStatus.paid, OrderStatus.processing, OrderStatus.delivered)
    rev, profit, n = (await db.execute(select(func.coalesce(func.sum(Order.total), 0), func.coalesce(func.sum(Order.total - Order.cost_total), 0),
                     func.count(Order.id)).where(Order.status.in_(paid), Order.created_at >= since))).one()
    queue = (await db.execute(select(func.count(Order.id)).where(Order.status == OrderStatus.processing))).scalar()
    tickets = (await db.execute(select(func.count(Ticket.id)).where(Ticket.status == TicketStatus.waiting_human))).scalar()
    ai_resolved = (await db.execute(select(func.count(Ticket.id)).where(Ticket.status == TicketStatus.ai_resolved, Ticket.created_at >= since))).scalar()
    all_t = (await db.execute(select(func.count(Ticket.id)).where(Ticket.created_at >= since))).scalar() or 1
    proposals = (await db.execute(select(func.count(AIAction.id)).where(AIAction.status == "proposed"))).scalar()
    suppliers = (await db.execute(select(Supplier.name, Supplier.healthy, Supplier.latency_ms, Supplier.last_sync_at))).all()
    return {"revenue_24h": int(rev), "profit_24h": int(profit), "orders_24h": n, "fulfillment_queue": queue,
            "human_tickets": tickets, "ai_resolution_rate": round(ai_resolved / all_t, 2), "pending_ai_proposals": proposals,
            "suppliers": [{"name": s, "healthy": h, "latency_ms": l, "last_sync": t.isoformat() if t else None} for s, h, l, t in suppliers]}


class Command(BaseModel):
    text: str
    history: list[dict] = []


@router.post("/ai/command")
async def ai_command(body: Command, claims=Depends(require("ai")), db: AsyncSession = Depends(get_db)):
    res = await run_agent(db, body.text, body.history, user_id=uuid.UUID(claims["sub"]), role=claims["role"], channel="admin")
    db.add(AuditLog(actor_id=uuid.UUID(claims["sub"]), action="ai.command", meta={"text": body.text[:500], "agent": res["agent"]}))
    await db.commit()
    return res


@router.get("/ai/proposals")
async def proposals(claims=Depends(require("ai")), db: AsyncSession = Depends(get_db)):
    rows = (await db.execute(select(AIAction).where(AIAction.status == "proposed").order_by(desc(AIAction.created_at)))).scalars()
    return [{"id": str(a.id), "agent": a.agent, "action": a.action, "payload": a.payload, "at": a.created_at.isoformat()} for a in rows]


@router.post("/ai/proposals/{pid}/{decision}")
async def decide(pid: str, decision: str, claims=Depends(require("ai")), db: AsyncSession = Depends(get_db)):
    a = await db.get(AIAction, uuid.UUID(pid))
    if not a or a.status != "proposed" or decision not in ("approve", "reject"):
        raise HTTPException(400, "invalid")
    a.status, a.approved_by = ("approved" if decision == "approve" else "rejected"), uuid.UUID(claims["sub"])
    db.add(AuditLog(actor_id=a.approved_by, action=f"ai.proposal.{decision}", target=str(a.id), meta=a.payload))
    await db.commit()
    if decision == "approve":
        from app.workers.tasks import execute_ai_action
        execute_ai_action.delay(str(a.id))
    return {"status": a.status}


class Codes(BaseModel):
    sku: str
    codes: list[str]


@router.post("/stock")
async def add_stock(body: Codes, claims=Depends(require("products")), db: AsyncSession = Depends(get_db)):
    v = (await db.execute(select(Variant).where(Variant.sku == body.sku))).scalar_one_or_none()
    if not v:
        raise HTTPException(404, "sku")
    for c in {c.strip() for c in body.codes if c.strip()}:
        db.add(StockCode(variant_id=v.id, code_enc=encrypt(c)))
    db.add(AuditLog(actor_id=uuid.UUID(claims["sub"]), action="stock.add", target=body.sku, meta={"count": len(body.codes)}))
    await db.commit()
    return {"ok": True}


class ChannelIn(BaseModel):
    platform: str
    external_id: str
    title: str
    role: str = "marketing"
    publish_mode: PublishMode = PublishMode.manual_approval


@router.post("/channels")
async def connect_channel(body: ChannelIn, claims=Depends(require("channels")), db: AsyncSession = Depends(get_db)):
    ch = Channel(**body.model_dump())
    db.add(ch)
    await db.commit()
    return {"id": str(ch.id)}


class PostIn(BaseModel):
    channel_id: str
    product_slug: str | None = None
    kind: str = "product"
    brief: str | None = None
    publish_at: datetime | None = None


@router.post("/posts/draft")
async def draft_post(body: PostIn, claims=Depends(require("channels")), db: AsyncSession = Depends(get_db)):
    from app.models import Product
    ch = await db.get(Channel, uuid.UUID(body.channel_id))
    p = (await db.execute(select(Product).where(Product.slug == body.product_slug))).scalar_one_or_none() if body.product_slug else None
    copy = await ai_content.product_copy(p.title, {"short": p.short, "specs": p.specs}) if p else {"telegram_post": body.brief}
    caption = copy.get("instagram_caption" if ch.platform == "instagram" else "telegram_post") or ""
    post = ScheduledPost(channel_id=ch.id, product_id=p.id if p else None, kind=body.kind, caption=caption,
                         media=(p.images[:1] if p else []), publish_at=body.publish_at or datetime.now(timezone.utc),
                         status="approved" if ch.publish_mode == PublishMode.full_auto else "draft",
                         dedupe_key=f"{ch.id}:{p.id if p else body.brief}:{(body.publish_at or datetime.now(timezone.utc)).date()}")
    db.add(post)
    await db.commit()
    return {"id": str(post.id), "status": post.status, "caption": caption}


@router.post("/posts/{pid}/approve")
async def approve_post(pid: str, claims=Depends(require("channels")), db: AsyncSession = Depends(get_db)):
    post = await db.get(ScheduledPost, uuid.UUID(pid))
    post.status = "approved"
    await db.commit()
    return {"ok": True}


@router.get("/audit")
async def audit(claims=Depends(require("*")), db: AsyncSession = Depends(get_db)):
    rows = (await db.execute(select(AuditLog).order_by(desc(AuditLog.created_at)).limit(200))).scalars()
    return [{"actor": str(a.actor_id) if a.actor_id else None, "type": a.actor_type, "action": a.action,
             "target": a.target, "at": a.created_at.isoformat()} for a in rows]
