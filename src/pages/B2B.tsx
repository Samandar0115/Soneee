// B2B Operativ KAM CRM — Gemini AI tahliliga ulangan modul
// Layout: 3 ustun (chap = 360° profil, markaz = muloqotlar + forma, o'ng = AI vidjet)
import { useMemo, useState } from 'react';
import {
  Building2, Plus, User as UserIcon, Phone, Home, Heart, AlertTriangle,
  Calendar, Package, Trash2, Save, Sparkles, RefreshCcw, MessageSquarePlus,
  TrendingUp, TrendingDown, Brain, Loader2, ListChecks, Target, CheckCircle2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from '../components/PageHeader';
import { useApp } from '../context/AppContext';
import type { B2BClient, B2BInteractionLog } from '../types';

function newClientDraft(): B2BClient {
  return {
    id: '',
    brandName: '',
    ceoName: '',
    ceoPhone: '',
    homeAddress: '',
    hobby: '',
    historicalPainNotes: '',
    promisedOrderDate: '',
    promisedVolumeM3: undefined,
    createdAt: 0,
    updatedAt: 0,
  };
}

function fmtDate(ms?: number): string {
  if (!ms) return '—';
  return new Date(ms).toLocaleString('uz-UZ', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}
function fmtDay(iso?: string): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('uz-UZ', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return iso;
  }
}

export default function B2BPage() {
  const {
    b2bClients, b2bInteractions,
    saveB2BClient, deleteB2BClient,
    addB2BInteraction, refreshGeminiInsight,
    currentUser,
  } = useApp();

  const [selectedId, setSelectedId] = useState<string | null>(b2bClients[0]?.id ?? null);
  const [editing, setEditing] = useState<B2BClient | null>(null);
  const [savingClient, setSavingClient] = useState(false);
  const [savingInteraction, setSavingInteraction] = useState(false);

  const selected = useMemo(
    () => b2bClients.find((c) => c.id === selectedId) ?? null,
    [b2bClients, selectedId],
  );
  const interactions = useMemo(
    () => b2bInteractions
      .filter((i) => i.clientId === selectedId)
      .sort((a, b) => b.createdAt - a.createdAt),
    [b2bInteractions, selectedId],
  );

  // Yangi muloqot formasi state
  const [logSummary, setLogSummary] = useState('');
  const [logSentiment, setLogSentiment] = useState<'positive' | 'neutral' | 'negative'>('neutral');
  const [logNext, setLogNext] = useState('');
  const [logPromisedVolume, setLogPromisedVolume] = useState('');
  const [logPromisedDate, setLogPromisedDate] = useState('');

  function openNew() {
    setEditing(newClientDraft());
  }
  function openEdit() {
    if (selected) setEditing({ ...selected });
  }

  async function handleSaveClient() {
    if (!editing) return;
    if (!editing.brandName.trim()) return toast.error('Brend nomi kerak');
    if (!editing.ceoName.trim()) return toast.error('CEO ismi kerak');
    setSavingClient(true);
    try {
      const isNew = !editing.id;
      const id = editing.id || `b2b_${Math.random().toString(36).slice(2, 10)}`;
      const data: B2BClient = {
        ...editing,
        id,
        assignedKamId: editing.assignedKamId || currentUser?.id,
        assignedKamName: editing.assignedKamName || currentUser?.fullName || currentUser?.username,
      };
      await saveB2BClient(data);
      toast.success(isNew ? "Mijoz qo'shildi" : 'Yangilandi');
      setSelectedId(id);
      setEditing(null);
    } catch (e) {
      toast.error((e as Error).message || 'Saqlashda xato');
    } finally {
      setSavingClient(false);
    }
  }

  async function handleDelete() {
    if (!selected) return;
    if (!confirm(`"${selected.brandName}" mijozni o'chirasizmi?`)) return;
    try {
      await deleteB2BClient(selected.id);
      toast.success("O'chirildi");
      setSelectedId(b2bClients.filter((c) => c.id !== selected.id)[0]?.id ?? null);
    } catch (e) {
      toast.error((e as Error).message || "O'chirib bo'lmadi");
    }
  }

  async function handleAddInteraction() {
    if (!selected) return;
    if (!logSummary.trim()) return toast.error("Xulosa bo'sh bo'lishi mumkin emas");
    setSavingInteraction(true);
    try {
      const payload: Omit<B2BInteractionLog, 'id' | 'createdAt' | 'authorId' | 'authorName'> = {
        clientId: selected.id,
        summary: logSummary.trim(),
        sentiment: logSentiment,
        nextContactDate: logNext || undefined,
        promisedVolumeM3: logPromisedVolume ? Number(logPromisedVolume) : undefined,
        promisedOrderDate: logPromisedDate || undefined,
      };
      await addB2BInteraction(payload);
      toast.success("Qo'shildi — Gemini tahlili yangilanmoqda");
      setLogSummary('');
      setLogNext('');
      setLogPromisedVolume('');
      setLogPromisedDate('');
      setLogSentiment('neutral');
    } catch (e) {
      toast.error((e as Error).message || 'Saqlashda xato');
    } finally {
      setSavingInteraction(false);
    }
  }

  async function handleRefreshGemini() {
    if (!selected) return;
    toast.loading('Gemini tahlil qilmoqda...', { id: 'gemini' });
    try {
      const r = await refreshGeminiInsight(selected.id);
      toast.dismiss('gemini');
      if (r) toast.success('Tahlil yangilandi');
      else toast.error('Tahlil olishda xato');
    } catch (e) {
      toast.dismiss('gemini');
      toast.error((e as Error).message || 'Xato');
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="B2B Operativ KAM CRM"
        subtitle="Korporativ mijozlar, muloqot loglari va Gemini AI tahliliga ulangan tahliliy oyna"
        actions={
          <button onClick={openNew} className="btn-primary inline-flex items-center gap-1.5">
            <Plus className="h-4 w-4" /> Yangi B2B mijoz
          </button>
        }
      />

      {/* === MIJOZLAR RO'YXATI === */}
      <div className="card p-3">
        {b2bClients.length === 0 ? (
          <div className="text-center py-6 text-slate-500 text-sm">
            Hali bironta B2B mijoz qo'shilmagan. "Yangi B2B mijoz" tugmasini bosing.
          </div>
        ) : (
          <div className="flex gap-2 overflow-x-auto scroll-thin pb-1">
            {b2bClients.map((c) => {
              const isActive = c.id === selectedId;
              const churn = c.geminiAIInsight?.churn_risk_percent;
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedId(c.id)}
                  className={`flex-shrink-0 text-left rounded-2xl border px-3 py-2 min-w-[200px] transition ${
                    isActive
                      ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/30 shadow-sm'
                      : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-brand-600 flex-shrink-0" />
                    <span className="font-bold text-sm truncate">{c.brandName}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 truncate mt-0.5">
                    {c.ceoName} · {c.ceoPhone || '—'}
                  </div>
                  {typeof churn === 'number' && (
                    <div className="mt-1.5 flex items-center gap-1">
                      <div className="flex-1 h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${
                            churn >= 70 ? 'bg-rose-500' : churn >= 40 ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${churn}%` }}
                        />
                      </div>
                      <span className="text-[9px] font-bold text-slate-600 dark:text-slate-300">
                        {churn}%
                      </span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* === 3 USTUN: PROFIL · MULOQOT · AI === */}
      {selected && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* LEFT: 360° profil */}
          <div className="lg:col-span-3 card p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white flex items-center justify-center flex-shrink-0">
                  <Building2 className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="font-bold text-base truncate">{selected.brandName}</h2>
                  <p className="text-[11px] text-slate-500">360° mijoz profili</p>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <button onClick={openEdit} className="text-[10px] px-2 py-1 rounded-lg bg-brand-50 text-brand-700 hover:bg-brand-100">
                  Tahrirlash
                </button>
                <button onClick={handleDelete} className="text-[10px] px-2 py-1 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 inline-flex items-center justify-center gap-1">
                  <Trash2 className="h-3 w-3" /> O'chirish
                </button>
              </div>
            </div>

            <ProfileRow icon={UserIcon} label="CEO" value={selected.ceoName} />
            <ProfileRow icon={Phone} label="Telefon" value={selected.ceoPhone} mono />
            <ProfileRow icon={Home} label="Uy manzili" value={selected.homeAddress || '—'} />
            <ProfileRow icon={Heart} label="Xobbi" value={selected.hobby || '—'} />

            <div className="rounded-xl border border-rose-200 bg-rose-50/60 dark:bg-rose-900/10 dark:border-rose-800 p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300">
                  Eski og'riqlar
                </span>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-200 whitespace-pre-wrap break-words">
                {selected.historicalPainNotes || "Hali yozilmagan"}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 dark:bg-emerald-900/10 dark:border-emerald-800 p-3">
                <div className="flex items-center gap-1 mb-0.5">
                  <Package className="h-3 w-3 text-emerald-700" />
                  <span className="text-[10px] uppercase text-emerald-700 font-bold">Va'da hajmi</span>
                </div>
                <div className="text-lg font-bold text-emerald-700">
                  {selected.promisedVolumeM3 ? `${selected.promisedVolumeM3}m³` : '—'}
                </div>
              </div>
              <div className="rounded-xl border border-sky-200 bg-sky-50/60 dark:bg-sky-900/10 dark:border-sky-800 p-3">
                <div className="flex items-center gap-1 mb-0.5">
                  <Calendar className="h-3 w-3 text-sky-700" />
                  <span className="text-[10px] uppercase text-sky-700 font-bold">Va'da sanasi</span>
                </div>
                <div className="text-xs font-bold text-sky-700">{fmtDay(selected.promisedOrderDate)}</div>
              </div>
            </div>

            <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
              KAM: <b>{selected.assignedKamName || '—'}</b> · Yangilangan: {fmtDate(selected.updatedAt)}
            </div>
          </div>

          {/* CENTER: muloqot loglari + yangi forma */}
          <div className="lg:col-span-5 card p-4 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <MessageSquarePlus className="h-4 w-4 text-brand-600" />
              <h3 className="font-bold text-sm">Operativ muloqot qadami</h3>
            </div>

            {/* Yangi qadam formasi */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 p-3 space-y-2 bg-slate-50/50 dark:bg-slate-900/30">
              <textarea
                value={logSummary}
                onChange={(e) => setLogSummary(e.target.value)}
                placeholder="Muloqot xulosasi (mas: 'Mijoz kelasi hafta 20m³ yuk berishga va'da qildi, do'stona muloqot, kayfiyati yaxshi')"
                rows={3}
                className="w-full text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 outline-none focus:border-brand-500"
              />
              <div className="grid sm:grid-cols-2 gap-2">
                <label className="block text-[11px]">
                  <span className="text-slate-500">Kayfiyat</span>
                  <select
                    value={logSentiment}
                    onChange={(e) => setLogSentiment(e.target.value as 'positive' | 'neutral' | 'negative')}
                    className="mt-0.5 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5 text-sm"
                  >
                    <option value="positive">😊 Ijobiy</option>
                    <option value="neutral">😐 Neytral</option>
                    <option value="negative">😟 Salbiy</option>
                  </select>
                </label>
                <label className="block text-[11px]">
                  <span className="text-slate-500">Keyingi aloqa</span>
                  <input
                    type="date"
                    value={logNext}
                    onChange={(e) => setLogNext(e.target.value)}
                    className="mt-0.5 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5 text-sm"
                  />
                </label>
                <label className="block text-[11px]">
                  <span className="text-slate-500">Va'da hajmi (m³)</span>
                  <input
                    type="number"
                    min={0}
                    value={logPromisedVolume}
                    onChange={(e) => setLogPromisedVolume(e.target.value)}
                    placeholder="20"
                    className="mt-0.5 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5 text-sm"
                  />
                </label>
                <label className="block text-[11px]">
                  <span className="text-slate-500">Va'da sanasi</span>
                  <input
                    type="date"
                    value={logPromisedDate}
                    onChange={(e) => setLogPromisedDate(e.target.value)}
                    className="mt-0.5 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5 text-sm"
                  />
                </label>
              </div>
              <button
                onClick={handleAddInteraction}
                disabled={savingInteraction || !logSummary.trim()}
                className="btn-primary w-full inline-flex items-center justify-center gap-2"
              >
                {savingInteraction ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {savingInteraction ? 'Saqlanmoqda...' : "Saqlash + Gemini'ga yuborish"}
              </button>
            </div>

            {/* Timeline */}
            <div>
              <div className="text-[11px] uppercase tracking-wider text-slate-500 font-bold mb-2">
                Tarix ({interactions.length})
              </div>
              {interactions.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs">
                  Hali muloqot qadami yo'q
                </div>
              ) : (
                <ul className="space-y-2 max-h-[480px] overflow-y-auto scroll-thin pr-1">
                  {interactions.map((i) => (
                    <li key={i.id} className="rounded-xl border border-slate-200 dark:border-slate-700 p-2.5 bg-white dark:bg-slate-900">
                      <div className="flex items-start justify-between gap-2 mb-1 flex-wrap">
                        <div className="flex items-center gap-1.5 text-[11px]">
                          <span className="font-bold text-slate-700 dark:text-slate-200">{i.authorName}</span>
                          {i.sentiment === 'positive' && <span title="Ijobiy">😊</span>}
                          {i.sentiment === 'neutral' && <span title="Neytral">😐</span>}
                          {i.sentiment === 'negative' && <span title="Salbiy">😟</span>}
                        </div>
                        <span className="text-[10px] text-slate-400">{fmtDate(i.createdAt)}</span>
                      </div>
                      <p className="text-xs text-slate-700 dark:text-slate-200 whitespace-pre-wrap break-words">
                        {i.summary}
                      </p>
                      {(i.promisedVolumeM3 || i.promisedOrderDate || i.nextContactDate) && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {i.promisedVolumeM3 ? (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">
                              Va'da: {i.promisedVolumeM3}m³
                            </span>
                          ) : null}
                          {i.promisedOrderDate ? (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-100 text-sky-700">
                              {fmtDay(i.promisedOrderDate)}
                            </span>
                          ) : null}
                          {i.nextContactDate ? (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-100 text-violet-700">
                              Keyingi: {fmtDay(i.nextContactDate)}
                            </span>
                          ) : null}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* RIGHT: Gemini AI Analitika — dark theme */}
          <div className="lg:col-span-4 rounded-2xl shadow-xl bg-gradient-to-br from-slate-900 via-slate-950 to-black text-slate-100 p-4 space-y-3 border border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-fuchsia-500 to-violet-600 flex items-center justify-center shadow-lg shadow-fuchsia-500/30">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Gemini AI Analitika</h3>
                  <p className="text-[10px] text-slate-400">Real vaqtli prediksiya</p>
                </div>
              </div>
              <button
                onClick={handleRefreshGemini}
                disabled={selected.geminiStatus === 'pending'}
                className="text-[10px] inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50"
                title="Qayta tahlil"
              >
                {selected.geminiStatus === 'pending'
                  ? <Loader2 className="h-3 w-3 animate-spin" />
                  : <RefreshCcw className="h-3 w-3" />}
                Yangilash
              </button>
            </div>

            {selected.geminiStatus === 'error' && (
              <div className="rounded-xl border border-rose-800 bg-rose-950/50 p-2.5 text-[11px] text-rose-300">
                <div className="flex items-start gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                  <span>{selected.geminiError || 'Tahlil olishda xato'}</span>
                </div>
              </div>
            )}

            {!selected.geminiAIInsight && selected.geminiStatus !== 'pending' && (
              <div className="text-center py-6">
                <Brain className="h-10 w-10 mx-auto text-slate-700 mb-2" />
                <p className="text-xs text-slate-400">
                  Birinchi muloqot qadamini qo'shganingizda
                  <br />Gemini tahlilni avtomatik yaratadi.
                </p>
              </div>
            )}

            {selected.geminiStatus === 'pending' && (
              <div className="text-center py-6">
                <Loader2 className="h-8 w-8 mx-auto text-fuchsia-400 animate-spin mb-2" />
                <p className="text-xs text-slate-400">Tahlil qilinmoqda...</p>
              </div>
            )}

            {selected.geminiAIInsight && (
              <>
                {/* METRIKA: 2 ta dial */}
                <div className="grid grid-cols-2 gap-2">
                  <MetricDial
                    label="Ketib qolish xavfi"
                    value={selected.geminiAIInsight.churn_risk_percent}
                    inverted
                  />
                  <MetricDial
                    label="Zakaz ehtimoli"
                    value={selected.geminiAIInsight.predicted_order_probability}
                  />
                </div>

                {/* PSIXOLOGIK YONDASHUV */}
                <div className="rounded-xl border border-violet-900 bg-violet-950/30 p-3">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Target className="h-3.5 w-3.5 text-violet-400" />
                    <span className="text-[10px] uppercase tracking-wider font-bold text-violet-300">
                      Psixologik yondashuv
                    </span>
                  </div>
                  <p className="text-[12px] leading-relaxed text-slate-200 whitespace-pre-wrap break-words">
                    {selected.geminiAIInsight.psychological_approach}
                  </p>
                </div>

                {/* HARAKAT REJASI */}
                <div className="rounded-xl border border-emerald-900 bg-emerald-950/30 p-3">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <ListChecks className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-300">
                      Harakat rejasi
                    </span>
                  </div>
                  <ul className="space-y-1">
                    {selected.geminiAIInsight.action_plan.map((step, n) => (
                      <li key={n} className="text-[12px] text-slate-200 flex items-start gap-1.5">
                        <CheckCircle2 className="h-3 w-3 text-emerald-400 flex-shrink-0 mt-0.5" />
                        <span>{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="text-[10px] text-slate-500 text-center pt-1">
                  Yangilangan: {fmtDate(selected.geminiUpdatedAt)}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* === TAHRIRLASH MODAL === */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <h3 className="font-bold text-lg">
                {editing.id ? 'Mijozni tahrirlash' : "Yangi B2B mijoz"}
              </h3>
              <button onClick={() => setEditing(null)} className="text-slate-500 hover:text-slate-700">✕</button>
            </div>
            <div className="p-4 grid sm:grid-cols-2 gap-3">
              <FormField label="Brend nomi *">
                <input
                  type="text"
                  value={editing.brandName}
                  onChange={(e) => setEditing({ ...editing, brandName: e.target.value })}
                  className="input"
                  placeholder="MyBrand LLC"
                />
              </FormField>
              <FormField label="CEO ismi *">
                <input
                  type="text"
                  value={editing.ceoName}
                  onChange={(e) => setEditing({ ...editing, ceoName: e.target.value })}
                  className="input"
                  placeholder="Olimov Akmaljon"
                />
              </FormField>
              <FormField label="CEO telefoni">
                <input
                  type="tel"
                  value={editing.ceoPhone}
                  onChange={(e) => setEditing({ ...editing, ceoPhone: e.target.value })}
                  className="input"
                  placeholder="+998 90 123 45 67"
                />
              </FormField>
              <FormField label="Uy manzili">
                <input
                  type="text"
                  value={editing.homeAddress ?? ''}
                  onChange={(e) => setEditing({ ...editing, homeAddress: e.target.value })}
                  className="input"
                  placeholder="Toshkent, Yashnobod tumani..."
                />
              </FormField>
              <FormField label="Xobbi / qiziqishi">
                <input
                  type="text"
                  value={editing.hobby ?? ''}
                  onChange={(e) => setEditing({ ...editing, hobby: e.target.value })}
                  className="input"
                  placeholder="Futbol, sayohat, mototsikl..."
                />
              </FormField>
              <FormField label="Va'da qilingan hajm (m³)">
                <input
                  type="number"
                  min={0}
                  value={editing.promisedVolumeM3 ?? ''}
                  onChange={(e) => setEditing({ ...editing, promisedVolumeM3: e.target.value ? Number(e.target.value) : undefined })}
                  className="input"
                  placeholder="20"
                />
              </FormField>
              <FormField label="Va'da qilingan sana">
                <input
                  type="date"
                  value={editing.promisedOrderDate ?? ''}
                  onChange={(e) => setEditing({ ...editing, promisedOrderDate: e.target.value })}
                  className="input"
                />
              </FormField>
              <div className="sm:col-span-2">
                <FormField label="O'tmishdagi kechikish og'riqlari">
                  <textarea
                    value={editing.historicalPainNotes ?? ''}
                    onChange={(e) => setEditing({ ...editing, historicalPainNotes: e.target.value })}
                    rows={3}
                    className="input"
                    placeholder="Mas: '2024-yil sentyabrda 3 kun kechikish bo'ldi. Mijoz juda asabiylashdi, MD telefon qilib uzr so'radi.'"
                  />
                </FormField>
              </div>
            </div>
            <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
              <button onClick={() => setEditing(null)} className="btn-ghost">Bekor</button>
              <button
                onClick={handleSaveClient}
                disabled={savingClient}
                className="btn-primary inline-flex items-center gap-1.5"
              >
                {savingClient ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Saqlash
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProfileRow({
  icon: Icon, label, value, mono,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="h-4 w-4 text-slate-400 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">{label}</div>
        <div className={`text-sm text-slate-700 dark:text-slate-200 break-words ${mono ? 'font-mono' : ''}`}>
          {value || '—'}
        </div>
      </div>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">{label}</div>
      {children}
    </label>
  );
}

function MetricDial({ label, value, inverted = false }: { label: string; value: number; inverted?: boolean }) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  // Inverted: yuqori = yomon (qizil); Default: yuqori = yaxshi (yashil)
  const isGood = inverted ? clamped < 40 : clamped >= 60;
  const isWarn = inverted ? clamped >= 40 && clamped < 70 : clamped >= 30 && clamped < 60;
  const color = isGood ? 'text-emerald-400' : isWarn ? 'text-amber-400' : 'text-rose-400';
  const bgRing = isGood ? 'stroke-emerald-500' : isWarn ? 'stroke-amber-500' : 'stroke-rose-500';
  const TrendIcon = inverted ? (clamped >= 50 ? TrendingUp : TrendingDown) : (clamped >= 50 ? TrendingUp : TrendingDown);

  const R = 30;
  const C = 2 * Math.PI * R;
  const offset = C * (1 - clamped / 100);

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-center">
      <div className="relative inline-block">
        <svg width="80" height="80" className="-rotate-90">
          <circle cx="40" cy="40" r={R} className="stroke-slate-800" strokeWidth="6" fill="none" />
          <circle
            cx="40" cy="40" r={R}
            className={bgRing}
            strokeWidth="6"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 600ms ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className={`text-xl font-bold ${color}`}>{clamped}%</div>
          <TrendIcon className={`h-3 w-3 ${color}`} />
        </div>
      </div>
      <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mt-1.5">
        {label}
      </div>
    </div>
  );
}
