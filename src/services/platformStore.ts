import {
  UserAccount,
  GameRoom,
  RoomParticipant,
  ALL_MAFIA_ROLES,
  MafiaRoleDefinition,
  TransactionRecord,
  GameMission,
} from '../types/mafiaPlatform';

export class MafiaPlatformStore {
  users: Map<string, UserAccount> = new Map();
  rooms: Map<string, GameRoom> = new Map();
  transactions: TransactionRecord[] = [];
  missions: Map<string, GameMission[]> = new Map();

  constructor() {
    this.seedDefaultUsers();
    this.seedSampleRooms();
  }

  // 1. Initial Seeding of Admin & Default Players
  private seedDefaultUsers() {
    const defaultUser: UserAccount = {
      id: 'usr_me',
      username: 'mafia_chief',
      displayName: 'فرمانده مافیا (شما)',
      avatarUrl: '',
      avatarEmoji: '🎩',
      email: 'chief@mafia.online',
      level: 5,
      xp: 2800,
      coins: 25000,
      diamonds: 180,
      points: 1250,
      gamesPlayed: 32,
      gamesWon: 22,
      gamesLost: 10,
      winRate: 68.7,
      league: 'gold',
      ownedRoleIds: ['godfather', 'notche', 'citizen', 'doctor', 'detective', 'sniper'],
      friends: ['usr_ali', 'usr_sara'],
      blockedUsers: [],
      isAdmin: true,
      createdAt: new Date().toISOString(),
    };
    this.users.set(defaultUser.id, defaultUser);

    // Friend 1
    this.users.set('usr_ali', {
      id: 'usr_ali',
      username: 'ali_reza',
      displayName: 'علیرضا کارآگاه',
      avatarUrl: '',
      avatarEmoji: '🕵️',
      level: 4,
      xp: 1900,
      coins: 14000,
      diamonds: 60,
      points: 980,
      gamesPlayed: 24,
      gamesWon: 14,
      gamesLost: 10,
      winRate: 58.3,
      league: 'silver',
      ownedRoleIds: ['godfather', 'notche', 'citizen', 'doctor', 'detective'],
      friends: ['usr_me'],
      blockedUsers: [],
      isAdmin: false,
      createdAt: new Date().toISOString(),
    });

    // Friend 2
    this.users.set('usr_sara', {
      id: 'usr_sara',
      username: 'sara_sniper',
      displayName: 'سارا تک‌تیرانداز',
      avatarUrl: '',
      avatarEmoji: '🎯',
      level: 7,
      xp: 4500,
      coins: 38000,
      diamonds: 290,
      points: 1650,
      gamesPlayed: 56,
      gamesWon: 39,
      gamesLost: 17,
      winRate: 69.6,
      league: 'platinum',
      ownedRoleIds: ['godfather', 'notche', 'citizen', 'doctor', 'detective', 'sniper', 'armored', 'mayor'],
      friends: ['usr_me'],
      blockedUsers: [],
      isAdmin: false,
      createdAt: new Date().toISOString(),
    });
  }

