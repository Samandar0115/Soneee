import { useState } from 'react';
import { ShieldCheck, Plus, Pencil, Trash2, X, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from '../components/PageHeader';
import { useApp } from '../context/AppContext';
import type { PageKey, RoleDef } from '../types';
import { randomId } from '../utils/format';

const PAGE_LABELS: Record<PageKey, string> = {
  dashboard: 'Bosh sahifa',
  leads: 'Yangi murojaatlar',
  pipeline: 'Pipeline',
  tickets: 'Murojaatlar',
  calls: "Qo'ng'iroqlar",
  cargo: 'Vozvrat yuklar',
  warehouse: 'Sklad navbati',
  knowledge: 'Bilim bazasi',
  learn: "O'quv markazi",
  analytics: 'Analitika',
  users: 'Xodimlar',
  stages: 'Bosqichlar',
  categories: 'Kategoriyalar',
  templates: 'Shablonlar',
  curriculum: 'Darslik boshqaruvi',
  roles: 'Rollar',
  settings: 'Sozlamalar',
  b2b: 'B2B KAM CRM',
};
const ALL_PAGES = Object.keys(PAGE_LABELS) as PageKey[];

function blankRole(): RoleDef {
  return {
    id: randomId('role'),
    name: '',
    manage: false,
    canEdit: false,
    canDelete: false,
    pages: ['dashboard', 'leads', 'tickets'],
    isSystem: false,
    createdAt: Date.now(),
  };
}

export default function Roles() {
  const { roles, saveRole, deleteRole } = useApp();
  const [editing, setEditing] = useState<RoleDef | null>(null);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <PageHeader
        title="Rollar va ruxsatlar"
        subtitle="Yangi rol yaratib, u qaysi bo'limlarni ko'rishi va nima qila olishini belgilang"
        actions={
          <button className="btn-primary" onClick={() => setEditing(blankRole())}>
            <Plus className="h-4 w-4" /> Yangi rol
          </button>
        }
      />

      <div className="space-y-2">
        {roles.map((r) => (
          <div key={r.id} className={`card p-4 flex items-center gap-3 ${
            r.id === 'b2b_kam'
              ? 'border-l-4 border-l-indigo-500 bg-gradient-to-r from-indigo-50/40 to-fuchsia-50/20 dark:from-indigo-950/30 dark:to-fuchsia-950/20'
              : ''
          }`}>
            <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${
              r.id === 'b2b_kam'
                ? 'bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white shadow-md'
                : 'bg-brand-500/15 text-brand-500'
            }`}>
              {r.id === 'b2b_kam' ? <span className="text-base">✨</span> : <ShieldCheck className="h-5 w-5" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-slate-800 dark:text-white flex items-center gap-2 flex-wrap">
                {r.name}
                {r.isSystem && <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-500">tizim</span>}
                {r.manage && <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600">to'liq</span>}
                {r.id === 'b2b_kam' && <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-white font-bold">B2B Workspace</span>}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                {r.manage ? 'Barcha bo\'limlar + boshqaruv' : `${r.pages.length} bo'lim`}
                {!r.manage && (r.canEdit ? ' · tahrirlaydi' : ' · faqat ko\'radi')}
                {!r.manage && r.canDelete ? ' · o\'chiradi' : ''}
              </div>
            </div>
            <button onClick={() => setEditing(r)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500" title="Tahrirlash">
              <Pencil className="h-4 w-4" />
            </button>
            {!r.isSystem && (
              <button
                onClick={() => {
                  if (confirm(`"${r.name}" roli o'chirilsinmi?`)) {
                    void deleteRole(r.id);
                    toast.success("Rol o'chirildi");
                  }
                }}
                className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-red-500"
                title="O'chirish"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      {editing && (
        <RoleEditor
          role={editing}
          onClose={() => setEditing(null)}
          onSave={async (r) => {
            if (!r.name.trim()) { toast.error('Rol nomini kiriting'); return; }
            try {
              await saveRole(r);
              toast.success('Saqlandi');
              setEditing(null);
            } catch (e) { toast.error((e as Error).message); }
          }}
        />
      )}
    </div>
  );
}

function RoleEditor({ role, onClose, onSave }: { role: RoleDef; onClose: () => void; onSave: (r: RoleDef) => void }) {
  const [draft, setDraft] = useState<RoleDef>(role);
  const togglePage = (p: PageKey) =>
    setDraft((d) => ({ ...d, pages: d.pages.includes(p) ? d.pages.filter((x) => x !== p) : [...d.pages, p] }));

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm overflow-y-auto p-4">
      <div className="w-full max-w-lg my-4 rounded-2xl bg-white dark:bg-slate-900 shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
          <h2 className="font-bold text-slate-800 dark:text-white">Rol sozlamalari</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="label">Rol nomi</label>
            <input
              className="input mt-1"
              value={draft.name}
              disabled={draft.isSystem}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder="Masalan: Ombor xodimi, Supervisor"
            />
            {draft.isSystem && <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1"><Lock className="h-3 w-3" /> Tizim roli nomi o'zgartirilmaydi</p>}
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer">
              <input type="checkbox" checked={draft.manage} onChange={(e) => setDraft({ ...draft, manage: e.target.checked })} />
              <div>
                <div className="font-semibold text-sm">To'liq boshqaruv (admin)</div>
                <div className="text-xs text-slate-500">Barcha bo'limlar + xodimlar, rollar, sozlamalar</div>
              </div>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex items-center gap-2 p-3 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer">
                <input type="checkbox" checked={draft.canEdit} disabled={draft.manage} onChange={(e) => setDraft({ ...draft, canEdit: e.target.checked })} />
                <span className="text-sm">Tahrirlay oladi</span>
              </label>
              <label className="flex items-center gap-2 p-3 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer">
                <input type="checkbox" checked={draft.canDelete} disabled={draft.manage} onChange={(e) => setDraft({ ...draft, canDelete: e.target.checked })} />
                <span className="text-sm">O'chira oladi</span>
              </label>
            </div>
          </div>

          {!draft.manage && (
            <div>
              <label className="label mb-2 block">Kira oladigan bo'limlar</label>
              <div className="grid grid-cols-2 gap-1.5">
                {ALL_PAGES.filter((p) => !['users', 'roles', 'settings', 'stages', 'categories', 'templates', 'curriculum', 'analytics'].includes(p)).map((p) => (
                  <label key={p} className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm cursor-pointer transition ${draft.pages.includes(p) ? 'border-brand-400 bg-brand-50 dark:bg-brand-500/10' : 'border-slate-200 dark:border-slate-800'}`}>
                    <input type="checkbox" checked={draft.pages.includes(p)} onChange={() => togglePage(p)} />
                    {PAGE_LABELS[p]}
                  </label>
                ))}
              </div>
              <p className="text-[11px] text-slate-400 mt-2">Admin bo'limlari (xodimlar, sozlamalar...) faqat "to'liq boshqaruv" rolida ochiladi.</p>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 p-5 border-t border-slate-100 dark:border-slate-800">
          <button onClick={onClose} className="btn-ghost">Bekor</button>
          <button onClick={() => onSave(draft)} className="btn-primary">Saqlash</button>
        </div>
      </div>
    </div>
  );
}
