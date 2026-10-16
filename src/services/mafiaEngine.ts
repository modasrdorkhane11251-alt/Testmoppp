/**
 * Mafia Game Engine - Faithful Implementation of `beta ( mafia )`
 * Implements:
 * - 9-player scenario (`9-player-game.php`)
 * - 12-player scenario (`12-player-game.php`)
 * - Role dispatching, abilities, night actions, morning report
 * - Day discussion, voting, trial, defense, execution
 * - Victory condition checks and status tables (`table.php`, `button.php`)
 */

import { TelegramUser, InlineKeyboardMarkup } from '../types/telegram';

export type MafiaRoleKey =
  | 'godfather' // گادپدر / رئیس مافیا
  | 'mafia_simple' // مافیای ساده
  | 'dr_lector' // دکتر لکتور (سناریو ۱۲ نفره)
  | 'doctor' // دکتر شهر
  | 'detective' // کارآگاه
  | 'sniper' // تک‌تیرانداز
  | 'armored' // زره‌پوش
  | 'priest' // کشیش
  | 'gunner' // تفنگدار
  | 'citizen'; // شهروند ساده

export interface RoleDefinition {
  key: MafiaRoleKey;
  name: string;
  emoji: string;
  team: 'mafia' | 'citizens';
  description: string;
  nightAbility?: string;
  hasNightAction: boolean;
}

export const MAFIA_ROLES_CATALOG: Record<MafiaRoleKey, RoleDefinition> = {
  godfather: {
    key: 'godfather',
    name: 'گادپدر (رئیس مافیا)',
    emoji: '🎩',
    team: 'mafia',
    description: 'رهبر شبکه مافیا. شلیک شب را نهایی می‌کند و استعلام کارآگاه برای او همواره منفی (شهروند) است!',
    nightAbility: 'شلیک مستقیم به شهروندان در شب',
    hasNightAction: true,
  },
  mafia_simple: {
    key: 'mafia_simple',
    name: 'مافیای ساده',
    emoji: '🕶️',
    team: 'mafia',
    description: 'عضو تیم مافیا که با گادپدر همکاری می‌کند. اگر گادپدر کشته شود، حق تیر شب به او منتقل می‌شود.',
    nightAbility: 'همفکری و شلیک جایگزین',
    hasNightAction: true,
  },
  dr_lector: {
    key: 'dr_lector',
    name: 'دکتر لکتور',
    emoji: '💉',
    team: 'mafia',
    description: 'پزشک گروه مافیا در سناریوی ۱۲ نفره. می‌تواند یک مافیا را از شلیک اسنایپر نجات دهد.',
    nightAbility: 'نجات جان اعضای مافیا از تیر اسنایپر',
    hasNightAction: true,
  },
  doctor: {
    key: 'doctor',
    name: 'دکتر شهر',
    emoji: '👨‍⚕️',
    team: 'citizens',
    description: 'پزشک فداکار شهر. هر شب جان یک نفر را از شلیک مافیا نجات می‌دهد. خودش را حداکثر ۲ بار می‌تواند نجات دهد.',
    nightAbility: 'نجات پزشکی شبانه',
    hasNightAction: true,
  },
  detective: {
    key: 'detective',
    name: 'کارآگاه',
    emoji: '🔍',
    team: 'citizens',
    description: 'هر شب از گرداننده (بات) استعلام هویت یک بازیکن را می‌گیرد. استعلام گادپدر برای او منفی است.',
    nightAbility: 'استعلام هویت بازیکنان',
    hasNightAction: true,
  },
  sniper: {
    key: 'sniper',
    name: 'تک‌تیرانداز (اسنایپر)',
    emoji: '🎯',
    team: 'citizens',
    description: 'مسلح به تفنگ جنگی. اگر به مافیا شلیک کند مافیا حذف می‌شود؛ اگر به شهروند شلیک کند خودش از بازی حذف می‌شود!',
    nightAbility: 'شلیک شبانه مستقل',
    hasNightAction: true,
  },
  armored: {
    key: 'armored',
    name: 'زره‌پوش',
    emoji: '🛡️',
    team: 'citizens',
    description: 'دارای جلیقه ضد گلوله. با اولین تیر مافیا در شب کشته نمی‌شود و فقط زره خود را از دست می‌دهد.',
    nightAbility: 'مقاومت در برابر تیر اول',
    hasNightAction: false,
  },
  priest: {
    key: 'priest',
    name: 'کشیش',
    emoji: '⛪',
    team: 'citizens',
    description: 'هر شب می‌تواند یک نفر را تطهیر کرده یا اثرات منفی مافیا را خنثی سازد.',
    nightAbility: 'تطهیر و بخشش شبانه',
    hasNightAction: true,
  },
  gunner: {
    key: 'gunner',
    name: 'تفنگدار',
    emoji: '🔫',
    team: 'citizens',
    description: 'در طول بازی ۲ تیر (یکی جنگی و یکی مشقی) در اختیار دارد که می‌تواند به بازیکنان اهدا کند.',
    nightAbility: 'اهدای تفنگ در روز',
    hasNightAction: false,
  },
  citizen: {
    key: 'citizen',
    name: 'شهروند ساده',
    emoji: '👥',
    team: 'citizens',
    description: 'سلاح شما هوش، صحبت در روز و رای دادن به مافیا در دادگاه است.',
    nightAbility: 'خواب آرام در شب',
    hasNightAction: false,
  },
};

