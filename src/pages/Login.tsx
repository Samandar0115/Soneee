import { useEffect, useRef, useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Headphones, Camera, ScanFace, KeyRound, Check, X, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import { useApp } from '../context/AppContext';
import { computeDescriptor, findBestMatch, loadFaceModels } from '../utils/face';
import type { User } from '../types';

type Mode = 'face' | 'password';

export default function Login() {
  const { login, currentUser, users } = useApp();
  const nav = useNavigate();
  // Face ID'ni har doim ko'rsatamiz — KV'dan keyin yuklanishi mumkin, va
  // har bir qurilmada kamera/Face ID sinab ko'rilishi mumkin bo'lsin
  const hasFaceUsers = users.some((u) => u.faceDescriptor && u.faceDescriptor.length > 0);
  const [mode, setMode] = useState<Mode>('face');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);

  if (currentUser) return <Navigate to="/" replace />;

  function onFaceFail() {
    const next = failedAttempts + 1;
    setFailedAttempts(next);
    if (next >= 2) {
      toast.error('2 marta urinish muvaffaqiyatsiz. Parol bilan kiring.', { duration: 4000 });
      setMode('password');
    }
  }

  async function submitPassword(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const u = login(username, password);
    setLoading(false);
    if (u) {
      toast.success(`Xush kelibsiz, ${u.fullName ?? u.username}`);
      nav('/');
    } else {
      toast.error("Login yoki parol noto'g'ri");
    }
  }

  function onFaceSuccess(u: User) {
    login(u.username, u.password);
    toast.success(`Xush kelibsiz, ${u.fullName ?? u.username}`);
    nav('/');
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-brand-700 via-brand-600 to-brand-900">
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        className="w-full max-w-md card p-7"
      >
        <div className="flex items-center gap-3 mb-5">
          <motion.div
            whileHover={{ rotate: [0, -10, 10, 0], scale: 1.05 }}
            transition={{ duration: 0.5 }}
            className="h-12 w-12 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white shadow-lg shadow-brand-500/30"
          >
            <Headphones className="h-6 w-6" />
          </motion.div>
          <div>
            <div className="text-xl font-bold text-slate-900 dark:text-slate-100">iPOST CRM</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Call Center Virtual Control Room
            </div>
          </div>
        </div>

        {hasFaceUsers && (
          <div className="flex bg-slate-100 dark:bg-slate-800 rounded-xl p-1 mb-4">
            <button
              type="button"
              onClick={() => {
                setMode('face');
                setFailedAttempts(0);
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition ${
                mode === 'face'
                  ? 'bg-white dark:bg-slate-900 shadow-soft text-brand-700'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              <ScanFace className="h-3.5 w-3.5" /> Face ID
            </button>
            <button
              type="button"
              onClick={() => setMode('password')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition ${
                mode === 'password'
                  ? 'bg-white dark:bg-slate-900 shadow-soft text-brand-700'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              <KeyRound className="h-3.5 w-3.5" /> Parol
            </button>
          </div>
        )}

        <AnimatePresence mode="wait">
          {mode === 'face' ? (
            <motion.div
              key="face"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
            >
              <FaceLoginPanel
                onSuccess={onFaceSuccess}
                onFail={onFaceFail}
                onFallback={() => setMode('password')}
                attemptsLeft={2 - failedAttempts}
              />
            </motion.div>
          ) : (
            <motion.form
              key="password"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              onSubmit={submitPassword}
              className="space-y-3"
            >
              <div>
                <label className="label">Foydalanuvchi nomi</label>
                <input
                  autoFocus
                  className="input mt-1"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="username"
                />
              </div>
              <div>
                <label className="label">Parol</label>
                <input
                  type="password"
                  className="input mt-1"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="•••••••"
                />
              </div>
              <button className="btn-primary w-full" disabled={loading}>
                {loading ? 'Tekshirilmoqda…' : 'Kirish'}
              </button>
            </motion.form>
          )}
        </AnimatePresence>

        <div className="mt-5 text-[11px] text-slate-400 text-center">
          Login ma'lumotlarini administratordan oling
        </div>
      </motion.div>
    </div>
  );
}

type FaceState =
  | 'idle'
  | 'loading_models'
  | 'requesting_camera'
  | 'denied'
  | 'no_camera'
  | 'insecure'
  | 'failed_models'
  | 'scanning'
  | 'confirm'
  | 'success';

function isCameraSupported() {
  return !!(navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function');
}
function isSecureCtx() {
  if (typeof window === 'undefined') return false;
  if (window.isSecureContext) return true;
  // localhost development
  if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') return true;
  return location.protocol === 'https:';
}

function FaceLoginPanel({
  onSuccess,
  onFail,
  onFallback,
  attemptsLeft,
}: {
  onSuccess: (u: User) => void;
  onFail: () => void;
  onFallback: () => void;
  attemptsLeft: number;
}) {
  const { users } = useApp();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<number | null>(null);
  const [state, setState] = useState<FaceState>('idle');
  const [matched, setMatched] = useState<User | null>(null);
  const [errorDetail, setErrorDetail] = useState<string>('');

  // Mobile va ba'zi brauzerlar (iOS Safari) tugma bosilmasa kamera bermaydi
  const requiresGesture =
    /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    /Mobi|Android/i.test(navigator.userAgent);

  useEffect(() => {
    // Avval HTTPS va camera mavjudligini tekshiramiz
    if (!isSecureCtx()) {
      setState('insecure');
      return;
    }
    if (!isCameraSupported()) {
      setState('no_camera');
      return;
    }
    // PC'larda darhol boshlanadi, mobil'da tugma bosilishini kutamiz
    if (!requiresGesture) {
      start();
    } else {
      setState('idle');
    }
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function start() {
    setErrorDetail('');
    setState('loading_models');
    try {
      await loadFaceModels();
    } catch (e: any) {
      setErrorDetail(e?.message ?? '');
      setState('failed_models');
      return;
    }
    setState('requesting_camera');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setState('scanning');
      startScanning();
    } catch (err: any) {
      const name = err?.name ?? '';
      const msg = err?.message ?? '';
      setErrorDetail(`${name}${msg ? ': ' + msg : ''}`);
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        setState('denied');
      } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        setState('no_camera');
      } else {
        setState('denied');
      }
    }
  }

  function startScanning() {
    if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
    scanIntervalRef.current = window.setInterval(async () => {
      if (!videoRef.current || videoRef.current.readyState !== 4) return;
      try {
        const desc = await computeDescriptor(videoRef.current);
        if (!desc) return;
        // Faqat face descriptor'i bor xodimlar orasidan qidiramiz
        const candidates = users.filter((u) => u.faceDescriptor && u.faceDescriptor.length > 0);
        if (candidates.length === 0) return;
        const match = findBestMatch(candidates, desc, 0.5);
        if (match) {
          pauseScanning();
          setMatched(match.user);
          setState('confirm');
        }
      } catch {
        // silent
      }
    }, 700);
  }

  function pauseScanning() {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
  }

  function stop() {
    pauseScanning();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }

  function confirmYes() {
    if (!matched) return;
    stop();
    setState('success');
    setTimeout(() => onSuccess(matched), 700);
  }

  function confirmNo() {
    setMatched(null);
    setState('scanning');
    onFail();
    if (attemptsLeft - 1 > 0) {
      startScanning();
    }
  }

  return (
    <div className="space-y-3">
      <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-slate-900 border-2 border-slate-200 dark:border-slate-700">
        <video
          ref={videoRef}
          playsInline
          muted
          className="w-full h-full object-cover scale-x-[-1]"
        />

        {/* Holatlar */}
        {state === 'idle' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/85 text-white text-center px-6">
            <Camera className="h-10 w-10 mb-3 opacity-90" />
            <button
              onClick={start}
              className="bg-brand-600 hover:bg-brand-500 px-5 py-2.5 rounded-xl text-sm font-semibold shadow-lg"
            >
              Face ID — kamerani yoqish
            </button>
            <div className="text-xs mt-3 opacity-80 max-w-xs">
              Telefon yoki yangi qurilmada kamera ruxsati uchun tugmani bosing
            </div>
          </div>
        )}

        {(state === 'loading_models' || state === 'requesting_camera') && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/80 text-white">
            <Camera className="h-8 w-8 animate-pulse mb-2" />
            <div className="text-sm">
              {state === 'loading_models' ? 'Modellar yuklanmoqda...' : "Kameradan ruxsat so'ralmoqda..."}
            </div>
          </div>
        )}

        {state === 'denied' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-rose-900/85 text-white text-center px-6">
            <X className="h-10 w-10 mb-2" />
            <div className="text-sm font-semibold">Kamera ruxsati berilmadi</div>
            <div className="text-xs mt-1 opacity-80 max-w-xs">
              Brauzer manzil qatori chap tomonidagi 🔒 ikona → Kamera → Ruxsat berish
            </div>
            {errorDetail && (
              <div className="text-[10px] mt-2 opacity-60 font-mono">{errorDetail}</div>
            )}
            <button
              onClick={start}
              className="mt-3 bg-white text-rose-900 px-4 py-1.5 rounded-lg text-xs font-semibold"
            >
              <RotateCcw className="h-3 w-3 inline mr-1" /> Qaytadan urinish
            </button>
          </div>
        )}

        {state === 'no_camera' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-800/90 text-white text-center px-6">
            <Camera className="h-10 w-10 mb-2 opacity-60" />
            <div className="text-sm font-semibold">Bu qurilmada kamera topilmadi</div>
            <div className="text-xs mt-1 opacity-80">Parol bilan kirishni davom ettiring</div>
          </div>
        )}

        {state === 'insecure' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-amber-900/85 text-white text-center px-6">
            <X className="h-10 w-10 mb-2" />
            <div className="text-sm font-semibold">HTTPS talab qilinadi</div>
            <div className="text-xs mt-1 opacity-80">
              Kameradan foydalanish uchun sayt HTTPS orqali ochilishi kerak
            </div>
          </div>
        )}

        {state === 'failed_models' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-amber-900/85 text-white text-center px-6">
            <X className="h-10 w-10 mb-2" />
            <div className="text-sm font-semibold">Modellarni yuklab bo'lmadi</div>
            <div className="text-xs mt-1 opacity-80">
              Internet aloqasini tekshiring (CDN'dan ~3MB)
            </div>
            <button
              onClick={start}
              className="mt-3 bg-white text-amber-900 px-4 py-1.5 rounded-lg text-xs font-semibold"
            >
              <RotateCcw className="h-3 w-3 inline mr-1" /> Qaytadan urinish
            </button>
          </div>
        )}

        {state === 'scanning' && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-x-6 top-6 bottom-6 border-2 border-brand-400/70 rounded-2xl">
              <div className="absolute inset-x-0 top-0 h-0.5 bg-brand-400 animate-scan shadow-[0_0_12px_rgba(47,102,255,0.8)]" />
            </div>
            <div className="absolute bottom-3 left-0 right-0 text-center text-white text-xs font-semibold bg-slate-900/60 mx-6 py-1 rounded-lg">
              {users.filter((u) => u.faceDescriptor && u.faceDescriptor.length > 0).length === 0
                ? "Hech bir xodim Face ID ro'yxatdan o'tmagan — parol bilan kiring"
                : "Yuzingizni kameraga yo'naltiring"}
            </div>
          </div>
        )}

        {state === 'success' && matched && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute inset-0 flex flex-col items-center justify-center bg-emerald-500/85 backdrop-blur-sm text-white"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1, rotate: [0, -10, 10, 0] }}
              transition={{ type: 'spring', stiffness: 300 }}
            >
              <Check className="h-16 w-16" />
            </motion.div>
            <div className="font-bold mt-2 text-lg">Xush kelibsiz!</div>
            <div className="text-sm mt-1 opacity-90">{matched.fullName ?? matched.username}</div>
          </motion.div>
        )}
      </div>

      {/* Tasdiqlash kartochkasi */}
      <AnimatePresence>
        {state === 'confirm' && matched && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8 }}
            className="rounded-2xl border-2 border-brand-500 bg-brand-50 dark:bg-brand-900/20 p-4"
          >
            <div className="flex items-center gap-3">
              {matched.photo ? (
                <img
                  src={matched.photo}
                  alt={matched.username}
                  className="h-14 w-14 rounded-full object-cover border-2 border-brand-500"
                />
              ) : (
                <div className="h-14 w-14 rounded-full bg-brand-500 text-white flex items-center justify-center text-xl font-bold">
                  {(matched.fullName ?? matched.username)[0]?.toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-xs text-brand-700 dark:text-brand-300 font-semibold uppercase tracking-wider">
                  Siz...
                </div>
                <div className="text-lg font-bold text-slate-900 dark:text-slate-100 truncate">
                  {matched.fullName ?? matched.username}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">{matched.role}</div>
              </div>
            </div>
            <div className="text-sm text-slate-700 dark:text-slate-200 mt-3 text-center">
              Bu sizmisiz?
            </div>
            <div className="grid grid-cols-2 gap-2 mt-3">
              <button onClick={confirmNo} className="btn-ghost">
                <X className="h-4 w-4" /> Yo'q
              </button>
              <button onClick={confirmYes} className="btn-primary">
                <Check className="h-4 w-4" /> Ha, kirish
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pastdagi info matn */}
      {state !== 'confirm' && state !== 'success' && (
        <div className="flex items-center justify-between text-xs gap-2">
          <span className="text-slate-500 dark:text-slate-300">
            {state === 'scanning' &&
              (attemptsLeft < 2 ? `Qolgan urinish: ${attemptsLeft}` : 'Avtomatik tanish')}
            {state === 'idle' && 'Yoki parol bilan kiring'}
          </span>
          <button
            onClick={onFallback}
            className="text-brand-700 hover:text-brand-800 font-semibold whitespace-nowrap"
          >
            <KeyRound className="h-3.5 w-3.5 inline mr-1" /> Parol bilan kirish
          </button>
        </div>
      )}

      <style>{`
        @keyframes scan {
          0% { transform: translateY(0); }
          50% { transform: translateY(260px); }
          100% { transform: translateY(0); }
        }
        .animate-scan {
          animation: scan 2.4s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
