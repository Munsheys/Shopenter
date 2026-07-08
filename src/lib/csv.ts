/**
 * Minimal CSV serialization — no external dependency needed for flat/near-flat
 * merchant data (products, customers, orders). Nested objects/arrays are
 * JSON-stringified into a single cell rather than normalized into extra rows,
 * which keeps one row per record (matches what a merchant expects when
 * opening this in Excel/Sheets).
 */
function escapeCsvField(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = typeof value === 'object' ? JSON.stringify(value) : String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function toCsv(rows: Record<string, any>[]): string {
  if (rows.length === 0) return '';
  const headerSet = new Set<string>();
  for (const row of rows) {
    for (const key of Object.keys(row)) headerSet.add(key);
  }
  const headers = Array.from(headerSet);

  const headerLine = headers.map(escapeCsvField).join(',');
  const dataLines = rows.map(row => headers.map(h => escapeCsvField(row[h])).join(','));
  return [headerLine, ...dataLines].join('\n');
}
