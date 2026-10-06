import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '../locales/en.json';
import hi from '../locales/hi.json';

// No external translation calls, browser storage, or analytics in Phase 1.
void i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, hi: { translation: hi } },
  lng: navigator.language.toLowerCase().startsWith('hi') ? 'hi' : 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});
export default i18n;
