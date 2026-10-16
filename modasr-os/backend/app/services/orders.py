"""Server-side quote → order → payment → fulfillment. The client never decides the price."""
import secrets
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import decrypt, encrypt
from app.models import (Affiliate, Coupon, DeliveryMode, Order, OrderItem, OrderStatus, Product, Referral, StockCode,
                        User, Variant, WalletTransaction)
from app.services.events import emit
from app.services.pricing import apply_coupon


class CheckoutError(ValueError):
    pass


async def quote(db: AsyncSession, items: list[dict], coupon_code: str | None, user_id=None) -> dict:
    lines, subtotal, cost = [], 0, 0
    for it in items:
        qty = max(1, min(20, int(it.get("qty", 1))))
        row = (await db.execute(select(Variant, Product).join(Product).where(Variant.sku == it["sku"]))).first()
        if not row:
            raise CheckoutError(f"محصول {it['sku']} پیدا نشد")
        v, p = row
        if not (p.is_active and v.in_stock and v.price):
            raise CheckoutError(f"{p.title} فعلاً قابل خرید نیست")
        if v.price_needs_review:
            raise CheckoutError(f"قیمت {p.title} در حال بررسی است")
        lines.append({"variant_id": v.id, "sku": v.sku, "title": f"{p.title} | {v.name}", "qty": qty,
                      "unit_price": int(v.price), "approval": p.requires_admin_approval})
        subtotal += int(v.price) * qty
    discount, applied = 0, None
    if coupon_code:
        c = (await db.execute(select(Coupon).where(func.lower(Coupon.code) == coupon_code.lower(), Coupon.is_active))).scalar_one_or_none()
        if c and (not c.expires_at or c.expires_at > datetime.now(timezone.utc)) and (not c.usage_limit or c.used_count < c.usage_limit):
            discount = apply_coupon(subtotal, c.kind, float(c.value), int(c.max_discount or 0) or None, int(c.min_order or 0) or None)
            applied = c.code if discount else None
    return {"lines": lines, "subtotal": subtotal, "discount": discount, "total": max(subtotal - discount, 0), "coupon": applied}


async def wallet_balance(db: AsyncSession, user_id) -> int:
    v = (await db.execute(select(func.coalesce(func.sum(WalletTransaction.amount), 0)).where(
        WalletTransaction.user_id == user_id, WalletTransaction.status == "completed"))).scalar()
    return int(v)


async def create_order(db: AsyncSession, user: User, q: dict, method: str, channel: str, affiliate_code: str | None) -> Order:
    number = int(datetime.now(timezone.utc).strftime("%y%m%d")) * 10000 + secrets.randbelow(10000)
    aff = None
    if affiliate_code:
        aff = (await db.execute(select(Affiliate).where(Affiliate.code == affiliate_code))).scalar_one_or_none()
        if aff and aff.user_id == user.id:
            aff = None
    o = Order(number=number, user_id=user.id, channel=channel, subtotal=q["subtotal"], discount=q["discount"],
              total=q["total"], coupon_code=q["coupon"], payment_method=method, affiliate_id=aff.id if aff else None,
              notes={"needs_approval": any(l["approval"] for l in q["lines"])})
    for l in q["lines"]:
        o.items.append(OrderItem(variant_id=l["variant_id"], title=l["title"], qty=l["qty"], unit_price=l["unit_price"]))
    db.add(o)
    await db.flush()
    await emit(db, "order.created", {"order_id": str(o.id), "number": number, "total": q["total"], "channel": channel})
    return o


async def pay_with_wallet(db: AsyncSession, o: Order) -> None:
    # serialize per user to prevent double-spend
    await db.execute(select(User.id).where(User.id == o.user_id).with_for_update())
    bal = await wallet_balance(db, o.user_id)
    if bal < o.total:
        raise CheckoutError("موجودی کیف پول کافی نیست")
    db.add(WalletTransaction(user_id=o.user_id, type="purchase", amount=-o.total, balance_after=bal - o.total,
                             reference=f"order:{o.number}"))
    await mark_paid(db, o)


async def mark_paid(db: AsyncSession, o: Order) -> dict:
    if o.status != OrderStatus.pending_payment:
        return {"already": True}
    o.status = OrderStatus.paid
    if o.coupon_code:
        await db.execute(update(Coupon).where(Coupon.code == o.coupon_code).values(used_count=Coupon.used_count + 1))
    if o.affiliate_id:
        aff = await db.get(Affiliate, o.affiliate_id)
        db.add(Referral(affiliate_id=aff.id, order_id=o.id, commission=int(o.total * aff.commission_percent / 100)))
    await emit(db, "order.paid", {"order_id": str(o.id), "number": o.number, "total": int(o.total)})
    result = await fulfill(db, o)
    await db.commit()
    from app.workers.tasks import notify_order
    notify_order.delay("order.paid", str(o.id))
    return result


async def fulfill(db: AsyncSession, o: Order) -> dict:
    if (o.notes or {}).get("needs_approval"):
        o.status = OrderStatus.processing
        return {"delivered": 0, "manual": len(o.items), "reason": "admin approval"}
    delivered = manual = 0
    items = (await db.execute(select(OrderItem).where(OrderItem.order_id == o.id))).scalars().all()
    for it in items:
        v = await db.get(Variant, it.variant_id)
        it.unit_cost = int((v.cost_amount or 0))  # snapshot (converted by worker on sync)
        if v.delivery_mode == DeliveryMode.instant_code:
            codes = (await db.execute(select(StockCode).where(StockCode.variant_id == v.id, StockCode.used_by_order.is_(None))
                                      .limit(it.qty).with_for_update(skip_locked=True))).scalars().all()
            if len(codes) == it.qty:
                for c in codes:
                    c.used_by_order = o.id
                it.delivery_payload_enc = encrypt("\n".join(decrypt(c.code_enc) for c in codes))
                it.delivered_at = datetime.now(timezone.utc)
                delivered += 1
                continue
        manual += 1  # supplier_api handled by worker task; manual → admin queue
    o.status = OrderStatus.delivered if manual == 0 else OrderStatus.processing
    if manual == 0:
        await emit(db, "order.delivered", {"order_id": str(o.id), "number": o.number})
    return {"delivered": delivered, "manual": manual}
