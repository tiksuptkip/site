export type Language = 'ar' | 'en';

export interface UserProfile {
  uid: string;
  firstName: string;
  lastName: string;
  email: string;
  walletBalance: number;
  isBlocked: boolean;
  registrationIp: string;
  lastLoginIp: string;
  createdAt: string;
  updatedAt?: string;
  verified: boolean;
  // Referral System fields
  referralCode?: string;
  referredBy?: string; // userId who invited this user
  referralCount?: number; // total users directly referred
  referralEarnings?: number; // total commission earned in USDT
}

// Referral Tier configuration
export interface ReferralTier {
  id: string;
  name: string;
  minReferrals: number; // e.g. 1
  maxReferrals: number; // e.g. 10
  commissionPercent: number; // e.g. 10 (%)
}

export interface ReferralSettings {
  tiers: ReferralTier[];
  globalPercent: number; // Default fallback percent e.g. 10
  level2Percent: number; // e.g. 3 (%)
  level3Percent: number; // e.g. 1 (%)
  autoAddToWallet: boolean; // default true
  updatedAt: string;
  updatedBy?: string;
}

export interface ReferralRecord {
  id?: string;
  referrerId: string;
  referredId: string;
  level: 1 | 2 | 3;
  depositAmount: number;
  commissionEarned: number;
  status: 'completed' | 'pending';
  createdAt: string;
  referredName?: string;
  referredEmail?: string;
}

export interface TransactionRecord {
  id?: string;
  type: 'referral_commission' | 'deposit' | 'withdrawal' | 'binary_payout';
  userId: string; // recipient
  amount: number;
  fromUser?: string; // referred user ID
  fromUserName?: string;
  tier?: string | number;
  createdAt: string;
  details?: string;
}

export interface TelegramInviteRecord {
  id?: string;
  userId: string;
  userEmail: string;
  channelId: string;
  channelTitle?: string;
  inviteLink: string;
  memberLimit: number; // 1
  used: boolean;
  createdAt: string;
  expiresAt?: string;
}

export interface AdminWalletAddresses {
  usdt_trc20: string;
  usdt_bep20: string;
  btc: string;
  eth: string;
}

export interface SiteSettings {
  siteName: string;
  logoUrl?: string;
  logoIcon?: string;
  themeColor: string;
  announcement?: string;
  updatedAt: string;
  updatedBy?: string;
  binarySettings?: BinarySettings;
  adminWallets?: AdminWalletAddresses;
}

export type BinaryDuration = '10s' | '30s' | '1m' | '5m' | '15m' | '1h' | '4h' | '24h';
export type BinaryDirection = 'UP' | 'DOWN';
export type BinaryStatus = 'pending' | 'WIN' | 'LOSS';

export interface BinaryTrade {
  id?: string;
  userId: string;
  email: string;
  userName?: string;
  coin: string;
  direction: BinaryDirection;
  entryPrice: number;
  exitPrice?: number;
  amount: number;
  profitPercent: number;
  duration: BinaryDuration;
  durationSeconds: number;
  status: BinaryStatus;
  startTime: number; // timestamp in ms
  endTime: number; // timestamp in ms
  createdAt: string;
  settledAt?: string;
  payout?: number;
}

export type RiskMode = 'random' | 'force_win' | 'force_lose' | 'loss_75';

export interface BinarySettings {
  enabled: boolean;
  globalProfitPercent: number; // 10 to 100, default 85
  payoutRate?: number; // Statistical RTP / Payout Percentage (10 to 95)
  riskMode?: RiskMode; // 'random' | 'force_win' | 'force_lose' | 'loss_75'
  coinProfitPercents?: Record<string, number>;
  minDuration: BinaryDuration;
  maxDuration: BinaryDuration;
  minTrade?: number; // min trade: 1
  maxTrade?: number; // max trade: 1000
  updatedAt?: string;
  updatedBy?: string;
}

export interface DepositRecord {
  id?: string;
  userId: string;
  userEmail: string;
  coin: 'USDT' | 'BTC' | 'ETH' | string;
  network: string; // 'TRC20' | 'BEP20' | 'ERC20' | 'BTC'
  amount: number;
  txId: string;
  screenshotUrl?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
}

