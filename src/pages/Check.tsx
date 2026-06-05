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

function fillId(text: string, id: string): string {
  if (!text) return '';
  return text.split(ADDRESS_ID_PLACEHOLDER).join(id || ADDRESS_ID_PLACEHOLDER);
}

// Belgilarni normallashtirish — taqqoslash uchun bo'shliq/tinish belgilarini olib tashlaydi
function norm(s: string): string {
  return (s || '')
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[(),，。．．:：;；、（）\[\]【】「」｜|\-—_·.]/g, '');
}

// Xitoy keyword'idan keyingi matnni qidirib olish (qator yoki ikki nuqtali shaklda)
function findAfter(ocrText: string, ...keywords: string[]): string {
  const lines = ocrText.split('\n');
  for (const kw of keywords) {
    for (const raw of lines) {
      const line = raw.trim();
      if (!line) continue;
      const idx = line.indexOf(kw);
      if (idx === -1) continue;
      let rest = line.slice(idx + kw.length).trim();
      // ":" yoki shunga o'xshashlarni kesib tashlash
      rest = rest.replace(/^[:：\-—\s]+/, '').trim();
      if (rest) return rest;
      // Keyingi qatorda bo'lishi mumkin
      const nextIdx = lines.indexOf(raw) + 1;
      if (nextIdx < lines.length) {
        const next = lines[nextIdx]?.trim();
        if (next) return next;
      }
    }
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

function extractFields(ocrText: string): Extracted {
  return {
    recipientName: findAfter(ocrText, '收货人', '收件人'),
    phone: findAfter(ocrText, '手机号', '电话', '联系电话'),
    region: findAfter(ocrText, '所在地区', '地区', '区域'),
    address: findAfter(ocrText, '详细地址', '街道地址', '地址'),
    postalCode: findAfter(ocrText, '邮编', '邮政编码'),
  };
}

type FieldKey = 'recipientName' | 'phone' | 'region' | 'address' | 'postalCode';

interface FieldCheck {
  key: FieldKey;
  zh: string;
  label: string;
  expected: string;        // mijoz nima yozishi kerak
  detected: string;        // OCR rasmdan topgan matn
  status: 'ok' | 'missing' | 'wrong' | 'optional-skipped';
  hint: string;
}

function buildChecks(tpl: ChineseAddressTemplate, id: string, ex: Extracted): FieldCheck[] {
  const idTag = id ? `077库房/${id}号` : '';
  const expectedRecipient = fillId(tpl.recipientName, id);
  const expectedRegion = `${tpl.province} ${tpl.city} ${tpl.district}`;
  const expectedAddress = fillId(tpl.detailedAddress, id);

  const checks: FieldCheck[] = [];

  // 1) 收货人 — 077库房/{ID}号 namunasini o'z ichiga olishi shart
  {
    const nDetected = norm(ex.recipientName);
    const ok = id && idTag && nDetected.includes(norm(idTag));
    checks.push({
      key: 'recipientName',
      zh: '收货人',
      label: 'Qabul qiluvchi',
      expected: expectedRecipient,
      detected: ex.recipientName,
      status: !ex.recipientName ? 'missing' : ok ? 'ok' : 'wrong',
      hint: !ex.recipientName
        ? 'Bu maydon topilmadi'
        : ok
          ? "To'g'ri"
          : `Bu yerga shuni yozing: ${expectedRecipient}`,
    });
  }

  // 2) 手机号 — telefon raqami aynan mos kelishi kerak
  {
    const dDigits = ex.phone.replace(/\D/g, '');
    const eDigits = tpl.phone.replace(/\D/g, '');
    const ok = dDigits === eDigits;
    checks.push({
      key: 'phone',
      zh: '手机号',
      label: 'Telefon',
      expected: tpl.phone,
      detected: ex.phone,
      status: !ex.phone ? 'missing' : ok ? 'ok' : 'wrong',
      hint: !ex.phone ? 'Telefon topilmadi' : ok ? "To'g'ri" : `Telefon: ${tpl.phone}`,
    });
  }

  // 3) 地区 — 浙江省 金华市 义乌市
  {
    const n = norm(ex.region);
    const ok = n.includes(norm(tpl.province)) && n.includes(norm(tpl.city)) && n.includes(norm(tpl.district));
    checks.push({
      key: 'region',
      zh: '所在地区',
      label: 'Hudud',
      expected: expectedRegion,
      detected: ex.region,
      status: !ex.region ? 'missing' : ok ? 'ok' : 'wrong',
      hint: !ex.region ? 'Hudud topilmadi' : ok ? "To'g'ri" : `Hudud: ${expectedRegion}`,
    });
  }

  // 4) 详细地址 — ko'cha + 077库房/{ID}号 ham bo'lishi shart
  {
    const nDetected = norm(ex.address);
    const hasStreet = nDetected.includes(norm(tpl.detailedAddress.replace(ADDRESS_ID_PLACEHOLDER, '').replace('077库房/号', '').trim()));
    const hasIdTag = id && idTag && nDetected.includes(norm(idTag));
    const ok = hasStreet && hasIdTag;
    let hint = "To'g'ri";
    if (!ex.address) hint = "Manzil topilmadi";
    else if (!hasStreet) hint = `Ko'cha noto'g'ri. To'g'risi: ${expectedAddress}`;
    else if (!hasIdTag) hint = `Manzilning oxiriga ${idTag || '077库房/(ID)号'} qo'shing!`;
    checks.push({
      key: 'address',
      zh: '详细地址',
      label: "To'liq manzil",
      expected: expectedAddress,
      detected: ex.address,
      status: !ex.address ? 'missing' : ok ? 'ok' : 'wrong',
      hint,
    });
  }

  // 5) 邮编 — IXTIYORIY. Agar bo'lsa, 322000 bo'lishi kerak
  {
    const dDigits = ex.postalCode.replace(/\D/g, '');
    const eDigits = tpl.postalCode.replace(/\D/g, '');
    if (!ex.postalCode) {
      checks.push({
        key: 'postalCode',
        zh: '邮编',
        label: 'Pochta indeksi',
        expected: tpl.postalCode,
        detected: '',
        status: 'optional-skipped',
        hint: 'Ilovangiz so\'ramagan — OK',
      });
    } else {
      const ok = dDigits === eDigits;
      checks.push({
        key: 'postalCode',
        zh: '邮编',
        label: 'Pochta indeksi',
        expected: tpl.postalCode,
        detected: ex.postalCode,
        status: ok ? 'ok' : 'wrong',
        hint: ok ? "To'g'ri" : `Pochta: ${tpl.postalCode}`,
      });
    }
  }

  return checks;
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
    setOcrProgress(0);
    try {
      let text = '';
      if (workerRef.current && workerReady) {
        const { data } = await workerRef.current.recognize(imgDataUrl);
        text = data.text || '';
      } else {
        // Worker hali tayyor emas — fallback bir martalik
        const T: any = await import('tesseract.js');
        const rec = T.recognize || T.default?.recognize;
        const { data } = await rec(imgDataUrl, 'chi_sim+eng', {
          logger: (m: any) => {
            if (m.status === 'recognizing text' && typeof m.progress === 'number') {
              setOcrProgress(Math.round(m.progress * 100));
            }
          },
        });
        text = data.text || '';
      }
      setOcrText(text);
      // ID ni avto-aniqlash
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

  const extracted = extractFields(ocrText);
  const checks = scanned ? buildChecks(tpl, effectiveId, extracted) : [];
  const wrongCount = checks.filter((c) => c.status === 'wrong' || c.status === 'missing').length;
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
                <div className="text-[11px] uppercase tracking-wider text-slate-500 font-bold inline-flex items-center gap-1">
                  {scanning ? (
                    <><ScanLine className="h-3 w-3 text-brand-500 animate-pulse" /> Skanerlanmoqda... {ocrProgress > 0 ? `${ocrProgress}%` : ''}</>
                  ) : (
                    <><CheckCircle2 className="h-3 w-3 text-emerald-500" /> Skanerlandi</>
                  )}
                </div>
                <button onClick={reset} className="text-[11px] inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200">
                  <RefreshCcw className="h-3 w-3" /> Boshqa rasm
                </button>
              </div>
              <div className="relative rounded-xl overflow-hidden bg-slate-900">
                <img src={image} alt="Yuklangan manzil" className="w-full h-auto block" />
                {scanning && (
                  <>
                    <span className="lens-corner tl" />
                    <span className="lens-corner tr" />
                    <span className="lens-corner bl" />
                    <span className="lens-corner br" />
                    <div className="lens-scan-line" />
                  </>
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
                      <FieldRow key={c.key} check={c} effectiveId={effectiveId} />
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

function FieldRow({ check, effectiveId }: { check: FieldCheck; effectiveId: string }) {
  const c = check;
  const bg =
    c.status === 'ok' ? 'border-emerald-300 bg-emerald-50/50 dark:bg-emerald-900/10'
    : c.status === 'optional-skipped' ? 'border-slate-200 dark:border-slate-700 bg-slate-50/40 dark:bg-slate-800/40'
    : 'border-rose-300 bg-rose-50/50 dark:bg-rose-900/10';

  const icon =
    c.status === 'ok' ? <CheckCircle2 className="h-4 w-4 text-emerald-500" />
    : c.status === 'optional-skipped' ? <CheckCircle2 className="h-4 w-4 text-slate-400" />
    : <AlertTriangle className="h-4 w-4 text-rose-500" />;

  const showExpected = c.status !== 'optional-skipped' && (c.status === 'wrong' || c.status === 'missing');

  return (
    <div className={`rounded-xl border p-2.5 ${bg}`}>
      <div className="flex items-start gap-2">
        <div className="flex-shrink-0 mt-0.5">{icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] uppercase tracking-wider text-brand-600 font-bold">{c.zh}</span>
            <span className="text-[11px] font-semibold">{c.label}</span>
          </div>
          {c.detected && (
            <div className="font-mono text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 break-words">
              <span className="text-[10px] text-slate-400 mr-1">Topildi:</span>
              {c.detected}
            </div>
          )}
          {showExpected && c.expected && (
            <div className="font-mono text-[11px] text-emerald-700 dark:text-emerald-300 mt-0.5 break-words font-semibold">
              <span className="text-[10px] text-emerald-600 mr-1">Bo'lishi kerak:</span>
              {effectiveId ? c.expected : c.expected.replace(/\{ID\}/g, '___')}
            </div>
          )}
          <div className={`text-[11px] mt-0.5 ${
            c.status === 'ok' ? 'text-emerald-600'
            : c.status === 'optional-skipped' ? 'text-slate-500'
            : 'text-rose-600 font-semibold'
          }`}>
            {c.hint}
          </div>
        </div>
        {showExpected && c.expected && (
          <button
            onClick={() => copyText(c.expected)}
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
