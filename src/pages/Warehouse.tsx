import { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import PageHeader from '../components/PageHeader';
import {
  Warehouse, Search, CheckCircle2, PackageCheck, Filter, Download,
  User as UserIcon, Phone as PhoneIcon, Calendar, RotateCcw,
} from 'lucide-react';
import { formatDateTime, timeAgo } from '../utils/format';
import type { Ticket, WarehouseTrack, WarehouseReason } from '../types';
import { dialNumber } from '../components/Softphone';
import toast from 'react-hot-toast';

type Row = WarehouseTrack & { ticket: Ticket };

type Tab = WarehouseReason | 'released' | 'all';

const REASON_META: Record<WarehouseReason, { label: string; color: string; emoji: string; description: string }> = {
  paid: {
    label: "To'lov qilindi",
    color: 'sky',
    emoji: '💳',
    description: "To'lovi endi qilingan — omborga chiqarish kerak",
  },
  returned: {
    label: 'Vozvrat',
    color: 'orange',
    emoji: '↩️',
    description: "Vozvrat bo'lgan — mijozga qaytarib berish kerak",
  },
  held: {
    label: 'Ushlab qolingan',
    color: 'purple',
    emoji: '⏸️',
    description: 'Skladda qaysidur sababga ko\'ra ushlab qolingan — chiqarish kerak',
  },
  other: {
    label: 'Boshqa',
    color: 'slate',
    emoji: '📦',
    description: 'Boshqa sababga ko\'ra skladda',
  },
};

const TAB_TITLE: Record<Tab, string> = {
  paid: "💳 To'lov qilindi",
  returned: '↩️ Vozvrat',
  held: '⏸️ Ushlab qolingan',
  other: '📦 Boshqa',
  released: '✓ Chiqarilgan',
  all: 'Hammasi',
};

export default function WarehousePage() {
  const { tickets, currentUser, updateTicket } = useApp();
  const [tab, setTab] = useState<Tab>('paid');
  const [query, setQuery] = useState('');

  const rows: Row[] = useMemo(() => {
    const list: Row[] = [];
    tickets.forEach((t) => {
      (t.warehouseTracks ?? []).forEach((wt) => {
        // Eski yozuvlar uchun default sabab — to'lov holatiga qarab
        const reason: WarehouseReason = wt.reason ?? (wt.paid ? 'paid' : 'other');
        list.push({ ...wt, reason, ticket: t });
      });
    });
    return list;
  }, [tickets]);

  const filtered = useMemo(() => {
    let list = rows;
    if (tab === 'released') {
      list = list.filter((r) => !!r.releasedAt);
    } else if (tab === 'all') {
      list = list.filter((r) => !r.releasedAt);
    } else {
      list = list.filter((r) => r.reason === tab && !r.releasedAt);
    }
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (r) =>
          r.trackingNumber.toLowerCase().includes(q) ||
          r.ticket.customerName.toLowerCase().includes(q) ||
          r.ticket.customerPhone.includes(q) ||
          (r.reasonNote ?? '').toLowerCase().includes(q)
      );
    }
    return list.sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
  }, [rows, tab, query]);

  const stats = useMemo(() => {
    const open = rows.filter((r) => !r.releasedAt);
    return {
      paid: open.filter((r) => r.reason === 'paid').length,
      returned: open.filter((r) => r.reason === 'returned').length,
      held: open.filter((r) => r.reason === 'held').length,
      other: open.filter((r) => r.reason === 'other').length,
      released: rows.filter((r) => !!r.releasedAt).length,
      open: open.length,
      total: rows.length,
    };
  }, [rows]);

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
    toast.success(`${row.trackingNumber} chiqarildi`);
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
    const headers = ['Trek', 'Sabab', 'Izoh', 'Mijoz', 'Telefon', 'Summa', 'Qo\'shilgan', 'Chiqarilgan'];
    const csvRows = filtered.map((r) => [
      r.trackingNumber,
      REASON_META[r.reason].label,
      r.reasonNote || '',
      r.ticket.customerName,
      r.ticket.customerPhone,
      r.amount || '',
      formatDateTime(r.addedAt),
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

  const currentReasonMeta = tab !== 'released' && tab !== 'all' ? REASON_META[tab] : null;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Sklad navbati"
        subtitle="Murojaatlardan jo'natilgan treklar — sabab bo'yicha guruhlangan. Ombor hodimi chiqarish uchun belgilaydi."
        actions={
          <button onClick={exportCSV} className="btn-ghost">
            <Download className="h-4 w-4" /> CSV
          </button>
        }
      />

      {/* Stats — sabab bo'yicha */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
        <button
          onClick={() => setTab('paid')}
          className={`card p-4 text-left transition ${tab === 'paid' ? 'ring-2 ring-sky-400' : ''}`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs uppercase tracking-wider text-sky-700 dark:text-sky-300">💳 To'lov</span>
          </div>
          <div className="text-2xl font-bold text-sky-700 dark:text-sky-300">{stats.paid}</div>
          <div className="text-[10px] text-slate-500 mt-1">To'lovi endi qilindi</div>
        </button>
        <button
          onClick={() => setTab('returned')}
          className={`card p-4 text-left transition ${tab === 'returned' ? 'ring-2 ring-orange-400' : ''}`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs uppercase tracking-wider text-orange-700 dark:text-orange-300">↩️ Vozvrat</span>
          </div>
          <div className="text-2xl font-bold text-orange-700 dark:text-orange-300">{stats.returned}</div>
          <div className="text-[10px] text-slate-500 mt-1">Mijozdan vozvrat</div>
        </button>
        <button
          onClick={() => setTab('held')}
          className={`card p-4 text-left transition ${tab === 'held' ? 'ring-2 ring-purple-400' : ''}`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs uppercase tracking-wider text-purple-700 dark:text-purple-300">⏸️ Ushlangan</span>
          </div>
          <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">{stats.held}</div>
          <div className="text-[10px] text-slate-500 mt-1">Skladda ushlab qolingan</div>
        </button>
        <button
          onClick={() => setTab('all')}
          className={`card p-4 text-left transition ${tab === 'all' ? 'ring-2 ring-brand-400' : ''}`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs uppercase tracking-wider text-brand-700 dark:text-brand-300">📦 Jami ochiq</span>
          </div>
          <div className="text-2xl font-bold text-brand-700 dark:text-brand-300">{stats.open}</div>
          <div className="text-[10px] text-slate-500 mt-1">Chiqarish kerak</div>
        </button>
        <button
          onClick={() => setTab('released')}
          className={`card p-4 text-left transition ${tab === 'released' ? 'ring-2 ring-emerald-400' : ''}`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs uppercase tracking-wider text-emerald-700 dark:text-emerald-300">✓ Chiqarilgan</span>
          </div>
          <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{stats.released}</div>
          <div className="text-[10px] text-slate-500 mt-1">Tarix</div>
        </button>
      </div>

      {/* Tab tasviri */}
      {currentReasonMeta && (
        <div className={`card p-3 mb-3 border-l-4 border-${currentReasonMeta.color}-400`}>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-lg">{currentReasonMeta.emoji}</span>
            <span className="font-semibold">{currentReasonMeta.label}</span>
            <span className="text-slate-500">— {currentReasonMeta.description}</span>
          </div>
        </div>
      )}

      {/* Qidiruv */}
      <div className="card p-3 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            className="input pl-10"
            placeholder="Trek, mijoz, telefon yoki izoh bo'yicha qidirish..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Jadval */}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm min-w-[820px]">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
              <th className="px-3 py-3 font-semibold">Trek</th>
              <th className="px-3 py-3 font-semibold">Sabab / izoh</th>
              <th className="px-3 py-3 font-semibold">Mijoz</th>
              <th className="px-3 py-3 font-semibold">Summa</th>
              <th className="px-3 py-3 font-semibold">Vaqt</th>
              <th className="px-3 py-3 font-semibold text-right">Amal</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 300).map((r) => {
              const meta = REASON_META[r.reason];
              return (
                <tr
                  key={r.id}
                  className={`border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30`}
                >
                  <td className="px-3 py-3 font-mono font-semibold text-brand-700 dark:text-brand-400">
                    {r.trackingNumber}
                  </td>
                  <td className="px-3 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-${meta.color}-100 text-${meta.color}-800 dark:bg-${meta.color}-900/30 dark:text-${meta.color}-300`}>
                      <span>{meta.emoji}</span>
                      {meta.label}
                    </span>
                    {r.reasonNote && (
                      <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 italic">
                        📝 {r.reasonNote}
                      </div>
                    )}
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
                  <td className="px-3 py-3 text-xs text-slate-500 dark:text-slate-400">
                    {r.releasedAt ? (
                      <div>
                        <div className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> {timeAgo(r.releasedAt)}
                        </div>
                        <div className="text-[10px]">{r.releasedByName}</div>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> {timeAgo(r.addedAt)}
                        </div>
                        {r.paidByName && r.paid && (
                          <div className="text-[10px]">to'lov: {r.paidByName}</div>
                        )}
                      </div>
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
                    ) : (
                      <button
                        onClick={() => markReleased(r)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold inline-flex items-center gap-1"
                      >
                        <CheckCircle2 className="h-3 w-3" /> Chiqarildi
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <Warehouse className="h-8 w-8 text-slate-300 dark:text-slate-600" />
                    <div className="text-slate-600 dark:text-slate-300 font-semibold text-sm">
                      {TAB_TITLE[tab]} bo'limida yozuv yo'q
                    </div>
                    <div className="text-slate-400 text-xs max-w-md">
                      Operatorlar murojaat ichidan trekni sabab bilan (to'lov, vozvrat, ushlab qolish) skladga jo'natadi —
                      shu yerda paydo bo'ladi.
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
        Operatorlar murojaat ichida treklarni 3 sabab bilan jo'natadi:
        <b className="mx-1">to'lov qilindi</b> /
        <b className="mx-1">vozvrat</b> /
        <b className="mx-1">ushlab qolingan</b>. Ombor hodimi shu yerdan chiqarganini belgilaydi.
      </p>
    </div>
  );
}
