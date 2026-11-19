import type { Cursa, Setari } from './types';

export type Stare = 'terminata' | 'in-curs' | 'urmatoarea' | 'viitoare';

export const ETICHETE_STARE: Record<Stare, string> = {
  terminata: 'Terminată',
  'in-curs': 'În curs',
  urmatoarea: 'Următoarea',
  viitoare: 'Viitoare',
};

const ORA = 3600_000;

function moment(data: string, hhmm: string): number {
  const [y, m, d] = data.split('-').map(Number);
  const [h, min] = hhmm.split(':').map(Number);
  return new Date(y, m - 1, d, h, min).getTime();
}

/**
 * Începutul și sfârșitul estimat al cursei (ms). Fără oră de plecare cursa ține toată ziua.
 * Sfârșitul = ora de retur + drumul înapoi; fără retur, plecarea + pragul „extra" (durata maximă obișnuită).
 */
export function interval(c: Cursa, setari: Pick<Setari, 'pragExtraOre' | 'drumInapoiOre'>): { start: number; sfarsit: number } {
  if (!c.plecare) {
    const start = moment(c.data, '00:00');
    return { start, sfarsit: start + 24 * ORA };
  }
  const start = moment(c.data, c.plecare);
  if (!c.retur) return { start, sfarsit: start + setari.pragExtraOre * ORA };
  let retur = moment(c.data, c.retur);
  if (retur < start) retur += 24 * ORA; // returul trece de miezul nopții
  return { start, sfarsit: retur + setari.drumInapoiOre * ORA };
}

/** Starea fiecărei curse; „următoarea" e singura viitoare cu cel mai apropiat început. */
export function stari(curse: Cursa[], setari: Setari, acum: number): Map<string, Stare> {
  const rezultat = new Map<string, Stare>();
  let urmatoarea: { id: string; start: number } | undefined;
  for (const c of curse) {
    const { start, sfarsit } = interval(c, setari);
    if (acum > sfarsit) rezultat.set(c.id, 'terminata');
    else if (acum >= start) rezultat.set(c.id, 'in-curs');
    else {
      rezultat.set(c.id, 'viitoare');
      if (!urmatoarea || start < urmatoarea.start) urmatoarea = { id: c.id, start };
    }
  }
  if (urmatoarea) rezultat.set(urmatoarea.id, 'urmatoarea');
  return rezultat;
}
