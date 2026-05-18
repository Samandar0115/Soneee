import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Phone, User as UserIcon, Ticket as TicketIcon, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useApp } from '../context/AppContext';
import { tFn } from '../i18n';
import { searchShortcutLabel } from '../utils/platform';

export default function GlobalSearch() {
  const { tickets, currentUser, lang } = useApp();
  const t = tFn(lang);
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const key = e.key.toLowerCase();
      // Ctrl/Cmd + K (har ikkala platform)
      // Ctrl + F (Windows/Linux uchun ham qabul qilamiz, lekin browser'ning Find'i avtomatik blok bo'lmasligi mumkin)
      if ((e.ctrlKey || e.metaKey) && (key === 'k' || key === 'f')) {
        // Windows browserlarda Ctrl+F avtomatik browser'ning Find oynasini ochadi
        // Bizning event tinglovchi browser'dan oldin ishlasa preventDefault qila olamiz
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const shortcutLabel = searchShortcutLabel();

  useEffect(() => {
    if (open) {
      setQ('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const scope = useMemo(() => {
    if (currentUser?.role === 'admin') return tickets;
    return tickets.filter(
      (t) => t.assigneeId === currentUser?.id || (t.createdBy === currentUser?.id && !t.assigneeId)
    );
  }, [tickets, currentUser]);

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return scope.slice(0, 8);
    return scope
      .filter(
        (x) =>
          x.trackingNumber.toLowerCase().includes(s) ||
          x.customerName.toLowerCase().includes(s) ||
          x.customerPhone.replace(/\D/g, '').includes(s.replace(/\D/g, ''))
      )
      .slice(0, 15);
  }, [scope, q]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-start justify-center pt-24 p-4 bg-slate-900/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setOpen(false)}
        >
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10 }}
            className="w-full max-w-xl card overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200 dark:border-slate-800">
              <Search className="h-5 w-5 text-slate-400" />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t('search.placeholder')}
                className="flex-1 bg-transparent outline-none text-sm"
              />
              <kbd className="text-[10px] text-slate-400 border border-slate-200 dark:border-slate-700 rounded px-1.5 py-0.5">
                ESC
              </kbd>
              <button onClick={() => setOpen(false)} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="h-4 w-4 text-slate-400" />
              </button>
            </div>
            <div className="max-h-96 overflow-y-auto scroll-thin">
              {results.length === 0 && (
                <div className="p-8 text-center text-sm text-slate-400">{t('search.no_results')}</div>
              )}
              {results.map((r) => (
                <button
                  key={r.id}
                  onClick={() => {
                    setOpen(false);
                    nav('/tickets');
                  }}
                  className="w-full flex items-start gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 text-left border-b border-slate-100 dark:border-slate-800/50"
                >
                  <TicketIcon className="h-4 w-4 mt-1 text-brand-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm truncate">{r.customerName}</span>
                      <span className="text-[11px] font-mono text-slate-400">{r.trackingNumber}</span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-0.5">
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" /> {r.customerPhone}
                      </span>
                      <span
                        className={`badge ${
                          r.status === 'resolved'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {r.status}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            <div className="px-4 py-2 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-400 flex items-center gap-3">
              <UserIcon className="h-3 w-3" /> {currentUser?.role === 'admin' ? 'Hammasi' : "Faqat sizning"}
              {shortcutLabel && <span className="ml-auto">{shortcutLabel}</span>}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
