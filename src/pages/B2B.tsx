// B2B Operativ KAM CRM — Creatio uslubidagi mustaqil ish maydoni
// Vizual identitet: dark indigo sidebar + indigo/violet aksent
// (asosiy CRM blue/sky'dan butunlay ajralib turadi)

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2, Plus, User as UserIcon, Phone, Home, Heart, AlertTriangle,
  Calendar, Package, Trash2, Save, Sparkles, RefreshCcw,
  TrendingUp, TrendingDown, Brain, Loader2, ListChecks, Target, CheckCircle2,
  KanbanSquare, MessageSquare, BarChart3, Search, ArrowLeft,
  Send, Eye, X, Activity, Briefcase, Clock, LogOut, ExternalLink,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useApp } from '../context/AppContext';
import type { B2BClient, B2BInteractionLog } from '../types';

// === Yordamchi funksiyalar ===
function newClientDraft(): B2BClient {
  return {
    id: '', brandName: '', ceoName: '', ceoPhone: '',
    homeAddress: '', hobby: '', historicalPainNotes: '',
    promisedOrderDate: '', promisedVolumeM3: undefined,
    createdAt: 0, updatedAt: 0,
  };
}
function fmtDate(ms?: number): string {
  if (!ms) return '—';
  return new Date(ms).toLocaleString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function fmtDay(iso?: string): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('uz-UZ', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return iso; }
}
function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).map((s) => s[0]?.toUpperCase()).slice(0, 2).join('');
}
function brandColor(seed: string): string {
  // deterministik rang — brend uchun
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 360;
  return `hsl(${h}, 65%, 55%)`;
}

type View = 'pipeline' | 'accounts' | 'activities' | 'analytics';

