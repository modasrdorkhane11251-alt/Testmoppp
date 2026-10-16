"""Autonomous operations. Each task is idempotent and safe to retry."""
import asyncio
import uuid
from datetime import datetime, timedelta, timezone

import httpx
from sqlalchemy import desc, func, select

from app.core.config import get_settings
from app.core.db import SessionLocal
from app.core.security import decrypt
from app.models import (AIAction, Campaign, Cart, Category, Channel, Coupon, ExchangeRate, Order, OrderStatus, Payment,
                        Product, ScheduledPost, Supplier, Ticket, TicketMessage, TicketStatus, User, Variant)
from app.services import rates as rate_engine
from app.services import telegram as tg
from app.services.ai import content as ai_content
from app.services.ai.core import run_agent
from app.services.events import deliver_pending, emit
from app.services.orders import mark_paid
from app.services.pricing import compute, resolve_rule
from app.workers.celery_app import celery


def run(coro):
    return asyncio.run(coro)


async def latest_rate(db, cur: str) -> float | None:
    if cur == "IRT":
        return 1.0
    r = (await db.execute(select(ExchangeRate).where(ExchangeRate.currency == cur, ExchangeRate.healthy)
         .order_by(desc(ExchangeRate.fetched_at)).limit(1))).scalar_one_or_none()
    if r and r.fetched_at > datetime.now(timezone.utc) - timedelta(minutes=30):
        return float(r.toman)
    return None  # stale → never price with it


@celery.task
def refresh_rates():
    async def go():
        res = await rate_engine.fetch_all()
        async with SessionLocal() as db:
            for cur, r in res.items():
                if r.toman:
                    db.add(ExchangeRate(currency=cur, toman=r.toman, healthy=r.healthy,
                                        sources=[q.__dict__ for q in r.sources]))
            await db.commit()
        if not res["USDT"].toman:
            await tg.send(get_settings().tg_admin_chat_id, "⚠️ هیچ منبع نرخ تتر در دسترس نیست؛ قیمت‌گذاری متوقف شد.")
    run(go())


@celery.task
def reprice_all():
    async def go():
        async with SessionLocal() as db:
            rows = (await db.execute(select(Variant, Product, Category).join(Product).outerjoin(Category, Product.category_id == Category.id)
                    .where(Variant.manual_price.is_(None), Variant.cost_amount.is_not(None)))).all()
            flagged = []
            for v, p, c in rows:
                rate = await latest_rate(db, v.cost_currency)
                if not rate:
                    continue
                rule = resolve_rule({"percent": v.profit_percent, "fixed": v.profit_fixed, "min_profit": v.min_profit},
                                    {"percent": c.profit_percent} if c else None)
                pr = compute(float(v.cost_amount), rate, rule, int(v.price) if v.price else None)
                if pr.needs_review:
                    v.price_needs_review = True
                    flagged.append(f"{p.title} {v.name}: {int(v.price):,} → {pr.price:,}")
                else:
                    v.price, v.price_needs_review = pr.price, False
            for v in (await db.execute(select(Variant).where(Variant.manual_price.is_not(None)))).scalars():
                v.price = v.manual_price
            await db.commit()
            if flagged:
                await tg.send(get_settings().tg_admin_chat_id, "🧐 تغییر قیمت بیش از ۸٪، منتظر تأیید:\n" + "\n".join(flagged[:20]))
    run(go())


@celery.task
def sync_suppliers():
    async def go():
        async with SessionLocal() as db:
            for s in (await db.execute(select(Supplier).where(Supplier.api_url.is_not(None)))).scalars():
                m = s.mapping or {}
                t0 = datetime.now(timezone.utc)
                try:
                    headers = {"Authorization": f"Bearer {decrypt(s.api_key_enc)}"} if s.api_key_enc else {}
                    async with httpx.AsyncClient(timeout=10) as c:
                        data = (await c.get(s.api_url, headers=headers)).raise_for_status().json()
                    rows = data
                    for k in (m.get("list_path") or "").split("."):
                        rows = rows.get(k, []) if k else rows
                    feed = {str(r[m.get("id", "id")]): r for r in rows}
                    for v in (await db.execute(select(Variant).where(Variant.supplier_id == s.id))).scalars():
                        r = feed.get(v.supplier_sku or "")
                        if r is None:
                            if v.in_stock:
                                v.in_stock = False
                                await emit(db, "supplier.out_of_stock", {"sku": v.sku, "supplier": s.name})
                            continue
                        new_cost = float(r[m.get("price", "price")])
                        if v.cost_amount and abs(new_cost - float(v.cost_amount)) / float(v.cost_amount) > 0.08:
                            await emit(db, "supplier.price_changed", {"sku": v.sku, "old": float(v.cost_amount), "new": new_cost})
                        v.cost_amount = new_cost
                        v.in_stock = bool(r.get(m.get("stock", "available"), True))
                    s.healthy, s.consecutive_failures = True, 0
                    s.latency_ms = int((datetime.now(timezone.utc) - t0).total_seconds() * 1000)
                except Exception as e:  # noqa: BLE001
                    s.consecutive_failures += 1
                    if s.consecutive_failures >= 2 and s.healthy:
                        s.healthy = False
                        await emit(db, "supplier.down", {"supplier": s.name, "error": str(e)[:200]})
                        await tg.send(get_settings().tg_admin_chat_id, f"🚨 تأمین‌کننده {s.name} قطع است")
                s.last_sync_at = datetime.now(timezone.utc)
            await db.commit()
    run(go())


