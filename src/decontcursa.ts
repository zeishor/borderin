import { calculeazaSold, type Totaluri } from './decont';
import { incasat } from './format';
import { zero } from './monede';
import { pretSpalare, spalariDecontate } from './spalatorie';
import type { Bilet, Cursa, Cursuri, Decont, Masina, Rezervare, Setari } from './types';

export interface AnalizaCursa {
  cursa: Cursa;
  /** Suma cursei încă nedecontată (0 dacă a intrat deja într-un decont sau nu are sumă). */
  sumaCursa: number;
  /** Toate biletele cursei, decontate sau nu. */
  bileteToate: Bilet[];
  /** Biletele încă nedecontate. */
  bilete: Bilet[];
  spalariToate: number;
  /** Spălările încă nedecontate: câte și cât. */
  spalari: { nr: number; suma: number };
  /** Banii încasați de la clienții cursei, pe monede. */
  incasat: Totaluri;
  /** Mai are ceva de decontat. */
  deDecontat: boolean;
  /** A avut lucruri decontate și nu mai are nimic de decontat. */
  decontata: boolean;
}

/** Tot ce ține de decontul unei cursei: suma ei, biletele, spălările și banii încasați la ea. Nu blochează nimic. */
export function analizaCursa(
  cursa: Cursa,
  ctx: { rezervari: Rezervare[]; bilete: Bilet[]; deconturi: Decont[]; masini: Masina[]; setari: Setari },
): AnalizaCursa {
  const decontate = new Set(ctx.deconturi.flatMap((d) => d.bilete));
  const inDecont = ctx.deconturi.some((d) => (d.curse ?? []).some((c) => c.cursaId === cursa.id));
  const bileteToate = ctx.bilete.filter((b) => b.cursaId === cursa.id);
  const bilete = bileteToate.filter((b) => !decontate.has(b.id));
  const spalariToate = cursa.spalari ?? 0;
  const spalariDeja = spalariDecontate(cursa.id, ctx.deconturi);
  const nr = Math.max(0, spalariToate - spalariDeja);
  const pret = pretSpalare(ctx.masini.find((m) => m.id === cursa.masinaId), ctx.setari);
  const sumaCursa = !inDecont && (cursa.sumaSofer ?? 0) > 0 ? (cursa.sumaSofer ?? 0) : 0;

  const deDecontat = sumaCursa > 0 || bilete.length > 0 || nr > 0;
  const avutDecontate = inDecont || bileteToate.length > bilete.length || spalariDeja > 0;
  return {
    cursa,
    sumaCursa,
    bileteToate,
    bilete,
    spalariToate,
    spalari: { nr, suma: nr * pret },
    incasat: incasat(ctx.rezervari.filter((r) => r.cursaId === cursa.id)),
    deDecontat,
    decontata: !deDecontat && avutDecontate,
  };
}

/** Rezultatul în lei pentru una sau mai multe curse: ce ai de luat minus banii încasați la ele. */
export function soldCurse(analize: AnalizaCursa[], cursuri: Cursuri, predat?: Totaluri) {
  const incasatTotal = zero();
  for (const a of analize) for (const m of Object.keys(incasatTotal) as (keyof Totaluri)[]) incasatTotal[m] += a.incasat[m];
  return calculeazaSold({
    curse: analize.reduce((t, a) => t + a.sumaCursa, 0),
    spalatorii: analize.reduce((t, a) => t + a.spalari.suma, 0),
    bilete: analize.flatMap((a) => a.bilete),
    predat: predat ?? incasatTotal,
    cursuri,
  });
}
