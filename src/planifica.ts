// Construiește planul de preluare: găsește punctele, calculează duratele și ordinea.
import { gaseste, type Loc } from './localitati';
import { cautaAdresa, matrice } from './ors';
import {
  AEROPORT, AEROPORT_BUD, GRANITA, START, cheiePereche, estimeaza, interogare, localitateDin, opririDinRezervari, ordineOptima,
} from './ruta';
import type { OprirePlan, PlanPreluare, Punct, Rezervare, Setari } from './types';

type SetariRuta = Pick<Setari, 'orsCheie' | 'adresaPornire' | 'punctGranita'>;

/** Punctul unei adrese: pe hartă dacă se poate, altfel centrul localității (marcat aproximativ). */
async function localizeaza(adresa: string, cheie: string, baza: Loc[]): Promise<{ punct: Punct; aprox: boolean }> {
  const localitate = localitateDin(adresa, baza);
  const gasit = cheie ? await cautaAdresa(interogare(adresa), localitate, cheie) : undefined;
  if (gasit?.precis) return { punct: { lat: gasit.lat, lon: gasit.lon }, aprox: false };
  // Un cartier sau un nume necunoscut cade pe centrul Timișoarei, marcat aproximativ.
  const centru = gaseste(localitate, baza) ?? gaseste('Timisoara', baza);
  const punct = gasit ?? centru;
  if (!punct) throw new Error(`Nu am găsit pe hartă: „${adresa}”. Corectează adresa în rezervare sau în Setări.`);
  return { punct: { lat: punct.lat, lon: punct.lon }, aprox: true };
}

/**
 * Fără cheie, duratele sunt estimate din distanțe. Corecțiile scrise de șofer și ora de ieșire se păstrează.
 * Adresele găsite deja nu se mai caută.
 */
export async function planifica(
  rezervari: Rezervare[],
  setari: SetariRuta,
  baza: Loc[],
  vechi?: PlanPreluare,
): Promise<PlanPreluare> {
  const cheie = setari.orsCheie.trim();
  const opriri: OprirePlan[] = [];
  for (const o of opririDinRezervari(rezervari)) {
    const stiuta = vechi?.opriri.find((x) => x.cheie === o.cheie);
    if (stiuta?.punct && !stiuta.aprox) opriri.push({ ...o, punct: stiuta.punct, aprox: false });
    else opriri.push({ ...o, ...(await localizeaza(o.adresa, cheie, baza)) });
  }
  if (!opriri.length) throw new Error('Nicio rezervare de dus cu adresă de preluare.');

  const start = await localizeaza(setari.adresaPornire || 'Timisoara', cheie, baza);
  const granita = await localizeaza(setari.punctGranita || 'Nadlac', cheie, baza);
  const chei = [START, ...opriri.map((o) => o.cheie), GRANITA, AEROPORT];
  const puncte = [start.punct, ...opriri.map((o) => o.punct!), granita.punct, AEROPORT_BUD];
  const m = cheie ? await matrice(puncte, cheie) : undefined;

  const durate: Record<string, number> = {};
  chei.forEach((a, i) =>
    chei.forEach((b, j) => {
      if (i !== j) durate[cheiePereche(a, b)] = m?.[i][j] ?? estimeaza(puncte[i], puncte[j]);
    }),
  );
  const corectii = vechi?.corectii ?? {};
  const cost = (a: string, b: string) => corectii[cheiePereche(a, b)] ?? durate[cheiePereche(a, b)];
  const ordine = ordineOptima(opriri.map((o) => o.cheie), cost);

  return {
    opriri: ordine.map((k) => opriri.find((o) => o.cheie === k)!),
    durate,
    corectii,
    iesire: vechi?.iesire,
    estimat: !cheie,
    startAprox: start.aprox,
  };
}
