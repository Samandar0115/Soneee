import { useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { useApp } from '../context/AppContext';
import PageHeader from '../components/PageHeader';
import {
  Upload, Search, Trash2, Download, Package, CheckCircle2, Clock, AlertCircle,
  Truck, Filter, FileSpreadsheet, X,
} from 'lucide-react';
import { formatDateTime } from '../utils/format';
import type { CargoShipment, CargoStatus, CargoType } from '../types';
import toast from 'react-hot-toast';

const STATUS_CONFIG: Record<CargoStatus, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  pending: { label: 'Kutilmoqda', color: 'text-amber-700 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-300', icon: Clock },
  in_transit: { label: "Yo'lda", color: 'text-sky-700 bg-sky-100 dark:bg-sky-900/30 dark:text-sky-300', icon: Truck },
  delivered: { label: 'Yetkazildi', color: 'text-emerald-700 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300', icon: CheckCircle2 },
  returned: { label: 'Qaytdi (vozvrat)', color: 'text-rose-700 bg-rose-100 dark:bg-rose-900/30 dark:text-rose-300', icon: AlertCircle },
};

const TYPE_OPTIONS: CargoType[] = ['BTS', 'EMU', 'CHINA-POST', 'YANTONG', 'OTHER'];

function parseDate(v: any): number | undefined {
  if (!v) return undefined;
  if (typeof v === 'number' && v > 25000 && v < 60000) {
    // Excel serial date
    const epoch = new Date(Date.UTC(1899, 11, 30));
    return epoch.getTime() + v * 86400000;
  }
  const d = new Date(v);
  return isNaN(d.getTime()) ? undefined : d.getTime();
}

function detectStatus(row: any): CargoStatus {
  const s = String(row.status || row.holat || '').toLowerCase().trim();
  if (s.includes('return') || s.includes('vozvrat') || s.includes('qaytdi')) return 'returned';
  if (s.includes('deliver') || s.includes('yetkaz') || s.includes('topshir')) return 'delivered';
  if (s.includes('transit') || s.includes("yo'l")) return 'in_transit';
  if (row.deliveredAt || row.delivered_at || row.topshirildi) return 'delivered';
  if (row.returnedAt || row.returned_at || row.vozvrat) return 'returned';
  return 'pending';
}

function detectType(row: any): CargoType {
  const v = String(row.type || row.tur || row.trackingType || '').toUpperCase().trim();
  if (v.includes('BTS')) return 'BTS';
  if (v.includes('EMU')) return 'EMU';
  if (v.includes('CHINA') || v.includes('POST')) return 'CHINA-POST';
  if (v.includes('YANTONG')) return 'YANTONG';
  return 'OTHER';
}

