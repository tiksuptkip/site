import React, { useState } from 'react';
import { X, Copy, Check, QrCode, AlertTriangle, ArrowDownToLine } from 'lucide-react';
import { Language } from '../types';
import { translations } from '../i18n/translations';

interface DepositModalProps {
  lang: Language;
  isOpen: boolean;
  onClose: () => void;
  userEmail: string;
}

export const DepositModal: React.FC<DepositModalProps> = ({
  lang,
  isOpen,
  onClose,
  userEmail,
}) => {
  if (!isOpen) return null;
  const t = translations[lang];

  const [network, setNetwork] = useState<'TRC20' | 'ERC20' | 'BEP20'>('TRC20');
  const [copied, setCopied] = useState(false);

  const addresses = {
    TRC20: 'TX9dK7N2bHwM3qL8zF1a9Y4pQvE7Rt5sKj',
    ERC20: '0x71C8A9e4f4B61D1920F8a06C88aA6aE8753EbB12',
    BEP20: '0x8b32A29f95bF738bC25FeA2300bCe9549fF48421',
  };

  const currentAddress = addresses[network];

  const handleCopy = () => {
    navigator.clipboard.writeText(currentAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md bg-[#1e2329] border border-[#2b313a] rounded-2xl p-6 shadow-2xl relative"
        dir={translations[lang].dir}
      >
        <div className="flex items-center justify-between pb-4 border-b border-[#2b313a]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0ECB81]/10 text-[#0ECB81] flex items-center justify-center">
              <ArrowDownToLine className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-100">{t.depositUSDT}</h3>
              <p className="text-[11px] text-gray-400">Tether USD (USDT)</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-[#2b313a] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="py-4 space-y-4 text-xs">
          {/* Network Selection Tabs */}
          <div>
            <label className="block text-gray-400 font-semibold mb-1.5">
              {t.selectNetwork}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['TRC20', 'ERC20', 'BEP20'] as const).map((net) => (
                <button
                  key={net}
                  type="button"
                  onClick={() => setNetwork(net)}
                  className={`py-2 px-3 rounded-xl font-bold border text-center transition-all ${
                    network === net
                      ? 'border-[#F0B90B] bg-[#F0B90B]/10 text-yellow-400 shadow-sm'
                      : 'border-[#2e3440] bg-[#181a20] text-gray-400 hover:text-gray-200'
                  }`}
                >
                  USDT-{net}
                </button>
              ))}
            </div>
          </div>

          {/* QR Code display */}
          <div className="flex flex-col items-center justify-center p-4 bg-[#14171d] rounded-xl border border-[#282e38]">
            <div className="w-36 h-36 bg-white p-2 rounded-xl flex items-center justify-center shadow-lg mb-2">
              {/* Clean vector QR code representation */}
              <svg className="w-full h-full text-black" viewBox="0 0 100 100" fill="currentColor">
                <rect x="0" y="0" width="30" height="30" rx="4" />
                <rect x="5" y="5" width="20" height="20" fill="white" rx="2" />
                <rect x="9" y="9" width="12" height="12" />
                
                <rect x="70" y="0" width="30" height="30" rx="4" />
                <rect x="75" y="5" width="20" height="20" fill="white" rx="2" />
                <rect x="79" y="9" width="12" height="12" />
                
                <rect x="0" y="70" width="30" height="30" rx="4" />
                <rect x="5" y="75" width="20" height="20" fill="white" rx="2" />
                <rect x="9" y="79" width="12" height="12" />
                
                {/* QR Pattern dots */}
                <rect x="36" y="8" width="6" height="6" />
                <rect x="46" y="14" width="8" height="8" />
                <rect x="38" y="26" width="6" height="6" />
                <rect x="58" y="24" width="6" height="6" />
                <rect x="36" y="38" width="10" height="10" />
                <rect x="52" y="42" width="8" height="8" />
                <rect x="68" y="38" width="6" height="6" />
                <rect x="80" y="48" width="8" height="8" />
                <rect x="38" y="60" width="8" height="8" />
                <rect x="52" y="56" width="8" height="8" />
                <rect x="42" y="76" width="6" height="6" />
                <rect x="60" y="72" width="10" height="10" />
                <rect x="76" y="76" width="8" height="8" />
              </svg>
            </div>
            <span className="text-[11px] text-gray-400 font-medium">
              {t.depositQrCode}
            </span>
          </div>

          {/* Deposit Address Box */}
          <div>
            <label className="block text-gray-400 font-semibold mb-1">
              {t.depositAddress} ({network})
            </label>
            <div className="flex items-center gap-2 bg-[#181a20] border border-[#2e3440] rounded-xl p-2.5">
              <span className="font-mono text-xs text-yellow-400 truncate flex-1 select-all" dir="ltr">
                {currentAddress}
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="px-3 py-1.5 bg-[#2b313a] hover:bg-[#39424e] text-white rounded-lg flex items-center gap-1.5 text-xs font-semibold shrink-0 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-[#0ECB81]" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? (lang === 'ar' ? 'تم النسخ' : 'Copied') : t.copyAddress}
              </button>
            </div>
          </div>

          {/* Important Notice */}
          <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl flex items-start gap-2.5 text-yellow-300">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="leading-relaxed">{t.minimumDeposit}</p>
          </div>
        </div>

        <div className="pt-3 border-t border-[#2b313a] flex justify-end">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-[#2b313a] hover:bg-[#373e4a] text-white font-semibold rounded-xl text-xs transition-colors"
          >
            {lang === 'ar' ? 'إغلاق النافذة' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
