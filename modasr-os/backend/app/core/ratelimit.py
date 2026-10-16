import time
from fastapi import HTTPException, Request
from redis.asyncio import Redis

from app.core.config import get_settings

_redis: Redis | None = None


def redis() -> Redis:
    global _redis
    if _redis is None:
        _redis = Redis.from_url(get_settings().redis_url, decode_responses=True)
    return _redis


def rate_limit(name: str, limit: int, window: int = 60):
    async def dep(request: Request):
        ip = request.headers.get("cf-connecting-ip") or (request.client.host if request.client else "x")
        key = f"rl:{name}:{ip}:{int(time.time() // window)}"
        n = await redis().incr(key)
        if n == 1:
            await redis().expire(key, window)
        if n > limit:
            raise HTTPException(429, "too many requests")
    return dep
