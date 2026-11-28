import { describe, expect, it } from 'vitest';
import { bileteNedecontate, calculeazaSold, curseNedecontate, monedeNecesareCurs, restDePredat, totalBilete, totalPredat, venitLuna, impartire, textImpartire } from './decont';
import type { Bilet, Cursa, Decont, Rezervare } from './types';

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

  const zero = { RON: 0, EUR: 0, GBP: 0, CHF: 0 };
  const cursa = (id: string, data: string, sumaSofer?: number) => ({ id, data, sumaSofer }) as Cursa;

  it('cursele cu sumă și nedecontate', () => {
    const curse = [cursa('a', '2026-11-01', 300), cursa('b', '2026-11-02'), cursa('c', '2026-11-03', 200)];
    const d = [{ ...dec('1', zero), curse: [{ cursaId: 'a', suma: 300 }] }];
    expect(curseNedecontate(curse, d).map((c) => c.id)).toEqual(['c']);
  });
  it('soldul net: valuta predată la curs, diferența în lei', () => {
    // ai de luat 1500 lei; predai 200 EUR la 5,5 = 1100 lei → primești 400 lei
    const r = calculeazaSold({ curse: 1400, spalatorii: 100, bilete: [], predat: { ...zero, EUR: 200 }, cursuri: { EUR: 5.5 } });
    expect(r).toEqual({ deLuat: 1500, predat: 1100, sold: 400, lipsa: [] });
  });
  it('dacă ai predat mai mult decât ai de luat, soldul e negativ (de predat)', () => {
    const r = calculeazaSold({ curse: 300, spalatorii: 60, bilete: [], predat: { ...zero, RON: 500 }, cursuri: {} });
    expect(r.sold).toBe(-140);
  });
  it('biletele în valută intră la curs; lipsa cursului e semnalată', () => {
    const bilete = [{ id: 'x', suma: 10000, moneda: 'HUF' } as Bilet, { id: 'y', suma: 20, moneda: 'EUR' } as Bilet];
    const cu = calculeazaSold({ curse: 0, spalatorii: 0, bilete, predat: zero, cursuri: { HUF: 0.0135, EUR: 5 } });
    expect(cu.deLuat).toBe(235);
    const fara = calculeazaSold({ curse: 0, spalatorii: 0, bilete, predat: { ...zero, GBP: 10 }, cursuri: { EUR: 5 } });
    expect(fara.lipsa.sort()).toEqual(['GBP', 'HUF']);
  });
  it('monedele pentru care trebuie curs', () => {
    const bilete = [{ id: 'x', suma: 100, moneda: 'HUF' } as Bilet, { id: 'y', suma: 5, moneda: 'RON' } as Bilet];
    expect(monedeNecesareCurs({ ...zero, EUR: 3, RON: 9 }, bilete).sort()).toEqual(['EUR', 'HUF']);
  });
  it('venitul lunii: salariu + cursele din lună', () => {
    const curse = [cursa('a', '2026-11-01', 300), cursa('b', '2026-11-20', 200), cursa('c', '2026-12-01', 999), cursa('d', '2026-11-05')];
    expect(venitLuna(curse, 4000, '2026-11')).toEqual({ salariu: 4000, curse: 500, nr: 2, total: 4500, incluse: 0 });
    expect(venitLuna(curse, 4000, '2026-11', new Set(['b']))).toEqual({ salariu: 4000, curse: 300, nr: 1, total: 4300, incluse: 1 });
  });
});

describe('impartire: oprești partea ta și predai restul', () => {
  const cursuri = { EUR: 5, GBP: 6 };
  const bani = (EUR: number, RON: number, GBP = 0) => ({ EUR, RON, GBP, CHF: 0 });
  it('partea oprită întâi din lei, apoi din euro; euro întregi, mărunțișul în lei', () => {
    const i = impartire(bani(400, 440), 1584, cursuri);
    expect(i).toEqual({ preda: bani(171, 1), primeste: 0 });
    expect(textImpartire(i)).toBe('De predat: 171 € + 1 lei');
  });
  it('leii ajung: predai tot euro și restul de lei', () => {
    expect(impartire(bani(100, 2000), 1584, cursuri).preda).toEqual(bani(100, 416));
  });
  it('partea ta e mai mare: păstrezi tot și mai ai de luat', () => {
    expect(impartire(bani(80, 440), 1584, cursuri)).toEqual({ preda: bani(0, 0), primeste: 744 });
  });
  it('euro se consumă înaintea lirelor', () => {
    expect(impartire(bani(100, 0, 50), 620, cursuri).preda).toEqual(bani(0, 0, 30));
  });
  it('exact cât partea ta', () => {
    expect(textImpartire(impartire(bani(100, 0), 500, cursuri))).toBe('Nimic de predat, nimic de luat');
  });
  it('predat + oprit = încasat, în lei', () => {
    for (const parte of [0, 1, 439, 440, 441, 1000.5, 2439, 2440]) {
      const i = impartire(bani(400, 440), parte, { EUR: 4.97 });
      expect(i.preda.EUR * 4.97 + i.preda.RON).toBeCloseTo(Math.max(0, 400 * 4.97 + 440 - parte), 1);
    }
  });
});
