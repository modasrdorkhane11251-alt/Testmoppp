"""Agent loop: route → Gemini → tool calls → grounded answer. Max 4 tool rounds."""
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import desc, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models import (AIAction, KnowledgeArticle, Order, OrderItem, OrderStatus, Product, Ticket, TicketMessage,
                        TicketPriority, TicketStatus, Variant)
from app.services.ai import gemini
from app.services.ai.agents import AGENTS, route, tools_for
from app.services.events import emit

PERIOD = {"today": 1, "week": 7, "month": 30}


class ToolBox:
    def __init__(self, db: AsyncSession, user_id: uuid.UUID | None, role: str, channel: str):
        self.db, self.user_id, self.role, self.channel = db, user_id, role, channel
        self.escalated = False

    async def search_products(self, query: str, limit: int = 6):
        q = f"%{query}%"
        rows = (await self.db.execute(select(Product, Variant).join(Variant).where(
            Product.is_active, or_(Product.title.ilike(q), Product.title_en.ilike(q), Product.short.ilike(q)))
            .limit(min(limit or 6, 10)))).all()
        s = get_settings()
        return [{"title": f"{p.title} | {v.name}", "sku": v.sku, "price_toman": int(v.price or 0),
                 "in_stock": v.in_stock, "delivery": v.delivery_mode.value, "url": f"{s.public_url}/p/{p.slug}?v={v.sku}"}
                for p, v in rows]

    async def get_order(self, number: int):
        o = (await self.db.execute(select(Order).where(Order.number == number, Order.user_id == self.user_id))).scalar_one_or_none()
        if not o:
            return {"error": "سفارشی با این شماره برای این کاربر پیدا نشد"}
        return {"number": o.number, "status": o.status.value, "total": int(o.total), "created_at": o.created_at.isoformat()}

    async def my_recent_orders(self):
        if not self.user_id:
            return {"error": "کاربر وارد نشده"}
        rows = (await self.db.execute(select(Order).where(Order.user_id == self.user_id).order_by(desc(Order.created_at)).limit(5))).scalars()
        return [{"number": o.number, "status": o.status.value, "total": int(o.total)} for o in rows]

    async def get_policy(self, topic: str):
        a = (await self.db.execute(select(KnowledgeArticle).where(KnowledgeArticle.kind == "policy",
             KnowledgeArticle.slug.ilike(f"%{topic}%")))).scalar_one_or_none()
        return {"policy": a.body[:3000]} if a else {"error": "متن قانون ثبت نشده"}

    async def create_ticket(self, subject: str, summary: str, priority: str = "normal"):
        if not self.user_id:
            return {"error": "برای ثبت تیکت باید وارد شوی"}
        t = Ticket(user_id=self.user_id, subject=subject[:200], priority=TicketPriority(priority),
                   status=TicketStatus.waiting_human if priority in ("high", "urgent") else TicketStatus.open,
                   channel=self.channel, ai_summary=summary)
        self.db.add(t)
        await self.db.flush()
        self.db.add(TicketMessage(ticket_id=t.id, author="ai", body=summary))
        await emit(self.db, "ticket.created", {"ticket_id": str(t.id), "priority": priority, "subject": subject})
        await self.db.commit()
        return {"ticket_id": str(t.id)[:8], "status": t.status.value}

    async def escalate(self, reason: str):
        self.escalated = True
        return await self.create_ticket("ارجاع به پشتیبان انسانی", reason, "high")

    def _since(self, period: str):
        return datetime.now(timezone.utc) - timedelta(days=PERIOD.get(period, 1))

    async def sales_stats(self, period: str = "today"):
        self._admin_only()
        paid = (OrderStatus.paid, OrderStatus.delivered, OrderStatus.processing)
        r = (await self.db.execute(select(func.count(Order.id), func.coalesce(func.sum(Order.total), 0),
             func.coalesce(func.sum(Order.total - Order.cost_total), 0)).where(
             Order.status.in_(paid), Order.created_at >= self._since(period)))).one()
        return {"period": period, "orders": r[0], "revenue": int(r[1]), "gross_profit": int(r[2])}

    async def best_sellers(self, period: str = "week", limit: int = 5):
        self._admin_only()
        rows = (await self.db.execute(select(OrderItem.title, func.sum(OrderItem.qty).label("n"),
                func.sum(OrderItem.unit_price * OrderItem.qty)).join(Order).where(
                Order.created_at >= self._since(period), Order.status != OrderStatus.pending_payment)
                .group_by(OrderItem.title).order_by(desc("n")).limit(limit or 5))).all()
        return [{"title": t, "qty": int(n), "revenue": int(rev)} for t, n, rev in rows]

    async def open_tickets(self, limit: int = 10):
        self._admin_only()
        rows = (await self.db.execute(select(Ticket).where(Ticket.status.in_(
            [TicketStatus.open, TicketStatus.waiting_human])).order_by(desc(Ticket.created_at)).limit(limit or 10))).scalars()
        return [{"id": str(t.id)[:8], "subject": t.subject, "priority": t.priority.value, "status": t.status.value} for t in rows]

    async def propose_action(self, action: str, payload: dict, rationale: str):
        self._admin_only()
        a = AIAction(agent="admin", action=action, payload={**payload, "rationale": rationale}, requires_approval=True)
        self.db.add(a)
        await self.db.commit()
        return {"proposal_id": str(a.id)[:8], "status": "منتظر تأیید ادمین"}

    def _admin_only(self):
        if self.role == "customer":
            raise PermissionError("admin tool")


async def run_agent(db: AsyncSession, message: str, history: list[dict], *, user_id=None, role="customer",
                    channel="web", agent: str | None = None) -> dict:
    agent = agent or (route(message) if role == "customer" else "admin")
    if role == "customer" and agent not in ("sales", "support"):
        agent = "sales"
    box = ToolBox(db, user_id, role, channel)
    contents = [{"role": "model" if m["role"] == "assistant" else "user", "parts": [{"text": m["content"][:2000]}]}
                for m in history[-12:]]
    contents.append({"role": "user", "parts": [{"text": message[:2000]}]})
    tools = tools_for(agent)
    for _ in range(4):
        content = await gemini.generate(AGENTS[agent], contents, tools)
        calls = gemini.calls_of(content)
        if not calls:
            return {"agent": agent, "reply": gemini.text_of(content).strip(), "escalated": box.escalated}
        contents.append(content)
        responses = []
        for call in calls:
            fn = getattr(box, call["name"], None)
            try:
                result = await fn(**(call.get("args") or {})) if fn else {"error": "unknown tool"}
            except PermissionError:
                result = {"error": "دسترسی مجاز نیست"}
            responses.append({"functionResponse": {"name": call["name"], "response": {"result": result}}})
        contents.append({"role": "user", "parts": responses})
    return {"agent": agent, "reply": "برای این سؤال یک تیکت برایت باز کردم تا همکارم دقیق بررسی کند 🙏", "escalated": True}
