import { useEffect, useState } from 'preact/hooks';
import { norm } from './preturi';
import type { Localitate } from './types';

/** O localitate din baza inclusă în aplicație (`public/localitati.json`, generată cu scripts/build-localitati.mjs). */
export interface Loc {
  nume: string;
  ascii: string;
  judet: string;
  lat: number;
  lon: number;
  pop: number;
}

let cache: Promise<Loc[]> | undefined;

/** Încarcă baza la prima folosire. Dacă fișierul lipsește sau e gol, întoarce o listă goală (căutarea cade pe text liber). */
export function incarcaLocalitati(): Promise<Loc[]> {
  if (!cache) {
    cache = fetch(`${import.meta.env.BASE_URL}localitati.json`)
      .then((r) => (r.ok ? r.json() : { l: [] }))
      .then((j: { l?: [string, string, string, number, number, number][] }) =>
        (j.l ?? []).map(([nume, ascii, judet, lat, lon, pop]) => ({ nume, ascii, judet, lat, lon, pop })),
      )
      .catch(() => []);
    cache.then((l) => {
      if (!l.length) cache = undefined; // reîncearcă data viitoare (de ex. după ce revine semnalul)
    });
  }
  return cache;
}

export function useBazaLocalitati(): Loc[] {
  const [lista, setLista] = useState<Loc[]>([]);
  useEffect(() => {
    let viu = true;
    incarcaLocalitati().then((l) => viu && setLista(l));
    return () => {
      viu = false;
    };
  }, []);
  return lista;
}

/** Căutare fără diacritice: întâi cele care încep cu textul, apoi cele care îl conțin; cele mai mari primele. */
export function cauta(text: string, lista: Loc[], limita = 8): Loc[] {
  const q = norm(text);
  if (q.length < 2) return [];
  const incepe: Loc[] = [];
  const contine: Loc[] = [];
  for (const l of lista) {
    const a = norm(l.ascii || l.nume);
    if (a.startsWith(q)) incepe.push(l);
    else if (a.includes(q)) contine.push(l);
  }
  const dupaPop = (x: Loc, y: Loc) => y.pop - x.pop;
  return [...incepe.sort(dupaPop), ...contine.sort(dupaPop)].slice(0, limita);
}

/** Localitatea cu numele exact (cea mai mare, dacă sunt mai multe cu același nume). */
export function gaseste(nume: string, lista: Loc[]): Loc | undefined {
  const n = norm(nume);
  return lista.filter((l) => norm(l.ascii || l.nume) === n || norm(l.nume) === n).sort((x, y) => y.pop - x.pop)[0];
}

export function distantaKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const rad = (g: number) => (g * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

/** Mamele cu preț, în ordinea apropierii de `oprire`. Mamele sau opririle fără coordonate în bază sunt sărite. */
export function celeMaiApropiate(
  oprire: string,
  mame: Localitate[],
  lista: Loc[],
): { mama: Localitate; km: number }[] {
  const loc = gaseste(oprire, lista);
  if (!loc) return [];
  const rezultat: { mama: Localitate; km: number }[] = [];
  for (const m of mame) {
    const lm = gaseste(m.nume, lista);
    if (lm) rezultat.push({ mama: m, km: distantaKm(loc, lm) });
  }
  return rezultat.sort((a, b) => a.km - b.km);
}
