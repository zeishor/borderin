import { describe, expect, it } from 'vitest';
import { deIncasat, incasat } from './format';
import type { Rezervare } from './types';

const rez = (plata: Rezervare['plata']) => ({ plata }) as Rezervare;

describe('restanțe în totaluri', () => {
  it('de încasat = preț + restanță; încasezi doar prețul → rămâne restanța', () => {
    const r = rez({ stare: 'de_incasat', moneda: 'EUR', suma: 40, incasat: { suma: 40, moneda: 'EUR' }, extra: [{ suma: 50, moneda: 'EUR' }] });
    expect(deIncasat([r]).EUR).toBe(50);
    expect(incasat([r]).EUR).toBe(40);
  });
  it('restanța încasată intră în încasat; o rezervare achitată cu restanță arată doar restanța', () => {
    const r = rez({ stare: 'achitat', moneda: 'EUR', extra: [{ suma: 50, moneda: 'EUR', incasat: { suma: 50, moneda: 'EUR' } }] });
    expect(incasat([r]).EUR).toBe(50);
    expect(deIncasat([r]).EUR).toBe(0);
    const f = rez({ stare: 'achitat', moneda: 'EUR', extra: [{ suma: 50, moneda: 'EUR' }] });
    expect(deIncasat([f]).EUR).toBe(50);
  });
});
