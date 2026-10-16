import React, { useEffect, useState } from 'react';
import { Smartphone, Maximize2, Minimize2, Vibrate, ShieldCheck, Zap } from 'lucide-react';

export interface TelegramWebAppBridgeProps {
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  onVibrate?: (style: string) => void;
}

declare global {
  interface Window {
    Telegram?: {
      WebApp?: any;
    };
  }
}

export const TelegramWebAppBridge: React.FC<TelegramWebAppBridgeProps> = ({
  isExpanded = false,
  onToggleExpand,
  onVibrate,
}) => {
  const [hapticCount, setHapticCount] = useState(0);

  useEffect(() => {
    // Initialize window.Telegram.WebApp mock bridge if not present
    if (typeof window !== 'undefined') {
      if (!window.Telegram) {
        window.Telegram = {};
      }

      if (!window.Telegram.WebApp) {
        window.Telegram.WebApp = {
          initData: 'query_id=AAHdF1...&user=%7B%22id%22%3A2768315%2C%22first_name%22%3A%22Modasr%22%2C%22username%22%3A%22modasr%22%2C%22language_code%22%3A%22fa%22%7D&auth_date=1710000000&hash=abcdef',
          initDataUnsafe: {
            query_id: 'AAHdF1...',
            user: {
              id: 2768315,
              first_name: 'Modasr',
              last_name: 'Admin',
              username: 'modasr',
              language_code: 'fa',
            },
          },
          version: '7.0',
          platform: 'tdesktop',
          colorScheme: 'dark',
          themeParams: {
            bg_color: '#17212b',
            text_color: '#ffffff',
            hint_color: '#707579',
            link_color: '#6ab3f3',
            button_color: '#2481cc',
            button_text_color: '#ffffff',
            secondary_bg_color: '#212d3b',
          },
          isExpanded: isExpanded,
          viewportHeight: isExpanded ? window.innerHeight : 600,
          viewportStableHeight: 600,
          expand: () => {
            if (onToggleExpand) onToggleExpand();
          },
          close: () => {
            console.log('Telegram WebApp close() requested');
          },
          setHeaderColor: (color: string) => {
            console.log('Header color set to:', color);
          },
          setBackgroundColor: (color: string) => {
            console.log('Background color set to:', color);
          },
          HapticFeedback: {
            impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => {
              if (navigator.vibrate) {
                const durations = { light: 15, medium: 35, heavy: 60, rigid: 25, soft: 10 };
                navigator.vibrate(durations[style] || 30);
              }
              setHapticCount((prev) => prev + 1);
              if (onVibrate) onVibrate(style);
            },
            notificationOccurred: (type: 'error' | 'success' | 'warning') => {
              if (navigator.vibrate) {
                const patterns = { error: [50, 50, 50], success: [30, 40, 30], warning: [40, 60] };
                navigator.vibrate(patterns[type] || 40);
              }
              setHapticCount((prev) => prev + 1);
              if (onVibrate) onVibrate(type);
            },
            selectionChanged: () => {
              if (navigator.vibrate) {
                navigator.vibrate(10);
              }
              setHapticCount((prev) => prev + 1);
              if (onVibrate) onVibrate('selection');
            },
          },
          showAlert: (message: string, callback?: () => void) => {
            alert(message);
            if (callback) callback();
          },
          showConfirm: (message: string, callback: (confirmed: boolean) => void) => {
            const res = confirm(message);
            callback(res);
          },
        };
      }
    }
  }, [isExpanded, onToggleExpand, onVibrate]);

  return (
    <div className="bg-[#182533] border border-[#2b3e52] rounded-xl p-3 shadow-lg text-slate-200 text-xs flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-[#0088cc]/20 flex items-center justify-center text-[#40b3e0] border border-[#0088cc]/30">
          <Smartphone className="w-4 h-4" />
        </div>
        <div>
          <div className="font-semibold text-white flex items-center gap-1.5">
            <span>Telegram WebApp Bridge</span>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-[11px] text-slate-400 flex items-center gap-2">
            <span>v7.0 Active</span>
            <span>•</span>
            <span className="text-emerald-400 flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-400" />
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => {
            if (window.Telegram?.WebApp?.HapticFeedback) {
              window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
            }
          }}
          className="px-2.5 py-1.5 bg-[#242f3d] hover:bg-[#283c50] text-amber-300 rounded-lg border border-[#2e3d4e] transition-all flex items-center gap-1 cursor-pointer"
          title="Test Vibration Haptic Feedback"
        >
          <Vibrate className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
          <span className="hidden sm:inline">Haptic ({hapticCount})</span>
        </button>

        {onToggleExpand && (
          <button
            onClick={onToggleExpand}
            className="px-2.5 py-1.5 bg-[#0088cc]/20 hover:bg-[#0088cc]/30 text-[#40b3e0] rounded-lg border border-[#0088cc]/30 transition-all flex items-center gap-1 cursor-pointer"
            title={isExpanded ? 'Minimize Viewport' : 'Expand Viewport'}
          >
            {isExpanded ? (
              <>
                <Minimize2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Restore</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Expand</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};
