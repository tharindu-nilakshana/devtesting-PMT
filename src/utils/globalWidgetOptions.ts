/**
 * Global Widget Options Storage
 * 
 * This module provides global storage for widget configurations, matching the original
 * prime_dashboard.js implementation using Maps for different widget types.
 */

// Widget Options Interface
export interface WidgetOptions {
  wgtl: string; // Widget type (e.g., 'risk_sentiment', 'risk_indicator')
  wght: number; // Widget height
  wgid: string; // Widget ID
  // Additional options can be added here
  currentRegion?: string;
  lastUpdate?: number;
  isInitialized?: boolean;
  useJQueryDOM?: boolean; // Flag to enable jQuery DOM manipulation mode
}

// Extend Window interface to include our widget options Maps
declare global {
  interface Window {
    RiskSentimentWidgetOptions: Map<string, WidgetOptions>;
    RealtimenewsWidgetOptions: Map<string, WidgetOptions>;
    EventCalendarWidgetOptions: Map<string, WidgetOptions>;
    EventCountdownWidgetOptions: Map<string, WidgetOptions>;
    DXMWidgetOptions: Map<string, WidgetOptions>;
    DXMPieChartWidgetOptions: Map<string, WidgetOptions>;
    DXMOverviewWidgetOptions: Map<string, WidgetOptions>;
    // Legacy currency strength options removed - now using React widgets
    CurrencySentimentWidgetOptions: Map<string, WidgetOptions>;
    CurrencySentimentHistoryWidgetOptions: Map<string, WidgetOptions>;
    ProfitHuntersWidgetOptions: Map<string, WidgetOptions>;
    momentumWidgetOptions: Map<string, WidgetOptions>;
  }
}

/**
 * Initialize global widget options storage
 * This should be called once when the application starts
 */
export function initializeGlobalWidgetOptions(): void {
  if (typeof window !== 'undefined') {
    // Initialize all widget options Maps (matching original implementation)
    window.RiskSentimentWidgetOptions = window.RiskSentimentWidgetOptions || new Map();
    window.RealtimenewsWidgetOptions = window.RealtimenewsWidgetOptions || new Map();
    window.EventCalendarWidgetOptions = window.EventCalendarWidgetOptions || new Map();
    window.EventCountdownWidgetOptions = window.EventCountdownWidgetOptions || new Map();
    window.DXMWidgetOptions = window.DXMWidgetOptions || new Map();
    window.DXMPieChartWidgetOptions = window.DXMPieChartWidgetOptions || new Map();
    window.DXMOverviewWidgetOptions = window.DXMOverviewWidgetOptions || new Map();
    // Legacy currency strength options removed - now using React widgets
    window.CurrencySentimentWidgetOptions = window.CurrencySentimentWidgetOptions || new Map();
    window.CurrencySentimentHistoryWidgetOptions = window.CurrencySentimentHistoryWidgetOptions || new Map();
    window.ProfitHuntersWidgetOptions = window.ProfitHuntersWidgetOptions || new Map();
    window.momentumWidgetOptions = window.momentumWidgetOptions || new Map();
    
    console.log('🌐 [GlobalWidgetOptions] Initialized global widget options storage');
  }
}

/**
 * Store Risk Sentiment widget options
 * @param wgid Widget ID
 * @param options Widget options to store
 */
export function storeRiskSentimentWidgetOptions(wgid: string, options: WidgetOptions): void {
  if (typeof window !== 'undefined') {
    window.RiskSentimentWidgetOptions.set(wgid, options);
    console.log('💾 [GlobalWidgetOptions] Stored Risk Sentiment widget options for:', wgid, options);
  }
}

/**
 * Get Risk Sentiment widget options
 * @param wgid Widget ID
 * @returns Widget options or undefined
 */
export function getRiskSentimentWidgetOptions(wgid: string): WidgetOptions | undefined {
  if (typeof window !== 'undefined') {
    return window.RiskSentimentWidgetOptions.get(wgid);
  }
  return undefined;
}

/**
 * Check if Risk Sentiment widget options exist
 * @param wgid Widget ID
 * @returns True if options exist
 */
export function hasRiskSentimentWidgetOptions(wgid: string): boolean {
  if (typeof window !== 'undefined') {
    return window.RiskSentimentWidgetOptions.has(wgid);
  }
  return false;
}

/**
 * Remove Risk Sentiment widget options
 * @param wgid Widget ID
 */
export function removeRiskSentimentWidgetOptions(wgid: string): void {
  if (typeof window !== 'undefined') {
    window.RiskSentimentWidgetOptions.delete(wgid);
    console.log('🗑️ [GlobalWidgetOptions] Removed Risk Sentiment widget options for:', wgid);
  }
}

/**
 * Update Risk Sentiment widget options
 * @param wgid Widget ID
 * @param updates Partial options to update
 */
