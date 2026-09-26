import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  addDoc, 
  query, 
  where, 
  onSnapshot 
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { 
  ReferralSettings, 
  ReferralTier, 
  ReferralRecord, 
  TransactionRecord, 
  UserProfile, 
  DepositRecord, 
  WalletLog 
} from '../types';
import { getUserProfile, saveUserProfile } from './userService';

export const REFERRAL_SETTINGS_DOC = 'tiers';

export const DEFAULT_REFERRAL_TIERS: ReferralTier[] = [
  { id: 'tier_1', name: 'Tier 1 (1 - 10 referrals)', minReferrals: 1, maxReferrals: 10, commissionPercent: 10 },
  { id: 'tier_2', name: 'Tier 2 (11 - 20 referrals)', minReferrals: 11, maxReferrals: 20, commissionPercent: 8 },
  { id: 'tier_3', name: 'Tier 3 (21 - 50 referrals)', minReferrals: 21, maxReferrals: 50, commissionPercent: 5 },
  { id: 'tier_4', name: 'Tier 4 (51+ referrals)', minReferrals: 51, maxReferrals: 999999, commissionPercent: 3 },
];

export const DEFAULT_REFERRAL_SETTINGS: ReferralSettings = {
  tiers: DEFAULT_REFERRAL_TIERS,
  globalPercent: 10,
  level2Percent: 3,
  level3Percent: 1,
  autoAddToWallet: true,
  updatedAt: new Date().toISOString(),
};

// 1. Settings CRUD
export async function getReferralSettings(): Promise<ReferralSettings> {
  try {
    const docRef = doc(db, 'referralSettings', REFERRAL_SETTINGS_DOC);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as ReferralSettings;
    }
    await setDoc(docRef, DEFAULT_REFERRAL_SETTINGS);
    return DEFAULT_REFERRAL_SETTINGS;
  } catch (err) {
    console.warn('getReferralSettings error, fallback to default:', err);
    return DEFAULT_REFERRAL_SETTINGS;
  }
}

export function subscribeReferralSettings(callback: (settings: ReferralSettings) => void): () => void {
  const docRef = doc(db, 'referralSettings', REFERRAL_SETTINGS_DOC);
  return onSnapshot(
    docRef,
    (snap) => {
      if (snap.exists()) {
        callback(snap.data() as ReferralSettings);
      } else {
        setDoc(docRef, DEFAULT_REFERRAL_SETTINGS).catch(console.warn);
        callback(DEFAULT_REFERRAL_SETTINGS);
      }
    },
    (err) => {
      console.warn('subscribeReferralSettings error:', err);
      callback(DEFAULT_REFERRAL_SETTINGS);
    }
  );
}

export async function saveReferralSettings(settings: ReferralSettings, adminName?: string): Promise<void> {
  const docRef = doc(db, 'referralSettings', REFERRAL_SETTINGS_DOC);
  await setDoc(docRef, {
    ...settings,
    updatedAt: new Date().toISOString(),
    ...(adminName ? { updatedBy: adminName } : {}),
  }, { merge: true });
}

// 2. Find Tier for referral count
export function getTierForReferralCount(count: number, tiers: ReferralTier[], fallbackPercent: number = 10): ReferralTier {
  const activeCount = Math.max(1, count);
  const matched = tiers.find(t => activeCount >= t.minReferrals && activeCount <= t.maxReferrals);
  if (matched) return matched;
  return {
    id: 'default',
    name: `Standard Tier (${fallbackPercent}%)`,
    minReferrals: 0,
    maxReferrals: 999999,
    commissionPercent: fallbackPercent,
  };
}

// 3. User Referrals subscriptions
export function subscribeUserReferrals(userId: string, callback: (referrals: ReferralRecord[]) => void): () => void {
  const colRef = collection(db, 'referrals');
  const q = query(colRef, where('referrerId', '==', userId));
  return onSnapshot(
    q,
    (snap) => {
      const items: ReferralRecord[] = snap.docs.map(d => ({
        id: d.id,
        ...(d.data() as any)
      }));
      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      callback(items);
    },
    (err) => {
      console.warn('subscribeUserReferrals error:', err);
      callback([]);
    }
  );
}

export function subscribeAllReferrals(callback: (referrals: ReferralRecord[]) => void): () => void {
  const colRef = collection(db, 'referrals');
  return onSnapshot(
    colRef,
    (snap) => {
      const items: ReferralRecord[] = snap.docs.map(d => ({
        id: d.id,
        ...(d.data() as any)
      }));
      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      callback(items);
    },
    (err) => {
      console.warn('subscribeAllReferrals error:', err);
      callback([]);
    }
  );
}

