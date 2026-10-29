import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createHttpHealthTransport } from '@reed/client';
import { FoundationApp } from '@reed/ui';
import '@reed/ui/styles.css';

const healthTransport = createHttpHealthTransport();
const root = document.getElementById('root');
if (!root) throw new Error('Missing application root');
createRoot(root).render(<StrictMode><FoundationApp healthTransport={healthTransport} /></StrictMode>);
