import { calculeazaSold, type Totaluri } from './decont';
import { incasat } from './format';
import { zero } from './monede';
import { incluseInSalariu } from './locale';
import { pretSpalare, spalariDecontate } from './spalatorie';
import type { Bilet, Cheltuiala, Cursa, Cursuri, Decont, Masina, Rezervare, Setari } from './types';

export interface AnalizaCursa {
  cursa: Cursa;
  /** Suma cursei încă nedecontată: suma curentă minus ce s-a decontat deja (0 dacă nu are sumă sau e inclusă în salariu). */
  sumaCursa: number;
  /** Cursă locală inclusă în salariu: suma ei nu se decontează, banii încasați da. */
  inclusaInSalariu: boolean;
  /** Toate biletele cursei, decontate sau nu. */
  bileteToate: Bilet[];
  /** Biletele încă nedecontate. */
  bilete: Bilet[];
  spalariToate: number;
  /** Cheltuielile extra încă nedecontate. */
  cheltuieli: Cheltuiala[];
  cheltuieliToate: Cheltuiala[];
  /** Spălările încă nedecontate: câte și cât. */
  spalari: { nr: number; suma: number };
  /** Banii încasați de la clienții cursei și încă nepredați într-un decont, pe monede. */
  incasat: Totaluri;
  /** Toți banii încasați la cursă, predați sau nu. */
  incasatTotal: Totaluri;
  /** Mai are ceva de decontat. */
  deDecontat: boolean;
  /** A avut lucruri decontate și nu mai are nimic de decontat. */
  decontata: boolean;
}

/** Tot ce ține de decontul unei cursei: suma ei, biletele, spălările și banii încasați la ea. Nu blochează nimic. */
export function analizaCursa(
  cursa: Cursa,
  ctx: {
    rezervari: Rezervare[];
    bilete: Bilet[];
    deconturi: Decont[];
    masini: Masina[];
    setari: Setari;
    curse?: Cursa[];
    cheltuieli?: Cheltuiala[];
  },
): AnalizaCursa {
  const decontate = new Set(ctx.deconturi.flatMap((d) => d.bilete));
  const intrari = ctx.deconturi.flatMap((d) => (d.curse ?? []).filter((c) => c.cursaId === cursa.id));
  // Cursa a trecut printr-un decont (chiar cu suma 0): banii încasați la ea nu se mai cer a doua oară.
  const inDecont = intrari.length > 0;
  const sumaDecontata = intrari.reduce((t, c) => t + c.suma, 0);
  const inclusa = ctx.curse ? incluseInSalariu(ctx.curse, ctx.setari.curseLocaleInclusePeLuna).has(cursa.id) : false;
  const bileteToate = ctx.bilete.filter((b) => b.cursaId === cursa.id);
  const bilete = bileteToate.filter((b) => !decontate.has(b.id));
  const cheltuieliDecontate = new Set(ctx.deconturi.flatMap((d) => d.cheltuieli ?? []));
  const cheltuieliToate = (ctx.cheltuieli ?? []).filter((x) => x.cursaId === cursa.id);
  const cheltuieli = cheltuieliToate.filter((x) => !cheltuieliDecontate.has(x.id));
  const spalariToate = cursa.spalari ?? 0;
  const spalariDeja = spalariDecontate(cursa.id, ctx.deconturi);
  const nr = Math.max(0, spalariToate - spalariDeja);
  const pret = pretSpalare(ctx.masini.find((m) => m.id === cursa.masinaId), ctx.setari);
  // Suma se poate seta și după decont: ce depășește ce s-a decontat deja rămâne de decontat.
  const sumaCursa = inclusa ? 0 : Math.max(0, (cursa.sumaSofer ?? 0) - sumaDecontata);

  const incasatTotal = incasat(ctx.rezervari.filter((r) => r.cursaId === cursa.id));
  const incasatDeDecontat = inDecont ? zero() : incasatTotal;
  const areBani = Object.values(incasatDeDecontat).some((x) => x > 0);

  // Și o cursă fără sumă se decontează dacă s-au încasat bani la ea: se înțelege șoferul cu cine face decontul și setează suma după.
  const deDecontat = sumaCursa > 0 || bilete.length > 0 || cheltuieli.length > 0 || nr > 0 || areBani;
  const avutDecontate = inDecont || bileteToate.length > bilete.length || cheltuieliToate.length > cheltuieli.length || spalariDeja > 0;
  return {
    cursa,
    sumaCursa,
    inclusaInSalariu: inclusa,
    bileteToate,
    bilete,
    cheltuieli,
    cheltuieliToate,
    spalariToate,
    spalari: { nr, suma: nr * pret },
    incasat: incasatDeDecontat,
    incasatTotal,
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
    bilete: analize.flatMap((a) => [...a.bilete, ...a.cheltuieli]),
    predat: predat ?? incasatTotal,
    cursuri,
  });
}
