import { describe, expect, it } from 'vitest';
import { rezervareNoua } from './importa';
import type { Loc } from './localitati';
import {
  AEROPORT, GRANITA, START, calculeazaOrar, cheiePereche, interogare, localitateDin, opririDinRezervari, oraDin, ordineOptima,
} from './ruta';
import type { PlanPreluare } from './types';

const loc = (nume: string): Loc => ({ nume, ascii: nume, judet: '', lat: 45, lon: 21, pop: 1 });
const baza = [loc('Timisoara'), loc('Arad'), loc('Ghiroda')];

describe('opriri', () => {
  it('desparte grupele și adună pasagerii de la aceeași adresă', () => {
    const o = opririDinRezervari([
      rezervareNoua('c', { nume: 'Ana', pasageri: 3, preluare: 'Timisoara, str. Unu 1 (2 pax) + Timisoara, str. Doi 2 (colt) (1 pax)' }),
      rezervareNoua('c', { nume: 'Ion', pasageri: 1, preluare: 'Timisoara, str. Unu 1' }),
      rezervareNoua('c', { directie: 'retur', preluare: 'Aeroport Budapesta' }),
    ]);
    expect(o.map((x) => [x.adresa, x.pasageri, x.nume])).toEqual([
      ['Timisoara, str. Unu 1', 3, ['Ana', 'Ion']],
      ['Timisoara, str. Doi 2 (colt)', 1, ['Ana']],
    ]);
  });
  it('localitatea adresei', () => {
    expect(localitateDin('Arad, Piața Test, blocul A1', baza)).toBe('Arad');
    expect(localitateDin('Pecica str. 505 nr 6', baza)).toBe('Pecica');
    expect(localitateDin('Str. Exemplu 4, Ghiroda', baza)).toBe('Ghiroda');
    expect(localitateDin('str. Exemplu 4', baza)).toBe('Timisoara');
  });
  it('textul de căutat: strada întâi, fără paranteze', () => {
    expect(interogare('Ghiroda, str Exemplu 1 (lângă magazin)')).toBe('str Exemplu 1, Ghiroda');
    expect(interogare('Pecica str. 505 nr 6')).toBe('Pecica str. 505 nr 6');
  });
});

describe('ordine și orar', () => {
  it('alege ordinea cea mai scurtă până la graniță', () => {
    const x: Record<string, number> = { [START]: 0, a: 1, b: 2, c: 3, [GRANITA]: 4 };
    expect(ordineOptima(['c', 'a', 'b'], (p, q) => Math.abs(x[p] - x[q]))).toEqual(['a', 'b', 'c']);
  });
  it('la multe opriri păstrează toate și le ordonează', () => {
    const chei = ['9', '2', '7', '4', '1', '8', '3', '6', '5'];
    const x = (k: string) => (k === START ? 0 : k === GRANITA ? 10 : Number(k));
    expect(ordineOptima(chei, (p, q) => Math.abs(x(p) - x(q)))).toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9']);
  });
  it('calculează înapoi de la ieșirea din țară', () => {
    const plan: PlanPreluare = {
      opriri: ['a', 'b'].map((cheie) => ({ cheie, adresa: cheie, nume: [], pasageri: 1 })),
      durate: {
        [cheiePereche(START, 'a')]: 15,
        [cheiePereche('a', 'b')]: 60,
        [cheiePereche('b', GRANITA)]: 40,
        [cheiePereche(GRANITA, AEROPORT)]: 150,
      },
      corectii: { [cheiePereche('b', GRANITA)]: 30 },
      estimat: false,
    };
    const o = calculeazaOrar(plan, 6 * 60 + 30, 5, 20);
    expect(oraDin(o.granita)).toBe('06:10');
    expect(o.opriri.map((s) => oraDin(s.ora))).toEqual(['04:30', '05:35']);
    expect(oraDin(o.plecare)).toBe('04:15');
    expect(oraDin(o.aeroport)).toBe('09:00');
  });
  it('trece peste miezul nopții', () => {
    expect(oraDin(-30)).toBe('23:30 (ziua dinainte)');
  });
});