// 4. Transactions Ledger
export function subscribeUserTransactions(userId: string, callback: (transactions: TransactionRecord[]) => void): () => void {
  const colRef = collection(db, 'transactions');
  const q = query(colRef, where('userId', '==', userId));
  return onSnapshot(
    q,
    (snap) => {
      const items: TransactionRecord[] = snap.docs.map(d => ({
        id: d.id,
        ...(d.data() as any)
      }));
      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      callback(items);
    },
    (err) => {
      console.warn('subscribeUserTransactions error:', err);
      callback([]);
    }
  );
}

export function subscribeAllTransactions(callback: (transactions: TransactionRecord[]) => void): () => void {
  const colRef = collection(db, 'transactions');
  return onSnapshot(
    colRef,
    (snap) => {
      const items: TransactionRecord[] = snap.docs.map(d => ({
        id: d.id,
        ...(d.data() as any)
      }));
      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      callback(items);
    },
    (err) => {
      console.warn('subscribeAllTransactions error:', err);
      callback([]);
    }
  );
}

// 5. Automatic Commission Calculation Engine (Tiers + Levels 1, 2, 3)
export async function calculateAndAwardReferralCommission(
  deposit: DepositRecord, 
  adminName: string = 'System / Referral Engine'
): Promise<{ awarded: boolean; count: number; totalCommission: number }> {
  try {
    const settings = await getReferralSettings();
    const depositingUser = await getUserProfile(deposit.userId);
    if (!depositingUser) return { awarded: false, count: 0, totalCommission: 0 };

    const referredById = depositingUser.referredBy;
    if (!referredById) {
      // User wasn't referred
      return { awarded: false, count: 0, totalCommission: 0 };
    }

    let totalAwarded = 0;
    let countAwarded = 0;
    const now = new Date().toISOString();
    const depositingUserName = `${depositingUser.firstName} ${depositingUser.lastName}`.trim();

    // === LEVEL 1 REFERRER ===
    const l1Referrer = await getUserProfile(referredById);
    if (l1Referrer) {
      const l1DirectCount = l1Referrer.referralCount || 1;
      const matchedTier = getTierForReferralCount(l1DirectCount, settings.tiers, settings.globalPercent);
      const commissionPercent = matchedTier.commissionPercent || settings.globalPercent || 10;
      const commissionAmount = Number(((deposit.amount * commissionPercent) / 100).toFixed(2));

      if (commissionAmount > 0) {
        // Record in referrals collection
        await addDoc(collection(db, 'referrals'), {
          referrerId: l1Referrer.uid,
          referredId: depositingUser.uid,
          level: 1,
          depositAmount: deposit.amount,
          commissionEarned: commissionAmount,
          status: 'completed',
          createdAt: now,
          referredName: depositingUserName,
          referredEmail: depositingUser.email,
        });

        // Record in transactions collection
        await addDoc(collection(db, 'transactions'), {
          type: 'referral_commission',
          userId: l1Referrer.uid,
          amount: commissionAmount,
          fromUser: depositingUser.uid,
          fromUserName: depositingUserName,
          tier: matchedTier.name,
          createdAt: now,
          details: `Level 1 (${commissionPercent}%) commission from deposit by ${depositingUserName}`,
        });

        // If autoAddToWallet enabled, credit referrer's walletBalance and referralEarnings
        if (settings.autoAddToWallet !== false) {
          const prevBalance = l1Referrer.walletBalance || 0;
          const newBalance = Number((prevBalance + commissionAmount).toFixed(2));
          const updatedEarnings = Number(((l1Referrer.referralEarnings || 0) + commissionAmount).toFixed(2));

          await saveUserProfile({
            ...l1Referrer,
            walletBalance: newBalance,
            referralEarnings: updatedEarnings,
          });

          // Sync to multi-currency sub-collection userWallets/{userId}/balances/USDT
          await setDoc(doc(db, 'userWallets', l1Referrer.uid, 'balances', 'USDT'), {
            symbol: 'USDT',
            name: 'Tether USD',
            balance: newBalance,
            updatedAt: now,
          }, { merge: true }).catch(() => {});

          // Log in wallet_logs
          await addDoc(collection(db, 'wallet_logs'), {
            timestamp: now,
            adminName,
            userId: l1Referrer.uid,
            userEmail: l1Referrer.email,
            userName: `${l1Referrer.firstName} ${l1Referrer.lastName}`,
            symbol: 'USDT',
            amount: commissionAmount,
            previousBalance: prevBalance,
            newBalance,
            reason: `Referral Commission (Level 1 - ${commissionPercent}% on $${deposit.amount}) from ${depositingUserName}`,
            type: 'ADMIN_ADD',
          } as Omit<WalletLog, 'id'>);
        }

        totalAwarded += commissionAmount;
        countAwarded++;
      }

      // === LEVEL 2 REFERRER ===
      if (l1Referrer.referredBy && (settings.level2Percent || 0) > 0) {
        const l2Referrer = await getUserProfile(l1Referrer.referredBy);
        if (l2Referrer) {
          const l2Commission = Number(((deposit.amount * settings.level2Percent) / 100).toFixed(2));
          if (l2Commission > 0) {
            await addDoc(collection(db, 'referrals'), {
              referrerId: l2Referrer.uid,
              referredId: depositingUser.uid,
              level: 2,
              depositAmount: deposit.amount,
              commissionEarned: l2Commission,
              status: 'completed',
              createdAt: now,
              referredName: depositingUserName,
              referredEmail: depositingUser.email,
            });

            await addDoc(collection(db, 'transactions'), {
              type: 'referral_commission',
              userId: l2Referrer.uid,
              amount: l2Commission,
              fromUser: depositingUser.uid,
              fromUserName: depositingUserName,
              tier: `Level 2 (${settings.level2Percent}%)`,
              createdAt: now,
              details: `Level 2 (${settings.level2Percent}%) commission from deposit by ${depositingUserName}`,
            });

            if (settings.autoAddToWallet !== false) {
              const prevBalance = l2Referrer.walletBalance || 0;
              const newBalance = Number((prevBalance + l2Commission).toFixed(2));
              const updatedEarnings = Number(((l2Referrer.referralEarnings || 0) + l2Commission).toFixed(2));

              await saveUserProfile({
                ...l2Referrer,
                walletBalance: newBalance,
                referralEarnings: updatedEarnings,
              });

              // Sync to multi-currency sub-collection userWallets/{userId}/balances/USDT
              await setDoc(doc(db, 'userWallets', l2Referrer.uid, 'balances', 'USDT'), {
                symbol: 'USDT',
                name: 'Tether USD',
                balance: newBalance,
                updatedAt: now,
              }, { merge: true }).catch(() => {});

              await addDoc(collection(db, 'wallet_logs'), {
                timestamp: now,
                adminName,
                userId: l2Referrer.uid,
                userEmail: l2Referrer.email,
                userName: `${l2Referrer.firstName} ${l2Referrer.lastName}`,
                symbol: 'USDT',
                amount: l2Commission,
                previousBalance: prevBalance,
                newBalance,
                reason: `Referral Commission (Level 2 - ${settings.level2Percent}% on $${deposit.amount}) from ${depositingUserName}`,
                type: 'ADMIN_ADD',
              } as Omit<WalletLog, 'id'>);
            }

            totalAwarded += l2Commission;
            countAwarded++;
          }

          // === LEVEL 3 REFERRER ===
          if (l2Referrer.referredBy && (settings.level3Percent || 0) > 0) {
            const l3Referrer = await getUserProfile(l2Referrer.referredBy);
            if (l3Referrer) {
              const l3Commission = Number(((deposit.amount * settings.level3Percent) / 100).toFixed(2));
              if (l3Commission > 0) {
                await addDoc(collection(db, 'referrals'), {
                  referrerId: l3Referrer.uid,
                  referredId: depositingUser.uid,
                  level: 3,
                  depositAmount: deposit.amount,
                  commissionEarned: l3Commission,
                  status: 'completed',
                  createdAt: now,
                  referredName: depositingUserName,
                  referredEmail: depositingUser.email,
                });

                await addDoc(collection(db, 'transactions'), {
                  type: 'referral_commission',
                  userId: l3Referrer.uid,
                  amount: l3Commission,
                  fromUser: depositingUser.uid,
                  fromUserName: depositingUserName,
                  tier: `Level 3 (${settings.level3Percent}%)`,
                  createdAt: now,
                  details: `Level 3 (${settings.level3Percent}%) commission from deposit by ${depositingUserName}`,
                });

                if (settings.autoAddToWallet !== false) {
                  const prevBalance = l3Referrer.walletBalance || 0;
                  const newBalance = Number((prevBalance + l3Commission).toFixed(2));
                  const updatedEarnings = Number(((l3Referrer.referralEarnings || 0) + l3Commission).toFixed(2));

                  await saveUserProfile({
                    ...l3Referrer,
                    walletBalance: newBalance,
                    referralEarnings: updatedEarnings,
                  });

                  // Sync to multi-currency sub-collection userWallets/{userId}/balances/USDT
                  await setDoc(doc(db, 'userWallets', l3Referrer.uid, 'balances', 'USDT'), {
                    symbol: 'USDT',
                    name: 'Tether USD',
                    balance: newBalance,
                    updatedAt: now,
                  }, { merge: true }).catch(() => {});

                  await addDoc(collection(db, 'wallet_logs'), {
                    timestamp: now,
                    adminName,
                    userId: l3Referrer.uid,
                    userEmail: l3Referrer.email,
                    userName: `${l3Referrer.firstName} ${l3Referrer.lastName}`,
                    symbol: 'USDT',
                    amount: l3Commission,
                    previousBalance: prevBalance,
                    newBalance,
                    reason: `Referral Commission (Level 3 - ${settings.level3Percent}% on $${deposit.amount}) from ${depositingUserName}`,
                    type: 'ADMIN_ADD',
                  } as Omit<WalletLog, 'id'>);
                }

                totalAwarded += l3Commission;
                countAwarded++;
              }
            }
          }
        }
      }
    }

    return { awarded: countAwarded > 0, count: countAwarded, totalCommission: totalAwarded };
  } catch (err) {
    console.error('calculateAndAwardReferralCommission error:', err);
    return { awarded: false, count: 0, totalCommission: 0 };
  }
}

