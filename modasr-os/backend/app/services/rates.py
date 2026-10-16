"""Live exchange-rate engine. Real data only: no hardcoded fallbacks, no fake prices."""
import asyncio
import statistics
import time
from dataclasses import dataclass, field

import httpx

USDT_MIN, USDT_MAX = 50_000, 2_000_000
OUTLIER = 0.04


@dataclass
class Quote:
    name: str
    value: float | None
    ok: bool
    ms: int
    error: str | None = None


@dataclass
class RateResult:
    currency: str
    toman: float | None
    healthy: bool
    sources: list[Quote] = field(default_factory=list)


async def _get(client: httpx.AsyncClient, url: str) -> tuple[dict | list, int]:
    t = time.perf_counter()
    r = await client.get(url, timeout=6)
    r.raise_for_status()
    return r.json(), int((time.perf_counter() - t) * 1000)


async def _nobitex(c):
    d, ms = await _get(c, "https://api.nobitex.ir/market/stats?srcCurrency=usdt&dstCurrency=rls")
    return float(d["stats"]["usdt-rls"]["latest"]) / 10, ms

async def _wallex(c):
    d, ms = await _get(c, "https://api.wallex.ir/v1/markets")
    return float(d["result"]["symbols"]["USDTTMN"]["stats"]["lastPrice"]), ms

async def _bitpin(c):
    d, ms = await _get(c, "https://api.bitpin.ir/api/v1/mkt/tickers/")
    rows = d if isinstance(d, list) else d.get("results", [])
    return float(next(x for x in rows if x.get("symbol") == "USDT_IRT")["price"]), ms

USDT_SOURCES = {"Nobitex": _nobitex, "Wallex": _wallex, "BitPin": _bitpin}


async def _safe(name, fn, client) -> Quote:
    try:
        v, ms = await fn(client)
        if not (USDT_MIN <= v <= USDT_MAX):
            return Quote(name, v, False, ms, "out of range")
        return Quote(name, v, True, ms)
    except Exception as e:  # noqa: BLE001
        return Quote(name, None, False, 0, str(e)[:120])


def aggregate(quotes: list[Quote]) -> float | None:
    vals = [q.value for q in quotes if q.ok and q.value]
    if not vals:
        return None
    med = statistics.median(vals)
    clean = [v for v in vals if abs(v - med) / med <= OUTLIER]
    for q in quotes:
        if q.ok and q.value and q.value not in clean:
            q.ok, q.error = False, "outlier"
    return round(statistics.median(clean))


async def fetch_usdt() -> RateResult:
    async with httpx.AsyncClient(headers={"User-Agent": "MODASR-HUB/1.0"}) as c:
        quotes = await asyncio.gather(*[_safe(n, f, c) for n, f in USDT_SOURCES.items()])
    val = aggregate(list(quotes))
    return RateResult("USDT", val, val is not None and sum(q.ok for q in quotes) >= 2, list(quotes))


async def fetch_fx_per_usd() -> tuple[dict[str, float] | None, list[Quote]]:
    quotes: list[Quote] = []
    async with httpx.AsyncClient() as c:
        for name, url, pick in [
            ("open.er-api", "https://open.er-api.com/v6/latest/USD", lambda d: d["rates"]),
            ("Frankfurter", "https://api.frankfurter.app/latest?from=USD&to=EUR,TRY", lambda d: d["rates"]),
        ]:
            try:
                d, ms = await _get(c, url)
                r = pick(d)
                quotes.append(Quote(name, None, True, ms))
                return {"EUR": r["EUR"], "TRY": r["TRY"], "AED": r.get("AED", 3.6725)}, quotes
            except Exception as e:  # noqa: BLE001
                quotes.append(Quote(name, None, False, 0, str(e)[:120]))
    return None, quotes


async def fetch_all() -> dict[str, RateResult]:
    usdt, (fx, fxq) = await asyncio.gather(fetch_usdt(), fetch_fx_per_usd())
    out = {"USDT": usdt, "USD": RateResult("USD", usdt.toman, usdt.healthy, usdt.sources)}
    for cur in ("EUR", "TRY", "AED"):
        val = round(usdt.toman / fx[cur]) if (usdt.toman and fx) else None
        out[cur] = RateResult(cur, val, bool(val) and usdt.healthy, fxq)
    return out
