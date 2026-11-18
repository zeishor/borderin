import { describe, expect, it } from 'vitest';
import { parseMesaje, parseRuta, parseZbor } from './parser';

// Date inventate; doar structura imită mesajele reale.
const t = (...c: string[]) => c.join('\t');
const AZI = '2026-11-17';

describe('rezervări de aeroport', () => {
  it('retur cu oraș de zbor, adresă și două monede', () => {
    const r = parseMesaje(
      t('Ion', 'Testescu', '+39 340 000 0001', '2026-11-16', 'Budapesta-Timisoara', '', '', '', '10:30 Cagliari', 'Str Exemplu 9', '40 euro / 220 lei'),
      AZI,
    ).rezervari[0];
    expect(r.nume).toBe('Ion Testescu');
    expect(r.telefoane).toEqual([{ numar: '+39 340 000 0001', eticheta: undefined }]);
    expect(r.data).toBe('2026-11-16');
    expect(r.directie).toBe('retur');
    expect(r.destinatie).toBe('Budapesta');
    expect(r.ora).toBe('10:30');
    expect(r.zbor).toBeUndefined();
    expect(r.orasZbor).toBe('Cagliari');
    expect(r.lasare).toBe('Str Exemplu 9');
    expect(r.plata).toMatchObject({ stare: 'de_incasat', suma: 40, moneda: 'EUR' });
    expect(r.plata.notaPret).toBe('40 euro / 220 lei');
  });

  it('dus cu ora de preluare și „Achitat"', () => {
    const r = parseMesaje(
      t('Max', 'Probe', '004900000000001', '2026-11-14', 'Timisoara-Budapesta', 'Timisoara', '', '12:00 , preluare', 'Aeroport Budapesta', 'Achitat'),
      AZI,
    ).rezervari[0];
    expect(r.directie).toBe('dus');
    expect(r.destinatie).toBe('Budapesta');
    expect(r.preluare).toBe('Timisoara');
    expect(r.ora).toBe('12:00');
    expect(r.zbor).toBeUndefined();
    expect(r.lasare).toBe('Aeroport Budapesta');
    expect(r.plata.stare).toBe('achitat');
    expect(r.observatii).toContain('preluare');
  });

  it('ora cu punct și virgulă, nume cu majuscule, liniuță în loc de nume', () => {
    const r = parseMesaje(t('NICOLAS', 'ROSSI', '0700 000 002', '2026-11-15', 'Arad-Timisoara', 'AEROPORT ARAD', '', '12;55 LONDRA', '', '15 EURO'), AZI).rezervari[0];
    expect(r.nume).toBe('Nicolas Rossi');
    expect(r.ora).toBe('12:55');
    expect(r.zbor).toBeUndefined();
    expect(r.orasZbor).toBe('LONDRA');
    expect(r.preluare).toBe('AEROPORT ARAD');

    const s = parseMesaje(t('CRISTIAN', '-', '0700000003', '2026-11-14', 'Timisoara-Budapesta', 'GIROC-STR.DUNAREA 5', '', '17;40', '', '40 EURO/220 LEI'), AZI).rezervari[0];
    expect(s.nume).toBe('Cristian');
    expect(s.preluare).toBe('GIROC-STR.DUNAREA 5');
    expect(s.directie).toBe('dus');
    expect(s.ora).toBe('17:40');
  });

  it('Budapesta–Arad: preluat la Budapesta, lăsat la Arad', () => {
    const r = parseMesaje(t('Jay', 'Mason', '+1816 000 0004', '2026-11-16', 'Budapesta-Arad', '', '', '', '11:00 LH 1334', '', 'Achitat'), AZI).rezervari[0];
    expect(r.directie).toBe('retur');
    expect(r.destinatie).toBe('Budapesta');
    expect(r.lasare).toBe('Arad');
    expect(r.zbor).toBe('LH 1334');
  });
});

