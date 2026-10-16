import React from 'react';
import {
  User,
  Shield,
  Award,
  Clock,
  CheckCircle,
  Package,
  Coins,
  Wallet as WalletIcon,
  Zap,
  TrendingUp,
  X,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { TelegramUser, UserWallet } from '../types/telegram';
import { PurchaseOrder } from '../services/botEngine';

interface Props {
  currentUser: TelegramUser;
  wallet: UserWallet;
  orders: PurchaseOrder[];
  onClose: () => void;
  onUpgradeClick: () => void;
}

export const UserProfileModal: React.FC<Props> = ({
  currentUser,
  wallet,
  orders,
  onClose,
  onUpgradeClick,
}) => {
  const tierDisplayName =
    wallet.subscriptionTier === 'vip'
      ? '💎 وی‌آی‌پی (VIP - آپلودر نامحدود)'
      : wallet.subscriptionTier === 'premium'
      ? '🌟 پریمیوم (Premium)'
      : '⚪ رایگان (Free)';

  const tierColor =
    wallet.subscriptionTier === 'vip'
      ? 'from-purple-600 to-indigo-600 text-white'
      : wallet.subscriptionTier === 'premium'
      ? 'from-amber-500 to-yellow-600 text-white'
      : 'from-slate-700 to-slate-800 text-slate-200';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in select-text">
      <div className="bg-[#17212b] border border-[#242f3d] w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#1e2c3a] px-6 py-4 flex items-center justify-between border-b border-[#242f3d]">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#0088cc] to-[#40b3e0] flex items-center justify-center text-white font-bold text-xl shadow-md">
              <User className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-white font-bold text-lg flex items-center gap-2">
                {currentUser.first_name}
                <span className="text-xs bg-[#0088cc]/20 text-[#40b3e0] px-2 py-0.5 rounded-full border border-[#0088cc]/30 font-normal">
                  @{currentUser.username || 'telegram_user'}
                </span>
              </h2>
              <p className="text-xs text-slate-400">شناسه عددی: <span className="font-mono">{currentUser.id}</span> • عضویت: {wallet.joinedDate}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-[#242f3d] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Account Level & Tier Card */}
          <div className={`rounded-2xl p-5 bg-gradient-to-r ${tierColor} shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-white/10`}>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                <span className="text-xs font-medium uppercase tracking-wider opacity-90">سطح حساب کاربری</span>
              </div>
              <h3 className="text-xl font-bold">{tierDisplayName}</h3>
              <p className="text-xs opacity-80">تاریخ انقضای اشتراک: {wallet.subscriptionExpiry}</p>
            </div>
            {wallet.subscriptionTier === 'free' && (
              <button
                onClick={() => {
                  onClose();
                  onUpgradeClick();
                }}
                className="px-4 py-2.5 bg-white text-slate-900 font-bold text-xs rounded-xl shadow hover:bg-slate-100 transition-all flex items-center gap-1.5"
              >
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>ارتقا به پریمیوم / VIP</span>
              </button>
            )}
          </div>

          {/* Wallet & Coins Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-[#1e2c3a] border border-[#242f3d] rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
                  <WalletIcon className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs text-slate-400">موجودی کیف پول</p>
                  <p className="text-white font-bold text-lg">{wallet.balance.toLocaleString('fa-IR')} <span className="text-xs font-normal text-slate-400">تومان</span></p>
                </div>
              </div>
            </div>

            <div className="bg-[#1e2c3a] border border-[#242f3d] rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
                  <Coins className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs text-slate-400">سکه طلایی بازی</p>
                  <p className="text-white font-bold text-lg">{wallet.coins.toLocaleString('fa-IR')} <span className="text-xs font-normal text-slate-400">سکه</span></p>
                </div>
              </div>
            </div>
          </div>

          {/* Remaining Daily Limits */}
          <div className="bg-[#1e2c3a] border border-[#242f3d] rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-white font-bold text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#0088cc]" />
                <span>سهمیه و محدودیت‌های مصرف روزانه</span>
              </h4>
              <span className="text-[11px] text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                بازنشانی ساعت ۲۴:۰۰
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <div className="flex justify-between mb-1 text-slate-300">
                  <span>📥 دانلود فایل‌ها و رسانه‌ها</span>
                  <span className="text-emerald-400 font-semibold">{wallet.subscriptionTier === 'free' ? '۴۲ / ۵۰ عدد' : 'نامحدود (VIP)'}</span>
                </div>
                <div className="w-full bg-[#101921] h-2 rounded-full overflow-hidden">
                  <div className="bg-[#0088cc] h-full rounded-full" style={{ width: wallet.subscriptionTier === 'free' ? '84%' : '100%' }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-1 text-slate-300">
                  <span>📤 آپلود فایل در سامانه Aplo</span>
                  <span className="text-amber-400 font-semibold">{wallet.subscriptionTier === 'free' ? '۳ / ۵ مگابایت' : 'نامحدود (Unlimited)'}</span>
                </div>
                <div className="w-full bg-[#101921] h-2 rounded-full overflow-hidden">
                  <div className="bg-amber-500 h-full rounded-full" style={{ width: wallet.subscriptionTier === 'free' ? '60%' : '100%' }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-1 text-slate-300">
                  <span>🤖 استعلام‌های زنده هوش مصنوعی (Google Search)</span>
                  <span className="text-purple-400 font-semibold">{wallet.subscriptionTier === 'free' ? '۸ / ۱۰ عدد' : 'نامحدود'}</span>
                </div>
                <div className="w-full bg-[#101921] h-2 rounded-full overflow-hidden">
                  <div className="bg-purple-500 h-full rounded-full" style={{ width: wallet.subscriptionTier === 'free' ? '80%' : '100%' }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Recently Purchased Subscriptions & Orders */}
          <div className="bg-[#1e2c3a] border border-[#242f3d] rounded-xl p-5 space-y-4">
            <h4 className="text-white font-bold text-sm flex items-center gap-2">
              <Package className="w-4 h-4 text-[#0088cc]" />
              <span>تاریخچه خریدها و اشتراک‌های اخیر</span>
            </h4>

            {orders.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center">هنوز تراکنش یا سفارشی در این حساب ثبت نشده است.</p>
            ) : (
              <div className="space-y-2.5">
                {orders.slice(-5).reverse().map((ord) => (
                  <div key={ord.id} className="bg-[#101921] border border-[#242f3d] rounded-lg p-3 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-[#0088cc]/20 text-[#40b3e0] rounded-lg">
                        <CheckCircle className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-white font-medium">{ord.itemTitle}</p>
                        <p className="text-slate-400 text-[11px]">شناسه: <span className="font-mono">{ord.id}</span> • {ord.date}</p>
                      </div>
                    </div>
                    <div className="text-left">
                      <p className="text-emerald-400 font-bold">{ord.amount.toLocaleString('fa-IR')} تومان</p>
                      <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">تایید شده</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#1e2c3a] px-6 py-4 border-t border-[#242f3d] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-[#2b5278] hover:bg-[#3b6694] text-white font-medium text-xs rounded-xl transition-colors shadow"
          >
            بستن پنجره پروفایل
          </button>
        </div>
      </div>
    </div>
  );
};
