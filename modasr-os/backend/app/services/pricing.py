"""Pricing: cost × live rate + profit rule (variant → category → default). Pure, unit-tested."""
import math
from dataclasses import dataclass

DEFAULT_RULE = {"percent": 12.0, "fixed": 20_000, "min_profit": 30_000, "round_to": 1_000}
REVIEW_THRESHOLD = 0.08  # >8% cost jump → human review, never silent repricing


@dataclass
class Price:
    cost: int
    profit: int
    price: int
    needs_review: bool = False


def resolve_rule(variant_rule: dict | None, category_rule: dict | None, default: dict | None = None) -> dict:
    rule = dict(default or DEFAULT_RULE)
    for layer in (category_rule, variant_rule):
        if layer:
            rule.update({k: v for k, v in layer.items() if v is not None})
    return rule


def compute(cost_amount: float, rate_toman: float, rule: dict, previous_price: int | None = None) -> Price:
    cost = cost_amount * rate_toman
    profit = cost * float(rule["percent"]) / 100 + float(rule.get("fixed") or 0)
    profit = max(profit, float(rule.get("min_profit") or 0))
    step = int(rule.get("round_to") or 1000)
    final = int(math.ceil((cost + profit) / step) * step)
    review = bool(previous_price) and abs(final - previous_price) / previous_price > REVIEW_THRESHOLD
    return Price(round(cost), final - round(cost), final, review)


def apply_coupon(subtotal: int, kind: str, value: float, max_discount: int | None = None, min_order: int | None = None) -> int:
    if min_order and subtotal < min_order:
        return 0
    d = int(value) if kind == "fixed" else int(subtotal * value / 100)
    if max_discount:
        d = min(d, max_discount)
    return max(0, min(d, subtotal))
