import { CUVINTE_MONEDA, monedaDinCuvant } from './monede';
import { waDigits } from './phone';
import type { Directie, ExtraPlata, Moneda, Plata, Telefon } from './types';

export interface RezervareExtrasa {
  nume: string;
  telefoane: Telefon[];
  pasageri: number;
  ora?: string;
  zbor?: string;
  orasZbor?: string;
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

const SENDER = String.raw`\s*[^:\t]*:\s*`;
const TELEFON_LA_INCEPUT = /^(?:\+\s*|00)?\(?\d[\d\s().-]*\d/;
const BANI = new RegExp(`(\\d+(?:[.,]\\d+)?)\\s*(?:de\\s+)?(${CUVINTE_MONEDA})`, 'gi');
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

/** Spații în plus înainte de virgulă/punct (din tabele): „Ana , pers . contact" → „Ana, pers. contact". */
function curataText(s: string): string {
  return s.replace(/\s+([,.;])/g, '$1').replace(/([,;])(?=\S)/g, '$1 ').replace(/\s+/g, ' ').trim();
}

/** Loc de preluare/lăsare: fără „pentru" la început și fără spații în plus. */
function curataAdresa(s: string): string {
  return curataText(s).replace(/^pentru\s+/i, '');
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
    const rest = curataText(t.slice(m[0].length).replace(/^[\s:-]+/, ''));
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

/** Toate sumele cu monedă dintr-un text, ex. „40 euro / 220 lei". */
export function sumeDinText(text: string): { suma: number; moneda: Moneda }[] {
  return [...text.matchAll(BANI)].map((m) => ({
    suma: Number(m[1].replace(',', '.')),
    moneda: monedaDinCuvant(m[2]),
  }));
}

/** Cuvinte care preced o sumă extra: „încă 50 euro", „pe lângă", „în plus", „restanți 50 euro". */
const SEMN_INAINTE = /restan[^\s,;.)]*|[iî]n\s+plus|pe\s+l[aâ]ng[aă]|suplimentar[^\s,;.)]*|diferen[^\s,;.)]*|datorat[^\s,;.)]*|\bplus\b|(?<![^\s,;(+])[iî]nc[aă](?![^\s,;.)])|mai\s+(?:are|ai)\s+de\s+[iî]ncasat/gi;
/** Cuvinte care urmează imediat o sumă extra: „50 euro restanți". */
const SEMN_DUPA = /^\s*(?:de\s+)?(?:restan[^\s,;.)]*|[iî]n\s+plus|suplimentar[^\s,;.)]*|datorat[^\s,;.)]*)/i;

/**
 * Desparte sumele extra (restanțe, „încă 50 euro") de prețul obișnuit. „40 euro / 220 lei" rămâne preț în două monede;
 * „40 euro + încă 50 euro restanți" are prețul 40 și o restanță de 50. `baza` e textul fără partea cu restanța.
 */
export function analizeazaSume(text: string): { baza: string; extra: ExtraPlata[] } {
  const sume = [...text.matchAll(BANI)];
  const extra: ExtraPlata[] = [];
  const taieri: [number, number][] = [];

  sume.forEach((m, i) => {
    const start = m.index ?? 0;
    const sfarsit = start + m[0].length;
    const dupaAnterioara = i > 0 ? (sume[i - 1].index ?? 0) + sume[i - 1][0].length : 0;
    const inainte = text.slice(Math.max(dupaAnterioara, start - 25), start);
    const pana = i + 1 < sume.length ? (sume[i + 1].index ?? text.length) : text.length;
    const dupa = text.slice(sfarsit, pana);

    const semne = [...inainte.matchAll(SEMN_INAINTE)];
    const semn = semne.length ? semne[semne.length - 1] : undefined;
    const semnDupa = dupa.match(SEMN_DUPA);
    if (!semn && !semnDupa) return;

    const cuvinte = `${semn?.[0] ?? ''} ${semnDupa?.[0] ?? ''}`.toLowerCase();
    extra.push({
      suma: Number(m[1].replace(',', '.')),
      moneda: monedaDinCuvant(m[2]),
      nota: /restan/.test(cuvinte) ? 'restanță' : 'în plus',
    });
    let de = semn ? Math.max(dupaAnterioara, start - 25) + (semn.index ?? 0) : start;
    while (de > 0 && /[\s+,;]/.test(text[de - 1])) de--; // și „+" sau virgula dinainte
    taieri.push([de, sfarsit + (semnDupa ? semnDupa[0].length : 0)]);
  });

  if (!taieri.length) return { baza: text, extra };
  let baza = '';
  let cursor = 0;
  for (const [de, pana] of taieri) {
    baza += text.slice(cursor, de);
    cursor = pana;
  }
  baza += text.slice(cursor);
  baza = baza.replace(/\s+/g, ' ').replace(/^[\s,;+-]+|[\s,;+-]+$/g, '');
  return { baza, extra };
}

