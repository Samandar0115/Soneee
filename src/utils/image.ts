// Rasm hajmini bazaga yuborishdan oldin kichraytirish.
// 6+ xodim rasmi katta base64 sifatida saqlanganda kolleksiya 4.5 MB cheklovidan
// oshib ketib saqlanmayotgan edi. Endi har bir rasm ~10-40 KB ga keladi.

export interface CompressOptions {
  maxDim?: number;     // eng katta tomon piksel (default 400)
  quality?: number;    // JPEG sifati 0..1 (default 0.78)
  mimeType?: string;   // default 'image/jpeg'
}

export async function compressImageDataUrl(
  dataUrl: string,
  opts: CompressOptions = {}
): Promise<string> {
  const maxDim = opts.maxDim ?? 400;
  const quality = opts.quality ?? 0.78;
  const mimeType = opts.mimeType ?? 'image/jpeg';

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const ratio = Math.min(1, maxDim / Math.max(img.width, img.height));
      const w = Math.round(img.width * ratio);
      const h = Math.round(img.height * ratio);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      try {
        const out = canvas.toDataURL(mimeType, quality);
        resolve(out.length < dataUrl.length ? out : dataUrl);
      } catch {
        resolve(dataUrl);
      }
    };
    img.onerror = () => reject(new Error('Rasm yuklanmadi'));
    img.src = dataUrl;
  });
}
