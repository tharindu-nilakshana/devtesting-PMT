// 'use client';

// import React, { useState, useEffect, useCallback } from 'react';
// import '@/styles/seasonality/SeasonalityPerformanceTableWidget/styles/dark.scss';
// import '@/styles/seasonality/SeasonalityPerformanceTableWidget/styles/light.scss';
// import { WidgetHeader } from '@/components/bloomberg-ui/WidgetHeader';
// import { WidgetSettings } from '@/components/bloomberg-ui/WidgetSettingsDialog';

// interface SeasonalityPerformanceTableWidgetProps {
//   wgid: string;
//   wght: number;
//   additionalSettings?: string;
//   templateName?: string;
//   initialData?: unknown;
//   isStandalone?: boolean;
//   onRemove?: () => void; // Close button functionality
//   onSettings?: () => void; // Settings button functionality
//   onFullscreen?: () => void; // Fullscreen functionality
//   settings?: WidgetSettings; // Widget settings from settings dialog
//   // SSR props
//   ssrInitialData?: string;
//   ssrSymbol?: string;
//   useLegacyPattern?: boolean; // Feature flag for backward compatibility
// }

// interface SeasonalityPerformanceResponse {
//   success: boolean;
//   data?: string; // HTML table content
//   meta?: {
//     symbol: string;
//     timestamp: number;
//   };
//   error?: string;
// }

// // Cache for performance data to avoid redundant API calls
// const dataCache = new Map<string, { data: string; timestamp: number; symbol: string }>();
// const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// const SeasonalityPerformanceTableWidget: React.FC<SeasonalityPerformanceTableWidgetProps> = ({
//   wgid,
//   wght,
//   additionalSettings = '',
//   templateName = 'Dashboard',
//   isStandalone = false,
//   onRemove,
//   onSettings,
//   onFullscreen,
//   settings,
//   // SSR props
//   ssrInitialData,
//   ssrSymbol,
// }) => {
//   console.log('🎯 [Seasonality Performance Table Widget] Component rendered with props:', { wgid, wght, additionalSettings, templateName, isStandalone, hasSSRData: !!ssrInitialData });
  
//   // Parse additional settings
//   const settingsParts = additionalSettings.split('|');
//   const symbol = settings?.currencies?.[0] || ssrSymbol || settingsParts[0] || 'EURUSD';
  
//   // Initialize state with SSR data for immediate rendering
//   const [htmlContent, setHtmlContent] = useState<string>(ssrInitialData || '');
//   const [currentSymbol, setCurrentSymbol] = useState(symbol);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);
  
//   // Debug log after state declarations
//   console.log('🎯 [Seasonality Performance Table Widget] Current state:', { htmlContentLength: htmlContent.length, loading, error, hasSSRData: !!ssrInitialData });
  
//   // Log client-side auth token for debugging
//   const clientToken = typeof window !== 'undefined' ? localStorage.getItem('pmt_auth_token') : null;
//   console.log('🔐 [Seasonality Performance Table Widget] Client-side auth token:', {
//     hasToken: !!clientToken,
//     tokenLength: clientToken?.length || 0,
//     tokenPreview: clientToken ? `${clientToken.substring(0, 20)}...` : 'None',
//     tokenEnd: clientToken ? `...${clientToken.substring(clientToken.length - 20)}` : 'None',
//     fullToken: clientToken || 'None'
//   });

//   // Fetch seasonality performance data
//   const fetchSeasonalityPerformanceData = useCallback(async (newSymbol: string) => {
//     console.log('🚀 [Seasonality Performance Table] Starting fetchSeasonalityPerformanceData:', { newSymbol, wgid });
    
//     // Check cache first
//     const cacheKey = `performance-${newSymbol}`;
//     const cachedData = dataCache.get(cacheKey);
    
