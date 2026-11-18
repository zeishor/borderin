export type Tracker = 'flightradar24' | 'flightaware' | 'google';

export const TRACKERE: { id: Tracker; nume: string }[] = [
  { id: 'flightradar24', nume: 'Flightradar24' },
  { id: 'flightaware', nume: 'FlightAware' },
  { id: 'google', nume: 'Google' },
];

const CHEIE = 'borderin.tracker';

export function trackerAles(): Tracker {
  try {
    const v = localStorage.getItem(CHEIE);
    if (TRACKERE.some((t) => t.id === v)) return v as Tracker;
  } catch {
    /* fără localStorage, rămâne implicitul */
  }
  return 'flightradar24';
}

export function salveazaTracker(t: Tracker): void {
  try {
    localStorage.setItem(CHEIE, t);
  } catch {
    /* ignorat */
  }
}

/** Link de urmărire pentru un cod de zbor („W6 2289" → w62289). Gol dacă nu e cod. */
export function linkZbor(cod: string, tracker: Tracker = trackerAles()): string | undefined {
  const c = cod.replace(/[^A-Za-z0-9]/g, '');
  if (!c) return undefined;
  switch (tracker) {
    case 'flightradar24':
      return `https://www.flightradar24.com/data/flights/${c.toLowerCase()}`;
    case 'flightaware':
      return `https://www.flightaware.com/live/flight/${c.toUpperCase()}`;
    case 'google':
      return `https://www.google.com/search?q=${encodeURIComponent(`${c.toUpperCase()} flight status`)}`;
  }
}
