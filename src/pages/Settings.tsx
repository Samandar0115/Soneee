import { useEffect, useRef, useState } from 'react';
import { Save, Settings as SettingsIcon, Zap, Clock, Languages, Download, Upload, Archive, Cloud, CloudOff, ShieldCheck, RefreshCw, Timer, ScanFace, Trash2 } from 'lucide-react';
import { Phone, Wifi, Loader2, CheckCircle2, XCircle, ExternalLink } from 'lucide-react';
import { detectOS } from '../utils/platform';
import toast from 'react-hot-toast';
import PageHeader from '../components/PageHeader';
import { useApp } from '../context/AppContext';
import type { AppSettings } from '../types';
import { checkKVStatus, loadFromKV, saveToKV, resetKVStatus, type KVStatus } from '../utils/vercelKV';
import { formatDateTime } from '../utils/format';

const PRIORITIES: Array<keyof AppSettings['slaMinutes']> = ['low', 'normal', 'high', 'urgent'];
const PRIORITY_LABELS: Record<string, string> = {
  low: 'Past',
  normal: 'Oddiy',
  high: 'Yuqori',
  urgent: 'Shoshilinch',
};

export default function SettingsPage() {
  const { settings, saveSettings, exportBackup, importBackup, archiveOldResolved, tickets } = useApp();
  const [draft, setDraft] = useState<AppSettings>(settings);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [kv, setKV] = useState<KVStatus | null>(null);
  const [kvBusy, setKvBusy] = useState(false);
  const [wsTest, setWsTest] = useState<'idle' | 'testing' | 'ok' | 'fail'>('idle');
  const [wsTestMsg, setWsTestMsg] = useState('');
  const os = detectOS();

  // SIP server WebSocket'iga ulanib ko'rish — Asterisk'da WS yoqilganini tekshiradi
  async function testWebSocket() {
    const uri = draft.sip?.wsUri?.trim();
    if (!uri) {
      setWsTest('fail');
      setWsTestMsg('WebSocket URI kiritilmagan');
      return;
    }
    setWsTest('testing');
    setWsTestMsg('Ulanmoqda...');
    try {
      const ws = new WebSocket(uri, ['sip']);
      const timer = setTimeout(() => {
        setWsTest('fail');
        setWsTestMsg("Vaqt tugadi — server javob bermadi (10s). Asterisk'da WS yoqilmagan yoki port to'sib qo'yilgan.");
        try { ws.close(); } catch {}
      }, 10000);
      ws.onopen = () => {
        clearTimeout(timer);
        setWsTest('ok');
        setWsTestMsg('Muvaffaqiyatli ulandi! WebSocket ishlayapti, WebRTC rejimi mumkin.');
        try { ws.close(); } catch {}
      };
      ws.onerror = () => {
        clearTimeout(timer);
        setWsTest('fail');
        setWsTestMsg(
          uri.startsWith('ws://') && window.location.protocol === 'https:'
            ? "Aralash kontent xatosi: sayt HTTPS'da, lekin server ws://. Asterisk'da wss:// yoqing yoki saytni HTTP'da oching."
            : "Ulanish xatosi. Server manzili va portni tekshiring (Asterisk'da chan_pjsip + WS yoqilgan bo'lishi kerak)."
        );
      };
    } catch (err: any) {
      setWsTest('fail');
      setWsTestMsg(err?.message ?? "Noma'lum xato");
    }
  }

  const oldResolvedCount = (() => {
    const cutoff = Date.now() - (draft.archiveAfterDays || 365) * 86_400_000;
    return tickets.filter((t) => t.status === 'resolved' && t.resolvedAt && t.resolvedAt < cutoff).length;
  })();

  function runArchive() {
    if (oldResolvedCount === 0) {
      toast('Arxivlash uchun eski ticket yo\'q');
      return;
    }
    if (!confirm(`${oldResolvedCount} ta ${draft.archiveAfterDays} kundan eski hal etilgan ticketlar o'chirilsinmi? (Avval JSON backup yuklab olishni tavsiya etamiz)`)) return;
    const n = archiveOldResolved(draft.archiveAfterDays || 365);
    toast.success(`${n} ta arxivlandi`);
  }

  useEffect(() => {
    checkKVStatus().then(setKV);
  }, []);

  // Auto-save: draft o'zgarsa, 800ms keyin avtomatik saqlanadi (debounce)
  const autoSaveTimerRef = useRef<number | null>(null);
  useEffect(() => {
    // Birinchi render'da saqlamaymiz (settings == draft)
    if (draft === settings) return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = window.setTimeout(() => {
      saveSettings(draft);
    }, 800);
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  async function refreshKV() {
    resetKVStatus();
    const s = await checkKVStatus();
    setKV(s);
  }

  async function pushToVercel() {
    setKvBusy(true);
    toast.loading('Vercel xotirasiga saqlanmoqda...', { id: 'kv-save' });
    try {
      const data = JSON.parse(exportBackup());
      const result = await saveToKV(data);
      if (result.ok) {
        toast.success('Vercel xotirasiga saqlandi', { id: 'kv-save' });
        await refreshKV();
      } else if (!result.configured) {
        toast.error('Vercel KV ulanmagan. Quyidagi ko\'rsatmaga qarang.', { id: 'kv-save' });
      } else {
        toast.error(`Xato: ${result.error}`, { id: 'kv-save' });
      }
    } catch (err) {
      toast.error('Xato: ' + (err as Error).message, { id: 'kv-save' });
    } finally {
      setKvBusy(false);
    }
  }

  async function pullFromVercel() {
    setKvBusy(true);
    toast.loading('Vercel xotirasidan o\'qilmoqda...', { id: 'kv-load' });
    try {
      const result = await loadFromKV();
      if (!result || !result.data) {
        toast.error('Vercel xotirasida ma\'lumot yo\'q', { id: 'kv-load' });
        return;
      }
      if (!confirm("Vercel'dan tiklash joriy ma'lumotlarni almashtiradi. Davom etamiz?")) {
        toast.dismiss('kv-load');
        return;
      }
      const ok = importBackup(JSON.stringify(result.data));
      if (ok) {
        toast.success('Tiklandi! Sahifa qayta yuklanadi...', { id: 'kv-load' });
        setTimeout(() => window.location.reload(), 1200);
      } else {
        toast.error('Format noto\'g\'ri', { id: 'kv-load' });
      }
    } catch (err) {
      toast.error('Xato: ' + (err as Error).message, { id: 'kv-load' });
    } finally {
      setKvBusy(false);
    }
  }

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
            <Timer className="h-5 w-5 text-brand-600" />
            <h3 className="font-bold">Session timeout (faollik)</h3>
          </div>
          <p className="text-xs text-slate-500 mb-3">
            Foydalanuvchi shu daqiqalar davomida hech narsa qilmasa, avtomatik tizimdan chiqariladi. 0 = o'chirilgan.
          </p>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={0}
              className="input flex-1"
              value={draft.idleTimeoutMin}
              onChange={(e) => setDraft({ ...draft, idleTimeoutMin: Number(e.target.value) })}
            />
            <span className="text-sm text-slate-500">daqiqa</span>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-2 mb-3">
            <ScanFace className="h-5 w-5 text-brand-600" />
            <h3 className="font-bold">Face ID oxshashlik chegarasi</h3>
          </div>
          <p className="text-xs text-slate-500 mb-3">
            Yuz tanish uchun minimal oxshashlik foizi. Kamroq qilsangiz osonroq tanaydi (lekin xato ehtimoli bor). 75%+ tavsiya etiladi.
          </p>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={30}
              max={90}
              step={5}
              className="flex-1"
              value={draft.faceMatchThreshold ?? 50}
              onChange={(e) => setDraft({ ...draft, faceMatchThreshold: Number(e.target.value) })}
            />
            <div className={`font-bold text-xl w-16 text-right ${
              (draft.faceMatchThreshold ?? 50) >= 75 ? 'text-emerald-600' :
              (draft.faceMatchThreshold ?? 50) >= 60 ? 'text-brand-600' : 'text-amber-600'
            }`}>
              {draft.faceMatchThreshold ?? 50}%
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-2 mb-3">
            <Trash2 className="h-5 w-5 text-brand-600" />
            <h3 className="font-bold">Avtomatik arxivlash</h3>
          </div>
          <p className="text-xs text-slate-500 mb-3">
            Hal etilgan ticketlarni X kundan keyin tizimdan o'chirib, hajmni saqlab turish.
            10,000+ ticketda tezlik uchun zarur.
          </p>
          <div className="flex items-center gap-3 mb-3">
            <input
              type="number"
              min={30}
              className="input flex-1"
              value={draft.archiveAfterDays}
              onChange={(e) => setDraft({ ...draft, archiveAfterDays: Number(e.target.value) })}
            />
            <span className="text-sm text-slate-500">kundan keyin</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={runArchive} className="btn-danger text-xs">
              <Trash2 className="h-3.5 w-3.5" /> Hozir arxivlash ({oldResolvedCount} ta)
            </button>
            <span className="text-[11px] text-slate-400">JSON backup tavsiya etiladi</span>
          </div>
        </div>

        <div className="card p-6 lg:col-span-2">
          <div className="flex items-center gap-2 mb-3">
            <Phone className="h-5 w-5 text-brand-600" />
            <h3 className="font-bold">SIP telefon liniyasi</h3>
            {draft.sip?.enabled && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 font-semibold">
                Avtomatik saqlanadi
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mb-4">
            Mahalliy PBX server (Asterisk) ma'lumotlari — bu yerda <b>bir marta</b> kiritiladi. Har bir hodimning
            shaxsiy Login va paroli esa <b>Xodimlar</b> bo'limidan. Yozayotganingiz darhol saqlanadi.
          </p>

          <label className="flex items-center gap-2 mb-4 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={!!draft.sip?.enabled}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  sip: {
                    ...(draft.sip ?? { mode: 'webrtc', serverHost: '', wsUri: '' }),
                    enabled: e.target.checked,
                    mode: draft.sip?.mode ?? 'webrtc',
                  } as any,
                })
              }
              className="h-4 w-4"
            />
            <span className="text-sm font-semibold">SIP telefon liniyasi yoqilgan</span>
          </label>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">SIP-сервер</label>
              <input
                className="input mt-1 font-mono"
                placeholder="192.168.7.253"
                value={draft.sip?.serverHost ?? ''}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    sip: {
                      ...(draft.sip ?? { enabled: false, mode: 'webrtc', wsUri: '' }),
                      serverHost: e.target.value,
                    } as any,
                  })
                }
              />
              <p className="text-[11px] text-slate-400 mt-1">
                MicroSIP'dagi "SIP-сервер" maydoni
              </p>
            </div>

            <div>
              <label className="label">Домен</label>
              <input
                className="input mt-1 font-mono"
                placeholder="192.168.7.253"
                value={draft.sip?.domain ?? ''}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    sip: {
                      ...(draft.sip ?? { enabled: false, mode: 'webrtc', wsUri: '', serverHost: '' }),
                      domain: e.target.value,
                    } as any,
                  })
                }
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Odatda server bilan bir xil. Qo'ng'iroq <code className="font-mono">@{draft.sip?.domain || draft.sip?.serverHost || '...'}</code> ga ketadi
              </p>
            </div>

            <div>
              <label className="label">WebSocket URI</label>
              <input
                className="input mt-1 font-mono text-xs"
                placeholder="ws://192.168.7.253:8088/ws"
                value={draft.sip?.wsUri ?? ''}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    sip: {
                      ...(draft.sip ?? { enabled: false, mode: 'webrtc', serverHost: '' }),
                      wsUri: e.target.value,
                    } as any,
                  })
                }
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Sayt ichida qo'ng'iroq qilish uchun (Asterisk WebSocket)
              </p>
            </div>

            <div>
              <label className="label">Обновить регистрацию (sek)</label>
              <input
                type="number"
                className="input mt-1 font-mono"
                placeholder="120"
                value={draft.sip?.registerExpiresSec ?? ''}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    sip: {
                      ...(draft.sip ?? { enabled: false, mode: 'webrtc', wsUri: '', serverHost: '' }),
                      registerExpiresSec: e.target.value ? Number(e.target.value) : undefined,
                    } as any,
                  })
                }
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Standart: 120
              </p>
            </div>
          </div>

          {/* Ulanishni sinab ko'rish */}
          <div className="mt-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Wifi className="h-4 w-4 text-brand-600" />
                <span className="text-sm font-semibold">Server bilan ulanishni tekshirish</span>
              </div>
              <button
                type="button"
                onClick={testWebSocket}
                disabled={wsTest === 'testing' || !draft.sip?.wsUri}
                className="btn-primary text-xs disabled:opacity-50"
              >
                {wsTest === 'testing' ? (
                  <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Tekshirilmoqda...</>
                ) : (
                  <>Sinab ko'rish</>
                )}
              </button>
            </div>
            {wsTest === 'idle' && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                WebSocket URI'ni kiritib tekshirib ko'ring. Muvaffaqiyatli ulansa — sayt ichidan to'g'ridan-to'g'ri qo'ng'iroq qilinadi.
              </p>
            )}
            {wsTest === 'ok' && (
              <div className="flex items-start gap-2 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800/40">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-emerald-800 dark:text-emerald-200">
                  <div className="font-bold">Ulanish muvaffaqiyatli</div>
                  <div>{wsTestMsg}</div>
                </div>
              </div>
            )}
            {wsTest === 'fail' && (
              <div className="flex items-start gap-2 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800/40">
                <XCircle className="h-4 w-4 text-rose-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-rose-800 dark:text-rose-200">
                  <div className="font-bold">Ulanib bo'lmadi</div>
                  <div>{wsTestMsg}</div>
                </div>
              </div>
            )}
          </div>

          {/* Diagnostika info */}
          <div className="mt-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
            <div className="font-semibold text-slate-700 dark:text-slate-300">Aniqlanish: {detectOS() === 'mac' ? '🍎 macOS' : detectOS() === 'windows' ? '🪟 Windows' : detectOS() === 'linux' ? '🐧 Linux' : detectOS() === 'ios' ? '📱 iOS' : detectOS() === 'android' ? '🤖 Android' : 'noma\'lum OS'}</div>
            <div>Birinchi navbatda <b>sayt ichidagi softphone</b> ishlatiladi. Server bilan ulanib bo'lmasa, raqamga bosilganda <code className="font-mono">sip:NUMBER@{draft.sip?.domain || draft.sip?.serverHost || 'DOMAIN'}</code> URL'i ochiladi va OS'dagi default softphone qabul qiladi.</div>
            <div>Hozir Asterisk WebSocket'i hech qanday tekshirilmagan — yuqoridagi tugmani bosib tekshiring.</div>
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
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              {kv?.configured ? (
                <ShieldCheck className="h-5 w-5 text-emerald-600" />
              ) : kv?.available ? (
                <CloudOff className="h-5 w-5 text-amber-600" />
              ) : (
                <Cloud className="h-5 w-5 text-slate-400" />
              )}
              <h3 className="font-bold">Vercel xotirasi (xavfsiz markaziy saqlash)</h3>
            </div>
            <button onClick={refreshKV} className="btn-ghost text-xs">
              <RefreshCw className="h-3.5 w-3.5" /> Yangilash
            </button>
          </div>

          {kv === null ? (
            <p className="text-xs text-slate-500">Holat tekshirilmoqda...</p>
          ) : kv.configured ? (
            <>
              <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-2 rounded-xl border border-emerald-200 dark:border-emerald-800/50">
                <ShieldCheck className="h-4 w-4" />
                <span>
                  Vercel KV (Redis) ulangan
                  {kv.updatedAt && <> · oxirgi yangilanish: {formatDateTime(kv.updatedAt)}</>}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Hozir barcha ma'lumotlar brauzer xotirasida (localStorage). Vercel KV — markaziy, shifrlangan va barcha xodimlar bir manbadan o'qiydigan ishonchli xotira. Pastdagi tugmalar bilan qo'lda yoki avto-sinxronlash mumkin.
              </p>
              <div className="flex gap-2 mt-3 flex-wrap">
                <button onClick={pushToVercel} disabled={kvBusy} className="btn-primary disabled:opacity-50">
                  <Upload className="h-4 w-4" /> Vercel'ga saqlash
                </button>
                <button onClick={pullFromVercel} disabled={kvBusy} className="btn-ghost disabled:opacity-50">
                  <Download className="h-4 w-4" /> Vercel'dan tiklash
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 rounded-xl border border-amber-200 dark:border-amber-800/50">
                <CloudOff className="h-4 w-4 flex-shrink-0" />
                <span>Vercel KV ulanmagan — ma'lumotlar hozir faqat brauzer xotirasida.</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 font-semibold">
                Ulash uchun (5 daqiqa):
              </p>
              <ol className="list-decimal list-inside text-xs text-slate-600 dark:text-slate-300 space-y-1 mt-1">
                <li>Vercel Dashboard'ga kiring → loyihangiz</li>
                <li>
                  <b>Storage</b> tab → <b>Create Database</b> → <b>Marketplace Database</b> →{' '}
                  <b>Upstash Redis</b> (yoki boshqa Redis integratsiya) ni tanlang
                </li>
                <li>Bepul tarifni tanlab "Continue" — integratsiya o'rnatiladi</li>
                <li>
                  Loyihangizga ulang — <code>KV_REST_API_URL</code> va <code>KV_REST_API_TOKEN</code>{' '}
                  env'lari avtomatik qo'shiladi
                </li>
                <li>Vercel loyihani qaytadan deploy qiladi (taxminan 1 daqiqa)</li>
                <li>Bu sahifaga qaytib "Yangilash" tugmasini bosing</li>
              </ol>
            </>
          )}
        </div>

        <div className="card p-6 lg:col-span-2">
          <div className="flex items-center gap-2 mb-3">
            <Archive className="h-5 w-5 text-brand-600" />
            <h3 className="font-bold">Lokal backup (JSON fayl)</h3>
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
