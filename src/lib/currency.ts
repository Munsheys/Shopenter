const SYMBOLS: Record<string, string> = {
  THB: '฿', KRW: '₩', JPY: '¥', USD: '$', EUR: '€', GBP: '£',
  CNY: '¥', HKD: 'HK$', SGD: 'S$', TWD: 'NT$', MYR: 'RM', IDR: 'Rp',
  PHP: '₱', VND: '₫', INR: '₹', AUD: 'A$', CAD: 'C$',
};

export function currencySymbol(code?: string | null): string {
  if (!code) return '฿';
  return SYMBOLS[code.toUpperCase()] ?? code;
}

export function fmtCurrency(amount: number, code?: string | null): string {
  return `${currencySymbol(code)}${amount.toLocaleString()}`;
}
