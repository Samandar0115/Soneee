import { useEffect, useRef, useState } from 'react';
import { Save, Settings as SettingsIcon, Zap, Clock, Languages, Download, Upload, Archive, Cloud, CloudOff, ShieldCheck, RefreshCw, Timer, ScanFace, Trash2, PhoneCall, Wifi, WifiOff } from 'lucide-react';
import { Loader2, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from '../components/PageHeader';
import { useApp } from '../context/AppContext';
import { sipManager, type SipState } from '../utils/sip';
import { sendTelegramMessage } from '../utils/telegram';
import { Send, Users, Plus } from 'lucide-react';
import type { AppSettings, ComplaintDirection, SipConfig, TelegramConfig } from '../types';

const COMPLAINT_DIRS: ComplaintDirection[] = ['IT', 'Logistika', 'Xitoy ombor', 'UZB ombor', 'Moliya', 'Sifat nazorati', 'Boshqa'];

const DEFAULT_SIP: SipConfig = {
  enabled: false, wsUrl: '', domain: '', username: '', password: '', displayName: '',
  stunUrl: 'stun:stun.l.google.com:19302',
};
const DEFAULT_TG: TelegramConfig = { enabled: false, botToken: '', defaultChatId: '' };
import { checkKVStatus, loadFromKV, saveToKV, resetKVStatus, cleanupLegacyKV, type KVStatus } from '../utils/vercelKV';
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
  const [sip, setSip] = useState<SipState>(sipManager.state);
  useEffect(() => sipManager.subscribe(setSip), []);
  const sipCfg = draft.sip ?? DEFAULT_SIP;
  const setSipCfg = (patch: Partial<SipConfig>) =>
    setDraft({ ...draft, sip: { ...sipCfg, ...patch } });
  const tgCfg = draft.telegram ?? DEFAULT_TG;
  const setTgCfg = (patch: Partial<TelegramConfig>) =>
    setDraft({ ...draft, telegram: { ...tgCfg, ...patch } });
  const [tgBusy, setTgBusy] = useState(false);
  const [tgBot, setTgBot] = useState<{ username?: string; first_name?: string } | null>(null);

  // Bot username va nomini avtomatik aniqlash (bot ochish havolasi uchun)
  useEffect(() => {
    if (!tgCfg.botToken) { setTgBot(null); return; }
    const t = tgCfg.botToken;
    let cancelled = false;
    fetch(`https://api.telegram.org/bot${t}/getMe`)
      .then((r) => r.json())
      .then((j) => { if (!cancelled && j?.ok) setTgBot(j.result); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [tgCfg.botToken]);

  async function tgTest() {
    if (!tgCfg.botToken || !tgCfg.defaultChatId) { toast.error('Token va Chat ID kerak'); return; }
    setTgBusy(true);
    const r = await sendTelegramMessage(tgCfg.botToken, tgCfg.defaultChatId, '✅ iPOST CRM — Telegram bot ulanish testi muvaffaqiyatli');
    setTgBusy(false);
    if (r.ok) toast.success('Test xabar yuborildi'); else toast.error(r.error || 'Xato');
  }

  async function tgFindChatId() {
    if (!tgCfg.botToken) { toast.error('Avval bot token kiriting'); return; }
    setTgBusy(true);
    try {
      const res = await fetch(`https://api.telegram.org/bot${tgCfg.botToken}/getUpdates`);
      const j = await res.json();
      if (!j.ok) throw new Error(j.description);
      const updates = j.result as Array<{ message?: { chat: { id: number; title?: string; username?: string; first_name?: string } } }>;
      if (!updates.length) { toast('Bot hali xabar olmagan — botga /start yozing yoki guruhga qo\'shing', { icon: 'ℹ️', duration: 6000 }); return; }
      const chats = Array.from(new Map(updates.filter((u) => u.message).map((u) => [u.message!.chat.id, u.message!.chat])).values());
      const list = chats.map((c) => `${c.id} — ${c.title || c.username || c.first_name || ''}`).join('\n');
      const chosen = prompt('Topilgan chatlar:\n\n' + list + '\n\nChat ID ni kiriting:', String(chats[0]?.id ?? ''));
      if (chosen) setTgCfg({ defaultChatId: chosen.trim() });
    } catch (e) {
      toast.error((e as Error).message || 'Xato');
    } finally { setTgBusy(false); }
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
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  useEffect(() => {
    if (draft === settings) return;
    setSaveStatus('saving');
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = window.setTimeout(async () => {
      await saveSettings(draft);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus((s) => (s === 'saved' ? 'idle' : s)), 1800);
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

  async function cleanupLegacy() {
    if (!confirm("Vercel KV'dagi eski snapshot (ipost:state:v1) o'chiriladi. Joriy ma'lumotlarga ta'sir qilmaydi. Davom etamiz?")) {
      return;
    }
    setKvBusy(true);
    toast.loading('Eski snapshot tozalanmoqda...', { id: 'kv-cleanup' });
    try {
      const r = await cleanupLegacyKV();
      if (r.ok) {
        toast.success(r.message || "Tozalandi", { id: 'kv-cleanup' });
      } else {
        toast.error(r.error || 'Xato', { id: 'kv-cleanup' });
      }
    } catch (err) {
      toast.error('Xato: ' + (err as Error).message, { id: 'kv-cleanup' });
    } finally {
      setKvBusy(false);
    }
  }

  async function save() {
    // bo'sh subtype qatorlarini olib tashlaymiz
    const cleaned: Partial<Record<ComplaintDirection, string[]>> = {};
    for (const [dir, list] of Object.entries(draft.complaintSubtypes ?? {})) {
      cleaned[dir as ComplaintDirection] = (list as string[]).map((s) => s.trim()).filter(Boolean);
    }
    await saveSettings({ ...draft, complaintSubtypes: cleaned });
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
          <div className="flex items-center gap-3">
            {saveStatus === 'saving' && (
              <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saqlanmoqda...
              </span>
            )}
            {saveStatus === 'saved' && (
              <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold">
                <CheckCircle2 className="h-3.5 w-3.5" /> Avtomatik saqlandi
              </span>
            )}
            <button className="btn-primary" onClick={save}>
              <Save className="h-4 w-4" /> Saqlash
            </button>
          </div>
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
              <PhoneCall className="h-5 w-5 text-brand-600" />
              <h3 className="font-bold">Telefon liniyasi (o'rnatilgan SIP)</h3>
            </div>
            {sipCfg.enabled && (
              <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-semibold ${
                sip.reg === 'registered'
                  ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
                  : sip.reg === 'failed'
                    ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400'
                    : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400'
              }`}>
                {sip.reg === 'registered' ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
                {sip.reg === 'registered' ? 'Ulangan' : sip.reg === 'failed' ? 'Xato' : 'Ulanmoqda...'}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mb-3">
            CRM ichidan to'g'ridan-to'g'ri qo'ng'iroq qilish (tashqi dastur kerak emas). SIP-over-WebSocket
            qo'llab-quvvatlaydigan PBX kerak (Asterisk/FreeSWITCH WSS yoki SIP provayder).
            Har bir operatorga shaxsiy raqam — Foydalanuvchilar bo'limida beriladi.
          </p>

          <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer mb-3">
            <input type="checkbox" checked={sipCfg.enabled} onChange={(e) => setSipCfg({ enabled: e.target.checked })} />
            <div>
              <div className="font-semibold text-sm">Telefon liniyasini yoqish</div>
              <div className="text-xs text-slate-500">Yoqilganda pastdagi telefon tugmasi to'g'ridan-to'g'ri qo'ng'iroq qiladi</div>
            </div>
          </label>

          {sipCfg.enabled && (
            <div className="grid sm:grid-cols-2 gap-3">
              <SipField label="WebSocket manzili (WSS)" placeholder="wss://pbx.example.com:7443" value={sipCfg.wsUrl} onChange={(v) => setSipCfg({ wsUrl: v })} />
              <SipField label="SIP domen" placeholder="pbx.example.com" value={sipCfg.domain} onChange={(v) => setSipCfg({ domain: v })} />
              <SipField label="Umumiy SIP raqam (standart)" placeholder="1001" value={sipCfg.username} onChange={(v) => setSipCfg({ username: v })} />
              <SipField label="Umumiy SIP parol (standart)" type="password" placeholder="•••••" value={sipCfg.password} onChange={(v) => setSipCfg({ password: v })} />
              <SipField label="Ko'rinadigan nom (ixtiyoriy)" placeholder="iPOST Operator" value={sipCfg.displayName ?? ''} onChange={(v) => setSipCfg({ displayName: v })} />
              <SipField label="STUN server" placeholder="stun:stun.l.google.com:19302" value={sipCfg.stunUrl ?? ''} onChange={(v) => setSipCfg({ stunUrl: v })} />
              <SipField label="TURN server (ixtiyoriy)" placeholder="turn:turn.example.com:3478" value={sipCfg.turnUrl ?? ''} onChange={(v) => setSipCfg({ turnUrl: v })} />
              <div className="grid grid-cols-2 gap-3">
                <SipField label="TURN login" placeholder="user" value={sipCfg.turnUsername ?? ''} onChange={(v) => setSipCfg({ turnUsername: v })} />
                <SipField label="TURN parol" type="password" placeholder="•••" value={sipCfg.turnPassword ?? ''} onChange={(v) => setSipCfg({ turnPassword: v })} />
              </div>
            </div>
          )}
          {sipCfg.enabled && sip.reg === 'failed' && sip.lastError && (
            <p className="text-xs text-rose-600 dark:text-rose-400 mt-2">Xato: {sip.lastError}</p>
          )}
        </div>

        {/* === TELEGRAM BOT === */}
        <div className="card p-6 lg:col-span-2">
          <div className="flex items-center gap-2 mb-3">
            <Send className="h-5 w-5 text-brand-600" />
            <h3 className="font-bold">Telegram bot</h3>
          </div>
          <p className="text-xs text-slate-500 mb-3">
            Kunlik yuk adashishlari va hisobotlarni botga yuborish uchun.
            <b className="block mt-1">3 qadamda sozlanadi:</b>
            <span className="block mt-1">1. <b>"Botni ochish"</b> ni bosing — Telegram ochiladi → <b>/start</b> bosing.</span>
            <span className="block">2. <b>"Topish"</b> ni bosing — chat ID avtomatik to'ldiriladi.</span>
            <span className="block">3. <b>"Test xabar yuborish"</b> bilan tasdiqlang.</span>
          </p>

          {tgBot && (
            <div className="card p-3 mb-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 flex items-center gap-3 flex-wrap">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
                Bot: <b>@{tgBot.username}</b> ({tgBot.first_name})
              </span>
              <a
                href={`https://t.me/${tgBot.username}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary text-xs ml-auto"
              >
                <Send className="h-3.5 w-3.5" /> Botni ochish
              </a>
            </div>
          )}

          <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer mb-3">
            <input type="checkbox" checked={tgCfg.enabled} onChange={(e) => setTgCfg({ enabled: e.target.checked })} />
            <div className="font-semibold text-sm">Telegram botni yoqish</div>
          </label>

          <div className="grid sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="label">Bot token</label>
              <input className="input mt-1 font-mono text-xs" value={tgCfg.botToken} placeholder="123456:ABC..." onChange={(e) => setTgCfg({ botToken: e.target.value.trim() })} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Standart chat ID (guruh yoki kanal)</label>
              <div className="flex items-center gap-2">
                <input className="input mt-1 font-mono text-xs flex-1" value={tgCfg.defaultChatId} placeholder="-1001234567890" onChange={(e) => setTgCfg({ defaultChatId: e.target.value.trim() })} />
                <button type="button" onClick={tgFindChatId} disabled={tgBusy} className="btn-ghost text-xs whitespace-nowrap mt-1 disabled:opacity-50">Topish</button>
              </div>
            </div>
            <div>
              <label className="label">EMU uchun alohida chat ID (ixtiyoriy)</label>
              <input className="input mt-1 font-mono text-xs" value={tgCfg.emuChatId ?? ''} placeholder="-100..." onChange={(e) => setTgCfg({ emuChatId: e.target.value.trim() || undefined })} />
            </div>
            <div>
              <label className="label">BTS uchun alohida chat ID (ixtiyoriy)</label>
              <input className="input mt-1 font-mono text-xs" value={tgCfg.btsChatId ?? ''} placeholder="-100..." onChange={(e) => setTgCfg({ btsChatId: e.target.value.trim() || undefined })} />
            </div>
          </div>

          <div className="flex items-center gap-2 mt-3">
            <button onClick={tgTest} disabled={tgBusy || !tgCfg.botToken || !tgCfg.defaultChatId} className="btn-primary text-sm disabled:opacity-50">
              <Send className="h-3.5 w-3.5" /> Test xabar yuborish
            </button>
            <span className="text-[11px] text-slate-400">Sozlamani avval saqlang (avto-saqlanadi), keyin test bosing.</span>
          </div>
        </div>

        {/* === ZAYAVKA BERUVCHILAR === */}
        <div className="card p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-brand-600" />
              <h3 className="font-bold">Zayavka beruvchilar</h3>
            </div>
            <button
              type="button"
              onClick={() => {
                const list = draft.orderers ?? [];
                setDraft({ ...draft, orderers: [...list, { id: 'ord-' + Date.now(), name: '', phone: '' }] });
              }}
              className="btn-ghost text-sm"
            >
              <Plus className="h-3.5 w-3.5" /> Qo'shish
            </button>
          </div>
          <p className="text-xs text-slate-500 mb-3">
            Murojaat formasidagi "Kim nomidan zayavka" ro'yxati. Bu yerga qo'shgan ismlar
            tanlovdan chiqadi va telefon avto-to'ldiriladi.
          </p>

          <div className="space-y-2">
            {(draft.orderers ?? []).length === 0 && (
              <p className="text-xs text-slate-400">Hozircha hech kim qo'shilmagan. "Qo'shish" tugmasini bosing.</p>
            )}
            {(draft.orderers ?? []).map((o, i) => (
              <div key={o.id} className="flex gap-2 items-center">
                <input
                  className="input text-sm flex-1"
                  placeholder="Ism familiya (masalan: Buvajonov Hamidjon)"
                  value={o.name}
                  onChange={(e) => {
                    const list = [...(draft.orderers ?? [])];
                    list[i] = { ...list[i], name: e.target.value };
                    setDraft({ ...draft, orderers: list });
                  }}
                />
                <input
                  className="input text-sm w-44 font-mono"
                  placeholder="+998..."
                  value={o.phone}
                  onChange={(e) => {
                    const list = [...(draft.orderers ?? [])];
                    list[i] = { ...list[i], phone: e.target.value };
                    setDraft({ ...draft, orderers: list });
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    const list = (draft.orderers ?? []).filter((_, idx) => idx !== i);
                    setDraft({ ...draft, orderers: list });
                  }}
                  className="p-2 rounded-lg text-rose-500 hover:bg-rose-50"
                  title="O'chirish"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* === SHIKOYAT YO'NALISH ICHKI TURLARI === */}
        <div className="card p-6 lg:col-span-2">
          <div className="flex items-center gap-2 mb-3">
            <SettingsIcon className="h-5 w-5 text-rose-600" />
            <h3 className="font-bold">Shikoyat yo'nalishlari — ichki turlar</h3>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            Har bir yo'nalish uchun ichki turlar ro'yxati. Operator shikoyat qoldirishda yo'nalish va ichki turini tanlaydi.
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            {COMPLAINT_DIRS.map((dir) => {
              const list = draft.complaintSubtypes?.[dir] ?? [];
              return (
                <div key={dir} className="rounded-xl border border-slate-200 dark:border-slate-700 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-semibold text-sm text-slate-800 dark:text-slate-200">{dir}</div>
                    <button
                      type="button"
                      onClick={() => {
                        const next = { ...(draft.complaintSubtypes ?? {}) };
                        next[dir] = [...list, ''];
                        setDraft({ ...draft, complaintSubtypes: next });
                      }}
                      className="btn-ghost text-xs"
                    >
                      <Plus className="h-3 w-3" /> Tur
                    </button>
                  </div>
                  {list.length === 0 && (
                    <p className="text-[11px] text-slate-400">Hozircha tur yo'q.</p>
                  )}
                  <div className="space-y-1.5">
                    {list.map((s, i) => (
                      <div key={i} className="flex gap-1.5 items-center">
                        <input
                          className="input text-xs flex-1"
                          placeholder="Tur nomi"
                          value={s}
                          onChange={(e) => {
                            const next = { ...(draft.complaintSubtypes ?? {}) };
                            const arr = [...list];
                            arr[i] = e.target.value;
                            next[dir] = arr;
                            setDraft({ ...draft, complaintSubtypes: next });
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const next = { ...(draft.complaintSubtypes ?? {}) };
                            next[dir] = list.filter((_, idx) => idx !== i);
                            setDraft({ ...draft, complaintSubtypes: next });
                          }}
                          className="p-1 text-rose-500 hover:bg-rose-50 rounded"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
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
                <button onClick={cleanupLegacy} disabled={kvBusy} className="btn-danger text-xs disabled:opacity-50">
                  <Trash2 className="h-4 w-4" /> Eski snapshot'ni tozalash
                </button>
              </div>
              <p className="text-[11px] text-slate-500 mt-2">
                "Eski snapshot'ni tozalash" — Vercel KV'dagi eski katta <code>ipost:state:v1</code> blokini
                o'chiradi (joy bo'shatadi). Joriy ma'lumotlarga ta'sir qilmaydi.
              </p>
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

function SipField({
  label, value, onChange, placeholder, type = 'text',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-slate-500 mb-1">{label}</span>
      <input
        type={type}
        className="input"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="off"
      />
    </label>
  );
}
