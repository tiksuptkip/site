import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  ArrowUpRight, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  ShieldCheck, 
  FileText,
  Wallet
} from 'lucide-react';
import { UserProfile, SiteSettings, Language, WithdrawalRecord } from '../types';
import { translations } from '../i18n/translations';
import { createWithdrawal, subscribeUserWithdrawals } from '../services/depositWithdrawService';
import { Header } from '../components/Header';

interface WithdrawPageProps {
  user: UserProfile;
  siteSettings: SiteSettings;
  lang: Language;
  onLanguageChange: (lang: Language) => void;
  onSignOut: () => void;
  onNavigateHome: () => void;
  onNavigateDeposit: () => void;
  onNavigateTelegram: () => void;
}

export const WithdrawPage: React.FC<WithdrawPageProps> = ({
  user,
  siteSettings,
  lang,
  onLanguageChange,
  onSignOut,
  onNavigateHome,
  onNavigateDeposit,
  onNavigateTelegram,
}) => {
  const t = translations[lang];

  const [selectedCoin, setSelectedCoin] = useState<'USDT' | 'BTC' | 'ETH'>('USDT');
  const [network, setNetwork] = useState<string>('TRC20');
  const [amount, setAmount] = useState<string>('');
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [userWithdrawals, setUserWithdrawals] = useState<WithdrawalRecord[]>([]);

  // Fee calculation (1.00 USDT network fee)
  const fee = 1.00;
  const numAmount = parseFloat(amount) || 0;
  const receiveAmount = Math.max(0, numAmount - fee);

  // Subscribe to user withdrawals
  useEffect(() => {
    if (!user.uid) return;
    const unsub = subscribeUserWithdrawals(user.uid, (withdrawals) => {
      setUserWithdrawals(withdrawals);
    });
    return () => unsub();
  }, [user.uid]);

  const handleMax = () => {
    if (user.walletBalance > 0) {
      setAmount(user.walletBalance.toString());
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!walletAddress.trim()) {
      setErrorMsg(lang === 'ar' ? 'يرجى إدخال عنوان محفظة الاستلام' : 'Please enter destination wallet address');
      return;
    }

    if (numAmount <= fee) {
      setErrorMsg(
        lang === 'ar' 
          ? `يجب أن يكون المبلغ أكبر من رسوم التحويل (${fee.toFixed(2)} USDT)`
          : `Amount must be greater than network fee (${fee.toFixed(2)} USDT)`
      );
      return;
    }

    if (numAmount > user.walletBalance) {
      setErrorMsg(
        lang === 'ar' 
          ? `الرصيد المتاح غير كافٍ (${user.walletBalance.toFixed(2)} USDT)`
          : `Insufficient balance (Available: ${user.walletBalance.toFixed(2)} USDT)`
      );
      return;
    }

    setLoading(true);

    try {
      await createWithdrawal({
        userId: user.uid,
        userEmail: user.email,
        coin: selectedCoin,
        network,
        amount: numAmount,
        walletAddress: walletAddress.trim(),
      });

      setSuccessMsg(
        lang === 'ar'
          ? 'تم تقديم طلب السحب بنجاح وحجز الرصيد. سيتم تحويل المبلغ لعنوانك فور اعتماد الإدارة.'
          : 'Withdrawal request submitted! Funds reserved and will be dispatched once confirmed by administration.'
      );
      setAmount('');
      setWalletAddress('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Error creating withdrawal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen bg-[#0b0e11] text-gray-200 flex flex-col font-sans"
      dir={translations[lang].dir}
    >
      <Header
        siteSettings={siteSettings}
        user={user}
        lang={lang}
        onLanguageChange={onLanguageChange}
        onOpenDeposit={onNavigateDeposit}
        onOpenWithdraw={() => {}}
        onSignOut={onSignOut}
        onNavigateHome={onNavigateHome}
        onNavigateLogin={() => {}}
      />

      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <button
            onClick={onNavigateHome}
            className="flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-white bg-[#181a20] border border-[#2b313a] px-3.5 py-2 rounded-xl transition-all"
          >
            <ArrowLeft className={`w-4 h-4 ${lang === 'ar' ? 'rotate-180' : ''}`} />
            <span>{lang === 'ar' ? 'العودة للتداول' : 'Back to Trading'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onNavigateDeposit}
              className="text-xs font-bold text-black bg-[#0ECB81] hover:bg-[#0bb372] px-3.5 py-1.5 rounded-xl transition-all"
            >
              {t.deposit}
            </button>
            <button
              onClick={onNavigateTelegram}
              className="text-xs font-bold text-yellow-400 hover:text-yellow-300 bg-yellow-500/10 border border-yellow-500/30 px-3 py-1.5 rounded-xl transition-colors"
            >
              VIP Signals
            </button>
          </div>
        </div>

        {/* Page Title & Balance Header */}
        <div className="bg-gradient-to-r from-[#181a20] via-[#1a1f26] to-[#181a20] border border-[#2b313a] rounded-3xl p-6 shadow-xl relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-yellow-500/10 text-yellow-400 border border-yellow-500/30 flex items-center justify-center shadow-inner">
              <ArrowUpRight className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {lang === 'ar' ? 'سحب الرصيد' : 'Withdraw Cryptocurrency'}
              </h1>
              <p className="text-xs text-gray-400 mt-0.5">
                {lang === 'ar' 
                  ? 'سحب الأموال مباشرة إلى محفظتك الخارجية عبر شبكات البلوكشين الآمنة'
                  : 'Withdraw directly to your external blockchain wallet address with lightning speed'}
              </p>
            </div>
          </div>

          <div className="bg-[#121418] border border-[#2b313a] px-4 py-3 rounded-2xl self-start sm:self-auto">
            <span className="text-[11px] text-gray-400 block font-medium">
              {t.availableUSDT}
            </span>
            <span className="font-mono text-lg font-black text-yellow-400">
              {user.walletBalance.toFixed(2)} <span className="text-xs text-white">USDT</span>
            </span>
          </div>
        </div>

        {/* Withdraw Form Box */}
        <div className="bg-[#181a20] border border-[#2b313a] rounded-2xl p-6 shadow-xl space-y-5">
          {errorMsg && (
            <div className="p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-2.5 text-xs text-red-400 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-4 bg-[#0ECB81]/10 border border-[#0ECB81]/30 rounded-2xl flex items-start gap-3 text-xs text-[#0ECB81] font-medium leading-relaxed">
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* Coin Selector */}
            <div>
              <label className="block text-xs font-bold text-gray-300 mb-2">
                1. {lang === 'ar' ? 'العملة المسحوبة' : 'Withdraw Coin'}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['USDT', 'BTC', 'ETH'] as const).map((coin) => (
                  <button
                    key={coin}
                    type="button"
                    onClick={() => {
                      setSelectedCoin(coin);
                      if (coin === 'USDT') setNetwork('TRC20');
                      else if (coin === 'BTC') setNetwork('BTC');
                      else setNetwork('ERC20');
                    }}
                    className={`py-2.5 px-3 rounded-xl font-black text-xs border transition-all ${
                      selectedCoin === coin
                        ? 'bg-[#F0B90B] text-black border-[#F0B90B] shadow-md'
                        : 'bg-[#121418] text-gray-400 border-[#2b313a] hover:text-white'
                    }`}
                  >
                    {coin}
                  </button>
                ))}
              </div>
            </div>

            {/* Network Selector */}
            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1.5">
                2. {lang === 'ar' ? 'شبكة التحويل' : 'Transfer Network'}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {selectedCoin === 'USDT' ? (
                  <>
                    {(['TRC20', 'BEP20', 'ERC20'] as const).map((net) => (
                      <button
                        key={net}
                        type="button"
                        onClick={() => setNetwork(net)}
                        className={`py-2 px-3 rounded-xl font-bold border transition-all ${
                          network === net
                            ? 'border-[#F0B90B] bg-[#F0B90B]/10 text-yellow-400'
                            : 'border-[#2e3440] bg-[#121418] text-gray-400 hover:text-white'
                        }`}
                      >
                        USDT-{net}
                      </button>
                    ))}
                  </>
                ) : (
                  <button
                    type="button"
                    className="col-span-3 py-2 px-3 rounded-xl font-bold border border-yellow-400/30 bg-[#F0B90B]/10 text-yellow-400"
                  >
                    {selectedCoin === 'BTC' ? 'Bitcoin Mainnet (BTC)' : 'Ethereum ERC20'}
                  </button>
                )}
              </div>
            </div>

            {/* Destination Wallet Address */}
            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1.5">
                3. {lang === 'ar' ? 'عنوان المحفظة المستلمة' : 'Destination Wallet Address'}
              </label>
              <input
                type="text"
                required
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
                placeholder={network === 'TRC20' ? 'TX...' : '0x...'}
                className="w-full px-3.5 py-3 bg-[#121418] border border-[#2b313a] rounded-xl text-white font-mono text-xs focus:outline-none focus:border-[#F0B90B]"
              />
            </div>

            {/* Amount with MAX button */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-gray-300">
                  4. {lang === 'ar' ? 'مبلغ السحب' : 'Withdrawal Amount'} ({selectedCoin})
                </label>
                <button
                  type="button"
                  onClick={handleMax}
                  className="text-xs font-bold text-yellow-400 hover:underline"
                >
                  MAX ({user.walletBalance.toFixed(2)})
                </button>
              </div>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  min="1"
                  max={user.walletBalance}
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3.5 py-3 bg-[#121418] border border-[#2b313a] rounded-xl text-white font-mono text-sm focus:outline-none focus:border-[#F0B90B]"
                />
                <span className="absolute inset-y-0 end-0 pe-4 flex items-center text-xs font-bold text-yellow-400">
                  {selectedCoin}
                </span>
              </div>
            </div>

            {/* Fee & Receive Breakdown */}
            <div className="p-3.5 bg-[#121418] border border-[#282e38] rounded-xl space-y-2 text-xs text-gray-400">
              <div className="flex justify-between">
                <span>{t.networkFee}</span>
                <span className="font-mono text-gray-300">1.00 USDT</span>
              </div>
              <div className="flex justify-between text-white font-bold pt-1.5 border-t border-[#262c36]">
                <span>{t.youWillReceive}</span>
                <span className="font-mono text-sm text-yellow-400">
                  {receiveAmount.toFixed(2)} {selectedCoin}
                </span>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || user.walletBalance <= fee || numAmount <= fee}
              className="w-full py-3.5 bg-[#F0B90B] hover:bg-[#dfaa07] disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed text-black font-black text-sm rounded-xl transition-all shadow-lg active:scale-98 flex items-center justify-center gap-2 mt-4"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <ShieldCheck className="w-5 h-5" />
                  <span>{lang === 'ar' ? 'تأكيد وإرسال طلب السحب' : 'Confirm & Submit Withdrawal'}</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Withdrawal History Table */}
        <div className="bg-[#181a20] border border-[#2b313a] rounded-2xl p-5 shadow-xl">
          <div className="flex items-center gap-2 pb-3 mb-3 border-b border-[#2b313a]">
            <FileText className="w-4 h-4 text-yellow-400" />
            <h3 className="text-sm font-black text-white">
              {lang === 'ar' ? 'سجل طلبات السحب الخاصة بي' : 'My Recent Withdrawal History'}
            </h3>
          </div>

          {userWithdrawals.length === 0 ? (
            <div className="py-8 text-center text-xs text-gray-500">
              {lang === 'ar' ? 'لا توجد طلبات سحب مسجلة حتى الآن.' : 'No withdrawals recorded yet.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-start">
                <thead>
                  <tr className="border-b border-[#262c35] text-gray-400 font-bold">
                    <th className="py-2.5 px-3">{lang === 'ar' ? 'العملة والشبكة' : 'Coin & Network'}</th>
                    <th className="py-2.5 px-3">{lang === 'ar' ? 'المبلغ' : 'Amount'}</th>
                    <th className="py-2.5 px-3">{lang === 'ar' ? 'عنوان المحفظة' : 'Destination Address'}</th>
                    <th className="py-2.5 px-3">{lang === 'ar' ? 'التاريخ' : 'Date'}</th>
                    <th className="py-2.5 px-3 text-end">{lang === 'ar' ? 'الحالة' : 'Status'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#222832]">
                  {userWithdrawals.map((w) => (
                    <tr key={w.id} className="hover:bg-[#1f242c]/50">
                      <td className="py-2.5 px-3 font-bold text-white">
                        {w.coin} <span className="text-[10px] text-gray-400">({w.network || 'TRC20'})</span>
                      </td>
                      <td className="py-2.5 px-3 font-mono font-black text-red-400">
                        -{w.amount.toFixed(2)} {w.coin}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-gray-400 truncate max-w-[140px]" title={w.walletAddress}>
                        {w.walletAddress}
                      </td>
                      <td className="py-2.5 px-3 text-gray-400">
                        {new Date(w.createdAt).toLocaleString(lang === 'ar' ? 'ar-SA' : 'en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-2.5 px-3 text-end">
                        {w.status === 'approved' && (
                          <span className="px-2.5 py-1 rounded-lg bg-[#0ECB81]/15 text-[#0ECB81] font-bold text-[10px] border border-[#0ECB81]/30">
                            {lang === 'ar' ? 'تم التنفيذ' : 'Completed'}
                          </span>
                        )}
                        {w.status === 'pending' && (
                          <span className="px-2.5 py-1 rounded-lg bg-yellow-500/15 text-yellow-400 font-bold text-[10px] border border-yellow-500/30 flex items-center gap-1 inline-flex">
                            <Clock className="w-3 h-3 animate-spin" />
                            {lang === 'ar' ? 'قيد المراجعة' : 'Pending'}
                          </span>
                        )}
                        {w.status === 'rejected' && (
                          <span className="px-2.5 py-1 rounded-lg bg-red-500/15 text-red-400 font-bold text-[10px] border border-red-500/30">
                            {lang === 'ar' ? 'مرفوض ومُسترجع' : 'Rejected & Refunded'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