/** Adaugă la plată sumele extra găsite oriunde în textul rezervării (fără dubluri). */
function cuExtra(plata: Plata, text: string): Plata {
  const extra = [...(plata.extra ?? [])];
  for (const x of analizeazaSume(text).extra) {
    if (!extra.some((y) => y.suma === x.suma && y.moneda === x.moneda)) extra.push(x);
  }
  return extra.length ? { ...plata, extra } : plata;
}

export function parsePlata(celula: string): Plata {
  const { baza, extra } = analizeazaSume(celula);
  const sume = [...baza.matchAll(BANI)];
  const prima = sume[0];
  const moneda: Moneda = prima ? monedaDinCuvant(prima[2]) : 'EUR';
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
    notaPret: baza || undefined,
    extra: extra.length ? extra : undefined,
  };
}

function esteCelulaPlata(c: string): boolean {
  BANI.lastIndex = 0;
  return new RegExp(BANI.source, 'i').test(c) || CUVINTE_PLATA.test(c);
}

/** Un rând cu multe coloane (rezervare întreagă pe un singur rând). */
function esteRandComplet(linie: string): boolean {
  return linie.split('\t').length >= 6;
}

/**
 * Scoate prefixul WhatsApp și întoarce data trimiterii. Formate: Desktop `[12:01, 11/15/2026] nume:`
 * (lună/zi/an), telefon `[15/11, 12:01] nume:` (zi/lună, fără an), iOS `[15.11.2026, 12:01:33] nume:`
 * și export Android `15/11/2026, 12:01 - nume:` (zi/lună/an).
 */
function scoatePrefix(l: string, astazi: string): { text: string; trimis: string } | undefined {
  const an = Number(astazi.slice(0, 4));
  const fara = (zi: string, luna: string) => {
    let candidat = `${an}-${pad(luna)}-${pad(zi)}`;
    if (candidat > adaugaZile(astazi, 30)) candidat = `${an - 1}-${pad(luna)}-${pad(zi)}`;
    return candidat;
  };
  const an4 = (a: string) => (a.length === 2 ? '20' + a : a);

  let m = l.match(new RegExp(String.raw`^\[(\d{1,2}):(\d{2})(?::\d{2})?,\s*(\d{1,2})/(\d{1,2})/(\d{4})\]` + SENDER));
  if (m) return { text: l.slice(m[0].length), trimis: `${m[5]}-${pad(m[3])}-${pad(m[4])}` };

  m = l.match(new RegExp(String.raw`^\[(\d{1,2})[/.](\d{1,2})(?:[/.](\d{2,4}))?,\s*\d{1,2}:\d{2}(?::\d{2})?\]` + SENDER));
  if (m) {
    const trimis = m[3] ? `${an4(m[3])}-${pad(m[2])}-${pad(m[1])}` : fara(m[1], m[2]);
    return { text: l.slice(m[0].length), trimis };
  }

  m = l.match(new RegExp(String.raw`^(\d{1,2})[/.](\d{1,2})[/.](\d{2,4}),\s*\d{1,2}:\d{2}(?::\d{2})?\s*-` + SENDER));
  if (m) return { text: l.slice(m[0].length), trimis: `${an4(m[3])}-${pad(m[2])}-${pad(m[1])}` };

  return undefined;
}

