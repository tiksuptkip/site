import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  addDoc, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  limit 
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { 
  TelegramGroupConfig,
  TelegramGroup,
  TradeBankItem, 
  PostLog, 
  BotSettings, 
  AutoPosterCategory,
  TelegramTradeCategory, 
  TradeSignalType,
  TradeOrderType, 
  PostLogStatus 
} from '../types';

export const BOT_SETTINGS_DOC = 'telegram_bot';

export interface ScheduledPostItem {
  groupId: string;
  groupName: string;
  tradeType: AutoPosterCategory;
  scheduledTime: string;
  targetDate: Date;
  isPastToday: boolean;
}

// TikSup Telegram Quick Bot Channel Configuration
export const QUICK_BOT_PRIMARY_CHANNEL = '-1004441403389'; // TikSup Crypto Quick ⚡️
export const QUICK_BOT_OTHER_CHANNELS = [
  '-1004348907709',
  '-1004429643399',
  '-1004496261634',
];
export const OTHER_CHANNEL_IDS = QUICK_BOT_OTHER_CHANNELS;
export const ALL_QUICK_BOT_CHANNELS = [
  QUICK_BOT_PRIMARY_CHANNEL,
  ...QUICK_BOT_OTHER_CHANNELS,
];

// Default initial groups
export const DEFAULT_GROUPS: Omit<TelegramGroupConfig, 'id'>[] = [
  {
    groupId: '-1004441403389',
    groupName: 'TikSup Crypto Quick ⚡️',
    tradeType: 'VIP',
    dailyCount: 6,
    postTimes: ['08:00', '11:00', '14:00', '17:00', '20:00', '23:00'],
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    groupId: '-1004348907709',
    groupName: 'TikSup VIP Crypto Signals',
    tradeType: 'Crypto',
    dailyCount: 4,
    postTimes: ['09:00', '13:00', '17:00', '21:00'],
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    groupId: '-1004429643399',
    groupName: 'TikSup Binary Scalpers Community',
    tradeType: 'Binary',
    dailyCount: 3,
    postTimes: ['10:30', '15:00', '19:30'],
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    groupId: '-1004496261634',
    groupName: 'TikSup Public Regular Channel',
    tradeType: 'Regular',
    dailyCount: 2,
    postTimes: ['11:00', '18:00'],
    active: true,
    createdAt: new Date().toISOString(),
  },
];

// Default initial Trade Bank items
export const DEFAULT_TRADES: Omit<TradeBankItem, 'id'>[] = [
  {
    title: 'BTC/USDT Breakout Surge',
    type: 'LONG',
    entry: 64250.00,
    target: 67800.00,
    profit: 145,
    imageUrl: 'https://images.unsplash.com/photo-1642543492481-44e81e3914a7?w=700&auto=format&fit=crop&q=80',
    category: 'VIP',
    createdAt: new Date().toISOString(),
  },
  {
    title: 'ETH/USDT Ascending Triangle Break',
    type: 'LONG',
    entry: 3480.00,
    target: 3720.00,
    profit: 112,
    imageUrl: 'https://images.unsplash.com/photo-1622979135225-d2ba269bc1df?w=700&auto=format&fit=crop&q=80',
    category: 'Crypto',
    createdAt: new Date().toISOString(),
  },
  {
    title: 'SOL/USDT Resistance Retest Scalp',
    type: 'SHORT',
    entry: 158.50,
    target: 142.00,
    profit: 96,
    imageUrl: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=700&auto=format&fit=crop&q=80',
    category: 'Crypto',
    createdAt: new Date().toISOString(),
  },
  {
    title: 'BTC/USDT 60s Binary CALL Setup',
    type: 'LONG',
    entry: 65120.00,
    target: 65200.00,
    profit: 85,
    imageUrl: 'https://images.unsplash.com/photo-1642790106117-e829e14a795f?w=700&auto=format&fit=crop&q=80',
    category: 'Binary',
    createdAt: new Date().toISOString(),
  },
  {
    title: 'XRP/USDT Swing Accumulation',
    type: 'LONG',
    entry: 0.5820,
    target: 0.6750,
    profit: 78,
    imageUrl: 'https://images.unsplash.com/photo-1621416894569-0f39ed31d247?w=700&auto=format&fit=crop&q=80',
    category: 'Regular',
    createdAt: new Date().toISOString(),
  }
];

// ==========================================
// 1. Timezone Helpers (Asia/Amman)
// ==========================================

