import { useMemo, useRef, useState } from 'react';
import { Bell, X, Check, CheckCheck, Phone, Ticket as TicketIcon, AlertTriangle } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { timeAgo } from '../utils/format';
import type { AppNotification, NotificationType } from '../types';

const TYPE_META: Record<NotificationType, { icon: any; color: string; bg: string }> = {
  callback: { icon: Phone, color: '#f59e0b', bg: 'bg-amber-100 dark:bg-amber-900/30' },
  mention: { icon: TicketIcon, color: '#2f66ff', bg: 'bg-brand-100 dark:bg-brand-900/30' },
  assigned: { icon: TicketIcon, color: '#10b981', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
  sla: { icon: AlertTriangle, color: '#ef4444', bg: 'bg-rose-100 dark:bg-rose-900/30' },
  system: { icon: Bell, color: '#64748b', bg: 'bg-slate-100 dark:bg-slate-800' },
};

export default function NotificationsButton({ compact = false }: { compact?: boolean }) {
  const { notifications, currentUser, markAllNotificationsRead, markNotificationRead, clearNotifications, tickets } = useApp();
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const nav = useNavigate();

  const mine = useMemo(
    () => notifications.filter((n) => n.toUserId === currentUser?.id),
    [notifications, currentUser]
  );
  const unread = mine.filter((n) => !n.readAt).length;

  function handleClick(n: AppNotification) {
    markNotificationRead(n.id);
    if (n.ticketId) {
      nav('/tickets');
    }
    setOpen(false);
  }

  return (
    <div className="relative">
      <button
        ref={btnRef}
        onClick={() => setOpen((v) => !v)}
        className={`relative flex items-center justify-center rounded-xl bg-white/5 hover:bg-orange-400/20 hover:text-orange-200 text-slate-200 transition ${
          compact ? 'w-full h-10' : 'p-2'
        }`}
        title="Bildirishnomalar"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center shadow-lg"
          >
            {unread > 99 ? '99+' : unread}
          </motion.span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              className="absolute right-0 mt-2 w-96 max-w-[calc(100vw-2rem)] card z-50 overflow-hidden"
              style={{ position: 'absolute', top: '100%' }}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
                <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Bell className="h-4 w-4" /> Bildirishnomalar
                  {unread > 0 && (
                    <span className="text-xs bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 px-1.5 py-0.5 rounded-full">
                      {unread} yangi
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {unread > 0 && (
                    <button
                      onClick={() => markAllNotificationsRead()}
                      title="Hammasini o'qildi"
                      className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
                    >
                      <CheckCheck className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    onClick={() => setOpen(false)}
                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="max-h-96 overflow-y-auto scroll-thin">
                {mine.length === 0 && (
                  <div className="px-4 py-10 text-center text-sm text-slate-400">
                    Hozircha bildirishnomalar yo'q
                  </div>
                )}
                {mine.slice(0, 50).map((n) => {
                  const meta = TYPE_META[n.type] ?? TYPE_META.system;
                  const Icon = meta.icon;
                  const isUnread = !n.readAt;
                  return (
                    <button
                      key={n.id}
                      onClick={() => handleClick(n)}
                      className={`w-full text-left px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-start gap-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition ${
                        isUnread ? 'bg-brand-50/30 dark:bg-brand-900/10' : ''
                      }`}
                    >
                      <div className={`h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 ${meta.bg}`} style={{ color: meta.color }}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate">
                            {n.title}
                          </span>
                          {isUnread && (
                            <span className="h-2 w-2 rounded-full bg-brand-500 flex-shrink-0" />
                          )}
                        </div>
                        {n.body && (
                          <div className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 line-clamp-2">
                            {n.body}
                          </div>
                        )}
                        <div className="text-[10px] text-slate-400 mt-1">
                          {timeAgo(n.createdAt)}
                          {n.trackingNumber && ' · ' + n.trackingNumber}
                        </div>
                      </div>
                      {isUnread && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            markNotificationRead(n.id);
                          }}
                          className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400"
                          title="O'qildi"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </button>
                  );
                })}
              </div>

              {mine.length > 0 && (
                <div className="px-4 py-2 border-t border-slate-200 dark:border-slate-700">
                  <button
                    onClick={() => {
                      if (confirm("Hamma bildirishnomalarni o'chirishni tasdiqlaysizmi?")) {
                        clearNotifications();
                      }
                    }}
                    className="text-xs text-slate-500 hover:text-rose-600"
                  >
                    Hammasini o'chirish
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
