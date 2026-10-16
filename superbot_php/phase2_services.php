<?php
/**
 * MEGA BOT - PHASE 2 MODULES (AI, Vision, Media Downloaders, Shazam & OCR)
 * Compatible with: Telegram, Bale, Rubika
 * 
 * Part of Multi-Platform SuperBot Enterprise Architecture
 */

// Load API Keys if not defined
if (!defined('API_KEYS')) {
    define('API_KEYS', [
        'fast_gpt_chat' => getenv('API_KEY_FAST_GPT_CHAT') ?: '099a9b46e330a6c0b396e95c',
        'fast_gpt4'     => getenv('API_KEY_FAST_GPT4') ?: '099a9b46e330a6c0b396e95c',
        'fast_blackbox' => getenv('API_KEY_FAST_BLACKBOX') ?: '099a9b46e330a6c0b396e95c',
        'fast_photo'    => getenv('API_KEY_FAST_PHOTO') ?: '099a9b46e330a6c0b396e95c',
        'fast_ghibli'   => getenv('API_KEY_FAST_GHIBLI') ?: '099a9b46e330a6c0b396e95c',
        'fast_quality'  => getenv('API_KEY_FAST_QUALITY') ?: '099a9b46e330a6c0b396e95c',
        'fast_logo'     => getenv('API_KEY_FAST_LOGO') ?: '099a9b46e330a6c0b396e95c',
        'fast_ig'       => getenv('API_KEY_FAST_IG') ?: '099a9b46e330a6c0b396e95c',
        'fast_youtube'  => getenv('API_KEY_FAST_YOUTUBE') ?: '099a9b46e330a6c0b396e95c',
        'fast_spotify'  => getenv('API_KEY_FAST_SPOTIFY') ?: '099a9b46e330a6c0b396e95c',
        'fast_rj'       => getenv('API_KEY_FAST_RJ') ?: '099a9b46e330a6c0b396e95c',
        'majid_token'   => getenv('API_KEY_MAJID_TOKEN') ?: 'mock_majid_token_sec_2026',
        'ocr_space'     => getenv('API_KEY_OCR_SPACE') ?: 'helloworld',
    ]);
}

class Phase2Services {
    
