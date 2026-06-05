import { useEffect, useRef, useState } from 'react';
import { Upload, CheckCircle2, AlertTriangle, Copy, Download, ImageOff, RefreshCcw, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { useApp } from '../context/AppContext';
import { compressImageDataUrl } from '../utils/image';
import type { ChineseAddressTemplate } from '../types';

type Marketplace = '1688' | 'taobao' | 'pinduoduo' | 'poizon' | 'other';

const MARKETS: { id: Marketplace; label: string; color: string; icon: string }[] = [
  { id: '1688', label: '1688', color: '#ff6a00', icon: '🟧' },
  { id: 'taobao', label: 'Taobao', color: '#ff4400', icon: '🛒' },
  { id: 'pinduoduo', label: 'Pinduoduo', color: '#e0210b', icon: '🔴' },
  { id: 'poizon', label: 'Poizon (得物)', color: '#000000', icon: '⚫' },
  { id: 'other', label: 'Boshqa', color: '#475569', icon: '🌐' },
];

function copyText(text: string) {
  void navigator.clipboard.writeText(text).then(
    () => toast.success('Nusxalandi'),
    () => toast.error('Nusxalashda xatolik'),
  );
}

function AddressFieldRow({
  zh, ru, value, copyable = true,
}: { zh: string; ru: string; value: string; copyable?: boolean }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 bg-white dark:bg-slate-900">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-[11px] uppercase tracking-wider text-slate-500 mb-0.5">{ru}</div>
          <div className="font-semibold text-slate-800 dark:text-slate-100 truncate">{zh}</div>
          <div className="font-mono text-sm text-brand-700 dark:text-brand-300 mt-1 break-words">{value || '—'}</div>
        </div>
        {copyable && value && (
          <button
            onClick={() => copyText(value)}
            className="p-2 rounded-lg hover:bg-brand-50 dark:hover:bg-brand-900/30 text-brand-600"
            title="Nusxalash"
          >
            <Copy className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

function CheckList({ items }: { items: { label: string; ok: boolean | null; hint?: string }[] }) {
  return (
    <ul className="space-y-2">
      {items.map((it, i) => (
        <li key={i} className="flex items-start gap-2 text-sm">
          {it.ok === true ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
          ) : it.ok === false ? (
            <AlertTriangle className="h-5 w-5 text-rose-500 flex-shrink-0 mt-0.5" />
          ) : (
            <span className="h-5 w-5 rounded-full border-2 border-slate-300 flex-shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <div className={`${it.ok === false ? 'text-rose-700 dark:text-rose-400 font-semibold' : 'text-slate-700 dark:text-slate-200'}`}>
              {it.label}
            </div>
            {it.hint && <div className="text-[11px] text-slate-500 mt-0.5">{it.hint}</div>}
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function Check() {
  const { settings } = useApp();
  const tpl: ChineseAddressTemplate | undefined = settings.chineseAddress;

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [marketplace, setMarketplace] = useState<Marketplace | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  // Bekor qilingan checkboxlar — operator ko'rgani bo'yicha belgilaydi
  const [checks, setChecks] = useState<Record<string, boolean | null>>({
    recipientName: null, phone: null, address: null, postalCode: null, customerId: null,
  });

  useEffect(() => {
    // Sahifa ochilganda yuqoriga skroll
    window.scrollTo({ top: 0 });
  }, [step]);

  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) {
      toast.error('Iltimos, rasm tanlang (PNG, JPG)');
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const compressed = await compressImageDataUrl(reader.result as string, { maxDim: 1600, quality: 0.85 });
        setImage(compressed);
        setStep(3);
      } catch {
        setImage(reader.result as string);
        setStep(3);
      }
    };
    reader.readAsDataURL(file);
  }

  function reset() {
    setImage(null);
    setMarketplace(null);
    setChecks({ recipientName: null, phone: null, address: null, postalCode: null, customerId: null });
    setStep(1);
  }

  function downloadImage() {
    if (!image) return;
    const a = document.createElement('a');
    a.href = image;
    a.download = `address-check-${Date.now()}.png`;
    a.click();
  }

  // Kalitlardan checkbox holatini hisoblash
  const missingCount = Object.values(checks).filter((v) => v === false).length;
  const okCount = Object.values(checks).filter((v) => v === true).length;
  const totalChecks = Object.keys(checks).length;
  const allOk = okCount === totalChecks;

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
          {[1, 2, 3].map((n) => (
            <div key={n} className="flex items-center gap-2 flex-1">
              <span className={`h-7 w-7 rounded-full flex items-center justify-center font-bold ${
                step === n ? 'bg-brand-600 text-white' : step > n ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'
              }`}>
                {step > n ? '✓' : n}
              </span>
              <span className={`hidden sm:inline ${step >= n ? 'font-semibold text-slate-700 dark:text-slate-200' : 'text-slate-400'}`}>
                {n === 1 ? 'Sayt' : n === 2 ? 'Screenshot' : 'Tekshirish'}
              </span>
              {n < 3 && <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />}
            </div>
          ))}
        </div>

        {/* STEP 1 — Marketplace tanlash */}
        {step === 1 && (
          <section className="space-y-4">
            <div className="card p-5">
              <h2 className="font-bold text-lg mb-3">1-qadam: Saytni tanlang</h2>
              <p className="text-sm text-slate-500 mb-4">
                Qaysi saytdan buyurtma berdingiz? Tanlasangiz, sizga to'g'ri manzil va tekshirish ko'rsatmalari beriladi.
              </p>
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

            {/* Standart manzil — har doim ko'rsatamiz, mijoz oldindan bilsin */}
            {tpl ? (
              <div className="card p-5">
                <h3 className="font-bold mb-3">Bizning Xitoy ombor manzilimiz</h3>
                <div className="space-y-2">
                  <AddressFieldRow zh="收件人" ru="Qabul qiluvchi" value={tpl.recipientName} />
                  <AddressFieldRow zh="电话" ru="Telefon" value={tpl.phone} />
                  <AddressFieldRow zh="省 / 市 / 区" ru="Viloyat / Shahar / Tuman" value={`${tpl.province} / ${tpl.city} / ${tpl.district}`} />
                  <AddressFieldRow zh="详细地址" ru="To'liq manzil" value={tpl.detailedAddress} />
                  <AddressFieldRow zh="邮编" ru="Pochta indeksi" value={tpl.postalCode} />
                </div>
                {tpl.notes && (
                  <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex gap-2">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <div>{tpl.notes}</div>
                  </div>
                )}
              </div>
            ) : (
              <div className="card p-5 text-center text-slate-400">
                <ImageOff className="h-10 w-10 mx-auto mb-2 opacity-50" />
                Admin hali Xitoy manzilini sozlamadi.
              </div>
            )}
          </section>
        )}

        {/* STEP 2 — Screenshot yuklash */}
        {step === 2 && (
          <section className="space-y-4">
            <div className="card p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-lg">2-qadam: Screenshot yuklang</h2>
                <button onClick={() => setStep(1)} className="btn-ghost text-xs">
                  <ArrowLeft className="h-3.5 w-3.5" /> Orqaga
                </button>
              </div>
              <p className="text-sm text-slate-500 mb-4">
                {MARKETS.find((m) => m.id === marketplace)?.label} saytida buyurtma ochish paytida kiritgan manzil oynasining screen shot'ini yuklang.
              </p>

              <button
                onClick={() => fileRef.current?.click()}
                className="w-full rounded-2xl border-2 border-dashed border-brand-300 bg-brand-50/40 dark:bg-brand-900/10 py-12 flex flex-col items-center justify-center gap-3 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition"
              >
                <Upload className="h-12 w-12 text-brand-500" />
                <div className="text-brand-700 dark:text-brand-300 font-bold">Bosing yoki suring</div>
                <div className="text-xs text-slate-500">PNG, JPG — max 10 MB</div>
              </button>
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

        {/* STEP 3 — Tahlil */}
        {step === 3 && image && (
          <section className="space-y-4">
            <div className="card p-5">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <h2 className="font-bold text-lg">3-qadam: Tekshirish</h2>
                <div className="flex gap-2">
                  <button onClick={reset} className="btn-ghost text-xs">
                    <RefreshCcw className="h-3.5 w-3.5" /> Yangidan
                  </button>
                  <button onClick={downloadImage} className="btn-ghost text-xs">
                    <Download className="h-3.5 w-3.5" /> Yuklab olish
                  </button>
                </div>
              </div>

              {/* Yuklangan rasm */}
              <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900">
                <img src={image} alt="Manzil screen shot" className="w-full h-auto block" />
              </div>
              <p className="text-[11px] text-slate-400 mt-2 text-center">
                Pastdagi har bir maydonni rasm bilan solishtirib, ✓ yoki ✗ belgilang
              </p>
            </div>

            {/* Tekshirish checklist */}
            {tpl && (
              <div className="card p-5">
                <h3 className="font-bold mb-3">Tekshirish ro'yxati</h3>
                <div className="space-y-3">
                  {[
                    { key: 'recipientName', label: 'Qabul qiluvchi (收件人)', expected: tpl.recipientName },
                    { key: 'phone', label: 'Telefon (电话)', expected: tpl.phone },
                    { key: 'address', label: 'Manzil (省 + 市 + 区 + 详细地址)', expected: `${tpl.province} ${tpl.city} ${tpl.district} ${tpl.detailedAddress}` },
                    { key: 'postalCode', label: 'Pochta indeksi (邮编)', expected: tpl.postalCode },
                    { key: 'customerId', label: tpl.customerIdHint, expected: 'Mijoz ID' },
                  ].map((field) => {
                    const v = checks[field.key];
                    return (
                      <div key={field.key} className="rounded-xl border border-slate-200 dark:border-slate-700 p-3">
                        <div className="flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-1">
                              {field.label}
                            </div>
                            <div className="text-xs text-slate-500 font-mono break-words">
                              {field.expected}
                            </div>
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            <button
                              onClick={() => setChecks({ ...checks, [field.key]: true })}
                              className={`h-9 w-9 rounded-lg flex items-center justify-center transition ${
                                v === true ? 'bg-emerald-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:bg-emerald-50'
                              }`}
                              title="To'g'ri"
                            >
                              <CheckCircle2 className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => setChecks({ ...checks, [field.key]: false })}
                              className={`h-9 w-9 rounded-lg flex items-center justify-center transition ${
                                v === false ? 'bg-rose-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:bg-rose-50'
                              }`}
                              title="Yo'q"
                            >
                              <AlertTriangle className="h-5 w-5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Xulosa */}
            <div className={`card p-5 ${allOk ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200' : missingCount > 0 ? 'bg-rose-50 dark:bg-rose-900/20 border-rose-200' : ''}`}>
              <h3 className="font-bold mb-2 flex items-center gap-2">
                {allOk ? (
                  <><CheckCircle2 className="h-6 w-6 text-emerald-600" /> Hammasi to'g'ri!</>
                ) : missingCount > 0 ? (
                  <><AlertTriangle className="h-6 w-6 text-rose-600" /> {missingCount} ta maydon noto'g'ri</>
                ) : (
                  <>Tekshirishni davom ettiring</>
                )}
              </h3>

              {missingCount > 0 && tpl && (
                <div>
                  <p className="text-sm text-slate-700 dark:text-slate-200 mb-3">
                    Saytda manzilingizni tahrirlang va quyidagilarni qo'shing:
                  </p>
                  <div className="space-y-2">
                    {Object.entries(checks).filter(([_, v]) => v === false).map(([k]) => {
                      const map: Record<string, { label: string; value: string }> = {
                        recipientName: { label: 'Qabul qiluvchi', value: tpl.recipientName },
                        phone: { label: 'Telefon', value: tpl.phone },
                        address: { label: 'To\'liq manzil', value: `${tpl.province} ${tpl.city} ${tpl.district} ${tpl.detailedAddress}` },
                        postalCode: { label: 'Pochta indeksi', value: tpl.postalCode },
                        customerId: { label: 'Mijoz ID', value: tpl.customerIdHint },
                      };
                      const m = map[k];
                      if (!m) return null;
                      return (
                        <div key={k} className="flex items-center gap-2 p-2 rounded-lg bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-800">
                          <div className="flex-1 min-w-0">
                            <div className="text-[11px] uppercase tracking-wider text-rose-600">{m.label}</div>
                            <div className="font-mono text-sm break-words">{m.value}</div>
                          </div>
                          <button
                            onClick={() => copyText(m.value)}
                            className="p-2 rounded hover:bg-brand-50 text-brand-600"
                            title="Nusxalash"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {allOk && (
                <p className="text-sm text-emerald-700 dark:text-emerald-300">
                  Manzilingiz to'liq va to'g'ri. Endi yukni jo'natishingiz mumkin.
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
