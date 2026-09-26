import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Share2, 
  Copy, 
  Check, 
  TrendingUp, 
  DollarSign, 
  Award, 
  ArrowLeft, 
  ArrowRight,
  Send, 
  ExternalLink, 
  ChevronDown, 
  ChevronRight, 
  GitBranch, 
  Wallet, 
  Gift, 
  ShieldCheck, 
  Sparkles,
  HelpCircle
} from 'lucide-react';
import { UserProfile, Language, SiteSettings, ReferralRecord, ReferralSettings } from '../types';
import { translations } from '../i18n/translations';
import { Header } from '../components/Header';
import { 
  subscribeUserReferrals, 
  subscribeReferralSettings, 
  buildReferralHierarchy, 
  ReferralTreeNode,
  getTierForReferralCount 
} from '../services/referralService';
import { subscribeAllUsers } from '../services/userService';

interface ReferralPageProps {
  user: UserProfile;
  siteSettings: SiteSettings;
  lang: Language;
  onLanguageChange: (lang: Language) => void;
  onSignOut: () => void;
  onNavigateHome: () => void;
  onNavigateDeposit: () => void;
  onNavigateWithdraw: () => void;
  onNavigateWallet: () => void;
  onNavigateTelegram?: () => void;
}

export const ReferralPage: React.FC<ReferralPageProps> = ({
  user,
  siteSettings,
  lang,
  onLanguageChange,
  onSignOut,
  onNavigateHome,
  onNavigateDeposit,
  onNavigateWithdraw,
  onNavigateWallet,
  onNavigateTelegram,
}) => {
  const isAr = lang === 'ar';
  const t = translations[lang];

  const [referrals, setReferrals] = useState<ReferralRecord[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [referralSettings, setReferralSettings] = useState<ReferralSettings | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [activeTab, setActiveTab] = useState<'TREE' | 'LIST' | 'TIERS'>('TREE');
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({ [user.uid]: true });

  // Generate Referral Link
  const refCode = user.referralCode || `TIK-${user.uid.slice(0, 6).toUpperCase()}`;
  // Use canonical tiksup.com/ref/USER_ID as requested
  const referralLinkCanonical = `https://tiksup.com/ref/${user.uid}`;
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://tiksup.com';
  const shareableUrl = `${currentOrigin}/?ref=${encodeURIComponent(refCode)}`;

  useEffect(() => {
    const unsubRefs = subscribeUserReferrals(user.uid, setReferrals);
    const unsubSettings = subscribeReferralSettings(setReferralSettings);
    const unsubUsers = subscribeAllUsers(setAllUsers);

    return () => {
      unsubRefs();
      unsubSettings();
      unsubUsers();
    };
  }, [user.uid]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareableUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(refCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Build tree
  const treeData: ReferralTreeNode = buildReferralHierarchy(user, allUsers, referrals);

  // Calculate statistics
  const directReferralsCount = allUsers.filter(u => u.referredBy === user.uid).length;
  const totalEarnings = user.referralEarnings || referrals.reduce((sum, r) => sum + (r.commissionEarned || 0), 0);
  
  // Calculate Level 2 and Level 3 counts
  const l1Uids = allUsers.filter(u => u.referredBy === user.uid).map(u => u.uid);
  const l2Count = allUsers.filter(u => u.referredBy && l1Uids.includes(u.referredBy)).length;
  const l2Uids = allUsers.filter(u => u.referredBy && l1Uids.includes(u.referredBy)).map(u => u.uid);
  const l3Count = allUsers.filter(u => u.referredBy && l2Uids.includes(u.referredBy)).length;
  const totalNetworkCount = directReferralsCount + l2Count + l3Count;

  // Current tier
  const activeTiers = referralSettings?.tiers || [];
  const currentTier = getTierForReferralCount(directReferralsCount, activeTiers, referralSettings?.globalPercent || 10);

  // Social sharing messages
  const shareText = isAr
    ? `انضم إلي في منصة tiksup لتداول العملات الرقمية والخيارات الثنائية بأسرع تنفيذ وأعلى نسبة أرباح! استخدم كود الإحالة الخاص بي: ${refCode}`
    : `Join me on tiksup - the fastest crypto & binary trading platform with up to 95% payouts! Use my referral code: ${refCode}`;

  const shareWhatsApp = `https://api.whatsapp.com/send?text=${encodeURIComponent(`${shareText}\n${shareableUrl}`)}`;
  const shareTelegram = `https://t.me/share/url?url=${encodeURIComponent(shareableUrl)}&text=${encodeURIComponent(shareText)}`;
  const shareTwitter = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareableUrl)}`;

  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev => ({ ...prev, [nodeId]: !prev[nodeId] }));
  };

  return (
    <div className="min-h-screen bg-[#0b0e11] text-gray-200 flex flex-col" dir={isAr ? 'rtl' : 'ltr'}>
      <Header
        siteSettings={siteSettings}
        user={user}
        lang={lang}
        onLanguageChange={onLanguageChange}
        onOpenDeposit={onNavigateDeposit}
        onOpenWithdraw={onNavigateWithdraw}
        onNavigateTelegram={onNavigateTelegram}
        onSignOut={onSignOut}
        onNavigateHome={onNavigateHome}
        onNavigateLogin={onNavigateHome}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Back Link & Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <button
              onClick={onNavigateHome}
              className="text-xs font-bold text-gray-400 hover:text-yellow-400 flex items-center gap-1.5 transition-colors mb-2"
            >
              {isAr ? <ArrowRight className="w-3.5 h-3.5" /> : <ArrowLeft className="w-3.5 h-3.5" />}
              <span>{isAr ? 'العودة للتداول' : 'Back to Trading'}</span>
            </button>
            <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-3">
              <Gift className="w-7 h-7 text-[#F0B90B]" />
              <span>{isAr ? 'برنامج الإحالة والمكافآت' : 'Referral & Affiliate Program'}</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-400 border border-yellow-500/30">
                VIP
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-gray-400 mt-1">
              {isAr
                ? 'ادعُ أصدقاءك للتداول في tiksup واكسب عمولات فورية تُضاف تلقائياً إلى رصيدك حتى 3 مستويات!'
                : 'Invite traders to tiksup and earn instant multi-tier commissions credited directly to your wallet balance!'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onNavigateWallet}
              className="px-4 py-2 bg-[#1e2329] hover:bg-[#252b33] border border-[#2b313a] rounded-xl text-xs font-bold text-gray-200 hover:text-white flex items-center gap-2 transition-all"
            >
              <Wallet className="w-4 h-4 text-yellow-400" />
              <span>{isAr ? 'محفظتي ورصيدي' : 'My Wallet'}</span>
            </button>
          </div>
        </div>

        {/* Hero Referral Link & Code Box */}
        <div className="bg-gradient-to-br from-[#1e2329] via-[#161a20] to-[#12151b] border border-[#2b313a] rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-yellow-500/10 via-amber-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10">
            {/* Left: Referral Link & Code Copy */}
            <div className="lg:col-span-8 space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-yellow-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  {isAr ? 'رابط الإحالة المباشر الخاص بك' : 'Your Unique Referral Link'}
                </span>
              </div>

              {/* Referral Link Input */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="flex-1 bg-[#0b0e11] border border-[#2b313a] rounded-2xl px-4 py-3 flex items-center gap-2">
                  <Share2 className="w-4 h-4 text-yellow-400 shrink-0" />
                  <span className="text-xs sm:text-sm font-mono text-gray-200 select-all truncate" dir="ltr">
                    {shareableUrl}
                  </span>
                </div>
                <button
                  onClick={handleCopyLink}
                  className="px-6 py-3 bg-[#F0B90B] hover:bg-[#dfaa07] text-black font-extrabold text-xs sm:text-sm rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 shrink-0"
                >
                  {copiedLink ? <Check className="w-4 h-4 text-black stroke-[3]" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedLink ? (isAr ? 'تم النسخ!' : 'Copied!') : (isAr ? 'نسخ الرابط' : 'Copy Link')}</span>
                </button>
              </div>

              {/* Referral Code Row & Share Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">{isAr ? 'رمز الإحالة:' : 'Referral Code:'}</span>
                  <div className="bg-[#0b0e11] border border-[#2b313a] rounded-xl px-3 py-1.5 flex items-center gap-2">
                    <span className="font-mono font-black text-yellow-400 text-xs tracking-wider" dir="ltr">
                      {refCode}
                    </span>
                    <button
                      onClick={handleCopyCode}
                      className="text-gray-400 hover:text-white p-0.5 transition-colors"
                      title={isAr ? 'نسخ الرمز' : 'Copy Code'}
                    >
                      {copiedCode ? <Check className="w-3.5 h-3.5 text-[#0ECB81]" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Social Share Buttons */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 hidden sm:inline">{isAr ? 'مشاركة عبر:' : 'Share via:'}</span>
                  
                  {/* WhatsApp */}
                  <a
                    href={shareWhatsApp}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 bg-[#25D366]/15 hover:bg-[#25D366]/25 border border-[#25D366]/30 text-[#25D366] text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-sm"
                  >
                    <span>WhatsApp</span>
                  </a>

                  {/* Telegram */}
                  <a
                    href={shareTelegram}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 bg-[#0088cc]/15 hover:bg-[#0088cc]/25 border border-[#0088cc]/30 text-[#0088cc] text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-sm"
                  >
                    <Send className="w-3 h-3" />
                    <span>Telegram</span>
                  </a>

                  {/* X (Twitter) */}
                  <a
                    href={shareTwitter}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-sm"
                  >
                    <span>X</span>
                  </a>
                </div>
              </div>
            </div>

            {/* Right: Current Tier Badge & Rule Summary */}
            <div className="lg:col-span-4 bg-[#0b0e11]/80 border border-[#262c35] rounded-2xl p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-400 font-semibold">{isAr ? 'المستوى الحالي' : 'Current Tier'}</span>
                  <span className="px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-400 text-[10px] font-extrabold border border-yellow-500/30">
                    {currentTier.commissionPercent}% Commission
                  </span>
                </div>
                <h3 className="text-lg font-black text-white">{currentTier.name}</h3>
                <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                  {isAr
                    ? `تحصل على ${currentTier.commissionPercent}% من كل إيداع يقوم به المتداولون الذين تدعوهم، وتُضاف فورا إلى محفظتك!`
                    : `You earn ${currentTier.commissionPercent}% on every deposit made by your referrals, auto-credited instantly to your balance!`}
                </p>
              </div>

              <div className="pt-3 border-t border-[#1e2329] text-[11px] text-gray-400 flex items-center justify-between">
                <span>{isAr ? 'الإضافة التلقائية للمحفظة:' : 'Auto Wallet Credit:'}</span>
                <span className="text-[#0ECB81] font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {isAr ? 'مفعلة تلقائياً' : 'Active & Instant'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 4 Core Metrics Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Referrals */}
          <div className="bg-[#181a20] border border-[#2b313a] rounded-2xl p-4 sm:p-5 shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between text-gray-400 mb-2">
              <span className="text-xs font-semibold">{isAr ? 'إجمالي المحالين' : 'Total Referrals'}</span>
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white font-mono">
              {directReferralsCount}
            </div>
            <div className="text-[11px] text-gray-400 mt-1 flex items-center gap-1">
              <span>{isAr ? 'إجمالي الشبكة:' : 'Full Network:'}</span>
              <span className="font-bold text-white">{totalNetworkCount}</span>
              <span className="text-gray-500">({l1Uids.length} L1, {l2Count} L2, {l3Count} L3)</span>
            </div>
          </div>

          {/* Card 2: Total Referral Earnings */}
          <div className="bg-[#181a20] border border-[#2b313a] rounded-2xl p-4 sm:p-5 shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between text-gray-400 mb-2">
              <span className="text-xs font-semibold">{isAr ? 'أرباح الإحالة الإجمالية' : 'Total Earnings'}</span>
              <div className="w-8 h-8 rounded-xl bg-yellow-500/10 text-yellow-400 flex items-center justify-center">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-[#0ECB81] font-mono">
              ${totalEarnings.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-gray-400 mt-1">
              {isAr ? 'أرباح محققة ومضافة' : 'Earned & Added to Balance'}
            </div>
          </div>

          {/* Card 3: Available Balance in Wallet */}
          <div className="bg-[#181a20] border border-[#2b313a] rounded-2xl p-4 sm:p-5 shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between text-gray-400 mb-2">
              <span className="text-xs font-semibold">{isAr ? 'الرصيد الكلي في المحفظة' : 'Available in Wallet'}</span>
              <div className="w-8 h-8 rounded-xl bg-[#0ECB81]/10 text-[#0ECB81] flex items-center justify-center">
                <Wallet className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white font-mono">
              ${user.walletBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-yellow-400 font-semibold mt-1 flex items-center justify-between">
              <span>{isAr ? 'قابل للسحب والتداول' : 'Withdrawable & Tradable'}</span>
              <button onClick={onNavigateWithdraw} className="hover:underline">
                {isAr ? 'سحب ←' : 'Withdraw →'}
              </button>
            </div>
          </div>

          {/* Card 4: Multi-Level Tiers */}
          <div className="bg-[#181a20] border border-[#2b313a] rounded-2xl p-4 sm:p-5 shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between text-gray-400 mb-2">
              <span className="text-xs font-semibold">{isAr ? 'مستويات العمولة' : 'Multi-Level Rate'}</span>
              <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
                <GitBranch className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black text-white font-mono">
              {currentTier.commissionPercent}% / {referralSettings?.level2Percent || 3}% / {referralSettings?.level3Percent || 1}%
            </div>
            <div className="text-[11px] text-gray-400 mt-1">
              {isAr ? 'مستوى 1 / مستوى 2 / مستوى 3' : 'Level 1 / Level 2 / Level 3'}
            </div>
          </div>
        </div>

        {/* Tabs: [Family Tree View | Referrals Ledger | Commission Tiers Table] */}
        <div className="bg-[#181a20] border border-[#2b313a] rounded-3xl p-6 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#2b313a] pb-4">
            <div className="flex items-center gap-2 p-1 bg-[#121418] rounded-2xl border border-[#262c35]">
              <button
                onClick={() => setActiveTab('TREE')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'TREE'
                    ? 'bg-[#2b313a] text-yellow-400 shadow-sm'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <GitBranch className="w-3.5 h-3.5" />
                <span>{isAr ? 'شجرة الإحالة العائلية' : 'Referral Tree View'}</span>
              </button>

              <button
                onClick={() => setActiveTab('LIST')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'LIST'
                    ? 'bg-[#2b313a] text-yellow-400 shadow-sm'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>{isAr ? 'سجل العمليات والعمولات' : 'Commissions History'}</span>
                {referrals.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-yellow-500/20 text-yellow-400">
                    {referrals.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('TIERS')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'TIERS'
                    ? 'bg-[#2b313a] text-yellow-400 shadow-sm'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Award className="w-3.5 h-3.5" />
                <span>{isAr ? 'جدول الشرائح والنسب' : 'Commission Tiers'}</span>
              </button>
            </div>

            <div className="text-xs text-gray-400 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#0ECB81]" />
              <span>{isAr ? 'نظام إحالة شفاف وموثوق' : 'Zero-Delay Automatic Settlement'}</span>
            </div>
          </div>

          {/* ================= TAB 1: FAMILY TREE VIEW ================= */}
          {activeTab === 'TREE' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-gray-400">
                <p>
                  {isAr
                    ? 'عرض تسلسل الإحالات الخاص بك على شكل شجرة عائلية هرمية (أحمد ← خالد ← منير) مع توضيح المستويات.'
                    : 'Interactive family-tree visualization of your referral lineage (You -> Level 1 -> Level 2 -> Level 3).'}
                </p>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                    <span>L1 (Direct)</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#0ECB81]" />
                    <span>L2 (Indirect)</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-400" />
                    <span>L3 (Sub-indirect)</span>
                  </span>
                </div>
              </div>

              {/* Tree Container */}
              <div className="p-4 sm:p-6 bg-[#121418] border border-[#262c35] rounded-2xl overflow-x-auto">
                {/* Root Node (You) */}
                <div className="min-w-[500px]">
                  <div className="flex items-center gap-3 p-3.5 bg-gradient-to-r from-yellow-500/15 via-[#1c222c] to-[#181a20] border-2 border-yellow-500/40 rounded-2xl shadow-lg max-w-md">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-yellow-500 to-amber-300 text-black font-extrabold flex items-center justify-center text-sm shadow-md">
                      {user.firstName ? user.firstName[0].toUpperCase() : 'U'}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-white text-sm">
                          {user.firstName} {user.lastName} ({isAr ? 'أنت' : 'You'})
                        </span>
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-yellow-400 text-black">
                          ROOT
                        </span>
                      </div>
                      <span className="text-[11px] text-gray-400 font-mono block">
                        Code: {refCode} • Total Earnings: ${totalEarnings.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Level 1 Branch */}
                  <div className="mt-4 ms-6 ps-6 border-s-2 border-dashed border-[#2f3744] space-y-4">
                    {treeData.children.length === 0 ? (
                      <div className="py-6 px-4 bg-[#181a20] rounded-xl border border-[#2b313a] text-center text-xs text-gray-500 max-w-md">
                        {isAr
                          ? 'لم تقم بدعوة أي متداول حتى الآن. شارك رابط الإحالة الخاص بك لبدء جني العمولات!'
                          : 'No direct referrals yet. Share your referral link above to start earning multi-tier commissions!'}
                      </div>
                    ) : (
                      treeData.children.map((l1Node) => {
                        const isL1Expanded = expandedNodes[l1Node.user.uid] !== false;
                        return (
                          <div key={l1Node.user.uid} className="space-y-3">
                            {/* L1 Node Card */}
                            <div className="flex items-center gap-3 p-3 bg-[#181a20] hover:bg-[#1e232c] border border-yellow-500/30 rounded-xl max-w-md transition-all shadow-sm">
                              <button
                                onClick={() => toggleNode(l1Node.user.uid)}
                                className="text-gray-400 hover:text-white"
                              >
                                {l1Node.children.length > 0 ? (
                                  isL1Expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
                                ) : (
                                  <span className="w-4 inline-block text-center text-gray-600">•</span>
                                )}
                              </button>

                              <div className="w-8 h-8 rounded-lg bg-yellow-500/20 text-yellow-400 font-bold flex items-center justify-center text-xs">
                                {l1Node.user.firstName ? l1Node.user.firstName[0].toUpperCase() : 'T'}
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-white text-xs truncate">
                                    {l1Node.user.firstName} {l1Node.user.lastName}
                                  </span>
                                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                                    Level 1 ({currentTier.commissionPercent}%)
                                  </span>
                                </div>
                                <span className="text-[10px] text-gray-400 font-mono block truncate">
                                  {l1Node.user.email} • Joined {new Date(l1Node.user.createdAt).toLocaleDateString()}
                                </span>
                              </div>

                              <div className="text-end">
                                <span className="text-xs font-black text-[#0ECB81] font-mono block">
                                  +${l1Node.totalGeneratedCommission.toFixed(2)}
                                </span>
                                <span className="text-[9px] text-gray-500">
                                  {l1Node.children.length} {isAr ? 'إحالة فرعية' : 'Sub-refs'}
                                </span>
                              </div>
                            </div>

                            {/* Level 2 Branch */}
                            {isL1Expanded && l1Node.children.length > 0 && (
                              <div className="ms-6 ps-6 border-s-2 border-dashed border-[#2f3744] space-y-3">
                                {l1Node.children.map((l2Node) => {
                                  const isL2Expanded = expandedNodes[l2Node.user.uid] !== false;
                                  return (
                                    <div key={l2Node.user.uid} className="space-y-2">
                                      {/* L2 Node Card */}
                                      <div className="flex items-center gap-3 p-2.5 bg-[#16191f] hover:bg-[#1b2028] border border-[#0ECB81]/30 rounded-xl max-w-md transition-all">
                                        <button
                                          onClick={() => toggleNode(l2Node.user.uid)}
                                          className="text-gray-400 hover:text-white"
                                        >
                                          {l2Node.children.length > 0 ? (
                                            isL2Expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />
                                          ) : (
                                            <span className="w-3.5 inline-block text-center text-gray-600">•</span>
                                          )}
                                        </button>

                                        <div className="w-7 h-7 rounded-lg bg-[#0ECB81]/15 text-[#0ECB81] font-bold flex items-center justify-center text-[11px]">
                                          {l2Node.user.firstName ? l2Node.user.firstName[0].toUpperCase() : 'T'}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-1.5">
                                            <span className="font-bold text-white text-xs truncate">
                                              {l2Node.user.firstName} {l2Node.user.lastName}
                                            </span>
                                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-[#0ECB81]/15 text-[#0ECB81] border border-[#0ECB81]/30">
                                              Level 2 ({referralSettings?.level2Percent || 3}%)
                                            </span>
                                          </div>
                                          <span className="text-[10px] text-gray-400 font-mono block truncate">
                                            {l2Node.user.email}
                                          </span>
                                        </div>

                                        <div className="text-end">
                                          <span className="text-xs font-bold text-[#0ECB81] font-mono">
                                            +${l2Node.totalGeneratedCommission.toFixed(2)}
                                          </span>
                                        </div>
                                      </div>

                                      {/* Level 3 Branch */}
                                      {isL2Expanded && l2Node.children.length > 0 && (
                                        <div className="ms-6 ps-6 border-s-2 border-dashed border-[#2f3744] space-y-2">
                                          {l2Node.children.map((l3Node) => (
                                            <div
                                              key={l3Node.user.uid}
                                              className="flex items-center gap-3 p-2 bg-[#14171d] border border-blue-500/30 rounded-xl max-w-md"
                                            >
                                              <div className="w-6 h-6 rounded-md bg-blue-500/15 text-blue-400 font-bold flex items-center justify-center text-[10px]">
                                                {l3Node.user.firstName ? l3Node.user.firstName[0].toUpperCase() : 'T'}
                                              </div>

                                              <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-1.5">
                                                  <span className="font-bold text-white text-xs truncate">
                                                    {l3Node.user.firstName} {l3Node.user.lastName}
                                                  </span>
                                                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-blue-500/15 text-blue-400 border border-blue-500/30">
                                                    Level 3 ({referralSettings?.level3Percent || 1}%)
                                                  </span>
                                                </div>
                                                <span className="text-[10px] text-gray-400 font-mono block truncate">
                                                  {l3Node.user.email}
                                                </span>
                                              </div>

                                              <div className="text-end">
                                                <span className="text-xs font-bold text-[#0ECB81] font-mono">
                                                  +${l3Node.totalGeneratedCommission.toFixed(2)}
                                                </span>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB 2: REFERRALS & COMMISSIONS TABLE ================= */}
          {activeTab === 'LIST' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-gray-400">
                <p>
                  {isAr
                    ? 'سجل تفصيلي لجميع العمولات المحتسبة من إيداعات شبكة الإحالة الخاصة بك.'
                    : 'Audit log of all referral commissions generated by deposits across your network.'}
                </p>
                <span className="font-bold text-white">
                  {referrals.length} {isAr ? 'عملية عمولة' : 'Commissions Recorded'}
                </span>
              </div>

              {referrals.length === 0 ? (
                <div className="py-12 text-center text-xs text-gray-500">
                  {isAr
                    ? 'لا توجد عمولات إحالة مسجلة بعد. ستحصل على عمولتك فور قيام أي متداول بإيداعه الأول!'
                    : 'No referral commissions recorded yet. Commissions are awarded automatically upon trader deposit approvals.'}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-start">
                    <thead>
                      <tr className="border-b border-[#262c35] text-gray-400 font-bold">
                        <th className="py-3 px-3">{isAr ? 'المتداول المحال' : 'Referred Trader'}</th>
                        <th className="py-3 px-3">{isAr ? 'المستوى' : 'Level'}</th>
                        <th className="py-3 px-3">{isAr ? 'مبلغ الإيداع' : 'Deposit Amount'}</th>
                        <th className="py-3 px-3">{isAr ? 'العمولة المكتسبة' : 'Commission Earned'}</th>
                        <th className="py-3 px-3">{isAr ? 'الحالة' : 'Status'}</th>
                        <th className="py-3 px-3 text-end">{isAr ? 'التاريخ' : 'Date'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#222832]">
                      {referrals.map((item) => (
                        <tr key={item.id} className="hover:bg-[#1f242c]/50">
                          <td className="py-3 px-3">
                            <span className="font-bold text-white block">
                              {item.referredName || 'Trader'}
                            </span>
                            <span className="text-[10px] text-gray-400 font-mono">
                              {item.referredEmail || item.referredId.slice(0, 10)}
                            </span>
                          </td>

                          <td className="py-3 px-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              item.level === 1
                                ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                                : item.level === 2
                                ? 'bg-[#0ECB81]/20 text-[#0ECB81] border border-[#0ECB81]/30'
                                : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                            }`}>
                              Level {item.level}
                            </span>
                          </td>

                          <td className="py-3 px-3 font-mono font-bold text-white">
                            ${item.depositAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} USDT
                          </td>

                          <td className="py-3 px-3 font-mono font-black text-[#0ECB81]">
                            +${item.commissionEarned.toLocaleString('en-US', { minimumFractionDigits: 2 })} USDT
                          </td>

                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#0ECB81]/15 text-[#0ECB81] border border-[#0ECB81]/30">
                              {isAr ? 'تمت الإضافة للمحفظة' : 'Credited to Wallet'}
                            </span>
                          </td>

                          <td className="py-3 px-3 text-end text-gray-400 font-mono">
                            {new Date(item.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ================= TAB 3: COMMISSION TIERS EXPLANATION ================= */}
          {activeTab === 'TIERS' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-gray-400">
                <p>
                  {isAr
                    ? 'جدول الشرائح والنسب الديناميكية المعتمدة من إدارة المنصة لحساب العمولات.'
                    : 'System commission tiers and multi-level percentages configured by platform administration.'}
                </p>
              </div>

              {/* Tiers Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-start">
                  <thead>
                    <tr className="border-b border-[#262c35] text-gray-400 font-bold">
                      <th className="py-3 px-3">{isAr ? 'الشريحة' : 'Tier Name'}</th>
                      <th className="py-3 px-3">{isAr ? 'نطاق الإحالات (من - إلى)' : 'Referral Range'}</th>
                      <th className="py-3 px-3">{isAr ? 'نسبة العمولة (المستوى 1)' : 'Level 1 Rate'}</th>
                      <th className="py-3 px-3">{isAr ? 'حالة الشريحة لك' : 'Your Status'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#222832]">
                    {activeTiers.map((tier) => {
                      const isCurrent = directReferralsCount >= tier.minReferrals && directReferralsCount <= tier.maxReferrals;
                      return (
                        <tr key={tier.id} className={isCurrent ? 'bg-yellow-500/10' : 'hover:bg-[#1f242c]/50'}>
                          <td className="py-3 px-3 font-bold text-white flex items-center gap-2">
                            {isCurrent && <Award className="w-3.5 h-3.5 text-yellow-400" />}
                            <span>{tier.name}</span>
                          </td>
                          <td className="py-3 px-3 font-mono text-gray-300">
                            {tier.minReferrals} - {tier.maxReferrals >= 999999 ? '∞' : tier.maxReferrals} {isAr ? 'إحالة' : 'referrals'}
                          </td>
                          <td className="py-3 px-3 font-mono font-black text-yellow-400 text-sm">
                            {tier.commissionPercent}%
                          </td>
                          <td className="py-3 px-3">
                            {isCurrent ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-yellow-400 text-black">
                                {isAr ? 'شريحتك الحالية' : 'Current Active Tier'}
                              </span>
                            ) : directReferralsCount > tier.maxReferrals ? (
                              <span className="text-gray-500 text-[11px]">{isAr ? 'تم تجاوزها' : 'Passed'}</span>
                            ) : (
                              <span className="text-gray-400 text-[11px]">
                                {isAr ? `تبقت ${tier.minReferrals - directReferralsCount} إحالة` : `${tier.minReferrals - directReferralsCount} more needed`}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Multi-Level Breakdown Box */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3">
                <div className="p-3.5 bg-[#121418] border border-yellow-500/30 rounded-xl">
                  <span className="text-[11px] text-yellow-400 font-bold block mb-1">
                    {isAr ? 'المستوى 1 (المباشر)' : 'Level 1 (Direct)'}
                  </span>
                  <div className="text-xl font-black text-white font-mono">
                    {currentTier.commissionPercent}%
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">
                    {isAr ? 'من إيداعات المتداولين المسجلين برابطك مباشرة' : 'From traders registered directly via your link'}
                  </p>
                </div>

                <div className="p-3.5 bg-[#121418] border border-[#0ECB81]/30 rounded-xl">
                  <span className="text-[11px] text-[#0ECB81] font-bold block mb-1">
                    {isAr ? 'المستوى 2 (غير مباشر)' : 'Level 2 (Indirect)'}
                  </span>
                  <div className="text-xl font-black text-white font-mono">
                    {referralSettings?.level2Percent || 3}%
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">
                    {isAr ? 'من إيداعات المتداولين الذين دعاهم متداولوك' : 'From traders invited by your Level 1 referrals'}
                  </p>
                </div>

                <div className="p-3.5 bg-[#121418] border border-blue-500/30 rounded-xl">
                  <span className="text-[11px] text-blue-400 font-bold block mb-1">
                    {isAr ? 'المستوى 3 (الشبكة الفرعية)' : 'Level 3 (Sub-network)'}
                  </span>
                  <div className="text-xl font-black text-white font-mono">
                    {referralSettings?.level3Percent || 1}%
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">
                    {isAr ? 'من إيداعات المتداولين الذين دعاهم المستوى 2' : 'From traders invited by your Level 2 referrals'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
