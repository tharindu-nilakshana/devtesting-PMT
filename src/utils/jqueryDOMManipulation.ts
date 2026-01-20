/**
 * jQuery DOM Manipulation for Risk Sentiment Widget
 * 
 * This module provides jQuery-based DOM manipulation functions that mirror
 * React state management, allowing for gradual migration to jQuery patterns
 * while maintaining backward compatibility.
 */

// jQuery DOM manipulation functions for Risk Sentiment widget
export interface RiskSentimentData {
  data: Array<{
    id: number;
    timestamp: string;
    sentiment_value: number;
    sentiment_name: string;
    current_region: string;
    description: string;
    isFallbackData?: boolean;
  }>;
  latestRecord: {
    id: number;
    timestamp: string;
    sentiment_value: number;
    sentiment_name: string;
    current_region: string;
    description: string;
    isFallbackData?: boolean;
  } | null;
  loading: boolean;
  error: string | null;
}

/**
 * Update widget content using jQuery DOM manipulation
 * This mirrors React state updates but uses direct DOM manipulation
 */
export function updateWidgetContent(wgid: string, data: RiskSentimentData, widgetType: 'risk_sentiment' | 'risk_indicator'): void {
  console.log('🔄 [jQueryDOM] Updating widget content:', { wgid, widgetType });
  
  try {
    const widgetElement = document.getElementById(`risk-sentiment-widget-${wgid}`);
    if (!widgetElement) {
      console.warn('⚠️ [jQueryDOM] Widget element not found:', wgid);
      return;
    }

    if (widgetType === 'risk_indicator') {
      updateRiskIndicatorContent(widgetElement, data);
    } else {
      updateRiskSentimentContent(widgetElement, data);
    }
    
    console.log('✅ [jQueryDOM] Widget content updated successfully');
  } catch (error) {
    console.error('❌ [jQueryDOM] Error updating widget content:', error);
  }
}

/**
 * Update Risk Indicator content using jQuery DOM manipulation
 */
function updateRiskIndicatorContent(widgetElement: HTMLElement, data: RiskSentimentData): void {
  const { latestRecord, loading, error } = data;
  
  // Update loading state
  if (loading) {
    widgetElement.innerHTML = `
      <div class="w-full flex flex-col bg-black" style="height: 380px;">
        <div class="px-4 py-3 border-b border-neutral-700 bg-neutral-800">
          <div class="flex items-center justify-between">
            <h3 class="text-white font-semibold">Risk Indicator</h3>
            <div class="flex items-center gap-2">
              <div class="w-4 h-4 bg-neutral-600 rounded"></div>
              <div class="w-4 h-4 bg-neutral-600 rounded"></div>
              <div class="w-4 h-4 bg-neutral-600 rounded"></div>
            </div>
          </div>
        </div>
        <div class="flex-1 flex items-center justify-center p-4 bg-black">
          <div class="text-white text-lg">Loading...</div>
        </div>
        
        <!-- Bottom Status Bar -->
        <div class="bg-green-600 text-white p-3 text-center">
          <div class="text-sm font-medium">Loading...</div>
        </div>
      </div>
    `;
    return;
  }
  
  // Update error state
  if (error) {
    widgetElement.innerHTML = `
      <div class="w-full flex flex-col bg-black" style="height: 380px;">
        <div class="px-4 py-3 border-b border-neutral-700 bg-neutral-800">
          <div class="flex items-center justify-between">
            <h3 class="text-white font-semibold">Risk Indicator</h3>
            <div class="flex items-center gap-2">
              <div class="w-4 h-4 bg-neutral-600 rounded"></div>
              <div class="w-4 h-4 bg-neutral-600 rounded"></div>
              <div class="w-4 h-4 bg-neutral-600 rounded"></div>
            </div>
          </div>
        </div>
        <div class="flex-1 flex items-center justify-center p-4 bg-black">
          <div class="text-red-400 text-lg">Error: ${error}</div>
        </div>
        
        <!-- Bottom Status Bar -->
        <div class="bg-green-600 text-white p-3 text-center">
          <div class="text-sm font-medium">Error occurred</div>
        </div>
      </div>
    `;
    return;
  }
  
  // Update normal content
  if (latestRecord) {
    const sentimentColor = getSentimentColor(latestRecord.sentiment_value);
    const sentimentIcon = getSentimentIcon(latestRecord.sentiment_value);
    const activeRegion = getActiveMarketSession();
    
    widgetElement.innerHTML = `
      <div class="w-full flex flex-col bg-black" style="height: 380px;">
        <div class="px-4 py-3 border-b border-neutral-700 bg-neutral-800">
          <div class="flex items-center justify-between">
            <h3 class="text-white font-semibold">Risk Indicator</h3>
            <div class="flex items-center gap-2">
              <div class="w-4 h-4 bg-neutral-600 rounded"></div>
              <div class="w-4 h-4 bg-neutral-600 rounded"></div>
              <div class="w-4 h-4 bg-neutral-600 rounded"></div>
            </div>
          </div>
        </div>
        
        <div class="flex-1 flex items-center justify-center p-4 bg-black">
          <div class="px-16 py-12 rounded-xl flex items-center gap-8 shadow-lg" style="background-color: ${sentimentColor};">
            <div class="text-white">
              ${renderSentimentIcon(sentimentIcon)}
            </div>
            <div class="text-white font-bold text-3xl">
              ${latestRecord.sentiment_name.toUpperCase()}
            </div>
          </div>
        </div>
        
        <!-- Bottom Status Bar -->
        <div class="bg-green-600 text-white p-3 text-center">
          <div class="text-sm font-medium">
            Current Session: ${activeRegion} Last Updated On: ${formatTimestamp(latestRecord.timestamp)}
          </div>
        </div>
      </div>
    `;
  }
}