export function getAmmanTimeParts(): {
  hour: number;
  minute: number;
  timeString: string;
  dateString: string;
  totalMinutes: number;
} {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Amman',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(now);
  const getPart = (type: string) => parts.find(p => p.type === type)?.value || '00';

  const year = getPart('year');
  const month = getPart('month');
  const day = getPart('day');
  const hour = parseInt(getPart('hour'), 10) || 0;
  const minute = parseInt(getPart('minute'), 10) || 0;

  const timeString = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  const dateString = `${year}-${month}-${day}`;
  const totalMinutes = hour * 60 + minute;

  return { hour, minute, timeString, dateString, totalMinutes };
}

export function getAmmanTimeInfo(): {
  timeStr: string;
  dateStr: string;
  currentMinutes: number;
  now: Date;
} {
  const parts = getAmmanTimeParts();
  return {
    timeStr: parts.timeString,
    dateStr: parts.dateString,
    currentMinutes: parts.totalMinutes,
    now: new Date(),
  };
}

export function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const [hStr, mStr] = timeStr.split(':');
  const h = parseInt(hStr, 10) || 0;
  const m = parseInt(mStr, 10) || 0;
  return h * 60 + m;
}

export function generateDefaultPostTimes(count: number): string[] {
  const clamped = Math.max(1, Math.min(10, count));
  const presets: Record<number, string[]> = {
    1: ['14:00'],
    2: ['11:00', '18:00'],
    3: ['10:00', '15:00', '20:00'],
    4: ['09:00', '13:00', '17:00', '21:00'],
    5: ['08:30', '11:30', '14:30', '17:30', '20:30'],
    6: ['08:00', '10:30', '13:00', '15:30', '18:00', '21:00'],
    7: ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00'],
    8: ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00'],
    9: ['07:30', '09:30', '11:30', '13:30', '15:30', '17:30', '19:30', '21:30', '23:00'],
    10: ['07:00', '08:45', '10:30', '12:15', '14:00', '15:45', '17:30', '19:15', '21:00', '22:45']
  };
  return presets[clamped] || ['12:00'];
}

// Calculate upcoming schedule list
export function getUpcomingSchedule(groups: TelegramGroupConfig[]): ScheduledPostItem[] {
  const { totalMinutes } = getAmmanTimeParts();
  const scheduleItems: ScheduledPostItem[] = [];

  for (const group of groups) {
    if (!group.active || !group.postTimes || group.postTimes.length === 0) continue;

    for (const timeStr of group.postTimes) {
      const postMinutes = parseTimeToMinutes(timeStr);
      const isPastToday = postMinutes <= totalMinutes;

      // Approximate Date object in Amman time
      const targetDate = new Date();
      const [h, m] = timeStr.split(':').map((x) => parseInt(x, 10) || 0);
      targetDate.setHours(h, m, 0, 0);

      if (isPastToday) {
        targetDate.setDate(targetDate.getDate() + 1);
      }

      scheduleItems.push({
        groupId: group.groupId,
        groupName: group.groupName,
        tradeType: group.tradeType,
        scheduledTime: timeStr,
        targetDate,
        isPastToday,
      });
    }
  }

  // Sort earliest targetDate first
  scheduleItems.sort((a, b) => a.targetDate.getTime() - b.targetDate.getTime());
  return scheduleItems;
}

// ==========================================
// 2. Initialization
// ==========================================

