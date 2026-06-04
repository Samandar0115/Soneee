import { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { ClipboardCopy, FileSpreadsheet, Send, Inbox, Truck } from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from '../components/PageHeader';
import { useApp } from '../context/AppContext';
import { sendTelegramMessage } from '../utils/telegram';
import AsyncButton from '../components/AsyncButton';
import type { Ticket } from '../types';

const COMPANY_NAME = 'ABUSAXIYTEZ';

function pad(n: number) { return n < 10 ? '0' + n : String(n); }
function toYmd(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }

function dayBounds(ymd: string) {
  const [y, m, d] = ymd.split('-').map(Number);
  const start = new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
  const end = new Date(y, m - 1, d, 23, 59, 59, 999).getTime();
  return { start, end };
}

// Murojaatning "yo'nalishi" — qaysi bo'limga jo'natiladi
function directionOf(t: Ticket, categoryName?: string): string {
  if (t.misroute?.trackingType) return t.misroute.trackingType;
  if (categoryName) return categoryName.toUpperCase();
  return 'OTHER';
}

// Shabolnda joriy operator telefoni o'rniga (operator nomidan emas)
// "kim nomidan" tanlangan shaxs telefonini ko'rsatamiz (bo'lmasa operator)
function callerLine(m: NonNullable<Ticket['misroute']>, operatorPhone: string): string {
  return m.orderedByPhone || operatorPhone || '—';
}

// EMU shabolni (EMU warehouse → BTS filial)
function formatEMU(t: Ticket, branchPhone: string, operatorPhone: string): string {
  const m = t.misroute ?? {};
  const orderedBy = m.orderedBy || '—';
  const fromWarehouse = m.wrongAddress || '—';
  const trekList = m.trekList?.trim() || t.trackingNumber;
  const customerPhone = m.correctCustomerPhone || t.customerPhone || '—';
  const customerName = m.correctCustomerName || t.customerName || '—';
  const customerId = m.customerIdList?.trim() || m.postalId || '—';
  const btsAddress = m.correctAddress || '—';
  const btsPhone = m.destinationPhone || '—';
  const note = m.notes || t.details?.topicNote || '';

  const lines = [
    `Заказчик: ${COMPANY_NAME}`,
    `${orderedBy} nomidan zayavka qilish kerak`,
    callerLine(m, operatorPhone),
    '',
    'Товар олинадиган манзил:',
    `EMU: ${fromWarehouse}`,
    '',
    'Trek raqam:',
    trekList,
    '',
    'Олувчининг маълумотлари',
    `Mijoz tel raqami: ${customerPhone}`,
    `Mijoz ism familiyasi: ${customerName}`,
    `Mijoz ID: ${customerId}`,
    '',
    '"EMU" orqali "BTS" FILIALI ga',
    `BTS: ${btsAddress}`,
    '',
    `BTS tel: ${btsPhone}`,
    '',
    'ДО ОФИС',
  ];
  if (note) { lines.push(''); lines.push(`📝 ${note}`); }
  return lines.join('\n');
}

// BTS shabolni (BTS filial → mijoz uyiga)
function formatBTS(t: Ticket, branchPhone: string, operatorPhone: string): string {
  const m = t.misroute ?? {};
  const orderedBy = m.orderedBy || '—';
  const fromWarehouse = m.wrongAddress || '—';
  const trekList = m.trekList?.trim() || t.trackingNumber;
  const btsCode = m.destinationCode || m.postalId || '—';
  const btsPhone = m.destinationPhone || branchPhone || '—';
  const customerPhone = m.correctCustomerPhone || t.customerPhone || '—';
  const customerName = m.correctCustomerName || t.customerName || '—';
  const customerId = m.customerIdList?.trim() || m.postalId || '—';
  const customerAddress = m.correctAddress || '—';
  const note = m.notes || t.details?.topicNote || '';

  const lines = [
    `заказчик:`,
    `${orderedBy} nomidan zayavka qilish kerak`,
    callerLine(m, operatorPhone),
    '',
    `Товар олинадиган манзил: Bts filiali: ${fromWarehouse}`,
    '',
    'Trek raqam:',
    trekList,
    '',
    `Bts kod: ${btsCode}`,
    '',
    `Bts tel raqami: ${btsPhone}`,
    '',
    'Олувчининг маълумотлари',
    '',
    `Mijoz tel raqami: ${customerPhone}`,
    '',
    `Mijoz ism familiyasi: ${customerName}`,
    '',
    `Mijoz ID: ${customerId}`,
    '',
    `Mijoz manzili: Uygacha: ${customerAddress}`,
    '',
    `Bts filaldan Uygacha Bts orqali`,
  ];
  if (note) { lines.push(''); lines.push(`📝 ${note}`); }
  return lines.join('\n');
}

// Standart misroute shabloni (Boshqa — IPOST FILIAL ga yetkazish)
function formatGenericMisroute(t: Ticket, direction: string, branchPhone: string, operatorPhone: string): string {
  const m = t.misroute ?? {};
  const fromWarehouse = m.wrongAddress || '—';
  const fromPhone = branchPhone || '—';
  const trekList = m.trekList?.trim() || t.trackingNumber;
  const customerName = m.correctCustomerName || t.customerName || '—';
  const customerPhone = m.correctCustomerPhone || t.customerPhone || '—';
  const customerId = m.customerIdList?.trim() || m.postalId || '—';
  const toAddress = m.correctAddress || '—';
  const toPhone = m.destinationPhone || branchPhone || '—';
  const orderedBy = m.orderedBy || '—';
  const note = m.notes || t.details?.topicNote || '';

  const lines = [
    `Заказчик: ${COMPANY_NAME}`,
    `${orderedBy} nomidan zayavka qilish kerak`,
    callerLine(m, operatorPhone),
    '',
    `Товар олинадиган манзил: "${fromWarehouse}"`,
    `Filial tel raqami: ${fromPhone}`,
    '',
    `Trek raqam: ${trekList}`,
    '',
    'Олувчининг маълумотлари',
    '',
    `Mijoz tel raqami: ${customerPhone}`,
    '',
    `Mijoz ism familiyasi: ${customerName}`,
    '',
    `Mijoz ID: ${customerId}`,
    '',
    `"${fromWarehouse}dan" "IPOST FILIAL" ga yetkazish ${direction} orqali`,
    `Manzil: ${toAddress}`,
    `Filial tel raqami: ${toPhone}`,
  ];
  if (note) { lines.push(''); lines.push(`📝 Izoh: ${note}`); }
  return lines.join('\n');
}

// Mas'ul kompaniyaga qarab to'g'ri shablonni tanlash
function formatMisrouteTicket(t: Ticket, direction: string, branchPhone: string, operatorPhone: string): string {
  const company = t.misroute?.responsibleCompany;
  if (company === 'EMU') return formatEMU(t, branchPhone, operatorPhone);
  if (company === 'BTS') return formatBTS(t, branchPhone, operatorPhone);
  return formatGenericMisroute(t, direction, branchPhone, operatorPhone);
}

// Oddiy murojaat — qisqa format: trek + nima bolgani + qachon
function formatSimpleTicket(t: Ticket, direction: string): string {
  const time = new Date(t.createdAt).toLocaleString('uz', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  const customer = t.customerName ? `${t.customerName} (${t.customerPhone})` : t.customerPhone;
  const note = t.details?.topicNote || t.details?.note || '';
  const orderedBy = t.details?.orderedBy as string | undefined;
  const lines: string[] = [];
  lines.push(`🔹 Trek: ${t.trackingNumber}`);
  lines.push(`   Vaqt: ${time}`);
  lines.push(`   Mavzu: ${direction}`);
  if (customer) lines.push(`   Mijoz: ${customer}`);
  if (orderedBy) lines.push(`   Nomidan: ${orderedBy}`);
  if (note) lines.push(`   Izoh: ${note}`);
  return lines.join('\n');
}

// Yagona format tanlash — misroute bo'lsa to'liq, aks holda qisqa
function formatTicket(t: Ticket, direction: string, branchPhone: string, operatorPhone: string): string {
  if (t.misroute) return formatMisrouteTicket(t, direction, branchPhone, operatorPhone);
  return formatSimpleTicket(t, direction);
}

async function copy(text: string, msg = 'Nusxalandi') {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(msg);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); toast.success(msg); } catch { toast.error('Nusxalash xatosi'); }
    document.body.removeChild(ta);
  }
}