describe('plată', () => {
  const plata = (p: string) =>
    parseMesaje(t('A', 'B', '0700000005', '2026-11-14', 'Timisoara-Budapesta', '10:00', p), AZI).rezervari[0].plata;

  it('preț cu OP înseamnă achitat', () => {
    expect(plata('40 EURO/220 LEI , achita cu OP')).toMatchObject({ stare: 'achitat', metoda: 'OP', suma: 40 });
  });
  it('achită X euro = de încasat', () => {
    expect(plata('achita 40 euro')).toMatchObject({ stare: 'de_incasat', suma: 40, moneda: 'EUR' });
  });
  it('lei cash la șofer', () => {
    expect(plata('1000 lei , cash la sofer')).toMatchObject({ stare: 'de_incasat', suma: 1000, moneda: 'RON', metoda: 'cash' });
  });
  it('„40 DE EURO" și plată în bancă', () => {
    expect(plata('15 EURO/40 DE EURO')).toMatchObject({ suma: 15, moneda: 'EUR' });
    expect(plata('Achitat in banca')).toMatchObject({ stare: 'achitat', metoda: 'bancă' });
  });
  it('factură', () => {
    expect(plata('Achitat , fact. 123 din 13.11.2026 pe Firma SRL')).toMatchObject({ stare: 'achitat', metoda: 'factură' });
  });
});

describe('grup, mai multe telefoane, observații', () => {
  it('mai multe telefoane cu etichetă', () => {
    const r = parseMesaje(t('Jay', 'Mason', '+1816 000 0006 ; +1818 000 0007 ; 0770 000 008 MARCEL PT URGENTE', '2026-11-14', 'Budapesta-Arad', 'Aeroport Budapesta', ' 2 Pax: JAY MASON si ANA LOPEZ', '16:25 , LH 1678 (MUC)', '', 'Achitat'), AZI).rezervari[0];
    expect(r.telefoane.map((x) => x.numar)).toEqual(['+1816 000 0006', '+1818 000 0007', '0770 000 008']);
    expect(r.telefoane[2].eticheta).toBe('MARCEL PT URGENTE');
    expect(r.pasageri).toBe(2);
    expect(r.zbor).toBe('LH 1678');
    expect(r.orasZbor).toBe('MUC');
    expect(r.observatii).toContain('ANA LOPEZ');
  });

  it('pasageri cu telefoane în observații și etichetă PRIVAT', () => {
    const r = parseMesaje(
      t('Maria Test - PRIVAT', 'Prob', '0700000009', '2026-11-16', 'Timisoara-Budapesta', 'Sacalaz si Timisoara', '3 Pax - au bagaje de cala: Maria Prob, Str. A 5; si Ana Z, 0762 000 010, Str. B', '11:00 , W6 2289 , STR', 'Aeroport Budapesta', 'Achita cu OP'),
      AZI,
    ).rezervari[0];
    expect(r.nume).toBe('Maria Test Prob');
    expect(r.eticheta).toBe('PRIVAT');
    expect(r.pasageri).toBe(3);
    expect(r.preluare).toBe('Sacalaz, Str. A 5 (Maria Prob) + Timisoara, Str. B (Ana Z)');
    expect(r.telefoane.map((x) => x.numar)).toContain('0762 000 010');
    expect(r.zbor).toBe('W6 2289');
    expect(r.orasZbor).toBe('STR');
  });

  it('rând „altele": grup, telefon - nume, destinație, firmă', () => {
    const r = parseMesaje(
      t('Grup aprox 15 Pax', '', '0700000011 - Ana Exemplu', '2026-11-17', 'altele', 'Timisoara , Str. Test 1 Firma', 'aprox. 15 pax - Tur ora 16:00 : Str. Test 1 - Loc Departe , Retur ora 20:00 : Loc Departe - Str. Test 1', '16:00 , preluare', 'Loc Departe , crama', '1000 lei , cash la sofer', '', 'Firma'),
      AZI,
    );
    const x = r.rezervari[0];
    expect(x.nume).toBe('Ana Exemplu');
    expect(x.telefoane).toEqual([{ numar: '0700000011', eticheta: undefined }]);
    expect(x.pasageri).toBe(15);
    expect(x.preluare).toBe('Timisoara , Str. Test 1 Firma');
    expect(x.lasare).toBe('Loc Departe , crama');
    expect(x.eticheta).toBe('Firma');
    expect(x.plata).toMatchObject({ suma: 1000, moneda: 'RON', metoda: 'cash' });
    expect(r.destinatie).toBe('Loc Departe');
  });
});

