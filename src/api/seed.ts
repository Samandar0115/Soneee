import type { Announcement, Branch, Category, Stage, TariffSettings, User } from '../types';

export const seedAnnouncements: Announcement[] = [
  {
    id: 'ann-1',
    category: 'china-uzb',
    title: 'Xitoy → O‘zbekiston yo‘nalishida yangi reys',
    content:
      'Har hafta seshanba va juma kunlari Guanchjoudan Toshkentga to‘g‘ridan-to‘g‘ri yo‘nalish ochildi. Yo‘l vaqti — o‘rtacha 18 kun. Mijozlarga tracking raqami yuborilgandan keyin 24 soat ichida holatni tekshirish mumkin.',
    pinned: true,
    active: true,
    createdBy: 'admin-1',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'ann-2',
    category: 'uzb-cargo',
    title: 'O‘zbekistondagi ichki yetkazib berish jadvali',
    content:
      'Toshkent — Samarqand: har kuni, 09:00.\nToshkent — Buxoro: dushanba, chorshanba, juma 10:00.\nToshkent — Andijon: har kuni 14:00.\nViloyatga yetkazish odatda 1–2 kun ichida amalga oshiriladi.',
    pinned: false,
    active: true,
    createdBy: 'admin-1',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'ann-3',
    category: 'payment',
    title: 'To‘lov qoidalarida o‘zgarishlar',
    content:
      'Endi to‘lovni Click, Payme, Uzcard, Humo orqali qabul qilamiz. Naqd to‘lov faqat filiallarda. Yuk yetkazilgandan so‘ng 3 kun ichida to‘lov amalga oshirilmasa, kunlik 0.5% jarima qo‘shiladi.',
    pinned: true,
    active: true,
    createdBy: 'admin-1',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: 'ann-4',
    category: 'general',
    title: 'Bayram kunlari ish rejimi',
    content:
      'Mustaqillik kuni (1-sentabr) — filiallar dam oladi. Qabul va yetkazib berish 2-sentabrdan davom etadi. Operatorlar mijozlarni oldindan ogohlantirib qo‘yishi kerak.',
    pinned: false,
    active: true,
    createdBy: 'admin-1',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
];

export const seedBranches: Branch[] = [
  {
    id: 'br-tashkent-main',
    name: 'Toshkent (Bosh ofis)',
    city: 'Toshkent',
    address: 'Toshkent sh., Chilonzor t., Bunyodkor ko‘chasi 12',
    phone: '+998 71 200 00 01',
    workingHours: 'Du-Sh: 09:00-19:00, Ya: 10:00-15:00',
    lat: 41.2995,
    lng: 69.2401,
    isNew: false,
    order: 0,
    active: true,
  },
  {
    id: 'br-samarkand',
    name: 'Samarqand filiali',
    city: 'Samarqand',
    address: 'Samarqand sh., Registon ko‘chasi 7',
    phone: '+998 66 233 00 02',
    workingHours: 'Du-Sh: 09:00-18:00',
    lat: 39.6542,
    lng: 66.9597,
    isNew: false,
    order: 1,
    active: true,
  },
  {
    id: 'br-bukhara',
    name: 'Buxoro filiali',
    city: 'Buxoro',
    address: 'Buxoro sh., Mustaqillik ko‘chasi 15',
    phone: '+998 65 224 00 03',
    workingHours: 'Du-Sh: 09:00-18:00',
    lat: 39.7747,
    lng: 64.4286,
    isNew: true,
    order: 2,
    active: true,
  },
  {
    id: 'br-andijan',
    name: 'Andijon filiali',
    city: 'Andijon',
    address: 'Andijon sh., Navoiy ko‘chasi 22',
    phone: '+998 74 223 00 04',
    workingHours: 'Du-Sh: 09:00-18:00',
    lat: 40.7821,
    lng: 72.3442,
    isNew: true,
    order: 3,
    active: true,
  },
];

export const seedTariff: TariffSettings = {
  id: 'main',
  pricePerM3: 800,
  kgPerM3: 125,
  currency: 'USD',
  notes:
    '1 m³ yuk narxi = 800 USD va u 125 kg ga to‘g‘ri keladi. Mijozdan haqiqiy og‘irlik va o‘lchamlar (uzunlik, eni, balandlik) olinadi. Hajm bo‘yicha va og‘irlik bo‘yicha narx hisoblanadi — qaysi biri katta bo‘lsa, shu summa olinadi.',
  updatedAt: Date.now(),
};

export const seedCategories: Category[] = [
  { id: 'cat-lost', name: 'Yuk yo‘qolgan', description: 'Mijoz yuki manzilga yetib bormagan', color: '#ef4444', icon: '📦', order: 0, active: true },
  { id: 'cat-misroute', name: 'Yuk adashishi', description: 'Yuk noto‘g‘ri manzilga ketgan', color: '#f97316', icon: '🔀', order: 1, active: true },
  { id: 'cat-warehouse', name: 'Skladda qolib ketgan', description: 'Yuk omborda kechikib turibdi', color: '#a855f7', icon: '🏬', order: 2, active: true },
  { id: 'cat-damaged', name: 'Shikastlangan yuk', description: 'Yetkazib berishda yuk shikastlangan', color: '#dc2626', icon: '⚠️', order: 3, active: true },
  { id: 'cat-delay', name: 'Yetkazib berish kechikishi', description: 'Belgilangan vaqtdan kech yetib bormoqda', color: '#f59e0b', icon: '⏱️', order: 4, active: true },
  { id: 'cat-payment', name: 'To‘lov muammosi', description: 'To‘lov yoki tarif bilan bog‘liq', color: '#0ea5e9', icon: '💳', order: 5, active: true },
  { id: 'cat-info', name: 'Ma’lumot olish', description: 'Mijoz oddiy ma’lumot so‘ramoqda', color: '#22c55e', icon: '💬', order: 6, active: true },
  { id: 'cat-other', name: 'Boshqa', description: 'Boshqa turdagi murojaat', color: '#64748b', icon: '📝', order: 7, active: true },
];

export const seedUsers: User[] = [
  {
    id: 'admin-1',
    username: 'admin',
    password: 'admin123',
    role: 'admin',
    fullName: 'Tizim Administratori',
    phone: '+998 90 000 00 01',
    createdAt: Date.now(),
  },
  {
    id: 'op-1',
    username: 'operator1',
    password: 'operator123',
    role: 'operator',
    fullName: 'Aziza Karimova',
    phone: '+998 90 111 11 11',
    createdAt: Date.now(),
  },
  {
    id: 'op-2',
    username: 'operator2',
    password: 'operator123',
    role: 'operator',
    fullName: 'Doniyor Yusupov',
    phone: '+998 90 222 22 22',
    createdAt: Date.now(),
  },
];

export const seedStages: Stage[] = [
  {
    id: 'stage-new',
    name: 'Yangi murojaat',
    color: '#3b82f6',
    order: 0,
    fields: [
      { key: 'topic', label: 'Murojaat mavzusi', type: 'text', required: true },
      { key: 'channel', label: 'Aloqa kanali', type: 'select', options: ['Telefon', 'Telegram', 'WhatsApp', 'Web'] },
    ],
  },
  {
    id: 'stage-process',
    name: 'Jarayonda',
    color: '#f59e0b',
    order: 1,
    fields: [
      { key: 'assignedTo', label: 'Bajaruvchi', type: 'text' },
      { key: 'note', label: 'Operator izohi', type: 'textarea' },
    ],
  },
  {
    id: 'stage-callback',
    name: 'Qayta qo’ng’iroq',
    color: '#a855f7',
    order: 2,
    fields: [
      { key: 'callbackAt', label: 'Qayta qo’ng’iroq vaqti', type: 'text' },
      { key: 'reason', label: 'Sabab', type: 'textarea' },
    ],
  },
  {
    id: 'stage-resolved',
    name: 'Hal etildi',
    color: '#16a34a',
    order: 3,
    fields: [
      { key: 'resolution', label: 'Hal qilish natijasi', type: 'textarea', required: true },
      { key: 'rating', label: 'Mijoz bahosi (1-5)', type: 'number' },
    ],
  },
];
