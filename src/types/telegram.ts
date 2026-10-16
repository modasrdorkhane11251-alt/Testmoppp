export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  is_bot?: boolean;
  platform?: 'telegram' | 'bale' | 'rubika' | 'simulator';
}

export interface TelegramChat {
  id: number;
  type: 'private' | 'group' | 'supergroup' | 'channel';
  title?: string;
  username?: string;
  first_name?: string;
}

export interface InlineKeyboardButton {
  text: string;
  callback_data?: string;
  url?: string;
}

export interface ReplyKeyboardButton {
  text: string;
}

export interface InlineKeyboardMarkup {
  inline_keyboard: InlineKeyboardButton[][];
}

export interface ReplyKeyboardMarkup {
  keyboard: ReplyKeyboardButton[][];
  resize_keyboard?: boolean;
  one_time_keyboard?: boolean;
}

export interface TelegramMediaAttachment {
  type: 'video' | 'audio' | 'photo' | 'profile' | 'document';
  url?: string;
  previewUrl?: string;
  title?: string;
  author?: string;
  authorAvatar?: string;
  duration?: string;
  quality?: string;
  sizeMb?: number;
  id?: string;
  shortcode?: string;
  stats?: {
    views?: string;
    likes?: number;
    followers?: string;
    posts?: string;
    following?: string;
  };
  bio?: string;
  isVerified?: boolean;
  profileDetails?: {
    username: string;
    fullName: string;
    avatarUrl: string;
    bio: string;
    followers: string;
    following: string;
    postsCount: string;
    isVerified: boolean;
  };
}

export interface UploadProgressPayload {
  fileName: string;
  fileSizeMb: number;
  speedMbps?: number;
  generatedLink?: string;
  directUrl?: string;
  expiresInDays?: number;
  status?: 'uploading' | 'completed' | 'generating_link';
}

export interface TelegramMessage {
  message_id: number;
  from?: TelegramUser;
  chat: TelegramChat;
  date: number;
  text?: string;
  reply_markup?: InlineKeyboardMarkup | ReplyKeyboardMarkup;
  reply_to_message?: TelegramMessage;
  photo?: Array<{ file_id: string; file_size: number; width: number; height: number }>;
  photoUrl?: string;
  videoUrl?: string;
  audioUrl?: string;
  mediaAttachment?: TelegramMediaAttachment;
  uploadProgress?: UploadProgressPayload;
  document?: { file_id: string; file_name: string; mime_type: string; file_size: number };
  voice?: { file_id: string; duration: number; file_size: number };
  dice?: { emoji: string; value: number };
}

export interface TelegramCallbackQuery {
  id: string;
  from: TelegramUser;
  message?: TelegramMessage;
  data?: string;
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
}

// Bot Module Types
export type MafiaRole = 
  | 'godfather' // رئیس مافیا
  | 'mafia' // مافیای ساده
  | 'doctor' // دکتر شهر
  | 'detective' // کارآگاه
  | 'sniper' // تک‌تیرانداز
  | 'citizen' // شهروند ساده
  | 'armored' // زره‌پوش
  | 'priest'; // کشیش

export interface MafiaPlayer {
  id: number;
  name: string;
  username?: string;
  role: MafiaRole;
  isAlive: boolean;
  isBot: boolean;
  hasArmor?: boolean;
  votedFor?: number;
}

export interface MafiaGame {
  id: string;
  chatId: number;
  mode: 9 | 12;
  phase: 'lobby' | 'night' | 'day' | 'trial' | 'ended';
  dayNumber: number;
  players: MafiaPlayer[];
  winner?: 'mafia' | 'citizens';
  logs: string[];
  nightActions: {
    mafiaTarget?: number;
    doctorTarget?: number;
    detectiveTarget?: number;
    sniperTarget?: number;
  };
  trialCandidate?: number;
}

export interface ClashVillage {
  userId: number;
  name: string;
  townHall: number;
  gold: number;
  maxGold: number;
  elixir: number;
  maxElixir: number;
  wood: number;
  troops: {
    barbarian: number;
    archer: number;
    giant: number;
  };
  cups: number;
  clan?: string;
  lastCollected: number;
}

export interface FinderSession {
  userId: number;
  partnerId?: number;
  state: 'idle' | 'searching' | 'chatting';
  genderPreference?: 'any' | 'male' | 'female';
  province?: string;
  history: Array<{ senderId: number; text: string; time: string }>;
}

export interface SeenOrder {
  id: string;
  userId: number;
  postLink: string;
  viewsRequested: number;
  viewsDelivered: number;
  status: 'pending' | 'processing' | 'completed';
  createdAt: string;
  cost: number;
}

export interface RocketBet {
  userId: number;
  amount: number;
  multiplier: number;
  status: 'flying' | 'cashed_out' | 'crashed';
  crashPoint: number;
}

export interface UserWallet {
  userId: number;
  balance: number; // Toman
  coins: number; // Game coins
  joinedDate: string;
  subscriptionTier: 'free' | 'premium' | 'vip';
  subscriptionExpiry: string;
}