function imparteMesaje(text: string, astazi: string): Mesaj[] {
  const linii = text.split(/\r?\n/).map((l) => l.replace(/\s+$/, ''));
  const cuPrefix = linii.some((l) => !!scoatePrefix(l.trim(), astazi));
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
    const p = scoatePrefix(l, astazi);
    if (p) {
      mesaje.push(p);
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

const STRAINATATE = /budapest|viena|belgrad|szeged|debrecen/i;
/** Antet de la dispecer: „MAINE TUR 27.11.2026", „Retur azi". Întoarce direcția și data scrisă sau relativă. */
function parseAntet(c: string, trimis: string): { directie: Directie; data?: string } | undefined {
  const m = norm(c).match(/^(?:(azi|astazi|maine|poimaine)\s+)?(tur|dus|retur)\b(?:\s+(azi|astazi|maine|poimaine))?[\s,:-]*([\d./-]*)$/);
  if (!m) return undefined;
  const cand = m[1] ?? m[3];
  const relativa = cand && adaugaZile(trimis, cand === 'poimaine' ? 2 : cand === 'maine' ? 1 : 0);
  return { directie: m[2] === 'retur' ? 'retur' : 'dus', data: parseData(m[4]) ?? relativa };
}

function curataLoc(s: string): string {
  return s.replace(/\baeroport(ul)?\b/gi, '').replace(/\s+/g, ' ').trim() || s.trim();
}

/** „Oraș preluare - oraș destinație", oriunde într-un rând, cu cuvinte multiple și diferite liniuțe. */
export function parseRuta(c: string): { directie: Directie; destinatie: string; lasare?: string; origine?: string } | undefined {
  const m = c.match(/^([^\d]{3,30}?)\s*(?:->|→|–|—|-)+\s*([^\d]{3,30})$/u);
  if (!m) return undefined;
  const [a, b] = [m[1].trim(), m[2].trim()];
  if ([a, b].some((x) => x.split(/\s+/).length > 3)) return undefined;
  if (!LOC_CUNOSCUT.test(a) && !LOC_CUNOSCUT.test(b)) return undefined;
  const timisoara = /timi[sș]oara/i;
  if (timisoara.test(norm(a)) || timisoara.test(a)) return { directie: 'dus', destinatie: curataLoc(b) };
  if (timisoara.test(b)) return { directie: 'retur', destinatie: curataLoc(a) };
  // Fără Timișoara: spre străinătate e dus („Pecica-Budapesta"), din străinătate e retur.
  if (STRAINATATE.test(b) && !STRAINATATE.test(a)) return { directie: 'dus', destinatie: curataLoc(b), origine: curataLoc(a) };
  return { directie: 'retur', destinatie: curataLoc(a), lasare: curataLoc(b) };
}

const STRADA = /\b(str\.?|strada|b-?dul\.?|bulevardul|calea|aleea|bl\.?|nr\.?)(?=\s|\.|\d|$)/i;

/**
 * Opriri din celula de pasageri, ex. „…: Ana si Ion , Sacalaz , Str. A nr 5 ; si Dan , 0762… , Str. B , Bl. 14".
 * Segmentele sunt separate prin „;", numele sunt prima parte, restul (fără telefoane) e adresa.
 * Localitatea care lipsește se ia din prima localitate neutilizată din celula de preluare/lăsare.
 */
function opriri(nota: string, locuri: string | undefined): string[] | undefined {
  const dupaDouaPuncte = nota.includes(':') ? nota.slice(nota.indexOf(':') + 1) : nota;
  const segmente = dupaDouaPuncte.split(';').map((x) => x.trim()).filter(Boolean);
  if (!segmente.some((x) => STRADA.test(x))) return undefined;

  const orase = (locuri ?? '').split(/\s+(?:si|și)\s+|,/i).map((x) => x.trim()).filter(Boolean);
  const folosite = new Set<string>();
  const rezultat: string[] = [];

  for (const seg of segmente) {
    const parti = seg
      .split(',')
      .map((x) => x.trim())
      .filter((x) => x && !esteCelulaTelefon(x) && !/^tel\b/i.test(x));
    if (parti.length < 2) continue;
    const nume = parti[0].replace(/^(si|și)\s+/i, '');
    if (/\d/.test(nume) || STRADA.test(nume)) continue; // prima parte trebuie să fie nume, nu adresă sau oră
    const adresa = parti.slice(1);
    const oras = orase.find((o) => norm(o) === norm(adresa[0]));
    if (oras) folosite.add(norm(oras));
    else {
      const liber = orase.find((o) => !folosite.has(norm(o)));
      if (liber) {
        adresa.unshift(liber);
        folosite.add(norm(liber));
      }
    }
    rezultat.push(`${adresa.join(', ')} (${nume})`);
  }
  return rezultat.length ? rezultat : undefined;
}

/**
 * „2 pax (07…) preluare de pe str. A si 1 pax (07…) preluare de pe str. B" → „Oraș, str. A (2 pax) + Oraș, str. B (1 pax)".
 * Orașul e prima parte din celula de preluare/lăsare.
 */
function opririPeGrupe(nota: string, locuri: string | undefined): string | undefined {
  const grupe = [
    ...nota.matchAll(/(\d+)\s*pax\s*(?:\([\d\s+.]*\))?\s*(?:preluare|l[aă]sare)\s+(?:de\s+)?(?:pe|din|la)?\s*(.+?)(?=\s+(?:si|și)\s+\d+\s*pax|[;|]|$)/gi),
  ];
  if (grupe.length < 2) return undefined;
  const oras = locuri?.split(',')[0].trim();
  return grupe
    .map(([, pax, adresa]) => `${oras ? `${oras}, ` : ''}${curataAdresa(adresa)} (${pax} pax)`)
    .join(' + ');
}

/** Cod de zbor în context sigur (după oră sau după „zbor"): 2 caractere IATA + 1–4 cifre, ex. FR5249, W6 2289. */
const COD_ZBOR = /(?<![A-Za-z0-9])([A-Za-z][A-Za-z0-9]|[0-9][A-Za-z])(\s?)(\d{1,4})(?![A-Za-z0-9])/;
/** Cod de zbor căutat oriunde în text: mai strict (majuscule, 3–4 cifre), ca să nu prindă „BL 14" sau „SC 123". */
const COD_ZBOR_STRICT = /(?<![A-Za-z0-9])([A-Z][A-Z0-9])(\s?)(\d{3,4})(?![A-Za-z0-9])/;
const NU_E_ZBOR = new Set(['SC', 'BL', 'NR', 'ET', 'AP', 'ST', 'SE', 'TM', 'TE', 'JD', 'SA']);

function formeazaCod(m: RegExpMatchArray): string {
  return `${m[1].toUpperCase()}${m[2] ? ' ' : ''}${m[3]}`;
}

/** Desparte „W6 2289, STR" în cod („W6 2289") și oraș/aeroport („STR"). */
export function parseZbor(rest: string): { zbor?: string; orasZbor?: string } {
  const m = rest.match(COD_ZBOR);
  if (!m) return { orasZbor: rest.trim() || undefined };
  const oras = rest
    .replace(m[0], ' ')
    .replace(/[(),;\-–—]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return { zbor: formeazaCod(m), orasZbor: oras || undefined };
}

function cautaCodZbor(text: string): string | undefined {
  const etichetat = text.match(/(?:zbor|flight)\s*:?\s*(.{0,20})/i);
  if (etichetat) {
    const m = etichetat[1].match(COD_ZBOR);
    if (m) return formeazaCod(m);
  }
  for (const m of text.matchAll(new RegExp(COD_ZBOR_STRICT.source, 'g'))) {
    if (!NU_E_ZBOR.has(m[1])) return formeazaCod(m);
  }
  return undefined;
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
  let orasZbor: string | undefined;
  let preluare: string | undefined;
  let lasare: string | undefined;
  let plata: Plata | undefined;
  const celulePax: string[] = [];
  let destinatie: string | undefined = ruta && titluDacaMajuscule(ruta.destinatie);
  const idxOra = cells.findIndex((c) => /^\d{1,2}[:;.]\d{2}\b/.test(c) && !parseData(c));
  let idxPlata = -1;

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

    const antet = parseAntet(c, trimis);
    if (antet) {
      directieCuvant = antet.directie;
      dataRelativa = antet.data;
      return;
    }

    const t = c.match(/^(\d{1,2})[:;.](\d{2})\b\s*(.*)$/);
    if (t && !ora) {
      ora = normOra(t[1], t[2]);
      const rest = t[3].replace(/^[\s,;-]+/, '').replace(/\s*,\s*/g, ', ').trim();
      if (/^preluare$/i.test(rest)) { /* ora de preluare e chiar ora rezervării */ }
      else if (/^(decolare|aterizare)$/i.test(rest)) note.push(`Ora: ${rest.toLowerCase()}`);
      else if (rest) ({ zbor, orasZbor } = parseZbor(rest));
      return;
    }

    if (!plata && esteCelulaPlata(c)) {
      const p = parsePlata(c);
      // O celulă doar cu restanță: prețul poate veni în altă celulă; restanța se adaugă la sfârșit din textul întreg.
      if (p.suma === undefined && p.extra?.length && !p.metoda && p.stare !== 'achitat') return;
      plata = p;
      idxPlata = i;
      return;
    }

    if (/pax|bagaj|\btel\b/i.test(c) || c.length > 60) {
      note.push(c);
      if (/pax/i.test(c)) celulePax.push(c);
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

    // „Piața UTA, blocul U6," + „ARAD": adresa ruptă pe două celule.
    // Localitatea rutei trece în față („Arad, Piața …"), ca la restul adreselor.
    if (preluare?.endsWith(',')) {
      preluare =
        ruta?.origine && norm(c) === norm(ruta.origine)
          ? `${titluDacaMajuscule(c)}, ${preluare.slice(0, -1)}`
          : `${preluare} ${c}`;
    }
    // După preț urmează etichete („PRIVAT"), dar nu când prețul e scris înaintea telefonului.
    else if (plata && idxPlata > idxTel) eticheta.push(c);
    // După oră urmează lăsarea. Când ora e înaintea telefonului (mesaj pe rânduri), adresa e a clientului:
    // preluarea la dus, lăsarea la retur.
    else if (ora && (idxOra > idxTel || directieCuvant === 'retur')) lasare ??= curataAdresa(c);
    else if (!preluare) preluare = curataAdresa(c);
    else note.push(c);
  });

  const directie = ruta?.directie ?? directieCuvant;
  if (!lasare && ruta?.lasare) lasare = titluDacaMajuscule(ruta.lasare);
  preluare = preluare?.replace(/,$/, '');
  if (!destinatie && lasare) destinatie = lasare.split(',')[0].trim();

  for (const c of celulePax) {
    const grupe = opririPeGrupe(c, directie === 'retur' ? lasare : preluare);
    if (grupe) {
      if (directie === 'retur') lasare = grupe;
      else preluare = grupe;
      break;
    }
    const stop = opriri(c, directie === 'retur' ? lasare : preluare);
    if (!stop) continue;
    if (directie === 'retur') lasare = stop.join(' + ');
    else preluare = stop.join(' + ');
    break;
  }

  // „Timisoara" singur ca lăsare la dus (sau ca preluare la retur) e o scăpare în mesaj: e orașul de plecare.
  if (directie === 'dus' && lasare && norm(lasare) === 'timisoara') lasare = undefined;
  if (directie === 'retur' && preluare && norm(preluare) === 'timisoara') preluare = undefined;

  // Fără adresă scrisă: la dus se pleacă din Timișoara spre aeroportul destinației,
  // la retur se pleacă de la aeroportul destinației spre Timișoara.
  if (ruta && destinatie) {
    const aeroport = `Aeroport ${titluDacaMajuscule(destinatie)}`;
    if (directie === 'dus') {
      preluare ??= ruta.origine ? titluDacaMajuscule(ruta.origine) : 'Timisoara';
      lasare ??= aeroport;
    } else {
      preluare ??= aeroport;
      lasare ??= 'Timisoara';
    }
  }

  const pax = original.match(/(\d+)\s*pax/i);

  return {
    nume: nume.join(' ') || numeDinTelefon || '',
    telefoane,
    pasageri: pax ? Number(pax[1]) : 1,
    ora,
    zbor: zbor ?? cautaCodZbor(original),
    orasZbor,
    preluare,
    lasare,
    observatii: note.length ? note.join(' | ') : undefined,
    eticheta: eticheta.length ? eticheta.join(', ') : undefined,
    plata: cuExtra(plata ?? { stare: 'de_incasat', moneda: 'EUR' }, original),
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
    !!parseAntet(c, '2000-01-01') ||
    /pax|bagaj|\btel\b/i.test(c) ||
    c.length > 60
  );
}

const LOCALITATI_DIN_JUR =
  /\b(timi[sș]oara|ghiroda|giroc|chi[sș]oda|dumbr[aă]vi[tț]a|mo[sș]ni[tț]a|s[aă]c[aă]laz|[sș]ag|s[aâ]nandrei|s[aâ]nmihaiu|remetea|utvin|buzia[sș]|lugoj|jimbolia|arad|pecica|re[sș]i[tț]a)\b/i;

/** „Tur dec 10 20 1 per Nume Prenume Localitate str … ac 40 eu. 07…": totul pe un rând, fără coloane. */
function parseCompact(text: string): Partial<RezervareExtrasa> | undefined {
  const cap = text.match(/^(tur|dus|retur)\b/i);
  const pax = text.match(/\b(\d+)\s*(?:pax|pers(?:oane|oana|\.)?|per)(?![a-zăâîșț])\.?/i);
  if (!cap || !pax) return undefined;
  const directie: Directie = cap[1].toLowerCase() === 'retur' ? 'retur' : 'dus';
  const ora = text.match(/\b(?:dec(?:olare)?|at(?:erizare)?|ora)\b\.?\s*(\d{1,2})[\s:;.,](\d{2})\b/i);

  // După „N per": nume, localitate, adresă, apoi prețul sau telefonul.
  const rest = text
    .slice(pax.index! + pax[0].length)
    .split(/\s+(?:ac|achit[aă]?|achitat|cash|plat[aă])(?![a-zăâîșț])|\s*\d+\s*(?=(?:euro|eur|eu|lei|ron)(?![a-z]))|\s*(?:\+|00)?\d{9,}/i)[0]
    .trim();
  const strada = rest.search(STRADA);
  const faraStrada = (strada >= 0 ? rest.slice(0, strada) : rest).trim();
  const localitate = faraStrada.match(LOCALITATI_DIN_JUR);
  // Fără localitate cunoscută, numele sunt primele două cuvinte.
  const lungime = localitate ? localitate.index! : faraStrada.split(/\s+/).slice(0, 2).join(' ').length;
  const nume = rest.slice(0, lungime).replace(/[\s,;-]+$/, '');
  const loc = rest.slice(lungime).replace(/^[\s,;-]+|[\s,;-]+$/g, '');
  const adresa = loc.replace(new RegExp(`^(${LOCALITATI_DIN_JUR.source})\\s+(?=\\S)`, 'i'), '$1, ').replace(/,\s*,/, ',');

  const { extra } = analizeazaSume(text);
  const plata = parsePlata(text);
  const nota = text.match(/(?:(?:ac|achit[aă]?|achitat|cash)\s+)?\d+(?:[.,]\d+)?\s*(?:de\s+)?(?:euro|eur|eu|lei|ron)(?![a-z])/i);

  return {
    plata: { ...plata, notaPret: nota?.[0] ?? plata.notaPret, extra: extra.length ? extra : undefined },
    nume: titluDacaMajuscule(nume),
    pasageri: Number(pax[1]),
    ora: ora ? normOra(ora[1], ora[2]) : undefined,
    directie,
    preluare: directie === 'dus' ? adresa || undefined : undefined,
    lasare: directie === 'retur' ? adresa || undefined : undefined,
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
    ...parseCompact(text),
  };
}

export function parseMesaje(text: string, astazi: string = azi()): Rezultat {
  const rezultat: Rezultat = { rezervari: [], note: [] };

  // Tabelele pun uneori un apostrof în fața telefonului („'0700 …"), ca să rămână text.
  const faraApostrof = text.replace(/(^|[\t\n;])([ ]*)['’‘`]+(?=[ ]*(?:\+|0))/g, '$1$2');

  for (const mesaj of imparteMesaje(faraApostrof, astazi)) {
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
