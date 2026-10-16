<?php
/**
 * MEGA BOT - PHASE 4 MODULES (Life RP: Career, Economy, Assets, Family, City & Judiciary)
 * Compatible with: Telegram, Bale, Rubika
 * 
 * Part of Multi-Platform SuperBot Enterprise Architecture
 */

class LifeRPServices {

    // 1. جدول مشاغل بازی (Career Catalog)
    public static array $jobs = [
        'worker'    => ['name' => 'کارگر', 'min_level' => 0, 'min_intel' => 0, 'pay' => 1200, 'energy' => 20, 'xp' => 5, 'desc' => 'کارگر ساده ساختمانی و کارگاهی'],
        'seller'    => ['name' => 'فروشنده', 'min_level' => 0, 'min_intel' => 5, 'pay' => 1800, 'energy' => 15, 'xp' => 8, 'desc' => 'فروشنده در هایپرمارکت و بوتیک'],
        'driver'    => ['name' => 'راننده', 'min_level' => 1, 'min_intel' => 8, 'pay' => 2200, 'energy' => 25, 'xp' => 10, 'desc' => 'راننده تاکسی شهری و اسنپ'],
        'cook'      => ['name' => 'آشپز', 'min_level' => 1, 'min_intel' => 10, 'pay' => 2500, 'energy' => 20, 'xp' => 10, 'desc' => 'سرآشپز رستوران معتبر'],
        'teacher'   => ['name' => 'معلم', 'min_level' => 2, 'min_intel' => 15, 'pay' => 3200, 'energy' => 18, 'xp' => 14, 'desc' => 'معلم آموزش و پرورش و مدرس'],
        'nurse'     => ['name' => 'پرستار', 'min_level' => 2, 'min_intel' => 18, 'pay' => 3600, 'energy' => 25, 'xp' => 15, 'desc' => 'پرستار کادر درمان بیمارستان'],
        'engineer'  => ['name' => 'مهندس', 'min_level' => 3, 'min_intel' => 25, 'pay' => 5200, 'energy' => 22, 'xp' => 20, 'desc' => 'مهندس ناظر عمران و معماری'],
        'developer' => ['name' => 'برنامه‌نویس', 'min_level' => 4, 'min_intel' => 35, 'pay' => 7000, 'energy' => 20, 'xp' => 25, 'desc' => 'توسعه‌دهنده نرم‌افزار فول‌استک'],
        'doctor'    => ['name' => 'پزشک', 'min_level' => 5, 'min_intel' => 50, 'pay' => 9500, 'energy' => 30, 'xp' => 30, 'desc' => 'پزشک متخصص درمانگاه و جراح'],
        'manager'   => ['name' => 'مدیر', 'min_level' => 5, 'min_intel' => 60, 'pay' => 11000, 'energy' => 25, 'xp' => 30, 'desc' => 'مدیر ارشد هلدینگ تجاری'],
        'investor'  => ['name' => 'سرمایه‌گذار', 'min_level' => 6, 'min_intel' => 75, 'pay' => 15000, 'energy' => 15, 'xp' => 35, 'desc' => 'سرمایه‌گذار فرشته و عضو بورس'],
    ];

    // 2. جدول املاک و مستغلات (Real Estate Catalog)
    public static array $properties = [
        'land_small' => ['name' => 'زمین کوچک', 'price' => 80000, 'income' => 0, 'desc' => 'زمین در حومه شهر با آینده درخشان'],
        'apartment'  => ['name' => 'آپارتمان مسکونی', 'price' => 250000, 'income' => 400, 'desc' => 'واحد مسکونی با اجاره ساعتی ۴۰۰ سکه'],
        'house'      => ['name' => 'خانه ویلایی لوکس', 'price' => 600000, 'income' => 900, 'desc' => 'ویلای مجهز با درآمد ساعتی ۹۰۰ سکه'],
        'shop'       => ['name' => 'مغازه تجاری پرتردد', 'price' => 350000, 'income' => 700, 'desc' => 'کسب‌وکار تجاری با بازدهی ساعتی ۷۰۰ سکه'],
        'factory'    => ['name' => 'کارخانه صنعتی مدرن', 'price' => 3000000, 'income' => 5000, 'desc' => 'مجموعه صنعتی تولیدی با سود ساعتی ۵,۰۰۰ سکه'],
    ];

