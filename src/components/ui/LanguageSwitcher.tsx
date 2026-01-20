'use client';

import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { setLanguagePreference } from '../../utils/languageIntegration';
import { toast } from 'sonner';

const languages = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
];

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [currentLang, setCurrentLang] = useState(
    languages.find(lang => lang.code === i18n.language) || languages[0]
  );

  useEffect(() => {
    // Update current language when i18n language changes
    const newLang = languages.find(lang => lang.code === i18n.language);
    if (newLang) {
      setCurrentLang(newLang);
    }
  }, [i18n.language]);

  const handleLanguageChange = async (langCode: string) => {
    try {
      // Change i18n language immediately for UI responsiveness
      i18n.changeLanguage(langCode);
      
      // Update localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('lang', langCode);
      }

      // Update document language attribute
      if (typeof document !== 'undefined') {
        document.documentElement.lang = langCode;
      }
      
      // Call update-preferences API to persist language preference
      const response = await fetch('/api/user/update-preferences', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          languagePreference: langCode,
        }),
      });

      if (!response.ok) {
        console.warn('Failed to update language preference on server');
        // Don't show error to user as the UI language has already changed
      }
      
      setIsOpen(false);
    } catch (error) {
      console.error('Error changing language:', error);
      // Still close the dropdown as the UI language has already changed
      setIsOpen(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-card text-foreground rounded-md transition-colors border border-border hover:border-primary/50"
        aria-label="Select language"
      >
        <span className="text-lg">{currentLang.flag}</span>
        <span className="text-sm font-medium">{currentLang.name}</span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-48 bg-card border border-border rounded-md shadow-lg z-50">
          <div className="py-1">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => handleLanguageChange(lang.code)}
                className={`w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-accent transition-colors ${
                  currentLang.code === lang.code ? 'bg-accent' : ''
                }`}
              >
                <span className="text-lg">{lang.flag}</span>
                <span className="text-sm text-foreground">{lang.name}</span>
                {currentLang.code === lang.code && (
                  <svg className="w-4 h-4 text-primary ml-auto" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Overlay to close dropdown when clicking outside */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