export async function ensureQuickBotChannelsExist(): Promise<void> {
  try {
    const snap = await getDocs(collection(db, 'telegram_groups'));
    const existingGroupIds = new Set(snap.docs.map((d) => (d.data() as any).groupId));

    for (const group of DEFAULT_GROUPS) {
      if (!existingGroupIds.has(group.groupId)) {
        await addDoc(collection(db, 'telegram_groups'), {
          ...group,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    }
  } catch (err) {
    console.warn('ensureQuickBotChannelsExist notice:', err);
  }
}

export async function initializeAutoPosterIfEmpty(): Promise<void> {
  try {
    // 1. Bot Settings
    const botRef = doc(db, 'bot_settings', BOT_SETTINGS_DOC);
    const botSnap = await getDoc(botRef);
    if (!botSnap.exists()) {
      await setDoc(botRef, {
        token: '',
        autoEnabled: false,
        quickBotAutoListen: false,
        updatedAt: new Date().toISOString(),
      });
    }

    // 2. Groups (seed if empty, or ensure Quick Bot channels exist)
    const groupsSnap = await getDocs(collection(db, 'telegram_groups'));
    if (groupsSnap.empty) {
      for (const g of DEFAULT_GROUPS) {
        await addDoc(collection(db, 'telegram_groups'), g);
      }
    } else {
      await ensureQuickBotChannelsExist();
    }

    // 3. Trade Bank
    const tradesSnap = await getDocs(collection(db, 'trade_bank'));
    if (tradesSnap.empty) {
      for (const tr of DEFAULT_TRADES) {
        await addDoc(collection(db, 'trade_bank'), tr);
      }
    }
  } catch (err) {
    console.warn('initializeAutoPosterIfEmpty notice:', err);
  }
}

// ==========================================
// 3. Bot Settings
// ==========================================

export async function getBotSettings(): Promise<BotSettings> {
  try {
    const docRef = doc(db, 'bot_settings', BOT_SETTINGS_DOC);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as BotSettings;
    }
    const initial: BotSettings = {
      token: '',
      autoEnabled: false,
      updatedAt: new Date().toISOString(),
    };
    await setDoc(docRef, initial);
    return initial;
  } catch (err) {
    console.warn('getBotSettings error:', err);
    return { token: '', autoEnabled: false };
  }
}

export function subscribeBotSettings(callback: (settings: BotSettings) => void): () => void {
  const docRef = doc(db, 'bot_settings', BOT_SETTINGS_DOC);
  return onSnapshot(
    docRef,
    (snap) => {
      if (snap.exists()) {
        callback(snap.data() as BotSettings);
      } else {
        const initial: BotSettings = {
          token: '',
          autoEnabled: false,
          updatedAt: new Date().toISOString(),
        };
        setDoc(docRef, initial).catch(console.warn);
        callback(initial);
      }
    },
    (err) => console.warn('subscribeBotSettings error:', err)
  );
}

export async function saveBotSettings(updates: Partial<BotSettings>, adminUsername?: string): Promise<void> {
  const docRef = doc(db, 'bot_settings', BOT_SETTINGS_DOC);
  await setDoc(docRef, {
    ...updates,
    updatedAt: new Date().toISOString(),
    ...(adminUsername ? { updatedBy: adminUsername } : {}),
  }, { merge: true });
}

export async function updateBotSettings(token: string, autoEnabled: boolean): Promise<void> {
  return saveBotSettings({ token: token.trim(), autoEnabled });
}

export async function testTelegramBotConnection(token: string): Promise<{ ok: boolean; message: string; botInfo?: any }> {
  const cleaned = token.trim();
  if (!cleaned) {
    return { ok: false, message: 'Bot token cannot be empty. Please enter your Telegram bot token.' };
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${cleaned}/getMe`);
    const data = await res.json();
    if (data.ok && data.result) {
      const username = data.result.username ? `@${data.result.username}` : data.result.first_name;
      return {
        ok: true,
        message: `Connected successfully to Telegram Bot: ${username} (ID: ${data.result.id})`,
        botInfo: data.result,
      };
    } else {
      return {
        ok: false,
        message: `Telegram API Error: ${data.description || 'Invalid token'}`,
      };
    }
  } catch (err: any) {
    return {
      ok: false,
      message: `Connection failed: ${err.message || 'Network error'}`,
    };
  }
}

export const testBotConnection = async (token: string) => {
  const res = await testTelegramBotConnection(token);
  return { success: res.ok, message: res.message, botInfo: res.botInfo };
};

// ==========================================
// 4. Telegram Groups CRUD
// ==========================================

export function subscribeTelegramGroups(callback: (groups: TelegramGroupConfig[]) => void): () => void {
  const colRef = collection(db, 'telegram_groups');
  return onSnapshot(
    colRef,
    async (snap) => {
      if (snap.empty) {
        initializeAutoPosterIfEmpty().catch(console.warn);
        callback([]);
        return;
      }
      const list: TelegramGroupConfig[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      }));
      callback(list);
    },
    (err) => console.warn('subscribeTelegramGroups error:', err)
  );
}

export async function saveTelegramGroup(group: Partial<TelegramGroupConfig>): Promise<string> {
  const colRef = collection(db, 'telegram_groups');
  if (group.id) {
    const docRef = doc(db, 'telegram_groups', group.id);
    await updateDoc(docRef, {
      ...group,
      updatedAt: new Date().toISOString(),
    });
    return group.id;
  } else {
    const res = await addDoc(colRef, {
      ...group,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    return res.id;
  }
}

export async function addTelegramGroup(data: Omit<TelegramGroupConfig, 'id' | 'createdAt'>): Promise<string> {
  return saveTelegramGroup(data);
}

export async function updateTelegramGroup(id: string, data: Partial<TelegramGroupConfig>): Promise<void> {
  return saveTelegramGroup({ ...data, id }).then(() => {});
}

export async function deleteTelegramGroup(id: string): Promise<void> {
  const docRef = doc(db, 'telegram_groups', id);
  await deleteDoc(docRef);
}

export async function toggleTelegramGroupActive(id: string, active: boolean): Promise<void> {
  const docRef = doc(db, 'telegram_groups', id);
  await updateDoc(docRef, {
    active,
    updatedAt: new Date().toISOString(),
  });
}

// ==========================================
// 5. Trade Bank CRUD & CSV Import
// ==========================================

export function subscribeTradeBank(callback: (trades: TradeBankItem[]) => void): () => void {
  const colRef = collection(db, 'trade_bank');
  return onSnapshot(
    colRef,
    async (snap) => {
      if (snap.empty) {
        initializeAutoPosterIfEmpty().catch(console.warn);
        callback([]);
        return;
      }
      const list: TradeBankItem[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      }));
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      callback(list);
    },
    (err) => console.warn('subscribeTradeBank error:', err)
  );
}

export async function saveTradeBankItem(item: Partial<TradeBankItem>): Promise<string> {
  const colRef = collection(db, 'trade_bank');
  if (item.id) {
    const docRef = doc(db, 'trade_bank', item.id);
    await updateDoc(docRef, {
      ...item,
      updatedAt: new Date().toISOString(),
    });
    return item.id;
  } else {
    const res = await addDoc(colRef, {
      ...item,
      createdAt: new Date().toISOString(),
    });
    return res.id;
  }
}

export async function addTradeBankItem(data: Omit<TradeBankItem, 'id' | 'createdAt'>): Promise<string> {
  return saveTradeBankItem(data);
}

export async function deleteTradeBankItem(id: string): Promise<void> {
  const docRef = doc(db, 'trade_bank', id);
  await deleteDoc(docRef);
}

export async function uploadTradeImage(file: File): Promise<string> {
  // Converts file to optimized Base64 data URL for self-contained, offline-resilient storage
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

export async function bulkImportTradeBank(csvText: string): Promise<{ added: number; errors: string[] }> {
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length < 2) {
    return { added: 0, errors: ['CSV is empty or missing data rows.'] };
  }

  const header = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const titleIdx = header.indexOf('title');
  const typeIdx = header.indexOf('type');
  const entryIdx = header.indexOf('entry');
  const targetIdx = header.indexOf('target');
  const profitIdx = header.indexOf('profit');
  const catIdx = header.indexOf('category');
  const imgIdx = header.indexOf('imageurl');

  if (titleIdx === -1 || entryIdx === -1 || profitIdx === -1) {
    return {
      added: 0,
      errors: ['CSV must contain at least "title", "entry", and "profit" header columns.'],
    };
  }

  let added = 0;
  const errors: string[] = [];
  const colRef = collection(db, 'trade_bank');

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cols = line.split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''));

    const title = cols[titleIdx] || `Trade Setup #${i}`;
    const rawType = typeIdx >= 0 ? cols[typeIdx]?.toUpperCase() : 'LONG';
    const type: TradeSignalType = rawType === 'SHORT' ? 'SHORT' : 'LONG';
    const entry = parseFloat(cols[entryIdx]) || 0;
    const target = targetIdx >= 0 ? parseFloat(cols[targetIdx]) || 0 : 0;
    const profit = parseFloat(cols[profitIdx]) || 85;
    const rawCat = catIdx >= 0 ? cols[catIdx] : 'Crypto';
    const category: AutoPosterCategory = 
      ['Crypto', 'Binary', 'VIP', 'Regular'].includes(rawCat) ? (rawCat as AutoPosterCategory) : 'Crypto';
    const imageUrl = (imgIdx >= 0 && cols[imgIdx]) 
      ? cols[imgIdx] 
      : 'https://images.unsplash.com/photo-1642543492481-44e81e3914a7?w=700&auto=format&fit=crop&q=80';

    try {
      await addDoc(colRef, {
        title,
        type,
        entry,
        target,
        profit,
        category,
        imageUrl,
        createdAt: new Date().toISOString(),
      });
      added++;
    } catch (e: any) {
      errors.push(`Row ${i + 1}: ${e.message}`);
    }
  }

  return { added, errors };
}

export const importTradesFromCSV = bulkImportTradeBank;

// ==========================================
// 6. Post Logs CRUD
// ==========================================

export function subscribePostLogs(
  callback: (logs: PostLog[]) => void, 
  limitCount: number = 50
): () => void {
  const colRef = collection(db, 'post_logs');
  return onSnapshot(
    colRef,
    (snap) => {
      const list: PostLog[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      }));
      list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      callback(list.slice(0, limitCount));
    },
    (err) => console.warn('subscribePostLogs error:', err)
  );
}

