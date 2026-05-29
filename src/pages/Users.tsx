import { useMemo, useRef, useState } from 'react';
import { Plus, Trash2, ShieldAlert, Lock, Camera, ScanFace, CheckCircle2, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import CameraCapture from '../components/CameraCapture';
import { useApp } from '../context/AppContext';
import type { User } from '../types';
import { randomId, formatDateTime } from '../utils/format';
import { imageDataUrlToDescriptor, loadFaceModels } from '../utils/face';
import { compressImageDataUrl } from '../utils/image';

export default function UsersPage() {
  const { users, tickets, saveUser, deleteUser, currentUser, profileChanges } = useApp();
  const [editing, setEditing] = useState<User | null>(null);
  const [open, setOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const photoInputRef = useRef<HTMLInputElement | null>(null);

  async function processDataUrl(dataUrl: string) {
    if (!editing) return;
    setScanning(true);
    toast.loading('Yuz aniqlanmoqda...', { id: 'face' });
    try {
      await loadFaceModels();
      const desc = await imageDataUrlToDescriptor(dataUrl);
      if (!desc) {
        toast.error('Rasmda yuz topilmadi', { id: 'face' });
        setScanning(false);
        return;
      }
      // Bazaga yuborishdan oldin rasmni kichraytiramiz (har bir xodim ~10-40 KB).
      // Aks holda 6+ xodim qo'shganda kolleksiya 4.5 MB chegarasidan oshib saqlanmay qoladi.
      let compressed = dataUrl;
      try {
        compressed = await compressImageDataUrl(dataUrl, { maxDim: 400, quality: 0.78 });
      } catch {
        // siqish ishlamasa asl rasmni qoldiramiz
      }
      setEditing({
        ...editing,
        photo: compressed,
        faceDescriptor: Array.from(desc),
      });
      toast.success('Yuz qayd etildi', { id: 'face' });
    } catch (err) {
      toast.error('Modellar yuklanmadi (internetni tekshiring)', { id: 'face' });
    } finally {
      setScanning(false);
    }
  }

  async function handlePhotoUpload(file: File) {
    if (!editing) return;
    if (file.size > 4 * 1024 * 1024) {
      toast.error('Rasm 4 MB dan katta');
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      await processDataUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  async function handleCameraCapture(dataUrl: string) {
    await processDataUrl(dataUrl);
  }

  const stats = useMemo(() => {
    const map = new Map<string, { active: number; total: number; resolved: number }>();
    users.forEach((u) => map.set(u.id, { active: 0, total: 0, resolved: 0 }));
    tickets.forEach((t) => {
      if (!t.assigneeId) return;
      const s = map.get(t.assigneeId);
      if (!s) return;
      s.total++;
      if (t.status === 'resolved') s.resolved++;
      else s.active++;
    });
    return map;
  }, [users, tickets]);

  function activeCount(u: User) {
    return stats.get(u.id)?.active ?? 0;
  }

  function startCreate() {
    setEditing({
      id: randomId('u'),
      username: '',
      password: '',
      role: 'operator',
      fullName: '',
      phone: '',
      createdAt: Date.now(),
    });
    setOpen(true);
  }

  function startEdit(u: User) {
    setEditing({ ...u });
    setOpen(true);
  }

  async function save() {
    if (!editing) return;
    if (!editing.username.trim() || !editing.password.trim()) {
      toast.error("Username va parol majburiy");
      return;
    }
    const existing = users.find((u) => u.id === editing.id);
    if (existing && activeCount(existing) > 0 && existing.role !== editing.role) {
      toast.error("Bu xodimda aktiv murojaatlar bor — rolini o'zgartirib bo'lmaydi");
      return;
    }
    const tid = toast.loading('Bazaga saqlanmoqda...');
    try {
      await saveUser(editing);
      toast.success('Saqlandi ✓', { id: tid });
      setOpen(false);
    } catch (err) {
      toast.error((err as Error).message || 'Saqlanmadi', { id: tid });
    }
  }

  async function remove(u: User) {
    if (u.id === currentUser?.id) {
      toast.error("O'zingizni o'chira olmaysiz");
      return;
    }
    const count = activeCount(u);
    if (count > 0) {
      toast.error(`Bu xodimda ${count} ta aktiv murojaat bor — avval boshqa operatorga biriktiring`);
      return;
    }
    if (!confirm(`${u.username} ni o'chirishni tasdiqlaysizmi?`)) return;
    await deleteUser(u.id);
    toast.success("O'chirildi");
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <PageHeader
        title="Xodimlar"
        subtitle="Administrator va operatorlarni boshqarish. Aktiv murojaatga ega xodimni o'chirib yoki rolini o'zgartirib bo'lmaydi."
        actions={
          <button className="btn-primary" onClick={startCreate}>
            <Plus className="h-4 w-4" /> Yangi xodim
          </button>
        }
      />

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200">
              <th className="px-4 py-3">F.I.O</th>
              <th className="px-4 py-3">Username</th>
              <th className="px-4 py-3">Roli</th>
              <th className="px-4 py-3">Telefon</th>
              <th className="px-4 py-3">Yuklanish</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const s = stats.get(u.id) ?? { active: 0, total: 0, resolved: 0 };
              const locked = s.active > 0;
              return (
                <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-slate-800 cursor-pointer" onClick={() => startEdit(u)}>
                    <div className="flex items-center gap-2">
                      {u.photo ? (
                        <img src={u.photo} alt={u.username} className="h-8 w-8 rounded-full object-cover" />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-brand-500 text-white flex items-center justify-center text-xs font-bold">
                          {(u.fullName ?? u.username)[0]?.toUpperCase()}
                        </div>
                      )}
                      <span>{u.fullName ?? '—'}</span>
                      {u.faceDescriptor && u.faceDescriptor.length > 0 && (
                        <ScanFace className="h-3.5 w-3.5 text-emerald-500" />
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600 cursor-pointer" onClick={() => startEdit(u)}>
                    {u.username}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`badge ${u.role === 'admin' ? 'bg-brand-100 text-brand-700' : 'bg-slate-100 text-slate-700'}`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{u.phone ?? '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="badge bg-amber-100 text-amber-700">
                        {s.active} aktiv
                      </span>
                      <span className="badge bg-emerald-100 text-emerald-700">
                        {s.resolved} hal
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => remove(u)}
                      disabled={locked || u.id === currentUser?.id}
                      title={locked ? `Aktiv ${s.active} ta murojaat bor` : "O'chirish"}
                      className={`p-1.5 rounded-lg ${
                        locked || u.id === currentUser?.id
                          ? 'text-slate-300 cursor-not-allowed'
                          : 'hover:bg-rose-50 text-rose-600'
                      }`}
                    >
                      {locked ? <Lock className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Profil o'zgarishlari jurnali (xodimlar o'z rasmi/parolini o'zgartirsa) */}
      {profileChanges.length > 0 && (
        <div className="card mt-5 p-5">
          <h3 className="font-bold text-slate-800 dark:text-white mb-3">Profil o'zgarishlari jurnali</h3>
          <div className="max-h-80 overflow-y-auto scroll-thin divide-y divide-slate-100 dark:divide-slate-800">
            {profileChanges.slice(0, 200).map((pc) => {
              const fieldLabel =
                pc.field === 'photo' ? 'rasm' :
                pc.field === 'password' ? 'parol' :
                pc.field === 'name' ? 'ism' : 'telefon';
              return (
                <div key={pc.id} className="flex items-center justify-between py-2 text-sm">
                  <div>
                    <span className="font-semibold text-slate-700 dark:text-slate-200">{pc.userName ?? pc.userId}</span>
                    <span className="text-slate-500"> — {fieldLabel}ni o'zgartirdi</span>
                  </div>
                  <span className="text-xs text-slate-400">{formatDateTime(pc.changedAt)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing?.username ? 'Xodimni tahrirlash' : 'Yangi xodim'}>
        {editing && (() => {
          const existing = users.find((u) => u.id === editing.id);
          const active = existing ? activeCount(existing) : 0;
          const roleLocked = active > 0;
          return (
            <div className="space-y-3">
              {roleLocked && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                  <ShieldAlert className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <div>
                    Bu xodimda <b>{active} ta aktiv murojaat</b> bor. Roli bloklangan — avval murojaatlarni boshqa operatorga biriktiring.
                  </div>
                </div>
              )}

              <div>
                <label className="label">F.I.O</label>
                <input
                  className="input mt-1"
                  value={editing.fullName ?? ''}
                  onChange={(e) => setEditing({ ...editing, fullName: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Username</label>
                  <input
                    className="input mt-1"
                    value={editing.username}
                    onChange={(e) => setEditing({ ...editing, username: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Parol</label>
                  <input
                    className="input mt-1"
                    value={editing.password}
                    onChange={(e) => setEditing({ ...editing, password: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label flex items-center gap-1">
                    Rol {roleLocked && <Lock className="h-3 w-3" />}
                  </label>
                  <select
                    className="input mt-1 disabled:bg-slate-100"
                    value={editing.role}
                    disabled={roleLocked}
                    onChange={(e) => setEditing({ ...editing, role: e.target.value as User['role'] })}
                  >
                    <option value="learner">O'quvchi (darslik)</option>
                    <option value="operator">Operator</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="label">Telefon</label>
                  <input
                    className="input mt-1"
                    value={editing.phone ?? ''}
                    onChange={(e) => setEditing({ ...editing, phone: e.target.value })}
                  />
                </div>
              </div>

              {editing.role !== 'learner' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">SIP raqam (ichki, ixtiyoriy)</label>
                    <input
                      className="input mt-1"
                      placeholder="masalan 1001"
                      value={editing.sipExtension ?? ''}
                      onChange={(e) => setEditing({ ...editing, sipExtension: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="label">SIP parol (ixtiyoriy)</label>
                    <input
                      type="password"
                      className="input mt-1"
                      placeholder="shaxsiy parol"
                      autoComplete="new-password"
                      value={editing.sipPassword ?? ''}
                      onChange={(e) => setEditing({ ...editing, sipPassword: e.target.value })}
                    />
                  </div>
                  <p className="col-span-2 text-[11px] text-slate-400 -mt-1">
                    Bo'sh qoldirilsa, Sozlamalardagi umumiy SIP raqam ishlatiladi.
                  </p>
                </div>
              )}

              <div className="border-t border-slate-200 dark:border-slate-700 pt-3">
                <label className="label flex items-center gap-2 mb-2">
                  <ScanFace className="h-4 w-4" /> Face ID (xodimning yuzini qayd qilish)
                </label>
                <div className="flex items-center gap-3">
                  {editing.photo ? (
                    <img
                      src={editing.photo}
                      alt="photo"
                      className="h-20 w-20 rounded-xl object-cover border-2 border-emerald-500"
                    />
                  ) : (
                    <div className="h-20 w-20 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center">
                      <Camera className="h-8 w-8 text-slate-400" />
                    </div>
                  )}
                  <div className="flex-1 space-y-1.5">
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        onClick={() => setCameraOpen(true)}
                        disabled={scanning}
                        className="btn-primary text-xs disabled:opacity-50"
                      >
                        <Camera className="h-3.5 w-3.5" />
                        {scanning ? '...' : 'Kameradan'}
                      </button>
                      <button
                        onClick={() => photoInputRef.current?.click()}
                        disabled={scanning}
                        className="btn-ghost text-xs disabled:opacity-50"
                      >
                        <Upload className="h-3.5 w-3.5" />
                        {scanning ? '...' : 'Fayldan'}
                      </button>
                    </div>
                    {editing.faceDescriptor && editing.faceDescriptor.length > 0 && (
                      <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Yuz tanildi — login Face ID orqali mumkin
                      </div>
                    )}
                    {editing.photo && (
                      <button
                        onClick={() => setEditing({ ...editing, photo: undefined, faceDescriptor: undefined })}
                        className="text-xs text-rose-600 hover:underline"
                      >
                        Rasmni o'chirish
                      </button>
                    )}
                    <p className="text-[10px] text-slate-400">
                      Aniq yorug'likdagi, faqat bitta yuz ko'rinadigan rasm yuklang
                    </p>
                  </div>
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handlePhotoUpload(f);
                      e.target.value = '';
                    }}
                  />
                </div>
              </div>

              <button onClick={save} className="btn-primary w-full">
                Saqlash
              </button>
            </div>
          );
        })()}
      </Modal>

      <CameraCapture
        open={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onCapture={handleCameraCapture}
      />
    </div>
  );
}
