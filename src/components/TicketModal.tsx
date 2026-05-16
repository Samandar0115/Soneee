import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import type { Stage, Ticket } from '../types';
import Modal from './Modal';
import { formatDateTime, timeAgo } from '../utils/format';
import { CheckCircle2, Trash2, History } from 'lucide-react';
import toast from 'react-hot-toast';

interface Props {
  open: boolean;
  onClose: () => void;
  ticket?: Ticket | null;
}

export default function TicketModal({ open, onClose, ticket }: Props) {
  const { stages, users, currentUser, createTicket, updateTicket, moveTicket, resolveTicket, deleteTicket } = useApp();

  const isEdit = !!ticket;
  const [stageId, setStageId] = useState<string>(ticket?.stageId ?? stages[0]?.id ?? '');
  const [customerName, setCustomerName] = useState(ticket?.customerName ?? '');
  const [customerPhone, setCustomerPhone] = useState(ticket?.customerPhone ?? '');
  const [channel, setChannel] = useState(ticket?.channel ?? 'Telefon');
  const [priority, setPriority] = useState<NonNullable<Ticket['priority']>>(ticket?.priority ?? 'normal');
  const [assigneeId, setAssigneeId] = useState(ticket?.assigneeId ?? currentUser?.id ?? '');
  const [details, setDetails] = useState<Record<string, string>>(ticket?.details ?? {});
  const [resolution, setResolution] = useState('');

  useEffect(() => {
    if (open) {
      setStageId(ticket?.stageId ?? stages[0]?.id ?? '');
      setCustomerName(ticket?.customerName ?? '');
      setCustomerPhone(ticket?.customerPhone ?? '');
      setChannel(ticket?.channel ?? 'Telefon');
      setPriority(ticket?.priority ?? 'normal');
      setAssigneeId(ticket?.assigneeId ?? currentUser?.id ?? '');
      setDetails(ticket?.details ?? {});
      setResolution('');
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
      await createTicket({
        stageId,
        customerName,
        customerPhone,
        channel,
        priority,
        createdBy: currentUser.id,
        assigneeId,
        details,
      });
      toast.success('Yangi murojaat yaratildi');
    }
    onClose();
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Mijoz ismi</label>
              <input className="input mt-1" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
            </div>
            <div>
              <label className="label">Telefon</label>
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
