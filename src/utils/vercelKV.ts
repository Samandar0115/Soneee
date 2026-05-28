// Vercel KV (Upstash Redis) bilan ishlash uchun client.
// API /api/state endpoint orqali. Lokal dev'da yo'q (404), shuning uchun
// xatoni jim ushlaymiz va `configured:false` qaytaramiz.

export interface KVStatus {
  available: boolean;     // tarmoq orqali API javob beradimi
  configured: boolean;    // serverda env'lar sozlanganmi
  updatedAt?: number;
}

export type CollectionName =
  | 'users' | 'stages' | 'tickets' | 'categories' | 'announcements'
  | 'branches' | 'tariff' | 'settings' | 'templates' | 'notifications'
  | 'callLogs' | 'cargoShipments' | 'leads';

let cachedStatus: KVStatus | null = null;

export async function checkKVStatus(): Promise<KVStatus> {
  if (cachedStatus) return cachedStatus;
  try {
    const res = await fetch('/api/state?meta=1', { method: 'GET' });
    if (!res.ok) {
      cachedStatus = { available: false, configured: false };
      return cachedStatus;
    }
    const json = await res.json();
    cachedStatus = {
      available: true,
      configured: !!json.configured,
    };
    return cachedStatus;
  } catch {
    cachedStatus = { available: false, configured: false };
    return cachedStatus;
  }
}

export function resetKVStatus() {
  cachedStatus = null;
}

/* --------------- Eski rejim: butun snapshot --------------- */

export async function loadFromKV(): Promise<{ data: any; updatedAt?: number } | null> {
  try {
    const res = await fetch('/api/state', { method: 'GET' });
    if (!res.ok) return null;
    const json = await res.json();
    if (!json.configured || !json.data) return null;
    return { data: json.data, updatedAt: json.updatedAt };
  } catch {
    return null;
  }
}

export async function saveToKV(data: unknown): Promise<{ ok: boolean; configured: boolean; error?: string }> {
  try {
    const res = await fetch('/api/state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data }),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      return { ok: false, configured: false, error: txt || `HTTP ${res.status}` };
    }
    const json = await res.json();
    return { ok: !!json.ok, configured: !!json.configured, error: json.error };
  } catch (err) {
    return { ok: false, configured: false, error: (err as Error).message };
  }
}

/* --------------- Yangi rejim: per-collection + meta --------------- */

// Faqat metani olish — har bir kolleksiya updatedAt'i. ~200 bayt, polling uchun arzon
export async function loadMetaFromKV(): Promise<Record<string, number> | null> {
  try {
    const res = await fetch('/api/state?meta=1', { method: 'GET' });
    if (!res.ok) return null;
    const json = await res.json();
    if (!json.configured) return null;
    return json.meta || {};
  } catch {
    return null;
  }
}

// Bitta kolleksiyani olish
export async function loadCollectionFromKV(
  name: CollectionName
): Promise<{ data: any; updatedAt: number } | null> {
  try {
    const res = await fetch(`/api/state?collection=${encodeURIComponent(name)}`, { method: 'GET' });
    if (!res.ok) return null;
    const json = await res.json();
    if (!json.configured) return null;
    return { data: json.data, updatedAt: json.updatedAt || 0 };
  } catch {
    return null;
  }
}

/* --------------- USER atomik saqlash (HASH) --------------- */
// Har bir foydalanuvchi alohida HASH field sifatida saqlanadi.
// Bu 100% atomik: bitta user'ni yozish boshqasini hech qachon o'zgartirmaydi.
// 30+ xodim qo'shilganda ham har biri mustaqil yoziladi.

export async function saveUserToKV(
  user: { id: string } & Record<string, unknown>
): Promise<{ ok: boolean; configured: boolean; error?: string; updatedAt?: number }> {
  try {
    const res = await fetch(`/api/state?user=${encodeURIComponent(user.id)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: user }),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      return { ok: false, configured: false, error: txt || `HTTP ${res.status}` };
    }
    const json = await res.json();
    return { ok: !!json.ok, configured: !!json.configured, error: json.error, updatedAt: json.updatedAt };
  } catch (err) {
    return { ok: false, configured: false, error: (err as Error).message };
  }
}

export async function deleteUserFromKV(
  userId: string
): Promise<{ ok: boolean; configured: boolean; error?: string }> {
  try {
    const res = await fetch(`/api/state?user=${encodeURIComponent(userId)}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      return { ok: false, configured: false, error: txt || `HTTP ${res.status}` };
    }
    const json = await res.json();
    return { ok: !!json.ok, configured: !!json.configured, error: json.error };
  } catch (err) {
    return { ok: false, configured: false, error: (err as Error).message };
  }
}

/* --------------- Admin cleanup --------------- */
export async function cleanupLegacyKV(): Promise<{ ok: boolean; removed?: number; message?: string; error?: string }> {
  try {
    const res = await fetch(`/api/state?cleanup=legacy`, { method: 'POST' });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      return { ok: false, error: txt || `HTTP ${res.status}` };
    }
    const json = await res.json();
    return { ok: !!json.ok, removed: json.removed, message: json.message, error: json.error };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

// Bitta kolleksiyani yangilash — delta save (5-10 MB emas, ~10-100 KB)
export async function saveCollectionToKV(
  name: CollectionName,
  data: unknown
): Promise<{ ok: boolean; configured: boolean; error?: string; updatedAt?: number }> {
  try {
    const res = await fetch(`/api/state?collection=${encodeURIComponent(name)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data }),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      return { ok: false, configured: false, error: txt || `HTTP ${res.status}` };
    }
    const json = await res.json();
    return { ok: !!json.ok, configured: !!json.configured, error: json.error, updatedAt: json.updatedAt };
  } catch (err) {
    return { ok: false, configured: false, error: (err as Error).message };
  }
}
