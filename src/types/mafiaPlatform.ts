/**
 * Mafia Advanced Platform Data Store
 * In-memory state and persistence for users, rooms, market roles, missions, ranks, and WebRTC signalling
 */

export type MafiaTeam = 'mafia' | 'citizens' | 'independent';

export type RarityLevel = 'common' | 'rare' | 'epic' | 'legendary';

export interface MafiaRoleDefinition {
  id: string;
  name: string;
  englishName: string;
  emoji: string;
  team: MafiaTeam;
  description: string;
  nightAbility: string;
  rarity: RarityLevel;
  coinsPrice: number;
  diamondsPrice: number;
  pointsRequired: number;
  minLevelRequired: number;
  order: number; // Night action priority order
}

export const ALL_MAFIA_ROLES: MafiaRoleDefinition[] = [
  // MAFIA TEAM (PUBLIC/beta ( mafia )/ extracted & expanded)
  {
    id: 'godfather',
    name: 'پدرخوانده',
    englishName: 'Godfather',
    emoji: '🎩',
    team: 'mafia',
    description: 'رهبر مطلق مافیا. شلیک نهایی شب را تعیین می‌کند و استعلام کارآگاه برای او همواره منفی (شهروند) است.',
    nightAbility: 'شلیک مستقیم مرگبار و مصونیت در برابر استعلام کارآگاه',
    rarity: 'legendary',
    coinsPrice: 0, // Default free starter
    diamondsPrice: 0,
    pointsRequired: 0,
    minLevelRequired: 1,
    order: 10,
  },
  {
    id: 'notche',
    name: 'نوچه',
    englishName: 'Goon / Notche',
    emoji: '🕶️',
    team: 'mafia',
    description: 'مافیای ساده و وفادار. در اتاق شب همفکری می‌کند و در صورت حذف پدرخوانده سلاح به او می‌رسد.',
    nightAbility: 'همفکری در چت/کال شب و شلیک جانشین',
    rarity: 'common',
    coinsPrice: 0,
    diamondsPrice: 0,
    pointsRequired: 0,
    minLevelRequired: 1,
    order: 11,
  },
  {
    id: 'mofatesh',
    name: 'مفتش',
    englishName: 'Inspector Mafia',
    emoji: '🔍',
    team: 'mafia',
    description: 'جاسوس مافیا. در طول شب نقش دقیق یکی از شهروندان را بررسی و کشف می‌کند.',
    nightAbility: 'استعلام نقش واقعی شهروندان برای تیم مافیا',
    rarity: 'epic',
    coinsPrice: 15000,
    diamondsPrice: 120,
    pointsRequired: 500,
    minLevelRequired: 4,
    order: 4,
  },
  {
    id: 'mozakere',
    name: 'مذاکره‌کننده',
    englishName: 'Negotiator',
    emoji: '🤝',
    team: 'mafia',
    description: 'اگر یکی از اعضای مافیا حذف شود، می‌تواند با یک شهروند ساده مذاکره کرده و او را به مافیا تبدیل کند.',
    nightAbility: 'تبدیل شهروند ساده به عضو فعال مافیا',
    rarity: 'epic',
    coinsPrice: 18000,
    diamondsPrice: 150,
    pointsRequired: 800,
    minLevelRequired: 5,
    order: 8,
  },
  {
    id: 'hacker',
    name: 'هکر',
    englishName: 'Hacker',
    emoji: '💻',
    team: 'mafia',
    description: 'سیستم رأی‌گیری یا قابلیت یک بازیکن را در شب هک کرده و توانایی او را غیرفعال می‌سازد.',
    nightAbility: 'از کار انداختن توانایی شبانه یک بازیکن',
    rarity: 'legendary',
    coinsPrice: 25000,
    diamondsPrice: 220,
    pointsRequired: 1200,
    minLevelRequired: 7,
    order: 2,
  },
  {
    id: 'shayad',
    name: 'شیاد',
    englishName: 'Trickster / Impostor',
    emoji: '🎭',
    team: 'mafia',
    description: 'شب‌ها هویت یک شهروند را سرقت می‌کند تا استعلام کارآگاه و تیرهای شب به خطا بروند.',
    nightAbility: 'تغییر هویت ظاهری هدف در شب',
    rarity: 'rare',
    coinsPrice: 12000,
    diamondsPrice: 90,
    pointsRequired: 300,
    minLevelRequired: 3,
    order: 3,
  },
  {
    id: 'kheftgir',
    name: 'خفت‌گیر',
    englishName: 'Mugger / Silencer',
    emoji: '🤐',
    team: 'mafia',
    description: 'شب‌ها دهان یک بازیکن را می‌بندد؛ آن بازیکن در روز بعد حق صحبت در ویس‌کال و چت را ندارد.',
    nightAbility: 'سکوت اجباری (Mute) بازیکن در فاز روز',
    rarity: 'rare',
    coinsPrice: 14000,
    diamondsPrice: 100,
    pointsRequired: 400,
    minLevelRequired: 3,
    order: 5,
  },

  // CITIZENS TEAM
  {
    id: 'citizen',
    name: 'شهروند ساده',
    englishName: 'Simple Citizen',
    emoji: '👥',
    team: 'citizens',
    description: 'پایه و ستون شهر. سلاح او منطق، گوش دادن به ویس‌کال، فکت‌ها و رأی دادن در دادگاه است.',
    nightAbility: 'خواب در شب و دفاع در روز',
    rarity: 'common',
    coinsPrice: 0,
    diamondsPrice: 0,
    pointsRequired: 0,
    minLevelRequired: 1,
    order: 99,
  },
  {
    id: 'doctor',
    name: 'دکتر',
    englishName: 'Doctor',
    emoji: '👨‍⚕️',
    team: 'citizens',
    description: 'هر شب جان یک نفر را از شلیک مافیا نجات می‌دهد. خودش را حداکثر ۲ بار می‌تواند نجات دهد.',
    nightAbility: 'نجات پزشکی شبانه از شلیک مرگبار',
    rarity: 'common',
    coinsPrice: 0,
    diamondsPrice: 0,
    pointsRequired: 0,
    minLevelRequired: 1,
    order: 9,
  },
  {
    id: 'detective',
    name: 'کارآگاه',
    englishName: 'Detective',
    emoji: '🕵️',
    team: 'citizens',
    description: 'هر شب از گاد بازی استعلام هویت یک بازیکن را می‌گیرد (مثبت یعنی مافیا، منفی یعنی شهروند).',
    nightAbility: 'استعلام هویت مافیا در شب',
    rarity: 'common',
    coinsPrice: 0,
    diamondsPrice: 0,
    pointsRequired: 0,
    minLevelRequired: 1,
    order: 7,
  },
  {
    id: 'sniper',
    name: 'اسنایپر (تک‌تیرانداز)',
    englishName: 'Sniper',
    emoji: '🎯',
    team: 'citizens',
    description: 'مسلح به گلوله جنگی. اگر به مافیا بزند مافیا می‌میرد؛ اگر اشتباه به شهروند بزند خودش کشته می‌شود.',
    nightAbility: 'شلیک شبانه مستقل با ریسک خودکشی',
    rarity: 'rare',
    coinsPrice: 8000,
    diamondsPrice: 60,
    pointsRequired: 200,
    minLevelRequired: 2,
    order: 12,
  },
  {
    id: 'bazpors',
    name: 'بازپرس',
    englishName: 'Interrogator',
    emoji: '⚖️',
    team: 'citizens',
    description: 'می‌تواند در روز دستور دادگاه اضطراری صادر کرده و یک بازیکن را مستقیماً به چالش بکشد.',
    nightAbility: 'احضار مستقیم به دادگاه و بازجویی',
    rarity: 'epic',
    coinsPrice: 16000,
    diamondsPrice: 130,
    pointsRequired: 600,
    minLevelRequired: 4,
    order: 6,
  },
  {
    id: 'armored',
    name: 'زره‌پوش',
    englishName: 'Armored',
    emoji: '🛡️',
    team: 'citizens',
    description: 'دارای جلیقه ضد گلوله. با اولین تیر مافیا در شب کشته نمی‌شود و تنها جلیقه‌اش می‌افتد.',
    nightAbility: 'مقاومت غیرفعال در برابر اولین شلیک شب',
    rarity: 'rare',
    coinsPrice: 10000,
    diamondsPrice: 75,
    pointsRequired: 250,
    minLevelRequired: 2,
    order: 98,
  },
  {
    id: 'bodyguard',
    name: 'بادیگارد',
    englishName: 'Bodyguard',
    emoji: '🥋',
    team: 'citizens',
    description: 'هر شب از یک نفر محافظت می‌کند؛ اگر به او شلیک شود، بادیگارد جان خود را فدای هدف می‌کند.',
    nightAbility: 'فداکاری و سپر بلای بازیکن هدف شدن',
    rarity: 'rare',
    coinsPrice: 11000,
    diamondsPrice: 85,
    pointsRequired: 300,
    minLevelRequired: 3,
    order: 13,
  },
  {
    id: 'priest',
    name: 'کشیش',
    englishName: 'Priest',
    emoji: '⛪',
    team: 'citizens',
    description: 'هر شب یک بازیکن را تطهیر می‌کند؛ سکوت خفت‌گیر یا اثرات جادویی منفی را خنثی می‌سازد.',
    nightAbility: 'تطهیر و رفع سکوت و اثرات منفی',
    rarity: 'rare',
    coinsPrice: 9000,
    diamondsPrice: 70,
    pointsRequired: 200,
    minLevelRequired: 2,
    order: 14,
  },
  {
    id: 'reporter',
    name: 'خبرنگار',
    englishName: 'Reporter',
    emoji: '📰',
    team: 'citizens',
    description: 'شب‌ها بررسی می‌کند که آیا مذاکره‌ای در شهر رخ داده است یا خیر و گزارش آن را دریافت می‌کند.',
    nightAbility: 'کشف وقوع مذاکره یا تغییر تیم بازیکنان',
    rarity: 'epic',
    coinsPrice: 14000,
    diamondsPrice: 110,
    pointsRequired: 450,
    minLevelRequired: 3,
    order: 15,
  },
  {
    id: 'angel',
    name: 'فرشته نجات',
    englishName: 'Guardian Angel',
    emoji: '👼',
    team: 'citizens',
    description: 'یک بار در کل بازی می‌تواند بازیکنی را که در دادگاه اعدام شده به بازی برگرداند.',
    nightAbility: 'احیای معجزه‌آسا و بازگشت از مرگ',
    rarity: 'legendary',
    coinsPrice: 30000,
    diamondsPrice: 280,
    pointsRequired: 1500,
    minLevelRequired: 8,
    order: 16,
  },
  {
    id: 'mayor',
    name: 'شهردار',
    englishName: 'Mayor',
    emoji: '🏛️',
    team: 'citizens',
    description: 'حق وتوی دادگاه در روز و دو برابر شمرده شدن رأی او در زمان دفاع و اعدام.',
    nightAbility: 'حق وتوی اعدام و وزن دو برابری رأی',
    rarity: 'legendary',
    coinsPrice: 28000,
    diamondsPrice: 250,
    pointsRequired: 1400,
    minLevelRequired: 7,
    order: 97,
  },
  {
    id: 'traitor',
    name: 'خائن',
    englishName: 'Traitor',
    emoji: '🐍',
    team: 'citizens',
    description: 'در ابتدا شهروند است اما اگر مافیاها بمیرند ممکن است تیم خود را بفروشد یا برعکس.',
    nightAbility: 'تغییر وفاداری در شرایط بحرانی',
    rarity: 'rare',
    coinsPrice: 13000,
    diamondsPrice: 95,
    pointsRequired: 350,
    minLevelRequired: 3,
    order: 17,
  },

  // INDEPENDENT TEAM
  {
    id: 'serial_killer',
    name: 'قاتل سریالی',
    englishName: 'Serial Killer',
    emoji: '🔪',
    team: 'independent',
    description: 'نه شهروند است نه مافیا. هر شب یک نفر را سلاخی می‌کند و شرط برد او تنها ماندن در شهر است.',
    nightAbility: 'شلیک شبانه مستقل و حذف تمامی طرفین',
    rarity: 'legendary',
    coinsPrice: 35000,
    diamondsPrice: 350,
    pointsRequired: 2000,
    minLevelRequired: 10,
    order: 1,
  },
  {
    id: 'joker',
    name: 'جوکر',
    englishName: 'Joker',
    emoji: '🃏',
    team: 'independent',
    description: 'هدف او فریب دادن شهر است. اگر در روز با رأی‌گیری مردم اعدام شود، به تنهایی برنده بازی می‌شود!',
    nightAbility: 'پیروزی فوری در صورت اعدام در دادگاه',
    rarity: 'legendary',
    coinsPrice: 32000,
    diamondsPrice: 300,
    pointsRequired: 1800,
    minLevelRequired: 9,
    order: 96,
  },
  {
    id: 'werewolf',
    name: 'گرگینه',
    englishName: 'Werewolf',
    emoji: '🐺',
    team: 'independent',
    description: 'در شب‌های ماه کامل قدرت دو برابر می‌گیرد و تیر مافیا روی او اثری ندارد.',
    nightAbility: 'حمله وحشیانه و مصونیت در برابر سلاح سرد/گرم',
    rarity: 'legendary',
    coinsPrice: 36000,
    diamondsPrice: 360,
    pointsRequired: 2200,
    minLevelRequired: 10,
    order: 18,
  },
];

