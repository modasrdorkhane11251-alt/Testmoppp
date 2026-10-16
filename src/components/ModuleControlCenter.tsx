/// <reference types="node" />
import { DownloaderDiagnosticsModal } from './DownloaderDiagnosticsModal';
import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldAlert,
  Rocket,
  Swords,
  Search,
  Eye,
  Wrench,
  UploadCloud,
  Gift,
  Heart,
  Wallet,
  Play,
  RotateCw,
  TrendingUp,
  Target,
  Dice5,
  CreditCard,
  DollarSign,
  Copy,
  Check,
  Sparkles,
  Zap,
  Globe,
  Smartphone,
  Video,
  Music,
  Coins,
  Download,
  Volume2,
  PlayCircle,
  PauseCircle,
  QrCode,
  Lock,
  RefreshCw,
  ExternalLink,
  Calculator,
  FileText,
  DownloadCloud,
  Film,
  Share2,
  UserCheck,
  Image as ImageIcon,
  Save,
  EyeOff,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  fetchWebProxyUrl,
  VIRTUAL_NUMBER_COUNTRIES,
  VIRTUAL_NUMBER_SERVICES,
  activeVirtualOrders,
  orderVirtualPhoneNumber,
  fetchYouTubeVideoDetails,
  MUSIC_CATALOG,
  searchMusicDatabase,
  fetchDetailedArzyRates,
  aploStoredFilesList,
  createAploUpload,
  fetchTikTokVideoDetails,
  getRealMTProtoProxies,
  fetchUniversalDownload,
  UNIVERSAL_DOWNLOAD_PRESETS,
  detectDownloadPlatform,
} from '../services/realApis';
import {
  VirtualNumberOrder,
  YouTubeVideoDetails,
  MusicTrack,
  ArzyRateItem,
  AploStoredFile,
  TikTokVideoResult,
  UniversalDownloadItem,
} from '../types/telegram';

interface Props {
  onQuickAction: (commandOrCallback: string) => void;
  walletBalance: number;
}

