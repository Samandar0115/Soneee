// Vercel Serverless Function: butun ilova holatini saqlash/o'qish
// Upstash Redis REST API orqali (Vercel Marketplace'dan Redis integratsiya ulanganda
// KV_REST_API_URL va KV_REST_API_TOKEN env'lari avtomatik kelib qoladi)
//
// REJIMLAR (eski + yangi):
//   GET  /api/state                      → eski rejim: butun snapshot (orqaga moslik)
//   GET  /api/state?meta=1               → meta: har bir kolleksiya updatedAt'i (~200 bayt)
//   GET  /api/state?collection=tickets   → bitta kolleksiya
//   POST /api/state {data: {...}}        → butun snapshot (eski rejim)
//   POST /api/state?collection=tickets {data: [...]} → bitta kolleksiyani yangilash + meta
//
// Per-collection rejim:
//   * Bitta name'ni o'zgartirsangiz faqat users + meta yoziladi (~10 KB), 5-10 MB emas
//   * Polling meta'ni oladi (~200 bayt), faqat o'zgargan kolleksiyani qayta o'qiydi

import type { VercelRequest, VercelResponse } from '@vercel/node';

const URL_ENV = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN_ENV = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

const KEY_LEGACY = 'ipost:state:v1';
const KEY_META = 'ipost:meta:v3';
const COL_KEY = (name: string) => `ipost:col:${name}:v3`;
// Foydalanuvchilar uchun HASH — har bir user alohida field
const USERS_HASH_KEY = 'ipost:hash:users:v3';

const COLLECTIONS = [
  'users', 'stages', 'tickets', 'categories', 'announcements',
  'branches', 'tariff', 'settings', 'templates', 'notifications',
  'callLogs', 'cargoShipments', 'leads', 'tracks', 'lessons', 'learnerProgress',
  'profileChanges', 'roles', 'trash', 'tripRoutes', 'trekRequests',
] as const;

type Collection = typeof COLLECTIONS[number];

function isConfigured() {
  return !!(URL_ENV && TOKEN_ENV);
}

async function redisGet(key: string): Promise<string | null> {
  const res = await fetch(`${URL_ENV}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${TOKEN_ENV}` },
  });
  if (!res.ok) throw new Error(`Redis GET ${key} HTTP ${res.status}`);
  const json = await res.json();
  return json?.result ?? null;
}

async function redisMGet(keys: string[]): Promise<(string | null)[]> {
  if (keys.length === 0) return [];
  const path = ['mget', ...keys].map(encodeURIComponent).join('/');
  const res = await fetch(`${URL_ENV}/${path}`, {
    headers: { Authorization: `Bearer ${TOKEN_ENV}` },
  });
  if (!res.ok) throw new Error(`Redis MGET HTTP ${res.status}`);
  const json = await res.json();
  return (json?.result ?? []) as (string | null)[];
}

async function redisSet(key: string, value: string): Promise<void> {
  const res = await fetch(`${URL_ENV}/set/${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TOKEN_ENV}`,
      'Content-Type': 'text/plain',
    },
    body: value,
  });
  if (!res.ok) throw new Error(`Redis SET ${key} HTTP ${res.status}`);
}

async function redisDel(key: string): Promise<number> {
  const res = await fetch(`${URL_ENV}/del/${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN_ENV}` },
  });
  if (!res.ok) throw new Error(`Redis DEL ${key} HTTP ${res.status}`);
  const json = await res.json();
  return json?.result ?? 0;
}

// HASH operations — har bir field alohida atomik saqlanadi.
// Foydalanuvchilar shu yerda turadi: hech qachon birini saqlash boshqasini yo'qotmaydi.
async function redisHSet(key: string, field: string, value: string): Promise<void> {
  const res = await fetch(`${URL_ENV}/hset/${encodeURIComponent(key)}/${encodeURIComponent(field)}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TOKEN_ENV}`,
      'Content-Type': 'text/plain',
    },
    body: value,
  });
  if (!res.ok) throw new Error(`Redis HSET ${key}.${field} HTTP ${res.status}`);
}

