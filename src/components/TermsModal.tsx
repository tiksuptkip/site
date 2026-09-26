import React from 'react';
import { X, ShieldAlert } from 'lucide-react';
import { Language } from '../types';
import { translations } from '../i18n/translations';

interface TermsModalProps {
  lang: Language;
  isOpen: boolean;
  onClose: () => void;
}

export const TermsModal: React.FC<TermsModalProps> = ({ lang, isOpen, onClose }) => {
  if (!isOpen) return null;
  const t = translations[lang];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg bg-[#1e2329] border border-[#2b313a] rounded-xl p-6 shadow-2xl relative max-h-[85vh] flex flex-col"
        dir={translations[lang].dir}
      >
        <div className="flex items-center justify-between pb-4 border-b border-[#2b313a]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-yellow-500/10 text-yellow-400 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-gray-100">
              {t.termsModalTitle}
            </h3>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-[#2b313a] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="py-4 space-y-4 text-sm text-gray-300 overflow-y-auto flex-1 leading-relaxed">
          <div className="p-3 bg-[#181a20] rounded-lg border border-[#2b313a]/60">
            <h4 className="font-semibold text-yellow-400 text-xs mb-1 uppercase tracking-wider">
              {lang === 'ar' ? 'إخلاء مسؤولية المخاطر الرقمية' : 'Digital Asset Risk Disclosure'}
            </h4>
            <p>{t.termsParagraph1}</p>
          </div>

          <div className="p-3 bg-[#181a20] rounded-lg border border-[#2b313a]/60">
            <h4 className="font-semibold text-[#0ECB81] text-xs mb-1 uppercase tracking-wider">
              {lang === 'ar' ? 'أصالة الحسابات والتحقق الأمني' : 'Authentic Accounts & Security Audits'}
            </h4>
            <p>{t.termsParagraph2}</p>
          </div>

          <div className="p-3 bg-[#181a20] rounded-lg border border-[#2b313a]/60">
            <h4 className="font-semibold text-blue-400 text-xs mb-1 uppercase tracking-wider">
              {lang === 'ar' ? 'أمان المحفظة وقواعد الإدارة' : 'Wallet Security & Administrative Controls'}
            </h4>
            <p>{t.termsParagraph3}</p>
          </div>
        </div>

        <div className="pt-4 border-t border-[#2b313a] flex justify-end">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 bg-[#F0B90B] hover:bg-[#e0ac09] text-black font-semibold rounded-lg text-sm transition-all shadow-md active:scale-95"
          >
            {t.closeTerms}
          </button>
        </div>
      </div>
    </div>
  );
};