  // 2. Initial Sample Rooms
  private seedSampleRooms() {
    const room1: GameRoom = {
      id: 'room_tehran_9',
      name: '🏛️ عمارت تهران (کال فعال ۹ نفره)',
      isPrivate: false,
      hostUserId: 'usr_me',
      maxPlayers: 9,
      currentPhase: 'lobby',
      dayNumber: 1,
      selectedScenario: 9,
      webrtcActive: true,
      turnTimerSeconds: 60,
      participants: [
        {
          userId: 'usr_me',
          displayName: 'فرمانده مافیا (شما)',
          avatarEmoji: '🎩',
          isReady: true,
          isHost: true,
          isBot: false,
          seatNumber: 1,
          isAlive: true,
          voiceChannel: 'public',
        },
        {
          userId: 'usr_ali',
          displayName: 'علیرضا کارآگاه',
          avatarEmoji: '🕵️',
          isReady: true,
          isHost: false,
          isBot: false,
          seatNumber: 2,
          isAlive: true,
          voiceChannel: 'public',
        },
      ],
      chatMessages: [
        {
          id: 'm_sys_1',
          senderId: 'system',
          senderName: 'گاد سرور',
          senderSeat: 0,
          text: 'اتاق با موفقیت ایجاد شد. منتظر تکمیل ظرفیت یا افزودن بات هوش مصنوعی باشید.',
          timestamp: '12:00',
          channel: 'public',
        },
      ],
      nightDecisions: {},
      trialVotes: {},
      createdAt: Date.now(),
    };

    const room2: GameRoom = {
      id: 'room_vip_12',
      name: '👑 کاخ پدرخوانده (رقابتی ۱۲ نفره حرفه‌ای)',
      isPrivate: false,
      hostUserId: 'usr_sara',
      maxPlayers: 12,
      currentPhase: 'lobby',
      dayNumber: 1,
      selectedScenario: 12,
      webrtcActive: true,
      turnTimerSeconds: 90,
      participants: [
        {
          userId: 'usr_sara',
          displayName: 'سارا تک‌تیرانداز',
          avatarEmoji: '🎯',
          isReady: true,
          isHost: true,
          isBot: false,
          seatNumber: 1,
          isAlive: true,
          voiceChannel: 'public',
        },
      ],
      chatMessages: [
        {
          id: 'm_sys_2',
          senderId: 'system',
          senderName: 'گاد سرور',
          senderSeat: 0,
          text: 'خوش آمدید! در این اتاق سناریوی ۱۲ نفره با نقش‌های مستقل و مذاکره‌کننده فعال است.',
          timestamp: '12:05',
          channel: 'public',
        },
      ],
      nightDecisions: {},
      trialVotes: {},
      createdAt: Date.now(),
    };

    this.rooms.set(room1.id, room1);
    this.rooms.set(room2.id, room2);
  }

  // User Authentication & Profile
  getUser(userId: string): UserAccount | undefined {
    return this.users.get(userId);
  }

  createUser(username: string, displayName: string, email?: string): UserAccount {
    const id = 'usr_' + Date.now();
    const newUser: UserAccount = {
      id,
      username,
      displayName,
      avatarUrl: '',
      avatarEmoji: '👤',
      email,
      level: 1,
      xp: 0,
      coins: 5000, // Welcome gift
      diamonds: 20,
      points: 100,
      gamesPlayed: 0,
      gamesWon: 0,
      gamesLost: 0,
      winRate: 0,
      league: 'starter',
      ownedRoleIds: ['godfather', 'notche', 'citizen', 'doctor', 'detective'],
      friends: [],
      blockedUsers: [],
      isAdmin: false,
      createdAt: new Date().toISOString(),
    };
    this.users.set(id, newUser);
    return newUser;
  }

  updateProfile(userId: string, updates: Partial<UserAccount>): UserAccount | null {
    const user = this.users.get(userId);
    if (!user) return null;
    const updated = { ...user, ...updates };
    this.users.set(userId, updated);
    return updated;
  }

  // Economy & Role Purchases (Server Authority)
  purchaseRole(
    userId: string,
    roleId: string,
    currencyType: 'coins' | 'diamonds' | 'points'
  ): { success: boolean; message: string; user?: UserAccount } {
    const user = this.users.get(userId);
    if (!user) return { success: false, message: 'کاربر یافت نشد.' };

    const role = ALL_MAFIA_ROLES.find((r) => r.id === roleId);
    if (!role) return { success: false, message: 'نقش مورد نظر در لیست نقش‌ها وجود ندارد.' };

    if (user.ownedRoleIds.includes(roleId)) {
      return { success: false, message: 'شما قبلاً این نقش را خریداری کرده‌اید.' };
    }

    if (user.level < role.minLevelRequired) {
      return { success: false, message: `برای خرید این نقش حداقل به سطح (Level) ${role.minLevelRequired} نیاز دارید.` };
    }

    let requiredAmount = 0;
    if (currencyType === 'coins') {
      requiredAmount = role.coinsPrice;
      if (user.coins < requiredAmount) {
        return { success: false, message: `سکه کافی ندارید. نیاز: ${requiredAmount.toLocaleString()} سکه` };
      }
      user.coins -= requiredAmount;
    } else if (currencyType === 'diamonds') {
      requiredAmount = role.diamondsPrice;
      if (user.diamonds < requiredAmount) {
        return { success: false, message: `الماس کافی ندارید. نیاز: ${requiredAmount} الماس` };
      }
      user.diamonds -= requiredAmount;
    } else if (currencyType === 'points') {
      requiredAmount = role.pointsRequired;
      if (user.points < requiredAmount) {
        return { success: false, message: `امتیاز لیگ (پوینت) کافی ندارید. نیاز: ${requiredAmount} پوینت` };
      }
      // Points are rank requirement, can either deduct or keep as gatekeeper
    }

    user.ownedRoleIds.push(roleId);
    user.xp += 150; // XP reward for acquiring role

    // Record Transaction
    this.transactions.push({
      id: 'tx_' + Date.now(),
      userId,
      currencyType,
      amount: -requiredAmount,
      reason: `خرید نقش دائمی ${role.name}`,
      referenceId: roleId,
      timestamp: new Date().toISOString(),
    });

    return {
      success: true,
      message: `🎉 نقش «${role.emoji} ${role.name}» با موفقیت خریداری و به حساب شما اضافه شد!`,
      user,
    };
  }

