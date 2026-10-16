import { UserActivityChart } from './UserActivityChart';
import { BotUserRecord } from '../services/botEngine';
import React, { useState, useEffect } from 'react';
import {
  Database,
  Download,
  Upload,
  RefreshCw,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  Server,
  Layers,
  Sparkles,
  ExternalLink,
  Code,
  Shield,
  Trash2,
  Search,
  Eye,
  CheckCircle,
  HelpCircle,
  Clock,
  HardDrive,
  Users,
  Swords,
  ShoppingBag,
  Share2,
} from 'lucide-react';
import {
  generateSqlBackup,
  downloadSqlBackup,
  restoreSqlToSimulator,
  SQL_PRESETS,
  RestoreResult,
} from '../services/databaseBackupService';
import { botStorage } from '../services/botEngine';
import { platformStore } from '../services/platformStore';

interface DatabaseBackupManagerProps {
  onNavigateToSimulator?: () => void;
  onDataRestored?: () => void;
}

export function DatabaseBackupManager({
  onNavigateToSimulator,
  onDataRestored,
}: DatabaseBackupManagerProps) {
  const [subTab, setSubTab] = useState<'backup' | 'restore' | 'explorer'>('backup');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<any[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [lastBackupTime, setLastBackupTime] = useState<string | null>(null);

  // Backup configuration
  const [selectedTables, setSelectedTables] = useState<string[]>([
    'users_wallets',
    'clash_villages',
    'mafia_accounts',
    'purchase_orders',
    'seen_orders',
    'uploaded_files',
    'bot_owner_config',
  ]);
  const [previewSql, setPreviewSql] = useState<string>('');
  const [copied, setCopied] = useState(false);

  // Restore configuration
  const [restoreSqlText, setRestoreSqlText] = useState<string>('');
  const [restoreMode, setRestoreMode] = useState<'replace' | 'merge'>('replace');
  const [restoreResult, setRestoreResult] = useState<RestoreResult | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  // Explorer state
  const [selectedExplorerTable, setSelectedExplorerTable] = useState<string>('users_wallets');
  const [searchQuery, setSearchQuery] = useState('');
  const [liveUsers, setLiveUsers] = useState<BotUserRecord[]>(Array.from(botStorage.users.values()));

  // Fetch live stats
  const refreshStats = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/database/stats');
      fetch('/api/bot/users')
        .then((r) => r.json())
        .then((d) => {
          if (d.ok && Array.isArray(d.users)) {
            setLiveUsers(d.users);
            for (const u of d.users) {
              botStorage.users.set(u.id, u);
            }
          }
        })
        .catch(() => {});
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats || []);
        setTotalRecords(data.totalRecords || 0);
      } else {
        // Fallback calculation from local state
        fallbackCalculateStats();
      }
    } catch {
      fallbackCalculateStats();
    } finally {
      setLoading(false);
    }
  };

  const fallbackCalculateStats = () => {
    const s = [
      { name: 'bot_users', label: 'کاربران ذخیره‌شده تلگرام، بله و روبیکا', count: botStorage.users.size, description: 'پروفایل کامل تمام کاربران ربات، پلتفرم، تعداد تعامل و وضعیت آنلاین' },
      { name: 'users_wallets', label: 'کیف‌پول‌ها و کاربران', count: botStorage.wallets.size, description: 'حساب‌های کاربری، موجودی تومانی، سکه‌ها و اشتراک‌ها' },
      { name: 'clash_villages', label: 'دهکده‌های کلش', count: botStorage.clashVillages.size, description: 'قلعه‌ها، سطح تاون‌هال، مخازن طلا و اکسیر و سربازان' },
      { name: 'mafia_accounts', label: 'اکانت‌های مافیا آنلاین', count: platformStore.users.size, description: 'سطوح، الماس‌ها، برد و باخت و نقش‌های خریداری شده' },
      { name: 'purchase_orders', label: 'سفارشات خرید و رسیدها', count: botStorage.orders.length, description: 'فاکتورهای پرداخت، وضعیت تایید یا رد سفارش' },
      { name: 'seen_orders', label: 'سفارشات سین تلگرام', count: botStorage.seenOrders.length, description: 'سفارشات بازدید پست‌های تلگرام و قیمت‌ها' },
      { name: 'uploaded_files', label: 'فایل‌های آپلودشده (Aplo)', count: botStorage.uploadedFiles.length, description: 'فایل‌های مستقیم آپلودشده، رمزها و لینک‌های دانلود' },
      { name: 'bot_owner_config', label: 'تنظیمات درگاه و مالک ربات', count: 1, description: 'شماره کارت مالک، مرچنت زرین‌پال و وضعیت درگاه' },
    ];
    setStats(s);
    setTotalRecords(s.reduce((acc, curr) => acc + curr.count, 0));
  };

  useEffect(() => {
    refreshStats();
    updateSqlPreview();
  }, [selectedTables]);

  const updateSqlPreview = () => {
    const sql = generateSqlBackup(selectedTables);
    setPreviewSql(sql);
  };

  const handleDownloadFullBackup = () => {
    const sql = generateSqlBackup(selectedTables);
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `slowmegabot_db_backup_${dateStr}.sql`;
    downloadSqlBackup(sql, filename);
    setLastBackupTime(new Date().toLocaleTimeString('fa-IR'));
  };

  const handleDownloadPreset = (preset: typeof SQL_PRESETS[0]) => {
    const sql = preset.generateSql();
    downloadSqlBackup(sql, `slowmegabot_${preset.id}_backup.sql`);
  };

  const handleLoadPresetToRestore = (preset: typeof SQL_PRESETS[0]) => {
    setRestoreSqlText(preset.generateSql());
    setSubTab('restore');
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(previewSql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setRestoreSqlText(content);
        setRestoreError(null);
      }
    };
    reader.readAsText(file);
  };

  const handleExecuteRestore = async () => {
    if (!restoreSqlText.trim()) {
      setRestoreError('لطفاً محتوای اسکریپت SQL یا فایل پشتیبان را وارد کنید.');
      return;
    }

    setIsRestoring(true);
    setRestoreError(null);
    setRestoreResult(null);

    try {
      // 1. Try sending to backend API first
      let resData: RestoreResult | null = null;
      try {
        const res = await fetch('/api/database/restore', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Admin-Key': 'slowmega_admin_secret_key_2026' },
          body: JSON.stringify({ sql: restoreSqlText, mode: restoreMode }),
        });
        if (res.ok) {
          resData = await res.json();
        }
      } catch {
        // Fallback to local simulator restore
      }

      if (!resData) {
        resData = restoreSqlToSimulator(restoreSqlText, { mode: restoreMode });
      }

      setRestoreResult(resData);
      refreshStats();
      updateSqlPreview();

      if (onDataRestored) {
        onDataRestored();
      }
    } catch (err: any) {
      setRestoreError(`خطا در بازیابی: ${err?.message || err}`);
    } finally {
      setIsRestoring(false);
    }
  };

  const toggleTableSelection = (tableName: string) => {
    setSelectedTables((prev) =>
      prev.includes(tableName)
        ? prev.filter((t) => t !== tableName)
        : [...prev, tableName]
    );
  };

  // Get table rows for Explorer
  const getExplorerRows = () => {
    switch (selectedExplorerTable) {
      case 'bot_users':
        return Array.from(botStorage.users.values()).filter((u) =>
          searchQuery
            ? String(u.rawId).includes(searchQuery) ||
              u.firstName.includes(searchQuery) ||
              (u.username && u.username.includes(searchQuery)) ||
              u.platform.includes(searchQuery)
            : true
        );
      case 'users_wallets':
        return Array.from(botStorage.wallets.values()).filter((w) =>
          searchQuery ? String(w.userId).includes(searchQuery) || w.subscriptionTier.includes(searchQuery) : true
        );
      case 'clash_villages':
        return Array.from(botStorage.clashVillages.values()).filter((v) =>
          searchQuery ? v.name.includes(searchQuery) || String(v.userId).includes(searchQuery) || (v.clan && v.clan.includes(searchQuery)) : true
        );
      case 'mafia_accounts':
        return Array.from(platformStore.users.values()).filter((u) =>
          searchQuery ? u.username.includes(searchQuery) || u.displayName.includes(searchQuery) : true
        );
      case 'purchase_orders':
        return botStorage.orders.filter((o) =>
          searchQuery ? o.id.includes(searchQuery) || o.userName.includes(searchQuery) || o.itemTitle.includes(searchQuery) : true
        );
      case 'seen_orders':
        return botStorage.seenOrders.filter((s) =>
          searchQuery ? s.id.includes(searchQuery) || s.postLink.includes(searchQuery) : true
        );
      case 'uploaded_files':
        return botStorage.uploadedFiles.filter((f) =>
          searchQuery ? f.fileName.includes(searchQuery) || f.id.includes(searchQuery) : true
        );
      case 'bot_owner_config':
        return [botStorage.ownerConfig];
      default:
        return [];
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto font-['Vazirmatn',sans-serif]">
      {/* Top Banner / Summary Card */}
      <div className="bg-gradient-to-r from-[#17212b] via-[#1c2938] to-[#17212b] rounded-2xl border border-[#242f3d] p-5 sm:p-6 shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/20 text-white shrink-0">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white tracking-wide">
                  مدیریت دیتابیس و فایل‌های پشتیبان (SQL Backup & Restore)
                </h2>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                  سازگار با MySQL / SQLite
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                تولید و دانلود پشتیبان کامل ساختار و داده‌ها، امکان بازیابی (Restore) آنی در شبیه‌ساز و کاوشگر جداول
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full md:w-auto">
            <button
              onClick={handleDownloadFullBackup}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-[#0088cc] hover:bg-[#0077b3] text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-md transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>دانلود فوری پشتیبان SQL</span>
            </button>

            <button
              onClick={refreshStats}
              disabled={loading}
              className="p-2.5 rounded-xl bg-[#0e1621] hover:bg-[#202d3b] border border-[#242f3d] text-slate-300 hover:text-white transition-all cursor-pointer"
              title="به‌روزرسانی اطلاعات"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
            </button>

            {onNavigateToSimulator && (
              <button
                onClick={onNavigateToSimulator}
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-300 text-xs font-bold transition-all cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>ورود به شبیه‌ساز</span>
              </button>
            )}
          </div>
        </div>

        {/* Live Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-[#242f3d]/60 text-xs">
          <div className="bg-[#0e1621]/70 p-3 rounded-xl border border-[#242f3d]/50">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span>مجموع رکوردهای فعال</span>
              <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <div className="text-xl font-black text-white">
              {totalRecords.toLocaleString('fa-IR')}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">در تمامی جداول سیستم</div>
          </div>

          <div className="bg-[#0e1621]/70 p-3 rounded-xl border border-[#242f3d]/50">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span>تعداد جداول ساختاریافته</span>
              <Layers className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-xl font-black text-amber-400">
              {stats.length || 7}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">شامل والِت، کلش، مافیا و سفارشات</div>
          </div>

          <div className="bg-[#0e1621]/70 p-3 rounded-xl border border-[#242f3d]/50">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span>وضعیت موتور دیتابیس</span>
              <Server className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-sm font-black text-emerald-400 flex items-center gap-1.5 mt-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              فعال و آماده کوئری
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Transaction Safe</div>
          </div>

          <div className="bg-[#0e1621]/70 p-3 rounded-xl border border-[#242f3d]/50">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span>آخرین خروجی SQL</span>
              <Clock className="w-3.5 h-3.5 text-purple-400" />
            </div>
            <div className="text-sm font-black text-purple-300 mt-1">
              {lastBackupTime ? lastBackupTime : 'هم‌اکنون در دسترس'}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">فرمت استاندارد .sql</div>
          </div>
        </div>
      </div>

      {/* Sub-Navigation Buttons */}
      <div className="flex items-center justify-between bg-[#17212b] p-1.5 rounded-xl border border-[#242f3d] text-xs">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSubTab('backup')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all cursor-pointer ${
              subTab === 'backup'
                ? 'bg-[#0088cc] text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-[#202d3b]'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>تهیه نسخه پشتیبان (Backup)</span>
          </button>

          <button
            onClick={() => setSubTab('restore')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all cursor-pointer ${
              subTab === 'restore'
                ? 'bg-[#0088cc] text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-[#202d3b]'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>بازیابی در شبیه‌ساز (Restore)</span>
          </button>

          <button
            onClick={() => setSubTab('explorer')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all cursor-pointer ${
              subTab === 'explorer'
                ? 'bg-[#0088cc] text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-[#202d3b]'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>کاوشگر جداول و داده‌ها (Explorer)</span>
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-slate-400 text-[11px] px-3">
          <Shield className="w-3.5 h-3.5 text-emerald-400" />
          <span>پشتیبانی از دستورات استاندارد DDL & DML</span>
        </div>
      </div>

      {/* SUB-TAB 1: BACKUP / EXPORT */}
      {subTab === 'backup' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left / Settings Column */}
          <div className="space-y-5">
            {/* Table Selection Box */}
            <div className="bg-[#17212b] rounded-2xl border border-[#242f3d] p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  <span>انتخاب جداول برای خروجی</span>
                </h3>
                <span className="text-[11px] text-slate-400 font-mono">
                  {selectedTables.length} / {stats.length || 7}
                </span>
              </div>

              <div className="space-y-2 text-xs">
                {stats.map((tbl) => {
                  const isChecked = selectedTables.includes(tbl.name);
                  return (
                    <label
                      key={tbl.name}
                      className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                        isChecked
                          ? 'bg-[#0e1621] border-cyan-500/40 text-white'
                          : 'bg-[#121922] border-[#242f3d]/60 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleTableSelection(tbl.name)}
                          className="w-4 h-4 rounded text-cyan-500 focus:ring-cyan-400 border-slate-700 bg-slate-900 cursor-pointer"
                        />
                        <div>
                          <div className="font-bold text-white">{tbl.label}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{tbl.name}</div>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-md bg-[#242f3d] text-[10px] font-mono text-cyan-300">
                        {tbl.count} سطر
                      </span>
                    </label>
                  );
                })}
              </div>

              <div className="pt-2 flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => setSelectedTables(stats.map((s) => s.name))}
                  className="text-cyan-400 hover:underline cursor-pointer"
                >
                  انتخاب همه
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedTables([])}
                  className="text-slate-400 hover:underline cursor-pointer"
                >
                  لغو انتخاب همه
                </button>
              </div>
            </div>

            {/* Presets Gallery */}
            <div className="bg-[#17212b] rounded-2xl border border-[#242f3d] p-5 space-y-3">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>پکیج‌های آماده و سناریوهای تستی</span>
              </h3>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                می‌توانید سناریوهای پیش‌فرض را دانلود کرده یا مستقیماً برای آزمایش به بخش بازیابی منتقل کنید:
              </p>

              <div className="space-y-2.5">
                {SQL_PRESETS.map((preset) => (
                  <div
                    key={preset.id}
                    className="p-3 rounded-xl bg-[#0e1621] border border-[#242f3d] space-y-2 text-xs"
                  >
                    <div className="font-bold text-white flex items-center justify-between">
                      <span>{preset.name}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      {preset.description}
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => handleDownloadPreset(preset)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-[#242f3d] hover:bg-[#2c394a] text-white text-[11px] font-medium transition-all cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5 text-cyan-400" />
                        <span>دانلود .sql</span>
                      </button>
                      <button
                        onClick={() => handleLoadPresetToRestore(preset)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 text-[11px] font-medium transition-all cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>انتقال به بازیابی</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right / Live SQL Code Preview Column */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-[#17212b] rounded-2xl border border-[#242f3d] p-5 flex flex-col h-full shadow-lg">
              <div className="flex items-center justify-between pb-3 border-b border-[#242f3d] mb-4">
                <div className="flex items-center gap-2">
                  <Code className="w-4 h-4 text-cyan-400" />
                  <h3 className="font-bold text-white text-sm">
                    پیش‌نمایش زنده خروجی SQL (SQL Dump Preview)
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopySql}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0e1621] hover:bg-[#202d3b] border border-[#242f3d] text-slate-300 hover:text-white text-xs transition-all cursor-pointer"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">کپی شد!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>کپی کد SQL</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleDownloadFullBackup}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0088cc] hover:bg-[#0077b3] text-white text-xs font-bold transition-all shadow-md cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>دانلود فایل .sql</span>
                  </button>
                </div>
              </div>

              {/* Code viewer container */}
              <div className="flex-1 bg-[#0a0f18] rounded-xl border border-[#242f3d]/80 p-4 font-mono text-[11px] text-cyan-300/90 overflow-x-auto max-h-[560px] overflow-y-auto leading-relaxed dir-ltr select-text">
                <pre>{previewSql}</pre>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-3 mt-3 border-t border-[#242f3d]">
                <span>انکودینگ: UTF-8 (utf8mb4) | سینتکس سازگار با MariaDB / MySQL / SQLite3</span>
                <span>تعداد خطوط: {previewSql.split('\n').length.toLocaleString('fa-IR')}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: RESTORE & IMPORT */}
      {subTab === 'restore' && (
        <div className="space-y-6">
          <div className="bg-[#17212b] rounded-2xl border border-[#242f3d] p-5 sm:p-6 space-y-5 shadow-lg">
            <div>
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Upload className="w-5 h-5 text-cyan-400" />
                <span>بازیابی و اجرای فایل پشتیبان در محیط شبیه‌ساز</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                می‌توانید فایل پشتیبان SQL را بارگذاری کرده یا کوئری‌های SQL موردنظر خود را در کادر زیر قرار دهید. سیستم به‌طور خودکار دستورات را اعتبارسنجی و داده‌های شبیه‌ساز را فوراً همگام‌سازی می‌کند.
              </p>
            </div>

            {/* Dropzone & Mode selection */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* File upload tile */}
              <div className="md:col-span-2 border-2 border-dashed border-[#242f3d] hover:border-cyan-500/60 rounded-xl p-4 bg-[#0e1621] text-center transition-all">
                <input
                  type="file"
                  id="sql-file-input"
                  accept=".sql,text/plain"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <label
                  htmlFor="sql-file-input"
                  className="flex flex-col items-center justify-center gap-2 cursor-pointer py-3"
                >
                  <div className="w-10 h-10 rounded-full bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div className="text-xs font-bold text-white">
                    انتخاب یا رها کردن فایل پشتیبان SQL (.sql)
                  </div>
                  <div className="text-[11px] text-slate-400">
                    پشتیبانی از تمامی فایل‌های خروجی گرفته‌شده از این سامانه یا MySQL dump
                  </div>
                </label>
              </div>

              {/* Restore Mode */}
              <div className="bg-[#0e1621] p-4 rounded-xl border border-[#242f3d] space-y-2 text-xs flex flex-col justify-center">
                <div className="font-bold text-white text-xs flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-cyan-400" />
                  <span>حالت اجرای بازیابی:</span>
                </div>

                <label className="flex items-center gap-2 text-slate-300 cursor-pointer pt-1">
                  <input
                    type="radio"
                    name="restoreMode"
                    value="replace"
                    checked={restoreMode === 'replace'}
                    onChange={() => setRestoreMode('replace')}
                    className="text-cyan-500 focus:ring-cyan-400 bg-slate-900 cursor-pointer"
                  />
                  <span>جایگزینی کامل (Clean & Replace)</span>
                </label>

                <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                  <input
                    type="radio"
                    name="restoreMode"
                    value="merge"
                    checked={restoreMode === 'merge'}
                    onChange={() => setRestoreMode('merge')}
                    className="text-cyan-500 focus:ring-cyan-400 bg-slate-900 cursor-pointer"
                  />
                  <span>افزودن و ادغام به داده‌ها (Merge)</span>
                </label>
              </div>
            </div>

            {/* SQL Input Textarea */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <label className="font-bold text-slate-300 flex items-center gap-1.5">
                  <Code className="w-4 h-4 text-cyan-400" />
                  <span>متن اسکریپت SQL جهت پردازش و اعمال:</span>
                </label>
                {restoreSqlText && (
                  <button
                    onClick={() => setRestoreSqlText('')}
                    className="text-slate-400 hover:text-rose-400 transition-all cursor-pointer flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    پاکسازی کادر
                  </button>
                )}
              </div>

              <textarea
                value={restoreSqlText}
                onChange={(e) => setRestoreSqlText(e.target.value)}
                placeholder="-- متن دستورات SQL را اینجا وارد کنید یا از دکمه بارگذاری فایل بالا استفاده نمایید...&#10;INSERT INTO `users_wallets` VALUES (12345678, 150000, 2000, 'free', 'ندارد', '۱۴۰۳/۰۷/۲۱');"
                rows={10}
                className="w-full bg-[#0a0f18] text-cyan-300 font-mono text-xs p-4 rounded-xl border border-[#242f3d] focus:border-cyan-500 focus:outline-none leading-relaxed dir-ltr"
              />
            </div>

            {/* Error banner if any */}
            {restoreError && (
              <div className="bg-rose-500/10 border border-rose-500/30 p-3.5 rounded-xl text-xs text-rose-300 flex items-center gap-2.5">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{restoreError}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <div className="text-[11px] text-slate-400">
                با اعمال تغییرات، کیف‌پول، دهکده کلش، سفارشات و اکانت‌های مافیا در شبیه‌ساز فوراً بروزرسانی خواهند شد.
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={handleExecuteRestore}
                  disabled={isRestoring || !restoreSqlText.trim()}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-lg transition-all disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw className={`w-4 h-4 ${isRestoring ? 'animate-spin' : ''}`} />
                  <span>{isRestoring ? 'در حال پردازش و همگام‌سازی...' : 'اجرای بازیابی در شبیه‌ساز'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Restore Result Card */}
          {restoreResult && (
            <div className="bg-[#17212b] rounded-2xl border border-emerald-500/30 p-5 space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">
                      عملیات بازیابی با موفقیت در شبیه‌ساز انجام شد!
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      داده‌های جدید با موفقیت در حافظه ربات ذخیره و اعمال گردیدند.
                    </p>
                  </div>
                </div>

                {onNavigateToSimulator && (
                  <button
                    onClick={onNavigateToSimulator}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-all shadow-md cursor-pointer"
                  >
                    <span>بررسی نتایج در شبیه‌ساز تلگرام</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Statistics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-2">
                <div className="bg-[#0e1621] p-3 rounded-xl border border-[#242f3d]">
                  <div className="text-slate-400 text-[11px]">کوئری‌های پردازش‌شده</div>
                  <div className="text-base font-black text-white mt-1">
                    {restoreResult.queriesExecuted.toLocaleString('fa-IR')}
                  </div>
                </div>

                <div className="bg-[#0e1621] p-3 rounded-xl border border-[#242f3d]">
                  <div className="text-slate-400 text-[11px]">سطرهای واردشده</div>
                  <div className="text-base font-black text-emerald-400 mt-1">
                    {restoreResult.rowsImported.toLocaleString('fa-IR')}
                  </div>
                </div>

                <div className="bg-[#0e1621] p-3 rounded-xl border border-[#242f3d]">
                  <div className="text-slate-400 text-[11px]">جداول متاثر</div>
                  <div className="text-base font-black text-cyan-400 mt-1">
                    {restoreResult.tablesAffected.length.toLocaleString('fa-IR')} جدول
                  </div>
                </div>

                <div className="bg-[#0e1621] p-3 rounded-xl border border-[#242f3d]">
                  <div className="text-slate-400 text-[11px]">وضعیت اعتبارسنجی</div>
                  <div className="text-xs font-bold text-emerald-400 mt-1 flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" /> بدون خطای بحرانی
                  </div>
                </div>
              </div>

              {/* Table breakdown pills */}
              {restoreResult.details.length > 0 && (
                <div className="pt-2">
                  <div className="text-xs font-bold text-slate-300 mb-2">جداول بروزرسانی‌شده:</div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {restoreResult.details.map((d) => (
                      <span
                        key={d.table}
                        className="px-2.5 py-1 rounded-lg bg-[#0e1621] border border-cyan-500/30 text-cyan-300 font-mono text-[11px] flex items-center gap-1.5"
                      >
                        <span>{d.table}:</span>
                        <span className="font-bold text-white">{d.count} رکورد</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 3: TABLE EXPLORER */}
      {subTab === 'explorer' && (
        <div className="space-y-4">
          <div className="bg-[#17212b] rounded-2xl border border-[#242f3d] p-5 space-y-4 shadow-lg">
            {/* Table selector & Search bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
                {stats.map((s) => (
                  <button
                    key={s.name}
                    onClick={() => {
                      setSelectedExplorerTable(s.name);
                      setSearchQuery('');
                    }}
                    className={`px-3 py-2 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                      selectedExplorerTable === s.name
                        ? 'bg-[#0088cc] text-white shadow-md'
                        : 'bg-[#0e1621] hover:bg-[#202d3b] text-slate-400 hover:text-white border border-[#242f3d]'
                    }`}
                  >
                    <span>{s.label}</span>
                    <span className="text-[10px] bg-black/30 px-1.5 py-0.5 rounded-full font-mono">
                      {s.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* Search input */}
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="جستجو در سطرها..."
                  className="w-full bg-[#0e1621] text-xs text-white pr-9 pl-3 py-2 rounded-xl border border-[#242f3d] focus:border-cyan-500 focus:outline-none"
                />
              </div>
            </div>

            {/* 24-Hour User Activity Bar Chart (Recharts) */}
            {(selectedExplorerTable === 'bot_users' || selectedExplorerTable === 'users_wallets') && (
              <UserActivityChart users={liveUsers.length > 0 ? liveUsers : Array.from(botStorage.users.values())} />
            )}

            {/* Table Records View */}
            <div className="bg-[#0e1621] rounded-xl border border-[#242f3d] overflow-x-auto">
              {/* Saved Bot Users Table (Telegram, Bale, Rubika) */}
              {selectedExplorerTable === 'bot_users' && (
                <table className="w-full text-right text-xs">
                  <thead className="bg-[#17212b] text-slate-400 border-b border-[#242f3d]">
                    <tr>
                      <th className="p-3 font-semibold">پلتفرم</th>
                      <th className="p-3 font-semibold">کاربر / نام نمایشی</th>
                      <th className="p-3 font-semibold">شناسه (User ID)</th>
                      <th className="p-3 font-semibold">تعداد تعاملات</th>
                      <th className="p-3 font-semibold">دانلودها</th>
                      <th className="p-3 font-semibold">آخرین فعالیت</th>
                      <th className="p-3 font-semibold">سطح اشتراک</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#242f3d]/60 text-slate-300">
                    {getExplorerRows().length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-500">
                          هنوز کاربری ثبت نشده است. به ربات تلگرام، بله یا روبیکا پیامی بفرستید تا ذخیره شود.
                        </td>
                      </tr>
                    ) : (
                      getExplorerRows().map((row: any) => (
                        <tr key={row.id} className="hover:bg-[#1a2533]">
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              row.platform === 'telegram'
                                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                                : row.platform === 'bale'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : row.platform === 'rubika'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : 'bg-slate-700 text-slate-300'
                            }`}>
                              {row.platform === 'telegram'
                                ? 'تلگرام (Telegram)'
                                : row.platform === 'bale'
                                ? 'بله (Bale)'
                                : row.platform === 'rubika'
                                ? 'روبیکا (Rubika)'
                                : 'شبیه‌ساز'}
                            </span>
                          </td>
                          <td className="p-3 font-bold text-white">
                            <div>{row.firstName} {row.lastName || ''}</div>
                            {row.username && (
                              <div className="text-[10px] font-mono text-cyan-400">@{row.username}</div>
                            )}
                          </td>
                          <td className="p-3 font-mono text-slate-300">
                            {row.rawId}
                          </td>
                          <td className="p-3 font-mono font-bold text-cyan-300">
                            {row.interactionsCount || 1} پیام
                          </td>
                          <td className="p-3 font-mono text-amber-300">
                            {row.downloadsCount || 0} فایل
                          </td>
                          <td className="p-3 text-[11px] text-slate-400">
                            {row.lastSeen || 'امروز'}
                          </td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-700 text-slate-200">
                              {row.subscriptionTier || 'free'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}

              {/* Users Wallets Table */}
              {selectedExplorerTable === 'users_wallets' && (
                <table className="w-full text-right text-xs">
                  <thead className="bg-[#17212b] text-slate-400 border-b border-[#242f3d]">
                    <tr>
                      <th className="p-3 font-semibold">شناسه کاربری (User ID)</th>
                      <th className="p-3 font-semibold">موجودی کیف‌پول (تومان)</th>
                      <th className="p-3 font-semibold">سکه‌ها</th>
                      <th className="p-3 font-semibold">سطح اشتراک</th>
                      <th className="p-3 font-semibold">انقضای اشتراک</th>
                      <th className="p-3 font-semibold">تاریخ عضویت</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#242f3d]/60 text-slate-300">
                    {getExplorerRows().map((row: any) => (
                      <tr key={row.userId} className="hover:bg-[#1a2533]">
                        <td className="p-3 font-mono font-bold text-white flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-cyan-400" />
                          <span>{row.userId}</span>
                          {row.userId === 12345678 && (
                            <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 rounded">
                              شما (تستی)
                            </span>
                          )}
                        </td>
                        <td className="p-3 font-mono font-bold text-emerald-400">
                          {Number(row.balance).toLocaleString('fa-IR')} تومان
                        </td>
                        <td className="p-3 font-mono text-amber-400">
                          {Number(row.coins).toLocaleString('fa-IR')} 🪙
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            row.subscriptionTier === 'diamond'
                              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                              : row.subscriptionTier === 'gold'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-slate-700/50 text-slate-400'
                          }`}>
                            {row.subscriptionTier}
                          </span>
                        </td>
                        <td className="p-3 text-slate-400">{row.subscriptionExpiry}</td>
                        <td className="p-3 text-slate-400">{row.joinedDate}</td>
                      </tr>
                    ))}
                    {getExplorerRows().length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-slate-500">
                          هیچ رکوردی برای نمایش یافت نشد.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}

              {/* Clash Villages Table */}
              {selectedExplorerTable === 'clash_villages' && (
                <table className="w-full text-right text-xs">
                  <thead className="bg-[#17212b] text-slate-400 border-b border-[#242f3d]">
                    <tr>
                      <th className="p-3 font-semibold">شناسه / نام دهکده</th>
                      <th className="p-3 font-semibold">تاون‌هال (Town Hall)</th>
                      <th className="p-3 font-semibold">مخزن طلا</th>
                      <th className="p-3 font-semibold">مخزن اکسیر</th>
                      <th className="p-3 font-semibold">کاپ‌ها</th>
                      <th className="p-3 font-semibold">قبیله (Clan)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#242f3d]/60 text-slate-300">
                    {getExplorerRows().map((row: any) => (
                      <tr key={row.userId} className="hover:bg-[#1a2533]">
                        <td className="p-3 font-bold text-white flex items-center gap-1.5">
                          <Swords className="w-3.5 h-3.5 text-rose-400" />
                          <span>{row.name}</span>
                          <span className="text-[10px] text-slate-500 font-mono">({row.userId})</span>
                        </td>
                        <td className="p-3 font-mono font-bold text-amber-400">
                          سطح {row.townHall} 🏰
                        </td>
                        <td className="p-3 font-mono text-yellow-300">
                          {Number(row.gold).toLocaleString('fa-IR')} / {Number(row.maxGold).toLocaleString('fa-IR')}
                        </td>
                        <td className="p-3 font-mono text-purple-400">
                          {Number(row.elixir).toLocaleString('fa-IR')} / {Number(row.maxElixir).toLocaleString('fa-IR')}
                        </td>
                        <td className="p-3 font-mono text-cyan-300">{row.cups} 🏆</td>
                        <td className="p-3 text-slate-300">{row.clan}</td>
                      </tr>
                    ))}
                    {getExplorerRows().length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-slate-500">
                          هیچ دهکده‌ای ثبت نشده است.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}

              {/* Purchase Orders Table */}
              {selectedExplorerTable === 'purchase_orders' && (
                <table className="w-full text-right text-xs">
                  <thead className="bg-[#17212b] text-slate-400 border-b border-[#242f3d]">
                    <tr>
                      <th className="p-3 font-semibold">شناسه سفارش</th>
                      <th className="p-3 font-semibold">نام کاربر / شناسه</th>
                      <th className="p-3 font-semibold">شرح آیتم / محصول</th>
                      <th className="p-3 font-semibold">مبلغ (تومان)</th>
                      <th className="p-3 font-semibold">وضعیت</th>
                      <th className="p-3 font-semibold">تاریخ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#242f3d]/60 text-slate-300">
                    {getExplorerRows().map((row: any) => (
                      <tr key={row.id} className="hover:bg-[#1a2533]">
                        <td className="p-3 font-mono font-bold text-cyan-300">{row.id}</td>
                        <td className="p-3 text-white">{row.userName} ({row.userId})</td>
                        <td className="p-3 text-slate-300">{row.itemTitle}</td>
                        <td className="p-3 font-mono font-bold text-emerald-400">
                          {Number(row.amount).toLocaleString('fa-IR')} تومان
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            row.status === 'approved'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}>
                            {row.status === 'approved' ? 'تایید و پرداخت‌شده' : 'در انتظار بررسی'}
                          </span>
                        </td>
                        <td className="p-3 text-slate-400">{row.date}</td>
                      </tr>
                    ))}
                    {getExplorerRows().length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-slate-500">
                          سفارش خریدی در سیستم ثبت نشده است.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}

              {/* Mafia Accounts Table */}
              {selectedExplorerTable === 'mafia_accounts' && (
                <table className="w-full text-right text-xs">
                  <thead className="bg-[#17212b] text-slate-400 border-b border-[#242f3d]">
                    <tr>
                      <th className="p-3 font-semibold">شناسه / نام کاربری</th>
                      <th className="p-3 font-semibold">نام نمایشی</th>
                      <th className="p-3 font-semibold">سطح و امتیاز</th>
                      <th className="p-3 font-semibold">سکه / الماس</th>
                      <th className="p-3 font-semibold">برد / باخت</th>
                      <th className="p-3 font-semibold">لیگ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#242f3d]/60 text-slate-300">
                    {getExplorerRows().map((row: any) => (
                      <tr key={row.id} className="hover:bg-[#1a2533]">
                        <td className="p-3 font-mono text-cyan-300">{row.username}</td>
                        <td className="p-3 font-bold text-white">{row.displayName}</td>
                        <td className="p-3 font-mono">سطح {row.level} ({row.points} امتیاز)</td>
                        <td className="p-3 font-mono text-amber-400">{row.coins} 🪙 / {row.diamonds} 💎</td>
                        <td className="p-3 font-mono text-slate-300">{row.gamesWon} برد / {row.gamesLost} باخت</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                            {row.league}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* Uploaded Files Table */}
              {selectedExplorerTable === 'uploaded_files' && (
                <table className="w-full text-right text-xs">
                  <thead className="bg-[#17212b] text-slate-400 border-b border-[#242f3d]">
                    <tr>
                      <th className="p-3 font-semibold">شناسه فایل</th>
                      <th className="p-3 font-semibold">نام فایل</th>
                      <th className="p-3 font-semibold">حجم</th>
                      <th className="p-3 font-semibold">لینک تلگرام</th>
                      <th className="p-3 font-semibold">رمز عبور</th>
                      <th className="p-3 font-semibold">تاریخ آپلود</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#242f3d]/60 text-slate-300">
                    {getExplorerRows().map((row: any) => (
                      <tr key={row.id} className="hover:bg-[#1a2533]">
                        <td className="p-3 font-mono text-cyan-300">{row.id}</td>
                        <td className="p-3 font-bold text-white">{row.fileName}</td>
                        <td className="p-3 font-mono text-slate-400">{row.fileSize}</td>
                        <td className="p-3 text-cyan-400 font-mono text-[11px] truncate max-w-xs">{row.downloadLink}</td>
                        <td className="p-3 text-slate-400">{row.isPasswordProtected ? row.password : 'ندارد'}</td>
                        <td className="p-3 text-slate-400">{row.uploadDate}</td>
                      </tr>
                    ))}
                    {getExplorerRows().length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-slate-500">
                          هیچ فایلی آپلود نشده است.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}

              {/* Bot Owner Config */}
              {selectedExplorerTable === 'bot_owner_config' && (
                <div className="p-5 space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-[#17212b] p-3 rounded-xl border border-[#242f3d]">
                      <div className="text-slate-400 text-[11px]">شماره کارت بانکی مالک</div>
                      <div className="text-sm font-mono font-bold text-amber-400 mt-1">
                        {botStorage.ownerConfig.cardNumber}
                      </div>
                    </div>
                    <div className="bg-[#17212b] p-3 rounded-xl border border-[#242f3d]">
                      <div className="text-slate-400 text-[11px]">نام صاحب حساب و بانک</div>
                      <div className="text-sm font-bold text-white mt-1">
                        {botStorage.ownerConfig.cardHolder} ({botStorage.ownerConfig.bankName})
                      </div>
                    </div>
                    <div className="bg-[#17212b] p-3 rounded-xl border border-[#242f3d]">
                      <div className="text-slate-400 text-[11px]">درگاه پرداخت آنلاین</div>
                      <div className="text-sm font-bold text-cyan-400 mt-1">
                        {botStorage.ownerConfig.gatewayName}
                      </div>
                    </div>
                    <div className="bg-[#17212b] p-3 rounded-xl border border-[#242f3d]">
                      <div className="text-slate-400 text-[11px]">مرچنت کد زرین‌پال</div>
                      <div className="text-sm font-mono text-slate-300 mt-1">
                        {botStorage.ownerConfig.gatewayMerchantId}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
