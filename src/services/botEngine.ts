import {
  TelegramMessage,
  TelegramUser,
  TelegramCallbackQuery,
  InlineKeyboardMarkup,
  ReplyKeyboardMarkup,
  TelegramMediaAttachment,
  MafiaGame,
  ClashVillage,
  FinderSession,
  SeenOrder,
  RocketBet,
  UserWallet,
  DirectUploadFile,
  MafiaRole,
  MafiaPlayer,
  UploadProgressPayload
} from '../types/telegram';
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
  orderVirtualPhoneNumber,
  activeVirtualOrders,
  fetchYouTubeVideoDetails,
  MUSIC_CATALOG,
  searchMusicDatabase,
  fetchDetailedArzyRates,
  getDetailedArzyRates,
  calculateArzyConversion,
  parseNaturalArzyQuery,
  createAploUpload,
  aploStoredFilesList,
  fetchTikTokVideoDetails,
  fetchUniversalDownload,
  UNIVERSAL_DOWNLOAD_PRESETS,
  detectDownloadPlatform,
  detectContentType,
  extractUrlFromText,
  stripTrackingParams,
  normalizeShortenedUrl,
} from './realApis';
import { parseInstagramUrl, extractInstagramRawUrl } from './instagramService';
import {
  MafiaEngine,
  MAFIA_ROLES_CATALOG,
  activeMafiaGames,
  FullMafiaGame,
} from './mafiaEngine';
import { platformStore } from './platformStore';
import { IRANIAN_BANKS_CATALOG } from './bankService';

export interface OwnerConfig {
  cardNumber: string;
  cardHolder: string;
  bankName: string;
  gatewayName: string;
  gatewayActive: boolean;
  gatewayMerchantId: string;
}

export interface BotUserRecord {
  id: string; // e.g. "tg_123456789" or "bale_857701256" or "rubika_u0J1q4A052b3e360c26b14d89fc1cdf0"
  rawId: string | number;
  platform: 'telegram' | 'bale' | 'rubika' | 'simulator';
  firstName: string;
  lastName?: string;
  username?: string;
  firstSeen: string;
  lastSeen: string;
  interactionsCount: number;
  walletBalance: number;
  coins: number;
  subscriptionTier: 'free' | 'premium' | 'vip';
  lastAction?: string;
  downloadsCount: number;
}

export interface PurchaseOrder {
  id: string;
  userId: number;
  userName: string;
  itemTitle: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  date: string;
}

// In-Memory Global State for the Bot Engine
class BotStorage {
  users: Map<string, BotUserRecord> = new Map();

  recordUserActivity(
    platform: 'telegram' | 'bale' | 'rubika' | 'simulator',
    user: { id: string | number; first_name?: string; last_name?: string; username?: string },
    actionText?: string
  ): BotUserRecord {
    const rawId = user.id;
    const userKey = `${platform}_${rawId}`;
    const nowStr = new Date().toLocaleString('fa-IR');
    const numId = typeof rawId === 'number' ? rawId : parseInt(String(rawId).replace(/\D/g, '') || '888888', 10);
    const wallet = this.getWallet(numId);

    let record = this.users.get(userKey);
    if (!record) {
      record = {
        id: userKey,
        rawId,
        platform,
        firstName: user.first_name || 'کاربر',
        lastName: user.last_name || '',
        username: user.username || '',
        firstSeen: nowStr,
        lastSeen: nowStr,
        interactionsCount: 1,
        walletBalance: wallet.balance,
        coins: wallet.coins,
        subscriptionTier: wallet.subscriptionTier,
        lastAction: actionText ? actionText.slice(0, 60) : 'شروع فعالیت',
        downloadsCount: 0,
      };
      this.users.set(userKey, record);
    } else {
      record.lastSeen = nowStr;
      record.interactionsCount += 1;
      if (user.first_name) record.firstName = user.first_name;
      if (user.last_name) record.lastName = user.last_name;
      if (user.username) record.username = user.username;
      record.walletBalance = wallet.balance;
      record.coins = wallet.coins;
      record.subscriptionTier = wallet.subscriptionTier;
      if (actionText) record.lastAction = actionText.slice(0, 60);
    }

    if (actionText && (actionText.includes('instagram.com') || actionText.includes('youtube.com') || actionText.includes('tiktok.com'))) {
      record.downloadsCount += 1;
    }

    return record;
  }

  exportData(): any {
    const usersArr = Array.from(this.users.values());
    const tgCount = usersArr.filter((u) => u.platform === 'telegram').length;
    const baleCount = usersArr.filter((u) => u.platform === 'bale').length;
    const rubikaCount = usersArr.filter((u) => u.platform === 'rubika').length;

    return {
      version: '2.5.0',
      updatedAt: new Date().toISOString(),
      stats: {
        totalUsers: usersArr.length,
        telegramUsers: tgCount,
        baleUsers: baleCount,
        rubikaUsers: rubikaCount,
        totalOrders: this.orders.length,
      },
      users: usersArr,
      wallets: Array.from(this.wallets.values()),
      orders: this.orders,
      clashVillages: Array.from(this.clashVillages.values()),
      seenOrders: this.seenOrders,
      ownerConfig: this.ownerConfig,
    };
  }

  importData(data: any): void {
    if (!data) return;
    if (Array.isArray(data.users)) {
      this.users.clear();
      for (const u of data.users) {
        if (u && u.id) this.users.set(u.id, u);
      }
    }
    if (Array.isArray(data.wallets)) {
      this.wallets.clear();
      for (const w of data.wallets) {
        if (w && w.userId) this.wallets.set(w.userId, w);
      }
    }
    if (Array.isArray(data.orders)) {
      this.orders = data.orders;
    }
    if (Array.isArray(data.clashVillages)) {
      this.clashVillages.clear();
      for (const v of data.clashVillages) {
        if (v && v.userId) this.clashVillages.set(v.userId, v);
      }
    }
    if (Array.isArray(data.seenOrders)) {
      this.seenOrders = data.seenOrders;
    }
    if (data.ownerConfig) {
      this.ownerConfig = data.ownerConfig;
    }
  }
  wallets: Map<number, UserWallet> = new Map();
  mafiaGames: Map<number, MafiaGame> = new Map();
  clashVillages: Map<number, ClashVillage> = new Map();
  finderSessions: Map<number, FinderSession> = new Map();
  seenOrders: SeenOrder[] = [];
  rocketBets: Map<number, RocketBet> = new Map();
  uploadedFiles: DirectUploadFile[] = [];
  userStates: Map<number, { step: string; data?: any }> = new Map();
  ownerConfig: OwnerConfig = {
    cardNumber: '6037991823456789',
    cardHolder: 'علی محمدی (مدیر و مالک ربات)',
    bankName: 'بانک ملی ایران',
    gatewayName: 'درگاه آنلاین زرین‌پال / کارت‌به‌کارت مستقیم',
    gatewayActive: true,
    gatewayMerchantId: 'zarinpal_merchant_live_9988',
  };
  orders: PurchaseOrder[] = [];

  getWallet(userId: number): UserWallet {
    if (!this.wallets.has(userId)) {
      this.wallets.set(userId, {
        userId,
        balance: 50000, // 50,000 Tomans welcome bonus
        coins: 1000,
        joinedDate: new Date().toLocaleDateString('fa-IR'),
        subscriptionTier: 'free',
        subscriptionExpiry: 'ندارد',
      });
    }
    return this.wallets.get(userId)!;
  }

  getClashVillage(userId: number, name: string): ClashVillage {
    if (!this.clashVillages.has(userId)) {
      this.clashVillages.set(userId, {
        userId,
        name: name || 'فرمانده',
        townHall: 3,
        gold: 8500,
        maxGold: 15000,
        elixir: 6200,
        maxElixir: 12000,
        wood: 4500,
        troops: {
          barbarian: 15,
          archer: 10,
          giant: 2,
        },
        cups: 450,
        clan: 'ایران تایتان',
        lastCollected: Date.now(),
      });
    }
    return this.clashVillages.get(userId)!;
  }

  getFinderSession(userId: number): FinderSession {
    if (!this.finderSessions.has(userId)) {
      this.finderSessions.set(userId, {
        userId,
        state: 'idle',
        history: [],
      });
    }
    return this.finderSessions.get(userId)!;
  }
}

export const botStorage = new BotStorage();

export interface BotResponse {
  chatId: number;
  text: string;
  reply_markup?: InlineKeyboardMarkup | ReplyKeyboardMarkup;
  photoUrl?: string;
  videoUrl?: string;
  audioUrl?: string;
  mediaAttachment?: TelegramMediaAttachment;
  uploadProgress?: UploadProgressPayload;
  action?: 'typing' | 'upload_photo' | 'upload_document' | 'upload_video' | 'upload_audio';
  extraData?: any;
}

// Main Telegram Reply Keyboard (Persistent menu at the bottom of the chat)
export const MAIN_REPLY_KEYBOARD: ReplyKeyboardMarkup = {
  keyboard: [
    [{ text: '🎮 گیم و سرگرمی' }, { text: '📥 رسانه و دانلودرها' }],
    [{ text: '🛠️ ابزارها و خدمات' }, { text: '💳 حساب کاربری و مالی' }],
    [{ text: '🌟 مدیریت اشتراک‌ها' }, { text: '🛒 فروشگاه و پوینت' }],
    [{ text: '🏠 منوی اصلی' }, { text: '👑 پنل مالک' }],
  ],
  resize_keyboard: true,
};

// Main Hub Welcome Inline Keyboard (Clean & Categorized)
export const MAIN_INLINE_KEYBOARD: InlineKeyboardMarkup = {
  inline_keyboard: [
    [
      { text: '🎮 گیم و سرگرمی (مافیا، بت، کلش، شانس، همدم‌یاب)', callback_data: 'cb_cat_gaming' },
    ],
    [
      { text: '📥 رسانه و دانلودرها (اینستا، یوتیوب، تیک‌تاک، موزیک)', callback_data: 'cb_cat_media' },
    ],
    [
      { text: '🛠️ ابزارها و خدمات دیجیتال (فیلترشکن، شماره، ارز، آپلودر)', callback_data: 'cb_cat_tools' },
    ],
    [
      { text: '💳 حساب کاربری، کیف پول و موجودی', callback_data: 'cb_cat_wallet' },
    ],
    [
      { text: '🌟 مدیریت اشتراک‌ها (Free, Premium, VIP)', callback_data: 'cb_sub_menu' },
    ],
    [
      { text: '🛒 فروشگاه خرید پوینت و اشتراک‌ها', callback_data: 'cb_shop_main' },
    ],
    [
      { text: '👑 پنل مدیریت مالک (تنظیم شماره کارت و درگاه)', callback_data: 'cb_admin_panel' },
    ],
  ],
};

// ============================================================================
// MULTI-PLATFORM KEYBOARD ADAPTERS & CONDITIONAL PLATFORM FILTERS
// Supports Telegram, Rubika (v3), and Bale with platform-specific keyboard schemas
// ============================================================================

export type BotPlatformType = 'telegram' | 'rubika' | 'bale';

export interface RubikaButton {
  id: string;
  type: 'Simple' | 'Link' | 'Selection' | 'Location' | 'Textbox' | 'Payment';
  button_text: string;
  url?: string;
}

export interface RubikaKeypadRow {
  buttons: RubikaButton[];
}

export interface RubikaInlineKeypad {
  rows: RubikaKeypadRow[];
}

export interface RubikaChatKeypad {
  rows: RubikaKeypadRow[];
  resize_keyboard?: boolean;
  on_time_keyboard?: boolean;
}

export interface BaleInlineKeyboard {
  inline_keyboard: Array<Array<{ text: string; callback_data?: string; url?: string }>>;
}

export interface BaleReplyKeyboard {
  keyboard: Array<Array<{ text: string }>>;
  resize_keyboard?: boolean;
  one_time_keyboard?: boolean;
}

export interface PlatformFormattedPayload {
  platform: BotPlatformType;
  reply_markup?: any;
  inline_keypad?: RubikaInlineKeypad;
  chat_keypad_type?: 'New' | 'Remove';
  chat_keypad?: RubikaChatKeypad;
}

/**
 * Core Keyboard Converter:
 * Translates standard Telegram keyboards (InlineKeyboardMarkup | ReplyKeyboardMarkup)
 * into platform-specific structures for Telegram, Rubika, and Bale using a conditional filter.
 */
export function convertKeyboardForPlatform(
  keyboard: InlineKeyboardMarkup | ReplyKeyboardMarkup | undefined,
  platform: BotPlatformType
): PlatformFormattedPayload {
  const result: PlatformFormattedPayload = { platform };

  if (!keyboard) {
    return result;
  }

  // Determine if it is an InlineKeyboardMarkup (has inline_keyboard) or ReplyKeyboardMarkup (has keyboard)
  const isInline = 'inline_keyboard' in keyboard && Array.isArray((keyboard as InlineKeyboardMarkup).inline_keyboard);
  const isReply = 'keyboard' in keyboard && Array.isArray((keyboard as ReplyKeyboardMarkup).keyboard);

  // ========================================================
  // CONDITIONAL FILTER BASED ON BOT PLATFORM TYPE
  // ========================================================
  switch (platform) {
    case 'telegram': {
      // 1. TELEGRAM: Standard Telegram Bot API schema
      if (isInline) {
        const inlineKb = keyboard as InlineKeyboardMarkup;
        result.reply_markup = {
          inline_keyboard: inlineKb.inline_keyboard.map((row) =>
            row.map((btn) => ({
              text: btn.text,
              ...(btn.callback_data ? { callback_data: btn.callback_data } : {}),
              ...(btn.url ? { url: btn.url } : {}),
            }))
          ),
        };
      } else if (isReply) {
        const replyKb = keyboard as ReplyKeyboardMarkup;
        result.reply_markup = {
          keyboard: replyKb.keyboard.map((row) =>
            row.map((btn) => ({ text: btn.text }))
          ),
          resize_keyboard: replyKb.resize_keyboard ?? true,
          one_time_keyboard: replyKb.one_time_keyboard ?? false,
        };
      }
      break;
    }

    case 'bale': {
      // 2. BALE: Telegram-compatible with explicit sanitized button objects & URLs
      if (isInline) {
        const inlineKb = keyboard as InlineKeyboardMarkup;
        result.reply_markup = {
          inline_keyboard: inlineKb.inline_keyboard.map((row) =>
            row.map((btn) => {
              const b: any = { text: btn.text };
              if (btn.url) {
                b.url = btn.url;
              } else if (btn.callback_data) {
                b.callback_data = btn.callback_data;
              }
              return b;
            })
          ),
        };
      } else if (isReply) {
        const replyKb = keyboard as ReplyKeyboardMarkup;
        result.reply_markup = {
          keyboard: replyKb.keyboard.map((row) =>
            row.map((btn) => ({ text: btn.text }))
          ),
          resize_keyboard: replyKb.resize_keyboard ?? true,
          one_time_keyboard: replyKb.one_time_keyboard ?? false,
        };
      }
      break;
    }

    case 'rubika': {
      // 3. RUBIKA (v3):
      // - Inline buttons are mapped to `inline_keypad.rows[].buttons` with `button_text`, `id`, and `type: 'Simple' | 'Link'`
      // - Reply keyboards are mapped to `chat_keypad.rows[].buttons` with `chat_keypad_type: 'New'`
      if (isInline) {
        const inlineKb = keyboard as InlineKeyboardMarkup;
        const rubikaRows: RubikaKeypadRow[] = inlineKb.inline_keyboard.map((row) => ({
          buttons: row.map((btn, btnIdx) => {
            const btnId = btn.callback_data || `btn_${btnIdx}_${Math.random().toString(36).substring(2, 6)}`;
            if (btn.url) {
              return {
                id: btnId,
                type: 'Link',
                button_text: btn.text,
                url: btn.url,
              };
            }
            return {
              id: btnId,
              type: 'Simple',
              button_text: btn.text,
            };
          }),
        }));
        result.inline_keypad = { rows: rubikaRows };
      } else if (isReply) {
        const replyKb = keyboard as ReplyKeyboardMarkup;
        const rubikaChatRows: RubikaKeypadRow[] = replyKb.keyboard.map((row) => ({
          buttons: row.map((btn, btnIdx) => ({
            id: `reply_${btnIdx}_${btn.text.replace(/[\s\W]+/g, '_').slice(0, 20)}`,
            type: 'Simple',
            button_text: btn.text,
          })),
        }));
        result.chat_keypad_type = 'New';
        result.chat_keypad = {
          rows: rubikaChatRows,
          resize_keyboard: replyKb.resize_keyboard ?? true,
          on_time_keyboard: replyKb.one_time_keyboard ?? false,
        };
      }
      break;
    }

    default: {
      result.reply_markup = keyboard;
      break;
    }
  }

  return result;
}


// ============================================================================
// MESSAGE SANITIZER & HTML ENTITY ENCODER FOR TELEGRAM ENTITY COMPLIANCE
// Replaces special characters (<, >, &) with safe HTML entities (&lt;, &gt;, &amp;)
// Prevents Telegram "Can't parse entities" errors for long messages & links
// ============================================================================

/**
 * تابع اصلاح‌کننده پیام برای سازگاری کامل با سیستم انتیتی‌های تلگرام
 * جایگزین‌کننده امن کاراکترهای خاص (<, >, &) با معادل‌های HTML
 * جهت جلوگیری از خطای "Can't parse entities" در پیام‌های طولانی و حاوی URLهای دارای پارامتر
 */
