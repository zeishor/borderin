import { describe, expect, it } from 'vitest';
import { deIncasat, incasat, optiuniPlata, textBani } from './format';
import type { Plata, Rezervare } from './types';

const rez = (plata: Plata): Rezervare =>
  ({ id: 'x', cursaId: 'c', creat: 0, modificat: 0, directie: 'dus', nume: 'A', telefoane: [], pasageri: 1, plata }) as Rezervare;

describe('plăți', () => {
  it('variantele de plată vin din prețul scris', () => {
    const p: Plata = { stare: 'de_incasat', suma: 40, moneda: 'EUR', notaPret: '40 euro / 220 lei' };
    expect(optiuniPlata(p)).toEqual([
      { suma: 40, moneda: 'EUR' },
      { suma: 220, moneda: 'RON' },
    ]);
  });

  it('fără preț scris, doar suma setată; fără nimic, nicio variantă', () => {
    expect(optiuniPlata({ stare: 'de_incasat', suma: 15, moneda: 'EUR' })).toEqual([{ suma: 15, moneda: 'EUR' }]);
    expect(optiuniPlata({ stare: 'de_incasat', moneda: 'EUR' })).toEqual([]);
  });

  it('încasat scade din „de încasat" și se adună pe monede, separat', () => {
    const lista = [
      rez({ stare: 'de_incasat', suma: 40, moneda: 'EUR', notaPret: '40 euro / 220 lei', incasat: { suma: 220, moneda: 'RON' } }),
      rez({ stare: 'de_incasat', suma: 40, moneda: 'EUR' }),
      rez({ stare: 'de_incasat', suma: 40, moneda: 'EUR', incasat: { suma: 40, moneda: 'EUR' } }),
      rez({ stare: 'achitat', suma: 40, moneda: 'EUR' }),
    ];
    expect(deIncasat(lista)).toEqual({ RON: 0, EUR: 40, GBP: 0, CHF: 0 });
    expect(incasat(lista)).toEqual({ RON: 220, EUR: 40, GBP: 0, CHF: 0 });
    expect(textBani(incasat(lista))).toContain('+');
  });
});
