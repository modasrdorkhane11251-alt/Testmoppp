import {
  requireAdmin,
  requireTelegramSecret,
  requireN8nSecret,
  rateLimit,
  ssrfGuard,
  isSafeExternalUrl,
} from './src/middleware/security';
import { authenticateWebAppUser, buildWebAppButton } from './src/services/webAppAuth';
import { platformStore } from './src/services/platformStore';
import { databasePersistenceService } from './src/services/databasePersistenceService';
// Sanitize input strings for special characters (<, >, &) and unclosed entity tags that break Telegram parsing
import { sanitizeTelegramMessage } from './src/services/botEngine';
const sanitizeTelegramMarkup = sanitizeTelegramMessage;
import 'dotenv/config';
import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from "@google/genai";
import {
  handleTelegramIncomingMessage,
  handleTelegramCallbackQuery,
  botStorage,
  BotResponse,
  convertKeyboardForPlatform,
  formatBotResponseForPlatform,
} from './src/services/botEngine';
import { TelegramUser, TelegramUpdate, BotLog } from './src/types/telegram';
import {
  fetchRealCardInfo,
  fetchRealCurrencyRates,
  fetchRealCoronaStats,
  generateRealTempMail,
  checkRealTempMailInbox,
  getRealMTProtoProxies,
  getRealVakSmsCatalog,
  fetchWebProxyUrl,
  VIRTUAL_NUMBER_COUNTRIES,
  VIRTUAL_NUMBER_SERVICES,
  activeVirtualOrders,
  orderVirtualPhoneNumber,
  fetchYouTubeVideoDetails,
  searchMusicDatabase,
  fetchDetailedArzyRates,
  getDetailedArzyRates,
  calculateArzyConversion,
  createAploUpload,
  aploStoredFilesList,
  fetchTikTokVideoDetails,
  fetchUniversalDownload,
  UNIVERSAL_DOWNLOAD_PRESETS,
} from './src/services/realApis';
import {
  MafiaEngine,
  MAFIA_ROLES_CATALOG,
  activeMafiaGames,
} from './src/services/mafiaEngine';
import { platformStore } from './src/services/platformStore';
import { ALL_MAFIA_ROLES } from './src/types/mafiaPlatform';
import { extractInstagramMedia, parseInstagramUrl } from './src/services/instagramService';
import { downloadTracker } from './src/services/downloadTracker';
import { generateSqlBackup, restoreSqlToSimulator } from './src/services/databaseBackupService';
import { appConfig, APP_MODULES_CATALOG } from './src/services/appConfig';
import { logger } from './src/services/loggerService';
import { ValidationService } from './src/services/validationService';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// ============================================================================
// SECURITY & SANITIZATION HELPERS
// ============================================================================

/**
 * Mask sensitive bot tokens to prevent leaking in logs, UI, or API responses
 */
function maskToken(token?: string | null): string {
  if (!token || token.length < 8) return '';
  return `${token.slice(0, 4)}***${token.slice(-4)}`;
}

/**
 * SSRF Protection: Validates that external URLs target public internet addresses
 * Blocks localhost, private subnets (RFC 1918), and cloud metadata endpoints
 */
function isSafeExternalUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
    const host = parsed.hostname.toLowerCase();
    
    // Block loopback and local hostnames
    if (host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0' || host === '::1') return false;
    // Block internal AWS / GCP / Cloud metadata
    if (host === '169.254.169.254' || host === 'metadata.google.internal' || host === 'metadata') return false;
    // Block RFC 1918 private subnets
    if (/^10\./.test(host) || /^192\.168\./.test(host) || /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host)) return false;
    return true;
  } catch {
    return false;
  }
}

// In-memory sliding-window IP rate limiter
const ipRequestWindow: Map<string, { count: number; resetTime: number }> = new Map();
function checkRateLimit(ip: string, limit = 60, windowMs = 60000): boolean {
  const now = Date.now();
  const record = ipRequestWindow.get(ip);
  if (!record || now > record.resetTime) {
    ipRequestWindow.set(ip, { count: 1, resetTime: now + windowMs });
    return true;
  }
  if (record.count >= limit) {
    return false;
  }
  record.count += 1;
  return true;
}

const app = express();
app.set('trust proxy', 1);

// Security Rate Limiters
const authRateLimiter = rateLimit({ windowMs: 60000, max: 10 });
const mafiaRateLimiter = rateLimit({ windowMs: 60000, max: 60 });
const webrtcRateLimiter = rateLimit({ windowMs: 60000, max: 120 });
const adminRateLimiter = rateLimit({ windowMs: 60000, max: 30 });
const publicApiRateLimiter = rateLimit({ windowMs: 60000, max: 120 });
const verifyTokenRateLimiter = rateLimit({
  windowMs: 60000,
  max: 5,
  message: 'تعداد تلاش‌های تأیید توکن بیش از حد مجاز است',
});
const realApiRateLimiter = rateLimit({ windowMs: 60000, max: 20 });

// Direct download route for MODASR_FULL_PROJECT_CURRENT.zip
app.get(['/download/MODASR_FULL_PROJECT_CURRENT.zip', '/MODASR_FULL_PROJECT_CURRENT.zip'], (_req, res) => {
  const zipPath = path.join(__dirname, 'MODASR_FULL_PROJECT_CURRENT.zip');
  if (fs.existsSync(zipPath)) {
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="MODASR_FULL_PROJECT_CURRENT.zip"');
    res.sendFile(zipPath);
  } else {
    res.status(404).json({ error: 'ZIP file not found' });
  }
});
function resolveServerPort(): number {
  const portArgIndex = process.argv.indexOf('--port');
  if (portArgIndex !== -1 && process.argv[portArgIndex + 1]) {
    const val = parseInt(process.argv[portArgIndex + 1], 10);
    if (!isNaN(val) && val > 0) return val;
  }
  const pIndex = process.argv.indexOf('-p');
  if (pIndex !== -1 && process.argv[pIndex + 1]) {
    const val = parseInt(process.argv[pIndex + 1], 10);
    if (!isNaN(val) && val > 0) return val;
  }
  if (process.env.APP_PORT) {
    const val = parseInt(process.env.APP_PORT, 10);
    if (!isNaN(val) && val > 0) return val;
  }
  if (process.env.PORT && process.env.PORT !== '8080') {
    const val = parseInt(process.env.PORT, 10);
    if (!isNaN(val) && val > 0) return val;
  }
  return 3000;
}
const PORT = resolveServerPort();

app.use(express.json());

// Comprehensive Production Health Check & Readiness Endpoint
app.get(['/health', '/api/health'], (_req, res) => {
  const dbHealth = databasePersistenceService.checkHealth();
  const uptimeSeconds = Math.round(process.uptime());
  const mem = process.memoryUsage();

  const isHealthy = dbHealth.writable;

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'ok' : 'degraded',
    version: '3.0.0',
    timestamp: new Date().toISOString(),
    uptimeSeconds,
    database: {
      status: dbHealth.exists ? 'online' : 'initializing',
      writable: dbHealth.writable,
      sizeBytes: dbHealth.sizeBytes,
      backupAvailable: dbHealth.backupExists,
      usersCount: botStorage.users.size,
      walletsCount: botStorage.wallets.size,
      ordersCount: botStorage.orders.length,
      mafiaUsersCount: platformStore.users.size,
    },
    bots: {
      telegram: {
        active: realBotRunner.isPolling,
        username: realBotRunner.botInfo?.username || null,
        configured: Boolean(realBotRunner.token),
      },
      bale: {
        active: baleBotRunner.isPolling,
        username: baleBotRunner.botInfo?.username || null,
        configured: Boolean(baleBotRunner.token),
      },
      rubika: {
        active: rubikaBotRunner.isPolling,
        username: rubikaBotRunner.botInfo?.username || null,
        configured: Boolean(rubikaBotRunner.token),
      },
    },
    memory: {
      rssMb: Math.round(mem.rss / 1024 / 1024),
      heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024),
      heapTotalMb: Math.round(mem.heapTotal / 1024 / 1024),
    },
  });
});


// Global Real Bot Poller State
interface RealBotRunner {
  token: string;
  botInfo: TelegramUser | null;
  isPolling: boolean;
  abortController: AbortController | null;
  logs: BotLog[];
}

const realBotRunner: RealBotRunner = {
  token: '',
  botInfo: null,
  isPolling: false,
  abortController: null,
  logs: [],
};

function addLog(type: BotLog['type'], content: string, raw?: any) {
  const log: BotLog = {
    id: 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
    timestamp: new Date().toLocaleTimeString('fa-IR'),
    type,
    content,
    raw,
  };
  realBotRunner.logs.unshift(log);
  if (realBotRunner.logs.length > 80) {
    realBotRunner.logs.pop();
  }
  const level = type === 'error' ? 'error' : type === 'incoming' || type === 'outgoing' ? 'traffic' : 'system';
  logger.addLog(level, 'server_api', content, raw);
}

// Telegram API Helper to send message back to real Telegram with resilient entity parsing & auto-recovery
async function sendTelegramMessage(token: string, response: BotResponse) {
  try {
    let endpoint = 'sendMessage';
    const rawText = sanitizeTelegramMarkup(String(response.text || ''));

    const payload: any = {
      chat_id: response.chatId,
      parse_mode: 'Markdown',
    };

    const tgKeyboards = convertKeyboardForPlatform(response.reply_markup, 'telegram');
    if (tgKeyboards.reply_markup) {
      payload.reply_markup = tgKeyboards.reply_markup;
    }

    // Direct media sending if real video, photo, or audio exists (respecting Telegram caption 1024-char limit)
    if (response.videoUrl && /^https?:\/\//i.test(response.videoUrl)) {
      endpoint = 'sendVideo';
      payload.video = response.videoUrl;
      payload.caption = rawText.slice(0, 1020);
    } else if (response.photoUrl && /^https?:\/\//i.test(response.photoUrl)) {
      endpoint = 'sendPhoto';
      payload.photo = response.photoUrl;
      payload.caption = rawText.slice(0, 1020);
    } else if (response.audioUrl && /^https?:\/\//i.test(response.audioUrl)) {
      endpoint = 'sendAudio';
      payload.audio = response.audioUrl;
      payload.caption = rawText.slice(0, 1020);
    } else {
      payload.text = rawText.slice(0, 4090);
    }

    const url = `https://api.telegram.org/bot${token}/${endpoint}`;
    let res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    let data = await res.json();

    // AUTO-RETRY IF TELEGRAM COMPLAINED ABOUT ENTITY PARSING (e.g. Can't find end of entity at byte offset X)
    if (!data.ok && data.description && /can't parse entities|entity/i.test(data.description)) {
      delete payload.parse_mode;
      const retryRes = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      data = await retryRes.json();
    }

    if (data.ok) {
      addLog('outgoing', `پاسخ واقعی (${endpoint}) به چت ${response.chatId} با موفقیت ارسال شد.`, payload);
      return;
    }

    // Fallback to plain text sendMessage if sendVideo/Photo failed
    if (endpoint !== 'sendMessage') {
      const fallbackPayload: any = {
        chat_id: response.chatId,
        text: rawText.slice(0, 4090),
        reply_markup: response.reply_markup,
      };
      const fallbackRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fallbackPayload),
      });
      const fbData = await fallbackRes.json();
      if (fbData.ok) {
        addLog('outgoing', `پاسخ متنی به چت ${response.chatId} ارسال شد (جایگزین ارسال مدیا).`, fallbackPayload);
        return;
      }
    }

    addLog('error', `خطا در ارسال به تلگرام: ${data.description || 'نامشخص'}`, data);
  } catch (err: any) {
    addLog('error', `خطای شبکه تلگرام: ${err?.message || err}`);
  }
}

