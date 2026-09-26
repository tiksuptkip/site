import React, { useState } from 'react';
import { 
  Globe, 
  ArrowDownToLine, 
  ArrowUpRight, 
  LogOut, 
  ChevronDown, 
  Zap, 
  Shield, 
  Activity, 
  TrendingUp, 
  Send,
  Sparkles,
  Gift,
  Wallet
} from 'lucide-react';
import { UserProfile, SiteSettings, Language } from '../types';
import { translations } from '../i18n/translations';

interface HeaderProps {
  siteSettings: SiteSettings;
  user: UserProfile | null;
  lang: Language;
  onLanguageChange: (lang: Language) => void;
  onOpenDeposit: () => void;
  onOpenWithdraw: () => void;
  onNavigateReferral?: () => void;
  onNavigateWallet?: () => void;
  onNavigateTelegram?: () => void;
  onSignOut: () => void;
  onNavigateHome: () => void;
  onNavigateLogin: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  siteSettings,
  user,
  lang,
  onLanguageChange,
  onOpenDeposit,
  onOpenWithdraw,
  onNavigateReferral,
  onNavigateWallet,
  onNavigateTelegram,
  onSignOut,
  onNavigateHome,
  onNavigateLogin,
}) => {
  const t = translations[lang];
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const toggleLanguage = () => {
    const nextLang: Language = lang === 'en' ? 'ar' : 'en';
    onLanguageChange(nextLang);
  };

  const renderLogoIcon = () => {
    switch (siteSettings.logoIcon) {
      case 'shield':
        return <Shield className="w-5 h-5 text-[#F0B90B]" />;
      case 'activity':
        return <Activity className="w-5 h-5 text-[#F0B90B]" />;
      default:
        return <Zap className="w-5 h-5 text-[#F0B90B]" />;
    }
  };

  return (
    <header 
      className="bg-[#181a20] border-b border-[#282e38] sticky top-0 z-40 px-4 lg:px-8 py-3 select-none"
      dir={translations[lang].dir}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Left: Brand Logo & Navigation */}
        <div className="flex items-center gap-6">
          <div 
            onClick={onNavigateHome}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-[#F0B90B]/10 border border-[#F0B90B]/30 flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform">
              {renderLogoIcon()}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-black tracking-tight text-white group-hover:text-yellow-400 transition-colors">
                  {siteSettings.siteName || 'tiksup'}
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 uppercase">
                  PRO
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-5 text-xs font-semibold text-gray-400">
            <button 
              onClick={onNavigateHome}
              className="text-white hover:text-yellow-400 transition-colors flex items-center gap-1"
            >
              <TrendingUp className="w-3.5 h-3.5" />
              {t.trade}
            </button>

            <button 
              onClick={onOpenDeposit}
              className="hover:text-yellow-400 transition-colors flex items-center gap-1"
            >
              <ArrowDownToLine className="w-3.5 h-3.5" />
              {t.deposit}
            </button>

            <button 
              onClick={onOpenWithdraw}
              className="hover:text-yellow-400 transition-colors flex items-center gap-1"
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              {t.withdraw}
            </button>

            {onNavigateTelegram && (
              <button 
                onClick={onNavigateTelegram}
                className="text-yellow-400 hover:text-yellow-300 font-bold transition-colors flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-yellow-500/10 border border-yellow-500/30"
              >
                <Send className="w-3.5 h-3.5 text-sky-400" />
                <span>{lang === 'ar' ? 'توصيات تيليجرام VIP' : 'VIP Telegram Signals'}</span>
              </button>
            )}
          </nav>
        </div>

        {/* Right: Actions, Balance, Language, User Avatar */}
        <div className="flex items-center gap-3">
          {user ? (
            <>
              {/* Wallet Balance Badge */}
              <div className="hidden sm:flex items-center gap-2 bg-[#1e2329] border border-[#2b313a] px-3 py-1.5 rounded-xl">
                <span className="text-[11px] text-gray-400 font-medium">
                  {t.walletBalance}:
                </span>
                <span className="font-mono text-xs font-extrabold text-white">
                  {user.walletBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-[11px] font-bold text-yellow-400">USDT</span>
              </div>

              {/* Deposit Button */}
              <button
                onClick={onOpenDeposit}
                className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-[#0ECB81] hover:bg-[#0bb372] text-black font-bold text-xs rounded-xl transition-all shadow-sm active:scale-95"
              >
                <ArrowDownToLine className="w-3.5 h-3.5" />
                {t.deposit}
              </button>

              {/* Withdraw Button */}
              <button
                onClick={onOpenWithdraw}
                className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-[#2b313a] hover:bg-[#38414e] text-white font-bold text-xs rounded-xl transition-all active:scale-95"
              >
                <ArrowUpRight className="w-3.5 h-3.5 text-yellow-400" />
                {t.withdraw}
              </button>

              {/* User Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 bg-[#1e2329] hover:bg-[#252b33] border border-[#2b313a] px-2.5 py-1.5 rounded-xl transition-all"
                >
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-yellow-500 to-amber-300 text-black font-extrabold text-xs flex items-center justify-center shadow-sm">
                    {user.firstName ? user.firstName.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div className="hidden sm:flex flex-col items-start leading-tight">
                    <span className="text-xs font-bold text-gray-200">
                      {user.firstName}
                    </span>
                    <span className="text-[10px] text-yellow-400 font-medium flex items-center gap-0.5">
                      {lang === 'ar' ? 'خيارات الحساب' : 'Account'}
                      <ChevronDown className="w-2.5 h-2.5 text-yellow-400" />
                    </span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-gray-400 sm:hidden" />
                </button>

                {userMenuOpen && (
                  <div 
                    className="absolute end-0 mt-2 w-60 bg-[#1e2329] border border-[#2b313a] rounded-xl shadow-2xl py-2 z-50 text-xs animate-in fade-in duration-150"
                  >
                    <div className="px-3.5 py-2 border-b border-[#2b313a] mb-1">
                      <span className="text-[10px] text-gray-400 block">{t.welcomeBack}</span>
                      <span className="font-bold text-white text-sm block truncate">
                        {user.firstName} {user.lastName}
                      </span>
                      <span className="text-[11px] text-yellow-400 font-mono block truncate">
                        {user.email}
                      </span>
                    </div>

                    {/* Referral System - Main requested link */}
                    {onNavigateReferral && (
                      <button
                        onClick={() => {
                          setUserMenuOpen(false);
                          onNavigateReferral();
                        }}
                        className="w-full px-3.5 py-2.5 text-start text-yellow-400 hover:text-yellow-300 hover:bg-[#282f3a] flex items-center gap-2 font-bold bg-yellow-500/5 transition-colors"
                      >
                        <Gift className="w-4 h-4 text-yellow-400 shrink-0" />
                        <span>{lang === 'ar' ? 'نظام الإحالة' : 'Referral System'}</span>
                        <span className="ms-auto text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                          PRO
                        </span>
                      </button>
                    )}

                    {/* Unified Wallet & Breakdown */}
                    {onNavigateWallet && (
                      <button
                        onClick={() => {
                          setUserMenuOpen(false);
                          onNavigateWallet();
                        }}
                        className="w-full px-3.5 py-2 text-start text-gray-300 hover:text-white hover:bg-[#282f3a] flex items-center gap-2 font-medium"
                      >
                        <Wallet className="w-4 h-4 text-sky-400 shrink-0" />
                        <span>{lang === 'ar' ? 'المحفظة وتفاصيل الرصيد' : 'My Wallet & Breakdown'}</span>
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        onOpenDeposit();
                      }}
                      className="w-full px-3.5 py-2 text-start text-gray-300 hover:text-white hover:bg-[#282f3a] flex items-center gap-2"
                    >
                      <ArrowDownToLine className="w-4 h-4 text-[#0ECB81] shrink-0" />
                      {t.depositUSDT}
                    </button>

                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        onOpenWithdraw();
                      }}
                      className="w-full px-3.5 py-2 text-start text-gray-300 hover:text-white hover:bg-[#282f3a] flex items-center gap-2"
                    >
                      <ArrowUpRight className="w-4 h-4 text-yellow-400 shrink-0" />
                      {t.withdrawUSDT}
                    </button>

                    {onNavigateTelegram && (
                      <button
                        onClick={() => {
                          setUserMenuOpen(false);
                          onNavigateTelegram();
                        }}
                        className="w-full px-3.5 py-2 text-start text-yellow-400 hover:text-yellow-300 hover:bg-[#282f3a] flex items-center gap-2 font-bold"
                      >
                        <Send className="w-4 h-4 text-sky-400 shrink-0" />
                        {lang === 'ar' ? 'توصيات تيليجرام VIP' : 'VIP Telegram Signals'}
                      </button>
                    )}

                    <div className="my-1 border-t border-[#2b313a]" />

                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        onSignOut();
                      }}
                      className="w-full px-3.5 py-2 text-start text-red-400 hover:bg-red-500/10 flex items-center gap-2 font-semibold"
                    >
                      <LogOut className="w-4 h-4 shrink-0" />
                      {t.signOut}
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <button
              onClick={onNavigateLogin}
              className="px-4 py-1.5 bg-[#F0B90B] hover:bg-[#dfaa07] text-black font-bold text-xs rounded-xl transition-all shadow-sm active:scale-95"
            >
              {t.loginButton}
            </button>
          )}

          {/* Global Language Switcher AR / EN */}
          <button
            onClick={toggleLanguage}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1e2329] hover:bg-[#262c35] border border-[#2b313a] rounded-xl text-xs font-bold text-gray-200 hover:text-white transition-all shadow-sm"
            title={lang === 'en' ? 'Switch to Arabic' : 'التحويل للإنجليزية'}
          >
            <Globe className="w-3.5 h-3.5 text-yellow-400" />
            <span>{lang === 'en' ? 'العربية' : 'EN'}</span>
            <span className="text-[10px] text-gray-400">
              {lang === 'en' ? '🇸🇦' : '🇬🇧'}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};
