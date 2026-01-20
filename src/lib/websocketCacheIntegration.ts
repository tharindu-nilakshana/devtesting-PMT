/**
 * WebSocket Cache Integration
 * 
 * Helpers to update the API cache when WebSocket messages arrive.
 * This keeps cached widget data in sync with real-time updates.
 * 
 * Usage in your WebSocket handler:
 * 
 * ```typescript
 * import { updateWidgetCache } from '@/lib/websocketCacheIntegration';
 * 
 * socket.on('message', (event) => {
 *   const data = JSON.parse(event.data);
 *   
 *   switch(data.type) {
 *     case 'dmx-positioning':
 *       updateWidgetCache('dmx-positioning', data.payload);
 *       break;
 *     case 'cot-positioning':
 *       updateWidgetCache('cot-positioning', data.payload);
 *       break;
 *   }
 * });
 * ```
 */

import { cachedFetch } from './cachedFetch';

// Map widget types to their API URL patterns
const widgetUrlPatterns: Record<string, RegExp> = {
  // Central Banks
  'central-banks': /\/api\/central-banks/,
  
  // COT widgets
  'cot-history-chart': /\/api\/cot\/cot-history-chart/,
  'cot-history-table': /\/api\/cot\/cot-history-table/,
  'cot-positioning': /\/api\/cot\/cot-positioning/,
  
  // Economic Data
  'event-calendar': /\/api\/economic-data\/event-calendar/,
  
  // Heatmaps
  'currency-strength': /\/api\/heatmaps\/currency-strength/,
  
  // News widgets
  'latest-stories': /\/api\/news\/latest-stories/,
  'news-sentiment': /\/api\/news\/news-sentiment/,
  'realtime-news-ticker': /\/api\/news\/realtime-news-ticker/,
  'trending-topics': /\/api\/news\/trending-topics/,
  'news-dashboard': /\/api\/news\/dashboard/,
  
  // Retail Sentiment / DMX widgets
  'dmx-chart': /\/api\/retail-sentiment\/dmx-chart/,
  'dmx-open-interest': /\/api\/retail-sentiment\/dmx-open-interest/,
  'dmx-overview': /\/api\/retail-sentiment\/dmx-overview/,
  'dmx-positioning': /\/api\/retail-sentiment\/dmx-positioning/,
  'dmx-statistics-table': /\/api\/retail-sentiment\/dmx-statistics-table/,
  
  // Seasonality widgets
  'seasonality-forecast': /\/api\/seasonality\/seasonality-forecast/,
  'seasonality-forecast-chart': /\/api\/seasonality\/seasonality-forecast-chart/,
  'seasonality-forecast-table': /\/api\/seasonality\/seasonality-forecast-table/,
  'seasonality-performance-chart': /\/api\/seasonality\/seasonality-performance-chart/,
  'seasonality-performance-table': /\/api\/seasonality\/seasonality-performance-table/,
};

/**
 * Update cache for a specific widget type with new data from WebSocket
 */
export function updateWidgetCache(widgetType: string, data: unknown): void {
  const pattern = widgetUrlPatterns[widgetType];
  if (pattern) {
    cachedFetch.update(pattern, data);
    console.log(`🔄 [WebSocket→Cache] Updated ${widgetType}`);
  } else {
    console.warn(`⚠️ [WebSocket→Cache] Unknown widget type: ${widgetType}`);
  }
}

/**
 * Merge WebSocket update into existing cached data
 */
export function mergeWidgetCache(
  widgetType: string, 
  updateFn: (existingData: unknown) => unknown
): void {
  const pattern = widgetUrlPatterns[widgetType];
  if (pattern) {
    cachedFetch.merge(pattern, updateFn);
  }
}

/**
 * Invalidate cache for a specific widget type
 */
export function invalidateWidgetCache(widgetType: string): void {
  const pattern = widgetUrlPatterns[widgetType];
  if (pattern) {
    cachedFetch.invalidateByPattern(pattern);
  }
}

/**
 * Invalidate all widget caches
 */
export function invalidateAllWidgetCaches(): void {
  cachedFetch.clear();
}

/**
 * Get current cache statistics
 */
export function getCacheStats(): { size: number; urls: string[] } {
  return cachedFetch.getStats();
}
