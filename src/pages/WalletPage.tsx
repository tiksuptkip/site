import React, { useState, useEffect, useMemo } from 'react';
import { 
  Wallet, 
  ArrowDownToLine, 
  ArrowUpRight, 
  Gift, 
  TrendingUp, 
  Clock, 
  ShieldCheck, 
  CheckCircle2, 
  ArrowLeft,
  ArrowRight,
  Search,
  ArrowDownUp,
  X,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Info
} from 'lucide-react';
import { UserProfile, SiteSettings, Language, SupportedCoin, CoinBalance, TransactionRecord, DepositRecord, WithdrawalRecord } from '../types';
import { translations } from '../i18n/translations';
import { Header } from '../components/Header';
import { subscribeUserBalances, executeSpotTrade } from '../services/walletService';
import { subscribeSupportedCoins, startLivePriceTicker } from '../services/supportedCoinsService';
import { subscribeUserTransactions } from '../services/referralService';
import { subscribeUserDeposits, subscribeUserWithdrawals } from '../services/depositWithdrawService';

interface WalletPageProps {
  user: UserProfile;
  siteSettings: SiteSettings;
  lang: Language;
  onLanguageChange: (lang: Language) => void;
  onSignOut: () => void;
  onNavigateHome: () => void;
  onNavigateDeposit: (coin?: string) => void;
  onNavigateWithdraw: (coin?: string) => void;
  onNavigateReferral: () => void;
  onNavigateTrade?: (coin: string) => void;
  onNavigateTelegram?: () => void;
}

