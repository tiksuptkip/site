import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Bot,
  Send,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Plus,
  Trash2,
  Edit2,
  Upload,
  Image as ImageIcon,
  Clock,
  Search,
  FileSpreadsheet,
  Check,
  Play,
  Calendar,
  Layers,
  Sparkles,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  Info,
  Flame,
  Zap,
  Rocket,
  Terminal,
  Copy,
  Crown,
  Globe
} from 'lucide-react';
import {
  TelegramGroupConfig,
  TradeBankItem,
  PostLog,
  BotSettings,
  AutoPosterCategory,
  TradeSignalType
} from '../types';
import {
  subscribeBotSettings,
  saveBotSettings,
  testTelegramBotConnection,
  subscribeTelegramGroups,
  saveTelegramGroup,
  deleteTelegramGroup,
  toggleTelegramGroupActive,
  subscribeTradeBank,
  saveTradeBankItem,
  deleteTradeBankItem,
  bulkImportTradeBank,
  uploadTradeImage,
  subscribePostLogs,
  clearAllPostLogs,
  addPostLog,
  getAmmanTimeInfo,
  getUpcomingSchedule,
  executeAutoPosterCheck,
  ScheduledPostItem,
  initializeAutoPosterIfEmpty,
  generateQuickScalpSignalText,
  dispatchQuickBotSignal,
  startQuickBotPolling,
  QUICK_BOT_CHANNEL_ID,
  QUICK_BOT_CHANNEL_NAME,
  OTHER_CHANNEL_IDS
} from '../services/autoPosterService';

interface TelegramAutoPosterProps {
  lang: 'ar' | 'en';
  adminUsername: string;
}

