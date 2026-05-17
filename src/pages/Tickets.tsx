import { useMemo, useState } from 'react';
import { Plus, Search, Download } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import TicketModal from '../components/TicketModal';
import { useApp } from '../context/AppContext';
import type { Ticket, TicketStatus } from '../types';
import { formatDateTime } from '../utils/format';

function exportCSV(rows: Ticket[], stages: any[], categories: any[], users: any[]) {
  const headers = ['Trek', 'Mijoz', 'Telefon', 'Kanal', 'Tur', 'Bosqich', 'Status', 'Muhimlik', 'Operator', 'Yaratilgan', 'Yangilangan', 'Hal etilgan'];
  const lines = [headers.join(';')];
  rows.forEach((t) => {
    const stage = stages.find((s) => s.id === t.stageId)?.name ?? '';
    const cat = categories.find((c) => c.id === t.categoryId)?.name ?? '';
    const assignee = users.find((u) => u.id === t.assigneeId);
    const f = (v: string | number | undefined) =>
      `"${String(v ?? '').replace(/"/g, '""')}"`;
    lines.push([
      f(t.trackingNumber),
      f(t.customerName),
      f(t.customerPhone),
      f(t.channel),
      f(cat),
      f(stage),
      f(t.status),
      f(t.priority),
      f(assignee?.fullName ?? assignee?.username),
      f(formatDateTime(t.createdAt)),
      f(formatDateTime(t.updatedAt)),
      f(t.resolvedAt ? formatDateTime(t.resolvedAt) : ''),
    ].join(';'));
  });
  const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `soneee-tickets-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Tickets() {
  const { tickets, stages, users, categories, currentUser } = useApp();
  const [q, setQ] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'all'>('all');
  const [editing, setEditing] = useState<Ticket | null>(null);
  const [creating, setCreating] = useState(false);

  const data = useMemo(() => {
    const scope = currentUser?.role === 'admin'
      ? tickets
      : tickets.filter(
          (t) => t.assigneeId === currentUser?.id || (t.createdBy === currentUser?.id && !t.assigneeId)
        );
    return scope
      .filter((t) => stageFilter === 'all' || t.stageId === stageFilter)
      .filter((t) => categoryFilter === 'all' || t.categoryId === categoryFilter)
      .filter((t) => statusFilter === 'all' || t.status === statusFilter)
      .filter((t) => {
        if (!q.trim()) return true;
        const s = q.toLowerCase();
        return (
          t.customerName.toLowerCase().includes(s) ||
          t.customerPhone.includes(s) ||
          t.trackingNumber.toLowerCase().includes(s)
        );
      })
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }, [tickets, currentUser, stageFilter, categoryFilter, statusFilter, q]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Murojaatlar"
        subtitle="Barcha ticketlar ro'yxati"
        actions={
          <>
            <button onClick={() => exportCSV(data, stages, categories, users)} className="btn-ghost">
              <Download className="h-4 w-4" /> CSV eksport ({data.length})
            </button>
            <button className="btn-primary" onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" /> Yangi
            </button>
          </>
        }
      />

      <div className="card p-3 mb-4 flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            className="input pl-9"
            placeholder="Ism, telefon yoki trek raqami..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <select className="input w-auto" value={stageFilter} onChange={(e) => setStageFilter(e.target.value)}>
          <option value="all">Barcha bosqichlar</option>
          {stages.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <select className="input w-auto" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="all">Barcha turlar</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.icon ?? ''} {c.name}
            </option>
          ))}
        </select>
        <select className="input w-auto" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as 'all' | TicketStatus)}>
          <option value="all">Barcha statuslar</option>
          <option value="pending">Kutilmoqda</option>
          <option value="resolved">Hal etildi</option>
        </select>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200">
              <th className="px-4 py-3">Trek №</th>
              <th className="px-4 py-3">Mijoz</th>
              <th className="px-4 py-3">Telefon</th>
              <th className="px-4 py-3">Murojaat turi</th>
              <th className="px-4 py-3">Bosqich</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Operator</th>
              <th className="px-4 py-3">Yangilangan</th>
            </tr>
          </thead>
          <tbody>
            {data.map((t) => {
              const stage = stages.find((s) => s.id === t.stageId);
              const category = categories.find((c) => c.id === t.categoryId);
              const assignee = users.find((u) => u.id === t.assigneeId);
              return (
                <tr
                  key={t.id}
                  onClick={() => setEditing(t)}
                  className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer"
                >
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{t.trackingNumber}</td>
                  <td className="px-4 py-3 font-semibold text-slate-800">{t.customerName}</td>
                  <td className="px-4 py-3 text-slate-600">{t.customerPhone}</td>
                  <td className="px-4 py-3">
                    {category ? (
                      <span
                        className="badge"
                        style={{ background: `${category.color}1a`, color: category.color }}
                      >
                        {category.icon ?? ''} {category.name}
                      </span>
                    ) : (
                      <span className="text-slate-400 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="badge"
                      style={{ background: `${stage?.color}1a`, color: stage?.color }}
                    >
                      {stage?.name ?? '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`badge ${
                        t.status === 'resolved'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {t.status === 'resolved' ? 'Hal etildi' : 'Kutilmoqda'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {assignee?.fullName ?? assignee?.username ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{formatDateTime(t.updatedAt)}</td>
                </tr>
              );
            })}
            {data.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-slate-400">
                  Murojaatlar topilmadi
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <TicketModal open={creating} onClose={() => setCreating(false)} />
      <TicketModal open={!!editing} onClose={() => setEditing(null)} ticket={editing} />
    </div>
  );
}
