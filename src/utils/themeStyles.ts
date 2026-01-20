// Theme-aware SCSS import utility
// This utility helps components dynamically load the correct SCSS file based on theme

export type Theme = 'light' | 'dark';

/**
 * Get the correct SCSS file path for a widget based on theme
 * @param category - Widget category (e.g., 'PriceCharts', 'News')
 * @param widgetName - Widget name (e.g., 'MiniChart', 'RealtimeNewsTicker')
 * @param theme - Current theme ('light' or 'dark')
 * @returns Path to the appropriate SCSS file
 */
export const getThemeStylesPath = (
  category: string,
  widgetName: string,
  theme: Theme
): string => {
  return `../styles/${category}/${widgetName}/${widgetName}_${theme}.scss`;
};

/**
 * Get the correct SCSS file path for main styles based on theme
 * @param theme - Current theme ('light' or 'dark')
 * @returns Path to the appropriate main SCSS file
 */
export const getMainStylesPath = (theme: Theme): string => {
  return `../styles/main_${theme}.scss`;
};

/**
 * Dynamically import theme-specific styles
 * @param category - Widget category
 * @param widgetName - Widget name
 * @param theme - Current theme
 * @returns Promise that resolves when styles are loaded
 */
export const loadThemeStyles = async (
  category: string,
  widgetName: string,
  theme: Theme
): Promise<void> => {
  try {
    // For now, just log the style loading request
    // Actual style loading is handled by Next.js CSS imports in components
    console.log(`Loading ${theme} styles for ${category}/${widgetName}`);
  } catch (error) {
    console.warn(`Failed to load ${theme} styles for ${category}/${widgetName}:`, error);
  }
};

/**
 * Load main theme styles
 * @param theme - Current theme
 * @returns Promise that resolves when styles are loaded
 */
export const loadMainThemeStyles = async (theme: Theme): Promise<void> => {
  try {
    // For now, just log the style loading request
    // Actual style loading is handled by Next.js CSS imports in components
    console.log(`Loading main ${theme} styles`);
  } catch (error) {
    console.warn(`Failed to load main ${theme} styles:`, error);
  }
};

/**
 * Hook for React components to use theme-aware styles
 * @param category - Widget category
 * @param widgetName - Widget name
 * @param theme - Current theme
 * @returns Object with style loading functions
 */
export const useThemeStyles = (
  category: string,
  widgetName: string,
  theme: Theme
) => {
  const loadStyles = () => loadThemeStyles(category, widgetName, theme);
  const loadMainStyles = () => loadMainThemeStyles(theme);

  return {
    loadStyles,
    loadMainStyles,
    stylesPath: getThemeStylesPath(category, widgetName, theme),
    mainStylesPath: getMainStylesPath(theme)
  };
};

/**
 * Get current theme from HTML data attribute
 * @returns Current theme or 'dark' as default
 */
export const getCurrentTheme = (): Theme => {
  if (typeof document !== 'undefined') {
    const htmlElement = document.documentElement;
    const theme = htmlElement.getAttribute('data-theme');
    return theme === 'dark' ? 'dark' : 'light';
  }
  return 'dark';
};

/**
 * Set theme on HTML element
 * @param theme - Theme to set
 */
export const setTheme = (theme: Theme): void => {
  if (typeof document !== 'undefined') {
    const html = document.documentElement;
    // Set data-theme attribute
    html.setAttribute('data-theme', theme);
    // Also update className for components that watch the class (e.g., Tailwind dark mode)
    html.classList.remove('dark', 'light');
    html.classList.add(theme);
  }
};
