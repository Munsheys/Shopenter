import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { thbToSatang, chargeCustomer } from './omise';

describe('thbToSatang', () => {
  it('converts THB to satang (x100)', () => {
    expect(thbToSatang(299)).toBe(29900);
  });

  it('rounds to avoid floating-point cent artifacts', () => {
    expect(thbToSatang(19.995)).toBe(2000);
  });
});

describe('chargeCustomer', () => {
  const originalEnv = process.env.OMISE_SECRET_KEY;
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env.OMISE_SECRET_KEY = 'skey_test_123';
  });

  afterEach(() => {
    process.env.OMISE_SECRET_KEY = originalEnv;
    global.fetch = originalFetch;
  });

  it('posts amount/currency/customer/description and returns the charge on success', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'chrg_test_1', status: 'successful', amount: 29900, currency: 'thb', customer: 'cust_1' }),
    });
    global.fetch = mockFetch as any;

    const charge = await chargeCustomer('cust_1', 29900, 'Shopenter pro subscription');

    expect(charge.status).toBe('successful');
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe('https://api.omise.com/charges');
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toMatch(/^Basic /);
    expect(String(init.body)).toContain('amount=29900');
    expect(String(init.body)).toContain('customer=cust_1');
  });

  it('throws with the Omise error message on a non-ok response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 402,
      json: async () => ({ message: 'card was declined' }),
    }) as any;

    await expect(chargeCustomer('cust_1', 29900, 'x')).rejects.toThrow('card was declined');
  });
});
