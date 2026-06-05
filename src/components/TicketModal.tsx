import { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import type { Stage, Ticket } from '../types';
import Modal from './Modal';
import CopyButton from './CopyButton';
import { formatDateTime, randomId, timeAgo } from '../utils/format';
import { dialNumber } from './Softphone';
import type { MisrouteDetails, TrackingType, WarehouseTrack, WarehouseReason } from '../types';
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
  MapPin,
  PackageX,
  PackageCheck,
  Warehouse,
  Plus,
  DollarSign,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Props {
  open: boolean;
  onClose: () => void;
  ticket?: Ticket | null;
  prefill?: {
    customerPhone?: string;
    customerName?: string;
    channel?: string;
  };
  onCreated?: (ticket: Ticket) => void;
}

export default function TicketModal({ open, onClose, ticket, prefill, onCreated }: Props) {
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
    notifyCallback,
    acceptTicket,
    settings,
  } = useApp();

  // Boshqa operatorga tegishli aktiv ticket ochilsa eslatma
  const notifiedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!open || !ticket || !currentUser) return;
    if (notifiedRef.current === ticket.id) return;
    if (ticket.assigneeId && ticket.assigneeId !== currentUser.id && ticket.status === 'pending') {
      notifyCallback(ticket);
      notifiedRef.current = ticket.id;
    }
  }, [open, ticket, currentUser, notifyCallback]);

  const isEdit = !!ticket;
  const activeCategories = useMemo(() => categories.filter((c) => c.active || c.id === ticket?.categoryId), [categories, ticket]);
  const [stageId, setStageId] = useState<string>(ticket?.stageId ?? stages[0]?.id ?? '');
  const [categoryId, setCategoryId] = useState<string>(ticket?.categoryId ?? '');
  const [customerName, setCustomerName] = useState(ticket?.customerName ?? '');
  const [customerPhone, setCustomerPhone] = useState(ticket?.customerPhone ?? '');
  const [channel, setChannel] = useState(ticket?.channel ?? 'Telefon');
  const [priority, setPriority] = useState<NonNullable<Ticket['priority']>>(ticket?.priority ?? 'normal');
  // Yangi murojaatda: operator yaratsa o'ziga biriktiriladi, admin yaratsa avto-biriktirish ishlaydi
  const [assigneeId, setAssigneeId] = useState(
    ticket?.assigneeId ?? (currentUser?.role === 'operator' ? currentUser.id : '')
  );
  const [details, setDetails] = useState<Record<string, string>>(ticket?.details ?? {});
  const [resolution, setResolution] = useState('');
  const [misroute, setMisroute] = useState<MisrouteDetails>(ticket?.misroute ?? {});
  const [warehouseTracks, setWarehouseTracks] = useState<WarehouseTrack[]>(ticket?.warehouseTracks ?? []);
  // Sklad bo'limi har bir murojaat ostida doim turmaydi — faqat tugma orqali ochiladi
  const [showWarehouse, setShowWarehouse] = useState<boolean>((ticket?.warehouseTracks?.length ?? 0) > 0);
  const [whTrackDraft, setWhTrackDraft] = useState('');
  const [whAmountDraft, setWhAmountDraft] = useState('');
  const [whReasonDraft, setWhReasonDraft] = useState<WarehouseReason>('paid');
  const [whNoteDraft, setWhNoteDraft] = useState('');

  const isMisroute = useMemo(() => {
    if (!categoryId) return false;
    const cat = categories.find((c) => c.id === categoryId);
    if (!cat) return false;
    return cat.id === 'cat-misroute' || /adash|misrout/i.test(cat.name);
  }, [categoryId, categories]);
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
      setCustomerName(ticket?.customerName ?? prefill?.customerName ?? '');
      setCustomerPhone(ticket?.customerPhone ?? prefill?.customerPhone ?? '');
      setChannel(ticket?.channel ?? prefill?.channel ?? 'Telefon');
      setPriority(ticket?.priority ?? 'normal');
      setAssigneeId(ticket?.assigneeId ?? currentUser?.id ?? '');
      setDetails(ticket?.details ?? {});
      setMisroute(ticket?.misroute ?? {});
      setWarehouseTracks(ticket?.warehouseTracks ?? []);
      setWhTrackDraft('');
      setWhAmountDraft('');
      setWhReasonDraft('paid');
      setWhNoteDraft('');
      setResolution('');
      setCustomTracking('');
      setInternalNoteDraft('');
      setPublicNoteDraft('');
    }
  }, [open, ticket, stages, currentUser, prefill]);

  const currentStage: Stage | undefined = useMemo(
    () => stages.find((s) => s.id === stageId),
    [stages, stageId]
  );

  async function handleSave() {
    if (!customerName.trim() || !customerPhone.trim()) {
      toast.error('Mijoz ismi va telefoni majburiy');
      return;
    }
    if (!customTracking.trim()) {
      toast.error('Trek raqami majburiy — kiriting');
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
          misroute: Object.values(misroute).some((v) => v) ? misroute : undefined,
          warehouseTracks: warehouseTracks.length ? warehouseTracks : undefined,
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
      const created = await createTicket({
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
        misroute: Object.values(misroute).some((v) => v) ? misroute : undefined,
        warehouseTracks: warehouseTracks.length ? warehouseTracks : undefined,
      });
      toast.success('Yangi murojaat yaratildi');
      if (onCreated && created) onCreated(created);
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
              <label className="label">Trek raqami <span className="text-rose-500">*</span></label>
              <input
                className="input mt-1 font-mono"
                placeholder="Trek raqamini kiriting (majburiy)"
                value={customTracking}
                onChange={(e) => setCustomTracking(e.target.value)}
                required
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
                <>
                  <div className="text-xs text-slate-500 mt-1.5">
                    {activeCategories.find((c) => c.id === categoryId)?.description}
                  </div>
                  <div className={`mt-3 grid grid-cols-1 ${isMisroute ? 'md:grid-cols-2' : ''} gap-3`}>
                    <div>
                      <label className="label">Mavzu izohi (qisqacha)</label>
                      <input
                        className="input mt-1"
                        placeholder="Masalan: trek topilmadi, manzil noto'g'ri, yetkazib berishni kechiktirish..."
                        value={details.topicNote ?? ''}
                        onChange={(e) => setDetails((d) => ({ ...d, topicNote: e.target.value }))}
                      />
                    </div>
                    {isMisroute && (
                    <div>
                      <label className="label">Kimning nomidan zayavka qilish kerak</label>
                      <select
                        className="input mt-1"
                        value={details.orderedBy ?? ''}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (v === '__customer__') {
                            // Mijoz nomidan — pastdagi mijoz ismi/telefonidan olinadi (avto)
                            setDetails((d) => ({
                              ...d,
                              orderedBy: customerName || 'Mijoz nomidan',
                              orderedByPhone: customerPhone,
                              orderedByFromCustomer: '1',
                            }));
                          } else if (!v) {
                            setDetails((d) => ({ ...d, orderedBy: '', orderedByPhone: '', orderedByFromCustomer: '' }));
                          } else {
                            const ord = (settings.orderers ?? []).find((o) => o.name === v);
                            setDetails((d) => ({
                              ...d,
                              orderedBy: v,
                              orderedByPhone: ord?.phone ?? '',
                              orderedByFromCustomer: '',
                            }));
                          }
                        }}
                      >
                        <option value="">— Tanlang —</option>
                        <option value="__customer__">👤 Mijoz nomidan</option>
                        {(settings.orderers ?? []).map((o) => (
                          <option key={o.id} value={o.name}>{o.name}</option>
                        ))}
                      </select>
                      {(details.orderedByPhone || (details.orderedByFromCustomer && customerPhone)) && (
                        <div className="text-[11px] text-slate-500 mt-1">
                          📞 {details.orderedByFromCustomer ? customerPhone : details.orderedByPhone}
                          {details.orderedByFromCustomer && customerName && ` · ${customerName}`}
                        </div>
                      )}
                    </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Toifaga moslashtirilgan maydonlar — admin Kategoriyalardan sozlaydi */}
          {(() => {
            const cat = activeCategories.find((c) => c.id === categoryId);
            const fields = cat?.fields ?? [];
            if (fields.length === 0) return null;
            return (
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3">
                <div className="label mb-2 text-xs">{cat?.icon ?? '📋'} {cat?.name} — qisqa ma'lumot</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {fields.map((f) => (
                    <div key={f.key} className={f.type === 'textarea' ? 'md:col-span-2' : ''}>
                      <label className="label text-xs">
                        {f.label}
                        {f.required && <span className="text-rose-500"> *</span>}
                      </label>
                      {f.type === 'textarea' ? (
                        <textarea
                          rows={2}
                          className="input mt-1 text-sm"
                          value={details[f.key] ?? ''}
                          onChange={(e) => setDetails((d) => ({ ...d, [f.key]: e.target.value }))}
                        />
                      ) : (
                        <input
                          className="input mt-1 text-sm"
                          type={f.type === 'number' ? 'number' : f.type === 'phone' ? 'tel' : 'text'}
                          value={details[f.key] ?? ''}
                          onChange={(e) => setDetails((d) => ({ ...d, [f.key]: e.target.value }))}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Mijoz ismi</label>
              <input className="input mt-1" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
            </div>
            <div>
              <label className="label flex items-center justify-between">
                <span>Telefon</span>
                <span className="flex items-center gap-1">
                  {customerPhone && (
                    <button
                      type="button"
                      onClick={() => dialNumber(customerPhone, { ticketId: ticket?.id, customerName })}
                      title="Qo'ng'iroq qilish"
                      className="p-1 rounded text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition"
                    >
                      <Phone className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {customerPhone && <CopyButton value={customerPhone} label="Telefon" />}
                </span>
              </label>
              <input className="input mt-1" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
            </div>
          </div>

          {currentStage && currentStage.fields.length > 0 && isEdit && (
            <details className="rounded-xl border border-slate-200 p-4">
              <summary className="label mb-2 cursor-pointer hover:text-brand-600 select-none">
                ▸ Bosqich maydonlari — {currentStage.name}
              </summary>
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
            </details>
          )}

          {isMisroute && (
            <div className="rounded-xl border-2 border-amber-300 dark:border-amber-700 bg-amber-50/40 dark:bg-amber-900/10 p-4">
              <div className="flex items-center gap-2 mb-3">
                <PackageX className="h-5 w-5 text-amber-600" />
                <h4 className="font-bold text-amber-900 dark:text-amber-200">Yuk adashishi — qo'shimcha ma'lumotlar</h4>
              </div>

              {/* Mas'ul kompaniya — bu shabolnni belgilaydi (EMU/BTS/Boshqa) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="label">Mas'ul kompaniya <span className="text-rose-500">*</span></label>
                  <select
                    className="input mt-1"
                    value={misroute.responsibleCompany ?? ''}
                    onChange={(e) => setMisroute({ ...misroute, responsibleCompany: (e.target.value || undefined) as 'EMU' | 'BTS' | 'OTHER' })}
                  >
                    <option value="">— Tanlang —</option>
                    <option value="EMU">EMU</option>
                    <option value="BTS">BTS</option>
                    <option value="OTHER">Boshqa</option>
                  </select>
                </div>
                <div>
                  <label className="label">Kim nomidan zayavka</label>
                  <select
                    className="input mt-1"
                    value={misroute.orderedBy ?? ''}
                    onChange={(e) => {
                      const nm = e.target.value;
                      const ord = (settings.orderers ?? []).find((o) => o.name === nm);
                      setMisroute({ ...misroute, orderedBy: nm || undefined, orderedByPhone: ord?.phone });
                    }}
                  >
                    <option value="">— Tanlang —</option>
                    {(settings.orderers ?? []).map((o) => (
                      <option key={o.id} value={o.name}>{o.name}</option>
                    ))}
                  </select>
                  {misroute.orderedByPhone && (
                    <div className="text-[11px] text-slate-500 mt-1">📞 {misroute.orderedByPhone}</div>
                  )}
                </div>
              </div>

              {/* Bir nechta trek / ID lar (probel yoki yangi qator bilan ajratiladi) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="label">Trek raqam(lar) <span className="text-slate-400">— bittadan ortiq bo'lsa</span></label>
                  <textarea
                    rows={2}
                    className="input mt-1 font-mono text-xs"
                    placeholder="Bir nechtasi bo'lsa probel yoki yangi qator bilan ajrating"
                    value={misroute.trekList ?? ''}
                    onChange={(e) => setMisroute({ ...misroute, trekList: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Mijoz ID(lar) <span className="text-slate-400">— bittadan ortiq bo'lsa</span></label>
                  <textarea
                    rows={2}
                    className="input mt-1 font-mono text-xs"
                    placeholder="EMU... yoki BTS kodlar — probel/yangi qator"
                    value={misroute.customerIdList ?? ''}
                    onChange={(e) => setMisroute({ ...misroute, customerIdList: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50/50 dark:bg-rose-900/10 p-3">
                  <div className="font-semibold text-sm text-rose-700 dark:text-rose-300 mb-2 flex items-center gap-1.5">
                    <PackageX className="h-4 w-4" /> Borib qolgan (xato) mijoz
                  </div>
                  <div className="space-y-2">
                    <input
                      className="input text-sm"
                      placeholder="Ism familiya"
                      value={misroute.wrongCustomerName ?? ''}
                      onChange={(e) => setMisroute({ ...misroute, wrongCustomerName: e.target.value })}
                    />
                    <div className="flex gap-1">
                      <input
                        className="input text-sm flex-1"
                        placeholder="Telefon"
                        value={misroute.wrongCustomerPhone ?? ''}
                        onChange={(e) => setMisroute({ ...misroute, wrongCustomerPhone: e.target.value })}
                      />
                      {misroute.wrongCustomerPhone && (
                        <button
                          type="button"
                          onClick={() => dialNumber(misroute.wrongCustomerPhone!)}
                          className="px-2 rounded text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30"
                          title="Qo'ng'iroq"
                        >
                          <Phone className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    <input
                      className="input text-sm"
                      placeholder="Manzil (borib qolgan)"
                      value={misroute.wrongAddress ?? ''}
                      onChange={(e) => setMisroute({ ...misroute, wrongAddress: e.target.value })}
                    />
                    <input
                      className="input text-sm"
                      placeholder="Yetkazib berish turi (kuryer/filial/pochta)"
                      value={misroute.wrongDeliveryType ?? ''}
                      onChange={(e) => setMisroute({ ...misroute, wrongDeliveryType: e.target.value })}
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/10 p-3">
                  <div className="font-semibold text-sm text-emerald-700 dark:text-emerald-300 mb-2 flex items-center gap-1.5">
                    <PackageCheck className="h-4 w-4" /> Borishi kerak bo'lgan (asl) mijoz
                  </div>
                  <div className="space-y-2">
                    <input
                      className="input text-sm"
                      placeholder="Ism familiya"
                      value={misroute.correctCustomerName ?? ''}
                      onChange={(e) => setMisroute({ ...misroute, correctCustomerName: e.target.value })}
                    />
                    <div className="flex gap-1">
                      <input
                        className="input text-sm flex-1"
                        placeholder="Telefon"
                        value={misroute.correctCustomerPhone ?? ''}
                        onChange={(e) => setMisroute({ ...misroute, correctCustomerPhone: e.target.value })}
                      />
                      {misroute.correctCustomerPhone && (
                        <button
                          type="button"
                          onClick={() => dialNumber(misroute.correctCustomerPhone!)}
                          className="px-2 rounded text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30"
                          title="Qo'ng'iroq"
                        >
                          <Phone className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    <input
                      className="input text-sm"
                      placeholder="Manzil (asl yetkazilishi kerak edi)"
                      value={misroute.correctAddress ?? ''}
                      onChange={(e) => setMisroute({ ...misroute, correctAddress: e.target.value })}
                    />
                    <input
                      className="input text-sm"
                      placeholder="Filial / BTS tel raqami (manzil egasiniki)"
                      value={misroute.destinationPhone ?? ''}
                      onChange={(e) => setMisroute({ ...misroute, destinationPhone: e.target.value })}
                    />
                    <input
                      className="input text-sm font-mono"
                      placeholder="BTS kod yoki filial kodi (ixtiyoriy)"
                      value={misroute.destinationCode ?? ''}
                      onChange={(e) => setMisroute({ ...misroute, destinationCode: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Yetkazib berish turi (yuk)</label>
                  <select
                    className="input mt-1"
                    value={misroute.trackingType ?? ''}
                    onChange={(e) =>
                      setMisroute({ ...misroute, trackingType: (e.target.value || undefined) as TrackingType })
                    }
                  >
                    <option value="">— Tanlang —</option>
                    <option value="BTS">BTS</option>
                    <option value="EMU">EMU</option>
                    <option value="DOSTAVKA">Dostavka</option>
                    <option value="IPOST-FILIAL">IPOST filial</option>
                    <option value="MIJOZ-UYIDAN">Mijoz uyidan</option>
                    <option value="MIJOZ-UYIGA">Mijoz uyiga</option>
                    <option value="OTHER">Boshqa</option>
                  </select>
                </div>
                <div>
                  <label className="label flex items-center gap-1">
                    Pochta ID
                    {(misroute.trackingType === 'BTS' || misroute.trackingType === 'EMU') && (
                      <span className="text-rose-500">*</span>
                    )}
                  </label>
                  <input
                    className="input mt-1 font-mono"
                    placeholder="BTS/EMU pochta ID raqami"
                    value={misroute.postalId ?? ''}
                    onChange={(e) => setMisroute({ ...misroute, postalId: e.target.value })}
                  />
                </div>
                <div className="col-span-2">
                  <label className="label">Qo'shimcha izoh</label>
                  <textarea
                    rows={2}
                    className="input mt-1"
                    placeholder="Voqea tafsilotlari, mijozdan olingan ma'lumotlar..."
                    value={misroute.notes ?? ''}
                    onChange={(e) => setMisroute({ ...misroute, notes: e.target.value })}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Omborga jo'natiladigan treklar — faqat tahrirlash rejimida */}
          {!showWarehouse && isEdit ? (
            <button
              type="button"
              onClick={() => setShowWarehouse(true)}
              className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-violet-300 dark:border-violet-700 text-violet-700 dark:text-violet-300 py-2.5 text-sm font-semibold hover:bg-violet-50 dark:hover:bg-violet-900/10 transition"
            >
              <Warehouse className="h-4 w-4" /> Sklad navbatiga qo'shish (ixtiyoriy)
            </button>
          ) : !showWarehouse ? null : (
          <div className="rounded-xl border-2 border-violet-300 dark:border-violet-700 bg-violet-50/40 dark:bg-violet-900/10 p-4">
            <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Warehouse className="h-5 w-5 text-violet-600" />
                <h4 className="font-bold text-violet-900 dark:text-violet-200">Omborga jo'natiladigan treklar</h4>
              </div>
              <div className="text-[11px] text-violet-700 dark:text-violet-300">
                {warehouseTracks.length > 0 && (
                  <>
                    {warehouseTracks.filter((w) => w.paid).length}/{warehouseTracks.length} to'langan
                  </>
                )}
              </div>
            </div>

            {/* Mavjud treklar */}
            {warehouseTracks.length > 0 && (
              <div className="space-y-1.5 mb-3">
                {warehouseTracks.map((wt) => {
                  const r = wt.reason ?? 'paid';
                  const reasonLabel =
                    r === 'paid' ? "💳 To'lov qilindi" :
                    r === 'returned' ? '↩️ Vozvrat' :
                    r === 'held' ? '⏸️ Ushlab qolingan' : '📦 Boshqa';
                  const reasonColor =
                    r === 'paid' ? 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200' :
                    r === 'returned' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200' :
                    r === 'held' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200' :
                    'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200';
                  return (
                    <div
                      key={wt.id}
                      className={`p-2 rounded-lg border ${
                        wt.releasedAt
                          ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800'
                          : 'bg-violet-50/60 dark:bg-violet-900/10 border-violet-200 dark:border-violet-800'
                      }`}
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-semibold text-sm text-brand-700 dark:text-brand-400 truncate">
                          {wt.trackingNumber}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${reasonColor}`}>
                          {reasonLabel}
                        </span>
                        {wt.amount ? (
                          <span className="text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
                            {wt.amount.toLocaleString('uz-UZ')} so'm
                          </span>
                        ) : null}
                        {wt.releasedAt && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-200 text-emerald-800 dark:bg-emerald-800 dark:text-emerald-100">
                            ✓ Chiqarildi
                          </span>
                        )}
                        <div className="flex-1" />
                        {!wt.releasedAt && (
                          <button
                            type="button"
                            onClick={() => {
                              setWarehouseTracks((arr) =>
                                arr.map((x) =>
                                  x.id === wt.id
                                    ? x.paid
                                      ? { ...x, paid: false, paidAt: undefined, paidBy: undefined, paidByName: undefined }
                                      : {
                                          ...x,
                                          paid: true,
                                          paidAt: Date.now(),
                                          paidBy: currentUser?.id,
                                          paidByName: currentUser?.fullName || currentUser?.username,
                                        }
                                    : x
                                )
                              );
                            }}
                            className={`px-2 py-1 rounded text-[10px] font-semibold ${
                              wt.paid
                                ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/40 dark:text-amber-200'
                                : 'bg-sky-600 text-white hover:bg-sky-700'
                            }`}
                            title={wt.paid ? "To'lovni bekor qilish" : "To'lov qilindi deb belgilash"}
                          >
                            {wt.paid ? "To'lov bekor" : "To'lov qilindi"}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setWarehouseTracks((arr) => arr.filter((x) => x.id !== wt.id))}
                          className="p-1 rounded text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30"
                          title="O'chirish"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      {wt.reasonNote && (
                        <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 pl-1 italic">
                          📝 {wt.reasonNote}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Yangi trek qo'shish */}
            <div className="space-y-2">
              {/* Sabab tanlash */}
              <div>
                <label className="text-[11px] font-semibold text-violet-800 dark:text-violet-200 uppercase tracking-wider">
                  Skladga jo'natish sababi
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5 mt-1">
                  {([
                    { v: 'paid' as WarehouseReason, label: "To'lovi endi qilindi", emoji: '💳' },
                    { v: 'returned' as WarehouseReason, label: 'Vozvrat bo\'lgan', emoji: '↩️' },
                    { v: 'held' as WarehouseReason, label: 'Skladda ushlab qolingan', emoji: '⏸️' },
                  ]).map((opt) => {
                    const active = whReasonDraft === opt.v;
                    return (
                      <button
                        key={opt.v}
                        type="button"
                        onClick={() => {
                          setWhReasonDraft(opt.v);
                          // "To'lovi endi qilindi" sabab uchun avto paid=true bo'ladi
                        }}
                        className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold border transition ${
                          active
                            ? 'border-violet-500 bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200'
                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 hover:border-violet-300'
                        }`}
                      >
                        <span>{opt.emoji}</span>
                        <span className="truncate">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <input
                  className="input text-sm flex-1 min-w-[180px] font-mono"
                  placeholder="Trek raqami"
                  value={whTrackDraft}
                  onChange={(e) => setWhTrackDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && whTrackDraft.trim()) {
                      e.preventDefault();
                      document.getElementById('wh-add-btn')?.click();
                    }
                  }}
                />
                <div className="relative">
                  <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    className="input text-sm w-32 pl-7"
                    type="number"
                    placeholder="Summa"
                    value={whAmountDraft}
                    onChange={(e) => setWhAmountDraft(e.target.value)}
                  />
                </div>
              </div>

              <input
                className="input text-sm w-full"
                placeholder={
                  whReasonDraft === 'held'
                    ? 'Nima sababdan ushlab qolingan? (majburiy)'
                    : "Qo'shimcha izoh (ixtiyoriy)"
                }
                value={whNoteDraft}
                onChange={(e) => setWhNoteDraft(e.target.value)}
              />

              <button
                id="wh-add-btn"
                type="button"
                onClick={() => {
                  if (!whTrackDraft.trim() || !currentUser) {
                    toast.error('Trek raqamini kiriting');
                    return;
                  }
                  if (whReasonDraft === 'held' && !whNoteDraft.trim()) {
                    toast.error("Ushlab qolish sababini yozing");
                    return;
                  }
                  const isPaid = whReasonDraft === 'paid';
                  const now = Date.now();
                  setWarehouseTracks((arr) => [
                    ...arr,
                    {
                      id: randomId('wh'),
                      trackingNumber: whTrackDraft.trim(),
                      reason: whReasonDraft,
                      reasonNote: whNoteDraft.trim() || undefined,
                      amount: whAmountDraft ? Number(whAmountDraft) : undefined,
                      paid: isPaid,
                      paidAt: isPaid ? now : undefined,
                      paidBy: isPaid ? currentUser.id : undefined,
                      paidByName: isPaid ? currentUser.fullName || currentUser.username : undefined,
                      addedAt: now,
                      addedBy: currentUser.id,
                    },
                  ]);
                  setWhTrackDraft('');
                  setWhAmountDraft('');
                  setWhNoteDraft('');
                }}
                className="btn-primary text-xs w-full"
              >
                <Plus className="h-3.5 w-3.5" /> Sklad navbatiga qo'shish
              </button>
            </div>

            <div className="mt-2 text-[11px] text-violet-700 dark:text-violet-300">
              Skladga jo'natilgan treklar darhol <b>Sklad navbati</b> sahifasida ko'rinadi.
              Ombor hodimi chiqarganda belgilaydi va navbatdan o'chadi.
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
              <div>
                <span className="font-semibold text-slate-600 dark:text-slate-300">Qo'shdi:</span>{' '}
                {users.find((u) => u.id === ticket.createdBy)?.fullName
                  ?? users.find((u) => u.id === ticket.createdBy)?.username
                  ?? ticket.createdBy}
              </div>
              {ticket.assigneeId && (
                <div>
                  <span className="font-semibold text-slate-600 dark:text-slate-300">Mas'ul:</span>{' '}
                  {users.find((u) => u.id === ticket.assigneeId)?.fullName
                    ?? users.find((u) => u.id === ticket.assigneeId)?.username
                    ?? '—'}
                </div>
              )}
              <div>Yaratilgan: {formatDateTime(ticket.createdAt)}</div>
              <div>Oxirgi o'zgarish: {formatDateTime(ticket.updatedAt)}</div>
              {ticket.resolvedAt && <div>Hal etilgan: {formatDateTime(ticket.resolvedAt)}</div>}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <button onClick={handleSave} className="btn-primary">
              {isEdit ? 'Saqlash' : 'Murojaat yaratish'}
            </button>
            {isEdit && ticket && ticket.assigneeId === currentUser?.id && !ticket.acceptedAt && (
              <button
                onClick={async () => {
                  try {
                    await acceptTicket(ticket.id);
                    toast.success('Qabul qildingiz ✓');
                  } catch (e) {
                    toast.error((e as Error).message);
                  }
                }}
                className="btn-primary bg-emerald-600 hover:bg-emerald-500"
              >
                ✓ Qabul qildim
              </button>
            )}
            {isEdit && ticket?.acceptedAt && (
              <div className="text-xs text-emerald-600 dark:text-emerald-400 text-center">
                ✓ Qabul qilingan ({new Date(ticket.acceptedAt).toLocaleString('uz')})
              </div>
            )}
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