export async function addPostLog(log: Omit<PostLog, 'id'>): Promise<string> {
  const colRef = collection(db, 'post_logs');
  const res = await addDoc(colRef, log);
  return res.id;
}

export async function clearAllPostLogs(): Promise<void> {
  try {
    const colRef = collection(db, 'post_logs');
    const snap = await getDocs(colRef);
    const promises = snap.docs.map((d) => deleteDoc(d.ref));
    await Promise.all(promises);
  } catch (err) {
    console.warn('clearAllPostLogs notice:', err);
  }
}

export const clearOldLogs = clearAllPostLogs;

// ==========================================
// 7. Core Auto Poster Execution Engine
// ==========================================

export interface AutoPosterExecutionResult {
  groupName: string;
  groupId: string;
  status: PostLogStatus;
  scheduledTime?: string;
  tradeTitle?: string;
  details: string;
}

export async function executeAutoPosterCheck(
  forceTrigger: boolean = false
): Promise<{ checkedGroups: number; postedCount: number; skippedCount: number; summary: string }> {
  const settings = await getBotSettings();
  const token = (settings.token || '').trim();
  const autoEnabled = settings.autoEnabled;

  if (!forceTrigger && !autoEnabled) {
    return { checkedGroups: 0, postedCount: 0, skippedCount: 0, summary: 'Auto poster disabled' };
  }

  // Fetch active groups
  const groupsSnap = await getDocs(collection(db, 'telegram_groups'));
  const activeGroups: TelegramGroupConfig[] = groupsSnap.docs
    .map((d) => ({ id: d.id, ...(d.data() as any) }))
    .filter((g) => g.active);

  if (activeGroups.length === 0) {
    return { checkedGroups: 0, postedCount: 0, skippedCount: 0, summary: 'No active groups' };
  }

  // Fetch all trades
  const tradesSnap = await getDocs(collection(db, 'trade_bank'));
  const allTrades: TradeBankItem[] = tradesSnap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as any),
  }));

  // Fetch today's logs (Amman date)
  const { dateString, totalMinutes, timeString } = getAmmanTimeParts();
  const logsSnap = await getDocs(collection(db, 'post_logs'));
  const allLogs: PostLog[] = logsSnap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as any),
  }));

  const todaysLogs = allLogs.filter((l) => {
    try {
      const logDate = new Date(l.timestamp).toISOString().split('T')[0];
      return logDate === dateString;
    } catch {
      return false;
    }
  });

  let postedCount = 0;
  let skippedCount = 0;

  for (const group of activeGroups) {
    let matchedPostTime: string | null = null;

    if (forceTrigger) {
      matchedPostTime = (group.postTimes && group.postTimes[0]) || timeString;
    } else {
      for (const timeStr of group.postTimes || []) {
        const targetMinutes = parseTimeToMinutes(timeStr);
        // Window check: ±10 minutes
        if (Math.abs(totalMinutes - targetMinutes) <= 10) {
          const alreadyPosted = todaysLogs.some(
            (log) => log.groupId === group.groupId && log.scheduledTime === timeStr
          );
          if (!alreadyPosted) {
            matchedPostTime = timeStr;
            break;
          }
        }
      }
    }

    if (!matchedPostTime) continue;

    // Pick matching trade
    let eligibleTrades = allTrades.filter((tr) => tr.category === group.tradeType);
    if (eligibleTrades.length === 0) eligibleTrades = allTrades;

    let selectedTrade: TradeBankItem | null = null;
    if (eligibleTrades.length > 0) {
      eligibleTrades.sort((a, b) => {
        const timeA = a.lastPostedAt ? new Date(a.lastPostedAt).getTime() : 0;
        const timeB = b.lastPostedAt ? new Date(b.lastPostedAt).getTime() : 0;
        return timeA - timeB;
      });
      const candidatePool = eligibleTrades.slice(0, Math.min(3, eligibleTrades.length));
      selectedTrade = candidatePool[Math.floor(Math.random() * candidatePool.length)];
    }

    const tradeTitle = selectedTrade?.title || 'Daily Market Setup';
    const tradeId = selectedTrade?.id || 'none';

    // If token missing -> log "Token missing - skipped"
    if (!token) {
      await addPostLog({
        groupId: group.groupId,
        groupName: group.groupName,
        tradeId,
        tradeTitle,
        timestamp: new Date().toISOString(),
        status: 'TOKEN_MISSING_SKIPPED' as any,
        scheduledTime: matchedPostTime,
        details: 'Token missing - skipped (System ready, waiting for bot token)',
      });
      skippedCount++;
      continue;
    }

    // Token set -> dispatch to Telegram
    const isQuickBotChannel = group.groupId === QUICK_BOT_CHANNEL_ID;
    const formattedCaption = isQuickBotChannel
      ? generateQuickScalpSignalText(selectedTrade?.title)
      : (selectedTrade
        ? `🚀 ${selectedTrade.title}\nEntry: ${selectedTrade.entry}\nTarget: ${selectedTrade.target}\nProfit: +${selectedTrade.profit}%\n\nJoin: tiksup.com/telegram-channels`
        : `🚀 Daily Signal Alert\nStay tuned for high-probability setups.\n\nJoin: tiksup.com/telegram-channels`);

    let status: PostLogStatus = 'SENT';
    let details = '';

    try {
      let telegramRes: Response;
      if (selectedTrade?.imageUrl && selectedTrade.imageUrl.startsWith('http')) {
        telegramRes = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: group.groupId,
            photo: selectedTrade.imageUrl,
            caption: formattedCaption,
            parse_mode: 'HTML',
          }),
        });
      } else {
        telegramRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: group.groupId,
            text: formattedCaption,
            parse_mode: 'HTML',
          }),
        });
      }

      const telegramData = await telegramRes.json();
      if (telegramData.ok) {
        status = 'SUCCESS' as any;
        details = `Delivered to ${group.groupName} (Msg ID: ${telegramData.result?.message_id || 'OK'})`;
        postedCount++;

        if (selectedTrade?.id) {
          try {
            await updateDoc(doc(db, 'trade_bank', selectedTrade.id), {
              lastPostedAt: new Date().toISOString(),
            });
          } catch {}
        }
      } else {
        status = 'ERROR' as any;
        details = `Telegram API Error: ${telegramData.description || 'Unknown error'}`;
      }
    } catch (err: any) {
      status = 'ERROR' as any;
      details = `Delivery network error: ${err.message || 'Failed'}`;
    }

    await addPostLog({
      groupId: group.groupId,
      groupName: group.groupName,
      tradeId,
      tradeTitle,
      timestamp: new Date().toISOString(),
      status,
      scheduledTime: matchedPostTime,
      details,
    });
  }

  return {
    checkedGroups: activeGroups.length,
    postedCount,
    skippedCount,
    summary: `Processed ${activeGroups.length} groups: ${postedCount} posted, ${skippedCount} skipped.`,
  };
}

