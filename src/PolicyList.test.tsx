import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import { PolicyList, type Policy, type PolicyLoader } from './PolicyList';

const sample: Policy[] = [
  { id: 'POL-101', customerName: 'Amit Sharma', premium: 12500, status: 'Active' },
  { id: 'POL-102', customerName: 'Priya Patil', premium: 8500, status: 'Pending' },
];

test('shows loading, success, case-insensitive search and status filter', async () => {
  let resolve!: (value: Policy[]) => void;
  const loader: PolicyLoader = () => new Promise<Policy[]>(r => { resolve = r; });
  const user = userEvent.setup();
  render(<PolicyList loadPolicies={loader} />);
  expect(screen.getByRole('status')).toHaveTextContent('Loading policies');
  resolve(sample);
  expect(await screen.findByText('Amit Sharma')).toBeInTheDocument();
  await user.type(screen.getByRole('searchbox', { name: /search by customer name/i }), 'pRIya');
  expect(screen.queryByText('Amit Sharma')).not.toBeInTheDocument();
  expect(screen.getByText('Priya Patil')).toBeInTheDocument();
  await user.clear(screen.getByRole('searchbox', { name: /search by customer name/i }));
  await user.selectOptions(screen.getByRole('combobox', { name: 'Status' }), 'Active');
  expect(screen.getByText('Amit Sharma')).toBeInTheDocument();
  expect(screen.queryByText('Priya Patil')).not.toBeInTheDocument();
});

test('shows error and retries to success', async () => {
  const loader = vi.fn<PolicyLoader>()
    .mockRejectedValueOnce(new Error('network'))
    .mockResolvedValueOnce(sample);
  const user = userEvent.setup();
  render(<PolicyList loadPolicies={loader} />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not load policies');
  await user.click(screen.getByRole('button', { name: 'Retry' }));
  expect(await screen.findByText('Amit Sharma')).toBeInTheDocument();
  expect(loader).toHaveBeenCalledTimes(2);
});

test('distinguishes a valid empty response from no matches', async () => {
  const loader: PolicyLoader = async () => [];
  render(<PolicyList loadPolicies={loader} />);
  expect(await screen.findByText('No policies available.')).toBeInTheDocument();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

test('opens policy details, updates the panel on another selection, and closes them', async () => {
  const user = userEvent.setup();
  render(<PolicyList loadPolicies={async () => sample} />);
  await user.click(await screen.findByRole('button', { name: 'View details for Amit Sharma' }));
  expect(screen.getByRole('heading', { name: 'Policy details' })).toBeInTheDocument();
  expect(screen.getByText('POL-101')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'View details for Priya Patil' }));
  const panel = screen.getByRole('complementary', { name: 'Policy details' });
  expect(within(panel).getByText('Priya Patil')).toBeInTheDocument();
  expect(within(panel).queryByText('Amit Sharma')).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Close' }));
  expect(screen.queryByRole('heading', { name: 'Policy details' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'View details for Priya Patil' })).toHaveFocus();
});

test('combines product, status and trimmed search; resets filters without changing portfolio totals', async () => {
  const policies: Policy[] = [
    { id: '1', customerName: 'Meera Joshi', product: 'Health Protect', status: 'Active', premium: 22000 },
    { id: '2', customerName: 'Asha Kulkarni', product: 'Health Protect', status: 'Active', premium: 18400 },
    { id: '3', customerName: 'Meera Patil', product: 'Motor Comprehensive', status: 'Pending', premium: 9200 },
    { id: '4', customerName: 'Unknown product customer', status: 'Active', premium: 5000 },
  ];
  const user = userEvent.setup();
  render(<PolicyList loadPolicies={async () => policies} />);
  await screen.findByText('Meera Joshi');
  await user.selectOptions(screen.getByLabelText('Product'), 'Health Protect');
  await user.selectOptions(screen.getByLabelText('Status'), 'Active');
  await user.type(screen.getByRole('searchbox'), '  mEERA  ');
  expect(screen.getByRole('status')).toHaveTextContent('1 policy found');
  expect(screen.getByText('Meera Joshi')).toBeInTheDocument();
  expect(screen.queryByText('Meera Patil')).not.toBeInTheDocument();
  expect(screen.getByLabelText('Policy summary')).toHaveTextContent('Total policies4');
  await user.click(screen.getByRole('button', { name: 'View details for Meera Joshi' }));
  await user.selectOptions(screen.getByLabelText('Product'), 'Motor Comprehensive');
  expect(screen.getByText('No matching policies found.')).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Policy details' })).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Reset filters' }));
  expect(screen.getByRole('status')).toHaveTextContent('4 policies found');
  expect(screen.getByRole('searchbox')).toHaveValue('');
  expect(screen.getByLabelText('Status')).toHaveValue('All');
  expect(screen.getByLabelText('Product')).toHaveValue('');
  expect(screen.getByText('Unknown product customer')).toBeInTheDocument();
});