export default function Cargo() {
  const { cargoShipments, branches, currentUser, importCargoShipments, deleteCargoShipment, clearCargoShipments } = useApp();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | CargoStatus>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | CargoType>('all');
  const [branchFilter, setBranchFilter] = useState<'all' | string>('all');
  const [importing, setImporting] = useState(false);

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
    return list.sort((a, b) => (b.arrivedAt || b.importedAt) - (a.arrivedAt || a.importedAt));
  }, [cargoShipments, query, statusFilter, typeFilter, branchFilter]);

  const stats = useMemo(() => ({
    total: cargoShipments.length,
    delivered: cargoShipments.filter((c) => c.status === 'delivered').length,
    pending: cargoShipments.filter((c) => c.status === 'pending' || c.status === 'in_transit').length,
    returned: cargoShipments.filter((c) => c.status === 'returned').length,
  }), [cargoShipments]);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;
    setImporting(true);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array', cellDates: true });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<any>(sheet, { defval: '' });

      if (rows.length === 0) {
        toast.error("Excel bo'sh yoki noto'g'ri format");
        return;
      }

      const shipments: CargoShipment[] = [];
      rows.forEach((row, i) => {
        const tracking = String(row.tracking || row.trek || row.trackingNumber || row.tracking_number || row['Трек'] || row['Tracking'] || '').trim();
        if (!tracking) return;
        const branchName = String(row.branch || row.filial || row['Филиал'] || '').trim();
        const branch = branches.find((b) => b.name.toLowerCase() === branchName.toLowerCase());
        shipments.push({
          id: `cargo-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}`,
          trackingNumber: tracking,
          type: detectType(row),
          status: detectStatus(row),
          branchId: branch?.id,
          branchName: branchName || branch?.name,
          arrivedAt: parseDate(row.arrivedAt || row.arrived_at || row.kelgan || row['Kelgan sana'] || row['Sana'] || row.date),
          deliveredAt: parseDate(row.deliveredAt || row.delivered_at || row.topshirilgan || row['Topshirilgan']),
          returnedAt: parseDate(row.returnedAt || row.returned_at || row.vozvrat || row['Vozvrat sanasi']),
          customerName: String(row.customer || row.mijoz || row.customerName || row['F.I.O'] || row['Mijoz'] || '').trim() || undefined,
          customerPhone: String(row.phone || row.tel || row.customerPhone || row['Telefon'] || '').trim() || undefined,
          weightKg: parseFloat(row.weight || row.vazn || row.kg || row['Vazn'] || 0) || undefined,
          notes: String(row.notes || row.izoh || row['Izoh'] || '').trim() || undefined,
          importedAt: Date.now(),
          importedBy: currentUser.id,
        });
      });

      if (shipments.length === 0) {
        toast.error("Hech qanday yozuv topilmadi. 'tracking' yoki 'trek' ustuni bo'lishi kerak.");
        return;
      }

      importCargoShipments(shipments);
      toast.success(`${shipments.length} ta yuk yuklandi (jami: ${cargoShipments.length + shipments.length})`);
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
    const headers = ['Trek', 'Tur', 'Filial', 'Mijoz', 'Telefon', 'Vazn (kg)', 'Holati', 'Kelgan', 'Topshirilgan', 'Vozvrat'];
    const rows = filtered.map((c) => [
      c.trackingNumber, c.type, c.branchName || '',
      c.customerName || '', c.customerPhone || '', c.weightKg || '',
      STATUS_CONFIG[c.status].label,
      c.arrivedAt ? formatDateTime(c.arrivedAt) : '',
      c.deliveredAt ? formatDateTime(c.deliveredAt) : '',
      c.returnedAt ? formatDateTime(c.returnedAt) : '',
    ]);
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
      { tracking: 'EM123456789CN', type: 'EMU', filial: 'Toshkent', mijoz: 'Alimov M.', tel: '+998901234567', weight: 2.5, status: 'delivered', kelgan: '2026-05-15', topshirilgan: '2026-05-17' },
      { tracking: 'BT987654321', type: 'BTS', filial: 'Andijon', mijoz: 'Karimova D.', tel: '+998935551144', weight: 1.2, status: 'pending', kelgan: '2026-05-18' },
      { tracking: 'YT555888999', type: 'YANTONG', filial: 'Samarqand', mijoz: '', tel: '', weight: 5.0, status: 'returned', vozvrat: '2026-05-19', izoh: 'Mijoz olmadi' },
    ];
    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Yuklar');
    XLSX.writeFile(wb, 'yuklar-namuna.xlsx');
    toast.success("Namuna fayl yuklab olindi");
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Yuklar"
        subtitle="Filiallarga kelgan yuklar, BTS/EMU vozvratlar"
        actions={
          <div className="flex items-center gap-2">
            {isAdmin && (
              <>
                <button onClick={downloadTemplate} className="btn-ghost text-xs" title="Namuna Excel">
                  <FileSpreadsheet className="h-3.5 w-3.5" /> Namuna
                </button>
                <button onClick={() => fileRef.current?.click()} disabled={importing} className="btn-primary disabled:opacity-50">
                  <Upload className="h-4 w-4" /> {importing ? 'Yuklanmoqda...' : 'Excel yuklash'}
                </button>
                <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} className="hidden" />
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
              placeholder="Trek, mijoz yoki telefon..."
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

      {/* Table */}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
              <th className="px-3 py-3 font-semibold">Trek</th>
              <th className="px-3 py-3 font-semibold">Tur</th>
              <th className="px-3 py-3 font-semibold">Filial</th>
              <th className="px-3 py-3 font-semibold">Mijoz</th>
              <th className="px-3 py-3 font-semibold">Telefon</th>
              <th className="px-3 py-3 font-semibold">Holati</th>
              <th className="px-3 py-3 font-semibold">Kelgan</th>
              <th className="px-3 py-3 font-semibold">Topshirildi / Vozvrat</th>
              {isAdmin && <th className="px-3 py-3 font-semibold"></th>}
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 200).map((c) => {
              const cfg = STATUS_CONFIG[c.status];
              const Icon = cfg.icon;
              return (
                <tr key={c.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30">
                  <td className="px-3 py-2.5 font-mono font-semibold text-brand-700 dark:text-brand-400">
                    {c.trackingNumber}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {c.type}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-slate-700 dark:text-slate-200">{c.branchName || '—'}</td>
                  <td className="px-3 py-2.5 text-slate-700 dark:text-slate-200">{c.customerName || '—'}</td>
                  <td className="px-3 py-2.5 font-mono text-xs text-slate-600 dark:text-slate-300">{c.customerPhone || '—'}</td>
                  <td className="px-3 py-2.5">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${cfg.color}`}>
                      <Icon className="h-3 w-3" /> {cfg.label}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-slate-600 dark:text-slate-300">
                    {c.arrivedAt ? formatDateTime(c.arrivedAt).slice(0, 10) : '—'}
                  </td>
                  <td className="px-3 py-2.5 text-xs">
                    {c.deliveredAt && (
                      <div className="text-emerald-600 dark:text-emerald-400">✓ {formatDateTime(c.deliveredAt).slice(0, 10)}</div>
                    )}
                    {c.returnedAt && (
                      <div className="text-rose-600 dark:text-rose-400">↩ {formatDateTime(c.returnedAt).slice(0, 10)}</div>
                    )}
                    {!c.deliveredAt && !c.returnedAt && <span className="text-slate-400">—</span>}
                  </td>
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
                <td colSpan={isAdmin ? 9 : 8} className="px-4 py-12 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <Package className="h-8 w-8 text-slate-300 dark:text-slate-600" />
                    <div className="text-slate-600 dark:text-slate-300 font-semibold text-sm">Yuklar topilmadi</div>
                    <div className="text-slate-400 text-xs max-w-md">
                      {cargoShipments.length === 0
                        ? isAdmin
                          ? '"Excel yuklash" tugmasini bosib filiallardan kelgan yuklar ro\'yxatini yuklang. Avval namuna faylni ko\'rib chiqing.'
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

      <p className="text-[11px] text-slate-400 mt-3 text-center">
        <Filter className="h-3 w-3 inline mr-1" />
        Excel format: tracking, type (BTS/EMU/CHINA-POST/YANTONG/OTHER), filial, mijoz, tel, weight, status, kelgan, topshirilgan, vozvrat ustunlari
      </p>
    </div>
  );
}
