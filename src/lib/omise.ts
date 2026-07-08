/**
 * Thin wrapper around the Omise REST API for merchant subscription billing
 * (Merchant -> Shopenter). Plain fetch with HTTP basic auth using the secret
 * key — no card data ever touches our server; card tokens come from
 * Omise.js running client-side with the publishable key.
 *
 * Omise doesn't sign webhook payloads with a shared secret the way Stripe
 * does, so `getChargeById` is used to re-fetch the charge server-side by ID
 * before trusting a webhook body, rather than trusting the payload directly.
 *
 * Verify field/endpoint names against https://www.omise.co/api-guide before
 * going live — this was written against the publicly documented v2 API but
 * not tested against a live Omise account.
 */

const OMISE_API_BASE = 'https://api.omise.com';

function authHeader(): string {
  const secretKey = process.env.OMISE_SECRET_KEY;
  if (!secretKey) throw new Error('OMISE_SECRET_KEY is not set');
  return 'Basic ' + Buffer.from(`${secretKey}:`).toString('base64');
}

async function omiseFetch(path: string, init: RequestInit = {}) {
  const res = await fetch(`${OMISE_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: authHeader(),
      'Content-Type': 'application/x-www-form-urlencoded',
      ...(init.headers || {}),
    },
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(`Omise API error (${res.status}): ${body?.message || 'unknown error'}`);
  }
  return body;
}

export interface OmiseCustomer {
  id: string;
  default_card: string | null;
  cards?: { data: Array<{ id: string; brand: string; last_digits: string }> };
}

/** Creates an Omise customer and attaches the tokenized card in one call. */
export async function createCustomerWithCard(email: string, cardToken: string): Promise<OmiseCustomer> {
  return omiseFetch('/customers', {
    method: 'POST',
    body: new URLSearchParams({ email, card: cardToken }),
  });
}

/** Attaches a new card token to an existing customer, replacing the default card. */
export async function updateCustomerCard(customerId: string, cardToken: string): Promise<OmiseCustomer> {
  return omiseFetch(`/customers/${customerId}`, {
    method: 'PATCH',
    body: new URLSearchParams({ card: cardToken }),
  });
}

export interface OmiseCharge {
  id: string;
  status: 'successful' | 'failed' | 'pending' | 'expired';
  amount: number;
  currency: string;
  customer: string;
  failure_message?: string | null;
}

/** Charges a customer's default card. Amount is in satang (THB minor unit, x100). */
export async function chargeCustomer(customerId: string, amountSatang: number, description: string): Promise<OmiseCharge> {
  return omiseFetch('/charges', {
    method: 'POST',
    body: new URLSearchParams({
      amount: String(amountSatang),
      currency: 'thb',
      customer: customerId,
      description,
    }),
  });
}

/** Re-fetches a charge by ID directly from Omise — use this instead of trusting a webhook body verbatim. */
export async function getChargeById(chargeId: string): Promise<OmiseCharge> {
  return omiseFetch(`/charges/${chargeId}`);
}

export function thbToSatang(thb: number): number {
  return Math.round(thb * 100);
}
