import { useEffect, useRef, useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Headphones, Camera, ScanFace, KeyRound, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useApp } from '../context/AppContext';
import { computeDescriptor, findBestMatch, loadFaceModels } from '../utils/face';

type Mode = 'password' | 'face';

export default function Login() {
  const { login, currentUser, users } = useApp();
  const nav = useNavigate();
  const [mode, setMode] = useState<Mode>('password');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  if (currentUser) return <Navigate to="/" replace />;

  async function submit(e: React.FormEvent) {
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

  const hasFaceUsers = users.some((u) => u.faceDescriptor && u.faceDescriptor.length > 0);

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
              onClick={() => setMode('password')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition ${
                mode === 'password'
                  ? 'bg-white dark:bg-slate-900 shadow-soft text-brand-700'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              <KeyRound className="h-3.5 w-3.5" /> Parol
            </button>
            <button
              type="button"
              onClick={() => setMode('face')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition ${
                mode === 'face'
                  ? 'bg-white dark:bg-slate-900 shadow-soft text-brand-700'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              <ScanFace className="h-3.5 w-3.5" /> Face ID
            </button>
          </div>
        )}

        <AnimatePresence mode="wait">
          {mode === 'password' ? (
            <motion.form
              key="password"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              onSubmit={submit}
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
          ) : (
            <motion.div
              key="face"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
            >
              <FaceLoginPanel onSuccess={(u) => {
                login(u.username, u.password);
                toast.success(`Yuz orqali kirildi: ${u.fullName ?? u.username}`);
                nav('/');
              }} />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-5 text-[11px] text-slate-400 text-center">
          Login ma'lumotlarini administratordan oling
        </div>
      </motion.div>
    </div>
  );
}

function FaceLoginPanel({ onSuccess }: { onSuccess: (u: any) => void }) {
  const { users } = useApp();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [status, setStatus] = useState<'idle' | 'requesting' | 'scanning' | 'matched' | 'failed' | 'denied' | 'loading'>('idle');
  const [message, setMessage] = useState('');
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    start();
    return () => stop();
  }, []);

  async function start() {
    setStatus('loading');
    setMessage('Modellar yuklanmoqda...');
    try {
      await loadFaceModels();
    } catch {
      setStatus('failed');
      setMessage("Modellarni yuklab bo'lmadi. Internetni tekshiring.");
      return;
    }
    setStatus('requesting');
    setMessage('Kameradan ruxsat so\'ralmoqda...');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 480, height: 360 },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setStatus('scanning');
      setMessage('Yuzni tanib olmoqda...');
      startScanning();
    } catch (err: any) {
      setStatus('denied');
      setMessage("Kamera ruxsati berilmadi. Brauzer sozlamalarini tekshiring.");
    }
  }

  function startScanning() {
    if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
    scanIntervalRef.current = window.setInterval(async () => {
      if (!videoRef.current || videoRef.current.readyState !== 4) return;
      try {
        const desc = await computeDescriptor(videoRef.current);
        if (!desc) return;
        const match = findBestMatch(users, desc, 0.5);
        if (match) {
          stop();
          setStatus('matched');
          setMessage(`Salom, ${match.user.fullName ?? match.user.username}`);
          setTimeout(() => onSuccess(match.user), 600);
        }
      } catch {
        // silent
      }
    }, 700);
  }

  function stop() {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
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
        {(status === 'requesting' || status === 'loading') && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/60 text-white text-sm">
            <Camera className="h-5 w-5 animate-pulse mr-2" /> {message}
          </div>
        )}
        {status === 'scanning' && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-x-6 top-6 bottom-6 border-2 border-brand-400/70 rounded-2xl">
              <div className="absolute inset-x-0 top-0 h-0.5 bg-brand-400 animate-scan" />
            </div>
          </div>
        )}
        {status === 'matched' && (
          <div className="absolute inset-0 flex items-center justify-center bg-emerald-500/30 backdrop-blur-sm">
            <div className="text-white text-center">
              <ScanFace className="h-12 w-12 mx-auto" />
              <div className="font-bold mt-2">{message}</div>
            </div>
          </div>
        )}
      </div>
      <div className="text-xs text-slate-500 dark:text-slate-300 text-center">
        {status === 'denied' ? (
          <span className="text-rose-600">{message}</span>
        ) : status === 'failed' ? (
          <span className="text-rose-600">{message}</span>
        ) : (
          message || 'Yuzingizni kameraga yaqinlashtiring'
        )}
      </div>
      <style>{`
        @keyframes scan {
          0% { transform: translateY(0); }
          50% { transform: translateY(260px); }
          100% { transform: translateY(0); }
        }
        .animate-scan {
          animation: scan 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
