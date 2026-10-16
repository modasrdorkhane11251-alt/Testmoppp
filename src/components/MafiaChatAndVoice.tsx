import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  PhoneCall,
  PhoneOff,
  Send,
  Volume2,
  VolumeX,
  Radio,
  Play,
  Square,
  Sparkles,
  MessageSquare,
  Shield,
  UserCheck,
  AlertCircle
} from 'lucide-react';
import {
  MafiaChatMessage,
  MafiaVoiceCallParticipant,
  FullMafiaGame,
  MAFIA_ROLES_CATALOG
} from '../services/mafiaEngine';

interface Props {
  game: FullMafiaGame;
  userSeat: number;
  onSendMessage: (text: string, isVoice?: boolean, duration?: number) => void;
  onTriggerBotDebate: () => void;
  onToggleVoiceCall: (start: boolean) => void;
  onSetSpeaker: (seatNumber: number) => void;
}

export const MafiaChatAndVoice: React.FC<Props> = ({
  game,
  userSeat,
  onSendMessage,
  onTriggerBotDebate,
  onToggleVoiceCall,
  onSetSpeaker,
}) => {
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'voice'>('chat');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recordingTimerRef = useRef<any>(null);

  // Auto scroll chat to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [game.chatMessages?.length]);

  // Handle voice recording simulation
  const handleStartRecording = () => {
    setIsRecording(true);
    setRecordingSeconds(0);
    recordingTimerRef.current = setInterval(() => {
      setRecordingSeconds((prev) => prev + 1);
    }, 1000);
  };

  const handleStopRecordingAndSend = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
    }
    setIsRecording(false);
    const duration = Math.max(2, recordingSeconds);
    const simulatedVoiceTexts = [
      '🎤 [ویس ارسالی]: من مطمئنم صندلی ۳ مافیاست، دیشب صدای استعلامش رو هم شنیدم!',
      '🎤 [ویس ارسالی]: دوستان لطفاً عجولانه رای ندید، من تارگت هام رو روی میز می‌ذارم.',
      '🎤 [ویس ارسالی]: من دفاعیه خودم رو تموم کردم و بی‌گناهی‌ام برای همه شهروندان روشنه.',
      '🎤 [ویس ارسالی]: استدلال‌های کارآگاه کاملاً درسته و نباید مسیر بازی منحرف بشه.',
    ];
    const chosenText = simulatedVoiceTexts[Math.floor(Math.random() * simulatedVoiceTexts.length)];
    onSendMessage(chosenText, true, duration);
    setRecordingSeconds(0);
  };

  const handleCancelRecording = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
    }
    setIsRecording(false);
    setRecordingSeconds(0);
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim(), false);
    setInputText('');
  };

  // Play synthetic voice note audio beep/hum effect via Web Audio API
  const handlePlayVoiceNote = (msgId: string, durationSec: number = 3) => {
    if (playingVoiceId === msgId) {
      setPlayingVoiceId(null);
      return;
    }
    setPlayingVoiceId(msgId);

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        const ctx = new AudioContextClass();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(320, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.3);
        osc.frequency.exponentialRampToValueAtTime(350, ctx.currentTime + 0.8);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + Math.min(durationSec, 2.5));
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + Math.min(durationSec, 2.5));
      }
    } catch {
      // Audio fallback
    }

    setTimeout(() => {
      setPlayingVoiceId(null);
    }, (durationSec || 3) * 1000);
  };

  const voiceCall = game.voiceCall || { isActive: false, participants: [] };
  const userPlayer = game.players.find((p) => p.seatNumber === userSeat);
  const isUserAlive = userPlayer?.isAlive ?? true;

  return (
    <div className="bg-[#0e1621] rounded-2xl border border-[#242f3d] overflow-hidden shadow-xl mt-4 font-['Vazirmatn',sans-serif]">
      {/* Top Bar with Mode Switcher & Voice Call Indicator */}
      <div className="bg-[#17212b] p-3 px-4 border-b border-[#242f3d] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex bg-[#0e1621] p-1 rounded-xl border border-[#242f3d]">
            <button
              onClick={() => setActiveTab('chat')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'chat'
                  ? 'bg-[#0088cc] text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>چت و ویس تلگرامی ({game.chatMessages?.length || 0})</span>
            </button>
            <button
              onClick={() => setActiveTab('voice')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'voice'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>ویس کال زنده (Voice Call)</span>
              {voiceCall.isActive && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              )}
            </button>
          </div>
        </div>

        {/* Voice Call Global Toggle Button */}
        <div className="flex items-center gap-2">
          {voiceCall.isActive ? (
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-emerald-400 font-bold flex items-center gap-1 bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                تماس صوتی فعال
              </span>
              <button
                onClick={() => onToggleVoiceCall(false)}
                className="px-3 py-1 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 rounded-lg text-xs font-bold flex items-center gap-1 border border-rose-500/30 transition-colors cursor-pointer"
              >
                <PhoneOff className="w-3.5 h-3.5" />
                <span>قطع تماس</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => onToggleVoiceCall(true)}
              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>اتصال ویس‌کال مافیا</span>
            </button>
          )}

          {/* Trigger Bot Discussion Button */}
          <button
            onClick={onTriggerBotDebate}
            title="شبیه‌سازی صحبت و اتهام‌زنی سایر بازیکنان"
            className="px-3 py-1 bg-[#242f3d] hover:bg-[#2e3d4e] text-amber-300 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>مناظره بات‌ها 🤖</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Live Voice Call Panel */}
      {activeTab === 'voice' && (
        <div className="p-4 space-y-4">
          {!voiceCall.isActive ? (
            <div className="text-center py-8 space-y-3">
              <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-400 text-2xl">
                🎙️
              </div>
              <h4 className="font-bold text-white text-sm">اتاق گفتگوی صوتی گروهی (Telegram Group Voice Chat)</h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                در فاز روز و دفاعیه، تمامی بازیکنان مافیا در این اتاق به صورت همزمان متصل می‌شوند و می‌توانند نوبت به نوبت صحبت کنند یا درخواست میکروفون دهند.
              </p>
              <button
                onClick={() => onToggleVoiceCall(true)}
                className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold shadow-lg inline-flex items-center gap-2 cursor-pointer transition-all"
              >
                <PhoneCall className="w-4 h-4" />
                <span>ورود به ویس کال مافیا</span>
              </button>
            </div>
          ) : (
            <div>
              {/* Active Speaker Spotlight */}
              <div className="bg-gradient-to-r from-[#17212b] via-[#1a2838] to-[#17212b] p-4 rounded-xl border border-emerald-500/30 flex items-center justify-between gap-4 mb-4 shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-emerald-600 flex items-center justify-center text-white text-xl font-bold shadow-md ring-4 ring-emerald-500/30 animate-pulse">
                      🎙️
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-emerald-400 font-bold flex items-center gap-1.5">
                      <span>درحال صحبت:</span>
                      <span className="font-mono text-white text-sm">
                        {voiceCall.activeSpeakerSeat
                          ? `صندلی [${voiceCall.activeSpeakerSeat}: ${
                              game.players.find((p) => p.seatNumber === voiceCall.activeSpeakerSeat)?.name
                            }]`
                          : 'هیچ‌کس (اتاق آزاد)'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      کیفیت صدا: HD 48kHz Stereo | تاخیر شبکه: 18ms
                    </p>
                  </div>
                </div>

                {/* Animated Equalizer Waveform */}
                <div className="flex items-center gap-1 h-8">
                  {[40, 75, 90, 50, 85, 30, 95, 60, 45, 80].map((h, idx) => (
                    <div
                      key={idx}
                      className="w-1 bg-emerald-400 rounded-full transition-all duration-150 animate-pulse"
                      style={{
                        height: voiceCall.activeSpeakerSeat ? `${h}%` : '20%',
                        animationDelay: `${idx * 80}ms`,
                      }}
                    ></div>
                  ))}
                </div>
              </div>

              {/* Grid of Voice Call Participants */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                {game.players
                  .filter((p) => p.isAlive)
                  .map((p) => {
                    const isSpeaking = voiceCall.activeSpeakerSeat === p.seatNumber;
                    const isUser = p.seatNumber === userSeat;
                    const role = MAFIA_ROLES_CATALOG[p.role];

                    return (
                      <div
                        key={p.seatNumber}
                        onClick={() => onSetSpeaker(p.seatNumber)}
                        className={`p-3 rounded-xl border transition-all text-right cursor-pointer relative overflow-hidden ${
                          isSpeaking
                            ? 'bg-[#1e2f42] border-emerald-500 ring-2 ring-emerald-500/40 shadow-lg'
                            : 'bg-[#17212b] hover:bg-[#1f2b38] border-[#242f3d]'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-slate-200">
                            صندلی [{p.seatNumber}]
                          </span>
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs ${
                              isSpeaking
                                ? 'bg-emerald-500 text-white animate-bounce'
                                : 'bg-[#242f3d] text-slate-400'
                            }`}
                          >
                            {isSpeaking ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
                          </div>
                        </div>

                        <div className="font-bold text-xs text-white truncate flex items-center gap-1">
                          <span>{p.name}</span>
                          {isUser && <span className="text-[10px] text-indigo-400 font-normal">(شما)</span>}
                        </div>

                        <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                          {isSpeaking ? (
                            <span className="text-emerald-400 font-bold">🎙️ در حال صحبت...</span>
                          ) : (
                            <span>شنونده</span>
                          )}
                        </div>

                        {/* Speaker switch action */}
                        <div className="mt-2 pt-1.5 border-t border-[#242f3d] flex items-center justify-between text-[10px]">
                          <span className="text-slate-500">{isUser ? 'میکروفون شما' : 'بات هوشمند'}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onSetSpeaker(p.seatNumber);
                            }}
                            className="text-[#0088cc] hover:underline font-bold"
                          >
                            {isSpeaking ? 'پایان صحبت' : 'دادن میکروفون 🎤'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>

              {/* Bottom Quick Mic Control for User */}
              <div className="bg-[#17212b] p-3 rounded-xl border border-[#242f3d] flex items-center justify-between gap-3 mt-4">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onSetSpeaker(userSeat)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer ${
                      voiceCall.activeSpeakerSeat === userSeat
                        ? 'bg-rose-600 hover:bg-rose-500 text-white ring-2 ring-rose-400/40'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    }`}
                  >
                    <Mic className="w-4 h-4" />
                    <span>
                      {voiceCall.activeSpeakerSeat === userSeat ? 'قطع صحبت من 🔇' : 'من صحبت کنم (گرفتن تریبون 🎤)'}
                    </span>
                  </button>
                  <button
                    onClick={() => setIsMuted(!isMuted)}
                    className="p-2 bg-[#242f3d] hover:bg-[#2e3d4e] text-slate-300 rounded-xl transition-colors cursor-pointer"
                    title={isMuted ? 'صدا وصل' : 'میوت'}
                  >
                    {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
                  </button>
                </div>
                <div className="text-[11px] text-slate-400">
                  {isUserAlive ? 'وضعیت: زنده و مجاز به تکلم' : 'وضعیت: حذف شده (فقط شنونده)'}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Chat & Voice Messages */}
      {activeTab === 'chat' && (
        <div className="flex flex-col h-[380px]">
          {/* Scrollable Message List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#0e1621]">
            {(!game.chatMessages || game.chatMessages.length === 0) ? (
              <div className="text-center py-10 text-xs text-slate-500">
                پیامی هنوز ثبت نشده است. اولین پیام را ارسال کنید یا دکمه مناظره بات‌ها را بزنید.
              </div>
            ) : (
              game.chatMessages.map((msg, idx) => {
                const isUser = msg.senderSeat === userSeat;
                const isGod = msg.senderSeat === 0;

                return (
                  <div
                    key={`${msg.id || 'msg'}_${idx}`}
                    className={`flex flex-col ${isGod ? 'items-center' : isUser ? 'items-start' : 'items-end'}`}
                  >
                    {/* God Announcer Card */}
                    {isGod ? (
                      <div className="bg-[#17212b]/90 border border-indigo-500/30 rounded-xl px-4 py-2 text-center max-w-md my-1 shadow-sm">
                        <div className="text-[11px] font-bold text-indigo-400 flex items-center justify-center gap-1 mb-0.5">
                          <span>🎙️ گاد بازی (اعلان رسمی)</span>
                        </div>
                        <p className="text-xs text-slate-200">{msg.text}</p>
                        <span className="text-[9px] text-slate-500 font-mono mt-1 block">{msg.timestamp}</span>
                      </div>
                    ) : (
                      /* Player Message Bubble */
                      <div
                        className={`max-w-[85%] sm:max-w-[70%] rounded-2xl p-3 shadow-md border ${
                          isUser
                            ? 'bg-[#2b5278] border-[#376999] text-white rounded-br-xs'
                            : 'bg-[#182533] border-[#243547] text-slate-200 rounded-bl-xs'
                        }`}
                      >
                        {/* Header: Name and Seat */}
                        <div className="flex items-center justify-between gap-3 text-[11px] mb-1 pb-1 border-b border-white/10">
                          <span className="font-bold flex items-center gap-1">
                            <span>{msg.senderAvatarEmoji || '👤'}</span>
                            <span className={isUser ? 'text-cyan-300' : 'text-amber-300'}>
                              {msg.senderName} [صندلی {msg.senderSeat}]
                            </span>
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">{msg.timestamp}</span>
                        </div>

                        {/* Message Body (Text or Voice Note) */}
                        {msg.isVoiceNote ? (
                          <div className="space-y-1.5 pt-1">
                            <div className="flex items-center gap-2 bg-black/20 p-2 rounded-xl">
                              <button
                                onClick={() => handlePlayVoiceNote(msg.id, msg.voiceDurationSec)}
                                className={`w-8 h-8 rounded-full flex items-center justify-center transition-transform cursor-pointer ${
                                  playingVoiceId === msg.id
                                    ? 'bg-rose-500 text-white animate-pulse'
                                    : 'bg-[#0088cc] text-white hover:scale-105'
                                }`}
                              >
                                {playingVoiceId === msg.id ? (
                                  <Square className="w-3.5 h-3.5 fill-current" />
                                ) : (
                                  <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                                )}
                              </button>

                              {/* Voice Wave Visualizer */}
                              <div className="flex-1 flex items-center gap-0.5 h-6">
                                {[30, 70, 45, 90, 60, 35, 80, 50, 95, 40, 75, 30].map((h, i) => (
                                  <div
                                    key={i}
                                    className={`w-1 rounded-full transition-all ${
                                      playingVoiceId === msg.id ? 'bg-cyan-400 animate-pulse' : 'bg-white/40'
                                    }`}
                                    style={{ height: `${h}%` }}
                                  ></div>
                                ))}
                              </div>

                              <span className="text-[10px] font-mono text-slate-300">
                                0:0{msg.voiceDurationSec || 4}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-300 italic">{msg.text}</p>
                          </div>
                        ) : (
                          <p className="text-xs leading-relaxed break-words">{msg.text}</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Bottom Chat & Voice Input Box */}
          <div className="bg-[#17212b] p-3 border-t border-[#242f3d]">
            {isRecording ? (
              /* Voice Recording Active UI */
              <div className="flex items-center justify-between gap-3 bg-rose-950/40 border border-rose-500/40 p-2.5 rounded-xl animate-pulse">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping"></span>
                  <span className="text-xs font-bold text-rose-300">در حال ضبط ویس زنده...</span>
                  <span className="font-mono text-xs text-white bg-rose-900/50 px-2 py-0.5 rounded-md">
                    0:{recordingSeconds < 10 ? `0${recordingSeconds}` : recordingSeconds}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCancelRecording}
                    className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-xs cursor-pointer"
                  >
                    لغو
                  </button>
                  <button
                    onClick={handleStopRecordingAndSend}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer shadow-md"
                  >
                    <Send className="w-3 h-3" />
                    <span>ارسال ویس</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Regular Text + Mic Input */
              <form onSubmit={handleTextSubmit} className="flex items-center gap-2">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={
                    isUserAlive
                      ? 'صحبت، دفاعیه یا اتهام خود را بنویسید...'
                      : 'شما حذف شده‌اید و نمی‌توانید صحبت کنید'
                  }
                  disabled={!isUserAlive}
                  className="flex-1 bg-[#0e1621] border border-[#242f3d] rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#0088cc] transition-colors disabled:opacity-50"
                />

                {inputText.trim() ? (
                  <button
                    type="submit"
                    className="p-2.5 bg-[#0088cc] hover:bg-[#0099e6] text-white rounded-xl shadow-md transition-all cursor-pointer"
                    title="ارسال پیام"
                  >
                    <Send className="w-4 h-4 rotate-180" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleStartRecording}
                    disabled={!isUserAlive}
                    className="p-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-1"
                    title="نگه‌داشتن برای ضبط ویس (Voice Note)"
                  >
                    <Mic className="w-4 h-4" />
                  </button>
                )}
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
