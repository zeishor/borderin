import { describe, expect, it } from 'vitest';
import { aplicaPret, calculeazaSuma, gasesteMama, necunoscute } from './preturi';
import type { Cursa, Localitate } from './types';

const loc: Localitate[] = [
  { id: 'b', nume: 'Budapesta', sumaRon: 500 },
  { id: 'a', nume: 'Arad', sumaRon: 200 },
  { id: 'bz', nume: 'Buziaș', sumaRon: 120 },
  { id: 'sg', nume: 'Șilagiu', mamaId: 'bz' },
];

describe('prețuri', () => {
  it('potrivire fără diacritice și majuscule, și prin limitrofă', () => {
    expect(gasesteMama('BUDAPESTA', loc)?.id).toBe('b');
    expect(gasesteMama('silagiu', loc)?.id).toBe('bz');
    expect(gasesteMama('Lugoj', loc)).toBeUndefined();
  });
  it('limitrofă fără mamă existentă nu are preț', () => {
    expect(gasesteMama('X', [{ id: 'x', nume: 'X', mamaId: 'lipsa' }])).toBeUndefined();
  });
  it('cursa ia cea mai scumpă oprire', () => {
    const r = calculeazaSuma(['Arad', 'Budapesta'], loc);
    expect(r.suma).toBe(500);
    expect(r.sursa).toContain('Budapesta');
    expect(r.sursa).toContain('cea mai scumpă');
  });
  it('limitrofa arată calea spre mamă', () => {
    const r = calculeazaSuma(['Șilagiu'], loc);
    expect(r).toMatchObject({ suma: 120, sursa: 'Șilagiu → Buziaș' });
  });
  it('o oprire fără preț blochează suma', () => {
    const r = calculeazaSuma(['Arad', 'Lugoj'], loc);
    expect(r.suma).toBeUndefined();
    expect(r.necunoscute).toEqual(['Lugoj']);
    expect(necunoscute(['Arad', 'Lugoj'], loc)).toEqual(['Lugoj']);
  });
  it('fără opriri nu e nimic de calculat', () => {
    expect(calculeazaSuma([], loc)).toEqual({ necunoscute: [] });
  });
  it('aplicaPret scoate suma veche când lipsește un preț', () => {
    const c = { id: 'c', sumaSofer: 100 } as Cursa;
    expect(aplicaPret(c, calculeazaSuma(['Lugoj'], loc)).sumaSofer).toBeUndefined();
  });
});
