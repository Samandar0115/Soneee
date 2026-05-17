import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';

export default function StatCard({
  label,
  value,
  icon: Icon,
  tone = 'brand',
  hint,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone?: 'brand' | 'emerald' | 'amber' | 'rose' | 'slate';
  hint?: string;
}) {
  const tones: Record<string, string> = {
    brand: 'bg-brand-50 text-brand-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    rose: 'bg-rose-50 text-rose-700',
    slate: 'bg-slate-100 text-slate-700',
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3, transition: { type: 'spring', stiffness: 400, damping: 25 } }}
      className="card p-5 flex items-center gap-4 cursor-default hover:shadow-lg hover:border-brand-300 dark:hover:border-brand-700 transition-all"
    >
      <motion.div
        whileHover={{ rotate: [0, -8, 8, 0], scale: 1.1 }}
        transition={{ duration: 0.4 }}
        className={`h-12 w-12 rounded-xl flex items-center justify-center ${tones[tone]}`}
      >
        <Icon className="h-5 w-5" />
      </motion.div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          {label}
        </div>
        <div className="text-2xl font-bold text-slate-900 leading-tight">{value}</div>
        {hint && <div className="text-xs text-slate-400 mt-0.5">{hint}</div>}
      </div>
    </motion.div>
  );
}
