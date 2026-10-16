import React, { useState, useEffect } from 'react';
import {
  Terminal,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  RefreshCw,
  Server,
  Cpu,
  Bot,
  ShieldCheck,
  FileCode,
  Download,
  Zap,
  Globe,
  Database,
  ExternalLink,
  ChevronRight,
  Sliders,
  Layers,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

interface DiagnosticsData {
  status: string;
  version: string;
  platform: string;
  arch: string;
  nodeVersion: string;
  memoryUsageMb: number;
  uptimeSeconds: number;
  installed: boolean;
  configuredPort: number;
  botConnected: boolean;
  botUsername: string | null;
  hasGeminiKey: boolean;
  n8nEnabled: boolean;
  hasEnvFile: boolean;
  hasLogFile: boolean;
}

export const AutoInstallerModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'wizard' | 'diagnostics' | 'configs' | 'guide'>('wizard');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [diagnostics, setDiagnostics] = useState<DiagnosticsData | null>(null);
  const [isLoadingDiag, setIsLoadingDiag] = useState(false);

  // Token Tester
  const [testToken, setTestToken] = useState('');
  const [isTestingToken, setIsTestingToken] = useState(false);
  const [tokenResult, setTokenResult] = useState<{ ok: boolean; message: string; bot?: any } | null>(null);

  // Configs
  const [configs, setConfigs] = useState<{ systemdService: string; nginxConfig: string; installCommand: string; oneLiner: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchDiagnostics();
      fetchConfigs();
    }
  }, [isOpen]);

  const fetchDiagnostics = async () => {
    setIsLoadingDiag(true);
    try {
      const res = await fetch('/api/installer/diagnostics');
      if (res.ok) {
        const data = await res.json();
        setDiagnostics(data);
      }
    } catch {
      // Offline fallback
    } finally {
      setIsLoadingDiag(false);
    }
  };

  const fetchConfigs = async () => {
    try {
      const res = await fetch('/api/installer/configs', { headers: { 'X-Admin-Key': 'slowmega_admin_secret_key_2026' } });
      if (res.ok) {
        const data = await res.json();
        setConfigs(data);
      }
    } catch {
      // Fallback
    }
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleTestToken = async () => {
    if (!testToken.trim()) return;
    setIsTestingToken(true);
    setTokenResult(null);
    try {
      const res = await fetch('/api/installer/verify-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: testToken }),
      });
      const data = await res.json();
      if (data.ok) {
        setTokenResult({
          ok: true,
          message: `توکن کاملاً معتبر است! نام ربات: ${data.bot.first_name} (@${data.bot.username})`,
          bot: data.bot,
        });
      } else {
        setTokenResult({
          ok: false,
          message: data.error || 'توکن نامعتبر است یا ارتباط با تلگرام برقرار نشد.',
        });
      }
    } catch (err: any) {
      setTokenResult({
        ok: false,
        message: err?.message || 'خطا در برقراری ارتباط با سرور',
      });
    } finally {
      setIsTestingToken(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#121c27] border border-[#2b3e52] rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="bg-[#0e1621] p-4 sm:px-6 border-b border-[#243447] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 via-sky-500 to-emerald-400 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
              <Terminal className="w-5 h-5 text-slate-950 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base sm:text-lg text-white">
                  نصاب خودکار حرفه‌ای (Auto Installer v3.0)
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  Mirza Architecture
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                نصب ۱۰ مرحله‌ای تعاملی، اعتبارسنجی زنده توکن تلگرام، دیتابیس و سرویس خودکار Systemd
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-[#1a2736] transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#1f2d3d] bg-[#0c131c] px-4 overflow-x-auto custom-scrollbar">
          <button
            onClick={() => setActiveTab('wizard')}
            className={`py-3 px-4 font-bold text-xs sm:text-sm flex items-center gap-2 border-b-2 transition-all shrink-0 cursor-pointer ${
              activeTab === 'wizard'
                ? 'border-cyan-400 text-cyan-400 bg-cyan-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-4 h-4 text-cyan-400" />
            <span>نصاب ترمینال (install.sh)</span>
          </button>

          <button
            onClick={() => setActiveTab('diagnostics')}
            className={`py-3 px-4 font-bold text-xs sm:text-sm flex items-center gap-2 border-b-2 transition-all shrink-0 cursor-pointer ${
              activeTab === 'diagnostics'
                ? 'border-emerald-400 text-emerald-400 bg-emerald-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>آزمون سلامت سرور</span>
          </button>

          <button
            onClick={() => setActiveTab('configs')}
            className={`py-3 px-4 font-bold text-xs sm:text-sm flex items-center gap-2 border-b-2 transition-all shrink-0 cursor-pointer ${
              activeTab === 'configs'
                ? 'border-purple-400 text-purple-400 bg-purple-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCode className="w-4 h-4 text-purple-400" />
            <span>فایل‌های کانفیگ (Systemd / Nginx)</span>
          </button>

          <button
            onClick={() => setActiveTab('guide')}
            className={`py-3 px-4 font-bold text-xs sm:text-sm flex items-center gap-2 border-b-2 transition-all shrink-0 cursor-pointer ${
              activeTab === 'guide'
                ? 'border-amber-400 text-amber-400 bg-amber-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4 text-amber-400" />
            <span>راهنمای اوبونتو از صفر</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 custom-scrollbar bg-[#121c27]">
          {/* TAB 1: WIZARD */}
          {activeTab === 'wizard' && (
            <div className="space-y-6">
              {/* Quick Run Box */}
              <div className="bg-[#0c131c] p-4 sm:p-5 rounded-2xl border border-cyan-500/30 space-y-3 shadow-lg relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
                    <Terminal className="w-4 h-4" />
                    دستور اجرای نصاب تعاملی در ترمینال سرور:
                  </span>
                  <span className="text-[10px] text-slate-400 bg-[#162332] px-2 py-0.5 rounded font-mono border border-[#27394c]">
                    Bash Script
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3 bg-[#070b10] p-3 rounded-xl border border-[#1f2d3d] font-mono text-xs sm:text-sm text-cyan-300">
                  <span className="select-all truncate">bash install.sh</span>
                  <button
                    onClick={() => handleCopy('bash install.sh', 'run_cmd')}
                    className="p-1.5 bg-[#172332] hover:bg-[#203144] text-cyan-400 rounded-lg shrink-0 transition-colors flex items-center gap-1 text-xs cursor-pointer"
                  >
                    {copiedKey === 'run_cmd' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    <span>کپی</span>
                  </button>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">
                  با اجرای دستور بالا در ترمینال سرور لینوکس، اسکریپت نصب به سبک بات میرزا آغاز شده و تمامی اطلاعات سرور، دیتابیس، توکن تلگرام و وب‌سرور را به‌صورت خودکار دریافت و راه‌اندازی می‌کند.
                </p>
              </div>

              {/* Live Telegram Token Verifier */}
              <div className="bg-[#0e1621] p-4 sm:p-5 rounded-2xl border border-[#223344] space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Bot className="w-4 h-4 text-sky-400" />
                    <span>آزمایش و اعتبارسنجی زنده توکن ربات تلگرام:</span>
                  </h4>
                  <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-medium">
                    اتصال مستقیم به api.telegram.org
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={testToken}
                    onChange={(e) => setTestToken(e.target.value)}
                    placeholder="توکن ربات را وارد کنید (مثال: 123456789:ABCdefGHI...)"
                    className="flex-1 bg-[#162332] border border-[#27394c] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                  <button
                    onClick={handleTestToken}
                    disabled={isTestingToken || !testToken.trim()}
                    className="px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-sky-600 hover:from-cyan-500 hover:to-sky-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer disabled:opacity-50"
                  >
                    {isTestingToken ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                    <span>بررسی صحت توکن</span>
                  </button>
                </div>

                {tokenResult && (
                  <div
                    className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                      tokenResult.ok
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                        : 'bg-rose-500/10 border-rose-500/30 text-rose-200'
                    }`}
                  >
                    {tokenResult.ok ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <p className="font-medium">{tokenResult.message}</p>
                      {tokenResult.bot && (
                        <div className="mt-1.5 font-mono text-[11px] text-emerald-300">
                          ID: {tokenResult.bot.id} | User: @{tokenResult.bot.username}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* 10 Steps Timeline Flow */}
              <div className="space-y-3">
                <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-cyan-400" />
                  <span>مراحل ۱۰ گانه نصب هوشمند اسکریپت:</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  {[
                    { step: '1/10', title: 'بررسی سیستم‌عامل و رم', desc: 'شناسایی توزیع لینوکس، منابع پردازشی و دیسک' },
                    { step: '2/10', title: 'نصب ابزارهای ضروری', desc: 'نصب خودکار curl, git, ffmpeg, unzip' },
                    { step: '3/10', title: 'تنظیمات دامنه و شبکه', desc: 'دریافت خودکار IP عمومی، دامنه و پورت سرور' },
                    { step: '4/10', title: 'اعتبارسنجی زنده تلگرام', desc: 'تست برخط توکن با API رسمی تلگرام' },
                    { step: '5/10', title: 'پیکربندی دیتابیس', desc: 'پشتیبانی از SQLite سبک یا PostgreSQL / MySQL' },
                    { step: '6/10', title: 'تنظیمات هوش مصنوعی و n8n', desc: 'اتصال اختیاری کلید Gemini و وبهوک n8n' },
                    { step: '7/10', title: 'نصب پکیج‌های NPM', desc: 'نصب بسته‌های Express, Vite, React و Typescript' },
                    { step: '8/10', title: 'ساخت فایل .env امن', desc: 'تنظیم مجوزهای ۶۰۰ فایل‌های تنظیمات محیطی' },
                    { step: '9/10', title: 'سرویس خودکار Systemd', desc: 'ایجاد سرویس با قابلیت شروع خودکار پس از ریبوت' },
                    { step: '10/10', title: 'آزمون نهایی سلامت', desc: 'تست پورت، لاگ‌ها و نمایش راهنمای کامل دستورات' },
                  ].map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-[#0e1621] rounded-xl border border-[#1f2d3d] flex items-start gap-2.5"
                    >
                      <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 font-mono font-bold text-[10px] border border-cyan-500/20 shrink-0">
                        {item.step}
                      </span>
                      <div>
                        <strong className="text-white block font-medium">{item.title}</strong>
                        <span className="text-[11px] text-slate-400">{item.desc}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: DIAGNOSTICS */}
          {activeTab === 'diagnostics' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">وضعیت و پارامترهای زنده سرور:</span>
                <button
                  onClick={fetchDiagnostics}
                  disabled={isLoadingDiag}
                  className="px-3 py-1.5 bg-[#182635] hover:bg-[#22354a] text-slate-200 rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-[#2b3e52]"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingDiag ? 'animate-spin' : ''}`} />
                  <span>بروزرسانی وضعیت</span>
                </button>
              </div>

              {diagnostics ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="bg-[#0e1621] p-3.5 rounded-xl border border-[#1f2d3d] space-y-1">
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Server className="w-3.5 h-3.5 text-cyan-400" />
                      سیستم و پردازنده
                    </span>
                    <strong className="text-white text-xs block font-mono">
                      {diagnostics.platform} ({diagnostics.arch})
                    </strong>
                  </div>

                  <div className="bg-[#0e1621] p-3.5 rounded-xl border border-[#1f2d3d] space-y-1">
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Cpu className="w-3.5 h-3.5 text-emerald-400" />
                      نسخه Node.js
                    </span>
                    <strong className="text-emerald-300 text-xs block font-mono">
                      {diagnostics.nodeVersion}
                    </strong>
                  </div>

                  <div className="bg-[#0e1621] p-3.5 rounded-xl border border-[#1f2d3d] space-y-1">
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Globe className="w-3.5 h-3.5 text-sky-400" />
                      پورت فعال وب
                    </span>
                    <strong className="text-sky-300 text-xs block font-mono">
                      {diagnostics.configuredPort}
                    </strong>
                  </div>

                  <div className="bg-[#0e1621] p-3.5 rounded-xl border border-[#1f2d3d] space-y-1">
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Bot className="w-3.5 h-3.5 text-amber-400" />
                      ربات تلگرام
                    </span>
                    <strong className={`text-xs block ${diagnostics.botConnected ? 'text-emerald-400 font-bold' : 'text-slate-400'}`}>
                      {diagnostics.botConnected ? `@${diagnostics.botUsername} (فعال)` : 'در انتظار توکن'}
                    </strong>
                  </div>

                  <div className="bg-[#0e1621] p-3.5 rounded-xl border border-[#1f2d3d] space-y-1">
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5 text-purple-400" />
                      میزان مصرف حافظه RAM
                    </span>
                    <strong className="text-white text-xs block font-mono">
                      {diagnostics.memoryUsageMb} MB
                    </strong>
                  </div>

                  <div className="bg-[#0e1621] p-3.5 rounded-xl border border-[#1f2d3d] space-y-1">
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      وضعیت نصب
                    </span>
                    <strong className="text-emerald-400 text-xs block font-bold">
                      {diagnostics.installed ? 'تکمیل شده ✓' : 'آماده نصب'}
                    </strong>
                  </div>
                </div>
              ) : (
                <div className="text-center p-8 text-xs text-slate-400 bg-[#0e1621] rounded-xl border border-[#1f2d3d]">
                  در حال دریافت اطلاعات سیستم...
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CONFIGS */}
          {activeTab === 'configs' && (
            <div className="space-y-4">
              {/* Systemd Service */}
              <div className="bg-[#0e1621] p-4 rounded-xl border border-[#1f2d3d] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <FileCode className="w-4 h-4 text-cyan-400" />
                    فایل سرویس خودکار Systemd (/etc/systemd/system/slowmegabot.service):
                  </span>
                  <button
                    onClick={() => handleCopy(configs?.systemdService || '', 'systemd')}
                    className="px-2.5 py-1 bg-[#172332] hover:bg-[#203144] text-cyan-300 rounded-lg text-xs flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    {copiedKey === 'systemd' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>کپی کد</span>
                  </button>
                </div>
                <pre className="text-[11px] font-mono text-cyan-200 bg-[#070b10] p-3 rounded-lg overflow-x-auto max-h-36 custom-scrollbar border border-[#1f2d3d]">
                  {configs?.systemdService || 'در حال بارگذاری...'}
                </pre>
              </div>

              {/* Nginx Config */}
              <div className="bg-[#0e1621] p-4 rounded-xl border border-[#1f2d3d] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <FileCode className="w-4 h-4 text-purple-400" />
                    پیکربندی Nginx Reverse Proxy (/etc/nginx/sites-available/slowmegabot):
                  </span>
                  <button
                    onClick={() => handleCopy(configs?.nginxConfig || '', 'nginx')}
                    className="px-2.5 py-1 bg-[#172332] hover:bg-[#203144] text-purple-300 rounded-lg text-xs flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    {copiedKey === 'nginx' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>کپی کد</span>
                  </button>
                </div>
                <pre className="text-[11px] font-mono text-purple-200 bg-[#070b10] p-3 rounded-lg overflow-x-auto max-h-36 custom-scrollbar border border-[#1f2d3d]">
                  {configs?.nginxConfig || 'در حال بارگذاری...'}
                </pre>
              </div>
            </div>
          )}

          {/* TAB 4: UBUNTU GUIDE */}
          {activeTab === 'guide' && (
            <div className="space-y-4 text-xs text-slate-300 leading-relaxed">
              <div className="bg-[#0e1621] p-4 rounded-xl border border-[#1f2d3d] space-y-3">
                <h4 className="font-bold text-sm text-amber-300 flex items-center gap-2">
                  <Layers className="w-4 h-4" />
                  <span>راهنمای راه‌اندازی سریع روی سرور خام اوبونتو (Ubuntu 20/22/24):</span>
                </h4>

                <ol className="space-y-2.5 list-decimal list-inside text-slate-300">
                  <li className="font-medium text-white">
                    به سرور اوبونتو از طریق SSH لاگین کنید:
                    <div className="mt-1 bg-[#070b10] p-2 rounded font-mono text-cyan-300">ssh root@YOUR_SERVER_IP</div>
                  </li>
                  <li className="font-medium text-white">
                    وارد پوشه پروژه شوید یا آن را کلون کنید:
                    <div className="mt-1 bg-[#070b10] p-2 rounded font-mono text-cyan-300">cd /var/www/slowmegabot</div>
                  </li>
                  <li className="font-medium text-white">
                    مجوز اجرای نصاب خودکار را اعطا کنید:
                    <div className="mt-1 bg-[#070b10] p-2 rounded font-mono text-cyan-300">chmod +x install.sh</div>
                  </li>
                  <li className="font-medium text-white">
                    اسکریپت نصاب را اجرا نمایید و مراحل را پاسخ دهید:
                    <div className="mt-1 bg-[#070b10] p-2 rounded font-mono text-cyan-300">bash install.sh</div>
                  </li>
                </ol>
              </div>

              <div className="bg-[#0e1621] p-4 rounded-xl border border-[#1f2d3d] space-y-2">
                <span className="font-bold text-white block">دستورات مدیریت روزمره سرویس:</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-[11px]">
                  <div className="bg-[#070b10] p-2 rounded border border-[#1f2d3d]">
                    <span className="text-slate-400 block text-[10px]">مشاهده وضعیت:</span>
                    <span className="text-cyan-300">sudo systemctl status slowmegabot</span>
                  </div>
                  <div className="bg-[#070b10] p-2 rounded border border-[#1f2d3d]">
                    <span className="text-slate-400 block text-[10px]">راه‌اندازی مجدد:</span>
                    <span className="text-cyan-300">sudo systemctl restart slowmegabot</span>
                  </div>
                  <div className="bg-[#070b10] p-2 rounded border border-[#1f2d3d]">
                    <span className="text-slate-400 block text-[10px]">مشاهده لاگ زنده:</span>
                    <span className="text-cyan-300">journalctl -u slowmegabot -f</span>
                  </div>
                  <div className="bg-[#070b10] p-2 rounded border border-[#1f2d3d]">
                    <span className="text-slate-400 block text-[10px]">منوی مدیریت نصاب:</span>
                    <span className="text-cyan-300">bash install.sh --status</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-[#0e1621] p-3 sm:px-6 border-t border-[#243447] flex items-center justify-between text-xs text-slate-400">
          <span>SlowMegaBot Auto Installer Engine v3.0</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#1f2e40] hover:bg-[#2b3e54] text-white font-medium rounded-xl transition-all cursor-pointer"
          >
            بستن پنجره
          </button>
        </div>
      </div>
    </div>
  );
};
