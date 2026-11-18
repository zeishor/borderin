import { incasat } from './format';
import type { Bilet, Decont, Moneda, MonedaBilet, Rezervare } from './types';

export type Totaluri = Record<Moneda, number>;

const MONEDE: Moneda[] = ['RON', 'EUR'];

/** Banii predați la firmă până acum, pe monede. */
export function totalPredat(deconturi: Decont[]): Totaluri {
  const t: Totaluri = { RON: 0, EUR: 0 };
  for (const d of deconturi) for (const m of MONEDE) t[m] += d.predat[m] || 0;
  return t;
}

/** Banii încasați de la clienți și încă nepredați (poate ieși negativ dacă ai predat mai mult). */
export function restDePredat(rezervari: Rezervare[], deconturi: Decont[]): Totaluri {
  const i = incasat(rezervari);
  const p = totalPredat(deconturi);
  return { RON: i.RON - p.RON, EUR: i.EUR - p.EUR };
}

export function idBileteDecontate(deconturi: Decont[]): Set<string> {
  return new Set(deconturi.flatMap((d) => d.bilete));
}

export function bileteNedecontate(bilete: Bilet[], deconturi: Decont[]): Bilet[] {
  const deja = idBileteDecontate(deconturi);
  return bilete.filter((b) => !deja.has(b.id));
}

/** Suma biletelor, separat pe monede. */
export function totalBilete(bilete: Bilet[]): Partial<Record<MonedaBilet, number>> {
  const t: Partial<Record<MonedaBilet, number>> = {};
  for (const b of bilete) if (b.suma) t[b.moneda] = (t[b.moneda] ?? 0) + b.suma;
  return t;
}
