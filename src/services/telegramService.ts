import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  addDoc, 
  onSnapshot, 
  query, 
  where 
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { TelegramChannel, TelegramSubscription, UserProfile, WalletLog } from '../types';
import { getUserProfile, saveUserProfile } from './userService';

export const DEFAULT_TELEGRAM_CHANNELS: TelegramChannel[] = [
  {
    channelId: 'super_vip',
    title: 'SUPER VIP',
    price: 250,
    inviteLink: 'https://t.me/+tiksup_super_vip_master',
    durationDays: 30,
    winRate: '96.8%',
    totalTrades: 1940,
    description: 'Exclusive High-Leverage & Spot Whale Signals with 1:5+ Risk-Reward Ratio, direct live entries, exact stop-loss/take-profit targets, and 24/7 private VIP consultation.',
    badge: '👑 MOST PROFITABLE',
    color: 'gold',
    proofImages: [
      'https://images.unsplash.com/photo-1642543492481-44e81e3914a7?w=700&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=700&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1621416894569-0f39ed31d247?w=700&auto=format&fit=crop&q=80'
    ]
  },
  {
    channelId: 'vip',
    title: 'VIP',
    price: 150,
    inviteLink: 'https://t.me/+tiksup_vip_daily_calls',
    durationDays: 30,
    winRate: '92.4%',
    totalTrades: 1380,
    description: 'Daily intraday signals (4-8 calls/day), major altcoin breakouts, BTC scalp alerts, and automated trading bot triggers.',
    badge: '⚡ POPULAR',
    color: 'emerald',
    proofImages: [
      'https://images.unsplash.com/photo-1642790106117-e829e14a795f?w=700&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1622979135225-d2ba269bc1df?w=700&auto=format&fit=crop&q=80'
    ]
  },
  {
    channelId: 'regular',
    title: 'REGULAR',
    price: 100,
    inviteLink: 'https://t.me/+tiksup_regular_signals',
    durationDays: 30,
    winRate: '86.5%',
    totalTrades: 920,
    description: 'Solid swing setups, market trend reviews, macro economic calendar updates, and key support/resistance signals.',
    badge: '💎 ESSENTIAL',
    color: 'blue',
    proofImages: [
      'https://images.unsplash.com/photo-1621416894569-0f39ed31d247?w=700&auto=format&fit=crop&q=80'
    ]
  }
];

export async function initializeTelegramChannelsIfEmpty(): Promise<void> {
  try {
    for (const channel of DEFAULT_TELEGRAM_CHANNELS) {
      const docRef = doc(db, 'telegramChannels', channel.channelId);
      const snap = await getDoc(docRef);
      if (!snap.exists()) {
        await setDoc(docRef, {
          ...channel,
          updatedAt: new Date().toISOString(),
        });
      }
    }
  } catch (err) {
    console.warn('initializeTelegramChannelsIfEmpty notice:', err);
  }
}

export function subscribeTelegramChannels(callback: (channels: TelegramChannel[]) => void): () => void {
  const colRef = collection(db, 'telegramChannels');
  return onSnapshot(
    colRef,
    (snap) => {
      if (snap.empty) {
        initializeTelegramChannelsIfEmpty().catch(console.warn);
        callback(DEFAULT_TELEGRAM_CHANNELS);
        return;
      }
      const loaded: TelegramChannel[] = snap.docs.map((d) => ({
        channelId: d.id,
        ...(d.data() as any),
      }));

      // Sort in standard order: super_vip, vip, regular
      const order = ['super_vip', 'vip', 'regular'];
      loaded.sort((a, b) => {
        const idxA = order.indexOf(a.channelId);
        const idxB = order.indexOf(b.channelId);
        return (idxA >= 0 ? idxA : 99) - (idxB >= 0 ? idxB : 99);
      });

      callback(loaded);
    },
    (err) => {
      console.warn('subscribeTelegramChannels error:', err);
      callback(DEFAULT_TELEGRAM_CHANNELS);
    }
  );
}

export async function updateTelegramChannel(
  channelId: string, 
  data: Partial<TelegramChannel>
): Promise<void> {
  const docRef = doc(db, 'telegramChannels', channelId);
  await setDoc(docRef, {
    ...data,
    updatedAt: new Date().toISOString(),
  }, { merge: true });
}

// ================= SUBSCRIPTIONS =================