export interface MafiaGamePlayer {
  seatNumber: number;
  userId: number;
  name: string;
  username?: string;
  isBot: boolean;
  role: MafiaRoleKey;
  isAlive: boolean;
  hasArmor: boolean;
  doctorSelfSavesLeft: number;
  votedCandidateId?: number;
}

export type MafiaPhase =
  | 'lobby'
  | 'role_reveal'
  | 'night'
  | 'morning'
  | 'day_discussion'
  | 'voting'
  | 'trial'
  | 'game_over';

export interface MafiaChatMessage {
  id: string;
  senderSeat: number;
  senderName: string;
  senderRole?: string;
  senderAvatarEmoji?: string;
  text: string;
  timestamp: string;
  isVoiceNote?: boolean;
  voiceDurationSec?: number;
  isBot?: boolean;
}

export interface MafiaVoiceCallParticipant {
  seatNumber: number;
  name: string;
  isSpeaking: boolean;
  isMuted: boolean;
  audioWave: number[];
  speakingDurationSec?: number;
}

export interface FullMafiaGame {
  id: string;
  chatId: number;
  mode: 9 | 12;
  phase: MafiaPhase;
  dayCount: number;
  players: MafiaGamePlayer[];
  logs: string[];
  winner?: 'citizens' | 'mafia';
  chatMessages: MafiaChatMessage[];
  voiceCall: {
    isActive: boolean;
    activeSpeakerSeat?: number;
    participants: MafiaVoiceCallParticipant[];
    startedAt?: number;
  };
  nightDecisions: {
    mafiaKillTargetId?: number;
    doctorSaveTargetId?: number;
    detectiveInquiryTargetId?: number;
    sniperShotTargetId?: number;
    lectorSaveTargetId?: number;
  };
  nightCasualty?: {
    playerId: number;
    reason: string;
  };
  trialCandidateId?: number;
  trialVotes: {
    guilty: number;
    innocent: number;
  };
}

// In-Memory store for all Mafia games
export const activeMafiaGames: Map<number, FullMafiaGame> = new Map();

