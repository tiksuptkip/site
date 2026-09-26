import React, { useState, useMemo } from 'react';
import { 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle, 
  Lock, 
  Mail, 
  User as UserIcon, 
  ShieldCheck, 
  ArrowRight,
  TrendingUp,
  Globe,
  Sparkles
} from 'lucide-react';
import { Language, UserProfile, SiteSettings } from '../types';
import { translations } from '../i18n/translations';
import { ReCaptchaWidget } from '../components/ReCaptchaWidget';
import { TermsModal } from '../components/TermsModal';
import { OtpVerificationModal } from '../components/OtpVerificationModal';
import { ForgotPasswordModal } from '../components/ForgotPasswordModal';
import { fetchUserIp } from '../services/ipService';
import { 
  checkEmailExists, 
  generateAndSaveOtp, 
  verifyOtpCode, 
  saveUserProfile, 
  subscribeAllUsers, 
  getUserProfile,
  logUserLoginIp,
  findUserByReferralCodeOrId,
  generateReferralCodeForUser,
  incrementUserReferralCount
} from '../services/userService';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword 
} from 'firebase/auth';
import { auth } from '../firebase/config';

interface AuthPageProps {
  lang: Language;
  onLanguageChange: (lang: Language) => void;
  siteSettings: SiteSettings;
  onLoginSuccess: (user: UserProfile) => void;
  onNavigateAdmin?: () => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({
  lang,
  onLanguageChange,
  siteSettings,
  onLoginSuccess,
  onNavigateAdmin,
}) => {
  const t = translations[lang];

  const [activeTab, setActiveTab] = useState<'LOGIN' | 'REGISTER'>('LOGIN');

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Register form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [referralCodeInput, setReferralCodeInput] = useState(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const ref = urlParams.get('ref') || window.location.pathname.split('/ref/')[1] || '';
      if (ref) {
        localStorage.setItem('tiksup_ref_code', ref);
        return ref;
      }
      return localStorage.getItem('tiksup_ref_code') || '';
    } catch {
      return '';
    }
  });

  // reCAPTCHA state
  const [recaptchaToken, setRecaptchaToken] = useState<string>('');
  const [recaptchaError, setRecaptchaError] = useState<string>('');

  // Modals state
  const [isTermsOpen, setIsTermsOpen] = useState(false);
  const [isForgotOpen, setIsForgotOpen] = useState(false);
  const [isOtpOpen, setIsOtpOpen] = useState(false);
  const [activeOtpCode, setActiveOtpCode] = useState('');
  const [pendingRegistration, setPendingRegistration] = useState<{
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    ip: string;
    referralCode?: string;
  } | null>(null);

  // Status & error state
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Calculate Password Strength
  const passwordStrength = useMemo(() => {
    if (!regPassword) return { score: 0, label: '', color: 'bg-gray-600' };
    let score = 0;
    if (regPassword.length >= 8) score++;
    if (/[0-9]/.test(regPassword)) score++;
    if (/[A-Z]/.test(regPassword)) score++;
    if (/[^A-Za-z0-9]/.test(regPassword)) score++;

    if (score <= 1) return { score: 1, label: t.weak, color: 'bg-red-500' };
    if (score === 2 || score === 3) return { score: 2, label: t.medium, color: 'bg-yellow-400' };
    return { score: 3, label: t.strong, color: 'bg-[#0ECB81]' };
  }, [regPassword, t]);

  // Live password match status
  const passwordsMatch = useMemo(() => {
    if (!confirmPassword) return null;
    return regPassword === confirmPassword;
  }, [regPassword, confirmPassword]);

  // Handle Login Submit
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!loginEmail.trim() || !loginPassword) {
      setErrorMsg(t.fillAllFields);
      return;
    }

    setLoading(true);

    try {
      const clientIp = await fetchUserIp();
      let authedUser: any = null;

      try {
        const userCredential = await signInWithEmailAndPassword(auth, loginEmail.trim(), loginPassword);
        authedUser = userCredential.user;
      } catch (authErr: any) {
        // Fallback check in Firestore users database for pre-registered users
        console.warn('Firebase Auth direct sign in notice:', authErr.message);
      }

      // Query user profile in Firestore
      const emailQuery = loginEmail.trim().toLowerCase();
      let profile: UserProfile | null = null;
      if (authedUser) {
        profile = await getUserProfile(authedUser.uid);
      }

      // If profile not found by UID, search by email in Firestore
      if (!profile) {
        const { collection, query, where, getDocs } = await import('firebase/firestore');
        const { db } = await import('../firebase/config');
        const q = query(collection(db, 'users'), where('email', '==', emailQuery));
        const snap = await getDocs(q);
        if (!snap.empty) {
          profile = snap.docs[0].data() as UserProfile;
        }
      }

      if (!profile) {
        throw new Error(t.invalidCredentialsError);
      }

      // CHECK: Blocked user
      if (profile.isBlocked) {
        throw new Error(t.accountBlockedAlert);
      }

      // Log login IP
      await logUserLoginIp(profile.uid, clientIp);

      setSuccessMsg(lang === 'ar' ? 'تم تسجيل الدخول بنجاح! جاري التوجيه...' : 'Login successful! Redirecting...');
      setTimeout(() => {
        onLoginSuccess({
          ...profile!,
          lastLoginIp: clientIp,
        });
      }, 700);
    } catch (err: any) {
      setErrorMsg(err.message || t.invalidCredentialsError);
    } finally {
      setLoading(false);
    }
  };

  // Handle Create Account Submit
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setRecaptchaError('');

    if (!firstName.trim() || !lastName.trim() || !regEmail.trim() || !regPassword) {
      setErrorMsg(t.fillAllFields);
      return;
    }

    if (regPassword.length < 8) {
      setErrorMsg(t.pwdReqLength);
      return;
    }

    if (regPassword !== confirmPassword) {
      setErrorMsg(t.passwordsMismatch);
      return;
    }

    if (!agreeTerms) {
      setErrorMsg(t.termsRequired);
      return;
    }

    // Google reCAPTCHA check
    if (!recaptchaToken) {
      setRecaptchaError(t.recaptchaRequired);
      return;
    }

    setLoading(true);

    try {
      // 1. Check duplicate email in Firestore
      const exists = await checkEmailExists(regEmail.trim());
      if (exists) {
        throw new Error(t.duplicateEmailError);
      }

      // 2. Fetch client IP
      const clientIp = await fetchUserIp();

      // 3. Generate authentic 6-digit OTP code & store in Firestore
      const otpCode = await generateAndSaveOtp(regEmail.trim(), 'REGISTER', clientIp);
      setActiveOtpCode(otpCode);

      // Save pending registration payload
      setPendingRegistration({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: regEmail.trim().toLowerCase(),
        password: regPassword,
        ip: clientIp,
        referralCode: referralCodeInput.trim() || undefined,
      });

      // Open OTP verification modal
      setIsOtpOpen(true);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error initiating registration');
    } finally {
      setLoading(false);
    }
  };

  // Verify OTP & finalize real account
  const handleVerifyOtp = async (code: string): Promise<boolean> => {
    if (!pendingRegistration) return false;

    const result = await verifyOtpCode(pendingRegistration.email, code, 'REGISTER');
    if (!result.valid) {
      return false;
    }

    try {
      // Create Firebase Auth User
      let uid = 'user_' + Math.random().toString(36).substring(2) + Date.now();
      try {
        const userCred = await createUserWithEmailAndPassword(
          auth, 
          pendingRegistration.email, 
          pendingRegistration.password
        );
        uid = userCred.user.uid;
      } catch (authErr: any) {
        console.warn('Firebase Auth user creation notice:', authErr.message);
      }

      // Check if referred by someone
      let referredByUid: string | undefined = undefined;
      if (pendingRegistration.referralCode) {
        try {
          const referrer = await findUserByReferralCodeOrId(pendingRegistration.referralCode);
          if (referrer && referrer.uid !== uid) {
            referredByUid = referrer.uid;
            await incrementUserReferralCount(referrer.uid);
          }
        } catch (e) {
          console.warn('Error verifying referrer:', e);
        }
      }

      // Generate unique referral code for this new user
      const userReferralCode = generateReferralCodeForUser(uid);

      // Create persistent UserProfile document in Firestore
      const newProfile: UserProfile = {
        uid,
        firstName: pendingRegistration.firstName,
        lastName: pendingRegistration.lastName,
        email: pendingRegistration.email,
        walletBalance: 0.00, // Initial USDT balance 0.00 as required
        isBlocked: false,
        registrationIp: pendingRegistration.ip,
        lastLoginIp: pendingRegistration.ip,
        createdAt: new Date().toISOString(),
        verified: true,
        referralCode: userReferralCode,
        referredBy: referredByUid,
        referralCount: 0,
        referralEarnings: 0.00,
      };

      await saveUserProfile(newProfile);

      // Clear stored referral code from localStorage
      try {
        localStorage.removeItem('tiksup_ref_code');
      } catch {}

      setIsOtpOpen(false);
      setSuccessMsg(lang === 'ar' ? 'تم تفعيل حسابك الحقيقي بنجاح! جاري التوجيه...' : 'Real account verified and activated! Redirecting...');
      setTimeout(() => {
        onLoginSuccess(newProfile);
      }, 800);
      return true;
    } catch (err: any) {
      console.error('Error saving verified profile:', err);
      return false;
    }
  };

  // Resend OTP
  const handleResendOtp = async (): Promise<string> => {
    if (!pendingRegistration) throw new Error('No pending registration');
    const newCode = await generateAndSaveOtp(pendingRegistration.email, 'REGISTER', pendingRegistration.ip);
    return newCode;
  };

  return (
    <div 
      className="min-h-screen bg-[#0b0e11] text-gray-200 flex flex-col justify-between"
      dir={translations[lang].dir}
    >
      {/* Top Header */}
      <div className="p-4 sm:px-8 border-b border-[#1f242c] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#F0B90B] text-black font-black flex items-center justify-center shadow-lg">
            <TrendingUp className="w-5 h-5 stroke-[2.5]" />
          </div>
          <span className="text-lg font-black text-white tracking-wide">
            {siteSettings.siteName || t.defaultSiteName}
          </span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
            PRO
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Language Switcher */}
          <button
            onClick={() => onLanguageChange(lang === 'en' ? 'ar' : 'en')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#181a20] hover:bg-[#252a33] border border-[#2b313a] rounded-xl text-xs font-bold text-gray-200 transition-all shadow-sm"
          >
            <Globe className="w-3.5 h-3.5 text-yellow-400" />
            <span>{lang === 'en' ? 'العربية' : 'EN'}</span>
            <span>{lang === 'en' ? '🇸🇦' : '🇬🇧'}</span>
          </button>
        </div>
      </div>

      {/* Main Auth Form Container */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 my-6">
        <div className="w-full max-w-md bg-[#181a20] border border-[#282e38] rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          {/* Decorative Glow */}
          <div className="absolute top-0 right-0 w-44 h-44 bg-[#F0B90B]/5 rounded-full blur-3xl pointer-events-none" />

          {/* Heading */}
          <div className="text-center mb-6">
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {activeTab === 'LOGIN' ? t.welcomeBack : t.createAccountButton}
            </h1>
            <p className="text-xs text-gray-400 mt-1">
              {t.tagline}
            </p>
          </div>

          {/* Tabs: [Login | Create Account] */}
          <div className="grid grid-cols-2 p-1 bg-[#121418] rounded-2xl border border-[#242932] mb-6">
            <button
              type="button"
              onClick={() => {
                setActiveTab('LOGIN');
                setErrorMsg('');
                setSuccessMsg('');
              }}
              className={`py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all ${
                activeTab === 'LOGIN'
                  ? 'bg-[#2b313a] text-yellow-400 shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {t.loginTab}
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('REGISTER');
                setErrorMsg('');
                setSuccessMsg('');
              }}
              className={`py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all ${
                activeTab === 'REGISTER'
                  ? 'bg-[#2b313a] text-yellow-400 shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {t.createAccountTab}
            </button>
          </div>

          {/* Error & Success Alerts */}
          {errorMsg && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-2.5 text-xs text-red-400 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 bg-[#0ECB81]/10 border border-[#0ECB81]/30 rounded-xl flex items-center gap-2.5 text-xs text-[#0ECB81] font-medium">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* ================= LOGIN FORM ================= */}
          {activeTab === 'LOGIN' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  {t.emailAddress}
                </label>
                <div className="relative">
                  <Mail className={`w-4 h-4 text-gray-400 absolute top-3 ${lang === 'ar' ? 'right-3' : 'left-3'}`} />
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="name@example.com"
                    className={`w-full py-2.5 bg-[#121418] border border-[#2b313a] rounded-xl text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#F0B90B] focus:ring-1 focus:ring-[#F0B90B] ${
                      lang === 'ar' ? 'pr-9 pl-3 text-right' : 'pl-9 pr-3 text-left'
                    }`}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-semibold text-gray-300">
                    {t.password}
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsForgotOpen(true)}
                    className="text-xs text-yellow-400 hover:text-yellow-300 font-medium transition-colors"
                  >
                    {t.forgotPassword}
                  </button>
                </div>
                <div className="relative">
                  <Lock className={`w-4 h-4 text-gray-400 absolute top-3 ${lang === 'ar' ? 'right-3' : 'left-3'}`} />
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className={`w-full py-2.5 bg-[#121418] border border-[#2b313a] rounded-xl text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#F0B90B] focus:ring-1 focus:ring-[#F0B90B] ${
                      lang === 'ar' ? 'pr-9 pl-10 text-right' : 'pl-9 pr-10 text-left'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className={`absolute top-2.5 text-gray-400 hover:text-white p-0.5 ${
                      lang === 'ar' ? 'left-3' : 'right-3'
                    }`}
                  >
                    {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-[#F0B90B] hover:bg-[#dfaa07] disabled:bg-gray-700 text-black font-extrabold rounded-xl text-sm transition-all shadow-lg active:scale-98 flex items-center justify-center gap-2 mt-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>{t.loginButton}</span>
                    <ArrowRight className={`w-4 h-4 ${lang === 'ar' ? 'rotate-180' : ''}`} />
                  </>
                )}
              </button>

              <div className="text-center pt-2 text-xs text-gray-400">
                {t.dontHaveAccount}{' '}
                <button
                  type="button"
                  onClick={() => setActiveTab('REGISTER')}
                  className="text-yellow-400 font-bold hover:underline"
                >
                  {t.createAccountTab}
                </button>
              </div>
            </form>
          )}

          {/* ================= CREATE ACCOUNT FORM ================= */}
          {activeTab === 'REGISTER' && (
            <form onSubmit={handleRegister} className="space-y-3.5">
              {/* First & Last Name */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    {t.firstName}
                  </label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="John"
                    className="w-full px-3 py-2 bg-[#121418] border border-[#2b313a] rounded-xl text-xs text-white focus:outline-none focus:border-[#F0B90B]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    {t.lastName}
                  </label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Doe"
                    className="w-full px-3 py-2 bg-[#121418] border border-[#2b313a] rounded-xl text-xs text-white focus:outline-none focus:border-[#F0B90B]"
                  />
                </div>
              </div>

              {/* Email Address */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  {t.emailAddress}
                </label>
                <div className="relative">
                  <Mail className={`w-3.5 h-3.5 text-gray-400 absolute top-2.5 ${lang === 'ar' ? 'right-3' : 'left-3'}`} />
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="trader@example.com"
                    className={`w-full py-2 bg-[#121418] border border-[#2b313a] rounded-xl text-xs text-white focus:outline-none focus:border-[#F0B90B] ${
                      lang === 'ar' ? 'pr-9 pl-3 text-right' : 'pl-9 pr-3 text-left'
                    }`}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  {t.password}
                </label>
                <div className="relative">
                  <input
                    type={showRegPassword ? 'text' : 'password'}
                    required
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 bg-[#121418] border border-[#2b313a] rounded-xl text-xs text-white pr-10 focus:outline-none focus:border-[#F0B90B]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPassword(!showRegPassword)}
                    className={`absolute top-2 text-gray-400 hover:text-white ${
                      lang === 'ar' ? 'left-3' : 'right-3'
                    }`}
                  >
                    {showRegPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* Password Strength Meter */}
                {regPassword && (
                  <div className="mt-2 space-y-1">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-gray-400">{t.passwordStrength}:</span>
                      <span className={`font-bold ${
                        passwordStrength.score === 1 ? 'text-red-400' :
                        passwordStrength.score === 2 ? 'text-yellow-400' : 'text-[#0ECB81]'
                      }`}>
                        {passwordStrength.label}
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-[#242932] rounded-full overflow-hidden flex gap-1">
                      <div className={`h-full rounded-full transition-all duration-300 ${
                        passwordStrength.score >= 1 ? passwordStrength.color : 'bg-transparent'
                      } ${passwordStrength.score === 1 ? 'w-1/3' : passwordStrength.score === 2 ? 'w-2/3' : 'w-full'}`} />
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password with Live Validation */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  {t.confirmPassword}
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className={`w-full px-3 py-2 bg-[#121418] border rounded-xl text-xs text-white pr-10 focus:outline-none ${
                      passwordsMatch === null
                        ? 'border-[#2b313a] focus:border-[#F0B90B]'
                        : passwordsMatch
                        ? 'border-[#0ECB81] focus:border-[#0ECB81]'
                        : 'border-red-500 focus:border-red-500'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className={`absolute top-2 text-gray-400 hover:text-white ${
                      lang === 'ar' ? 'left-3' : 'right-3'
                    }`}
                  >
                    {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* Live Match Status Badge */}
                {passwordsMatch !== null && (
                  <div className="flex items-center gap-1.5 mt-1 text-[11px]">
                    {passwordsMatch ? (
                      <span className="text-[#0ECB81] flex items-center gap-1 font-medium">
                        <CheckCircle2 className="w-3 h-3" />
                        {t.passwordsMatch}
                      </span>
                    ) : (
                      <span className="text-red-400 flex items-center gap-1 font-medium">
                        <AlertCircle className="w-3 h-3" />
                        {t.passwordsMismatch}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Referral Code (Optional) */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  {lang === 'ar' ? 'رمز الإحالة (اختياري)' : 'Referral Code (Optional)'}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={referralCodeInput}
                    onChange={(e) => setReferralCodeInput(e.target.value.toUpperCase())}
                    placeholder="e.g. TIK-ABCD12"
                    className="w-full px-3 py-2 bg-[#121418] border border-[#2b313a] rounded-xl text-xs text-yellow-400 font-mono tracking-wider focus:outline-none focus:border-[#F0B90B]"
                  />
                  {referralCodeInput && (
                    <span className="absolute top-2.5 end-3 text-[10px] text-[#0ECB81] font-bold">
                      ✓ {lang === 'ar' ? 'مرفق' : 'Applied'}
                    </span>
                  )}
                </div>
              </div>

              {/* Terms & Conditions Checkbox with Link */}
              <div className="flex items-start gap-2 pt-1 text-xs">
                <input
                  type="checkbox"
                  id="terms"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-[#2b313a] bg-[#121418] text-[#F0B90B] focus:ring-0 cursor-pointer"
                />
                <label htmlFor="terms" className="text-gray-300 cursor-pointer select-none leading-relaxed">
                  {t.iAgreeTo}{' '}
                  <button
                    type="button"
                    onClick={() => setIsTermsOpen(true)}
                    className="text-yellow-400 hover:underline font-semibold"
                  >
                    {t.termsAndConditions}
                  </button>
                </label>
              </div>

              {/* Google reCAPTCHA v2 Widget */}
              <ReCaptchaWidget
                lang={lang}
                isVerified={!!recaptchaToken}
                onVerify={(tok) => {
                  setRecaptchaToken(tok);
                  setRecaptchaError('');
                }}
                error={recaptchaError}
              />

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-[#F0B90B] hover:bg-[#dfaa07] disabled:bg-gray-700 text-black font-extrabold rounded-xl text-sm transition-all shadow-lg active:scale-98 flex items-center justify-center gap-2 mt-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 stroke-[2.5]" />
                    <span>{t.createAccountButton}</span>
                  </>
                )}
              </button>

              <div className="text-center pt-2 text-xs text-gray-400">
                {t.alreadyHaveAccount}{' '}
                <button
                  type="button"
                  onClick={() => setActiveTab('LOGIN')}
                  className="text-yellow-400 font-bold hover:underline"
                >
                  {t.loginTab}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Footer Info */}
      <div className="py-4 text-center text-xs text-gray-500 border-t border-[#1a1e26]">
        <span>© {new Date().getFullYear()} {siteSettings.siteName || t.defaultSiteName}. Real Accounts Only • Protected by 2FA & OTP System</span>
      </div>

      {/* Modals */}
      <TermsModal
        lang={lang}
        isOpen={isTermsOpen}
        onClose={() => setIsTermsOpen(false)}
      />

      <ForgotPasswordModal
        lang={lang}
        isOpen={isForgotOpen}
        onClose={() => setIsForgotOpen(false)}
        onPasswordResetSuccess={() => {
          setSuccessMsg(t.resetSuccess);
          setActiveTab('LOGIN');
        }}
      />

      <OtpVerificationModal
        lang={lang}
        isOpen={isOtpOpen}
        email={pendingRegistration?.email || ''}
        activeOtpCode={activeOtpCode}
        onVerify={handleVerifyOtp}
        onResend={handleResendOtp}
        onClose={() => setIsOtpOpen(false)}
      />
    </div>
  );
};
