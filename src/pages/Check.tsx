import { useEffect, useRef, useState } from 'react';
import {
  Upload, CheckCircle2, AlertTriangle, Copy, Download, RefreshCcw,
  ArrowLeft, Camera, Loader2, ScanText, Lightbulb,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useApp } from '../context/AppContext';
import { compressImageDataUrl } from '../utils/image';
import { ADDRESS_ID_PLACEHOLDER, type ChineseAddressTemplate } from '../types';

type Marketplace = '1688' | 'taobao' | 'pinduoduo' | 'poizon' | 'other';

const MARKETS: { id: Marketplace; label: string; color: string; icon: string }[] = [
  { id: '1688', label: '1688', color: '#ff6a00', icon: '🟧' },
  { id: 'taobao', label: 'Taobao', color: '#ff4400', icon: '🛒' },
  { id: 'pinduoduo', label: 'Pinduoduo', color: '#e0210b', icon: '🔴' },
  { id: 'poizon', label: 'Poizon', color: '#000000', icon: '⚫' },
  { id: 'other', label: 'Boshqa', color: '#475569', icon: '🌐' },
];

function copyText(text: string) {
  void navigator.clipboard.writeText(text).then(
    () => toast.success('Nusxalandi'),
    () => toast.error('Nusxalashda xatolik'),
  );
}

// {ID} ni mijoz IDga almashtirish
function fillId(text: string, id: string): string {
  if (!text) return '';
  return text.split(ADDRESS_ID_PLACEHOLDER).join(id || ADDRESS_ID_PLACEHOLDER);
}

// Matn ichidagi bo'shliq/yangi qator/lotin punktuatsiyani normallashtirish
function norm(s: string): string {
  return (s || '')
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[，,。．\.：:；;]/g, '');
}

// Solishtirish — to'g'ri qiymat OCR matni ichida bormi?
function contains(haystack: string, needle: string): boolean {
  if (!needle.trim()) return true;
  return norm(haystack).includes(norm(needle));
}

type FieldKey = 'recipientName' | 'phone' | 'address' | 'postalCode' | 'id';
type FieldStatus = 'pending' | 'ok' | 'missing' | 'partial';
interface FieldResult {
  key: FieldKey;
  label: string;
  zh: string;
  expected: string;
  status: FieldStatus;
  hint?: string;
}

function buildFields(tpl: ChineseAddressTemplate, customerId: string): { key: FieldKey; label: string; zh: string; expected: string }[] {
  const id = customerId.trim();
  return [
    { key: 'recipientName', label: 'Qabul qiluvchi', zh: '收货人', expected: fillId(tpl.recipientName, id) },
    { key: 'phone', label: 'Telefon', zh: '手机号', expected: tpl.phone },
    { key: 'address', label: "To'liq manzil", zh: '详细地址', expected: `${tpl.province} ${tpl.city} ${tpl.district} ${fillId(tpl.detailedAddress, id)}` },
    { key: 'postalCode', label: 'Pochta indeksi', zh: '邮编', expected: tpl.postalCode },
    { key: 'id', label: 'Mijoz ID', zh: 'iD/ID', expected: id || '(siz hali ID kiritmagansiz)' },
  ];
}

