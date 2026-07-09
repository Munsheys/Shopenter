import { describe, it, expect } from 'vitest';
import { toCsv } from './csv';

describe('toCsv', () => {
  it('returns an empty string for no rows', () => {
    expect(toCsv([])).toBe('');
  });

  it('builds a header from the union of all row keys', () => {
    const csv = toCsv([{ a: 1 }, { b: 2 }]);
    const [header] = csv.split('\n');
    expect(header.split(',').sort()).toEqual(['a', 'b']);
  });

  it('quotes and escapes fields containing commas, quotes, or newlines', () => {
    const csv = toCsv([{ name: 'Widget, "Deluxe"\nEdition' }]);
    const headerEnd = csv.indexOf('\n');
    const row = csv.slice(headerEnd + 1);
    expect(row).toBe('"Widget, ""Deluxe""\nEdition"');
  });

  it('leaves plain fields unquoted', () => {
    const csv = toCsv([{ name: 'Widget' }]);
    const [, row] = csv.split('\n');
    expect(row).toBe('Widget');
  });

  it('renders null/undefined as an empty cell', () => {
    const csv = toCsv([{ a: null, b: undefined }]);
    const [, row] = csv.split('\n');
    expect(row).toBe(',');
  });

  it('JSON-stringifies nested objects into a single cell', () => {
    const csv = toCsv([{ meta: { foo: 'bar' } }]);
    const [, row] = csv.split('\n');
    expect(row).toBe('"{""foo"":""bar""}"');
  });
});
