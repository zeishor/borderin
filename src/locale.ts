import type { Cursa } from './types';

export interface StatusLocala {
  /** Cursa e între primele N curse locale ale lunii: e inclusă în salariu și nu se decontează. */
  inclusa: boolean;
  /** Al câtelea e între cursele locale ale lunii (de la 1, după dată). */
  rang: number;
  /** Câte curse locale are luna. */
  total: number;
  /** Câte pot fi incluse în salariu pe lună. */
  limita: number;
}

const luna = (c: Cursa) => c.data.slice(0, 7);

/** Cursele locale ale lunii cursei, în ordinea datei (la dată egală, după crearea în aplicație). */
function localeLuna(curse: Cursa[], cursa: Cursa): Cursa[] {
  return curse
    .filter((c) => c.locala && luna(c) === luna(cursa))
    .sort((a, b) => a.data.localeCompare(b.data) || a.creat - b.creat || a.id.localeCompare(b.id));
}

/** Starea unei curse locale față de limita lunară; undefined dacă nu e locală. */
export function statusLocala(curse: Cursa[], cursa: Cursa, limita: number): StatusLocala | undefined {
  if (!cursa.locala) return undefined;
  const lista = localeLuna(curse, cursa);
  const rang = lista.findIndex((c) => c.id === cursa.id) + 1;
  return { inclusa: rang > 0 && rang <= limita, rang, total: lista.length, limita };
}

/** Id-urile curselor locale incluse în salariu (primele `limita` din fiecare lună). */
export function incluseInSalariu(curse: Cursa[], limita: number): Set<string> {
  const rezultat = new Set<string>();
  if (limita <= 0) return rezultat;
  for (const c of curse) if (statusLocala(curse, c, limita)?.inclusa) rezultat.add(c.id);
  return rezultat;
}