    // 3. جرایم و دنیای زیرزمینی (Crimes Catalog)
    public static array $crimes = [
        'pickpocket' => [
            'name'         => 'جیب‌بری در مترو',
            'req_energy'   => 15,
            'win_chance'   => 0.70,
            'reward_min'   => 600,
            'reward_max'   => 2200,
            'jail_seconds' => 180,
            'fine'         => 1200,
            'xp'           => 8
        ],
        'shoplift' => [
            'name'         => 'دستبرد به مغازه طلافروشی',
            'req_energy'   => 25,
            'win_chance'   => 0.50,
            'reward_min'   => 3500,
            'reward_max'   => 9000,
            'jail_seconds' => 420,
            'fine'         => 4500,
            'xp'           => 20
        ],
        'bank_heist' => [
            'name'         => 'هک و سرقت از بانک مرکزی شهر',
            'req_energy'   => 45,
            'win_chance'   => 0.30,
            'reward_min'   => 18000,
            'reward_max'   => 65000,
            'jail_seconds' => 900,
            'fine'         => 25000,
            'xp'           => 60
        ]
    ];

    private static ?PDO $pdo = null;

    private static function db(): PDO {
        if (self::$pdo === null) {
            $dbPath = __DIR__ . '/../superbot_python/database/superbot.db';
            self::$pdo = new PDO("sqlite:" . $dbPath);
            self::$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            self::$pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
        }
        return self::$pdo;
    }

