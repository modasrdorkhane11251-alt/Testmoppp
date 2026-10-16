import React, { useState, useEffect } from 'react';
import {
  Webhook,
  Copy,
  Check,
  Zap,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Code2,
  RefreshCw,
  Send,
  Sliders,
  Activity,
  Download,
} from 'lucide-react';

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

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const N8nConnectModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [n8nUrl, setN8nUrl] = useState('');
  const [isEnabled, setIsEnabled] = useState(false);
  const [secretKey, setSecretKey] = useState('');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [attempts, setAttempts] = useState<WebhookAttempt[]>([]);
  
  // Test Runner State
  const [testText, setTestText] = useState('دانلود پست https://www.instagram.com/reel/C4x891ABcd/');
  const [testResponse, setTestResponse] = useState<any>(null);
  const [isTesting, setIsTesting] = useState(false);

  const baseUrl = window.location.origin;

  const endpoints = {
    telegramWebhook: `${baseUrl}/api/telegram/webhook`,
    processMessage: `${baseUrl}/api/n8n/process-message`,
    downloadMedia: `${baseUrl}/api/n8n/download-media`,
    info: `${baseUrl}/api/n8n/info`,
  };

  useEffect(() => {
    if (isOpen) {
      fetchConfig();
    }
  }, [isOpen]);

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/n8n/config');
      if (res.ok) {
        const data = await res.json();
        setN8nUrl(data.config.n8nWebhookUrl || '');
        setIsEnabled(!!data.config.enabled);
        setSecretKey(data.config.secretKey || '');
        if (Array.isArray(data.attempts)) {
          setAttempts(data.attempts);
        }
      }
    } catch {
      // Fallback
    }
  };

  const fetchAttempts = async () => {
    try {
      const res = await fetch('/api/n8n/attempts');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.attempts)) {
          setAttempts(data.attempts);
        }
      }
    } catch {
      // Fallback
    }
  };

  const handleSaveConfig = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    setSaveStatus(null);
    try {
      const res = await fetch('/api/n8n/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          n8nWebhookUrl: n8nUrl,
          enabled: isEnabled,
          secretKey,
        }),
      });
      if (res.ok) {
        setSaveStatus('تنظیمات n8n با موفقیت ذخیره و فعال شد!');
        fetchAttempts();
      } else {
        setSaveStatus('خطا در ذخیره تنظیمات');
      }
    } catch (err: any) {
      setSaveStatus('خطا در ارتباط با سرور');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleRunTest = async () => {
    setIsTesting(true);
    setTestResponse(null);
    try {
      const res = await fetch('/api/n8n/process-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: testText,
          userId: 12345678,
          username: 'n8n_test_runner',
          firstName: 'کاربر n8n',
        }),
      });
      const data = await res.json();
      setTestResponse(data);
    } catch (err: any) {
      setTestResponse({ error: err?.message || 'خطا در برقراری ارتباط' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleDownloadWorkflow = () => {
    const blob = new Blob([sampleN8nWorkflow], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'slowmegabot-n8n-workflow.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const sampleN8nWorkflow = JSON.stringify(
    {
      name: 'SlowMegaBot Telegram Automation & Media Downloader',
      nodes: [
        {
          parameters: {
            httpMethod: 'POST',
            path: 'slowmegabot-webhook',
            responseMode: 'responseNode',
            options: {},
          },
          id: 'e8df81c1-92b4-4e9f-9c02-7c3a0b1e4561',
          name: '1. دریافت وب‌هوک (Telegram Webhook)',
          type: 'n8n-nodes-base.webhook',
          typeVersion: 1.1,
          position: [180, 340],
          webhookId: 'slowmegabot-webhook-trigger',
        },
        {
          parameters: {
            jsCode: '// استخراج و اعتبارسنجی پیام ورودی تلگرام یا وب‌هوک SlowMegaBot\nconst item = $input.first().json;\nconst payload = item.body || item;\nconst message = payload.message || payload;\nconst from = message.from || payload.from || {};\nconst chat = message.chat || payload.chat || {};\n\nconst text = (message.text || message.caption || "").trim();\nconst userId = from.id || chat.id || payload.userId || 0;\nconst username = from.username || payload.username || "";\nconst firstName = from.first_name || payload.firstName || "کاربر تلگرام";\nconst chatId = chat.id || payload.chatId || userId;\n\n// تشخیص نوع پیام: لینک دانلود رسانه یا دستور ربات\nconst isMediaUrl = /(?:https?:\\/\\/)?(?:www\\.)?(?:instagram\\.com|youtube\\.com|youtu\\.be|pinterest\\.com|pin\\.it)/i.test(text);\nconst isCommand = text.startsWith("/");\n\nreturn [{\n  json: {\n    text,\n    userId,\n    username,\n    firstName,\n    chatId,\n    isMediaUrl,\n    isCommand,\n    timestamp: new Date().toISOString(),\n    source: "slowmegabot"\n  }\n}];',
          },
          id: 'b3e77f0a-1a8c-4d56-a9f2-2b3c4d5e6f70',
          name: '2. پردازش و فیلتر پیام (Filter & Router)',
          type: 'n8n-nodes-base.code',
          typeVersion: 2,
          position: [400, 340],
        },
        {
          parameters: {
            rules: {
              values: [
                {
                  conditions: {
                    options: { caseSensitive: true, leftValue: '', typeValidation: 'strict' },
                    conditions: [
                      {
                        leftValue: '={{ $json.isMediaUrl }}',
                        rightValue: true,
                        operator: { type: 'boolean', operation: 'equals' },
                      },
                    ],
                    combinator: 'and',
                  },
                  renameOutput: true,
                  outputKey: 'MediaDownload',
                },
                {
                  conditions: {
                    options: { caseSensitive: true, leftValue: '', typeValidation: 'strict' },
                    conditions: [
                      {
                        leftValue: '={{ $json.isMediaUrl }}',
                        rightValue: false,
                        operator: { type: 'boolean', operation: 'equals' },
                      },
                    ],
                    combinator: 'and',
                  },
                  renameOutput: true,
                  outputKey: 'BotEngine',
                },
              ],
            },
            options: {},
          },
          id: 'c4d5e6f7-a8b9-4c01-d2e3-3f4a5b6c7d81',
          name: '3. شاخه‌بندی هوشمند (Switch Router)',
          type: 'n8n-nodes-base.switch',
          typeVersion: 3,
          position: [640, 340],
        },
        {
          parameters: {
            method: 'POST',
            url: `${baseUrl}/api/n8n/download-media`,
            sendBody: true,
            specifyBody: 'json',
            jsonBody: '={\n  "url": "={{ $json.text }}"\n}',
            options: { timeout: 15000 },
          },
          id: 'd5e6f7a8-b9c0-4d12-e3f4-4a5b6c7d8e92',
          name: '4. دانلودر رسانه و اینستاگرام (HTTP Downloader)',
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 4.1,
          position: [920, 240],
        },
        {
          parameters: {
            method: 'POST',
            url: `${baseUrl}/api/n8n/process-message`,
            sendBody: true,
            specifyBody: 'json',
            jsonBody: '={\n  "text": "={{ $json.text }}",\n  "userId": {{ $json.userId }},\n  "username": "={{ $json.username }}",\n  "firstName": "={{ $json.firstName }}"\n}',
            options: { timeout: 10000 },
          },
          id: 'e6f7a8b9-c0d1-4e23-f4a5-5b6c7d8e9f03',
          name: '5. موتور دستورات ربات (Bot Engine Exec)',
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 4.1,
          position: [920, 440],
        },
        {
          parameters: {
            respondWith: 'json',
            responseBody: '={\n  "success": true,\n  "status": "processed",\n  "botResponse": {{ JSON.stringify($json) }},\n  "timestamp": "={{ $now }}"\n}',
            options: {},
          },
          id: 'f7a8b9c0-d1e2-4f34-a5b6-6c7d8e9f0a14',
          name: '6. ارسال پاسخ به درخواست‌کننده (Respond to Webhook)',
          type: 'n8n-nodes-base.respondToWebhook',
          typeVersion: 1,
          position: [1200, 340],
        },
      ],
      connections: {
        '1. دریافت وب‌هوک (Telegram Webhook)': {
          main: [
            [
              {
                node: '2. پردازش و فیلتر پیام (Filter & Router)',
                type: 'main',
                index: 0,
              },
            ],
          ],
        },
        '2. پردازش و فیلتر پیام (Filter & Router)': {
          main: [
            [
              {
                node: '3. شاخه‌بندی هوشمند (Switch Router)',
                type: 'main',
                index: 0,
              },
            ],
          ],
        },
        '3. شاخه‌بندی هوشمند (Switch Router)': {
          main: [
            [
              {
                node: '4. دانلودر رسانه و اینستاگرام (HTTP Downloader)',
                type: 'main',
                index: 0,
              },
            ],
            [
              {
                node: '5. موتور دستورات ربات (Bot Engine Exec)',
                type: 'main',
                index: 0,
              },
            ],
          ],
        },
        '4. دانلودر رسانه و اینستاگرام (HTTP Downloader)': {
          main: [
            [
              {
                node: '6. ارسال پاسخ به درخواست‌کننده (Respond to Webhook)',
                type: 'main',
                index: 0,
              },
            ],
          ],
        },
        '5. موتور دستورات ربات (Bot Engine Exec)': {
          main: [
            [
              {
                node: '6. ارسال پاسخ به درخواست‌کننده (Respond to Webhook)',
                type: 'main',
                index: 0,
              },
            ],
          ],
        },
      },
      active: false,
      settings: {
        executionOrder: 'v1',
        saveManualExecutions: true,
      },
      meta: {
        templateCredsSetupCompleted: true,
        instanceId: 'slowmegabot-automation',
      },
      id: 'slowmegabot-full-workflow',
      tags: [{ name: 'SlowMegaBot', id: 'slowmegabot-tag' }],
    },
    null,
    2
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-[#121c27] border border-[#243447] rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl text-slate-100 my-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#1d2d3e] to-[#121c27] p-5 border-b border-[#243447] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-slate-950 shadow-md">
              <Zap className="w-6 h-6 fill-current" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white flex items-center gap-2">
                <span>اتصال هوشمند به n8n و اتوماسیون</span>
                <span className="bg-amber-500/20 text-amber-300 text-xs px-2 py-0.5 rounded-full border border-amber-500/30">
                  Automation Hub
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                ربات تلگرام و ماژول‌ها را به سیستم‌های خودکار، ورک‌فلوی n8n و هوش مصنوعی متصل کنید
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-[#1f2f42] transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
          {/* Section 1: Endpoints List */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-sky-400 flex items-center gap-2">
              <Webhook className="w-4 h-4" />
              <span>آدرس‌های API اختصاصی برای n8n (HTTP Request Node):</span>
            </h4>

            <div className="space-y-2.5">
              {/* Telegram Webhook */}
              <div className="bg-[#0e1621] p-3 rounded-xl border border-[#1f2d3d] space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-amber-300">1. وب‌هووک تلگرام (Telegram Webhook / Trigger):</span>
                  <span className="bg-emerald-500/20 text-emerald-300 text-[10px] px-1.5 py-0.5 rounded border border-emerald-500/30 font-mono">
                    POST
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 bg-[#17222e] p-2 rounded-lg font-mono text-xs text-slate-200">
                  <span className="truncate">{endpoints.telegramWebhook}</span>
                  <button
                    onClick={() => handleCopy(endpoints.telegramWebhook, 'webhook')}
                    className="p-1.5 bg-[#253548] hover:bg-[#32465e] rounded text-slate-300 transition-colors shrink-0 cursor-pointer"
                    title="کپی آدرس"
                  >
                    {copiedField === 'webhook' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Message Processor */}
              <div className="bg-[#0e1621] p-3 rounded-xl border border-[#1f2d3d] space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-sky-300">2. پردازش دستور و پیام (Process Message API):</span>
                  <span className="bg-sky-500/20 text-sky-300 text-[10px] px-1.5 py-0.5 rounded border border-sky-500/30 font-mono">
                    POST
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 bg-[#17222e] p-2 rounded-lg font-mono text-xs text-slate-200">
                  <span className="truncate">{endpoints.processMessage}</span>
                  <button
                    onClick={() => handleCopy(endpoints.processMessage, 'process')}
                    className="p-1.5 bg-[#253548] hover:bg-[#32465e] rounded text-slate-300 transition-colors shrink-0 cursor-pointer"
                    title="کپی آدرس"
                  >
                    {copiedField === 'process' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Direct Downloader */}
              <div className="bg-[#0e1621] p-3 rounded-xl border border-[#1f2d3d] space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-violet-300">3. استخراج مستقیم رسانه (Media Downloader API):</span>
                  <span className="bg-violet-500/20 text-violet-300 text-[10px] px-1.5 py-0.5 rounded border border-violet-500/30 font-mono">
                    POST
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 bg-[#17222e] p-2 rounded-lg font-mono text-xs text-slate-200">
                  <span className="truncate">{endpoints.downloadMedia}</span>
                  <button
                    onClick={() => handleCopy(endpoints.downloadMedia, 'media')}
                    className="p-1.5 bg-[#253548] hover:bg-[#32465e] rounded text-slate-300 transition-colors shrink-0 cursor-pointer"
                    title="کپی آدرس"
                  >
                    {copiedField === 'media' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Config Settings */}
          <form onSubmit={handleSaveConfig} className="bg-[#0e1621] p-4 rounded-xl border border-[#1f2d3d] space-y-3">
            <h4 className="text-sm font-bold text-amber-300 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Sliders className="w-4 h-4" />
                <span>تنظیمات وب‌هووک برگشتی به n8n (Outgoing Webhook):</span>
              </span>
              <label className="flex items-center gap-2 cursor-pointer text-xs font-normal">
                <span>فعال‌سازی ارسال رویدادها</span>
                <input
                  type="checkbox"
                  checked={isEnabled}
                  onChange={(e) => setIsEnabled(e.target.checked)}
                  className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                />
              </label>
            </h4>

            <div className="space-y-2 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">آدرس وب‌هووک n8n شما (Target Webhook URL):</label>
                <input
                  type="url"
                  placeholder="https://n8n.yourdomain.com/webhook/..."
                  value={n8nUrl}
                  onChange={(e) => setN8nUrl(e.target.value)}
                  className="w-full bg-[#17222e] border border-[#27374a] rounded-lg px-3 py-2 text-white font-mono placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">کلید امنیتی هدر (Secret Token):</label>
                <input
                  type="text"
                  value={secretKey}
                  onChange={(e) => setSecretKey(e.target.value)}
                  className="w-full bg-[#17222e] border border-[#27374a] rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              {saveStatus && (
                <div className="p-2.5 rounded-lg bg-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2 border border-emerald-500/30">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{saveStatus}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSaving}
                className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold rounded-lg transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer disabled:opacity-50"
              >
                {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 fill-current" />}
                <span>ذخیره و فعال‌سازی اتصال n8n</span>
              </button>
            </div>
          </form>

          {/* Section 3: Interactive Tester */}
          <div className="bg-[#0e1621] p-4 rounded-xl border border-[#1f2d3d] space-y-3">
            <h4 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
              <Send className="w-4 h-4" />
              <span>ارزیابی اتصال و اجرای ورک‌فلوی n8n:</span>
            </h4>

            <div className="flex gap-2 text-xs">
              <input
                type="text"
                value={testText}
                onChange={(e) => setTestText(e.target.value)}
                placeholder="پیام یا لینک مورد نظر را وارد کنید..."
                className="flex-1 bg-[#17222e] border border-[#27374a] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              />
              <button
                onClick={handleRunTest}
                disabled={isTesting}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition-all flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50"
              >
                {isTesting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>ارسال به بات</span>
              </button>
            </div>

            {testResponse && (
              <div className="bg-[#17222e] p-3 rounded-lg border border-[#27374a] space-y-1">
                <span className="text-[11px] font-bold text-slate-400 block">پاسخ دریافتی سیستم (JSON Response):</span>
                <pre className="text-[11px] font-mono text-emerald-300 overflow-x-auto max-h-40 p-2 bg-[#0a1017] rounded custom-scrollbar">
                  {JSON.stringify(testResponse, null, 2)}
                </pre>
              </div>
            )}
          </div>

          {/* Section: Webhook Delivery Logs (Last 5 attempts) */}
          <div className="bg-[#0e1621] p-4 rounded-xl border border-[#1f2d3d] space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-sky-400 flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                <span>تاریخچه ۵ ارسال اخیر وب‌هووک (Webhook Delivery Logs):</span>
              </h4>
              <button
                type="button"
                onClick={fetchAttempts}
                className="p-1.5 bg-[#17222e] hover:bg-[#202d3b] text-slate-300 rounded-lg text-xs flex items-center gap-1 transition-all border border-[#27374a] cursor-pointer"
                title="به‌روزرسانی تاریخچه"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>بروزرسانی</span>
              </button>
            </div>

            {attempts.length === 0 ? (
              <div className="text-center p-4 bg-[#17222e] rounded-lg border border-[#27374a] text-xs text-slate-400">
                هنوز هیچ ارسال وب‌هووکی ثبت نشده است. پس از دریافت پیام یا کلیک روی دکمه‌ها، ۵ ارسال اخیر در این بخش قرار می‌گیرند.
              </div>
            ) : (
              <div className="space-y-2">
                {attempts.slice(0, 5).map((att) => (
                  <div
                    key={att.id}
                    className={`p-2.5 rounded-lg border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                      att.status === 'success'
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                        : 'bg-rose-500/10 border-rose-500/30 text-rose-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                        att.status === 'success'
                          ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/40'
                          : 'bg-rose-500/30 text-rose-300 border border-rose-500/40'
                      }`}>
                        {att.status === 'success' ? `✓ ${att.statusCode || 200} OK` : `✕ ${att.statusCode || 'FAILED'}`}
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="font-mono font-bold text-white text-[11px] truncate flex items-center gap-1.5">
                          <span>رویداد: {att.event}</span>
                          <span className="text-slate-400 font-sans text-[10px]">({att.timeFa})</span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-mono truncate mt-0.5">
                          {att.url}
                        </p>
                      </div>
                    </div>

                    {att.errorMessage && (
                      <span className="text-[10px] font-mono text-rose-300 bg-rose-950/60 px-2 py-1 rounded shrink-0 border border-rose-800/40">
                        {att.errorMessage}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 4: Sample Workflow JSON & Import File */}
          <div className="bg-[#0e1621] p-4 rounded-xl border border-[#1f2d3d] space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <Code2 className="w-4 h-4 text-amber-400" />
                <span>فایل آماده ورک‌فلو n8n برای ایمپورت مستقیم:</span>
              </h4>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadWorkflow}
                  className="px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow transition-all cursor-pointer"
                  title="دانلود فایل slowmegabot-n8n-workflow.json"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>دانلود فایل JSON</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleCopy(sampleN8nWorkflow, 'workflow')}
                  className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  {copiedField === 'workflow' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>کپی کد JSON</span>
                </button>
              </div>
            </div>

            <div className="p-3 bg-[#17222e] rounded-lg border border-[#27374a] text-xs text-slate-300 space-y-1.5 leading-relaxed">
              <div className="font-bold text-sky-400 flex items-center gap-1.5 text-xs">
                <span>💡 نحوه ایمپورت (Import) در n8n:</span>
              </div>
              <p className="text-[11px] text-slate-400">
                • <strong>روش اول (فایل):</strong> روی دکمه <strong>«دانلود فایل JSON»</strong> کلیک کنید. در پنل n8n به منوی <strong>Workflows</strong> رفته، علامت سه‌نقطه (...) بالا سمت راست را زده و گزینه <strong>Import from File</strong> را انتخاب کنید.
              </p>
              <p className="text-[11px] text-slate-400">
                • <strong>روش دوم (کلیپ‌بورد):</strong> روی دکمه <strong>«کپی کد JSON»</strong> بزنید، وارد صفحه ادیتور یک ورک‌فلوی جدید در n8n شوید و کلید <strong>Ctrl + V</strong> (یا Cmd + V در مک) را فشار دهید تا تمامی گره‌ها و اتصالات آماده ظاهر شوند.
              </p>
            </div>

            <pre className="text-[10px] font-mono text-slate-300 bg-[#17222e] p-3 rounded-lg overflow-x-auto max-h-36 border border-[#27374a] custom-scrollbar">
              {sampleN8nWorkflow}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#0e1621] border-t border-[#243447] flex items-center justify-between text-xs text-slate-400">
          <span>SlowMegaBot + n8n Integration v2.5</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#243447] hover:bg-[#32465e] text-white font-medium rounded-xl transition-all cursor-pointer"
          >
            بستن
          </button>
        </div>
      </div>
    </div>
  );
};
