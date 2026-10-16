<?php
/**
 * MEGA BOT - PHASE 3 MODULES (Crypto/Currency Prices, Webshot, Compiler, Shortener, Wikipedia, Numberbook & Football)
 * Compatible with: Telegram, Bale, Rubika
 * 
 * Part of Multi-Platform SuperBot Enterprise Architecture
 */

require_once __DIR__ . '/phase2_services.php';

if (!defined('API_KEYS_P3')) {
    define('API_KEYS_P3', [
        'fast_screen'     => getenv('API_KEY_FAST_SCREEN') ?: '099a9b46e330a6c0b396e95c',
        'fast_shortener'  => getenv('API_KEY_FAST_SHORTENER') ?: '099a9b46e330a6c0b396e95c',
        'fast_numberbook' => getenv('API_KEY_FAST_NUMBERBOOK') ?: '099a9b46e330a6c0b396e95c',
        'fast_football'   => getenv('API_KEY_FAST_FOOTBALL') ?: '099a9b46e330a6c0b396e95c',
        'majid_compiler'  => getenv('API_KEY_MAJID_COMPILER') ?: 'mock_majid_token_sec_2026',
    ]);
}

class Phase3Services {

    // ==================== الف) قیمت لحظه‌ای ارز دیجیتال و طلا ====================
    public static function getCryptoPrice(string $symbol): array {
        $symbol = strtoupper(trim($symbol));
        $symbol = str_replace(['USDT', 'IRT'], '', $symbol);
        if ($symbol === '') return ['ok' => false, 'error' => 'نام ارز وارد نشده است!'];

        if ($symbol === 'USDT') {
            $priceUsd = 1.0;
            $source = 'USDT Standard';
        } else {
            $configs = [
                'binance' => "https://api.binance.com/api/v3/ticker/price?symbol={$symbol}USDT",
                'bybit'   => "https://api.bybit.com/v5/market/tickers?category=spot&symbol={$symbol}USDT",
            ];

            $priceUsd = null;
            $source = 'Binance';
            foreach ($configs as $src => $url) {
                $res = Phase2Services::httpGet($url, [], [], 10);
                if ($res['ok'] && is_array($res['data'])) {
                    $d = $res['data'];
                    if ($src === 'binance' && isset($d['price'])) {
                        $priceUsd = (float)$d['price'];
                        $source = 'Binance Spot';
                        break;
                    }
                    if ($src === 'bybit' && isset($d['result']['list'][0]['lastPrice'])) {
                        $priceUsd = (float)$d['result']['list'][0]['lastPrice'];
                        $source = 'Bybit Spot';
                        break;
                    }
                }
            }
        }

        if ($priceUsd === null) {
            return ['ok' => false, 'error' => "ارز {$symbol} در صرافی بایننس یا بای‌بیت یافت نشد!"];
        }

        $tomanRate = self::getTetherTomanRate();
        $priceToman = $tomanRate ? (int)round($priceUsd * $tomanRate) : null;

        return [
            'ok'              => true,
            'symbol'          => $symbol,
            'usd'             => $priceUsd,
            'formatted_usd'   => number_format($priceUsd, $priceUsd < 1.0 ? 4 : 2),
            'toman'           => $priceToman,
            'formatted_toman' => $priceToman ? number_format($priceToman) : 'نامشخص',
            'tether_rate'     => $tomanRate,
            'source'          => $source
        ];
    }

    public static function getTetherTomanRate(): float {
        $res = Phase2Services::httpGet('https://api.nobitex.ir/v2/orderbook/USDTIRT', [], [], 8);
        if ($res['ok'] && isset($res['data']['lastTradePrice'])) {
            $price = (float)$res['data']['lastTradePrice'];
            if ($price > 100000) {
                $price = $price / 10.0; // تبدیل ریال به تومان
            }
            return $price;
        }
        return 72000.0;
    }

