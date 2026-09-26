import React, { useState, useMemo } from 'react';
import { Search, Star, TrendingUp, TrendingDown, Layers } from 'lucide-react';
import { CryptoCoin, CryptoFilter, Language } from '../types';
import { translations } from '../i18n/translations';

interface CryptoSidebarProps {
  coins: CryptoCoin[];
  selectedCoin: CryptoCoin;
  onSelectCoin: (coin: CryptoCoin) => void;
  lang: Language;
}

export const CryptoSidebar: React.FC<CryptoSidebarProps> = ({
  coins,
  selectedCoin,
  onSelectCoin,
  lang,
}) => {
  const t = translations[lang];
  const [filter, setFilter] = useState<CryptoFilter>('all');
  const [search, setSearch] = useState<string>('');
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('tiksup_favorites') || localStorage.getItem('bitex_favorites');
      return saved ? JSON.parse(saved) : ['BTC', 'ETH', 'SOL'];
    } catch {
      return ['BTC', 'ETH', 'SOL'];
    }
  });

  const toggleFavorite = (e: React.MouseEvent, symbol: string) => {
    e.stopPropagation();
    setFavorites((prev) => {
      const next = prev.includes(symbol)
        ? prev.filter((s) => s !== symbol)
        : [...prev, symbol];
      try {
        localStorage.setItem('tiksup_favorites', JSON.stringify(next));
      } catch (err) {
        console.warn('Could not save favorites:', err);
      }
      return next;
    });
  };

  // Filter only enabled coins
  const activeCoins = useMemo(() => {
    return coins.filter((c) => c.enabled !== false);
  }, [coins]);

  const filteredCoins = useMemo(() => {
    let result = [...activeCoins];

    // Search query
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (c) =>
          c.symbol.toLowerCase().includes(q) ||
          c.name.toLowerCase().includes(q) ||
          (c.nameAr && c.nameAr.toLowerCase().includes(q))
      );
    }

    // Filter tabs
    switch (filter) {
      case 'gainers':
        return result.sort((a, b) => b.change24h - a.change24h);
      case 'losers':
        return result.sort((a, b) => a.change24h - b.change24h);
      case 'favorites':
        return result.filter((c) => favorites.includes(c.symbol));
      default:
        return result;
    }
  }, [activeCoins, search, filter, favorites]);

  return (
    <div 
      className="bg-[#1e2329] border border-[#2b313a] rounded-2xl flex flex-col h-full shadow-lg overflow-hidden"
      dir={translations[lang].dir}
    >
      {/* Header & Search */}
      <div className="p-3 border-b border-[#2b313a] space-y-2.5">
        <div className="relative">
          <Search className={`w-4 h-4 text-gray-400 absolute top-2.5 ${lang === 'ar' ? 'right-3' : 'left-3'}`} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.searchCryptoPlaceholder}
            className={`w-full py-2 bg-[#181a20] border border-[#2e3440] rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#F0B90B] ${
              lang === 'ar' ? 'pr-9 pl-3 text-right' : 'pl-9 pr-3 text-left'
            }`}
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar text-xs">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg font-semibold shrink-0 transition-all ${
              filter === 'all'
                ? 'bg-[#F0B90B] text-black shadow-sm'
                : 'text-gray-400 hover:text-white bg-[#181a20]'
            }`}
          >
            {t.allCrypto}
          </button>
          <button
            onClick={() => setFilter('gainers')}
            className={`px-3 py-1.5 rounded-lg font-semibold shrink-0 transition-all flex items-center gap-1 ${
              filter === 'gainers'
                ? 'bg-[#0ECB81] text-black shadow-sm'
                : 'text-gray-400 hover:text-[#0ECB81] bg-[#181a20]'
            }`}
          >
            <TrendingUp className="w-3 h-3" />
            {t.topGainers}
          </button>
          <button
            onClick={() => setFilter('losers')}
            className={`px-3 py-1.5 rounded-lg font-semibold shrink-0 transition-all flex items-center gap-1 ${
              filter === 'losers'
                ? 'bg-[#F6465D] text-white shadow-sm'
                : 'text-gray-400 hover:text-[#F6465D] bg-[#181a20]'
            }`}
          >
            <TrendingDown className="w-3 h-3" />
            {t.topLosers}
          </button>
          <button
            onClick={() => setFilter('favorites')}
            className={`px-3 py-1.5 rounded-lg font-semibold shrink-0 transition-all flex items-center gap-1 ${
              filter === 'favorites'
                ? 'bg-yellow-400 text-black shadow-sm'
                : 'text-gray-400 hover:text-yellow-400 bg-[#181a20]'
            }`}
          >
            <Star className="w-3 h-3 fill-current" />
            {t.favorites}
          </button>
        </div>
      </div>

      {/* Crypto Coin Table List */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#282e38]">
        {filteredCoins.length === 0 ? (
          <div className="p-6 text-center text-xs text-gray-500">
            {t.noCoinsFound}
          </div>
        ) : (
          filteredCoins.map((coin) => {
            const isSelected = selectedCoin.symbol === coin.symbol;
            const isFav = favorites.includes(coin.symbol);
            const isUp = coin.change24h >= 0;

            return (
              <div
                key={coin.symbol}
                onClick={() => onSelectCoin(coin)}
                className={`px-3.5 py-2.5 flex items-center justify-between cursor-pointer transition-all hover:bg-[#252b35] ${
                  isSelected ? 'bg-[#282f3a] border-l-2 border-r-2 border-[#F0B90B]' : ''
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={(e) => toggleFavorite(e, coin.symbol)}
                    className="text-gray-500 hover:text-yellow-400 p-0.5"
                  >
                    <Star
                      className={`w-3.5 h-3.5 transition-colors ${
                        isFav ? 'text-yellow-400 fill-yellow-400' : ''
                      }`}
                    />
                  </button>

                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-extrabold text-white text-xs">
                        {coin.symbol}
                      </span>
                      <span className="text-[10px] text-gray-500">
                        /USDT
                      </span>
                    </div>
                    <span className="text-[10px] text-gray-400 block truncate max-w-[90px]">
                      {lang === 'ar' ? (coin.nameAr || coin.name) : coin.name}
                    </span>
                  </div>
                </div>

                <div className="text-end" dir="ltr">
                  <div className="font-mono text-xs font-bold text-white">
                    ${coin.currentPrice >= 1 ? coin.currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 }) : coin.currentPrice.toFixed(4)}
                  </div>
                  <div
                    className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      isUp ? 'text-[#0ECB81] bg-[#0ECB81]/10' : 'text-[#F6465D] bg-[#F6465D]/10'
                    }`}
                  >
                    {isUp ? '+' : ''}{coin.change24h.toFixed(2)}%
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
