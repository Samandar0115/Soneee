import { useEffect, useRef, useState } from 'react';
import {
  Upload, Camera, Copy, RefreshCcw, ScanLine, AlertTriangle,
  CheckCircle2, ArrowDown, Loader2, Eye,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useApp } from '../context/AppContext';
import {
  ADDRESS_ID_PLACEHOLDER,
  DEFAULT_CHINESE_ADDRESS,
  type ChineseAddressTemplate,
} from '../types';

function copyText(text: string) {
  void navigator.clipboard.writeText(text).then(
    () => toast.success('Nusxalandi'),
    () => toast.error('Nusxalashda xatolik'),
  );
}

// Ko'p formatdagi ID placeholder'larni qo'llab-quvvatlaydi: {ID}, <ID>, (ID), [ID], 【ID】
const ID_PLACEHOLDER_RE = /\{\s*ID\s*\}|<\s*ID\s*>|\(\s*ID\s*\)|\[\s*ID\s*\]|【\s*ID\s*】/gi;

function fillId(text: string, id: string): string {
  if (!text) return '';
  if (id) return text.replace(ID_PLACEHOLDER_RE, id);
  // ID yo'q bo'lsa — birlashtirilgan ko'rinishda qoldiramiz, oxirgi UI'da '___' bilan almashtiramiz
  return text;
}

// Foydalanuvchi uchun chiroyli ko'rinish — placeholder'ni '______' bilan almashtiradi
function renderForUi(text: string, id: string): string {
  if (!text) return '';
  if (id) return text.replace(ID_PLACEHOLDER_RE, id);
  return text.replace(ID_PLACEHOLDER_RE, '______');
}

// Belgilarni normallashtirish — taqqoslash uchun bo'shliq/tinish belgilarini olib tashlaydi
function norm(s: string): string {
  return (s || '')
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[(),，。．．:：;；、（）\[\]【】「」｜|\-—_·.]/g, '');
}

// Hamma Xitoy keyword'lari (boshqa maydonni "to'xtash belgisi" sifatida ham ishlatamiz)
const ALL_KEYWORDS_RE = /收货人|收件人|联系人|姓名|姓\s*名|Имя|手机号码|手机号|手机|电话|联系电话|Мобильный\s*телефон|所在地区|地区|区域|省市区|Регион|详细地址|街道地址|小区楼栋|乡村名称|地址|Адрес|邮编|邮政编码|Почтовый\s*индекс|保存|Сохранить|定位/i;

// OCR matnidan qora overlay/toast/yo'l-yo'riq matnlarini olib tashlash
// (Poizon va 1688 da koordinatalar/lokatsiya ogohlantirishlari rasm ustidan tushadi)
const OVERLAY_PHRASES = [
  // Lokatsiya/karta tooltip'lari
  '未找到位置信息', '当前定位无信息', '去设置',
  '地址定位不准', '请在地图上选择地址',
  '找不到地址', '试试搜索吧',
  // Auto-fill tugmalari
  '智能粘贴', '智能填写', '智能填', '点击识别', '识别', '清除',
  // Yuklash holatlari
  '正在加载', '正在加载...', '加载中',
  // 1688 qidiruv label
  '搜索小区', '写字楼', '学校等', '搜索地址', '更快填写',
  // Validation xatolari
  '你输入的收货人姓名过长',
  // Sarlavhalar
  '编辑地址', '修改收货地址', '收货地址', '新增地址', '管理', '删除',
  // Taobao rus UI
  'Редактировать адрес получения', 'Вставьте сюда адрес',
  'Автозаполнение', 'Очистить одним кликом', 'Сохранить', 'Установить адрес по умолчанию',
  // Qo'shimcha label maydonlari
  '地址标签', '收件偏好', '默认地址', '未设置',
  // 1688 label suffix'lari (qator oxirida — ekstraksiyani buzmasligi uchun olib tashlanadi)
  '/乡村名称', '乡村名称',
  '(Street,number,apt,suite,floor,etc.)',
  '(Street, number, apt, suite, floor, etc.)',
  'Street,number,apt,suite,floor,etc.',
  '(Phone Number)', '(Phone Number)', 'Phone Number',
  '(不含港澳台)', '中国境内', // Taobao davlat tanlovi label'i
];

function stripOverlayText(raw: string): string {
  let t = raw;
  for (const ph of OVERLAY_PHRASES) {
    t = t.split(ph).join(' ');
  }
  return t;
}

// Platforma aniqlash — OCR matnidagi belgilardan.
// Tartib: eng o'ziga xos belgilardan boshlab.
type Platform = 'pinduoduo' | 'taobao' | '1688' | 'poizon' | 'unknown';

