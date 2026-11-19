export type Moneda = 'RON' | 'EUR' | 'GBP' | 'CHF';
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
  /** Ce a plătit efectiv clientul șoferului (ex. alege lei în loc de euro). */
  incasat?: { suma: number; moneda: Moneda };
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
  /** Codul zborului (ex. FR5249, W6 2289), pentru urmărirea întârzierilor. */
  zbor?: string;
  /** Orașul/aeroportul zborului, cum scrie în mesaj (ex. Cagliari, STR, BRISTOL). */
  orasZbor?: string;
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
  /** De câte ori a fost spălată mașina în această cursă. */
  spalari?: number;
}

export interface Setari {
  /** Peste această durată totală cursa e „extra". */
  pragExtraOre: number;
  /** Durata drumului destinație → Timișoara. */
  drumInapoiOre: number;
  /** Cât se decontează pentru o spălare a mașinii mici (până la 4 locuri), în RON. */
  spalatorieMicaRon: number;
  /** Cât se decontează pentru o spălare a mașinii mari (peste 4 locuri), în RON. */
  spalatorieMareRon: number;
}

export type MonedaBilet = 'HUF' | 'EUR' | 'RON';

/** Bilet de aeroport (taxa de intrare la arrivals), cheltuială de decontat. */
export interface Bilet {
  id: string;
  cursaId: string;
  creat: number;
  modificat: number;
  suma?: number;
  moneda: MonedaBilet;
  /** YYYY-MM-DDTHH:MM */
  intrare?: string;
  /** YYYY-MM-DDTHH:MM */
  iesire?: string;
  numar?: string;
  foto?: Blob;
  /** Textul citit de OCR, păstrat pentru verificare. */
  textOcr?: string;
}

/** Un decont: momentul în care șoferul a predat bani și/sau a decontat bilete la firmă. */
export interface Decont {
  id: string;
  creat: number;
  /** YYYY-MM-DD */
  data: string;
  /** Banii predați la firmă, pe monede. */
  predat: Record<Moneda, number>;
  /** Biletele decontate cu această ocazie. */
  bilete: string[];
  /** Spălările decontate: câte, din ce cursă, și suma (RON) la prețul din momentul decontului. */
  spalatorii?: { cursaId: string; nr: number; suma: number }[];
  note?: string;
}
