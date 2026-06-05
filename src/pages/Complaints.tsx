import { useMemo, useState } from 'react';
import { MessageSquareWarning, Send, CheckCircle2, Clock, ClipboardCopy } from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from '../components/PageHeader';
import AsyncButton from '../components/AsyncButton';
import { useApp } from '../context/AppContext';
import { sendTelegramMessage } from '../utils/telegram';
import type { Complaint, ComplaintDirection } from '../types';

type Range = 'day' | 'week';

const COMPLAINT_DIRS: ComplaintDirection[] = ['IT', 'Logistika', 'Xitoy ombor', 'UZB ombor', 'Moliya', 'Sifat nazorati', 'Boshqa'];

function pad(n: number) { return n < 10 ? '0' + n : String(n); }
function toYmd(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }

function dayBounds(ymd: string) {
  const [y, m, d] = ymd.split('-').map(Number);
  const start = new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
  const end = new Date(y, m - 1, d, 23, 59, 59, 999).getTime();
  return { start, end };
}

function weekBoundsContaining(ymd: string) {
  const [y, m, d] = ymd.split('-').map(Number);
  const day = new Date(y, m - 1, d);
  // Dushanbadan boshlanadi
  const dow = (day.getDay() + 6) % 7;
  const mon = new Date(y, m - 1, d - dow, 0, 0, 0, 0);
  const sun = new Date(y, m - 1, d - dow + 6, 23, 59, 59, 999);
  return { start: mon.getTime(), end: sun.getTime(), label: `${toYmd(mon)} → ${toYmd(sun)}` };
}

