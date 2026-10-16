from aiogram import F, Router
from aiogram.enums import ChatAction
from aiogram.filters import CommandObject, CommandStart
from aiogram.types import CallbackQuery, InlineKeyboardButton as B, InlineKeyboardMarkup as M, InlineQuery, \
    InlineQueryResultArticle, InputTextMessageContent, Message

from modasr_bot import api
from modasr_bot.config import settings
from modasr_bot.keyboards import back, main_menu, product_buttons

router = Router()
toman = lambda n: f"{int(n):,} تومان".replace(",", "٬") if n else "استعلام"

WELCOME = ("سلام {name} 👋\nبه <b>MODASR HUB</b> خوش اومدی.\n"
           "اشتراک، گیفت‌کارت و محصولات دیجیتال با تحویل سریع و پشتیبانی هوشمند ⚡️")


@router.message(CommandStart(deep_link=True))
async def start_deep(m: Message, command: CommandObject):
    arg = command.args or ""
    if arg.startswith("p_"):  # t.me/modasrhub_bot?start=p_<slug>
        p = await api.get(f"/api/products/{arg[2:]}")
        await m.answer(f"<b>{p['title']}</b>\n{p.get('short') or ''}\n\n💰 از {toman(p['price_from'])}",
                       reply_markup=product_buttons(p["slug"]))
        return
    await start(m)  # ref_<code> is captured by the Mini App via start_param


@router.message(CommandStart())
async def start(m: Message):
    await m.answer(WELCOME.format(name=m.from_user.first_name or ""), reply_markup=main_menu())


@router.callback_query(F.data == "menu")
async def menu(c: CallbackQuery):
    await c.message.edit_text("چی لازم داری؟ 👇", reply_markup=main_menu())


@router.callback_query(F.data == "cats")
async def cats(c: CallbackQuery):
    rows = [x for x in await api.get("/api/categories") if not x["parent_id"]]
    kb = [[B(text=f"{x.get('icon') or '▫️'} {x['name']}", callback_data=f"cat:{x['slug']}"[:64])] for x in rows]
    await c.message.edit_text("دسته‌بندی رو انتخاب کن:", reply_markup=M(inline_keyboard=kb + back().inline_keyboard))


@router.callback_query(F.data.startswith("cat:") | (F.data == "top"))
async def list_products(c: CallbackQuery):
    params = {"featured": True, "size": 10} if c.data == "top" else {"category": c.data[4:], "size": 20}
    items = (await api.get("/api/products", **params))["items"]
    if not items:
        return await c.answer("فعلاً محصولی نیست", show_alert=True)
    kb = [[B(text=f"{p['title']} · {toman(p['price_from'])}", callback_data=f"p:{p['slug']}"[:64])] for p in items]
    await c.message.edit_text("یکی رو انتخاب کن:", reply_markup=M(inline_keyboard=kb + back().inline_keyboard))


@router.callback_query(F.data.startswith("p:"))
async def product(c: CallbackQuery):
    p = await api.get(f"/api/products/{c.data[2:]}")
    lines = "\n".join(f"• {v['name']}: {toman(v['price'])} {'✅' if v['in_stock'] else '❌'}" for v in p["variants"])
    text = f"<b>{p['title']}</b>\n{p.get('short') or ''}\n\n{lines}"
    if p["images"]:
        await c.message.answer_photo(p["images"][0], caption=text, reply_markup=product_buttons(p["slug"]))
    else:
        await c.message.answer(text, reply_markup=product_buttons(p["slug"]))
    await c.answer()


@router.callback_query(F.data == "ai")
async def ai_hint(c: CallbackQuery):
    await c.message.answer("هر سؤالی داری بپرس: محصول، قیمت، پیگیری سفارش یا مشکل 🤖", reply_markup=back())
    await c.answer()


@router.inline_query()
async def inline_search(q: InlineQuery):
    items = (await api.get("/api/products", q=q.query or None, size=10))["items"] if q.query else []
    results = [InlineQueryResultArticle(
        id=p["id"], title=p["title"], description=f"از {toman(p['price_from'])}",
        input_message_content=InputTextMessageContent(message_text=f"{p['title']}\n{settings.public_url}/p/{p['slug']}"),
        reply_markup=product_buttons(p["slug"])) for p in items]
    await q.answer(results, cache_time=30, is_personal=False)


@router.message(F.text & ~F.text.startswith("/"))
async def ai_chat(m: Message):
    await m.bot.send_chat_action(m.chat.id, ChatAction.TYPING)
    res = await api.post("/internal/bot/chat", {"user": m.from_user.model_dump(include={"id", "username", "first_name", "last_name"}),
                                                "chat_id": m.chat.id, "text": m.text, "channel": "bot"})
    if res.get("reply"):
        await m.answer(res["reply"], parse_mode=None, reply_markup=back())
