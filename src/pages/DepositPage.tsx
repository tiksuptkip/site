import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  ArrowDownToLine, 
  Copy, 
  Check, 
  Upload, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Image as ImageIcon,
  ShieldCheck,
  TrendingUp,
  FileText
} from 'lucide-react';
import { UserProfile, SiteSettings, Language, DepositRecord } from '../types';
import { translations } from '../i18n/translations';
import { createDeposit, subscribeUserDeposits } from '../services/depositWithdrawService';
import { Header } from '../components/Header';

interface DepositPageProps {
  user: UserProfile;
  siteSettings: SiteSettings;
  lang: Language;
  onLanguageChange: (lang: Language) => void;
  onSignOut: () => void;
  onNavigateHome: () => void;
  onNavigateWithdraw: () => void;
  onNavigateTelegram: () => void;
}

export const DepositPage: React.FC<DepositPageProps> = ({
  user,
  siteSettings,
  lang,
  onLanguageChange,
  onSignOut,
  onNavigateHome,
  onNavigateWithdraw,
  onNavigateTelegram,
}) => {
  const t = translations[lang];

  const [selectedCoin, setSelectedCoin] = useState<'USDT' | 'BTC' | 'ETH'>('USDT');
  const [selectedNetwork, setSelectedNetwork] = useState<string>('TRC20');
  const [amount, setAmount] = useState<string>('');
  const [txId, setTxId] = useState<string>('');
  const [screenshotBase64, setScreenshotBase64] = useState<string>('');
  const [screenshotPreview, setScreenshotPreview] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [userDeposits, setUserDeposits] = useState<DepositRecord[]>([]);

  // Update networks when coin changes
  useEffect(() => {
    if (selectedCoin === 'USDT') setSelectedNetwork('TRC20');
    else if (selectedCoin === 'BTC') setSelectedNetwork('BTC');
    else if (selectedCoin === 'ETH') setSelectedNetwork('ERC20');
  }, [selectedCoin]);

  // Subscribe to this user's deposits
  useEffect(() => {
    if (!user.uid) return;
    const unsub = subscribeUserDeposits(user.uid, (deposits) => {
      setUserDeposits(deposits);
    });
    return () => unsub();
  }, [user.uid]);

  // Determine current deposit address based on siteSettings
  const getDepositAddress = (): string => {
    const wallets = siteSettings.adminWallets;
    if (selectedCoin === 'USDT') {
      if (selectedNetwork === 'BEP20') {
        return wallets?.usdt_bep20 || '0x8b32A29f95bF738bC25FeA2300bCe9549fF48421';
      }
      return wallets?.usdt_trc20 || 'TX9dK7N2bHwM3qL8zF1a9Y4pQvE7Rt5sKj';
    }
    if (selectedCoin === 'BTC') {
      return wallets?.btc || 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh';
    }
    if (selectedCoin === 'ETH') {
      return wallets?.eth || '0x71C8A9e4f4B61D1920F8a06C88aA6aE8753EbB12';
    }
    return wallets?.usdt_trc20 || 'TX9dK7N2bHwM3qL8zF1a9Y4pQvE7Rt5sKj';
  };

  const currentAddress = getDepositAddress();

  const handleCopy = () => {
    navigator.clipboard.writeText(currentAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Image Upload handler (scales down if necessary and converts to Base64)
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg(lang === 'ar' ? 'يرجى رفع ملف صورة صالح (PNG, JPG, WEBP)' : 'Please upload a valid image file (PNG, JPG, WEBP)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        // Resize image to max 1000px dimension to ensure snappy upload & avoid Firestore document size limits
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 900;

        if (width > height && width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else if (height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.82);
          setScreenshotBase64(compressed);
          setScreenshotPreview(compressed);
          setErrorMsg('');
        }
      };
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      setErrorMsg(lang === 'ar' ? 'يرجى إدخال مبلغ إيداع صحيح' : 'Please enter a valid deposit amount');
      return;
    }

    if (!txId.trim()) {
      setErrorMsg(lang === 'ar' ? 'يرجى إدخال رقم العملية (TxID / Hash)' : 'Please enter the transaction ID (TxID / Hash)');
      return;
    }

    setLoading(true);

    try {
      await createDeposit({
        userId: user.uid,
        userEmail: user.email,
        coin: selectedCoin,
        network: selectedNetwork,
        amount: numAmount,
        txId: txId.trim(),
        screenshotUrl: screenshotBase64 || '',
      });

      setSuccessMsg(
        lang === 'ar' 
          ? 'تم تقديم طلب الإيداع بنجاح! سيتم مراجعته وإضافة الرصيد لمحفظتك فور التأكيد.'
          : 'Deposit submitted successfully! It will be reviewed and credited to your wallet upon verification.'
      );
      setAmount('');
      setTxId('');
      setScreenshotBase64('');
      setScreenshotPreview('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Error creating deposit');
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
        onOpenDeposit={() => {}}
        onOpenWithdraw={onNavigateWithdraw}
        onSignOut={onSignOut}
        onNavigateHome={onNavigateHome}
        onNavigateLogin={() => {}}
      />

      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
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
              onClick={onNavigateWithdraw}
              className="text-xs font-bold text-gray-300 hover:text-yellow-400 bg-[#1e2329] border border-[#2b313a] px-3 py-1.5 rounded-xl transition-colors"
            >
              {t.withdraw}
            </button>
            <button
              onClick={onNavigateTelegram}
              className="text-xs font-bold text-yellow-400 hover:text-yellow-300 bg-yellow-500/10 border border-yellow-500/30 px-3 py-1.5 rounded-xl transition-colors"
            >
              VIP Signals
            </button>
          </div>
        </div>

        {/* Page Title */}
        <div className="bg-gradient-to-r from-[#181a20] via-[#1a1f26] to-[#181a20] border border-[#2b313a] rounded-3xl p-6 shadow-xl relative overflow-hidden">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#0ECB81]/15 text-[#0ECB81] border border-[#0ECB81]/30 flex items-center justify-center shadow-inner">
              <ArrowDownToLine className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {lang === 'ar' ? 'إيداع العملات الرقمية' : 'Deposit Cryptocurrency'}
              </h1>
              <p className="text-xs text-gray-400 mt-0.5">
                {lang === 'ar' 
                  ? 'قم بتحويل الأصول إلى عنوان المحفظة الرسمي وأرفق إشعار التحويل للتحقق الفوري'
                  : 'Transfer crypto to the official deposit address and submit proof for rapid verification'}
              </p>
            </div>
          </div>
        </div>

        {/* Deposit Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: QR Code & Wallet Address (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            {/* Step 1: Select Coin */}
            <div className="bg-[#181a20] border border-[#2b313a] rounded-2xl p-5 shadow-lg space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-2">
                  1. {lang === 'ar' ? 'اختر العملة' : 'Select Coin'}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['USDT', 'BTC', 'ETH'] as const).map((coin) => (
                    <button
                      key={coin}
                      type="button"
                      onClick={() => setSelectedCoin(coin)}
                      className={`py-2.5 px-3 rounded-xl font-black text-xs border transition-all ${
                        selectedCoin === coin
                          ? 'bg-[#F0B90B] text-black border-[#F0B90B] shadow-md scale-[1.02]'
                          : 'bg-[#121418] text-gray-400 border-[#2b313a] hover:text-white'
                      }`}
                    >
                      {coin}
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 2: Select Network */}
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-2">
                  2. {lang === 'ar' ? 'اختر الشبكة' : 'Select Network'}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {selectedCoin === 'USDT' && (
                    <>
                      <button
                        type="button"
                        onClick={() => setSelectedNetwork('TRC20')}
                        className={`py-2 px-3 rounded-xl font-bold text-xs border transition-all ${
                          selectedNetwork === 'TRC20'
                            ? 'bg-[#F0B90B]/15 text-yellow-400 border-yellow-400/40'
                            : 'bg-[#121418] text-gray-400 border-[#2b313a]'
                        }`}
                      >
                        USDT-TRC20 (Tron)
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedNetwork('BEP20')}
                        className={`py-2 px-3 rounded-xl font-bold text-xs border transition-all ${
                          selectedNetwork === 'BEP20'
                            ? 'bg-[#F0B90B]/15 text-yellow-400 border-yellow-400/40'
                            : 'bg-[#121418] text-gray-400 border-[#2b313a]'
                        }`}
                      >
                        USDT-BEP20 (BSC)
                      </button>
                    </>
                  )}
                  {selectedCoin === 'BTC' && (
                    <button
                      type="button"
                      className="col-span-2 py-2 px-3 rounded-xl font-bold text-xs border bg-[#F0B90B]/15 text-yellow-400 border-yellow-400/40"
                    >
                      Bitcoin Mainnet (BTC)
                    </button>
                  )}
                  {selectedCoin === 'ETH' && (
                    <>
                      <button
                        type="button"
                        onClick={() => setSelectedNetwork('ERC20')}
                        className={`py-2 px-3 rounded-xl font-bold text-xs border transition-all ${
                          selectedNetwork === 'ERC20'
                            ? 'bg-[#F0B90B]/15 text-yellow-400 border-yellow-400/40'
                            : 'bg-[#121418] text-gray-400 border-[#2b313a]'
                        }`}
                      >
                        ETH-ERC20 (Ethereum)
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedNetwork('BEP20')}
                        className={`py-2 px-3 rounded-xl font-bold text-xs border transition-all ${
                          selectedNetwork === 'BEP20'
                            ? 'bg-[#F0B90B]/15 text-yellow-400 border-yellow-400/40'
                            : 'bg-[#121418] text-gray-400 border-[#2b313a]'
                        }`}
                      >
                        ETH-BEP20 (BSC)
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* QR Code Container */}
              <div className="flex flex-col items-center justify-center p-5 bg-[#121418] rounded-2xl border border-[#2b313a]">
                <div className="w-44 h-44 bg-white p-3 rounded-2xl flex items-center justify-center shadow-xl mb-3">
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
                  {lang === 'ar' ? 'امسح رمز QR للتحويل المباشر' : 'Scan QR code to transfer directly'}
                </span>
              </div>

              {/* Deposit Address display */}
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1.5">
                  {lang === 'ar' ? 'عنوان الإيداع الرسمي' : 'Official Deposit Address'}
                </label>
                <div className="flex items-center gap-2 bg-[#121418] border border-[#2b313a] rounded-xl p-2.5">
                  <span className="font-mono text-xs text-yellow-400 truncate flex-1 select-all" dir="ltr">
                    {currentAddress}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="px-3 py-1.5 bg-[#2b313a] hover:bg-[#38414e] text-white rounded-lg flex items-center gap-1.5 text-xs font-bold shrink-0 transition-colors"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-[#0ECB81]" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? (lang === 'ar' ? 'تم النسخ' : 'Copied') : (lang === 'ar' ? 'نسخ' : 'Copy')}</span>
                  </button>
                </div>
              </div>

              {/* Security Alert */}
              <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl flex items-start gap-2.5 text-yellow-300 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  {lang === 'ar'
                    ? `يرجى التأكد من اختيار شبكة ${selectedNetwork} لتحويل ${selectedCoin}. الإيداع عبر شبكة خاطئة قد يؤدي إلى فقدان الأصول.`
                    : `Please ensure you send only ${selectedCoin} on the ${selectedNetwork} network. Sending via wrong network will result in lost funds.`}
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Submit Form (7 cols) */}
          <div className="lg:col-span-7">
            <div className="bg-[#181a20] border border-[#2b313a] rounded-2xl p-6 shadow-xl space-y-5">
              <div className="border-b border-[#2b313a] pb-3">
                <h3 className="text-base font-black text-white">
                  3. {lang === 'ar' ? 'تأكيد عملية التحويل' : 'Confirm Transaction Details'}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  {lang === 'ar' 
                    ? 'أدخل بيانات العملية بعد تحويل المبلغ لتفعيل الرصيد فوراً'
                    : 'Submit your transaction details after sending to credit your account immediately'}
                </p>
              </div>

              {errorMsg && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-2 text-xs text-red-400 font-medium">
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
                {/* Amount */}
                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1.5">
                    {lang === 'ar' ? 'المبلغ المحوّل' : 'Transferred Amount'} ({selectedCoin})
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      min="1"
                      required
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="e.g. 250.00"
                      className="w-full px-3.5 py-3 bg-[#121418] border border-[#2b313a] rounded-xl text-white font-mono text-sm focus:outline-none focus:border-[#F0B90B]"
                    />
                    <span className="absolute inset-y-0 end-0 pe-4 flex items-center text-xs font-bold text-yellow-400">
                      {selectedCoin}
                    </span>
                  </div>
                </div>

                {/* TxID */}
                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1.5">
                    {lang === 'ar' ? 'رقم العملية / الهاش (TxID / Hash)' : 'Transaction ID / Hash (TxID)'}
                  </label>
                  <input
                    type="text"
                    required
                    value={txId}
                    onChange={(e) => setTxId(e.target.value)}
                    placeholder="e.g. a8b4c29... or 0x932f..."
                    className="w-full px-3.5 py-3 bg-[#121418] border border-[#2b313a] rounded-xl text-white font-mono text-xs focus:outline-none focus:border-[#F0B90B]"
                  />
                </div>

                {/* Screenshot Upload */}
                <div>
                  <label className="block text-xs font-bold text-gray-300 mb-1.5">
                    {lang === 'ar' ? 'صورة إشعار التحويل (اختياري / يُوصى به للتسريع)' : 'Payment Screenshot (Optional / Recommended for speed)'}
                  </label>
                  
                  <div className="border-2 border-dashed border-[#2b313a] hover:border-yellow-400/50 rounded-2xl p-4 text-center cursor-pointer transition-colors bg-[#121418] relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    {screenshotPreview ? (
                      <div className="flex flex-col items-center">
                        <img 
                          src={screenshotPreview} 
                          alt="Screenshot Preview" 
                          className="max-h-40 rounded-xl object-contain border border-[#2b313a] shadow-lg mb-2" 
                        />
                        <span className="text-[11px] text-[#0ECB81] font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {lang === 'ar' ? 'تم اختيار الصورة بنجاح (انقر للتغيير)' : 'Image loaded (Click to change)'}
                        </span>
                      </div>
                    ) : (
                      <div className="py-4 flex flex-col items-center justify-center gap-2">
                        <div className="w-10 h-10 rounded-xl bg-[#2b313a]/50 flex items-center justify-center text-gray-400">
                          <Upload className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-bold text-gray-300">
                          {lang === 'ar' ? 'انقر لرفع صورة التحويل' : 'Click or drop payment proof screenshot'}
                        </span>
                        <span className="text-[10px] text-gray-500">
                          PNG, JPG, WEBP up to 5MB
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 bg-[#0ECB81] hover:bg-[#0bb372] disabled:bg-gray-700 text-black font-black text-sm rounded-xl transition-all shadow-lg active:scale-98 flex items-center justify-center gap-2 mt-4"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <ShieldCheck className="w-5 h-5" />
                      <span>{lang === 'ar' ? 'إرسال طلب الإيداع' : 'Submit Deposit Request'}</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* User Deposit History Table */}
        <div className="bg-[#181a20] border border-[#2b313a] rounded-2xl p-5 shadow-xl">
          <div className="flex items-center gap-2 pb-3 mb-3 border-b border-[#2b313a]">
            <FileText className="w-4 h-4 text-yellow-400" />
            <h3 className="text-sm font-black text-white">
              {lang === 'ar' ? 'سجل إيداعاتي السابقة' : 'My Recent Deposit History'}
            </h3>
          </div>

          {userDeposits.length === 0 ? (
            <div className="py-8 text-center text-xs text-gray-500">
              {lang === 'ar' ? 'لا توجد إيداعات مسجلة حتى الآن.' : 'No deposits recorded yet.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-start">
                <thead>
                  <tr className="border-b border-[#262c35] text-gray-400 font-bold">
                    <th className="py-2.5 px-3">{lang === 'ar' ? 'العملة والشبكة' : 'Coin & Network'}</th>
                    <th className="py-2.5 px-3">{lang === 'ar' ? 'المبلغ' : 'Amount'}</th>
                    <th className="py-2.5 px-3">TxID</th>
                    <th className="py-2.5 px-3">{lang === 'ar' ? 'التاريخ' : 'Date'}</th>
                    <th className="py-2.5 px-3 text-end">{lang === 'ar' ? 'الحالة' : 'Status'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#222832]">
                  {userDeposits.map((dep) => (
                    <tr key={dep.id || dep.txId} className="hover:bg-[#1f242c]/50">
                      <td className="py-2.5 px-3 font-bold text-white">
                        {dep.coin} <span className="text-[10px] text-gray-400">({dep.network})</span>
                      </td>
                      <td className="py-2.5 px-3 font-mono font-black text-yellow-400">
                        +{dep.amount.toFixed(2)} {dep.coin}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-gray-400 truncate max-w-[140px]" title={dep.txId}>
                        {dep.txId}
                      </td>
                      <td className="py-2.5 px-3 text-gray-400">
                        {new Date(dep.createdAt).toLocaleString(lang === 'ar' ? 'ar-SA' : 'en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-2.5 px-3 text-end">
                        {dep.status === 'approved' && (
                          <span className="px-2.5 py-1 rounded-lg bg-[#0ECB81]/15 text-[#0ECB81] font-bold text-[10px] border border-[#0ECB81]/30">
                            {lang === 'ar' ? 'مقبول ومُضاف' : 'Approved'}
                          </span>
                        )}
                        {dep.status === 'pending' && (
                          <span className="px-2.5 py-1 rounded-lg bg-yellow-500/15 text-yellow-400 font-bold text-[10px] border border-yellow-500/30 flex items-center gap-1 inline-flex">
                            <Clock className="w-3 h-3 animate-spin" />
                            {lang === 'ar' ? 'قيد المراجعة' : 'Pending'}
                          </span>
                        )}
                        {dep.status === 'rejected' && (
                          <span className="px-2.5 py-1 rounded-lg bg-red-500/15 text-red-400 font-bold text-[10px] border border-red-500/30">
                            {lang === 'ar' ? 'مرفوض' : 'Rejected'}
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
