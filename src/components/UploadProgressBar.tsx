import React, { useState, useEffect } from 'react';
import { UploadCloud, CheckCircle2, Download, Copy, Check, Clock, Zap } from 'lucide-react';
import confetti from 'canvas-confetti';
import { UploadProgressPayload } from '../types/telegram';

interface UploadProgressBarProps {
  data: UploadProgressPayload;
  onCopyFeedback?: () => void;
}

export const UploadProgressBar: React.FC<UploadProgressBarProps> = ({ data, onCopyFeedback }) => {
  const [progress, setProgress] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [copied, setCopied] = useState(false);

  const totalMb = data.fileSizeMb || 24.5;
  const speed = data.speedMbps || 14.2;
  const fileName = data.fileName || 'MODASR_Project_Archive.zip';
  const generatedLink =
    data.generatedLink ||
    data.directUrl ||
    'https://ais-dev-dxc4tymnudmayrh26p7cqa-76299078893.us-east1.run.app/MODASR_FULL_PROJECT_CURRENT.zip';

  useEffect(() => {
    const intervalTime = 35; // 35ms per tick
    const totalSteps = 45; // ~1.5s total duration
    let step = 0;

    const timer = setInterval(() => {
      step++;
      const currentPercent = Math.min(100, Math.round((step / totalSteps) * 100));
      setProgress(currentPercent);

      if (currentPercent >= 100) {
        clearInterval(timer);
        setIsCompleted(true);
      }
    }, intervalTime);

    return () => clearInterval(timer);
  }, []);

  const transferredMb = ((progress / 100) * totalMb).toFixed(1);

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    if (onCopyFeedback) onCopyFeedback();
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownload = () => {
    confetti({ particleCount: 35, spread: 60, origin: { y: 0.8 } });
  };

  return (
    <div className="my-2.5 p-3.5 rounded-xl bg-gradient-to-b from-[#131e2b] to-[#0c141d] border border-[#233547] shadow-lg text-slate-100 font-sans space-y-3">
      {/* File Info Header */}
      <div className="flex items-center justify-between gap-2 border-b border-[#1f2d3d] pb-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 rounded-lg bg-gradient-to-br from-purple-600/30 to-blue-600/30 border border-purple-500/40 text-purple-300 shrink-0">
            <UploadCloud className="w-5 h-5 text-purple-300 animate-pulse" />
          </div>
          <div className="min-w-0">
            <h5 className="font-bold text-xs text-white truncate flex items-center gap-1.5">
              <span className="truncate">{fileName}</span>
            </h5>
            <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
              <span>حجم: {totalMb} MB</span>
              <span>•</span>
              <span className="text-amber-400 font-semibold">{speed} MB/s</span>
            </div>
          </div>
        </div>

        {/* Status Badge */}
        <div className="shrink-0">
          {isCompleted ? (
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold flex items-center gap-1 shadow-xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>آماده دانلود</span>
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/40 text-[10px] font-bold flex items-center gap-1.5 animate-pulse">
              <Zap className="w-3 h-3 text-amber-400" />
              <span>در حال آپلود ({progress}%)</span>
            </span>
          )}
        </div>
      </div>

      {/* Animated Progress Bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] text-slate-300">
          <span className="flex items-center gap-1 text-[10px] text-slate-400">
            <span>انتقال داده‌ها:</span>
            <span className="font-mono text-white font-semibold">
              {transferredMb} / {totalMb} MB
            </span>
          </span>
          <span className="font-mono font-bold text-amber-300 text-xs">{progress}%</span>
        </div>

        {/* Outer Bar Track */}
        <div className="w-full h-2.5 bg-[#172433] rounded-full overflow-hidden p-0.5 border border-[#213245] relative">
          <div
            className="h-full bg-gradient-to-r from-[#0088cc] via-purple-500 to-emerald-400 rounded-full transition-all duration-100 ease-out shadow-xs relative"
            style={{ width: `${progress}%` }}
          >
            {!isCompleted && (
              <div className="absolute inset-0 bg-white/20 animate-shimmer" />
            )}
          </div>
        </div>
      </div>

      {/* Generated Direct Link Box (Reveals smoothly upon progress) */}
      {isCompleted ? (
        <div className="space-y-2.5 pt-1 animate-fadeIn">
          <div className="p-2.5 rounded-lg bg-[#182635] border border-[#2a3f54] space-y-1.5">
            <div className="flex items-center justify-between text-[10px] text-slate-300">
              <span className="font-semibold text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span>لینک دانلود مستقیم و نیم‌بها تولید شد:</span>
              </span>
              <span className="text-slate-400 flex items-center gap-1">
                <Clock className="w-3 h-3 text-amber-400" />
                <span>اعتبار: {data.expiresInDays || 7} روز</span>
              </span>
            </div>

            {/* URL Input Display */}
            <div className="flex items-center gap-1.5 bg-[#0e1722] p-1.5 rounded border border-[#223347] font-mono text-[11px] text-sky-200">
              <span className="truncate flex-1 select-all">{generatedLink}</span>
              <button
                onClick={handleCopy}
                className="px-2 py-1 bg-[#0088cc]/30 hover:bg-[#0088cc]/50 text-sky-200 hover:text-white rounded text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer shrink-0"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'کپی شد!' : 'کپی'}</span>
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <a
              href={generatedLink}
              download={fileName}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleDownload}
              className="flex-1 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-extrabold text-xs rounded-lg flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>دانلود مستقیم فایل</span>
            </a>
          </div>
        </div>
      ) : (
        <p className="text-[10px] text-slate-400 flex items-center justify-between">
          <span>در حال رمزنگاری و ثبت در سرور فایل‌باکس...</span>
          <span className="animate-spin text-amber-400">⏳</span>
        </p>
      )}
    </div>
  );
};
