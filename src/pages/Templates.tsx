import { useState } from 'react';
import { Plus, Trash2, MessageSquare, Power, PowerOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import { useApp } from '../context/AppContext';
import type { ResponseTemplate } from '../types';
import { randomId } from '../utils/format';

export default function TemplatesPage() {
  const { templates, saveTemplate, deleteTemplate } = useApp();
  const [editing, setEditing] = useState<ResponseTemplate | null>(null);
  const [open, setOpen] = useState(false);

  function startCreate() {
    setEditing({
      id: randomId('tpl'),
      title: '',
      body: '',
      category: '',
      order: templates.length,
      active: true,
      createdAt: Date.now(),
    });
    setOpen(true);
  }

  async function save() {
    if (!editing) return;
    if (!editing.title.trim() || !editing.body.trim()) {
      toast.error('Sarlavha va matn majburiy');
      return;
    }
    await saveTemplate(editing);
    toast.success('Saqlandi');
    setOpen(false);
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <PageHeader
        title="Tezkor javob shablonlari"
        subtitle="Operatorlar TicketModal'da bir bosishda shu matnlardan foydalanadi. Vaqt 3-5 marta tejaladi."
        actions={
          <button className="btn-primary" onClick={startCreate}>
            <Plus className="h-4 w-4" /> Yangi shablon
          </button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {templates.map((tpl) => (
          <motion.div
            key={tpl.id}
            layout
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className={`card p-4 ${!tpl.active ? 'opacity-60' : ''}`}
          >
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-xl bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400 flex items-center justify-center flex-shrink-0">
                <MessageSquare className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="font-bold truncate">{tpl.title}</div>
                  {tpl.category && (
                    <span className="badge bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {tpl.category}
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 line-clamp-3 whitespace-pre-wrap">
                  {tpl.body}
                </p>
              </div>
            </div>
            <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => {
                  setEditing(tpl);
                  setOpen(true);
                }}
                className="btn-ghost flex-1 text-xs"
              >
                Tahrirlash
              </button>
              <button
                onClick={() => saveTemplate({ ...tpl, active: !tpl.active })}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                title={tpl.active ? 'Faolsizlantirish' : 'Faollashtirish'}
              >
                {tpl.active ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
              </button>
              <button
                onClick={() => {
                  if (confirm("Shablon o'chirilsinmi?")) {
                    deleteTemplate(tpl.id);
                    toast.success("O'chirildi");
                  }
                }}
                className="p-2 rounded-xl border border-rose-200 dark:border-rose-800 hover:bg-rose-50 dark:hover:bg-rose-900/30 text-rose-600"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        ))}
        {templates.length === 0 && (
          <div className="col-span-full card p-10 text-center text-slate-400">
            Shablon yo'q — yangisini yarating
          </div>
        )}
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing?.title ? 'Shablonni tahrirlash' : 'Yangi shablon'}
        size="lg"
      >
        {editing && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Sarlavha</label>
                <input
                  className="input mt-1"
                  placeholder="Masalan: Salomlashish"
                  value={editing.title}
                  onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Toifa (ixtiyoriy)</label>
                <input
                  className="input mt-1"
                  placeholder="salomlashish / uzr / so'rov / holat"
                  value={editing.category ?? ''}
                  onChange={(e) => setEditing({ ...editing, category: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="label">Matn</label>
              <textarea
                className="input mt-1"
                rows={6}
                placeholder="Operator mijozga aytadigan tayyor matn..."
                value={editing.body}
                onChange={(e) => setEditing({ ...editing, body: e.target.value })}
              />
              <div className="text-[11px] text-slate-400 mt-1">
                Maslahat: {'{ism}'}, {'{trek}'} kabi belgilar — kelajakda avto-almashtirish uchun.
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Tartib</label>
                <input
                  type="number"
                  className="input mt-1"
                  value={editing.order}
                  onChange={(e) => setEditing({ ...editing, order: Number(e.target.value) })}
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer mt-6">
                <input
                  type="checkbox"
                  checked={editing.active}
                  onChange={(e) => setEditing({ ...editing, active: e.target.checked })}
                  className="h-4 w-4"
                />
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Faol
                </span>
              </label>
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
