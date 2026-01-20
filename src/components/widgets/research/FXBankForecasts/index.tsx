'use client';

import { useState, useEffect, useRef, useCallback } from "react";
import { createChart, ColorType, type IChartApi, type ISeriesApi, type Time } from 'lightweight-charts';
import { WidgetHeader } from "@/components/bloomberg-ui/WidgetHeader";
import { WidgetSettingsSlideIn } from "@/components/bloomberg-ui/WidgetSettingsSlideIn";
import { Building2 } from "lucide-react";
import { fetchBankForecasts, transformApiResponse, formatSymbolForApi, extractQuartersFromApiData, type QuarterInfo } from "./api";
import { widgetDataCache } from '@/lib/widgetDataCache';

type WidgetSettings = Record<string, unknown>;

interface BankForecast {
  bank: string;
  logo: string;
  color: string;
  lastRevised: string;
  forecasts: {
    quarter: string;
    value: number | null;
  }[];
}

interface FXBankForecastsProps {
  onSettings?: () => void;
  onRemove?: () => void;
  onFullscreen?: () => void;
  settings?: WidgetSettings;
}

// Quarters will be derived dynamically from API data


interface CandleData {
  time: Time;
  open: number;
  high: number;
  low: number;
  close: number;
}

// Transform API forecasts to match quarters array structure
const alignForecastsWithQuarters = (transformedForecasts: BankForecast[], quarters: QuarterInfo[]): BankForecast[] => {
  // Create quarter string to index map
  const quarterMap = new Map<string, number>();
  quarters.forEach((q, idx) => {
    quarterMap.set(q.quarterStr, idx);
  });
  
  return transformedForecasts.map((bank) => {
    // Create an array matching quarters array length
    const alignedForecasts = quarters.map((q) => ({ 
      quarter: q.quarterStr, 
      value: null as number | null 
    }));
    
    // Map API forecasts to quarters array indices
    bank.forecasts.forEach((forecast) => {
      const quarterIndex = quarterMap.get(forecast.quarter);
      if (quarterIndex !== undefined && quarterIndex < alignedForecasts.length) {
        alignedForecasts[quarterIndex] = {
          quarter: forecast.quarter,
          value: forecast.value,
        };
      }
    });
    
    return {
      bank: bank.bank,
      logo: bank.logo,
      color: bank.color,
      lastRevised: bank.lastRevised,
      forecasts: alignedForecasts,
    };
  });
};

// Helper to convert "EURUSD" to "EUR/USD" for display
const formatSymbolForDisplay = (symbol: string): string => {
  if (symbol && symbol.length === 6 && !symbol.includes('/')) {
    return `${symbol.substring(0, 3)}/${symbol.substring(3)}`;
  }
  return symbol;
};

// Helper to convert "EUR/USD" to "EURUSD" for API
const normalizeSymbol = (symbol: string): string => {
  return symbol.replace('/', '');
};

// Helper function to get bank logo path
// Matches bank names with PNG files in notification-logos folder
const getBankLogoPath = (bankName: string): string | null => {
  if (!bankName) return null;
  
  // Normalize the name for matching (remove extra spaces, handle variations)
  const normalized = bankName.trim();
  
  // Map bank names from API to exact logo filenames
  // Only include banks that have actual logo files in /assets/img/logos/notification-logos/
  const nameMappings: Record<string, string> = {
    "Bank of America": "Bank of America Securities.png",
    "BofA": "Bank of America Securities.png",
    "BOA": "Bank of America Securities.png",
    "TD Bank": "TD Securities.png",
    "TD": "TD Securities.png",
    "TD Securities": "TD Securities.png",
    "Citi": "CitiFX.png",
    "Citibank": "CitiFX.png",
    "CitiFX": "CitiFX.png",
    "Societe Generale": "Société Générale.png",
    "Société Générale": "Société Générale.png",
    "Westpac": "Westpac.png",
    "SEB": "SEB.png",
    "CIBC": "CIBC Capital Markets.png",
    "CIBC Capital Markets": "CIBC Capital Markets.png",
    "Scotiabank": "Scotiabank.png",
    "Credit Agricole CIB": "Crédit Agricole.png",
    "Crédit Agricole": "Crédit Agricole.png",
    "Credit Agricole": "Crédit Agricole.png",
    "BMO": "BMO Capital Markets.png",
    "BMO Capital Markets": "BMO Capital Markets.png",
    "ABN-AMRO": "ABN AMRO.png",
    "ABN AMRO": "ABN AMRO.png",
    "Nordea": "Nordea.png",
    "ING": "ING.png",
    "ANZ": "ANZ.png",
    "Goldman Sachs": "Goldman Sachs.png",
    "GS": "Goldman Sachs.png",
    "MUFG": "MUFG.png",
    "HSBC": "HSBC.png",
    "Morgan Stanley": "Morgan Stanley.png",
    "MS": "Morgan Stanley.png",
    "RBC": "RBC Capital Markets.png",
    "RBC Capital Markets": "RBC Capital Markets.png",
    // Note: Danske and UOB don't have logo files, will return null for fallback
  };
  
  // Check exact match first
  if (nameMappings[normalized]) {
    return `/assets/img/logos/notification-logos/${nameMappings[normalized]}`;
  }
  
  // Try case-insensitive match
  const lowerNormalized = normalized.toLowerCase();
  for (const [key, value] of Object.entries(nameMappings)) {
    if (key.toLowerCase() === lowerNormalized) {
      return `/assets/img/logos/notification-logos/${value}`;
    }
  }
  
  // Try partial match (if bank name contains mapped key)
  for (const [key, value] of Object.entries(nameMappings)) {
    if (normalized.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(lowerNormalized)) {
      return `/assets/img/logos/notification-logos/${value}`;
    }
  }
  
  // If no mapping found, return null to use fallback
  return null;
};