export const TelegramAutoPoster: React.FC<TelegramAutoPosterProps> = ({ lang, adminUsername }) => {
  // ---------------------------------------------------------------------------
  // State: Core Collections & Settings
  // ---------------------------------------------------------------------------
  const [botSettings, setBotSettings] = useState<BotSettings>({ token: '', autoEnabled: false });
  const [groups, setGroups] = useState<TelegramGroupConfig[]>([]);
  const [trades, setTrades] = useState<TradeBankItem[]>([]);
  const [logs, setLogs] = useState<PostLog[]>([]);

  // Feedback & Loading indicators
  const [tokenInput, setTokenInput] = useState('');
  const [isSavingToken, setIsSavingToken] = useState(false);
  const [isTestingToken, setIsTestingToken] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [isRunningScan, setIsRunningScan] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Quick Bot State: -1004441403389 (TikSup Crypto Quick ⚡️)
  // ---------------------------------------------------------------------------
  const [quickInput, setQuickInput] = useState('');
  const [targetQuickChannel, setTargetQuickChannel] = useState<string>(QUICK_BOT_CHANNEL_ID);
  const [broadcastOtherChannels, setBroadcastOtherChannels] = useState<boolean>(false);
  const [isFiringQuickSignal, setIsFiringQuickSignal] = useState(false);
  const [quickFireResult, setQuickFireResult] = useState<{
    reply: string;
    details: string;
    signalText: string;
    timestamp: string;
  } | null>(null);
  const [copiedSignal, setCopiedSignal] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);

  // Live preview calculation
  const quickSignalPreview = useMemo(() => {
    return generateQuickScalpSignalText(quickInput);
  }, [quickInput]);

  const handleFireQuickSignal = async (coinOverride?: string) => {
    const inputToUse = coinOverride !== undefined ? coinOverride : quickInput;
    setIsFiringQuickSignal(true);
    setQuickFireResult(null);

    try {
      // 1. Post to channel -1004441403389 (and broadcast if checked)
      const primaryRes = await dispatchQuickBotSignal({
        inputMessage: inputToUse,
        targetChannelId: targetQuickChannel,
        broadcastToAllChannels: broadcastOtherChannels,
      });

      setQuickFireResult({
        reply: primaryRes.reply, // '✅ Fired 🔥'
        details: primaryRes.message,
        signalText: primaryRes.text,
        timestamp: new Date().toLocaleTimeString(),
      });
      setQuickInput('');
    } catch (err: any) {
      setQuickFireResult({
        reply: '❌ Failed',
        details: err.message || 'Execution error',
        signalText: generateQuickScalpSignalText(inputToUse),
        timestamp: new Date().toLocaleTimeString(),
      });
    } finally {
      setIsFiringQuickSignal(false);
    }
  };

  const handleCopyPreview = () => {
    navigator.clipboard.writeText(quickSignalPreview);
    setCopiedSignal(true);
    setTimeout(() => setCopiedSignal(false), 2000);
  };

  const handleCopyCurl = () => {
    const cmd = `curl -X POST "${window.location.origin}/api/telegram/quickbot" -H "Content-Type: application/json" -d '{"message":"BTC"}'`;
    navigator.clipboard.writeText(cmd);
    setCopiedCurl(true);
    setTimeout(() => setCopiedCurl(false), 2000);
  };

  // ---------------------------------------------------------------------------
  // Auto Pilot - 4 Channels Control State & Risk Engine Integration
  // ---------------------------------------------------------------------------
  type AutoPilotChannelName = 'FREE' | 'REGULAR' | 'VIP' | 'SUPER VIP';

  const AUTOPILOT_CHANNELS_DEF: {
    name: AutoPilotChannelName;
    defaultId: string;
    badgeColor: string;
    badgeBorder: string;
    badgeText: string;
    icon: React.ReactNode;
  }[] = [
    {
      name: 'FREE',
      defaultId: '-1004496261634',
      badgeColor: 'bg-sky-500/15',
      badgeBorder: 'border-sky-500/30',
      badgeText: 'text-sky-400',
      icon: <Globe className="w-3.5 h-3.5" />,
    },
    {
      name: 'REGULAR',
      defaultId: '-1004429643399',
      badgeColor: 'bg-indigo-500/15',
      badgeBorder: 'border-indigo-500/30',
      badgeText: 'text-indigo-400',
      icon: <Layers className="w-3.5 h-3.5" />,
    },
    {
      name: 'VIP',
      defaultId: '-1004348907709',
      badgeColor: 'bg-[#0ECB81]/15',
      badgeBorder: 'border-[#0ECB81]/30',
      badgeText: 'text-[#0ECB81]',
      icon: <Zap className="w-3.5 h-3.5" />,
    },
    {
      name: 'SUPER VIP',
      defaultId: '-1004441403389',
      badgeColor: 'bg-yellow-500/15',
      badgeBorder: 'border-yellow-500/30',
      badgeText: 'text-yellow-400',
      icon: <Crown className="w-3.5 h-3.5" />,
    },
  ];

  interface AutoPilotChannelState {
    id: string;
    count: string;
    mode: 'MANUAL' | 'AUTO';
    status: 'ON' | 'OFF';
  }

  const [autoPilotChannels, setAutoPilotChannels] = useState<Record<AutoPilotChannelName, AutoPilotChannelState>>(() => {
    const list: AutoPilotChannelName[] = ['FREE', 'REGULAR', 'VIP', 'SUPER VIP'];
    const initial: Partial<Record<AutoPilotChannelName, AutoPilotChannelState>> = {};

    const defaultIds: Record<AutoPilotChannelName, string> = {
      'FREE': '-1004496261634',
      'REGULAR': '-1004429643399',
      'VIP': '-1004348907709',
      'SUPER VIP': '-1004441403389',
    };

    list.forEach((ch) => {
      const savedId =
        localStorage.getItem(`tiksup_autopilot_${ch}_id`) ||
        localStorage.getItem(`tiksup_autopilot_${ch.replace(/\s+/g, '_')}_id`) ||
        defaultIds[ch];

      const savedCount =
        localStorage.getItem(`tiksup_autopilot_${ch}_count`) ||
        localStorage.getItem(`tiksup_autopilot_${ch.replace(/\s+/g, '_')}_count`) ||
        '';

      const savedMode = (
        localStorage.getItem(`tiksup_autopilot_${ch}_mode`) ||
        localStorage.getItem(`tiksup_autopilot_${ch.replace(/\s+/g, '_')}_mode`) ||
        'MANUAL'
      ) as 'MANUAL' | 'AUTO';

      const savedStatus = (
        localStorage.getItem(`tiksup_autopilot_${ch}_status`) ||
        localStorage.getItem(`tiksup_autopilot_${ch.replace(/\s+/g, '_')}_status`) ||
        'ON'
      ) as 'ON' | 'OFF';

      initial[ch] = {
        id: savedId,
        count: savedCount,
        mode: savedMode === 'AUTO' ? 'AUTO' : 'MANUAL',
        status: savedStatus === 'OFF' ? 'OFF' : 'ON',
      };
    });

    return initial as Record<AutoPilotChannelName, AutoPilotChannelState>;
  });

  // Track active Casino Risk & Payout rate for display
  const [currentPayoutRate, setCurrentPayoutRate] = useState<number>(() => {
    return parseInt(localStorage.getItem('tiksup_payout_rate') || '75', 10);
  });
  const [currentRiskMode, setCurrentRiskMode] = useState<string>(() => {
    return localStorage.getItem('tiksup_risk_mode') || 'random';
  });

  useEffect(() => {
    const syncRiskSettings = () => {
      const pr = parseInt(localStorage.getItem('tiksup_payout_rate') || '75', 10);
      const rm = localStorage.getItem('tiksup_risk_mode') || 'random';
      setCurrentPayoutRate(pr);
      setCurrentRiskMode(rm);
    };
    syncRiskSettings();
    const interval = setInterval(syncRiskSettings, 2000);
    window.addEventListener('storage', syncRiskSettings);
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', syncRiskSettings);
    };
  }, []);

  const [generatingChannel, setGeneratingChannel] = useState<AutoPilotChannelName | null>(null);
  const [autoPilotResult, setAutoPilotResult] = useState<{
    channelName: AutoPilotChannelName;
    channelId: string;
    signalText: string;
    isWin: boolean;
    pnl: number;
    payoutRate: number;
    riskMode: string;
    delivered: boolean;
    timestamp: string;
    details: string;
  } | null>(null);
  const [copiedAutoPilot, setCopiedAutoPilot] = useState(false);
  const [autoPilotNotice, setAutoPilotNotice] = useState<string | null>(null);

  /**
   * Updated Dynamic Signal Generation Function:
   * Implement generateRandomSignal(channelName) taking into account the casino risk/payout settings
   */
  function generateRandomSignal(channelName: string) {
    const coins = ["BTC", "ETH", "SOL", "PEPE", "WIF", "BONK", "FLOKI", "DOGE"];
    const coin = coins[Math.floor(Math.random() * coins.length)];
    const type = channelName;

    // Retrieve current TikSup risk & payout engine settings
    const payoutRate = parseInt(localStorage.getItem('tiksup_payout_rate') || '75', 10);
    const riskMode = localStorage.getItem('tiksup_risk_mode') || 'random';

    // Determine outcome based on Risk Mode & Payout Rate
    let isWin = true;
    if (riskMode === 'force_lose') {
      isWin = false;
    } else if (riskMode === 'force_win') {
      isWin = true;
    } else if (riskMode === 'loss_75') {
      isWin = Math.random() >= 0.75;
    } else {
      // Random / dynamic payout check
      isWin = Math.random() * 100 <= payoutRate;
    }

    let pnl: number;
    let templates: string[];

    if (isWin) {
      // Win scale dynamically bound to Payout Rate
      const minPnl = Math.max(15, Math.floor(payoutRate * 0.4));
      const maxPnl = Math.min(120, Math.floor(payoutRate * 1.2));
      pnl = Math.floor(Math.random() * (maxPnl - minPnl + 1)) + minPnl;

      templates = [
        `🚀 <b>${type} SIGNAL</b>\n${coin} LONG\nEntry: ${(60000 + Math.random() * 10000).toFixed(0)}\nTarget: ${(65000 + Math.random() * 10000).toFixed(0)}\nPnL: +${pnl}% 🔥`,
        `✅ <b>CLOSED PROFIT</b> ${coin} +${pnl}%\nProof attached - ${type} members only`,
        `📊 <b>MARKET UPDATE</b> | ${coin} pumping +${(Math.random() * 10).toFixed(1)}%\nNext target soon - Stay in ${type}`,
        `💎 <b>${type} SCALP</b>\n${coin} LONG setup secured\nWin rate ${payoutRate}% - Target Hit!`
      ];
    } else {
      // Loss outcome
      pnl = Math.floor(Math.random() * 20) + 10; // -10% to -30%
      templates = [
        `⚠️ <b>${type} STOP LOSS HIT</b>\n${coin} Position closed at -${pnl}%\nRisk management applied. Re-entry update shortly.`,
        `📉 <b>MARKET CORRECTION</b>\n${coin} Scalp invalidated (-${pnl}%). Awaiting clearer market setup for ${type}.`,
        `⚡️ <b>${type} RISK UPDATE</b>\nVolatile dump on ${coin}. Closed early (-${pnl}%). Next signal in queue.`
      ];
    }

    return templates[Math.floor(Math.random() * templates.length)];
  }

  const handleUpdateChannelId = (ch: AutoPilotChannelName, val: string) => {
    setAutoPilotChannels((prev) => {
      const updated = { ...prev, [ch]: { ...prev[ch], id: val } };
      localStorage.setItem(`tiksup_autopilot_${ch}_id`, val);
      if (ch.includes(' ')) {
        localStorage.setItem(`tiksup_autopilot_${ch.replace(/\s+/g, '_')}_id`, val);
      }
      return updated;
    });
  };

  const handleUpdateChannelCount = (ch: AutoPilotChannelName, val: string) => {
    setAutoPilotChannels((prev) => {
      const updated = { ...prev, [ch]: { ...prev[ch], count: val } };
      localStorage.setItem(`tiksup_autopilot_${ch}_count`, val);
      if (ch.includes(' ')) {
        localStorage.setItem(`tiksup_autopilot_${ch.replace(/\s+/g, '_')}_count`, val);
      }
      return updated;
    });
  };

  const handleToggleMode = (ch: AutoPilotChannelName) => {
    setAutoPilotChannels((prev) => {
      const current = prev[ch].mode;
      const nextMode: 'MANUAL' | 'AUTO' = current === 'MANUAL' ? 'AUTO' : 'MANUAL';
      const updated = { ...prev, [ch]: { ...prev[ch], mode: nextMode } };
      localStorage.setItem(`tiksup_autopilot_${ch}_mode`, nextMode);
      if (ch.includes(' ')) {
        localStorage.setItem(`tiksup_autopilot_${ch.replace(/\s+/g, '_')}_mode`, nextMode);
      }
      return updated;
    });
  };

  const handleToggleStatus = (ch: AutoPilotChannelName) => {
    setAutoPilotChannels((prev) => {
      const current = prev[ch].status;
      const nextStatus: 'ON' | 'OFF' = current === 'ON' ? 'OFF' : 'ON';
      const updated = { ...prev, [ch]: { ...prev[ch], status: nextStatus } };
      localStorage.setItem(`tiksup_autopilot_${ch}_status`, nextStatus);
      if (ch.includes(' ')) {
        localStorage.setItem(`tiksup_autopilot_${ch.replace(/\s+/g, '_')}_status`, nextStatus);
      }
      return updated;
    });
  };

  const handleGenerateNow = async (channelName: AutoPilotChannelName) => {
    setAutoPilotNotice(null);
    const config = autoPilotChannels[channelName];

    // Status check: If OFF, do not post to this channel.
    if (config.status === 'OFF') {
      setAutoPilotNotice(
        lang === 'ar'
          ? `حالة القناة [${channelName}] مغلقة (OFF). لا يمكن توليد أو إرسال الإشارات أثناء إيقاف القناة.`
          : `Channel [${channelName}] is set to OFF. Turn status to ON to generate and post signals.`
      );
      return;
    }

    setGeneratingChannel(channelName);
    setAutoPilotResult(null);

    try {
      const payoutRate = parseInt(localStorage.getItem('tiksup_payout_rate') || '75', 10);
      const riskMode = localStorage.getItem('tiksup_risk_mode') || 'random';
      const defaultMap: Record<AutoPilotChannelName, string> = {
        'FREE': '-1004496261634',
        'REGULAR': '-1004429643399',
        'VIP': '-1004348907709',
        'SUPER VIP': '-1004441403389',
      };
      const targetId = config.id.trim() || defaultMap[channelName] || '-1004441403389';

      // 1. Generate signal text adhering to TikSup Casino & Payout settings
      const signalText = generateRandomSignal(channelName);

      // Determine outcome type for UI badge
      const isLoss =
        signalText.includes('STOP LOSS') ||
        signalText.includes('MARKET CORRECTION') ||
        signalText.includes('RISK UPDATE');
      const isWin = !isLoss;
      const pnlMatch = signalText.match(/([+-]?\d+)%/);
      const extractedPnl = pnlMatch ? Math.abs(parseInt(pnlMatch[1], 10)) : (isWin ? 50 : 20);

      // 2. Dispatch to Telegram if bot token is provided
      let delivered = false;
      let details = '';
      const botToken = botSettings.token?.trim() || tokenInput.trim();

      if (botToken) {
        try {
          const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: targetId,
              text: signalText,
              parse_mode: 'HTML',
            }),
          });
          const tgData = await tgRes.json();
          if (tgData.ok) {
            delivered = true;
            details = lang === 'ar' ? `تم الإرسال بنجاح إلى القناة (${targetId})` : `Delivered to Telegram (${targetId})`;
          } else {
            details = `Telegram API returned: ${tgData.description || 'Unknown error'}`;
          }
        } catch (fetchErr: any) {
          details = `Send error: ${fetchErr.message || 'Network issue'}`;
        }
      } else {
        details = lang === 'ar'
          ? 'تم توليد الإشارة بنجاح. (توكن البوت غير مضاف - تم التوليد بوضع المعاينة)'
          : 'Signal generated successfully. (Bot token not configured above - generated in preview mode)';
      }

      // 3. Log to Post Logs in Firestore
      try {
        await addPostLog({
          groupId: targetId,
          groupName: `Auto Pilot - ${channelName}`,
          tradeId: `autopilot-${channelName.toLowerCase().replace(/\s+/g, '-')}`,
          tradeTitle: `${channelName} Scalp Signal`,
          timestamp: new Date().toISOString(),
          status: delivered ? 'SENT' : (botToken ? 'FAILED' : 'TOKEN_MISSING_SKIPPED'),
          scheduledTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          details: delivered ? `Dispatched to ${targetId}` : details,
        });
      } catch (logErr) {
        console.warn('Logging notice:', logErr);
      }

      setAutoPilotResult({
        channelName,
        channelId: targetId,
        signalText,
        isWin,
        pnl: extractedPnl,
        payoutRate,
        riskMode,
        delivered,
        timestamp: new Date().toLocaleTimeString(),
        details,
      });
    } catch (err: any) {
      setAutoPilotNotice(`Error generating signal: ${err.message || 'Execution error'}`);
    } finally {
      setGeneratingChannel(null);
    }
  };

  const handleCopyAutoPilotResult = () => {
    if (!autoPilotResult) return;
    navigator.clipboard.writeText(autoPilotResult.signalText);
    setCopiedAutoPilot(true);
    setTimeout(() => setCopiedAutoPilot(false), 2000);
  };

  // Automated background posting loop for Auto Pilot channels in AUTO mode
  useEffect(() => {
    const checkAutoPilotPosting = async () => {
      const botToken = botSettings.token?.trim() || tokenInput.trim();
      if (!botToken) return;

      const channels: AutoPilotChannelName[] = ['FREE', 'REGULAR', 'VIP', 'SUPER VIP'];
      const defaultMap: Record<AutoPilotChannelName, string> = {
        'FREE': '-1004496261634',
        'REGULAR': '-1004429643399',
        'VIP': '-1004348907709',
        'SUPER VIP': '-1004441403389',
      };

      for (const ch of channels) {
        const status =
          localStorage.getItem(`tiksup_autopilot_${ch}_status`) ||
          localStorage.getItem(`tiksup_autopilot_${ch.replace(/\s+/g, '_')}_status`) ||
          'ON';
        const mode =
          localStorage.getItem(`tiksup_autopilot_${ch}_mode`) ||
          localStorage.getItem(`tiksup_autopilot_${ch.replace(/\s+/g, '_')}_mode`) ||
          'MANUAL';

        if (status !== 'ON' || mode !== 'AUTO') continue;

        const countStr =
          localStorage.getItem(`tiksup_autopilot_${ch}_count`) ||
          localStorage.getItem(`tiksup_autopilot_${ch.replace(/\s+/g, '_')}_count`) ||
          '5';
        const postsPerDay = Math.max(1, Math.min(50, parseInt(countStr, 10) || 5));
        const intervalMinutes = Math.floor(1440 / postsPerDay);

        const lastPostKey = `tiksup_autopilot_${ch}_last_auto_time`;
        const lastPostTime = parseInt(localStorage.getItem(lastPostKey) || '0', 10);
        const now = Date.now();

        if (now - lastPostTime >= intervalMinutes * 60 * 1000) {
          try {
            const targetId =
              localStorage.getItem(`tiksup_autopilot_${ch}_id`) ||
              localStorage.getItem(`tiksup_autopilot_${ch.replace(/\s+/g, '_')}_id`) ||
              defaultMap[ch];

            const signalText = generateRandomSignal(ch);
            const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: targetId,
                text: signalText,
                parse_mode: 'HTML',
              }),
            });
            const tgData = await tgRes.json();
            localStorage.setItem(lastPostKey, String(now));

            addPostLog({
              groupId: targetId,
              groupName: `Auto Pilot (${ch})`,
              tradeId: `autopilot-${ch.toLowerCase().replace(/\s+/g, '-')}`,
              tradeTitle: `${ch} Auto Scalp Signal`,
              timestamp: new Date().toISOString(),
              status: tgData.ok ? 'SENT' : 'FAILED',
              scheduledTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              details: tgData.ok ? `Automated dispatch to ${targetId}` : `Telegram error: ${tgData.description || 'Failed'}`,
            }).catch(console.warn);
          } catch (autoErr) {
            console.warn('Auto Pilot background dispatch notice:', autoErr);
          }
        }
      }
    };

    const autoPilotInterval = setInterval(checkAutoPilotPosting, 60000);
    return () => clearInterval(autoPilotInterval);
  }, [botSettings.token, tokenInput]);

  // Time ticker for Amman time & countdowns (updates every second)
  const [ammanTime, setAmmanTime] = useState(getAmmanTimeInfo());
  useEffect(() => {
    const timer = setInterval(() => {
      setAmmanTime(getAmmanTimeInfo());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Initialize seed data & subscriptions
  useEffect(() => {
    initializeAutoPosterIfEmpty().catch(console.warn);

    const unsubSettings = subscribeBotSettings((s) => {
      setBotSettings(s);
      setTokenInput(s.token || '');
    });
    const unsubGroups = subscribeTelegramGroups((g) => setGroups(g));
    const unsubTrades = subscribeTradeBank((t) => setTrades(t));
    const unsubLogs = subscribePostLogs((l) => setLogs(l), 50);

    return () => {
      unsubSettings();
      unsubGroups();
      unsubTrades();
      unsubLogs();
    };
  }, []);

  // ---------------------------------------------------------------------------
  // Background Auto Poster Loop (Client-side fail-safe trigger every 60 seconds)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!botSettings.autoEnabled) return;

    // Run immediate check then interval
    executeAutoPosterCheck().catch(console.warn);

    const interval = setInterval(() => {
      executeAutoPosterCheck().catch(console.warn);
    }, 60000); // 1 minute ticker

    return () => clearInterval(interval);
  }, [botSettings.autoEnabled, botSettings.token]);

  // ---------------------------------------------------------------------------
  // Top: Bot Token & Connection Controls
  // ---------------------------------------------------------------------------
  const handleSaveToken = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSavingToken(true);
    setTestResult(null);
    try {
      await saveBotSettings({ token: tokenInput.trim() }, adminUsername);
      setTestResult({ ok: true, message: lang === 'ar' ? 'تم حفظ التوكن بنجاح' : 'Bot token saved successfully' });
      setTimeout(() => setTestResult(null), 4000);
    } catch (err: any) {
      setTestResult({ ok: false, message: err.message || 'Error saving token' });
    } finally {
      setIsSavingToken(false);
    }
  };

  const handleTestConnection = async () => {
    setIsTestingToken(true);
    setTestResult(null);
    try {
      const res = await testTelegramBotConnection(tokenInput);
      setTestResult(res);
    } catch (err: any) {
      setTestResult({ ok: false, message: err.message || 'Test connection failed' });
    } finally {
      setIsTestingToken(false);
    }
  };

  const handleToggleAutoMaster = async () => {
    const nextState = !botSettings.autoEnabled;
    try {
      await saveBotSettings({ autoEnabled: nextState }, adminUsername);
    } catch (err: any) {
      alert('Error updating automation switch: ' + err.message);
    }
  };

  const handleManualRunScan = async () => {
    setIsRunningScan(true);
    setScanResult(null);
    try {
      const res = await executeAutoPosterCheck();
      setScanResult(
        lang === 'ar'
          ? `تم الفحص: تم فحص ${res.checkedGroups} مجموعة، تم إرسال ${res.postedCount}، تم تخطي ${res.skippedCount}`
          : `Scan executed: ${res.checkedGroups} active groups evaluated, ${res.postedCount} sent, ${res.skippedCount} skipped.`
      );
      setTimeout(() => setScanResult(null), 6000);
    } catch (err: any) {
      setScanResult('Scan Error: ' + err.message);
    } finally {
      setIsRunningScan(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Groups Manager: Form State & Handlers
  // ---------------------------------------------------------------------------
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [groupNameInput, setGroupNameInput] = useState('');
  const [groupIdInput, setGroupIdInput] = useState('');
  const [tradeTypeInput, setTradeTypeInput] = useState<AutoPosterCategory>('Crypto');
  const [dailyCountInput, setDailyCountInput] = useState<number>(2);
  const [postTimesInput, setPostTimesInput] = useState<string[]>(['10:00', '16:00']);
  const [groupActiveInput, setGroupActiveInput] = useState<boolean>(true);
  const [groupFormError, setGroupFormError] = useState('');

  // Synchronize postTimes array when dailyCount changes
  const handleDailyCountChange = (count: number) => {
    const clamped = Math.max(1, Math.min(10, count));
    setDailyCountInput(clamped);

    // Resize postTimes array
    const updated = [...postTimesInput];
    if (clamped > updated.length) {
      // Add sensible defaults spaced throughout the day
      const defaults = ['09:00', '12:00', '15:00', '18:00', '21:00', '08:00', '11:00', '14:00', '17:00', '20:00'];
      while (updated.length < clamped) {
        updated.push(defaults[updated.length % defaults.length]);
      }
    } else if (clamped < updated.length) {
      updated.splice(clamped);
    }
    setPostTimesInput(updated);
  };

  const handlePostTimeChange = (index: number, value: string) => {
    const updated = [...postTimesInput];
    updated[index] = value;
    setPostTimesInput(updated);
  };

  const handleSaveGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setGroupFormError('');

    const name = groupNameInput.trim();
    const gId = groupIdInput.trim();

    if (!name) {
      setGroupFormError(lang === 'ar' ? 'يرجى إدخال اسم المجموعة' : 'Group Name is required');
      return;
    }
    if (!gId) {
      setGroupFormError(lang === 'ar' ? 'يرجى إدخال معرّف المجموعة (مثال: -100xxxx)' : 'Group ID is required (e.g. -100xxxx)');
      return;
    }

    try {
      await saveTelegramGroup({
        id: editingGroupId || undefined,
        groupName: name,
        groupId: gId,
        tradeType: tradeTypeInput,
        dailyCount: dailyCountInput,
        postTimes: postTimesInput.slice(0, dailyCountInput),
        active: groupActiveInput,
      });

      // Reset form
      setEditingGroupId(null);
      setGroupNameInput('');
      setGroupIdInput('');
      setTradeTypeInput('Crypto');
      setDailyCountInput(2);
      setPostTimesInput(['10:00', '16:00']);
      setGroupActiveInput(true);
    } catch (err: any) {
      setGroupFormError(err.message || 'Error saving group');
    }
  };

  const handleEditGroupClick = (group: TelegramGroupConfig) => {
    setEditingGroupId(group.id || null);
    setGroupNameInput(group.groupName);
    setGroupIdInput(group.groupId);
    setTradeTypeInput(group.tradeType);
    setDailyCountInput(group.dailyCount);
    setPostTimesInput(group.postTimes || ['10:00', '16:00']);
    setGroupActiveInput(group.active);
    window.scrollTo({ top: 350, behavior: 'smooth' });
  };

  const handleCancelGroupEdit = () => {
    setEditingGroupId(null);
    setGroupNameInput('');
    setGroupIdInput('');
    setTradeTypeInput('Crypto');
    setDailyCountInput(2);
    setPostTimesInput(['10:00', '16:00']);
    setGroupActiveInput(true);
  };

  const handleDeleteGroup = async (id?: string) => {
    if (!id) return;
    if (confirm(lang === 'ar' ? 'هل أنت متأكد من حذف هذه المجموعة؟' : 'Are you sure you want to delete this group?')) {
      await deleteTelegramGroup(id);
    }
  };

  // ---------------------------------------------------------------------------
  // Trade Bank: Form State & Handlers
  // ---------------------------------------------------------------------------
  const [tradeTitle, setTradeTitle] = useState('');
  const [tradeType, setTradeType] = useState<TradeSignalType>('LONG');
  const [tradeEntry, setTradeEntry] = useState('');
  const [tradeTarget, setTradeTarget] = useState('');
  const [tradeProfit, setTradeProfit] = useState('');
  const [tradeCategory, setTradeCategory] = useState<AutoPosterCategory>('Crypto');
  const [tradeImageUrl, setTradeImageUrl] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [tradeSearch, setTradeSearch] = useState('');
  const [tradeCategoryFilter, setTradeCategoryFilter] = useState<string>('ALL');
  const [tradeFormError, setTradeFormError] = useState('');
  const [tradeFormSuccess, setTradeFormSuccess] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Bulk CSV Import Modal / Area
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [csvImportResult, setCsvImportResult] = useState<{ added: number; errors: string[] } | null>(null);

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingImage(true);
    try {
      const downloadUrl = await uploadTradeImage(file);
      setTradeImageUrl(downloadUrl);
    } catch (err: any) {
      alert('Image upload error: ' + err.message);
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleAddTrade = async (e: React.FormEvent) => {
    e.preventDefault();
    setTradeFormError('');
    setTradeFormSuccess('');

    const title = tradeTitle.trim();
    const entry = parseFloat(tradeEntry);
    const target = parseFloat(tradeTarget);
    const profit = parseFloat(tradeProfit);

    if (!title) {
      setTradeFormError(lang === 'ar' ? 'يرجى إدخال عنوان الصفقة' : 'Title is required');
      return;
    }
    if (isNaN(entry) || entry <= 0) {
      setTradeFormError(lang === 'ar' ? 'سعر الدخول غير صالح' : 'Invalid Entry Price');
      return;
    }
    if (isNaN(target) || target <= 0) {
      setTradeFormError(lang === 'ar' ? 'سعر الهدف غير صالح' : 'Invalid Target Price');
      return;
    }
    if (isNaN(profit) || profit <= 0) {
      setTradeFormError(lang === 'ar' ? 'نسبة الربح غير صالحة' : 'Invalid Profit %');
      return;
    }

    try {
      await saveTradeBankItem({
        title,
        type: tradeType,
        entry,
        target,
        profit,
        category: tradeCategory,
        imageUrl: tradeImageUrl.trim() || undefined,
      });

      setTradeFormSuccess(lang === 'ar' ? 'تمت إضافة الصفقة إلى بنك الصفقات' : 'Trade added to Trade Bank');
      setTimeout(() => setTradeFormSuccess(''), 3000);

      // Reset
      setTradeTitle('');
      setTradeEntry('');
      setTradeTarget('');
      setTradeProfit('');
      setTradeImageUrl('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      setTradeFormError(err.message || 'Error saving trade');
    }
  };

  const handleDeleteTrade = async (id?: string) => {
    if (!id) return;
    if (confirm(lang === 'ar' ? 'حذف هذه الصفقة من البنك؟' : 'Delete this trade from bank?')) {
      await deleteTradeBankItem(id);
    }
  };

  const handleExecuteCsvImport = async () => {
    if (!csvText.trim()) return;
    const res = await bulkImportTradeBank(csvText);
    setCsvImportResult(res);
    if (res.added > 0) {
      setTimeout(() => {
        setIsCsvModalOpen(false);
        setCsvText('');
        setCsvImportResult(null);
      }, 2500);
    }
  };

  // Filtered trades for table
  const filteredTrades = useMemo(() => {
    return trades.filter((t) => {
      const matchSearch =
        t.title.toLowerCase().includes(tradeSearch.toLowerCase()) ||
        t.category.toLowerCase().includes(tradeSearch.toLowerCase());
      const matchCat = tradeCategoryFilter === 'ALL' || t.category === tradeCategoryFilter;
      return matchSearch && matchCat;
    });
  }, [trades, tradeSearch, tradeCategoryFilter]);

  // ---------------------------------------------------------------------------
  // Next Scheduled Posts Calculation
  // ---------------------------------------------------------------------------
  const upcomingSchedules = useMemo(() => {
    return getUpcomingSchedule(groups);
  }, [groups, ammanTime.currentMinutes]);

  // Helper: format countdown string (HH:MM:SS)
  const formatCountdown = (target: Date) => {
    const diffMs = target.getTime() - Date.now();
    if (diffMs <= 0) return 'Posting now / In window';
    const totalSec = Math.floor(diffMs / 1000);
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6 text-xs text-[#eaecef]">
      {/* ===================================================================== */}
      {/* 1. TOP: BOT TOKEN & CONNECTION BAR                                   */}
      {/* ===================================================================== */}
      <div className="bg-[#181a20] border border-[#2b313a] rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#2b313a]">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-sky-500/20">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white">
                  {lang === 'ar' ? 'نظام النشر التلقائي لتيليجرام' : 'Telegram Auto Poster System'}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-sky-500/15 text-sky-400 border border-sky-500/30">
                  Ready for Bot Token
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                {lang === 'ar'
                  ? 'جدولة وإرسال توصيات وصفقات التداول آلياً لمجموعات وقنوات تيليجرام في أوقات محددة يومياً (توقيت عمّان).'
                  : 'Automatically schedule and dispatch trade signal cards to Telegram groups at precise daily times (Asia/Amman).'}
              </p>
            </div>
          </div>

          {/* Amman Time Clock Indicator */}
          <div className="flex items-center gap-3 px-4 py-2.5 bg-[#121418] border border-[#2b313a] rounded-2xl">
            <Clock className="w-4 h-4 text-yellow-400 animate-pulse" />
            <div>
              <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                {lang === 'ar' ? 'توقيت عمّان الحالي' : 'Asia/Amman Time'}
              </div>
              <div className="font-mono text-sm font-black text-white">
                {ammanTime.timeStr} <span className="text-[11px] text-yellow-400 font-normal">({ammanTime.dateStr})</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bot Token Form */}
        <form onSubmit={handleSaveToken} className="space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <label className="text-xs font-bold text-gray-300 flex items-center gap-2">
              <span>{lang === 'ar' ? 'رمز بوت تيليجرام (Bot Token):' : 'Telegram Bot API Token:'}</span>
              {botSettings.token ? (
                <span className="px-2 py-0.5 rounded bg-[#0ECB81]/15 text-[#0ECB81] text-[10px] font-bold border border-[#0ECB81]/30 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Connected
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded bg-yellow-500/15 text-yellow-400 text-[10px] font-bold border border-yellow-500/30 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Not Set
                </span>
              )}
            </label>

            <span className="text-[11px] text-gray-400">
              {lang === 'ar'
                ? 'الحصول على التوكن من @BotFather ثم تعيين البوت كأدمن في المجموعات المستهدفة.'
                : 'Get token from @BotFather and grant admin privileges in your target Telegram groups.'}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <div className="relative flex-1">
              <input
                type="text"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="Put token after deploy (e.g. 7123456789:AAHk...)"
                className="w-full bg-[#121418] border border-[#2b313a] rounded-xl px-4 py-2.5 text-xs text-white placeholder-gray-500 font-mono focus:border-sky-400 focus:outline-none transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={isSavingToken}
              className="px-5 py-2.5 bg-sky-500 hover:bg-sky-400 text-white font-black rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-1.5"
            >
              {isSavingToken ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
              <span>{lang === 'ar' ? 'حفظ التوكن' : 'Save Token'}</span>
            </button>

            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTestingToken || !tokenInput.trim()}
              className="px-4 py-2.5 bg-[#2b313a] hover:bg-[#38404c] text-white font-bold rounded-xl text-xs transition-all border border-[#3b434e] flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {isTestingToken ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5 text-sky-400" />
              )}
              <span>{lang === 'ar' ? 'اختبار الاتصال' : 'Test Connection'}</span>
            </button>
          </div>

          {/* Test connection alert message */}
          {testResult && (
            <div
              className={`p-3 rounded-xl border flex items-center gap-2 text-xs animate-fadeIn ${
                testResult.ok
                  ? 'bg-[#0ECB81]/15 border-[#0ECB81]/40 text-[#0ECB81]'
                  : 'bg-red-500/15 border-red-500/40 text-red-400'
              }`}
            >
              {testResult.ok ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 shrink-0" />
              )}
              <span className="font-semibold">{testResult.message}</span>
            </div>
          )}
        </form>
      </div>

      {/* ===================================================================== */}
      {/* NEW SECTION: AUTO PILOT - 4 CHANNELS CONTROL                         */}
      {/* ===================================================================== */}
      <div className="bg-[#181a20] border-2 border-indigo-500/30 rounded-3xl p-6 shadow-2xl space-y-5 relative overflow-hidden">
        {/* Ambient background glow */}
        <div className="absolute -top-20 -right-20 w-56 h-56 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-56 h-56 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Section Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#2b313a] relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 via-sky-500 to-emerald-400 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-black text-white tracking-wide">
                  Auto Pilot - 4 Channels Control
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                  4 Channels Engine
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#0ECB81]/15 text-[#0ECB81] border border-[#0ECB81]/30">
                  Casino Risk Engine Connected
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                {lang === 'ar'
                  ? 'التحكم المباشر والمستقل في 4 قنوات تداول مع ربط صانع الإشارات آلياً بمحرك المخاطر ونسبة الـ RTP المحددة بالكازينو.'
                  : 'Independent per-channel autopilot controls directly synchronized with TikSup Casino Risk & Payout rate settings.'}
              </p>
            </div>
          </div>

          {/* Real-time Casino & Payout Settings Indicator */}
          <div className="flex flex-wrap items-center gap-2.5 bg-[#121418] border border-[#2b313a] px-3.5 py-2 rounded-2xl shrink-0">
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-gray-400 font-bold">Casino Payout Rate:</span>
              <span className="font-mono font-black text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded border border-yellow-400/25">
                {currentPayoutRate}%
              </span>
            </div>
            <div className="w-[1px] h-4 bg-[#2b313a] hidden sm:block" />
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-gray-400 font-bold">Risk Mode:</span>
              <span
                className={`font-mono font-black px-2 py-0.5 rounded text-[11px] border ${
                  currentRiskMode === 'force_win'
                    ? 'bg-[#0ECB81]/15 text-[#0ECB81] border-[#0ECB81]/30'
                    : currentRiskMode === 'force_lose'
                    ? 'bg-red-500/15 text-red-400 border-red-500/30'
                    : currentRiskMode === 'loss_75'
                    ? 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30'
                    : 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                }`}
              >
                {currentRiskMode.toUpperCase().replace('_', ' ')}
              </span>
            </div>
          </div>
        </div>

        {/* Notice alert when a channel is OFF or an error occurs */}
        {autoPilotNotice && (
          <div className="p-3 rounded-2xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 text-xs flex items-center justify-between gap-2 animate-fadeIn relative z-10">
            <div className="flex items-center gap-2 font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0 text-yellow-400" />
              <span>{autoPilotNotice}</span>
            </div>
            <button
              type="button"
              onClick={() => setAutoPilotNotice(null)}
              className="text-gray-400 hover:text-white text-xs font-bold px-2 py-0.5"
            >
              ✕
            </button>
          </div>
        )}

        {/* Generated Signal Result Banner */}
        {autoPilotResult && (
          <div className="p-4 rounded-2xl bg-[#121418] border border-indigo-500/40 shadow-xl space-y-3 animate-fadeIn relative z-10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#2b313a]">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-black text-white flex items-center gap-1.5">
                  <Rocket className="w-4 h-4 text-yellow-400" />
                  <span>Generated Signal for:</span>
                </span>
                <span className="px-2 py-0.5 rounded-lg bg-indigo-500/20 text-indigo-300 text-xs font-black border border-indigo-500/30">
                  {autoPilotResult.channelName} ({autoPilotResult.channelId})
                </span>
                <span
                  className={`px-2 py-0.5 rounded-lg text-xs font-black border ${
                    autoPilotResult.isWin
                      ? 'bg-[#0ECB81]/15 text-[#0ECB81] border-[#0ECB81]/30'
                      : 'bg-red-500/15 text-red-400 border-red-500/30'
                  }`}
                >
                  {autoPilotResult.isWin ? `WIN (+${autoPilotResult.pnl}%)` : `STOP LOSS (-${autoPilotResult.pnl}%)`}
                </span>
                <span className="text-[10px] text-gray-400 font-mono">
                  Applied: {autoPilotResult.riskMode.toUpperCase()} @ {autoPilotResult.payoutRate}% RTP
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyAutoPilotResult}
                  className="px-3 py-1 bg-[#2b313a] hover:bg-[#3b434e] text-gray-200 hover:text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5 text-yellow-400" />
                  <span>{copiedAutoPilot ? 'Copied!' : 'Copy Text'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAutoPilotResult(null)}
                  className="text-gray-400 hover:text-white text-xs font-bold px-2 py-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-3.5 bg-[#0b0e11] rounded-xl border border-[#222832] font-mono text-xs whitespace-pre-line text-gray-200 shadow-inner">
              <div dangerouslySetInnerHTML={{ __html: autoPilotResult.signalText.replace(/\n/g, '<br/>') }} />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] text-gray-400">
              <span className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${autoPilotResult.delivered ? 'bg-[#0ECB81]' : 'bg-yellow-400'}`} />
                <span>{autoPilotResult.details}</span>
              </span>
              <span className="font-mono text-gray-500">{autoPilotResult.timestamp}</span>
            </div>
          </div>
        )}

        {/* 4 Single-line Rows: FREE, REGULAR, VIP, SUPER VIP */}
        <div className="overflow-x-auto pb-2 relative z-10">
          <div className="min-w-[880px] space-y-2.5">
            {AUTOPILOT_CHANNELS_DEF.map((ch) => {
              const currentCfg = autoPilotChannels[ch.name];
              const isChannelOff = currentCfg.status === 'OFF';

              return (
                <div
                  key={ch.name}
                  className={`flex flex-nowrap items-center gap-3 p-3 bg-[#121418] border rounded-2xl transition-all ${
                    isChannelOff
                      ? 'border-[#222832] opacity-70 bg-[#121418]/60'
                      : 'border-[#2b313a] hover:border-[#3f4754]'
                  }`}
                >
                  {/* 1. Channel Name Label */}
                  <div className="w-36 shrink-0 flex items-center">
                    <span
                      className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 ${ch.badgeColor} ${ch.badgeText} border ${ch.badgeBorder} shadow-sm w-full justify-center`}
                    >
                      {ch.icon}
                      <span>{ch.name}</span>
                    </span>
                  </div>

                  {/* 2. Channel ID Input (pre-filled with existing IDs) */}
                  <div className="flex-1 min-w-[200px]">
                    <input
                      type="text"
                      value={currentCfg.id}
                      onChange={(e) => handleUpdateChannelId(ch.name, e.target.value)}
                      placeholder={ch.defaultId}
                      className="w-full bg-[#181a20] border border-[#2b313a] focus:border-yellow-400 focus:bg-[#1f242c] rounded-xl px-3.5 py-2 text-xs font-mono text-white placeholder-gray-500 outline-none transition-all shadow-inner"
                      title={`Target Telegram Channel ID for ${ch.name}`}
                    />
                  </div>

                  {/* 3. Posts Per Day Input (number, placeholder: 5) */}
                  <div className="w-36 shrink-0 flex items-center justify-between gap-1.5 bg-[#181a20] border border-[#2b313a] rounded-xl px-3 py-1.5">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider whitespace-nowrap">
                      Posts/Day:
                    </span>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      placeholder="5"
                      value={currentCfg.count}
                      onChange={(e) => handleUpdateChannelCount(ch.name, e.target.value)}
                      className="w-12 bg-transparent text-xs font-mono font-black text-center text-yellow-400 focus:outline-none placeholder-gray-500"
                      title="Number of scheduled posts per day"
                    />
                  </div>

                  {/* 4. Mode Toggle Button: MANUAL / AUTO */}
                  <button
                    type="button"
                    onClick={() => handleToggleMode(ch.name)}
                    className={`w-28 shrink-0 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none ${
                      currentCfg.mode === 'AUTO'
                        ? 'bg-[#0ECB81]/20 text-[#0ECB81] border border-[#0ECB81]/40 shadow-sm shadow-[#0ECB81]/20 hover:bg-[#0ECB81]/30'
                        : 'bg-[#2b313a] text-gray-300 border border-[#3f4754] hover:bg-[#38404c] hover:text-white'
                    }`}
                    title="Toggle between Manual posting and Automated background scheduling"
                  >
                    {currentCfg.mode === 'AUTO' ? (
                      <>
                        <span className="w-2 h-2 rounded-full bg-[#0ECB81] animate-pulse" />
                        <span>AUTO</span>
                      </>
                    ) : (
                      <>
                        <span className="w-2 h-2 rounded-full bg-gray-400" />
                        <span>MANUAL</span>
                      </>
                    )}
                  </button>

                  {/* 5. Status Toggle ON/OFF */}
                  <button
                    type="button"
                    onClick={() => handleToggleStatus(ch.name)}
                    className={`w-20 shrink-0 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1 cursor-pointer select-none ${
                      currentCfg.status === 'ON'
                        ? 'bg-[#0ECB81] text-black hover:bg-[#0bb573] shadow-md shadow-[#0ECB81]/25'
                        : 'bg-red-500/20 text-red-400 border border-red-500/40 hover:bg-red-500/30'
                    }`}
                    title={isChannelOff ? 'Channel is OFF - click to turn ON' : 'Channel is ON - click to turn OFF'}
                  >
                    <span>{currentCfg.status}</span>
                  </button>

                  {/* 6. Generate Now Button */}
                  <button
                    type="button"
                    onClick={() => handleGenerateNow(ch.name)}
                    disabled={generatingChannel === ch.name}
                    className={`w-36 shrink-0 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 select-none ${
                      isChannelOff
                        ? 'bg-[#2b313a]/40 text-gray-500 border border-[#2b313a] cursor-not-allowed'
                        : 'bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 text-black shadow-md shadow-yellow-500/20 cursor-pointer'
                    }`}
                    title={isChannelOff ? 'Channel is OFF. Turn ON to generate and post.' : 'Instantly generate and dispatch signal'}
                  >
                    {generatingChannel === ch.name ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-black" />
                    ) : (
                      <Rocket className="w-3.5 h-3.5 text-black" />
                    )}
                    <span>Generate Now</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 2. TIKSUP TELEGRAM QUICK BOT: INSTANT SIGNAL FIRE (-1004441403389)    */}
      {/* ===================================================================== */}
      <div className="bg-gradient-to-br from-[#1c1826] via-[#181a20] to-[#121418] border-2 border-yellow-500/30 rounded-3xl p-6 shadow-2xl space-y-6 relative overflow-hidden">
        {/* Glow ambient accent */}
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-yellow-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#2b313a] relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-yellow-500 via-orange-500 to-red-600 flex items-center justify-center text-white shadow-lg shadow-orange-500/30 animate-pulse">
              <Zap className="w-6 h-6 text-black fill-current" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-black text-white tracking-wide flex items-center gap-1.5">
                  <span>TikSup Telegram Quick Bot</span>
                  <span className="text-yellow-400">⚡️</span>
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-yellow-500/20 text-yellow-400 border border-yellow-500/40">
                  Target: -1004441403389
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">
                  TikSup Crypto Quick ⚡️
                </span>
              </div>
              <p className="text-xs text-gray-300 mt-1">
                {lang === 'ar'
                  ? 'أي رسالة ترسلها، يقوم البوت فوراً بصياغة وإرسال إشارة الشراء السريعة للقناة -1004441403389 باللغة الإنجليزية والرد بـ: ✅ Fired 🔥'
                  : 'Whenever ANY message is received, automatically creates and posts this exact style quick scalp signal to -1004441403389 in ENGLISH.'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleCopyCurl}
              className="px-3 py-1.5 bg-[#2b313a] hover:bg-[#38404c] text-gray-300 hover:text-white rounded-xl text-[11px] font-bold transition-all border border-[#3f4754] flex items-center gap-1.5"
            >
              <Terminal className="w-3.5 h-3.5 text-sky-400" />
              <span>{copiedCurl ? 'Copied cURL!' : 'API Webhook'}</span>
            </button>
            <button
              type="button"
              onClick={handleCopyPreview}
              className="px-3 py-1.5 bg-[#2b313a] hover:bg-[#38404c] text-gray-300 hover:text-white rounded-xl text-[11px] font-bold transition-all border border-[#3f4754] flex items-center gap-1.5"
            >
              <Copy className="w-3.5 h-3.5 text-yellow-400" />
              <span>{copiedSignal ? 'Copied Signal!' : 'Copy Text'}</span>
            </button>
          </div>
        </div>

        {/* Quick Fire Interactive Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10">
          {/* Left Column: Fire Controller */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-[#121418] border border-[#2b313a] rounded-2xl p-4 space-y-3">
              <label className="text-xs font-black text-white flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-orange-400" />
                  <span>{lang === 'ar' ? 'أرسل أي رسالة أو اسم العملة للنشر الفوري:' : 'Send ANY message or Coin for Instant Post:'}</span>
                </span>
                <span className="text-[10px] text-gray-400 font-normal">
                  Default: BTC/USDT if empty
                </span>
              </label>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={quickInput}
                  onChange={(e) => setQuickInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleFireQuickSignal();
                    }
                  }}
                  placeholder="Type anything (e.g. BTC, ETH, SOL, or press Enter to fire)..."
                  className="w-full bg-[#181a20] border border-[#3b434e] rounded-xl px-4 py-3 text-xs text-white placeholder-gray-500 font-mono focus:border-yellow-400 focus:outline-none transition-all shadow-inner"
                />
                <button
                  type="button"
                  onClick={() => handleFireQuickSignal()}
                  disabled={isFiringQuickSignal}
                  className="px-6 py-3 bg-gradient-to-r from-yellow-500 via-orange-500 to-red-600 hover:from-yellow-400 hover:to-red-500 text-black font-black rounded-xl text-xs transition-all shadow-lg shadow-orange-500/25 flex items-center gap-2 shrink-0 disabled:opacity-50 cursor-pointer"
                >
                  {isFiringQuickSignal ? (
                    <RefreshCw className="w-4 h-4 animate-spin text-black" />
                  ) : (
                    <Rocket className="w-4 h-4 text-black" />
                  )}
                  <span>{lang === 'ar' ? 'إرسال الإشارة الآن ⚡️' : 'FIRE SIGNAL ⚡️'}</span>
                </button>
              </div>

              {/* Quick Preset Coins */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider me-1">
                  Quick Coins:
                </span>
                {['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'XRP/USDT', 'DOGE/USDT', 'PEPE/USDT'].map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => handleFireQuickSignal(c)}
                    className="px-2.5 py-1 rounded-lg bg-[#181a20] hover:bg-yellow-500/20 text-yellow-400 hover:text-white border border-[#2b313a] hover:border-yellow-500/40 text-[10px] font-black font-mono transition-all"
                  >
                    ⚡️ {c.split('/')[0]}
                  </button>
                ))}
              </div>

              {/* Target Channel & Multi-channel controls */}
              <div className="pt-3 border-t border-[#222832] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 font-bold">Target Channel:</span>
                  <span className="font-mono text-yellow-400 font-bold bg-yellow-500/10 px-2 py-0.5 rounded border border-yellow-500/20">
                    -1004441403389
                  </span>
                </div>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={broadcastOtherChannels}
                    onChange={(e) => setBroadcastOtherChannels(e.target.checked)}
                    className="w-3.5 h-3.5 rounded accent-yellow-500"
                  />
                  <span className="text-gray-300 font-semibold">
                    Also broadcast to other 3 channels (-1004348907709, -1004429643399, -1004496261634)
                  </span>
                </label>
              </div>
            </div>

            {/* Response Banner after firing */}
            {quickFireResult && (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/60 to-[#121418] border border-emerald-500/40 text-[#0ECB81] space-y-1.5 animate-fadeIn shadow-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-black text-sm">
                    <span className="text-lg">✅</span>
                    <span className="text-white font-mono">{quickFireResult.reply}</span>
                  </div>
                  <span className="text-[10px] text-gray-400 font-mono">
                    {quickFireResult.timestamp}
                  </span>
                </div>
                <p className="text-xs text-emerald-300 font-medium">
                  {quickFireResult.details}
                </p>
              </div>
            )}

            {/* Quick Bot Rules Reference */}
            <div className="p-3.5 rounded-2xl bg-[#121418]/60 border border-[#2b313a] space-y-1.5 text-[11px] text-gray-400">
              <span className="font-black text-gray-200 block uppercase tracking-wider text-[10px]">
                ⚡️ Quick Bot Rules Compliance:
              </span>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 list-disc list-inside">
                <li><strong className="text-gray-300">Language:</strong> English only</li>
                <li><strong className="text-gray-300">Emojis:</strong> Must use 🔥⚡️🚀💥💪📈</li>
                <li><strong className="text-gray-300">Direction:</strong> LONG 📈</li>
                <li><strong className="text-gray-300">Trade Time:</strong> 15 Seconds (Super Fast)</li>
                <li><strong className="text-gray-300">Risk Rule:</strong> 20% OF YOUR BALANCE</li>
                <li><strong className="text-gray-300">Bot Reply:</strong> ✅ Fired 🔥</li>
              </ul>
            </div>
          </div>

          {/* Right Column: Live Scalp Signal Preview Card */}
          <div className="lg:col-span-5 flex flex-col justify-between">
            <div className="bg-[#0b0e11] border-2 border-yellow-500/40 rounded-2xl p-5 shadow-2xl space-y-3 font-mono">
              <div className="flex items-center justify-between pb-2 border-b border-[#2b313a]">
                <span className="text-[10px] text-yellow-400 font-black uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Live Post Preview (-1004441403389)
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-[#0ECB81] text-[9px] font-black">
                  EXACT FORMAT
                </span>
              </div>

              <div className="whitespace-pre-line text-xs font-bold leading-relaxed text-gray-100 bg-[#121418] p-4 rounded-xl border border-[#222832] select-all shadow-inner">
                {quickSignalPreview}
              </div>

              <div className="pt-2 flex items-center justify-between text-[10px] text-gray-400">
                <span>Channel: TikSup Crypto Quick ⚡️</span>
                <span className="text-yellow-400 font-bold">15s Binary Call</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 4. AUTOMATION CONTROL: BIG MASTER SWITCH, COUNTDOWN & TODAY'S LOGS    */}
      {/* ===================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Master Switch & Next Scheduled Posts */}
        <div className="lg:col-span-1 bg-[#181a20] border border-[#2b313a] rounded-3xl p-5 shadow-xl flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#2b313a]">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-yellow-400" />
                <h3 className="text-sm font-black text-white">
                  {lang === 'ar' ? 'التحكم في الأتمتة' : 'Automation Control'}
                </h3>
              </div>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                  botSettings.autoEnabled
                    ? 'bg-[#0ECB81]/20 text-[#0ECB81] border border-[#0ECB81]/40'
                    : 'bg-gray-500/20 text-gray-400 border border-gray-500/40'
                }`}
              >
                {botSettings.autoEnabled ? 'ACTIVE' : 'OFF'}
              </span>
            </div>

            {/* BIG SWITCH */}
            <div className="mt-4 p-4 rounded-2xl bg-[#121418] border border-[#2b313a] space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-black text-white block">
                    {lang === 'ar' ? 'النشر التلقائي الشامل' : 'Master Auto Posting'}
                  </span>
                  <span className="text-[10px] text-gray-400 block mt-0.5">
                    {botSettings.autoEnabled
                      ? (lang === 'ar' ? 'مفعل: يتم الفحص والنشر كل ربع ساعة' : 'Runs every 15 min if token configured')
                      : (lang === 'ar' ? 'متوقف افتراضياً حتى إضافة التوكن' : 'Default OFF until token added')}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleToggleAutoMaster}
                  className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors focus:outline-none ${
                    botSettings.autoEnabled ? 'bg-[#0ECB81]' : 'bg-[#2b313a]'
                  }`}
                >
                  <span
                    className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                      botSettings.autoEnabled ? 'translate-x-9' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {!botSettings.token && botSettings.autoEnabled && (
                <div className="p-2.5 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-[11px] flex items-start gap-2">
                  <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>
                    {lang === 'ar'
                      ? 'التوكن غير محدد: سيسجل النظام "Token missing - skipped" في السجلات حتى تقوم بوضع توكن البوت.'
                      : 'No token set: system runs and logs "Token missing - skipped" until bot token is supplied.'}
                  </span>
                </div>
              )}
            </div>

            {/* Manual Run Button */}
            <div className="mt-3">
              <button
                type="button"
                onClick={handleManualRunScan}
                disabled={isRunningScan}
                className="w-full py-2.5 bg-[#2b313a] hover:bg-[#3b434e] text-yellow-400 hover:text-white font-bold rounded-xl text-xs transition-all border border-[#3f4754] flex items-center justify-center gap-2"
              >
                {isRunningScan ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Play className="w-3.5 h-3.5" />
                )}
                <span>{lang === 'ar' ? 'تشغيل فحص يدوي الآن' : 'Run Auto Poster Scan Now'}</span>
              </button>

              {scanResult && (
                <div className="mt-2 p-2 rounded-lg bg-sky-500/15 border border-sky-500/30 text-sky-400 text-[11px]">
                  {scanResult}
                </div>
              )}
            </div>
          </div>

          {/* Next Scheduled Posts Countdown Box */}
          <div className="pt-3 border-t border-[#2b313a] space-y-2">
            <div className="flex items-center justify-between text-gray-300">
              <span className="font-extrabold flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-sky-400" />
                <span>{lang === 'ar' ? 'المنشورات المجدولة التالية' : 'Next Scheduled Posts'}</span>
              </span>
              <span className="text-[10px] text-gray-500 font-mono">
                {upcomingSchedules.length} {lang === 'ar' ? 'موعد' : 'slots'}
              </span>
            </div>

            {upcomingSchedules.length === 0 ? (
              <div className="py-4 text-center text-gray-500 text-[11px]">
                {lang === 'ar' ? 'لا توجد مواعيد مجدولة نشطة' : 'No active scheduled times'}
              </div>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {upcomingSchedules.slice(0, 4).map((item, idx) => (
                  <div
                    key={`${item.groupId}-${item.scheduledTime}-${idx}`}
                    className="p-2 rounded-xl bg-[#121418] border border-[#2b313a] flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-white text-[11px] truncate max-w-[130px]">
                        {item.groupName}
                      </div>
                      <div className="text-[10px] text-gray-400 flex items-center gap-1">
                        <span className="px-1.5 py-0.2 rounded bg-yellow-500/15 text-yellow-400 font-mono font-bold">
                          {item.scheduledTime}
                        </span>
                        <span>({item.tradeType})</span>
                      </div>
                    </div>

                    <div className="text-end">
                      <span className="font-mono text-xs font-black text-sky-400 block">
                        {formatCountdown(item.targetDate)}
                      </span>
                      <span className="text-[9px] text-gray-500">
                        {item.isPastToday ? 'Tomorrow' : 'Today'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Today's Logs Table */}
        <div className="lg:col-span-2 bg-[#181a20] border border-[#2b313a] rounded-3xl p-5 shadow-xl space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#2b313a]">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-sky-400" />
                <h3 className="text-sm font-black text-white">
                  {lang === 'ar' ? 'سجل العمليات والمنشورات' : "Today's Execution Logs"}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-400">{logs.length} logs</span>
                {logs.length > 0 && (
                  <button
                    type="button"
                    onClick={clearAllPostLogs}
                    className="px-2 py-1 rounded bg-[#2b313a] hover:bg-red-500/20 hover:text-red-400 text-gray-400 text-[10px] font-bold transition-all"
                  >
                    {lang === 'ar' ? 'مسح السجل' : 'Clear Logs'}
                  </button>
                )}
              </div>
            </div>

            {logs.length === 0 ? (
              <div className="py-16 text-center text-gray-500 text-xs">
                {lang === 'ar' ? 'لا توجد سجلات بعد. سيتم تسجيل كل محاولة نشر تلقائية هنا.' : 'No execution logs yet. Automated post events will appear here.'}
              </div>
            ) : (
              <div className="overflow-x-auto max-h-80 overflow-y-auto mt-2 pr-1">
                <table className="w-full text-xs text-start">
                  <thead>
                    <tr className="border-b border-[#262c35] text-gray-400 font-bold">
                      <th className="py-2 px-2.5">Time (Amman)</th>
                      <th className="py-2 px-2.5">Group</th>
                      <th className="py-2 px-2.5">Trade</th>
                      <th className="py-2 px-2.5">Status</th>
                      <th className="py-2 px-2.5">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#222832]">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-[#1f242c]/50">
                        <td className="py-2 px-2.5 font-mono text-gray-300 whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleTimeString(undefined, {
                            timeZone: 'Asia/Amman',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </td>
                        <td className="py-2 px-2.5 font-bold text-white whitespace-nowrap">
                          {log.groupName || log.groupId}
                        </td>
                        <td className="py-2 px-2.5 text-gray-300 max-w-[140px] truncate" title={log.tradeTitle}>
                          {log.tradeTitle || '—'}
                        </td>
                        <td className="py-2 px-2.5 whitespace-nowrap">
                          {log.status === 'SUCCESS' && (
                            <span className="px-2 py-0.5 rounded-full bg-[#0ECB81]/15 text-[#0ECB81] font-bold text-[10px] border border-[#0ECB81]/30">
                              ✓ Posted
                            </span>
                          )}
                          {log.status === 'TOKEN_MISSING_SKIPPED' && (
                            <span className="px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-400 font-bold text-[10px] border border-yellow-500/30">
                              Token Missing (Skipped)
                            </span>
                          )}
                          {log.status === 'NO_TRADE_FOUND' && (
                            <span className="px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 font-bold text-[10px] border border-blue-500/30">
                              No Trade
                            </span>
                          )}
                          {log.status === 'ERROR' && (
                            <span className="px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 font-bold text-[10px] border border-red-500/30">
                              Failed
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-2.5 text-[11px] text-gray-400 max-w-[200px] truncate" title={log.details}>
                          {log.details || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 2. SECTION: GROUPS MANAGER                                            */}
      {/* ===================================================================== */}
      <div className="bg-[#181a20] border border-[#2b313a] rounded-3xl p-6 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#2b313a]">
          <div>
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-sky-400" />
              <span>{lang === 'ar' ? 'إدارة المجموعات والقنوات المستهدفة' : 'Telegram Groups Manager'}</span>
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              {lang === 'ar'
                ? 'أضف القنوات أو المجموعات وحدد نوع الصفقات وعدد المنشورات اليومية والمواعيد بالساعة والدقيقة.'
                : 'Configure destination groups, assign trade categories, and set dynamic daily schedule times.'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Total Groups: {groups.length}</span>
            <span className="px-2.5 py-1 rounded-lg bg-sky-500/15 text-sky-400 text-xs font-bold border border-sky-500/30">
              {groups.filter(g => g.active).length} Active
            </span>
          </div>
        </div>

        {/* Group Add / Edit Form */}
        <form onSubmit={handleSaveGroup} className="p-5 rounded-2xl bg-[#121418] border border-[#2b313a] space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-white">
              {editingGroupId
                ? (lang === 'ar' ? 'تعديل بيانات المجموعة' : 'Edit Telegram Group')
                : (lang === 'ar' ? '+ إضافة مجموعة جديدة' : '+ Add New Telegram Group')}
            </span>
            {editingGroupId && (
              <button
                type="button"
                onClick={handleCancelGroupEdit}
                className="text-[11px] text-gray-400 hover:text-white"
              >
                {lang === 'ar' ? 'إلغاء التعديل' : 'Cancel Edit'}
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="text-[11px] font-bold text-gray-400 block mb-1">
                {lang === 'ar' ? 'اسم المجموعة' : 'Group Name'} *
              </label>
              <input
                type="text"
                value={groupNameInput}
                onChange={(e) => setGroupNameInput(e.target.value)}
                placeholder="e.g. VIP Crypto Signals"
                className="w-full bg-[#181a20] border border-[#2b313a] rounded-xl px-3 py-2 text-white text-xs focus:border-sky-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-gray-400 block mb-1">
                {lang === 'ar' ? 'معرّف المجموعة (Group ID)' : 'Group ID (-100xxxx)'} *
              </label>
              <input
                type="text"
                value={groupIdInput}
                onChange={(e) => setGroupIdInput(e.target.value)}
                placeholder="-1001234567890"
                className="w-full bg-[#181a20] border border-[#2b313a] rounded-xl px-3 py-2 text-white font-mono text-xs focus:border-sky-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-gray-400 block mb-1">
                {lang === 'ar' ? 'نوع الصفقات (Trade Type)' : 'Trade Type'}
              </label>
              <select
                value={tradeTypeInput}
                onChange={(e) => setTradeTypeInput(e.target.value as AutoPosterCategory)}
                className="w-full bg-[#181a20] border border-[#2b313a] rounded-xl px-3 py-2 text-white text-xs focus:border-sky-400 focus:outline-none"
              >
                <option value="Crypto">Crypto (Standard)</option>
                <option value="Binary">Binary (UP/DOWN)</option>
                <option value="VIP">VIP Exclusive</option>
                <option value="Regular">Regular Swings</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-gray-400 block mb-1">
                {lang === 'ar' ? 'عدد المنشورات اليومية (1-10)' : 'Daily Posts Count (1-10)'}
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={dailyCountInput}
                onChange={(e) => handleDailyCountChange(parseInt(e.target.value, 10) || 1)}
                className="w-full bg-[#181a20] border border-[#2b313a] rounded-xl px-3 py-2 text-white font-mono text-xs focus:border-sky-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Dynamic Post Times Inputs based on Daily Count */}
          <div className="pt-2 border-t border-[#222832] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-gray-300">
                {lang === 'ar' ? 'أوقات النشر اليومية (توقيت عمّان 24 ساعة):' : 'Daily Post Times (Asia/Amman, 24-hr):'}
              </span>
              <span className="text-[10px] text-gray-500">
                {dailyCountInput} {lang === 'ar' ? 'أوقات محددة' : 'time slots'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
              {Array.from({ length: dailyCountInput }).map((_, idx) => (
                <div key={idx} className="flex items-center gap-1.5 bg-[#181a20] p-1.5 rounded-xl border border-[#2b313a]">
                  <span className="text-[10px] text-gray-400 font-mono font-bold px-1.5">#{idx + 1}</span>
                  <input
                    type="time"
                    value={postTimesInput[idx] || '12:00'}
                    onChange={(e) => handlePostTimeChange(idx, e.target.value)}
                    className="bg-transparent text-white font-mono text-xs focus:outline-none w-full"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Active Toggle & Submit */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={groupActiveInput}
                onChange={(e) => setGroupActiveInput(e.target.checked)}
                className="w-4 h-4 rounded accent-sky-500"
              />
              <span className="text-xs font-bold text-gray-300">
                {lang === 'ar' ? 'المجموعة نشطة وجاهزة للاستقبال' : 'Group is Active for Posting'}
              </span>
            </label>

            {groupFormError && (
              <span className="text-xs text-red-400 font-bold">{groupFormError}</span>
            )}

            <button
              type="submit"
              className="px-6 py-2.5 bg-sky-500 hover:bg-sky-400 text-white font-black rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{editingGroupId ? (lang === 'ar' ? 'حفظ التعديلات' : 'Save Changes') : (lang === 'ar' ? 'إضافة المجموعة' : 'Add Group')}</span>
            </button>
          </div>
        </form>

        {/* Groups Table List */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-start">
            <thead>
              <tr className="border-b border-[#262c35] text-gray-400 font-bold">
                <th className="py-3 px-3">Group Name</th>
                <th className="py-3 px-3">Group ID</th>
                <th className="py-3 px-3">Trade Type</th>
                <th className="py-3 px-3">Daily Count</th>
                <th className="py-3 px-3">Post Times</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-end">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#222832]">
              {groups.map((group) => (
                <tr key={group.id} className="hover:bg-[#1f242c]/50">
                  <td className="py-3 px-3 font-bold text-white">
                    {group.groupName}
                  </td>
                  <td className="py-3 px-3 font-mono text-gray-400">
                    {group.groupId}
                  </td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-yellow-500/15 text-yellow-400 border border-yellow-500/30">
                      {group.tradeType}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-mono font-bold text-gray-300">
                    {group.dailyCount} / day
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex flex-wrap gap-1">
                      {(group.postTimes || []).map((t, i) => (
                        <span key={i} className="px-1.5 py-0.5 rounded bg-[#121418] text-gray-300 font-mono text-[10px] border border-[#2b313a]">
                          {t}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <button
                      type="button"
                      onClick={() => toggleTelegramGroupActive(group.id!, !group.active)}
                      className={`px-2.5 py-1 rounded-full text-[10px] font-black transition-all ${
                        group.active
                          ? 'bg-[#0ECB81]/15 text-[#0ECB81] border border-[#0ECB81]/30 hover:bg-[#0ECB81]/25'
                          : 'bg-gray-500/15 text-gray-400 border border-gray-500/30 hover:bg-gray-500/25'
                      }`}
                    >
                      {group.active ? 'ACTIVE' : 'PAUSED'}
                    </button>
                  </td>
                  <td className="py-3 px-3 text-end whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleEditGroupClick(group)}
                        className="p-1.5 rounded-lg bg-[#2b313a] hover:bg-[#38404c] text-sky-400 transition-all"
                        title="Edit group"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteGroup(group.id)}
                        className="p-1.5 rounded-lg bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/30 transition-all"
                        title="Delete group"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 3. SECTION: TRADE BANK (ADD TRADE, SEARCH & BULK CSV IMPORT)         */}
      {/* ===================================================================== */}
      <div className="bg-[#181a20] border border-[#2b313a] rounded-3xl p-6 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#2b313a]">
          <div>
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-yellow-400" />
              <span>{lang === 'ar' ? 'بنك الصفقات والتحليلات (Trade Bank)' : 'Trade Signal Bank'}</span>
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              {lang === 'ar'
                ? 'قاعدة بيانات بطاقات الصفقات الجاهزة للبث الآلي. يمكنك إضافة صفقات يدوياً أو استيرادها دفعة واحدة عبر ملف CSV.'
                : 'Repository of signal templates with entry, target, profit, and charts. Supports instant manual addition or Bulk CSV import.'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsCsvModalOpen(true)}
              className="px-3.5 py-2 bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 text-black font-black rounded-xl text-xs transition-all shadow-md flex items-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{lang === 'ar' ? 'استيراد CSV جماعي' : 'Bulk CSV Import'}</span>
            </button>
          </div>
        </div>

        {/* Add Trade Form */}
        <form onSubmit={handleAddTrade} className="p-5 rounded-2xl bg-[#121418] border border-[#2b313a] space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-white">
              {lang === 'ar' ? '+ إضافة صفقة جديدة لبنك الصفقات' : '+ Add New Trade to Bank'}
            </span>
            {tradeFormSuccess && (
              <span className="text-xs text-[#0ECB81] font-bold flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> {tradeFormSuccess}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="text-[11px] font-bold text-gray-400 block mb-1">
                {lang === 'ar' ? 'عنوان الصفقة (Title)' : 'Trade Title'} *
              </label>
              <input
                type="text"
                value={tradeTitle}
                onChange={(e) => setTradeTitle(e.target.value)}
                placeholder="e.g. BTC/USDT Bullish Pennant Breakout"
                className="w-full bg-[#181a20] border border-[#2b313a] rounded-xl px-3 py-2 text-white text-xs focus:border-yellow-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-gray-400 block mb-1">
                {lang === 'ar' ? 'الاتجاه (LONG / SHORT)' : 'Signal Direction'} *
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTradeType('LONG')}
                  className={`py-2 rounded-xl font-black text-xs transition-all ${
                    tradeType === 'LONG'
                      ? 'bg-[#0ECB81] text-black shadow-md'
                      : 'bg-[#181a20] text-gray-400 border border-[#2b313a]'
                  }`}
                >
                  🟢 LONG
                </button>
                <button
                  type="button"
                  onClick={() => setTradeType('SHORT')}
                  className={`py-2 rounded-xl font-black text-xs transition-all ${
                    tradeType === 'SHORT'
                      ? 'bg-[#F6465D] text-white shadow-md'
                      : 'bg-[#181a20] text-gray-400 border border-[#2b313a]'
                  }`}
                >
                  🔴 SHORT
                </button>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-gray-400 block mb-1">
                {lang === 'ar' ? 'سعر الدخول (Entry Price)' : 'Entry Price'} *
              </label>
              <input
                type="number"
                step="any"
                value={tradeEntry}
                onChange={(e) => setTradeEntry(e.target.value)}
                placeholder="64200.00"
                className="w-full bg-[#181a20] border border-[#2b313a] rounded-xl px-3 py-2 text-white font-mono text-xs focus:border-yellow-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-gray-400 block mb-1">
                {lang === 'ar' ? 'الهدف المتوقع (Target Price)' : 'Target Price'} *
              </label>
              <input
                type="number"
                step="any"
                value={tradeTarget}
                onChange={(e) => setTradeTarget(e.target.value)}
                placeholder="67800.00"
                className="w-full bg-[#181a20] border border-[#2b313a] rounded-xl px-3 py-2 text-white font-mono text-xs focus:border-yellow-400 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
            <div>
              <label className="text-[11px] font-bold text-gray-400 block mb-1">
                {lang === 'ar' ? 'نسبة الربح المتوقعة (Profit %)' : 'Expected Profit %'} *
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  value={tradeProfit}
                  onChange={(e) => setTradeProfit(e.target.value)}
                  placeholder="120"
                  className="w-full bg-[#181a20] border border-[#2b313a] rounded-xl px-3 py-2 text-white font-mono text-xs focus:border-yellow-400 focus:outline-none pr-8"
                />
                <span className="absolute right-3 top-2 text-gray-400 font-bold">%</span>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-gray-400 block mb-1">
                {lang === 'ar' ? 'تصنيف الصفقة (Category)' : 'Target Category'} *
              </label>
              <select
                value={tradeCategory}
                onChange={(e) => setTradeCategory(e.target.value as AutoPosterCategory)}
                className="w-full bg-[#181a20] border border-[#2b313a] rounded-xl px-3 py-2 text-white text-xs focus:border-yellow-400 focus:outline-none"
              >
                <option value="Crypto">Crypto (Whale Signals)</option>
                <option value="Binary">Binary (UP/DOWN Alerts)</option>
                <option value="VIP">VIP Club</option>
                <option value="Regular">Regular Swings</option>
              </select>
            </div>

            {/* Image upload / URL */}
            <div>
              <label className="text-[11px] font-bold text-gray-400 block mb-1">
                {lang === 'ar' ? 'صورة الشارت والتحليل (Firebase Storage)' : 'Chart Image (Firebase Storage / URL)'}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={tradeImageUrl}
                  onChange={(e) => setTradeImageUrl(e.target.value)}
                  placeholder="https://... or upload"
                  className="flex-1 bg-[#181a20] border border-[#2b313a] rounded-xl px-3 py-2 text-white text-xs font-mono focus:border-yellow-400 focus:outline-none"
                />

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageFileChange}
                  accept="image/*"
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingImage}
                  className="px-3 py-2 bg-[#2b313a] hover:bg-[#38404c] text-white rounded-xl text-xs flex items-center gap-1 border border-[#3b434e] transition-all"
                  title="Upload from disk to Firebase Storage"
                >
                  {isUploadingImage ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Upload className="w-3.5 h-3.5 text-yellow-400" />
                  )}
                  <span>{lang === 'ar' ? 'رفع' : 'Upload'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-between pt-2">
            {tradeFormError ? (
              <span className="text-xs text-red-400 font-bold">{tradeFormError}</span>
            ) : (
              <span className="text-[11px] text-gray-500">
                {lang === 'ar' ? 'سيتم حفظ الصفقة في البنك لاستخدامها في الدورات القادمة.' : 'Will be stored in Trade Bank for automatic scheduled rotations.'}
              </span>
            )}

            <button
              type="submit"
              className="px-6 py-2.5 bg-[#F0B90B] hover:bg-[#dfaa07] text-black font-black rounded-xl text-xs shadow-md transition-all flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{lang === 'ar' ? 'إضافة إلى البنك' : 'Add to Trade Bank'}</span>
            </button>
          </div>
        </form>

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={tradeSearch}
              onChange={(e) => setTradeSearch(e.target.value)}
              placeholder={lang === 'ar' ? 'بحث عن صفقة أو عملة...' : 'Search trade signals...'}
              className="w-full bg-[#121418] border border-[#2b313a] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-gray-500 focus:border-yellow-400 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
            {['ALL', 'Crypto', 'Binary', 'VIP', 'Regular'].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setTradeCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  tradeCategoryFilter === cat
                    ? 'bg-[#F0B90B] text-black shadow-sm'
                    : 'bg-[#181a20] text-gray-400 hover:text-white border border-[#2b313a]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Trades Table List */}
        <div className="overflow-x-auto">
          {filteredTrades.length === 0 ? (
            <div className="py-12 text-center text-xs text-gray-500">
              {lang === 'ar' ? 'لا توجد صفقات مطابقة في البنك.' : 'No matching trades in bank.'}
            </div>
          ) : (
            <table className="w-full text-xs text-start">
              <thead>
                <tr className="border-b border-[#262c35] text-gray-400 font-bold">
                  <th className="py-3 px-3">Chart / Image</th>
                  <th className="py-3 px-3">Title & Direction</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3">Entry</th>
                  <th className="py-3 px-3">Target</th>
                  <th className="py-3 px-3">Profit %</th>
                  <th className="py-3 px-3">Last Posted</th>
                  <th className="py-3 px-3 text-end">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222832]">
                {filteredTrades.map((t) => (
                  <tr key={t.id} className="hover:bg-[#1f242c]/50">
                    <td className="py-3 px-3">
                      {t.imageUrl ? (
                        <a
                          href={t.imageUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="block w-12 h-9 rounded-lg overflow-hidden border border-[#2b313a] bg-black/40 hover:opacity-80 transition-all"
                        >
                          <img src={t.imageUrl} alt="" className="w-full h-full object-cover" />
                        </a>
                      ) : (
                        <div className="w-12 h-9 rounded-lg border border-[#2b313a] flex items-center justify-center bg-[#121418] text-gray-600">
                          <ImageIcon className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-bold text-white text-xs">{t.title}</div>
                      <div className="mt-0.5">
                        {t.type === 'LONG' ? (
                          <span className="text-[10px] font-extrabold text-[#0ECB81] flex items-center gap-0.5">
                            <TrendingUp className="w-3 h-3" /> LONG
                          </span>
                        ) : (
                          <span className="text-[10px] font-extrabold text-[#F6465D] flex items-center gap-0.5">
                            <TrendingDown className="w-3 h-3" /> SHORT
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-yellow-500/15 text-yellow-400 border border-yellow-500/30">
                        {t.category}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-gray-300">
                      ${t.entry.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 font-mono text-gray-300">
                      ${t.target.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 font-mono font-black text-[#0ECB81]">
                      +{t.profit}%
                    </td>
                    <td className="py-3 px-3 text-gray-400 whitespace-nowrap">
                      {t.lastPostedAt
                        ? new Date(t.lastPostedAt).toLocaleString(undefined, {
                            timeZone: 'Asia/Amman',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : <span className="text-gray-500 italic">Never</span>}
                    </td>
                    <td className="py-3 px-3 text-end">
                      <button
                        type="button"
                        onClick={() => handleDeleteTrade(t.id)}
                        className="p-1.5 rounded-lg bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/30 transition-all"
                        title="Delete from trade bank"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ===================================================================== */}
      {/* BULK CSV IMPORT MODAL                                                 */}
      {/* ===================================================================== */}
      {isCsvModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#181a20] border border-[#2b313a] rounded-3xl p-6 max-w-xl w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#2b313a]">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-yellow-400" />
                <h3 className="text-sm font-black text-white">
                  {lang === 'ar' ? 'استيراد صفقات جماعي (CSV Format)' : 'Bulk CSV Trade Import'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => { setIsCsvModalOpen(false); setCsvImportResult(null); }}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-gray-400">
              {lang === 'ar'
                ? 'الصق بيانات الـ CSV بتنسيق: Title,Type,Entry,Target,Profit,Category,ImageUrl'
                : 'Paste raw CSV rows formatted as: Title,Type,Entry,Target,Profit,Category,ImageUrl'}
            </p>

            {/* Template sample preview */}
            <div className="p-3 bg-[#121418] rounded-xl border border-[#2b313a] font-mono text-[11px] text-gray-300">
              <span className="text-yellow-400 block mb-1 font-bold"># Expected CSV Format:</span>
              Title,Type,Entry,Target,Profit,Category,ImageUrl<br />
              BTC Surge,LONG,64200,67800,140,Crypto,https://...<br />
              SOL Scalp,SHORT,154,142,85,Binary,https://...
            </div>

            <textarea
              rows={6}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder="Paste CSV rows here..."
              className="w-full bg-[#121418] border border-[#2b313a] rounded-xl p-3 font-mono text-xs text-white placeholder-gray-500 focus:border-yellow-400 focus:outline-none"
            />

            {csvImportResult && (
              <div
                className={`p-3 rounded-xl text-xs ${
                  csvImportResult.added > 0 ? 'bg-[#0ECB81]/15 text-[#0ECB81] border border-[#0ECB81]/30' : 'bg-red-500/15 text-red-400 border border-red-500/30'
                }`}
              >
                <strong>Successfully imported: {csvImportResult.added} trades.</strong>
                {csvImportResult.errors.length > 0 && (
                  <div className="mt-1 text-[11px] text-red-300">
                    Errors: {csvImportResult.errors.join('; ')}
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => { setIsCsvModalOpen(false); setCsvImportResult(null); }}
                className="px-4 py-2 bg-[#2b313a] hover:bg-[#38404c] text-gray-300 font-bold rounded-xl text-xs"
              >
                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>

              <button
                type="button"
                onClick={handleExecuteCsvImport}
                disabled={!csvText.trim()}
                className="px-5 py-2 bg-yellow-500 hover:bg-yellow-400 text-black font-black rounded-xl text-xs disabled:opacity-50 transition-all shadow-md"
              >
                {lang === 'ar' ? 'تنفيذ الاستيراد' : 'Import Now'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
