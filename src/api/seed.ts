import type { Announcement, AppSettings, Branch, Category, ResponseTemplate, Stage, TariffSettings, User } from '../types';

export const seedTemplates: ResponseTemplate[] = [
  { id: 'tpl-greeting', title: 'Salomlashish', body: 'Assalomu alaykum, iPOST Cargo. Sizga qanday yordam berishimiz mumkin?', category: 'salomlashish', order: 0, active: true, createdAt: Date.now() },
  { id: 'tpl-apology', title: 'Uzr so‘rash', body: 'Yetkazib berishdagi kechikish uchun uzr so‘raymiz. Yukingizning hozirgi holatini tekshirib, sizga eng qisqa muddatda batafsil ma\'lumot beramiz.', category: 'uzr', order: 1, active: true, createdAt: Date.now() },
  { id: 'tpl-tracking', title: 'Trek tekshirishni so‘rash', body: 'Yukni tekshirishimiz uchun trek raqamingizni yuboring (masalan: T-XXXX-YYYY).', category: 'so\'rov', order: 2, active: true, createdAt: Date.now() },
  { id: 'tpl-onway', title: 'Yo‘lda javob', body: 'Yukingiz hozirda yo‘lda. Taxminiy yetib kelish muddati: 2-4 ish kuni ichida. Yangiliklar haqida sizga albatta xabar beramiz.', category: 'holat', order: 3, active: true, createdAt: Date.now() },
  { id: 'tpl-warehouse', title: 'Omborda', body: 'Yukingiz omborga keldi. Filialimizdan olib ketishingiz mumkin. Manzil va ish vaqtini yuboramizmi?', category: 'holat', order: 4, active: true, createdAt: Date.now() },
  { id: 'tpl-payment', title: 'To‘lov haqida', body: 'To‘lovni Click, Payme yoki naqd ravishda filialda amalga oshira olasiz. Iltimos, ohirgi kvitansiyani saqlab qo‘ying.', category: 'to\'lov', order: 5, active: true, createdAt: Date.now() },
  { id: 'tpl-thanks', title: 'Xayrlashish', body: 'iPOST Cargoga ishonch bildirganingiz uchun rahmat. Yangi murojaatlaringizni kutib qolamiz!', category: 'xayrlash', order: 6, active: true, createdAt: Date.now() },
];

