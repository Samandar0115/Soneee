// Vercel Serverless Function: Gemini AI tahlil endpoint
// POST /api/gemini
// Body: { client: B2BClient, interactions: B2BInteractionLog[] }
// Return: { insight: GeminiInsight }
//
// Zero Trust:
//   - API kalit faqat server-side env'da (GEMINI_API_KEY)
//   - Input validatsiya: client/interactions tipi, hajmi
//   - Output validatsiya: response_schema bilan strikt JSON
//   - Cheklov: interactions[] uchun oxirgi 15 ta logni olamiz (tokenni saqlash uchun)
//   - Xato matnlari xavfsiz — tashqi API ichki tafsilotlarini chiqarmaymiz

import type { VercelRequest, VercelResponse } from '@vercel/node';

const GEMINI_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
const GEMINI_URL = (model: string, key: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

// Gemini response_schema (OpenAPI subset)
const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    churn_risk_percent: {
      type: 'INTEGER',
      description: '0..100 — mijoz ketib qolish xavfi foizi',
    },
    predicted_order_probability: {
      type: 'INTEGER',
      description: '0..100 — yaqin haftada zakaz berish ehtimoli foizi',
    },
    psychological_approach: {
      type: 'STRING',
      description: "KAM uchun aniq psixologik yondashuv (2-3 jumla, o'zbek tilida)",
    },
    action_plan: {
      type: 'ARRAY',
      items: { type: 'STRING' },
      description: "Bajariladigan aniq qadamlar ro'yxati (har biri qisqa, harakat ko'rsatuvchi fe'l bilan)",
    },
  },
  required: ['churn_risk_percent', 'predicted_order_probability', 'psychological_approach', 'action_plan'],
} as const;

interface InsightInput {
  client: {
    brandName?: string;
    ceoName?: string;
    homeAddress?: string;
    hobby?: string;
    historicalPainNotes?: string;
    promisedOrderDate?: string;
    promisedVolumeM3?: number;
  };
  interactions: Array<{
    createdAt: number;
    authorName?: string;
    summary: string;
    sentiment?: string;
    promisedVolumeM3?: number;
    promisedOrderDate?: string;
    nextContactDate?: string;
  }>;
}

function clipString(s: unknown, maxLen: number): string {
  if (typeof s !== 'string') return '';
  return s.length > maxLen ? s.slice(0, maxLen) + '…' : s;
}

function buildPrompt(input: InsightInput): string {
  const c = input.client;
  const ints = input.interactions.slice(-15);
  const interactionLines =
    ints.length === 0
      ? "(Hali muloqot logi yo'q.)"
      : ints
          .map((i, idx) => {
            const dt = new Date(i.createdAt).toLocaleDateString('uz-UZ');
            const promise = i.promisedVolumeM3
              ? ` [Va'da: ${i.promisedVolumeM3}m³${i.promisedOrderDate ? ' / ' + i.promisedOrderDate : ''}]`
              : '';
            const sent = i.sentiment ? ` (kayfiyat: ${i.sentiment})` : '';
            return `${idx + 1}. [${dt}] ${i.authorName || 'KAM'}${sent}: ${clipString(i.summary, 400)}${promise}`;
          })
          .join('\n');

  return [
    "Sen B2B logistika kompaniyasining Key Account Manager (KAM) yordamchisi sun'iy intellektsan.",
    "Mijoz haqida ma'lumot va so'nggi muloqot loglarini tahlil qilib, KAM uchun amaliy tavsiya berasan.",
    'TILI: o\'zbek (lotin yozuvi). Qisqa, aniq, professional.',
    '',
    "=== MIJOZ MA'LUMOTI ===",
    `Brend: ${clipString(c.brandName, 120) || "(noma'lum)"}`,
    `CEO: ${clipString(c.ceoName, 80) || "(noma'lum)"}`,
    `Uy manzili: ${clipString(c.homeAddress, 200) || "(kiritilmagan)"}`,
    `Xobbi/qiziqish: ${clipString(c.hobby, 200) || "(kiritilmagan)"}`,
    `Oldingi muammolar tarixi: ${clipString(c.historicalPainNotes, 800) || "(yo'q)"}`,
    `Joriy va'da: ${c.promisedVolumeM3 ? `${c.promisedVolumeM3}m³` : '(yo\'q)'}` +
      (c.promisedOrderDate ? ` — sanasi ${c.promisedOrderDate}` : ''),
    '',
    '=== MULOQOT LOGLARI (eng so\'nggilari) ===',
    interactionLines,
    '',
    'Vazifa: Quyidagi 4 ta maydonni qattiq JSON formatda qaytar:',
    '1) churn_risk_percent — mijozni yo\'qotish ehtimoli (0..100). Salbiy log ko\'p bo\'lsa yuqori.',
    '2) predicted_order_probability — yaqin haftada zakaz ehtimoli (0..100). Va\'da yangi va aniq bo\'lsa yuqori.',
    "3) psychological_approach — KAM Samandar uchun aniq psixologik yondashuv (2-3 jumla, do'stona ohangda).",
    '4) action_plan — bajariladigan qadamlar (3-6 dona, har biri qisqa fe\'l bilan).',
  ].join('\n');
}

