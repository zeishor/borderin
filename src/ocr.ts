/** Reduce poza (telefoanele fac poze de 12 MP) și o face alb-negru, ca OCR-ul să fie rapid și mai exact. */
async function pregateste(foto: Blob): Promise<HTMLCanvasElement> {
  const bmp = await createImageBitmap(foto, { imageOrientation: 'from-image' });
  const scara = Math.min(1, 1800 / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bmp.width * scara);
  canvas.height = Math.round(bmp.height * scara);
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close();

  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    const c = Math.max(0, Math.min(255, (g - 128) * 1.4 + 128));
    d[i] = d[i + 1] = d[i + 2] = c;
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

/** Citește textul din poză, local pe telefon (fără internet, fără costuri). */
export async function recunoasteText(foto: Blob, progres?: (p: number) => void): Promise<string> {
  const imagine = await pregateste(foto);
  const { createWorker } = await import('tesseract.js');
  const baza = new URL(import.meta.env.BASE_URL + 'tesseract/', location.href).href;
  const worker = await createWorker('eng', 1, {
    workerPath: baza + 'worker.min.js',
    corePath: baza,
    langPath: baza,
    gzip: true,
    logger: (m) => {
      if (m.status === 'recognizing text') progres?.(m.progress);
    },
  });
  try {
    const { data } = await worker.recognize(imagine);
    return data.text;
  } finally {
    await worker.terminate();
  }
}
