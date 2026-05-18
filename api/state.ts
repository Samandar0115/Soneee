// Vercel Serverless Function: butun ilova holatini saqlash/o'qish
// Upstash Redis REST API orqali (Vercel Marketplace'dan Redis integratsiya
// ulanganda KV_REST_API_URL va KV_REST_API_TOKEN env'lari avtomatik kelib qoladi)
//
// Endpoints:
//   GET  /api/state         → { ok, configured, data?, updatedAt? }
//   POST /api/state {data}  → { ok, configured }
//
// Agar env'lar yo'q bo'lsa, 200 status va configured:false bilan javob qaytaradi
// (front-end localStorage'ga fallback qiladi).

import type { VercelRequest, VercelResponse } from '@vercel/node';

const URL_ENV = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN_ENV = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const KEY = 'ipost:state:v1';

function isConfigured() {
  return !!(URL_ENV && TOKEN_ENV);
}

async function redis(command: (string | number)[]): Promise<any> {
  if (!isConfigured()) return null;
  const res = await fetch(`${URL_ENV}/${command.map(encodeURIComponent).join('/')}`, {
    headers: { Authorization: `Bearer ${TOKEN_ENV}` },
  });
  if (!res.ok) throw new Error(`Redis HTTP ${res.status}`);
  return res.json();
}

async function redisSet(value: string): Promise<any> {
  if (!isConfigured()) return null;
  const res = await fetch(`${URL_ENV}/set/${encodeURIComponent(KEY)}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TOKEN_ENV}`,
      'Content-Type': 'text/plain',
    },
    body: value,
  });
  if (!res.ok) throw new Error(`Redis HTTP ${res.status}`);
  return res.json();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS — front-end shu domeniga uradi, lekin har qanday holatda ham xavfsiz
  res.setHeader('Cache-Control', 'no-store');

  if (!isConfigured()) {
    return res.status(200).json({
      ok: true,
      configured: false,
      message: 'Vercel KV/Redis ulanmagan. Vercel Marketplace’dan Redis integratsiya ulang.',
    });
  }

  try {
    if (req.method === 'GET') {
      const result = await redis(['get', KEY]);
      const raw = result?.result;
      if (!raw) {
        return res.status(200).json({ ok: true, configured: true, data: null });
      }
      try {
        const parsed = JSON.parse(raw);
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
      if (!body || typeof body !== 'object' || !body.data) {
        return res.status(400).json({ ok: false, error: 'data majburiy' });
      }
      const payload = JSON.stringify({ data: body.data, updatedAt: Date.now() });
      // Vercel KV doc size limitlari mavjud — taxminan 1 MB. Katta bo'lsa xato.
      if (payload.length > 1_000_000) {
        return res.status(413).json({ ok: false, error: 'Backup hajmi > 1MB' });
      }
      await redisSet(payload);
      return res.status(200).json({ ok: true, configured: true });
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
