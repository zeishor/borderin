import { traseu } from './traseu';
import type { Cursa, Localitate, Rezervare } from './types';

export const SURSA_MANUALA = 'manual';

export const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

/** Opririle cursei, fără Timișoara de la capete. */
export function opririCursa(cursa: Cursa, rezervari: Rezervare[]): string[] {
  const t = traseu(cursa, rezervari);
  return t.slice(1, -1);
}

/** Mama cu preț pentru o oprire (mamă sau limitrofă), dacă o știm. */
export function gasesteMama(nume: string, localitati: Localitate[]): Localitate | undefined {
  const n = norm(nume);
  const gasita = localitati.find((l) => norm(l.nume) === n);
  if (!gasita) return undefined;
  const mama = gasita.mamaId ? localitati.find((l) => l.id === gasita.mamaId) : gasita;
  return mama && mama.sumaRon !== undefined ? mama : undefined;
}

export function necunoscute(opriri: string[], localitati: Localitate[]): string[] {
  return opriri.filter((o) => !gasesteMama(o, localitati));
}

export interface PretCalculat {
  suma?: number;
  /** De unde vine suma, sau ce lipsește. */
  sursa?: string;
  necunoscute: string[];
}

/** Suma cursei = cea mai mare sumă dintre opriri. Dacă vreo oprire nu are preț, nu se alege nicio sumă. */
export function calculeazaSuma(opriri: string[], localitati: Localitate[]): PretCalculat {
  const lipsa = necunoscute(opriri, localitati);
  if (lipsa.length) return { necunoscute: lipsa, sursa: `Preț lipsă: ${lipsa.join(', ')}` };
  let cel: { oprire: string; mama: Localitate } | undefined;
  for (const o of opriri) {
    const mama = gasesteMama(o, localitati)!;
    if (!cel || (mama.sumaRon ?? 0) > (cel.mama.sumaRon ?? 0)) cel = { oprire: o, mama };
  }
  if (!cel) return { necunoscute: [] };
  const cale = norm(cel.oprire) === norm(cel.mama.nume) ? cel.oprire : `${cel.oprire} → ${cel.mama.nume}`;
  const multe = opriri.length > 1 ? ` (cea mai scumpă din ${opriri.join(' + ')})` : '';
  return { suma: cel.mama.sumaRon, sursa: cale + multe, necunoscute: [] };
}

/** Pune suma calculată pe cursă (sau scoate suma veche dacă acum lipsește un preț). */
export function aplicaPret(cursa: Cursa, calc: PretCalculat): Cursa {
  return { ...cursa, sumaSofer: calc.suma, sumaSursa: calc.sursa };
}
