import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createNativeHealthTransport } from './health-transport';
import { FoundationApp } from '@reed/ui';
import '@reed/ui/styles.css';

const healthTransport = createNativeHealthTransport();
const root = document.getElementById('root');
if (!root) throw new Error('Missing application root');
createRoot(root).render(<StrictMode><FoundationApp healthTransport={healthTransport} /></StrictMode>);