  // Room Creation & Joining
  createRoom(
    hostUserId: string,
    name: string,
    scenario: 9 | 12,
    isPrivate: boolean = false,
    passcode?: string
  ): GameRoom {
    const host = this.users.get(hostUserId);
    const roomId = 'room_' + Date.now();
    const newRoom: GameRoom = {
      id: roomId,
      name: name || `اتاق ${scenario} نفره ${host?.displayName || 'میزبان'}`,
      isPrivate,
      passcode,
      hostUserId,
      maxPlayers: scenario,
      currentPhase: 'lobby',
      dayNumber: 1,
      selectedScenario: scenario,
      webrtcActive: true,
      turnTimerSeconds: 60,
      participants: [
        {
          userId: hostUserId,
          displayName: host?.displayName || 'میزبان',
          avatarEmoji: host?.avatarEmoji || '🎩',
          isReady: true,
          isHost: true,
          isBot: false,
          seatNumber: 1,
          isAlive: true,
          voiceChannel: 'public',
        },
      ],
      chatMessages: [
        {
          id: 'm_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
          senderId: 'system',
          senderName: 'گاد سرور',
          senderSeat: 0,
          text: `اتاق ${scenario} نفره ایجاد شد. برای شروع بازی، لابی را با دوستان یا بات‌های هوش مصنوعی تکمیل کنید.`,
          timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
          channel: 'public',
        },
      ],
      nightDecisions: {},
      trialVotes: {},
      createdAt: Date.now(),
    };

    this.rooms.set(roomId, newRoom);
    return newRoom;
  }

  joinRoom(roomId: string, userId: string, passcode?: string): { success: boolean; message: string; room?: GameRoom } {
    const room = this.rooms.get(roomId);
    if (!room) return { success: false, message: 'اتاق یافت نشد.' };

    if (room.isPrivate && room.passcode && room.passcode !== passcode) {
      return { success: false, message: 'رمز ورود اتاق نامعتبر است.' };
    }

    if (room.participants.length >= room.maxPlayers) {
      return { success: false, message: 'ظرفیت اتاق تکمیل شده است.' };
    }

    if (room.participants.some((p) => p.userId === userId)) {
      return { success: true, message: 'شما هم‌اکنون در این اتاق حاضر هستید.', room };
    }

    const user = this.users.get(userId);
    const nextSeat = room.participants.length + 1;
    const participant: RoomParticipant = {
      userId,
      displayName: user?.displayName || `بازیکن صندلی ${nextSeat}`,
      avatarEmoji: user?.avatarEmoji || '👤',
      isReady: false,
      isHost: false,
      isBot: false,
      seatNumber: nextSeat,
      isAlive: true,
      voiceChannel: 'public',
    };

    room.participants.push(participant);
    room.chatMessages.push({
      id: 'm_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      senderId: 'system',
      senderName: 'گاد سرور',
      senderSeat: 0,
      text: `${participant.displayName} روی صندلی [${nextSeat}] نشست.`,
      timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
      channel: 'public',
    });

    return { success: true, message: 'با موفقیت وارد شدید.', room };
  }

