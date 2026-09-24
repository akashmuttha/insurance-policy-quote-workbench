import { randomUUID } from 'node:crypto';

// Fictional annual rates, in basis points. 100 basis points = 1 percent.
const rates = { Health: 300, Motor: 200, Home: 100 };
const coverageOptions = [100000, 500000, 1000000];

export function validateSubmission(value) {
  const input = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const errors = {};
  if (typeof input.customerName !== 'string' || input.customerName.trim().length < 2 || input.customerName.trim().length > 80) {
    errors.customerName = 'Enter a customer name between 2 and 80 characters.';
  }
  if (typeof input.product !== 'string' || !Object.hasOwn(rates, input.product)) {
    errors.product = 'Choose a product.';
  }
  if (!coverageOptions.includes(input.coverageAmount)) {
    errors.coverageAmount = 'Choose one of the available coverage amounts.';
  }
  return errors;
}

export function calculatePremium(coverageAmount, rateBasisPoints) {
  return Math.round(coverageAmount * rateBasisPoints / 10000);
}

export function createQuote(input) {
  const rate = rates[input.product];
  // Construct the response explicitly: a client-supplied premium is never used.
  return {
    quoteId: `Q-${randomUUID()}`,
    customerName: input.customerName.trim(),
    product: input.product,
    coverageAmount: input.coverageAmount,
    annualPremium: calculatePremium(input.coverageAmount, rate),
    ratePercent: rate / 100,
    currency: 'INR',
  };
}
