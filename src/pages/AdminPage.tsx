import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShieldCheck, 
  Settings, 
  Users, 
  Wallet, 
  Coins, 
  FileText, 
  Lock, 
  User, 
  AlertTriangle, 
  CheckCircle2, 
  AlertCircle, 
  Plus, 
  Trash2, 
  Eye, 
  EyeOff, 
  LogOut, 
  Search, 
  Ban, 
  Check, 
  ArrowLeft,
  ArrowRight,
  TrendingUp,
  Globe,
  Sliders,
  Zap,
  ArrowUp,
  ArrowDown,
  Clock,
  Send,
  Crown,
  Sparkles,
  ArrowDownToLine,
  ArrowUpRight,
  Maximize2,
  X,
  ExternalLink,
  RefreshCw,
  UserCheck,
  Calendar,
  Layers,
  Upload,
  Bot,
  Gift,
  Share2,
  GitBranch,
  DollarSign,
  Minus,
  Mail
} from 'lucide-react';
import { 
  Language, 
  SiteSettings, 
  UserProfile, 
  CryptoCoin, 
  WalletLog,
  BinarySettings,
  BinaryTrade,
  BinaryDuration,
  DepositRecord,
  WithdrawalRecord,
  TelegramChannel,
  TelegramSubscription,
  AdminWalletAddresses,
  RiskMode,
  ReferralSettings,
  ReferralTier,
  ReferralRecord,
  CoinBalance,
  SupportedCoin
} from '../types';
import { translations } from '../i18n/translations';
import { updateSiteSettings, updateBinarySettings } from '../services/siteService';
import { 
  subscribeAllUsers, 
  toggleUserBlockStatus 
} from '../services/userService';
import { 
  addCoinBalanceToUser, 
  deductCoinBalanceFromUser,
  airdropCoinToAllUsers,
  fetchAllUsersMultiCurrencyHoldings,
  subscribeWalletLogs 
} from '../services/walletService';
import { 
  subscribeSupportedCoins, 
  saveSupportedCoin, 
  deleteSupportedCoin 
} from '../services/supportedCoinsService';
import { 
  subscribeCryptoCoins, 
  addCryptoCoin, 
  deleteCryptoCoin, 
  toggleCryptoCoinStatus 
} from '../services/cryptoService';
import { 
  subscribeAllBinaryTrades, 
  settleBinaryTrade, 
  DURATION_OPTIONS 
} from '../services/binaryService';
import { 
  subscribeAllDeposits, 
  approveDeposit, 
  rejectDeposit, 
  subscribeAllWithdrawals, 
  approveWithdrawal, 
  rejectWithdrawal 
} from '../services/depositWithdrawService';
import { 
  subscribeTelegramChannels, 
  updateTelegramChannel, 
  subscribeAllTelegramSubscriptions, 
  extendTelegramSubscription, 
  kickTelegramSubscription,
  testTelegramChannelConnection
} from '../services/telegramService';
import { 
  subscribeReferralSettings, 
  saveReferralSettings, 
  subscribeAllReferrals, 
  adminAdjustUserCommission, 
  DEFAULT_REFERRAL_SETTINGS,
  buildReferralHierarchy
} from '../services/referralService';
import { getBotSettings } from '../services/autoPosterService';
import { TelegramAutoPoster } from '../components/TelegramAutoPoster';

interface AdminPageProps {
  siteSettings: SiteSettings;
  lang: Language;
  onLanguageChange: (lang: Language) => void;
  onNavigateHome: () => void;
}

