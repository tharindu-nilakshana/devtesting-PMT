"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createChart, ColorType, type IChartApi, type ISeriesApi, type Time } from 'lightweight-charts';
import { WidgetHeader } from '@/components/bloomberg-ui/WidgetHeader';
import { WidgetSettingsSlideIn, type WidgetSettings } from '@/components/bloomberg-ui/WidgetSettingsSlideIn';
import { fetchSupplyDemandAreas, type SupplyDemandAreaData } from './api';
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

interface SupplyDemandZone {
  id: string;
  type: 'supply' | 'demand';
  price: number;
  strength: number;
  timestamp: Date;
  touched: number;
  startTime: Time;
  endTime: Time;
}

export default function SupplyDemandAreasWidget({
  wgid = 'supply-demand-areas',
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

  const [zones, setZones] = useState<SupplyDemandZone[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<'supply' | 'demand' | 'all'>('all');
  const [chartData, setChartData] = useState<SupplyDemandAreaData | null>(null);

  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const isInitializingRef = useRef<boolean>(false);
  const isDisposedRef = useRef<boolean>(false);
  const chartDataRef = useRef<SupplyDemandAreaData | null>(null);
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

        console.log('📡 [SupplyDemandAreas] Calling updateWidgetFields API:', {
          widgetId: wgid,
          templateId: activeTemplateId,
          updateFields
        });

        const result = await updateWidgetFields(wgid, activeTemplateId, updateFields);

        if (result.success) {
          console.log('✅ [SupplyDemandAreas] Settings saved to database');
        } else {
          console.warn('⚠️ [SupplyDemandAreas] Failed to save settings:', result.message);
        }
      } catch (error) {
        console.error('❌ [SupplyDemandAreas] Error saving settings to database:', error);
      }
    }
  };

  // Convert interval format (1d, 1h, 1w) to API format
  const getInterval = useCallback(() => {
    if (timeframe === '1h') return '1h';
    if (timeframe === '1w') return '1w';
    return '1d'; // default
  }, [timeframe]);

  // Convert date string to Time format for Lightweight Charts
  // Format: "2024-07-17" -> "2024-07-17" (keep yyyy-mm-dd format)
  const dateToTime = useCallback((dateStr: string): Time => {
    // If already in yyyy-mm-dd format, return as is
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr as Time;
    }
    // Try to parse and format to yyyy-mm-dd
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}` as Time;
    }
    // Fallback: return today's date
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}` as Time;
  }, []);

  // Calculate supply and demand zones from price action
  const calculateZones = useCallback((data: SupplyDemandAreaData): SupplyDemandZone[] => {
    const zones: SupplyDemandZone[] = [];
    const candles = data.candle;

    if (candles.length < 10) return zones;

    // Find significant price levels (support/resistance)
    // Look for areas where price bounced multiple times
    const priceLevels = new Map<number, { type: 'supply' | 'demand'; touches: number; times: Time[] }>();

    // Analyze price action to find zones
    for (let i = 5; i < candles.length - 5; i++) {
      const candle = candles[i];
      const lookback = candles.slice(Math.max(0, i - 10), i);
      const lookforward = candles.slice(i + 1, Math.min(candles.length, i + 10));

      // Check for demand zones (support) - price bounced up from this level
      const low = candle.low;
      const nearbyLows = lookback.filter(c => Math.abs(c.low - low) / low < 0.001);
      const bouncesUp = lookforward.some(c => c.close > low * 1.002); // Price moved up 0.2%+

      if (nearbyLows.length >= 2 && bouncesUp) {
        const key = Math.round(low * 10000) / 10000; // Round to 4 decimals
        if (!priceLevels.has(key)) {
          priceLevels.set(key, { type: 'demand', touches: 0, times: [] });
        }
        const level = priceLevels.get(key)!;
        level.touches += nearbyLows.length;
        level.times.push(dateToTime(candle.label));
      }

      // Check for supply zones (resistance) - price bounced down from this level
      const high = candle.high;
      const nearbyHighs = lookback.filter(c => Math.abs(c.high - high) / high < 0.001);
      const bouncesDown = lookforward.some(c => c.close < high * 0.998); // Price moved down 0.2%+

      if (nearbyHighs.length >= 2 && bouncesDown) {
        const key = Math.round(high * 10000) / 10000;
        if (!priceLevels.has(key)) {
          priceLevels.set(key, { type: 'supply', touches: 0, times: [] });
        }
        const level = priceLevels.get(key)!;
        level.touches += nearbyHighs.length;
        level.times.push(dateToTime(candle.label));
      }
    }

    // Convert price levels to zones
    let zoneId = 1;
    priceLevels.forEach((level, price) => {
      if (level.touches >= 2) {
        zones.push({
          id: `zone-${zoneId++}`,
          type: level.type,
          price: price,
          strength: Math.min(100, level.touches * 20),
          timestamp: new Date(),
          touched: level.touches,
          startTime: level.times[0],
          endTime: level.times[level.times.length - 1],
        });
      }
    });

    // Sort by strength (most significant first)
    return zones.sort((a, b) => b.strength - a.strength).slice(0, 10); // Top 10 zones
  }, [dateToTime]);

  // Fetch data from API
  const fetchData = useCallback(async () => {
    // Check cache first
    const interval = getInterval();
    const cacheKey = widgetDataCache.generateKey('supplydemandareas', { symbol, interval });
    const cachedData = widgetDataCache.get<SupplyDemandAreaData>(cacheKey);
    if (cachedData) {
      console.log('✅ [SupplyDemandAreas] Using cached data');
      chartDataRef.current = cachedData;
      setChartData(cachedData);
      const calculatedZones = calculateZones(cachedData);
      setZones(calculatedZones);
      setLoading(false);
      return;
    }

    // Prevent duplicate fetches for the same symbol/timeframe
    if (hasFetchedRef.current && 
        lastFetchedSymbolRef.current === symbol && 
        lastFetchedTimeframeRef.current === timeframe) {
      console.log('🚫 [SupplyDemandAreas] Skipping duplicate fetch');
      return;
    }
    
    hasFetchedRef.current = true;
    lastFetchedSymbolRef.current = symbol;
    lastFetchedTimeframeRef.current = timeframe;
    setLoading(true);
    setError(null);

    try {
      const tvSymbol = symbol.startsWith('FX:') ? symbol : `FX:${symbol}`;

      const data = await fetchSupplyDemandAreas({
        Symbol: symbol,
        TVSymbol: tvSymbol,
        Interval: interval,
      });



      if (!data.candle || data.candle.length === 0) {
        throw new Error('No candle data received from API');
      }

      chartDataRef.current = data; // Store in ref for WebSocket updates
      setChartData(data);
      const calculatedZones = calculateZones(data);

      setZones(calculatedZones);

      // Cache the result
      widgetDataCache.set(cacheKey, data);
    } catch (err) {
      console.error('❌ [SupplyDemandAreas] Failed to fetch data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
      setChartData(null);
      chartDataRef.current = null;
      setZones([]);
    } finally {
      setLoading(false);
    }
  }, [symbol, timeframe, calculateZones, getInterval]);

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
          
          // Parse the date string to Time format
          let time: Time;
          if (/^\d{4}-\d{2}-\d{2}$/.test(lastCandle.label)) {
            time = lastCandle.label as Time;
          } else {
            const date = new Date(lastCandle.label);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            time = `${year}-${month}-${day}` as Time;
          }
          
          const updatedCandle = {
            time,
            open: lastCandle.open,
            high: Math.max(lastCandle.high, price),
            low: Math.min(lastCandle.low, price),
            close: price,
          };

          candlestickSeriesRef.current.update(updatedCandle);
          console.log('📊 [SupplyDemandAreas] Real-time price update:', { symbol: updateSymbol, price });
        }
      } catch (error) {
        console.error('📊 [SupplyDemandAreas] Error handling price update:', error);
      }
    };

    // Connect to WebSocket and subscribe to symbol
    tradingViewWebSocket.connect().then(() => {
      tradingViewWebSocket.subscribe([symbol]);
      console.log('📊 [SupplyDemandAreas] Subscribed to WebSocket for:', symbol);
    }).catch(error => {
      console.error('📊 [SupplyDemandAreas] WebSocket connection error:', error);
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

  const priceLinesRef = useRef<any[]>([]);

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
        // Check if chart is still valid before removing
        try {
          chartRef.current.remove();
        } catch (removeErr) {
          // Chart may already be disposed
          console.warn('⚠️ [SupplyDemandAreas] Chart already disposed during cleanup');
        }
      } catch (err) {
        // Chart may already be disposed, ignore error
        console.warn('⚠️ [SupplyDemandAreas] Error cleaning up chart:', err);
      }
      chartRef.current = null;
      candlestickSeriesRef.current = null;
      priceLinesRef.current = [];
    }

    const container = chartContainerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;



    if (width === 0 || height === 0) {
      console.warn('⚠️ [SupplyDemandAreas] Container has zero dimensions');
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

    // First pass: collect unique candles by time (keep last occurrence if duplicates)
    chartData.candle.forEach(candle => {
      const timeKey = dateToTime(candle.label);
      timeMap.set(String(timeKey), candle);
    });

    // Convert to chart format and sort
    const chartCandles = Array.from(timeMap.values())
      .map(candle => ({
        time: dateToTime(candle.label),
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
      }))
      .sort((a, b) => {
        // Sort by time - for date strings (yyyy-mm-dd), string comparison works
        const timeA = String(a.time);
        const timeB = String(b.time);
        return timeA.localeCompare(timeB);
      });



    if (chartCandles.length === 0) {
      console.warn('⚠️ [SupplyDemandAreas] No valid candles after filtering/sorting');
      isInitializingRef.current = false;
      return;
    }

    try {
      candlestickSeries.setData(chartCandles);
    } catch (err) {
      console.error('❌ [SupplyDemandAreas] Error setting chart data:', err);
      isInitializingRef.current = false;
      return;
    }

    // Handle resize - with autoSize, we just need to observe
    resizeObserverRef.current = new ResizeObserver(() => {
      // Chart will auto-resize with autoSize: true
      // But we can force a resize if needed
      try {
        if (chartRef.current && !isDisposedRef.current) {
          chartRef.current.timeScale().fitContent();
        }
      } catch (err) {
        // Chart may be disposed, ignore error
        if (!isDisposedRef.current) {
          console.warn('⚠️ [SupplyDemandAreas] Error in resize observer:', err);
        }
      }
    });

    resizeObserverRef.current.observe(container);
    isInitializingRef.current = false;
  }, [chartData, dateToTime, isDark]);

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

  // Update price lines when zones or filter changes
  const updatePriceLines = useCallback(() => {
    if (!candlestickSeriesRef.current || isDisposedRef.current) return;

    try {
      // Remove existing price lines
      priceLinesRef.current.forEach(line => {
        try {
          if (candlestickSeriesRef.current && !isDisposedRef.current) {
            candlestickSeriesRef.current.removePriceLine(line);
          }
        } catch (err) {
          // Price line may already be removed, ignore
        }
      });
      priceLinesRef.current = [];

      // Add new price lines for filtered zones
      const filteredZones = selectedType === 'all'
        ? zones
        : zones.filter(zone => zone.type === selectedType);

      filteredZones.forEach((zone) => {
        if (candlestickSeriesRef.current && !isDisposedRef.current) {
          try {
            const color = zone.type === 'supply' ? '#ef4444' : '#22c55e';
            const priceLine = candlestickSeriesRef.current.createPriceLine({
              price: zone.price,
              color: color,
              lineWidth: 2,
              lineStyle: 2, // Dashed
              axisLabelVisible: true,
              title: `${zone.type.toUpperCase()} - ${zone.price.toFixed(4)}`,
            });
            priceLinesRef.current.push(priceLine);
          } catch (err) {
            console.warn('⚠️ [SupplyDemandAreas] Error creating price line:', err);
          }
        }
      });
    } catch (err) {
      if (!isDisposedRef.current) {
        console.warn('⚠️ [SupplyDemandAreas] Error updating price lines:', err);
      }
    }
  }, [zones, selectedType]);

  // Fetch data on mount and when symbol/timeframe changes (including from settings)
  useEffect(() => {
    // Only fetch if symbol or timeframe has actually changed
    if (lastFetchedSymbolRef.current !== symbol || lastFetchedTimeframeRef.current !== timeframe) {
      hasFetchedRef.current = false; // Allow new fetch for different params
    }
    fetchData();
  }, [symbol, timeframe]); // Don't include fetchData to prevent infinite loop

  // Initialize chart when data is loaded
  useEffect(() => {
    if (chartData && chartData.candle && chartData.candle.length > 0) {
      // Reset disposal flag when new data arrives
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
          console.warn('⚠️ [SupplyDemandAreas] Error cleaning up old chart:', err);
        }
        chartRef.current = null;
        candlestickSeriesRef.current = null;
        priceLinesRef.current = [];
      }

      // Wait for container to be ready and have dimensions
      let retryCount = 0;
      const maxRetries = 50; // Max 5 seconds

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
            console.warn('⚠️ [SupplyDemandAreas] Max retries reached, container still has zero dimensions');
          }
        }
      };

      // Start checking
      requestAnimationFrame(checkAndInit);

      return () => {
        // Cleanup check if component unmounts
        isInitializingRef.current = false;
      };
    }
  }, [chartData, initializeChart]);

  // Cleanup on component unmount only
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
        priceLinesRef.current = [];
      } catch (err) {
        // Ignore cleanup errors
      }
    };
  }, []);

  // Update price lines when zones or filter changes, or when chart is ready
  useEffect(() => {
    // Wait a bit to ensure chart is fully initialized before adding price lines
    const timer = setTimeout(() => {
      if (candlestickSeriesRef.current && zones.length > 0 && !isDisposedRef.current) {
        updatePriceLines();
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [zones, selectedType, updatePriceLines, chartData]);

  const filteredZones = selectedType === 'all'
    ? zones
    : zones.filter(zone => zone.type === selectedType);

  const getZoneColor = (type: 'supply' | 'demand') => {
    return type === 'supply' ? 'bg-red-500/20 border-red-500' : 'bg-green-500/20 border-green-500';
  };

  const getZoneTextColor = (type: 'supply' | 'demand') => {
    return type === 'supply' ? 'text-red-400' : 'text-green-400';
  };

  return (
    <div className="flex flex-col h-full w-full bg-widget-body overflow-hidden" style={{ minHeight: 0 }}>
      <WidgetHeader
        title="Supply and Demand Areas"
        onRemove={onRemove}
        onSettings={() => setShowSettings(true)}
        onFullscreen={onFullscreen}
        helpContent="Identify and visualize supply and demand zones on price charts. Supply zones are areas where selling pressure is likely, while demand zones indicate buying interest. Zones are automatically detected based on price action and can be manually adjusted."
      />

      <WidgetSettingsSlideIn
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        widgetType="supply-and-demand-areas"
        widgetPosition={wgid || "supply-and-demand-areas"}
        widgetInstanceId={wgid}
        currentSettings={widgetSettings}
        onSave={handleSaveSettings}
      />

      <div className="flex-1 flex flex-col p-4 overflow-hidden min-h-0 w-full" style={{ minHeight: 0 }}>
        {/* Filter Buttons */}
        <div className="flex gap-2 mb-4 flex-shrink-0">
          <button
            onClick={() => setSelectedType('all')}
            className={`px-3 py-1.5 text-xs rounded transition-colors ${selectedType === 'all'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
          >
            All Zones
          </button>
          <button
            onClick={() => setSelectedType('supply')}
            className={`px-3 py-1.5 text-xs rounded transition-colors ${selectedType === 'supply'
              ? 'bg-red-500 text-white'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
          >
            Supply
          </button>
          <button
            onClick={() => setSelectedType('demand')}
            className={`px-3 py-1.5 text-xs rounded transition-colors ${selectedType === 'demand'
              ? 'bg-green-500 text-white'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
          >
            Demand
          </button>
        </div>

        {/* Chart Area */}
        <div
          ref={chartContainerRef}
          className="flex-1 bg-widget-body rounded border border-border mb-4 relative overflow-hidden"
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
                <button
                  onClick={fetchData}
                  className="text-xs text-primary hover:underline"
                >
                  Retry
                </button>
              </div>
            </div>
          ) : !chartData ? (
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <p className="text-sm text-muted-foreground">No data available</p>
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center z-10 opacity-0 pointer-events-none">
              <p className="text-xs text-muted-foreground">Chart loading...</p>
            </div>
          )}
        </div>

        {/* Zones List */}
        <div className="border-t border-border pt-4">
          <div className="mb-2">
            <span className="text-xs text-muted-foreground tracking-wide">
              ACTIVE ZONES ({filteredZones.length})
            </span>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
            {filteredZones.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground text-xs">
                No zones found
              </div>
            ) : (
              filteredZones.map((zone) => (
                <div
                  key={zone.id}
                  className={`p-3 rounded border ${getZoneColor(zone.type)}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-semibold uppercase ${getZoneTextColor(zone.type)}`}>
                        {zone.type}
                      </span>
                      <span className="text-xs text-foreground font-mono">
                        {zone.price.toFixed(5)}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      Strength: {zone.strength}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Touched: {zone.touched}x</span>
                    <span>{zone.timestamp.toLocaleTimeString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

