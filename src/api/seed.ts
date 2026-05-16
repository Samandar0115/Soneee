import type { Category, Stage, User } from '../types';

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
