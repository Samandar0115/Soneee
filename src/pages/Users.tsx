import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import { useApp } from '../context/AppContext';
import type { User } from '../types';
import { randomId } from '../utils/format';

export default function UsersPage() {
  const { users, saveUser, deleteUser, currentUser } = useApp();
  const [editing, setEditing] = useState<User | null>(null);
  const [open, setOpen] = useState(false);

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
    await saveUser(editing);
    toast.success('Saqlandi');
    setOpen(false);
  }

  async function remove(u: User) {
    if (u.id === currentUser?.id) {
      toast.error("O'zingizni o'chira olmaysiz");
      return;
    }
    if (!confirm(`${u.username} ni o'chirishni tasdiqlaysizmi?`)) return;
    await deleteUser(u.id);
    toast.success("O'chirildi");
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <PageHeader
        title="Xodimlar"
        subtitle="Administrator va operatorlarni boshqarish"
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
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3 font-semibold text-slate-800 cursor-pointer" onClick={() => startEdit(u)}>
                  {u.fullName ?? '—'}
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
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => remove(u)}
                    className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={editing?.username ? 'Xodimni tahrirlash' : 'Yangi xodim'}>
        {editing && (
          <div className="space-y-3">
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
                <label className="label">Rol</label>
                <select
                  className="input mt-1"
                  value={editing.role}
                  onChange={(e) => setEditing({ ...editing, role: e.target.value as User['role'] })}
                >
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
            <button onClick={save} className="btn-primary w-full">
              Saqlash
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
