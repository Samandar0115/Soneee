// "Zero Trust" tugma — bosilganda darhol loading + disabled holatiga o'tadi
// va to'liq try/catch ichida ishlaydi. Xato bo'lsa avto qizil toast ko'rinadi.
//
// Foydalanish:
//   <AsyncButton onClick={async () => { await saveX(); }} className="btn-primary">
//     Saqlash
//   </AsyncButton>
//
// Mavjud className saqlanadi, loading paytida cursor=wait, opacity tushadi.

import { useCallback, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';

interface Props extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> {
  onClick: () => void | Promise<void>;
  loadingText?: string;
  successToast?: string;
  errorToast?: string;       // false => xato toast ko'rsatilmaydi
  confirmText?: string;      // bosish oldidan tasdiq prompt
  children?: React.ReactNode;
}

export default function AsyncButton({
  onClick,
  loadingText,
  successToast,
  errorToast,
  confirmText,
  children,
  className,
  disabled,
  ...rest
}: Props) {
  const [busy, setBusy] = useState(false);
  // Bir vaqtda ikki marta bosilishni mutlaq to'sish (state asinxron, ref sinxron)
  const lockRef = useRef(false);

  const handle = useCallback(async () => {
    if (lockRef.current || busy) return;
    if (confirmText && !window.confirm(confirmText)) return;
    lockRef.current = true;
    setBusy(true);
    try {
      await Promise.resolve(onClick());
      if (successToast) toast.success(successToast);
    } catch (err) {
      const msg = (err as Error)?.message || 'Xato sodir bo\'ldi';
      if (errorToast !== '' as never) toast.error(errorToast || msg);
      // jim qolmasin — konsolda ham yozamiz
      // eslint-disable-next-line no-console
      console.error('AsyncButton:', err);
    } finally {
      setBusy(false);
      lockRef.current = false;
    }
  }, [onClick, busy, confirmText, successToast, errorToast]);

  return (
    <button
      {...rest}
      type={rest.type ?? 'button'}
      onClick={handle}
      disabled={disabled || busy}
      aria-busy={busy}
      className={`${className ?? ''} ${busy ? 'cursor-wait opacity-70' : ''}`}
      style={{ position: 'relative' }}
    >
      {busy ? (
        <span className="inline-flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          {loadingText ?? 'Yuklanmoqda...'}
        </span>
      ) : (
        children
      )}
    </button>
  );
}
