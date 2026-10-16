"""
Interactive Inline Keyboards for Phase 4 Life RP (Roleplay & City Simulator).
Standardized across Telegram, Bale, and Rubika.
"""
from core.unified_models import UnifiedInlineKeyboard, UnifiedInlineButton


def rp_main_dashboard_keyboard(is_jailed: bool = False) -> UnifiedInlineKeyboard:
    """The central Life RP command center."""
    kb = UnifiedInlineKeyboard()

    if is_jailed:
        kb.add_row(
            UnifiedInlineButton(text="⚖️ پرداخت وثیقه و آزادی فوری از زندان", callback_data="cb_rp_bail")
        )

    kb.add_row(
        UnifiedInlineButton(text="💼 بازار کار و استخدام", callback_data="cb_rp_jobs"),
        UnifiedInlineButton(text="🏢 خرید و اجاره املاک", callback_data="cb_rp_properties"),
    )
    kb.add_row(
        UnifiedInlineButton(text="🏦 بانک و تسهیلات", callback_data="cb_rp_bank"),
        UnifiedInlineButton(text="🏥 بیمارستان و درمان", callback_data="cb_rp_hospital"),
    )
    kb.add_row(
        UnifiedInlineButton(text="🎓 دانشگاه و تحصیل", callback_data="cb_rp_university"),
        UnifiedInlineButton(text="🚨 دنیای زیرزمینی و خلاف", callback_data="cb_rp_crimes"),
    )
    kb.add_row(
        UnifiedInlineButton(text="💍 خانواده و ازدواج", callback_data="cb_rp_family"),
        UnifiedInlineButton(text="🏙 شهرداری و شورا", callback_data="cb_rp_city"),
    )
    kb.add_row(
        UnifiedInlineButton(text="📊 رتبه‌بندی ثروتمندان", callback_data="cb_rp_leaderboard"),
        UnifiedInlineButton(text="🔄 تازه‌سازی وضعیت", callback_data="cb_game_rp"),
    )
    kb.add_row(
        UnifiedInlineButton(text="🔙 بازگشت به بخش بازی‌ها", callback_data="cb_mod_games"),
        UnifiedInlineButton(text="🏠 منوی اصلی ربات", callback_data="cb_main_menu"),
    )
    return kb


def rp_jobs_keyboard(current_job: str = None) -> UnifiedInlineKeyboard:
    """Job market and shift execution keyboard."""
    kb = UnifiedInlineKeyboard()

    if current_job:
        kb.add_row(
            UnifiedInlineButton(text="⚡️ شروع شیفت کاری (کسب درآمد)", callback_data="cb_rp_do_work")
        )

    # 11 Available Jobs
    kb.add_row(
        UnifiedInlineButton(text="🧱 کارگر (۱۲۰۰ سکه)", callback_data="cb_rp_job_worker"),
        UnifiedInlineButton(text="🛒 فروشنده (۱۸۰۰ سکه)", callback_data="cb_rp_job_seller"),
    )
    kb.add_row(
        UnifiedInlineButton(text="🚕 راننده (۲۲۰۰ سکه)", callback_data="cb_rp_job_driver"),
        UnifiedInlineButton(text="🍳 آشپز (۲۵۰۰ سکه)", callback_data="cb_rp_job_cook"),
    )
    kb.add_row(
        UnifiedInlineButton(text="📚 معلم (۳۲۰۰ سکه)", callback_data="cb_rp_job_teacher"),
        UnifiedInlineButton(text="💉 پرستار (۳۶۰۰ سکه)", callback_data="cb_rp_job_nurse"),
    )
    kb.add_row(
        UnifiedInlineButton(text="📐 مهندس (۵۲۰۰ سکه)", callback_data="cb_rp_job_engineer"),
        UnifiedInlineButton(text="💻 برنامه‌نویس (۷۰۰۰ سکه)", callback_data="cb_rp_job_developer"),
    )
    kb.add_row(
        UnifiedInlineButton(text="🩺 پزشک (۹۵۰۰ سکه)", callback_data="cb_rp_job_doctor"),
        UnifiedInlineButton(text="👔 مدیر (۱۱۰۰۰ سکه)", callback_data="cb_rp_job_manager"),
    )
    kb.add_row(
        UnifiedInlineButton(text="📈 سرمایه‌گذار (۱۵۰۰۰ سکه)", callback_data="cb_rp_job_investor")
    )
    kb.add_row(
        UnifiedInlineButton(text="🔙 بازگشت به Life RP", callback_data="cb_game_rp")
    )
    return kb


