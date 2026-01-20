/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createChart, ColorType, type IChartApi, type ISeriesApi, type Time } from 'lightweight-charts';
import { fetchSeasonalityForecastChart, type SeasonalityForecastChartResponse } from './api';
import '@/styles/seasonality/SeasonalityForecastChartWidget/styles/dark.scss';
import '@/styles/seasonality/SeasonalityForecastChartWidget/styles/light.scss';
import { WidgetHeader } from '@/components/bloomberg-ui/WidgetHeader';
import { WidgetSettings } from '@/components/bloomberg-ui/WidgetSettingsSlideIn';
import { useTranslation } from 'react-i18next';
import { useDateFormat } from '@/hooks/useDateFormat';
import { widgetDataCache } from '@/lib/widgetDataCache';
import { getSymbolShortFormat } from '@/utils/symbolMapping';

type ApiResponse = SeasonalityForecastChartResponse;

interface Props {
  initialData?: ApiResponse;
  initialSymbol?: string;
  initialError?: string;
  onRemove?: () => void;
  onSettings?: () => void;
  onFullscreen?: () => void;
  onSaveSettings?: (settings: Partial<WidgetSettings>) => void;
  settings?: WidgetSettings;
}

export default function SeasonalityForecastChartWidget({
  initialData,
  initialSymbol = 'EURUSD',
  initialError,
  onRemove,
  onSettings,
  onFullscreen,
  onSaveSettings,
  settings,
}: Props) {
  const { t } = useTranslation();
  const { format: formatDate, dateFormat } = useDateFormat();
  // Ref to store format function for dynamic access in formatters (avoids closure stale values)
  const formatDateRef = useRef(formatDate);
  formatDateRef.current = formatDate;
  const symbolFromSettings = (settings?.symbol as string) || initialSymbol;
  const initialTimeFrame = (settings?.timeframe as string) || '5d';
  
  const [chartData, setChartData] = useState<ApiResponse | null>(initialData || null);
  const [currentSymbol, setCurrentSymbol] = useState(symbolFromSettings);
  const [currentTimeFrame, setCurrentTimeFrame] = useState(initialTimeFrame);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(initialError || null);
  const [isSSRData, setIsSSRData] = useState(!!initialData);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  
  // Sync currentSymbol when settings change
  useEffect(() => {
    const newSymbol = (settings?.symbol as string) || initialSymbol;
    if (newSymbol !== currentSymbol) {
      setCurrentSymbol(newSymbol);
    }
  }, [settings?.symbol, initialSymbol, currentSymbol]);
  
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const futureSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const isInitializingRef = useRef<boolean>(false);
  const isMountedRef = useRef<boolean>(true);
  const initTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasLoadedDataRef = useRef<boolean>(false);
  const isLoadingRef = useRef<boolean>(false);

  // Detect theme changes
  useEffect(() => {
    const detectTheme = () => {
      const isDark = document.documentElement.classList.contains('dark');
      setTheme(isDark ? 'dark' : 'light');
    };

    detectTheme();

    const observer = new MutationObserver(detectTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);

  // Get theme-specific colors for future candles
  const getFutureCandleColors = () => {
    return theme === 'dark' 
      ? { color: '#FFFFFF', wickColor: '#FFFFFF' }
      : { color: '#000000', wickColor: '#000000' };
  };

  // Initialize chart
  const initializeChart = useCallback(() => {
    if (!isMountedRef.current || !chartContainerRef.current || isInitializingRef.current) {
      // console.log('⚠️ [SeasonalityForecastChartWidget] Cannot initialize chart:', {
      //   isMounted: isMountedRef.current,
      //   hasContainer: !!chartContainerRef.current,
      //   isInitializing: isInitializingRef.current
      // });
      return;
    }

    // Check container dimensions - wait if not ready
    const rect = chartContainerRef.current.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      // console.log('⏳ [SeasonalityForecastChartWidget] Container has no dimensions yet, retrying...', {
      //   width: rect.width,
      //   height: rect.height
      // });
      // Clear any existing timeout
      if (initTimeoutRef.current) {
        clearTimeout(initTimeoutRef.current);
      }
      // Retry after a short delay only if still mounted
      initTimeoutRef.current = setTimeout(() => {
        if (isMountedRef.current && chartContainerRef.current && !isInitializingRef.current) {
          initializeChart();
        }
      }, 100);
      return;
    }

    // console.log('🔄 [SeasonalityForecastChartWidget] Initializing chart...', {
    //   containerWidth: rect.width,
    //   containerHeight: rect.height
    // });

    isInitializingRef.current = true;

    // Clean up existing chart
    if (chartRef.current) {
      try {
        if (typeof chartRef.current.remove === 'function') {
          chartRef.current.remove();
        }
      } catch {
        /* ignore cleanup errors */
      }
      chartRef.current = null;
      seriesRef.current = null;
      futureSeriesRef.current = null;
    }

    // Reuse the rect we already got above
    const chartOptions = {
      layout: { 
        width: rect.width,
        height: rect.height, 
        textColor: '#9D9D9D', 
        background: { type: ColorType.Solid, color: 'transparent' },
        fontFamily: "Inter",
      },
      grid: {
        vertLines: { color: '#1C2227' },
        horzLines: { color: '#1C2227' },
      },
      priceScale: { position: 'right' as const },
      rightPriceScale: { visible: true },
      leftPriceScale: { visible: false },
      handleScale: {
        mouseWheel: true,
        pinch: true,
        axisPressedMouseMove: { time: true, price: true },
        axisDoubleClickReset: true
      },
      handleScroll: true,
      localization: {
        timeFormatter: (time: any) => {
          try {
            // Apply user's date format preference to crosshair/tooltip labels
            // Read from ref at call time to always get the latest value
            const date = typeof time === 'number' ? new Date(time * 1000) : new Date(time);
            return formatDateRef.current(date);
          } catch {
            // Fallback if preferences not ready
            const date = typeof time === 'number' ? new Date(time * 1000) : new Date(time);
            return date.toLocaleDateString('en-GB');
          }
        },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        tickMarkFormatter: (time: any) => {
          const date = typeof time === 'number' ? new Date(time * 1000) : new Date(time);
          return formatDateRef.current ? formatDateRef.current(date) : date.toLocaleDateString('en-GB');
        }
      },
    };

    chartRef.current = createChart(chartContainerRef.current, chartOptions);

    // Create candlestick series for historical data
    const seriesOptions = { 
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
      priceFormat: {
        type: 'price' as const,
        precision: 4,
        minMove: 0.0001,
      },
    };
    
    seriesRef.current = chartRef.current.addCandlestickSeries(seriesOptions);

    // Create candlestick series for future/prediction data (theme-aware)
    const futureColors = getFutureCandleColors();
    const futureSeriesOptions = {
      upColor: futureColors.color,
      downColor: futureColors.color,
      borderVisible: false,
      wickUpColor: futureColors.wickColor,
      wickDownColor: futureColors.wickColor,
      priceFormat: {
        type: 'price' as const,
        precision: 4,
        minMove: 0.0001,
      },
    };
    
    futureSeriesRef.current = chartRef.current.addCandlestickSeries(futureSeriesOptions);

    // Set up resize observer
    if (resizeObserverRef.current) {
      resizeObserverRef.current.disconnect();
    }

    resizeObserverRef.current = new ResizeObserver(entries => {
      if (chartRef.current && entries.length > 0 && entries[0].target === chartContainerRef.current) {
        chartRef.current.timeScale().fitContent();
        const newRect = entries[0].contentRect;
        chartRef.current.applyOptions({ height: newRect.height, width: newRect.width });
      }
    });

    resizeObserverRef.current.observe(chartContainerRef.current);
    
    isInitializingRef.current = false;
    
    console.log('✅ [SeasonalityForecastChartWidget] Chart initialized successfully', {
      hasSeries: !!seriesRef.current,
      hasFutureSeries: !!futureSeriesRef.current,
      hasChart: !!chartRef.current,
      chartWidth: rect.width,
      chartHeight: rect.height
    });
  }, []); // Only initialize once on mount

  // Update future series colors when theme changes
  useEffect(() => {
    if (futureSeriesRef.current) {
      const futureColors = getFutureCandleColors();
      futureSeriesRef.current.applyOptions({
        upColor: futureColors.color,
        downColor: futureColors.color,
        wickUpColor: futureColors.wickColor,
        wickDownColor: futureColors.wickColor,
      });
    }
  }, [theme]);

  // Force time scale to re-render when date format preference changes
  useEffect(() => {
    if (chartRef.current) {
      // Re-apply timeScale options to force tick mark re-render with new format
      chartRef.current.timeScale().applyOptions({
        tickMarkFormatter: (time: any) => {
          const date = typeof time === 'number' ? new Date(time * 1000) : new Date(time);
          return formatDateRef.current ? formatDateRef.current(date) : date.toLocaleDateString('en-GB');
        }
      });
    }
  }, [dateFormat]);

  // Update chart data
  const updateChartData = useCallback(() => {
    if (!seriesRef.current || !futureSeriesRef.current) {
      console.log('⚠️ [SeasonalityForecastChartWidget] Cannot update chart:', {
        hasSeries: !!seriesRef.current,
        hasFutureSeries: !!futureSeriesRef.current,
        hasData: !!chartData?.chartData?.length
      });
      return;
    }

    if (!chartData?.chartData?.length) {
      console.log('⚠️ [SeasonalityForecastChartWidget] No chart data available');
      return;
    }

    try {
      const historicalCount = chartData.summary?.historicalDataPoints ?? chartData.chartData.length;
      
      // First, format all data points with their times
      const formattedData = chartData.chartData.map((item, index) => {
        let timeValue: Time;
        if (chartData.category && chartData.category[index] && chartData.category[index].label) {
          const label = chartData.category[index].label;
          // Ensure date is in YYYY-MM-DD format (lightweight-charts expects this for candlestick series)
          if (/^\d{4}-\d{2}-\d{2}$/.test(label)) {
            // Already in correct format
            timeValue = label as Time;
          } else {
            // Try to parse and convert
            const date = new Date(label);
            if (!isNaN(date.getTime())) {
              const year = date.getFullYear();
              const month = String(date.getMonth() + 1).padStart(2, '0');
              const day = String(date.getDate()).padStart(2, '0');
              timeValue = `${year}-${month}-${day}` as Time;
            } else {
              console.warn('⚠️ [SeasonalityForecastChartWidget] Invalid date format:', label);
              // Fallback: use index-based date
              const baseDate = new Date('2025-01-01');
              baseDate.setDate(baseDate.getDate() + index);
              timeValue = baseDate.toISOString().split('T')[0] as Time;
            }
          }
        } else {
          // Fallback: use index-based date
          const baseDate = new Date('2025-01-01');
          baseDate.setDate(baseDate.getDate() + index);
          timeValue = baseDate.toISOString().split('T')[0] as Time;
        }

        // Validate OHLC values
        if (isNaN(item.open) || isNaN(item.high) || isNaN(item.low) || isNaN(item.close)) {
          console.warn('⚠️ [SeasonalityForecastChartWidget] Invalid OHLC values at index', index, item);
          return null;
        }

        return {
          time: timeValue,
          open: item.open,
          high: item.high,
          low: item.low,
          close: item.close,
        };
      }).filter((item): item is NonNullable<typeof item> => item !== null); // Remove null entries

      // Deduplicate by time (keep the last value for each timestamp) and sort
      const deduplicateAndSort = (data: typeof formattedData) => {
        // Use a Map to handle duplicates (keep last value for each time)
        const dataMap = new Map<string | number, typeof formattedData[0]>();
        
        data.forEach(item => {
          dataMap.set(item.time, item);
        });
        
        // Convert to array and sort by time
        return Array.from(dataMap.values()).sort((a, b) => {
          // Handle both numeric timestamps and string dates
          const timeA = typeof a.time === 'number' ? a.time : String(a.time);
          const timeB = typeof b.time === 'number' ? b.time : String(b.time);
          
          if (timeA < timeB) return -1;
          if (timeA > timeB) return 1;
          return 0;
        });
      };

      // Split into historical and future, then deduplicate and sort each separately
      const allHistorical = formattedData.slice(0, historicalCount);
      const allFuture = formattedData.slice(historicalCount);
      
      const historicalData = deduplicateAndSort(allHistorical);
      const futureData = deduplicateAndSort(allFuture);

      // Limit data to the exact number of days for the timeframe
      // Parse timeframe (e.g., "5d" -> 5, "30d" -> 30, "45d" -> 45, "90d" -> 90)
      const timeframeDays = parseInt(currentTimeFrame.replace('d', '')) || 90;
      
      // Take the most recent N days from historical data to match the timeframe
      // This ensures we show exactly the number of days requested (e.g., 90 rows for 90d)
      const limitedHistorical = historicalData.slice(-timeframeDays);

      console.log('📊 [SeasonalityForecastChartWidget] Setting chart data:', {
        timeframe: currentTimeFrame,
        timeframeDays,
        originalHistorical: allHistorical.length,
        deduplicatedHistorical: historicalData.length,
        limitedHistorical: limitedHistorical.length,
        originalFuture: allFuture.length,
        deduplicatedFuture: futureData.length,
        firstHistorical: limitedHistorical[0],
        lastHistorical: limitedHistorical[limitedHistorical.length - 1],
        firstFuture: futureData[0],
        lastFuture: futureData[futureData.length - 1]
      });

      if (limitedHistorical.length > 0) {
        seriesRef.current.setData(limitedHistorical);
        console.log('✅ [SeasonalityForecastChartWidget] Historical data set:', limitedHistorical.length);
      } else {
        console.warn('⚠️ [SeasonalityForecastChartWidget] No historical data to display');
      }

      if (futureData.length > 0) {
        futureSeriesRef.current.setData(futureData);
        console.log('✅ [SeasonalityForecastChartWidget] Future data set:', futureData.length);
      } else {
        console.warn('⚠️ [SeasonalityForecastChartWidget] No future data to display');
      }
      
      if (chartRef.current) {
        chartRef.current.timeScale().fitContent();
        console.log('✅ [SeasonalityForecastChartWidget] Chart data updated successfully');
      }
    } catch (error) {
      console.error('❌ [SeasonalityForecastChartWidget] Error updating chart data:', error);
    }
  }, [chartData, currentTimeFrame]);

  // Load new data
  const loadNewData = useCallback(async (newSymbol: string, newTimeFrame: string) => {
    console.log('🔄 [SeasonalityForecastChartWidget] Loading data:', { newSymbol, newTimeFrame });

    // Prevent duplicate calls
    if (isLoadingRef.current) {
      console.log('⏭️ [SeasonalityForecastChartWidget] Already loading, skipping duplicate call');
      return;
    }

    // Check cache first
    const cacheKey = widgetDataCache.generateKey('seasonality-forecast-chart', { symbol: newSymbol, timeFrame: newTimeFrame });
    const cachedData = widgetDataCache.get<ApiResponse>(cacheKey);
    
    if (cachedData) {
      console.log('✅ [SeasonalityForecastChartWidget] Using cached data');
      setChartData(cachedData);
      setCurrentSymbol(newSymbol);
      setCurrentTimeFrame(newTimeFrame);
      hasLoadedDataRef.current = true;
      return;
    }

    setLoading(true);
    setError(null);
    setIsSSRData(false);
    isLoadingRef.current = true;

    try {
      const res = await fetchSeasonalityForecastChart({
        symbol: newSymbol,
        baseYear: newTimeFrame,
      });

      if (res && res.success) {
        setChartData(res);
        setCurrentSymbol(newSymbol);
        setCurrentTimeFrame(newTimeFrame);
        hasLoadedDataRef.current = true;
        // Cache the result
        widgetDataCache.set(cacheKey, res);
      } else {
        setError('Failed to load chart data');
      }
    } catch (e: unknown) {
      const errorMsg = e instanceof Error ? e.message : 'Unknown error';
      console.error('❌ [SeasonalityForecastChartWidget] Error loading data:', errorMsg);
      setError(errorMsg);
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  }, []);

  const handleTimeFrameChange = (newTimeFrame: string) => {
    console.log('🔄 [SeasonalityForecastChartWidget] Timeframe changed:', { 
      from: currentTimeFrame, 
      to: newTimeFrame,
      currentSymbol 
    });
    
    if (newTimeFrame !== currentTimeFrame) {
      // Update state immediately for UI feedback
      setCurrentTimeFrame(newTimeFrame);
      // Load new data
      loadNewData(currentSymbol, newTimeFrame);
    }
  };

  // Initialize chart on mount
  useEffect(() => {
    isMountedRef.current = true;
    initializeChart();
    return () => {
      isMountedRef.current = false;
      // Clear any pending initialization timeouts
      if (initTimeoutRef.current) {
        clearTimeout(initTimeoutRef.current);
        initTimeoutRef.current = null;
      }
      if (resizeObserverRef.current) {
        try { resizeObserverRef.current.disconnect(); } catch {}
        resizeObserverRef.current = null;
      }
      if (chartRef.current) {
        try { chartRef.current.remove(); } catch {}
        chartRef.current = null;
        seriesRef.current = null;
        futureSeriesRef.current = null;
      }
      isInitializingRef.current = false;
    };
  }, [initializeChart]);

  // Date format preference changes are now handled automatically by the formatters
  // reading from preferencesRef at call time, so no separate effect is needed.

  // Load initial data if no SSR data provided
  useEffect(() => {
    if (!chartData && !hasLoadedDataRef.current) {
      loadNewData(currentSymbol, currentTimeFrame);
    }
  }, [currentSymbol, currentTimeFrame, chartData, loadNewData]);

  // Watch for settings changes and reload data when symbol changes
  useEffect(() => {
    const newSymbol = (settings?.symbol as string) || initialSymbol;
    if (newSymbol && newSymbol !== currentSymbol && !isLoadingRef.current) {
      hasLoadedDataRef.current = false; // Reset to allow new load
      setCurrentSymbol(newSymbol);
      loadNewData(newSymbol, currentTimeFrame);
    }
  }, [settings?.symbol, currentSymbol, currentTimeFrame, initialSymbol, loadNewData]);

  // Update chart when data changes - ensure chart is ready
  useEffect(() => {
    if (!chartData?.chartData?.length) {
      console.log('⏳ [SeasonalityForecastChartWidget] Waiting for chart data...');
      return;
    }

    if (!chartRef.current || !seriesRef.current || !futureSeriesRef.current) {
      // console.log('⏳ [SeasonalityForecastChartWidget] Waiting for chart initialization...', {
      //   hasChart: !!chartRef.current,
      //   hasSeries: !!seriesRef.current,
      //   hasFutureSeries: !!futureSeriesRef.current
      // });
      // Retry after a short delay
      const timer = setTimeout(() => {
        if (chartRef.current && seriesRef.current && futureSeriesRef.current && chartData?.chartData?.length > 0) {
          updateChartData();
        }
      }, 200);
      return () => clearTimeout(timer);
    }

    // Chart is ready, update data
    updateChartData();
  }, [chartData, updateChartData]);

  return (
    <div className="w-full h-full min-h-0 flex flex-col bg-widget-body border border-border rounded-none overflow-hidden">
      <WidgetHeader
        title={
          <span>
            {t('Widgets.SeasonalityForecastChart')} <span className="text-primary">[{getSymbolShortFormat(currentSymbol)}]</span>
          </span>
        }
        widgetName="Seasonality Forecast Chart"
        onRemove={onRemove}
        onSettings={onSettings}
        onFullscreen={onFullscreen}
        helpContent="Displays seasonal patterns as candlestick charts for forex pairs. Shows historical seasonal trends with candlestick patterns to help identify recurring market movements throughout the year."
      >
        {/* Timeframe Selector with Loading on Left */}
        <div className="flex gap-2 mr-2 items-center">
          {/* Loading Indicator - Left Side */}
          {loading && <div className="text-xs text-muted-foreground">Loading…</div>}
          
          {/* Timeframe Buttons */}
          <div className="flex gap-1 items-center">
            {['5d', '30d', '45d', '90d'].map(timeFrame => (
              <button
                key={timeFrame}
                onClick={() => {
                  handleTimeFrameChange(timeFrame);
                  if (onSaveSettings) {
                    onSaveSettings({ timeframe: timeFrame });
                  }
                }}
                disabled={loading}
                className={`px-2 py-1 text-xs transition-colors ${
                  currentTimeFrame === timeFrame
                    ? 'text-[#f97316]'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                style={
                  currentTimeFrame === timeFrame
                    ? {
                        color: '#f97316',
                        backgroundColor: 'color-mix(in oklab, #f97316 20%, transparent)',
                      }
                    : {}
                }
              >
                {timeFrame.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Status Indicators */}
        <div className="flex items-center gap-2 mr-2">
          {isSSRData && (
            <span className="text-xs text-green-400 bg-green-400/10 px-2 py-1 rounded">
              SSR
            </span>
          )}
          {error && <div className="text-xs text-red-400">{error}</div>}
        </div>
      </WidgetHeader>

      <div className="flex-1 min-h-0 p-2">
        <div 
          ref={chartContainerRef} 
          className="w-full h-full"
        />
      </div>
    </div>
  );
}