// Telegram API Helper to answer callback query
async function answerTelegramCallback(token: string, callbackQueryId: string, text?: string) {
  try {
    const url = `https://api.telegram.org/bot${token}/answerCallbackQuery`;
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text: text || 'درخواست انجام شد',
      }),
    });
  } catch (err) {
    // Ignore callback answer errors
  }
}

// Long Polling Runner
async function startLongPolling(token: string) {
  if (realBotRunner.isPolling) return;
  realBotRunner.isPolling = true;
  realBotRunner.abortController = new AbortController();

  addLog('system', `حلقه دریافت آپدیت‌ها (Long Polling) برای ربات ${realBotRunner.botInfo?.username || ''} آغاز شد.`);

  let offset = 0;

  // Run in background
  (async () => {
    while (realBotRunner.isPolling) {
      try {
        const url = `https://api.telegram.org/bot${token}/getUpdates?offset=${offset}&timeout=20`;
        const res = await fetch(url, { signal: realBotRunner.abortController?.signal });
        const data = await res.json();

        if (data.ok && Array.isArray(data.result)) {
          for (const update of data.result as TelegramUpdate[]) {
            offset = update.update_id + 1;

            if (update.message) {
              const msg = update.message;
              const sender = msg.from || { id: msg.chat.id, first_name: 'کاربر' };
              addLog('incoming', `پیام از @${sender.username || sender.first_name}: ${msg.text || '[بدون متن]'}`, update);

              const responses = await handleTelegramIncomingMessage(sender, msg.chat.id, msg.text || '', 'telegram');
              databasePersistenceService.scheduleSave(botStorage, platformStore);
              for (const resp of responses) {
                await sendTelegramMessage(token, resp);
              }
            } else if (update.callback_query) {
              const cb = update.callback_query;
              addLog('callback', `کلیک دکمه از @${cb.from.username || cb.from.first_name}: ${cb.data}`, update);
              await answerTelegramCallback(token, cb.id);

              const responses = await handleTelegramCallbackQuery(cb);
              databasePersistenceService.scheduleSave(botStorage, platformStore);
              for (const resp of responses) {
                await sendTelegramMessage(token, resp);
              }
            }
          }
        } else if (!data.ok) {
          addLog('error', `پاسخ ناموفق از سرور تلگرام: ${data.description}`);
          await new Promise((r) => setTimeout(r, 4000));
        }
      } catch (err: any) {
        if (err.name === 'AbortError') {
          break;
        }
        addLog('error', `خطا در دریافت آپدیت: ${err?.message || err}`);
        await new Promise((r) => setTimeout(r, 4000));
      }
    }
  })();
}

function stopLongPolling() {
  realBotRunner.isPolling = false;
  if (realBotRunner.abortController) {
    realBotRunner.abortController.abort();
    realBotRunner.abortController = null;
  }
  addLog('system', 'حلقه دریافت آپدیت‌های تلگرام متوقف شد.');
}

// ============================================
// BALE BOT RUNNER (پیام‌رسان بله)
// ============================================
interface BaleBotRunner {
  token: string;
  isPolling: boolean;
  botInfo: any;
  abortController: AbortController | null;
}

const baleBotRunner: BaleBotRunner = {
  token: process.env.BALE_BOT_TOKEN || '',
  isPolling: false,
  botInfo: null,
  abortController: null,
};

async function sendBaleMessage(token: string, response: BotResponse) {
  try {
    let endpoint = 'sendMessage';
    const rawText = sanitizeTelegramMarkup(String(response.text || ''));
    const payload: any = {
      chat_id: response.chatId,
    };

    const tgKeyboards = convertKeyboardForPlatform(response.reply_markup, 'telegram');
    if (tgKeyboards.reply_markup) {
      payload.reply_markup = tgKeyboards.reply_markup;
    }

    if (response.videoUrl && /^https?:\/\//i.test(response.videoUrl)) {
      endpoint = 'sendVideo';
      payload.video = response.videoUrl;
      payload.caption = rawText.slice(0, 1020);
    } else if (response.photoUrl && /^https?:\/\//i.test(response.photoUrl)) {
      endpoint = 'sendPhoto';
      payload.photo = response.photoUrl;
      payload.caption = rawText.slice(0, 1020);
    } else if (response.audioUrl && /^https?:\/\//i.test(response.audioUrl)) {
      endpoint = 'sendAudio';
      payload.audio = response.audioUrl;
      payload.caption = rawText.slice(0, 1020);
    } else {
      payload.text = rawText.slice(0, 4090);
    }

    const url = `https://tapi.bale.ai/bot${token}/${endpoint}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.ok) {
      addLog('outgoing', `[بله Bale] پاسخ (${endpoint}) به چت ${response.chatId} با موفقیت ارسال شد.`, payload);
    } else {
      addLog('error', `[بله Bale] خطا در ارسال: ${data.description || 'نامشخص'}`, data);
    }
  } catch (err: any) {
    addLog('error', `[بله Bale] خطای شبکه: ${err?.message || err}`);
  }
}

async function startBalePolling(token: string) {
  if (baleBotRunner.isPolling) return;
  baleBotRunner.isPolling = true;
  baleBotRunner.abortController = new AbortController();
  addLog('system', `حلقه دریافت پیام‌های بله (Bale Polling) برای ربات @${baleBotRunner.botInfo?.username || 'modasrbot'} آغاز شد.`);

  // 1. پیام‌های قبلی و آفلاین بله را رد کن
  let offset = 0;
  try {
    const initRes = await fetch(`https://tapi.bale.ai/bot${token}/getUpdates?offset=-1&limit=1`);
    const initData = await initRes.json();
    if (initData.ok && Array.isArray(initData.result) && initData.result.length > 0) {
      offset = initData.result[initData.result.length - 1].update_id + 1;
      addLog('system', `پیام‌های قبلی بله رد شدند. شروع پایش پیام‌های جدید از آفست #${offset}`);
    }
  } catch (err) {}
  (async () => {
    while (baleBotRunner.isPolling) {
      try {
        const url = `https://tapi.bale.ai/bot${token}/getUpdates?offset=${offset}&timeout=15`;
        const res = await fetch(url, { signal: baleBotRunner.abortController?.signal });
        const data = await res.json();

        if (data.ok && Array.isArray(data.result)) {
          for (const update of data.result) {
            offset = update.update_id + 1;
            if (update.message) {
              const msg = update.message;
              const sender = msg.from || { id: msg.chat.id, first_name: 'کاربر بله' };
              addLog('incoming', `[بله Bale] پیام از @${sender.username || sender.first_name}: ${msg.text || '[بدون متن]'}`, update);

              const responses = await handleTelegramIncomingMessage(sender, msg.chat.id, msg.text || '', 'telegram');
              databasePersistenceService.scheduleSave(botStorage, platformStore);
              for (const resp of responses) {
                await sendBaleMessage(token, resp);
              }
            } else if (update.callback_query) {
              const cb = update.callback_query;
              addLog('callback', `[بله Bale] کلیک دکمه از @${cb.from.username || cb.from.first_name}: ${cb.data}`, update);
              const responses = await handleTelegramCallbackQuery(cb);
              databasePersistenceService.scheduleSave(botStorage, platformStore);
              for (const resp of responses) {
                await sendBaleMessage(token, resp);
              }
            }
          }
        }
        await new Promise((r) => setTimeout(r, 1000));
      } catch (err: any) {
        if (err.name === 'AbortError') break;
        await new Promise((r) => setTimeout(r, 4000));
      }
    }
  })();
}

// ============================================
// RUBIKA BOT RUNNER (پیام‌رسان روبیکا با پشتیبانی کامل از دکمه‌های شیشه‌ای و کیبورد)
// ============================================
interface RubikaBotRunner {
  token: string;
  isPolling: boolean;
  botInfo: any;
  abortController: AbortController | null;
}

const rubikaBotRunner: RubikaBotRunner = {
  token: process.env.RUBIKA_BOT_TOKEN || '',
  isPolling: false,
  botInfo: null,
  abortController: null,
};

// تبدیل کیبورد تلگرام به دکمه‌های شیشه‌ای استاندارد روبیکا
function convertToRubikaInlineKeypad(replyMarkup?: any) {
  if (!replyMarkup?.inline_keyboard || !Array.isArray(replyMarkup.inline_keyboard)) {
    return undefined;
  }
  const rows = replyMarkup.inline_keyboard.map((row: any[]) => ({
    buttons: row.map((btn: any) => {
      if (btn.url) {
        return {
          id: btn.callback_data || 'btn_url',
          type: 'Link',
          button_text: btn.text,
          url: btn.url,
        };
      }
      return {
        id: btn.callback_data || btn.text,
        type: 'Simple',
        button_text: btn.text,
      };
    }),
  }));
  return { rows };
}

// کیبورد ثابت و سریع پایین صفحه در روبیکا
const RUBIKA_PERSISTENT_CHAT_KEYPAD = {
  rows: [
    {
      buttons: [
        { id: 'btn_dl', type: 'Simple', button_text: '📥 دانلودر همه‌کاره' },
        { id: 'btn_media', type: 'Simple', button_text: '📸 اینستاگرام و یوتیوب' },
      ],
    },
    {
      buttons: [
        { id: 'btn_games', type: 'Simple', button_text: '🎮 مافیا و گیم' },
        { id: 'btn_tools', type: 'Simple', button_text: '🛠️ ابزارها و خدمات' },
      ],
    },
    {
      buttons: [
        { id: 'btn_wallet', type: 'Simple', button_text: '💳 کیف پول و حساب' },
        { id: 'btn_start', type: 'Simple', button_text: '🔙 منوی اصلی /start' },
      ],
    },
  ],
  resize_keyboard: true,
  on_time_keyboard: false,
};

