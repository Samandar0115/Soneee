import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Headphones, Search, CheckCircle2, Clock, Star, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import { useApp } from '../context/AppContext';
import { formatDateTime, timeAgo } from '../utils/format';
import type { Ticket } from '../types';

export default function Track() {
  const { findByTracking, stages, categories, rateTicket } = useApp();
  const [tracking, setTracking] = useState('');
  const [phone, setPhone] = useState('');
  const [searched, setSearched] = useState(false);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [thanked, setThanked] = useState(false);

  function lookup() {
    setSearched(true);
    setThanked(false);
    const found = findByTracking(tracking);
    if (!found) return setTicket(null);
    const phoneNorm = phone.replace(/\D/g, '');
    if (phoneNorm && !found.customerPhone.replace(/\D/g, '').includes(phoneNorm)) {
      setTicket(null);
      return;
    }
    setTicket(found);
    setRating(found.rating?.score ?? 0);
    setFeedback(found.rating?.feedback ?? '');
  }

  const stage = useMemo(
    () => (ticket ? stages.find((s) => s.id === ticket.stageId) : undefined),
    [ticket, stages]
  );
  const category = useMemo(
    () => (ticket ? categories.find((c) => c.id === ticket.categoryId) : undefined),
    [ticket, categories]
  );

  async function submitRating() {
    if (!ticket || !rating) return;
    await rateTicket(ticket.id, {
      score: rating,
      feedback: feedback.trim() || undefined,
      ratedAt: Date.now(),
    });
    toast.success('Rahmat!');
    setThanked(true);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-700 via-brand-600 to-brand-900 px-4 py-10">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6 text-white">
          <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center">
            <Headphones className="h-6 w-6" />
          </div>
          <div>
            <div className="text-xl font-bold">iPOST Cargo</div>
            <div className="text-xs opacity-80">Murojaat holatini tekshirish</div>
          </div>
        </div>

        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="card p-6">
          <h1 className="text-xl font-bold">Trek raqami orqali tekshirish</h1>
          <p className="text-sm text-slate-500 mt-1">
            Trek raqami va telefon raqamingizni kiriting
          </p>

          <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_auto] gap-2 mt-4">
            <input
              autoFocus
              className="input"
              placeholder="T-XXXX-YYYY"
              value={tracking}
              onChange={(e) => setTracking(e.target.value)}
            />
            <input
              className="input"
              placeholder="Telefon (oxirgi 4 raqam)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <button onClick={lookup} className="btn-primary">
              <Search className="h-4 w-4" /> Tekshirish
            </button>
          </div>

          {searched && !ticket && (
            <div className="mt-5 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm">
              Murojaat topilmadi. Trek raqami yoki telefonni qaytadan tekshiring.
            </div>
          )}
        </motion.div>

        {ticket && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.05 }}
            className="card p-6 mt-4"
          >
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <div className="text-xs text-slate-500">Trek</div>
                <div className="font-mono font-bold text-lg">{ticket.trackingNumber}</div>
              </div>
              <span
                className={`badge text-sm px-3 py-1 ${
                  ticket.status === 'resolved'
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-amber-100 text-amber-700'
                }`}
              >
                {ticket.status === 'resolved' ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" /> Hal etildi
                  </>
                ) : (
                  <>
                    <Clock className="h-4 w-4" /> Jarayonda
                  </>
                )}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
              <Field label="Joriy bosqich" value={stage?.name ?? '—'} color={stage?.color} />
              <Field label="Murojaat turi" value={category ? `${category.icon ?? ''} ${category.name}` : '—'} color={category?.color} />
              <Field label="Yaratilgan" value={formatDateTime(ticket.createdAt)} />
              <Field label="Yangilangan" value={timeAgo(ticket.updatedAt)} />
            </div>

            {ticket.publicComments && ticket.publicComments.length > 0 && (
              <div className="mt-4 border-t border-slate-200 pt-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <MessageSquare className="h-4 w-4" /> Operator izohlari
                </div>
                <div className="mt-2 space-y-2">
                  {ticket.publicComments.map((n) => (
                    <div key={n.id} className="p-3 rounded-xl bg-slate-50">
                      <div className="text-sm text-slate-800 whitespace-pre-wrap">{n.text}</div>
                      <div className="text-[11px] text-slate-400 mt-1">
                        {n.authorName ?? 'Operator'} · {timeAgo(n.createdAt)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {ticket.status === 'resolved' && (
              <div className="mt-5 border-t border-slate-200 pt-4">
                <div className="font-semibold text-slate-800">
                  {thanked || ticket.rating ? 'Bahoyingiz uchun rahmat!' : 'Xizmatimizni baholang'}
                </div>
                <div className="flex items-center gap-1 mt-2">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      onClick={() => setRating(n)}
                      disabled={!!ticket.rating || thanked}
                      className="p-1 disabled:cursor-default"
                    >
                      <Star
                        className={`h-7 w-7 transition ${
                          n <= rating
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-slate-300 hover:text-amber-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
                {!ticket.rating && !thanked && rating > 0 && (
                  <>
                    <textarea
                      className="input mt-3"
                      rows={2}
                      placeholder="Fikr-mulohaza (ixtiyoriy)"
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                    />
                    <button onClick={submitRating} className="btn-primary mt-2">
                      Yuborish
                    </button>
                  </>
                )}
              </div>
            )}
          </motion.div>
        )}

        <div className="text-center mt-6 text-xs text-white/70">
          iPOST CRM · Call Center Virtual Control Room
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-slate-500">{label}</div>
      <div
        className="font-semibold mt-0.5"
        style={color ? { color } : undefined}
      >
        {value}
      </div>
    </div>
  );
}
