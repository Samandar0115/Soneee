import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Plus,
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  AlertTriangle,
  Calendar,
  X,
  CheckSquare,
  Square,
  Paperclip,
  Trash2,
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import TicketModal from '../components/TicketModal';
import CopyButton from '../components/CopyButton';
import { useApp } from '../context/AppContext';
import type { Stage, Ticket, TicketStatus, User, Category } from '../types';
import { formatDateTime, timeAgo } from '../utils/format';
import toast from 'react-hot-toast';

type DateRange = 'today' | 'week' | 'month' | 'all' | 'custom';
type QuickFilter = 'all' | 'mine' | 'unassigned' | 'overdue' | 'today' | 'stale';
type SortKey = 'updated' | 'created' | 'priority';

const PRIORITY_ORDER: Record<string, number> = { urgent: 4, high: 3, normal: 2, low: 1 };

function exportCSV(rows: Ticket[], stages: Stage[], categories: Category[], users: User[]) {
  const headers = ['Trek', 'Mijoz', 'Telefon', 'Kanal', 'Tur', 'Bosqich', 'Status', 'Muhimlik', 'Operator', 'Yaratilgan', 'Yangilangan', 'Hal etilgan'];
  const lines = [headers.join(';')];
  rows.forEach((t) => {
    const stage = stages.find((s) => s.id === t.stageId)?.name ?? '';
    const cat = categories.find((c) => c.id === t.categoryId)?.name ?? '';
    const assignee = users.find((u) => u.id === t.assigneeId);
    const f = (v: string | number | undefined) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    lines.push([
      f(t.trackingNumber), f(t.customerName), f(t.customerPhone), f(t.channel),
      f(cat), f(stage), f(t.status), f(t.priority),
      f(assignee?.fullName ?? assignee?.username),
      f(formatDateTime(t.createdAt)), f(formatDateTime(t.updatedAt)),
      f(t.resolvedAt ? formatDateTime(t.resolvedAt) : ''),
    ].join(';'));
  });
  const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ipost-tickets-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Tickets() {
  const { tickets, stages, users, categories, currentUser, moveTicket, updateTicket, deleteTicket } = useApp();

  const [searchParams, setSearchParams] = useSearchParams();
  const isAdminInit = useApp().currentUser?.role === 'admin';
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'all'>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange>('all');
  const [quick, setQuick] = useState<QuickFilter>(isAdminInit ? 'all' : 'mine');
  const [sortBy, setSortBy] = useState<SortKey>('updated');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<Ticket | null>(null);
  const [creating, setCreating] = useState(false);

  // URL paramlarni o'qish (klaviatura yorliqlaridan keladi)
  useEffect(() => {
    const newParam = searchParams.get('new');
    const quickParam = searchParams.get('quick');
    if (newParam === '1') {
      setCreating(true);
      searchParams.delete('new');
      setSearchParams(searchParams, { replace: true });
    }
    if (quickParam === 'mine' || quickParam === 'overdue' || quickParam === 'today' || quickParam === 'stale' || quickParam === 'unassigned') {
      setQuick(quickParam as QuickFilter);
      searchParams.delete('quick');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim().toLowerCase()), 200);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    setPage(0);
    setSelected(new Set());
  }, [debouncedQ, stageFilter, categoryFilter, statusFilter, assigneeFilter, priorityFilter, dateRange, quick]);

  const isAdmin = currentUser?.role === 'admin';

  const scope = useMemo(() => {
    if (isAdmin) return tickets;
    return tickets.filter(
      (t) => t.assigneeId === currentUser?.id || (t.createdBy === currentUser?.id && !t.assigneeId)
    );
  }, [tickets, currentUser, isAdmin]);

  const now = Date.now();
  const DAY = 86_400_000;
  const STALE_DAYS = 5;

  const filtered = useMemo(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const dayStart = startOfToday.getTime();

    return scope
      .filter((t) => {
        if (quick === 'mine') return t.assigneeId === currentUser?.id;
        if (quick === 'unassigned') return !t.assigneeId;
        if (quick === 'overdue')
          return t.status === 'pending' && t.slaDueAt && t.slaDueAt < now;
        if (quick === 'today') return t.createdAt >= dayStart;
        if (quick === 'stale')
          return t.status === 'pending' && now - t.updatedAt > STALE_DAYS * DAY;
        return true;
      })
      .filter((t) => {
        if (dateRange === 'all') return true;
        const cutoff =
          dateRange === 'today' ? dayStart :
          dateRange === 'week' ? now - 7 * DAY :
          dateRange === 'month' ? now - 30 * DAY : 0;
        return t.createdAt >= cutoff;
      })
      .filter((t) => stageFilter === 'all' || t.stageId === stageFilter)
      .filter((t) => categoryFilter === 'all' || t.categoryId === categoryFilter)
      .filter((t) => statusFilter === 'all' || t.status === statusFilter)
      .filter((t) => assigneeFilter === 'all'
        ? true
        : assigneeFilter === 'none'
          ? !t.assigneeId
          : t.assigneeId === assigneeFilter)
      .filter((t) => priorityFilter === 'all' || t.priority === priorityFilter)
      .filter((t) => {
        if (!debouncedQ) return true;
        const s = debouncedQ;
        const inDetails = Object.values(t.details ?? {}).some((v) => v?.toLowerCase().includes(s));
        const inNotes = [
          ...(t.internalNotes ?? []),
          ...(t.publicComments ?? []),
        ].some((n) => n.text.toLowerCase().includes(s));
        return (
          t.customerName.toLowerCase().includes(s) ||
          t.customerPhone.replace(/\D/g, '').includes(s.replace(/\D/g, '')) ||
          t.trackingNumber.toLowerCase().includes(s) ||
          inDetails ||
          inNotes
        );
      })
      .sort((a, b) => {
        const dir = sortDir === 'asc' ? 1 : -1;
        if (sortBy === 'priority') {
          return ((PRIORITY_ORDER[a.priority ?? 'normal'] - PRIORITY_ORDER[b.priority ?? 'normal']) * dir);
        }
        const av = sortBy === 'created' ? a.createdAt : a.updatedAt;
        const bv = sortBy === 'created' ? b.createdAt : b.updatedAt;
        return (av - bv) * dir;
      });
  }, [scope, quick, dateRange, stageFilter, categoryFilter, statusFilter, assigneeFilter, priorityFilter, debouncedQ, sortBy, sortDir, currentUser, now]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageData = useMemo(
    () => filtered.slice(page * pageSize, page * pageSize + pageSize),
    [filtered, page, pageSize]
  );

  const stats = useMemo(() => {
    const overdue = scope.filter((t) => t.status === 'pending' && t.slaDueAt && t.slaDueAt < now).length;
    const stale = scope.filter((t) => t.status === 'pending' && now - t.updatedAt > STALE_DAYS * DAY).length;
    const unassigned = scope.filter((t) => !t.assigneeId && t.status === 'pending').length;
    const mine = scope.filter((t) => t.assigneeId === currentUser?.id && t.status === 'pending').length;
    const today = scope.filter((t) => {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      return t.createdAt >= d.getTime();
    }).length;
    return { overdue, stale, unassigned, mine, today };
  }, [scope, currentUser, now]);

  function toggleSort(key: SortKey) {
    if (sortBy === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else {
      setSortBy(key);
      setSortDir('desc');
    }
  }

  function toggleSelect(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  function selectAllOnPage() {
    if (pageData.every((t) => selected.has(t.id))) {
      const next = new Set(selected);
      pageData.forEach((t) => next.delete(t.id));
      setSelected(next);
    } else {
      const next = new Set(selected);
      pageData.forEach((t) => next.add(t.id));
      setSelected(next);
    }
  }

  async function bulkAssign(userId: string) {
    if (!selected.size) return;
    for (const id of selected) {
      const t = scope.find((x) => x.id === id);
      if (!t) continue;
      const user = users.find((u) => u.id === userId);
      await updateTicket(
        id,
        { assigneeId: userId },
        `Operator → ${user?.fullName ?? user?.username ?? '—'}`
      );
    }
    toast.success(`${selected.size} ta murojaat biriktirildi`);
    setSelected(new Set());
  }

  async function bulkMoveStage(stageId: string) {
    if (!selected.size) return;
    for (const id of selected) {
      await moveTicket(id, stageId);
    }
    toast.success(`${selected.size} ta murojaat ko'chirildi`);
    setSelected(new Set());
  }

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <PageHeader
        title="Murojaatlar"
        subtitle={`${filtered.length} ta natija (jami ${scope.length} ta)`}
        actions={
          <>
            <button onClick={() => exportCSV(filtered, stages, categories, users)} className="btn-ghost">
              <Download className="h-4 w-4" /> CSV ({filtered.length})
            </button>
            <button className="btn-primary" onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" /> Yangi
            </button>
          </>
        }
      />

      {/* Quick stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-4">
        <QuickStat label="Mening" value={stats.mine} active={quick === 'mine'} onClick={() => setQuick(quick === 'mine' ? 'all' : 'mine')} tone="brand" />
        <QuickStat label="Bugun" value={stats.today} active={quick === 'today'} onClick={() => setQuick(quick === 'today' ? 'all' : 'today')} tone="slate" />
        <QuickStat label="Kechikkan" value={stats.overdue} active={quick === 'overdue'} onClick={() => setQuick(quick === 'overdue' ? 'all' : 'overdue')} tone="rose" />
        <QuickStat label="Eskirgan" value={stats.stale} active={quick === 'stale'} onClick={() => setQuick(quick === 'stale' ? 'all' : 'stale')} tone="amber" hint={`>${STALE_DAYS} kun`} />
        <QuickStat label="Biriktirilmagan" value={stats.unassigned} active={quick === 'unassigned'} onClick={() => setQuick(quick === 'unassigned' ? 'all' : 'unassigned')} tone="slate" />
      </div>

      {/* Filter panel */}
      <div className="card p-3 mb-4 space-y-2">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              className="input pl-9"
              placeholder="Trek, ism, telefon, izoh yoki tafsilot bo'yicha qidirish..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            {q && (
              <button onClick={() => setQ('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="flex bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
            {(['today', 'week', 'month', 'all'] as DateRange[]).map((r) => (
              <button
                key={r}
                onClick={() => setDateRange(r)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                  dateRange === r ? 'bg-white dark:bg-slate-900 shadow-soft text-brand-700' : 'text-slate-600'
                }`}
              >
                {r === 'today' ? 'Bugun' : r === 'week' ? '7 kun' : r === 'month' ? '30 kun' : 'Hammasi'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <select className="input w-auto text-sm" value={stageFilter} onChange={(e) => setStageFilter(e.target.value)}>
            <option value="all">Barcha bosqichlar</option>
            {stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select className="input w-auto text-sm" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="all">Barcha turlar</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.icon ?? ''} {c.name}</option>)}
          </select>
          <select className="input w-auto text-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as TicketStatus | 'all')}>
            <option value="all">Barcha statuslar</option>
            <option value="pending">Kutilmoqda</option>
            <option value="resolved">Hal etildi</option>
          </select>
          <select className="input w-auto text-sm" value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
            <option value="all">Barcha muhimliklar</option>
            <option value="urgent">Shoshilinch</option>
            <option value="high">Yuqori</option>
            <option value="normal">Oddiy</option>
            <option value="low">Past</option>
          </select>
          {isAdmin && (
            <select className="input w-auto text-sm" value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value)}>
              <option value="all">Barcha operatorlar</option>
              <option value="none">Biriktirilmagan</option>
              {users.filter((u) => u.role === 'operator').map((u) => (
                <option key={u.id} value={u.id}>{u.fullName ?? u.username}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="card p-3 mb-3 flex items-center gap-3 flex-wrap bg-brand-50 dark:bg-brand-900/20 border-brand-200">
          <span className="text-sm font-semibold text-brand-800 dark:text-brand-300">
            {selected.size} ta tanlangan
          </span>
          <select
            className="input w-auto text-sm"
            onChange={(e) => {
              if (e.target.value) {
                bulkAssign(e.target.value);
                e.target.value = '';
              }
            }}
            defaultValue=""
          >
            <option value="" disabled>→ Operatorga biriktirish</option>
            {users.filter((u) => u.role === 'operator').map((u) => (
              <option key={u.id} value={u.id}>{u.fullName ?? u.username}</option>
            ))}
          </select>
          <select
            className="input w-auto text-sm"
            onChange={(e) => {
              if (e.target.value) {
                bulkMoveStage(e.target.value);
                e.target.value = '';
              }
            }}
            defaultValue=""
          >
            <option value="" disabled>→ Bosqichga ko'chirish</option>
            {stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <button onClick={() => setSelected(new Set())} className="btn-ghost text-xs ml-auto">
            <X className="h-3.5 w-3.5" /> Tanlovni bekor qilish
          </button>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200 dark:border-slate-700">
              <th className="px-3 py-3 w-8">
                <button onClick={selectAllOnPage} className="text-slate-400 hover:text-brand-600">
                  {pageData.every((t) => selected.has(t.id)) && pageData.length > 0
                    ? <CheckSquare className="h-4 w-4" />
                    : <Square className="h-4 w-4" />}
                </button>
              </th>
              <th className="px-3 py-3">Trek №</th>
              <th className="px-3 py-3">Mijoz</th>
              <th className="px-3 py-3">Telefon</th>
              <th className="px-3 py-3">Murojaat turi</th>
              <th className="px-3 py-3">Bosqich</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3 cursor-pointer" onClick={() => toggleSort('priority')}>
                <span className="inline-flex items-center gap-1">Muhim <ArrowUpDown className="h-3 w-3" /></span>
              </th>
              <th className="px-3 py-3">Operator</th>
              <th className="px-3 py-3 cursor-pointer" onClick={() => toggleSort('updated')}>
                <span className="inline-flex items-center gap-1">Yangilangan <ArrowUpDown className="h-3 w-3" /></span>
              </th>
              {isAdmin && <th className="px-3 py-3 w-12"></th>}
            </tr>
          </thead>
          <tbody>
            {pageData.map((t) => {
              const stage = stages.find((s) => s.id === t.stageId);
              const category = categories.find((c) => c.id === t.categoryId);
              const assignee = users.find((u) => u.id === t.assigneeId);
              const overdue = t.status === 'pending' && t.slaDueAt && t.slaDueAt < now;
              const stale = t.status === 'pending' && now - t.updatedAt > STALE_DAYS * DAY;
              const sel = selected.has(t.id);
              return (
                <tr
                  key={t.id}
                  className={`border-b border-slate-100 dark:border-slate-800/60 cursor-pointer transition-colors ${
                    sel ? 'bg-brand-50 dark:bg-brand-900/20' : ''
                  }`}
                >
                  <td className="px-3 py-2.5" onClick={(e) => { e.stopPropagation(); toggleSelect(t.id); }}>
                    {sel ? <CheckSquare className="h-4 w-4 text-brand-600" /> : <Square className="h-4 w-4 text-slate-300" />}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <span onClick={() => setEditing(t)} className="cursor-pointer">{t.trackingNumber}</span>
                      <CopyButton value={t.trackingNumber} label="Trek" />
                      {(t.attachments ?? []).length > 0 && (
                        <Paperclip className="h-3 w-3 text-slate-400" />
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 font-semibold text-slate-800 dark:text-slate-200" onClick={() => setEditing(t)}>{t.customerName}</td>
                  <td className="px-3 py-2.5 text-slate-600 dark:text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <span onClick={() => setEditing(t)} className="cursor-pointer">{t.customerPhone}</span>
                      <CopyButton value={t.customerPhone} label="Telefon" />
                    </div>
                  </td>
                  <td className="px-3 py-2.5" onClick={() => setEditing(t)}>
                    {category ? (
                      <span className="badge" style={{ background: `${category.color}1a`, color: category.color }}>
                        {category.icon ?? ''} {category.name}
                      </span>
                    ) : <span className="text-slate-400 text-xs">—</span>}
                  </td>
                  <td className="px-3 py-2.5" onClick={() => setEditing(t)}>
                    <span className="badge" style={{ background: `${stage?.color}1a`, color: stage?.color }}>
                      {stage?.name ?? '—'}
                    </span>
                  </td>
                  <td className="px-3 py-2.5" onClick={() => setEditing(t)}>
                    <div className="flex items-center gap-1">
                      <span className={`badge ${t.status === 'resolved' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        {t.status === 'resolved' ? 'Hal' : 'Kutmoq'}
                      </span>
                      {overdue && (
                        <span title="SLA kechikkan" className="badge bg-rose-100 text-rose-700">
                          <AlertTriangle className="h-3 w-3" />
                        </span>
                      )}
                      {stale && !overdue && (
                        <span title={`${STALE_DAYS} kundan beri yangilanmagan`} className="badge bg-amber-100 text-amber-700">
                          <Calendar className="h-3 w-3" />
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2.5" onClick={() => setEditing(t)}>
                    <PriorityChip p={t.priority} />
                  </td>
                  <td className="px-3 py-2.5 text-slate-600 dark:text-slate-400 text-xs" onClick={() => setEditing(t)}>
                    {assignee?.fullName ?? assignee?.username ?? <span className="text-rose-500">—</span>}
                  </td>
                  <td className="px-3 py-2.5 text-slate-500 text-xs" onClick={() => setEditing(t)}>{timeAgo(t.updatedAt)}</td>
                  {isAdmin && (
                    <td className="px-3 py-2.5">
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (!confirm(`${t.trackingNumber} o'chirilsinmi?`)) return;
                          try {
                            await deleteTicket(t.id);
                            toast.success("O'chirildi — Korzinada saqlandi");
                          } catch (err) {
                            toast.error('Xato: ' + (err as Error).message);
                          }
                        }}
                        className="p-1.5 rounded hover:bg-rose-50 dark:hover:bg-rose-900/20 text-rose-600"
                        title="O'chirish (Korzinaga)"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
            {pageData.length === 0 && (
              <tr>
                <td colSpan={isAdmin ? 11 : 10} className="px-4 py-12 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="text-3xl opacity-40">📭</div>
                    <div className="text-slate-600 dark:text-slate-300 font-semibold text-sm">
                      Murojaatlar topilmadi
                    </div>
                    <div className="text-slate-400 dark:text-slate-500 text-xs max-w-sm">
                      Yangi murojaat yaratish uchun yuqoridagi <b>"Yangi"</b> tugmasini bosing yoki
                      qidiruv/filtrlarni qayta ko'rib chiqing.
                    </div>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-700 text-sm">
          <div className="flex items-center gap-3 text-slate-600 dark:text-slate-400">
            <span>
              {filtered.length === 0 ? 0 : page * pageSize + 1}
              –{Math.min((page + 1) * pageSize, filtered.length)} / {filtered.length}
            </span>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(0); }}
              className="input w-auto py-1 text-xs"
            >
              <option value={25}>25 / sahifa</option>
              <option value={50}>50 / sahifa</option>
              <option value={100}>100 / sahifa</option>
              <option value={250}>250 / sahifa</option>
            </select>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="btn-ghost text-xs disabled:opacity-30"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span className="text-xs text-slate-500 px-2">
              {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
              disabled={page >= totalPages - 1}
              className="btn-ghost text-xs disabled:opacity-30"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      <TicketModal open={creating} onClose={() => setCreating(false)} />
      <TicketModal open={!!editing} onClose={() => setEditing(null)} ticket={editing} />
    </div>
  );
}

function PriorityChip({ p }: { p?: Ticket['priority'] }) {
  const map: Record<string, { c: string; l: string }> = {
    low: { c: 'bg-slate-100 text-slate-600', l: 'Past' },
    normal: { c: 'bg-brand-50 text-brand-700', l: 'Norm' },
    high: { c: 'bg-amber-100 text-amber-700', l: 'Yuq.' },
    urgent: { c: 'bg-rose-100 text-rose-700', l: 'Sho.' },
  };
  const k = p ?? 'normal';
  return <span className={`badge ${map[k].c}`}>{map[k].l}</span>;
}

function QuickStat({
  label,
  value,
  active,
  onClick,
  tone,
  hint,
}: {
  label: string;
  value: number;
  active: boolean;
  onClick: () => void;
  tone: 'brand' | 'rose' | 'amber' | 'slate';
  hint?: string;
}) {
  const tones: Record<string, string> = {
    brand: 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 text-brand-800 dark:text-brand-300',
    rose: 'border-rose-500 bg-rose-50 dark:bg-rose-900/20 text-rose-800 dark:text-rose-300',
    amber: 'border-amber-500 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300',
    slate: 'border-slate-300 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200',
  };
  return (
    <button
      onClick={onClick}
      className={`card p-3 text-left transition border-2 ${
        active ? tones[tone] : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-800'
      }`}
    >
      <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">{label}</div>
      <div className="text-2xl font-bold mt-0.5">{value}</div>
      {hint && <div className="text-[10px] text-slate-400">{hint}</div>}
    </button>
  );
}
