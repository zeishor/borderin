// Construiește planul de preluare: găsește punctele, calculează duratele și ordinea.
import { distantaKm, type Loc } from './localitati';
import { cautaAdresa, matrice } from './ors';
import {
  AEROPORT, AEROPORT_BUD, GRANITA, START, centruLocalitate, cheiePereche, estimeaza, interogari, localitateDin, opririDinRezervari, ordineOptima, stradaSiNumar,
} from './ruta';
import type { OprirePlan, PlanPreluare, Punct, Rezervare, Setari } from './types';

const MINIM_NESIGUR = 10;
const MAXIM_KM = 30;

type SetariRuta = Pick<Setari, 'orsCheie' | 'adresaPornire' | 'punctGranita'>;

/** Punctul unei adrese: pe hartă dacă se poate, altfel centrul localității (marcat aproximativ). */
async function localizeaza(
  adresa: string,
  cheie: string,
  baza: Loc[],
): Promise<{ punct: Punct; aprox: boolean; gasit?: string }> {
  const localitate = localitateDin(adresa, baza);
  const centru = centruLocalitate(localitate, baza);
  const { strada } = stradaSiNumar(adresa, localitate);
  // Fără nume de stradă („Bucovat 56") nu are ce căuta: rămâne centrul satului.
  let gasit = cheie && strada ? await cautaAdresa(interogari(adresa, localitate), localitate, strada, cheie) : undefined;
  // Un rezultat departe de localitate e o confuzie de nume.
  if (gasit && centru && distantaKm(gasit, centru) > MAXIM_KM) gasit = undefined;
  if (gasit?.precis) return { punct: { lat: gasit.lat, lon: gasit.lon }, aprox: false, gasit: gasit.eticheta };
  // Un cartier sau un nume necunoscut cade pe centrul Timișoarei, marcat aproximativ.
  const punct = gasit ?? centru ?? centruLocalitate('Timisoara', baza);
  if (!punct) throw new Error(`Nu am găsit pe hartă: „${adresa}”. Corectează adresa în rezervare sau în Setări.`);
  return { punct: { lat: punct.lat, lon: punct.lon }, aprox: true, gasit: gasit?.eticheta };
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
    if (stiuta?.punct && !stiuta.aprox) opriri.push({ ...o, punct: stiuta.punct, aprox: false, gasit: stiuta.gasit });
    else opriri.push({ ...o, ...(await localizeaza(o.adresa, cheie, baza)) });
  }
  if (!opriri.length) throw new Error('Nicio rezervare de dus cu adresă de preluare.');

  const start = await localizeaza(setari.adresaPornire || 'Timisoara', cheie, baza);
  const granita = await localizeaza(setari.punctGranita || 'Nadlac', cheie, baza);
  const chei = [START, ...opriri.map((o) => o.cheie), GRANITA, AEROPORT];
  const puncte = [start.punct, ...opriri.map((o) => o.punct!), granita.punct, AEROPORT_BUD];
  const m = cheie ? await matrice(puncte, cheie) : undefined;

  // Plecarea sau o preluare cu poziție nesigură.
  const nesigur = [start.aprox, ...opriri.map((o) => !!o.aprox), false, false];
  const durate: Record<string, number> = {};
  chei.forEach((a, i) =>
    chei.forEach((b, j) => {
      if (i === j) return;
      const min = m?.[i][j] ?? estimeaza(puncte[i], puncte[j]);
      // Între puncte nesigure serviciul poate spune „0 minute" (ambele în centrul localității): las o rezervă.
      durate[cheiePereche(a, b)] = nesigur[i] || nesigur[j] ? Math.max(MINIM_NESIGUR, min) : min;
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
    startGasit: start.gasit,
  };
}
