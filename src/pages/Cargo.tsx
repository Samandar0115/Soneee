import { useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { useApp } from '../context/AppContext';
import PageHeader from '../components/PageHeader';
import {
  Upload, Search, Trash2, Download, Package, CheckCircle2, Clock, AlertCircle,
  Truck, Filter, FileSpreadsheet, X, Calendar, ArrowDown, ArrowLeft,
} from 'lucide-react';
import { formatDateTime } from '../utils/format';
import type { CargoShipment, CargoStatus, CargoType } from '../types';
import toast from 'react-hot-toast';

const STATUS_CONFIG: Record<CargoStatus, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  pending: { label: 'Kutilmoqda', color: 'text-amber-700 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-300', icon: Clock },
  in_transit: { label: "Yo'lda", color: 'text-sky-700 bg-sky-100 dark:bg-sky-900/30 dark:text-sky-300', icon: Truck },
  delivered: { label: 'Yetkazildi', color: 'text-emerald-700 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300', icon: CheckCircle2 },
  returned: { label: 'Vozvrat', color: 'text-rose-700 bg-rose-100 dark:bg-rose-900/30 dark:text-rose-300', icon: AlertCircle },
};

const TYPE_OPTIONS: CargoType[] = ['BTS', 'EMU', 'CHINA-POST', 'YANTONG', 'OTHER'];

type Direction = 'returned' | 'arrived';

function todayISO() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

function statusLabelWithDate(c: CargoShipment): { text: string; date?: string } {
  const cfg = STATUS_CONFIG[c.status];
  let ts: number | undefined;
  if (c.status === 'returned') ts = c.returnedAt;
  else if (c.status === 'delivered') ts = c.deliveredAt;
  else ts = c.arrivedAt;
  return {
    text: c.type === 'OTHER' ? cfg.label : `${c.type} ${cfg.label.toLowerCase()}`,
    date: ts ? formatDateTime(ts).slice(0, 10) : undefined,
  };
}