  // Add Smart AI Bot to Room
  addAIBot(
    roomId: string,
    personality: 'beginner' | 'calm' | 'analyst' | 'skeptic' | 'strategist' | 'negotiator' | 'pro' = 'analyst'
  ): { success: boolean; message: string; room?: GameRoom } {
    const room = this.rooms.get(roomId);
    if (!room) return { success: false, message: 'اتاق یافت نشد.' };

    if (room.participants.length >= room.maxPlayers) {
      return { success: false, message: 'ظرفیت اتاق پر است.' };
    }

    const botNames = [
      { name: 'آرش (تحلیلگر)', emoji: '🧠' },
      { name: 'نیلوفر (شکاک)', emoji: '🤨' },
      { name: 'کامران (استراتژیست)', emoji: '♟️' },
      { name: 'مهسا (مذاکره‌کننده)', emoji: '🤝' },
      { name: 'بهرام (حرفه‌ای)', emoji: '🔥' },
      { name: 'پویا (آرام)', emoji: '🧘' },
      { name: 'سارا (مبتدی)', emoji: '🌱' },
      { name: 'شایان (رندوم)', emoji: '🎲' },
    ];

    const currentSeat = room.participants.length + 1;
    const botProfile = botNames[(currentSeat - 1) % botNames.length];

    const botParticipant: RoomParticipant = {
      userId: `bot_${Date.now()}_${currentSeat}`,
      displayName: botProfile.name,
      avatarEmoji: botProfile.emoji,
      isReady: true,
      isHost: false,
      isBot: true,
      botPersonality: personality,
      seatNumber: currentSeat,
      isAlive: true,
      voiceChannel: 'public',
    };

    room.participants.push(botParticipant);
    room.chatMessages.push({
      id: 'm_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      senderId: 'system',
      senderName: 'گاد سرور',
      senderSeat: 0,
      text: `هوش مصنوعی «${botParticipant.displayName}» با تیپ شخصیتی [${personality}] وارد صندلی [${currentSeat}] شد.`,
      timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
      channel: 'public',
    });

    return { success: true, message: 'هوش مصنوعی اضافه شد.', room };
  }

  // Fill Room with Bots to Start Instantly
  fillRoomWithBots(roomId: string): GameRoom | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    const personalities: Array<'analyst' | 'skeptic' | 'strategist' | 'negotiator' | 'pro'> = [
      'analyst',
      'skeptic',
      'strategist',
      'negotiator',
      'pro',
    ];

    while (room.participants.length < room.maxPlayers) {
      const p = personalities[room.participants.length % personalities.length];
      this.addAIBot(roomId, p);
    }

    return this.startGame(roomId);
  }

  // Start Mafia Match & Role Assignment
  startGame(roomId: string): GameRoom | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    let rolesForGame: string[] = [];
    if (room.selectedScenario === 9) {
      rolesForGame = [
        'godfather',
        'notche',
        'doctor',
        'detective',
        'sniper',
        'armored',
        'priest',
        'citizen',
        'citizen',
      ];
    } else {
      rolesForGame = [
        'godfather',
        'notche',
        'mofatesh',
        'mozakere',
        'doctor',
        'detective',
        'sniper',
        'armored',
        'reporter',
        'mayor',
        'serial_killer',
        'citizen',
      ];
    }

    // Shuffle roles
    const shuffledRoles = [...rolesForGame].sort(() => Math.random() - 0.5);

    room.participants.forEach((p, idx) => {
      p.assignedRoleId = shuffledRoles[idx % shuffledRoles.length];
      p.isAlive = true;
      p.hasArmor = p.assignedRoleId === 'armored';
      p.isReady = true;
    });

    room.currentPhase = 'night';
    room.dayNumber = 1;
    room.nightDecisions = {};
    room.trialVotes = {};

    room.chatMessages.push({
      id: 'm_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      senderId: 'system',
      senderName: 'گاد سرور',
      senderSeat: 0,
      text: `🌑 **شب اول فرا رسید!** نقش‌ها به صورت محرمانه تقسیم شدند. بازیکنان مجاز در سکوت شب اقدامات خود را ثبت کنند.`,
      timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
      channel: 'public',
    });

    return room;
  }

  // ==========================================
  // Persistence Export / Import for Database
  // ==========================================
  exportData(): { users: UserAccount[]; transactions: TransactionRecord[] } {
    return {
      users: Array.from(this.users.values()),
      transactions: this.transactions,
    };
  }

  importData(data: { users?: UserAccount[]; transactions?: TransactionRecord[] }): void {
    if (!data) return;
    if (Array.isArray(data.users) && data.users.length > 0) {
      for (const u of data.users) {
        if (u && u.id) {
          this.users.set(u.id, u);
        }
      }
    }
    if (Array.isArray(data.transactions) && data.transactions.length > 0) {
      this.transactions = data.transactions;
    }
  }
}

export const platformStore = new MafiaPlatformStore();
