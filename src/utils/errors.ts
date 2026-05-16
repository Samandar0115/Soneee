import toast from 'react-hot-toast';

export function handleFirestoreError(scope: string, error: unknown) {
  const payload = {
    scope,
    code: (error as { code?: string })?.code ?? 'unknown',
    message: (error as { message?: string })?.message ?? String(error),
    timestamp: new Date().toISOString(),
  };
  console.error('[firestore-error]', JSON.stringify(payload, null, 2));
  toast.error(`${scope}: ${payload.code === 'unknown' ? payload.message : payload.code}`);
}
