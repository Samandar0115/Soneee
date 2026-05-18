import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Phone,
  PhoneOff,
  PhoneIncoming,
  PhoneOutgoing,
  Mic,
  MicOff,
  X,
  Delete,
  Loader2,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { sipPhone, type SipState, type SipCallInfo } from '../utils/sip';

const STATE_COLORS: Record<SipState, string> = {
  disabled: 'bg-slate-500',
  disconnected: 'bg-slate-500',
  connecting: 'bg-amber-500',
  registered: 'bg-emerald-500',
  registration_failed: 'bg-rose-500',
  incoming: 'bg-emerald-500 animate-pulse',
  in_call: 'bg-emerald-600',
  ringing_out: 'bg-amber-500 animate-pulse',
  failed: 'bg-rose-500',
  ended: 'bg-slate-500',
};

const STATE_LABELS: Record<SipState, string> = {
  disabled: 'O\'chirilgan',
  disconnected: 'Uzilgan',
  connecting: 'Ulanmoqda...',
  registered: 'Tayyor',
  registration_failed: 'Ro\'yxatdan o\'tib bo\'lmadi',
  incoming: 'Kiruvchi qo\'ng\'iroq',
  in_call: 'Qo\'ng\'iroqda',
  ringing_out: 'Tashqi qo\'ng\'iroq...',
  failed: 'Xato',
  ended: 'Tugadi',
};

