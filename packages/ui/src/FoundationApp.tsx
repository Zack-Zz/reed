import { useEffect, useRef, useState } from 'react';
import { CoreHealthError, getCoreHealth } from '@reed/client';
import type { CoreHealth, CoreHealthErrorCode, HealthTransport } from '@reed/client';
import { locales, messages } from './locales/index.js';
import type { Locale } from './locales/index.js';

export interface FoundationAppProps {
  healthTransport?: HealthTransport;
  initialLocale?: Locale;
}

type Theme = 'system' | 'light' | 'dark';
type HealthState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'connected'; health: CoreHealth; checkedAt: Date }
  | { status: 'error'; code: CoreHealthErrorCode };
const themes: Theme[] = ['system', 'light', 'dark'];

export function FoundationApp({ healthTransport, initialLocale = 'en' }: FoundationAppProps) {
  const [locale, setLocale] = useState<Locale>(initialLocale);
  const [theme, setTheme] = useState<Theme>('system');
  const [state, setState] = useState<HealthState>({ status: 'idle' });
  const request = useRef<AbortController | null>(null);
  const text = messages[locale];

  useEffect(() => () => { request.current?.abort(); }, []);
  useEffect(() => { document.documentElement.lang = locale; }, [locale]);

  async function refresh() {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setState({ status: 'loading' });
    try {
      const health = await getCoreHealth({ transport: healthTransport, signal: controller.signal });
      if (!controller.signal.aborted) setState({ status: 'connected', health, checkedAt: new Date() });
    } catch (error) {
      if (!controller.signal.aborted) {
        setState({ status: 'error', code: error instanceof CoreHealthError ? error.code : 'network' });
      }
    } finally {
      if (request.current === controller) request.current = null;
    }
  }

  return (
    <div className="reed-app" data-theme={theme}>
      <header className="app-header">
        <a className="wordmark" href="#main">{text.product}</a>

      </header>
      <main id="main" className="foundation-main">
        <section className="introduction" aria-labelledby="foundation-title">
          <p className="eyebrow"><span className="stage-mark" aria-hidden="true" />{text.foundation}</p>
          <h1 id="foundation-title">{text.title}</h1>
          <p className="intro-copy">{text.introduction}</p>
          <p className="scope-note">{text.scope}</p>
        </section>
        <section className="health-panel" aria-labelledby="core-title" aria-busy={state.status === 'loading'}>
          <div className="panel-heading">
            <h2 id="core-title">{text.core}</h2>
            <button type="button" onClick={() => void refresh()} disabled={state.status === 'loading'}>
              <span className="refresh-icon" aria-hidden="true">↻</span>
              {state.status === 'loading' ? text.refreshPending : text.refresh}
            </button>
          </div>
          <div className="connection-summary" role="status" aria-live="polite">
            <span className={`status-dot status-${state.status}`} aria-hidden="true" />
            <span>{text.states[state.status]}</span>
          </div>
          {state.status === 'connected' && (
            <dl className="health-details">
              <div><dt>{text.version}</dt><dd>{state.health.version}</dd></div>
              <div><dt>{text.protocol}</dt><dd>{state.health.protocolVersion}</dd></div>
              <div><dt>{text.mode}</dt><dd>{state.health.mode}</dd></div>
              <div><dt>{text.checkedAt}</dt><dd>{new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(state.checkedAt)}</dd></div>
            </dl>
          )}
          {state.status === 'error' && <p className="error-message" role="alert">{text.errors[state.code]}</p>}
          <p className="panel-hint">{text.hint}</p>
        </section>
        <p className="tagline">{text.tagline}</p>
      </main>
      <footer className="app-footer">
        <div className="preferences">
          <label className="compact-control">
            <span>{text.theme}</span>
            <select aria-label={text.theme} value={theme} onChange={(event) => setTheme(event.target.value as Theme)}>
              {themes.map((value) => <option key={value} value={value}>{text.themes[value]}</option>)}
            </select>
          </label>
          <label className="compact-control">
            <span>{text.language}</span>
            <select aria-label={text.language} value={locale} onChange={(event) => setLocale(event.target.value as Locale)}>
              {locales.map((value) => <option key={value} value={value}>{text.languages[value]}</option>)}
            </select>
          </label>
        </div>
        <span>{text.footer}</span>
      </footer>
    </div>
  );
}
