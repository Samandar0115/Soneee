import type { Stage, User } from '../types';

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
