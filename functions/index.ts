/**
 * TikSup Cloud Functions - Automated Telegram Signal Poster
 * Runs 24/7 in background via Firebase Cloud Scheduler
 */
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

interface LiveCoinPrice {
  symbol: string;
  price: number;
}

// Fetch live prices from Binance API
async function fetchBinancePrices(): Promise<Record<string, number>> {
  const defaultPrices: Record<string, number> = {
    'BTC/USDT': 95400,
    'ETH/USDT': 3350,
    'SOL/USDT': 185,
    'XRP/USDT': 2.45,
    'DOGE/USDT': 0.28,
    'BNB/USDT': 680,
    'AVAX/USDT': 36.5,
  };

  try {
    const res = await fetch('https://api.binance.com/api/v3/ticker/price');
    const data = (await res.json()) as { symbol: string; price: string }[];
    if (Array.isArray(data)) {
      const symbolsMap: Record<string, string> = {
        'BTCUSDT': 'BTC/USDT',
        'ETHUSDT': 'ETH/USDT',
        'SOLUSDT': 'SOL/USDT',
        'XRPUSDT': 'XRP/USDT',
        'DOGEUSDT': 'DOGE/USDT',
        'BNBUSDT': 'BNB/USDT',
        'AVAXUSDT': 'AVAX/USDT',
      };
      for (const item of data) {
        if (symbolsMap[item.symbol]) {
          defaultPrices[symbolsMap[item.symbol]] = parseFloat(item.price);
        }
      }
    }
  } catch (err) {
    console.warn('Functions: Error fetching Binance prices, using fallback:', err);
  }
  return defaultPrices;
}

// Generate realistic signal based on actual market price
function generateSignalContent(
  channelTier: 'FREE' | 'REGULAR' | 'VIP' | 'SUPER_VIP',
  coinPair: string,
  currentPrice: number
): { text: string; imageUrl: string; profit: number } {
  const isLong = Math.random() > 0.4;
  const direction = isLong ? 'LONG 📈' : 'SHORT 📉';
  const deltaPercent = (0.8 + Math.random() * 2.2); // 0.8% - 3.0% move
  const targetPrice = isLong 
    ? Number((currentPrice * (1 + deltaPercent / 100)).toFixed(currentPrice > 10 ? 2 : 4))
    : Number((currentPrice * (1 - deltaPercent / 100)).toFixed(currentPrice > 10 ? 2 : 4));
  const stopLoss = isLong
    ? Number((currentPrice * 0.985).toFixed(currentPrice > 10 ? 2 : 4))
    : Number((currentPrice * 1.015).toFixed(currentPrice > 10 ? 2 : 4));

  const leverage = channelTier === 'SUPER_VIP' ? 50 : channelTier === 'VIP' ? 25 : channelTier === 'REGULAR' ? 15 : 10;
  const realisticProfit = Math.round(deltaPercent * leverage);

  const chartImages = [
    'https://images.unsplash.com/photo-1642543492481-44e81e3914a7?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1642790106117-e829e14a795f?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1622979135225-d2ba269bc1df?w=800&auto=format&fit=crop&q=80',
  ];
  const imageUrl = chartImages[Math.floor(Math.random() * chartImages.length)];

  if (channelTier === 'SUPER_VIP') {
    return {
      imageUrl,
      profit: realisticProfit,
      text: `👑 <b>tiksup SUPER VIP WHALE SIGNAL</b> 👑\n\n` +
        `💎 <b>Coin:</b> #${coinPair}\n` +
        `🚀 <b>Order:</b> ${direction}\n` +
        `⚡ <b>Leverage:</b> Cross ${leverage}x\n\n` +
        `🎯 <b>Entry Zone:</b> $${currentPrice.toLocaleString()}\n` +
        `🎯 <b>Target 1:</b> $${targetPrice.toLocaleString()} (+${deltaPercent.toFixed(1)}%)\n` +
        `🎯 <b>Target 2:</b> $${(isLong ? targetPrice * 1.015 : targetPrice * 0.985).toFixed(2)}\n` +
        `🛑 <b>Stop Loss:</b> $${stopLoss.toLocaleString()}\n\n` +
        `💰 <b>Expected PnL:</b> +${realisticProfit}% ROI\n` +
        `🔥 <i>Sniper Whale Setup • Manage risk accordingly</i>\n\n` +
        `🌐 <a href="https://tiksup.com">tiksup.com Exchange</a>`,
    };
  } else if (channelTier === 'VIP') {
    return {
      imageUrl,
      profit: realisticProfit,
      text: `⚡ <b>tiksup VIP INTRADAY SETUP</b> ⚡\n\n` +
        `💰 <b>Coin:</b> ${coinPair}\n` +
        `📊 <b>Direction:</b> ${direction}\n` +
        `⚡ <b>Leverage:</b> ${leverage}x\n\n` +
        `📍 <b>Entry:</b> $${currentPrice.toLocaleString()}\n` +
        `🎯 <b>Take Profit:</b> $${targetPrice.toLocaleString()} (+${realisticProfit}%)\n` +
        `🛑 <b>Stop Loss:</b> $${stopLoss.toLocaleString()}\n\n` +
        `✨ <i>High probability breakout scalp</i>\n` +
        `🌐 <a href="https://tiksup.com">tiksup.com Exchange</a>`,
    };
  } else if (channelTier === 'REGULAR') {
    return {
      imageUrl,
      profit: realisticProfit,
      text: `📊 <b>tiksup REGULAR SWING ALERT</b>\n\n` +
        `🔹 <b>Pair:</b> ${coinPair}\n` +
        `🔹 <b>Type:</b> ${direction}\n` +
        `🔹 <b>Price:</b> $${currentPrice.toLocaleString()}\n` +
        `🎯 <b>Target:</b> $${targetPrice.toLocaleString()}\n` +
        `📈 <b>Estimated Gain:</b> +${realisticProfit}%\n\n` +
        `👉 Upgrade to VIP for instant scalps: https://tiksup.com/telegram-channels`,
    };
  } else {
    return {
      imageUrl,
      profit: realisticProfit,
      text: `🎁 <b>tiksup FREE COMMUNITY SIGNAL</b> 🎁\n\n` +
        `🪙 <b>Coin:</b> ${coinPair}\n` +
        `📈 <b>Trend:</b> ${direction}\n` +
        `🎯 <b>Target:</b> $${targetPrice.toLocaleString()} (+${deltaPercent.toFixed(1)}%)\n\n` +
        `⚡ FREE members receive 30% of signals.\n` +
        `👉 Join VIP for 100% whale calls: https://tiksup.com/telegram-channels`,
    };
  }
}