export async function executeAutoPoster(
  forceTrigger: boolean = false
): Promise<{ executed: boolean; summary: string; results: AutoPosterExecutionResult[] }> {
  const res = await executeAutoPosterCheck(forceTrigger);
  return {
    executed: res.postedCount > 0 || res.skippedCount > 0,
    summary: res.summary,
    results: [],
  };
}

export function calculateNextPost(group: TelegramGroupConfig): {
  nextTime: string;
  countdownMinutes: number;
  displayText: string;
} {
  const { totalMinutes } = getAmmanTimeParts();
  const times = [...(group.postTimes || [])].sort((a, b) => parseTimeToMinutes(a) - parseTimeToMinutes(b));

  for (const t of times) {
    const m = parseTimeToMinutes(t);
    if (m > totalMinutes) {
      const diff = m - totalMinutes;
      const hours = Math.floor(diff / 60);
      const mins = diff % 60;
      const displayText = hours > 0 ? `in ${hours}h ${mins}m (${t})` : `in ${mins}m (${t})`;
      return { nextTime: t, countdownMinutes: diff, displayText };
    }
  }

  if (times.length > 0) {
    const firstMinutes = parseTimeToMinutes(times[0]);
    const diff = (24 * 60 - totalMinutes) + firstMinutes;
    const hours = Math.floor(diff / 60);
    const mins = diff % 60;
    return {
      nextTime: times[0],
      countdownMinutes: diff,
      displayText: `Tomorrow at ${times[0]} (in ${hours}h ${mins}m)`,
    };
  }

  return { nextTime: '--:--', countdownMinutes: 0, displayText: 'No post times configured' };
}