def rp_properties_keyboard(has_income_to_claim: bool = True) -> UnifiedInlineKeyboard:
    """Real estate purchase and rent collection keyboard."""
    kb = UnifiedInlineKeyboard()

    if has_income_to_claim:
        kb.add_row(
            UnifiedInlineButton(text="💰 برداشت سود انباشته املاک", callback_data="cb_rp_claim_income")
        )

    kb.add_row(
        UnifiedInlineButton(text="🏞 زمین کوچک (۸۰ هزار)", callback_data="cb_rp_buy_land_small"),
        UnifiedInlineButton(text="🏢 آپارتمان (۲۵۰ هزار)", callback_data="cb_rp_buy_apartment"),
    )
    kb.add_row(
        UnifiedInlineButton(text="🏡 ویلا لوکس (۶۰۰ هزار)", callback_data="cb_rp_buy_house"),
        UnifiedInlineButton(text="🏪 مغازه تجاری (۳۵۰ هزار)", callback_data="cb_rp_buy_shop"),
    )
    kb.add_row(
        UnifiedInlineButton(text="🏭 کارخانه صنعتی (۳ میلیون)", callback_data="cb_rp_buy_factory")
    )
    kb.add_row(
        UnifiedInlineButton(text="🔙 بازگشت به Life RP", callback_data="cb_game_rp")
    )
    return kb


def rp_crimes_keyboard() -> UnifiedInlineKeyboard:
    """Underworld criminal activities keyboard."""
    kb = UnifiedInlineKeyboard()
    kb.add_row(
        UnifiedInlineButton(text="🧤 جیب‌بری در مترو (سود: ۶۰۰ تا ۲,۲۰۰)", callback_data="cb_rp_crime_pickpocket")
    )
    kb.add_row(
        UnifiedInlineButton(text="💎 سرقت از جواهرفروشی (سود: ۳,۵۰۰ تا ۹,۰۰۰)", callback_data="cb_rp_crime_shoplift")
    )
    kb.add_row(
        UnifiedInlineButton(text="🏦 هک بانک مرکزی شهر (سود: ۱۸ تا ۶۵ هزار)", callback_data="cb_rp_crime_bank_heist")
    )
    kb.add_row(
        UnifiedInlineButton(text="⚖️ پرداخت وثیقه / خروج از حبس", callback_data="cb_rp_bail"),
        UnifiedInlineButton(text="🔙 بازگشت به Life RP", callback_data="cb_game_rp")
    )
    return kb


def rp_bank_keyboard() -> UnifiedInlineKeyboard:
    """Bank deposits, loans, and wire transfers."""
    kb = UnifiedInlineKeyboard()
    kb.add_row(
        UnifiedInlineButton(text="📥 واریز نقدی به حساب بانکی", callback_data="cb_rp_bank_deposit"),
        UnifiedInlineButton(text="📤 برداشت نقدی از خودپرداز", callback_data="cb_rp_bank_withdraw"),
    )
    kb.add_row(
        UnifiedInlineButton(text="🏛 اخذ وام فوری", callback_data="cb_rp_bank_loan"),
        UnifiedInlineButton(text="💳 بازپرداخت قسط وام", callback_data="cb_rp_bank_repay"),
    )
    kb.add_row(
        UnifiedInlineButton(text="💸 انتقال کارت به کارت", callback_data="cb_rp_bank_transfer"),
        UnifiedInlineButton(text="🔙 بازگشت به Life RP", callback_data="cb_game_rp"),
    )
    return kb


def rp_hospital_keyboard() -> UnifiedInlineKeyboard:
    """Healthcare services."""
    kb = UnifiedInlineKeyboard()
    kb.add_row(
        UnifiedInlineButton(text="🩺 ویزیت و درمان کامل (۱,۰۰۰ سکه)", callback_data="cb_rp_heal"),
        UnifiedInlineButton(text="🔙 بازگشت به Life RP", callback_data="cb_game_rp")
    )
    return kb


def rp_university_keyboard() -> UnifiedInlineKeyboard:
    """Education and intelligence boost."""
    kb = UnifiedInlineKeyboard()
    kb.add_row(
        UnifiedInlineButton(text="📖 ثبت نام ترم تحصیلی (۱,۵۰۰ سکه)", callback_data="cb_rp_study"),
        UnifiedInlineButton(text="🔙 بازگشت به Life RP", callback_data="cb_game_rp")
    )
    return kb


def rp_city_keyboard() -> UnifiedInlineKeyboard:
    """Municipal government dashboard."""
    kb = UnifiedInlineKeyboard()
    kb.add_row(
        UnifiedInlineButton(text="🏛 کمک مالی به بودجه شهر", callback_data="cb_rp_city_donate"),
        UnifiedInlineButton(text="🔙 بازگشت به Life RP", callback_data="cb_game_rp")
    )
    return kb
