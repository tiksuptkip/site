import React, { useState, useEffect } from 'react';
import { 
  UserProfile, 
  SiteSettings, 
  CryptoCoin, 
  Language,
  BinaryDirection,
  BinaryTrade
} from '../types';
import { translations } from '../i18n/translations';
import { Header } from '../components/Header';
import { TradingViewWidget } from '../components/TradingViewWidget';
import { CryptoSidebar } from '../components/CryptoSidebar';
import { UserInfoCard } from '../components/UserInfoCard';
import { SpotTradeBox } from '../components/SpotTradeBox';
import { DepositModal } from '../components/DepositModal';
import { WithdrawModal } from '../components/WithdrawModal';
import { BinaryTradeButtons } from '../components/BinaryTradeButtons';
import { BinaryTradeModal } from '../components/BinaryTradeModal';
import { ActiveBinaryTrades } from '../components/ActiveBinaryTrades';
import { 
  subscribeCryptoCoins, 
  INITIAL_CRYPTO_COINS 
} from '../services/cryptoService';
import { subscribeUserProfile, saveUserProfile } from '../services/userService';
import { subscribeUserBinaryTrades } from '../services/binaryService';

interface HomePageProps {
  user: UserProfile;
  siteSettings: SiteSettings;
  lang: Language;
  onLanguageChange: (lang: Language) => void;
  onSignOut: () => void;
  onNavigateLogin: () => void;
  onNavigateDeposit: () => void;
  onNavigateWithdraw: () => void;
  onNavigateTelegram: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  user: initialUser,
  siteSettings,
  lang,
  onLanguageChange,
  onSignOut,
  onNavigateLogin,
  onNavigateDeposit,
  onNavigateWithdraw,
  onNavigateTelegram,
}) => {
  const t = translations[lang];

  // Dynamic user profile synced with Firestore in real-time
  const [user, setUser] = useState<UserProfile>(initialUser);

  // Dynamic crypto coins list synced with Firestore
  const [coins, setCoins] = useState<CryptoCoin[]>(INITIAL_CRYPTO_COINS);
  const [selectedCoin, setSelectedCoin] = useState<CryptoCoin>(INITIAL_CRYPTO_COINS[0]);

  // Binary Trading State
  const [isBinaryModalOpen, setIsBinaryModalOpen] = useState(false);
  const [binaryDirection, setBinaryDirection] = useState<BinaryDirection>('UP');
  const [binaryTrades, setBinaryTrades] = useState<BinaryTrade[]>([]);

  // Modals state
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);

  // Subscribe to real-time user profile (picks up balance additions from admin instantly)
  useEffect(() => {
    if (!initialUser?.uid) return;
    const unsubscribe = subscribeUserProfile(initialUser.uid, (updatedProfile) => {
      if (updatedProfile) {
        setUser(updatedProfile);
      }
    });
    return () => unsubscribe();
  }, [initialUser?.uid]);

  // Subscribe to real-time binary trades for this user
  useEffect(() => {
    if (!user.uid) return;
    const unsubscribe = subscribeUserBinaryTrades(user.uid, (trades) => {
      setBinaryTrades(trades);
    });
    return () => unsubscribe();
  }, [user.uid]);

  // Subscribe to crypto coins list from Firestore
  useEffect(() => {
    const unsubscribe = subscribeCryptoCoins((liveCoins) => {
      if (liveCoins && liveCoins.length > 0) {
        setCoins(liveCoins);
        const stillExists = liveCoins.find((c) => c.symbol === selectedCoin.symbol);
        if (!stillExists) {
          const firstEnabled = liveCoins.find((c) => c.enabled !== false) || liveCoins[0];
          setSelectedCoin(firstEnabled);
        }
      }
    });
    return () => unsubscribe();
  }, [selectedCoin.symbol]);

  // Subtle live price fluctuation simulation
  useEffect(() => {
    const interval = setInterval(() => {
      setCoins((prevCoins) =>
        prevCoins.map((coin) => {
          const deltaPct = (Math.random() - 0.49) * 0.2;
          const newPrice = Number((coin.currentPrice * (1 + deltaPct / 100)).toFixed(coin.currentPrice > 10 ? 2 : 4));
          return {
            ...coin,
            currentPrice: newPrice,
          };
        })
      );
    }, 4500);

    return () => clearInterval(interval);
  }, []);

  const handleBalanceChange = async (newBalance: number) => {
    const updated = { ...user, walletBalance: newBalance };
    setUser(updated);
    await saveUserProfile(updated);
  };

  const handleOpenBinaryTrade = (direction: BinaryDirection) => {
    setBinaryDirection(direction);
    setIsBinaryModalOpen(true);
  };

  return (
    <div 
      className="min-h-screen bg-[#0b0e11] text-gray-200 flex flex-col font-sans"
      dir={translations[lang].dir}
    >
      {/* Global Dynamic Header */}
      <Header
        siteSettings={siteSettings}
        user={user}
        lang={lang}
        onLanguageChange={onLanguageChange}
        onOpenDeposit={() => onNavigateDeposit()}
        onOpenWithdraw={() => onNavigateWithdraw()}
        onNavigateTelegram={onNavigateTelegram}
        onSignOut={onSignOut}
        onNavigateHome={() => {}}
        onNavigateLogin={onNavigateLogin}
      />

      {/* Global Announcement Banner if configured */}
      {siteSettings.announcement && (
        <div className="bg-gradient-to-r from-yellow-500/10 via-amber-500/15 to-yellow-500/10 border-b border-yellow-500/20 px-4 py-2 text-center text-xs text-yellow-300 font-medium flex items-center justify-center gap-2">
          <span className="w-2 h-2 rounded-full bg-yellow-400 animate-ping shrink-0" />
          <span>{siteSettings.announcement}</span>
        </div>
      )}

      {/* Main Trading Workspace */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto p-3 sm:p-4 lg:p-6 space-y-4">
        {/* User Info Card (Name, Email, Wallet Balance USDT, My Subscriptions Countdown) */}
        <UserInfoCard
          user={user}
          lang={lang}
          onOpenDeposit={() => onNavigateDeposit()}
          onOpenWithdraw={() => onNavigateWithdraw()}
          onNavigateTelegram={onNavigateTelegram}
        />

        {/* Trading Section: Chart, Sidebar, Trade Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* Left / Main: TradingView Advanced Crypto-Only Chart (8 cols on lg) */}
          <div className="lg:col-span-8 flex flex-col gap-4">
            <div className="h-[520px] sm:h-[580px] lg:h-[620px]">
              <TradingViewWidget
                coin={selectedCoin}
                lang={lang}
              />
            </div>

            {/* 2 BIG BUTTONS BELOW TRADINGVIEW CHART: [UP - Green] and [DOWN - Red] */}
            <BinaryTradeButtons
              coin={selectedCoin}
              lang={lang}
              binarySettings={siteSettings.binarySettings}
              onOpenTrade={handleOpenBinaryTrade}
            />

            {/* LIVE COUNTDOWN TIMER & ACTIVE BINARY TRADES */}
            <ActiveBinaryTrades
              trades={binaryTrades}
              coins={coins}
              lang={lang}
              onTradeSettled={(tradeId, result, payout) => {
                if (result === 'WIN') {
                  setUser((prev) => ({
                    ...prev,
                    walletBalance: Number((prev.walletBalance + payout).toFixed(2)),
                  }));
                }
              }}
            />
          </div>

          {/* Right Column: Crypto Sidebar & Spot Trade (4 cols on lg) */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            {/* Sidebar list of all crypto coins */}
            <div className="h-[380px] lg:h-[400px]">
              <CryptoSidebar
                coins={coins}
                selectedCoin={selectedCoin}
                onSelectCoin={(coin) => setSelectedCoin(coin)}
                lang={lang}
              />
            </div>

            {/* Spot Trading Execution Box */}
            <div>
              <SpotTradeBox
                coin={selectedCoin}
                user={user}
                lang={lang}
                onBalanceChange={handleBalanceChange}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-[#121418] border-t border-[#1f242c] py-4 px-6 text-center text-xs text-gray-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            © {new Date().getFullYear()} {siteSettings.siteName || 'tiksup'}. {lang === 'ar' ? 'جميع الحقوق محفوظة. تداول الأصول الرقمية والخيارات الثنائية.' : 'All rights reserved. Digital Crypto & Binary Exchange.'}
          </span>
          <div className="flex items-center gap-4 text-gray-400">
            <span className="hover:text-yellow-400 cursor-pointer">{t.termsAndConditions}</span>
            <span>•</span>
            <span className="text-[#0ECB81] font-semibold">{t.cryptoOnlyNotice}</span>
          </div>
        </div>
      </footer>

      {/* Binary Trade Modal */}
      <BinaryTradeModal
        isOpen={isBinaryModalOpen}
        onClose={() => setIsBinaryModalOpen(false)}
        coin={selectedCoin}
        initialDirection={binaryDirection}
        user={user}
        lang={lang}
        binarySettings={siteSettings.binarySettings}
        onTradeCreated={(newTrade, newBal) => {
          setUser((prev) => ({ ...prev, walletBalance: newBal }));
          setBinaryTrades((prev) => [newTrade, ...prev]);
        }}
      />

      {/* Deposit & Withdraw Modals */}
      <DepositModal
        lang={lang}
        isOpen={isDepositOpen}
        onClose={() => setIsDepositOpen(false)}
        userEmail={user.email}
      />

      <WithdrawModal
        lang={lang}
        isOpen={isWithdrawOpen}
        onClose={() => setIsWithdrawOpen(false)}
        walletBalance={user.walletBalance}
      />
    </div>
  );
};
