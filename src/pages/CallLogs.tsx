import { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import PageHeader from '../components/PageHeader';
import { Phone, PhoneIncoming, PhoneOutgoing, Download, Search, Filter, Trash2, Clock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { formatDateTime } from '../utils/format';
import type { CallOutcome } from '../types';
import toast from 'react-hot-toast';

const OUTCOME_CONFIG: Record<CallOutcome, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  pending: { label: 'Yakunlanmadi', color: 'text-amber-700 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-300', icon: Clock },
  answered: { label: "Bog'landi", color: 'text-emerald-700 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300', icon: CheckCircle2 },
  no_answer: { label: 'Javob yo\'q', color: 'text-slate-700 bg-slate-100 dark:bg-slate-800 dark:text-slate-300', icon: XCircle },
  busy: { label: 'Band', color: 'text-orange-700 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-300', icon: AlertCircle },
  failed: { label: 'Bekor', color: 'text-rose-700 bg-rose-100 dark:bg-rose-900/30 dark:text-rose-300', icon: XCircle },
};

function formatSec(sec?: number) {
  if (!sec || sec < 0) return '—';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function CallLogs() {
  const { callLogs, currentUser, users, deleteCallLog } = useApp();
  const [query, setQuery] = useState('');
  const [outcomeFilter, setOutcomeFilter] = useState<'all' | CallOutcome>('all');
  const [operatorFilter, setOperatorFilter] = useState<'all' | string>(
    currentUser?.role === 'admin' ? 'all' : (currentUser?.id ?? 'all')
  );
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'all'>('all');

  const isAdmin = currentUser?.role === 'admin';

  const filtered = useMemo(() => {
    let list = [...callLogs];
    if (!isAdmin && currentUser) {
      list = list.filter((c) => c.operatorId === currentUser.id);
    } else if (operatorFilter !== 'all') {
      list = list.filter((c) => c.operatorId === operatorFilter);
    }
    if (outcomeFilter !== 'all') {
      list = list.filter((c) => c.outcome === outcomeFilter);
    }
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (c) =>
          c.number.includes(q) ||
          c.customerName?.toLowerCase().includes(q) ||
          c.trackingNumber?.toLowerCase().includes(q)
      );
    }
    if (dateFilter !== 'all') {
      const now = Date.now();
      const day = 86_400_000;
      const cutoff =
        dateFilter === 'today' ? now - day : dateFilter === 'week' ? now - 7 * day : now - 30 * day;
      list = list.filter((c) => c.startedAt >= cutoff);
    }
    return list.sort((a, b) => b.startedAt - a.startedAt);
  }, [callLogs, isAdmin, currentUser, operatorFilter, outcomeFilter, query, dateFilter]);

  // Statistika
  const stats = useMemo(() => {
    const total = filtered.length;
    const answered = filtered.filter((c) => c.outcome === 'answered').length;
    const noAnswer = filtered.filter((c) => c.outcome === 'no_answer').length;
    const totalTalk = filtered.reduce((sum, c) => sum + (c.talkSec || 0), 0);
    const avgTalk = answered > 0 ? Math.round(totalTalk / answered) : 0;
    return { total, answered, noAnswer, totalTalk, avgTalk };
  }, [filtered]);

  function exportCSV() {
    if (filtered.length === 0) {
      toast.error('Eksport qilish uchun ma\'lumot yo\'q');
      return;
    }
    const headers = ['Sana', 'Operator', 'Raqam', 'Mijoz', 'Trek', 'Yo\'nalish', 'Natija', 'Davomiyligi', 'Gaplashish'];
    const rows = filtered.map((c) => [
      formatDateTime(c.startedAt),
      c.operatorName ?? '',
      c.number,
      c.customerName ?? '',
      c.trackingNumber ?? '',
      c.direction === 'outbound' ? 'Chiquvchi' : 'Kiruvchi',
      OUTCOME_CONFIG[c.outcome].label,
      formatSec(c.durationSec),
      formatSec(c.talkSec),
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `qongiroqlar-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${filtered.length} ta yozuv eksport qilindi`);
  }

  function handleDelete(id: string) {
    if (!confirm("Ushbu qo'ng'iroq yozuvini o'chirilsinmi?")) return;
    deleteCallLog(id);
    toast.success("O'chirildi");
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Qo'ng'iroqlar tarixi"
        subtitle="Operatorlarning qilgan qo'ng'iroqlari, davomiyligi, natijasi"
        actions={
          <button className="btn-primary" onClick={exportCSV}>
            <Download className="h-4 w-4" /> CSV eksport
          </button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <div className="card p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Jami qo'ng'iroqlar</div>
          <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{stats.total}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Bog'landi</div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.answered}</div>
          {stats.total > 0 && (
            <div className="text-[11px] text-slate-400 mt-0.5">
              {Math.round((stats.answered / stats.total) * 100)}% muvaffaqiyat
            </div>
          )}
        </div>
        <div className="card p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Javob yo'q</div>
          <div className="text-2xl font-bold text-slate-600 dark:text-slate-300">{stats.noAnswer}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">O'rtacha gaplashish</div>
          <div className="text-2xl font-bold text-sky-600 dark:text-sky-400">{formatSec(stats.avgTalk)}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              className="input pl-10"
              placeholder="Raqam, ism yoki trek..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <select
            className="input"
            value={outcomeFilter}
            onChange={(e) => setOutcomeFilter(e.target.value as any)}
          >
            <option value="all">Barcha natijalar</option>
            <option value="answered">Bog'landi</option>
            <option value="no_answer">Javob yo'q</option>
            <option value="busy">Band</option>
            <option value="failed">Bekor</option>
            <option value="pending">Yakunlanmadi</option>
          </select>
          {isAdmin && (
            <select
              className="input"
              value={operatorFilter}
              onChange={(e) => setOperatorFilter(e.target.value)}
            >
              <option value="all">Barcha operatorlar</option>
              {users.filter((u) => u.role === 'operator' || u.role === 'admin').map((u) => (
                <option key={u.id} value={u.id}>
                  {u.fullName ?? u.username}
                </option>
              ))}
            </select>
          )}
          <select
            className="input"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as any)}
          >
            <option value="all">Barcha vaqt</option>
            <option value="today">Bugun</option>
            <option value="week">Hafta</option>
            <option value="month">Oy</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm min-w-[800px]">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
              <th className="px-3 py-3 font-semibold">Sana / vaqt</th>
              <th className="px-3 py-3 font-semibold">Operator</th>
              <th className="px-3 py-3 font-semibold">Raqam</th>
              <th className="px-3 py-3 font-semibold">Mijoz / Trek</th>
              <th className="px-3 py-3 font-semibold">Natija</th>
              <th className="px-3 py-3 font-semibold text-right">Davomiyligi</th>
              <th className="px-3 py-3 font-semibold text-right">Gaplashish</th>
              <th className="px-3 py-3 font-semibold"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => {
              const cfg = OUTCOME_CONFIG[c.outcome];
              const Icon = cfg.icon;
              return (
                <tr key={c.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30">
                  <td className="px-3 py-2.5 text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
                    {formatDateTime(c.startedAt)}
                  </td>
                  <td className="px-3 py-2.5 font-medium text-slate-700 dark:text-slate-200">
                    {c.operatorName ?? '—'}
                  </td>
                  <td className="px-3 py-2.5 font-mono">
                    <div className="flex items-center gap-1.5">
                      {c.direction === 'inbound' ? (
                        <PhoneIncoming className="h-3.5 w-3.5 text-emerald-500" />
                      ) : (
                        <PhoneOutgoing className="h-3.5 w-3.5 text-sky-500" />
                      )}
                      {c.number}
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="text-slate-700 dark:text-slate-200">{c.customerName ?? '—'}</div>
                    {c.trackingNumber && (
                      <div className="text-[11px] text-slate-400 font-mono">{c.trackingNumber}</div>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${cfg.color}`}>
                      <Icon className="h-3 w-3" /> {cfg.label}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-slate-600 dark:text-slate-300">
                    {formatSec(c.durationSec)}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                    {formatSec(c.talkSec)}
                  </td>
                  <td className="px-3 py-2.5">
                    {isAdmin && (
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="p-1.5 rounded hover:bg-rose-50 dark:hover:bg-rose-900/20 text-rose-600"
                        title="O'chirish"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <Phone className="h-8 w-8 text-slate-300 dark:text-slate-600" />
                    <div className="text-slate-600 dark:text-slate-300 font-semibold text-sm">
                      Qo'ng'iroqlar topilmadi
                    </div>
                    <div className="text-slate-400 text-xs max-w-sm">
                      {query || outcomeFilter !== 'all' || dateFilter !== 'all'
                        ? 'Filtrlarni qayta ko\'rib chiqing yoki tozalang.'
                        : 'Telefon bubble orqali qo\'ng\'iroq qiling — yozuvlar avtomatik bu yerga keladi.'}
                    </div>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-[11px] text-slate-400 mt-3 text-center flex items-center justify-center gap-1">
        <Filter className="h-3 w-3" /> Qo'ng'iroq qilingach, Softphone'da "Bog'landi/Javob yo'q" tanlanishi yozuv yaratadi.
        Tugatilmagan qo'ng'iroqlar "Yakunlanmadi" deb belgilanadi.
      </p>
    </div>
  );
}
