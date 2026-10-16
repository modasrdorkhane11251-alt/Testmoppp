"""Content, product, CRM and receipt intelligence."""
import base64

import httpx

from app.services.ai import gemini
from app.services.ai.agents import AGENTS


async def product_copy(title: str, facts: dict) -> dict:
    return await gemini.generate_json(AGENTS["content"], f"""برای این محصول JSON بده با کلیدهای:
title_seo, short (حداکثر ۱۲۰ کاراکتر), description (markdown), faq ([{{q,a}}] ۵ مورد), seo_keywords (۸ مورد),
telegram_post (حداکثر ۶ خط با ایموجی), instagram_caption (+ ۱۰ هشتگ).
فقط از این حقایق استفاده کن: {title} | {facts}""")


async def campaign_plan(goal: str, products: list[dict], budget_hint: str = "") -> dict:
    return await gemini.generate_json(AGENTS["marketing"], f"""هدف: {goal}. محصولات: {products}. {budget_hint}
JSON بده: name, audience, duration_days, coupon {{kind, value, max_discount, usage_limit}}, channels,
posts [{{day, platform, caption}}], expected_effect, risks.""")


async def segment_customer(stats: dict) -> dict:
    return await gemini.generate_json(AGENTS["analytics"], f"""این مشتری را بخش‌بندی کن: {stats}
JSON: segment (new | active | vip | at_risk | churned), next_purchase_probability (0-1),
recommended_action, suggested_products (sku[]).""")


async def check_receipt(image_url: str, expected_toman: int, card_last4: str | None) -> dict:
    async with httpx.AsyncClient(timeout=20) as c:
        img = await c.get(image_url)
    b64 = base64.b64encode(img.content).decode()
    content = await gemini.generate(
        "تو تحلیل‌گر رسید بانکی ایرانی هستی. فقط JSON برگردان.",
        [{"role": "user", "parts": [
            {"text": "کلیدها: is_receipt, amount_rial, date, time, tracking, dest_card_last4, bank, status_success, edit_suspicion(0-100), notes"},
            {"inline_data": {"mime_type": img.headers.get("content-type", "image/jpeg"), "data": b64}}]}],
        json_mode=True, temperature=0)
    import json
    try:
        d = json.loads(gemini.text_of(content))
    except json.JSONDecodeError:
        d = {}
    amount = round((d.get("amount_rial") or 0) / 10)
    issues = []
    if not d.get("is_receipt"): issues.append("رسید بانکی تشخیص داده نشد")
    if amount != expected_toman: issues.append(f"مبلغ رسید {amount} با سفارش {expected_toman} یکی نیست")
    if card_last4 and d.get("dest_card_last4") and d["dest_card_last4"] != card_last4: issues.append("کارت مقصد متفاوت است")
    if d.get("status_success") is False: issues.append("تراکنش ناموفق")
    if (d.get("edit_suspicion") or 0) >= 50: issues.append("احتمال دستکاری تصویر")
    verdict = "approve" if not issues else ("review" if len(issues) == 1 and (d.get("edit_suspicion") or 0) < 50 else "reject")
    return {"verdict": verdict, "issues": issues, "amount_toman": amount, **d}
