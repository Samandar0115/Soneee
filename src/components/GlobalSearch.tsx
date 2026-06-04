import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Phone, User as UserIcon, Ticket as TicketIcon, X, Send } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useApp } from '../context/AppContext';
import { tFn } from '../i18n';
import { searchShortcutLabel } from '../utils/platform';

export default function GlobalSearch() {
  const { tickets, users, currentUser, lang, pushNotification } = useApp();
  const t = tFn(lang);
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [messagingTo, setMessagingTo] = useState<{ ticketId: string; userId: string; userName: string; trackingNumber: string } | null>(null);
  const [messageText, setMessageText] = useState('');
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

  // Global qidiruv — operator ham boshqa operatorlarning murojaatlarini topa oladi
  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) {
      // Bo'sh qidiruv — admin uchun hammasi, operator uchun o'ziniki birinchi
      if (currentUser?.role === 'admin') return tickets.slice(0, 8);
      return [...tickets]
        .sort((a, b) => {
          const aMine = a.assigneeId === currentUser?.id ? 1 : 0;
          const bMine = b.assigneeId === currentUser?.id ? 1 : 0;
          return bMine - aMine;
        })
        .slice(0, 8);
    }
    return tickets
      .filter(
        (x) =>
          x.trackingNumber.toLowerCase().includes(s) ||
          x.customerName.toLowerCase().includes(s) ||
          x.customerPhone.replace(/\D/g, '').includes(s.replace(/\D/g, ''))
      )
      .slice(0, 15);
  }, [tickets, q, currentUser]);

  function startMessage(t: typeof tickets[number]) {
    if (!t.assigneeId) { toast.error('Bu murojaatda operator yo\'q'); return; }
    const u = users.find((x) => x.id === t.assigneeId);
    if (!u) { toast.error('Operator topilmadi'); return; }
    setMessagingTo({
      ticketId: t.id,
      userId: u.id,
      userName: u.fullName ?? u.username,
      trackingNumber: t.trackingNumber,
    });
    setMessageText('');
  }

  function sendMessage() {
    if (!messagingTo || !currentUser) return;
    const txt = messageText.trim();
    if (!txt) { toast.error('Xabar matnini yozing'); return; }
    pushNotification({
      toUserId: messagingTo.userId,
      fromUserId: currentUser.id,
      fromUserName: currentUser.fullName ?? currentUser.username,
      ticketId: messagingTo.ticketId,
      trackingNumber: messagingTo.trackingNumber,
      type: 'mention',
      title: `${currentUser.fullName ?? currentUser.username} sizga xabar yubordi`,
      body: `${messagingTo.trackingNumber}: ${txt}`,
    });
    toast.success(`${messagingTo.userName} ga xabar yuborildi`);
    setMessagingTo(null);
    setMessageText('');
  }

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
              {results.map((r) => {
                const assignee = users.find((u) => u.id === r.assigneeId);
                const isOther = !!r.assigneeId && r.assigneeId !== currentUser?.id;
                return (
                  <div
                    key={r.id}
                    className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 border-b border-slate-100 dark:border-slate-800/50"
                  >
                    <button
                      onClick={() => {
                        setOpen(false);
                        nav('/tickets');
                      }}
                      className="flex items-start gap-3 flex-1 min-w-0 text-left"
                    >
                      <TicketIcon className="h-4 w-4 mt-1 text-brand-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm truncate">{r.customerName}</span>
                          <span className="text-[11px] font-mono text-slate-400">{r.trackingNumber}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5 flex-wrap">
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
                          {assignee && (
                            <span className={`badge ${isOther ? 'bg-rose-100 text-rose-700' : 'bg-brand-100 text-brand-700'}`}>
                              <UserIcon className="h-3 w-3" /> {assignee.fullName ?? assignee.username}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                    {isOther && (
                      <button
                        onClick={(e) => { e.stopPropagation(); startMessage(r); }}
                        title={`${assignee?.fullName ?? assignee?.username} ga xabar yuborish`}
                        className="flex-shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold border border-rose-200"
                      >
                        <Send className="h-3.5 w-3.5" /> Xabar
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="px-4 py-2 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-400 flex items-center gap-3">
              <UserIcon className="h-3 w-3" /> Barcha murojaatlar — boshqa operatordagi murojaat topilsa, "Xabar" tugmasi bilan yuborish mumkin
              {shortcutLabel && <span className="ml-auto">{shortcutLabel}</span>}
            </div>
          </motion.div>

          {/* Xabar yuborish modal */}
          {messagingTo && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
              onClick={() => setMessagingTo(null)}
            >
              <div
                className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 shadow-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
                  <Send className="h-4 w-4 text-rose-600" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-slate-800 dark:text-white truncate">
                      {messagingTo.userName} ga xabar
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono">{messagingTo.trackingNumber}</div>
                  </div>
                  <button
                    onClick={() => setMessagingTo(null)}
                    className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <X className="h-4 w-4 text-slate-400" />
                  </button>
                </div>
                <div className="p-4 space-y-3">
                  <textarea
                    autoFocus
                    rows={4}
                    className="input"
                    placeholder="Masalan: Mijoz qo'ng'iroq qildi, trekni tezroq ko'ring..."
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyDown={(e) => {
                      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                  />
                  <div className="flex gap-2">
                    <button onClick={() => setMessagingTo(null)} className="btn-ghost flex-1 text-sm">
                      Bekor
                    </button>
                    <button onClick={sendMessage} className="btn-primary flex-1 text-sm">
                      <Send className="h-4 w-4" /> Yuborish
                    </button>
                  </div>
                  <div className="text-[11px] text-slate-400 text-center">
                    Ctrl + Enter bilan tezda yuborish
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