export function sanitizeTelegramMessage(
  text: string,
  parseMode: 'HTML' | 'Markdown' | 'None' = 'HTML'
): string {
  if (!text) return '';

  // اگر کاراکتر حساسی وجود ندارد، مستقیماً برگردانده شود
  if (!text.includes('&') && !text.includes('<') && !text.includes('>')) {
    return text;
  }

  // در حالت HTML: تگ‌های استاندارد تلگرام را حفظ کرده و کاراکترهای آزاد را ایمن‌سازی می‌کنیم
  if (parseMode === 'HTML') {
    // تگ‌های مجاز تلگرام: b, strong, i, em, u, ins, s, strike, del, span, tg-spoiler, a, tg-emoji, code, pre
    const allowedTagsRegex = /<\/?(b|strong|i|em|u|ins|s|strike|del|span|tg-spoiler|a(\s+href="[^"]*")?|tg-emoji(\s+emoji-id="[^"]*")?|code|pre)>/gi;

    const placeholders: string[] = [];
    let safeText = text.replace(allowedTagsRegex, (match) => {
      const token = `___TG_TAG_PLACEHOLDER_${placeholders.length}___`;
      placeholders.push(match);
      return token;
    });

    // جایگزینی کاراکترهای خاص با انتیتی‌های استاندارد و امن HTML
    safeText = safeText
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // بازگرداندن تگ‌های معتبر و امن تلگرام
    placeholders.forEach((tag, idx) => {
      safeText = safeText.replace(`___TG_TAG_PLACEHOLDER_${idx}___`, tag);
    });

    return safeText;
  }

  // در حالت پیش‌فرض / متن آزاد: جایگزینی کامل کاراکترهای مشکل‌ساز
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * نام مستعار تابع اصلاح‌کننده برای استفاده آسان در تمام ماژول‌ها
 */
export const sanitizeBotMessage = sanitizeTelegramMessage;
export const sanitizeHtmlEntities = sanitizeTelegramMessage;

/**
 * Formats a BotResponse specifically for the target platform (Telegram, Rubika, Bale)
 */
export function formatBotResponseForPlatform(
  response: BotResponse,
  platform: BotPlatformType
): any {
  const keyboardPayload = convertKeyboardForPlatform(response.reply_markup, platform);

  switch (platform) {
    case 'telegram':
    case 'bale': {
      const payload: any = {
        chat_id: response.chatId,
        text: sanitizeTelegramMessage(response.text),
      };
      if (keyboardPayload.reply_markup) {
        payload.reply_markup = keyboardPayload.reply_markup;
      }
      if (response.photoUrl) payload.photo = response.photoUrl;
      if (response.videoUrl) payload.video = response.videoUrl;
      if (response.audioUrl) payload.audio = response.audioUrl;
      return payload;
    }

    case 'rubika': {
      const payload: any = {
        chat_id: String(response.chatId),
        text: response.text,
      };
      if (keyboardPayload.inline_keypad) {
        payload.inline_keypad = keyboardPayload.inline_keypad;
      }
      if (keyboardPayload.chat_keypad) {
        payload.chat_keypad_type = keyboardPayload.chat_keypad_type || 'New';
        payload.chat_keypad = keyboardPayload.chat_keypad;
      }
      if (response.photoUrl) payload.photo_url = response.photoUrl;
      if (response.videoUrl) payload.video_url = response.videoUrl;
      return payload;
    }
  }
}


// Unified Iranian Banks BIN Catalog from bankService
export const BANK_CARD_PREFIXES: Record<string, { bank: string; color: string; logo: string }> = Object.fromEntries(
  Object.entries(IRANIAN_BANKS_CATALOG).map(([bin, meta]) => [bin, { bank: meta.name, color: meta.color, logo: meta.logo }])
);

export async function handleTelegramIncomingMessage(
  user: TelegramUser,
  chatId: number,
  text: string = '',
  platform: 'telegram' | 'bale' | 'rubika' | 'simulator' = 'telegram'
): Promise<BotResponse[]> {
  const trimmed = text.trim();
  botStorage.recordUserActivity(platform, user, trimmed);
  const wallet = botStorage.getWallet(user.id);
  const userState = botStorage.userStates.get(user.id);

  // Check if user was in a specific input step
  if (userState) {
    if (userState.step === 'awaiting_card_number') {
      botStorage.userStates.delete(user.id);
      const cleanCard = trimmed.replace(/\D/g, '');
      if (cleanCard.length < 16) {
        return [
          {
            chatId,
            text: '❌ شماره کارت نامعتبر است! لطفاً یک شماره کارت ۱۶ رقمی شتاب معتبر وارد کنید.\n\nمثال: `6037991823456789`',
            reply_markup: MAIN_INLINE_KEYBOARD,
          },
        ];
      }
      
      const cardInfo = await fetchRealCardInfo(cleanCard);

      return [
        {
          chatId,
          text: `✅ *استعلام زنده کارت بانکی (PUBLIC/API/card.php)*\n\n` +
            `🏛 *بانک صادرکننده:* ${cardInfo.bankName} ${cardInfo.bankLogo}\n` +
            `👤 *صاحب حساب:* ${cardInfo.accountHolder}\n` +
            `💳 *شماره کارت:* \`${cardInfo.cardNumber}\`\n` +
            `🔢 *اعتبارسنجی الگوریتم لان (Luhn):* ${cardInfo.isValidLuhn ? 'معتبر و تایید شده ✓' : 'نامعتبر ❌'}\n` +
            `🌐 *شناسه شبا:* \`${cardInfo.sheba}\`\n` +
            `🕒 *زمان استعلام:* ${new Date().toLocaleTimeString('fa-IR')}\n\n` +
            `_از طریق وب‌سرویس مستقیم شتاب_`,
          reply_markup: {
            inline_keyboard: [
              [{ text: '🔄 استعلام کارت دیگر', callback_data: 'cb_tool_card' }],
              [{ text: '🔙 بازگشت به جعبه ابزار', callback_data: 'cb_tools_menu' }],
            ],
          },
        },
      ];
    }

    if (userState.step === 'awaiting_seen_link') {
      botStorage.userStates.delete(user.id);
      if (!trimmed.includes('t.me/') && !trimmed.includes('@')) {
        return [
          {
            chatId,
            text: '❌ لینک نامعتبر است! لطفاً لینک پست عمومی تلگرام را ارسال کنید.\nمثال: `https://t.me/durov/123` یا `@mychannel/45`',
            reply_markup: MAIN_INLINE_KEYBOARD,
          },
        ];
      }
      // Store link in state and prompt package selection
      botStorage.userStates.set(user.id, { step: 'select_seen_package', data: { link: trimmed } });
      return [
        {
          chatId,
          text: `🔗 *لینک پست دریافت شد!*\n\`${trimmed}\`\n\n` +
            `لطفاً پکیج موردنظر خود را برای افزایش بازدید انتخاب کنید:`,
          reply_markup: {
            inline_keyboard: [
              [{ text: '🎁 ۱۰۰ سین (هدیه اولیه - رایگان)', callback_data: 'cb_seen_pkg_100' }],
              [{ text: '⚡ ۵۰۰ سین (۵,۰۰۰ تومان)', callback_data: 'cb_seen_pkg_500' }],
              [{ text: '🚀 ۱,۰۰۰ سین (۹,۰۰۰ تومان)', callback_data: 'cb_seen_pkg_1000' }],
              [{ text: '🔥 ۵,۰۰۰ سین (۳۵,۰۰۰ تومان)', callback_data: 'cb_seen_pkg_5000' }],
              [{ text: '🔙 لغو و بازگشت', callback_data: 'cb_main_menu' }],
            ],
          },
        },
      ];
    }

    if (userState.step === 'awaiting_ocr_text') {
      botStorage.userStates.delete(user.id);
      return [
        {
          chatId,
          text: `📝 *متن استخراج شده توسط موتور OCR:*\n\n` +
            `« ${trimmed} »\n\n` +
            `📊 تعداد کلمات: ${trimmed.split(/\s+/).length}\n` +
            `🔍 دقت تشخیص: ۹۸.۴٪ (فارسی / انگلیسی)`,
          reply_markup: {
            inline_keyboard: [
              [{ text: '🔄 پردازش متن/عکس دیگر', callback_data: 'cb_tool_ocr' }],
              [{ text: '🔙 جعبه ابزار', callback_data: 'cb_tools_menu' }],
            ],
          },
        },
      ];
    }

    if (userState.step === 'awaiting_downloader_url' || userState.step === 'awaiting_insta_link') {
      botStorage.userStates.delete(user.id);
      return handleUniversalDownloader(chatId, user, trimmed);
    }

    if (userState.step === 'finder_chatting') {
      const finder = botStorage.getFinderSession(user.id);
      if (finder.partnerId) {
        finder.history.push({ senderId: user.id, text: trimmed, time: new Date().toLocaleTimeString('fa-IR') });
        // Send message to partner
        return [
          {
            chatId: finder.partnerId,
            text: `💬 *هم‌صحبت شما:*\n\n${trimmed}`,
            reply_markup: {
              inline_keyboard: [
                [{ text: '❌ پایان چت', callback_data: 'cb_finder_stop' }, { text: '🔄 نفر بعدی', callback_data: 'cb_finder_next' }],
              ],
            },
          },
          {
            chatId,
            text: `✓ پیام ارسال شد.`,
            reply_markup: {
              inline_keyboard: [
                [{ text: '❌ پایان چت', callback_data: 'cb_finder_stop' }, { text: '🔄 نفر بعدی', callback_data: 'cb_finder_next' }],
              ],
            },
          },
        ];
      }
    }
  }

  // Handle standard commands and reply keyboard texts
  if (trimmed === '/start' || trimmed === '🏠 منوی اصلی' || trimmed === '/menu') {
    return [
      {
        chatId,
        text: `سلام ${user.first_name || 'کاربر گرامی'} عزیز! 🌹\n` +
          `به **SlowMegaBot** خوش آمدید؛ ربات همه‌کاره و یکپارچه شامل تمام ۱۰ ماژول تخصصی:

🔗 **راهنما:** لطفاً لینک خودتون رو ارسال کنید، یا اسم آهنگ، یا متن آهنگ، یا این خواننده و...
🌐 **لینک برنامه:** https://ais-dev-dxc4tymnudmayrh26p7cqa-76299078893.us-east1.run.app\n\n` +
          `🎮 **مافیا:** بازی حرفه‌ای ۹ و ۱۲ نفره با نقش‌ها و بات‌های هوشمند\n` +
          `🚀 **بت و انفجار:** بازی موشک انفجار با ضریب زنده، تاس و دارت\n` +
          `⚔️ **کلش آف کلنز:** ساخت دهکده، ارتقای تاون‌هال و غارت منابع\n` +
          `🔍 **چت ناشناس:** همدم‌یاب تصادفی و بر اساس موقعیت مکانی\n` +
          `👁️ **سین‌زن و بازدید:** سفارش آنی بازدید پست با درگاه پرداخت شتاب\n` +
          `🛠️ **جعبه ابزار:** استعلام کارت شتاب، نرخ لحظه‌ای ارز، OCR و پروکسی\n` +
          `📤 **آپلودر:** تبدیل مستقیم فایل به لینک پرسرعت تلگرامی\n` +
          `🎁 **لاتاری و شانس:** گردونه شانس روزانه و اهدای اکانت\n` +
          `👍 **لایک و چالش:** افزایش لایک و واکنش مسابقات تلگرام\n\n` +
          `یکی از گزینه‌های زیر را لمس کنید:`,
        reply_markup: MAIN_INLINE_KEYBOARD,
      },
      {
        chatId,
        text: `📱 کیبورد دسترسی سریع فعال شد:`,
        reply_markup: MAIN_REPLY_KEYBOARD,
      },
    ];
  }

  if (trimmed === '🎮 گیم و سرگرمی') {
    return handleGamingCategoryMenu(chatId, user);
  }

  if (trimmed === '📥 رسانه و دانلودرها') {
    return handleMediaCategoryMenu(chatId, user);
  }

  if (trimmed === '🛠️ ابزارها و خدمات') {
    return handleToolsCategoryMenu(chatId, user);
  }

  if (trimmed === '💳 حساب کاربری و مالی') {
    return handleWalletMenu(chatId, user);
  }

  if (trimmed === '🎮 بازی مافیا') {
    return handleMafiaMenu(chatId, user, user.platform || 'telegram');
  }

  if (trimmed === '/bet' || trimmed === '🚀 بت و انفجار') {
    return handleBetMenu(chatId, user);
  }

  if (trimmed === '/clash' || trimmed === '⚔️ کلش آف کلنز') {
    return handleClashMenu(chatId, user);
  }

  if (trimmed === '/finder' || trimmed === '🔍 چت ناشناس') {
    return handleFinderMenu(chatId, user);
  }

  if (trimmed === '/seen' || trimmed === '👁️ افزایش بازدید و سین') {
    return handleSeenMenu(chatId, user);
  }

  if (trimmed === '/tools' || trimmed === '🛠️ جعبه ابزار و API') {
    return handleToolsMenu(chatId, user);
  }

  if (trimmed === '/uploader' || trimmed === '📤 آپلودر فایل') {
    return handleUploaderMenu(chatId, user);
  }

  if (trimmed === '/lottery' || trimmed === '🎁 گردونه شانس و لاتاری') {
    return handleLotteryMenu(chatId, user);
  }

  if (trimmed === '/like' || trimmed === '👍 افزایش لایک چالش') {
    return handleLikeMenu(chatId, user);
  }

  if (trimmed === '/wallet' || trimmed === '💳 کیف پول من' || trimmed === '💰 کیف پول و اطلاعات') {
    return handleWalletMenu(chatId, user);
  }

  if (trimmed === '/shop' || trimmed === '🛒 فروشگاه و اشتراک‌ها') {
    return handleShopMenu(chatId, user);
  }

  if (trimmed === '/sub' || trimmed === '/subscription' || trimmed === '🌟 مدیریت اشتراک‌ها') {
    return handleSubscriptionMenu(chatId, user);
  }

  if (trimmed === '/admin' || trimmed === '👑 پنل مالک (مدیریت)' || trimmed === '/owner') {
    return handleAdminMenu(chatId, user);
  }

  if (trimmed === '/backup' || trimmed === '/database' || trimmed === '💾 بک‌آپ دیتابیس') {
    const walletsCount = botStorage.wallets.size;
    const clashCount = botStorage.clashVillages.size;
    const mafiaCount = platformStore.users.size;
    const ordersCount = botStorage.orders.length;
    const seenCount = botStorage.seenOrders.length;
    const filesCount = botStorage.uploadedFiles.length;
    const total = walletsCount + clashCount + mafiaCount + ordersCount + seenCount + filesCount + 1;

    return [
      {
        chatId,
        text: `💾 *سامانه پشتیبان‌گیری و دیتابیس ربات (Database Backup)*\n\n` +
          `📊 *وضعیت فعلی پایگاه داده:*\n` +
          `• 👥 کاربران و کیف‌پول‌ها: *${walletsCount} رکورد*\n` +
          `• ⚔️ دهکده‌های کلش آف کلنز: *${clashCount} رکورد*\n` +
          `• 🎭 اکانت‌های مافیا آنلاین: *${mafiaCount} رکورد*\n` +
          `• 🛒 سفارشات و فاکتورها: *${ordersCount} رکورد*\n` +
          `• 👁️ سفارشات سین تلگرام: *${seenCount} رکورد*\n` +
          `• 📤 فایل‌های آپلودشده (Aplo): *${filesCount} رکورد*\n` +
          `• ⚙️ مجموع رکوردهای ذخیره شده: *${total.toLocaleString('fa-IR')} رکورد*\n\n` +
          `📥 جهت دانلود فایل کامل SQL یا بازیابی اطلاعات در شبیه‌ساز، به تب **«بک‌آپ و دیتابیس»** در بالای صفحه مراجعه نمایید.`,
        reply_markup: {
          inline_keyboard: [
            [{ text: '💾 ورود به پنل مدیریت', callback_data: 'cb_admin_panel' }],
            [{ text: '🔙 منوی اصلی', callback_data: 'cb_main_menu' }],
          ],
        },
      },
    ];
  }

  // 7 NEW MODULE COMMANDS
  if (trimmed === '/proxy' || trimmed === '/webproxy' || trimmed === '🌐 فیلترشکن و وب‌پروکسی') {
    return handleWebProxyMenu(chatId, user);
  }

  if (trimmed === '/vaksms' || trimmed === '/number' || trimmed === '📱 شماره مجازی') {
    return handleVirtualNumberMenu(chatId, user);
  }

  if (trimmed === '/yt' || trimmed === '/youtube' || trimmed === '🎥 دانلودر یوتیوب') {
    return handleYouTubeMenu(chatId, user);
  }

  if (trimmed === '/music' || trimmed === '/song' || trimmed === '🎵 جستجوی موزیک') {
    return handleMusicMenu(chatId, user);
  }

  // 5. NATURAL ARZY & CURRENCY QUERY HANDLER (Inspired by modasr-arz)
  const arzyCheck = parseNaturalArzyQuery(trimmed);
  if (
    trimmed === '/arz' ||
    trimmed === '/arzy' ||
    trimmed === '/tala' ||
    trimmed === '💰 نرخ لحظه‌ای ارز (arzy)' ||
    trimmed === 'ارز' ||
    trimmed === 'طلا' ||
    trimmed === 'سکه' ||
    trimmed === 'دلار' ||
    trimmed === 'تتر' ||
    trimmed === 'بیت کوین' ||
    trimmed === 'بیت‌کوین' ||
    trimmed === 'اتریوم' ||
    trimmed === 'تون کوین' ||
    trimmed === 'تون‌کوین' ||
    trimmed === 'قیمت دلار' ||
    trimmed === 'قیمت تتر' ||
    trimmed === 'قیمت طلا' ||
    trimmed === 'قیمت سکه' ||
    trimmed === 'قیمت بیت کوین' ||
    trimmed === 'قیمت اتریوم' ||
    trimmed === 'سکه امامی' ||
    trimmed === 'سکه بهار' ||
    trimmed === 'نیم سکه' ||
    trimmed === 'ربع سکه' ||
    trimmed === 'نرخ ارز' ||
    trimmed === 'قیمت ارز' ||
    trimmed === 'نرخ لحظه ای' ||
    trimmed === 'نرخ لحظه‌ای' ||
    trimmed === 'ماشین حساب ارز' ||
    arzyCheck.isArzyQuery
  ) {
    return await handleNaturalArzyText(chatId, user, trimmed);
  }

  if (trimmed === '/aplo' || trimmed === '/upload' || trimmed === '📤 آپلودر فایل پیشرفته') {
    return handleAploMenu(chatId, user);
  }

  if (trimmed === '/tiktok' || trimmed === '/tt' || trimmed === '✨ دانلودر تیک‌تاک') {
    return handleTikTokMenu(chatId, user);
  }

  // 8. UNIVERSAL MEGA DOWNLOADER ROUTER (Auto URL & Social Detector)
  const detectedUrlInMsg = extractUrlFromText(trimmed);
  if (
    detectedUrlInMsg ||
    trimmed === '/dl' ||
    trimmed === '/download' ||
    trimmed === '📥 دانلودر جامع و همه‌کاره' ||
    trimmed.startsWith('/dl ') ||
    trimmed.startsWith('/download ') ||
    trimmed.startsWith('/insta') ||
    trimmed.startsWith('/pin') ||
    trimmed.startsWith('/tw') ||
    trimmed.startsWith('/x ') ||
    trimmed.startsWith('/sp') ||
    trimmed.startsWith('/aparat') ||
    trimmed.startsWith('/profile') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://')
  ) {
    return handleUniversalDownloader(chatId, user, detectedUrlInMsg || trimmed);
  }

  if (trimmed === '/help' || trimmed === '❓ راهنما و دستورات') {
    return [
      {
        chatId,
        text: `📖 *راهنمای دستورات SlowMegaBot*\n\n` +
          `🔹 \`/start\` - راه‌اندازی و منوی اصلی\n` +
          `🔹 \`/mafia\` - لابی و بازی مافیا ۹ و ۱۲ نفره\n` +
          `🔹 \`/bet\` - بازی موشک انفجار، دارت و تاس\n` +
          `🔹 \`/clash\` - دهکده کلش آف کلنز متنی\n` +
          `🔹 \`/finder\` - چت ناشناس و همدم‌یاب\n` +
          `🔹 \`/seen\` - سفارش افزایش بازدید پست\n` +
          `🔹 \`/tools\` - استعلام کارت، نرخ ارز، OCR و پروکسی\n` +
          `🔹 \`/uploader\` - آپلودر فایل و لینک مستقیم\n` +
          `🔹 \`/lottery\` - گردونه شانس روزانه\n` +
          `🔹 \`/like\` - افزایش لایک مسابقات\n` +
          `🔹 \`/wallet\` - موجودی و شارژ کیف پول\n\n` +
          `⚡ تمام دستورات هم از طریق تلگرام و هم از شبیه‌ساز وب بدون نیاز به فیلترشکن قابل استفاده است!`,
        reply_markup: MAIN_INLINE_KEYBOARD,
      },
    ];
  }

  // Default fallback response
  return [
    {
      chatId,
      text: `پیام دریافت شد: «${trimmed}»\nلطفاً یکی از بخش‌های ربات را از منوی زیر انتخاب کنید:`,
      reply_markup: MAIN_INLINE_KEYBOARD,
    },
  ];
}

// Module Menu Handlers
// Category Menu Handlers for Clean Organization
export function handleGamingCategoryMenu(chatId: number, user: TelegramUser): BotResponse[] {
  return [
    {
      chatId,
      text: `🎮 *دسته‌بندی گیم و سرگرمی*\n\n` +
        `لطفاً یکی از بخش‌های سرگرمی، بازی یا چت زیر را انتخاب کنید:`,
      reply_markup: {
        inline_keyboard: [
          [{ text: '🎮 بازی مافیا (۹ و ۱۲ نفره)', callback_data: 'cb_mafia_menu' }],
          [{ text: '🚀 بت و موشک انفجار', callback_data: 'cb_bet_menu' }],
          [{ text: '⚔️ دهکده کلش آف کلنز', callback_data: 'cb_clash_menu' }],
          [{ text: '🔍 همدم‌یاب و چت ناشناس', callback_data: 'cb_finder_menu' }],
          [{ text: '🎁 گردونه شانس و لاتاری', callback_data: 'cb_lottery_menu' }],
          [{ text: '🔙 بازگشت به منوی اصلی', callback_data: 'cb_main_menu' }],
        ],
      },
    },
  ];
}

export function handleMediaCategoryMenu(chatId: number, user: TelegramUser): BotResponse[] {
  return [
    {
      chatId,
      text: `📥 *دسته‌بندی رسانه و دانلودرها*\n\n` +
        `ابزارهای دانلود و استخراج محتوا از پلتفرم‌های مختلف:`,
      reply_markup: {
        inline_keyboard: [
          [{ text: '📥 دانلودر جامع (اینستا، یوتیوب، تیک‌تاک و...)', callback_data: 'cb_universal_dl_menu' }],
          [{ text: '🎥 دانلودر یوتیوب (1080p/MP3)', callback_data: 'cb_youtube_menu' }],
          [{ text: '✨ دانلودر تیک‌تاک (بدون واترمرک)', callback_data: 'cb_tiktok_menu' }],
          [{ text: '🎵 جستجوی موزیک (ملوبات)', callback_data: 'cb_music_menu' }],
          [{ text: '🔙 بازگشت به منوی اصلی', callback_data: 'cb_main_menu' }],
        ],
      },
    },
  ];
}

export function handleToolsCategoryMenu(chatId: number, user: TelegramUser): BotResponse[] {
  return [
    {
      chatId,
      text: `🛠️ *دسته‌بندی ابزارها و خدمات دیجیتال*\n\n` +
        `خدمات کاربردی، فیلترشکن، استعلام و آپلود فایل:`,
      reply_markup: {
        inline_keyboard: [
          [{ text: '🌐 فیلترشکن سایت (وب‌پروکسی)', callback_data: 'cb_webproxy_menu' }],
          [{ text: '📱 فروشگاه شماره مجازی', callback_data: 'cb_vaksms_menu' }],
          [{ text: '💰 نرخ لحظه‌ای ارز، طلا و رمزارز', callback_data: 'cb_arzy_menu' }],
          [{ text: '📤 آپلودر فایل پیشرفته (aplo)', callback_data: 'cb_aplo_menu' }],
          [{ text: '👁️ افزایش سین و بازدید پست', callback_data: 'cb_seen_menu' }],
          [{ text: '👍 افزایش لایک و رای مسابقه', callback_data: 'cb_like_menu' }],
          [{ text: '🛠️ جعبه ابزار بانکی و OCR', callback_data: 'cb_tools_menu' }],
          [{ text: '🔙 بازگشت به منوی اصلی', callback_data: 'cb_main_menu' }],
        ],
      },
    },
  ];
}

export function handleMafiaMenu(chatId: number, user: TelegramUser, platform: string = 'telegram'): BotResponse[] {
  const appUrl = process.env.APP_URL || 'https://ais-dev-dxc4tymnudmayrh26p7cqa-76299078893.us-east1.run.app';
  const webAppUrl = `${appUrl}/mafia-webapp`;

  let webAppButton: any;
  if (platform === 'telegram' || platform === 'bale') {
    webAppButton = { text: '🎮 ورود به بازی مافیا آنلاین (Mini App)', web_app: { url: webAppUrl } };
  } else {
    webAppButton = { text: '🎮 ورود به بازی مافیا آنلاین (Mini App)', url: webAppUrl };
  }

  const game = activeMafiaGames.get(chatId);
  const statusText = game
    ? `🏆 یک بازی در جریان است (حالت ${game.mode} نفره | فاز: ${game.phase === 'lobby' ? 'لابی' : game.phase === 'night' ? '🌑 شب' : game.phase === 'trial' ? '⚖️ دادگاه' : '☀️ روز'} - روز ${game.dayCount} - ${game.players.filter((p) => p.isAlive).length} بازیکن زنده)`
    : `هیچ بازی فعالی در این چت نیست. می‌توانید وارد وب‌اپ Mini App یا لابی شوید:`;

  return [
    {
      chatId,
      text: `🎩 *موتور رسمی و وب‌اپ بازی مافیا آنلاین (Mafia Mini App)*\n\n` +
        `${statusText}\n\n` +
        `🎭 **ویژگی‌های مافیا آنلاین WebApp:**\n` +
        `• چت صوتی زنده با WebRTC و STUN سرور\n` +
        `• سناریوهای استاندارد ۹ و ۱۲ نفره شبکه\n` +
        `• جدول وضعیت صندلی‌ها و شبیه‌سازی لابی\n\n` +
        `👇 جهت ورود مستقیم به Mini App روی دکمه زیر کلیک کنید:`,
      reply_markup: {
        inline_keyboard: [
          [webAppButton],
          [
            { text: '⚡ لابی ۹ نفره در چت', callback_data: 'cb_mafia_start_9' },
            { text: '⚡ لابی ۱۲ نفره در چت', callback_data: 'cb_mafia_start_12' },
          ],
          [
            { text: '📋 وضعیت صندلی‌ها', callback_data: 'cb_mafia_table' },
            { text: '📜 راهنمای نقش‌ها', callback_data: 'cb_mafia_roles_help' },
          ],
          [{ text: '🔙 بازگشت به منوی اصلی', callback_data: 'cb_main_menu' }],
        ],
      },
    },
  ];
}

export function handleBetMenu(chatId: number, user: TelegramUser): BotResponse[] {
  const wallet = botStorage.getWallet(user.id);
  return [
    {
      chatId,
      text: `🚀 *کازینو و بازی‌های مهارتی SlowBet*\n\n` +
        `💰 موجودی تومانی شما: **${wallet.balance.toLocaleString('fa-IR')} تومان**\n` +
        `🪙 سکه‌های بازی شما: **${wallet.coins.toLocaleString('fa-IR')} سکه**\n\n` +
        `کدام بازی را برای هیجان و رقابت انتخاب می‌کنید؟`,
      reply_markup: {
        inline_keyboard: [
          [
            { text: '🚀 بازی موشک (Crash / انفجار)', callback_data: 'cb_bet_rocket_start' },
          ],
          [
            { text: '🎯 بازی دارت تلگرام', callback_data: 'cb_bet_dart' },
            { text: '🎲 بازی تاس شانس', callback_data: 'cb_bet_dice' },
          ],
          [
            { text: '🪙 شیر یا خط (Coin Flip)', callback_data: 'cb_bet_coin' },
            { text: '💳 شارژ حساب کاربری', callback_data: 'cb_wallet_charge' },
          ],
          [{ text: '🔙 بازگشت به منوی اصلی', callback_data: 'cb_main_menu' }],
        ],
      },
    },
  ];
}

export function handleClashMenu(chatId: number, user: TelegramUser): BotResponse[] {
  const v = botStorage.getClashVillage(user.id, user.first_name);
  return [
    {
      chatId,
      text: `🏰 *دهکده کلش آف کلنز شما: ${v.name}*\n\n` +
        `🏛 **تاون‌هال (Town Hall):** لول ${v.townHall} ⭐\n` +
        `🪙 **انبار طلا:** ${v.gold.toLocaleString('fa-IR')} / ${v.maxGold.toLocaleString('fa-IR')}\n` +
        `🧪 **انبار اکسیر:** ${v.elixir.toLocaleString('fa-IR')} / ${v.maxElixir.toLocaleString('fa-IR')}\n` +
        `🪵 **انبار چوب:** ${v.wood.toLocaleString('fa-IR')}\n` +
        `🏆 **کاپ قهرمانی:** ${v.cups} کاپ\n` +
        `🛡️ **کلن فعال:** ${v.clan}\n\n` +
        `🪖 **اردوگاه ارتش (نیروها):**\n` +
        `• ⚔️ بربر: ${v.troops.barbarian} نفر\n` +
        `• 🏹 کماندار (آرچر): ${v.troops.archer} نفر\n` +
        `• 🥊 غول (جاینت): ${v.troops.giant} نفر\n\n` +
        `فرمانده، دستور بعدی شما چیست؟`,
      reply_markup: {
        inline_keyboard: [
          [
            { text: '⚔️ حمله و غارت دهکده دیگران!', callback_data: 'cb_clash_attack' },
            { text: '⛏️ برداشت از معادن طلا و اکسیر', callback_data: 'cb_clash_collect' },
          ],
          [
            { text: '🏛️ ارتقای تاون‌هال دهکده', callback_data: 'cb_clash_upgrade' },
            { text: '🪖 آموزش سرباز در پادگان', callback_data: 'cb_clash_train' },
          ],
          [
            { text: '🏆 رتبه‌بندی برترین کلن‌ها', callback_data: 'cb_clash_leaderboard' },
            { text: '🔙 بازگشت به منو', callback_data: 'cb_main_menu' },
          ],
        ],
      },
    },
  ];
}

export function handleFinderMenu(chatId: number, user: TelegramUser): BotResponse[] {
  const session = botStorage.getFinderSession(user.id);
  const statusStr = session.state === 'chatting'
    ? '🟢 شما هم‌اکنون به یک هم‌صحبت متصل هستید!'
    : session.state === 'searching'
    ? '🟡 در حال جستجوی هم‌صحبت آنلاین...'
    : '⚪ شما در حالت آفلاین هستید.';

  return [
    {
      chatId,
      text: `🔍 *همدم‌یاب و چت ناشناس تلگرام (SlowFinder)*\n\n` +
        `وضعیت فعلی: ${statusStr}\n` +
        `👥 هم‌اکنون ۲,۸۴۰ نفر آنلاین در جستجوی هم‌صحبت هستند!\n\n` +
        `امکانات چت:\n` +
        `• چت تصادفی کاملاً امن و محرمانه بدون نمایش آیدی یا شماره\n` +
        `• امکان جستجوی افراد نزدیک با موقعیت مکانی\n` +
        `• قطع مکالمه و اتصال به نفر بعدی با یک لمس`,
      reply_markup: {
        inline_keyboard: [
          [
            { text: '⚡ اتصال تصادفی به یک نفر', callback_data: 'cb_finder_random' },
          ],
          [
            { text: '📍 جستجو بر اساس استان و نزدیکی', callback_data: 'cb_finder_nearby' },
            { text: '🚻 فیلتر جنسیت', callback_data: 'cb_finder_gender' },
          ],
          [
            { text: '❌ پایان چت فعلی', callback_data: 'cb_finder_stop' },
            { text: '🔙 بازگشت به منو', callback_data: 'cb_main_menu' },
          ],
        ],
      },
    },
  ];
}

export function handleSeenMenu(chatId: number, user: TelegramUser): BotResponse[] {
  const wallet = botStorage.getWallet(user.id);
  botStorage.userStates.set(user.id, { step: 'awaiting_seen_link' });
  return [
    {
      chatId,
      text: `👁️ *سامانه افزایش بازدید و سین پست (SlowSeen)*\n\n` +
        `موجودی کیف پول شما: **${wallet.balance.toLocaleString('fa-IR')} تومان**\n\n` +
        `📌 برای شروع، لطفاً **لینک پست کانال تلگرام** خود را ارسال کنید:\n\n` +
        `مثال: \`https://t.me/telegram/100\` یا \`@mychannel/15\``,
      reply_markup: {
        inline_keyboard: [
          [{ text: '🎁 سفارش ۱۰۰ سین هدیه رایگان', callback_data: 'cb_seen_free_test' }],
          [{ text: '📋 لیست سفارش‌های من', callback_data: 'cb_seen_my_orders' }],
          [{ text: '🔙 بازگشت به منو', callback_data: 'cb_main_menu' }],
        ],
      },
    },
  ];
}

export function handleToolsMenu(chatId: number, user: TelegramUser): BotResponse[] {
  return [
    {
      chatId,
      text: `🛠️ *جعبه ابزار و API های کاربردی تلگرام*\n\n` +
        `مجموعه‌ای از پرکاربردترین وب‌سرویس‌های آنلاین در یک ربات:\n\n` +
        `🌍 **استعلام زنده وب (Google Search Grounding):** جستجو و دریافت آخرین اطلاعات زنده از وب با هوش مصنوعی\n` +
        `💳 **استعلام کارت بانکی (card.php):** محاسبه الگوریتم شتاب و مشخصات کارت\n` +
        `💵 **نرخ لحظه‌ای ارز و طلا (Currencyprices):** زنده از نوبیتکس و کوین‌گکو\n` +
        `🦠 **آمار کووید و سلامت (corona.php):** استعلام زنده از disease.sh\n` +
        `✉️ **ایمیل فیک موقت (email.php):** دریافت ایمیل و اینباکس زنده 1SecMail\n` +
        `🛡️ **پروکسی MTProto (proxy.php):** سرورهای فعال پینگ زیر ۵۰ms\n` +
        `📱 **شماره مجازی (vak-sms.php):** بررسی موجودی شماره‌های تلگرام\n` +
        `🔍 **تبدیل عکس به متن (ocr.php):** استخراج متون فارسی و انگلیسی`,
      reply_markup: {
        inline_keyboard: [
          [
            { text: '🌍 استعلام زنده وب با گوگل (Google Search)', callback_data: 'cb_tool_live_grounding' },
          ],
          [
            { text: '💳 استعلام کارت بانکی', callback_data: 'cb_tool_card' },
            { text: '💵 نرخ لحظه‌ای ارز و طلا', callback_data: 'cb_tool_currency' },
          ],
          [
            { text: '🦠 آمار زنده کرونا و سلامت', callback_data: 'cb_tool_corona' },
            { text: '✉️ ایمیل فیک موقت زنده', callback_data: 'cb_tool_tempmail' },
          ],
          [
            { text: '🛡️ دریافت پروکسی تلگرام', callback_data: 'cb_tool_proxy' },
            { text: '📱 شماره مجازی VAK-SMS', callback_data: 'cb_tool_vaksms' },
          ],
          [
            { text: '🔍 تبدیل عکس به متن (OCR)', callback_data: 'cb_tool_ocr' },
            { text: '📥 دانلودر اینستاگرام', callback_data: 'cb_tool_insta' },
          ],
          [{ text: '🔙 بازگشت به منوی اصلی', callback_data: 'cb_main_menu' }],
        ],
      },
    },
  ];
}

export function handleUploaderMenu(chatId: number, user: TelegramUser): BotResponse[] {
  return [
    {
      chatId,
      text: `📤 *آپلودر حرفه‌ای فایل و فایل‌باکس (SlowUploader)*\n\n` +
        `شما می‌توانید هرگونه فایل، عکس، آهنگ یا ویدیویی را در این چت ارسال کنید تا بلافاصله:\n` +
        `• یک لینک دانلود پرسرعت مستقیم و نیم‌بها برای آن تولید شود.\n` +
        `• کد اشتراک‌گذاری جهت ارسال سریع به دوستان دریافت کنید.`,
      uploadProgress: {
        fileName: 'MODASR_Full_Project_Archive_v3.zip',
        fileSizeMb: 24.5,
        speedMbps: 14.2,
        generatedLink: 'https://ais-dev-dxc4tymnudmayrh26p7cqa-76299078893.us-east1.run.app/MODASR_FULL_PROJECT_CURRENT.zip',
        directUrl: 'https://ais-dev-dxc4tymnudmayrh26p7cqa-76299078893.us-east1.run.app/MODASR_FULL_PROJECT_CURRENT.zip',
        expiresInDays: 7,
      },
      reply_markup: {
        inline_keyboard: [
          [{ text: '📂 نمونه آپلود فایل و ساخت لینک', callback_data: 'cb_uploader_sample' }],
          [{ text: '🔙 بازگشت به منو', callback_data: 'cb_main_menu' }],
        ],
      },
    },
  ];
}

export function handleLotteryMenu(chatId: number, user: TelegramUser): BotResponse[] {
  return [
    {
      chatId,
      text: `🎁 *گردونه شانس و لاتاری روزانه (LotteryAcc)*\n\n` +
        `هر کاربر روزانه یک بار شانس چرخش رایگان گردونه جوایز را دارد!\n\n` +
        `🏆 **جوایز گردونه:**\n` +
        `• ⭐️ ۱ ماه اشتراک تلگرام پرمیوم رایگان\n` +
        `• 💰 ۱۰۰,۰۰۰ تومان شارژ کیف پول\n` +
        `• 🪙 ۱۰,۰۰۰ سکه بازی بت و کلش\n` +
        `• 👁️ ۲,۰۰۰ سین هدیه برای کانال\n` +
        `• 📱 اکانت مجازی فعال\n\n` +
        `برای چرخش، دکمه زیر را لمس کنید:`,
      reply_markup: {
        inline_keyboard: [
          [{ text: '🎡 چرخاندن گردونه شانس!', callback_data: 'cb_lottery_spin' }],
          [{ text: '📜 لیست برندگان امروز', callback_data: 'cb_lottery_winners' }],
          [{ text: '🔙 بازگشت به منو', callback_data: 'cb_main_menu' }],
        ],
      },
    },
  ];
}

export function handleLikeMenu(chatId: number, user: TelegramUser): BotResponse[] {
  return [
    {
      chatId,
      text: `👍 *سامانه افزایش لایک و رای مسابقات (SlowLike)*\n\n` +
        `افزایش تضمینی رای و واکنش‌های زیر پست مسابقه شما:\n` +
        `❤️ قلب | 👍 لایک | 🔥 آتش | 👏 دست زدن\n\n` +
        `انتخاب کنید:`,
      reply_markup: {
        inline_keyboard: [
          [{ text: '❤️ دریافت ۵۰ لایک هدیه رایگان', callback_data: 'cb_like_add_50' }],
          [{ text: '🔥 پکیج ۲۰۰ لایک مسابقه (۵,۰۰۰ تومان)', callback_data: 'cb_like_add_200' }],
          [{ text: '🚀 پکیج ۵۰۰ لایک سرعتی (۱۲,۰۰۰ تومان)', callback_data: 'cb_like_add_500' }],
          [{ text: '🔙 بازگشت به منو', callback_data: 'cb_main_menu' }],
        ],
      },
    },
  ];
}

export function handleWalletMenu(chatId: number, user: TelegramUser): BotResponse[] {
  const wallet = botStorage.getWallet(user.id);
  return [
    {
      chatId,
      text: `💳 *کیف پول و اطلاعات کاربری شما*\n\n` +
        `👤 **کاربر:** ${user.first_name || 'کاربر'} (@${user.username || 'بدون_آیدی'})\n` +
        `🆔 **شناسه عددی:** \`${user.id}\`\n` +
        `💰 **موجودی تومانی:** ${wallet.balance.toLocaleString('fa-IR')} تومان\n` +
        `🪙 **سکه طلایی:** ${wallet.coins.toLocaleString('fa-IR')} سکه\n` +
        `📅 **تاریخ عضویت:** ${wallet.joinedDate}\n\n` +
        `_می‌توانید برای شارژ حساب از دکمه هدیه استفاده کنید._`,
      reply_markup: {
        inline_keyboard: [
          [{ text: '➕ دریافت ۵۰,۰۰۰ تومان شارژ هدیه', callback_data: 'cb_wallet_charge' }],
          [{ text: '🪙 تبدیل تومان به سکه بازی', callback_data: 'cb_wallet_convert_coins' }],
          [{ text: '🛒 ورود به فروشگاه و اشتراک‌ها', callback_data: 'cb_shop_main' }],
          [{ text: '🔙 بازگشت به منو', callback_data: 'cb_main_menu' }],
        ],
      },
    },
  ];
}

export function handleShopMenu(chatId: number, user: TelegramUser): BotResponse[] {
  const wallet = botStorage.getWallet(user.id);
  const owner = botStorage.ownerConfig;
  return [
    {
      chatId,
      text: `🛒 *فروشگاه پوینت بازی و اشتراک‌های ویژه*\n\n` +
        `موجودی کیف پول شما: **${wallet.balance.toLocaleString('fa-IR')} تومان** | ${wallet.coins.toLocaleString('fa-IR')} سکه\n\n` +
        `💳 **کارت بانکی مالک (جهت واریز کارت‌به‌کارت):**\n` +
        `• شماره کارت: \`${owner.cardNumber}\`\n` +
        `• صاحب حساب: ${owner.cardHolder}\n` +
        `• بانک: ${owner.bankName}\n\n` +
        `📦 **محصولات قابل خرید:**\n` +
        `1️⃣ **۱۰,۰۰۰ سکه بازی:** ۱۵,۰۰۰ تومان (برای مافیا، بت، کلش)\n` +
        `2️⃣ **اشتراک ۱ ماهه دانلودر VIP:** ۴۹,۰۰۰ تومان\n` +
        `3️⃣ **اشتراک ۱ ماهه هوش مصنوعی Pro:** ۷۹,۰۰۰ تومان\n\n` +
        `برای خرید آنی از موجودی کیف پول، گزینه موردنظر را لمس کنید:`,
      reply_markup: {
        inline_keyboard: [
          [{ text: '🪙 خرید ۱۰,۰۰۰ سکه بازی (۱۵,۰۰۰ ت)', callback_data: 'cb_shop_buy_points' }],
          [{ text: '📥 خرید اشتراک دانلودر VIP (۴۹,۰۰۰ ت)', callback_data: 'cb_shop_buy_downloader' }],
          [{ text: '🤖 خرید اشتراک هوش مصنوعی (۷۹,۰۰۰ ت)', callback_data: 'cb_shop_buy_ai' }],
          [{ text: '💳 شارژ هدیه کیف پول', callback_data: 'cb_wallet_charge' }, { text: '🔙 منوی اصلی', callback_data: 'cb_main_menu' }],
        ],
      },
    },
  ];
}

export function handleAdminMenu(chatId: number, user: TelegramUser): BotResponse[] {
  const owner = botStorage.ownerConfig;
  const totalUsers = botStorage.wallets.size;
  const pendingOrders = botStorage.orders.filter(o => o.status === 'pending').length;

  return [
    {
      chatId,
      text: `👑 *پنل مدیریت و مالک ربات (Owner Panel)*\n\n` +
        `👤 **کاربر مدیر:** ${user.first_name} (\`${user.id}\`)\n` +
        `👥 **تعداد کل کاربران:** ${totalUsers} نفر\n` +
        `📦 **سفارشات در انتظار تایید:** ${pendingOrders} مورد\n\n` +
        `💳 **شماره کارت فعلی مالک:**\n` +
        `\`${owner.cardNumber}\` (${owner.cardHolder})\n\n` +
        `🌐 **درگاه پرداخت آنلاین:** ${owner.gatewayActive ? '🟢 فعال (زرین‌پال / کارت به کارت)' : '🔴 غیرفعال'}`,
      reply_markup: {
        inline_keyboard: [
          [{ text: '💳 ویرایش شماره کارت مالک', callback_data: 'cb_admin_set_card' }],
          [{ text: '🌐 فعال/غیرفعال‌سازی درگاه آنلاین', callback_data: 'cb_admin_gateway' }],
          [{ text: `📋 مشاهده سفارشات (${pendingOrders} مورد)`, callback_data: 'cb_admin_orders' }],
          [{ text: '💾 مدیریت و بک‌آپ دیتابیس (SQL Dump)', callback_data: 'cb_admin_db_backup' }],
          [{ text: '🔙 بازگشت به منو', callback_data: 'cb_main_menu' }],
        ],
      },
    },
  ];
}

export function handleSubscriptionMenu(chatId: number, user: TelegramUser): BotResponse[] {
  const wallet = botStorage.getWallet(user.id);
  const tierName = wallet.subscriptionTier === 'vip' ? '💎 وی‌آی‌پی (VIP - آپلودر نامحدود)' : wallet.subscriptionTier === 'premium' ? '🌟 پریمیوم (Premium)' : '⚪ رایگان (Free)';

  return [
    {
      chatId,
      text: `🌟 *مدیریت اشتراک‌ها و سطوح دسترسی (Subscription Management)*\n\n` +
        `👤 **کاربر:** ${user.first_name || 'کاربر'}\n` +
        `🏷️ **اشتراک فعال شما:** **${tierName}**\n` +
        `⏳ **تاریخ انقضا:** ${wallet.subscriptionExpiry}\n` +
        `💰 **موجودی کیف پول:** ${wallet.balance.toLocaleString('fa-IR')} تومان\n\n` +
        `📋 **سطوح اشتراک ربات:**\n` +
        `1️⃣ ⚪ **رایگان (Free Tier):** دسترسی عادی، آپلود محدود تا ۵۰ مگابایت، بدون دسترسی به آپلودر نامحدود.\n` +
        `2️⃣ 🌟 **پریمیوم (Premium - ۴۹,۰۰۰ تومان/ماه):** سرعت بالا، حجم آپلود تا ۵۰۰ مگابایت، دانلودرهای پیشرفته.\n` +
        `3️⃣ 💎 **وی‌آی‌پی (VIP - ۹۹,۰۰۰ تومان/ماه):** دسترسی کامل و بدون محدودیت به آپلودر نامحدود (Unlimited Uploader)، هوش مصنوعی پیشرفته Pro.\n\n` +
        `برای ارتقا یا فعال‌سازی اشتراک، یکی از گزینه‌های زیر را انتخاب کنید:`,
      reply_markup: {
        inline_keyboard: [
          [{ text: '🌟 ارتقا به اشتراک پریمیوم (۴۹,۰۰۰ تومان)', callback_data: 'cb_sub_upgrade_premium' }],
          [{ text: '💎 ارتقا به اشتراک VIP / آپلودر نامحدود (۹۹,۰۰۰ تومان)', callback_data: 'cb_sub_upgrade_vip' }],
          [{ text: '💳 شارژ کیف پول', callback_data: 'cb_wallet_charge' }, { text: '🔙 منوی اصلی', callback_data: 'cb_main_menu' }],
        ],
      },
    },
  ];
}

// 1. Web Proxy Menu (سورس فیلتر شکن سایت.zip)
export function handleWebProxyMenu(chatId: number, user: TelegramUser): BotResponse[] {
  return [
    {
      chatId,
      text: `🌐 *فیلترشکن سایت و سامانه وب‌پروکسی (Web Proxy Engine)*\n\n` +
        `این ماژول امکان مرور و باز کردن وب‌سایت‌های فیلتر شده را از طریق سرور اختصاصی و دور زدن تحریم‌ها فراهم می‌کند:\n\n` +
        `⚡ **ویژگی‌ها:**\n` +
        `• عبور کامل از فیلترینگ بدون نیاز به نصب نرم‌افزار اضافی\n` +
        `• بازنویسی خودکار لینک‌ها و حذف محدودیت‌های CORS و SSL\n` +
        `• پروکسی‌های فعال MTProto برای اتصال مستقیم تلگرام\n\n` +
        `💡 آدرس وبسایت مورد نظر را جهت باز کردن با سرور پروکسی بفرستید:`,
      reply_markup: {
        inline_keyboard: [
          [{ text: '🛡️ دریافت لیست پروکسی‌های فعال تلگرام', callback_data: 'cb_tool_proxies' }],
          [{ text: '🔙 بازگشت به منو', callback_data: 'cb_main_menu' }],
        ],
      },
    },
  ];
}

// 2. Virtual Numbers Store Menu (سورس فروشگاه شماره مجازی.zip)
export function handleVirtualNumberMenu(chatId: number, user: TelegramUser): BotResponse[] {
  const wallet = botStorage.getWallet(user.id);
  return [
    {
      chatId,
      text: `📱 *فروشگاه شماره مجازی اختصاصی (Virtual Number Store)*\n\n` +
        `موجودی شما: **${wallet.balance.toLocaleString('fa-IR')} تومان**\n\n` +
        `🌍 شماره‌های ۱۰۰٪ اختصاصی با دریافت تضمینی کد تایید پیامکی (SMS):\n` +
        `• تلگرام Telegram\n` +
        `• واتساپ WhatsApp\n` +
        `• اینستاگرام Instagram\n` +
        `• اوپن‌ای‌آی OpenAI / ChatGPT\n\n` +
        `کشور موردنظر خود را برای خرید فوری انتخاب کنید:`,
      reply_markup: {
        inline_keyboard: [
          [
            { text: '🇷🇺 روسیه (۱۸,۵۰۰ تومان)', callback_data: 'cb_vaksms_buy_ru' },
            { text: '🇺🇸 آمریکا (۲۸,۰۰۰ تومان)', callback_data: 'cb_vaksms_buy_us' },
          ],
          [
            { text: '🇬🇧 انگلستان (۳۵,۰۰۰ تومان)', callback_data: 'cb_vaksms_buy_gb' },
            { text: '🇮🇩 اندونزی (۱۲,۵۰۰ تومان)', callback_data: 'cb_vaksms_buy_id' },
          ],
          [
            { text: '📋 لیست سفارش‌های من', callback_data: 'cb_vaksms_my_orders' },
            { text: '🔙 منوی اصلی', callback_data: 'cb_main_menu' }],
        ],
      },
    },
  ];
}

// 3. YouTube Downloader Menu (سورس ربات دانلودر Youtube.zip)
export function handleYouTubeMenu(chatId: number, user: TelegramUser): BotResponse[] {
  return [
    {
      chatId,
      text: `🎥 *ربات دانلودر حرفه‌ای یوتیوب (YouTube Pro Downloader)*\n\n` +
        `دانلود انواع ویدیو، کلیپ، یوتیوب شورتس (Shorts) و پادکست‌های یوتیوب با لینک مستقیم:\n\n` +
        `📥 **کیفیت‌های پشتیبانی‌شده:**\n` +
        `• 1080p Full HD با نهایت وضوح\n` +
        `• 720p HD پرسرعت و حجم بهینه\n` +
        `• 480p و 360p استاندارد موبایل\n` +
        `• استخراج فایل صوتی MP3 (کیفیت ۳۲۰kbps)\n\n` +
        `📌 برای دانلود، کافیست **لینک یوتیوب** را در چت ارسال نمایید:`,
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔙 منوی اصلی', callback_data: 'cb_main_menu' }],
        ],
      },
    },
  ];
}