export interface UserAccount {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  avatarEmoji: string;
  email?: string;
  level: number;
  xp: number;
  coins: number;
  diamonds: number;
  points: number; // League Rank MMR
  gamesPlayed: number;
  gamesWon: number;
  gamesLost: number;
  winRate: number;
  league: 'starter' | 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'master';
  ownedRoleIds: string[];
  friends: string[];
  blockedUsers: string[];
  isAdmin?: boolean;
  createdAt: string;
}

export interface RoomParticipant {
  userId: string;
  displayName: string;
  avatarEmoji: string;
  isReady: boolean;
  isHost: boolean;
  isBot: boolean;
  botPersonality?: 'beginner' | 'calm' | 'analyst' | 'skeptic' | 'strategist' | 'negotiator' | 'pro';
  seatNumber: number;
  assignedRoleId?: string;
  isAlive: boolean;
  hasArmor?: boolean;
  isMuted?: boolean;
  isSpeaking?: boolean;
  voiceChannel: 'public' | 'mafia_private' | 'dead_graveyard';
  peerId?: string;
}

export interface GameRoom {
  id: string;
  name: string;
  isPrivate: boolean;
  passcode?: string;
  hostUserId: string;
  maxPlayers: 9 | 12;
  currentPhase: 'lobby' | 'night' | 'day_speech' | 'voting' | 'trial' | 'ended';
  dayNumber: number;
  participants: RoomParticipant[];
  selectedScenario: 9 | 12;
  webrtcActive: boolean;
  activeSpeakerSeat?: number;
  turnTimerSeconds: number;
  chatMessages: Array<{
    id: string;
    senderId: string;
    senderName: string;
    senderSeat: number;
    text: string;
    timestamp: string;
    isVoice?: boolean;
    voiceDuration?: number;
    channel: 'public' | 'mafia_private' | 'dead_graveyard';
  }>;
  nightDecisions: Record<string, { targetSeat: number; actionType: string }>;
  trialCandidateSeat?: number;
  trialVotes: Record<string, 'guilty' | 'innocent'>;
  winner?: MafiaTeam;
  createdAt: number;
}

export interface TransactionRecord {
  id: string;
  userId: string;
  currencyType: 'coins' | 'diamonds' | 'points';
  amount: number;
  reason: string;
  referenceId?: string;
  timestamp: string;
}

export interface GameMission {
  id: string;
  title: string;
  description: string;
  type: 'daily' | 'weekly' | 'achievement';
  rewardCoins: number;
  rewardDiamonds: number;
  rewardPoints: number;
  targetCount: number;
  currentCount: number;
  isClaimed: boolean;
}
