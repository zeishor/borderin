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
    const inainte = new RegExp(`(?<![a-z])(huf|ft|eur|€|ron|lei)\\s*[:.]?\\s*(${NUMAR})`, 'gi');
    for (const m of linie.matchAll(dupa)) rezultat.push({ suma: numar(m[1]), moneda: MONEDE[m[2].toLowerCase()], prioritate });
    for (const m of linie.matchAll(inainte)) rezultat.push({ suma: numar(m[2]), moneda: MONEDE[m[1].toLowerCase()], prioritate });
  }
  return rezultat.filter((x) => x.suma > 0);
}

const LINIE_PLATA = /visa|master|card|k[eé]szp|cash|paid|fizet|ft\.?\s*\d/i;

interface Moment {
  iso: string;
  linie: string;
}

function momente(text: string): Moment[] {
  const gasite: Moment[] = [];
  const adauga = (iso: string, linie: string) => {
    if (!gasite.some((g) => g.iso === iso)) gasite.push({ iso, linie });
  };
  for (const linie of text.split(/\r?\n/)) {
    for (const m of linie.matchAll(/(\d{4})\s*[.\-/]\s*(\d{1,2})\s*[.\-/]\s*(\d{1,2})\.?\s+(\d{1,2})\s*[:.]\s*(\d{2})/g)) {
      adauga(`${m[1]}-${pad(m[2])}-${pad(m[3])}T${pad(m[4])}:${m[5]}`, linie);
    }
    for (const m of linie.matchAll(/(\d{1,2})\s*[./-]\s*(\d{1,2})\s*[./-]\s*(\d{4})\s+(\d{1,2})\s*[:.]\s*(\d{2})/g)) {
      adauga(`${m[3]}-${pad(m[2])}-${pad(m[1])}T${pad(m[4])}:${m[5]}`, linie);
    }
    // Format maghiar AA.LL.ZZ HH:MM (ex. 26.11.14 17:11); ora poate fi lipită de dată.
    for (const m of linie.matchAll(/(?<!\d)(\d{2})[.,](\d{2})[.,](\d{2})\s*(\d{1,2}):(\d{2})/g)) {
      const [an, luna, zi] = [Number(m[1]), Number(m[2]), Number(m[3])];
      if (an >= 20 && an <= 39 && luna >= 1 && luna <= 12 && zi >= 1 && zi <= 31) {
        adauga(`20${m[1]}-${m[2]}-${m[3]}T${pad(m[4])}:${m[5]}`, linie);
      }
    }
  }
  return gasite.sort((x, y) => x.iso.localeCompare(y.iso));
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

  const ms = momente(text);
  const platit = ms.find((x) => LINIE_PLATA.test(x.linie));
  if (platit) {
    // Rândul cu plata (ex. „26.11.14 17:11 10 VISA") e momentul ieșirii.
    rez.iesire = platit.iso;
    const inainte = ms.find((x) => x !== platit && x.iso <= platit.iso);
    if (inainte) rez.intrare = inainte.iso;
  } else if (ms.length) {
    rez.intrare = ms[0].iso;
    if (ms.length > 1) rez.iesire = ms[ms.length - 1].iso;
  }

  const etichetat = text.match(/\b(?:ticket|jegy|nr|no|id)\b\.?:?\s*#?(\d{5,})/i);
  const codat = text.match(/<\s*(\d{12,})\s*>/);
  const n = etichetat?.[1] ?? codat?.[1];
  if (n) rez.numar = n;

  return rez;
}
