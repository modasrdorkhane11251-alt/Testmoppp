"""Transactional outbox + signed n8n delivery with exponential backoff."""
import json
import uuid
from datetime import datetime, timedelta, timezone

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.security import sign_payload
from app.models import EventOutbox

EVENTS = {"user.registered", "order.created", "order.paid", "order.delivered", "order.failed",
          "ticket.created", "ticket.closed", "ticket.escalated", "supplier.price_changed",
          "supplier.out_of_stock", "supplier.down", "receipt.flagged", "cart.abandoned"}


async def emit(db: AsyncSession, event: str, payload: dict) -> None:
    """Call inside the same transaction as the business write."""
    assert event in EVENTS, event
    db.add(EventOutbox(event=event, payload=payload))


async def deliver_pending(db: AsyncSession, batch: int = 50) -> int:
    s = get_settings()
    now = datetime.now(timezone.utc)
    rows = (await db.execute(select(EventOutbox).where(EventOutbox.status == "pending", EventOutbox.next_attempt_at <= now)
                             .order_by(EventOutbox.created_at).limit(batch).with_for_update(skip_locked=True))).scalars().all()
    sent = 0
    async with httpx.AsyncClient(timeout=10) as c:
        for ev in rows:
            body = json.dumps({"event_id": str(ev.id), "event": ev.event, "created_at": ev.created_at.isoformat(),
                               "source": "modasr-hub", "retry_count": ev.attempts, "data": ev.payload}, ensure_ascii=False).encode()
            sig, ts = sign_payload(body, s.n8n_signing_secret)
            try:
                r = await c.post(s.n8n_webhook_url, content=body, headers={
                    "Content-Type": "application/json", "X-Modasr-Signature": sig, "X-Modasr-Timestamp": str(ts),
                    "Idempotency-Key": str(ev.id)})
                r.raise_for_status()
                ev.status, sent = "delivered", sent + 1
            except Exception as e:  # noqa: BLE001
                ev.attempts += 1
                ev.last_error = str(e)[:500]
                ev.status = "dead" if ev.attempts >= 8 else "pending"
                ev.next_attempt_at = now + timedelta(seconds=min(3600, 15 * 2 ** ev.attempts))
    await db.commit()
    return sent


def new_event_id() -> str:
    return uuid.uuid4().hex
