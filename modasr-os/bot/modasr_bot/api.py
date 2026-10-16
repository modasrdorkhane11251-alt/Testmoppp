import httpx

from modasr_bot.config import settings

_client = httpx.AsyncClient(base_url=settings.api_url, timeout=45, headers={"X-Internal-Token": settings.internal_token})


async def get(path: str, **params):
    r = await _client.get(path, params=params)
    r.raise_for_status()
    return r.json()


async def post(path: str, json: dict):
    r = await _client.post(path, json=json)
    r.raise_for_status()
    return r.json()
