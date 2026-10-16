"""Webhook entrypoint (aiohttp). Telegram verifies itself with X-Telegram-Bot-Api-Secret-Token."""
from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode
from aiogram.types import BotCommand, MenuButtonWebApp, WebAppInfo
from aiogram.webhook.aiohttp_server import SimpleRequestHandler, setup_application
from aiohttp import web

from modasr_bot.config import settings
from modasr_bot.handlers import router

WEBHOOK_PATH = "/tg/webhook"


async def on_startup(bot: Bot):
    await bot.set_webhook(f"{settings.webhook_base}{WEBHOOK_PATH}", secret_token=settings.tg_webhook_secret,
                          allowed_updates=["message", "callback_query", "inline_query", "business_connection", "business_message"],
                          drop_pending_updates=True)
    await bot.set_my_commands([BotCommand(command="start", description="منوی اصلی"),
                               BotCommand(command="shop", description="فروشگاه")])
    await bot.set_chat_menu_button(menu_button=MenuButtonWebApp(text="فروشگاه", web_app=WebAppInfo(url=settings.miniapp_url)))


def main():
    bot = Bot(settings.tg_bot_token, default=DefaultBotProperties(parse_mode=ParseMode.HTML))
    dp = Dispatcher()
    dp.include_router(router)
    dp.startup.register(on_startup)
    app = web.Application()
    SimpleRequestHandler(dispatcher=dp, bot=bot, secret_token=settings.tg_webhook_secret).register(app, path=WEBHOOK_PATH)
    setup_application(app, dp, bot=bot)
    app.router.add_get("/health", lambda _: web.json_response({"ok": True}))
    web.run_app(app, host="0.0.0.0", port=8081)


if __name__ == "__main__":
    main()
