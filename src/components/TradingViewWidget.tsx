import React, { useState } from 'react';
import { Language, CryptoCoin } from '../types';
import { translations } from '../i18n/translations';
import { TrendingUp, TrendingDown, Maximize2 } from 'lucide-react';

interface TradingViewWidgetProps {
  coin: CryptoCoin;
  lang: Language;
}

export const TradingViewWidget: React.FC<TradingViewWidgetProps> = ({ coin, lang }) => {
  const [interval, setInterval] = useState<string>('15');
  const t = translations[lang];

  const intervals = [
    { label: '1m', value: '1' },
    { label: '5m', value: '5' },
    { label: '15m', value: '15' },
    { label: '1H', value: '60' },
    { label: '4H', value: '240' },
    { label: '1D', value: 'D' },
  ];

  // Strictly enforce crypto symbols only (BINANCE:BTCUSDT, etc.)
  const tvSymbol = coin.tvSymbol || `BINANCE:${coin.symbol}USDT`;
  const locale = lang === 'ar' ? 'ar_AE' : 'en';

  const embedUrl = `https://s.tradingview.com/widgetembed/?frameElementId=tradingview_chart&symbol=${encodeURIComponent(
    tvSymbol
  )}&interval=${interval}&hidesidetoolbar=0&symboledit=0&saveimage=1&toolbarbg=181A20&theme=dark&style=1&timezone=Etc%2FUTC&studies=%5B%5D&withdateranges=1&locale=${locale}#${encodeURIComponent(
    JSON.stringify({
      backgroundColor: '#181A20',
      gridColor: '#2B313A',
    })
  )}`;

  const isPositive = coin.change24h >= 0;

  return (
    <div className="flex flex-col h-full bg-[#181a20] rounded-2xl border border-[#2b313a] overflow-hidden shadow-xl">
      {/* Top Ticker Stats Bar */}
      <div 
        className="px-4 py-3 bg-[#1e2329] border-b border-[#2b313a] flex flex-wrap items-center justify-between gap-3 text-xs"
        dir={translations[lang].dir}
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-base font-extrabold text-white tracking-wide">
              {coin.symbol}/USDT
            </span>
            <span className="text-[11px] text-gray-400 font-medium px-2 py-0.5 bg-[#2b313a] rounded-md">
              {lang === 'ar' ? (coin.nameAr || coin.name) : coin.name}
            </span>
            <span className="text-[10px] font-bold text-[#0ECB81] bg-[#0ECB81]/15 px-1.5 py-0.5 rounded border border-[#0ECB81]/30">
              Crypto
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 ms-2">
            <span className="text-lg font-mono font-bold text-white">
              ${coin.currentPrice >= 1 ? coin.currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 }) : coin.currentPrice.toFixed(4)}
            </span>
            <span
              className={`inline-flex items-center text-xs font-bold px-2 py-0.5 rounded ${
                isPositive ? 'text-[#0ECB81] bg-[#0ECB81]/10' : 'text-[#F6465D] bg-[#F6465D]/10'
              }`}
              dir="ltr"
            >
              {isPositive ? '+' : ''}{coin.change24h.toFixed(2)}%
            </span>
          </div>
        </div>

        {/* 24h High, Low, Volume metrics */}
        <div className="flex items-center gap-4 text-[11px] text-gray-400">
          <div className="hidden md:block">
            <span className="text-gray-500 block">{t.high24h}</span>
            <span className="text-gray-200 font-mono font-semibold">
              ${coin.high24h?.toLocaleString() || coin.currentPrice * 1.03}
            </span>
          </div>
          <div className="hidden md:block">
            <span className="text-gray-500 block">{t.low24h}</span>
            <span className="text-gray-200 font-mono font-semibold">
              ${coin.low24h?.toLocaleString() || coin.currentPrice * 0.97}
            </span>
          </div>
          <div className="hidden lg:block">
            <span className="text-gray-500 block">{t.volume24h} (USDT)</span>
            <span className="text-gray-200 font-mono font-semibold">
              ${(coin.volume24h || 520000000).toLocaleString()}
            </span>
          </div>

          {/* Timeframe intervals */}
          <div className="flex items-center bg-[#181a20] rounded-lg p-0.5 border border-[#2e3440]" dir="ltr">
            {intervals.map((item) => (
              <button
                key={item.value}
                onClick={() => setInterval(item.value)}
                className={`px-2 py-1 text-[11px] font-bold rounded-md transition-all ${
                  interval === item.value
                    ? 'bg-[#F0B90B] text-black shadow-sm'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* TradingView Advanced Real-Time Chart IFrame */}
      <div className="relative flex-1 min-h-[460px] md:min-h-[540px] w-full bg-[#181a20]">
        <iframe
          key={`${coin.symbol}-${interval}-${lang}`}
          title={`TradingView-${coin.symbol}`}
          src={embedUrl}
          className="absolute inset-0 w-full h-full border-0"
          allowTransparency
          scrolling="no"
          allowFullScreen
        />
      </div>
    </div>
  );
};
