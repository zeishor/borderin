import { gaseste, distantaKm, type Loc } from './localitati';
import { norm } from './preturi';
import type { PlanPreluare, OprirePlan, Punct, Rezervare } from './types';

/** Cheile punctelor fixe din plan; opririle au drept cheie adresa normalizată. */
export const START = 'start';
export const GRANITA = 'granita';
export const AEROPORT = 'aeroport';
/** Aeroportul Budapest Liszt Ferenc, terminalul 2. */
export const AEROPORT_BUD: Punct = { lat: 47.4329, lon: 19.2611 };

const STRADA = /\b(str\.?|strada|b-?dul\.?|bd\.?|bulevardul|calea|aleea|pia[tț]a|bl\.?|blocul|nr\.?)(?=\s|\.|\d|$)/i;

export const cheieAdresa = (adresa: string) => norm(adresa).replace(/[^a-z0-9]+/g, ' ').trim();

/** Opririle de preluare de la dus, una pe adresă (pasagerii de la aceeași adresă se adună). */
export function opririDinRezervari(rezervari: Rezervare[]): OprirePlan[] {
  const opriri = new Map<string, OprirePlan>();
  for (const r of rezervari) {
    if (r.directie !== 'dus') continue;
    const parti = (r.preluare ?? '').split(/\s+\+\s+/).filter((p) => p.trim());
    for (const parte of parti) {
      const grup = parte.match(/\((\d+)\s*pax\)\s*$/i);
      // Fără numele sau numărul de pasageri din paranteza de la sfârșit.
      const adresa = parte.replace(/\s*\([^()]*\)\s*$/, '').trim();
      const cheie = cheieAdresa(adresa);
      if (!cheie || /^aeroport/.test(cheie)) continue;
      const pasageri = grup ? Number(grup[1]) : parti.length === 1 ? r.pasageri : 1;
      const existenta = opriri.get(cheie);
      if (existenta) {
        existenta.pasageri += pasageri;
        if (r.nume && !existenta.nume.includes(r.nume)) existenta.nume.push(r.nume);
      } else {
        opriri.set(cheie, { cheie, adresa, nume: r.nume ? [r.nume] : [], telefon: r.telefoane[0]?.numar, pasageri });
      }
    }
  }
  return [...opriri.values()];
}

/** Localitatea unei adrese („Ghiroda, str …" sau „Pecica str. 505"); fără una recunoscută, Timișoara. */
export function localitateDin(adresa: string, baza: Loc[]): string {
  for (const parte of adresa.replace(/\([^)]*\)/g, '').split(',')) {
    const strada = parte.search(STRADA);
    const candidat = (strada >= 0 ? parte.slice(0, strada) : parte).trim();
    // „Bucovat 56": localitate urmată de număr.
    const faraNumar = candidat.replace(/\s+(nr\.?\s*)?\d.*$/i, '');
    if (faraNumar !== candidat && parte === adresa.split(',')[0] && gaseste(faraNumar, baza)) return faraNumar;
    if (!candidat || /\d/.test(candidat)) continue;
    // Prima parte e localitatea; părțile următoare contează doar dacă sunt în bază.
    if (gaseste(candidat, baza) || (parte === adresa.split(',')[0] && strada !== 0)) return candidat;
  }
  return 'Timisoara';
}

export const CENTRU_TIMISOARA: Punct = { lat: 45.7537, lon: 21.2257 };

/** Dintre localitățile cu același nume, cea mai apropiată de Timișoara (Bucovăț din Timiș, nu din Dolj). */
export function centruLocalitate(nume: string, baza: Loc[]): Loc | undefined {
  const n = norm(nume);
  return baza
    .filter((l) => norm(l.ascii || l.nume) === n || norm(l.nume) === n)
    .sort((a, b) => distantaKm(a, CENTRU_TIMISOARA) - distantaKm(b, CENTRU_TIMISOARA))[0];
}

/** Textul de căutat pe hartă: strada întâi, localitatea la urmă, fără observații în paranteză. */
export function interogare(adresa: string): string {
  const curat = adresa.replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();
  const [prima, ...rest] = curat.split(',').map((x) => x.trim()).filter(Boolean);
  if (rest.length && !STRADA.test(prima) && !/\d/.test(prima)) return `${rest.join(', ')}, ${prima}`;
  return curat;
}

