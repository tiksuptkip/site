import { collection, doc, getDocs, setDoc, deleteDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import { CryptoCoin } from '../types';

export const INITIAL_CRYPTO_COINS: CryptoCoin[] = [
  {
    symbol: 'BTC',
    name: 'Bitcoin',
    nameAr: 'بيتكوين',
    tvSymbol: 'BINANCE:BTCUSDT',
    basePrice: 67840.50,
    currentPrice: 67840.50,
    change24h: 3.45,
    high24h: 68420.00,
    low24h: 65110.00,
    volume24h: 1845020100,
    enabled: true,
    isDefault: true,
    order: 1,
  },
  {
    symbol: 'ETH',
    name: 'Ethereum',
    nameAr: 'إيثيريوم',
    tvSymbol: 'BINANCE:ETHUSDT',
    basePrice: 3540.20,
    currentPrice: 3540.20,
    change24h: 2.18,
    high24h: 3610.00,
    low24h: 3450.00,
    volume24h: 942350800,
    enabled: true,
    order: 2,
  },
  {
    symbol: 'BNB',
    name: 'BNB',
    nameAr: 'بي إن بي',
    tvSymbol: 'BINANCE:BNBUSDT',
    basePrice: 592.80,
    currentPrice: 592.80,
    change24h: -0.65,
    high24h: 605.00,
    low24h: 588.00,
    volume24h: 320140500,
    enabled: true,
    order: 3,
  },
  {
    symbol: 'SOL',
    name: 'Solana',
    nameAr: 'سولانا',
    tvSymbol: 'BINANCE:SOLUSDT',
    basePrice: 154.60,
    currentPrice: 154.60,
    change24h: 5.82,
    high24h: 158.40,
    low24h: 144.20,
    volume24h: 512400900,
    enabled: true,
    order: 4,
  },
  {
    symbol: 'XRP',
    name: 'Ripple',
    nameAr: 'ريبل',
    tvSymbol: 'BINANCE:XRPUSDT',
    basePrice: 0.584,
    currentPrice: 0.584,
    change24h: 1.12,
    high24h: 0.602,
    low24h: 0.571,
    volume24h: 215600000,
    enabled: true,
    order: 5,
  },
  {
    symbol: 'ADA',
    name: 'Cardano',
    nameAr: 'كاردانو',
    tvSymbol: 'BINANCE:ADAUSDT',
    basePrice: 0.382,
    currentPrice: 0.382,
    change24h: -1.45,
    high24h: 0.395,
    low24h: 0.375,
    volume24h: 98400000,
    enabled: true,
    order: 6,
  },
  {
    symbol: 'DOGE',
    name: 'Dogecoin',
    nameAr: 'دوج كوين',
    tvSymbol: 'BINANCE:DOGEUSDT',
    basePrice: 0.1245,
    currentPrice: 0.1245,
    change24h: 4.20,
    high24h: 0.129,
    low24h: 0.118,
    volume24h: 182300000,
    enabled: true,
    order: 7,
  },
  {
    symbol: 'AVAX',
    name: 'Avalanche',
    nameAr: 'أفالانش',
    tvSymbol: 'BINANCE:AVAXUSDT',
    basePrice: 28.40,
    currentPrice: 28.40,
    change24h: -2.30,
    high24h: 29.80,
    low24h: 27.60,
    volume24h: 142000000,
    enabled: true,
    order: 8,
  },
  {
    symbol: 'LINK',
    name: 'Chainlink',
    nameAr: 'تشين لينك',
    tvSymbol: 'BINANCE:LINKUSDT',
    basePrice: 12.85,
    currentPrice: 12.85,
    change24h: 3.10,
    high24h: 13.20,
    low24h: 12.30,
    volume24h: 88500000,
    enabled: true,
    order: 9,
  },
  {
    symbol: 'SUI',
    name: 'Sui',
    nameAr: 'سوي',
    tvSymbol: 'BINANCE:SUIUSDT',
    basePrice: 1.82,
    currentPrice: 1.82,
    change24h: 7.95,
    high24h: 1.94,
    low24h: 1.68,
    volume24h: 245000000,
    enabled: true,
    order: 10,
  }
];

export async function initializeCryptoCoinsIfEmpty(): Promise<void> {
  try {
    const colRef = collection(db, 'crypto_coins');
    const snap = await getDocs(colRef);
    if (snap.empty) {
      for (const coin of INITIAL_CRYPTO_COINS) {
        await setDoc(doc(colRef, coin.symbol), coin);
      }
    }
  } catch (err) {
    console.warn('Initializing crypto coins:', err);
  }
}

export function subscribeCryptoCoins(callback: (coins: CryptoCoin[]) => void): () => void {
  const colRef = collection(db, 'crypto_coins');
  return onSnapshot(
    colRef,
    (snap) => {
      if (!snap.empty) {
        const coins: CryptoCoin[] = [];
        snap.forEach((docSnap) => {
          coins.push({ ...(docSnap.data() as CryptoCoin), symbol: docSnap.id });
        });
        coins.sort((a, b) => (a.order || 99) - (b.order || 99));
        callback(coins);
      } else {
        // Fallback to initial seeds
        initializeCryptoCoinsIfEmpty().then(() => {
          callback(INITIAL_CRYPTO_COINS);
        });
      }
    },
    (err) => {
      console.warn('Subscription error for crypto coins:', err);
      callback(INITIAL_CRYPTO_COINS);
    }
  );
}

export async function addCryptoCoin(coin: Omit<CryptoCoin, 'order'>): Promise<void> {
  const symbol = coin.symbol.toUpperCase().trim();
  const docRef = doc(db, 'crypto_coins', symbol);
  const coinData: CryptoCoin = {
    ...coin,
    symbol,
    currentPrice: coin.basePrice,
    change24h: coin.change24h || 0,
    high24h: coin.high24h || coin.basePrice * 1.05,
    low24h: coin.low24h || coin.basePrice * 0.95,
    volume24h: coin.volume24h || 50000000,
    order: 50,
  };
  await setDoc(docRef, coinData);
}

export async function deleteCryptoCoin(symbol: string): Promise<void> {
  const docRef = doc(db, 'crypto_coins', symbol);
  await deleteDoc(docRef);
}

export async function toggleCryptoCoinStatus(symbol: string, currentStatus: boolean): Promise<void> {
  const docRef = doc(db, 'crypto_coins', symbol);
  await updateDoc(docRef, { enabled: !currentStatus });
}
