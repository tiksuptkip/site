import React, { useState, useEffect } from 'react';
import { 
  X, 
  ArrowUp, 
  ArrowDown, 
  Wallet, 
  Clock, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle2, 
  DollarSign,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { 
  CryptoCoin, 
  UserProfile, 
  Language, 
  BinaryDirection, 
  BinaryDuration, 
  BinarySettings, 
  BinaryTrade 
} from '../types';
import { translations } from '../i18n/translations';
import { 
  DURATION_OPTIONS, 
  getProfitPercentForCoin, 
  createBinaryTrade 
} from '../services/binaryService';

interface BinaryTradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  coin: CryptoCoin;
  initialDirection: BinaryDirection;
  user: UserProfile;
  lang: Language;
  binarySettings?: BinarySettings;
  onTradeCreated: (trade: BinaryTrade, newBalance: number) => void;
}

export const BinaryTradeModal: React.FC<BinaryTradeModalProps> = ({
  isOpen,
  onClose,
  coin,
  initialDirection,
  user,
  lang,
  binarySettings,
  onTradeCreated,
}) => {
  const t = translations[lang];

  const [direction, setDirection] = useState<BinaryDirection>(initialDirection);
  const [selectedDuration, setSelectedDuration] = useState<BinaryDuration>('30s');
  const [amount, setAmount] = useState<string>('50');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    setDirection(initialDirection);
    setError('');
  }, [initialDirection, isOpen]);

  if (!isOpen) return null;

  const profitPercent = getProfitPercentForCoin(coin.symbol, binarySettings);
  const numAmount = parseFloat(amount) || 0;
  const isBalanceSufficient = user.walletBalance >= numAmount && numAmount > 0;
  const netProfit = Number(((numAmount * profitPercent) / 100).toFixed(2));
  const totalPayout = Number((numAmount + netProfit).toFixed(2));

  // Determine allowed durations based on min/max setting
  const minDurationIndex = DURATION_OPTIONS.findIndex((d) => d.label === (binarySettings?.minDuration || '10s'));
  const maxDurationIndex = DURATION_OPTIONS.findIndex((d) => d.label === (binarySettings?.maxDuration || '24h'));
  const safeMinIdx = minDurationIndex >= 0 ? minDurationIndex : 0;
  const safeMaxIdx = maxDurationIndex >= 0 ? maxDurationIndex : DURATION_OPTIONS.length - 1;

  const handlePercentageSelect = (pct: number) => {
    const calculated = (user.walletBalance * pct).toFixed(2);
    setAmount(calculated);
    setError('');
  };

  const handleQuickAmount = (val: number) => {
    setAmount(val.toString());
    setError('');
  };

  const handleConfirmTrade = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const minTrade = binarySettings?.minTrade || 1;
    const maxTrade = binarySettings?.maxTrade || 1000;

    if (numAmount < minTrade) {
      setError(lang === 'ar' ? `الحد الأدنى للصفقة هو ${minTrade} USDT` : `Minimum trade amount is ${minTrade} USDT`);
      return;
    }

    if (numAmount > maxTrade) {
      setError(lang === 'ar' ? `الحد الأقصى للصفقة هو ${maxTrade} USDT` : `Maximum trade amount is ${maxTrade} USDT`);
      return;
    }

    if (numAmount > user.walletBalance) {
      setError(t.binaryInsufficientFunds);
      return;
    }

    setLoading(true);

    try {
      const res = await createBinaryTrade({
        userId: user.uid,
        email: user.email,
        userName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        coin: coin.symbol,
        direction,
        entryPrice: coin.currentPrice,
        amount: numAmount,
        profitPercent,
        duration: selectedDuration,
      });

      onTradeCreated(res.trade, res.newBalance);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error executing binary trade.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      dir={translations[lang].dir}
    >
      <div 
        className="w-full max-w-lg bg-[#181a20] border border-[#2b313a] rounded-3xl p-5 sm:p-7 shadow-2xl relative text-xs text-gray-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#282e38] mb-4">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              direction === 'UP' ? 'bg-[#0ECB81]/15 text-[#0ECB81]' : 'bg-[#F6465D]/15 text-[#F6465D]'
            }`}>
              {direction === 'UP' ? <ArrowUp className="w-5 h-5 stroke-[3]" /> : <ArrowDown className="w-5 h-5 stroke-[3]" />}
            </div>
            <div>
              <h2 className="text-base font-black text-white flex items-center gap-1.5">
                <span>{t.binaryTradeModalTitle}</span>
              </h2>
              <span className="text-[11px] text-gray-400">
                {lang === 'ar' ? 'عقد خيارات ثنائية فوري' : 'Instant Binary Option Contract'}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white rounded-xl hover:bg-[#2b313a] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Selected Coin & Live Reference Box */}
        <div className="mb-4 p-3.5 bg-[#121418] rounded-2xl border border-[#282e38] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#282e38] text-yellow-400 font-black text-xs flex items-center justify-center font-mono">
              {coin.symbol.slice(0, 4)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-extrabold text-white">
                  {coin.symbol}/USDT
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 font-bold">
                  +{profitPercent}% Profit
                </span>
              </div>
              <span className="text-gray-400 text-[11px]">
                {coin.name}
              </span>
            </div>
          </div>

          <div className="text-end">
            <span className="text-[10px] text-gray-500 block uppercase">
              {t.binaryCurrentPrice}
            </span>
            <span className="font-mono text-sm sm:text-base font-bold text-white block">
              ${coin.currentPrice >= 1 ? coin.currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 }) : coin.currentPrice.toFixed(4)}
            </span>
          </div>
        </div>

        {/* Direction Switcher (UP / DOWN) */}
        <div className="mb-4">
          <label className="block text-gray-400 font-semibold mb-1.5">
            {t.binaryTradeDirection}
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setDirection('UP')}
              className={`py-2.5 px-4 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all ${
                direction === 'UP'
                  ? 'bg-[#0ECB81] text-black shadow-lg shadow-[#0ECB81]/25 ring-2 ring-[#0ECB81]/50'
                  : 'bg-[#1e2329] text-gray-400 hover:text-white border border-[#2b313a]'
              }`}
            >
              <ArrowUp className="w-4 h-4 stroke-[3]" />
              <span>{t.binaryCall}</span>
            </button>

            <button
              type="button"
              onClick={() => setDirection('DOWN')}
              className={`py-2.5 px-4 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all ${
                direction === 'DOWN'
                  ? 'bg-[#F6465D] text-white shadow-lg shadow-[#F6465D]/25 ring-2 ring-[#F6465D]/50'
                  : 'bg-[#1e2329] text-gray-400 hover:text-white border border-[#2b313a]'
              }`}
            >
              <ArrowDown className="w-4 h-4 stroke-[3]" />
              <span>{t.binaryPut}</span>
            </button>
          </div>
        </div>

        <form onSubmit={handleConfirmTrade} className="space-y-4">
          {/* Duration Selector */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-gray-400 font-semibold flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-yellow-400" />
                <span>{t.binarySelectDuration}</span>
              </label>
              <span className="text-[11px] text-yellow-400 font-bold">
                {DURATION_OPTIONS.find((d) => d.label === selectedDuration)?.label}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {DURATION_OPTIONS.map((item, idx) => {
                const isAllowed = idx >= safeMinIdx && idx <= safeMaxIdx;
                const isSelected = selectedDuration === item.label;

                return (
                  <button
                    key={item.label}
                    type="button"
                    disabled={!isAllowed}
                    onClick={() => setSelectedDuration(item.label)}
                    className={`py-2 px-1 rounded-xl text-center font-bold text-xs transition-all ${
                      isSelected
                        ? 'bg-[#F0B90B] text-black shadow-md'
                        : isAllowed
                        ? 'bg-[#121418] hover:bg-[#1e2329] text-gray-300 border border-[#282e38]'
                        : 'bg-[#121418]/40 text-gray-600 border border-[#20242c] cursor-not-allowed'
                    }`}
                  >
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Amount USDT Input with balance check */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-gray-400 font-semibold flex items-center gap-1">
                <Wallet className="w-3.5 h-3.5 text-[#0ECB81]" />
                <span>{t.binaryInputAmount}</span>
              </label>

              <div className="flex items-center gap-1 text-[11px]">
                <span className="text-gray-400">{t.binaryAvailableBalance}:</span>
                <span className="font-mono font-bold text-yellow-400">
                  {user.walletBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT
                </span>
              </div>
            </div>

            <div className="relative">
              <input
                type="number"
                step="any"
                min="1"
                max={user.walletBalance}
                required
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setError('');
                }}
                placeholder="100.00"
                className="w-full px-3.5 py-2.5 bg-[#121418] border border-[#2b313a] rounded-xl text-white font-mono text-sm focus:outline-none focus:border-[#F0B90B]"
              />
              <span className="absolute inset-y-0 end-0 pe-3 flex items-center font-bold text-yellow-400 text-xs">
                USDT
              </span>
            </div>

            {/* Quick Chips & Percentages */}
            <div className="flex items-center justify-between gap-1.5 mt-2">
              <div className="flex items-center gap-1">
                {[10, 50, 100, 250].map((quick) => (
                  <button
                    key={quick}
                    type="button"
                    onClick={() => handleQuickAmount(quick)}
                    className="px-2 py-1 bg-[#1e2329] hover:bg-[#282e38] text-gray-300 rounded-lg text-[10px] font-bold border border-[#282e38]"
                  >
                    ${quick}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1">
                {[
                  { label: '25%', val: 0.25 },
                  { label: '50%', val: 0.5 },
                  { label: '100%', val: 1.0 },
                ].map((pct) => (
                  <button
                    key={pct.label}
                    type="button"
                    onClick={() => handlePercentageSelect(pct.val)}
                    className="px-2 py-1 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 rounded-lg text-[10px] font-bold border border-yellow-500/20"
                  >
                    {pct.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Profit & Payout Calculation Box */}
          <div className="p-3.5 bg-[#121418] rounded-2xl border border-[#282e38] space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">{t.binaryExpectedProfit}:</span>
              <span className="font-extrabold text-[#0ECB81] font-mono">
                +{profitPercent}%
              </span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">{t.binaryNetProfit}:</span>
              <span className="font-bold text-yellow-400 font-mono">
                +{netProfit.toFixed(2)} USDT
              </span>
            </div>

            <div className="flex items-center justify-between text-xs pt-1.5 border-t border-[#242932]">
              <span className="font-bold text-white">{t.binaryPotentialPayout}:</span>
              <span className="font-mono text-sm font-black text-[#0ECB81]">
                ${totalPayout.toFixed(2)} USDT
              </span>
            </div>

            <div className="text-[10px] text-gray-500 pt-1">
              • {t.binaryLossNotice}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-2 text-red-300 font-medium text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Confirm Button */}
          <button
            type="submit"
            disabled={loading || !isBalanceSufficient}
            className={`w-full py-3.5 font-black text-sm rounded-2xl transition-all shadow-xl active:scale-[0.98] flex items-center justify-center gap-2 ${
              direction === 'UP'
                ? 'bg-[#0ECB81] hover:bg-[#0bb573] text-black shadow-[#0ECB81]/25 disabled:bg-gray-700 disabled:text-gray-400'
                : 'bg-[#F6465D] hover:bg-[#e03a50] text-white shadow-[#F6465D]/25 disabled:bg-gray-700 disabled:text-gray-400'
            }`}
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                {direction === 'UP' ? <ArrowUp className="w-4 h-4 stroke-[3]" /> : <ArrowDown className="w-4 h-4 stroke-[3]" />}
                <span>
                  {direction === 'UP' ? t.binaryConfirmUp : t.binaryConfirmDown} (${numAmount.toFixed(2)} USDT)
                </span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
