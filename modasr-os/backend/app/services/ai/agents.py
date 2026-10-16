"""MODASR AI CORE: one brain, specialised agents, guarded tools.

Principle: AI may READ anything it needs and EXECUTE low-risk actions.
Money, refunds, price changes, bulk publishing → proposed AIAction, executed only after human approval.
"""
BRAND = "MODASR HUB"

COMMON = f"""تو بخشی از «MODASR AI CORE» هستی، هوش مرکزی فروشگاه {BRAND}.
- فقط فارسی، کوتاه، دقیق و صمیمی.
- هیچ قیمت، موجودی، زمان تحویل یا وضعیت سفارشی را از خودت نساز؛ فقط از خروجی ابزارها استفاده کن.
- اطلاعات حساس (رمز، کد کامل کارت، CVV) هرگز درخواست نکن.
- اگر مطمئن نیستی یا موضوع مالی/اختلافی است، ابزار escalate را صدا بزن.
- نام هیچ پلتفرم یا سازنده دیگری را به‌عنوان سازنده سیستم نیاور."""

AGENTS = {
    "sales": COMMON + """
نقش: فروشنده حرفه‌ای. نیاز مشتری را بفهم، با search_products محصول مناسب پیشنهاد بده،
مقایسه کن، باندل و ارتقا (upsell/cross-sell) پیشنهاد بده و لینک خرید بده. اصرار آزاردهنده ممنوع.""",
    "support": COMMON + """
نقش: پشتیبانی. با get_order وضعیت سفارش را بگو، با get_policy قوانین بازگشت وجه را توضیح بده،
مشکلات رایج را حل کن. برای مشکل حل‌نشده create_ticket بزن. موارد فوری یا عصبانیت شدید → escalate با اولویت urgent.""",
    "content": COMMON + """
نقش: تولید محتوا. توضیحات محصول، سئو، پست تلگرام، کپشن اینستاگرام، FAQ و اطلاعیه می‌نویسی.
خروجی دقیق، جذاب و بدون ادعای غیرواقعی باشد.""",
    "marketing": COMMON + """
نقش: مدیر بازاریابی. کمپین، تخفیف، برنامه لانچ و پروموشن فصلی طراحی کن. هر کمپین باید هدف، مخاطب،
بازه، کوپن پیشنهادی، پیش‌بینی اثر و متن پست داشته باشد. اجرای کمپین فقط با propose_action.""",
    "analytics": COMMON + """
نقش: تحلیل‌گر. با ابزارهای آماری درآمد، سود، فروش، محصولات و مشتریان را تحلیل کن،
فرصت‌ها و مشکلات را با عدد و پیشنهاد عملی گزارش بده.""",
    "admin": COMMON + """
نقش: دستیار ادمین. دستور زبان طبیعی ادمین را با ابزارها اجرا کن.
خواندن داده آزاد است؛ هر تغییر حساس (قیمت، کمپین، کوپن، انتشار گروهی، بازگشت وجه) را با propose_action ثبت کن.""",
}

TOOLS = {
    "search_products": {"name": "search_products", "description": "جستجوی محصولات فعال با قیمت زنده",
        "parameters": {"type": "object", "properties": {"query": {"type": "string"}, "limit": {"type": "integer"}}, "required": ["query"]}},
    "get_order": {"name": "get_order", "description": "وضعیت سفارش کاربر فعلی با شماره سفارش",
        "parameters": {"type": "object", "properties": {"number": {"type": "integer"}}, "required": ["number"]}},
    "my_recent_orders": {"name": "my_recent_orders", "description": "سفارش‌های اخیر کاربر فعلی",
        "parameters": {"type": "object", "properties": {}}},
    "get_policy": {"name": "get_policy", "description": "متن قوانین: refund, delivery, warranty, privacy",
        "parameters": {"type": "object", "properties": {"topic": {"type": "string"}}, "required": ["topic"]}},
    "create_ticket": {"name": "create_ticket", "description": "ساخت تیکت پشتیبانی",
        "parameters": {"type": "object", "properties": {"subject": {"type": "string"}, "summary": {"type": "string"},
            "priority": {"type": "string", "enum": ["low", "normal", "high", "urgent"]}}, "required": ["subject", "summary"]}},
    "escalate": {"name": "escalate", "description": "ارجاع فوری به انسان",
        "parameters": {"type": "object", "properties": {"reason": {"type": "string"}}, "required": ["reason"]}},
    "sales_stats": {"name": "sales_stats", "description": "درآمد، سود و تعداد سفارش در بازه",
        "parameters": {"type": "object", "properties": {"period": {"type": "string", "enum": ["today", "week", "month"]}}, "required": ["period"]}},
    "best_sellers": {"name": "best_sellers", "description": "پرفروش‌ترین محصولات",
        "parameters": {"type": "object", "properties": {"period": {"type": "string", "enum": ["today", "week", "month"]}, "limit": {"type": "integer"}}}},
    "open_tickets": {"name": "open_tickets", "description": "تیکت‌های باز و حل‌نشده",
        "parameters": {"type": "object", "properties": {"limit": {"type": "integer"}}}},
    "propose_action": {"name": "propose_action", "description": "پیشنهاد اقدام حساس برای تأیید ادمین (کمپین، کوپن، تغییر قیمت، انتشار)",
        "parameters": {"type": "object", "properties": {"action": {"type": "string",
            "enum": ["create_coupon", "create_campaign", "update_price", "publish_post", "schedule_post", "refund"]},
            "payload": {"type": "object"}, "rationale": {"type": "string"}}, "required": ["action", "payload", "rationale"]}},
}

AGENT_TOOLS = {
    "sales": ["search_products", "get_policy", "escalate"],
    "support": ["get_order", "my_recent_orders", "get_policy", "create_ticket", "escalate", "search_products"],
    "content": ["search_products"],
    "marketing": ["search_products", "best_sellers", "sales_stats", "propose_action"],
    "analytics": ["sales_stats", "best_sellers", "open_tickets"],
    "admin": list(TOOLS),
}

ROUTER_HINTS = {
    "support": ["سفارش", "پیگیری", "تحویل", "مشکل", "بازگشت", "ریفاند", "پس بگیر", "کار نمیکنه", "کار نمی‌کند", "تیکت", "شکایت"],
}


def route(message: str, default: str = "sales") -> str:
    m = message.replace("\u200c", " ")
    for agent, words in ROUTER_HINTS.items():
        if any(w.replace("\u200c", " ") in m for w in words):
            return agent
    return default


def tools_for(agent: str) -> list[dict]:
    return [TOOLS[t] for t in AGENT_TOOLS[agent]]
