import { 
  collection, 
  doc, 
  getDoc, 
  getDocs,
  setDoc, 
  updateDoc, 
  addDoc, 
  onSnapshot, 
  runTransaction
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { CoinBalance, WalletLog, UserProfile, SupportedCoin } from '../types';
import { getCachedSupportedCoins } from './supportedCoinsService';

/**
 * Real-time subscription to a user's multi-currency balances in sub-collection:
 * userWallets/{userId}/balances/{coinSymbol}
 */
export function subscribeUserBalances(
  userId: string,
  callback: (balances: Record<string, CoinBalance>) => void
): () => void {
  if (!userId) {
    callback({});
    return () => {};
  }

  const balancesColRef = collection(db, 'userWallets', userId, 'balances');

  return onSnapshot(
    balancesColRef,
    async (snapshot) => {
      const balanceMap: Record<string, CoinBalance> = {};
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as CoinBalance;
        balanceMap[data.symbol.toUpperCase()] = {
          symbol: data.symbol.toUpperCase(),
          name: data.name || data.symbol,
          balance: Number(data.balance) || 0,
          locked: Number(data.locked) || 0,
          totalDeposit: Number(data.totalDeposit) || 0,
          updatedAt: data.updatedAt,
        };
      });

      // Migration safeguard: If USDT balance doc doesn't exist yet, check user profile's walletBalance
      if (!balanceMap['USDT']) {
        try {
          const userDoc = await getDoc(doc(db, 'users', userId));
          if (userDoc.exists()) {
            const initialBal = Number(userDoc.data()?.walletBalance) || 0;
            const usdtRecord: CoinBalance = {
              symbol: 'USDT',
              name: 'Tether USD',
              balance: initialBal,
              locked: 0,
              totalDeposit: initialBal,
              updatedAt: new Date().toISOString(),
            };
            balanceMap['USDT'] = usdtRecord;
            // Lazily persist to userWallets subcollection
            setDoc(doc(db, 'userWallets', userId, 'balances', 'USDT'), usdtRecord, { merge: true }).catch(() => {});
          }
        } catch {}
      }

      callback(balanceMap);
    },
    (err) => {
      console.warn('Error subscribing to user wallet balances:', err);
      callback({});
    }
  );
}

/**
 * Fetch a single coin balance for user
 */
export async function getUserCoinBalance(userId: string, symbol: string): Promise<CoinBalance> {
  const cleanSymbol = symbol.toUpperCase().trim();
  const balanceDocRef = doc(db, 'userWallets', userId, 'balances', cleanSymbol);
  const snap = await getDoc(balanceDocRef);

  if (snap.exists()) {
    const data = snap.data() as CoinBalance;
    return {
      symbol: cleanSymbol,
      name: data.name || cleanSymbol,
      balance: Number(data.balance) || 0,
      locked: Number(data.locked) || 0,
      totalDeposit: Number(data.totalDeposit) || 0,
      updatedAt: data.updatedAt,
    };
  }

  // Fallback for USDT if stored on user profile
  if (cleanSymbol === 'USDT') {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists()) {
      const bal = Number(userDoc.data()?.walletBalance) || 0;
      return {
        symbol: 'USDT',
        name: 'Tether USD',
        balance: bal,
        locked: 0,
        totalDeposit: bal,
      };
    }
  }

  return {
    symbol: cleanSymbol,
    name: cleanSymbol,
    balance: 0,
    locked: 0,
    totalDeposit: 0,
  };
}

/**
 * Admin Action: Add coin balance to a user's multi-currency wallet.
 * Under NO circumstances can normal users add balance. Everything is real & admin only.
 */
