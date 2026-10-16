import { UploadProgressBar } from './UploadProgressBar';
import { LinkPreview } from './LinkPreview';
import { TelegramWebAppBridge } from './TelegramWebAppBridge';
import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Smile,
  Paperclip,
  CheckCheck,
  Bot,
  RotateCcw,
  Sparkles,
  Zap,
  Volume2,
  VolumeX,
  Keyboard,
  ExternalLink,
  Play,
  Pause,
  Download,
  Film,
  Music,
  UserCheck,
  Image as ImageIcon,
  Mic,
  MicOff,
  Copy,
  Check,
  User,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  TelegramMessage,
  TelegramUser,
  InlineKeyboardMarkup,
  ReplyKeyboardMarkup,
} from '../types/telegram';
import { MAIN_REPLY_KEYBOARD } from '../services/botEngine';
import { extractUrlFromText } from '../services/realApis';

interface Props {
  onSendMessage: (text: string) => Promise<void>;
  onCallbackQuery: (callbackData: string, message: TelegramMessage) => Promise<void>;
  messages: TelegramMessage[];
  isTyping: boolean;
  currentUser: TelegramUser;
  connectedBotUsername?: string;
  onQuickCommand: (cmd: string) => void;
  walletBalance: number;
  onOpenProfile: () => void;
}

