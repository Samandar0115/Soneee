import { useRef, useState } from 'react';
import { Camera, KeyRound, Save, User as UserIcon, Upload, ShieldCheck, MessageSquareWarning, Send, CheckCircle2, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { useApp } from '../context/AppContext';
import AsyncButton from '../components/AsyncButton';
import { compressImageDataUrl } from '../utils/image';
import { sendTelegramMessage } from '../utils/telegram';
import type { ComplaintDirection } from '../types';

const COMPLAINT_DIRS: ComplaintDirection[] = ['IT', 'Logistika', 'Xitoy ombor', 'UZB ombor', 'Moliya', 'Sifat nazorati', 'Boshqa'];

export default function Profile() {
  const { currentUser, updateOwnProfile, complaints, createComplaint, resolveComplaint, perms, settings } = useApp();
  const isAdmin = perms.manage;

  const [cDir, setCDir] = useState<ComplaintDirection>('IT');
  const [cSubtype, setCSubtype] = useState<string>('');
  const [cTrek, setCTrek] = useState('');
  const [cNote, setCNote] = useState('');

  // Yo'nalishga tegishli ichki turlar (admin sozlamalardan)
  const subtypes = settings.complaintSubtypes?.[cDir] ?? [];

  const myComplaints = (complaints ?? []).filter((c) => isAdmin || c.createdBy === currentUser?.id).sort((a, b) => b.createdAt - a.createdAt);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [photo, setPhoto] = useState<string | undefined>(currentUser?.photo);
  const [fullName, setFullName] = useState(currentUser?.fullName ?? '');
  const [username, setUsername] = useState(currentUser?.username ?? '');
  const [phone, setPhone] = useState(currentUser?.phone ?? '');
  const [pw1, setPw1] = useState('');
  const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState(false);

  if (!currentUser) return null;

  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) { toast.error('Rasm tanlang'); return; }
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const compressed = await compressImageDataUrl(reader.result as string, { maxDim: 400, quality: 0.78 });
        setPhoto(compressed);
      };
      reader.readAsDataURL(file);
    } catch {
      toast.error('Rasmni o\'qib bo\'lmadi');
    }
  }

  async function save() {
    const patch: { photo?: string; password?: string; fullName?: string; phone?: string; username?: string } = {};
    if (photo !== currentUser!.photo) patch.photo = photo;
    if (fullName !== (currentUser!.fullName ?? '')) patch.fullName = fullName;
    if (phone !== (currentUser!.phone ?? '')) patch.phone = phone;
    if (username.trim() && username.trim() !== currentUser!.username) {
      patch.username = username.trim();
    }
    if (pw1 || pw2) {
      if (pw1.length < 4) { toast.error('Parol kamida 4 ta belgi'); return; }
      if (pw1 !== pw2) { toast.error('Parollar mos kelmadi'); return; }
      patch.password = pw1;
    }
    if (Object.keys(patch).length === 0) { toast('O\'zgarish yo\'q'); return; }
    setBusy(true);
    try {
      await updateOwnProfile(patch);
      setPw1(''); setPw2('');
      toast.success('Profil saqlandi');
    } catch (e) {
      toast.error((e as Error).message || 'Saqlashda xato');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-5">
        <div className="h-11 w-11 rounded-xl bg-brand-500/15 text-brand-500 flex items-center justify-center">
          <UserIcon className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-white">Mening profilim</h1>
          <p className="text-sm text-slate-500">{currentUser.username} · {currentUser.role}</p>
        </div>
      </div>

      <div className="card p-6 space-y-5">
        {/* Rasm */}
        <div>
          <label className="label flex items-center gap-2 mb-2"><Camera className="h-4 w-4" /> Rasm</label>
          <div className="flex items-center gap-4">
            {photo ? (
              <img src={photo} alt="" className="h-20 w-20 rounded-xl object-cover border-2 border-brand-500" />
            ) : (
              <div className="h-20 w-20 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center text-2xl font-bold text-slate-400">
                {(currentUser.fullName ?? currentUser.username)[0]?.toUpperCase()}
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={() => fileRef.current?.click()} className="btn-primary text-sm">
                <Upload className="h-4 w-4" /> Rasm tanlash
              </button>
              {photo && (
                <button onClick={() => setPhoto(undefined)} className="btn-ghost text-sm">O'chirish</button>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f); e.target.value = ''; }} />
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Rasm faqat shu kompyuterda saqlanadi (KV'ga yuborilmaydi).</p>
        </div>

        {/* Ism / login / telefon */}
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="label">To'liq ism</label>
            <input className="input mt-1" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div>
            <label className="label">Login (foydalanuvchi nomi)</label>
            <input className="input mt-1" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="off" />
          </div>
          <div>
            <label className="label">Telefon</label>
            <input className="input mt-1" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
        </div>

        {/* Parol */}
        <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
          <label className="label flex items-center gap-2 mb-2"><KeyRound className="h-4 w-4" /> Parolni o'zgartirish</label>
          <div className="grid sm:grid-cols-2 gap-3">
            <input type="password" className="input" placeholder="Yangi parol" autoComplete="new-password" value={pw1} onChange={(e) => setPw1(e.target.value)} />
            <input type="password" className="input" placeholder="Parolni tasdiqlang" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Bo'sh qoldirsangiz parol o'zgarmaydi.</p>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[11px] text-slate-400 flex items-center gap-1">
            <ShieldCheck className="h-3.5 w-3.5" /> O'zgarishlar admin jurnaliga yoziladi
          </span>
          <button onClick={save} disabled={busy} className="btn-primary disabled:opacity-50">
            <Save className="h-4 w-4" /> {busy ? 'Saqlanmoqda...' : 'Saqlash'}
          </button>
        </div>
      </div>

      {/* === SHIKOYATLAR === */}
      <div className="card p-6 mt-5">
        <div className="flex items-center gap-2 mb-3">
          <MessageSquareWarning className="h-5 w-5 text-rose-500" />
          <h2 className="font-bold text-slate-800 dark:text-white">Shikoyatlar</h2>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          Ish davomida muammo bo'lsa shikoyat qoldiring — Telegram orqali kerakli bo'limga avtomatik yetkaziladi.
        </p>

        <div className="grid sm:grid-cols-2 gap-3 mb-3">
          <div>
            <label className="label">Yo'nalish</label>
            <select className="input mt-1" value={cDir} onChange={(e) => { setCDir(e.target.value as ComplaintDirection); setCSubtype(''); }}>
              {COMPLAINT_DIRS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          {subtypes.length > 0 && (
            <div>
              <label className="label">Ichki turi</label>
              <select className="input mt-1" value={cSubtype} onChange={(e) => setCSubtype(e.target.value)}>
                <option value="">— Tanlang —</option>
                {subtypes.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          )}
          <div className={subtypes.length > 0 ? 'sm:col-span-2' : ''}>
            <label className="label">Trek raqami <span className="text-slate-400">(ixtiyoriy)</span></label>
            <input className="input mt-1 font-mono" value={cTrek} onChange={(e) => setCTrek(e.target.value)} placeholder="YT123..." />
          </div>
        </div>
        <div>
          <label className="label">Izoh <span className="text-rose-500">*</span></label>
          <textarea
            rows={3}
            className="input mt-1"
            placeholder="Muammoni qisqacha tushuntiring"
            value={cNote}
            onChange={(e) => setCNote(e.target.value)}
          />
        </div>

        <AsyncButton
          onClick={async () => {
            if (!cNote.trim()) throw new Error('Izoh kerak');
            const c = await createComplaint({
              direction: cDir,
              subtype: cSubtype || undefined,
              trek: cTrek.trim() || undefined,
              note: cNote.trim(),
            });
            // Telegram'ga yuborish
            const tg = settings.telegram;
            if (tg?.enabled && tg.botToken && tg.defaultChatId) {
              const txt = [
                '⚠️ YANGI SHIKOYAT',
                '━━━━━━━━━━━━━━━━━━━',
                `Yo'nalish: ${c.direction}${c.subtype ? ` · ${c.subtype}` : ''}`,
                `Operator: ${c.createdByName}`,
                `Vaqt: ${new Date(c.createdAt).toLocaleString('uz')}`,
                c.trek ? `Trek: ${c.trek}` : '',
                '',
                `Izoh: ${c.note}`,
              ].filter(Boolean).join('\n');
              await sendTelegramMessage(tg.botToken, tg.defaultChatId, txt);
            }
            setCSubtype('');
            setCTrek('');
            setCNote('');
            toast.success('Shikoyat yuborildi');
          }}
          className="btn-primary w-full mt-3"
          loadingText="Yuborilmoqda..."
        >
          <Send className="h-4 w-4" /> Shikoyat yuborish
        </AsyncButton>

        {myComplaints.length > 0 && (
          <div className="mt-5">
            <div className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-2">
              {isAdmin ? 'Barcha shikoyatlar' : 'Mening shikoyatlarim'} ({myComplaints.length})
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto scroll-thin">
              {myComplaints.map((c) => (
                <div key={c.id} className="border border-slate-200 dark:border-slate-700 rounded-xl p-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300">
                        {c.direction}{c.subtype ? ` · ${c.subtype}` : ''}
                      </span>
                      {c.status === 'pending' && (
                        <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 inline-flex items-center gap-1">
                          <Clock className="h-3 w-3" /> Kutilmoqda
                        </span>
                      )}
                      {c.status === 'done' && (
                        <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 inline-flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Bajarildi
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400">{new Date(c.createdAt).toLocaleString('uz')}</div>
                  </div>
                  {c.trek && <div className="font-mono text-xs text-brand-600 dark:text-brand-400 mb-1">{c.trek}</div>}
                  <div className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap">{c.note}</div>
                  <div className="flex items-center justify-between gap-2 mt-2 flex-wrap">
                    <div className="text-[11px] text-slate-500">
                      {c.createdByName ?? '—'}
                      {c.status === 'done' && c.doneByName && ` · Bajardi: ${c.doneByName}`}
                    </div>
                    {isAdmin && c.status === 'pending' && (
                      <AsyncButton
                        onClick={() => resolveComplaint(c.id)}
                        successToast="Bajarildi"
                        className="px-2 py-1 rounded text-[11px] bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
                      >
                        ✓ Bajardim
                      </AsyncButton>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
