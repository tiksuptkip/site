import React, { useState, useEffect } from 'react';
import { Language, UserProfile, SiteSettings } from './types';
import { DEFAULT_SITE_SETTINGS, subscribeSiteSettings } from './services/siteService';
import { subscribeUserProfile } from './services/userService';
import { initializeCryptoCoinsIfEmpty } from './services/cryptoService';
import { initializeTelegramChannelsIfEmpty } from './services/telegramService';
import { initializeAutoPosterIfEmpty, executeAutoPosterCheck } from './services/autoPosterService';
import { AuthPage } from './pages/AuthPage';
import { HomePage } from './pages/HomePage';
import { AdminPage } from './pages/AdminPage';
import { DepositPage } from './pages/DepositPage';
import { WithdrawPage } from './pages/WithdrawPage';
import { TelegramChannelsPage } from './pages/TelegramChannelsPage';

export type AppRoute = 'login' | 'home' | 'admin' | 'deposit' | 'withdraw' | 'telegram-channels';

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

  // Navigation route
  const [currentRoute, setCurrentRoute] = useState<AppRoute>(() => {
    const path = window.location.pathname.toLowerCase();
    if (path.includes('admin')) return 'admin';
    if (path.includes('deposit')) return 'deposit';
    if (path.includes('withdraw')) return 'withdraw';
    if (path.includes('telegram')) return 'telegram-channels';
    if (path.includes('home')) return 'home';
    return 'login';
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
    // Seed initial crypto list, telegram VIP channels, and auto poster if empty
    initializeCryptoCoinsIfEmpty().catch(console.warn);
    initializeTelegramChannelsIfEmpty().catch(console.warn);
    initializeAutoPosterIfEmpty().catch(console.warn);

    // Background auto-poster checker loop (runs every 60s inside TikSup)
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
      const path = window.location.pathname.toLowerCase();
      if (path.includes('admin')) setCurrentRoute('admin');
      else if (path.includes('deposit')) setCurrentRoute('deposit');
      else if (path.includes('withdraw')) setCurrentRoute('withdraw');
      else if (path.includes('telegram')) setCurrentRoute('telegram-channels');
      else if (path.includes('home')) setCurrentRoute('home');
      else setCurrentRoute('login');
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

  const navigateTo = (route: AppRoute) => {
    setCurrentRoute(route);
    let path = '/login';
    if (route === 'home') path = '/home';
    else if (route === 'admin') path = '/admin';
    else if (route === 'deposit') path = '/deposit';
    else if (route === 'withdraw') path = '/withdraw';
    else if (route === 'telegram-channels') path = '/telegram-channels';
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

  // Route Rendering

  // Hidden Admin Route (accessible ONLY by visiting /admin)
  if (currentRoute === 'admin') {
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
      />
    );
  }

  // Home Page
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
