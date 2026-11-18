import { describe, expect, it } from 'vitest';
import { linkZbor } from './zbor';

describe('linkZbor', () => {
  it('scoate spațiile din cod', () => {
    expect(linkZbor('W6 2289', 'flightradar24')).toBe('https://www.flightradar24.com/data/flights/w62289');
    expect(linkZbor('W6 2289', 'flightaware')).toBe('https://www.flightaware.com/live/flight/W62289');
    expect(linkZbor('fr 5249', 'google')).toContain('FR5249%20flight%20status');
  });
  it('fără cod nu dă link', () => {
    expect(linkZbor('  ', 'google')).toBeUndefined();
  });
});
