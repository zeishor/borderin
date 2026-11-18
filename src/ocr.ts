/** Reduce poza (telefoanele fac poze de 12 MP), ca OCR-ul să fie rapid. Fără filtre: au dat rezultate mai slabe. */
async function pregateste(foto: Blob): Promise<HTMLCanvasElement> {
  const bmp = await createImageBitmap(foto, { imageOrientation: 'from-image' });
  const scara = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bmp.width * scara);
  canvas.height = Math.round(bmp.height * scara);
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close();
  return canvas;
}

/** Worker OCR gata de folosit (se poate refolosi pe mai multe cadre; se închide cu terminate()). */
export async function creeazaWorker(progres?: (p: number) => void) {
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
  await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_BLOCK });
  return worker;
}

/** Cadrul curent din camera video, redus la cel mult `maxDim` pixeli pe latura lungă. */
export function canvasDinVideo(video: HTMLVideoElement, maxDim: number): HTMLCanvasElement {
  const scara = Math.min(1, maxDim / Math.max(video.videoWidth, video.videoHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(video.videoWidth * scara);
  canvas.height = Math.round(video.videoHeight * scara);
  canvas.getContext('2d')!.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas;
}

type Worker = Awaited<ReturnType<typeof creeazaWorker>>;
type DateOcr = Awaited<ReturnType<Worker['recognize']>>['data'];

/** Citește tot cadrul, cu poziția rândurilor (necesară pentru a căuta rândul cu intrarea). */
export async function recunoaste(worker: Worker, canvas: HTMLCanvasElement): Promise<DateOcr> {
  const { data } = await worker.recognize(canvas, {}, { blocks: true });
  return data;
}

/** O bandă orizontală din cadru, mărită și cu contrast întins, citită ca un singur rând. */
async function citesteBanda(worker: Worker, canvas: HTMLCanvasElement, x0: number, y0: number, x1: number, y1: number): Promise<string> {
  const { PSM } = await import('tesseract.js');
  const w = Math.max(1, Math.round(x1 - x0));
  const h = Math.max(1, Math.round(y1 - y0));
  const scara = Math.max(1, Math.min(4, 200 / h));
  const banda = document.createElement('canvas');
  banda.width = Math.round(w * scara);
  banda.height = Math.round(h * scara);
  const ctx = banda.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(canvas, x0, y0, w, h, 0, 0, banda.width, banda.height);

  const img = ctx.getImageData(0, 0, banda.width, banda.height);
  const d = img.data;
  const hist = new Uint32Array(256);
  for (let i = 0; i < d.length; i += 4) {
    const g = Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]);
    d[i] = g;
    hist[g]++;
  }
  const total = d.length / 4;
  let acc = 0;
  let lo = 0;
  while (lo < 255 && (acc += hist[lo]) < total * 0.02) lo++;
  acc = 0;
  let hi = 255;
  while (hi > lo + 1 && (acc += hist[hi]) < total * 0.02) hi--;
  const interval = Math.max(1, hi - lo);
  for (let i = 0; i < d.length; i += 4) {
    const c = Math.max(0, Math.min(255, ((d[i] - lo) * 255) / interval));
    d[i] = d[i + 1] = d[i + 2] = c;
  }
  ctx.putImageData(img, 0, 0);

  await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_LINE });
  try {
    return (await worker.recognize(banda)).data.text;
  } finally {
    await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_BLOCK });
  }
}

const MOMENT = /\d{2}\s*[.,]\s*\d{2}\s*[.,]\s*\d{2}\s*\d{1,2}\s*:\s*\d{2}/;

/**
 * Rândul cu ora de intrare e înghesuit între „Terminál Parking" și codul <…> și iese prost la citirea
 * întregului cadru. Pornind de la rândul cu numere (2/3030…/1250…), citește zona de dedesubt pe benzi
 * suprapuse, câte un rând, până găsește o dată cu oră. Întoarce textul benzii sau un șir gol.
 */
export async function cautaIntrarea(worker: Worker, canvas: HTMLCanvasElement, data: DateOcr): Promise<string> {
  const linii = data.blocks?.flatMap((b) => b.paragraphs.flatMap((p) => p.lines)) ?? [];
  const ancora = linii.find((l) => /\d{5,}\s*[\/,]+\s*\d{5,}/.test(l.text));
  const inaltimi = linii
    .flatMap((l) => l.words)
    .filter((c) => c.text.length >= 2)
    .map((c) => c.bbox.y1 - c.bbox.y0)
    .sort((a, b) => a - b);
  if (!ancora || inaltimi.length === 0) return '';

  const pas = 1.35 * inaltimi[Math.floor(inaltimi.length / 2)];
  const x0 = Math.max(0, ancora.bbox.x0);
  const x1 = Math.min(canvas.width, ancora.bbox.x1);
  const sfarsit = ancora.bbox.y1 + 3.4 * pas;
  for (let y = ancora.bbox.y1 - 0.25 * pas; y < sfarsit; y += 0.4 * pas) {
    const sus = Math.max(0, y);
    const jos = Math.min(canvas.height, y + 1.5 * pas);
    if (jos - sus < 10) break;
    const text = await citesteBanda(worker, canvas, x0, sus, x1, jos);
    if (MOMENT.test(text)) return text;
  }
  return '';
}

/** Citește textul din poză, local pe telefon (fără internet, fără costuri). */
export async function recunoasteText(foto: Blob, progres?: (p: number) => void): Promise<string> {
  const imagine = await pregateste(foto);
  const worker = await creeazaWorker(progres);
  try {
    const data = await recunoaste(worker, imagine);
    const intrare = await cautaIntrarea(worker, imagine, data);
    return intrare ? `${data.text}\n${intrare}` : data.text;
  } finally {
    await worker.terminate();
  }
}
