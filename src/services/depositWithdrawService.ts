import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot 
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { DepositRecord, WithdrawalRecord, UserProfile, WalletLog } from '../types';
import { getUserProfile, saveUserProfile } from './userService';

// ================= DEPOSITS =================

export async function createDeposit(
  data: Omit<DepositRecord, 'id' | 'createdAt' | 'status'>
): Promise<DepositRecord> {
  const colRef = collection(db, 'deposits');
  const newDeposit: Omit<DepositRecord, 'id'> = {
    ...data,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  const docRef = await addDoc(colRef, newDeposit);
  return {
    id: docRef.id,
    ...newDeposit,
  };
}

export function subscribeAllDeposits(callback: (deposits: DepositRecord[]) => void): () => void {
  const colRef = collection(db, 'deposits');
  return onSnapshot(
    colRef,
    (snap) => {
      const items: DepositRecord[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<DepositRecord, 'id'>),
      }));
      // Sort newest first
      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      callback(items);
    },
    (err) => {
      console.warn('subscribeAllDeposits error:', err);
      callback([]);
    }
  );
}

export function subscribeUserDeposits(
  userId: string, 
  callback: (deposits: DepositRecord[]) => void
): () => void {
  const colRef = collection(db, 'deposits');
  const q = query(colRef, where('userId', '==', userId));
  return onSnapshot(
    q,
    (snap) => {
      const items: DepositRecord[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<DepositRecord, 'id'>),
      }));
      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      callback(items);
    },
    (err) => {
      console.warn('subscribeUserDeposits error:', err);
      callback([]);
    }
  );
}

export async function approveDeposit(depositId: string, adminName: string): Promise<void> {
  const depositRef = doc(db, 'deposits', depositId);
  const snap = await getDoc(depositRef);
  if (!snap.exists()) {
    throw new Error('Deposit record not found');
  }

  const deposit = snap.data() as DepositRecord;
  if (deposit.status !== 'pending') {
    throw new Error(`Deposit is already ${deposit.status}`);
  }

  // Update deposit status
  await updateDoc(depositRef, {
    status: 'approved',
    reviewedAt: new Date().toISOString(),
    reviewedBy: adminName,
  });

  // Credit user's wallet
  const user = await getUserProfile(deposit.userId);
  if (user) {
    const prevBalance = user.walletBalance || 0;
    const newBalance = Number((prevBalance + deposit.amount).toFixed(2));
    await saveUserProfile({
      ...user,
      walletBalance: newBalance,
    });

    // Write audit log
    const logCol = collection(db, 'wallet_logs');
    const auditLog: Omit<WalletLog, 'id'> = {
      timestamp: new Date().toISOString(),
      adminName,
      userId: user.uid,
      userEmail: user.email,
      userName: `${user.firstName} ${user.lastName}`,
      amount: deposit.amount,
      previousBalance: prevBalance,
      newBalance,
      reason: `Deposit Approved (${deposit.coin} - TxID: ${deposit.txId.slice(0, 10)}...)`,
      type: 'ADMIN_ADD',
    };
    await addDoc(logCol, auditLog);
  }
}

export async function rejectDeposit(depositId: string, adminName: string): Promise<void> {
  const depositRef = doc(db, 'deposits', depositId);
  const snap = await getDoc(depositRef);
  if (!snap.exists()) {
    throw new Error('Deposit record not found');
  }
  const deposit = snap.data() as DepositRecord;
  if (deposit.status !== 'pending') {
    throw new Error(`Deposit is already ${deposit.status}`);
  }

  await updateDoc(depositRef, {
    status: 'rejected',
    reviewedAt: new Date().toISOString(),
    reviewedBy: adminName,
  });
}

// ================= WITHDRAWALS =================

