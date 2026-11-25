import { describe, expect, it } from 'vitest';
import { oreSugerate } from './ore';
import { rezervareNoua } from './importa';

const setari = { oreInainteZbor: 2, drumDusOre: 3, diferentaFusOre: 1 };

describe('oreSugerate', () => {
  it('fără fus (destinație în România): zbor 15:10 → 10:00', () => {
    const r = [rezervareNoua('c', { directie: 'dus', ora: '15:10', zbor: 'W6 2289' })];
    expect(oreSugerate(r, setari, 'Arad').plecare).toBe('10:00');
  });
  it('Budapesta: ora zborului e cu o oră în urmă, plecarea se mută cu o oră', () => {
    const r = [rezervareNoua('c', { directie: 'dus', ora: '15:10', zbor: 'W6 2289' })];
    expect(oreSugerate(r, setari, 'Budapesta').plecare).toBe('11:00');
  });
  it('folosește cel mai devreme zbor', () => {
    const r = [
      rezervareNoua('c', { directie: 'dus', ora: '18:00', orasZbor: 'STR' }),
      rezervareNoua('c', { directie: 'dus', ora: '14:40', orasZbor: 'STR' }),
    ];
    expect(oreSugerate(r, setari, 'Arad').plecare).toBe('09:30');
  });
  it('fără zbor, ora nu e decolare: nu propune plecarea', () => {
    expect(oreSugerate([rezervareNoua('c', { directie: 'dus', ora: '12:00' })], setari).plecare).toBeUndefined();
  });
  it('returul: cea mai târzie preluare', () => {
    const r = [
      rezervareNoua('c', { directie: 'retur', ora: '16:40' }),
      rezervareNoua('c', { directie: 'retur', ora: '17:15' }),
    ];
    expect(oreSugerate(r, setari).retur).toBe('17:15');
  });
  it('nu trece înainte de miezul nopții', () => {
    const r = [rezervareNoua('c', { directie: 'dus', ora: '04:00', zbor: 'FR1' })];
    expect(oreSugerate(r, setari, 'Arad').plecare).toBe('00:00');
  });
});
