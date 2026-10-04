import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@tryonit/react/styles.css';
import './playground.css';
import { App } from './App';

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