//     if (cachedData && (Date.now() - cachedData.timestamp) < CACHE_DURATION) {
//       console.log('📦 [Seasonality Performance Table] Using cached data for:', newSymbol);
//       setHtmlContent(cachedData.data);
//       setCurrentSymbol(newSymbol);
//       return;
//     }
    
//     // Optimistic loading: don't show loading state for first 500ms
//     const loadingTimeout = setTimeout(() => setLoading(true), 500);
//     setError(null);

//     try {
//       const response = await fetch('/api/seasonality/seasonality-performance-table', {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({
//           symbol: newSymbol,
//         }),
//       });

//       if (!response.ok) {
//         throw new Error(`API request failed: ${response.status}`);
//       }

//       const result: SeasonalityPerformanceResponse = await response.json();
      
//       console.log('📊 [Seasonality Performance Table] API Response:', { 
//         success: result.success, 
//         hasData: !!result.data, 
//         dataLength: result.data?.length,
//         error: result.error,
//         meta: result.meta
//       });
      
//       if (!result.success) {
//         throw new Error(result.error || 'Failed to fetch seasonality performance data');
//       }

//       if (result.data) {
//         console.log('✅ [Seasonality Performance Table] Setting data:', { 
//           dataLength: result.data.length,
//           symbol: newSymbol
//         });
        
//         // Cache the data
//         dataCache.set(cacheKey, {
//           data: result.data,
//           timestamp: Date.now(),
//           symbol: newSymbol
//         });
        
//         setHtmlContent(result.data);
//         setCurrentSymbol(newSymbol);
//       } else {
//         console.log('❌ [Seasonality Performance Table] No data in response');
//         setError('No data received from server');
//       }

//     } catch (err) {
//       console.error('❌ [Seasonality Performance Table] Error fetching data:', err);
//       setError(err instanceof Error ? err.message : 'Failed to fetch data');
//     } finally {
//       clearTimeout(loadingTimeout);
//       setLoading(false);
//     }
//   }, [wgid]);

//   // Prefetch popular symbols data
//   const prefetchPopularSymbols = useCallback(() => {
//     const popularSymbols = ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD'];
//     popularSymbols.forEach(symbol => {
//       const cacheKey = `performance-${symbol}`;
//       const cachedData = dataCache.get(cacheKey);
      
//       if (!cachedData || (Date.now() - cachedData.timestamp) > CACHE_DURATION) {
//         // Prefetch in background
//         fetch('/api/seasonality/seasonality-performance-table', {
//           method: 'POST',
//           headers: { 'Content-Type': 'application/json' },
//           body: JSON.stringify({ symbol }),
//         })
//         .then(res => res.json())
//         .then(result => {
//           if (result.success && result.data) {
//             dataCache.set(cacheKey, {
//               data: result.data,
//               timestamp: Date.now(),
//               symbol: symbol
//             });
//             console.log('📦 [Seasonality Performance Table] Prefetched data for:', symbol);
//           }
//         })
//         .catch(err => console.log('Prefetch failed for:', symbol, err));
//       }
//     });
//   }, []);

//   // Component mount/unmount tracking
//   useEffect(() => {
//     console.log('🆕 [Seasonality Performance Table] Component mounted:', { wgid, symbol });
    
//     // Prefetch popular symbols after a short delay
//     const prefetchTimeout = setTimeout(prefetchPopularSymbols, 1000);
    
//     return () => {
//       console.log('🗑️ [Seasonality Performance Table] Component unmounting:', { wgid, symbol });
//       clearTimeout(prefetchTimeout);
//     };
//   }, [wgid, symbol, prefetchPopularSymbols]);

//   // Initial data load - only fetch if no SSR data or if parameters changed from SSR values
//   useEffect(() => {
//     console.log('🔄 [Seasonality Performance Table] useEffect triggered for initial load:', { symbol, wgid, hasSSRData: !!ssrInitialData });
    
