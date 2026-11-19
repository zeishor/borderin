import { describe, expect, it } from 'vitest';
import { citesteBackup } from './backup';

const ok = (date: unknown) => JSON.stringify({ format: 'borderin-backup', versiune: 1, exportat: '', date });

describe('citesteBackup', () => {
  it('acceptă un backup valid', () => {
    expect(citesteBackup(ok({ curse: [{ id: 'a' }], masini: [] })).date.curse).toHaveLength(1);
  });
  it('respinge JSON stricat', () => {
    expect(() => citesteBackup('{')).toThrow('JSON');
  });
  it('respinge alt fișier', () => {
    expect(() => citesteBackup('{"a":1}')).toThrow('backup Borderin');
  });
  it('respinge înregistrări fără id', () => {
    expect(() => citesteBackup(ok({ curse: [{ nume: 'x' }] }))).toThrow('curse');
  });
});