export const WalletPage: React.FC<WalletPageProps> = ({
  user,
  siteSettings,
  lang,
  onLanguageChange,
  onSignOut,
  onNavigateHome,
  onNavigateDeposit,
  onNavigateWithdraw,
  onNavigateReferral,
  onNavigateTrade,
  onNavigateTelegram,
}) => {
  const isAr = lang === 'ar';
  const t = translations[lang];

  const [supportedCoins, setSupportedCoins] = useState<SupportedCoin[]>([]);
  const [userBalances, setUserBalances] = useState<Record<string, CoinBalance>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [hideSmallBalances, setHideSmallBalances] = useState(false);

  // Convert Modal State
  const [isConvertOpen, setIsConvertOpen] = useState(false);
  const [fromCoin, setFromCoin] = useState('USDT');
  const [toCoin, setToCoin] = useState('BTC');
  const [convertAmount, setConvertAmount] = useState('');
  const [convertLoading, setConvertLoading] = useState(false);
  const [convertFeedback, setConvertFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // History & Ledger
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [deposits, setDeposits] = useState<DepositRecord[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRecord[]>([]);
  const [historyTab, setHistoryTab] = useState<'ALL' | 'SPOT' | 'DEPOSIT' | 'WITHDRAW' | 'REFERRAL'>('ALL');

  // Start 10-second price ticker & subscribe to supported coins
  useEffect(() => {
    startLivePriceTicker();
    const unsubCoins = subscribeSupportedCoins((coins) => {
      setSupportedCoins(coins);
    });
    return () => unsubCoins();
  }, []);

  // Real-time subscription to multi-currency balances in subcollection userWallets/{userId}/balances
  useEffect(() => {
    if (!user?.uid) return;
    const unsubBalances = subscribeUserBalances(user.uid, (balances) => {
      setUserBalances(balances);
    });
    return () => unsubBalances();
  }, [user?.uid]);

  // Activity records
  useEffect(() => {
    if (!user?.uid) return;
    const unsubTx = subscribeUserTransactions(user.uid, setTransactions);
    const unsubDep = subscribeUserDeposits(user.uid, setDeposits);
    const unsubWith = subscribeUserWithdrawals(user.uid, setWithdrawals);

    return () => {
      unsubTx();
      unsubDep();
      unsubWith();
    };
  }, [user?.uid]);

  // Price map
  const priceMap = useMemo(() => {
    const map = new Map<string, { price: number; change24h: number }>();
    for (const c of supportedCoins) {
      map.set(c.symbol.toUpperCase(), { price: c.currentPrice, change24h: c.change24h || 0 });
    }
    map.set('USDT', { price: 1.0, change24h: 0.0 });
    return map;
  }, [supportedCoins]);

  // Calculate Total Portfolio Value in USDT (sum of all coins * live price) + 24h PnL
  const { totalPortfolioUsdt, pnl24hUsdt, pnl24hPercent } = useMemo(() => {
    let totalUsdt = 0;
    let initial24hTotal = 0;

    // Check all supported coins
    for (const coin of supportedCoins) {
      const sym = coin.symbol.toUpperCase();
      const bal = userBalances[sym]?.balance || 0;
      const price = coin.currentPrice || 0;
      const coinValue = bal * price;
      totalUsdt += coinValue;

      const changeFactor = 1 + (coin.change24h || 0) / 100;
      const initialCoinPrice = changeFactor > 0 ? price / changeFactor : price;
      initial24hTotal += bal * initialCoinPrice;
    }

    // Add USDT balance if not in supportedCoins
    if (!supportedCoins.some((c) => c.symbol.toUpperCase() === 'USDT')) {
      const usdtBal = userBalances['USDT']?.balance ?? (user.walletBalance || 0);
      totalUsdt += usdtBal;
      initial24hTotal += usdtBal;
    }

    const pnlUsdt = totalUsdt - initial24hTotal;
    const pnlPct = initial24hTotal > 0 ? (pnlUsdt / initial24hTotal) * 100 : 0;

    return {
      totalPortfolioUsdt: totalUsdt,
      pnl24hUsdt: pnlUsdt,
      pnl24hPercent: pnlPct,
    };
  }, [supportedCoins, userBalances, user.walletBalance]);

  // Filtered Coins for Binance Table
  const filteredCoins = useMemo(() => {
    return supportedCoins.filter((coin) => {
      const sym = coin.symbol.toUpperCase();
      const name = coin.name.toLowerCase();
      const q = searchQuery.trim().toLowerCase();

      const matchesSearch = sym.includes(q.toUpperCase()) || name.includes(q);
      if (!matchesSearch) return false;

      if (hideSmallBalances) {
        const bal = userBalances[sym]?.balance || 0;
        const val = bal * coin.currentPrice;
        if (val < 1.0) return false;
      }

      return true;
    });
  }, [supportedCoins, searchQuery, hideSmallBalances, userBalances]);

  // Convert handler
  const handleExecuteConvert = async (e: React.FormEvent) => {
    e.preventDefault();
    setConvertFeedback(null);
    const amountNum = parseFloat(convertAmount);
    if (!amountNum || amountNum <= 0) {
      setConvertFeedback({ type: 'error', message: isAr ? 'يرجى إدخال مبلغ صحيح' : 'Please enter a valid amount.' });
      return;
    }

    if (fromCoin === toCoin) {
      setConvertFeedback({ type: 'error', message: isAr ? 'لا يمكن التحويل لنفس العملة' : 'Cannot convert to the same currency.' });
      return;
    }

    const fromBal = userBalances[fromCoin]?.balance || 0;
    if (fromBal < amountNum) {
      setConvertFeedback({
        type: 'error',
        message: isAr
          ? `الرصيد غير كافٍ. المتاح: ${fromBal} ${fromCoin}`
          : `Insufficient ${fromCoin} balance. Available: ${fromBal} ${fromCoin}`,
      });
      return;
    }

    const fromPrice = priceMap.get(fromCoin)?.price || 1;
    const toPrice = priceMap.get(toCoin)?.price || 1;

    setConvertLoading(true);

    try {
      // 1. If fromCoin is NOT USDT, sell fromCoin to USDT
      if (fromCoin !== 'USDT') {
        const sellRes = await executeSpotTrade(user.uid, user.email, fromCoin, 'SELL', amountNum, fromPrice);
        if (!sellRes.success) {
          throw new Error(sellRes.error || 'Failed to convert from source coin.');
        }
      }

      // 2. If toCoin is NOT USDT, buy toCoin with USDT
      if (toCoin !== 'USDT') {
        const usdtValue = fromCoin === 'USDT' ? amountNum : amountNum * fromPrice;
        const toAmount = toPrice > 0 ? usdtValue / toPrice : 0;
        const buyRes = await executeSpotTrade(user.uid, user.email, toCoin, 'BUY', toAmount, toPrice);
        if (!buyRes.success) {
          throw new Error(buyRes.error || 'Failed to convert to destination coin.');
        }
      }

      setConvertFeedback({
        type: 'success',
        message: isAr
          ? `تم تحويل ${amountNum} ${fromCoin} بنجاح إلى ${toCoin}!`
          : `Successfully converted ${amountNum} ${fromCoin} to ${toCoin}!`,
      });
      setConvertAmount('');
    } catch (err: any) {
      setConvertFeedback({
        type: 'error',
        message: err.message || 'Conversion failed.',
      });
    } finally {
      setConvertLoading(false);
    }
  };

  // Convert estimated received amount
  const estimatedReceive = useMemo(() => {
    const num = parseFloat(convertAmount) || 0;
    if (num <= 0) return 0;
    const fPrice = priceMap.get(fromCoin)?.price || 1;
    const tPrice = priceMap.get(toCoin)?.price || 1;
    if (tPrice <= 0) return 0;
    return (num * fPrice) / tPrice;
  }, [convertAmount, fromCoin, toCoin, priceMap]);

  return (
    <div className="min-h-screen bg-[#0b0e11] text-gray-200 flex flex-col font-sans" dir={isAr ? 'rtl' : 'ltr'}>
      <Header
        siteSettings={siteSettings}
        user={user}
        lang={lang}
        onLanguageChange={onLanguageChange}
        onOpenDeposit={() => onNavigateDeposit()}
        onOpenWithdraw={() => onNavigateWithdraw()}
        onNavigateTelegram={onNavigateTelegram}
        onNavigateReferral={onNavigateReferral}
        onNavigateWallet={() => {}}
        onSignOut={onSignOut}
        onNavigateHome={onNavigateHome}
        onNavigateLogin={onNavigateHome}
      />

      <main className="flex-1 max-w-[1600px] w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <button
              onClick={onNavigateHome}
              className="text-xs font-bold text-gray-400 hover:text-yellow-400 flex items-center gap-1.5 transition-colors mb-2"
            >
              {isAr ? <ArrowRight className="w-3.5 h-3.5" /> : <ArrowLeft className="w-3.5 h-3.5" />}
              <span>{isAr ? 'العودة لمنصة التداول' : 'Back to Trading'}</span>
            </button>
            <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-3">
              <Wallet className="w-7 h-7 text-[#F0B90B]" />
              <span>{isAr ? 'المحفظة الاحترافية متعددة العملات' : 'Multi-Currency Professional Wallet'}</span>
            </h1>
            <p className="text-xs sm:text-sm text-gray-400 mt-1">
              {isAr
                ? 'إدارة متكاملة لجميع أصولك الرقمية (BTC, ETH, USDT, SOL, XRP...) مع أسعار حية مباشرة ومطابقة لمنصة بينانس.'
                : 'Binance-grade overview of your multi-currency crypto holdings with real-time live prices, instant trades, and fast withdrawals.'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onNavigateReferral}
              className="px-4 py-2 bg-[#1e2329] hover:bg-[#252b33] border border-[#2b313a] rounded-xl text-xs font-bold text-yellow-400 hover:text-yellow-300 flex items-center gap-2 transition-all shadow-sm"
            >
              <Gift className="w-4 h-4 text-yellow-400" />
              <span>{isAr ? 'نظام الإحالة' : 'Referral System'}</span>
            </button>
          </div>
        </div>

        {/* ================= HERO CARD: TOTAL PORTFOLIO VALUE (BINANCE STYLE) ================= */}
        <div className="bg-gradient-to-br from-[#1e2329] via-[#161a20] to-[#12151b] border border-[#2b313a] rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-yellow-500/10 via-amber-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2 mb-1">
                <ShieldCheck className="w-4 h-4 text-[#0ECB81]" />
                {isAr ? 'القيمة الإجمالية للمحفظة المقدرة بالدولار' : 'Total Estimated Portfolio Value'}
              </span>

              <div className="flex items-baseline gap-2.5 my-2">
                <span className="font-mono text-3xl sm:text-5xl font-black text-white tracking-tight">
                  ${totalPortfolioUsdt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-base sm:text-lg font-black text-yellow-400">USDT</span>
              </div>

              {/* 24h PnL Banner */}
              <div className="flex items-center gap-3 text-xs">
                <span className="text-gray-400 font-medium">
                  {isAr ? 'أرباح وخسائر 24 ساعة (PnL):' : "Today's PnL:"}
                </span>
                <span className={`font-mono font-bold flex items-center gap-1 ${
                  pnl24hUsdt >= 0 ? 'text-[#0ECB81]' : 'text-red-400'
                }`}>
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>
                    {pnl24hUsdt >= 0 ? '+' : ''}${pnl24hUsdt.toFixed(2)} ({pnl24hPercent >= 0 ? '+' : ''}{pnl24hPercent.toFixed(2)}%)
                  </span>
                </span>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => onNavigateDeposit('USDT')}
                className="px-6 py-3 bg-[#0ECB81] hover:bg-[#0bb372] text-black font-black text-xs sm:text-sm rounded-2xl flex items-center gap-2 transition-all shadow-lg active:scale-95"
              >
                <ArrowDownToLine className="w-4 h-4 stroke-[2.5]" />
                <span>{isAr ? 'إيداع' : 'Deposit'}</span>
              </button>

              <button
                onClick={() => onNavigateWithdraw('USDT')}
                className="px-6 py-3 bg-[#2b313a] hover:bg-[#38414e] text-white font-black text-xs sm:text-sm rounded-2xl flex items-center gap-2 transition-all shadow-lg active:scale-95"
              >
                <ArrowUpRight className="w-4 h-4 text-yellow-400 stroke-[2.5]" />
                <span>{isAr ? 'سحب' : 'Withdraw'}</span>
              </button>

              <button
                onClick={() => setIsConvertOpen(true)}
                className="px-5 py-3 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 font-black text-xs sm:text-sm rounded-2xl flex items-center gap-2 transition-all shadow-sm active:scale-95"
              >
                <ArrowDownUp className="w-4 h-4" />
                <span>{isAr ? 'تحويل فوري' : 'Convert'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* ================= BINANCE-STYLE ASSET HOLDINGS TABLE ================= */}
        <div className="bg-[#181a20] border border-[#2b313a] rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
          {/* Table Header Controls: Search bar & Hide small balances */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#2b313a]">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isAr ? 'بحث عن عملة أو اسم...' : 'Search coin or name...'}
                className="w-full ps-9 pe-3 py-2 bg-[#121418] border border-[#2b313a] rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#F0B90B]"
              />
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-gray-400 hover:text-white transition-colors">
                <input
                  type="checkbox"
                  checked={hideSmallBalances}
                  onChange={(e) => setHideSmallBalances(e.target.checked)}
                  className="rounded bg-[#121418] border-[#2b313a] text-yellow-400 focus:ring-0 w-3.5 h-3.5 cursor-pointer"
                />
                <span>{isAr ? 'إخفاء الأرصدة الصغيرة (< $1.00)' : 'Hide small balances (< $1.00)'}</span>
              </label>
            </div>
          </div>

          {/* Table Content */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-start">
              <thead>
                <tr className="border-b border-[#262c35] text-gray-400 font-bold">
                  <th className="py-3 px-3">{isAr ? 'العملة' : 'Coin'}</th>
                  <th className="py-3 px-3">{isAr ? 'الاسم' : 'Name'}</th>
                  <th className="py-3 px-3">{isAr ? 'إجمالي الرصيد' : 'Total Balance'}</th>
                  <th className="py-3 px-3">{isAr ? 'المحجوز' : 'Locked'}</th>
                  <th className="py-3 px-3">{isAr ? 'الرصيد المتاح' : 'Available'}</th>
                  <th className="py-3 px-3">{isAr ? 'السعر الحي' : 'Price'}</th>
                  <th className="py-3 px-3">{isAr ? 'القيمة (USDT)' : 'Value (USDT)'}</th>
                  <th className="py-3 px-3">{isAr ? 'تغير 24س' : '24h %'}</th>
                  <th className="py-3 px-3 text-end">{isAr ? 'إجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222832]">
                {filteredCoins.map((coin) => {
                  const sym = coin.symbol.toUpperCase();
                  const bal = userBalances[sym]?.balance || 0;
                  const locked = userBalances[sym]?.locked || 0;
                  const available = Math.max(0, bal - locked);
                  const valueUsdt = available * coin.currentPrice;
                  const decimals = sym === 'BTC' || sym === 'ETH' ? 8 : sym === 'PEPE' || sym === 'SHIB' ? 2 : 4;

                  return (
                    <tr key={coin.symbol} className="hover:bg-[#1f242c]/50 transition-colors">
                      {/* Coin Icon & Symbol */}
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-2.5">
                          {coin.icon ? (
                            <img src={coin.icon} alt={coin.symbol} className="w-6 h-6 rounded-full shrink-0 object-contain" />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-yellow-500/20 text-yellow-400 font-bold flex items-center justify-center text-[10px]">
                              {coin.symbol.slice(0, 2)}
                            </div>
                          )}
                          <span className="font-extrabold text-white text-xs font-mono">{coin.symbol}</span>
                        </div>
                      </td>

                      {/* Coin Name */}
                      <td className="py-3.5 px-3 text-gray-300 font-medium">
                        {coin.name}
                      </td>

                      {/* Total Balance */}
                      <td className="py-3.5 px-3 font-mono font-bold text-white">
                        {bal.toFixed(decimals)}
                      </td>

                      {/* Locked */}
                      <td className="py-3.5 px-3 font-mono text-gray-500">
                        {locked.toFixed(decimals)}
                      </td>

                      {/* Available */}
                      <td className="py-3.5 px-3 font-mono font-bold text-[#0ECB81]">
                        {available.toFixed(decimals)}
                      </td>

                      {/* Live Price */}
                      <td className="py-3.5 px-3 font-mono text-gray-200">
                        ${coin.currentPrice > 1 ? coin.currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 }) : coin.currentPrice.toFixed(6)}
                      </td>

                      {/* Value in USDT */}
                      <td className="py-3.5 px-3 font-mono font-black text-yellow-400">
                        ${valueUsdt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      {/* 24h Change */}
                      <td className="py-3.5 px-3 font-mono font-bold">
                        <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                          (coin.change24h || 0) >= 0
                            ? 'bg-[#0ECB81]/15 text-[#0ECB81]'
                            : 'bg-red-500/15 text-red-400'
                        }`}>
                          {(coin.change24h || 0) >= 0 ? '+' : ''}{(coin.change24h || 0).toFixed(2)}%
                        </span>
                      </td>

                      {/* Action Buttons: Deposit, Withdraw, Trade, Convert */}
                      <td className="py-3.5 px-3 text-end">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onNavigateDeposit(coin.symbol)}
                            className="px-2.5 py-1 bg-[#121418] hover:bg-[#282f3a] text-gray-300 hover:text-white rounded-lg text-[11px] font-bold border border-[#2b313a] transition-colors"
                          >
                            {isAr ? 'إيداع' : 'Deposit'}
                          </button>

                          <button
                            onClick={() => onNavigateWithdraw(coin.symbol)}
                            className="px-2.5 py-1 bg-[#121418] hover:bg-[#282f3a] text-gray-300 hover:text-white rounded-lg text-[11px] font-bold border border-[#2b313a] transition-colors"
                          >
                            {isAr ? 'سحب' : 'Withdraw'}
                          </button>

                          {onNavigateTrade && (
                            <button
                              onClick={() => onNavigateTrade(coin.symbol)}
                              className="px-2.5 py-1 bg-[#F0B90B]/10 hover:bg-[#F0B90B]/20 text-yellow-400 rounded-lg text-[11px] font-bold border border-yellow-400/30 transition-colors"
                            >
                              {isAr ? 'تداول' : 'Trade'}
                            </button>
                          )}

                          <button
                            onClick={() => {
                              setFromCoin(coin.symbol);
                              setToCoin(coin.symbol === 'USDT' ? 'BTC' : 'USDT');
                              setIsConvertOpen(true);
                            }}
                            className="px-2.5 py-1 bg-[#121418] hover:bg-[#282f3a] text-sky-400 rounded-lg text-[11px] font-bold border border-[#2b313a] transition-colors"
                            title={isAr ? 'تحويل فوري' : 'Instant Convert'}
                          >
                            <ArrowDownUp className="w-3 h-3" />
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

        {/* ================= UNIFIED ACTIVITIES LEDGER ================= */}
        <div className="bg-[#181a20] border border-[#2b313a] rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#2b313a]">
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-yellow-400" />
                <span>{isAr ? 'سجل العمليات المالية والإيداعات' : 'Wallet Transactions & Activities'}</span>
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                {isAr
                  ? 'سجل حي لكافة صفقات التداول، عمولات الإحالة، الإيداعات وسحوبات المحفظة.'
                  : 'Live history of all spot trades, referral commissions, deposits, and withdrawal requests.'}
              </p>
            </div>

            {/* Filter buttons */}
            <div className="flex flex-wrap items-center gap-1.5 p-1 bg-[#121418] rounded-xl border border-[#262c35] text-xs">
              {(['ALL', 'SPOT', 'DEPOSIT', 'WITHDRAW', 'REFERRAL'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setHistoryTab(tab)}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                    historyTab === tab ? 'bg-[#2b313a] text-yellow-400 shadow-sm' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {tab === 'ALL' ? (isAr ? 'الكل' : 'All') :
                   tab === 'SPOT' ? (isAr ? 'تداول' : 'Spot') :
                   tab === 'DEPOSIT' ? (isAr ? 'إيداع' : 'Deposit') :
                   tab === 'WITHDRAW' ? (isAr ? 'سحب' : 'Withdrawal') :
                   (isAr ? 'إحالة' : 'Referral')}
                </button>
              ))}
            </div>
          </div>

          {/* Unified Ledger Items */}
          {transactions.length === 0 && deposits.length === 0 && withdrawals.length === 0 ? (
            <div className="py-12 text-center text-xs text-gray-500">
              {isAr ? 'لا توجد حركات مسجلة بعد في هذا القسم.' : 'No transactions recorded yet in this category.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-start">
                <thead>
                  <tr className="border-b border-[#262c35] text-gray-400 font-bold">
                    <th className="py-3 px-3">{isAr ? 'نوع الحركة' : 'Type'}</th>
                    <th className="py-3 px-3">{isAr ? 'التفاصيل' : 'Details'}</th>
                    <th className="py-3 px-3">{isAr ? 'المبلغ' : 'Amount'}</th>
                    <th className="py-3 px-3">{isAr ? 'الحالة' : 'Status'}</th>
                    <th className="py-3 px-3 text-end">{isAr ? 'التاريخ' : 'Date'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#222832]">
                  {/* Deposits */}
                  {deposits.map((d) => (
                    <tr key={d.id || d.txId} className="hover:bg-[#1f242c]/50">
                      <td className="py-3 px-3 font-bold">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-extrabold bg-[#0ECB81]/15 text-[#0ECB81] border border-[#0ECB81]/30">
                          <ArrowDownToLine className="w-3 h-3" />
                          <span>{isAr ? 'إيداع' : 'Deposit'} {d.coin}</span>
                        </span>
                      </td>
                      <td className="py-3 px-3 text-gray-300 font-mono text-[11px]">
                        TxID: {d.txId.slice(0, 14)}... ({d.network})
                      </td>
                      <td className="py-3 px-3 font-mono font-black text-sm text-[#0ECB81]">
                        +{d.amount.toFixed(2)} {d.coin}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          d.status === 'approved' ? 'bg-[#0ECB81]/15 text-[#0ECB81]' : 'bg-yellow-500/15 text-yellow-400'
                        }`}>
                          {d.status === 'approved' ? (isAr ? 'مكتمل ومُضاف' : 'Approved') : (isAr ? 'قيد المراجعة' : 'Pending')}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-end text-gray-400 font-mono">
                        {new Date(d.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}

                  {/* Transactions / Spot Trades / Referrals */}
                  {transactions.map((tx) => (
                    <tr key={tx.id || Math.random().toString()} className="hover:bg-[#1f242c]/50">
                      <td className="py-3 px-3 font-bold">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-extrabold ${
                          tx.type === 'referral_commission'
                            ? 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30'
                            : 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
                        }`}>
                          {tx.type === 'referral_commission' ? <Gift className="w-3 h-3" /> : <ArrowDownUp className="w-3 h-3" />}
                          <span>{tx.type === 'referral_commission' ? (isAr ? 'عمولة إحالة' : 'Referral Reward') : (isAr ? 'تداول فوري' : 'Spot Trade')}</span>
                        </span>
                      </td>
                      <td className="py-3 px-3 text-gray-300 font-mono text-[11px]">
                        {tx.details || (tx.fromUserName ? `From ${tx.fromUserName}` : 'Trading')}
                      </td>
                      <td className={`py-3 px-3 font-mono font-black text-sm ${tx.amount >= 0 ? 'text-[#0ECB81]' : 'text-red-400'}`}>
                        {tx.amount >= 0 ? '+' : ''}${tx.amount.toFixed(2)} USDT
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#0ECB81]/15 text-[#0ECB81]">
                          {isAr ? 'مكتمل' : 'Completed'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-end text-gray-400 font-mono">
                        {new Date(tx.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}

                  {/* Withdrawals */}
                  {withdrawals.map((w) => (
                    <tr key={w.id || Math.random().toString()} className="hover:bg-[#1f242c]/50">
                      <td className="py-3 px-3 font-bold">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-extrabold bg-red-500/15 text-red-400 border border-red-500/30">
                          <ArrowUpRight className="w-3 h-3" />
                          <span>{isAr ? 'سحب' : 'Withdrawal'} {w.coin}</span>
                        </span>
                      </td>
                      <td className="py-3 px-3 text-gray-300 font-mono text-[11px]">
                        Address: {w.walletAddress.slice(0, 12)}...
                      </td>
                      <td className="py-3 px-3 font-mono font-black text-sm text-red-400">
                        -{w.amount.toFixed(2)} {w.coin}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          w.status === 'approved' ? 'bg-[#0ECB81]/15 text-[#0ECB81]' :
                          w.status === 'pending' ? 'bg-yellow-500/15 text-yellow-400' : 'bg-red-500/15 text-red-400'
                        }`}>
                          {w.status === 'approved' ? (isAr ? 'تم التنفيذ' : 'Completed') :
                           w.status === 'pending' ? (isAr ? 'قيد المراجعة' : 'Pending') : (isAr ? 'مرفوض ومُسترجع' : 'Rejected')}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-end text-gray-400 font-mono">
                        {new Date(w.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* ================= INSTANT CONVERT MODAL ================= */}
      {isConvertOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#1e2329] border border-[#2b313a] rounded-3xl p-6 shadow-2xl relative" dir={isAr ? 'rtl' : 'ltr'}>
            <div className="flex items-center justify-between pb-4 border-b border-[#2b313a]">
              <div className="flex items-center gap-2">
                <ArrowDownUp className="w-5 h-5 text-yellow-400" />
                <h3 className="text-base font-black text-white">{isAr ? 'تحويل فوري بين العملات' : 'Instant Crypto Convert'}</h3>
              </div>
              <button onClick={() => setIsConvertOpen(false)} className="text-gray-400 hover:text-white p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            {convertFeedback && (
              <div className={`my-3 p-3 rounded-xl text-xs font-bold ${
                convertFeedback.type === 'success'
                  ? 'bg-[#0ECB81]/15 text-[#0ECB81] border border-[#0ECB81]/30'
                  : 'bg-red-500/15 text-red-400 border border-red-500/30'
              }`}>
                {convertFeedback.message}
              </div>
            )}

            <form onSubmit={handleExecuteConvert} className="py-4 space-y-4 text-xs">
              {/* From Coin */}
              <div>
                <label className="block text-gray-400 font-semibold mb-1">
                  {isAr ? 'من عملة:' : 'From:'}
                </label>
                <div className="grid grid-cols-12 gap-2 items-center">
                  <select
                    value={fromCoin}
                    onChange={(e) => setFromCoin(e.target.value)}
                    className="col-span-5 px-3 py-2.5 bg-[#121418] border border-[#2b313a] rounded-xl text-white font-mono font-bold"
                  >
                    <option value="USDT">USDT</option>
                    {supportedCoins.map((c) => (
                      <option key={c.symbol} value={c.symbol}>
                        {c.symbol} ({c.name})
                      </option>
                    ))}
                  </select>

                  <div className="col-span-7 relative">
                    <input
                      type="number"
                      step="any"
                      required
                      value={convertAmount}
                      onChange={(e) => setConvertAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full px-3 py-2.5 bg-[#121418] border border-[#2b313a] rounded-xl text-white font-mono font-bold"
                    />
                    <button
                      type="button"
                      onClick={() => setConvertAmount((userBalances[fromCoin]?.balance || 0).toString())}
                      className="absolute end-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-yellow-400 hover:underline px-1"
                    >
                      MAX
                    </button>
                  </div>
                </div>
                <span className="text-[10px] text-gray-400 mt-1 block">
                  {isAr ? 'المتاح:' : 'Available:'} {(userBalances[fromCoin]?.balance || 0).toFixed(4)} {fromCoin}
                </span>
              </div>

              {/* To Coin */}
              <div>
                <label className="block text-gray-400 font-semibold mb-1">
                  {isAr ? 'إلى عملة:' : 'To:'}
                </label>
                <div className="grid grid-cols-12 gap-2 items-center">
                  <select
                    value={toCoin}
                    onChange={(e) => setToCoin(e.target.value)}
                    className="col-span-5 px-3 py-2.5 bg-[#121418] border border-[#2b313a] rounded-xl text-white font-mono font-bold"
                  >
                    <option value="USDT">USDT</option>
                    {supportedCoins.map((c) => (
                      <option key={c.symbol} value={c.symbol}>
                        {c.symbol} ({c.name})
                      </option>
                    ))}
                  </select>

                  <div className="col-span-7 px-3 py-2.5 bg-[#121418] border border-[#2b313a] rounded-xl text-yellow-400 font-mono font-bold">
                    ≈ {estimatedReceive.toFixed(toCoin === 'BTC' ? 6 : 4)} {toCoin}
                  </div>
                </div>
              </div>

              {/* Exchange Rate Notice */}
              <div className="p-3 bg-[#121418] border border-[#262c36] rounded-xl text-[11px] text-gray-400 flex items-center justify-between">
                <span>{isAr ? 'سعر الصرف اللحظي:' : 'Market Rate:'}</span>
                <span className="font-mono text-white font-bold">
                  1 {fromCoin} ≈ {((priceMap.get(fromCoin)?.price || 1) / (priceMap.get(toCoin)?.price || 1)).toFixed(6)} {toCoin}
                </span>
              </div>

              <button
                type="submit"
                disabled={convertLoading || !convertAmount}
                className="w-full py-3 bg-[#F0B90B] hover:bg-[#dfaa07] disabled:bg-gray-700 text-black font-black rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-2"
              >
                {convertLoading ? (
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <ArrowDownUp className="w-4 h-4" />
                    <span>{isAr ? 'تأكيد التحويل الآن' : 'Confirm Convert'}</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
