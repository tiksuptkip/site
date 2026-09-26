import React, { useState, useEffect } from 'react';
import { Language, UserProfile, SiteSettings } from './types';
import { DEFAULT_SITE_SETTINGS, subscribeSiteSettings } from './services/siteService';
import { subscribeUserProfile } from './services/userService';
import { initializeCryptoCoinsIfEmpty } from './services/cryptoService';
import { initializeSupportedCoinsIfEmpty, startLivePriceTicker } from './services/supportedCoinsService';
import { initializeTelegramChannelsIfEmpty } from './services/telegramService';
import { initializeAutoPosterIfEmpty, executeAutoPosterCheck } from './services/autoPosterService';
import { AuthPage } from './pages/AuthPage';
import { HomePage } from './pages/HomePage';
import { AdminPage } from './pages/AdminPage';
import { DepositPage } from './pages/DepositPage';
import { WithdrawPage } from './pages/WithdrawPage';
import { TelegramChannelsPage } from './pages/TelegramChannelsPage';
import { ReferralPage } from './pages/ReferralPage';
import { WalletPage } from './pages/WalletPage';

export type AppRoute = 
  | 'login' 
  | 'home' 
  | 'admin' 
  | 'deposit' 
  | 'withdraw' 
  | 'telegram-channels' 
  | 'referral' 
  | 'wallet'
  | 'not-found';

