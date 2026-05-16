import { useMemo } from 'react';
import { CheckCircle2, Clock, Ticket as TicketIcon, Zap } from 'lucide-react';
import {
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import PageHeader from '../components/PageHeader';
import StatCard from '../components/StatCard';
import { useApp } from '../context/AppContext';

export default function Reports() {
  const { tickets, stages, users, runTestScenario, currentUser } = useApp();

  const visible = useMemo(() => {
    if (currentUser?.role === 'admin') return tickets;
    return tickets.filter(
      (t) => t.createdBy === currentUser?.id || t.assigneeId === currentUser?.id
    );
  }, [tickets, currentUser]);

  const pending = visible.filter((t) => t.status === 'pending').length;
  const resolved = visible.filter((t) => t.status === 'resolved').length;

  const last7 = useMemo(() => {
    const out: { day: string; created: number; resolved: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toDateString();
      const label = `${d.getDate()}.${d.getMonth() + 1}`;
      out.push({
        day: label,
        created: visible.filter((t) => new Date(t.createdAt).toDateString() === key).length,
        resolved: visible.filter(
          (t) => t.resolvedAt && new Date(t.resolvedAt).toDateString() === key
        ).length,
      });
    }
    return out;
  }, [visible]);

  const stageDist = useMemo(
    () =>
      stages.map((s) => ({
        name: s.name,
        value: visible.filter((t) => t.stageId === s.id).length,
        color: s.color,
      })),
    [stages, visible]
  );

  const operatorStats = useMemo(() => {
    return users
      .filter((u) => u.role === 'operator')
      .map((u) => ({
        name: u.fullName ?? u.username,
        handled: visible.filter((t) => t.assigneeId === u.id).length,
        resolved: visible.filter((t) => t.assigneeId === u.id && t.status === 'resolved').length,
      }))
      .sort((a, b) => b.handled - a.handled);
  }, [users, visible]);

  async function fireZap() {
    const t = await runTestScenario();
    if (t) toast.success(`Test ssenariy: ${t.trackingNumber}`);
    else toast.error('Test ssenariyni ishga tushirib bo\'lmadi');
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Hisobotlar"
        subtitle="KPI, ish samaradorligi va trendlar"
        actions={
          <button onClick={fireZap} className="btn-primary bg-gradient-to-r from-amber-500 to-rose-500">
            <Zap className="h-4 w-4" /> Test Scenario (Zap)
          </button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Jami" value={visible.length} icon={TicketIcon} tone="brand" />
        <StatCard label="Kutilmoqda" value={pending} icon={Clock} tone="amber" />
        <StatCard label="Hal etildi" value={resolved} icon={CheckCircle2} tone="emerald" />
        <StatCard
          label="Yopilish foizi"
          value={`${visible.length ? Math.round((resolved / visible.length) * 100) : 0}%`}
          icon={CheckCircle2}
          tone="slate"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-5">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-5 lg:col-span-2"
        >
          <h3 className="font-bold text-slate-900 mb-3">Oxirgi 7 kun trendi</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={last7}>
                <CartesianGrid stroke="#f1f5f9" />
                <XAxis dataKey="day" fontSize={11} stroke="#94a3b8" />
                <YAxis allowDecimals={false} fontSize={11} stroke="#94a3b8" />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
                <Line type="monotone" dataKey="created" stroke="#2f66ff" strokeWidth={2} dot={{ r: 3 }} name="Yaratildi" />
                <Line type="monotone" dataKey="resolved" stroke="#16a34a" strokeWidth={2} dot={{ r: 3 }} name="Hal etildi" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="card p-5"
        >
          <h3 className="font-bold text-slate-900 mb-3">Bosqichlar ulushi</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={stageDist} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90}>
                  {stageDist.map((s) => (
                    <Cell key={s.name} fill={s.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-1 mt-3 text-xs">
            {stageDist.map((s) => (
              <div key={s.name} className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
                <span className="truncate text-slate-600">{s.name}</span>
                <span className="ml-auto font-semibold text-slate-700">{s.value}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="card p-5 mt-5"
      >
        <h3 className="font-bold text-slate-900 mb-3">Operator samaradorligi</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-slate-500">
              <th className="py-2">Operator</th>
              <th className="py-2">Qabul qilgan</th>
              <th className="py-2">Hal etgan</th>
              <th className="py-2">Yopilish %</th>
            </tr>
          </thead>
          <tbody>
            {operatorStats.map((o) => (
              <tr key={o.name} className="border-t border-slate-100">
                <td className="py-2 font-semibold text-slate-800">{o.name}</td>
                <td className="py-2 text-slate-600">{o.handled}</td>
                <td className="py-2 text-slate-600">{o.resolved}</td>
                <td className="py-2">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-24 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500"
                        style={{ width: `${o.handled ? Math.round((o.resolved / o.handled) * 100) : 0}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-500">
                      {o.handled ? Math.round((o.resolved / o.handled) * 100) : 0}%
                    </span>
                  </div>
                </td>
              </tr>
            ))}
            {operatorStats.length === 0 && (
              <tr>
                <td colSpan={4} className="py-6 text-center text-slate-400">
                  Operatorlar topilmadi
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </motion.div>
    </div>
  );
}