export class MafiaEngine {
  // 1. Create a Lobby
  static createLobby(chatId: number, mode: 9 | 12, hostUser: TelegramUser): FullMafiaGame {
    const game: FullMafiaGame = {
      id: `mafia_${Date.now()}`,
      chatId,
      mode,
      phase: 'lobby',
      dayCount: 1,
      players: [
        {
          seatNumber: 1,
          userId: hostUser.id,
          name: hostUser.first_name || 'میزبان',
          username: hostUser.username,
          isBot: false,
          role: 'citizen',
          isAlive: true,
          hasArmor: false,
          doctorSelfSavesLeft: 2,
        },
      ],
      logs: [`لابی بازی ${mode} نفره توسط ${hostUser.first_name} ایجاد شد.`],
      chatMessages: [
        {
          id: 'm_welcome',
          senderSeat: 0,
          senderName: 'گاد بازی (سیستم)',
          senderAvatarEmoji: '🎙️',
          text: `به اتاق صوتی و چت زنده بازی مافیا خوش آمدید! بازیکنان می‌توانند در فاز روز صحبت کنند و ویس بگذارند.`,
          timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
        },
      ],
      voiceCall: {
        isActive: false,
        participants: [],
      },
      nightDecisions: {},
      trialVotes: { guilty: 0, innocent: 0 },
    };
    activeMafiaGames.set(chatId, game);
    return game;
  }

  // 2. Fill with Smart Simulated Bot Players (Instant 1-Click Testing)
  static fillWithSimulatedPlayers(chatId: number): FullMafiaGame {
    let game = activeMafiaGames.get(chatId);
    if (!game) {
      game = this.createLobby(chatId, 9, { id: 12345678, first_name: 'شما' });
    }

    const persianBotNames = [
      'سروش', 'مهسا', 'آرش', 'نیلوفر', 'کامران',
      'الناز', 'بهرام', 'پویا', 'نازنین', 'شایان', 'سارا'
    ];

    while (game.players.length < game.mode) {
      const idx = game.players.length;
      const bName = persianBotNames[(idx - 1) % persianBotNames.length];
      game.players.push({
        seatNumber: idx + 1,
        userId: 9000 + idx,
        name: bName,
        username: `bot_${idx}`,
        isBot: true,
        role: 'citizen',
        isAlive: true,
        hasArmor: false,
        doctorSelfSavesLeft: 2,
      });
    }

    game.logs.push(`لابی با موفقیت تکمیل شد (${game.players.length}/${game.mode}).`);
    return this.startGame(chatId);
  }

  // 3. Start Game & Role Assignment
  static startGame(chatId: number): FullMafiaGame {
    const game = activeMafiaGames.get(chatId);
    if (!game) throw new Error('بازی یافت نشد.');

    // Prepare role distribution according to 9-player or 12-player scenario
    let scenarioRoles: MafiaRoleKey[] = [];
    if (game.mode === 9) {
      scenarioRoles = [
        'godfather',
        'mafia_simple',
        'doctor',
        'detective',
        'sniper',
        'armored',
        'priest',
        'citizen',
        'citizen',
      ];
    } else {
      scenarioRoles = [
        'godfather',
        'dr_lector',
        'mafia_simple',
        'doctor',
        'detective',
        'sniper',
        'armored',
        'gunner',
        'priest',
        'citizen',
        'citizen',
        'citizen',
      ];
    }

    // Shuffle roles randomly
    const shuffled = [...scenarioRoles].sort(() => Math.random() - 0.5);

    game.players.forEach((player, index) => {
      player.role = shuffled[index];
      player.hasArmor = player.role === 'armored';
      player.isAlive = true;
    });

    game.phase = 'night';
    game.dayCount = 1;
    game.logs.push(`بازی با موفقیت شروع شد. نقش‌ها اختصاص داده شدند و شب اول فرا رسید.`);
    return game;
  }

