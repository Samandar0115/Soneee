import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import toast from 'react-hot-toast';

export default function CopyButton({
  value,
  label,
  className,
}: {
  value: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy(e: React.MouseEvent) {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success(label ? `${label} nusxalandi` : 'Nusxalandi');
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Nusxalashda xato');
    }
  }

  return (
    <button
      onClick={copy}
      type="button"
      title={`Nusxalash${label ? ': ' + label : ''}`}
      className={`inline-flex items-center justify-center p-1 rounded text-slate-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/30 transition ${className ?? ''}`}
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}
