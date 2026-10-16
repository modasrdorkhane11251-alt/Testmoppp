from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, Field
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import current_user
from app.core.config import get_settings
from app.core.db import get_db
from app.core.ratelimit import rate_limit
from app.core.security import decrypt
from app.models import Coupon, Order, OrderItem, OrderStatus, Payment, PaymentMethod, User, WalletTransaction
from app.services import orders as svc
from app.services.payments import request_payment, verify_payment

router = APIRouter(prefix="/api", tags=["commerce"])


class Item(BaseModel):
    sku: str
    qty: int = Field(1, ge=1, le=20)


class QuoteIn(BaseModel):
    items: list[Item]
    coupon: str | None = None


class CheckoutIn(QuoteIn):
    method: PaymentMethod
    expected_total: int
    channel: str = "web"
    affiliate_code: str | None = None
    idempotency_key: str = Field(min_length=8, max_length=80)


@router.post("/quote")
async def quote(body: QuoteIn, db: AsyncSession = Depends(get_db)):
    try:
        q = await svc.quote(db, [i.model_dump() for i in body.items], body.coupon)
    except svc.CheckoutError as e:
        raise HTTPException(400, str(e)) from e
    return {k: v for k, v in q.items() if k != "lines"} | {"lines": [{k: v for k, v in l.items() if k != "variant_id"} for l in q["lines"]]}


@router.post("/checkout", dependencies=[Depends(rate_limit("checkout", 10))])
async def checkout(body: CheckoutIn, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    dup = (await db.execute(select(Payment).where(Payment.idempotency_key == body.idempotency_key))).scalar_one_or_none()
    if dup:
        o = await db.get(Order, dup.order_id)
        return {"order": o.number, "status": o.status.value, "duplicate": True}
    try:
        q = await svc.quote(db, [i.model_dump() for i in body.items], body.coupon, user.id)
    except svc.CheckoutError as e:
        raise HTTPException(400, str(e)) from e
    if abs(q["total"] - body.expected_total) > 0:
        return {"price_changed": True, "total": q["total"]}
    o = await svc.create_order(db, user, q, body.method.value, body.channel, body.affiliate_code)
    pay = Payment(order_id=o.id, user_id=user.id, method=body.method, amount=o.total, idempotency_key=body.idempotency_key)
    db.add(pay)
    s = get_settings()
    if body.method == PaymentMethod.wallet:
        try:
            await svc.pay_with_wallet(db, o)
        except svc.CheckoutError as e:
            await db.rollback()
            raise HTTPException(400, str(e)) from e
        pay.status = "paid"
        await db.commit()
        return {"order": o.number, "status": o.status.value}
    if body.method == PaymentMethod.online:
        r = await request_payment(int(o.total), f"سفارش {o.number} | MODASR HUB", f"{s.api_url}/api/pay/callback", o.number)
        pay.gateway_ref = r["authority"]
        await db.commit()
        return {"order": o.number, "redirect": r["url"]}
    await db.commit()  # card_to_card: upload receipt next
    return {"order": o.number, "status": "awaiting_receipt", "payment_id": str(pay.id)}


@router.get("/pay/callback")
async def callback(Authority: str, Status: str, db: AsyncSession = Depends(get_db)):
    s = get_settings()
    pay = (await db.execute(select(Payment).where(Payment.gateway_ref == Authority))).scalar_one_or_none()
    if not pay:
        return RedirectResponse(f"{s.public_url}/payment/result?status=error")
    o = await db.get(Order, pay.order_id)
    if pay.status == "paid":
        return RedirectResponse(f"{s.public_url}/payment/result?status=ok&order={o.number}")
    if Status != "OK":
        pay.status = "cancelled"; await db.commit()
        return RedirectResponse(f"{s.public_url}/payment/result?status=cancel&order={o.number}")
    v = await verify_payment(int(pay.amount), Authority)
    if not v["ok"]:
        pay.status = "failed"; await db.commit()
        return RedirectResponse(f"{s.public_url}/payment/result?status=fail&order={o.number}")
    pay.status, pay.tracking_code = "paid", str(v["ref_id"])
    await svc.mark_paid(db, o)
    return RedirectResponse(f"{s.public_url}/payment/result?status=ok&order={o.number}&ref={v['ref_id']}")


class ReceiptIn(BaseModel):
    payment_id: str
    receipt_url: str


@router.post("/pay/receipt")
async def receipt(body: ReceiptIn, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    pay = await db.get(Payment, __import__("uuid").UUID(body.payment_id))
    if not pay or pay.user_id != user.id or pay.method != PaymentMethod.card_to_card:
        raise HTTPException(404, "not found")
    pay.receipt_url, pay.status = body.receipt_url, "review"
    await db.commit()
    from app.workers.tasks import check_receipt_task
    check_receipt_task.delay(str(pay.id))
    return {"status": "در حال بررسی"}


@router.get("/me")
async def me(user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    return {"id": str(user.id), "name": user.full_name, "role": user.role.value, "vip": user.is_vip,
            "wallet": await svc.wallet_balance(db, user.id),
            "telegram": {"username": user.telegram.username, "photo_url": user.telegram.photo_url} if user.telegram else None}


@router.get("/my/orders")
async def my_orders(user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    rows = (await db.execute(select(Order).where(Order.user_id == user.id).order_by(desc(Order.created_at)).limit(50))).scalars()
    return [{"number": o.number, "status": o.status.value, "total": int(o.total), "created_at": o.created_at.isoformat()} for o in rows]


@router.get("/my/orders/{number}")
async def my_order(number: int, user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    o = (await db.execute(select(Order).where(Order.number == number, Order.user_id == user.id))).scalar_one_or_none()
    if not o:
        raise HTTPException(404, "not found")
    items = (await db.execute(select(OrderItem).where(OrderItem.order_id == o.id))).scalars()
    return {"number": o.number, "status": o.status.value, "total": int(o.total), "discount": int(o.discount),
            "items": [{"title": i.title, "qty": i.qty, "unit_price": int(i.unit_price),
                       "delivery": decrypt(i.delivery_payload_enc) if i.delivery_payload_enc else None} for i in items]}


@router.get("/my/wallet")
async def wallet(user: User = Depends(current_user), db: AsyncSession = Depends(get_db)):
    rows = (await db.execute(select(WalletTransaction).where(WalletTransaction.user_id == user.id)
            .order_by(desc(WalletTransaction.created_at)).limit(50))).scalars()
    return {"balance": await svc.wallet_balance(db, user.id),
            "transactions": [{"type": t.type, "amount": int(t.amount), "status": t.status, "at": t.created_at.isoformat()} for t in rows]}


@router.post("/coupons/validate")
async def validate_coupon(body: QuoteIn, db: AsyncSession = Depends(get_db)):
    q = await svc.quote(db, [i.model_dump() for i in body.items], body.coupon)
    return {"valid": bool(q["coupon"]), "discount": q["discount"], "total": q["total"]}
