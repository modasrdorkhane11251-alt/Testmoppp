from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import asc, desc, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.db import get_db
from app.models import Category, ExchangeRate, Product, Variant

router = APIRouter(prefix="/api", tags=["catalog"])


def _p(p: Product) -> dict:
    vs = [v for v in p.variants if v.price]
    return {"id": str(p.id), "slug": p.slug, "title": p.title, "title_en": p.title_en, "type": p.type.value,
            "short": p.short, "images": p.images, "featured": p.is_featured,
            "price_from": min((int(v.price) for v in vs), default=None),
            "in_stock": any(v.in_stock for v in vs),
            "variants": [{"sku": v.sku, "name": v.name, "price": int(v.price) if v.price else None, "in_stock": v.in_stock,
                          "duration_days": v.duration_days, "region": v.region, "account_type": v.account_type,
                          "delivery": v.delivery_mode.value, "warranty_days": v.warranty_days} for v in p.variants]}


@router.get("/categories")
async def categories(db: AsyncSession = Depends(get_db)):
    rows = (await db.execute(select(Category).order_by(Category.sort))).scalars()
    return [{"id": str(c.id), "parent_id": str(c.parent_id) if c.parent_id else None, "slug": c.slug, "name": c.name, "icon": c.icon} for c in rows]


@router.get("/products")
async def products(q: str | None = None, category: str | None = None, type: str | None = None,
                   sort: str = Query("popular", pattern="^(popular|new|price_asc|price_desc)$"),
                   featured: bool | None = None, page: int = 1, size: int = Query(24, le=60),
                   db: AsyncSession = Depends(get_db)):
    stmt = select(Product).where(Product.is_active).options(selectinload(Product.variants))
    if q:
        stmt = stmt.where(or_(Product.title.ilike(f"%{q}%"), Product.title_en.ilike(f"%{q}%")))
    if category:
        cat = (await db.execute(select(Category).where(Category.slug == category))).scalar_one_or_none()
        if cat:
            children = (await db.execute(select(Category.id).where(Category.parent_id == cat.id))).scalars().all()
            stmt = stmt.where(Product.category_id.in_([cat.id, *children]))
    if type:
        stmt = stmt.where(Product.type == type)
    if featured is not None:
        stmt = stmt.where(Product.is_featured == featured)
    order = {"popular": desc(Product.sales_count), "new": desc(Product.created_at)}.get(sort, desc(Product.sales_count))
    rows = (await db.execute(stmt.order_by(order).offset((page - 1) * size).limit(size))).scalars().all()
    items = [_p(p) for p in rows]
    if sort.startswith("price"):
        items.sort(key=lambda x: x["price_from"] or 0, reverse=sort == "price_desc")
    return {"items": items, "page": page}


@router.get("/products/{slug}")
async def product(slug: str, db: AsyncSession = Depends(get_db)):
    p = (await db.execute(select(Product).where(Product.slug == slug, Product.is_active).options(selectinload(Product.variants)))).scalar_one_or_none()
    if not p:
        raise HTTPException(404, "not found")
    related = (await db.execute(select(Product).where(Product.category_id == p.category_id, Product.id != p.id, Product.is_active)
               .options(selectinload(Product.variants)).limit(6))).scalars().all()
    return {**_p(p), "description": p.description, "specs": p.specs, "faq": p.faq, "seo": p.seo, "related": [_p(r) for r in related]}


@router.get("/rates")
async def rates(db: AsyncSession = Depends(get_db)):
    out = {}
    for cur in ("USDT", "USD", "EUR", "TRY", "AED"):
        r = (await db.execute(select(ExchangeRate).where(ExchangeRate.currency == cur).order_by(desc(ExchangeRate.fetched_at)).limit(1))).scalar_one_or_none()
        if r:
            out[cur] = {"toman": int(r.toman), "healthy": r.healthy, "sources": r.sources, "updated_at": r.fetched_at.isoformat()}
    return out


@router.get("/kb/{slug}")
async def kb(slug: str, db: AsyncSession = Depends(get_db)):
    from app.models import KnowledgeArticle
    a = (await db.execute(select(KnowledgeArticle).where(KnowledgeArticle.slug == slug, KnowledgeArticle.published))).scalar_one_or_none()
    if not a:
        raise HTTPException(404, "not found")
    return {"title": a.title, "body": a.body, "kind": a.kind}
