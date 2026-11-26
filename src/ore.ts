import { norm } from './preturi';
import type { Rezervare, Setari } from './types';

type SetariOre = Pick<Setari, 'oreInainteZbor' | 'drumDusOre' | 'diferentaFusOre'>;

/** „dec 10 20", „decolare": ora scrisă e a zborului, chiar fără cod. */
const DECOLARE = /\bdec(olare)?\b\.?\s*(\d|$)/i;
const IN_UNGARIA = /budapest|ungaria|hungary|debrecen|szeged|pecs|gyor|miskolc/;

function minute(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function hhmm(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
}

/**
 * Ore propuse din rezervări, când dispecerul nu le-a scris:
 * - plecare din Timișoara = cel mai devreme zbor (la dus) + diferența de fus (Ungaria) − orele dinainte de zbor − drumul, rotunjit în jos la 30 de minute;
 * - retur = cea mai târzie oră de preluare de la destinație (la retur).
 * Doar rezervările cu zbor își dau ora ca decolare; altfel „ora" poate fi o preluare și nu se atinge.
 */
export function oreSugerate(rezervari: Rezervare[], setari: SetariOre, destinatie = ''): { plecare?: string; retur?: string } {
  const zboruri = rezervari.filter((r) => r.directie === 'dus' && r.ora && (r.zbor || r.orasZbor || DECOLARE.test(r.textOriginal ?? ''))).map((r) => minute(r.ora!));
  const preluari = rezervari.filter((r) => r.directie === 'retur' && r.ora).map((r) => minute(r.ora!));
  const rezultat: { plecare?: string; retur?: string } = {};
  if (zboruri.length) {
    // Ora zborului e locală; în Ungaria e cu o oră în urma României, deci plecarea din Timișoara se mută mai târziu.
    const fus = IN_UNGARIA.test(norm(destinatie)) ? setari.diferentaFusOre : 0;
    const brut = Math.min(...zboruri) + Math.round((fus - setari.oreInainteZbor - setari.drumDusOre) * 60);
    rezultat.plecare = hhmm(Math.max(0, Math.floor(brut / 30) * 30));
  }
  if (preluari.length) rezultat.retur = hhmm(Math.max(...preluari));
  return rezultat;
}
