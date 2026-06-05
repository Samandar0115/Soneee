import { useEffect, useRef, useState } from 'react';
import {
  Upload, CheckCircle2, AlertTriangle, Copy, Download,
  Camera, Loader2, ScanText, Lightbulb, RefreshCcw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useApp } from '../context/AppContext';
import { compressImageDataUrl } from '../utils/image';
import { ADDRESS_ID_PLACEHOLDER, type ChineseAddressTemplate } from '../types';

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

function norm(s: string): string {
  return (s || '').toLowerCase().replace(/\s+/g, '').replace(/[，,。．\.：:；;]/g, '');
}

function contains(haystack: string, needle: string): boolean {
  if (!needle.trim()) return true;
  return norm(haystack).includes(norm(needle));
}

// OCR matnidan mijoz ID ni avtomatik aniqlash
// Qoidalar:
//  - 6 xonali son
//  - postal code emas
//  - telefon raqami ichidagi qism emas
function detectCustomerId(ocrText: string, tpl: ChineseAddressTemplate): string | null {
  if (!ocrText) return null;
  const phoneDigits = (tpl.phone || '').replace(/\D/g, '');
  const postal = (tpl.postalCode || '').replace(/\D/g, '');
  // Barcha 6 xonali sonlarni topish
  const matches = ocrText.match(/\b\d{6}\b/g) ?? [];
  // Telefon raqami ichidan ham 6 xonali kesimlar bo'lishi mumkin — qo'shimcha skanerlash
  const all6 = new Set<string>(matches);
  // Yana — har bir uzun raqam zanjirini scan qilamiz, lekin telefon raqamiga to'liq tegishli bo'lganlarni chiqarib tashlaymiz
  for (const m of (ocrText.match(/\d{6,}/g) ?? [])) {
    // 6 xonali ichki kesimlarni emas — faqat to'liq 6 ta raqam bo'lsa olamiz
    if (m.length === 6) all6.add(m);
  }
  const candidates: string[] = [];
  for (const n of all6) {
    if (n === postal) continue;                       // postal code
    if (phoneDigits && phoneDigits.includes(n)) continue; // telefon ichi
    candidates.push(n);
  }
  // Eng birinchisini qaytaramiz
  return candidates[0] ?? null;
}

type FieldKey = 'recipientName' | 'phone' | 'address' | 'postalCode' | 'id';
type FieldStatus = 'pending' | 'ok' | 'missing';
interface FieldResult {
  key: FieldKey;
  label: string;
  zh: string;
  expected: string;
  status: FieldStatus;
  hint?: string;
}

function buildResults(tpl: ChineseAddressTemplate, customerId: string, ocrText: string): FieldResult[] {
  const id = customerId.trim();
  const fields = [
    { key: 'recipientName' as const, label: 'Qabul qiluvchi', zh: '收货人', expected: fillId(tpl.recipientName, id) },
    { key: 'phone' as const, label: 'Telefon', zh: '手机号', expected: tpl.phone },
    { key: 'address' as const, label: "To'liq manzil", zh: '详细地址', expected: `${tpl.province} ${tpl.city} ${tpl.district} ${fillId(tpl.detailedAddress, id)}` },
    { key: 'postalCode' as const, label: 'Pochta indeksi', zh: '邮编', expected: tpl.postalCode },
    { key: 'id' as const, label: 'Mijoz ID', zh: 'ID', expected: id || '(aniqlanmagan)' },
  ];
  if (!ocrText) {
    return fields.map((f) => ({ ...f, status: 'pending' as FieldStatus }));
  }
  return fields.map((f) => {
    if (f.key === 'id') {
      if (!id) return { ...f, status: 'missing' as FieldStatus, hint: 'Rasmdan mijoz ID aniqlanmadi' };
      return { ...f, status: contains(ocrText, id) ? 'ok' as FieldStatus : 'missing' as FieldStatus,
        hint: contains(ocrText, id) ? 'Sizning ID rasmda topildi' : 'ID rasmda topilmadi — manzilga qo\'shing' };
    }
    const ok = contains(ocrText, f.expected);
    return { ...f, status: ok ? 'ok' as FieldStatus : 'missing' as FieldStatus,
      hint: ok ? "To'g'ri yozilgan" : "Bu maydon yo'q yoki noto'g'ri" };
  });
}