async function redisHGetAll(key: string): Promise<Record<string, string>> {
  const res = await fetch(`${URL_ENV}/hgetall/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${TOKEN_ENV}` },
  });
  if (!res.ok) throw new Error(`Redis HGETALL ${key} HTTP ${res.status}`);
  const json = await res.json();
  const result = json?.result;
  if (!result) return {};
  // Upstash qaytaradigan format: massiv [field, value, field, value...] yoki obyekt
  if (Array.isArray(result)) {
    const obj: Record<string, string> = {};
    for (let i = 0; i < result.length; i += 2) {
      obj[result[i]] = result[i + 1];
    }
    return obj;
  }
  return result as Record<string, string>;
}

async function redisHDel(key: string, field: string): Promise<number> {
  const res = await fetch(`${URL_ENV}/hdel/${encodeURIComponent(key)}/${encodeURIComponent(field)}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN_ENV}` },
  });
  if (!res.ok) throw new Error(`Redis HDEL ${key}.${field} HTTP ${res.status}`);
  const json = await res.json();
  return json?.result ?? 0;
}

async function loadMeta(): Promise<Record<string, number>> {
  const raw = await redisGet(KEY_META);
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function saveMeta(meta: Record<string, number>): Promise<void> {
  await redisSet(KEY_META, JSON.stringify(meta));
}

async function loadFullFromCollections(): Promise<{ data: any; updatedAt: number } | null> {
  const keys = COLLECTIONS.map(COL_KEY);
  const values = await redisMGet(keys);
  const data: any = {};
  let hasAny = false;
  COLLECTIONS.forEach((name, i) => {
    const raw = values[i];
    if (!raw) return;
    try {
      data[name] = JSON.parse(raw);
      hasAny = true;
    } catch {}
  });
  if (!hasAny) return null;
  const meta = await loadMeta();
  const updatedAt = Math.max(0, ...Object.values(meta));
  return { data, updatedAt: updatedAt || Date.now() };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS — desktop (.exe / Tauri) ilovasi boshqa origin'dan (tauri://localhost)
  // shu API'ga ulanishi uchun. Ma'lumotlar baribir ochiq URL'da, shuning uchun
  // '*' xavfsizlikni kamaytirmaydi.
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Max-Age', '86400');
    return res.status(204).end();
  }

  // Vercel Edge cache — bir nechta operator bir vaqtda poll qilsa,
  // bitta origin'ga so'rov ketadi. Bu Fast Origin Transfer'ni 80-90% kamaytiradi.
  // Mutation (POST) uchun cache ishlatilmaydi — har doim yangi yoziladi.
  if (req.method === 'GET') {
    const q = req.query || {};
    const isMeta = q.meta === '1' || q.meta === 'true';
    if (isMeta) {
      // Meta endpoint: 3 sekund edge cache, 5 sekund stale-while-revalidate.
      // Yangi mutation darhol meta'ni yangilaydi, edge esa 3 sekundlik bufer beradi.
      res.setHeader('Cache-Control', 'public, s-maxage=3, stale-while-revalidate=5');
    } else if (typeof q.collection === 'string') {
      // Per-collection: 2 sekund edge cache. updatedAt o'zgarsa polling avto yangi data oladi.
      res.setHeader('Cache-Control', 'public, s-maxage=2, stale-while-revalidate=4');
    } else {
      // Butun snapshot (legacy / initial load): 5 sekund edge cache
      res.setHeader('Cache-Control', 'public, s-maxage=5, stale-while-revalidate=10');
    }
  } else {
    res.setHeader('Cache-Control', 'no-store');
  }

  if (!isConfigured()) {
    return res.status(200).json({
      ok: true,
      configured: false,
      message: 'Vercel KV/Redis ulanmagan. Vercel Marketplace’dan Redis integratsiya ulang.',
    });
  }

  try {
    const q = req.query || {};
    const collectionParam = typeof q.collection === 'string' ? q.collection : '';
    const metaOnly = q.meta === '1' || q.meta === 'true';
    const userIdParam = typeof q.user === 'string' ? q.user : '';
    const cleanupParam = typeof q.cleanup === 'string' ? q.cleanup : '';

    // ============= HASH endpoints (foydalanuvchilar uchun atomik) =============
    if (userIdParam) {
      if (req.method === 'GET') {
        // Bitta user'ni olish HGETALL'dan
        const all = await redisHGetAll(USERS_HASH_KEY);
        const raw = all[userIdParam];
        const data = raw ? JSON.parse(raw) : null;
        return res.status(200).json({ ok: true, configured: true, data });
      }
      if (req.method === 'POST') {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        if (!body?.data?.id) return res.status(400).json({ ok: false, error: 'user data kerak' });
        const value = JSON.stringify(body.data);
        const now = Date.now();
        // Atomik HSET — boshqa foydalanuvchilarni hech qachon o'zgartirmaydi
        await redisHSet(USERS_HASH_KEY, userIdParam, value);
        // Meta ham yangilanadi — boshqa tab'lar polling orqali biladi
        const meta = await loadMeta();
        meta['users'] = now;
        await saveMeta(meta);
        return res.status(200).json({ ok: true, configured: true, updatedAt: now });
      }
      if (req.method === 'DELETE') {
        await redisHDel(USERS_HASH_KEY, userIdParam);
        const meta = await loadMeta();
        meta['users'] = Date.now();
        await saveMeta(meta);
        return res.status(200).json({ ok: true, configured: true });
      }
    }

    // ============= Hammasini HASH'dan olish (full users) =============
    if (req.method === 'GET' && (q.usersHash === '1' || q.usersHash === 'true')) {
      const all = await redisHGetAll(USERS_HASH_KEY);
      const list = Object.values(all).map((raw) => {
        try { return JSON.parse(raw); } catch { return null; }
      }).filter(Boolean);
      const meta = await loadMeta();
      return res.status(200).json({
        ok: true,
        configured: true,
        data: list,
        updatedAt: meta['users'] || 0,
      });
    }

    // ============= Admin cleanup =============
    if (cleanupParam && req.method === 'POST') {
      if (cleanupParam === 'legacy') {
        const removed = await redisDel(KEY_LEGACY);
        return res.status(200).json({
          ok: true,
          configured: true,
          removed,
          message: removed > 0 ? "Legacy snapshot o'chirildi" : "Legacy snapshot mavjud emas edi",
        });
      }
      return res.status(400).json({ ok: false, error: 'Nomalum cleanup turi' });
    }

    if (req.method === 'GET') {
      if (metaOnly) {
        const meta = await loadMeta();
        return res.status(200).json({ ok: true, configured: true, meta });
      }

      if (collectionParam) {
        if (!COLLECTIONS.includes(collectionParam as Collection)) {
          return res.status(400).json({ ok: false, error: `Nomalum kolleksiya: ${collectionParam}` });
        }
        // 'users' — HASH'dan o'qiymiz (yangi atomik storage)
        if (collectionParam === 'users') {
          const all = await redisHGetAll(USERS_HASH_KEY);
          let list: any[] = Object.values(all).map((raw) => {
            try { return JSON.parse(raw); } catch { return null; }
          }).filter(Boolean);
          // Agar HASH bo'sh bo'lsa — eski COL_KEY'dan ola olamiz (migratsiya uchun)
          if (list.length === 0) {
            const raw = await redisGet(COL_KEY('users'));
            if (raw) {
              try { list = JSON.parse(raw); } catch {}
            }
          }
          const meta = await loadMeta();
          return res.status(200).json({
            ok: true,
            configured: true,
            collection: collectionParam,
            data: list,
            updatedAt: meta['users'] || 0,
          });
        }
        const raw = await redisGet(COL_KEY(collectionParam));
        const data = raw ? JSON.parse(raw) : null;
        const meta = await loadMeta();
        return res.status(200).json({
          ok: true,
          configured: true,
          collection: collectionParam,
          data,
          updatedAt: meta[collectionParam] || 0,
        });
      }

      // Butun snapshot — avval per-collection key'lardan
      const combined = await loadFullFromCollections();
      if (combined) {
        return res.status(200).json({
          ok: true,
          configured: true,
          data: combined.data,
          updatedAt: combined.updatedAt,
        });
      }

      // Legacy fallback
      const legacy = await redisGet(KEY_LEGACY);
      if (!legacy) {
        return res.status(200).json({ ok: true, configured: true, data: null });
      }
      try {
        const parsed = JSON.parse(legacy);
        return res.status(200).json({
          ok: true,
          configured: true,
          data: parsed.data,
          updatedAt: parsed.updatedAt,
        });
      } catch {
        return res.status(200).json({ ok: true, configured: true, data: null });
      }
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      if (!body || typeof body !== 'object') {
        return res.status(400).json({ ok: false, error: 'body kerak' });
      }

      // Bitta kolleksiyani yangilash (delta save)
      if (collectionParam) {
        if (!COLLECTIONS.includes(collectionParam as Collection)) {
          return res.status(400).json({ ok: false, error: `Nomalum kolleksiya: ${collectionParam}` });
        }
        const now = Date.now();
        const meta = await loadMeta();
        meta[collectionParam] = now;
        // 'users' — alohida ishlanadi: HASH'ga har birini alohida yozamiz.
        // Bu shu vaqtda bir nechta tab/PC saqlashdaa raqobat (race) ni
        // butunlay yo'qotadi: bitta user'ni yozish boshqasini hech qachon o'chirmaydi.
        if (collectionParam === 'users' && Array.isArray(body.data)) {
          const writes: Promise<unknown>[] = [];
          for (const u of body.data as Array<{ id?: string }>) {
            if (!u || !u.id) continue;
            const v = JSON.stringify(u);
            if (v.length > 1_500_000) {
              return res.status(413).json({ ok: false, error: `user ${u.id} > 1.5 MB` });
            }
            writes.push(redisHSet(USERS_HASH_KEY, u.id, v));
          }
          writes.push(saveMeta(meta));
          await Promise.all(writes);
          return res.status(200).json({ ok: true, configured: true, updatedAt: now });
        }
        const value = JSON.stringify(body.data ?? null);
        if (value.length > 4_500_000) {
          return res.status(413).json({ ok: false, error: `${collectionParam} > 4.5 MB — kichikroq qiling (masalan rasm hajmini kamaytiring)` });
        }
        await Promise.all([
          redisSet(COL_KEY(collectionParam), value),
          saveMeta(meta),
        ]);
        return res.status(200).json({ ok: true, configured: true, updatedAt: now });
      }

      // Butun snapshot — har bir kolleksiyani alohida yozish + meta yangilash
      if (!body.data || typeof body.data !== 'object') {
        return res.status(400).json({ ok: false, error: 'data majburiy' });
      }
      const now = Date.now();
      const meta: Record<string, number> = {};
      const writes: Promise<void>[] = [];
      for (const name of COLLECTIONS) {
        const v = body.data[name];
        if (v === undefined) continue;
        const s = JSON.stringify(v);
        if (s.length > 4_500_000) {
          return res.status(413).json({ ok: false, error: `${name} > 4.5 MB` });
        }
        writes.push(redisSet(COL_KEY(name), s));
        meta[name] = now;
      }
      writes.push(saveMeta(meta));
      // Legacy snapshot endi takror yozilmaydi — joy egallashni 50% kamaytiradi.
      // Per-collection key'lar to'liq snapshot sifatida xizmat qiladi.
      await Promise.all(writes);
      return res.status(200).json({ ok: true, configured: true, updatedAt: now });
    }

    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      configured: true,
      error: (err as Error).message,
    });
  }
}
