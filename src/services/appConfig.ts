/// <reference types="node" />
/**
 * Centralized Application Configuration & Feature Registry (SlowMegaBot)
 * Single source of truth for runtime settings, environment variables,
 * module metadata, and database table configurations.
 */

export interface ModuleMetadata {
  id: string;
  name: string;
  nameFa: string;
  category: 'media' | 'gaming' | 'tools' | 'financial' | 'system';
  categoryFa: string;
  icon: string;
  command: string;
  description: string;
  enabled: boolean;
  requiresVip: boolean;
}

export interface AppConfigState {
  version: string;
  appName: string;
  serverPort: number;
  serverHost: string;
  protocol: 'http' | 'https';
  domain: string;
  environment: 'development' | 'production' | 'test';
  databaseType: 'mysql' | 'sqlite' | 'memory';
  databaseTablesCount: number;
  telegram: {
    botToken?: string;
    botUsername?: string;
    pollingIntervalMs: number;
    requestTimeoutMs: number;
    maxMediaSizeBytes: number;
  };
  n8n: {
    enabled: boolean;
    webhookUrl?: string;
    autoTriggerOnMessage: boolean;
    maxRetries: number;
  };
  owner: {
    cardNumber: string;
    cardHolder: string;
    bankName: string;
    gatewayName: string;
    gatewayActive: boolean;
    gatewayMerchantId: string;
  };
  security: {
    corsOrigin: string;
    rateLimitRequestsPerMinute: number;
    maskSensitiveData: boolean;
  };
}