/**
 * Scheduled Cloud Function running every hour (or at custom cron)
 * 24/7 background worker for Telegram signal dispatching.
 */
export const autoPostScheduler = functions.pubsub
  .schedule('0 * * * *') // Runs every hour
  .timeZone('Asia/Amman')
  .onRun(async (context) => {
    console.log('autoPostScheduler started at', new Date().toISOString());

    // 1. Get bot token & settings
    const botSettingsSnap = await db.collection('bot_settings').doc('telegram_bot').get();
    if (!botSettingsSnap.exists) {
      console.log('No bot_settings document found.');
      return null;
    }

    const botSettings = botSettingsSnap.data() as { token?: string; autoEnabled?: boolean };
    const token = (botSettings?.token || '').trim();
    if (!botSettings?.autoEnabled || !token) {
      console.log('Auto poster is disabled or token is missing.');
      return null;
    }

    // 2. Fetch live prices from Binance
    const livePrices = await fetchBinancePrices();
    const pairs = Object.keys(livePrices);

    // 3. Channels config (Free, Regular, VIP, Super VIP)
    const channelsSnap = await db.collection('telegramChannels').get();
    const channels = channelsSnap.docs.map((d) => ({ channelId: d.id, ...d.data() }));

    const todayStr = new Date().toISOString().split('T')[0];

    // Fetch today's logs to check posts per day
    const logsSnap = await db.collection('post_logs').get();
    const todayLogs = logsSnap.docs.map((d) => d.data());

    for (const channel of channels) {
      const chData = channel as any;
      const chId = chData.tgChatId || (channel.channelId === 'super_vip' ? '-1004441403389' : undefined);
      if (!chId) continue;

      // Tier check & probability
      // FREE: 30%, REGULAR: 60%, VIP: 90%, SUPER VIP: 100%
      const tierProbability: Record<string, number> = {
        free: 0.30,
        regular: 0.60,
        vip: 0.90,
        super_vip: 1.00,
      };

      const prob = tierProbability[channel.channelId] ?? 0.70;
      if (Math.random() > prob) {
        console.log(`Skipping channel ${channel.channelId} due to tier distribution (${prob * 100}%).`);
        continue;
      }

      // Check posts per day
      const maxPostsPerDay = chData.postsPerDay || 5;
      const postedTodayCount = todayLogs.filter(
        (l: any) => l.groupId === chId && l.timestamp && l.timestamp.startsWith(todayStr)
      ).length;

      if (postedTodayCount >= maxPostsPerDay) {
        console.log(`Channel ${channel.channelId} has reached daily limit (${postedTodayCount}/${maxPostsPerDay}).`);
        continue;
      }

      // Pick a random coin pair
      const randomPair = pairs[Math.floor(Math.random() * pairs.length)] || 'BTC/USDT';
      const curPrice = livePrices[randomPair] || 95400;

      const tierKey = channel.channelId.toUpperCase() as 'FREE' | 'REGULAR' | 'VIP' | 'SUPER_VIP';
      const signal = generateSignalContent(tierKey, randomPair, curPrice);

      try {
        const tgRes = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chId,
            photo: signal.imageUrl,
            caption: signal.text,
            parse_mode: 'HTML',
          }),
        });

        const tgData = await tgRes.json();
        const success = tgData.ok === true;

        await db.collection('post_logs').add({
          groupId: chId,
          groupName: chData.title || channel.channelId,
          tradeTitle: `${randomPair} ${tierKey} Signal`,
          timestamp: new Date().toISOString(),
          status: success ? 'SUCCESS' : 'ERROR',
          scheduledTime: 'CRON_AUTO',
          details: success ? `Delivered (Msg ID: ${tgData.result?.message_id})` : tgData.description,
        });

        console.log(`Posted to ${channel.channelId}:`, success);
      } catch (err: any) {
        console.error(`Error posting to ${channel.channelId}:`, err);
      }
    }

    return null;
  });
