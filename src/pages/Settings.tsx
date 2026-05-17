import { useRef, useState } from 'react';
import { Save, Settings as SettingsIcon, Zap, Clock, Languages, Download, Upload, Archive } from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from '../components/PageHeader';
import { useApp } from '../context/AppContext';
import type { AppSettings } from '../types';

const PRIORITIES: Array<keyof AppSettings['slaMinutes']> = ['low', 'normal', 'high', 'urgent'];
const PRIORITY_LABELS: Record<string, string> = {
  low: 'Past',
  normal: 'Oddiy',
  high: 'Yuqori',
  urgent: 'Shoshilinch',
};

export default function SettingsPage() {
  const { settings, saveSettings, exportBackup, importBackup } = useApp();
  const [draft, setDraft] = useState<AppSettings>(settings);
  const fileRef = useRef<HTMLInputElement | null>(null);

  async function save() {
    await saveSettings(draft);
    toast.success('Sozlamalar saqlandi');
  }

  function downloadBackup() {
    const json = exportBackup();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ipost-backup-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Backup yuklandi');
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (!confirm('Backup yuklash barcha joriy ma\'lumotlarni almashtiradi. Davom etamiz?')) return;
      const ok = importBackup(reader.result as string);
      if (ok) toast.success('Backup tiklandi');
      else toast.error('Backup formati noto\'g\'ri');
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <PageHeader
        title="Tizim sozlamalari"
        subtitle="Auto-assignment, SLA va boshqa qoidalar"
        actions={
          <button className="btn-primary" onClick={save}>
            <Save className="h-4 w-4" /> Saqlash
          </button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="h-5 w-5 text-brand-600" />
            <h3 className="font-bold">Avtomatik biriktirish</h3>
          </div>
          <p className="text-xs text-slate-500 mb-3">
            Yangi murojaat operatorga avtomatik biriktirilsin (yuklamani teng taqsimlash uchun)
          </p>
          <div className="space-y-2">
            {([
              { v: 'off', label: 'O‘chirilgan', desc: 'Operator qo‘lda tanlanadi' },
              { v: 'round-robin', label: 'Aylanma navbat', desc: 'Navbatma-navbat har bir operatorga' },
              { v: 'least-busy', label: 'Eng kam bandlik', desc: 'Aktiv ticket soni eng kam operator' },
            ] as const).map((opt) => (
              <label
                key={opt.v}
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
                  draft.autoAssign === opt.v
                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <input
                  type="radio"
                  name="autoassign"
                  value={opt.v}
                  checked={draft.autoAssign === opt.v}
                  onChange={() => setDraft({ ...draft, autoAssign: opt.v })}
                  className="mt-1"
                />
                <div>
                  <div className="font-semibold text-sm">{opt.label}</div>
                  <div className="text-xs text-slate-500">{opt.desc}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="h-5 w-5 text-brand-600" />
            <h3 className="font-bold">SLA — javob va yopish vaqti</h3>
          </div>
          <p className="text-xs text-slate-500 mb-3">
            Muhimlik darajasiga qarab murojaatni hal qilish muddati (daqiqalarda). Kechikkan murojaatlar qizil belgi bilan ko‘rsatiladi.
          </p>
          <div className="space-y-2">
            {PRIORITIES.map((p) => (
              <div key={p} className="flex items-center gap-3">
                <div className="w-32 text-sm font-semibold text-slate-700 dark:text-slate-300">
                  {PRIORITY_LABELS[p]}
                </div>
                <input
                  type="number"
                  min={1}
                  className="input flex-1"
                  value={draft.slaMinutes[p]}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      slaMinutes: { ...draft.slaMinutes, [p]: Number(e.target.value) },
                    })
                  }
                />
                <div className="w-20 text-xs text-slate-500">
                  ≈ {Math.round(draft.slaMinutes[p] / 60)} soat
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-2 mb-3">
            <Languages className="h-5 w-5 text-brand-600" />
            <h3 className="font-bold">Standart til</h3>
          </div>
          <p className="text-xs text-slate-500 mb-3">
            Yangi foydalanuvchilar uchun standart interfeys tili. Har bir xodim o‘ziga moslab o‘zgartira oladi.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setDraft({ ...draft, defaultLang: 'uz' })}
              className={`flex-1 p-3 rounded-xl border transition ${
                draft.defaultLang === 'uz' ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20' : 'border-slate-200 dark:border-slate-700'
              }`}
            >
              🇺🇿 O‘zbekcha
            </button>
            <button
              onClick={() => setDraft({ ...draft, defaultLang: 'ru' })}
              className={`flex-1 p-3 rounded-xl border transition ${
                draft.defaultLang === 'ru' ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20' : 'border-slate-200 dark:border-slate-700'
              }`}
            >
              🇷🇺 Русский
            </button>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-2 mb-3">
            <SettingsIcon className="h-5 w-5 text-brand-600" />
            <h3 className="font-bold">Mijoz portali</h3>
          </div>
          <p className="text-xs text-slate-500">
            Mijozlar trek raqami va telefon orqali murojaat holatini quyidagi havoladan tekshira oladi:
          </p>
          <div className="mt-3 p-3 rounded-xl bg-slate-100 dark:bg-slate-800 font-mono text-xs break-all">
            {window.location.origin}/track
          </div>
        </div>

        <div className="card p-6 lg:col-span-2">
          <div className="flex items-center gap-2 mb-3">
            <Archive className="h-5 w-5 text-brand-600" />
            <h3 className="font-bold">Backup va tiklash</h3>
          </div>
          <p className="text-xs text-slate-500 mb-3">
            Barcha ma'lumotlar (xodimlar, murojaatlar, bosqichlar, e'lonlar, filiallar, tariflar, shablonlar) JSON fayl sifatida yuklab oling. Kerak bo'lganda qaytadan tiklash mumkin.
          </p>
          <div className="flex gap-2">
            <button onClick={downloadBackup} className="btn-primary">
              <Download className="h-4 w-4" /> JSON backup yuklash
            </button>
            <button onClick={() => fileRef.current?.click()} className="btn-ghost">
              <Upload className="h-4 w-4" /> Backupdan tiklash
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".json,application/json"
              hidden
              onChange={handleImport}
            />
          </div>
          <div className="mt-3 text-[11px] text-amber-600 dark:text-amber-400">
            ⚠️ Tiklash barcha joriy ma'lumotlarni almashtiradi. Avval joriy holatni yuklab olishni tavsiya etamiz.
          </div>
        </div>
      </div>
    </div>
  );
}