    // متد کمکی برای ارسال درخواست‌های HTTP GET
    public static function httpGet(string $url, array $params = [], array $headers = [], int $timeout = 60): array {
        if (!empty($params)) {
            $qs = [];
            foreach ($params as $k => $v) {
                if ($v !== null && $v !== '') {
                    $qs[] = rawurlencode((string)$k) . '=' . rawurlencode((string)$v);
                }
            }
            $url .= (strpos($url, '?') === false ? '?' : '&') . implode('&', $qs);
        }
        $ch = curl_init($url);
        $defaultHeaders = ['User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0'];
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CONNECTTIMEOUT => 15,
            CURLOPT_TIMEOUT        => $timeout,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_HTTPHEADER     => array_merge($defaultHeaders, $headers)
        ]);
        $res = curl_exec($ch);
        $err = curl_error($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($res === false || $code >= 400) {
            return ['ok' => false, 'error' => $err ?: "HTTP Error $code"];
        }
        $decoded = json_decode($res, true);
        return ['ok' => true, 'data' => is_array($decoded) ? $decoded : trim($res)];
    }

    // استخراج هوشمند لینک‌های تصویر از پاسخ‌های مختلف API
    public static function extractImages($data): array {
        $results = [];
        if (is_string($data) && strpos(trim($data), 'http') === 0) {
            return [trim($data)];
        }
        if (isset($data['result']) && is_array($data['result'])) {
            $data = $data['result'];
        }
        $walker = function ($node) use (&$walker, &$results) {
            if (is_array($node)) {
                foreach ($node as $v) $walker($v);
                return;
            }
            if (is_string($node)) {
                $val = trim($node);
                if (strpos($val, 'http') === 0 && !preg_match('~\.(mp3|mp4|wav)(\?|$)~i', $val)) {
                    $results[] = $val;
                }
            }
        };
        $walker($data);
        return array_values(array_unique($results));
    }

    // استخراج هوشمند تمام لینک‌ها (ویدیو/موزیک) از پاسخ API
    public static function extractLinks($data): array {
        $links = [];
        $walker = function ($node) use (&$walker, &$links) {
            if (is_array($node)) {
                foreach ($node as $v) $walker($v);
                return;
            }
            if (is_string($node) && strpos(trim($node), 'http') === 0) {
                $links[] = trim($node);
            }
        };
        $walker($data);
        return array_values(array_unique($links));
    }

    // ==================== الف) سرویس‌های هوش مصنوعی (AI) ====================
    public static function chatAI(string $prompt, string $model = 'gpt'): string {
        $urls = [
            'gpt'      => 'https://api.fast-creat.ir/gpt/chat',
            'gpt4'     => 'https://api.fast-creat.ir/gpt/gpt4',
            'deepseek' => 'https://api.fast-creat.ir/deepseek',
            'grok'     => 'https://api.fast-creat.ir/grokai',
            'blackbox' => 'https://api.fast-creat.ir/blackbox',
        ];
        $keys = [
            'gpt'      => API_KEYS['fast_gpt_chat'],
            'gpt4'     => API_KEYS['fast_gpt4'],
            'deepseek' => API_KEYS['fast_gpt_chat'],
            'grok'     => API_KEYS['fast_gpt_chat'],
            'blackbox' => API_KEYS['fast_blackbox'],
        ];

        $url = $urls[$model] ?? $urls['gpt'];
        $key = $keys[$model] ?? $keys['gpt'];

        $res = self::httpGet($url, ['apikey' => $key, 'text' => $prompt], [], 90);
        if (!$res['ok']) return "❌ خطا در ارتباط با سرور هوش مصنوعی.";

        $d = $res['data'];
        if (is_string($d)) return $d;
        if (isset($d['result']['text'])) return (string)$d['result']['text'];
        if (isset($d['result']) && is_string($d['result'])) return $d['result'];
        if (isset($d['response']) && is_string($d['response'])) return $d['response'];
        if (isset($d['text']) && is_string($d['text'])) return $d['text'];
        if (isset($d['message']) && is_string($d['message'])) return $d['message'];

        return json_encode($d, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    }

    public static function generatePhotoFast(string $prompt): array {
        $res = self::httpGet('https://api.fast-creat.ir/gpt/photo', [
            'apikey' => API_KEYS['fast_photo'],
            'text'   => $prompt
        ], [], 120);
        return $res['ok'] ? self::extractImages($res['data']) : [];
    }

    public static function generatePhotoDalle(string $prompt): array {
        $res = self::httpGet('https://api.majidapi.ir/ai/image', [
            'token'  => API_KEYS['majid_token'],
            'prompt' => $prompt
        ], [], 120);
        return $res['ok'] ? self::extractImages($res['data']) : [];
    }

    public static function toAnimeFast(string $imageUrl): array {
        $res = self::httpGet('https://api.fast-creat.ir/ghibli', [
            'apikey' => API_KEYS['fast_ghibli'],
            'url'    => $imageUrl
        ], [], 120);
        return $res['ok'] ? self::extractImages($res['data']) : [];
    }

    public static function toAnimeGhibli(string $imageUrl): array {
        $res = self::httpGet('https://api.majidapi.ir/ai/ghibli', [
            'token' => API_KEYS['majid_token'],
            'url'   => $imageUrl
        ], [], 120);
        return $res['ok'] ? self::extractImages($res['data']) : [];
    }

    public static function enhanceQuality(string $imageUrl): array {
        $res = self::httpGet('https://api.fast-creat.ir/photo-quality', [
            'apikey' => API_KEYS['fast_quality'],
            'url'    => $imageUrl
        ], [], 120);
        return $res['ok'] ? self::extractImages($res['data']) : [];
    }

    public static function makeLogo(int $id, string $text): array {
        $res = self::httpGet('https://api.fast-creat.ir/logo', [
            'apikey' => API_KEYS['fast_logo'],
            'type'   => 'logo',
            'id'     => $id,
            'text'   => $text
        ], [], 90);
        return $res['ok'] ? self::extractImages($res['data']) : [];
    }

    public static function makeEffect(int $id, string $imageUrl): array {
        $res = self::httpGet('https://api.fast-creat.ir/logo', [
            'apikey' => API_KEYS['fast_logo'],
            'type'   => 'effect',
            'id'     => $id,
            'url'    => $imageUrl
        ], [], 90);
        return $res['ok'] ? self::extractImages($res['data']) : [];
    }

    // ==================== ب) سرویس‌های رسانه و دانلودر ====================
    public static function instagramDownload(string $url): array {
        // پاکسازی لینک از پارامترهای اضافی (Query String) برای جلوگیری از خطای API
        if (preg_match('~(https?:\/\/(?:www\.)?instagram\.com\/(?:p|reel|tv|stories)\/[A-Za-z0-9_\-]+)~i', $url, $m)) {
            $cleanUrl = $m[1];
        } else {
            $cleanUrl = $url;
        }

        $types = ['post2', 'post', 'story2', 'story'];
        foreach ($types as $t) {
            $res = self::httpGet('https://api.fast-creat.ir/instagram', [
                'apikey' => API_KEYS['fast_ig'],
                'type'   => $t,
                'url'    => $cleanUrl
            ], [], 60);

            if ($res['ok'] && isset($res['data']['ok']) && $res['data']['ok'] === true) {
                $resultData = $res['data']['result'] ?? [];
                if (!empty($resultData['media']) || !empty($resultData['url'])) {
                    return [
                        'ok'       => true,
                        'caption'  => (string)($resultData['caption'] ?? ''),
                        'media'    => $resultData['media'] ?? [['url' => $resultData['url'], 'type' => 'video']],
                        'thumbnail'=> $resultData['thumbnail'] ?? $resultData['cover'] ?? '',
                        'likes'    => $resultData['likes'] ?? $resultData['like_count'] ?? 0,
                        'comments' => $resultData['comments'] ?? $resultData['comment_count'] ?? 0
                    ];
                }
            }
        }
        return ['ok' => false];
    }

    public static function instagramProfileInfo(string $username): array {
        if (preg_match('~instagram\.com/([^/?#]+)~i', $username, $m)) $username = $m[1];
        $username = ltrim(trim($username), '@');
        $res = self::httpGet('https://api.fast-creat.ir/instagram', [
            'apikey'   => API_KEYS['fast_ig'],
            'type'     => 'info',
            'username' => $username
        ], [], 45);
        if ($res['ok'] && !empty($res['data']['ok']) && isset($res['data']['result'])) {
            return ['ok' => true, 'username' => $username, 'info' => $res['data']['result']];
        }
        return ['ok' => false];
    }

    // ==================== TIKTOK DOWNLOADER (NO WATERMARK) ====================
    public static function tiktokDownload(string $url): array {
        if (preg_match('~(https?:\/\/(?:www\.|vm\.|vt\.)?tiktok\.com\/(?:@[\w.-]+\/video\/\d+|[\w.-]+))~i', $url, $m)) {
            $cleanUrl = $m[1];
        } else {
            $cleanUrl = trim($url);
        }
        $endpoint = 'https://www.tikwm.com/api/?url=' . urlencode($cleanUrl);
        $res = self::httpGet($endpoint, [], [], 15);
        if ($res['ok'] && isset($res['data']['code']) && $res['data']['code'] === 0) {
            $d = $res['data']['data'] ?? [];
            return [
                'ok'        => true,
                'platform'  => 'tiktok',
                'title'     => $d['title'] ?? 'ویدیو تیک‌تاک بدون واترمارک',
                'author'    => $d['author']['nickname'] ?? 'کاربر تیک‌تاک',
                'cover'     => $d['cover'] ?? '',
                'play_url'  => $d['play'] ?? '',
                'music_url' => $d['music'] ?? ''
            ];
        }
        return ['ok' => false, 'error' => $res['data']['msg'] ?? 'خطا در استخراج ویدیوی تیک‌تاک'];
    }

    // ==================== APARAT DOWNLOADER (ALL QUALITIES) ====================
    public static function aparatDownload(string $url): array {
        if (!preg_match('~aparat\.com\/v\/([A-Za-z0-9]+)~i', $url, $m)) {
            return ['ok' => false, 'error' => 'فرمت لینک آپارات نامعتبر است.'];
        }
        $vHash = $m[1];
        $endpoint = "https://www.aparat.com/api/fa/v1/video/video/show/videohash/{$vHash}";
        $res = self::httpGet($endpoint, [], [], 15);
        if ($res['ok'] && isset($res['data']['data']['attributes'])) {
            $attrs = $res['data']['data']['attributes'];
            $fileLinks = $attrs['file_link_all'] ?? [];
            $qualities = [];
            $bestUrl = null;
            foreach ($fileLinks as $fl) {
                if (!empty($fl['urls'][0])) {
                    $qualities[] = [
                        'profile' => $fl['profile'] ?? '',
                        'url'     => $fl['urls'][0]
                    ];
                    $bestUrl = $fl['urls'][0];
                }
            }
            return [
                'ok'        => true,
                'platform'  => 'aparat',
                'title'     => $attrs['title'] ?? 'ویدیو آپارات',
                'author'    => $attrs['sender_name'] ?? 'آپارات',
                'cover'     => $attrs['big_poster'] ?? '',
                'qualities' => $qualities,
                'play_url'  => $bestUrl
            ];
        }
        return ['ok' => false, 'error' => 'ویدیو در آپارات یافت نشد.'];
    }

    public static function youtubeSearch(string $query): array {
        return self::httpGet('https://api.fast-creat.ir/youtube/search', [
            'apikey' => API_KEYS['fast_youtube'],
            'q'      => $query
        ]);
    }

    public static function youtubeDownload(string $url): array {
        $res = self::httpGet('https://api.fast-creat.ir/youtube/download', [
            'apikey' => API_KEYS['fast_youtube'],
            'url'    => $url
        ], [], 60);
        return $res['ok'] ? self::extractLinks($res['data']) : [];
    }

    public static function spotifySearch(string $query): array {
        return self::httpGet('https://api.fast-creat.ir/spotify', [
            'apikey' => API_KEYS['fast_spotify'],
            'action' => 'search',
            'query'  => $query
        ]);
    }

    public static function spotifyDownload(string $url): array {
        $res = self::httpGet('https://api.fast-creat.ir/spotify', [
            'apikey' => API_KEYS['fast_spotify'],
            'action' => 'dl',
            'url'    => $url
        ], [], 60);
        return $res['ok'] ? self::extractLinks($res['data']) : [];
    }

    public static function rjSearch(string $query): array {
        return self::httpGet('https://api.fast-creat.ir/radiojavan', [
            'apikey' => API_KEYS['fast_rj'],
            'action' => 'search',
            'query'  => $query
        ]);
    }

    public static function rjDownload(string $action, int $id): array {
        $res = self::httpGet('https://api.fast-creat.ir/radiojavan', [
            'apikey' => API_KEYS['fast_rj'],
            'action' => $action,
            'id'     => $id
        ], [], 60);
        return $res['ok'] ? self::extractLinks($res['data']) : [];
    }

    public static function shazamRecognize(string $url): array {
        $isIg = (stripos($url, 'instagram.com') !== false);
        $params = ['token' => API_KEYS['majid_token']];
        if ($isIg) $params['url'] = $url;
        else $params['audio'] = $url;

        $res = self::httpGet('https://api.majidapi.ir/music/shazam', $params, [], 60);
        if (!$res['ok']) return ['ok' => false];
        $r = $res['data']['result'] ?? $res['data'];
        return [
            'ok'       => true,
            'title'    => (string)($r['title'] ?? ''),
            'artist'   => (string)($r['artist'] ?? ''),
            'download' => (string)($r['download'] ?? '')
        ];
    }

    public static function extractAudio(string $videoUrl): string {
        $res = self::httpGet('https://api.majidapi.ir/tools/extract-audio', [
            'video' => $videoUrl
        ], ['Authorization: Bearer ' . API_KEYS['majid_token']], 120);
        if (!$res['ok']) return '';
        $d = $res['data'];
        if (is_string($d) && strpos($d, 'http') === 0) return $d;
        return (string)($d['audio_url'] ?? $d['url'] ?? $d['download_url'] ?? $d['result'] ?? '');
    }

    public static function extractOcr(string $imageUrl, string $lang = 'fa'): string {
        $langParam = ($lang === 'both') ? 'fa,en' : $lang;
        $res = self::httpGet('https://api.majidapi.ir/tools/ocr', [
            'lang'  => $langParam,
            'image' => $imageUrl
        ], ['Authorization: Bearer ' . API_KEYS['majid_token']], 60);

        if ($res['ok']) {
            $d = $res['data'];
            $txt = is_string($d) ? $d : ($d['text'] ?? $d['result'] ?? $d['data']['text'] ?? '');
            if (trim((string)$txt) !== '') return trim((string)$txt);
        }

        // Fallback به OCR.space در صورت خطا
        $langMap = ['fa' => 'fas', 'en' => 'eng', 'both' => 'fas,eng'];
        $ch = curl_init('https://api.ocr.space/parse/imageurl');
        curl_setopt_array($ch, [
            CURLOPT_POST           => true,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 60,
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_POSTFIELDS     => http_build_query([
                'apikey'   => API_KEYS['ocr_space'] ?? 'helloworld',
                'url'      => $imageUrl,
                'language' => $langMap[$lang] ?? 'fas'
            ])
        ]);
        $raw = curl_exec($ch);
        curl_close($ch);
        $dec = json_decode((string)$raw, true);
        return trim((string)($dec['ParsedResults'][0]['ParsedText'] ?? ''));
    }
}