export interface DirectUploadFile {
  id: string;
  userId: number;
  fileName: string;
  fileSize: number;
  mimeType: string;
  downloadUrl: string;
  createdAt: string;
  downloadsCount: number;
}

export interface BotLog {
  id: string;
  timestamp: string;
  type: 'incoming' | 'outgoing' | 'callback' | 'error' | 'system';
  content: string;
  raw?: any;
}

export interface RealBotStatus {
  connected: boolean;
  isPolling: boolean;
  botInfo?: TelegramUser;
  error?: string;
  logs: BotLog[];
}

// 1. Web Proxy Types
export interface WebProxyRequest {
  url: string;
  bypassCors?: boolean;
}

export interface WebProxyResponse {
  url: string;
  status: number;
  contentType: string;
  contentSnippet: string;
  pageTitle?: string;
  latencyMs: number;
  success: boolean;
  error?: string;
}

// 2. Virtual Number Types (فروشگاه شماره مجازی)
export interface VirtualNumberOrder {
  id: string;
  userId: number;
  country: string;
  countryNameFa: string;
  countryCode: string;
  flag: string;
  service: string;
  serviceNameFa: string;
  phoneNumber: string;
  smsCode?: string;
  status: 'waiting_sms' | 'code_received' | 'timeout' | 'cancelled';
  priceToman: number;
  expiresAt: number;
  createdAt: string;
}

// 3. YouTube Downloader Types
export interface YouTubeFormat {
  quality: string;
  resolution: string;
  format: 'mp4' | 'mp3' | 'webm';
  sizeMb: number;
  downloadUrl: string;
  bitrate?: string;
}

export interface YouTubeVideoDetails {
  id: string;
  url: string;
  title: string;
  channel: string;
  duration: string;
  views: string;
  thumbnail: string;
  formats: YouTubeFormat[];
}

// 4. Music Search Types (ملوبات / جستجوی آهنگ)
export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  duration: string;
  coverUrl: string;
  audioUrl128: string;
  audioUrl320: string;
  lyrics?: string;
  releaseYear?: number;
  playsCount: number;
}

// 5. Arzy Detailed Exchange Rates (arzy.php)
export interface ArzyRateItem {
  key: string;
  nameFa: string;
  nameEn: string;
  priceToman: number;
  changePercent24h: number;
  high24h: number;
  low24h: number;
  category: 'currency' | 'gold_coin' | 'crypto';
  icon: string;
  updatedAt: string;
}

// 6. Aplo File Upload Types (aplo.zip)
export interface AploStoredFile {
  id: string;
  userId: number;
  fileName: string;
  fileSize: number;
  mimeType: string;
  downloadUrl: string;
  expiryDays: number;
  expiresAt: string;
  isPasswordProtected: boolean;
  password?: string;
  createdAt: string;
  downloadsCount: number;
  qrCodeUrl: string;
}

// 7. TikTok Downloader & Explorer Types
export interface TikTokVideoResult {
  id: string;
  url: string;
  title: string;
  author: string;
  authorAvatar: string;
  coverUrl: string;
  videoNoWatermarkUrl: string;
  audioUrl: string;
  likes: number;
  comments: number;
  shares: number;
  durationSec: number;
}

// 8. Universal Mega Downloader (اینستاگرام، یوتیوب، تیک‌تاک، پینترست، توییتر، اسپاتیفای، آپارات، فایل مستقیم، تلگرام، فیسبوک، تردز)
export type UniversalDownloadPlatform =
  | 'instagram'
  | 'youtube'
  | 'tiktok'
  | 'pinterest'
  | 'twitter'
  | 'spotify'
  | 'soundcloud'
  | 'aparat'
  | 'telegram'
  | 'facebook'
  | 'threads'
  | 'direct_link';

export interface UniversalDownloadFormat {
  id: string;
  label: string;
  resolution?: string;
  quality: string;
  format: 'mp4' | 'mp3' | 'jpg' | 'png' | 'zip' | 'webm';
  sizeMb: number;
  downloadUrl: string;
  type: 'video' | 'audio' | 'image' | 'file';
}

export interface UniversalDownloadItem {
  id: string;
  url: string;
  platform: UniversalDownloadPlatform;
  contentType: 'video' | 'photo' | 'audio' | 'profile' | 'document';
  platformNameFa: string;
  platformIcon: string;
  title: string;
  author?: string;
  authorAvatar?: string;
  thumbnail: string;
  mediaUrl?: string;
  duration?: string;
  description?: string;
  formats: UniversalDownloadFormat[];
  stats?: {
    views?: string;
    likes?: number;
    comments?: number;
    shares?: number;
    saves?: number;
    followers?: string;
    following?: string;
    posts?: string;
  };
  profileDetails?: {
    username: string;
    fullName: string;
    avatarUrl: string;
    bio: string;
    followers: string;
    following: string;
    postsCount: string;
    isVerified: boolean;
  };
}