@celery.task
def deliver_events():
    async def go():
        async with SessionLocal() as db:
            await deliver_pending(db)
    run(go())


@celery.task
def notify_order(event: str, order_id: str):
    async def go():
        async with SessionLocal() as db:
            o = await db.get(Order, uuid.UUID(order_id))
            u = await db.get(User, o.user_id)
            items = ", ".join(i.title for i in o.items) if o.items else "-"
            await tg.broadcast_sales(event, {"product": items, "amount": int(o.total), "number": o.number,
                                             "customer": u.full_name or "-", "payment_method": o.payment_method.value if o.payment_method else "-",
                                             "time": datetime.now().strftime("%H:%M"), "status": o.status.value})
    run(go())


@celery.task
def check_receipt_task(payment_id: str):
    async def go():
        async with SessionLocal() as db:
            pay = await db.get(Payment, uuid.UUID(payment_id))
            res = await ai_content.check_receipt(pay.receipt_url, int(pay.amount), None)
            pay.ai_check = res
            if res["verdict"] != "approve":
                await emit(db, "receipt.flagged", {"payment_id": payment_id, "issues": res["issues"]})
            await db.commit()
            label = {"approve": "✅ تأیید AI", "review": "⚠️ نیاز به بررسی", "reject": "❌ مشکوک"}[res["verdict"]]
            await tg.send(get_settings().tg_admin_chat_id, f"🧾 رسید کارت‌به‌کارت\nمبلغ: {tg.fmt_toman(pay.amount)}\n{label}\n" +
                          "\n".join(f"• {i}" for i in res["issues"]),
                          reply_markup={"inline_keyboard": [[{"text": "تأیید پرداخت", "callback_data": f"pay_ok:{payment_id}"},
                                                             {"text": "رد", "callback_data": f"pay_no:{payment_id}"}]]})
    run(go())


@celery.task
def approve_receipt(payment_id: str, admin_id: str):
    """Called from the bot after an admin taps 'approve'. AI never approves money by itself."""
    async def go():
        async with SessionLocal() as db:
            pay = await db.get(Payment, uuid.UUID(payment_id))
            if pay.status == "paid":
                return
            pay.status = "paid"
            await mark_paid(db, await db.get(Order, pay.order_id))
    run(go())


@celery.task
def ai_first_response(ticket_id: str):
    async def go():
        async with SessionLocal() as db:
            t = await db.get(Ticket, uuid.UUID(ticket_id))
            first = (await db.execute(select(TicketMessage).where(TicketMessage.ticket_id == t.id).order_by(TicketMessage.created_at))).scalars().first()
            res = await run_agent(db, f"{t.subject}\n{first.body}", [], user_id=t.user_id, channel="ticket", agent="support")
            db.add(TicketMessage(ticket_id=t.id, author="ai", body=res["reply"]))
            t.status = TicketStatus.waiting_human if res["escalated"] else TicketStatus.ai_resolved
            await db.commit()
    run(go())


