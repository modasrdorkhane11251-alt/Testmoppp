"""Pure-logic tests: run with `python -m pytest` or plain `python tests/test_core.py`."""
import hashlib
import hmac
import json
import sys
import time
from pathlib import Path
from urllib.parse import urlencode

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import importlib.util

def load(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m); return m

root = Path(__file__).resolve().parents[1] / "app"
tga = load("tga", root / "core/telegram_auth.py")
pricing = load("pricing", root / "services/pricing.py")
TOKEN = "123456:TEST-TOKEN"


def test_login_widget_valid_and_tampered():
    data = {"id": 42, "first_name": "Modasr", "username": "modasr", "auth_date": int(time.time())}
    check = "\n".join(f"{k}={data[k]}" for k in sorted(data))
    h = hmac.new(hashlib.sha256(TOKEN.encode()).digest(), check.encode(), hashlib.sha256).hexdigest()
    assert tga.verify_login_widget({**data, "hash": h}, TOKEN)["id"] == "42"
    try:
        tga.verify_login_widget({**data, "id": 43, "hash": h}, TOKEN); assert False
    except tga.TelegramAuthError:
        pass


def test_webapp_init_data():
    user = json.dumps({"id": 7, "first_name": "M"})
    pairs = {"auth_date": str(int(time.time())), "query_id": "AAE", "user": user}
    check = "\n".join(f"{k}={pairs[k]}" for k in sorted(pairs))
    secret = hmac.new(b"WebAppData", TOKEN.encode(), hashlib.sha256).digest()
    h = hmac.new(secret, check.encode(), hashlib.sha256).hexdigest()
    out = tga.verify_webapp_init_data(urlencode({**pairs, "hash": h}), TOKEN)
    assert out["user"]["id"] == 7


def test_expired_login():
    data = {"id": 1, "auth_date": int(time.time()) - 200000}
    check = "\n".join(f"{k}={data[k]}" for k in sorted(data))
    h = hmac.new(hashlib.sha256(TOKEN.encode()).digest(), check.encode(), hashlib.sha256).hexdigest()
    try:
        tga.verify_login_widget({**data, "hash": h}, TOKEN); assert False
    except tga.TelegramAuthError as e:
        assert "expired" in str(e)


def test_pricing():
    p = pricing.compute(4.5, 105000, pricing.DEFAULT_RULE)
    assert (p.cost, p.price, p.profit) == (472500, 550000, 77500)
    cheap = pricing.compute(0.1, 105000, pricing.DEFAULT_RULE)
    assert cheap.profit >= 30000
    assert pricing.compute(5, 105000, pricing.DEFAULT_RULE, previous_price=500000).needs_review
    rule = pricing.resolve_rule({"percent": 7, "fixed": None}, {"percent": 15})
    assert rule["percent"] == 7 and rule["fixed"] == 20000


def test_coupon():
    assert pricing.apply_coupon(1_000_000, "percent", 10) == 100_000
    assert pricing.apply_coupon(1_000_000, "percent", 50, max_discount=200_000) == 200_000
    assert pricing.apply_coupon(100_000, "fixed", 50_000, min_order=200_000) == 0


if __name__ == "__main__":
    for n, f in list(globals().items()):
        if n.startswith("test_"):
            f(); print("✓", n)
