import React, { useState, useEffect, useRef } from 'react';
import {
  Users,
  Shield,
  ShoppingBag,
  Trophy,
  Radio,
  Mic,
  MicOff,
  PhoneCall,
  PhoneOff,
  Coins,
  Gem,
  Award,
  Zap,
  Play,
  PlusCircle,
  Lock,
  Unlock,
  CheckCircle2,
  XCircle,
  Sparkles,
  Bot,
  Brain,
  RotateCcw,
  Volume2,
  VolumeX,
  Send,
  Skull,
  Gavel,
  Vote,
  Target,
  ChevronRight,
  UserCheck,
  Eye,
  AlertTriangle,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  UserAccount,
  GameRoom,
  RoomParticipant,
  MafiaRoleDefinition,
  ALL_MAFIA_ROLES,
} from '../types/mafiaPlatform';
import {
  WebRtcAudioService,
  WebRtcDiagnosticLog,
  WebRtcPeerState,
} from '../services/webrtcAudioService';
import { Terminal, Activity, Wifi } from 'lucide-react';

export const MafiaMultiplayerPlatform: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'rooms' | 'game' | 'market' | 'profile' | 'ranking'>('rooms');
  const [user, setUser] = useState<UserAccount | null>(null);
  const [rooms, setRooms] = useState<GameRoom[]>([]);
  const [currentRoom, setCurrentRoom] = useState<GameRoom | null>(null);
  const [roles, setRoles] = useState<MafiaRoleDefinition[]>(ALL_MAFIA_ROLES);

  // Room Creation Modal / State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomScenario, setNewRoomScenario] = useState<9 | 12>(9);
  const [newRoomPrivate, setNewRoomPrivate] = useState(false);
  const [newRoomPasscode, setNewRoomPasscode] = useState('');

  // WebRTC Local Voice & Diagnostics State
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [activeSpeakerSeat, setActiveSpeakerSeat] = useState<number | null>(null);
  const [webrtcConnected, setWebrtcConnected] = useState(false);
  const [webrtcIsFallback, setWebrtcIsFallback] = useState(false);
  const [userSpeakingLevel, setUserSpeakingLevel] = useState(0);
  const [webrtcLogs, setWebrtcLogs] = useState<WebRtcDiagnosticLog[]>([]);
  const [webrtcPeers, setWebrtcPeers] = useState<WebRtcPeerState[]>([]);
  const [showWebRtcLogsModal, setShowWebRtcLogsModal] = useState(false);
  const [webrtcError, setWebrtcError] = useState<string | null>(null);

  const webrtcServiceRef = useRef<WebRtcAudioService | null>(null);

  // In-Game Message & Action state
  const [chatInput, setChatInput] = useState('');
  const [selectedTargetSeat, setSelectedTargetSeat] = useState<number | null>(null);
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<'all' | 'mafia' | 'citizens' | 'independent'>('all');
  const [purchaseStatusMsg, setPurchaseStatusMsg] = useState<{ text: string; isSuccess: boolean } | null>(null);

  // Sync Data on Mount & Periodic Polling
  const syncPlatformData = async () => {
    try {
      // 1. Fetch User
      const userRes = await fetch('/api/platform/user?userId=usr_me');
      if (userRes.ok) {
        const uData = await userRes.json();
        if (uData.user) setUser(uData.user);
      }

      // 2. Fetch Rooms
      const roomsRes = await fetch('/api/platform/rooms');
      if (roomsRes.ok) {
        const rData = await roomsRes.json();
        if (rData.rooms) {
          setRooms(rData.rooms);
          if (currentRoom) {
            const updated = rData.rooms.find((r: GameRoom) => r.id === currentRoom.id);
            if (updated) setCurrentRoom(updated);
          }
        }
      }

      // 3. Fetch Roles
      const rolesRes = await fetch('/api/platform/roles');
      if (rolesRes.ok) {
        const rlData = await rolesRes.json();
        if (rlData.roles) setRoles(rlData.roles);
      }
    } catch {
      // Fallback
    }
  };

  useEffect(() => {
    syncPlatformData();
    const interval = setInterval(syncPlatformData, 3000);
    return () => clearInterval(interval);
  }, [currentRoom?.id]);

  // Initialize and connect WebRTC Audio Service
  const handleConnectRealMicrophone = async () => {
    try {
      setWebrtcError(null);
      const targetRoomId = currentRoom?.id || 'room_default';
      const targetUserId = user?.id || 'usr_me';
      const targetSeatNumber = 1;

      if (!webrtcServiceRef.current) {
        webrtcServiceRef.current = new WebRtcAudioService({
          onLogsChanged: (logs) => setWebrtcLogs([...logs]),
          onPeersChanged: (peers) => setWebrtcPeers([...peers]),
          onUserSpeakingLevel: (level) => {
            setUserSpeakingLevel(level);
            if (level > 25) {
              setActiveSpeakerSeat(1);
            }
          },
        });
      }

      const svc = webrtcServiceRef.current;
      const res = await svc.joinRoom(targetRoomId, targetUserId, targetSeatNumber);

      setWebrtcConnected(res.success);
      setWebrtcIsFallback(res.isFallback);
      setIsMicMuted(false);
      setActiveSpeakerSeat(1);

      if (res.isFallback) {
        setWebrtcError('میکروفون واقعی در این محیط محدود بود؛ سرویس به حالت Web Audio Synthesizer (تست امن) سوییچ کرد.');
      } else {
        setWebrtcError(null);
      }
    } catch (err: any) {
      setWebrtcError(`خطای اتصال WebRTC: ${err.message || 'نامشخص'}`);
      setWebrtcConnected(false);
    }
  };

  const handleDisconnectMicrophone = () => {
    if (webrtcServiceRef.current) {
      webrtcServiceRef.current.leaveRoom();
      webrtcServiceRef.current = null;
    }
    setWebrtcConnected(false);
    setActiveSpeakerSeat(null);
    setUserSpeakingLevel(0);
  };

  const handleToggleMic = () => {
    if (webrtcServiceRef.current) {
      const isMutedNow = webrtcServiceRef.current.toggleMute();
      setIsMicMuted(isMutedNow);
      if (isMutedNow && activeSpeakerSeat === 1) {
        setActiveSpeakerSeat(null);
      }
    } else {
      setIsMicMuted(!isMicMuted);
    }
  };

  // Join Room
  const handleJoinRoom = async (roomId: string) => {
    try {
      const res = await fetch('/api/platform/rooms/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, userId: user?.id || 'usr_me' }),
      });
      const data = await res.json();
      if (data.room) {
        setCurrentRoom(data.room);
        setActiveSubTab('game');
      }
    } catch {
      // Offline fallback
    }
  };

  // Create Room
  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/platform/rooms/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hostUserId: user?.id || 'usr_me',
          name: newRoomName || `عمارت مافیا (${newRoomScenario} نفره)`,
          scenario: newRoomScenario,
          isPrivate: newRoomPrivate,
          passcode: newRoomPasscode,
        }),
      });
      const data = await res.json();
      if (data.room) {
        setCurrentRoom(data.room);
        setShowCreateModal(false);
        setActiveSubTab('game');
        confetti({ particleCount: 40, spread: 60 });
      }
    } catch {
      // Error handling
    }
  };

  // Add Smart AI Bot
  const handleAddBot = async (personality: string = 'analyst') => {
    if (!currentRoom) return;
    try {
      const res = await fetch('/api/platform/rooms/add-bot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: currentRoom.id, personality }),
      });
      const data = await res.json();
      if (data.room) setCurrentRoom(data.room);
    } catch {
      //
    }
  };

  // Instant Fill With Bots and Start Match
  const handleFillBotsAndStart = async () => {
    if (!currentRoom) return;
    try {
      const res = await fetch('/api/platform/rooms/fill-bots-and-start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: currentRoom.id }),
      });
      const data = await res.json();
      if (data.room) {
        setCurrentRoom(data.room);
        confetti({ particleCount: 60, spread: 80 });
      }
    } catch {
      //
    }
  };

  // Purchase Role
  const handlePurchaseRole = async (roleId: string, currency: 'coins' | 'diamonds' | 'points') => {
    try {
      const res = await fetch('/api/platform/roles/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id || 'usr_me', roleId, currencyType: currency }),
      });
      const data = await res.json();
      setPurchaseStatusMsg({ text: data.message, isSuccess: data.success });
      if (data.success && data.user) {
        setUser(data.user);
        confetti({ particleCount: 50, spread: 70 });
      }
      setTimeout(() => setPurchaseStatusMsg(null), 5000);
    } catch {
      setPurchaseStatusMsg({ text: 'خطا در برقراری ارتباط با سرور', isSuccess: false });
    }
  };

  // Send In-Room Message
  const handleSendChatMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !currentRoom) return;

    const newMsg = {
      id: 'm_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      senderId: user?.id || 'usr_me',
      senderName: user?.displayName || 'شما',
      senderSeat: 1,
      text: chatInput.trim(),
      timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
      channel: 'public' as const,
    };

    currentRoom.chatMessages.push(newMsg);
    setCurrentRoom({ ...currentRoom });
    setChatInput('');
  };

  // Bot Speech Simulation
  const handleTriggerBotSpeeches = () => {
    if (!currentRoom) return;
    const botParticipants = currentRoom.participants.filter((p) => p.isBot && p.isAlive);
    if (botParticipants.length === 0) return;

    const speechIdeas = [
      (b: string) => `من رفتارهای صندلی ۳ رو زیر نظر داشتم، به نظرم توی شب رفتارهای متناقض داشته!`,
      (b: string) => `دوستان، خفت‌گیر دیشب دهان یکی از شهروندان رو بسته بود، باید مافیا رو پیدا کنیم.`,
      (b: string) => `به عنوان یک شهروند مستقل پیشنهاد می‌کنم به فکت‌های بازی توجه کنیم نه حدسیات.`,
      (b: string) => `دفاعیه صندلی متهم ضعیف بود و استدلال‌های منطقی ارائه نکرد.`,
    ];

    const randomBot = botParticipants[Math.floor(Math.random() * botParticipants.length)];
    const chosenIdea = speechIdeas[Math.floor(Math.random() * speechIdeas.length)](randomBot.displayName);

    currentRoom.chatMessages.push({
      id: 'm_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      senderId: randomBot.userId,
      senderName: randomBot.displayName,
      senderSeat: randomBot.seatNumber,
      text: chosenIdea,
      timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
      channel: 'public',
    });

    setActiveSpeakerSeat(randomBot.seatNumber);
    setCurrentRoom({ ...currentRoom });
  };

  const filteredRoles = roles.filter((r) => {
    if (selectedRoleFilter === 'all') return true;
    return r.team === selectedRoleFilter;
  });

  return (
    <div className="bg-[#17212b] rounded-2xl border border-[#242f3d] p-5 shadow-2xl max-w-5xl mx-auto space-y-6 select-none font-['Vazirmatn',sans-serif]">
      {/* Platform Header: User Status, Currency Bar & Navigation */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-[#242f3d] pb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-600 to-indigo-600 flex items-center justify-center text-2xl shadow-lg border border-white/10">
            {user?.avatarEmoji || '🎩'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-extrabold text-white text-base">{user?.displayName || 'فرمانده مافیا'}</h2>
              <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold">
                سطح {user?.level || 1} • لیگ {user?.league?.toUpperCase()}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              برد: {user?.gamesWon} | باخت: {user?.gamesLost} | نرخ پیروزی: {user?.winRate}%
            </p>
          </div>
        </div>

        {/* Real Currencies (Coins, Diamonds, League Points) */}
        <div className="flex items-center gap-2 bg-[#0e1621] p-1.5 rounded-2xl border border-[#242f3d]">
          <div className="flex items-center gap-1.5 px-3 py-1 bg-[#17212b] rounded-xl text-xs font-bold text-amber-400 border border-amber-500/20">
            <Coins className="w-4 h-4 text-amber-400" />
            <span>{user?.coins?.toLocaleString() || 0}</span>
            <span className="text-[10px] text-slate-400 font-normal">سکه</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1 bg-[#17212b] rounded-xl text-xs font-bold text-cyan-400 border border-cyan-500/20">
            <Gem className="w-4 h-4 text-cyan-400" />
            <span>{user?.diamonds?.toLocaleString() || 0}</span>
            <span className="text-[10px] text-slate-400 font-normal">الماس</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1 bg-[#17212b] rounded-xl text-xs font-bold text-purple-400 border border-purple-500/20">
            <Award className="w-4 h-4 text-purple-400" />
            <span>{user?.points?.toLocaleString() || 0}</span>
            <span className="text-[10px] text-slate-400 font-normal">پوینت</span>
          </div>
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#242f3d] pb-2">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveSubTab('rooms')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'rooms'
                ? 'bg-[#0088cc] text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#1e2a38]'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>اتاق‌های آنلاین ({rooms.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('game')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'game'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#1e2a38]'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>میز بازی و مسابقه {currentRoom && '🟢'}</span>
          </button>

          <button
            onClick={() => setActiveSubTab('market')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'market'
                ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#1e2a38]'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>فروشگاه نقش‌ها و اقتصاد ({roles.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('ranking')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'ranking'
                ? 'bg-gradient-to-r from-purple-600 to-rose-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#1e2a38]'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>لیگ و رتبه‌بندی</span>
          </button>
        </div>

        {/* Create Room Quick Button */}
        {activeSubTab === 'rooms' && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>ساخت اتاق جدید</span>
          </button>
        )}
      </div>

      {/* ======================================================== */}
      {/* TAB 1: ONLINE ROOMS LOBBY                                */}
      {/* ======================================================== */}
      {activeSubTab === 'rooms' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rooms.map((room) => {
              const aliveCount = room.participants.filter((p) => p.isAlive).length;
              const isFull = room.participants.length >= room.maxPlayers;

              return (
                <div
                  key={room.id}
                  className="bg-[#0e1621] p-4 rounded-2xl border border-[#242f3d] hover:border-[#0088cc]/50 transition-all space-y-3 shadow-lg"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-sm text-white flex items-center gap-1.5">
                        <span>{room.name}</span>
                        {room.isPrivate && <Lock className="w-3.5 h-3.5 text-amber-400" />}
                      </h4>
                      <p className="text-xs text-slate-400 mt-1">
                        سناریوی {room.selectedScenario} نفره | فاز فعلی:{' '}
                        <span className="text-indigo-400 font-bold">{room.currentPhase}</span>
                      </p>
                    </div>
                    <span className="text-xs px-2.5 py-1 rounded-full font-mono font-bold bg-[#17212b] text-cyan-300 border border-[#242f3d]">
                      {room.participants.length} / {room.maxPlayers}
                    </span>
                  </div>

                  {/* Room Participants Avatars */}
                  <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                    {room.participants.map((p) => (
                      <div
                        key={p.userId}
                        title={`${p.displayName} [صندلی ${p.seatNumber}]`}
                        className="w-8 h-8 rounded-full bg-[#17212b] border border-[#242f3d] flex items-center justify-center text-sm shrink-0"
                      >
                        {p.avatarEmoji}
                      </div>
                    ))}
                    {Array.from({ length: room.maxPlayers - room.participants.length }).map((_, i) => (
                      <div
                        key={i}
                        className="w-8 h-8 rounded-full border border-dashed border-slate-700 flex items-center justify-center text-xs text-slate-600 shrink-0"
                      >
                        +
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-[#1c2a38]">
                    <div className="flex items-center gap-2 text-[11px] text-emerald-400">
                      <Radio className="w-3.5 h-3.5 animate-pulse" />
                      <span>ویس‌کال زنده فعال</span>
                    </div>

                    <button
                      onClick={() => handleJoinRoom(room.id)}
                      className="px-4 py-1.5 bg-[#0088cc] hover:bg-[#0099e6] text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all flex items-center gap-1"
                    >
                      <span>ورود به بازی</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: ACTIVE MATCH & WEBRTC VOICE CALL                  */}
      {/* ======================================================== */}
      {activeSubTab === 'game' && (
        <div className="space-y-5">
          {!currentRoom ? (
            <div className="text-center py-12 bg-[#0e1621] rounded-2xl border border-[#242f3d] space-y-3">
              <div className="text-4xl">🏛️</div>
              <h4 className="font-bold text-white text-sm">هیچ اتاقی انتخاب نشده است</h4>
              <p className="text-xs text-slate-400">لطفاً از تب اتاق‌ها وارد یک عمارت شوید یا اتاقی بسازید.</p>
              <button
                onClick={() => setActiveSubTab('rooms')}
                className="px-4 py-2 bg-[#0088cc] text-white rounded-xl text-xs font-bold"
              >
                مشاهده اتاق‌ها
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Room Top Controller Bar */}
              <div className="bg-[#0e1621] p-3 px-4 rounded-2xl border border-[#242f3d] flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-rose-600 flex items-center justify-center text-xl shadow-md">
                    🎭
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
                      <span>{currentRoom.name}</span>
                      <span className="text-[10px] bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full font-bold">
                        فاز: {currentRoom.currentPhase === 'night' ? '🌑 شب' : currentRoom.currentPhase === 'day_speech' ? '☀️ روز و صحبت' : currentRoom.currentPhase}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      روز {currentRoom.dayNumber} | ظرفیت: {currentRoom.participants.length} از {currentRoom.maxPlayers}
                    </p>
                  </div>
                </div>

                {/* Quick Actions (Add Bots, Start Game) */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleAddBot('analyst')}
                    className="px-3 py-1.5 bg-[#242f3d] hover:bg-[#2e3d4e] text-amber-300 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Bot className="w-3.5 h-3.5" />
                    <span>افزودن هوش مصنوعی 🤖</span>
                  </button>

                  <button
                    onClick={handleFillBotsAndStart}
                    className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer flex items-center gap-1"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>تکمیل آنی و شروع بازی 🚀</span>
                  </button>
                </div>
              </div>

              {/* WebRTC Voice Call Bar */}
              <div className="bg-gradient-to-r from-[#17212b] via-[#1a2838] to-[#17212b] p-3.5 rounded-2xl border border-emerald-500/30 flex flex-wrap items-center justify-between gap-4 shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center text-white text-lg font-bold shadow-md ring-4 ring-emerald-500/30 animate-pulse">
                      🎙️
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-emerald-400 font-bold flex items-center gap-1.5">
                      <span>ویس‌کال زنده مافیا:</span>
                      <span className="font-mono text-white text-sm">
                        {activeSpeakerSeat
                          ? `صندلی [${activeSpeakerSeat}: ${
                              currentRoom.participants.find((p) => p.seatNumber === activeSpeakerSeat)?.displayName
                            }]`
                          : 'آزاد (شنونده)'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                      {webrtcConnected ? (
                        <>
                          <span className="text-emerald-400 font-bold flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                            {webrtcIsFallback ? '🟡 اتاق صوتی امن (Synthesizer)' : '🟢 میکروفون زنده WebRTC'}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            حجم صدا: {userSpeakingLevel}%
                          </span>
                        </>
                      ) : (
                        <span>⚪ تماس صوتی قطع است</span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Equalizer animation */}
                <div className="flex items-center gap-1 h-7">
                  {[45, 80, 95, 55, 90, 35, 100, 65, 50, 85].map((h, idx) => (
                    <div
                      key={idx}
                      className={`w-1 rounded-full transition-all duration-150 ${
                        webrtcConnected && activeSpeakerSeat ? 'bg-emerald-400 animate-pulse' : 'bg-slate-700'
                      }`}
                      style={{
                        height: webrtcConnected && activeSpeakerSeat ? `${Math.max(20, (h * userSpeakingLevel) / 70)}%` : '20%',
                        animationDelay: `${idx * 80}ms`,
                      }}
                    ></div>
                  ))}
                </div>

                {/* Mic & Voice Controls */}
                <div className="flex items-center gap-2">
                  {!webrtcConnected ? (
                    <button
                      onClick={handleConnectRealMicrophone}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer transition-all"
                    >
                      <PhoneCall className="w-3.5 h-3.5" />
                      <span>اتصال ویس WebRTC</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleDisconnectMicrophone}
                      className="px-3.5 py-1.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 rounded-xl text-xs font-bold border border-rose-500/30 flex items-center gap-1.5 cursor-pointer"
                    >
                      <PhoneOff className="w-3.5 h-3.5" />
                      <span>قطع تماس صوتی</span>
                    </button>
                  )}

                  <button
                    onClick={handleToggleMic}
                    className={`p-2 rounded-xl transition-colors cursor-pointer ${
                      isMicMuted ? 'bg-rose-600/20 text-rose-400 border border-rose-500/30' : 'bg-[#242f3d] text-emerald-400'
                    }`}
                    title={isMicMuted ? 'میکروفون بسته' : 'میکروفون باز'}
                  >
                    {isMicMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </button>

                  <button
                    onClick={handleTriggerBotSpeeches}
                    className="px-3 py-1.5 bg-[#242f3d] hover:bg-[#2e3d4e] text-cyan-300 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
                    title="تحریک هوش مصنوعی برای صحبت در ویس‌کال"
                  >
                    <Brain className="w-3.5 h-3.5" />
                    <span>مناظره بات‌ها 🗣️</span>
                  </button>

                  {/* WebRTC Diagnostics & Logs Modal Toggle */}
                  <button
                    onClick={() => setShowWebRtcLogsModal(true)}
                    className="p-2 bg-[#17212b] hover:bg-[#202d3d] text-amber-300 rounded-xl border border-amber-500/30 text-xs flex items-center gap-1 cursor-pointer"
                    title="مشاهده لاگ‌های زنده WebRTC و وضعیت اتاق صوتی"
                  >
                    <Terminal className="w-4 h-4" />
                    <span className="hidden sm:inline">لاگ WebRTC ({webrtcLogs.length})</span>
                  </button>
                </div>
              </div>

              {webrtcError && (
                <div className="p-3 bg-amber-950/40 border border-amber-500/40 rounded-xl text-xs text-amber-300 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                  <span>{webrtcError}</span>
                </div>
              )}

              {/* Game Table Seats Grid */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-300">
                  🪑 صندلی‌های بازی ({currentRoom.participants.length} / {currentRoom.maxPlayers}):
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {currentRoom.participants.map((p) => {
                    const isSelected = selectedTargetSeat === p.seatNumber;
                    const isSpeaking = activeSpeakerSeat === p.seatNumber;
                    const assignedRole = p.assignedRoleId ? roles.find((r) => r.id === p.assignedRoleId) : null;

                    return (
                      <div
                        key={p.userId}
                        onClick={() => setSelectedTargetSeat(p.seatNumber)}
                        className={`p-3 rounded-2xl border transition-all text-right cursor-pointer relative overflow-hidden ${
                          isSelected
                            ? 'bg-[#1e2f42] border-[#0088cc] ring-2 ring-[#0088cc]/30 shadow-lg'
                            : 'bg-[#0e1621] hover:bg-[#162331] border-[#242f3d]'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-slate-300">صندلی [{p.seatNumber}]</span>
                          <span className="text-xl">{assignedRole ? assignedRole.emoji : p.avatarEmoji}</span>
                        </div>

                        <div className="font-bold text-xs text-white truncate flex items-center gap-1">
                          <span>{p.displayName}</span>
                          {p.userId === user?.id && <span className="text-[10px] text-cyan-400 font-normal">(شما)</span>}
                        </div>

                        <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                          {assignedRole ? (
                            <span className={assignedRole.team === 'mafia' ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                              {assignedRole.name}
                            </span>
                          ) : (
                            <span>در انتظار نقش</span>
                          )}
                        </div>

                        {/* Status bar */}
                        <div className="mt-2 pt-1.5 border-t border-[#1c2a38] flex items-center justify-between text-[10px]">
                          <span className={p.isAlive ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                            {p.isAlive ? '🟢 زنده' : '💀 حذف شده'}
                          </span>
                          {isSpeaking && <span className="text-emerald-400 font-bold animate-bounce">🎙️ در حال صحبت</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Chat & System Log Box */}
              <div className="bg-[#0e1621] rounded-2xl border border-[#242f3d] overflow-hidden">
                <div className="p-3 bg-[#17212b] border-b border-[#242f3d] text-xs font-bold text-slate-300 flex items-center justify-between">
                  <span>💬 چت و گزارشات بازی</span>
                  <span className="text-[10px] text-slate-500 font-mono">کانال عمومی / شب محرمانه</span>
                </div>

                <div className="h-48 overflow-y-auto p-3 space-y-2 text-xs">
                  {currentRoom.chatMessages.map((msg, idx) => (
                    <div key={`${msg.id || 'msg'}_${idx}`} className="p-2 rounded-xl bg-[#17212b]/80 border border-[#242f3d]">
                      <div className="flex items-center justify-between text-[11px] mb-0.5">
                        <span className="font-bold text-amber-300">{msg.senderName}</span>
                        <span className="text-[10px] text-slate-500 font-mono">{msg.timestamp}</span>
                      </div>
                      <p className="text-slate-200">{msg.text}</p>
                    </div>
                  ))}
                </div>

                {/* Input box */}
                <form onSubmit={handleSendChatMessage} className="p-2 bg-[#17212b] border-t border-[#242f3d] flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="پیام یا دفاعیه خود را بنویسید..."
                    className="flex-1 bg-[#0e1621] border border-[#242f3d] rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#0088cc]"
                  />
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-[#0088cc] text-white rounded-xl text-xs font-bold cursor-pointer"
                  >
                    ارسال
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: ROLE MARKETPLACE & ECONOMY STORE                 */}
      {/* ======================================================== */}
      {activeSubTab === 'market' && (
        <div className="space-y-4">
          {/* Market Status Notification */}
          {purchaseStatusMsg && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                purchaseStatusMsg.isSuccess
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                  : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
              }`}
            >
              {purchaseStatusMsg.isSuccess ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
              <span>{purchaseStatusMsg.text}</span>
            </div>
          )}

          {/* Filter Bar */}
          <div className="flex items-center gap-2">
            {(['all', 'mafia', 'citizens', 'independent'] as const).map((filterKey) => (
              <button
                key={filterKey}
                onClick={() => setSelectedRoleFilter(filterKey)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedRoleFilter === filterKey
                    ? 'bg-[#0088cc] text-white'
                    : 'bg-[#0e1621] text-slate-400 hover:text-white border border-[#242f3d]'
                }`}
              >
                {filterKey === 'all'
                  ? 'تمامی نقش‌ها'
                  : filterKey === 'mafia'
                  ? 'تیم مافیا 🎩'
                  : filterKey === 'citizens'
                  ? 'تیم شهروندان 👥'
                  : 'نقش‌های مستقل 🔪'}
              </button>
            ))}
          </div>

          {/* Roles Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredRoles.map((role) => {
              const isOwned = user?.ownedRoleIds?.includes(role.id);
              const isLevelLocked = (user?.level || 1) < role.minLevelRequired;

              return (
                <div
                  key={role.id}
                  className="bg-[#0e1621] p-4 rounded-2xl border border-[#242f3d] hover:border-amber-500/40 transition-all flex flex-col justify-between space-y-3 shadow-lg"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-3xl">{role.emoji}</span>
                        <div>
                          <h4 className="font-extrabold text-sm text-white">{role.name}</h4>
                          <span className="text-[10px] text-slate-400 font-mono">{role.englishName}</span>
                        </div>
                      </div>

                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                          role.rarity === 'legendary'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : role.rarity === 'epic'
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                            : 'bg-slate-700/50 text-slate-300'
                        }`}
                      >
                        {role.rarity}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed mb-2">{role.description}</p>
                    <div className="p-2 rounded-xl bg-[#17212b] text-[11px] text-indigo-300 border border-[#242f3d]">
                      ⚡ توانایی: {role.nightAbility}
                    </div>
                  </div>

                  {/* Pricing and Action */}
                  <div className="pt-3 border-t border-[#1c2a38] flex items-center justify-between gap-2">
                    {isOwned ? (
                      <span className="text-xs text-emerald-400 font-bold flex items-center gap-1 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>مالکیت فعال</span>
                      </span>
                    ) : isLevelLocked ? (
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Lock className="w-3.5 h-3.5" />
                        <span>نیاز به سطح {role.minLevelRequired}</span>
                      </span>
                    ) : (
                      <div className="flex items-center gap-1.5 w-full">
                        {role.coinsPrice > 0 && (
                          <button
                            onClick={() => handlePurchaseRole(role.id, 'coins')}
                            className="flex-1 py-1.5 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors"
                          >
                            <Coins className="w-3.5 h-3.5 text-amber-400" />
                            <span>{role.coinsPrice.toLocaleString()}</span>
                          </button>
                        )}
                        {role.diamondsPrice > 0 && (
                          <button
                            onClick={() => handlePurchaseRole(role.id, 'diamonds')}
                            className="flex-1 py-1.5 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 rounded-xl text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors"
                          >
                            <Gem className="w-3.5 h-3.5 text-cyan-400" />
                            <span>{role.diamondsPrice} الماس</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 4: RANKING & LEAGUES                                 */}
      {/* ======================================================== */}
      {activeSubTab === 'ranking' && (
        <div className="bg-[#0e1621] p-5 rounded-2xl border border-[#242f3d] space-y-4">
          <div className="flex items-center justify-between border-b border-[#242f3d] pb-3">
            <div>
              <h3 className="font-extrabold text-sm text-white flex items-center gap-1.5">
                <Trophy className="w-4 h-4 text-amber-400" />
                <span>جدول برترین‌های فصل مافیا</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">رتبه‌بندی بر اساس پوینت مسابقات رقابتی</p>
            </div>
            <span className="text-xs text-purple-400 font-bold bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20">
              فصل زمستان ۱۴۰۵
            </span>
          </div>

          <div className="space-y-2">
            {[
              { rank: 1, name: 'سارا تک‌تیرانداز', points: 1650, league: 'پلاتینیوم', winRate: '69.6%' },
              { rank: 2, name: 'فرمانده مافیا (شما)', points: 1250, league: 'طلایی', winRate: '68.7%' },
              { rank: 3, name: 'علیرضا کارآگاه', points: 980, league: 'نقره‌ای', winRate: '58.3%' },
              { rank: 4, name: 'بهرام حرفه‌ای', points: 890, league: 'برنز', winRate: '52.1%' },
            ].map((entry) => (
              <div
                key={entry.rank}
                className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                  entry.rank === 2
                    ? 'bg-[#1e2f42] border-[#0088cc]'
                    : 'bg-[#17212b] border-[#242f3d]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="font-extrabold text-sm text-amber-400 w-5">#{entry.rank}</span>
                  <div>
                    <div className="font-bold text-white">{entry.name}</div>
                    <div className="text-[10px] text-slate-400">لیگ {entry.league}</div>
                  </div>
                </div>

                <div className="text-left font-mono">
                  <div className="font-extrabold text-purple-300">{entry.points} PTS</div>
                  <div className="text-[10px] text-emerald-400">برد: {entry.winRate}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal: Create Room */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#17212b] rounded-2xl border border-[#242f3d] p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="font-bold text-base text-white">ساخت اتاق بازی آنلاین جدید</h3>

            <form onSubmit={handleCreateRoom} className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">نام عمارت یا اتاق:</label>
                <input
                  type="text"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  placeholder="مثال: کاخ مافیای شبانه"
                  className="w-full bg-[#0e1621] border border-[#242f3d] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#0088cc]"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">سناریوی بازی:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewRoomScenario(9)}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                      newRoomScenario === 9
                        ? 'bg-[#0088cc] text-white border-[#0088cc]'
                        : 'bg-[#0e1621] text-slate-400 border-[#242f3d]'
                    }`}
                  >
                    ۹ نفره (کلاسیک)
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewRoomScenario(12)}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                      newRoomScenario === 12
                        ? 'bg-purple-600 text-white border-purple-500'
                        : 'bg-[#0e1621] text-slate-400 border-[#242f3d]'
                    }`}
                  >
                    ۱۲ نفره (حرفه‌ای با مستقل)
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="privateCheck"
                  checked={newRoomPrivate}
                  onChange={(e) => setNewRoomPrivate(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="privateCheck" className="text-xs text-slate-300">
                  اتاق خصوصی با رمز ورود
                </label>
              </div>

              {newRoomPrivate && (
                <div>
                  <input
                    type="password"
                    value={newRoomPasscode}
                    onChange={(e) => setNewRoomPasscode(e.target.value)}
                    placeholder="رمز عبور اتاق"
                    className="w-full bg-[#0e1621] border border-[#242f3d] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#0088cc]"
                  />
                </div>
              )}

              <div className="flex items-center gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2 bg-[#242f3d] text-slate-300 rounded-xl text-xs font-medium cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-[#0088cc] hover:bg-[#0099e6] text-white rounded-xl text-xs font-bold shadow-md cursor-pointer"
                >
                  ایجاد اتاق
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* WebRTC Diagnostics & Room Debugger Modal                 */}
      {/* ======================================================== */}
      {showWebRtcLogsModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#17212b] border border-[#242f3d] w-full max-w-2xl rounded-2xl p-5 shadow-2xl space-y-4 max-h-[85vh] flex flex-col font-['Vazirmatn',sans-serif]">
            <div className="flex items-center justify-between border-b border-[#242f3d] pb-3">
              <div className="flex items-center gap-2">
                <Terminal className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-sm text-white">کنسول عیب‌یابی و لاگ‌های زنده WebRTC</h3>
              </div>
              <button
                onClick={() => setShowWebRtcLogsModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Room Diagnostics Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="bg-[#0e1621] p-2.5 rounded-xl border border-[#242f3d]">
                <span className="text-[10px] text-slate-400 block">وضعیت اتصال:</span>
                <span className={`font-bold ${webrtcConnected ? 'text-emerald-400' : 'text-slate-500'}`}>
                  {webrtcConnected ? 'متصل به اتاق صوتی' : 'قطع'}
                </span>
              </div>
              <div className="bg-[#0e1621] p-2.5 rounded-xl border border-[#242f3d]">
                <span className="text-[10px] text-slate-400 block">حالت استریم:</span>
                <span className={`font-bold ${webrtcIsFallback ? 'text-amber-400' : 'text-cyan-400'}`}>
                  {webrtcIsFallback ? 'Virtual Synth (امن)' : 'Hardware Mic'}
                </span>
              </div>
              <div className="bg-[#0e1621] p-2.5 rounded-xl border border-[#242f3d]">
                <span className="text-[10px] text-slate-400 block">حجم صدای شما:</span>
                <span className="font-bold text-white font-mono">{userSpeakingLevel}%</span>
              </div>
              <div className="bg-[#0e1621] p-2.5 rounded-xl border border-[#242f3d]">
                <span className="text-[10px] text-slate-400 block">پیرهای فعال:</span>
                <span className="font-bold text-indigo-400 font-mono">{webrtcPeers.length} کاربر</span>
              </div>
            </div>

            {/* Live Terminal Log Stream */}
            <div className="flex-1 overflow-y-auto bg-[#0a0f18] p-3 rounded-xl border border-[#1e293b] font-mono text-xs space-y-2 min-h-[220px]">
              {webrtcLogs.length === 0 ? (
                <div className="text-center py-10 text-slate-500 text-xs font-sans">
                  هیچ لاگی هنوز ثبت نشده است. روی «اتصال ویس WebRTC» کلیک کنید تا فرآیند اتصال ارزیابی و ثبت شود.
                </div>
              ) : (
                webrtcLogs.map((lg) => {
                  const badgeColor =
                    lg.level === 'success'
                      ? 'text-emerald-400 bg-emerald-950/50 border-emerald-800'
                      : lg.level === 'warn'
                      ? 'text-amber-400 bg-amber-950/50 border-amber-800'
                      : lg.level === 'error'
                      ? 'text-rose-400 bg-rose-950/50 border-rose-800'
                      : 'text-cyan-400 bg-cyan-950/50 border-cyan-800';

                  return (
                    <div key={lg.id} className="flex items-start gap-2 text-[11px] leading-relaxed">
                      <span className="text-slate-500 shrink-0 font-mono text-[10px]">{lg.timestamp}</span>
                      <span className={`px-1.5 py-0.2 rounded text-[9px] uppercase border font-bold shrink-0 ${badgeColor}`}>
                        {lg.level}
                      </span>
                      <span className="text-slate-200 break-words font-sans">{lg.message}</span>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-[11px] text-slate-400">
                محیط تست Sandbox به طور خودکار به Web Audio Fallback سوئیچ می‌کند تا عدم دسترسی به میکروفون مانع بازی نشود.
              </span>
              <button
                type="button"
                onClick={() => setShowWebRtcLogsModal(false)}
                className="px-4 py-1.5 bg-[#0088cc] hover:bg-[#0099e6] text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                بستن
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
