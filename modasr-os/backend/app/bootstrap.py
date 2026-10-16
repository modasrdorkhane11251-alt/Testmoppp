"""One-shot: create tables + seed policies. In production use Alembic migrations afterwards:
   alembic init migrations && alembic revision --autogenerate -m init && alembic upgrade head"""
import asyncio

from app.core.db import Base, SessionLocal, engine
from app.models import KnowledgeArticle

POLICIES = {
    "refund": ("بازگشت وجه", "اگر محصول تحویل نشده باشد، مبلغ کامل ظرف ۲۴ ساعت به کیف پول یا کارت برمی‌گردد. "
               "برای کدهای فعال‌شده یا اکانت‌های تحویل‌شده، فقط در صورت خرابی محصول و در بازه ضمانت همان محصول تعویض یا بازگشت وجه انجام می‌شود."),
    "delivery": ("تحویل", "محصولات با برچسب «تحویل فوری» بلافاصله بعد از پرداخت تحویل می‌شوند. سایر محصولات حداکثر تا ۶ ساعت کاری."),
    "warranty": ("ضمانت", "مدت ضمانت هر محصول در صفحه همان محصول درج شده است."),
    "privacy": ("حریم خصوصی", "اطلاعات شما فقط برای پردازش سفارش استفاده می‌شود و با هیچ شخص ثالثی فروخته نمی‌شود."),
}


async def main():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    async with SessionLocal() as db:
        for slug, (title, body) in POLICIES.items():
            if not await db.scalar(KnowledgeArticle.__table__.select().where(KnowledgeArticle.slug == slug)):
                db.add(KnowledgeArticle(slug=slug, title=title, body=body, kind="policy"))
        await db.commit()
    print("MODASR HUB database ready")


if __name__ == "__main__":
    asyncio.run(main())
