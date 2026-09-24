import { useEffect, useRef, useState, type FormEvent } from 'react';
import { isProduct, QuoteApiError, requestQuote, type FieldErrors, type Quote, type QuoteLoader } from './quoteApi';

type QuoteState =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'error'; message: string }
  | { kind: 'success'; quote: Quote };
const emptyForm = { customerName: '', product: '', coverageAmount: '500000' };
const formFields = [
  { key: 'customerName', id: 'quote-customer', label: 'Customer name' },
  { key: 'product', id: 'quote-product', label: 'Insurance product' },
  { key: 'coverageAmount', id: 'quote-coverage', label: 'Coverage amount' },
] as const;
const money = (amount: number) => new Intl.NumberFormat('en-IN', {
  style: 'currency', currency: 'INR', maximumFractionDigits: 0,
}).format(amount);

export function QuoteSubmission({ loadQuote = requestQuote }: { loadQuote?: QuoteLoader }) {
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [state, setState] = useState<QuoteState>({ kind: 'idle' });
  const request = useRef<AbortController | null>(null);
  const resultHeading = useRef<HTMLHeadingElement>(null);
  const errorSummary = useRef<HTMLDivElement>(null);
  const nameInput = useRef<HTMLInputElement>(null);
  const returnToForm = useRef(false);

  useEffect(() => () => { request.current?.abort(); }, []);
  useEffect(() => {
    if (state.kind === 'success') resultHeading.current?.focus();
    if (state.kind === 'error') errorSummary.current?.focus();
    if (state.kind === 'idle' && returnToForm.current) {
      nameInput.current?.focus();
      returnToForm.current = false;
    }
  }, [state]);

  function editSubmission(reset = false) {
    if (reset) setForm(emptyForm);
    setErrors({});
    returnToForm.current = true;
    setState({ kind: 'idle' });
  }

  function change(field: keyof typeof form, value: string) {
    setForm(current => ({ ...current, [field]: value }));
    setErrors(current => ({ ...current, [field]: undefined }));
    if (state.kind === 'error') setState({ kind: 'idle' });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (request.current) return;
    const nextErrors: FieldErrors = {};
    const customerName = form.customerName.trim();
    const coverageAmount = Number(form.coverageAmount);
    if (customerName.length < 2 || customerName.length > 80) nextErrors.customerName = 'Enter a customer name between 2 and 80 characters.';
    if (!isProduct(form.product)) nextErrors.product = 'Choose a product.';
    if (![100000, 500000, 1000000].includes(coverageAmount)) nextErrors.coverageAmount = 'Choose an available coverage amount.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length || !isProduct(form.product)) {
      setState({ kind: 'error', message: 'Please check the highlighted fields.' });
      return;
    }
    const controller = new AbortController();
    request.current = controller;
    setState({ kind: 'submitting' });
    try {
      const quote = await loadQuote({ customerName, product: form.product, coverageAmount }, controller.signal);
      if (!controller.signal.aborted) setState({ kind: 'success', quote });
    } catch (error) {
      if (!controller.signal.aborted) {
        if (error instanceof QuoteApiError) setErrors(error.fieldErrors);
        setState({ kind: 'error', message: error instanceof QuoteApiError ? error.message : 'Could not calculate your quote. Check your connection and try again.' });
      }
    } finally {
      if (request.current === controller) request.current = null;
    }
  }

  const complete = state.kind === 'success';
  const pending = state.kind === 'submitting';
  return (
    <section aria-labelledby="submission-heading">
      <div className="hero">
        <div><p className="eyebrow">NEW BUSINESS · FICTIONAL DATA ONLY</p>
          <h1 id="submission-heading">A quote starts here.</h1>
          <p className="subtitle">A few details. A clear estimate. No commitment.</p></div>
        <span className="demo-badge">Demo workspace</span>
      </div>
      <ol className="steps" aria-label="Submission progress">
        <li aria-current={!complete ? 'step' : undefined}><span>{complete ? '✓' : '01'}</span> Submission details</li>
        <li aria-current={complete ? 'step' : undefined}><span>02</span> Review quote</li>
      </ol>
      {state.kind === 'success' ? (
        <div className="quote-layout">
          <article className="form-card">
            <p className="eyebrow">ESTIMATE READY</p>
            <h2 ref={resultHeading} tabIndex={-1}>Your quote summary</h2>
            <p className="muted">Prepared for {state.quote.customerName}</p>
            <dl className="quote-facts">
              <div><dt>Product</dt><dd>{state.quote.product}</dd></div>
              <div><dt>Coverage amount</dt><dd>{money(state.quote.coverageAmount)}</dd></div>
              <div><dt>Policy term</dt><dd>1 year (demo)</dd></div>
              <div><dt>Reference</dt><dd className="quote-reference">{state.quote.quoteId}</dd></div>
            </dl>
            <div className="form-actions">
              <button type="button" onClick={() => editSubmission()}>Edit submission</button>
              <button type="button" className="primary-button" onClick={() => editSubmission(true)}>New submission</button>
            </div>
          </article>
          <aside className="estimate-card" aria-label="Premium estimate">
            <span className="estimate-label">Estimated annual premium</span>
            <p className="estimate-amount">{money(state.quote.annualPremium)}</p>
            <span className="estimate-period">INR / year</span>
            <div className="calculation"><span>Coverage × fictional rate</span><strong>{money(state.quote.coverageAmount)} × {state.quote.ratePercent}%</strong></div>
            <p>Demo estimate — fictional pricing. No real underwriting, taxes, fees, or insurance offer. No policy has been issued.</p>
          </aside>
        </div>
      ) : (
        <div className="quote-layout">
          <form className="form-card" onSubmit={submit} noValidate aria-busy={pending}>
            <div className="section-heading"><h2>Submission details</h2><span>All fields required</span></div>
            <p className="muted form-intro">Use a fictional customer to explore the quote journey.</p>
            {state.kind === 'error' && <div className="error-summary" role="alert" ref={errorSummary} tabIndex={-1}>
              <p>{state.message}</p>
              {Object.values(errors).some(Boolean) && <ul>
                {formFields.filter(field => errors[field.key]).map(field => <li key={field.key}>
                  <a href={`#${field.id}`} onClick={event => { event.preventDefault(); document.getElementById(field.id)?.focus(); }}>
                    {field.label}: {errors[field.key]}
                  </a>
                </li>)}
              </ul>}
            </div>}
            <fieldset disabled={pending}>
              <legend className="visually-hidden">Customer and coverage details</legend>
              <div className="form-field">
                <label htmlFor="quote-customer">Customer name</label>
                <input ref={nameInput} id="quote-customer" value={form.customerName} maxLength={80} required
                  placeholder="e.g. Asha Kulkarni" autoComplete="off"
                  aria-invalid={!!errors.customerName} aria-describedby={errors.customerName ? 'name-error' : undefined}
                  onChange={event => change('customerName', event.currentTarget.value)} />
                {errors.customerName && <p className="field-error" id="name-error">{errors.customerName}</p>}
              </div>
              <div className="form-field">
                <label htmlFor="quote-product">Insurance product</label>
                <select id="quote-product" value={form.product} required aria-invalid={!!errors.product}
                  aria-describedby={errors.product ? 'product-error' : undefined} onChange={event => change('product', event.currentTarget.value)}>
                  <option value="">Select a product</option><option value="Health">Health</option><option value="Motor">Motor</option><option value="Home">Home</option>
                </select>
                {errors.product && <p className="field-error" id="product-error">{errors.product}</p>}
              </div>
              <div className="form-field">
                <label htmlFor="quote-coverage">Coverage amount</label>
                <select id="quote-coverage" value={form.coverageAmount} required aria-invalid={!!errors.coverageAmount}
                  aria-describedby={errors.coverageAmount ? 'coverage-error' : 'coverage-help'} onChange={event => change('coverageAmount', event.currentTarget.value)}>
                  {[100000, 500000, 1000000].map(amount => <option key={amount} value={amount}>{money(amount)}</option>)}
                </select>
                <p className="field-hint" id="coverage-help">The amount of cover requested for this demo.</p>
                {errors.coverageAmount && <p className="field-error" id="coverage-error">{errors.coverageAmount}</p>}
              </div>
              <button type="submit" className="primary-button submit-button">{pending ? 'Calculating quote…' : 'Calculate quote →'}</button>
            </fieldset>
            {pending && <p role="status" className="field-hint">Calculating your estimate. Please wait.</p>}
            <p className="form-footnote">No payment required. Submissions are not saved.</p>
          </form>
          <aside className="guide-card">
            <span className="guide-icon" aria-hidden="true">↗</span>
            <h2>Simple by design.</h2>
            <p>Choose your cover and review a transparent annual estimate.</p>
            <ul className="guide-list"><li>Three products to explore</li><li>Clear premium breakdown</li><li>Edit your details and quote again</li></ul>
            <div className="demo-note"><strong>A practice environment</strong><p>Fictional rates and sample data. This is not an insurance offer, and no policy will be issued.</p></div>
          </aside>
        </div>
      )}
    </section>
  );
}
