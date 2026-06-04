import { useState } from 'react';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import toast from 'react-hot-toast';
import AsyncButton from '../components/AsyncButton';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import { useApp } from '../context/AppContext';
import type { Stage, StageField } from '../types';
import { randomId } from '../utils/format';

const COLORS = ['#3b82f6', '#f59e0b', '#a855f7', '#16a34a', '#ef4444', '#0ea5e9', '#64748b'];

export default function StagesPage() {
  const { stages, saveStage, deleteStage } = useApp();
  const [editing, setEditing] = useState<Stage | null>(null);
  const [open, setOpen] = useState(false);

  function startCreate() {
    setEditing({
      id: randomId('stg'),
      name: '',
      color: COLORS[0],
      order: stages.length,
      fields: [],
    });
    setOpen(true);
  }

  function startEdit(s: Stage) {
    setEditing(structuredClone(s));
    setOpen(true);
  }

  async function save() {
    if (!editing) return;
    if (!editing.name.trim()) {
      toast.error('Bosqich nomini kiriting');
      return;
    }
    await saveStage(editing);
    toast.success('Saqlandi');
    setOpen(false);
  }

  async function remove(s: Stage) {
    if (!confirm(`${s.name} bosqichini o'chirishni tasdiqlaysizmi?`)) return;
    await deleteStage(s.id);
    toast.success("O'chirildi");
  }

  function addField() {
    if (!editing) return;
    const f: StageField = { key: `field_${editing.fields.length + 1}`, label: 'Yangi maydon', type: 'text' };
    setEditing({ ...editing, fields: [...editing.fields, f] });
  }

  function updateField(idx: number, patch: Partial<StageField>) {
    if (!editing) return;
    const next = [...editing.fields];
    next[idx] = { ...next[idx], ...patch };
    setEditing({ ...editing, fields: next });
  }

  function removeField(idx: number) {
    if (!editing) return;
    setEditing({ ...editing, fields: editing.fields.filter((_, i) => i !== idx) });
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <PageHeader
        title="Bosqichlar (Pipeline)"
        subtitle="CRM jarayon bosqichlari va ularning dinamik maydonlari"
        actions={
          <button className="btn-primary" onClick={startCreate}>
            <Plus className="h-4 w-4" /> Yangi bosqich
          </button>
        }
      />

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {stages.map((s) => (
          <div key={s.id} className="card p-4">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full" style={{ background: s.color }} />
              <div className="font-bold text-slate-800 flex-1">{s.name}</div>
              <AsyncButton
                onClick={() => remove(s)}
                title="O'chirish"
                className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-600"
                loadingText="..."
              >
                <Trash2 className="h-4 w-4" />
              </AsyncButton>
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {s.fields.length} ta dinamik maydon · tartib #{s.order}
            </div>
            <button onClick={() => startEdit(s)} className="btn-ghost mt-3 w-full text-xs">
              Tahrirlash
            </button>
          </div>
        ))}
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing?.name ? `Bosqich: ${editing.name}` : 'Yangi bosqich'}
        size="lg"
      >
        {editing && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Nomi</label>
                <input
                  className="input mt-1"
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Tartib</label>
                <input
                  type="number"
                  className="input mt-1"
                  value={editing.order}
                  onChange={(e) => setEditing({ ...editing, order: Number(e.target.value) })}
                />
              </div>
            </div>
            <div>
              <label className="label">Rang</label>
              <div className="flex gap-2 mt-2 flex-wrap">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setEditing({ ...editing, color: c })}
                    className={`h-8 w-8 rounded-full border-2 ${
                      editing.color === c ? 'border-slate-900' : 'border-transparent'
                    }`}
                    style={{ background: c }}
                  />
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="label">Dinamik maydonlar</label>
                <button onClick={addField} className="btn-ghost text-xs">
                  <Plus className="h-3.5 w-3.5" /> Maydon qo'shish
                </button>
              </div>
              <div className="space-y-2 mt-2">
                {editing.fields.map((f, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                    <GripVertical className="h-4 w-4 text-slate-400 col-span-1" />
                    <input
                      className="input col-span-3"
                      placeholder="Kalit"
                      value={f.key}
                      onChange={(e) => updateField(idx, { key: e.target.value })}
                    />
                    <input
                      className="input col-span-4"
                      placeholder="Yorliq"
                      value={f.label}
                      onChange={(e) => updateField(idx, { label: e.target.value })}
                    />
                    <select
                      className="input col-span-3"
                      value={f.type}
                      onChange={(e) => updateField(idx, { type: e.target.value as StageField['type'] })}
                    >
                      <option value="text">text</option>
                      <option value="textarea">textarea</option>
                      <option value="number">number</option>
                      <option value="phone">phone</option>
                      <option value="select">select</option>
                    </select>
                    <button
                      onClick={() => removeField(idx)}
                      className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-600 col-span-1 justify-self-end"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    {f.type === 'select' && (
                      <input
                        className="input col-span-12"
                        placeholder="Variantlar (vergul bilan ajrating)"
                        value={(f.options ?? []).join(', ')}
                        onChange={(e) =>
                          updateField(idx, {
                            options: e.target.value
                              .split(',')
                              .map((x) => x.trim())
                              .filter(Boolean),
                          })
                        }
                      />
                    )}
                  </div>
                ))}
                {editing.fields.length === 0 && (
                  <div className="text-xs text-slate-400 text-center py-3">
                    Hozircha maydon yo'q
                  </div>
                )}
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