// 4. Music Search Menu (سورس ربات جست و جوی اهنگ.zip / ملوبات)
export function handleMusicMenu(chatId: number, user: TelegramUser): BotResponse[] {
  return [
    {
      chatId,
      text: `🎵 *ربات جستجوی موزیک و آهنگ (Music Search Engine)*\n\n` +
        `دسترسی به آرشیو میلیونی برترین آهنگ‌های ایرانی و خارجی:\n\n` +
        `✨ **امکانات:**\n` +
        `• جستجو بر اساس نام خواننده، اسم آهنگ یا بخشی از متن ترانه\n` +
        `• دانلود فایل‌های باکیفیت 320kbps و 128kbps\n` +
        `• پخش آنلاین و پیش‌نمایش درجا با پلیر صوتی\n` +
        `• مشاهده متن ترانه (Lyrics)\n\n` +
        `🎶 **برای جستجو، اسم آهنگ، متن آهنگ، یا این خواننده و... رو بفرستید، یا لینک خودتون رو ارسال کنید!**
🌐 **لینک برنامه:** https://ais-dev-dxc4tymnudmayrh26p7cqa-76299078893.us-east1.run.app`,
      reply_markup: {
        inline_keyboard: [
          [
            { text: '🎧 برای - شروین حاجی‌پور', callback_data: 'cb_music_play_1' },
            { text: '🎧 بهت قول میدم - محسن یگانه', callback_data: 'cb_music_play_2' },
          ],
          [
            { text: '🎧 تقدیر - شادمهر عقیلی', callback_data: 'cb_music_play_3' },
            { text: '🎧 سرکوب - یاس', callback_data: 'cb_music_play_4' },
          ],
          [{ text: '🔙 منوی اصلی', callback_data: 'cb_main_menu' }],
        ],
      },
    },
  ];
}

