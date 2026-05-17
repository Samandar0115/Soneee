import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Headphones } from 'lucide-react';
import toast from 'react-hot-toast';
import { useApp } from '../context/AppContext';

export default function Login() {
  const { login, currentUser } = useApp();
  const nav = useNavigate();
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

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-brand-700 via-brand-600 to-brand-900">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md card p-7"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="h-12 w-12 rounded-2xl bg-brand-600 flex items-center justify-center text-white">
            <Headphones className="h-6 w-6" />
          </div>
          <div>
            <div className="text-xl font-bold text-slate-900">Soneee CRM</div>
            <div className="text-xs text-slate-500">Call Center Virtual Control Room</div>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-3">
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
        </form>

        <div className="mt-5 text-[11px] text-slate-400 text-center">
          Login ma'lumotlarini administratordan oling
        </div>
      </motion.div>
    </div>
  );
}