export function FXBankForecasts({ onSettings, onRemove, onFullscreen, settings = {} }: FXBankForecastsProps) {
  // Get symbol from settings - stored as "EURUSD" format, display as "EUR/USD"
  const rawSymbol = (settings.symbol as string) || 'EURUSD';
  const [selectedPair, setSelectedPair] = useState(formatSymbolForDisplay(rawSymbol));
  const [isSettingsPanelOpen, setIsSettingsPanelOpen] = useState(false);
  const [localSettings, setLocalSettings] = useState(settings);
  const [bankForecasts, setBankForecasts] = useState<BankForecast[]>([]);
  const [quarters, setQuarters] = useState<QuarterInfo[]>([]); // Dynamically derived from API
  const [candleData, setCandleData] = useState<CandleData[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hoveredBank, setHoveredBank] = useState<string | null>(null);
  const [selectedQuarter, setSelectedQuarter] = useState(0); // Index of selected quarter

  // Chart refs
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const lineSeriesRefs = useRef<Map<string, ISeriesApi<'Line'>>>(new Map());
  const isInitializingRef = useRef(false);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const fixedPriceRangeRef = useRef<{ min: number; max: number } | null>(null);

  // Fetch candlestick data for the currency pair
  const fetchCandlestickData = useCallback(async (symbol: string) => {
    try {
      const now = Math.floor(Date.now() / 1000);
      const daysAgo = 60; // Fetch more data for better range calculation
      const from = now - (daysAgo * 24 * 60 * 60);
      
      const response = await fetch('/api/pmt/getIQFeedHistoricalData', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          sym: symbol,
          res: "1d", // Daily resolution
          frm: from.toString(),
          to: now.toString(),
        }),
      });

      if (!response.ok) {
        console.warn('⚠️ [FX Bank Forecasts] Failed to fetch candlestick data:', response.statusText);
        return [];
      }

      const result = await response.json();
      const rawCandleData: any[] = Array.isArray(result) ? result : (result?.data || []);
      
      if (rawCandleData.length === 0) {
        return [];
      }

      // Transform API data to CandleData format
      // API format can be: { time, open, high, low, close } or { datetime, Open, High, Low, Close }
      const transformed: CandleData[] = rawCandleData
        .map((candle: any, index: number) => {
          // Parse OHLC values (handle both lowercase and capitalized)
          const open = parseFloat(String(candle.open || candle.Open || '0'));
          const high = parseFloat(String(candle.high || candle.High || '0'));
          const low = parseFloat(String(candle.low || candle.Low || '0'));
          const close = parseFloat(String(candle.close || candle.Close || '0'));
          
          // Convert time to Unix timestamp in seconds
          let time: number;
          const datetimeStr = candle.datetime || candle.time || candle.Time;
          
          if (datetimeStr) {
            if (typeof datetimeStr === 'number') {
              // Already a timestamp
              time = datetimeStr > 10000000000 ? Math.floor(datetimeStr / 1000) : datetimeStr; // Handle milliseconds
            } else if (typeof datetimeStr === 'string') {
              const date = new Date(datetimeStr);
              if (!isNaN(date.getTime())) {
                time = Math.floor(date.getTime() / 1000);
              } else {
                // Fallback: calculate from start time
                const resolution = 86400; // 1 day in seconds
                time = from + (index * resolution);
              }
            } else {
              // Fallback: calculate from start time
              const resolution = 86400; // 1 day in seconds
              time = from + (index * resolution);
            }
          } else {
            // Fallback: calculate from start time
            const resolution = 86400; // 1 day in seconds
            time = from + (index * resolution);
          }
          
          return {
            time: time as Time,
            open,
            high,
            low,
            close,
          };
        })
        .filter((candle: CandleData) => {
          const timeNum = typeof candle.time === 'number' ? candle.time : parseFloat(String(candle.time));
          return !isNaN(timeNum) && timeNum > 0 && candle.open > 0 && candle.high > 0 && candle.low > 0 && candle.close > 0;
        })
        .sort((a, b) => {
          const timeA = typeof a.time === 'number' ? a.time : parseFloat(String(a.time));
          const timeB = typeof b.time === 'number' ? b.time : parseFloat(String(b.time));
          if (isNaN(timeA) || isNaN(timeB)) return 0;
          return timeA - timeB;
        });
      
      // Remove duplicates by time (keep first occurrence) and validate sort order
      const seen = new Set<number>();
      const deduplicated: CandleData[] = [];
      let lastTime = -1;
      
      for (const candle of transformed) {
        const timeNum = typeof candle.time === 'number' ? candle.time : parseFloat(String(candle.time));
        if (isNaN(timeNum) || timeNum <= 0) continue;
        if (seen.has(timeNum)) continue;
        
        // Verify ascending order
        if (timeNum < lastTime) {
          console.warn('⚠️ [FX Bank Forecasts] Data not sorted correctly! time:', timeNum, 'lastTime:', lastTime);
          continue; // Skip out-of-order entries
        }
        
        seen.add(timeNum);
        lastTime = timeNum;
        deduplicated.push(candle);
      }
      
      // Final sort to ensure ascending order
      deduplicated.sort((a, b) => {
        const timeA = typeof a.time === 'number' ? a.time : parseFloat(String(a.time));
        const timeB = typeof b.time === 'number' ? b.time : parseFloat(String(b.time));
        if (isNaN(timeA) || isNaN(timeB)) return 0;
        return timeA - timeB;
      });
      
      console.log('📊 [FX Bank Forecasts] Fetched candlestick data:', transformed.length, 'candles,', deduplicated.length, 'after deduplication and validation');
      
      return deduplicated;

      console.log('📊 [FX Bank Forecasts] Fetched candlestick data:', transformed.length, 'candles');
      return transformed;
    } catch (error) {
      console.warn('⚠️ [FX Bank Forecasts] Error fetching candlestick data:', error);
      return [];
    }
  }, []);

  // Get forecast values for selected quarter
  const getAllForecastLevels = useCallback(() => {
    const levels: { value: number; bank: string; quarter: string; color: string }[] = [];
    bankForecasts.forEach((bank) => {
      const forecast = bank.forecasts[selectedQuarter];
      if (forecast && forecast.value !== null) {
        levels.push({
          value: forecast.value,
          bank: bank.bank,
          quarter: forecast.quarter,
          color: bank.color,
        });
      }
    });
    return levels;
  }, [bankForecasts, selectedQuarter]);

  // Initialize chart
  const initializeChart = useCallback(() => {
    if (!chartContainerRef.current || isInitializingRef.current) return;

    isInitializingRef.current = true;

    // Clean up existing chart
    if (resizeObserverRef.current) {
      resizeObserverRef.current.disconnect();
      resizeObserverRef.current = null;
    }
    if (chartRef.current) {
      try {
        chartRef.current.remove();
      } catch (err) {
        console.warn('⚠️ [FX Bank Forecasts] Error cleaning up chart:', err);
      }
      chartRef.current = null;
      candlestickSeriesRef.current = null;
      lineSeriesRefs.current.clear();
    }

    const container = chartContainerRef.current;
    if (!container) {
      isInitializingRef.current = false;
      return;
    }

    // Get container height - width is constrained by container CSS to 400px
    const containerRect = container.getBoundingClientRect();
    const height = Math.max(containerRect.height || 300, 300);

    console.log('📊 [FX Bank Forecasts] Creating chart with dimensions:', { containerWidth: containerRect.width, containerHeight: containerRect.height, height });

    const chart = createChart(container, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#9ca3af',
      },
      grid: {
        vertLines: { color: '#1C2227', visible: false },
        horzLines: { color: '#1C2227' },
      },
      rightPriceScale: {
        borderColor: '#374151',
        visible: true,
        autoScale: true,
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
      },
      leftPriceScale: {
        visible: false,
      },
      timeScale: {
        borderColor: '#374151',
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

    // Calculate FIXED price range from ALL institutions' forecasts (all quarters)
    // This is calculated once and locked to prevent chart from moving
    if (!fixedPriceRangeRef.current && bankForecasts.length > 0) {
      // Get ALL forecast values from ALL institutions and ALL quarters
      const allForecastValues = bankForecasts.flatMap(bank => 
        bank.forecasts
          .filter(f => f.value !== null)
          .map(f => f.value as number)
      );
      
      if (allForecastValues.length > 0) {
        const forecastMin = Math.min(...allForecastValues);
        const forecastMax = Math.max(...allForecastValues);
        
        // Add padding (5% on each side)
        const padding = (forecastMax - forecastMin) * 0.05;
        fixedPriceRangeRef.current = {
          min: forecastMin - padding,
          max: forecastMax + padding,
        };
        
        console.log('📊 [FX Bank Forecasts] Fixed price range calculated from all institutions:', fixedPriceRangeRef.current, {
          minForecast: forecastMin,
          maxForecast: forecastMax,
          totalForecasts: allForecastValues.length
        });
      }
    }
    
    // Lock the price scale to the fixed range by adding invisible min/max markers
    if (fixedPriceRangeRef.current) {
      // Sort candleData first to get proper time range
      const sortedCandleData = [...candleData].sort((a, b) => {
        const timeA = typeof a.time === 'number' ? a.time : parseFloat(String(a.time));
        const timeB = typeof b.time === 'number' ? b.time : parseFloat(String(b.time));
        return timeA - timeB;
      });
      
      // Get time range from sorted candles (use all candles)
      const latestCandles = sortedCandleData;
      const firstTime = latestCandles.length > 0 
        ? (typeof latestCandles[0].time === 'number' ? latestCandles[0].time : parseFloat(String(latestCandles[0].time)))
        : (Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60);
      const lastTime = latestCandles.length > 0 
        ? (typeof latestCandles[latestCandles.length - 1].time === 'number' ? latestCandles[latestCandles.length - 1].time : parseFloat(String(latestCandles[latestCandles.length - 1].time)))
        : Math.floor(Date.now() / 1000);
      
      // Add TWO separate invisible line series for min and max (each with ascending time data)
      const minSeries = chart.addLineSeries({
        color: 'transparent',
        lineWidth: 0,
        priceScaleId: 'right',
        visible: false,
        lastValueVisible: false,
        priceLineVisible: false,
      });
      
      const maxSeries = chart.addLineSeries({
        color: 'transparent',
        lineWidth: 0,
        priceScaleId: 'right',
        visible: false,
        lastValueVisible: false,
        priceLineVisible: false,
      });
      
      // Set data with times in ascending order (firstTime < lastTime)
      minSeries.setData([
        { time: firstTime as Time, value: fixedPriceRangeRef.current.min },
        { time: lastTime as Time, value: fixedPriceRangeRef.current.min },
      ]);
      
      maxSeries.setData([
        { time: firstTime as Time, value: fixedPriceRangeRef.current.max },
        { time: lastTime as Time, value: fixedPriceRangeRef.current.max },
      ]);
      
      // Store references
      lineSeriesRefs.current.set('_minLock', minSeries);
      lineSeriesRefs.current.set('_maxLock', maxSeries);
      
      chart.priceScale('right').applyOptions({
        autoScale: true, // Auto-scale will include the invisible min/max points
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
      });
      
      console.log('📊 [FX Bank Forecasts] Price scale locked to range:', fixedPriceRangeRef.current);
    } else {
      // Fallback: use auto-scale if no forecasts yet
      chart.priceScale('right').applyOptions({
        autoScale: true,
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
      });
    }

    // Set candlestick data - show only the latest 15 candles for better visibility
    let latestCandles: CandleData[] = [];
    if (candleData.length > 0) {
      try {
        // Ensure data is sorted by time (ascending) before slicing
        const sortedCandles = [...candleData].sort((a, b) => {
          const timeA = typeof a.time === 'number' ? a.time : parseFloat(String(a.time));
          const timeB = typeof b.time === 'number' ? b.time : parseFloat(String(b.time));
          if (isNaN(timeA) || isNaN(timeB)) return 0;
          return timeA - timeB;
        });
        
        // Use all candles
        latestCandles = sortedCandles;
        
        // Convert all times to numbers and create clean array
        const processedCandles: Array<{time: number, open: number, high: number, low: number, close: number}> = latestCandles
          .map(candle => {
            const timeNum = typeof candle.time === 'number' ? candle.time : parseFloat(String(candle.time));
            if (isNaN(timeNum) || timeNum <= 0) return null;
            if (isNaN(candle.open) || isNaN(candle.high) || isNaN(candle.low) || isNaN(candle.close)) return null;
            
            return {
              time: timeNum,
              open: candle.open,
              high: candle.high,
              low: candle.low,
              close: candle.close,
            };
          })
          .filter((c): c is {time: number, open: number, high: number, low: number, close: number} => c !== null);
        
        // Remove duplicates by time (keep last occurrence)
        const timeMap = new Map<number, {time: number, open: number, high: number, low: number, close: number}>();
        processedCandles.forEach(candle => {
          timeMap.set(candle.time, candle);
        });
        
        // Sort times and build final array in ascending order
        const sortedTimes = Array.from(timeMap.keys()).sort((a, b) => a - b);
        const finalCandles: CandleData[] = sortedTimes.map(timeNum => {
          const candle = timeMap.get(timeNum)!;
          return {
            time: timeNum as Time,
            open: candle.open,
            high: candle.high,
            low: candle.low,
            close: candle.close,
          };
        });
        
        // Final validation - ensure ascending order
        for (let i = 1; i < finalCandles.length; i++) {
          const prevTime = finalCandles[i - 1].time as number;
          const currTime = finalCandles[i].time as number;
          
          if (currTime <= prevTime) {
            console.error(`❌ [FX Bank Forecasts] Invalid sort order at index ${i}: prev=${prevTime}, curr=${currTime}`);
            console.error('❌ [FX Bank Forecasts] Full array:', finalCandles.map(c => ({time: c.time, index: finalCandles.indexOf(c)})));
            return; // Skip setting data if invalid
          }
        }
        
        console.log('📊 [FX Bank Forecasts] Setting candlestick data:', finalCandles.length, 'candles - first time:', finalCandles[0]?.time, 'last time:', finalCandles[finalCandles.length - 1]?.time);
        
        candlestickSeries.setData(finalCandles);
        
        // Fit content once after candlestick data is set
        setTimeout(() => {
          if (chartRef.current && !isInitializingRef.current) {
            chartRef.current.timeScale().fitContent();
          }
        }, 50);
        
        console.log('📊 [FX Bank Forecasts] Chart data set:', latestCandles.length, 'candles');
      } catch (err) {
        console.error('❌ [FX Bank Forecasts] Error setting candlestick data:', err);
      }
    } else {
      console.warn('⚠️ [FX Bank Forecasts] No candle data available for chart');
    }

    // Add current price line if available
    if (currentPrice !== null) {
      const currentPriceLine = chart.addLineSeries({
        color: '#3b82f6',
        lineWidth: 2,
        lineStyle: 2, // Dashed
        priceFormat: {
          type: 'price',
          precision: 4,
          minMove: 0.0001,
        },
        priceScaleId: 'right',
        lastValueVisible: false,
        priceLineVisible: false,
      });
      
      // Use latest candles (the displayed half) for time range
      const firstTime = latestCandles.length > 0 
        ? latestCandles[0].time 
        : (candleData.length > 0 
          ? candleData[Math.floor(candleData.length / 2)].time
          : (Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60) as Time);
      const lastTime = latestCandles.length > 0 
        ? latestCandles[latestCandles.length - 1].time 
        : (candleData.length > 0
          ? candleData[candleData.length - 1].time
          : (Math.floor(Date.now() / 1000) as Time));
      
      currentPriceLine.setData([
        { time: firstTime, value: currentPrice },
        { time: lastTime, value: currentPrice },
      ]);
      
      lineSeriesRefs.current.set('currentPrice', currentPriceLine);
    }
    
    // Lock price scale after all data is loaded to prevent jumping
    setTimeout(() => {
      try {
        if (chartRef.current && !isInitializingRef.current) {
          // Don't call fitContent here - let the initial fitContent call handle it
          // Just ensure price scale is stable
          if (fixedPriceRangeRef.current) {
            // Price scale will auto-scale to include all data, which is what we want
            // The scale will be stable because we include all forecasts in calculation
          }
        }
      } catch (err) {
        console.warn('⚠️ [FX Bank Forecasts] Error locking scale:', err);
      }
    }, 200);

    // Handle resize
    resizeObserverRef.current = new ResizeObserver((entries) => {
      try {
        if (chartRef.current && !isInitializingRef.current && entries[0]) {
          const { width, height } = entries[0].contentRect;
          if (width > 0 && height > 0) {
            // Always constrain to 400px max width
            const constrainedWidth = Math.min(width, 400);
            chartRef.current.applyOptions({
              width: constrainedWidth,
              height: height,
            });
            // Don't call fitContent on resize to prevent jumping
          }
        }
      } catch (err) {
        console.warn('⚠️ [FX Bank Forecasts] Error in resize observer:', err);
      }
    });

    if (container) {
      resizeObserverRef.current.observe(container);
    }

    isInitializingRef.current = false;
  }, [candleData, currentPrice, bankForecasts]);
  // Note: hoveredBank and selectedQuarter are NOT in dependencies - chart should not reinit on hover or quarter change

  // Add ALL forecast lines for ALL quarters initially (invisible for non-selected quarters)
  // This ensures the price scale always includes all values and doesn't move
  useEffect(() => {
    if (!chartRef.current || !candlestickSeriesRef.current || bankForecasts.length === 0) return;
    
    // Use all candles (sorted)
    const sortedCandleData = [...candleData].sort((a, b) => {
      const timeA = typeof a.time === 'number' ? a.time : parseFloat(String(a.time));
      const timeB = typeof b.time === 'number' ? b.time : parseFloat(String(b.time));
      return timeA - timeB;
    });
    const latestCandles = sortedCandleData;
    
    const firstTime = latestCandles.length > 0 
      ? latestCandles[0].time 
      : (candleData.length > 0 
        ? candleData[Math.floor(candleData.length / 2)].time
        : (Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60) as Time);
    const lastTime = latestCandles.length > 0 
      ? latestCandles[latestCandles.length - 1].time 
      : (candleData.length > 0
        ? candleData[candleData.length - 1].time
        : (Math.floor(Date.now() / 1000) as Time));
    
    // Remove all existing forecast lines (except current price and min/max lock)
    const currentPriceSeries = lineSeriesRefs.current.get('currentPrice');
    const minLockSeries = lineSeriesRefs.current.get('_minLock');
    const maxLockSeries = lineSeriesRefs.current.get('_maxLock');
    
    lineSeriesRefs.current.forEach((series, bankName) => {
      if (bankName !== 'currentPrice' && bankName !== '_minLock' && bankName !== '_maxLock' && !bankName.startsWith('_forecast_')) {
        try {
          chartRef.current?.removeSeries(series);
        } catch (err) {
          // Ignore errors
        }
      }
    });
    
    // Add ALL forecast lines for ALL quarters (but make non-selected quarters invisible)
    // This ensures the scale always includes all values
    bankForecasts.forEach((bank) => {
      bank.forecasts.forEach((forecast, quarterIdx) => {
        if (forecast.value !== null) {
          const lineKey = `_forecast_${bank.bank}_${quarterIdx}`;
          
          // Only create if doesn't exist
          if (!lineSeriesRefs.current.has(lineKey)) {
            const lineSeries = chartRef.current!.addLineSeries({
              color: bank.color,
              lineWidth: 1,
              lineStyle: 2, // Dashed
              priceFormat: {
                type: 'price',
                precision: 4,
                minMove: 0.0001,
              },
              priceScaleId: 'right',
              visible: quarterIdx === selectedQuarter && (!hoveredBank || bank.bank === hoveredBank), // Only visible for selected quarter
              lastValueVisible: false,
              priceLineVisible: false,
            });
            
            lineSeries.setData([
              { time: firstTime, value: forecast.value },
              { time: lastTime, value: forecast.value },
            ]);
            
            lineSeriesRefs.current.set(lineKey, lineSeries);
          } else {
            // Update visibility of existing line
            const lineSeries = lineSeriesRefs.current.get(lineKey)!;
            const shouldShow = quarterIdx === selectedQuarter && (!hoveredBank || bank.bank === hoveredBank);
            const isHighlighted = hoveredBank === bank.bank && quarterIdx === selectedQuarter;
            
            lineSeries.applyOptions({
              visible: shouldShow,
              lineWidth: isHighlighted ? 2 : 1,
            });
          }
        }
      });
    });
    
    // Add current price line if not already added
    if (currentPrice !== null && !lineSeriesRefs.current.has('currentPrice')) {
      const currentPriceLine = chartRef.current!.addLineSeries({
        color: '#3b82f6',
        lineWidth: 2,
        lineStyle: 2, // Dashed
        priceFormat: {
          type: 'price',
          precision: 4,
          minMove: 0.0001,
        },
        priceScaleId: 'right',
        lastValueVisible: false,
        priceLineVisible: false,
      });
      
      currentPriceLine.setData([
        { time: firstTime, value: currentPrice },
        { time: lastTime, value: currentPrice },
      ]);
      
      lineSeriesRefs.current.set('currentPrice', currentPriceLine);
    }
  }, [selectedQuarter, bankForecasts, candleData, currentPrice, hoveredBank]);

  // Fetch bank forecasts when selectedPair changes
  useEffect(() => {
    const loadBankForecasts = async () => {
      const symbol = formatSymbolForApi(selectedPair);
      const cacheKey = widgetDataCache.generateKey('fx-bank-forecasts', { symbol });
      const cachedForecastData = widgetDataCache.get<any>(cacheKey);
      
      // Check candlestick cache separately
      const candleCacheKey = widgetDataCache.generateKey('fx-bank-forecasts-candles', { symbol });
      const cachedCandles = widgetDataCache.get<any[]>(candleCacheKey);
      
      if (cachedForecastData && cachedCandles) {
        console.log('✅ [FX Bank Forecasts] Using cached data for:', symbol);
        
        // Set candlestick data
        setCandleData(cachedCandles);
        
        // Set current price from last candle close
        if (cachedCandles.length > 0) {
          setCurrentPrice(cachedCandles[cachedCandles.length - 1].close);
        }
        
        // Restore forecast data
        const extractedQuarters = extractQuartersFromApiData(cachedForecastData.data);
        setAvailableQuarters(extractedQuarters);
        
        if (extractedQuarters.length > 0) {
          setSelectedQuarter(extractedQuarters[0].quarterStr);
        }
        
        const transformed = transformApiResponse(cachedForecastData.data, extractedQuarters[0]?.quarterStr);
        setBankForecasts(transformed);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);
      setBankForecasts([]);
      
      try {
        console.log('🏦 [FX Bank Forecasts] Fetching data for symbol:', symbol);
        
        // Fetch both bank forecasts and candlestick data
        const [apiResponse, candles] = await Promise.all([
          fetchBankForecasts(symbol),
          fetchCandlestickData(symbol),
        ]);
        
        // Reset fixed price range when pair changes
        fixedPriceRangeRef.current = null;
        
        // Set candlestick data
        setCandleData(candles);
        widgetDataCache.set(candleCacheKey, candles);
        
        // Set current price from last candle close
        if (candles.length > 0) {
          setCurrentPrice(candles[candles.length - 1].close);
        }
        
        if (!apiResponse) {
          setError('Failed to fetch bank forecasts');
          setIsLoading(false);
          return;
        }
        
        console.log('🏦 [FX Bank Forecasts] API response received:', {
          success: apiResponse.success,
          count: apiResponse.count,
          dataLength: apiResponse.data?.length || 0
        });
        
        if (!apiResponse.success || !apiResponse.data || apiResponse.data.length === 0) {
          setError('No forecast data available');
          setIsLoading(false);
          return;
        }
        
        widgetDataCache.set(cacheKey, apiResponse);
        
        // Extract quarters dynamically from API data
        const extractedQuarters = extractQuartersFromApiData(apiResponse.data);
        console.log('🏦 [FX Bank Forecasts] Extracted quarters:', extractedQuarters.length, extractedQuarters.map(q => q.quarterStr));
        
        if (extractedQuarters.length === 0) {
          setError('No valid quarters found in API data');
          setIsLoading(false);
          return;
        }
        
        // Set quarters state
        setQuarters(extractedQuarters);
        
        // Transform API response
        const transformed = transformApiResponse(apiResponse.data);
        console.log('🏦 [FX Bank Forecasts] Transformed data:', transformed.length, 'banks');
        
        // Align forecasts with quarters array
        const aligned = alignForecastsWithQuarters(transformed, extractedQuarters);
        setBankForecasts(aligned);
        
        // Calculate fixed price range from ALL institutions' forecasts (all quarters) immediately after data is loaded
        // This ensures the scale is locked before chart initializes
        const allForecastValues = aligned.flatMap(bank => 
          bank.forecasts
            .filter(f => f.value !== null)
            .map(f => f.value as number)
        );
        
        if (allForecastValues.length > 0) {
          const forecastMin = Math.min(...allForecastValues);
          const forecastMax = Math.max(...allForecastValues);
          
          // Add padding (5% on each side)
          const padding = (forecastMax - forecastMin) * 0.05;
          fixedPriceRangeRef.current = {
            min: forecastMin - padding,
            max: forecastMax + padding,
          };
          
          console.log('📊 [FX Bank Forecasts] Fixed price range calculated from API data:', fixedPriceRangeRef.current, {
            minForecast: forecastMin,
            maxForecast: forecastMax,
            totalForecasts: allForecastValues.length,
            institutions: aligned.length
          });
        }
        
        // Reset selected quarter if it's out of bounds
        if (selectedQuarter >= extractedQuarters.length) {
          setSelectedQuarter(0);
        }
        
        setIsLoading(false);
      } catch (err) {
        console.error('❌ [FX Bank Forecasts] Error loading data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load forecasts');
        setIsLoading(false);
      }
    };
    
    loadBankForecasts();
  }, [selectedPair, fetchCandlestickData]);

  // Initialize chart when data is ready (but not when hoveredBank changes)
  useEffect(() => {
    // Always initialize chart if container is available, even without data
    if (chartContainerRef.current) {
      // Small delay to ensure container is fully rendered
      const timer = setTimeout(() => {
        initializeChart();
      }, 100);
      
      return () => {
        clearTimeout(timer);
        if (resizeObserverRef.current) {
          resizeObserverRef.current.disconnect();
          resizeObserverRef.current = null;
        }
        if (chartRef.current) {
          try {
            chartRef.current.remove();
          } catch (err) {
            // Ignore cleanup errors
          }
          chartRef.current = null;
          candlestickSeriesRef.current = null;
          lineSeriesRefs.current.clear();
        }
      };
    }
  }, [candleData, bankForecasts, selectedQuarter, currentPrice, initializeChart]);
  // Note: hoveredBank is intentionally NOT in dependencies - chart should not reinit on hover

  // Update forecast lines visibility when hoveredBank changes (without affecting chart scale)
  useEffect(() => {
    if (!chartRef.current || lineSeriesRefs.current.size === 0) {
      console.log('⚠️ [FX Bank Forecasts] Skipping hover update - no chart or lines:', { 
        hasChart: !!chartRef.current, 
        lineCount: lineSeriesRefs.current.size 
      });
      return;
    }
    
    console.log('🖱️ [FX Bank Forecasts] Updating line visibility:', { 
      hoveredBank, 
      selectedQuarter,
      totalLines: lineSeriesRefs.current.size 
    });
    
    // Default state (no hover): Show ALL forecast lines for selected quarter
    // Hover state: Show ONLY the hovered bank's line + current price (always visible)
    lineSeriesRefs.current.forEach((series, lineKey) => {
      // Skip special lines
      if (lineKey === 'currentPrice' || lineKey === '_minLock' || lineKey === '_maxLock') {
        if (lineKey === 'currentPrice') {
          // Always show current price line
          try {
            series.applyOptions({ visible: true });
          } catch (err) {
            console.warn('⚠️ [FX Bank Forecasts] Error showing current price:', err);
          }
        }
        return;
      }
      
      // Parse forecast line key: _forecast_BankName_quarterIndex
      if (lineKey.startsWith('_forecast_')) {
        const parts = lineKey.substring('_forecast_'.length);
        const lastUnderscoreIdx = parts.lastIndexOf('_');
        if (lastUnderscoreIdx > 0) {
          const bankName = parts.substring(0, lastUnderscoreIdx);
          const quarterIdx = parseInt(parts.substring(lastUnderscoreIdx + 1), 10);
          
          // Only show lines for the selected quarter
          const isSelectedQuarter = quarterIdx === selectedQuarter;
          
          // Logic:
          // - If NO hover (!hoveredBank): show ALL lines for selected quarter
          // - If hovering (hoveredBank exists): show ONLY hovered bank's line for selected quarter
          const shouldShow = isSelectedQuarter && (!hoveredBank || bankName === hoveredBank);
          const isHighlighted = hoveredBank === bankName && isSelectedQuarter;
          
          try {
            series.applyOptions({
              visible: shouldShow,
              lineWidth: isHighlighted ? 3 : 1,
            });
          } catch (err) {
            console.warn('⚠️ [FX Bank Forecasts] Error updating line series:', err);
          }
        }
      }
    });
  }, [hoveredBank, selectedQuarter]);


  // Handle settings save
  const handleSaveSettings = (newSettings: Record<string, unknown>) => {
    setLocalSettings(newSettings);
    // Symbol is stored as "EURUSD" format, convert to "EUR/USD" for display
    if (newSettings.symbol) {
      const newDisplayPair = formatSymbolForDisplay(newSettings.symbol as string);
      if (newDisplayPair !== selectedPair) {
        setSelectedPair(newDisplayPair);
      }
    }
    setIsSettingsPanelOpen(false);
  };

  return (
    <div className="w-full h-full bg-widget-body border border-border flex flex-col overflow-hidden relative">
      {/* Header */}
      <WidgetHeader
        title="FX Bank Forecasts"
        subtitle="Institutional Price Projections"
        onSettings={() => setIsSettingsPanelOpen(true)}
        onRemove={onRemove}
        onFullscreen={onFullscreen}
        helpContent="View and analyze major banks' FX forecasts across multiple quarters. Compare institutional projections with current market price on the chart."
      />

      {/* Settings Slide-in Panel */}
      <WidgetSettingsSlideIn
        isOpen={isSettingsPanelOpen}
        onClose={() => setIsSettingsPanelOpen(false)}
        widgetType="fx-bank-forecasts"
        widgetPosition=""
        currentSettings={{ ...localSettings, symbol: normalizeSymbol(selectedPair) }}
        onSave={handleSaveSettings}
      />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden min-w-0" style={{ width: '100%' }}>
        {/* Table Section */}
        <div className="flex-1 border-r border-border overflow-auto custom-scrollbar min-w-0" style={{ minWidth: 0 }}>
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-20">
              {/* Main Header Row */}
              <tr className="bg-[#1a1a1a] text-foreground">
                <th className="py-4 px-4 text-left border-r border-border/30 sticky left-0 bg-[#1a1a1a] z-30 min-w-[140px]">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-primary" />
                    <span className="text-sm text-muted-foreground">INSTITUTION</span>
                  </div>
                </th>
                <th className="py-4 px-4 text-center border-r border-border/30 min-w-[80px] bg-[#1a1a1a]">
                  <div className="text-sm text-muted-foreground">LAST REVISED</div>
                </th>
                {quarters.length > 0 ? quarters.map((quarter, idx) => (
                  <th
                    key={idx}
                    className="py-4 px-4 text-center border-r border-border/30 min-w-[75px] bg-[#1a1a1a]"
                  >
                    <div className="text-sm text-muted-foreground">{quarter.label} {quarter.subLabel}</div>
                    <div className="text-xs opacity-70 mt-0.5">{quarter.month}</div>
                  </th>
                )) : null}
              </tr>
            </thead>

            <tbody>
              {bankForecasts.length === 0 ? (
                <tr>
                  <td colSpan={(quarters.length > 0 ? quarters.length : 9) + 2} className="py-8 text-center text-muted-foreground">
                    {isLoading ? 'Loading forecasts...' : error || 'No forecast data available'}
                  </td>
                </tr>
              ) : (
                bankForecasts.map((bank, bankIdx) => (
                <tr
                  key={bankIdx}
                  className={`border-b border-border hover:bg-muted/30 transition-colors ${
                    hoveredBank === bank.bank ? "bg-primary/10" : ""
                  }`}
                  onMouseEnter={() => setHoveredBank(bank.bank)}
                  onMouseLeave={() => setHoveredBank(null)}
                >
                  <td className="py-3 px-4 border-r border-border sticky left-0 bg-[#0d0d0d]" style={{ zIndex: 15 }}>
                    <div className="flex items-center gap-2">
                      <div className="relative w-7 h-7 shrink-0">
                        {getBankLogoPath(bank.bank) ? (
                          <>
                            <img
                              src={getBankLogoPath(bank.bank)!}
                              alt={bank.bank}
                              className="w-7 h-7 rounded object-contain"
                              onError={(e) => {
                                // Hide image and show fallback circle
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                const fallback = target.parentElement?.querySelector('.logo-fallback') as HTMLElement;
                                if (fallback) {
                                  fallback.style.display = 'flex';
                                }
                              }}
                            />
                            <div
                              className="logo-fallback w-7 h-7 rounded-full flex items-center justify-center text-xs absolute inset-0 hidden"
                        style={{ backgroundColor: bank.color }}
                      >
                        <span className="text-white text-xs font-medium">{bank.logo}</span>
                            </div>
                          </>
                        ) : (
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-xs"
                            style={{ backgroundColor: bank.color }}
                          >
                            <span className="text-white text-xs font-medium">{bank.logo}</span>
                          </div>
                        )}
                      </div>
                      <span className="text-sm text-foreground hover:text-primary cursor-pointer transition-colors">
                        {bank.bank}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center border-r border-border text-sm text-muted-foreground relative z-0">
                    {bank.lastRevised}
                  </td>
                  {bank.forecasts.map((forecast, fIdx) => (
                    <td
                      key={fIdx}
                      className="py-3 px-4 text-center border-r border-border relative z-0"
                    >
                      {forecast.value !== null ? (
                        <span className="text-sm text-foreground">
                          {forecast.value.toFixed(4)}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground/30">—</span>
                      )}
                    </td>
                  ))}
                </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Chart Section - Fixed 400px width */}
        <div 
          className="flex-shrink-0 flex flex-col border-l border-border overflow-hidden"
          style={{ width: '400px', minWidth: '400px', maxWidth: '400px' }}
        >
          <div className="p-3 border-b border-border flex-shrink-0">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-base text-foreground font-medium">{selectedPair}</div>
                <div className="text-sm text-muted-foreground">
                  {currentPrice !== null ? `Current: ${currentPrice.toFixed(4)}` : 'Current: —'}
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="flex items-center gap-1">
                  <div className="w-2.5 h-2.5 bg-primary rounded-full" />
                  <span className="text-muted-foreground">Bank Forecasts</span>
                </div>
              </div>
            </div>
            
            {/* Quarter Switcher */}
            {quarters.length > 0 && (
            <div className="flex items-center gap-0.5 overflow-x-auto custom-scrollbar pb-1">
              {quarters.map((quarter, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedQuarter(idx)}
                  className={`px-2.5 py-1.5 text-sm whitespace-nowrap transition-colors border-r border-border/30 last:border-r-0 ${
                    selectedQuarter === idx
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
                  }`}
                >
                  {quarter.label} {quarter.subLabel}
                </button>
              ))}
            </div>
            )}
          </div>

          <div className="flex-1 relative min-h-0 overflow-hidden" style={{ width: '400px', maxWidth: '400px', minHeight: '400px' }}>
            <div 
              ref={chartContainerRef} 
              className="absolute inset-0 overflow-hidden"
              style={{ 
                width: '400px',
                maxWidth: '400px',
                height: '100%',
                overflow: 'hidden',
                contain: 'layout style paint'
              }}
            />
            {isLoading && candleData.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center z-10">
                <div className="text-sm text-muted-foreground">Loading chart...</div>
          </div>
            )}
            {!isLoading && candleData.length === 0 && !error && (
              <div className="absolute inset-0 flex items-center justify-center z-10">
                <div className="text-sm text-muted-foreground">No chart data available</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default FXBankForecasts;
