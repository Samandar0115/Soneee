import { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import type { Stage, Ticket } from '../types';
import Modal from './Modal';
import CopyButton from './CopyButton';
import { formatDateTime, randomId, timeAgo } from '../utils/format';
import {
  CheckCircle2,
  Trash2,
  History,
  Paperclip,
  X,
  MessageSquare,
  Lock,
  AlertTriangle,
  Phone,
  FileText,
  Image as ImageIcon,
  Download,
  Clock as ClockIcon,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Props {
  open: boolean;
  onClose: () => void;
  ticket?: Ticket | null;
}

export default function TicketModal({ open, onClose, ticket }: Props) {
  const {
    stages,
    users,
    categories,
    currentUser,
    tickets,
    templates,
    findByPhone,
    findByTracking,
    createTicket,
    updateTicket,
    moveTicket,
    resolveTicket,
    deleteTicket,
    addAttachment,
    removeAttachment,
    addNote,
  } = useApp();

  const isEdit = !!ticket;
  const activeCategories = useMemo(() => categories.filter((c) => c.active || c.id === ticket?.categoryId), [categories, ticket]);
  const [stageId, setStageId] = useState<string>(ticket?.stageId ?? stages[0]?.id ?? '');
  const [categoryId, setCategoryId] = useState<string>(ticket?.categoryId ?? '');
  const [customerName, setCustomerName] = useState(ticket?.customerName ?? '');
  const [customerPhone, setCustomerPhone] = useState(ticket?.customerPhone ?? '');
  const [channel, setChannel] = useState(ticket?.channel ?? 'Telefon');
  const [priority, setPriority] = useState<NonNullable<Ticket['priority']>>(ticket?.priority ?? 'normal');
  const [assigneeId, setAssigneeId] = useState(ticket?.assigneeId ?? currentUser?.id ?? '');
  const [details, setDetails] = useState<Record<string, string>>(ticket?.details ?? {});
  const [resolution, setResolution] = useState('');
  const [customTracking, setCustomTracking] = useState('');
  const [internalNoteDraft, setInternalNoteDraft] = useState('');
  const [publicNoteDraft, setPublicNoteDraft] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const duplicateTicket = useMemo(() => {
    if (isEdit) return null;
    const tn = customTracking.trim();
    if (!tn) return null;
    return findByTracking(tn);
  }, [isEdit, customTracking, findByTracking]);

  const customerHistory = useMemo(() => {
    const phone = customerPhone.trim();
    if (!phone) return [];
    const list = findByPhone(phone);
    return list.filter((x) => x.id !== ticket?.id).slice(0, 6);
  }, [customerPhone, findByPhone, ticket]);

  const slaInfo = useMemo(() => {
    if (!ticket?.slaDueAt || ticket.status === 'resolved') return null;
    const diff = ticket.slaDueAt - Date.now();
    const overdue = diff < 0;
    const mins = Math.round(Math.abs(diff) / 60_000);
    const hrs = Math.floor(mins / 60);
    const txt = hrs > 0 ? `${hrs}s ${mins % 60}daq` : `${mins}daq`;
    return { overdue, txt };
  }, [ticket]);

  useEffect(() => {
    if (open) {
      setStageId(ticket?.stageId ?? stages[0]?.id ?? '');
      setCategoryId(ticket?.categoryId ?? '');
      setCustomerName(ticket?.customerName ?? '');
      setCustomerPhone(ticket?.customerPhone ?? '');
      setChannel(ticket?.channel ?? 'Telefon');
      setPriority(ticket?.priority ?? 'normal');
      setAssigneeId(ticket?.assigneeId ?? currentUser?.id ?? '');
      setDetails(ticket?.details ?? {});
      setResolution('');
      setCustomTracking('');
      setInternalNoteDraft('');
      setPublicNoteDraft('');
    }
  }, [open, ticket, stages, currentUser]);

  const currentStage: Stage | undefined = useMemo(
    () => stages.find((s) => s.id === stageId),
    [stages, stageId]
  );

  async function handleSave() {
    if (!customerName.trim() || !customerPhone.trim()) {
      toast.error('Mijoz ismi va telefoni majburiy');
      return;
    }
    if (!currentUser) return;
    if (isEdit && ticket) {
      await updateTicket(
        ticket.id,
        {
          categoryId: categoryId || undefined,
          customerName,
          customerPhone,
          channel,
          priority,
          assigneeId,
          details,
        },
        'Murojaat tahrirlandi'
      );
      if (ticket.stageId !== stageId) await moveTicket(ticket.id, stageId);
      toast.success('Saqlandi');
    } else {
      if (duplicateTicket) {
        toast.error("Bu trek raqami bilan murojaat allaqachon mavjud");
        return;
      }
      await createTicket({
        stageId,
        categoryId: categoryId || undefined,
        customerName,
        customerPhone,
        channel,
        priority,
        createdBy: currentUser.id,
        assigneeId,
        details,
        trackingNumber: customTracking.trim() || undefined,
      });
      toast.success('Yangi murojaat yaratildi');
    }
    onClose();
  }

  async function handleFile(files: FileList | null) {
    if (!ticket || !files) return;
    for (const file of Array.from(files)) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error(`${file.name} — 2 MB dan katta`);
        continue;
      }
      const reader = new FileReader();
      await new Promise<void>((resolve) => {
        reader.onload = async () => {
          await addAttachment(ticket.id, {
            id: randomId('att'),
            name: file.name,
            type: file.type,
            size: file.size,
            dataUrl: reader.result as string,
            uploadedBy: currentUser?.id ?? 'system',
            uploadedAt: Date.now(),
          });
          resolve();
        };
        reader.readAsDataURL(file);
      });
    }
    toast.success('Fayl(lar) yuklandi');
  }

  async function pushNote(kind: 'internal' | 'public') {
    if (!ticket) return;
    const text = kind === 'internal' ? internalNoteDraft : publicNoteDraft;
    if (!text.trim()) return;
    await addNote(ticket.id, kind, text);
    if (kind === 'internal') setInternalNoteDraft('');
    else setPublicNoteDraft('');
  }

  async function handleResolve() {
    if (!ticket) return;
    if (!resolution.trim()) {
      toast.error('Hal qilish natijasini kiriting');
      return;
    }
    await resolveTicket(ticket.id, resolution.trim());
    toast.success('Murojaat hal etildi');
    onClose();
  }

  async function handleDelete() {
    if (!ticket) return;
    if (!confirm("Murojaatni o'chirishni tasdiqlaysizmi?")) return;
    await deleteTicket(ticket.id);
    toast.success("O'chirildi");
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title={isEdit ? `Murojaat ${ticket?.trackingNumber}` : 'Yangi murojaat'}
    >
      <div className="grid md:grid-cols-3 gap-5">
        <div className="md:col-span-2 space-y-4">
          {!isEdit && (
            <div>
              <label className="label">Trek raqami (ixtiyoriy — bo'sh qoldirsangiz avtomatik)</label>
              <input
                className="input mt-1 font-mono"
                placeholder="T-XXXX-YYYY"
                value={customTracking}
                onChange={(e) => setCustomTracking(e.target.value)}
              />
              {duplicateTicket && (
                <div className="mt-2 flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <div>
                    <b>Dublikat:</b> bu trek raqami {duplicateTicket.customerName} ({duplicateTicket.customerPhone}) uchun allaqachon mavjud.
                  </div>
                </div>
              )}
            </div>
          )}

          {slaInfo && (
            <div
              className={`flex items-center gap-2 p-3 rounded-xl border text-sm ${
                slaInfo.overdue
                  ? 'bg-rose-50 border-rose-200 text-rose-800'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-800'
              }`}
            >
              <ClockIcon className="h-4 w-4" />
              {slaInfo.overdue ? (
                <span>SLA <b>{slaInfo.txt}</b> oldin kechikkan</span>
              ) : (
                <span>SLA muddatigacha <b>{slaInfo.txt}</b> qoldi</span>
              )}
            </div>
          )}

          {activeCategories.length > 0 && (
            <div>
              <label className="label">Murojaat turi (yo'nalish)</label>
              <div className="flex flex-wrap gap-2 mt-2">
                {activeCategories.map((c) => {
                  const selected = categoryId === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCategoryId(selected ? '' : c.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm transition ${
                        selected
                          ? 'border-transparent text-white shadow-soft'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                      }`}
                      style={selected ? { background: c.color } : { borderColor: `${c.color}55` }}
                    >
                      <span className="text-lg leading-none">{c.icon ?? '📌'}</span>
                      <span className="font-semibold">{c.name}</span>
                    </button>
                  );
                })}
              </div>
              {categoryId && (
                <div className="text-xs text-slate-500 mt-1.5">
                  {activeCategories.find((c) => c.id === categoryId)?.description}
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Mijoz ismi</label>
              <input className="input mt-1" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
            </div>
            <div>
              <label className="label flex items-center justify-between">
                <span>Telefon</span>
                {customerPhone && <CopyButton value={customerPhone} label="Telefon" />}
              </label>
              <input className="input mt-1" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
            </div>
            <div>
              <label className="label">Aloqa kanali</label>
              <select className="input mt-1" value={channel} onChange={(e) => setChannel(e.target.value)}>
                <option>Telefon</option>
                <option>Telegram</option>
                <option>WhatsApp</option>
                <option>Web</option>
                <option>Instagram</option>
              </select>
            </div>
            <div>
              <label className="label">Muhimlik</label>
              <select className="input mt-1" value={priority} onChange={(e) => setPriority(e.target.value as NonNullable<Ticket['priority']>)}>
                <option value="low">Past</option>
                <option value="normal">Oddiy</option>
                <option value="high">Yuqori</option>
                <option value="urgent">Shoshilinch</option>
              </select>
            </div>
            <div>
              <label className="label">Bosqich</label>
              <select className="input mt-1" value={stageId} onChange={(e) => setStageId(e.target.value)}>
                {stages.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Mas'ul operator</label>
              <select className="input mt-1" value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
                <option value="">— Tanlanmagan —</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.fullName ?? u.username} ({u.role})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {currentStage && currentStage.fields.length > 0 && (
            <div className="rounded-xl border border-slate-200 p-4">
              <div className="label mb-2">Bosqich maydonlari — {currentStage.name}</div>
              <div className="grid grid-cols-2 gap-3">
                {currentStage.fields.map((f) => (
                  <div key={f.key} className={f.type === 'textarea' ? 'col-span-2' : ''}>
                    <label className="label">
                      {f.label} {f.required && <span className="text-rose-500">*</span>}
                    </label>
                    {f.type === 'textarea' ? (
                      <textarea
                        className="input mt-1"
                        rows={3}
                        value={details[f.key] ?? ''}
                        onChange={(e) => setDetails((d) => ({ ...d, [f.key]: e.target.value }))}
                      />
                    ) : f.type === 'select' ? (
                      <select
                        className="input mt-1"
                        value={details[f.key] ?? ''}
                        onChange={(e) => setDetails((d) => ({ ...d, [f.key]: e.target.value }))}
                      >
                        <option value="">—</option>
                        {(f.options ?? []).map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        className="input mt-1"
                        type={f.type === 'number' ? 'number' : f.type === 'phone' ? 'tel' : 'text'}
                        value={details[f.key] ?? ''}
                        onChange={(e) => setDetails((d) => ({ ...d, [f.key]: e.target.value }))}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {isEdit && ticket && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3">
                <div className="flex items-center gap-2 label">
                  <Lock className="h-3.5 w-3.5" /> Ichki izohlar (faqat operatorlar)
                </div>
                <div className="max-h-40 overflow-y-auto scroll-thin mt-2 space-y-1.5">
                  {(ticket.internalNotes ?? []).map((n) => (
                    <div key={n.id} className="text-xs p-2 rounded-lg bg-amber-50 border border-amber-100">
                      <div className="text-amber-900 whitespace-pre-wrap">{n.text}</div>
                      <div className="text-[10px] text-amber-600 mt-0.5">
                        {n.authorName} · {timeAgo(n.createdAt)}
                      </div>
                    </div>
                  ))}
                  {(ticket.internalNotes ?? []).length === 0 && (
                    <div className="text-xs text-slate-400 text-center py-2">— bo'sh —</div>
                  )}
                </div>
                <div className="mt-2 flex gap-1">
                  <input
                    className="input text-xs"
                    placeholder="Ichki izoh..."
                    value={internalNoteDraft}
                    onChange={(e) => setInternalNoteDraft(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && pushNote('internal')}
                  />
                  <button onClick={() => pushNote('internal')} className="btn-ghost text-xs">+</button>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3">
                <div className="flex items-center justify-between label">
                  <span className="flex items-center gap-2">
                    <MessageSquare className="h-3.5 w-3.5" /> Ommaviy izohlar (mijoz ko'radi)
                  </span>
                  {templates.filter((tpl) => tpl.active).length > 0 && (
                    <select
                      className="text-[10px] bg-transparent border border-slate-200 dark:border-slate-700 rounded px-1 py-0.5 cursor-pointer"
                      defaultValue=""
                      onChange={(e) => {
                        const tpl = templates.find((x) => x.id === e.target.value);
                        if (tpl) {
                          setPublicNoteDraft((prev) => (prev ? prev + '\n' + tpl.body : tpl.body));
                        }
                        e.target.value = '';
                      }}
                    >
                      <option value="" disabled>📋 Shablon...</option>
                      {templates.filter((tpl) => tpl.active).map((tpl) => (
                        <option key={tpl.id} value={tpl.id}>
                          {tpl.title}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <div className="max-h-40 overflow-y-auto scroll-thin mt-2 space-y-1.5">
                  {(ticket.publicComments ?? []).map((n) => (
                    <div key={n.id} className="text-xs p-2 rounded-lg bg-brand-50 border border-brand-100">
                      <div className="text-brand-900 whitespace-pre-wrap">{n.text}</div>
                      <div className="text-[10px] text-brand-600 mt-0.5">
                        {n.authorName} · {timeAgo(n.createdAt)}
                      </div>
                    </div>
                  ))}
                  {(ticket.publicComments ?? []).length === 0 && (
                    <div className="text-xs text-slate-400 text-center py-2">— bo'sh —</div>
                  )}
                </div>
                <div className="mt-2 flex gap-1">
                  <textarea
                    className="input text-xs"
                    placeholder="Ommaviy izoh..."
                    rows={2}
                    value={publicNoteDraft}
                    onChange={(e) => setPublicNoteDraft(e.target.value)}
                  />
                  <button onClick={() => pushNote('public')} className="btn-ghost text-xs">+</button>
                </div>
              </div>
            </div>
          )}

          {isEdit && ticket && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3">
              <div className="flex items-center justify-between">
                <div className="label flex items-center gap-2">
                  <Paperclip className="h-3.5 w-3.5" /> Fayllar ({(ticket.attachments ?? []).length})
                </div>
                <button onClick={() => fileInputRef.current?.click()} className="btn-ghost text-xs">
                  <Paperclip className="h-3.5 w-3.5" /> Yuklash
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  hidden
                  onChange={(e) => handleFile(e.target.files)}
                />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                {(ticket.attachments ?? []).map((a) => (
                  <div key={a.id} className="relative group rounded-lg border border-slate-200 dark:border-slate-700 p-2 text-xs">
                    {a.type.startsWith('image/') ? (
                      <a href={a.dataUrl} target="_blank" rel="noreferrer">
                        <img src={a.dataUrl} alt={a.name} className="w-full h-20 object-cover rounded" />
                      </a>
                    ) : (
                      <div className="h-20 flex items-center justify-center bg-slate-50 dark:bg-slate-800 rounded">
                        <FileText className="h-8 w-8 text-slate-400" />
                      </div>
                    )}
                    <div className="mt-1 truncate font-semibold">{a.name}</div>
                    <div className="text-[10px] text-slate-400">{Math.round(a.size / 1024)} KB</div>
                    <div className="absolute top-1 right-1 hidden group-hover:flex gap-1">
                      <a
                        href={a.dataUrl}
                        download={a.name}
                        className="p-1 rounded bg-white text-brand-600 shadow"
                      >
                        <Download className="h-3 w-3" />
                      </a>
                      <button
                        onClick={() => removeAttachment(ticket.id, a.id)}
                        className="p-1 rounded bg-white text-rose-600 shadow"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
                {(ticket.attachments ?? []).length === 0 && (
                  <div className="col-span-full text-xs text-slate-400 text-center py-3">
                    Fayl yo'q (rasm, hujjat — max 2 MB)
                  </div>
                )}
              </div>
            </div>
          )}

          {isEdit && ticket?.status !== 'resolved' && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4">
              <div className="label text-emerald-700 mb-2 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" /> Hal qilish
              </div>
              <textarea
                className="input"
                rows={2}
                placeholder="Hal qilish natijasi (resolution)…"
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
              />
              <button className="btn-primary mt-2" onClick={handleResolve}>
                Hal etildi deb belgilash
              </button>
            </div>
          )}
        </div>

        <div className="space-y-3">
          {customerHistory.length > 0 && (
            <div className="card p-3">
              <div className="flex items-center gap-2 text-slate-500 text-xs">
                <Phone className="h-3.5 w-3.5" /> Bu mijozning oldingi murojaatlari ({customerHistory.length})
              </div>
              <div className="mt-2 space-y-1.5 max-h-40 overflow-y-auto scroll-thin pr-1">
                {customerHistory.map((h) => {
                  const stg = stages.find((s) => s.id === h.stageId);
                  return (
                    <div key={h.id} className="text-xs border-l-2 pl-2" style={{ borderColor: stg?.color ?? '#94a3b8' }}>
                      <div className="font-semibold text-slate-700 dark:text-slate-300 truncate">
                        {h.trackingNumber}
                      </div>
                      <div className="text-slate-400">
                        {stg?.name ?? '—'} · {h.status === 'resolved' ? '✓ hal' : '⏳ jarayonda'} · {timeAgo(h.createdAt)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {isEdit && ticket && (
            <div className="card p-3">
              <div className="flex items-center gap-2 text-slate-500 text-xs">
                <History className="h-3.5 w-3.5" /> Tarix
              </div>
              <div className="mt-2 space-y-2 max-h-72 overflow-y-auto scroll-thin pr-1">
                {[...ticket.history]
                  .sort((a, b) => b.timestamp - a.timestamp)
                  .map((h) => (
                    <div key={h.id} className="text-xs border-l-2 border-brand-200 pl-2">
                      <div className="font-semibold text-slate-700">{h.action}</div>
                      <div className="text-slate-400">
                        {h.actorName ?? h.actorId} · {timeAgo(h.timestamp)}
                      </div>
                      {h.note && <div className="text-slate-500">{h.note}</div>}
                    </div>
                  ))}
              </div>
            </div>
          )}

          {isEdit && ticket && (
            <div className="card p-3 text-xs space-y-1 text-slate-500">
              <div>Yaratilgan: {formatDateTime(ticket.createdAt)}</div>
              <div>Oxirgi o'zgarish: {formatDateTime(ticket.updatedAt)}</div>
              {ticket.resolvedAt && <div>Hal etilgan: {formatDateTime(ticket.resolvedAt)}</div>}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <button onClick={handleSave} className="btn-primary">
              {isEdit ? 'Saqlash' : 'Murojaat yaratish'}
            </button>
            {isEdit && currentUser?.role === 'admin' && (
              <button onClick={handleDelete} className="btn-danger">
                <Trash2 className="h-4 w-4" /> O'chirish
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
