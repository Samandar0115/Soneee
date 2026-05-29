import { useRef, useState } from 'react';
import { Camera, KeyRound, Save, User as UserIcon, Upload, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { useApp } from '../context/AppContext';
import { compressImageDataUrl } from '../utils/image';

export default function Profile() {
  const { currentUser, updateOwnProfile } = useApp();
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
    </div>
  );
}
