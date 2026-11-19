import { describe, expect, it } from 'vitest';
import { pretSpalare, spalariDecontate, spalariNedecontate } from './spalatorie';
import type { Cursa, Decont, Masina, Setari } from './types';

const setari = { spalatorieMicaRon: 30, spalatorieMareRon: 50 } as Setari;
const masina = (locuri: number) => ({ locuri }) as Masina;
const decont = (cursaId: string, nr: number) => ({ spalatorii: [{ cursaId, nr, suma: 0 }] }) as Decont;

describe('spălătorie', () => {
  it('prețul după mărimea mașinii', () => {
    expect(pretSpalare(masina(4), setari)).toBe(30);
    expect(pretSpalare(masina(8), setari)).toBe(50);
    expect(pretSpalare(undefined, setari)).toBe(0);
  });
  it('nedecontate = spălări − decontate; deconturile vechi fără câmp contează 0', () => {
    const c = { id: 'a', spalari: 3 } as Cursa;
    expect(spalariNedecontate(c, [{} as Decont])).toBe(3);
    expect(spalariDecontate('a', [decont('a', 2), decont('b', 5)])).toBe(2);
    expect(spalariNedecontate(c, [decont('a', 2)])).toBe(1);
    expect(spalariNedecontate({ id: 'a' } as Cursa, [])).toBe(0);
  });
});
