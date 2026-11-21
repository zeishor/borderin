import { describe, expect, it } from 'vitest';
import { cauta, celeMaiApropiate, distantaKm, gaseste, type Loc } from './localitati';
import type { Localitate } from './types';

const l = (nume: string, ascii: string, judet: string, lat: number, lon: number, pop: number): Loc => ({ nume, ascii, judet, lat, lon, pop });
const baza = [
  l('Buziaș', 'Buzias', 'Timiș', 45.65, 21.6, 7000),
  l('Șilagiu', 'Silagiu', 'Timiș', 45.64, 21.5, 3000),
  l('Arad', 'Arad', 'Arad', 46.18, 21.32, 150000),
  l('Timișoara', 'Timisoara', 'Timiș', 45.75, 21.23, 300000),
  l('Valea Mare', 'Valea Mare', 'Argeș', 44.9, 25.1, 3000),
  l('Valea Mare', 'Valea Mare', 'Vâlcea', 45.2, 24.1, 5000),
];

describe('localități', () => {
  it('căutare fără diacritice, începuturile întâi', () => {
    expect(cauta('sila', baza)[0].nume).toBe('Șilagiu');
    expect(cauta('buzias', baza)[0].nume).toBe('Buziaș');
    expect(cauta('a', baza)).toEqual([]);
    expect(cauta('mare', baza).map((x) => x.judet)).toEqual(['Vâlcea', 'Argeș']);
  });
  it('găsește numele exact, cea mai mare dacă sunt mai multe', () => {
    expect(gaseste('SILAGIU', baza)?.judet).toBe('Timiș');
    expect(gaseste('Valea Mare', baza)?.judet).toBe('Vâlcea');
    expect(gaseste('Necunoscut', baza)).toBeUndefined();
  });
  it('distanța Timișoara–Arad e de circa 50 km', () => {
    const d = distantaKm(baza[3], baza[2]);
    expect(d).toBeGreaterThan(45);
    expect(d).toBeLessThan(65);
  });
  it('mama cea mai apropiată', () => {
    const mame: Localitate[] = [
      { id: 'a', nume: 'Arad', sumaRon: 200 },
      { id: 'b', nume: 'Buziaș', sumaRon: 120 },
      { id: 'x', nume: 'FaraCoordonate', sumaRon: 1 },
    ];
    const r = celeMaiApropiate('Șilagiu', mame, baza);
    expect(r[0].mama.id).toBe('b');
    expect(r[0].km).toBeLessThan(15);
    expect(r).toHaveLength(2);
    expect(celeMaiApropiate('Lugoj', mame, baza)).toEqual([]);
  });
});