  // 4. Night Action Dispatcher
  static performNightAction(
    chatId: number,
    actorId: number,
    action: 'shoot' | 'save' | 'inquire' | 'sniper_shoot',
    targetSeatNumber: number
  ): { success: boolean; message: string } {
    const game = activeMafiaGames.get(chatId);
    if (!game || game.phase !== 'night') {
      return { success: false, message: 'بازی در فاز شب نیست.' };
    }

    const actor = game.players.find((p) => p.userId === actorId);
    const target = game.players.find((p) => p.seatNumber === targetSeatNumber);

    if (!actor || !actor.isAlive) {
      return { success: false, message: 'شما زنده نیستید یا در بازی حضور ندارید.' };
    }
    if (!target || !target.isAlive) {
      return { success: false, message: 'هدف موردنظر در بازی زنده نیست.' };
    }

    if (action === 'shoot' && (actor.role === 'godfather' || actor.role === 'mafia_simple')) {
      game.nightDecisions.mafiaKillTargetId = target.userId;
      game.logs.push(`مافیا بازیکن شماره ${target.seatNumber} (${target.name}) را نشانه گرفت.`);
      return { success: true, message: `🎯 شلیک مافیا به شماره ${target.seatNumber} (${target.name}) ثبت شد.` };
    }

    if (action === 'save' && actor.role === 'doctor') {
      if (target.userId === actor.userId) {
        if (actor.doctorSelfSavesLeft <= 0) {
          return { success: false, message: 'شما فرصت نجات خود را مصرف کرده‌اید!' };
        }
        actor.doctorSelfSavesLeft--;
      }
      game.nightDecisions.doctorSaveTargetId = target.userId;
      game.logs.push(`دکتر بازیکن شماره ${target.seatNumber} (${target.name}) را نجات داد.`);
      return { success: true, message: `💉 نجات پزشکی برای شماره ${target.seatNumber} (${target.name}) ثبت شد.` };
    }

    if (action === 'inquire' && actor.role === 'detective') {
      game.nightDecisions.detectiveInquiryTargetId = target.userId;
      // Godfather returns negative inquiry
      const isPositive = target.role === 'mafia_simple' || target.role === 'dr_lector';
      const resultText = isPositive ? '🟢 مثبت (مافیا است)' : '🔴 منفی (شهروند یا گادپدر)';
      game.logs.push(`کارآگاه از شماره ${target.seatNumber} (${target.name}) استعلام گرفت: ${resultText}`);
      return {
        success: true,
        message: `🔍 نتیجه استعلام از شماره ${target.seatNumber} (${target.name}): **${resultText}**`,
      };
    }

    if (action === 'sniper_shoot' && actor.role === 'sniper') {
      game.nightDecisions.sniperShotTargetId = target.userId;
      return { success: true, message: `🎯 تیر اسنایپر به سمت شماره ${target.seatNumber} (${target.name}) شلیک شد.` };
    }

    return { success: false, message: 'عملیات نامعتبر است.' };
  }

  // 5. Calculate Night Results & Advance to Morning Phase
  static endNightAndStartDay(chatId: number): {
    game: FullMafiaGame;
    casualtyReport: string;
    isOver: boolean;
  } {
    const game = activeMafiaGames.get(chatId);
    if (!game) throw new Error('بازی یافت نشد.');

    // If simulated bots need to act:
    if (!game.nightDecisions.mafiaKillTargetId) {
      // Pick random citizen target
      const citizenTargets = game.players.filter((p) => p.isAlive && MAFIA_ROLES_CATALOG[p.role].team === 'citizens');
      if (citizenTargets.length > 0) {
        const randT = citizenTargets[Math.floor(Math.random() * citizenTargets.length)];
        game.nightDecisions.mafiaKillTargetId = randT.userId;
      }
    }
    if (!game.nightDecisions.doctorSaveTargetId) {
      const aliveOnes = game.players.filter((p) => p.isAlive);
      const randD = aliveOnes[Math.floor(Math.random() * aliveOnes.length)];
      game.nightDecisions.doctorSaveTargetId = randD.userId;
    }

    let killedPlayer: MafiaGamePlayer | undefined;
    let casualtyReason = '';

    // Check Mafia Shot
    if (game.nightDecisions.mafiaKillTargetId) {
      const target = game.players.find((p) => p.userId === game.nightDecisions.mafiaKillTargetId);
      if (target && target.userId !== game.nightDecisions.doctorSaveTargetId) {
        if (target.hasArmor) {
          target.hasArmor = false;
          game.logs.push(`تیر مافیا به شماره ${target.seatNumber} (${target.name}) اصابت کرد اما زره او مانع مرگش شد!`);
        } else {
          target.isAlive = false;
          killedPlayer = target;
          casualtyReason = 'شلیک شبانه مافیا';
          game.logs.push(`شماره ${target.seatNumber} (${target.name}) در شب کشته شد.`);
        }
      } else if (target && target.userId === game.nightDecisions.doctorSaveTargetId) {
        game.logs.push(`دکتر موفق شد شماره ${target.seatNumber} (${target.name}) را از مرگ نجات دهد!`);
      }
    }

    // Check Sniper Shot
    if (game.nightDecisions.sniperShotTargetId) {
      const target = game.players.find((p) => p.userId === game.nightDecisions.sniperShotTargetId);
      const sniper = game.players.find((p) => p.role === 'sniper' && p.isAlive);
      if (target && sniper) {
        if (MAFIA_ROLES_CATALOG[target.role].team === 'mafia') {
          target.isAlive = false;
          game.logs.push(`تیر اسنایپر به مافیا (شماره ${target.seatNumber}) اصابت کرد و او را هلاک ساخت!`);
        } else {
          sniper.isAlive = false;
          game.logs.push(`اسنایپر به شهروند شلیک کرد و خودش از بازی حذف شد!`);
        }
      }
    }

    game.phase = 'day_discussion';
    game.nightCasualty = killedPlayer ? { playerId: killedPlayer.userId, reason: casualtyReason } : undefined;

    // Reset night decisions
    game.nightDecisions = {};

    const winStatus = this.checkWinCondition(game);
    const casualtyReport = killedPlayer
      ? `💀 متاسفانه دیشب شماره **${killedPlayer.seatNumber} (${killedPlayer.name})** با شلیک مافیا کشته شد و از بازی رفت!`
      : `💚 دیشب با درایت دکتر، هیچ کشته‌ای نداشتیم و شهر بدون تلفات بیدار شد!`;

    return {
      game,
      casualtyReport,
      isOver: !!winStatus,
    };
  }

