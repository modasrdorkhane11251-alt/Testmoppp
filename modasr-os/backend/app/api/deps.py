import uuid
from fastapi import Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.security import current_claims
from app.models import User


async def current_user(claims: dict = Depends(current_claims), db: AsyncSession = Depends(get_db)) -> User:
    u = await db.get(User, uuid.UUID(claims["sub"]))
    if not u or not u.is_active:
        raise HTTPException(401, "user inactive")
    return u
