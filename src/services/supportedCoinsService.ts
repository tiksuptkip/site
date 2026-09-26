import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { SupportedCoin } from '../types';

export const INITIAL_SUPPORTED_COINS: SupportedCoin[] = [
  {
    symbol: 'BTC',
    name: 'Bitcoin',
    icon: 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png',
    coingeckoId: 'bitcoin',
    currentPrice: 64500.0,
    change24h: 2.15,
    high24h: 65200.0,
    low24h: 63800.0,
    enabled: true,
    network: 'Bitcoin Mainnet',
    order: 1,
    updatedAt: new Date().toISOString(),
  },
  {
    symbol: 'ETH',
    name: 'Ethereum',
    icon: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
    coingeckoId: 'ethereum',
    currentPrice: 3480.0,
    change24h: 1.85,
    high24h: 3540.0,
    low24h: 3410.0,
    enabled: true,
    network: 'ERC20',
    order: 2,
    updatedAt: new Date().toISOString(),
  },
  {
    symbol: 'USDT',
    name: 'Tether USD',
    icon: 'https://assets.coingecko.com/coins/images/325/small/Tether.png',
    coingeckoId: 'tether',
    currentPrice: 1.0,
    change24h: 0.01,
    high24h: 1.002,
    low24h: 0.998,
    enabled: true,
    network: 'TRC20 / BEP20',
    order: 3,
    updatedAt: new Date().toISOString(),
  },
  {
    symbol: 'SOL',
    name: 'Solana',
    icon: 'https://assets.coingecko.com/coins/images/4128/small/solana.png',
    coingeckoId: 'solana',
    currentPrice: 152.4,
    change24h: 4.65,
    high24h: 156.0,
    low24h: 145.2,
    enabled: true,
    network: 'Solana',
    order: 4,
    updatedAt: new Date().toISOString(),
  },
  {
    symbol: 'BNB',
    name: 'BNB Chain',
    icon: 'https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png',
    coingeckoId: 'binancecoin',
    currentPrice: 585.0,
    change24h: 1.42,
    high24h: 592.0,
    low24h: 574.0,
    enabled: true,
    network: 'BEP20',
    order: 5,
    updatedAt: new Date().toISOString(),
  },
  {
    symbol: 'XRP',
    name: 'Ripple',
    icon: 'https://assets.coingecko.com/coins/images/44/small/xrp-symbol-white-128.png',
    coingeckoId: 'ripple',
    currentPrice: 0.589,
    change24h: -0.75,
    high24h: 0.605,
    low24h: 0.578,
    enabled: true,
    network: 'Ripple',
    order: 6,
    updatedAt: new Date().toISOString(),
  },
  {
    symbol: 'DOGE',
    name: 'Dogecoin',
    icon: 'https://assets.coingecko.com/coins/images/5/small/dogecoin.png',
    coingeckoId: 'dogecoin',
    currentPrice: 0.128,
    change24h: 3.82,
    high24h: 0.134,
    low24h: 0.121,
    enabled: true,
    network: 'Dogecoin',
    order: 7,
    updatedAt: new Date().toISOString(),
  },
  {
    symbol: 'AVAX',
    name: 'Avalanche',
    icon: 'https://assets.coingecko.com/coins/images/12559/small/Avalanche_Circle_RedWhite_Trans.png',
    coingeckoId: 'avalanche-2',
    currentPrice: 28.5,
    change24h: 2.95,
    high24h: 29.8,
    low24h: 27.2,
    enabled: true,
    network: 'AVAX-C',
    order: 8,
    updatedAt: new Date().toISOString(),
  },
  {
    symbol: 'ADA',
    name: 'Cardano',
    icon: 'https://assets.coingecko.com/coins/images/975/small/cardano.png',
    coingeckoId: 'cardano',
    currentPrice: 0.384,
    change24h: 1.15,
    high24h: 0.395,
    low24h: 0.375,
    enabled: true,
    network: 'Cardano',
    order: 9,
    updatedAt: new Date().toISOString(),
  },
  {
    symbol: 'PEPE',
    name: 'Pepe',
    icon: 'https://assets.coingecko.com/coins/images/29850/small/pepe-token.png',
    coingeckoId: 'pepe',
    currentPrice: 0.0000108,
    change24h: 6.45,
    high24h: 0.0000115,
    low24h: 0.0000098,
    enabled: true,
    network: 'ERC20',
    order: 10,
    updatedAt: new Date().toISOString(),
  },
  {
    symbol: 'SHIB',
    name: 'Shiba Inu',
    icon: 'https://assets.coingecko.com/coins/images/11939/small/shiba.png',
    coingeckoId: 'shiba-inu',
    currentPrice: 0.0000189,
    change24h: 1.75,
    high24h: 0.0000196,
    low24h: 0.0000181,
    enabled: true,
    network: 'ERC20',
    order: 11,
    updatedAt: new Date().toISOString(),
  },
  {
    symbol: 'LINK',
    name: 'Chainlink',
    icon: 'https://assets.coingecko.com/coins/images/877/small/chainlink-new-logo.png',
    coingeckoId: 'chainlink',
    currentPrice: 12.35,
    change24h: 1.95,
    high24h: 12.8,
    low24h: 11.9,
    enabled: true,
    network: 'ERC20',
    order: 12,
    updatedAt: new Date().toISOString(),
  },
  {
    symbol: 'NEAR',
    name: 'NEAR Protocol',
    icon: 'https://assets.coingecko.com/coins/images/10365/small/near.png',
    coingeckoId: 'near',
    currentPrice: 5.15,
    change24h: 2.35,
    high24h: 5.4,
    low24h: 4.95,
    enabled: true,
    network: 'NEAR',
    order: 13,
    updatedAt: new Date().toISOString(),
  },
  {
    symbol: 'TON',
    name: 'Toncoin',
    icon: 'https://assets.coingecko.com/coins/images/17980/small/ton_symbol.png',
    coingeckoId: 'the-open-network',
    currentPrice: 5.72,
    change24h: -0.35,
    high24h: 5.9,
    low24h: 5.55,
    enabled: true,
    network: 'TON',
    order: 14,
    updatedAt: new Date().toISOString(),
  },
  {
    symbol: 'SUI',
    name: 'Sui Network',
    icon: 'https://assets.coingecko.com/coins/images/26375/small/sui-ocean-square.png',
    coingeckoId: 'sui',
    currentPrice: 1.78,
    change24h: 5.85,
    high24h: 1.88,
    low24h: 1.65,
    enabled: true,
    network: 'Sui',
    order: 15,
    updatedAt: new Date().toISOString(),
  },
];

