import * as XLSX from 'xlsx';
import type { Complaint, ComplaintDirection, Ticket, Category, User } from '../types';
import { DEFAULT_COMPLAINT_SUBTYPES } from '../types';

function pad(n: number) { return n < 10 ? '0' + n : String(n); }
export function toYmd(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function ymdToDate(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

// Joriy haftaning dushanbasi (uz hafta)
export function weekStartMonday(d: Date = new Date()): Date {
  const day = d.getDay(); // 0=yak, 1=du, ..., 6=shan
  const diff = day === 0 ? -6 : 1 - day; // dushanba ga
  const m = new Date(d.getFullYear(), d.getMonth(), d.getDate() + diff, 0, 0, 0, 0);
  return m;
}

export function dateRangeYmd(start: Date, end: Date): string[] {
  const out: string[] = [];
  const cur = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const last = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  while (cur.getTime() <= last.getTime()) {
    out.push(toYmd(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

const COMPLAINT_DIRS: ComplaintDirection[] = ['IT', 'Logistika', 'Xitoy ombor', 'UZB ombor', 'Moliya', 'Sifat nazorati', 'Boshqa'];

// === SHIKOYAT EXCEL ===
// Har yo'nalish — alohida sheet. Sanalar bilan ajratiladi (gorizontal).
export function buildComplaintsWorkbook(complaints: Complaint[], days: string[]): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();
  for (const dir of COMPLAINT_DIRS) {
    const aoa: (string | number)[][] = [];
    // Sheet sarlavhasi
    aoa.push([`Yo'nalish: ${dir}`]);
    aoa.push([]);
    for (const ymd of days) {
      const dayBounds = dayBoundsFor(ymd);
      const items = complaints
        .filter((c) => c.direction === dir && c.createdAt >= dayBounds.start && c.createdAt <= dayBounds.end)
        .sort((a, b) => a.createdAt - b.createdAt);
      aoa.push([`📅 ${ymd}  —  ${items.length} ta`]);
      aoa.push(['Vaqt', 'Operator', 'Trek', 'Ichki turi', 'Izoh', 'Status', 'Hal qildi']);
      if (items.length === 0) {
        aoa.push(['(yo\'q)', '', '', '', '', '', '']);
      } else {
        for (const c of items) {
          aoa.push([
            new Date(c.createdAt).toLocaleString('uz'),
            c.createdByName ?? '',
            c.trek ?? '',
            c.subtype ?? '',
            c.note,
            c.status === 'done' ? 'Hal qilindi' : c.status === 'cancelled' ? 'Bekor qilindi' : 'Kutmoqda',
            c.doneByName ?? '',
          ]);
        }
      }
      aoa.push([]);
    }
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = [{ wch: 20 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 60 }, { wch: 14 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, ws, sheetName(dir));
    // Default subtypes ni Settings sheet'iga qo'shamiz — ma'lumot uchun
    void DEFAULT_COMPLAINT_SUBTYPES; // reserved
  }
  return wb;
}

// === MUROJAAT EXCEL ===
// Sheet'lar — har kategoriya alohida. "Yuk adashishi" sheet'i vertikal.
export function buildTicketsWorkbook(
  tickets: Ticket[],
  categories: Category[],
  users: User[],
  days: string[],
): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();
  // Faol kategoriyalar
  const activeCats = categories
    .filter((c) => c.active)
    .sort((a, b) => a.order - b.order);

  const findUser = (id?: string) => users.find((u) => u.id === id);

  for (const cat of activeCats) {
    const isMisroute = cat.id === 'cat-misroute' || /adash|misrout/i.test(cat.name);
    const aoa: (string | number)[][] = [];
    aoa.push([`Toifa: ${cat.name}`]);
    aoa.push([]);
    for (const ymd of days) {
      const dayBounds = dayBoundsFor(ymd);
      const items = tickets
        .filter((t) => t.categoryId === cat.id && t.createdAt >= dayBounds.start && t.createdAt <= dayBounds.end)
        .sort((a, b) => a.createdAt - b.createdAt);
      aoa.push([`📅 ${ymd}  —  ${items.length} ta`]);
      if (items.length === 0) {
        aoa.push(['(yo\'q)']);
        aoa.push([]);
        continue;
      }
      if (isMisroute) {
        // VERTIKAL: har ticket alohida blokda, label/qiymat ustunlari
        for (let i = 0; i < items.length; i++) {
          const t = items[i];
          const m = t.misroute ?? {};
          const op = findUser(t.assigneeId);
          aoa.push([`#${i + 1}`, t.trackingNumber]);
          aoa.push(['Vaqt', new Date(t.createdAt).toLocaleString('uz')]);
          aoa.push(['Operator', op?.fullName ?? op?.username ?? '']);
          aoa.push(["Mijoz ismi", t.customerName ?? '']);
          aoa.push(['Mijoz tel', t.customerPhone ?? '']);
          aoa.push(['Mas\'ul kompaniya', m.responsibleCompany ?? '']);
          aoa.push(['Yo\'nalish turi', m.trackingType ?? '']);
          aoa.push(['Noto\'g\'ri manzil', m.wrongAddress ?? '']);
          aoa.push(['To\'g\'ri manzil', m.correctAddress ?? '']);
          aoa.push(['Mijoz ID list', m.customerIdList ?? '']);
          aoa.push(['Trek list', m.trekList ?? '']);
          aoa.push(['Yetkazib beriladigan tel', m.destinationPhone ?? '']);
          aoa.push(['Yetkazib beriladigan kod', m.destinationCode ?? '']);
          aoa.push(['Buyurtmachi', m.orderedBy ?? '']);
          aoa.push(['Buyurtmachi tel', m.orderedByPhone ?? '']);
          aoa.push(['Postal ID', m.postalId ?? '']);
          aoa.push(['Izoh', m.notes ?? t.details?.topicNote ?? '']);
          aoa.push(['Status', t.status === 'resolved' ? 'Hal qilindi' : 'Kutmoqda']);
          aoa.push([]);
        }
      } else {
        // GORIZONTAL: jadval
        aoa.push(['Vaqt', 'Operator', 'Trek', 'Mijoz', 'Telefon', 'Bosqich', 'Status', 'Izoh']);
        for (const t of items) {
          const op = findUser(t.assigneeId);
          aoa.push([
            new Date(t.createdAt).toLocaleString('uz'),
            op?.fullName ?? op?.username ?? '',
            t.trackingNumber,
            t.customerName ?? '',
            t.customerPhone ?? '',
            t.stageId ?? '',
            t.status === 'resolved' ? 'Hal qilindi' : 'Kutmoqda',
            t.details?.topicNote ?? t.details?.note ?? '',
          ]);
        }
      }
      aoa.push([]);
    }
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    if (isMisroute) {
      ws['!cols'] = [{ wch: 28 }, { wch: 70 }];
    } else {
      ws['!cols'] = [{ wch: 20 }, { wch: 18 }, { wch: 18 }, { wch: 22 }, { wch: 18 }, { wch: 16 }, { wch: 12 }, { wch: 60 }];
    }
    XLSX.utils.book_append_sheet(wb, ws, sheetName(cat.name));
  }
  return wb;
}

export function dayBoundsFor(ymd: string) {
  const d = ymdToDate(ymd);
  const start = d.getTime();
  const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999).getTime();
  return { start, end };
}

function sheetName(raw: string): string {
  // Excel sheet nomi: max 31 belgi, /\:?*[] yo'q
  return raw.replace(/[\\/:?*\[\]]/g, '_').slice(0, 31);
}

export function saveWorkbook(wb: XLSX.WorkBook, filename: string) {
  XLSX.writeFile(wb, filename);
}
