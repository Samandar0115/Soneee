import { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { ClipboardCopy, FileSpreadsheet, Send, AlertTriangle, Truck } from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from '../components/PageHeader';
import { useApp } from '../context/AppContext';
import { sendTelegramMessage } from '../utils/telegram';
import type { Ticket } from '../types';

// Buyurtmachi kompaniya nomi (sozlamadan o'qish mumkin, hozircha standart)
const COMPANY_NAME = 'ABUSAXIYTEZ';

function pad(n: number) { return n < 10 ? '0' + n : String(n); }
function toYmd(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }

function dayBounds(ymd: string) {
  const [y, m, d] = ymd.split('-').map(Number);
  const start = new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
  const end = new Date(y, m - 1, d, 23, 59, 59, 999).getTime();
  return { start, end };
}

// Bitta murojaatni o'sha aniq formatga o'tkazadi — yo'nalish va to'liq murojaat
function formatTicket(t: Ticket, branchPhone: string, operatorPhone: string): string {
  const m = t.misroute ?? {};
  const trackType = m.trackingType || 'OTHER';
  const wrongAddr = m.wrongAddress || '—';
  const wrongName = m.wrongCustomerName || '';
  const wrongPhone = m.wrongCustomerPhone || '';
  const wrongDelivery = m.wrongDeliveryType || '';
  const customerName = m.correctCustomerName || t.customerName || '';
  const customerPhone = m.correctCustomerPhone || t.customerPhone || '';
  const customerId = m.postalId || t.details?.customerId || '';
  const correctAddr = m.correctAddress || '';
  const orderedBy = m.orderedBy || '';
  const note = m.notes || t.details?.topicNote || '';

  const lines: string[] = [];
  lines.push(`Заказчик: ${COMPANY_NAME}`);
  if (orderedBy) lines.push(`${orderedBy} nomidan zayavka qilish kerak`);
  if (operatorPhone) lines.push(`${operatorPhone}`);
  lines.push('');
  lines.push(`Yo'nalish: ${trackType}`);
  lines.push('');
  lines.push(`Товар олинадиган манзил: "${wrongAddr}"`);
  if (branchPhone) lines.push(`Filial tel raqami: ${branchPhone}`);
  if (wrongName) lines.push(`Noto'g'ri ism: ${wrongName}`);
  if (wrongPhone) lines.push(`Noto'g'ri tel: ${wrongPhone}`);
  if (wrongDelivery) lines.push(`Noto'g'ri yetkazish turi: ${wrongDelivery}`);
  lines.push('');
  lines.push(`Trek raqam: ${t.trackingNumber}`);
  lines.push('');
  lines.push('Олувчининг маълумотлари');
  lines.push('');
  if (customerPhone) lines.push(`Mijoz tel raqami: ${customerPhone}`);
  lines.push('');
  if (customerName) lines.push(`Mijoz ism familiyasi: ${customerName}`);
  lines.push('');
  if (customerId) lines.push(`Mijoz ID: ${customerId}`);
  lines.push('');
  lines.push(`"${wrongAddr}dan" "IPOST FILIAL" ga yetkazish ${trackType} orqali`);
  if (correctAddr) lines.push(`Manzil: ${correctAddr}`);
  if (branchPhone) lines.push(`Filial tel raqami: ${branchPhone}`);
  if (note) { lines.push(''); lines.push(`Izoh: ${note}`); }
  return lines.join('\n');
}

async function copy(text: string, msg = 'Nusxalandi') {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(msg);
  } catch {
    // Fallback: textarea
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); toast.success(msg); } catch { toast.error('Nusxalash xatosi'); }
    document.body.removeChild(ta);
  }
}

const ALL_TYPES = ['EMU', 'BTS', 'DOSTAVKA', 'IPOST-FILIAL', 'MIJOZ-UYIDAN', 'MIJOZ-UYIGA', 'OTHER'] as const;
type TabKey = (typeof ALL_TYPES)[number] | 'ALL';
const TYPE_LABEL: Record<(typeof ALL_TYPES)[number], string> = {
  'EMU': 'EMU',
  'BTS': 'BTS',
  'DOSTAVKA': 'Dostavka',
  'IPOST-FILIAL': 'iPOST Filial',
  'MIJOZ-UYIDAN': 'Mijoz uyidan',
  'MIJOZ-UYIGA': 'Mijoz uyiga',
  'OTHER': 'Boshqa',
};

