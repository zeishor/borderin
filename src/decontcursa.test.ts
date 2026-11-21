import { describe, expect, it } from 'vitest';
import { analizaCursa, soldCurse } from './decontcursa';
import type { Bilet, Cursa, Decont, Masina, Rezervare, Setari } from './types';

const setari = { spalatorieMicaRon: 30, spalatorieMareRon: 50, cursuri: { EUR: 5.5 }, curseLocaleInclusePeLuna: 0 } as unknown as Setari;
const masini = [{ id: 'm', nume: 'Mica', locuri: 4 } as Masina];
const cursa = { id: 'c', data: '2026-11-14', masinaId: 'm', sumaSofer: 300, spalari: 1 } as Cursa;
const bilet = (id: string) => ({ id, cursaId: 'c', suma: 40, moneda: 'EUR' }) as Bilet;
const rez = (suma: number, moneda: 'EUR' | 'RON') =>
  ({ cursaId: 'c', plata: { stare: 'de_incasat', moneda, incasat: { suma, moneda } } }) as Rezervare;
const ctx = (deconturi: Decont[] = [], bilete: Bilet[] = [bilet('b1')]) => ({
  rezervari: [rez(40, 'EUR'), rez(220, 'RON')], bilete, deconturi, masini, setari,
});

describe('decont pe cursă', () => {
  it('cursă nedecontată: suma, biletul, spălarea și banii încasați', () => {
    const a = analizaCursa(cursa, ctx());
    expect(a.sumaCursa).toBe(300);
    expect(a.bilete).toHaveLength(1);
    expect(a.spalari).toEqual({ nr: 1, suma: 30 });
    expect(a.incasat).toMatchObject({ EUR: 40, RON: 220 });
    expect(a.deDecontat).toBe(true);
    expect(a.decontata).toBe(false);
  });
  it('rezultatul: de luat 300 + 220 (parcare 40 € la 5,5) + 30 = 550; încasat 440 → de primit 110', () => {
    const r = soldCurse([analizaCursa(cursa, ctx())], setari.cursuri);
    expect(r).toMatchObject({ deLuat: 550, predat: 440, sold: 110, lipsa: [] });
  });
  it('după decont: nimic de decontat, cursa e decontată', () => {
    const d = { id: 'd', curse: [{ cursaId: 'c', suma: 300 }], bilete: ['b1'], spalatorii: [{ cursaId: 'c', nr: 1, suma: 30 }] } as Decont;
    const a = analizaCursa(cursa, ctx([d]));
    expect(a.deDecontat).toBe(false);
    expect(a.decontata).toBe(true);
  });
  it('o spălare sau un bilet adăugat după decont apare din nou, fără să strice restul', () => {
    const d = { id: 'd', curse: [{ cursaId: 'c', suma: 300 }], bilete: ['b1'], spalatorii: [{ cursaId: 'c', nr: 1, suma: 30 }] } as Decont;
    const a = analizaCursa({ ...cursa, spalari: 2 }, ctx([d], [bilet('b1'), bilet('b2')]));
    expect(a.sumaCursa).toBe(0);
    expect(a.bilete.map((b) => b.id)).toEqual(['b2']);
    expect(a.spalari.nr).toBe(1);
    expect(a.deDecontat).toBe(true);
  });
  it('cursă fără nimic de decontat nu e nici decontată', () => {
    const a = analizaCursa({ id: 'x', data: '2026-11-14' } as Cursa, ctx([], []));
    expect(a.deDecontat).toBe(false);
    expect(a.decontata).toBe(false);
  });
  it('cursă fără sumă, dar cu bani încasați: apare la decont', () => {
    const a = analizaCursa({ id: 'c', data: '2026-11-14' } as Cursa, ctx([], []));
    expect(a.sumaCursa).toBe(0);
    expect(a.deDecontat).toBe(true);
    expect(soldCurse([a], setari.cursuri)).toMatchObject({ deLuat: 0, predat: 440, sold: -440 });
  });
  it('după decont cu suma 0, banii nu se mai cer; dacă setezi suma după, doar suma apare', () => {
    const d = { id: 'd', curse: [{ cursaId: 'c', suma: 0 }], bilete: [] } as unknown as Decont;
    const fara = analizaCursa({ id: 'c', data: '2026-11-14' } as Cursa, ctx([d], []));
    expect(fara.deDecontat).toBe(false);
    expect(fara.decontata).toBe(true);
    const cu = analizaCursa({ id: 'c', data: '2026-11-14', sumaSofer: 200 } as Cursa, ctx([d], []));
    expect(cu.sumaCursa).toBe(200);
    expect(cu.incasat).toMatchObject({ EUR: 0, RON: 0 });
    expect(cu.incasatTotal).toMatchObject({ EUR: 40, RON: 220 });
    expect(soldCurse([cu], setari.cursuri)).toMatchObject({ deLuat: 200, predat: 0, sold: 200 });
  });
  it('o parte din sumă deja decontată: rămâne diferența', () => {
    const d = { id: 'd', curse: [{ cursaId: 'c', suma: 100 }], bilete: [] } as unknown as Decont;
    expect(analizaCursa({ ...cursa, sumaSofer: 250, spalari: 0 }, ctx([d], [])).sumaCursa).toBe(150);
  });
  it('cursă locală inclusă în salariu: fără sumă la decont, dar banii încasați rămân', () => {
    const local = { ...cursa, locala: true, creat: 0 } as Cursa;
    const s = { ...setari, curseLocaleInclusePeLuna: 1 } as Setari;
    const a = analizaCursa(local, { ...ctx([], []), setari: s, curse: [local] });
    expect(a.inclusaInSalariu).toBe(true);
    expect(a.sumaCursa).toBe(0);
    expect(a.deDecontat).toBe(true); // mai are de predat banii încasați
  });
});