export async function addCoinBalanceToUser(
  adminName: string,
  userId: string,
  symbol: string,
  amount: number,
  reason: string
): Promise<{ success: boolean; newBalance: number }> {
  const cleanSymbol = symbol.toUpperCase().trim();
  if (!amount || amount <= 0 || isNaN(amount)) {
    throw new Error('Security Violation: Only positive amounts can be credited.');
  }

  const userDocRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userDocRef);
  if (!userSnap.exists()) {
    throw new Error('User not found.');
  }
  const userData = userSnap.data() as UserProfile;

  // Fetch or initialize coin balance
  const balanceDocRef = doc(db, 'userWallets', userId, 'balances', cleanSymbol);
  const coinSnap = await getDoc(balanceDocRef);
  let previousBalance = 0;
  let totalDeposit = 0;

  if (coinSnap.exists()) {
    const prev = coinSnap.data() as CoinBalance;
    previousBalance = Number(prev.balance) || 0;
    totalDeposit = Number(prev.totalDeposit) || 0;
  } else if (cleanSymbol === 'USDT') {
    previousBalance = Number(userData.walletBalance) || 0;
    totalDeposit = previousBalance;
  }

  const newBalance = Number((previousBalance + amount).toFixed(cleanSymbol === 'BTC' || cleanSymbol === 'ETH' ? 8 : 4));
  const newTotalDeposit = Number((totalDeposit + amount).toFixed(cleanSymbol === 'BTC' || cleanSymbol === 'ETH' ? 8 : 4));

  const updatedCoinRecord: CoinBalance = {
    symbol: cleanSymbol,
    name: cleanSymbol,
    balance: newBalance,
    locked: 0,
    totalDeposit: newTotalDeposit,
    updatedAt: new Date().toISOString(),
  };

  await setDoc(balanceDocRef, updatedCoinRecord, { merge: true });

  // If crediting USDT, sync user's top-level walletBalance
  if (cleanSymbol === 'USDT') {
    await updateDoc(userDocRef, {
      walletBalance: newBalance,
      updatedAt: new Date().toISOString(),
    });
  }

  // Create immutable audit log in wallet_logs
  const logData: Omit<WalletLog, 'id'> = {
    timestamp: new Date().toISOString(),
    adminName,
    userId,
    userEmail: userData.email || '',
    userName: `${userData.firstName || ''} ${userData.lastName || ''}`.trim(),
    symbol: cleanSymbol,
    amount: Number(amount.toFixed(cleanSymbol === 'BTC' || cleanSymbol === 'ETH' ? 8 : 4)),
    previousBalance,
    newBalance,
    reason: reason.trim() || `Admin Credited ${amount} ${cleanSymbol}`,
    type: 'ADMIN_ADD',
  };

  await addDoc(collection(db, 'wallet_logs'), logData);

  return { success: true, newBalance };
}

/**
 * Admin Action: Deduct / Remove coin balance from user (for corrections)
 */
export async function deductCoinBalanceFromUser(
  adminName: string,
  userId: string,
  symbol: string,
  amount: number,
  reason: string
): Promise<{ success: boolean; newBalance: number }> {
  const cleanSymbol = symbol.toUpperCase().trim();
  if (!amount || amount <= 0 || isNaN(amount)) {
    throw new Error('Only positive amounts can be deducted.');
  }

  const userDocRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userDocRef);
  if (!userSnap.exists()) {
    throw new Error('User not found.');
  }
  const userData = userSnap.data() as UserProfile;

  const balanceDocRef = doc(db, 'userWallets', userId, 'balances', cleanSymbol);
  const coinSnap = await getDoc(balanceDocRef);
  let previousBalance = 0;

  if (coinSnap.exists()) {
    previousBalance = Number(coinSnap.data()?.balance) || 0;
  } else if (cleanSymbol === 'USDT') {
    previousBalance = Number(userData.walletBalance) || 0;
  }

  if (previousBalance < amount) {
    throw new Error(`Cannot deduct more than user's available balance (${previousBalance} ${cleanSymbol})`);
  }

  const newBalance = Number((previousBalance - amount).toFixed(cleanSymbol === 'BTC' || cleanSymbol === 'ETH' ? 8 : 4));

  await setDoc(balanceDocRef, {
    symbol: cleanSymbol,
    balance: newBalance,
    updatedAt: new Date().toISOString(),
  }, { merge: true });

  if (cleanSymbol === 'USDT') {
    await updateDoc(userDocRef, {
      walletBalance: newBalance,
      updatedAt: new Date().toISOString(),
    });
  }

  await addDoc(collection(db, 'wallet_logs'), {
    timestamp: new Date().toISOString(),
    adminName,
    userId,
    userEmail: userData.email,
    userName: `${userData.firstName || ''} ${userData.lastName || ''}`.trim(),
    symbol: cleanSymbol,
    amount: -amount,
    previousBalance,
    newBalance,
    reason: reason.trim() || `Admin Deducted ${amount} ${cleanSymbol}`,
    type: 'ADMIN_DEDUCT',
  });

  return { success: true, newBalance };
}

