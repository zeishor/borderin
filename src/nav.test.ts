import { describe, expect, it } from 'vitest';
import { linkNavigatie, locuri } from './nav';

describe('nav', () => {
  it('desparte opririle și scoate numele', () => {
    expect(locuri('Str. A 5, Arad (Ion) + Str. B 2, Lugoj (Ana)')).toEqual(['Str. A 5, Arad', 'Str. B 2, Lugoj']);
    expect(locuri(undefined)).toEqual([]);
  });
  it('link Google și Waze', () => {
    expect(linkNavigatie('Str. A 5, Arad', 'google')).toBe(
      'https://www.google.com/maps/dir/?api=1&destination=Str.%20A%205%2C%20Arad',
    );
    expect(linkNavigatie('Str. A 5', 'waze')).toBe('https://waze.com/ul?q=Str.%20A%205&navigate=yes');
  });
  it('aeroportul devine „<oraș> Airport”', () => {
    expect(linkNavigatie('Aeroport Budapesta', 'waze')).toContain('q=Budapesta%20Airport');
  });
});
