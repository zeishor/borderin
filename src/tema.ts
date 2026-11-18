export type Tema = 'auto' | 'luminos' | 'intunecat';

export const TEME: { id: Tema; nume: string }[] = [
  { id: 'auto', nume: 'Automat (ca telefonul)' },
  { id: 'luminos', nume: 'Luminos' },
  { id: 'intunecat', nume: 'Întunecat' },
];

const CHEIE = 'borderin.tema';

export function temaAleasa(): Tema {
  try {
    const v = localStorage.getItem(CHEIE);
    if (TEME.some((t) => t.id === v)) return v as Tema;
  } catch {
    /* implicit */
  }
  return 'auto';
}

export function aplicaTema(t: Tema = temaAleasa()): void {
  const r = document.documentElement;
  if (t === 'luminos') r.dataset.theme = 'light';
  else if (t === 'intunecat') r.dataset.theme = 'dark';
  else delete r.dataset.theme;
}

export function salveazaTema(t: Tema): void {
  try {
    localStorage.setItem(CHEIE, t);
  } catch {
    /* ignorat */
  }
  aplicaTema(t);
}
