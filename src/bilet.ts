import type { MonedaBilet } from './types';

export interface BiletExtras {
  suma?: number;
  moneda?: MonedaBilet;
  /** YYYY-MM-DDTHH:MM */
  intrare?: string;
  iesire?: string;
  numar?: string;
}

const pad = (n: string | number) => String(n).padStart(2, '0');
const MONEDE: Record<string, MonedaBilet> = { huf: 'HUF', ft: 'HUF', eur: 'EUR', '€': 'EUR', ron: 'RON', lei: 'RON' };
const CUVINTE_TOTAL = /total|fizet|[öo]sszeg|amount|paid|payable|sum|de plat|plat[aă]/i;
const NUMAR = String.raw`\d{1,3}(?:[ .,]\d{3})+(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?`;

function numar(brut: string): number {
  const t = brut.trim().replace(/\s/g, '');
  if (/^\d{1,3}([.,]\d{3})+$/.test(t)) return Number(t.replace(/[.,]/g, ''));
  if (/^\d{1,3}([.,]\d{3})+[.,]\d{1,2}$/.test(t)) {
    const i = Math.max(t.lastIndexOf('.'), t.lastIndexOf(','));
    return Number(t.slice(0, i).replace(/[.,]/g, '') + '.' + t.slice(i + 1));
  }
  return Number(t.replace(',', '.'));
}

function sume(text: string): { suma: number; moneda: MonedaBilet; prioritate: number }[] {
  const rezultat: { suma: number; moneda: MonedaBilet; prioritate: number }[] = [];
  for (const linie of text.split(/\r?\n/)) {
    const prioritate = CUVINTE_TOTAL.test(linie) ? 1 : 0;
    const dupa = new RegExp(`(${NUMAR})\\s*(huf|ft|eur|€|ron|lei)(?![a-z])`, 'gi');
    const inainte = new RegExp(`(huf|ft|eur|€|ron|lei)\\s*[:.]?\\s*(${NUMAR})`, 'gi');
    for (const m of linie.matchAll(dupa)) rezultat.push({ suma: numar(m[1]), moneda: MONEDE[m[2].toLowerCase()], prioritate });
    for (const m of linie.matchAll(inainte)) rezultat.push({ suma: numar(m[2]), moneda: MONEDE[m[1].toLowerCase()], prioritate });
  }
  return rezultat.filter((x) => x.suma > 0);
}

function momente(text: string): string[] {
  const gasite: string[] = [];
  const an1 = /(\d{4})\s*[.\-/]\s*(\d{1,2})\s*[.\-/]\s*(\d{1,2})\.?\s+(\d{1,2})\s*[:.]\s*(\d{2})/g;
  for (const m of text.matchAll(an1)) gasite.push(`${m[1]}-${pad(m[2])}-${pad(m[3])}T${pad(m[4])}:${m[5]}`);
  const an2 = /(\d{1,2})\s*[./-]\s*(\d{1,2})\s*[./-]\s*(\d{4})\s+(\d{1,2})\s*[:.]\s*(\d{2})/g;
  for (const m of text.matchAll(an2)) gasite.push(`${m[3]}-${pad(m[2])}-${pad(m[1])}T${pad(m[4])}:${m[5]}`);
  return [...new Set(gasite)].sort();
}

/** Extrage suma, ora de intrare/ieșire și numărul biletului din textul citit de OCR. */
export function parseBilet(text: string): BiletExtras {
  const rez: BiletExtras = {};

  const toate = sume(text);
  if (toate.length) {
    const cea = [...toate].sort((a, b) => b.prioritate - a.prioritate || b.suma - a.suma)[0];
    rez.suma = cea.suma;
    rez.moneda = cea.moneda;
  }

  const m = momente(text);
  if (m.length) rez.intrare = m[0];
  if (m.length > 1) rez.iesire = m[m.length - 1];

  const fara = text.replace(/\d{4}\s*[.\-/]\s*\d{1,2}\s*[.\-/]\s*\d{1,2}\.?\s+\d{1,2}\s*[:.]\s*\d{2}/g, ' ');
  const etichetat = fara.match(/(?:ticket|jegy|nr|no|id|#)\D{0,6}(\d{5,})/i);
  const liber = fara.match(/\b(\d{8,})\b/);
  const n = etichetat?.[1] ?? liber?.[1];
  if (n) rez.numar = n;

  return rez;
}