export const TelegramSimulator: React.FC<Props> = ({
  onSendMessage,
  onCallbackQuery,
  messages,
  isTyping,
  currentUser,
  connectedBotUsername,
  onQuickCommand,
  walletBalance,
  onOpenProfile,
}) => {
  const [inputText, setInputText] = useState('');
  const [showReplyKeyboard, setShowReplyKeyboard] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [isWebAppExpanded, setIsWebAppExpanded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const getDirectDownloadUrl = (url?: string, filename?: string) => {
    if (!url) return '';
    if (url.startsWith('/api/media/stream')) return url;
    return `/api/media/stream?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename || 'media_download.mp4')}`;
  };

  const toggleSpeechRecognition = () => {
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      alert('مرورگر شما از قابلیت تشخیص گفتار (Speech Recognition) پشتیبانی نمی‌کند.');
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognitionAPI();
      recognition.lang = 'fa-IR';
      recognition.interimResults = true;
      recognition.continuous = false;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
        }
        setInputText(transcript);
      };

      recognition.onerror = (event: any) => {
        setIsListening(false);
        const errType = event?.error;
        if (errType === 'not-allowed' || errType === 'service-not-allowed' || errType === 'permission-denied') {
          console.warn('Speech recognition: Microphone access not allowed or blocked in current environment.');
          alert('🎙️ دسترسی به میکروفون مجاز نیست یا در مرورگر مسدود شده است.\nلطفاً دسترسی میکروفون را در مرورگر مجاز کرده یا پیام را تایپ نمایید.');
        } else if (errType === 'no-speech') {
          console.warn('Speech recognition: No speech detected.');
        } else if (errType === 'aborted') {
          // Aborted by user or system
        } else {
          console.warn('Speech recognition status:', errType || 'ended');
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (err) {
      console.warn('Failed to start speech recognition:', err);
      setIsListening(false);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;
    const textToSend = inputText;
    setInputText('');
    await onSendMessage(textToSend);
  };

  const playClickFeedback = () => {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(580, ctx.currentTime);
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch {
      // AudioContext not supported
    }
  };

  const handleInlineClick = async (cbData: string, msg: TelegramMessage) => {
    playClickFeedback();
    if (cbData.includes('spin') || cbData.includes('attack') || cbData.includes('save')) {
      confetti({
        particleCount: 30,
        spread: 60,
        origin: { y: 0.7 },
      });
    }
    await onCallbackQuery(cbData, msg);
  };

  const handleReplyBtnClick = (btnText: string) => {
    playClickFeedback();
    onSendMessage(btnText);
  };

  // Find latest reply keyboard from bot messages or fallback to default
  const latestBotReplyMarkup = [...messages]
    .reverse()
    .find((m) => m.reply_markup && 'keyboard' in m.reply_markup)?.reply_markup as ReplyKeyboardMarkup | undefined;

  const currentReplyKeyboard = latestBotReplyMarkup?.keyboard || MAIN_REPLY_KEYBOARD.keyboard;

  return (
    <div className="flex flex-col h-[740px] max-w-4xl mx-auto bg-[#0e1621] rounded-2xl shadow-2xl border border-[#1e2c3a] overflow-hidden select-text">
      {/* Telegram Chat Header */}
      <div className="bg-[#17212b] px-4 py-3 border-b border-[#242f3d] flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-[#2b5278] via-[#0088cc] to-[#40b3e0] flex items-center justify-center text-white shadow-md font-bold text-lg">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-[#17212b] rounded-full animate-pulse"></span>
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="font-bold text-white text-base">
                SlowMegaBot
              </h2>
              <span className="bg-[#0088cc]/20 text-[#0088cc] text-[10px] px-1.5 py-0.5 rounded font-medium border border-[#0088cc]/30">
                ربات جامع
              </span>
              {connectedBotUsername && (
                <span className="bg-emerald-500/20 text-emerald-400 text-[10px] px-1.5 py-0.5 rounded font-medium flex items-center gap-1 border border-emerald-500/30">
                  <Zap className="w-2.5 h-2.5" />
                  @{connectedBotUsername}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 flex items-center gap-2">
              <span className="text-emerald-400 font-medium">آنلاین</span>
              <span>•</span>
              <span>۱۰ ماژول فعال (مافیا، بت، کلش، سین...)</span>
            </p>
          </div>
        </div>

        {/* Quick Action Badges */}
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 bg-[#242f3d]/70 px-2.5 py-1 rounded-lg text-xs text-amber-300 font-medium border border-[#2b5278]/40">
            <span>💰 موجودی:</span>
            <span>{walletBalance.toLocaleString('fa-IR')} ت</span>
          </div>

          <button
            onClick={onOpenProfile}
            className="px-2.5 py-1 text-xs bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 rounded-lg flex items-center gap-1 border border-purple-500/30 transition-all font-medium cursor-pointer"
            title="پروفایل من"
          >
            <User className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">پروفایل</span>
          </button>

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-[#242f3d] transition-colors"
            title={soundEnabled ? 'صدا فعال است' : 'صدا قطع است'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-[#0088cc]" /> : <VolumeX className="w-4 h-4" />}
          </button>

          <button
            onClick={() => onQuickCommand('/start')}
            className="px-2.5 py-1 text-xs bg-[#0088cc]/20 text-[#40b3e0] hover:bg-[#0088cc]/30 rounded-lg flex items-center gap-1 border border-[#0088cc]/30 transition-all font-medium"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>/start</span>
          </button>
        </div>
      </div>

      {/* Telegram WebApp Bridge Component */}
      <div className="px-4 py-2 bg-[#17212b]/60 border-b border-[#242f3d]">
        <TelegramWebAppBridge
          isExpanded={isWebAppExpanded}
          onToggleExpand={() => setIsWebAppExpanded(!isWebAppExpanded)}
        />
      </div>

      {/* Messages Stream Container (Telegram Wallpaper Pattern style) */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#0e1621] bg-opacity-95 relative scroll-smooth">
        {/* Telegram Date Separator */}
        <div className="flex justify-center my-2">
          <span className="bg-[#17212b]/80 backdrop-blur text-slate-300 text-[11px] px-3 py-0.5 rounded-full shadow border border-[#242f3d]/60">
            امروز • سامانه هوشمند SlowMegaBot
          </span>
        </div>

        {messages.map((msg, idx) => {
          const isUser = msg.from?.id === currentUser.id;
          const inlineKeyboard = msg.reply_markup && 'inline_keyboard' in msg.reply_markup
            ? (msg.reply_markup as InlineKeyboardMarkup).inline_keyboard
            : null;

          return (
            <div
              key={`${msg.message_id}_${idx}`}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-full`}
            >
              {/* Message Bubble */}
              <div
                className={`rounded-2xl px-3.5 py-2.5 max-w-[90%] sm:max-w-[78%] shadow-md transition-all ${
                  isUser
                    ? 'bg-[#2b5278] text-white rounded-br-none border border-[#3b6694]/50'
                    : 'bg-[#182533] text-slate-100 rounded-bl-none border border-[#242f3d]'
                }`}
              >
                {!isUser && (
                  <div className="flex items-center gap-1 text-[11px] font-bold text-[#40b3e0] mb-1">
                    <span>SlowMegaBot</span>
                    <Sparkles className="w-3 h-3 text-amber-400" />
                  </div>
                )}

                {/* User Link Recognition Badge & Destination Link Preview Card */}
                {isUser && msg.text && extractUrlFromText(msg.text) && (
                  <div className="mb-2.5 space-y-1.5">
                    <div className="px-2.5 py-1.5 rounded-lg bg-[#0088cc]/25 border border-[#0088cc]/40 text-[11px] text-sky-100 flex items-center justify-between gap-1.5 shadow-xs">
                      <span className="flex items-center gap-1.5 truncate font-mono text-[10px]">
                        <span>🔗</span>
                        <span className="truncate">{extractUrlFromText(msg.text)}</span>
                      </span>
                      <span className="bg-amber-400 text-slate-950 font-bold px-1.5 py-0.5 rounded text-[9px] shrink-0">
                        تحلیل خودکار لینک ⚡
                      </span>
                    </div>
                    <LinkPreview url={extractUrlFromText(msg.text)!} />
                  </div>
                )}

                {/* Visual Upload Progress Bar Component for Uploader Commands */}
                {msg.uploadProgress && (
                  <UploadProgressBar
                    data={msg.uploadProgress}
                    onCopyFeedback={() => {
                      playClickFeedback();
                      confetti({ particleCount: 25, spread: 55 });
                    }}
                  />
                )}

                {/* Embedded Video Media Player with Direct Download */}
                {(msg.mediaAttachment?.type === 'video' || msg.videoUrl) && (
                  <div className="rounded-xl overflow-hidden mb-2.5 bg-black border border-[#2b3e52] shadow-md group">
                    {/* Video Header Bar */}
                    <div className="px-3 py-1.5 bg-[#0e1621] border-b border-[#1c2936] flex items-center justify-between text-[11px] text-slate-300">
                      <div className="flex items-center gap-1.5 truncate">
                        <Film className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="truncate font-semibold text-white">
                          {msg.mediaAttachment?.title || 'ویدیوی استخراج‌شده'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 font-mono text-[10px]">
                        <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded font-bold">
                          {msg.mediaAttachment?.quality || '1080p Full HD'}
                        </span>
                        {msg.mediaAttachment?.sizeMb && (
                          <span className="text-slate-400">{msg.mediaAttachment.sizeMb} MB</span>
                        )}
                      </div>
                    </div>

                    {/* Video Element */}
                    <video
                      controls
                      poster={msg.mediaAttachment?.previewUrl || msg.photoUrl}
                      src={msg.videoUrl || msg.mediaAttachment?.url}
                      className="w-full max-h-72 object-contain bg-black"
                      playsInline
                    />

                    {/* Video Direct Download & Actions Bar */}
                    <div className="p-2 bg-[#0e1621] border-t border-[#1c2936] flex items-center justify-between gap-2">
                      <span className="text-[10px] text-slate-400 truncate flex items-center gap-1">
                        <span className="text-emerald-400 font-bold">✓</span>
                        <span>فایل اصلی بدون واترمرک</span>
                      </span>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <a
                          href={getDirectDownloadUrl(msg.videoUrl || msg.mediaAttachment?.url, `video_${msg.mediaAttachment?.shortcode || msg.mediaAttachment?.id || 'post'}.mp4`)}
                          download={`video_${msg.mediaAttachment?.shortcode || msg.mediaAttachment?.id || 'post'}.mp4`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => {
                            playClickFeedback();
                            confetti({ particleCount: 30, spread: 60 });
                          }}
                          className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                          title="دانلود مستقیم ویدیو"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>دانلود مستقیم ویدیو</span>
                        </a>

                        {(msg.videoUrl || msg.mediaAttachment?.url) && (
                          <a
                            href={msg.videoUrl || msg.mediaAttachment?.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-slate-400 hover:text-white bg-[#1a2634] hover:bg-[#253548] rounded-lg transition-colors cursor-pointer"
                            title="مشاهده تمام‌صفحه / در تب جدید"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Embedded Audio / Music Player with Direct Download */}
                {(msg.mediaAttachment?.type === 'audio' || msg.audioUrl) && (
                  <div className="p-2.5 rounded-xl bg-[#0e1621] border border-amber-500/30 mb-2.5 space-y-2 shadow-md">
                    <div className="flex items-center justify-between gap-2.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={msg.mediaAttachment?.previewUrl || msg.photoUrl || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=100'}
                          alt="cover"
                          className="w-11 h-11 rounded-lg object-cover border border-amber-400/40 shrink-0 shadow-sm"
                        />
                        <div className="flex-1 min-w-0">
                          <h6 className="font-bold text-xs text-white truncate flex items-center gap-1">
                            <Music className="w-3 h-3 text-amber-400 shrink-0" />
                            <span>{msg.mediaAttachment?.title || 'موزیک و صوت'}</span>
                          </h6>
                          <p className="text-[11px] text-slate-400 truncate mt-0.5">
                            {msg.mediaAttachment?.author || 'کیفیت استودیویی 320kbps'}
                          </p>
                        </div>
                      </div>

                      {/* Direct Audio Download */}
                      {(msg.audioUrl || msg.mediaAttachment?.url) && (
                        <a
                          href={getDirectDownloadUrl(msg.audioUrl || msg.mediaAttachment?.url, `audio_${msg.mediaAttachment?.shortcode || 'audio'}.mp3`)}
                          download={`audio_${msg.mediaAttachment?.shortcode || 'audio'}.mp3`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => {
                            playClickFeedback();
                            confetti({ particleCount: 30, spread: 60 });
                          }}
                          className="px-2.5 py-1.5 bg-violet-600 hover:bg-violet-500 active:bg-violet-700 text-white font-bold rounded-lg text-[11px] flex items-center gap-1 shrink-0 shadow-sm transition-all cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5 text-amber-300" />
                          <span>دانلود MP3</span>
                        </a>
                      )}
                    </div>

                    <audio
                      controls
                      src={msg.audioUrl || msg.mediaAttachment?.url}
                      className="w-full h-8 accent-amber-500 rounded"
                    />
                  </div>
                )}

                {/* Embedded Profile Card with Direct Download */}
                {msg.mediaAttachment?.type === 'profile' && (
                  <div className="p-3 rounded-xl bg-gradient-to-b from-[#1c2c3d] to-[#121c27] border border-sky-500/40 mb-2.5 space-y-2.5 shadow-md">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={msg.mediaAttachment?.profileDetails?.avatarUrl || msg.mediaAttachment?.previewUrl || msg.photoUrl}
                          alt="avatar"
                          className="w-14 h-14 rounded-full object-cover border-2 border-sky-400 shadow-md shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1">
                            <strong className="text-sm font-bold text-white truncate">
                              {msg.mediaAttachment?.profileDetails?.fullName || msg.mediaAttachment?.title}
                            </strong>
                            {msg.mediaAttachment?.profileDetails?.isVerified && (
                              <span className="text-sky-400 font-bold text-xs shrink-0 bg-sky-500/20 px-1 py-0.2 rounded-full">✓</span>
                            )}
                          </div>
                          <p className="text-xs text-sky-300 font-mono mt-0.5">
                            @{msg.mediaAttachment?.profileDetails?.username || msg.mediaAttachment?.author}
                          </p>
                        </div>
                      </div>

                      {(msg.mediaAttachment?.profileDetails?.avatarUrl || msg.mediaAttachment?.previewUrl || msg.photoUrl) && (
                        <a
                          href={getDirectDownloadUrl(msg.mediaAttachment?.profileDetails?.avatarUrl || msg.mediaAttachment?.previewUrl || msg.photoUrl, `avatar_${msg.mediaAttachment?.profileDetails?.username || 'profile'}.jpg`)}
                          download={`avatar_${msg.mediaAttachment?.profileDetails?.username || 'profile'}.jpg`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => {
                            playClickFeedback();
                            confetti({ particleCount: 30, spread: 60 });
                          }}
                          className="px-2.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-lg text-[11px] flex items-center gap-1 shrink-0 shadow-sm transition-all cursor-pointer"
                          title="دانلود عکس پروفایل با کیفیت بالا"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>دانلود عکس</span>
                        </a>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-1.5 bg-[#0e1621] p-2 rounded-lg text-center text-[10px] border border-[#242f3d]">
                      <div>
                        <span className="text-slate-400 block text-[9px]">فالوورها</span>
                        <strong className="text-amber-300 font-bold text-xs">{msg.mediaAttachment?.profileDetails?.followers || '3.8M'}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px]">فالووینگ</span>
                        <strong className="text-slate-200 font-bold text-xs">{msg.mediaAttachment?.profileDetails?.following || '420'}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px]">پست‌ها</span>
                        <strong className="text-slate-200 font-bold text-xs">{msg.mediaAttachment?.profileDetails?.postsCount || '1,280'}</strong>
                      </div>
                    </div>

                    {msg.mediaAttachment?.profileDetails?.bio && (
                      <p className="text-[11px] text-slate-300 leading-snug bg-[#0e1621]/80 p-2 rounded-lg border border-[#242f3d]">
                        {msg.mediaAttachment.profileDetails.bio}
                      </p>
                    )}
                  </div>
                )}

                {/* Embedded Photo Card with Direct Download */}
                {(msg.mediaAttachment?.type === 'photo' || (msg.photoUrl && !msg.videoUrl && !msg.audioUrl && msg.mediaAttachment?.type !== 'profile' && msg.mediaAttachment?.type !== 'video')) && (
                  <div className="rounded-xl overflow-hidden mb-2.5 bg-[#0e1621] border border-[#2b3e52] shadow-md group">
                    <div className="relative overflow-hidden bg-black max-h-80 flex items-center justify-center">
                      <img
                        src={msg.mediaAttachment?.url || msg.photoUrl}
                        alt="media"
                        className="w-full max-h-80 object-cover hover:scale-[1.01] transition-transform"
                      />
                    </div>

                    {/* Photo Download & Action Bar */}
                    <div className="p-2 bg-[#0e1621] border-t border-[#1c2936] flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 truncate text-[11px] text-slate-300">
                        <ImageIcon className="w-3.5 h-3.5 text-pink-400 shrink-0" />
                        <span className="truncate font-medium">
                          {msg.mediaAttachment?.title || 'تصویر اورجینال با کیفیت HD'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <a
                          href={msg.mediaAttachment?.url || msg.photoUrl}
                          download
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => {
                            playClickFeedback();
                            confetti({ particleCount: 30, spread: 60 });
                          }}
                          className="px-3 py-1.5 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-400 hover:to-rose-400 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                          title="دانلود مستقیم تصویر"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>دانلود مستقیم تصویر</span>
                        </a>

                        {(msg.mediaAttachment?.url || msg.photoUrl) && (
                          <a
                            href={msg.mediaAttachment?.url || msg.photoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-slate-400 hover:text-white bg-[#1a2634] hover:bg-[#253548] rounded-lg transition-colors cursor-pointer"
                            title="مشاهده در سایز اصلی"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Formatted Text */}
                <div className="text-[13.5px] leading-relaxed whitespace-pre-wrap font-sans select-text">
                  {renderTelegramFormattedText(msg.text || '')}
                </div>

                {/* Time & Delivery Checks */}
                <div className="flex items-center justify-end gap-1 text-[10px] text-slate-400 mt-1">
                  <span>
                    {new Date(msg.date).toLocaleTimeString('fa-IR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  {isUser && <CheckCheck className="w-3.5 h-3.5 text-[#40b3e0]" />}
                </div>
              </div>



              {/* Inline Buttons (Keyboards) */}
              {inlineKeyboard && inlineKeyboard.length > 0 && (
                <div className="mt-1.5 space-y-1 w-full max-w-[90%] sm:max-w-[78%]">
                  {inlineKeyboard.map((row, rIdx) => (
                    <div key={rIdx} className="flex gap-1.5">
                      {row.map((btn, bIdx) => (
                        <button
                          key={bIdx}
                          onClick={() => {
                            if (btn.callback_data) {
                              handleInlineClick(btn.callback_data, msg);
                            } else if (btn.url) {
                              window.open(btn.url, '_blank');
                            }
                          }}
                          className="flex-1 py-2 px-3 text-xs font-medium text-white bg-[#1e2c3a] hover:bg-[#2b3e52] active:bg-[#0088cc] border border-[#2b3e52] rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 text-center group cursor-pointer"
                        >
                          <span className="truncate">{btn.text}</span>
                          {btn.url && <ExternalLink className="w-3 h-3 opacity-60 group-hover:opacity-100" />}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              )}

              {/* Custom UI Block Below User Message for Instagram, TikTok, and YouTube Links */}
              {isUser && msg.text && (() => {
                const detectedLink = extractUrlFromText(msg.text);
                const isSocial = detectedLink && (
                  detectedLink.includes('instagram.com') ||
                  detectedLink.includes('tiktok.com') ||
                  detectedLink.includes('youtube.com') ||
                  detectedLink.includes('youtu.be')
                );
                if (!isSocial || !detectedLink) return null;
                const platformName = detectedLink.includes('instagram.com') ? 'Instagram' : detectedLink.includes('tiktok.com') ? 'TikTok' : 'YouTube';
                return (
                  <div className="mt-1.5 ml-0 mr-auto w-full max-w-[90%] sm:max-w-[78%] bg-[#17212b] border border-[#242f3d] rounded-xl p-2.5 shadow-lg space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-slate-300 font-medium px-1">
                      <span className="flex items-center gap-1.5 text-sky-400 font-semibold">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        تشخیص خودکار لینک {platformName}:
                      </span>
                      <span className="text-[10px] font-mono text-slate-400 bg-[#0e1621] px-1.5 py-0.5 rounded border border-[#2b3e52]">
                        {platformName}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                      <button
                        onClick={() => onSendMessage(`دانلود پست ${detectedLink}`)}
                        className="px-2.5 py-2 bg-[#2b5278] hover:bg-[#386799] text-white text-[11px] font-medium rounded-lg transition-all flex items-center justify-center gap-1 shadow-sm cursor-pointer"
                        title="Download Post"
                      >
                        <Download className="w-3 h-3 text-amber-300 shrink-0" />
                        <span className="truncate">Download Post</span>
                      </button>
                      <button
                        onClick={() => onSendMessage(`موزیک ${detectedLink}`)}
                        className="px-2.5 py-2 bg-[#1f2e3d] hover:bg-[#283c50] text-sky-300 text-[11px] font-medium rounded-lg transition-all flex items-center justify-center gap-1 border border-[#2b425b] shadow-sm cursor-pointer"
                        title="Extract Audio"
                      >
                        <Music className="w-3 h-3 text-emerald-400 shrink-0" />
                        <span className="truncate">Extract Audio</span>
                      </button>
                      <button
                        onClick={() => onSendMessage(`بیو ${detectedLink}`)}
                        className="px-2.5 py-2 bg-[#1f2e3d] hover:bg-[#283c50] text-purple-300 text-[11px] font-medium rounded-lg transition-all flex items-center justify-center gap-1 border border-[#2b425b] shadow-sm cursor-pointer"
                        title="Get Bio"
                      >
                        <UserCheck className="w-3 h-3 text-purple-400 shrink-0" />
                        <span className="truncate">Get Bio</span>
                      </button>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(detectedLink);
                          setCopiedLink(detectedLink);
                          playClickFeedback();
                          setTimeout(() => setCopiedLink(null), 2000);
                        }}
                        className="px-2.5 py-2 bg-[#1f2e3d] hover:bg-[#283c50] text-emerald-300 text-[11px] font-medium rounded-lg transition-all flex items-center justify-center gap-1 border border-[#2b425b] shadow-sm cursor-pointer"
                        title="Copy Link"
                      >
                        {copiedLink === detectedLink ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                            <span className="truncate text-emerald-300">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3 text-sky-300 shrink-0" />
                            <span className="truncate">Copy Link</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          );
        })}

        {/* Bot Typing Chat Bubble */}
        {isTyping && (
          <div className="flex flex-col items-start max-w-full">
            <div className="rounded-2xl px-4 py-3 max-w-[90%] sm:max-w-[78%] shadow-md bg-[#182533] text-slate-100 rounded-bl-none border border-[#242f3d]">
              <div className="flex items-center gap-1 text-[11px] font-bold text-[#40b3e0] mb-1">
                <span>SlowMegaBot</span>
                <Sparkles className="w-3 h-3 text-amber-400" />
              </div>
              <div className="flex items-center gap-2.5 text-xs text-slate-300 py-1">
                <span className="text-[#40b3e0] font-medium">در حال پردازش درخواست و آماده‌سازی فایل...</span>
                <span className="flex gap-1.5 items-center bg-[#0e1621] px-2.5 py-1.5 rounded-full border border-[#2b3e52]">
                  <span className="w-2 h-2 bg-[#0088cc] rounded-full animate-bounce"></span>
                  <span className="w-2 h-2 bg-[#0088cc] rounded-full animate-bounce [animation-delay:0.2s]"></span>
                  <span className="w-2 h-2 bg-[#0088cc] rounded-full animate-bounce [animation-delay:0.4s]"></span>
                </span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Persistent Reply Keyboard Panel (Bottom Tray like Telegram Mobile/Desktop) */}
      {showReplyKeyboard && currentReplyKeyboard && currentReplyKeyboard.length > 0 && (
        <div className="bg-[#17212b] border-t border-[#242f3d] p-2 space-y-1.5 max-h-48 overflow-y-auto">
          {currentReplyKeyboard.map((row, rIdx) => (
            <div key={rIdx} className="flex gap-1.5">
              {row.map((btn, bIdx) => (
                <button
                  key={bIdx}
                  onClick={() => handleReplyBtnClick(btn.text)}
                  className="flex-1 py-2 px-2 text-xs font-medium text-slate-100 bg-[#242f3d] hover:bg-[#2b3e52] active:scale-[0.98] rounded-xl border border-[#2e3d4e] transition-all truncate text-center shadow-sm cursor-pointer"
                >
                  {btn.text}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Chat Input Bar */}
      <form
        onSubmit={handleSend}
        className="bg-[#17212b] px-3 py-2.5 border-t border-[#242f3d] flex items-center gap-2"
      >
        <button
          type="button"
          onClick={() => setShowReplyKeyboard(!showReplyKeyboard)}
          className={`p-2 rounded-xl transition-colors ${
            showReplyKeyboard ? 'text-[#0088cc] bg-[#242f3d]' : 'text-slate-400 hover:text-white'
          }`}
          title={showReplyKeyboard ? 'مخفی‌سازی کیبورد منو' : 'نمایش کیبورد منو'}
        >
          <Keyboard className="w-5 h-5" />
        </button>

        <button
          type="button"
          onClick={toggleSpeechRecognition}
          className={`p-2 rounded-xl transition-all ${
            isListening
              ? 'text-white bg-red-500 animate-pulse shadow-lg shadow-red-500/30'
              : 'text-slate-400 hover:text-white hover:bg-[#242f3d]'
          }`}
          title={isListening ? 'در حال ضبط صدا... کلیک برای توقف' : 'ضبط صدا (Speech Recognition)'}
        >
          {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>

        <button
          type="button"
          onClick={() => onQuickCommand('/tools')}
          className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-[#242f3d] transition-colors"
          title="پیوست / ابزارها"
        >
          <Paperclip className="w-5 h-5" />
        </button>

        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="پیام یا دستور بنویسید (مثلاً /start، /mafia، /bet، /clash...)"
          className="flex-1 bg-[#242f3d] text-white placeholder-slate-400 text-xs sm:text-sm px-4 py-2.5 rounded-xl border border-transparent focus:border-[#0088cc] outline-none transition-all"
        />

        <button
          type="button"
          onClick={() => setInputText((prev) => prev + ' 🎯 ')}
          className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-[#242f3d] transition-colors hidden sm:block"
        >
          <Smile className="w-5 h-5" />
        </button>

        <button
          type="submit"
          disabled={!inputText.trim()}
          className="w-10 h-10 rounded-xl bg-[#0088cc] hover:bg-[#0099e6] active:scale-95 disabled:opacity-40 disabled:hover:bg-[#0088cc] text-white flex items-center justify-center transition-all shadow-md cursor-pointer shrink-0"
        >
          <Send className="w-4 h-4 rotate-180" />
        </button>
      </form>
    </div>
  );
};

// Helper to render bold markdown and monospace tags nicely
function renderTelegramFormattedText(text: string) {
  // Simple markdown processor for telegram **bold** and `code`
  const parts = text.split('\n');
  return parts.map((line, lIdx) => {
    // Process **bold**
    let formatted: React.ReactNode = line;
    const tokens = line.split(/(\*\*.*?\*\*|\`.*?\`|\*.*?\*)/g);

    return (
      <span key={lIdx} className="block">
        {tokens.map((token, tIdx) => {
          if (token.startsWith('**') && token.endsWith('**')) {
            return (
              <strong key={tIdx} className="font-bold text-white">
                {token.slice(2, -2)}
              </strong>
            );
          }
          if (token.startsWith('*') && token.endsWith('*')) {
            return (
              <strong key={tIdx} className="font-semibold text-amber-200">
                {token.slice(1, -1)}
              </strong>
            );
          }
          if (token.startsWith('`') && token.endsWith('`')) {
            return (
              <code
                key={tIdx}
                className="bg-[#0e1621] text-[#40b3e0] px-1.5 py-0.5 rounded text-xs font-mono border border-[#242f3d]"
              >
                {token.slice(1, -1)}
              </code>
            );
          }
          return token;
        })}
      </span>
    );
  });
}