describe('mesaje WhatsApp și alte feluri de text', () => {
  const prefix = (ora: string, data: string) => `[${ora}, ${data}] +40 700 000 000: `;

  it('scoate prefixul și desparte mesajele', () => {
    const text = [
      prefix('15:59', '11/13/2026') + t('Ion', 'Unu', '0700000012', '2026-11-14', 'Timisoara-Budapesta', 'Timisoara', '', '12:00 , preluare', 'Aeroport Budapesta', 'Achitat'),
      prefix('15:59', '11/13/2026') + '+49 000 000 0012',
      prefix('16:01', '11/13/2026') + t('Ana', 'Doi', '0700000013', '2026-11-14', 'Timisoara-Budapesta', 'Timisoara', '', '17:05 , FR4134 - (BRI)', 'Aeroport Budapesta', '40 euro / 220 lei , plata la sofer'),
    ].join('\n');
    const r = parseMesaje(text, AZI);
    expect(r.rezervari).toHaveLength(2);
    expect(r.rezervari[0].nume).toBe('Ion Unu');
    expect(r.rezervari[1].zbor).toBe('FR4134');
    expect(r.rezervari[1].orasZbor).toBe('BRI');
    expect(r.rezervari[1].plata.metoda).toBe('cash');
  });

  it('telefon singur se adaugă la rezervarea de dinainte, o singură dată', () => {
    const r = parseMesaje(
      [t('Max', 'Probe', '004900000000001', '2026-11-14', 'Timisoara-Budapesta', '10:00', 'Achitat'), '+4900000000001', '+49 111 222 3333'].join('\n'),
      AZI,
    );
    expect(r.rezervari[0].telefoane.map((x) => x.numar)).toEqual(['004900000000001', '+49 111 222 3333']);
    expect(r.note).toEqual([]);
  });

  it('mesaj de plecare cu „mâine" față de ziua trimiterii', () => {
    const r = parseMesaje(prefix('18:00', '11/13/2026') + 'Pleci mâine la 12 din Timișoara cu retur de 16:40', AZI);
    expect(r.plecare).toBe('12:00');
    expect(r.retur).toBe('16:40');
    expect(r.data).toBe('2026-11-14');
    expect(r.rezervari).toHaveLength(0);
  });

  it('fără prefix, „mâine" se calculează de azi', () => {
    expect(parseMesaje('Pleci mâine la 12:30', AZI)).toMatchObject({ plecare: '12:30', data: '2026-11-18' });
  });

  it('instrucțiunile rămân note, nu devin rezervări', () => {
    const r = parseMesaje('Aduci și pe fata asta împreună cu cei doi pax cu aterizare de 16:40', AZI);
    expect(r.rezervari).toHaveLength(0);
    expect(r.note).toHaveLength(1);
  });

  it('rând fără coloane, dar cu telefon', () => {
    const r = parseMesaje('Ion Liber 0700 000 014 mâine 10:30 aeroport', AZI).rezervari[0];
    expect(r.nume).toBe('Ion Liber');
    expect(r.telefoane[0].numar).toBe('0700 000 014');
    expect(r.ora).toBe('10:30');
  });

  it('data din ziua curentă și destinația se iau de la rezervări', () => {
    const r = parseMesaje(t('A', 'B', '0700000015', '2026-11-20', 'Timisoara-Arad', '10:00', '15 EURO'), AZI);
    expect(r.data).toBe('2026-11-20');
    expect(r.destinatie).toBe('Arad');
  });
});

