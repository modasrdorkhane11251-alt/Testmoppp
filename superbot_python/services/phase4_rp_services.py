"""
SuperBot Phase 4 Services: Life Roleplay Simulator (Life RP)
Career, Economy, Assets, Family, City Governance, Judiciary, Underworld, and Banking.

Enterprise Python implementation matching multi-platform specifications (Telegram, Bale, Rubika).
"""
import time
import random
from typing import Dict, Any, List, Optional, Tuple
from database.database import db


class LifeRPServices:
    """
    Core Life RP game simulation engine.
    Handles stats progression, jobs, real-estate income, banking, crime, hospital, and university.
    """

    # 1. Job Definitions (matching client specifications)
    JOBS: Dict[str, Dict[str, Any]] = {
        "worker": {"name": "کارگر", "min_level": 0, "min_intel": 0, "pay": 1200, "energy": 20, "xp": 5, "desc": "کارگر ساده ساختمانی و کارگاهی"},
        "seller": {"name": "فروشنده", "min_level": 0, "min_intel": 5, "pay": 1800, "energy": 15, "xp": 8, "desc": "فروشنده در هایپرمارکت و بوتیک"},
        "driver": {"name": "راننده", "min_level": 1, "min_intel": 8, "pay": 2200, "energy": 25, "xp": 10, "desc": "راننده تاکسی شهری و اسنپ"},
        "cook": {"name": "آشپز", "min_level": 1, "min_intel": 10, "pay": 2500, "energy": 20, "xp": 10, "desc": "سرآشپز رستوران معتبر"},
        "teacher": {"name": "معلم", "min_level": 2, "min_intel": 15, "pay": 3200, "energy": 18, "xp": 14, "desc": "معلم آموزش و پرورش و مدرس"},
        "nurse": {"name": "پرستار", "min_level": 2, "min_intel": 18, "pay": 3600, "energy": 25, "xp": 15, "desc": "پرستار کادر درمان بیمارستان"},
        "engineer": {"name": "مهندس", "min_level": 3, "min_intel": 25, "pay": 5200, "energy": 22, "xp": 20, "desc": "مهندس ناظر عمران و معماری"},
        "developer": {"name": "برنامه‌نویس", "min_level": 4, "min_intel": 35, "pay": 7000, "energy": 20, "xp": 25, "desc": "توسعه‌دهنده نرم‌افزار فول‌استک"},
        "doctor": {"name": "پزشک", "min_level": 5, "min_intel": 50, "pay": 9500, "energy": 30, "xp": 30, "desc": "پزشک متخصص درمانگاه و جراح"},
        "manager": {"name": "مدیر", "min_level": 5, "min_intel": 60, "pay": 11000, "energy": 25, "xp": 30, "desc": "مدیر ارشد هلدینگ تجاری"},
        "investor": {"name": "سرمایه‌گذار", "min_level": 6, "min_intel": 75, "pay": 15000, "energy": 15, "xp": 35, "desc": "سرمایه‌گذار فرشته و عضو بورس"},
    }

    # 2. Real Estate Catalog
    PROPERTIES: Dict[str, Dict[str, Any]] = {
        "land_small": {"name": "زمین کوچک", "price": 80000, "income": 0, "desc": "زمین در حومه شهر با آینده درخشان"},
        "apartment": {"name": "آپارتمان مسکونی", "price": 250000, "income": 400, "desc": "واحد مسکونی با اجاره‌بهای ساعتی ۴۰۰ سکه"},
        "house": {"name": "خانه ویلایی لوکس", "price": 600000, "income": 900, "desc": "ویلای مجهز با درآمد ساعتی ۹۰۰ سکه"},
        "shop": {"name": "مغازه تجاری پرتردد", "price": 350000, "income": 700, "desc": "کسب‌وکار تجاری با بازدهی ساعتی ۷۰۰ سکه"},
        "factory": {"name": "کارخانه صنعتی مدرن", "price": 3000000, "income": 5000, "desc": "مجموعه صنعتی تولیدی با سود ساعتی ۵,۰۰۰ سکه"},
    }

    # 3. Crimes & Underworld
    CRIMES: Dict[str, Dict[str, Any]] = {
        "pickpocket": {
            "name": "جیب‌بری در مترو",
            "req_energy": 15,
            "win_chance": 0.70,
            "reward_min": 600,
            "reward_max": 2200,
            "jail_seconds": 180,  # 3 minutes
            "fine": 1200,
            "xp": 8,
        },
        "shoplift": {
            "name": "دستبرد به مغازه طلافروشی",
            "req_energy": 25,
            "win_chance": 0.50,
            "reward_min": 3500,
            "reward_max": 9000,
            "jail_seconds": 420,  # 7 minutes
            "fine": 4500,
            "xp": 20,
        },
        "bank_heist": {
            "name": "هک و سرقت از بانک مرکزی شهر",
            "req_energy": 45,
            "win_chance": 0.30,
            "reward_min": 18000,
            "reward_max": 65000,
            "jail_seconds": 900,  # 15 minutes
            "fine": 25000,
            "xp": 60,
        },
    }

    # =========================================================================
    # A) Citizen Status & Card
    # =========================================================================

    @classmethod
    def get_citizen_card(cls, platform: str, platform_user_id: str) -> Dict[str, Any]:
        """Provides full citizen profile combining basic account with RP stats."""
        u = db.get_user(platform, platform_user_id)
        if not u:
            u, _ = db.get_or_create_user(platform, platform_user_id)
        stats = db.get_or_create_rp_stats(platform, platform_user_id)
        assets = db.get_rp_assets(stats["uid"])

        # Check jail status
        now_ts = time.time()
        is_jailed = stats["jailed_until"] > now_ts
        remaining_jail = int(stats["jailed_until"] - now_ts) if is_jailed else 0

        # Calculate total property hourly income
        hourly_income = sum([cls.PROPERTIES.get(a["item_key"], {}).get("income", 0) for a in assets])

        job_info = cls.JOBS.get(stats["job"] or "", {})
        job_title = job_info.get("name", "بیکار و جویای کار")

        marriage = db.get_active_marriage(stats["uid"])
        partner_display = "مجرد"
        if marriage:
            partner_uid = marriage["user2_uid"] if marriage["user1_uid"] == stats["uid"] else marriage["user1_uid"]
            partner_display = f"متاهل (مهریه: {marriage['dowry']:,} سکه)"

        net_worth = (u.get("points", 0) or 0) + (stats.get("bank_balance", 0) or 0) - (stats.get("loan", 0) or 0)

        return {
            "user": u,
            "stats": stats,
            "assets": assets,
            "hourly_income": hourly_income,
            "job_title": job_title,
            "job_info": job_info,
            "is_jailed": is_jailed,
            "remaining_jail": remaining_jail,
            "partner_display": partner_display,
            "net_worth": net_worth,
        }

    # =========================================================================
    # B) Careers & Work
    # =========================================================================

    @classmethod
    def apply_job(cls, platform: str, platform_user_id: str, job_key: str) -> Dict[str, Any]:
        """Applies for a job if requirements (level, intelligence) are met."""
        if job_key not in cls.JOBS:
            return {"ok": False, "error": "شغل انتخابی معتبر نمی‌باشد!"}

        u = db.get_user(platform, platform_user_id) or {}
        stats = db.get_or_create_rp_stats(platform, platform_user_id)
        job = cls.JOBS[job_key]

        user_level = u.get("level", 1) or 1
        intel = stats.get("intelligence", 10) or 10

        if user_level < job["min_level"]:
            return {
                "ok": False,
                "error": f"برای این شغل نیاز به سطح حداقل {job['min_level']} دارید! (سطح شما: {user_level})"
            }

        if intel < job["min_intel"]:
            return {
                "ok": False,
                "error": f"برای استخدام به هوش حداقل {job['min_intel']} نیاز است! ابتدا در دانشگاه مطالعه کنید. (هوش شما: {intel})"
            }

        # Check jail
        if stats["jailed_until"] > time.time():
            return {"ok": False, "error": "شما هم‌اکنون در زندان به سر می‌برید و حق استخدام ندارید!"}

        db.update_rp_stats(stats["uid"], job=job_key)
        return {
            "ok": True,
            "message": f"🎉 تبریک! شما به عنوان <b>{job['name']}</b> استخدام شدید.\nدستمزد هر شیفت: {job['pay']:,} سکه\nانرژی لازم: {job['energy']} درصد"
        }

    @classmethod
    def do_work(cls, platform: str, platform_user_id: str) -> Dict[str, Any]:
        """Performs a work shift, consumes energy, grants wage & XP."""
        stats = db.get_or_create_rp_stats(platform, platform_user_id)
        uid = stats["uid"]

        # Check jail
        now_ts = time.time()
        if stats["jailed_until"] > now_ts:
            rem = int(stats["jailed_until"] - now_ts)
            return {"ok": False, "error": f"⛔️ شما در بازداشت هستید! ({rem} ثانیه تا آزادی)"}

        job_key = stats.get("job")
        if not job_key or job_key not in cls.JOBS:
            return {"ok": False, "error": "شما شغلی ندارید! ابتدا از منوی مشاغل استخدام شوید."}

        job = cls.JOBS[job_key]
        energy = stats.get("energy", 100)
        req_energy = job["energy"]

        if energy < req_energy:
            return {
                "ok": False,
                "error": f"⚠️ انرژی شما کافی نیست! (انرژی شما: {energy}% | لازم: {req_energy}%)\nبا استراحت یا رفتن به بیمارستان انرژی خود را افزایش دهید."
            }

        # Work cooldown: 60 seconds
        last_work = stats.get("last_work_time", 0) or 0
        if now_ts - last_work < 60:
            wait_sec = int(60 - (now_ts - last_work))
            return {"ok": False, "error": f"⏳ شما خسته هستید! لطفاً {wait_sec} ثانیه دیگر برای شیفت کاری بعدی صبر کنید."}

        # Deduct energy, increase hunger and stress, increase wage
        new_energy = max(0, energy - req_energy)
        new_stress = min(100, (stats.get("stress", 0) or 0) + 8)
        new_hunger = min(100, (stats.get("hunger", 0) or 0) + 12)

        wage = job["pay"]
        xp_gain = job["xp"]

        # Save stats
        db.update_rp_stats(
            uid,
            energy=new_energy,
            stress=new_stress,
            hunger=new_hunger,
            last_work_time=now_ts
        )

        # Deposit wage to cash & grant XP
        db.update_user_points(platform, platform_user_id, wage, is_increment=True)
        db.add_user_xp(platform, platform_user_id, xp_gain)

        return {
            "ok": True,
            "wage": wage,
            "xp_gain": xp_gain,
            "new_energy": new_energy,
            "job_name": job["name"],
            "message": (
                f"💼 <b>شیفت کاری انجام شد!</b>\n\n"
                f"• عنوان شغلی: {job['name']}\n"
                f"• درآمد دریافتی: <b>+{wage:,} سکه</b>\n"
                f"• تجربه کسب‌شده: <b>+{xp_gain} XP</b>\n"
                f"• انرژی باقیمانده: {new_energy}%\n"
                f"• استرس کاری: {new_stress}%"
            )
        }

    # =========================================================================
    # C) Real Estate & Property Income
    # =========================================================================

    @classmethod
    def buy_property(cls, platform: str, platform_user_id: str, property_key: str) -> Dict[str, Any]:
        """Purchases a property with citizen's cash."""
        if property_key not in cls.PROPERTIES:
            return {"ok": False, "error": "ملک مورد نظر معتبر نمی‌باشد!"}

        prop = cls.PROPERTIES[property_key]
        price = prop["price"]

        u = db.get_user(platform, platform_user_id) or {}
        cash = u.get("points", 0) or 0

        if cash < price:
            return {
                "ok": False,
                "error": f"❌ موجودی نقد شما کافی نیست!\nقیمت ملک: {price:,} سکه | موجودی نقد شما: {cash:,} سکه"
            }

        stats = db.get_or_create_rp_stats(platform, platform_user_id)
        # Deduct cash
        db.update_user_points(platform, platform_user_id, -price, is_increment=True)
        # Record asset
        db.add_rp_asset(stats["uid"], "property", property_key)
        # Increase citizen happiness
        db.update_rp_stats(stats["uid"], happiness=min(100, (stats.get("happiness", 100) or 100) + 15))

        return {
            "ok": True,
            "message": f"🏰 <b>سند مالکیت صادر شد!</b>\n\nتبریک! شما صاحب <b>{prop['name']}</b> شدید.\nسرمایه‌گذاری: {price:,} سکه\nسود ساعتی حاصل: +{prop['income']:,} سکه"
        }

    @classmethod
    def claim_property_income(cls, platform: str, platform_user_id: str) -> Dict[str, Any]:
        """Harvests accumulated rent/income from all owned properties."""
        stats = db.get_or_create_rp_stats(platform, platform_user_id)
        uid = stats["uid"]
        assets = db.get_rp_assets(uid)

        total_hourly = sum([cls.PROPERTIES.get(a["item_key"], {}).get("income", 0) for a in assets])
        if total_hourly == 0:
            return {"ok": False, "error": "شما هنوز هیچ ملکی که درآمد اجاره داشته باشد نخریده‌اید!"}

        now_ts = time.time()
        last_harvest = stats.get("last_income_time", 0) or 0
        if last_harvest == 0:
            last_harvest = now_ts - 3600  # Give at least 1 hour initial credit

        elapsed_seconds = now_ts - last_harvest
        if elapsed_seconds < 180:  # Minimum 3 minutes to claim
            wait_sec = int(180 - elapsed_seconds)
            return {"ok": False, "error": f"⏳ برای برداشت بعدی سود املاک {wait_sec} ثانیه دیگر برگردید."}

        # Calculate income (pro-rated per second based on hourly rate, capped at 24 hours)
        hours = min(24.0, elapsed_seconds / 3600.0)
        payout = int(round(total_hourly * hours))

        if payout <= 0:
            return {"ok": False, "error": "سود انباشته جدیدی برای برداشت وجود ندارد!"}

        db.update_rp_stats(uid, last_income_time=now_ts)
        db.update_user_points(platform, platform_user_id, payout, is_increment=True)

        return {
            "ok": True,
            "payout": payout,
            "hours": round(hours, 1),
            "message": f"💰 <b>سود املاک و مستغلات واریز شد!</b>\n\nمبلغ واریزی: <b>+{payout:,} سکه</b>\nمدت زمان محاسبه: {round(hours, 1)} ساعت\nنرخ کل ساعتی املاک: {total_hourly:,} سکه/ساعت"
        }

    # =========================================================================
    # D) Banking & Economy (Loans, Deposits, Transfers)
    # =========================================================================

    @classmethod
    def deposit_to_bank(cls, platform: str, platform_user_id: str, amount: int) -> Dict[str, Any]:
        """Deposits cash into the secure bank account."""
        if amount <= 0:
            return {"ok": False, "error": "مبلغ واریز باید بیشتر از صفر باشد!"}

        u = db.get_user(platform, platform_user_id) or {}
        cash = u.get("points", 0) or 0
        if cash < amount:
            return {"ok": False, "error": f"موجودی نقد کافی نیست! (نقد شما: {cash:,} سکه)"}

        stats = db.get_or_create_rp_stats(platform, platform_user_id)
        new_bank = (stats.get("bank_balance", 0) or 0) + amount

        db.update_user_points(platform, platform_user_id, -amount, is_increment=True)
        db.update_rp_stats(stats["uid"], bank_balance=new_bank)

        return {
            "ok": True,
            "message": f"🏦 <b>واریز به حساب بانکی با موفقیت انجام شد!</b>\n\nمبلغ: {amount:,} سکه\nموجودی جدید حساب: {new_bank:,} سکه"
        }

    @classmethod
    def withdraw_from_bank(cls, platform: str, platform_user_id: str, amount: int) -> Dict[str, Any]:
        """Withdraws money from the bank into cash wallet."""
        if amount <= 0:
            return {"ok": False, "error": "مبلغ برداشت باید بیشتر از صفر باشد!"}

        stats = db.get_or_create_rp_stats(platform, platform_user_id)
        current_bank = stats.get("bank_balance", 0) or 0
        if current_bank < amount:
            return {"ok": False, "error": f"موجودی حساب بانکی شما کافی نیست! (موجودی: {current_bank:,} سکه)"}

        new_bank = current_bank - amount
        db.update_rp_stats(stats["uid"], bank_balance=new_bank)
        db.update_user_points(platform, platform_user_id, amount, is_increment=True)

        return {
            "ok": True,
            "message": f"💵 <b>برداشت نقدی از خودپرداز با موفقیت انجام شد!</b>\n\nمبلغ برداشتی: {amount:,} سکه\nمانده حساب بانکی: {new_bank:,} سکه"
        }

    @classmethod
    def take_loan(cls, platform: str, platform_user_id: str, amount: int) -> Dict[str, Any]:
        """Grants a citizen loan based on level limit."""
        u = db.get_user(platform, platform_user_id) or {}
        stats = db.get_or_create_rp_stats(platform, platform_user_id)
        current_loan = stats.get("loan", 0) or 0

        if current_loan > 0:
            return {"ok": False, "error": f"شما در حال حاضر {current_loan:,} سکه وام تسویه نشده دارید! ابتدا آن را تسویه کنید."}

        level = u.get("level", 1) or 1
        max_loan = min(200000, level * 25000 + 10000)

        if amount <= 0 or amount > max_loan:
            return {"ok": False, "error": f"حداکثر سقف مجاز وام برای لول شما {max_loan:,} سکه است!"}

        debt = int(amount * 1.10)  # 10% bank interest fee
        db.update_rp_stats(stats["uid"], loan=debt, bank_balance=(stats.get("bank_balance", 0) or 0) + amount)

        return {
            "ok": True,
            "message": f"🏛 <b>تسهیلات بانکی تصویب شد!</b>\n\nمبلغ واریزی به حساب: {amount:,} سکه\nکل بازپرداخت اقساط (با ۱۰٪ سود): {debt:,} سکه"
        }

    @classmethod
    def repay_loan(cls, platform: str, platform_user_id: str, amount: int) -> Dict[str, Any]:
        """Repays active bank debt."""
        stats = db.get_or_create_rp_stats(platform, platform_user_id)
        current_loan = stats.get("loan", 0) or 0
        if current_loan <= 0:
            return {"ok": False, "error": "شما هیچ بدهی وامی به بانک ندارید!"}

        u = db.get_user(platform, platform_user_id) or {}
        cash = u.get("points", 0) or 0

        repay_amt = min(amount, current_loan)
        if cash < repay_amt:
            return {"ok": False, "error": f"موجودی نقد کافی نیست! (بدهی: {current_loan:,} | نقد شما: {cash:,})"}

        remaining_loan = current_loan - repay_amt
        db.update_user_points(platform, platform_user_id, -repay_amt, is_increment=True)
        db.update_rp_stats(stats["uid"], loan=remaining_loan)

        return {
            "ok": True,
            "message": f"✅ <b>پرداخت قسط وام با موفقیت ثبت شد!</b>\n\nمبلغ پرداختی: {repay_amt:,} سکه\nمانده بدهی: {remaining_loan:,} سکه"
        }

    @classmethod
    def transfer_money(cls, platform: str, sender_id: str, receiver_id: str, amount: int) -> Dict[str, Any]:
        """Direct card-to-card citizen transfer."""
        if str(sender_id) == str(receiver_id):
            return {"ok": False, "error": "نمی‌توانید به خودتان پول انتقال دهید!"}
        if amount <= 0:
            return {"ok": False, "error": "مبلغ انتقال نامعتبر است!"}

        sender = db.get_user(platform, sender_id)
        if not sender or (sender.get("points", 0) or 0) < amount:
            return {"ok": False, "error": "موجودی نقد شما کافی نیست!"}

        receiver = db.get_user(platform, receiver_id)
        if not receiver:
            return {"ok": False, "error": "کاربر مقصد در سیستم ثبت نشده است!"}

        db.update_user_points(platform, sender_id, -amount, is_increment=True)
        db.update_user_points(platform, receiver_id, amount, is_increment=True)

        return {
            "ok": True,
            "message": f"💳 <b>انتقال کارت به کارت با موفقیت انجام شد!</b>\n\nمبلغ: {amount:,} سکه\nبه کاربر: {receiver.get('first_name', receiver_id)}"
        }

    # =========================================================================
    # E) Underworld, Crime & Judiciary (Court & Bail)
    # =========================================================================

    @classmethod
    def commit_crime(cls, platform: str, platform_user_id: str, crime_key: str) -> Dict[str, Any]:
        """Simulates underworld criminal attempts with probability of arrest."""
        if crime_key not in cls.CRIMES:
            return {"ok": False, "error": "نوع جرم نامعتبر است!"}

        stats = db.get_or_create_rp_stats(platform, platform_user_id)
        uid = stats["uid"]
        now_ts = time.time()

        # Check jail
        if stats["jailed_until"] > now_ts:
            rem = int(stats["jailed_until"] - now_ts)
            return {"ok": False, "error": f"⛔️ شما در حال حاضر در زندان هستید! ({rem} ثانیه مانده)"}

        crime = cls.CRIMES[crime_key]
        energy = stats.get("energy", 100) or 100
        if energy < crime["req_energy"]:
            return {"ok": False, "error": f"انرژی کافی برای این عملیات ندارید! (نیاز: {crime['req_energy']}% | شما: {energy}%)"}

        new_energy = max(0, energy - crime["req_energy"])
        total_crimes = (stats.get("total_crimes", 0) or 0) + 1

        # Roll dice
        roll = random.random()
        win_chance = crime["win_chance"]

        if roll <= win_chance:
            # Success!
            loot = random.randint(crime["reward_min"], crime["reward_max"])
            success_crimes = (stats.get("successful_crimes", 0) or 0) + 1
            db.update_rp_stats(
                uid,
                energy=new_energy,
                total_crimes=total_crimes,
                successful_crimes=success_crimes,
                stress=min(100, (stats.get("stress", 0) or 0) + 15)
            )
            db.update_user_points(platform, platform_user_id, loot, is_increment=True)
            db.add_user_xp(platform, platform_user_id, crime["xp"])

            return {
                "ok": True,
                "success": True,
                "loot": loot,
                "message": (
                    f"🥷 <b>عملیات موفقیت‌آمیز بود!</b>\n\n"
                    f"مورد: {crime['name']}\n"
                    f"غنیمت مسروقه: <b>+{loot:,} سکه</b>\n"
                    f"تجربه خلاف: +{crime['xp']} XP\n"
                    f"<i>ردی از شما باقی نماند و پلیس دست‌خالی بازگشت!</i>"
                )
            }
        else:
            # Arrested! Sent to jail and fined
            jail_until = now_ts + crime["jail_seconds"]
            fine = crime["fine"]
            # Deduct fine from bank or cash
            db.update_user_points(platform, platform_user_id, -fine, is_increment=True)
            db.update_rp_stats(
                uid,
                energy=new_energy,
                total_crimes=total_crimes,
                jailed_until=jail_until,
                happiness=max(0, (stats.get("happiness", 100) or 100) - 25),
                stress=min(100, (stats.get("stress", 0) or 0) + 35)
            )

            mins = crime["jail_seconds"] // 60
            return {
                "ok": True,
                "success": False,
                "jail_minutes": mins,
                "fine": fine,
                "message": (
                    f"🚨 <b>دستگیر شدید! آژیرهای پلیس به صدا درآمدند!</b>\n\n"
                    f"شما حین <b>{crime['name']}</b> توسط گشت پلیس غافلگیر و بازداشت شدید.\n"
                    f"• حکم دادگاه: <b>{mins} دقیقه حبس در زندان مرکزی</b>\n"
                    f"• جریمه نقدی پرونده: <b>-{fine:,} سکه</b>\n\n"
                    f"<i>می‌توانید تا پایان مدت حبس صبر کرده یا با قرار وثیقه (Bail) آزاد شوید.</i>"
                )
            }

    @classmethod
    def pay_bail(cls, platform: str, platform_user_id: str) -> Dict[str, Any]:
        """Pays bail bond to immediately exit jail."""
        stats = db.get_or_create_rp_stats(platform, platform_user_id)
        now_ts = time.time()
        if stats["jailed_until"] <= now_ts:
            return {"ok": False, "error": "شما زندانی نیستید و نیازی به وثیقه ندارید!"}

        remaining_sec = int(stats["jailed_until"] - now_ts)
        # Bail price: 50 coins per second remaining
        bail_cost = max(1000, remaining_sec * 25)

        u = db.get_user(platform, platform_user_id) or {}
        cash = u.get("points", 0) or 0

        if cash < bail_cost:
            return {
                "ok": False,
                "error": f"❌ موجودی نقد کافی برای قرار وثیقه ندارید!\nمبلغ وثیقه: {bail_cost:,} سکه | نقد شما: {cash:,} سکه"
            }

        db.update_user_points(platform, platform_user_id, -bail_cost, is_increment=True)
        db.update_rp_stats(stats["uid"], jailed_until=0)

        return {
            "ok": True,
            "message": f"⚖️ <b>وثیقه آزادی پرداخت شد!</b>\n\nسند آزادی شما به مبلغ <b>{bail_cost:,} سکه</b> تایید شد و از زندان آزاد شدید."
        }

    # =========================================================================
    # F) Hospital & University (Health & Intelligence)
    # =========================================================================

    @classmethod
    def visit_hospital(cls, platform: str, platform_user_id: str) -> Dict[str, Any]:
        """Restores health and energy for a clinical fee."""
        cost = 1000
        u = db.get_user(platform, platform_user_id) or {}
        cash = u.get("points", 0) or 0

        if cash < cost:
            return {"ok": False, "error": f"هزینه ویزیت و بستری ۱,۰۰۰ سکه است. (موجودی شما: {cash:,})"}

        stats = db.get_or_create_rp_stats(platform, platform_user_id)
        db.update_user_points(platform, platform_user_id, -cost, is_increment=True)
        db.update_rp_stats(
            stats["uid"],
            health=100,
            energy=100,
            stress=0,
            hunger=0
        )

        return {
            "ok": True,
            "message": "🏥 <b>درمان با موفقیت انجام شد!</b>\n\nسلامت و انرژی شما به ۱۰۰٪ رسید و استرس به صفر کاهش یافت."
        }

    @classmethod
    def study_university(cls, platform: str, platform_user_id: str) -> Dict[str, Any]:
        """Studies a curriculum to increase intelligence (needed for higher jobs)."""
        cost = 1500
        u = db.get_user(platform, platform_user_id) or {}
        cash = u.get("points", 0) or 0

        if cash < cost:
            return {"ok": False, "error": f"شهریه دانشگاه ۱,۵۰۰ سکه است. (موجودی شما: {cash:,})"}

        stats = db.get_or_create_rp_stats(platform, platform_user_id)
        energy = stats.get("energy", 100) or 100
        if energy < 20:
            return {"ok": False, "error": "برای مطالعه به حداقل ۲۰٪ انرژی نیاز دارید!"}

        current_intel = stats.get("intelligence", 10) or 10
        new_intel = min(100, current_intel + 4)
        new_energy = max(0, energy - 20)

        db.update_user_points(platform, platform_user_id, -cost, is_increment=True)
        db.update_rp_stats(stats["uid"], intelligence=new_intel, energy=new_energy)
        db.add_user_xp(platform, platform_user_id, 15)

        return {
            "ok": True,
            "new_intel": new_intel,
            "message": f"🎓 <b>یک ترم تحصیلی گذرانده شد!</b>\n\n• سطح هوش و تخصص شما: <b>{new_intel}</b> (+4)\n• کسب تجربه: +15 XP"
        }

    # =========================================================================
    # G) City Governance & Mayor (Groups)
    # =========================================================================

    @classmethod
    def get_city_dashboard(cls, chat_id: str) -> Dict[str, Any]:
        """Retrieves group city government parameters."""
        city = db.get_or_create_rp_city(chat_id)
        mayor_name = "بدون شهردار (تعیین با انتخابات)"
        if city.get("mayor_id"):
            mayor_name = f"شهروند #{city['mayor_id']}"
        return {
            "name": city.get("name", "شهر آرمانی"),
            "mayor": mayor_name,
            "budget": city.get("budget", 100000),
            "score": city.get("score", 10),
            "tax_rate": city.get("tax_rate", 0.05),
        }

    @classmethod
    def donate_to_city(cls, platform: str, platform_user_id: str, chat_id: str, amount: int) -> Dict[str, Any]:
        """Donates to group city municipal treasury to improve score."""
        if amount <= 0:
            return {"ok": False, "error": "مبلغ نامعتبر است!"}

        u = db.get_user(platform, platform_user_id) or {}
        cash = u.get("points", 0) or 0
        if cash < amount:
            return {"ok": False, "error": f"موجودی نقد کافی نیست! (شما: {cash:,})"}

        city = db.get_or_create_rp_city(chat_id)
        new_budget = (city.get("budget", 0) or 0) + amount
        score_gain = max(1, amount // 5000)
        new_score = (city.get("score", 0) or 0) + score_gain

        db.update_user_points(platform, platform_user_id, -amount, is_increment=True)
        db.update_rp_city(chat_id, budget=new_budget, score=new_score)

        return {
            "ok": True,
            "message": f"🏛 <b>کمک به شهرداری ثبت شد!</b>\n\nمبلغ: {amount:,} سکه\nبودجه جدید شهر: {new_budget:,} سکه\nامتیاز توسعه شهر: {new_score} (+{score_gain})"
        }
