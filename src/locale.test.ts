import { describe, expect, it } from 'vitest';
import { incluseInSalariu, statusLocala } from './locale';
import type { Cursa } from './types';

const c = (id: string, data: string, locala = true, creat = 0) => ({ id, data, locala, creat }) as Cursa;

describe('curse locale incluse în salariu', () => {
  const curse = [c('a', '2026-11-03'), c('b', '2026-11-10'), c('c', '2026-11-20'), c('d', '2026-12-01'), c('x', '2026-11-05', false)];
  it('primele N locale din lună sunt incluse, restul se decontează', () => {
    expect([...incluseInSalariu(curse, 2)].sort()).toEqual(['a', 'b', 'd']);
    expect(statusLocala(curse, curse[2], 2)).toEqual({ inclusa: false, rang: 3, total: 3, limita: 2 });
  });
  it('limita 0: nimic inclus; cursa nelocală nu are status', () => {
    expect(incluseInSalariu(curse, 0).size).toBe(0);
    expect(statusLocala(curse, curse[4], 2)).toBeUndefined();
  });
  it('luna se numără separat', () => {
    expect(statusLocala(curse, curse[3], 1)).toMatchObject({ inclusa: true, rang: 1, total: 1 });
  });
});