export default function Check() {
  const { settings } = useApp();
  const tpl: ChineseAddressTemplate | undefined = settings.chineseAddress;

  const [image, setImage] = useState<string | null>(null);
  const [ocrText, setOcrText] = useState<string>('');
  const [ocrBusy, setOcrBusy] = useState(false);
  const [ocrProgress, setOcrProgress] = useState<number>(0);
  const [detectedId, setDetectedId] = useState<string>('');
  const [manualId, setManualId] = useState<string>('');
  const [manualChecks, setManualChecks] = useState<Record<string, boolean | null>>({});

  const fileRef = useRef<HTMLInputElement | null>(null);
  const cameraRef = useRef<HTMLInputElement | null>(null);

  const effectiveId = (manualId.trim() || detectedId).trim();

  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) {
      toast.error('Iltimos, rasm tanlang');
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const compressed = await compressImageDataUrl(reader.result as string, { maxDim: 1600, quality: 0.9 });
        setImage(compressed);
        if (tpl) await runOcr(compressed);
      } catch {
        setImage(reader.result as string);
      }
    };
    reader.readAsDataURL(file);
  }

  async function runOcr(imgDataUrl: string) {
    if (!tpl) return;
    setOcrBusy(true);
    setOcrProgress(0);
    setOcrText('');
    setDetectedId('');
    setManualChecks({});
    try {
      const { recognize } = await import('tesseract.js');
      const { data } = await recognize(imgDataUrl, 'chi_sim+eng', {
        logger: (m: { status: string; progress?: number }) => {
          if (m.status === 'recognizing text' && typeof m.progress === 'number') {
            setOcrProgress(Math.round(m.progress * 100));
          }
        },
      });
      const txt = data.text || '';
      setOcrText(txt);
      const id = detectCustomerId(txt, tpl);
      if (id) {
        setDetectedId(id);
        toast.success(`Mijoz ID aniqlandi: ${id}`);
      } else {
        toast('Mijoz ID aniqlanmadi — qo\'lda kiriting', { icon: '⚠️' });
      }
    } catch (err) {
      console.error(err);
      toast.error('OCR xatosi — qo\'lda tekshiring yoki ID kiriting');
    } finally {
      setOcrBusy(false);
    }
  }

  function reset() {
    setImage(null);
    setOcrText('');
    setDetectedId('');
    setManualId('');
    setManualChecks({});
  }

  function downloadImage() {
    if (!image) return;
    const a = document.createElement('a');
    a.href = image;
    a.download = `address-check-${Date.now()}.png`;
    a.click();
  }

  const baseResults = tpl ? buildResults(tpl, effectiveId, ocrText) : [];
  const finalResults: FieldResult[] = baseResults.map((r) => {
    const m = manualChecks[r.key];
    if (m === true) return { ...r, status: 'ok' as FieldStatus };
    if (m === false) return { ...r, status: 'missing' as FieldStatus };
    return r;
  });
  const missingCount = finalResults.filter((r) => r.status === 'missing').length;
  const okCount = finalResults.filter((r) => r.status === 'ok').length;
  const total = finalResults.length;
  const allOk = total > 0 && okCount === total;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#05070d] text-slate-800 dark:text-slate-100">
      {/* Header */}
      <header className="bg-gradient-to-r from-brand-600 to-brand-700 text-white px-4 py-5 shadow-md">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-white/15 flex items-center justify-center text-2xl">🧐</div>
          <div className="flex-1">
            <h1 className="text-lg md:text-xl font-bold">Xitoy manzilingizni tekshiring</h1>
            <p className="text-xs text-white/80">1688 · Taobao · Pinduoduo · Poizon</p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-5 md:py-7 space-y-4">
        {/* QO'LLANMA */}
        {tpl && (
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              <h2 className="font-bold text-sm">Bizning Xitoy manzilimiz</h2>
            </div>
            <p className="text-[11px] text-slate-500 mb-3">
              Maydonlardagi <code className="px-1 py-0.5 bg-brand-100 text-brand-700 rounded text-[10px]">{ADDRESS_ID_PLACEHOLDER}</code>
              {' '}— sizning iPOST mijoz raqamingiz (6 xonali son, masalan: 111982). Manzilingizda shu raqam doim bo'lishi shart.
            </p>
            <div className="space-y-1.5 text-xs">
              <Line zh="收货人" value={fillId(tpl.recipientName, effectiveId || ADDRESS_ID_PLACEHOLDER)} />
              <Line zh="手机号" value={tpl.phone} />
              <Line zh="详细地址" value={`${tpl.province} ${tpl.city} ${tpl.district} ${fillId(tpl.detailedAddress, effectiveId || ADDRESS_ID_PLACEHOLDER)}`} />
              <Line zh="邮编" value={tpl.postalCode} />
            </div>
          </div>
        )}

        {/* YUKLASH */}
        {!image && (
          <div className="card p-4">
            <h2 className="font-bold text-sm mb-2">Manzil oynasini yuklang</h2>
            <p className="text-[11px] text-slate-500 mb-3">
              Sayt buyurtma sahifasidagi manzil oynasini suratga oling yoki galereyadan tanlang. ID raqamingiz avtomatik aniqlanadi.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => cameraRef.current?.click()}
                className="rounded-2xl border-2 border-dashed border-emerald-300 bg-emerald-50/40 dark:bg-emerald-900/10 py-7 flex flex-col items-center justify-center gap-2 hover:bg-emerald-50 transition"
              >
                <Camera className="h-8 w-8 text-emerald-600" />
                <div className="text-emerald-700 dark:text-emerald-300 font-bold text-sm">Kamera</div>
              </button>
              <button
                onClick={() => fileRef.current?.click()}
                className="rounded-2xl border-2 border-dashed border-brand-300 bg-brand-50/40 dark:bg-brand-900/10 py-7 flex flex-col items-center justify-center gap-2 hover:bg-brand-50 transition"
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
        )}

        {/* RASM + STATUS */}
        {image && tpl && (
          <>
            <div className="card p-4">
              <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
                <h2 className="font-bold text-sm">Yuklangan rasm</h2>
                <div className="flex gap-1">
                  <button onClick={reset} className="btn-ghost text-xs">
                    <RefreshCcw className="h-3 w-3" /> Yangidan
                  </button>
                  <button onClick={downloadImage} className="btn-ghost text-xs">
                    <Download className="h-3 w-3" /> Yuklab olish
                  </button>
                </div>
              </div>

              <ImageWithBadges image={image} results={finalResults} />

              {ocrBusy && (
                <div className="mt-3 flex items-center gap-2 text-sm text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Aniqlanmoqda... {ocrProgress}%
                </div>
              )}
              {!ocrBusy && ocrText && (
                <details className="mt-3 text-xs text-slate-500">
                  <summary className="cursor-pointer hover:text-brand-600">▸ Topilgan matn (OCR)</summary>
                  <pre className="mt-2 p-3 rounded-xl bg-slate-100 dark:bg-slate-800 whitespace-pre-wrap font-mono text-[11px] max-h-40 overflow-y-auto">{ocrText}</pre>
                </details>
              )}
              {!ocrBusy && image && (
                <button onClick={() => runOcr(image)} className="btn-ghost text-xs mt-2">
                  <ScanText className="h-3 w-3" /> Qayta tahlil
                </button>
              )}
            </div>

            {/* ANIQLANGAN ID */}
            <div className="card p-4">
              <h3 className="font-bold text-sm mb-2">Mijoz ID</h3>
              <p className="text-[11px] text-slate-500 mb-2">
                6 xonali son. Avtomatik aniqlandi — agar noto'g'ri bo'lsa, qo'lda kiriting.
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                {detectedId && (
                  <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 text-emerald-700 dark:text-emerald-300 text-sm font-mono font-bold">
                    <CheckCircle2 className="h-4 w-4" />
                    Aniqlandi: {detectedId}
                  </span>
                )}
                <input
                  type="text"
                  inputMode="numeric"
                  className="input flex-1 min-w-[140px] font-mono text-lg text-center"
                  placeholder={detectedId ? "Boshqa ID kiritish..." : "ID qo'lda (masalan: 111982)"}
                  value={manualId}
                  onChange={(e) => setManualId(e.target.value.replace(/[^\d\w-]/g, '').slice(0, 12))}
                />
              </div>
              {effectiveId && (
                <div className="text-[11px] text-slate-500 mt-2">
                  Joriy ID: <b className="font-mono">{effectiveId}</b>
                </div>
              )}
            </div>

            {/* NATIJALAR */}
            <div className="card p-4">
              <h3 className="font-bold text-sm mb-2">Maydonlar tahlili</h3>
              <div className="space-y-2">
                {finalResults.map((r) => {
                  const m = manualChecks[r.key];
                  return (
                    <div
                      key={r.key}
                      className={`rounded-xl border p-3 ${
                        r.status === 'ok' ? 'border-emerald-200 bg-emerald-50/50 dark:bg-emerald-900/10'
                        : r.status === 'missing' ? 'border-rose-200 bg-rose-50/50 dark:bg-rose-900/10'
                        : 'border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          {r.status === 'ok' ? <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                          : r.status === 'missing' ? <AlertTriangle className="h-5 w-5 text-rose-500" />
                          : <Loader2 className="h-5 w-5 text-slate-400 animate-spin" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">{r.zh}</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-100 text-sm">{r.label}</span>
                          </div>
                          <div className="font-mono text-xs text-slate-700 dark:text-slate-200 mt-1 break-words">
                            {r.expected}
                          </div>
                          {r.hint && (
                            <div className={`text-[11px] mt-1 ${r.status === 'missing' ? 'text-rose-600' : 'text-slate-500'}`}>
                              {r.hint}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col gap-1 flex-shrink-0">
                          <button onClick={() => copyText(r.expected)}
                            className="p-1.5 rounded hover:bg-brand-50 text-brand-600" title="Nusxalash">
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setManualChecks({ ...manualChecks, [r.key]: m === true ? null : true })}
                            className={`p-1.5 rounded text-xs leading-none w-7 h-7 ${m === true ? 'bg-emerald-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:bg-emerald-50'}`}
                            title="To'g'ri">✓</button>
                          <button
                            onClick={() => setManualChecks({ ...manualChecks, [r.key]: m === false ? null : false })}
                            className={`p-1.5 rounded text-xs leading-none w-7 h-7 ${m === false ? 'bg-rose-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:bg-rose-50'}`}
                            title="Yo'q">✗</button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* XULOSA */}
            <div className={`card p-4 ${
              allOk ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200'
              : missingCount > 0 ? 'bg-rose-50 dark:bg-rose-900/20 border-rose-200' : ''
            }`}>
              <h3 className="font-bold mb-2 flex items-center gap-2 text-sm">
                {allOk ? <><CheckCircle2 className="h-5 w-5 text-emerald-600" /> Hammasi to'g'ri!</>
                : missingCount > 0 ? <><AlertTriangle className="h-5 w-5 text-rose-600" /> {missingCount} ta xato</>
                : <>Tekshirilmoqda...</>}
              </h3>
              {missingCount > 0 && (
                <>
                  <p className="text-xs text-slate-700 dark:text-slate-200 mb-2">
                    Saytda manzilingizni tahrirlang:
                  </p>
                  <div className="space-y-2">
                    {finalResults.filter((r) => r.status === 'missing').map((r) => (
                      <div key={r.key} className="flex items-start gap-2 p-2 rounded-lg bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-800">
                        <div className="flex-1 min-w-0">
                          <div className="text-[10px] uppercase tracking-wider text-rose-600 font-bold">{r.zh} — {r.label}</div>
                          <div className="font-mono text-xs break-words mt-0.5">{r.expected}</div>
                        </div>
                        <button onClick={() => copyText(r.expected)}
                          className="p-1.5 rounded hover:bg-brand-50 text-brand-600 flex-shrink-0">
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}
              {allOk && (
                <p className="text-xs text-emerald-700 dark:text-emerald-300">
                  Manzilingiz to'liq va to'g'ri. Buyurtma berishingiz mumkin.
                </p>
              )}
            </div>
          </>
        )}

        <footer className="text-center text-[11px] text-slate-400 pt-4 pb-2">
          iPOST Cargo — manzil tekshirish xizmati
        </footer>
      </main>
    </div>
  );
}

function Line({ zh, value }: { zh: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 font-mono break-words">
      <span className="text-[10px] uppercase text-slate-400 mr-2">{zh}</span>
      {value}
    </div>
  );
}

function ImageWithBadges({ image, results }: { image: string; results: FieldResult[] }) {
  const missing = results.filter((r) => r.status === 'missing');
  return (
    <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900">
      <img src={image} alt="" className="w-full h-auto block" />
      {missing.length > 0 && (
        <div className="absolute top-2 left-2 right-2 sm:top-3 sm:left-3 sm:right-3 space-y-1.5 max-h-[80%] overflow-y-auto pointer-events-none">
          {missing.map((r) => (
            <div key={r.key}
              className="bg-rose-600/95 backdrop-blur-sm text-white rounded-xl px-3 py-2 shadow-lg text-xs flex items-start gap-2 border border-rose-400 pointer-events-auto">
              <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="font-bold">{r.zh} ({r.label})</div>
                <div className="font-mono text-[11px] mt-0.5 break-words opacity-95">
                  {r.key === 'id' ? "ID raqamingizni manzilga qo'shing!" : `Bu yerga yozing: ${r.expected}`}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
