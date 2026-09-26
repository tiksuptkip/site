import React from 'react';
import { TrendingUp, TrendingDown, ArrowUp, ArrowDown, Lock, Zap } from 'lucide-react';
import { CryptoCoin, Language, BinarySettings } from '../types';
import { translations } from '../i18n/translations';
import { getProfitPercentForCoin } from '../services/binaryService';

interface BinaryTradeButtonsProps {
  coin: CryptoCoin;
  lang: Language;
  binarySettings?: BinarySettings;
  onOpenTrade: (direction: 'UP' | 'DOWN') => void;
}

export const BinaryTradeButtons: React.FC<BinaryTradeButtonsProps> = ({
  coin,
  lang,
  binarySettings,
  onOpenTrade,
}) => {
  const t = translations[lang];
  const isEnabled = binarySettings?.enabled !== false;
  const profitPercent = getProfitPercentForCoin(coin.symbol, binarySettings);

  return (
    <div className="bg-[#181a20] border border-[#2b313a] rounded-2xl p-4 sm:p-5 shadow-xl">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-[#262c36]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center text-yellow-400">
            <Zap className="w-4 h-4 fill-yellow-400/20" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-extrabold text-white tracking-wide">
                tiksup {t.binaryTrading}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-400 border border-yellow-500/30">
                +{profitPercent}% {lang === 'ar' ? 'عائد' : 'Payout'}
              </span>
            </div>
            <p className="text-[11px] text-gray-400">
              {lang === 'ar'
                ? `توقع اتجاه سعر ${coin.symbol} خلال ثوانٍ أو دقائق واربح حتى +${profitPercent}%`
                : `Predict ${coin.symbol} price movement within seconds or minutes for +${profitPercent}% profit`}
            </p>
          </div>
        </div>

        {/* Current Reference Live Price */}
        <div className="flex items-center gap-2 bg-[#121418] px-3 py-1.5 rounded-xl border border-[#262c36]">
          <span className="text-[11px] text-gray-400 font-medium">
            {t.binaryCurrentPrice}:
          </span>
          <span className="font-mono text-sm font-black text-white">
            ${coin.currentPrice >= 1 ? coin.currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 }) : coin.currentPrice.toFixed(4)}
          </span>
        </div>
      </div>

      {/* Disabled Notification */}
      {!isEnabled && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-2 text-xs text-red-300 font-medium">
          <Lock className="w-4 h-4 shrink-0" />
          <span>{t.binaryDisabledBanner}</span>
        </div>
      )}

      {/* 2 BIG BUTTONS: [UP - Green] and [DOWN - Red] */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {/* BIG UP BUTTON - GREEN */}
        <button
          type="button"
          disabled={!isEnabled}
          onClick={() => onOpenTrade('UP')}
          className={`group relative overflow-hidden rounded-2xl p-4 sm:p-5 text-start transition-all duration-150 active:scale-[0.98] ${
            isEnabled
              ? 'bg-gradient-to-br from-[#0ECB81] via-[#0bbd77] to-[#08965d] hover:brightness-110 shadow-lg shadow-[#0ECB81]/20 cursor-pointer'
              : 'bg-gray-800/60 opacity-50 cursor-not-allowed'
          }`}
        >
          {/* Subtle glow effect */}
          <div className="absolute top-0 end-0 -mt-4 -me-4 w-28 h-28 bg-white/10 rounded-full blur-xl group-hover:scale-125 transition-transform" />

          <div className="relative flex items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xl sm:text-2xl font-black text-black tracking-tight">
                  {lang === 'ar' ? 'صعود (UP)' : 'UP'}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-black/20 text-black font-extrabold text-xs">
                  +{profitPercent}%
                </span>
              </div>
              <p className="text-xs font-bold text-black/80">
                {lang === 'ar' ? 'سعر الإغلاق > سعر الدخول' : 'Exit Price > Entry Price'}
              </p>
              <p className="text-[11px] text-black/60 font-medium">
                {lang === 'ar' ? 'توقع صعود السعر (CALL)' : 'Predict Higher (CALL)'}
              </p>
            </div>

            <div className="w-12 h-12 rounded-2xl bg-black/20 text-black flex items-center justify-center shrink-0 group-hover:translate-y-[-2px] transition-transform">
              <ArrowUp className="w-7 h-7 stroke-[3]" />
            </div>
          </div>
        </button>

        {/* BIG DOWN BUTTON - RED */}
        <button
          type="button"
          disabled={!isEnabled}
          onClick={() => onOpenTrade('DOWN')}
          className={`group relative overflow-hidden rounded-2xl p-4 sm:p-5 text-start transition-all duration-150 active:scale-[0.98] ${
            isEnabled
              ? 'bg-gradient-to-br from-[#F6465D] via-[#e23b51] to-[#b9263a] hover:brightness-110 shadow-lg shadow-[#F6465D]/20 cursor-pointer'
              : 'bg-gray-800/60 opacity-50 cursor-not-allowed'
          }`}
        >
          {/* Subtle glow effect */}
          <div className="absolute top-0 end-0 -mt-4 -me-4 w-28 h-28 bg-white/10 rounded-full blur-xl group-hover:scale-125 transition-transform" />

          <div className="relative flex items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  {lang === 'ar' ? 'هبوط (DOWN)' : 'DOWN'}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-black/20 text-white font-extrabold text-xs">
                  +{profitPercent}%
                </span>
              </div>
              <p className="text-xs font-bold text-white/90">
                {lang === 'ar' ? 'سعر الإغلاق < سعر الدخول' : 'Exit Price < Entry Price'}
              </p>
              <p className="text-[11px] text-white/70 font-medium">
                {lang === 'ar' ? 'توقع هبوط السعر (PUT)' : 'Predict Lower (PUT)'}
              </p>
            </div>

            <div className="w-12 h-12 rounded-2xl bg-black/20 text-white flex items-center justify-center shrink-0 group-hover:translate-y-[2px] transition-transform">
              <ArrowDown className="w-7 h-7 stroke-[3]" />
            </div>
          </div>
        </button>
      </div>
    </div>
  );
};
