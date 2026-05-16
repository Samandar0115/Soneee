import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import PageHeader from '../components/PageHeader';
import TicketModal from '../components/TicketModal';
import { useApp } from '../context/AppContext';
import type { Ticket } from '../types';
import { timeAgo } from '../utils/format';

export default function Pipeline() {
  const { stages, tickets, currentUser, moveTicket } = useApp();
  const [editing, setEditing] = useState<Ticket | null>(null);
  const [creating, setCreating] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);

  const visible = useMemo(() => {
    if (currentUser?.role === 'admin') return tickets;
    return tickets.filter(
      (t) => t.createdBy === currentUser?.id || t.assigneeId === currentUser?.id
    );
  }, [tickets, currentUser]);

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <PageHeader
        title="Pipeline (Kanban)"
        subtitle="Murojaatlarni bosqichlar bo'ylab sudrab o'tkazing"
        actions={
          <button className="btn-primary" onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" /> Yangi
          </button>
        }
      />

      <div className="flex gap-4 overflow-x-auto pb-3 scroll-thin">
        {stages.map((stage) => {
          const items = visible.filter((t) => t.stageId === stage.id);
          return (
            <div
              key={stage.id}
              className="min-w-[300px] w-[300px] flex-shrink-0 bg-slate-200/40 rounded-2xl p-3"
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (dragId) {
                  moveTicket(dragId, stage.id);
                  setDragId(null);
                }
              }}
            >
              <div className="flex items-center justify-between px-1 py-2">
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ background: stage.color }}
                  />
                  <h3 className="font-bold text-slate-800 text-sm">{stage.name}</h3>
                </div>
                <span className="text-xs font-semibold text-slate-500 bg-white px-2 py-0.5 rounded-full">
                  {items.length}
                </span>
              </div>

              <div className="space-y-2 min-h-[80px]">
                {items.map((t) => (
                  <motion.div
                    key={t.id}
                    layout
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    draggable
                    onDragStart={() => setDragId(t.id)}
                    onClick={() => setEditing(t)}
                    className="bg-white rounded-xl p-3 shadow-sm hover:shadow-soft border border-slate-100 cursor-grab active:cursor-grabbing"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-semibold text-sm text-slate-800 truncate">
                        {t.customerName}
                      </div>
                      <PriorityBadge p={t.priority} />
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{t.customerPhone}</div>
                    {t.details?.topic && (
                      <div className="text-xs text-slate-600 mt-1.5 line-clamp-2">
                        {t.details.topic}
                      </div>
                    )}
                    <div className="flex items-center justify-between mt-2 text-[11px] text-slate-400">
                      <span>{t.trackingNumber}</span>
                      <span>{timeAgo(t.updatedAt)}</span>
                    </div>
                  </motion.div>
                ))}
                {items.length === 0 && (
                  <div className="text-center text-xs text-slate-400 py-6">— bo'sh —</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <TicketModal open={creating} onClose={() => setCreating(false)} />
      <TicketModal open={!!editing} onClose={() => setEditing(null)} ticket={editing} />
    </div>
  );
}

function PriorityBadge({ p }: { p?: Ticket['priority'] }) {
  const map: Record<string, string> = {
    low: 'bg-slate-100 text-slate-600',
    normal: 'bg-brand-50 text-brand-700',
    high: 'bg-amber-100 text-amber-700',
    urgent: 'bg-rose-100 text-rose-700',
  };
  const labels: Record<string, string> = { low: 'Past', normal: 'Norm', high: 'Yuqori', urgent: 'Shosh.' };
  const k = p ?? 'normal';
  return <span className={`badge ${map[k]}`}>{labels[k]}</span>;
}
