import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  Plus,
  Ticket as TicketIcon,
  Users,
  Zap,
} from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { motion } from 'framer-motion';
import PageHeader from '../components/PageHeader';
import StatCard from '../components/StatCard';
import TicketModal from '../components/TicketModal';
import { useApp } from '../context/AppContext';
import { timeAgo } from '../utils/format';

const DAY = 86_400_000;
const STALE_DAYS = 5;

export default function Dashboard() {
  const { tickets, stages, users, currentUser } = useApp();
  const [open, setOpen] = useState(false);
  const nav = useNavigate();
  const isAdmin = currentUser?.role === 'admin';
  const now = Date.now();

  const visibleTickets = useMemo(() => {
    if (isAdmin) return tickets;
    return tickets.filter(
      (t) => t.assigneeId === currentUser?.id || (t.createdBy === currentUser?.id && !t.assigneeId)
    );
  }, [tickets, currentUser, isAdmin]);

  const pending = visibleTickets.filter((t) => t.status === 'pending').length;
  const resolved = visibleTickets.filter((t) => t.status === 'resolved').length;
  const todayCount = visibleTickets.filter(
    (t) => new Date(t.createdAt).toDateString() === new Date().toDateString()
  ).length;
  const overdue = visibleTickets.filter(
    (t) => t.status === 'pending' && t.slaDueAt && t.slaDueAt < now
  ).length;
  const stale = visibleTickets.filter(
    (t) => t.status === 'pending' && now - t.updatedAt > STALE_DAYS * DAY
  ).length;

  const byStage = useMemo(
    () =>
      stages.map((s) => ({
        name: s.name.length > 12 ? s.name.slice(0, 12) + '…' : s.name,
        count: visibleTickets.filter((t) => t.stageId === s.id).length,
        color: s.color,
      })),
    [stages, visibleTickets]
  );

  const operatorLoad = useMemo(() => {
    if (!isAdmin) return [];
    return users
      .filter((u) => u.role === 'operator')
      .map((u) => {
        const active = tickets.filter((t) => t.assigneeId === u.id && t.status === 'pending');
        const overdueCount = active.filter((t) => t.slaDueAt && t.slaDueAt < now).length;
        return {
          user: u,
          activeCount: active.length,
          overdueCount,
          resolved24h: tickets.filter(
            (t) => t.assigneeId === u.id && t.resolvedAt && now - t.resolvedAt < DAY
          ).length,
        };
      })
      .sort((a, b) => b.activeCount - a.activeCount);
  }, [users, tickets, isAdmin, now]);

  const recent = useMemo(
    () => [...visibleTickets].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 8),
    [visibleTickets]
  );

  const urgentList = useMemo(
    () =>
      visibleTickets
        .filter((t) => t.status === 'pending' && t.priority === 'urgent')
        .sort((a, b) => (a.slaDueAt ?? 0) - (b.slaDueAt ?? 0))
        .slice(0, 5),
    [visibleTickets]
  );

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <PageHeader
        title={`Salom, ${currentUser?.fullName ?? currentUser?.username} 👋`}
        subtitle={
          isAdmin
            ? `Tizimda ${tickets.length} ta murojaat · ${users.length} xodim`
            : `Sizning yuklamangiz: ${pending} ta aktiv murojaat`
        }
        actions={
          <button className="btn-primary" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> Yangi murojaat
          </button>
        }
      />

      {(overdue > 0 || stale > 0) && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-3 mb-4 flex items-center gap-3 border-2 border-rose-200 bg-rose-50 dark:bg-rose-900/20"
        >
          <AlertTriangle className="h-5 w-5 text-rose-600 flex-shrink-0" />
          <div className="flex-1 text-sm">
            <b className="text-rose-800 dark:text-rose-300">Diqqat:</b>{' '}
            {overdue > 0 && (
              <span>
                <b>{overdue}</b> ta SLA kechikkan murojaat
              </span>
            )}
            {overdue > 0 && stale > 0 && ', '}
            {stale > 0 && (
              <span>
                <b>{stale}</b> ta {STALE_DAYS} kundan beri yangilanmagan
              </span>
            )}
            .
          </div>
          <button onClick={() => nav('/tickets')} className="btn-primary text-xs">
            Ko'rish
          </button>
        </motion.div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard label="Jami" value={visibleTickets.length} icon={TicketIcon} tone="brand" />
        <StatCard label="Kutilmoqda" value={pending} icon={Clock} tone="amber" />
        <StatCard label="Hal etildi" value={resolved} icon={CheckCircle2} tone="emerald" />
        <StatCard label="Bugun" value={todayCount} icon={Activity} tone="slate" />
        <StatCard label="Kechikkan" value={overdue} icon={AlertTriangle} tone="rose" />
        <StatCard label="Eskirgan" value={stale} icon={Calendar} tone="amber" hint={`>${STALE_DAYS} kun`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-5">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-5 lg:col-span-2"
        >
          <h3 className="font-bold mb-3">Bosqichlar bo'yicha taqsimot</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byStage}>
                <CartesianGrid stroke="#f1f5f9" />
                <XAxis dataKey="name" fontSize={11} stroke="#94a3b8" />
                <YAxis allowDecimals={false} fontSize={11} stroke="#94a3b8" />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
                <Bar dataKey="count" radius={[8, 8, 0, 0]} fill="#2f66ff" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="card p-5"
        >
          <h3 className="font-bold mb-3 flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-500" /> Shoshilinch murojaatlar
          </h3>
          <div className="space-y-2 max-h-64 overflow-y-auto scroll-thin pr-1">
            {urgentList.length === 0 && (
              <div className="text-sm text-slate-400 text-center py-8">Yo'q — tinch!</div>
            )}
            {urgentList.map((t) => {
              const overdueT = t.slaDueAt && t.slaDueAt < now;
              return (
                <button
                  key={t.id}
                  onClick={() => nav('/tickets')}
                  className="w-full text-left p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
                >
                  <div className={`h-2 w-2 rounded-full ${overdueT ? 'bg-rose-500 animate-pulse' : 'bg-amber-500'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">{t.customerName}</div>
                    <div className="text-[11px] text-slate-500 truncate">
                      {t.trackingNumber} · {timeAgo(t.updatedAt)}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </motion.div>
      </div>

      {isAdmin && operatorLoad.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card p-5 mt-4"
        >
          <h3 className="font-bold mb-3 flex items-center gap-2">
            <Users className="h-4 w-4" /> Operator yuklamasi
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {operatorLoad.map((o) => {
              const max = operatorLoad[0]?.activeCount || 1;
              const pct = (o.activeCount / max) * 100;
              return (
                <div
                  key={o.user.id}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 p-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-sm truncate">
                      {o.user.fullName ?? o.user.username}
                    </div>
                    <span className="badge bg-brand-100 text-brand-700">{o.activeCount}</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full mt-2 overflow-hidden">
                    <div
                      className={`h-full ${
                        o.overdueCount > 0 ? 'bg-rose-500' : 'bg-brand-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-500">
                    <span>+{o.resolved24h} bugun</span>
                    {o.overdueCount > 0 && (
                      <span className="text-rose-600">⚠ {o.overdueCount} kechikkan</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="card p-5 mt-4"
      >
        <h3 className="font-bold mb-3">So'nggi harakatlar</h3>
        <div className="space-y-2 max-h-72 overflow-y-auto scroll-thin pr-1">
          {recent.length === 0 && (
            <div className="text-sm text-slate-400 text-center py-8">Hozircha hech narsa yo'q</div>
          )}
          {recent.map((t) => {
            const stage = stages.find((s) => s.id === t.stageId);
            return (
              <div key={t.id} className="flex items-start gap-3">
                <div
                  className="mt-1 h-2.5 w-2.5 rounded-full flex-shrink-0"
                  style={{ background: stage?.color ?? '#94a3b8' }}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold truncate">
                    {t.customerName}{' '}
                    <span className="text-slate-400 font-normal">· {t.trackingNumber}</span>
                  </div>
                  <div className="text-xs text-slate-500">
                    {stage?.name ?? '—'} · {timeAgo(t.updatedAt)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>

      <TicketModal open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
