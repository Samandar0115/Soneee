import { useMemo, useState } from 'react';
import {
  Megaphone,
  MapPin,
  Coins,
  Calculator,
  Truck,
  Plus,
  Pencil,
  Trash2,
  Pin,
  PinOff,
  Phone,
  Sparkles,
  Power,
  PowerOff,
  Globe,
  Search,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import AsyncButton from '../components/AsyncButton';
import { useApp } from '../context/AppContext';
import type {
  Announcement,
  AnnouncementCategory,
  Branch,
  Region,
  TariffSettings,
  TripRoute,
} from '../types';
import { formatDateTime, randomId, timeAgo } from '../utils/format';
import { REGIONS, regionName, regionIcon } from '../utils/regions';

type Tab = 'announcements' | 'branches' | 'routes' | 'tariff' | 'calc';

const CAT_META: Record<AnnouncementCategory, { label: string; color: string; icon: string }> = {
  'china-uzb': { label: 'Xitoy → Uzb', color: '#ef4444', icon: '🇨🇳' },
  'uzb-cargo': { label: 'Uzbdagi yuklar', color: '#0ea5e9', icon: '🇺🇿' },
  payment: { label: 'To‘lov', color: '#16a34a', icon: '💳' },
  general: { label: 'Umumiy', color: '#64748b', icon: '📢' },
};

export default function Knowledge() {
  const { currentUser } = useApp();
  const isAdmin = currentUser?.role === 'admin';
  const [tab, setTab] = useState<Tab>('announcements');

  const tabs: { key: Tab; label: string; icon: typeof Megaphone }[] = [
    { key: 'announcements', label: 'E’lonlar', icon: Megaphone },
    { key: 'branches', label: 'Filiallar', icon: MapPin },
    { key: 'routes', label: 'Reyslar', icon: Truck },
    { key: 'tariff', label: 'Tariflar', icon: Coins },
    { key: 'calc', label: 'Yuk kalkulyatori', icon: Calculator },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Bilim bazasi"
        subtitle={
          isAdmin
            ? 'Operatorlar shu yerdagi ma’lumotlardan foydalanadi. Hammasini siz tahrirlaysiz.'
            : 'Sizning ish davomida kerak bo‘ladigan barcha ma’lumotlar — e’lonlar, filiallar, tariflar va kalkulyator.'
        }
      />

      <div className="card p-1.5 mb-5 inline-flex flex-wrap gap-1">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                active
                  ? 'bg-gradient-to-r from-brand-600 to-brand-500 text-white shadow-lg shadow-brand-500/30 scale-105'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:-translate-y-0.5'
              }`}
            >
              <Icon className={`h-4 w-4 transition-transform ${active ? '' : 'group-hover:scale-110'}`} />
              {t.label}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.15 }}
        >
          {tab === 'announcements' && <AnnouncementsTab isAdmin={isAdmin} />}
          {tab === 'branches' && <BranchesTab isAdmin={isAdmin} />}
          {tab === 'tariff' && <TariffTab isAdmin={isAdmin} />}
          {tab === 'routes' && <RoutesTab isAdmin={isAdmin} />}
          {tab === 'calc' && <CalculatorTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/* ============================= E'LONLAR ============================= */

function AnnouncementsTab({ isAdmin }: { isAdmin: boolean }) {
  const { announcements, saveAnnouncement, deleteAnnouncement, currentUser } = useApp();
  const [filter, setFilter] = useState<AnnouncementCategory | 'all'>('all');
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [open, setOpen] = useState(false);

  const visible = useMemo(() => {
    const list = isAdmin ? announcements : announcements.filter((a) => a.active);
    return list
      .filter((a) => filter === 'all' || a.category === filter)
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt - a.updatedAt);
  }, [announcements, filter, isAdmin]);

  function startCreate() {
    setEditing({
      id: randomId('ann'),
      category: 'general',
      title: '',
      content: '',
      pinned: false,
      active: true,
      createdBy: currentUser?.id ?? 'admin',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    setOpen(true);
  }

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <div className="flex flex-wrap gap-2">
          <Chip active={filter === 'all'} onClick={() => setFilter('all')} label="Barchasi" />
          {(Object.keys(CAT_META) as AnnouncementCategory[]).map((k) => (
            <Chip
              key={k}
              active={filter === k}
              onClick={() => setFilter(k)}
              label={`${CAT_META[k].icon} ${CAT_META[k].label}`}
              color={CAT_META[k].color}
            />
          ))}
        </div>
        {isAdmin && (
          <button className="btn-primary" onClick={startCreate}>
            <Plus className="h-4 w-4" /> Yangi e’lon
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {visible.map((a) => {
          const meta = CAT_META[a.category];
          return (
            <motion.div
              key={a.id}
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={`card p-5 relative ${!a.active ? 'opacity-60' : ''}`}
              style={{ borderLeft: `4px solid ${meta.color}` }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className="badge"
                    style={{ background: `${meta.color}1a`, color: meta.color }}
                  >
                    {meta.icon} {meta.label}
                  </span>
                  {a.pinned && (
                    <span className="badge bg-amber-100 text-amber-700">
                      <Pin className="h-3 w-3" /> Pin
                    </span>
                  )}
                  {!a.active && (
                    <span className="badge bg-slate-200 text-slate-600">Yashirin</span>
                  )}
                </div>
                {isAdmin && (
                  <div className="flex items-center gap-1">
                    <IconBtn
                      title={a.pinned ? 'Pinni olib tashlash' : 'Pin qilish'}
                      onClick={() => saveAnnouncement({ ...a, pinned: !a.pinned })}
                    >
                      {a.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                    </IconBtn>
                    <IconBtn
                      title="Tahrirlash"
                      onClick={() => {
                        setEditing(a);
                        setOpen(true);
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </IconBtn>
                    <IconBtn
                      title={a.active ? 'Yashirish' : 'Ko‘rsatish'}
                      onClick={() => saveAnnouncement({ ...a, active: !a.active })}
                    >
                      {a.active ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
                    </IconBtn>
                    <AsyncButton
                      onClick={() => deleteAnnouncement(a.id)}
                      confirmText="E'lonni o'chirishni tasdiqlaysizmi?"
                      successToast="O'chirildi"
                      title="O‘chirish"
                      className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50"
                      loadingText="..."
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </AsyncButton>
                  </div>
                )}
              </div>
              <h3 className="font-bold text-slate-900 mt-2">{a.title}</h3>
              <p className="text-sm text-slate-600 mt-1 whitespace-pre-wrap leading-relaxed">
                {a.content}
              </p>
              <div className="text-[11px] text-slate-400 mt-3">
                Yangilangan: {timeAgo(a.updatedAt)}
              </div>
            </motion.div>
          );
        })}
        {visible.length === 0 && (
          <div className="col-span-full card p-10 text-center text-slate-400">
            Hozircha e’lonlar yo‘q
          </div>
        )}
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing?.title ? 'E’lonni tahrirlash' : 'Yangi e’lon'}
        size="lg"
      >
        {editing && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Toifa</label>
                <select
                  className="input mt-1"
                  value={editing.category}
                  onChange={(e) =>
                    setEditing({ ...editing, category: e.target.value as AnnouncementCategory })
                  }
                >
                  {(Object.keys(CAT_META) as AnnouncementCategory[]).map((k) => (
                    <option key={k} value={k}>
                      {CAT_META[k].icon} {CAT_META[k].label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editing.pinned}
                    onChange={(e) => setEditing({ ...editing, pinned: e.target.checked })}
                    className="h-4 w-4"
                  />
                  <span className="text-sm font-semibold text-slate-700">Pin</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editing.active}
                    onChange={(e) => setEditing({ ...editing, active: e.target.checked })}
                    className="h-4 w-4"
                  />
                  <span className="text-sm font-semibold text-slate-700">Faol</span>
                </label>
              </div>
            </div>
            <div>
              <label className="label">Sarlavha</label>
              <input
                className="input mt-1"
                value={editing.title}
                onChange={(e) => setEditing({ ...editing, title: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Matn</label>
              <textarea
                className="input mt-1"
                rows={8}
                value={editing.content}
                onChange={(e) => setEditing({ ...editing, content: e.target.value })}
              />
            </div>
            <button
              onClick={async () => {
                if (!editing.title.trim()) return toast.error('Sarlavha kerak');
                await saveAnnouncement(editing);
                toast.success('Saqlandi');
                setOpen(false);
              }}
              className="btn-primary w-full"
            >
              Saqlash
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}

/* ============================= FILIALLAR ============================= */

function BranchesTab({ isAdmin }: { isAdmin: boolean }) {
  const { branches, saveBranch, deleteBranch } = useApp();
  const [editing, setEditing] = useState<Branch | null>(null);
  const [open, setOpen] = useState(false);
  const [regionFilter, setRegionFilter] = useState<Region | 'all'>('all');
  const [search, setSearch] = useState('');
  const [layout, setLayout] = useState<'group' | 'grid'>('group');

  const scope = useMemo(
    () => (isAdmin ? branches : branches.filter((b) => b.active)),
    [branches, isAdmin]
  );

  const visible = useMemo(() => {
    const s = search.trim().toLowerCase();
    return scope
      .filter((b) => regionFilter === 'all' || b.region === regionFilter)
      .filter((b) => {
        if (!s) return true;
        return (
          b.name.toLowerCase().includes(s) ||
          b.address.toLowerCase().includes(s) ||
          (b.city ?? '').toLowerCase().includes(s) ||
          b.phone.replace(/\s/g, '').includes(s.replace(/\s/g, '')) ||
          regionName(b.region).toLowerCase().includes(s)
        );
      });
  }, [scope, regionFilter, search]);

  const regionCounts = useMemo(() => {
    const map = new Map<Region, number>();
    scope.forEach((b) => map.set(b.region, (map.get(b.region) ?? 0) + 1));
    return map;
  }, [scope]);

  const grouped = useMemo(() => {
    const map = new Map<Region, Branch[]>();
    visible.forEach((b) => {
      const arr = map.get(b.region) ?? [];
      arr.push(b);
      map.set(b.region, arr);
    });
    return REGIONS.filter((r) => map.has(r.key)).map((r) => ({
      region: r,
      items: (map.get(r.key) ?? []).sort((a, b) => a.order - b.order),
    }));
  }, [visible]);

  function startCreate() {
    setEditing({
      id: randomId('br'),
      name: '',
      region: 'tashkent-city',
      city: '',
      address: '',
      phone: '',
      workingHours: '',
      lat: undefined,
      lng: undefined,
      isNew: true,
      order: branches.length,
      active: true,
    });
    setOpen(true);
  }

  const renderCard = (b: Branch) => (
          <motion.div
            key={b.id}
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`card p-4 ${!b.active ? 'opacity-60' : ''}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="h-10 w-10 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-bold text-slate-900">{b.name}</div>
                  {b.city && <div className="text-xs text-slate-500">{b.city}</div>}
                </div>
              </div>
              {b.isNew && (
                <span className="badge bg-emerald-100 text-emerald-700">
                  <Sparkles className="h-3 w-3" /> YANGI
                </span>
              )}
            </div>

            <div className="mt-3 space-y-1.5 text-sm">
              <div className="text-slate-600">{b.address}</div>
              {b.phone && (
                <a
                  href={`tel:${b.phone.replace(/\s/g, '')}`}
                  className="flex items-center gap-2 text-brand-700 hover:text-brand-800 font-semibold"
                >
                  <Phone className="h-3.5 w-3.5" /> {b.phone}
                </a>
              )}
              {b.workingHours && (
                <div className="text-xs text-slate-500">{b.workingHours}</div>
              )}
              {b.lat != null && b.lng != null && (
                <a
                  href={`https://yandex.uz/maps/?text=${b.lat},${b.lng}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-brand-600 hover:underline"
                >
                  <Globe className="h-3 w-3" /> Xaritada ko‘rish
                </a>
              )}
            </div>

            {isAdmin && (
              <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100">
                <button
                  onClick={() => {
                    setEditing(b);
                    setOpen(true);
                  }}
                  className="btn-ghost flex-1 text-xs"
                >
                  <Pencil className="h-3.5 w-3.5" /> Tahrirlash
                </button>
                <AsyncButton
                  onClick={() => saveBranch({ ...b, active: !b.active })}
                  className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600"
                  title={b.active ? 'Yashirish' : 'Faollashtirish'}
                  loadingText="..."
                >
                  {b.active ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                </AsyncButton>
                <AsyncButton
                  onClick={() => deleteBranch(b.id)}
                  confirmText="Filialni o'chirishni tasdiqlaysizmi?"
                  successToast="O'chirildi"
                  className="p-2 rounded-xl border border-rose-200 hover:bg-rose-50 text-rose-600"
                  loadingText="..."
                >
                  <Trash2 className="h-4 w-4" />
                </AsyncButton>
              </div>
            )}
          </motion.div>
  );

  return (
    <div>
      <div className="card p-3 mb-4 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              className="input pl-9"
              placeholder="Filial nomi, manzil, telefon yoki shahar bo'yicha qidiruv..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
            <button
              onClick={() => setLayout('group')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                layout === 'group' ? 'bg-white dark:bg-slate-900 shadow-soft text-brand-700' : 'text-slate-600'
              }`}
            >
              Viloyatlar bo'yicha
            </button>
            <button
              onClick={() => setLayout('grid')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                layout === 'grid' ? 'bg-white dark:bg-slate-900 shadow-soft text-brand-700' : 'text-slate-600'
              }`}
            >
              Hammasi grid
            </button>
          </div>
          {isAdmin && (
            <button className="btn-primary" onClick={startCreate}>
              <Plus className="h-4 w-4" /> Yangi filial
            </button>
          )}
        </div>

        <div className="flex gap-1.5 flex-wrap">
          <Chip
            active={regionFilter === 'all'}
            onClick={() => setRegionFilter('all')}
            label={`Barchasi (${scope.length})`}
          />
          {REGIONS.map((r) => {
            const count = regionCounts.get(r.key) ?? 0;
            if (count === 0 && regionFilter !== r.key) return null;
            return (
              <Chip
                key={r.key}
                active={regionFilter === r.key}
                onClick={() => setRegionFilter(r.key)}
                label={`${r.icon} ${r.name} (${count})`}
                color="#2f66ff"
              />
            );
          })}
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="card p-10 text-center text-slate-400">
          Filiallar topilmadi
        </div>
      ) : layout === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {visible.map(renderCard)}
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(({ region, items }) => (
            <div key={region.key}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">{region.icon}</span>
                <h3 className="font-bold text-slate-800 dark:text-slate-200">{region.name}</h3>
                <span className="badge bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {items.length} ta filial
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {items.map(renderCard)}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing?.name ? 'Filialni tahrirlash' : 'Yangi filial'}
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
                <label className="label">Viloyat</label>
                <select
                  className="input mt-1"
                  value={editing.region}
                  onChange={(e) => setEditing({ ...editing, region: e.target.value as Region })}
                >
                  {REGIONS.map((r) => (
                    <option key={r.key} value={r.key}>
                      {r.icon} {r.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Shahar</label>
                <input
                  className="input mt-1"
                  value={editing.city ?? ''}
                  onChange={(e) => setEditing({ ...editing, city: e.target.value })}
                />
              </div>
              <div className="col-span-2">
                <label className="label">Manzil</label>
                <input
                  className="input mt-1"
                  value={editing.address}
                  onChange={(e) => setEditing({ ...editing, address: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Telefon</label>
                <input
                  className="input mt-1"
                  value={editing.phone}
                  onChange={(e) => setEditing({ ...editing, phone: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Ish vaqti</label>
                <input
                  className="input mt-1"
                  value={editing.workingHours ?? ''}
                  onChange={(e) => setEditing({ ...editing, workingHours: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Latitude (kenglik)</label>
                <input
                  type="number"
                  step="any"
                  className="input mt-1"
                  value={editing.lat ?? ''}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      lat: e.target.value === '' ? undefined : Number(e.target.value),
                    })
                  }
                />
              </div>
              <div>
                <label className="label">Longitude (uzunlik)</label>
                <input
                  type="number"
                  step="any"
                  className="input mt-1"
                  value={editing.lng ?? ''}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      lng: e.target.value === '' ? undefined : Number(e.target.value),
                    })
                  }
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
              <div className="flex items-center gap-4 mt-5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editing.isNew}
                    onChange={(e) => setEditing({ ...editing, isNew: e.target.checked })}
                    className="h-4 w-4"
                  />
                  <span className="text-sm font-semibold text-slate-700">Yangi ochilgan</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editing.active}
                    onChange={(e) => setEditing({ ...editing, active: e.target.checked })}
                    className="h-4 w-4"
                  />
                  <span className="text-sm font-semibold text-slate-700">Faol</span>
                </label>
              </div>
            </div>
            <button
              onClick={async () => {
                if (!editing.name.trim() || !editing.address.trim()) {
                  return toast.error('Nomi va manzil majburiy');
                }
                await saveBranch(editing);
                toast.success('Saqlandi');
                setOpen(false);
              }}
              className="btn-primary w-full"
            >
              Saqlash
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}

/* ============================= TARIFLAR ============================= */

function TariffTab({ isAdmin }: { isAdmin: boolean }) {
  const { tariff, saveTariff } = useApp();
  const [draft, setDraft] = useState<TariffSettings>(tariff);
  const [editMode, setEditMode] = useState(false);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="card p-6">
        <div className="text-xs uppercase tracking-wider text-slate-500 font-semibold">
          Asosiy tarif
        </div>
        <div className="mt-3 flex items-end gap-4 flex-wrap">
          <div>
            <div className="text-xs text-slate-500">1 m³ narxi</div>
            <div className="text-4xl font-bold text-brand-700">
              {tariff.pricePerM3} <span className="text-xl text-slate-400">{tariff.currency}</span>
            </div>
          </div>
          <div className="text-slate-300 text-2xl">/</div>
          <div>
            <div className="text-xs text-slate-500">teng keladi</div>
            <div className="text-4xl font-bold text-slate-800">
              {tariff.kgPerM3} <span className="text-xl text-slate-400">kg</span>
            </div>
          </div>
        </div>

        <div className="mt-4 p-4 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-soft">
          <div className="text-xs uppercase tracking-wider opacity-80">Asosiy hisob</div>
          <div className="text-3xl font-bold mt-1">
            1 kg = {(tariff.pricePerM3 / tariff.kgPerM3).toFixed(2)} {tariff.currency}
          </div>
          <div className="text-xs opacity-90 mt-1">
            (hajm va og‘irlikdan qaysi biri qimmatroq bo‘lsa, mijozdan o‘sha summa olinadi)
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-2">
            <div className="text-[10px] text-slate-500 uppercase">10 kg</div>
            <div className="font-bold text-slate-800 dark:text-slate-200">
              {((10 * tariff.pricePerM3) / tariff.kgPerM3).toFixed(2)} {tariff.currency}
            </div>
          </div>
          <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-2">
            <div className="text-[10px] text-slate-500 uppercase">50 kg</div>
            <div className="font-bold text-slate-800 dark:text-slate-200">
              {((50 * tariff.pricePerM3) / tariff.kgPerM3).toFixed(2)} {tariff.currency}
            </div>
          </div>
          <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-2">
            <div className="text-[10px] text-slate-500 uppercase">100 kg</div>
            <div className="font-bold text-slate-800 dark:text-slate-200">
              {((100 * tariff.pricePerM3) / tariff.kgPerM3).toFixed(2)} {tariff.currency}
            </div>
          </div>
        </div>

        <p className="text-sm text-slate-600 mt-4 whitespace-pre-wrap">{tariff.notes}</p>

        <div className="text-[11px] text-slate-400 mt-3">
          Yangilangan: {formatDateTime(tariff.updatedAt)}
        </div>
      </div>

      {isAdmin && (
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div className="text-xs uppercase tracking-wider text-slate-500 font-semibold">
              Tarif sozlamalari (admin)
            </div>
            {!editMode && (
              <button
                onClick={() => {
                  setDraft(tariff);
                  setEditMode(true);
                }}
                className="btn-ghost text-xs"
              >
                <Pencil className="h-3.5 w-3.5" /> Tahrirlash
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div>
              <label className="label">1 m³ narxi</label>
              <input
                type="number"
                disabled={!editMode}
                className="input mt-1 disabled:bg-slate-50"
                value={draft.pricePerM3}
                onChange={(e) => setDraft({ ...draft, pricePerM3: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="label">Kg / m³</label>
              <input
                type="number"
                disabled={!editMode}
                className="input mt-1 disabled:bg-slate-50"
                value={draft.kgPerM3}
                onChange={(e) => setDraft({ ...draft, kgPerM3: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="label">Valyuta</label>
              <input
                disabled={!editMode}
                className="input mt-1 disabled:bg-slate-50"
                value={draft.currency}
                onChange={(e) => setDraft({ ...draft, currency: e.target.value })}
              />
            </div>
          </div>
          <div className="mt-3">
            <label className="label">Tushuntirish</label>
            <textarea
              disabled={!editMode}
              rows={5}
              className="input mt-1 disabled:bg-slate-50"
              value={draft.notes}
              onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
            />
          </div>
          {editMode && (
            <div className="flex gap-2 mt-3">
              <button
                onClick={async () => {
                  await saveTariff(draft);
                  toast.success('Tarif yangilandi');
                  setEditMode(false);
                }}
                className="btn-primary flex-1"
              >
                Saqlash
              </button>
              <button
                onClick={() => {
                  setDraft(tariff);
                  setEditMode(false);
                }}
                className="btn-ghost"
              >
                Bekor qilish
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ============================= KALKULYATOR ============================= */

function CalculatorTab() {
  const { tariff } = useApp();
  const [length, setLength] = useState('');
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');
  const [unit, setUnit] = useState<'cm' | 'm'>('cm');
  const [weight, setWeight] = useState('');

  const result = useMemo(() => {
    const L = Number(length);
    const W = Number(width);
    const H = Number(height);
    const kg = Number(weight);
    if (!L || !W || !H || !kg) return null;
    const factor = unit === 'cm' ? 1_000_000 : 1; // cm³ → m³
    const volumeM3 = (L * W * H) / factor;
    const volumetricKg = volumeM3 * tariff.kgPerM3;
    const priceByVolume = volumeM3 * tariff.pricePerM3;
    const priceByWeight = (kg / tariff.kgPerM3) * tariff.pricePerM3;
    const useVolume = priceByVolume >= priceByWeight;
    const chargedPrice = useVolume ? priceByVolume : priceByWeight;
    const reason = useVolume
      ? `Yuk hajmi ${volumeM3.toFixed(3)} m³ ga teng. Bu hajmdagi yuk og'irligi (volumetric) — ${volumetricKg.toFixed(1)} kg. Bu raqam haqiqiy og'irlik ${kg} kg dan KATTA, shuning uchun narx HAJM bo'yicha hisoblandi.`
      : `Yuk hajmi ${volumeM3.toFixed(3)} m³ (volumetric ${volumetricKg.toFixed(1)} kg). Lekin haqiqiy og'irlik ${kg} kg bundan KATTA, shuning uchun narx OG'IRLIK bo'yicha hisoblandi.`;
    return {
      volumeM3,
      volumetricKg,
      priceByVolume,
      priceByWeight,
      useVolume,
      chargedPrice,
      reason,
    };
  }, [length, width, height, weight, unit, tariff]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="card p-6">
        <h3 className="font-bold text-slate-900 flex items-center gap-2">
          <Calculator className="h-5 w-5 text-brand-600" /> Yuk parametrlari
        </h3>
        <p className="text-xs text-slate-500 mt-1">
          Tarif: 1 m³ = <b>{tariff.pricePerM3} {tariff.currency}</b> = <b>{tariff.kgPerM3} kg</b>
        </p>

        <div className="mt-4 flex items-center gap-2">
          <span className="text-xs text-slate-500 font-semibold">O‘lchov birligi:</span>
          <div className="flex gap-1">
            <button
              onClick={() => setUnit('cm')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                unit === 'cm' ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              cm
            </button>
            <button
              onClick={() => setUnit('m')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                unit === 'm' ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              metr
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mt-3">
          <div>
            <label className="label">Uzunlik ({unit})</label>
            <input
              type="number"
              className="input mt-1"
              value={length}
              onChange={(e) => setLength(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Eni ({unit})</label>
            <input
              type="number"
              className="input mt-1"
              value={width}
              onChange={(e) => setWidth(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Balandlik ({unit})</label>
            <input
              type="number"
              className="input mt-1"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-3">
          <label className="label">Haqiqiy og‘irlik (kg)</label>
          <input
            type="number"
            className="input mt-1"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
          />
        </div>

        <button
          onClick={() => {
            setLength('');
            setWidth('');
            setHeight('');
            setWeight('');
          }}
          className="btn-ghost mt-3 text-xs"
        >
          Tozalash
        </button>
      </div>

      <div className="card p-6">
        <h3 className="font-bold text-slate-900">Hisob-kitob natijasi</h3>
        {!result ? (
          <p className="text-sm text-slate-400 mt-3">
            Barcha 4 ta maydonni to‘ldiring (uzunlik, eni, balandlik, og‘irlik)
          </p>
        ) : (
          <div className="mt-3 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Stat label="Hajm" value={`${result.volumeM3.toFixed(3)} m³`} />
              <Stat
                label="Volumetric og‘irlik"
                value={`${result.volumetricKg.toFixed(1)} kg`}
              />
              <Stat
                label="Hajm bo‘yicha narx"
                value={`${result.priceByVolume.toFixed(2)} ${tariff.currency}`}
                tone={result.useVolume ? 'win' : undefined}
              />
              <Stat
                label="Og‘irlik bo‘yicha narx"
                value={`${result.priceByWeight.toFixed(2)} ${tariff.currency}`}
                tone={!result.useVolume ? 'win' : undefined}
              />
            </div>

            <motion.div
              key={result.chargedPrice}
              initial={{ scale: 0.97, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="p-4 rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 text-white"
            >
              <div className="text-xs uppercase tracking-wider opacity-80">Mijozdan olinadigan summa</div>
              <div className="text-3xl font-bold mt-1">
                {result.chargedPrice.toFixed(2)} {tariff.currency}
              </div>
            </motion.div>

            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
              <b>Nega bu narx?</b>
              <div className="mt-1 leading-relaxed">{result.reason}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================= UI helpers ============================= */

function Chip({
  active,
  onClick,
  label,
  color,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  color?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
        active ? 'text-white shadow-soft' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
      }`}
      style={active ? { background: color ?? '#2f66ff' } : undefined}
    >
      {label}
    </button>
  );
}

function IconBtn({
  children,
  onClick,
  title,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title?: string;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded-lg ${
        danger
          ? 'text-rose-600 hover:bg-rose-50'
          : 'text-slate-500 hover:bg-slate-100'
      }`}
    >
      {children}
    </button>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'win' }) {
  return (
    <div
      className={`rounded-xl p-3 ${
        tone === 'win'
          ? 'bg-emerald-50 border border-emerald-200'
          : 'bg-slate-50 border border-slate-100'
      }`}
    >
      <div className="text-[11px] uppercase tracking-wider text-slate-500">{label}</div>
      <div
        className={`font-bold text-lg ${
          tone === 'win' ? 'text-emerald-700' : 'text-slate-800'
        }`}
      >
        {value}
      </div>
    </div>
  );
}

/* ============================= REYSLAR ============================= */

function RoutesTab({ isAdmin }: { isAdmin: boolean }) {
  const { tripRoutes, saveTripRoute, deleteTripRoute } = useApp();
  const [editing, setEditing] = useState<TripRoute | null>(null);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayMs = today.getTime();

  const visible = [...tripRoutes].filter((r) => isAdmin || r.active).sort((a, b) => a.order - b.order);

  function blank(): TripRoute {
    return { id: randomId('route'), name: '', durationDays: 14, active: true, order: tripRoutes.length, createdAt: Date.now() };
  }

  function fmtDate(d?: string) {
    if (!d) return '—';
    const dt = new Date(d + 'T00:00:00');
    return dt.toLocaleDateString('uz-UZ', { day: '2-digit', month: 'long', year: 'numeric' });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <p className="text-sm text-slate-500">
          Mijoz "qachon keladi?" deganda — shu yerga qarang. Oxirgi partiya sanasi va reys davomiyligiga qarab keyingi taxminiy sana avtomatik hisoblanadi.
        </p>
        {isAdmin && (
          <button onClick={() => setEditing(blank())} className="btn-primary text-sm">
            + Reys qo'shish
          </button>
        )}
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {visible.length === 0 && (
          <div className="card p-8 text-center text-slate-500 sm:col-span-2">Reys yo'q.</div>
        )}
        {visible.map((r) => {
          let arrived = '—', daysAgo: number | null = null, nextEta = '—', daysLeft: number | null = null;
          if (r.lastArrivedDate) {
            const last = new Date(r.lastArrivedDate + 'T00:00:00').getTime();
            daysAgo = Math.max(0, Math.round((todayMs - last) / 86400000));
            arrived = `${fmtDate(r.lastArrivedDate)} (${daysAgo} kun oldin)`;
            const next = last + r.durationDays * 86400000;
            daysLeft = Math.round((next - todayMs) / 86400000);
            nextEta = `${fmtDate(new Date(next).toISOString().slice(0, 10))} (${daysLeft > 0 ? daysLeft + ' kundan keyin' : Math.abs(daysLeft) + ' kun oldin kutilgan'})`;
          }
          return (
            <div key={r.id} className={`card p-5 ${!r.active ? 'opacity-60' : ''}`}>
              <div className="flex items-start gap-2 mb-2">
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-slate-800 dark:text-white text-base truncate">{r.name}</div>
                  <div className="text-[12px] text-slate-500">~ {r.durationDays} kunda keladi</div>
                </div>
                {!r.active && <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-500">yashirin</span>}
                {isAdmin && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEditing(r)}
                      className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
                      title="Tahrirlash"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <AsyncButton
                      onClick={() => deleteTripRoute(r.id)}
                      confirmText={`"${r.name}" reysi o'chirilsinmi?`}
                      successToast="O'chirildi"
                      className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/20 text-rose-500"
                      title="O'chirish"
                      loadingText="..."
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </AsyncButton>
                  </div>
                )}
              </div>
              <div className="space-y-1.5 mt-3">
                <Row label="Oxirgi partiya" value={arrived} />
                <Row label="Keyingi (taxminan)" value={nextEta} highlight={daysLeft !== null && daysLeft <= 3 && daysLeft >= 0} />
                {r.notes && <Row label="Izoh" value={r.notes} />}
              </div>
            </div>
          );
        })}
      </div>

      {editing && (
        <RouteEditor
          route={editing}
          isNew={!tripRoutes.some((x) => x.id === editing.id)}
          onClose={() => setEditing(null)}
          onSave={async (r) => {
            if (!r.name.trim()) { toast.error('Nomi kerak'); return; }
            try { await saveTripRoute(r); toast.success('Saqlandi'); setEditing(null); } catch (e) { toast.error((e as Error).message); }
          }}
          onDelete={async () => {
            if (!confirm(`"${editing.name}" reysi o'chirilsinmi?`)) return;
            try { await deleteTripRoute(editing.id); toast.success("O'chirildi"); setEditing(null); } catch (e) { toast.error((e as Error).message); }
          }}
        />
      )}
    </div>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`flex items-baseline gap-2 text-sm ${highlight ? 'text-emerald-700 dark:text-emerald-400 font-semibold' : ''}`}>
      <span className="text-[11px] uppercase tracking-wide text-slate-400 w-32 flex-shrink-0">{label}</span>
      <span className="flex-1">{value}</span>
    </div>
  );
}

function RouteEditor({ route, isNew, onClose, onSave, onDelete }: { route: TripRoute; isNew: boolean; onClose: () => void; onSave: (r: TripRoute) => void; onDelete: () => void }) {
  const [d, setD] = useState(route);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 shadow-2xl">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 font-bold text-slate-800 dark:text-white">
          {isNew ? 'Yangi reys' : 'Reysni tahrirlash'}
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="label">Nomi</label>
            <input className="input mt-1" value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} placeholder="Guanchjou → Toshkent (aviadan)" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Necha kunda keladi</label>
              <input type="number" min={1} className="input mt-1" value={d.durationDays} onChange={(e) => setD({ ...d, durationDays: Math.max(1, parseInt(e.target.value) || 1) })} />
            </div>
            <div>
              <label className="label">Oxirgi partiya sanasi</label>
              <input type="date" className="input mt-1" value={d.lastArrivedDate ?? ''} onChange={(e) => setD({ ...d, lastArrivedDate: e.target.value || undefined })} />
            </div>
          </div>
          <div>
            <label className="label">Izoh (ixtiyoriy)</label>
            <input className="input mt-1" value={d.notes ?? ''} onChange={(e) => setD({ ...d, notes: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3 items-end">
            <div>
              <label className="label">Tartib (kichikroq — yuqorida)</label>
              <input type="number" className="input mt-1" value={d.order} onChange={(e) => setD({ ...d, order: parseInt(e.target.value) || 0 })} />
            </div>
            <label className="flex items-center gap-2 text-sm h-[42px] px-3 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer">
              <input type="checkbox" checked={d.active} onChange={(e) => setD({ ...d, active: e.target.checked })} /> Faol (ko'rinadigan)
            </label>
          </div>
        </div>
        <div className="flex justify-between gap-2 p-5 border-t border-slate-100 dark:border-slate-800">
          {!isNew ? (
            <button onClick={onDelete} className="btn-danger text-sm">
              <Trash2 className="h-4 w-4" /> O'chirish
            </button>
          ) : <span />}
          <div className="flex gap-2">
            <button onClick={onClose} className="btn-ghost">Bekor</button>
            <button onClick={() => onSave(d)} className="btn-primary">Saqlash</button>
          </div>
        </div>
      </div>
    </div>
  );
}
