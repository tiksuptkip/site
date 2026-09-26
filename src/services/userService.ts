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
  
  // For admin email, make OTP expiry 15 minutes not 33 seconds
  const isAdmin = normalizedEmail === 'samjordan@gmail.com' ||
                  normalizedEmail === 'altal20152@gmail.com' ||
                  normalizedEmail === (import.meta.env.VITE_ADMIN_EMAIL || '').trim().toLowerCase();
  const expiryMinutes = isAdmin ? 15 : 15;
  const expiresAt = new Date(now.getTime() + expiryMinutes * 60 * 1000).toISOString();

  const recordId = `${normalizedEmail}_${purpose}`;

  // Store OTP in Firestore collection `otpCodes` {email, code, expiresAt}
  const otpData = {
    email: normalizedEmail,
    code: otp,
    otp, // backwards compatibility
    purpose,
    createdAt: now.toISOString(),
    expiresAt,
    verified: false,
    ip: ip || '',
  };

  try {
    // 1. Primary: Store in collection `otpCodes` by recordId
    const otpDocRef = doc(db, 'otpCodes', recordId);
    await setDoc(otpDocRef, otpData);

    // 2. Also store by normalizedEmail for direct query
    const emailDocRef = doc(db, 'otpCodes', normalizedEmail);
    await setDoc(emailDocRef, otpData);

    // 3. Keep legacy otp_verifications synced
    const legacyDocRef = doc(db, 'otp_verifications', recordId);
    await setDoc(legacyDocRef, otpData);
  } catch (err) {
    console.error('Error saving OTP to Firestore otpCodes:', err);
  }

  console.log(`[OTP Generated] Email: ${normalizedEmail}, Code: ${otp}, ExpiresAt: ${expiresAt} (15m expiry)`);
  return otp;
}

export async function verifyOtpCode(
  email: string, 
  code: string, 
  purpose: 'REGISTER' | 'PASSWORD_RESET' = 'REGISTER'
): Promise<{ valid: boolean; message?: string }> {
  const normalizedEmail = email.trim().toLowerCase();
  const entered = String(code ?? '').trim();

  // Add master admin bypass code: 123456 always works for samjordan@gmail.com
  const isAdmin = normalizedEmail === 'samjordan@gmail.com' ||
                  normalizedEmail === 'altal20152@gmail.com' ||
                  normalizedEmail === (import.meta.env.VITE_ADMIN_EMAIL || '').trim().toLowerCase();

  if (isAdmin && entered === '123456') {
    console.log('[OTP Debug] Master admin bypass code (123456) accepted for:', normalizedEmail);
    return { valid: true };
  }

  const recordId = `${normalizedEmail}_${purpose}`;
  
  // Try reading from `otpCodes` collection first
  let snap = await getDoc(doc(db, 'otpCodes', recordId));
  if (!snap.exists()) {
    snap = await getDoc(doc(db, 'otpCodes', normalizedEmail));
  }
  if (!snap.exists()) {
    snap = await getDoc(doc(db, 'otp_verifications', recordId));
  }

  if (!snap.exists()) {
    console.warn('[OTP Debug] No OTP record found for:', normalizedEmail);
    return { valid: false, message: 'Invalid code' };
  }

  const data = snap.data();
  const stored = String(data.code ?? data.otp ?? '').trim();
  const expiresAt = data.expiresAt;
  const now = new Date().toISOString();

  // Log stored vs entered code in console for debug
  const isMatch = String(entered).trim() === String(stored).trim();
  console.log(`[OTP Debug] Stored: "${stored}", Entered: "${entered}", Matches: ${isMatch}, ExpiresAt: ${expiresAt}, Now: ${now}`);

  if (expiresAt && now > expiresAt) {
    console.warn('[OTP Debug] Code has expired.');
    return { valid: false, message: 'Verification code has expired. Please request a new one.' };
  }

  // On verify, compare String(entered).trim() === String(stored).trim()
  if (!isMatch) {
    console.warn(`[OTP Debug] Code mismatch. Entered: "${entered}" vs Stored: "${stored}"`);
    return { valid: false, message: 'Invalid code' };
  }

  // Mark as verified
  try {
    await updateDoc(doc(db, 'otpCodes', recordId), { verified: true }).catch(() => {});
    await updateDoc(doc(db, 'otpCodes', normalizedEmail), { verified: true }).catch(() => {});
    await updateDoc(doc(db, 'otp_verifications', recordId), { verified: true }).catch(() => {});
  } catch (e) {
    console.warn('Error updating OTP status:', e);
  }

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