// === ASOSIY KOMPONENT ===
export default function B2BPage() {
  const {
    b2bClients, b2bInteractions,
    saveB2BClient, deleteB2BClient,
    addB2BInteraction, refreshGeminiInsight,
    currentUser, settings, perms, logout,
  } = useApp();
  // Foydalanuvchi B2B-only KAM bo'lsa, asosiy CRM'ga kira olmaydi → faqat logout
  const isB2BOnly = !perms.manage && perms.pages.length === 1 && perms.pages[0] === 'b2b';

  const [view, setView] = useState<View>('accounts');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<B2BClient | null>(null);
  const [search, setSearch] = useState('');
  const [filterRisk, setFilterRisk] = useState<'all' | 'high' | 'medium' | 'low'>('all');

  const aiEnabled = !!settings.ai?.enabled && !!settings.ai?.geminiApiKey;
  const canManageAi = perms.manage; // faqat admin AI sozlamalarini ko'radi

  const selected = useMemo(
    () => b2bClients.find((c) => c.id === selectedId) ?? null,
    [b2bClients, selectedId],
  );

  // Joriy view o'zgarsa, panel ochiq bo'lsa yopamiz
  useEffect(() => { setSelectedId(null); }, [view]);

  function openNew() { setEditing(newClientDraft()); }

  return (
    <div className="b2b-workspace fixed inset-0 z-30 overflow-hidden">
      <style>{`
        .b2b-workspace {
          --b2b-bg: #0f172a;
          --b2b-bg2: #1e1b4b;
          --b2b-accent: #6366f1;
          --b2b-accent2: #a855f7;
          --b2b-surface: #f8fafc;
        }
        .b2b-workspace.dark, .dark .b2b-workspace { --b2b-surface: #0b1020; }
        .b2b-grad-bar {
          background: linear-gradient(90deg, #4f46e5 0%, #7c3aed 50%, #c026d3 100%);
        }
        .b2b-side-link {
          @apply flex items-center gap-3 px-3 py-2 rounded-lg text-slate-300 hover:bg-white/5 transition-all;
        }
        .b2b-side-link.active {
          background: linear-gradient(90deg, rgba(99,102,241,0.25), rgba(168,85,247,0.05));
          color: white;
          border-left: 3px solid #818cf8;
          padding-left: calc(0.75rem - 3px);
        }
      `}</style>

      <div className="flex h-screen bg-slate-50 dark:bg-[#05070d]">
        {/* === CHAP SIDEBAR === */}
        <aside className="hidden md:flex flex-col w-56 bg-gradient-to-b from-slate-950 via-indigo-950 to-slate-950 text-slate-100 border-r border-slate-800">
          {/* Workspace badge */}
          <div className="px-4 py-4 border-b border-white/10">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                <Briefcase className="h-4 w-4 text-white" />
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Workspace</div>
                <div className="font-bold text-sm bg-gradient-to-r from-indigo-300 to-fuchsia-300 bg-clip-text text-transparent">
                  B2B KAM
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar links */}
          <nav className="px-2 py-3 space-y-1">
            <SideLink active={view === 'pipeline'} onClick={() => setView('pipeline')} icon={KanbanSquare} label="Pipeline" />
            <SideLink active={view === 'accounts'} onClick={() => setView('accounts')} icon={Building2} label="Mijozlar" />
            <SideLink active={view === 'activities'} onClick={() => setView('activities')} icon={MessageSquare} label="Muloqotlar" />
            <SideLink active={view === 'analytics'} onClick={() => setView('analytics')} icon={BarChart3} label="Analitika" />
          </nav>

          <div className="mt-auto p-3 border-t border-white/10">
            {!aiEnabled && (
              <div className="rounded-xl bg-amber-950/40 border border-amber-800 p-2.5 text-[10px] text-amber-200 leading-snug mb-3">
                <div className="flex items-start gap-1.5">
                  <AlertTriangle className="h-3 w-3 flex-shrink-0 mt-0.5" />
                  <div>
                    AI tahlil <b>o'chirilgan</b>.
                    {canManageAi
                      ? <>Sozlamalar &gt; AI'dan yoqing.</>
                      : ' Adminga murojaat qiling.'}
                  </div>
                </div>
              </div>
            )}
            <div className="flex items-center gap-2 text-[11px]">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-fuchsia-500 flex items-center justify-center text-white font-bold text-xs">
                {initials(currentUser?.fullName ?? currentUser?.username ?? '?')}
              </div>
              <div className="min-w-0">
                <div className="font-bold text-white truncate">{currentUser?.fullName ?? currentUser?.username}</div>
                <div className="text-slate-400 text-[10px] truncate">KAM</div>
              </div>
            </div>
          </div>
        </aside>

        {/* === MARKAZ — Workspace === */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* TOP BAR — visual B2B identifier */}
          <header className="b2b-grad-bar text-white shadow-md">
            <div className="px-4 sm:px-6 py-3 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3 min-w-0">
                <div className="md:hidden h-8 w-8 rounded-lg bg-white/15 flex items-center justify-center">
                  <Briefcase className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <h1 className="font-bold text-lg leading-tight truncate">B2B KAM Workspace</h1>
                  <p className="text-[11px] text-white/80">
                    {VIEW_DESC[view]}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="hidden sm:inline-flex items-center gap-1 text-[11px] bg-white/15 rounded-full px-2 py-1">
                  <Activity className="h-3 w-3" />
                  {b2bClients.length} mijoz · {b2bInteractions.length} muloqot
                </span>
                <button onClick={openNew} className="inline-flex items-center gap-1.5 bg-white text-indigo-700 hover:bg-slate-100 font-bold px-3 py-1.5 rounded-lg text-sm shadow">
                  <Plus className="h-4 w-4" /> Yangi mijoz
                </button>
                {/* Asosiy CRM'ga qaytish (faqat operator/admin) yoki Chiqish (B2B-only) */}
                {isB2BOnly ? (
                  <button
                    onClick={() => { void logout(); }}
                    className="inline-flex items-center gap-1 bg-white/15 hover:bg-white/25 text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg"
                    title="Chiqish"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                  </button>
                ) : (
                  <Link
                    to="/"
                    className="inline-flex items-center gap-1 bg-white/15 hover:bg-white/25 text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg"
                    title="Asosiy CRM'ga qaytish"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Asosiy CRM</span>
                  </Link>
                )}
              </div>
            </div>
            {/* Mobile tabs */}
            <div className="md:hidden border-t border-white/10 flex overflow-x-auto scroll-thin">
              {(['pipeline', 'accounts', 'activities', 'analytics'] as View[]).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`flex-1 min-w-[100px] py-2 text-[11px] font-bold ${
                    view === v ? 'bg-white/15 text-white' : 'text-white/70'
                  }`}
                >
                  {VIEW_LABEL[v]}
                </button>
              ))}
            </div>
          </header>

          {/* CONTENT */}
          <div className="flex-1 overflow-y-auto">
            {view === 'accounts' && (
              <AccountsView
                clients={b2bClients}
                interactions={b2bInteractions}
                search={search}
                setSearch={setSearch}
                filterRisk={filterRisk}
                setFilterRisk={setFilterRisk}
                onSelect={setSelectedId}
                onNew={openNew}
              />
            )}
            {view === 'pipeline' && (
              <PipelineView clients={b2bClients} onSelect={setSelectedId} />
            )}
            {view === 'activities' && (
              <ActivitiesView clients={b2bClients} interactions={b2bInteractions} onSelect={setSelectedId} />
            )}
            {view === 'analytics' && (
              <AnalyticsView clients={b2bClients} interactions={b2bInteractions} />
            )}
          </div>
        </div>

        {/* === O'NG — Detail Drawer === */}
        {selected && (
          <DetailDrawer
            client={selected}
            interactions={b2bInteractions.filter((i) => i.clientId === selected.id)}
            aiEnabled={aiEnabled}
            onClose={() => setSelectedId(null)}
            onEdit={() => setEditing({ ...selected })}
            onDelete={async () => {
              if (!confirm(`"${selected.brandName}" mijozni o'chirasizmi?`)) return;
              try {
                await deleteB2BClient(selected.id);
                toast.success("O'chirildi");
                setSelectedId(null);
              } catch (e) { toast.error((e as Error).message); }
            }}
            onAddInteraction={async (payload) => {
              try {
                await addB2BInteraction({ ...payload, clientId: selected.id });
                toast.success("Qo'shildi" + (aiEnabled ? " — Gemini tahlilmoqda" : ""));
              } catch (e) { toast.error((e as Error).message); }
            }}
            onRefreshGemini={async () => {
              if (!aiEnabled) {
                toast.error('AI tahlil o\'chirilgan. Sozlamalar > AI dan yoqing.');
                return;
              }
              toast.loading('Gemini tahlil qilmoqda...', { id: 'g' });
              try {
                const r = await refreshGeminiInsight(selected.id);
                toast.dismiss('g');
                if (r) toast.success('Yangilandi');
                else toast.error('Tahlil olishda xato');
              } catch (e) {
                toast.dismiss('g');
                toast.error((e as Error).message);
              }
            }}
          />
        )}

        {/* === MODAL — yangi/tahrirlash === */}
        {editing && (
          <ClientModal
            value={editing}
            onChange={setEditing}
            onClose={() => setEditing(null)}
            onSave={async (data) => {
              const isNew = !data.id;
              const id = data.id || `b2b_${Math.random().toString(36).slice(2, 10)}`;
              await saveB2BClient({
                ...data,
                id,
                assignedKamId: data.assignedKamId || currentUser?.id,
                assignedKamName: data.assignedKamName || currentUser?.fullName || currentUser?.username,
              });
              toast.success(isNew ? "Mijoz qo'shildi" : 'Yangilandi');
              setSelectedId(id);
              setEditing(null);
            }}
          />
        )}
      </div>
    </div>
  );
}