  // 6. Day Voting on Suspects
  static voteForPlayer(chatId: number, voterId: number, targetSeatNumber: number): FullMafiaGame {
    const game = activeMafiaGames.get(chatId);
    if (!game) throw new Error('بازی یافت نشد.');

    const voter = game.players.find((p) => p.userId === voterId);
    const target = game.players.find((p) => p.seatNumber === targetSeatNumber);

    if (voter && target && voter.isAlive && target.isAlive) {
      voter.votedCandidateId = target.userId;
      game.logs.push(`شماره ${voter.seatNumber} (${voter.name}) به شماره ${target.seatNumber} (${target.name}) رای داد.`);
    }

    return game;
  }

  // 7. Send Candidate to Trial (دادگاه و دفاعیه)
  static startTrial(chatId: number, candidateSeatNumber: number): FullMafiaGame {
    const game = activeMafiaGames.get(chatId);
    if (!game) throw new Error('بازی یافت نشد.');
    const candidate = game.players.find((p) => p.seatNumber === candidateSeatNumber);
    if (candidate) {
      game.trialCandidateId = candidate.userId;
      game.phase = 'trial';
      game.trialVotes = { guilty: 0, innocent: 0 };
      game.logs.push(`شماره ${candidate.seatNumber} (${candidate.name}) به عنوان متهم اصلی به دادگاه فراخوانده شد.`);
    }
    return game;
  }

  // 8. Execute Trial Verdict
  static executeTrialVerdict(chatId: number, shouldExecute: boolean): { game: FullMafiaGame; message: string } {
    const game = activeMafiaGames.get(chatId);
    if (!game) throw new Error('بازی یافت نشد.');

    const candidate = game.players.find((p) => p.userId === game.trialCandidateId);
    if (!candidate) return { game, message: 'متهمی در دادگاه نیست.' };

    let msg = '';
    if (shouldExecute) {
      candidate.isAlive = false;
      const roleDef = MAFIA_ROLES_CATALOG[candidate.role];
      msg = `⚖️ **حکم اجرا شد!**\nشماره ${candidate.seatNumber} (${candidate.name}) با رای اکثریت اعدام شد.\nنقش وی: **${roleDef.emoji} ${roleDef.name}** بود.`;
      game.logs.push(`شماره ${candidate.seatNumber} (${candidate.name}) اعدام شد. نقش: ${roleDef.name}`);
    } else {
      msg = `🕊️ **تبرئه شد!**\nشماره ${candidate.seatNumber} (${candidate.name}) با رای شهروندان بخشیده شد و در بازی باقی ماند.`;
      game.logs.push(`شماره ${candidate.seatNumber} (${candidate.name}) در دادگاه تبرئه شد.`);
    }

    game.trialCandidateId = undefined;
    game.phase = 'night';
    game.dayCount++;

    this.checkWinCondition(game);
    return { game, message: msg };
  }

