import React, { useState } from 'react';
import { ShieldCheck, Check } from 'lucide-react';
import { Language } from '../types';
import { translations } from '../i18n/translations';

interface ReCaptchaWidgetProps {
  lang: Language;
  onVerify: (token: string) => void;
  isVerified: boolean;
  error?: string;
}

export const ReCaptchaWidget: React.FC<ReCaptchaWidgetProps> = ({
  lang,
  onVerify,
  isVerified,
  error,
}) => {
  const t = translations[lang];
  const [verifying, setVerifying] = useState(false);

  const handleClick = () => {
    if (isVerified || verifying) return;
    setVerifying(true);

    // Simulate authentic Google reCAPTCHA v2 verification latency and token generation
    setTimeout(() => {
      setVerifying(false);
      const generatedToken = 'recaptcha_v2_' + Math.random().toString(36).substring(2) + Date.now();
      onVerify(generatedToken);
    }, 900);
  };

  return (
    <div className="w-full my-3">
      <div 
        onClick={handleClick}
        className={`w-full max-w-[320px] mx-auto bg-[#22262d] border ${
          error && !isVerified 
            ? 'border-red-500/80 shadow-[0_0_12px_rgba(239,68,68,0.2)]' 
            : isVerified 
            ? 'border-[#0ECB81]/60 bg-[#1c2420]' 
            : 'border-[#333a46] hover:border-[#4f5765]'
        } rounded-md p-3.5 flex items-center justify-between cursor-pointer transition-all shadow-md select-none`}
      >
        <div className="flex items-center gap-3.5">
          <div 
            className={`w-7 h-7 rounded border flex items-center justify-center transition-all ${
              isVerified 
                ? 'bg-[#0ECB81] border-[#0ECB81] text-black shadow-[0_0_8px_rgba(14,203,129,0.5)]' 
                : verifying 
                ? 'border-yellow-400 bg-yellow-400/10' 
                : 'border-gray-500 bg-[#181a20] hover:border-gray-400'
            }`}
          >
            {verifying ? (
              <div className="w-4 h-4 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
            ) : isVerified ? (
              <Check className="w-5 h-5 text-black stroke-[3]" />
            ) : null}
          </div>

          <span className="text-sm font-medium text-gray-200">
            {isVerified ? (
              <span className="text-[#0ECB81] font-semibold">{t.recaptchaLabel}</span>
            ) : verifying ? (
              <span className="text-yellow-400 animate-pulse">{t.recaptchaVerifying}</span>
            ) : (
              t.recaptchaLabel
            )}
          </span>
        </div>

        {/* Google reCAPTCHA Brand Badge */}
        <div className="flex flex-col items-center pl-2">
          <div className="relative">
            <svg className="w-8 h-8 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" />
            </svg>
            <ShieldCheck className="w-3.5 h-3.5 text-blue-400 absolute -top-1 -right-1" />
          </div>
          <span className="text-[9px] font-bold text-gray-400 tracking-wider">reCAPTCHA</span>
          <div className="flex gap-1 text-[8px] text-gray-500">
            <span>Privacy</span>
            <span>•</span>
            <span>Terms</span>
          </div>
        </div>
      </div>

      {error && !isVerified && (
        <p className="text-xs text-red-400 mt-1 text-center font-medium">
          {error}
        </p>
      )}
    </div>
  );
};
