import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Phone,
  PhoneOff,
  Minus,
  Delete,
  CheckCircle2,
  XCircle,
  Pause,
  Mic,
  MicOff,
  PhoneIncoming,
  Wifi,
  WifiOff,
  History,
  Hash,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { detectOS } from '../utils/platform';
import { sipManager, type SipState } from '../utils/sip';
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

// Qo'ng'iroq uchun raqamni bir xil formatga keltirish:
// +998 yoki 998 davlat kodi bo'lsa olib tashlanadi, bo'lmasa shundayligicha.
function normalizeDial(number: string): string {
  let s = number.replace(/[^\d+]/g, '');
  if (s.startsWith('+998')) s = s.slice(4);
  else if (s.startsWith('998') && s.length > 9) s = s.slice(3);
  s = s.replace(/^\+/, '');
  return s;
}

function formatDuration(sec: number) {
  const s = Math.max(0, Math.floor(sec));
  const mm = Math.floor(s / 60).toString().padStart(2, '0');
  const ss = (s % 60).toString().padStart(2, '0');
  return `${mm}:${ss}`;
}

export default function Softphone() {
  const { currentUser, settings, startCallLog, updateCallLog, tickets, callLogs } = useApp();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'dial' | 'history'>('dial');
  const [dialer, setDialer] = useState('');
  const [activeCall, setActiveCall] = useState<CallLog | null>(null);
  const [sipCall, setSipCall] = useState(false); // joriy qo'ng'iroq SIP orqalimi
  const [sip, setSip] = useState<SipState>(sipManager.state);
  const [now, setNow] = useState(Date.now());
  const tickRef = useRef<number | null>(null);
  const activeRef = useRef<CallLog | null>(null);
  const prevSipCallRef = useRef(sip.call);
  activeRef.current = activeCall;

  const sipReady = sip.reg === 'registered';
  const sipConfigured = !!settings.sip?.enabled;

  // SIP UA ni sozlash — sozlama yoki foydalanuvchi o'zgarsa qayta ulanadi
  useEffect(() => {
    if (!currentUser) return;
    sipManager.configure(settings.sip, {
      extension: currentUser.sipExtension,
      password: currentUser.sipPassword,
      displayName: currentUser.fullName ?? currentUser.username,
    });
  }, [settings.sip, currentUser]);

  // SIP holatini kuzatish
  useEffect(() => sipManager.subscribe(setSip), []);

  // Aktiv qo'ng'iroq paytida har sekund yangilash
  useEffect(() => {
    const hasActive = !!activeCall || sip.call === 'connected' || sip.call === 'outgoing';
    if (!hasActive) {
      if (tickRef.current) clearInterval(tickRef.current);
      tickRef.current = null;
      return;
    }
    tickRef.current = window.setInterval(() => setNow(Date.now()), 1000);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [activeCall?.id, sip.call]);

  // SIP qo'ng'iroq hayot tsikli → call log
  useEffect(() => {
    const prev = prevSipCallRef.current;
    const cur = sip.call;
    prevSipCallRef.current = cur;
    const ac = activeRef.current;

    // Bog'landi
    if (cur === 'connected' && ac && sipCall && !ac.connectedAt) {
      const t = Date.now();
      updateCallLog(ac.id, { connectedAt: t });
      setActiveCall({ ...ac, connectedAt: t });
    }
    // Tugadi
    if (cur === 'none' && prev !== 'none' && ac && sipCall) {
      const endedAt = Date.now();
      const durationSec = Math.floor((endedAt - ac.startedAt) / 1000);
      const talkSec = ac.connectedAt ? Math.floor((endedAt - ac.connectedAt) / 1000) : 0;
      const outcome: CallOutcome = ac.connectedAt ? 'answered' : sip.lastError ? 'failed' : 'no_answer';
      updateCallLog(ac.id, { outcome, endedAt, durationSec, talkSec });
      setActiveCall(null);
      setSipCall(false);
      setDialer('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sip.call]);

  // ipost:dial hodisasi
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { number?: string; ticketId?: string; customerName?: string };
      if (!detail?.number || !currentUser) return;
      initiateCall(detail.number, detail.ticketId, detail.customerName);
    };
    window.addEventListener('ipost:dial', handler);
    return () => window.removeEventListener('ipost:dial', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, sipReady, tickets]);

  if (!currentUser) return null;

  function buildLog(number: string, direction: 'inbound' | 'outbound', ticketId?: string, customerName?: string) {
    const cleaned = number.replace(/[^\d+*#]/g, '') || number;
    let tNum: string | undefined;
    let cName = customerName;
    if (ticketId) {
      const t = tickets.find((x) => x.id === ticketId);
      if (t) { tNum = t.trackingNumber; if (!cName) cName = t.customerName; }
    }
    return startCallLog({
      operatorId: currentUser!.id,
      operatorName: currentUser!.fullName ?? currentUser!.username,
      number: cleaned,
      customerName: cName,
      ticketId,
      trackingNumber: tNum,
      direction,
    });
  }

  function initiateCall(number: string, ticketId?: string, customerName?: string) {
    // Bir xil format: +998/998 olib tashlanadi
    const dialNum = normalizeDial(number);
    if (!dialNum) return;
    const log = buildLog(dialNum, 'outbound', ticketId, customerName);
    setActiveCall(log);
    setOpen(true);
    setDialer(dialNum);
    // SIP ulangan bo'lsa — ichki qo'ng'iroq; aks holda tashqi softphone
    if (sipReady) {
      const ok = sipManager.call(dialNum);
      setSipCall(ok);
      if (!ok) launchExternalCall(dialNum);
    } else {
      setSipCall(false);
      launchExternalCall(dialNum);
    }
  }

  function acceptIncoming() {
    const log = buildLog(sip.number || 'Noma\'lum', 'inbound');
    setActiveCall(log);
    setSipCall(true);
    setOpen(true);
    sipManager.answer();
  }

  function rejectIncoming() {
    sipManager.hangup();
  }

  // Manual rejim (tashqi qo'ng'iroq) uchun — eski tugmalar
  function markOutcome(outcome: CallOutcome) {
    if (!activeCall) return;
    const endedAt = Date.now();
    const durationSec = Math.floor((endedAt - activeCall.startedAt) / 1000);
    const talkSec = activeCall.connectedAt ? Math.floor((endedAt - activeCall.connectedAt) / 1000) : 0;
    updateCallLog(activeCall.id, { outcome, endedAt, durationSec, talkSec });
    setActiveCall(null);
    setDialer('');
  }
  function markConnected() {
    if (!activeCall || activeCall.connectedAt) return;
    const t = Date.now();
    updateCallLog(activeCall.id, { connectedAt: t });
    setActiveCall({ ...activeCall, connectedAt: t });
  }

  function hangupSip() {
    sipManager.hangup();
  }

  function dialPress(d: string) {
    // SIP qo'ng'iroq paytida — DTMF; aks holda raqam yig'ish
    if (sipCall && sip.call === 'connected') {
      sipManager.sendDtmf(d);
      setDialer((v) => v + d);
    } else {
      setDialer((v) => v + d);
    }
  }

  function dial() {
    const num = dialer.trim();
    if (!num) return;
    initiateCall(num);
  }

  const elapsedSec = activeCall ? Math.floor((now - activeCall.startedAt) / 1000) : 0;
  const talkSec = activeCall?.connectedAt ? Math.floor((now - activeCall.connectedAt) / 1000) : 0;
  const isConnected = sipCall ? sip.call === 'connected' : !!activeCall?.connectedAt;
  const inCall = !!activeCall;

  const bubbleColor = inCall
    ? isConnected
      ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 ring-4 ring-emerald-300/40'
      : 'bg-gradient-to-br from-amber-500 to-orange-600 ring-4 ring-amber-300/40'
    : 'bg-gradient-to-br from-sky-500 to-blue-600';

  // Kiruvchi qo'ng'iroq (hali qabul qilinmagan)
  const ringingIncoming = sip.call === 'incoming' && !activeCall;

  return (
    <>
      <style>{`
        @keyframes phone-jingle {
          0%, 100% { transform: rotate(0deg); }
          10%, 30%, 50%, 70%, 90% { transform: rotate(-14deg); }
          20%, 40%, 60%, 80% { transform: rotate(14deg); }
        }
        .phone-jingle-hover:hover .phone-icon-inner { animation: phone-jingle 0.7s ease-in-out infinite; transform-origin: center; }
        .phone-jingle-hover:hover { box-shadow: 0 0 0 8px rgba(56,189,248,0.18), 0 0 0 16px rgba(56,189,248,0.10), 0 12px 30px rgba(2,132,199,0.45); }
        @keyframes pulse-ring-call { 0% { box-shadow: 0 0 0 0 rgba(16,185,129,0.4); } 70% { box-shadow: 0 0 0 14px rgba(16,185,129,0); } 100% { box-shadow: 0 0 0 0 rgba(16,185,129,0); } }
        .pulse-active { animation: pulse-ring-call 1.8s infinite; }
      `}</style>

      {/* KIRUVCHI QO'NG'IROQ OYNASI */}
      <AnimatePresence>
        {ringingIncoming && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.95 }}
            className="fixed right-4 bottom-20 md:bottom-4 z-[60] w-80 max-w-[calc(100vw-2rem)] rounded-3xl shadow-2xl overflow-hidden text-white bg-gradient-to-br from-emerald-500 to-emerald-700"
          >
            <div className="p-5 text-center">
              <div className="mx-auto h-14 w-14 rounded-full bg-white/20 flex items-center justify-center mb-3 pulse-active">
                <PhoneIncoming className="h-7 w-7" />
              </div>
              <div className="text-xs uppercase tracking-wider text-white/80">Kiruvchi qo'ng'iroq</div>
              <div className="text-2xl font-bold font-mono mt-1">{sip.number}</div>
              {sip.displayName && <div className="text-sm text-white/85">{sip.displayName}</div>}
              <div className="grid grid-cols-2 gap-3 mt-5">
                <button onClick={rejectIncoming} className="py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 font-bold flex items-center justify-center gap-2 shadow-lg">
                  <PhoneOff className="h-5 w-5" /> Rad etish
                </button>
                <button onClick={acceptIncoming} className="py-3 rounded-2xl bg-white text-emerald-700 hover:bg-emerald-50 font-bold flex items-center justify-center gap-2 shadow-lg">
                  <Phone className="h-5 w-5" /> Javob berish
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {!open && !ringingIncoming && (
          <motion.button
            layoutId="softphone-bubble"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.6 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => setOpen(true)}
            className={`fixed right-4 bottom-20 md:bottom-4 z-50 h-14 w-14 rounded-full shadow-2xl text-white flex items-center justify-center relative phone-jingle-hover transition-shadow ${bubbleColor} ${inCall ? 'pulse-active' : ''}`}
            title={inCall ? "Qo'ng'iroqda — bosing" : 'Telefon'}
          >
            <span className="phone-icon-inner inline-flex"><Phone className="h-6 w-6" /></span>
            {inCall && (
              <span className="absolute -top-1 -right-1 px-1.5 h-5 min-w-5 rounded-full bg-white text-emerald-700 text-[10px] font-bold flex items-center justify-center shadow">
                {formatDuration(elapsedSec)}
              </span>
            )}
            {/* Registratsiya holati nuqtasi */}
            {sipConfigured && !inCall && (
              <span className={`absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-white flex items-center justify-center ${sipReady ? 'bg-emerald-400' : 'bg-slate-400'}`} title={sipReady ? 'Liniya ulangan' : 'Liniya ulanmagan'} />
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
                {inCall ? (isConnected ? 'Qo\'ng\'iroqda' : 'Qo\'ng\'iroq...') : 'Telefon'}
              </div>
              <div className="flex items-center gap-2">
                {sipConfigured && (
                  <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-white/15" title={sipReady ? 'Liniya ulangan' : 'Liniya ulanmagan'}>
                    {sipReady ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                    {sipReady ? 'Liniya' : 'Ulanmoqda'}
                  </span>
                )}
                <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-white/20" title="Minimallashtirish">
                  <Minus className="h-4 w-4" />
                </button>
              </div>
            </div>

            {!inCall && (
              <div className="flex border-b border-white/10">
                <button
                  onClick={() => setTab('dial')}
                  className={`flex-1 px-3 py-2 text-xs font-semibold inline-flex items-center justify-center gap-1.5 ${tab === 'dial' ? 'bg-white/15 text-white' : 'text-white/70 hover:bg-white/5'}`}
                >
                  <Hash className="h-3.5 w-3.5" /> Klaviatura
                </button>
                <button
                  onClick={() => setTab('history')}
                  className={`flex-1 px-3 py-2 text-xs font-semibold inline-flex items-center justify-center gap-1.5 ${tab === 'history' ? 'bg-white/15 text-white' : 'text-white/70 hover:bg-white/5'}`}
                >
                  <History className="h-3.5 w-3.5" /> Mening tarixim
                </button>
              </div>
            )}

            <div className="p-4">
              {inCall ? (
                <div className="space-y-3">
                  <div className="text-center py-3 border-b border-white/15">
                    <div className="text-xs text-white/80 uppercase tracking-wider">
                      {isConnected ? 'Bog\'landi' : "Bog'lanmoqda..."}
                    </div>
                    <div className="text-2xl font-bold mt-1 font-mono">{activeCall.number}</div>
                    {activeCall.customerName && <div className="text-sm text-white/85 mt-0.5">{activeCall.customerName}</div>}
                    {activeCall.trackingNumber && <div className="text-[11px] text-white/70 mt-0.5 font-mono">Trek: {activeCall.trackingNumber}</div>}
                    <div className="mt-2 text-3xl font-mono font-bold tracking-wider">
                      {formatDuration(isConnected ? talkSec : elapsedSec)}
                    </div>
                    {isConnected && <div className="text-[10px] text-white/60 mt-0.5">jami: {formatDuration(elapsedSec)}</div>}
                  </div>

                  {sipCall ? (
                    /* SIP REJIM — haqiqiy qo'ng'iroq */
                    <>
                      {isConnected && (
                        <div className="grid grid-cols-3 gap-1.5">
                          {['1','2','3','4','5','6','7','8','9','*','0','#'].map((d) => (
                            <button key={d} onClick={() => dialPress(d)} className="py-2 rounded-xl bg-white/15 hover:bg-white/25 font-bold text-white">
                              {d}
                            </button>
                          ))}
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => sipManager.toggleMute()} className="py-3 rounded-2xl bg-white/15 hover:bg-white/25 font-semibold flex items-center justify-center gap-2">
                          {sip.muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                          {sip.muted ? 'Yoqish' : 'Mikrofon'}
                        </button>
                        <button onClick={hangupSip} className="py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 font-bold flex items-center justify-center gap-2 shadow-lg">
                          <PhoneOff className="h-5 w-5" /> Tugatish
                        </button>
                      </div>
                    </>
                  ) : (
                    /* MANUAL REJIM — tashqi softphone */
                    !activeCall.connectedAt ? (
                      <>
                        <div className="text-[11px] text-white/85 text-center mb-2">Qabul qiluvchi javob berdimi?</div>
                        <div className="grid grid-cols-2 gap-2">
                          <button onClick={markConnected} className="py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 font-semibold flex items-center justify-center gap-1.5 shadow-lg">
                            <CheckCircle2 className="h-5 w-5" /> Bog'landi
                          </button>
                          <button onClick={() => markOutcome('no_answer')} className="py-3 rounded-2xl bg-white/15 hover:bg-white/25 font-semibold flex items-center justify-center gap-1.5">
                            <XCircle className="h-5 w-5" /> Javob yo'q
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          <button onClick={() => markOutcome('busy')} className="py-2.5 rounded-2xl bg-white/15 hover:bg-white/25 text-sm font-semibold flex items-center justify-center gap-1.5">
                            <Pause className="h-4 w-4" /> Band
                          </button>
                          <button onClick={() => markOutcome('failed')} className="py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-sm font-semibold flex items-center justify-center gap-1.5">
                            <PhoneOff className="h-4 w-4" /> Bekor
                          </button>
                        </div>
                      </>
                    ) : (
                      <button onClick={() => markOutcome('answered')} className="w-full py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 font-bold flex items-center justify-center gap-2 shadow-lg">
                        <PhoneOff className="h-5 w-5" /> Qo'ng'iroqni tugatish
                      </button>
                    )
                  )}
                </div>
              ) : tab === 'dial' ? (
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
                    <button onClick={() => setDialer(dialer.slice(0, -1))} className="px-3 rounded-xl bg-white/15 hover:bg-white/25" title="O'chirish" disabled={!dialer}>
                      <Delete className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 mb-3">
                    {['1','2','3','4','5','6','7','8','9','*','0','#'].map((d) => (
                      <button key={d} onClick={() => dialPress(d)} className="py-2.5 rounded-xl bg-white/15 hover:bg-white/25 font-bold text-white text-lg">
                        {d}
                      </button>
                    ))}
                  </div>
                  <button onClick={dial} disabled={!dialer.trim()} className="w-full py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 font-bold flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg">
                    <Phone className="h-5 w-5" /> Qo'ng'iroq qilish
                  </button>
                  <p className="text-[10px] text-white/70 mt-2 text-center">
                    {sipConfigured
                      ? sipReady
                        ? 'Liniya ulangan — to\'g\'ridan-to\'g\'ri qo\'ng\'iroq'
                        : 'Liniyaga ulanmoqda...'
                      : 'Liniya sozlanmagan — Sozlamalar → Telefon liniyasi'}
                  </p>
                </>
              ) : (
                /* TARIX — joriy operator qo'ng'iroqlari */
                (() => {
                  const myCalls = (callLogs ?? [])
                    .filter((c) => c.operatorId === currentUser?.id)
                    .sort((a, b) => b.startedAt - a.startedAt)
                    .slice(0, 25);
                  if (myCalls.length === 0) {
                    return (
                      <div className="text-center py-8 text-white/70 text-sm">
                        Hozircha qo'ng'iroq tarixi yo'q
                      </div>
                    );
                  }
                  return (
                    <div className="space-y-1.5 max-h-80 overflow-y-auto scroll-thin -mx-1 px-1">
                      {myCalls.map((c) => {
                        const dur = c.durationSec ?? 0;
                        const outcome = c.outcome ?? '—';
                        const ts = new Date(c.startedAt).toLocaleString('uz', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
                        const isOut = c.direction === 'outbound';
                        return (
                          <button
                            key={c.id}
                            onClick={() => { setDialer(c.number); setTab('dial'); }}
                            className="w-full text-left px-2.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 transition flex items-center gap-2"
                          >
                            <span className={`flex-shrink-0 h-7 w-7 rounded-full flex items-center justify-center ${
                              outcome === 'answered' || outcome === 'connected' ? 'bg-emerald-500/30 text-emerald-100'
                              : outcome === 'no_answer' ? 'bg-amber-500/30 text-amber-100'
                              : 'bg-rose-500/30 text-rose-100'
                            }`}>
                              {isOut ? <Phone className="h-3.5 w-3.5" /> : <PhoneIncoming className="h-3.5 w-3.5" />}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="font-mono text-xs text-white truncate">{c.number}</div>
                              <div className="text-[10px] text-white/70 truncate">
                                {c.customerName ?? ts}
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <div className="text-[10px] text-white/80">{formatDuration(dur)}</div>
                              <div className="text-[9px] text-white/60">{ts.split(' ')[1] ?? ts}</div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  );
                })()
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
  window.dispatchEvent(new CustomEvent('ipost:dial', { detail: { number, ...opts } }));
}
