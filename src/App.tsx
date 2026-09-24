import { useState } from 'react';
import { PolicyList } from './PolicyList';
import { QuoteSubmission } from './QuoteSubmission';

export default function App() {
  const [view, setView] = useState<'submission' | 'policies'>('submission');
  return <>
    <a className="skip-link" href="#main-content">Skip to content</a>
    <header className="app-header">
      <div className="brand"><span className="brand-mark" aria-hidden="true">p.</span><span>Policy desk<small>INSURANCE WORKSPACE</small></span></div>
      <nav aria-label="Workspace">
        <button type="button" aria-pressed={view === 'submission'} onClick={() => setView('submission')}>Create submission</button>
        <button type="button" aria-pressed={view === 'policies'} onClick={() => setView('policies')}>Policy overview</button>
      </nav>
    </header>
    <main id="main-content" tabIndex={-1}>
      <div hidden={view !== 'submission'}><QuoteSubmission /></div>
      {view === 'policies' && <PolicyList />}
    </main>
    <footer className="app-footer"><span>Policy desk · Interview POC</span><span>Fictional data. No real insurance transactions.</span></footer>
  </>;
}
