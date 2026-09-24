import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import { QuoteSubmission } from './QuoteSubmission';
import { QuoteApiError, type Quote, type QuoteLoader } from './quoteApi';

const quote: Quote = { quoteId: 'Q-demo', customerName: 'Asha Kulkarni', product: 'Motor', coverageAmount: 500000, annualPremium: 10000, ratePercent: 2, currency: 'INR' };
async function fillForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Customer name'), 'Asha Kulkarni');
  await user.selectOptions(screen.getByLabelText('Insurance product'), 'Motor');
}

test('invalid input stays on the form without sending a request', async () => {
  const loader = vi.fn<QuoteLoader>();
  const user = userEvent.setup();
  render(<QuoteSubmission loadQuote={loader} />);
  await user.click(screen.getByRole('button', { name: /calculate quote/i }));
  expect(screen.getByRole('alert')).toHaveFocus();
  expect(screen.getByLabelText('Customer name')).toHaveAttribute('aria-invalid', 'true');
  expect(screen.getByText('Choose a product.')).toBeInTheDocument();
  await user.click(screen.getByRole('link', { name: /customer name: enter/i }));
  expect(screen.getByLabelText('Customer name')).toHaveFocus();
  expect(loader).not.toHaveBeenCalled();
});

test('submits numeric coverage, prevents pending duplicates, then shows the server quote', async () => {
  let resolve!: (quote: Quote) => void;
  const loader = vi.fn<QuoteLoader>(() => new Promise(done => { resolve = done; }));
  const user = userEvent.setup();
  render(<QuoteSubmission loadQuote={loader} />);
  await fillForm(user);
  await user.dblClick(screen.getByRole('button', { name: /calculate quote/i }));
  expect(loader).toHaveBeenCalledTimes(1);
  expect(loader).toHaveBeenCalledWith({ customerName: 'Asha Kulkarni', product: 'Motor', coverageAmount: 500000 }, expect.any(AbortSignal));
  expect(screen.getByRole('button', { name: /calculating quote/i })).toBeDisabled();
  await act(async () => { resolve(quote); });
  expect(screen.getByRole('heading', { name: 'Your quote summary' })).toHaveFocus();
  expect(screen.getByText('₹10,000')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Edit submission' }));
  expect(screen.getByLabelText('Customer name')).toHaveValue('Asha Kulkarni');
  expect(screen.getByLabelText('Customer name')).toHaveFocus();
  expect(screen.queryByText('₹10,000')).not.toBeInTheDocument();
});

test('server validation errors preserve inputs and allow retry, then a new submission resets', async () => {
  const loader = vi.fn<QuoteLoader>()
    .mockRejectedValueOnce(new QuoteApiError('Please check the highlighted fields.', { customerName: 'Check this customer name.' }))
    .mockResolvedValueOnce(quote);
  const user = userEvent.setup();
  render(<QuoteSubmission loadQuote={loader} />);
  await fillForm(user);
  await user.click(screen.getByRole('button', { name: /calculate quote/i }));
  expect(await screen.findByRole('alert')).toBeInTheDocument();
  expect(screen.getByText('Check this customer name.')).toBeInTheDocument();
  expect(screen.getByLabelText('Customer name')).toHaveValue('Asha Kulkarni');
  await user.click(screen.getByRole('button', { name: /calculate quote/i }));
  await user.click(await screen.findByRole('button', { name: 'New submission' }));
  expect(screen.getByLabelText('Customer name')).toHaveValue('');
  expect(screen.getByLabelText('Customer name')).toHaveFocus();
  expect(screen.getByLabelText('Insurance product')).toHaveValue('');
});

test('network failure is recoverable and unmount cancels an in-flight request', async () => {
  const loader = vi.fn<QuoteLoader>().mockRejectedValueOnce(new TypeError('Failed to fetch'))
    .mockImplementationOnce(() => new Promise(() => {}));
  const user = userEvent.setup();
  const { unmount } = render(<QuoteSubmission loadQuote={loader} />);
  await fillForm(user);
  await user.click(screen.getByRole('button', { name: /calculate quote/i }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Check your connection');
  await user.click(screen.getByRole('button', { name: /calculate quote/i }));
  const signal = loader.mock.calls[1][1];
  unmount();
  expect(signal.aborted).toBe(true);
});
