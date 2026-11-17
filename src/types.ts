export type Moneda = 'RON' | 'EUR';
export type Directie = 'dus' | 'retur';
export type StarePlata = 'de_incasat' | 'achitat';

export interface Telefon {
  numar: string;
  eticheta?: string;
}

export interface Plata {
  stare: StarePlata;
  /** Cum s-a plătit / se plătește: cash, OP, bancă, factură etc. */
  metoda?: string;
  suma?: number;
  moneda: Moneda;
  /** Prețul așa cum e scris în mesaj, ex. „40 euro / 220 lei". */
  notaPret?: string;
}

export interface Rezervare {
  id: string;
  cursaId: string;
  creat: number;
  modificat: number;
  directie: Directie;
  nume: string;
  telefoane: Telefon[];
  pasageri: number;
  /** HH:MM — ora zborului sau a preluării, cum scrie în mesaj. */
  ora?: string;
  zbor?: string;
  preluare?: string;
  lasare?: string;
  observatii?: string;
  /** Etichetă brută din mesaj (ex. „PRIVAT", sursa), afișată ca atare. */
  eticheta?: string;
  plata: Plata;
  textOriginal?: string;
}

export interface Masina {
  id: string;
  nume: string;
  locuri: number;
}

export interface Cursa {
  id: string;
  creat: number;
  modificat: number;
  /** YYYY-MM-DD */
  data: string;
  destinatie: string;
  masinaId?: string;
  /** HH:MM, plecarea din Timișoara stabilită de dispecer. */
  plecare?: string;
  /** HH:MM, ora retur de la destinație. */
  retur?: string;
  note?: string;
}

export interface Setari {
  /** Peste această durată totală cursa e „extra". */
  pragExtraOre: number;
  /** Durata drumului destinație → Timișoara. */
  drumInapoiOre: number;
}
