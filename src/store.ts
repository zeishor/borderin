import { useEffect, useState } from 'preact/hooks';
import { getAll, put, remove } from './db';
import type { Cursa, Masina, Rezervare, Setari } from './types';

interface State {
  curse: Cursa[];
  rezervari: Rezervare[];
  masini: Masina[];
  setari: Setari;
}

const SETARI_ID = 'setari';
const SETARI_IMPLICITE: Setari = { pragExtraOre: 16, drumInapoiOre: 4.5 };

let state: State = { curse: [], rezervari: [], masini: [], setari: SETARI_IMPLICITE };
const listeners = new Set<() => void>();

function update(next: Partial<State>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

export function newId(): string {
  return crypto.randomUUID();
}

export async function initStore(): Promise<void> {
  const [curse, rezervari, masini, setari] = await Promise.all([
    getAll<Cursa>('curse'),
    getAll<Rezervare>('rezervari'),
    getAll<Masina>('masini'),
    getAll<Setari & { id: string }>('setari'),
  ]);
  const salvate = setari.find((s) => s.id === SETARI_ID);
  update({
    curse,
    rezervari,
    masini,
    setari: salvate
      ? { pragExtraOre: salvate.pragExtraOre, drumInapoiOre: salvate.drumInapoiOre }
      : SETARI_IMPLICITE,
  });
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
  await remove('curse', id);
  update({
    curse: state.curse.filter((c) => c.id !== id),
    rezervari: state.rezervari.filter((r) => r.cursaId !== id),
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