/**
 * Strada și numărul dintr-o adresă scrisă de dispecer, fără ce încurcă căutarea pe hartă
 * („nr.", scară, bloc, apartament, observații în paranteză).
 */
export function stradaSiNumar(adresa: string, localitate: string): { strada: string; numar?: string } {
  const parti = adresa
    .replace(/\([^)]*\)/g, ' ')
    .replace(/(?<![\p{L}])(sc(ara)?|bl(oc(ul)?)?|ap(art(ament)?)?|et(aj)?|int(erfon)?)(?![\p{L}])\.?\s*[\p{L}\d]{1,4}(?![\p{L}\d])/giu, ' ')
    .split(',')
    .map((x) => x.replace(/\s+/g, ' ').trim())
    // Localitatea, singură sau urmată de un număr, nu face parte din stradă.
    .filter((x) => x && norm(x) !== norm(localitate));
  // „Bucovat 56, …": adresă de sat, numărul vine direct după localitate; restul sunt indicații.
  const dupaSat = parti.map((x) => (norm(x).startsWith(`${norm(localitate)} `) ? x.slice(localitate.length).trim() : ''))[0];
  if (dupaSat && /^(nr\.?\s*)?\d+\s?[a-z]?$/i.test(dupaSat)) return { strada: '', numar: dupaSat.replace(/^nr\.?\s*/i, '') };
  const iStrada = parti.findIndex((x) => STRADA.test(x) && !/^nr(?![\p{L}])/iu.test(x));
  const i = iStrada >= 0 ? iStrada : 0;
  let strada = parti[i] ?? '';
  if (norm(strada).startsWith(`${norm(localitate)} `)) strada = strada.slice(localitate.length).trim();

  let numar: string | undefined;
  const cuNr = [strada, ...parti.slice(i + 1)].join(', ').match(/(?<![\p{L}])(?:nr|num[aă]rul)(?![\p{L}])\.?\s*(\d+\s?[a-z]?)(?![\p{L}\d])/iu);
  if (cuNr) numar = cuNr[1];
  strada = strada.replace(/(?<![\p{L}])(?:nr|num[aă]rul)(?![\p{L}])\.?.*$/iu, '').trim();
  const laSfarsit = strada.match(/^(.*\p{L}.*?)\s+(\d+\s?[a-z]?)$/iu);
  // „str. 505": numărul e chiar numele străzii.
  if (laSfarsit && !/^(str\.?|strada)$/i.test(laSfarsit[1])) {
    strada = laSfarsit[1];
    numar ??= laSfarsit[2];
  } else numar ??= parti.slice(i + 1).find((x) => /^\d+\s?[a-z]?$/i.test(x));

  strada = strada
    .replace(/^(?:str\.|str(?![\p{L}])|strada(?![\p{L}]))\s*/iu, 'Strada ')
    .replace(/^(?:b-?dul\.?|bd\.?|b-dul)\s*/i, 'Bulevardul ')
    .replace(/[\s.-]+$/, '')
    .trim();
  if (strada && !/^(strada|bulevardul|calea|aleea|pia[tț]a|splaiul|intrarea|[sș]oseaua)(?![\p{L}])/iu.test(strada)) strada = `Strada ${strada}`;
  return { strada, numar };
}

/** Variantele de căutare, de la cea mai exactă la cea mai largă. */
export function interogari(adresa: string, localitate: string): string[] {
  const { strada, numar } = stradaSiNumar(adresa, localitate);
  if (!strada) return numar ? [`${localitate} ${numar}`] : [interogare(adresa)];
  const faraPrefix = strada.replace(/^Strada /, '');
  return [
    ...new Set([
      `${strada}${numar ? ` ${numar}` : ''}, ${localitate}`,
      `${faraPrefix}${numar ? ` ${numar}` : ''}, ${localitate}`,
      `${strada}, ${localitate}`,
    ]),
  ];
}

export const cheiePereche = (a: string, b: string) => `${a}>${b}`;

