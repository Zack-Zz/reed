import { WorkbenchRuntimeProvider } from './runtime-context';
import { I18nProvider } from './i18n.jsx';
import { App } from './App.jsx';
import type { WorkbenchRuntime, WorkbenchFileExport } from './ports';
import type { Locale } from '../locales/index';

export interface WorkbenchRootProps {
  runtime: WorkbenchRuntime;
  fileExport?: WorkbenchFileExport;
  initialLocale?: Locale;
}

export function WorkbenchRoot({ runtime, initialLocale, fileExport }: WorkbenchRootProps) {
  return (
    <WorkbenchRuntimeProvider runtime={runtime} fileExport={fileExport}>
      <I18nProvider initialLocale={initialLocale}>
        <App />
      </I18nProvider>
    </WorkbenchRuntimeProvider>
  );
}