export interface WithdrawalRecord {
  id?: string;
  userId: string;
  userEmail: string;
  coin: 'USDT' | 'BTC' | 'ETH' | string;
  network?: string;
  amount: number;
  walletAddress: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
}

export interface TelegramChannel {
  channelId: 'free' | 'regular' | 'vip' | 'super_vip' | string;
  title: string;
  price: number;
  inviteLink: string;
  durationDays: number;
  winRate: string;
  totalTrades: number;
  description: string;
  badge?: string;
  color?: string;
  proofImages: string[];
  tgChatId?: string; // Telegram chat / channel ID e.g. -1004441403389
  postsPerDay?: number; // Posts per day setting e.g. 5
  mode?: 'MANUAL' | 'AUTO'; // Toggle MANUAL / AUTO
  isConnected?: boolean; // Connection test indicator
  updatedAt?: string;
}

export interface TelegramSubscription {
  id?: string;
  userId: string;
  userEmail: string;
  channelId: 'super_vip' | 'vip' | 'regular' | string;
  channelTitle: string;
  pricePaid: number;
  startDate: string;
  endDate: string;
  status: 'active' | 'expired' | 'cancelled';
  inviteLink?: string;
  createdAt: string;
}

export interface CryptoCoin {
  id?: string;
  symbol: string;
  name: string;
  nameAr?: string;
  tvSymbol: string;
  basePrice: number;
  currentPrice: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  enabled: boolean;
  isDefault?: boolean;
  order?: number;
}

export interface CoinBalance {
  symbol: string;
  name?: string;
  balance: number;
  locked: number;
  totalDeposit: number;
  updatedAt?: string;
}

export interface SupportedCoin {
  id?: string;
  symbol: string;
  name: string;
  icon?: string;
  coingeckoId: string;
  currentPrice: number;
  change24h: number;
  high24h: number;
  low24h: number;
  enabled: boolean;
  network?: string;
  order?: number;
  updatedAt?: string;
}

export interface WalletLog {
  id?: string;
  timestamp: string;
  adminName: string;
  userId: string;
  userEmail: string;
  userName: string;
  symbol?: string; // e.g. BTC, ETH, USDT, SOL
  amount: number;
  previousBalance: number;
  newBalance: number;
  reason: string;
  type: 'ADMIN_ADD' | 'AIRDROP' | 'SPOT_TRADE' | string;
}

export interface OtpVerificationRecord {
  id?: string;
  email: string;
  otp: string;
  purpose: 'REGISTER' | 'PASSWORD_RESET';
  createdAt: string;
  expiresAt: string;
  verified: boolean;
  ip: string;
}

export type CryptoFilter = 'all' | 'gainers' | 'losers' | 'favorites';

// Telegram Auto Poster System
export type TelegramTradeCategory = 'Crypto' | 'Binary' | 'VIP' | 'Regular';
export type AutoPosterCategory = TelegramTradeCategory;
export type TradeOrderType = 'LONG' | 'SHORT';
export type TradeSignalType = TradeOrderType;
export type PostLogStatus = 'SENT' | 'FAILED' | 'SKIPPED' | 'TOKEN_MISSING' | 'SUCCESS' | 'TOKEN_MISSING_SKIPPED' | 'ERROR' | 'NO_TRADE_FOUND';

export interface TelegramGroup {
  id?: string;
  groupId: string; // e.g. -100123456789
  groupName: string;
  tradeType: TelegramTradeCategory;
  dailyCount: number; // 1 - 10
  postTimes: string[]; // ["09:00", "13:00", ...]
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}
export type TelegramGroupConfig = TelegramGroup;

export interface TradeBankItem {
  id?: string;
  title: string;
  type: TradeOrderType; // LONG or SHORT
  entry: string | number;
  target: string | number;
  profit: number; // %
  imageUrl?: string;
  category: TelegramTradeCategory;
  createdAt: string;
  lastPostedAt?: string;
}

export interface PostLog {
  id?: string;
  groupId: string;
  groupName?: string;
  tradeId?: string;
  tradeTitle?: string;
  timestamp: string;
  status: PostLogStatus | string;
  scheduledTime?: string;
  details?: string;
}

export interface BotSettings {
  token: string;
  autoEnabled: boolean;
  quickBotAutoListen?: boolean;
  updatedAt?: string;
  updatedBy?: string;
}

