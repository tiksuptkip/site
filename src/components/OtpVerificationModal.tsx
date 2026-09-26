import React, { useState, useEffect, useRef } from 'react';
import { Mail, Clock, RefreshCw, AlertCircle, CheckCircle2, ShieldCheck, X } from 'lucide-react';
import { Language } from '../types';
import { translations } from '../i18n/translations';

interface OtpVerificationModalProps {
  lang: Language;
  isOpen: boolean;
  email: string;
  activeOtpCode: string;
  onVerify: (otp: string) => Promise<boolean>;
  onResend: () => Promise<string>;
  onClose: () => void;
}

export const OtpVerificationModal: React.FC<OtpVerificationModalProps> = ({
  lang,
  isOpen,
  email,
  activeOtpCode,
  onVerify,
  onResend,
  onClose,
}) => {
  if (!isOpen) return null;
  const t = translations[lang];

  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [countdown, setCountdown] = useState<number>(60);
  const [canResend, setCanResend] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [displayOtp, setDisplayOtp] = useState<string>(activeOtpCode);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    setDisplayOtp(activeOtpCode);
  }, [activeOtpCode]);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else {
      setCanResend(true);
    }
    return () => clearInterval(timer);
  }, [countdown]);

  useEffect(() => {
    // Focus first input on open
    setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 150);
  }, []);

  const handleDigitChange = (index: number, value: string) => {
    const val = value.replace(/\D/g, ''); // Numbers only
    if (!val) {
      const nextDigits = [...digits];
      nextDigits[index] = '';
      setDigits(nextDigits);
      return;
    }

    if (val.length === 6) {
      // User pasted full 6 digit code
      const pastedDigits = val.split('').slice(0, 6);
      setDigits(pastedDigits);
      inputRefs.current[5]?.focus();
      return;
    }

    const singleDigit = val.slice(-1);
    const nextDigits = [...digits];
    nextDigits[index] = singleDigit;
    setDigits(nextDigits);

    // Auto-advance
    if (index < 5 && singleDigit) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const fullCode = digits.join('');
    if (fullCode.length !== 6) {
      setErrorMsg(t.enter6DigitCode);
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const success = await onVerify(fullCode);
      if (!success) {
        setErrorMsg(t.invalidOtp);
      }
    } catch (err: any) {
      setErrorMsg(err.message || t.invalidOtp);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!canResend || loading) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const newCode = await onResend();
      setDisplayOtp(newCode);
      setCountdown(60);
      setCanResend(false);
      setDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error resending code');
    } finally {
      setLoading(false);
    }
  };

  const fillQuickCode = () => {
    if (displayOtp && displayOtp.length === 6) {
      setDigits(displayOtp.split(''));
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
          <div className="w-14 h-14 mx-auto mb-3 bg-[#F0B90B]/10 rounded-2xl border border-[#F0B90B]/30 flex items-center justify-center text-[#F0B90B] shadow-inner">
            <Mail className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-gray-100 mb-1">
            {t.otpVerification}
          </h2>
          <p className="text-xs text-gray-400">
            {t.otpSentTo}{' '}
            <span className="text-yellow-400 font-semibold">{email}</span>
          </p>
        </div>

        {/* Real-time Email Simulation Box */}
        <div className="mb-5 p-3.5 bg-[#181a20] rounded-xl border border-yellow-500/30 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-yellow-400 shrink-0" />
            <div className="text-start">
              <span className="text-[11px] text-gray-400 block font-medium">
                {t.otpSimulationNotice}:
              </span>
              <span className="font-mono text-base font-extrabold text-yellow-400 tracking-wider">
                {displayOtp}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={fillQuickCode}
            className="text-xs bg-[#2b313a] hover:bg-[#38404c] text-gray-200 font-medium px-2.5 py-1.5 rounded-lg border border-gray-600 transition-colors"
          >
            {lang === 'ar' ? 'نسخ تلقائي' : 'Auto Fill'}
          </button>
        </div>

        {/* 6 Digits Boxes */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="flex justify-between items-center gap-2" dir="ltr">
            {digits.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => {
                  inputRefs.current[idx] = el;
                }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleDigitChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                className={`w-12 h-14 text-center font-mono text-xl font-bold rounded-xl border ${
                  digit 
                    ? 'border-[#F0B90B] bg-[#262c35] text-yellow-400' 
                    : 'border-[#363d4a] bg-[#181a20] text-white'
                } focus:outline-none focus:border-[#F0B90B] focus:ring-2 focus:ring-[#F0B90B]/30 transition-all`}
              />
            ))}
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2 text-xs text-red-400 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-gray-400">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-gray-500" />
              {t.codeExpiresIn}
            </span>

            {canResend ? (
              <button
                type="button"
                onClick={handleResend}
                disabled={loading}
                className="text-yellow-400 hover:text-yellow-300 font-semibold flex items-center gap-1 transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                {t.resendCode}
              </button>
            ) : (
              <span className="text-gray-500">
                {t.resendIn} <span className="text-gray-300 font-mono">{countdown}s</span>
              </span>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || digits.join('').length !== 6}
            className="w-full py-3 bg-[#F0B90B] hover:bg-[#dfaa07] disabled:bg-gray-700 disabled:cursor-not-allowed text-black font-bold rounded-xl text-sm transition-all shadow-lg active:scale-98 flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                {t.verifyAndComplete}
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
