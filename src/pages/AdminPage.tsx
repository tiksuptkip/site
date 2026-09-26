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
  Bot
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
  RiskMode
} from '../types';
import { translations } from '../i18n/translations';
import { updateSiteSettings, updateBinarySettings } from '../services/siteService';
import { 
  subscribeAllUsers, 
  toggleUserBlockStatus 
} from '../services/userService';
import { 
  addBalanceToUser, 
  subscribeWalletLogs 
} from '../services/walletService';
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
  kickTelegramSubscription 
} from '../services/telegramService';
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
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [activeAdminName, setActiveAdminName] = useState('Samjordan$$&&');
  const [loginError, setLoginError] = useState('');

  // Active Tab
  const [activeTab, setActiveTab] = useState<
    'DEPOSITS' | 'WITHDRAWALS' | 'TELEGRAM' | 'AUTO_POSTER' | 'BINARY' | 'USERS' | 'WALLET' | 'CRYPTO' | 'SETTINGS'
  >('DEPOSITS');

  // Firestore Live States
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [cryptoCoins, setCryptoCoins] = useState<CryptoCoin[]>([]);
  const [walletLogs, setWalletLogs] = useState<WalletLog[]>([]);
  const [binaryTrades, setBinaryTrades] = useState<BinaryTrade[]>([]);
  const [deposits, setDeposits] = useState<DepositRecord[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRecord[]>([]);
  const [telegramChannels, setTelegramChannels] = useState<TelegramChannel[]>([]);
  const [telegramSubscriptions, setTelegramSubscriptions] = useState<TelegramSubscription[]>([]);

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

  // Wallet Control Form (ADD ONLY)
  const [selectedUserForCredit, setSelectedUserForCredit] = useState<string>('');
  const [creditAmount, setCreditAmount] = useState<string>('');
  const [creditReason, setCreditReason] = useState<string>('');
  const [walletFeedback, setWalletFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [creditLoading, setCreditLoading] = useState(false);

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

    return () => {
      unsubUsers();
      unsubCoins();
      unsubLogs();
      unsubBinary();
      unsubDeposits();
      unsubWithdrawals();
      unsubChannels();
      unsubSubs();
    };
  }, [isAdminLoggedIn]);

  // Admin Login Verification
  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    const inputUser = adminUsername.trim();
    const inputPass = adminPassword;

    // Credentials:
    // Username: Samjordan$$&&
    // Password: Sam18101998s$$a&&
    const isUserValid = inputUser === 'Samjordan$$&&' || inputUser.toLowerCase() === 'samjordan$$&&';
    const isPassValid = inputPass === 'Sam18101998s$$a&&';

    if (isUserValid && isPassValid) {
      setIsAdminLoggedIn(true);
      setActiveAdminName('Samjordan$$&&');
    } else {
      setLoginError(lang === 'ar' ? 'اسم المستخدم أو كلمة المرور غير صحيحة' : 'Invalid administrator credentials. Access restricted.');
    }
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

  // Direct Wallet Balance Add
  const handleCreditWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    setWalletFeedback(null);

    const amount = parseFloat(creditAmount);
    if (!selectedUserForCredit) {
      setWalletFeedback({ type: 'error', message: lang === 'ar' ? 'يرجى اختيار المستخدم أولاً' : 'Please select a user to credit' });
      return;
    }
    if (!amount || amount <= 0 || isNaN(amount)) {
      setWalletFeedback({ type: 'error', message: lang === 'ar' ? 'يرجى إدخال مبلغ صحيح أكبر من الصفر' : 'Please enter a valid amount greater than 0' });
      return;
    }

    setCreditLoading(true);

    try {
      const res = await addBalanceToUser(
        activeAdminName,
        selectedUserForCredit,
        amount,
        creditReason.trim() || 'Manual Admin Deposit'
      );
      setWalletFeedback({
        type: 'success',
        message: `${t.walletAddSuccess} (+${amount.toFixed(2)} USDT. New balance: ${res.newBalance.toFixed(2)} USDT)`,
      });
      setCreditAmount('');
      setCreditReason('');
    } catch (err: any) {
      setWalletFeedback({ type: 'error', message: err.message || 'Error crediting wallet' });
    } finally {
      setCreditLoading(false);
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
  const [editInvite, setEditInvite] = useState<string>('');
  const [editDuration, setEditDuration] = useState<number>(30);
  const [editWinRate, setEditWinRate] = useState<string>('96.8%');
  const [editTrades, setEditTrades] = useState<number>(1940);
  const [editDesc, setEditDesc] = useState<string>('');
  const [editProofImages, setEditProofImages] = useState<string[]>([]);

  useEffect(() => {
    if (activeEditingChannel) {
      setEditPrice(activeEditingChannel.price || 250);
      setEditInvite(activeEditingChannel.inviteLink || '');
      setEditDuration(activeEditingChannel.durationDays || 30);
      setEditWinRate(activeEditingChannel.winRate || '96%');
      setEditTrades(activeEditingChannel.totalTrades || 1000);
      setEditDesc(activeEditingChannel.description || '');
      setEditProofImages(activeEditingChannel.proofImages || []);
    }
  }, [activeEditingChannel]);

  const handleSaveTelegramChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    setTelegramFeedback('');
    try {
      await updateTelegramChannel(selectedChannelIdForEdit, {
        price: Number(editPrice),
        inviteLink: editInvite.trim(),
        durationDays: Number(editDuration),
        winRate: editWinRate.trim(),
        totalTrades: Number(editTrades),
        description: editDesc.trim(),
        proofImages: editProofImages,
      });
      setTelegramFeedback(lang === 'ar' ? 'تم حفظ إعدادات القناة بنجاح' : 'Channel settings saved successfully');
      setTimeout(() => setTelegramFeedback(''), 3000);
    } catch (err: any) {
      setTelegramFeedback('Error saving channel: ' + err.message);
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
        className="min-h-screen bg-[#0b0e11] text-gray-200 flex flex-col justify-between"
        dir={translations[lang].dir}
      >
        <div className="p-4 sm:px-8 border-b border-[#1f242c] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={onNavigateHome}
              className="text-xs text-gray-400 hover:text-white flex items-center gap-1.5 px-3 py-1.5 bg-[#181a20] rounded-xl border border-[#2b313a] transition-colors"
            >
              <ArrowLeft className={`w-3.5 h-3.5 ${lang === 'ar' ? 'rotate-180' : ''}`} />
              <span>{lang === 'ar' ? 'العودة للمنصة' : 'Back to Exchange'}</span>
            </button>
          </div>

          <button
            onClick={() => onLanguageChange(lang === 'en' ? 'ar' : 'en')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#181a20] hover:bg-[#252a33] border border-[#2b313a] rounded-xl text-xs font-bold text-gray-200 transition-all shadow-sm"
          >
            <Globe className="w-3.5 h-3.5 text-yellow-400" />
            <span>{lang === 'en' ? 'العربية' : 'EN'}</span>
            <span>{lang === 'en' ? '🇸🇦' : '🇬🇧'}</span>
          </button>
        </div>

        <div className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#181a20] border border-[#2b313a] rounded-3xl p-6 sm:p-8 shadow-2xl relative">
            <div className="text-center mb-6">
              <div className="w-14 h-14 mx-auto mb-3 bg-[#F0B90B]/10 text-yellow-400 rounded-2xl border border-[#F0B90B]/30 flex items-center justify-center shadow-inner">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <h1 className="text-xl font-black text-white">
                {t.adminLoginTitle}
              </h1>
              <p className="text-xs text-gray-400 mt-1">
                tiksup Administrative Gateway
              </p>
            </div>

            <div className="mb-5 p-3.5 bg-[#121418] rounded-xl border border-[#282e38] text-xs text-gray-400 flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 text-yellow-400 shrink-0" />
              <span className="text-[11px] leading-relaxed">
                {lang === 'ar'
                  ? 'بوابة دخول المشرفين المشفرة - مقتصرة على المشرفين المعتمدين فقط.'
                  : 'Encrypted Administrator Gateway - Restricted to authorized personnel only.'}
              </span>
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
                  {t.adminUsernameLabel}
                </label>
                <div className="relative">
                  <User className={`w-4 h-4 text-gray-400 absolute top-3 ${lang === 'ar' ? 'right-3' : 'left-3'}`} />
                  <input
                    type="text"
                    required
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                    value={adminUsername}
                    onChange={(e) => setAdminUsername(e.target.value)}
                    placeholder={lang === 'ar' ? 'اسم المستخدم' : 'Admin Username'}
                    className={`w-full py-2.5 bg-[#121418] border border-[#2b313a] rounded-xl text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#F0B90B] ${
                      lang === 'ar' ? 'pr-9 pl-3 text-right' : 'pl-9 pr-3 text-left'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  {t.adminPasswordLabel}
                </label>
                <div className="relative">
                  <Lock className={`w-4 h-4 text-gray-400 absolute top-3 ${lang === 'ar' ? 'right-3' : 'left-3'}`} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="••••••••"
                    className={`w-full py-2.5 bg-[#121418] border border-[#2b313a] rounded-xl text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#F0B90B] font-mono tracking-wider ${
                      lang === 'ar' ? 'pr-9 pl-10 text-right' : 'pl-9 pr-10 text-left'
                    }`}
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword(!showPassword)}
                    className={`absolute top-2.5 text-gray-400 hover:text-white transition-colors p-1 rounded-lg ${
                      lang === 'ar' ? 'left-2.5' : 'right-2.5'
                    }`}
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
                className="w-full py-3 bg-[#F0B90B] hover:bg-[#dfaa07] text-black font-extrabold rounded-xl text-sm transition-all shadow-lg active:scale-98 flex items-center justify-center gap-2 mt-2"
              >
                <span>{t.adminLoginButton}</span>
                <ArrowRight className={`w-4 h-4 ${lang === 'ar' ? 'rotate-180' : ''}`} />
              </button>
            </form>
          </div>
        </div>

        <div className="py-4 text-center text-xs text-gray-500 border-t border-[#1a1e26]">
          <span>© {new Date().getFullYear()} tiksup Security Systems. Admin Access Logged.</span>
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

        {/* ================= TAB 3: TELEGRAM SIGNALS ================= */}
        {activeTab === 'TELEGRAM' && (
          <div className="space-y-6">
            {/* Top Channel Editor */}
            <div className="bg-[#181a20] border border-[#2b313a] rounded-3xl p-6 shadow-xl space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#2b313a]">
                <div>
                  <h2 className="text-lg font-black text-white flex items-center gap-2">
                    <Send className="w-5 h-5 text-sky-400" />
                    <span>{lang === 'ar' ? 'إعدادات قنوات تيليجرام' : 'Telegram VIP Channels Settings'}</span>
                  </h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {lang === 'ar'
                      ? 'حدد السعر، رابط الدعوة الخاص بكل قناة، نسبة النجاح، وأرفق صور إثباتات الأرباح.'
                      : 'Configure tier prices, private invite links, duration, win rates, and proof galleries.'}
                  </p>
                </div>

                {/* Channel Selector Tabs */}
                <div className="flex items-center gap-2 bg-[#121418] p-1 rounded-2xl border border-[#2b313a]">
                  {(['super_vip', 'vip', 'regular'] as const).map((id) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setSelectedChannelIdForEdit(id)}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${
                        selectedChannelIdForEdit === id
                          ? id === 'super_vip'
                            ? 'bg-yellow-400 text-black shadow-md'
                            : id === 'vip'
                            ? 'bg-[#0ECB81] text-black shadow-md'
                            : 'bg-blue-600 text-white shadow-md'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      {id === 'super_vip' ? '👑 SUPER VIP' : id === 'vip' ? '⚡ VIP' : '💎 REGULAR'}
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
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Price */}
                  <div>
                    <label className="block text-xs font-bold text-gray-300 mb-1.5">
                      Subscription Price ($ USDT)
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={editPrice}
                      onChange={(e) => setEditPrice(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 bg-[#121418] border border-[#2b313a] rounded-xl text-white font-mono font-bold text-sm focus:border-yellow-400"
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
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

                  {/* Invite Link */}
                  <div>
                    <label className="block text-xs font-bold text-gray-300 mb-1.5">
                      Telegram Channel Private Invite Link (t.me/+...)
                    </label>
                    <input
                      type="text"
                      required
                      value={editInvite}
                      onChange={(e) => setEditInvite(e.target.value)}
                      placeholder="https://t.me/+..."
                      className="w-full px-3.5 py-2.5 bg-[#121418] border border-[#2b313a] rounded-xl text-white font-mono text-xs focus:border-yellow-400 text-yellow-400"
                    />
                  </div>
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
                    className="px-6 py-2.5 bg-[#F0B90B] hover:bg-[#dfaa07] text-black font-black rounded-xl text-xs shadow-md transition-all"
                  >
                    Save Channel Settings
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

        {/* ================= TAB 6: WALLET BALANCE CREDIT ================= */}
        {activeTab === 'WALLET' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 bg-[#181a20] border border-[#2b313a] rounded-3xl p-6 shadow-xl space-y-4">
              <h2 className="text-base font-black text-white flex items-center gap-2">
                <Wallet className="w-4 h-4 text-yellow-400" />
                <span>{lang === 'ar' ? 'إضافة رصيد للمحفظة' : 'Credit User Wallet'}</span>
              </h2>

              {walletFeedback && (
                <div className={`p-3 rounded-xl text-xs font-bold ${
                  walletFeedback.type === 'success'
                    ? 'bg-[#0ECB81]/10 text-[#0ECB81] border border-[#0ECB81]/30'
                    : 'bg-red-500/10 text-red-400 border border-red-500/30'
                }`}>
                  {walletFeedback.message}
                </div>
              )}

              <form onSubmit={handleCreditWallet} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-gray-300 mb-1.5">{lang === 'ar' ? 'اختر المتداول' : 'Select Trader'}</label>
                  <select
                    required
                    value={selectedUserForCredit}
                    onChange={(e) => setSelectedUserForCredit(e.target.value)}
                    className="w-full px-3 py-2.5 bg-[#121418] border border-[#2b313a] rounded-xl text-white text-xs"
                  >
                    <option value="">-- Choose User --</option>
                    {users.map((u) => (
                      <option key={u.uid} value={u.uid}>
                        {u.firstName} {u.lastName} ({u.email}) - {u.walletBalance.toFixed(2)} USDT
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-300 mb-1.5">{lang === 'ar' ? 'المبلغ' : 'Amount'} (USDT)</label>
                  <input
                    type="number"
                    step="any"
                    min="0.01"
                    required
                    value={creditAmount}
                    onChange={(e) => setCreditAmount(e.target.value)}
                    placeholder="e.g. 500.00"
                    className="w-full px-3.5 py-2.5 bg-[#121418] border border-[#2b313a] rounded-xl text-white font-mono text-sm"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-300 mb-1.5">{lang === 'ar' ? 'سبب الإيداع' : 'Deposit Reason / Notes'}</label>
                  <input
                    type="text"
                    value={creditReason}
                    onChange={(e) => setCreditReason(e.target.value)}
                    placeholder="e.g. Direct wire transfer / Bonus"
                    className="w-full px-3 py-2.5 bg-[#121418] border border-[#2b313a] rounded-xl text-white text-xs"
                  />
                </div>

                <button
                  type="submit"
                  disabled={creditLoading}
                  className="w-full py-3 bg-[#0ECB81] hover:bg-[#0bb372] disabled:bg-gray-700 text-black font-black rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>{creditLoading ? 'Crediting...' : (lang === 'ar' ? 'إضافة الرصيد الآن' : 'Credit Balance')}</span>
                </button>
              </form>
            </div>

            <div className="lg:col-span-7 bg-[#181a20] border border-[#2b313a] rounded-3xl p-6 shadow-xl space-y-4">
              <h2 className="text-base font-black text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-yellow-400" />
                <span>{lang === 'ar' ? 'سجل العمليات الإدارية' : 'Administrative Wallet Logs'}</span>
              </h2>

              <div className="overflow-x-auto max-h-[450px]">
                <table className="w-full text-xs text-start">
                  <thead>
                    <tr className="border-b border-[#262c35] text-gray-400 font-bold">
                      <th className="py-2 px-3">Date</th>
                      <th className="py-2 px-3">User</th>
                      <th className="py-2 px-3">Amount</th>
                      <th className="py-2 px-3">New Bal</th>
                      <th className="py-2 px-3">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#222832]">
                    {walletLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-[#1f242c]/50">
                        <td className="py-2 px-3 text-gray-400 text-[11px]">
                          {new Date(log.timestamp).toLocaleDateString()}
                        </td>
                        <td className="py-2 px-3 text-white font-bold">{log.userEmail}</td>
                        <td className={`py-2 px-3 font-mono font-bold ${log.amount > 0 ? 'text-[#0ECB81]' : 'text-red-400'}`}>
                          {log.amount > 0 ? `+${log.amount.toFixed(2)}` : log.amount.toFixed(2)}
                        </td>
                        <td className="py-2 px-3 font-mono text-yellow-400 font-bold">
                          ${log.newBalance.toFixed(2)}
                        </td>
                        <td className="py-2 px-3 text-gray-400">{log.reason}</td>
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
    </div>
  );
};
