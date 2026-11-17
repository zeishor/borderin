import { sumeDinText } from './parser';
import type { Cursa, Moneda, Plata, Rezervare } from './types';

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

export interface Suma {
  suma: number;
  moneda: Moneda;
}

type Totaluri = Record<Moneda, number>;

/** Variantele de plată: suma setată, plus cele din prețul scris (ex. 40 € sau 220 lei). */
export function optiuniPlata(p: Plata): Suma[] {
  const lista: Suma[] = [];
  const adauga = (x: Suma) => {
    if (x.suma > 0 && !lista.some((y) => y.suma === x.suma && y.moneda === x.moneda)) lista.push(x);
  };
  if (p.suma) adauga({ suma: p.suma, moneda: p.moneda });
  for (const x of sumeDinText(p.notaPret ?? '')) adauga(x);
  return lista;
}

/** Sumele rămase de încasat (rezervări neachitate și neîncasate), separat pe monede. */
export function deIncasat(rezervari: Rezervare[]): Totaluri {
  const total: Totaluri = { RON: 0, EUR: 0 };
  for (const r of rezervari) {
    if (r.plata.stare === 'de_incasat' && !r.plata.incasat && r.plata.suma) total[r.plata.moneda] += r.plata.suma;
  }
  return total;
}

/** Sumele încasate efectiv de șofer, separat pe monede. */
export function incasat(rezervari: Rezervare[]): Totaluri {
  const total: Totaluri = { RON: 0, EUR: 0 };
  for (const r of rezervari) {
    if (r.plata.incasat) total[r.plata.incasat.moneda] += r.plata.incasat.suma;
  }
  return total;
}

export function textBani(t: Totaluri): string {
  const parti = (['RON', 'EUR'] as Moneda[]).filter((m) => t[m] > 0).map((m) => fmtSuma(t[m], m));
  return parti.length ? parti.join(' + ') : '—';
}

export const textDeIncasat = (rezervari: Rezervare[]) => textBani(deIncasat(rezervari));
export const textIncasat = (rezervari: Rezervare[]) => textBani(incasat(rezervari));
export const arePlataIncasata = (rezervari: Rezervare[]) => (['RON', 'EUR'] as Moneda[]).some((m) => incasat(rezervari)[m] > 0);

export function titluCursa(c: Cursa): string {
  return `Timișoara – ${c.destinatie || 'destinație?'}`;
}

export function totalPasageri(rezervari: Rezervare[]): number {
  return rezervari.reduce((n, r) => n + r.pasageri, 0);
}
