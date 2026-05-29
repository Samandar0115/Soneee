import { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { Trash2, RotateCcw, FileSpreadsheet, FileDown, CheckSquare, Square, Archive } from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from '../components/PageHeader';
import { useApp } from '../context/AppContext';
import type { TrashItem, TrashType } from '../types';
import { formatDateTime } from '../utils/format';

const TYPE_LABELS: Record<TrashType, string> = {
  ticket: 'Murojaat',
  lead: 'Murojaat (lead)',
  cargo: 'Vozvrat yuk',
  callLog: "Qo'ng'iroq",
  user: 'Xodim',
};

function buildRows(items: TrashItem[]) {
  return items.map((it) => ({
    Turi: TYPE_LABELS[it.type] ?? it.type,
    Nomi: it.label,
    "O'chirilgan": new Date(it.deletedAt).toLocaleString('uz'),
    "O'chirgan": it.deletedByName ?? '',
    "Ma'lumot (JSON)": JSON.stringify(it.data),
  }));
}

export default function Trash() {
  const { trash, restoreFromTrash, purgeTrash } = useApp();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<TrashType | 'all'>('all');

  const visible = useMemo(
    () => trash.filter((t) => filter === 'all' || t.type === filter).sort((a, b) => b.deletedAt - a.deletedAt),
    [trash, filter]
  );
  const selItems = visible.filter((t) => selected.has(t.id));
  const exportItems = selItems.length ? selItems : visible;

  function toggle(id: string) {
    setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function toggleAll() {
    setSelected((s) => (s.size === visible.length ? new Set() : new Set(visible.map((t) => t.id))));
  }

  function exportExcel() {
    if (exportItems.length === 0) { toast.error('Eksport uchun yozuv yo\'q'); return; }
    const ws = XLSX.utils.json_to_sheet(buildRows(exportItems));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Korzina');
    XLSX.writeFile(wb, `ipost-korzina-${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success(`${exportItems.length} ta yozuv Excel'ga yuklandi`);
  }

  function exportCsv() {
    if (exportItems.length === 0) { toast.error('Eksport uchun yozuv yo\'q'); return; }
    const ws = XLSX.utils.json_to_sheet(buildRows(exportItems));
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ipost-korzina-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${exportItems.length} ta yozuv CSV'ga yuklandi`);
  }

  function purgeSelected() {
    const ids = selItems.map((t) => t.id);
    if (ids.length === 0) { toast.error('Avval belgilang'); return; }
    if (!confirm(`${ids.length} ta yozuv BAZADAN BUTUNLAY o'chiriladi. Avval Excel/CSV qilib saqlashni tavsiya etamiz. Davom etamizmi?`)) return;
    purgeTrash(ids);
    setSelected(new Set());
    toast.success("Butunlay o'chirildi");
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <PageHeader
        title="Korzina (o'chirilganlar)"
        subtitle="O'chirilgan yozuvlar shu yerda saqlanadi — tiklash yoki Excel/CSV qilib yuklab, bazadan butunlay o'chirish mumkin"
        actions={
          <div className="flex items-center gap-2">
            <button onClick={exportExcel} className="btn-ghost text-sm"><FileSpreadsheet className="h-4 w-4" /> Excel</button>
            <button onClick={exportCsv} className="btn-ghost text-sm"><FileDown className="h-4 w-4" /> CSV</button>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-2 mb-4">
        {(['all', 'ticket', 'lead', 'cargo', 'callLog', 'user'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-xl text-sm font-medium transition ${filter === f ? 'bg-brand-600 text-white' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'}`}
          >
            {f === 'all' ? 'Hammasi' : TYPE_LABELS[f]}
            <span className="ml-1 opacity-70">({f === 'all' ? trash.length : trash.filter((t) => t.type === f).length})</span>
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="card p-10 text-center text-slate-500">
          <Archive className="h-10 w-10 mx-auto mb-3 opacity-50" />
          Korzina bo'sh — hech narsa o'chirilmagan.
        </div>
      ) : (
        <>
          {selItems.length > 0 && (
            <div className="card p-3 mb-3 flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold">{selItems.length} ta belgilandi</span>
              <div className="flex-1" />
              <button onClick={() => selItems.forEach((t) => restoreFromTrash(t.id))} className="btn-ghost text-sm"><RotateCcw className="h-4 w-4" /> Tiklash</button>
              <button onClick={exportExcel} className="btn-ghost text-sm"><FileSpreadsheet className="h-4 w-4" /> Excel</button>
              <button onClick={purgeSelected} className="btn-danger text-sm"><Trash2 className="h-4 w-4" /> Butunlay o'chirish</button>
            </div>
          )}

          <div className="card divide-y divide-slate-100 dark:divide-slate-800">
            <button onClick={toggleAll} className="flex items-center gap-2 w-full px-4 py-2 text-sm text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50">
              {selected.size === visible.length ? <CheckSquare className="h-4 w-4 text-brand-500" /> : <Square className="h-4 w-4" />}
              Barchasini belgilash
            </button>
            {visible.map((it) => (
              <div key={it.id} className="flex items-center gap-3 px-4 py-2.5">
                <button onClick={() => toggle(it.id)}>
                  {selected.has(it.id) ? <CheckSquare className="h-4 w-4 text-brand-500" /> : <Square className="h-4 w-4 text-slate-400" />}
                </button>
                <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 flex-shrink-0">{TYPE_LABELS[it.type]}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{it.label}</div>
                  <div className="text-[11px] text-slate-400">{formatDateTime(it.deletedAt)} · {it.deletedByName ?? ''}</div>
                </div>
                <button onClick={() => { restoreFromTrash(it.id); toast.success('Tiklandi'); }} className="p-2 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-emerald-600" title="Tiklash">
                  <RotateCcw className="h-4 w-4" />
                </button>
                <button onClick={() => { if (confirm('Bu yozuv bazadan butunlay o\'chiriladi. Davom etamizmi?')) { purgeTrash([it.id]); } }} className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-red-500" title="Butunlay o'chirish">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