function formatComplaint(c: Complaint): string {
  const time = new Date(c.createdAt).toLocaleString('uz', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  const lines = [
    `⚠️ ${c.direction}${c.subtype ? ` · ${c.subtype}` : ''}`,
    `   Vaqt: ${time}`,
    `   Yuborgan: ${c.createdByName ?? '—'}`,
  ];
  if (c.trek) lines.push(`   Trek: ${c.trek}`);
  lines.push(`   Izoh: ${c.note}`);
  if (c.status === 'done') lines.push(`   ✅ Hal qilindi`);
  return lines.join('\n');
}

export default function ComplaintsPage() {
  const { complaints, resolveComplaint, settings, perms } = useApp();
  const isAdmin = perms.manage;
  const [range, setRange] = useState<Range>('day');
  const [date, setDate] = useState<string>(toYmd(new Date()));
  const [dirFilter, setDirFilter] = useState<ComplaintDirection | 'ALL'>('ALL');

  const tg = settings.telegram;

  const { start, end, label } = useMemo(() => {
    if (range === 'day') {
      const { start, end } = dayBounds(date);
      return { start, end, label: date };
    }
    return weekBoundsContaining(date);
  }, [range, date]);

  const all = useMemo(
    () => (complaints ?? [])
      .filter((c) => c.createdAt >= start && c.createdAt <= end)
      .sort((a, b) => a.createdAt - b.createdAt),
    [complaints, start, end]
  );

  const filtered = useMemo(
    () => dirFilter === 'ALL' ? all : all.filter((c) => c.direction === dirFilter),
    [all, dirFilter]
  );

  // Yo'nalish bo'yicha guruhlash
  const grouped = useMemo(() => {
    const map = new Map<ComplaintDirection, Complaint[]>();
    for (const c of filtered) {
      const arr = map.get(c.direction) ?? [];
      arr.push(c);
      map.set(c.direction, arr);
    }
    return map;
  }, [filtered]);

  function summaryText(): string {
    const head = range === 'day'
      ? `⚠️ ${label} — Kunlik shikoyatlar (${filtered.length} ta)`
      : `⚠️ ${label} — Haftalik shikoyatlar (${filtered.length} ta)`;
    const lines = [head, '━━━━━━━━━━━━━━━━━━━'];
    // Yo'nalish bo'yicha sanog'i
    for (const d of COMPLAINT_DIRS) {
      const n = filtered.filter((c) => c.direction === d).length;
      lines.push(`• ${d}: ${n} ta`);
    }
    return lines.join('\n');
  }

  function combinedText(): string {
    const lines = [summaryText(), ''];
    for (const [dir, items] of grouped) {
      lines.push('');
      lines.push(`━━━━━ ${dir} (${items.length} ta) ━━━━━`);
      for (const c of items) {
        lines.push('');
        lines.push(formatComplaint(c));
      }
    }
    return lines.join('\n');
  }

  async function copy(text: string, msg = 'Nusxalandi') {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(msg);
    } catch {
      toast.error('Nusxalash xatosi');
    }
  }

  async function sendAllOne() {
    if (filtered.length === 0) throw new Error('Yuborish uchun shikoyat yo\'q');
    if (!tg?.enabled || !tg.botToken) throw new Error('Telegram bot yoqilmagan');
    if (!tg.defaultChatId) throw new Error('Standart chat ID kiritilmagan');
    const r = await sendTelegramMessage(tg.botToken, tg.defaultChatId, combinedText());
    if (!r.ok) throw new Error(r.error || 'Telegram xatosi');
    toast.success(`${filtered.length} ta shikoyat 1 ta xabarda yuborildi`);
  }

  async function sendByDirection() {
    if (filtered.length === 0) throw new Error('Yuborish uchun shikoyat yo\'q');
    if (!tg?.enabled || !tg.botToken) throw new Error('Telegram bot yoqilmagan');
    if (!tg.defaultChatId) throw new Error('Standart chat ID kiritilmagan');
    let sent = 0;
    // Xulosa
    await sendTelegramMessage(tg.botToken, tg.defaultChatId, summaryText());
    // Har yo'nalish — bitta xabarda
    for (const [dir, items] of grouped) {
      const blocks: string[] = [];
      blocks.push(`━━━━━ ${dir} (${items.length} ta) ━━━━━`);
      for (const c of items) blocks.push(formatComplaint(c));
      const r = await sendTelegramMessage(tg.botToken, tg.defaultChatId, blocks.join('\n\n'));
      if (r.ok) sent++;
    }
    toast.success(`${sent} ta yo'nalish bo'yicha jonatildi`);
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <PageHeader
        title="Shikoyatlar"
        subtitle="Hamma shikoyatlarni bir joyda — kunlik yoki haftalik bo'yicha guruhlab Telegramga yuboring"
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
              <button
                onClick={() => setRange('day')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${range === 'day' ? 'bg-white dark:bg-slate-900 shadow-soft text-brand-700' : 'text-slate-600'}`}
              >
                Kunlik
              </button>
              <button
                onClick={() => setRange('week')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${range === 'week' ? 'bg-white dark:bg-slate-900 shadow-soft text-brand-700' : 'text-slate-600'}`}
              >
                Haftalik
              </button>
            </div>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              max={toYmd(new Date())}
              className="input text-sm"
            />
          </div>
        }
      />

      <div className="card p-4 mb-4 flex items-center gap-3 flex-wrap">
        <div className="h-10 w-10 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center">
          <MessageSquareWarning className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm text-slate-500">{range === 'day' ? label : label}</div>
          <div className="text-2xl font-bold text-slate-800 dark:text-white">
            {filtered.length} <span className="text-base font-normal text-slate-500">ta shikoyat ({dirFilter === 'ALL' ? 'hammasi' : dirFilter})</span>
          </div>
        </div>
        <AsyncButton
          onClick={() => copy(combinedText(), `${filtered.length} ta shikoyat nusxalandi`)}
          disabled={filtered.length === 0}
          className="btn-ghost text-sm disabled:opacity-50"
          loadingText="..."
        >
          <ClipboardCopy className="h-4 w-4" /> Nusxalash
        </AsyncButton>
        <AsyncButton
          onClick={sendByDirection}
          disabled={filtered.length === 0}
          className="btn-primary text-sm disabled:opacity-50"
          loadingText="Yuborilmoqda..."
          title="Xulosa + har yo'nalish bitta xabarda"
        >
          <Send className="h-4 w-4" /> Yo'nalish bo'yicha
        </AsyncButton>
        <AsyncButton
          onClick={sendAllOne}
          disabled={filtered.length === 0}
          className="btn-ghost text-sm disabled:opacity-50"
          loadingText="Yuborilmoqda..."
          title="Hammasi bitta katta xabarda"
        >
          <Send className="h-4 w-4" /> Bitta xabar
        </AsyncButton>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => setDirFilter('ALL')}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition border ${
            dirFilter === 'ALL' ? 'bg-brand-600 text-white border-brand-600' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
          }`}
        >
          Hammasi <span className="opacity-70">({all.length})</span>
        </button>
        {COMPLAINT_DIRS.map((d) => {
          const n = all.filter((c) => c.direction === d).length;
          return (
            <button
              key={d}
              onClick={() => setDirFilter(d)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition border ${
                dirFilter === d ? 'bg-brand-600 text-white border-brand-600' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              {d} <span className="opacity-70">({n})</span>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="card p-10 text-center text-slate-500">
          <MessageSquareWarning className="h-10 w-10 mx-auto mb-3 opacity-40" />
          Bu davrda shikoyat yo'q.
        </div>
      ) : (
        <div className="space-y-4">
          {[...grouped.entries()].map(([dir, items]) => (
            <div key={dir} className="card p-4">
              <div className="flex items-center gap-2 mb-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300">
                  {dir}
                </span>
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {items.length} ta shikoyat
                </span>
              </div>
              <div className="space-y-2">
                {items.map((c) => (
                  <div key={c.id} className="border border-slate-200 dark:border-slate-700 rounded-xl p-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                      <div className="flex items-center gap-2">
                        {c.status === 'pending' && (
                          <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 inline-flex items-center gap-1">
                            <Clock className="h-3 w-3" /> Kutilmoqda
                          </span>
                        )}
                        {c.status === 'done' && (
                          <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 inline-flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Bajarildi
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400">{new Date(c.createdAt).toLocaleString('uz')}</div>
                    </div>
                    {c.subtype && (
                      <div className="text-[11px] text-slate-500 mb-1">
                        <span className="inline-block px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800">{c.subtype}</span>
                      </div>
                    )}
                    {c.trek && <div className="font-mono text-xs text-brand-600 dark:text-brand-400 mb-1">{c.trek}</div>}
                    <div className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap">{c.note}</div>
                    <div className="flex items-center justify-between gap-2 mt-2 flex-wrap">
                      <div className="text-[11px] text-slate-500">
                        {c.createdByName ?? '—'}
                        {c.status === 'done' && c.doneByName && ` · Bajardi: ${c.doneByName}`}
                      </div>
                      {isAdmin && c.status === 'pending' && (
                        <AsyncButton
                          onClick={() => resolveComplaint(c.id)}
                          successToast="Bajarildi"
                          className="px-2 py-1 rounded text-[11px] bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
                        >
                          ✓ Bajardim
                        </AsyncButton>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