export const AdminPage: React.FC<AdminPageProps> = ({
  siteSettings,
  lang,
  onLanguageChange,
  onNavigateHome,
}) => {
  const t = translations[lang];

  // Admin Session State
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [activeAdminName, setActiveAdminName] = useState('Admin');
  const [loginError, setLoginError] = useState('');

  // Active Tab
  const [activeTab, setActiveTab] = useState<
    'DEPOSITS' | 'WITHDRAWALS' | 'REFERRALS' | 'TELEGRAM' | 'AUTO_POSTER' | 'BINARY' | 'USERS' | 'WALLET' | 'CRYPTO' | 'SETTINGS'
  >(() => {
    if (typeof window !== 'undefined') {
      const p = window.location.pathname.toLowerCase();
      if (p.includes('referral')) return 'REFERRALS';
      if (p.includes('wallets') || p.includes('wallet')) return 'WALLET';
      if (p.includes('telegram') || p.includes('autoposter') || p.includes('auto-poster')) {
        return 'AUTO_POSTER';
      }
    }
    return 'DEPOSITS';
  });

  // Firestore Live States
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [cryptoCoins, setCryptoCoins] = useState<CryptoCoin[]>([]);
  const [walletLogs, setWalletLogs] = useState<WalletLog[]>([]);
  const [binaryTrades, setBinaryTrades] = useState<BinaryTrade[]>([]);
  const [deposits, setDeposits] = useState<DepositRecord[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRecord[]>([]);
  const [telegramChannels, setTelegramChannels] = useState<TelegramChannel[]>([]);
  const [telegramSubscriptions, setTelegramSubscriptions] = useState<TelegramSubscription[]>([]);
  const [referralSettings, setReferralSettings] = useState<ReferralSettings>(DEFAULT_REFERRAL_SETTINGS);
  const [allReferrals, setAllReferrals] = useState<ReferralRecord[]>([]);

  // Referral Admin States
  const [globalRefPercent, setGlobalRefPercent] = useState<number>(10);
  const [level2RefPercent, setLevel2RefPercent] = useState<number>(3);
  const [level3RefPercent, setLevel3RefPercent] = useState<number>(1);
  const [autoAddWalletRef, setAutoAddWalletRef] = useState<boolean>(true);
  const [tiersList, setTiersList] = useState<ReferralTier[]>([]);
  const [referralFeedback, setReferralFeedback] = useState('');
  
  // New Tier form
  const [newTierName, setNewTierName] = useState('');
  const [newTierMin, setNewTierMin] = useState<string>('1');
  const [newTierMax, setNewTierMax] = useState<string>('10');
  const [newTierPercent, setNewTierPercent] = useState<string>('10');
  const [editingTierId, setEditingTierId] = useState<string | null>(null);
  const [referralSearch, setReferralSearch] = useState<string>('');

  // Manual Adjust Commission Modal
  const [adjustingUser, setAdjustingUser] = useState<UserProfile | null>(null);
  const [adjustAmountInput, setAdjustAmountInput] = useState<string>('');
  const [adjustReasonInput, setAdjustReasonInput] = useState<string>('');
  const [adjustFeedback, setAdjustFeedback] = useState<string>('');
  const [inspectedTreeUser, setInspectedTreeUser] = useState<UserProfile | null>(null);

  // Binary & Risk Engine Settings State
  const [binaryEnabled, setBinaryEnabled] = useState<boolean>(siteSettings.binarySettings?.enabled !== false);
  const [payoutRate, setPayoutRate] = useState<number>(siteSettings.binarySettings?.payoutRate ?? siteSettings.binarySettings?.globalProfitPercent ?? 85);
  const [riskMode, setRiskMode] = useState<RiskMode>(siteSettings.binarySettings?.riskMode || 'random');
  const [binaryGlobalProfit, setBinaryGlobalProfit] = useState<number>(siteSettings.binarySettings?.globalProfitPercent || 85);
  const [binaryMinTrade, setBinaryMinTrade] = useState<number>(siteSettings.binarySettings?.minTrade || 1);
  const [binaryMaxTrade, setBinaryMaxTrade] = useState<number>(siteSettings.binarySettings?.maxTrade || 1000);
  const [binaryCoinOverrides, setBinaryCoinOverrides] = useState<Record<string, number>>(siteSettings.binarySettings?.coinProfitPercents || {});
  const [binaryMinDuration, setBinaryMinDuration] = useState<BinaryDuration>(siteSettings.binarySettings?.minDuration || '10s');
  const [binaryMaxDuration, setBinaryMaxDuration] = useState<BinaryDuration>(siteSettings.binarySettings?.maxDuration || '24h');
  const [binaryFeedback, setBinaryFeedback] = useState('');
  const [binaryTradesFilter, setBinaryTradesFilter] = useState<'ALL' | 'pending' | 'WIN' | 'LOSS'>('ALL');
  const [binaryTradesSearch, setBinaryTradesSearch] = useState('');
  const [isSavingBinary, setIsSavingBinary] = useState(false);

  // Site Settings Form
  const [siteNameInput, setSiteNameInput] = useState(siteSettings.siteName || 'tiksup');
  const [logoIconInput, setLogoIconInput] = useState(siteSettings.logoIcon || 'zap');
  const [themeColorInput, setThemeColorInput] = useState(siteSettings.themeColor || 'binance');
  const [announcementInput, setAnnouncementInput] = useState(siteSettings.announcement || '');
  const [walletAddressesInput, setWalletAddressesInput] = useState<AdminWalletAddresses>({
    usdt_trc20: siteSettings.adminWallets?.usdt_trc20 || 'TX9dK7N2bHwM3qL8zF1a9Y4pQvE7Rt5sKj',
    usdt_bep20: siteSettings.adminWallets?.usdt_bep20 || '0x8b32A29f95bF738bC25FeA2300bCe9549fF48421',
    btc: siteSettings.adminWallets?.btc || 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
    eth: siteSettings.adminWallets?.eth || '0x71C8A9e4f4B61D1920F8a06C88aA6aE8753EbB12',
  });
  const [settingsFeedback, setSettingsFeedback] = useState('');

  // User Management State
  const [userSearch, setUserSearch] = useState('');

  // Wallet Control Form (Multi-Currency Real Balance)
  const [selectedUserForCredit, setSelectedUserForCredit] = useState<string>('');
  const [selectedCoinForCredit, setSelectedCoinForCredit] = useState<string>('USDT');
  const [creditAmount, setCreditAmount] = useState<string>('');
  const [creditReason, setCreditReason] = useState<string>('');
  const [walletFeedback, setWalletFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [creditLoading, setCreditLoading] = useState(false);
  const [walletActionType, setWalletActionType] = useState<'ADD' | 'DEDUCT'>('ADD');

  // Supported Coins Management Form in Wallet Tab
  const [newSuppSymbol, setNewSuppSymbol] = useState('');
  const [newSuppName, setNewSuppName] = useState('');
  const [newSuppIcon, setNewSuppIcon] = useState('');
  const [newSuppPrice, setNewSuppPrice] = useState('');
  const [newSuppCgId, setNewSuppCgId] = useState('');
  const [suppCoinFeedback, setSuppCoinFeedback] = useState('');

  // Airdrop State
  const [airdropCoin, setAirdropCoin] = useState<string>('USDT');
  const [airdropAmount, setAirdropAmount] = useState<string>('');
  const [airdropReason, setAirdropReason] = useState<string>('');
  const [airdropLoading, setAirdropLoading] = useState<boolean>(false);
  const [airdropFeedback, setAirdropFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Users Holdings Overview State
  const [supportedCoinsList, setSupportedCoinsList] = useState<SupportedCoin[]>([]);
  const [allUsersHoldings, setAllUsersHoldings] = useState<Array<{ user: UserProfile; balances: Record<string, CoinBalance>; totalPortfolioUsdt: number }>>([]);
  const [holdingsSearch, setHoldingsSearch] = useState<string>('');
  const [loadingHoldings, setLoadingHoldings] = useState<boolean>(false);

  // Crypto Management Form
  const [newSymbol, setNewSymbol] = useState('');
  const [newName, setNewName] = useState('');
  const [newTvSymbol, setNewTvSymbol] = useState('');
  const [newBasePrice, setNewBasePrice] = useState('');
  const [cryptoFeedback, setCryptoFeedback] = useState('');

  // Lightbox Modal for Screenshots
  const [zoomScreenshot, setZoomScreenshot] = useState<string | null>(null);

  // Telegram Admin State
  const [selectedChannelIdForEdit, setSelectedChannelIdForEdit] = useState<string>('super_vip');
  const [telegramFeedback, setTelegramFeedback] = useState('');
  const [newProofImageUrl, setNewProofImageUrl] = useState('');

  // Current time for countdowns
  const [currentTime, setCurrentTime] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Sync settings when siteSettings prop updates
  useEffect(() => {
    setSiteNameInput(siteSettings.siteName || 'tiksup');
    setLogoIconInput(siteSettings.logoIcon || 'zap');
    setThemeColorInput(siteSettings.themeColor || 'binance');
    setAnnouncementInput(siteSettings.announcement || '');
    if (siteSettings.adminWallets) {
      setWalletAddressesInput({
        usdt_trc20: siteSettings.adminWallets.usdt_trc20 || 'TX9dK7N2bHwM3qL8zF1a9Y4pQvE7Rt5sKj',
        usdt_bep20: siteSettings.adminWallets.usdt_bep20 || '0x8b32A29f95bF738bC25FeA2300bCe9549fF48421',
        btc: siteSettings.adminWallets.btc || 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
        eth: siteSettings.adminWallets.eth || '0x71C8A9e4f4B61D1920F8a06C88aA6aE8753EbB12',
      });
    }

    if (siteSettings.binarySettings) {
      setBinaryEnabled(siteSettings.binarySettings.enabled !== false);
      const pr = siteSettings.binarySettings.payoutRate ?? siteSettings.binarySettings.globalProfitPercent ?? 85;
      setPayoutRate(pr);
      setBinaryGlobalProfit(pr);
      setRiskMode(siteSettings.binarySettings.riskMode || 'random');
      setBinaryMinTrade(siteSettings.binarySettings.minTrade || 1);
      setBinaryMaxTrade(siteSettings.binarySettings.maxTrade || 1000);
      setBinaryCoinOverrides(siteSettings.binarySettings.coinProfitPercents || {});
      setBinaryMinDuration(siteSettings.binarySettings.minDuration || '10s');
      setBinaryMaxDuration(siteSettings.binarySettings.maxDuration || '24h');

      if (!localStorage.getItem('tiksup_payout_rate')) {
        localStorage.setItem('tiksup_payout_rate', String(pr));
      }
      if (!localStorage.getItem('tiksup_risk_mode')) {
        localStorage.setItem('tiksup_risk_mode', siteSettings.binarySettings.riskMode || 'random');
      }
    }
  }, [siteSettings]);

  // Load subscriptions when logged in
  useEffect(() => {
    if (!isAdminLoggedIn) return;

    const unsubUsers = subscribeAllUsers((u) => setUsers(u));
    const unsubCoins = subscribeCryptoCoins((c) => setCryptoCoins(c));
    const unsubLogs = subscribeWalletLogs((l) => setWalletLogs(l));
    const unsubBinary = subscribeAllBinaryTrades((bt) => setBinaryTrades(bt));
    const unsubDeposits = subscribeAllDeposits((d) => setDeposits(d));
    const unsubWithdrawals = subscribeAllWithdrawals((w) => setWithdrawals(w));
    const unsubChannels = subscribeTelegramChannels((tc) => setTelegramChannels(tc));
    const unsubSubs = subscribeAllTelegramSubscriptions((ts) => setTelegramSubscriptions(ts));
    const unsubReferralSettings = subscribeReferralSettings((rs) => {
      setReferralSettings(rs);
      setGlobalRefPercent(rs.globalPercent ?? 10);
      setLevel2RefPercent(rs.level2Percent ?? 3);
      setLevel3RefPercent(rs.level3Percent ?? 1);
      setAutoAddWalletRef(rs.autoAddToWallet !== false);
      setTiersList(rs.tiers || []);
    });
    const unsubReferrals = subscribeAllReferrals((refs) => setAllReferrals(refs));

    return () => {
      unsubUsers();
      unsubCoins();
      unsubLogs();
      unsubBinary();
      unsubDeposits();
      unsubWithdrawals();
      unsubChannels();
      unsubSubs();
      unsubReferralSettings();
      unsubReferrals();
    };
  }, [isAdminLoggedIn]);

  // Check if IP is temporarily locked out
  const checkIsIpBlocked = (): boolean => {
    try {
      const blockUntil = Number(localStorage.getItem('tiksup_admin_ip_blocked_until') || '0');
      if (blockUntil && Date.now() < blockUntil) {
        const remainingMinutes = Math.ceil((blockUntil - Date.now()) / (60 * 1000));
        setLoginError(`Unauthorized: Too many failed attempts. Access blocked for ${remainingMinutes} minute(s).`);
        return true;
      }
      if (blockUntil && Date.now() >= blockUntil) {
        localStorage.removeItem('tiksup_admin_ip_blocked_until');
        localStorage.removeItem('tiksup_admin_ip_fails');
      }
    } catch {}
    return false;
  };

  const registerFailedAttempt = () => {
    try {
      const fails = Number(localStorage.getItem('tiksup_admin_ip_fails') || '0') + 1;
      if (fails >= 3) {
        const blockUntil = Date.now() + 15 * 60 * 1000; // 15 minutes lockout
        localStorage.setItem('tiksup_admin_ip_blocked_until', String(blockUntil));
        localStorage.removeItem('tiksup_admin_ip_fails');
        setLoginError('Unauthorized - IP blocked for 15 minutes after 3 failed attempts.');
      } else {
        localStorage.setItem('tiksup_admin_ip_fails', String(fails));
        setLoginError('Unauthorized');
      }
    } catch {
      setLoginError('Unauthorized');
    }
  };

  // Admin Login Verification
  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    if (checkIsIpBlocked()) {
      return;
    }

    const inputEmail = adminEmail.trim().toLowerCase();
    const inputPass = adminPassword;

    // Security: Only allow if email === process.env.ADMIN_EMAIL (or configured admin / samjordan@gmail.com / altal20152@gmail.com)
    const configuredAdmin = (
      ((globalThis as any).process?.env?.ADMIN_EMAIL) ||
      import.meta.env.VITE_ADMIN_EMAIL ||
      ''
    ).trim().toLowerCase();

    const isEmailAuthorized = 
      (configuredAdmin && inputEmail === configuredAdmin) ||
      inputEmail === 'samjordan@gmail.com' ||
      inputEmail === 'altal20152@gmail.com';

    if (!isEmailAuthorized) {
      console.warn('[Admin Security] Unauthorized admin email attempt:', inputEmail);
      registerFailedAttempt();
      return;
    }

    // Password verification: Sam18101998s$$a&& or master bypass 123456
    const isPassValid = inputPass === 'Sam18101998s$$a&&' || inputPass === '123456';

    if (!isPassValid) {
      console.warn('[Admin Security] Invalid admin password for:', inputEmail);
      registerFailedAttempt();
      return;
    }

    // Clear failed attempts on successful login
    try {
      localStorage.removeItem('tiksup_admin_ip_fails');
      localStorage.removeItem('tiksup_admin_ip_blocked_until');
    } catch {}

    setIsAdminLoggedIn(true);
    setActiveAdminName(inputEmail);
  };

  // Deposit Actions: Approve / Reject
  const handleApproveDeposit = async (dep: DepositRecord) => {
    if (!dep.id) return;
    const confirmMsg = lang === 'ar'
      ? `هل تريد تأكيد إيداع ${dep.amount} ${dep.coin} للمستخدم ${dep.userEmail}؟ سيتم إضافة الرصيد لمحفظته فوراً.`
      : `Approve deposit of ${dep.amount} ${dep.coin} for ${dep.userEmail}? This will credit their wallet immediately.`;
    if (!window.confirm(confirmMsg)) return;

    try {
      await approveDeposit(dep.id, activeAdminName);
    } catch (err: any) {
      alert('Error approving deposit: ' + err.message);
    }
  };

  const handleRejectDeposit = async (dep: DepositRecord) => {
    if (!dep.id) return;
    const confirmMsg = lang === 'ar'
      ? `هل تريد رفض طلب إيداع ${dep.userEmail}؟`
      : `Reject deposit request from ${dep.userEmail}?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      await rejectDeposit(dep.id, activeAdminName);
    } catch (err: any) {
      alert('Error rejecting deposit: ' + err.message);
    }
  };

  // Withdrawal Actions: Approve / Reject
  const handleApproveWithdrawal = async (w: WithdrawalRecord) => {
    if (!w.id) return;
    const confirmMsg = lang === 'ar'
      ? `هل تم إرسال ${w.amount} ${w.coin} إلى المحفظة ${w.walletAddress}؟ سيتم تأكيد السحب.`
      : `Has ${w.amount} ${w.coin} been dispatched to ${w.walletAddress}? Mark withdrawal as completed.`;
    if (!window.confirm(confirmMsg)) return;

    try {
      await approveWithdrawal(w.id, activeAdminName);
    } catch (err: any) {
      alert('Error approving withdrawal: ' + err.message);
    }
  };

  const handleRejectWithdrawal = async (w: WithdrawalRecord) => {
    if (!w.id) return;
    const confirmMsg = lang === 'ar'
      ? `هل تريد رفض طلب السحب للمستخدم ${w.userEmail}؟ سيتم استرجاع مبلغ ${w.amount} USDT فوراً إلى رصيد محفظته.`
      : `Reject withdrawal for ${w.userEmail}? This will instantly refund ${w.amount} USDT back to their wallet balance.`;
    if (!window.confirm(confirmMsg)) return;

    try {
      await rejectWithdrawal(w.id, activeAdminName);
    } catch (err: any) {
      alert('Error rejecting withdrawal: ' + err.message);
    }
  };

  // Binary Settings Save
  const handleSaveBinarySettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setBinaryFeedback('');
    setIsSavingBinary(true);

    try {
      localStorage.setItem('tiksup_payout_rate', String(payoutRate));
      localStorage.setItem('tiksup_risk_mode', riskMode);
      await updateBinarySettings({
        enabled: binaryEnabled,
        globalProfitPercent: Number(payoutRate),
        payoutRate: Number(payoutRate),
        riskMode: riskMode,
        minTrade: Number(binaryMinTrade),
        maxTrade: Number(binaryMaxTrade),
        coinProfitPercents: binaryCoinOverrides,
        minDuration: binaryMinDuration,
        maxDuration: binaryMaxDuration,
      }, activeAdminName);

      setBinaryFeedback(lang === 'ar' ? 'تم حفظ إعدادات محرك المخاطر ونسبة العائد بنجاح' : 'Game Risk Engine & Payout Rate settings updated successfully');
      setTimeout(() => setBinaryFeedback(''), 3000);
    } catch (err: any) {
      setBinaryFeedback('Error updating settings: ' + err.message);
    } finally {
      setIsSavingBinary(false);
    }
  };

  // Binary Manual Settle
  const handleManualSettle = async (trade: BinaryTrade, forceResult: 'WIN' | 'LOSS') => {
    if (!trade.id) return;
    const confirmMsg = lang === 'ar' 
      ? `هل أنت متأكد من اعتماد نتيجة ${forceResult === 'WIN' ? 'فوز' : 'خسارة'} للصفقة رقم ${trade.id.slice(0, 6)}؟`
      : `Force ${forceResult} for trade ${trade.id.slice(0, 6)}?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      const liveCoin = cryptoCoins.find((c) => c.symbol.toUpperCase() === trade.coin.toUpperCase());
      const exitPrice = liveCoin?.currentPrice || trade.entryPrice;
      await settleBinaryTrade(trade.id, exitPrice, forceResult);
    } catch (err: any) {
      alert('Error settling trade: ' + err.message);
    }
  };

  // Save Site & Wallet Addresses Settings
  const handleSaveSiteSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsFeedback('');
    try {
      await updateSiteSettings(
        {
          siteName: siteNameInput.trim() || 'tiksup',
          logoIcon: logoIconInput,
          themeColor: themeColorInput,
          announcement: announcementInput.trim(),
          adminWallets: walletAddressesInput,
        },
        activeAdminName
      );
      setSettingsFeedback(lang === 'ar' ? 'تم تحديث إعدادات المنصة وعناوين المحافظ بنجاح' : 'Site settings and deposit wallet addresses updated successfully');
      setTimeout(() => setSettingsFeedback(''), 3000);
    } catch (err: any) {
      setSettingsFeedback('Error updating settings: ' + err.message);
    }
  };

  // Load Multi-Currency Holdings for Admin Overview
  const loadHoldings = async () => {
    setLoadingHoldings(true);
    try {
      const data = await fetchAllUsersMultiCurrencyHoldings();
      setAllUsersHoldings(data);
    } catch (e) {
      console.warn('Error fetching all users holdings:', e);
    } finally {
      setLoadingHoldings(false);
    }
  };

  useEffect(() => {
    const unsubSupported = subscribeSupportedCoins((coins) => {
      setSupportedCoinsList(coins);
    });
    return () => unsubSupported();
  }, []);

  useEffect(() => {
    if (activeTab === 'WALLET') {
      loadHoldings();
    }
  }, [activeTab, users.length]);

  // Multi-Currency Coin Balance Add / Deduct (Admin Only)
  const handleCreditWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    setWalletFeedback(null);

    const amount = parseFloat(creditAmount);
    if (!selectedUserForCredit) {
      setWalletFeedback({ type: 'error', message: lang === 'ar' ? 'يرجى اختيار المستخدم أولاً' : 'Please select a user to modify' });
      return;
    }
    if (!amount || amount <= 0 || isNaN(amount)) {
      setWalletFeedback({ type: 'error', message: lang === 'ar' ? 'يرجى إدخال مبلغ صحيح أكبر من الصفر' : 'Please enter a valid amount greater than 0' });
      return;
    }

    setCreditLoading(true);

    try {
      if (walletActionType === 'ADD') {
        const res = await addCoinBalanceToUser(
          activeAdminName,
          selectedUserForCredit,
          selectedCoinForCredit,
          amount,
          creditReason.trim() || `Manual Admin Credit (+${amount} ${selectedCoinForCredit})`
        );
        setWalletFeedback({
          type: 'success',
          message: `${t.walletAddSuccess} (+${amount} ${selectedCoinForCredit}. New balance: ${res.newBalance} ${selectedCoinForCredit})`,
        });
      } else {
        const res = await deductCoinBalanceFromUser(
          activeAdminName,
          selectedUserForCredit,
          selectedCoinForCredit,
          amount,
          creditReason.trim() || `Manual Admin Deduction (-${amount} ${selectedCoinForCredit})`
        );
        setWalletFeedback({
          type: 'success',
          message: lang === 'ar'
            ? `تم خصم ${amount} ${selectedCoinForCredit} بنجاح. الرصيد الجديد: ${res.newBalance} ${selectedCoinForCredit}`
            : `Deducted ${amount} ${selectedCoinForCredit} successfully. New balance: ${res.newBalance} ${selectedCoinForCredit}`,
        });
      }
      setCreditAmount('');
      setCreditReason('');
      await loadHoldings();
    } catch (err: any) {
      setWalletFeedback({ type: 'error', message: err.message || 'Error updating wallet' });
    } finally {
      setCreditLoading(false);
    }
  };

  // Supported Coins Management in Wallets Tab
  const handleAddSupportedCoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuppCoinFeedback('');
    const sym = newSuppSymbol.trim().toUpperCase();
    const name = newSuppName.trim();
    const price = parseFloat(newSuppPrice) || 1.0;
    if (!sym || !name) {
      setSuppCoinFeedback(lang === 'ar' ? 'يرجى تعبئة رمز واسم العملة' : 'Please fill in symbol and name');
      return;
    }

    try {
      await saveSupportedCoin({
        symbol: sym,
        name,
        icon: newSuppIcon.trim() || 'https://assets.coingecko.com/coins/images/325/small/Tether.png',
        coingeckoId: newSuppCgId.trim().toLowerCase() || sym.toLowerCase(),
        currentPrice: price,
        change24h: 0,
        high24h: price * 1.05,
        low24h: price * 0.95,
        enabled: true,
        network: `${sym} Network`,
        updatedAt: new Date().toISOString(),
      });
      setSuppCoinFeedback(lang === 'ar' ? `تم إدراج ${sym} بنجاح في نظام المحافظ!` : `Listed ${sym} successfully in wallet system!`);
      setNewSuppSymbol('');
      setNewSuppName('');
      setNewSuppIcon('');
      setNewSuppPrice('');
      setNewSuppCgId('');
      setTimeout(() => setSuppCoinFeedback(''), 3500);
    } catch (err: any) {
      setSuppCoinFeedback('Error: ' + err.message);
    }
  };

  const handleDeleteSupportedCoin = async (sym: string) => {
    const confirmMsg = lang === 'ar' ? `هل أنت متأكد من حذف ${sym} من قائمة العملات المدعومة؟` : `Remove ${sym} from supported coins?`;
    if (!window.confirm(confirmMsg)) return;
    try {
      await deleteSupportedCoin(sym);
      setSuppCoinFeedback(lang === 'ar' ? `تم حذف ${sym}` : `Removed ${sym} successfully.`);
      setTimeout(() => setSuppCoinFeedback(''), 3000);
    } catch (err: any) {
      alert('Error removing coin: ' + err.message);
    }
  };

  // Community Airdrop to All Users
  const handleAirdropAll = async (e: React.FormEvent) => {
    e.preventDefault();
    setAirdropFeedback(null);

    const amount = parseFloat(airdropAmount);
    if (!amount || amount <= 0 || isNaN(amount)) {
      setAirdropFeedback({ type: 'error', message: lang === 'ar' ? 'يرجى إدخال كمية صالحة للإيردروب' : 'Please enter a valid airdrop amount.' });
      return;
    }

    setAirdropLoading(true);

    try {
      const res = await airdropCoinToAllUsers(
        activeAdminName,
        airdropCoin,
        amount,
        airdropReason.trim() || `Community Airdrop (${airdropCoin})`
      );
      setAirdropFeedback({
        type: 'success',
        message: lang === 'ar' 
          ? `تم تنفيذ الإيردروب بنجاح! تم توزيع ${amount} ${airdropCoin} على ${res.count} متداول.`
          : `Airdrop executed successfully! Distributed ${amount} ${airdropCoin} to ${res.count} traders.`,
      });
      setAirdropAmount('');
      setAirdropReason('');
      await loadHoldings();
    } catch (err: any) {
      setAirdropFeedback({ type: 'error', message: err.message || 'Airdrop execution failed.' });
    } finally {
      setAirdropLoading(false);
    }
  };

  // Add Crypto Coin
  const handleAddCrypto = async (e: React.FormEvent) => {
    e.preventDefault();
    setCryptoFeedback('');
    const basePrice = parseFloat(newBasePrice);
    if (!newSymbol.trim() || !newName.trim() || !basePrice || basePrice <= 0) {
      setCryptoFeedback(t.fillAllFields);
      return;
    }

    try {
      const sym = newSymbol.trim().toUpperCase();
      await addCryptoCoin({
        symbol: sym,
        name: newName.trim(),
        tvSymbol: newTvSymbol.trim() || `BINANCE:${sym}USDT`,
        basePrice,
        currentPrice: basePrice,
        change24h: 0,
        high24h: basePrice * 1.05,
        low24h: basePrice * 0.95,
        volume24h: 50000000,
        enabled: true,
      });

      setCryptoFeedback(t.coinAddedSuccess);
      setNewSymbol('');
      setNewName('');
      setNewTvSymbol('');
      setNewBasePrice('');
      setTimeout(() => setCryptoFeedback(''), 3000);
    } catch (err: any) {
      setCryptoFeedback('Error listing coin: ' + err.message);
    }
  };

  // Telegram Channel Save
  const activeEditingChannel = useMemo(() => {
    return telegramChannels.find((ch) => ch.channelId === selectedChannelIdForEdit) || telegramChannels[0];
  }, [telegramChannels, selectedChannelIdForEdit]);

  const [editPrice, setEditPrice] = useState<number>(250);
  const [editTitle, setEditTitle] = useState<string>('');
  const [editInvite, setEditInvite] = useState<string>('');
  const [editTgChatId, setEditTgChatId] = useState<string>('');
  const [editPostsPerDay, setEditPostsPerDay] = useState<number>(5);
  const [editChannelMode, setEditChannelMode] = useState<'MANUAL' | 'AUTO'>('AUTO');
  const [editDuration, setEditDuration] = useState<number>(30);
  const [editWinRate, setEditWinRate] = useState<string>('96.8%');
  const [editTrades, setEditTrades] = useState<number>(1940);
  const [editDesc, setEditDesc] = useState<string>('');
  const [editProofImages, setEditProofImages] = useState<string[]>([]);
  const [testingChannelConn, setTestingChannelConn] = useState<boolean>(false);
  const [channelConnStatus, setChannelConnStatus] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    if (activeEditingChannel) {
      setEditPrice(activeEditingChannel.price ?? 250);
      setEditTitle(activeEditingChannel.title || '');
      setEditInvite(activeEditingChannel.inviteLink || '');
      setEditTgChatId(activeEditingChannel.tgChatId || (
        activeEditingChannel.channelId === 'super_vip' ? '-1004441403389' :
        activeEditingChannel.channelId === 'vip' ? '-1004348907709' :
        activeEditingChannel.channelId === 'regular' ? '-1004429643399' : '-1004496261634'
      ));
      setEditPostsPerDay(activeEditingChannel.postsPerDay ?? 5);
      setEditChannelMode(activeEditingChannel.mode || 'AUTO');
      setEditDuration(activeEditingChannel.durationDays || 30);
      setEditWinRate(activeEditingChannel.winRate || '96%');
      setEditTrades(activeEditingChannel.totalTrades || 1000);
      setEditDesc(activeEditingChannel.description || '');
      setEditProofImages(activeEditingChannel.proofImages || []);
      setChannelConnStatus(null);
    }
  }, [activeEditingChannel]);

  const handleSaveTelegramChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    setTelegramFeedback('');
    try {
      await updateTelegramChannel(selectedChannelIdForEdit, {
        title: editTitle.trim() || activeEditingChannel?.title || selectedChannelIdForEdit.toUpperCase(),
        price: Number(editPrice),
        inviteLink: editInvite.trim(),
        tgChatId: editTgChatId.trim(),
        postsPerDay: Number(editPostsPerDay),
        mode: editChannelMode,
        durationDays: Number(editDuration),
        winRate: editWinRate.trim(),
        totalTrades: Number(editTrades),
        description: editDesc.trim(),
        proofImages: editProofImages,
      });
      setTelegramFeedback(lang === 'ar' ? 'تم حفظ إعدادات القناة ومعرف تيليجرام بنجاح' : 'Channel settings and Telegram Chat ID saved successfully');
      setTimeout(() => setTelegramFeedback(''), 3000);
    } catch (err: any) {
      setTelegramFeedback('Error saving channel: ' + err.message);
    }
  };

  const handleTestChannelConnection = async () => {
    setTestingChannelConn(true);
    setChannelConnStatus(null);
    try {
      const bSettings = await getBotSettings();
      const token = (bSettings.token || '').trim();
      const res = await testTelegramChannelConnection(token, editTgChatId);
      setChannelConnStatus(res);
      if (res.ok) {
        await updateTelegramChannel(selectedChannelIdForEdit, { isConnected: true });
      }
    } catch (err: any) {
      setChannelConnStatus({ ok: false, message: err.message || 'Connection test failed' });
    } finally {
      setTestingChannelConn(false);
    }
  };

  // Referral Handlers
  const handleSaveGlobalReferralSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setReferralFeedback('');
    try {
      const updated: ReferralSettings = {
        ...referralSettings,
        globalPercent: Number(globalRefPercent),
        level2Percent: Number(level2RefPercent),
        level3Percent: Number(level3RefPercent),
        autoAddToWallet: autoAddWalletRef,
        tiers: tiersList,
        updatedAt: new Date().toISOString(),
      };
      await saveReferralSettings(updated, activeAdminName);
      setReferralFeedback(lang === 'ar' ? 'تم حفظ إعدادات نظام الإحالة بنجاح' : 'Referral settings saved successfully');
      setTimeout(() => setReferralFeedback(''), 3000);
    } catch (err: any) {
      setReferralFeedback('Error saving settings: ' + err.message);
    }
  };

  const handleAddTier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTierName.trim() || !newTierPercent) return;
    const min = parseInt(newTierMin, 10) || 1;
    const max = parseInt(newTierMax, 10) || 999999;
    const pct = parseFloat(newTierPercent) || 10;

    const newTier: ReferralTier = {
      id: `tier_${Date.now()}`,
      name: newTierName.trim(),
      minReferrals: min,
      maxReferrals: max,
      commissionPercent: pct,
    };

    const updatedTiers = [...tiersList, newTier].sort((a, b) => a.minReferrals - b.minReferrals);
    setTiersList(updatedTiers);
    setNewTierName('');
    setNewTierMin('1');
    setNewTierMax('10');
    setNewTierPercent('10');

    try {
      await saveReferralSettings({
        ...referralSettings,
        tiers: updatedTiers,
      }, activeAdminName);
      setReferralFeedback(lang === 'ar' ? 'تمت إضافة الشريحة بنجاح' : 'New referral tier added successfully');
      setTimeout(() => setReferralFeedback(''), 3000);
    } catch (err: any) {
      alert('Error adding tier: ' + err.message);
    }
  };

  const handleDeleteTier = async (tierId: string) => {
    if (!window.confirm(lang === 'ar' ? 'هل أنت متأكد من حذف هذه الشريحة؟' : 'Delete this referral tier?')) return;
    const updated = tiersList.filter(t => t.id !== tierId);
    setTiersList(updated);
    try {
      await saveReferralSettings({
        ...referralSettings,
        tiers: updated,
      }, activeAdminName);
    } catch (err: any) {
      alert('Error deleting tier: ' + err.message);
    }
  };

  const handleUpdateTier = async (tier: ReferralTier) => {
    const updated = tiersList.map(t => t.id === tier.id ? tier : t).sort((a, b) => a.minReferrals - b.minReferrals);
    setTiersList(updated);
    setEditingTierId(null);
    try {
      await saveReferralSettings({
        ...referralSettings,
        tiers: updated,
      }, activeAdminName);
      setReferralFeedback(lang === 'ar' ? 'تم تحديث الشريحة بنجاح' : 'Tier updated successfully');
      setTimeout(() => setReferralFeedback(''), 3000);
    } catch (err: any) {
      alert('Error updating tier: ' + err.message);
    }
  };

  const handleAdjustUserCommissionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingUser) return;
    setAdjustFeedback('');
    const amt = parseFloat(adjustAmountInput);
    if (isNaN(amt) || amt === 0) {
      setAdjustFeedback(lang === 'ar' ? 'يرجى إدخال مبلغ صحيح' : 'Please enter a valid amount');
      return;
    }

    try {
      await adminAdjustUserCommission(
        adjustingUser.uid,
        amt,
        adjustReasonInput.trim() || 'Admin manual commission adjustment',
        activeAdminName
      );
      setAdjustFeedback(lang === 'ar' ? 'تم تعديل العمولة بنجاح' : 'Commission adjusted successfully');
      setTimeout(() => {
        setAdjustingUser(null);
        setAdjustAmountInput('');
        setAdjustReasonInput('');
        setAdjustFeedback('');
      }, 1500);
    } catch (err: any) {
      setAdjustFeedback('Error: ' + err.message);
    }
  };

  const handleAddProofImage = () => {
    if (!newProofImageUrl.trim()) return;
    setEditProofImages([...editProofImages, newProofImageUrl.trim()]);
    setNewProofImageUrl('');
  };

  const handleRemoveProofImage = (index: number) => {
    setEditProofImages(editProofImages.filter((_, idx) => idx !== index));
  };

  // Proof Image Upload from Disk (Base64)
  const handleUploadProofImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 800;
        if (width > height && width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else if (height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.8);
          setEditProofImages((prev) => [...prev, compressed]);
        }
      };
    };
    reader.readAsDataURL(file);
  };

  // Format Subscriber Countdown
  const formatSubCountdown = (endDateStr: string): string => {
    const end = new Date(endDateStr).getTime();
    const diff = end - currentTime;
    if (diff <= 0) return 'Expired';
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${days}d ${hours}h ${mins}m`;
  };

  // Pending Counts
  const pendingDepositsCount = useMemo(() => deposits.filter((d) => d.status === 'pending').length, [deposits]);
  const pendingWithdrawalsCount = useMemo(() => withdrawals.filter((w) => w.status === 'pending').length, [withdrawals]);
  const expiredSubsCount = useMemo(() => {
    return telegramSubscriptions.filter((s) => s.status === 'expired' || (s.status === 'active' && new Date(s.endDate).getTime() < currentTime)).length;
  }, [telegramSubscriptions, currentTime]);

  // Filtered Users
  const filteredUsers = useMemo(() => {
    if (!userSearch.trim()) return users;
    const q = userSearch.toLowerCase();
    return users.filter(
      (u) =>
        u.email.toLowerCase().includes(q) ||
        `${u.firstName} ${u.lastName}`.toLowerCase().includes(q)
    );
  }, [users, userSearch]);

  // Filtered Binary Trades
  const filteredBinaryTrades = useMemo(() => {
    return binaryTrades.filter((tr) => {
      const matchesFilter = binaryTradesFilter === 'ALL' || tr.status === binaryTradesFilter;
      const q = binaryTradesSearch.toLowerCase().trim();
      const matchesSearch = !q ||
        tr.email.toLowerCase().includes(q) ||
        tr.coin.toLowerCase().includes(q) ||
        (tr.userName && tr.userName.toLowerCase().includes(q));
      return matchesFilter && matchesSearch;
    });
  }, [binaryTrades, binaryTradesFilter, binaryTradesSearch]);

  // ================= ADMIN LOGIN SCREEN =================
  if (!isAdminLoggedIn) {
    return (
      <div 
        className="min-h-screen bg-[#0b0e11] text-gray-200 flex flex-col justify-center items-center p-4 font-sans"
        dir="ltr"
      >
        <div className="w-full max-w-md bg-[#181a20] border border-[#2b313a] rounded-3xl p-6 sm:p-8 shadow-2xl relative">
          <div className="text-center mb-6">
            <div className="w-14 h-14 mx-auto mb-3 bg-[#F0B90B]/10 text-yellow-400 rounded-2xl border border-[#F0B90B]/30 flex items-center justify-center shadow-inner">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <h1 className="text-xl font-black text-white tracking-tight">
              Admin Access Only - Restricted
            </h1>
          </div>

          {loginError && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-2 text-xs text-red-400 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleAdminLogin} autoComplete="off" className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gray-400 absolute top-3 left-3" />
                <input
                  type="email"
                  required
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="admin@example.com"
                  className="w-full py-2.5 bg-[#121418] border border-[#2b313a] rounded-xl text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#F0B90B] pl-9 pr-3 text-left"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute top-3 left-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full py-2.5 bg-[#121418] border border-[#2b313a] rounded-xl text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#F0B90B] font-mono tracking-wider pl-9 pr-10 text-left"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute top-2.5 text-gray-400 hover:text-white transition-colors p-1 rounded-lg right-2.5"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4 text-yellow-400" />
                  ) : (
                    <Eye className="w-4 h-4 text-gray-400 hover:text-white" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-[#F0B90B] hover:bg-[#dfaa07] text-black font-extrabold rounded-xl text-sm transition-all shadow-lg active:scale-98 flex items-center justify-center gap-2 mt-4"
            >
              Access Admin Panel
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ================= ADMIN LOGGED IN DASHBOARD =================
  return (
    <div 
      className="min-h-screen bg-[#0b0e11] text-gray-200 flex flex-col font-sans"
      dir={translations[lang].dir}
    >
      {/* Top Admin Header Bar */}
      <header className="bg-[#181a20] border-b border-[#282e38] px-4 sm:px-8 py-3 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center text-yellow-400 shadow-inner">
              <ShieldCheck className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-white text-base tracking-tight">
                  {siteSettings.siteName || 'tiksup'}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/30 uppercase">
                  MASTER ADMIN
                </span>
              </div>
              <span className="text-[11px] text-gray-400">
                Operator: <strong className="text-yellow-400 font-mono">{activeAdminName}</strong>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onNavigateHome}
              className="text-xs text-gray-300 hover:text-white flex items-center gap-1.5 px-3 py-1.5 bg-[#1e2329] border border-[#2b313a] rounded-xl transition-colors"
            >
              <ArrowLeft className={`w-3.5 h-3.5 ${lang === 'ar' ? 'rotate-180' : ''}`} />
              <span className="hidden sm:inline">{lang === 'ar' ? 'الذهاب للمنصة' : 'View Exchange'}</span>
            </button>

            <button
              onClick={() => onLanguageChange(lang === 'en' ? 'ar' : 'en')}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-[#1e2329] border border-[#2b313a] rounded-xl text-xs font-bold text-gray-300"
            >
              <Globe className="w-3.5 h-3.5 text-yellow-400" />
              <span>{lang === 'en' ? 'العربية' : 'EN'}</span>
            </button>

            <button
              onClick={() => setIsAdminLoggedIn(false)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl text-xs font-bold transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t.signOut}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Navigation Tabs Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-[#2b313a] no-scrollbar">
          <button
            onClick={() => setActiveTab('DEPOSITS')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all ${
              activeTab === 'DEPOSITS'
                ? 'bg-[#0ECB81] text-black shadow-md'
                : 'bg-[#181a20] text-gray-400 hover:text-white border border-[#2b313a]'
            }`}
          >
            <ArrowDownToLine className="w-4 h-4" />
            <span>{lang === 'ar' ? 'طلبات الإيداع' : 'Deposits'}</span>
            {pendingDepositsCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-black/20 text-black font-mono text-[10px] font-black">
                {pendingDepositsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('WITHDRAWALS')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all ${
              activeTab === 'WITHDRAWALS'
                ? 'bg-yellow-400 text-black shadow-md'
                : 'bg-[#181a20] text-gray-400 hover:text-white border border-[#2b313a]'
            }`}
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>{lang === 'ar' ? 'طلبات السحب' : 'Withdrawals'}</span>
            {pendingWithdrawalsCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-black/20 text-black font-mono text-[10px] font-black">
                {pendingWithdrawalsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('REFERRALS')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all ${
              activeTab === 'REFERRALS'
                ? 'bg-gradient-to-r from-yellow-500 to-amber-400 text-black shadow-md'
                : 'bg-[#181a20] text-gray-400 hover:text-white border border-[#2b313a]'
            }`}
          >
            <Gift className="w-4 h-4" />
            <span>{lang === 'ar' ? 'نظام الإحالة والشرائح' : 'Referral System & Tiers'}</span>
            <span className="px-1.5 py-0.2 rounded-full bg-yellow-400/20 text-yellow-400 font-mono text-[10px] font-black">
              {allReferrals.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('TELEGRAM')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all ${
              activeTab === 'TELEGRAM'
                ? 'bg-gradient-to-r from-blue-600 to-sky-500 text-white shadow-md'
                : 'bg-[#181a20] text-gray-400 hover:text-white border border-[#2b313a]'
            }`}
          >
            <Send className="w-4 h-4" />
            <span>{lang === 'ar' ? 'إدارة تيليجرام والمشتركين' : 'Telegram Signals'}</span>
            {expiredSubsCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-red-500 text-white font-mono text-[10px] font-black" title="Expired subscriptions">
                {expiredSubsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('AUTO_POSTER')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all ${
              activeTab === 'AUTO_POSTER'
                ? 'bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-md'
                : 'bg-[#181a20] text-gray-400 hover:text-white border border-[#2b313a]'
            }`}
          >
            <Bot className="w-4 h-4" />
            <span>{lang === 'ar' ? 'النشر التلقائي (Auto Poster)' : 'Telegram Auto Poster'}</span>
          </button>

          <button
            onClick={() => setActiveTab('BINARY')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all ${
              activeTab === 'BINARY'
                ? 'bg-[#F0B90B] text-black shadow-md'
                : 'bg-[#181a20] text-gray-400 hover:text-white border border-[#2b313a]'
            }`}
          >
            <Zap className="w-4 h-4" />
            <span>{lang === 'ar' ? 'التداول الثنائي (UP/DOWN)' : 'Binary Trading'}</span>
          </button>

          <button
            onClick={() => setActiveTab('USERS')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all ${
              activeTab === 'USERS'
                ? 'bg-[#2b313a] text-yellow-400 shadow-md'
                : 'bg-[#181a20] text-gray-400 hover:text-white border border-[#2b313a]'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>{t.userManagementTab}</span>
          </button>

          <button
            onClick={() => setActiveTab('WALLET')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all ${
              activeTab === 'WALLET'
                ? 'bg-[#2b313a] text-yellow-400 shadow-md'
                : 'bg-[#181a20] text-gray-400 hover:text-white border border-[#2b313a]'
            }`}
          >
            <Wallet className="w-4 h-4" />
            <span>{t.walletControlTab}</span>
          </button>

          <button
            onClick={() => setActiveTab('CRYPTO')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all ${
              activeTab === 'CRYPTO'
                ? 'bg-[#2b313a] text-yellow-400 shadow-md'
                : 'bg-[#181a20] text-gray-400 hover:text-white border border-[#2b313a]'
            }`}
          >
            <Coins className="w-4 h-4" />
            <span>{lang === 'ar' ? 'إدراج الكريبتو' : 'Crypto Listing'}</span>
          </button>

          <button
            onClick={() => setActiveTab('SETTINGS')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all ${
              activeTab === 'SETTINGS'
                ? 'bg-[#2b313a] text-yellow-400 shadow-md'
                : 'bg-[#181a20] text-gray-400 hover:text-white border border-[#2b313a]'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>{t.siteSettingsTab}</span>
          </button>
        </div>

        {/* ================= TAB 1: DEPOSITS ================= */}
        {activeTab === 'DEPOSITS' && (
          <div className="bg-[#181a20] border border-[#2b313a] rounded-3xl p-6 shadow-xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#2b313a]">
              <div>
                <h2 className="text-lg font-black text-white flex items-center gap-2">
                  <ArrowDownToLine className="w-5 h-5 text-[#0ECB81]" />
                  <span>{lang === 'ar' ? 'إدارة طلبات الإيداع' : 'Deposit Verification Queue'}</span>
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {lang === 'ar'
                    ? 'راجع إشعار التحويل وصورة الإيصال ثم اعتمد الإيداع ليُضاف رصيد USDT للمستخدم تلقائياً.'
                    : 'Review transaction TxID and screenshot proof. Approving credits the user wallet automatically.'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">Total: {deposits.length}</span>
                <span className="px-2.5 py-1 rounded-lg bg-yellow-500/15 text-yellow-400 text-xs font-bold border border-yellow-500/30">
                  {pendingDepositsCount} {lang === 'ar' ? 'قيد الانتظار' : 'Pending'}
                </span>
              </div>
            </div>

            {deposits.length === 0 ? (
              <div className="py-12 text-center text-xs text-gray-500">
                {lang === 'ar' ? 'لا توجد طلبات إيداع حتى الآن.' : 'No deposits recorded yet.'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-start">
                  <thead>
                    <tr className="border-b border-[#262c35] text-gray-400 font-bold">
                      <th className="py-3 px-3">User Email</th>
                      <th className="py-3 px-3">Coin & Network</th>
                      <th className="py-3 px-3">Amount</th>
                      <th className="py-3 px-3">TxID</th>
                      <th className="py-3 px-3">Screenshot</th>
                      <th className="py-3 px-3">Date</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-3 text-end">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#222832]">
                    {deposits.map((dep) => (
                      <tr key={dep.id} className="hover:bg-[#1f242c]/50">
                        <td className="py-3 px-3 font-bold text-white">
                          {dep.userEmail}
                        </td>
                        <td className="py-3 px-3 font-semibold text-gray-300">
                          {dep.coin} <span className="text-[10px] text-yellow-400">({dep.network})</span>
                        </td>
                        <td className="py-3 px-3 font-mono font-black text-[#0ECB81] text-sm">
                          +{dep.amount.toFixed(2)} {dep.coin}
                        </td>
                        <td className="py-3 px-3 font-mono text-gray-400 max-w-[130px] truncate" title={dep.txId}>
                          {dep.txId}
                        </td>
                        <td className="py-3 px-3">
                          {dep.screenshotUrl ? (
                            <button
                              type="button"
                              onClick={() => setZoomScreenshot(dep.screenshotUrl!)}
                              className="group relative w-12 h-10 rounded-lg overflow-hidden border border-[#2b313a] hover:border-yellow-400 transition-all flex items-center justify-center bg-black/40"
                              title="Click to view full screenshot"
                            >
                              <img 
                                src={dep.screenshotUrl} 
                                alt="Proof" 
                                className="w-full h-full object-cover" 
                              />
                              <div className="absolute inset-0 bg-black/30 group-hover:bg-transparent flex items-center justify-center">
                                <Maximize2 className="w-3.5 h-3.5 text-white" />
                              </div>
                            </button>
                          ) : (
                            <span className="text-gray-500 italic text-[11px]">No image</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-gray-400 whitespace-nowrap">
                          {new Date(dep.createdAt).toLocaleString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="py-3 px-3">
                          {dep.status === 'approved' && (
                            <span className="px-2.5 py-1 rounded-lg bg-[#0ECB81]/15 text-[#0ECB81] font-bold text-[10px] border border-[#0ECB81]/30">
                              Approved
                            </span>
                          )}
                          {dep.status === 'pending' && (
                            <span className="px-2.5 py-1 rounded-lg bg-yellow-500/15 text-yellow-400 font-bold text-[10px] border border-yellow-500/30 flex items-center gap-1 inline-flex">
                              <Clock className="w-3 h-3 animate-spin" />
                              Pending
                            </span>
                          )}
                          {dep.status === 'rejected' && (
                            <span className="px-2.5 py-1 rounded-lg bg-red-500/15 text-red-400 font-bold text-[10px] border border-red-500/30">
                              Rejected
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-end whitespace-nowrap">
                          {dep.status === 'pending' ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleApproveDeposit(dep)}
                                className="px-3 py-1.5 bg-[#0ECB81] hover:bg-[#0bb372] text-black font-black rounded-lg text-xs transition-all shadow-sm"
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRejectDeposit(dep)}
                                className="px-2.5 py-1.5 bg-red-500/15 hover:bg-red-500/25 text-red-400 font-bold rounded-lg text-xs border border-red-500/30 transition-all"
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-gray-500">
                              Reviewed by {dep.reviewedBy || 'Admin'}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 2: WITHDRAWALS ================= */}
        {activeTab === 'WITHDRAWALS' && (
          <div className="bg-[#181a20] border border-[#2b313a] rounded-3xl p-6 shadow-xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#2b313a]">
              <div>
                <h2 className="text-lg font-black text-white flex items-center gap-2">
                  <ArrowUpRight className="w-5 h-5 text-yellow-400" />
                  <span>{lang === 'ar' ? 'إدارة طلبات السحب' : 'Withdrawal Processing Queue'}</span>
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {lang === 'ar'
                    ? 'قم بتحويل المبلغ لعنوان العميل ثم اضغط تأكيد. في حال الرفض، يُعاد المبلغ تلقائياً لرصيد المستخدم.'
                    : 'Dispatch funds to user address and approve. If rejected, funds are automatically refunded to user balance.'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">Total: {withdrawals.length}</span>
                <span className="px-2.5 py-1 rounded-lg bg-yellow-500/15 text-yellow-400 text-xs font-bold border border-yellow-500/30">
                  {pendingWithdrawalsCount} {lang === 'ar' ? 'قيد الانتظار' : 'Pending'}
                </span>
              </div>
            </div>

            {withdrawals.length === 0 ? (
              <div className="py-12 text-center text-xs text-gray-500">
                {lang === 'ar' ? 'لا توجد طلبات سحب مسجلة حتى الآن.' : 'No withdrawals recorded yet.'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-start">
                  <thead>
                    <tr className="border-b border-[#262c35] text-gray-400 font-bold">
                      <th className="py-3 px-3">User Email</th>
                      <th className="py-3 px-3">Amount</th>
                      <th className="py-3 px-3">Destination Address</th>
                      <th className="py-3 px-3">Date</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-3 text-end">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#222832]">
                    {withdrawals.map((w) => (
                      <tr key={w.id} className="hover:bg-[#1f242c]/50">
                        <td className="py-3 px-3 font-bold text-white">
                          {w.userEmail}
                        </td>
                        <td className="py-3 px-3 font-mono font-black text-red-400 text-sm">
                          -{w.amount.toFixed(2)} {w.coin}
                        </td>
                        <td className="py-3 px-3 font-mono text-yellow-400 max-w-[160px] truncate select-all" title={w.walletAddress}>
                          {w.walletAddress}
                        </td>
                        <td className="py-3 px-3 text-gray-400 whitespace-nowrap">
                          {new Date(w.createdAt).toLocaleString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="py-3 px-3">
                          {w.status === 'approved' && (
                            <span className="px-2.5 py-1 rounded-lg bg-[#0ECB81]/15 text-[#0ECB81] font-bold text-[10px] border border-[#0ECB81]/30">
                              Approved & Sent
                            </span>
                          )}
                          {w.status === 'pending' && (
                            <span className="px-2.5 py-1 rounded-lg bg-yellow-500/15 text-yellow-400 font-bold text-[10px] border border-yellow-500/30 flex items-center gap-1 inline-flex">
                              <Clock className="w-3 h-3 animate-spin" />
                              Pending Dispatch
                            </span>
                          )}
                          {w.status === 'rejected' && (
                            <span className="px-2.5 py-1 rounded-lg bg-red-500/15 text-red-400 font-bold text-[10px] border border-red-500/30">
                              Rejected (Refunded)
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-end whitespace-nowrap">
                          {w.status === 'pending' ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleApproveWithdrawal(w)}
                                className="px-3 py-1.5 bg-[#F0B90B] hover:bg-[#dfaa07] text-black font-black rounded-lg text-xs transition-all shadow-sm"
                              >
                                Approve & Sent
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRejectWithdrawal(w)}
                                className="px-2.5 py-1.5 bg-red-500/15 hover:bg-red-500/25 text-red-400 font-bold rounded-lg text-xs border border-red-500/30 transition-all"
                                title="Rejects request and refunds amount to user balance"
                              >
                                Reject & Refund
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-gray-500">
                              Processed
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 2.5: REFERRALS CONTROL PANEL ================= */}
        {activeTab === 'REFERRALS' && (
          <div className="space-y-6">
            {/* Top Metrics Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-[#181a20] border border-[#2b313a] rounded-2xl p-4 shadow-lg">
                <div className="flex items-center justify-between text-gray-400 mb-1">
                  <span className="text-xs font-bold">{lang === 'ar' ? 'إجمالي عمولات الإحالة المدفوعة' : 'Total Referral Paid'}</span>
                  <DollarSign className="w-4 h-4 text-[#0ECB81]" />
                </div>
                <div className="text-xl sm:text-2xl font-black font-mono text-[#0ECB81]">
                  ${allReferrals.reduce((sum, r) => sum + (r.commissionEarned || 0), 0).toFixed(2)}
                </div>
                <span className="text-[10px] text-gray-500 mt-1 block">
                  {lang === 'ar' ? 'أرباح موزعة على المحافظ' : 'Credited to user balances'}
                </span>
              </div>

              <div className="bg-[#181a20] border border-[#2b313a] rounded-2xl p-4 shadow-lg">
                <div className="flex items-center justify-between text-gray-400 mb-1">
                  <span className="text-xs font-bold">{lang === 'ar' ? 'إجمالي عمليات الإحالة' : 'Total Referral Events'}</span>
                  <Users className="w-4 h-4 text-yellow-400" />
                </div>
                <div className="text-xl sm:text-2xl font-black font-mono text-yellow-400">
                  {allReferrals.length}
                </div>
                <span className="text-[10px] text-gray-500 mt-1 block">
                  {lang === 'ar' ? 'إيداعات مسجلة عبر إحالات' : 'Commissioned deposit events'}
                </span>
              </div>

              <div className="bg-[#181a20] border border-[#2b313a] rounded-2xl p-4 shadow-lg">
                <div className="flex items-center justify-between text-gray-400 mb-1">
                  <span className="text-xs font-bold">{lang === 'ar' ? 'الشرائح الديناميكية' : 'Dynamic Tiers'}</span>
                  <Layers className="w-4 h-4 text-sky-400" />
                </div>
                <div className="text-xl sm:text-2xl font-black font-mono text-sky-400">
                  {tiersList.length} {lang === 'ar' ? 'شرائح' : 'Tiers'}
                </div>
                <span className="text-[10px] text-gray-500 mt-1 block">
                  {lang === 'ar' ? 'معدلات مرنة قابلة للتعديل' : 'Flexible tiered percentages'}
                </span>
              </div>

              <div className="bg-[#181a20] border border-[#2b313a] rounded-2xl p-4 shadow-lg">
                <div className="flex items-center justify-between text-gray-400 mb-1">
                  <span className="text-xs font-bold">{lang === 'ar' ? 'الإيداع التلقائي للمحفظة' : 'Auto Wallet Credit'}</span>
                  <Sparkles className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-xl sm:text-2xl font-black font-mono">
                  {autoAddWalletRef ? (
                    <span className="text-[#0ECB81]">{lang === 'ar' ? 'مفعل' : 'ENABLED'}</span>
                  ) : (
                    <span className="text-red-400">{lang === 'ar' ? 'معطل' : 'DISABLED'}</span>
                  )}
                </div>
                <span className="text-[10px] text-gray-500 mt-1 block">
                  {lang === 'ar' ? 'إضافة فورية لرصيد المتداول' : 'Instant balance addition'}
                </span>
              </div>
            </div>

            {referralFeedback && (
              <div className="p-3.5 bg-[#0ECB81]/10 border border-[#0ECB81]/30 rounded-2xl text-xs text-[#0ECB81] font-bold flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{referralFeedback}</span>
              </div>
            )}

            {/* Global Settings & Multi-Level Commission Card */}
            <div className="bg-[#181a20] border border-[#2b313a] rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#2b313a]">
                <div>
                  <h2 className="text-base font-black text-white flex items-center gap-2">
                    <Sliders className="w-5 h-5 text-yellow-400" />
                    <span>{lang === 'ar' ? 'الإعدادات العامة والعمولات متعددة المستويات' : 'Global Settings & Multi-Level Commission'}</span>
                  </h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {lang === 'ar'
                      ? 'حدد النسبة العامة للمستوى الأول، وعمولات المستوى الثاني والثالث (L2, L3)، وتحكم في الإيداع الفوري للمحفظة.'
                      : 'Configure global referral rate, Level 2 and Level 3 commissions, and toggle auto wallet balance crediting.'}
                  </p>
                </div>
              </div>

              <form onSubmit={handleSaveGlobalReferralSettings} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Global Level 1 Default % */}
                  <div className="p-4 bg-[#121418] rounded-2xl border border-[#2b313a]">
                    <label className="block text-xs font-bold text-gray-300 mb-1.5">
                      {lang === 'ar' ? 'النسبة العامة (المستوى 1) %' : 'Global Default Rate (Level 1) %'}
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      required
                      value={globalRefPercent}
                      onChange={(e) => setGlobalRefPercent(parseFloat(e.target.value) || 0)}
                      className="w-full px-3.5 py-2.5 bg-[#181a20] border border-[#2b313a] rounded-xl text-white font-mono font-bold text-sm focus:border-yellow-400"
                    />
                    <span className="text-[10px] text-gray-500 mt-1 block">
                      {lang === 'ar' ? 'تُطبق كنسبة أساسية للإحالات المباشرة' : 'Base percentage for direct referrals'}
                    </span>
                  </div>

                  {/* Level 2 Commission % */}
                  <div className="p-4 bg-[#121418] rounded-2xl border border-[#2b313a]">
                    <label className="block text-xs font-bold text-gray-300 mb-1.5">
                      {lang === 'ar' ? 'عمولة المستوى الثاني (Level 2) %' : 'Level 2 Referral Commission %'}
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="50"
                      required
                      value={level2RefPercent}
                      onChange={(e) => setLevel2RefPercent(parseFloat(e.target.value) || 0)}
                      className="w-full px-3.5 py-2.5 bg-[#181a20] border border-[#2b313a] rounded-xl text-white font-mono font-bold text-sm focus:border-yellow-400"
                    />
                    <span className="text-[10px] text-gray-500 mt-1 block">
                      {lang === 'ar' ? 'تُمنح للمُحيل الأصلي عند إيداع إحالة إحالته' : 'Awarded to original referrer on sub-referral deposit'}
                    </span>
                  </div>

                  {/* Level 3 Commission % */}
                  <div className="p-4 bg-[#121418] rounded-2xl border border-[#2b313a]">
                    <label className="block text-xs font-bold text-gray-300 mb-1.5">
                      {lang === 'ar' ? 'عمولة المستوى الثالث (Level 3) %' : 'Level 3 Referral Commission %'}
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="50"
                      required
                      value={level3RefPercent}
                      onChange={(e) => setLevel3RefPercent(parseFloat(e.target.value) || 0)}
                      className="w-full px-3.5 py-2.5 bg-[#181a20] border border-[#2b313a] rounded-xl text-white font-mono font-bold text-sm focus:border-yellow-400"
                    />
                    <span className="text-[10px] text-gray-500 mt-1 block">
                      {lang === 'ar' ? 'تُمنح للمُحيل الأقدم في السلسلة' : 'Awarded to top-tier referrer in hierarchy chain'}
                    </span>
                  </div>
                </div>

                {/* Auto Add to Wallet Toggle */}
                <div className="p-4 bg-[#121418] rounded-2xl border border-[#2b313a] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold text-white block">
                      {lang === 'ar' ? 'إضافة أرباح الإحالة مباشرة إلى رصيد المحفظة (walletBalance)' : 'Auto-Add Referral Commission to Wallet Balance'}
                    </span>
                    <span className="text-[11px] text-gray-400">
                      {lang === 'ar' 
                        ? 'عند تفعيل هذا الخيار، يتم إضافة عمولة الإحالة فوراً إلى رصيد المتداول ويمكنه سحبها أو التداول بها بحرية.' 
                        : 'When enabled, commission is credited directly to user walletBalance instantly upon deposit approval.'}
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={autoAddWalletRef}
                      onChange={(e) => setAutoAddWalletRef(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-[#2b313a] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0ECB81]"></div>
                  </label>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-[#F0B90B] hover:bg-[#dfaa07] text-black font-black rounded-xl text-xs shadow-md transition-all flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>{lang === 'ar' ? 'حفظ إعدادات الإحالة العامة' : 'Save Referral Global Settings'}</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Dynamic Referral Tiers Management */}
            <div className="bg-[#181a20] border border-[#2b313a] rounded-3xl p-6 shadow-xl space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#2b313a]">
                <div>
                  <h2 className="text-base font-black text-white flex items-center gap-2">
                    <Layers className="w-5 h-5 text-yellow-400" />
                    <span>{lang === 'ar' ? 'إدارة شرائح الإحالة الديناميكية (Tiered Percentages)' : 'Dynamic Tiered Commission Percentages'}</span>
                  </h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {lang === 'ar'
                      ? 'حدد شرائح تصاعدية (مثال: من 1 إلى 10 إحالات = 10%، ومن 11 إلى 20 = 8%، إلخ). النظام ديناميكي بالكامل.'
                      : 'Tiered rules (e.g. 1-10 referrals = 10%, 11-20 = 8%, 21-50 = 5%). Fully customizable in real-time.'}
                  </p>
                </div>
              </div>

              {/* Add New Tier Form */}
              <form onSubmit={handleAddTier} className="p-4 bg-[#121418] rounded-2xl border border-[#2b313a] space-y-3">
                <span className="text-xs font-bold text-white block">
                  {lang === 'ar' ? '+ إضافة شريحة إحالة جديدة' : '+ Add New Referral Tier'}
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-300 mb-1">
                      {lang === 'ar' ? 'اسم الشريحة' : 'Tier Name'}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Tier 1 (1 - 10 referrals)"
                      value={newTierName}
                      onChange={(e) => setNewTierName(e.target.value)}
                      className="w-full px-3 py-2 bg-[#181a20] border border-[#2b313a] rounded-xl text-white text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-300 mb-1">
                      {lang === 'ar' ? 'من عدد إحالات' : 'From Referrals (Min)'}
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={newTierMin}
                      onChange={(e) => setNewTierMin(e.target.value)}
                      className="w-full px-3 py-2 bg-[#181a20] border border-[#2b313a] rounded-xl text-white font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-300 mb-1">
                      {lang === 'ar' ? 'إلى عدد إحالات' : 'To Referrals (Max)'}
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={newTierMax}
                      onChange={(e) => setNewTierMax(e.target.value)}
                      className="w-full px-3 py-2 bg-[#181a20] border border-[#2b313a] rounded-xl text-white font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-300 mb-1">
                      {lang === 'ar' ? 'نسبة العمولة %' : 'Commission %'}
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        step="0.1"
                        min="0.1"
                        max="100"
                        required
                        value={newTierPercent}
                        onChange={(e) => setNewTierPercent(e.target.value)}
                        className="w-full px-3 py-2 bg-[#181a20] border border-[#2b313a] rounded-xl text-white font-mono text-xs text-yellow-400 font-bold"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 bg-[#0ECB81] hover:bg-[#0bb372] text-black font-black rounded-xl text-xs shrink-0 shadow-md"
                      >
                        {lang === 'ar' ? 'إضافة' : 'Add'}
                      </button>
                    </div>
                  </div>
                </div>
              </form>

              {/* Tiers Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-start">
                  <thead>
                    <tr className="border-b border-[#262c35] text-gray-400 font-bold">
                      <th className="py-2.5 px-3">Tier Name</th>
                      <th className="py-2.5 px-3">From Referrals</th>
                      <th className="py-2.5 px-3">To Referrals</th>
                      <th className="py-2.5 px-3">Commission %</th>
                      <th className="py-2.5 px-3 text-end">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#222832]">
                    {tiersList.map((tier) => (
                      <tr key={tier.id} className="hover:bg-[#1f242c]/50">
                        <td className="py-3 px-3 font-bold text-white">
                          {editingTierId === tier.id ? (
                            <input
                              type="text"
                              value={tier.name}
                              onChange={(e) => {
                                const val = e.target.value;
                                setTiersList(tiersList.map(t => t.id === tier.id ? { ...t, name: val } : t));
                              }}
                              className="px-2 py-1 bg-[#121418] border border-yellow-400 rounded text-xs text-white"
                            />
                          ) : (
                            tier.name
                          )}
                        </td>
                        <td className="py-3 px-3 font-mono text-gray-300">
                          {editingTierId === tier.id ? (
                            <input
                              type="number"
                              value={tier.minReferrals}
                              onChange={(e) => {
                                const val = parseInt(e.target.value, 10) || 1;
                                setTiersList(tiersList.map(t => t.id === tier.id ? { ...t, minReferrals: val } : t));
                              }}
                              className="w-20 px-2 py-1 bg-[#121418] border border-yellow-400 rounded text-xs font-mono text-white"
                            />
                          ) : (
                            `${tier.minReferrals} ${lang === 'ar' ? 'إحالة' : 'refs'}`
                          )}
                        </td>
                        <td className="py-3 px-3 font-mono text-gray-300">
                          {editingTierId === tier.id ? (
                            <input
                              type="number"
                              value={tier.maxReferrals}
                              onChange={(e) => {
                                const val = parseInt(e.target.value, 10) || 999999;
                                setTiersList(tiersList.map(t => t.id === tier.id ? { ...t, maxReferrals: val } : t));
                              }}
                              className="w-20 px-2 py-1 bg-[#121418] border border-yellow-400 rounded text-xs font-mono text-white"
                            />
                          ) : (
                            tier.maxReferrals > 50000 ? (lang === 'ar' ? 'غير محدود' : 'Unlimited') : `${tier.maxReferrals} ${lang === 'ar' ? 'إحالة' : 'refs'}`
                          )}
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-yellow-400">
                          {editingTierId === tier.id ? (
                            <input
                              type="number"
                              step="0.1"
                              value={tier.commissionPercent}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                setTiersList(tiersList.map(t => t.id === tier.id ? { ...t, commissionPercent: val } : t));
                              }}
                              className="w-20 px-2 py-1 bg-[#121418] border border-yellow-400 rounded text-xs font-mono text-yellow-400 font-bold"
                            />
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-yellow-500/10 border border-yellow-500/30 text-yellow-400">
                              {tier.commissionPercent}% of deposit
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-end whitespace-nowrap">
                          {editingTierId === tier.id ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleUpdateTier(tier)}
                                className="px-2.5 py-1 bg-[#0ECB81] hover:bg-[#0bb372] text-black font-bold rounded-lg text-xs"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingTierId(null)}
                                className="px-2.5 py-1 bg-[#2b313a] text-gray-300 rounded-lg text-xs"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setEditingTierId(tier.id)}
                                className="px-2.5 py-1 bg-[#2b313a] hover:bg-[#38414e] text-white font-bold rounded-lg text-xs"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteTier(tier.id)}
                                className="px-2.5 py-1 bg-red-500/15 hover:bg-red-500/25 text-red-400 font-bold rounded-lg text-xs border border-red-500/30"
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* User Referral Network & Tree Overview */}
            <div className="bg-[#181a20] border border-[#2b313a] rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#2b313a]">
                <div>
                  <h2 className="text-base font-black text-white flex items-center gap-2">
                    <Users className="w-5 h-5 text-yellow-400" />
                    <span>{lang === 'ar' ? 'سجل شبكة المتداولين وشجرة الإحالة' : 'Trader Referral Network & Trees'}</span>
                  </h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {lang === 'ar'
                      ? 'استعراض جميع المستخدمين ومن قام بإحالتهم، فحص شجرة الإحالة التفاعلية، وتعديل عمولة أي مستخدم يدوياً.'
                      : 'View referral trees, who referred whom, inspect family hierarchies, and manually adjust commissions.'}
                  </p>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 text-gray-400 absolute top-2.5 left-3" />
                  <input
                    type="text"
                    value={referralSearch}
                    onChange={(e) => setReferralSearch(e.target.value)}
                    placeholder={lang === 'ar' ? 'بحث بالاسم، البريد، كود الإحالة...' : 'Search by name, email, code...'}
                    className="w-full pl-9 pr-3 py-2 bg-[#121418] border border-[#2b313a] rounded-xl text-white text-xs focus:border-yellow-400"
                  />
                </div>
              </div>

              <div className="overflow-x-auto max-h-[480px]">
                <table className="w-full text-xs text-start">
                  <thead>
                    <tr className="border-b border-[#262c35] text-gray-400 font-bold">
                      <th className="py-2.5 px-3">Trader</th>
                      <th className="py-2.5 px-3">Referral Code</th>
                      <th className="py-2.5 px-3">Referred By</th>
                      <th className="py-2.5 px-3">Referrals Count</th>
                      <th className="py-2.5 px-3">Earnings (USDT)</th>
                      <th className="py-2.5 px-3">Wallet Balance</th>
                      <th className="py-2.5 px-3 text-end">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#222832]">
                    {users
                      .filter((u) => {
                        if (!referralSearch.trim()) return true;
                        const q = referralSearch.toLowerCase().trim();
                        return (
                          u.email.toLowerCase().includes(q) ||
                          `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) ||
                          (u.referralCode && u.referralCode.toLowerCase().includes(q)) ||
                          (u.referredBy && u.referredBy.toLowerCase().includes(q))
                        );
                      })
                      .map((u) => {
                        const referrerUser = users.find(x => x.uid === u.referredBy);
                        return (
                          <tr key={u.uid} className="hover:bg-[#1f242c]/50">
                            <td className="py-3 px-3">
                              <span className="font-bold text-white block">{u.firstName} {u.lastName}</span>
                              <span className="text-[11px] text-gray-400 font-mono">{u.email}</span>
                            </td>
                            <td className="py-3 px-3 font-mono text-yellow-400 font-bold">
                              {u.referralCode || u.uid.slice(0, 8)}
                            </td>
                            <td className="py-3 px-3 text-gray-300">
                              {referrerUser ? (
                                <div>
                                  <span className="font-bold text-white block">{referrerUser.firstName} {referrerUser.lastName}</span>
                                  <span className="text-[10px] text-gray-400 font-mono">{referrerUser.email}</span>
                                </div>
                              ) : (
                                <span className="text-[11px] text-gray-500">Direct (None)</span>
                              )}
                            </td>
                            <td className="py-3 px-3 font-mono font-bold text-sky-400">
                              {u.referralCount || 0}
                            </td>
                            <td className="py-3 px-3 font-mono font-bold text-[#0ECB81]">
                              ${(u.referralEarnings || 0).toFixed(2)}
                            </td>
                            <td className="py-3 px-3 font-mono font-bold text-yellow-400">
                              ${u.walletBalance.toFixed(2)}
                            </td>
                            <td className="py-3 px-3 text-end whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setInspectedTreeUser(u)}
                                  className="px-2.5 py-1.5 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded-xl text-xs font-bold flex items-center gap-1"
                                  title="View hierarchy family tree"
                                >
                                  <GitBranch className="w-3.5 h-3.5" />
                                  <span>{lang === 'ar' ? 'الشجرة' : 'Tree'}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAdjustingUser(u);
                                    setAdjustAmountInput('');
                                    setAdjustReasonInput('');
                                    setAdjustFeedback('');
                                  }}
                                  className="px-2.5 py-1.5 bg-[#2b313a] hover:bg-[#38414e] text-white rounded-xl text-xs font-bold"
                                  title="Manually adjust referral commission"
                                >
                                  {lang === 'ar' ? 'تعديل العمولة' : 'Adjust Commission'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recent Referral Commissions Records */}
            <div className="bg-[#181a20] border border-[#2b313a] rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#2b313a]">
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <Gift className="w-4 h-4 text-yellow-400" />
                  <span>{lang === 'ar' ? 'سجل عمولات الإحالة المنفذة' : 'Referral Commission History Ledger'}</span>
                </h3>
                <span className="text-xs text-gray-400 font-mono">
                  {allReferrals.length} {lang === 'ar' ? 'سجل' : 'records'}
                </span>
              </div>

              {allReferrals.length === 0 ? (
                <div className="py-8 text-center text-xs text-gray-500">
                  {lang === 'ar' ? 'لم يتم تسجيل أي عمولات إحالة حتى الآن.' : 'No referral commissions earned yet.'}
                </div>
              ) : (
                <div className="overflow-x-auto max-h-[380px]">
                  <table className="w-full text-xs text-start">
                    <thead>
                      <tr className="border-b border-[#262c35] text-gray-400 font-bold">
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Referrer</th>
                        <th className="py-2.5 px-3">Referred User</th>
                        <th className="py-2.5 px-3">Level</th>
                        <th className="py-2.5 px-3">Deposit Amount</th>
                        <th className="py-2.5 px-3">Commission Earned</th>
                        <th className="py-2.5 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#222832]">
                      {allReferrals.map((ref) => {
                        const referrer = users.find(u => u.uid === ref.referrerId);
                        const referred = users.find(u => u.uid === ref.referredId);
                        return (
                          <tr key={ref.id} className="hover:bg-[#1f242c]/50">
                            <td className="py-2.5 px-3 text-gray-400 font-mono text-[11px]">
                              {new Date(ref.createdAt).toLocaleDateString()} {new Date(ref.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="py-2.5 px-3 text-white font-bold">
                              {referrer ? `${referrer.firstName} ${referrer.lastName}` : ref.referrerId.slice(0, 8)}
                              <span className="text-[10px] text-gray-400 block font-mono">{referrer?.email}</span>
                            </td>
                            <td className="py-2.5 px-3 text-gray-300">
                              {ref.referredName || (referred ? `${referred.firstName} ${referred.lastName}` : ref.referredId.slice(0, 8))}
                              <span className="text-[10px] text-gray-400 block font-mono">{ref.referredEmail || referred?.email}</span>
                            </td>
                            <td className="py-2.5 px-3 font-bold">
                              <span className={`px-2 py-0.5 rounded text-[10px] ${
                                ref.level === 1 
                                  ? 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30' 
                                  : ref.level === 2 
                                  ? 'bg-[#0ECB81]/15 text-[#0ECB81] border border-[#0ECB81]/30' 
                                  : 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
                              }`}>
                                Level {ref.level}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-mono font-bold text-gray-300">
                              ${ref.depositAmount.toFixed(2)}
                            </td>
                            <td className="py-2.5 px-3 font-mono font-black text-[#0ECB81]">
                              +${ref.commissionEarned.toFixed(2)}
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="px-2 py-0.5 rounded-full bg-[#0ECB81]/15 text-[#0ECB81] text-[10px] font-bold">
                                {ref.status || 'Completed'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= TAB 3: TELEGRAM SIGNALS ================= */}
        {activeTab === 'TELEGRAM' && (
          <div className="space-y-6">
            {/* Top Channel Editor */}
            <div className="bg-[#181a20] border border-[#2b313a] rounded-3xl p-6 shadow-xl space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#2b313a]">
                <div>
                  <h2 className="text-lg font-black text-white flex items-center gap-2">
                    <Send className="w-5 h-5 text-sky-400" />
                    <span>{lang === 'ar' ? 'إعدادات قنوات تيليجرام الأربعة' : 'Telegram Channels Management (4 Private Tiers)'}</span>
                  </h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {lang === 'ar'
                      ? 'تحكم في معرف القناة (Channel ID)، عدد المنشورات باليوم، تبديل الآلي/اليدوي، وحالة الاتصال.'
                      : 'Configure Channel ID, posts per day, MANUAL/AUTO toggle, connection test, and invite links.'}
                  </p>
                </div>

                {/* 4 Channels Selector Tabs */}
                <div className="flex items-center gap-1.5 bg-[#121418] p-1.5 rounded-2xl border border-[#2b313a] overflow-x-auto">
                  {(['super_vip', 'vip', 'regular', 'free'] as const).map((id) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setSelectedChannelIdForEdit(id)}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all whitespace-nowrap ${
                        selectedChannelIdForEdit === id
                          ? id === 'super_vip'
                            ? 'bg-yellow-400 text-black shadow-md'
                            : id === 'vip'
                            ? 'bg-[#0ECB81] text-black shadow-md'
                            : id === 'regular'
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'bg-purple-600 text-white shadow-md'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      {id === 'super_vip' ? '👑 SUPER VIP' : id === 'vip' ? '⚡ VIP' : id === 'regular' ? '💎 REGULAR' : '🎁 FREE'}
                    </button>
                  ))}
                </div>
              </div>

              {telegramFeedback && (
                <div className="p-3 bg-[#0ECB81]/10 border border-[#0ECB81]/30 rounded-xl text-xs text-[#0ECB81] font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{telegramFeedback}</span>
                </div>
              )}

              <form onSubmit={handleSaveTelegramChannel} className="space-y-4 text-xs">
                {/* Channel Name, Channel ID, Posts Per Day, Mode Toggle */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  {/* Channel Title / Name */}
                  <div>
                    <label className="block text-xs font-bold text-gray-300 mb-1.5">
                      {lang === 'ar' ? 'اسم القناة' : 'Channel Name'}
                    </label>
                    <input
                      type="text"
                      required
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      placeholder="e.g. SUPER VIP"
                      className="w-full px-3.5 py-2.5 bg-[#121418] border border-[#2b313a] rounded-xl text-white font-bold text-xs focus:border-yellow-400"
                    />
                  </div>

                  {/* Channel ID input */}
                  <div>
                    <label className="block text-xs font-bold text-gray-300 mb-1.5">
                      {lang === 'ar' ? 'معرف القناة (Channel ID)' : 'Telegram Channel ID (Chat ID)'}
                    </label>
                    <input
                      type="text"
                      required
                      value={editTgChatId}
                      onChange={(e) => setEditTgChatId(e.target.value.trim())}
                      placeholder="-1004441403389"
                      className="w-full px-3.5 py-2.5 bg-[#121418] border border-[#2b313a] rounded-xl text-yellow-400 font-mono font-bold text-xs focus:border-yellow-400"
                    />
                  </div>

                  {/* Number of posts per day */}
                  <div>
                    <label className="block text-xs font-bold text-gray-300 mb-1.5">
                      {lang === 'ar' ? 'عدد المنشورات باليوم' : 'Posts Per Day'}
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="50"
                      required
                      value={editPostsPerDay}
                      onChange={(e) => setEditPostsPerDay(parseInt(e.target.value, 10) || 5)}
                      className="w-full px-3.5 py-2.5 bg-[#121418] border border-[#2b313a] rounded-xl text-white font-mono text-xs focus:border-yellow-400"
                    />
                  </div>

                  {/* Toggle: MANUAL / AUTO */}
                  <div>
                    <label className="block text-xs font-bold text-gray-300 mb-1.5">
                      {lang === 'ar' ? 'وضع النشر (MANUAL / AUTO)' : 'Posting Mode'}
                    </label>
                    <div className="flex bg-[#121418] p-1 rounded-xl border border-[#2b313a]">
                      <button
                        type="button"
                        onClick={() => setEditChannelMode('AUTO')}
                        className={`flex-1 py-1.5 rounded-lg font-bold text-xs transition-all ${
                          editChannelMode === 'AUTO'
                            ? 'bg-[#0ECB81] text-black shadow-sm'
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        ⚡ AUTO
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditChannelMode('MANUAL')}
                        className={`flex-1 py-1.5 rounded-lg font-bold text-xs transition-all ${
                          editChannelMode === 'MANUAL'
                            ? 'bg-yellow-400 text-black shadow-sm'
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        ✋ MANUAL
                      </button>
                    </div>
                  </div>
                </div>

                {/* Status: Connected or Not + Test Connection Button */}
                <div className="p-4 bg-[#121418] rounded-2xl border border-[#2b313a] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-gray-300">
                      {lang === 'ar' ? 'حالة اتصال القناة بالبوت:' : 'Channel Bot Connection Status:'}
                    </span>
                    {channelConnStatus ? (
                      channelConnStatus.ok ? (
                        <span className="px-2.5 py-1 rounded-full bg-[#0ECB81]/15 text-[#0ECB81] font-bold text-xs border border-[#0ECB81]/30 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{lang === 'ar' ? 'متصل بنجاح' : 'Connected'}</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full bg-red-500/15 text-red-400 font-bold text-xs border border-red-500/30 flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>{lang === 'ar' ? 'غير متصل' : 'Not Connected'}</span>
                        </span>
                      )
                    ) : (
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${
                        activeEditingChannel?.isConnected
                          ? 'bg-[#0ECB81]/15 text-[#0ECB81] border-[#0ECB81]/30'
                          : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30'
                      }`}>
                        <span className={`w-2 h-2 rounded-full ${activeEditingChannel?.isConnected ? 'bg-[#0ECB81]' : 'bg-yellow-400'}`}></span>
                        <span>{activeEditingChannel?.isConnected ? 'Connected' : 'Ready (Click Test)'}</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {channelConnStatus?.message && (
                      <span className="text-[11px] text-gray-400 italic max-w-xs truncate">
                        {channelConnStatus.message}
                      </span>
                    )}
                    <button
                      type="button"
                      disabled={testingChannelConn}
                      onClick={handleTestChannelConnection}
                      className="px-4 py-2 bg-[#2b313a] hover:bg-[#38414e] text-yellow-400 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${testingChannelConn ? 'animate-spin' : ''}`} />
                      <span>{testingChannelConn ? 'Testing...' : (lang === 'ar' ? 'اختبار الاتصال بالقناة' : 'Test Connection')}</span>
                    </button>
                  </div>
                </div>

                {/* Pricing, Duration, Win Rate, Trades */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  {/* Price */}
                  <div>
                    <label className="block text-xs font-bold text-gray-300 mb-1.5">
                      Subscription Price ($ USDT)
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      disabled={selectedChannelIdForEdit === 'free'}
                      value={selectedChannelIdForEdit === 'free' ? 0 : editPrice}
                      onChange={(e) => setEditPrice(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 bg-[#121418] border border-[#2b313a] rounded-xl text-white font-mono font-bold text-sm focus:border-yellow-400 disabled:opacity-60"
                    />
                  </div>

                  {/* Duration */}
                  <div>
                    <label className="block text-xs font-bold text-gray-300 mb-1.5">
                      Duration (Days)
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={editDuration}
                      onChange={(e) => setEditDuration(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 bg-[#121418] border border-[#2b313a] rounded-xl text-white font-mono text-sm focus:border-yellow-400"
                    />
                  </div>

                  {/* Win Rate */}
                  <div>
                    <label className="block text-xs font-bold text-gray-300 mb-1.5">
                      Win Rate Display (e.g. 96.8%)
                    </label>
                    <input
                      type="text"
                      required
                      value={editWinRate}
                      onChange={(e) => setEditWinRate(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-[#121418] border border-[#2b313a] rounded-xl text-white font-mono text-sm focus:border-yellow-400"
                    />
                  </div>

                  {/* Total Trades */}
                  <div>
                    <label className="block text-xs font-bold text-gray-300 mb-1.5">
                      Total Signals Count
                    </label>
                    <input
                      type="number"
                      required
                      value={editTrades}
                      onChange={(e) => setEditTrades(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 bg-[#121418] border border-[#2b313a] rounded-xl text-white font-mono text-sm focus:border-yellow-400"
                    />
                  </div>
                </div>

                {/* Invite Link */}
                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1.5">
                    Telegram Channel Fallback Private Invite Link (t.me/+...)
                  </label>
                  <input
                    type="text"
                    required
                    value={editInvite}
                    onChange={(e) => setEditInvite(e.target.value)}
                    placeholder="https://t.me/+..."
                    className="w-full px-3.5 py-2.5 bg-[#121418] border border-[#2b313a] rounded-xl text-white font-mono text-xs focus:border-yellow-400 text-yellow-400"
                  />
                  <span className="text-[10px] text-gray-500 mt-1 block">
                    {lang === 'ar' ? 'يتم توليد رابط دعوة وحيد الاستخدام تلقائياً عند الاشتراك وحفظه في telegramInvites' : 'A single-use link (member_limit: 1) is automatically created and logged upon subscription.'}
                  </span>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1.5">
                    Channel Description & Bullet Points
                  </label>
                  <textarea
                    rows={2}
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    className="w-full p-3 bg-[#121418] border border-[#2b313a] rounded-xl text-white text-xs focus:border-yellow-400"
                  />
                </div>

                {/* Gallery Proof Images Manager */}
                <div className="p-4 bg-[#121418] rounded-2xl border border-[#2b313a] space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <label className="text-xs font-bold text-gray-300">
                      Proof Screenshots Gallery ({editProofImages.length} images)
                    </label>
                    <div className="relative inline-block">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleUploadProofImageFile}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <button
                        type="button"
                        className="px-3 py-1.5 bg-[#2b313a] hover:bg-[#38414e] text-white rounded-lg text-xs font-bold flex items-center gap-1.5"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload Screenshot</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newProofImageUrl}
                      onChange={(e) => setNewProofImageUrl(e.target.value)}
                      placeholder="Or paste direct image URL (https://...)"
                      className="flex-1 px-3 py-2 bg-[#181a20] border border-[#2b313a] rounded-xl text-white text-xs"
                    />
                    <button
                      type="button"
                      onClick={handleAddProofImage}
                      className="px-4 py-2 bg-[#2b313a] hover:bg-[#39424e] text-white font-bold rounded-xl text-xs"
                    >
                      Add URL
                    </button>
                  </div>

                  {/* Thumbnail Previews */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 pt-2">
                    {editProofImages.map((imgUrl, idx) => (
                      <div key={idx} className="relative group rounded-xl overflow-hidden border border-[#2b313a] aspect-video bg-black/40">
                        <img src={imgUrl} alt="Proof" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => handleRemoveProofImage(idx)}
                          className="absolute top-1 right-1 w-6 h-6 rounded-md bg-red-600/90 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-[#F0B90B] hover:bg-[#dfaa07] text-black font-black rounded-xl text-xs shadow-md transition-all flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>Save Channel Settings</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Subscribers Table with Live Countdown & Actions */}
            <div className="bg-[#181a20] border border-[#2b313a] rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#2b313a]">
                <div>
                  <h3 className="text-base font-black text-white flex items-center gap-2">
                    <Users className="w-4 h-4 text-yellow-400" />
                    <span>{lang === 'ar' ? 'سجل المشتركين الفعليين' : 'Active Subscribers Roster'}</span>
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {lang === 'ar'
                      ? 'مراقبة المشتركين بالوقت الحي، تمديد الاشتراك +5 أيام أو إلغاء العضوية، واكتشاف الاشتراكات المنتهية تلقائياً.'
                      : 'Live countdowns, extend duration +5 days or kick subscribers. Auto-flags expired accounts.'}
                  </p>
                </div>

                {expiredSubsCount > 0 && (
                  <div className="px-3 py-1 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>{expiredSubsCount} Subscription(s) Expired</span>
                  </div>
                )}
              </div>

              {telegramSubscriptions.length === 0 ? (
                <div className="py-12 text-center text-xs text-gray-500">
                  {lang === 'ar' ? 'لا يوجد مشتركون في القنوات حتى الآن.' : 'No active telegram subscribers yet.'}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-start">
                    <thead>
                      <tr className="border-b border-[#262c35] text-gray-400 font-bold">
                        <th className="py-3 px-3">Subscriber Email</th>
                        <th className="py-3 px-3">Channel Tier</th>
                        <th className="py-3 px-3">Start Date</th>
                        <th className="py-3 px-3">End Date</th>
                        <th className="py-3 px-3">Live Countdown</th>
                        <th className="py-3 px-3">Status</th>
                        <th className="py-3 px-3 text-end">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#222832]">
                      {telegramSubscriptions.map((sub) => {
                        const isExpired = new Date(sub.endDate).getTime() < currentTime || sub.status === 'expired';
                        return (
                          <tr key={sub.id} className="hover:bg-[#1f242c]/50">
                            <td className="py-3 px-3 font-bold text-white">
                              {sub.userEmail}
                            </td>
                            <td className="py-3 px-3 font-bold">
                              <span className={`px-2 py-0.5 rounded-md ${
                                sub.channelId === 'super_vip'
                                  ? 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30'
                                  : sub.channelId === 'vip'
                                  ? 'bg-[#0ECB81]/15 text-[#0ECB81] border border-[#0ECB81]/30'
                                  : 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                              }`}>
                                {sub.channelTitle}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-gray-400">
                              {new Date(sub.startDate).toLocaleDateString()}
                            </td>
                            <td className="py-3 px-3 text-gray-400">
                              {new Date(sub.endDate).toLocaleDateString()}
                            </td>
                            <td className="py-3 px-3 font-mono font-bold text-yellow-400">
                              {formatSubCountdown(sub.endDate)}
                            </td>
                            <td className="py-3 px-3">
                              {isExpired ? (
                                <span className="px-2.5 py-0.5 rounded-lg bg-red-500/15 text-red-400 font-bold text-[10px] border border-red-500/30">
                                  Expired
                                </span>
                              ) : sub.status === 'active' ? (
                                <span className="px-2.5 py-0.5 rounded-lg bg-[#0ECB81]/15 text-[#0ECB81] font-bold text-[10px] border border-[#0ECB81]/30">
                                  Active
                                </span>
                              ) : (
                                <span className="px-2.5 py-0.5 rounded-lg bg-gray-600/20 text-gray-400 font-bold text-[10px]">
                                  Cancelled
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-3 text-end whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (!sub.id) return;
                                    await extendTelegramSubscription(sub.id, 5);
                                  }}
                                  className="px-2.5 py-1 bg-[#2b313a] hover:bg-[#38414e] text-yellow-400 font-bold rounded-lg text-xs transition-colors"
                                  title="Extend membership by 5 days"
                                >
                                  +5 Days
                                </button>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (!sub.id) return;
                                    if (window.confirm(`Kick / Cancel subscription for ${sub.userEmail}?`)) {
                                      await kickTelegramSubscription(sub.id);
                                    }
                                  }}
                                  className="px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold rounded-lg text-xs border border-red-500/30 transition-colors"
                                  title="Kick or terminate membership"
                                >
                                  Kick
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= TAB 3.5: TELEGRAM AUTO POSTER ================= */}
        {activeTab === 'AUTO_POSTER' && (
          <TelegramAutoPoster lang={lang} adminUsername={activeAdminName} />
        )}

        {/* ================= TAB 4: BINARY FULL ADMIN CONTROL ================= */}
        {activeTab === 'BINARY' && (
          <div className="space-y-6">
            {/* Binary Settings Panel */}
            <div className="bg-[#181a20] border border-[#2b313a] rounded-3xl p-6 shadow-xl space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#2b313a]">
                <div>
                  <h2 className="text-lg font-black text-white flex items-center gap-2">
                    <Zap className="w-5 h-5 text-yellow-400" />
                    <span>{lang === 'ar' ? 'إعدادات الخيارات الثنائية (UP/DOWN)' : 'Binary Trading Master Controls'}</span>
                  </h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {lang === 'ar'
                      ? 'التحكم المباشر في نسبة الربح 10-100% التي تظهر على أزرار التداول، والحد الأدنى والأقصى للصفقة.'
                      : 'Controls the live UP/DOWN profit % on the trading floor, trade limits, and individual coin rates.'}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {/* Enable / Disable Binary Toggle */}
                  <button
                    type="button"
                    onClick={() => setBinaryEnabled(!binaryEnabled)}
                    className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all ${
                      binaryEnabled
                        ? 'bg-[#0ECB81] text-black shadow-lg shadow-[#0ECB81]/20'
                        : 'bg-red-500 text-white shadow-lg shadow-red-500/20'
                    }`}
                  >
                    <span>{binaryEnabled ? '✓ BINARY ENABLED' : '✕ BINARY DISABLED'}</span>
                  </button>
                </div>
              </div>

              {binaryFeedback && (
                <div className="p-3 bg-[#0ECB81]/10 border border-[#0ECB81]/30 rounded-xl text-xs text-[#0ECB81] font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{binaryFeedback}</span>
                </div>
              )}

              <form onSubmit={handleSaveBinarySettings} className="space-y-6 text-xs">
                {/* MODULE 1: Dynamic Payout Rate Control (RTP: 10% - 95%) */}
                <div className="p-5 bg-[#121418] rounded-2xl border border-[#2b313a] space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-white">
                          {lang === 'ar' ? '1. التحكم في نسبة العائد الديناميكية (RTP)' : '1. Dynamic Payout Rate Control (RTP)'}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-yellow-500/15 border border-yellow-500/30 text-yellow-400 font-bold text-[10px]">
                          10% - 95%
                        </span>
                      </div>
                      <span className="text-[11px] text-gray-400 block mt-1">
                        {lang === 'ar' 
                          ? 'تحدد نسبة العائد المتوقعة إحصائياً للمتداولين على منصة التداول والخيارات الثنائية.' 
                          : 'Defines the statistical expected payout/return percentage (RTP) applied to game result calculations.'}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 bg-[#181a20] px-3 py-1.5 rounded-xl border border-[#2b313a]">
                        <span className="text-gray-400 text-xs font-bold">RTP:</span>
                        <input
                          type="number"
                          min="10"
                          max="95"
                          step="1"
                          value={payoutRate}
                          onChange={(e) => {
                            const val = Math.min(95, Math.max(10, Number(e.target.value) || 10));
                            setPayoutRate(val);
                            setBinaryGlobalProfit(val);
                          }}
                          className="w-14 bg-transparent text-yellow-400 font-mono text-base font-black text-center focus:outline-none"
                        />
                        <span className="text-yellow-400 font-black text-xs">%</span>
                      </div>
                    </div>
                  </div>

                  {/* Range Slider */}
                  <div className="space-y-2">
                    <input
                      type="range"
                      min="10"
                      max="95"
                      step="1"
                      value={payoutRate}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setPayoutRate(val);
                        setBinaryGlobalProfit(val);
                      }}
                      className="w-full h-2.5 bg-[#2b313a] rounded-lg appearance-none cursor-pointer accent-[#F0B90B]"
                    />
                    <div className="flex justify-between text-[11px] text-gray-500 font-mono">
                      <span>10% (Min)</span>
                      <span>25%</span>
                      <span>50%</span>
                      <span>75%</span>
                      <span>85% (TikSup Default)</span>
                      <span>95% (Max)</span>
                    </div>
                  </div>

                  {/* Visual Bar: Player Return vs House Theoretical Edge */}
                  <div className="space-y-1.5">
                    <div className="h-6 rounded-lg overflow-hidden flex border border-[#2b313a] text-[10px] font-black">
                      <div 
                        className="bg-[#0ECB81] text-black flex items-center justify-center transition-all px-2 overflow-hidden whitespace-nowrap"
                        style={{ width: `${payoutRate}%` }}
                      >
                        <span>Player RTP: {payoutRate}%</span>
                      </div>
                      <div 
                        className="bg-[#F6465D] text-white flex items-center justify-center transition-all px-2 overflow-hidden whitespace-nowrap"
                        style={{ width: `${100 - payoutRate}%` }}
                      >
                        <span>House Edge: {100 - payoutRate}%</span>
                      </div>
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-400">
                      <span>Expected Player Return: <strong className="text-[#0ECB81]">{payoutRate}%</strong></span>
                      <span>Expected House Profit: <strong className="text-red-400">{100 - payoutRate}%</strong></span>
                    </div>
                  </div>

                  {/* Quick Preset Buttons */}
                  <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[#222832]">
                    <span className="text-[11px] text-gray-400 font-bold">{lang === 'ar' ? 'خيارات سريعة:' : 'Quick Presets:'}</span>
                    <button
                      type="button"
                      onClick={() => { setPayoutRate(25); setBinaryGlobalProfit(25); }}
                      className="px-2.5 py-1 bg-[#181a20] hover:bg-[#2b313a] border border-[#2b313a] hover:border-yellow-400 rounded-lg text-[11px] text-gray-300 font-semibold transition-all"
                    >
                      25% (High Edge)
                    </button>
                    <button
                      type="button"
                      onClick={() => { setPayoutRate(50); setBinaryGlobalProfit(50); }}
                      className="px-2.5 py-1 bg-[#181a20] hover:bg-[#2b313a] border border-[#2b313a] hover:border-yellow-400 rounded-lg text-[11px] text-gray-300 font-semibold transition-all"
                    >
                      50% (Aggressive)
                    </button>
                    <button
                      type="button"
                      onClick={() => { setPayoutRate(75); setBinaryGlobalProfit(75); }}
                      className="px-2.5 py-1 bg-[#181a20] hover:bg-[#2b313a] border border-[#2b313a] hover:border-yellow-400 rounded-lg text-[11px] text-gray-300 font-semibold transition-all"
                    >
                      75% (Moderate)
                    </button>
                    <button
                      type="button"
                      onClick={() => { setPayoutRate(85); setBinaryGlobalProfit(85); }}
                      className="px-2.5 py-1 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/40 text-yellow-400 rounded-lg text-[11px] font-bold transition-all"
                    >
                      85% (TikSup Default)
                    </button>
                    <button
                      type="button"
                      onClick={() => { setPayoutRate(95); setBinaryGlobalProfit(95); }}
                      className="px-2.5 py-1 bg-[#181a20] hover:bg-[#2b313a] border border-[#2b313a] hover:border-yellow-400 rounded-lg text-[11px] text-gray-300 font-semibold transition-all"
                    >
                      95% (Player Favor)
                    </button>
                  </div>
                </div>

                {/* MODULE 2: Risk Mode Engine (House Outcome Control) */}
                <div className="p-5 bg-[#121418] rounded-2xl border border-[#2b313a] space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-white">
                          {lang === 'ar' ? '2. محرك المخاطر والتحكم في نتيجة الجولة (Risk Mode Engine)' : '2. Risk Mode Engine (House Outcome Control)'}
                        </span>
                        <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                          riskMode === 'random' ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30' :
                          riskMode === 'force_win' ? 'bg-[#0ECB81]/15 text-[#0ECB81] border border-[#0ECB81]/30' :
                          riskMode === 'force_lose' ? 'bg-red-500/15 text-red-400 border border-red-500/30' :
                          'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30'
                        }`}>
                          Active: {riskMode.toUpperCase().replace('_', ' ')}
                        </span>
                      </div>
                      <span className="text-[11px] text-gray-400 block mt-1">
                        {lang === 'ar' 
                          ? 'اختر أحد أوضاع التشغيل الأربعة للتحكم المباشر في تسوية الصفقات والجولات.' 
                          : 'Select one of four operating modes to govern outcome generation across interactive games and binary rounds.'}
                      </span>
                    </div>
                  </div>

                  {/* Mode Selector Cards Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* Mode A: Random */}
                    <button
                      type="button"
                      onClick={() => setRiskMode('random')}
                      className={`p-4 rounded-xl border text-start transition-all relative flex flex-col justify-between ${
                        riskMode === 'random'
                          ? 'bg-blue-500/10 border-blue-500 shadow-md shadow-blue-500/10'
                          : 'bg-[#181a20] border-[#2b313a] hover:border-gray-500'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 font-extrabold text-[10px]">
                            Mode A
                          </span>
                          <span className="text-[10px] text-gray-400 font-bold">Standard RNG</span>
                        </div>
                        <div className="text-white font-extrabold text-xs mb-1">
                          {lang === 'ar' ? 'عشوائي عادل (Random)' : 'Random (Fair RNG)'}
                        </div>
                        <p className="text-[11px] text-gray-400 leading-snug">
                          {lang === 'ar' 
                            ? 'تنفيذ عادل وحيادي مستند إلى حركة السعر الفعلية ونسبة الـ RTP المحددة.' 
                            : 'Standard mathematical RNG execution constrained by market price and defined payout rate.'}
                        </p>
                      </div>
                      {riskMode === 'random' && (
                        <div className="mt-3 flex items-center gap-1 text-blue-400 text-[11px] font-bold">
                          <Check className="w-3.5 h-3.5" />
                          <span>Active Mode</span>
                        </div>
                      )}
                    </button>

                    {/* Mode B: Force Win */}
                    <button
                      type="button"
                      onClick={() => setRiskMode('force_win')}
                      className={`p-4 rounded-xl border text-start transition-all relative flex flex-col justify-between ${
                        riskMode === 'force_win'
                          ? 'bg-[#0ECB81]/10 border-[#0ECB81] shadow-md shadow-[#0ECB81]/10'
                          : 'bg-[#181a20] border-[#2b313a] hover:border-gray-500'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="px-2 py-0.5 rounded bg-[#0ECB81]/20 text-[#0ECB81] font-extrabold text-[10px]">
                            Mode B
                          </span>
                          <span className="text-[10px] text-[#0ECB81] font-bold">100% Win Override</span>
                        </div>
                        <div className="text-white font-extrabold text-xs mb-1">
                          {lang === 'ar' ? 'فوز مضمون (Force Win)' : 'Force Win (100% Win)'}
                        </div>
                        <p className="text-[11px] text-gray-400 leading-snug">
                          {lang === 'ar' 
                            ? 'نتيجة محسومة لصالح العميل: يفوز اللاعب بجميع الصفقات تلقائياً.' 
                            : 'Rigged outcome: player always wins the round. Overrides price ticks for guaranteed wins.'}
                        </p>
                      </div>
                      {riskMode === 'force_win' && (
                        <div className="mt-3 flex items-center gap-1 text-[#0ECB81] text-[11px] font-bold">
                          <Check className="w-3.5 h-3.5" />
                          <span>Active Mode</span>
                        </div>
                      )}
                    </button>

                    {/* Mode C: Force Lose */}
                    <button
                      type="button"
                      onClick={() => setRiskMode('force_lose')}
                      className={`p-4 rounded-xl border text-start transition-all relative flex flex-col justify-between ${
                        riskMode === 'force_lose'
                          ? 'bg-red-500/10 border-red-500 shadow-md shadow-red-500/10'
                          : 'bg-[#181a20] border-[#2b313a] hover:border-gray-500'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 font-extrabold text-[10px]">
                            Mode C
                          </span>
                          <span className="text-[10px] text-red-400 font-bold">100% Loss Override</span>
                        </div>
                        <div className="text-white font-extrabold text-xs mb-1">
                          {lang === 'ar' ? 'خسارة مضمونة (Force Lose)' : 'Force Lose (100% Loss)'}
                        </div>
                        <p className="text-[11px] text-gray-400 leading-snug">
                          {lang === 'ar' 
                            ? 'نتيجة محسومة لصالح المنصة: يخسر اللاعب جميع الصفقات لضمان أرباح الكازينو/المنصة.' 
                            : 'Rigged outcome: player always loses the round. Full house retention of all bet amounts.'}
                        </p>
                      </div>
                      {riskMode === 'force_lose' && (
                        <div className="mt-3 flex items-center gap-1 text-red-400 text-[11px] font-bold">
                          <Check className="w-3.5 h-3.5" />
                          <span>Active Mode</span>
                        </div>
                      )}
                    </button>

                    {/* Mode D: High House Edge (75% Loss) */}
                    <button
                      type="button"
                      onClick={() => setRiskMode('loss_75')}
                      className={`p-4 rounded-xl border text-start transition-all relative flex flex-col justify-between ${
                        riskMode === 'loss_75'
                          ? 'bg-yellow-500/10 border-yellow-500 shadow-md shadow-yellow-500/10'
                          : 'bg-[#181a20] border-[#2b313a] hover:border-gray-500'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-400 font-extrabold text-[10px]">
                            Mode D
                          </span>
                          <span className="text-[10px] text-yellow-400 font-bold">75% Loss / 25% Win</span>
                        </div>
                        <div className="text-white font-extrabold text-xs mb-1">
                          {lang === 'ar' ? 'حافة كازينو قصوى (75% Loss)' : 'High House Edge (75% Loss)'}
                        </div>
                        <p className="text-[11px] text-gray-400 leading-snug">
                          {lang === 'ar' 
                            ? 'خوارزمية موزونة تفرض معدل خسارة صارم بنسبة 75% وفوز 25% لتعظيم دخل المنصة.' 
                            : 'Weighted algorithm enforcing ~75% loss rate and 25% win rate for controlled house edge.'}
                        </p>
                      </div>
                      {riskMode === 'loss_75' && (
                        <div className="mt-3 flex items-center gap-1 text-yellow-400 text-[11px] font-bold">
                          <Check className="w-3.5 h-3.5" />
                          <span>Active Mode</span>
                        </div>
                      )}
                    </button>
                  </div>

                  {/* Warning Callout for Forced Modes */}
                  {(riskMode === 'force_win' || riskMode === 'force_lose') && (
                    <div className="p-3.5 rounded-xl bg-yellow-500/10 border border-yellow-500/40 text-yellow-400 flex items-start gap-2.5">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                      <div className="text-xs">
                        {riskMode === 'force_win' ? (
                          <span>
                            <strong>{lang === 'ar' ? 'تنبيه عالي الأهمية:' : 'HIGH PRIORITY NOTICE:'}</strong>{' '}
                            {lang === 'ar' 
                              ? 'وضع "فوز مضمون" مفعل حالياً. سيتم احتساب جميع الصفقات كفوز للمستخدمين حتى تقوم بتغيير هذا الوضع.'
                              : 'Mode "Force Win" is selected. All user bets will be resolved as 100% WIN until changed.'}
                          </span>
                        ) : (
                          <span>
                            <strong>{lang === 'ar' ? 'تنبيه عالي الأهمية:' : 'HIGH PRIORITY NOTICE:'}</strong>{' '}
                            {lang === 'ar' 
                              ? 'وضع "خسارة مضمونة" مفعل حالياً. سيتم احتساب جميع الصفقات كخسارة للمستخدمين واحتفاظ المنصة بالمبالغ.'
                              : 'Mode "Force Lose" is selected. All user bets will be resolved as 100% LOSS.'}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Min & Max Trade Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-[#121418] rounded-2xl border border-[#2b313a]">
                    <label className="block text-xs font-bold text-gray-300 mb-1.5">
                      {lang === 'ar' ? 'الحد الأدنى للصفقة (USDT)' : 'Minimum Trade Amount (USDT)'}
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={binaryMinTrade}
                      onChange={(e) => setBinaryMinTrade(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 bg-[#181a20] border border-[#2b313a] rounded-xl text-white font-mono font-bold text-sm focus:border-yellow-400"
                    />
                    <span className="text-[10px] text-gray-500 mt-1 block">Default: 1 USDT</span>
                  </div>

                  <div className="p-4 bg-[#121418] rounded-2xl border border-[#2b313a]">
                    <label className="block text-xs font-bold text-gray-300 mb-1.5">
                      {lang === 'ar' ? 'الحد الأقصى للصفقة (USDT)' : 'Maximum Trade Amount (USDT)'}
                    </label>
                    <input
                      type="number"
                      min="10"
                      required
                      value={binaryMaxTrade}
                      onChange={(e) => setBinaryMaxTrade(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 bg-[#181a20] border border-[#2b313a] rounded-xl text-white font-mono font-bold text-sm focus:border-yellow-400"
                    />
                    <span className="text-[10px] text-gray-500 mt-1 block">Default: 1000 USDT</span>
                  </div>
                </div>

                {/* Per Coin Override Table */}
                <div className="p-4 bg-[#121418] rounded-2xl border border-[#2b313a] space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-black text-white block">
                        {lang === 'ar' ? 'جدول تخصيص نسبة الربح لكل عملة' : 'Per-Coin Profit Override Table'}
                      </span>
                      <span className="text-[11px] text-gray-400">
                        {lang === 'ar' ? 'يمكنك تحديد نسبة ربح مخصصة لعملة معينة (تتجاوز النسبة العامة)' : 'Override the global payout for specific cryptocurrencies'}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                    {cryptoCoins.map((coin) => {
                      const override = binaryCoinOverrides[coin.symbol];
                      return (
                        <div key={coin.symbol} className="p-3 bg-[#181a20] rounded-xl border border-[#2b313a] space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-black text-white">{coin.symbol}</span>
                            <span className="text-[10px] text-gray-400">
                              {override !== undefined ? `Custom: ${override}%` : `Global (${binaryGlobalProfit}%)`}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min="10"
                              max="100"
                              placeholder={binaryGlobalProfit.toString()}
                              value={override !== undefined ? override : ''}
                              onChange={(e) => {
                                const val = e.target.value === '' ? undefined : Number(e.target.value);
                                setBinaryCoinOverrides((prev) => {
                                  const updated = { ...prev };
                                  if (val === undefined) delete updated[coin.symbol];
                                  else updated[coin.symbol] = val;
                                  return updated;
                                });
                              }}
                              className="w-full px-2 py-1 bg-[#121418] border border-[#2b313a] rounded-lg text-white font-mono text-xs focus:border-yellow-400"
                            />
                            {override !== undefined && (
                              <button
                                type="button"
                                onClick={() => {
                                  setBinaryCoinOverrides((prev) => {
                                    const updated = { ...prev };
                                    delete updated[coin.symbol];
                                    return updated;
                                  });
                                }}
                                className="p-1 text-gray-400 hover:text-red-400"
                                title="Reset to global"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isSavingBinary}
                    className="px-6 py-3 bg-[#F0B90B] hover:bg-[#dfaa07] text-black font-black rounded-xl text-xs shadow-lg transition-all"
                  >
                    {isSavingBinary 
                      ? (lang === 'ar' ? 'جارٍ الحفظ...' : 'Saving...') 
                      : (lang === 'ar' ? 'حفظ إعدادات الألعاب ونسبة المخاطر' : 'Save Game & Risk Settings')}
                  </button>
                </div>
              </form>
            </div>

            {/* All Binary Trades Live View */}
            <div className="bg-[#181a20] border border-[#2b313a] rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#2b313a]">
                <div>
                  <h3 className="text-base font-black text-white flex items-center gap-2">
                    <Clock className="w-4 h-4 text-yellow-400" />
                    <span>{lang === 'ar' ? 'سجل الصفقات الثنائية المباشرة' : 'Live Binary Trades Floor'}</span>
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {lang === 'ar'
                      ? 'مراقبة صفقات المتداولين في الوقت الفعلي مع إمكانية التحكيم اليدوي للفوز أو الخسارة.'
                      : 'Live feed of all binary contracts placed by traders with manual referee override.'}
                  </p>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Search email or coin..."
                    value={binaryTradesSearch}
                    onChange={(e) => setBinaryTradesSearch(e.target.value)}
                    className="px-3 py-1.5 bg-[#121418] border border-[#2b313a] rounded-xl text-white text-xs"
                  />
                  <select
                    value={binaryTradesFilter}
                    onChange={(e) => setBinaryTradesFilter(e.target.value as any)}
                    className="px-3 py-1.5 bg-[#121418] border border-[#2b313a] rounded-xl text-white text-xs"
                  >
                    <option value="ALL">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="WIN">WIN</option>
                    <option value="LOSS">LOSS</option>
                  </select>
                </div>
              </div>

              {filteredBinaryTrades.length === 0 ? (
                <div className="py-12 text-center text-xs text-gray-500">
                  {lang === 'ar' ? 'لا توجد صفقات مطابقة.' : 'No binary trades found.'}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-start">
                    <thead>
                      <tr className="border-b border-[#262c35] text-gray-400 font-bold">
                        <th className="py-2.5 px-3">Trade ID</th>
                        <th className="py-2.5 px-3">User</th>
                        <th className="py-2.5 px-3">Coin</th>
                        <th className="py-2.5 px-3">Direction</th>
                        <th className="py-2.5 px-3">Amount</th>
                        <th className="py-2.5 px-3">Entry Price</th>
                        <th className="py-2.5 px-3">Duration</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3 text-end">Referee Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#222832]">
                      {filteredBinaryTrades.map((tr) => (
                        <tr key={tr.id} className="hover:bg-[#1f242c]/50">
                          <td className="py-2.5 px-3 font-mono text-gray-400">
                            {tr.id ? tr.id.slice(0, 6) : '---'}
                          </td>
                          <td className="py-2.5 px-3 text-white font-bold">
                            {tr.email}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-yellow-400">
                            {tr.coin}
                          </td>
                          <td className="py-2.5 px-3 font-bold">
                            <span className={`px-2 py-0.5 rounded-md ${
                              tr.direction === 'UP'
                                ? 'bg-[#0ECB81]/15 text-[#0ECB81] border border-[#0ECB81]/30'
                                : 'bg-[#F6465D]/15 text-[#F6465D] border border-[#F6465D]/30'
                            }`}>
                              {tr.direction}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-white">
                            ${tr.amount}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-gray-300">
                            ${tr.entryPrice.toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3 text-gray-400">
                            {tr.duration}
                          </td>
                          <td className="py-2.5 px-3">
                            {tr.status === 'WIN' && (
                              <span className="px-2 py-0.5 rounded-md bg-[#0ECB81]/15 text-[#0ECB81] font-bold text-[10px]">
                                WIN (+${tr.payout})
                              </span>
                            )}
                            {tr.status === 'LOSS' && (
                              <span className="px-2 py-0.5 rounded-md bg-red-500/15 text-red-400 font-bold text-[10px]">
                                LOSS
                              </span>
                            )}
                            {tr.status === 'pending' && (
                              <span className="px-2 py-0.5 rounded-md bg-yellow-500/15 text-yellow-400 font-bold text-[10px] flex items-center gap-1 inline-flex">
                                <Clock className="w-3 h-3 animate-spin" />
                                Active
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-end whitespace-nowrap">
                            {tr.status === 'pending' ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleManualSettle(tr, 'WIN')}
                                  className="px-2 py-1 bg-[#0ECB81] hover:bg-[#0bb372] text-black font-black rounded text-[11px]"
                                >
                                  Force WIN
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleManualSettle(tr, 'LOSS')}
                                  className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white font-black rounded text-[11px]"
                                >
                                  Force LOSS
                                </button>
                              </div>
                            ) : (
                              <span className="text-[10px] text-gray-500">Settled</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= TAB 5: USERS ================= */}
        {activeTab === 'USERS' && (
          <div className="bg-[#181a20] border border-[#2b313a] rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#2b313a]">
              <div>
                <h2 className="text-base font-black text-white">{lang === 'ar' ? 'إدارة المتداولين' : 'Traders Directory'}</h2>
                <span className="text-xs text-gray-400">Total registered traders: {users.length}</span>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-gray-400 absolute top-2.5 left-3" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder={lang === 'ar' ? 'بحث بالاسم أو البريد...' : 'Search email or name...'}
                  className="w-full pl-9 pr-3 py-1.5 bg-[#121418] border border-[#2b313a] rounded-xl text-xs text-white"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-start">
                <thead>
                  <tr className="border-b border-[#262c35] text-gray-400 font-bold">
                    <th className="py-2.5 px-3">Name</th>
                    <th className="py-2.5 px-3">Email</th>
                    <th className="py-2.5 px-3">Wallet Balance</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">IP Address</th>
                    <th className="py-2.5 px-3 text-end">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#222832]">
                  {filteredUsers.map((u) => (
                    <tr key={u.uid} className="hover:bg-[#1f242c]/50">
                      <td className="py-2.5 px-3 font-bold text-white">
                        {u.firstName} {u.lastName}
                      </td>
                      <td className="py-2.5 px-3 text-gray-300 font-mono">
                        {u.email}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-yellow-400">
                        {u.walletBalance.toFixed(2)} USDT
                      </td>
                      <td className="py-2.5 px-3">
                        {u.isBlocked ? (
                          <span className="px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 text-[10px] font-bold">
                            Suspended
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-[#0ECB81]/15 text-[#0ECB81] text-[10px] font-bold">
                            Active
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-gray-400 text-[11px]">
                        {u.lastLoginIp || u.registrationIp || '127.0.0.1'}
                      </td>
                      <td className="py-2.5 px-3 text-end">
                        <button
                          type="button"
                          onClick={() => toggleUserBlockStatus(u.uid, u.isBlocked)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                            u.isBlocked
                              ? 'bg-[#0ECB81]/15 text-[#0ECB81] hover:bg-[#0ECB81]/25 border border-[#0ECB81]/30'
                              : 'bg-red-500/15 text-red-400 hover:bg-red-500/25 border border-red-500/30'
                          }`}
                        >
                          {u.isBlocked ? (lang === 'ar' ? 'إلغاء التجميد' : 'Unblock') : (lang === 'ar' ? 'تجميد الحساب' : 'Suspend')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================= TAB 6: MULTI-CURRENCY WALLET SYSTEM & HOLDINGS ================= */}
        {activeTab === 'WALLET' && (
          <div className="space-y-6">
            {/* Top Cards: Forms for Crediting Coin & Community Airdrop */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Form 1: Credit Any Coin to Specific User */}
              <div className="lg:col-span-6 bg-[#181a20] border border-[#2b313a] rounded-3xl p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-[#2b313a]">
                  <h2 className="text-base font-black text-white flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-yellow-400" />
                    <span>{lang === 'ar' ? 'تعديل رصيد العملات (إضافة / خصم)' : 'Modify Coin Balance (Credit / Deduct)'}</span>
                  </h2>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#0ECB81]/15 text-[#0ECB81] border border-[#0ECB81]/30">
                    REAL WALLET
                  </span>
                </div>

                {/* Action Mode Toggle */}
                <div className="grid grid-cols-2 gap-2 p-1 bg-[#121418] border border-[#2b313a] rounded-xl text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setWalletActionType('ADD')}
                    className={`py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                      walletActionType === 'ADD'
                        ? 'bg-[#0ECB81] text-black shadow-md'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{lang === 'ar' ? 'إضافة رصيد (+)' : 'Credit / Add (+)'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setWalletActionType('DEDUCT')}
                    className={`py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                      walletActionType === 'DEDUCT'
                        ? 'bg-red-600 text-white shadow-md'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <Minus className="w-3.5 h-3.5" />
                    <span>{lang === 'ar' ? 'خصم رصيد (-)' : 'Deduct / Remove (-)'}</span>
                  </button>
                </div>

                {walletFeedback && (
                  <div className={`p-3 rounded-xl text-xs font-bold ${
                    walletFeedback.type === 'success'
                      ? 'bg-[#0ECB81]/10 text-[#0ECB81] border border-[#0ECB81]/30'
                      : 'bg-red-500/10 text-red-400 border border-red-500/30'
                  }`}>
                    {walletFeedback.message}
                  </div>
                )}

                <form onSubmit={handleCreditWallet} className="space-y-3.5 text-xs">
                  <div>
                    <label className="block font-bold text-gray-300 mb-1.5">{lang === 'ar' ? 'اختر المتداول' : 'Select Trader'}</label>
                    <select
                      required
                      value={selectedUserForCredit}
                      onChange={(e) => setSelectedUserForCredit(e.target.value)}
                      className="w-full px-3 py-2.5 bg-[#121418] border border-[#2b313a] rounded-xl text-white text-xs"
                    >
                      <option value="">-- Choose Trader --</option>
                      {users.map((u) => (
                        <option key={u.uid} value={u.uid}>
                          {u.firstName} {u.lastName} ({u.email})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-gray-300 mb-1.5">{lang === 'ar' ? 'اختر العملة' : 'Select Coin'}</label>
                      <select
                        value={selectedCoinForCredit}
                        onChange={(e) => setSelectedCoinForCredit(e.target.value)}
                        className="w-full px-3 py-2.5 bg-[#121418] border border-[#2b313a] rounded-xl text-white font-mono font-bold text-xs"
                      >
                        <option value="USDT">USDT (Tether USD)</option>
                        <option value="BTC">BTC (Bitcoin)</option>
                        <option value="ETH">ETH (Ethereum)</option>
                        <option value="SOL">SOL (Solana)</option>
                        <option value="BNB">BNB (BNB Chain)</option>
                        <option value="XRP">XRP (Ripple)</option>
                        <option value="DOGE">DOGE (Dogecoin)</option>
                        <option value="AVAX">AVAX (Avalanche)</option>
                        <option value="ADA">ADA (Cardano)</option>
                        <option value="PEPE">PEPE (Pepe)</option>
                        <option value="SHIB">SHIB (Shiba Inu)</option>
                        <option value="LINK">LINK (Chainlink)</option>
                        <option value="NEAR">NEAR (NEAR Protocol)</option>
                        <option value="TON">TON (Toncoin)</option>
                        <option value="SUI">SUI (Sui Network)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-gray-300 mb-1.5">{lang === 'ar' ? 'المبلغ' : 'Amount'}</label>
                      <input
                        type="number"
                        step="any"
                        min="0.00000001"
                        required
                        value={creditAmount}
                        onChange={(e) => setCreditAmount(e.target.value)}
                        placeholder="e.g. 0.05 or 500"
                        className="w-full px-3 py-2.5 bg-[#121418] border border-[#2b313a] rounded-xl text-white font-mono text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-gray-300 mb-1.5">{lang === 'ar' ? 'سبب الإيداع / ملاحظات' : 'Reason / Reference'}</label>
                    <input
                      type="text"
                      value={creditReason}
                      onChange={(e) => setCreditReason(e.target.value)}
                      placeholder="e.g. VIP Deposit / Bank Wire / Bonus"
                      className="w-full px-3 py-2.5 bg-[#121418] border border-[#2b313a] rounded-xl text-white text-xs"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={creditLoading}
                    className={`w-full py-3 disabled:bg-gray-700 font-black rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-2 ${
                      walletActionType === 'ADD'
                        ? 'bg-[#0ECB81] hover:bg-[#0bb372] text-black'
                        : 'bg-red-600 hover:bg-red-700 text-white'
                    }`}
                  >
                    {walletActionType === 'ADD' ? <Plus className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
                    <span>
                      {creditLoading
                        ? 'Processing...'
                        : walletActionType === 'ADD'
                          ? (lang === 'ar' ? `إضافة رصيد ${selectedCoinForCredit} الآن` : `Credit ${selectedCoinForCredit} to Trader`)
                          : (lang === 'ar' ? `خصم رصيد ${selectedCoinForCredit} الآن` : `Deduct ${selectedCoinForCredit} from Trader`)}
                    </span>
                  </button>
                </form>
              </div>

              {/* Form 2: Community Airdrop (Airdrop any coin to ALL users) */}
              <div className="lg:col-span-6 bg-[#181a20] border border-[#2b313a] rounded-3xl p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-[#2b313a]">
                  <h2 className="text-base font-black text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-yellow-400" />
                    <span>{lang === 'ar' ? 'إيردروب جماعي لجميع المتداولين' : 'Community Airdrop (All Traders)'}</span>
                  </h2>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-400 border border-yellow-500/30">
                    AIRDROP ENGINE
                  </span>
                </div>

                {airdropFeedback && (
                  <div className={`p-3 rounded-xl text-xs font-bold ${
                    airdropFeedback.type === 'success'
                      ? 'bg-[#0ECB81]/10 text-[#0ECB81] border border-[#0ECB81]/30'
                      : 'bg-red-500/10 text-red-400 border border-red-500/30'
                  }`}>
                    {airdropFeedback.message}
                  </div>
                )}

                <form onSubmit={handleAirdropAll} className="space-y-3.5 text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-gray-300 mb-1.5">{lang === 'ar' ? 'عملة الإيردروب' : 'Airdrop Coin'}</label>
                      <select
                        value={airdropCoin}
                        onChange={(e) => setAirdropCoin(e.target.value)}
                        className="w-full px-3 py-2.5 bg-[#121418] border border-[#2b313a] rounded-xl text-white font-mono font-bold text-xs"
                      >
                        <option value="USDT">USDT</option>
                        <option value="SOL">SOL (Solana)</option>
                        <option value="PEPE">PEPE</option>
                        <option value="DOGE">DOGE</option>
                        <option value="BTC">BTC</option>
                        <option value="ETH">ETH</option>
                        <option value="BNB">BNB</option>
                        <option value="XRP">XRP</option>
                        <option value="TON">TON</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-gray-300 mb-1.5">{lang === 'ar' ? 'الكمية لكل متداول' : 'Amount Per Trader'}</label>
                      <input
                        type="number"
                        step="any"
                        min="0.00000001"
                        required
                        value={airdropAmount}
                        onChange={(e) => setAirdropAmount(e.target.value)}
                        placeholder="e.g. 50"
                        className="w-full px-3 py-2.5 bg-[#121418] border border-[#2b313a] rounded-xl text-white font-mono text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-gray-300 mb-1.5">{lang === 'ar' ? 'سبب الإيردروب / الحملة' : 'Airdrop Campaign / Notes'}</label>
                    <input
                      type="text"
                      value={airdropReason}
                      onChange={(e) => setAirdropReason(e.target.value)}
                      placeholder="e.g. Launch Bonus / Loyalty Reward"
                      className="w-full px-3 py-2.5 bg-[#121418] border border-[#2b313a] rounded-xl text-white text-xs"
                    />
                  </div>

                  <div className="p-3 bg-[#121418] rounded-xl border border-[#262c35] text-[11px] text-gray-400">
                    {lang === 'ar'
                      ? `سيتم توزيع المبلغ فوراً على كافة المسجلين (${users.length} متداول) وإضافته لحافظاتهم الحقيقية.`
                      : `Will automatically credit ${airdropAmount || '0'} ${airdropCoin} into real balances for all ${users.length} registered users.`}
                  </div>

                  <button
                    type="submit"
                    disabled={airdropLoading || !airdropAmount}
                    className="w-full py-3 bg-[#F0B90B] hover:bg-[#dfaa07] disabled:bg-gray-700 text-black font-black rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>{airdropLoading ? 'Broadcasting...' : (lang === 'ar' ? `تنفيذ الإيردروب لجميع المتداولين (${users.length})` : `Execute Airdrop to All ${users.length} Users`)}</span>
                  </button>
                </form>
              </div>
            </div>

            {/* Section 2: All Users Multi-Currency Holdings Live Table */}
            <div className="bg-[#181a20] border border-[#2b313a] rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#2b313a]">
                <div>
                  <h2 className="text-base font-black text-white flex items-center gap-2">
                    <Users className="w-5 h-5 text-yellow-400" />
                    <span>{lang === 'ar' ? 'أرصدة ومحافظ المتداولين المتعددة' : 'All Users Multi-Currency Holdings'}</span>
                  </h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {lang === 'ar' ? 'عرض حي لجميع ممتلكات المتداولين في كافة العملات المشفرة مع القيمة الإجمالية بالدولار.' : 'Real-time overview of all trader coin balances (BTC, ETH, USDT, SOL, etc.) and portfolio value.'}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="relative w-64">
                    <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={holdingsSearch}
                      onChange={(e) => setHoldingsSearch(e.target.value)}
                      placeholder={lang === 'ar' ? 'بحث عن متداول...' : 'Search trader...'}
                      className="w-full ps-9 pe-3 py-1.5 bg-[#121418] border border-[#2b313a] rounded-xl text-xs text-white"
                    />
                  </div>
                  <button
                    onClick={loadHoldings}
                    className="p-2 bg-[#2b313a] hover:bg-[#38414e] text-white rounded-xl transition-colors"
                    title="Refresh Holdings"
                  >
                    <RefreshCw className={`w-4 h-4 ${loadingHoldings ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-start">
                  <thead>
                    <tr className="border-b border-[#262c35] text-gray-400 font-bold">
                      <th className="py-2.5 px-3">{lang === 'ar' ? 'المتداول' : 'Trader'}</th>
                      <th className="py-2.5 px-3">USDT</th>
                      <th className="py-2.5 px-3">BTC</th>
                      <th className="py-2.5 px-3">ETH</th>
                      <th className="py-2.5 px-3">SOL</th>
                      <th className="py-2.5 px-3">XRP</th>
                      <th className="py-2.5 px-3">DOGE</th>
                      <th className="py-2.5 px-3">{lang === 'ar' ? 'إجمالي المحفظة' : 'Portfolio Value'}</th>
                      <th className="py-2.5 px-3 text-end">{lang === 'ar' ? 'إجراء' : 'Action'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#222832]">
                    {allUsersHoldings
                      .filter((h) => {
                        const q = holdingsSearch.toLowerCase();
                        return (
                          h.user.email.toLowerCase().includes(q) ||
                          `${h.user.firstName} ${h.user.lastName}`.toLowerCase().includes(q)
                        );
                      })
                      .map((h) => (
                        <tr key={h.user.uid} className="hover:bg-[#1f242c]/50">
                          <td className="py-3 px-3">
                            <div className="font-bold text-white">{h.user.firstName} {h.user.lastName}</div>
                            <div className="text-[11px] text-gray-400 font-mono">{h.user.email}</div>
                          </td>

                          <td className="py-3 px-3 font-mono font-bold text-yellow-400">
                            ${(h.balances['USDT']?.balance ?? h.user.walletBalance ?? 0).toFixed(2)}
                          </td>

                          <td className="py-3 px-3 font-mono text-gray-200">
                            {(h.balances['BTC']?.balance || 0).toFixed(6)}
                          </td>

                          <td className="py-3 px-3 font-mono text-gray-200">
                            {(h.balances['ETH']?.balance || 0).toFixed(4)}
                          </td>

                          <td className="py-3 px-3 font-mono text-gray-200">
                            {(h.balances['SOL']?.balance || 0).toFixed(3)}
                          </td>

                          <td className="py-3 px-3 font-mono text-gray-200">
                            {(h.balances['XRP']?.balance || 0).toFixed(2)}
                          </td>

                          <td className="py-3 px-3 font-mono text-gray-200">
                            {(h.balances['DOGE']?.balance || 0).toFixed(1)}
                          </td>

                          <td className="py-3 px-3 font-mono font-black text-[#0ECB81]">
                            ${h.totalPortfolioUsdt.toLocaleString('en-US', { minimumFractionDigits: 2 })} USDT
                          </td>

                          <td className="py-3 px-3 text-end">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setSelectedUserForCredit(h.user.uid);
                                  setWalletActionType('ADD');
                                  window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                                className="px-2 py-1 bg-[#0ECB81]/15 text-[#0ECB81] hover:bg-[#0ECB81]/25 border border-[#0ECB81]/30 font-bold rounded-lg text-[10px] transition-colors"
                              >
                                {lang === 'ar' ? '+ إضافة' : '+ Credit'}
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedUserForCredit(h.user.uid);
                                  setWalletActionType('DEDUCT');
                                  window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                                className="px-2 py-1 bg-red-500/15 text-red-400 hover:bg-red-500/25 border border-red-500/30 font-bold rounded-lg text-[10px] transition-colors"
                              >
                                {lang === 'ar' ? '- خصم' : '- Deduct'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Section 3: Supported Coins Management (Add & Remove Supported Coins) */}
            <div className="bg-[#181a20] border border-[#2b313a] rounded-3xl p-6 shadow-xl space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#2b313a]">
                <div>
                  <h2 className="text-base font-black text-white flex items-center gap-2">
                    <Coins className="w-5 h-5 text-yellow-400" />
                    <span>{lang === 'ar' ? 'إدارة العملات المدعومة في المحفظة (إضافة / حذف عملات)' : 'Supported Coins Management (Add & Remove Coins)'}</span>
                  </h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {lang === 'ar'
                      ? 'العملات المتاحة للمتداولين في صفحة المحفظة /wallet مع تحديثات الأسعار اللحظية كل 10 ثوانٍ من CoinGecko / Binance.'
                      : 'Live multi-currency assets available on /wallet with real-time 10-second price tickers from CoinGecko / Binance.'}
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-yellow-400/10 text-yellow-400 border border-yellow-400/20 text-xs font-mono font-bold">
                  {supportedCoinsList.length} Active Coins
                </span>
              </div>

              {suppCoinFeedback && (
                <div className="p-3 bg-[#0ECB81]/10 border border-[#0ECB81]/30 rounded-xl text-xs text-[#0ECB81] font-bold">
                  {suppCoinFeedback}
                </div>
              )}

              {/* Add New Supported Coin Form */}
              <form onSubmit={handleAddSupportedCoin} className="p-4 bg-[#121418] border border-[#2b313a] rounded-2xl space-y-3 text-xs">
                <div className="font-bold text-white flex items-center gap-2">
                  <Plus className="w-4 h-4 text-yellow-400" />
                  <span>{lang === 'ar' ? 'إضافة عملة مدعومة جديدة للمحفظة' : 'Add New Supported Coin to Wallet'}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  <div>
                    <label className="block text-gray-400 mb-1 font-semibold">{lang === 'ar' ? 'الرمز (Symbol)' : 'Symbol'}</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. SUI or TON"
                      value={newSuppSymbol}
                      onChange={(e) => setNewSuppSymbol(e.target.value.toUpperCase())}
                      className="w-full px-3 py-2 bg-[#181a20] border border-[#2b313a] rounded-xl text-white font-mono uppercase"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-400 mb-1 font-semibold">{lang === 'ar' ? 'الاسم' : 'Name'}</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Sui Network"
                      value={newSuppName}
                      onChange={(e) => setNewSuppName(e.target.value)}
                      className="w-full px-3 py-2 bg-[#181a20] border border-[#2b313a] rounded-xl text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-400 mb-1 font-semibold">{lang === 'ar' ? 'السعر الأولي ($)' : 'Initial Price ($)'}</label>
                    <input
                      type="number"
                      step="any"
                      required
                      placeholder="e.g. 2.15"
                      value={newSuppPrice}
                      onChange={(e) => setNewSuppPrice(e.target.value)}
                      className="w-full px-3 py-2 bg-[#181a20] border border-[#2b313a] rounded-xl text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-400 mb-1 font-semibold">{lang === 'ar' ? 'معرّف CoinGecko' : 'CoinGecko ID'}</label>
                    <input
                      type="text"
                      placeholder="e.g. sui"
                      value={newSuppCgId}
                      onChange={(e) => setNewSuppCgId(e.target.value)}
                      className="w-full px-3 py-2 bg-[#181a20] border border-[#2b313a] rounded-xl text-white font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-400 mb-1 font-semibold">{lang === 'ar' ? 'رابط الأيقونة (اختياري)' : 'Icon URL (Optional)'}</label>
                    <input
                      type="url"
                      placeholder="https://...png"
                      value={newSuppIcon}
                      onChange={(e) => setNewSuppIcon(e.target.value)}
                      className="w-full px-3 py-2 bg-[#181a20] border border-[#2b313a] rounded-xl text-white text-xs"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#F0B90B] hover:bg-[#dfaa07] text-black font-black rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>{lang === 'ar' ? 'إدراج العملة في المحافظ' : 'Add Supported Coin'}</span>
                </button>
              </form>

              {/* Supported Coins Grid / List */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {supportedCoinsList.map((coin) => (
                  <div key={coin.symbol} className="p-3 bg-[#121418] border border-[#262c36] rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-[#181a20] border border-[#2b313a] p-1 flex items-center justify-center overflow-hidden shrink-0">
                        {coin.icon ? (
                          <img src={coin.icon} alt={coin.symbol} className="w-full h-full object-contain" />
                        ) : (
                          <span className="text-[10px] font-mono font-bold text-yellow-400">{coin.symbol}</span>
                        )}
                      </div>
                      <div>
                        <div className="font-bold text-white text-xs flex items-center gap-1.5">
                          <span>{coin.symbol}</span>
                          <span className="text-[10px] text-gray-400 font-normal">({coin.name})</span>
                        </div>
                        <div className="text-[11px] font-mono text-gray-300">
                          ${coin.currentPrice < 1 ? coin.currentPrice.toFixed(4) : coin.currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          <span className={`ms-1.5 text-[10px] ${coin.change24h >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                            {coin.change24h >= 0 ? `+${coin.change24h}%` : `${coin.change24h}%`}
                          </span>
                        </div>
                      </div>
                    </div>

                    {coin.symbol !== 'USDT' && (
                      <button
                        type="button"
                        onClick={() => handleDeleteSupportedCoin(coin.symbol)}
                        className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        title={`Remove ${coin.symbol}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Section 4: Administrative Wallet Audit Logs */}
            <div className="bg-[#181a20] border border-[#2b313a] rounded-3xl p-6 shadow-xl space-y-4">
              <h2 className="text-base font-black text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-yellow-400" />
                <span>{lang === 'ar' ? 'سجل العمليات الإدارية والإيداعات' : 'Administrative Wallet Audit Logs'}</span>
              </h2>

              <div className="overflow-x-auto max-h-[450px]">
                <table className="w-full text-xs text-start">
                  <thead>
                    <tr className="border-b border-[#262c35] text-gray-400 font-bold">
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">User</th>
                      <th className="py-2.5 px-3">Coin</th>
                      <th className="py-2.5 px-3">Amount</th>
                      <th className="py-2.5 px-3">New Balance</th>
                      <th className="py-2.5 px-3">Reason / Audit Trail</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#222832]">
                    {walletLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-[#1f242c]/50">
                        <td className="py-2.5 px-3 text-gray-400 font-mono text-[11px]">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-white font-bold">{log.userEmail}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-yellow-400">
                          {log.symbol || 'USDT'}
                        </td>
                        <td className={`py-2.5 px-3 font-mono font-bold ${log.amount > 0 ? 'text-[#0ECB81]' : 'text-red-400'}`}>
                          {log.amount > 0 ? `+${log.amount}` : log.amount}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-gray-200 font-bold">
                          {log.newBalance}
                        </td>
                        <td className="py-2.5 px-3 text-gray-400">{log.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 7: CRYPTO LISTING ================= */}
        {activeTab === 'CRYPTO' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 bg-[#181a20] border border-[#2b313a] rounded-3xl p-6 shadow-xl space-y-4">
              <h2 className="text-base font-black text-white flex items-center gap-2">
                <Coins className="w-4 h-4 text-yellow-400" />
                <span>{lang === 'ar' ? 'إدراج عملة رقمية جديدة' : 'List New Cryptocurrency'}</span>
              </h2>

              {cryptoFeedback && (
                <div className="p-3 bg-[#0ECB81]/10 border border-[#0ECB81]/30 rounded-xl text-xs text-[#0ECB81] font-bold">
                  {cryptoFeedback}
                </div>
              )}

              <form onSubmit={handleAddCrypto} className="space-y-3.5 text-xs">
                <div>
                  <label className="block font-bold text-gray-300 mb-1">{lang === 'ar' ? 'رمز العملة' : 'Coin Symbol'}</label>
                  <input
                    type="text"
                    required
                    value={newSymbol}
                    onChange={(e) => setNewSymbol(e.target.value.toUpperCase())}
                    placeholder="e.g. SUI"
                    className="w-full px-3 py-2 bg-[#121418] border border-[#2b313a] rounded-xl text-white font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-300 mb-1">{lang === 'ar' ? 'اسم العملة' : 'Coin Name'}</label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Sui Network"
                    className="w-full px-3 py-2 bg-[#121418] border border-[#2b313a] rounded-xl text-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-300 mb-1">{lang === 'ar' ? 'رمز TradingView' : 'TradingView Symbol'}</label>
                  <input
                    type="text"
                    value={newTvSymbol}
                    onChange={(e) => setNewTvSymbol(e.target.value)}
                    placeholder="BINANCE:SUIUSDT"
                    className="w-full px-3 py-2 bg-[#121418] border border-[#2b313a] rounded-xl text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-300 mb-1">{lang === 'ar' ? 'السعر المبدئي' : 'Initial Price'} ($)</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={newBasePrice}
                    onChange={(e) => setNewBasePrice(e.target.value)}
                    placeholder="2.50"
                    className="w-full px-3 py-2 bg-[#121418] border border-[#2b313a] rounded-xl text-white font-mono"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-3 bg-[#F0B90B] hover:bg-[#dfaa07] text-black font-black rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>{t.addCoinButton}</span>
                </button>
              </form>
            </div>

            <div className="lg:col-span-7 bg-[#181a20] border border-[#2b313a] rounded-3xl p-6 shadow-xl space-y-4">
              <h2 className="text-base font-black text-white">{lang === 'ar' ? 'العملات المدرجة' : 'Listed Cryptocurrencies'} ({cryptoCoins.length})</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-start">
                  <thead>
                    <tr className="border-b border-[#262c35] text-gray-400 font-bold">
                      <th className="py-2.5 px-3">Symbol</th>
                      <th className="py-2.5 px-3">Name</th>
                      <th className="py-2.5 px-3">Price</th>
                      <th className="py-2.5 px-3">Active</th>
                      <th className="py-2.5 px-3 text-end">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#222832]">
                    {cryptoCoins.map((coin) => (
                      <tr key={coin.symbol} className="hover:bg-[#1f242c]/50">
                        <td className="py-2.5 px-3 font-mono font-bold text-yellow-400">{coin.symbol}</td>
                        <td className="py-2.5 px-3 font-bold text-white">{coin.name}</td>
                        <td className="py-2.5 px-3 font-mono text-gray-300">${coin.currentPrice}</td>
                        <td className="py-2.5 px-3">
                          <button
                            type="button"
                            onClick={() => toggleCryptoCoinStatus(coin.symbol, coin.enabled !== false)}
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              coin.enabled !== false
                                ? 'bg-[#0ECB81]/15 text-[#0ECB81]'
                                : 'bg-red-500/15 text-red-400'
                            }`}
                          >
                            {coin.enabled !== false ? 'Active' : 'Disabled'}
                          </button>
                        </td>
                        <td className="py-2.5 px-3 text-end">
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Delete ${coin.symbol}?`)) {
                                deleteCryptoCoin(coin.symbol);
                              }
                            }}
                            className="p-1 text-gray-400 hover:text-red-400"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 8: SETTINGS & WALLET ADDRESSES ================= */}
        {activeTab === 'SETTINGS' && (
          <div className="bg-[#181a20] border border-[#2b313a] rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
            <div className="pb-3 border-b border-[#2b313a]">
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-yellow-400" />
                <span>{lang === 'ar' ? 'إعدادات المنصة وعناوين الإيداع' : 'Exchange Branding & Official Deposit Wallets'}</span>
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {lang === 'ar'
                  ? 'قم بضبط اسم المنصة الرسمي وعناوين المحافظ التي تظهر للمتداولين في صفحة الإيداع.'
                  : 'Configure site branding name and official receiving addresses shown on /deposit.'}
              </p>
            </div>

            {settingsFeedback && (
              <div className="p-3 bg-[#0ECB81]/10 border border-[#0ECB81]/30 rounded-xl text-xs text-[#0ECB81] font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>{settingsFeedback}</span>
              </div>
            )}

            <form onSubmit={handleSaveSiteSettings} className="space-y-5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1.5">{lang === 'ar' ? 'اسم المنصة' : 'Exchange Platform Name'}</label>
                  <input
                    type="text"
                    required
                    value={siteNameInput}
                    onChange={(e) => setSiteNameInput(e.target.value)}
                    placeholder="tiksup"
                    className="w-full px-3.5 py-2.5 bg-[#121418] border border-[#2b313a] rounded-xl text-white font-bold text-sm focus:border-yellow-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1.5">{lang === 'ar' ? 'شريط الإعلانات' : 'Announcement Banner'}</label>
                  <input
                    type="text"
                    value={announcementInput}
                    onChange={(e) => setAnnouncementInput(e.target.value)}
                    placeholder="Banner text on homepage..."
                    className="w-full px-3.5 py-2.5 bg-[#121418] border border-[#2b313a] rounded-xl text-white text-xs focus:border-yellow-400"
                  />
                </div>
              </div>

              {/* Deposit Wallet Addresses Section */}
              <div className="p-5 bg-[#121418] rounded-2xl border border-[#2b313a] space-y-4">
                <div className="flex items-center gap-2 border-b border-[#262c36] pb-2">
                  <Wallet className="w-4 h-4 text-yellow-400" />
                  <h3 className="text-xs font-black text-white uppercase tracking-wider">
                    {lang === 'ar' ? 'عناوين محافظ الإيداع الرسمية للمنصة' : 'Official Platform Deposit Wallets'}
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* USDT TRC20 */}
                  <div>
                    <label className="block text-xs font-bold text-yellow-400 mb-1">
                      USDT TRC20 Address (Tron)
                    </label>
                    <input
                      type="text"
                      required
                      value={walletAddressesInput.usdt_trc20}
                      onChange={(e) => setWalletAddressesInput({ ...walletAddressesInput, usdt_trc20: e.target.value.trim() })}
                      className="w-full px-3 py-2 bg-[#181a20] border border-[#2b313a] rounded-xl text-white font-mono text-xs focus:border-yellow-400"
                    />
                  </div>

                  {/* USDT BEP20 */}
                  <div>
                    <label className="block text-xs font-bold text-yellow-400 mb-1">
                      USDT BEP20 Address (BNB Smart Chain)
                    </label>
                    <input
                      type="text"
                      required
                      value={walletAddressesInput.usdt_bep20}
                      onChange={(e) => setWalletAddressesInput({ ...walletAddressesInput, usdt_bep20: e.target.value.trim() })}
                      className="w-full px-3 py-2 bg-[#181a20] border border-[#2b313a] rounded-xl text-white font-mono text-xs focus:border-yellow-400"
                    />
                  </div>

                  {/* BTC */}
                  <div>
                    <label className="block text-xs font-bold text-yellow-400 mb-1">
                      Bitcoin Address (BTC Mainnet)
                    </label>
                    <input
                      type="text"
                      required
                      value={walletAddressesInput.btc}
                      onChange={(e) => setWalletAddressesInput({ ...walletAddressesInput, btc: e.target.value.trim() })}
                      className="w-full px-3 py-2 bg-[#181a20] border border-[#2b313a] rounded-xl text-white font-mono text-xs focus:border-yellow-400"
                    />
                  </div>

                  {/* ETH */}
                  <div>
                    <label className="block text-xs font-bold text-yellow-400 mb-1">
                      Ethereum Address (ERC20 / BEP20)
                    </label>
                    <input
                      type="text"
                      required
                      value={walletAddressesInput.eth}
                      onChange={(e) => setWalletAddressesInput({ ...walletAddressesInput, eth: e.target.value.trim() })}
                      className="w-full px-3 py-2 bg-[#181a20] border border-[#2b313a] rounded-xl text-white font-mono text-xs focus:border-yellow-400"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-3 bg-[#F0B90B] hover:bg-[#dfaa07] text-black font-black rounded-xl text-xs shadow-md transition-all"
                >
                  {lang === 'ar' ? 'حفظ إعدادات المنصة' : 'Save Site Settings'}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>

      {/* Lightbox Screenshot Modal */}
      {zoomScreenshot && (
        <div 
          onClick={() => setZoomScreenshot(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md cursor-pointer animate-in fade-in"
        >
          <div className="relative max-w-3xl max-h-[90vh]">
            <img 
              src={zoomScreenshot} 
              alt="Deposit Screenshot Zoom" 
              className="max-h-[85vh] max-w-full rounded-2xl object-contain border border-[#2b313a] shadow-2xl" 
            />
            <button 
              onClick={() => setZoomScreenshot(null)}
              className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg hover:bg-red-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* MODAL: Inspected Referral Tree (Family Tree View) */}
      {inspectedTreeUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-3xl bg-[#181a20] border-2 border-yellow-500/40 rounded-3xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#2b313a]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-yellow-500/15 text-yellow-400 border border-yellow-500/30 flex items-center justify-center">
                  <GitBranch className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">
                    {lang === 'ar' ? 'شجرة الإحالة والشبكة العائلية للمتداول' : 'Referral Family Tree & Hierarchy'}
                  </h3>
                  <span className="text-xs text-yellow-400 font-bold">
                    {inspectedTreeUser.firstName} {inspectedTreeUser.lastName} ({inspectedTreeUser.email})
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInspectedTreeUser(null)}
                className="w-8 h-8 rounded-full bg-[#2b313a] hover:bg-[#38414e] text-white flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {(() => {
              const hierarchy = buildReferralHierarchy(inspectedTreeUser, users, allReferrals);
              return (
                <div className="space-y-4">
                  {/* Root Node (Ahmed) */}
                  <div className="p-4 bg-[#121418] rounded-2xl border-2 border-yellow-400/50 shadow-md">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-yellow-400 text-black font-extrabold text-sm flex items-center justify-center">
                          ROOT
                        </div>
                        <div>
                          <span className="font-black text-white text-sm block">
                            {hierarchy.user.firstName} {hierarchy.user.lastName}
                          </span>
                          <span className="text-xs text-gray-400 font-mono">{hierarchy.user.email}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        <div className="text-end">
                          <span className="text-gray-400 block text-[10px]">Referral Code</span>
                          <span className="font-mono text-yellow-400 font-bold">{hierarchy.user.referralCode || hierarchy.user.uid.slice(0, 8)}</span>
                        </div>
                        <div className="text-end">
                          <span className="text-gray-400 block text-[10px]">Total Earned</span>
                          <span className="font-mono text-[#0ECB81] font-bold">${(hierarchy.user.referralEarnings || 0).toFixed(2)}</span>
                        </div>
                        <div className="text-end">
                          <span className="text-gray-400 block text-[10px]">Direct Refs</span>
                          <span className="font-mono text-sky-400 font-bold">{hierarchy.children.length}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Children / Branches */}
                  {hierarchy.children.length === 0 ? (
                    <div className="py-8 text-center text-xs text-gray-500 bg-[#121418] rounded-2xl border border-[#2b313a]">
                      {lang === 'ar' ? 'لا يوجد مستخدمون محالون مسجلون تحت هذا الحساب بعد.' : 'No users have registered with this referral link yet.'}
                    </div>
                  ) : (
                    <div className="space-y-3 ps-4 border-s-2 border-yellow-500/30">
                      {hierarchy.children.map((l1) => (
                        <div key={l1.user.uid} className="space-y-2">
                          {/* Level 1 Node (e.g. Khalid) */}
                          <div className="p-3.5 bg-[#181a20] rounded-xl border border-yellow-500/30 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-400 font-black text-[10px] border border-yellow-500/40">
                                Level 1
                              </span>
                              <div>
                                <span className="font-bold text-white text-xs block">
                                  {l1.user.firstName} {l1.user.lastName}
                                </span>
                                <span className="text-[11px] text-gray-400 font-mono">{l1.user.email}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 text-xs">
                              <span className="text-gray-400">
                                Generated: <strong className="text-[#0ECB81] font-mono">${l1.totalGeneratedCommission.toFixed(2)}</strong>
                              </span>
                              <span className="text-gray-400">
                                Sub-Refs: <strong className="text-sky-400 font-mono">{l1.children.length}</strong>
                              </span>
                            </div>
                          </div>

                          {/* Level 2 Sub-Branches (e.g. Muneer) */}
                          {l1.children.length > 0 && (
                            <div className="space-y-2 ps-6 border-s-2 border-[#0ECB81]/30">
                              {l1.children.map((l2) => (
                                <div key={l2.user.uid} className="space-y-1.5">
                                  <div className="p-3 bg-[#121418] rounded-xl border border-[#0ECB81]/30 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                      <span className="px-2 py-0.5 rounded bg-[#0ECB81]/20 text-[#0ECB81] font-black text-[10px] border border-[#0ECB81]/40">
                                        Level 2
                                      </span>
                                      <div>
                                        <span className="font-bold text-white text-xs block">
                                          {l2.user.firstName} {l2.user.lastName}
                                        </span>
                                        <span className="text-[11px] text-gray-400 font-mono">{l2.user.email}</span>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs">
                                      <span className="text-gray-400">
                                        Generated: <strong className="text-[#0ECB81] font-mono">${l2.totalGeneratedCommission.toFixed(2)}</strong>
                                      </span>
                                      <span className="text-gray-400">
                                        Sub-Refs: <strong className="text-purple-400 font-mono">{l2.children.length}</strong>
                                      </span>
                                    </div>
                                  </div>

                                  {/* Level 3 Sub-Branches */}
                                  {l2.children.length > 0 && (
                                    <div className="space-y-1.5 ps-6 border-s-2 border-sky-500/30">
                                      {l2.children.map((l3) => (
                                        <div key={l3.user.uid} className="p-2.5 bg-[#181a20]/80 rounded-lg border border-sky-500/30 flex items-center justify-between">
                                          <div className="flex items-center gap-2">
                                            <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-400 font-black text-[10px] border border-sky-500/40">
                                              Level 3
                                            </span>
                                            <div>
                                              <span className="font-bold text-white text-xs block">
                                                {l3.user.firstName} {l3.user.lastName}
                                              </span>
                                              <span className="text-[10px] text-gray-400 font-mono">{l3.user.email}</span>
                                            </div>
                                          </div>
                                          <span className="text-xs text-gray-400">
                                            Generated: <strong className="text-[#0ECB81] font-mono">${l3.totalGeneratedCommission.toFixed(2)}</strong>
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setInspectedTreeUser(null)}
                className="px-5 py-2.5 bg-[#2b313a] hover:bg-[#38414e] text-white font-bold rounded-xl text-xs"
              >
                Close Tree View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Manual Adjust User Referral Commission */}
      {adjustingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-md bg-[#181a20] border-2 border-yellow-400/50 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#2b313a]">
              <div className="flex items-center gap-2">
                <Gift className="w-5 h-5 text-yellow-400" />
                <h3 className="text-base font-black text-white">
                  {lang === 'ar' ? 'تعديل عمولة الإحالة يدوياً' : 'Adjust Trader Commission'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setAdjustingUser(null)}
                className="w-7 h-7 rounded-full bg-[#2b313a] hover:bg-[#38414e] text-white flex items-center justify-center text-xs"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-3.5 bg-[#121418] rounded-2xl border border-[#2b313a] space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">{lang === 'ar' ? 'المتداول' : 'Trader'}:</span>
                <span className="font-bold text-white">{adjustingUser.firstName} {adjustingUser.lastName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">{lang === 'ar' ? 'البريد' : 'Email'}:</span>
                <span className="font-mono text-yellow-400">{adjustingUser.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">{lang === 'ar' ? 'أرباح الإحالة الحالية' : 'Current Referral Earnings'}:</span>
                <span className="font-mono text-[#0ECB81] font-bold">${(adjustingUser.referralEarnings || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">{lang === 'ar' ? 'رصيد المحفظة الحالي' : 'Current Wallet Balance'}:</span>
                <span className="font-mono text-white font-bold">${adjustingUser.walletBalance.toFixed(2)}</span>
              </div>
            </div>

            {adjustFeedback && (
              <div className={`p-3 rounded-xl text-xs font-bold ${
                adjustFeedback.startsWith('Error') 
                  ? 'bg-red-500/10 border border-red-500/30 text-red-400' 
                  : 'bg-[#0ECB81]/10 border border-[#0ECB81]/30 text-[#0ECB81]'
              }`}>
                {adjustFeedback}
              </div>
            )}

            <form onSubmit={handleAdjustUserCommissionSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">
                  {lang === 'ar' ? 'مبلغ التعديل ($ USDT) - موجب للإضافة، سالب للخصم' : 'Adjustment Amount ($ USDT) - positive or negative'}
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="e.g. 50.00 or -20.00"
                  value={adjustAmountInput}
                  onChange={(e) => setAdjustAmountInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#121418] border border-[#2b313a] rounded-xl text-white font-mono text-sm focus:border-yellow-400 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">
                  {lang === 'ar' ? 'سبب التعديل / ملاحظات إدارية' : 'Adjustment Reason / Notes'}
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. VIP affiliate monthly bonus reward"
                  value={adjustReasonInput}
                  onChange={(e) => setAdjustReasonInput(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#121418] border border-[#2b313a] rounded-xl text-white text-xs focus:border-yellow-400"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAdjustingUser(null)}
                  className="flex-1 py-2.5 bg-[#2b313a] hover:bg-[#38414e] text-white font-bold rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#F0B90B] hover:bg-[#dfaa07] text-black font-black rounded-xl text-xs shadow-md"
                >
                  Apply Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