  // 9. Win Condition Verifier
  static checkWinCondition(game: FullMafiaGame): 'citizens' | 'mafia' | null {
    const aliveMafia = game.players.filter((p) => p.isAlive && MAFIA_ROLES_CATALOG[p.role].team === 'mafia');
    const aliveCitizens = game.players.filter((p) => p.isAlive && MAFIA_ROLES_CATALOG[p.role].team === 'citizens');

    if (aliveMafia.length === 0) {
      game.winner = 'citizens';
      game.phase = 'game_over';
      game.logs.push('🏆 پیروزی قاطع شهروندان! تمام اعضای مافیا حذف شدند.');
      return 'citizens';
    }

    if (aliveMafia.length >= aliveCitizens.length) {
      game.winner = 'mafia';
      game.phase = 'game_over';
      game.logs.push('🎩 پیروزی تیم مافیا! تعداد مافیا برابر یا بیشتر از شهروندان شد.');
      return 'mafia';
    }

    return null;
  }

  // 10. Generate Visual Telegram Table (`table.php` representation)
  static generateStatusTable(game: FullMafiaGame): string {
    const aliveCount = game.players.filter((p) => p.isAlive).length;
    const deadCount = game.players.length - aliveCount;

    let tableText = `📋 **جدول وضعیت بازیکنان مافیا (${game.mode} نفره) - فاز ${game.dayCount}**\n`;
    tableText += `👥 زنده: **${aliveCount}** | 💀 حذف‌شده: **${deadCount}**\n\n`;

    game.players.forEach((p) => {
      const statusIcon = p.isAlive ? '🟢 زنده' : '🔴 حذف';
      const armorBadge = p.hasArmor ? ' 🛡️' : '';
      tableText += `صندلی [${p.seatNumber}]: ${p.name} (${statusIcon}${armorBadge})\n`;
    });

    return tableText;
  }

  // 11. Send Chat Message in Mafia
  static sendChatMessage(
    chatId: number,
    senderSeat: number,
    text: string,
    isVoiceNote: boolean = false,
    voiceDurationSec?: number
  ): MafiaChatMessage | null {
    const game = activeMafiaGames.get(chatId);
    if (!game) return null;

    const sender = game.players.find((p) => p.seatNumber === senderSeat);
    const senderName = sender ? sender.name : (senderSeat === 0 ? 'گاد بازی' : `صندلی ${senderSeat}`);
    const senderRole = sender ? MAFIA_ROLES_CATALOG[sender.role].name : undefined;

    const newMsg: MafiaChatMessage = {
      id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      senderSeat,
      senderName,
      senderRole,
      senderAvatarEmoji: sender ? (MAFIA_ROLES_CATALOG[sender.role].team === 'mafia' ? '🕶️' : '👤') : '🎙️',
      text,
      timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
      isVoiceNote,
      voiceDurationSec: isVoiceNote ? voiceDurationSec || Math.floor(Math.random() * 8 + 3) : undefined,
      isBot: sender ? sender.isBot : false,
    };

    if (!game.chatMessages) game.chatMessages = [];
    game.chatMessages.push(newMsg);

    // If active voice call, mark sender as speaking briefly
    if (game.voiceCall && game.voiceCall.isActive && senderSeat > 0) {
      game.voiceCall.activeSpeakerSeat = senderSeat;
      const part = game.voiceCall.participants.find((p) => p.seatNumber === senderSeat);
      if (part) {
        part.isSpeaking = true;
      }
    }

    return newMsg;
  }

