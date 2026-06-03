import { useState } from 'react';
import { Plus, Trash2, Power, PowerOff } from 'lucide-react';
import AsyncButton from '../components/AsyncButton';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import { useApp } from '../context/AppContext';
import type { Category } from '../types';
import { randomId } from '../utils/format';

const COLORS = ['#ef4444', '#f97316', '#f59e0b', '#22c55e', '#16a34a', '#0ea5e9', '#3b82f6', '#6366f1', '#a855f7', '#ec4899', '#64748b', '#0f172a'];
const ICONS = ['📦', '🔀', '🏬', '⚠️', '⏱️', '💳', '💬', '📝', '🚚', '📞', '🛠️', '📍', '🧾', '⭐', '❓', '✅'];

export default function CategoriesPage() {
  const { categories, saveCategory, deleteCategory, tickets } = useApp();
  const [editing, setEditing] = useState<Category | null>(null);
  const [open, setOpen] = useState(false);

  function startCreate() {
    setEditing({
      id: randomId('cat'),
      name: '',
      description: '',
      color: COLORS[0],
      icon: ICONS[0],
      order: categories.length,
      active: true,
    });
    setOpen(true);
  }

  function startEdit(c: Category) {
    setEditing({ ...c });
    setOpen(true);
  }

  async function save() {
    if (!editing) return;
    if (!editing.name.trim()) {
      toast.error('Toifa nomini kiriting');
      return;
    }
    await saveCategory(editing);
    toast.success('Saqlandi');
    setOpen(false);
  }

  async function remove(c: Category) {
    const used = tickets.some((t) => t.categoryId === c.id);
    if (used) {
      toast.error("Bu toifada murojaatlar bor — avval ularni boshqa toifaga ko'chiring");
      return;
    }
    if (!confirm(`"${c.name}" toifasini o'chirishni tasdiqlaysizmi?`)) return;
    await deleteCategory(c.id);
    toast.success("O'chirildi");
  }

  async function toggleActive(c: Category) {
    await saveCategory({ ...c, active: !c.active });
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <PageHeader
        title="Murojaat turlari (Yo'nalishlar)"
        subtitle="Operator yangi murojaat ochganda shu ro'yxatdan tanlaydi. O'zingiz qo'shing, tahrirlang, faolsizlantiring."
        actions={
          <button className="btn-primary" onClick={startCreate}>
            <Plus className="h-4 w-4" /> Yangi tur
          </button>
        }
      />

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((c) => {
          const count = tickets.filter((t) => t.categoryId === c.id).length;
          return (
            <motion.div
              key={c.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`card p-4 relative ${!c.active ? 'opacity-60' : ''}`}
            >
              <div className="flex items-start gap-3">
                <div
                  className="h-12 w-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                  style={{ background: `${c.color}1a`, border: `1px solid ${c.color}55` }}
                >
                  {c.icon || '📌'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-slate-800 truncate">{c.name}</div>
                  {c.description && (
                    <div className="text-xs text-slate-500 mt-0.5 line-clamp-2">{c.description}</div>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <span
                      className="badge"
                      style={{ background: `${c.color}22`, color: c.color }}
                    >
                      {count} murojaat
                    </span>
                    <span className={`badge ${c.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
                      {c.active ? 'Faol' : 'Faol emas'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3">
                <button onClick={() => startEdit(c)} className="btn-ghost flex-1 text-xs">
                  Tahrirlash
                </button>
                <AsyncButton
                  onClick={() => toggleActive(c)}
                  title={c.active ? 'Faolsizlantirish' : 'Faollashtirish'}
                  className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600"
                  loadingText="..."
                >
                  {c.active ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                </AsyncButton>
                <AsyncButton
                  onClick={() => remove(c)}
                  title="O'chirish"
                  className="p-2 rounded-xl border border-rose-200 hover:bg-rose-50 text-rose-600"
                  loadingText="..."
                >
                  <Trash2 className="h-4 w-4" />
                </AsyncButton>
              </div>
            </motion.div>
          );
        })}
        {categories.length === 0 && (
          <div className="col-span-full card p-10 text-center text-slate-400">
            Hozircha toifa yo'q. Yangi tur tugmasini bosing.
          </div>
        )}
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing?.name ? `Toifa: ${editing.name}` : 'Yangi toifa'}
        size="lg"
      >
        {editing && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div
                className="h-14 w-14 rounded-xl flex items-center justify-center text-3xl"
                style={{ background: `${editing.color}1a`, border: `1px solid ${editing.color}55` }}
              >
                {editing.icon || '📌'}
              </div>
              <div className="flex-1">
                <label className="label">Nomi</label>
                <input
                  className="input mt-1"
                  autoFocus
                  placeholder="Masalan: Yuk yo'qolgan"
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="label">Tavsif (ixtiyoriy)</label>
              <textarea
                className="input mt-1"
                rows={2}
                placeholder="Bu toifa qachon ishlatilishi haqida qisqacha tushuntirish"
                value={editing.description ?? ''}
                onChange={(e) => setEditing({ ...editing, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Tartib raqami</label>
                <input
                  type="number"
                  className="input mt-1"
                  value={editing.order}
                  onChange={(e) => setEditing({ ...editing, order: Number(e.target.value) })}
                />
              </div>
              <div className="flex items-end gap-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editing.active}
                    onChange={(e) => setEditing({ ...editing, active: e.target.checked })}
                    className="h-4 w-4 rounded"
                  />
                  <span className="text-sm font-semibold text-slate-700">Faol (operatorlarga ko'rinadi)</span>
                </label>
              </div>
            </div>

            <div>
              <label className="label">Rang</label>
              <div className="flex gap-2 mt-2 flex-wrap">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setEditing({ ...editing, color: c })}
                    className={`h-8 w-8 rounded-full border-2 transition ${
                      editing.color === c ? 'border-slate-900 scale-110' : 'border-transparent'
                    }`}
                    style={{ background: c }}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="label">Belgi (icon)</label>
              <div className="flex gap-1.5 mt-2 flex-wrap">
                {ICONS.map((ic) => (
                  <button
                    key={ic}
                    type="button"
                    onClick={() => setEditing({ ...editing, icon: ic })}
                    className={`h-10 w-10 rounded-xl border text-xl transition ${
                      editing.icon === ic
                        ? 'border-brand-500 bg-brand-50'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {ic}
                  </button>
                ))}
                <input
                  className="input w-20 text-center text-lg"
                  placeholder="🔧"
                  value={editing.icon ?? ''}
                  maxLength={2}
                  onChange={(e) => setEditing({ ...editing, icon: e.target.value })}
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                O'zingizning emoji yoki belgini ham kirita olasiz
              </p>
            </div>

            {/* MAYDONLAR — operator shu toifa tanlaganda chiqadigan kichik maydonlar */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">To'ldiriladigan maydonlar</div>
                  <div className="text-[11px] text-slate-500">Operator shu toifani tanlaganda chiqadi. Qisqa va aniq qiling.</div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditing({
                    ...editing,
                    fields: [...(editing.fields ?? []), { key: 'f_' + Date.now(), label: '', type: 'text', required: false }],
                  })}
                  className="btn-ghost text-xs"
                >
                  <Plus className="h-3.5 w-3.5" /> Maydon
                </button>
              </div>
              {(editing.fields ?? []).length === 0 && (
                <p className="text-[11px] text-slate-400">Hozircha maydon yo'q. "+ Maydon" bossangiz qo'shiladi.</p>
              )}
              <div className="space-y-2">
                {(editing.fields ?? []).map((f, i) => (
                  <div key={f.key} className="flex gap-1.5 items-center flex-wrap">
                    <input
                      className="input text-xs flex-1 min-w-[140px]"
                      placeholder="Maydon nomi"
                      value={f.label}
                      onChange={(e) => {
                        const fields = [...(editing.fields ?? [])];
                        fields[i] = { ...fields[i], label: e.target.value };
                        setEditing({ ...editing, fields });
                      }}
                    />
                    <select
                      className="input text-xs w-28"
                      value={f.type}
                      onChange={(e) => {
                        const fields = [...(editing.fields ?? [])];
                        fields[i] = { ...fields[i], type: e.target.value as 'text' };
                        setEditing({ ...editing, fields });
                      }}
                    >
                      <option value="text">Matn</option>
                      <option value="textarea">Uzun matn</option>
                      <option value="number">Raqam</option>
                      <option value="phone">Telefon</option>
                    </select>
                    <label className="flex items-center gap-1 text-[11px] text-slate-600">
                      <input
                        type="checkbox"
                        checked={!!f.required}
                        onChange={(e) => {
                          const fields = [...(editing.fields ?? [])];
                          fields[i] = { ...fields[i], required: e.target.checked };
                          setEditing({ ...editing, fields });
                        }}
                      />
                      Majburiy
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const fields = (editing.fields ?? []).filter((_, idx) => idx !== i);
                        setEditing({ ...editing, fields });
                      }}
                      className="p-1 text-rose-500 hover:bg-rose-50 rounded"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
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