export default function App() {
  // Global Language state (AR / EN)
  const [lang, setLang] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('tiksup_lang') || localStorage.getItem('bitex_lang');
      return (saved === 'ar' || saved === 'en') ? saved : 'en';
    } catch {
      return 'en';
    }
  });

  // Dynamic Site Settings from Firestore
  const [siteSettings, setSiteSettings] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS);

  // Authenticated User Profile
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem('tiksup_active_user') || localStorage.getItem('bitex_active_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Parse path and return route
  const parseRouteFromPath = (rawPath: string): AppRoute => {
    let decoded = rawPath;
    try {
      decoded = decodeURIComponent(rawPath);
    } catch {}
    const path = decoded.toLowerCase();
    const rawLower = rawPath.toLowerCase();

    // Check if visiting referral link: /ref/USER_ID
    if (path.startsWith('/ref/')) {
      const parts = decoded.split(/\/ref\//i);
      if (parts[1]) {
        try {
          const cleanRef = parts[1].replace(/\/.*$/, '').trim();
          localStorage.setItem('tiksup_pending_ref', cleanRef);
        } catch {}
      }
    }

    // Check search param ?ref=...
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const refParam = urlParams.get('ref');
      if (refParam) {
        localStorage.setItem('tiksup_pending_ref', refParam.trim());
      }
    } catch {}

    // SECURE ADMIN URL: /admin_sam_jor_18_10_secure
    // Also catch old /admin_sam_jor_18_&&_10 or %26%26 encoding to prevent unauthorized/create-account lockout
    const isAdminPath = 
      path.startsWith('/admin_sam_jor_18_10_secure') ||
      rawLower.startsWith('/admin_sam_jor_18_10_secure') ||
      path.startsWith('/admin_sam_jor_18_&&_10') ||
      rawLower.startsWith('/admin_sam_jor_18_%26%26_10') ||
      rawLower.startsWith('/admin_sam_jor_18_%25%26%25%26_10') ||
      path.includes('admin_sam_jor_18');

    if (isAdminPath) {
      if (typeof window !== 'undefined' && window.location.pathname !== '/admin_sam_jor_18_10_secure') {
        try {
          window.history.replaceState({}, '', '/admin_sam_jor_18_10_secure');
        } catch {}
      }
      return 'admin';
    }

    // CRITICAL SECURITY: Old /admin URL MUST return 404 Not Found for everyone
    if (path === '/admin' || path === '/admin/' || path.startsWith('/admin/') || rawLower === '/admin' || rawLower.startsWith('/admin/')) {
      return 'not-found';
    }

    if (path.includes('referral') || path.startsWith('/ref')) return 'referral';
    if (path.includes('wallet')) return 'wallet';
    if (path.includes('deposit')) return 'deposit';
    if (path.includes('withdraw')) return 'withdraw';
    if (path.includes('telegram')) return 'telegram-channels';
    if (path.startsWith('/trade') || path.includes('home')) return 'home';
    return 'login';
  };

  // Navigation route
  const [currentRoute, setCurrentRoute] = useState<AppRoute>(() => {
    return parseRouteFromPath(window.location.pathname);
  });

  // Apply RTL/LTR and document language attribute
  useEffect(() => {
    const isRtl = lang === 'ar';
    document.documentElement.setAttribute('dir', isRtl ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', lang);
    try {
      localStorage.setItem('tiksup_lang', lang);
    } catch (err) {
      console.warn('Could not save language preference:', err);
    }
  }, [lang]);

  // Sync document title with dynamic site settings
  useEffect(() => {
    const name = siteSettings.siteName || 'tiksup';
    document.title = `${name} - Crypto & Binary Trading Exchange`;
  }, [siteSettings.siteName]);

  // Subscribe to site settings from Firestore & seed initial data
  useEffect(() => {
    const unsubscribe = subscribeSiteSettings((settings) => {
      setSiteSettings(settings);
    });
    // Seed initial crypto list, supported coins, telegram VIP channels, and auto poster if empty
    initializeCryptoCoinsIfEmpty().catch(console.warn);
    initializeSupportedCoinsIfEmpty().catch(console.warn);
    initializeTelegramChannelsIfEmpty().catch(console.warn);
    initializeAutoPosterIfEmpty().catch(console.warn);
    startLivePriceTicker();

    // Background auto-poster checker loop
    executeAutoPosterCheck().catch(console.warn);
    const posterInterval = setInterval(() => {
      executeAutoPosterCheck().catch(console.warn);
    }, 60000);

    return () => {
      unsubscribe();
      clearInterval(posterInterval);
    };
  }, []);

  // Listen to browser popstate for deep links
  useEffect(() => {
    const handlePopState = () => {
      const nextRoute = parseRouteFromPath(window.location.pathname);
      setCurrentRoute(nextRoute);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Subscribe to active user changes (e.g. if admin blocks user or adds balance)
  useEffect(() => {
    if (!currentUser?.uid) return;
    const unsubscribe = subscribeUserProfile(currentUser.uid, (updatedProfile) => {
      if (updatedProfile) {
        if (updatedProfile.isBlocked) {
          // User was blocked by admin
          handleSignOut();
          alert(lang === 'ar' ? 'تم تجميد حسابك من قبل الإدارة' : 'Your account has been suspended by administration.');
        } else {
          setCurrentUser(updatedProfile);
          try {
            localStorage.setItem('tiksup_active_user', JSON.stringify(updatedProfile));
          } catch {}
        }
      }
    });
    return () => unsubscribe();
  }, [currentUser?.uid, lang]);

  const navigateTo = (route: AppRoute, customPath?: string) => {
    setCurrentRoute(route);
    let path = '/login';
    if (customPath) path = customPath;
    else if (route === 'home') path = '/home';
    else if (route === 'admin') path = '/admin_sam_jor_18_10_secure';
    else if (route === 'referral') path = '/referral';
    else if (route === 'wallet') path = '/wallet';
    else if (route === 'deposit') path = '/deposit';
    else if (route === 'withdraw') path = '/withdraw';
    else if (route === 'telegram-channels') path = '/telegram-channels';
    else if (route === 'not-found') path = '/404';
    window.history.pushState({}, '', path);
  };

  const handleLoginSuccess = (user: UserProfile) => {
    setCurrentUser(user);
    try {
      localStorage.setItem('tiksup_active_user', JSON.stringify(user));
    } catch (err) {
      console.warn('Could not persist session:', err);
    }
    navigateTo('home');
  };

  const handleSignOut = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem('tiksup_active_user');
      localStorage.removeItem('bitex_active_user');
    } catch {}
    navigateTo('login');
  };

  const handleLanguageChange = (newLang: Language) => {
    setLang(newLang);
  };

  // 404 Not Found Page Component
  const render404Page = () => (
    <div className="min-h-screen bg-[#0b0e11] text-gray-200 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-4 bg-[#181a20] border border-[#2b313a] p-8 rounded-3xl shadow-2xl">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-red-500/10 text-red-400 border border-red-500/20 flex items-center justify-center text-2xl font-black font-mono">
          404
        </div>
        <h1 className="text-2xl font-black text-white">404 Not Found</h1>
        <p className="text-xs text-gray-400">
          The requested URL was not found on this server. Please return to the trading platform.
        </p>
        <button
          onClick={() => navigateTo(currentUser ? 'home' : 'login')}
          className="px-6 py-2.5 bg-[#F0B90B] hover:bg-[#dfaa07] text-black font-bold text-xs rounded-xl transition-all"
        >
          Return to Platform
        </button>
      </div>
    </div>
  );

  // 404 Route
  if (currentRoute === 'not-found') {
    return render404Page();
  }

  // Secure Hidden Admin Route (/admin_sam_jor_18_10_secure)
  if (currentRoute === 'admin') {
    const configuredAdmin = (((globalThis as any).process?.env?.ADMIN_EMAIL) || import.meta.env.VITE_ADMIN_EMAIL || 'altal20152@gmail.com').trim().toLowerCase();
    const isUserAdmin = currentUser && currentUser.email && (
      currentUser.email.trim().toLowerCase() === configuredAdmin ||
      currentUser.email.trim().toLowerCase() === 'samjordan@gmail.com' ||
      currentUser.email.trim().toLowerCase() === 'altal20152@gmail.com'
    );
    // Security check: If a normal user (not admin email) is logged in, block access and show 404
    if (currentUser && !isUserAdmin) {
      return render404Page();
    }

    return (
      <AdminPage
        siteSettings={siteSettings}
        lang={lang}
        onLanguageChange={handleLanguageChange}
        onNavigateHome={() => navigateTo(currentUser ? 'home' : 'login')}
      />
    );
  }

  // Deposit Page
  if (currentRoute === 'deposit') {
    if (!currentUser) {
      return (
        <AuthPage
          lang={lang}
          onLanguageChange={handleLanguageChange}
          siteSettings={siteSettings}
          onLoginSuccess={handleLoginSuccess}
        />
      );
    }
    return (
      <DepositPage
        user={currentUser}
        siteSettings={siteSettings}
        lang={lang}
        onLanguageChange={handleLanguageChange}
        onSignOut={handleSignOut}
        onNavigateHome={() => navigateTo('home')}
        onNavigateWithdraw={() => navigateTo('withdraw')}
        onNavigateTelegram={() => navigateTo('telegram-channels')}
        onNavigateReferral={() => navigateTo('referral')}
        onNavigateWallet={() => navigateTo('wallet')}
      />
    );
  }

  // Withdraw Page
  if (currentRoute === 'withdraw') {
    if (!currentUser) {
      return (
        <AuthPage
          lang={lang}
          onLanguageChange={handleLanguageChange}
          siteSettings={siteSettings}
          onLoginSuccess={handleLoginSuccess}
        />
      );
    }
    return (
      <WithdrawPage
        user={currentUser}
        siteSettings={siteSettings}
        lang={lang}
        onLanguageChange={handleLanguageChange}
        onSignOut={handleSignOut}
        onNavigateHome={() => navigateTo('home')}
        onNavigateDeposit={() => navigateTo('deposit')}
        onNavigateTelegram={() => navigateTo('telegram-channels')}
        onNavigateReferral={() => navigateTo('referral')}
        onNavigateWallet={() => navigateTo('wallet')}
      />
    );
  }

  // Telegram VIP Channels Page
  if (currentRoute === 'telegram-channels') {
    if (!currentUser) {
      return (
        <AuthPage
          lang={lang}
          onLanguageChange={handleLanguageChange}
          siteSettings={siteSettings}
          onLoginSuccess={handleLoginSuccess}
        />
      );
    }
    return (
      <TelegramChannelsPage
        user={currentUser}
        siteSettings={siteSettings}
        lang={lang}
        onLanguageChange={handleLanguageChange}
        onSignOut={handleSignOut}
        onNavigateHome={() => navigateTo('home')}
        onNavigateDeposit={() => navigateTo('deposit')}
        onNavigateWithdraw={() => navigateTo('withdraw')}
        onNavigateReferral={() => navigateTo('referral')}
        onNavigateWallet={() => navigateTo('wallet')}
      />
    );
  }

  // Referral System Page
  if (currentRoute === 'referral') {
    if (!currentUser) {
      return (
        <AuthPage
          lang={lang}
          onLanguageChange={handleLanguageChange}
          siteSettings={siteSettings}
          onLoginSuccess={handleLoginSuccess}
        />
      );
    }
    return (
      <ReferralPage
        user={currentUser}
        siteSettings={siteSettings}
        lang={lang}
        onLanguageChange={handleLanguageChange}
        onSignOut={handleSignOut}
        onNavigateHome={() => navigateTo('home')}
        onNavigateDeposit={() => navigateTo('deposit')}
        onNavigateWithdraw={() => navigateTo('withdraw')}
        onNavigateWallet={() => navigateTo('wallet')}
        onNavigateTelegram={() => navigateTo('telegram-channels')}
      />
    );
  }

  // Professional Multi-Currency Wallet Page
  if (currentRoute === 'wallet') {
    if (!currentUser) {
      return (
        <AuthPage
          lang={lang}
          onLanguageChange={handleLanguageChange}
          siteSettings={siteSettings}
          onLoginSuccess={handleLoginSuccess}
        />
      );
    }
    return (
      <WalletPage
        user={currentUser}
        siteSettings={siteSettings}
        lang={lang}
        onLanguageChange={handleLanguageChange}
        onSignOut={handleSignOut}
        onNavigateHome={() => navigateTo('home')}
        onNavigateDeposit={(coin) => navigateTo('deposit', coin ? `/deposit?coin=${coin}` : undefined)}
        onNavigateWithdraw={(coin) => navigateTo('withdraw', coin ? `/withdraw?coin=${coin}` : undefined)}
        onNavigateTrade={(coin) => navigateTo('home', `/trade/${coin}`)}
        onNavigateReferral={() => navigateTo('referral')}
        onNavigateTelegram={() => navigateTo('telegram-channels')}
      />
    );
  }

  // Home Page & /trade/:coin
  if (currentUser && currentRoute === 'home') {
    return (
      <HomePage
        user={currentUser}
        siteSettings={siteSettings}
        lang={lang}
        onLanguageChange={handleLanguageChange}
        onSignOut={handleSignOut}
        onNavigateLogin={() => navigateTo('login')}
        onNavigateDeposit={() => navigateTo('deposit')}
        onNavigateWithdraw={() => navigateTo('withdraw')}
        onNavigateTelegram={() => navigateTo('telegram-channels')}
        onNavigateReferral={() => navigateTo('referral')}
        onNavigateWallet={() => navigateTo('wallet')}
      />
    );
  }

  // Default: AuthPage (No admin link)
  return (
    <AuthPage
      lang={lang}
      onLanguageChange={handleLanguageChange}
      siteSettings={siteSettings}
      onLoginSuccess={handleLoginSuccess}
    />
  );
}
