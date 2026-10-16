import React, { useState } from 'react';
import {  ShieldAlert,  Play,  CheckCircle2,  XCircle,  Clock,  Terminal,  RefreshCw,  FileText,  Copy,  Check,  ExternalLink,  Zap,  Globe} from 'lucide-react';
import confetti from 'canvas-confetti';
import { extractInstagramMedia, parseInstagramUrl } from '../services/instagramService';
import { fetchYouTubeVideoDetails, fetchTikTokVideoDetails, fetchUniversalDownload } from '../services/realApis';
import { sharedDownloaderCore } from '../services/downloaderCore';

export interface DiagnosticTestCase {
  id: string;
  name: string;
  platform: 'instagram' | 'youtube' | 'tiktok' | 'pinterest' | 'twitter' | 'spotify';
  url: string;
  expectedType: 'video' | 'audio' | 'image' | 'profile' | 'document';
}

const MOCK_TEST_CASES: DiagnosticTestCase[] = [
  {
    id: 'tc_ig_reel',
    name: 'ریلز اینستاگرام (Instagram Reel)',
    platform: 'instagram',
    url: 'https://www.instagram.com/reel/C4x891ABcd/?igsh=MWQ0NA==',
    expectedType: 'video',
  },
  {
    id: 'tc_ig_profile',
    name: 'پروفایل اینستاگرام (Instagram Profile)',
    platform: 'instagram',
    url: 'https://www.instagram.com/cristiano/',
    expectedType: 'profile',
  },
  {
    id: 'tc_yt_video',
    name: 'ویدیوی یوتیوب (YouTube 1080p)',
    platform: 'youtube',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    expectedType: 'video',
  },
  {
    id: 'tc_yt_shorts',
    name: 'شورتس یوتیوب (YouTube Shorts)',
    platform: 'youtube',
    url: 'https://www.youtube.com/shorts/AbCdEfGhIjK',
    expectedType: 'video',
  },
  {
    id: 'tc_tt_video',
    name: 'تیک‌تاک بدون واترمرک (TikTok Video)',
    platform: 'tiktok',
    url: 'https://www.tiktok.com/@creator/video/7234567890123456789',
    expectedType: 'video',
  },
  {
    id: 'tc_pin_image',
    name: 'پینترست 4K (Pinterest Pin)',
    platform: 'pinterest',
    url: 'https://www.pinterest.com/pin/1234567890/',
    expectedType: 'image',
  },
  {
    id: 'tc_sp_track',
    name: 'موزیک اسپاتیفای (Spotify Track)',
    platform: 'spotify',
    url: 'https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT',
    expectedType: 'audio',
  },
];

interface DiagnosticResultItem {
  testId: string;
  testName: string;
  url: string;
  platform: string;
  success: boolean;
  latencyMs: number;
  payload?: any;
  error?: string;
  stages?: any[];
  regexLog?: string;
}

