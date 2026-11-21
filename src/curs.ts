import type { Cursuri, Moneda, MonedaBilet, MonedaCurs } from './types';

export const MONEDE_CURS: MonedaCurs[] = ['EUR', 'GBP', 'CHF', 'HUF'];

type Orice = Moneda | MonedaBilet;

/** Cursul față de leu: RON = 1; lipsește → undefined. */
export function cursPentru(moneda: Orice, cursuri: Cursuri): number | undefined {
  if (moneda === 'RON') return 1;
  const c = cursuri[moneda];
  return c && c > 0 ? c : undefined;
}

/** Suma în lei, sau undefined dacă lipsește cursul monedei. */
export function inRon(suma: number, moneda: Orice, cursuri: Cursuri): number | undefined {
  const c = cursPentru(moneda, cursuri);
  return c === undefined ? undefined : suma * c;
}

/** „5,5" sau „5.5" → 5.5; gol sau invalid → undefined. */
export function citesteCurs(text: string): number | undefined {
  const n = Number(text.trim().replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : undefined;
}
