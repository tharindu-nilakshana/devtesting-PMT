import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import translation files
import enCommon from '../locales/en/common.json';
import deCommon from '../locales/de/common.json';
import esCommon from '../locales/es/common.json';
import frCommon from '../locales/fr/common.json';
import itCommon from '../locales/it/common.json';
import ruCommon from '../locales/ru/common.json';

// Initialize with a default language first
const defaultLanguage = 'en';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        common: enCommon
      },
      de: {
        common: deCommon
      },
      es: {
        common: esCommon
      },
      fr: {
        common: frCommon
      },
      it: {
        common: itCommon
      },
      ru: {
        common: ruCommon
      }
    },
    lng: defaultLanguage,
    fallbackLng: 'en',
    ns: ['common'],
    defaultNS: 'common',
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false, // Important for Next.js App Router
    },
  });

// Load saved language after initialization (client-side only)
if (typeof window !== 'undefined') {
  const savedLang = localStorage.getItem('lang');
  if (savedLang && savedLang !== i18n.language) {
    i18n.changeLanguage(savedLang);
  }
}

export default i18n;
