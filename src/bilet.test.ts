import { describe, expect, it } from 'vitest';
import { parseBilet } from './bilet';

// Texte inventate, în stilul unui bilet de parcare citit de OCR.
describe('parseBilet', () => {
  it('forint, două momente și număr de bilet', () => {
    const r = parseBilet(`PARKING TICKET
Ticket no: 123456789012
Entry: 2026.11.16 10:45
Exit: 2026.11.16 11:32
Total to pay: 4 200 HUF`);
    expect(r).toEqual({ suma: 4200, moneda: 'HUF', intrare: '2026-11-16T10:45', iesire: '2026-11-16T11:32', numar: '123456789012' });
  });

  it('euro, dată zi.lună.an și suma cu zecimale', () => {
    const r = parseBilet('Amount paid EUR 12,50\n16.11.2026 16:05\n16.11.2026 17:10');
    expect(r).toMatchObject({ suma: 12.5, moneda: 'EUR', intrare: '2026-11-16T16:05', iesire: '2026-11-16T17:10' });
  });

  it('preferă suma de pe rândul cu „total" în fața celei mai mari', () => {
    const r = parseBilet('Deposit 9000 Ft\nTotal: 2 400 Ft');
    expect(r).toMatchObject({ suma: 2400, moneda: 'HUF' });
  });

  it('separator de mii cu punct și un singur moment', () => {
    const r = parseBilet('Fizetendő: 3.600 Ft\n2026-11-16 10:45');
    expect(r).toMatchObject({ suma: 3600, intrare: '2026-11-16T10:45' });
    expect(r.iesire).toBeUndefined();
  });

  it('text fără nimic util nu inventează câmpuri', () => {
    expect(parseBilet('blur blur')).toEqual({});
  });
});