// ==========================================
// 8. TikSup Telegram Quick Bot Engine
// ==========================================

/**
 * Extracts a cryptocurrency coin ticker from any incoming message string.
 * Defaults to 'BTC/USDT' if no specific coin ticker is detected.
 */
export function extractCoinFromMessage(input?: string): string {
  if (!input) return 'BTC/USDT';
  const trimmed = input.trim();
  if (!trimmed) return 'BTC/USDT';

  // 1. Direct match for trading pairs like ETH/USDT, SOL-USDT, BTCUSDT
  const pairMatch = trimmed.match(/\b([A-Za-z0-9]{2,10})\s*(\/|-)?\s*(USDT|USD|BUSD)\b/i);
  if (pairMatch) {
    return `${pairMatch[1].toUpperCase()}/USDT`;
  }

  // 2. Scan for popular crypto tickers in text
  const popularTickers = [
    'BTC', 'ETH', 'SOL', 'XRP', 'DOGE', 'BNB', 'ADA', 'AVAX',
    'SUI', 'PEPE', 'SHIB', 'NEAR', 'LINK', 'TRX', 'LTC', 'TON',
    'KAS', 'RENDER', 'APT', 'FET', 'DOT', 'MATIC', 'ARB', 'OP',
    'INJ', 'TIA', 'WIF', 'BONK', 'FLOKI', 'FTM', 'ATOM'
  ];

  const words = trimmed.toUpperCase().split(/[^A-Z0-9]/).filter(Boolean);
  for (const w of words) {
    if (popularTickers.includes(w)) {
      return `${w}/USDT`;
    }
  }

  // 3. If a single short word was sent (e.g. "SOL", "PEPE", "TAO")
  if (words.length === 1 && words[0].length >= 2 && words[0].length <= 8) {
    return `${words[0]}/USDT`;
  }

  // 4. Default to BTC/USDT as requested: "Use the coin I sent or BTC/USDT as default"
  return 'BTC/USDT';
}

