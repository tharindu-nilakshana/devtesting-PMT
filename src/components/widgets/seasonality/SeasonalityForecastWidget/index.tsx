"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createChart, LineStyle, LineWidth, ColorType, type IChartApi, type ISeriesApi, type Time } from 'lightweight-charts';
import { fetchSeasonalityForecast } from './api';
import '@/styles/seasonality/SeasonalityForecastWidget/styles/dark.scss';
import '@/styles/seasonality/SeasonalityForecastWidget/styles/light.scss';
import { WidgetHeader } from '@/components/bloomberg-ui/WidgetHeader';
import { WidgetSettings } from '@/components/bloomberg-ui/WidgetSettingsSlideIn';
import { useTranslation } from 'react-i18next';
import { useDateFormat } from '@/hooks/useDateFormat';
import { widgetDataCache } from '@/lib/widgetDataCache';
import { getSymbolShortFormat } from '@/utils/symbolMapping';

// Define the chart data structure based on your API response
interface ChartDataWithTime {
  time: Time;
  value: number;
}

interface Props {
  initialData?: ChartDataWithTime[];
  initialSymbol?: string;
  initialModule?: string;
  initialTimeFrame?: string;
  initialError?: string;
  onRemove?: () => void; // Close button functionality
  onSettings?: () => void; // Settings button functionality
  onFullscreen?: () => void; // Fullscreen functionality
  settings?: WidgetSettings; // Widget settings from settings dialog
}

