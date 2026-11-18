import type { Moneda } from './types';

/** Monedele în care se poate încasa, în ordinea afișării. */
export const MONEDE: Moneda[] = ['EUR', 'RON', 'GBP', 'CHF'];

export const SIMBOL: Record<Moneda, string> = { EUR: '€', RON: 'lei', GBP: '£', CHF: 'CHF' };

/** Cuvintele/simbolurile recunoscute în mesaje, ca alternativă de regex. */
export const CUVINTE_MONEDA =
  'euro|eur|€|lei|ron|lire(?:\\s+sterline)?|lira|gbp|£|franci(?:\\s+elve[tț]ieni)?|franc|chf';

/** „lei" → RON, „lire"/„£" → GBP, „franci"/„CHF" → CHF, altfel EUR. */
export function monedaDinCuvant(cuvant: string): Moneda {
  const c = cuvant.toLowerCase();
  if (/^(lei|ron)$/.test(c)) return 'RON';
  if (/^(lir|gbp|£)/.test(c)) return 'GBP';
  if (/^(franc|chf)/.test(c)) return 'CHF';
  return 'EUR';
}

export function zero(): Record<Moneda, number> {
  return { EUR: 0, RON: 0, GBP: 0, CHF: 0 };
}