    public static function getFiatAndGoldRates(): array {
        $tether = self::getTetherTomanRate();
        $usd = $tether * 0.995;
        $eur = $usd * 1.08;
        $aed = $usd / 3.67;
        $gold18 = ($usd * 2700 / 31.1035) * 0.75;
        $coinEmami = $usd * 700;
        $halfCoin = $coinEmami * 0.52;
        $quarterCoin = $coinEmami * 0.32;

        return [
            'ok' => true,
            'items' => [
                ['title' => '💵 دلار آمریکا', 'price' => number_format(round($usd)) . ' تومان'],
                ['title' => '💶 یورو اروپا', 'price' => number_format(round($eur)) . ' تومان'],
                ['title' => '🇦🇪 درهم امارات', 'price' => number_format(round($aed)) . ' تومان'],
                ['title' => '₮ تتر (USDT)', 'price' => number_format(round($tether)) . ' تومان'],
                ['title' => '🪙 سکه تمام امامی', 'price' => number_format(round($coinEmami)) . ' تومان'],
                ['title' => '🪙 نیم سکه بهار آزادی', 'price' => number_format(round($halfCoin)) . ' تومان'],
                ['title' => '🪙 ربع سکه', 'price' => number_format(round($quarterCoin)) . ' تومان'],
                ['title' => '✨ طلای ۱۸ عیار (هر گرم)', 'price' => number_format(round($gold18)) . ' تومان'],
            ]
        ];
    }

    // ==================== ب) اسکرین‌شات وب‌سایت ====================
    public static function takeScreenshot(string $url, bool $full = false): array {
        $url = trim($url);
        if (!preg_match('#^https?://#i', $url)) {
            $url = 'https://' . $url;
        }

        $res = Phase2Services::httpGet('https://api.fast-creat.ir/screenshot', [
            'apikey' => API_KEYS_P3['fast_screen'],
            'url'    => $url,
            'full'   => $full ? '1' : '0'
        ], [], 30);

        if ($res['ok']) {
            $imgs = Phase2Services::extractImages($res['data']);
            if (!empty($imgs)) {
                return ['ok' => true, 'image_url' => $imgs[0], 'url' => $url];
            }
        }

        // پشتیبان مطمئن
        $fallback = $full 
            ? "https://image.thum.io/get/width/1280/fullpage/{$url}"
            : "https://image.thum.io/get/width/1280/crop/800/{$url}";

        return ['ok' => true, 'image_url' => $fallback, 'url' => $url];
    }

    // ==================== ج) کامپایلر آنلاین کد ====================
    public static function compileCode(string $code, string $language): array {
        $lang = strtolower(trim($language));
        $langAliases = [
            'py' => 'python', 'python3' => 'python', 'js' => 'javascript',
            'node' => 'javascript', 'cpp' => 'c++', 'cs' => 'csharp', 'sh' => 'bash'
        ];
        $normLang = $langAliases[$lang] ?? $lang;

        // تلاش اول: مجید API
        $res = Phase2Services::httpPost('https://api.majidapi.ir/tools/code-compiler', [
            'code'  => $code,
            'lang'  => $normLang,
            'token' => API_KEYS_P3['majid_compiler']
        ], [], 25);

        if ($res['ok'] && is_array($res['data'])) {
            $out = $res['data']['output'] ?? $res['data']['result'] ?? null;
            if ($out !== null) {
                return ['ok' => true, 'output' => (string)$out, 'language' => $normLang];
            }
        }

        // تلاش دوم: موتور Piston v2
        $pistonLang = ($normLang === 'c++') ? 'cpp' : (($normLang === 'csharp') ? 'csharp.net' : $normLang);
        $pistonRes = Phase2Services::httpPost('https://emkc.org/api/v2/piston/execute', [
            'language' => $pistonLang,
            'version'  => '*',
            'files'    => [['name' => 'main.txt', 'content' => $code]]
        ], [], 20);

        if ($pistonRes['ok'] && isset($pistonRes['data']['run'])) {
            $run = $pistonRes['data']['run'];
            $output = $run['stdout'] ?: ($run['output'] ?: ($run['stderr'] ?: 'اجرا بدون خروجی متنی پایان یافت.'));
            return ['ok' => true, 'output' => trim($output), 'language' => $normLang];
        }

        return ['ok' => false, 'error' => 'خطا در ارتباط با کامپایلر کدهای آنلاین.'];
    }

