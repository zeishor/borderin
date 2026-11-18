import { describe, expect, it } from 'vitest';
import { bileteNedecontate, restDePredat, totalBilete, totalPredat } from './decont';
import type { Bilet, Decont, Rezervare } from './types';

const rez = (suma: number, moneda: 'EUR' | 'RON') =>
  ({ plata: { stare: 'de_incasat', moneda, incasat: { suma, moneda } } }) as Rezervare;
const dec = (id: string, predat: Decont['predat'], bilete: string[] = []): Decont => ({
  id, creat: 0, data: '2026-11-18', predat, bilete,
});
const bil = (id: string, suma: number) => ({ id, suma, moneda: 'HUF' }) as Bilet;

describe('decont', () => {
  it('restul de predat scade cu fiecare decont parțial', () => {
    const r = [rez(40, 'EUR'), rez(15, 'EUR'), rez(220, 'RON')];
    const d = [dec('1', { RON: 0, EUR: 30, GBP: 0, CHF: 0 }), dec('2', { RON: 100, EUR: 10, GBP: 0, CHF: 0 })];
    expect(totalPredat(d)).toEqual({ RON: 100, EUR: 40, GBP: 0, CHF: 0 });
    expect(restDePredat(r, d)).toEqual({ RON: 120, EUR: 15, GBP: 0, CHF: 0 });
  });
  it('biletele decontate nu mai apar', () => {
    const b = [bil('a', 600), bil('b', 400)];
    expect(bileteNedecontate(b, [dec('1', { RON: 0, EUR: 0, GBP: 0, CHF: 0 }, ['a'])]).map((x) => x.id)).toEqual(['b']);
    expect(totalBilete(b)).toEqual({ HUF: 1000 });
  });
});
