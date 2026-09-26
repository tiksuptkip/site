import React, { useState } from 'react';
import { X, KeyRound, CheckCircle2, AlertCircle, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { Language } from '../types';
import { translations } from '../i18n/translations';
import { generateAndSaveOtp, verifyOtpCode } from '../services/userService';
import { fetchUserIp } from '../services/ipService';

interface ForgotPasswordModalProps {
  lang: Language;
  isOpen: boolean;
  onClose: () => void;
  onPasswordResetSuccess: () => void;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  lang,
  isOpen,
  onClose,
  onPasswordResetSuccess,
}) => {
  if (!isOpen) return null;
  const t = translations[lang];

  const [step, setStep] = useState<'EMAIL' | 'OTP_AND_NEW_PWD'>('EMAIL');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      setErrorMsg(t.fillAllFields);
      return;
    }
    setLoading(true);
    setErrorMsg('');

    try {
      const ip = await fetchUserIp();
      const code = await generateAndSaveOtp(email.trim(), 'PASSWORD_RESET', ip);
      setGeneratedOtp(code);
      setStep('OTP_AND_NEW_PWD');
    } catch (err: any) {
      setErrorMsg(err.message || 'Error sending reset code');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      setErrorMsg(t.enter6DigitCode);
      return;
    }
    if (newPassword.length < 8) {
      setErrorMsg(t.pwdReqLength);
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg(t.passwordsMismatch);
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const verification = await verifyOtpCode(email.trim(), otp.trim(), 'PASSWORD_RESET');
      if (!verification.valid) {
        setErrorMsg(verification.message || t.invalidOtp);
        setLoading(false);
        return;
      }

      setSuccessMsg(t.resetSuccess);
      setTimeout(() => {
        onPasswordResetSuccess();
        onClose();
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error resetting password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md bg-[#1e2329] border border-[#2b313a] rounded-2xl p-6 shadow-2xl relative"
        dir={translations[lang].dir}
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 rounded-lg hover:bg-[#2b313a] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="w-12 h-12 mx-auto mb-3 bg-yellow-500/10 text-yellow-400 rounded-xl flex items-center justify-center">
            <KeyRound className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-gray-100">
            {t.resetPasswordTitle}
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            {t.resetPasswordDesc}
          </p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2 text-xs text-red-400">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 bg-[#0ECB81]/10 border border-[#0ECB81]/30 rounded-lg flex items-center gap-2 text-xs text-[#0ECB81]">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {step === 'EMAIL' ? (
          <form onSubmit={handleSendCode} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                {t.emailAddress}
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full px-3.5 py-2.5 bg-[#181a20] border border-[#333a46] rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#F0B90B] focus:ring-1 focus:ring-[#F0B90B]"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !email}
              className="w-full py-2.5 bg-[#F0B90B] hover:bg-[#dfaa07] disabled:bg-gray-700 text-black font-bold rounded-xl text-sm transition-all shadow-md active:scale-98 flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                t.sendResetCode
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-4">
            {/* Simulation banner */}
            <div className="p-3 bg-[#181a20] rounded-xl border border-yellow-500/30 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-yellow-400" />
                <span className="text-gray-300 font-mono">
                  {t.otpSimulationNotice}: <strong className="text-yellow-400">{generatedOtp}</strong>
                </span>
              </div>
              <button
                type="button"
                onClick={() => setOtp(generatedOtp)}
                className="text-[11px] bg-[#2b313a] hover:bg-[#38404c] text-white px-2 py-1 rounded"
              >
                {lang === 'ar' ? 'تعبئة' : 'Fill'}
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                {t.enter6DigitCode}
              </label>
              <input
                type="text"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                className="w-full px-3.5 py-2.5 bg-[#181a20] border border-[#333a46] rounded-xl text-center font-mono text-lg font-bold text-yellow-400 tracking-widest focus:outline-none focus:border-[#F0B90B]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                {t.newPassword}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#181a20] border border-[#333a46] rounded-xl text-sm text-white focus:outline-none focus:border-[#F0B90B]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 end-0 pe-3 flex items-center text-gray-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                {t.confirmNewPassword}
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#181a20] border border-[#333a46] rounded-xl text-sm text-white focus:outline-none focus:border-[#F0B90B]"
              />
            </div>

            <button
              type="submit"
              disabled={loading || otp.length !== 6 || !newPassword}
              className="w-full py-2.5 bg-[#F0B90B] hover:bg-[#dfaa07] disabled:bg-gray-700 text-black font-bold rounded-xl text-sm transition-all shadow-md active:scale-98 flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                lang === 'ar' ? 'تأكيد كلمة المرور الجديدة' : 'Set New Password'
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
