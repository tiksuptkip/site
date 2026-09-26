import { 
  collection, 
  doc, 
  getDoc, 
  updateDoc, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  limit 
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { WalletLog } from '../types';

/**
 * Strict Security Function:
 * ONLY allows ADDING balance to user wallet.
 * Under NO circumstances can an administrator withdraw or subtract balance.
 */
export async function addBalanceToUser(
  adminName: string,
  userId: string,
  amount: number,
  reason: string
): Promise<{ success: boolean; newBalance: number; error?: string }> {
  // STRICT VALIDATION: Amount must be strictly positive
  if (!amount || amount <= 0 || isNaN(amount)) {
    throw new Error('Security Violation: Only positive amounts can be added to user wallet.');
  }

  const userDocRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userDocRef);

  if (!userSnap.exists()) {
    throw new Error('User not found.');
  }

  const userData = userSnap.data();
  const previousBalance = Number(userData.walletBalance) || 0;
  const newBalance = Number((previousBalance + amount).toFixed(2));

  // Update user balance
  await updateDoc(userDocRef, {
    walletBalance: newBalance,
    updatedAt: new Date().toISOString(),
  });

  // Create immutable audit log in wallet_logs
  const logData: Omit<WalletLog, 'id'> = {
    timestamp: new Date().toISOString(),
    adminName,
    userId,
    userEmail: userData.email || '',
    userName: `${userData.firstName || ''} ${userData.lastName || ''}`.trim(),
    amount: Number(amount.toFixed(2)),
    previousBalance,
    newBalance,
    reason: reason.trim() || 'Administrative Credit',
    type: 'ADMIN_ADD',
  };

  await addDoc(collection(db, 'wallet_logs'), logData);

  return { success: true, newBalance };
}

export function subscribeWalletLogs(callback: (logs: WalletLog[]) => void): () => void {
  const colRef = collection(db, 'wallet_logs');
  return onSnapshot(
    colRef,
    (snap) => {
      const logs: WalletLog[] = [];
      snap.forEach((docSnap) => {
        logs.push({ id: docSnap.id, ...(docSnap.data() as Omit<WalletLog, 'id'>) });
      });
      // Sort newest first
      logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      callback(logs);
    },
    (err) => {
      console.warn('Error subscribing to wallet logs:', err);
      callback([]);
    }
  );
}
