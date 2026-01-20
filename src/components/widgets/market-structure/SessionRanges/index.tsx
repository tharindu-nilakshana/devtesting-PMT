/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createChart, ColorType, type IChartApi, type ISeriesApi, type Time, type CandlestickData } from 'lightweight-charts';
import { 
  fetchTradingViewData, 
  type TradingViewResponse,
  getUnixForDaysAgo,
  getCurrentUnixTimestamp
} from '@/components/widgets/price-charts/TradingViewWidget/api';
import { WidgetHeader } from '@/components/bloomberg-ui/WidgetHeader';
import { WidgetSettingsSlideIn, type WidgetSettings } from '@/components/bloomberg-ui/WidgetSettingsSlideIn';
import { useTemplates } from '@/hooks/useTemplates';
import { 
  fetchLiquidityRange, 
  fetchAllPeriodOpenValues,
  type LiquidityRangeData, 
  type PeriodOpenValue 
} from './api';
import { getSymbolShortFormat } from '@/utils/symbolMapping';
import { useTheme } from '@/hooks/useTheme';
import tradingViewWebSocket from '@/utils/tradingViewWebSocket';
import { widgetDataCache } from '@/lib/widgetDataCache';

interface Props {
  wgid?: string;
  onRemove?: () => void;
  onSettings?: () => void;
  onFullscreen?: () => void;
  symbol?: string;
  module?: string;
  settings?: WidgetSettings;
}

type SessionType = 'liquidity-range' | 'open-values';

interface SessionRange {
  id: string;
  type: 'asian' | 'london' | 'new-york';
  session: string;
  high: number;
  low: number;
  open: number;
  close: number;
  datetime: string;
  label: string;
}

// Session configuration with colors
const SESSION_CONFIG: Record<string, { label: string; color: string }> = {
  'Asian': { label: 'Asian Session', color: '#3b82f6' },
  'London': { label: 'London Session', color: '#22c55e' },
  'New York': { label: 'New York Session', color: '#f59e0b' },
  'asian': { label: 'Asian Session', color: '#3b82f6' },
  'london': { label: 'London Session', color: '#22c55e' },
  'new-york': { label: 'New York Session', color: '#f59e0b' },
};