/**
 * Update Risk Sentiment content using jQuery DOM manipulation
 */
function updateRiskSentimentContent(widgetElement: HTMLElement, data: RiskSentimentData): void {
  const { latestRecord, loading, error } = data;
  
  // Update loading state
  if (loading) {
    widgetElement.innerHTML = `
      <div class="w-full flex flex-col bg-gray-900" style="height: 400px;">
        <div class="px-4 py-3 border-b border-gray-700 bg-gray-800">
          <div class="flex items-center justify-between">
            <h3 class="text-white font-semibold">Risk Sentiment</h3>
            <div class="flex items-center gap-2">
              <div class="w-4 h-4 bg-gray-600 rounded"></div>
              <div class="w-4 h-4 bg-gray-600 rounded"></div>
              <div class="w-4 h-4 bg-gray-600 rounded"></div>
            </div>
          </div>
        </div>
        <div class="flex-1 flex items-center justify-center p-4 bg-gray-900">
          <div class="text-white text-lg">Loading...</div>
        </div>
      </div>
    `;
    return;
  }
  
  // Update error state
  if (error) {
    widgetElement.innerHTML = `
      <div class="w-full flex flex-col bg-gray-900" style="height: 400px;">
        <div class="px-4 py-3 border-b border-gray-700 bg-gray-800">
          <div class="flex items-center justify-between">
            <h3 class="text-white font-semibold">Risk Sentiment</h3>
            <div class="flex items-center gap-2">
              <div class="w-4 h-4 bg-gray-600 rounded"></div>
              <div class="w-4 h-4 bg-gray-600 rounded"></div>
              <div class="w-4 h-4 bg-gray-600 rounded"></div>
            </div>
          </div>
        </div>
        <div class="flex-1 flex items-center justify-center p-4 bg-gray-900">
          <div class="text-red-400 text-lg">Error: ${error}</div>
        </div>
      </div>
    `;
    return;
  }
  
  // Update normal content with charts
  if (latestRecord) {
    const sentimentDescription = getSentimentDescription(latestRecord.sentiment_value);
    
    widgetElement.innerHTML = `
      <div class="w-full flex flex-col bg-gray-900" style="height: 400px;">
        <div class="px-4 py-3 border-b border-gray-700 bg-gray-800">
          <div class="flex items-center justify-between">
            <h3 class="text-white font-semibold">Risk Sentiment</h3>
            <div class="flex items-center gap-2">
              <div class="w-4 h-4 bg-gray-600 rounded"></div>
              <div class="w-4 h-4 bg-gray-600 rounded"></div>
              <div class="w-4 h-4 bg-gray-600 rounded"></div>
            </div>
          </div>
        </div>
        
        <div class="flex-1 flex bg-gray-900">
          <!-- Radar Chart Container -->
          <div class="flex-[2] p-2 relative" style="height: 66.7%;">
            <div id="radar-chart-${widgetElement.id}" class="w-full h-full"></div>
          </div>
          
          <!-- Bar Chart Container -->
          <div class="flex-[1] p-2 relative" style="height: 33.3%;">
            <div id="bar-chart-${widgetElement.id}" class="w-full h-full"></div>
          </div>
        </div>
        
        <!-- Description -->
        <div class="p-3 rounded-lg border-2" style="background-color: #4A2C17; border-color: #FF8C00; color: #FFE4B5;">
          <div class="flex items-start gap-2">
            <div class="w-3 h-3 rounded-full flex-shrink-0 mt-1" style="background-color: #FF8C00;"></div>
            <div class="text-sm font-medium">${sentimentDescription}</div>
          </div>
        </div>
      </div>
    `;
  }
}