interface DownloaderDiagnosticsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DownloaderDiagnosticsModal: React.FC<DownloaderDiagnosticsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [isRunningAll, setIsRunningAll] = useState(false);
  const [results, setResults] = useState<Record<string, DiagnosticResultItem>>({});
  const [activeTab, setActiveTab] = useState<'matrix' | 'console'>('matrix');
  const [consoleLogs, setConsoleLogs] = useState<Array<{ timestamp: string; type: 'info' | 'success' | 'error' | 'warn'; message: string; data?: any }>>([]);
  const [customTestUrl, setCustomTestUrl] = useState('');
  const [customResult, setCustomResult] = useState<any>(null);
  const [customLoading, setCustomLoading] = useState(false);

  if (!isOpen) return null;

  const logToConsole = (type: 'info' | 'success' | 'error' | 'warn', message: string, data?: any) => {
    const entry = {
      timestamp: new Date().toLocaleTimeString('fa-IR'),
      type,
      message,
      data,
    };
    setConsoleLogs((prev) => [entry, ...prev]);
    if (type === 'error') {
      console.error(`[DIAGNOSTIC ERROR] ${message}`, data || '');
    } else if (type === 'warn') {
      console.warn(`[DIAGNOSTIC WARN] ${message}`, data || '');
    } else {
      console.log(`[DIAGNOSTIC] ${message}`, data || '');
    }
  };

  const runSingleTest = async (tc: DiagnosticTestCase): Promise<DiagnosticResultItem> => {
    const startTime = Date.now();
    logToConsole('info', `شروع تست تشخیصی برای: [${tc.platform}] ${tc.name}`, { url: tc.url });

    let success = false;
    let payload: any = null;
    let errorMsg: string | undefined = undefined;
    let stages: any[] = [];
    let regexLog = 'Regex validation passed: standard URL pattern matched.';

    try {
      if (tc.platform === 'instagram') {
        const parsed = parseInstagramUrl(tc.url);
        if (!parsed.isValid) {
          throw new Error(`خطای پارس Regex اینستاگرام: ${parsed.error}`);
        }
        regexLog = `Instagram Parsed Successfully. Type: ${parsed.type}, Shortcode: ${parsed.shortcode || parsed.username}`;
        logToConsole('success', regexLog, parsed);

        const res = await extractInstagramMedia(tc.url);
        payload = res;
        success = res.success;
        if (!res.success) {
          errorMsg = res.errorReason || 'استخراج اینستاگرام ناموفق بود';
        }
      } else if (tc.platform === 'youtube') {
        const res = fetchYouTubeVideoDetails(tc.url);
        payload = res;
        success = Boolean(res && res.id);
        if (!success) errorMsg = 'اطلاعات یوتیوب دریافت نشد';
      } else if (tc.platform === 'tiktok') {
        const res = fetchTikTokVideoDetails(tc.url);
        payload = res;
        success = Boolean(res && res.id);
        if (!success) errorMsg = 'اطلاعات تیک‌تاک دریافت نشد';
      } else {
        const coreRes = await sharedDownloaderCore.processMediaUrl(tc.url);
        payload = coreRes;
        success = coreRes.success;
        stages = coreRes.stages;
        if (!coreRes.success) errorMsg = coreRes.errorReason || 'خطای پایپ‌لاین هسته مشترک';
      }

      const latency = Date.now() - startTime;
      const resultItem: DiagnosticResultItem = {
        testId: tc.id,
        testName: tc.name,
        url: tc.url,
        platform: tc.platform,
        success,
        latencyMs: latency,
        payload,
        error: errorMsg,
        stages,
        regexLog,
      };

      if (success) {
        logToConsole('success', `تست موفق [${tc.name}] در ${latency}ms`, payload);
      } else {
        logToConsole('error', `تست ناموفق [${tc.name}] در ${latency}ms: ${errorMsg}`, payload);
      }

      return resultItem;
    } catch (err: any) {
      const latency = Date.now() - startTime;
      logToConsole('error', `استثنا در تست [${tc.name}] پس از ${latency}ms: ${err?.message}`, err);
      const errItem: DiagnosticResultItem = {
        testId: tc.id,
        testName: tc.name,
        url: tc.url,
        platform: tc.platform,
        success: false,
        latencyMs: latency,
        error: err?.message || 'خطای ناشناخته',
        regexLog,
      };
      return errItem;
    }
  };

  const handleRunAll = async () => {
    setIsRunningAll(true);
    setResults({});
    logToConsole('info', '--- شروع اجرای مجموعه کامل تست‌های تشخیصی دانلودر (Diagnostic Test Suite) ---');
    const newResults: Record<string, DiagnosticResultItem> = {};

    for (const tc of MOCK_TEST_CASES) {
      const res = await runSingleTest(tc);
      newResults[tc.id] = res;
      setResults({ ...newResults });
    }

    setIsRunningAll(false);
    confetti({ particleCount: 50, spread: 70 });
    logToConsole('success', '--- اجرای مجموعه تست‌های تشخیصی با موفقیت به پایان رسید ---');
  };

  const handleTestCustomUrl = async () => {
    if (!customTestUrl.trim()) return;
    setCustomLoading(true);
    logToConsole('info', `ارزیابی لینک سفارشی: ${customTestUrl}`);
    const startTime = Date.now();
    try {
      const res = await sharedDownloaderCore.processMediaUrl(customTestUrl);
      const latency = Date.now() - startTime;
      setCustomResult({ ...res, latencyMs: latency });
      logToConsole(res.success ? 'success' : 'error', `نتیجه ارزیابی لینک سفارشی (${latency}ms):`, res);
    } catch (err: any) {
      logToConsole('error', `خطا در بررسی لینک سفارشی: ${err?.message}`, err);
      setCustomResult({ success: false, error: err?.message });
    } finally {
      setCustomLoading(false);
    }
  };

  const totalTests = MOCK_TEST_CASES.length;
  const completedTests = Object.keys(results).length;
  const passedTests = Object.values(results).filter((r) => r.success).length;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#0e1621] border border-[#242f3d] w-full max-w-5xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-right">
        {/* Header */}
        <div className="p-4 bg-[#17212b] border-b border-[#242f3d] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
              <Terminal className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <span>صفحه عیب‌یابی و تست تشخیصی دانلودرها (Diagnostic Suite)</span>
                <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-400 text-[10px] font-mono">v2.4 Live</span>
              </h3>
              <p className="text-[11px] text-slate-400">
                بررسی پلتفرم‌های اینستاگرام، یوتیوب، تیک‌تاک، سنجش تاخیر API و ردیابی خطاهای Regex
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-[#202d3b] hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 flex items-center justify-center transition-colors cursor-pointer text-xs font-bold"
          >
            ✕
          </button>
        </div>

        {/* Toolbar & Stats Bar */}
        <div className="p-3 bg-[#131d28] border-b border-[#242f3d] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={handleRunAll}
              disabled={isRunningAll}
              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-bold rounded-xl text-xs shadow-md cursor-pointer flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {isRunningAll ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              <span>{isRunningAll ? 'در حال اجرای تست‌ها...' : 'اجرای خودکار تست جامع (Run All)'}</span>
            </button>
            <button
              onClick={() => {
                setResults({});
                setConsoleLogs([]);
                setCustomResult(null);
              }}
              className="px-3 py-2 bg-[#17212b] hover:bg-[#202d3b] text-slate-300 text-xs rounded-xl border border-[#242f3d] cursor-pointer"
            >
              پاکسازی نتایج
            </button>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono">
            <span className="px-2.5 py-1 rounded-lg bg-[#17212b] border border-[#242f3d] text-slate-300">
              کل تست‌ها: <strong className="text-white">{totalTests}</strong>
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
              موفق: <strong className="text-emerald-400">{passedTests}</strong>
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300">
              ناموفق: <strong className="text-rose-400">{completedTests - passedTests}</strong>
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-[#242f3d] bg-[#17212b] px-4 gap-4 text-xs font-bold">
          <button
            onClick={() => setActiveTab('matrix')}
            className={`py-3 border-b-2 cursor-pointer transition-colors flex items-center gap-2 ${
              activeTab === 'matrix'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>ماتریس تست URLها ({totalTests})</span>
          </button>
          <button
            onClick={() => setActiveTab('console')}
            className={`py-3 border-b-2 cursor-pointer transition-colors flex items-center gap-2 ${
              activeTab === 'console'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span>کنسول لاگ زنده ({consoleLogs.length})</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {activeTab === 'matrix' ? (
            <div className="space-y-4">
              {/* Custom URL Tester */}
              <div className="p-3 bg-[#131d28] rounded-xl border border-sky-500/30 space-y-2">
                <span className="text-xs font-bold text-sky-300 flex items-center gap-1.5">
                  <Globe className="w-4 h-4 text-sky-400" />
                  <span>تست سفارشی لینک دلخواه:</span>
                </span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customTestUrl}
                    onChange={(e) => setCustomTestUrl(e.target.value)}
                    placeholder="https://www.instagram.com/p/... یا هر لینک دیگری را اینجا وارد کنید..."
                    className="flex-1 bg-[#17212b] border border-[#2e3d4e] rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 font-mono outline-none focus:border-sky-400"
                  />
                  <button
                    onClick={handleTestCustomUrl}
                    disabled={customLoading || !customTestUrl.trim()}
                    className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl text-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {customLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                    <span>تست آنی</span>
                  </button>
                </div>
                {customResult && (
                  <div className="mt-2 p-3 bg-[#17212b] rounded-xl border border-[#242f3d] font-mono text-[11px] space-y-1 text-slate-300">
                    <div className="flex items-center justify-between">
                      <span className={customResult.success ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                        {customResult.success ? '✓ نتیجه: موفق' : '✗ نتیجه: خطا'}
                      </span>
                      <span className="text-amber-400">تاخیر: {customResult.latencyMs || 0}ms</span>
                    </div>
                    <pre className="overflow-x-auto max-h-32 text-[10px] text-slate-400">
                      {JSON.stringify(customResult, null, 2)}
                    </pre>
                  </div>
                )}
              </div>

              {/* Test Cases Table / Cards */}
              <div className="grid grid-cols-1 gap-2.5">
                {MOCK_TEST_CASES.map((tc) => {
                  const res = results[tc.id];
                  return (
                    <div
                      key={tc.id}
                      className={`p-3 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        !res
                          ? 'bg-[#131d28] border-[#242f3d]'
                          : res.success
                          ? 'bg-[#13222d] border-emerald-500/40'
                          : 'bg-rose-950/20 border-rose-500/40'
                      }`}
                    >
                      <div className="flex items-start gap-3 overflow-hidden">
                        <div className="mt-0.5 shrink-0">
                          {!res ? (
                            <div className="w-6 h-6 rounded-full bg-[#17212b] border border-slate-700 flex items-center justify-center text-slate-400 text-xs">
                              ⏳
                            </div>
                          ) : res.success ? (
                            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                          ) : (
                            <XCircle className="w-6 h-6 text-rose-400" />
                          )}
                        </div>
                        <div className="overflow-hidden space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-white">{tc.name}</span>
                            <span className="px-2 py-0.5 rounded bg-[#17212b] text-slate-300 text-[10px] font-mono">
                              {tc.platform.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 font-mono truncate">{tc.url}</p>
                          {res?.error && (
                            <p className="text-[11px] text-rose-400 font-medium">خطا: {res.error}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        {res && (
                          <div className="text-left text-[11px] font-mono space-y-0.5">
                            <div className="text-amber-400 font-bold">⏱️ {res.latencyMs}ms</div>
                            <div className="text-slate-400 text-[10px]">
                              {res.stages?.length ? `${res.stages.length} مرحله` : 'بررسی شد'}
                            </div>
                          </div>
                        )}
                        <button
                          onClick={async () => {
                            const r = await runSingleTest(tc);
                            setResults((prev) => ({ ...prev, [tc.id]: r }));
                          }}
                          disabled={isRunningAll}
                          className="px-3 py-1.5 bg-[#17212b] hover:bg-[#202d3b] text-sky-300 text-xs font-bold rounded-lg border border-sky-500/30 cursor-pointer transition-colors disabled:opacity-50"
                        >
                          اجرای تست
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Console Logs Tab */
            <div className="bg-[#0b1017] rounded-xl border border-[#242f3d] p-3 font-mono text-xs space-y-2 min-h-[360px] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-[#242f3d] pb-2 text-[11px] text-slate-400">
                <span>رویدادها و لاگ‌های تشخیصی زنده (Console & Payload Stream)</span>
                <button
                  onClick={() => setConsoleLogs([])}
                  className="text-rose-400 hover:text-rose-300 underline cursor-pointer"
                >
                  پاکسازی کنسول
                </button>
              </div>
              {consoleLogs.length === 0 ? (
                <p className="text-slate-500 text-center py-12">هیچ لاگی ثبت نشده است. دکمه «اجرای خودکار تست جامع» را لمس کنید.</p>
              ) : (
                consoleLogs.map((log, idx) => (
                  <div
                    key={idx}
                    className={`p-2 rounded-lg border ${
                      log.type === 'success'
                        ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
                        : log.type === 'error'
                        ? 'bg-rose-950/30 border-rose-500/40 text-rose-200'
                        : log.type === 'warn'
                        ? 'bg-amber-950/20 border-amber-500/30 text-amber-200'
                        : 'bg-[#131d28] border-[#242f3d] text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                      <span className="font-bold uppercase tracking-wider">{log.type}</span>
                      <span>{log.timestamp}</span>
                    </div>
                    <p className="text-xs font-sans whitespace-pre-wrap">{log.message}</p>
                    {log.data && (
                      <pre className="mt-1.5 p-2 bg-[#090e14] rounded text-[10px] text-slate-400 overflow-x-auto max-h-40">
                        {JSON.stringify(log.data, null, 2)}
                      </pre>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#17212b] border-t border-[#242f3d] flex items-center justify-between text-xs text-slate-400">
          <span>سیستم ارزیابی و مانیتورینگ سلامت سرویس‌های دانلودر</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#202d3b] hover:bg-[#2a3b4c] text-white font-bold rounded-xl cursor-pointer"
          >
            بستن پنجره عیب‌یابی
          </button>
        </div>
      </div>
    </div>
  );
};