@celery.task
def publish_due_posts():
    async def go():
        async with SessionLocal() as db:
            due = (await db.execute(select(ScheduledPost).where(ScheduledPost.status == "approved",
                   ScheduledPost.publish_at <= datetime.now(timezone.utc)).with_for_update(skip_locked=True))).scalars().all()
            for post in due:
                ch = await db.get(Channel, post.channel_id)
                if ch.platform.startswith("telegram"):
                    kb = {"inline_keyboard": [[b] for b in post.buttons]} if post.buttons else None
                    r = await (tg.tg("sendPhoto", chat_id=ch.external_id, photo=post.media[0], caption=post.caption, reply_markup=kb)
                               if post.media else tg.send(ch.external_id, post.caption, reply_markup=kb))
                    post.status = "published" if r.get("ok") else "failed"
                    post.external_message_id = str((r.get("result") or {}).get("message_id", "")) or None
                else:
                    post.status = "failed"  # Instagram adapter: see docs/INTEGRATIONS.md (Meta Graph API)
            await db.commit()
    run(go())


@celery.task
def recover_carts():
    async def go():
        async with SessionLocal() as db:
            cutoff = datetime.now(timezone.utc) - timedelta(hours=2)
            carts = (await db.execute(select(Cart).where(Cart.updated_at < cutoff, Cart.reminder_sent_at.is_(None),
                     Cart.recovered.is_(False), Cart.user_id.is_not(None)).limit(100))).scalars().all()
            for cart in carts:
                u = await db.get(User, cart.user_id)
                if u and u.telegram and cart.items:
                    await tg.send(u.telegram.telegram_id, "🛒 سبد خریدت هنوز منتظرته! تکمیلش کن:",
                                  reply_markup={"inline_keyboard": [[{"text": "ادامه خرید", "web_app": {"url": f"{get_settings().miniapp_url}/cart"}}]]})
                    await emit(db, "cart.abandoned", {"user_id": str(u.id), "items": cart.items})
                cart.reminder_sent_at = datetime.now(timezone.utc)
            await db.commit()
    run(go())


@celery.task
def segment_customers():
    async def go():
        async with SessionLocal() as db:
            rows = (await db.execute(select(Order.user_id, func.count(Order.id), func.sum(Order.total), func.max(Order.created_at))
                    .where(Order.status.in_([OrderStatus.paid, OrderStatus.delivered])).group_by(Order.user_id))).all()
            now = datetime.now(timezone.utc)
            for uid, n, total, last in rows:
                u = await db.get(User, uid)
                days = (now - last).days
                u.lifetime_value = total
                u.is_vip = total >= 20_000_000 or n >= 10
                u.segment = "vip" if u.is_vip else "churned" if days > 90 else "at_risk" if days > 45 else "active" if n > 1 else "new"
            await db.commit()
    run(go())


async def _report(period: str) -> str:
    async with SessionLocal() as db:
        res = await run_agent(db, f"گزارش {period} کسب‌وکار را با sales_stats و best_sellers و open_tickets آماده کن؛ "
                                  "درآمد، سود، پرفروش‌ها، مشکلات و ۳ پیشنهاد عملی.", [], role="admin", channel="report", agent="analytics")
        return res["reply"]


async def _send_report(period: str, title: str):
    await tg.send(get_settings().tg_admin_chat_id, f"{title}\n\n" + await _report(period))


@celery.task
def daily_report():
    run(_send_report("today", "📊 گزارش امروز"))


@celery.task
def periodic_report(period: str):
    run(_send_report(period, f"📈 گزارش {period}"))


@celery.task
def execute_ai_action(action_id: str):
    """Runs ONLY after a human approved the proposal."""
    async def go():
        async with SessionLocal() as db:
            a = await db.get(AIAction, uuid.UUID(action_id))
            if a.status != "approved":
                return
            p = a.payload
            if a.action == "create_coupon":
                db.add(Coupon(code=p["code"], kind=p.get("kind", "percent"), value=p["value"], usage_limit=p.get("usage_limit"),
                              max_discount=p.get("max_discount"), expires_at=p.get("expires_at")))
            elif a.action == "create_campaign":
                db.add(Campaign(name=p.get("name", "کمپین AI"), goal=p.get("goal"), plan=p, status="scheduled"))
            elif a.action == "update_price":
                v = (await db.execute(select(Variant).where(Variant.sku == p["sku"]))).scalar_one()
                v.manual_price, v.price, v.price_needs_review = p["price"], p["price"], False
            elif a.action in ("publish_post", "schedule_post"):
                db.add(ScheduledPost(channel_id=uuid.UUID(p["channel_id"]), caption=p["caption"], status="approved",
                                     publish_at=datetime.fromisoformat(p["publish_at"]) if p.get("publish_at") else datetime.now(timezone.utc)))
            else:
                a.status, a.result = "rejected", {"error": "action requires manual execution"}
                await db.commit()
                return
            a.status, a.result = "executed", {"ok": True}
            await db.commit()
    run(go())
