export type Navigatie = 'google' | 'waze';

export const NAVIGATII: { id: Navigatie; nume: string }[] = [
  { id: 'google', nume: 'Google Maps' },
  { id: 'waze', nume: 'Waze' },
];

const CHEIE = 'borderin.navigatie';

export function navigatieAleasa(): Navigatie {
  try {
    const v = localStorage.getItem(CHEIE);
    if (NAVIGATII.some((n) => n.id === v)) return v as Navigatie;
  } catch {
    /* implicit */
  }
  return 'google';
}

export function salveazaNavigatie(n: Navigatie): void {
  try {
    localStorage.setItem(CHEIE, n);
  } catch {
    /* ignorat */
  }
}

/** Locul fără numele pasagerului din paranteză: „Str. X 5, Arad (Ion)" → „Str. X 5, Arad". */
export function locDinText(text: string): string {
  return text.replace(/\s*\([^()]*\)\s*$/, '').trim();
}

/** Mai multe opriri scrise cu „ + " devin locuri separate. */
export function locuri(text: string | undefined): string[] {
  return (text ?? '')
    .split(/\s+\+\s+/)
    .map(locDinText)
    .filter(Boolean);
}

/** Textul trimis către hartă: aeroporturile primesc numele orașului în forma internațională. */
export function interogare(loc: string): string {
  const aero = loc.match(/^aeroport\s+(.+)$/i);
  if (aero) return `${aero[1].trim()} Airport`;
  return loc;
}

export function linkNavigatie(loc: string, nav: Navigatie = navigatieAleasa()): string | undefined {
  const q = interogare(loc.trim());
  if (!q) return undefined;
  const e = encodeURIComponent(q);
  return nav === 'waze'
    ? `https://waze.com/ul?q=${e}&navigate=yes`
    : `https://www.google.com/maps/dir/?api=1&destination=${e}`;
}