// 6. Referral Tree Data Structure for Family Tree View
export interface ReferralTreeNode {
  user: UserProfile;
  level: number;
  totalGeneratedCommission: number;
  children: ReferralTreeNode[];
}

export function buildReferralHierarchy(
  rootUser: UserProfile, 
  allUsers: UserProfile[], 
  allReferrals: ReferralRecord[]
): ReferralTreeNode {
  // Map of userId to direct referrals
  const userMap = new Map<string, UserProfile>();
  allUsers.forEach(u => userMap.set(u.uid, u));

  // Commission earned by root from each user
  const commissionMap = new Map<string, number>();
  allReferrals.forEach(r => {
    if (r.referrerId === rootUser.uid) {
      commissionMap.set(r.referredId, (commissionMap.get(r.referredId) || 0) + (r.commissionEarned || 0));
    }
  });

  // Level 1: users who have referredBy === rootUser.uid
  const l1Users = allUsers.filter(u => u.referredBy === rootUser.uid);

  const l1Nodes: ReferralTreeNode[] = l1Users.map(l1 => {
    // Level 2: users who have referredBy === l1.uid
    const l2Users = allUsers.filter(u => u.referredBy === l1.uid);
    const l2Nodes: ReferralTreeNode[] = l2Users.map(l2 => {
      // Level 3: users who have referredBy === l2.uid
      const l3Users = allUsers.filter(u => u.referredBy === l2.uid);
      const l3Nodes: ReferralTreeNode[] = l3Users.map(l3 => ({
        user: l3,
        level: 3,
        totalGeneratedCommission: commissionMap.get(l3.uid) || 0,
        children: [],
      }));

      return {
        user: l2,
        level: 2,
        totalGeneratedCommission: commissionMap.get(l2.uid) || 0,
        children: l3Nodes,
      };
    });

    return {
      user: l1,
      level: 1,
      totalGeneratedCommission: commissionMap.get(l1.uid) || 0,
      children: l2Nodes,
    };
  });

  return {
    user: rootUser,
    level: 0,
    totalGeneratedCommission: rootUser.referralEarnings || 0,
    children: l1Nodes,
  };
}

