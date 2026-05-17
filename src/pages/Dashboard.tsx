import { useMemo, useState } from 'react';
import { Activity, CheckCircle2, Clock, Plus, Ticket as TicketIcon, Users } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { motion } from 'framer-motion';
import PageHeader from '../components/PageHeader';
import StatCard from '../components/StatCard';
import TicketModal from '../components/TicketModal';
import { useApp } from '../context/AppContext';
import { timeAgo } from '../utils/format';

export default function Dashboard() {
  const { tickets, stages, users, currentUser } = useApp();
  const [open, setOpen] = useState(false);

  const visibleTickets = useMemo(() => {
    if (currentUser?.role === 'admin') return tickets;
    return tickets.filter(
      (t) => t.assigneeId === currentUser?.id || (t.createdBy === currentUser?.id && !t.assigneeId)
    );
  }, [tickets, currentUser]);

  const pending = visibleTickets.filter((t) => t.status === 'pending').length;
  const resolved = visibleTickets.filter((t) => t.status === 'resolved').length;
  const todayCount = visibleTickets.filter(
    (t) => new Date(t.createdAt).toDateString() === new Date().toDateString()
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

  const recent = useMemo(
    () => [...visibleTickets].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 8),
    [visibleTickets]
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader
        title={`Salom, ${currentUser?.fullName ?? currentUser?.username} 👋`}
        subtitle="Real-time Virtual Control Room — barcha mijoz murojaatlari shu yerda."
        actions={
          <button className="btn-primary" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> Yangi murojaat
          </button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Jami murojaatlar" value={visibleTickets.length} icon={TicketIcon} tone="brand" />
        <StatCard label="Kutilmoqda" value={pending} icon={Clock} tone="amber" />
        <StatCard label="Hal etildi" value={resolved} icon={CheckCircle2} tone="emerald" />
        <StatCard
          label={currentUser?.role === 'admin' ? 'Xodimlar' : 'Bugun qabul'}
          value={currentUser?.role === 'admin' ? users.length : todayCount}
          icon={currentUser?.role === 'admin' ? Users : Activity}
          tone="slate"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-5">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card p-5 lg:col-span-2">
          <h3 className="font-bold text-slate-900 mb-3">Bosqichlar bo'yicha taqsimot</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byStage}>
                <CartesianGrid stroke="#f1f5f9" />
                <XAxis dataKey="name" fontSize={11} stroke="#94a3b8" />
                <YAxis allowDecimals={false} fontSize={11} stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                />
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
          <h3 className="font-bold text-slate-900 mb-3">So'nggi harakatlar</h3>
          <div className="space-y-3 max-h-72 overflow-y-auto scroll-thin pr-1">
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
                    <div className="text-sm font-semibold text-slate-800 truncate">
                      {t.customerName} <span className="text-slate-400">· {t.trackingNumber}</span>
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
      </div>

      <TicketModal open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
