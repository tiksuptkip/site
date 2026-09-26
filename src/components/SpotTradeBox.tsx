import React, { useState, useEffect } from 'react';
import { CryptoCoin, UserProfile, Language, CoinBalance } from '../types';
import { translations } from '../i18n/translations';
import { CheckCircle2, AlertCircle, ShieldAlert, ArrowDownUp } from 'lucide-react';
import { subscribeUserBalances, executeSpotTrade } from '../services/walletService';

interface SpotTradeBoxProps {
  coin: CryptoCoin;
  user: UserProfile;
  lang: Language;
  onBalanceChange: (newBalance: number) => void;
}

export const SpotTradeBox: React.FC<SpotTradeBoxProps> = ({
  coin,
  user,
  lang,
  onBalanceChange,
}) => {
  const t = translations[lang];
  const isAr = lang === 'ar';

  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY');
  const [orderType, setOrderType] = useState<'MARKET' | 'LIMIT'>('LIMIT');
  const [limitPrice, setLimitPrice] = useState<string>(coin.currentPrice.toString());
  
  // FIX: Amount field default MUST be 0 / empty string. Never auto-fill 1.5 BTC!
  const [amount, setAmount] = useState<string>('');
  
  const [userBalances, setUserBalances] = useState<Record<string, CoinBalance>>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Keep limit price in sync if coin changes
  useEffect(() => {
    setLimitPrice(coin.currentPrice.toString());
  }, [coin.symbol, coin.currentPrice]);

  // Real-time live multi-currency balances subscription
  useEffect(() => {
    if (!user?.uid) return;
    const unsub = subscribeUserBalances(user.uid, (balances) => {
      setUserBalances(balances);
    });
    return () => unsub();
  }, [user?.uid]);

  const price = orderType === 'MARKET' ? coin.currentPrice : (parseFloat(limitPrice) || coin.currentPrice);
  const numAmount = parseFloat(amount) || 0;
  const totalUsdt = Number((price * numAmount).toFixed(4));

  const cleanSymbol = coin.symbol.toUpperCase();
  const availableUsdt = userBalances['USDT']?.balance ?? (user.walletBalance || 0);
  const availableCoin = userBalances[cleanSymbol]?.balance ?? 0;

  // Percentage quick selectors calculation
  const handlePercentage = (pct: number) => {
    setErrorMsg('');
    if (side === 'BUY') {
      const maxUsdt = availableUsdt * (pct / 100);
      if (price > 0) {
        const calculated = maxUsdt / price;
        const decimals = cleanSymbol === 'BTC' ? 6 : 4;
        setAmount(calculated > 0 ? calculated.toFixed(decimals) : '');
      }
    } else {
      // SELL: calculate exact percent of available real coin balance
      if (availableCoin <= 0) {
        setAmount('');
        setErrorMsg(isAr ? 'لا يوجد رصيد متاح للبيع - تواصل مع الإدارة' : `No balance in ${cleanSymbol} - Contact admin`);
        return;
      }
      const maxCoin = availableCoin * (pct / 100);
      const decimals = cleanSymbol === 'BTC' ? 6 : 4;
      setAmount(maxCoin > 0 ? maxCoin.toFixed(decimals) : '');
    }
  };

  const handleExecute = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (numAmount <= 0) {
      setErrorMsg(isAr ? 'يرجى إدخال كمية صحيحة' : 'Please enter a valid amount');
      return;
    }

    if (side === 'BUY') {
      if (totalUsdt > availableUsdt) {
        setErrorMsg(isAr ? `الرصيد المتاح غير كافٍ (${availableUsdt.toFixed(2)} USDT)` : `Insufficient USDT balance (Available: ${availableUsdt.toFixed(2)} USDT)`);
        return;
      }
    } else {
      if (availableCoin <= 0) {
        setErrorMsg(isAr ? `لا يوجد رصيد في ${cleanSymbol} - تواصل مع الإدارة` : `No balance in ${cleanSymbol} - Contact admin`);
        return;
      }
      if (numAmount > availableCoin) {
        setErrorMsg(isAr ? `الرصيد غير كافٍ. المتاح: ${availableCoin} ${cleanSymbol}` : `Insufficient ${cleanSymbol} balance (Available: ${availableCoin})`);
        return;
      }
    }

    setIsSubmitting(true);

    try {
      // Backend / Firestore validation and real execution
      const result = await executeSpotTrade(
        user.uid,
        user.email,
        coin.symbol,
        side,
        numAmount,
        price
      );

      if (!result.success) {
        setErrorMsg(result.error || (isAr ? 'فشل تنفيذ الصفقة' : 'Trade execution failed.'));
      } else {
        if (result.newUsdtBalance !== undefined) {
          onBalanceChange(result.newUsdtBalance);
        }
        setSuccessMsg(
          side === 'BUY'
            ? (isAr ? `تم شراء ${numAmount} ${cleanSymbol} بنجاح مقابل ${result.totalUsdt?.toFixed(2)} USDT` : `Bought ${numAmount} ${cleanSymbol} for ${result.totalUsdt?.toFixed(2)} USDT`)
            : (isAr ? `تم بيع ${numAmount} ${cleanSymbol} بنجاح واستلام ${result.totalUsdt?.toFixed(2)} USDT` : `Sold ${numAmount} ${cleanSymbol} for ${result.totalUsdt?.toFixed(2)} USDT`)
        );
        setAmount('');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Trade execution error.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isSellDisabled = side === 'SELL' && availableCoin <= 0;
  const isBuyDisabled = side === 'BUY' && availableUsdt <= 0;

  return (
    <div 
      className="bg-[#1e2329] border border-[#2b313a] rounded-2xl p-4 shadow-lg flex flex-col justify-between"
      dir={translations[lang].dir}
    >
      <div>
        {/* Buy / Sell Tabs */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <button
            type="button"
            onClick={() => {
              setSide('BUY');
              setErrorMsg('');
              setAmount('');
            }}
            className={`py-2 rounded-xl font-bold text-xs transition-all ${
              side === 'BUY'
                ? 'bg-[#0ECB81] text-black shadow-md'
                : 'bg-[#181a20] text-gray-400 hover:text-white'
            }`}
          >
            {t.buy} {coin.symbol}
          </button>
          <button
            type="button"
            onClick={() => {
              setSide('SELL');
              setErrorMsg('');
              setAmount('');
            }}
            className={`py-2 rounded-xl font-bold text-xs transition-all ${
              side === 'SELL'
                ? 'bg-[#F6465D] text-white shadow-md'
                : 'bg-[#181a20] text-gray-400 hover:text-white'
            }`}
          >
            {t.sell} {coin.symbol}
          </button>
        </div>

        {/* Order Type Tabs (LIMIT / MARKET) */}
        <div className="flex items-center gap-2 mb-3 text-xs">
          <button
            type="button"
            onClick={() => setOrderType('LIMIT')}
            className={`px-3 py-1 rounded-lg font-semibold ${
              orderType === 'LIMIT' ? 'text-yellow-400 bg-yellow-400/10' : 'text-gray-400 hover:text-white'
            }`}
          >
            {t.limitOrder}
          </button>
          <button
            type="button"
            onClick={() => setOrderType('MARKET')}
            className={`px-3 py-1 rounded-lg font-semibold ${
              orderType === 'MARKET' ? 'text-yellow-400 bg-yellow-400/10' : 'text-gray-400 hover:text-white'
            }`}
          >
            {t.marketOrder}
          </button>
        </div>

        {/* Available Balance Indicator */}
        <div className="flex justify-between items-center text-[11px] text-gray-400 mb-3 bg-[#181a20] px-3 py-2 rounded-lg border border-[#2b313a]">
          <span>{side === 'BUY' ? (isAr ? 'الرصيد المتاح (USDT):' : 'Available (USDT):') : (isAr ? `الرصيد المتاح (${cleanSymbol}):` : `Available (${cleanSymbol}):`)}</span>
          <span className="font-mono text-white font-black">
            {side === 'BUY'
              ? `${availableUsdt.toFixed(2)} USDT`
              : `${availableCoin.toFixed(cleanSymbol === 'BTC' ? 6 : 4)} ${cleanSymbol}`}
          </span>
        </div>

        {/* Feedback Alerts */}
        {errorMsg && (
          <div className="mb-3 p-2.5 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-2 text-[11px] text-red-400 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-3 p-2.5 bg-[#0ECB81]/10 border border-[#0ECB81]/30 rounded-xl flex items-center gap-2 text-[11px] text-[#0ECB81] font-medium">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* No Balance Banner when SELL is selected and user has 0 of that coin */}
        {side === 'SELL' && availableCoin <= 0 && (
          <div className="mb-3 p-2.5 bg-yellow-500/10 border border-yellow-500/30 rounded-xl flex items-center gap-2 text-[11px] text-yellow-300 font-bold">
            <ShieldAlert className="w-4 h-4 shrink-0 text-yellow-400" />
            <span>{isAr ? 'لا يوجد رصيد متاح للبيع - تواصل مع الإدارة' : 'No balance - Contact admin'}</span>
          </div>
        )}

        <form onSubmit={handleExecute} className="space-y-3 text-xs">
          {/* Price input */}
          {orderType === 'LIMIT' && (
            <div>
              <label className="block text-gray-400 text-[11px] mb-1 font-semibold">
                {t.orderPrice}
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  value={limitPrice}
                  onChange={(e) => setLimitPrice(e.target.value)}
                  className="w-full px-3 py-2 bg-[#181a20] border border-[#2e3440] rounded-xl text-white font-mono focus:outline-none focus:border-[#F0B90B]"
                />
                <span className="absolute inset-y-0 end-0 pe-3 flex items-center text-[11px] font-bold text-gray-400">
                  USDT
                </span>
              </div>
            </div>
          )}

          {/* Amount input - DEFAULT 0 / EMPTY, NO AUTO-FILL */}
          <div>
            <label className="block text-gray-400 text-[11px] mb-1 font-semibold">
              {t.orderAmount}
            </label>
            <div className="relative">
              <input
                type="number"
                step="any"
                required
                value={amount}
                onChange={(e) => {
                  setErrorMsg('');
                  setAmount(e.target.value);
                }}
                placeholder="0.00"
                className="w-full px-3 py-2 bg-[#181a20] border border-[#2e3440] rounded-xl text-white font-mono focus:outline-none focus:border-[#F0B90B]"
              />
              <span className="absolute inset-y-0 end-0 pe-3 flex items-center text-[11px] font-bold text-gray-400">
                {coin.symbol}
              </span>
            </div>
          </div>

          {/* Percentage Quick Selectors */}
          <div className="grid grid-cols-4 gap-1.5 py-1">
            {[25, 50, 75, 100].map((pct) => (
              <button
                key={pct}
                type="button"
                onClick={() => handlePercentage(pct)}
                className="py-1 bg-[#181a20] hover:bg-[#282f3a] text-gray-400 hover:text-white rounded-lg font-mono text-[10px] font-semibold border border-[#2e3440] transition-colors"
              >
                {pct}%
              </button>
            ))}
          </div>

          {/* Total calculation */}
          <div className="flex justify-between items-center text-xs py-2 border-t border-[#2b313a]">
            <span className="text-gray-400">{t.orderTotal}:</span>
            <span className="font-mono text-sm font-bold text-yellow-400">
              {totalUsdt.toFixed(2)} USDT
            </span>
          </div>

          {/* Submit Action Button */}
          <button
            type="submit"
            disabled={isSubmitting || isSellDisabled || isBuyDisabled}
            className={`w-full py-2.5 rounded-xl font-black text-xs transition-all shadow-md active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed ${
              side === 'BUY'
                ? 'bg-[#0ECB81] hover:bg-[#0bb372] text-black'
                : 'bg-[#F6465D] hover:bg-[#e03a50] text-white'
            }`}
          >
            {isSubmitting ? (
              <div className="flex items-center justify-center gap-1.5">
                <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                <span>{isAr ? 'جاري التنفيذ...' : 'Executing...'}</span>
              </div>
            ) : isSellDisabled ? (
              <span>{isAr ? 'لا يوجد رصيد - تواصل مع الإدارة' : 'No balance - Contact admin'}</span>
            ) : isBuyDisabled ? (
              <span>{isAr ? 'رصيد USDT غير كافٍ' : 'Insufficient USDT Balance'}</span>
            ) : (
              <span>{side === 'BUY' ? t.placeBuyOrder : t.placeSellOrder} {coin.symbol}</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
