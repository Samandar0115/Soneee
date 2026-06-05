import { useEffect, useRef, useState } from 'react';
import { Upload, Camera, Copy, RefreshCcw, ScanLine, AlertTriangle, CheckCircle2, ArrowDown } from 'lucide-react';
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

type Field = {
  key: 'recipientName' | 'phone' | 'address' | 'postalCode';
  zh: string;
  label: string;
  expected: string;
  needsId: boolean;
};

function buildFields(tpl: ChineseAddressTemplate, id: string): Field[] {
  return [
    {
      key: 'recipientName',
      zh: '收货人',
      label: 'Qabul qiluvchi',
      expected: fillId(tpl.recipientName, id),
      needsId: tpl.recipientName.includes(ADDRESS_ID_PLACEHOLDER),
    },
    {
      key: 'phone',
      zh: '手机号',
      label: 'Telefon',
      expected: tpl.phone,
      needsId: false,
    },
    {
      key: 'address',
      zh: '详细地址',
      label: "To'liq manzil",
      expected: `${tpl.province} ${tpl.city} ${tpl.district} ${fillId(tpl.detailedAddress, id)}`,
      needsId: tpl.detailedAddress.includes(ADDRESS_ID_PLACEHOLDER),
    },
    {
      key: 'postalCode',
      zh: '邮编',
      label: 'Pochta indeksi',
      expected: tpl.postalCode,
      needsId: false,
    },
  ];
}

