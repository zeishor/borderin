import { useEffect, useState } from 'preact/hooks';
import { getAll, put, remove } from './db';
import type { Bilet, Cursa, Decont, Localitate, Masina, Rezervare, Setari } from './types';

interface State {
  curse: Cursa[];
  rezervari: Rezervare[];
  masini: Masina[];
  setari: Setari;
  bilete: Bilet[];
  deconturi: Decont[];
  localitati: Localitate[];
}

const SETARI_ID = 'setari';
const SETARI_IMPLICITE: Setari = { pragExtraOre: 16, drumInapoiOre: 4.5, spalatorieMicaRon: 0, spalatorieMareRon: 0, cursuri: {}, salariuBazaRon: 0 };

let state: State = { curse: [], rezervari: [], masini: [], setari: SETARI_IMPLICITE, bilete: [], deconturi: [], localitati: [] };
const listeners = new Set<() => void>();

function update(next: Partial<State>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

export function newId(): string {
  return crypto.randomUUID();
}

export async function initStore(): Promise<void> {
  const [curse, rezervari, masini, setari, bilete, deconturi, localitati] = await Promise.all([
    getAll<Cursa>('curse'),
    getAll<Rezervare>('rezervari'),
    getAll<Masina>('masini'),
    getAll<Setari & { id: string }>('setari'),
    getAll<Bilet>('bilete'),
    getAll<Decont>('deconturi'),
    getAll<Localitate>('localitati'),
  ]);
  const salvate = setari.find((s) => s.id === SETARI_ID);
  update({
    curse,
    rezervari,
    masini,
    bilete,
    deconturi,
    localitati,
    setari: salvate
      ? {
          pragExtraOre: salvate.pragExtraOre,
          drumInapoiOre: salvate.drumInapoiOre,
          spalatorieMicaRon: salvate.spalatorieMicaRon ?? 0,
          spalatorieMareRon: salvate.spalatorieMareRon ?? 0,
          cursuri: salvate.cursuri ?? {},
          salariuBazaRon: salvate.salariuBazaRon ?? 0,
        }
      : SETARI_IMPLICITE,
  });
}

/** Starea curentă, fără abonare (pentru cod asincron care are nevoie de valori proaspete). */
export function getState(): State {
  return state;
}

export function useStore(): State {
  const [, tick] = useState(0);
  useEffect(() => {
    const l = () => tick((n) => n + 1);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);
  return state;
}

function upsert<T extends { id: string }>(list: T[], item: T): T[] {
  return list.some((x) => x.id === item.id)
    ? list.map((x) => (x.id === item.id ? item : x))
    : [...list, item];
}

export async function saveCursa(c: Cursa): Promise<void> {
  const next = { ...c, modificat: Date.now() };
  await put('curse', next);
  update({ curse: upsert(state.curse, next) });
}

export async function deleteCursa(id: string): Promise<void> {
  const ale = state.rezervari.filter((r) => r.cursaId === id);
  await Promise.all(ale.map((r) => remove('rezervari', r.id)));
  const bileteSterse = new Set(state.bilete.filter((b) => b.cursaId === id).map((b) => b.id));
  await Promise.all([...bileteSterse].map((bid) => remove('bilete', bid)));
  // Deconturile nu mai trebuie să trimită către bilete care nu mai există.
  const deconturi = await Promise.all(
    state.deconturi.map(async (d) => {
      if (!d.bilete.some((bid) => bileteSterse.has(bid))) return d;
      const curat = { ...d, bilete: d.bilete.filter((bid) => !bileteSterse.has(bid)) };
      await put('deconturi', curat);
      return curat;
    }),
  );
  await remove('curse', id);
  update({
    curse: state.curse.filter((c) => c.id !== id),
    rezervari: state.rezervari.filter((r) => r.cursaId !== id),
    bilete: state.bilete.filter((b) => b.cursaId !== id),
    deconturi,
  });
}

export async function saveRezervare(r: Rezervare): Promise<void> {
  const next = { ...r, modificat: Date.now() };
  await put('rezervari', next);
  update({ rezervari: upsert(state.rezervari, next) });
}

export async function deleteRezervare(id: string): Promise<void> {
  await remove('rezervari', id);
  update({ rezervari: state.rezervari.filter((r) => r.id !== id) });
}

export async function saveMasina(m: Masina): Promise<void> {
  await put('masini', m);
  update({ masini: upsert(state.masini, m) });
}

export async function deleteMasina(id: string): Promise<void> {
  await remove('masini', id);
  update({ masini: state.masini.filter((m) => m.id !== id) });
}

export async function saveSetari(s: Setari): Promise<void> {
  await put('setari', { id: SETARI_ID, ...s });
  update({ setari: s });
}

export async function saveBilet(b: Bilet): Promise<void> {
  const next = { ...b, modificat: Date.now() };
  await put('bilete', next);
  update({ bilete: upsert(state.bilete, next) });
}

export async function deleteBilet(id: string): Promise<void> {
  await remove('bilete', id);
  update({ bilete: state.bilete.filter((b) => b.id !== id) });
}

export async function saveDecont(d: Decont): Promise<void> {
  await put('deconturi', d);
  update({ deconturi: upsert(state.deconturi, d) });
}

export async function deleteDecont(id: string): Promise<void> {
  await remove('deconturi', id);
  update({ deconturi: state.deconturi.filter((d) => d.id !== id) });
}

export async function saveLocalitate(l: Localitate): Promise<void> {
  await put('localitati', l);
  update({ localitati: upsert(state.localitati, l) });
}

/** Șterge o localitate; dacă e mamă, șterge și limitrofele ei. */
export async function deleteLocalitate(id: string): Promise<void> {
  const ids = new Set([id, ...state.localitati.filter((l) => l.mamaId === id).map((l) => l.id)]);
  await Promise.all([...ids].map((x) => remove('localitati', x)));
  update({ localitati: state.localitati.filter((l) => !ids.has(l.id)) });
}