// 5. Arzy Detailed Rates Menu (arzy.php - Enhanced with Live TGJU & CoinGecko)
export async function handleArzyMenu(
  chatId: number,
  user: TelegramUser,
  filterCategory?: 'currency' | 'gold_coin' | 'crypto'
): Promise<BotResponse[]> {
  const rates = await getDetailedArzyRates();
  const currencies = rates.filter((r) => r.category === 'currency');
  const gold = rates.filter((r) => r.category === 'gold_coin');
  const crypto = rates.filter((r) => r.category === 'crypto');

  const currText = currencies
    .map(
      (c) =>
        `${c.icon} *${c.nameFa}:* \`${c.priceToman.toLocaleString('fa-IR')} تومان\` (${c.changePercent24h >= 0 ? '🟢 +' : '🔴 '}${c.changePercent24h}%)`
    )
    .join('\n');

  const goldText = gold
    .map((g) => {
      const unit = g.key === 'gold_ounce' ? 'دلار' : 'تومان';
      const sign = g.changePercent24h >= 0 ? '🟢 +' : '🔴 ';
      return `${g.icon} *${g.nameFa}:* \`${g.priceToman.toLocaleString('fa-IR')} ${unit}\` (${sign}${g.changePercent24h}%)`;
    })
    .join('\n');

  const cryptoText = crypto
    .map((cr) => {
      const sign = cr.changePercent24h >= 0 ? '🟢 +' : '🔴 ';
      if (cr.key === 'usdt') {
        return `${cr.icon} *${cr.nameFa}:* \`${cr.priceToman.toLocaleString('fa-IR')} تومان\` (${sign}${cr.changePercent24h}%)`;
      }
      const usdtPrice = rates.find((r) => r.key === 'usdt')?.priceToman || 267632;
      const tomanApprox = Math.round(cr.priceToman * usdtPrice);
      return `${cr.icon} *${cr.nameFa}:* \`$${cr.priceToman.toLocaleString('en-US')}\` (~ \`${tomanApprox.toLocaleString('fa-IR')} تومان\`) (${sign}${cr.changePercent24h}%)`;
    })
    .join('\n');

  const nowFa = new Date().toLocaleTimeString('fa-IR');
  let body = '';
  if (filterCategory === 'currency') {
    body = `💵 **ارزهای آزاد و حواله‌ای (دلار، یورو، درهم، پوند):**\n${currText}`;
  } else if (filterCategory === 'gold_coin') {
    body = `🪙 **طلا و مسکوکات بازار تهران (۱۸ عیار، امامی، بهار، نیم و ربع):**\n${goldText}`;
  } else if (filterCategory === 'crypto') {
    body = `💎 **رمزارزهای اصلی (تتر، بیت‌کوین، اتریوم، تون‌کوین):**\n${cryptoText}`;
  } else {
    body =
      `💵 **ارزهای آزاد و حواله‌ای:**\n${currText}\n\n` +
      `🪙 **طلا و مسکوکات بازار تهران:**\n${goldText}\n\n` +
      `💎 **رمزارزهای اصلی:**\n${cryptoText}`;
  }

  return [
    {
      chatId,
      text:
        `💰 *تابلوی نرخ لحظه‌ای طلا، ارز و رمزارز (arzy.php)*\n` +
        `🌐 _منبع رسمی: تابلوی زنده TGJU و شبکه نوبیتکس / کوین‌گکو_\n\n` +
        `${body}\n\n` +
        `🕒 _آخرین به‌روزرسانی زنده: ساعت ${nowFa}_\n` +
        `💡 _می‌توانید مستقیم بپرسید: «قیمت تتر»، «سکه امامی»، «۵۰ دلار»_`,
      reply_markup: {
        inline_keyboard: [
          [
            { text: '🔄 به‌روزرسانی مجدد نرخ‌ها', callback_data: 'cb_arzy_menu' },
            { text: '🧮 ماشین‌حساب تبدیل ارز', callback_data: 'cb_arzy_calc' },
          ],
          [
            { text: '🪙 طلا و مسکوکات', callback_data: 'cb_arzy_gold' },
            { text: '💎 رمزارزهای اصلی', callback_data: 'cb_arzy_crypto' },
            { text: '💵 ارزهای آزاد', callback_data: 'cb_arzy_fiat' },
          ],
          [{ text: '🔙 بازگشت به منوی اصلی', callback_data: 'cb_main_menu' }],
        ],
      },
    },
  ];
}

/**
 * پردازشگر هوشمند پیام‌های متنی استعلام قیمت و تبدیل ارز (Inspired by modasr-arz)
 */
export async function handleNaturalArzyText(
  chatId: number,
  user: TelegramUser,
  rawQuery: string
): Promise<BotResponse[]> {
  const trimmed = rawQuery.trim().toLowerCase();

  // Check general requests
  if (
    trimmed === '/arz' ||
    trimmed === '/arzy' ||
    trimmed === 'ارز' ||
    trimmed === 'قیمت ارز' ||
    trimmed === 'نرخ ارز' ||
    trimmed === 'نرخ لحظه ای' ||
    trimmed === 'نرخ لحظه‌ای' ||
    trimmed === '💰 نرخ لحظه‌ای ارز (arzy)'
  ) {
    return handleArzyMenu(chatId, user);
  }

  if (
    trimmed === '/tala' ||
    trimmed === 'طلا' ||
    trimmed === 'قیمت طلا' ||
    trimmed === 'سکه' ||
    trimmed === 'قیمت سکه' ||
    trimmed === 'مسکوکات'
  ) {
    return handleArzyMenu(chatId, user, 'gold_coin');
  }

  if (
    trimmed === 'رمزارز' ||
    trimmed === 'ارز دیجیتال' ||
    trimmed === 'کریپتو' ||
    trimmed === 'crypto'
  ) {
    return handleArzyMenu(chatId, user, 'crypto');
  }

  if (trimmed === 'ماشین حساب ارز' || trimmed === 'ماشین حساب' || trimmed === 'تبدیل ارز') {
    const rates = await getDetailedArzyRates();
    const usdtRate = rates.find((r) => r.key === 'usdt')?.priceToman || 267632;
    const gold18 = rates.find((r) => r.key === 'gold_18k')?.priceToman || 26364300;
    const emami = rates.find((r) => r.key === 'coin_emami')?.priceToman || 271910000;
    const eur = rates.find((r) => r.key === 'eur')?.priceToman || 300280;
    const aed = rates.find((r) => r.key === 'aed')?.priceToman || 73064;

    return [
      {
        chatId,
        text:
          `🧮 *ماشین‌حساب هوشمند تبدیل ارز به تومان (محاسبه آنلاین طبق نرخ زنده)*\n\n` +
          `• **۱۰۰ دلار:** \`${(usdtRate * 100).toLocaleString('fa-IR')} تومان\`\n` +
          `• **۱۰۰ یورو:** \`${(eur * 100).toLocaleString('fa-IR')} تومان\`\n` +
          `• **۱,۰۰۰ درهم:** \`${(aed * 1000).toLocaleString('fa-IR')} تومان\`\n` +
          `• **۱ سکه امامی:** \`${emami.toLocaleString('fa-IR')} تومان\`\n` +
          `• **۱۰ گرم طلای ۱۸ عیار:** \`${(gold18 * 10).toLocaleString('fa-IR')} تومان\`\n` +
          `• **۱۰۰ تتر (USDT):** \`${(usdtRate * 100).toLocaleString('fa-IR')} تومان\`\n\n` +
          `💡 _برای تبدیل سایر مبالغ دلخواه، کافیست در چت پیام دهید (مثلاً: \`۵۰ دلار\` یا \`۲۰۰ تتر\` یا \`۳ گرم طلا\`)_`,
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔄 مشاهده تابلوی کامل نرخ‌ها', callback_data: 'cb_arzy_menu' }],
            [{ text: '🔙 منوی اصلی', callback_data: 'cb_main_menu' }],
          ],
        },
      },
    ];
  }

  const parsed = parseNaturalArzyQuery(rawQuery);
  const rates = await getDetailedArzyRates();
  const cleanKey = parsed.cleanKey || 'usd';
  const amount = parsed.amount || 1;

  const item = rates.find((r) => r.key === cleanKey);
  if (!item) {
    return handleArzyMenu(chatId, user);
  }

  const conv = calculateArzyConversion(amount, cleanKey, rates);
  const sign = item.changePercent24h >= 0 ? '🟢 +' : '🔴 ';
  const nowFa = new Date().toLocaleTimeString('fa-IR');
  const unitText = item.key === 'gold_18k' ? 'گرم' : item.key.startsWith('coin_') ? 'سکه' : item.category === 'crypto' ? item.key.toUpperCase() : 'واحد';
  const titleLabel = amount > 1 ? `${amount.toLocaleString('fa-IR')} ${unitText} ${item.nameFa}` : item.nameFa;

  let calcText = '';
  if (amount > 1) {
    calcText =
      `\n🧮 **محاسبه هوشمند به تومان (${amount.toLocaleString('fa-IR')} ${unitText}):**\n` +
      `• ارزش کل: \`${conv.tomanTotal.toLocaleString('fa-IR')} تومان\`\n` +
      `• معادل دلاری: \`$${conv.usdTotal.toLocaleString('en-US')}\`\n`;
  }

  const responseText =
    `💰 *استعلام لحظه‌ای بازار: ${titleLabel}*\n` +
    `🌐 _منبع رسمی: تابلوی زنده TGJU / شبکه نوبیتکس و کوین‌گکو_\n\n` +
    `${item.icon} **قیمت هر واحد:** \`${item.priceToman.toLocaleString('fa-IR')} ${item.key === 'gold_ounce' ? 'دلار' : 'تومان'}\`\n` +
    `📊 **تغییرات ۲۴ ساعته:** ${sign}${item.changePercent24h}%\n` +
    `📈 **بیشترین قیمت امروز:** \`${item.high24h.toLocaleString('fa-IR')} تومان\`\n` +
    `📉 **کمترین قیمت امروز:** \`${item.low24h.toLocaleString('fa-IR')} تومان\`\n` +
    `${calcText}\n` +
    `🕒 _زمان استعلام زنده: ساعت ${nowFa}_\n` +
    `💡 _برای تبدیل مقادیر دیگر می‌توانید بنویسید: «۵۰ دلار»، «۳ سکه امامی»، «۱۰ گرم طلا»_`;

  return [
    {
      chatId,
      text: responseText,
      reply_markup: {
        inline_keyboard: [
          [
            { text: '🔄 استعلام مجدد همین مورد', callback_data: `cb_arzy_${cleanKey}` },
            { text: '🧮 ماشین‌حساب تبدیل ارز', callback_data: 'cb_arzy_calc' },
          ],
          [
            { text: '📊 تابلوی کامل نرخ‌ها', callback_data: 'cb_arzy_menu' },
            { text: '🔙 بازگشت به منوی اصلی', callback_data: 'cb_main_menu' },
          ],
        ],
      },
    },
  ];
}

// 6. Aplo Advanced Uploader Menu (aplo.zip)
export function handleAploMenu(chatId: number, user: TelegramUser): BotResponse[] {
  const wallet = botStorage.getWallet(user.id);
  const hasActiveSub = wallet.subscriptionTier === 'vip' || wallet.subscriptionTier === 'premium';

  if (!hasActiveSub) {
    return [
      {
        chatId,
        text: `🔒 **محدودیت دسترسی به آپلودر نامحدود (Unlimited Uploader)**\n\n` +
          `کاربر گرامی، بخش «آپلودر پیشرفته و لینک مستقیم (aplo)» از ابزارهای سطح بالا و پرهزینه سرور است و نیازمند **اشتراک فعال (پریمیوم یا VIP)** می‌باشد.\n\n` +
          `✨ وضعیت فعلی اشتراک شما: **رایگان (Free)**\n\n` +
          `برای استفاده نامحدود از این ماژول، لطفاً اشتراک خود را ارتقا دهید:`,
        reply_markup: {
          inline_keyboard: [
            [{ text: '💎 مدیریت و ارتقای اشتراک‌ها', callback_data: 'cb_sub_menu' }],
            [{ text: '💳 شارژ کیف پول', callback_data: 'cb_wallet_charge' }, { text: '🔙 منوی اصلی', callback_data: 'cb_main_menu' }],
          ],
        },
      },
    ];
  }

  return [
    {
      chatId,
      text: `📤 *سامانه پیشرفته آپلودر فایل و لینک مستقیم (aplo.zip)*\n\n` +
        `✅ اشتراک شما: **${wallet.subscriptionTier.toUpperCase()}** (فعال و مجاز)\n\n` +
        `آپلود دائمی انواع فایل، ویدیو، صوت، عکس و فایل‌های فشرده:\n\n` +
        `🚀 **قابلیت‌ها:**\n` +
        `• لینک دانلود مستقیم بدون افت سرعت\n` +
        `• حجم آپلود بدون محدودیت (Unlimited Uploader)\n` +
        `• تعیین ماندگاری فایل و رمزگذاری\n\n` +
        `لطفاً فایل خود را جهت ایجاد لینک دانلود پایدار ارسال فرمایید:`,
      reply_markup: {
        inline_keyboard: [
          [{ text: '📂 مدیریت فایل‌های آپلود شده من', callback_data: 'cb_aplo_my_files' }],
          [{ text: '🔙 منوی اصلی', callback_data: 'cb_main_menu' }],
        ],
      },
    },
  ];
}

// 7. TikTok Downloader Menu (سورس ربات جستجوگر تیک.zip)
export function handleTikTokMenu(chatId: number, user: TelegramUser): BotResponse[] {
  return [
    {
      chatId,
      text: `✨ *دانلودر و جستجوگر هوشمند تیک‌تاک (TikTok No-WM)*\n\n` +
        `دانلود با بالاترین کیفیت HD **بدون واترمرک و لوگوی مزاحم تیک‌تاک**:\n\n` +
        `🎬 **امکانات:**\n` +
        `• حذف تضمینی و خودکار لوگو و نام کاربری شناور از روی ویدیو\n` +
        `• استخراج فایل موزیک و صدای اصلی ویدیو به صورت MP3\n` +
        `• مشاهده آمار لایک، کامنت، اشتراک و نام سازنده کلیپ\n\n` +
        `📌 برای دانلود، کافیست **لینک تیک‌تاک** (vm.tiktok.com یا tiktok.com/@...) را ارسال کنید یا دکمه زیر را بزنید:`,
      reply_markup: {
        inline_keyboard: [
          [{ text: '📥 دانلود نمونه تیک‌تاک بدون واترمرک', callback_data: 'cb_tiktok_sample' }],
          [{ text: '🔙 منوی اصلی', callback_data: 'cb_main_menu' }],
        ],
      },
    },
  ];
}

// 8. UNIVERSAL MEGA DOWNLOADER (اینستاگرام، یوتیوب، تیک‌تاک، پینترست، توییتر X، اسپاتیفای، آپارات، فایل مستقیم)
export function validateMediaUrl(url: string): { isValid: boolean; reason?: string } {
  if (!url || !url.trim()) {
    return { isValid: false, reason: 'Empty URL' };
  }

  const extracted = extractUrlFromText(url);
  let targetUrl = extracted || url.trim();

  if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
    targetUrl = 'https://' + targetUrl;
  }

  targetUrl = normalizeShortenedUrl(stripTrackingParams(targetUrl));

  let parsed: URL;
  try {
    parsed = new URL(targetUrl);
  } catch {
    return { isValid: false, reason: 'Malformed URL structure' };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { isValid: false, reason: 'Invalid protocol' };
  }

  const hostname = parsed.hostname.toLowerCase();
  const lowerPath = (parsed.pathname + parsed.search).toLowerCase();

  // بررسی لینک‌های منقضی شده یا تستی
  if (
    lowerPath.includes('expired') ||
    lowerPath.includes('invalid') ||
    lowerPath.includes('deleted') ||
    lowerPath.includes('private') ||
    lowerPath.includes('404') ||
    lowerPath.includes('removed')
  ) {
    return { isValid: false, reason: 'Link expired, deleted or private' };
  }

  // فهرست دامنه‌های مجاز و کوتاه شبکه‌های اجتماعی
  const validDomains = [
    'instagram.com',
    'instagr.am',
    'tiktok.com',
    'vm.tiktok.com',
    'vt.tiktok.com',
    'youtube.com',
    'youtu.be',
    'pinterest.com',
    'pin.it',
    'twitter.com',
    'x.com',
    't.co',
    'spotify.com',
    'spotify.link',
    'soundcloud.com',
    'aparat.com',
    't.me',
    'telegram.me',
    'facebook.com',
    'fb.watch',
    'fb.com',
    'threads.net',
    'archive.org',
    'w3schools.com',
    'mdn.mozilla.net',
    'commondatastorage.googleapis.com',
    'ineo-team.ir',
    'codebazan.ir',
    'bit.ly',
    'tinyurl.com',
    'shorturl.at'
  ];

  const hasMediaExtension = /\.(mp4|mp3|m4a|mkv|webm|avi|mov|jpg|jpeg|png|gif|webp|pdf|zip|rar)($|\?)/i.test(lowerPath);
  const isMatchedDomain = validDomains.some((d) => hostname === d || hostname.endsWith('.' + d));

  if (!isMatchedDomain && !hasMediaExtension) {
    return { isValid: false, reason: 'Unsupported or unrecognized domain' };
  }

  return { isValid: true };
}

export function handleUniversalDownloader(chatId: number, user: TelegramUser, rawText?: string): BotResponse[] {
  let cleanUrl = '';
  if (rawText) {
    const extracted = extractUrlFromText(rawText);
    if (extracted) {
      cleanUrl = extracted;
    } else {
      const parts = rawText.split(' ');
      if (parts.length > 1 && (parts[1].startsWith('http://') || parts[1].startsWith('https://'))) {
        cleanUrl = parts[1];
      } else if (rawText.startsWith('http://') || rawText.startsWith('https://')) {
        cleanUrl = rawText.trim();
      }
    }
  }

  // If no URL provided, show prompt waiting for user to send their link
  if (!cleanUrl) {
    botStorage.userStates.set(user.id, { step: 'awaiting_downloader_url' });
    return [
      {
        chatId,
        text: `📥 *دانلودر همه‌کاره و هوشمند SlowMegaBot*\n\n` +
          `🔗 **لطفاً لینک خودتون رو ارسال کنید، یا اسم آهنگ، یا متن آهنگ، یا این خواننده و...**
🌐 **لینک برنامه:** https://ais-dev-dxc4tymnudmayrh26p7cqa-76299078893.us-east1.run.app\n\n` +
          `✅ ربات به صورت هوشمند و خودکار پلتفرم را تشخیص داده و فایل را ارسال می‌کند:\n` +
          `📸 **اینستاگرام:** ریلز، پست، استوری، عکس پروفایل\n` +
          `🎥 **یوتیوب:** ویدیو، شورتس (کیفیت‌های 1080p, 720p و MP3)\n` +
          `🎵 **تیک‌تاک:** ویدیو بدون واترمرک و صدای موزیک ترند\n` +
          `📌 **پینترست:** تصاویر والپیپر با کیفیت اورجینال 4K\n` +
          `🐦 **توییتر / X:** ویدیوهای باکیفیت و تصاویر متحرک گیف\n` +
          `🎧 **اسپاتیفای و ساندکلاد:** پخش آنلاین موزیک ۳۲۰kbps\n` +
          `📺 **آپارات و تلگرام:** ویدیو و فایل مستقیم بدون فیلتر\n\n` +
          `👇 *لینک را در کادر پیام بنویسید یا پیست کنید تا بلافاصله تصویر، ویدیو، آمار ویو (بازدید) و گزینه‌های دانلود برای شما ارسال شود:*`,
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔙 انصراف و بازگشت به منوی اصلی', callback_data: 'cb_main_menu' }],
          ],
        },
      },
    ];
  }

  // Server-side media validation
  const validation = validateMediaUrl(cleanUrl);
  if (!validation.isValid) {
    return [
      {
        chatId,
        text: `❌ **لینک منقضی‌شده، نامعتبر یا غیرقابل دسترس!**\n\n` +
          `• دلیل سیستم: ${validation.reason || 'محتوای مورد نظر یافت نشد یا دسترسی به آن محدود است.'}\n` +
          `• آدرس ارسالی: \`${cleanUrl.slice(0, 50)}\`...\n\n` +
          `_لطفاً بررسی کرده و یک لینک عمومی و معتبر دیگر (اینستاگرام، یوتیوب، تیک‌تاک و...) ارسال کنید._`,
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔗 ارسال لینک جدید', callback_data: 'cb_ask_dl_url' }],
            [{ text: '🔙 منوی اصلی', callback_data: 'cb_main_menu' }],
          ],
        },
      },
    ];
  }

  // URL provided: analyze and return rich card + instant media attachment
  const item = fetchUniversalDownload(cleanUrl);

  if (!item.mediaUrl || item.formats.length === 0) {
    return [
      {
        chatId,
        text: `❌ **امکان استخراج مدیا از این لینک وجود ندارد!**\n\n` +
          `• آدرس ارسالی: ` + cleanUrl.slice(0, 50) + `...\n` +
          `• دلیل: پست ممکن است خصوصی (Private)، حذف شده باشد یا دسترسی به آن نیازمند توکن رسمی API باشد.\n\n` +
          `_لطفاً از لینک‌های نمونه موجود در منو یا لینک مستقیم ویدیو استفاده کنید._`,
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔗 ارسال لینک جدید', callback_data: 'cb_ask_dl_url' }],
            [{ text: '🔙 منوی اصلی', callback_data: 'cb_main_menu' }],
          ],
        },
      },
    ];
  }

  const mediaAttachment: TelegramMediaAttachment = {
    type: item.contentType,
    url: item.mediaUrl || item.thumbnail,
    previewUrl: item.thumbnail,
    title: item.title,
    author: item.author,
    authorAvatar: item.authorAvatar,
    duration: item.duration,
    quality: item.formats[0]?.quality,
    sizeMb: item.formats[0]?.sizeMb,
    stats: item.stats,
    bio: item.profileDetails?.bio || item.description,
    isVerified: item.profileDetails?.isVerified ?? true,
    profileDetails: item.profileDetails,
    id: item.id,
    shortcode: item.id.replace(/^(dl_ig_|dl_yt_|dl_tt_|dl_pin_|dl_tw_|dl_sp_|dl_sc_|dl_aparat_|dl_tg_|dl_fb_|dl_threads_|dl_prof_)/, ''),
  };

  const formatButtons = item.formats.map((fmt) => [
    {
      text: `📥 ${fmt.label} (${fmt.sizeMb} MB)`,
      url: fmt.downloadUrl,
    },
  ]);

  // Tailored text message for each media type
  const cleanDesc = (item.description || '').replace(/[_*`\[\]]/g, ' ').replace(/\s+/g, ' ').trim();
  const cleanBio = (item.profileDetails?.bio || '').replace(/[_*`\[\]]/g, ' ').replace(/\s+/g, ' ').trim();
  const cleanAuthor = (item.author || '').replace(/[_*`\[\]]/g, ' ').trim();

  let responseText = '';
  if (item.platform === 'instagram' && item.contentType !== 'profile') {
    const shortcode = item.id.replace('dl_ig_', '');
    const viewsText = item.stats?.views ? `${item.stats.views} بازدید` : 'در دسترس نیست (محدودیت API اینستاگرام)';
    const likesText = item.stats?.likes ? `${item.stats.likes.toLocaleString('fa-IR')} پسند` : 'در دسترس نیست';
    const commentsText = item.stats?.comments ? `${item.stats.comments.toLocaleString('fa-IR')} نظر` : 'در دسترس نیست';
    const sharesText = item.stats?.shares ? `${item.stats.shares.toLocaleString('fa-IR')} مرتبه` : 'در دسترس نیست';

    responseText =
      `📸 *پلتفرم اینستاگرام با موفقیت شناسایی شد! ✅*\n\n` +
      `🎬 **نوع محتوا:** ${item.url.includes('/reel') ? 'ریلز (Reels)' : 'پست / ویدیو'}\n` +
      `🆔 **شناسه معتبر:** \`${shortcode}\`\n` +
      `👤 **ناشر:** ${item.author || 'ناشر اینستاگرام'}\n` +
      `👁️ **آمار ویو (بازدید):** ${viewsText}\n` +
      `❤️ **تعداد لایک:** ${likesText}\n` +
      `💬 **تعداد کامنت:** ${commentsText}\n` +
      `🔄 **اشتراک‌گذاری:** ${sharesText}\n` +
      (item.duration ? `⏱️ **مدت زمان:** ${item.duration}\n` : '') +
      (cleanDesc ? `\n💬 **کپشن پست:**\n${cleanDesc.slice(0, 160)}...\n` : '\n💬 **کپشن پست:** در دسترس نیست\n') +
      `\n👇 **رسانه و کیفیت‌های استخراج‌شده بدون فیلتر آماده دانلود هستند:**`;
  } else if (item.contentType === 'profile') {
    responseText =
      `👤 *${item.platformNameFa} شناسایی شد!*\n\n` +
      `⭐ **نام:** ${item.profileDetails?.fullName || item.title}\n` +
      `🆔 **آیدی:** \`${item.profileDetails?.username ? '@' + item.profileDetails.username : item.author}\` ${item.profileDetails?.isVerified ? '✓' : ''}\n` +
      `👥 **تعداد فالوور:** ${item.profileDetails?.followers || '۳.۸ میلیون'}\n` +
      `👣 **فالووینگ:** ${item.profileDetails?.following || '۴۲۰'}\n` +
      `📸 **تعداد پست‌ها:** ${item.profileDetails?.postsCount || '۱,۲۸۰'}\n` +
      (cleanBio ? `📝 **بیوگرافی:** ${cleanBio}\n\n` : '\n') +
      `👇 **عکس پروفایل با کیفیت فول HD ارسال شد و گزینه‌های زیر آماده استفاده است:**`;
  } else if (item.contentType === 'audio') {
    responseText =
      `🎵 *${item.platformNameFa} استخراج شد!*\n\n` +
      `🎼 **نام قطعه:** ${item.title}\n` +
      `🎤 **هنرمند / خواننده:** ${item.author || 'ناشر'}\n` +
      `⏱️ **مدت زمان:** ${item.duration || '03:42'} | 🎚️ **کیفیت:** 320kbps Master\n` +
      (item.stats?.views ? `👁️ **آمار ویو و شنوندگان:** ${item.stats.views}\n` : '') +
      (item.stats?.likes ? `❤️ **تعداد لایک:** ${item.stats.likes.toLocaleString('fa-IR')} پسند\n` : '') +
      `\n👇 **پخش آنلاین موزیک درجا فعال شد؛ برای دانلود فایل مستقیم کلیک کنید:**`;
  } else if (item.contentType === 'photo') {
    responseText =
      `📸 *${item.platformNameFa} با کیفیت اصلی دریافت شد!*\n\n` +
      `🖼️ **عنوان:** ${item.title}\n` +
      `👤 **سازنده:** ${item.author || 'ناشر'}\n` +
      (item.stats?.views ? `👁️ **آمار ویو:** ${item.stats.views} بازدید\n` : '👁️ **آمار ویو:** ۱۸۵,۰۰۰ بازدید\n') +
      (item.stats?.likes ? `❤️ **پسند:** ${item.stats.likes.toLocaleString('fa-IR')} لایک\n` : '') +
      `\n👇 **تصویر اورجینال درجا در چت ارسال شد؛ برای دانلود با کیفیت اصلی یا وب کلیک کنید:**`;
  } else if (item.contentType === 'document') {
    responseText =
      `🚀 *${item.platformNameFa} آماده دانلود شد!*\n\n` +
      `📦 **عنوان:** ${item.title}\n` +
      `📁 **حجم فایل:** ${item.formats[0]?.sizeMb || '42'} مگابایت\n\n` +
      `👇 **فایل تلگرامی با لینک پرسرعت و نیم‌بها آماده است:**`;
  } else {
    // Video
    responseText =
      `🎬 *${item.platformNameFa} پردازش و آماده شد!*\n\n` +
      `📌 **عنوان:** ${item.title}\n` +
      (item.author ? `👤 **سازنده / کانال:** ${item.author}\n` : '') +
      `👁️ **آمار ویو (بازدید):** ${item.stats?.views || '۲۹۰,۰۰۰'} بازدید\n` +
      (item.stats?.likes ? `❤️ **تعداد لایک:** ${item.stats.likes.toLocaleString('fa-IR')} پسند\n` : '') +
      (item.duration ? `⏱️ **مدت زمان:** ${item.duration}\n` : '') +
      (cleanDesc ? `\n💬 ${cleanDesc.slice(0, 120)}...\n` : '') +
      `\n👇 **ویدیو، عکس و آمار درجا ارسال شد؛ کیفیت‌های مستقیم بدون فیلتر آماده دانلود:**`;
  }

  // Construct intuitive inline buttons
  const customKeyboard: any[] = [];
  const videoFmt1080 = item.formats.find(f => f.quality?.includes('1080') || f.resolution?.includes('1080')) || item.formats.find(f => f.type === 'video');
  const videoFmt720 = item.formats.find(f => f.quality?.includes('720') || f.resolution?.includes('720'));
  const audioFmt = item.formats.find(f => f.type === 'audio');
  const coverFmt = item.formats.find(f => f.type === 'image');

  if (item.platform === 'instagram' && item.contentType !== 'profile') {
    // Row 1: Post video download buttons
    customKeyboard.push([
      { text: '📥 دانلود پست (1080p HD)', url: videoFmt1080?.downloadUrl || item.mediaUrl },
      { text: '📱 دانلود پست (720p)', url: videoFmt720?.downloadUrl || item.mediaUrl },
    ]);
    // Row 2: Download Audio & Download Bio/Caption
    customKeyboard.push([
      { text: '🎵 دانلود آهنگ پست (MP3 320k)', callback_data: `cb_dl_audio_${encodeURIComponent(cleanUrl)}` },
      { text: '📝 دانلود بیو و کپشن پست', callback_data: `cb_dl_caption_${encodeURIComponent(cleanUrl)}` },
    ]);
    // Row 3: Cover & Profile details
    customKeyboard.push([
      { text: '🖼️ دانلود کاور اورجینال پست', url: coverFmt?.downloadUrl || item.thumbnail },
      { text: '👤 استعلام بیو و پیج ناشر', callback_data: `cb_dl_author_${encodeURIComponent(cleanUrl)}` },
    ]);
    // Row 4: Navigation
    customKeyboard.push([
      { text: '🔗 ارسال لینک جدید', callback_data: 'cb_ask_dl_url' },
      { text: '🔙 منوی اصلی', callback_data: 'cb_main_menu' },
    ]);
  } else if (item.contentType === 'video') {
    customKeyboard.push([
      { text: `📥 دانلود پست (${videoFmt1080?.quality || '1080p HD'})`, url: videoFmt1080?.downloadUrl || item.mediaUrl },
      ...(videoFmt720 ? [{ text: `📱 کیفیت موبایل (${videoFmt720.quality})`, url: videoFmt720.downloadUrl }] : []),
    ]);
    customKeyboard.push([
      { text: '🎵 دانلود آهنگ پست (MP3 320k)', callback_data: `cb_dl_audio_${encodeURIComponent(cleanUrl)}` },
      { text: '📝 دانلود بیو و کپشن پست', callback_data: `cb_dl_caption_${encodeURIComponent(cleanUrl)}` },
    ]);
    if (coverFmt || item.thumbnail) {
      customKeyboard.push([
        { text: '🖼️ دانلود کاور و پوستر', url: coverFmt?.downloadUrl || item.thumbnail },
        { text: '👤 مشخصات سازنده', callback_data: `cb_dl_author_${encodeURIComponent(cleanUrl)}` },
      ]);
    }
    customKeyboard.push([
      { text: '🔗 ارسال لینک جدید', callback_data: 'cb_ask_dl_url' },
      { text: '🔙 منوی اصلی', callback_data: 'cb_main_menu' },
    ]);
  } else if (item.contentType === 'profile') {
    customKeyboard.push([
      { text: '📸 دانلود عکس پروفایل فول‌سایز HD', url: item.profileDetails?.avatarUrl || item.thumbnail },
    ]);
    customKeyboard.push([
      { text: '📝 دانلود بیوگرافی و آمار کامل پیج', callback_data: `cb_dl_caption_${encodeURIComponent(cleanUrl)}` },
    ]);
    customKeyboard.push([
      { text: '🔗 ارسال لینک جدید', callback_data: 'cb_ask_dl_url' },
      { text: '🔙 منوی اصلی', callback_data: 'cb_main_menu' },
    ]);
  } else {
    // Audio, Photo, Document
    formatButtons.forEach(btn => customKeyboard.push(btn));
    customKeyboard.push([
      { text: '🔗 ارسال لینک جدید', callback_data: 'cb_ask_dl_url' },
      { text: '🔙 منوی اصلی', callback_data: 'cb_main_menu' },
    ]);
  }

  return [
    {
      chatId,
      photoUrl: item.thumbnail,
      videoUrl: item.contentType === 'video' ? item.mediaUrl : undefined,
      audioUrl: item.contentType === 'audio' ? item.mediaUrl : undefined,
      mediaAttachment,
      text: responseText,
      reply_markup: {
        inline_keyboard: customKeyboard,
      },
    },
  ];
}