export default function Check() {
  const { settings } = useApp();
  const tpl: ChineseAddressTemplate = settings?.chineseAddress ?? DEFAULT_CHINESE_ADDRESS;

  const [image, setImage] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState<string>('');
  const [scanning, setScanning] = useState(false);
  const [scanned, setScanned] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const cameraRef = useRef<HTMLInputElement | null>(null);
  const resultRef = useRef<HTMLDivElement | null>(null);

  const idValid = /^\d{4,8}$/.test(customerId.trim()) && customerId.trim() !== tpl.postalCode;
  const effectiveId = idValid ? customerId.trim() : '';

  // Rasm yuklanganda — qisqa "scan" animatsiyasi (1.4s) so'ng natija
  function handleFile(file: File) {
    if (!file.type.startsWith('image/')) {
      toast.error('Iltimos, rasm tanlang');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setImage(reader.result as string);
      setScanned(false);
      setScanning(true);
      setTimeout(() => {
        setScanning(false);
        setScanned(true);
        setTimeout(() => {
          resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 60);
      }, 1400);
    };
    reader.readAsDataURL(file);
  }

  function reset() {
    setImage(null);
    setScanning(false);
    setScanned(false);
  }

  useEffect(() => {
    document.title = 'Xitoy manzilini tekshirish — iPOST';
  }, []);

  const fields = buildFields(tpl, effectiveId);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#05070d] text-slate-800 dark:text-slate-100">
      <style>{`
        @keyframes lens-scan {
          0%   { top: 0%; opacity: 0; }
          5%   { opacity: 1; }
          95%  { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        .lens-scan-line {
          position: absolute; left: 0; right: 0; height: 3px;
          background: linear-gradient(90deg, transparent, #22d3ee 20%, #38bdf8 50%, #22d3ee 80%, transparent);
          box-shadow: 0 0 24px 8px rgba(56,189,248,0.55);
          animation: lens-scan 1.4s ease-in-out forwards;
          pointer-events: none;
        }
        @keyframes lens-corners-in {
          from { opacity: 0; transform: scale(1.06); }
          to   { opacity: 1; transform: scale(1); }
        }
        .lens-corner {
          position: absolute; width: 22px; height: 22px;
          border: 3px solid #38bdf8;
          animation: lens-corners-in 0.3s ease-out;
        }
        .lens-corner.tl { top: 6px; left: 6px; border-right: none; border-bottom: none; border-top-left-radius: 6px; }
        .lens-corner.tr { top: 6px; right: 6px; border-left: none; border-bottom: none; border-top-right-radius: 6px; }
        .lens-corner.bl { bottom: 6px; left: 6px; border-right: none; border-top: none; border-bottom-left-radius: 6px; }
        .lens-corner.br { bottom: 6px; right: 6px; border-left: none; border-top: none; border-bottom-right-radius: 6px; }
        @keyframes lens-glow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(34,211,238,0); }
          50%      { box-shadow: 0 0 0 6px rgba(34,211,238,0.18); }
        }
        .lens-frame-active { animation: lens-glow 1.4s ease-in-out; }
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
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-4 md:py-6 space-y-4">
        {/* 1) ID — eng muhim maydon */}
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
            Profil sahifangizdan ko'rishingiz mumkin. <b>{tpl.postalCode}</b> — bu pochta indeksi, ID emas.
          </p>
        </div>

        {/* 2) YUKLASH yoki RASM */}
        {!image ? (
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-2">
              <ScanLine className="h-4 w-4 text-brand-600" />
              <h2 className="font-bold text-sm">Saqlangan manzilingiz suratini yuklang</h2>
            </div>
            <p className="text-[11px] text-slate-500 mb-3 leading-relaxed">
              Pinduoduo / Taobao / 1688 / Poizon ilovasida saqlangan manzil sahifangizning suratini oling.
              Sayt rasmni skaner qiladi va to'g'ri yozilganini ko'rsatadi.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => cameraRef.current?.click()}
                className="rounded-2xl border-2 border-dashed border-emerald-300 bg-emerald-50/40 dark:bg-emerald-900/10 py-6 flex flex-col items-center justify-center gap-2 hover:bg-emerald-50 active:scale-[0.98] transition"
              >
                <Camera className="h-8 w-8 text-emerald-600" />
                <div className="text-emerald-700 dark:text-emerald-300 font-bold text-sm">Kamera</div>
                <div className="text-[10px] text-emerald-700/70">suratga olish</div>
              </button>
              <button
                onClick={() => fileRef.current?.click()}
                className="rounded-2xl border-2 border-dashed border-brand-300 bg-brand-50/40 dark:bg-brand-900/10 py-6 flex flex-col items-center justify-center gap-2 hover:bg-brand-50 active:scale-[0.98] transition"
              >
                <Upload className="h-8 w-8 text-brand-500" />
                <div className="text-brand-700 dark:text-brand-300 font-bold text-sm">Fayl</div>
                <div className="text-[10px] text-brand-700/70">galereyadan</div>
              </button>
            </div>
            <input
              ref={cameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              hidden
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
            />
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
            />
          </div>
        ) : (
          <>
            <div className="card p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="text-[11px] uppercase tracking-wider text-slate-500 font-bold inline-flex items-center gap-1">
                  {scanning ? (
                    <><ScanLine className="h-3 w-3 text-brand-500 animate-pulse" /> Skanerlanmoqda...</>
                  ) : (
                    <><CheckCircle2 className="h-3 w-3 text-emerald-500" /> Sizning rasmingiz</>
                  )}
                </div>
                <button onClick={reset} className="text-[11px] inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200">
                  <RefreshCcw className="h-3 w-3" /> Boshqa rasm
                </button>
              </div>
              <div className={`relative rounded-xl overflow-hidden bg-slate-900 ${scanning ? 'lens-frame-active' : ''}`}>
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
                {scanned && !effectiveId && (
                  <div className="absolute inset-x-2 bottom-2 rounded-xl bg-amber-500/95 text-white px-3 py-2 text-xs shadow-lg backdrop-blur-sm flex items-start gap-2 lens-pop">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <div>Yuqorida ID raqamingizni kiriting — manzilingizda shu raqam bo'lishi shart.</div>
                  </div>
                )}
              </div>
              {scanned && (
                <div className="mt-2 text-center text-[11px] text-slate-500 inline-flex items-center justify-center w-full gap-1">
                  <ArrowDown className="h-3 w-3 animate-bounce" /> Pastdagi manzil bilan taqqoslang
                </div>
              )}
            </div>

            {/* NATIJA */}
            {scanned && (
              <div ref={resultRef} className="card p-4 lens-pop border-2 border-emerald-400 dark:border-emerald-600">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  <h3 className="font-bold text-sm">To'g'ri manzil shu bo'lishi kerak</h3>
                </div>
                <p className="text-[11px] text-slate-500 mb-3">
                  Rasm bilan taqqoslang. Farqi bo'lsa — saytda manzilni tahrirlab, quyidagi qiymatlarni yozing.
                  Har bir qatordagi <Copy className="inline h-3 w-3" /> tugmasi nusxalaydi.
                </p>

                {!effectiveId && (
                  <div className="mb-3 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-300 dark:border-rose-700 p-3 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <div>
                      <b>ID kiritilmagan!</b> Yuqoridagi maydonga 6 xonali iPOST mijoz raqamingizni yozing,
                      shunda manzilning aniq qiymatlari chiqadi.
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  {fields.map((f) => (
                    <div
                      key={f.key}
                      className="rounded-xl border border-slate-200 dark:border-slate-700 p-2.5 flex items-start gap-2 bg-white dark:bg-slate-900"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[10px] uppercase tracking-wider text-brand-600 font-bold">{f.zh}</span>
                          <span className="text-[11px] text-slate-600 dark:text-slate-300 font-semibold">{f.label}</span>
                          {f.needsId && !effectiveId && (
                            <span className="text-[9px] uppercase tracking-wider bg-rose-100 dark:bg-rose-900/40 text-rose-600 px-1.5 py-0.5 rounded font-bold">
                              ID kerak
                            </span>
                          )}
                        </div>
                        <div className={`font-mono text-xs break-words ${f.needsId && !effectiveId ? 'text-slate-400' : 'text-slate-800 dark:text-slate-100 font-semibold'}`}>
                          {f.expected}
                        </div>
                      </div>
                      <button
                        onClick={() => copyText(f.expected)}
                        disabled={f.needsId && !effectiveId}
                        className="flex-shrink-0 p-2 rounded-lg bg-brand-50 hover:bg-brand-100 text-brand-600 disabled:opacity-40 disabled:cursor-not-allowed"
                        title="Nusxalash"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>

                {tpl.notes && (
                  <div className="mt-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-2.5 text-[11px] text-amber-800 dark:text-amber-200 flex items-start gap-2">
                    <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                    <div>{tpl.notes}</div>
                  </div>
                )}
              </div>
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
