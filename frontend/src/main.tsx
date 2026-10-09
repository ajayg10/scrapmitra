import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './i18n';
import './style.css';
import App from './App';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
if (API_BASE && typeof window !== 'undefined') {
  const origFetch = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    if (typeof input === 'string' && input.startsWith('/v1')) {
      return origFetch(`${API_BASE}${input}`, init);
    }
    return origFetch(input, init);
  };
}

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
