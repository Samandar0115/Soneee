import type { Announcement, AppSettings, Branch, Category, Lesson, Track, ResponseTemplate, RoleDef, PageKey, Stage, TariffSettings, User } from '../types';

const ALL_PAGES: PageKey[] = [
  'dashboard', 'leads', 'pipeline', 'tickets', 'calls', 'cargo', 'warehouse',
  'knowledge', 'learn', 'analytics', 'users', 'stages', 'categories', 'templates',
  'curriculum', 'roles', 'settings',
];

export const seedRoles: RoleDef[] = [
  { id: 'admin', name: 'Administrator', manage: true, canEdit: true, canDelete: true, pages: ALL_PAGES, isSystem: true, createdAt: 0 },
  {
    id: 'operator', name: 'Operator', manage: false, canEdit: false, canDelete: false,
    pages: ['dashboard', 'leads', 'pipeline', 'tickets', 'calls', 'cargo', 'warehouse', 'knowledge', 'learn'],
    isSystem: true, createdAt: 0,
  },
  { id: 'learner', name: "O'quvchi", manage: false, canEdit: false, canDelete: false, pages: ['learn'], isSystem: true, createdAt: 0 },
];

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
  sip: {
    enabled: false,
    wsUrl: '',
    domain: '',
    username: '',
    password: '',
    displayName: '',
    stunUrl: 'stun:stun.l.google.com:19302',
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

/* ===================== LMS — 14 kunlik o'quv dasturi ===================== */
// Yangi operator 1-2 hafta ichida tayyor mutaxassisga aylanadi.
// Admin har bir kunga video havola qo'sha oladi (Sozlamalar yonidagi "Darslik").
const T0 = Date.parse('2026-01-01T00:00:00Z');

export const TRACK_OPERATOR_ID = 'track-operator';

export const seedTracks: Track[] = [
  {
    id: TRACK_OPERATOR_ID,
    name: 'Call Center Operator',
    description: 'Yangi operatorni 1-2 hafta ichida tayyor mutaxassisga aylantiruvchi asosiy yo\'nalish.',
    color: '#2f66ff',
    order: 0,
    active: true,
    createdAt: T0,
  },
];

function L(
  day: number,
  title: string,
  summary: string,
  content: string,
  quiz: Lesson['quiz'],
  tips: string[] = [],
  cases: Lesson['cases'] = []
): Lesson {
  return {
    id: `lesson-day-${day}`,
    trackId: TRACK_OPERATOR_ID,
    day,
    order: day,
    title,
    summary,
    content,
    videoUrl: '',
    tips,
    cases,
    quiz,
    passScorePct: 100,
    active: true,
    createdAt: T0 + day,
    updatedAt: T0 + day,
  };
}

export const seedLessons: Lesson[] = [
  L(1, 'Kompaniya bilan tanishuv', 'iPOST Cargo nima qiladi, qadriyatlar va xizmatlar.',
    'iPOST Cargo — Xitoy va O\'zbekiston o\'rtasida yuk tashish hamda ichki yetkazib berish kompaniyasi.\n\n• Asosiy xizmatlar: aviadan/quruqlikdan yuk olib kelish, filiallarga yetkazish, mijozga dostavka.\n• Qadriyatlar: ishonch, tezkorlik, mijozga hurmat.\n• Operator — kompaniyaning ovozi. Mijoz birinchi bo\'lib siz bilan gaplashadi.',
    [
      { id: 'q1d1', type: 'single', question: 'iPOST Cargo asosan qaysi yo\'nalishda ishlaydi?', options: [
        { id: 'a', text: 'Xitoy ↔ O\'zbekiston yuk tashish' },
        { id: 'b', text: 'Faqat ichki taksi xizmati' },
        { id: 'c', text: 'Bank xizmatlari' },
      ], correctOptionId: 'a' },
      { id: 'q2d1', type: 'single', question: 'Operatorning kompaniyadagi roli nima?', options: [
        { id: 'a', text: 'Faqat hujjat to\'ldirish' },
        { id: 'b', text: 'Kompaniyaning ovozi — mijoz bilan birinchi aloqa' },
        { id: 'c', text: 'Omborda yuk ko\'tarish' },
      ], correctOptionId: 'b' },
    ]),
  L(2, 'Mijoz bilan muloqot odobi', 'Salomlashish, ohang, hurmat va tinglash.',
    'Har bir qo\'ng\'iroq quyidagicha boshlanadi: "Assalomu alaykum, iPOST Cargo. Sizga qanday yordam bera olaman?"\n\n• Doim xushmuomala va sokin ohangda gapiring.\n• Mijozni bo\'lmang — avval to\'liq tinglang.\n• Ismini bilib oling va ism bilan murojaat qiling.\n• Hech qachon baqirmang yoki asabiylashmang.',
    [
      { id: 'q1d2', type: 'single', question: 'Qo\'ng\'iroqni qanday boshlash to\'g\'ri?', options: [
        { id: 'a', text: '"Ha, eshitaman"' },
        { id: 'b', text: '"Assalomu alaykum, iPOST Cargo. Sizga qanday yordam bera olaman?"' },
        { id: 'c', text: 'Jim turish' },
      ], correctOptionId: 'b' },
      { id: 'q2d2', type: 'situational', question: 'Mijoz asabiy gapirmoqda. Eng to\'g\'ri xatti-harakat?', options: [
        { id: 'a', text: 'Javoban baqirish' },
        { id: 'b', text: 'Sokin ohangda tinglash va yechim taklif qilish' },
        { id: 'c', text: 'Telefonni qo\'yish' },
      ], correctOptionId: 'b' },
    ],
    [
      'Mijoz ismini eshitganda yozib oling va suhbat davomida ism bilan murojaat qiling.',
      'Pauza qiling — mijoz gapini tugatmaguncha javob bermang.',
      'Tabassum bilan gapiring, ovozdan ham bilinadi.',
    ],
    [
      { id: 'case-d2-1', situation: 'Mijoz: "Necha kundan beri javob yo\'q, bu qanaqasi!"', goodResponse: 'Uzr so\'rayman, kechikish uchun. Hozir trekingizni tekshirib, aniq holatni aytaman.', badResponse: 'Men aybdor emasman, bu omborning ishi.', note: 'Aybni boshqaga ag\'darmang, mas\'uliyatni o\'z zimmangizga oling.' },
    ]),
  L(3, 'CRM tizimi bilan ishlash', 'Murojaat ochish, trek qidirish, bosqichlar.',
    'iPOST CRM — barcha murojaatlar shu yerda yuritiladi.\n\n• "Yangi murojaatlar" — kelgan raqamlar navbati.\n• Murojaat ochilganda trek raqami, mijoz ismi va telefoni kiritiladi.\n• Har bir murojaat bosqichlardan o\'tadi: Yangi → Jarayonda → Hal etildi.\n• Trek raqamini qidiruv orqali tez topish mumkin (Ctrl+K).',
    [
      { id: 'q1d3', type: 'single', question: 'Yangi kelgan raqamlar qaysi bo\'limda turadi?', options: [
        { id: 'a', text: 'Sklad navbati' },
        { id: 'b', text: 'Yangi murojaatlar' },
        { id: 'c', text: 'Analitika' },
      ], correctOptionId: 'b' },
      { id: 'q2d3', type: 'single', question: 'Tez qidiruv tugmasi qaysi?', options: [
        { id: 'a', text: 'Ctrl+K' },
        { id: 'b', text: 'Ctrl+P' },
        { id: 'c', text: 'Alt+F4' },
      ], correctOptionId: 'a' },
    ]),
  L(4, 'Trek raqami va yuk holati', 'Trekni tekshirish va mijozga holatni tushuntirish.',
    'Trek raqami — yukni kuzatish kaliti.\n\n• Mijozdan trek raqamini so\'rang.\n• CRM\'da qidirib yuk holatini ko\'ring: yo\'lda, omborda, yetkazilgan, vozvrat.\n• Holatni sodda tilda tushuntiring, taxminiy muddatni ayting.\n• Noaniq bo\'lsa — "tekshirib, qayta aloqaga chiqaman" deng va qayta qo\'ng\'iroqni belgilang.',
    [
      { id: 'q1d4', type: 'single', question: 'Yuk holatini bilish uchun mijozdan nima so\'raysiz?', options: [
        { id: 'a', text: 'Pasport raqami' },
        { id: 'b', text: 'Trek raqami' },
        { id: 'c', text: 'Bank kartasi' },
      ], correctOptionId: 'b' },
      { id: 'q2d4', type: 'situational', question: 'Yuk holati noaniq bo\'lsa nima qilasiz?', options: [
        { id: 'a', text: 'Taxminan javob berib qo\'ya qolish' },
        { id: 'b', text: 'Tekshirib qayta aloqaga chiqishni va\'da qilish' },
        { id: 'c', text: 'Mijozni boshqa raqamga yuborish' },
      ], correctOptionId: 'b' },
    ]),
  L(5, 'Tariflar va to\'lov', 'Narx hisoblash, to\'lov usullari.',
    'Tarif m³ va kg asosida hisoblanadi (CRM\'da tarif kalkulyatori bor).\n\n• To\'lov usullari: Click, Payme, naqd (filialda).\n• Mijozga aniq summa va to\'lov usulini tushuntiring.\n• Kvitansiyani saqlashni eslating.',
    [
      { id: 'q1d5', type: 'single', question: 'Qaysi to\'lov usullari mavjud?', options: [
        { id: 'a', text: 'Faqat naqd' },
        { id: 'b', text: 'Click, Payme, naqd' },
        { id: 'c', text: 'Faqat valyuta' },
      ], correctOptionId: 'b' },
    ]),
  L(6, 'E\'tirozlar bilan ishlash', 'Norozi mijoz, kechikish, shikoyat.',
    'E\'tiroz — rivojlanish imkoniyati.\n\n• Avval uzr so\'rang va muammoni tan oling.\n• Aybni mijozga ag\'darmang.\n• Aniq yechim va muddat taklif qiling.\n• Kerak bo\'lsa murojaatni yuqori bosqichga o\'tkazing.',
    [
      { id: 'q1d6', type: 'situational', question: 'Yuk kechikkani uchun mijoz norozi. Birinchi qadam?', options: [
        { id: 'a', text: 'Uzr so\'rab, muammoni tan olish' },
        { id: 'b', text: 'Aybni kuryerga ag\'darish' },
        { id: 'c', text: 'E\'tiborsiz qoldirish' },
      ], correctOptionId: 'a' },
    ],
    [
      'E\'tirozni shaxsiy qabul qilmang — mijoz vaziyatdan norozi, sizdan emas.',
      'LAST qoidasi: Listen (tingla), Apologize (uzr), Solve (yech), Thank (rahmat).',
      'Hech qachon "bu mening ishim emas" demang.',
    ],
    [
      { id: 'case-d6-1', situation: 'Mijoz pulini qaytarishni talab qilmoqda.', goodResponse: 'Sizni tushunaman. Holatni ko\'rib chiqib, qoidalarga muvofiq eng yaxshi yechimni topamiz. Bir daqiqa, ma\'lumotlarni tekshiraman.', badResponse: 'Pul qaytmaydi, qoida shunaqa.', note: 'Avval hamdardlik, keyin yechim. Quruq rad etish mijozni yo\'qotadi.' },
      { id: 'case-d6-2', situation: 'Mijoz baqirmoqda va so\'kinmoqda.', goodResponse: 'Sokin ohangda: "Sizga yordam berishni juda xohlayman. Iltimos, birga yechim topaylik."', badResponse: 'Javoban baqirish yoki telefonni qo\'yish.', note: 'Sizning sokin ohangingiz mijozni ham tinchlantiradi.' },
    ]),
  L(7, '1-hafta yakuniy testi', 'O\'tilgan 6 kunlik bilimni mustahkamlash.',
    'Birinchi haftani yakunladingiz! Quyidagi savollar o\'tilgan mavzularni qamrab oladi. 100% to\'g\'ri javob bersangiz 2-haftaga o\'tasiz.',
    [
      { id: 'q1d7', type: 'single', question: 'Operator — bu...', options: [
        { id: 'a', text: 'kompaniyaning ovozi' },
        { id: 'b', text: 'omborchi' },
        { id: 'c', text: 'haydovchi' },
      ], correctOptionId: 'a' },
      { id: 'q2d7', type: 'single', question: 'Murojaat bosqichlari to\'g\'ri ketma-ketligi?', options: [
        { id: 'a', text: 'Hal etildi → Yangi → Jarayonda' },
        { id: 'b', text: 'Yangi → Jarayonda → Hal etildi' },
        { id: 'c', text: 'Jarayonda → Yangi → Hal etildi' },
      ], correctOptionId: 'b' },
      { id: 'q3d7', type: 'situational', question: 'Asabiy mijoz bilan ohang qanday bo\'ladi?', options: [
        { id: 'a', text: 'Sokin va hurmatli' },
        { id: 'b', text: 'Qattiq va tez' },
        { id: 'c', text: 'Befarq' },
      ], correctOptionId: 'a' },
    ]),
  L(8, 'Instagram va Telegram murojaatlari', 'Ijtimoiy tarmoq murojaatlarini boshqarish.',
    'Murojaatlar telefondan tashqari Instagram va Telegram\'dan ham keladi.\n\n• Instagram\'dan kelganlarda odatda faqat raqam qoladi — "Yangi murojaatlar"ga qo\'shiladi.\n• Telegram va oddiy raqamlar ham shu navbatga tushadi.\n• Qo\'ng\'iroq qilgach: murojaat bo\'lsa "Murojaat ochish", bo\'lmasa "Info berildi".',
    [
      { id: 'q1d8', type: 'single', question: 'Instagram murojaatlarida odatda nima qoladi?', options: [
        { id: 'a', text: 'To\'liq buyurtma' },
        { id: 'b', text: 'Faqat telefon raqami' },
        { id: 'c', text: 'Bank ma\'lumotlari' },
      ], correctOptionId: 'b' },
      { id: 'q2d8', type: 'single', question: 'Qo\'ng\'iroqdan keyin murojaat bo\'lmasa nima bosiladi?', options: [
        { id: 'a', text: 'Info berildi' },
        { id: 'b', text: 'Murojaat ochish' },
        { id: 'c', text: 'O\'chirish' },
      ], correctOptionId: 'a' },
    ]),
  L(9, 'Vozvrat va sklad navbati', 'Qaytgan yuklar va skladdan chiqarish.',
    'Ba\'zi yuklar vozvrat bo\'ladi yoki skladda ushlab qolinadi.\n\n• Sklad navbatiga trek va sabab kerak.\n• 3 sabab: vozvrat bo\'lgan, to\'lovi endi qilingan, qaysidur sababga ko\'ra ushlab qolingan.\n• Ushlab qolingan bo\'lsa — sababni izoh qilib yozish shart.',
    [
      { id: 'q1d9', type: 'single', question: 'Sklad navbatiga qo\'shish uchun nima shart?', options: [
        { id: 'a', text: 'Faqat ism' },
        { id: 'b', text: 'Trek va sabab' },
        { id: 'c', text: 'Hech narsa' },
      ], correctOptionId: 'b' },
    ]),
  L(10, 'Qo\'ng\'iroqlarni yuritish', 'Qo\'ng\'iroq jurnali, davomiylik, natija.',
    'Har bir qo\'ng\'iroq qayd etiladi.\n\n• Qo\'ng\'iroq boshlanganda jurnalga yoziladi.\n• "Bog\'landi" bosilganda gaplashish vaqti hisoblanadi.\n• Natija belgilanadi: javob berildi, javob yo\'q, band.\n• Sifatli xizmat — qisqa kutish, aniq javob.',
    [
      { id: 'q1d10', type: 'single', question: 'Qo\'ng\'iroq natijasiga nima kirmaydi?', options: [
        { id: 'a', text: 'Javob berildi' },
        { id: 'b', text: 'Javob yo\'q' },
        { id: 'c', text: 'Ob-havo' },
      ], correctOptionId: 'c' },
    ]),
  L(11, 'Skriptlar va shablonlar', 'Tayyor javoblardan to\'g\'ri foydalanish.',
    'CRM\'da tayyor javob shablonlari bor (salomlashish, uzr, holat, to\'lov, xayrlashish).\n\n• Shablonni asos qiling, lekin jonli gapiring.\n• Mijoz ismini qo\'shing.\n• Robotdek emas, samimiy bo\'ling.',
    [
      { id: 'q1d11', type: 'situational', question: 'Shablondan qanday foydalanish to\'g\'ri?', options: [
        { id: 'a', text: 'So\'zma-so\'z robotdek o\'qish' },
        { id: 'b', text: 'Asos qilib, jonli va samimiy gapirish' },
        { id: 'c', text: 'Umuman ishlatmaslik' },
      ], correctOptionId: 'b' },
    ]),
  L(12, 'Maxfiylik va xavfsizlik', 'Mijoz ma\'lumotlarini himoya qilish.',
    'Mijoz ma\'lumotlari maxfiy.\n\n• Login/parolni hech kimga bermang.\n• Mijoz ma\'lumotlarini tashqariga chiqarmang.\n• Faqat ish uchun zarur ma\'lumotni so\'rang.\n• Shubhali holatni rahbarga xabar qiling.',
    [
      { id: 'q1d12', type: 'single', question: 'Login/parolni kim bilan bo\'lishish mumkin?', options: [
        { id: 'a', text: 'Hech kim bilan' },
        { id: 'b', text: 'Hamkasblar bilan' },
        { id: 'c', text: 'Mijoz bilan' },
      ], correctOptionId: 'a' },
    ]),
  L(13, 'Amaliy simulyatsiya', 'Haqiqiy ssenariylarni mashq qilish.',
    'Endi bilimni amalda sinab ko\'ramiz.\n\n• Mijoz qo\'ng\'iroq qilib trek holatini so\'raydi — to\'liq muloqotni o\'ynab ko\'ring.\n• Norozi mijoz ssenariysi.\n• Yangi murojaatdan ticket ochish.\nMashqdan keyin yakuniy imtihonga tayyor bo\'lasiz.',
    [
      { id: 'q1d13', type: 'situational', question: 'Mijoz trek holatini so\'radi. To\'g\'ri ketma-ketlik?', options: [
        { id: 'a', text: 'Salomlashish → trek so\'rash → holatni tekshirish → tushuntirish' },
        { id: 'b', text: 'Darhol telefonni qo\'yish' },
        { id: 'c', text: 'To\'lov so\'rash' },
      ], correctOptionId: 'a' },
    ]),
  L(14, 'Yakuniy imtihon', 'Barcha bilimni qamrovchi yakuniy test.',
    'Tabriklaymiz — oxirgi bosqichdasiz! Ushbu imtihonni 100% topshirsangiz, to\'liq tayyor operator bo\'lasiz.',
    [
      { id: 'q1d14', type: 'single', question: 'iPOST CRM\'da murojaatlar qayerda yuritiladi?', options: [
        { id: 'a', text: 'Daftarchada' },
        { id: 'b', text: 'CRM tizimida' },
        { id: 'c', text: 'Faqat boshda' },
      ], correctOptionId: 'b' },
      { id: 'q2d14', type: 'single', question: 'Sklad navbati uchun nima kerak?', options: [
        { id: 'a', text: 'Trek va sabab' },
        { id: 'b', text: 'Faqat ism' },
        { id: 'c', text: 'Hech narsa' },
      ], correctOptionId: 'a' },
      { id: 'q3d14', type: 'situational', question: 'Norozi mijoz bilan birinchi qadam?', options: [
        { id: 'a', text: 'Uzr so\'rab tan olish' },
        { id: 'b', text: 'Bahslashish' },
        { id: 'c', text: 'Telefonni qo\'yish' },
      ], correctOptionId: 'a' },
      { id: 'q4d14', type: 'single', question: 'Login/parol maxfiyligi qanchalik muhim?', options: [
        { id: 'a', text: 'Juda muhim — hech kimga berilmaydi' },
        { id: 'b', text: 'Muhim emas' },
        { id: 'c', text: 'Faqat dushanba kuni' },
      ], correctOptionId: 'a' },
    ]),
];