export default function Softphone() {
  const { settings } = useApp();
  const sip = settings.sip;
  const [state, setState] = useState<SipState>('disconnected');
  const [call, setCall] = useState<SipCallInfo | null>(null);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [dialer, setDialer] = useState('');
  const [muted, setMuted] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const elapsedTimer = useRef<number | null>(null);
  const dialFromEventRef = useRef<((e: Event) => void) | null>(null);

  // SIP konfiguratsiyasi o'zgarsa qayta ulash
  useEffect(() => {
    if (sip && sip.enabled && sip.wsUri && sip.sipUri) {
      sipPhone.start(sip);
    } else {
      sipPhone.stop();
    }
    return () => {
      // Component unmount qilinmaydi (Layout ichida)
    };
  }, [sip?.enabled, sip?.wsUri, sip?.sipUri, sip?.password, sip?.displayName, sip?.registrar]);

  // Holatni kuzatish
  useEffect(() => {
    const off = sipPhone.on((s, info, err) => {
      setState(s);
      setCall(info ?? null);
      setError(err ?? '');
      setMuted(sipPhone.isMuted());
      // Kiruvchi/aktiv qo'ng'iroq paytida darhol ochish
      if (s === 'incoming' || s === 'in_call' || s === 'ringing_out') {
        setOpen(true);
      }
    });
    return off;
  }, []);

  // Aktiv qo'ng'iroq taymeri
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

  // Global "iposted:dial" hodisa — istalgan joydan qo'ng'iroq qilish uchun
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
    dialFromEventRef.current = handler;
    window.addEventListener('ipost:dial', handler);
    return () => window.removeEventListener('ipost:dial', handler);
  }, [state]);

  if (!sip || !sip.enabled) return null;

  const isRegistered = state === 'registered' || state === 'in_call' || state === 'incoming' || state === 'ringing_out';

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
      {/* Floating bubble */}
      <motion.button
        layout
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen((v) => !v)}
        className={`fixed bottom-4 right-4 z-40 ${
          state === 'incoming' || state === 'ringing_out' || state === 'in_call'
            ? 'h-16 w-16'
            : 'h-12 w-12'
        } rounded-full shadow-2xl text-white flex items-center justify-center ${
          STATE_COLORS[state]
        }`}
        title={STATE_LABELS[state]}
      >
        {state === 'connecting' || state === 'ringing_out' ? (
          <Loader2 className="h-6 w-6 animate-spin" />
        ) : state === 'incoming' ? (
          <PhoneIncoming className="h-7 w-7" />
        ) : state === 'in_call' ? (
          <Phone className="h-7 w-7" />
        ) : (
          <Phone className="h-5 w-5" />
        )}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="fixed bottom-20 right-4 z-40 w-80 max-w-[calc(100vw-2rem)] card overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-brand-600 to-brand-500 text-white">
              <div className="flex items-center gap-2 text-sm font-bold">
                {isRegistered ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
                Softphone
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/20"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4">
              {/* Status */}
              <div className="flex items-center gap-2 text-xs mb-3">
                <span className={`h-2 w-2 rounded-full ${STATE_COLORS[state]}`} />
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  {STATE_LABELS[state]}
                </span>
                {error && (
                  <span className="text-rose-600 dark:text-rose-400 truncate" title={error}>
                    · {error}
                  </span>
                )}
              </div>

              {(state === 'incoming' || state === 'in_call' || state === 'ringing_out') && call ? (
                <div>
                  <div className="text-center py-4 border-b border-slate-200 dark:border-slate-700 mb-3">
                    <div className="text-xs text-slate-500 dark:text-slate-300">
                      {call.direction === 'in' ? (
                        <span className="flex items-center justify-center gap-1">
                          <PhoneIncoming className="h-3.5 w-3.5" /> Kiruvchi qo'ng'iroq
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-1">
                          <PhoneOutgoing className="h-3.5 w-3.5" /> Tashqi qo'ng'iroq
                        </span>
                      )}
                    </div>
                    <div className="font-bold text-xl mt-1 text-slate-900 dark:text-slate-100">
                      {call.displayName || call.number}
                    </div>
                    {call.displayName && (
                      <div className="text-sm text-slate-500">{call.number}</div>
                    )}
                    {state === 'in_call' && (
                      <div className="mt-2 text-emerald-600 dark:text-emerald-400 font-mono font-bold">
                        {formatDuration(elapsed)}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {state === 'incoming' && (
                      <>
                        <button
                          onClick={() => sipPhone.hangup()}
                          className="col-span-1 bg-rose-600 hover:bg-rose-500 text-white py-3 rounded-xl font-semibold flex items-center justify-center"
                        >
                          <PhoneOff className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => sipPhone.answer()}
                          className="col-span-2 bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
                        >
                          <Phone className="h-5 w-5" /> Javob berish
                        </button>
                      </>
                    )}
                    {(state === 'in_call' || state === 'ringing_out') && (
                      <>
                        <button
                          onClick={() => {
                            const m = sipPhone.toggleMute();
                            setMuted(m);
                          }}
                          className={`py-3 rounded-xl font-semibold flex items-center justify-center ${
                            muted
                              ? 'bg-amber-500 text-white'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200'
                          }`}
                          title={muted ? 'Mikrofonni yoqish' : 'O\'chirish'}
                        >
                          {muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                        </button>
                        <button
                          onClick={() => sipPhone.hangup()}
                          className="col-span-2 bg-rose-600 hover:bg-rose-500 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
                        >
                          <PhoneOff className="h-5 w-5" /> Tugatish
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex gap-1 mb-2">
                    <input
                      type="tel"
                      className="input flex-1 text-center font-mono text-lg"
                      placeholder="Raqam kiriting..."
                      value={dialer}
                      onChange={(e) => setDialer(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && dial()}
                      disabled={!isRegistered}
                    />
                    <button
                      onClick={() => setDialer(dialer.slice(0, -1))}
                      className="btn-ghost px-3"
                      title="O'chirish"
                      disabled={!dialer}
                    >
                      <Delete className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-1 mb-3">
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map((d) => (
                      <button
                        key={d}
                        onClick={() => {
                          setDialer((v) => v + d);
                          if (state === 'in_call') sipPhone.sendDtmf(d);
                        }}
                        className="py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 font-bold text-slate-800 dark:text-slate-100"
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={dial}
                    disabled={!isRegistered || !dialer.trim()}
                    className="btn-primary w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50"
                  >
                    <Phone className="h-4 w-4" /> Qo'ng'iroq qilish
                  </button>
                  {!isRegistered && (
                    <div className="text-xs text-amber-600 dark:text-amber-400 mt-2 text-center">
                      SIP ulanishi yo'q — Sozlamalardan tekshiring
                    </div>
                  )}
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