    public static function initTables(): void {
        $pdo = self::db();
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS rp_stats (
                uid TEXT PRIMARY KEY,
                platform TEXT NOT NULL DEFAULT 'telegram',
                platform_user_id TEXT NOT NULL,
                age INTEGER DEFAULT 18,
                energy INTEGER DEFAULT 100,
                health INTEGER DEFAULT 100,
                happiness INTEGER DEFAULT 100,
                stress INTEGER DEFAULT 0,
                hunger INTEGER DEFAULT 0,
                sleep INTEGER DEFAULT 100,
                intelligence INTEGER DEFAULT 10,
                job TEXT DEFAULT NULL,
                bank_balance INTEGER DEFAULT 5000,
                loan INTEGER DEFAULT 0,
                jailed_until REAL DEFAULT 0,
                partner_uid TEXT DEFAULT NULL,
                total_crimes INTEGER DEFAULT 0,
                successful_crimes INTEGER DEFAULT 0,
                last_work_time REAL DEFAULT 0,
                last_income_time REAL DEFAULT 0
            );
            CREATE TABLE IF NOT EXISTS rp_assets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                uid TEXT NOT NULL,
                type TEXT NOT NULL,
                item_key TEXT NOT NULL,
                purchased_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS rp_cities (
                chat_id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                mayor_id TEXT DEFAULT NULL,
                budget INTEGER DEFAULT 100000,
                score INTEGER DEFAULT 10,
                tax_rate REAL DEFAULT 0.05
            );
            CREATE TABLE IF NOT EXISTS rp_marriages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user1_uid TEXT NOT NULL,
                user2_uid TEXT NOT NULL,
                dowry INTEGER DEFAULT 1000,
                married_at TEXT NOT NULL,
                status TEXT DEFAULT 'active'
            );
        ");
    }

    // ==================== الف) کارت شهروندی و وضعیت ====================
    public static function getStats(string $uid, string $platform = 'telegram', string $pUserId = ''): array {
        self::initTables();
        $stmt = self::db()->prepare("SELECT * FROM rp_stats WHERE uid = ?");
        $stmt->execute([$uid]);
        $row = $stmt->fetch();
        if ($row) {
            return $row;
        }

        // ایجاد رکورد اولیه
        $pUserId = $pUserId ?: $uid;
        $ins = self::db()->prepare("
            INSERT INTO rp_stats (uid, platform, platform_user_id)
            VALUES (?, ?, ?)
        ");
        $ins->execute([$uid, $platform, $pUserId]);

        $stmt->execute([$uid]);
        return $stmt->fetch();
    }

    // ==================== ب) اشتغال و شیفت کاری ====================
    public static function applyJob(string $uid, string $jobKey, int $userLevel = 1): array {
        if (!isset(self::$jobs[$jobKey])) {
            return ['ok' => false, 'error' => 'شغل انتخابی نامعتبر است!'];
        }
        $stats = self::getStats($uid);
        if ($stats['jailed_until'] > time()) {
            return ['ok' => false, 'error' => 'شما در زندان هستید و امکان استخدام ندارید!'];
        }

        $job = self::$jobs[$jobKey];
        if ($userLevel < $job['min_level']) {
            return ['ok' => false, 'error' => "سطح شما کافی نیست! (حداقل سطح: {$job['min_level']})"];
        }
        if (($stats['intelligence'] ?? 10) < ($job['min_intel'] ?? 0)) {
            return ['ok' => false, 'error' => "هوش شما کافی نیست! در دانشگاه مطالعه کنید."];
        }

        $stmt = self::db()->prepare("UPDATE rp_stats SET job = ? WHERE uid = ?");
        $stmt->execute([$jobKey, $uid]);

        return [
            'ok'      => true,
            'message' => "شما به عنوان {$job['name']} با دستمزد {$job['pay']} استخدام شدید."
        ];
    }

    public static function doWork(string $uid): array {
        $stats = self::getStats($uid);
        $now = time();

        if ($stats['jailed_until'] > $now) {
            $rem = (int)($stats['jailed_until'] - $now);
            return ['ok' => false, 'error' => "شما در زندان هستید! ({$rem} ثانیه مانده)"];
        }

        $jobKey = $stats['job'];
        if (!$jobKey || !isset(self::$jobs[$jobKey])) {
            return ['ok' => false, 'error' => 'شما هنوز شغلی ندارید!'];
        }

        $job = self::$jobs[$jobKey];
        if ($stats['energy'] < $job['energy']) {
            return ['ok' => false, 'error' => "انرژی کافی ندارید! (نیاز: {$job['energy']} | موجود: {$stats['energy']})"];
        }

        if (($now - ($stats['last_work_time'] ?? 0)) < 60) {
            $wait = 60 - ($now - $stats['last_work_time']);
            return ['ok' => false, 'error' => "لطفاً {$wait} ثانیه دیگر برای شیفت کاری صبر کنید."];
        }

        $newEnergy = max(0, $stats['energy'] - $job['energy']);
        $newStress = min(100, $stats['stress'] + 8);
        $newHunger = min(100, $stats['hunger'] + 12);

        $up = self::db()->prepare("
            UPDATE rp_stats
            SET energy = ?, stress = ?, hunger = ?, last_work_time = ?
            WHERE uid = ?
        ");
        $up->execute([$newEnergy, $newStress, $newHunger, $now, $uid]);

        return [
            'ok'         => true,
            'wage'       => $job['pay'],
            'xp'         => $job['xp'],
            'new_energy' => $newEnergy,
            'job_name'   => $job['name']
        ];
    }

    // ==================== ج) املاک و درآمد دوره‌ای ====================
    public static function buyProperty(string $uid, string $propertyKey, int &$userBalance): array {
        if (!isset(self::$properties[$propertyKey])) {
            return ['ok' => false, 'error' => 'ملک نامعتبر است!'];
        }
        $prop = self::$properties[$propertyKey];
        if ($userBalance < $prop['price']) {
            return ['ok' => false, 'error' => 'موجودی نقد کافی نیست!'];
        }

        $userBalance -= $prop['price'];
        $nowStr = date('c');

        $ins = self::db()->prepare("
            INSERT INTO rp_assets (uid, type, item_key, purchased_at)
            VALUES (?, 'property', ?, ?)
        ");
        $ins->execute([$uid, $propertyKey, $nowStr]);

        return [
            'ok'      => true,
            'message' => "شما سند {$prop['name']} را خریداری کردید. سود ساعتی: +{$prop['income']} سکه"
        ];
    }

    public static function claimPropertyIncome(string $uid): array {
        $stats = self::getStats($uid);
        $stmt = self::db()->prepare("SELECT item_key FROM rp_assets WHERE uid = ? AND type = 'property'");
        $stmt->execute([$uid]);
        $assets = $stmt->fetchAll();

        $totalHourly = 0;
        foreach ($assets as $a) {
            $totalHourly += self::$properties[$a['item_key']]['income'] ?? 0;
        }

        if ($totalHourly <= 0) {
            return ['ok' => false, 'error' => 'شما ملکی با بازدهی اجاره ندارید!'];
        }

        $now = time();
        $last = $stats['last_income_time'] ?: ($now - 3600);
        $elapsed = $now - $last;

        if ($elapsed < 180) {
            $wait = 180 - $elapsed;
            return ['ok' => false, 'error' => "برداشت بعدی سود املاک پس از {$wait} ثانیه امکان‌پذیر است."];
        }

        $hours = min(24.0, $elapsed / 3600.0);
        $payout = (int)round($totalHourly * $hours);

        $up = self::db()->prepare("UPDATE rp_stats SET last_income_time = ? WHERE uid = ?");
        $up->execute([$now, $uid]);

        return [
            'ok'     => true,
            'payout' => $payout,
            'hours'  => round($hours, 1)
        ];
    }

    // ==================== د) جرایم، زندان و وثیقه ====================
    public static function commitCrime(string $uid, string $crimeKey): array {
        if (!isset(self::$crimes[$crimeKey])) {
            return ['ok' => false, 'error' => 'نوع جرم نامعتبر است!'];
        }
        $stats = self::getStats($uid);
        $now = time();

        if ($stats['jailed_until'] > $now) {
            $rem = (int)($stats['jailed_until'] - $now);
            return ['ok' => false, 'error' => "شما در زندان هستید! ({$rem} ثانیه مانده)"];
        }

        $crime = self::$crimes[$crimeKey];
        if ($stats['energy'] < $crime['req_energy']) {
            return ['ok' => false, 'error' => "انرژی کافی ندارید!"];
        }

        $newEnergy = max(0, $stats['energy'] - $crime['req_energy']);
        $totalCrimes = $stats['total_crimes'] + 1;
        $chance = mt_rand(1, 100) / 100.0;

        if ($chance <= $crime['win_chance']) {
            $loot = mt_rand($crime['reward_min'], $crime['reward_max']);
            $succ = $stats['successful_crimes'] + 1;
            $up = self::db()->prepare("
                UPDATE rp_stats
                SET energy = ?, total_crimes = ?, successful_crimes = ?
                WHERE uid = ?
            ");
            $up->execute([$newEnergy, $totalCrimes, $succ, $uid]);

            return [
                'ok'      => true,
                'success' => true,
                'loot'    => $loot,
                'xp'      => $crime['xp']
            ];
        } else {
            $jailedUntil = $now + $crime['jail_seconds'];
            $up = self::db()->prepare("
                UPDATE rp_stats
                SET energy = ?, total_crimes = ?, jailed_until = ?
                WHERE uid = ?
            ");
            $up->execute([$newEnergy, $totalCrimes, $jailedUntil, $uid]);

            return [
                'ok'           => true,
                'success'      => false,
                'jail_minutes' => (int)($crime['jail_seconds'] / 60),
                'fine'         => $crime['fine']
            ];
        }
    }

    public static function payBail(string $uid, int &$userBalance): array {
        $stats = self::getStats($uid);
        $now = time();
        if ($stats['jailed_until'] <= $now) {
            return ['ok' => false, 'error' => 'شما زندانی نیستید!'];
        }

        $rem = (int)($stats['jailed_until'] - $now);
        $bail = max(1000, $rem * 25);

        if ($userBalance < $bail) {
            return ['ok' => false, 'error' => "موجودی برای وثیقه کافی نیست! (مبلغ: {$bail} سکه)"];
        }

        $userBalance -= $bail;
        $up = self::db()->prepare("UPDATE rp_stats SET jailed_until = 0 WHERE uid = ?");
        $up->execute([$uid]);

        return [
            'ok'        => true,
            'bail_paid' => $bail,
            'message'   => "وثیقه به مبلغ {$bail} سکه پرداخت شد و از زندان آزاد شدید."
        ];
    }
}