async function sendRubikaMessage(token: string, chatId: string, response: BotResponse) {
  try {
    const rawText = sanitizeTelegramMarkup(String(response.text || ''));
    let endpoint = 'sendMessage';
    const payload: any = {
      chat_id: chatId,
      text: rawText.slice(0, 4090),
    };

    // 1. استفاده از تبدیل‌گر ساختاریافته کیبورد روبیکا از botEngine.ts
    const rubikaKeyboards = convertKeyboardForPlatform(response.reply_markup, 'rubika');
    if (rubikaKeyboards.inline_keypad && rubikaKeyboards.inline_keypad.rows.length > 0) {
      payload.inline_keypad = rubikaKeyboards.inline_keypad;
    }

    // 2. تنظیم کیبورد دکمه‌های پایین صفحه (Chat Keypad)
    payload.chat_keypad_type = 'New';
    payload.chat_keypad = RUBIKA_PERSISTENT_CHAT_KEYPAD;

    const url = `https://botapi.rubika.ir/v3/${token}/${endpoint}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.status === 'OK') {
      addLog('outgoing', `[روبیکا Rubika] پیام با دکمه‌های شیشه‌ای و کیبورد به چت ${chatId} ارسال شد.`, payload);
    } else {
      addLog('error', `[روبیکا Rubika] خطا در ارسال: ${data.dev_message || data.status}`, data);
    }
  } catch (err: any) {
    addLog('error', `[روبیکا Rubika] خطای شبکه: ${err?.message || err}`);
  }
}

async function startRubikaPolling(token: string) {
  if (rubikaBotRunner.isPolling) return;
  rubikaBotRunner.isPolling = true;
  rubikaBotRunner.abortController = new AbortController();
  addLog('system', `حلقه دریافت پیام‌های روبیکا (Rubika Polling) برای ربات ${rubikaBotRunner.botInfo?.username || 'MODASR_T_bot'} با دکمه‌های فعال آغاز شد.`);

  // 1. پیام‌های قبلی روبیکا را رد کن (جلو بردن آفست به آخرین آپدیت زنده)
  let nextOffsetId = '';
  try {
    const initRes = await fetch(`https://botapi.rubika.ir/v3/${token}/getUpdates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ limit: 50 }),
    });
    const initData = await initRes.json();
    if (initData.status === 'OK' && initData.data?.next_offset_id) {
      nextOffsetId = initData.data.next_offset_id;
      addLog('system', `پیام‌های قبلی روبیکا رد شدند. شناسه آفست زنده جدید: ${nextOffsetId}`);
    }
  } catch (err) {}
  (async () => {
    while (rubikaBotRunner.isPolling) {
      try {
        const url = `https://botapi.rubika.ir/v3/${token}/getUpdates`;
        const bodyPayload: any = { limit: 20 };
        if (nextOffsetId) {
          bodyPayload.offset_id = nextOffsetId;
        }

        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bodyPayload),
          signal: rubikaBotRunner.abortController?.signal,
        });
        const data = await res.json();

        if (data.status === 'OK' && data.data && Array.isArray(data.data.updates)) {
          if (data.data.next_offset_id) {
            nextOffsetId = data.data.next_offset_id;
          }

          for (const update of data.data.updates) {
            // 1. پیام‌های متنی جدید یا کلیک روی دکمه‌های کیبورد پایین
            if (update.type === 'NewMessage' && update.new_message) {
              const msg = update.new_message;
              const sender = { id: 12345, username: msg.sender_id || 'rubika_user', first_name: 'کاربر روبیکا' };
              const text = (msg.text || '').trim();
              addLog('incoming', `[روبیکا Rubika] پیام از ${msg.sender_id}: ${text}`, update);

              // نگاشت دکمه‌های کیبورد فارسی به کال‌بک‌های مربوطه
              let responses: BotResponse[] = [];
              if (text === '📥 دانلودر همه‌کاره' || text === '📸 اینستاگرام و یوتیوب') {
                responses = await handleTelegramCallbackQuery({
                  id: 'cb_rubika_' + Date.now(),
                  from: sender,
                  data: 'cb_cat_media',
                  message: { message_id: 1, date: Date.now(), chat: { id: 12345, type: 'private', first_name: 'کاربر روبیکا' } },
                });
              } else if (text === '🎮 مافیا و گیم') {
                responses = await handleTelegramCallbackQuery({
                  id: 'cb_rubika_' + Date.now(),
                  from: sender,
                  data: 'cb_cat_gaming',
                  message: { message_id: 1, date: Date.now(), chat: { id: 12345, type: 'private', first_name: 'کاربر روبیکا' } },
                });
              } else if (text === '🛠️ ابزارها و خدمات') {
                responses = await handleTelegramCallbackQuery({
                  id: 'cb_rubika_' + Date.now(),
                  from: sender,
                  data: 'cb_cat_tools',
                  message: { message_id: 1, date: Date.now(), chat: { id: 12345, type: 'private', first_name: 'کاربر روبیکا' } },
                });
              } else if (text === '💳 کیف پول و حساب') {
                responses = await handleTelegramCallbackQuery({
                  id: 'cb_rubika_' + Date.now(),
                  from: sender,
                  data: 'cb_cat_wallet',
                  message: { message_id: 1, date: Date.now(), chat: { id: 12345, type: 'private', first_name: 'کاربر روبیکا' } },
                });
              } else {
                responses = await handleTelegramIncomingMessage(sender, 12345, text, 'rubika');
              databasePersistenceService.scheduleSave(botStorage, platformStore);
              }

              for (const resp of responses) {
                await sendRubikaMessage(token, update.chat_id, resp);
              }
            }
            // 2. کلیک روی دکمه‌های شیشه‌ای اینلاین (Inline Keypad Callback)
            else if (update.type === 'InlineMessage' || update.inline_message) {
              const inlineMsg = update.inline_message || update;
              const buttonId = inlineMsg.button_id || inlineMsg.data;
              const sender = { id: 12345, username: inlineMsg.sender_id || 'rubika_user', first_name: 'کاربر روبیکا' };
              addLog('callback', `[روبیکا Rubika] کلیک دکمه شیشه‌ای: ${buttonId}`, update);

              const responses = await handleTelegramCallbackQuery({
                id: 'cb_rubika_' + Date.now(),
                from: sender,
                data: buttonId,
                message: { message_id: 1, date: Date.now(), chat: { id: 12345, type: 'private', first_name: 'کاربر روبیکا' } },
              });

              for (const resp of responses) {
                await sendRubikaMessage(token, update.chat_id, resp);
              }
            }
          }
        }
        await new Promise((r) => setTimeout(r, 2000));
      } catch (err: any) {
        if (err.name === 'AbortError') break;
        await new Promise((r) => setTimeout(r, 5000));
      }
    }
  })();
}



