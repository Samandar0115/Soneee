import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Phone,
  Minus,
  Delete,
  ExternalLink,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { detectOS } from '../utils/platform';

// OS softphone'iga raqamni yuborish.
// Windows: callto: (MicroSIP) → MicroSIP avtomatik ochilib qo'ng'iroq qiladi
// macOS:   tel:    (Linphone/FaceTime — default handler nima bo'lsa)
// Boshqa:  callto:
function launchExternalCall(number: string) {
  const cleaned = number.replace(/[^\d+*#]/g, '');
  if (!cleaned) return;
  const os = detectOS();
  const url = os === 'mac' || os === 'ios' ? `tel:${cleaned}` : `callto:${cleaned}`;

  if (os === 'mac' || os === 'ios') {
    // Safari iframe'da custom URL ochmaydi
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

export default function Softphone() {
  const { currentUser } = useApp();
  const [open, setOpen] = useState(false);
  const [dialer, setDialer] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | null>(null);

  // Global "ipost:dial" hodisa — istalgan komponentdan qo'ng'iroq qilish
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { number?: string };
      if (!detail?.number) return;
      setDialer(detail.number);
      launchExternalCall(detail.number);
      showToast(`Softphone'ga uzatildi: ${detail.number}`);
    };
    window.addEventListener('ipost:dial', handler);
    return () => window.removeEventListener('ipost:dial', handler);
  }, []);

  if (!currentUser) return null;

  function showToast(msg: string) {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2500);
  }

  function dial() {
    const num = dialer.trim();
    if (!num) return;
    launchExternalCall(num);
    showToast(`Softphone'ga uzatildi: ${num}`);
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

      {/* Toast — qo'ng'iroq uzatilganda chiqadi */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed right-4 bottom-40 md:bottom-24 z-[60] px-4 py-2.5 bg-sky-600 text-white rounded-2xl shadow-2xl text-sm font-semibold flex items-center gap-2 max-w-xs"
          >
            <ExternalLink className="h-4 w-4 flex-shrink-0" />
            <span className="break-all">{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating telefon bubble — har doim ko'k */}
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
            title="Telefon"
          >
            <span className="phone-icon-inner inline-flex">
              <Phone className="h-6 w-6" />
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Dialer panel */}
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
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/15">
              <div className="flex items-center gap-2 text-sm font-bold">
                <Phone className="h-4 w-4" />
                Telefon
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
                    className="py-2.5 rounded-xl bg-white/15 hover:bg-white/25 font-bold text-white"
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
              <p className="text-[10px] text-white/70 mt-2 text-center">
                Tashqi softphone (MicroSIP / Linphone) avtomatik ochiladi
              </p>
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
