/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createChart, ColorType, type IChartApi, type ISeriesApi, type Time } from 'lightweight-charts';
import { fetchSeasonalityPerformanceData, type SeasonalityPerformanceResponse } from './api';
import '@/styles/seasonality/SeasonalityPerformanceChartWidget/styles/dark.scss';
import '@/styles/seasonality/SeasonalityPerformanceChartWidget/styles/light.scss';
import { WidgetHeader } from '@/components/bloomberg-ui/WidgetHeader';
import { WidgetSettings } from '@/components/bloomberg-ui/WidgetSettingsSlideIn';
import { useTranslation } from 'react-i18next';
import { useDateFormat } from '@/hooks/useDateFormat';
import { widgetDataCache } from '@/lib/widgetDataCache';
import { getSymbolShortFormat } from '@/utils/symbolMapping';
// import { dashboardStateManager } from '../../../../utils/dashboardStateManager';

const FOREX_SYMBOLS = [
  'AUDCAD', 'AUDCHF', 'AUDJPY', 'AUDNZD', 'AUDUSD', 'CADCHF', 'CADJPY', 'CHFJPY',
  'EURAUD', 'EURCAD', 'EURCHF', 'EURGBP', 'EURJPY', 'EURNZD', 'EURUSD', 'GBPAUD',
  'GBPCAD', 'GBPCHF', 'GBPJPY', 'GBPNZD', 'GBPUSD', 'NZDCAD', 'NZDCHF', 'NZDJPY',
  'NZDUSD', 'USDCAD', 'USDCHF', 'USDJPY'
];

interface SeasonalityPerformanceChartWidgetProps {
  wgid: string;
  wght?: number;
  additionalSettings?: string;
  templateName?: string;
  initialData?: unknown;
  isStandalone?: boolean;
  // SSR props
  ssrInitialData?: string;
  ssrSymbol?: string;
  useLegacyPattern?: boolean;
  // Widget controls
  onRemove?: () => void;
  onSettings?: () => void;
  onFullscreen?: () => void;
  onSaveSettings?: (settings: Partial<WidgetSettings>) => void;
  // Settings props
  settings?: WidgetSettings;
}


