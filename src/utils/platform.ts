export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent;
  const mobileRegex = /Mobi|Android|iPhone|iPod|IEMobile|BlackBerry/i;
  if (mobileRegex.test(ua)) return true;
  // iPad maxsus
  if (/iPad/.test(ua)) return true;
  // Touch device + small screen
  const touchOnly = (navigator.maxTouchPoints ?? 0) > 0;
  const smallScreen = window.matchMedia('(max-width: 768px)').matches;
  return touchOnly && smallScreen;
}

export function isMacLike(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent;
  return /Mac|iPhone|iPad|iPod/.test(ua);
}

/** Platform'ga moslangan tezkor klavish yorlig'i (matn) — telefonda null. */
export function searchShortcutLabel(): string | null {
  if (isMobileDevice()) return null;
  return isMacLike() ? '⌘K' : 'Ctrl+F';
}

/** Detalroq — ikona shaklida masalan ⌘+K vs Ctrl+F bo'limlari */
export function searchShortcutKeys(): string[] | null {
  if (isMobileDevice()) return null;
  return isMacLike() ? ['⌘', 'K'] : ['Ctrl', 'F'];
}