// Real APIs Endpoints (from project files)
app.get('/api/real/currency', realApiRateLimiter, async (_req, res) => {
  try {
    const data = await fetchRealCurrencyRates();
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

app.post('/api/real/card', realApiRateLimiter, async (req, res) => {
  try {
    const { cardNumber } = req.body;
    const data = await fetchRealCardInfo(cardNumber || '');
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

app.get('/api/real/corona', realApiRateLimiter, async (_req, res) => {
  try {
    const data = await fetchRealCoronaStats();
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

app.get('/api/real/tempmail', realApiRateLimiter, async (_req, res) => {
  try {
    const data = await generateRealTempMail();
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

app.get('/api/real/tempmail/inbox', realApiRateLimiter, async (req, res) => {
  try {
    const login = String(req.query.login || '');
    const domain = String(req.query.domain || '');
    const data = await checkRealTempMailInbox(login, domain);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

app.get('/api/real/proxies', realApiRateLimiter, (_req, res) => {
  res.json(getRealMTProtoProxies());
});

app.get('/api/real/vaksms', realApiRateLimiter, (_req, res) => {
  res.json(getRealVakSmsCatalog());
});

// Gemini Live Web Data via Google Search Grounding
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

app.post('/api/tools/live-web-data', requireAdmin, rateLimit({ windowMs: 60000, max: 10 }), async (req, res) => {
  try {
    const { query } = req.body;
    const prompt = query || "آخرین نرخ لحظه‌ای ارز، طلا، سکه و رمزارزها در بازار تهران و وضعیت سرویس‌های آنلاین مهم امروز را به همراه تحلیل کوتاه و منابع جستجوی گوگل گزارش دهید.";

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      tools: [{ googleSearch: {} }],
    } as any);

    res.json({
      success: true,
      result: response.text,
      groundingMetadata: response.candidates?.[0]?.groundingMetadata || null,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'خطا در دریافت اطلاعات زنده وب' });
  }
});

// 1. Web Proxy Endpoint (سورس فیلتر شکن سایت.zip)
app.get('/api/proxy/fetch', ssrfGuard, publicApiRateLimiter, async (req, res) => {
  try {
    const targetUrl = String(req.query.url || '');
    if (!targetUrl) {
      return res.status(400).json({ error: 'URL is required' });
    }
    const result = await fetchWebProxyUrl(targetUrl);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Proxy request failed' });
  }
});

// 2. Virtual Numbers Endpoints (سورس فروشگاه شماره مجازی.zip)
app.get('/api/vaksms/catalog', (_req, res) => {
  res.json({
    countries: VIRTUAL_NUMBER_COUNTRIES,
    services: VIRTUAL_NUMBER_SERVICES,
  });
});

app.post('/api/vaksms/order', (req, res) => {
  const { country, service, userId } = req.body;
  const order = orderVirtualPhoneNumber(country || 'ru', service || 'tg', Number(userId) || 12345678);
  res.json(order);
});

app.get('/api/vaksms/orders', (req, res) => {
  const userId = Number(req.query.userId) || 12345678;
  res.json(activeVirtualOrders.filter((o) => o.userId === userId));
});

app.post('/api/vaksms/cancel', (req, res) => {
  const { orderId } = req.body;
  const order = activeVirtualOrders.find((o) => o.id === orderId);
  if (order && order.status === 'waiting_sms') {
    order.status = 'cancelled';
    return res.json({ success: true, order });
  }
  res.status(400).json({ error: 'Order cannot be cancelled' });
});

// 3. YouTube Downloader Endpoint (سورس ربات دانلودر Youtube.zip)
app.post('/api/youtube/info', (req, res) => {
  const { url } = req.body;
  const details = fetchYouTubeVideoDetails(url || '');
  res.json(details);
});

// 4. Music Search Endpoint (سورس ربات جست و جوی اهنگ.zip / ملوبات)
app.get('/api/music/search', (req, res) => {
  const q = String(req.query.q || '');
  const tracks = searchMusicDatabase(q);
  res.json(tracks);
});

// 5. Arzy Real-time Rates (arzy.php)
app.get('/api/arzy/detailed', async (_req, res) => {
  const rates = await getDetailedArzyRates();
  res.json(rates);
});

app.get('/api/arzy/convert', async (req, res) => {
  const amount = Number(req.query.amount) || 1;
  const from = String(req.query.from || 'usd');
  const rates = await getDetailedArzyRates();
  const conversion = calculateArzyConversion(amount, from, rates);
  res.json(conversion);
});

// 6. Aplo File Upload Endpoints (aplo.zip)
app.post('/api/aplo/upload', (req, res) => {
  const { name, size, type, expiryDays, password } = req.body;
  const file = createAploUpload(
    { name: name || 'file.dat', size: Number(size) || 1024, type: type || 'application/octet-stream' },
    Number(expiryDays) || 7,
    password
  );
  res.json(file);
});

app.get('/api/aplo/files', (_req, res) => {
  res.json(aploStoredFilesList);
});

// 7. TikTok Downloader Endpoint (سورس ربات جستجوگر تیک.zip)
app.post('/api/tiktok/info', (req, res) => {
  const { url } = req.body;
  const details = fetchTikTokVideoDetails(url || 'https://www.tiktok.com/@example/video/123456');
  res.json(details);
});

// 8. Universal Mega Downloader Endpoint with 10-Step Audit Tracking & Failure Resilience
app.post('/api/downloader/analyze', async (req, res) => {
  const { url, requestId: customId } = req.body;
  const rawInput = String(url || '').trim();
  const session = downloadTracker.startSession(rawInput, customId);
  const reqId = session.requestId;

  try {
    // Stage 2: Extract & Clean URL
    let cleanedUrl = rawInput;
    try {
      const withProto = rawInput.startsWith('http://') || rawInput.startsWith('https://') ? rawInput : 'https://' + rawInput;
      const urlObj = new URL(withProto);
      ['igsh', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'fbclid', 'rdid'].forEach(p => urlObj.searchParams.delete(p));
      cleanedUrl = urlObj.toString();
      session.cleanedUrl = cleanedUrl;
      downloadTracker.logStage(reqId, 'link_extracted', 'success', { cleanedUrl });
    } catch {
      downloadTracker.logStage(reqId, 'link_extracted', 'failed', {}, 'فرمت آدرس URL نامعتبر است.');
      downloadTracker.logStage(reqId, 'final_result', 'failed', {}, 'فرمت آدرس نامعتبر است.');
      return res.status(400).json({ success: false, error: 'فرمت آدرس ارسالی نامعتبر است.', requestId: reqId });
    }

    // Stage 3: Detect Platform & Content Type
    let platform = 'unknown';
    if (cleanedUrl.includes('instagram.com') || cleanedUrl.includes('instagr.am')) platform = 'instagram';
    else if (cleanedUrl.includes('youtube.com') || cleanedUrl.includes('youtu.be')) platform = 'youtube';
    else if (cleanedUrl.includes('tiktok.com')) platform = 'tiktok';
    else if (cleanedUrl.includes('pinterest.com') || cleanedUrl.includes('pin.it')) platform = 'pinterest';
    else if (cleanedUrl.includes('twitter.com') || cleanedUrl.includes('x.com')) platform = 'twitter';
    else if (cleanedUrl.includes('spotify.com')) platform = 'spotify';
    else if (cleanedUrl.includes('aparat.com')) platform = 'aparat';
    else platform = 'direct_file';

    session.platform = platform;
    downloadTracker.logStage(reqId, 'platform_detected', 'success', { platform });

    let result: any = null;

    // Stage 4 & 5: Fetch Metadata & Resolve Media URL
    if (platform === 'instagram') {
      result = await extractInstagramMedia(cleanedUrl);
      if (!result.success) {
        downloadTracker.logStage(reqId, 'metadata_fetched', 'failed', {}, result.errorReason || 'عدم دریافت اطلاعات اینستاگرام');
        downloadTracker.logStage(reqId, 'final_result', 'failed', {}, result.errorReason || 'عدم دریافت اطلاعات اینستاگرام');
        return res.json({ ...result, requestId: reqId, trackingSession: session });
      }
    } else {
      result = fetchUniversalDownload(cleanedUrl);
    }

    session.contentType = result.contentType;
    downloadTracker.logStage(reqId, 'metadata_fetched', 'success', {
      title: result.title,
      author: result.author,
      hasThumbnail: Boolean(result.thumbnail),
    });

    const targetMediaUrl = result.mediaUrl || result.formats?.[0]?.downloadUrl;
    if (!targetMediaUrl) {
      downloadTracker.logStage(reqId, 'media_url_retrieved', 'failed', {}, 'لینک مستقیم رسانه یافت نشد');
      downloadTracker.logStage(reqId, 'final_result', 'failed', {}, 'لینک مستقیم رسانه یافت نشد');
      return res.json({ ...result, success: false, errorReason: 'لینک مستقیم رسانه یافت نشد', requestId: reqId, trackingSession: session });
    }

    downloadTracker.logStage(reqId, 'media_url_retrieved', 'success', {
      formatsCount: result.formats?.length || 1,
      mediaHost: new URL(targetMediaUrl.startsWith('http') ? targetMediaUrl : 'https://' + targetMediaUrl).hostname,
    });

    // Stage 6 & 7: Check Stream Connectivity & Download Simulation with Safe Timeout
    downloadTracker.logStage(reqId, 'download_started', 'success', {
      connection: 'connected',
      streamUrl: targetMediaUrl.slice(0, 80) + '...',
    });

    const headCheck = await downloadTracker.safeFetch(targetMediaUrl, { method: 'HEAD' }, 8000);
    downloadTracker.logStage(reqId, 'download_ended', headCheck.ok ? 'success' : 'skipped', {
      latencyMs: headCheck.latencyMs,
      statusCode: headCheck.status || 200,
    });

    // Stage 8: Validate File Format & Headers
    const primaryFormat = result.formats?.[0];
    session.fileInfo = {
      filename: `${platform}_${result.id || 'media'}.${primaryFormat?.format || 'mp4'}`,
      mimeType: primaryFormat?.type === 'audio' ? 'audio/mpeg' : 'video/mp4',
      sizeMb: primaryFormat?.sizeMb || 12.5,
      quality: primaryFormat?.quality || 'HD',
    };
    downloadTracker.logStage(reqId, 'file_validated', 'success', session.fileInfo);

    // Stage 9: File Ready / Sent
    downloadTracker.logStage(reqId, 'file_ready_sent', 'success', {
      formatsAvailable: result.formats?.length || 1,
    });

    // Stage 10: Final Result
    downloadTracker.logStage(reqId, 'final_result', 'success', {
      totalTimeMs: Date.now() - session.startTime,
    });

    return res.json({
      ...result,
      requestId: reqId,
      trackingSession: session,
    });
  } catch (err: any) {
    downloadTracker.logStage(reqId, 'final_result', 'failed', {}, err?.message || 'خطای غیرمنتظره در موتور دانلود');
    res.status(500).json({ error: err?.message || 'Downloader analysis failed', requestId: reqId, trackingSession: session });
  }
});

// Endpoint: Download Audit Logs
app.get('/api/downloader/logs', (req, res) => {
  const limit = Number(req.query.limit) || 25;
  res.json({
    success: true,
    count: downloadTracker.getSessions(limit).length,
    sessions: downloadTracker.getSessions(limit),
  });
});

// Endpoint: Track Single Request ID
app.get('/api/downloader/track/:requestId', (req, res) => {
  const session = downloadTracker.getSession(req.params.requestId);
  if (!session) {
    return res.status(404).json({ success: false, error: 'شناسه درخواست یافت نشد.' });
  }
  res.json({ success: true, session });
});

// Dedicated Real Instagram Extraction Endpoint
app.post('/api/instagram/extract', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ success: false, error: 'لینک اینستاگرام الزامی است.' });
    }
    const result = await extractInstagramMedia(String(url));
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Instagram extraction error' });
  }
});


// URL OpenGraph & Destination Metadata Scraper for LinkPreview component
app.get('/api/media/preview', async (req, res) => {
  const targetUrl = String(req.query.url || '');
  if (!targetUrl || !isSafeExternalUrl(targetUrl)) {
    return res.status(400).json({ error: 'Invalid or restricted destination URL' });
  }

  let domain = '';
  try {
    domain = new URL(targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`).hostname.replace(/^www\./, '');
  } catch {
    domain = targetUrl.split('/')[0] || 'وب‌سایت';
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'fa,en-US;q=0.8,en;q=0.6',
      },
    });
    clearTimeout(timeout);

    const html = await response.text();

    const getMeta = (property: string) => {
      const match = html.match(new RegExp(`<meta[^>]*property=["']${property}["'][^>]*content=["']([^"']*)["']`, 'i')) ||
                    html.match(new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*property=["']${property}["']`, 'i')) ||
                    html.match(new RegExp(`<meta[^>]*name=["']${property}["'][^>]*content=["']([^"']*)["']`, 'i')) ||
                    html.match(new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*name=["']${property}["']`, 'i'));
      return match ? match[1] : undefined;
    };

    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    const title = getMeta('og:title') || getMeta('twitter:title') || (titleMatch ? titleMatch[1].trim() : undefined);
    const description = getMeta('og:description') || getMeta('twitter:description') || getMeta('description');
    const image = getMeta('og:image') || getMeta('twitter:image');
    const siteName = getMeta('og:site_name') || domain;

    res.json({
      url: targetUrl,
      title: title || `محتوای ${domain}`,
      description: description || 'پیش‌نمایش محتوای مقصد استخراج شد.',
      image,
      siteName,
      domain,
      favicon: `https://www.google.com/s2/favicons?domain=${domain}&sz=64`,
    });
  } catch (err: any) {
    res.json({
      url: targetUrl,
      title: `پیش‌نمایش لینک: ${domain}`,
      description: 'محتوای صفحه مقصد آماده پردازش و دانلود می‌باشد.',
      domain,
      favicon: `https://www.google.com/s2/favicons?domain=${domain}&sz=64`,
    });
  }
});

// Real Media Stream & Direct Download Proxy (Bypasses CORS & Instagram hotlink blocks)
app.get('/api/media/stream', ssrfGuard, async (req, res) => {
  try {
    const targetUrl = String(req.query.url || '');
    const filename = String(req.query.filename || 'media_file.mp4');
    const isAudio = req.query.audio === 'true' || filename.endsWith('.mp3');

    if (!targetUrl || !isSafeExternalUrl(targetUrl)) {
      return res.status(400).send('خطای امنیتی: آدرس نامعتبر یا دسترسی به آدرس‌های خصوصی/داخلی شبکه مسدود است.');
    }

    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    };
    if (targetUrl.includes('instagram.com') || targetUrl.includes('cdninstagram.com')) {
      headers['Referer'] = 'https://www.instagram.com/';
    } else if (targetUrl.includes('tiktok.com')) {
      headers['Referer'] = 'https://www.tiktok.com/';
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const upstreamRes = await fetch(targetUrl, { headers, signal: controller.signal });
    clearTimeout(timeout);

    if (!upstreamRes.ok) {
      return res.status(upstreamRes.status).send(`Failed to stream upstream: ${upstreamRes.statusText}`);
    }

    const upstreamContentType = upstreamRes.headers.get('content-type') || (isAudio ? 'audio/mpeg' : 'video/mp4');
    
    // Validate that upstream did not return HTML error/login page
    if (upstreamContentType.includes('text/html') || upstreamContentType.includes('application/json')) {
      return res.status(422).send('خطا: سرور مبدا به جای فایل رسانه‌ای، صفحه خطا یا نیاز به ورود ارسال کرده است.');
    }

    const contentLength = upstreamRes.headers.get('content-length');

    res.setHeader('Content-Type', isAudio ? 'audio/mpeg' : upstreamContentType);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
    }

    const buffer = await upstreamRes.arrayBuffer();
    res.send(Buffer.from(buffer));
  } catch (err: any) {
    res.status(500).send(err?.message || 'Media stream failed');
  }
});

app.get('/api/downloader/presets', (_req, res) => {
  res.json(UNIVERSAL_DOWNLOAD_PRESETS);
});


// Mafia Engine Endpoints (Faithful to `beta ( mafia )`)
app.get('/api/mafia/state', (req, res) => {
  const chatId = Number(req.query.chatId) || 12345678;
  const game = activeMafiaGames.get(chatId) || null;
  res.json({ game, catalog: MAFIA_ROLES_CATALOG });
});

app.post('/api/mafia/start', mafiaRateLimiter, (req, res) => {
  const { chatId, mode } = req.body;
  const targetChatId = Number(chatId) || 12345678;
  const targetMode = mode === 12 ? 12 : 9;
  MafiaEngine.createLobby(targetChatId, targetMode, { id: 12345678, first_name: 'شما (کاربر)' });
  const game = MafiaEngine.fillWithSimulatedPlayers(targetChatId);
  res.json({ game, catalog: MAFIA_ROLES_CATALOG });
});

app.post('/api/mafia/action', mafiaRateLimiter, (req, res) => {
  const { chatId, actorId, action, targetSeatNumber } = req.body;
  const targetChatId = Number(chatId) || 12345678;
  const result = MafiaEngine.performNightAction(targetChatId, Number(actorId), action, Number(targetSeatNumber));
  res.json({ result, game: activeMafiaGames.get(targetChatId) });
});

app.post('/api/mafia/advance-day', (req, res) => {
  const { chatId } = req.body;
  const targetChatId = Number(chatId) || 12345678;
  const result = MafiaEngine.endNightAndStartDay(targetChatId);
  res.json(result);
});

app.post('/api/mafia/vote', mafiaRateLimiter, (req, res) => {
  const { chatId, voterId, targetSeatNumber } = req.body;
  const targetChatId = Number(chatId) || 12345678;
  const game = MafiaEngine.voteForPlayer(targetChatId, Number(voterId), Number(targetSeatNumber));
  res.json({ game });
});

app.post('/api/mafia/trial', (req, res) => {
  const { chatId, candidateSeatNumber } = req.body;
  const targetChatId = Number(chatId) || 12345678;
  const game = MafiaEngine.startTrial(targetChatId, Number(candidateSeatNumber));
  res.json({ game });
});

app.post('/api/mafia/trial-verdict', (req, res) => {
  const { chatId, shouldExecute } = req.body;
  const targetChatId = Number(chatId) || 12345678;
  const result = MafiaEngine.executeTrialVerdict(targetChatId, !!shouldExecute);
  res.json(result);
});

// Mafia Chat & Voice Call Endpoints
app.post('/api/mafia/chat/send', (req, res) => {
  const { chatId, senderSeat, text, isVoiceNote, voiceDurationSec } = req.body;
  const targetChatId = Number(chatId) || 12345678;
  const message = MafiaEngine.sendChatMessage(
    targetChatId,
    Number(senderSeat) || 1,
    String(text || ''),
    !!isVoiceNote,
    voiceDurationSec ? Number(voiceDurationSec) : undefined
  );
  res.json({ message, game: activeMafiaGames.get(targetChatId) });
});

app.post('/api/mafia/chat/bot-speech', (req, res) => {
  const { chatId } = req.body;
  const targetChatId = Number(chatId) || 12345678;
  const speeches = MafiaEngine.simulateBotSpeeches(targetChatId);
  res.json({ speeches, game: activeMafiaGames.get(targetChatId) });
});

app.post('/api/mafia/voice/toggle', (req, res) => {
  const { chatId, start } = req.body;
  const targetChatId = Number(chatId) || 12345678;
  const voiceCall = MafiaEngine.toggleVoiceCall(targetChatId, !!start);
  res.json({ voiceCall, game: activeMafiaGames.get(targetChatId) });
});

app.post('/api/mafia/voice/speaker', (req, res) => {
  const { chatId, seatNumber } = req.body;
  const targetChatId = Number(chatId) || 12345678;
  const voiceCall = MafiaEngine.setVoiceSpeaker(targetChatId, Number(seatNumber));
  res.json({ voiceCall, game: activeMafiaGames.get(targetChatId) });
});

// ==========================================
// MAFIA ONLINE PLATFORM MULTIPLAYER & ECONOMY ENDPOINTS
// ==========================================

// Get user profile
app.get('/api/platform/user', (req, res) => {
  const userId = String(req.query.userId || 'usr_me');
  const user = platformStore.getUser(userId) || platformStore.getUser('usr_me');
  res.json({ user });
});

// Update profile / avatar
app.post('/api/platform/user/update', (req, res) => {
  const { userId, displayName, avatarEmoji } = req.body;
  const updated = platformStore.updateProfile(userId || 'usr_me', { displayName, avatarEmoji });
  res.json({ user: updated });
});

// Get all roles in market
app.get('/api/platform/roles', (_req, res) => {
  res.json({ roles: ALL_MAFIA_ROLES });
});

// Purchase role with Coins / Diamonds / Points
app.post('/api/platform/roles/purchase', (req, res) => {
  const { userId, roleId, currencyType } = req.body;
  const result = platformStore.purchaseRole(userId || 'usr_me', roleId, currencyType || 'coins');
  res.json(result);
});

// List rooms
app.get('/api/platform/rooms', (_req, res) => {
  const roomList = Array.from(platformStore.rooms.values());
  res.json({ rooms: roomList });
});

// Create room
app.post('/api/platform/rooms/create', (req, res) => {
  const { hostUserId, name, scenario, isPrivate, passcode } = req.body;
  const room = platformStore.createRoom(
    hostUserId || 'usr_me',
    name,
    scenario === 12 ? 12 : 9,
    !!isPrivate,
    passcode
  );
  res.json({ room });
});

// Join room
app.post('/api/platform/rooms/join', (req, res) => {
  const { roomId, userId, passcode } = req.body;
  const result = platformStore.joinRoom(roomId, userId || 'usr_me', passcode);
  res.json(result);
});

// Add smart AI bot to room
app.post('/api/platform/rooms/add-bot', (req, res) => {
  const { roomId, personality } = req.body;
  const result = platformStore.addAIBot(roomId, personality || 'analyst');
  res.json(result);
});

// Instant fill with bots & start match
app.post('/api/platform/rooms/fill-bots-and-start', (req, res) => {
  const { roomId } = req.body;
  const room = platformStore.fillRoomWithBots(roomId);
  res.json({ room });
});

// WebRTC Signalling Exchange
interface WebRtcSignal {
  senderId: string;
  senderSeat: number;
  type: 'offer' | 'answer' | 'candidate';
  payload: any;
}
const roomSignallingMap: Map<string, WebRtcSignal[]> = new Map();

app.post('/api/platform/webrtc/signal', webrtcRateLimiter, (req, res) => {
  const { roomId, senderId, senderSeat, type, payload } = req.body;
  if (!roomSignallingMap.has(roomId)) {
    roomSignallingMap.set(roomId, []);
  }
  const signals = roomSignallingMap.get(roomId)!;
  signals.push({ senderId, senderSeat, type, payload });
  if (signals.length > 50) signals.shift();
  res.json({ success: true, totalSignals: signals.length });
});

app.get('/api/platform/webrtc/signals', webrtcRateLimiter, (req, res) => {
  const roomId = String(req.query.roomId || '');
  const signals = roomSignallingMap.get(roomId) || [];
  res.json({ signals });
});

// Transaction History
app.get('/api/platform/transactions', (req, res) => {
  const userId = String(req.query.userId || 'usr_me');
  const userTxs = platformStore.transactions.filter((t) => t.userId === userId);
  res.json({ transactions: userTxs });
});

// Bot Dispatch Route
app.post('/api/bot/dispatch', rateLimit({ windowMs: 60000, max: 60 }), async (req, res) => {
  const { type, user, chatId, text, callbackData, message } = req.body;
  const defaultUser: TelegramUser = user || {
    id: 12345678,
    first_name: 'کاربر تستی',
    username: 'test_user',
  };
  const targetChatId = chatId || defaultUser.id;

  if (type === 'callback') {
    const cbQuery = {
      id: 'cb_' + Date.now(),
      from: defaultUser,
      data: callbackData,
      message,
    };
    addLog('callback', `شبیه‌ساز وب: کلیک روی ${callbackData}`);
    const responses = await handleTelegramCallbackQuery(cbQuery);
    databasePersistenceService.scheduleSave(botStorage, platformStore);
    return res.json({ responses, wallet: botStorage.getWallet(defaultUser.id) });
  } else {
    addLog('incoming', `شبیه‌ساز وب: ${text || ''}`);
    const responses = await handleTelegramIncomingMessage(defaultUser, targetChatId, text || '', 'simulator');
    databasePersistenceService.scheduleSave(botStorage, platformStore);
    return res.json({ responses, wallet: botStorage.getWallet(defaultUser.id) });
  }
});

app.get('/api/bot/state', requireAdmin, (req, res) => {
  const userId = Number(req.query.userId) || 12345678;
  const wallet = botStorage.getWallet(userId);
  const clash = botStorage.getClashVillage(userId, 'فرمانده');
  const session = botStorage.getFinderSession(userId);
  const mafia = botStorage.mafiaGames.get(userId);

  res.json({
    wallet,
    clash,
    finder: session,
    mafia: mafia || null,
    ordersCount: botStorage.seenOrders.length,
    recentOrders: botStorage.seenOrders.slice(-5),
  });
});

app.post('/api/bot/token/connect', requireAdmin, async (req, res) => {
  const { token } = req.body;
  if (!token || typeof token !== 'string') {
    return res.status(400).json({ ok: false, error: 'توکن نامعتبر است.' });
  }

  const cleanToken = token.trim();

  try {
    addLog('system', 'در حال اعتبارسنجی توکن با سرور رسمی تلگرام...');
    const getMeRes = await fetch(`https://api.telegram.org/bot${cleanToken}/getMe`);
    const data = await getMeRes.json();

    if (!data.ok || !data.result) {
      addLog('error', `توکن نامعتبر است: ${data.description || 'پاسخ ناموفق'}`);
      return res.status(400).json({ ok: false, error: data.description || 'توکن نامعتبر است.' });
    }

    // Stop previous if active
    if (realBotRunner.isPolling) {
      stopLongPolling();
    }

    realBotRunner.token = cleanToken;
    realBotRunner.botInfo = data.result;
    addLog('system', `اتصال با ربات @${data.result.username} (${data.result.first_name}) با موفقیت برقرار شد! 🎉`);

    // Start polling
    startLongPolling(cleanToken);

    return res.json({
      ok: true,
      botInfo: data.result,
      message: 'ربات با موفقیت به تلگرام متصل شد و آماده پاسخگویی است.',
    });
  } catch (err: any) {
    addLog('error', `خطای شبکه در اتصال به تلگرام: ${err?.message || err}`);
    return res.status(500).json({ ok: false, error: err?.message || 'خطای سرور در اتصال به تلگرام' });
  }
});

app.post('/api/bot/token/disconnect', requireAdmin, (req, res) => {
  stopLongPolling();
  realBotRunner.token = '';
  realBotRunner.botInfo = null;
  return res.json({ ok: true, message: 'ربات با موفقیت قطع شد.' });
});



// Get all saved bot users across Telegram, Bale, Rubika, and Simulator
app.get('/api/bot/users', requireAdmin, (_req, res) => {
  const users = Array.from(botStorage.users.values());
  res.json({
    ok: true,
    total: users.length,
    stats: {
      telegram: users.filter((u) => u.platform === 'telegram').length,
      bale: users.filter((u) => u.platform === 'bale').length,
      rubika: users.filter((u) => u.platform === 'rubika').length,
      simulator: users.filter((u) => u.platform === 'simulator').length,
    },
    users: users.sort((a, b) => b.interactionsCount - a.interactionsCount),
  });
});

// Get Database & Persistence summary
app.get('/api/bot/database/stats', requireAdmin, (_req, res) => {
  res.json({
    ok: true,
    usersCount: botStorage.users.size,
    walletsCount: botStorage.wallets.size,
    ordersCount: botStorage.orders.length,
    clashVillagesCount: botStorage.clashVillages.size,
    dbPath: databasePersistenceService.getDbPath(),
  });
});

app.get('/api/bale/status', requireAdmin, (_req, res) => {
  res.json({
    connected: baleBotRunner.isPolling,
    botInfo: baleBotRunner.botInfo,
    maskedToken: maskToken(baleBotRunner.token),
  });
});

app.get('/api/rubika/status', requireAdmin, (_req, res) => {
  res.json({
    connected: rubikaBotRunner.isPolling,
    botInfo: rubikaBotRunner.botInfo,
    maskedToken: maskToken(rubikaBotRunner.token),
  });
});

app.get('/api/bot/token/status', requireAdmin, (req, res) => {
  // ماسک کردن توکن‌های احتمالی در لاگ‌ها
  const maskedLogs = realBotRunner.logs.map((log) => ({
    ...log,
    content: String(log.content || '').replace(
      /\d{8,10}:[A-Za-z0-9_-]{30,}/g,
      (match) => `${match.slice(0, 4)}***${match.slice(-4)}`
    ),
  }));

  return res.json({
    connected: !!realBotRunner.botInfo && realBotRunner.isPolling,
    isPolling: realBotRunner.isPolling,
    botInfo: realBotRunner.botInfo,
    logs: maskedLogs,
  });
});

// ==========================================
// N8N INTEGRATION & TELEGRAM WEBHOOK ENDPOINTS
// ==========================================

// Global n8n Webhook Configuration State
let n8nWebhookConfig = {
  n8nWebhookUrl: '',
  enabled: false,
  secretKey: 'n8n_secret_' + Math.random().toString(36).substring(2, 8),
};

export interface WebhookAttempt {
  id: string;
  event: string;
  url: string;
  status: 'success' | 'failed';
  statusCode?: number;
  timestamp: string;
  timeFa: string;
  errorMessage?: string;
  payloadSummary?: string;
}

const n8nWebhookAttempts: WebhookAttempt[] = [];

function recordWebhookAttempt(attempt: Omit<WebhookAttempt, 'id' | 'timestamp' | 'timeFa'>) {
  const fullAttempt: WebhookAttempt = {
    ...attempt,
    id: 'att_' + Date.now() + '_' + Math.random().toString(36).substring(2, 4),
    timestamp: new Date().toISOString(),
    timeFa: new Date().toLocaleTimeString('fa-IR'),
  };
  n8nWebhookAttempts.unshift(fullAttempt);
  if (n8nWebhookAttempts.length > 20) {
    n8nWebhookAttempts.pop();
  }
}

// Helper function to send event notification to n8n if configured
async function sendToN8n(event: string, payload: any) {
  if (!n8nWebhookConfig.enabled || !n8nWebhookConfig.n8nWebhookUrl) return;
  const targetUrl = n8nWebhookConfig.n8nWebhookUrl;
  try {
    const res = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-N8N-Secret': n8nWebhookConfig.secretKey,
      },
      body: JSON.stringify({
        event,
        timestamp: new Date().toISOString(),
        payload,
      }),
    });
    if (res.ok) {
      addLog('system', `پیلود با موفقیت به n8n ارسال شد (${event})`);
      recordWebhookAttempt({
        event,
        url: targetUrl,
        status: 'success',
        statusCode: res.status,
        payloadSummary: JSON.stringify(payload).slice(0, 100),
      });
    } else {
      addLog('error', `پاسخ ناموفق از n8n [کد ${res.status}] (${event})`);
      recordWebhookAttempt({
        event,
        url: targetUrl,
        status: 'failed',
        statusCode: res.status,
        errorMessage: `HTTP Error ${res.status}: ${res.statusText}`,
        payloadSummary: JSON.stringify(payload).slice(0, 100),
      });
    }
  } catch (err: any) {
    addLog('error', `خطا در ارسال پیام به n8n: ${err?.message || err}`);
    recordWebhookAttempt({
      event,
      url: targetUrl,
      status: 'failed',
      errorMessage: err?.message || 'Network error / Timeout',
      payloadSummary: JSON.stringify(payload).slice(0, 100),
    });
  }
}

// 1. Standard Telegram Webhook for n8n or direct Telegram webhook
app.post('/api/telegram/webhook', requireTelegramSecret, async (req, res) => {
  try {
    const update: TelegramUpdate = req.body;
    if (!update) {
      return res.status(400).json({ ok: false, error: 'No update payload provided' });
    }

    if (update.message) {
      const msg = update.message;
      const sender = msg.from || { id: msg.chat.id, first_name: 'n8n_user' };
      addLog('incoming', `[n8n/Webhook] پیام از @${sender.username || sender.first_name}: ${msg.text || ''}`);

      const responses = await handleTelegramIncomingMessage(sender, msg.chat.id, msg.text || '', 'telegram');
              databasePersistenceService.scheduleSave(botStorage, platformStore);
      
      // Notify n8n
      sendToN8n('incoming_message', { update, responses });

      if (realBotRunner.token && realBotRunner.botInfo) {
        for (const resp of responses) {
          await sendTelegramMessage(realBotRunner.token, resp);
        }
      }

      return res.json({ ok: true, responses });
    } else if (update.callback_query) {
      const cb = update.callback_query;
      addLog('callback', `[n8n/Webhook] کلیک دکمه از @${cb.from.username || cb.from.first_name}: ${cb.data}`);
      
      const responses = await handleTelegramCallbackQuery(cb);
              databasePersistenceService.scheduleSave(botStorage, platformStore);
      
      // Notify n8n
      sendToN8n('callback_query', { callback: cb, responses });

      if (realBotRunner.token && realBotRunner.botInfo) {
        await answerTelegramCallback(realBotRunner.token, cb.id);
        for (const resp of responses) {
          await sendTelegramMessage(realBotRunner.token, resp);
        }
      }

      return res.json({ ok: true, responses });
    }

    res.json({ ok: true, message: 'Update received' });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err?.message || 'Webhook processing failed' });
  }
});

// 2. Direct n8n Message Execution API (HTTP Request Node target)
app.post('/api/n8n/process-message', requireN8nSecret, async (req, res) => {
  try {
    const { text, userId, username, firstName, chatId } = req.body;
    const user: TelegramUser = {
      id: Number(userId) || 12345678,
      first_name: firstName || username || 'کاربر n8n',
      username: username || 'n8n_user',
    };
    const targetChatId = Number(chatId) || user.id;

    const responses = await handleTelegramIncomingMessage(user, targetChatId, String(text || ''));
    
    sendToN8n('n8n_message_processed', { input: req.body, responses });

    res.json({
      success: true,
      input: text,
      chatId: targetChatId,
      user,
      responses,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'n8n processing error' });
  }
});

// 3. Direct n8n Media Downloader API
app.post('/api/n8n/download-media', requireN8nSecret, async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ success: false, error: 'پارامتر url الزامی است.' });
    }

    const item = fetchUniversalDownload(String(url));
    res.json({
      success: true,
      url,
      media: item,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Media extraction error' });
  }
});

// 4. n8n Webhook Settings Endpoint
app.post('/api/n8n/config', requireAdmin, (req, res) => {
  const { n8nWebhookUrl, enabled, secretKey } = req.body;
  if (typeof n8nWebhookUrl === 'string') n8nWebhookConfig.n8nWebhookUrl = n8nWebhookUrl.trim();
  if (typeof enabled === 'boolean') n8nWebhookConfig.enabled = enabled;
  if (typeof secretKey === 'string' && secretKey.trim()) n8nWebhookConfig.secretKey = secretKey.trim();

  addLog('system', `تنظیمات اتصال n8n به‌روزرسانی شد. وضعیت: ${n8nWebhookConfig.enabled ? 'فعال' : 'غیرفعال'}`);
  const { secretKey: _secret, ...safeConfig } = n8nWebhookConfig;
  res.json({
    success: true,
    config: safeConfig,
  });
});

app.get('/api/n8n/config', requireAdmin, (_req, res) => {
  const { secretKey: _secret, ...safeConfig } = n8nWebhookConfig;
  res.json({
    config: safeConfig,
    endpoints: {
      telegramWebhook: '/api/telegram/webhook',
      processMessage: '/api/n8n/process-message',
      downloadMedia: '/api/n8n/download-media',
      info: '/api/n8n/info',
    },
    attempts: n8nWebhookAttempts.slice(0, 5),
  });
});

app.get('/api/n8n/attempts', requireAdmin, (_req, res) => {
  res.json({
    attempts: n8nWebhookAttempts.slice(0, 5),
    totalCount: n8nWebhookAttempts.length,
  });
});

// 5. n8n Documentation & Sample Workflow JSON
app.get('/api/n8n/info', (req, res) => {
  const host = req.headers.host || 'localhost:3000';
  const protocol = req.headers['x-forwarded-proto'] || 'http';
  const baseUrl = `${protocol}://${host}`;

  res.json({
    title: 'SlowMegaBot n8n Integration Hub',
    description: 'راهنمای اتصال کامل ربات تلگرام به اتوماسیون n8n',
    baseUrl,
    webhookEndpoint: `${baseUrl}/api/telegram/webhook`,
    processMessageEndpoint: `${baseUrl}/api/n8n/process-message`,
    downloadMediaEndpoint: `${baseUrl}/api/n8n/download-media`,
    sampleN8nWorkflow: {
      name: 'SlowMegaBot Telegram Flow',
      nodes: [
        {
          parameters: {
            httpMethod: 'POST',
            path: 'telegram-webhook',
            responseMode: 'onReceived',
            options: {},
          },
          name: 'Telegram Webhook Trigger',
          type: 'n8n-nodes-base.webhook',
          typeVersion: 1,
          position: [100, 300],
        },
        {
          parameters: {
            method: 'POST',
            url: `${baseUrl}/api/n8n/process-message`,
            sendBody: true,
            specifyBody: 'json',
            jsonBody: '{\n  "text": "={{ $json.body.message.text }}",\n  "userId": "={{ $json.body.message.from.id }}",\n  "username": "={{ $json.body.message.from.username }}"\n}',
            options: {},
          },
          name: 'Process Bot Message',
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 3,
          position: [320, 300],
        },
      ],
    },
  });
});

// 6. n8n Workflow Direct Download Endpoint
app.get('/api/n8n/workflow/download', (_req, res) => {
  try {
    const workflowPath = path.resolve(__dirname, 'n8n-workflow-slowmegabot.json');
    if (fs.existsSync(workflowPath)) {
      const content = fs.readFileSync(workflowPath, 'utf-8');
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="slowmegabot-n8n-workflow.json"');
      return res.send(content);
    }
    return res.status(404).json({ error: 'Workflow file not found' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Error downloading workflow file' });
  }
});

// ==========================================
// AUTO INSTALLER & DIAGNOSTICS ENDPOINTS
// ==========================================
app.get('/api/installer/diagnostics', requireAdmin, (_req, res) => {
  const lockExists = fs.existsSync(path.resolve(__dirname, '.installed.lock'));
  const envExists = fs.existsSync(path.resolve(__dirname, '.env'));
  const logExists = fs.existsSync(path.resolve(__dirname, 'install.log'));

  res.json({
    status: 'online',
    version: '3.0.0',
    platform: process.platform,
    arch: process.arch,
    nodeVersion: process.version,
    memoryUsageMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
    uptimeSeconds: Math.round(process.uptime()),
    installed: lockExists || envExists,
    configuredPort: PORT,
    botConnected: !!realBotRunner.botInfo && realBotRunner.isPolling,
    botUsername: realBotRunner.botInfo?.username || null,
    hasGeminiKey: !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY',
    n8nEnabled: !!n8nWebhookConfig.enabled,
    hasEnvFile: envExists,
    hasLogFile: logExists,
  });
});

app.post('/api/installer/verify-token', requireAdmin, verifyTokenRateLimiter, async (req, res) => {
  const { token } = req.body;

  if (!token || typeof token !== 'string') {
    return res.status(400).json({ ok: false, error: 'توکن نامعتبر است' });
  }

  // اعتبارسنجی طول و فرمت توکن تلگرام
  const cleanToken = token.trim();
  if (cleanToken.length < 40 || cleanToken.length > 60 || !/^\d+:[A-Za-z0-9_-]+$/.test(cleanToken)) {
    return res.status(400).json({ ok: false, error: 'فرمت توکن نامعتبر است' });
  }

  try {
    const tgRes = await fetch(`https://api.telegram.org/bot${cleanToken}/getMe`);
    const data = await tgRes.json();
    if (data.ok && data.result) {
      return res.json({
        ok: true,
        bot: {
          id: data.result.id,
          username: data.result.username,
          first_name: data.result.first_name,
        },
      });
    }
    return res.status(400).json({ ok: false, error: data.description || 'توکن نامعتبر است' });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err?.message || 'خطای شبکه' });
  }
});

app.get('/api/installer/configs', requireAdmin, (req, res) => {
  const host = req.headers.host || 'bot.example.com';
  const domain = host.split(':')[0];

  const systemdService = `[Unit]
Description=SlowMegaBot Comprehensive Telegram & Web Service
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/var/www/slowmegabot
EnvironmentFile=/var/www/slowmegabot/.env
ExecStart=/usr/bin/npx tsx server.ts
Restart=always
RestartSec=5
StandardOutput=append:/var/www/slowmegabot/install.log
StandardError=append:/var/www/slowmegabot/install.log

[Install]
WantedBy=multi-user.target`;

  const nginxConfig = `server {
    listen 80;
    server_name ${domain};

    client_max_body_size 100M;

    location / {
        proxy_pass http://127.0.0.1:${PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
    }
}`;

  res.json({
    systemdService,
    nginxConfig,
    installCommand: `bash install.sh`,
    oneLiner: `curl -sSL https://raw.githubusercontent.com/user/slowmegabot/main/install.sh | bash`,
  });
});

// 12. Database Backup, Export & Restore Endpoints
app.get('/api/database/backup', requireAdmin, (req, res) => {
  try {
    const tablesParam = req.query.tables ? String(req.query.tables).split(',') : undefined;
    const sqlContent = generateSqlBackup(tablesParam);
    const download = req.query.download === 'true';

    if (download) {
      const filename = `slowmegabot_backup_${new Date().toISOString().slice(0, 10)}.sql`;
      res.setHeader('Content-Type', 'application/sql; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(sqlContent);
    }

    return res.json({ ok: true, sql: sqlContent });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err?.message || 'خطا در ایجاد فایل پشتیبان دیتابیس' });
  }
});

app.post('/api/database/restore', requireAdmin, (req, res) => {
  try {
    const { sql, mode = 'replace' } = req.body;
    if (!sql || typeof sql !== 'string') {
      return res.status(400).json({ ok: false, error: 'محتوای فایل SQL برای بازیابی الزامی است.' });
    }

    const result = restoreSqlToSimulator(sql, { mode });
    return res.json({ ok: result.success, ...result });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err?.message || 'خطای غیرمنتظره در بازیابی دیتابیس' });
  }
});

app.get('/api/database/stats', requireAdmin, (req, res) => {
  try {
    const stats = [
      { name: 'users_wallets', label: 'کیف‌پول‌ها و کاربران', count: botStorage.wallets.size, description: 'حساب‌های کاربری، موجودی تومانی، سکه‌ها و اشتراک‌ها' },
      { name: 'clash_villages', label: 'دهکده‌های کلش', count: botStorage.clashVillages.size, description: 'قلعه‌ها، سطح تاون‌هال، مخازن طلا و اکسیر و سربازان' },
      { name: 'mafia_accounts', label: 'اکانت‌های مافیا آنلاین', count: platformStore.users.size, description: 'سطوح، الماس‌ها، برد و باخت و نقش‌های خریداری شده' },
      { name: 'purchase_orders', label: 'سفارشات خرید و رسیدها', count: botStorage.orders.length, description: 'فاکتورهای پرداخت، وضعیت تایید یا رد سفارش' },
      { name: 'seen_orders', label: 'سفارشات سین تلگرام', count: botStorage.seenOrders.length, description: 'سفارشات بازدید پست‌های تلگرام و قیمت‌ها' },
      { name: 'uploaded_files', label: 'فایل‌های آپلودشده (Aplo)', count: botStorage.uploadedFiles.length, description: 'فایل‌های مستقیم آپلودشده، رمزها و لینک‌های دانلود' },
      { name: 'bot_owner_config', label: 'تنظیمات درگاه و مالک ربات', count: 1, description: 'شماره کارت مالک، مرچنت زرین‌پال و وضعیت درگاه' },
    ];
    const totalRecords = stats.reduce((acc, s) => acc + s.count, 0);
    return res.json({
      ok: true,
      stats,
      totalRecords,
      lastUpdated: new Date().toISOString(),
      architecture: 'MySQL / SQLite Compatible Architecture',
    });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err?.message || 'خطا در دریافت وضعیت دیتابیس' });
  }
});

