import React, { useState } from 'react';
import { X, ArrowUpRight, AlertCircle, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { Language } from '../types';
import { translations } from '../i18n/translations';

interface WithdrawModalProps {
  lang: Language;
  isOpen: boolean;
  onClose: () => void;
  walletBalance: number;
}

export const WithdrawModal: React.FC<WithdrawModalProps> = ({
  lang,
  isOpen,
  onClose,
  walletBalance,
}) => {
  if (!isOpen) return null;
  const t = translations[lang];

  const [address, setAddress] = useState('');
  const [network, setNetwork] = useState<'TRC20' | 'ERC20' | 'BEP20'>('TRC20');
  const [amount, setAmount] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fee = 1.0;
  const numAmount = parseFloat(amount) || 0;
  const receiveAmount = Math.max(0, numAmount - fee);

  const handleMax = () => {
    if (walletBalance > 0) {
      setAmount(walletBalance.toString());
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!address.trim()) {
      setErrorMsg(lang === 'ar' ? 'يرجى إدخال عنوان المحفظة للمستلم' : 'Please enter recipient USDT address');
      return;
    }
    if (numAmount <= fee) {
      setErrorMsg(lang === 'ar' ? 'يجب أن يكون مبلغ السحب أكبر من رسوم الشبكة (1.00 USDT)' : 'Withdrawal amount must be greater than network fee (1.00 USDT)');
      return;
    }
    if (numAmount > walletBalance) {
      setErrorMsg(lang === 'ar' ? 'الرصيد المتاح غير كافٍ لتنفيذ السحب' : 'Insufficient wallet balance for this withdrawal');
      return;
    }

    setErrorMsg('');
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      onClose();
    }, 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md bg-[#1e2329] border border-[#2b313a] rounded-2xl p-6 shadow-2xl relative"
        dir={translations[lang].dir}
      >
        <div className="flex items-center justify-between pb-4 border-b border-[#2b313a]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-yellow-500/10 text-yellow-400 flex items-center justify-center">
              <ArrowUpRight className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-100">{t.withdrawUSDT}</h3>
              <p className="text-[11px] text-gray-400">
                {t.availableUSDT}: <strong className="text-yellow-400 font-mono">{walletBalance.toFixed(2)} USDT</strong>
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-[#2b313a] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {submitted ? (
          <div className="py-8 text-center space-y-3">
            <div className="w-14 h-14 mx-auto rounded-full bg-[#0ECB81]/15 text-[#0ECB81] flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h4 className="text-base font-bold text-gray-100">
              {lang === 'ar' ? 'تم استلام طلب السحب' : 'Withdrawal Request Submitted'}
            </h4>
            <p className="text-xs text-gray-400 max-w-xs mx-auto">
              {t.withdrawNotice}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="py-4 space-y-4 text-xs">
            {walletBalance === 0 && (
              <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl flex items-center gap-2.5 text-yellow-300">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{t.zeroBalanceWarning}</span>
              </div>
            )}

            {errorMsg && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-2.5 text-red-400">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Network Selector */}
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

            {/* Recipient Address */}
            <div>
              <label className="block text-gray-400 font-semibold mb-1">
                {t.recipientAddress}
              </label>
              <input
                type="text"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder={network === 'TRC20' ? 'TX...' : '0x...'}
                className="w-full px-3.5 py-2.5 bg-[#181a20] border border-[#2e3440] rounded-xl text-white font-mono text-xs focus:outline-none focus:border-[#F0B90B]"
              />
            </div>

            {/* Amount input */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-gray-400 font-semibold">
                  {t.withdrawAmount} (USDT)
                </label>
                <button
                  type="button"
                  onClick={handleMax}
                  className="text-yellow-400 font-bold hover:underline"
                >
                  MAX
                </button>
              </div>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  min="0"
                  max={walletBalance}
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3.5 py-2.5 bg-[#181a20] border border-[#2e3440] rounded-xl text-white font-mono text-sm focus:outline-none focus:border-[#F0B90B]"
                />
                <span className="absolute inset-y-0 end-0 pe-3 flex items-center text-xs font-bold text-gray-400">
                  USDT
                </span>
              </div>
            </div>

            {/* Fee summary card */}
            <div className="p-3 bg-[#181a20] border border-[#282e38] rounded-xl space-y-1.5 text-gray-400">
              <div className="flex justify-between">
                <span>{t.networkFee}</span>
                <span className="text-gray-300 font-mono">1.00 USDT</span>
              </div>
              <div className="flex justify-between text-gray-200 font-bold pt-1 border-t border-[#282e38]">
                <span>{t.youWillReceive}</span>
                <span className="text-yellow-400 font-mono text-sm">
                  {receiveAmount.toFixed(2)} USDT
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={walletBalance <= 1 || numAmount <= 1}
              className="w-full py-3 bg-[#F0B90B] hover:bg-[#dfaa07] disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed text-black font-bold rounded-xl text-sm transition-all shadow-md active:scale-98"
            >
              {t.submitWithdrawal}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
