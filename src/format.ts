import type { Cursa, Moneda, Rezervare } from './types';

export function azi(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function fmtData(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('ro-RO', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

export function fmtSuma(suma: number, moneda: Moneda): string {
  return `${suma.toLocaleString('ro-RO')} ${moneda === 'EUR' ? '€' : 'lei'}`;
}

/** Sumele de încasat din rezervări, separat pe monede. */
export function deIncasat(rezervari: Rezervare[]): Record<Moneda, number> {
  const total: Record<Moneda, number> = { RON: 0, EUR: 0 };
  for (const r of rezervari) {
    if (r.plata.stare === 'de_incasat' && r.plata.suma) total[r.plata.moneda] += r.plata.suma;
  }
  return total;
}

export function textIncasat(rezervari: Rezervare[]): string {
  const t = deIncasat(rezervari);
  const parti = (['RON', 'EUR'] as Moneda[]).filter((m) => t[m] > 0).map((m) => fmtSuma(t[m], m));
  return parti.length ? parti.join(' + ') : '—';
}

export function titluCursa(c: Cursa): string {
  return `Timișoara – ${c.destinatie || 'destinație?'}`;
}