export const APP_MODULES_CATALOG: ModuleMetadata[] = [
  // 1. Media Category
  {
    id: 'universal_dl',
    name: 'Universal Mega Downloader',
    nameFa: 'دانلودر همه‌کاره و جامع',
    category: 'media',
    categoryFa: 'رسانه و دانلودرها',
    icon: 'DownloadCloud',
    command: '/download',
    description: 'دانلود انواع ویدیو، صوت و استوری از اینستاگرام، یوتیوب، تیک‌تاک، پینترست و اسپاتیفای بدون واترمرک',
    enabled: true,
    requiresVip: false,
  },
  {
    id: 'youtube_dl',
    name: 'YouTube Downloader',
    nameFa: 'دانلودر پیشرفته یوتیوب',
    category: 'media',
    categoryFa: 'رسانه و دانلودرها',
    icon: 'Video',
    command: '/yt',
    description: 'دانلود کیفیت‌های 1080p, 720p, 480p و استخراج صوت با فرمت MP3 320k',
    enabled: true,
    requiresVip: false,
  },
  {
    id: 'tiktok_dl',
    name: 'TikTok No-Watermark',
    nameFa: 'دانلودر تیک‌تاک بدون واترمرک',
    category: 'media',
    categoryFa: 'رسانه و دانلودرها',
    icon: 'Sparkles',
    command: '/tiktok',
    description: 'دانلود کلیپ‌های وایرال تیک‌تاک همراه با تصویر کاور و فایل صوتی مجزا',
    enabled: true,
    requiresVip: false,
  },
  {
    id: 'music_search',
    name: 'Music Archive (Melobot Style)',
    nameFa: 'جستجو و پخش آنلاین موزیک',
    category: 'media',
    categoryFa: 'رسانه و دانلودرها',
    icon: 'Music',
    command: '/music',
    description: 'آرشیو میلیونی آهنگ‌های ایرانی و خارجی، پخش آنلاین و متن ترانه (Lyrics)',
    enabled: true,
    requiresVip: false,
  },
  {
    id: 'aplo_uploader',
    name: 'Aplo Direct Uploader',
    nameFa: 'آپلودر پیشرفته فایل (Aplo)',
    category: 'media',
    categoryFa: 'رسانه و دانلودرها',
    icon: 'UploadCloud',
    command: '/aplo',
    description: 'صدور لینک نیم‌بها، رمزگذاری، لینک منقضی‌شونده و کیوآرکد اختصاصی',
    enabled: true,
    requiresVip: false,
  },

  // 2. Gaming Category
  {
    id: 'mafia_game',
    name: 'Mafia Online Multiplayer',
    nameFa: 'بازی مافیا آنلاین (۹ و ۱۲ نفره)',
    category: 'gaming',
    categoryFa: 'گیم و سرگرمی',
    icon: 'ShieldAlert',
    command: '/mafia',
    description: 'سناریوهای شب و روز، گادپدر، دکتر، کارآگاه، اسنایپر و ویس‌کال WebRTC با ربات‌های هوشمند',
    enabled: true,
    requiresVip: false,
  },
  {
    id: 'bet_rocket',
    name: 'Crash Rocket & Dice',
    nameFa: 'موشک انفجار، تاس و دارت',
    category: 'gaming',
    categoryFa: 'گیم و سرگرمی',
    icon: 'Rocket',
    command: '/bet',
    description: 'بازی انفجار با ضریب متغیر، کش‌اوت خودکار و افزایش موجودی کاربر',
    enabled: true,
    requiresVip: false,
  },
  {
    id: 'clash_clans',
    name: 'Clash of Clans Village',
    nameFa: 'کلش آف کلنز (دهکده و غارت)',
    category: 'gaming',
    categoryFa: 'گیم و سرگرمی',
    icon: 'Swords',
    command: '/clash',
    description: 'ارتقای تاون‌هال، مخازن طلا و اکسیر، تربیت سربازان و غارت دهکده حریف',
    enabled: true,
    requiresVip: false,
  },
  {
    id: 'finder_chat',
    name: 'Anonymous Chat & Finder',
    nameFa: 'چت ناشناس و همدم‌یاب',
    category: 'gaming',
    categoryFa: 'گیم و سرگرمی',
    icon: 'Search',
    command: '/finder',
    description: 'اتصال تصادفی دو کاربر، فیلتر استانی و جنسیتی و قطع ارتباط امن',
    enabled: true,
    requiresVip: false,
  },
  {
    id: 'lottery_wheel',
    name: 'Daily Lucky Wheel',
    nameFa: 'گردونه شانس و لاتاری',
    category: 'gaming',
    categoryFa: 'گیم و سرگرمی',
    icon: 'Gift',
    command: '/lottery',
    description: 'چرخش روزانه گردونه شانس، جوایز نقدی، سکه و اکانت‌های مجازی',
    enabled: true,
    requiresVip: false,
  },
  {
    id: 'like_challenge',
    name: 'Like & Reaction Booster',
    nameFa: 'افزایش لایک و چالش تلگرام',
    category: 'gaming',
    categoryFa: 'گیم و سرگرمی',
    icon: 'Heart',
    command: '/like',
    description: 'افزایش واکنش‌ها و لایک‌های پست‌های مسابقه‌ای تلگرام',
    enabled: true,
    requiresVip: false,
  },

  // 3. Tools Category
  {
    id: 'web_proxy',
    name: 'Anti-Filter Web Proxy',
    nameFa: 'فیلترشکن و وب‌پروکسی مستقیم',
    category: 'tools',
    categoryFa: 'ابزارها و خدمات دیجیتال',
    icon: 'Globe',
    command: '/proxy',
    description: 'دور زدن فیلترینگ و تحریم‌های وب‌سایت‌های خارجی با کش و پیش‌نمایش مستقیم',
    enabled: true,
    requiresVip: false,
  },
  {
    id: 'vak_sms',
    name: 'Virtual Number Store',
    nameFa: 'فروشگاه شماره مجازی ۷ کشور',
    category: 'tools',
    categoryFa: 'ابزارها و خدمات دیجیتال',
    icon: 'Smartphone',
    command: '/vaksms',
    description: 'خرید شماره‌های روسیه، انگلیس، آمریکا، قزاقستان و مالزی با دریافت تضمینی کد پیامک',
    enabled: true,
    requiresVip: false,
  },
  {
    id: 'card_inquiry',
    name: 'Shetab Bank Card BIN & IBAN',
    nameFa: 'استعلام زنده کارت بانکی و شبا',
    category: 'tools',
    categoryFa: 'ابزارها و خدمات دیجیتال',
    icon: 'CreditCard',
    command: '/tools',
    description: 'تشخیص بانک صادرکننده، اعتبارسنجی الگوریتم Luhn، محاسبه شبا و نام صاحب حساب',
    enabled: true,
    requiresVip: false,
  },
  {
    id: 'currency_arzy',
    name: 'Live Currency & Crypto Rates',
    nameFa: 'نرخ لحظه‌ای ارز، طلا و تتر',
    category: 'tools',
    categoryFa: 'ابزارها و خدمات دیجیتال',
    icon: 'Coins',
    command: '/arzy',
    description: 'جدول قیمت دلار، یورو، درهم، طلای ۱۸ عیار، سکه امامی، بیت‌کوین و تتر با مبدل تومانی',
    enabled: true,
    requiresVip: false,
  },
  {
    id: 'temp_mail',
    name: 'Disposable Temp Email',
    nameFa: 'ایمیل موقت و یک‌بار مصرف',
    category: 'tools',
    categoryFa: 'ابزارها و خدمات دیجیتال',
    icon: 'FileText',
    command: '/tempmail',
    description: 'ساخت ایمیل ۱۰ دقیقه‌ای با بررسی زنده صندوق ورودی (Inbox) جهت ثبت‌نام در سایت‌ها',
    enabled: true,
    requiresVip: false,
  },
  {
    id: 'mtproto_proxy',
    name: 'Telegram MTProto Proxies',
    nameFa: 'پروکسی‌های پرسرعت MTProto',
    category: 'tools',
    categoryFa: 'ابزارها و خدمات دیجیتال',
    icon: 'Zap',
    command: '/mtproto',
    description: 'لیست پینگ لحظه‌ای پروکسی‌های ضد فیلتر اختصاصی تلگرام همراه با دکمه اتصال مستقیم',
    enabled: true,
    requiresVip: false,
  },

  // 4. Financial & Orders
  {
    id: 'seen_orders',
    name: 'Telegram Seen & Views Delivery',
    nameFa: 'افزایش بازدید و سین پست',
    category: 'financial',
    categoryFa: 'حسابداری و سفارشات',
    icon: 'Eye',
    command: '/seen',
    description: 'ثبت سفارش و اعمال فوری بازدیدهای کانال با اتصال به کیف‌پول',
    enabled: true,
    requiresVip: false,
  },
  {
    id: 'user_wallet',
    name: 'User Wallet & Subscriptions',
    nameFa: 'کیف‌پول، پوینت و اشتراک VIP',
    category: 'financial',
    categoryFa: 'حسابداری و سفارشات',
    icon: 'Wallet',
    command: '/wallet',
    description: 'مدیریت شارژ کیف‌پول تومانی، سکه‌های بازی و اشتراک‌های Free, Premium, VIP',
    enabled: true,
    requiresVip: false,
  },
];