/**
 * Builds the exact Quick Scalp signal text required by TikSup Quick Bot:
 * Language: English only
 * Emojis: 🔥⚡️🚀💥💪📈
 * Direction: LONG 📈
 * Balance: 20% OF YOUR BALANCE
 * Trade Time: 15 Seconds
 * Reply: ✅ Fired 🔥
 */
export function buildQuickScalpSignalText(inputMessage?: string): {
  coin: string;
  text: string;
  reply: string;
} {
  const coin = extractCoinFromMessage(inputMessage);

  const text = 
`🔥🔥 BOOOOM! LFG! 🔥🔥
⚡️ QUICK SCALP ALERT ⚡️

💰 Coin: ${coin}
🚀 Direction: LONG 📈

💥 BUY NOW! BUY 20% OF YOUR BALANCE! 💥
👉 DO IT! BUY! BUY! BUY! 👈

⏰ Trade Time: 15 Seconds
⚡️ Super Fast - Let's Go!

💪 WE ARE WINNING! LET'S EAT! 💪
🔥🔥🔥🔥🔥🔥🔥`;

  return {
    coin,
    text,
    reply: '✅ Fired 🔥',
  };
}

export interface QuickScalpFireResult {
  ok: boolean;
  reply: string;
  message: string;
  coin: string;
  text: string;
  targetChannelId: string;
  deliveredChannels: string[];
  failedChannels: string[];
  messageId?: number;
}

/**
 * Automatically creates and posts the Quick Scalp signal to -1004441403389 immediately.
 * Also supports broadcasting to secondary channels if requested.
 * Returns the exact reply: "✅ Fired 🔥"
 */
export async function fireQuickScalpSignal(options?: {
  inputMessage?: string;
  targetChannelId?: string;
  broadcastToAllChannels?: boolean;
}): Promise<QuickScalpFireResult> {
  const inputMessage = options?.inputMessage || '';
  const primaryChannel = options?.targetChannelId || QUICK_BOT_PRIMARY_CHANNEL;
  const broadcastAll = options?.broadcastToAllChannels || false;

  const targetChannels = broadcastAll ? ALL_QUICK_BOT_CHANNELS : [primaryChannel];

  const { coin, text, reply } = buildQuickScalpSignalText(inputMessage);

  const settings = await getBotSettings();
  const token = (settings.token || '').trim();

  // If token is missing, record in logs and return status
  if (!token) {
    for (const chId of targetChannels) {
      await addPostLog({
        groupId: chId,
        groupName: chId === QUICK_BOT_PRIMARY_CHANNEL ? 'TikSup Crypto Quick ⚡️' : `Channel ${chId}`,
        tradeId: 'quick-scalp',
        tradeTitle: `QUICK SCALP: ${coin} LONG 15s`,
        timestamp: new Date().toISOString(),
        status: 'TOKEN_MISSING_SKIPPED',
        scheduledTime: 'QUICK_FIRE',
        details: 'Token missing - skipped. Set Telegram Bot token in Admin > Telegram Bot to broadcast live.',
      });
    }

    return {
      ok: false,
      reply: '✅ Fired 🔥',
      message: 'Signal created! Telegram Bot Token not set yet. Configure token in Admin to dispatch directly to Telegram.',
      coin,
      text,
      targetChannelId: primaryChannel,
      deliveredChannels: [],
      failedChannels: targetChannels,
    };
  }

  const delivered: string[] = [];
  const failed: string[] = [];
  let firstMsgId: number | undefined;

  for (const chId of targetChannels) {
    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chId,
          text,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        delivered.push(chId);
        if (!firstMsgId) firstMsgId = data.result?.message_id;

        await addPostLog({
          groupId: chId,
          groupName: chId === QUICK_BOT_PRIMARY_CHANNEL ? 'TikSup Crypto Quick ⚡️' : `Channel ${chId}`,
          tradeId: 'quick-scalp',
          tradeTitle: `QUICK SCALP: ${coin} LONG 15s`,
          timestamp: new Date().toISOString(),
          status: 'SUCCESS',
          scheduledTime: 'QUICK_FIRE',
          details: `Delivered to ${chId} (Msg ID: ${data.result?.message_id || 'OK'})`,
        });
      } else {
        failed.push(chId);
        await addPostLog({
          groupId: chId,
          groupName: chId === QUICK_BOT_PRIMARY_CHANNEL ? 'TikSup Crypto Quick ⚡️' : `Channel ${chId}`,
          tradeId: 'quick-scalp',
          tradeTitle: `QUICK SCALP: ${coin} LONG 15s`,
          timestamp: new Date().toISOString(),
          status: 'ERROR',
          scheduledTime: 'QUICK_FIRE',
          details: `Telegram API error: ${data.description || 'Unknown error'}`,
        });
      }
    } catch (err: any) {
      failed.push(chId);
      await addPostLog({
        groupId: chId,
        groupName: chId === QUICK_BOT_PRIMARY_CHANNEL ? 'TikSup Crypto Quick ⚡️' : `Channel ${chId}`,
        tradeId: 'quick-scalp',
        tradeTitle: `QUICK SCALP: ${coin} LONG 15s`,
        timestamp: new Date().toISOString(),
        status: 'ERROR',
        scheduledTime: 'QUICK_FIRE',
        details: `Network error: ${err.message || 'Failed to dispatch'}`,
      });
    }
  }

  const isOk = delivered.length > 0;
  return {
    ok: isOk,
    reply: '✅ Fired 🔥',
    message: isOk
      ? `Signal dispatched to ${delivered.join(', ')}`
      : `Failed to deliver signal to Telegram: ${failed.join(', ')}`,
    coin,
    text,
    targetChannelId: primaryChannel,
    deliveredChannels: delivered,
    failedChannels: failed,
    messageId: firstMsgId,
  };
}