export default function SessionRangesWidget({
  wgid = 'session-ranges',
  onRemove,
  onSettings,
  onFullscreen,
  symbol: propSymbol = 'EURUSD',
  module: propModule = 'Forex',
  settings
}: Props) {
  const { isDark } = useTheme();
  const { activeTemplateId, updateWidgetFields } = useTemplates();
  
  const [showSettings, setShowSettings] = useState(false);
  const [widgetSettings, setWidgetSettings] = useState<WidgetSettings>(() => ({
    ...settings,
    module: settings?.module || propModule,
    symbol: settings?.symbol || propSymbol,
  }));
  
  // Use widgetSettings for current values
  const symbol = widgetSettings.symbol || propSymbol;
  const module = widgetSettings.module || propModule;

  const [sessionType, setSessionType] = useState<SessionType>('liquidity-range');
  const [sessions, setSessions] = useState<SessionRange[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rawData, setRawData] = useState<LiquidityRangeData[] | null>(null);
  const [periodOpenValues, setPeriodOpenValues] = useState<PeriodOpenValue[]>([]);
  const [chartLoading, setChartLoading] = useState(false);

  // Lightweight charts refs
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const priceLinesRef = useRef<any[]>([]);
  const candleDataRef = useRef<CandlestickData[]>([]);
  const hasFetchedRef = useRef<boolean>(false);
  const hasFetchedCandlesRef = useRef<boolean>(false);
  const lastFetchedSymbolRef = useRef<string>('');
  const lastFetchedSessionTypeRef = useRef<string>('');

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
        const updateFields: any = {
          module: newSettings.module || "Forex",
          symbols: newSettings.symbol || "EURUSD"
        };

        console.log('📡 [SessionRanges] Calling updateWidgetFields API:', {
          widgetId: wgid,
          templateId: activeTemplateId,
          updateFields
        });

        const result = await updateWidgetFields(wgid, activeTemplateId, updateFields);

        if (result.success) {
          console.log('✅ [SessionRanges] Settings saved to database');
        } else {
          console.warn('⚠️ [SessionRanges] Failed to save settings:', result.message);
        }
      } catch (error) {
        console.error('❌ [SessionRanges] Error saving settings to database:', error);
      }
    }
  };

  // Get current datetime in required format for liquidity range
  const getCurrentDateTime = useCallback(() => {
    // Date calculation logic for liquidity range based on DST and weekends
    const todaysDate = new Date();
    const now = new Date();
    
    // Get user timezone (using browser's timezone)
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    // Create date formatter for the user's timezone
    const getOffset = (date: Date) => {
      // Get offset in minutes for a specific date
      const utcDate = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
      const localDate = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
      return (localDate - utcDate) / 60000; // Convert to minutes
    };
    
    // Get current offset
    const currentOffset = -now.getTimezoneOffset(); // Negative because getTimezoneOffset returns opposite sign
    
    // Get standard time offset (using January 1st as reference)
    const standardTimeDate = new Date(now.getFullYear(), 0, 1);
    const standardOffset = -standardTimeDate.getTimezoneOffset();
    
    // Calculate offset difference in hours
    const offsetDifference = (currentOffset - standardOffset) / 60;
    
    // Check UTC hours
    const hours = todaysDate.getUTCHours();
    
    // Go back a day if before cutoff time (7 UTC in DST, 8 UTC in standard time)
    if (currentOffset > standardOffset) {
      if (hours < 7) {
        todaysDate.setUTCDate(todaysDate.getUTCDate() - 1);
      }
    } else {
      if (hours < 8) {
        todaysDate.setUTCDate(todaysDate.getUTCDate() - 1);
      }
    }
    
    // Handle weekends - go back to Friday
    const dayOfWeek = todaysDate.getUTCDay();
    if (dayOfWeek === 6) { // Saturday
      todaysDate.setUTCDate(todaysDate.getUTCDate() - 1);
    } else if (dayOfWeek === 0) { // Sunday
      todaysDate.setUTCDate(todaysDate.getUTCDate() - 2);
    }
    
    // Build date string
    const month = (todaysDate.getMonth() + 1).toString().padStart(2, '0');
    const day = todaysDate.getUTCDate().toString().padStart(2, '0');
    const year = todaysDate.getFullYear();
    
    // Calculate hour (07 normally, adjusted for DST)
    let hourStr = '07';
    if (currentOffset > standardOffset) {
      const adjustedHour = 7 - offsetDifference;
      hourStr = adjustedHour.toString().padStart(2, '0');
    }
    
    const dateString = `${year}-${month}-${day} ${hourStr}:00:00`;
    
    return dateString;
  }, []);

  // Map session name to type
  const getSessionType = useCallback((sessionName: string): 'asian' | 'london' | 'new-york' => {
    const normalized = sessionName.toLowerCase();
    if (normalized.includes('asian') || normalized.includes('asia')) return 'asian';
    if (normalized.includes('london') || normalized.includes('europe')) return 'london';
    if (normalized.includes('new york') || normalized.includes('ny') || normalized.includes('america')) return 'new-york';
    return 'asian'; // default
  }, []);

  // Convert API data to SessionRange format
  const convertToSessionRanges = useCallback((data: LiquidityRangeData[]): SessionRange[] => {
    return data.map((item, index) => {
      const sessionName = item.session || 'Unknown';
      const sessionTypeValue = getSessionType(sessionName);
      const config = SESSION_CONFIG[sessionName] || SESSION_CONFIG[sessionTypeValue];
      
      return {
        id: `session-${index}`,
        type: sessionTypeValue,
        session: sessionName,
        high: item.high ?? 0,
        low: item.low ?? 0,
        open: item.open ?? 0,
        close: item.close ?? 0,
        datetime: item.datetime || '',
        label: config?.label || sessionName,
      };
    });
  }, [getSessionType]);

  // Fetch data from API
  const fetchData = useCallback(async () => {
    // Check cache first
    const cacheKey = widgetDataCache.generateKey('sessionranges', { symbol, sessionType });
    const cachedData = widgetDataCache.get<any>(cacheKey);
    if (cachedData) {
      console.log('✅ [SessionRanges] Using cached data');
      if (sessionType === 'liquidity-range') {
        setRawData(cachedData);
        const convertedSessions = convertToSessionRanges(cachedData);
        setSessions(convertedSessions);
        setPeriodOpenValues([]);
      } else {
        setPeriodOpenValues(cachedData);
        setRawData(null);
        setSessions([]);
      }
      setLoading(false);
      return;
    }

    // Prevent duplicate fetches for the same symbol/sessionType
    if (hasFetchedRef.current && 
        lastFetchedSymbolRef.current === symbol && 
        lastFetchedSessionTypeRef.current === sessionType) {
      console.log('🚫 [SessionRanges] Skipping duplicate fetch');
      return;
    }
    
    hasFetchedRef.current = true;
    lastFetchedSymbolRef.current = symbol;
    lastFetchedSessionTypeRef.current = sessionType;
    setLoading(true);
    setError(null);

    try {
      if (sessionType === 'liquidity-range') {
        // Fetch liquidity range data
        const data = await fetchLiquidityRange({
          day: getCurrentDateTime(),
          symbol: symbol,
        });

        if (!data || data.length === 0) {
          throw new Error('No liquidity range data received from API');
        }

        setRawData(data);
        const convertedSessions = convertToSessionRanges(data);
        setSessions(convertedSessions);
        setPeriodOpenValues([]);

        // Cache the result
        widgetDataCache.set(cacheKey, data);
      } else {
        // Fetch open values data for all periods (daily, weekly, monthly, quarterly)
        const periodData = await fetchAllPeriodOpenValues(symbol);

        if (!periodData || periodData.length === 0) {
          throw new Error('No open values data received from API');
        }

        setPeriodOpenValues(periodData);
        setRawData(null);
        setSessions([]);

        // Cache the result
        widgetDataCache.set(cacheKey, periodData);
      }
    } catch (err) {
      console.error('❌ [SessionRanges] Failed to fetch data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
      setRawData(null);
      setSessions([]);
      setPeriodOpenValues([]);
    } finally {
      setLoading(false);
    }
  }, [symbol, sessionType, getCurrentDateTime, convertToSessionRanges]);

  // Fetch candlestick data from API
  const fetchCandleData = useCallback(async () => {
    if (!symbol) return;
    
    // Prevent duplicate fetches
    if (hasFetchedCandlesRef.current) {
      console.log('🚫 [SessionRanges] Skipping duplicate candle fetch');
      return;
    }
    
    hasFetchedCandlesRef.current = true;
    setChartLoading(true);
    try {
      const resolution = '5';
      const from = 30844800;
      const to = getCurrentUnixTimestamp();

      const response: TradingViewResponse = await fetchTradingViewData(
        symbol,
        resolution,
        from,
        to,
        false
      );

      if (!response.success || !response.data || response.data.length === 0) {
        console.warn('⚠️ [SessionRanges] No candle data received');
        return;
      }

      const candleData: CandlestickData[] = [];
      response.data.forEach((candle) => {
        const time = Number(candle.intervals);
        const timeInSeconds = time > 1e12 ? Math.floor(time / 1000) : time;
        const open = parseFloat(candle.open);
        const high = parseFloat(candle.high);
        const low = parseFloat(candle.low);
        const close = parseFloat(candle.close);

        if (Number.isFinite(open) && Number.isFinite(high) && Number.isFinite(low) && Number.isFinite(close)) {
          candleData.push({ time: timeInSeconds as Time, open, high, low, close });
        }
      });

      candleData.sort((a, b) => (a.time as number) - (b.time as number));
      candleDataRef.current = candleData;

      if (candleSeriesRef.current && candleData.length > 0) {
        candleSeriesRef.current.setData(candleData);
        chartRef.current?.timeScale().fitContent();
      }

      console.log('✅ [SessionRanges] Candle data loaded:', candleData.length, 'candles');
    } catch (err) {
      console.error('❌ [SessionRanges] Failed to fetch candle data:', err);
    } finally {
      setChartLoading(false);
    }
  }, [symbol]);

  // Initialize lightweight chart
  const initializeChart = useCallback(() => {
    if (!chartContainerRef.current) return;

    // Clean up existing chart
    if (chartRef.current) {
      try {
        chartRef.current.remove();
      } catch (e) {
        // Chart may already be removed
      }
      chartRef.current = null;
      candleSeriesRef.current = null;
      priceLinesRef.current = [];
    }

    const container = chartContainerRef.current;
    if (container.clientWidth === 0 || container.clientHeight === 0) return;

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
      crosshair: { mode: 1 },
    });

    chartRef.current = chart;

    const candleSeries = chart.addCandlestickSeries({
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderUpColor: '#26a69a',
      borderDownColor: '#ef5350',
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
      priceFormat: { type: 'price', precision: 5, minMove: 0.00001 },
    });

    candleSeriesRef.current = candleSeries;

    // Apply existing candle data
    if (candleDataRef.current.length > 0) {
      candleSeries.setData(candleDataRef.current);
    }

    // Draw price lines and rectangle based on session data
    const rangeColor = '#ff9800';
    let rangeHigh = 0;
    let rangeLow = 0;
    let hasValidRange = false;

    sessions.forEach((session) => {
      if (session.high !== session.low && session.high > 0 && session.low > 0 && !hasValidRange) {
        rangeHigh = session.high;
        rangeLow = session.low;
        hasValidRange = true;
      }
    });

    if (sessionType === 'liquidity-range' && hasValidRange) {
      const rangeValue = rangeHigh - rangeLow;

      // Range Max line
      const highLine = candleSeries.createPriceLine({
        price: rangeHigh,
        color: rangeColor,
        lineWidth: 2,
        lineStyle: 2,
        axisLabelVisible: true,
        title: 'Range Max',
      });
      priceLinesRef.current.push(highLine);

      // Range Min line
      const lowLine = candleSeries.createPriceLine({
        price: rangeLow,
        color: rangeColor,
        lineWidth: 2,
        lineStyle: 2,
        axisLabelVisible: true,
        title: 'Range Min',
      });
      priceLinesRef.current.push(lowLine);

      // Extension lines above
      for (let i = 1; i <= 3; i++) {
        const extLine = candleSeries.createPriceLine({
          price: rangeHigh + (rangeValue * i),
          color: rangeColor,
          lineWidth: 1,
          lineStyle: 2,
          axisLabelVisible: true,
          title: `+${i}R`,
        });
        priceLinesRef.current.push(extLine);
      }

      // Extension lines below
      for (let j = 1; j <= 3; j++) {
        const extLine = candleSeries.createPriceLine({
          price: rangeLow - (rangeValue * j),
          color: rangeColor,
          lineWidth: 1,
          lineStyle: 2,
          axisLabelVisible: true,
          title: `-${j}R`,
        });
        priceLinesRef.current.push(extLine);
      }

      // Draw filled rectangle for the liquidity range hour (7:00-8:00 UTC adjusted for DST)
      if (candleDataRef.current.length > 0) {
        // Calculate DST offset using native JS
        const now = new Date();
        const jan = new Date(now.getFullYear(), 0, 1);
        const currentOffsetMinutes = -now.getTimezoneOffset();
        const standardOffsetMinutes = -jan.getTimezoneOffset();
        const offsetDifferenceHours = (currentOffsetMinutes - standardOffsetMinutes) / 60;
        const isDST = currentOffsetMinutes > standardOffsetMinutes;

        const hours = now.getUTCHours();

        // Determine the base hour for the range (7 UTC, adjusted for DST)
        const baseHour = isDST ? 7 - offsetDifferenceHours : 7;
        const checkHour = isDST ? 7 : 8;

        // Calculate rectangle start time (7:00 UTC adjusted)
        const rectStartDate = new Date(Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth(),
          now.getUTCDate(),
          baseHour, 0, 0, 0
        ));

        // Calculate rectangle end time (8:00 UTC adjusted)
        const rectEndDate = new Date(Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth(),
          now.getUTCDate(),
          baseHour + 1, 0, 0, 0
        ));

        // Adjust for time of day - if before the range hour, use previous day
        if (hours < checkHour) {
          rectStartDate.setUTCDate(rectStartDate.getUTCDate() - 1);
          rectEndDate.setUTCDate(rectEndDate.getUTCDate() - 1);
        }

        // Adjust for weekends
        const currentDay = now.getUTCDay();
        if (currentDay === 6) { // Saturday
          rectStartDate.setUTCDate(rectStartDate.getUTCDate() - 1);
          rectEndDate.setUTCDate(rectEndDate.getUTCDate() - 1);
        } else if (currentDay === 0) { // Sunday
          rectStartDate.setUTCDate(rectStartDate.getUTCDate() - 2);
          rectEndDate.setUTCDate(rectEndDate.getUTCDate() - 2);
        }

        const rectStartUnix = Math.floor(rectStartDate.getTime() / 1000);
        const rectEndUnix = Math.floor(rectEndDate.getTime() / 1000);

        // Filter candle data to only include candles within the rectangle time range
        const rectCandles = candleDataRef.current.filter((candle) => {
          const candleTime = candle.time as number;
          return candleTime >= rectStartUnix && candleTime <= rectEndUnix;
        });

        if (rectCandles.length > 0) {
          // Create area series for the rectangle fill between rangeHigh and rangeLow
          const areaSeries = chart.addBaselineSeries({
            topFillColor1: 'rgba(255, 152, 0, 0.25)',
            topFillColor2: 'rgba(255, 152, 0, 0.25)',
            bottomFillColor1: 'rgba(255, 152, 0, 0)',
            bottomFillColor2: 'rgba(255, 152, 0, 0)',
            topLineColor: 'rgba(255, 152, 0, 0)',
            bottomLineColor: 'rgba(255, 152, 0, 0)',
            lineWidth: 1,
            lastValueVisible: false,
            priceLineVisible: false,
            baseValue: { type: 'price', price: rangeLow },
          });

          // Create data points only for the rectangle time range
          const areaData = rectCandles.map((candle) => ({
            time: candle.time,
            value: rangeHigh,
          }));
          areaSeries.setData(areaData);

          console.log('✅ [SessionRanges] Rectangle drawn from', rectStartDate.toISOString(), 'to', rectEndDate.toISOString(), `(${rectCandles.length} candles)`);
        } else {
          console.log('⚠️ [SessionRanges] No candles found in rectangle time range:', rectStartDate.toISOString(), 'to', rectEndDate.toISOString());
        }
      }
    } else if (sessionType === 'open-values' && periodOpenValues.length > 0) {
      periodOpenValues.forEach((periodValue) => {
        const openLine = candleSeries.createPriceLine({
          price: periodValue.open,
          color: rangeColor,
          lineWidth: 3,
          lineStyle: 0,
          axisLabelVisible: true,
          title: `${periodValue.label}--${periodValue.open.toFixed(4)}`,
        });
        priceLinesRef.current.push(openLine);
      });
    }

    chart.timeScale().fitContent();
    console.log('✅ [SessionRanges] Chart initialized');
  }, [sessions, periodOpenValues, sessionType, isDark]);

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

  // Fetch data on mount and when symbol/sessionType changes
  useEffect(() => {
    // Only fetch if symbol or sessionType has actually changed
    if (lastFetchedSymbolRef.current !== symbol || lastFetchedSessionTypeRef.current !== sessionType) {
      hasFetchedRef.current = false; // Allow new fetch for different params
    }
    fetchData();
  }, [symbol, sessionType]); // Don't include fetchData to prevent infinite loop

  // Listen for TradingView WebSocket price updates
  useEffect(() => {
    const handlePriceUpdate = (payload: any) => {
      try {
        const updateSymbol = String(payload.symbol || payload.Symbol || payload.S || payload.s || '').toUpperCase();
        const price = Number(payload.price ?? payload.Price ?? payload.last ?? payload.Last ?? payload.close ?? payload.Close ?? payload.c);

        if (updateSymbol !== symbol.toUpperCase() || isNaN(price)) {
          return;
        }

        // Update the last candle in-memory instead of refetching
        if (candleSeriesRef.current && candleDataRef.current.length > 0) {
          const lastCandle = candleDataRef.current[candleDataRef.current.length - 1];
          
          const updatedCandle: CandlestickData = {
            time: lastCandle.time,
            open: lastCandle.open,
            high: Math.max(lastCandle.high, price),
            low: Math.min(lastCandle.low, price),
            close: price,
          };

          candleDataRef.current[candleDataRef.current.length - 1] = updatedCandle;
          candleSeriesRef.current.update(updatedCandle);
          console.log('📊 [SessionRanges] Real-time price update:', { symbol: updateSymbol, price });
        }
      } catch (error) {
        console.error('📊 [SessionRanges] Error handling price update:', error);
      }
    };

    // Connect to WebSocket and subscribe to symbol
    tradingViewWebSocket.connect().then(() => {
      tradingViewWebSocket.subscribe([symbol]);
      console.log('📊 [SessionRanges] Subscribed to WebSocket for:', symbol);
    }).catch(error => {
      console.error('📊 [SessionRanges] WebSocket connection error:', error);
    });

    // Register callback
    tradingViewWebSocket.onPriceUpdate(handlePriceUpdate);

    // Cleanup
    return () => {
      tradingViewWebSocket.removePriceUpdateCallback(handlePriceUpdate);
      tradingViewWebSocket.unsubscribe([symbol]);
      tradingViewWebSocket.disconnect();
    };
  }, [symbol]);

  // Fetch candle data when symbol changes
  useEffect(() => {
    // Reset fetch flag when symbol changes
    hasFetchedCandlesRef.current = false;
    fetchCandleData();
  }, [symbol]); // Don't include fetchCandleData to prevent infinite loop

  // Initialize chart when data is ready
  useEffect(() => {
    const hasData = sessions.length > 0 || periodOpenValues.length > 0;
    if (hasData && candleDataRef.current.length > 0) {
      // Small delay to ensure container is ready
      const timer = setTimeout(() => {
        initializeChart();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [sessions, periodOpenValues, initializeChart]);

  // Re-initialize chart when candle data is loaded
  useEffect(() => {
    if (candleDataRef.current.length > 0 && chartContainerRef.current) {
      initializeChart();
    }
  }, [chartLoading, initializeChart]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (chartRef.current) {
        try {
          chartRef.current.remove();
        } catch (e) {
          // Chart may already be removed
        }
        chartRef.current = null;
        candleSeriesRef.current = null;
        priceLinesRef.current = [];
      }
    };
  }, []);

  const getSessionColor = (type: 'asian' | 'london' | 'new-york') => {
    return SESSION_CONFIG[type]?.color || '#6366f1';
  };

  const getSessionBgColor = (type: 'asian' | 'london' | 'new-york') => {
    const colors = {
      asian: 'bg-blue-500/20 border-blue-500',
      london: 'bg-green-500/20 border-green-500',
      'new-york': 'bg-amber-500/20 border-amber-500',
    };
    return colors[type];
  };

  return (
    <div className="flex flex-col h-full w-full bg-widget-body overflow-hidden" style={{ minHeight: 0 }}>
      <WidgetHeader
        title="Session Ranges"
        subtitle={`[${getSymbolShortFormat(symbol)}]`}
        onRemove={onRemove}
        onSettings={() => setShowSettings(true)}
        onFullscreen={onFullscreen}
        helpContent="Visualize trading session ranges including Asian, London, and New York sessions. Track liquidity ranges and open values across different market sessions."
      />

      <div className="flex-1 flex flex-col p-4 overflow-hidden min-h-0 w-full" style={{ minHeight: 0 }}>
        {/* Session Type Toggle */}
        <div className="flex gap-2 mb-4 flex-shrink-0">
          <button
            onClick={() => setSessionType('liquidity-range')}
            className={`px-3 py-1.5 text-xs rounded transition-colors ${
              sessionType === 'liquidity-range'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            Liquidity Range
          </button>
          <button
            onClick={() => setSessionType('open-values')}
            className={`px-3 py-1.5 text-xs rounded transition-colors ${
              sessionType === 'open-values'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            Open Values
          </button>
        </div>

        {/* Chart Area */}
        <div
          ref={chartContainerRef}
          className="flex-1 bg-widget-body rounded border border-border mb-4 relative overflow-hidden"
          style={{ width: '100%', minHeight: '300px', flex: '1 1 auto' }}
        >
          {(loading || chartLoading) ? (
            <div className="absolute inset-0 flex items-center justify-center z-10" style={{ backgroundColor: isDark ? '#0A0A0A' : '#f9fafb' }}>
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
          ) : (sessions.length === 0 && periodOpenValues.length === 0) ? (
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

      <WidgetSettingsSlideIn
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        widgetType="session-ranges"
        widgetPosition={wgid}
        widgetInstanceId={wgid}
        currentSettings={widgetSettings}
        onSave={handleSaveSettings}
      />
    </div>
  );
}