/**
 * Admin Action: Airdrop coin to all registered users
 */
export async function airdropCoinToAllUsers(
  adminName: string,
  symbol: string,
  amount: number,
  reason: string
): Promise<{ count: number }> {
  const cleanSymbol = symbol.toUpperCase().trim();
  if (!amount || amount <= 0) {
    throw new Error('Airdrop amount must be positive.');
  }

  const usersSnap = await getDocs(collection(db, 'users'));
  let count = 0;

  for (const userDoc of usersSnap.docs) {
    try {
      await addCoinBalanceToUser(
        adminName,
        userDoc.id,
        cleanSymbol,
        amount,
        `Airdrop: ${reason || 'Community Reward'}`
      );
      count++;
    } catch (e) {
      console.warn(`Error airdropping to user ${userDoc.id}:`, e);
    }
  }

  return { count };
}

/**
 * Real Trade Execution (Backend Validation):
 * Strictly validates that the trader possesses sufficient funds in Firestore before allowing buy or sell.
 * NO fake balance deductions.
 */
export async function executeSpotTrade(
  userId: string,
  userEmail: string,
  coinSymbol: string,
  side: 'BUY' | 'SELL',
  amount: number,
  orderPrice: number
): Promise<{
  success: boolean;
  error?: string;
  newUsdtBalance?: number;
  newCoinBalance?: number;
  totalUsdt?: number;
}> {
  const cleanCoin = coinSymbol.toUpperCase().trim();
  if (cleanCoin === 'USDT') {
    return { success: false, error: 'Cannot trade USDT for USDT.' };
  }

  if (!amount || amount <= 0 || isNaN(amount)) {
    return { success: false, error: 'Please enter a valid amount.' };
  }

  if (!orderPrice || orderPrice <= 0 || isNaN(orderPrice)) {
    return { success: false, error: 'Invalid order price.' };
  }

  const totalUsdt = Number((amount * orderPrice).toFixed(4));

  try {
    const userDocRef = doc(db, 'users', userId);
    const usdtDocRef = doc(db, 'userWallets', userId, 'balances', 'USDT');
    const coinDocRef = doc(db, 'userWallets', userId, 'balances', cleanCoin);

    const result = await runTransaction(db, async (tx) => {
      const userSnap = await tx.get(userDocRef);
      if (!userSnap.exists()) {
        throw new Error('User account not found.');
      }
      const userData = userSnap.data() as UserProfile;
      if (userData.isBlocked) {
        throw new Error('Your account has been suspended by administration.');
      }

      const usdtSnap = await tx.get(usdtDocRef);
      const coinSnap = await tx.get(coinDocRef);

      const currentUsdt = usdtSnap.exists()
        ? Number(usdtSnap.data()?.balance) || 0
        : Number(userData.walletBalance) || 0;

      const currentCoin = coinSnap.exists()
        ? Number(coinSnap.data()?.balance) || 0
        : 0;

      if (side === 'BUY') {
        // Buyer needs enough USDT
        if (currentUsdt < totalUsdt) {
          throw new Error(`Insufficient USDT balance. Required: ${totalUsdt.toFixed(2)} USDT, Available: ${currentUsdt.toFixed(2)} USDT`);
        }

        const newUsdt = Number((currentUsdt - totalUsdt).toFixed(2));
        const newCoin = Number((currentCoin + amount).toFixed(cleanCoin === 'BTC' || cleanCoin === 'ETH' ? 8 : 4));

        tx.set(usdtDocRef, {
          symbol: 'USDT',
          name: 'Tether USD',
          balance: newUsdt,
          updatedAt: new Date().toISOString(),
        }, { merge: true });

        tx.set(coinDocRef, {
          symbol: cleanCoin,
          name: cleanCoin,
          balance: newCoin,
          updatedAt: new Date().toISOString(),
        }, { merge: true });

        tx.update(userDocRef, {
          walletBalance: newUsdt,
          updatedAt: new Date().toISOString(),
        });

        return { newUsdt, newCoin };
      } else {
        // Seller needs enough of that specific coin
        if (currentCoin <= 0) {
          throw new Error(`No balance in ${cleanCoin} - Contact admin`);
        }
        if (currentCoin < amount) {
          throw new Error(`Insufficient ${cleanCoin} balance. Available: ${currentCoin} ${cleanCoin}`);
        }

        const newCoin = Number((currentCoin - amount).toFixed(cleanCoin === 'BTC' || cleanCoin === 'ETH' ? 8 : 4));
        const newUsdt = Number((currentUsdt + totalUsdt).toFixed(2));

        tx.set(coinDocRef, {
          symbol: cleanCoin,
          name: cleanCoin,
          balance: newCoin,
          updatedAt: new Date().toISOString(),
        }, { merge: true });

        tx.set(usdtDocRef, {
          symbol: 'USDT',
          name: 'Tether USD',
          balance: newUsdt,
          updatedAt: new Date().toISOString(),
        }, { merge: true });

        tx.update(userDocRef, {
          walletBalance: newUsdt,
          updatedAt: new Date().toISOString(),
        });

        return { newUsdt, newCoin };
      }
    });

    // Record verified transaction in ledger
    await addDoc(collection(db, 'transactions'), {
      type: 'spot_trade',
      userId,
      amount: side === 'BUY' ? -totalUsdt : totalUsdt,
      createdAt: new Date().toISOString(),
      details: `${side} ${amount} ${cleanCoin} @ ${orderPrice.toFixed(2)} USDT (Total: ${totalUsdt.toFixed(2)} USDT)`,
    });

    return {
      success: true,
      newUsdtBalance: result.newUsdt,
      newCoinBalance: result.newCoin,
      totalUsdt,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Trade execution failed.',
    };
  }
}

