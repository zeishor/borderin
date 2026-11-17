import type { Rezervare } from './types';

export type Extras = Pick<Rezervare, 'nume' | 'observatii' | 'textOriginal'>;

const PREFIX_WHATSAPP = /^\[\d{1,2}:\d{2},\s*\d{1,2}\/\d{1,2}\/\d{4}\]\s*\+?[\d\s]+:\s*/;

/**
 * Provizoriu: câte o rezervare pe fiecare rând, fără extragere de câmpuri.
 * Tot textul ajunge în observații, iar utilizatorul completează manual.
 * Parserul real (reguli pe conținutul celulelor) înlocuiește această funcție.
 */
export function parseMesaje(text: string): Extras[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.replace(PREFIX_WHATSAPP, '').trim())
    .filter((l) => l.length > 0)
    .map((linie) => ({
      nume: '(de completat)',
      observatii: linie.split('\t').filter((c) => c.trim()).join(' | '),
      textOriginal: linie,
    }));
}
