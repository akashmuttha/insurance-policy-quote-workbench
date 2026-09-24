import { useEffect, useRef, useState } from 'react';

export type PolicyStatus = 'Active' | 'Pending' | 'Expired';
export type Policy = {
  id: string;
  customerName: string;
  premium: number;
  status: PolicyStatus;
  product?: string;
  renewalDate?: string;
};
type RequestState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'success'; policies: Policy[] };
export type PolicyLoader = (signal: AbortSignal) => Promise<Policy[]>;

function isPolicy(value: unknown): value is Policy {
  if (typeof value !== 'object' || value === null) return false;
  const p = value as Record<string, unknown>;
  return typeof p.id === 'string' && p.id.length > 0 &&
    typeof p.customerName === 'string' &&
    typeof p.premium === 'number' && Number.isFinite(p.premium) &&
    (p.product === undefined || typeof p.product === 'string') &&
    (p.renewalDate === undefined || typeof p.renewalDate === 'string') &&
    (p.status === 'Active' || p.status === 'Pending' || p.status === 'Expired');
}

export async function fetchPolicies(signal: AbortSignal): Promise<Policy[]> {
  // The local API returns fictional seed records; it does not access a database.
  const response = await fetch('/api/policies', { signal });
  if (!response.ok) throw new Error(`Request failed (${response.status})`);
  const value: unknown = await response.json();
  if (!Array.isArray(value) || !value.every(isPolicy)) {
    throw new Error('Unexpected policy response');
  }
  return value;
}