function detectPlatform(rawText: string): Platform {
  const t = rawText;
  // 1688 ga xos: 小区楼栋, 乡村名称, 智能粘贴 — boshqa platformalarda yo'q
  if (/小区楼栋|乡村名称|智能粘贴|新增地址|高德地图/.test(t)) return '1688';
  // Poizon (得物App) — brand nomi yoki uzun ism xato
  if (/得物|你输入的收货人姓名过长/.test(t)) return 'poizon';
  // Taobao — rus tilidagi UI
  if (/Имя|Регион|Адрес|Сохранить|Редактировать|Мобильный/i.test(t)) return 'taobao';
  // Pinduoduo
  if (/修改收货地址|拼多多|pinduoduo/i.test(t)) return 'pinduoduo';
  // Ehtimoliy fallback: 编辑地址 — Poizon va boshqalarda ham bo'lishi mumkin
  if (/编辑地址/.test(t)) return 'poizon';
  return 'unknown';
}

const PLATFORM_LABEL: Record<Platform, string> = {
  pinduoduo: 'Pinduoduo',
  taobao: 'Taobao',
  '1688': '1688',
  poizon: 'Poizon (得物)',
  unknown: "Aniqlanmagan",
};

// Xitoy keyword'idan keyingi matnni qidirib olish — bir qator ichida, qo'shni qatorda yoki butun matnda
function findAfter(ocrText: string, ...keywords: string[]): string {
  const lines = ocrText.split('\n').map((l) => l.trim()).filter(Boolean);
  // 1) Bir qator ichida — kw dan keyin matn bo'lsa
  for (const kw of keywords) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const idx = line.indexOf(kw);
      if (idx === -1) continue;
      let rest = line.slice(idx + kw.length).trim();
      rest = rest.replace(/^[:：\-—\s|·]+/, '').trim();
      // Boshqa maydon nomini kesib tashlash
      const nextKwMatch = rest.match(ALL_KEYWORDS_RE);
      if (nextKwMatch && nextKwMatch.index !== undefined) {
        rest = rest.slice(0, nextKwMatch.index).trim();
      }
      if (rest) return rest;
      // Keyingi qatorda bo'lsa
      const next = lines[i + 1];
      if (next && !ALL_KEYWORDS_RE.test(next)) return next;
    }
  }
  // 2) Butun matnda (qator yo'q rejimda)
  const full = ocrText.replace(/\n/g, ' ').replace(/\s+/g, ' ');
  for (const kw of keywords) {
    const idx = full.indexOf(kw);
    if (idx === -1) continue;
    let after = full.slice(idx + kw.length).trim();
    after = after.replace(/^[:：\-—\s|·]+/, '');
    const nextKwMatch = after.match(ALL_KEYWORDS_RE);
    if (nextKwMatch && nextKwMatch.index !== undefined) {
      after = after.slice(0, nextKwMatch.index);
    }
    after = after.trim();
    if (after) return after;
  }
  return '';
}

// OCR matnidan 077库房/XXXXX号 namunasi orqali ID ni aniqlash
function detectIdFromText(ocrText: string): string | null {
  const t = ocrText.replace(/\s+/g, '');
  // 077库房/12345号 yoki 077库房\12345 yoki 077库房 12345
  const m = t.match(/077[库厍房号]{1,3}[\/\\／＼号]?(\d{4,8})/);
  if (m && m[1]) return m[1];
  // Yoxud (XXXXX号) ko'rinishida
  const m2 = t.match(/[\(（](\d{4,8})号?[\)）]/);
  if (m2 && m2[1]) return m2[1];
  return null;
}

interface Extracted {
  recipientName: string;
  phone: string;
  region: string;
  address: string;
  postalCode: string;
}

interface OcrLineData {
  text: string;
  bbox: { x0: number; y0: number; x1: number; y1: number };
}

function findFieldBbox(lines: OcrLineData[], keywords: string[]): OcrLineData['bbox'] | null {
  for (const kw of keywords) {
    for (const ln of lines) {
      if (ln.text.includes(kw)) return ln.bbox;
    }
  }
  return null;
}