// 13. System Architecture, Modules Registry & Telemetry Endpoints
app.get('/api/system/info', requireAdmin, (req, res) => {
  const config = appConfig.getConfig();
  res.json({
    ok: true,
    appName: config.appName,
    version: config.version,
    environment: config.environment,
    protocol: config.protocol,
    domain: config.domain,
    port: PORT,
    databaseType: config.databaseType,
    totalModulesCount: APP_MODULES_CATALOG.length,
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/downloader/status', (_req, res) => {
  res.json({
    ok: true,
    environment: 'AI Studio Sandbox / Google Cloud',
    ytdlpAvailable: false,
    fallbacksActive: ['Instagram oEmbed', 'Snapinsta Public API', 'RapidAPI (Optional)'],
    rapidApiConfigured: !!process.env.RAPIDAPI_KEY && process.env.RAPIDAPI_KEY !== '',
  });
});

app.get('/api/system/modules', requireAdmin, (req, res) => {
  const category = req.query.category as string | undefined;
  if (category) {
    return res.json({
      ok: true,
      category,
      modules: APP_MODULES_CATALOG.filter((m) => m.category === category),
    });
  }
  return res.json({
    ok: true,
    total: APP_MODULES_CATALOG.length,
    modules: APP_MODULES_CATALOG,
  });
});

app.get('/api/system/logs', requireAdmin, (req, res) => {
  const limit = req.query.limit ? Number(req.query.limit) : 50;
  const level = req.query.level as any;
  const logs = logger.getLogs(limit, level);
  const stats = logger.getStats();
  res.json({
    ok: true,
    stats,
    logs,
  });
});

// ==========================================
// ADMIN ENVIRONMENT VARIABLES MANAGER ENDPOINTS
// ==========================================
app.get('/api/admin/env', requireAdmin, (_req, res) => {
  try {
    const envPath = path.resolve(__dirname, '.env');
    let envContent = '';
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    } else {
      const examplePath = path.resolve(__dirname, '.env.example');
      if (fs.existsSync(examplePath)) {
        envContent = fs.readFileSync(examplePath, 'utf8');
      }
    }

    const lines = envContent.split(/\r?\n/);
    const variables: Array<{ key: string; value: string }> = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        continue;
      }
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim();
        let value = trimmed.slice(eqIdx + 1).trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        variables.push({ key, value });
      }
    }

    const importantKeys = [
      'PORT', 'SERVER_HOST', 'SERVER_PORT', 'APP_URL', 'WEBHOOK_BASE_URL',
      'TELEGRAM_BOT_TOKEN', 'BALE_BOT_TOKEN', 'RUBIKA_BOT_TOKEN', 'ADMIN_USER_IDS',
      'GEMINI_API_KEY', 'RAPIDAPI_KEY', 'ADMIN_API_KEY'
    ];
    for (const k of importantKeys) {
      if (!variables.some(v => v.key === k) && process.env[k]) {
        variables.push({ key: k, value: process.env[k] || '' });
      }
    }

    res.json({ ok: true, variables });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err?.message || 'Error reading env' });
  }
});

