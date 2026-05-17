import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Keyboard, X } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function KeyboardShortcuts() {
  const nav = useNavigate();
  const { currentUser } = useApp();
  const [help, setHelp] = useState(false);

  useEffect(() => {
    function isInput(target: EventTarget | null) {
      if (!target || !(target instanceof HTMLElement)) return false;
      const tag = target.tagName.toLowerCase();
      return tag === 'input' || tag === 'textarea' || tag === 'select' || target.isContentEditable;
    }
    function onKey(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (isInput(e.target)) return;

      switch (e.key) {
        case '?':
          e.preventDefault();
          setHelp((v) => !v);
          break;
        case 'g':
          // Sequence: g + letter
          const handler = (e2: KeyboardEvent) => {
            window.removeEventListener('keydown', handler);
            if (isInput(e2.target)) return;
            switch (e2.key) {
              case 'd': nav('/'); break;
              case 'p': nav('/pipeline'); break;
              case 't': nav('/tickets'); break;
              case 'k': nav('/knowledge'); break;
              case 'a': if (currentUser?.role === 'admin') nav('/analytics'); break;
              case 's': if (currentUser?.role === 'admin') nav('/settings'); break;
            }
          };
          window.addEventListener('keydown', handler);
          setTimeout(() => window.removeEventListener('keydown', handler), 1000);
          break;
        case 'n':
          e.preventDefault();
          nav('/tickets?new=1');
          break;
        case 'm':
          e.preventDefault();
          nav('/tickets?quick=mine');
          break;
        case '/':
          e.preventDefault();
          window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }));
          break;
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [nav, currentUser]);

  return (
    <AnimatePresence>
      {help && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setHelp(false)}
        >
          <motion.div
            initial={{ scale: 0.95, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 10 }}
            onClick={(e) => e.stopPropagation()}
            className="card w-full max-w-md p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold flex items-center gap-2">
                <Keyboard className="h-4 w-4 text-brand-600" /> Klaviatura yorliqlari
              </h3>
              <button onClick={() => setHelp(false)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-1.5 text-sm">
              <Row keys={['?']} desc="Yorliqlar ro‘yxati (shu oyna)" />
              <Row keys={['/', 'Ctrl', 'K']} desc="Global qidiruv" />
              <Row keys={['N']} desc="Yangi murojaat" />
              <Row keys={['M']} desc="Mening queue" />
              <div className="text-[11px] uppercase tracking-wider text-slate-500 mt-3 mb-1">Tezkor navigatsiya</div>
              <Row keys={['G', 'D']} desc="Boshqaruv paneli" />
              <Row keys={['G', 'P']} desc="Pipeline" />
              <Row keys={['G', 'T']} desc="Murojaatlar" />
              <Row keys={['G', 'K']} desc="Bilim bazasi" />
              {currentUser?.role === 'admin' && (
                <>
                  <Row keys={['G', 'A']} desc="Analitika" />
                  <Row keys={['G', 'S']} desc="Sozlamalar" />
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Row({ keys, desc }: { keys: string[]; desc: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <span className="text-slate-600 dark:text-slate-300">{desc}</span>
      <div className="flex items-center gap-1">
        {keys.map((k, i) => (
          <span key={i} className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 text-[11px] font-mono rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              {k}
            </kbd>
            {i < keys.length - 1 && <span className="text-slate-300">+</span>}
          </span>
        ))}
      </div>
    </div>
  );
}
