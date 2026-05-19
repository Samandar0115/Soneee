export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent;
  const mobileRegex = /Mobi|Android|iPhone|iPod|IEMobile|BlackBerry/i;
  if (mobileRegex.test(ua)) return true;
  if (/iPad/.test(ua)) return true;
  const touchOnly = (navigator.maxTouchPoints ?? 0) > 0;
  const smallScreen = window.matchMedia('(max-width: 768px)').matches;
  return touchOnly && smallScreen;
}

export function isMacLike(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent;
  return /Mac|iPhone|iPad|iPod/.test(ua);
}

export type OS = 'mac' | 'windows' | 'linux' | 'ios' | 'android' | 'other';

export function detectOS(): OS {
  if (typeof window === 'undefined') return 'other';
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) return 'ios';
  if (/Android/.test(ua)) return 'android';
  if (/Mac/.test(ua)) return 'mac';
  if (/Windows/.test(ua)) return 'windows';
  if (/Linux/.test(ua)) return 'linux';
  return 'other';
}

/** Joriy OS uchun eng yaxshi callto/tel/sip URL sxemasi */
export function defaultCallScheme(): 'callto' | 'tel' | 'sip' {
  const os = detectOS();
  if (os === 'windows') return 'callto'; // MicroSIP
  if (os === 'mac') return 'sip';         // Linphone / Telephone
  if (os === 'linux') return 'sip';       // Linphone
  return 'tel';                            // Mobil
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