// 7. Admin Manual Commission Adjustment
export async function adminAdjustUserCommission(
  userId: string, 
  amountChange: number, 
  reason: string, 
  adminName: string
): Promise<void> {
  const user = await getUserProfile(userId);
  if (!user) throw new Error('User not found');

  const now = new Date().toISOString();
  const prevBalance = user.walletBalance || 0;
  const newBalance = Number((prevBalance + amountChange).toFixed(2));
  const newEarnings = Number(((user.referralEarnings || 0) + amountChange).toFixed(2));

  await saveUserProfile({
    ...user,
    walletBalance: newBalance,
    referralEarnings: Math.max(0, newEarnings),
  });

  // Log in transactions
  await addDoc(collection(db, 'transactions'), {
    type: 'referral_commission',
    userId: user.uid,
    amount: amountChange,
    tier: 'Admin Adjustment',
    createdAt: now,
    details: `Manual referral adjustment by ${adminName}: ${reason}`,
  });

  // Log in wallet_logs
  await addDoc(collection(db, 'wallet_logs'), {
    timestamp: now,
    adminName,
    userId: user.uid,
    userEmail: user.email,
    userName: `${user.firstName} ${user.lastName}`,
    amount: amountChange,
    previousBalance: prevBalance,
    newBalance,
    reason: `Admin Referral Adjustment: ${reason}`,
    type: 'ADMIN_ADD',
  } as Omit<WalletLog, 'id'>);
}