export default function Check() {
  const { settings } = useApp();
  const tpl: ChineseAddressTemplate | undefined = settings.chineseAddress;

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [marketplace, setMarketplace] = useState<Marketplace | null>(null);
  const [customerId, setCustomerId] = useState<string>(() => {
    try { return localStorage.getItem('ipost.check.id') ?? ''; } catch { return ''; }
  });
  const [image, setImage] = useState<string | null>(null);
  const [ocrText, setOcrText] = useState<string>('');
  const [ocrBusy, setOcrBusy] = useState(false);
  const [ocrProgress, setOcrProgress] = useState<number>(0);
  const [results, setResults] = useState<FieldResult[]>([]);
  const [manualChecks, setManualChecks] = useState<Record<string, boolean | null>>({});

  const fileRef = useRef<HTMLInputElement | null>(null);
  const cameraRef = useRef<HTMLInputElement | null>(null);

  // Mijoz ID ni eslab qolish
  useEffect(() => {
    try { localStorage.setItem('ipost.check.id', customerId); } catch { /* ignore */ }
  }, [customerId]);

  useEffect(() => { window.scrollTo({ top: 0 }); }, [step]);

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
        setStep(4);
        // OCR avtomatik boshlash
        if (tpl) await runOcr(compressed);
      } catch {
        setImage(reader.result as string);
        setStep(4);
      }
    };
    reader.readAsDataURL(file);
  }

  async function runOcr(imgDataUrl: string) {
    if (!tpl) return;
    setOcrBusy(true);
    setOcrProgress(0);
    setOcrText('');
    setResults([]);
    try {
      // Tesseract.js ni lazy yuklash (faqat /check sahifasida kerak)
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
      // Har bir maydonni tekshirish
      const fields = buildFields(tpl, customerId);
      const out: FieldResult[] = fields.map((f) => {
        if (f.key === 'id') {
          // ID alohida — bo'sh bo'lsa pending
          if (!customerId.trim()) {
            return { ...f, status: 'pending', hint: 'ID ni 2-qadamda kiriting' };
          }
          return {
            ...f,
            status: contains(txt, customerId) ? 'ok' : 'missing',
            hint: contains(txt, customerId)
              ? 'Sizning ID rasmda topildi'
              : 'Sizning ID raqamingiz rasmda topilmadi — manzilga qo\'shing!',
          };
        }
        const ok = contains(txt, f.expected);
        return {
          ...f,
          status: ok ? 'ok' : 'missing',
          hint: ok ? 'To\'g\'ri yozilgan' : 'Bu maydon yo\'q yoki noto\'g\'ri',
        };
      });
      setResults(out);
    } catch (err) {
      console.error(err);
      toast.error('OCR xatosi — rasm sifatini tekshiring yoki qo\'lda belgilang');
      // OCR ishlamasa — qo'lda checklist
      const fields = buildFields(tpl, customerId);
      setResults(fields.map((f) => ({ ...f, status: 'pending', hint: 'OCR ishlamadi — qo\'lda tekshiring' })));
    } finally {
      setOcrBusy(false);
    }
  }

  function reset() {
    setImage(null);
    setMarketplace(null);
    setOcrText('');
    setResults([]);
    setManualChecks({});
    setStep(1);
  }

  function downloadImage() {
    if (!image) return;
    const a = document.createElement('a');
    a.href = image;
    a.download = `address-check-${Date.now()}.png`;
    a.click();
  }

  // Status hisobi (OCR + qo'lda override)
  const finalResults: FieldResult[] = results.map((r) => {
    const m = manualChecks[r.key];
    if (m === true) return { ...r, status: 'ok' };
    if (m === false) return { ...r, status: 'missing' };
    return r;
  });
  const missingCount = finalResults.filter((r) => r.status === 'missing').length;
  const okCount = finalResults.filter((r) => r.status === 'ok').length;
  const totalCount = finalResults.length;
  const allOk = totalCount > 0 && okCount === totalCount;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#05070d] text-slate-800 dark:text-slate-100">
      {/* Header */}
      <header className="bg-gradient-to-r from-brand-600 to-brand-700 text-white px-4 py-6 shadow-md">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-1">
            <div className="h-10 w-10 rounded-xl bg-white/15 flex items-center justify-center text-2xl">🧐</div>
            <div className="flex-1">
              <h1 className="text-xl md:text-2xl font-bold">Xitoy manzilingizni tekshiring</h1>
              <p className="text-sm text-white/80">1688 · Taobao · Pinduoduo · Poizon</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 md:py-8 space-y-5">
        {/* STEP indikator */}
        <div className="flex items-center gap-2 text-xs">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="flex items-center gap-2 flex-1">
              <span className={`h-7 w-7 rounded-full flex items-center justify-center font-bold ${
                step === n ? 'bg-brand-600 text-white' : step > n ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'
              }`}>
                {step > n ? '✓' : n}
              </span>
              <span className={`hidden sm:inline ${step >= n ? 'font-semibold text-slate-700 dark:text-slate-200' : 'text-slate-400'}`}>
                {n === 1 ? 'Sayt' : n === 2 ? 'ID' : n === 3 ? 'Rasm' : 'Natija'}
              </span>
              {n < 4 && <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />}
            </div>
          ))}
        </div>

        {/* STEP 1 — Marketplace */}
        {step === 1 && (
          <section className="space-y-4">
            <div className="card p-5">
              <h2 className="font-bold text-lg mb-3">1-qadam: Saytni tanlang</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {MARKETS.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => { setMarketplace(m.id); setStep(2); }}
                    className="card p-4 text-left hover:shadow-lg hover:-translate-y-0.5 transition border-2 border-transparent hover:border-brand-500"
                    style={{ borderTopColor: m.color, borderTopWidth: 3 }}
                  >
                    <div className="text-3xl mb-1">{m.icon}</div>
                    <div className="font-bold text-slate-800 dark:text-slate-100">{m.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Standart manzil — preview */}
            {tpl && (
              <div className="card p-5">
                <h3 className="font-bold mb-3">Bizning Xitoy ombor manzilimiz</h3>
                <p className="text-xs text-slate-500 mb-3">
                  Quyidagi maydonlarda <code className="px-1 py-0.5 bg-brand-100 text-brand-700 rounded">{ADDRESS_ID_PLACEHOLDER}</code> ko'rinsa — uni o'zingizning ID raqamingiz bilan almashtiring (keyingi qadamda kiritasiz)
                </p>
                <div className="space-y-2 text-sm">
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 font-mono break-words">
                    <span className="text-[11px] uppercase text-slate-400 block mb-1">收货人</span>
                    {tpl.recipientName}
                  </div>
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 font-mono break-words">
                    <span className="text-[11px] uppercase text-slate-400 block mb-1">手机号</span>
                    {tpl.phone}
                  </div>
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 font-mono break-words">
                    <span className="text-[11px] uppercase text-slate-400 block mb-1">地区 + 详细地址</span>
                    {`${tpl.province} ${tpl.city} ${tpl.district} ${tpl.detailedAddress}`}
                  </div>
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 font-mono break-words">
                    <span className="text-[11px] uppercase text-slate-400 block mb-1">邮编</span>
                    {tpl.postalCode}
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* STEP 2 — Customer ID */}
        {step === 2 && (
          <section className="space-y-4">
            <div className="card p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-lg">2-qadam: Mijoz ID</h2>
                <button onClick={() => setStep(1)} className="btn-ghost text-xs">
                  <ArrowLeft className="h-3.5 w-3.5" /> Orqaga
                </button>
              </div>
              <p className="text-sm text-slate-500 mb-4">
                Sizning iPOST mijoz ID raqamingizni kiriting. Bu raqam yukingizni siz bilan bog'lash uchun ishlatiladi.
              </p>
              <input
                type="text"
                inputMode="numeric"
                className="input text-center text-2xl font-mono tracking-wider"
                placeholder="Masalan: 111982"
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value.replace(/[^\w\d-]/g, ''))}
                autoFocus
              />
              {tpl && customerId.trim() && (
                <div className="mt-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 text-emerald-900 dark:text-emerald-300 text-sm">
                  <Lightbulb className="h-4 w-4 inline mr-1" />
                  Sizning manzilingiz quyidagicha bo'lishi kerak:
                  <div className="mt-2 font-mono text-xs space-y-1 break-words">
                    <div><b>收货人:</b> {fillId(tpl.recipientName, customerId)}</div>
                    <div><b>手机号:</b> {tpl.phone}</div>
                    <div><b>详细地址:</b> {tpl.province} {tpl.city} {tpl.district} {fillId(tpl.detailedAddress, customerId)}</div>
                    <div><b>邮编:</b> {tpl.postalCode}</div>
                  </div>
                </div>
              )}
              <button
                onClick={() => {
                  if (!customerId.trim()) {
                    toast.error('Iltimos, ID raqamingizni kiriting');
                    return;
                  }
                  setStep(3);
                }}
                disabled={!customerId.trim()}
                className="btn-primary w-full mt-4 disabled:opacity-50"
              >
                Davom etish →
              </button>
            </div>
          </section>
        )}

        {/* STEP 3 — Image */}
        {step === 3 && (
          <section className="space-y-4">
            <div className="card p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-lg">3-qadam: Manzil rasmini yuklang</h2>
                <button onClick={() => setStep(2)} className="btn-ghost text-xs">
                  <ArrowLeft className="h-3.5 w-3.5" /> Orqaga
                </button>
              </div>
              <p className="text-sm text-slate-500 mb-4">
                {MARKETS.find((m) => m.id === marketplace)?.label} saytidagi manzil oynasini suratga oling yoki yuklang.
              </p>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => cameraRef.current?.click()}
                  className="rounded-2xl border-2 border-dashed border-emerald-300 bg-emerald-50/40 dark:bg-emerald-900/10 py-10 flex flex-col items-center justify-center gap-2 hover:bg-emerald-50 transition"
                >
                  <Camera className="h-10 w-10 text-emerald-600" />
                  <div className="text-emerald-700 dark:text-emerald-300 font-bold">Kamera</div>
                  <div className="text-[11px] text-slate-500 text-center px-2">Telefonda — to'g'ridan-to'g'ri suratga olish</div>
                </button>
                <button
                  onClick={() => fileRef.current?.click()}
                  className="rounded-2xl border-2 border-dashed border-brand-300 bg-brand-50/40 dark:bg-brand-900/10 py-10 flex flex-col items-center justify-center gap-2 hover:bg-brand-50 transition"
                >
                  <Upload className="h-10 w-10 text-brand-500" />
                  <div className="text-brand-700 dark:text-brand-300 font-bold">Fayl</div>
                  <div className="text-[11px] text-slate-500 text-center px-2">Galereyadan yoki kompyuterdan</div>
                </button>
              </div>

              <input
                ref={cameraRef}
                type="file"
                accept="image/*"
                capture="environment"
                hidden
                onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f); e.target.value = ''; }}
              />
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f); e.target.value = ''; }}
              />
            </div>
          </section>
        )}

        {/* STEP 4 — Analysis */}
        {step === 4 && image && tpl && (
          <section className="space-y-4">
            <div className="card p-5">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <h2 className="font-bold text-lg">4-qadam: Tekshirish natijasi</h2>
                <div className="flex gap-2">
                  <button onClick={reset} className="btn-ghost text-xs">
                    <RefreshCcw className="h-3.5 w-3.5" /> Yangidan
                  </button>
                  <button onClick={downloadImage} className="btn-ghost text-xs">
                    <Download className="h-3.5 w-3.5" /> Yuklab olish
                  </button>
                </div>
              </div>

              {/* Rasm + annotatsiya */}
              <ImageWithAnnotations image={image} results={finalResults} />

              {/* OCR holati */}
              {ocrBusy && (
                <div className="mt-3 flex items-center gap-2 text-sm text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Matn aniqlash davom etmoqda... {ocrProgress}%
                </div>
              )}
              {!ocrBusy && ocrText && (
                <details className="mt-3 text-xs text-slate-500">
                  <summary className="cursor-pointer hover:text-brand-600">▸ Topilgan matn (OCR)</summary>
                  <pre className="mt-2 p-3 rounded-xl bg-slate-100 dark:bg-slate-800 whitespace-pre-wrap font-mono text-[11px] max-h-40 overflow-y-auto">{ocrText}</pre>
                </details>
              )}
              {!ocrBusy && (
                <button
                  onClick={() => image && runOcr(image)}
                  className="btn-ghost text-xs mt-3"
                >
                  <ScanText className="h-3.5 w-3.5" /> Qayta tekshirish (OCR)
                </button>
              )}
            </div>

            {/* Maydon natijalari */}
            <div className="card p-5">
              <h3 className="font-bold mb-3">Maydonlar tahlili</h3>
              <p className="text-xs text-slate-500 mb-3">
                Avtomatik tahlil natijasi. Agar noto'g'ri bo'lsa, qo'lda ✓ yoki ✗ tugmasi bilan o'zgartiring.
              </p>
              <div className="space-y-3">
                {finalResults.map((r) => {
                  const m = manualChecks[r.key];
                  return (
                    <div
                      key={r.key}
                      className={`rounded-xl border p-3 ${
                        r.status === 'ok'
                          ? 'border-emerald-200 bg-emerald-50/50 dark:bg-emerald-900/10'
                          : r.status === 'missing'
                          ? 'border-rose-200 bg-rose-50/50 dark:bg-rose-900/10'
                          : 'border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          {r.status === 'ok' ? (
                            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                          ) : r.status === 'missing' ? (
                            <AlertTriangle className="h-5 w-5 text-rose-500" />
                          ) : (
                            <Loader2 className="h-5 w-5 text-slate-400 animate-spin" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">{r.zh}</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-100">{r.label}</span>
                          </div>
                          <div className="font-mono text-sm text-slate-700 dark:text-slate-200 mt-1 break-words">
                            {r.expected}
                          </div>
                          {r.hint && (
                            <div className={`text-[11px] mt-1 ${r.status === 'missing' ? 'text-rose-600' : 'text-slate-500'}`}>
                              {r.hint}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col gap-1 flex-shrink-0">
                          <button
                            onClick={() => copyText(r.expected)}
                            className="p-1.5 rounded hover:bg-brand-50 text-brand-600"
                            title="Nusxalash"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setManualChecks({ ...manualChecks, [r.key]: m === true ? null : true })}
                            className={`p-1.5 rounded text-xs ${m === true ? 'bg-emerald-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:bg-emerald-50'}`}
                            title="To'g'ri"
                          >
                            ✓
                          </button>
                          <button
                            onClick={() => setManualChecks({ ...manualChecks, [r.key]: m === false ? null : false })}
                            className={`p-1.5 rounded text-xs ${m === false ? 'bg-rose-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:bg-rose-50'}`}
                            title="Yo'q"
                          >
                            ✗
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Xulosa */}
            <div className={`card p-5 ${
              allOk ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200'
              : missingCount > 0 ? 'bg-rose-50 dark:bg-rose-900/20 border-rose-200' : ''
            }`}>
              <h3 className="font-bold mb-2 flex items-center gap-2">
                {allOk ? (
                  <><CheckCircle2 className="h-6 w-6 text-emerald-600" /> Hammasi to'g'ri!</>
                ) : missingCount > 0 ? (
                  <><AlertTriangle className="h-6 w-6 text-rose-600" /> {missingCount} ta maydon noto'g'ri</>
                ) : (
                  <>Tekshirilmoqda...</>
                )}
              </h3>

              {missingCount > 0 && (
                <div>
                  <p className="text-sm text-slate-700 dark:text-slate-200 mb-3">
                    Saytda manzilingizni tahrirlang va quyidagilarni qo'shing/to'g'rilang:
                  </p>
                  <div className="space-y-2">
                    {finalResults.filter((r) => r.status === 'missing').map((r) => (
                      <div key={r.key} className="flex items-start gap-2 p-3 rounded-lg bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-800">
                        <div className="flex-1 min-w-0">
                          <div className="text-[11px] uppercase tracking-wider text-rose-600 font-bold">{r.zh} — {r.label}</div>
                          <div className="font-mono text-sm break-words mt-1">{r.expected}</div>
                        </div>
                        <button
                          onClick={() => copyText(r.expected)}
                          className="p-2 rounded hover:bg-brand-50 text-brand-600 flex-shrink-0"
                          title="Nusxalash"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {allOk && (
                <p className="text-sm text-emerald-700 dark:text-emerald-300">
                  Manzilingiz to'liq va to'g'ri. Endi xavfsiz buyurtma berishingiz mumkin.
                </p>
              )}
            </div>
          </section>
        )}

        <footer className="text-center text-[11px] text-slate-400 pt-6 pb-2">
          iPOST Cargo — manzil tekshirish xizmati
        </footer>
      </main>
    </div>
  );
}

// === RASM + ANNOTATSIYA (badge overlay) ===
function ImageWithAnnotations({ image, results }: { image: string; results: FieldResult[] }) {
  const missing = results.filter((r) => r.status === 'missing');
  return (
    <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900">
      <img src={image} alt="Manzil screen shot" className="w-full h-auto block" />
      {missing.length > 0 && (
        <div className="absolute top-2 left-2 right-2 sm:top-3 sm:left-3 sm:right-3 space-y-1.5 max-h-[80%] overflow-y-auto">
          {missing.map((r) => (
            <div
              key={r.key}
              className="bg-rose-600/95 backdrop-blur-sm text-white rounded-xl px-3 py-2 shadow-lg text-xs flex items-start gap-2 border border-rose-400"
            >
              <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="font-bold">{r.zh} ({r.label})</div>
                <div className="font-mono text-[11px] mt-0.5 break-words opacity-95">
                  {r.key === 'id' ? 'ID raqamingizni manzilga qo\'shing!' : `Bu yerga yozing: ${r.expected}`}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