// ==================== ج) کنترلر تعاملات و منوهای فاز ۲ ====================
class Phase2Handler {
    private $bot;
    private array $user;

    public function __construct($bot, array &$user) {
        $this->bot  = $bot;
        $this->user = &$user;
    }

    // بررسی سهمیه روزانه و امتیاز کاربر قبل از انجام عملیات
    private function checkQuota(): bool {
        if (!empty($this->user['is_admin']) && (int)$this->user['is_admin'] === 1) return true;
        if (!empty($this->user['role']) && $this->user['role'] === 'admin') return true;

        $limit = 30;
        $cost  = 1;

        if (class_exists('MegaDB')) {
            $limit = (int)MegaDB::getSetting('daily_limit', '30');
            $cost  = (int)MegaDB::getSetting('request_cost', '1');
        }

        $dailyCount = (int)($this->user['daily_requests_count'] ?? $this->user['daily_count'] ?? 0);
        $points = (int)($this->user['points'] ?? 0);

        if ($dailyCount >= $limit) {
            $chatId = $this->bot->chatId ?? ($this->user['platform_user_id'] ?? 0);
            $this->bot->sendMessage($chatId, "⛔️ سهمیه درخواست روزانه شما ($limit درخواست) تمام شده است. فردا دوباره تلاش کنید.");
            return false;
        }
        if ($points < $cost) {
            $chatId = $this->bot->chatId ?? ($this->user['platform_user_id'] ?? 0);
            $this->bot->sendMessage($chatId, "⛔️ امتیاز شما کافی نیست (نیاز به $cost امتیاز).\nاز بخش «👤 حساب کاربری» با دعوت دوستان امتیاز رایگان بگیرید!");
            return false;
        }
        return true;
    }

