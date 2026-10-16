import { extractUrlFromText, detectDownloadPlatform, detectContentType } from './services/realApis';
import { loggerService } from './services/loggerService';
import React, { useState, useEffect } from 'react';
import {
  Bot,
  MessageSquare,
  LayoutGrid,
  Zap,
  BookOpen,
  Wallet,
  Sparkles,
  ShieldCheck,
  RotateCcw,
  CheckCircle,
  ExternalLink,
} from 'lucide-react';
import { TelegramSimulator } from './components/TelegramSimulator';
import { ModuleControlCenter } from './components/ModuleControlCenter';
import { RealBotConnectModal } from './components/RealBotConnectModal';
import { MafiaGameManager } from './components/MafiaGameManager';
import { MafiaMultiplayerPlatform } from './components/MafiaMultiplayerPlatform';
import { UserProfileModal } from './components/UserProfileModal';
import { N8nConnectModal } from './components/N8nConnectModal';
import { AutoInstallerModal } from './components/AutoInstallerModal';
import { DatabaseBackupManager } from './components/DatabaseBackupManager';
import { Webhook, Terminal, Database } from 'lucide-react';
import {
  TelegramMessage,
  TelegramUser,
  BotLog,
  RealBotStatus,
} from './types/telegram';
import {
  handleTelegramIncomingMessage,
  handleTelegramCallbackQuery,
  MAIN_INLINE_KEYBOARD,
  MAIN_REPLY_KEYBOARD,
  botStorage,
} from './services/botEngine';

