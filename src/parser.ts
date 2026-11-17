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

/** Un rând cu multe coloane (rezervare întreagă pe un singur rând). */
function esteRandComplet(linie: string): boolean {
  return linie.split('\t').length >= 6;
}

function imparteMesaje(text: string): Mesaj[] {
  const linii = text.split(/\r?\n/).map((l) => l.replace(/\s+$/, ''));
  const cuPrefix = linii.some((l) => PREFIX.test(l.trim()));
  const mesaje: Mesaj[] = [];
  // Fără prefix WhatsApp: rândurile-fragment (puține coloane) ale aceluiași mesaj se lipesc
  // între ele, până la un rând complet, un telefon singur, o plecare sau un rând gol.
  let grupDeschis = false;

  for (const linie of linii) {
    if (!linie.trim()) {
      grupDeschis = false;
      continue;
    }
    const l = linie.replace(/^ +/, '');
    const p = l.match(PREFIX);
    if (p) {
      mesaje.push({
        text: l.replace(PREFIX, ''),
        trimis: `${p[5]}-${pad(p[3])}-${pad(p[4])}`,
      });
    } else if (cuPrefix && mesaje.length) {
      mesaje[mesaje.length - 1].text += '\t' + l;
    } else if (esteRandComplet(l) || esteTelefonSingur(l.trim()) || (!l.includes('\t') && /plec/i.test(l))) {
      mesaje.push({ text: l });
      grupDeschis = false;
    } else if (grupDeschis) {
      mesaje[mesaje.length - 1].text += '\t' + l;
    } else {
      mesaje.push({ text: l });
      grupDeschis = l.includes('\t');
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

const LOC_CUNOSCUT = /timi[sș]oara|budapest|arad|oradea|belgrad|viena|cluj|sibiu|szeged|debrecen|aeroport/i;

function curataLoc(s: string): string {
  return s.replace(/\baeroport(ul)?\b/gi, '').replace(/\s+/g, ' ').trim() || s.trim();
}

/** „Oraș preluare - oraș destinație", oriunde într-un rând, cu cuvinte multiple și diferite liniuțe. */
export function parseRuta(c: string): { directie: Directie; destinatie: string; lasare?: string } | undefined {
  const m = c.match(/^([^\d]{3,30}?)\s*(?:->|→|–|—|-)+\s*([^\d]{3,30})$/u);
  if (!m) return undefined;
  const [a, b] = [m[1].trim(), m[2].trim()];
  if ([a, b].some((x) => x.split(/\s+/).length > 3)) return undefined;
  if (!LOC_CUNOSCUT.test(a) && !LOC_CUNOSCUT.test(b)) return undefined;
  const timisoara = /timi[sș]oara/i;
  if (timisoara.test(norm(a)) || timisoara.test(a)) return { directie: 'dus', destinatie: curataLoc(b) };
  if (timisoara.test(b)) return { directie: 'retur', destinatie: curataLoc(a) };
  return { directie: 'retur', destinatie: curataLoc(a), lasare: curataLoc(b) };
}

function parseRezervare(cells: string[], original: string, trimis: string): RezervareExtrasa {
  const idxTel = cells.findIndex(esteCelulaTelefon);
  const idxRuta = cells.findIndex((c, i) => i !== idxTel && !!parseRuta(c));
  const ruta = idxRuta >= 0 ? parseRuta(cells[idxRuta]) : undefined;

  const nume: string[] = [];
  const note: string[] = [];
  const telefoane: Telefon[] = [];
  const eticheta: string[] = [];
  let numeDinTelefon: string | undefined;
  let data: string | undefined;
  let dataRelativa: string | undefined;
  let directieCuvant: Directie | undefined;
  let ora: string | undefined;
  let zbor: string | undefined;
  let preluare: string | undefined;
  let lasare: string | undefined;
  let plata: Plata | undefined;
  let destinatie: string | undefined = ruta?.destinatie;

  const numeFaraTelefon = cells.slice(0, idxTel).some((c, i) => c && i !== idxRuta && !esteMetadata(c));
  for (const [i, t] of extrageTelefoane(cells[idxTel]).entries()) {
    if (i === 0 && t.eticheta && !numeFaraTelefon) {
      numeDinTelefon = titluDacaMajuscule(t.eticheta);
      adaugaTelefon(telefoane, { numar: t.numar });
    } else {
      adaugaTelefon(telefoane, t);
    }
  }

  cells.forEach((c, i) => {
    if (!c || i === idxTel || i === idxRuta) return;
    const dupaTelefon = i > idxTel;

    const d = parseData(c);
    if (d && !data) {
      data = d;
      return;
    }

    const cuvant = c.match(/^(retur|dus)\b\s*(.*)$/i);
    if (cuvant && c.length < 25 && /^(azi|ast[aă]zi|m[aâ]ine|poim[aâ]ine)?$/i.test(cuvant[2].trim())) {
      directieCuvant = cuvant[1].toLowerCase() as Directie;
      if (/poim/i.test(cuvant[2])) dataRelativa = adaugaZile(trimis, 2);
      else if (/m[aâ]ine/i.test(cuvant[2])) dataRelativa = adaugaZile(trimis, 1);
      else if (cuvant[2].trim()) dataRelativa = trimis;
      return;
    }

    const t = c.match(/^(\d{1,2})[:;.](\d{2})\b\s*(.*)$/);
    if (t && !ora) {
      ora = normOra(t[1], t[2]);
      const rest = t[3].replace(/^[\s,;-]+/, '').replace(/\s*,\s*/g, ', ').trim();
      if (/^(preluare|decolare|aterizare)$/i.test(rest)) note.push(`Ora: ${rest.toLowerCase()}`);
      else if (rest) zbor = rest;
      return;
    }

    if (!plata && esteCelulaPlata(c)) {
      plata = parsePlata(c);
      return;
    }

    if (/pax|bagaj|\btel\b/i.test(c) || c.length > 60) {
      note.push(c);
      for (const tel of telefoaneDinText(c)) adaugaTelefon(telefoane, tel);
      return;
    }

    if (norm(c) === 'altele') {
      note.push('Tip: altele');
      return;
    }

    if (!dupaTelefon) {
      const m = c.match(/^(.*?)\s+-\s+([A-ZĂÂÎȘȚ]{3,})$/);
      if (m) {
        nume.push(titluDacaMajuscule(m[1]));
        eticheta.push(m[2]);
      } else {
        nume.push(titluDacaMajuscule(c));
      }
      return;
    }

    if (plata) eticheta.push(c);
    else if (ora) lasare ??= c;
    else if (!preluare) preluare = c;
    else note.push(c);
  });

  const directie = ruta?.directie ?? directieCuvant;
  if (!lasare && ruta?.lasare) lasare = ruta.lasare;
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
    data: data ?? dataRelativa,
    directie,
    destinatie,
  };
}

/** Celulă care nu poate fi nume: dată, oră, plată, rută sau cuvânt de direcție. */
function esteMetadata(c: string): boolean {
  return (
    !!parseData(c) ||
    /^\d{1,2}[:;.]\d{2}\b/.test(c) ||
    esteCelulaPlata(c) ||
    !!parseRuta(c) ||
    /^(retur|dus)\b/i.test(c) ||
    /pax|bagaj|\btel\b/i.test(c) ||
    c.length > 60
  );
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
      rezultat.rezervari.push(parseRezervare(celule, mesaj.text, mesaj.trimis ?? astazi));
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
