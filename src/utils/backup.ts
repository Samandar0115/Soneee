// Avto-backup: har kuni localStorage'ga snapshot saqlaymiz, 7 kun saqlaymiz.
// Avariya bo'lsa Settings sahifasidan tiklash mumkin.

const BACKUP_PREFIX = 'ipost.backup.';
const MAX_BACKUPS = 7;

export interface BackupEntry {
  key: string;       // ipost.backup.2026-05-21
  date: string;      // 2026-05-21
  size: number;      // bayt
  createdAt: number;
}

function todayKey(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function saveDailyBackup(snapshot: unknown): boolean {
  try {
    const date = todayKey();
    const key = `${BACKUP_PREFIX}${date}`;
    const payload = JSON.stringify({ data: snapshot, createdAt: Date.now() });
    // Agar bugungi backup allaqachon bo'lsa va shu zayl bo'lsa — qaytamiz (xom xayol)
    const existing = localStorage.getItem(key);
    if (existing) {
      // O'sha kunni qayta yozamiz (so'nggi snapshot doim aktualroq)
    }
    localStorage.setItem(key, payload);
    pruneOldBackups();
    return true;
  } catch {
    return false;
  }
}

export function pruneOldBackups(): void {
  const entries = listBackups();
  if (entries.length <= MAX_BACKUPS) return;
  // Sana bo'yicha sortlab, eski-larini olib tashlaymiz
  const sorted = [...entries].sort((a, b) => b.createdAt - a.createdAt);
  sorted.slice(MAX_BACKUPS).forEach((e) => {
    try { localStorage.removeItem(e.key); } catch {}
  });
}

export function listBackups(): BackupEntry[] {
  const result: BackupEntry[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k || !k.startsWith(BACKUP_PREFIX)) continue;
    const v = localStorage.getItem(k) || '';
    let createdAt = 0;
    try { createdAt = JSON.parse(v)?.createdAt || 0; } catch {}
    result.push({
      key: k,
      date: k.replace(BACKUP_PREFIX, ''),
      size: v.length,
      createdAt: createdAt || Date.now(),
    });
  }
  return result.sort((a, b) => b.createdAt - a.createdAt);
}

export function loadBackup(key: string): unknown | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw).data;
  } catch {
    return null;
  }
}

export function deleteBackup(key: string): void {
  try { localStorage.removeItem(key); } catch {}
}

// Eng oxirgi backup vaqti — Dashboard'da yoki Settings'da ko'rsatish uchun
export function lastBackupAt(): number | null {
  const list = listBackups();
  if (list.length === 0) return null;
  return list[0].createdAt;
}
