from aiogram import Router

from modasr_bot.handlers import admin, business, customer

router = Router()
router.include_routers(admin.router, business.router, customer.router)