export default function MisrouteDaily() {
  const { tickets, branches, currentUser, settings } = useApp();
  const [date, setDate] = useState<string>(toYmd(new Date()));
  const [tab, setTab] = useState<TabKey>('ALL');
  const [tgBusy, setTgBusy] = useState(false);

  const tg = settings.telegram;
  const operatorPhone = currentUser?.phone || '';

  const dayAll = useMemo(() => {
    const { start, end } = dayBounds(date);
    return tickets
      .filter((t) => !!t.misroute && t.createdAt >= start && t.createdAt <= end)
      .sort((a, b) => a.createdAt - b.createdAt);
  }, [tickets, date]);

  function inTab(t: Ticket, which: TabKey) {
    if (which === 'ALL') return true;
    const type = t.misroute?.trackingType || 'OTHER';
    return type === which;
  }

  const dayMisroute = useMemo(() => dayAll.filter((t) => inTab(t, tab)), [dayAll, tab]);
  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of dayAll) {
      const k = t.misroute?.trackingType || 'OTHER';
      map[k] = (map[k] ?? 0) + 1;
    }
    return map;
  }, [dayAll]);

  function branchPhoneFor(t: Ticket): string {
    const wrong = (t.misroute?.wrongAddress || '').toLowerCase();
    if (!wrong) return '';
    const match = branches.find((b) => wrong.includes(b.city?.toLowerCase() ?? '__none__'));
    return match?.phone ?? '';
  }

  const allText = useMemo(() =>
    dayMisroute.map((t) => formatTicket(t, branchPhoneFor(t), operatorPhone)).join('\n\n══════════════════\n\n'),
    [dayMisroute, branches, operatorPhone]
  );

  function exportExcel() {
    if (dayMisroute.length === 0) { toast.error('Yozuv yo\'q'); return; }
    const rows = dayMisroute.map((t) => {
      const m = t.misroute ?? {};
      return {
        'Vaqt': new Date(t.createdAt).toLocaleString('uz'),
        'Trek': t.trackingNumber,
        'Tur': m.trackingType ?? '',
        'Mijoz ismi': m.correctCustomerName || t.customerName || '',
        'Mijoz tel': m.correctCustomerPhone || t.customerPhone || '',
        'Mijoz ID': m.postalId || t.details?.customerId || '',
        'Olinadigan manzil': m.wrongAddress || '',
        'Yetkazib beriladigan manzil': m.correctAddress || '',
        'Buyurtmachi': m.orderedBy || '',
        'Izoh': m.notes || '',
      };
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Misroute');
    XLSX.writeFile(wb, `misroute-${date}.xlsx`);
    toast.success(`${rows.length} ta yozuv Excel'ga yuklandi`);
  }

  async function sendTelegram() {
    if (!allText) { toast.error('Yuborish uchun yozuv yo\'q'); return; }
    if (!tg?.enabled || !tg.botToken) {
      toast.error('Avval Sozlamalardan Telegram botni yoqing');
      return;
    }
    // Yo'nalishga qarab kerakli chat ID ni tanlash
    let chatId = tg.defaultChatId;
    if (tab === 'EMU' && tg.emuChatId) chatId = tg.emuChatId;
    else if (tab === 'BTS' && tg.btsChatId) chatId = tg.btsChatId;
    if (!chatId) { toast.error('Chat ID Sozlamalarda kiritilmagan'); return; }

    setTgBusy(true);
    const header = `📦 ${date} — ${tab === 'ALL' ? 'Hammasi' : TYPE_LABEL[tab]} (${dayMisroute.length} ta)\n\n`;
    const r = await sendTelegramMessage(tg.botToken, chatId, header + allText);
    setTgBusy(false);
    if (r.ok) toast.success(`${dayMisroute.length} ta yuborildi`);
    else toast.error(r.error || 'Xato');
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <PageHeader
        title="Kunlik yuk adashishlari"
        subtitle="Bir kun ichida tushgan yuk adashishi murojaatlarini bir joyda yig'ib, kerakli formatda yuborasiz"
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              max={toYmd(new Date())}
              className="input text-sm"
            />
            <button onClick={() => copy(allText, `${dayMisroute.length} ta murojaat nusxalandi`)} disabled={dayMisroute.length === 0} className="btn-primary text-sm disabled:opacity-50">
              <ClipboardCopy className="h-4 w-4" /> Hammasini nusxalash
            </button>
            <button onClick={exportExcel} disabled={dayMisroute.length === 0} className="btn-ghost text-sm disabled:opacity-50">
              <FileSpreadsheet className="h-4 w-4" /> Excel
            </button>
            <button onClick={sendTelegram} disabled={dayMisroute.length === 0 || tgBusy} className="btn-ghost text-sm disabled:opacity-50">
              <Send className="h-4 w-4" /> {tgBusy ? 'Yuborilmoqda...' : 'Telegram'}
            </button>
          </div>
        }
      />

      <div className="card p-4 mb-4 flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-amber-100 dark:bg-amber-900/20 text-amber-600 flex items-center justify-center">
          <Truck className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <div className="text-sm text-slate-500">{date}</div>
          <div className="text-2xl font-bold text-slate-800 dark:text-white">{dayMisroute.length} <span className="text-base font-normal text-slate-500">ta murojaat ({tab === 'ALL' ? 'hammasi' : TYPE_LABEL[tab]})</span></div>
        </div>
      </div>

      {/* Yo'nalish bo'yicha filter — har biri uchun alohida nusxalash/Excel */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => setTab('ALL')}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition border ${
            tab === 'ALL' ? 'bg-brand-600 text-white border-brand-600' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
          }`}
        >
          Hammasi <span className="opacity-70">({dayAll.length})</span>
        </button>
        {ALL_TYPES.map((k) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition border ${
              tab === k ? 'bg-brand-600 text-white border-brand-600' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
            }`}
          >
            {TYPE_LABEL[k]} <span className="opacity-70">({counts[k] ?? 0})</span>
          </button>
        ))}
      </div>

      {dayMisroute.length === 0 ? (
        <div className="card p-10 text-center text-slate-500">
          <AlertTriangle className="h-10 w-10 mx-auto mb-3 opacity-40" />
          Bu kunda yuk adashishi murojaatlari yo'q.
        </div>
      ) : (
        <div className="space-y-3">
          {dayMisroute.map((t) => {
            const text = formatTicket(t, branchPhoneFor(t), operatorPhone);
            return (
              <div key={t.id} className="card p-4">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="font-mono font-semibold text-brand-600 dark:text-brand-400">{t.trackingNumber}</div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span>{new Date(t.createdAt).toLocaleTimeString('uz', { hour: '2-digit', minute: '2-digit' })}</span>
                    <button onClick={() => copy(text)} className="inline-flex items-center gap-1 text-brand-600 hover:underline">
                      <ClipboardCopy className="h-3.5 w-3.5" /> Nusxalash
                    </button>
                  </div>
                </div>
                <pre className="bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-xl p-3 text-xs font-mono whitespace-pre-wrap text-slate-700 dark:text-slate-200">
{text}
                </pre>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
