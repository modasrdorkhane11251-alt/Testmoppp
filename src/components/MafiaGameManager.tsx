import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Moon,
  Sun,
  Users,
  Award,
  Vote,
  Gavel,
  RefreshCw,
  Play,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Skull,
  Crosshair,
  HeartPulse,
  Search,
  Zap,
  Info,
  ChevronRight,
  Eye,
  EyeOff,
  Flame,
  Send,
  Sparkles,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  MafiaEngine,
  MAFIA_ROLES_CATALOG,
  activeMafiaGames,
  FullMafiaGame,
  MafiaGamePlayer,
  MafiaRoleKey,
} from '../services/mafiaEngine';
import { MafiaChatAndVoice } from './MafiaChatAndVoice';

interface Props {
  chatId?: number;
  onSendBotMessage?: (text: string) => void;
  onSyncWithBot?: (callbackData: string) => void;
}

export const MafiaGameManager: React.FC<Props> = ({
  chatId = 12345678,
  onSendBotMessage,
  onSyncWithBot,
}) => {
  const [game, setGame] = useState<FullMafiaGame | null>(null);
  const [selectedMode, setSelectedMode] = useState<9 | 12>(9);
  const [revealAllRoles, setRevealAllRoles] = useState(false);
  const [lastEventMessage, setLastEventMessage] = useState<string>('');
  const [selectedTargetSeat, setSelectedTargetSeat] = useState<number | null>(null);
  const [selectedNightAction, setSelectedNightAction] = useState<
    'shoot' | 'save' | 'inquire' | 'sniper_shoot' | null
  >(null);

  // Sync game from server or memory
  const refreshGameState = async () => {
    try {
      const res = await fetch(`/api/mafia/state?chatId=${chatId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.game) {
          setGame(data.game);
          return;
        }
      }
    } catch {
      // Fallback to local memory
    }

    const localGame = activeMafiaGames.get(chatId);
    if (localGame) {
      setGame({ ...localGame });
    }
  };

  useEffect(() => {
    refreshGameState();
  }, [chatId]);

  // Start new game
  const handleStartNewGame = (mode: 9 | 12) => {
    setSelectedMode(mode);
    MafiaEngine.createLobby(chatId, mode, { id: 12345678, first_name: 'شما (کاربر)' });
    const newGame = MafiaEngine.fillWithSimulatedPlayers(chatId);
    setGame({ ...newGame });
    setLastEventMessage(`بازی ${mode} نفره آغاز شد! شب اول فرا رسید.`);
    confetti({ particleCount: 40, spread: 60 });

    if (onSyncWithBot) {
      onSyncWithBot(mode === 9 ? 'cb_mafia_start_9' : 'cb_mafia_start_12');
    }
  };

  // Perform Night Action
  const handleExecuteNightAction = (
    action: 'shoot' | 'save' | 'inquire' | 'sniper_shoot',
    targetSeat: number
  ) => {
    if (!game) return;
    const userPlayer = game.players[0]; // User is seat 1
    const result = MafiaEngine.performNightAction(chatId, userPlayer.userId, action, targetSeat);
    setLastEventMessage(result.message);
    setGame({ ...game });
    setSelectedTargetSeat(null);
    setSelectedNightAction(null);

    if (result.success && onSendBotMessage) {
      onSendBotMessage(result.message);
    }
  };

  // Advance Night to Morning
  const handleAdvanceToMorning = () => {
    if (!game) return;
    const result = MafiaEngine.endNightAndStartDay(chatId);
    setGame({ ...result.game });
    setLastEventMessage(result.casualtyReport);

    if (result.isOver) {
      confetti({ particleCount: 70, spread: 80 });
    }

    if (onSyncWithBot) {
      onSyncWithBot('cb_mafia_day_start');
    }
  };

  // Day Voting
  const handleVoteCandidate = (targetSeat: number) => {
    if (!game) return;
    const voter = game.players[0];
    MafiaEngine.voteForPlayer(chatId, voter.userId, targetSeat);

    // Simulate smart bot votes
    const aliveBots = game.players.filter((p) => p.isAlive && p.isBot);
    const candidateSeat = targetSeat;
    aliveBots.forEach((b) => {
      // 50% chance to vote for the same candidate
      if (Math.random() > 0.5) {
        MafiaEngine.voteForPlayer(chatId, b.userId, candidateSeat);
      } else {
        const randSeat = game.players.filter((p) => p.isAlive)[Math.floor(Math.random() * game.players.filter((p) => p.isAlive).length)].seatNumber;
        MafiaEngine.voteForPlayer(chatId, b.userId, randSeat);
      }
    });

    // Start Trial
    MafiaEngine.startTrial(chatId, targetSeat);
    setGame({ ...game });
    const cand = game.players.find((p) => p.seatNumber === targetSeat);
    setLastEventMessage(`صندلی ${targetSeat} (${cand?.name}) به دادگاه و میز اتهام رفت!`);

    if (onSyncWithBot) {
      onSyncWithBot(`cb_mafia_vote_${targetSeat}`);
    }
  };

  // Trial Execution
  const handleTrialVerdict = (shouldExecute: boolean) => {
    if (!game) return;
    const result = MafiaEngine.executeTrialVerdict(chatId, shouldExecute);
    setGame({ ...result.game });
    setLastEventMessage(result.message);

    if (result.game.phase === 'game_over') {
      confetti({ particleCount: 90, spread: 100 });
    }

    if (onSyncWithBot) {
      onSyncWithBot(shouldExecute ? 'cb_mafia_verdict_guilty' : 'cb_mafia_verdict_innocent');
    }
  };

  // Chat & Voice Handlers
  const handleSendChatMessage = async (text: string, isVoice: boolean = false, duration?: number) => {
    if (!game) return;
    const userSeat = 1; // Current user is Seat 1
    const newMsg = MafiaEngine.sendChatMessage(chatId, userSeat, text, isVoice, duration);
    if (newMsg) {
      setGame({ ...game });
      if (onSendBotMessage) {
        onSendBotMessage(isVoice ? `🎤 [ویس صوتی]: ${text}` : `💬 [صندلی ۱]: ${text}`);
      }
    }
  };

  const handleTriggerBotDebate = async () => {
    if (!game) return;
    const generated = MafiaEngine.simulateBotSpeeches(chatId);
    setGame({ ...game });
    if (generated.length > 0) {
      setLastEventMessage(`🗣️ مناظره بازیکنان: ${generated.length} نفر نظر دادند.`);
    }
  };

  const handleToggleVoiceCall = async (start: boolean) => {
    if (!game) return;
    MafiaEngine.toggleVoiceCall(chatId, start);
    setGame({ ...game });
    setLastEventMessage(start ? '🎙️ ویس کال زنده مافیا متصل شد.' : '🔇 ویس کال متوقف شد.');
  };

  const handleSetSpeaker = (seatNumber: number) => {
    if (!game) return;
    MafiaEngine.setVoiceSpeaker(chatId, seatNumber);
    setGame({ ...game });
  };

  // Quick reset
  const handleResetGame = () => {
    activeMafiaGames.delete(chatId);
    setGame(null);
    setLastEventMessage('');
    setSelectedTargetSeat(null);
    setSelectedNightAction(null);
  };

  const userPlayer = game?.players[0];
  const alivePlayers = game?.players.filter((p) => p.isAlive) || [];
  const aliveMafia = game?.players.filter((p) => p.isAlive && MAFIA_ROLES_CATALOG[p.role].team === 'mafia') || [];
  const aliveCitizens = game?.players.filter((p) => p.isAlive && MAFIA_ROLES_CATALOG[p.role].team === 'citizens') || [];

  return (
    <div className="bg-[#17212b] rounded-2xl border border-[#242f3d] p-5 shadow-2xl max-w-4xl mx-auto space-y-6 select-none font-['Vazirmatn',sans-serif]">
      {/* Top Header & Scenario Switcher */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#242f3d] pb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-rose-600 flex items-center justify-center shadow-lg text-white font-bold">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-base text-white">مدیر و موتور کامل بازی مافیا (Mafia Engine)</h2>
              <span className="text-[10px] bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-2 py-0.5 rounded-full font-bold">
                PUBLIC/beta ( mafia )
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              سناریوهای رسمی ۹ و ۱۲ نفره، جدول وضعیت، شلیک، استعلام، نجات، دادگاه و اعدام
            </p>
          </div>
        </div>

        {/* Quick Launch Buttons */}
        <div className="flex items-center gap-2">
          {!game ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleStartNewGame(9)}
                className="px-3.5 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>شروع بازی ۹ نفره</span>
              </button>
              <button
                onClick={() => handleStartNewGame(12)}
                className="px-3.5 py-2 bg-gradient-to-r from-purple-600 to-rose-600 hover:from-purple-500 hover:to-rose-500 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>شروع بازی ۱۲ نفره</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setRevealAllRoles(!revealAllRoles)}
                className="px-3 py-1.5 bg-[#242f3d] hover:bg-[#2e3d4e] text-slate-300 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                title="نمایش یا پنهان‌سازی نقش‌ها برای داور"
              >
                {revealAllRoles ? <EyeOff className="w-3.5 h-3.5 text-amber-400" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{revealAllRoles ? 'مخفی‌سازی نقش‌ها' : 'دید ناظر / فاش نقش‌ها'}</span>
              </button>
              <button
                onClick={handleResetGame}
                className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 rounded-xl text-xs font-medium border border-rose-500/30 flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>شروع مجدد</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Game Interface or Scenario Intro */}
      {!game ? (
        <div className="bg-[#0e1621] rounded-2xl border border-[#242f3d] p-6 text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border-2 border-indigo-500/30 flex items-center justify-center mx-auto text-3xl">
            🎭
          </div>
          <div>
            <h3 className="font-extrabold text-base text-white">هیچ بازی مافیایی در حال حاضر اجرا نیست</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-lg mx-auto leading-relaxed">
              برای آزمایش کامل سناریوها، هوش مصنوعی بازی لابی را با ۸ یا ۱۱ بات شبیه‌سازی‌شده تکمیل می‌کند تا بتوانید تک‌تک مراحل شب، روز، استعلام‌ها، شلیک‌ها و دادگاه را آزمایش فرمایید.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto text-right">
            {/* 9-player card */}
            <div
              onClick={() => handleStartNewGame(9)}
              className="p-4 bg-[#17212b] hover:bg-[#1c2a38] rounded-xl border border-[#242f3d] hover:border-indigo-500/60 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-sm text-white group-hover:text-indigo-400">سناریوی ۹ نفره</span>
                <span className="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded font-mono">9-player</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                ۲ مافیا (گادپدر + مافیا) در برابر ۷ شهروند (دکتر، کارآگاه، اسنایپر، زره‌پوش، کشیش و ۲ شهروند ساده).
              </p>
              <span className="mt-3 block text-xs text-indigo-400 font-bold">شروع این سناریو ↵</span>
            </div>

            {/* 12-player card */}
            <div
              onClick={() => handleStartNewGame(12)}
              className="p-4 bg-[#17212b] hover:bg-[#1c2a38] rounded-xl border border-[#242f3d] hover:border-purple-500/60 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-sm text-white group-hover:text-purple-400">سناریوی ۱۲ نفره</span>
                <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded font-mono">12-player</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                ۳ مافیا (گادپدر + دکتر لکتور + مافیا) در برابر ۹ شهروند (دکتر، کارآگاه، اسنایپر، زره‌پوش، تفنگدار، کشیش و ۳ شهروند).
              </p>
              <span className="mt-3 block text-xs text-purple-400 font-bold">شروع این سناریو ↵</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Status Ribbon & Phase Indicator */}
          <div className="bg-[#0e1621] p-3.5 rounded-xl border border-[#242f3d] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">وضعیت بازی:</span>
              <span
                className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 ${
                  game.phase === 'night'
                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                    : game.phase === 'trial'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    : game.phase === 'game_over'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}
              >
                {game.phase === 'night' && <Moon className="w-3.5 h-3.5" />}
                {game.phase === 'day_discussion' && <Sun className="w-3.5 h-3.5" />}
                {game.phase === 'trial' && <Gavel className="w-3.5 h-3.5" />}
                {game.phase === 'game_over' && <Award className="w-3.5 h-3.5" />}
                <span>
                  {game.phase === 'night'
                    ? `🌑 فاز شب ${game.dayCount}`
                    : game.phase === 'trial'
                    ? `⚖️ میز دادگاه و اتهام`
                    : game.phase === 'game_over'
                    ? `🏆 بازی پایان یافته`
                    : `☀️ روز ${game.dayCount} - گفتگوی آزاد`}
                </span>
              </span>
            </div>

            {/* Team Counter */}
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1 font-bold text-rose-400">
                <span>🔴 مافیا زنده:</span>
                <span className="font-mono">{aliveMafia.length}</span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 font-bold text-emerald-400">
                <span>🟢 شهروند زنده:</span>
                <span className="font-mono">{aliveCitizens.length}</span>
              </span>
            </div>
          </div>

          {/* User's Own Role Card */}
          {userPlayer && (
            <div className="bg-gradient-to-r from-indigo-950/60 via-[#17212b] to-purple-950/60 p-4 rounded-xl border border-indigo-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
              <div className="flex items-center gap-3">
                <span className="text-3xl p-2 bg-[#242f3d] rounded-xl border border-indigo-400/30">
                  {MAFIA_ROLES_CATALOG[userPlayer.role].emoji}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">نقش محرمانه صندلی شما (شماره ۱):</span>
                    <span className="font-extrabold text-white text-sm">
                      {MAFIA_ROLES_CATALOG[userPlayer.role].name}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                        MAFIA_ROLES_CATALOG[userPlayer.role].team === 'mafia'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      }`}
                    >
                      {MAFIA_ROLES_CATALOG[userPlayer.role].team === 'mafia' ? 'تیم مافیا' : 'تیم شهروندان'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1">
                    {MAFIA_ROLES_CATALOG[userPlayer.role].description}
                  </p>
                </div>
              </div>

              {/* Status Badge */}
              <div className="text-left shrink-0">
                <span
                  className={`text-xs px-2.5 py-1 rounded-lg font-bold ${
                    userPlayer.isAlive
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  }`}
                >
                  {userPlayer.isAlive ? '🟢 شما زنده هستید' : '💀 شما کشته شده‌اید'}
                </span>
              </div>
            </div>
          )}

          {/* Interactive Seats Grid (table.php visual recreation) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-xs text-slate-300 flex items-center gap-1.5">
                <span>🪑 جدول صندلی‌های بازی ({game.mode} نفره):</span>
                <span className="text-[10px] text-slate-500 font-mono">(table.php)</span>
              </h4>
              <span className="text-[11px] text-slate-400">
                روی هر صندلی کلیک کنید تا در رای‌گیری یا اکشن شب انتخاب شود
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
              {game.players.map((p) => {
                const roleDef = MAFIA_ROLES_CATALOG[p.role];
                const isUser = p.seatNumber === 1;
                const isRoleVisible = isUser || revealAllRoles || !p.isAlive;
                const isTargeted = selectedTargetSeat === p.seatNumber;

                return (
                  <div
                    key={p.seatNumber}
                    onClick={() => {
                      if (!p.isAlive) return;
                      setSelectedTargetSeat(p.seatNumber);
                    }}
                    className={`p-3 rounded-xl border transition-all text-right relative overflow-hidden cursor-pointer ${
                      !p.isAlive
                        ? 'bg-[#121922]/80 border-slate-800 opacity-55'
                        : isTargeted
                        ? 'bg-[#1e2f42] border-[#0088cc] shadow-md ring-2 ring-[#0088cc]/30'
                        : 'bg-[#0e1621] hover:bg-[#162331] border-[#242f3d]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-slate-200">صندلی [{p.seatNumber}]</span>
                      <span className="text-xl">
                        {isRoleVisible ? roleDef.emoji : '👤'}
                      </span>
                    </div>

                    <div className="font-bold text-xs text-white truncate flex items-center gap-1">
                      <span>{p.name}</span>
                      {isUser && <span className="text-[10px] text-indigo-400 font-normal">(شما)</span>}
                    </div>

                    <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                      {isRoleVisible ? (
                        <span className={roleDef.team === 'mafia' ? 'text-rose-400 font-semibold' : 'text-emerald-400'}>
                          {roleDef.name}
                        </span>
                      ) : (
                        <span>نقش محرمانه</span>
                      )}
                    </div>

                    {/* Status & Badges */}
                    <div className="mt-2 pt-1.5 border-t border-[#1c2a38] flex items-center justify-between text-[10px]">
                      <span className={p.isAlive ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                        {p.isAlive ? '🟢 زنده' : '💀 حذف شده'}
                      </span>
                      {p.hasArmor && (
                        <span className="bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded font-bold">
                          🛡️ زره
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Phase Specific Interactive Controls */}
          {game.phase === 'night' && userPlayer?.isAlive && (
            <div className="bg-[#0e1621] p-4 rounded-xl border border-indigo-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Moon className="w-4 h-4 text-indigo-400" />
                  <h5 className="font-bold text-xs text-white">اقدامات شبانه اختصاصی نقش شما:</h5>
                </div>
                {selectedTargetSeat && (
                  <span className="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded font-bold">
                    هدف انتخاب‌شده: صندلی {selectedTargetSeat}
                  </span>
                )}
              </div>

              {/* Action buttons depending on role */}
              <div className="flex flex-wrap gap-2 text-xs">
                {(userPlayer.role === 'godfather' || userPlayer.role === 'mafia_simple') && (
                  <button
                    disabled={!selectedTargetSeat}
                    onClick={() => selectedTargetSeat && handleExecuteNightAction('shoot', selectedTargetSeat)}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white rounded-lg font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Crosshair className="w-4 h-4" />
                    <span>شلیک مافیا به صندلی {selectedTargetSeat || '...'}</span>
                  </button>
                )}

                {userPlayer.role === 'doctor' && (
                  <button
                    disabled={!selectedTargetSeat}
                    onClick={() => selectedTargetSeat && handleExecuteNightAction('save', selectedTargetSeat)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-lg font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <HeartPulse className="w-4 h-4" />
                    <span>نجات پزشکی صندلی {selectedTargetSeat || '...'}</span>
                  </button>
                )}

                {userPlayer.role === 'detective' && (
                  <button
                    disabled={!selectedTargetSeat}
                    onClick={() => selectedTargetSeat && handleExecuteNightAction('inquire', selectedTargetSeat)}
                    className="px-4 py-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white rounded-lg font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Search className="w-4 h-4" />
                    <span>استعلام هویت صندلی {selectedTargetSeat || '...'}</span>
                  </button>
                )}

                {userPlayer.role === 'sniper' && (
                  <button
                    disabled={!selectedTargetSeat}
                    onClick={() => selectedTargetSeat && handleExecuteNightAction('sniper_shoot', selectedTargetSeat)}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white rounded-lg font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Crosshair className="w-4 h-4" />
                    <span>شلیک تک‌تیرانداز به صندلی {selectedTargetSeat || '...'}</span>
                  </button>
                )}

                {userPlayer.role === 'citizen' && (
                  <span className="text-xs text-slate-400 py-2">
                    شما شهروند ساده هستید و شب‌ها استراحت می‌فرمایید.
                  </span>
                )}

                <button
                  onClick={handleAdvanceToMorning}
                  className="px-5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white rounded-lg font-bold flex items-center gap-1.5 mr-auto cursor-pointer shadow-md"
                >
                  <Sun className="w-4 h-4" />
                  <span>پایان شب و طلوع صبح ↵</span>
                </button>
              </div>
            </div>
          )}

          {/* Day Discussion & Voting Phase Controls */}
          {game.phase === 'day_discussion' && (
            <div className="bg-[#0e1621] p-4 rounded-xl border border-amber-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sun className="w-4 h-4 text-amber-400" />
                  <h5 className="font-bold text-xs text-white">فاز روز، گفتگو و رای‌گیری خروج:</h5>
                </div>
                {selectedTargetSeat && (
                  <span className="text-xs bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-bold">
                    مظنون انتخاب‌شده: صندلی {selectedTargetSeat}
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                روی صندلی مظنون در جدول بالا کلیک کرده و دکمه «رای به ورود به دادگاه» را بزنید.
              </p>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  disabled={!selectedTargetSeat}
                  onClick={() => selectedTargetSeat && handleVoteCandidate(selectedTargetSeat)}
                  className="px-4 py-2 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 disabled:opacity-40 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <Vote className="w-4 h-4" />
                  <span>رای به فرستادن صندلی {selectedTargetSeat || '...'} به دادگاه</span>
                </button>

                <button
                  onClick={() => handleStartNewGame(selectedMode)}
                  className="px-3.5 py-2 bg-[#242f3d] hover:bg-[#2e3d4e] text-slate-300 rounded-lg text-xs font-medium mr-auto"
                >
                  دست بعدی
                </button>
              </div>
            </div>
          )}

          {/* Trial Verdict Controls */}
          {game.phase === 'trial' && (
            <div className="bg-[#0e1621] p-4 rounded-xl border border-rose-500/40 space-y-3">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-xs">
                <Gavel className="w-4 h-4" />
                <span>میز محاکمه و دادگاه نهایی (متهم: صندلی {game.trialCandidateId ? game.players.find((p) => p.userId === game.trialCandidateId)?.seatNumber : ''})</span>
              </div>

              <div className="p-3 bg-[#17212b] rounded-lg border border-[#242f3d] text-xs text-slate-300 italic">
                🗣️ دفاعیه متهم: «شهروندان گرامی! من شهروند معتمد این شهرم و تمام آرا و تارگت‌هایم به نفع شهر بوده است. لطفاً مرا اعدام نکنید!»
              </div>

              <div className="flex items-center gap-3 pt-1">
                <button
                  onClick={() => handleTrialVerdict(true)}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
                >
                  <Skull className="w-4 h-4" />
                  <span>تایید اعدام و خروج (رای مثبت 👍)</span>
                </button>
                <button
                  onClick={() => handleTrialVerdict(false)}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>بخشش و تبرئه (رای منفی 👎)</span>
                </button>
              </div>
            </div>
          )}

          {/* Game Over Banner */}
          {game.phase === 'game_over' && (
            <div className="bg-gradient-to-r from-amber-950/60 via-[#17212b] to-indigo-950/60 p-5 rounded-2xl border border-amber-500/40 text-center space-y-3 shadow-xl">
              <div className="text-4xl">
                {game.winner === 'citizens' ? '🎉' : '🎩'}
              </div>
              <h3 className="font-black text-lg text-white">
                {game.winner === 'citizens' ? 'پیروزی قاطع تیم شهروندان!' : 'پیروزی قاطع تیم مافیا!'}
              </h3>
              <p className="text-xs text-slate-300 max-w-md mx-auto">
                {game.winner === 'citizens'
                  ? 'تمامی اعضای تیم مافیا با هوشمندی شهروندان شناسایی و حذف گردیدند.'
                  : 'تعداد اعضای مافیا برابر با شهروندان شد و شهر به کنترل مافیا درآمد.'}
              </p>
              <button
                onClick={() => handleStartNewGame(selectedMode)}
                className="px-6 py-2.5 bg-[#0088cc] hover:bg-[#0099e6] text-white rounded-xl text-xs font-bold shadow-lg cursor-pointer inline-flex items-center gap-1.5"
              >
                <RotateCcw className="w-4 h-4" />
                <span>شروع یک بازی تازه</span>
              </button>
            </div>
          )}

          {/* Live Game Event Log Box */}
          {lastEventMessage && (
            <div className="p-3 bg-[#0e1621] rounded-xl border border-indigo-500/20 text-xs text-indigo-300 flex items-center gap-2">
              <Sparkles className="w-4 h-4 shrink-0 text-amber-400" />
              <span>{lastEventMessage}</span>
            </div>
          )}

          {/* Integrated Mafia Chat and Live Group Voice Call Panel */}
          <MafiaChatAndVoice
            game={game}
            userSeat={1}
            onSendMessage={handleSendChatMessage}
            onTriggerBotDebate={handleTriggerBotDebate}
            onToggleVoiceCall={handleToggleVoiceCall}
            onSetSpeaker={handleSetSpeaker}
          />
        </div>
      )}
    </div>
  );
};