export function subscribeAllTelegramSubscriptions(
  callback: (subs: TelegramSubscription[]) => void
): () => void {
  const colRef = collection(db, 'telegramSubscriptions');
  return onSnapshot(
    colRef,
    (snap) => {
      const items: TelegramSubscription[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      }));

      // Check auto-expire for any subscriptions
      const now = Date.now();
      for (const sub of items) {
        if (sub.status === 'active' && new Date(sub.endDate).getTime() < now) {
          sub.status = 'expired';
          // auto update in firestore
          updateDoc(doc(db, 'telegramSubscriptions', sub.id!), { status: 'expired' }).catch(console.warn);
        }
      }

      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      callback(items);
    },
    (err) => {
      console.warn('subscribeAllTelegramSubscriptions error:', err);
      callback([]);
    }
  );
}

export function subscribeUserTelegramSubscriptions(
  userEmail: string,
  callback: (subs: TelegramSubscription[]) => void
): () => void {
  const colRef = collection(db, 'telegramSubscriptions');
  const q = query(colRef, where('userEmail', '==', userEmail.toLowerCase().trim()));
  return onSnapshot(
    q,
    (snap) => {
      const items: TelegramSubscription[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      }));

      const now = Date.now();
      for (const sub of items) {
        if (sub.status === 'active' && new Date(sub.endDate).getTime() < now) {
          sub.status = 'expired';
          updateDoc(doc(db, 'telegramSubscriptions', sub.id!), { status: 'expired' }).catch(console.warn);
        }
      }

      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      callback(items);
    },
    (err) => {
      console.warn('subscribeUserTelegramSubscriptions error:', err);
      callback([]);
    }
  );
}

export async function subscribeToChannel(
  user: UserProfile, 
  channel: TelegramChannel
): Promise<{ subscription: TelegramSubscription; newBalance: number }> {
  // 1. Verify balance
  if (user.walletBalance < channel.price) {
    throw new Error('INSUFFICIENT_BALANCE');
  }

  // 2. Deduct balance
  const prevBalance = user.walletBalance;
  const newBalance = Number((prevBalance - channel.price).toFixed(2));
  await saveUserProfile({
    ...user,
    walletBalance: newBalance,
  });

  // 3. Compute Dates
  const now = new Date();
  const durationMs = (channel.durationDays || 30) * 24 * 60 * 60 * 1000;
  const endDate = new Date(now.getTime() + durationMs);

  // 4. Create Subscription
  const subData: Omit<TelegramSubscription, 'id'> = {
    userId: user.uid,
    userEmail: user.email.toLowerCase().trim(),
    channelId: channel.channelId,
    channelTitle: channel.title,
    pricePaid: channel.price,
    startDate: now.toISOString(),
    endDate: endDate.toISOString(),
    status: 'active',
    inviteLink: channel.inviteLink,
    createdAt: now.toISOString(),
  };

  const docRef = await addDoc(collection(db, 'telegramSubscriptions'), subData);

  // 5. Audit Log
  const logCol = collection(db, 'wallet_logs');
  const auditLog: Omit<WalletLog, 'id'> = {
    timestamp: now.toISOString(),
    adminName: 'System / Subscription',
    userId: user.uid,
    userEmail: user.email,
    userName: `${user.firstName} ${user.lastName}`,
    amount: -channel.price,
    previousBalance: prevBalance,
    newBalance,
    reason: `Telegram ${channel.title} Subscription (${channel.durationDays} Days)`,
    type: 'ADMIN_ADD',
  };
  await addDoc(logCol, auditLog);

  return {
    subscription: {
      id: docRef.id,
      ...subData,
    },
    newBalance,
  };
}

export async function extendTelegramSubscription(
  subId: string, 
  extraDays: number = 5
): Promise<void> {
  const docRef = doc(db, 'telegramSubscriptions', subId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) {
    throw new Error('Subscription not found');
  }

  const sub = snap.data() as TelegramSubscription;
  const currentEnd = new Date(sub.endDate).getTime();
  const baseTime = currentEnd > Date.now() ? currentEnd : Date.now();
  const newEnd = new Date(baseTime + extraDays * 24 * 60 * 60 * 1000);

  await updateDoc(docRef, {
    endDate: newEnd.toISOString(),
    status: 'active',
  });
}

export async function kickTelegramSubscription(subId: string): Promise<void> {
  const docRef = doc(db, 'telegramSubscriptions', subId);
  await updateDoc(docRef, {
    status: 'cancelled',
  });
}