function extractFields(rawText: string): Extracted {
  const cleaned = stripOverlayText(rawText);
  const lines = cleaned.split('\n').map((l) => l.trim()).filter(Boolean);

  // 1. PHONE — keyword + Xitoy mobil pattern fallback
  let phone = findAfter(
    cleaned,
    '手机号码', '手机号', '联系电话', '电话', '手机', 'Мобильный телефон', 'Мобильный',
  );
  if (!/\d{7,}/.test(phone)) {
    const m = cleaned.match(/(?:\+?86[\s\-]*)?1\d{2}[\s\-]*\d{4}[\s\-]*\d{4}/);
    if (m) phone = m[0];
  }

  // 2. ADDRESS — keyword + 路N号 pattern fallback
  let address = findAfter(
    cleaned,
    '详细地址', '街道地址', '小区楼栋', '乡村名称', '地址', 'Адрес',
  );
  if (!address || address.length < 8) {
    const m = cleaned.match(/[一-鿿]+路\d+号[^\n]{0,80}/);
    if (m) address = m[0].trim();
  }
  // Hali ham yetarli emas — qator skanerlash
  if (!address || !/路\s*\d+\s*号/.test(address)) {
    const candidate = lines.find((l) => /路\s*\d+\s*号/.test(l) && l.length > 6);
    if (candidate) address = candidate;
  }

  // 3. RECIPIENT — keyword + 077库房 pattern (address qatori EMAS)
  let recipient = findAfter(
    cleaned,
    '收货人', '收件人', '联系人', '姓名', '姓 名', 'Имя',
  );
  if (!recipient || !/\d/.test(recipient)) {
    // 077库房/XXXXX号 namunasi bo'lgan, lekin manzil qatori bo'lmagan
    const candidate = lines.find((l) => {
      const has077 = /077\s*[库厍]?\s*房.{0,5}\d{3,8}/.test(l);
      const isAddressLine = /路\s*\d+\s*号/.test(l);
      return has077 && !isAddressLine && l.length < 30;
    });
    if (candidate) recipient = candidate;
  }

  // 4. REGION — viloyat/shahar/tuman patterniga ustunlik beramiz (har platforma uchun ishonchli)
  let region = findAfter(
    cleaned,
    '所在地区', '省市区', '地区', '区域', 'Регион',
  );
  const regionLine = lines.find((l) =>
    /[一-鿿]+省\s*[一-鿿]+市\s*[一-鿿]+(市|区|县|镇)/.test(l) && !/路\s*\d+\s*号/.test(l),
  );
  // Agar pattern topilgan bo'lsa, undan foydalanamiz (rus/eng label OCR'i ishonchsiz)
  if (regionLine) {
    region = regionLine;
  } else if (region && /中国境内|不含港澳台|境内|Гонконг|Макао/.test(region)) {
    // davlat tanlovi label — bo'sh deb hisoblaymiz
    region = '';
  }

  // 5. POSTAL — keyword + 6 raqamli fallback (telefon ichidagi emas)
  let postalCode = findAfter(
    cleaned,
    '邮编', '邮政编码', 'Почтовый индекс', 'Почтовый',
  );
  if (!postalCode) {
    const phoneDigits = phone.replace(/\D/g, '');
    const all6 = cleaned.match(/\b\d{6}\b/g) || [];
    for (const d of all6) {
      if (phoneDigits.includes(d)) continue;
      postalCode = d;
      break;
    }
  }

  return { recipientName: recipient, phone, region, address, postalCode };
}

type FieldKey = 'recipientName' | 'phone' | 'region' | 'address' | 'postalCode';

// Instruksiya turi — UI ranglar va belgilar uchun
type InstructionKind =
  | 'ok'              // ✓ — hech narsa qilmaslik
  | 'add'             // ➕ — shuni qo'shing (existing matnga)
  | 'replace'         // ✏️ — buni yozing (mavjudini o'zgartirib)
  | 'fill'            // 📝 — bo'sh maydonga shuni yozing
  | 'optional-empty'; // ⚪ — bu maydon yo'q (lekin OK)

interface FieldCheck {
  key: FieldKey;
  zh: string;
  label: string;
  expected: string;       // mijoz nima yozishi kerak (to'liq, foydalanuvchi ko'radi)
  detected: string;       // OCR rasmdan topgan matn
  kind: InstructionKind;
  action: string;         // qisqacha bosh harfli ko'rsatma ("Bu yerga qo'shing", "Almashtiring", ...)
  payload: string;        // qaysi matnni qo'shish/almashtirish — copy tugmasi shuni nusxalaydi
}

// Platforma uchun "收货人" formati — barcha platformalarda bir xil to'liq variant
// (qavs ixtiyoriy: mijoz qo'shsa ham bo'ladi, qo'shmasa ham OK)
function recipientExpected(_platform: Platform, id: string): string {
  return id ? `(077库房/${id}号)` : '(077库房/<ID>号)';
}

function instructRecipient(detected: string, id: string, platform: Platform): { kind: InstructionKind; action: string; payload: string } {
  // 1688 da alohida 收货人 maydon yo'q — bu kontrol o'tkazib yuboriladi
  if (platform === '1688') {
    return { kind: 'optional-empty', action: '1688 da alohida bu maydon yo\'q — OK', payload: '' };
  }
  const expected = recipientExpected(platform, id);
  if (!detected) {
    return { kind: 'fill', action: "收货人 bo'sh — yozing:", payload: expected };
  }
  // 077库房/XXXXX号 namunasini topish (qavs, bo'shliq, OCR xato variantlari bilan)
  const m = detected.match(/077\s*[库厍]?\s*房\s*[\/\\／＼:号\s]*(\d{4,8})/);
  const detectedId = m?.[1] ?? '';

  if (!id) {
    return { kind: 'fill', action: 'Avval yuqorida ID kiriting', payload: expected };
  }
  if (detectedId === id) {
    return { kind: 'ok', action: "To'g'ri yozilgan", payload: '' };
  }
  if (detectedId) {
    return { kind: 'replace', action: `ID xato (${detectedId}). Almashtiring:`, payload: expected };
  }
  return { kind: 'replace', action: 'Format noto\'g\'ri. Almashtiring:', payload: expected };
}

