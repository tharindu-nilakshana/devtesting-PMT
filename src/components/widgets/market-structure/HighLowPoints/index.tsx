"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createChart, ColorType, type IChartApi, type ISeriesApi, type Time, type SeriesMarker } from 'lightweight-charts';
import { WidgetHeader } from '@/components/bloomberg-ui/WidgetHeader';
import { WidgetSettingsSlideIn, type WidgetSettings } from '@/components/bloomberg-ui/WidgetSettingsSlideIn';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { fetchHighLowPoints, type HighLowPointData } from './api';
import { useTheme } from '@/hooks/useTheme';
import { useTemplates } from '@/hooks/useTemplates';
import tradingViewWebSocket from '@/utils/tradingViewWebSocket';
import { widgetDataCache } from '@/lib/widgetDataCache';

interface Props {
  wgid?: string;
  onRemove?: () => void;
  onSettings?: () => void;
  onFullscreen?: () => void;
  symbol?: string;
  module?: string;
  timeframe?: string;
  settings?: WidgetSettings;
}

interface HighLowPoint {
  id: string;
  type: 'high' | 'low';
  price: number;
  timestamp: Date;
  swingStrength: number;
  isSignificant: boolean;
}

export default function HighLowPointsWidget({
  wgid = 'high-low-points',
  onRemove,
  onSettings,
  onFullscreen,
  symbol: propSymbol = 'AUDCAD',
  module: propModule = 'Forex',
  timeframe: propTimeframe = '1d',
  settings
}: Props) {
  const { isDark } = useTheme();
  const { activeTemplateId, updateWidgetFields } = useTemplates();
  
  const [showSettings, setShowSettings] = useState(false);
  const [widgetSettings, setWidgetSettings] = useState<WidgetSettings>(() => ({
    ...settings,
    module: settings?.module || propModule,
    symbol: settings?.symbol || propSymbol,
    timeframe: settings?.timeframe || propTimeframe,
  }));

  // Use widgetSettings for current values
  const symbol = widgetSettings.symbol || propSymbol;
  const module = widgetSettings.module || propModule;
  const timeframe = widgetSettings.timeframe || propTimeframe;
  
  const [points, setPoints] = useState<HighLowPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<'high' | 'low' | 'all'>('all');
  const [chartData, setChartData] = useState<HighLowPointData | null>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const markersRef = useRef<any[]>([]);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const isInitializingRef = useRef<boolean>(false);
  const isDisposedRef = useRef<boolean>(false);
  const chartDataRef = useRef<HighLowPointData | null>(null);
  const hasFetchedRef = useRef<boolean>(false);
  const lastFetchedSymbolRef = useRef<string>('');
  const lastFetchedTimeframeRef = useRef<string>('');

  // Sync external settings
  useEffect(() => {
    if (settings) {
      setWidgetSettings((prev) => ({ ...prev, ...settings }));
    }
  }, [settings]);

  // Handle settings save
  const handleSaveSettings = async (newSettings: WidgetSettings) => {
    setWidgetSettings(newSettings);

    // Save settings to database
    if (wgid && activeTemplateId) {
      try {
        const additionalSettings = JSON.stringify({
          timeframe: newSettings.timeframe || "1d"
        });

        const updateFields: any = {
          additionalSettings,
          module: newSettings.module || "Forex",
          symbols: newSettings.symbol || "AUDCAD"
        };

        console.log('📡 [HighLowPoints] Calling updateWidgetFields API:', {
          widgetId: wgid,
          templateId: activeTemplateId,
          updateFields
        });

        const result = await updateWidgetFields(wgid, activeTemplateId, updateFields);

        if (result.success) {
          console.log('✅ [HighLowPoints] Settings saved to database');
        } else {
          console.warn('⚠️ [HighLowPoints] Failed to save settings:', result.message);
        }
      } catch (error) {
        console.error('❌ [HighLowPoints] Error saving settings to database:', error);
      }
    }
  };

  // Convert interval format (1d, 1h, 1w) to API format
  const getInterval = useCallback(() => {
    if (timeframe === '1h') return '1h';
    if (timeframe === '1w') return '1w';
    return '1d'; // default
  }, [timeframe]);

  // Convert Unix timestamp to Time format for Lightweight Charts
  const timestampToTime = useCallback((timestamp: string): Time => {
    const date = new Date(parseInt(timestamp) * 1000);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}` as Time;
  }, []);

  // Fetch data from API
  const fetchData = useCallback(async () => {
    // Check cache first
    const interval = getInterval();
    const cacheKey = widgetDataCache.generateKey('highlowpoints', { symbol, interval });
    const cachedData = widgetDataCache.get<HighLowPointData>(cacheKey);
    if (cachedData) {
      console.log('✅ [HighLowPoints] Using cached data');
      chartDataRef.current = cachedData;
      setChartData(cachedData);

      // Map cached data to points
      const mappedPoints: HighLowPoint[] = cachedData.highlowx.map((point, index) => {
        const timestamp = new Date(parseInt(point.label) * 1000);
        const price = parseFloat(point.value);
        const isHigh = point.color === '#01B298';
        const isLow = point.color === '#FD2E64';
        const isSignificant = true;
        const swingStrength = Math.min(100, 80 + Math.random() * 20);

        return {
          id: `point-${index}-${point.label}`,
          type: isHigh ? 'high' : 'low',
          price: price,
          timestamp: timestamp,
          swingStrength: Math.round(swingStrength),
          isSignificant: isSignificant,
        };
      });

      setPoints(mappedPoints);
      setLoading(false);
      return;
    }

    // Prevent duplicate fetches for the same symbol/timeframe
    if (hasFetchedRef.current && 
        lastFetchedSymbolRef.current === symbol && 
        lastFetchedTimeframeRef.current === timeframe) {
      console.log('🚫 [HighLowPoints] Skipping duplicate fetch');
      return;
    }
    
    hasFetchedRef.current = true;
    lastFetchedSymbolRef.current = symbol;
    lastFetchedTimeframeRef.current = timeframe;
    setLoading(true);
    setError(null);

    try {
      const tvSymbol = symbol.startsWith('FX:') ? symbol : `FX:${symbol}`;

      const data = await fetchHighLowPoints({
        Symbol: symbol,
        TVSymbol: tvSymbol,
        Interval: interval,
      });



      if (!data.highlowx || data.highlowx.length === 0) {
        throw new Error('No high/low points data received from API');
      }

      chartDataRef.current = data; // Store in ref for WebSocket updates
      setChartData(data);

      // Map API data to widget's HighLowPoint interface
      const mappedPoints: HighLowPoint[] = data.highlowx.map((point, index) => {
        const timestamp = new Date(parseInt(point.label) * 1000);
        const price = parseFloat(point.value);
        const isHigh = point.color === '#01B298'; // High points are green/teal
        const isLow = point.color === '#FD2E64'; // Low points are red

        // Determine if significant (points with showValue in high/low arrays are significant)
        // For now, we'll mark all points as significant since they're in highlowx
        const isSignificant = true;

        // Calculate swing strength (simplified - could be based on price distance from average)
        const swingStrength = Math.min(100, 80 + Math.random() * 20); // Placeholder calculation

        return {
          id: `point-${index}-${point.label}`,
          type: isHigh ? 'high' : 'low',
          price: price,
          timestamp: timestamp,
          swingStrength: Math.round(swingStrength),
          isSignificant: isSignificant,
        };
      });


      setPoints(mappedPoints);

      // Cache the result
      widgetDataCache.set(cacheKey, data);
    } catch (err) {
      console.error('❌ [HighLowPoints] Failed to fetch data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
      setChartData(null);
      chartDataRef.current = null;
      setPoints([]);
    } finally {
      setLoading(false);
    }
  }, [symbol, timeframe, getInterval]);

  const filteredPoints = selectedType === 'all'
    ? points
    : points.filter(point => point.type === selectedType);

  const sortedPoints = [...filteredPoints].sort((a, b) =>
    b.timestamp.getTime() - a.timestamp.getTime()
  );

  const getPointColor = (type: 'high' | 'low') => {
    return type === 'high' ? 'bg-red-500/20 border-red-500' : 'bg-green-500/20 border-green-500';
  };

  const getPointTextColor = (type: 'high' | 'low') => {
    return type === 'high' ? 'text-red-400' : 'text-green-400';
  };

  const formatTime = (date: Date) => {
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Initialize chart
  const initializeChart = useCallback(() => {
    if (!chartContainerRef.current || !chartData || isInitializingRef.current) {

      return;
    }

    isInitializingRef.current = true;
    isDisposedRef.current = false;

    // Clean up existing chart
    if (chartRef.current) {
      try {
        if (resizeObserverRef.current) {
          resizeObserverRef.current.disconnect();
          resizeObserverRef.current = null;
        }
        chartRef.current.remove();
      } catch (err) {
        console.warn('⚠️ [HighLowPoints] Error cleaning up chart:', err);
      }
      chartRef.current = null;
      candlestickSeriesRef.current = null;
      markersRef.current = [];
    }

    const container = chartContainerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;



    if (width === 0 || height === 0) {
      console.warn('⚠️ [HighLowPoints] Container has zero dimensions');
      isInitializingRef.current = false;
      return;
    }

    const chart = createChart(container, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: isDark ? '#0A0A0A' : '#ffffff' },
        textColor: isDark ? '#9D9D9D' : '#4b5563',
      },
      grid: {
        vertLines: { color: isDark ? '#1C2227' : '#e5e7eb' },
        horzLines: { color: isDark ? '#1C2227' : '#e5e7eb' },
      },
      rightPriceScale: {
        borderColor: isDark ? '#374151' : '#d1d5db',
        visible: true,
      },
      timeScale: {
        borderColor: isDark ? '#374151' : '#d1d5db',
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: {
        mode: 1,
      },
    });

    chartRef.current = chart;

    // Add candlestick series
    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderVisible: true,
      borderUpColor: '#22c55e',
      borderDownColor: '#ef4444',
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
      priceFormat: {
        type: 'price',
        precision: 4,
        minMove: 0.0001,
      },
    });

    candlestickSeriesRef.current = candlestickSeries;

    // Convert candle data to chart format, remove duplicates, and sort by time
    const timeMap = new Map<string, typeof chartData.candle[0]>();

    chartData.candle.forEach(candle => {
      const timeKey = timestampToTime(candle.label);
      timeMap.set(String(timeKey), candle);
    });

    // Convert to chart format and sort
    const chartCandles = Array.from(timeMap.values())
      .map(candle => ({
        time: timestampToTime(candle.label),
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
      }))
      .sort((a, b) => {
        const timeA = String(a.time);
        const timeB = String(b.time);
        return timeA.localeCompare(timeB);
      });



    if (chartCandles.length === 0) {
      console.warn('⚠️ [HighLowPoints] No valid candles after filtering/sorting');
      isInitializingRef.current = false;
      return;
    }

    try {
      candlestickSeries.setData(chartCandles);
    } catch (err) {
      console.error('❌ [HighLowPoints] Error setting chart data:', err);
      isInitializingRef.current = false;
      return;
    }

    // Add markers for high/low points
    const filteredHighLowPoints = selectedType === 'all'
      ? chartData.highlowx
      : chartData.highlowx.filter(point => {
        const isHigh = point.color === '#01B298';
        return selectedType === 'high' ? isHigh : !isHigh;
      });

    const markers = filteredHighLowPoints.map(point => ({
      time: timestampToTime(point.label),
      position: point.position as 'aboveBar' | 'belowBar',
      color: point.color,
      shape: (point.color === '#01B298' ? 'arrowDown' : 'arrowUp') as "arrowDown" | "arrowUp",
      text: `${point.color === '#01B298' ? 'H' : 'L'} ${parseFloat(point.value).toFixed(4)}`,
    }));


    candlestickSeries.setMarkers(markers as SeriesMarker<Time>[]);
    markersRef.current = markers;

    // Handle resize
    resizeObserverRef.current = new ResizeObserver(() => {
      try {
        if (chartRef.current && !isDisposedRef.current) {
          chartRef.current.timeScale().fitContent();
        }
      } catch (err) {
        if (!isDisposedRef.current) {
          console.warn('⚠️ [HighLowPoints] Error in resize observer:', err);
        }
      }
    });

    resizeObserverRef.current.observe(container);
    isInitializingRef.current = false;
  }, [chartData, timestampToTime, selectedType, isDark]);

  useEffect(() => {
    if (!chartRef.current) return;

    chartRef.current.applyOptions({
      layout: {
        background: { type: ColorType.Solid, color: isDark ? '#0A0A0A' : '#ffffff' },
        textColor: isDark ? '#9ca3af' : '#4b5563',
      },
      grid: {
        vertLines: { color: isDark ? '#1C2227' : '#e5e7eb' },
        horzLines: { color: isDark ? '#1C2227' : '#e5e7eb' },
      },
      rightPriceScale: {
        borderColor: isDark ? '#374151' : '#d1d5db',
        visible: true,
      },
      timeScale: {
        borderColor: isDark ? '#374151' : '#d1d5db',
        timeVisible: true,
        secondsVisible: false,
      },
    });
  }, [isDark]);

  // Fetch data on mount and when symbol/timeframe changes
  useEffect(() => {
    // Only fetch if symbol or timeframe has actually changed
    if (lastFetchedSymbolRef.current !== symbol || lastFetchedTimeframeRef.current !== timeframe) {
      hasFetchedRef.current = false; // Allow new fetch for different params
    }
    fetchData();
  }, [symbol, timeframe]); // Don't include fetchData to prevent infinite loop

  // Listen for TradingView WebSocket price updates
  useEffect(() => {
    const handlePriceUpdate = (payload: any) => {
      try {
        const updateSymbol = String(payload.symbol || payload.Symbol || payload.S || payload.s || '').toUpperCase();
        const price = Number(payload.price ?? payload.Price ?? payload.last ?? payload.Last ?? payload.close ?? payload.Close ?? payload.c);

        if (updateSymbol !== symbol.toUpperCase() || isNaN(price)) {
          return;
        }

        // Update the last candle in-memory using ref (not state) to avoid re-renders
        const currentData = chartDataRef.current;
        if (candlestickSeriesRef.current && currentData && currentData.candle && currentData.candle.length > 0) {
          const lastCandle = currentData.candle[currentData.candle.length - 1];
          const date = new Date(parseInt(lastCandle.label) * 1000);
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          const time = `${year}-${month}-${day}` as Time;
          
          const updatedCandle = {
            time,
            open: lastCandle.open,
            high: Math.max(lastCandle.high, price),
            low: Math.min(lastCandle.low, price),
            close: price,
          };

          candlestickSeriesRef.current.update(updatedCandle);
          console.log('📊 [HighLowPoints] Real-time price update:', { symbol: updateSymbol, price });
        }
      } catch (error) {
        console.error('📊 [HighLowPoints] Error handling price update:', error);
      }
    };

    // Connect to WebSocket and subscribe to symbol
    tradingViewWebSocket.connect().then(() => {
      tradingViewWebSocket.subscribe([symbol]);
      console.log('📊 [HighLowPoints] Subscribed to WebSocket for:', symbol);
    }).catch(error => {
      console.error('📊 [HighLowPoints] WebSocket connection error:', error);
    });

    // Register callback
    tradingViewWebSocket.onPriceUpdate(handlePriceUpdate);

    // Cleanup
    return () => {
      tradingViewWebSocket.removePriceUpdateCallback(handlePriceUpdate);
      tradingViewWebSocket.unsubscribe([symbol]);
      tradingViewWebSocket.disconnect();
    };
  }, [symbol]); // Only depend on symbol, use refs for data

  // Initialize chart when data is loaded
  useEffect(() => {
    if (chartData && chartData.candle && chartData.candle.length > 0) {
      isDisposedRef.current = false;

      // Clean up existing chart before initializing new one
      if (chartRef.current) {
        try {
          if (resizeObserverRef.current) {
            resizeObserverRef.current.disconnect();
            resizeObserverRef.current = null;
          }
          chartRef.current.remove();
        } catch (err) {
          console.warn('⚠️ [HighLowPoints] Error cleaning up old chart:', err);
        }
        chartRef.current = null;
        candlestickSeriesRef.current = null;
        markersRef.current = [];
      }

      // Wait for container to be ready
      let retryCount = 0;
      const maxRetries = 50;

      const checkAndInit = () => {
        if (isDisposedRef.current) return;

        const container = chartContainerRef.current;
        if (!container) {
          retryCount++;
          if (retryCount < maxRetries) {
            setTimeout(checkAndInit, 100);
          }
          return;
        }

        const { clientWidth, clientHeight } = container;

        if (clientWidth > 0 && clientHeight > 0) {
          // Container has dimensions, use requestAnimationFrame to ensure layout is applied
          requestAnimationFrame(() => {
            if (!isDisposedRef.current && chartContainerRef.current) {

              initializeChart();
            }
          });
        } else {
          retryCount++;
          if (retryCount < maxRetries) {

            setTimeout(checkAndInit, 100);
          } else {
            console.warn('⚠️ [HighLowPoints] Max retries reached, container still has zero dimensions');
          }
        }
      };

      // Start checking
      requestAnimationFrame(checkAndInit);

      return () => {
        isInitializingRef.current = false;
      };
    }
  }, [chartData, initializeChart]);

  // Update markers when filter changes
  useEffect(() => {
    if (candlestickSeriesRef.current && chartData && chartData.highlowx) {
      const filteredHighLowPoints = selectedType === 'all'
        ? chartData.highlowx
        : chartData.highlowx.filter(point => {
          const isHigh = point.color === '#01B298';
          return selectedType === 'high' ? isHigh : !isHigh;
        });

      const markers = filteredHighLowPoints.map(point => ({
        time: timestampToTime(point.label),
        position: point.position as 'aboveBar' | 'belowBar',
        color: point.color,
        shape: (point.color === '#01B298' ? 'arrowDown' : 'arrowUp') as "arrowDown" | "arrowUp",
        text: `${point.color === '#01B298' ? 'H' : 'L'} ${parseFloat(point.value).toFixed(4)}`,
      }));

      candlestickSeriesRef.current.setMarkers(markers as SeriesMarker<Time>[]);
      markersRef.current = markers;
    }
  }, [selectedType, chartData, timestampToTime]);

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      isDisposedRef.current = true;
      isInitializingRef.current = false;
      try {
        if (resizeObserverRef.current) {
          resizeObserverRef.current.disconnect();
          resizeObserverRef.current = null;
        }
        if (chartRef.current) {
          try {
            chartRef.current.remove();
          } catch (removeErr) {
            // Chart may already be disposed
          }
          chartRef.current = null;
        }
        candlestickSeriesRef.current = null;
        markersRef.current = [];
      } catch (err) {
        // Ignore cleanup errors
      }
    };
  }, []);

  return (
    <div className="flex flex-col h-full w-full bg-widget-body overflow-hidden" style={{ minHeight: 0 }}>
      <WidgetHeader
        title="High and Low Points"
        onRemove={onRemove}
        onSettings={() => setShowSettings(true)}
        onFullscreen={onFullscreen}
        helpContent="Track and display significant high and low price points with swing analysis. Identify swing highs and lows to understand market structure and trend direction. Points are automatically detected based on price action patterns."
      />

      <WidgetSettingsSlideIn
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        widgetType="high-and-low-points"
        widgetPosition={wgid || "high-and-low-points"}
        widgetInstanceId={wgid}
        currentSettings={widgetSettings}
        onSave={handleSaveSettings}
      />

      <div className="flex-1 flex flex-col p-4 overflow-hidden min-h-0 w-full" style={{ minHeight: 0 }}>
        {/* Filter Buttons */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setSelectedType('all')}
            className={`px-3 py-1.5 text-xs rounded transition-colors ${selectedType === 'all'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
          >
            All Points
          </button>
          <button
            onClick={() => setSelectedType('high')}
            className={`px-3 py-1.5 text-xs rounded transition-colors flex items-center gap-1 ${selectedType === 'high'
              ? 'bg-red-500 text-white'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
          >
            <TrendingUp className="w-3 h-3" />
            Highs
          </button>
          <button
            onClick={() => setSelectedType('low')}
            className={`px-3 py-1.5 text-xs rounded transition-colors flex items-center gap-1 ${selectedType === 'low'
              ? 'bg-green-500 text-white'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
          >
            <TrendingDown className="w-3 h-3" />
            Lows
          </button>
        </div>

        {/* Chart Area */}
        <div
          ref={chartContainerRef}
          className="flex-1 bg-widget-body rounded border border-border mb-4 flex items-center justify-center relative overflow-hidden"
          style={{ width: '100%', minHeight: '300px', flex: '1 1 auto' }}
        >
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-sm text-muted-foreground">Loading chart data...</p>
              </div>
            </div>
          ) : error ? (
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <div className="text-center">
                <p className="text-sm text-destructive mb-2">{error}</p>
              </div>
            </div>
          ) : points.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <p className="text-sm text-muted-foreground">No data available</p>
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center z-10 opacity-0 pointer-events-none">
              <p className="text-xs text-muted-foreground">Chart loading...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

