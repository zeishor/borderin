import type { Cursa, Rezervare } from './types';

const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();

const titlu = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

/**
 * Oprirea de pe traseu: Timișoara → locurile cursei → Timișoara.
 * Locurile vin din destinația cursei („Budapesta - Arad" se desparte) și din aeroporturile
 * rezervărilor („Aeroport Arad"), în ordinea apariției: întâi dus, apoi retur.
 */
export function traseu(cursa: Cursa, rezervari: Rezervare[]): string[] {
  const locuri: string[] = [];
  const adauga = (nume: string) => {
    const n = nume.trim();
    if (!n || norm(n) === 'timisoara' || locuri.some((l) => norm(l) === norm(n))) return;
    locuri.push(n);
  };

  for (const parte of cursa.destinatie.split(/\s*(?:[-–—,/>→]+|\s\+\s)\s*/)) adauga(parte);

  const ordonate = [...rezervari].sort((a, b) => (a.directie === b.directie ? 0 : a.directie === 'dus' ? -1 : 1));
  for (const r of ordonate) {
    const aeroport = (r.directie === 'dus' ? [r.lasare, r.preluare] : [r.preluare, r.lasare]).filter(Boolean) as string[];
    for (const loc of aeroport) {
      const m = loc.match(/^aeroport\s+(.+)$/i);
      if (m) adauga(titlu(m[1]));
    }
  }

  return ['Timișoara', ...locuri, 'Timișoara'];
}
