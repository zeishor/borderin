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
  /** Adevărat doar pentru strada cerută (cu sau fără număr), în localitatea cerută. */
  precis: boolean;
  /** Ce a găsit serviciul, de arătat șoferului. */
  eticheta: string;
}

/** Cuvântul cel mai lung din numele străzii, după care se recunoaște în rezultat. */
function cuvantStrada(strada: string): string {
  const cuvinte = norm(strada).replace(/^(strada|bulevardul|calea|aleea|piata|splaiul|intrarea|soseaua)\s+/, '').split(/[^a-z0-9]+/);
  return cuvinte.sort((a, b) => b.length - a.length)[0] ?? '';
}

/** Alege din rezultatele serviciului: întâi strada cerută (cu număr dacă se poate), apoi orice din localitate. */
export function alegeRezultat(features: any[], localitate: string, strada: string): Gasit | undefined {
  const loc = norm(localitate);
  const cuvant = cuvantStrada(strada);
  const rezultate = features.map((f) => {
    const pr = f.properties ?? {};
    const contine = (campuri: unknown[], ce: string) => campuri.some((x) => typeof x === 'string' && norm(x).includes(ce));
    // Doar localitatea rezultatului contează: „Strada Bucovăț, București" nu e în Bucovăț.
    const eLocalitate = ['locality', 'localadmin'].includes(pr.layer);
    const inLocalitate = contine([pr.locality, pr.localadmin, eLocalitate ? pr.name : undefined], loc);
    return {
      lon: f.geometry.coordinates[0] as number,
      lat: f.geometry.coordinates[1] as number,
      eticheta: String(pr.label ?? pr.name ?? ''),
      inLocalitate,
      cuNumar: pr.layer === 'address',
      precis: inLocalitate && ['address', 'street', 'venue'].includes(pr.layer) && !!cuvant && contine([pr.street, pr.name, pr.label], cuvant),
    };
  });
  // Un rezultat din altă localitate e mai rău decât niciunul.
  const bun =
    rezultate.find((x) => x.precis && x.cuNumar) ?? rezultate.find((x) => x.precis) ?? rezultate.find((x) => x.inLocalitate);
  return bun && { lat: bun.lat, lon: bun.lon, precis: bun.precis, eticheta: bun.eticheta };
}

/** Caută o adresă în România, încercând variantele pe rând până găsește strada. */
export async function cautaAdresa(
  variante: string[],
  localitate: string,
  strada: string,
  cheie: string,
): Promise<Gasit | undefined> {
  let rezerva: Gasit | undefined;
  for (const text of variante) {
    const p = new URLSearchParams({
      text,
      'boundary.country': 'ROU',
      'focus.point.lat': '45.75',
      'focus.point.lon': '21.23',
      size: '10',
    });
    const j = await cere(`${BAZA}/pelias/v1/search?${p}`, cheie);
    const gasit = alegeRezultat(j.features ?? [], localitate, strada);
    if (gasit?.precis) return gasit;
    rezerva ??= gasit;
  }
  return rezerva;
}

/** Minutele de condus între toate perechile de puncte; `null` unde serviciul nu găsește drum. */
export async function matrice(puncte: Punct[], cheie: string): Promise<(number | null)[][]> {
  const j = await cere(`${BAZA}/openrouteservice/v2/matrix/driving-car`, cheie, {
    locations: puncte.map((p) => [p.lon, p.lat]),
    metrics: ['duration'],
  });
  return j.durations.map((rand: (number | null)[]) => rand.map((s) => (s === null ? null : Math.round(s / 60))));
}