    // کسر امتیاز و ثبت آمار پس از انجام موفق عملیات
    private function chargeUser(string $metricKey): void {
        $cost = 1;
        if (class_exists('MegaDB')) {
            $cost = (int)MegaDB::getSetting('request_cost', '1');
            MegaDB::conn()->prepare("UPDATE users SET daily_count = daily_count + 1, total_requests = total_requests + 1, points = MAX(0, points - ?) WHERE id = ? OR uid = ?")
                ->execute([$cost, $this->user['id'] ?? 0, $this->user['uid'] ?? 0]);
            MegaDB::incMetric($metricKey);
        }
    }

    // ارسال هوشمند رسانه (سازگار با تلگرام، بله و روبیکا)
    private function sendMediaUniversal(string $type, string $url, string $caption = ''): void {
        $platform = $this->bot->platform ?? 'telegram';
        $chatId = $this->bot->chatId ?? ($this->user['platform_user_id'] ?? 0);

        if ($platform === 'rubika') {
            $txt = ($caption ? "$caption\n\n" : '') . "🔗 لینک مستقیم فایل:\n" . $url;
            $this->bot->sendMessage($chatId, $txt);
            return;
        }
        $methodMap = ['photo' => 'sendPhoto', 'video' => 'sendVideo', 'audio' => 'sendAudio'];
        $method = $methodMap[$type] ?? 'sendPhoto';
        $res = $this->bot->apiRequest($method, [
            'chat_id'    => $chatId,
            $type        => $url,
            'caption'    => $caption,
            'parse_mode' => 'HTML'
        ]);
        // اگر ارسال مستقیم از URL توسط تلگرام/بله رد شد، لینک مستقیم را بفرست
        if (empty($res['ok'])) {
            $this->bot->sendMessage($chatId, ($caption ? "<b>$caption</b>\n\n" : '') . "📥 لینک دانلود مستقیم:\n" . $url);
        }
    }