function validateInsight(x: unknown): x is {
  churn_risk_percent: number;
  predicted_order_probability: number;
  psychological_approach: string;
  action_plan: string[];
} {
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  const churn = Number(o.churn_risk_percent);
  const prob = Number(o.predicted_order_probability);
  return (
    Number.isFinite(churn) && churn >= 0 && churn <= 100 &&
    Number.isFinite(prob) && prob >= 0 && prob <= 100 &&
    typeof o.psychological_approach === 'string' && o.psychological_approach.length > 0 &&
    Array.isArray(o.action_plan) && o.action_plan.every((s) => typeof s === 'string')
  );
}

function setCors(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  if (!GEMINI_KEY) {
    return res.status(503).json({ error: 'Gemini API kaliti sozlanmagan (GEMINI_API_KEY)' });
  }

  // Input parsing (Vercel auto-parses JSON body)
  const body = (req.body ?? {}) as Partial<InsightInput>;
  const client = body.client;
  const interactions = body.interactions;
  if (!client || typeof client !== 'object') {
    return res.status(400).json({ error: 'client obyekti talab qilinadi' });
  }
  if (!Array.isArray(interactions)) {
    return res.status(400).json({ error: 'interactions massivi talab qilinadi' });
  }
  if (interactions.length > 500) {
    return res.status(400).json({ error: 'Juda ko\'p interactions (max 500)' });
  }

  const prompt = buildPrompt({ client, interactions } as InsightInput);

  let upstream: Response;
  try {
    upstream = await fetch(GEMINI_URL(GEMINI_MODEL, GEMINI_KEY), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          response_mime_type: 'application/json',
          response_schema: RESPONSE_SCHEMA,
          temperature: 0.3,
          maxOutputTokens: 1024,
        },
        safetySettings: [],
      }),
    });
  } catch (e) {
    return res.status(502).json({ error: 'Gemini xizmatiga ulanib bo\'lmadi' });
  }

  if (!upstream.ok) {
    // Tashqi xato matnlarini mijozga to'liq qaytarmaymiz — faqat status
    return res.status(502).json({ error: `Gemini javob bermadi (HTTP ${upstream.status})` });
  }

  let data: any;
  try {
    data = await upstream.json();
  } catch {
    return res.status(502).json({ error: 'Gemini noto\'g\'ri javob qaytardi' });
  }

  const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    return res.status(502).json({ error: 'Gemini bo\'sh javob qaytardi' });
  }

  let insight: unknown;
  try {
    insight = JSON.parse(text);
  } catch {
    return res.status(502).json({ error: 'Gemini JSON parse xatosi' });
  }
  if (!validateInsight(insight)) {
    return res.status(502).json({ error: 'Gemini chiqishi sxema bilan mos kelmadi' });
  }

  return res.status(200).json({ insight });
}