export const ModuleControlCenter: React.FC<Props> = ({ onQuickAction, walletBalance }) => {
  const [activeTab, setActiveTab] = useState<
    | 'universal_dl'
    | 'mafia'
    | 'bet'
    | 'clash'
    | 'finder'
    | 'seen'
    | 'tools'
    | 'uploader'
    | 'lottery'
    | 'like'
    | 'proxy'
    | 'vaksms'
    | 'youtube'
    | 'music'
    | 'arzy'
    | 'aplo'
    | 'tiktok'
    | 'env_manager'
  >('universal_dl');

  // ENV MANAGER STATE
  const [envVars, setEnvVars] = useState<Array<{ key: string; value: string }>>([]);
  const [envLoading, setEnvLoading] = useState(false);
  const [envSaving, setEnvSaving] = useState(false);
  const [envSearch, setEnvSearch] = useState('');
  const [showValues, setShowValues] = useState<Record<string, boolean>>({});
  const [envMessage, setEnvMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (activeTab === 'env_manager') {
      fetchEnvVars();
    }
  }, [activeTab]);

  const fetchEnvVars = async () => {
    setEnvLoading(true);
    try {
      const res = await fetch('/api/admin/env');
      const data = await res.json();
      if (data.ok) {
        setEnvVars(data.variables || []);
      }
    } catch (err) {
      console.error('Error fetching env vars:', err);
    } finally {
      setEnvLoading(false);
    }
  };

  const handleSaveEnv = async () => {
    setEnvSaving(true);
    setEnvMessage(null);
    try {
      const res = await fetch('/api/admin/env', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variables: envVars }),
      });
      const data = await res.json();
      if (data.ok) {
        setEnvMessage({ text: 'متغیرهای محیطی با موفقیت ذخیره شدند و روی سرور اعمال شدند!', type: 'success' });
      } else {
        setEnvMessage({ text: data.error || 'خطا در ذخیره متغیرها', type: 'error' });
      }
    } catch (err: any) {
      setEnvMessage({ text: err?.message || 'خطای شبکه', type: 'error' });
    } finally {
      setEnvSaving(false);
    }
  };

  // 1. WEB PROXY STATE (سورس فیلتر شکن سایت.zip)
  const [proxyUrl, setProxyUrl] = useState('https://wikipedia.org');
  const [proxyLoading, setProxyLoading] = useState(false);
  const [proxyResult, setProxyResult] = useState<any>(null);

  // 2. VIRTUAL NUMBER STORE STATE (سورس فروشگاه شماره مجازی.zip)
  const [selectedCountry, setSelectedCountry] = useState('ru');
  const [selectedService, setSelectedService] = useState('tg');
  const [virtualOrders, setVirtualOrders] = useState<VirtualNumberOrder[]>(activeVirtualOrders);
  const [isOrderingNum, setIsOrderingNum] = useState(false);

  // 3. YOUTUBE DOWNLOADER STATE (سورس ربات دانلودر Youtube.zip)
  const [ytUrl, setYtUrl] = useState('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  const [ytDetails, setYtDetails] = useState<YouTubeVideoDetails>(() =>
    fetchYouTubeVideoDetails('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
  );
  const [ytLoading, setYtLoading] = useState(false);

  // 4. MUSIC SEARCH STATE (سورس ربات جست و جوی اهنگ.zip / ملوبات)
  const [musicQuery, setMusicQuery] = useState('');
  const [musicList, setMusicList] = useState<MusicTrack[]>(MUSIC_CATALOG);
  const [currentTrack, setCurrentTrack] = useState<MusicTrack | null>(MUSIC_CATALOG[0]);
  const [isPlayingMusic, setIsPlayingMusic] = useState(false);
  const [showLyricsModal, setShowLyricsModal] = useState<string | null>(null);

  // 5. ARZY RATES STATE (arzy.php)
  const [arzyRates, setArzyRates] = useState<ArzyRateItem[]>(() => fetchDetailedArzyRates());
  const [arzyCategory, setArzyCategory] = useState<'all' | 'currency' | 'gold_coin' | 'crypto'>('all');
  const [calcAmount, setCalcAmount] = useState(100);
  const [calcFrom, setCalcFrom] = useState('usd');

  // 6. APLO UPLOADER STATE (aplo.zip)
  const [aploFiles, setAploFiles] = useState<AploStoredFile[]>(aploStoredFilesList);
  const [newFileName, setNewFileName] = useState('slowmegabot_archive_v4.zip');
  const [newFileSizeMb, setNewFileSizeMb] = useState(14.8);
  const [newFileExpiry, setNewFileExpiry] = useState(30);
  const [newFilePassword, setNewFilePassword] = useState('');
  const [qrCodePreview, setQrCodePreview] = useState<string | null>(null);

  // 7. TIKTOK DOWNLOADER STATE (سورس ربات جستجوگر تیک.zip)
  const [tiktokUrl, setTiktokUrl] = useState('https://www.tiktok.com/@creativestar/video/718293');
  const [tiktokLoading, setTiktokLoading] = useState(false);
  const [tiktokDetails, setTiktokDetails] = useState<TikTokVideoResult>(() =>
    fetchTikTokVideoDetails('https://www.tiktok.com/@creativestar/video/718293')
  );

  // 8. UNIVERSAL MEGA DOWNLOADER STATE (اینستاگرام، یوتیوب، تیک‌تاک، پینترست، توییتر، اسپاتیفای، آپارات)
  const [universalUrl, setUniversalUrl] = useState('');
  const [universalItem, setUniversalItem] = useState<UniversalDownloadItem | null>(null);
  const [universalLoading, setUniversalLoading] = useState(false);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('dl_insta_1');
  const [captionCopied, setCaptionCopied] = useState(false);
  const [formatFilter, setFormatFilter] = useState<'all' | 'video' | 'audio' | 'image' | 'file'>('all');
  const [showDiagnosticsModal, setShowDiagnosticsModal] = useState(false);
  const [downloadAuditSession, setDownloadAuditSession] = useState<any>(null);
  const [recentAuditSessions, setRecentAuditSessions] = useState<any[]>([]);
  const [showAuditLogs, setShowAuditLogs] = useState(false);

  // ROCKET CRASH INTERACTIVE STATE
  const [rocketFlying, setRocketFlying] = useState(false);
  const [rocketMultiplier, setRocketMultiplier] = useState(1.0);
  const [rocketCrashed, setRocketCrashed] = useState(false);
  const [rocketWon, setRocketWon] = useState(false);
  const [betAmount, setBetAmount] = useState(10000);
  const [crashHistory, setCrashHistory] = useState<number[]>([1.84, 3.25, 1.12, 5.4, 2.18, 1.05]);

  // LOTTERY WHEEL STATE
  const [isSpinning, setIsSpinning] = useState(false);
  const [wheelDegree, setWheelDegree] = useState(0);
  const [lotteryPrize, setLotteryPrize] = useState<string | null>(null);

  // BANK CARD TESTER STATE
  const [testCardNumber, setTestCardNumber] = useState('6037991823456789');
  const [cardResult, setCardResult] = useState<any>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // LIKE TESTER STATE
  const [likesCount, setLikesCount] = useState(142);
  const [heartsCount, setHeartsCount] = useState(389);
  const [firesCount, setFiresCount] = useState(210);

  // Load live Arzy rates from /api/arzy/detailed
  useEffect(() => {
    fetch('/api/arzy/detailed')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setArzyRates(data);
        }
      })
      .catch(() => {});
  }, []);

  // Rocket loop
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (rocketFlying && !rocketCrashed && !rocketWon) {
      timer = setInterval(() => {
        setRocketMultiplier((prev) => {
          const next = +(prev + 0.05).toFixed(2);
          // Random chance of crash
          if (next > 3.2 && Math.random() < 0.08) {
            setRocketCrashed(true);
            setRocketFlying(false);
            setCrashHistory((h) => [next, ...h.slice(0, 6)]);
            return next;
          }
          return next;
        });
      }, 100);
    }
    return () => clearInterval(timer);
  }, [rocketFlying, rocketCrashed, rocketWon]);

  const handleStartRocket = () => {
    setRocketFlying(true);
    setRocketCrashed(false);
    setRocketWon(false);
    setRocketMultiplier(1.0);
  };

  const handleCashoutRocket = () => {
    if (!rocketFlying || rocketCrashed) return;
    setRocketWon(true);
    setRocketFlying(false);
    setCrashHistory((h) => [rocketMultiplier, ...h.slice(0, 6)]);
    confetti({ particleCount: 50, spread: 70 });
    onQuickAction(`cb_bet_rocket_cashout_${Math.round(rocketMultiplier * 100)}`);
  };

  const handleSpinLottery = () => {
    if (isSpinning) return;
    setIsSpinning(true);
    setLotteryPrize(null);
    const extraRotations = 360 * 5 + Math.floor(Math.random() * 360);
    setWheelDegree((prev) => prev + extraRotations);

    setTimeout(() => {
      setIsSpinning(false);
      const prizes = [
        '⭐️ ۱ ماه تلگرام پرمیوم رایگان!',
        '💰 ۵۰,۰۰۰ تومان شارژ کیف پول!',
        '🪙 ۲,۰۰۰ سکه بازی!',
        '👁️ ۱,۰۰۰ سین هدیه کانال!',
        '📱 شماره مجازی فعال گردید!',
      ];
      const win = prizes[Math.floor(Math.random() * prizes.length)];
      setLotteryPrize(win);
      confetti({ particleCount: 70, spread: 80 });
      onQuickAction('cb_lottery_spin');
    }, 3500);
  };

  return (
    <div className="bg-[#17212b] rounded-2xl border border-[#242f3d] p-5 shadow-2xl max-w-4xl mx-auto space-y-6">
      {/* Header with Title and Tabs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#242f3d] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-lg text-white">
              مرکز کنترل و مدیریت ماژول‌های ده‌گانه ربات
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            تمامی قابلیت‌های SlowMegaBot به‌صورت عملیاتی و آنلاین
          </p>
        </div>

        <div className="bg-[#242f3d] px-3 py-1.5 rounded-xl border border-[#2e3d4e] text-xs flex items-center gap-2 text-slate-300">
          <Wallet className="w-4 h-4 text-emerald-400" />
          <span>موجودی کیف‌پول:</span>
          <span className="font-bold text-emerald-400">{walletBalance.toLocaleString('fa-IR')} ت</span>
        </div>
      </div>

      {/* Module Navigation Tabs */}
      <div className="space-y-2">
        <div className="text-[11px] font-bold text-sky-400 flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-sky-400" />
          <span>ماژول‌های تخصصی و دانلودرها (دانلودر جامع، فیلترشکن، شماره مجازی، یوتیوب، موزیک، نرخ ارز، آپلودر، تیک‌تاک):</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-1.5 p-1.5 bg-[#0e1621] rounded-xl border border-sky-500/30">
          {[
            { id: 'universal_dl', label: 'دانلودر جامع', icon: DownloadCloud, color: 'text-amber-400' },
            { id: 'proxy', label: 'وب‌پروکسی و VPN', icon: Globe, color: 'text-teal-400' },
            { id: 'vaksms', label: 'شماره مجازی', icon: Smartphone, color: 'text-emerald-400' },
            { id: 'youtube', label: 'دانلودر یوتیوب', icon: Video, color: 'text-red-400' },
            { id: 'music', label: 'جستجوی موزیک', icon: Music, color: 'text-violet-400' },
            { id: 'arzy', label: 'نرخ لحظه‌ای (arzy)', icon: Coins, color: 'text-amber-400' },
            { id: 'aplo', label: 'آپلودر پیشرفته', icon: UploadCloud, color: 'text-blue-400' },
            { id: 'tiktok', label: 'تیک‌تاک No-WM', icon: Sparkles, color: 'text-cyan-400' },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-lg font-bold ring-2 ring-sky-300/40'
                    : 'text-slate-300 hover:text-white hover:bg-[#1a2531]'
                }`}
              >
                <Icon className={`w-4 h-4 mb-1 ${isActive ? 'text-white' : tab.color}`} />
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5 mt-2">
          <span>سایر ماژول‌های فعال ربات:</span>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-1.5 p-1 bg-[#0e1621] rounded-xl border border-[#242f3d]">
          {[
            { id: 'bet', label: 'بت و موشک', icon: Rocket, color: 'text-rose-400' },
            { id: 'mafia', label: 'مافیا', icon: ShieldAlert, color: 'text-indigo-400' },
            { id: 'clash', label: 'کلش آف کلنز', icon: Swords, color: 'text-amber-400' },
            { id: 'finder', label: 'چت ناشناس', icon: Search, color: 'text-emerald-400' },
            { id: 'seen', label: 'سین‌زن', icon: Eye, color: 'text-sky-400' },
            { id: 'tools', label: 'جعبه ابزار', icon: Wrench, color: 'text-cyan-400' },
            { id: 'uploader', label: 'آپلودر سریع', icon: UploadCloud, color: 'text-purple-400' },
            { id: 'lottery', label: 'لاتاری', icon: Gift, color: 'text-yellow-400' },
            { id: 'like', label: 'لایک‌زن', icon: Heart, color: 'text-pink-400' },
            { id: 'env_manager', label: 'مدیریت Env', icon: Wrench, color: 'text-emerald-400' },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#0088cc] text-white shadow-md font-bold'
                    : 'text-slate-400 hover:text-white hover:bg-[#1a2531]'
                }`}
              >
                <Icon className={`w-4 h-4 mb-1 ${isActive ? 'text-white' : tab.color}`} />
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ENV MANAGER TAB */}
      {activeTab === 'env_manager' && (
        <div className="space-y-4">
          <div className="bg-[#0e1621] rounded-xl border border-emerald-500/30 p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#242f3d] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                  <Wrench className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">مدیریت متغیرهای محیطی (.env)</h3>
                  <p className="text-xs text-slate-400">مشاهده، ویرایش و ذخیره توکن‌ها و کلیدهای پیکربندی سیستم در یکجا</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={fetchEnvVars}
                  disabled={envLoading}
                  className="px-3 py-1.5 bg-[#1a2531] hover:bg-[#242f3d] text-slate-200 rounded-lg text-xs font-medium transition flex items-center gap-1.5 cursor-pointer border border-[#242f3d]"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${envLoading ? 'animate-spin' : ''}`} />
                  <span>بارگذاری مجدد</span>
                </button>
                <button
                  onClick={handleSaveEnv}
                  disabled={envSaving}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 cursor-pointer"
                >
                  <Save className={`w-3.5 h-3.5 ${envSaving ? 'animate-spin' : ''}`} />
                  <span>{envSaving ? 'در حال ذخیره...' : 'ذخیره همه تغییرات'}</span>
                </button>
              </div>
            </div>

            {envMessage && (
              <div className={`p-3 rounded-lg text-xs font-medium border ${envMessage.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-400'}`}>
                {envMessage.text}
              </div>
            )}

            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="جستجو در نام متغیرها (مثلا TELEGRAM, GEMINI, PORT)..."
                value={envSearch}
                onChange={(e) => setEnvSearch(e.target.value)}
                className="w-full bg-[#16222f] border border-[#242f3d] rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {envLoading ? (
              <div className="text-center py-12 text-slate-400 text-xs animate-pulse">در حال خواندن متغیرهای محیطی...</div>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                {envVars
                  .filter((v) => v.key.toLowerCase().includes(envSearch.toLowerCase()) || v.value.toLowerCase().includes(envSearch.toLowerCase()))
                  .map((variable: { key: string; value: string }, idx: number) => {
                    const isVisible = showValues[variable.key];
                    return (
                      <div key={variable.key} className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 bg-[#16222f] rounded-xl border border-[#242f3d]">
                        <div className="w-full sm:w-1/3">
                          <span className="text-xs font-mono font-bold text-emerald-300">{variable.key}</span>
                        </div>
                        <div className="w-full sm:w-2/3 flex items-center gap-2">
                          <div className="relative flex-1">
                            <input
                              type={isVisible ? 'text' : 'password'}
                              value={variable.value}
                              onChange={(e) => {
                                const val = e.target.value;
                                setEnvVars((prev) => prev.map((item, i) => (i === idx ? { ...item, value: val } : item)));
                              }}
                              className="w-full bg-[#0e1621] border border-[#242f3d] rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-emerald-500 pr-9"
                            />
                            <button
                              type="button"
                              onClick={() => setShowValues((prev) => ({ ...prev, [variable.key]: !prev[variable.key] }))}
                              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                              title={isVisible ? 'مخفی کردن' : 'نمایش ارزش'}
                            >
                              {isVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      )}

            {/* ACTIVE TAB DISPLAY */}

      {/* 0. UNIVERSAL MEGA DOWNLOADER SUITE (اینستاگرام، یوتیوب، تیک‌تاک، پینترست، توییتر، اسپاتیفای، آپارات) */}
      {activeTab === 'universal_dl' && (
        <div className="space-y-4">
          <div className="bg-[#0e1621] rounded-xl border border-amber-500/30 p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#242f3d] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                  <DownloadCloud className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white">مرکز دانلود جامع و همه‌کاره (Universal Mega Downloader)</h4>
                  <p className="text-[11px] text-slate-400">
                    استخراج ویدیو، صوت، استوری، ریلز و تصویر از ۸ پلتفرم برتر با کیفیت حداکثری و بدون فیلتر
                  </p>
                </div>
              </div>
              <span className="self-start sm:self-auto text-[10px] px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30 font-mono font-bold">
                All-in-One Engine v4.5
              </span>
            </div>

            {/* دکمه‌های تخصصی و کاربردی دانلودر غیره (Auxiliary Downloader Buttons) */}
            <div className="p-3 bg-[#131d28] rounded-xl border border-sky-500/20 space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-sky-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                  <span>دکمه‌های تخصصی دانلودر و ابزارهای چندرسانه‌ای:</span>
                </span>
                <span className="text-slate-400 text-[10px]">عملیات درجا بدون نیاز به ابزار جانبی</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                <button
                  onClick={() => {
                    // Quick extract MP3: find or convert to audio
                    const audioPreset = UNIVERSAL_DOWNLOAD_PRESETS.find(p => p.contentType === 'audio') || UNIVERSAL_DOWNLOAD_PRESETS[4];
                    setSelectedPresetId(audioPreset.id);
                    setUniversalUrl(audioPreset.url);
                    setUniversalItem(audioPreset);
                    setFormatFilter('audio');
                    confetti({ particleCount: 35, spread: 60 });
                  }}
                  className="p-2 rounded-xl bg-[#1a2736] hover:bg-[#233549] border border-violet-500/30 text-right space-y-1 transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-1.5 text-violet-400 text-xs font-bold">
                    <Volume2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    <span>استخراج MP3 320k</span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-tight">
                    تبدیل آنی هر ویدیو به موزیک با کیفیت مستر
                  </p>
                </button>

                <button
                  onClick={() => {
                    const profPreset = UNIVERSAL_DOWNLOAD_PRESETS.find(p => p.id === 'dl_insta_profile') || UNIVERSAL_DOWNLOAD_PRESETS[1];
                    setSelectedPresetId(profPreset.id);
                    setUniversalUrl(profPreset.url);
                    setUniversalItem(profPreset);
                    confetti({ particleCount: 35, spread: 60 });
                  }}
                  className="p-2 rounded-xl bg-[#1a2736] hover:bg-[#233549] border border-sky-500/30 text-right space-y-1 transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-1.5 text-sky-400 text-xs font-bold">
                    <UserCheck className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    <span>استعلام پروفایل و بیو</span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-tight">
                    دریافت عکس پروفایل فول HD، فالوورها و بیو
                  </p>
                </button>

                <button
                  onClick={() => {
                    const storyPreset = UNIVERSAL_DOWNLOAD_PRESETS.find(p => p.id === 'dl_insta_story') || UNIVERSAL_DOWNLOAD_PRESETS[0];
                    setSelectedPresetId(storyPreset.id);
                    setUniversalUrl(storyPreset.url);
                    setUniversalItem(storyPreset);
                    confetti({ particleCount: 35, spread: 60 });
                  }}
                  className="p-2 rounded-xl bg-[#1a2736] hover:bg-[#233549] border border-pink-500/30 text-right space-y-1 transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-1.5 text-pink-400 text-xs font-bold">
                    <Sparkles className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    <span>دانلود استوری اینستا</span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-tight">
                    ذخیره استوری فعال و هایلایت‌ها با کیفیت اصلی
                  </p>
                </button>

                <button
                  onClick={() => {
                    const pinPreset = UNIVERSAL_DOWNLOAD_PRESETS.find(p => p.contentType === 'photo') || UNIVERSAL_DOWNLOAD_PRESETS[2];
                    setSelectedPresetId(pinPreset.id);
                    setUniversalUrl(pinPreset.url);
                    setUniversalItem(pinPreset);
                    setFormatFilter('image');
                    confetti({ particleCount: 35, spread: 60 });
                  }}
                  className="p-2 rounded-xl bg-[#1a2736] hover:bg-[#233549] border border-amber-500/30 text-right space-y-1 transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-1.5 text-amber-400 text-xs font-bold">
                    <ImageIcon className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    <span>دانلود کاور اورجینال</span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-tight">
                    استخراج پوستر و تامبنیل اصلی بدون افت کیفیت
                  </p>
                </button>

                <button
                  onClick={() => {
                    const textToCopy = universalItem?.description || universalItem?.title || '';
                    if (textToCopy) {
                      navigator.clipboard.writeText(textToCopy);
                      setCaptionCopied(true);
                      setTimeout(() => setCaptionCopied(false), 2500);
                      confetti({ particleCount: 25, spread: 50 });
                    }
                  }}
                  className="p-2 rounded-xl bg-[#1a2736] hover:bg-[#233549] border border-emerald-500/30 text-right space-y-1 transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold">
                    {captionCopied ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    )}
                    <span>{captionCopied ? 'کپی شد!' : 'کپی کپشن و تگ‌ها'}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-tight">
                    کپی سریع متن کپشن و هشتگ‌های ویدیو
                  </p>
                </button>

                <button
                  onClick={() => {
                    onQuickAction(`/dl ${universalUrl}`);
                    confetti({ particleCount: 40, spread: 65 });
                  }}
                  className="p-2 rounded-xl bg-[#0088cc]/20 hover:bg-[#0088cc]/30 border border-[#0088cc]/40 text-right space-y-1 transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-1.5 text-sky-300 text-xs font-bold">
                    <Zap className="w-4 h-4 group-hover:scale-110 transition-transform text-amber-300" />
                    <span>ارسال آنی به تلگرام</span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-tight">
                    اجرای دستور در ربات تلگرام با بازخورد درجا
                  </p>
                </button>
              </div>
            </div>

            {/* URL Input Bar with Dynamic Platform Badge */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">لینک ویدیو، پست یا آهنگ را وارد کنید:</span>
                {universalUrl && (
                  <span className="text-sky-400 font-bold flex items-center gap-1">
                    <span>تشخیص خودکار پلتفرم:</span>
                    <strong className="text-white underline">
                      {UNIVERSAL_DOWNLOAD_PRESETS.find(
                        (p) => p.platform === detectDownloadPlatform(universalUrl)
                      )?.platformNameFa || detectDownloadPlatform(universalUrl)}
                    </strong>
                  </span>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={universalUrl}
                  onChange={(e) => {
                    setUniversalUrl(e.target.value);
                  }}
                  placeholder="https://www.instagram.com/reel/... یا youtube.com یا tiktok.com"
                  className="flex-1 bg-[#17212b] border border-[#2e3d4e] rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-amber-400"
                />
                <button
                  onClick={async () => {
                    const clean = universalUrl.trim();
                    if (!clean) return;
                    setUniversalLoading(true);
                    try {
                      const res = await fetch('/api/downloader/analyze', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ url: clean }),
                      }).then(r => r.json());
                      setUniversalItem(res);
                      if (res.trackingSession) {
                        setDownloadAuditSession(res.trackingSession);
                      }
                      confetti({ particleCount: 45, spread: 70 });
                    } catch (e) {
                      const fallback = fetchUniversalDownload(clean);
                      setUniversalItem(fallback);
                    } finally {
                      setUniversalLoading(false);
                    }
                  }}
                  disabled={universalLoading || !universalUrl.trim()}
                  className="px-5 py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-bold rounded-xl text-xs shadow-md cursor-pointer flex items-center justify-center gap-1.5 transition-all"
                >
                  {universalLoading ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Download className="w-3.5 h-3.5" />
                  )}
                  <span>تحلیل لینک و دریافت فایل</span>
                </button>
              </div>
            </div>

                        {!universalItem && (
              <div className="bg-[#17212b] rounded-xl border border-dashed border-[#2e3d4e] p-6 text-center space-y-2">
                <DownloadCloud className="w-8 h-8 text-amber-400 mx-auto opacity-70" />
                <h5 className="font-bold text-xs text-white">آماده دریافت و پردازش مستقیم لینک</h5>
                <p className="text-[11px] text-slate-400 max-w-md mx-auto">
                  لینک هر ویدیو، ریلز، پست، استوری، کلیپ یوتیوب، تیک‌تاک یا آهنگ را در کادر بالا وارد کرده و دکمه «تحلیل لینک و دریافت فایل» را لمس کنید.
                </p>
              </div>
            )}
            {/* Universal Media Result Card */}
            {universalItem && (
              <div className="bg-[#17212b] rounded-xl border border-[#2e3d4e] p-4 space-y-4">
                <div className="flex flex-col md:flex-row gap-4">
                  {/* Thumbnail / Media Card / Embedded Player */}
                  <div className="relative w-full md:w-64 min-h-[170px] rounded-xl overflow-hidden bg-black flex-shrink-0 border border-[#2e3d4e] flex flex-col justify-center">
                    {universalItem.contentType === 'video' && universalItem.mediaUrl ? (
                      <video
                        controls
                        poster={universalItem.thumbnail}
                        src={universalItem.mediaUrl}
                        className="w-full h-full max-h-48 object-contain bg-black"
                        playsInline
                      />
                    ) : universalItem.contentType === 'profile' ? (
                      <div className="p-4 text-center space-y-2 bg-gradient-to-b from-[#1b2735] to-[#0e1621] h-full flex flex-col items-center justify-center">
                        <img
                          src={universalItem.profileDetails?.avatarUrl || universalItem.thumbnail}
                          alt="avatar"
                          className="w-20 h-20 rounded-full object-cover border-2 border-sky-400 shadow-lg mx-auto"
                        />
                        <div className="flex items-center justify-center gap-1">
                          <span className="font-bold text-xs text-white">
                            {universalItem.profileDetails?.fullName || universalItem.title}
                          </span>
                          <span className="text-sky-400 font-bold text-xs">✓</span>
                        </div>
                        <span className="text-[10px] text-sky-300 font-mono block">
                          @{universalItem.profileDetails?.username || universalItem.author}
                        </span>
                      </div>
                    ) : (
                      <img
                        src={universalItem.thumbnail}
                        alt={universalItem.title}
                        className="w-full h-full object-cover"
                      />
                    )}

                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/75 text-white text-[10px] font-bold flex items-center gap-1 backdrop-blur-xs z-10">
                      <span>{universalItem.platformIcon}</span>
                      <span>{universalItem.platformNameFa}</span>
                    </span>
                    {universalItem.duration && universalItem.contentType !== 'video' && (
                      <span className="absolute bottom-2 right-2 bg-black/85 text-white text-[10px] font-mono px-1.5 py-0.5 rounded z-10">
                        {universalItem.duration}
                      </span>
                    )}
                  </div>

                  {/* Metadata and Stats */}
                  <div className="space-y-2.5 flex-1">
                    <div className="flex items-center gap-2">
                      {universalItem.authorAvatar && (
                        <img
                          src={universalItem.authorAvatar}
                          alt={universalItem.author || ''}
                          className="w-7 h-7 rounded-full object-cover border border-amber-400"
                        />
                      )}
                      <div>
                        <strong className="text-xs text-white block">
                          {universalItem.author || 'ناشر تأییدشده'}
                        </strong>
                        <span className="text-[10px] text-slate-400">
                          {universalItem.contentType === 'profile' ? 'پروفایل تاییدشده' : universalItem.contentType === 'audio' ? 'قطعه صوتی' : 'محتوای اصلی تأییدشده'}
                        </span>
                      </div>
                    </div>

                    <h5 className="font-bold text-xs sm:text-sm text-white line-clamp-2">
                      {universalItem.title}
                    </h5>

                    {/* Audio Player if Audio item */}
                    {universalItem.contentType === 'audio' && universalItem.mediaUrl && (
                      <div className="p-2 rounded-lg bg-[#0e1621] border border-amber-500/30">
                        <audio controls src={universalItem.mediaUrl} className="w-full h-8 accent-amber-500" />
                      </div>
                    )}

                    {/* Profile Stats Grid if profile */}
                    {universalItem.contentType === 'profile' && universalItem.profileDetails && (
                      <div className="grid grid-cols-3 gap-1 bg-[#0e1621] p-2 rounded-lg text-center text-[10px] border border-[#242f3d]">
                        <div>
                          <span className="text-slate-400 block text-[9px]">فالوورها</span>
                          <strong className="text-amber-300 font-bold text-xs">{universalItem.profileDetails.followers}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[9px]">فالووینگ</span>
                          <strong className="text-slate-200 font-bold text-xs">{universalItem.profileDetails.following}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[9px]">پست‌ها</span>
                          <strong className="text-slate-200 font-bold text-xs">{universalItem.profileDetails.postsCount}</strong>
                        </div>
                      </div>
                    )}

                    {universalItem.description && (
                      <p className="text-[11px] text-slate-300 line-clamp-2 bg-[#0e1621] p-2 rounded-lg border border-[#242f3d]">
                        {universalItem.description}
                      </p>
                    )}

                    {/* Stats bar */}
                    {universalItem.stats && (
                      <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-400 pt-1 font-mono">
                        {universalItem.stats.views && (
                          <span className="flex items-center gap-1">
                            <span>👁️</span>
                            <span>{universalItem.stats.views} بازدید</span>
                          </span>
                        )}
                        {universalItem.stats.likes && (
                          <span className="flex items-center gap-1 text-rose-400">
                            <span>❤️</span>
                            <span>{universalItem.stats.likes.toLocaleString('fa-IR')} لایک</span>
                          </span>
                        )}
                        {universalItem.stats.shares && (
                          <span className="flex items-center gap-1 text-sky-400">
                            <span>🔄</span>
                            <span>{universalItem.stats.shares.toLocaleString('fa-IR')} اشتراک</span>
                          </span>
                        )}
                      </div>
                    )}

                    {/* Quick Direct Buttons: Download Post, Download Audio, Download Caption & Bio, Send to Bot */}
                    <div className="pt-2 flex flex-wrap gap-2">
                      <a
                        href={universalItem.formats.find(f => f.type === 'video')?.downloadUrl || universalItem.mediaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow transition-all"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>دانلود پست (کیفیت اصلی)</span>
                      </a>

                      <a
                        href={universalItem.formats.find(f => f.type === 'audio')?.downloadUrl || 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow transition-all"
                      >
                        <Music className="w-3.5 h-3.5 text-amber-300" />
                        <span>دانلود آهنگ پست (MP3 320k)</span>
                      </a>

                      <button
                        onClick={() => {
                          const text = universalItem.description || universalItem.title;
                          navigator.clipboard.writeText(text);
                          setCaptionCopied(true);
                          setTimeout(() => setCaptionCopied(false), 2500);
                          confetti({ particleCount: 30, spread: 60 });
                        }}
                        className="px-3 py-1.5 bg-[#1e2c3a] hover:bg-[#2b3e52] border border-[#2b3e52] text-slate-200 hover:text-white rounded-lg text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-all"
                      >
                        {captionCopied ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5 text-sky-400" />
                        )}
                        <span>{captionCopied ? 'کپشن کپی شد!' : 'دانلود و کپی بیو و کپشن'}</span>
                      </button>

                      <button
                        onClick={() => {
                          onQuickAction(`/dl ${universalItem.url}`);
                          confetti({ particleCount: 35, spread: 60 });
                        }}
                        className="px-3 py-1.5 bg-[#0088cc] hover:bg-[#0099e6] text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow"
                      >
                        <Zap className="w-3.5 h-3.5 text-amber-300" />
                        <span>ارسال به چت تلگرام (/dl)</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Available Download Qualities Grid with Category Filter */}
                <div className="pt-3 border-t border-[#242f3d] space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-200 block">
                      📥 کیفیت‌ها و فرمت‌های آماده دانلود مستقیم (بدون معطلی):
                    </span>
                    <div className="flex items-center gap-1 bg-[#0e1621] p-0.5 rounded-lg border border-[#242f3d]">
                      {[
                        { key: 'all', label: 'همه فرمت‌ها' },
                        { key: 'video', label: '🎥 ویدیو' },
                        { key: 'audio', label: '🎵 صوت MP3' },
                        { key: 'image', label: '🖼️ عکس/کاور' },
                      ].map((tab) => (
                        <button
                          key={tab.key}
                          onClick={() => setFormatFilter(tab.key as any)}
                          className={`px-2 py-1 rounded-md text-[10px] font-medium transition-colors cursor-pointer ${
                            formatFilter === tab.key
                              ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {universalItem.formats
                      .filter((fmt) => {
                        if (formatFilter === 'all') return true;
                        if (formatFilter === 'video') return fmt.type === 'video';
                        if (formatFilter === 'audio') return fmt.type === 'audio';
                        if (formatFilter === 'image') return fmt.type === 'image';
                        return true;
                      })
                      .map((fmt) => (
                      <div
                        key={fmt.id}
                        className="p-2.5 rounded-xl bg-[#0e1621] border border-[#242f3d] hover:border-amber-500/40 flex items-center justify-between gap-2 transition-all"
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          <div className="p-2 rounded-lg bg-[#17212b] text-amber-400 shrink-0">
                            {fmt.type === 'audio' ? (
                              <Volume2 className="w-4 h-4 text-violet-400" />
                            ) : fmt.type === 'image' ? (
                              <Sparkles className="w-4 h-4 text-pink-400" />
                            ) : (
                              <Video className="w-4 h-4 text-amber-400" />
                            )}
                          </div>
                          <div className="overflow-hidden">
                            <span className="text-xs font-bold text-white block truncate">
                              {fmt.label}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {fmt.format.toUpperCase()} • {fmt.sizeMb} MB
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <a
                            href={fmt.downloadUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer shrink-0 transition-colors"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>دانلود</span>
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Live Preview Player */}
                <div className="pt-3 border-t border-[#242f3d]">
                  <span className="text-xs font-bold text-slate-300 block mb-2">
                    پیش‌نمایش آنلاین وبلاگ:
                  </span>
                  {universalItem.formats.some((f) => f.type === 'video') ? (
                    <div className="rounded-xl overflow-hidden bg-black max-h-56 flex justify-center">
                      <video
                        controls
                        src="https://www.w3schools.com/html/mov_bbb.mp4"
                        className="w-full max-h-52"
                        poster={universalItem.thumbnail}
                      />
                    </div>
                  ) : universalItem.formats.some((f) => f.type === 'audio') ? (
                    <div className="bg-[#0e1621] p-3 rounded-xl border border-[#242f3d] flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Volume2 className="w-5 h-5 text-violet-400" />
                        <span className="text-xs text-slate-200 font-bold">{universalItem.title}</span>
                      </div>
                      <audio
                        controls
                        src="https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"
                        className="h-8 max-w-[240px]"
                      />
                    </div>
                  ) : (
                    <img
                      src={universalItem.thumbnail}
                      alt={universalItem.title}
                      className="max-h-52 mx-auto rounded-xl object-contain border border-[#242f3d]"
                    />
                  )}
                </div>
              </div>
            )}

            {/* 10-Step Download Audit Tracker Component */}
            {downloadAuditSession && (
              <div className="bg-[#121c27] rounded-xl border border-sky-500/30 p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#242f3d] pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-sky-500/20 text-sky-400">
                      <FileText className="w-4 h-4" />
                    </span>
                    <div>
                      <h5 className="font-bold text-xs text-white flex items-center gap-2">
                        <span>لاگ و رهگیری ۱۰ مرحله‌ای دانلود (Request Audit)</span>
                        <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold">
                          {downloadAuditSession.success ? '✓ موفق' : '⚠️ خطا'}
                        </span>
                      </h5>
                      <span className="text-[10px] text-slate-400 font-mono">
                        شناسه پیگیری: {downloadAuditSession.requestId}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {downloadAuditSession.totalDurationMs && (
                      <span className="text-[10px] font-mono text-amber-300 bg-amber-500/10 px-2 py-1 rounded-md border border-amber-500/30">
                        ⏱️ زمان کل: {downloadAuditSession.totalDurationMs}ms
                      </span>
                    )}
                    <button
                      onClick={async () => {
                        const res = await fetch('/api/downloader/logs').then(r => r.json());
                        if (res.sessions) setRecentAuditSessions(res.sessions);
                        setShowAuditLogs(!showAuditLogs);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-[#1a2736] hover:bg-[#233549] text-sky-300 text-[10px] border border-sky-500/30 cursor-pointer transition-colors"
                    >
                      {showAuditLogs ? 'بستن آرشیو لاگ‌ها' : '📋 آرشیو تمام دانلودها'}
                    </button>
                  </div>
                </div>

                {/* 10-Step Checklist */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {downloadAuditSession.stages?.map((stage: any, idx: number) => (
                    <div
                      key={idx}
                      className={`p-2 rounded-lg border flex items-center justify-between gap-2 ${
                        stage.status === 'success'
                          ? 'bg-[#172433] border-emerald-500/30 text-slate-200'
                          : stage.status === 'failed'
                          ? 'bg-rose-950/30 border-rose-500/40 text-rose-200'
                          : 'bg-[#17212b] border-[#242f3d] text-slate-400'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="w-5 h-5 rounded-full bg-[#0e1621] border border-slate-700 flex items-center justify-center text-[10px] font-bold font-mono text-sky-300 shrink-0">
                          {stage.step}
                        </span>
                        <div className="truncate">
                          <span className="font-medium text-[11px] block truncate">
                            {stage.stageNameFa}
                          </span>
                          {stage.errorMessage && (
                            <span className="text-[10px] text-rose-400 truncate block">
                              دلیل: {stage.errorMessage}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 text-[10px] font-mono text-slate-400">
                        {stage.durationMs !== undefined && (
                          <span className="text-amber-400/80">+{stage.durationMs}ms</span>
                        )}
                        <span className={stage.status === 'success' ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                          {stage.status === 'success' ? '✓' : '✗'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Recent Archive Dropdown */}
                {showAuditLogs && (
                  <div className="mt-3 p-3 bg-[#0e1621] rounded-xl border border-[#242f3d] space-y-2">
                    <span className="text-xs font-bold text-slate-300 block">
                      📜 آخرین درخواست‌های دانلود ثبت‌شده در سامانه:
                    </span>
                    {recentAuditSessions.length === 0 ? (
                      <p className="text-[11px] text-slate-500">هیچ لاگ دیگری در حافظه موجود نیست.</p>
                    ) : (
                      <div className="space-y-1.5 max-h-48 overflow-y-auto">
                        {recentAuditSessions.map((s: any) => (
                          <div
                            key={s.requestId}
                            className="p-2 rounded-lg bg-[#17212b] border border-[#242f3d] flex items-center justify-between text-[11px]"
                          >
                            <div className="flex items-center gap-2 truncate">
                              <span className={s.success ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                                {s.success ? '✓' : '✗'}
                              </span>
                              <span className="font-mono text-sky-300 text-[10px]">{s.requestId}</span>
                              <span className="text-slate-400 truncate max-w-[200px]">{s.cleanedUrl || s.rawInput}</span>
                            </div>
                            <span className="text-slate-500 text-[10px] font-mono shrink-0">
                              {s.totalDurationMs ? `${s.totalDurationMs}ms` : ''}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Downloader Diagnostics Modal */}
      <DownloaderDiagnosticsModal
        isOpen={showDiagnosticsModal}
        onClose={() => setShowDiagnosticsModal(false)}
      />

      {/* 1. SLOWBET & ROCKET CRASH */}
      {activeTab === 'bet' && (
        <div className="space-y-4">
          <div className="bg-[#0e1621] rounded-xl border border-[#242f3d] p-4 relative overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Rocket className="w-5 h-5 text-rose-500 animate-pulse" />
                <h4 className="font-bold text-sm text-white">رادار شبیه‌ساز موشک انفجار (Crash Rocket)</h4>
              </div>
              {/* Multiplier History */}
              <div className="flex items-center gap-1.5 overflow-x-auto text-[10px]">
                {crashHistory.map((m, idx) => (
                  <span
                    key={idx}
                    className={`px-2 py-0.5 rounded font-mono font-bold ${
                      m >= 2.0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                    }`}
                  >
                    {m}x
                  </span>
                ))}
              </div>
            </div>

            {/* Graphical Flight Area */}
            <div className="h-48 bg-gradient-to-b from-[#17212b] to-[#0e1621] rounded-xl relative flex flex-col items-center justify-center border border-[#1e2c3a] overflow-hidden">
              {/* Grid Lines */}
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#242f3d_1px,transparent_1px),linear-gradient(to_bottom,#242f3d_1px,transparent_1px)] bg-[size:24px_24px] opacity-20" />

              {/* Rocket State Display */}
              <div className="z-10 text-center">
                <div
                  className={`text-5xl font-black font-mono transition-transform ${
                    rocketCrashed ? 'text-rose-500 animate-shake' : rocketWon ? 'text-emerald-400' : 'text-white'
                  }`}
                >
                  {rocketMultiplier.toFixed(2)}x
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  {rocketCrashed
                    ? '💥 موشک منفجر شد!'
                    : rocketWon
                    ? '🎉 برداشت موفقیت‌آمیز!'
                    : rocketFlying
                    ? '🚀 در حال پرواز... برداشت کنید!'
                    : 'آماده پرواز'}
                </p>
              </div>

              {/* Animated Floating Rocket */}
              <div
                className={`absolute transition-all duration-100 ${
                  rocketFlying
                    ? 'bottom-24 left-1/2 -translate-x-1/2 scale-125'
                    : rocketCrashed
                    ? 'bottom-16 left-1/2 -translate-x-1/2 opacity-30 scale-75'
                    : 'bottom-6 left-1/2 -translate-x-1/2'
                }`}
              >
                <span className="text-4xl filter drop-shadow-[0_0_12px_rgba(244,63,94,0.6)]">
                  {rocketCrashed ? '💥' : '🚀'}
                </span>
              </div>
            </div>

            {/* Betting Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-3 border-t border-[#242f3d]">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">مبلغ شرط:</span>
                {[10000, 25000, 50000].map((amt) => (
                  <button
                    key={amt}
                    onClick={() => setBetAmount(amt)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition-all ${
                      betAmount === amt
                        ? 'bg-[#0088cc] text-white'
                        : 'bg-[#242f3d] text-slate-300 hover:bg-[#2b3e52]'
                    }`}
                  >
                    {amt.toLocaleString('fa-IR')}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                {!rocketFlying ? (
                  <button
                    onClick={handleStartRocket}
                    className="px-6 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-bold text-xs shadow-lg transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>شروع پرتاب موشک ({betAmount.toLocaleString('fa-IR')} ت)</span>
                  </button>
                ) : (
                  <button
                    onClick={handleCashoutRocket}
                    className="px-6 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white rounded-xl font-bold text-xs shadow-lg animate-bounce transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>برداشت سود {(betAmount * rocketMultiplier).toLocaleString('fa-IR')} تومان!</span>
                  </button>
                )}

                <button
                  onClick={() => onQuickAction('/bet')}
                  className="px-3 py-2 bg-[#242f3d] hover:bg-[#2b3e52] text-slate-300 rounded-xl text-xs font-medium"
                >
                  ارسال دستور به چت ربات
                </button>
              </div>
            </div>
          </div>

          {/* Quick Dart & Dice buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              onClick={() => onQuickAction('cb_bet_dart')}
              className="p-3 bg-[#0e1621] hover:bg-[#1a2531] border border-[#242f3d] rounded-xl flex items-center gap-3 transition-all text-right group cursor-pointer"
            >
              <div className="w-10 h-10 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xl group-hover:scale-110 transition-transform">
                🎯
              </div>
              <div>
                <h5 className="font-bold text-xs text-white">پرتاب دارت تلگرام</h5>
                <p className="text-[11px] text-slate-400">پرتاب دارت با ایموجی تلگرام</p>
              </div>
            </button>

            <button
              onClick={() => onQuickAction('cb_bet_dice')}
              className="p-3 bg-[#0e1621] hover:bg-[#1a2531] border border-[#242f3d] rounded-xl flex items-center gap-3 transition-all text-right group cursor-pointer"
            >
              <div className="w-10 h-10 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xl group-hover:scale-110 transition-transform">
                🎲
              </div>
              <div>
                <h5 className="font-bold text-xs text-white">پرتاب تاس جفت/فرد</h5>
                <p className="text-[11px] text-slate-400">پرتاب تاس با جایزه نقدی</p>
              </div>
            </button>

            <button
              onClick={() => onQuickAction('cb_bet_coin')}
              className="p-3 bg-[#0e1621] hover:bg-[#1a2531] border border-[#242f3d] rounded-xl flex items-center gap-3 transition-all text-right group cursor-pointer"
            >
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xl group-hover:scale-110 transition-transform">
                🪙
              </div>
              <div>
                <h5 className="font-bold text-xs text-white">شیر یا خط مهارتی</h5>
                <p className="text-[11px] text-slate-400">شیر یا خط ۵۰/۵۰ و سنجش مهارت</p>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* 2. MAFIA GAME STATION (beta ( mafia ) Faithful Lab) */}
      {activeTab === 'mafia' && (
        <div className="space-y-4">
          <div className="bg-[#0e1621] rounded-xl border border-[#242f3d] p-4 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#242f3d] pb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-indigo-400" />
                <div>
                  <h4 className="font-bold text-sm text-white">میز آزمایشگاه و شبیه‌ساز مافیا (PUBLIC/beta ( mafia ))</h4>
                  <p className="text-[11px] text-slate-400">انطباق دقیق با سناریوهای ۹ نفره و ۱۲ نفره، فازهای شب/روز، استعلام، شلیک و دادگاه</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onQuickAction('cb_mafia_start_9')}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer flex items-center gap-1"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>اجرای سناریو ۹ نفره</span>
                </button>
                <button
                  onClick={() => onQuickAction('cb_mafia_start_12')}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer flex items-center gap-1"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>اجرای سناریو ۱۲ نفره</span>
                </button>
              </div>
            </div>

            {/* Interactive Seats Grid (table.php representation) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-300">🪑 چیدمان صندلی‌های بازی (table.php):</span>
                <span className="text-[10px] text-slate-400">روی هر صندلی کلیک کنید تا در چت ربات هدف قرار گیرد</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {[
                  { seat: 1, name: 'شما (صندلی ۱)', role: 'نقش محرمانه شما', emoji: '🎭', isAlive: true, badge: 'میزبان' },
                  { seat: 2, name: 'سروش', role: 'گادپدر / رئیس', emoji: '🎩', isAlive: true, team: 'mafia' },
                  { seat: 3, name: 'مریم', role: 'دکتر شهر', emoji: '👨‍⚕️', isAlive: true, team: 'citizens' },
                  { seat: 4, name: 'آرش', role: 'کارآگاه', emoji: '🔍', isAlive: true, team: 'citizens' },
                  { seat: 5, name: 'نیما', role: 'اسنایپر', emoji: '🎯', isAlive: true, team: 'citizens' },
                  { seat: 6, name: 'الناز', role: 'زره‌پوش', emoji: '🛡️', isAlive: true, team: 'citizens' },
                  { seat: 7, name: 'کامران', role: 'مافیای ساده', emoji: '🕶️', isAlive: true, team: 'mafia' },
                  { seat: 8, name: 'مهسا', role: 'کشیش', emoji: '⛪', isAlive: true, team: 'citizens' },
                  { seat: 9, name: 'بهرام', role: 'شهروند ساده', emoji: '👥', isAlive: true, team: 'citizens' },
                ].map((player) => (
                  <div
                    key={player.seat}
                    onClick={() => onQuickAction(`cb_mafia_vote_${player.seat}`)}
                    className="p-2.5 bg-[#17212b] hover:bg-[#202d3b] rounded-xl border border-[#242f3d] transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-bold text-slate-200">صندلی [{player.seat}]</span>
                      <span className="text-lg group-hover:scale-125 transition-transform">{player.emoji}</span>
                    </div>
                    <div className="text-xs font-semibold text-white truncate">{player.name}</div>
                    <div className="text-[10px] text-slate-400 truncate">{player.role}</div>
                    <div className="mt-1.5 flex items-center justify-between text-[9px] pt-1 border-t border-[#242f3d]">
                      <span className="text-emerald-400 font-bold">🟢 زنده</span>
                      <span className="text-slate-400 group-hover:text-[#0088cc]">رای / انتخاب ↵</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Phase Controls (button.php action triggers) */}
            <div className="bg-[#17212b] p-3 rounded-xl border border-[#242f3d] space-y-2">
              <span className="text-xs font-bold text-amber-300 block">⚡ پنل کنترل فازها و رویدادهای زنده (button.php):</span>
              <div className="flex flex-wrap gap-2 text-xs">
                <button
                  onClick={() => onQuickAction('cb_mafia_act_night')}
                  className="px-3 py-1.5 bg-[#0e1621] hover:bg-[#242f3d] text-indigo-300 border border-indigo-500/30 rounded-lg font-medium cursor-pointer"
                >
                  🌙 اکشن شبانه (شلیک/نجات/استعلام)
                </button>
                <button
                  onClick={() => onQuickAction('cb_mafia_day_start')}
                  className="px-3 py-1.5 bg-[#0e1621] hover:bg-[#242f3d] text-amber-300 border border-amber-500/30 rounded-lg font-medium cursor-pointer"
                >
                  ☀️ طلوع صبح و گزارش تلفات شب
                </button>
                <button
                  onClick={() => onQuickAction('cb_mafia_start_voting')}
                  className="px-3 py-1.5 bg-[#0e1621] hover:bg-[#242f3d] text-rose-300 border border-rose-500/30 rounded-lg font-medium cursor-pointer"
                >
                  🗳️ آغاز رای‌گیری خروج روز
                </button>
                <button
                  onClick={() => onQuickAction('cb_mafia_table')}
                  className="px-3 py-1.5 bg-[#0e1621] hover:bg-[#242f3d] text-sky-300 border border-sky-500/30 rounded-lg font-medium cursor-pointer"
                >
                  📋 مشاهده جدول زنده (table.php)
                </button>
                <button
                  onClick={() => onQuickAction('cb_mafia_roles_help')}
                  className="px-3 py-1.5 bg-[#0e1621] hover:bg-[#242f3d] text-slate-300 border border-slate-600 rounded-lg font-medium cursor-pointer"
                >
                  📜 راهنمای نقش‌ها
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. CLASH OF CLANS */}
      {activeTab === 'clash' && (
        <div className="space-y-4">
          <div className="bg-[#0e1621] rounded-xl border border-[#242f3d] p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Swords className="w-5 h-5 text-amber-500" />
                <h4 className="font-bold text-sm text-white">دهکده کلش آف کلنز متنی (SlowClash)</h4>
              </div>
              <span className="bg-amber-500/20 text-amber-400 text-xs px-2.5 py-1 rounded-lg border border-amber-500/30">
                تاون‌هال لول ۳ ⭐
              </span>
            </div>

            {/* Resources Progress */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              <div className="bg-[#17212b] p-3 rounded-xl border border-[#242f3d]">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-amber-400 font-bold flex items-center gap-1">
                    🪙 انبار طلا
                  </span>
                  <span className="font-mono text-slate-300">8,500 / 15,000</span>
                </div>
                <div className="w-full bg-[#242f3d] h-2 rounded-full overflow-hidden">
                  <div className="bg-amber-400 h-full rounded-full w-[56%]"></div>
                </div>
              </div>

              <div className="bg-[#17212b] p-3 rounded-xl border border-[#242f3d]">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-purple-400 font-bold flex items-center gap-1">
                    🧪 انبار اکسیر
                  </span>
                  <span className="font-mono text-slate-300">6,200 / 12,000</span>
                </div>
                <div className="w-full bg-[#242f3d] h-2 rounded-full overflow-hidden">
                  <div className="bg-purple-500 h-full rounded-full w-[51%]"></div>
                </div>
              </div>

              <div className="bg-[#17212b] p-3 rounded-xl border border-[#242f3d]">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-yellow-500 font-bold flex items-center gap-1">
                    🏆 کاپ قهرمانی
                  </span>
                  <span className="font-mono text-slate-300">450 کاپ</span>
                </div>
                <div className="w-full bg-[#242f3d] h-2 rounded-full overflow-hidden">
                  <div className="bg-yellow-400 h-full rounded-full w-[70%]"></div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2 pt-2 border-t border-[#242f3d]">
              <button
                onClick={() => onQuickAction('cb_clash_attack')}
                className="px-4 py-2 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Swords className="w-4 h-4" />
                <span>حمله و غارت دهکده حریف (Raid)</span>
              </button>

              <button
                onClick={() => onQuickAction('cb_clash_collect')}
                className="px-4 py-2 bg-[#242f3d] hover:bg-[#2e3d4e] text-amber-300 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <span>⛏️ برداشت منابع طلا و اکسیر</span>
              </button>

              <button
                onClick={() => onQuickAction('cb_clash_train')}
                className="px-4 py-2 bg-[#242f3d] hover:bg-[#2e3d4e] text-slate-300 rounded-xl text-xs font-medium cursor-pointer"
              >
                <span>🪖 آموزش سربازان</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. CHAT FINDER */}
      {activeTab === 'finder' && (
        <div className="bg-[#0e1621] rounded-xl border border-[#242f3d] p-4 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400 relative">
            <Search className="w-8 h-8 animate-pulse" />
            <span className="absolute inset-0 rounded-full border border-emerald-400/40 animate-ping"></span>
          </div>

          <div>
            <h4 className="font-bold text-sm text-white">رادار همدم‌یاب و چت ناشناس (SlowFinder)</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              هم‌اکنون بیش از ۲,۸۴۰ کاربر آنلاین منتظر گفتگو هستند. سیستم بدون نمایش آیدی یا شماره، شما را به یک نفر متصل می‌کند.
            </p>
          </div>

          <div className="flex justify-center gap-3 pt-2">
            <button
              onClick={() => onQuickAction('cb_finder_random')}
              className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold shadow-lg flex items-center gap-2 cursor-pointer"
            >
              <Zap className="w-4 h-4" />
              <span>اتصال فوری به هم‌صحبت آنلاین</span>
            </button>
          </div>
        </div>
      )}

      {/* 5. SEEN BOOSTER */}
      {activeTab === 'seen' && (
        <div className="bg-[#0e1621] rounded-xl border border-[#242f3d] p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-sky-400" />
              <h4 className="font-bold text-sm text-white">پنل سفارش افزایش سین پست (SlowSeen)</h4>
            </div>
            <span className="text-xs text-slate-400">درگاه پرداخت الکترونیک شتاب</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            {[
              { title: '۱۰۰ سین هدیه', price: 'رایگان', cb: 'cb_seen_free_test', highlight: true },
              { title: '۵۰۰ سین پست', price: '۵,۰۰۰ تومان', cb: 'cb_seen_free_test' },
              { title: '۱,۰۰۰ سین سرعتی', price: '۹,۰۰۰ تومان', cb: 'cb_seen_free_test' },
              { title: '۵,۰۰۰ سین طلایی', price: '۳۵,۰۰۰ تومان', cb: 'cb_seen_free_test' },
            ].map((pkg, i) => (
              <button
                key={i}
                onClick={() => onQuickAction(pkg.cb)}
                className={`p-3.5 rounded-xl border text-center transition-all cursor-pointer ${
                  pkg.highlight
                    ? 'bg-[#0088cc]/10 border-[#0088cc] hover:bg-[#0088cc]/20'
                    : 'bg-[#17212b] border-[#242f3d] hover:bg-[#202d3b]'
                }`}
              >
                <span className="text-xs font-bold text-white block mb-1">{pkg.title}</span>
                <span className="text-[11px] text-emerald-400 font-bold block">{pkg.price}</span>
                <span className="mt-2 block text-[10px] text-slate-400 bg-[#242f3d] py-1 rounded">
                  ارسال به بات
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 6. TOOLS & APIS */}
      {activeTab === 'tools' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Card Lookup */}
            <div className="bg-[#0e1621] p-4 rounded-xl border border-[#242f3d] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-emerald-400" />
                  <h5 className="font-bold text-xs text-white">استعلام کارت بانکی (PUBLIC/API/card.php)</h5>
                </div>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-mono">
                  Luhn Validated
                </span>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={testCardNumber}
                  onChange={(e) => setTestCardNumber(e.target.value)}
                  placeholder="شماره کارت ۱۶ رقمی"
                  className="flex-1 bg-[#17212b] border border-[#242f3d] rounded-lg px-3 py-1.5 text-xs font-mono text-white outline-none"
                />
                <button
                  onClick={() => onQuickAction(testCardNumber)}
                  className="px-3 py-1.5 bg-[#0088cc] hover:bg-[#0099e6] text-white text-xs font-medium rounded-lg cursor-pointer"
                >
                  استعلام زنده
                </button>
              </div>
              
            </div>

            {/* Currency & Crypto Ticker */}
            <div className="bg-[#0e1621] p-4 rounded-xl border border-[#242f3d] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-amber-400" />
                  <h5 className="font-bold text-xs text-white">نرخ زنده ارز و طلا (PUBLIC/Currencyprices)</h5>
                </div>
                <button
                  onClick={() => onQuickAction('cb_tool_currency')}
                  className="text-[10px] text-[#0088cc] hover:underline"
                >
                  ارسال به بات
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-[#17212b] p-2 rounded-lg border border-[#242f3d]">
                  <span className="text-slate-400 text-[10px] block">دلار آمریکا</span>
                  <span className="font-bold text-white font-mono">92,400 T</span>
                </div>
                <div className="bg-[#17212b] p-2 rounded-lg border border-[#242f3d]">
                  <span className="text-slate-400 text-[10px] block">تتر (USDT)</span>
                  <span className="font-bold text-teal-400 font-mono">92,600 T</span>
                </div>
                <div className="bg-[#17212b] p-2 rounded-lg border border-[#242f3d]">
                  <span className="text-slate-400 text-[10px] block">طلای ۱۸ عیار</span>
                  <span className="font-bold text-amber-300 font-mono">5,380,000 T</span>
                </div>
                <div className="bg-[#17212b] p-2 rounded-lg border border-[#242f3d]">
                  <span className="text-slate-400 text-[10px] block">سکه امامی</span>
                  <span className="font-bold text-amber-400 font-mono">61,200,000 T</span>
                </div>
              </div>
            </div>
          </div>

          {/* Real Web Services Quick Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button
              onClick={() => onQuickAction('cb_tool_corona')}
              className="p-3 bg-[#0e1621] hover:bg-[#182330] rounded-xl border border-[#242f3d] text-center cursor-pointer transition-all"
            >
              <span className="text-2xl block mb-1">🦠</span>
              <span className="text-xs font-bold text-white block">آمار زنده کرونا</span>
              <span className="text-[10px] text-slate-400">از disease.sh</span>
            </button>

            <button
              onClick={() => onQuickAction('cb_tool_tempmail')}
              className="p-3 bg-[#0e1621] hover:bg-[#182330] rounded-xl border border-[#242f3d] text-center cursor-pointer transition-all"
            >
              <span className="text-2xl block mb-1">✉️</span>
              <span className="text-xs font-bold text-white block">ایمیل فیک موقت</span>
              <span className="text-[10px] text-slate-400">با اینباکس زنده 1SecMail</span>
            </button>

            <button
              onClick={() => onQuickAction('cb_tool_proxy')}
              className="p-3 bg-[#0e1621] hover:bg-[#182330] rounded-xl border border-[#242f3d] text-center cursor-pointer transition-all"
            >
              <span className="text-2xl block mb-1">🛡️</span>
              <span className="text-xs font-bold text-white block">پروکسی MTProto</span>
              <span className="text-[10px] text-slate-400">سرورهای پینگ زیر ۵۰ms</span>
            </button>

            <button
              onClick={() => onQuickAction('cb_tool_vaksms')}
              className="p-3 bg-[#0e1621] hover:bg-[#182330] rounded-xl border border-[#242f3d] text-center cursor-pointer transition-all"
            >
              <span className="text-2xl block mb-1">📱</span>
              <span className="text-xs font-bold text-white block">شماره مجازی VAK</span>
              <span className="text-[10px] text-slate-400">استعلام از vak-sms.com</span>
            </button>
          </div>
        </div>
      )}

      {/* 7. UPLOADER */}
      {activeTab === 'uploader' && (
        <div className="bg-[#0e1621] rounded-xl border border-[#242f3d] p-6 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border-2 border-dashed border-purple-500/40 flex items-center justify-center mx-auto text-purple-400">
            <UploadCloud className="w-8 h-8" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-white">آپلودر مستقیم تلگرام (SlowUploader)</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              فایل‌های ارسالی شما مستقیماً روی سرورهای ابری قرار گرفته و لینک دانلود مستقیم نیم‌بها برای شما صادر می‌شود.
            </p>
          </div>
          <button
            onClick={() => onQuickAction('cb_uploader_sample')}
            className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer hover:opacity-95"
          >
            ایجاد لینک مستقیم دانلود در چت
          </button>
        </div>
      )}

      {/* 8. LOTTERY */}
      {activeTab === 'lottery' && (
        <div className="bg-[#0e1621] rounded-xl border border-[#242f3d] p-6 text-center space-y-4">
          <div className="relative w-40 h-40 mx-auto">
            <div
              style={{ transform: `rotate(${wheelDegree}deg)`, transition: isSpinning ? 'transform 3.5s cubic-bezier(0.2, 0.8, 0.2, 1)' : 'none' }}
              className="w-full h-full rounded-full border-4 border-amber-400/80 bg-gradient-to-tr from-amber-600 via-rose-600 to-indigo-600 shadow-2xl flex items-center justify-center text-white"
            >
              <div className="text-3xl font-black">🎁</div>
            </div>
            {/* Pointer */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-2xl text-amber-400 drop-shadow">
              ▼
            </div>
          </div>

          {lotteryPrize && (
            <div className="bg-emerald-500/20 text-emerald-300 p-3 rounded-xl border border-emerald-500/30 text-xs font-bold animate-bounce">
              برنده شدید: {lotteryPrize}
            </div>
          )}

          <div>
            <h4 className="font-bold text-sm text-white">گردونه شانس و لاتاری روزانه (LotteryAcc)</h4>
            <p className="text-xs text-slate-400 mt-1">یک دور بچرخانید و جوایز نقدی یا تلگرام پرمیوم ببرید!</p>
          </div>

          <button
            onClick={handleSpinLottery}
            disabled={isSpinning}
            className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white rounded-xl text-xs font-bold shadow-lg disabled:opacity-50 cursor-pointer"
          >
            {isSpinning ? 'در حال چرخش گردونه...' : 'چرخاندن گردونه شانس!'}
          </button>
        </div>
      )}

      {/* 9. LIKE BOOSTER */}
      {activeTab === 'like' && (
        <div className="bg-[#0e1621] rounded-xl border border-[#242f3d] p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-pink-500" />
              <h4 className="font-bold text-sm text-white">سامانه افزایش لایک و واکنش چالش (SlowLike)</h4>
            </div>
            <span className="text-xs text-slate-400">ارسال آنی واکنش</span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => {
                setHeartsCount((c) => c + 10);
                onQuickAction('cb_like_add_50');
              }}
              className="p-3 bg-[#17212b] hover:bg-[#202d3b] rounded-xl border border-[#242f3d] text-center cursor-pointer transition-all"
            >
              <span className="text-3xl block mb-1">❤️</span>
              <span className="text-xs font-bold text-white block">قلب</span>
              <span className="text-xs font-mono text-pink-400">{heartsCount} لایک</span>
            </button>

            <button
              onClick={() => {
                setFiresCount((c) => c + 10);
                onQuickAction('cb_like_add_200');
              }}
              className="p-3 bg-[#17212b] hover:bg-[#202d3b] rounded-xl border border-[#242f3d] text-center cursor-pointer transition-all"
            >
              <span className="text-3xl block mb-1">🔥</span>
              <span className="text-xs font-bold text-white block">آتش</span>
              <span className="text-xs font-mono text-amber-400">{firesCount} ری‌اکشن</span>
            </button>

            <button
              onClick={() => {
                setLikesCount((c) => c + 10);
                onQuickAction('cb_like_add_500');
              }}
              className="p-3 bg-[#17212b] hover:bg-[#202d3b] rounded-xl border border-[#242f3d] text-center cursor-pointer transition-all"
            >
              <span className="text-3xl block mb-1">👍</span>
              <span className="text-xs font-bold text-white block">لایک</span>
              <span className="text-xs font-mono text-sky-400">{likesCount} رای</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 10. WEB PROXY & UNBLOCKER (سورس فیلتر شکن سایت.zip)        */}
      {/* ========================================================= */}
      {activeTab === 'proxy' && (
        <div className="space-y-4">
          <div className="bg-[#0e1621] rounded-xl border border-teal-500/30 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-teal-400" />
                <h4 className="font-bold text-sm text-white">سامانه وب‌پروکسی و دور زدن فیلترینگ سایت‌ها</h4>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 font-mono">
                Bypass & Proxy Engine
              </span>
            </div>
            <p className="text-xs text-slate-400">
              آدرس هر وب‌سایتی را وارد کنید تا از طریق پروکسی سرور بدون سانسور، با رفع خطاهای SSL و بازنویسی کدهای منبع بارگذاری شود.
            </p>

            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={proxyUrl}
                  onChange={(e) => setProxyUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full bg-[#17212b] border border-[#2e3d4e] rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-teal-500"
                />
              </div>
              <button
                onClick={async () => {
                  setProxyLoading(true);
                  const res = await fetchWebProxyUrl(proxyUrl);
                  setProxyResult(res);
                  setProxyLoading(false);
                }}
                disabled={proxyLoading}
                className="px-4 py-2 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {proxyLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>در حال اتصال پروکسی...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5" />
                    <span>عبور از فیلترینگ و باز کردن</span>
                  </>
                )}
              </button>
            </div>

            {/* Quick Presets */}
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
              <span>پیش‌فرض‌های آماده:</span>
              {[
                { name: 'یوتیوب (YouTube)', url: 'https://youtube.com' },
                { name: 'ویکی‌پدیا (Wikipedia)', url: 'https://wikipedia.org' },
                { name: 'داک‌داک‌گو (DuckDuckGo)', url: 'https://duckduckgo.com' },
                { name: 'تلگرام وب (Web Telegram)', url: 'https://web.telegram.org' },
              ].map((preset) => (
                <button
                  key={preset.url}
                  onClick={() => setProxyUrl(preset.url)}
                  className="px-2 py-0.5 bg-[#17212b] hover:bg-[#202d3b] rounded text-slate-300 border border-[#2e3d4e] transition-all cursor-pointer"
                >
                  {preset.name}
                </button>
              ))}
            </div>

            {/* Proxy Result Preview */}
            {proxyResult && (
              <div className="bg-[#17212b] rounded-xl border border-teal-500/40 p-4 space-y-3">
                <div className="flex items-center justify-between text-xs pb-2 border-b border-[#242f3d]">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                    <span className="font-bold text-emerald-400">وضعیت اتصال: ۲۰۰ OK (رمزنگاری فعال)</span>
                  </div>
                  <span className="text-slate-400 font-mono">پینگ: {proxyResult.latencyMs}ms</span>
                </div>
                <div className="text-xs text-slate-300 space-y-1">
                  <p><span className="text-slate-400">عنوان صفحه:</span> <strong className="text-white">{proxyResult.pageTitle}</strong></p>
                  <p><span className="text-slate-400">آدرس سرور تونل:</span> <code className="text-teal-300">{proxyResult.url}</code></p>
                </div>
                <div className="bg-[#0e1621] p-3 rounded-lg border border-[#2e3d4e] text-xs font-mono text-slate-300 max-h-48 overflow-y-auto ltr text-left">
                  <div dangerouslySetInnerHTML={{ __html: proxyResult.contentSnippet }} />
                </div>
              </div>
            )}

            {/* MTProto Proxies Section */}
            <div className="pt-2 border-t border-[#242f3d]">
              <h5 className="font-bold text-xs text-slate-300 mb-2.5 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-teal-400" />
                <span>پروکسی‌های فعال MTProto تلگرام جهت اتصال مستقیم:</span>
              </h5>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {getRealMTProtoProxies().map((proxy, idx) => (
                  <div key={idx} className="bg-[#17212b] p-2.5 rounded-lg border border-[#242f3d] flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                        <span>{proxy.flag}</span>
                        <span>{proxy.country}</span>
                      </div>
                      <span className="text-[10px] text-emerald-400 font-mono">پینگ: {proxy.ping}ms</span>
                    </div>
                    <button
                      onClick={() => onQuickAction('cb_tool_proxies')}
                      className="px-2.5 py-1 bg-[#0088cc] hover:bg-[#0077b5] text-white rounded text-[10px] font-bold cursor-pointer"
                    >
                      اتصال مستقیم
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 11. VIRTUAL NUMBER STORE (سورس فروشگاه شماره مجازی.zip)   */}
      {/* ========================================================= */}
      {activeTab === 'vaksms' && (
        <div className="space-y-4">
          <div className="bg-[#0e1621] rounded-xl border border-emerald-500/30 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-emerald-400" />
                <h4 className="font-bold text-sm text-white">فروشگاه شماره مجازی با دریافت آنی کد تایید SMS</h4>
              </div>
              <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                موجودی: {walletBalance.toLocaleString('fa-IR')} تومان
              </span>
            </div>

            {/* Country Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-2">۱. انتخاب کشور شماره مجازی:</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                {VIRTUAL_NUMBER_COUNTRIES.map((country) => (
                  <button
                    key={country.code}
                    onClick={() => setSelectedCountry(country.code)}
                    className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                      selectedCountry === country.code
                        ? 'bg-emerald-500/20 border-emerald-400 text-white font-bold ring-2 ring-emerald-400/30'
                        : 'bg-[#17212b] border-[#242f3d] text-slate-300 hover:bg-[#202d3b]'
                    }`}
                  >
                    <div className="text-xl mb-1">{country.flag}</div>
                    <div className="text-[11px] font-bold truncate">{country.nameFa}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{country.dialCode}</div>
                    <div className="text-[10px] text-emerald-400 mt-1 font-bold">{country.priceToman.toLocaleString('fa-IR')} ت</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Service Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-2">۲. انتخاب سرویس (سایت یا اپلیکیشن):</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                {VIRTUAL_NUMBER_SERVICES.map((srv) => (
                  <button
                    key={srv.id}
                    onClick={() => setSelectedService(srv.id)}
                    className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                      selectedService === srv.id
                        ? 'bg-emerald-500/20 border-emerald-400 text-white font-bold ring-2 ring-emerald-400/30'
                        : 'bg-[#17212b] border-[#242f3d] text-slate-300 hover:bg-[#202d3b]'
                    }`}
                  >
                    <div className="text-xl mb-1">{srv.icon}</div>
                    <div className="text-xs font-bold truncate">{srv.nameFa}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Order Action */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-[#242f3d]">
              <div>
                <span className="text-xs text-slate-400">قیمت نهایی شماره: </span>
                <strong className="text-sm text-emerald-400 font-bold">
                  {Math.round(
                    (VIRTUAL_NUMBER_COUNTRIES.find((c) => c.code === selectedCountry)?.priceToman || 18500) *
                      (VIRTUAL_NUMBER_SERVICES.find((s) => s.id === selectedService)?.multiplier || 1.0)
                  ).toLocaleString('fa-IR')}{' '}
                  تومان
                </strong>
              </div>
              <button
                onClick={() => {
                  setIsOrderingNum(true);
                  const order = orderVirtualPhoneNumber(selectedCountry, selectedService, 12345678);
                  setVirtualOrders([order, ...virtualOrders]);
                  confetti({ particleCount: 50, spread: 60 });
                  setIsOrderingNum(false);
                }}
                disabled={isOrderingNum}
                className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white rounded-xl text-xs font-bold shadow-lg cursor-pointer"
              >
                🛒 خرید و دریافت فوری شماره مجازی
              </button>
            </div>

            {/* Active Orders List */}
            {virtualOrders.length > 0 && (
              <div className="pt-3 border-t border-[#242f3d] space-y-2">
                <h5 className="font-bold text-xs text-slate-200">شماره‌های خریداری شده و کدهای پیامکی دریافتی:</h5>
                <div className="space-y-2">
                  {virtualOrders.map((ord) => (
                    <div
                      key={ord.id}
                      className="bg-[#17212b] p-3 rounded-xl border border-[#2e3d4e] flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{ord.flag}</span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-bold text-white ltr">{ord.phoneNumber}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#242f3d] text-slate-300">
                              {ord.serviceNameFa}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400">تاریخ سفارش: {ord.createdAt}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {ord.smsCode ? (
                          <div className="bg-emerald-500/20 border border-emerald-400 px-3 py-1 rounded-lg text-emerald-300 text-xs font-bold flex items-center gap-1.5 animate-pulse">
                            <Check className="w-4 h-4 text-emerald-400" />
                            <span>کد دریافت شد:</span>
                            <span className="font-mono text-sm tracking-widest text-white">{ord.smsCode}</span>
                          </div>
                        ) : ord.status === 'cancelled' ? (
                          <span className="text-xs text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-lg">لغو شد</span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-amber-400 flex items-center gap-1">
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>در انتظار پیامک (مهلت ۲۰ دقیقه)...</span>
                            </span>
                            <button
                              onClick={() => {
                                const target = virtualOrders.find((o) => o.id === ord.id);
                                if (target) {
                                  target.smsCode = Math.floor(10000 + Math.random() * 90000).toString();
                                  target.status = 'code_received';
                                  setVirtualOrders([...virtualOrders]);
                                }
                              }}
                              className="px-2 py-1 bg-[#242f3d] hover:bg-[#2e3d4e] text-[10px] text-slate-300 rounded cursor-pointer"
                            >
                              دریافت فوری کد
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 12. YOUTUBE DOWNLOADER (سورس ربات دانلودر Youtube.zip)     */}
      {/* ========================================================= */}
      {activeTab === 'youtube' && (
        <div className="space-y-4">
          <div className="bg-[#0e1621] rounded-xl border border-red-500/30 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Video className="w-5 h-5 text-red-500" />
                <h4 className="font-bold text-sm text-white">ربات دانلودر پیشرفته ویدیو و صوت یوتیوب (Full HD)</h4>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 font-mono">
                YouTube MP4 / MP3 Pro
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={ytUrl}
                onChange={(e) => setYtUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="flex-1 bg-[#17212b] border border-[#2e3d4e] rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-red-500"
              />
              <button
                onClick={() => {
                  setYtLoading(true);
                  setTimeout(() => {
                    setYtDetails(fetchYouTubeVideoDetails(ytUrl));
                    setYtLoading(false);
                  }, 600);
                }}
                disabled={ytLoading}
                className="px-5 py-2 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer flex items-center justify-center gap-1.5"
              >
                {ytLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                <span>تحلیل لینک و دریافت کیفیت‌ها</span>
              </button>
            </div>

            {/* Video Details Card */}
            {ytDetails && (
              <div className="bg-[#17212b] rounded-xl border border-[#2e3d4e] p-4 space-y-4">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="relative w-full md:w-64 h-36 rounded-lg overflow-hidden bg-black flex-shrink-0">
                    <img src={ytDetails.thumbnail} alt={ytDetails.title} className="w-full h-full object-cover" />
                    <span className="absolute bottom-2 right-2 bg-black/80 text-white text-[10px] font-mono px-1.5 py-0.5 rounded">
                      {ytDetails.duration}
                    </span>
                  </div>

                  <div className="space-y-2 flex-1">
                    <h5 className="font-bold text-sm text-white line-clamp-2">{ytDetails.title}</h5>
                    <div className="text-xs text-slate-400 space-y-1">
                      <p>📺 کانال: <strong className="text-slate-200">{ytDetails.channel}</strong></p>
                      <p>👁️ بازدید: <strong className="text-slate-200">{ytDetails.views}</strong> | ⏱️ مدت: {ytDetails.duration}</p>
                    </div>

                    <div className="pt-2">
                      <span className="text-xs font-bold text-slate-300 block mb-2">کیفیت‌های آماده دانلود مستقیم:</span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {ytDetails.formats.map((fmt, idx) => (
                          <a
                            key={idx}
                            href={fmt.downloadUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2.5 rounded-lg bg-[#0e1621] hover:bg-[#202d3b] border border-[#242f3d] flex items-center justify-between transition-all"
                          >
                            <div className="flex items-center gap-2">
                              <Download className="w-4 h-4 text-red-400" />
                              <div>
                                <span className="text-xs font-bold text-white block">{fmt.quality}</span>
                                <span className="text-[10px] text-slate-400">{fmt.resolution}</span>
                              </div>
                            </div>
                            <span className="text-xs font-mono text-emerald-400 font-bold">{fmt.sizeMb} MB</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Video Demo Player */}
                <div className="pt-3 border-t border-[#242f3d]">
                  <span className="text-xs font-bold text-slate-300 block mb-2">پیش‌نمایش آنلاین در محیط شبیه‌ساز:</span>
                  <div className="rounded-xl overflow-hidden bg-black max-h-64 flex justify-center">
                    <video
                      controls
                      src="https://www.w3schools.com/html/mov_bbb.mp4"
                      className="w-full max-h-60"
                      poster={ytDetails.thumbnail}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 13. MUSIC SEARCH (سورس ربات جست و جوی اهنگ.zip / ملوبات) */}
      {/* ========================================================= */}
      {activeTab === 'music' && (
        <div className="space-y-4">
          <div className="bg-[#0e1621] rounded-xl border border-violet-500/30 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Music className="w-5 h-5 text-violet-400" />
                <h4 className="font-bold text-sm text-white">موتور جستجوی آهنگ و پخش آنلاین موزیک (ملوبات و ملودیفا)</h4>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 font-mono">
                Music Search Engine
              </span>
            </div>

            <div className="relative">
              <input
                type="text"
                value={musicQuery}
                onChange={(e) => {
                  setMusicQuery(e.target.value);
                  setMusicList(searchMusicDatabase(e.target.value));
                }}
                placeholder="نام آهنگ، خواننده یا بخشی از متن ترانه را جستجو کنید..."
                className="w-full bg-[#17212b] border border-[#2e3d4e] rounded-xl pr-10 pl-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
              />
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
            </div>

            {/* Now Playing Bar */}
            {currentTrack && (
              <div className="bg-gradient-to-r from-violet-950/60 to-[#17212b] p-3.5 rounded-xl border border-violet-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <img src={currentTrack.coverUrl} alt={currentTrack.title} className="w-12 h-12 rounded-lg object-cover shadow" />
                  <div>
                    <h5 className="font-bold text-xs text-white">{currentTrack.title}</h5>
                    <span className="text-[11px] text-violet-300">{currentTrack.artist}</span>
                    <span className="text-[10px] text-slate-400 block font-mono">مدت: {currentTrack.duration} | سال {currentTrack.releaseYear}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <audio
                    controls
                    src={currentTrack.audioUrl320}
                    className="h-8 max-w-[220px]"
                  />
                  {currentTrack.lyrics && (
                    <button
                      onClick={() => setShowLyricsModal(currentTrack.lyrics || null)}
                      className="px-2.5 py-1.5 bg-[#242f3d] hover:bg-[#2e3d4e] text-slate-300 rounded-lg text-xs cursor-pointer"
                    >
                      متن ترانه
                    </button>
                  )}
                  <a
                    href={currentTrack.audioUrl320}
                    download
                    className="px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>320k</span>
                  </a>
                </div>
              </div>
            )}

            {/* Tracks Catalog */}
            <div className="space-y-2">
              <h5 className="text-xs font-bold text-slate-300">نتایج برتر آرشیو موسیقی ({musicList.length} ترانه):</h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {musicList.map((track) => (
                  <div
                    key={track.id}
                    className="p-2.5 rounded-xl bg-[#17212b] hover:bg-[#202d3b] border border-[#242f3d] flex items-center justify-between gap-2 transition-all"
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <img src={track.coverUrl} alt={track.title} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                      <div className="overflow-hidden">
                        <span className="text-xs font-bold text-white block truncate">{track.title}</span>
                        <span className="text-[11px] text-slate-400 block truncate">{track.artist}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => {
                          setCurrentTrack(track);
                          setIsPlayingMusic(true);
                        }}
                        className="p-1.5 rounded-lg bg-violet-600/30 text-violet-300 hover:bg-violet-600 hover:text-white cursor-pointer transition-all"
                      >
                        <Play className="w-3.5 h-3.5" />
                      </button>
                      <a
                        href={track.audioUrl320}
                        download
                        className="p-1.5 rounded-lg bg-[#242f3d] text-slate-300 hover:text-white cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Lyrics Modal */}
            {showLyricsModal && (
              <div className="bg-[#17212b] p-4 rounded-xl border border-violet-500/30 space-y-2">
                <div className="flex items-center justify-between border-b border-[#242f3d] pb-2">
                  <span className="font-bold text-xs text-violet-300">📝 متن کامل ترانه (Lyrics):</span>
                  <button onClick={() => setShowLyricsModal(null)} className="text-slate-400 hover:text-white text-xs cursor-pointer">
                    بستن ✕
                  </button>
                </div>
                <pre className="text-xs text-slate-200 font-sans whitespace-pre-wrap leading-relaxed">
                  {showLyricsModal}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 14. ARZY RATES (arzy.php)                                */}
      {/* ========================================================= */}
      {activeTab === 'arzy' && (
        <div className="space-y-4">
          <div className="bg-[#0e1621] rounded-xl border border-amber-500/30 p-5 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Coins className="w-5 h-5 text-amber-400" />
                <h4 className="font-bold text-sm text-white">تابلوی جامع نرخ لحظه‌ای ارز، طلا، سکه و رمزارزها (arzy.php)</h4>
              </div>
              <button
                onClick={async () => {
                  try {
                    const res = await fetch('/api/arzy/detailed');
                    const data = await res.json();
                    if (Array.isArray(data) && data.length > 0) {
                      setArzyRates(data);
                    } else {
                      setArzyRates(fetchDetailedArzyRates());
                    }
                  } catch {
                    setArzyRates(fetchDetailedArzyRates());
                  }
                }}
                className="px-3 py-1 bg-[#242f3d] hover:bg-[#2e3d4e] text-slate-300 rounded-lg text-xs flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>به‌روزرسانی زنده</span>
              </button>
            </div>

            {/* Category Filter */}
            <div className="flex gap-1.5 p-1 bg-[#17212b] rounded-xl border border-[#242f3d]">
              {[
                { id: 'all', label: 'همه بازارها' },
                { id: 'currency', label: '💵 ارزهای اصلی' },
                { id: 'gold_coin', label: '🪙 طلا و سکه' },
                { id: 'crypto', label: '💎 ارز دیجیتال' },
              ].map((c) => (
                <button
                  key={c.id}
                  onClick={() => setArzyCategory(c.id as any)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    arzyCategory === c.id
                      ? 'bg-amber-500 text-slate-950 shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            {/* Rates Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {arzyRates
                .filter((r) => arzyCategory === 'all' || r.category === arzyCategory)
                .map((rate) => (
                  <div
                    key={rate.key}
                    className="bg-[#17212b] p-3 rounded-xl border border-[#242f3d] hover:border-amber-500/30 transition-all space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xl">{rate.icon}</span>
                        <span className="text-xs font-bold text-white truncate">{rate.nameFa}</span>
                      </div>
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
                          rate.changePercent24h >= 0
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : 'bg-rose-500/10 text-rose-400'
                        }`}
                      >
                        {rate.changePercent24h >= 0 ? '+' : ''}
                        {rate.changePercent24h}%
                      </span>
                    </div>

                    <div className="flex items-baseline justify-between pt-1">
                      <span className="text-sm font-bold font-mono text-amber-300">
                        {rate.priceToman.toLocaleString('fa-IR')}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {rate.category === 'crypto' && rate.key !== 'usdt' ? 'دلار آمریکا' : 'تومان'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono pt-1 border-t border-[#242f3d]">
                      <span>بالاترین: {rate.high24h.toLocaleString('fa-IR')}</span>
                      <span>پایین‌ترین: {rate.low24h.toLocaleString('fa-IR')}</span>
                    </div>
                  </div>
                ))}
            </div>

            {/* Live Converter Calculator */}
            <div className="bg-[#17212b] p-4 rounded-xl border border-[#242f3d] space-y-3">
              <h5 className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                <Calculator className="w-4 h-4 text-amber-400" />
                <span>ماشین‌حساب لحظه‌ای تبدیل ارز به ریال و تومان (arzy calculator):</span>
              </h5>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">مبلغ موردنظر:</label>
                  <input
                    type="number"
                    value={calcAmount}
                    onChange={(e) => setCalcAmount(Number(e.target.value) || 0)}
                    className="w-full bg-[#0e1621] border border-[#2e3d4e] rounded-lg px-3 py-1.5 text-xs text-white font-mono"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">ارز مبدا:</label>
                  <select
                    value={calcFrom}
                    onChange={(e) => setCalcFrom(e.target.value)}
                    className="w-full bg-[#0e1621] border border-[#2e3d4e] rounded-lg px-3 py-1.5 text-xs text-white"
                  >
                    <option value="usd">دلار آمریکا (آزاد)</option>
                    <option value="eur">یورو اروپا</option>
                    <option value="aed">درهم امارات</option>
                    <option value="gbp">پوند انگلیس</option>
                    <option value="usdt">تتر دیجیتال (USDT)</option>
                    <option value="gold_18k">طلای ۱۸ عیار (گرم)</option>
                    <option value="coin_emami">سکه تمام امامی</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">معادل تقریبی به تومان:</label>
                  <div className="w-full bg-[#0e1621] border border-amber-500/40 rounded-lg px-3 py-1.5 text-xs text-amber-300 font-bold font-mono">
                    {(
                      calcAmount *
                      (arzyRates.find((r) => r.key === calcFrom)?.priceToman || 267900)
                    ).toLocaleString('fa-IR')}{' '}
                    تومان
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 15. APLO ADVANCED UPLOADER (aplo.zip)                      */}
      {/* ========================================================= */}
      {activeTab === 'aplo' && (
        <div className="space-y-4">
          <div className="bg-[#0e1621] rounded-xl border border-blue-500/30 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-blue-400" />
                <h4 className="font-bold text-sm text-white">سامانه آپلودر دائمی فایل و لینک مستقیم (aplo.zip)</h4>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-mono">
                Direct Cloud Storage
              </span>
            </div>

            {/* Upload Simulator Controls */}
            <div className="bg-[#17212b] p-4 rounded-xl border border-[#242f3d] space-y-3">
              <h5 className="font-bold text-xs text-slate-200">آپلود فایل جدید با مشخصات دلخواه:</h5>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">نام فایل:</label>
                  <input
                    type="text"
                    value={newFileName}
                    onChange={(e) => setNewFileName(e.target.value)}
                    className="w-full bg-[#0e1621] border border-[#2e3d4e] rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">حجم تقریبی (MB):</label>
                  <input
                    type="number"
                    value={newFileSizeMb}
                    onChange={(e) => setNewFileSizeMb(Number(e.target.value) || 1)}
                    className="w-full bg-[#0e1621] border border-[#2e3d4e] rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">ماندگاری لینک:</label>
                  <select
                    value={newFileExpiry}
                    onChange={(e) => setNewFileExpiry(Number(e.target.value))}
                    className="w-full bg-[#0e1621] border border-[#2e3d4e] rounded-lg px-2.5 py-1.5 text-xs text-white"
                  >
                    <option value={7}>۷ روزه</option>
                    <option value={30}>۳۰ روزه</option>
                    <option value={365}>دائمی و نامحدود</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">رمز عبور (اختیاری):</label>
                  <input
                    type="text"
                    value={newFilePassword}
                    onChange={(e) => setNewFilePassword(e.target.value)}
                    placeholder="اختیاری..."
                    className="w-full bg-[#0e1621] border border-[#2e3d4e] rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                  />
                </div>
              </div>

              <button
                onClick={() => {
                  const created = createAploUpload(
                    { name: newFileName, size: Math.round(newFileSizeMb * 1024 * 1024), type: 'application/octet-stream' },
                    newFileExpiry,
                    newFilePassword || undefined
                  );
                  setAploFiles([created, ...aploFiles]);
                  confetti({ particleCount: 60, spread: 70 });
                }}
                className="w-full py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer flex items-center justify-center gap-1.5"
              >
                <UploadCloud className="w-4 h-4" />
                <span>آپلود فایل و صدور آنی لینک دانلود مستقیم</span>
              </button>
            </div>

            {/* Files List Table */}
            <div className="space-y-2">
              <h5 className="font-bold text-xs text-slate-300">فهرست فایل‌های آپلود شده در این اکانت ({aploFiles.length} فایل):</h5>
              <div className="space-y-2">
                {aploFiles.map((file) => (
                  <div
                    key={file.id}
                    className="bg-[#17212b] p-3 rounded-xl border border-[#242f3d] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 flex-shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-white">{file.fileName}</span>
                          {file.isPasswordProtected && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 flex items-center gap-1">
                              <Lock className="w-3 h-3" />
                              <span>رمزدار</span>
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-3 mt-0.5">
                          <span>حجم: {(file.fileSize / 1024 / 1024).toFixed(2)} مگابایت</span>
                          <span>انقضا: {file.expiresAt}</span>
                          <span>دانلودها: {file.downloadsCount} بار</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setQrCodePreview(file.qrCodeUrl)}
                        className="px-2.5 py-1.5 bg-[#242f3d] hover:bg-[#2e3d4e] text-slate-300 rounded-lg text-xs flex items-center gap-1 cursor-pointer"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        <span>QR Code</span>
                      </button>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(`https://slowmega.bot${file.downloadUrl}`);
                          alert('لینک مستقیم کپی شد!');
                        }}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>کپی لینک</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* QR Code Preview Modal */}
            {qrCodePreview && (
              <div className="bg-[#17212b] p-4 rounded-xl border border-blue-500/30 text-center space-y-2">
                <span className="text-xs font-bold text-slate-200 block">بارکد QR Code دانلود مستقیم در گوشی:</span>
                <img src={qrCodePreview} alt="QR Code" className="w-32 h-32 mx-auto rounded-lg bg-white p-2" />
                <button
                  onClick={() => setQrCodePreview(null)}
                  className="px-4 py-1 bg-[#242f3d] text-slate-300 rounded text-xs cursor-pointer"
                >
                  بستن
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 16. TIKTOK DOWNLOADER (سورس ربات جستجوگر تیک.zip)          */}
      {/* ========================================================= */}
      {activeTab === 'tiktok' && (
        <div className="space-y-4">
          <div className="bg-[#0e1621] rounded-xl border border-cyan-500/30 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-cyan-400" />
                <h4 className="font-bold text-sm text-white">ربات دانلود و استخراج ویدیوی تیک‌تاک بدون واترمرک (No Watermark)</h4>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono">
                TikTok No-WM API
              </span>
            </div>

            <p className="text-xs text-slate-400">
              لینک هر کلیپ، چالش یا رقص تیک‌تاک را وارد کنید تا لوگوی متحرک تیک‌تاک و آیدی شناور از روی ویدیو حذف شده و کیفیت اصلی HD تحویل داده شود.
            </p>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={tiktokUrl}
                onChange={(e) => setTiktokUrl(e.target.value)}
                placeholder="https://www.tiktok.com/@user/video/..."
                className="flex-1 bg-[#17212b] border border-[#2e3d4e] rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-cyan-500"
              />
              <button
                onClick={() => {
                  setTiktokLoading(true);
                  setTimeout(() => {
                    setTiktokDetails(fetchTikTokVideoDetails(tiktokUrl));
                    setTiktokLoading(false);
                    confetti({ particleCount: 40, spread: 50 });
                  }, 500);
                }}
                disabled={tiktokLoading}
                className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer flex items-center justify-center gap-1.5"
              >
                {tiktokLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                <span>دانلود بدون واترمرک</span>
              </button>
            </div>

            {/* TikTok Details Card */}
            {tiktokDetails && (
              <div className="bg-[#17212b] rounded-xl border border-[#2e3d4e] p-4 space-y-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="relative w-full sm:w-48 h-56 rounded-xl overflow-hidden bg-black flex-shrink-0">
                    <img src={tiktokDetails.coverUrl} alt={tiktokDetails.title} className="w-full h-full object-cover" />
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-cyan-500/80 text-white text-[10px] font-bold">
                      No Watermark ✓
                    </span>
                    <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/80 text-white text-[10px] font-mono">
                      {tiktokDetails.durationSec} ثانیه
                    </span>
                  </div>

                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-2">
                      <img src={tiktokDetails.authorAvatar} alt={tiktokDetails.author} className="w-9 h-9 rounded-full object-cover border border-cyan-400" />
                      <div>
                        <strong className="text-xs text-white block">{tiktokDetails.author}</strong>
                        <span className="text-[10px] text-slate-400">تیک‌تاکر تأییدشده</span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-200 line-clamp-2">{tiktokDetails.title}</p>

                    <div className="grid grid-cols-3 gap-2 py-2 border-y border-[#242f3d] text-center">
                      <div>
                        <span className="text-xs font-bold text-pink-400 block font-mono">{tiktokDetails.likes.toLocaleString('fa-IR')}</span>
                        <span className="text-[10px] text-slate-400">پسندیده (Likes)</span>
                      </div>
                      <div>
                        <span className="text-xs font-bold text-sky-400 block font-mono">{tiktokDetails.comments.toLocaleString('fa-IR')}</span>
                        <span className="text-[10px] text-slate-400">دیدگاه</span>
                      </div>
                      <div>
                        <span className="text-xs font-bold text-emerald-400 block font-mono">{tiktokDetails.shares.toLocaleString('fa-IR')}</span>
                        <span className="text-[10px] text-slate-400">اشتراک‌گذاری</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-1">
                      <a
                        href={tiktokDetails.videoNoWatermarkUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow"
                      >
                        <Download className="w-4 h-4" />
                        <span>دانلود ویدیوی بدون واترمرک (MP4 HD)</span>
                      </a>
                      <a
                        href={tiktokDetails.audioUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-[#242f3d] hover:bg-[#2e3d4e] text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Volume2 className="w-4 h-4 text-cyan-400" />
                        <span>استخراج صوت (MP3)</span>
                      </a>
                    </div>
                  </div>
                </div>

                {/* Video Demo Player */}
                <div className="pt-2 border-t border-[#242f3d]">
                  <video
                    controls
                    src="https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4"
                    className="w-full max-h-56 rounded-lg bg-black"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
