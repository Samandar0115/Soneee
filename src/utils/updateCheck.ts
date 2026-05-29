// Yangi deploy aniqlash — Vercel'ga yangi versiya chiqsa, foydalanuvchiga
// "Yangilash" taklif qilamiz. index.html'dagi hashlangan entry fayl nomi
// har build'da o'zgaradi; shuni taqqoslab yangilanishni bilamiz.

let currentEntry: string | null = null;

function entryFromHtml(html: string): string | null {
  const m = html.match(/assets\/index-[\w-]+\.js/);
  return m ? m[0] : null;
}

// Hozir yuklangan entry faylni eslab qolamiz (bir marta, ilova ochilganda)
export function initCurrentEntry(): void {
  if (currentEntry) return;
  const scripts = Array.from(document.querySelectorAll('script[src]')) as HTMLScriptElement[];
  for (const s of scripts) {
    const m = s.src.match(/assets\/index-[\w-]+\.js/);
    if (m) { currentEntry = m[0]; return; }
  }
}

// Serverdagi yangi versiyani tekshirish. true => yangilanish bor.
export async function checkForUpdate(): Promise<boolean> {
  try {
    const res = await fetch(`/?_v=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return false;
    const html = await res.text();
    const latest = entryFromHtml(html);
    if (!latest) return false;
    if (!currentEntry) { currentEntry = latest; return false; }
    return latest !== currentEntry;
  } catch {
    return false;
  }
}
