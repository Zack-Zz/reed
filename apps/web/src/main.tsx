import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { WorkbenchRoot } from '@reed/ui';
import { createMockWorkbenchRuntime } from '@reed/ui/mock';
import '@reed/ui/styles.css';

// Explicit presentation adapter while product flows are being defined.
const runtime = createMockWorkbenchRuntime();
const root = document.getElementById('root');
if (!root) throw new Error('Missing application root');
createRoot(root).render(<StrictMode><WorkbenchRoot runtime={runtime} /></StrictMode>);
