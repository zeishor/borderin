/** Reduce poza (telefoanele fac poze de 12 MP), ca OCR-ul să fie rapid. Fără filtre: au dat rezultate mai slabe. */
async function pregateste(foto: Blob): Promise<HTMLCanvasElement> {
  const bmp = await createImageBitmap(foto, { imageOrientation: 'from-image' });
  const scara = Math.min(1, 2400 / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bmp.width * scara);
  canvas.height = Math.round(bmp.height * scara);
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close();
  return canvas;
}

/** Citește textul din poză, local pe telefon (fără internet, fără costuri). */
export async function recunoasteText(foto: Blob, progres?: (p: number) => void): Promise<string> {
  const imagine = await pregateste(foto);
  const { createWorker, PSM } = await import('tesseract.js');
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
    await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_BLOCK });
    const { data } = await worker.recognize(imagine);
    return data.text;
  } finally {
    await worker.terminate();
  }
}
