import { newId } from './store';
import type { Rezultat, RezervareExtrasa } from './parser';
import type { Cursa, Rezervare } from './types';

export function rezervareNoua(cursaId: string, extras: Partial<Rezervare>): Rezervare {
  const acum = Date.now();
  return {
    id: newId(),
    cursaId,
    creat: acum,
    modificat: acum,
    directie: 'dus',
    nume: '',
    telefoane: [],
    pasageri: 1,
    plata: { stare: 'de_incasat', moneda: 'EUR' },
    ...extras,
  };
}

export function rezervareDinExtras(cursaId: string, e: RezervareExtrasa): Rezervare {
  const { data: _data, destinatie: _destinatie, directie, ...camp } = e;
  return rezervareNoua(cursaId, { ...camp, directie: directie ?? 'dus' });
}

/** Completează plecarea/returul dacă lipsesc și adaugă notele din mesaje. */
export function aplicaPeCursa(c: Cursa, rez: Rezultat): Cursa {
  const note = [c.note, ...rez.note].filter(Boolean).join('\n');
  return {
    ...c,
    plecare: c.plecare ?? rez.plecare,
    retur: c.retur ?? rez.retur,
    note: note || undefined,
  };
}
