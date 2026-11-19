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
  it('preluare din altă localitate înainte de destinație', () => {
    const r = [rez('dus', 'Sacalaz, Str. A nr 5 (Ana) + Timisoara, Str. B (Ion)', 'Aeroport Budapesta')];
    expect(traseu(cursa('Budapesta'), r)).toEqual(['Timișoara', 'Sacalaz', 'Budapesta', 'Timișoara']);
  });
  it('retur în Arad (oraș, nu aeroport)', () => {
    const r = [rez('dus', 'Timisoara', 'Aeroport Budapesta'), rez('retur', 'Aeroport Budapesta', 'Arad')];
    expect(traseu(cursa('Budapesta'), r)).toEqual(['Timișoara', 'Budapesta', 'Arad', 'Timișoara']);
  });
  it('locuri din Timișoara (firmă, stradă) nu devin opriri', () => {
    const r = [rez('dus', 'Varroc', 'Aeroport Budapesta'), rez('dus', 'Str Exemplu 9', 'Aeroport Budapesta'), rez('retur', 'Aeroport Budapesta', 'Timisoara, Str. Test 1')];
    expect(traseu(cursa('Budapesta'), r)).toEqual(['Timișoara', 'Budapesta', 'Timișoara']);
  });
  it('localitate înaintea străzii, cu liniuță', () => {
    expect(traseu(cursa('Budapesta'), [rez('dus', 'GIROC-STR.DUNAREA 5', 'Aeroport Budapesta')])).toEqual(['Timișoara', 'Giroc', 'Budapesta', 'Timișoara']);
  });
});
