import React, { useState } from 'react';
import { CryptoCoin, UserProfile, Language } from '../types';
import { translations } from '../i18n/translations';
import { CheckCircle2, AlertCircle } from 'lucide-react';

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
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY');
  const [orderType, setOrderType] = useState<'MARKET' | 'LIMIT'>('LIMIT');
  const [limitPrice, setLimitPrice] = useState<string>(coin.currentPrice.toString());
  const [amount, setAmount] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  const price = orderType === 'MARKET' ? coin.currentPrice : (parseFloat(limitPrice) || coin.currentPrice);
  const numAmount = parseFloat(amount) || 0;
  const totalUsdt = price * numAmount;

  const handlePercentage = (pct: number) => {
    if (side === 'BUY') {
      const maxUsdt = user.walletBalance * (pct / 100);
      if (price > 0) {
        setAmount((maxUsdt / price).toFixed(4));
      }
    } else {
      // Sell simulation
      setAmount(((1.5 * (pct / 100))).toFixed(4));
    }
  };

  const handleExecute = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (numAmount <= 0) {
      setErrorMsg(lang === 'ar' ? 'يرجى إدخال كمية صحيحة' : 'Please enter a valid amount');
      return;
    }

    if (side === 'BUY') {
      if (totalUsdt > user.walletBalance) {
        setErrorMsg(t.insufficientFunds);
        return;
      }
      const newBal = Number((user.walletBalance - totalUsdt).toFixed(2));
      onBalanceChange(newBal);
      setSuccessMsg(`${t.orderSubmitted} (Bought ${numAmount} ${coin.symbol} for ${totalUsdt.toFixed(2)} USDT)`);
    } else {
      // Sell gives USDT back
      const newBal = Number((user.walletBalance + totalUsdt).toFixed(2));
      onBalanceChange(newBal);
      setSuccessMsg(`${t.orderSubmitted} (Sold ${numAmount} ${coin.symbol} for ${totalUsdt.toFixed(2)} USDT)`);
    }

    setAmount('');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

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
            onClick={() => setSide('BUY')}
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
            onClick={() => setSide('SELL')}
            className={`py-2 rounded-xl font-bold text-xs transition-all ${
              side === 'SELL'
                ? 'bg-[#F6465D] text-white shadow-md'
                : 'bg-[#181a20] text-gray-400 hover:text-white'
            }`}
          >
            {t.sell} {coin.symbol}
          </button>
        </div>

        {/* Order Type Tabs */}
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

        {/* Available Balance */}
        <div className="flex justify-between items-center text-[11px] text-gray-400 mb-3 bg-[#181a20] px-3 py-1.5 rounded-lg border border-[#2b313a]">
          <span>{t.availableUSDT}:</span>
          <span className="font-mono text-white font-bold">
            {user.walletBalance.toFixed(2)} USDT
          </span>
        </div>

        {/* Feedback Messages */}
        {errorMsg && (
          <div className="mb-3 p-2 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-1.5 text-[11px] text-red-400 font-medium">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-3 p-2 bg-[#0ECB81]/10 border border-[#0ECB81]/30 rounded-lg flex items-center gap-1.5 text-[11px] text-[#0ECB81] font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>{successMsg}</span>
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

          {/* Amount input */}
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
                onChange={(e) => setAmount(e.target.value)}
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
                className="py-1 bg-[#181a20] hover:bg-[#282f3a] text-gray-400 hover:text-white rounded-lg font-mono text-[10px] font-semibold border border-[#2e3440]"
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

          <button
            type="submit"
            className={`w-full py-2.5 rounded-xl font-bold text-xs transition-all shadow-md active:scale-98 ${
              side === 'BUY'
                ? 'bg-[#0ECB81] hover:bg-[#0bb372] text-black'
                : 'bg-[#F6465D] hover:bg-[#e03a50] text-white'
            }`}
          >
            {side === 'BUY' ? t.placeBuyOrder : t.placeSellOrder} {coin.symbol}
          </button>
        </form>
      </div>
    </div>
  );
};