export default function DailyTickets() {
  const { tickets, branches, categories, currentUser, settings, complaints } = useApp();
  const [date, setDate] = useState<string>(toYmd(new Date()));
  const [tab, setTab] = useState<string>('ALL');

  const tg = settings.telegram;
  const operatorPhone = currentUser?.phone || '';

  // Kun ichidagi BARCHA murojaatlar
  const dayAll = useMemo(() => {
    const { start, end } = dayBounds(date);
    return tickets
      .filter((t) => t.createdAt >= start && t.createdAt <= end)
      .sort((a, b) => a.createdAt - b.createdAt);
  }, [tickets, date]);

  // Kun ichidagi BARCHA shikoyatlar (guruh sendiga qo'shiladi)
  const dayComplaints = useMemo(() => {
    const { start, end } = dayBounds(date);
    return (complaints ?? [])
      .filter((c) => c.createdAt >= start && c.createdAt <= end)
      .sort((a, b) => a.createdAt - b.createdAt);
  }, [complaints, date]);

  function formatComplaint(c: typeof dayComplaints[number]): string {
    const time = new Date(c.createdAt).toLocaleString('uz', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    const lines = [
      `⚠️ SHIKOYAT — ${c.direction}`,
      `   Vaqt: ${time}`,
      `   Yuborgan: ${c.createdByName ?? '—'}`,
    ];
    if (c.trek) lines.push(`   Trek: ${c.trek}`);
    lines.push(`   Izoh: ${c.note}`);
    if (c.status === 'done') lines.push(`   ✅ Hal qilindi`);
    return lines.join('\n');
  }

  // Har birining yo'nalishi
  const direction = (t: Ticket) => {
    const cat = categories.find((c) => c.id === t.categoryId);
    return directionOf(t, cat?.name);
  };

  // Mavjud yo'nalishlar (dinamik tab'lar uchun)
  const directions = useMemo(() => {
    const set = new Map<string, number>();
    for (const t of dayAll) {
      const d = direction(t);
      set.set(d, (set.get(d) ?? 0) + 1);
    }
    return Array.from(set.entries()).sort((a, b) => b[1] - a[1]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayAll, categories]);

  const dayFiltered = useMemo(() =>
    tab === 'ALL' ? dayAll : dayAll.filter((t) => direction(t) === tab),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dayAll, tab, categories]
  );

  function branchPhoneFor(t: Ticket): string {
    const wrong = (t.misroute?.wrongAddress || '').toLowerCase();
    if (!wrong) return '';
    const match = branches.find((b) => wrong.includes(b.city?.toLowerCase() ?? '__none__'));
    return match?.phone ?? '';
  }

  const allText = useMemo(() =>
    dayFiltered.map((t) => formatTicket(t, direction(t), branchPhoneFor(t), operatorPhone)).join('\n\n══════════════════\n\n'),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dayFiltered, branches, operatorPhone, categories]
  );

  function exportExcel() {
    if (dayFiltered.length === 0) { toast.error('Yozuv yo\'q'); return; }
    const rows = dayFiltered.map((t) => {
      const m = t.misroute ?? {};
      return {
        'Vaqt': new Date(t.createdAt).toLocaleString('uz'),
        "Yo'nalish": direction(t),
        'Trek': t.trackingNumber,
        'Mijoz ismi': m.correctCustomerName || t.customerName || '',
        'Mijoz tel': m.correctCustomerPhone || t.customerPhone || '',
        'Mijoz ID': m.postalId || t.details?.customerId || '',
        'Olinadigan manzil': m.wrongAddress || '',
        'Yetkazib beriladigan manzil': m.correctAddress || '',
        'Buyurtmachi': m.orderedBy || '',
        'Izoh': m.notes || t.details?.topicNote || '',
      };
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Kunlik murojaatlar');
    XLSX.writeFile(wb, `murojaatlar-${date}-${tab === 'ALL' ? 'hammasi' : tab}.xlsx`);
    toast.success(`${rows.length} ta yozuv Excel'ga yuklandi`);
  }

  // Kunlik xulosa — TIZIMDAGI BARCHA murojaat turlari sanaladi
  // (bo'lmaganlari ham 0 ta deb ko'rinadi, hech narsa unutilmaydi)
  function summaryHeader(items: Ticket[]): string {
    const byDir = new Map<string, number>();
    // Avval barcha mavjud kategoriyalarni 0 bilan to'ldiramiz
    for (const c of categories) {
      if (c.active) byDir.set(c.name.toUpperCase(), 0);
    }
    // Asosiy yo'nalishlar ham (mavjud kategoriyalardan tashqari)
    const knownTypes = ['BTS', 'EMU', 'SKLAD', 'DOSTAVKA', 'IPOST-FILIAL', 'MIJOZ-UYIDAN', 'MIJOZ-UYIGA'];
    for (const tt of knownTypes) if (!byDir.has(tt)) byDir.set(tt, 0);
    // Endi bugungilarni sanaymiz
    for (const t of items) {
      const d = direction(t);
      byDir.set(d, (byDir.get(d) ?? 0) + 1);
    }
    const lines = [`📋 ${date} — Kunlik murojaatlar (${items.length} ta)`, ''];
    // Bor bo'lganlarni avval, qolganlarini keyin (lekin hammasini ko'rsatamiz)
    const sorted = [...byDir].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    for (const [d, c] of sorted) {
      lines.push(`• ${d}: ${c} ta`);
    }
    // Shikoyatlar — yo'nalish bo'yicha sanasi
    if (dayComplaints.length > 0) {
      lines.push('');
      lines.push(`⚠️ Shikoyatlar (${dayComplaints.length} ta):`);
      const byDirC = new Map<string, number>();
      for (const c of dayComplaints) byDirC.set(c.direction, (byDirC.get(c.direction) ?? 0) + 1);
      for (const [d, c] of byDirC) lines.push(`• ${d}: ${c} ta`);
    }
    return lines.join('\n');
  }

  // Bitta murojaat uchun chat ID — misroute bo'lsa responsibleCompany,
  // aks holda direction, oxirida default
  function chatFor(t: Ticket): string {
    if (!tg) return '';
    const company = t.misroute?.responsibleCompany;
    if (company === 'EMU' && tg.emuChatId) return tg.emuChatId;
    if (company === 'BTS' && tg.btsChatId) return tg.btsChatId;
    const d = direction(t);
    if (d === 'EMU' && tg.emuChatId) return tg.emuChatId;
    if (d === 'BTS' && tg.btsChatId) return tg.btsChatId;
    return tg.defaultChatId;
  }

  // Har murojaatni alohida xabar qilib yuborish — boshida xulosa
  async function sendTelegram() {
    if (dayFiltered.length === 0 && dayComplaints.length === 0) throw new Error('Yuborish uchun yozuv yo\'q');
    if (!tg?.enabled || !tg.botToken) throw new Error('Avval Sozlamalardan Telegram botni yoqing');
    if (!tg.defaultChatId) throw new Error('Standart chat ID Sozlamalarda kiritilmagan');

    // 1) Xulosa (default chatga) — murojaatlar + shikoyatlar bir joyda
    const hdr = await sendTelegramMessage(tg.botToken, tg.defaultChatId, summaryHeader(dayFiltered));
    if (!hdr.ok) throw new Error(hdr.error || 'Telegram xatosi');

    // 2) Har murojaatni alohida — mas'ul kompaniyasiga qarab to'g'ri chatga
    let sent = 0, failed = 0;
    for (const t of dayFiltered) {
      const chat = chatFor(t);
      if (!chat) { failed++; continue; }
      const text = formatTicket(t, direction(t), branchPhoneFor(t), operatorPhone);
      const r = await sendTelegramMessage(tg.botToken, chat, text);
      if (r.ok) sent++; else failed++;
    }

    // 3) Shikoyatlarni ham guruhga qo'shib jonatish (default chatga)
    for (const c of dayComplaints) {
      const r = await sendTelegramMessage(tg.botToken, tg.defaultChatId, formatComplaint(c));
      if (r.ok) sent++; else failed++;
    }

    if (failed === 0) toast.success(`${sent} ta yozuv yuborildi (murojaat + shikoyat)`);
    else throw new Error(`${sent} muvaffaqiyatli, ${failed} ta xato`);
  }

  // Kun yakuni — har yo'nalish uchun BITTA jamlangan xabar (hammasi ichida)
  async function sendGroupedSummary() {
    if (!tg?.enabled || !tg.botToken) throw new Error('Avval Sozlamalardan Telegram botni yoqing');
    if (!tg.defaultChatId) throw new Error('Standart chat ID kiritilmagan');
    if (dayAll.length === 0 && dayComplaints.length === 0) throw new Error('Yuborish uchun yozuv yo\'q');

    let sent = 0, failed = 0;
    // Har yo'nalish uchun bitta jamlangan xabar
    for (const [dir] of directions) {
      const items = dayAll.filter((t) => direction(t) === dir);
      if (items.length === 0) continue;
      let chat = tg.defaultChatId;
      if (dir === 'EMU' && tg.emuChatId) chat = tg.emuChatId;
      else if (dir === 'BTS' && tg.btsChatId) chat = tg.btsChatId;

      const blocks: string[] = [];
      blocks.push(`📋 ${date} — ${dir} (${items.length} ta murojaat)`);
      blocks.push('━━━━━━━━━━━━━━━━━━━');
      for (const t of items) {
        blocks.push(formatTicket(t, dir, branchPhoneFor(t), operatorPhone));
      }
      const r = await sendTelegramMessage(tg.botToken, chat, blocks.join('\n\n══════════════════\n\n'));
      if (r.ok) sent++; else failed++;
    }

    // Shikoyatlar — yo'nalish bo'yicha guruhlab BITTA xabar
    if (dayComplaints.length > 0) {
      const byDir = new Map<string, typeof dayComplaints>();
      for (const c of dayComplaints) {
        const arr = byDir.get(c.direction) ?? [];
        arr.push(c);
        byDir.set(c.direction, arr);
      }
      for (const [dir, items] of byDir) {
        const blocks: string[] = [];
        blocks.push(`⚠️ ${date} — Shikoyatlar: ${dir} (${items.length} ta)`);
        blocks.push('━━━━━━━━━━━━━━━━━━━');
        for (const c of items) blocks.push(formatComplaint(c));
        const r = await sendTelegramMessage(tg.botToken, tg.defaultChatId, blocks.join('\n\n──────────────────\n\n'));
        if (r.ok) sent++; else failed++;
      }
    }

    if (failed === 0) toast.success(`${sent} ta jamlangan xabar yuborildi (yo'nalish bo'yicha)`);
    else throw new Error(`${sent} muvaffaqiyatli, ${failed} ta xato`);
  }

  // Hamma yo'nalishlarni alohida chatlarga — har murojaat o'zicha xabar
  async function sendAllByDirection() {
    if (!tg?.enabled || !tg.botToken) throw new Error('Avval Sozlamalardan Telegram botni yoqing');
    if (!tg.defaultChatId) throw new Error('Standart chat ID kiritilmagan');
    if (directions.length === 0) throw new Error('Yuborish uchun yozuv yo\'q');

    let sentTotal = 0, failedTotal = 0;
    for (const [dir] of directions) {
      const items = dayAll.filter((t) => direction(t) === dir);
      let chat = tg.defaultChatId;
      if (dir === 'EMU' && tg.emuChatId) chat = tg.emuChatId;
      else if (dir === 'BTS' && tg.btsChatId) chat = tg.btsChatId;

      // Yo'nalish boshida xulosa
      const hdr = `📋 ${date} — ${dir} (${items.length} ta murojaat)`;
      const r0 = await sendTelegramMessage(tg.botToken, chat, hdr);
      if (!r0.ok) { failedTotal++; continue; }
      // Har birini alohida
      for (const t of items) {
        const text = formatTicket(t, dir, branchPhoneFor(t), operatorPhone);
        const r = await sendTelegramMessage(tg.botToken, chat, text);
        if (r.ok) sentTotal++; else failedTotal++;
      }
    }
    // Shikoyatlarni ham qo'shib jonatish — default chatga
    if (dayComplaints.length > 0) {
      const hdrC = `⚠️ ${date} — Shikoyatlar (${dayComplaints.length} ta)`;
      const rh = await sendTelegramMessage(tg.botToken, tg.defaultChatId, hdrC);
      if (!rh.ok) failedTotal++;
      for (const c of dayComplaints) {
        const r = await sendTelegramMessage(tg.botToken, tg.defaultChatId, formatComplaint(c));
        if (r.ok) sentTotal++; else failedTotal++;
      }
    }

    if (failedTotal === 0) toast.success(`${sentTotal} ta yozuv yo'nalish bo'yicha yuborildi`);
    else throw new Error(`${sentTotal} muvaffaqiyatli, ${failedTotal} ta xato`);
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <PageHeader
        title="Kunlik murojaatlar"
        subtitle="Bir kun ichidagi barcha murojaatlarni yo'nalish bo'yicha guruhlab, kerakli bo'limga jo'natasiz"
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              max={toYmd(new Date())}
              className="input text-sm"
            />
            <AsyncButton
              onClick={() => copy(allText, `${dayFiltered.length} ta murojaat nusxalandi`)}
              disabled={dayFiltered.length === 0}
              className="btn-primary text-sm disabled:opacity-50"
              loadingText="..."
            >
              <ClipboardCopy className="h-4 w-4" /> Nusxalash
            </AsyncButton>
            <AsyncButton
              onClick={exportExcel}
              disabled={dayFiltered.length === 0}
              className="btn-ghost text-sm disabled:opacity-50"
              loadingText="..."
            >
              <FileSpreadsheet className="h-4 w-4" /> Excel
            </AsyncButton>
            <AsyncButton
              onClick={sendTelegram}
              disabled={dayFiltered.length === 0 && dayComplaints.length === 0}
              className="btn-ghost text-sm disabled:opacity-50"
              loadingText="Yuborilmoqda..."
            >
              <Send className="h-4 w-4" /> Telegram {dayComplaints.length > 0 ? `(+${dayComplaints.length} shikoyat)` : ''}
            </AsyncButton>
          </div>
        }
      />

      <div className="card p-4 mb-4 flex items-center gap-3 flex-wrap">
        <div className="h-10 w-10 rounded-xl bg-brand-500/10 text-brand-600 flex items-center justify-center">
          <Inbox className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm text-slate-500">{date}</div>
          <div className="text-2xl font-bold text-slate-800 dark:text-white">
            {dayFiltered.length} <span className="text-base font-normal text-slate-500">ta murojaat ({tab === 'ALL' ? 'hammasi' : tab})</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {(dayAll.length > 0 || dayComplaints.length > 0) && (
            <AsyncButton
              onClick={sendGroupedSummary}
              className="btn-primary text-sm"
              loadingText="Yuborilmoqda..."
              title="Har yo'nalish uchun bitta jamlangan xabar"
            >
              <Send className="h-4 w-4" /> Kun yakuni — bitta xabar/yo'nalish
            </AsyncButton>
          )}
          {directions.length > 1 && (
            <AsyncButton
              onClick={sendAllByDirection}
              className="btn-ghost text-sm"
              loadingText="Yuborilmoqda..."
              title="Har murojaatni alohida xabar"
            >
              <Send className="h-4 w-4" /> Alohida ({directions.length} yo'nalish)
            </AsyncButton>
          )}
        </div>
      </div>

      {/* Yo'nalish bo'yicha tab'lar — dinamik */}
      {directions.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => setTab('ALL')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition border ${
              tab === 'ALL' ? 'bg-brand-600 text-white border-brand-600' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
            }`}
          >
            Hammasi <span className="opacity-70">({dayAll.length})</span>
          </button>
          {directions.map(([d, c]) => (
            <button
              key={d}
              onClick={() => setTab(d)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition border ${
                tab === d ? 'bg-brand-600 text-white border-brand-600' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              {d} <span className="opacity-70">({c})</span>
            </button>
          ))}
        </div>
      )}

      {dayFiltered.length === 0 ? (
        <div className="card p-10 text-center text-slate-500">
          <Inbox className="h-10 w-10 mx-auto mb-3 opacity-40" />
          Bu kunda murojaat yo'q.
        </div>
      ) : (
        <div className="space-y-3">
          {dayFiltered.map((t) => {
            const dir = direction(t);
            const text = formatTicket(t, dir, branchPhoneFor(t), operatorPhone);
            return (
              <div key={t.id} className="card p-4">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="font-mono font-semibold text-brand-600 dark:text-brand-400">{t.trackingNumber}</div>
                    <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">{dir}</span>
                  </div>
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
