import { describe, expect, it } from 'vitest';
import { citesteCurs, cursPentru, inRon } from './curs';

describe('curs', () => {
  it('leul are cursul 1, restul vin din setări', () => {
    expect(cursPentru('RON', {})).toBe(1);
    expect(cursPentru('EUR', { EUR: 5.5 })).toBe(5.5);
    expect(cursPentru('GBP', { EUR: 5.5 })).toBeUndefined();
    expect(cursPentru('EUR', { EUR: 0 })).toBeUndefined();
  });
  it('conversie în lei', () => {
    expect(inRon(200, 'EUR', { EUR: 5.5 })).toBe(1100);
    expect(inRon(10, 'RON', {})).toBe(10);
    expect(inRon(10, 'HUF', {})).toBeUndefined();
  });
  it('citește cursul cu virgulă sau punct', () => {
    expect(citesteCurs('5,5')).toBe(5.5);
    expect(citesteCurs('0.0135')).toBe(0.0135);
    expect(citesteCurs('')).toBeUndefined();
    expect(citesteCurs('abc')).toBeUndefined();
    expect(citesteCurs('-1')).toBeUndefined();
  });
});
