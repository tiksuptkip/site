import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  query, 
  where, 
  onSnapshot, 
  orderBy,
  limit
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { UserProfile, OtpVerificationRecord } from '../types';

export async function checkEmailExists(email: string): Promise<boolean> {
  const normalizedEmail = email.trim().toLowerCase();
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('email', '==', normalizedEmail));
  const snap = await getDocs(q);
  return !snap.empty;
}

export async function generateAndSaveOtp(
  email: string, 
  purpose: 'REGISTER' | 'PASSWORD_RESET', 
  ip: string
): Promise<string> {
  const normalizedEmail = email.trim().toLowerCase();
  // Generate authentic 6-digit code
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 10 * 60 * 1000).toISOString(); // 10 minutes expiry

  const recordId = `${normalizedEmail}_${purpose}`;
  const docRef = doc(db, 'otp_verifications', recordId);

  const otpData: OtpVerificationRecord = {
    email: normalizedEmail,
    otp,
    purpose,
    createdAt: now.toISOString(),
    expiresAt,
    verified: false,
    ip,
  };

  await setDoc(docRef, otpData);
  return otp;
}

export async function verifyOtpCode(
  email: string, 
  code: string, 
  purpose: 'REGISTER' | 'PASSWORD_RESET'
): Promise<{ valid: boolean; message?: string }> {
  const normalizedEmail = email.trim().toLowerCase();
  const recordId = `${normalizedEmail}_${purpose}`;
  const docRef = doc(db, 'otp_verifications', recordId);
  const snap = await getDoc(docRef);

  if (!snap.exists()) {
    return { valid: false, message: 'No OTP verification request found.' };
  }

  const data = snap.data() as OtpVerificationRecord;
  const now = new Date().toISOString();

  if (now > data.expiresAt) {
    return { valid: false, message: 'Verification code has expired.' };
  }

  if (data.otp !== code.trim()) {
    return { valid: false, message: 'Invalid 6-digit code.' };
  }

  // Mark as verified
  await updateDoc(docRef, { verified: true });
  return { valid: true };
}

export async function saveUserProfile(profile: UserProfile): Promise<void> {
  const docRef = doc(db, 'users', profile.uid);
  await setDoc(docRef, {
    ...profile,
    email: profile.email.trim().toLowerCase(),
    updatedAt: new Date().toISOString(),
  });
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const docRef = doc(db, 'users', uid);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return null;
  return snap.data() as UserProfile;
}

export function subscribeUserProfile(uid: string, callback: (profile: UserProfile | null) => void): () => void {
  const docRef = doc(db, 'users', uid);
  return onSnapshot(
    docRef,
    (snap) => {
      if (snap.exists()) {
        callback(snap.data() as UserProfile);
      } else {
        callback(null);
      }
    },
    (err) => {
      console.warn('Error subscribing to user profile:', err);
      callback(null);
    }
  );
}

export function subscribeAllUsers(callback: (users: UserProfile[]) => void): () => void {
  const colRef = collection(db, 'users');
  return onSnapshot(
    colRef,
    (snap) => {
      const users: UserProfile[] = [];
      snap.forEach((docSnap) => {
        users.push(docSnap.data() as UserProfile);
      });
      // Sort newest first
      users.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      callback(users);
    },
    (err) => {
      console.warn('Error fetching all users:', err);
      callback([]);
    }
  );
}

export async function toggleUserBlockStatus(uid: string, currentBlocked: boolean): Promise<void> {
  const docRef = doc(db, 'users', uid);
  await updateDoc(docRef, {
    isBlocked: !currentBlocked,
    updatedAt: new Date().toISOString(),
  });
}

export async function logUserLoginIp(uid: string, ip: string): Promise<void> {
  try {
    const docRef = doc(db, 'users', uid);
    await updateDoc(docRef, {
      lastLoginIp: ip,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('Error updating user login IP:', err);
  }
}

export function generateReferralCodeForUser(uid: string): string {
  // Generates clean, unique uppercase referral code like TIK-XXXXX
  const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
  const cleanUid = uid.replace(/[^A-Za-z0-9]/g, '').slice(-3).toUpperCase();
  return `TIK-${cleanUid}${randomPart}`;
}

export async function findUserByReferralCodeOrId(identifier: string): Promise<UserProfile | null> {
  if (!identifier) return null;
  const trimmed = identifier.trim();

  // 1. Try direct UID lookup
  const byId = await getUserProfile(trimmed);
  if (byId) return byId;

  // 2. Try by referralCode
  try {
    const q1 = query(collection(db, 'users'), where('referralCode', '==', trimmed.toUpperCase()));
    const snap1 = await getDocs(q1);
    if (!snap1.empty) {
      return snap1.docs[0].data() as UserProfile;
    }
  } catch {}

  // 3. Try case-insensitive referralCode or lowercase
  try {
    const q2 = query(collection(db, 'users'), where('referralCode', '==', trimmed));
    const snap2 = await getDocs(q2);
    if (!snap2.empty) {
      return snap2.docs[0].data() as UserProfile;
    }
  } catch {}

  return null;
}

export async function incrementUserReferralCount(referrerUid: string): Promise<void> {
  try {
    const referrer = await getUserProfile(referrerUid);
    if (referrer) {
      const currentCount = referrer.referralCount || 0;
      await saveUserProfile({
        ...referrer,
        referralCount: currentCount + 1,
      });
    }
  } catch (err) {
    console.warn('Could not increment user referral count:', err);
  }
}