    // ۱. مدیریت دکمه‌های شیشه‌ای فاز ۲
    public function handleCallback(string $data): bool {
        $chatId = $this->bot->chatId ?? ($this->user['platform_user_id'] ?? 0);
        $uid = $this->user['id'] ?? $this->user['uid'] ?? 0;

        // --- منوی چت هوشمند ---
        if ($data === 'ai_chat_menu' || $data === 'cb_ai_chat') {
            $cur = strtoupper($this->user['preferred_ai'] ?? 'gpt');
            $txt = "🤖 <b>چت هوشمند چندمدله (AI Chat)</b>\n";
            $txt .= "🎯 مدل فعال فعلی شما: <b>$cur</b>\n\n";
            $txt .= "لطفاً مدل مورد نظر را انتخاب کنید یا مستقیماً سوال خود را بپرسید:";
            $kb = [
                [
                    ['text' => '🧠 GPT-3.5 / 4', 'callback_data' => 'set_ai:gpt'],
                    ['text' => '🚀 GPT-4 Turbo', 'callback_data' => 'set_ai:gpt4']
                ],
                [
                    ['text' => '🔬 DeepSeek', 'callback_data' => 'set_ai:deepseek'],
                    ['text' => '⚡ Grok AI', 'callback_data' => 'set_ai:grok']
                ],
                [['text' => '🔙 بازگشت به منوی اصلی', 'callback_data' => 'cb_main_menu']]
            ];
            $this->setState($uid, 'p2_ai_chat');
            $this->bot->editOrSend($txt, $kb);
            return true;
        }

        if (strpos($data, 'set_ai:') === 0) {
            $model = substr($data, 7);
            $this->user['preferred_ai'] = $model;
            $this->setState($uid, 'p2_ai_chat');
            $this->bot->answerCallback("✅ مدل روی " . strtoupper($model) . " تنظیم شد!");
            $this->bot->editOrSend("✅ مدل هوش مصنوعی شما به <b>" . strtoupper($model) . "</b> تغییر یافت.\n\n✍️ اکنون پیام یا سوال خود را ارسال کنید:", $this->backBtn());
            return true;
        }

        if ($data === 'ai_blackbox' || $data === 'cb_ai_blackbox') {
            $this->setState($uid, 'p2_blackbox');
            $this->bot->editOrSend("🦾 <b>هوش مصنوعی Blackbox (متخصص کدنویسی و برنامه‌نویسی)</b>\n\n✍️ سوال برنامه‌نویسی یا کد خود را ارسال کنید:", $this->backBtn());
            return true;
        }

        // --- منوی ساخت تصویر ---
        if ($data === 'ai_photo_menu' || $data === 'cb_ai_image') {
            $kb = [
                [
                    ['text' => '⚡ موتور Fast-Creat', 'callback_data' => 'p2_photo_fast'],
                    ['text' => '🎨 موتور Dall-E 3', 'callback_data' => 'p2_photo_dalle']
                ],
                [['text' => '🔙 بازگشت', 'callback_data' => 'cb_main_menu']]
            ];
            $this->bot->editOrSend("🖼 <b>ساخت تصویر با هوش مصنوعی</b>\n\nیکی از موتورهای تصویرساز زیر را انتخاب کنید:", $kb);
            return true;
        }
        if ($data === 'p2_photo_fast' || $data === 'p2_photo_dalle') {
            $this->setState($uid, $data);
            $engine = ($data === 'p2_photo_dalle') ? 'Dall-E' : 'Fast-Creat';
            $this->bot->editOrSend("🖼 <b>ساخت تصویر با موتور $engine</b>\n\n✍️ لطفاً توصیف تصویر مورد نظر خود را (به انگلیسی یا فارسی) ارسال کنید:", $this->backBtn('ai_photo_menu'));
            return true;
        }

        // --- منوی تبدیل به انیمه ---
        if ($data === 'ai_anime_menu' || $data === 'cb_ai_anime') {
            $kb = [
                [
                    ['text' => '⚡ استایل انیمه (سرویس ۱)', 'callback_data' => 'p2_anime_fast'],
                    ['text' => '🎌 استایل Ghibli (سرویس ۲)', 'callback_data' => 'p2_anime_ghibli']
                ],
                [['text' => '🔙 بازگشت', 'callback_data' => 'cb_main_menu']]
            ];
            $this->bot->editOrSend("🧩 <b>تبدیل عکس به انیمه</b>\n\nلطفاً سبک مورد نظر خود را انتخاب کنید:", $kb);
            return true;
        }
        if ($data === 'p2_anime_fast' || $data === 'p2_anime_ghibli') {
            $this->setState($uid, $data);
            $this->bot->editOrSend("🧩 لطفاً <b>لینک مستقیم عکس</b> (که با http/https شروع می‌شود) را ارسال کنید:", $this->backBtn('ai_anime_menu'));
            return true;
        }

        // --- افزایش کیفیت و لوگوساز ---
        if ($data === 'ai_enhance' || $data === 'cb_ai_enhance') {
            $this->setState($uid, 'p2_enhance');
            $this->bot->editOrSend("🔥 <b>افزایش کیفیت عکس (۴K Enhance)</b>\n\nلطفاً لینک مستقیم عکس خود را ارسال کنید:", $this->backBtn());
            return true;
        }
        if ($data === 'ai_logo_menu' || $data === 'cb_ai_logo') {
            $kb = [
                [
                    ['text' => '🎯 ساخت لوگو اسمی (۱۴۰ مدل)', 'callback_data' => 'p2_logo'],
                    ['text' => '✨ افکت‌گذاری روی عکس (۸۰ مدل)', 'callback_data' => 'p2_effect']
                ],
                [['text' => '🔙 بازگشت', 'callback_data' => 'cb_main_menu']]
            ];
            $this->bot->editOrSend("🎯 <b>بخش لوگوساز و افکت گرافیکی</b>\n\nیکی از گزینه‌های زیر را انتخاب کنید:", $kb);
            return true;
        }
        if ($data === 'p2_logo') {
            $this->setState($uid, 'p2_logo');
            $this->bot->editOrSend("🎯 <b>لوگوساز حرفه‌ای</b>\n\nیک عدد بین <b>1 تا 140</b> به همراه متن انگلیسی خود با فاصله بفرستید.\n💡 مثال: <code>15 MegaBot</code>", $this->backBtn('ai_logo_menu'));
            return true;
        }
        if ($data === 'p2_effect') {
            $this->setState($uid, 'p2_effect');
            $this->bot->editOrSend("✨ <b>افکت‌گذاری روی تصویر</b>\n\nیک عدد بین <b>1 تا 80</b> به همراه لینک مستقیم عکس خود بفرستید.\n💡 مثال: <code>12 https://example.com/photo.jpg</code>", $this->backBtn('ai_logo_menu'));
            return true;
        }

        // --- دانلودرها (اینستاگرام، یوتیوب، اسپاتیفای، رادیوجوان) ---
        if ($data === 'dl_instagram' || $data === 'cb_media_insta') {
            $kb = [
                [
                    ['text' => '📥 دانلود پست / ریلز / استوری', 'callback_data' => 'p2_ig_dl'],
                    ['text' => '👤 دریافت اطلاعات پیج', 'callback_data' => 'p2_ig_info']
                ],
                [['text' => '🔙 بازگشت', 'callback_data' => 'cb_main_menu']]
            ];
            $this->bot->editOrSend("📸 <b>خدمات اینستاگرام</b>\n\nکدام قابلیت را می‌خواهید؟", $kb);
            return true;
        }
        if ($data === 'p2_ig_dl') {
            $this->setState($uid, 'p2_ig_dl');
            $this->bot->editOrSend("📥 لطفاً <b>لینک پست، ریلز یا استوری اینستاگرام</b> را ارسال کنید:", $this->backBtn('dl_instagram'));
            return true;
        }
        if ($data === 'p2_ig_info' || $data === 'cb_media_insta_info') {
            $this->setState($uid, 'p2_ig_info');
            $this->bot->editOrSend("👤 لطفاً <b>یوزرنیم پیج اینستاگرام</b> (مثلاً `@instagram`) را ارسال کنید:", $this->backBtn('dl_instagram'));
            return true;
        }

        if ($data === 'dl_youtube' || $data === 'cb_media_youtube') {
            $kb = [
                [
                    ['text' => '🔎 جستجو در یوتیوب', 'callback_data' => 'p2_yt_search'],
                    ['text' => '⬇️ دانلود با لینک یوتیوب', 'callback_data' => 'p2_yt_dl']
                ],
                [['text' => '🔙 بازگشت', 'callback_data' => 'cb_main_menu']]
            ];
            $this->bot->editOrSend("▶️ <b>خدمات یوتیوب (YouTube)</b>\n\nانتخاب کنید:", $kb);
            return true;
        }
        if ($data === 'p2_yt_search') {
            $this->setState($uid, 'p2_yt_search');
            $this->bot->editOrSend("🔎 عبارت مورد نظر برای <b>جستجو در یوتیوب</b> را بنویسید:", $this->backBtn('dl_youtube'));
            return true;
        }
        if ($data === 'p2_yt_dl') {
            $this->setState($uid, 'p2_yt_dl');
            $this->bot->editOrSend("⬇️ لطفاً <b>لینک ویدیوی یوتیوب</b> را ارسال کنید:", $this->backBtn('dl_youtube'));
            return true;
        }

        if ($data === 'dl_spotify' || $data === 'cb_media_music') {
            $kb = [
                [
                    ['text' => '🔎 جستجوی آهنگ در اسپاتیفای', 'callback_data' => 'p2_sp_search'],
                    ['text' => '⬇️ دانلود با لینک اسپاتیفای', 'callback_data' => 'p2_sp_dl']
                ],
                [
                    ['text' => '📻 رادیو جوان (جستجو و دانلود)', 'callback_data' => 'dl_rj']
                ],
                [['text' => '🔙 بازگشت', 'callback_data' => 'cb_main_menu']]
            ];
            $this->bot->editOrSend("🎵 <b>خدمات اسپاتیفای و موسیقی</b>\n\nانتخاب کنید:", $kb);
            return true;
        }
        if ($data === 'p2_sp_search') {
            $this->setState($uid, 'p2_sp_search');
            $this->bot->editOrSend("🔎 نام خواننده یا آهنگ را برای <b>جستجو در اسپاتیفای</b> بفرستید:", $this->backBtn('dl_spotify'));
            return true;
        }
        if ($data === 'p2_sp_dl') {
            $this->setState($uid, 'p2_sp_dl');
            $this->bot->editOrSend("⬇️ لطفاً <b>لینک ترک اسپاتیفای</b> را ارسال کنید:", $this->backBtn('dl_spotify'));
            return true;
        }

        if ($data === 'dl_rj') {
            $kb = [
                [['text' => '🔎 جستجو در رادیو جوان', 'callback_data' => 'p2_rj_search']],
                [
                    ['text' => '🎧 دانلود MP3 با کد (ID)', 'callback_data' => 'p2_rj_mp3'],
                    ['text' => '🎬 دانلود موزیک‌ویدیو با کد', 'callback_data' => 'p2_rj_mp4']
                ],
                [['text' => '🔙 بازگشت', 'callback_data' => 'cb_main_menu']]
            ];
            $this->bot->editOrSend("📻 <b>خدمات رادیو جوان (RadioJavan)</b>\n\nانتخاب کنید:", $kb);
            return true;
        }
        if ($data === 'p2_rj_search') {
            $this->setState($uid, 'p2_rj_search');
            $this->bot->editOrSend("🔎 نام خواننده یا آهنگ را برای <b>جستجو در رادیو جوان</b> بنویسید:", $this->backBtn('dl_rj'));
            return true;
        }
        if ($data === 'p2_rj_mp3' || $data === 'p2_rj_mp4') {
            $this->setState($uid, $data);
            $this->bot->editOrSend("🔢 لطفاً <b>کد عددی (ID)</b> رسانه رادیوجوان را که از بخش جستجو گرفته‌اید ارسال کنید:", $this->backBtn('dl_rj'));
            return true;
        }

        // --- شازم، استخراج صدا و OCR ---
        if ($data === 'dl_shazam' || $data === 'cb_media_shazam') {
            $this->setState($uid, 'p2_shazam');
            $this->bot->editOrSend("🎤 <b>شازم (شناسایی هوشمند موزیک)</b>\n\nلطفاً لینک فایل صوتی (MP3) یا لینک ریلز اینستاگرام را بفرستید تا نام آهنگ و فایل کاملش را پیدا کنم:", $this->backBtn());
            return true;
        }
        if ($data === 'dl_ocr_audio' || $data === 'cb_ai_ocr' || $data === 'cb_media_extract_mp3') {
            $kb = [
                [['text' => '🎧 استخراج صدا (MP3) از لینک ویدیو', 'callback_data' => 'p2_ext_audio']],
                [
                    ['text' => '📝 استخراج متن فارسی (OCR)', 'callback_data' => 'p2_ocr:fa'],
                    ['text' => '📝 استخراج متن انگلیسی', 'callback_data' => 'p2_ocr:en']
                ],
                [['text' => '🌐 استخراج متن ترکیبی (فارسی+انگلیسی)', 'callback_data' => 'p2_ocr:both']],
                [['text' => '🔙 بازگشت', 'callback_data' => 'cb_main_menu']]
            ];
            $this->bot->editOrSend("🎧 <b>ابزار استخراج صدا و متن (OCR)</b>\n\nیکی از گزینه‌های زیر را انتخاب کنید:", $kb);
            return true;
        }
        if ($data === 'p2_ext_audio') {
            $this->setState($uid, 'p2_ext_audio');
            $this->bot->editOrSend("🎧 لطفاً <b>لینک مستقیم ویدیوی MP4</b> را ارسال کنید تا صدای آن استخراج شود:", $this->backBtn('dl_ocr_audio'));
            return true;
        }
        if (strpos($data, 'p2_ocr:') === 0) {
            $this->setState($uid, $data);
            $this->bot->editOrSend("📝 لطفاً <b>لینک مستقیم عکس</b> حاوی متن را ارسال کنید:", $this->backBtn('dl_ocr_audio'));
            return true;
        }

        return false;
    }

