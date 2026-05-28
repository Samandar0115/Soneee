// Dars videolari uchun lokal saqlash (IndexedDB).
// Videolar katta bo'lgani uchun KV/localStorage'ga emas, shu qurilmaning
// IndexedDB'siga saqlanadi. Matn, test, tip va case'lar esa KV orqali
// barcha qurilmalarda sinxronlanadi. Cross-device video uchun havola (URL)
// ishlatiladi yoki .exe (lokal) versiyada videolar PC'da turadi.

const DB_NAME = 'ipost-lms';
const STORE = 'videos';
const DB_VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function putLessonVideo(lessonId: string, blob: Blob): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(blob, lessonId);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

export async function getLessonVideo(lessonId: string): Promise<Blob | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(lessonId);
    req.onsuccess = () => { db.close(); resolve((req.result as Blob) ?? null); };
    req.onerror = () => { db.close(); reject(req.error); };
  });
}

export async function deleteLessonVideo(lessonId: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(lessonId);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

export async function getLessonVideoUrl(lessonId: string): Promise<string | null> {
  try {
    const blob = await getLessonVideo(lessonId);
    if (!blob) return null;
    return URL.createObjectURL(blob);
  } catch {
    return null;
  }
}