//     // Only clear state and fetch if no SSR data, or if parameters changed from SSR values
//     if (!ssrInitialData || 
//         (ssrSymbol && symbol !== ssrSymbol)) {
//       console.log('🔄 [Seasonality Performance Table] No SSR data or parameters changed, fetching data');
//       setHtmlContent('');
//       fetchSeasonalityPerformanceData(symbol);
//     } else {
//       console.log('🔄 [Seasonality Performance Table] Using SSR data, skipping initial fetch');
//     }
//   }, [symbol, fetchSeasonalityPerformanceData, ssrInitialData, ssrSymbol, wgid]);

//   // Watch for settings changes and reload data when symbol changes
//   useEffect(() => {
//     const newSymbol = settings?.currencies?.[0];
//     if (newSymbol && newSymbol !== currentSymbol) {
//       fetchSeasonalityPerformanceData(newSymbol);
//     }
//   }, [settings?.currencies, currentSymbol, fetchSeasonalityPerformanceData]);

//   return (
//     <div className="seasonality-performance-table-widget w-full h-full flex flex-col border border-border rounded overflow-hidden">
//       {/* Header - Bloomberg Style */}
//       <WidgetHeader
//         title={
//           <span>
//             Seasonality Performance Table <span style={{ color: '#f97316' }}>[{currentSymbol}]</span>
//           </span>
//         }
//         onRemove={onRemove}
//         onSettings={onSettings}
//         onFullscreen={onFullscreen}
//         helpContent="Displays seasonal performance data showing historical patterns and statistics for forex pairs. Shows performance metrics, win rates, and seasonal trends to help identify the best trading periods."
//       >
//         {/* Status Indicators */}
//         <div className="flex items-center gap-2 mr-2">
//           {ssrInitialData && (
//             <span className="text-xs text-green-400 bg-green-400/10 px-2 py-1 rounded">
//               SSR
//             </span>
//           )}
//           {loading && <div className="text-xs sp-text-secondary">Loading…</div>}
//           {error && <div className="text-xs text-red-400">{error}</div>}
//         </div>
//       </WidgetHeader>

//       {/* Table Container */}
//       <div className="flex-1 overflow-auto p-4">
//         <div className="sp-container">
//           {htmlContent ? (
//             <div>
//               <table className="sp-table table table-striped table-noborder w-full text-base">
//                 <tbody dangerouslySetInnerHTML={{ __html: htmlContent }} />
//               </table>
//             </div>
//           ) : loading ? (
//             // Skeleton loading state
//             <div className="space-y-2">
//               {[...Array(8)].map((_, i) => (
//                 <div key={i} className="flex space-x-4 animate-pulse">
//                   <div className="h-4 sp-loading-skeleton rounded flex-1"></div>
//                   <div className="h-4 sp-loading-skeleton rounded w-16"></div>
//                   <div className="h-4 sp-loading-skeleton rounded w-20"></div>
//                 </div>
//               ))}
//             </div>
//           ) : (
//             <div className="text-center py-8 sp-text-secondary">
//               {error ? 'Failed to load performance data' : 'No performance data available'}
//             </div>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// };

// export default SeasonalityPerformanceTableWidget;

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import '@/styles/seasonality/SeasonalityPerformanceTableWidget/styles/dark.scss';
import '@/styles/seasonality/SeasonalityPerformanceTableWidget/styles/light.scss';
import { WidgetHeader } from '@/components/bloomberg-ui/WidgetHeader';
import { WidgetSettings } from '@/components/bloomberg-ui/WidgetSettingsSlideIn';
import { useTranslation } from 'react-i18next';
import { widgetDataCache } from '@/lib/widgetDataCache';
import { getSymbolShortFormat } from '@/utils/symbolMapping';