describe('ruta (oraș preluare - oraș destinație)', () => {
  it('variante de scriere', () => {
    expect(parseRuta('Timisoara-Budapesta')).toEqual({ directie: 'dus', destinatie: 'Budapesta' });
    expect(parseRuta('Timișoara – Aeroport Budapesta')).toEqual({ directie: 'dus', destinatie: 'Budapesta' });
    expect(parseRuta('Budapesta Aeroport - Timisoara')).toEqual({ directie: 'retur', destinatie: 'Budapesta' });
    expect(parseRuta('TIMISOARA -> BUDAPESTA')).toEqual({ directie: 'dus', destinatie: 'BUDAPESTA' });
    expect(parseRuta('Budapesta — Timișoara')).toEqual({ directie: 'retur', destinatie: 'Budapesta' });
    expect(parseRuta('Budapesta-Arad')).toEqual({ directie: 'retur', destinatie: 'Budapesta', lasare: 'Arad' });
  });

  it('nu confundă adrese sau nume cu o rută', () => {
    expect(parseRuta('GIROC-STR.DUNAREA 5')).toBeUndefined();
    expect(parseRuta('Maria-Ioana')).toBeUndefined();
    expect(parseRuta('Giroc - Strada Exemplu')).toBeUndefined();
  });

  it('ruta se găsește și înainte de telefon sau pe alt loc în rând', () => {
    const r = parseMesaje(t('Timisoara - Aeroport Budapesta', 'Ion', 'Probe', '0700 000 020', '2026-11-14', '12:00', '40 euro'), AZI).rezervari[0];
    expect(r.directie).toBe('dus');
    expect(r.destinatie).toBe('Budapesta');
    expect(r.nume).toBe('Ion Probe');
  });
});

describe('mesaj pe mai multe rânduri, fără prefix WhatsApp', () => {
  const mesaj = ['retur maine \t16-11-26\t', '10:30 FR0000 ', 'ION EXEMPLU\t+39 340 000 0099\t', 'Budapesta – Timisoara', 'achita 40 euro'].join('\n');

  it('rândurile fragment formează o singură rezervare', () => {
    const r = parseMesaje(mesaj, AZI);
    expect(r.rezervari).toHaveLength(1);
    expect(r.note).toEqual([]);
    const x = r.rezervari[0];
    expect(x.nume).toBe('Ion Exemplu');
    expect(x.telefoane[0].numar).toBe('+39 340 000 0099');
    expect(x.data).toBe('2026-11-16');
    expect(x.ora).toBe('10:30');
    expect(x.zbor).toBe('FR0000');
    expect(x.directie).toBe('retur');
    expect(x.destinatie).toBe('Budapesta');
    expect(x.plata).toMatchObject({ stare: 'de_incasat', suma: 40, moneda: 'EUR' });
  });

  it('un rând gol desparte două mesaje fragmentate', () => {
    const r = parseMesaje(mesaj + '\n\n' + mesaj.replace('ION EXEMPLU', 'ANA PROBA').replace('0099', '0098'), AZI);
    expect(r.rezervari.map((x) => x.nume)).toEqual(['Ion Exemplu', 'Ana Proba']);
  });

  it('un rând complet după fragmente nu se lipește de ele', () => {
    const complet = t('Max', 'Probe', '0700000030', '2026-11-14', 'Timisoara-Budapesta', '', '', '10:00', '', '40 euro');
    const r = parseMesaje(mesaj + '\n' + complet, AZI);
    expect(r.rezervari.map((x) => x.nume)).toEqual(['Ion Exemplu', 'Max Probe']);
  });

  it('„retur maine" fără dată explicită folosește ziua de azi + 1', () => {
    const r = parseMesaje(['retur maine\t-', 'ION EXEMPLU\t+39 340 000 0099\t', 'Budapesta – Timisoara'].join('\n'), AZI);
    expect(r.rezervari[0].data).toBe('2026-11-18');
    expect(r.rezervari[0].directie).toBe('retur');
  });
});

describe('formate de prefix WhatsApp', () => {
  const rand = t('Ion', 'Prefix', '0700000040', '2026-11-16', 'Budapesta-Timisoara', '', '', '10:30 Cagliari', 'Str X 1', '40 euro');

  it.each([
    ['[15/11, 12:01] +40 700 000 000: ', 'telefon, zi/lună fără an'],
    ['[12:01, 11/15/2026] +40 700 000 000: ', 'Desktop, lună/zi/an'],
    ['[15.11.2026, 12:01:33] Dispecer: ', 'iOS'],
    ['15/11/2026, 12:01 - Dispecer: ', 'export Android'],
  ])('%s (%s)', (prefix) => {
    const r = parseMesaje(prefix + rand, AZI);
    expect(r.rezervari).toHaveLength(1);
    expect(r.rezervari[0].nume).toBe('Ion Prefix');
    expect(r.rezervari[0].ora).toBe('10:30');
  });

  it('„mâine" se calculează din data prefixului de telefon', () => {
    const r = parseMesaje('[15/11, 18:00] +40 700 000 000: Pleci mâine la 12 din Timișoara cu retur de 16:40', AZI);
    expect(r).toMatchObject({ plecare: '12:00', retur: '16:40', data: '2026-11-16' });
  });

  it('„retur maine" pe mai multe rânduri cu prefix de telefon', () => {
    const text = ['[15/11, 12:23] +40 700 000 000: retur maine \t16-11-26\t', '10:30 FR0000 ', 'ION EXEMPLU\t+39 340 000 0099\t', 'Budapesta – Timisoara', 'achita 40 euro'].join('\n');
    const r = parseMesaje(text, AZI);
    expect(r.rezervari).toHaveLength(1);
    expect(r.rezervari[0]).toMatchObject({ nume: 'Ion Exemplu', directie: 'retur', data: '2026-11-16', ora: '10:30' });
  });
});

describe('adrese implicite când mesajul nu le scrie', () => {
  const rand = (ruta: string) => parseMesaje(t('Ion', 'Prob', '0700000050', '2026-11-16', ruta, '', '', '10:30 Zbor', '', '40 euro'), AZI).rezervari[0];

  it('retur: de la aeroport spre Timișoara', () => {
    expect(rand('Budapesta-Timisoara')).toMatchObject({ preluare: 'Aeroport Budapesta', lasare: 'Timisoara' });
  });
  it('dus: din Timișoara spre aeroport', () => {
    expect(rand('Timisoara-Budapesta')).toMatchObject({ preluare: 'Timisoara', lasare: 'Aeroport Budapesta' });
  });
  it('Budapesta–Arad: de la aeroportul Budapesta la Arad', () => {
    expect(rand('Budapesta-Arad')).toMatchObject({ preluare: 'Aeroport Budapesta', lasare: 'Arad' });
  });
  it('adresa scrisă are prioritate', () => {
    const r = parseMesaje(t('Ion', 'Prob', '0700000051', '2026-11-16', 'Budapesta-Timisoara', '', '', '10:30 Zbor', 'Str Reala 3', '40 euro'), AZI).rezervari[0];
    expect(r).toMatchObject({ preluare: 'Aeroport Budapesta', lasare: 'Str Reala 3' });
  });
  it('fără rută nu se inventează nimic', () => {
    const r = parseMesaje('Ion Liber 0700 000 052 mâine 10:30', AZI).rezervari[0];
    expect(r.preluare).toBeUndefined();
    expect(r.lasare).toBeUndefined();
  });
});

describe('adrese din celula de pasageri', () => {
  it('mai multe opriri cu localități și nume', () => {
    const r = parseMesaje(
      t('Maria Test - PRIVAT', 'Prob', '0700000060', '2026-11-16', 'Timisoara-Budapesta', 'Sacalaz si Timisoara', '3 Pax - au bagaje de cala- : Prob Maria si Oana Zeta , Sacalaz , Str. Castanelor nr 5 ; si Ion Alfa , 0762 000 061 , Str. Florilor , Bl. 14', '11:00 , W6 2289 , STR', 'Aeroport Budapesta', 'Achita cu OP'),
      AZI,
    ).rezervari[0];
    expect(r.preluare).toBe('Sacalaz, Str. Castanelor nr 5 (Prob Maria si Oana Zeta) + Timisoara, Str. Florilor, Bl. 14 (Ion Alfa)');
    expect(r.lasare).toBe('Aeroport Budapesta');
    expect(r.telefoane.map((x) => x.numar)).toContain('0762 000 061');
  });

  it('fără străzi în celulă, preluarea rămâne cea din mesaj', () => {
    const r = parseMesaje(
      t('Radu', 'Prob', '0700000062', '2026-11-14', 'Budapesta-Timisoara', 'Aeroport Budapesta', '2 Pax : Radu Prob: tel. 0737 000 063 si Rares Zeta: tel. 0725 000 064 - cate 1 bagaj de cala', '16:40 , FR4133 , BRISTOL', 'Timisoara, str. Test, nr.16, sc.A', 'Achita cu OP'),
      AZI,
    ).rezervari[0];
    expect(r.preluare).toBe('Aeroport Budapesta');
    expect(r.lasare).toBe('Timisoara, str. Test, nr.16, sc.A');
  });
});

describe('destinație scrisă greșit în mesaj', () => {
  it('dus Timișoara–Arad cu „Timisoara" în coloana de destinație', () => {
    const r = parseMesaje(t('Ana', 'Prob', '0700000070', '2026-11-15', 'Timisoara-Arad', 'Strada Test 13, Bloc V7', '', '13:50 Wizz Roma', 'Timisoara', 'Achitat in banca'), AZI).rezervari[0];
    expect(r).toMatchObject({ preluare: 'Strada Test 13, Bloc V7', lasare: 'Aeroport Arad', directie: 'dus' });
  });
});

describe('codul zborului', () => {
  it('cod și oraș din celula de oră', () => {
    expect(parseZbor('FR5249')).toEqual({ zbor: 'FR5249', orasZbor: undefined });
    expect(parseZbor('LH 1334')).toEqual({ zbor: 'LH 1334', orasZbor: undefined });
    expect(parseZbor('W6 2289, STR')).toEqual({ zbor: 'W6 2289', orasZbor: 'STR' });
    expect(parseZbor('FR4133 , BRISTOL')).toEqual({ zbor: 'FR4133', orasZbor: 'BRISTOL' });
    expect(parseZbor('fr 5249 (bri)')).toEqual({ zbor: 'FR 5249', orasZbor: 'bri' });
    expect(parseZbor('Wizz Roma')).toEqual({ orasZbor: 'Wizz Roma' });
    expect(parseZbor('LONDRA')).toEqual({ orasZbor: 'LONDRA' });
  });

  it('cod de zbor scris în altă parte a mesajului', () => {
    const r = parseMesaje(t('Ion', 'Prob', '0700000080', '2026-11-16', 'Budapesta-Timisoara', '', 'Zbor Wizz W6 2289 aterizeaza intarziat', '10:30', '', '40 euro'), AZI).rezervari[0];
    expect(r.zbor).toBe('W6 2289');
  });

  it('cod de zbor fără etichetă, în observații', () => {
    const r = parseMesaje(t('Ion', 'Prob', '0700000081', '2026-11-16', 'Budapesta-Timisoara', '', '2 pax - vin cu FR5249', '10:30', '', '40 euro'), AZI).rezervari[0];
    expect(r.zbor).toBe('FR5249');
  });

  it('nu confundă blocul, strada sau numărul de pasageri cu un zbor', () => {
    const r = parseMesaje(t('Ana', 'Prob', '0700000082', '2026-11-16', 'Timisoara-Budapesta', 'Str. Florilor nr 5, BL 14, SC 123', '3 pax', '11:00', 'Aeroport Budapesta', 'Achitat'), AZI).rezervari[0];
    expect(r.zbor).toBeUndefined();
  });
});
