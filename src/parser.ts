import { waDigits } from './phone';
import type { Directie, Moneda, Plata, Telefon } from './types';

export interface RezervareExtrasa {
  nume: string;
  telefoane: Telefon[];
  pasageri: number;
  ora?: string;
  zbor?: string;
  preluare?: string;
  lasare?: string;
  observatii?: string;
  eticheta?: string;
  plata: Plata;
  textOriginal: string;
  /** YYYY-MM-DD, dacă apare în mesaj. */
  data?: string;
  directie?: Directie;
  /** Capătul rutei care nu e Timișoara. */
  destinatie?: string;
}

export interface Rezultat {
  rezervari: RezervareExtrasa[];
  /** HH:MM, din mesajul de plecare al dispecerului. */
  plecare?: string;
  /** HH:MM, ora de retur din mesajul de plecare. */
  retur?: string;
  data?: string;
  destinatie?: string;
  /** Text care nu e rezervare (instrucțiuni etc.). */
  note: string[];
}

interface Mesaj {
  text: string;
  /** Data trimiterii (ISO), din prefixul WhatsApp. */
  trimis?: string;
}

const LITERE = 'A-Za-zĂÂÎȘȚăâîșțŞşŢţ';
const PREFIX = /^\[(\d{1,2}):(\d{2}),\s*(\d{1,2})\/(\d{1,2})\/(\d{4})\]\s*[^:\t]*:\s*/;
const TELEFON_LA_INCEPUT = /^(?:\+|00)?\d[\d\s().-]*\d/;
const BANI = /(\d+(?:[.,]\d+)?)\s*(?:de\s+)?(euro|eur|lei|ron|€)/gi;
const CUVINTE_PLATA = /achit|cash|plat[aă]\s+la|la\s+[sș]ofer|\bop\b|ordin\s+de\s+plat|fact\./i;

const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim();

const pad = (n: number | string) => String(n).padStart(2, '0');

function normOra(h: string, m?: string): string {
  return `${pad(h)}:${pad(m ?? '00')}`;
}

function adaugaZile(iso: string, zile: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d + zile);
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
}