export default function SeasonalityForecastWidget({
  initialData = [],
  initialSymbol = 'EURUSD',
  initialTimeFrame = '5d',
  initialError,
  onRemove,
  onSettings,
  onFullscreen,
  settings,
}: Props) {
  const { t } = useTranslation();
  const { format: formatDate, dateFormat } = useDateFormat();
  // Ref to store format function for dynamic access in formatters (avoids closure stale values)
  const formatDateRef = useRef(formatDate);
  formatDateRef.current = formatDate;
  // Use symbol from settings if available, otherwise use initial value
  const symbolFromSettings = (settings?.symbol as string) || initialSymbol;
  
  const [chartData, setChartData] = useState<ChartDataWithTime[]>(initialData);
  const [currentSymbol, setCurrentSymbol] = useState(symbolFromSettings);
  const [currentTimeFrame, setCurrentTimeFrame] = useState(initialTimeFrame);
  
  // Sync currentSymbol when settings change
  useEffect(() => {
    const newSymbol = (settings?.symbol as string) || initialSymbol;
    if (newSymbol !== currentSymbol) {
      setCurrentSymbol(newSymbol);
    }
  }, [settings?.symbol, initialSymbol, currentSymbol]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(initialError || null);
  const [isSSRData, setIsSSRData] = useState(initialData.length > 0);
  
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Baseline'> | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const isInitializingRef = useRef<boolean>(false);
  const isMountedRef = useRef<boolean>(true);
  const hasAttemptedInitialLoadRef = useRef<boolean>(false);

  // Initialize chart
  const initializeChart = useCallback(() => {
    if (!isMountedRef.current || !chartContainerRef.current || isInitializingRef.current) {
      return;
    }

    // Check container dimensions (chart will resize via ResizeObserver when available)
    const rect = chartContainerRef.current.getBoundingClientRect();
    console.log('🔄 [SeasonalityForecastWidget] Initializing chart...', {
      containerWidth: rect.width,
      containerHeight: rect.height
    });

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
    }

    const chartOptions = {
      layout: { 
        width: 0,
        height: 0, 
        textColor: '#9D9D9D', 
        background: { type: ColorType.Solid, color: 'transparent' },
        fontFamily: "Inter",
      },
      grid: {
        vertLines: { color: '#1C2227' },
        horzLines: { color: '#1C2227' },
      },
      priceScale: { position: 'left' as const },
      rightPriceScale: { visible: false },
      leftPriceScale: { visible: true },
      handleScale: {
        mouseWheel: false,
        pinch: false,
        axisPressedMouseMove: { time: true, price: true },
        axisDoubleClickReset: false
      },
      handleScroll: false,
      timeScale: {
        tickMarkFormatter: (time: any) => {
          const date = typeof time === 'number' ? new Date(time * 1000) : new Date(time);
          return formatDateRef.current ? formatDateRef.current(date) : date.toLocaleDateString('en-GB');
        }
      },
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
    };

    chartRef.current = createChart(chartContainerRef.current, chartOptions);

    // Create baseline series
    const seriesOptions = { 
      autoSize: true,
      color: '#E68200', 
      priceLineVisible: false,
      lastValueVisible: false, 
      priceFormat: { 
        type: 'custom' as const,  
        formatter: (price: number) => `${parseFloat(price.toString()).toFixed(2)}%`,
        minMove: 0.001
      },
      baseValue: { type: 'price' as const, price: 0 }, 
      topLineColor: 'rgba(38,166,154,1)', 
      topFillColor1: 'rgba(38,166,154,0.28)', 
      topFillColor2: 'rgba(38,166,154,0.05)', 
      bottomLineColor: 'rgba(239,83,80,1)', 
      bottomFillColor1: 'rgba(239,83,80,0.05)', 
      bottomFillColor2: 'rgba(239,83,80,0.28)'
    };
    
    seriesRef.current = chartRef.current.addBaselineSeries(seriesOptions);

    // Add horizontal line at 0
    seriesRef.current.createPriceLine({
      price: 0,
      color: '#FF9800',
      lineWidth: 2 as LineWidth,
      lineStyle: LineStyle.Solid,
      axisLabelVisible: true,
    });

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
    
    // Set initial size from container
    if (chartContainerRef.current) {
      const rect = chartContainerRef.current.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        chartRef.current.applyOptions({ width: rect.width, height: rect.height });
      }
    }
    
    isInitializingRef.current = false;
    
    console.log('✅ [SeasonalityForecastWidget] Chart initialized successfully', {
      hasSeries: !!seriesRef.current,
      hasChart: !!chartRef.current
    });
  }, []);

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
    if (!seriesRef.current || !chartData.length) {
      console.log('⚠️ [SeasonalityForecastWidget] Cannot update chart:', {
        hasSeries: !!seriesRef.current,
        dataLength: chartData.length
      });
      return;
    }

    // Ensure data is sorted by time (ascending order required by lightweight-charts)
    const formattedData = [...chartData]
      .map(item => ({
        time: item.time as Time,
        value: item.value
      }))
      .sort((a, b) => {
        // Sort by time string (YYYY-MM-DD format sorts correctly as string)
        if (a.time < b.time) return -1;
        if (a.time > b.time) return 1;
        return 0;
      });

    // Check for duplicates (shouldn't happen after our fix, but double-check)
    const seenTimes = new Set<string>();
    const uniqueData = formattedData.filter(item => {
      const timeStr = String(item.time);
      if (seenTimes.has(timeStr)) {
        console.warn('⚠️ [SeasonalityForecastWidget] Duplicate time found:', timeStr);
        return false;
      }
      seenTimes.add(timeStr);
      return true;
    });

    try {
      console.log('📊 [SeasonalityForecastWidget] Setting chart data:', {
        dataPoints: uniqueData.length,
        firstPoint: uniqueData[0],
        lastPoint: uniqueData[uniqueData.length - 1],
        duplicatesRemoved: formattedData.length - uniqueData.length
      });
      seriesRef.current.setData(uniqueData);
      chartRef.current?.timeScale().fitContent();
      console.log('✅ [SeasonalityForecastWidget] Chart data updated successfully');
    } catch (error) {
      console.error('❌ [SeasonalityForecastWidget] Error updating chart data:', error);
    }
  }, [chartData]);

  // Load new data
  const loadNewData = useCallback(async (newSymbol: string, newTimeFrame: string) => {
    console.log('🔄 [SeasonalityForecastWidget] Loading data:', { newSymbol, newTimeFrame });

    const cacheKey = widgetDataCache.generateKey('seasonality-forecast', { 
      symbol: newSymbol, 
      baseYear: newTimeFrame 
    });
    const cachedData = widgetDataCache.get<any>(cacheKey);
    
    if (cachedData && cachedData.success && cachedData.chartData && cachedData.chartDate) {
      // Transform cached data
      const dataMap = new Map<string, number>();
      
      cachedData.chartData.forEach((value: string, index: number) => {
        if (cachedData.chartDate && cachedData.chartDate[index]) {
          const dateStr = cachedData.chartDate[index];
          const numValue = parseFloat(value);
          
          let timeValue: string;
          if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            timeValue = dateStr;
          } else {
            const [month, day, year] = dateStr.split('/');
            timeValue = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          }
          
          if (!isNaN(numValue)) {
            dataMap.set(timeValue, numValue);
          }
        }
      });
      
      const transformedData: ChartDataWithTime[] = Array.from(dataMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([time, value]) => ({ time: time as Time, value }));
      
      setChartData(transformedData);
      setCurrentSymbol(newSymbol);
      setCurrentTimeFrame(newTimeFrame);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setIsSSRData(false);

    try {
      const res = await fetchSeasonalityForecast({
        symbol: newSymbol,
        baseYear: newTimeFrame, // Note: using baseYear parameter from your API
      });

      if (res && res.success && res.chartData && res.chartDate) {
        widgetDataCache.set(cacheKey, res);
        
        // Transform the chart data to the expected format
        // Use a Map to handle duplicate dates (keep the last value for each date)
        const dataMap = new Map<string, number>();
        
        res.chartData.forEach((value, index) => {
          if (res.chartDate && res.chartDate[index]) {
            const dateStr = res.chartDate[index];
            const numValue = parseFloat(value);
            
            // Ensure date is in YYYY-MM-DD format (lightweight-charts expects this for baseline series)
            let timeValue: string;
            if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
              // Already in correct format
              timeValue = dateStr;
            } else {
              // Try to parse and convert
              const date = new Date(dateStr);
              if (!isNaN(date.getTime())) {
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                timeValue = `${year}-${month}-${day}`;
              } else {
                console.warn('⚠️ [SeasonalityForecastWidget] Invalid date format:', dateStr);
                return; // Skip this data point
              }
            }
            
            if (!isNaN(numValue)) {
              // Store in map - if duplicate date exists, keep the last value
              dataMap.set(timeValue, numValue);
            }
          }
        });
        
        // Convert map to array and sort by time (ascending order required by lightweight-charts)
        const transformedData: ChartDataWithTime[] = Array.from(dataMap.entries())
          .map(([time, value]) => ({
            time: time as Time,
            value: value
          }))
          .sort((a, b) => {
            // Sort by time string (YYYY-MM-DD format sorts correctly as string)
            if (a.time < b.time) return -1;
            if (a.time > b.time) return 1;
            return 0;
          });
        
        console.log('✅ [SeasonalityForecastWidget] Transformed data:', {
          originalLength: res.chartData.length,
          uniqueDates: dataMap.size,
          transformedLength: transformedData.length,
          sampleData: transformedData.slice(0, 3),
          dateRange: transformedData.length > 0 ? {
            first: transformedData[0].time,
            last: transformedData[transformedData.length - 1].time
          } : null,
          duplicatesRemoved: res.chartData.length - dataMap.size
        });
        
        if (transformedData.length === 0) {
          console.warn('⚠️ [SeasonalityForecastWidget] No valid data points after transformation');
          setError('No valid data points found');
        } else {
          setChartData(transformedData);
          setCurrentSymbol(newSymbol);
          setCurrentTimeFrame(newTimeFrame);
        }
      } else {
        console.log('❌ [SeasonalityForecastWidget] API response structure:', {
          success: res?.success,
          hasChartData: !!res?.chartData,
          hasChartDate: !!res?.chartDate,
          chartDataLength: res?.chartData?.length,
          chartDateLength: res?.chartDate?.length
        });
        setError(res?.error || 'Failed to load forecast data');
      }
    } catch (e: unknown) {
      const errorMsg = e instanceof Error ? e.message : 'Unknown error';
      console.error('❌ [SeasonalityForecastWidget] Error loading data:', errorMsg);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleTimeFrameChange = (newTimeFrame: string) => {
    console.log('🔄 [SeasonalityForecastWidget] Timeframe changed:', { 
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

  // Set mounted flag on mount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Initialize chart when mounted
  useEffect(() => {
    initializeChart();
  }, [initializeChart]);

  // Cleanup on unmount only
  useEffect(() => {
    return () => {
      if (resizeObserverRef.current) {
        try { resizeObserverRef.current.disconnect(); } catch {}
        resizeObserverRef.current = null;
      }
      if (chartRef.current) {
        try { chartRef.current.remove(); } catch {}
        chartRef.current = null;
        seriesRef.current = null;
      }
      isInitializingRef.current = false;
    };
  }, []);

  // Date format preference changes are now handled automatically by the formatters
  // reading from formatDateRef at call time, so no separate effect is needed.

  // Load initial data if no SSR data provided
  useEffect(() => {
    if (!isSSRData && chartData.length === 0 && !hasAttemptedInitialLoadRef.current) {
      console.log('🔄 [SeasonalityForecastWidget] Loading initial data:', { currentSymbol, currentTimeFrame });
      hasAttemptedInitialLoadRef.current = true;
      loadNewData(currentSymbol, currentTimeFrame);
    }
  }, [currentSymbol, currentTimeFrame, isSSRData, chartData.length, loadNewData]);

  // Watch for settings changes and reload data when symbol changes
  useEffect(() => {
    const newSymbol = (settings?.symbol as string) || initialSymbol;
    
    if (newSymbol && newSymbol !== currentSymbol) {
      setCurrentSymbol(newSymbol);
      loadNewData(newSymbol, currentTimeFrame);
    }
  }, [settings?.symbol, currentSymbol, currentTimeFrame, initialSymbol, loadNewData]);

  // Update chart when data changes - ensure chart is ready
  useEffect(() => {
    // Small delay to ensure chart is fully initialized
    const timer = setTimeout(() => {
      if (chartRef.current && seriesRef.current && chartData.length > 0) {
        updateChartData();
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, [chartData, updateChartData]);

  return (
    <div className="w-full h-full min-h-0 flex flex-col bg-widget-body border border-border rounded-none overflow-hidden">
      {/* Header - Bloomberg Style */}
      <WidgetHeader
        title={
          <span>
            {t('Widgets.SeasonalityForecast')} <span className="text-primary">[{getSymbolShortFormat(currentSymbol)}]</span>
          </span>
        }
        widgetName="Seasonality Forecast"
        onRemove={onRemove}
        onSettings={onSettings}
        onFullscreen={onFullscreen}
        helpContent="Shows seasonal patterns and forecasts for forex pairs based on historical data. Select different symbols and timeframes to analyze seasonal trends and potential future movements."
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
              onClick={() => handleTimeFrameChange(timeFrame)}
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

      {/* Chart Container */}
      <div className="flex-1 min-h-0 p-2">
        <div 
          ref={chartContainerRef} 
          className="w-full h-full"
        />
      </div>
    </div>
  );
}