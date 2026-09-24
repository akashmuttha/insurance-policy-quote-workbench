export type Product = 'Health' | 'Motor' | 'Home';
export type Submission = { customerName: string; product: Product; coverageAmount: number };
export type Quote = Submission & {
  quoteId: string;
  annualPremium: number;
  ratePercent: number;
  currency: 'INR';
};
export type FieldErrors = Partial<Record<keyof Submission, string>>;
export type QuoteLoader = (submission: Submission, signal: AbortSignal) => Promise<Quote>;

export function isProduct(value: unknown): value is Product {
  return value === 'Health' || value === 'Motor' || value === 'Home';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isQuote(value: unknown): value is Quote {
  return isRecord(value) && typeof value.quoteId === 'string' && value.quoteId.length > 0 &&
    typeof value.customerName === 'string' && isProduct(value.product) &&
    typeof value.coverageAmount === 'number' && Number.isFinite(value.coverageAmount) && value.coverageAmount > 0 &&
    typeof value.annualPremium === 'number' && Number.isFinite(value.annualPremium) && value.annualPremium >= 0 &&
    typeof value.ratePercent === 'number' && Number.isFinite(value.ratePercent) && value.ratePercent > 0 &&
    value.currency === 'INR';
}

export class QuoteApiError extends Error {
  constructor(message: string, public fieldErrors: FieldErrors = {}) { super(message); }
}

export const requestQuote: QuoteLoader = async (submission, signal) => {
  const response = await fetch('/api/quotes', {
    method: 'POST', signal,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(submission),
  });
  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);
    const fieldErrors: FieldErrors = {};
    if (isRecord(body) && isRecord(body.fieldErrors)) {
      for (const field of ['customerName', 'product', 'coverageAmount'] as const) {
        if (typeof body.fieldErrors[field] === 'string') fieldErrors[field] = body.fieldErrors[field];
      }
    }
    throw new QuoteApiError(response.status === 422 ? 'Please check the highlighted fields.' :
      `Could not calculate your quote (${response.status}). Please try again.`, fieldErrors);
  }
  const value: unknown = await response.json();
  if (!isQuote(value)) throw new Error('Unexpected quote response. Please try again.');
  return value;
};