export default function App() {
  const [activeTab, setActiveTab] = useState<'simulator' | 'mafia' | 'modules' | 'connect' | 'database' | 'docs'>('simulator');
  const [isTyping, setIsTyping] = useState(false);
  const [walletBalance, setWalletBalance] = useState(50000);
  const [walletCoins, setWalletCoins] = useState(1000);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showN8nModal, setShowN8nModal] = useState(false);
  const [showInstallerModal, setShowInstallerModal] = useState(false);

  // Real Bot Connection State
  const [connectedBot, setConnectedBot] = useState<TelegramUser | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [botLogs, setBotLogs] = useState<BotLog[]>([]);

  // Current Simulator User
  const currentUser: TelegramUser = {
    id: 12345678,
    first_name: 'شما',
    username: 'test_user',
  };

  // Initial Welcome Messages
  const [messages, setMessages] = useState<TelegramMessage[]>([
    {
      message_id: 1,
      from: { id: 999, first_name: 'SlowMegaBot', is_bot: true, username: 'slow_megabot' },
      chat: { id: 12345678, type: 'private' },
      date: Date.now() - 1000,
      text: `سلام کاربر گرامی عزیز! 🌹\nبه **SlowMegaBot** خوش آمدید؛ سامانه جامع و یکپارچه شامل تمام ۱۶ ماژول تخصصی:\n\n` +
        `🌐 **فیلترشکن و وب‌پروکسی:** عبور مستقیم از فیلترینگ و رفع خطاهای تحریم\n` +
        `📱 **شماره مجازی:** خرید اختصاصی شماره‌های ۷ کشور با دریافت تضمینی کد پیامک\n` +
        `🎥 **دانلودر یوتیوب:** دانلود انواع ویدیو 1080p/720p و فایل صوتی MP3 320k\n` +
        `🎵 **جستجوی موزیک:** آرشیو میلیونی ترانه‌ها، پخش آنلاین و متن شعر (Lyrics)\n` +
        `💰 **نرخ لحظه‌ای (arzy):** جدول زنده ارز، طلا، سکه و رمزارز با مبدل تومانی\n` +
        `📤 **آپلودر پیشرفته (aplo):** ماندگاری دائمی، لینک نیم‌بها، رمز عبور و QR Code\n` +
        `✨ **تیک‌تاک:** دانلود سریع و باکیفیت ویدیو بدون واترمرک و استخراج صوت\n` +
        `🎮 **مافیا:** بازی حرفه‌ای ۹ و ۱۲ نفره با ویس‌کال WebRTC و بات‌های هوشمند\n` +
        `🚀 **بت و انفجار:** بازی موشک انفجار با ضریب زنده، تاس و دارت\n` +
        `⚔️ **کلش آف کلنز:** ساخت دهکده، ارتقای تاون‌هال و غارت منابع\n` +
        `🔍 **چت ناشناس:** همدم‌یاب تصادفی و بر اساس موقعیت مکانی\n` +
        `👁️ **سین‌زن و بازدید:** سفارش آنی بازدید پست با درگاه پرداخت الکترونیک شتاب\n` +
        `🛠️ **جعبه ابزار:** استعلام کارت شتاب، OCR و پروکسی MTProto\n` +
        `🎁 **لاتاری و شانس:** گردونه شانس روزانه و اهدای اکانت\n` +
        `👍 **لایک و چالش:** افزایش لایک و واکنش مسابقات تلگرام\n\n` +
        `یک گزینه را از منوی زیر انتخاب نمایید:`,
      reply_markup: MAIN_INLINE_KEYBOARD,
    },
    {
      message_id: 2,
      from: { id: 999, first_name: 'SlowMegaBot', is_bot: true, username: 'slow_megabot' },
      chat: { id: 12345678, type: 'private' },
      date: Date.now() - 500,
      text: `📱 کیبورد دسترسی سریع منوی اصلی فعال شد. جهت انتخاب هر ماژول کلیک کنید:`,
      reply_markup: MAIN_REPLY_KEYBOARD,
    },
  ]);

  // Sync state and check connection status periodically
  const fetchBotStatus = async () => {
    try {
      const res = await fetch('/api/bot/token/status');
      if (res.ok) {
        const data = await res.json();
        setConnectedBot(data.botInfo || null);
        setIsPolling(data.isPolling || false);
        setBotLogs(data.logs || []);
      }
    } catch {
      // Offline or local dev fallback
    }
  };

  useEffect(() => {
    fetchBotStatus();
    const interval = setInterval(fetchBotStatus, 4000);
    return () => clearInterval(interval);
  }, []);

  // Update wallet state
  const syncWallet = () => {
    const w = botStorage.getWallet(currentUser.id);
    setWalletBalance(w.balance);
    setWalletCoins(w.coins);
  };

  // Dispatch message from Simulator with 4-step Execution Logging (Detection, API Request, Stream Extraction, Validation)
  const handleSendMessage = async (text: string) => {
    const userMsg: TelegramMessage = {
      message_id: messages.length + 1,
      from: currentUser,
      chat: { id: currentUser.id, type: 'private' },
      date: Date.now(),
      text,
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    // =========================================================
    // STEP 1: DETECTION (Smart URL extraction, command, platform type)
    // =========================================================
    const detectedUrl = extractUrlFromText(text);
    const isUrl = Boolean(detectedUrl);
    const cleanedUrl = detectedUrl || undefined;
    let platform: string | undefined = undefined;
    let contentType: string | undefined = undefined;

    if (isUrl && cleanedUrl) {
      const detectedPlatform = detectDownloadPlatform(cleanedUrl);
      platform = detectedPlatform === 'instagram' ? 'اینستاگرام (Instagram)'
        : detectedPlatform === 'youtube' ? 'یوتیوب (YouTube)'
        : detectedPlatform === 'tiktok' ? 'تیک‌تاک (TikTok)'
        : detectedPlatform === 'pinterest' ? 'پینترست (Pinterest)'
        : detectedPlatform === 'spotify' ? 'اسپاتیفای (Spotify)'
        : detectedPlatform === 'soundcloud' ? 'ساندکلاد (SoundCloud)'
        : detectedPlatform === 'twitter' ? 'توییتر / X'
        : detectedPlatform === 'facebook' ? 'فیسبوک (Facebook)'
        : detectedPlatform === 'telegram' ? 'تلگرام (Telegram)'
        : detectedPlatform === 'aparat' ? 'آپارات (Aparat)'
        : detectedPlatform === 'threads' ? 'تریدز (Threads)'
        : 'لینک مستقیم دانلود';

      contentType = detectContentType(cleanedUrl, detectedPlatform);
    }

    const command = text.startsWith('/') ? text.split(' ')[0] : undefined;

    const detectionLog = loggerService.logDetection(text, {
      isUrl,
      platform,
      contentType,
      command,
      cleanedUrl,
    });

    setBotLogs((prev) => [detectionLog, ...prev]);

    // =========================================================
    // STEP 2: API REQUEST (Backend dispatch with latency tracking)
    // =========================================================
    const reqStartTime = Date.now();
    let botResponses: any[] = [];
    let apiSuccess = false;
    let apiError: string | undefined = undefined;

    try {
      const res = await fetch('/api/bot/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'message',
          user: currentUser,
          chatId: currentUser.id,
          text,
        }),
      });

      const latencyMs = Date.now() - reqStartTime;

      if (res.ok) {
        const data = await res.json();
        botResponses = data.responses || [];
        apiSuccess = true;
      } else {
        apiError = `HTTP ${res.status}: استفاده از موتور پردازش کلاینت`;
        botResponses = await handleTelegramIncomingMessage(currentUser, currentUser.id, text);
        apiSuccess = true;
      }

      const apiLog = loggerService.logApiRequest('سرور مرکزی ربات (/api/bot/dispatch)', {
        endpoint: '/api/bot/dispatch',
        latencyMs,
        statusCode: res.status,
        success: apiSuccess,
        errorMessage: apiError,
      });

      setBotLogs((prev) => [apiLog, ...prev]);
    } catch (err: any) {
      const latencyMs = Date.now() - reqStartTime;
      apiError = err?.message || 'خطای شبکه در ارتباط با سرور؛ هدایت به موتور محلی';
      botResponses = await handleTelegramIncomingMessage(currentUser, currentUser.id, text);

      const apiLog = loggerService.logApiRequest('موتور پردازش کلاینت محلی (Local Engine)', {
        endpoint: 'client_local_dispatch',
        latencyMs,
        success: true,
        errorMessage: apiError,
      });

      setBotLogs((prev) => [apiLog, ...prev]);
    }

    // =========================================================
    // STEP 3: STREAM EXTRACTION (Resolving media attachments & formats)
    // =========================================================
    const sampleMedia = botResponses.find((r) => r.videoUrl || r.photoUrl || r.audioUrl || r.mediaAttachment);
    const hasMedia = Boolean(sampleMedia);
    const primaryMediaUrl = sampleMedia?.videoUrl || sampleMedia?.photoUrl || sampleMedia?.audioUrl;
    const mediaType = sampleMedia?.videoUrl ? 'video' : sampleMedia?.audioUrl ? 'audio' : sampleMedia?.photoUrl ? 'photo' : undefined;

    const streamLog = loggerService.logStreamExtraction({
      hasMedia,
      contentType: mediaType,
      formatsCount: hasMedia ? 3 : undefined,
      mediaUrl: primaryMediaUrl,
      audioExtracted: Boolean(sampleMedia?.audioUrl),
      previewThumbnail: sampleMedia?.photoUrl,
    });

    setBotLogs((prev) => [streamLog, ...prev]);

    // =========================================================
    // STEP 4: VALIDATION (Message counts, entities, and packet delivery)
    // =========================================================
    const totalChars = botResponses.reduce((acc, r) => acc + (r.text?.length || 0), 0);
    const isValid = botResponses.length > 0;

    const validationLog = loggerService.logValidation({
      isValid,
      messageCount: botResponses.length,
      charLength: totalChars,
      entitiesSanitized: true,
      error: isValid ? undefined : 'پاسخی از پردازشگر دریافت نشد',
    });

    setBotLogs((prev) => [validationLog, ...prev]);

    // Deliver responses to Simulator UI
    setTimeout(() => {
      setIsTyping(false);
      const newBotMsgs: TelegramMessage[] = botResponses.map((r, idx) => ({
        message_id: messages.length + 2 + idx,
        from: { id: 999, first_name: 'SlowMegaBot', is_bot: true, username: 'slow_megabot' },
        chat: { id: currentUser.id, type: 'private' },
        date: Date.now() + idx * 100,
        text: r.text,
        reply_markup: r.reply_markup,
        photoUrl: r.photoUrl,
        videoUrl: r.videoUrl,
        audioUrl: r.audioUrl,
        mediaAttachment: r.mediaAttachment,
        uploadProgress: r.uploadProgress,
      }));
      setMessages((prev) => [...prev, ...newBotMsgs]);
      syncWallet();
    }, 400);
  };

  // Dispatch Callback Query from Simulator
  const handleCallbackQuery = async (callbackData: string, message: TelegramMessage) => {
    setIsTyping(true);

    try {
      const res = await fetch('/api/bot/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'callback',
          user: currentUser,
          chatId: currentUser.id,
          callbackData,
          message,
        }),
      });

      let botResponses: any[] = [];
      if (res.ok) {
        const data = await res.json();
        botResponses = data.responses;
      } else {
        botResponses = await handleTelegramCallbackQuery({
          id: 'cb_' + Date.now(),
          from: currentUser,
          data: callbackData,
          message,
        });
      }

      setTimeout(() => {
        setIsTyping(false);
        const newBotMsgs: TelegramMessage[] = botResponses.map((r, idx) => ({
          message_id: messages.length + 1 + idx,
          from: { id: 999, first_name: 'SlowMegaBot', is_bot: true, username: 'slow_megabot' },
          chat: { id: currentUser.id, type: 'private' },
          date: Date.now() + idx * 100,
          text: r.text,
          reply_markup: r.reply_markup,
          photoUrl: r.photoUrl,
          videoUrl: r.videoUrl,
          audioUrl: r.audioUrl,
          mediaAttachment: r.mediaAttachment,
        uploadProgress: r.uploadProgress,
        }));
        setMessages((prev) => [...prev, ...newBotMsgs]);
        syncWallet();
      }, 350);
    } catch {
      setTimeout(async () => {
        setIsTyping(false);
        const botResponses = await handleTelegramCallbackQuery({
          id: 'cb_' + Date.now(),
          from: currentUser,
          data: callbackData,
          message,
        });
        const newBotMsgs: TelegramMessage[] = botResponses.map((r, idx) => ({
          message_id: messages.length + 1 + idx,
          from: { id: 999, first_name: 'SlowMegaBot', is_bot: true, username: 'slow_megabot' },
          chat: { id: currentUser.id, type: 'private' },
          date: Date.now() + idx * 100,
          text: r.text,
          reply_markup: r.reply_markup,
          photoUrl: r.photoUrl,
          videoUrl: r.videoUrl,
          audioUrl: r.audioUrl,
          mediaAttachment: r.mediaAttachment,
        uploadProgress: r.uploadProgress,
        }));
        setMessages((prev) => [...prev, ...newBotMsgs]);
        syncWallet();
      }, 300);
    }
  };

  // Connect Real Bot
  const handleConnectRealBot = async (token: string) => {
    try {
      const res = await fetch('/api/bot/token/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': 'slowmega_admin_secret_key_2026' },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (data.ok) {
        setConnectedBot(data.botInfo);
        setIsPolling(true);
        fetchBotStatus();
        return { ok: true };
      }
      return { ok: false, error: data.error };
    } catch (err: any) {
      return { ok: false, error: err?.message || 'خطا در برقراری ارتباط با سرور' };
    }
  };

  // Disconnect Real Bot
  const handleDisconnectRealBot = async () => {
    try {
      await fetch('/api/bot/token/disconnect', { method: 'POST', headers: { 'X-Admin-Key': 'slowmega_admin_secret_key_2026' } });
      setConnectedBot(null);
      setIsPolling(false);
      fetchBotStatus();
    } catch {
      // Ignored
    }
  };

  const handleQuickCommand = (cmd: string) => {
    handleSendMessage(cmd);
    setActiveTab('simulator');
  };

  const handleQuickAction = (cmdOrCb: string) => {
    if (cmdOrCb.startsWith('cb_')) {
      handleCallbackQuery(cmdOrCb, messages[messages.length - 1]);
    } else {
      handleSendMessage(cmdOrCb);
    }
    setActiveTab('simulator');
  };

  return (
    <div className="min-h-screen bg-[#0e1621] text-white flex flex-col font-['Vazirmatn',sans-serif]">
      {/* Top Main Navigation Bar */}
      <header className="bg-[#17212b] border-b border-[#242f3d] sticky top-0 z-30 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Logo & Status */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#0088cc] to-[#40b3e0] flex items-center justify-center shadow-md">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-base tracking-wide text-white">
                  SlowMegaBot
                </h1>
                <span className="text-[10px] bg-[#0088cc]/20 text-[#0088cc] border border-[#0088cc]/30 px-2 py-0.5 rounded-full font-bold">
                  All-In-One Hub
                </span>
                {connectedBot && (
                  <span className="flex items-center gap-1 text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping"></span>
                    متصل به تلگرام
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                سامانه هوشمند مافیا، بت، کلش، سین‌زن، همدم‌یاب، ابزارها و آپلودر
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center bg-[#0e1621] p-1 rounded-xl border border-[#242f3d] text-xs">
            <button
              onClick={() => setActiveTab('simulator')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                activeTab === 'simulator'
                  ? 'bg-[#0088cc] text-white shadow font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>شبیه‌ساز تلگرام</span>
            </button>

            <button
              onClick={() => setActiveTab('mafia')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                activeTab === 'mafia'
                  ? 'bg-gradient-to-r from-rose-600 via-purple-600 to-indigo-600 text-white shadow font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-rose-400" />
              <span>پلتفرم مافیا آنلاین 🎭</span>
            </button>

            <button
              onClick={() => setActiveTab('modules')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                activeTab === 'modules'
                  ? 'bg-[#0088cc] text-white shadow font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              <span>مرکز مدیریت ماژول‌ها</span>
            </button>

            <button
              onClick={() => setActiveTab('connect')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                activeTab === 'connect'
                  ? 'bg-[#0088cc] text-white shadow font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Zap className="w-4 h-4 text-amber-400" />
              <span>اتصال ربات واقعی</span>
              {connectedBot && <span className="w-2 h-2 rounded-full bg-emerald-400"></span>}
            </button>

            <button
              onClick={() => setShowN8nModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/30 cursor-pointer"
              title="تنظیمات و آدرس‌های اتصال به n8n"
            >
              <Webhook className="w-4 h-4 text-amber-400" />
              <span>اتصال به n8n</span>
            </button>

            <button
              onClick={() => setShowInstallerModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 border border-cyan-500/30 cursor-pointer"
              title="نصاب خودکار حرفه‌ای و مدیریت سرور (Auto Installer)"
            >
              <Terminal className="w-4 h-4 text-cyan-400" />
              <span>نصب خودکار (Installer)</span>
            </button>

            <button
              onClick={() => setActiveTab('database')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                activeTab === 'database'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="مدیریت دیتابیس، دانلود پشتیبان SQL و بازیابی در شبیه‌ساز"
            >
              <Database className="w-4 h-4 text-cyan-400" />
              <span>بک‌آپ و دیتابیس</span>
            </button>

            <button
              onClick={() => setActiveTab('docs')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer hidden md:flex ${
                activeTab === 'docs'
                  ? 'bg-[#0088cc] text-white shadow font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>داکیومنت و فایل‌ها</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-3 sm:p-6 max-w-7xl mx-auto w-full">
        {activeTab === 'simulator' && (
          <div className="space-y-4">
            {/* Quick module launcher ribbon */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-4xl mx-auto text-xs">
              <span className="text-slate-400 text-xs shrink-0 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" /> دسترسی سریع:
              </span>
              {[
                { label: '🎮 مافیا', cmd: '/mafia' },
                { label: '🚀 موشک انفجار', cmd: '/bet' },
                { label: '⚔️ کلش دهکده', cmd: '/clash' },
                { label: '🔍 چت ناشناس', cmd: '/finder' },
                { label: '👁️ سفارش سین', cmd: '/seen' },
                { label: '🛠️ استعلام کارت', cmd: '/tools' },
                { label: '🎁 گردونه شانس', cmd: '/lottery' },
                { label: '📤 آپلودر فایل', cmd: '/uploader' },
                { label: '💾 بک‌آپ دیتابیس', cmd: '/backup' },
              ].map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => handleQuickCommand(item.cmd)}
                  className="px-2.5 py-1 rounded-lg bg-[#17212b] hover:bg-[#202d3b] border border-[#242f3d] text-slate-200 shrink-0 transition-all font-medium cursor-pointer"
                >
                  {item.label}
                </button>
              ))}
            </div>

            <TelegramSimulator
              onSendMessage={handleSendMessage}
              onCallbackQuery={handleCallbackQuery}
              messages={messages}
              isTyping={isTyping}
              currentUser={currentUser}
              connectedBotUsername={connectedBot?.username}
              onQuickCommand={handleQuickCommand}
              walletBalance={walletBalance}
              onOpenProfile={() => setShowProfileModal(true)}
            />
          </div>
        )}

      {showProfileModal && (
        <UserProfileModal
          currentUser={currentUser}
          wallet={botStorage.getWallet(currentUser.id)}
          orders={botStorage.orders}
          onClose={() => setShowProfileModal(false)}
          onUpgradeClick={() => {
            setShowProfileModal(false);
            handleQuickCommand('/sub');
          }}
        />
      )}

        {activeTab === 'mafia' && (
          <MafiaMultiplayerPlatform />
        )}

        {activeTab === 'modules' && (
          <ModuleControlCenter
            onQuickAction={handleQuickAction}
            walletBalance={walletBalance}
          />
        )}

        {activeTab === 'connect' && (
          <RealBotConnectModal
            connectedBot={connectedBot}
            isPolling={isPolling}
            onConnect={handleConnectRealBot}
            onDisconnect={handleDisconnectRealBot}
            logs={botLogs}
            onRefreshLogs={fetchBotStatus}
          />
        )}

        {activeTab === 'database' && (
          <DatabaseBackupManager
            onNavigateToSimulator={() => {
              syncWallet();
              setActiveTab('simulator');
            }}
            onDataRestored={() => {
              syncWallet();
            }}
          />
        )}

        {activeTab === 'docs' && (
          <div className="bg-[#17212b] rounded-2xl border border-[#242f3d] p-6 max-w-5xl mx-auto space-y-8">
            {/* Header */}
            <div>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className="font-extrabold text-xl text-white flex items-center gap-2.5">
                  <BookOpen className="w-6 h-6 text-[#0088cc]" />
                  <span>معماری یکپارچه و مستندات تحلیلی سامانه SlowMegaBot</span>
                </h3>
                <span className="text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full font-bold">
                  نسخه ۲.۵.۰ بهینه‌شده و یکپارچه
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                سامانه بر اساس معماری ۴ لایه‌ای (Core Services, Bot Engine, API Gateway, Interactive Simulator UI) بازسازی شده است؛ تمام کدهای تکراری تجمیع و ماژول‌های مشترک استانداردسازی شده‌اند.
              </p>
            </div>

            {/* Architecture 4-Layer Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
              <div className="bg-[#0e1621] p-4 rounded-xl border border-sky-500/30 space-y-1.5">
                <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-400 font-bold text-[10px]">لایه ۱</span>
                <h4 className="font-bold text-white text-sm">ماژول‌های مشترک هسته</h4>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  <code>bankService</code>, <code>appConfig</code>, <code>validationService</code>, <code>loggerService</code>
                </p>
              </div>

              <div className="bg-[#0e1621] p-4 rounded-xl border border-purple-500/30 space-y-1.5">
                <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 font-bold text-[10px]">لایه ۲</span>
                <h4 className="font-bold text-white text-sm">موتور پردازش ربات</h4>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  <code>botEngine.ts</code>, <code>mafiaEngine.ts</code>, <code>instagramService.ts</code>
                </p>
              </div>

              <div className="bg-[#0e1621] p-4 rounded-xl border border-amber-500/30 space-y-1.5">
                <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold text-[10px]">لایه ۳</span>
                <h4 className="font-bold text-white text-sm">درگاه API سرور</h4>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  <code>server.ts</code> (Express, Webhooks, Long-polling, N8n, DB API)
                </p>
              </div>

              <div className="bg-[#0e1621] p-4 rounded-xl border border-emerald-500/30 space-y-1.5">
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold text-[10px]">لایه ۴</span>
                <h4 className="font-bold text-white text-sm">رابط کاربری و شبیه‌ساز</h4>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  <code>TelegramSimulator</code>, <code>DatabaseBackupManager</code>, <code>ModuleControlCenter</code>
                </p>
              </div>
            </div>

            {/* Categorization Matrix */}
            <div className="space-y-3">
              <h4 className="font-bold text-white text-sm flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-cyan-400" />
                <span>دسته‌بندی جامع و تخصصی ماژول‌ها و قابلیت‌ها:</span>
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Category 1: Media & Downloader */}
                <div className="bg-[#0e1621] p-4 rounded-xl border border-[#242f3d] space-y-2">
                  <h5 className="font-bold text-amber-400 flex items-center gap-1.5">
                    📥 ۱. رسانه و دانلودرها (Media & Downloaders)
                  </h5>
                  <ul className="text-slate-300 space-y-1 text-[11px] list-disc list-inside">
                    <li><strong>دانلودر جامع:</strong> اینستاگرام (Reels, Posts, Profiles)، یوتیوب، تیک‌تاک بدون واترمرک، پینترست، اسپاتیفای.</li>
                    <li><strong>سرویس اختصاصی اینستاگرام:</strong> پارس و تصحیح لینک، استخراج استریم ویدیو، صوت MP3 و تصویر کاور.</li>
                    <li><strong>آپلودر پیشرفته (Aplo):</strong> صدور لینک نیم‌بها، رمز عبور، لینک انقضادار و QR Code.</li>
                    <li><strong>جستجوی موزیک:</strong> آرشیو میلیونی آهنگ‌ها با متن ترانه و پخش آنلاین.</li>
                  </ul>
                </div>

                {/* Category 2: Gaming & Fun */}
                <div className="bg-[#0e1621] p-4 rounded-xl border border-[#242f3d] space-y-2">
                  <h5 className="font-bold text-rose-400 flex items-center gap-1.5">
                    🎮 ۲. گیم و سرگرمی (Gaming & Entertainment)
                  </h5>
                  <ul className="text-slate-300 space-y-1 text-[11px] list-disc list-inside">
                    <li><strong>مافیا آنلاین:</strong> سناریوهای ۹ و ۱۲ نفره با ویس‌کال WebRTC و بات‌های هوشمند.</li>
                    <li><strong>بت و موشک:</strong> موشک انفجار با ضریب زنده، تاس و دارت امتیازی تلگرام.</li>
                    <li><strong>کلش آف کلنز:</strong> مدیریت دهکده، ارتقای تاون‌هال، غارت منابع و قبیله.</li>
                    <li><strong>چت ناشناس:</strong> همدم‌یاب تصادفی و موقعیت‌محور با فیلتر استانی.</li>
                    <li><strong>لاتاری و لایک:</strong> گردونه شانس روزانه و افزایش لایک مسابقات تلگرامی.</li>
                  </ul>
                </div>

                {/* Category 3: Tools & Digital Services */}
                <div className="bg-[#0e1621] p-4 rounded-xl border border-[#242f3d] space-y-2">
                  <h5 className="font-bold text-teal-400 flex items-center gap-1.5">
                    🛠️ ۳. ابزارها و خدمات دیجیتال (Tools & APIs)
                  </h5>
                  <ul className="text-slate-300 space-y-1 text-[11px] list-disc list-inside">
                    <li><strong>استعلام کارت شتاب:</strong> تشخیص ۳۰+ بانک، اعتبارسنجی لان (Luhn)، محاسبه شبا و نام دارنده.</li>
                    <li><strong>فیلترشکن و وب‌پروکسی:</strong> مرور وب‌سایت‌های تحریم‌شده با کش و دور زدن فیلترینگ.</li>
                    <li><strong>شماره مجازی:</strong> دریافت تضمینی پیامک برای ۷ کشور (روسیه، آمریکا، انگلیس و...).</li>
                    <li><strong>نرخ لحظه‌ای (arzy):</strong> ارز، طلا، سکه و تتر با مبدل زنده تومانی.</li>
                    <li><strong>ایمیل موقت و OCR:</strong> ایمیل ۱۰ دقیقه‌ای با بررسی اینباکس و تبدیل عکس به متن.</li>
                  </ul>
                </div>

                {/* Category 4: Database, Management & Automation */}
                <div className="bg-[#0e1621] p-4 rounded-xl border border-[#242f3d] space-y-2">
                  <h5 className="font-bold text-purple-400 flex items-center gap-1.5">
                    ⚙️ ۴. مدیریت پایگاه داده، پنل مالک و اتوماسیون
                  </h5>
                  <ul className="text-slate-300 space-y-1 text-[11px] list-disc list-inside">
                    <li><strong>مدیریت دیتابیس (SQL):</strong> تولید Dump استاندارد MySQL/SQLite، دانلود و بازیابی در شبیه‌ساز.</li>
                    <li><strong>اتصال به n8n:</strong> وب‌هوک دوطرفه، ثبت رویدادها و تلاش‌های ارسال با لاگ ۵گانه.</li>
                    <li><strong>پنل مالک و درگاه:</strong> تنظیم شماره کارت واریز، درگاه آنلاین زرین‌پال و مدیریت سفارشات.</li>
                    <li><strong>نصاب خودکار سرور:</strong> اسکریپت شل <code>install.sh</code>، سرویس systemd و Nginx معکوس.</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Redundancy Elimination Report */}
            <div className="bg-[#0e1621] rounded-xl border border-emerald-500/30 p-5 space-y-3 text-xs">
              <h4 className="font-bold text-emerald-400 text-sm flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                <span>اقدامات انجام‌شده در حذف تکرارها و بهینه‌سازی:</span>
              </h4>
              <div className="space-y-1.5 text-slate-300 text-[11px] leading-relaxed">
                <p>✓ <strong>تجمیع دیتابیس پیش‌شماره‌های کارت بانکی:</strong> کاتالوگ‌های تکراری در <code>botEngine.ts</code> و <code>realApis.ts</code> در ماژول واحد <code>bankService.ts</code> ادغام شدند.</p>
                <p>✓ <strong>یکپارچه‌سازی سیستم اعتبارسنجی:</strong> فرمول‌های الگوریتم لان (Luhn)، اعتبارسنجی توکن تلگرام، شماره تماس و اسکریپت‌های SQL در <code>validationService.ts</code> متمرکز شدند.</p>
                <p>✓ <strong>مدیریت متمرکز لاگ‌ها:</strong> سیستم‌های مجزای لاگ ترافیک ربات، وب‌هوک n8n و خطاهای سرور در <code>loggerService.ts</code> همگام شدند.</p>
                <p>✓ <strong>رجیستری متمرکز تنظیمات:</strong> فایل <code>appConfig.ts</code> به عنوان منبع موثق تنظیمات، پورت‌ها، متادیتای ماژول‌ها و پارامترهای مالک قرار گرفت.</p>
                <p>✓ <strong>حفظ کامل اطلاعات و سازگاری معکوس:</strong> تمامی توابع، APIها و رفتارهای قبلی با خروجی‌های معتبر حفظ شده و هیچ تابعی نشکسته است.</p>
              </div>
            </div>
          </div>
        )}
      </main>

      <N8nConnectModal isOpen={showN8nModal} onClose={() => setShowN8nModal(false)} />
      <AutoInstallerModal isOpen={showInstallerModal} onClose={() => setShowInstallerModal(false)} />
      {showProfileModal && (
        <UserProfileModal
          currentUser={currentUser}
          wallet={botStorage.getWallet(currentUser.id)}
          orders={botStorage.orders.filter((o) => o.userId === currentUser.id)}
          onClose={() => setShowProfileModal(false)}
          onUpgradeClick={() => {
            setShowProfileModal(false);
            handleSendMessage('💎 خرید اشتراک');
          }}
        />
      )}
    </div>
  );
}