export function updateRiskSentimentWidgetOptions(wgid: string, updates: Partial<WidgetOptions>): void {
  if (typeof window !== 'undefined') {
    const existing = window.RiskSentimentWidgetOptions.get(wgid);
    if (existing) {
      const updated = { ...existing, ...updates };
      window.RiskSentimentWidgetOptions.set(wgid, updated);
      console.log('🔄 [GlobalWidgetOptions] Updated Risk Sentiment widget options for:', wgid, updated);
    } else {
      console.warn('⚠️ [GlobalWidgetOptions] No existing options found for widget:', wgid);
    }
  }
}

/**
 * Get all Risk Sentiment widget options (for debugging)
 * @returns Map of all widget options
 */
export function getAllRiskSentimentWidgetOptions(): Map<string, WidgetOptions> {
  if (typeof window !== 'undefined') {
    return window.RiskSentimentWidgetOptions || new Map();
  }
  return new Map();
}

/**
 * Clear all Risk Sentiment widget options (for cleanup)
 */
export function clearAllRiskSentimentWidgetOptions(): void {
  if (typeof window !== 'undefined') {
    window.RiskSentimentWidgetOptions.clear();
    console.log('🧹 [GlobalWidgetOptions] Cleared all Risk Sentiment widget options');
  }
}

// Event Calendar Widget Options Functions

/**
 * Store Event Calendar widget options
 * @param wgid Widget ID
 * @param options Widget options to store
 */
export function storeEventCalendarWidgetOptions(wgid: string, options: WidgetOptions): void {
  if (typeof window !== 'undefined') {
    window.EventCalendarWidgetOptions.set(wgid, options);
    console.log('💾 [GlobalWidgetOptions] Stored Event Calendar widget options for:', wgid, options);
  }
}

/**
 * Get Event Calendar widget options
 * @param wgid Widget ID
 * @returns Widget options or undefined
 */
export function getEventCalendarWidgetOptions(wgid: string): WidgetOptions | undefined {
  if (typeof window !== 'undefined') {
    return window.EventCalendarWidgetOptions.get(wgid);
  }
  return undefined;
}

/**
 * Check if Event Calendar widget options exist
 * @param wgid Widget ID
 * @returns True if options exist
 */
export function hasEventCalendarWidgetOptions(wgid: string): boolean {
  if (typeof window !== 'undefined') {
    return window.EventCalendarWidgetOptions.has(wgid);
  }
  return false;
}

/**
 * Remove Event Calendar widget options
 * @param wgid Widget ID
 */
export function removeEventCalendarWidgetOptions(wgid: string): void {
  if (typeof window !== 'undefined') {
    window.EventCalendarWidgetOptions.delete(wgid);
    console.log('🗑️ [GlobalWidgetOptions] Removed Event Calendar widget options for:', wgid);
  }
}

/**
 * Update Event Calendar widget options
 * @param wgid Widget ID
 * @param updates Partial options to update
 */
export function updateEventCalendarWidgetOptions(wgid: string, updates: Partial<WidgetOptions>): void {
  if (typeof window !== 'undefined') {
    const existing = window.EventCalendarWidgetOptions.get(wgid);
    if (existing) {
      const updated = { ...existing, ...updates };
      window.EventCalendarWidgetOptions.set(wgid, updated);
      console.log('🔄 [GlobalWidgetOptions] Updated Event Calendar widget options for:', wgid, updated);
    } else {
      console.warn('⚠️ [GlobalWidgetOptions] No existing options found for widget:', wgid);
    }
  }
}

/**
 * Get all Event Calendar widget options (for debugging)
 * @returns Map of all widget options
 */
export function getAllEventCalendarWidgetOptions(): Map<string, WidgetOptions> {
  if (typeof window !== 'undefined') {
    return window.EventCalendarWidgetOptions || new Map();
  }
  return new Map();
}

/**
 * Clear all Event Calendar widget options (for cleanup)
 */
export function clearAllEventCalendarWidgetOptions(): void {
  if (typeof window !== 'undefined') {
    window.EventCalendarWidgetOptions.clear();
    console.log('🧹 [GlobalWidgetOptions] Cleared all Event Calendar widget options');
  }
}

/**
 * Generic function to store any widget options
 * @param mapName Name of the Map (e.g., 'RiskSentimentWidgetOptions')
 * @param wgid Widget ID
 * @param options Widget options to store
 */
export function storeWidgetOptions(mapName: string, wgid: string, options: WidgetOptions): void {
  if (typeof window !== 'undefined') {
    const map = (window as unknown as Record<string, unknown>)[mapName];
    if (map && map instanceof Map) {
      map.set(wgid, options);
      console.log(`💾 [GlobalWidgetOptions] Stored ${mapName} widget options for:`, wgid, options);
    } else {
      console.warn(`⚠️ [GlobalWidgetOptions] Map ${mapName} not found or not initialized`);
    }
  }
}

/**
 * Generic function to get any widget options
 * @param mapName Name of the Map (e.g., 'RiskSentimentWidgetOptions')
 * @param wgid Widget ID
 * @returns Widget options or undefined
 */
export function getWidgetOptions(mapName: string, wgid: string): WidgetOptions | undefined {
  if (typeof window !== 'undefined') {
    const map = (window as unknown as Record<string, unknown>)[mapName];
    if (map && map instanceof Map) {
      return map.get(wgid);
    }
  }
  return undefined;
}