export default function Cargo() {
  const { cargoShipments, branches, currentUser, importCargoShipments, deleteCargoShipment, clearCargoShipments } = useApp();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | CargoStatus>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | CargoType>('all');
  const [branchFilter, setBranchFilter] = useState<'all' | string>('all');
  const [importing, setImporting] = useState(false);

  // Upload modal state
  const [uploadOpen, setUploadOpen] = useState(false);
  const [direction, setDirection] = useState<Direction>('returned');
  const [uType, setUType] = useState<CargoType>('BTS');
  const [uDate, setUDate] = useState<string>(todayISO());
  const [uBranchId, setUBranchId] = useState<string>('');
  const [uNote, setUNote] = useState<string>('');

  const isAdmin = currentUser?.role === 'admin';

  const filtered = useMemo(() => {
    let list = [...cargoShipments];
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (c) =>
          c.trackingNumber.toLowerCase().includes(q) ||
          c.customerName?.toLowerCase().includes(q) ||
          c.customerPhone?.includes(q)
      );
    }
    if (statusFilter !== 'all') list = list.filter((c) => c.status === statusFilter);
    if (typeFilter !== 'all') list = list.filter((c) => c.type === typeFilter);
    if (branchFilter !== 'all') list = list.filter((c) => c.branchId === branchFilter);
    return list.sort((a, b) => {
      const ta = a.returnedAt || a.deliveredAt || a.arrivedAt || a.importedAt;
      const tb = b.returnedAt || b.deliveredAt || b.arrivedAt || b.importedAt;
      return tb - ta;
    });
  }, [cargoShipments, query, statusFilter, typeFilter, branchFilter]);

  const stats = useMemo(() => ({
    total: cargoShipments.length,
    delivered: cargoShipments.filter((c) => c.status === 'delivered').length,
    pending: cargoShipments.filter((c) => c.status === 'pending' || c.status === 'in_transit').length,
    returned: cargoShipments.filter((c) => c.status === 'returned').length,
  }), [cargoShipments]);

  function openUpload(dir: Direction, t: CargoType) {
    setDirection(dir);
    setUType(t);
    setUDate(todayISO());
    setUBranchId('');
    setUNote('');
    setUploadOpen(true);
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;
    if (!uDate) {
      toast.error('Avval sanani tanlang');
      return;
    }
    setImporting(true);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array', cellDates: true });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<any>(sheet, { defval: '', header: 1 });

      if (rows.length === 0) {
        toast.error("Excel bo'sh");
        return;
      }

      // Flatten all cells, pick anything that looks like a tracking code (≥6 chars, alphanumeric)
      const seen = new Set<string>();
      const tracks: string[] = [];
      (rows as any[][]).forEach((row) => {
        row.forEach((cell) => {
          const v = String(cell ?? '').trim();
          if (!v) return;
          // Filter out obvious header words / dates
          if (/^(track|trek|tracking|номер|номер трека|nomer|n|№|date|sana|holat|status|filial|тип|type)$/i.test(v)) return;
          if (/^\d{1,2}[./-]\d{1,2}[./-]\d{2,4}$/.test(v)) return;
          if (v.length < 6) return;
          // Reasonable tracking: starts with letter or digit, has digits
          if (!/\d/.test(v)) return;
          if (!/^[A-Za-z0-9\-_/]+$/.test(v)) return;
          if (seen.has(v)) return;
          seen.add(v);
          tracks.push(v);
        });
      });

      if (tracks.length === 0) {
        toast.error('Excel\'da trek topilmadi. Har bir hujayrada bitta trek bo\'lishi kerak.');
        return;
      }

      const ts = new Date(uDate + 'T12:00:00').getTime();
      const branch = uBranchId ? branches.find((b) => b.id === uBranchId) : undefined;
      const status: CargoStatus = direction === 'returned' ? 'returned' : 'pending';

      const shipments: CargoShipment[] = tracks.map((t, i) => ({
        id: `cargo-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}`,
        trackingNumber: t,
        type: uType,
        status,
        branchId: branch?.id,
        branchName: branch?.name,
        arrivedAt: direction === 'arrived' ? ts : undefined,
        returnedAt: direction === 'returned' ? ts : undefined,
        notes: uNote.trim() || undefined,
        importedAt: Date.now(),
        importedBy: currentUser.id,
      }));

      importCargoShipments(shipments);
      toast.success(`${shipments.length} ta ${uType} ${direction === 'returned' ? 'vozvrat' : 'kelgan'} yuk yuklandi`);
      setUploadOpen(false);
    } catch (err: any) {
      toast.error("Excel o'qishda xato: " + (err?.message || 'noma\'lum'));
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  function exportCSV() {
    if (filtered.length === 0) {
      toast.error('Ma\'lumot yo\'q');
      return;
    }
    const headers = ['Trek', 'Tur', 'Filial', 'Holati', 'Sana', 'Izoh'];
    const rows = filtered.map((c) => {
      const s = statusLabelWithDate(c);
      return [
        c.trackingNumber, c.type, c.branchName || '',
        s.text, s.date || '', c.notes || '',
      ];
    });
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `yuklar-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${filtered.length} ta yozuv eksport qilindi`);
  }

  function downloadTemplate() {
    const sampleData = [
      { trek: 'EM123456789CN' },
      { trek: 'BT987654321' },
      { trek: 'YT555888999' },
    ];
    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Treklar');
    XLSX.writeFile(wb, 'treklar-namuna.xlsx');
    toast.success("Namuna fayl yuklab olindi. Faqat trek raqamlari ustunini to'ldiring.");
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Yuklar"
        subtitle="Filiallarga kelgan yuklar va BTS / EMU vozvratlar"
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            {isAdmin && (
              <>
                <button onClick={downloadTemplate} className="btn-ghost text-xs" title="Namuna Excel">
                  <FileSpreadsheet className="h-3.5 w-3.5" /> Namuna
                </button>
                <button onClick={() => openUpload('returned', 'BTS')} className="btn-ghost text-xs border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300">
                  <ArrowLeft className="h-3.5 w-3.5" /> BTS vozvrat
                </button>
                <button onClick={() => openUpload('returned', 'EMU')} className="btn-ghost text-xs border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300">
                  <ArrowLeft className="h-3.5 w-3.5" /> EMU vozvrat
                </button>
                <button onClick={() => openUpload('arrived', 'BTS')} className="btn-primary text-xs">
                  <ArrowDown className="h-3.5 w-3.5" /> Filialga kelgan
                </button>
              </>
            )}
            <button onClick={exportCSV} className="btn-ghost">
              <Download className="h-4 w-4" /> CSV
            </button>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <div className="card p-4">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-1">
            <Package className="h-3.5 w-3.5" /> Jami yuklar
          </div>
          <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{stats.total}</div>
        </div>
        <div className="card p-4 border-emerald-200 dark:border-emerald-900">
          <div className="text-xs text-emerald-700 dark:text-emerald-300 mb-1">Yetkazildi</div>
          <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{stats.delivered}</div>
          {stats.total > 0 && (
            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5">
              {Math.round((stats.delivered / stats.total) * 100)}%
            </div>
          )}
        </div>
        <div className="card p-4">
          <div className="text-xs text-amber-700 dark:text-amber-300 mb-1">Kutilmoqda</div>
          <div className="text-2xl font-bold text-amber-700 dark:text-amber-300">{stats.pending}</div>
        </div>
        <div className="card p-4 border-rose-200 dark:border-rose-900">
          <div className="text-xs text-rose-700 dark:text-rose-300 mb-1">Vozvrat (BTS/EMU)</div>
          <div className="text-2xl font-bold text-rose-700 dark:text-rose-300">{stats.returned}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              className="input pl-10"
              placeholder="Trek raqami..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <select className="input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)}>
            <option value="all">Barcha holatlar</option>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
          <select className="input" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as any)}>
            <option value="all">Barcha turlar</option>
            {TYPE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select className="input" value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)}>
            <option value="all">Barcha filiallar</option>
            {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
      </div>

      {/* Track search highlight: if exactly one match, show big card on top */}
      {query.trim() && filtered.length > 0 && filtered.length <= 3 && (
        <div className="mb-4 space-y-2">
          {filtered.slice(0, 3).map((c) => {
            const cfg = STATUS_CONFIG[c.status];
            const Icon = cfg.icon;
            const s = statusLabelWithDate(c);
            return (
              <div key={c.id} className={`card p-4 border-l-4 ${
                c.status === 'returned' ? 'border-rose-500' :
                c.status === 'delivered' ? 'border-emerald-500' : 'border-amber-500'
              }`}>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <div className="font-mono text-lg font-bold text-brand-700 dark:text-brand-400">{c.trackingNumber}</div>
                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${cfg.color}`}>
                        <Icon className="h-3.5 w-3.5" /> {s.text}
                      </span>
                      {s.date && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          <Calendar className="h-3.5 w-3.5" /> {s.date}
                        </span>
                      )}
                      {c.branchName && (
                        <span className="px-2 py-0.5 rounded text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {c.branchName}
                        </span>
                      )}
                    </div>
                    {c.notes && <div className="mt-2 text-xs text-slate-500">{c.notes}</div>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Table */}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm min-w-[720px]">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
              <th className="px-3 py-3 font-semibold">Trek</th>
              <th className="px-3 py-3 font-semibold">Holati</th>
              <th className="px-3 py-3 font-semibold">Sana</th>
              <th className="px-3 py-3 font-semibold">Filial</th>
              <th className="px-3 py-3 font-semibold">Izoh</th>
              {isAdmin && <th className="px-3 py-3 font-semibold"></th>}
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 200).map((c) => {
              const cfg = STATUS_CONFIG[c.status];
              const Icon = cfg.icon;
              const s = statusLabelWithDate(c);
              return (
                <tr key={c.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30">
                  <td className="px-3 py-2.5 font-mono font-semibold text-brand-700 dark:text-brand-400">
                    {c.trackingNumber}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${cfg.color}`}>
                      <Icon className="h-3 w-3" /> {s.text}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-slate-600 dark:text-slate-300">
                    {s.date || '—'}
                  </td>
                  <td className="px-3 py-2.5 text-slate-700 dark:text-slate-200">{c.branchName || '—'}</td>
                  <td className="px-3 py-2.5 text-xs text-slate-500 dark:text-slate-400 max-w-xs truncate" title={c.notes}>{c.notes || '—'}</td>
                  {isAdmin && (
                    <td className="px-3 py-2.5">
                      <button
                        onClick={() => {
                          if (confirm(`${c.trackingNumber} o'chirilsinmi?`)) deleteCargoShipment(c.id);
                        }}
                        className="p-1.5 rounded hover:bg-rose-50 dark:hover:bg-rose-900/20 text-rose-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={isAdmin ? 6 : 5} className="px-4 py-12 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <Package className="h-8 w-8 text-slate-300 dark:text-slate-600" />
                    <div className="text-slate-600 dark:text-slate-300 font-semibold text-sm">
                      {query.trim() ? 'Bunday trek topilmadi' : 'Yuklar topilmadi'}
                    </div>
                    <div className="text-slate-400 text-xs max-w-md">
                      {cargoShipments.length === 0
                        ? isAdmin
                          ? 'Tepadagi "BTS vozvrat", "EMU vozvrat" yoki "Filialga kelgan" tugmasini bosib treklar ro\'yxatini Excel orqali yuklang.'
                          : 'Administrator hali yuklar ro\'yxatini yuklamagan.'
                        : 'Qidiruv shartlariga mos yozuv yo\'q. Filtrlarni tozalang.'}
                    </div>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {filtered.length > 200 && (
          <div className="px-4 py-2 text-xs text-slate-500 dark:text-slate-400 text-center bg-slate-50 dark:bg-slate-800/30 border-t border-slate-200 dark:border-slate-700">
            {filtered.length} ta natija — birinchi 200 ko'rsatildi. Filtrlarni aniqlashtiring.
          </div>
        )}
      </div>

      {isAdmin && cargoShipments.length > 0 && (
        <div className="mt-4 flex justify-end">
          <button
            onClick={() => {
              if (confirm(`Barcha ${cargoShipments.length} ta yuk yozuvi o'chirilsinmi?`)) {
                clearCargoShipments();
                toast.success("Barcha yuklar o'chirildi");
              }
            }}
            className="btn-danger text-xs"
          >
            <X className="h-3.5 w-3.5" /> Hammasini tozalash
          </button>
        </div>
      )}

      {/* Upload Modal */}
      {uploadOpen && isAdmin && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => !importing && setUploadOpen(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold text-slate-800 dark:text-slate-100">Yuk treklarini yuklash</div>
                <div className="text-xs text-slate-500 mt-0.5">Avval yo'nalish va sanani tanlang, keyin Excel faylni qo'shing</div>
              </div>
              <button onClick={() => !importing && setUploadOpen(false)} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">Yo'nalish</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDirection('returned')}
                    className={`px-3 py-2.5 rounded-lg text-sm font-semibold border-2 transition ${
                      direction === 'returned'
                        ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300'
                    }`}
                  >
                    <ArrowLeft className="h-4 w-4 inline mr-1.5" />
                    Vozvrat (qaytgan)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDirection('arrived')}
                    className={`px-3 py-2.5 rounded-lg text-sm font-semibold border-2 transition ${
                      direction === 'arrived'
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300'
                    }`}
                  >
                    <ArrowDown className="h-4 w-4 inline mr-1.5" />
                    Filialga kelgan
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">Tur</label>
                  <select className="input" value={uType} onChange={(e) => setUType(e.target.value as CargoType)}>
                    {TYPE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                    {direction === 'returned' ? 'Vozvrat sanasi' : 'Kelgan sana'}
                  </label>
                  <input type="date" className="input" value={uDate} onChange={(e) => setUDate(e.target.value)} />
                </div>
              </div>

              {direction === 'arrived' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">Filial (ixtiyoriy)</label>
                  <select className="input" value={uBranchId} onChange={(e) => setUBranchId(e.target.value)}>
                    <option value="">— Tanlanmagan —</option>
                    {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">Izoh (ixtiyoriy)</label>
                <input
                  className="input"
                  placeholder="Masalan: 18-may keldi, BTS partiyasi"
                  value={uNote}
                  onChange={(e) => setUNote(e.target.value)}
                />
              </div>

              <div className="p-3 rounded-lg bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-900 text-xs text-sky-800 dark:text-sky-200">
                <div className="font-semibold mb-1">Excel format:</div>
                <div>Excel'da faqat trek raqamlari bo'lishi yetarli — bitta ustun yoki har bir hujayrada bitta trek. Sarlavha (header) shart emas.</div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button onClick={() => !importing && setUploadOpen(false)} className="btn-ghost" disabled={importing}>
                  Bekor qilish
                </button>
                <button onClick={() => fileRef.current?.click()} disabled={importing || !uDate} className="btn-primary disabled:opacity-50">
                  <Upload className="h-4 w-4" /> {importing ? 'Yuklanmoqda...' : 'Excel tanlash'}
                </button>
                <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} className="hidden" />
              </div>
            </div>
          </div>
        </div>
      )}

      <p className="text-[11px] text-slate-400 mt-3 text-center">
        <Filter className="h-3 w-3 inline mr-1" />
        Trekni qidirish uchun yuqoridagi qidiruv maydoniga trek raqamini kiriting — sanasi va holati ko'rsatiladi
      </p>
    </div>
  );
}
