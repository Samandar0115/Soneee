// Vercel KV (Upstash Redis) bilan ishlash uchun client.
// API /api/state endpoint orqali. Lokal dev'da yo'q (404), shuning uchun
// xatoni jim ushlaymiz va `configured:false` qaytaramiz.

export interface KVStatus {
  available: boolean;     // tarmoq orqali API javob beradimi
  configured: boolean;    // serverda env'lar sozlanganmi
  updatedAt?: number;
}

let cachedStatus: KVStatus | null = null;

export async function checkKVStatus(): Promise<KVStatus> {
  if (cachedStatus) return cachedStatus;
  try {
    const res = await fetch('/api/state', { method: 'GET' });
    if (!res.ok) {
      cachedStatus = { available: false, configured: false };
      return cachedStatus;
    }
    const json = await res.json();
    cachedStatus = {
      available: true,
      configured: !!json.configured,
      updatedAt: json.updatedAt,
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
