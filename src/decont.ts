import { incasat } from './format';
import { MONEDE, zero } from './monede';
import type { Bilet, Decont, Moneda, MonedaBilet, Rezervare } from './types';

export type Totaluri = Record<Moneda, number>;

/** Banii predați la firmă până acum, pe monede. */
export function totalPredat(deconturi: Decont[]): Totaluri {
  const t: Totaluri = zero();
  for (const d of deconturi) for (const m of MONEDE) t[m] += d.predat[m] || 0;
  return t;
}

/** Banii încasați de la clienți și încă nepredați (poate ieși negativ dacă ai predat mai mult). */
export function restDePredat(rezervari: Rezervare[], deconturi: Decont[]): Totaluri {
  const i = incasat(rezervari);
  const p = totalPredat(deconturi);
  const r = zero();
  for (const m of MONEDE) r[m] = i[m] - p[m];
  return r;
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
