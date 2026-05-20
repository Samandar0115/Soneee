import { useMemo } from 'react';
import {
  BarChart,
  Bar,
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
import { Activity, Clock, MessageCircle, Star, TrendingUp, Trophy, Phone, PhoneCall, PhoneMissed, Headphones } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { useApp } from '../context/AppContext';

const DAY = 86_400_000;

export default function Analytics() {
  const { tickets, users, categories, callLogs } = useApp();

  const channelMix = useMemo(() => {
    const map = new Map<string, number>();
    tickets.forEach((t) => {
      const c = t.channel ?? 'Boshqa';
      map.set(c, (map.get(c) ?? 0) + 1);
    });
    const palette = ['#2f66ff', '#0ea5e9', '#10b981', '#f59e0b', '#a855f7', '#ef4444', '#64748b'];
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([name, value], i) => ({ name, value, color: palette[i % palette.length] }));
  }, [tickets]);

  const hourly = useMemo(() => {
    const buckets = Array.from({ length: 24 }, (_, h) => ({ hour: `${h}:00`, count: 0 }));
    tickets.forEach((t) => {
      const h = new Date(t.createdAt).getHours();
      buckets[h].count++;
    });
    return buckets;
  }, [tickets]);

  const topCategories = useMemo(() => {
    const map = new Map<string, number>();
    tickets.forEach((t) => {
      if (!t.categoryId) return;
      map.set(t.categoryId, (map.get(t.categoryId) ?? 0) + 1);
    });
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 7)
      .map(([id, count]) => {
        const c = categories.find((x) => x.id === id);
        return { name: c?.name ?? '—', icon: c?.icon ?? '📌', color: c?.color ?? '#64748b', count };
      });
  }, [tickets, categories]);

  const last30 = useMemo(() => {
    const out: { day: string; created: number; resolved: number }[] = [];
    const now = Date.now();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now - i * DAY);
      d.setHours(0, 0, 0, 0);
      const start = d.getTime();
      const end = start + DAY;
      const label = `${d.getDate()}.${d.getMonth() + 1}`;
      out.push({
        day: label,
        created: tickets.filter((t) => t.createdAt >= start && t.createdAt < end).length,
        resolved: tickets.filter((t) => t.resolvedAt && t.resolvedAt >= start && t.resolvedAt < end).length,
      });
    }
    return out;
  }, [tickets]);

  const operatorKPI = useMemo(() => {
    return users
      .filter((u) => u.role === 'operator')
      .map((u) => {
        const all = tickets.filter((t) => t.assigneeId === u.id);
        const resolved = all.filter((t) => t.status === 'resolved');
        const rated = resolved.filter((t) => t.rating?.score);
        const avgRating = rated.length
          ? rated.reduce((s, t) => s + (t.rating?.score ?? 0), 0) / rated.length
          : 0;
        const avgResolveMs =
          resolved.length > 0
            ? resolved.reduce((s, t) => s + ((t.resolvedAt ?? 0) - t.createdAt), 0) / resolved.length
            : 0;
        const avgHours = avgResolveMs / 3_600_000;
        const closeRate = all.length ? Math.round((resolved.length / all.length) * 100) : 0;
        return {
          user: u,
          total: all.length,
          resolved: resolved.length,
          closeRate,
          avgRating,
          avgHours,
        };
      })
      .sort((a, b) => b.resolved - a.resolved);
  }, [users, tickets]);

  const peakHour = useMemo(() => {
    const max = hourly.reduce((m, h) => (h.count > m.count ? h : m), hourly[0]);
    return max?.hour ?? '—';
  }, [hourly]);

  // === QO'NG'IROQLAR ANALITIKASI (admin uchun, hammasi) ===
  const callsLast30 = useMemo(() => {
    const cutoff = Date.now() - 30 * DAY;
    return callLogs.filter((c) => c.startedAt >= cutoff);
  }, [callLogs]);

  const callStats = useMemo(() => {
    const total = callsLast30.length;
    const answered = callsLast30.filter((c) => c.outcome === 'answered').length;
    const noAnswer = callsLast30.filter((c) => c.outcome === 'no_answer').length;
    const busy = callsLast30.filter((c) => c.outcome === 'busy').length;
    const failed = callsLast30.filter((c) => c.outcome === 'failed').length;
    const totalTalk = callsLast30.reduce((s, c) => s + (c.talkSec || 0), 0);
    const avgTalk = answered ? Math.round(totalTalk / answered) : 0;
    const successRate = total ? Math.round((answered / total) * 100) : 0;
    return { total, answered, noAnswer, busy, failed, totalTalk, avgTalk, successRate };
  }, [callsLast30]);

  // Operator bo'yicha taqsimot
  const callsByOperator = useMemo(() => {
    const map = new Map<string, { name: string; total: number; answered: number; talkSec: number }>();
    callsLast30.forEach((c) => {
      const u = users.find((x) => x.id === c.operatorId);
      const name = u?.fullName ?? c.operatorName ?? 'Noma\'lum';
      const cur = map.get(c.operatorId) ?? { name, total: 0, answered: 0, talkSec: 0 };
      cur.total += 1;
      if (c.outcome === 'answered') {
        cur.answered += 1;
        cur.talkSec += c.talkSec || 0;
      }
      map.set(c.operatorId, cur);
    });
    return Array.from(map.values())
      .map((o) => ({
        ...o,
        successRate: o.total ? Math.round((o.answered / o.total) * 100) : 0,
        avgTalk: o.answered ? Math.round(o.talkSec / o.answered) : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [callsLast30, users]);

  // Kunlik chart (oxirgi 30 kun)
  const callsDaily = useMemo(() => {
    const arr: { day: string; bogllangan: number; javobsiz: number }[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today.getTime() - i * DAY);
      const dayKey = `${d.getDate()}.${d.getMonth() + 1}`;
      const dayStart = d.getTime();
      const dayEnd = dayStart + DAY;
      const dayItems = callsLast30.filter((c) => c.startedAt >= dayStart && c.startedAt < dayEnd);
      arr.push({
        day: dayKey,
        bogllangan: dayItems.filter((c) => c.outcome === 'answered').length,
        javobsiz: dayItems.filter((c) => c.outcome !== 'answered').length,
      });
    }
    return arr;
  }, [callsLast30]);

  // Outcome pie chart
  const callOutcomePie = useMemo(() => {
    return [
      { name: "Bog'landi", value: callStats.answered, color: '#10b981' },
      { name: "Javob yo'q", value: callStats.noAnswer, color: '#64748b' },
      { name: 'Band', value: callStats.busy, color: '#f59e0b' },
      { name: 'Bekor', value: callStats.failed, color: '#e11d48' },
    ].filter((x) => x.value > 0);
  }, [callStats]);

  const avgRatingAll = useMemo(() => {
    const rated = tickets.filter((t) => t.rating?.score);
    if (rated.length === 0) return 0;
    return rated.reduce((s, t) => s + (t.rating?.score ?? 0), 0) / rated.length;
  }, [tickets]);

  const totalResolved = tickets.filter((t) => t.status === 'resolved').length;
  const closeRateOverall = tickets.length ? Math.round((totalResolved / tickets.length) * 100) : 0;

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <PageHeader
        title="Analitika"
        subtitle="20 operator va 10k+ murojaat uchun real-time tahlil"
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <KPI label="Yopilish %" value={`${closeRateOverall}%`} icon={Activity} tone="emerald" />
        <KPI label="Peak soat" value={peakHour} icon={Clock} tone="amber" />
        <KPI label="O'rtacha baho" value={avgRatingAll ? avgRatingAll.toFixed(2) : '—'} icon={Star} tone="brand" />
        <KPI label="Jami operator" value={users.filter((u) => u.role === 'operator').length} icon={Trophy} tone="slate" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card p-5 lg:col-span-2">
          <h3 className="font-bold mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-brand-600" /> 30 kunlik trend
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={last30}>
                <CartesianGrid stroke="#94a3b820" />
                <XAxis dataKey="day" fontSize={10} stroke="#94a3b8" />
                <YAxis allowDecimals={false} fontSize={10} stroke="#94a3b8" />
                <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                <Line type="monotone" dataKey="created" stroke="#2f66ff" strokeWidth={2} dot={{ r: 2 }} name="Yaratildi" />
                <Line type="monotone" dataKey="resolved" stroke="#10b981" strokeWidth={2} dot={{ r: 2 }} name="Hal etildi" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="card p-5">
          <h3 className="font-bold mb-3 flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-brand-600" /> Aloqa kanali
          </h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={channelMix} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75}>
                  {channelMix.map((s) => (
                    <Cell key={s.name} fill={s.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-1 mt-2 text-xs">
            {channelMix.map((c) => (
              <div key={c.name} className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.color }} />
                <span className="truncate flex-1 text-slate-600 dark:text-slate-300">{c.name}</span>
                <span className="font-semibold text-slate-700 dark:text-slate-200">{c.value}</span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card p-5 lg:col-span-2">
          <h3 className="font-bold mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4 text-brand-600" /> Peak soatlar (24 soat kesimida)
          </h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourly}>
                <CartesianGrid stroke="#94a3b820" />
                <XAxis dataKey="hour" fontSize={9} stroke="#94a3b8" interval={2} />
                <YAxis allowDecimals={false} fontSize={10} stroke="#94a3b8" />
                <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} fill="#2f66ff" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="card p-5">
          <h3 className="font-bold mb-3">Top muammolar (toifalar)</h3>
          <div className="space-y-2">
            {topCategories.length === 0 && (
              <div className="text-sm text-slate-400 text-center py-4">Hozircha yo'q</div>
            )}
            {topCategories.map((c, i) => {
              const max = topCategories[0]?.count || 1;
              const pct = (c.count / max) * 100;
              return (
                <div key={c.name + i}>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-lg">{c.icon}</span>
                    <span className="flex-1 font-semibold truncate text-slate-700 dark:text-slate-200">{c.name}</span>
                    <span className="text-slate-500 dark:text-slate-300 text-xs">{c.count}</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full mt-1 overflow-hidden">
                    <div className="h-full" style={{ width: `${pct}%`, background: c.color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="card p-5 mt-4 overflow-x-auto"
      >
        <h3 className="font-bold mb-3 flex items-center gap-2">
          <Trophy className="h-4 w-4 text-amber-500" /> Operator KPI (oylik kesim)
        </h3>
        <table className="w-full text-sm min-w-[560px] md:min-w-[700px]">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-slate-500 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
              <th className="py-2">Operator</th>
              <th className="py-2">Jami</th>
              <th className="py-2">Hal qilgan</th>
              <th className="py-2">Yopilish %</th>
              <th className="py-2">O'rt. vaqt</th>
              <th className="py-2">O'rt. baho</th>
            </tr>
          </thead>
          <tbody>
            {operatorKPI.map((o, i) => (
              <tr key={o.user.id} className="border-b border-slate-100 dark:border-slate-800">
                <td className="py-2 font-semibold flex items-center gap-2">
                  {i < 3 && (
                    <span className={`badge ${i === 0 ? 'bg-amber-100 text-amber-700' : i === 1 ? 'bg-slate-100 text-slate-600' : 'bg-orange-100 text-orange-700'}`}>
                      #{i + 1}
                    </span>
                  )}
                  <span className="text-slate-800 dark:text-slate-200">{o.user.fullName ?? o.user.username}</span>
                </td>
                <td className="py-2 text-slate-600 dark:text-slate-300">{o.total}</td>
                <td className="py-2 text-slate-600 dark:text-slate-300">{o.resolved}</td>
                <td className="py-2">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-20 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500" style={{ width: `${o.closeRate}%` }} />
                    </div>
                    <span className="text-xs text-slate-500 dark:text-slate-300">{o.closeRate}%</span>
                  </div>
                </td>
                <td className="py-2 text-slate-600 dark:text-slate-300">
                  {o.avgHours > 0 ? `${o.avgHours.toFixed(1)} soat` : '—'}
                </td>
                <td className="py-2">
                  {o.avgRating > 0 ? (
                    <span className="flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      <span className="font-semibold text-slate-700 dark:text-slate-200">
                        {o.avgRating.toFixed(2)}
                      </span>
                    </span>
                  ) : (
                    <span className="text-slate-400 text-xs">—</span>
                  )}
                </td>
              </tr>
            ))}
            {operatorKPI.length === 0 && (
              <tr>
                <td colSpan={6} className="py-6 text-center text-slate-400">
                  Operatorlar yo'q
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </motion.div>

      {/* ====== QO'NG'IROQLAR ANALITIKASI (admin uchun, oxirgi 30 kun) ====== */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="card p-5 mt-4"
      >
        <h3 className="font-bold mb-4 flex items-center gap-2 text-slate-800 dark:text-slate-100">
          <Phone className="h-4 w-4 text-brand-600" /> Qo'ng'iroqlar analitikasi (oxirgi 30 kun)
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60">
            <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 mb-1">
              <PhoneCall className="h-3.5 w-3.5" /> Jami qo'ng'iroq
            </div>
            <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{callStats.total}</div>
          </div>
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-900/30">
            <div className="text-xs text-emerald-700 dark:text-emerald-300 mb-1">Bog'landi</div>
            <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{callStats.answered}</div>
            <div className="text-[11px] text-emerald-600 dark:text-emerald-400">{callStats.successRate}% muvaffaqiyat</div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60">
            <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 mb-1">
              <PhoneMissed className="h-3.5 w-3.5" /> Javob yo'q
            </div>
            <div className="text-2xl font-bold text-slate-700 dark:text-slate-200">{callStats.noAnswer}</div>
          </div>
          <div className="p-4 rounded-2xl bg-sky-50 dark:bg-sky-900/30">
            <div className="flex items-center gap-1 text-xs text-sky-700 dark:text-sky-300 mb-1">
              <Headphones className="h-3.5 w-3.5" /> O'rt. gaplashish
            </div>
            <div className="text-2xl font-bold text-sky-700 dark:text-sky-300">
              {Math.floor(callStats.avgTalk / 60)}:{(callStats.avgTalk % 60).toString().padStart(2, '0')}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Daily line chart */}
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mb-1.5 font-semibold">Kunlik dinamika</div>
            <div style={{ width: '100%', height: 220 }}>
              <ResponsiveContainer>
                <LineChart data={callsDaily}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="bogllangan" stroke="#10b981" strokeWidth={2} name="Bog'landi" />
                  <Line type="monotone" dataKey="javobsiz" stroke="#94a3b8" strokeWidth={2} name="Bog'lanmadi" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Outcome pie */}
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mb-1.5 font-semibold">Natijalar taqsimoti</div>
            <div style={{ width: '100%', height: 220 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Tooltip />
                  <Pie
                    data={callOutcomePie}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={50}
                    outerRadius={85}
                    label={(e: any) => `${e.name}: ${e.value}`}
                  >
                    {callOutcomePie.map((c, i) => (
                      <Cell key={i} fill={c.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Operator KPI jadval */}
        <div className="mt-5">
          <div className="text-xs text-slate-500 dark:text-slate-400 mb-2 font-semibold">Operatorlar bo'yicha</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[560px]">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-slate-500 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                  <th className="py-2 font-semibold">#</th>
                  <th className="py-2 font-semibold">Operator</th>
                  <th className="py-2 text-right font-semibold">Jami</th>
                  <th className="py-2 text-right font-semibold">Bog'landi</th>
                  <th className="py-2 text-right font-semibold">Muvaffaqiyat %</th>
                  <th className="py-2 text-right font-semibold">O'rt. gaplashish</th>
                </tr>
              </thead>
              <tbody>
                {callsByOperator.map((o, i) => (
                  <tr key={o.name} className="border-b border-slate-100 dark:border-slate-800">
                    <td className="py-2 text-slate-500">{i + 1}</td>
                    <td className="py-2 font-medium text-slate-800 dark:text-slate-100">{o.name}</td>
                    <td className="py-2 text-right">{o.total}</td>
                    <td className="py-2 text-right text-emerald-600 dark:text-emerald-400 font-semibold">{o.answered}</td>
                    <td className="py-2 text-right">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                        o.successRate >= 70 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' :
                        o.successRate >= 50 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' :
                        'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300'
                      }`}>
                        {o.successRate}%
                      </span>
                    </td>
                    <td className="py-2 text-right text-sky-600 dark:text-sky-400 font-mono">
                      {Math.floor(o.avgTalk / 60)}:{(o.avgTalk % 60).toString().padStart(2, '0')}
                    </td>
                  </tr>
                ))}
                {callsByOperator.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      Oxirgi 30 kunda qo'ng'iroqlar yo'q
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </motion.div>

      {/* ====== YUK ADASHISHI BO'YICHA KUNLIK ====== */}
      {(() => {
        const misrouteTickets = tickets.filter((t) => t.misroute || (categories.find((c) => c.id === t.categoryId)?.id === 'cat-misroute'));
        const last7Days = (() => {
          const arr: { day: string; count: number }[] = [];
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          for (let i = 6; i >= 0; i--) {
            const d = new Date(today.getTime() - i * DAY);
            const start = d.getTime();
            const end = start + DAY;
            arr.push({
              day: `${d.getDate()}.${d.getMonth() + 1}`,
              count: misrouteTickets.filter((t) => t.createdAt >= start && t.createdAt < end).length,
            });
          }
          return arr;
        })();
        const totalLast7 = last7Days.reduce((s, d) => s + d.count, 0);
        return (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="card p-5 mt-4"
          >
            <h3 className="font-bold mb-3 flex items-center gap-2 text-slate-800 dark:text-slate-100">
              📦 Yuk adashishi (oxirgi 7 kun)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
              <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-900/30">
                <div className="text-xs text-rose-700 dark:text-rose-300 mb-1">Jami adashish (7 kun)</div>
                <div className="text-2xl font-bold text-rose-700 dark:text-rose-300">{totalLast7}</div>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60">
                <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">O'rtacha kunlik</div>
                <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{Math.round(totalLast7 / 7)}</div>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60">
                <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Hal etilgan</div>
                <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                  {misrouteTickets.filter((t) => t.status === 'resolved').length}
                </div>
              </div>
            </div>
            <div style={{ width: '100%', height: 180 }}>
              <ResponsiveContainer>
                <BarChart data={last7Days}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#e11d48" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        );
      })()}
    </div>
  );
}

function KPI({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string | number;
  icon: typeof Star;
  tone: 'emerald' | 'amber' | 'brand' | 'slate';
}) {
  const tones: Record<string, string> = {
    emerald: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
    amber: 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
    brand: 'bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300',
    slate: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200',
  };
  return (
    <div className="card p-4 flex items-center gap-3">
      <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${tones[tone]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-300 font-semibold">
          {label}
        </div>
        <div className="text-xl font-bold text-slate-800 dark:text-slate-100">{value}</div>
      </div>
    </div>
  );
}