const VIEW_LABEL: Record<View, string> = {
  pipeline: 'Pipeline',
  accounts: 'Mijozlar',
  activities: 'Muloqotlar',
  analytics: 'Analitika',
};
const VIEW_DESC: Record<View, string> = {
  pipeline: 'Mijozlar kanban bo\'yicha — risk va zakaz ehtimoli',
  accounts: 'Korporativ mijozlar ro\'yxati — Gemini AI tahlil bilan',
  activities: 'Barcha muloqotlar timeline',
  analytics: 'Umumiy ko\'rsatkichlar va trend',
};

// === SIDEBAR LINK ===
function SideLink({
  active, onClick, icon: Icon, label,
}: { active: boolean; onClick: () => void; icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
        active
          ? 'bg-gradient-to-r from-indigo-600/40 to-fuchsia-600/10 text-white border-l-2 border-indigo-300 pl-[10px]'
          : 'text-slate-300 hover:bg-white/5 hover:text-white'
      }`}
    >
      <Icon className="h-4 w-4 flex-shrink-0" />
      {label}
    </button>
  );
}

// === ACCOUNTS VIEW (data grid) ===
function AccountsView({
  clients, interactions, search, setSearch, filterRisk, setFilterRisk, onSelect, onNew,
}: {
  clients: B2BClient[];
  interactions: B2BInteractionLog[];
  search: string; setSearch: (v: string) => void;
  filterRisk: 'all' | 'high' | 'medium' | 'low'; setFilterRisk: (v: 'all' | 'high' | 'medium' | 'low') => void;
  onSelect: (id: string) => void;
  onNew: () => void;
}) {
  const filtered = useMemo(() => {
    return clients.filter((c) => {
      if (search) {
        const q = search.toLowerCase();
        if (!c.brandName.toLowerCase().includes(q) && !c.ceoName.toLowerCase().includes(q) && !c.ceoPhone.includes(q)) return false;
      }
      const risk = c.geminiAIInsight?.churn_risk_percent;
      if (filterRisk === 'high' && (risk === undefined || risk < 70)) return false;
      if (filterRisk === 'medium' && (risk === undefined || risk < 40 || risk >= 70)) return false;
      if (filterRisk === 'low' && (risk !== undefined && risk >= 40)) return false;
      return true;
    });
  }, [clients, search, filterRisk]);

  return (
    <div className="p-4 sm:p-6">
      {/* Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 mb-4 flex items-center gap-2 flex-wrap">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Brand yoki CEO bo'yicha qidirish..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none focus:border-indigo-500"
          />
        </div>
        <div className="inline-flex bg-slate-100 dark:bg-slate-800 rounded-xl p-0.5">
          {(['all', 'high', 'medium', 'low'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setFilterRisk(r)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg ${
                filterRisk === r
                  ? r === 'high' ? 'bg-rose-500 text-white'
                  : r === 'medium' ? 'bg-amber-500 text-white'
                  : r === 'low' ? 'bg-emerald-500 text-white'
                  : 'bg-indigo-600 text-white shadow'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              {r === 'all' ? 'Hammasi' : r === 'high' ? '⚠ Yuqori' : r === 'medium' ? '○ O\'rta' : '✓ Past'}
            </button>
          ))}
        </div>
        <div className="text-[11px] text-slate-500 font-semibold">{filtered.length} ta mijoz</div>
      </div>

      {/* GRID */}
      {filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-12 text-center">
          <Building2 className="h-12 w-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
          <h3 className="font-bold text-base text-slate-600 dark:text-slate-300 mb-1">
            {clients.length === 0 ? 'Hali bironta B2B mijoz yo\'q' : 'Filtr bo\'yicha topilmadi'}
          </h3>
          {clients.length === 0 && (
            <p className="text-xs text-slate-500 mb-4">Birinchi korporativ mijozni qo'shing — Gemini AI tahlilni avtomatik ishga tushiramiz.</p>
          )}
          <button onClick={onNew} className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-2 rounded-xl text-sm">
            <Plus className="h-4 w-4" /> Yangi B2B mijoz
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          {/* Header row */}
          <div className="hidden md:grid grid-cols-[1.5fr_1fr_0.8fr_0.8fr_0.8fr_0.4fr] gap-3 px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 text-[10px] uppercase tracking-wider font-bold text-slate-500">
            <div>Brand</div>
            <div>CEO / Aloqa</div>
            <div>Va'da</div>
            <div>Sana</div>
            <div>AI Risk</div>
            <div></div>
          </div>
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {filtered.map((c) => {
              const intCount = interactions.filter((i) => i.clientId === c.id).length;
              return (
                <li key={c.id}>
                  <button
                    onClick={() => onSelect(c.id)}
                    className="w-full text-left px-4 py-3 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 transition grid md:grid-cols-[1.5fr_1fr_0.8fr_0.8fr_0.8fr_0.4fr] gap-3 items-center"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="h-9 w-9 rounded-xl flex items-center justify-center text-white font-bold text-xs flex-shrink-0 shadow-sm"
                        style={{ background: brandColor(c.brandName) }}
                      >
                        {initials(c.brandName)}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-sm truncate">{c.brandName}</div>
                        <div className="text-[10px] text-slate-500 truncate">
                          {intCount} ta muloqot
                        </div>
                      </div>
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate">{c.ceoName}</div>
                      <div className="text-[11px] text-slate-500 font-mono truncate">{c.ceoPhone || '—'}</div>
                    </div>
                    <div className="text-sm font-bold text-emerald-600">
                      {c.promisedVolumeM3 ? `${c.promisedVolumeM3}m³` : '—'}
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-400">{fmtDay(c.promisedOrderDate)}</div>
                    <div>
                      <RiskBadge value={c.geminiAIInsight?.churn_risk_percent} status={c.geminiStatus} />
                    </div>
                    <div className="text-right">
                      <Eye className="h-4 w-4 text-slate-400 inline" />
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

function RiskBadge({ value, status }: { value?: number; status?: string }) {
  if (status === 'pending') {
    return <span className="inline-flex items-center gap-1 text-[10px] text-violet-600"><Loader2 className="h-3 w-3 animate-spin" /> Tahlilmoqda</span>;
  }
  if (status === 'error') {
    return <span className="inline-flex items-center gap-1 text-[10px] text-rose-600"><AlertTriangle className="h-3 w-3" /> Xato</span>;
  }
  if (typeof value !== 'number') {
    return <span className="text-[10px] text-slate-400">—</span>;
  }
  const color = value >= 70 ? 'bg-rose-500' : value >= 40 ? 'bg-amber-500' : 'bg-emerald-500';
  return (
    <div className="inline-flex items-center gap-2 min-w-[70px]">
      <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-[11px] font-bold w-7 text-right">{value}%</span>
    </div>
  );
}

// === PIPELINE (Kanban) ===
function PipelineView({ clients, onSelect }: { clients: B2BClient[]; onSelect: (id: string) => void }) {
  // Pipeline 4 ustun: Yangi (no AI) | Past risk | O'rta | Yuqori
  const columns = [
    { id: 'new', title: 'Yangi', desc: 'AI tahlil yo\'q', color: 'border-slate-400', filter: (c: B2BClient) => c.geminiAIInsight === undefined },
    { id: 'low', title: 'Past risk', desc: '0-39%', color: 'border-emerald-500', filter: (c: B2BClient) => (c.geminiAIInsight?.churn_risk_percent ?? -1) >= 0 && (c.geminiAIInsight?.churn_risk_percent ?? 0) < 40 },
    { id: 'med', title: "O'rta", desc: '40-69%', color: 'border-amber-500', filter: (c: B2BClient) => (c.geminiAIInsight?.churn_risk_percent ?? 0) >= 40 && (c.geminiAIInsight?.churn_risk_percent ?? 0) < 70 },
    { id: 'high', title: 'Yuqori', desc: '70-100%', color: 'border-rose-500', filter: (c: B2BClient) => (c.geminiAIInsight?.churn_risk_percent ?? 0) >= 70 },
  ];

  return (
    <div className="p-4 sm:p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        {columns.map((col) => {
          const items = clients.filter(col.filter);
          return (
            <div key={col.id} className="bg-white dark:bg-slate-900 rounded-2xl border-t-4 border border-slate-200 dark:border-slate-700 p-3 min-h-[300px]" style={{ borderTopColor: undefined }}>
              <div className={`flex items-center justify-between mb-3 pb-2 border-b-2 ${col.color}`}>
                <div>
                  <h3 className="font-bold text-sm">{col.title}</h3>
                  <p className="text-[10px] text-slate-500">{col.desc}</p>
                </div>
                <span className="text-xs font-bold bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">{items.length}</span>
              </div>
              {items.length === 0 ? (
                <div className="text-center text-[11px] text-slate-400 py-6">Bo'sh</div>
              ) : (
                <ul className="space-y-2">
                  {items.map((c) => (
                    <li key={c.id}>
                      <button
                        onClick={() => onSelect(c.id)}
                        className="w-full text-left rounded-xl border border-slate-200 dark:border-slate-700 p-2.5 hover:border-indigo-400 dark:hover:border-indigo-600 hover:shadow-sm transition bg-white dark:bg-slate-900"
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="h-7 w-7 rounded-lg flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                            style={{ background: brandColor(c.brandName) }}
                          >
                            {initials(c.brandName)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-xs truncate">{c.brandName}</div>
                            <div className="text-[10px] text-slate-500 truncate">{c.ceoName}</div>
                          </div>
                        </div>
                        {c.promisedVolumeM3 && (
                          <div className="mt-1.5 inline-flex items-center gap-1 text-[10px] bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded">
                            <Package className="h-2.5 w-2.5" />
                            {c.promisedVolumeM3}m³
                          </div>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// === ACTIVITIES (barcha muloqotlar) ===
function ActivitiesView({
  clients, interactions, onSelect,
}: { clients: B2BClient[]; interactions: B2BInteractionLog[]; onSelect: (id: string) => void }) {
  const sorted = useMemo(
    () => [...interactions].sort((a, b) => b.createdAt - a.createdAt).slice(0, 100),
    [interactions],
  );
  const clientById = useMemo(() => Object.fromEntries(clients.map((c) => [c.id, c])), [clients]);

  return (
    <div className="p-4 sm:p-6">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        {sorted.length === 0 ? (
          <div className="p-12 text-center">
            <MessageSquare className="h-12 w-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
            <p className="text-sm text-slate-500">Hali muloqot logi yo'q</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {sorted.map((log) => {
              const cl = clientById[log.clientId];
              return (
                <li key={log.id}>
                  <button
                    onClick={() => cl && onSelect(cl.id)}
                    className="w-full text-left px-4 py-3 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 flex items-start gap-3"
                  >
                    <div className="flex-shrink-0">
                      {cl ? (
                        <div className="h-9 w-9 rounded-xl flex items-center justify-center text-white text-xs font-bold" style={{ background: brandColor(cl.brandName) }}>
                          {initials(cl.brandName)}
                        </div>
                      ) : (
                        <div className="h-9 w-9 rounded-xl bg-slate-200 dark:bg-slate-700" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap text-sm">
                        <span className="font-bold">{cl?.brandName ?? "(o'chirilgan mijoz)"}</span>
                        <span className="text-slate-400">·</span>
                        <span className="text-slate-600 dark:text-slate-400">{log.authorName}</span>
                        {log.sentiment === 'positive' && <span>😊</span>}
                        {log.sentiment === 'neutral' && <span>😐</span>}
                        {log.sentiment === 'negative' && <span>😟</span>}
                        <span className="text-[10px] text-slate-400 ml-auto">{fmtDate(log.createdAt)}</span>
                      </div>
                      <p className="text-xs text-slate-700 dark:text-slate-200 mt-1 break-words whitespace-pre-wrap">
                        {log.summary}
                      </p>
                      {(log.promisedVolumeM3 || log.promisedOrderDate || log.nextContactDate) && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {log.promisedVolumeM3 ? <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">{log.promisedVolumeM3}m³</span> : null}
                          {log.promisedOrderDate ? <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-100 text-sky-700">Va'da: {fmtDay(log.promisedOrderDate)}</span> : null}
                          {log.nextContactDate ? <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-100 text-violet-700">Keyingi: {fmtDay(log.nextContactDate)}</span> : null}
                        </div>
                      )}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

// === ANALYTICS ===
function AnalyticsView({ clients, interactions }: { clients: B2BClient[]; interactions: B2BInteractionLog[] }) {
  const stats = useMemo(() => {
    const withAI = clients.filter((c) => c.geminiAIInsight);
    const high = withAI.filter((c) => (c.geminiAIInsight!.churn_risk_percent) >= 70).length;
    const med = withAI.filter((c) => {
      const r = c.geminiAIInsight!.churn_risk_percent;
      return r >= 40 && r < 70;
    }).length;
    const low = withAI.filter((c) => c.geminiAIInsight!.churn_risk_percent < 40).length;
    const totalPromisedVol = clients.reduce((s, c) => s + (c.promisedVolumeM3 ?? 0), 0);
    const avgOrderProb = withAI.length === 0 ? 0
      : withAI.reduce((s, c) => s + (c.geminiAIInsight!.predicted_order_probability), 0) / withAI.length;
    const last30days = interactions.filter((i) => i.createdAt > Date.now() - 30 * 86400000).length;
    return { high, med, low, total: clients.length, totalPromisedVol, avgOrderProb, last30days };
  }, [clients, interactions]);

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Jami mijozlar" value={stats.total.toString()} icon={Building2} color="indigo" />
        <Stat label="Va'da hajmi" value={`${stats.totalPromisedVol}m³`} icon={Package} color="emerald" />
        <Stat label="O'rt. zakaz ehtimoli" value={`${Math.round(stats.avgOrderProb)}%`} icon={Target} color="violet" />
        <Stat label="30 kunda muloqot" value={stats.last30days.toString()} icon={MessageSquare} color="sky" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
          <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-500" />
            Churn xavfi taqsimoti
          </h3>
          <div className="space-y-2">
            <RiskRow label="Yuqori (70-100%)" value={stats.high} total={stats.total} color="bg-rose-500" />
            <RiskRow label="O'rta (40-69%)" value={stats.med} total={stats.total} color="bg-amber-500" />
            <RiskRow label="Past (0-39%)" value={stats.low} total={stats.total} color="bg-emerald-500" />
            <RiskRow label="Tahlil yo'q" value={stats.total - (stats.high + stats.med + stats.low)} total={stats.total} color="bg-slate-300" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 lg:col-span-2">
          <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
            <ListChecks className="h-4 w-4 text-indigo-500" />
            E'tibor talab qiluvchi mijozlar
          </h3>
          {clients.filter((c) => (c.geminiAIInsight?.churn_risk_percent ?? 0) >= 70).length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">Yuqori churn xavfi mavjud mijozlar yo'q ✓</p>
          ) : (
            <ul className="space-y-2">
              {clients
                .filter((c) => (c.geminiAIInsight?.churn_risk_percent ?? 0) >= 70)
                .map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-2 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-950/20 p-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="h-8 w-8 rounded-lg flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0" style={{ background: brandColor(c.brandName) }}>
                        {initials(c.brandName)}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-sm truncate">{c.brandName}</div>
                        <div className="text-[10px] text-slate-500 truncate">{c.ceoName}</div>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-rose-600 flex-shrink-0">{c.geminiAIInsight!.churn_risk_percent}%</span>
                  </li>
                ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, icon: Icon, color }: { label: string; value: string; icon: React.ComponentType<{ className?: string }>; color: 'indigo' | 'emerald' | 'violet' | 'sky' }) {
  const bg = { indigo: 'bg-indigo-500', emerald: 'bg-emerald-500', violet: 'bg-violet-500', sky: 'bg-sky-500' }[color];
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
      <div className={`h-9 w-9 rounded-xl ${bg} text-white flex items-center justify-center mb-2 shadow-md`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="text-2xl font-bold leading-tight">{value}</div>
      <div className="text-[11px] text-slate-500 mt-0.5">{label}</div>
    </div>
  );
}

function RiskRow({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total === 0 ? 0 : Math.round((value / total) * 100);
  return (
    <div className="flex items-center gap-2 text-xs">
      <div className="w-28 text-slate-600 dark:text-slate-400">{label}</div>
      <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="w-10 text-right font-bold">{value}</div>
    </div>
  );
}

// === DETAIL DRAWER (right side, mijoz tafsiloti + tabs) ===
type DetailTab = 'overview' | 'activities' | 'ai';

function DetailDrawer({
  client, interactions, aiEnabled, onClose, onEdit, onDelete, onAddInteraction, onRefreshGemini,
}: {
  client: B2BClient;
  interactions: B2BInteractionLog[];
  aiEnabled: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void | Promise<void>;
  onAddInteraction: (data: Omit<B2BInteractionLog, 'id' | 'createdAt' | 'authorId' | 'authorName' | 'clientId'>) => Promise<void>;
  onRefreshGemini: () => Promise<void>;
}) {
  const [tab, setTab] = useState<DetailTab>('overview');
  const [logSummary, setLogSummary] = useState('');
  const [logSentiment, setLogSentiment] = useState<'positive' | 'neutral' | 'negative'>('neutral');
  const [logNext, setLogNext] = useState('');
  const [logVol, setLogVol] = useState('');
  const [logDate, setLogDate] = useState('');
  const [saving, setSaving] = useState(false);

  const ints = useMemo(() => [...interactions].sort((a, b) => b.createdAt - a.createdAt), [interactions]);

  async function handleAdd() {
    if (!logSummary.trim()) return toast.error('Xulosa kerak');
    setSaving(true);
    try {
      await onAddInteraction({
        summary: logSummary.trim(),
        sentiment: logSentiment,
        nextContactDate: logNext || undefined,
        promisedVolumeM3: logVol ? Number(logVol) : undefined,
        promisedOrderDate: logDate || undefined,
      });
      setLogSummary(''); setLogNext(''); setLogVol(''); setLogDate(''); setLogSentiment('neutral');
    } finally { setSaving(false); }
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 z-50 w-full md:w-[640px] lg:w-[720px] bg-white dark:bg-slate-900 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center gap-3">
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div
            className="h-10 w-10 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
            style={{ background: brandColor(client.brandName) }}
          >
            {initials(client.brandName)}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-base truncate">{client.brandName}</h2>
            <div className="text-[11px] text-slate-500 truncate flex items-center gap-1.5">
              <UserIcon className="h-3 w-3" />
              {client.ceoName}
              {client.ceoPhone && <><span>·</span><span className="font-mono">{client.ceoPhone}</span></>}
            </div>
          </div>
          <div className="flex gap-1">
            <button onClick={onEdit} className="text-xs px-2.5 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 font-semibold">
              Tahrirlash
            </button>
            <button onClick={onDelete} className="text-xs px-2 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 hover:bg-rose-100">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-700 px-2">
          {([
            { id: 'overview' as const, label: 'Profil', icon: Building2 },
            { id: 'activities' as const, label: `Muloqotlar (${ints.length})`, icon: MessageSquare },
            { id: 'ai' as const, label: 'AI Tahlil', icon: Sparkles },
          ]).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-3 py-2.5 text-xs font-bold inline-flex items-center gap-1.5 border-b-2 -mb-px transition ${
                tab === t.id
                  ? 'border-indigo-500 text-indigo-700 dark:text-indigo-300'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <t.icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto p-4">
          {tab === 'overview' && <OverviewTab client={client} />}
          {tab === 'activities' && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 dark:border-slate-700 p-3 bg-slate-50/50 dark:bg-slate-800/30">
                <div className="text-[11px] uppercase tracking-wider font-bold text-indigo-600 mb-2 flex items-center gap-1.5">
                  <Send className="h-3 w-3" /> Yangi muloqot qadami
                </div>
                <textarea
                  value={logSummary}
                  onChange={(e) => setLogSummary(e.target.value)}
                  placeholder="Mijoz bilan muloqot xulosasi..."
                  rows={3}
                  className="w-full text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 outline-none focus:border-indigo-500"
                />
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
                  <select
                    value={logSentiment}
                    onChange={(e) => setLogSentiment(e.target.value as 'positive' | 'neutral' | 'negative')}
                    className="text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5"
                  >
                    <option value="positive">😊 Ijobiy</option>
                    <option value="neutral">😐 Neytral</option>
                    <option value="negative">😟 Salbiy</option>
                  </select>
                  <input type="date" value={logNext} onChange={(e) => setLogNext(e.target.value)} placeholder="Keyingi" title="Keyingi aloqa" className="text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5" />
                  <input type="number" min={0} value={logVol} onChange={(e) => setLogVol(e.target.value)} placeholder="m³" className="text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5" />
                  <input type="date" value={logDate} onChange={(e) => setLogDate(e.target.value)} title="Va'da sanasi" className="text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5" />
                </div>
                <button
                  onClick={handleAdd}
                  disabled={saving || !logSummary.trim()}
                  className="mt-2 w-full inline-flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-sm py-2 rounded-xl"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {aiEnabled ? "Saqlash + Gemini'ga yuborish" : 'Saqlash'}
                </button>
              </div>

              {ints.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400">
                  Hali muloqot qadami yo'q. Yuqorida birinchisini qo'shing.
                </div>
              ) : (
                <ul className="space-y-2">
                  {ints.map((i) => (
                    <li key={i.id} className="rounded-xl border border-slate-200 dark:border-slate-700 p-2.5 bg-white dark:bg-slate-900">
                      <div className="flex items-start justify-between gap-2 mb-1 flex-wrap">
                        <div className="flex items-center gap-1.5 text-[11px]">
                          <span className="font-bold">{i.authorName}</span>
                          {i.sentiment === 'positive' && <span>😊</span>}
                          {i.sentiment === 'neutral' && <span>😐</span>}
                          {i.sentiment === 'negative' && <span>😟</span>}
                        </div>
                        <span className="text-[10px] text-slate-400 inline-flex items-center gap-1"><Clock className="h-2.5 w-2.5" />{fmtDate(i.createdAt)}</span>
                      </div>
                      <p className="text-xs text-slate-700 dark:text-slate-200 whitespace-pre-wrap break-words">{i.summary}</p>
                      {(i.promisedVolumeM3 || i.promisedOrderDate || i.nextContactDate) && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {i.promisedVolumeM3 ? <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">{i.promisedVolumeM3}m³</span> : null}
                          {i.promisedOrderDate ? <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-100 text-sky-700">Va'da: {fmtDay(i.promisedOrderDate)}</span> : null}
                          {i.nextContactDate ? <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-100 text-violet-700">Keyingi: {fmtDay(i.nextContactDate)}</span> : null}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {tab === 'ai' && <AITab client={client} onRefresh={onRefreshGemini} aiEnabled={aiEnabled} />}
        </div>
      </div>
    </>
  );
}

function OverviewTab({ client }: { client: B2BClient }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <InfoCard icon={UserIcon} label="CEO" value={client.ceoName} accent="indigo" />
        <InfoCard icon={Phone} label="Telefon" value={client.ceoPhone} mono accent="emerald" />
        <InfoCard icon={Home} label="Uy manzili" value={client.homeAddress} accent="sky" colSpan />
        <InfoCard icon={Heart} label="Xobbi" value={client.hobby} accent="rose" colSpan />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl border-2 border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/30 p-3 text-center">
          <Package className="h-5 w-5 text-emerald-600 mx-auto mb-1" />
          <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
            {client.promisedVolumeM3 ?? '—'}
            {client.promisedVolumeM3 ? <span className="text-sm">m³</span> : null}
          </div>
          <div className="text-[10px] uppercase tracking-wider text-emerald-700/70 font-bold">Va'da hajmi</div>
        </div>
        <div className="rounded-xl border-2 border-sky-300 dark:border-sky-800 bg-sky-50/50 dark:bg-sky-950/30 p-3 text-center">
          <Calendar className="h-5 w-5 text-sky-600 mx-auto mb-1" />
          <div className="text-sm font-bold text-sky-700 dark:text-sky-300 mt-2">
            {fmtDay(client.promisedOrderDate)}
          </div>
          <div className="text-[10px] uppercase tracking-wider text-sky-700/70 font-bold mt-1">Va'da sanasi</div>
        </div>
      </div>

      <div className="rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-950/20 p-3">
        <div className="flex items-center gap-1.5 mb-1.5">
          <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300">
            O'tmishdagi og'riqlar
          </span>
        </div>
        <p className="text-xs text-slate-700 dark:text-slate-200 whitespace-pre-wrap break-words">
          {client.historicalPainNotes || 'Hali yozilmagan'}
        </p>
      </div>

      <div className="text-[10px] text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
        <Briefcase className="h-3 w-3" />
        KAM: <b>{client.assignedKamName ?? '—'}</b>
        <span>·</span>
        Yangilangan: {fmtDate(client.updatedAt)}
      </div>
    </div>
  );
}

function InfoCard({
  icon: Icon, label, value, mono, accent, colSpan,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string; value?: string; mono?: boolean;
  accent: 'indigo' | 'emerald' | 'sky' | 'rose';
  colSpan?: boolean;
}) {
  const color = { indigo: 'text-indigo-600', emerald: 'text-emerald-600', sky: 'text-sky-600', rose: 'text-rose-600' }[accent];
  return (
    <div className={`rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 ${colSpan ? 'col-span-2' : ''}`}>
      <div className={`flex items-center gap-1.5 mb-0.5 ${color}`}>
        <Icon className="h-3 w-3" />
        <span className="text-[10px] uppercase tracking-wider font-bold">{label}</span>
      </div>
      <div className={`text-sm text-slate-700 dark:text-slate-100 break-words ${mono ? 'font-mono' : ''}`}>
        {value || '—'}
      </div>
    </div>
  );
}

function AITab({ client, onRefresh, aiEnabled }: { client: B2BClient; onRefresh: () => Promise<void>; aiEnabled: boolean }) {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 text-slate-100 p-4 space-y-3 border border-slate-800">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-fuchsia-500 to-violet-600 flex items-center justify-center shadow-lg shadow-fuchsia-500/30">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-sm">Gemini AI Co-Pilot</h3>
            <p className="text-[10px] text-slate-400">Real vaqtli prediksiya</p>
          </div>
        </div>
        <button
          onClick={onRefresh}
          disabled={client.geminiStatus === 'pending' || !aiEnabled}
          className="text-[10px] inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40"
        >
          {client.geminiStatus === 'pending' ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCcw className="h-3 w-3" />}
          Qayta tahlil
        </button>
      </div>

      {!aiEnabled && (
        <div className="rounded-xl border border-amber-800 bg-amber-950/40 p-3 text-[11px] text-amber-200">
          <div className="flex items-start gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
            <span>AI tahlil o'chirilgan. <b>Admin &gt; Sozlamalar &gt; Gemini AI</b> dan API kalit kiriting va yoqing.</span>
          </div>
        </div>
      )}

      {aiEnabled && client.geminiStatus === 'error' && (
        <div className="rounded-xl border border-rose-800 bg-rose-950/50 p-3 text-[11px] text-rose-300">
          <div className="flex items-start gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
            <span>{client.geminiError || 'Tahlil olishda xato'}</span>
          </div>
        </div>
      )}

      {aiEnabled && !client.geminiAIInsight && client.geminiStatus !== 'pending' && (
        <div className="text-center py-6">
          <Brain className="h-10 w-10 mx-auto text-slate-700 mb-2" />
          <p className="text-xs text-slate-400">
            Birinchi muloqot qadamini qo'shganingizda
            <br />Gemini avtomatik tahlil qiladi.
          </p>
        </div>
      )}

      {client.geminiStatus === 'pending' && (
        <div className="text-center py-6">
          <Loader2 className="h-8 w-8 mx-auto text-fuchsia-400 animate-spin mb-2" />
          <p className="text-xs text-slate-400">Tahlil qilinmoqda...</p>
        </div>
      )}

      {client.geminiAIInsight && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <MetricDial label="Ketib qolish" value={client.geminiAIInsight.churn_risk_percent} inverted />
            <MetricDial label="Zakaz ehtimoli" value={client.geminiAIInsight.predicted_order_probability} />
          </div>
          <div className="rounded-xl border border-violet-900 bg-violet-950/30 p-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Target className="h-3.5 w-3.5 text-violet-400" />
              <span className="text-[10px] uppercase tracking-wider font-bold text-violet-300">Psixologik yondashuv</span>
            </div>
            <p className="text-[12px] leading-relaxed text-slate-200 whitespace-pre-wrap break-words">
              {client.geminiAIInsight.psychological_approach}
            </p>
          </div>
          <div className="rounded-xl border border-emerald-900 bg-emerald-950/30 p-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              <ListChecks className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-300">Harakat rejasi</span>
            </div>
            <ul className="space-y-1">
              {client.geminiAIInsight.action_plan.map((step, n) => (
                <li key={n} className="text-[12px] text-slate-200 flex items-start gap-1.5">
                  <CheckCircle2 className="h-3 w-3 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="text-[10px] text-slate-500 text-center pt-1">
            Yangilangan: {fmtDate(client.geminiUpdatedAt)}
          </div>
        </>
      )}
    </div>
  );
}

function MetricDial({ label, value, inverted = false }: { label: string; value: number; inverted?: boolean }) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  const isGood = inverted ? clamped < 40 : clamped >= 60;
  const isWarn = inverted ? clamped >= 40 && clamped < 70 : clamped >= 30 && clamped < 60;
  const color = isGood ? 'text-emerald-400' : isWarn ? 'text-amber-400' : 'text-rose-400';
  const bgRing = isGood ? 'stroke-emerald-500' : isWarn ? 'stroke-amber-500' : 'stroke-rose-500';
  const TrendIcon = clamped >= 50 ? TrendingUp : TrendingDown;
  const R = 30;
  const C = 2 * Math.PI * R;
  const offset = C * (1 - clamped / 100);
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-center">
      <div className="relative inline-block">
        <svg width="80" height="80" className="-rotate-90">
          <circle cx="40" cy="40" r={R} className="stroke-slate-800" strokeWidth="6" fill="none" />
          <circle cx="40" cy="40" r={R} className={bgRing} strokeWidth="6" fill="none" strokeLinecap="round"
            strokeDasharray={C} strokeDashoffset={offset} style={{ transition: 'stroke-dashoffset 600ms ease' }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className={`text-xl font-bold ${color}`}>{clamped}%</div>
          <TrendIcon className={`h-3 w-3 ${color}`} />
        </div>
      </div>
      <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mt-1.5">{label}</div>
    </div>
  );
}

// === CLIENT MODAL (yangi / tahrirlash) ===
function ClientModal({
  value, onChange, onClose, onSave,
}: {
  value: B2BClient;
  onChange: (v: B2BClient) => void;
  onClose: () => void;
  onSave: (v: B2BClient) => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  async function handleSave() {
    if (!value.brandName.trim()) return toast.error('Brend nomi kerak');
    if (!value.ceoName.trim()) return toast.error('CEO ismi kerak');
    setSaving(true);
    try { await onSave(value); }
    catch (e) { toast.error((e as Error).message); }
    finally { setSaving(false); }
  }
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="b2b-grad-bar p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-lg">{value.id ? 'Mijozni tahrirlash' : "Yangi B2B mijoz"}</h3>
              <p className="text-xs text-white/80">Korporativ mijoz ma'lumotlari va aloqa kontakti</p>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/15">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="p-4 grid sm:grid-cols-2 gap-3">
          <F label="Brend nomi *"><input type="text" value={value.brandName} onChange={(e) => onChange({ ...value, brandName: e.target.value })} className="input" placeholder="MyBrand LLC" /></F>
          <F label="CEO ismi *"><input type="text" value={value.ceoName} onChange={(e) => onChange({ ...value, ceoName: e.target.value })} className="input" placeholder="Olimov Akmaljon" /></F>
          <F label="CEO telefoni"><input type="tel" value={value.ceoPhone} onChange={(e) => onChange({ ...value, ceoPhone: e.target.value })} className="input" placeholder="+998 90 123 45 67" /></F>
          <F label="Uy manzili"><input type="text" value={value.homeAddress ?? ''} onChange={(e) => onChange({ ...value, homeAddress: e.target.value })} className="input" placeholder="Toshkent, ..." /></F>
          <F label="Xobbi / qiziqishi"><input type="text" value={value.hobby ?? ''} onChange={(e) => onChange({ ...value, hobby: e.target.value })} className="input" placeholder="Futbol, sayohat..." /></F>
          <F label="Va'da hajmi (m³)"><input type="number" min={0} value={value.promisedVolumeM3 ?? ''} onChange={(e) => onChange({ ...value, promisedVolumeM3: e.target.value ? Number(e.target.value) : undefined })} className="input" placeholder="20" /></F>
          <F label="Va'da sanasi"><input type="date" value={value.promisedOrderDate ?? ''} onChange={(e) => onChange({ ...value, promisedOrderDate: e.target.value })} className="input" /></F>
          <div className="sm:col-span-2">
            <F label="O'tmishdagi kechikish og'riqlari">
              <textarea value={value.historicalPainNotes ?? ''} onChange={(e) => onChange({ ...value, historicalPainNotes: e.target.value })} rows={3} className="input" placeholder="Mas: '2024-yil sentyabrda 3 kun kechikish bo'ldi...'" />
            </F>
          </div>
        </div>
        <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800">Bekor</button>
          <button onClick={handleSave} disabled={saving} className="px-4 py-2 rounded-xl text-sm font-bold inline-flex items-center gap-1.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:from-indigo-500 hover:to-violet-500 disabled:opacity-60">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Saqlash
          </button>
        </div>
      </div>
    </div>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">{label}</div>
      {children}
    </label>
  );
}
