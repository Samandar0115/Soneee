import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Phone,
  PhoneOff,
  PhoneIncoming,
  PhoneOutgoing,
  Mic,
  MicOff,
  Minus,
  Delete,
  Loader2,
  Pause,
  Play,
  AlertTriangle,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { sipPhone, type SipState, type SipCallInfo } from '../utils/sip';
import type { SipConfig } from '../types';

const STATE_LABELS: Record<SipState, string> = {
  disabled: "O'chirilgan",
  disconnected: 'Uzilgan',
  connecting: 'Ulanmoqda...',
  registered: 'Tayyor',
  registration_failed: "Ro'yxatdan o'tib bo'lmadi",
  incoming: "Kiruvchi qo'ng'iroq",
  in_call: "Qo'ng'iroqda",
  ringing_out: "Tashqi qo'ng'iroq...",
  failed: 'Xato',
  ended: 'Tugadi',
};

export default function Softphone() {
  const { settings, currentUser } = useApp();
  const sip = settings.sip;
  const [state, setState] = useState<SipState>('disconnected');
  const [call, setCall] = useState<SipCallInfo | null>(null);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [dialer, setDialer] = useState('');
  const [muted, setMuted] = useState(false);
  const [held, setHeld] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const elapsedTimer = useRef<number | null>(null);

  // Joriy foydalanuvchi va sozlamalarga qarab amaldagi SIP konfiguratsiyani yig'amiz.
  // Server host — sozlamalardan, extension/parol — har bir operatorning shaxsiy hisobidan.
  const effectiveSip: SipConfig | null = useMemo(() => {
    if (!sip || !sip.enabled || !sip.wsUri) return null;
    const host = (sip.serverHost || '').trim();
    if (!host) return null;
    // MicroSIP'dagi "Домен" — agar bo'sh bo'lsa, server bilan bir xil
    const domain = (sip.domain || '').trim() || host;
    if (currentUser?.sipExtension && currentUser?.sipPassword) {
      return {
        enabled: true,
        serverHost: host,
        domain,
        proxy: sip.proxy,
        wsUri: sip.wsUri,
        iceServers: sip.iceServers,
        registerExpiresSec: sip.registerExpiresSec,
        // sip:LOGIN@DOMAIN — MicroSIP'dagi Логин@Домен
        sipUri: `sip:${currentUser.sipExtension}@${domain}`,
        password: currentUser.sipPassword,
        // Отображаемое имя — operator alohida sozlagani (raqam yoki ism), bo'lmasa F.I.O.
        displayName:
          currentUser.sipDisplayName ||
          currentUser.fullName ||
          currentUser.username,
        // SIP-сервер — qaerga REGISTER yuborish (Домен'dan farq qilishi mumkin)
        registrar: `sip:${host}`,
      };
    }
    // Legacy global hisob (sozlamalarda to'g'ridan-to'g'ri sipUri/password)
    if (sip.sipUri && sip.password) {
      return {
        enabled: true,
        serverHost: host,
        domain,
        proxy: sip.proxy,
        wsUri: sip.wsUri,
        iceServers: sip.iceServers,
        registerExpiresSec: sip.registerExpiresSec,
        sipUri: sip.sipUri,
        password: sip.password,
        displayName: sip.displayName,
        registrar: sip.registrar || `sip:${host}`,
      };
    }
    return null;
  }, [sip, currentUser]);

  // Konfiguratsiya o'zgarsa qayta ulash. Aktiv qo'ng'iroq paytida tegmaymiz.
  useEffect(() => {
    const cur = sipPhone.getState();
    const inActiveCall = cur === 'in_call' || cur === 'incoming' || cur === 'ringing_out';
    if (inActiveCall) return;
    if (effectiveSip) {
      sipPhone.start(effectiveSip);
    } else {
      sipPhone.stop();
    }
  }, [
    effectiveSip?.enabled,
    effectiveSip?.wsUri,
    effectiveSip?.sipUri,
    effectiveSip?.password,
    effectiveSip?.displayName,
    effectiveSip?.registrar,
  ]);

  useEffect(() => {
    const off = sipPhone.on((s, info, err) => {
      setState(s);
      setCall(info ?? null);
      setError(err ?? '');
      setMuted(sipPhone.isMuted());
      setHeld(sipPhone.isOnHold());
      if (s === 'incoming' || s === 'in_call' || s === 'ringing_out') {
        setOpen(true);
      }
    });
    return off;
  }, []);

  useEffect(() => {
    if (state === 'in_call' && call?.startedAt) {
      const tick = () => setElapsed(Date.now() - (call.startedAt ?? Date.now()));
      tick();
      elapsedTimer.current = window.setInterval(tick, 500);
    } else {
      if (elapsedTimer.current) clearInterval(elapsedTimer.current);
      elapsedTimer.current = null;
      setElapsed(0);
    }
    return () => {
      if (elapsedTimer.current) clearInterval(elapsedTimer.current);
    };
  }, [state, call?.startedAt]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { number?: string };
      if (detail?.number) {
        setDialer(detail.number);
        setOpen(true);
        if (state === 'registered') {
          sipPhone.dial(detail.number);
        }
      }
    };
    window.addEventListener('ipost:dial', handler);
    return () => window.removeEventListener('ipost:dial', handler);
  }, [state]);

  // Telefon tugmasi har doim ko'rinishi kerak — login bo'lmaganda ham, sozlanmagan bo'lsa ham
  if (!currentUser) return null;

  const isInCall = state === 'in_call' || state === 'incoming' || state === 'ringing_out';
  const isRegistered = state === 'registered' || isInCall;
  const isConnecting = state === 'connecting';
  // "Qo'ng'iroq bilan muammo bor" — server sozlanmagan, ro'yxatdan o'tilmagan yoki xato holatlari
  const hasProblem =
    !effectiveSip ||
    state === 'disabled' ||
    state === 'disconnected' ||
    state === 'registration_failed' ||
    state === 'failed';

  // RANG: ichida muammo bo'lsa ham bubble doim KO'K bo'lib turadi (user shartiga ko'ra),
  // qo'ng'iroq aktiv bo'lganda esa YASHIL bo'lib o'zgaradi
  const bubbleColor = isInCall
    ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 ring-4 ring-emerald-300/40'
    : 'bg-gradient-to-br from-sky-500 to-blue-600';

  // Kiruvchi qo'ng'iroq paytida pulsatsiya halqasi
  const pulseRing =
    state === 'incoming' || state === 'ringing_out'
      ? 'after:absolute after:inset-0 after:rounded-full after:ring-4 after:ring-emerald-400/60 after:animate-ping'
      : '';

  function formatDuration(ms: number) {
    const s = Math.floor(ms / 1000);
    const mm = Math.floor(s / 60).toString().padStart(2, '0');
    const ss = (s % 60).toString().padStart(2, '0');
    return `${mm}:${ss}`;
  }

  function dial() {
    if (!dialer.trim()) return;
    sipPhone.dial(dialer.trim());
  }

  return (
    <>
      <style>{`
        @keyframes phone-jingle {
          0%, 100% { transform: rotate(0deg); }
          10%, 30%, 50%, 70%, 90% { transform: rotate(-14deg); }
          20%, 40%, 60%, 80% { transform: rotate(14deg); }
        }
        .phone-jingle-hover:hover .phone-icon-inner {
          animation: phone-jingle 0.7s ease-in-out infinite;
          transform-origin: center;
        }
        .phone-jingle-hover:hover {
          box-shadow:
            0 0 0 8px rgba(56, 189, 248, 0.18),
            0 0 0 16px rgba(56, 189, 248, 0.10),
            0 12px 30px rgba(2, 132, 199, 0.45);
        }
      `}</style>

      {/* Floating telefon bubble — har doim o'ng pastda */}
      <AnimatePresence>
        {!open && (
          <motion.button
            layoutId="softphone-bubble"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.6 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => setOpen(true)}
            className={`fixed right-4 bottom-20 md:bottom-4 z-50 h-14 w-14 rounded-full shadow-2xl text-white flex items-center justify-center relative phone-jingle-hover transition-shadow ${bubbleColor} ${pulseRing}`}
            title={hasProblem ? "Qo'ng'iroq bilan muammo bor" : STATE_LABELS[state]}
          >
            <span className="phone-icon-inner inline-flex">
              {isConnecting ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : state === 'incoming' ? (
                <PhoneIncoming className="h-7 w-7" />
              ) : (
                <Phone className="h-6 w-6" />
              )}
            </span>
            {/* Muammo nuqtasi — qizil belgi */}
            {hasProblem && (
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-rose-500 border-2 border-white flex items-center justify-center">
                <span className="h-1.5 w-1.5 rounded-full bg-white" />
              </span>
            )}
          </motion.button>
        )}
      </AnimatePresence>

      {/* Kengaytirilgan panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            layoutId="softphone-bubble"
            initial={{ borderRadius: 9999 }}
            animate={{ borderRadius: 24 }}
            exit={{ borderRadius: 9999 }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
            className={`fixed right-4 bottom-20 md:bottom-4 z-50 w-80 max-w-[calc(100vw-2rem)] shadow-2xl overflow-hidden text-white ${bubbleColor}`}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/15 backdrop-blur-sm">
              <div className="flex items-center gap-2 text-sm font-bold">
                {isRegistered ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
                Softphone
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/20"
                title="Minimallashtirish"
              >
                <Minus className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4">
              {/* Status */}
              <div className="flex items-center gap-2 text-xs mb-3 text-white/90">
                <span className="h-2 w-2 rounded-full bg-white/90" />
                <span className="font-semibold">{STATE_LABELS[state]}</span>
              </div>

              {/* Muammo bo'lsa ko'rinadigan banner */}
              {hasProblem && !isInCall && (
                <div className="mb-3 p-3 rounded-xl bg-rose-500/25 border border-rose-300/40 text-white text-xs flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <div className="font-bold">Hozir sizda qo'ng'iroq bilan muammo bor</div>
                    <div className="text-white/85">
                      {!effectiveSip
                        ? !sip?.enabled
                          ? 'SIP server yoqilmagan. Administrator Sozlamalardan ulashi kerak.'
                          : !sip?.serverHost
                          ? 'Server host kiritilmagan.'
                          : !currentUser?.sipExtension || !currentUser?.sipPassword
                          ? "Sizning SIP extension/parolingiz kiritilmagan. Administrator Xodimlar bo'limidan qo'shsin."
                          : 'Sozlamalar to\'liq emas.'
                        : error || 'Serverga ulanib bo\'lmadi. Tarmoqni va serverni tekshiring.'}
                    </div>
                  </div>
                </div>
              )}

              {isInCall && call ? (
                <div>
                  <div className="text-center py-4 border-b border-white/15 mb-3">
                    <div className="text-xs text-white/80">
                      {call.direction === 'in' ? (
                        <span className="flex items-center justify-center gap-1">
                          <PhoneIncoming className="h-3.5 w-3.5" /> Kiruvchi
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-1">
                          <PhoneOutgoing className="h-3.5 w-3.5" /> Chiquvchi
                        </span>
                      )}
                    </div>
                    <div className="font-bold text-2xl mt-1">
                      {call.displayName || call.number}
                    </div>
                    {call.displayName && (
                      <div className="text-sm text-white/70">{call.number}</div>
                    )}
                    {state === 'in_call' && (
                      <div className="mt-2 text-white font-mono text-lg font-bold">
                        {formatDuration(elapsed)}
                      </div>
                    )}
                  </div>

                  {state === 'incoming' ? (
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => sipPhone.hangup()}
                        className="col-span-1 bg-rose-600 hover:bg-rose-500 text-white py-4 rounded-2xl font-semibold flex items-center justify-center shadow-lg"
                        title="Rad etish"
                      >
                        <PhoneOff className="h-6 w-6" />
                      </button>
                      <button
                        onClick={() => sipPhone.answer()}
                        className="col-span-2 bg-emerald-500 hover:bg-emerald-400 text-white py-4 rounded-2xl font-semibold flex items-center justify-center gap-2 shadow-lg"
                      >
                        <Phone className="h-6 w-6" /> Javob berish
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-3 gap-1.5 mb-3">
                        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map((d) => (
                          <button
                            key={d}
                            onClick={() => sipPhone.sendDtmf(d)}
                            className="py-2 rounded-xl bg-white/15 hover:bg-white/25 font-bold text-white text-sm"
                          >
                            {d}
                          </button>
                        ))}
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          onClick={() => {
                            const m = sipPhone.toggleMute();
                            setMuted(m);
                          }}
                          className={`py-3 rounded-2xl font-semibold flex flex-col items-center justify-center gap-0.5 shadow ${
                            muted ? 'bg-amber-500 text-white' : 'bg-white/15 hover:bg-white/25 text-white'
                          }`}
                          title={muted ? 'Mikrofonni yoqish' : "Mikrofonni o'chirish"}
                        >
                          {muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                          <span className="text-[10px]">{muted ? 'Yoqish' : "O'chirish"}</span>
                        </button>
                        <button
                          onClick={() => {
                            const h = sipPhone.toggleHold();
                            setHeld(h);
                          }}
                          className={`py-3 rounded-2xl font-semibold flex flex-col items-center justify-center gap-0.5 shadow ${
                            held ? 'bg-amber-500 text-white' : 'bg-white/15 hover:bg-white/25 text-white'
                          }`}
                          title={held ? 'Davom ettirish' : 'Kutib turish'}
                        >
                          {held ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
                          <span className="text-[10px]">{held ? 'Davom' : 'Hold'}</span>
                        </button>
                        <button
                          onClick={() => sipPhone.hangup()}
                          className="py-3 rounded-2xl font-semibold flex flex-col items-center justify-center gap-0.5 bg-rose-600 hover:bg-rose-500 text-white shadow-lg"
                          title="Tugatish"
                        >
                          <PhoneOff className="h-5 w-5" />
                          <span className="text-[10px]">Tugatish</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <>
                  <div className="flex gap-1 mb-2">
                    <input
                      type="tel"
                      className="flex-1 text-center font-mono text-lg bg-white/15 placeholder-white/60 text-white rounded-xl px-3 py-2 outline-none focus:bg-white/25"
                      placeholder="Raqam kiriting..."
                      value={dialer}
                      onChange={(e) => setDialer(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && dial()}
                      disabled={!isRegistered}
                    />
                    <button
                      onClick={() => setDialer(dialer.slice(0, -1))}
                      className="px-3 rounded-xl bg-white/15 hover:bg-white/25 text-white"
                      title="O'chirish"
                      disabled={!dialer}
                    >
                      <Delete className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 mb-3">
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map((d) => (
                      <button
                        key={d}
                        onClick={() => setDialer((v) => v + d)}
                        className="py-2.5 rounded-xl bg-white/15 hover:bg-white/25 font-bold text-white"
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={dial}
                    disabled={!isRegistered || !dialer.trim()}
                    className="w-full py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg"
                  >
                    <Phone className="h-5 w-5" /> Qo'ng'iroq qilish
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// Boshqa komponentlardan qo'ng'iroq qilish uchun helper
export function dialNumber(number: string) {
  window.dispatchEvent(new CustomEvent('ipost:dial', { detail: { number } }));
}
