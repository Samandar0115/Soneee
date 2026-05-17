import type { Region } from '../types';

export const REGIONS: { key: Region; name: string; icon: string }[] = [
  { key: 'tashkent-city', name: 'Toshkent shahri', icon: '🏛️' },
  { key: 'tashkent-region', name: 'Toshkent viloyati', icon: '🌆' },
  { key: 'andijan', name: 'Andijon', icon: '🌳' },
  { key: 'bukhara', name: 'Buxoro', icon: '🕌' },
  { key: 'fergana', name: 'Farg‘ona', icon: '🍑' },
  { key: 'jizzakh', name: 'Jizzax', icon: '⛰️' },
  { key: 'khorezm', name: 'Xorazm', icon: '🏺' },
  { key: 'namangan', name: 'Namangan', icon: '🍇' },
  { key: 'navoi', name: 'Navoiy', icon: '🏜️' },
  { key: 'kashkadarya', name: 'Qashqadaryo', icon: '🌾' },
  { key: 'karakalpakstan', name: 'Qoraqalpog‘iston', icon: '🐪' },
  { key: 'samarkand', name: 'Samarqand', icon: '🕍' },
  { key: 'syrdarya', name: 'Sirdaryo', icon: '🌊' },
  { key: 'surkhandarya', name: 'Surxondaryo', icon: '🌄' },
];

export function regionName(key: Region): string {
  return REGIONS.find((r) => r.key === key)?.name ?? key;
}

export function regionIcon(key: Region): string {
  return REGIONS.find((r) => r.key === key)?.icon ?? '📍';
}
