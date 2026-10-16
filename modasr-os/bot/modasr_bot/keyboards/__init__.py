from aiogram.types import InlineKeyboardButton as B, InlineKeyboardMarkup as M, WebAppInfo

from modasr_bot.config import settings


def main_menu() -> M:
    app = lambda path="": WebAppInfo(url=f"{settings.miniapp_url}{path}")
    return M(inline_keyboard=[
        [B(text="🛍 ورود به فروشگاه", web_app=app())],
        [B(text="📂 دسته‌بندی‌ها", callback_data="cats"), B(text="🔥 پرفروش‌ها", callback_data="top")],
        [B(text="🔎 جستجو", switch_inline_query_current_chat=""), B(text="🛒 سبد خرید", web_app=app("/cart"))],
        [B(text="📦 سفارش‌های من", web_app=app("/orders")), B(text="👛 کیف پول", web_app=app("/wallet"))],
        [B(text="🎁 کوپن‌ها", web_app=app("/coupons")), B(text="🤝 دعوت دوستان", web_app=app("/affiliate"))],
        [B(text="💬 پشتیبانی هوشمند", callback_data="ai")],
    ])


def back() -> M:
    return M(inline_keyboard=[[B(text="🔙 منوی اصلی", callback_data="menu")]])


def product_buttons(slug: str, sku: str | None = None) -> M:
    path = f"/p/{slug}" + (f"?v={sku}" if sku else "")
    return M(inline_keyboard=[[B(text="🛒 خرید", web_app=WebAppInfo(url=f"{settings.miniapp_url}{path}"))],
                              [B(text="🔙 منو", callback_data="menu")]])