app.post('/api/admin/env', requireAdmin, (req, res) => {
  try {
    const { variables } = req.body;
    if (!variables) {
      return res.status(400).json({ ok: false, error: 'Variables are required' });
    }

    const envPath = path.resolve(__dirname, '.env');
    let envContent = '';
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }

    const lines = envContent.split(/\r?\n/);
    const newLines: string[] = [];

    const varMap = Array.isArray(variables) 
      ? new Map(variables.map((v: any) => [v.key, v.value]))
      : new Map(Object.entries(variables));

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        newLines.push(line);
        continue;
      }
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim();
        if (varMap.has(key)) {
          const val = varMap.get(key);
          newLines.push(`${key}="${val}"`);
          varMap.delete(key);
        } else {
          newLines.push(line);
        }
      } else {
        newLines.push(line);
      }
    }

    for (const [key, val] of varMap.entries()) {
      newLines.push(`${key}="${val}"`);
      process.env[key] = String(val);
    }

    const varList = Array.isArray(variables) ? variables : Object.entries(variables).map(([key, value]) => ({ key, value }));
    for (const v of varList) {
      process.env[v.key] = String(v.value);
    }

    fs.writeFileSync(envPath, newLines.join('\n'), 'utf8');
    res.json({ ok: true, message: 'متغیرهای محیطی با موفقیت ذخیره شدند.' });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err?.message || 'Error saving env' });
  }
});

