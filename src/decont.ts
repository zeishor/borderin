import { incasat } from './format';
import { MONEDE, zero } from './monede';
import { inRon } from './curs';
import type { Bilet, Cursa, Cursuri, Decont, Moneda, MonedaBilet, Rezervare } from './types';

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

/** Orice cu sumă și monedă de bilet: bilete de parcare, cheltuieli extra. */
export type SumaMoneda = { suma?: number; moneda: MonedaBilet };

const rotunjeste = (x: number) => Math.round(x * 100) / 100;

/** Cursele cu sumă pentru șofer care nu au intrat încă într-un decont. */
export function curseNedecontate(curse: Cursa[], deconturi: Decont[]): Cursa[] {
  const deja = new Set(deconturi.flatMap((d) => (d.curse ?? []).map((c) => c.cursaId)));
  return curse.filter((c) => (c.sumaSofer ?? 0) > 0 && !deja.has(c.id));
}

export interface Sold {
  /** Ce are de luat șoferul de la firmă, în lei. */
  deLuat: number;
  /** Valoarea în lei a banilor predați (valuta la curs). */
  predat: number;
  /** deLuat − predat: pozitiv = de primit de la firmă, negativ = de predat. */
  sold: number;
  /** Monedele fără curs, care nu au putut fi transformate în lei. */
  lipsa: string[];
}

/**
 * Decontul net, în lei: ce ai de luat (curse, spălătorie, bilete la curs) minus valoarea la curs a banilor predați.
 * Firma plătește doar în lei, deci diferența iese într-o singură sumă.
 */
export function calculeazaSold(p: {
  curse: number;
  spalatorii: number;
  bilete: SumaMoneda[];
  predat: Totaluri;
  cursuri: Cursuri;
}): Sold {
  const lipsa = new Set<string>();
  let deLuat = p.curse + p.spalatorii;
  for (const b of p.bilete) {
    if (!b.suma) continue;
    const ron = inRon(b.suma, b.moneda, p.cursuri);
    if (ron === undefined) lipsa.add(b.moneda);
    else deLuat += ron;
  }
  let predat = 0;
  for (const m of MONEDE) {
    if (!p.predat[m]) continue;
    const ron = inRon(p.predat[m], m, p.cursuri);
    if (ron === undefined) lipsa.add(m);
    else predat += ron;
  }
  return { deLuat: rotunjeste(deLuat), predat: rotunjeste(predat), sold: rotunjeste(deLuat - predat), lipsa: [...lipsa] };
}

/** Monedele străine folosite într-un decont (predate sau în bilete), pentru care trebuie un curs. */
export function monedeNecesareCurs(predat: Totaluri, bilete: SumaMoneda[]): (Moneda | MonedaBilet)[] {
  const folosite = new Set<Moneda | MonedaBilet>();
  for (const m of MONEDE) if (predat[m] > 0) folosite.add(m);
  for (const b of bilete) if (b.suma) folosite.add(b.moneda);
  folosite.delete('RON');
  return [...folosite];
}

/** Ce ai luat într-o lună: salariul de bază plus suma curselor din acea lună (după data cursei). `luna` = „AAAA-LL". */
export function venitLuna(
  curse: Cursa[],
  salariuBaza: number,
  luna: string,
  incluse: Set<string> = new Set(),
): { salariu: number; curse: number; nr: number; total: number; incluse: number } {
  // Cursele locale incluse în salariu nu se adaugă a doua oară.
  const dinLuna = curse.filter((c) => c.data.startsWith(luna) && (c.sumaSofer ?? 0) > 0 && !incluse.has(c.id));
  const nrIncluse = curse.filter((c) => c.data.startsWith(luna) && incluse.has(c.id)).length;
  const sumaCurse = dinLuna.reduce((t, c) => t + (c.sumaSofer ?? 0), 0);
  return { salariu: salariuBaza, curse: sumaCurse, nr: dinLuna.length, total: rotunjeste(salariuBaza + sumaCurse), incluse: nrIncluse };
}