  // 12. Trigger Dynamic Bot Discussion & Accusations (Day Phase Speech Simulation)
  static simulateBotSpeeches(chatId: number): MafiaChatMessage[] {
    const game = activeMafiaGames.get(chatId);
    if (!game) return [];

    const aliveBots = game.players.filter((p) => p.isAlive && p.isBot);
    if (aliveBots.length === 0) return [];

    const speechTemplates = [
      (speaker: string, target: string) => `من از بازی دیشب و رفتارهای ${target} حس خوبی ندارم، تارگت اول من صندلی ایشونه!`,
      (speaker: string, target: string) => `به نظرم ${target} خیلی محتاط و سایلنت بازی می‌کنه، سایلنت بودن تو مافیا مشکوکه!`,
      (speaker: string, _target: string) => `شهروندان عزیز لطفاً هیجانی رای ندید، باید تارگت‌های معقول و منطقی بزنیم.`,
      (speaker: string, target: string) => `من به دفاعیه ${target} گوش دادم ولی اصلاً قانع‌کننده نبود؛ از نظر من مافیاست.`,
      (speaker: string, target: string) => `استدلال‌های ${target} کاملاً فکت‌محوره، من باهاش هم‌پوشانی دارم و سفیدش می‌دونم.`,
      (speaker: string, _target: string) => `من به عنوان یک شهروند مستقل، می‌خوام مسیر بازی باز بشه و دست مافیا رو رو کنیم.`,
      (speaker: string, target: string) => `صندلی ${target} داره جو رو متشنج می‌کنه تا مافیا توی شلوغی پنهان بشه!`,
    ];

    const generated: MafiaChatMessage[] = [];
    // Pick 2-3 bots to speak
    const selectedBots = [...aliveBots].sort(() => Math.random() - 0.5).slice(0, Math.min(3, aliveBots.length));

    selectedBots.forEach((bot, idx) => {
      const aliveOthers = game.players.filter((p) => p.isAlive && p.seatNumber !== bot.seatNumber);
      const target = aliveOthers[Math.floor(Math.random() * aliveOthers.length)];
      const targetLabel = target ? `صندلی [${target.seatNumber}: ${target.name}]` : 'بازیکنان';
      const template = speechTemplates[Math.floor(Math.random() * speechTemplates.length)];
      const speechText = template(bot.name, targetLabel);

      const isVoice = Math.random() > 0.4; // 60% chance to drop voice note
      const msg = this.sendChatMessage(chatId, bot.seatNumber, speechText, isVoice, Math.floor(Math.random() * 6 + 4));
      if (msg) generated.push(msg);
    });

    return generated;
  }

  // 13. Voice Call Controls
  static toggleVoiceCall(chatId: number, start: boolean): FullMafiaGame['voiceCall'] {
    const game = activeMafiaGames.get(chatId);
    if (!game) throw new Error('بازی یافت نشد.');

    if (!game.voiceCall) {
      game.voiceCall = { isActive: false, participants: [] };
    }

    if (start) {
      game.voiceCall.isActive = true;
      game.voiceCall.startedAt = Date.now();
      game.voiceCall.participants = game.players
        .filter((p) => p.isAlive)
        .map((p) => ({
          seatNumber: p.seatNumber,
          name: p.name,
          isSpeaking: false,
          isMuted: false,
          audioWave: [15, 30, 60, 40, 75, 20, 50, 85, 35, 60],
          speakingDurationSec: 0,
        }));
      game.logs.push('🎙️ ویس کال صوتی رسمی بازی مافیا متصل شد.');
    } else {
      game.voiceCall.isActive = false;
      game.voiceCall.activeSpeakerSeat = undefined;
      game.logs.push('🔇 ویس کال صوتی بازی قطع شد.');
    }

    return game.voiceCall;
  }

  // 14. Set Speaking Participant in Voice Call
  static setVoiceSpeaker(chatId: number, seatNumber: number): FullMafiaGame['voiceCall'] {
    const game = activeMafiaGames.get(chatId);
    if (!game || !game.voiceCall) return { isActive: false, participants: [] };

    game.voiceCall.activeSpeakerSeat = seatNumber;
    game.voiceCall.participants.forEach((p) => {
      p.isSpeaking = p.seatNumber === seatNumber;
    });

    return game.voiceCall;
  }
}