export function PolicyList({ loadPolicies = fetchPolicies }: { loadPolicies?: PolicyLoader }) {
  const [request, setRequest] = useState<RequestState>({ kind: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<PolicyStatus | 'All'>('All');
  const [product, setProduct] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const lastDetailsButton = useRef<HTMLButtonElement | null>(null);
  const detailsHeading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    // On a narrow screen the stacked panel needs to be brought into view.
    if (selectedId && window.matchMedia?.('(max-width: 800px)').matches) {
      detailsHeading.current?.focus();
    }
  }, [selectedId]);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setRequest({ kind: 'loading' });
    loadPolicies(controller.signal).then(
      policies => { if (active) setRequest({ kind: 'success', policies }); },
      error => {
        if (active && !(error instanceof DOMException && error.name === 'AbortError')) {
          setRequest({ kind: 'error', message: 'Could not load policies. Please try again.' });
        }
      },
    );
    return () => { active = false; controller.abort(); };
  }, [loadPolicies, attempt]);

  if (request.kind === 'loading') return <div className="state-card" role="status">Loading policies…</div>;
  if (request.kind === 'error') return (
    <section className="state-card" aria-labelledby="policies-heading">
      <h1 id="policies-heading">Policy overview</h1>
      <p role="alert">{request.message}</p>
      <button type="button" onClick={() => setAttempt(n => n + 1)}>Retry</button>
    </section>
  );

  const normalizedQuery = query.trim().toLocaleLowerCase();
  const filtered = request.policies.filter(policy =>
    policy.customerName.toLocaleLowerCase().includes(normalizedQuery) &&
    (status === 'All' || policy.status === status) &&
    (product === '' || policy.product === product),
  );
  const products = [...new Set(request.policies.map(policy => policy.product)
    .filter((value): value is string => typeof value === 'string' && value.length > 0))].sort();
  const selected = request.policies.find(policy => policy.id === selectedId);
  const activeCount = request.policies.filter(policy => policy.status === 'Active').length;
  const pendingCount = request.policies.filter(policy => policy.status === 'Pending').length;

  return (
    <section aria-labelledby="policies-heading">
      <div className="hero">
        <div>
          <p className="eyebrow">INSURANCE OPERATIONS · DEMO DATA</p>
          <h1 id="policies-heading">Policy overview</h1>
          <p className="subtitle">Find a policy, check its status, and review its details.</p>
        </div>
        <span className="demo-badge">Portfolio POC</span>
      </div>
      <div className="metrics" aria-label="Policy summary">
        <div><span>Total policies</span><strong>{request.policies.length}</strong></div>
        <div><span>Active</span><strong>{activeCount}</strong></div>
        <div><span>Pending</span><strong>{pendingCount}</strong></div>
      </div>
      <div className="policy-workspace">
      <div className="policy-results">
      <div className="section-heading"><h2>Policies</h2><span>Sample records</span></div>
      <div className="controls">
        <div className="filter-field search-field">
        <label htmlFor="customer-search">Search by customer name</label>
        <input id="customer-search" type="search" value={query}
          onChange={event => { setQuery(event.currentTarget.value); setSelectedId(null); }} />
        </div>
        <div className="filter-field">
        <label htmlFor="policy-status">Status</label>
        <select id="policy-status" value={status}
          onChange={event => { setStatus(event.currentTarget.value as PolicyStatus | 'All'); setSelectedId(null); }}>
          <option value="All">All statuses</option>
          <option value="Active">Active</option>
          <option value="Pending">Pending</option>
          <option value="Expired">Expired</option>
        </select>
        </div>
        <div className="filter-field">
          <label htmlFor="policy-product">Product</label>
          <select id="policy-product" value={product}
            onChange={event => { setProduct(event.currentTarget.value); setSelectedId(null); }}>
            <option value="">All products</option>
            {products.map(name => <option key={name} value={name}>{name}</option>)}
          </select>
        </div>
      </div>
      <div className="results-toolbar">
        <p role="status" aria-live="polite">{filtered.length} {filtered.length === 1 ? 'policy' : 'policies'} found</p>
        <button type="button" onClick={() => { setQuery(''); setStatus('All'); setProduct(''); setSelectedId(null); }}>Reset filters</button>
      </div>
      {filtered.length === 0 ? <p className="empty">{request.policies.length === 0 ? 'No policies available.' : 'No matching policies found.'}</p> : (
        <ul className="policies">
          {filtered.map(policy => (
            <li key={policy.id} className={selectedId === policy.id ? 'is-selected' : undefined}>
              <div><strong>{policy.customerName}</strong><small>{policy.id} · {policy.product ?? 'Insurance'}</small></div>
              <span className={`status status-${policy.status.toLowerCase()}`}>{policy.status}</span>
              <span className="premium">₹{policy.premium.toLocaleString('en-IN')}<small>Annual premium</small></span>
              <button type="button" className="detail-button" onClick={event => { lastDetailsButton.current = event.currentTarget; setSelectedId(policy.id); }}
                aria-controls="policy-details" aria-pressed={selectedId === policy.id}
                aria-label={`View details for ${policy.customerName}`}>Details</button>
            </li>
          ))}
        </ul>
      )}
      </div>
        <aside id="policy-details" className="details" aria-labelledby="details-heading">
        {selected ? <>
          <div className="section-heading"><h2 id="details-heading" ref={detailsHeading} tabIndex={-1}>Policy details</h2>
            <button type="button" className="close-button" onClick={() => { lastDetailsButton.current?.focus(); setSelectedId(null); }}>Close</button></div>
          <dl aria-live="polite" aria-atomic="true">
            <div><dt>Policy ID</dt><dd>{selected.id}</dd></div>
            <div><dt>Customer</dt><dd>{selected.customerName}</dd></div>
            <div><dt>Product</dt><dd>{selected.product ?? 'Insurance'}</dd></div>
            <div><dt>Status</dt><dd>{selected.status}</dd></div>
            <div><dt>Annual premium</dt><dd>₹{selected.premium.toLocaleString('en-IN')}</dd></div>
            <div><dt>Renewal date</dt><dd>{selected.renewalDate ?? 'Not available'}</dd></div>
          </dl>
        </> : <>
          <p className="eyebrow">POLICY SNAPSHOT</p>
          <h2 id="details-heading">Select a policy</h2>
          <p className="subtitle">Choose Details on any policy to review it here.</p>
        </>}
        </aside>
      </div>
    </section>
  );
}