/**
 * Real-time subscription to wallet audit logs
 */
export function subscribeWalletLogs(callback: (logs: WalletLog[]) => void): () => void {
  const colRef = collection(db, 'wallet_logs');
  return onSnapshot(
    colRef,
    (snap) => {
      const logs: WalletLog[] = [];
      snap.forEach((docSnap) => {
        logs.push({ id: docSnap.id, ...(docSnap.data() as Omit<WalletLog, 'id'>) });
      });
      logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      callback(logs);
    },
    (err) => {
      console.warn('Error subscribing to wallet logs:', err);
      callback([]);
    }
  );
}

/**
 * Admin helper: Fetch all users with their multi-currency holdings
 */
export async function fetchAllUsersMultiCurrencyHoldings(): Promise<Array<{
  user: UserProfile;
  balances: Record<string, CoinBalance>;
  totalPortfolioUsdt: number;
}>> {
  const usersSnap = await getDocs(collection(db, 'users'));
  const supported = getCachedSupportedCoins();
  const priceMap = new Map<string, number>();
  for (const c of supported) {
    priceMap.set(c.symbol, c.currentPrice);
  }
  priceMap.set('USDT', 1.0);

  const results: Array<{
    user: UserProfile;
    balances: Record<string, CoinBalance>;
    totalPortfolioUsdt: number;
  }> = [];

  for (const uDoc of usersSnap.docs) {
    const user = uDoc.data() as UserProfile;
    const balances: Record<string, CoinBalance> = {};
    let totalUsdt = 0;

    try {
      const bSnap = await getDocs(collection(db, 'userWallets', user.uid, 'balances'));
      bSnap.forEach((bDoc) => {
        const b = bDoc.data() as CoinBalance;
        balances[b.symbol] = b;
        const p = priceMap.get(b.symbol) || 0;
        totalUsdt += (b.balance || 0) * p;
      });
    } catch {}

    // Ensure USDT is recorded
    if (!balances['USDT']) {
      const bal = Number(user.walletBalance) || 0;
      balances['USDT'] = {
        symbol: 'USDT',
        name: 'Tether USD',
        balance: bal,
        locked: 0,
        totalDeposit: bal,
      };
      totalUsdt += bal;
    }

    results.push({
      user,
      balances,
      totalPortfolioUsdt: Number(totalUsdt.toFixed(2)),
    });
  }

  results.sort((a, b) => b.totalPortfolioUsdt - a.totalPortfolioUsdt);
  return results;
}
