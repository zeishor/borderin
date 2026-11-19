import type { Cursa, Decont, Masina, Setari } from './types';

/** Suma fixă (RON) pentru o spălare: mașina mare are peste 4 locuri. Fără mașină nu se știe: 0. */
export function pretSpalare(masina: Masina | undefined, setari: Setari): number {
  if (!masina) return 0;
  return masina.locuri > 4 ? setari.spalatorieMareRon : setari.spalatorieMicaRon;
}

export function spalariDecontate(cursaId: string, deconturi: Decont[]): number {
  let n = 0;
  for (const d of deconturi) for (const s of d.spalatorii ?? []) if (s.cursaId === cursaId) n += s.nr;
  return n;
}

export function spalariNedecontate(c: Cursa, deconturi: Decont[]): number {
  return Math.max(0, (c.spalari ?? 0) - spalariDecontate(c.id, deconturi));
}