// +86 prefiks va bo'shliqlarni hisobga olib, faqat oxirgi 11 raqamni (Xitoy mobil) solishtiramiz
function phoneCore(s: string): string {
  return (s || '').replace(/\D/g, '').slice(-11);
}

function instructPhone(detected: string, expected: string): { kind: InstructionKind; action: string; payload: string } {
  if (!detected) {
    return { kind: 'fill', action: "Telefon bo'sh — yozing:", payload: expected };
  }
  const dCore = phoneCore(detected);
  const eCore = phoneCore(expected);
  if (dCore && eCore && dCore === eCore) return { kind: 'ok', action: "To'g'ri yozilgan", payload: '' };
  return { kind: 'replace', action: "Telefon noto'g'ri. Almashtiring:", payload: expected };
}

function instructRegion(detected: string, tpl: ChineseAddressTemplate, fullText: string): { kind: InstructionKind; action: string; payload: string } {
  const expected = `${tpl.province} ${tpl.city} ${tpl.district}`;
  // Region maydon topilmasligi yoki "中国境内(不含港澳台)" kabi davlat tanlovi bo'lishi mumkin —
  // bu holda butun matndan viloyat/shahar/tuman izlaymiz (Russian Taobao'da region keyingi qatorda)
  const haystack = norm(detected) + ' ' + norm(fullText);
  const okProv = haystack.includes(norm(tpl.province));
  const okCity = haystack.includes(norm(tpl.city));
  const okDist = haystack.includes(norm(tpl.district));
  if (okProv && okCity && okDist) return { kind: 'ok', action: "To'g'ri tanlangan", payload: '' };
  if (!detected) return { kind: 'fill', action: "Hudud tanlanmagan — tanlang:", payload: expected };
  return { kind: 'replace', action: "Hududni o'zgartiring:", payload: expected };
}

function instructAddress(detected: string, idTag: string, id: string, expected: string, tpl: ChineseAddressTemplate): { kind: InstructionKind; action: string; payload: string } {
  if (!detected) return { kind: 'fill', action: "Manzil bo'sh — yozing:", payload: expected };

  const streetOnly = tpl.detailedAddress
    .replace(ID_PLACEHOLDER_RE, '')
    .replace(/077\s*[库厍]?\s*房\s*[\/\\／＼]?\s*号?/g, '')
    .trim();
  const nDet = norm(detected);
  const hasStreet = streetOnly && nDet.includes(norm(streetOnly));

  const m = detected.match(/077\s*[库厍]?\s*房\s*[\/\\／＼:号]?\s*(\d{4,8})/);
  const detectedId = m?.[1] ?? '';
  const hasIdTag = !!detectedId && (!id || detectedId === id);

  if (hasStreet && hasIdTag) return { kind: 'ok', action: "To'g'ri yozilgan", payload: '' };

  if (hasStreet && !detectedId) {
    return {
      kind: 'add',
      action: "Manzil oxiriga shuni qo'shing:",
      payload: idTag || '077库房/<ID>号',
    };
  }
  if (hasStreet && detectedId && id && detectedId !== id) {
    return {
      kind: 'replace',
      action: `Manzil oxiridagi ID xato (${detectedId}). Almashtiring:`,
      payload: idTag,
    };
  }
  // Ko'cha noto'g'ri
  return {
    kind: 'replace',
    action: "Ko'cha noto'g'ri. To'liq manzilni almashtiring:",
    payload: expected,
  };
}

function instructPostal(detected: string, expected: string): { kind: InstructionKind; action: string; payload: string } {
  if (!detected) {
    return { kind: 'optional-empty', action: "Ilovangiz so'ramagan — OK", payload: '' };
  }
  const eDigits = expected.replace(/\D/g, '');
  const dDigits = detected.replace(/\D/g, '');
  if (dDigits === eDigits) return { kind: 'ok', action: "To'g'ri", payload: '' };
  return { kind: 'replace', action: "Pochta indeksini almashtiring:", payload: expected };
}

function buildChecks(tpl: ChineseAddressTemplate, id: string, ex: Extracted, platform: Platform, fullText: string): FieldCheck[] {
  const idTag = id ? `077库房/${id}号` : '';
  const expectedRecipient = recipientExpected(platform, id);
  const expectedRegion = `${tpl.province} ${tpl.city} ${tpl.district}`;
  const expectedAddress = renderForUi(tpl.detailedAddress, id);

  const r = instructRecipient(ex.recipientName, id, platform);
  const p = instructPhone(ex.phone, tpl.phone);
  const g = instructRegion(ex.region, tpl, fullText);
  const a = instructAddress(ex.address, idTag, id, expectedAddress, tpl);
  const z = instructPostal(ex.postalCode, tpl.postalCode);

  return [
    { key: 'recipientName', zh: '收货人', label: 'Qabul qiluvchi', expected: expectedRecipient, detected: ex.recipientName, ...r },
    { key: 'phone',         zh: '手机号', label: 'Telefon',         expected: tpl.phone,         detected: ex.phone,         ...p },
    { key: 'region',        zh: '所在地区', label: 'Hudud',          expected: expectedRegion,    detected: ex.region,        ...g },
    { key: 'address',       zh: '详细地址', label: "To'liq manzil",   expected: expectedAddress,   detected: ex.address,       ...a },
    { key: 'postalCode',    zh: '邮编',   label: 'Pochta indeksi',  expected: tpl.postalCode,    detected: ex.postalCode,    ...z },
  ];
}

