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
  ExternalLink,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { sipPhone, type SipState, type SipCallInfo } from '../utils/sip';
import type { SipConfig } from '../types';
import { defaultCallScheme, detectOS } from '../utils/platform';

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

// Tashqi softphone (MicroSIP/Linphone/Telephone) orqali qo'ng'iroq qilish.
// Sxema tanlanmagan bo'lsa, OS bo'yicha avtomatik: Win→callto, Mac/Linux→sip, mobil→tel
function launchExternalCall(number: string, schemeOverride?: 'callto' | 'tel' | 'sip', host?: string) {
  const cleaned = number.replace(/[^\d+*#]/g, '');
  if (!cleaned) return;
  const scheme = schemeOverride ?? defaultCallScheme();
  let url: string;
  if (scheme === 'sip') {
    // Mac/Linux Linphone va boshqa softphone'lar uchun standart sip: URI
    url = host ? `sip:${cleaned}@${host}` : `sip:${cleaned}`;
  } else if (scheme === 'tel') {
    url = `tel:${cleaned}`;
  } else {
    url = `callto:${cleaned}`;
  }
  // Yashirin iframe orqali ochish — yangi tab ochilmasligi uchun.
  // Mac Safari iframe'da custom URL ochmaydi, shuning uchun location.href fallback.
  const os = detectOS();
  if (os === 'mac' || os === 'ios') {
    window.location.href = url;
    return;
  }
  try {
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = url;
    document.body.appendChild(iframe);
    setTimeout(() => {
      try {
        document.body.removeChild(iframe);
      } catch {}
    }, 1500);
  } catch {
    window.location.href = url;
  }
}

export default function Softphone() {
  const { settings, currentUser } = useApp();
  const sip = settings.sip;
  const mode = sip?.mode ?? 'external';
  const [state, setState] = useState<SipState>('disconnected');
  const [call, setCall] = useState<SipCallInfo | null>(null);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [dialer, setDialer] = useState('');
  const [muted, setMuted] = useState(false);
  const [held, setHeld] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [externalToast, setExternalToast] = useState<string | null>(null);
  const elapsedTimer = useRef<number | null>(null);

  // WebRTC rejimida JsSIP uchun konfiguratsiyani yig'amiz. External rejimda kerak emas.
  const effectiveSip: SipConfig | null = useMemo(() => {
    if (mode !== 'webrtc') return null;
    if (!sip || !sip.enabled || !sip.wsUri) return null;
    const host = (sip.serverHost || '').trim();
    if (!host) return null;
    const domain = (sip.domain || '').trim() || host;
    if (currentUser?.sipExtension && currentUser?.sipPassword) {
      return {
        enabled: true,
        mode: 'webrtc',
        serverHost: host,
        domain,
        proxy: sip.proxy,
        wsUri: sip.wsUri,
        iceServers: sip.iceServers,
        registerExpiresSec: sip.registerExpiresSec,
        sipUri: `sip:${currentUser.sipExtension}@${domain}`,
        password: currentUser.sipPassword,
        displayName:
          currentUser.sipDisplayName || currentUser.fullName || currentUser.username,
        registrar: `sip:${host}`,
      };
    }
    if (sip.sipUri && sip.password) {
      return {
        enabled: true,
        mode: 'webrtc',
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
  }, [sip, currentUser, mode]);

  // WebRTC rejim: JsSIP'ni boshqaramiz. External rejim: SIP'ni o'chiramiz.
  useEffect(() => {
    const cur = sipPhone.getState();
    const inActiveCall = cur === 'in_call' || cur === 'incoming' || cur === 'ringing_out';
    if (inActiveCall) return;
    if (mode === 'webrtc' && effectiveSip) {
      sipPhone.start(effectiveSip);
    } else {
      sipPhone.stop();
    }
  }, [
    mode,
    effectiveSip?.enabled,
    effectiveSip?.wsUri,
    effectiveSip?.sipUri,
    effectiveSip?.password,
    effectiveSip?.displayName,
    effectiveSip?.registrar,
  ]);

  useEffect(() => {
    if (mode !== 'webrtc') return;
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
  }, [mode]);

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

  // Global "ipost:dial" hodisa — istalgan joydan qo'ng'iroq
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { number?: string };
      if (!detail?.number) return;
      setDialer(detail.number);
      if (mode === 'external') {
        // Darhol MicroSIP'ga uzatamiz va kichik xabar ko'rsatamiz
        launchExternalCall(detail.number, sip?.externalScheme, sip?.serverHost);
        setExternalToast(`MicroSIP'ga uzatildi: ${detail.number}`);
        setTimeout(() => setExternalToast(null), 2500);
      } else {
        setOpen(true);
        if (state === 'registered') {
          sipPhone.dial(detail.number);
        }
      }
    };
    window.addEventListener('ipost:dial', handler);
    return () => window.removeEventListener('ipost:dial', handler);
  }, [state, mode, sip?.externalScheme, sip?.serverHost]);

  if (!currentUser) return null;

  // === EXTERNAL (MicroSIP) REJIMI ===
  if (mode === 'external') {
    function externalDial() {
      if (!dialer.trim()) return;
      launchExternalCall(dialer.trim(), sip?.externalScheme, sip?.serverHost);
      setExternalToast(`MicroSIP'ga uzatildi: ${dialer}`);
      setTimeout(() => setExternalToast(null), 2500);
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

        {/* Toast — MicroSIP'ga uzatilganda chiqadi */}
        <AnimatePresence>
          {externalToast && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.9 }}
              className="fixed right-4 bottom-40 md:bottom-24 z-[60] px-4 py-2.5 bg-sky-600 text-white rounded-2xl shadow-2xl text-sm font-semibold flex items-center gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              {externalToast}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {!open && (
            <motion.button
              layoutId="softphone-bubble"
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              whileTap={{ scale: 0.92 }}
              onClick={() => setOpen(true)}
              className="fixed right-4 bottom-20 md:bottom-4 z-50 h-14 w-14 rounded-full shadow-2xl text-white flex items-center justify-center relative phone-jingle-hover transition-shadow bg-gradient-to-br from-sky-500 to-blue-600"
              title="MicroSIP orqali qo'ng'iroq"
            >
              <span className="phone-icon-inner inline-flex">
                <Phone className="h-6 w-6" />
              </span>
            </motion.button>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {open && (
            <motion.div
              layoutId="softphone-bubble"
              initial={{ borderRadius: 9999 }}
              animate={{ borderRadius: 24 }}
              exit={{ borderRadius: 9999 }}
              transition={{ type: 'spring', stiffness: 260, damping: 26 }}
              className="fixed right-4 bottom-20 md:bottom-4 z-50 w-80 max-w-[calc(100vw-2rem)] shadow-2xl overflow-hidden text-white bg-gradient-to-br from-sky-500 to-blue-600"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/15">
                <div className="flex items-center gap-2 text-sm font-bold">
                  <ExternalLink className="h-4 w-4" />
                  MicroSIP qo'ng'iroq
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
                <div className="mb-3 p-3 rounded-xl bg-white/10 border border-white/20 text-[11px] text-white/95">
                  <div className="font-bold mb-1">Qanday ishlaydi?</div>
                  <div className="text-white/85">
                    Raqamga bosing — kompyuteringizda <b>MicroSIP</b> avtomatik ochilib qo'ng'iroq qiladi.
                    Sayt va MicroSIP birga ishlaydi.
                  </div>
                </div>

                <div className="flex gap-1 mb-2">
                  <input
                    type="tel"
                    className="flex-1 text-center font-mono text-lg bg-white/15 placeholder-white/60 text-white rounded-xl px-3 py-2 outline-none focus:bg-white/25"
                    placeholder="Raqam kiriting..."
                    value={dialer}
                    onChange={(e) => setDialer(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && externalDial()}
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
                  onClick={externalDial}
                  disabled={!dialer.trim()}
                  className="w-full py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg"
                >
                  <Phone className="h-5 w-5" /> MicroSIP orqali qo'ng'iroq
                </button>
                <p className="text-[10px] text-white/70 mt-2 text-center">
                  Sxema: <code className="font-mono bg-white/10 px-1 py-0.5 rounded">{(sip?.externalScheme ?? defaultCallScheme())}:</code>
                  {' · '}{detectOS() === 'mac' ? "Linphone yoki Telephone.app default handler bo'lishi kerak" : "MicroSIP default handler bo'lishi kerak"}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </>
    );
  }

  // === WEBRTC (ICHKI) REJIMI ===
  const isInCall = state === 'in_call' || state === 'incoming' || state === 'ringing_out';
  const isRegistered = state === 'registered' || isInCall;
  const isConnecting = state === 'connecting';
  const hasProblem =
    !effectiveSip ||
    state === 'disabled' ||
    state === 'disconnected' ||
    state === 'registration_failed' ||
    state === 'failed';

  const bubbleColor = isInCall
    ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 ring-4 ring-emerald-300/40'
    : 'bg-gradient-to-br from-sky-500 to-blue-600';

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
            {hasProblem && (
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-rose-500 border-2 border-white flex items-center justify-center">
                <span className="h-1.5 w-1.5 rounded-full bg-white" />
              </span>
            )}
          </motion.button>
        )}
      </AnimatePresence>

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
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/15 backdrop-blur-sm">
              <div className="flex items-center gap-2 text-sm font-bold">
                {isRegistered ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
                Softphone (WebRTC)
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
              <div className="flex items-center gap-2 text-xs mb-3 text-white/90">
                <span className="h-2 w-2 rounded-full bg-white/90" />
                <span className="font-semibold">{STATE_LABELS[state]}</span>
              </div>

              {hasProblem && !isInCall && (
                <div className="mb-3 p-3 rounded-xl bg-rose-500/25 border border-rose-300/40 text-white text-xs flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <div className="font-bold">Hozir sizda qo'ng'iroq bilan muammo bor</div>
                    <div className="text-white/85">
                      {!effectiveSip
                        ? !sip?.enabled
                          ? 'SIP server yoqilmagan.'
                          : !sip?.serverHost
                          ? 'Server host kiritilmagan.'
                          : !currentUser?.sipExtension || !currentUser?.sipPassword
                          ? "Sizning SIP extension/parolingiz kiritilmagan."
                          : "Sozlamalar to'liq emas."
                        : error || "Serverga ulanib bo'lmadi."}
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
                    <div className="font-bold text-2xl mt-1">{call.displayName || call.number}</div>
                    {call.displayName && <div className="text-sm text-white/70">{call.number}</div>}
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
                        >
                          {held ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
                          <span className="text-[10px]">{held ? 'Davom' : 'Hold'}</span>
                        </button>
                        <button
                          onClick={() => sipPhone.hangup()}
                          className="py-3 rounded-2xl font-semibold flex flex-col items-center justify-center gap-0.5 bg-rose-600 hover:bg-rose-500 text-white shadow-lg"
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

// Boshqa komponentlardan qo'ng'iroq qilish uchun helper.
// Softphone komponenti hodisani tutib oladi va mode ('external' yoki 'webrtc')'ga qarab harakat qiladi.
export function dialNumber(number: string) {
  window.dispatchEvent(new CustomEvent('ipost:dial', { detail: { number } }));
}
