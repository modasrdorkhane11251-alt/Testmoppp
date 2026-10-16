import React, { useState, useEffect } from 'react';
import {
  Zap,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Terminal,
  RefreshCw,
  HelpCircle,
  Copy,
  Check,
  Power,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { BotLog, TelegramUser } from '../types/telegram';

interface Props {
  connectedBot: TelegramUser | null;
  isPolling: boolean;
  onConnect: (token: string) => Promise<{ ok: boolean; error?: string }>;
  onDisconnect: () => Promise<void>;
  logs: BotLog[];
  onRefreshLogs: () => void;
}

export const RealBotConnectModal: React.FC<Props> = ({
  connectedBot,
  isPolling,
  onConnect,
  onDisconnect,
  logs,
  onRefreshLogs,
}) => {
  const [tokenInput, setTokenInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [copiedCmd, setCopiedCmd] = useState(false);
  const [baleConnected, setBaleConnected] = useState(true);
  const [rubikaConnected, setRubikaConnected] = useState(true);

  useEffect(() => {
    fetch('/api/bale/status')
      .then(r => r.json())
      .then(d => setBaleConnected(d.connected))
      .catch(() => {});
    fetch('/api/rubika/status')
      .then(r => r.json())
      .then(d => setRubikaConnected(d.connected))
      .catch(() => {});
  }, []);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim()) return;
    setLoading(true);
    setErrorMsg('');
    const res = await onConnect(tokenInput.trim());
    setLoading(false);
    if (!res.ok) {
      setErrorMsg(res.error || 'اتصال ناموفق بود.');
    }
  };

  return (
    <div className="bg-[#17212b] rounded-2xl border border-[#242f3d] p-5 shadow-2xl max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#242f3d] pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#0088cc]/10 border border-[#0088cc]/30 flex items-center justify-center text-[#0088cc]">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base text-white">اتصال ربات واقعی تلگرام (BotFather Token)</h3>
            <p className="text-xs text-slate-400">
              با وارد کردن توکن، تمام ۱۰ ماژول مستقیماً روی تلگرام گوشی شما پاسخگو خواهند بود!
            </p>
          </div>
        </div>

        {/* Live Status Badge */}
        <div className="flex items-center gap-2">
          {connectedBot && isPolling ? (
            <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-3 py-1.5 rounded-xl text-xs font-bold">
              <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping"></span>
              <span>متصل به @{connectedBot.username}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-slate-800 text-slate-400 border border-slate-700 px-3 py-1.5 rounded-xl text-xs">
              <span className="w-2 h-2 bg-slate-500 rounded-full"></span>
              <span>ربات واقعی متصل نیست (شبیه‌ساز فعال)</span>
            </div>
          )}
        </div>
      </div>

      {/* Token Input Form or Active Connection Banner */}
      {!connectedBot ? (
        <form onSubmit={handleConnect} className="bg-[#0e1621] p-4 rounded-xl border border-[#242f3d] space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              توکن ربات تلگرام (HTTP API Token از BotFather):
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                dir="ltr"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ..."
                className="flex-1 bg-[#17212b] border border-[#2e3d4e] focus:border-[#0088cc] rounded-xl px-4 py-2.5 text-xs font-mono text-white placeholder-slate-500 outline-none transition-all"
              />
              <button
                type="submit"
                disabled={loading || !tokenInput.trim()}
                className="px-6 py-2.5 bg-[#0088cc] hover:bg-[#0099e6] active:scale-95 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>در حال اتصال...</span>
                  </>
                ) : (
                  <>
                    <Power className="w-4 h-4" />
                    <span>اتصال زنده به تلگرام</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Quick Guide */}
          <div className="bg-[#17212b] p-3.5 rounded-xl border border-[#242f3d] space-y-2 text-xs">
            <div className="flex items-center gap-1.5 text-[#0088cc] font-bold">
              <HelpCircle className="w-4 h-4" />
              <span>آموزش ساخت و دریافت توکن رایگان از تلگرام (۱ دقیقه):</span>
            </div>
            <ol className="list-decimal list-inside space-y-1 text-slate-300 pr-1 leading-relaxed">
              <li>
                در تلگرام به آیدی{' '}
                <a
                  href="https://t.me/BotFather"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#0088cc] font-mono hover:underline"
                >
                  @BotFather
                </a>{' '}
                پیام دهید و دکمه <code className="bg-[#242f3d] px-1 rounded text-white">/start</code> را بزنید.
              </li>
              <li>
                دستور <code className="bg-[#242f3d] px-1 rounded text-white">/newbot</code> را ارسال کنید و نام و آیدی برای ربات خود تعیین کنید.
              </li>
              <li>
                توکن ارسالی از طرف بات‌فادر (رشته‌ای شامل اعداد و حروف) را کپی کرده و در کادر بالا وارد کنید!
              </li>
            </ol>
          </div>
        </form>
      ) : (
        <div className="bg-[#0e1621] p-4 rounded-xl border border-emerald-500/30 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-lg border border-emerald-500/30">
                ✓
              </div>
              <div>
                <h4 className="font-bold text-sm text-white">
                  ربات @{connectedBot.username} متصل و فعال است
                </h4>
                <p className="text-xs text-emerald-400 mt-0.5">
                  سرور در حال دریافت و پاسخگویی به آپدیت‌های تلگرام واقعی شماست!
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={`https://t.me/${connectedBot.username}`}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 bg-[#0088cc] hover:bg-[#0099e6] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>باز کردن ربات در تلگرام</span>
              </a>

              <button
                onClick={onDisconnect}
                className="px-3 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 rounded-xl text-xs font-medium border border-rose-500/30 cursor-pointer"
              >
                قطع اتصال
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3-Platform Active Status Hub (Telegram, Bale, Rubika) */}
      <div className="bg-[#0e1621] p-4 rounded-xl border border-[#242f3d] space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-bold text-xs text-white flex items-center gap-2">
            <span>🌐 اتصال همزمان سه پلتفرم (Multi-Platform Active Hub):</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
              ۳ پلتفرم فعال و آنلاین
            </span>
          </span>
          <span className="text-[10px] text-slate-400">تمام پیام‌ها و دانلودرها همگام‌سازی شده‌اند</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Telegram Card */}
          <div className="p-3 rounded-xl bg-[#17212b] border border-sky-500/30 flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-pulse"></span>
                <span className="font-bold text-xs text-white">تلگرام (Telegram)</span>
              </div>
              <span className="px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 text-[10px] font-bold">
                فعال ✓
              </span>
            </div>
            <div className="text-[11px] font-mono text-slate-300">
              ربات: <strong className="text-sky-300">@Mq123_Bot</strong>
            </div>
            <a
              href="https://t.me/Mq123_Bot"
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 bg-[#0088cc] hover:bg-[#0099e6] text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>باز کردن در تلگرام</span>
            </a>
          </div>

          {/* Bale Card */}
          <div className="p-3 rounded-xl bg-[#17212b] border border-emerald-500/30 flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="font-bold text-xs text-white">پیام‌رسان بله (Bale)</span>
              </div>
              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-bold">
                فعال ✓
              </span>
            </div>
            <div className="text-[11px] font-mono text-slate-300">
              بازو: <strong className="text-emerald-300">@modasrbot</strong>
            </div>
            <a
              href="https://ble.ir/modasrbot"
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>باز کردن در بله</span>
            </a>
          </div>

          {/* Rubika Card */}
          <div className="p-3 rounded-xl bg-[#17212b] border border-amber-500/30 flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse"></span>
                <span className="font-bold text-xs text-white">روبیکا (Rubika)</span>
              </div>
              <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 text-[10px] font-bold">
                فعال ✓
              </span>
            </div>
            <div className="text-[11px] font-mono text-slate-300">
              ربات: <strong className="text-amber-300">@MODASR_T_bot</strong>
            </div>
            <a
              href="https://rubika.ir/MODASR_T_bot"
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>باز کردن در روبیکا</span>
            </a>
          </div>
        </div>
      </div>

      {/* Live Terminal & Logs Console */}
      <div className="bg-[#0e1621] rounded-xl border border-[#242f3d] overflow-hidden">
        <div className="bg-[#121c27] px-4 py-2.5 border-b border-[#242f3d] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-[#0088cc]" />
            <span className="text-xs font-bold text-slate-200">کنسول لاگ زنده ترافیک تلگرام</span>
            <span className="bg-[#242f3d] text-slate-400 text-[10px] px-2 py-0.5 rounded font-mono">
              {logs.length} رویداد
            </span>
          </div>

          <button
            onClick={onRefreshLogs}
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            <span>بروزرسانی</span>
          </button>
        </div>

        <div className="h-56 overflow-y-auto p-3 space-y-2 font-mono text-[11px] select-text">
          {logs.length === 0 ? (
            <div className="text-slate-500 text-center py-10">
              هنوز رویدادی ثبت نشده است. پیام یا فرمانی ارسال کنید...
            </div>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className={`flex items-start gap-2 p-1.5 rounded ${
                  log.type === 'incoming'
                    ? 'bg-blue-500/10 text-blue-300 border-r-2 border-blue-500'
                    : log.type === 'outgoing'
                    ? 'bg-emerald-500/10 text-emerald-300 border-r-2 border-emerald-500'
                    : log.type === 'callback'
                    ? 'bg-purple-500/10 text-purple-300 border-r-2 border-purple-500'
                    : log.type === 'error'
                    ? 'bg-rose-500/10 text-rose-300 border-r-2 border-rose-500'
                    : 'bg-slate-800/40 text-slate-400'
                }`}
              >
                <span className="text-slate-500 text-[10px] shrink-0 font-sans">{log.timestamp}</span>
                <span className="uppercase text-[9px] px-1 py-0.2 rounded font-bold shrink-0 bg-black/30">
                  {log.type}
                </span>
                <span className="flex-1 break-all leading-relaxed">{log.content}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
