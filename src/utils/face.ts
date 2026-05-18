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
): { user: T; distance: number } | null {
  let best: { user: T; distance: number } | null = null;
  for (const u of candidates) {
    if (!u.faceDescriptor || u.faceDescriptor.length === 0) continue;
    const d = descriptorDistance(probe, u.faceDescriptor);
    if (!best || d < best.distance) {
      best = { user: u, distance: d };
    }
  }
  if (best && best.distance <= maxDistance) return best;
  return null;
}
