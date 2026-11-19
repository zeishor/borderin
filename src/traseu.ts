import type { Cursa, Rezervare } from './types';

const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();

/** „ARAD" → „Arad"; un nume scris normal rămâne așa cum e. */
function nume(s: string): string {
  if (s !== s.toUpperCase()) return s;
  return s.toLowerCase().replace(/(^|[\s-])(\p{L})/gu, (_, a: string, b: string) => a + b.toUpperCase());
}

const STRADA = /\b(str\.?|strada|b-?dul\.?|bulevardul|calea|aleea|bl\.?|nr\.?)(?=\s|\.|\d|$)/i;
const ORAS_CUNOSCUT = /budapest|arad|oradea|belgrad|viena|cluj|sibiu|szeged|debrecen|lugoj|deva|resita|reșița/i;

/**
 * Localitățile dintr-un loc de preluare/lăsare: „Sacalaz, Str. A 5 (Ana) + Timisoara, Str. B" → Sacalaz, Timisoara;
 * „Aeroport Arad" → Arad. Un nume singur, necunoscut („Varroc"), e luat drept localitate doar când
 * `capat` e adevărat (locul e la capătul dinspre destinație); altfel e probabil un loc din Timișoara.
 */
function localitati(loc: string | undefined, capat: boolean): string[] {
  const rezultat: string[] = [];
  for (const stop of (loc ?? '').split(/\s+\+\s+/)) {
    const fara = stop.replace(/\([^)]*\)/g, '').trim();
    const aeroport = fara.match(/^aeroport(?:ul)?\s+(.+)$/i);
    if (aeroport) {
      rezultat.push(aeroport[1].split(',')[0].trim());
      continue;
    }
    const [prima, ...rest] = fara.split(',').map((x) => x.trim());
    let candidat = prima ?? '';
    const strada = candidat.match(STRADA);
    if (strada?.index !== undefined) candidat = candidat.slice(0, strada.index).replace(/[\s\-–—:]+$/, '');
    if (!candidat || /\d/.test(candidat)) continue;
    if (strada || rest.length || capat || ORAS_CUNOSCUT.test(candidat)) rezultat.push(candidat);
  }
  return rezultat;
}

/**
 * Opririle de pe traseu: Timișoara → locurile cursei → Timișoara.
 * Locurile vin din preluările de la dus (altă localitate decât Timișoara), din destinația cursei
 * („Budapesta - Arad" se desparte), din lăsările de la dus și din preluările/lăsările de la retur
 * (ex. retur în Arad), fiecare în ordinea apariției, fără dubluri.
 */
export function traseu(cursa: Cursa, rezervari: Rezervare[]): string[] {
  const locuri: string[] = [];
  const adauga = (n: string) => {
    const t = n.trim();
    if (!t || norm(t) === 'timisoara' || locuri.some((l) => norm(l) === norm(t))) return;
    locuri.push(nume(t));
  };

  const dus = rezervari.filter((r) => r.directie === 'dus');
  const retur = rezervari.filter((r) => r.directie !== 'dus');

  for (const r of dus) localitati(r.preluare, false).forEach(adauga);
  for (const parte of cursa.destinatie.split(/\s*(?:[-–—,/>→]+|\s\+\s)\s*/)) adauga(parte);
  for (const r of dus) localitati(r.lasare, true).forEach(adauga);
  for (const r of retur) localitati(r.preluare, true).forEach(adauga);
  for (const r of retur) localitati(r.lasare, false).forEach(adauga);

  return ['Timișoara', ...locuri, 'Timișoara'];
}