    // ۲. پردازش پیام‌های متنی کاربر در وضعیت‌های فاز ۲
    public function handleState(string $state, string $text): bool {
        if (strpos($state, 'p2_') !== 0) return false;
        if (!$this->checkQuota()) return true;

        $chatId = $this->bot->chatId ?? ($this->user['platform_user_id'] ?? 0);
        $uid = $this->user['id'] ?? $this->user['uid'] ?? 0;

        // ۱. چت هوشمند و بلک‌باکس
        if ($state === 'p2_ai_chat' || $state === 'p2_blackbox') {
            $model = ($state === 'p2_blackbox') ? 'blackbox' : ($this->user['preferred_ai'] ?? 'gpt');
            $this->bot->sendMessage($chatId, "⏳ در حال پردازش پاسخ با <b>" . strtoupper($model) . "</b>...");
            $ans = Phase2Services::chatAI($text, $model);
            if (mb_strlen($ans) > 3900) $ans = mb_substr($ans, 0, 3900) . "\n...(ادامه دارد)";
            $this->bot->sendMessage($chatId, htmlspecialchars($ans), $this->backBtn());
            $this->chargeUser("ai_chat_$model");
            return true; // در حالت چت می‌ماند تا مکالمه ادامه پیدا کند
        }

        // ۲. ساخت تصویر (Fast-Creat & Dall-E)
        if ($state === 'p2_photo_fast' || $state === 'p2_photo_dalle') {
            $this->bot->sendMessage($chatId, "🎨 در حال طراحی و ساخت تصویر شما... لطفاً چند ثانیه صبر کنید.");
            $imgs = ($state === 'p2_photo_dalle')
                ? Phase2Services::generatePhotoDalle($text)
                : Phase2Services::generatePhotoFast($text);

            if (empty($imgs)) {
                $this->bot->sendMessage($chatId, "❌ متاسفانه تصویری تولید نشد. لطفاً متن دیگری امتحان کنید.", $this->backBtn('ai_photo_menu'));
                return true;
            }
            $cnt = 0;
            foreach ($imgs as $imgUrl) {
                if ($cnt >= 4) break;
                $this->sendMediaUniversal('photo', $imgUrl, "🎨 ساخته شده با هوش مصنوعی\n📝 متن: " . htmlspecialchars($text));
                $cnt++;
            }
            $this->chargeUser($state);
            $this->setState($uid, null);
            return true;
        }

        // ۳. تبدیل به انیمه و افزایش کیفیت
        if (in_array($state, ['p2_anime_fast', 'p2_anime_ghibli', 'p2_enhance'], true)) {
            if (!preg_match('~https?://\S+~i', $text, $m)) {
                $this->bot->sendMessage($chatId, "❌ لطفاً یک لینک معتبر عکس (شروع با http/https) بفرستید:");
                return true;
            }
            $url = $m[0];
            $this->bot->sendMessage($chatId, "⏳ در حال پردازش تصویر شما...");
            if ($state === 'p2_anime_fast') $imgs = Phase2Services::toAnimeFast($url);
            elseif ($state === 'p2_anime_ghibli') $imgs = Phase2Services::toAnimeGhibli($url);
            else $imgs = Phase2Services::enhanceQuality($url);

            if (empty($imgs)) {
                $this->bot->sendMessage($chatId, "❌ پردازش تصویر ناموفق بود. از سالم بودن لینک عکس مطمئن شوید.", $this->backBtn());
                return true;
            }
            foreach (array_slice($imgs, 0, 2) as $imgUrl) {
                $this->sendMediaUniversal('photo', $imgUrl, "✨ تصویر پردازش شده شما");
            }
            $this->chargeUser($state);
            $this->setState($uid, null);
            return true;
        }

        // ۴. لوگوساز و افکت
        if ($state === 'p2_logo') {
            $parts = preg_split('~\s+~u', trim($text), 2);
            if (count($parts) < 2 || (int)$parts[0] < 1 || (int)$parts[0] > 140) {
                $this->bot->sendMessage($chatId, "❌ فرمت نادرست! یک عدد بین 1 تا 140 و سپس متن را بفرستید.\nمثال: <code>25 Ali</code>");
                return true;
            }
            $this->bot->sendMessage($chatId, "🎯 در حال طراحی لوگو...");
            $imgs = Phase2Services::makeLogo((int)$parts[0], trim($parts[1]));
            if (empty($imgs)) {
                $this->bot->sendMessage($chatId, "❌ خطا در ساخت لوگو.", $this->backBtn());
                return true;
            }
            $this->sendMediaUniversal('photo', $imgs[0], "🎯 لوگوی اختصاصی شما");
            $this->chargeUser('logo_maker');
            $this->setState($uid, null);
            return true;
        }

        if ($state === 'p2_effect') {
            if (!preg_match('~^(\d{1,2})\s+(https?://\S+)~i', trim($text), $m) || (int)$m[1] < 1 || (int)$m[1] > 80) {
                $this->bot->sendMessage($chatId, "❌ فرمت نادرست! شماره افکت (1 تا 80) و لینک عکس را بفرستید.");
                return true;
            }
            $this->bot->sendMessage($chatId, "✨ در حال اعمال افکت روی تصویر...");
            $imgs = Phase2Services::makeEffect((int)$m[1], $m[2]);
            if (empty($imgs)) {
                $this->bot->sendMessage($chatId, "❌ خطا در اعمال افکت.", $this->backBtn());
                return true;
            }
            $this->sendMediaUniversal('photo', $imgs[0], "✨ تصویر افکت‌گذاری شده");
            $this->chargeUser('effect_maker');
            $this->setState($uid, null);
            return true;
        }

        // ۵. دانلودر و اطلاعات اینستاگرام
        if ($state === 'p2_ig_dl') {
            if (!filter_var($text, FILTER_VALIDATE_URL)) {
                $this->bot->sendMessage($chatId, "❌ لطفاً یک لینک معتبر اینستاگرام ارسال کنید:");
                return true;
            }
            $this->bot->sendMessage($chatId, "📥 در حال دریافت رسانه از اینستاگرام...");
            $res = Phase2Services::instagramDownload($text);
            if (!$res['ok']) {
                $this->bot->sendMessage($chatId, "❌ محتوایی یافت نشد یا پیج خصوصی است.", $this->backBtn('dl_instagram'));
                return true;
            }
            $capUsed = false;
            foreach ($res['media'] as $m) {
                $mUrl = (string)($m['url'] ?? '');
                if ($mUrl === '' || stripos($mUrl, 'thumbnail') !== false) continue;
                $isVideo = preg_match('~\.mp4(\?|$)~i', $mUrl) || stripos($mUrl, 'video') !== false || ($m['type'] ?? '') === 'video';
                $cap = (!$capUsed && !empty($res['caption'])) ? mb_substr($res['caption'], 0, 800) : '📸 دانلود شده از اینستاگرام';
                $capUsed = true;
                $this->sendMediaUniversal($isVideo ? 'video' : 'photo', $mUrl, $cap);
            }
            $this->chargeUser('ig_download');
            $this->setState($uid, null);
            return true;
        }

        if ($state === 'p2_ig_info') {
            $this->bot->sendMessage($chatId, "🔍 در حال استخراج اطلاعات پیج...");
            $res = Phase2Services::instagramProfileInfo($text);
            if (!$res['ok']) {
                $this->bot->sendMessage($chatId, "❌ پیج یافت نشد.", $this->backBtn('dl_instagram'));
                return true;
            }
            $r = $res['info'];
            $txt = "👤 <b>اطلاعات پیج اینستاگرام</b>\n\n";
            $txt .= "▫️ یوزرنیم: @" . htmlspecialchars($res['username']) . "\n";
            $txt .= "▫️ نام: " . htmlspecialchars((string)($r['full_name'] ?? $r['name'] ?? '—')) . "\n";
            $txt .= "▫️ فالوورها: <b>" . htmlspecialchars((string)($r['follower'] ?? $r['followers'] ?? '—')) . "</b>\n";
            $txt .= "▫️ فالووینگ: <b>" . htmlspecialchars((string)($r['following'] ?? '—')) . "</b>\n";
            $txt .= "▫️ تعداد پست: <b>" . htmlspecialchars((string)($r['posts'] ?? $r['media_count'] ?? '—')) . "</b>\n";
            if (!empty($r['biography'])) $txt .= "\n📝 <b>بیوگرافی:</b>\n" . htmlspecialchars((string)$r['biography']);

            $pic = (string)($r['profile_pic_url_hd'] ?? $r['profile_pic_url'] ?? '');
            if ($pic !== '') $this->sendMediaUniversal('photo', $pic, $txt);
            else $this->bot->sendMessage($chatId, $txt, $this->backBtn('dl_instagram'));

            $this->chargeUser('ig_info');
            $this->setState($uid, null);
            return true;
        }

        // ۶. یوتیوب، اسپاتیفای و رادیوجوان
        if ($state === 'p2_yt_search') {
            $res = Phase2Services::youtubeSearch($text);
            $items = $res['data']['result'] ?? $res['data']['items'] ?? [];
            if (empty($items)) {
                $this->bot->sendMessage($chatId, "❌ نتیجه‌ای در یوتیوب یافت نشد.", $this->backBtn('dl_youtube'));
                return true;
            }
            $out = ["▶️ <b>نتایج جستجوی یوتیوب:</b>\n"];
            foreach (array_slice($items, 0, 8) as $it) {
                $title = htmlspecialchars((string)($it['title'] ?? $it['snippet']['title'] ?? 'ویدیو'));
                $u = (string)($it['url'] ?? $it['link'] ?? ($it['id']['videoId'] ?? ''));
                if ($u && strpos($u, 'http') !== 0) $u = "https://www.youtube.com/watch?v=$u";
                if ($u) $out[] = "• <b>$title</b>\n🔗 <code>$u</code>";
            }
            $out[] = "\n💡 <i>لینک دلخواه را کپی کرده و در بخش «دانلود با لینک یوتیوب» بفرستید.</i>";
            $this->bot->sendMessage($chatId, implode("\n\n", $out), $this->backBtn('dl_youtube'));
            $this->chargeUser('yt_search');
            $this->setState($uid, null);
            return true;
        }

        if ($state === 'p2_yt_dl' || $state === 'p2_sp_dl') {
            $links = ($state === 'p2_yt_dl') ? Phase2Services::youtubeDownload($text) : Phase2Services::spotifyDownload($text);
            if (empty($links)) {
                $this->bot->sendMessage($chatId, "❌ لینک دانلودی یافت نشد.", $this->backBtn());
                return true;
            }
            $out = "✅ <b>لینک‌های دانلود آماده شد:</b>\n\n" . implode("\n\n", array_slice($links, 0, 8));
            $this->bot->sendMessage($chatId, $out, $this->backBtn());
            $this->chargeUser($state);
            $this->setState($uid, null);
            return true;
        }

        if ($state === 'p2_sp_search') {
            $res = Phase2Services::spotifySearch($text);
            $items = $res['data']['result'] ?? $res['data']['items'] ?? [];
            if (empty($items)) {
                $this->bot->sendMessage($chatId, "❌ آهنگی یافت نشد.", $this->backBtn('dl_spotify'));
                return true;
            }
            $out = ["🎵 <b>نتایج اسپاتیفای:</b>\n"];
            foreach (array_slice($items, 0, 8) as $it) {
                $title  = htmlspecialchars((string)($it['title'] ?? $it['name'] ?? ''));
                $artist = htmlspecialchars((string)($it['artist'] ?? $it['artists'][0]['name'] ?? ''));
                $u      = (string)($it['url'] ?? $it['link'] ?? '');
                $out[]  = "🎵 <b>$title</b> — $artist\n🔗 <code>$u</code>";
            }
            $this->bot->sendMessage($chatId, implode("\n\n", $out), $this->backBtn('dl_spotify'));
            $this->chargeUser('sp_search');
            $this->setState($uid, null);
            return true;
        }

        if ($state === 'p2_rj_search') {
            $res = Phase2Services::rjSearch($text);
            $d = $res['data'] ?? [];
            $out = ["📻 <b>نتایج رادیو جوان:</b>\n"];
            foreach (['music', 'video', 'podcast'] as $sec) {
                if (!empty($d[$sec]) && is_array($d[$sec])) {
                    $out[] = "── <b>" . strtoupper($sec) . "</b> ──";
                    foreach (array_slice($d[$sec], 0, 5) as $it) {
                        $t  = htmlspecialchars((string)($it['title'] ?? $it['name'] ?? ''));
                        $id = (string)($it['id'] ?? $it['media_id'] ?? '');
                        if ($t && $id) $out[] = "• $t | 🆔 کد: <code>$id</code>";
                    }
                }
            }
            if (count($out) === 1) $out[] = "موردی یافت نشد.";
            else $out[] = "\n💡 <i>کد (ID) را کپی کرده و در بخش دانلود MP3/MP4 رادیوجوان بفرستید.</i>";
            $this->bot->sendMessage($chatId, implode("\n", $out), $this->backBtn('dl_rj'));
            $this->chargeUser('rj_search');
            $this->setState($uid, null);
            return true;
        }

        if ($state === 'p2_rj_mp3' || $state === 'p2_rj_mp4') {
            $id = (int)preg_replace('~\D+~', '', $text);
            $act = ($state === 'p2_rj_mp3') ? 'mp3' : 'mp4';
            $links = Phase2Services::rjDownload($act, $id);
            if (empty($links)) {
                $this->bot->sendMessage($chatId, "❌ فایلی با این کد یافت نشد.", $this->backBtn('dl_rj'));
                return true;
            }
            $this->bot->sendMessage($chatId, "📻 <b>لینک‌های دانلود ($act):</b>\n\n" . implode("\n\n", $links), $this->backBtn('dl_rj'));
            $this->chargeUser("rj_$act");
            $this->setState($uid, null);
            return true;
        }

        // ۷. شازم، استخراج صدا و OCR
        if ($state === 'p2_shazam') {
            $this->bot->sendMessage($chatId, "🎤 در حال گوش دادن و شناسایی موزیک...");
            $res = Phase2Services::shazamRecognize($text);
            if (!$res['ok'] || ($res['title'] === '' && $res['download'] === '')) {
                $this->bot->sendMessage($chatId, "❌ متاسفانه آهنگ شناسایی نشد.", $this->backBtn());
                return true;
            }
            $cap = "🎵 عنوان: <b>" . htmlspecialchars($res['title']) . "</b>\n👤 خواننده: <b>" . htmlspecialchars($res['artist']) . "</b>";
            if ($res['download'] !== '') {
                $this->sendMediaUniversal('audio', $res['download'], $cap);
            } else {
                $this->bot->sendMessage($chatId, $cap, $this->backBtn());
            }
            $this->chargeUser('shazam');
            $this->setState($uid, null);
            return true;
        }

        if ($state === 'p2_ext_audio') {
            $this->bot->sendMessage($chatId, "🎧 در حال جداسازی صدا از ویدیو...");
            $audioUrl = Phase2Services::extractAudio($text);
            if ($audioUrl === '') {
                $this->bot->sendMessage($chatId, "❌ استخراج صدا ناموفق بود. مطمئن شوید لینک مستقیم MP4 است.", $this->backBtn('dl_ocr_audio'));
                return true;
            }
            $this->sendMediaUniversal('audio', $audioUrl, "🎧 صدای استخراج شده از ویدیو");
            $this->chargeUser('extract_audio');
            $this->setState($uid, null);
            return true;
        }

        if (strpos($state, 'p2_ocr:') === 0) {
            $lang = substr($state, 7);
            $this->bot->sendMessage($chatId, "📝 در حال خواندن و استخراج متن داخل تصویر...");
            $extracted = Phase2Services::extractOcr($text, $lang);
            if ($extracted === '') {
                $this->bot->sendMessage($chatId, "❌ متنی در این تصویر پیدا نشد.", $this->backBtn('dl_ocr_audio'));
                return true;
            }
            $this->bot->sendMessage($chatId, "📝 <b>متن استخراج شده:</b>\n\n<pre>" . htmlspecialchars(mb_substr($extracted, 0, 3800)) . "</pre>", $this->backBtn('dl_ocr_audio'));
            $this->chargeUser('ocr');
            $this->setState($uid, null);
            return true;
        }

        return false;
    }

    // متدهای کمکی وضعیت و دکمه بازگشت
    private function setState($uid, ?string $state): void {
        if (class_exists('MegaDB')) {
            MegaDB::setState($uid, $state);
        }
    }

    private function backBtn(string $backTo = 'cb_main_menu'): array {
        return [
            [['text' => '🔙 بازگشت', 'callback_data' => $backTo]]
        ];
    }
}