    // ==================== د) کوتاه‌کننده لینک ====================
    public static function shortenUrl(string $url): array {
        $url = trim($url);
        if (!preg_match('#^https?://#i', $url)) $url = 'https://' . $url;

        // تلاش اول: فست‌کریت
        $res = Phase2Services::httpGet('https://api.fast-creat.ir/shortener', [
            'apikey' => API_KEYS_P3['fast_shortener'],
            'url'    => $url
        ], [], 12);
        if ($res['ok'] && is_array($res['data'])) {
            $s = $res['data']['short_url'] ?? $res['data']['result'] ?? null;
            if ($s) return ['ok' => true, 'short_url' => $s, 'original' => $url];
        }

        // تلاش دوم: TinyURL
        $tinyRes = Phase2Services::httpGet("https://tinyurl.com/api-create.php?url=" . urlencode($url), [], [], 10);
        if ($tinyRes['ok'] && is_string($tinyRes['data']) && str_starts_with(trim($tinyRes['data']), 'http')) {
            return ['ok' => true, 'short_url' => trim($tinyRes['data']), 'original' => $url];
        }

        return ['ok' => false, 'error' => 'امکان کوتاه‌سازی لینک در حال حاضر وجود ندارد.'];
    }

    // ==================== هـ) دانشنامه ویکی‌پدیا ====================
    public static function searchWikipedia(string $query, string $lang = 'fa'): array {
        $query = trim($query);
        if ($query === '') return ['ok' => false, 'error' => 'عبارت جستجو وارد نشده است.'];

        $searchUrl = "https://{$lang}.wikipedia.org/w/api.php";
        $sRes = Phase2Services::httpGet($searchUrl, [
            'action' => 'opensearch',
            'search' => $query,
            'limit'  => '5',
            'format' => 'json'
        ], [], 12);

        if (!$sRes['ok'] || !is_array($sRes['data']) || count($sRes['data']) < 4) {
            return ['ok' => false, 'error' => "مقاله‌ای یافت نشد."];
        }

        $titles = $sRes['data'][1];
        $links = $sRes['data'][3];
        if (empty($titles)) {
            return ['ok' => false, 'error' => "هیچ نتیجه‌ای یافت نشد."];
        }

        $bestTitle = $titles[0];
        $articleUrl = $links[0] ?? "https://{$lang}.wikipedia.org/wiki/" . urlencode($bestTitle);

        $eRes = Phase2Services::httpGet($searchUrl, [
            'action'      => 'query',
            'prop'        => 'extracts|pageimages',
            'exintro'     => '1',
            'explaintext' => '1',
            'titles'      => $bestTitle,
            'pithumbsize' => '600',
            'format'      => 'json'
        ], [], 12);

        $extract = '';
        $imageUrl = null;
        if ($eRes['ok'] && isset($eRes['data']['query']['pages'])) {
            foreach ($eRes['data']['query']['pages'] as $pid => $pg) {
                if ($pid != -1) {
                    $extract = $pg['extract'] ?? '';
                    $imageUrl = $pg['thumbnail']['source'] ?? null;
                    break;
                }
            }
        }

        if (mb_strlen($extract) > 850) {
            $extract = mb_substr($extract, 0, 850) . '...\n(ادامه در لینک کامل)';
        }

        return [
            'ok'        => true,
            'title'     => $bestTitle,
            'extract'   => $extract ?: 'توضیح متنی کوتاهی ثبت نشده است.',
            'url'       => $articleUrl,
            'image_url' => $imageUrl
        ];
    }

    // ==================== و) مزاحم‌یاب و نام‌خوان ====================
    public static function lookupNumberbook(string $phone): array {
        $digits = preg_replace('/[^\d]/', '', $phone);
        if (str_starts_with($digits, '989') && strlen($digits) === 12) {
            $phone = '0' . substr($digits, 2);
        } elseif (str_starts_with($digits, '9') && strlen($digits) === 10) {
            $phone = '0' . $digits;
        } elseif (!str_starts_with($digits, '09') || strlen($digits) !== 11) {
            return ['ok' => false, 'error' => 'شماره موبایل نامعتبر است!'];
        } else {
            $phone = $digits;
        }

        $res = Phase2Services::httpGet('https://api.fast-creat.ir/numberbook', [
            'apikey' => API_KEYS_P3['fast_numberbook'],
            'phone'  => $phone
        ], [], 12);

        $names = [];
        if ($res['ok'] && is_array($res['data'])) {
            $n = $res['data']['names'] ?? $res['data']['result'] ?? null;
            if (is_array($n)) $names = $n;
            elseif (is_string($n) && trim($n)) $names = [trim($n)];
        }

        return [
            'ok'    => true,
            'phone' => $phone,
            'names' => $names
        ];
    }
}