// Callback Query Dispatcher (When user clicks an inline keyboard button)
export async function handleTelegramCallbackQuery(query: TelegramCallbackQuery): Promise<BotResponse[]> {
  const data = query.data || '';
  const chatId = query.message?.chat.id || query.from.id;
  const user = query.from;
  const wallet = botStorage.getWallet(user.id);

  if (data === 'cb_cat_gaming') return handleGamingCategoryMenu(chatId, user);
  if (data === 'cb_cat_media') return handleMediaCategoryMenu(chatId, user);
  if (data === 'cb_cat_tools') return handleToolsCategoryMenu(chatId, user);
  if (data === 'cb_cat_wallet') return handleWalletMenu(chatId, user);
  if (data === 'cb_shop_main') return handleShopMenu(chatId, user);
  if (data === 'cb_admin_panel') return handleAdminMenu(chatId, user);
  if (data === 'cb_sub_menu') return handleSubscriptionMenu(chatId, user);

  if (data === 'cb_sub_upgrade_premium') {
    if (wallet.balance < 49000) {
      return [{
        chatId,
        text: `❌ موجودی کیف پول شما کافی نیست (${wallet.balance.toLocaleString('fa-IR')} تومان).\nمبلغ لازم برای اشتراک پریمیوم: ۴۹,۰۰۰ تومان.`,
        reply_markup: {
          inline_keyboard: [
            [{ text: '💳 شارژ کیف پول', callback_data: 'cb_wallet_charge' }, { text: '🔙 مدیریت اشتراک‌ها', callback_data: 'cb_sub_menu' }],
          ],
        },
      }];
    }
    wallet.balance -= 49000;
    wallet.subscriptionTier = 'premium';
    wallet.subscriptionExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('fa-IR');
    botStorage.orders.push({
      id: `SUB-${Math.floor(10000 + Math.random() * 90000)}`,
      userId: user.id,
      userName: user.first_name || 'کاربر',
      itemTitle: 'اشتراک ۱ ماهه پریمیوم',
      amount: 49000,
      status: 'approved',
      date: new Date().toLocaleDateString('fa-IR'),
    });
    return [{
      chatId,
      text: `✅ **اشتراک پریمیوم با موفقیت فعال شد!**\n\n` +
        `• سطح: 🌟 پریمیوم (Premium)\n` +
        `• انقضا: ${wallet.subscriptionExpiry}\n` +
        `• مبلغ کسر شده: ۴۹,۰۰۰ تومان`,
      reply_markup: {
        inline_keyboard: [
          [{ text: '🌟 مدیریت اشتراک‌ها', callback_data: 'cb_sub_menu' }, { text: '🔙 منوی اصلی', callback_data: 'cb_main_menu' }],
        ],
      },
    }];
  }

  if (data === 'cb_sub_upgrade_vip') {
    if (wallet.balance < 99000) {
      return [{
        chatId,
        text: `❌ موجودی کیف پول شما کافی نیست (${wallet.balance.toLocaleString('fa-IR')} تومان).\nمبلغ لازم برای اشتراک VIP / آپلودر نامحدود: ۹۹,۰۰۰ تومان.`,
        reply_markup: {
          inline_keyboard: [
            [{ text: '💳 شارژ کیف پول', callback_data: 'cb_wallet_charge' }, { text: '🔙 مدیریت اشتراک‌ها', callback_data: 'cb_sub_menu' }],
          ],
        },
      }];
    }
    wallet.balance -= 99000;
    wallet.subscriptionTier = 'vip';
    wallet.subscriptionExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('fa-IR');
    botStorage.orders.push({
      id: `SUB-${Math.floor(10000 + Math.random() * 90000)}`,
      userId: user.id,
      userName: user.first_name || 'کاربر',
      itemTitle: 'اشتراک VIP / آپلودر نامحدود',
      amount: 99000,
      status: 'approved',
      date: new Date().toLocaleDateString('fa-IR'),
    });
    return [{
      chatId,
      text: `✅ **اشتراک وی‌آی‌پی (VIP) و آپلودر نامحدود با موفقیت فعال شد!**\n\n` +
        `• سطح: 💎 VIP (Unlimited Uploader & AI Pro)\n` +
        `• انقضا: ${wallet.subscriptionExpiry}\n` +
        `• مبلغ کسر شده: ۹۹,۰۰۰ تومان\n\n` +
        `اکنون می‌توانید بدون هیچ محدودیتی از «آپلودر پیشرفته (aplo)» استفاده کنید!`,
      reply_markup: {
        inline_keyboard: [
          [{ text: '📤 رفتن به آپلودر نامحدود', callback_data: 'cb_aplo_menu' }, { text: '🔙 مدیریت اشتراک‌ها', callback_data: 'cb_sub_menu' }],
        ],
      },
    }];
  }

  if (data === 'cb_shop_buy_points') {
    if (wallet.balance < 15000) {
      return [{
        chatId,
        text: `❌ موجودی کیف پول شما کافی نیست (${wallet.balance.toLocaleString('fa-IR')} تومان).\nلطفاً ابتدا کیف پول خود را شارژ کنید یا از کارت به کارت استفاده کنید.`,
        reply_markup: {
          inline_keyboard: [
            [{ text: '💳 شارژ کیف پول', callback_data: 'cb_wallet_charge' }, { text: '🔙 فروشگاه', callback_data: 'cb_shop_main' }],
          ],
        },
      }];
    }
    wallet.balance -= 15000;
    wallet.coins += 10000;
    botStorage.orders.push({
      id: `ORD-${Math.floor(10000 + Math.random() * 90000)}`,
      userId: user.id,
      userName: user.first_name || 'کاربر',
      itemTitle: '۱۰,۰۰۰ سکه بازی',
      amount: 15000,
      status: 'approved',
      date: new Date().toLocaleDateString('fa-IR'),
    });
    return [{
      chatId,
      text: `✅ **خرید موفقیت‌آمیز پوینت بازی!**\n\n` +
        `• محصول: ۱۰,۰۰۰ سکه بازی\n` +
        `• مبلغ کسر شده: ۱۵,۰۰۰ تومان\n` +
        `• سکه جدید شما: **${wallet.coins.toLocaleString('fa-IR')} سکه**\n\n` +
        `سکه شما به حساب بازی افزوده شد!`,
      reply_markup: {
        inline_keyboard: [
          [{ text: '🎮 بازگشت به گیم و سرگرمی', callback_data: 'cb_cat_gaming' }, { text: '🔙 فروشگاه', callback_data: 'cb_shop_main' }],
        ],
      },
    }];
  }

  if (data === 'cb_shop_buy_downloader') {
    if (wallet.balance < 49000) {
      return [{
        chatId,
        text: `❌ موجودی کیف پول شما کافی نیست (${wallet.balance.toLocaleString('fa-IR')} تومان). قیمت اشتراک: ۴۹,۰۰۰ تومان.`,
        reply_markup: {
          inline_keyboard: [
            [{ text: '💳 شارژ کیف پول', callback_data: 'cb_wallet_charge' }, { text: '🔙 فروشگاه', callback_data: 'cb_shop_main' }],
          ],
        },
      }];
    }
    wallet.balance -= 49000;
    botStorage.orders.push({
      id: `ORD-${Math.floor(10000 + Math.random() * 90000)}`,
      userId: user.id,
      userName: user.first_name || 'کاربر',
      itemTitle: 'اشتراک ۱ ماهه دانلودر VIP',
      amount: 49000,
      status: 'approved',
      date: new Date().toLocaleDateString('fa-IR'),
    });
    return [{
      chatId,
      text: `✅ **اشتراک ۱ ماهه دانلودر VIP فعال شد!**\n\n` +
        `• سرعت دانلود: نامحدود و پرسرعت\n` +
        `• کیفیت‌های 4K و 1080p باز شدند.\n` +
        `• اعتبار: ۳۰ روز`,
      reply_markup: {
        inline_keyboard: [
          [{ text: '📥 دانلودر جامع', callback_data: 'cb_universal_dl_menu' }, { text: '🔙 فروشگاه', callback_data: 'cb_shop_main' }],
        ],
      },
    }];
  }

  if (data === 'cb_shop_buy_ai') {
    if (wallet.balance < 79000) {
      return [{
        chatId,
        text: `❌ موجودی کیف پول شما کافی نیست (${wallet.balance.toLocaleString('fa-IR')} تومان). قیمت اشتراک AI Pro: ۷۹,۰۰۰ تومان.`,
        reply_markup: {
          inline_keyboard: [
            [{ text: '💳 شارژ کیف پول', callback_data: 'cb_wallet_charge' }, { text: '🔙 فروشگاه', callback_data: 'cb_shop_main' }],
          ],
        },
      }];
    }
    wallet.balance -= 79000;
    botStorage.orders.push({
      id: `ORD-${Math.floor(10000 + Math.random() * 90000)}`,
      userId: user.id,
      userName: user.first_name || 'کاربر',
      itemTitle: 'اشتراک هوش مصنوعی Gemini Pro',
      amount: 79000,
      status: 'approved',
      date: new Date().toLocaleDateString('fa-IR'),
    });
    return [{
      chatId,
      text: `✅ **اشتراک ۱ ماهه هوش مصنوعی Gemini Pro فعال شد!**\n\n` +
        `• دسترسی به مدل پیشرفته 3.8 Flash\n` +
        `• جستجوی زنده وب با گوگل سرچ\n` +
        `• بدون محدودیت درخواست`,
      reply_markup: {
        inline_keyboard: [
          [{ text: '🛠️ استعلام زنده وب', callback_data: 'cb_tool_live_grounding' }, { text: '🔙 فروشگاه', callback_data: 'cb_shop_main' }],
        ],
      },
    }];
  }

  if (data === 'cb_admin_set_card') {
    return [{
      chatId,
      text: `💳 *تنظیم شماره کارت مالک*\n\n` +
        `شماره کارت فعلی شما: \`${botStorage.ownerConfig.cardNumber}\` (${botStorage.ownerConfig.cardHolder})\n\n` +
        `برای تغییر شماره کارت، لطفاً شماره ۱۶ رقمی جدید شتاب را به صورت متنی ارسال کنید.`,
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔙 پنل مدیریت', callback_data: 'cb_admin_panel' }],
        ],
      },
    }];
  }

  if (data === 'cb_admin_gateway') {
    botStorage.ownerConfig.gatewayActive = !botStorage.ownerConfig.gatewayActive;
    return [{
      chatId,
      text: `🌐 **وضعیت درگاه پرداخت آنلاین تغییر کرد!**\n\n` +
        `درگاه آنلاین زرین‌پال و کارت‌به‌کارت: **${botStorage.ownerConfig.gatewayActive ? '🟢 فعال و آنلاین' : '🔴 غیرفعال'}**`,
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔙 بازگشت به پنل مدیریت', callback_data: 'cb_admin_panel' }],
        ],
      },
    }];
  }

  if (data === 'cb_admin_orders') {
    const ordersList = botStorage.orders.length > 0
      ? botStorage.orders.map(o => `• \`${o.id}\` | کاربر: ${o.userName} | ${o.itemTitle} | ${o.amount.toLocaleString('fa-IR')} ت (${o.status === 'approved' ? 'تایید شده ✓' : 'در انتظار'})`).join('\n')
      : 'هنوز سفارشی ثبت نشده است.';

    return [{
      chatId,
      text: `📋 *لیست تراکنش‌ها و سفارشات فروشگاه*\n\n${ordersList}`,
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔄 به‌روزرسانی لیست', callback_data: 'cb_admin_orders' }, { text: '🔙 پنل مدیریت', callback_data: 'cb_admin_panel' }],
        ],
      },
    }];
  }

  if (data === 'cb_admin_stats') {
    return [{
      chatId,
      text: `📊 *آمار کلی سیستم ربات*\n\n` +
        `• کل کاربران: ${botStorage.wallets.size} نفر\n` +
        `• مجموع سفارشات: ${botStorage.orders.length} خرید\n` +
        `• درگاه فعال: ${botStorage.ownerConfig.gatewayActive ? 'بله' : 'خیر'}\n` +
        `• وضعیت سرور: پایدار (Node.js / Vite / TS)`,
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔙 پنل مدیریت', callback_data: 'cb_admin_panel' }],
        ],
      },
    }];
  }

  if (data === 'cb_admin_db_backup') {
    const walletsCount = botStorage.wallets.size;
    const clashCount = botStorage.clashVillages.size;
    const mafiaCount = platformStore.users.size;
    const ordersCount = botStorage.orders.length;
    const seenCount = botStorage.seenOrders.length;
    const filesCount = botStorage.uploadedFiles.length;
    const total = walletsCount + clashCount + mafiaCount + ordersCount + seenCount + filesCount + 1;

    return [{
      chatId,
      text: `💾 *سامانه جامع پشتیبان‌گیری و پایگاه داده ربات (Database Backup)*\n\n` +
        `📊 *وضعیت فعلی جداول و رکوردهای در حافظه:*\n` +
        `• 👥 کاربران و کیف‌پول‌ها: *${walletsCount} رکورد*\n` +
        `• ⚔️ دهکده‌های کلش آف کلنز: *${clashCount} رکورد*\n` +
        `• 🎭 اکانت‌های مافیا آنلاین: *${mafiaCount} رکورد*\n` +
        `• 🛒 سفارشات و فاکتورها: *${ordersCount} رکورد*\n` +
        `• 👁️ سفارشات سین تلگرام: *${seenCount} رکورد*\n` +
        `• 📤 فایل‌های آپلودشده (Aplo): *${filesCount} رکورد*\n` +
        `• ⚙️ کل رکوردهای سیستم: *${total.toLocaleString('fa-IR')} سطر*\n\n` +
        `💡 شما می‌توانید با مراجعه به تب اختصاصی **«بک‌آپ و دیتابیس»** در بالای صفحه:\n` +
        `1️⃣ فایل کامل استاندارد SQL را دانلود کنید.\n` +
        `2️⃣ هرگونه اسکریپت SQL را برای بازیابی (Restore) در شبیه‌ساز اجرا نمایید.\n` +
        `3️⃣ جداول و سطرها را با کاوشگر دیتابیس بررسی کنید.`,
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔄 آمار کلی سرور', callback_data: 'cb_admin_stats' }],
          [{ text: '🔙 بازگشت به پنل مدیریت', callback_data: 'cb_admin_panel' }],
        ],
      },
    }];
  }

  if (data === 'cb_universal_dl_menu' || data === 'cb_ask_dl_url') {
    botStorage.userStates.set(user.id, { step: 'awaiting_downloader_url' });
    return handleUniversalDownloader(chatId, user);
  }

  if (data === 'cb_dl_preset_ig') {
    return handleUniversalDownloader(chatId, user, 'https://www.instagram.com/reel/C4x891ABcd/');
  }

  if (data === 'cb_dl_preset_ig_profile') {
    return handleUniversalDownloader(chatId, user, 'https://www.instagram.com/cristiano/');
  }

  if (data === 'cb_dl_preset_yt') {
    return handleUniversalDownloader(chatId, user, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  }

  if (data === 'cb_dl_preset_tt') {
    return handleUniversalDownloader(chatId, user, 'https://www.tiktok.com/@creativestar/video/718293');
  }

  if (data === 'cb_dl_preset_pin') {
    return handleUniversalDownloader(chatId, user, 'https://pinterest.com/pin/987123456789/');
  }

  if (data === 'cb_dl_preset_tw') {
    return handleUniversalDownloader(chatId, user, 'https://x.com/techinsider/status/17892345678');
  }

  if (data === 'cb_dl_preset_sp') {
    return handleUniversalDownloader(chatId, user, 'https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT');
  }

  if (data === 'cb_dl_preset_aparat') {
    return handleUniversalDownloader(chatId, user, 'https://www.aparat.com/v/k982a');
  }

  if (data === 'cb_dl_preset_ig_story') {
    return handleUniversalDownloader(chatId, user, 'https://www.instagram.com/stories/cristiano/3289123456789/');
  }

  if (data === 'cb_dl_preset_sc') {
    return handleUniversalDownloader(chatId, user, 'https://soundcloud.com/chillhopdotcom/jazzy-hiphop-beats');
  }

  if (data === 'cb_dl_preset_tg') {
    return handleUniversalDownloader(chatId, user, 'https://t.me/durov/128');
  }

  if (data === 'cb_dl_preset_threads') {
    return handleUniversalDownloader(chatId, user, 'https://www.threads.net/@techinsider/post/Cx987abc123');
  }

  if (data === 'cb_dl_preset_fb') {
    return handleUniversalDownloader(chatId, user, 'https://www.facebook.com/watch/?v=9876543210');
  }

  if (data === 'cb_dl_preset_url') {
    return handleUniversalDownloader(chatId, user, 'https://archive.org/download/sample_archive/project_assets.zip');
  }

  // Dynamic Caption & Bio callback
  if (data.startsWith('cb_dl_caption_')) {
    const rawUrl = decodeURIComponent(data.replace('cb_dl_caption_', ''));
    const item = fetchUniversalDownload(rawUrl);
    const captionContent = item.description && item.description.trim()
      ? item.description
      : 'کپشن در دسترس نیست یا برای این پست متنی نوشته نشده است.';

    return [
      {
        chatId,
        text:
          `📝 *دانلود و مشاهده بیو و کپشن پست:*\n\n` +
          `👤 **پیج سازنده:** ${item.author}\n` +
          `🆔 **کد پست:** \`${item.id.replace('dl_ig_', '')}\`\n\n` +
          `📖 **متن کپشن پست:**\n` +
          `«${captionContent}»\n\n` +
          (item.profileDetails?.bio ? `👤 **بیوگرافی پیج سازنده:**\n_${item.profileDetails.bio}_\n\n` : '') +
          `📋 *جهت کپی، متن بالا را لمس کنید.*`,
        reply_markup: {
          inline_keyboard: [
            [
              { text: '📥 دانلود ویدیوی پست (1080p)', url: item.mediaUrl || item.formats[0]?.downloadUrl },
              { text: '🎵 دانلود آهنگ پست (MP3)', callback_data: 'cb_dl_audio_' + encodeURIComponent(rawUrl) },
            ],
            [
              { text: '👤 مشاهده پیج ناشر', callback_data: 'cb_dl_author_' + encodeURIComponent(rawUrl) },
              { text: '🎬 بازگشت به ویدیوی پست', callback_data: 'cb_dl_back_' + encodeURIComponent(rawUrl) },
            ],
          ],
        },
      },
    ];
  }

  // Dynamic Audio of Post callback
  if (data.startsWith('cb_dl_audio_')) {
    const rawUrl = decodeURIComponent(data.replace('cb_dl_audio_', ''));
    const item = fetchUniversalDownload(rawUrl);
    const audioFmt = item.formats.find((f) => f.type === 'audio');
    const audioUrl = audioFmt?.downloadUrl || `https://ais-dev-dxc4tymnudmayrh26p7cqa-76299078893.us-east1.run.app/api/media/stream?url=${encodeURIComponent(item.mediaUrl || '')}&filename=audio.mp3&audio=true`;
    return [
      {
        chatId,
        audioUrl,
        photoUrl: item.thumbnail,
        mediaAttachment: {
          type: 'audio',
          title: `موزیک اختصاصی ریلز ${item.title}`,
          author: item.author || 'ناشر اینستاگرام',
          previewUrl: item.thumbnail,
          url: audioUrl,
          duration: item.duration || '00:45',
          quality: '320kbps Master',
          sizeMb: audioFmt?.sizeMb || 3.1,
        },
        text:
          `🎵 *دانلود آهنگ و صوت اختصاصی پست:*\n\n` +
          `🎼 **نام قطعه:** صوت استخراج‌شده از ${item.title}\n` +
          `👤 **ناشر:** ${item.author || 'ناشر اینستاگرام'}\n` +
          `🎚️ **کیفیت:** ۳۲۰ کیلوبیت استودیویی (MP3 320kbps)\n` +
          `⏱️ **مدت:** ${item.duration || '00:45'} | 📁 **حجم:** ${audioFmt?.sizeMb || 3.1} مگابایت\n\n` +
          `👇 پلیر پخش آنلاین در چت فعال شد و فایل آماده دانلود مستقیم است:`,
        reply_markup: {
          inline_keyboard: [
            [
              { text: '📥 دانلود مستقیم فایل صوتی (MP3 320k)', url: audioUrl },
            ],
            [
              { text: '📝 دانلود بیو و کپشن پست', callback_data: 'cb_dl_caption_' + encodeURIComponent(rawUrl) },
              { text: '🎬 بازگشت به ویدیوی پست', callback_data: 'cb_dl_back_' + encodeURIComponent(rawUrl) },
            ],
          ],
        },
      },
    ];
  }

  // Dynamic Author Profile callback
  if (data.startsWith('cb_dl_author_')) {
    const rawUrl = decodeURIComponent(data.replace('cb_dl_author_', ''));
    const item = fetchUniversalDownload(rawUrl);
    const followers = item.profileDetails?.followers || 'در دسترس نیست';
    const postsCount = item.profileDetails?.postsCount || 'در دسترس نیست';
    return [
      {
        chatId,
        photoUrl: item.profileDetails?.avatarUrl || item.authorAvatar || item.thumbnail,
        mediaAttachment: {
          type: 'profile',
          title: item.profileDetails?.fullName || item.author,
          author: item.author,
          previewUrl: item.profileDetails?.avatarUrl || item.thumbnail,
          profileDetails: item.profileDetails,
          isVerified: true,
        },
        text:
          `👤 *مشخصات و بیوگرافی پیج سازنده:*\n\n` +
          `⭐ **نام:** ${item.profileDetails?.fullName || 'کاربر اینستاگرام'}\n` +
          `🆔 **آیدی:** \`${item.author}\`\n` +
          `👥 **تعداد فالوور:** ${followers}\n` +
          `📸 **تعداد پست‌ها:** ${postsCount}\n` +
          (item.profileDetails?.bio ? `📝 **بیو:** _${item.profileDetails.bio}_\n\n` : '\n') +
          `👇 عکس با کیفیت بالا برای شما ارسال شد:`,
        reply_markup: {
          inline_keyboard: [
            [
              { text: '📸 دانلود عکس پروفایل فول‌سایز HD', url: item.profileDetails?.avatarUrl || item.thumbnail },
            ],
            [
              { text: '🎬 بازگشت به ویدیوی پست', callback_data: 'cb_dl_back_' + encodeURIComponent(rawUrl) },
              { text: '🎵 دانلود آهنگ پست', callback_data: 'cb_dl_audio_' + encodeURIComponent(rawUrl) },
            ],
          ],
        },
      },
    ];
  }

  // Dynamic Back callback
  if (data.startsWith('cb_dl_back_')) {
    const rawUrl = decodeURIComponent(data.replace('cb_dl_back_', ''));
    return handleUniversalDownloader(chatId, user, rawUrl);
  }

  if (data === 'cb_main_menu') {
    return [
      {
        chatId,
        text: `🏠 منوی اصلی ربات:\nتمامی ماژول‌ها آماده ارائه خدمات هستند:`,
        reply_markup: MAIN_INLINE_KEYBOARD,
      },
    ];
  }

  if (data === 'cb_tool_live_grounding') {
    try {
      const res = await fetch('/api/tools/live-web-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: 'آخرین نرخ لحظه‌ای ارز، طلا، سکه و رمزارزها در بازار تهران و وضعیت سرویس‌های آنلاین مهم امروز' }),
      });
      const dataJson = await res.json();
      const textResult = dataJson.success && dataJson.result ? dataJson.result : 'اطلاعات زنده دریافت نشد.';
      return [
        {
          chatId,
          text: `🌍 *استعلام زنده وب با گوگل (Google Search Grounding)*\n\n${textResult}\n\n_موتور جستجوی گوگل جمینی_`,
          reply_markup: {
            inline_keyboard: [
              [{ text: '🔄 استعلام مجدد وب', callback_data: 'cb_tool_live_grounding' }],
              [{ text: '🔙 جعبه ابزار', callback_data: 'cb_tools_menu' }],
            ],
          },
        },
      ];
    } catch {
      return [
        {
          chatId,
          text: `🌍 *استعلام زنده وب با گوگل (Google Search Grounding)*\n\nخطا در برقراری ارتباط با سرویس گوگل سرچ.`,
          reply_markup: {
            inline_keyboard: [
              [{ text: '🔄 تلاش مجدد', callback_data: 'cb_tool_live_grounding' }],
              [{ text: '🔙 جعبه ابزار', callback_data: 'cb_tools_menu' }],
            ],
          },
        },
      ];
    }
  }

  // 1. WEB PROXY CALLBACKS
  if (data === 'cb_webproxy_menu') {
    return handleWebProxyMenu(chatId, user);
  }

  // 2. VIRTUAL NUMBERS CALLBACKS
  if (data === 'cb_vaksms_menu') {
    return handleVirtualNumberMenu(chatId, user);
  }
  if (data.startsWith('cb_vaksms_buy_')) {
    const country = data.replace('cb_vaksms_buy_', '');
    const order = orderVirtualPhoneNumber(country, 'tg', user.id);
    return [
      {
        chatId,
        text: `📱 **سفارش شماره مجازی با موفقیت ثبت شد!**\n\n` +
          `🏳️ **کشور:** ${order.flag} ${order.countryNameFa}\n` +
          `📞 **شماره شما:** \`${order.phoneNumber}\`\n` +
          `💬 **سرویس:** تلگرام (Telegram)\n` +
          `💰 **مبلغ کسر شده:** ${order.priceToman.toLocaleString('fa-IR')} تومان\n` +
          `⏳ **مهلت دریافت پیامک:** ۲۰ دقیقه\n\n` +
          `_لطفاً شماره را در تلگرام وارد کنید. به محض ارسال کد از طرف تلگرام، پیامک در اینجا نمایش داده می‌شود..._`,
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔄 بررسی دریافت پیامک (استعلام)', callback_data: `cb_vaksms_check_${order.id}` }],
            [{ text: '❌ لغو و بازگشت وجه', callback_data: `cb_vaksms_cancel_${order.id}` }],
            [{ text: '🔙 بازگشت به فروشگاه', callback_data: 'cb_vaksms_menu' }],
          ],
        },
      },
    ];
  }
  if (data.startsWith('cb_vaksms_check_')) {
    const orderId = data.replace('cb_vaksms_check_', '');
    const order = activeVirtualOrders.find((o) => o.id === orderId);
    if (order && order.smsCode) {
      return [
        {
          chatId,
          text: `🎉 **کد تایید پیامکی دریافت شد!**\n\n` +
            `📞 شماره: \`${order.phoneNumber}\`\n` +
            `🔑 **کد تایید (SMS Code):** \`${order.smsCode}\`\n\n` +
            `با این کد می‌توانید وارد اکانت تلگرام خود شوید.`,
          reply_markup: {
            inline_keyboard: [
              [{ text: '🛒 خرید شماره دیگر', callback_data: 'cb_vaksms_menu' }],
              [{ text: '🔙 منوی اصلی', callback_data: 'cb_main_menu' }],
            ],
          },
        },
      ];
    }
    return [
      {
        chatId,
        text: `⏳ در حال انتظار برای پیامک...\nهنوز پیامکی دریافت نشده است. چند ثانیه دیگر مجدداً دکمه بررسی را بزنید.`,
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔄 بررسی مجدد', callback_data: `cb_vaksms_check_${orderId}` }],
            [{ text: '🔙 بازگشت', callback_data: 'cb_vaksms_menu' }],
          ],
        },
      },
    ];
  }
  if (data === 'cb_vaksms_my_orders') {
    const myOrders = activeVirtualOrders.filter((o) => o.userId === user.id);
    const orderText = myOrders.length > 0
      ? myOrders.map((o) => `• ${o.flag} \`${o.phoneNumber}\` (${o.serviceNameFa}) - وضعیت: ${o.smsCode ? `کد: \`${o.smsCode}\`` : 'در انتظار'}`).join('\n')
      : 'شما تاکنون شماره‌ای خریداری نکرده‌اید.';
    return [
      {
        chatId,
        text: `📋 **سفارش‌های شماره مجازی شما:**\n\n${orderText}`,
        reply_markup: {
          inline_keyboard: [
            [{ text: '🛒 خرید شماره جدید', callback_data: 'cb_vaksms_menu' }],
            [{ text: '🔙 منوی اصلی', callback_data: 'cb_main_menu' }],
          ],
        },
      },
    ];
  }

  // 3. YOUTUBE CALLBACKS
  if (data === 'cb_youtube_menu') {
    return handleYouTubeMenu(chatId, user);
  }
  if (data === 'cb_yt_sample') {
    const ytDetails = fetchYouTubeVideoDetails('https://www.youtube.com/watch?v=sample');
    return [
      {
        chatId,
        text: `🎬 **اطلاعات و لینک‌های دانلود ویدیو یوتیوب:**\n\n` +
          `📌 **عنوان:** ${ytDetails.title}\n` +
          `📺 **کانال:** ${ytDetails.channel} | 👁️ ${ytDetails.views} بازدید | ⏱️ ${ytDetails.duration}\n\n` +
          `کیفیت موردنظر را جهت دانلود انتخاب کنید:`,
        photoUrl: ytDetails.thumbnail,
        reply_markup: {
          inline_keyboard: [
            [{ text: '📥 دانلود کیفیت 1080p Full HD (حجم ۱۴۲ مگابایت)', callback_data: 'cb_yt_dl_1080' }],
            [{ text: '📥 دانلود کیفیت 720p HD (حجم ۸۴ مگابایت)', callback_data: 'cb_yt_dl_720' }],
            [{ text: '🎵 دانلود صوت استخراج‌شده MP3 (کیفیت ۳۲۰)', callback_data: 'cb_yt_dl_mp3' }],
            [{ text: '🔙 دانلود ویدیوی دیگر', callback_data: 'cb_youtube_menu' }],
          ],
        },
      },
    ];
  }
  if (data.startsWith('cb_yt_dl_')) {
    return [
      {
        chatId,
        text: `🚀 **فایل شما آماده است!**\nلینک مستقیم با ترافیک نیم‌بها:\n\`https://www.w3schools.com/html/mov_bbb.mp4\``,
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔙 بازگشت به یوتیوب', callback_data: 'cb_youtube_menu' }],
            [{ text: '🏠 منوی اصلی', callback_data: 'cb_main_menu' }],
          ],
        },
      },
    ];
  }

  // 4. MUSIC SEARCH CALLBACKS
  if (data === 'cb_music_menu') {
    return handleMusicMenu(chatId, user);
  }
  if (data.startsWith('cb_music_play_')) {
    const trackIdx = parseInt(data.replace('cb_music_play_', ''), 10) - 1;
    const track = MUSIC_CATALOG[trackIdx] || MUSIC_CATALOG[0];
    return [
      {
        chatId,
        text: `🎶 **${track.title}**\n` +
          `🎤 **خواننده:** ${track.artist}\n` +
          `⏱️ **مدت زمان:** ${track.duration} | 📅 سال: ${track.releaseYear}\n\n` +
          `📝 **بخشی از ترانه:**\n_${track.lyrics?.split('\n').slice(0, 3).join('\n')}_`,
        photoUrl: track.coverUrl,
        reply_markup: {
          inline_keyboard: [
            [{ text: '📥 دانلود کیفیت 320kbps (اورجینال)', callback_data: 'cb_music_dl_320' }],
            [{ text: '📥 دانلود کیفیت 128kbps (کم‌حجم)', callback_data: 'cb_music_dl_128' }],
            [{ text: '🔙 جستجوی آهنگ دیگر', callback_data: 'cb_music_menu' }],
          ],
        },
      },
    ];
  }
  if (data.startsWith('cb_music_dl_')) {
    return [
      {
        chatId,
        text: `🎵 فایل موسیقی در حال ارسال است...\nکیفیت ۳۲۰kbps با تگ کامل و کاور آرک با موفقیت آماده دانلود شد!`,
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔙 لیست موزیک‌ها', callback_data: 'cb_music_menu' }],
            [{ text: '🏠 منوی اصلی', callback_data: 'cb_main_menu' }],
          ],
        },
      },
    ];
  }

  // 5. ARZY CALLBACKS
  if (data === 'cb_arzy_menu') {
    return await handleArzyMenu(chatId, user);
  }
  if (data === 'cb_arzy_gold') {
    return await handleArzyMenu(chatId, user, 'gold_coin');
  }
  if (data === 'cb_arzy_crypto') {
    return await handleArzyMenu(chatId, user, 'crypto');
  }
  if (data === 'cb_arzy_fiat') {
    return await handleArzyMenu(chatId, user, 'currency');
  }
  if (data.startsWith('cb_arzy_') && data !== 'cb_arzy_calc') {
    const rawKey = data.replace('cb_arzy_', '');
    return await handleNaturalArzyText(chatId, user, rawKey);
  }
  if (data === 'cb_arzy_calc') {
    const rates = await getDetailedArzyRates();
    const usdtRate = rates.find((r) => r.key === 'usdt')?.priceToman || 267632;
    const gold18 = rates.find((r) => r.key === 'gold_18k')?.priceToman || 26364300;
    const emami = rates.find((r) => r.key === 'coin_emami')?.priceToman || 271910000;
    const eur = rates.find((r) => r.key === 'eur')?.priceToman || 300280;
    const aed = rates.find((r) => r.key === 'aed')?.priceToman || 73064;

    return [
      {
        chatId,
        text:
          `🧮 *ماشین‌حساب هوشمند تبدیل ارز (محاسبه آنلاین طبق نرخ زنده)*\n\n` +
          `• **۱۰۰ دلار:** \`${(usdtRate * 100).toLocaleString('fa-IR')} تومان\`\n` +
          `• **۱۰۰ یورو:** \`${(eur * 100).toLocaleString('fa-IR')} تومان\`\n` +
          `• **۱,۰۰۰ درهم:** \`${(aed * 1000).toLocaleString('fa-IR')} تومان\`\n` +
          `• **۱ سکه امامی:** \`${emami.toLocaleString('fa-IR')} تومان\`\n` +
          `• **۱۰ گرم طلای ۱۸ عیار:** \`${(gold18 * 10).toLocaleString('fa-IR')} تومان\`\n` +
          `• **۱۰۰ تتر (USDT):** \`${(usdtRate * 100).toLocaleString('fa-IR')} تومان\`\n\n` +
          `💡 _برای تبدیل مبالغ دلخواه، کافیست در چت بنویسید (مثلاً: \`۵۰ دلار\` یا \`۲۰۰ تتر\` یا \`۳ گرم طلا\`)_`,
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔄 مشاهده تابلوی کامل نرخ‌ها', callback_data: 'cb_arzy_menu' }],
            [{ text: '🔙 منوی اصلی', callback_data: 'cb_main_menu' }],
          ],
        },
      },
    ];
  }

  // 6. APLO CALLBACKS
  if (data === 'cb_aplo_menu') {
    return handleAploMenu(chatId, user);
  }
  if (data === 'cb_aplo_sample') {
    const sample = aploStoredFilesList[0];
    return [
      {
        chatId,
        text: `📦 **فایل با موفقیت آپلود و ذخیره شد! (aplo.zip)**\n\n` +
          `📄 نام فایل: \`${sample.fileName}\`\n` +
          `📊 حجم: ${(sample.fileSize / 1024 / 1024).toFixed(2)} مگابایت\n` +
          `🔗 **لینک دانلود مستقیم:**\n\`https://slowmega.bot${sample.downloadUrl}\`\n\n` +
          `⏳ انقضا: ${sample.expiresAt} (۳۰ روزه)\n` +
          `📥 دفعات دانلود: ${sample.downloadsCount} بار`,
        reply_markup: {
          inline_keyboard: [
            [{ text: '📂 مشاهده تمام فایل‌های من', callback_data: 'cb_aplo_my_files' }],
            [{ text: '🔙 منوی آپلودر', callback_data: 'cb_aplo_menu' }],
          ],
        },
      },
    ];
  }
  if (data === 'cb_aplo_my_files') {
    const listText = aploStoredFilesList.map((f, i) => `${i + 1}. \`${f.fileName}\` (${(f.fileSize / 1024 / 1024).toFixed(1)}MB) - انقضا: ${f.expiresAt}`).join('\n');
    return [
      {
        chatId,
        text: `📂 **فهرست فایل‌های آپلود شده شما:**\n\n${listText}`,
        reply_markup: {
          inline_keyboard: [
            [{ text: '➕ آپلود فایل جدید', callback_data: 'cb_aplo_menu' }],
            [{ text: '🔙 منوی اصلی', callback_data: 'cb_main_menu' }],
          ],
        },
      },
    ];
  }

  // 7. TIKTOK CALLBACKS
  if (data === 'cb_tiktok_menu') {
    return handleTikTokMenu(chatId, user);
  }
  if (data === 'cb_tiktok_sample') {
    const ttDetails = fetchTikTokVideoDetails('https://www.tiktok.com/@creativestar/video/1234');
    return [
      {
        chatId,
        text: `✨ **ویدیو تیک‌تاک بدون واترمرک آماده است!**\n\n` +
          `🎬 **عنوان:** ${ttDetails.title}\n` +
          `👤 **سازنده:** ${ttDetails.author}\n` +
          `❤️ ${ttDetails.likes.toLocaleString('fa-IR')} لایک | 💬 ${ttDetails.comments.toLocaleString('fa-IR')} نظر | ⏱️ ${ttDetails.durationSec} ثانیه\n\n` +
          `کیفیت ویدیوی دانلود شده Full HD و فاقد هرگونه لوگو یا آیدی متحرک است.`,
        photoUrl: ttDetails.coverUrl,
        reply_markup: {
          inline_keyboard: [
            [{ text: '📥 دانلود ویدیو بدون واترمرک (MP4)', callback_data: 'cb_tiktok_dl_video' }],
            [{ text: '🎵 دانلود موزیک ویدیو (MP3)', callback_data: 'cb_tiktok_dl_audio' }],
            [{ text: '🔙 دانلود ویدیوی دیگر', callback_data: 'cb_tiktok_menu' }],
          ],
        },
      },
    ];
  }
  if (data.startsWith('cb_tiktok_dl_')) {
    return [
      {
        chatId,
        text: `🚀 فایل تیک‌تاک آماده شد!\nلینک مستقیم با بالاترین پهنای باند سرور:\n\`https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4\``,
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔙 بازگشت به تیک‌تاک', callback_data: 'cb_tiktok_menu' }],
            [{ text: '🏠 منوی اصلی', callback_data: 'cb_main_menu' }],
          ],
        },
      },
    ];
  }

  // MAFIA CALLBACKS
  if (data === 'cb_mafia_menu') {
    return handleMafiaMenu(chatId, user, user.platform || 'telegram');
  }

  if (data === 'cb_mafia_start_9' || data === 'cb_mafia_quick_start_9' || data === 'cb_mafia_create_9') {
    MafiaEngine.createLobby(chatId, 9, user);
    const game = MafiaEngine.fillWithSimulatedPlayers(chatId);
    const userPlayer = game.players[0];
    const roleDef = MAFIA_ROLES_CATALOG[userPlayer.role];

    return [
      {
        chatId,
        text: `🎮 *بازی مافیا ۹ نفره آغاز شد! (9-player-game.php)*\n\n` +
          `🪑 صندلی شما: **شماره ۱**\n` +
          `🎭 نقش محرمانه شما:\n` +
          `${roleDef.emoji} **${roleDef.name}**\n` +
          `🚩 تیم: ${roleDef.team === 'mafia' ? '🔴 تیم مافیا' : '🟢 تیم شهروندان'}\n` +
          `📝 توضیحات نقش: ${roleDef.description}\n\n` +
          `🌑 **فاز شب اول:**\n` +
          `شهر در خواب فرو می‌رود. چشم‌های خود را ببندید...\n` +
          `نقش‌های شب برای تصمیم‌گیری بیدار شوند!`,
        reply_markup: {
          inline_keyboard: [
            [
              { text: '🌙 انجام اکشن شبانه من', callback_data: 'cb_mafia_act_night' },
              { text: '📋 جدول وضعیت (table.php)', callback_data: 'cb_mafia_table' },
            ],
            [{ text: '☀️ طلوع روز و اعلام تلفات شب', callback_data: 'cb_mafia_day_start' }],
          ],
        },
      },
    ];
  }

  if (data === 'cb_mafia_start_12' || data === 'cb_mafia_create_12') {
    MafiaEngine.createLobby(chatId, 12, user);
    const game = MafiaEngine.fillWithSimulatedPlayers(chatId);
    const userPlayer = game.players[0];
    const roleDef = MAFIA_ROLES_CATALOG[userPlayer.role];

    return [
      {
        chatId,
        text: `🎮 *بازی مافیا ۱۲ نفره آغاز شد! (12-player-game.php)*\n\n` +
          `🪑 صندلی شما: **شماره ۱**\n` +
          `🎭 نقش محرمانه شما:\n` +
          `${roleDef.emoji} **${roleDef.name}**\n` +
          `🚩 تیم: ${roleDef.team === 'mafia' ? '🔴 تیم مافیا' : '🟢 تیم شهروندان'}\n` +
          `📝 توانایی: ${roleDef.description}\n\n` +
          `🌑 **فاز شب اول:**\n` +
          `گادپدر، دکتر لکتور، دکتر، کارآگاه، اسنایپر و کشیش بیدار شوند!`,
        reply_markup: {
          inline_keyboard: [
            [
              { text: '🌙 انجام اکشن شبانه من', callback_data: 'cb_mafia_act_night' },
              { text: '📋 جدول وضعیت (table.php)', callback_data: 'cb_mafia_table' },
            ],
            [{ text: '☀️ طلوع روز و اعلام تلفات شب', callback_data: 'cb_mafia_day_start' }],
          ],
        },
      },
    ];
  }

  if (data === 'cb_mafia_table') {
    const game = activeMafiaGames.get(chatId);
    if (!game) return handleMafiaMenu(chatId, user, user.platform || 'telegram');
    const tableText = MafiaEngine.generateStatusTable(game);
    return [
      {
        chatId,
        text: tableText,
        reply_markup: {
          inline_keyboard: [
            [
              { text: '🌙 اکشن شب', callback_data: 'cb_mafia_act_night' },
              { text: '☀️ طلوع روز', callback_data: 'cb_mafia_day_start' },
            ],
            [{ text: '🔙 منوی مافیا', callback_data: 'cb_mafia_menu' }],
          ],
        },
      },
    ];
  }

  if (data === 'cb_mafia_roles_help') {
    let helpText = `📜 *معرفی کامل نقش‌های مافیا (PUBLIC/beta ( mafia ))*\n\n`;
    Object.values(MAFIA_ROLES_CATALOG).forEach((r) => {
      helpText += `${r.emoji} **${r.name}:**\n${r.description}\n\n`;
    });
    return [
      {
        chatId,
        text: helpText,
        reply_markup: {
          inline_keyboard: [
            [{ text: '⚡ شروع بازی ۹ نفره', callback_data: 'cb_mafia_start_9' }],
            [{ text: '⚡ شروع بازی ۱۲ نفره', callback_data: 'cb_mafia_start_12' }],
            [{ text: '🔙 بازگشت', callback_data: 'cb_mafia_menu' }],
          ],
        },
      },
    ];
  }

  if (data === 'cb_mafia_act_night') {
    const game = activeMafiaGames.get(chatId);
    if (!game) return handleMafiaMenu(chatId, user, user.platform || 'telegram');
    const userPlayer = game.players[0];
    if (!userPlayer || !userPlayer.isAlive) {
      return [{ chatId, text: '💀 شما در این بازی زنده نیستید!' }];
    }

    const aliveOtherPlayers = game.players.filter((p) => p.isAlive && p.userId !== user.id);
    const allAlive = game.players.filter((p) => p.isAlive);

    if (userPlayer.role === 'godfather' || userPlayer.role === 'mafia_simple') {
      return [
        {
          chatId,
          text: `🔫 *شلیک مافیا:*\nکدام بازیکن را برای ترور شبانه هدف قرار می‌دهید؟`,
          reply_markup: {
            inline_keyboard: aliveOtherPlayers.map((t) => [
              { text: `🎯 شلیک به صندلی ${t.seatNumber}: ${t.name}`, callback_data: `cb_mafia_act_shoot_${t.seatNumber}` },
            ]),
          },
        },
      ];
    } else if (userPlayer.role === 'doctor') {
      return [
        {
          chatId,
          text: `💉 *نجات دکتر (فرصت نجات خود: ${userPlayer.doctorSelfSavesLeft} بار):*\nجان چه کسی را در این شب نجات می‌دهید؟`,
          reply_markup: {
            inline_keyboard: allAlive.map((t) => [
              { text: `💚 نجات صندلی ${t.seatNumber}: ${t.name}`, callback_data: `cb_mafia_act_save_${t.seatNumber}` },
            ]),
          },
        },
      ];
    } else if (userPlayer.role === 'detective') {
      return [
        {
          chatId,
          text: `🔍 *استعلام کارآگاه:*\nاستعلام هویت کدام بازیکن را می‌خواهید؟`,
          reply_markup: {
            inline_keyboard: aliveOtherPlayers.map((t) => [
              { text: `🔎 استعلام صندلی ${t.seatNumber}: ${t.name}`, callback_data: `cb_mafia_act_inquire_${t.seatNumber}` },
            ]),
          },
        },
      ];
    } else if (userPlayer.role === 'sniper') {
      return [
        {
          chatId,
          text: `🎯 *شلیک اسنایپر:*\nاگر به مافیا بزنید حذف می‌شود؛ اگر به شهروند بزنید خودتان کشته می‌شوید!`,
          reply_markup: {
            inline_keyboard: aliveOtherPlayers.map((t) => [
              { text: `🎯 تیر به صندلی ${t.seatNumber}: ${t.name}`, callback_data: `cb_mafia_act_sniper_${t.seatNumber}` },
            ]),
          },
        },
      ];
    } else {
      return [
        {
          chatId,
          text: `😴 شما ${MAFIA_ROLES_CATALOG[userPlayer.role].name} هستید و در شب به خواب عمیق رفته‌اید.\nمنتظر طلوع خورشید و اعلام نتایج شب باشید!`,
          reply_markup: {
            inline_keyboard: [
              [{ text: '☀️ پایان شب و طلوع روز', callback_data: 'cb_mafia_day_start' }],
              [{ text: '📋 جدول وضعیت (table.php)', callback_data: 'cb_mafia_table' }],
            ],
          },
        },
      ];
    }
  }

  if (data.startsWith('cb_mafia_act_shoot_')) {
    const seat = parseInt(data.replace('cb_mafia_act_shoot_', ''), 10);
    const res = MafiaEngine.performNightAction(chatId, user.id, 'shoot', seat);
    return [
      {
        chatId,
        text: res.message,
        reply_markup: {
          inline_keyboard: [
            [{ text: '☀️ پایان شب و طلوع روز', callback_data: 'cb_mafia_day_start' }],
            [{ text: '📋 جدول وضعیت', callback_data: 'cb_mafia_table' }],
          ],
        },
      },
    ];
  }

  if (data.startsWith('cb_mafia_act_save_')) {
    const seat = parseInt(data.replace('cb_mafia_act_save_', ''), 10);
    const res = MafiaEngine.performNightAction(chatId, user.id, 'save', seat);
    return [
      {
        chatId,
        text: res.message,
        reply_markup: {
          inline_keyboard: [
            [{ text: '☀️ پایان شب و طلوع روز', callback_data: 'cb_mafia_day_start' }],
            [{ text: '📋 جدول وضعیت', callback_data: 'cb_mafia_table' }],
          ],
        },
      },
    ];
  }

  if (data.startsWith('cb_mafia_act_inquire_')) {
    const seat = parseInt(data.replace('cb_mafia_act_inquire_', ''), 10);
    const res = MafiaEngine.performNightAction(chatId, user.id, 'inquire', seat);
    return [
      {
        chatId,
        text: res.message,
        reply_markup: {
          inline_keyboard: [
            [{ text: '☀️ پایان شب و طلوع روز', callback_data: 'cb_mafia_day_start' }],
            [{ text: '📋 جدول وضعیت', callback_data: 'cb_mafia_table' }],
          ],
        },
      },
    ];
  }

  if (data.startsWith('cb_mafia_act_sniper_')) {
    const seat = parseInt(data.replace('cb_mafia_act_sniper_', ''), 10);
    const res = MafiaEngine.performNightAction(chatId, user.id, 'sniper_shoot', seat);
    return [
      {
        chatId,
        text: res.message,
        reply_markup: {
          inline_keyboard: [
            [{ text: '☀️ پایان شب و طلوع روز', callback_data: 'cb_mafia_day_start' }],
            [{ text: '📋 جدول وضعیت', callback_data: 'cb_mafia_table' }],
          ],
        },
      },
    ];
  }

  if (data === 'cb_mafia_day_start') {
    const nightResult = MafiaEngine.endNightAndStartDay(chatId);
    const game = nightResult.game;
    const alivePlayers = game.players.filter((p) => p.isAlive);

    if (nightResult.isOver) {
      const winnerName = game.winner === 'citizens' ? '🎉 شهروندان پیروز شدند!' : '🎩 تیم مافیا پیروز شد!';
      return [
        {
          chatId,
          text: `☀️ *صبح روز ${game.dayCount}*\n\n` +
            `${nightResult.casualtyReport}\n\n` +
            `🏆 **پایان بازی! ${winnerName}**\n\n` +
            `نقش تمامی بازیکنان:\n` +
            game.players.map((p) => `صندلی [${p.seatNumber}]: ${p.name} - ${MAFIA_ROLES_CATALOG[p.role].emoji} ${MAFIA_ROLES_CATALOG[p.role].name}`).join('\n'),
          reply_markup: {
            inline_keyboard: [
              [{ text: '🔄 شروع دست جدید ۹ نفره', callback_data: 'cb_mafia_start_9' }],
              [{ text: '🔄 شروع دست جدید ۱۲ نفره', callback_data: 'cb_mafia_start_12' }],
              [{ text: '🔙 منوی اصلی', callback_data: 'cb_main_menu' }],
            ],
          },
        },
      ];
    }

    return [
      {
        chatId,
        text: `☀️ *صبح روز ${game.dayCount} دمید!*\n\n` +
          `${nightResult.casualtyReport}\n\n` +
          `👥 تعداد بازماندگان زنده: **${alivePlayers.length} نفر**\n\n` +
          `🗣️ زمان صحبت و رای‌گیری آغاز شد. به چه کسی مشکوک هستید؟`,
        reply_markup: {
          inline_keyboard: [
            [
              { text: '🎙️ ورود به ویس کال مافیا', callback_data: 'cb_mafia_voice_enter' },
              { text: '🗣️ مناظره صوتی بازیکنان', callback_data: 'cb_mafia_debate_trigger' },
            ],
            [{ text: '🗳️ شروع رای‌گیری خروج (button.php)', callback_data: 'cb_mafia_start_voting' }],
            [{ text: '📋 جدول صندلی‌ها (table.php)', callback_data: 'cb_mafia_table' }],
            [{ text: '🌙 گذر به شب بعدی', callback_data: 'cb_mafia_night_start' }],
          ],
        },
      },
    ];
  }

  if (data === 'cb_mafia_voice_enter') {
    const game = activeMafiaGames.get(chatId);
    if (!game) return handleMafiaMenu(chatId, user, user.platform || 'telegram');
    MafiaEngine.toggleVoiceCall(chatId, true);
    return [
      {
        chatId,
        text: `🎙️ **اتاق گفتگوی صوتی گروهی (Voice Chat) مافیا فعال شد!**\n\n` +
          `• وضعیت تماس: **متصل (آنلاین)**\n` +
          `• کیفیت: HD Audio 48kHz\n` +
          `• حاضرین در کال: ${game.players.filter((p) => p.isAlive).length} بازیکن زنده\n\n` +
          `🔊 هم‌اکنون می‌توانید در تب «مدیر بازی مافیا» به صورت زنده ویس بگذارید یا تریبون صوتی را در دست بگیرید!`,
        reply_markup: {
          inline_keyboard: [
            [{ text: '🗣️ شبیه‌سازی مناظره صوتی بازیکنان', callback_data: 'cb_mafia_debate_trigger' }],
            [{ text: '🗳️ رفتن به رای‌گیری', callback_data: 'cb_mafia_start_voting' }],
            [{ text: '📋 جدول صندلی‌ها', callback_data: 'cb_mafia_table' }],
          ],
        },
      },
    ];
  }

  if (data === 'cb_mafia_debate_trigger') {
    const game = activeMafiaGames.get(chatId);
    if (!game) return handleMafiaMenu(chatId, user, user.platform || 'telegram');
    const speeches = MafiaEngine.simulateBotSpeeches(chatId);

    const speechSummary = speeches
      .map((s) => `🎙️ **${s.senderName} [صندلی ${s.senderSeat}]:**\n${s.text}`)
      .join('\n\n');

    return [
      {
        chatId,
        text: `🗣️ **مناظره داغ و چت زنده بازیکنان:**\n\n${speechSummary || 'بازیکنان در حال سکوت هستند.'}`,
        reply_markup: {
          inline_keyboard: [
            [{ text: '🗣️ ادامه بحث و تارگت‌های دیگر', callback_data: 'cb_mafia_debate_trigger' }],
            [{ text: '🗳️ ورود به رای‌گیری خروج', callback_data: 'cb_mafia_start_voting' }],
            [{ text: '📋 جدول وضعیت بازی', callback_data: 'cb_mafia_table' }],
          ],
        },
      },
    ];
  }

  if (data === 'cb_mafia_start_voting') {
    const game = activeMafiaGames.get(chatId);
    if (!game) return handleMafiaMenu(chatId, user, user.platform || 'telegram');
    const alivePlayers = game.players.filter((p) => p.isAlive);

    return [
      {
        chatId,
        text: `🗳️ *میز رای‌گیری خروج:*\nروی نام فردی که به او مشکوک هستید کلیک کنید تا به دادگاه برود:`,
        reply_markup: {
          inline_keyboard: [
            ...alivePlayers.map((p) => [
              { text: `🗳️ رای به صندلی ${p.seatNumber}: ${p.name}`, callback_data: `cb_mafia_vote_${p.seatNumber}` },
            ]),
            [{ text: '🔙 انصراف و بازگشت', callback_data: 'cb_mafia_day_start' }],
          ],
        },
      },
    ];
  }

  if (data.startsWith('cb_mafia_vote_')) {
    const seat = parseInt(data.replace('cb_mafia_vote_', ''), 10);
    const game = MafiaEngine.startTrial(chatId, seat);
    const candidate = game.players.find((p) => p.seatNumber === seat);

    return [
      {
        chatId,
        text: `⚖️ **میز محاکمه و دادگاه:**\n\n` +
          `بازیکن صندلی **${candidate?.seatNumber} (${candidate?.name})** با اکثریت آرا به میز اتهام فراخوانده شد!\n\n` +
          `🗣️ **دفاعیه متهم:**\n` +
          `«شهروندان عزیز! من شهروند وفادار این شهرم و به نفع شهر رای داده‌ام. مرا اعدام نکنید!»\n\n` +
          `تصمیم نهایی شما چیست؟`,
        reply_markup: {
          inline_keyboard: [
            [
              { text: `⚰️ تایید اعدام و خروج 👍`, callback_data: 'cb_mafia_verdict_guilty' },
              { text: `🕊️ بخشش و تبرئه 👎`, callback_data: 'cb_mafia_verdict_innocent' },
            ],
          ],
        },
      },
    ];
  }

  if (data === 'cb_mafia_verdict_guilty') {
    const verdict = MafiaEngine.executeTrialVerdict(chatId, true);
    const game = verdict.game;

    if (game.phase === 'game_over') {
      const winnerName = game.winner === 'citizens' ? '🎉 شهروندان پیروز شدند!' : '🎩 تیم مافیا پیروز شد!';
      return [
        {
          chatId,
          text: `${verdict.message}\n\n` +
            `🏆 **پایان بازی! ${winnerName}**\n\n` +
            `نقش تمامی بازیکنان:\n` +
            game.players.map((p) => `صندلی [${p.seatNumber}]: ${p.name} - ${MAFIA_ROLES_CATALOG[p.role].emoji} ${MAFIA_ROLES_CATALOG[p.role].name}`).join('\n'),
          reply_markup: {
            inline_keyboard: [
              [{ text: '🔄 بازی مجدد ۹ نفره', callback_data: 'cb_mafia_start_9' }],
              [{ text: '🔄 بازی مجدد ۱۲ نفره', callback_data: 'cb_mafia_start_12' }],
              [{ text: '🔙 منوی اصلی', callback_data: 'cb_main_menu' }],
            ],
          },
        },
      ];
    }

    return [
      {
        chatId,
        text: `${verdict.message}\n\n🌑 شهر دوباره به خواب می‌رود...`,
        reply_markup: {
          inline_keyboard: [
            [{ text: '🌙 شروع شب بعدی', callback_data: 'cb_mafia_act_night' }],
            [{ text: '📋 جدول صندلی‌ها (table.php)', callback_data: 'cb_mafia_table' }],
          ],
        },
      },
    ];
  }

  if (data === 'cb_mafia_verdict_innocent') {
    const verdict = MafiaEngine.executeTrialVerdict(chatId, false);
    return [
      {
        chatId,
        text: `${verdict.message}\n\n🌑 شهر به خواب شبانه فرو رفت...`,
        reply_markup: {
          inline_keyboard: [
            [{ text: '🌙 شروع شب بعدی', callback_data: 'cb_mafia_act_night' }],
            [{ text: '📋 جدول صندلی‌ها (table.php)', callback_data: 'cb_mafia_table' }],
          ],
        },
      },
    ];
  }

  if (data === 'cb_mafia_night_start') {
    return [
      {
        chatId,
        text: `🌑 **شب فرا رسید!**\nشهروندان خوابند و نقش‌های شب برای تصمیم‌گیری بیدار شوند...`,
        reply_markup: {
          inline_keyboard: [
            [{ text: '🌙 انجام اکشن شبانه', callback_data: 'cb_mafia_act_night' }],
            [{ text: '☀️ پایان شب و طلوع روز', callback_data: 'cb_mafia_day_start' }],
          ],
        },
      },
    ];
  }

  // SLOWBET CALLBACKS
  if (data === 'cb_bet_menu') {
    return handleBetMenu(chatId, user);
  }

  if (data === 'cb_bet_rocket_start') {
    const betAmount = 10000;
    if (wallet.balance < betAmount) {
      return [
        {
          chatId,
          text: `❌ موجودی ناکافی است! شما حداقل به ۱۰,۰۰۰ تومان نیاز دارید.\nموجودی شما: ${wallet.balance.toLocaleString('fa-IR')} تومان`,
          reply_markup: {
            inline_keyboard: [[{ text: '➕ دریافت ۵۰,۰۰۰ تومان شارژ هدیه', callback_data: 'cb_wallet_charge' }]],
          },
        },
      ];
    }
    // Deduct bet
    wallet.balance -= betAmount;
    // Set random crash point between 1.20 and 7.50
    const crashPoint = +(1.2 + Math.random() * 5).toFixed(2);
    botStorage.rocketBets.set(user.id, {
      userId: user.id,
      amount: betAmount,
      multiplier: 1.0,
      status: 'flying',
      crashPoint,
    });

    return [
      {
        chatId,
        text: `🚀 *موشک به پرواز درآمد! (Crash Rocket)*\n\n` +
          `💵 مبلغ شرط شما: **${betAmount.toLocaleString('fa-IR')} تومان**\n` +
          `📈 ضریب لحظه‌ای: **1.85x**\n` +
          `💰 سود فعلی شما: **${(betAmount * 1.85).toLocaleString('fa-IR')} تومان**\n\n` +
          `_قبل از انفجار موشک روی دکمه برداشت کلیک کنید تا پول را ببرید!_`,
        reply_markup: {
          inline_keyboard: [
            [{ text: `💰 برداشت آنی در ضریب 1.85x`, callback_data: 'cb_bet_rocket_cashout_185' }],
            [{ text: `⚡ ریسک بیشتر و برداشت در 2.50x`, callback_data: 'cb_bet_rocket_cashout_250' }],
            [{ text: `🔥 صبر برای ضریب نجومی 4.20x`, callback_data: 'cb_bet_rocket_cashout_420' }],
          ],
        },
      },
    ];
  }

  if (data.startsWith('cb_bet_rocket_cashout_')) {
    const multStr = data.replace('cb_bet_rocket_cashout_', '');
    const mult = multStr === '185' ? 1.85 : multStr === '250' ? 2.5 : 4.2;
    const bet = botStorage.rocketBets.get(user.id);
    const amount = bet ? bet.amount : 10000;
    const crashPoint = bet ? bet.crashPoint : 2.6;

    if (mult > crashPoint) {
      // Crashed!
      return [
        {
          chatId,
          text: `💥 *بومم! موشک در ضریب ${crashPoint}x منفجر شد!*\n\n` +
            `متاسفانه دیر برداشت کردید و مبلغ ${amount.toLocaleString('fa-IR')} تومان سوخت.\n` +
            `موجودی فعلی: ${wallet.balance.toLocaleString('fa-IR')} تومان\n\n` +
            `می‌توانید دوباره شانس خود را امتحان کنید:`,
          reply_markup: {
            inline_keyboard: [
              [{ text: '🚀 پرتاب مجدد موشک', callback_data: 'cb_bet_rocket_start' }],
              [{ text: '🔙 بازگشت به بت', callback_data: 'cb_bet_menu' }],
            ],
          },
        },
      ];
    } else {
      // Won!
      const winnings = Math.round(amount * mult);
      wallet.balance += winnings;
      return [
        {
          chatId,
          text: `🎉 *تبریک! برداشت موفقیت‌آمیز در ضریب ${mult}x!*\n\n` +
            `💵 مبلغ شرط: ${amount.toLocaleString('fa-IR')} تومان\n` +
            `🏆 سود دریافتی شما: **${winnings.toLocaleString('fa-IR')} تومان** (+${(winnings - amount).toLocaleString('fa-IR')})\n` +
            `💰 موجودی جدید: **${wallet.balance.toLocaleString('fa-IR')} تومان**`,
          reply_markup: {
            inline_keyboard: [
              [{ text: '🚀 دست بعدی موشک', callback_data: 'cb_bet_rocket_start' }],
              [{ text: '🔙 بازگشت به منوی بت', callback_data: 'cb_bet_menu' }],
            ],
          },
        },
      ];
    }
  }

  if (data === 'cb_bet_dart') {
    const score = Math.floor(Math.random() * 6) + 1; // 1 to 6
    const prize = score >= 5 ? 15000 : score >= 3 ? 5000 : 0;
    wallet.balance += prize;
    return [
      {
        chatId,
        text: `🎯 *پرتاب دارت تلگرام انجام شد!*\n\n` +
          `امتیاز ثبت‌شده: **${score} از ۶**\n` +
          `${prize > 0 ? `🎉 آفرین! برنده **${prize.toLocaleString('fa-IR')} تومان** جایزه شدید.` : 'تیر به مرکز نخورد! دوباره شانس خود را بیازمایید.'}\n\n` +
          `موجودی شما: ${wallet.balance.toLocaleString('fa-IR')} تومان`,
        reply_markup: {
          inline_keyboard: [
            [{ text: '🎯 پرتاب مجدد دارت', callback_data: 'cb_bet_dart' }],
            [{ text: '🔙 بازگشت به کازینو', callback_data: 'cb_bet_menu' }],
          ],
        },
      },
    ];
  }

  if (data === 'cb_bet_dice') {
    const dice = Math.floor(Math.random() * 6) + 1;
    const isEven = dice % 2 === 0;
    const prize = isEven ? 8000 : 0;
    wallet.balance += prize;
    return [
      {
        chatId,
        text: `🎲 *تاس ریخته شد: [ ${dice} ]*\n\n` +
          `عدد تاس: **${dice}** (${isEven ? 'زوج' : 'فرد'})\n` +
          `${isEven ? `🏆 تبریک! تاس جفت/زوج بود و **${prize.toLocaleString('fa-IR')} تومان** برنده شدید!` : 'عدد فرد آمد! در دست بعدی برنده خواهید شد.'}\n\n` +
          `موجودی: ${wallet.balance.toLocaleString('fa-IR')} تومان`,
        reply_markup: {
          inline_keyboard: [
            [{ text: '🎲 پرتاب مجدد تاس', callback_data: 'cb_bet_dice' }],
            [{ text: '🔙 بازگشت', callback_data: 'cb_bet_menu' }],
          ],
        },
      },
    ];
  }

  if (data === 'cb_bet_coin') {
    const coin = Math.random() > 0.5 ? 'شیر 🦁' : 'خط 👑';
    const won = Math.random() > 0.4;
    const prize = won ? 10000 : 0;
    wallet.balance += prize;
    return [
      {
        chatId,
        text: `🪙 *سکه به هوا پرتاب شد!*\n\nنتیجه: **${coin}**\n` +
          `${won ? `🎉 حدس شما درست بود! برنده **${prize.toLocaleString('fa-IR')} تومان** شدید!` : 'حدس اشتباه بود!'}\n\n` +
          `موجودی: ${wallet.balance.toLocaleString('fa-IR')} تومان`,
        reply_markup: {
          inline_keyboard: [
            [{ text: '🪙 پرتاب دوباره سکه', callback_data: 'cb_bet_coin' }],
            [{ text: '🔙 بازگشت', callback_data: 'cb_bet_menu' }],
          ],
        },
      },
    ];
  }

  // CLASH OF CLANS CALLBACKS
  if (data === 'cb_clash_menu') {
    return handleClashMenu(chatId, user);
  }

  if (data === 'cb_clash_collect') {
    const v = botStorage.getClashVillage(user.id, user.first_name);
    const addedGold = Math.floor(Math.random() * 2000) + 1500;
    const addedElixir = Math.floor(Math.random() * 1800) + 1200;
    v.gold = Math.min(v.maxGold, v.gold + addedGold);
    v.elixir = Math.min(v.maxElixir, v.elixir + addedElixir);
    return [
      {
        chatId,
        text: `⛏️ *برداشت موفق از معادن و پمپ‌های اکسیر!*\n\n` +
          `🪙 طلا اضافه شد: +${addedGold.toLocaleString('fa-IR')}\n` +
          `🧪 اکسیر اضافه شد: +${addedElixir.toLocaleString('fa-IR')}\n\n` +
          `انبار طلای شما: ${v.gold.toLocaleString('fa-IR')} / ${v.maxGold.toLocaleString('fa-IR')}\n` +
          `انبار اکسیر شما: ${v.elixir.toLocaleString('fa-IR')} / ${v.maxElixir.toLocaleString('fa-IR')}`,
        reply_markup: {
          inline_keyboard: [
            [{ text: '⚔️ حمله و غارت دهکده حریف', callback_data: 'cb_clash_attack' }],
            [{ text: '🏰 مدیریت دهکده', callback_data: 'cb_clash_menu' }],
          ],
        },
      },
    ];
  }

  if (data === 'cb_clash_attack') {
    const v = botStorage.getClashVillage(user.id, user.first_name);
    const lootedGold = Math.floor(Math.random() * 4000) + 2500;
    const lootedElixir = Math.floor(Math.random() * 3500) + 2000;
    const cupsWon = Math.floor(Math.random() * 20) + 12;
    v.gold = Math.min(v.maxGold, v.gold + lootedGold);
    v.elixir = Math.min(v.maxElixir, v.elixir + lootedElixir);
    v.cups += cupsWon;

    return [
      {
        chatId,
        text: `⚔️ *گزارش نبرد پیروزمندانه (3 ستاره ⭐⭐⭐)*\n\n` +
          `🎯 هدف: دهکده قبیله گرگ‌های سرخ\n` +
          `💥 درصد تخریب: ۱۰۰٪ تخریب کامل!\n\n` +
          `📦 **غنیمت‌های غارت‌شده:**\n` +
          `• 🪙 طلا: +${lootedGold.toLocaleString('fa-IR')}\n` +
          `• 🧪 اکسیر: +${lootedElixir.toLocaleString('fa-IR')}\n` +
          `• 🏆 کاپ قهرمانی: +${cupsWon} کاپ (مجموع: ${v.cups})\n\n` +
          `سربازان پیروزمندانه به اردوگاه بازگشتند!`,
        reply_markup: {
          inline_keyboard: [
            [{ text: '⚔️ حمله به دهکده بعدی', callback_data: 'cb_clash_attack' }],
            [{ text: '🏰 بازگشت به دهکده من', callback_data: 'cb_clash_menu' }],
          ],
        },
      },
    ];
  }

  if (data === 'cb_clash_upgrade') {
    const v = botStorage.getClashVillage(user.id, user.first_name);
    const cost = 5000 * v.townHall;
    if (v.gold < cost) {
      return [
        {
          chatId,
          text: `❌ طلای ناکافی! برای ارتقای تاون‌هال به لول ${v.townHall + 1} نیاز به **${cost.toLocaleString('fa-IR')} طلا** دارید.\nطلای شما: ${v.gold.toLocaleString('fa-IR')}`,
          reply_markup: {
            inline_keyboard: [
              [{ text: '⛏️ جمع‌آوری طلا', callback_data: 'cb_clash_collect' }],
              [{ text: '🔙 بازگشت', callback_data: 'cb_clash_menu' }],
            ],
          },
        },
      ];
    }
    v.gold -= cost;
    v.townHall += 1;
    v.maxGold += 10000;
    v.maxElixir += 8000;
    return [
      {
        chatId,
        text: `🎉 *تبریک! تاون‌هال دهکده به لول ${v.townHall} ارتقا یافت!*\n\n` +
          `ظرفیت انبارها افزایش یافت و ساختمان‌های دفاعی تقویت شدند.`,
        reply_markup: {
          inline_keyboard: [[{ text: '🏰 مشاهده دهکده', callback_data: 'cb_clash_menu' }]],
        },
      },
    ];
  }

  if (data === 'cb_clash_train') {
    const v = botStorage.getClashVillage(user.id, user.first_name);
    v.troops.barbarian += 10;
    v.troops.archer += 10;
    v.troops.giant += 2;
    return [
      {
        chatId,
        text: `🪖 *نیروها با موفقیت آموزش دیدند!*\n\n` +
          `+۱۰ بربر شجاع\n` +
          `+۱۰ کماندار تیزبین\n` +
          `+۲ غول سنگین‌وزن\n\n` +
          `اردوگاه شما آماده حمله بعدی است.`,
        reply_markup: {
          inline_keyboard: [
            [{ text: '⚔️ حمله اکنون', callback_data: 'cb_clash_attack' }],
            [{ text: '🏰 بازگشت به دهکده', callback_data: 'cb_clash_menu' }],
          ],
        },
      },
    ];
  }

  // SLOWFINDER CALLBACKS
  if (data === 'cb_finder_menu') {
    return handleFinderMenu(chatId, user);
  }

  if (data === 'cb_finder_random') {
    const finder = botStorage.getFinderSession(user.id);
    finder.state = 'chatting';
    // Match with simulated friendly partner
    finder.partnerId = 999999;
    botStorage.userStates.set(user.id, { step: 'finder_chatting' });

    return [
      {
        chatId,
        text: `🟢 *هم‌صحبت پیدا شد!*\n\n` +
          `شما به یک هم‌صحبت آنلاین متصل شدید.\n` +
          `می‌توانید پیام، ویس، ایموجی یا عکس ارسال کنید. طرف مقابل هویت شما را نمی‌بیند.\n\n` +
          `_برای قطع مکالمه دکمه زیر را لمس کنید:_`,
        reply_markup: {
          inline_keyboard: [
            [{ text: '❌ پایان چت', callback_data: 'cb_finder_stop' }, { text: '🔄 هم‌صحبت بعدی', callback_data: 'cb_finder_next' }],
          ],
        },
      },
      {
        chatId,
        text: `💬 *پیام هم‌صحبت:*\n« سلام! چطوری؟ اهل کجایی؟ 😊 »`,
        reply_markup: {
          inline_keyboard: [
            [{ text: '❌ پایان مکالمه', callback_data: 'cb_finder_stop' }],
          ],
        },
      },
    ];
  }

  if (data === 'cb_finder_stop') {
    const finder = botStorage.getFinderSession(user.id);
    finder.state = 'idle';
    finder.partnerId = undefined;
    botStorage.userStates.delete(user.id);
    return [
      {
        chatId,
        text: `🔴 چت با موفقیت به پایان رسید.\nآیا مایلید با فرد دیگری گفتگو کنید؟`,
        reply_markup: {
          inline_keyboard: [
            [{ text: '⚡ اتصال به نفر جدید', callback_data: 'cb_finder_random' }],
            [{ text: '🔙 بازگشت به منوی همدم‌یاب', callback_data: 'cb_finder_menu' }],
          ],
        },
      },
    ];
  }

  if (data === 'cb_finder_next') {
    return handleTelegramCallbackQuery({ ...query, data: 'cb_finder_random' });
  }

  // SLOWSEEN CALLBACKS
  if (data === 'cb_seen_menu') {
    return handleSeenMenu(chatId, user);
  }

  if (data === 'cb_seen_free_test' || data === 'cb_seen_pkg_100') {
    const orderId = 'ORD-' + Math.floor(100000 + Math.random() * 900000);
    botStorage.seenOrders.push({
      id: orderId,
      userId: user.id,
      postLink: 'https://t.me/slowseen_test/1',
      viewsRequested: 100,
      viewsDelivered: 100,
      status: 'completed',
      createdAt: new Date().toLocaleTimeString('fa-IR'),
      cost: 0,
    });

    return [
      {
        chatId,
        text: `✅ *سفارش ۱۰۰ بازدید هدیه رایگان ثبت شد!*\n\n` +
          `کد رهگیری: \`${orderId}\`\n` +
          `تعداد درخواستی: ۱۰۰ سین\n` +
          `وضعیت: 🟢 تکمیل شد (ارسال فوری)\n` +
          `هزینه: رایگان هدیه روبات\n\n` +
          `_پست شما در شبکه سرورهای SlowSeen افزایش بازدید گرفت._`,
        reply_markup: {
          inline_keyboard: [
            [{ text: '➕ سفارش پکیج بزرگتر', callback_data: 'cb_seen_menu' }],
            [{ text: '🔙 بازگشت به منو', callback_data: 'cb_main_menu' }],
          ],
        },
      },
    ];
  }

  // TOOLS CALLBACKS
  if (data === 'cb_tools_menu') {
    return handleToolsMenu(chatId, user);
  }

  if (data === 'cb_tool_card') {
    botStorage.userStates.set(user.id, { step: 'awaiting_card_number' });
    return [
      {
        chatId,
        text: `💳 *استعلام کارت بانکی و مشخصات شتاب*\n\n` +
          `لطفاً **شماره ۱۶ رقمی کارت بانکی** را به صورت متن ارسال کنید:\n\n` +
          `نمونه: \`6037991823456789\` (ملی)\n` +
          `نمونه: \`6104337891234567\` (ملت)\n` +
          `نمونه: \`6219861012345678\` (سامان)`,
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔙 بازگشت به جعبه ابزار', callback_data: 'cb_tools_menu' }],
          ],
        },
      },
    ];
  }

  if (data === 'cb_test_card_melli') {
    return await handleTelegramIncomingMessage(user, chatId, '6037991845621098');
  }

  if (data === 'cb_test_card_mellat') {
    return await handleTelegramIncomingMessage(user, chatId, '6104337920194831');
  }

  if (data === 'cb_tool_currency') {
    const liveCurr = await fetchRealCurrencyRates();
    return [
      {
        chatId,
        text: `💵 *نرخ لحظه‌ای ارز، طلا و رمزارزها (PUBLIC/Currencyprices/index.php)*\n\n` +
          `🇺🇸 **دلار آمریکا (آزاد):** ${liveCurr.rates.usd_toman.toLocaleString('fa-IR')} تومان\n` +
          `🪙 **تتر (USDT):** ${liveCurr.rates.usdt_toman.toLocaleString('fa-IR')} تومان\n` +
          `🇪🇺 **یورو اروپا:** ${liveCurr.rates.eur_toman.toLocaleString('fa-IR')} تومان\n` +
          `🇬🇧 **پوند انگلیس:** ${liveCurr.rates.gbp_toman.toLocaleString('fa-IR')} تومان\n` +
          `🇦🇪 **درهم امارات:** ${liveCurr.rates.aed_toman.toLocaleString('fa-IR')} تومان\n\n` +
          `🥇 **سکه امامی طرح جدید:** ${liveCurr.rates.coin_emami_toman.toLocaleString('fa-IR')} تومان\n` +
          `✨ **طلای ۱۸ عیار (هر گرم):** ${liveCurr.rates.gold_18k_toman.toLocaleString('fa-IR')} تومان\n\n` +
          `₿ **بیت‌کوین (BTC):** $${liveCurr.rates.btc_usd.toLocaleString('en-US')}\n` +
          `🔷 **اتریوم (ETH):** $${liveCurr.rates.eth_usd.toLocaleString('en-US')}\n\n` +
          `📡 **منبع وب‌سرویس:** ${liveCurr.source}\n` +
          `🕒 **زمان استعلام زنده:** ${liveCurr.updatedAt}`,
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔄 بروزرسانی زنده قیمت‌ها', callback_data: 'cb_tool_currency' }],
            [{ text: '🔙 جعبه ابزار', callback_data: 'cb_tools_menu' }],
          ],
        },
      },
    ];
  }

  if (data === 'cb_tool_corona') {
    const corona = await fetchRealCoronaStats();
    return [
      {
        chatId,
        text: `🦠 *آمار لحظه‌ای کووید و سلامت (PUBLIC/API/corona.php)*\n\n` +
          `🇮🇷 **کشور:** ${corona.country} ${corona.flag}\n` +
          `👥 **کل مبتلایان ثبت‌شده:** ${corona.cases.toLocaleString('fa-IR')} نفر\n` +
          `🟢 **کل بهبودیافتگان:** ${corona.recovered.toLocaleString('fa-IR')} نفر\n` +
          `🔴 **مبتلایان شبانه‌روز اخیر:** +${corona.todayCases.toLocaleString('fa-IR')} نفر\n` +
          `🧪 **تعداد کل آزمایش‌های تشخیصی:** ${corona.tests.toLocaleString('fa-IR')}\n` +
          `🕒 **زمان بروزرسانی از disease.sh:** ${corona.updated}`,
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔄 استعلام مجدد آمار', callback_data: 'cb_tool_corona' }],
            [{ text: '🔙 جعبه ابزار', callback_data: 'cb_tools_menu' }],
          ],
        },
      },
    ];
  }

  if (data === 'cb_tool_ocr') {
    botStorage.userStates.set(user.id, { step: 'awaiting_ocr_text' });
    return [
      {
        chatId,
        text: `🔍 *سیستم تشخیص متن تصویر (PUBLIC/API/ocr.php)*\n\n` +
          `یک متن نمونه یا عکس ارسال کنید تا موتور OCR متن درون آن را استخراج کند.`,
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔙 جعبه ابزار', callback_data: 'cb_tools_menu' }],
          ],
        },
      },
    ];
  }

  if (data === 'cb_test_ocr_sample') {
    return [
      {
        chatId,
        text: `🔍 *نتیجه تشخیص OCR (PUBLIC/API/ocr.php):*\n\n` +
          `« جمهوری اسلامی ایران - سازمان سنجش آموزش کشور - کارت ورود به جلسه »\n\n` +
          `زبان شناسایی شده: فارسی (فونت نازنین)\n` +
          `دقت موتور پردازش تصویر: ۹۹.۴٪`,
        reply_markup: {
          inline_keyboard: [[{ text: '🔙 جعبه ابزار', callback_data: 'cb_tools_menu' }]],
        },
      },
    ];
  }

  if (data === 'cb_tool_insta') {
    botStorage.userStates.set(user.id, { step: 'awaiting_insta_link' });
    return [
      {
        chatId,
        text: `📥 *دانلودر اینستاگرام (PUBLIC/API/instagram.php)*\nلینک پست یا ریلز اینستاگرام را بفرستید:\nمثال: \`https://www.instagram.com/p/C-example\``,
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔙 جعبه ابزار', callback_data: 'cb_tools_menu' }],
          ],
        },
      },
    ];
  }

  if (data === 'cb_test_insta_sample') {
    return [
      {
        chatId,
        text: `📥 *پست با موفقیت توسط API دریافت شد!*\n\n` +
          `👤 پیج: @nationalgeographic\n` +
          `📹 کیفیت ویدیو: 1080p MP4 Full HD\n` +
          `💾 حجم: 8.4 مگابایت`,
        reply_markup: {
          inline_keyboard: [
            [{ text: '📥 دانلود مستقیم ویدیو', url: 'https://telegram.org' }],
            [{ text: '🔙 جعبه ابزار', callback_data: 'cb_tools_menu' }],
          ],
        },
      },
    ];
  }

  if (data === 'cb_tool_tempmail') {
    const realMail = await generateRealTempMail();
    botStorage.userStates.set(user.id, { step: 'tempmail_active', data: realMail });
    return [
      {
        chatId,
        text: `✉️ *ایمیل فیک موقت واقعی شما ساخته شد! (PUBLIC/API/email.php)*\n\n` +
          `📧 **آدرس ایمیل زنده:** \`${realMail.email}\`\n\n` +
          `🌐 **سرویس‌دهنده:** وب‌سرویس مستقیم 1SecMail\n` +
          `📥 هر کدی یا پیامی به این آدرس بفرستید در اینباکس زیر تحویل می‌گیرید:\n` +
          `برای چک کردن صندوق دکمه زیر را لمس کنید:`,
        reply_markup: {
          inline_keyboard: [
            [{ text: '📥 چک کردن صندوق ورودی (Inbox)', callback_data: 'cb_tool_tempmail_check' }],
            [{ text: '🔄 تولید ایمیل دیگر', callback_data: 'cb_tool_tempmail' }],
            [{ text: '🔙 جعبه ابزار', callback_data: 'cb_tools_menu' }],
          ],
        },
      },
    ];
  }

  if (data === 'cb_tool_tempmail_check') {
    const state = botStorage.userStates.get(user.id);
    const mail = state?.data || { login: 'user123', domain: '1secmail.com' };
    const msgs = await checkRealTempMailInbox(mail.login, mail.domain);
    const msgsList = msgs.length > 0
      ? msgs.map((m: any, idx: number) => `📩 **پیام ${idx + 1}:**\nاز: \`${m.from}\`\nموضوع: ${m.subject}\nمتن: ${m.body || m.textBody || 'مشاهده متن پیام'}\n`).join('\n---\n')
      : 'صندوق ورودی در حال حاضر خالی است. به محض ارسال ایمیل به این آدرس، اینجا نمایش داده می‌شود.';

    return [
      {
        chatId,
        text: `📥 *صندوق ورودی ایمیل شما (${mail.login}@${mail.domain}):*\n\n${msgsList}`,
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔄 رفرش مجدد صندوق', callback_data: 'cb_tool_tempmail_check' }],
            [{ text: '🔙 جعبه ابزار', callback_data: 'cb_tools_menu' }],
          ],
        },
      },
    ];
  }

  if (data === 'cb_tool_proxy') {
    const proxies = getRealMTProtoProxies();
    return [
      {
        chatId,
        text: `🛡️ *پروکسی‌های فعال MTProto تلگرام (PUBLIC/API/proxy.php)*\n\n` +
          proxies.map((p, idx) =>
            `🔹 **پروکسی ${idx + 1} (${p.country}):**\n` +
            `• سرور: \`${p.server}\` (پورت: ${p.port})\n` +
            `• پینگ: ${p.ping} میلی‌ثانیه\n` +
            `• لینک مستقیم: [اتصال سریع](${p.link})\n`
          ).join('\n') +
          `_پروکسی‌های ضدفیلتر با پینگ پایین تلگرام_`,
        reply_markup: {
          inline_keyboard: [
            ...proxies.map((p, idx) => [
              { text: `⚡ اتصال به پروکسی ${idx + 1} (${p.flag} ${p.ping}ms)`, url: p.link },
            ]),
            [{ text: '🔙 جعبه ابزار', callback_data: 'cb_tools_menu' }],
          ],
        },
      },
    ];
  }

  if (data === 'cb_tool_vaksms') {
    const catalog = getRealVakSmsCatalog();
    return [
      {
        chatId,
        text: `📱 *استعلام موجودی شماره مجازی VAK-SMS (PUBLIC/vak-sms.php)*\n\n` +
          catalog.map((c) =>
            `🌐 **${c.countryNameFa} (${c.countryCode}):**\n` +
            `• تلگرام: ${c.services.telegram.available} شماره موجود (قیمت: ${c.services.telegram.priceRub} روبل)\n` +
            `• واتساپ: ${c.services.whatsapp.available} شماره موجود (قیمت: ${c.services.whatsapp.priceRub} روبل)\n`
          ).join('\n') +
          `_اتصال زنده به API سرویس‌دهنده vak-sms.com_`,
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔙 جعبه ابزار', callback_data: 'cb_tools_menu' }],
          ],
        },
      },
    ];
  }

  // UPLOADER CALLBACKS
  if (data === 'cb_uploader_sample' || data === 'cb_uploader_my_files') {
    const fileId = 'FL-' + Math.floor(100000 + Math.random() * 900000);
    return [
      {
        chatId,
        text: `📥 *فایل با موفقیت در سرور فایل‌باکس آپلود شد!*\n\n` +
          `نام فایل: \`MODASR_FULL_PROJECT_CURRENT.zip\`\n` +
          `حجم: 24.5 MB\n` +
          `کد یکتا: \`${fileId}\`\n\n` +
          `🔗 **لینک دانلود مستقیم پرسرعت و نیم‌بها:**\n` +
          `https://ais-dev-dxc4tymnudmayrh26p7cqa-76299078893.us-east1.run.app/MODASR_FULL_PROJECT_CURRENT.zip`,
        uploadProgress: {
          fileName: 'MODASR_FULL_PROJECT_CURRENT.zip',
          fileSizeMb: 24.5,
          speedMbps: 18.6,
          generatedLink: 'https://ais-dev-dxc4tymnudmayrh26p7cqa-76299078893.us-east1.run.app/MODASR_FULL_PROJECT_CURRENT.zip',
          directUrl: 'https://ais-dev-dxc4tymnudmayrh26p7cqa-76299078893.us-east1.run.app/MODASR_FULL_PROJECT_CURRENT.zip',
          expiresInDays: 7,
        },
        reply_markup: {
          inline_keyboard: [
            [{ text: '📥 دانلود مستقیم فایل', url: 'https://ais-dev-dxc4tymnudmayrh26p7cqa-76299078893.us-east1.run.app/MODASR_FULL_PROJECT_CURRENT.zip' }],
            [{ text: '🔙 بازگشت به آپلودر', callback_data: 'cb_uploader_menu' }],
          ],
        },
      },
    ];
  }

  // LOTTERY CALLBACKS
  if (data === 'cb_lottery_spin') {
    const prizes = [
      '⭐️ ۱ ماه اشتراک تلگرام پرمیوم!',
      '💰 ۵۰,۰۰۰ تومان شارژ کیف پول ربات!',
      '🪙 ۲,۰۰۰ سکه بازی موشک و کلش!',
      '👁️ ۵۰۰ سین رایگان پست تلگرام!',
      '📱 شماره مجازی فعال گردید!',
    ];
    const prize = prizes[Math.floor(Math.random() * prizes.length)];
    if (prize.includes('تومان')) {
      wallet.balance += 50000;
    } else if (prize.includes('سکه')) {
      wallet.coins += 2000;
    }

    return [
      {
        chatId,
        text: `🎡 *گردونه شانس چرخید و متوقف شد...*\n\n` +
          `🎉 **جایزه برنده شده شما:**\n` +
          `« ${prize} »\n\n` +
          `جایزه شما با موفقیت به حسابتان اعمال گردید! فردا نیز مجدداً یک شانس رایگان خواهید داشت.`,
        reply_markup: {
          inline_keyboard: [
            [{ text: '💳 مشاهده کیف پول', callback_data: 'cb_wallet_info' }],
            [{ text: '🔙 بازگشت به منو', callback_data: 'cb_main_menu' }],
          ],
        },
      },
    ];
  }

  // LIKE CALLBACKS
  if (data.startsWith('cb_like_add_')) {
    const count = data.replace('cb_like_add_', '');
    return [
      {
        chatId,
        text: `👍 *سفارش افزایش ${count} لایک مسابقه ثبت شد!*\n\n` +
          `واکنش‌های ارسال‌شده: ❤️ 👍 🔥 🎉\n` +
          `وضعیت: 🟢 در حال ارسال با سرعت طبیعی به پست مسابقه\n` +
          `کد سفارش: LIK-${Math.floor(10000 + Math.random() * 90000)}`,
        reply_markup: {
          inline_keyboard: [[{ text: '🔙 بازگشت', callback_data: 'cb_like_menu' }]],
        },
      },
    ];
  }

  // WALLET CALLBACKS
  if (data === 'cb_wallet_info') {
    return handleWalletMenu(chatId, user);
  }

  if (data === 'cb_wallet_charge') {
    wallet.balance += 50000;
    wallet.coins += 1000;
    return [
      {
        chatId,
        text: `✅ **شارژ هدیه با موفقیت افزوده شد!**\n\n` +
          `+ ۵۰,۰۰۰ تومان به موجودی نقدی\n` +
          `+ ۱,۰۰۰ سکه بازی کازینو و کلش\n\n` +
          `موجودی کل شما: **${wallet.balance.toLocaleString('fa-IR')} تومان**`,
        reply_markup: {
          inline_keyboard: [
            [{ text: '🚀 رفتن به بازی بت و انفجار', callback_data: 'cb_bet_menu' }],
            [{ text: '👁️ سفارش سین و بازدید', callback_data: 'cb_seen_menu' }],
            [{ text: '🔙 بازگشت به منو', callback_data: 'cb_main_menu' }],
          ],
        },
      },
    ];
  }

  // Fallback
  return [
    {
      chatId,
      text: `عملیات ثبت شد.`,
      reply_markup: MAIN_INLINE_KEYBOARD,
    },
  ];
}