class AppConfigService {
  private config: AppConfigState;

  constructor() {
    this.config = {
      version: '2.5.0-pro',
      appName: 'SlowMegaBot Comprehensive Platform',
      serverPort: Number(process.env.PORT) || 3000,
      serverHost: '0.0.0.0',
      protocol: (process.env.APP_PROTOCOL as any) || 'http',
      domain: process.env.APP_DOMAIN || 'localhost:3000',
      environment: (process.env.NODE_ENV as any) || 'development',
      databaseType: 'mysql',
      databaseTablesCount: 7,
      telegram: {
        botToken: process.env.TELEGRAM_BOT_TOKEN || '',
        botUsername: process.env.TELEGRAM_BOT_USERNAME || 'slow_megabot',
        pollingIntervalMs: 1500,
        requestTimeoutMs: 15000,
        maxMediaSizeBytes: 50 * 1024 * 1024, // 50MB
      },
      n8n: {
        enabled: true,
        webhookUrl: process.env.N8N_WEBHOOK_URL || '',
        autoTriggerOnMessage: true,
        maxRetries: 3,
      },
      owner: {
        cardNumber: '6037991823456789',
        cardHolder: 'علی محمدی (مدیر و مالک ربات)',
        bankName: 'بانک ملی ایران',
        gatewayName: 'درگاه آنلاین زرین‌پال / کارت‌به‌کارت مستقیم',
        gatewayActive: true,
        gatewayMerchantId: 'zarinpal_merchant_live_9988',
      },
      security: {
        corsOrigin: '*',
        rateLimitRequestsPerMinute: 120,
        maskSensitiveData: true,
      },
    };
  }

  public getConfig(): Readonly<AppConfigState> {
    return this.config;
  }

  public updateOwnerConfig(ownerUpdates: Partial<AppConfigState['owner']>): void {
    this.config.owner = {
      ...this.config.owner,
      ...ownerUpdates,
    };
  }

  public updateTelegramConfig(tgUpdates: Partial<AppConfigState['telegram']>): void {
    this.config.telegram = {
      ...this.config.telegram,
      ...tgUpdates,
    };
  }

  public updateN8nConfig(n8nUpdates: Partial<AppConfigState['n8n']>): void {
    this.config.n8n = {
      ...this.config.n8n,
      ...n8nUpdates,
    };
  }

  public getModulesCatalog(): ModuleMetadata[] {
    return APP_MODULES_CATALOG;
  }

  public getModuleById(id: string): ModuleMetadata | undefined {
    return APP_MODULES_CATALOG.find((m) => m.id === id);
  }

  public getModulesByCategory(category: ModuleMetadata['category']): ModuleMetadata[] {
    return APP_MODULES_CATALOG.filter((m) => m.category === category);
  }
}

export const appConfig = new AppConfigService();
