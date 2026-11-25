import { newId } from './store';
import type { Rezultat, RezervareExtrasa } from './parser';
import type { Cursa, Rezervare, Setari } from './types';
import { oreSugerate } from './ore';

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

/**
 * Completează plecarea/returul dacă lipsesc (întâi din mesajul dispecerului, apoi din orele rezervărilor)
 * și adaugă notele din mesaje.
 */
export function aplicaPeCursa(c: Cursa, rez: Rezultat, rezervari: Rezervare[] = [], setari?: Setari): Cursa {
  const note = [c.note, ...rez.note].filter(Boolean).join('\n');
  const sugerat = setari ? oreSugerate(rezervari, setari, c.destinatie) : {};
  return {
    ...c,
    plecare: c.plecare ?? rez.plecare ?? sugerat.plecare,
    retur: c.retur ?? rez.retur ?? sugerat.retur,
    note: note || undefined,
  };
}
