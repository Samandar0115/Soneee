import { useMemo, useState } from 'react';
import {
  Phone,
  PhoneCall,
  PhoneMissed,
  Instagram,
  Send,
  CheckCircle2,
  Plus,
  Trash2,
  X,
  Inbox,
  CornerDownRight,
  Clock,
  CheckSquare,
  Square,
  MessageSquare,
  Clock3,
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import TicketModal from '../components/TicketModal';
import { useApp } from '../context/AppContext';
import type { Lead, LeadSource, LeadStatus } from '../types';
import { dialNumber } from '../components/Softphone';
import { timeAgo, formatDateTime } from '../utils/format';
import toast from 'react-hot-toast';

const SOURCE_META: Record<LeadSource, { label: string; icon: typeof Phone; color: string; channel: string }> = {
  instagram: { label: 'Instagram', icon: Instagram, color: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300', channel: 'Instagram' },
  telegram:  { label: 'Telegram',  icon: Send,      color: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300', channel: 'Telegram' },
  phone:     { label: 'Telefon',   icon: Phone,     color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300', channel: 'Telefon' },
  missed:    { label: "Javobsiz qo'ng'iroq", icon: PhoneMissed, color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300', channel: "Javobsiz qo'ng'iroq" },
};

const STATUS_META: Record<LeadStatus, { label: string; color: string }> = {
  new:         { label: 'Yangi',        color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  info_given:  { label: 'Info berildi', color: 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200' },
  callback:    { label: 'Kechroq bog\'lanish', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  unreachable: { label: 'Bog\'lana olmadi', color: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300' },
  converted:   { label: 'Murojaat ochildi', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
};

// Operator tanlaydigan natija kategoriyalari (qo'ng'iroqdan keyin)
const OUTCOME_OPTIONS: Array<{ status: LeadStatus; label: string; emoji: string }> = [
  { status: 'info_given', label: 'Info berildi', emoji: 'ℹ️' },
  { status: 'callback', label: "Kechroq bog'lanaman", emoji: '⏰' },
  { status: 'unreachable', label: 'Gaplasha olmadim', emoji: '📵' },
];

export default function LeadsPage() {
  const {
    leads, addLeads, markLeadInfoGiven, setLeadOutcome, updateLead, deleteLead,
    deleteLeads, markLeadsInfoGiven, clearLeads, currentUser,
  } = useApp();
  const isAdmin = currentUser?.role === 'admin';
  const [commentLead, setCommentLead] = useState<Lead | null>(null);
  const [commentText, setCommentText] = useState('');
  const [commentStatus, setCommentStatus] = useState<LeadStatus>('callback');
  const [intakeOpen, setIntakeOpen] = useState(false);
  const [intakeSource, setIntakeSource] = useState<LeadSource>('phone');
  const [intakePhones, setIntakePhones] = useState('');
  const [intakeNotes, setIntakeNotes] = useState('');
  const [filter, setFilter] = useState<LeadStatus | 'all'>('new');
  const [sourceFilter, setSourceFilter] = useState<LeadSource | 'all'>('all');
  const [convertingLead, setConvertingLead] = useState<Lead | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    return leads
      .filter((l) => (filter === 'all' ? true : l.status === filter))
      .filter((l) => (sourceFilter === 'all' ? true : l.source === sourceFilter));
  }, [leads, filter, sourceFilter]);

  // Filtr o'zgarsa, ko'rinmaydigan tanlovlarni tozalaymiz
  const visibleIds = useMemo(() => new Set(filtered.map((l) => l.id)), [filtered]);
  const selectedVisible = useMemo(
    () => [...selected].filter((id) => visibleIds.has(id)),
    [selected, visibleIds]
  );
  const allVisibleSelected = filtered.length > 0 && selectedVisible.length === filtered.length;

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        filtered.forEach((l) => next.delete(l.id));
      } else {
        filtered.forEach((l) => next.add(l.id));
      }
      return next;
    });
  }

  function clearSelection() {
    setSelected(new Set());
  }

  function bulkDelete() {
    if (selectedVisible.length === 0) return;
    if (!confirm(`${selectedVisible.length} ta murojaatni o'chirishni tasdiqlaysizmi?`)) return;
    deleteLeads(selectedVisible);
    clearSelection();
    toast.success(`${selectedVisible.length} ta o'chirildi`);
  }

  function bulkInfoGiven() {
    if (selectedVisible.length === 0) return;
    markLeadsInfoGiven(selectedVisible);
    clearSelection();
    toast.success(`${selectedVisible.length} ta "Info berildi" deb belgilandi`);
  }

  const stats = useMemo(() => {
    return {
      new: leads.filter((l) => l.status === 'new').length,
      info: leads.filter((l) => l.status === 'info_given').length,
      converted: leads.filter((l) => l.status === 'converted').length,
      total: leads.length,
    };
  }, [leads]);

  function parsePhones(raw: string): string[] {
    return raw
      .split(/[\n,;]+/)
      .map((s) => s.trim())
      .filter((s) => s.length >= 4);
  }

  function submitIntake() {
    const phones = parsePhones(intakePhones);
    if (phones.length === 0) {
      toast.error('Kamida bitta telefon raqami kerak');
      return;
    }
    const n = addLeads(phones, intakeSource, intakeNotes);
    toast.success(`${n} ta murojaat qo'shildi`);
    setIntakePhones('');
    setIntakeNotes('');
    setIntakeOpen(false);
  }

  function handleCall(lead: Lead) {
    dialNumber(lead.phone);
    if (lead.status === 'new') {
      // Faqat qo'ng'iroq vaqtini yozamiz, statusni o'zgartirmaymiz —
      // operator keyin "Info berildi" yoki "Murojaat ochish" ni tanlaydi.
      updateLead(lead.id, {
        calledAt: Date.now(),
        calledBy: currentUser?.id,
        calledByName: currentUser?.fullName ?? currentUser?.username,
      });
    }
  }

  function handleInfo(lead: Lead) {
    markLeadInfoGiven(lead.id);
    toast.success('Info berildi deb belgilandi');
  }

  function startConvert(lead: Lead) {
    setConvertingLead(lead);
  }

  function handleDelete(lead: Lead) {
    if (!confirm("O'chirishni tasdiqlaysizmi?")) return;
    deleteLead(lead.id);
  }

  function openComment(lead: Lead) {
    setCommentLead(lead);
    setCommentText(lead.notes ?? '');
    setCommentStatus(lead.status === 'new' ? 'callback' : lead.status);
  }

  function saveComment() {
    if (!commentLead) return;
    setLeadOutcome(commentLead.id, commentStatus, commentText.trim() || undefined);
    setCommentLead(null);
    setCommentText('');
    toast.success('Izoh saqlandi');
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Yangi murojaatlar"
        subtitle="Instagram, Telegram, telefon va javobsiz qo'ng'iroqlarni bitta navbatda qabul qilish. Qo'ng'iroqdan keyin: murojaat ochish yoki info berildi."
        actions={
          <button className="btn-primary" onClick={() => setIntakeOpen(true)}>
            <Plus className="h-4 w-4" /> Yangi qabul qilish
          </button>
        }
      />

      {/* Statistika kartochkalari */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <button
          onClick={() => setFilter('new')}
          className={`card p-4 text-left transition ${filter === 'new' ? 'ring-2 ring-blue-400' : ''}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-slate-500">Yangi</span>
            <Inbox className="h-4 w-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold mt-1">{stats.new}</div>
        </button>
        <button
          onClick={() => setFilter('info_given')}
          className={`card p-4 text-left transition ${filter === 'info_given' ? 'ring-2 ring-slate-400' : ''}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-slate-500">Info berildi</span>
            <CheckCircle2 className="h-4 w-4 text-slate-500" />
          </div>
          <div className="text-2xl font-bold mt-1">{stats.info}</div>
        </button>
        <button
          onClick={() => setFilter('converted')}
          className={`card p-4 text-left transition ${filter === 'converted' ? 'ring-2 ring-emerald-400' : ''}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-slate-500">Murojaat ochildi</span>
            <CornerDownRight className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold mt-1">{stats.converted}</div>
        </button>
        <button
          onClick={() => setFilter('all')}
          className={`card p-4 text-left transition ${filter === 'all' ? 'ring-2 ring-brand-400' : ''}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-slate-500">Jami</span>
            <Phone className="h-4 w-4 text-brand-500" />
          </div>
          <div className="text-2xl font-bold mt-1">{stats.total}</div>
        </button>
      </div>

      {/* Manba filterlari */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="text-xs uppercase tracking-wider text-slate-500 mr-1">Manba:</span>
        <button
          onClick={() => setSourceFilter('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
            sourceFilter === 'all' ? 'bg-brand-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Hammasi
        </button>
        {(Object.keys(SOURCE_META) as LeadSource[]).map((src) => {
          const m = SOURCE_META[src];
          const Icon = m.icon;
          return (
            <button
              key={src}
              onClick={() => setSourceFilter(src)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                sourceFilter === src ? 'bg-brand-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {m.label}
            </button>
          );
        })}
        {isAdmin && filter === 'info_given' && stats.info > 0 && (
          <button
            onClick={() => {
              if (confirm('Barcha "Info berildi" yozuvlarini o\'chirasizmi?')) clearLeads('info_given');
            }}
            className="ml-auto text-xs text-rose-600 hover:underline"
          >
            "Info berildi"larni tozalash
          </button>
        )}
      </div>

      {/* Ommaviy amallar paneli — bittadan tanlangan murojaatlar uchun */}
      {selectedVisible.length > 0 && (
        <div className="card p-3 mb-3 flex items-center gap-3 flex-wrap bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800">
          <span className="text-sm font-semibold text-brand-700 dark:text-brand-300">
            {selectedVisible.length} ta belgilandi
          </span>
          <div className="flex-1" />
          <button
            onClick={bulkInfoGiven}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200 inline-flex items-center gap-1"
          >
            <CheckCircle2 className="h-3.5 w-3.5" /> Info berildi (belgilangan)
          </button>
          {isAdmin && (
            <button
              onClick={bulkDelete}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700 inline-flex items-center gap-1"
            >
              <Trash2 className="h-3.5 w-3.5" /> O'chirish (belgilangan)
            </button>
          )}
          <button
            onClick={clearSelection}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 inline-flex items-center gap-1"
          >
            <X className="h-3.5 w-3.5" /> Bekor
          </button>
        </div>
      )}

      {/* Ro'yxat */}
      <div className="card overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Inbox className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p>Bu filterda murojaat yo'q</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40">
                  <th className="px-4 py-3 w-10">
                    <button
                      onClick={toggleAll}
                      title={allVisibleSelected ? 'Belgilashni bekor qilish' : 'Barchasini belgilash'}
                      className="flex items-center text-slate-500 hover:text-brand-600"
                    >
                      {allVisibleSelected ? (
                        <CheckSquare className="h-4 w-4 text-brand-600" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                    </button>
                  </th>
                  <th className="px-4 py-3">Telefon</th>
                  <th className="px-4 py-3">Manba</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Qabul qilingan</th>
                  <th className="px-4 py-3">Qo'ng'iroq</th>
                  <th className="px-4 py-3 text-right">Amallar</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((lead) => {
                  const m = SOURCE_META[lead.source];
                  const Icon = m.icon;
                  const st = STATUS_META[lead.status];
                  const isSel = selected.has(lead.id);
                  return (
                    <tr
                      key={lead.id}
                      className={`border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/40 ${
                        isSel ? 'bg-brand-50/60 dark:bg-brand-900/10' : ''
                      }`}
                    >
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleOne(lead.id)}
                          className="flex items-center text-slate-400 hover:text-brand-600"
                        >
                          {isSel ? (
                            <CheckSquare className="h-4 w-4 text-brand-600" />
                          ) : (
                            <Square className="h-4 w-4" />
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3 font-mono font-semibold">
                        {lead.phone}
                        {lead.notes && (
                          <div className="text-xs font-sans font-normal text-slate-500 mt-0.5">
                            {lead.notes}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`badge ${m.color} inline-flex items-center gap-1`}>
                          <Icon className="h-3 w-3" />
                          {m.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`badge ${st.color}`}>{st.label}</span>
                        {lead.status === 'converted' && lead.ticketTracking && (
                          <div className="text-[11px] text-slate-500 mt-0.5 font-mono">
                            {lead.ticketTracking}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        <div title={formatDateTime(lead.createdAt)}>{timeAgo(lead.createdAt)}</div>
                        {lead.createdByName && <div className="text-[11px]">{lead.createdByName}</div>}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {lead.calledAt ? (
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span title={formatDateTime(lead.calledAt)}>{timeAgo(lead.calledAt)}</span>
                          </div>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleCall(lead)}
                            title="Qo'ng'iroq qilish"
                            className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-600 dark:hover:bg-emerald-900/30"
                          >
                            <PhoneCall className="h-4 w-4" />
                          </button>
                          {lead.status !== 'converted' && (
                            <>
                              <button
                                onClick={() => startConvert(lead)}
                                title="Murojaat ochish"
                                className="px-2 py-1 rounded-lg text-xs font-semibold bg-brand-500 text-white hover:bg-brand-600"
                              >
                                + Murojaat
                              </button>
                              <button
                                onClick={() => openComment(lead)}
                                title="Izoh / holat (kechroq bog'lanaman, gaplasha olmadim...)"
                                className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600 dark:hover:bg-amber-900/30"
                              >
                                <MessageSquare className="h-4 w-4" />
                              </button>
                              {lead.status !== 'info_given' && (
                                <button
                                  onClick={() => handleInfo(lead)}
                                  title="Info berildi"
                                  className="px-2 py-1 rounded-lg text-xs font-semibold bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200"
                                >
                                  Info berildi
                                </button>
                              )}
                            </>
                          )}
                          {isAdmin && (
                            <button
                              onClick={() => handleDelete(lead)}
                              title="O'chirish (faqat admin)"
                              className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-600 dark:hover:bg-rose-900/30"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Yangi qabul qilish modal */}
      <Modal open={intakeOpen} onClose={() => setIntakeOpen(false)} title="Yangi murojaatlarni qabul qilish">
        <div className="space-y-4">
          <div>
            <label className="label">Manba</label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {(Object.keys(SOURCE_META) as LeadSource[]).map((src) => {
                const m = SOURCE_META[src];
                const Icon = m.icon;
                const active = intakeSource === src;
                return (
                  <button
                    key={src}
                    onClick={() => setIntakeSource(src)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 transition ${
                      active
                        ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-sm font-semibold">{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="label">
              Telefon raqamlar
              <span className="text-xs font-normal text-slate-500 ml-2">
                (har biri yangi qatorda yoki vergul bilan ajratilgan)
              </span>
            </label>
            <textarea
              className="input mt-1 min-h-[140px] font-mono text-sm"
              placeholder={"+998 90 123 45 67\n+998 99 765 43 21\n..."}
              value={intakePhones}
              onChange={(e) => setIntakePhones(e.target.value)}
            />
            <div className="text-xs text-slate-500 mt-1">
              {parsePhones(intakePhones).length} ta raqam topildi
            </div>
          </div>

          <div>
            <label className="label">Izoh (ixtiyoriy)</label>
            <input
              className="input mt-1"
              placeholder="Masalan: bugun ertalab Instagramda, narx so'rashgan"
              value={intakeNotes}
              onChange={(e) => setIntakeNotes(e.target.value)}
            />
          </div>

          <div className="flex gap-2">
            <button onClick={submitIntake} className="btn-primary flex-1">
              <Plus className="h-4 w-4" /> Qo'shish
            </button>
            <button onClick={() => setIntakeOpen(false)} className="btn-ghost">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </Modal>

      {/* Izoh / holat modali */}
      <Modal open={!!commentLead} onClose={() => setCommentLead(null)} title="Izoh va holat">
        <div className="space-y-4">
          {commentLead && (
            <div className="text-sm text-slate-500">
              <span className="font-mono font-semibold text-slate-700 dark:text-slate-200">{commentLead.phone}</span>
            </div>
          )}
          <div>
            <label className="label">Holat</label>
            <div className="grid grid-cols-1 gap-2 mt-2">
              {OUTCOME_OPTIONS.map((o) => (
                <button
                  key={o.status}
                  onClick={() => setCommentStatus(o.status)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-left transition ${
                    commentStatus === o.status
                      ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                  }`}
                >
                  <span>{o.emoji}</span>
                  <span className="text-sm font-semibold">{o.label}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label flex items-center gap-1"><MessageSquare className="h-3.5 w-3.5" /> Izoh</label>
            <textarea
              className="input mt-1 min-h-[90px]"
              placeholder="Masalan: Hozir bandman, kechqurun bog'laning dedi"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <button onClick={saveComment} className="btn-primary flex-1">
              <Clock3 className="h-4 w-4" /> Saqlash
            </button>
            <button onClick={() => setCommentLead(null)} className="btn-ghost">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </Modal>

      {/* Lead'dan to'liq murojaat ochish */}
      <TicketModal
        open={!!convertingLead}
        onClose={() => setConvertingLead(null)}
        prefill={
          convertingLead
            ? {
                customerPhone: convertingLead.phone,
                channel: SOURCE_META[convertingLead.source].channel,
              }
            : undefined
        }
        onCreated={(ticket) => {
          if (convertingLead) {
            updateLead(convertingLead.id, {
              status: 'converted',
              ticketId: ticket.id,
              ticketTracking: ticket.trackingNumber,
            });
            setConvertingLead(null);
          }
        }}
      />
    </div>
  );
}
