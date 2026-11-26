// openrouteservice (HeiGIT): căutarea adreselor și duratele dintre ele. Se trimit doar adrese, fără nume sau telefoane.
import { norm } from './preturi';
import type { Punct } from './types';

const BAZA = 'https://api.heigit.org';

async function cere(url: string, cheie: string, corp?: unknown): Promise<any> {
  let r: Response;
  try {
    r = await fetch(url, {
      method: corp ? 'POST' : 'GET',
      headers: { Authorization: cheie, ...(corp ? { 'Content-Type': 'application/json' } : {}) },
      body: corp ? JSON.stringify(corp) : undefined,
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    throw new Error('Nu am putut contacta openrouteservice (fără internet?).');
  }
  if (r.status === 401 || r.status === 403) throw new Error('Cheia openrouteservice nu e acceptată. Verific-o în Setări.');
  if (r.status === 429) throw new Error('Limita gratuită openrouteservice a fost atinsă. Încearcă mai târziu.');
  if (!r.ok) throw new Error(`openrouteservice a răspuns cu eroarea ${r.status}.`);
  return r.json();
}

export interface Gasit extends Punct {
  /** Adevărat doar pentru stradă sau număr, în localitatea cerută. */
  precis: boolean;
}

/** Caută o adresă în România, cu preferință pentru zona Timișoarei. */
export async function cautaAdresa(text: string, localitate: string, cheie: string): Promise<Gasit | undefined> {
  const p = new URLSearchParams({
    text,
    'boundary.country': 'ROU',
    'focus.point.lat': '45.75',
    'focus.point.lon': '21.23',
    size: '5',
  });
  const j = await cere(`${BAZA}/pelias/v1/search?${p}`, cheie);
  const loc = norm(localitate);
  const rezultate = (j.features ?? []).map((f: any) => {
    const pr = f.properties ?? {};
    const inLocalitate = [pr.locality, pr.localadmin, pr.name, pr.label].some((x) => typeof x === 'string' && norm(x).includes(loc));
    return {
      lon: f.geometry.coordinates[0],
      lat: f.geometry.coordinates[1],
      inLocalitate,
      precis: inLocalitate && ['address', 'street', 'venue'].includes(pr.layer),
    };
  });
  // Un rezultat din altă localitate e mai rău decât niciunul.
  const bun = rezultate.find((x: any) => x.precis) ?? rezultate.find((x: any) => x.inLocalitate);
  return bun && { lat: bun.lat, lon: bun.lon, precis: bun.precis };
}

/** Minutele de condus între toate perechile de puncte; `null` unde serviciul nu găsește drum. */
export async function matrice(puncte: Punct[], cheie: string): Promise<(number | null)[][]> {
  const j = await cere(`${BAZA}/openrouteservice/v2/matrix/driving-car`, cheie, {
    locations: puncte.map((p) => [p.lon, p.lat]),
    metrics: ['duration'],
  });
  return j.durations.map((rand: (number | null)[]) => rand.map((s) => (s === null ? null : Math.round(s / 60))));
}