function azi(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function cifre(s: string): number {
  return s.replace(/\D/g, '').length;
}

function titluDacaMajuscule(s: string): string {
  if (s !== s.toUpperCase() || !/[A-ZĂÂÎȘȚ]/.test(s)) return s;
  return s.toLowerCase().replace(/(^|[\s-])(\p{L})/gu, (_, a: string, b: string) => a + b.toUpperCase());
}

function esteTelefonSingur(t: string): boolean {
  return /^[+\d][\d\s().;+-]*$/.test(t) && cifre(t) >= 8;
}

function esteCelulaTelefon(c: string): boolean {
  const m = c.match(TELEFON_LA_INCEPUT);
  return !!m && cifre(m[0]) >= 8;
}

function parseData(c: string): string | undefined {
  let m = c.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return c;
  m = c.match(/^(\d{1,2})[-./](\d{1,2})[-./](\d{2}|\d{4})$/);
  if (m) return `${m[3].length === 2 ? '20' + m[3] : m[3]}-${pad(m[2])}-${pad(m[1])}`;
  return undefined;
}

function extrageTelefoane(celula: string): Telefon[] {
  const rezultat: Telefon[] = [];
  for (const parte of celula.split(';')) {
    const t = parte.trim();
    const m = t.match(TELEFON_LA_INCEPUT);
    if (!m || cifre(m[0]) < 8) continue;
    const rest = t.slice(m[0].length).replace(/^[\s:-]+/, '').trim();
    rezultat.push({ numar: m[0].trim().replace(/\s+/g, ' '), eticheta: rest || undefined });
  }
  return rezultat;
}

/** Numere de telefon oriunde într-un text liber (observații). */
function telefoaneDinText(text: string): Telefon[] {
  const gasite = text.match(/(?:\+|00)\d[\d\s]{7,15}\d|\b0\d{2,3}[\s.]?\d{3}[\s.]?\d{3,4}\b/g) ?? [];
  return gasite.filter((g) => cifre(g) >= 9).map((g) => ({ numar: g.trim().replace(/\s+/g, ' ') }));
}

function adaugaTelefon(lista: Telefon[], t: Telefon) {
  const cheie = waDigits(t.numar);
  if (!lista.some((x) => waDigits(x.numar) === cheie)) lista.push(t);
}

export function parsePlata(celula: string): Plata {
  const sume = [...celula.matchAll(BANI)];
  const prima = sume[0];
  const moneda: Moneda = prima && /^(lei|ron)$/i.test(prima[2]) ? 'RON' : 'EUR';
  const achitat =
    /achitat|achit[aă]\s+(cu\s+op|[iî]n\s+banc|prin)|\bop\b|ordin\s+de\s+plat|fact\./i.test(celula);

  let metoda: string | undefined;
  if (/\bop\b|ordin\s+de\s+plat/i.test(celula)) metoda = 'OP';
  else if (/banc/i.test(celula)) metoda = 'bancă';
  else if (/fact/i.test(celula)) metoda = 'factură';
  else if (/cash|plat[aă]\s+la|la\s+[sș]ofer/i.test(celula)) metoda = 'cash';

  return {
    stare: achitat ? 'achitat' : 'de_incasat',
    metoda,
    suma: prima ? Number(prima[1].replace(',', '.')) : undefined,
    moneda,
    notaPret: celula,
  };
}

function esteCelulaPlata(c: string): boolean {
  BANI.lastIndex = 0;
  return /(\d+(?:[.,]\d+)?)\s*(?:de\s+)?(euro|eur|lei|ron|€)/i.test(c) || CUVINTE_PLATA.test(c);
}

function imparteMesaje(text: string): Mesaj[] {
  const linii = text.split(/\r?\n/).map((l) => l.replace(/\s+$/, ''));
  const cuPrefix = linii.some((l) => PREFIX.test(l.trim()));
  const mesaje: Mesaj[] = [];

  for (const linie of linii) {
    if (!linie.trim()) continue;
    const l = linie.replace(/^ +/, '');
    const p = l.match(PREFIX);
    if (p) {
      mesaje.push({
        text: l.replace(PREFIX, ''),
        trimis: `${p[5]}-${pad(p[3])}-${pad(p[4])}`,
      });
    } else if (cuPrefix && mesaje.length) {
      mesaje[mesaje.length - 1].text += '\t' + l;
    } else {
      mesaje.push({ text: l });
    }
  }
  return mesaje;
}

function parsePlecare(text: string, baza: string) {
  const p = text.match(/plec\w*[^\d]*?(\d{1,2})(?:[:;.](\d{2}))?/i);
  if (!p) return undefined;
  const r = text.match(/retur[^\d]*?(\d{1,2})[:;.](\d{2})/i);
  let data = baza;
  if (/poim[aâ]ine/i.test(text)) data = adaugaZile(baza, 2);
  else if (/m[aâ]ine/i.test(text)) data = adaugaZile(baza, 1);
  return { plecare: normOra(p[1], p[2]), retur: r ? normOra(r[1], r[2]) : undefined, data };
}

function parseRezervare(cells: string[], original: string): RezervareExtrasa {
  const idxTel = cells.findIndex(esteCelulaTelefon);
  const nume: string[] = [];
  const note: string[] = [];
  const telefoane: Telefon[] = [];
  let eticheta: string[] = [];
  let numeDinTelefon: string | undefined;

  for (const c of cells.slice(0, idxTel)) {
    if (!c) continue;
    if (/pax/i.test(c)) {
      note.push(c);
      continue;
    }
    const m = c.match(/^(.*?)\s+-\s+([A-ZĂÂÎȘȚ]{3,})$/);
    if (m) {
      nume.push(titluDacaMajuscule(m[1]));
      eticheta.push(m[2]);
    } else {
      nume.push(titluDacaMajuscule(c));
    }
  }

  for (const [i, t] of extrageTelefoane(cells[idxTel]).entries()) {
    if (i === 0 && t.eticheta && nume.length === 0) {
      numeDinTelefon = titluDacaMajuscule(t.eticheta);
      adaugaTelefon(telefoane, { numar: t.numar });
    } else {
      adaugaTelefon(telefoane, t);
    }
  }

  let data: string | undefined;
  let directie: Directie | undefined;
  let destinatie: string | undefined;
  let lasareRuta: string | undefined;
  let ora: string | undefined;
  let zbor: string | undefined;
  let preluare: string | undefined;
  let lasare: string | undefined;
  let plata: Plata | undefined;

  for (const c of cells.slice(idxTel + 1)) {
    if (!c) continue;

    const d = parseData(c);
    if (d && !data) {
      data = d;
      continue;
    }

    const ruta = c.match(new RegExp(`^([${LITERE}]{3,15})\\s*[-–]\\s*([${LITERE}]{3,15})$`));
    if (ruta && !directie) {
      const [a, b] = [ruta[1], ruta[2]];
      if (norm(a) === 'timisoara') {
        directie = 'dus';
        destinatie = b;
      } else {
        directie = 'retur';
        destinatie = a;
        if (norm(b) !== 'timisoara') lasareRuta = b;
      }
      continue;
    }

    const t = c.match(/^(\d{1,2})[:;.](\d{2})\b\s*(.*)$/);
    if (t && !ora) {
      ora = normOra(t[1], t[2]);
      const rest = t[3].replace(/^[\s,;-]+/, '').replace(/\s*,\s*/g, ', ').trim();
      if (/^(preluare|decolare|aterizare)$/i.test(rest)) note.push(`Ora: ${rest.toLowerCase()}`);
      else if (rest) zbor = rest;
      continue;
    }

    if (!plata && esteCelulaPlata(c)) {
      plata = parsePlata(c);
      continue;
    }

    if (/pax|bagaj|\btel\b/i.test(c) || c.length > 60) {
      note.push(c);
      for (const tel of telefoaneDinText(c)) adaugaTelefon(telefoane, tel);
      continue;
    }

    if (norm(c) === 'altele') {
      note.push('Tip: altele');
      continue;
    }

    if (plata) eticheta.push(c);
    else if (ora) lasare ??= c;
    else if (!preluare) preluare = c;
    else note.push(c);
  }

  if (!lasare && lasareRuta) lasare = lasareRuta;
  if (!destinatie && lasare) destinatie = lasare.split(',')[0].trim();

  const pax = original.match(/(\d+)\s*pax/i);

  return {
    nume: nume.join(' ') || numeDinTelefon || '',
    telefoane,
    pasageri: pax ? Number(pax[1]) : 1,
    ora,
    zbor,
    preluare,
    lasare,
    observatii: note.length ? note.join(' | ') : undefined,
    eticheta: eticheta.length ? eticheta.join(', ') : undefined,
    plata: plata ?? { stare: 'de_incasat', moneda: 'EUR' },
    textOriginal: original,
    data,
    directie,
    destinatie,
  };
}

/** Rezervare dintr-un rând fără coloane (text liber) care conține un telefon. */
function parseLiber(text: string): RezervareExtrasa | undefined {
  const tel = telefoaneDinText(text);
  if (tel.length === 0) return undefined;
  const inainte = text.slice(0, text.search(/(?:\+|00)?\d[\d\s]{8,}/)).replace(/[\s,:;-]+$/, '').trim();
  const ora = text.match(/\b(\d{1,2})[:;](\d{2})\b/);
  const pax = text.match(/(\d+)\s*pax/i);
  return {
    nume: inainte ? titluDacaMajuscule(inainte) : '',
    telefoane: tel,
    pasageri: pax ? Number(pax[1]) : 1,
    ora: ora ? normOra(ora[1], ora[2]) : undefined,
    observatii: text,
    plata: esteCelulaPlata(text) ? parsePlata(text) : { stare: 'de_incasat', moneda: 'EUR' },
    textOriginal: text,
  };
}

export function parseMesaje(text: string, astazi: string = azi()): Rezultat {
  const rezultat: Rezultat = { rezervari: [], note: [] };

  for (const mesaj of imparteMesaje(text)) {
    const t = mesaj.text.trim();
    const celule = mesaj.text.split('\t').map((c) => {
      const x = c.trim();
      return x === '-' ? '' : x;
    });
    const ultima = rezultat.rezervari[rezultat.rezervari.length - 1];

    if (esteTelefonSingur(t)) {
      if (ultima) for (const x of extrageTelefoane(t)) adaugaTelefon(ultima.telefoane, x);
      else rezultat.note.push(t);
      continue;
    }

    if (celule.length >= 3 && celule.some(esteCelulaTelefon)) {
      rezultat.rezervari.push(parseRezervare(celule, mesaj.text));
      continue;
    }

    if (!t.includes('\t') && /plec/i.test(t)) {
      const p = parsePlecare(t, mesaj.trimis ?? astazi);
      if (p) {
        rezultat.plecare = p.plecare;
        rezultat.retur = p.retur ?? rezultat.retur;
        rezultat.data = p.data;
        continue;
      }
    }

    const liber = parseLiber(t);
    if (liber) rezultat.rezervari.push(liber);
    else rezultat.note.push(t);
  }

  rezultat.data ??= rezultat.rezervari.find((r) => r.data)?.data;
  rezultat.destinatie = rezultat.rezervari.find((r) => r.destinatie)?.destinatie;
  return rezultat;
}
