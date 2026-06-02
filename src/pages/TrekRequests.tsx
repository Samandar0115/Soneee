import { useMemo, useState } from 'react';
import { Unplug, Link2, CheckCircle2, XCircle, Send, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from '../components/PageHeader';
import AsyncButton from '../components/AsyncButton';
import { useApp } from '../context/AppContext';
import { sendTelegramMessage } from '../utils/telegram';
import { formatDateTime } from '../utils/format';

function parseTreks(text: string): string[] {
  return text
    .split(/[\s,;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function TrekRequests() {
  const { trekRequests, createTrekRequest, resolveTrekRequest, cancelTrekRequest, users, currentUser, perms, settings } = useApp();
  const [tab, setTab] = useState<'detach' | 'attach' | 'list'>('detach');

  // Uzish formasi
  const [detachTreks, setDetachTreks] = useState('');
  const [detachAdmin, setDetachAdmin] = useState('');
  // Birkitirish formasi
  const [attachTreks, setAttachTreks] = useState('');
  const [wrongId, setWrongId] = useState('');
  const [correctId, setCorrectId] = useState('');
  const [attachAdmin, setAttachAdmin] = useState('');

  const admins = useMemo(() => users.filter((u) => u.role === 'admin'), [users]);
  const isAdmin = perms.manage;
  const tg = settings.telegram;

  const visible = useMemo(() => {
    // Admin hammasini ko'radi; operator faqat o'zining so'rovlarini
    return [...trekRequests]
      .filter((r) => isAdmin || r.createdBy === currentUser?.id)
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [trekRequests, isAdmin, currentUser]);

  const pendingCount = visible.filter((r) => r.status === 'pending').length;

  async function sendToTelegram(r: { type: 'detach' | 'attach'; treks: string[]; wrongCustomerId?: string; correctCustomerId?: string }) {
    if (!tg?.enabled || !tg.botToken || !tg.defaultChatId) return; // jim
    const lines: string[] = [];
    if (r.type === 'detach') {
      lines.push('🔓 TREK UZISH SO\'ROVI');
      lines.push('━━━━━━━━━━━━━━━━━━━');
      lines.push(`Operator: ${currentUser?.fullName ?? currentUser?.username}`);
      lines.push(`Vaqt: ${new Date().toLocaleString('uz')}`);
      lines.push('');
      lines.push('Treklar:');
      for (const t of r.treks) lines.push(`• ${t}`);
    } else {
      lines.push('🔄 TREK BIRKITIRISH SO\'ROVI');
      lines.push('━━━━━━━━━━━━━━━━━━━');
      lines.push(`Operator: ${currentUser?.fullName ?? currentUser?.username}`);
      lines.push(`Vaqt: ${new Date().toLocaleString('uz')}`);
      lines.push('');
      lines.push(`Noto'g'ri ulangan ID: ${r.wrongCustomerId}`);
      lines.push('');
      lines.push('Treklar:');
      for (const t of r.treks) lines.push(`• ${t}`);
      lines.push('');
      lines.push(`To'g'ri ulanishi kerak ID: ${r.correctCustomerId}`);
    }
    await sendTelegramMessage(tg.botToken, tg.defaultChatId, lines.join('\n'));
  }

  async function submitDetach() {
    const treks = parseTreks(detachTreks);
    if (treks.length === 0) throw new Error('Kamida bitta trek kiriting');
    await createTrekRequest({
      type: 'detach',
      treks,
      assignedAdminId: detachAdmin || undefined,
    });
    await sendToTelegram({ type: 'detach', treks });
    setDetachTreks('');
    toast.success(`${treks.length} ta trek uzish so'rovi yuborildi`);
  }

  async function submitAttach() {
    const treks = parseTreks(attachTreks);
    if (treks.length === 0) throw new Error('Kamida bitta trek kiriting');
    if (!wrongId.trim()) throw new Error('Noto\'g\'ri ulangan ID kerak');
    if (!correctId.trim()) throw new Error('To\'g\'ri ID kerak');
    await createTrekRequest({
      type: 'attach',
      treks,
      wrongCustomerId: wrongId.trim(),
      correctCustomerId: correctId.trim(),
      assignedAdminId: attachAdmin || undefined,
    });
    await sendToTelegram({ type: 'attach', treks, wrongCustomerId: wrongId.trim(), correctCustomerId: correctId.trim() });
    setAttachTreks('');
    setWrongId('');
    setCorrectId('');
    toast.success(`${treks.length} ta trek birkitirish so'rovi yuborildi`);
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <PageHeader
        title="Trek tuzatish so'rovlari"
        subtitle="Trek noto'g'ri ID ga ulangan bo'lsa — uzish yoki to'g'ri ID ga birkitirish so'rovini yuboring"
      />

      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => setTab('detach')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${tab === 'detach' ? 'bg-brand-600 text-white' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'}`}
        >
          <Unplug className="h-4 w-4" /> 1. Uzish
        </button>
        <button
          onClick={() => setTab('attach')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${tab === 'attach' ? 'bg-brand-600 text-white' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'}`}
        >
          <Link2 className="h-4 w-4" /> 2. Birkitirish
        </button>
        <button
          onClick={() => setTab('list')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${tab === 'list' ? 'bg-brand-600 text-white' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'}`}
        >
          <Clock className="h-4 w-4" /> So'rovlar ({pendingCount})
        </button>
      </div>

      {tab === 'detach' && (
        <div className="card p-6 space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Unplug className="h-5 w-5 text-amber-600" />
              <h3 className="font-bold text-slate-800 dark:text-white">Trek uzish</h3>
            </div>
            <p className="text-sm text-slate-500">Bir yoki bir nechta trekni musodara ID dan uzib qo'yish.</p>
          </div>
          <div>
            <label className="label">Trek raqam(lar) <span className="text-rose-500">*</span></label>
            <textarea
              rows={5}
              className="input mt-1 font-mono text-sm"
              placeholder="Har bir trekni alohida qatorga yoki probel bilan ajrating&#10;Masalan:&#10;YT8859245026204&#10;777400803846717"
              value={detachTreks}
              onChange={(e) => setDetachTreks(e.target.value)}
            />
            <div className="text-[11px] text-slate-400 mt-1">
              {parseTreks(detachTreks).length} ta trek aniqlandi
            </div>
          </div>
          <div>
            <label className="label">Mas'ul admin (ixtiyoriy)</label>
            <select className="input mt-1" value={detachAdmin} onChange={(e) => setDetachAdmin(e.target.value)}>
              <option value="">— Hammasiga —</option>
              {admins.map((u) => (
                <option key={u.id} value={u.id}>{u.fullName ?? u.username}</option>
              ))}
            </select>
          </div>
          <AsyncButton
            onClick={submitDetach}
            successToast=""
            className="btn-primary w-full"
            loadingText="Yuborilmoqda..."
          >
            <Send className="h-4 w-4" /> So'rovni yuborish
          </AsyncButton>
        </div>
      )}

      {tab === 'attach' && (
        <div className="card p-6 space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link2 className="h-5 w-5 text-brand-600" />
              <h3 className="font-bold text-slate-800 dark:text-white">To'g'ri ID ga birkitirish</h3>
            </div>
            <p className="text-sm text-slate-500">Noto'g'ri ID dan uzib, to'g'risiga birkitirish.</p>
          </div>
          <div>
            <label className="label">Noto'g'ri ulangan Mijoz ID <span className="text-rose-500">*</span></label>
            <input
              className="input mt-1 font-mono text-sm"
              placeholder="Masalan: 100804"
              value={wrongId}
              onChange={(e) => setWrongId(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Trek raqam(lar) <span className="text-rose-500">*</span></label>
            <textarea
              rows={4}
              className="input mt-1 font-mono text-sm"
              placeholder="Har bir trekni alohida qatorga yoki probel bilan ajrating"
              value={attachTreks}
              onChange={(e) => setAttachTreks(e.target.value)}
            />
            <div className="text-[11px] text-slate-400 mt-1">
              {parseTreks(attachTreks).length} ta trek aniqlandi
            </div>
          </div>
          <div>
            <label className="label">To'g'ri ulanishi kerak Mijoz ID <span className="text-rose-500">*</span></label>
            <input
              className="input mt-1 font-mono text-sm"
              placeholder="Masalan: 100805"
              value={correctId}
              onChange={(e) => setCorrectId(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Mas'ul admin (ixtiyoriy)</label>
            <select className="input mt-1" value={attachAdmin} onChange={(e) => setAttachAdmin(e.target.value)}>
              <option value="">— Hammasiga —</option>
              {admins.map((u) => (
                <option key={u.id} value={u.id}>{u.fullName ?? u.username}</option>
              ))}
            </select>
          </div>
          <AsyncButton
            onClick={submitAttach}
            successToast=""
            className="btn-primary w-full"
            loadingText="Yuborilmoqda..."
          >
            <Send className="h-4 w-4" /> So'rovni yuborish
          </AsyncButton>
        </div>
      )}

      {tab === 'list' && (
        <div className="space-y-3">
          {visible.length === 0 && (
            <div className="card p-8 text-center text-slate-500">Hozircha so'rov yo'q.</div>
          )}
          {visible.map((r) => {
            const isMine = r.createdBy === currentUser?.id;
            const canResolve = isAdmin && r.status === 'pending';
            return (
              <div key={r.id} className="card p-4">
                <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    {r.type === 'detach' ? (
                      <Unplug className="h-4 w-4 text-amber-600" />
                    ) : (
                      <Link2 className="h-4 w-4 text-brand-600" />
                    )}
                    <span className="font-semibold text-slate-800 dark:text-white">
                      {r.type === 'detach' ? 'Uzish' : 'Birkitirish'}
                    </span>
                    {r.status === 'pending' && (
                      <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">Kutilmoqda</span>
                    )}
                    {r.status === 'done' && (
                      <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">Bajarildi</span>
                    )}
                    {r.status === 'cancelled' && (
                      <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-slate-200 text-slate-600">Bekor</span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500">{formatDateTime(r.createdAt)}</div>
                </div>

                {r.type === 'attach' && (
                  <div className="text-sm mb-2">
                    <span className="text-rose-600 font-mono">{r.wrongCustomerId}</span>
                    <span className="text-slate-400 mx-2">→</span>
                    <span className="text-emerald-600 font-mono">{r.correctCustomerId}</span>
                  </div>
                )}

                <div className="text-xs text-slate-500 mb-2">{r.treks.length} ta trek:</div>
                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-2 font-mono text-xs text-slate-700 dark:text-slate-300 mb-2">
                  {r.treks.join('  ')}
                </div>

                <div className="flex items-center justify-between flex-wrap gap-2 text-xs text-slate-500">
                  <div>
                    {r.createdByName ?? 'Operator'}
                    {r.assignedAdminId && ` → ${users.find((u) => u.id === r.assignedAdminId)?.fullName ?? '?'}`}
                    {r.status === 'done' && r.doneByName && ` · Bajardi: ${r.doneByName}`}
                  </div>
                  <div className="flex gap-1">
                    {canResolve && (
                      <>
                        <AsyncButton
                          onClick={() => resolveTrekRequest(r.id)}
                          successToast="Bajarildi"
                          className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 inline" /> Bajardim
                        </AsyncButton>
                        <AsyncButton
                          onClick={() => cancelTrekRequest(r.id)}
                          confirmText="Bekor qilamizmi?"
                          successToast="Bekor qilindi"
                          className="px-3 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 text-xs"
                        >
                          <XCircle className="h-3.5 w-3.5 inline" /> Bekor
                        </AsyncButton>
                      </>
                    )}
                    {isMine && r.status === 'pending' && !isAdmin && (
                      <AsyncButton
                        onClick={() => cancelTrekRequest(r.id)}
                        confirmText="Bekor qilamizmi?"
                        successToast="Bekor qilindi"
                        className="px-3 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 text-xs"
                      >
                        <XCircle className="h-3.5 w-3.5 inline" /> Bekor qilish
                      </AsyncButton>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
