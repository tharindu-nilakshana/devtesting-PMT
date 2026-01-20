"use client";

import { useTheme } from '../../hooks/useTheme';
import { usePreferences } from '../../hooks/usePreferences';
import { useAuth } from '../../contexts/AuthContext';

export default function ThemeToggle() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { preferences, updatePreference } = usePreferences(user?.id);

  const handleToggle = async () => {
    // Update preference, which will trigger the theme change via usePreferences effect
    await updatePreference('darkMode', !preferences.darkMode);
  };

  return (
    <button
      onClick={handleToggle}
      className="w-8 h-8 flex items-center justify-center text-neutral-400 hover:text-orange-400 transition-colors"
      title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
    >
      {theme === 'dark' ? (
        // Sun icon for dark mode (clicking will switch to light)
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ) : (
        // Moon icon for light mode (clicking will switch to dark)
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      )}
    </button>
  );
}
