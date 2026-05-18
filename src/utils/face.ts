import * as faceapi from 'face-api.js';

// Face-api modellarini CDN'dan yuklaymiz (~3 MB jami)
const MODEL_URL =
  'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights';

let modelsLoaded = false;
let loadingPromise: Promise<void> | null = null;

export async function loadFaceModels(): Promise<void> {
  if (modelsLoaded) return;
  if (loadingPromise) return loadingPromise;
  loadingPromise = (async () => {
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ]);
    modelsLoaded = true;
  })();
  return loadingPromise;
}

export async function computeDescriptor(
  source: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement
): Promise<Float32Array | null> {
  await loadFaceModels();
  const opt = new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 });
  const result = await faceapi
    .detectSingleFace(source, opt)
    .withFaceLandmarks(true)
    .withFaceDescriptor();
  return result?.descriptor ?? null;
}

export function descriptorDistance(a: Float32Array | number[], b: Float32Array | number[]): number {
  const len = Math.min(a.length, b.length);
  let sum = 0;
  for (let i = 0; i < len; i++) {
    const d = (a as number[])[i] - (b as number[])[i];
    sum += d * d;
  }
  return Math.sqrt(sum);
}

/**
 * Distance -> similarity %.
 * 0.0 distance = 100% (perfect), ~0.6 = 0% (no match).
 * 0.5 distance ≈ 17%, 0.4 ≈ 33%, 0.3 ≈ 50%, 0.2 ≈ 67%, 0.1 ≈ 83%.
 */
export function distanceToSimilarity(distance: number): number {
  const sim = (1 - distance / 0.6) * 100;
  return Math.max(0, Math.min(100, Math.round(sim)));
}

/**
 * Mirror flip yordamida video frame'idan deskriptor olish.
 * Telefon kameralari ba'zan mirror, ba'zan teskari ko'rinishda kadr beradi.
 * Ikkala variantni hisoblab, eng yaxshi mosligini qaytaramiz.
 */
export async function computeDescriptorBoth(
  video: HTMLVideoElement
): Promise<{ normal: Float32Array | null; mirrored: Float32Array | null }> {
  await loadFaceModels();
  const w = video.videoWidth || 640;
  const h = video.videoHeight || 480;

  // Normal kadr
  const c1 = document.createElement('canvas');
  c1.width = w;
  c1.height = h;
  const ctx1 = c1.getContext('2d');
  if (!ctx1) return { normal: null, mirrored: null };
  ctx1.drawImage(video, 0, 0, w, h);

  // Mirror kadr (gorizontal aks)
  const c2 = document.createElement('canvas');
  c2.width = w;
  c2.height = h;
  const ctx2 = c2.getContext('2d');
  if (!ctx2) return { normal: null, mirrored: null };
  ctx2.translate(w, 0);
  ctx2.scale(-1, 1);
  ctx2.drawImage(video, 0, 0, w, h);

  const [normal, mirrored] = await Promise.all([
    computeDescriptor(c1),
    computeDescriptor(c2),
  ]);
  return { normal, mirrored };
}

// Tashqi rasmni dataURL'dan descriptor'ga aylantirish
export async function imageDataUrlToDescriptor(dataUrl: string): Promise<Float32Array | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = async () => {
      try {
        const desc = await computeDescriptor(img);
        resolve(desc);
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}

// Eng yaqin user'ni topish (faceDescriptor ko'rsatilgan)
export function findBestMatch<T extends { faceDescriptor?: number[] }>(
  candidates: T[],
  probe: Float32Array,
  maxDistance = 0.5
): { user: T; distance: number; similarity: number } | null {
  let best: { user: T; distance: number } | null = null;
  for (const u of candidates) {
    if (!u.faceDescriptor || u.faceDescriptor.length === 0) continue;
    const d = descriptorDistance(probe, u.faceDescriptor);
    if (!best || d < best.distance) {
      best = { user: u, distance: d };
    }
  }
  if (best && best.distance <= maxDistance) {
    return { ...best, similarity: distanceToSimilarity(best.distance) };
  }
  return null;
}

/**
 * Bir nechta probe (normal + mirror) bilan har bir candidate uchun eng yaxshi
 * mosligini topish. minSimilarity foizidan past bo'lsa null qaytaradi.
 */
export function findBestMatchMulti<T extends { faceDescriptor?: number[] }>(
  candidates: T[],
  probes: (Float32Array | null)[],
  minSimilarity = 50
): { user: T; distance: number; similarity: number; mirrored: boolean } | null {
  let best: { user: T; distance: number; mirrored: boolean } | null = null;
  for (const u of candidates) {
    if (!u.faceDescriptor || u.faceDescriptor.length === 0) continue;
    for (let i = 0; i < probes.length; i++) {
      const p = probes[i];
      if (!p) continue;
      const d = descriptorDistance(p, u.faceDescriptor);
      if (!best || d < best.distance) {
        best = { user: u, distance: d, mirrored: i === 1 };
      }
    }
  }
  if (!best) return null;
  const similarity = distanceToSimilarity(best.distance);
  if (similarity < minSimilarity) return null;
  return { ...best, similarity };
}