export const seedAppSettings: AppSettings = {
  id: 'main',
  autoAssign: 'least-busy',
  slaMinutes: { low: 1440, normal: 480, high: 120, urgent: 30 },
  defaultLang: 'uz',
  idleTimeoutMin: 30,
  archiveAfterDays: 365,
  faceMatchThreshold: 50,
  // MicroSIP bilan ishlash uchun default — external rejim, hech qanday server o'zgartirishi shart emas
  sip: {
    enabled: false,
    mode: 'webrtc',
    serverHost: '',
    wsUri: '',
    registerExpiresSec: 120,
  },
  updatedAt: Date.now(),
};

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
  { id: 'br-tashkent-main', name: 'Toshkent (Bosh ofis)', region: 'tashkent-city', city: 'Toshkent', address: 'Chilonzor t., Bunyodkor ko‘chasi 12', phone: '+998 71 200 00 01', workingHours: 'Du-Sh: 09:00-19:00, Ya: 10:00-15:00', lat: 41.2995, lng: 69.2401, isNew: false, order: 0, active: true },
  { id: 'br-tashkent-yunusobod', name: 'Yunusobod filiali', region: 'tashkent-city', city: 'Toshkent', address: 'Yunusobod t., Amir Temur sh. 88', phone: '+998 71 200 00 02', workingHours: 'Du-Sh: 09:00-19:00', lat: 41.3479, lng: 69.2871, isNew: true, order: 1, active: true },
  { id: 'br-chirchiq', name: 'Chirchiq filiali', region: 'tashkent-region', city: 'Chirchiq', address: 'Chirchiq sh., Toshkent ko‘chasi 5', phone: '+998 70 712 00 11', workingHours: 'Du-Sh: 09:00-18:00', lat: 41.4683, lng: 69.5816, isNew: false, order: 2, active: true },
  { id: 'br-samarkand', name: 'Samarqand filiali', region: 'samarkand', city: 'Samarqand', address: 'Samarqand sh., Registon ko‘chasi 7', phone: '+998 66 233 00 02', workingHours: 'Du-Sh: 09:00-18:00', lat: 39.6542, lng: 66.9597, isNew: false, order: 3, active: true },
  { id: 'br-bukhara', name: 'Buxoro filiali', region: 'bukhara', city: 'Buxoro', address: 'Buxoro sh., Mustaqillik ko‘chasi 15', phone: '+998 65 224 00 03', workingHours: 'Du-Sh: 09:00-18:00', lat: 39.7747, lng: 64.4286, isNew: true, order: 4, active: true },
  { id: 'br-andijan', name: 'Andijon filiali', region: 'andijan', city: 'Andijon', address: 'Andijon sh., Navoiy ko‘chasi 22', phone: '+998 74 223 00 04', workingHours: 'Du-Sh: 09:00-18:00', lat: 40.7821, lng: 72.3442, isNew: true, order: 5, active: true },
  { id: 'br-fergana', name: 'Farg‘ona filiali', region: 'fergana', city: 'Farg‘ona', address: 'Farg‘ona sh., Mustaqillik ko‘chasi 17', phone: '+998 73 244 00 05', workingHours: 'Du-Sh: 09:00-18:00', lat: 40.3864, lng: 71.7864, isNew: false, order: 6, active: true },
  { id: 'br-namangan', name: 'Namangan filiali', region: 'namangan', city: 'Namangan', address: 'Namangan sh., Galaba ko‘chasi 9', phone: '+998 69 234 00 06', workingHours: 'Du-Sh: 09:00-18:00', lat: 40.9983, lng: 71.6726, isNew: false, order: 7, active: true },
  { id: 'br-khorezm', name: 'Urganch filiali', region: 'khorezm', city: 'Urganch', address: 'Urganch sh., Al-Xorazmiy ko‘chasi 12', phone: '+998 62 224 00 07', workingHours: 'Du-Sh: 09:00-18:00', lat: 41.5503, lng: 60.6314, isNew: true, order: 8, active: true },
  { id: 'br-kashkadarya', name: 'Qarshi filiali', region: 'kashkadarya', city: 'Qarshi', address: 'Qarshi sh., Mustaqillik ko‘chasi 8', phone: '+998 75 221 00 08', workingHours: 'Du-Sh: 09:00-18:00', lat: 38.8606, lng: 65.7898, isNew: false, order: 9, active: true },
  { id: 'br-surkhandarya', name: 'Termiz filiali', region: 'surkhandarya', city: 'Termiz', address: 'Termiz sh., Amir Temur ko‘chasi 4', phone: '+998 76 223 00 09', workingHours: 'Du-Sh: 09:00-18:00', lat: 37.2242, lng: 67.2783, isNew: false, order: 10, active: true },
  { id: 'br-navoi', name: 'Navoiy filiali', region: 'navoi', city: 'Navoiy', address: 'Navoiy sh., Galaba ko‘chasi 14', phone: '+998 79 224 00 10', workingHours: 'Du-Sh: 09:00-18:00', lat: 40.0844, lng: 65.3792, isNew: false, order: 11, active: true },
  { id: 'br-jizzakh', name: 'Jizzax filiali', region: 'jizzakh', city: 'Jizzax', address: 'Jizzax sh., Sharaf Rashidov ko‘chasi 11', phone: '+998 72 226 00 12', workingHours: 'Du-Sh: 09:00-18:00', lat: 40.1158, lng: 67.842, isNew: true, order: 12, active: true },
  { id: 'br-syrdarya', name: 'Guliston filiali', region: 'syrdarya', city: 'Guliston', address: 'Guliston sh., Mustaqillik ko‘chasi 3', phone: '+998 67 232 00 13', workingHours: 'Du-Sh: 09:00-18:00', lat: 40.4895, lng: 68.7842, isNew: true, order: 13, active: true },
  { id: 'br-karakalpakstan', name: 'Nukus filiali', region: 'karakalpakstan', city: 'Nukus', address: 'Nukus sh., Berdaq ko‘chasi 20', phone: '+998 61 222 00 14', workingHours: 'Du-Sh: 09:00-18:00', lat: 42.4531, lng: 59.6103, isNew: true, order: 14, active: true },
];

export const seedTariff: TariffSettings = {
  id: 'main',
  pricePerM3: 750,
  kgPerM3: 125,
  currency: 'USD',
  notes:
    '1 m³ yuk narxi = 750 USD va u 125 kg ga to‘g‘ri keladi (1 kg = 6 USD). Mijozdan haqiqiy og‘irlik va o‘lchamlar (uzunlik, eni, balandlik) olinadi. Hajm bo‘yicha va og‘irlik bo‘yicha narx hisoblanadi — qaysi biri katta bo‘lsa, shu summa olinadi.',
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