export async function createWithdrawal(
  data: Omit<WithdrawalRecord, 'id' | 'createdAt' | 'status'>
): Promise<WithdrawalRecord> {
  const user = await getUserProfile(data.userId);
  if (!user) {
    throw new Error('User profile not found');
  }

  if (user.walletBalance < data.amount) {
    throw new Error('Insufficient wallet balance for this withdrawal');
  }

  // Deduct upfront
  const prevBalance = user.walletBalance;
  const newBalance = Number((prevBalance - data.amount).toFixed(2));
  await saveUserProfile({
    ...user,
    walletBalance: newBalance,
  });

  const colRef = collection(db, 'withdrawals');
  const newWithdrawal: Omit<WithdrawalRecord, 'id'> = {
    ...data,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  const docRef = await addDoc(colRef, newWithdrawal);
  return {
    id: docRef.id,
    ...newWithdrawal,
  };
}

export function subscribeAllWithdrawals(callback: (withdrawals: WithdrawalRecord[]) => void): () => void {
  const colRef = collection(db, 'withdrawals');
  return onSnapshot(
    colRef,
    (snap) => {
      const items: WithdrawalRecord[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<WithdrawalRecord, 'id'>),
      }));
      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      callback(items);
    },
    (err) => {
      console.warn('subscribeAllWithdrawals error:', err);
      callback([]);
    }
  );
}

export function subscribeUserWithdrawals(
  userId: string, 
  callback: (withdrawals: WithdrawalRecord[]) => void
): () => void {
  const colRef = collection(db, 'withdrawals');
  const q = query(colRef, where('userId', '==', userId));
  return onSnapshot(
    q,
    (snap) => {
      const items: WithdrawalRecord[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<WithdrawalRecord, 'id'>),
      }));
      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      callback(items);
    },
    (err) => {
      console.warn('subscribeUserWithdrawals error:', err);
      callback([]);
    }
  );
}

export async function approveWithdrawal(withdrawalId: string, adminName: string): Promise<void> {
  const withdrawalRef = doc(db, 'withdrawals', withdrawalId);
  const snap = await getDoc(withdrawalRef);
  if (!snap.exists()) {
    throw new Error('Withdrawal record not found');
  }

  const withdrawal = snap.data() as WithdrawalRecord;
  if (withdrawal.status !== 'pending') {
    throw new Error(`Withdrawal is already ${withdrawal.status}`);
  }

  await updateDoc(withdrawalRef, {
    status: 'approved',
    reviewedAt: new Date().toISOString(),
    reviewedBy: adminName,
  });
}

export async function rejectWithdrawal(withdrawalId: string, adminName: string): Promise<void> {
  const withdrawalRef = doc(db, 'withdrawals', withdrawalId);
  const snap = await getDoc(withdrawalRef);
  if (!snap.exists()) {
    throw new Error('Withdrawal record not found');
  }

  const withdrawal = snap.data() as WithdrawalRecord;
  if (withdrawal.status !== 'pending') {
    throw new Error(`Withdrawal is already ${withdrawal.status}`);
  }

  // Mark rejected
  await updateDoc(withdrawalRef, {
    status: 'rejected',
    reviewedAt: new Date().toISOString(),
    reviewedBy: adminName,
  });

  // REFUND balance to user
  const user = await getUserProfile(withdrawal.userId);
  if (user) {
    const prevBalance = user.walletBalance || 0;
    const newBalance = Number((prevBalance + withdrawal.amount).toFixed(2));
    await saveUserProfile({
      ...user,
      walletBalance: newBalance,
    });

    // Write audit log for refund
    const logCol = collection(db, 'wallet_logs');
    const auditLog: Omit<WalletLog, 'id'> = {
      timestamp: new Date().toISOString(),
      adminName,
      userId: user.uid,
      userEmail: user.email,
      userName: `${user.firstName} ${user.lastName}`,
      amount: withdrawal.amount,
      previousBalance: prevBalance,
      newBalance,
      reason: `Withdrawal Rejected & Refunded (${withdrawal.coin} - ${withdrawal.amount} USDT)`,
      type: 'ADMIN_ADD',
    };
    await addDoc(logCol, auditLog);
  }
}
