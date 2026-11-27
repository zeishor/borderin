import { describe, expect, it } from 'vitest';
import { rezervareNoua } from './importa';
import type { Loc } from './localitati';
import {
  AEROPORT, GRANITA, START, calculeazaOrar, cheiePereche, interogare, localitateDin, opririDinRezervari, centruLocalitate, oraDin, ordineOptima, interogari, stradaSiNumar,
} from './ruta';
import { alegeRezultat } from './ors';
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
  it('strada și numărul, fără „nr.", scară sau observații', () => {
    const s = (a: string, l = 'Timisoara') => stradaSiNumar(a, l);
    expect(s('Timisoara, Str. Exemplu Unu nr. 26')).toEqual({ strada: 'Strada Exemplu Unu', numar: '26' });
    expect(s('Timisoara, Str. Exemplu, nr. 7, Sc. B')).toEqual({ strada: 'Strada Exemplu', numar: '7' });
    expect(s('Timisoara, str. Test 37 (colt cu magazinul)')).toEqual({ strada: 'Strada Test', numar: '37' });
    expect(s('Pecica str. 505 nr 6', 'Pecica')).toEqual({ strada: 'Strada 505', numar: '6' });
    expect(s('Arad, Calea Exemplu 5', 'Arad')).toEqual({ strada: 'Calea Exemplu', numar: '5' });
    expect(s('Timisoara, Grigore Exemplu 172, bl. A3, ap. 12')).toEqual({ strada: 'Strada Grigore Exemplu', numar: '172' });
    expect(s('Ghiroda, str Exemplu nr 1', 'Ghiroda')).toEqual({ strada: 'Strada Exemplu', numar: '1' });
  });
  it('variantele de căutare', () => {
    expect(interogari('Timisoara, Str. Exemplu nr. 7, Sc. B', 'Timisoara')).toEqual([
      'Strada Exemplu 7, Timisoara',
      'Exemplu 7, Timisoara',
      'Strada Exemplu, Timisoara',
    ]);
  });
  it('localitate urmată de număr', () => {
    expect(localitateDin('Ghiroda 56, statia 369', baza)).toBe('Ghiroda');
    expect(interogari('Ghiroda 56, statia 369', 'Ghiroda')).toEqual(['Ghiroda 56']);
  });
  it('alege strada cerută, nu centrul orașului sau altă stradă', () => {
    const f = (layer: string, label: string) => ({ geometry: { coordinates: [21, 45] }, properties: { layer, label, locality: 'Timişoara' } });
    const oras = f('locality', 'Timişoara, Romania');
    expect(alegeRezultat([oras, f('street', 'Strada Altceva, Timişoara')], 'Timisoara', 'Strada Exemplu')?.precis).toBe(false);
    expect(
      alegeRezultat([oras, f('street', 'Strada Exemplu, Timişoara'), f('address', 'Strada Exemplu 7, Timişoara')], 'Timisoara', 'Strada Exemplu'),
    ).toMatchObject({ precis: true, eticheta: 'Strada Exemplu 7, Timişoara' });
  });
  it('o stradă cu numele satului, în alt oraș, nu e satul', () => {
    const f = { geometry: { coordinates: [26.1, 44.4] }, properties: { layer: 'address', label: 'Strada Bucovăț 56, Bucureşti', name: 'Strada Bucovăț 56', locality: 'Bucureşti' } };
    expect(alegeRezultat([f], 'Bucovat', '')).toBeUndefined();
  });
  it('dintre localitățile omonime o ia pe cea de lângă Timișoara', () => {
    const departe = { ...loc('Bucovat'), lat: 44.3, lon: 23.7, pop: 5000 };
    const aproape = { ...loc('Bucovat'), lat: 45.76, lon: 21.38 };
    expect(centruLocalitate('Bucovat', [departe, aproape])).toBe(aproape);
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