// Background long-polling listener for Telegram incoming messages
let globalPollingActive = false;
let globalLastUpdateId = 0;

export function startQuickBotPolling(
  onUpdateReceived?: (info: { message: string; coin: string; reply: string }) => void
): () => void {
  globalPollingActive = true;

  const pollCycle = async () => {
    if (!globalPollingActive) return;

    try {
      const settings = await getBotSettings();
      const token = (settings.token || '').trim();
      if (!token) {
        setTimeout(pollCycle, 5000);
        return;
      }

      const url = `https://api.telegram.org/bot${token}/getUpdates?offset=${globalLastUpdateId + 1}&timeout=5`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.ok && Array.isArray(data.result) && data.result.length > 0) {
        for (const update of data.result) {
          if (update.update_id > globalLastUpdateId) {
            globalLastUpdateId = update.update_id;
          }

          const msg = update.message || update.channel_post;
          if (msg && msg.text) {
            const incomingText = msg.text.trim();
            // Ignore bot's own signals or replies to prevent echo loops
            if (incomingText.includes('BOOOOM! LFG!') || incomingText.includes('✅ Fired 🔥')) {
              continue;
            }

            // Automatically post Quick Scalp Signal to -1004441403389 immediately!
            const fireResult = await fireQuickScalpSignal({
              inputMessage: incomingText,
              targetChannelId: QUICK_BOT_PRIMARY_CHANNEL,
            });

            // Reply "✅ Fired 🔥" back to the sender chat
            if (msg.chat && msg.chat.id && String(msg.chat.id) !== QUICK_BOT_PRIMARY_CHANNEL) {
              try {
                await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    chat_id: msg.chat.id,
                    text: '✅ Fired 🔥',
                    reply_to_message_id: msg.message_id,
                  }),
                });
              } catch {}
            }

            if (onUpdateReceived) {
              onUpdateReceived({
                message: incomingText,
                coin: fireResult.coin,
                reply: '✅ Fired 🔥',
              });
            }
          }
        }
      }
    } catch (e) {
      console.warn('Telegram polling error:', e);
    }

    if (globalPollingActive) {
      setTimeout(pollCycle, 2500);
    }
  };

  pollCycle();

  return () => {
    globalPollingActive = false;
  };
}


export const QUICK_BOT_CHANNEL_ID = QUICK_BOT_PRIMARY_CHANNEL;
export const QUICK_BOT_CHANNEL_NAME = 'TikSup Crypto Quick ⚡️';

export const generateQuickScalpSignalText = (rawCoinInput?: string): string => {
  return buildQuickScalpSignalText(rawCoinInput).text;
};

export const dispatchQuickBotSignal = fireQuickScalpSignal;