/** Estimare fără internet, din distanța în linie dreaptă: ocol 30%, 60 km/h (90 pe drumul lung), minimum 10 minute. */
export function estimeaza(a: Punct, b: Punct): number {
  const km = distantaKm(a, b) * 1.3;
  return Math.max(10, Math.round((km / (km > 100 ? 90 : 60)) * 60));
}

export function durata(plan: PlanPreluare, a: string, b: string): number {
  const k = cheiePereche(a, b);
  return plan.corectii[k] ?? plan.durate[k] ?? 0;
}

/**
 * Ordinea opririlor cu cel mai scurt drum start → toate opririle → sfârșit.
 * Până la 8 opriri încearcă toate variantele; peste, cel mai apropiat vecin și apoi inversări de segmente.
 */
export function ordineOptima(chei: string[], cost: (a: string, b: string) => number, start = START, sfarsit = GRANITA): string[] {
  const total = (o: string[]) => [start, ...o, sfarsit].reduce((s, k, i, t) => (i ? s + cost(t[i - 1], k) : 0), 0);
  if (chei.length <= 8) {
    let best = chei;
    let bestCost = total(chei);
    const permuta = (prefix: string[], rest: string[]) => {
      if (!rest.length) {
        const c = total(prefix);
        if (c < bestCost) [best, bestCost] = [prefix, c];
        return;
      }
      rest.forEach((k, i) => permuta([...prefix, k], [...rest.slice(0, i), ...rest.slice(i + 1)]));
    };
    permuta([], chei);
    return best;
  }
  let ordine: string[] = [];
  const ramase = [...chei];
  while (ramase.length) {
    const de = ordine[ordine.length - 1] ?? start;
    ramase.sort((a, b) => cost(de, a) - cost(de, b));
    ordine.push(ramase.shift()!);
  }
  for (let imbunatatit = true; imbunatatit; ) {
    imbunatatit = false;
    for (let i = 0; i < ordine.length - 1; i++) {
      for (let j = i + 1; j < ordine.length; j++) {
        const alta = [...ordine.slice(0, i), ...ordine.slice(i, j + 1).reverse(), ...ordine.slice(j + 1)];
        if (total(alta) < total(ordine)) [ordine, imbunatatit] = [alta, true];
      }
    }
  }
  return ordine;
}

export function inMinute(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/** Minute față de miezul nopții din ziua cursei → „HH:MM"; valorile negative sunt din ziua dinainte. */
export function oraDin(min: number): string {
  const m = ((Math.round(min) % 1440) + 1440) % 1440;
  const ora = `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  return min < 0 ? `${ora} (ziua dinainte)` : min >= 1440 ? `${ora} (ziua următoare)` : ora;
}

export interface Orar {
  plecare: number;
  /** Ora la care ajungi la fiecare client, în ordinea opririlor. */
  opriri: { cheie: string; ora: number }[];
  granita: number;
  iesire: number;
  /** Ora sosirii la aeroport, în ora României. */
  aeroport: number;
}

/** Calcul invers, de la ora la care vrei să ieși din țară. Toate orele sunt în minute. */
export function calculeazaOrar(plan: PlanPreluare, iesire: number, minutePreluare: number, minuteGranita: number): Orar {
  const chei = plan.opriri.map((o) => o.cheie);
  const granita = iesire - minuteGranita;
  const opriri: Orar['opriri'] = [];
  let t = granita;
  for (let i = chei.length - 1; i >= 0; i--) {
    t -= durata(plan, chei[i], chei[i + 1] ?? GRANITA) + minutePreluare;
    opriri.unshift({ cheie: chei[i], ora: t });
  }
  const plecare = t - durata(plan, START, chei[0] ?? GRANITA);
  return { plecare, opriri, granita, iesire, aeroport: iesire + durata(plan, GRANITA, AEROPORT) };
}

/** Link Google Maps cu toată ruta de preluare, până la graniță. */
export function linkRuta(start: string, opriri: string[], sfarsit: string): string {
  const q = encodeURIComponent;
  return `https://www.google.com/maps/dir/?api=1&origin=${q(start)}&destination=${q(sfarsit)}&waypoints=${opriri.map((o) => q(interogare(o))).join('%7C')}&travelmode=driving`;
}