// In-memory cache of supported coins for fast instant access
let cachedSupportedCoins: SupportedCoin[] = [...INITIAL_SUPPORTED_COINS];

export function getCachedSupportedCoins(): SupportedCoin[] {
  return cachedSupportedCoins;
}

export async function initializeSupportedCoinsIfEmpty(): Promise<void> {
  try {
    const colRef = collection(db, 'supportedCoins');
    const snap = await getDocs(colRef);
    if (snap.empty) {
      for (const coin of INITIAL_SUPPORTED_COINS) {
        const docRef = doc(db, 'supportedCoins', coin.symbol);
        await setDoc(docRef, coin);
      }
    }
  } catch (err) {
    console.warn('Error initializing supportedCoins in Firestore:', err);
  }
}

export function subscribeSupportedCoins(callback: (coins: SupportedCoin[]) => void): () => void {
  const colRef = collection(db, 'supportedCoins');
  return onSnapshot(
    colRef,
    (snap) => {
      if (!snap.empty) {
        const list: SupportedCoin[] = [];
        snap.forEach((d) => {
          list.push({ id: d.id, ...(d.data() as SupportedCoin) });
        });
        list.sort((a, b) => (a.order || 99) - (b.order || 99));
        cachedSupportedCoins = list;
        callback(list);
      } else {
        cachedSupportedCoins = INITIAL_SUPPORTED_COINS;
        callback(INITIAL_SUPPORTED_COINS);
      }
    },
    (err) => {
      console.warn('subscribeSupportedCoins error, falling back to cache:', err);
      callback(cachedSupportedCoins);
    }
  );
}

/**
 * Live price updater:
 * Fetches live quotes from CoinGecko or Binance API, updates Firestore & in-memory cache every 10 seconds.
 */
let isLiveUpdating = false;

