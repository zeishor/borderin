export type Moneda = 'RON' | 'EUR' | 'GBP' | 'CHF';
export type Directie = 'dus' | 'retur';
export type StarePlata = 'de_incasat' | 'achitat';

export interface Telefon {
  numar: string;
  eticheta?: string;
}

/** Sumă restantă pe lângă preț (ex. „încă 50 euro restanți"), de încasat separat. */
export interface ExtraPlata {
  suma: number;
  moneda: Moneda;
  /** Cum a fost numită în mesaj: „restanță", „în plus" etc. */
  nota?: string;
  incasat?: { suma: number; moneda: Moneda };
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
  /** Sume restante peste preț, fiecare cu încasarea ei. */
  extra?: ExtraPlata[];
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
  /** Suma pentru șofer, în lei: din lista de prețuri sau scrisă manual. */
  sumaSofer?: number;
  /** De unde vine suma („Șilagiu → Buziaș"), „manual" sau „Preț lipsă: …". */
  sumaSursa?: string;
  /** Marcat de șofer: cursa nu are bilet de parcare (de ex. la departures). Doar informativ, nu blochează decontul. */
  faraBilet?: boolean;
  /** Cursă locală: din localitate marcată locală sau bifată de șofer. */
  locala?: boolean;
}

/** Monedele cu curs de schimb față de leu (RON are cursul 1). */
export type MonedaCurs = 'EUR' | 'GBP' | 'CHF' | 'HUF';
/** Cât valorează 1 unitate din monedă, în lei. */
export type Cursuri = Partial<Record<MonedaCurs, number>>;

/**
 * O localitate cu preț. Mamă: are `sumaRon` (suma pe cursă, în lei). Limitrofă: are `mamaId` și ia suma mamei.
 */
export interface Localitate {
  id: string;
  nume: string;
  mamaId?: string;
  sumaRon?: number;
  /** Mamă „locală" (ex. Arad): cursele ei pot fi incluse în salariu, în limita setată pe lună. */
  locala?: boolean;
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
  /** Cursuri de schimb: 1 EUR = x lei etc. Lipsa unui curs înseamnă „necunoscut". */
  cursuri: Cursuri;
  /** Salariul de bază lunar, în lei. Nu se decontează, doar se afișează în rezumatul lunii. */
  salariuBazaRon: number;
  /** Câte curse locale pe lună sunt incluse în salariu și nu se decontează (primele din lună, după dată). */
  curseLocaleInclusePeLuna: number;
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

/** Cheltuială extra a șoferului la o cursă (taxă de drum, apă etc.), de decontat odată cu cursa. */
export interface Cheltuiala {
  id: string;
  cursaId: string;
  creat: number;
  modificat: number;
  descriere: string;
  suma: number;
  moneda: MonedaBilet;
  foto?: Blob;
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
  /** Cheltuielile extra decontate. */
  cheltuieli?: string[];
  /** Spălările decontate: câte, din ce cursă, și suma (RON) la prețul din momentul decontului. */
  spalatorii?: { cursaId: string; nr: number; suma: number }[];
  /** Cursele decontate, cu suma (lei) din momentul decontului. */
  curse?: { cursaId: string; suma: number }[];
  /** Cursurile (lei pentru 1 unitate) folosite la acest decont. */
  cursuri?: Cursuri;
  /** Banii păstrați de șofer la acest decont (pentru rest etc.), pe monede. Rămân de predat data viitoare. */
  pastrat?: Record<Moneda, number>;
  /** Rezultatul în lei: pozitiv = de primit de la firmă, negativ = de predat firmei. */
  soldRon?: number;
  note?: string;
}
