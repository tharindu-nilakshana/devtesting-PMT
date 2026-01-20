/**
 * Utility functions for widget settings management
 */

/**
 * Define which widget types have ONLY module and symbol settings
 * These widgets will have their settings icon completely hidden in Details templates
 */
const WIDGETS_WITH_ONLY_MODULE_SYMBOL: string[] = [
  // Seasonality widgets with only asset class + symbol
  'seasonality-performance-chart',
  'seasonality-performance-table',
  // DMX widgets with only asset class + symbol
  'dmx-positioning',
];

/**
 * Define which widget types have module and symbol settings PLUS other settings
 * These widgets will show the settings icon, but module/symbol fields will be hidden in Details templates
 */
const WIDGETS_WITH_MODULE_SYMBOL_PLUS_OTHER = [
  'price-chart',
  'technical-chart',
  'trading-view-widget',
  'information-chart',
  'mini-chart',
  'exponential-moving-average',
  'supertrend',
  // Seasonality widgets
  'seasonality-forecast',
  'seasonality-forecast-chart',
  'seasonality-forecast-table',
  // DMX widgets
  'dmx-chart',
  'dmx-statistics-table',
  'dmx-overview',
  'dmx-open-interest',
  // Other widgets
  'news-sentiment',
  'gauge-overview',
  // Add more widgets that have module/symbol + additional settings like timeframe, chart type, etc.
];

/**
 * Check if a widget ONLY has module and symbol settings (no other settings)
 * If true, the settings icon should be completely hidden in Details templates
 * 
 * @param widgetType - The widget type identifier
 * @returns true if widget only has module/symbol settings
 */
export function widgetHasOnlyModuleAndSymbol(widgetType: string): boolean {
  return WIDGETS_WITH_ONLY_MODULE_SYMBOL.includes(widgetType);
}

/**
 * Check if a widget has module and symbol settings plus other settings
 * If true, the settings icon should be shown, but module/symbol fields hidden in Details templates
 * 
 * @param widgetType - The widget type identifier
 * @returns true if widget has module/symbol plus other settings
 */
export function widgetHasModuleSymbolPlusOther(widgetType: string): boolean {
  return WIDGETS_WITH_MODULE_SYMBOL_PLUS_OTHER.includes(widgetType);
}

/**
 * Check if a widget has module/symbol settings at all
 * Used to determine if locking should be applied
 * 
 * @param widgetType - The widget type identifier
 * @returns true if widget has module and/or symbol settings
 */
export function widgetHasModuleOrSymbolSettings(widgetType: string): boolean {
  return widgetHasOnlyModuleAndSymbol(widgetType) || widgetHasModuleSymbolPlusOther(widgetType);
}

/**
 * Check if settings icon should be shown for a widget in a Details template
 * Returns false if widget only has module/symbol (which would be locked)
 * Returns true if widget has additional settings beyond module/symbol
 * 
 * @param widgetType - The widget type identifier
 * @param isDetailsTemplate - Whether the current template is a Details template
 * @returns true if settings icon should be shown
 */
export function shouldShowSettingsIcon(widgetType: string, isDetailsTemplate: boolean): boolean {
  if (!isDetailsTemplate) {
    // Always show settings icon in non-Details templates
    return true;
  }
  
  // In Details templates, only show if widget has additional settings beyond module/symbol
  if (widgetHasOnlyModuleAndSymbol(widgetType)) {
    return false; // Hide completely - only has module/symbol which are locked
  }
  
  if (widgetHasModuleSymbolPlusOther(widgetType)) {
    return true; // Show settings - has other settings to configure
  }
  
  // For widgets not in either list, show the settings icon (default behavior)
  return true;
}