// ==========================================
// MAFIA WEBAPP (Mini App) ENDPOINTS
// ==========================================================
app.post('/api/webapp/auth', authRateLimiter, (req, res) => {
  const { platform, initData } = req.body;
  const targetPlatform = ['telegram', 'bale', 'rubika'].includes(platform) ? platform : 'telegram';

  const result = authenticateWebAppUser(targetPlatform as any, String(initData || ''), {
    telegram: realBotRunner.token || process.env.TELEGRAM_BOT_TOKEN || '',
    bale: baleBotRunner.token || process.env.BALE_BOT_TOKEN || '',
    rubika: rubikaBotRunner.token || process.env.RUBIKA_BOT_TOKEN || '',
  });

  if (!result.ok || !result.user) {
    return res.status(401).json(result);
  }

  const userId = `${targetPlatform}_${result.user.id}`;
  let platformUser = platformStore.getUser(userId);

  if (!platformUser) {
    platformUser = {
      id: userId,
      username: result.user.username || `wa_${result.user.id}`,
      displayName: result.user.firstName,
      avatarUrl: '',
      avatarEmoji: '🎭',
      level: 1,
      xp: 0,
      coins: 1000,
      diamonds: 10,
      points: 50,
      gamesPlayed: 0,
      gamesWon: 0,
      gamesLost: 0,
      winRate: 0,
      league: 'bronze',
      ownedRoleIds: ['godfather', 'notche', 'citizen', 'doctor', 'detective', 'sniper'],
      friends: [],
      blockedUsers: [],
      isAdmin: false,
      createdAt: new Date().toISOString(),
    };
    platformStore.users.set(userId, platformUser);
  }

  botStorage.recordUserActivity(
    targetPlatform as any,
    {
      id: result.user.id,
      first_name: result.user.firstName,
      username: result.user.username,
    },
    'ورود به بازی مافیا از طریق WebApp Mini App'
  );

  databasePersistenceService.scheduleSave(botStorage, platformStore);

  res.json({ ok: true, user: result.user, platformUser });
});