const SeasonalityPerformanceChartWidget: React.FC<SeasonalityPerformanceChartWidgetProps> = ({
  wgid,
  wght,
  additionalSettings = '',
  templateName = 'Dashboard',
  isStandalone = false,
  // SSR props
  ssrInitialData,
  ssrSymbol,
  // Widget controls
  onRemove,
  onSettings,
  onFullscreen,
  onSaveSettings,
  // Settings
  settings,
}) => {
  const { t } = useTranslation();
  const { format: formatDate, dateFormat } = useDateFormat();
  // Ref to store format function for dynamic access in formatters (avoids closure stale values)
  const formatDateRef = useRef(formatDate);
  formatDateRef.current = formatDate;
  
  // Parse settings from props or additionalSettings
  const additionalSettingsArray = additionalSettings.split('|');
  const currentModule = 'Forex'; // Always Forex for seasonality widgets
  const symbol = (settings?.symbol as string) || ssrSymbol || additionalSettingsArray[1] || 'EURUSD';
  const initialTimeFrame = (settings?.timeframe as string) || additionalSettingsArray[2] || '5d';
  
  // Initialize year toggles from settings or defaults
  const initialShow5Y = settings?.show5Y !== undefined ? Boolean(settings.show5Y) : true;
  const initialShow10Y = settings?.show10Y !== undefined ? Boolean(settings.show10Y) : true;
  const initialShow15Y = settings?.show15Y !== undefined ? Boolean(settings.show15Y) : true;
  
  const [chartData, setChartData] = useState<SeasonalityPerformanceResponse | null>(
    ssrInitialData ? { success: true, data: ssrInitialData as any } : null
  );
  const [currentSymbol, setCurrentSymbol] = useState(symbol);
  const [currentTimeFrame, setCurrentTimeFrame] = useState(initialTimeFrame);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSSRData, setIsSSRData] = useState(!!ssrInitialData);
  const [currentModuleState, setCurrentModuleState] = useState(currentModule);
  
  // Keep year range states for backward compatibility with chart data
  const [show5Y, setShow5Y] = useState(initialShow5Y);
  const [show10Y, setShow10Y] = useState(initialShow10Y);
  const [show15Y, setShow15Y] = useState(initialShow15Y);

  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const lineSeriesRefs = useRef<{
    series5Y?: ISeriesApi<'Line'>;
    series10Y?: ISeriesApi<'Line'>;
    series15Y?: ISeriesApi<'Line'>;
    verticalLine?: ISeriesApi<'Line'>; // For today's date marker in Futures mode
  }>({});
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const isInitializingRef = useRef<boolean>(false);
  const isMountedRef = useRef<boolean>(true);
  const hasLoadedDataRef = useRef<boolean>(false);
  const isLoadingRef = useRef<boolean>(false);

  // Clean up all series
  const cleanupAllSeries = useCallback(() => {
    Object.values(lineSeriesRefs.current).forEach(series => {
      if (series) {
        try {
          chartRef.current?.removeSeries(series);
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    });
    lineSeriesRefs.current = {};
  }, []);

  // Initialize chart
  const initializeChart = useCallback(() => {
    if (!isMountedRef.current || !chartContainerRef.current || isInitializingRef.current) {
      return;
    }

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
      lineSeriesRefs.current = {};
    }

    const chartOptions = {
      layout: { 
        width: chartContainerRef.current?.clientWidth || 800,
        height: chartContainerRef.current?.clientHeight || 400, 
        textColor: '#9D9D9D', 
        background: { type: ColorType.Solid, color: 'transparent' },
        fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      },
      grid: {
        vertLines: { color: '#1C2227', style: 0 },
        horzLines: { color: '#1C2227', style: 0 },
      },
      priceScale: { 
        position: 'right' as const,
        borderColor: '#1C2227',
        textColor: '#9D9D9D',
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
      },
      rightPriceScale: { 
        visible: true,
        borderColor: '#1C2227',
        textColor: '#9D9D9D',
      },
      leftPriceScale: { visible: false },
      handleScale: {
        mouseWheel: false,
        pinch: false,
        axisPressedMouseMove: { time: false, price: false },
        axisDoubleClickReset: false
      },
      handleScroll: false,
      timeScale: {
        visible: true,
        timeVisible: true,
        secondsVisible: false,
        borderColor: '#1C2227',
        textColor: '#9D9D9D',
        tickMarkFormatter: (time: any) => {
          const date = new Date(time * 1000);
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

    // Set up resize observer
    if (resizeObserverRef.current) {
      resizeObserverRef.current.disconnect();
    }

    resizeObserverRef.current = new ResizeObserver(entries => {
      if (chartRef.current && entries.length > 0 && entries[0].target === chartContainerRef.current) {
        const newRect = entries[0].contentRect;
        chartRef.current.resize(newRect.width, newRect.height);
        chartRef.current.timeScale().fitContent();
      }
    });

    resizeObserverRef.current.observe(chartContainerRef.current);
    isInitializingRef.current = false;
  }, []);

  // Force time scale to re-render when date format preference changes
  useEffect(() => {
    if (chartRef.current) {
      // Re-apply timeScale options to force tick mark re-render with new format
      chartRef.current.timeScale().applyOptions({
        tickMarkFormatter: (time: any) => {
          const date = new Date(time * 1000);
          return formatDateRef.current ? formatDateRef.current(date) : date.toLocaleDateString('en-GB');
        }
      });
    }
  }, [dateFormat]);


  // Update chart data for line mode
  const updateLineChartData = useCallback(() => {
    if (!chartRef.current || !chartData?.data) return;
    
    // Validate that we have valid data
    if (!chartData.data.cslabel || !Array.isArray(chartData.data.cslabel)) {
      return;
    }

    // Clean up all existing series
    cleanupAllSeries();

    // Helper function to process data arrays
    const processDataArray = (dataArray: any[], color: string, name: string) => {
      return dataArray
        .map((item, index) => {
          const value = parseFloat(item.value);
          if (isNaN(value)) return null;
          
          // Use the corresponding label for time
          const label = chartData.data.cslabel[index];
          if (!label || !label.label) return null;
          
          // Parse the date from DD.MM.YYYY format
          const dateParts = label.label.split('.');
          if (dateParts.length !== 3) {
            console.log('Invalid date format in line chart:', label.label);
            return null;
          }
          
          const day = parseInt(dateParts[0]);
          const month = parseInt(dateParts[1]) - 1; // JavaScript months are 0-based
          const year = parseInt(dateParts[2]);
          
          // Create timestamp for the date
          const timestamp = Math.floor(new Date(year, month, day).getTime() / 1000);
          
          return {
            time: timestamp as Time,
            value: value
          };
        })
        .filter((item): item is { time: Time; value: number } => {
          return item !== null && 
                 item.value !== undefined && 
                 !isNaN(item.value) && 
                 typeof item.value === 'number' &&
                 item.time !== undefined;
        });
    };

    // Create line series based on checkbox states
    if (show5Y && chartData.data.years5) {
      const series5Y = chartRef.current.addLineSeries({
        color: '#3b82f6', // Blue
        priceLineVisible: false,
        lastValueVisible: true,
        lineStyle: 0, // Smooth line
        lineWidth: 2,
        priceFormat: {
          type: 'custom',
          formatter: (price: number) => `${price.toFixed(2)}%`,
        },
      });
      lineSeriesRefs.current.series5Y = series5Y;
      
      const data5Y = processDataArray(chartData.data.years5, '#3b82f6', '5Y');
      if (data5Y.length > 0) {
        series5Y.setData(data5Y);
      }
    }

    if (show10Y && chartData.data.years10) {
      const series10Y = chartRef.current.addLineSeries({
        color: '#06b6d4', // Teal/Cyan
        priceLineVisible: false,
        lastValueVisible: true,
        lineStyle: 0, // Smooth line
        lineWidth: 2,
        priceFormat: {
          type: 'custom',
          formatter: (price: number) => `${price.toFixed(2)}%`,
        },
      });
      lineSeriesRefs.current.series10Y = series10Y;
      
      const data10Y = processDataArray(chartData.data.years10, '#06b6d4', '10Y');
      if (data10Y.length > 0) {
        series10Y.setData(data10Y);
      }
    }

    if (show15Y && chartData.data.yearsall) {
      const series15Y = chartRef.current.addLineSeries({
        color: '#a855f7', // Purple
        priceLineVisible: false,
        lastValueVisible: true,
        lineStyle: 0, // Smooth line
        lineWidth: 2,
        priceFormat: {
          type: 'custom',
          formatter: (price: number) => `${price.toFixed(2)}%`,
        },
      });
      lineSeriesRefs.current.series15Y = series15Y;
      
      const data15Y = processDataArray(chartData.data.yearsall, '#a855f7', '15Y');
      if (data15Y.length > 0) {
        series15Y.setData(data15Y);
      }
    }

    // Add reference lines: horizontal orange line at 0 and vertical line at current date
    // Add horizontal line at 0 to the first available line series
    const firstLineSeries = Object.values(lineSeriesRefs.current).find(series => series);
    
    if (firstLineSeries) {
      try {
        firstLineSeries.createPriceLine({
          price: 0,
          color: '#FF8C00', // Orange color
          lineWidth: 2,
          lineStyle: 0, // Solid line
          axisLabelVisible: false,
          title: '',
        });
      } catch (error) {
        console.error('Error adding orange horizontal line:', error);
      }
    }

    chartRef.current.timeScale().fitContent();
    
    // Add vertical line at today's date after chart is updated
    // Use setTimeout to ensure price scale is updated with data
    setTimeout(() => {
      try {
        // Clean up existing vertical line if any
        if (lineSeriesRefs.current.verticalLine) {
          try {
            chartRef.current?.removeSeries(lineSeriesRefs.current.verticalLine);
          } catch {}
          lineSeriesRefs.current.verticalLine = undefined;
        }

        // Get today's month and day
        const today = new Date();
        const todayMonth = today.getMonth(); // 0-11
        const todayDay = today.getDate(); // 1-31

        // Find the year used in the chart data by examining the first label
        let chartYear = 2025; // Default
        if (chartData.data.cslabel && chartData.data.cslabel.length > 0) {
          const firstLabel = chartData.data.cslabel[0];
          if (firstLabel && firstLabel.label) {
            const dateParts = firstLabel.label.split('.');
            if (dateParts.length === 3) {
              chartYear = parseInt(dateParts[2]);
            }
          }
        }

        // Create timestamp for today's month/day in the chart's year
        const todayInChartYear = new Date(chartYear, todayMonth, todayDay);
        todayInChartYear.setHours(0, 0, 0, 0);
        const todayTimestamp = Math.floor(todayInChartYear.getTime() / 1000);

        // Collect all data points from visible series to find min/max values
        const allDataPoints: number[] = [];
        
        if (show5Y && chartData.data.years5) {
          chartData.data.years5.forEach((item: any) => {
            const value = parseFloat(item.value);
            if (!isNaN(value)) allDataPoints.push(value);
          });
        }
        
        if (show10Y && chartData.data.years10) {
          chartData.data.years10.forEach((item: any) => {
            const value = parseFloat(item.value);
            if (!isNaN(value)) allDataPoints.push(value);
          });
        }
        
        if (show15Y && chartData.data.yearsall) {
          chartData.data.yearsall.forEach((item: any) => {
            const value = parseFloat(item.value);
            if (!isNaN(value)) allDataPoints.push(value);
          });
        }
        
        if (allDataPoints.length === 0) {
          return; // No data points, skip vertical line
        }
        
        // Calculate line values that span the full chart height
        // Use a very large multiplier to ensure the line goes beyond visible bounds
        const minValue = Math.min(...allDataPoints);
        const maxValue = Math.max(...allDataPoints);
        const range = maxValue - minValue || 10; // Fallback to 10 if range is 0
        
        // Use extremely large multiplier (1000x) to ensure the line spans full height
        // This ensures the line extends well beyond any visible price range
        const lineMinValue = minValue - (range * 1000);
        const lineMaxValue = maxValue + (range * 1000);

        // Create a line series for the vertical line at today's date
        const verticalLineSeries = chartRef.current?.addLineSeries({
          color: '#FF8C00', // Orange to match horizontal line
          lineWidth: 2,
          lineStyle: 2, // Dashed
          priceLineVisible: false,
          lastValueVisible: false,
          crosshairMarkerVisible: false,
          autoscaleInfoProvider: () => null, // Prevent this series from affecting autoscale
        });
        
        if (verticalLineSeries) {
          // Store the vertical line series for cleanup
          lineSeriesRefs.current.verticalLine = verticalLineSeries;
          
          // Create a vertical line by using timestamps 1 second apart
          // Use extreme values that span the full chart height
          verticalLineSeries.setData([
            { time: todayTimestamp as Time, value: lineMinValue },
            { time: (todayTimestamp + 1) as Time, value: lineMaxValue },
          ]);
        }
      } catch (error) {
        console.error('Error adding vertical line at today\'s date:', error);
      }
    }, 100);
  }, [chartData, show5Y, show10Y, show15Y, cleanupAllSeries, currentModuleState]);

  // Update chart data
  const updateChartData = useCallback(() => {
    if (!chartRef.current || !chartData?.data) return;

    // Additional validation before updating chart
    if (!chartData.data.cslabel || !Array.isArray(chartData.data.cslabel)) {
      console.log('No cslabel data available');
      return;
    }

    // Validate that we have at least some valid data
    const hasValidData = chartData.data.currentval && Array.isArray(chartData.data.currentval) && chartData.data.currentval.length > 0;

    if (!hasValidData) {
      console.log('No currentval data available');
      return;
    }

    updateLineChartData();
  }, [chartData, updateLineChartData]);

  // Load new data
  const loadNewData = useCallback(async (newSymbol: string, newTimeFrame?: string) => {
    const timeFrameToUse = newTimeFrame || currentTimeFrame;
    if (newSymbol === currentSymbol && timeFrameToUse === currentTimeFrame && chartData) return;

    // Prevent duplicate calls
    if (isLoadingRef.current) {
      console.log('⏭️ [SeasonalityPerformanceChart] Already loading, skipping duplicate call');
      return;
    }

    const cacheKey = widgetDataCache.generateKey('seasonality-performance-chart', { 
      symbol: newSymbol, 
      baseYear: timeFrameToUse 
    });
    const cachedData = widgetDataCache.get<SeasonalityPerformanceResponse>(cacheKey);
    
    if (cachedData) {
      setChartData(cachedData);
      setCurrentSymbol(newSymbol);
      if (newTimeFrame) {
        setCurrentTimeFrame(newTimeFrame);
      }
      setLoading(false);
      hasLoadedDataRef.current = true;
      return;
    }

    setLoading(true);
    setError(null);
    setIsSSRData(false);
    isLoadingRef.current = true;

    try {
      const res = await fetchSeasonalityPerformanceData({
        symbol: newSymbol,
        additionalSettings: 'line',
        baseYear: timeFrameToUse,
      });

      if (res && res.success) {
        setChartData(res);
        widgetDataCache.set(cacheKey, res);
        setCurrentSymbol(newSymbol);
        if (newTimeFrame) {
          setCurrentTimeFrame(newTimeFrame);
        }
        hasLoadedDataRef.current = true;
      } else {
        setError('Failed to load chart data');
      }
    } catch (e: unknown) {
      const errorMsg = e instanceof Error ? e.message : 'Unknown error';
      setError(errorMsg);
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  }, [currentSymbol, currentTimeFrame, chartData]);

  // Handle timeframe change
  const handleTimeFrameChange = (newTimeFrame: string) => {
    setCurrentTimeFrame(newTimeFrame);
    loadNewData(currentSymbol, newTimeFrame);
  };

  // Handle settings changes from props
  useEffect(() => {
    if (settings && !isLoadingRef.current) {
      const newSymbol = (settings?.symbol as string) || currentSymbol;
      const newTimeFrame = (settings?.timeframe as string) || currentTimeFrame;
      
      // Load new data if symbol or timeframe changed
      if (newSymbol !== currentSymbol || newTimeFrame !== currentTimeFrame) {
        hasLoadedDataRef.current = false; // Reset to allow new load
        loadNewData(newSymbol, newTimeFrame);
      }
    }
  }, [settings?.symbol, settings?.timeframe, currentSymbol, currentTimeFrame, loadNewData]);


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

  // Cleanup chart resources on unmount
  useEffect(() => {
    return () => {
      if (resizeObserverRef.current) {
        try { resizeObserverRef.current.disconnect(); } catch {}
        resizeObserverRef.current = null;
      }
      if (chartRef.current) {
        try { chartRef.current.remove(); } catch {}
        chartRef.current = null;
      }
      lineSeriesRefs.current = {};
      isInitializingRef.current = false;
    };
  }, []);

  // Date format preference changes are now handled automatically by the formatters
  // reading from preferencesRef at call time, so no separate effect is needed.

  // Handle SSR data initialization
  useEffect(() => {
    if (isSSRData && chartData && chartRef.current) {
      // Validate data before updating chart
      if (chartData.data?.cslabel && Array.isArray(chartData.data.cslabel)) {
        setTimeout(() => {
          updateChartData();
        }, 200);
      }
    }
  }, [isSSRData, chartData, updateChartData]);

  // Load initial data if no SSR data provided
  useEffect(() => {
    if (!isSSRData && !chartData && !hasLoadedDataRef.current) {
      console.log('📡 [SeasonalityPerformanceChart] Loading initial data for:', currentSymbol);
      loadNewData(currentSymbol);
    }
  }, [currentSymbol, isSSRData, chartData, loadNewData]);

  // Update chart when data changes
  useEffect(() => {
    if (chartData && chartRef.current) {
      updateChartData();
    }
  }, [updateChartData, chartData]);

  // Update line chart when checkbox states change
  useEffect(() => {
    if (chartData && chartRef.current) {
      updateLineChartData();
    }
  }, [show5Y, show10Y, show15Y, updateLineChartData, chartData]);

  // Update chart when module changes
  useEffect(() => {
    if (chartData && chartRef.current) {
      updateLineChartData();
    }
  }, [currentModuleState, updateLineChartData, chartData]);

  // Update chart theme dynamically when theme changes
  useEffect(() => {
    if (chartRef.current) {
      // Get theme-aware colors from CSS custom properties
      const widgetElement = document.querySelector('.seasonality-performance-chart-widget');
      const computedStyle = widgetElement ? getComputedStyle(widgetElement) : null;
      const textColor = computedStyle?.getPropertyValue('--spc-text-color')?.trim() || '#9D9D9D';
      const gridColor = computedStyle?.getPropertyValue('--spc-grid-color')?.trim() || '#1C2227';
      const borderColor = computedStyle?.getPropertyValue('--spc-grid-color')?.trim() || '#1C2227';

      chartRef.current.applyOptions({
        layout: {
          textColor: textColor,
          background: { type: ColorType.Solid, color: 'transparent' },
        },
        grid: {
          vertLines: { color: gridColor, style: 0 },
          horzLines: { color: gridColor, style: 0 },
        },
        rightPriceScale: {
          borderColor: borderColor,
          textColor: textColor,
        },
        timeScale: {
          borderColor: borderColor,
        },
      });
    }
  }, []);

  const containerStyle: React.CSSProperties = {
    width: '100%',
    height: isStandalone ? '100vh' : '100%',
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
    maxWidth: '100%',
  };

  return (
    <div className="seasonality-performance-chart-widget" style={containerStyle}>
      {/* Widget Header */}
      <WidgetHeader
        title={
          <span>
            Seasonality Performance <span className="text-primary">[{getSymbolShortFormat(currentSymbol)}]</span>
          </span>
        }
        widgetName="Seasonality Performance"
        onRemove={onRemove}
        onSettings={onSettings}
        onFullscreen={onFullscreen}
        helpContent="Displays seasonal performance trends as line charts for forex pairs. Shows historical performance data across different time periods (5Y, 10Y, 15Y) to help identify seasonal patterns and trading opportunities."
      >
        {/* Line Toggle Controls */}
        <div className="flex gap-3 mr-2 items-center">
          <button
            onClick={() => {
              setShow5Y(!show5Y);
              if (onSaveSettings) {
                onSaveSettings({ show5Y: !show5Y, show10Y, show15Y, timeframe: currentTimeFrame });
              }
            }}
            className="flex items-center gap-2 px-2 py-1 text-xs transition-opacity hover:opacity-80"
            style={{ opacity: show5Y ? 1 : 0.4 }}
          >
            <div
              className="w-4 h-0.5 rounded"
              style={{ backgroundColor: '#3b82f6' }}
            />
            <span className="text-muted-foreground">5 years</span>
          </button>
          
          <button
            onClick={() => {
              setShow10Y(!show10Y);
              if (onSaveSettings) {
                onSaveSettings({ show5Y, show10Y: !show10Y, show15Y, timeframe: currentTimeFrame });
              }
            }}
            className="flex items-center gap-2 px-2 py-1 text-xs transition-opacity hover:opacity-80"
            style={{ opacity: show10Y ? 1 : 0.4 }}
          >
            <div
              className="w-4 h-0.5 rounded"
              style={{ backgroundColor: '#06b6d4' }}
            />
            <span className="text-muted-foreground">10 years</span>
          </button>
          
          <button
            onClick={() => {
              setShow15Y(!show15Y);
              if (onSaveSettings) {
                onSaveSettings({ show5Y, show10Y, show15Y: !show15Y, timeframe: currentTimeFrame });
              }
            }}
            className="flex items-center gap-2 px-2 py-1 text-xs transition-opacity hover:opacity-80"
            style={{ opacity: show15Y ? 1 : 0.4 }}
          >
            <div
              className="w-4 h-0.5 rounded"
              style={{ backgroundColor: '#a855f7' }}
            />
            <span className="text-muted-foreground">15 years</span>
          </button>
        </div>

        {/* Status Indicators */}
        <div className="flex items-center gap-2 mr-2">
          {/* Loading Indicator */}
          <div className="text-xs text-muted-foreground">
            {loading ? 'Loading…' : ''}
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

      {/* Chart container */}
      <div style={{ 
        flex: 1,
        minHeight: 0,
        overflow: 'hidden',
        position: 'relative',
      }}>
        <div 
          ref={chartContainerRef} 
          className="spc-chart"
          style={{ width: '100%', height: '100%' }}
        />
      </div>
    </div>
  );
};

export default SeasonalityPerformanceChartWidget;
