import { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import PageHeader from '../components/PageHeader';
import {
  Warehouse, Search, CheckCircle2, Clock, PackageCheck, Filter, Download,
  User as UserIcon, Phone as PhoneIcon, Calendar, AlertCircle, RotateCcw,
} from 'lucide-react';
import { formatDateTime, timeAgo } from '../utils/format';
import type { Ticket, WarehouseTrack } from '../types';
import { dialNumber } from '../components/Softphone';
import toast from 'react-hot-toast';

type Row = WarehouseTrack & {
  ticket: Ticket;
};

type Tab = 'paid' | 'unpaid' | 'released' | 'all';

export default function WarehousePage() {
  const { tickets, currentUser, updateTicket } = useApp();
  const [tab, setTab] = useState<Tab>('paid');
  const [query, setQuery] = useState('');

  const rows: Row[] = useMemo(() => {
    const list: Row[] = [];
    tickets.forEach((t) => {
      (t.warehouseTracks ?? []).forEach((wt) => {
        list.push({ ...wt, ticket: t });
      });
    });
    return list;
  }, [tickets]);

  const filtered = useMemo(() => {
    let list = rows;
    if (tab === 'paid') list = list.filter((r) => r.paid && !r.releasedAt);
    else if (tab === 'unpaid') list = list.filter((r) => !r.paid);
    else if (tab === 'released') list = list.filter((r) => !!r.releasedAt);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (r) =>
          r.trackingNumber.toLowerCase().includes(q) ||
          r.ticket.customerName.toLowerCase().includes(q) ||
          r.ticket.customerPhone.includes(q)
      );
    }
    return list.sort((a, b) => (b.paidAt || b.addedAt) - (a.paidAt || a.addedAt));
  }, [rows, tab, query]);

  const stats = useMemo(() => ({
    paid: rows.filter((r) => r.paid && !r.releasedAt).length,
    unpaid: rows.filter((r) => !r.paid).length,
    released: rows.filter((r) => !!r.releasedAt).length,
    total: rows.length,
  }), [rows]);

  async function markReleased(row: Row) {
    if (!currentUser) return;
    const ticket = row.ticket;
    const newTracks = (ticket.warehouseTracks ?? []).map((w) =>
      w.id === row.id
        ? {
            ...w,
            releasedAt: Date.now(),
            releasedBy: currentUser.id,
            releasedByName: currentUser.fullName || currentUser.username,
          }
        : w
    );
    await updateTicket(
      ticket.id,
      { warehouseTracks: newTracks },
      `Ombor: ${row.trackingNumber} chiqarib berildi`
    );
    toast.success(`${row.trackingNumber} omborga chiqarildi`);
  }

  async function undoRelease(row: Row) {
    const ticket = row.ticket;
    const newTracks = (ticket.warehouseTracks ?? []).map((w) =>
      w.id === row.id
        ? { ...w, releasedAt: undefined, releasedBy: undefined, releasedByName: undefined }
        : w
    );
    await updateTicket(
      ticket.id,
      { warehouseTracks: newTracks },
      `Ombor: ${row.trackingNumber} qaytarildi`
    );
    toast('Ombor chiqishi bekor qilindi', { icon: '↩' });
  }

  function exportCSV() {
    if (filtered.length === 0) {
      toast.error("Ma'lumot yo'q");
      return;
    }
    const headers = ['Trek', 'Mijoz', 'Telefon', 'Summa', 'Holati', "To'langan vaqt", 'Chiqarilgan vaqt'];
    const csvRows = filtered.map((r) => [
      r.trackingNumber,
      r.ticket.customerName,
      r.ticket.customerPhone,
      r.amount || '',
      r.releasedAt ? 'Chiqarildi' : r.paid ? "To'langan — kutilmoqda" : "To'lov yo'q",
      r.paidAt ? formatDateTime(r.paidAt) : '',
      r.releasedAt ? formatDateTime(r.releasedAt) : '',
    ]);
    const csv = [headers, ...csvRows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sklad-navbati-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const TAB_CONFIG: Record<Tab, { label: string; color: string; count: number }> = {
    paid: { label: "To'langan (omborga)", color: 'sky', count: stats.paid },
    unpaid: { label: "To'lov kutilmoqda", color: 'amber', count: stats.unpaid },
    released: { label: 'Chiqarilgan', color: 'emerald', count: stats.released },
    all: { label: 'Hammasi', color: 'slate', count: stats.total },
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Sklad navbati"
        subtitle="To'lov qilingan treklar omborga chiqarish uchun navbatda"
        actions={
          <button onClick={exportCSV} className="btn-ghost">
            <Download className="h-4 w-4" /> CSV
          </button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <div className="card p-4 border-sky-200 dark:border-sky-900">
          <div className="flex items-center gap-1.5 text-xs text-sky-700 dark:text-sky-300 mb-1">
            <PackageCheck className="h-3.5 w-3.5" /> To'langan (omborga)
          </div>
          <div className="text-2xl font-bold text-sky-700 dark:text-sky-300">{stats.paid}</div>
        </div>
        <div className="card p-4 border-amber-200 dark:border-amber-900">
          <div className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-300 mb-1">
            <Clock className="h-3.5 w-3.5" /> To'lov kutilmoqda
          </div>
          <div className="text-2xl font-bold text-amber-700 dark:text-amber-300">{stats.unpaid}</div>
        </div>
        <div className="card p-4 border-emerald-200 dark:border-emerald-900">
          <div className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-300 mb-1">
            <CheckCircle2 className="h-3.5 w-3.5" /> Chiqarilgan
          </div>
          <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{stats.released}</div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-1">
            <Warehouse className="h-3.5 w-3.5" /> Jami
          </div>
          <div className="text-2xl font-bold text-slate-800 dark:text-slate-200">{stats.total}</div>
        </div>
      </div>

      {/* Tabs + Search */}
      <div className="card p-3 mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          {(Object.keys(TAB_CONFIG) as Tab[]).map((t) => {
            const cfg = TAB_CONFIG[t];
            const isActive = tab === t;
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  isActive
                    ? `bg-${cfg.color}-600 text-white`
                    : `bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700`
                }`}
              >
                {cfg.label} <span className="ml-1 opacity-80">{cfg.count}</span>
              </button>
            );
          })}
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              className="input pl-10"
              placeholder="Trek, mijoz yoki telefon..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm min-w-[820px]">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
              <th className="px-3 py-3 font-semibold">Trek</th>
              <th className="px-3 py-3 font-semibold">Mijoz</th>
              <th className="px-3 py-3 font-semibold">Summa</th>
              <th className="px-3 py-3 font-semibold">Holati</th>
              <th className="px-3 py-3 font-semibold">Vaqt</th>
              <th className="px-3 py-3 font-semibold text-right">Amal</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 300).map((r) => (
              <tr
                key={r.id}
                className={`border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30 ${
                  r.paid && !r.releasedAt ? 'bg-sky-50/40 dark:bg-sky-900/10' : ''
                }`}
              >
                <td className="px-3 py-3 font-mono font-semibold text-brand-700 dark:text-brand-400">
                  {r.trackingNumber}
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-1 text-slate-700 dark:text-slate-200">
                    <UserIcon className="h-3 w-3 text-slate-400" /> {r.ticket.customerName}
                  </div>
                  <button
                    onClick={() => dialNumber(r.ticket.customerPhone)}
                    className="flex items-center gap-1 text-[11px] font-mono text-slate-500 hover:text-emerald-600 mt-0.5"
                  >
                    <PhoneIcon className="h-2.5 w-2.5" /> {r.ticket.customerPhone}
                  </button>
                </td>
                <td className="px-3 py-3 text-slate-700 dark:text-slate-200 whitespace-nowrap">
                  {r.amount ? `${r.amount.toLocaleString('uz-UZ')} so'm` : '—'}
                </td>
                <td className="px-3 py-3">
                  {r.releasedAt ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold text-emerald-700 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300">
                      <CheckCircle2 className="h-3 w-3" /> Chiqarildi
                    </span>
                  ) : r.paid ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold text-sky-700 bg-sky-100 dark:bg-sky-900/30 dark:text-sky-300">
                      <PackageCheck className="h-3 w-3" /> To'langan — chiqarish
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold text-amber-700 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-300">
                      <AlertCircle className="h-3 w-3" /> To'lov yo'q
                    </span>
                  )}
                </td>
                <td className="px-3 py-3 text-xs text-slate-500 dark:text-slate-400">
                  {r.releasedAt ? (
                    <div>
                      <div className="text-emerald-600 dark:text-emerald-400">✓ {timeAgo(r.releasedAt)}</div>
                      <div className="text-[10px]">{r.releasedByName}</div>
                    </div>
                  ) : r.paidAt ? (
                    <div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> {timeAgo(r.paidAt)}
                      </div>
                      <div className="text-[10px]">to'lov: {r.paidByName}</div>
                    </div>
                  ) : (
                    <span>{timeAgo(r.addedAt)}</span>
                  )}
                </td>
                <td className="px-3 py-3 text-right">
                  {r.releasedAt ? (
                    <button
                      onClick={() => undoRelease(r)}
                      className="btn-ghost text-xs"
                      title="Bekor qilish"
                    >
                      <RotateCcw className="h-3 w-3" /> Bekor
                    </button>
                  ) : r.paid ? (
                    <button
                      onClick={() => markReleased(r)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                    >
                      <CheckCircle2 className="h-3 w-3 inline mr-1" /> Chiqarildi
                    </button>
                  ) : (
                    <span className="text-[11px] text-slate-400">to'lov kutilmoqda</span>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <Warehouse className="h-8 w-8 text-slate-300 dark:text-slate-600" />
                    <div className="text-slate-600 dark:text-slate-300 font-semibold text-sm">
                      Bu bo'limda yozuv yo'q
                    </div>
                    <div className="text-slate-400 text-xs max-w-md">
                      Operatorlar murojaat yaratganda treklarni omborga jo'natish uchun belgilashlari mumkin.
                      To'lov qilingani belgilangan treklar bu yerda ko'rinadi.
                    </div>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {filtered.length > 300 && (
          <div className="px-4 py-2 text-xs text-slate-500 dark:text-slate-400 text-center bg-slate-50 dark:bg-slate-800/30 border-t border-slate-200 dark:border-slate-700">
            {filtered.length} ta natija — birinchi 300 ko'rsatildi.
          </div>
        )}
      </div>

      <p className="text-[11px] text-slate-400 mt-3 text-center">
        <Filter className="h-3 w-3 inline mr-1" />
        Treklar murojaat (ticket) yaratilganda yoki tahrirlanganda qo'shiladi. To'lov bo'lishi bilan
        bu sahifada paydo bo'ladi va ombor hodimi mahsulotni chiqarganda belgilaydi.
      </p>
    </div>
  );
}
