import { describe, expect, it } from 'vitest';
import { stari } from './stare';
import type { Cursa, Setari } from './types';

const setari: Setari = { pragExtraOre: 16, drumInapoiOre: 4.5, spalatorieMicaRon: 0, spalatorieMareRon: 0, cursuri: {}, salariuBazaRon: 0 };
const c = (id: string, data: string, plecare?: string, retur?: string) => ({ id, data, plecare, retur }) as Cursa;
const la = (data: string, hhmm: string) => new Date(`${data}T${hhmm}:00`).getTime();

describe('stari', () => {
  it('terminată, în curs, următoarea și viitoare', () => {
    const curse = [
      c('a', '2026-11-18', '08:00', '16:00'),
      c('b', '2026-11-19', '08:00', '16:00'),
      c('c', '2026-11-20', '09:00', '17:00'),
      c('d', '2026-11-22', '09:00', '17:00'),
    ];
    const s = stari(curse, setari, la('2026-11-19', '10:00'));
    expect([...s.values()]).toEqual(['terminata', 'in-curs', 'urmatoarea', 'viitoare']);
  });
  it('rămâne în curs până la retur + drumul înapoi', () => {
    const curse = [c('a', '2026-11-19', '08:00', '16:00')];
    expect(stari(curse, setari, la('2026-11-19', '20:00')).get('a')).toBe('in-curs');
    expect(stari(curse, setari, la('2026-11-19', '20:31')).get('a')).toBe('terminata');
  });
  it('retur după miezul nopții', () => {
    const curse = [c('a', '2026-11-19', '20:00', '01:00')];
    expect(stari(curse, setari, la('2026-11-20', '03:00')).get('a')).toBe('in-curs');
  });
  it('fără oră: toată ziua în curs, apoi terminată', () => {
    const curse = [c('a', '2026-11-19')];
    expect(stari(curse, setari, la('2026-11-19', '23:00')).get('a')).toBe('in-curs');
    expect(stari(curse, setari, la('2026-11-20', '00:01')).get('a')).toBe('terminata');
  });
  it('fără curse viitoare nu există „următoarea"', () => {
    const s = stari([c('a', '2026-11-01', '08:00', '16:00')], setari, la('2026-11-19', '10:00'));
    expect([...s.values()]).toEqual(['terminata']);
  });
});
