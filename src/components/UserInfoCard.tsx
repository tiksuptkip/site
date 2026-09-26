import React, { useState, useEffect } from 'react';
import { UserProfile, Language, TelegramSubscription } from '../types';
import { translations } from '../i18n/translations';
import { 
  ShieldCheck, 
  Wallet, 
  ArrowDownToLine, 
  ArrowUpRight, 
  Globe, 
  UserCheck, 
  Send, 
  Clock, 
  ExternalLink,
  Sparkles,
  Crown
} from 'lucide-react';
import { subscribeUserTelegramSubscriptions } from '../services/telegramService';

interface UserInfoCardProps {
  user: UserProfile;
  lang: Language;
  onOpenDeposit: () => void;
  onOpenWithdraw: () => void;
  onNavigateTelegram?: () => void;
}

export const UserInfoCard: React.FC<UserInfoCardProps> = ({
  user,
  lang,
  onOpenDeposit,
  onOpenWithdraw,
  onNavigateTelegram,
}) => {
  const t = translations[lang];

  const [subscriptions, setSubscriptions] = useState<TelegramSubscription[]>([]);
  const [nowTime, setNowTime] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNowTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!user.email) return;
    const unsub = subscribeUserTelegramSubscriptions(user.email, (subs) => {
      setSubscriptions(subs);
    });
    return () => unsub();
  }, [user.email]);

  const activeSubs = subscriptions.filter(
    (s) => s.status === 'active' && new Date(s.endDate).getTime() > nowTime
  );

  const formatCountdown = (endDateStr: string): string => {
    const end = new Date(endDateStr).getTime();
    const diff = end - nowTime;
    if (diff <= 0) return 'Expired';
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((diff % (1000 * 60)) / 1000);
    if (days > 0) return `${days}d ${hours}h ${mins}m`;
    return `${hours}h ${mins}m ${secs}s`;
  };

  return (
    <div 
      className="bg-[#1e2329] border border-[#2b313a] rounded-2xl p-5 shadow-lg relative overflow-hidden"
      dir={translations[lang].dir}
    >
      {/* Decorative background glow */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-[#F0B90B]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#2b313a]">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-yellow-500 to-amber-300 text-black font-extrabold text-lg flex items-center justify-center shadow-md">
            {user.firstName ? user.firstName.charAt(0).toUpperCase() : 'U'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white">
                {user.firstName} {user.lastName}
              </h3>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#0ECB81]/15 text-[#0ECB81] border border-[#0ECB81]/30">
                <ShieldCheck className="w-3 h-3" />
                {t.statusActive}
              </span>
            </div>
            <p className="text-xs text-gray-400 font-mono mt-0.5">
              {user.email}
            </p>
          </div>
        </div>

        {/* Real Account Badge & Telegram Link */}
        <div className="flex items-center gap-2">
          {onNavigateTelegram && (
            <button
              onClick={onNavigateTelegram}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 flex items-center gap-1.5 transition-colors"
            >
              <Send className="w-3.5 h-3.5 text-sky-400" />
              <span>{lang === 'ar' ? 'توصيات تيليجرام' : 'VIP Signals'}</span>
            </button>
          )}

          <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#2b313a] text-yellow-400 border border-[#3b4350] flex items-center gap-1.5">
            <UserCheck className="w-3.5 h-3.5" />
            {t.realAccountBadge}
          </span>
        </div>
      </div>

      {/* Wallet Balance & Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
        {/* Wallet Balance Card */}
        <div className="p-4 bg-[#181a20] rounded-xl border border-[#2b313a] flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-400 mb-1">
            <span className="text-xs font-semibold flex items-center gap-1.5">
              <Wallet className="w-4 h-4 text-yellow-400" />
              {t.totalBalance}
            </span>
            <span className="text-[10px] text-gray-500 uppercase">USDT</span>
          </div>

          <div className="flex items-baseline gap-1 my-2">
            <span className="font-mono text-2xl font-black text-white tracking-tight">
              {user.walletBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-xs font-bold text-yellow-400">USDT</span>
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-[#252b35]">
            <button
              onClick={onOpenDeposit}
              className="flex-1 py-1.5 bg-[#0ECB81] hover:bg-[#0bb372] text-black font-bold text-xs rounded-lg flex items-center justify-center gap-1 transition-all shadow-sm active:scale-95"
            >
              <ArrowDownToLine className="w-3.5 h-3.5" />
              {t.deposit}
            </button>
            <button
              onClick={onOpenWithdraw}
              className="flex-1 py-1.5 bg-[#2b313a] hover:bg-[#353d48] text-white font-bold text-xs rounded-lg flex items-center justify-center gap-1 transition-all active:scale-95"
            >
              <ArrowUpRight className="w-3.5 h-3.5 text-yellow-400" />
              {t.withdraw}
            </button>
          </div>
        </div>

        {/* Security & IP Information */}
        <div className="p-4 bg-[#181a20] rounded-xl border border-[#2b313a] flex flex-col justify-between text-xs">
          <div>
            <span className="text-gray-400 font-semibold block mb-1">
              {t.securityIp}
            </span>
            <div className="flex items-center gap-2 font-mono text-yellow-400 font-bold bg-[#14171d] p-2 rounded-lg border border-[#282e38]" dir="ltr">
              <Globe className="w-3.5 h-3.5 text-blue-400" />
              {user.registrationIp || user.lastLoginIp || '198.51.100.24'}
            </div>
          </div>
          <div className="pt-2 text-gray-500 text-[11px] flex justify-between">
            <span>{t.registrationDate}:</span>
            <span className="text-gray-300 font-medium">
              {new Date(user.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* Telegram Subscriptions Countdown Card */}
        <div className="p-4 bg-[#181a20] rounded-xl border border-[#2b313a] flex flex-col justify-between text-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-gray-300 font-bold flex items-center gap-1.5">
              <Send className="w-3.5 h-3.5 text-sky-400" />
              {lang === 'ar' ? 'اشتراكاتي في تيليجرام' : 'My Subscriptions'}
            </span>
            {activeSubs.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-[#0ECB81]/15 text-[#0ECB81] text-[10px] font-bold">
                {activeSubs.length} {lang === 'ar' ? 'نشط' : 'Active'}
              </span>
            )}
          </div>

          {activeSubs.length > 0 ? (
            <div className="space-y-2 my-1">
              {activeSubs.slice(0, 1).map((sub) => (
                <div key={sub.id} className="p-2 bg-[#121418] rounded-lg border border-[#2b313a] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-white text-xs">{sub.channelTitle}</span>
                    <span className="font-mono text-yellow-400 font-bold text-[11px] flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatCountdown(sub.endDate)}
                    </span>
                  </div>
                  {sub.inviteLink && (
                    <a
                      href={sub.inviteLink}
                      target="_blank"
                      rel="noreferrer"
                      className="block text-center py-1 bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 text-white font-bold text-[10px] rounded-md transition-colors"
                    >
                      {lang === 'ar' ? 'دخول القناة' : 'Open Channel'} →
                    </a>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="my-2 p-2.5 bg-[#14171d] rounded-lg border border-[#282e38] text-center">
              <span className="text-gray-400 text-[11px] block">
                {lang === 'ar' ? 'لا يوجد اشتراك نشط' : 'No active VIP signals subscription'}
              </span>
              {onNavigateTelegram && (
                <button
                  type="button"
                  onClick={onNavigateTelegram}
                  className="mt-1.5 text-yellow-400 hover:underline font-bold text-[11px] inline-flex items-center gap-1"
                >
                  <Crown className="w-3 h-3 text-yellow-400" />
                  <span>{lang === 'ar' ? 'تصفح قنوات VIP' : 'Explore VIP Channels'}</span>
                </button>
              )}
            </div>
          )}

          <div className="pt-2 text-gray-500 text-[11px] flex justify-between border-t border-[#252b35]">
            <span>2FA Protection:</span>
            <span className="text-[#0ECB81] font-semibold">Active & Secure</span>
          </div>
        </div>
      </div>
    </div>
  );
};