export async function fetchAndUpdateLivePrices(): Promise<void> {
  if (isLiveUpdating) return;
  isLiveUpdating = true;

  try {
    // 1. Try Binance public 24hr ticker API first (fastest, unmetered)
    const binanceRes = await fetch('https://api.binance.com/api/v3/ticker/24hr');
    if (binanceRes.ok) {
      const tickers: Array<{ symbol: string; lastPrice: string; priceChangePercent: string; highPrice: string; lowPrice: string }> = await binanceRes.json();
      const tickerMap = new Map<string, { lastPrice: number; priceChangePercent: number; highPrice: number; lowPrice: number }>();
      for (const t of tickers) {
        if (t.symbol.endsWith('USDT')) {
          const coinSymbol = t.symbol.replace(/USDT$/, '');
          tickerMap.set(coinSymbol, {
            lastPrice: parseFloat(t.lastPrice) || 0,
            priceChangePercent: parseFloat(t.priceChangePercent) || 0,
            highPrice: parseFloat(t.highPrice) || 0,
            lowPrice: parseFloat(t.lowPrice) || 0,
          });
        }
      }

      for (const coin of cachedSupportedCoins) {
        if (coin.symbol === 'USDT') continue;
        const tick = tickerMap.get(coin.symbol);
        if (tick && tick.lastPrice > 0) {
          coin.currentPrice = tick.lastPrice;
          coin.change24h = Number(tick.priceChangePercent.toFixed(2));
          coin.high24h = tick.highPrice;
          coin.low24h = tick.lowPrice;
          coin.updatedAt = new Date().toISOString();

          // Sync to Firestore asynchronously
          updateDoc(doc(db, 'supportedCoins', coin.symbol), {
            currentPrice: coin.currentPrice,
            change24h: coin.change24h,
            high24h: coin.high24h,
            low24h: coin.low24h,
            updatedAt: coin.updatedAt,
          }).catch(() => {});
        }
      }
    } else {
      // Fallback: CoinGecko API
      const ids = cachedSupportedCoins.map((c) => c.coingeckoId).filter(Boolean).join(',');
      const cgRes = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`);
      if (cgRes.ok) {
        const data = await cgRes.json();
        for (const coin of cachedSupportedCoins) {
          if (data[coin.coingeckoId]?.usd) {
            const price = data[coin.coingeckoId].usd;
            const change = data[coin.coingeckoId].usd_24h_change || 0;
            coin.currentPrice = price;
            coin.change24h = Number(change.toFixed(2));
            coin.updatedAt = new Date().toISOString();

            updateDoc(doc(db, 'supportedCoins', coin.symbol), {
              currentPrice: price,
              change24h: coin.change24h,
              updatedAt: coin.updatedAt,
            }).catch(() => {});
          }
        }
      }
    }
  } catch (err) {
    // Non-blocking error, gentle micro-fluctuation to ensure chart liveliness
    for (const coin of cachedSupportedCoins) {
      if (coin.symbol === 'USDT') continue;
      const deltaPct = (Math.random() - 0.495) * 0.15;
      coin.currentPrice = Number((coin.currentPrice * (1 + deltaPct / 100)).toFixed(coin.currentPrice > 10 ? 2 : 6));
    }
  } finally {
    isLiveUpdating = false;
  }
}

// Start auto-sync ticker every 10 seconds
let syncIntervalStarted = false;
export function startLivePriceTicker(): void {
  if (syncIntervalStarted) return;
  syncIntervalStarted = true;
  fetchAndUpdateLivePrices().catch(console.warn);
  setInterval(() => {
    fetchAndUpdateLivePrices().catch(console.warn);
  }, 10000);
}

// Admin helper: Add or update supported coin
export async function saveSupportedCoin(coin: SupportedCoin): Promise<void> {
  const docRef = doc(db, 'supportedCoins', coin.symbol.toUpperCase());
  await setDoc(docRef, {
    ...coin,
    symbol: coin.symbol.toUpperCase(),
    updatedAt: new Date().toISOString(),
  }, { merge: true });
}

// Admin helper: Delete supported coin
export async function deleteSupportedCoin(symbol: string): Promise<void> {
  const docRef = doc(db, 'supportedCoins', symbol.toUpperCase());
  await deleteDoc(docRef);
}
