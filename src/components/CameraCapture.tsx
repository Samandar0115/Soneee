import { useEffect, useRef, useState } from 'react';
import { Camera, X, Check, RotateCcw, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

interface Props {
  open: boolean;
  onClose: () => void;
  onCapture: (dataUrl: string) => void;
}

export default function CameraCapture({ open, onClose, onCapture }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [snapshot, setSnapshot] = useState<string | null>(null);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [mirror, setMirror] = useState(true);

  useEffect(() => {
    if (open) {
      setSnapshot(null);
      setError('');
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function startCamera() {
    setLoading(true);
    setError('');
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError("Bu brauzer kamerani qo'llab-quvvatlamaydi");
        setLoading(false);
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1024 }, height: { ideal: 768 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err: any) {
      const name = err?.name ?? '';
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        setError("Kamera ruxsati berilmadi. Brauzer manzil qatori chap tomonidagi 🔒 ikondan ruxsat bering.");
      } else if (name === 'NotFoundError') {
        setError("Bu qurilmada kamera topilmadi.");
      } else {
        setError("Kamerani yoqishda xato: " + (err?.message ?? name));
      }
    } finally {
      setLoading(false);
    }
  }

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }

  function takeSnapshot() {
    if (!videoRef.current) return;
    const v = videoRef.current;
    const canvas = canvasRef.current ?? document.createElement('canvas');
    canvasRef.current = canvas;
    const w = v.videoWidth;
    const h = v.videoHeight;
    if (!w || !h) {
      toast.error('Video tayyor emas, qayta urining');
      return;
    }
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    // Mirror saqlangan rasm uchun ham flip qilamiz (foydalanuvchi ko'rgani bilan bir xil)
    if (mirror) {
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(v, 0, 0, w, h);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setSnapshot(dataUrl);
  }

  function confirmSnapshot() {
    if (snapshot) {
      onCapture(snapshot);
      onClose();
    }
  }

  function retake() {
    setSnapshot(null);
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 10 }}
            className="bg-white dark:bg-[#0d1018] rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-slate-100">
                <Camera className="h-4 w-4 text-brand-600" /> Kameradan rasm olish
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4">
              <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-slate-900 border-2 border-slate-200 dark:border-slate-700">
                {snapshot ? (
                  <img src={snapshot} alt="snapshot" className="w-full h-full object-cover" />
                ) : (
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    className={`w-full h-full object-cover ${mirror ? 'scale-x-[-1]' : ''}`}
                  />
                )}

                {loading && !error && (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-900/70 text-white">
                    <Camera className="h-6 w-6 animate-pulse mr-2" /> Yuklanmoqda...
                  </div>
                )}

                {error && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-rose-900/85 text-white text-center px-6">
                    <X className="h-10 w-10 mb-2" />
                    <div className="text-sm font-semibold">Kamera xato</div>
                    <div className="text-xs mt-2 opacity-90">{error}</div>
                    <button
                      onClick={startCamera}
                      className="mt-3 bg-white text-rose-900 px-4 py-1.5 rounded-lg text-xs font-semibold"
                    >
                      <RefreshCw className="h-3 w-3 inline mr-1" /> Qaytadan
                    </button>
                  </div>
                )}

                {!snapshot && !loading && !error && (
                  <div className="absolute inset-0 pointer-events-none">
                    {/* Yuz markaziy uchun guide */}
                    <div className="absolute inset-x-12 top-8 bottom-16 border-2 border-dashed border-white/40 rounded-[50%]" />
                    <div className="absolute bottom-3 left-0 right-0 text-center text-white text-xs font-semibold bg-slate-900/60 mx-6 py-1 rounded-lg">
                      Yuzni doiraga moslang
                    </div>
                  </div>
                )}
              </div>

              {/* Mirror toggle */}
              {!snapshot && !error && (
                <label className="flex items-center gap-2 mt-3 text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={mirror}
                    onChange={(e) => setMirror(e.target.checked)}
                    className="h-3.5 w-3.5"
                  />
                  <span>Mirror (oyna) rejim — ko'rgan ko'rinishda saqlash</span>
                </label>
              )}

              {/* Action buttons */}
              <div className="flex gap-2 mt-4">
                {snapshot ? (
                  <>
                    <button onClick={retake} className="btn-ghost flex-1">
                      <RotateCcw className="h-4 w-4" /> Qayta olish
                    </button>
                    <button onClick={confirmSnapshot} className="btn-primary flex-1">
                      <Check className="h-4 w-4" /> Tasdiqlash
                    </button>
                  </>
                ) : (
                  <button
                    onClick={takeSnapshot}
                    disabled={loading || !!error}
                    className="btn-primary flex-1 disabled:opacity-50"
                  >
                    <Camera className="h-4 w-4" /> Suratga olish
                  </button>
                )}
              </div>

              <div className="text-[11px] text-slate-400 text-center mt-3">
                Aniq yorug'likda, faqat bitta yuz ko'rinadigan rasm tanlang
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
