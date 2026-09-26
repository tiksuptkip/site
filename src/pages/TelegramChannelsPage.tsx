import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Send, 
  Crown, 
  Zap, 
  Sparkles, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  TrendingUp, 
  Clock, 
  ExternalLink, 
  Copy, 
  Check, 
  ChevronRight,
  Maximize2,
  X,
  ArrowDownToLine,
  Flame,
  Award
} from 'lucide-react';
import { UserProfile, SiteSettings, Language, TelegramChannel, TelegramSubscription } from '../types';
import { translations } from '../i18n/translations';
import { 
  subscribeTelegramChannels, 
  subscribeUserTelegramSubscriptions, 
  subscribeToChannel 
} from '../services/telegramService';
import { Header } from '../components/Header';

interface TelegramChannelsPageProps {
  user: UserProfile;
  siteSettings: SiteSettings;
  lang: Language;
  onLanguageChange: (lang: Language) => void;
  onSignOut: () => void;
  onNavigateHome: () => void;
  onNavigateDeposit: () => void;
  onNavigateWithdraw: () => void;
}

export const TelegramChannelsPage: React.FC<TelegramChannelsPageProps> = ({
  user: initialUser,
  siteSettings,
  lang,
  onLanguageChange,
  onSignOut,
  onNavigateHome,
  onNavigateDeposit,
  onNavigateWithdraw,
}) => {
  const t = translations[lang];

  const [user, setUser] = useState<UserProfile>(initialUser);
  const [channels, setChannels] = useState<TelegramChannel[]>([]);
  const [userSubscriptions, setUserSubscriptions] = useState<TelegramSubscription[]>([]);
  const [selectedProofImage, setSelectedProofImage] = useState<string | null>(null);

  // Insufficient Balance Modal
  const [lowBalanceChannel, setLowBalanceChannel] = useState<TelegramChannel | null>(null);

  // Success Subscription Modal with Invite Link
  const [activeSuccessSub, setActiveSuccessSub] = useState<{
    sub: TelegramSubscription;
    channel: TelegramChannel;
  } | null>(null);

  const [loadingChannelId, setLoadingChannelId] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Countdown ticker
  const [nowTime, setNowTime] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNowTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Subscribe to channels from Firestore
  useEffect(() => {
    const unsub = subscribeTelegramChannels((list) => {
      setChannels(list);
    });
    return () => unsub();
  }, []);

  // Subscribe to user subscriptions
  useEffect(() => {
    if (!user.email) return;
    const unsub = subscribeUserTelegramSubscriptions(user.email, (subs) => {
      setUserSubscriptions(subs);
    });
    return () => unsub();
  }, [user.email]);

  // Compute live remaining countdown string
  const formatCountdown = (endDateStr: string): string => {
    const end = new Date(endDateStr).getTime();
    const diff = end - nowTime;
    if (diff <= 0) return lang === 'ar' ? 'منتهي الصلاحية' : 'Expired';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((diff % (1000 * 60)) / 1000);

    if (days > 0) return `${days}d ${hours}h ${mins}m`;
    return `${hours}h ${mins}m ${secs}s`;
  };

  // Handle Subscribe
  const handleSubscribeClick = async (channel: TelegramChannel) => {
    // Check if user has sufficient funds
    if (user.walletBalance < channel.price) {
      setLowBalanceChannel(channel);
      return;
    }

    setLoadingChannelId(channel.channelId);

    try {
      const res = await subscribeToChannel(user, channel);
      setUser((prev) => ({ ...prev, walletBalance: res.newBalance }));
      setActiveSuccessSub({
        sub: res.subscription,
        channel,
      });
    } catch (err: any) {
      if (err.message === 'INSUFFICIENT_BALANCE') {
        setLowBalanceChannel(channel);
      } else {
        alert('Error subscribing: ' + err.message);
      }
    } finally {
      setLoadingChannelId(null);
    }
  };

  const handleCopyInvite = (link: string) => {
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Active subscription for a given channel
  const getActiveSubForChannel = (channelId: string) => {
    return userSubscriptions.find(
      (s) => s.channelId === channelId && s.status === 'active' && new Date(s.endDate).getTime() > nowTime
    );
  };

  return (
    <div 
      className="min-h-screen bg-[#0b0e11] text-gray-200 flex flex-col font-sans"
      dir={translations[lang].dir}
    >
      <Header
        siteSettings={siteSettings}
        user={user}
        lang={lang}
        onLanguageChange={onLanguageChange}
        onOpenDeposit={onNavigateDeposit}
        onOpenWithdraw={onNavigateWithdraw}
        onSignOut={onSignOut}
        onNavigateHome={onNavigateHome}
        onNavigateLogin={() => {}}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        {/* Navigation & Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={onNavigateHome}
            className="flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-white bg-[#181a20] border border-[#2b313a] px-3.5 py-2 rounded-xl transition-all"
          >
            <ArrowLeft className={`w-4 h-4 ${lang === 'ar' ? 'rotate-180' : ''}`} />
            <span>{lang === 'ar' ? 'العودة للتداول' : 'Back to Trading'}</span>
          </button>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 bg-[#181a20] border border-[#2b313a] px-3.5 py-1.5 rounded-xl">
              <span className="text-[11px] text-gray-400 font-medium">{t.availableUSDT}:</span>
              <span className="font-mono text-xs font-black text-yellow-400">{user.walletBalance.toFixed(2)} USDT</span>
            </div>
            <button
              onClick={onNavigateDeposit}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0ECB81] hover:bg-[#0bb372] text-black font-extrabold text-xs rounded-xl shadow-md transition-all"
            >
              <ArrowDownToLine className="w-3.5 h-3.5" />
              <span>{t.deposit}</span>
            </button>
          </div>
        </div>

        {/* Hero Banner */}
        <div className="relative rounded-3xl bg-gradient-to-b from-[#1c1912] via-[#161a20] to-[#121418] border border-yellow-500/30 p-6 sm:p-10 shadow-2xl overflow-hidden text-center">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-48 bg-gradient-to-b from-yellow-500/20 to-transparent blur-3xl pointer-events-none" />
          
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-xs font-black uppercase tracking-wider mb-4">
            <Crown className="w-4 h-4 text-yellow-400" />
            <span>tiksup Official Telegram Signals</span>
          </div>

          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight max-w-3xl mx-auto">
            {lang === 'ar' ? (
              <>قنوات توصيات الكريبتو <span className="text-yellow-400">VIP</span> الاحترافية</>
            ) : (
              <>High-Accuracy <span className="text-yellow-400">VIP Crypto</span> Signal Channels</>
            )}
          </h1>

          <p className="text-xs sm:text-sm text-gray-300 max-w-2xl mx-auto mt-3 leading-relaxed">
            {lang === 'ar'
              ? 'احصل على إشارات تداول فورية ومباشرة من نخبة المحللين مع أهداف ربح دقيقة، ونسب نجاح مثبتة تتجاوز 96%.'
              : 'Join private channels with verified win rates over 96%, exact stop-loss and take-profit targets, and direct whale alerts.'}
          </p>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl mx-auto mt-8">
            <div className="p-3 bg-[#181a20]/80 rounded-2xl border border-[#2b313a] backdrop-blur-sm">
              <span className="text-xs text-gray-400 block">{lang === 'ar' ? 'أعلى نسبة نجاح' : 'Max Win Rate'}</span>
              <span className="font-mono text-lg font-black text-yellow-400">96.8%</span>
            </div>
            <div className="p-3 bg-[#181a20]/80 rounded-2xl border border-[#2b313a] backdrop-blur-sm">
              <span className="text-xs text-gray-400 block">{lang === 'ar' ? 'إجمالي الصفقات' : 'Total Trades'}</span>
              <span className="font-mono text-lg font-black text-[#0ECB81]">4,200+</span>
            </div>
            <div className="p-3 bg-[#181a20]/80 rounded-2xl border border-[#2b313a] backdrop-blur-sm">
              <span className="text-xs text-gray-400 block">{lang === 'ar' ? 'سرعة الإشارة' : 'Execution Speed'}</span>
              <span className="font-mono text-lg font-black text-blue-400">&lt; 0.5s</span>
            </div>
            <div className="p-3 bg-[#181a20]/80 rounded-2xl border border-[#2b313a] backdrop-blur-sm">
              <span className="text-xs text-gray-400 block">{lang === 'ar' ? 'أعضاء نشطون' : 'Active VIPs'}</span>
              <span className="font-mono text-lg font-black text-purple-400">2,850+</span>
            </div>
          </div>
        </div>

        {/* User Active Subscriptions Section if any */}
        {userSubscriptions.filter((s) => s.status === 'active').length > 0 && (
          <div className="bg-[#181a20] border border-yellow-500/30 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-[#2b313a]">
              <Sparkles className="w-5 h-5 text-yellow-400" />
              <h2 className="text-base font-black text-white">
                {lang === 'ar' ? 'اشتراكاتي النشطة في تيليجرام' : 'My Active Telegram Subscriptions'}
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {userSubscriptions
                .filter((s) => s.status === 'active')
                .map((sub) => (
                  <div 
                    key={sub.id} 
                    className="p-4 bg-[#121418] rounded-2xl border border-[#2b313a] flex flex-col justify-between gap-3 relative overflow-hidden"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-black text-white text-sm">
                        {sub.channelTitle}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-[#0ECB81]/15 text-[#0ECB81] text-[10px] font-bold border border-[#0ECB81]/30">
                        {lang === 'ar' ? 'نشط' : 'Active'}
                      </span>
                    </div>

                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between text-gray-400">
                        <span>{lang === 'ar' ? 'الوقت المتبقي' : 'Time Remaining'}:</span>
                        <span className="font-mono font-bold text-yellow-400 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {formatCountdown(sub.endDate)}
                        </span>
                      </div>
                      <div className="flex justify-between text-gray-500 text-[11px]">
                        <span>{lang === 'ar' ? 'ينتهي في' : 'Ends'}:</span>
                        <span>{new Date(sub.endDate).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {sub.inviteLink && (
                      <a
                        href={sub.inviteLink}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full py-2 bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-md transition-all"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>{lang === 'ar' ? 'فتح قناة تيليجرام' : 'Open Telegram Channel'}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* 3 VIP TIERS CARDS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
          {channels.map((channel) => {
            const isSuper = channel.channelId === 'super_vip';
            const isVip = channel.channelId === 'vip';
            const activeSub = getActiveSubForChannel(channel.channelId);

            return (
              <div
                key={channel.channelId}
                className={`relative rounded-3xl p-6 sm:p-7 flex flex-col justify-between transition-all duration-200 ${
                  isSuper
                    ? 'bg-gradient-to-b from-[#241e12] via-[#1a1711] to-[#121418] border-2 border-yellow-400 shadow-[0_0_35px_rgba(240,185,11,0.22)] scale-[1.02] lg:-translate-y-1'
                    : isVip
                    ? 'bg-gradient-to-b from-[#13221c] via-[#131b19] to-[#121418] border border-emerald-500/40 shadow-xl'
                    : 'bg-[#181a20] border border-[#2b313a] shadow-xl'
                }`}
              >
                {/* Gold Crown Accent for Super VIP */}
                {isSuper && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-black font-black text-[11px] tracking-wider uppercase shadow-lg flex items-center gap-1.5">
                    <Crown className="w-3.5 h-3.5 fill-black" />
                    <span>👑 MOST PROFITABLE</span>
                  </div>
                )}

                <div>
                  {/* Channel Header */}
                  <div className="flex items-center justify-between mb-4 mt-1">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-inner ${
                        isSuper 
                          ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40' 
                          : isVip 
                          ? 'bg-[#0ECB81]/20 text-[#0ECB81] border border-[#0ECB81]/40' 
                          : 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                      }`}>
                        {isSuper ? <Crown className="w-6 h-6 stroke-[2.5]" /> : isVip ? <Zap className="w-6 h-6 stroke-[2.5]" /> : <Flame className="w-6 h-6 stroke-[2.5]" />}
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-white">
                          {channel.title}
                        </h3>
                        <span className="text-[11px] text-gray-400">
                          {channel.durationDays} {lang === 'ar' ? 'يوماً' : 'Days Membership'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Price Tag with High Contrast */}
                  <div className="py-4 my-2 border-y border-[#2b313a]/80">
                    <div className="flex items-baseline gap-2">
                      <span className={`text-3xl sm:text-4xl font-black font-mono tracking-tight ${
                        isSuper ? 'text-yellow-400' : isVip ? 'text-[#0ECB81]' : 'text-white'
                      }`}>
                        ${channel.price}
                      </span>
                      <span className="text-xs text-gray-400 font-bold uppercase">
                        / {channel.durationDays} {lang === 'ar' ? 'يوم' : 'Days'}
                      </span>
                    </div>
                  </div>

                  {/* Channel Description */}
                  <p className="text-xs text-gray-300 leading-relaxed mb-5">
                    {channel.description}
                  </p>

                  {/* Key Stats: Win Rate & Total Trades from Admin */}
                  <div className="grid grid-cols-2 gap-2.5 mb-5 p-3 bg-[#121418] rounded-2xl border border-[#2b313a]">
                    <div>
                      <span className="text-[10px] text-gray-400 block font-semibold">
                        {lang === 'ar' ? 'نسبة النجاح' : 'Win Rate'}
                      </span>
                      <span className={`font-mono text-base font-black ${
                        isSuper ? 'text-yellow-400' : 'text-[#0ECB81]'
                      }`}>
                        {channel.winRate}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 block font-semibold">
                        {lang === 'ar' ? 'إجمالي الإشارات' : 'Total Signals'}
                      </span>
                      <span className="font-mono text-base font-black text-white">
                        {channel.totalTrades}+
                      </span>
                    </div>
                  </div>

                  {/* Feature Bullets */}
                  <div className="space-y-2 mb-6 text-xs text-gray-300">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className={`w-4 h-4 shrink-0 ${isSuper ? 'text-yellow-400' : 'text-[#0ECB81]'}`} />
                      <span>{isSuper ? 'High-leverage Whale setups' : 'Intraday breakout signals'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className={`w-4 h-4 shrink-0 ${isSuper ? 'text-yellow-400' : 'text-[#0ECB81]'}`} />
                      <span>{isSuper ? '1:5+ Risk to Reward Ratio' : '1:3 Risk to Reward Ratio'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className={`w-4 h-4 shrink-0 ${isSuper ? 'text-yellow-400' : 'text-[#0ECB81]'}`} />
                      <span>Exact Stop-Loss & Take-Profit targets</span>
                    </div>
                    {isSuper && (
                      <div className="flex items-center gap-2 text-yellow-300 font-bold">
                        <Award className="w-4 h-4 shrink-0 text-yellow-400" />
                        <span>Private 1-on-1 Analyst Advisory</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Subscribe Action Button with Price inside / next to it */}
                <div>
                  {activeSub ? (
                    <div className="space-y-2">
                      <div className="p-2.5 bg-[#0ECB81]/10 border border-[#0ECB81]/30 rounded-xl text-center text-xs text-[#0ECB81] font-bold">
                        ✓ {lang === 'ar' ? 'أنت مشترك بالفعل' : 'Already Subscribed'} ({formatCountdown(activeSub.endDate)})
                      </div>
                      {channel.inviteLink && (
                        <a
                          href={channel.inviteLink}
                          target="_blank"
                          rel="noreferrer"
                          className="w-full py-3 bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 text-white font-black text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg"
                        >
                          <Send className="w-4 h-4" />
                          <span>{lang === 'ar' ? 'فتح قناة تيليجرام' : 'Open Telegram Channel'}</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={loadingChannelId === channel.channelId}
                      onClick={() => handleSubscribeClick(channel)}
                      className={`w-full py-3.5 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all shadow-lg active:scale-98 ${
                        isSuper
                          ? 'bg-gradient-to-r from-[#F0B90B] via-amber-400 to-[#F0B90B] hover:brightness-110 text-black shadow-yellow-500/20 cursor-pointer'
                          : isVip
                          ? 'bg-[#0ECB81] hover:bg-[#0bb372] text-black shadow-emerald-500/20 cursor-pointer'
                          : 'bg-[#2b313a] hover:bg-[#38414e] text-white cursor-pointer'
                      }`}
                    >
                      {loadingChannelId === channel.channelId ? (
                        <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          <span>
                            {lang === 'ar' 
                              ? `اشترك الآن • $${channel.price}` 
                              : `Subscribe Now • $${channel.price}`}
                          </span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Gallery Proof Images for each channel */}
        <div className="bg-[#181a20] border border-[#2b313a] rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#2b313a]">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-yellow-400" />
                <h3 className="text-lg font-black text-white">
                  {lang === 'ar' ? 'معرض إثباتات الأرباح والتوصيات الحية' : 'Verified Signal Proof & Profit Gallery'}
                </h3>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {lang === 'ar'
                  ? 'إثباتات حية لصفقات رابحة نُشرت في قنوات تيليجرام للمشتركين'
                  : 'Real verified profit screenshots and winning trades executed by subscribers'}
              </p>
            </div>
          </div>

          {/* Proof Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {channels.flatMap((ch) =>
              (ch.proofImages || []).map((imgUrl, idx) => (
                <div
                  key={`${ch.channelId}-${idx}`}
                  onClick={() => setSelectedProofImage(imgUrl)}
                  className="group relative rounded-2xl overflow-hidden bg-[#121418] border border-[#2b313a] hover:border-yellow-400/50 cursor-pointer transition-all aspect-video shadow-md"
                >
                  <img
                    src={imgUrl}
                    alt={`Profit Proof ${ch.title}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />

                  {/* Channel Tag */}
                  <div className="absolute top-2.5 start-2.5">
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider backdrop-blur-md ${
                      ch.channelId === 'super_vip'
                        ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40'
                        : 'bg-[#0ECB81]/20 text-[#0ECB81] border border-[#0ECB81]/40'
                    }`}>
                      {ch.title} Proof
                    </span>
                  </div>

                  {/* Zoom hint */}
                  <div className="absolute bottom-2.5 end-2.5 w-8 h-8 rounded-lg bg-black/60 backdrop-blur-sm text-white flex items-center justify-center group-hover:bg-yellow-400 group-hover:text-black transition-colors">
                    <Maximize2 className="w-4 h-4" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      {/* MODAL 1: Insufficient Balance Modal */}
      {lowBalanceChannel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div 
            className="w-full max-w-md bg-[#181a20] border border-[#2b313a] rounded-3xl p-6 shadow-2xl relative"
            dir={translations[lang].dir}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#2b313a]">
              <div className="flex items-center gap-2 text-yellow-400">
                <AlertCircle className="w-5 h-5" />
                <h3 className="text-base font-black text-white">
                  {lang === 'ar' ? 'الرصيد غير كافٍ' : 'Insufficient Wallet Balance'}
                </h3>
              </div>
              <button 
                onClick={() => setLowBalanceChannel(null)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-[#2b313a]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-3 text-xs">
              <p className="text-gray-300 leading-relaxed">
                {lang === 'ar' ? (
                  <>للاشتراك في قناة <strong>{lowBalanceChannel.title}</strong>، تحتاج إلى <strong>${lowBalanceChannel.price} USDT</strong>. رصيدك الحالي غير كافٍ لتغطية التكلفة.</>
                ) : (
                  <>To subscribe to <strong>{lowBalanceChannel.title}</strong>, you need <strong>${lowBalanceChannel.price} USDT</strong>. Your current wallet balance is insufficient.</>
                )}
              </p>

              <div className="p-3 bg-[#121418] rounded-xl border border-[#2b313a] space-y-1.5">
                <div className="flex justify-between text-gray-400">
                  <span>{lang === 'ar' ? 'سعر الاشتراك' : 'Channel Price'}:</span>
                  <span className="font-mono font-bold text-white">${lowBalanceChannel.price.toFixed(2)} USDT</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>{lang === 'ar' ? 'رصيدك الحالي' : 'Current Balance'}:</span>
                  <span className="font-mono font-bold text-yellow-400">${user.walletBalance.toFixed(2)} USDT</span>
                </div>
                <div className="flex justify-between text-red-400 font-bold pt-1 border-t border-[#262c36]">
                  <span>{lang === 'ar' ? 'المبلغ المطلوب إيداعه' : 'Deficit Amount'}:</span>
                  <span className="font-mono">+${Math.max(0, lowBalanceChannel.price - user.walletBalance).toFixed(2)} USDT</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-[#2b313a] flex gap-2">
              <button
                type="button"
                onClick={() => setLowBalanceChannel(null)}
                className="flex-1 py-2.5 bg-[#2b313a] hover:bg-[#38414e] text-white font-bold rounded-xl text-xs"
              >
                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setLowBalanceChannel(null);
                  onNavigateDeposit();
                }}
                className="flex-1 py-2.5 bg-[#0ECB81] hover:bg-[#0bb372] text-black font-black rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md"
              >
                <ArrowDownToLine className="w-4 h-4" />
                <span>{lang === 'ar' ? 'إيداع الرصيد الآن' : 'Deposit Now'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Subscription Success with Invite Link */}
      {activeSuccessSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div 
            className="w-full max-w-md bg-[#181a20] border-2 border-yellow-400 rounded-3xl p-6 sm:p-7 shadow-2xl relative text-center"
            dir={translations[lang].dir}
          >
            <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-yellow-500/20 text-yellow-400 border border-yellow-500/40 flex items-center justify-center shadow-lg">
              <Crown className="w-8 h-8 stroke-[2.5]" />
            </div>

            <h3 className="text-xl font-black text-white">
              {lang === 'ar' ? 'تهانينا! تم تفعيل اشتراكك بنجاح' : 'Subscription Activated!'}
            </h3>
            <p className="text-xs text-gray-300 mt-1">
              {lang === 'ar' ? (
                <>أهلاً بك في قناة <strong>{activeSuccessSub.channel.title}</strong> الرسمية.</>
              ) : (
                <>Welcome to the official <strong>{activeSuccessSub.channel.title}</strong> channel.</>
              )}
            </p>

            {/* Invite Link Box */}
            <div className="my-5 p-4 bg-[#121418] rounded-2xl border border-[#2b313a] space-y-3">
              <span className="text-[11px] text-gray-400 font-bold block">
                {lang === 'ar' ? 'رابط الانضمام الحصري للقناة' : 'Exclusive Channel Invite Link'}
              </span>

              <div className="flex items-center gap-2 bg-[#181a20] border border-[#2b313a] rounded-xl p-2.5 text-xs">
                <span className="font-mono text-yellow-400 truncate flex-1 select-all" dir="ltr">
                  {activeSuccessSub.channel.inviteLink}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyInvite(activeSuccessSub.channel.inviteLink)}
                  className="px-3 py-1 bg-[#2b313a] hover:bg-[#38414e] text-white rounded-lg flex items-center gap-1 font-bold text-xs shrink-0"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-[#0ECB81]" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? (lang === 'ar' ? 'تم النسخ' : 'Copied') : (lang === 'ar' ? 'نسخ' : 'Copy')}</span>
                </button>
              </div>

              <a
                href={activeSuccessSub.channel.inviteLink}
                target="_blank"
                rel="noreferrer"
                className="w-full py-3 bg-gradient-to-r from-blue-600 via-sky-500 to-blue-600 hover:brightness-110 text-white font-black text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg"
              >
                <Send className="w-4 h-4" />
                <span>{lang === 'ar' ? 'الانضمام إلى تيليجرام فوراً' : 'Join on Telegram Immediately'}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            <button
              type="button"
              onClick={() => setActiveSuccessSub(null)}
              className="w-full py-2.5 bg-[#2b313a] hover:bg-[#38414e] text-gray-200 font-bold rounded-xl text-xs transition-colors"
            >
              {lang === 'ar' ? 'تم ومتابعة' : 'Done & Continue'}
            </button>
          </div>
        </div>
      )}

      {/* Lightbox for Proof Image Zoom */}
      {selectedProofImage && (
        <div 
          onClick={() => setSelectedProofImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md cursor-pointer animate-in fade-in"
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img 
              src={selectedProofImage} 
              alt="Proof Fullscreen" 
              className="max-h-[85vh] max-w-full rounded-2xl object-contain border border-[#2b313a] shadow-2xl" 
            />
            <button 
              onClick={() => setSelectedProofImage(null)}
              className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg hover:bg-red-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