// ============================================================

export default function Check() {
  const { settings } = useApp();
  const tpl: ChineseAddressTemplate = settings?.chineseAddress ?? DEFAULT_CHINESE_ADDRESS;

  const [image, setImage] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [ocrText, setOcrText] = useState('');
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrLines, setOcrLines] = useState<OcrLineData[]>([]);
  const [imgNatural, setImgNatural] = useState<{ w: number; h: number }>({ w: 0, h: 0 });

  const fileRef = useRef<HTMLInputElement | null>(null);
  const cameraRef = useRef<HTMLInputElement | null>(null);
  const resultRef = useRef<HTMLDivElement | null>(null);

  // Tesseract worker — sahifa ochilishi bilan oldindan yuklanadi
  const workerRef = useRef<any>(null);
  const [workerReady, setWorkerReady] = useState(false);
  const [workerLoading, setWorkerLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const T: any = await import('tesseract.js');
        const create = T.createWorker || T.default?.createWorker;
        if (!create) throw new Error('createWorker not found');
        const worker = await create('chi_sim+eng', 1, {
          logger: (m: { status: string; progress?: number }) => {
            if (m.status === 'recognizing text' && typeof m.progress === 'number') {
              setOcrProgress(Math.round(m.progress * 100));
            }
          },
        });
        if (cancelled) {
          try { await worker.terminate(); } catch {}
          return;
        }
        workerRef.current = worker;
        setWorkerReady(true);
      } catch (e) {
        console.error('Tesseract preload failed', e);
      } finally {
        if (!cancelled) setWorkerLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      if (workerRef.current) {
        try { workerRef.current.terminate(); } catch {}
      }
    };
  }, []);

  useEffect(() => {
    document.title = 'Xitoy manzilini tekshirish — iPOST';
  }, []);

  async function runOcr(imgDataUrl: string) {
    setOcrText('');
    setOcrLines([]);
    setOcrProgress(0);
    try {
      let text = '';
      let lines: OcrLineData[] = [];
      let rawData: any = null;
      if (workerRef.current && workerReady) {
        const { data } = await workerRef.current.recognize(imgDataUrl);
        rawData = data;
      } else {
        const T: any = await import('tesseract.js');
        const rec = T.recognize || T.default?.recognize;
        const { data } = await rec(imgDataUrl, 'chi_sim+eng', {
          logger: (m: any) => {
            if (m.status === 'recognizing text' && typeof m.progress === 'number') {
              setOcrProgress(Math.round(m.progress * 100));
            }
          },
        });
        rawData = data;
      }
      text = rawData?.text || '';
      if (Array.isArray(rawData?.lines)) {
        lines = rawData.lines
          .filter((l: any) => l?.text && l?.bbox)
          .map((l: any) => ({ text: String(l.text).trim(), bbox: l.bbox }));
      }
      setOcrText(text);
      setOcrLines(lines);
      const detected = detectIdFromText(text);
      if (detected && !customerId) {
        setCustomerId(detected);
        toast.success(`ID aniqlandi: ${detected}`);
      }
    } catch (e) {
      console.error(e);
      toast.error("Skanerlashda xato. Qaytadan urinib ko'ring.");
    }
  }

  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) {
      toast.error('Iltimos, rasm tanlang');
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      setImage(dataUrl);
      setScanned(false);
      setScanning(true);
      await runOcr(dataUrl);
      setScanning(false);
      setScanned(true);
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    };
    reader.readAsDataURL(file);
  }

  function reset() {
    setImage(null);
    setScanning(false);
    setScanned(false);
    setOcrText('');
    setOcrProgress(0);
  }

  const idValid = /^\d{4,8}$/.test(customerId.trim()) && customerId.trim() !== tpl.postalCode;
  const effectiveId = idValid ? customerId.trim() : '';

  const platform: Platform = scanned ? detectPlatform(ocrText) : 'unknown';
  const extracted = extractFields(ocrText);
  const checks = scanned ? buildChecks(tpl, effectiveId, extracted, platform, ocrText) : [];
  const wrongCount = checks.filter((c) => c.kind !== 'ok' && c.kind !== 'optional-empty').length;
  const allOk = scanned && checks.length > 0 && wrongCount === 0;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#05070d] text-slate-800 dark:text-slate-100">
      <style>{`
        @keyframes lens-scan {
          0%   { top: 0%; opacity: 0; }
          8%   { opacity: 1; }
          92%  { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        .lens-scan-line {
          position: absolute; left: 0; right: 0; height: 3px;
          background: linear-gradient(90deg, transparent, #22d3ee 20%, #38bdf8 50%, #22d3ee 80%, transparent);
          box-shadow: 0 0 24px 8px rgba(56,189,248,0.55);
          animation: lens-scan 1.6s ease-in-out infinite;
          pointer-events: none;
        }
        .lens-corner {
          position: absolute; width: 22px; height: 22px;
          border: 3px solid #38bdf8;
        }
        .lens-corner.tl { top: 6px; left: 6px; border-right: none; border-bottom: none; border-top-left-radius: 6px; }
        .lens-corner.tr { top: 6px; right: 6px; border-left: none; border-bottom: none; border-top-right-radius: 6px; }
        .lens-corner.bl { bottom: 6px; left: 6px; border-right: none; border-top: none; border-bottom-left-radius: 6px; }
        .lens-corner.br { bottom: 6px; right: 6px; border-left: none; border-top: none; border-bottom-right-radius: 6px; }
        @keyframes lens-pop {
          from { opacity: 0; transform: translateY(6px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .lens-pop { animation: lens-pop 0.25s ease-out both; }
      `}</style>

      <header className="bg-gradient-to-r from-brand-600 to-brand-700 text-white px-4 py-5 shadow-md">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-white/15 flex items-center justify-center text-2xl">🧐</div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg md:text-xl font-bold">Xitoy manzilingizni tekshiring</h1>
            <p className="text-xs text-white/80">1688 · Taobao · Pinduoduo · Poizon</p>
          </div>
          {workerLoading && (
            <div className="text-[10px] text-white/70 inline-flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" /> Skaner tayyorlanmoqda
            </div>
          )}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-4 md:py-6 space-y-4">
        {/* ID INPUT */}
        <div className="card p-4">
          <label className="block">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-bold">iPOST mijoz ID raqamingiz</span>
              {idValid && <span className="text-[11px] text-emerald-600 font-semibold inline-flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> OK</span>}
            </div>
            <input
              type="text"
              inputMode="numeric"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value.replace(/\D/g, '').slice(0, 8))}
              placeholder="111982"
              className={`w-full text-center font-mono text-2xl font-bold tracking-widest py-3 rounded-2xl border-2 outline-none transition ${
                idValid
                  ? 'border-emerald-400 bg-emerald-50/40 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300'
                  : customerId
                    ? 'border-amber-300 bg-amber-50/40 dark:bg-amber-900/20'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'
              }`}
            />
          </label>
          <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
            6 xonali son (masalan <code className="px-1 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-mono">111982</code>).
            Rasm yuklasangiz — avtomatik aniqlanadi. <b>{tpl.postalCode}</b> pochta indeksi, ID emas.
          </p>
        </div>

        {/* UPLOAD or IMAGE */}
        {!image ? (
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-2">
              <ScanLine className="h-4 w-4 text-brand-600" />
              <h2 className="font-bold text-sm">Saqlangan manzilingiz suratini yuklang</h2>
            </div>
            <p className="text-[11px] text-slate-500 mb-3 leading-relaxed">
              Pinduoduo / Taobao / 1688 / Poizon ilovasida saqlangan manzil oynasining suratini oling —
              4 ta qatori (收货人, 手机号, 地区, 详细地址) ko'rinib tursin.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => cameraRef.current?.click()}
                className="rounded-2xl border-2 border-dashed border-emerald-300 bg-emerald-50/40 dark:bg-emerald-900/10 py-6 flex flex-col items-center justify-center gap-2 hover:bg-emerald-50 active:scale-[0.98] transition"
              >
                <Camera className="h-8 w-8 text-emerald-600" />
                <div className="text-emerald-700 dark:text-emerald-300 font-bold text-sm">Kamera</div>
              </button>
              <button
                onClick={() => fileRef.current?.click()}
                className="rounded-2xl border-2 border-dashed border-brand-300 bg-brand-50/40 dark:bg-brand-900/10 py-6 flex flex-col items-center justify-center gap-2 hover:bg-brand-50 active:scale-[0.98] transition"
              >
                <Upload className="h-8 w-8 text-brand-500" />
                <div className="text-brand-700 dark:text-brand-300 font-bold text-sm">Fayl</div>
              </button>
            </div>
            <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f); e.target.value = ''; }} />
            <input ref={fileRef} type="file" accept="image/*" hidden
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f); e.target.value = ''; }} />
          </div>
        ) : (
          <>
            <div className="card p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="text-[11px] uppercase tracking-wider text-slate-500 font-bold inline-flex items-center gap-2 flex-wrap">
                  {scanning ? (
                    <><ScanLine className="h-3 w-3 text-brand-500 animate-pulse" /> Skanerlanmoqda... {ocrProgress > 0 ? `${ocrProgress}%` : ''}</>
                  ) : (
                    <>
                      <span className="inline-flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-emerald-500" /> Skanerlandi</span>
                      {platform !== 'unknown' && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300 normal-case tracking-normal">
                          {PLATFORM_LABEL[platform]}
                        </span>
                      )}
                    </>
                  )}
                </div>
                <button onClick={reset} className="text-[11px] inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200">
                  <RefreshCcw className="h-3 w-3" /> Boshqa rasm
                </button>
              </div>
              <div className="relative rounded-xl overflow-hidden bg-slate-900">
                <img
                  src={image}
                  alt="Yuklangan manzil"
                  className="w-full h-auto block"
                  onLoad={(e) => {
                    const img = e.currentTarget;
                    setImgNatural({ w: img.naturalWidth, h: img.naturalHeight });
                  }}
                />
                {scanning && (
                  <>
                    <span className="lens-corner tl" />
                    <span className="lens-corner tr" />
                    <span className="lens-corner bl" />
                    <span className="lens-corner br" />
                    <div className="lens-scan-line" />
                  </>
                )}
                {scanned && ocrLines.length > 0 && imgNatural.w > 0 && (
                  <ImageAnnotations
                    checks={checks}
                    lines={ocrLines}
                    natural={imgNatural}
                  />
                )}
              </div>
              {scanned && (
                <div className="mt-2 text-center text-[11px] text-slate-500 inline-flex items-center justify-center w-full gap-1">
                  <ArrowDown className="h-3 w-3 animate-bounce" /> Natijani ko'ring
                </div>
              )}
            </div>

            {scanned && (
              <>
                {/* OCR'dan o'qilgan qatorlar — toza ko'rinishda */}
                <div ref={resultRef} className="card p-4 lens-pop">
                  <div className="flex items-center gap-2 mb-2">
                    <Eye className="h-4 w-4 text-brand-600" />
                    <h3 className="font-bold text-sm">Rasmdan o'qildi</h3>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <OcrLine zh="收货人" label="Qabul qiluvchi" value={extracted.recipientName} />
                    <OcrLine zh="手机号" label="Telefon" value={extracted.phone} />
                    <OcrLine zh="所在地区" label="Hudud" value={extracted.region} />
                    <OcrLine zh="详细地址" label="Manzil" value={extracted.address} />
                    {extracted.postalCode && <OcrLine zh="邮编" label="Pochta" value={extracted.postalCode} />}
                  </div>
                </div>

                {/* XULOSA */}
                <div className={`card p-4 lens-pop border-2 ${allOk ? 'border-emerald-400 bg-emerald-50/40 dark:bg-emerald-900/20' : 'border-rose-400 bg-rose-50/40 dark:bg-rose-900/20'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    {allOk ? (
                      <><CheckCircle2 className="h-5 w-5 text-emerald-500" /><h3 className="font-bold text-sm text-emerald-700 dark:text-emerald-300">Hammasi to'g'ri!</h3></>
                    ) : (
                      <><AlertTriangle className="h-5 w-5 text-rose-500" /><h3 className="font-bold text-sm text-rose-700 dark:text-rose-300">{wrongCount} ta xato bor</h3></>
                    )}
                  </div>
                  {!effectiveId && (
                    <div className="mb-2 p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-[11px] text-amber-800 dark:text-amber-200 flex items-start gap-2">
                      <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                      <span>Yuqorida ID raqamingizni kiriting — manzilning to'g'ri qiymatlari hisoblanadi.</span>
                    </div>
                  )}
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 mb-2">
                    {allOk ? "Manzilingiz to'g'ri — buyurtma bering!" : "Quyidagi xatolarni tuzating va saqlang."}
                  </p>
                </div>

                {/* TAQQOSLASH — har bir maydon */}
                <div className="card p-4 lens-pop">
                  <h3 className="font-bold text-sm mb-2">Maydonlar bo'yicha tahlil</h3>
                  <div className="space-y-2">
                    {checks.map((c) => (
                      <FieldRow key={c.key} check={c} />
                    ))}
                  </div>
                </div>

                {tpl.notes && (
                  <div className="rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3 text-[11px] text-amber-800 dark:text-amber-200 flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <div>{tpl.notes}</div>
                  </div>
                )}
              </>
            )}
          </>
        )}

        <footer className="text-center text-[11px] text-slate-400 pt-3 pb-2">
          iPOST Cargo — manzil tekshirish xizmati
        </footer>
      </main>
    </div>
  );
}

function OcrLine({ zh, label, value }: { zh: string; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 flex items-start gap-2 bg-white dark:bg-slate-900">
      <div className="flex flex-col flex-shrink-0 w-20">
        <span className="text-[10px] uppercase tracking-wider text-brand-600 font-bold">{zh}</span>
        <span className="text-[9px] text-slate-400">{label}</span>
      </div>
      <div className="flex-1 min-w-0 font-mono break-words text-slate-800 dark:text-slate-100">
        {value || <span className="text-slate-400 italic font-sans">(topilmadi)</span>}
      </div>
    </div>
  );
}

function FieldRow({ check }: { check: FieldCheck }) {
  const c = check;
  const isOk = c.kind === 'ok' || c.kind === 'optional-empty';

  const bg = isOk
    ? c.kind === 'optional-empty'
      ? 'border-slate-200 dark:border-slate-700 bg-slate-50/40 dark:bg-slate-800/40'
      : 'border-emerald-300 bg-emerald-50/50 dark:bg-emerald-900/10'
    : c.kind === 'add'
      ? 'border-sky-300 bg-sky-50/60 dark:bg-sky-900/10'
      : c.kind === 'fill'
        ? 'border-amber-300 bg-amber-50/60 dark:bg-amber-900/10'
        : 'border-rose-300 bg-rose-50/60 dark:bg-rose-900/10';

  const kindBadge =
    c.kind === 'ok' ? null
    : c.kind === 'optional-empty' ? null
    : c.kind === 'add' ? { label: "QO'SHING", cls: 'bg-sky-500' }
    : c.kind === 'fill' ? { label: 'YOZING', cls: 'bg-amber-500' }
    : { label: 'ALMASHTIRING', cls: 'bg-rose-500' };

  const icon = isOk
    ? <CheckCircle2 className={`h-4 w-4 ${c.kind === 'optional-empty' ? 'text-slate-400' : 'text-emerald-500'}`} />
    : <AlertTriangle className="h-4 w-4 text-rose-500" />;

  return (
    <div className={`rounded-xl border p-2.5 ${bg}`}>
      <div className="flex items-start gap-2">
        <div className="flex-shrink-0 mt-0.5">{icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] uppercase tracking-wider text-brand-600 font-bold">{c.zh}</span>
            <span className="text-[11px] font-semibold">{c.label}</span>
            {kindBadge && (
              <span className={`text-[9px] uppercase tracking-wider text-white px-1.5 py-0.5 rounded font-bold ${kindBadge.cls}`}>
                {kindBadge.label}
              </span>
            )}
          </div>
          {c.detected && (
            <div className="font-mono text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 break-words">
              <span className="text-[10px] mr-1">Hozir:</span>
              <span className={c.kind === 'replace' ? 'line-through' : ''}>{c.detected}</span>
            </div>
          )}
          <div className={`text-[12px] mt-0.5 font-semibold ${
            c.kind === 'ok' ? 'text-emerald-600'
            : c.kind === 'optional-empty' ? 'text-slate-500'
            : c.kind === 'add' ? 'text-sky-700 dark:text-sky-300'
            : c.kind === 'fill' ? 'text-amber-700 dark:text-amber-300'
            : 'text-rose-700 dark:text-rose-300'
          }`}>
            {c.action}
          </div>
          {c.payload && (
            <div className="font-mono text-[12px] mt-1 break-words font-bold p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100">
              {c.payload}
            </div>
          )}
        </div>
        {c.payload && (
          <button
            onClick={() => copyText(c.payload)}
            className="flex-shrink-0 p-1.5 rounded-lg bg-brand-50 hover:bg-brand-100 text-brand-600"
            title="Nusxalash"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

// Rasm ustida — har bir muammoli maydon yoniga rangli badge
function ImageAnnotations({
  checks,
  lines,
  natural,
}: {
  checks: FieldCheck[];
  lines: OcrLineData[];
  natural: { w: number; h: number };
}) {
  const KW: Record<FieldKey, string[]> = {
    recipientName: ['收货人', '收件人', '联系人', 'Имя'],
    phone: ['手机号', '电话', '联系电话', 'телефон'],
    region: ['所在地区', '地区', '区域', 'Регион'],
    address: ['详细地址', '小区楼栋', '街道地址', 'Адрес', '地址'],
    postalCode: ['邮编', '邮政编码', 'индекс'],
  };
  return (
    <>
      {checks.map((c) => {
        if (c.kind === 'ok' || c.kind === 'optional-empty') return null;
        const bbox = findFieldBbox(lines, KW[c.key]);
        if (!bbox || !natural.w || !natural.h) return null;
        const top = (bbox.y0 / natural.h) * 100;
        const height = ((bbox.y1 - bbox.y0) / natural.h) * 100;
        const color =
          c.kind === 'add' ? 'border-sky-400 bg-sky-500/15'
          : c.kind === 'fill' ? 'border-amber-400 bg-amber-500/15'
          : 'border-rose-400 bg-rose-500/15';
        const badgeColor =
          c.kind === 'add' ? 'bg-sky-500'
          : c.kind === 'fill' ? 'bg-amber-500'
          : 'bg-rose-500';
        const badgeLabel =
          c.kind === 'add' ? "QO'SHING"
          : c.kind === 'fill' ? 'YOZING' : 'ALMASHTIRING';
        return (
          <div
            key={c.key}
            className={`absolute left-0 right-0 border-2 ${color} pointer-events-none`}
            style={{ top: `${top}%`, height: `${Math.max(height, 4)}%` }}
          >
            <span className={`absolute -top-3 left-2 text-[9px] font-bold text-white px-1.5 py-0.5 rounded ${badgeColor} shadow-lg`}>
              {c.zh} · {badgeLabel}
            </span>
          </div>
        );
      })}
    </>
  );
}