interface SeasonalityPerformanceTableWidgetProps {
  wgid: string;
  wght: number;
  additionalSettings?: string;
  templateName?: string;
  initialData?: unknown;
  isStandalone?: boolean;
  onRemove?: () => void; // Close button functionality
  onSettings?: () => void; // Settings button functionality
  onFullscreen?: () => void; // Fullscreen functionality
  settings?: WidgetSettings; // Widget settings from settings dialog
  // SSR props
  ssrInitialData?: string;
  ssrSymbol?: string;
  useLegacyPattern?: boolean; // Feature flag for backward compatibility
}

interface SeasonalityPerformanceResponse {
  success: boolean;
  data?: string; // HTML table content
  meta?: {
    symbol: string;
    timestamp: number;
  };
  error?: string;
}

const SeasonalityPerformanceTableWidget: React.FC<SeasonalityPerformanceTableWidgetProps> = ({
  wgid,
  wght,
  additionalSettings = '',
  templateName = 'Dashboard',
  isStandalone = false,
  onRemove,
  onSettings,
  onFullscreen,
  settings,
  // SSR props
  ssrInitialData,
  ssrSymbol,
}) => {
  const { t } = useTranslation();
  console.log('🎯 [Seasonality Performance Table Widget] Component rendered with props:', { wgid, wght, additionalSettings, templateName, isStandalone, hasSSRData: !!ssrInitialData });
  
  // Helper function to determine heatmap color based on percentage value
  const getHeatmapClass = useCallback((value: string): string => {
    if (!value || value === '-' || value === 'N/A') return 'heat-no-data';
    
    // Extract numeric value from string (e.g., "1.50%" -> 1.50)
    const numericValue = parseFloat(value.replace('%', '').replace(/[^\d.-]/g, ''));
    
    if (isNaN(numericValue)) return 'heat-no-data';
    
    const absValue = Math.abs(numericValue);
    
    if (numericValue > 0) {
      // Green shades for positive values
      if (absValue >= 3) return 'heat-very-strong-positive';  // Very strong positive
      if (absValue >= 2) return 'heat-strong-positive';       // Strong positive
      if (absValue >= 1) return 'heat-medium-positive';       // Medium positive
      if (absValue >= 0.5) return 'heat-light-positive';      // Light positive
      return 'heat-very-light-positive';                      // Very light positive
    } else {
      // Red/Pink shades for negative values
      if (absValue >= 3) return 'heat-very-strong-negative';  // Very strong negative
      if (absValue >= 2) return 'heat-strong-negative';       // Strong negative
      if (absValue >= 1) return 'heat-medium-negative';       // Medium negative
      if (absValue >= 0.5) return 'heat-light-negative';      // Light negative
      return 'heat-very-light-negative';                      // Very light negative
    }
  }, []);

  // Process HTML content to add heatmap classes and arrow icons
  const processHtmlWithHeatmap = useCallback((html: string): string => {
    if (!html) return '';
    
    // SVG arrow icons - exact lucide-react TrendingUp and TrendingDown paths
    // TrendingUp: upward trending line with arrow (matches lucide-react TrendingUp)
    const arrowUpSvg = '<svg class="sp-arrow-icon" data-arrow="up" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: inline-block; vertical-align: middle; margin-right: 4px; flex-shrink: 0;"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline><polyline points="16 7 22 7 22 13"></polyline></svg>';
    // TrendingDown: downward trending line with arrow (matches lucide-react TrendingDown)
    const arrowDownSvg = '<svg class="sp-arrow-icon" data-arrow="down" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: inline-block; vertical-align: middle; margin-right: 4px; flex-shrink: 0;"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline><polyline points="17 18 23 18 23 12"></polyline></svg>';
    
    // Parse HTML and add data attributes for styling
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<table>${html}</table>`, 'text/html');
    const rows = doc.querySelectorAll('tr');
    
    rows.forEach((row, rowIndex) => {
      const cells = row.querySelectorAll('td, th');
      
      // Process header row (first row) - make it bold and white
      if (rowIndex === 0) {
        cells.forEach((cell) => {
          cell.style.fontWeight = 'bold';
          cell.style.color = '#ffffff';
        });
        return;
      }
      
      cells.forEach((cell, cellIndex) => {
        // Make first column (month names) bold
        if (cellIndex === 0) {
          cell.style.fontWeight = 'bold';
          cell.style.textAlign = 'left';
          return;
        }
        
        const cellText = cell.textContent?.trim() || '';
        const heatClass = getHeatmapClass(cellText);
        cell.setAttribute('data-heat', heatClass.replace('heat-', ''));
        cell.classList.add(heatClass);
        
        // Extract numeric value and add arrow icon
        if (cellText && cellText !== '-' && cellText !== 'N/A') {
          const numericValue = parseFloat(cellText.replace('%', '').replace(/[^\d.-]/g, ''));
          if (!isNaN(numericValue) && numericValue !== 0) {
            // Get current cell HTML
            const currentHtml = cell.innerHTML;
            // Add arrow icon before the text
            const arrowSvg = numericValue > 0 ? arrowUpSvg : arrowDownSvg;
            cell.innerHTML = arrowSvg + currentHtml;
          }
        }
      });
    });
    
    return doc.querySelector('table')?.innerHTML || html;
  }, [getHeatmapClass]);
  
  // Helper function to validate symbol - filter out invalid values like "selectAll"
  const validateSymbol = useCallback((sym: string | undefined | null): string => {
    if (!sym || sym === 'selectAll' || sym === 'selectall' || sym === 'Select All' || sym.trim() === '') {
      return 'EURUSD'; // Default fallback
    }
    return sym;
  }, []);
  
  // Parse additional settings
  const settingsParts = additionalSettings.split('|');
  const rawSymbol = (settings?.symbol as string) || ssrSymbol || settingsParts[0] || 'EURUSD';
  // Filter out invalid values like "selectAll" - compute once correctly
  const symbol = React.useMemo(() => {
    return validateSymbol(rawSymbol) || validateSymbol(ssrSymbol) || validateSymbol(settingsParts[0]) || 'EURUSD';
  }, [rawSymbol, ssrSymbol, settingsParts[0]]);
  
  // Process SSR data with heatmap on initial load
  const processedSSRData = React.useMemo(() => {
    if (ssrInitialData && typeof window !== 'undefined') {
      return processHtmlWithHeatmap(ssrInitialData);
    }
    return ssrInitialData || '';
  }, [ssrInitialData, processHtmlWithHeatmap]);
  
  // Initialize state with processed SSR data for immediate rendering
  const [htmlContent, setHtmlContent] = useState<string>(processedSSRData);
  // Use the properly computed symbol for initial state
  const [currentSymbol, setCurrentSymbol] = useState(symbol);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedDataRef = React.useRef<boolean>(false);
  const isLoadingRef = React.useRef<boolean>(false);
  
  // Debug log after state declarations
  console.log('🎯 [Seasonality Performance Table Widget] Current state:', { htmlContentLength: htmlContent.length, loading, error, hasSSRData: !!ssrInitialData });
  
  // Log client-side auth token for debugging
  const clientToken = typeof window !== 'undefined' ? localStorage.getItem('pmt_auth_token') : null;
  console.log('🔐 [Seasonality Performance Table Widget] Client-side auth token:', {
    hasToken: !!clientToken,
    tokenLength: clientToken?.length || 0,
    tokenPreview: clientToken ? `${clientToken.substring(0, 20)}...` : 'None',
    tokenEnd: clientToken ? `...${clientToken.substring(clientToken.length - 20)}` : 'None',
    fullToken: clientToken || 'None'
  });

  // Fetch seasonality performance data
  const fetchSeasonalityPerformanceData = useCallback(async (newSymbol: string) => {
    console.log('🚀 [Seasonality Performance Table] Starting fetchSeasonalityPerformanceData:', { newSymbol, wgid });
    
    // Prevent duplicate calls
    if (isLoadingRef.current) {
      console.log('⏭️ [Seasonality Performance Table] Already loading, skipping duplicate call');
      return;
    }
    
    // Check cache first
    const cacheKey = widgetDataCache.generateKey('seasonality-performance-table', { symbol: newSymbol });
    const cachedData = widgetDataCache.get<string>(cacheKey);
    
    if (cachedData) {
      console.log('📦 [Seasonality Performance Table] Using cached data for:', newSymbol);
      setHtmlContent(cachedData);
      setCurrentSymbol(newSymbol);
      hasLoadedDataRef.current = true;
      return;
    }
    
    // Optimistic loading: don't show loading state for first 500ms
    const loadingTimeout = setTimeout(() => setLoading(true), 500);
    setError(null);
    isLoadingRef.current = true;

    try {
      const response = await fetch('/api/seasonality/seasonality-performance-table', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          symbol: newSymbol,
        }),
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const result: SeasonalityPerformanceResponse = await response.json();
      
      console.log('📊 [Seasonality Performance Table] API Response:', { 
        success: result.success, 
        hasData: !!result.data, 
        dataLength: result.data?.length,
        error: result.error,
        meta: result.meta
      });
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch seasonality performance data');
      }

      if (result.data) {
        console.log('✅ [Seasonality Performance Table] Setting data:', { 
          dataLength: result.data.length,
          symbol: newSymbol
        });
        
        // Process HTML with heatmap classes
        const processedHtml = processHtmlWithHeatmap(result.data);
        
        // Cache the processed data
        widgetDataCache.set(cacheKey, processedHtml);
        
        setHtmlContent(processedHtml);
        setCurrentSymbol(newSymbol);
        hasLoadedDataRef.current = true;
      } else {
        console.log('❌ [Seasonality Performance Table] No data in response');
        setError('No data received from server');
      }

    } catch (err) {
      console.error('❌ [Seasonality Performance Table] Error fetching data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      clearTimeout(loadingTimeout);
      setLoading(false);
      isLoadingRef.current = false;
    }
  }, [wgid, processHtmlWithHeatmap]);

  // Prefetch popular symbols data
  // Prefetch disabled to avoid multiple API calls on page load
  // const prefetchPopularSymbols = useCallback(() => {
  //   const popularSymbols = ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD'];
  //   popularSymbols.forEach(symbol => {
  //     const cacheKey = widgetDataCache.generateKey('seasonality-performance-table', { symbol });
  //     const cachedData = widgetDataCache.get<string>(cacheKey);
  //     
  //     if (!cachedData) {
  //       // Prefetch in background
  //       fetch('/api/seasonality/seasonality-performance-table', {
  //         method: 'POST',
  //         headers: { 'Content-Type': 'application/json' },
  //         body: JSON.stringify({ symbol }),
  //       })
  //       .then(res => res.json())
  //       .then(result => {
  //         if (result.success && result.data) {
  //           const processedHtml = processHtmlWithHeatmap(result.data);
  //           widgetDataCache.set(cacheKey, processedHtml);
  //           console.log('📦 [Seasonality Performance Table] Prefetched data for:', symbol);
  //         }
  //       })
  //       .catch(err => console.log('Prefetch failed for:', symbol, err));
  //     }
  //   });
  // }, []);

  // Component mount/unmount tracking
  useEffect(() => {
    console.log('🆕 [Seasonality Performance Table] Component mounted:', { wgid, currentSymbol });
    
    return () => {
      console.log('🗑️ [Seasonality Performance Table] Component unmounting:', { wgid, currentSymbol });
    };
  }, [wgid]);
  // Only run once on mount, wgid should never change

  // Initial data load - only fetch if no SSR data or if parameters changed from SSR values
  useEffect(() => {
    console.log('🔄 [Seasonality Performance Table] useEffect triggered for initial load:', { currentSymbol, wgid, hasSSRData: !!ssrInitialData, hasLoadedData: hasLoadedDataRef.current });
    
    // Skip if already loaded data
    if (hasLoadedDataRef.current) {
      console.log('🔄 [Seasonality Performance Table] Data already loaded, skipping');
      return;
    }
    
    // Only clear state and fetch if no SSR data, or if parameters changed from SSR values
    if (!ssrInitialData || 
        (ssrSymbol && currentSymbol !== ssrSymbol)) {
      console.log('🔄 [Seasonality Performance Table] No SSR data or parameters changed, fetching data');
      setHtmlContent('');
      fetchSeasonalityPerformanceData(currentSymbol);
    } else {
      console.log('🔄 [Seasonality Performance Table] Using SSR data, skipping initial fetch');
      hasLoadedDataRef.current = true;
    }
  // Only run on mount - currentSymbol is computed from props and won't change unexpectedly
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Watch for settings changes and reload data when symbol changes
  useEffect(() => {
    const newSymbol = (settings?.symbol as string);
    
    // Only update if we have a new valid symbol that's different from current
    if (newSymbol && newSymbol !== currentSymbol && newSymbol !== 'selectAll' && newSymbol !== 'selectall' && newSymbol !== 'Select All') {
      const validatedNewSymbol = validateSymbol(newSymbol);
      if (validatedNewSymbol !== currentSymbol) {
        console.log('🔄 [Seasonality Performance Table] Settings changed symbol from', currentSymbol, 'to', validatedNewSymbol);
        hasLoadedDataRef.current = false; // Reset to allow new load
        setCurrentSymbol(validatedNewSymbol);
        fetchSeasonalityPerformanceData(validatedNewSymbol);
      }
    }
  }, [settings?.symbol, currentSymbol, validateSymbol, fetchSeasonalityPerformanceData]);

  return (
    <div className="seasonality-performance-table-widget w-full h-full flex flex-col border border-border rounded-none overflow-hidden">
      {/* Header - Bloomberg Style */}
      <WidgetHeader
        title={
          <span>
            Seasonality Performance <span className="text-muted-foreground">|</span> <span className="text-primary">[{getSymbolShortFormat(validateSymbol(currentSymbol) || 'EURUSD')}]</span>
          </span>
        }
        widgetName="Seasonality Performance Table"
        onRemove={onRemove}
        onSettings={onSettings}
        onFullscreen={onFullscreen}
        helpContent="Historical seasonality performance showing monthly returns across multiple years. Heat map colors indicate performance strength - green for positive returns, red for negative. Use this to identify seasonal patterns and trends."
      >
        {/* Status Indicators */}
        <div className="flex items-center gap-2 mr-2">
          {ssrInitialData && (
            <span className="text-xs text-green-400 bg-green-400/10 px-2 py-1 rounded">
              SSR
            </span>
          )}
          {loading && <div className="text-xs sp-text-secondary">Loading…</div>}
          {error && <div className="text-xs text-red-400">{error}</div>}
        </div>
      </WidgetHeader>

      {/* Table Container */}
      <div className="flex-1 overflow-auto">
        <div className="sp-container">
          {htmlContent ? (
            <div className="seasonality-heatmap">
              <table className="sp-table w-full border-collapse">
                <tbody dangerouslySetInnerHTML={{ __html: htmlContent }} />
              </table>
            </div>
          ) : loading ? (
            // Skeleton loading state
            <div className="space-y-2">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="flex space-x-4 animate-pulse">
                  <div className="h-4 sp-loading-skeleton rounded flex-1"></div>
                  <div className="h-4 sp-loading-skeleton rounded w-16"></div>
                  <div className="h-4 sp-loading-skeleton rounded w-20"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 sp-text-secondary">
              {error ? 'Failed to load performance data' : 'No performance data available'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SeasonalityPerformanceTableWidget;