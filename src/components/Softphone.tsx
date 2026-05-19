import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Phone,
  PhoneOff,
  Minus,
  Delete,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Pause,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { detectOS } from '../utils/platform';
import type { CallLog, CallOutcome } from '../types';

function launchExternalCall(number: string) {
  const cleaned = number.replace(/[^\d+*#]/g, '');
  if (!cleaned) return;
  const os = detectOS();
  const url = os === 'mac' || os === 'ios' ? `tel:${cleaned}` : `callto:${cleaned}`;
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
      try { document.body.removeChild(iframe); } catch {}
    }, 1500);
  } catch {
    window.location.href = url;
  }
}

function formatDuration(sec: number) {
  const s = Math.max(0, Math.floor(sec));
  const mm = Math.floor(s / 60).toString().padStart(2, '0');
  const ss = (s % 60).toString().padStart(2, '0');
  return `${mm}:${ss}`;
}

export default function Softphone() {
  const { currentUser, startCallLog, updateCallLog, tickets } = useApp();
  const [open, setOpen] = useState(false);
  const [dialer, setDialer] = useState('');
  const [activeCall, setActiveCall] = useState<CallLog | null>(null);
  const [now, setNow] = useState(Date.now());
  const tickRef = useRef<number | null>(null);

  // Aktiv qo'ng'iroq paytida har sekund yangilash
  useEffect(() => {
    if (!activeCall) {
      if (tickRef.current) clearInterval(tickRef.current);
      tickRef.current = null;
      return;
    }
    tickRef.current = window.setInterval(() => setNow(Date.now()), 1000);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [activeCall?.id]);

  // ipost:dial hodisasi — istalgan komponentdan qo'ng'iroq
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { number?: string; ticketId?: string; customerName?: string };
      if (!detail?.number || !currentUser) return;
      initiateCall(detail.number, detail.ticketId, detail.customerName);
    };
    window.addEventListener('ipost:dial', handler);
    return () => window.removeEventListener('ipost:dial', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  if (!currentUser) return null;

  function initiateCall(number: string, ticketId?: string, customerName?: string) {
    const cleaned = number.replace(/[^\d+*#]/g, '');
    if (!cleaned) return;
    // Tracking & customer ma'lumotini ticket'dan topishga harakat
    let tNum: string | undefined;
    let cName = customerName;
    if (ticketId) {
      const t = tickets.find((x) => x.id === ticketId);
      if (t) {
        tNum = t.trackingNumber;
        if (!cName) cName = t.customerName;
      }
    }
    const log = startCallLog({
      operatorId: currentUser!.id,
      operatorName: currentUser!.fullName ?? currentUser!.username,
      number: cleaned,
      customerName: cName,
      ticketId,
      trackingNumber: tNum,
      direction: 'outbound',
    });
    setActiveCall(log);
    setOpen(true);
    setDialer(cleaned);
    launchExternalCall(cleaned);
  }

  function markOutcome(outcome: CallOutcome) {
    if (!activeCall) return;
    const endedAt = Date.now();
    const durationSec = Math.floor((endedAt - activeCall.startedAt) / 1000);
    const talkSec = activeCall.connectedAt
      ? Math.floor((endedAt - activeCall.connectedAt) / 1000)
      : 0;
    updateCallLog(activeCall.id, {
      outcome,
      endedAt,
      durationSec,
      talkSec,
    });
    setActiveCall(null);
    setDialer('');
  }

  function markConnected() {
    if (!activeCall || activeCall.connectedAt) return;
    const t = Date.now();
    updateCallLog(activeCall.id, { connectedAt: t });
    setActiveCall({ ...activeCall, connectedAt: t });
  }

  function dial() {
    const num = dialer.trim();
    if (!num) return;
    initiateCall(num);
  }

  const elapsedSec = activeCall ? Math.floor((now - activeCall.startedAt) / 1000) : 0;
  const talkSec = activeCall?.connectedAt ? Math.floor((now - activeCall.connectedAt) / 1000) : 0;
  const isConnected = !!activeCall?.connectedAt;

  // Bubble rangi
  const bubbleColor = activeCall
    ? isConnected
      ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 ring-4 ring-emerald-300/40'
      : 'bg-gradient-to-br from-amber-500 to-orange-600 ring-4 ring-amber-300/40'
    : 'bg-gradient-to-br from-sky-500 to-blue-600';

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
        @keyframes pulse-ring-call {
          0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); }
          70% { box-shadow: 0 0 0 14px rgba(16, 185, 129, 0); }
          100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }
        .pulse-active { animation: pulse-ring-call 1.8s infinite; }
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
            className={`fixed right-4 bottom-20 md:bottom-4 z-50 h-14 w-14 rounded-full shadow-2xl text-white flex items-center justify-center relative phone-jingle-hover transition-shadow ${bubbleColor} ${activeCall ? 'pulse-active' : ''}`}
            title={activeCall ? "Qo'ng'iroqda — bosing" : 'Telefon'}
          >
            <span className="phone-icon-inner inline-flex">
              <Phone className="h-6 w-6" />
            </span>
            {activeCall && (
              <span className="absolute -top-1 -right-1 px-1.5 h-5 min-w-5 rounded-full bg-white text-emerald-700 text-[10px] font-bold flex items-center justify-center shadow">
                {formatDuration(elapsedSec)}
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
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/15">
              <div className="flex items-center gap-2 text-sm font-bold">
                <Phone className="h-4 w-4" />
                {activeCall ? (isConnected ? 'Qo\'ng\'iroqda' : 'Qo\'ng\'iroq qilinmoqda...') : 'Telefon'}
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
              {activeCall ? (
                /* AKTIV QO'NG'IROQ PANELI */
                <div className="space-y-3">
                  <div className="text-center py-3 border-b border-white/15">
                    <div className="text-xs text-white/80 uppercase tracking-wider">
                      {isConnected ? 'Bog\'landi' : "Bog'lanmoqda..."}
                    </div>
                    <div className="text-2xl font-bold mt-1 font-mono">{activeCall.number}</div>
                    {activeCall.customerName && (
                      <div className="text-sm text-white/85 mt-0.5">{activeCall.customerName}</div>
                    )}
                    {activeCall.trackingNumber && (
                      <div className="text-[11px] text-white/70 mt-0.5 font-mono">
                        Trek: {activeCall.trackingNumber}
                      </div>
                    )}
                    <div className="mt-2 text-3xl font-mono font-bold tracking-wider">
                      {formatDuration(isConnected ? talkSec : elapsedSec)}
                    </div>
                    {isConnected && (
                      <div className="text-[10px] text-white/60 mt-0.5">
                        jami: {formatDuration(elapsedSec)}
                      </div>
                    )}
                  </div>

                  {!isConnected ? (
                    <>
                      <div className="text-[11px] text-white/85 text-center mb-2">
                        Qabul qiluvchi javob berdimi?
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={markConnected}
                          className="py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-white font-semibold flex items-center justify-center gap-1.5 shadow-lg"
                        >
                          <CheckCircle2 className="h-5 w-5" /> Bog'landi
                        </button>
                        <button
                          onClick={() => markOutcome('no_answer')}
                          className="py-3 rounded-2xl bg-white/15 hover:bg-white/25 text-white font-semibold flex items-center justify-center gap-1.5"
                        >
                          <XCircle className="h-5 w-5" /> Javob yo'q
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <button
                          onClick={() => markOutcome('busy')}
                          className="py-2.5 rounded-2xl bg-white/15 hover:bg-white/25 text-white text-sm font-semibold flex items-center justify-center gap-1.5"
                        >
                          <Pause className="h-4 w-4" /> Band
                        </button>
                        <button
                          onClick={() => markOutcome('failed')}
                          className="py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-semibold flex items-center justify-center gap-1.5"
                        >
                          <PhoneOff className="h-4 w-4" /> Bekor
                        </button>
                      </div>
                    </>
                  ) : (
                    <button
                      onClick={() => markOutcome('answered')}
                      className="w-full py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold flex items-center justify-center gap-2 shadow-lg"
                    >
                      <PhoneOff className="h-5 w-5" /> Qo'ng'iroqni tugatish
                    </button>
                  )}
                </div>
              ) : (
                /* DIALER */
                <>
                  <div className="flex gap-1 mb-2">
                    <input
                      type="tel"
                      className="flex-1 text-center font-mono text-lg bg-white/15 placeholder-white/60 text-white rounded-xl px-3 py-2 outline-none focus:bg-white/25"
                      placeholder="Raqam kiriting..."
                      value={dialer}
                      onChange={(e) => setDialer(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && dial()}
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
                        className="py-2.5 rounded-xl bg-white/15 hover:bg-white/25 font-bold text-white text-lg"
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={dial}
                    disabled={!dialer.trim()}
                    className="w-full py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg"
                  >
                    <Phone className="h-5 w-5" /> Qo'ng'iroq qilish
                  </button>
                  <p className="text-[10px] text-white/70 mt-2 text-center flex items-center justify-center gap-1">
                    <ExternalLink className="h-3 w-3" /> Tashqi softphone (MicroSIP/Linphone) avtomatik ochiladi
                  </p>
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
export function dialNumber(number: string, opts?: { ticketId?: string; customerName?: string }) {
  window.dispatchEvent(
    new CustomEvent('ipost:dial', { detail: { number, ...opts } })
  );
}