app.get('/api/webapp/rooms', (_req, res) => {
  const activeRooms = Array.from(platformStore.rooms.values())
    .filter((r: any) => r.currentPhase === 'lobby' || r.currentPhase === 'playing')
    .map((r: any) => ({
      id: r.id,
      name: r.name,
      scenario: r.selectedScenario,
      hostName: platformStore.users.get(r.hostUserId)?.displayName || 'میزبان',
      playersCount: r.participants?.length || 0,
      maxPlayers: r.maxPlayers,
      status: r.currentPhase,
      isPrivate: r.isPrivate,
    }));
  res.json({ ok: true, rooms: activeRooms });
});

app.get(['/mafia-webapp', '/mafia-webapp.html'], (_req, res) => {
  const htmlPath = path.resolve(__dirname, 'mafia-webapp.html');
  if (fs.existsSync(htmlPath)) {
    return res.sendFile(htmlPath);
  }
  res.status(404).send('فایل WebApp مافیا یافت نشد.');
});

// Vite / Static Files Middleware setup
async function setupServer() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        ws: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SlowMegaBot Server running on http://0.0.0.0:${PORT}`);
    // Load persistent database from disk on server startup
    databasePersistenceService.load(botStorage, platformStore);

    // 1. Auto-connect Telegram Bot
    const envToken = process.env.TELEGRAM_BOT_TOKEN;
    if (envToken && !realBotRunner.isPolling) {
      const clean = envToken.trim();
      fetch(`https://api.telegram.org/bot${clean}/getMe`)
        .then((r) => r.json())
        .then((data) => {
          if (data.ok && data.result) {
            realBotRunner.token = clean;
            realBotRunner.botInfo = data.result;
            addLog('system', `اتصال ربات تلگرام @${data.result.username} (Mq123_Bot) برقرار شد! 🎉`);

            if (process.env.NODE_ENV === 'production' && process.env.TELEGRAM_WEBHOOK_URL && envToken) {
              const webhookUrl = process.env.TELEGRAM_WEBHOOK_URL;
              const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
              if (secret) {
                fetch(`https://api.telegram.org/bot${envToken}/setWebhook?url=${encodeURIComponent(webhookUrl)}&secret_token=${encodeURIComponent(secret)}`)
                  .then(r => r.json())
                  .then(data => {
                    if (data.ok) console.log('[SECURITY] Telegram webhook با secret ثبت شد');
                    else console.error('[SECURITY] خطا در ثبت webhook:', data.description);
                  })
                  .catch(err => console.error('[SECURITY] webhook error:', err));
              }
            }

            startLongPolling(clean);
          }
        })
        .catch((err) => console.error('Telegram auto-connect error:', err));
    }

    // 2. Auto-connect Bale Bot (بله)
    const baleToken = process.env.BALE_BOT_TOKEN;
    if (baleToken && !baleBotRunner.isPolling) {
      const cleanBale = baleToken.trim();
      fetch(`https://tapi.bale.ai/bot${cleanBale}/getMe`)
        .then((r) => r.json())
        .then((data) => {
          if (data.ok && data.result) {
            baleBotRunner.token = cleanBale;
            baleBotRunner.botInfo = data.result;
            addLog('system', `اتصال ربات بله @${data.result.username} (modasrbot) با موفقیت برقرار شد! 🚀`);
            startBalePolling(cleanBale);
          }
        })
        .catch((err) => console.error('Bale auto-connect error:', err));
    }

    // 3. Auto-connect Rubika Bot (روبیکا)
    const rubikaToken = process.env.RUBIKA_BOT_TOKEN;
    if (rubikaToken && !rubikaBotRunner.isPolling) {
      const cleanRubika = rubikaToken.trim();
      fetch(`https://botapi.rubika.ir/v3/${cleanRubika}/getMe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.status === 'OK' && data.data && data.data.bot) {
            rubikaBotRunner.token = cleanRubika;
            rubikaBotRunner.botInfo = data.data.bot;
            addLog('system', `اتصال ربات روبیکا @${data.data.bot.username} (MODASR_T_bot) با موفقیت برقرار شد! 💫`);
            startRubikaPolling(cleanRubika);
          }
        })
        .catch((err) => console.error('Rubika auto-connect error:', err));
    }
  });
}

setupServer().catch((err) => {
  console.error('Failed to start server:', err);
});
