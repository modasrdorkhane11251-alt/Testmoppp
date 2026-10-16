"""Zarinpal v4. Amount is ALWAYS computed server-side; verify before any fulfillment."""
import httpx

from app.core.config import get_settings


def _base() -> str:
    return "https://sandbox.zarinpal.com" if get_settings().zarinpal_sandbox else "https://payment.zarinpal.com"


async def request_payment(amount_toman: int, description: str, callback_url: str, order_number: int, mobile: str | None = None) -> dict:
    s = get_settings()
    async with httpx.AsyncClient(timeout=15) as c:
        r = await c.post(f"{_base()}/pg/v4/payment/request.json", json={
            "merchant_id": s.zarinpal_merchant_id, "amount": amount_toman * 10, "description": description,
            "callback_url": callback_url, "metadata": {"mobile": mobile, "order_id": str(order_number)},
        })
    d = r.json().get("data") or {}
    if d.get("code") != 100:
        raise RuntimeError(f"gateway error: {r.text[:300]}")
    return {"authority": d["authority"], "url": f"{_base()}/pg/StartPay/{d['authority']}"}


async def verify_payment(amount_toman: int, authority: str) -> dict:
    s = get_settings()
    async with httpx.AsyncClient(timeout=15) as c:
        r = await c.post(f"{_base()}/pg/v4/payment/verify.json", json={
            "merchant_id": s.zarinpal_merchant_id, "amount": amount_toman * 10, "authority": authority,
        })
    d = r.json().get("data") or {}
    return {"ok": d.get("code") in (100, 101), "ref_id": d.get("ref_id"), "card": d.get("card_pan"), "raw": r.json()}
