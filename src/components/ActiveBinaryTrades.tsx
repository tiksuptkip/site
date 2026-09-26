import React, { useState, useEffect, useRef } from 'react';
import { 
  Clock, 
  ArrowUp, 
  ArrowDown, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  TrendingUp, 
  TrendingDown, 
  Sparkles,
  ChevronRight,
  History
} from 'lucide-react';
import { BinaryTrade, CryptoCoin, Language } from '../types';
import { translations } from '../i18n/translations';
import { settleBinaryTrade } from '../services/binaryService';

interface ActiveBinaryTradesProps {
  trades: BinaryTrade[];
  coins: CryptoCoin[];
  lang: Language;
  onTradeSettled?: (tradeId: string, result: 'WIN' | 'LOSS', payout: number) => void;
}

export const ActiveBinaryTrades: React.FC<ActiveBinaryTradesProps> = ({
  trades,
  coins,
  lang,
  onTradeSettled,
}) => {
  const t = translations[lang];

  // Tab: 'ACTIVE' | 'HISTORY'
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'HISTORY'>('ACTIVE');

  // Settlement in-flight set to avoid double settling
  const settlingRef = useRef<Set<string>>(new Set());

  // Recent settlement notification toast
  const [settlementAlert, setSettlementAlert] = useState<{
    id: string;
    coin: string;
    result: 'WIN' | 'LOSS';
    payout: number;
    amount: number;
  } | null>(null);

  // Current timestamp tick for smooth countdown
  const [now, setNow] = useState<number>(Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 500);
    return () => clearInterval(timer);
  }, []);

  // Filter pending trades
  const pendingTrades = trades.filter((tr) => tr.status === 'pending');
  const settledTrades = trades.filter((tr) => tr.status !== 'pending');

  // Auto-settlement trigger when timer ends
  useEffect(() => {
    pendingTrades.forEach(async (trade) => {
      if (!trade.id) return;
      const timeLeft = Math.max(0, Math.floor((trade.endTime - Date.now()) / 1000));

      if (timeLeft <= 0 && !settlingRef.current.has(trade.id)) {
        settlingRef.current.add(trade.id);

        // Find live coin price
        const liveCoin = coins.find((c) => c.symbol.toUpperCase() === trade.coin.toUpperCase());
        const exitPrice = liveCoin?.currentPrice || trade.entryPrice;

        try {
          const res = await settleBinaryTrade(trade.id, exitPrice);

          setSettlementAlert({
            id: trade.id,
            coin: trade.coin,
            result: res.result,
            payout: res.payout,
            amount: trade.amount,
          });

          // Clear toast after 6s
          setTimeout(() => {
            setSettlementAlert(null);
          }, 6000);

          if (onTradeSettled) {
            onTradeSettled(trade.id, res.result, res.payout);
          }
        } catch (err) {
          console.error('Failed to auto-settle binary trade:', err);
          settlingRef.current.delete(trade.id);
        }
      }
    });
  }, [now, pendingTrades, coins, onTradeSettled]);

  return (
    <div className="bg-[#181a20] border border-[#2b313a] rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
      {/* Header Tabs */}
      <div className="flex items-center justify-between border-b border-[#262c36] pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('ACTIVE')}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all ${
              activeTab === 'ACTIVE'
                ? 'bg-[#F0B90B] text-black shadow-sm'
                : 'text-gray-400 hover:text-white bg-[#121418]'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{t.binaryActiveTrades}</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/20 font-black">
              {pendingTrades.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('HISTORY')}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all ${
              activeTab === 'HISTORY'
                ? 'bg-[#F0B90B] text-black shadow-sm'
                : 'text-gray-400 hover:text-white bg-[#121418]'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>{t.binaryHistoryTitle}</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/20 font-black">
              {settledTrades.length}
            </span>
          </button>
        </div>

        <span className="text-[11px] text-gray-500 hidden sm:block">
          {lang === 'ar' ? 'تحديث وتصفية حية فوري' : 'Live Real-Time Settlement'}
        </span>
      </div>

      {/* Floating Settlement Result Banner */}
      {settlementAlert && (
        <div 
          className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 animate-in slide-in-from-top-2 duration-200 ${
            settlementAlert.result === 'WIN'
              ? 'bg-[#0ECB81]/15 border-[#0ECB81]/40 text-[#0ECB81]'
              : 'bg-[#F6465D]/15 border-[#F6465D]/40 text-[#F6465D]'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {settlementAlert.result === 'WIN' ? (
              <CheckCircle2 className="w-6 h-6 shrink-0" />
            ) : (
              <XCircle className="w-6 h-6 shrink-0" />
            )}
            <div>
              <span className="font-black text-sm block">
                {settlementAlert.result === 'WIN' ? t.binaryTradeWon : t.binaryTradeLost}
              </span>
              <span className="text-xs opacity-90 block">
                {settlementAlert.result === 'WIN'
                  ? `${t.binarySettledWonNotice} +$${settlementAlert.payout.toFixed(2)} USDT on ${settlementAlert.coin}!`
                  : `${t.binarySettledLostNotice} (${settlementAlert.coin})`}
              </span>
            </div>
          </div>

          <button
            onClick={() => setSettlementAlert(null)}
            className="text-xs opacity-75 hover:opacity-100 font-bold px-2 py-1 bg-black/20 rounded-lg"
          >
            ✕
          </button>
        </div>
      )}

      {/* ACTIVE TAB CONTENT */}
      {activeTab === 'ACTIVE' && (
        <div className="space-y-3">
          {pendingTrades.length === 0 ? (
            <div className="py-8 text-center text-gray-500 space-y-2 bg-[#121418] rounded-2xl border border-[#222832]">
              <Clock className="w-8 h-8 mx-auto text-gray-600 stroke-[1.5]" />
              <p className="text-xs text-gray-400 font-medium">
                {t.binaryNoActiveTrades}
              </p>
            </div>
          ) : (
            pendingTrades.map((trade) => {
              const liveCoin = coins.find((c) => c.symbol.toUpperCase() === trade.coin.toUpperCase());
              const currentPrice = liveCoin?.currentPrice || trade.entryPrice;

              // Winning status evaluation
              const isWinning =
                trade.direction === 'UP'
                  ? currentPrice > trade.entryPrice
                  : currentPrice < trade.entryPrice;

              const totalDurationMs = trade.durationSeconds * 1000;
              const elapsedMs = Math.max(0, now - trade.startTime);
              const remainingSeconds = Math.max(0, Math.ceil((trade.endTime - now) / 1000));
              const progressPct = Math.min(100, Math.max(0, (elapsedMs / totalDurationMs) * 100));

              // Format minutes and seconds
              const mins = Math.floor(remainingSeconds / 60);
              const secs = remainingSeconds % 60;
              const formattedTime = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

              const potentialPayout = Number((trade.amount + (trade.amount * trade.profitPercent) / 100).toFixed(2));

              return (
                <div
                  key={trade.id}
                  className={`p-4 rounded-2xl border transition-all duration-200 ${
                    isWinning
                      ? 'bg-gradient-to-r from-[#0ECB81]/10 via-[#181a20] to-[#121418] border-[#0ECB81]/30'
                      : 'bg-gradient-to-r from-[#F6465D]/10 via-[#181a20] to-[#121418] border-[#F6465D]/30'
                  }`}
                >
                  {/* Top line: Coin, Direction, Time remaining badge */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-white text-sm">
                        {trade.coin}/USDT
                      </span>

                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-black ${
                          trade.direction === 'UP'
                            ? 'bg-[#0ECB81] text-black shadow-sm'
                            : 'bg-[#F6465D] text-white shadow-sm'
                        }`}
                      >
                        {trade.direction === 'UP' ? (
                          <ArrowUp className="w-3.5 h-3.5 stroke-[3]" />
                        ) : (
                          <ArrowDown className="w-3.5 h-3.5 stroke-[3]" />
                        )}
                        <span>{trade.direction}</span>
                      </span>

                      <span className="text-[11px] text-gray-400 font-mono">
                        ${trade.amount.toFixed(2)} USDT
                      </span>
                    </div>

                    {/* Countdown Timer with animated pulse */}
                    <div className="flex items-center gap-1.5 bg-[#121418] border border-[#2b313a] px-3 py-1 rounded-xl">
                      <span className="w-2 h-2 rounded-full bg-yellow-400 animate-ping shrink-0" />
                      <span className="font-mono text-xs font-black text-yellow-400">
                        {formattedTime}
                      </span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-[#121418] h-1.5 rounded-full overflow-hidden mb-3 border border-[#242a34]">
                    <div
                      className={`h-full transition-all duration-500 ${
                        isWinning ? 'bg-[#0ECB81]' : 'bg-[#F6465D]'
                      }`}
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>

                  {/* Price Comparison & PnL Bar */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div>
                      <span className="text-gray-500 text-[10px] block uppercase">
                        {t.binaryEntryPrice}
                      </span>
                      <span className="font-mono text-gray-300 font-semibold">
                        ${trade.entryPrice}
                      </span>
                    </div>

                    <div>
                      <span className="text-gray-500 text-[10px] block uppercase">
                        {t.binaryLivePrice}
                      </span>
                      <span className="font-mono font-bold text-white">
                        ${currentPrice}
                      </span>
                    </div>

                    <div>
                      <span className="text-gray-500 text-[10px] block uppercase">
                        {t.binaryPotentialPayout}
                      </span>
                      <span className="font-mono font-bold text-[#0ECB81]">
                        ${potentialPayout.toFixed(2)} (+{trade.profitPercent}%)
                      </span>
                    </div>

                    <div className="text-end">
                      <span className="text-gray-500 text-[10px] block uppercase">
                        Live Status
                      </span>
                      <span
                        className={`font-black text-[11px] ${
                          isWinning ? 'text-[#0ECB81]' : 'text-[#F6465D]'
                        }`}
                      >
                        {isWinning ? t.binaryInTheMoney : t.binaryOutOfTheMoney}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* HISTORY TAB CONTENT */}
      {activeTab === 'HISTORY' && (
        <div className="space-y-2 max-h-[360px] overflow-y-auto no-scrollbar">
          {settledTrades.length === 0 ? (
            <div className="py-8 text-center text-gray-500 text-xs bg-[#121418] rounded-2xl border border-[#222832]">
              No settled trades yet.
            </div>
          ) : (
            settledTrades.map((st) => (
              <div
                key={st.id}
                className="p-3 bg-[#121418] rounded-xl border border-[#242932] flex items-center justify-between text-xs gap-3"
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={`p-1.5 rounded-lg ${
                      st.direction === 'UP' ? 'bg-[#0ECB81]/15 text-[#0ECB81]' : 'bg-[#F6465D]/15 text-[#F6465D]'
                    }`}
                  >
                    {st.direction === 'UP' ? (
                      <ArrowUp className="w-3.5 h-3.5 stroke-[3]" />
                    ) : (
                      <ArrowDown className="w-3.5 h-3.5 stroke-[3]" />
                    )}
                  </span>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-white">{st.coin}/USDT</span>
                      <span className="text-[10px] text-gray-500">
                        {st.duration}
                      </span>
                    </div>
                    <span className="font-mono text-[11px] text-gray-400">
                      Entry: ${st.entryPrice} • Exit: ${st.exitPrice || '-'}
                    </span>
                  </div>
                </div>

                <div className="text-end">
                  <span
                    className={`font-black text-xs block ${
                      st.status === 'WIN' ? 'text-[#0ECB81]' : 'text-[#F6465D]'
                    }`}
                  >
                    {st.status === 'WIN' ? `+${st.payout?.toFixed(2)} USDT (WIN)` : `-${st.amount.toFixed(2)} USDT (LOSS)`}
                  </span>
                  <span className="text-[10px] text-gray-500 font-mono">
                    {st.settledAt ? new Date(st.settledAt).toLocaleTimeString() : ''}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
