import { describe, expect, it } from 'vitest';
import { traseu } from './traseu';
import type { Cursa, Rezervare } from './types';

const cursa = (destinatie: string) => ({ destinatie }) as Cursa;
const rez = (directie: 'dus' | 'retur', preluare?: string, lasare?: string) => ({ directie, preluare, lasare }) as Rezervare;

describe('traseu', () => {
  it('dus-întors simplu', () => {
    expect(traseu(cursa('Budapesta'), [])).toEqual(['Timișoara', 'Budapesta', 'Timișoara']);
  });
  it('destinație dublă scrisă de utilizator', () => {
    expect(traseu(cursa('Budapesta - Arad'), [])).toEqual(['Timișoara', 'Budapesta', 'Arad', 'Timișoara']);
  });
  it('aeroporturile din rezervări adaugă opriri, fără dubluri', () => {
    const r = [rez('dus', 'Timisoara', 'Aeroport Budapesta'), rez('retur', 'Aeroport Arad', 'Timisoara'), rez('retur', 'Aeroport Budapesta')];
    expect(traseu(cursa('Budapesta'), r)).toEqual(['Timișoara', 'Budapesta', 'Arad', 'Timișoara']);
  });
});
