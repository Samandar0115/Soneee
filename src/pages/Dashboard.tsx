import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  Copy,
  FileText,
  Plus,
  Ticket as TicketIcon,
  Users,
  X,
  Zap,
} from 'lucide-react';
import toast from 'react-hot-toast';
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
  const { tickets, stages, users, currentUser, callLogs, cargoShipments, categories } = useApp();
  const [open, setOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const dailyReport = useMemo(() => {
    const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0);
    const dayMs = dayStart.getTime();
    const todayTickets = tickets.filter((t) => t.createdAt >= dayMs);
    const resolvedToday = tickets.filter((t) => t.resolvedAt && t.resolvedAt >= dayMs);
    const todayCalls = callLogs.filter((c) => c.startedAt >= dayMs);
    const answeredCalls = todayCalls.filter((c) => c.outcome === 'answered');
    const noAnswerCalls = todayCalls.filter((c) => c.outcome === 'no_answer');
    const totalTalkSec = answeredCalls.reduce((s, c) => s + (c.talkSec || 0), 0);
    const misroute = todayTickets.filter((t) => t.misroute || categories.find((c) => c.id === t.categoryId)?.id === 'cat-misroute');
    const cargoToday = cargoShipments.filter((c) => (c.arrivedAt && c.arrivedAt >= dayMs) || (c.deliveredAt && c.deliveredAt >= dayMs));
    const returnedToday = cargoShipments.filter((c) => c.returnedAt && c.returnedAt >= dayMs);

    // Per-operator
    const byOp = new Map<string, { name: string; tickets: number; calls: number; answered: number; talkSec: number }>();
    todayTickets.forEach((t) => {
      const u = users.find((x) => x.id === t.assigneeId);
      if (!u) return;
      const cur = byOp.get(u.id) ?? { name: u.fullName ?? u.username, tickets: 0, calls: 0, answered: 0, talkSec: 0 };
      cur.tickets += 1;
      byOp.set(u.id, cur);
    });
    todayCalls.forEach((c) => {
      const u = users.find((x) => x.id === c.operatorId);
      if (!u) return;
      const cur = byOp.get(u.id) ?? { name: u.fullName ?? u.username, tickets: 0, calls: 0, answered: 0, talkSec: 0 };
      cur.calls += 1;
      if (c.outcome === 'answered') {
        cur.answered += 1;
        cur.talkSec += c.talkSec || 0;
      }
      byOp.set(u.id, cur);
    });

    const date = dayStart.toLocaleDateString('uz-UZ', { day: 'numeric', month: 'long', year: 'numeric' });
    let text = `📊 KUNLIK HISOBOT — ${date}\n`;
    text += `═══════════════════════════════\n\n`;
    text += `📋 MUROJAATLAR\n`;
    text += `  • Bugun ochilgan: ${todayTickets.length} ta\n`;
    text += `  • Hal etilgan: ${resolvedToday.length} ta\n`;
    text += `  • Yuk adashishi: ${misroute.length} ta\n\n`;
    text += `📞 QO'NG'IROQLAR\n`;
    text += `  • Jami qo'ng'iroq: ${todayCalls.length} ta\n`;
    text += `  • Bog'landi: ${answeredCalls.length} ta (${todayCalls.length ? Math.round(answeredCalls.length / todayCalls.length * 100) : 0}%)\n`;
    text += `  • Javob yo'q: ${noAnswerCalls.length} ta\n`;
    text += `  • Jami gaplashish: ${Math.floor(totalTalkSec / 60)} min ${totalTalkSec % 60} sek\n\n`;
    text += `📦 YUKLAR\n`;
    text += `  • Bugun harakat: ${cargoToday.length} ta\n`;
    text += `  • Vozvrat (BTS/EMU): ${returnedToday.length} ta\n\n`;
    if (byOp.size > 0) {
      text += `👥 OPERATORLAR\n`;
      Array.from(byOp.values())
        .sort((a, b) => (b.calls + b.tickets) - (a.calls + a.tickets))
        .forEach((o) => {
          const talkMin = Math.floor(o.talkSec / 60);
          text += `  • ${o.name}: ${o.tickets} murojaat, ${o.answered}/${o.calls} qo'ng'iroq, ${talkMin}m gap\n`;
        });
    }
    text += `\n✨ Hisobot avtomatik tuzildi — iPOST CRM`;
    return text;
  }, [tickets, callLogs, cargoShipments, users, categories]);
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

  // Operatorning shaxsiy reytingi — o'ziga biriktirilgan baholangan murojaatlardan
  const myRating = useMemo(() => {
    const rated = visibleTickets.filter((t) => t.rating?.score);
    if (rated.length === 0) return null;
    const avg = rated.reduce((s, t) => s + (t.rating!.score || 0), 0) / rated.length;
    return { avg: Math.round(avg * 10) / 10, count: rated.length };
  }, [visibleTickets]);

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
          <div className="flex items-center gap-2">
            {isAdmin && (
              <button className="btn-ghost text-sm" onClick={() => setReportOpen(true)} title="Kunlik hisobot">
                <FileText className="h-4 w-4" /> Kunlik hisobot
              </button>
            )}
            <button className="btn-primary" onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" /> Yangi murojaat
            </button>
          </div>
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

      {/* Operator uchun shaxsiy reyting */}
      {!isAdmin && (
        <div className="card p-4 mt-3 flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-amber-400/15 text-amber-500 flex items-center justify-center text-2xl">★</div>
          <div className="flex-1">
            <div className="text-xs uppercase tracking-wider text-slate-500">Mening reytingim</div>
            {myRating ? (
              <div className="text-2xl font-bold text-slate-800 dark:text-white">
                {myRating.avg} <span className="text-base text-slate-400">/ 5</span>
                <span className="text-sm font-normal text-slate-500 ml-2">({myRating.count} ta baho)</span>
              </div>
            ) : (
              <div className="text-sm text-slate-400 mt-1">Hozircha baho yo'q</div>
            )}
          </div>
        </div>
      )}

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
              <div className="text-sm text-slate-400 text-center py-8">Shoshilinch murojaatlar yo'q ✓</div>
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

      {/* Kunlik hisobot modal */}
      {reportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setReportOpen(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <FileText className="h-5 w-5 text-brand-600" /> Kunlik hisobot
              </h3>
              <button onClick={() => setReportOpen(false)} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-5">
              <pre className="text-sm font-mono whitespace-pre-wrap text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                {dailyReport}
              </pre>
            </div>
            <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(dailyReport);
                  toast.success("Hisobot nusxa olindi — Telegram'ga yopishtiring");
                }}
                className="btn-primary"
              >
                <Copy className="h-4 w-4" /> Matnni nusxa olish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