/**
 * Helper functions (imported from riskSentiment.ts)
 */
function getSentimentColor(sentimentValue: number): string {
  if (sentimentValue >= 35) return '#004D00';
  if (sentimentValue >= 0) return '#1A8C1A';
  if (sentimentValue >= -35) return '#FF9800';
  if (sentimentValue >= -70) return '#CC6600';
  return '#800000';
}

function getSentimentIcon(sentimentValue: number): string {
  if (sentimentValue >= 35) return 'TriangleAlert';
  if (sentimentValue >= 0) return 'TriangleAlert';
  if (sentimentValue >= -35) return 'Scale';
  if (sentimentValue >= -70) return 'TrendingDown';
  return 'TrendingDown';
}

function getSentimentDescription(sentimentValue: number): string {
  if (sentimentValue >= 35) return 'Market showing strong risk-on sentiment with significant buying pressure.';
  if (sentimentValue >= 0) return 'Market showing risk-on sentiment with moderate buying pressure.';
  if (sentimentValue >= -35) return 'Market stabilising in neutral territory with balanced sentiment.';
  if (sentimentValue >= -70) return 'Market showing signs of risk-off sentiment with moderate selling pressure.';
  return 'Market showing strong risk-off sentiment with significant selling pressure.';
}

function getActiveMarketSession(): string {
  const now = new Date();
  const hour = now.getHours();
  
  if (hour >= 0 && hour < 8) return 'Asian';
  if (hour >= 8 && hour < 16) return 'European';
  return 'US';
}

function formatTimestamp(timestamp: string): string {
  // Use consistent formatting to avoid hydration mismatch
  const date = new Date(timestamp);
  return date.toLocaleString('en-US', { 
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit', 
    minute: '2-digit',
    second: '2-digit',
    hour12: false 
  });
}

function renderSentimentIcon(iconName: string): string {
  const iconMap: { [key: string]: string } = {
    'TriangleAlert': '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    'Scale': '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M3 12h18"/><path d="M3 18h18"/></svg>',
    'TrendingDown': '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>'
  };
  
  return iconMap[iconName] || iconMap['Scale'];
}

/**
 * Enable jQuery DOM manipulation mode
 * This can be called to switch from React state to jQuery DOM manipulation
 */
export function enableJQueryDOMMode(wgid: string): void {
  console.log('🔄 [jQueryDOM] Enabling jQuery DOM manipulation mode for widget:', wgid);
  
  // Store the mode in global widget options
  if (typeof window !== 'undefined' && window.RiskSentimentWidgetOptions) {
    const options = window.RiskSentimentWidgetOptions.get(wgid);
    if (options) {
      window.RiskSentimentWidgetOptions.set(wgid, {
        ...options,
        useJQueryDOM: true
      });
    }
  }
}

/**
 * Disable jQuery DOM manipulation mode
 * This switches back to React state management
 */
export function disableJQueryDOMMode(wgid: string): void {
  console.log('🔄 [jQueryDOM] Disabling jQuery DOM manipulation mode for widget:', wgid);
  
  // Remove the mode from global widget options
  if (typeof window !== 'undefined' && window.RiskSentimentWidgetOptions) {
    const options = window.RiskSentimentWidgetOptions.get(wgid);
    if (options) {
      window.RiskSentimentWidgetOptions.set(wgid, {
        ...options,
        useJQueryDOM: false
      });
    }
  }
}

/**
 * Check if jQuery DOM manipulation mode is enabled
 */
export function isJQueryDOMModeEnabled(wgid: string): boolean {
  if (typeof window !== 'undefined' && window.RiskSentimentWidgetOptions) {
    const options = window.RiskSentimentWidgetOptions.get(wgid);
    return options?.useJQueryDOM === true;
  }
  return false;
}
