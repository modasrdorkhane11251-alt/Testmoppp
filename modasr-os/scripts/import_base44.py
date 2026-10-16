"""Migrate the current store into MODASR HUB OS.
Export Product / Category / Coupon from the old panel as JSON files, then:
    docker compose run --rm api python /app/../scripts/import_base44.py products.json categories.json coupons.json
"""
import asyncio
import json
import re
import sys
import uuid

sys.path.insert(0, "/app")
from app.core.db import SessionLocal  # noqa: E402
from app.models import Category, Coupon, DeliveryMode, Product, ProductType, Variant  # noqa: E402

slug = lambda s: re.sub(r"[^\w\u0600-\u06FF-]+", "-", str(s).strip().lower()).strip("-")[:150] or uuid.uuid4().hex[:8]


async def main(products_f, categories_f, coupons_f):
    products, cats, coupons = (json.load(open(f, encoding="utf-8")) for f in (products_f, categories_f, coupons_f))
    async with SessionLocal() as db:
        cat_map = {}
        for c in cats:
            obj = Category(slug=slug(c.get("slug") or c["name"]), name=c["name"])
            db.add(obj); await db.flush(); cat_map[c["id"]] = obj.id
        for p in products:
            prod = Product(type=ProductType.digital_subscription, slug=slug(p.get("slug") or p.get("title") or p["name"]),
                           title=p.get("title") or p["name"], short=(p.get("description") or "")[:300], description=p.get("description"),
                           images=[x for x in [p.get("image"), p.get("image_url"), *(p.get("images") or [])] if x],
                           category_id=cat_map.get(p.get("category_id")), is_active=p.get("status", "active") == "active")
            variants = p.get("variants") or [{"name": "استاندارد", "price": p.get("discount_price") or p.get("price")}]
            for i, v in enumerate(variants):
                prod.variants.append(Variant(sku=f"{p.get('sku') or prod.slug}-{i}", name=v.get("name", "استاندارد"),
                                             manual_price=v.get("price"), price=v.get("price"), delivery_mode=DeliveryMode.manual))
            db.add(prod)
        for c in coupons:
            db.add(Coupon(code=c["code"], kind="fixed" if c.get("type") in ("fixed", "amount") else "percent",
                          value=c.get("value") or c.get("discount_value") or 0, is_active=c.get("is_active", True)))
        await db.commit()
    print(f"imported {len(products)} products, {len(cats)} categories, {len(coupons)} coupons")


if __name__ == "__main__":
    asyncio.run(main(*sys.argv[1:4]))
