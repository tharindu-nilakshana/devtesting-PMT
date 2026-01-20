"use client";

import { useEffect, useState } from 'react';
import { Theme, getCurrentTheme, setTheme, useThemeStyles } from '../utils/themeStyles';

/**
 * Hook to manage theme state and styles
 * @param category - Widget category
 * @param widgetName - Widget name
 * @returns Theme management object
 */
export const useTheme = (category?: string, widgetName?: string) => {
  // Initialize with current theme immediately (no re-render needed)
  const [currentTheme, setCurrentThemeState] = useState<Theme>(() => getCurrentTheme());

  // Update theme state when HTML data attribute or class changes
  useEffect(() => {
    const handleThemeChange = () => {
      const newTheme = getCurrentTheme();
      setCurrentThemeState(prev => prev === newTheme ? prev : newTheme);
    };

    // Listen for theme changes (both data-theme attribute and class)
    const observer = new MutationObserver(handleThemeChange);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'class']
    });

    return () => observer.disconnect();
  }, []);

  // REMOVED: This effect was causing unnecessary re-renders and theme flashing
  // The theme is already correct from server/inline script

  // Get theme styles if category and widget are provided
  const themeStyles = useThemeStyles(category || '', widgetName || '', currentTheme);

  // Toggle between light and dark themes
  const toggleTheme = () => {
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    setCurrentThemeState(newTheme);
  };

  // Set specific theme
  const changeTheme = (theme: Theme) => {
    setTheme(theme);
    setCurrentThemeState(theme);
  };

  return {
    theme: currentTheme,
    isDark: currentTheme === 'dark',
    isLight: currentTheme === 'light',
    toggleTheme,
    changeTheme,
    themeStyles
  };
};

/**
 * Hook for components that need to load theme-specific styles
 * @param category - Widget category
 * @param widgetName - Widget name
 * @returns Object with style loading functions and current theme
 */
export const useThemeStylesLoader = (category: string, widgetName: string) => {
  const { theme, themeStyles } = useTheme(category, widgetName);

  // Load styles when theme changes
  useEffect(() => {
    if (themeStyles) {
      themeStyles.loadStyles();
    }
  }, [theme, themeStyles]);

  return {
    theme,
    themeStyles,
    loadStyles: themeStyles?.loadStyles,
    loadMainStyles: themeStyles?.loadMainStyles
  };
};