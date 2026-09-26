import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

function autoPosterApiPlugin() {
  return {
    name: 'tiksup-autoposter-api',
    configureServer(server: any) {
      server.middlewares.use((req: any, res: any, next: any) => {
        if (req.url && (
          req.url.startsWith('/api/telegram/quickbot') || 
          req.url.startsWith('/api/quickbot') || 
          req.url.startsWith('/api/quick-bot') ||
          req.url.startsWith('/api/telegram-webhook') ||
          req.url.startsWith('/api/telegram/webhook')
        )) {
          let body = '';
          req.on('data', (chunk: any) => { body += chunk; });
          req.on('end', async () => {
            let parsed: any = {};
            try {
              if (body) parsed = JSON.parse(body);
            } catch {}

            // Extract message or coin from Telegram update payload or direct API call
            const tgText = parsed.message?.text || parsed.channel_post?.text;
            const rawCoin = tgText || parsed.coin || parsed.message || parsed.text || req.url.split('coin=')[1]?.split('&')[0] || 'BTC/USDT';
            
            // Clean coin ticker: default to BTC/USDT or extract ticker
            let cleanCoin = 'BTC/USDT';
            const decoded = decodeURIComponent(String(rawCoin)).trim();
            const pairMatch = decoded.match(/\b([A-Za-z0-9]{2,10})\s*(\/|-)?\s*(USDT|USD|BUSD)\b/i);
            if (pairMatch) {
              cleanCoin = `${pairMatch[1].toUpperCase()}/USDT`;
            } else {
              const known = ['BTC', 'ETH', 'SOL', 'XRP', 'DOGE', 'BNB', 'ADA', 'AVAX', 'SUI', 'PEPE', 'SHIB', 'NEAR', 'LINK', 'TRX', 'LTC', 'TON'];
              const words = decoded.toUpperCase().split(/[^A-Z0-9]/).filter(Boolean);
              const found = words.find((w: string) => known.includes(w));
              if (found) {
                cleanCoin = `${found}/USDT`;
              } else if (words.length === 1 && words[0].length >= 2 && words[0].length <= 8) {
                cleanCoin = `${words[0]}/USDT`;
              }
            }

            const targetChannelId = parsed.channelId || '-1004441403389';
            const signalText = `🔥🔥 BOOOOM! LFG! 🔥🔥\n⚡️ QUICK SCALP ALERT ⚡️\n\n💰 Coin: ${cleanCoin}\n🚀 Direction: LONG 📈\n\n💥 BUY NOW! BUY 20% OF YOUR BALANCE! 💥\n👉 DO IT! BUY! BUY! BUY! 👈\n\n⏰ Trade Time: 15 Seconds\n⚡️ Super Fast - Let's Go!\n\n💪 WE ARE WINNING! LET'S EAT! 💪\n🔥🔥🔥🔥🔥🔥🔥`;

            const botToken = parsed.token || process.env.TELEGRAM_BOT_TOKEN;
            let telegramDelivered = false;
            let telegramMsgId = null;

            if (botToken) {
              try {
                const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    chat_id: targetChannelId,
                    text: signalText,
                  }),
                });
                const tgData = await tgRes.json();
                if (tgData.ok) {
                  telegramDelivered = true;
                  telegramMsgId = tgData.result?.message_id;
                }

                // If sent from a user chat in Telegram, reply with "✅ Fired 🔥"
                if (parsed.message?.chat?.id && String(parsed.message.chat.id) !== targetChannelId) {
                  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      chat_id: parsed.message.chat.id,
                      text: '✅ Fired 🔥',
                      reply_to_message_id: parsed.message.message_id,
                    }),
                  }).catch(() => {});
                }
              } catch (e) {
                console.warn('Telegram API send error in dev middleware:', e);
              }
            }

            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
            res.end(JSON.stringify({
              success: true,
              reply: '✅ Fired 🔥',
              channelId: targetChannelId,
              coin: cleanCoin,
              signal: signalText,
              deliveredToTelegram: telegramDelivered,
              messageId: telegramMsgId,
              timestamp: new Date().toISOString()
            }));
          });
          return;
        }

        if (req.url && req.url.startsWith('/api/autoPoster')) {
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.end(JSON.stringify({
            success: true,
            endpoint: '/api/autoPoster',
            status: 'active',
            message: 'TikSup Telegram Auto Poster API runner endpoint ready. Processed in-app scheduler.',
            timestamp: new Date().toISOString()
          }));
          return;
        }
        next();
      });
    }
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), autoPosterApiPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
