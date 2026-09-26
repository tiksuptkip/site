import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import { SiteSettings, BinarySettings, AdminWalletAddresses } from '../types';

export const DEFAULT_BINARY_SETTINGS: BinarySettings = {
  enabled: true,
  globalProfitPercent: 85,
  payoutRate: 85,
  riskMode: 'random',
  minTrade: 1,
  maxTrade: 1000,
  coinProfitPercents: {
    BTC: 85,
    ETH: 85,
    SOL: 85,
    BNB: 85,
    XRP: 80,
    DOGE: 80,
    ADA: 80,
  },
  minDuration: '10s',
  maxDuration: '24h',
};

export const DEFAULT_ADMIN_WALLETS: AdminWalletAddresses = {
  usdt_trc20: 'TX9dK7N2bHwM3qL8zF1a9Y4pQvE7Rt5sKj',
  usdt_bep20: '0x8b32A29f95bF738bC25FeA2300bCe9549fF48421',
  btc: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
  eth: '0x71C8A9e4f4B61D1920F8a06C88aA6aE8753EbB12',
};

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  siteName: 'tiksup',
  logoIcon: 'zap',
  themeColor: 'binance',
  announcement: 'Welcome to tiksup - Next-Gen Crypto & Binary UP/DOWN Trading Platform. Fast Execution & Instant Settlement!',
  updatedAt: new Date().toISOString(),
  updatedBy: 'System',
  binarySettings: DEFAULT_BINARY_SETTINGS,
  adminWallets: DEFAULT_ADMIN_WALLETS,
};

const SETTINGS_DOC = 'general';

function sanitizeSettings(data: any): SiteSettings {
  const merged: SiteSettings = {
    ...DEFAULT_SITE_SETTINGS,
    ...data,
    binarySettings: {
      ...DEFAULT_BINARY_SETTINGS,
      ...(data?.binarySettings || {}),
    },
    adminWallets: {
      ...DEFAULT_ADMIN_WALLETS,
      ...(data?.adminWallets || {}),
    },
  };

  // If old site name exists from previous template, upgrade to tiksup
  if (!merged.siteName || merged.siteName === 'BitEx Pro' || merged.siteName === 'BitEx') {
    merged.siteName = 'tiksup';
  }

  return merged;
}

export async function getSiteSettings(): Promise<SiteSettings> {
  try {
    const docRef = doc(db, 'site_settings', SETTINGS_DOC);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const sanitized = sanitizeSettings(snap.data());
      return sanitized;
    } else {
      await setDoc(docRef, DEFAULT_SITE_SETTINGS);
      return DEFAULT_SITE_SETTINGS;
    }
  } catch (err) {
    console.error('Error fetching site settings from Firestore:', err);
    return DEFAULT_SITE_SETTINGS;
  }
}

export function subscribeSiteSettings(callback: (settings: SiteSettings) => void): () => void {
  const docRef = doc(db, 'site_settings', SETTINGS_DOC);
  return onSnapshot(
    docRef,
    (snap) => {
      if (snap.exists()) {
        const sanitized = sanitizeSettings(snap.data());
        callback(sanitized);
      } else {
        setDoc(docRef, DEFAULT_SITE_SETTINGS).catch(console.error);
        callback(DEFAULT_SITE_SETTINGS);
      }
    },
    (err) => {
      console.warn('Subscription to site settings warning:', err);
      callback(DEFAULT_SITE_SETTINGS);
    }
  );
}

export async function updateSiteSettings(settings: Partial<SiteSettings>, adminName: string): Promise<void> {
  const docRef = doc(db, 'site_settings', SETTINGS_DOC);
  const updatedData: Partial<SiteSettings> = {
    ...settings,
    updatedAt: new Date().toISOString(),
    updatedBy: adminName,
  };
  await setDoc(docRef, updatedData, { merge: true });
}

export async function updateBinarySettings(binarySettings: Partial<BinarySettings>, adminName: string): Promise<void> {
  const docRef = doc(db, 'site_settings', SETTINGS_DOC);
  const snap = await getDoc(docRef);
  const currentSettings = snap.exists() ? sanitizeSettings(snap.data()) : DEFAULT_SITE_SETTINGS;

  const newBinarySettings: BinarySettings = {
    ...DEFAULT_BINARY_SETTINGS,
    ...(currentSettings.binarySettings || {}),
    ...binarySettings,
    updatedAt: new Date().toISOString(),
    updatedBy: adminName,
  };

  await setDoc(docRef, {
    binarySettings: newBinarySettings,
    updatedAt: new Date().toISOString(),
    updatedBy: adminName,
  }, { merge: true });
}
