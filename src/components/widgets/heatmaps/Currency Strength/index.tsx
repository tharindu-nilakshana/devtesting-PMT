/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable prefer-const */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createChart, type ISeriesApi, type Time } from 'lightweight-charts';
import { fetchCurrencyStrengthSelected, clearCurrencyStrengthCache, CurrencyStrengthData } from './api';
import { WidgetHeader } from '@/components/bloomberg-ui/WidgetHeader';
import widgetDataWebSocket from '@/utils/widgetWebSocket';
import { useDateFormat } from '@/hooks/useDateFormat';
import { useTemplates } from '@/hooks/useTemplates';

type Timeframe = '30d' | '7d' | '5d' | '1d' | '8h' | 'today' | 'CurrentWeek' | 'TW' | 'TD';

const DEFAULT_CURRENCIES = ['USD','EUR','JPY','GBP','AUD','CHF','CAD','NZD'];
const DEFAULT_COLORS: Record<string, string> = {
  USD: '#f97316', // Orange
  EUR: '#ef4444', // Red
  JPY: '#06b6d4', // Cyan
  GBP: '#22c55e', // Green
  AUD: '#3b82f6', // Blue
  CHF: '#ea580c', // Orange/Brown
  CAD: '#a855f7', // Purple
  NZD: '#ec4899', // Pink/Magenta
};

interface WidgetSettings {
  currencies?: string[];
  timeframe?: Timeframe;
  showVolume?: number;
}

interface Props { 
  wgid?: string; // Widget ID for API calls
  timeframe?: Timeframe; 
  currenciesCsv?: string; 
  useLegacyPattern?: boolean;
  onRemove?: () => void; // Close button functionality
  onSettings?: () => void; // Settings button functionality
  onSaveSettings?: (settings: Record<string, any>) => void; // Callback for saving settings (used when inside container widgets)
  onFullscreen?: () => void; // Fullscreen functionality
  // SSR props
  initialData?: CurrencyStrengthData;
  ssrTimeframe?: Timeframe;
  ssrCurrencies?: string[];
  // Settings from template
  settings?: WidgetSettings;
  additionalSettings?: string; // JSON string: {"currencies":[...],"timeframe":"...","showVolume":1}
}

interface Point { time: Time; value: number }

// Normalize legacy timeframe values to current format
const normalizeTimeframe = (tf: string): Timeframe => {
  // Map legacy values to current button values
  const legacyMap: Record<string, Timeframe> = {
    'today': 'TD',
    'CurrentWeek': 'TW'
  };
  return (legacyMap[tf] || tf) as Timeframe;
};

// Helper function to parse additionalSettings (handles both JSON and legacy formats)
const parseAdditionalSettingsString = (settings: string): WidgetSettings | null => {
  if (!settings) return null;
  
  // Try JSON format first
  if (settings.startsWith('{')) {
    try {
      const parsed = JSON.parse(settings) as WidgetSettings;
      // Normalize timeframe if present
      if (parsed.timeframe) {
        parsed.timeframe = normalizeTimeframe(parsed.timeframe);
      }
      return parsed;
    } catch (e) {
      // Fall through to legacy format
    }
  }
  
  // Try legacy pipe-delimited format: "currencies|timeframe|showVolume"
  if (settings.includes('|')) {
    const parts = settings.split('|');
    const currencies = parts[0] ? parts[0].split(',').map(c => c.trim()).filter(c => c) : undefined;
    const tfValue = parts[1] ? normalizeTimeframe(parts[1].trim()) : undefined;
    const showVolume = parts[2] ? parseInt(parts[2], 10) : 1;
    return { currencies, timeframe: tfValue, showVolume };
  }
  
  return null;
};

export function CurrencyStrengthWidget({ 
  wgid,
  timeframe = '7d', 
  currenciesCsv, 
  useLegacyPattern = false,
  onRemove,
  onSettings,
  onSaveSettings,
  onFullscreen,
  initialData,
  ssrTimeframe,
  ssrCurrencies,
  settings: externalSettings,
  additionalSettings,
}: Props) {
  // IMMEDIATE LOG - should appear on every render
  console.log('[CurrencyStrength] 🚀 RENDER - additionalSettings:', additionalSettings);
  
  const { format: formatDate, dateFormat } = useDateFormat();
  const { activeTemplateId, updateWidgetFields } = useTemplates();
  
  // Debug: Log incoming settings on mount AND when they change
  useEffect(() => {
    console.log('[CurrencyStrength] 🔍 Props received:', {
      wgid,
      additionalSettings,
      additionalSettingsType: typeof additionalSettings,
      externalSettings,
      timeframe,
      currenciesCsv
    });
  }, [wgid, additionalSettings, externalSettings, timeframe, currenciesCsv]);
  
  // Parse additionalSettings - handles both JSON format and legacy pipe-delimited format
  // JSON format: {"currencies":["USD","EUR"],"timeframe":"8h","showVolume":1}
  // Legacy format: "AUD,CAD,CHF,EUR,GBP,JPY,NZD,USD|today|1"
  const parsedAdditionalSettings = useMemo((): WidgetSettings | null => {
    return parseAdditionalSettingsString(additionalSettings || '');
  }, [additionalSettings]);
  
  // Ref to store format function for dynamic access in chart handlers (avoids closure stale values)
  const formatDateRef = useRef(formatDate);
  formatDateRef.current = formatDate;
  
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<ReturnType<typeof createChart> | null>(null);
  const seriesRef = useRef<Record<string, ISeriesApi<'Line'>>>({});
  const zeroSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const zeroDashSegmentsRef = useRef<ISeriesApi<'Line'>[]>([]);
  const loadedRef = useRef<string>(''); // Track what was last loaded to prevent duplicates
  const isZoomedInRef = useRef(false);
  const dataTimeRangeRef = useRef<{ from: number; to: number } | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  
  // Use SSR data if available, then parsed settings, otherwise fallback to defaults
  const [selected, setSelected] = useState<string[]>(() => {
    // Priority: ssrCurrencies > additionalSettings > externalSettings > currenciesCsv > default
    if (ssrCurrencies) return ssrCurrencies;
    
    // Parse additionalSettings directly in initializer (handles both JSON and legacy formats)
    if (additionalSettings) {
      const parsed = parseAdditionalSettingsString(additionalSettings);
      if (parsed?.currencies && Array.isArray(parsed.currencies)) {
        return parsed.currencies;
      }
    }
    
    // Fallback to externalSettings
    if (externalSettings?.currencies && Array.isArray(externalSettings.currencies)) {
      return externalSettings.currencies;
    }
    
    if (currenciesCsv) return currenciesCsv.split(',');
    return DEFAULT_CURRENCIES;
  });
  
  const [tf, setTf] = useState<Timeframe>(() => {
    // Priority: ssrTimeframe > additionalSettings > externalSettings > timeframe prop
    if (ssrTimeframe) return ssrTimeframe;
    
    // Parse additionalSettings directly in initializer (handles both JSON and legacy formats)
    if (additionalSettings) {
      const parsed = parseAdditionalSettingsString(additionalSettings);
      if (parsed?.timeframe) {
        return parsed.timeframe;
      }
    }
    
    // Fallback to externalSettings
    if (externalSettings?.timeframe) {
      return externalSettings.timeframe;
    }
    
    return timeframe;
  });
  const [loading, setLoading] = useState(false); // Start with no loading to avoid immediate API calls
  const [error, setError] = useState<string | null>(null);
  const [currentData, setCurrentData] = useState<CurrencyStrengthData | null>(initialData || null);
  const [wsConnectionStatus, setWsConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const [latestValues, setLatestValues] = useState<Record<string, number>>({});
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isResizingRef = useRef<boolean>(false);
  const lastWsRefreshTimeRef = useRef<number>(0); // Track last WebSocket refresh to prevent duplicates
  const pendingRefreshRef = useRef<{ symbols: string[] } | null>(null); // Track if a refresh is pending while loading
  const loadingRef = useRef<boolean>(false); // Track loading state to avoid stale closure issues
  
  // Refs to avoid stale closures in WebSocket callbacks
  const tfRef = useRef<Timeframe>(tf);
  const selectedRef = useRef<string[]>(selected);
  
  // Track the last additionalSettings we synced from to detect changes
  const lastSyncedSettingsRef = useRef<string | null>(null);
  
  // Sync state from parsed additionalSettings - handles both initial load and late-arriving settings
  useEffect(() => {
    // Only sync if additionalSettings has changed since last sync
    if (additionalSettings === lastSyncedSettingsRef.current) {
      return;
    }
    
    if (parsedAdditionalSettings) {
      console.log('[CurrencyStrength] Syncing from additionalSettings:', parsedAdditionalSettings);
      lastSyncedSettingsRef.current = additionalSettings || null;
      
      // Sync currencies from settings
      if (parsedAdditionalSettings.currencies && Array.isArray(parsedAdditionalSettings.currencies)) {
        setSelected(parsedAdditionalSettings.currencies);
      }
      
      // Sync timeframe from settings
      if (parsedAdditionalSettings.timeframe) {
        setTf(parsedAdditionalSettings.timeframe);
        loadedRef.current = ''; // Force data reload with new timeframe
      }
    } else if (externalSettings && !lastSyncedSettingsRef.current) {
      // Only use externalSettings if we haven't synced from additionalSettings yet
      console.log('[CurrencyStrength] Syncing from externalSettings:', externalSettings);
      
      // Fallback to externalSettings
      if (externalSettings.currencies && Array.isArray(externalSettings.currencies)) {
        setSelected(externalSettings.currencies);
      }
      if (externalSettings.timeframe) {
        setTf(externalSettings.timeframe);
        loadedRef.current = '';
      }
    }
  }, [parsedAdditionalSettings, externalSettings, additionalSettings]);
  
  // Save settings to database
  const saveSettingsToDatabase = async (currencies: string[], timeframeValue: Timeframe) => {
    // Create settings object
    const additionalSettingsObj = {
      currencies: currencies,
      timeframe: timeframeValue,
      showVolume: 1
    };
    
    // If onSaveSettings callback is provided (widget is inside a container like TabbedWidget),
    // use it instead of calling the API directly
    if (onSaveSettings) {
      console.log('📡 [CurrencyStrength] Using onSaveSettings callback (inside container widget):', additionalSettingsObj);
      onSaveSettings(additionalSettingsObj);
      return;
    }
    
    // Otherwise, save directly via API (standalone widget)
    // wgid must be a valid numeric customDashboardWidgetID
    const numericWgid = wgid ? parseInt(wgid, 10) : NaN;
    
    if (!wgid || isNaN(numericWgid) || !activeTemplateId) {
      console.log('[CurrencyStrength] Cannot save settings - invalid wgid or missing activeTemplateId', { wgid, numericWgid, activeTemplateId });
      return;
    }
    
    try {
      const updateFields = {
        additionalSettings: JSON.stringify(additionalSettingsObj),
      };
      
      console.log('📡 [CurrencyStrength] Calling updateWidgetFieldsWeb API (standalone widget):', {
        widgetId: numericWgid,
        templateId: activeTemplateId,
        additionalSettings: additionalSettingsObj,
        updateFields
      });
      
      const result = await updateWidgetFields(wgid, activeTemplateId, updateFields);
      
      if (result.success) {
        console.log('✅ [CurrencyStrength] Settings saved to database');
      } else {
        console.warn('⚠️ [CurrencyStrength] Failed to save settings:', result.message);
      }
    } catch (error) {
      console.error('❌ [CurrencyStrength] Error saving settings to database:', error);
    }
  };
  
  // Keep refs in sync with state
  useEffect(() => {
    tfRef.current = tf;
  }, [tf]);
  
  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);
  
  // Global resize state to prevent API calls during window resize
  useEffect(() => {
    let globalResizeTimeout: NodeJS.Timeout | null = null;
    
    const handleGlobalResize = () => {
      isResizingRef.current = true;
      if (globalResizeTimeout) clearTimeout(globalResizeTimeout);
      globalResizeTimeout = setTimeout(() => {
        isResizingRef.current = false;
      }, 1500);
    };
    
    window.addEventListener('resize', handleGlobalResize);
    return () => {
      window.removeEventListener('resize', handleGlobalResize);
      if (globalResizeTimeout) clearTimeout(globalResizeTimeout);
    };
  }, []);

  // Map timeframe to WebSocket refresh key
  const TIMEFRAME_TO_REFRESH_KEY: Record<string, string> = {
    '30d': 'CurrencyStrength30d', 
    '7d': 'CurrencyStrength7d', 
    '5d': 'CurrencyStrength5d',
    '1d': 'CurrencyStrength24h', 
    '8h': 'CurrencyStrength8h', 
    'today': 'CurrencyStrengthtoday',
    'CurrentWeek': 'CurrencyStrengthweekly',
    'TW': 'CurrencyStrengthweekly',
    'TD': 'CurrencyStrengthtoday',
  };
  
  const refreshKey = useMemo(() => {
    return TIMEFRAME_TO_REFRESH_KEY[tf];
  }, [tf]);
  
  // Ref for refreshKey to use in callbacks (avoids stale closure)
  const refreshKeyRef = useRef<string>(refreshKey);
  useEffect(() => {
    refreshKeyRef.current = refreshKey;
  }, [refreshKey, tf]);

  // Initialize chart
  useEffect(() => {
    if (!containerRef.current) return;
    chartRef.current = createChart(containerRef.current, {
      layout: { background: { color: '#000000' }, textColor: '#9ca3af' },
      grid: { vertLines: { color: '#0a0a0a' }, horzLines: { color: '#0a0a0a' } },
      rightPriceScale: { 
        borderColor: '#374151',
        scaleMargins: { top: 0, bottom: 0 },
      },
      timeScale: { 
        rightOffset: 2, 
        fixLeftEdge: true, 
        fixRightEdge: true, // Lock right edge to prevent scrolling beyond latest data
        borderColor: '#374151',
        tickMarkFormatter: (time: any) => {
          const date = typeof time === 'number' ? new Date(time * 1000) : new Date(time);
          const currentTf = tfRef.current;
          
          // For intraday timeframes (8h, 1d, TD/today), show time in UTC
          if (currentTf === '8h' || currentTf === '1d' || currentTf === 'TD' || currentTf === 'today') {
            const hours = date.getUTCHours();
            const minutes = date.getUTCMinutes();
            const ampm = hours >= 12 ? 'PM' : 'AM';
            const displayHours = hours % 12 || 12;
            return `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
          }
          
          // For multi-day timeframes, show date in UTC
          const month = date.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
          const day = date.getUTCDate();
          return `${month} ${day}`;
        }
      },
      localization: {
        timeFormatter: (time: any) => {
          try {
            // Display time as-is from API (UTC) without timezone conversion
            const date = typeof time === 'number' ? new Date(time * 1000) : new Date(time);
            const currentTf = tfRef.current;
            
            // For intraday timeframes, show time with date
            if (currentTf === '8h' || currentTf === '1d' || currentTf === 'TD' || currentTf === 'today') {
              const hours = date.getUTCHours();
              const minutes = date.getUTCMinutes();
              const ampm = hours >= 12 ? 'PM' : 'AM';
              const displayHours = hours % 12 || 12;
              const month = date.getUTCMonth() + 1;
              const day = date.getUTCDate();
              const year = date.getUTCFullYear();
              return `${month}/${day}/${year} ${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
            }
            
            // For multi-day timeframes, show date only
            const month = date.getUTCMonth() + 1;
            const day = date.getUTCDate();
            const year = date.getUTCFullYear();
            return `${month}/${day}/${year}`;
          } catch {
            // Fallback if error
            const date = typeof time === 'number' ? new Date(time * 1000) : new Date(time);
            const month = date.getUTCMonth() + 1;
            const day = date.getUTCDate();
            const year = date.getUTCFullYear();
            return `${month}/${day}/${year}`;
          }
        },
      },
      handleScroll: {
        mouseWheel: true, // Enable mouse wheel horizontal scrolling
        pressedMouseMove: true, // Enable drag horizontal scrolling
        horzTouchDrag: true, // Enable touch horizontal scrolling
        vertTouchDrag: true, // Allow vertical touch scrolling for price scale
      },
      handleScale: {
        axisPressedMouseMove: { time: true, price: true }, // Allow both time and price scale zoom
        mouseWheel: true, // Allow mouse wheel for zooming
        pinch: true, // Allow pinch to zoom
      },
      crosshair: { mode: 0 },
      autoSize: true,
    });
    
    // Create grey dashed zero line immediately
    zeroSeriesRef.current = chartRef.current.addLineSeries({ 
      color: '#9ca3af', // Grey color
      lineWidth: 1,
      lineStyle: 1, // Dashed line (0 = solid, 1 = dashed, 2 = dotted)
      priceLineVisible: false,
      lastValueVisible: false,
    });
    // Set initial data points with wide range - will be updated when data loads
    const now = Date.now() / 1000;
    const wideRangePast = 86400 * 30; // 30 days in the past
    zeroSeriesRef.current.setData([
      { time: (now - wideRangePast) as Time, value: 0 },
      { time: now as Time, value: 0 } // Only extend to current time, not into future
    ]);
    
    // Subscribe to visible time range changes to detect zoom
    const timeScale = chartRef.current.timeScale();
    timeScale.subscribeVisibleTimeRangeChange((timeRange) => {
      if (!timeRange || !dataTimeRangeRef.current) return;
      
      // Calculate if we're zoomed in (visible range is smaller than data range)
      const dataRange = dataTimeRangeRef.current.to - dataTimeRangeRef.current.from;
      const visibleRange = (timeRange.to as number) - (timeRange.from as number);
      const isZoomed = visibleRange < dataRange * 0.99;
      
      if (isZoomed !== isZoomedInRef.current) {
        isZoomedInRef.current = isZoomed;
        
        // Update chart options based on zoom state
        if (isZoomed) {
          chartRef.current?.applyOptions({
            timeScale: {
              fixLeftEdge: false,
              fixRightEdge: false,
            },
            handleScroll: {
              mouseWheel: true,
              pressedMouseMove: true,
              horzTouchDrag: true,
              vertTouchDrag: true,
            },
          });
        } else {
          chartRef.current?.applyOptions({
            timeScale: {
              fixLeftEdge: true,
              fixRightEdge: true,
            },
            handleScroll: {
              mouseWheel: false,
              pressedMouseMove: false,
              horzTouchDrag: false,
              vertTouchDrag: true,
            },
          });
        }
      }
      
    });
    
    // Setup crosshair move handler for tooltip
    chartRef.current.subscribeCrosshairMove(param => {
      if (!tooltipRef.current || !containerRef.current) return;
      
      if (param.point === undefined || !param.time || param.point.x < 0 || param.point.x > containerRef.current.clientWidth || 
          param.point.y < 0 || param.point.y > containerRef.current.clientHeight) {
        tooltipRef.current.style.display = 'none';
      } else {
        const tooltip = tooltipRef.current;
        tooltip.style.display = 'block';
        // Position tooltip near cursor, offset to the right
        tooltip.style.left = `${param.point.x + 20}px`;
        tooltip.style.top = `${param.point.y - 10}px`;
        
        // Format the date from the time parameter using user's date preference
        let dateStr = '';
        if (param.time) {
          const timeValue = typeof param.time === 'number' ? param.time : (param.time as any).timestamp || Date.now() / 1000;
          const date = new Date(timeValue * 1000);
          dateStr = formatDateRef.current(date);
        }
        
        // Get data for all selected series at this time point
        let tooltipContent = '';
        
        // Add date header
        if (dateStr) {
          tooltipContent += `<div style="margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid rgba(42, 42, 42, 0.8); font-size: 11px; color: #9ca3af; font-weight: 500;">${dateStr}</div>`;
        }
        
        selected.forEach(currency => {
          const series = seriesRef.current[currency];
          if (!series) return;
          
          const data = series.data();
          const pointAtTime = data.find((d: any) => d.time === param.time);
          
          if (pointAtTime && 'value' in pointAtTime) {
            const value = pointAtTime.value;
            const color = DEFAULT_COLORS[currency] || '#9ca3af';
            tooltipContent += `<div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
              <div style="width: 12px; height: 2px; background-color: ${color}"></div>
              <span style="color: ${color}; font-size: 11px;">${currency}: ${value.toFixed(2)}</span>
            </div>`;
          }
        });
        
        if (tooltipContent) {
          tooltip.innerHTML = tooltipContent;
        } else {
          tooltip.style.display = 'none';
        }
      }
    });
    
    const resize = () => {
      chartRef.current?.timeScale().fitContent();
    };
    const ro = new ResizeObserver(() => resize());
    ro.observe(containerRef.current);
    return () => { 
      ro.disconnect(); 
      // Clean up zero dash segments
      zeroDashSegmentsRef.current.forEach((segment) => {
        try {
          chartRef.current?.removeSeries(segment);
        } catch (e) {
          // Ignore errors
        }
      });
      zeroDashSegmentsRef.current = [];
      
      chartRef.current?.remove(); 
      chartRef.current = null; 
      seriesRef.current = {};
      zeroSeriesRef.current = null; 
    };
  }, []);

  // Debounced version to prevent excessive API calls
  const loadDataDebounced = (symbols: string[], delay = 300) => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    debounceTimeoutRef.current = setTimeout(() => {
      loadDataImmediate(symbols);
    }, delay);
  };

  // Fetch and render series for selected currencies
  async function loadDataImmediate(symbols: string[]) {
    if (!chartRef.current) return;
    if (isResizingRef.current) return;
    
    // If already loading, queue this refresh for later
    if (loadingRef.current) {
      pendingRefreshRef.current = { symbols };
      return;
    }
    
    // If no symbols selected, just remove all series and return
    if (symbols.length === 0) {
      const existingKeys = Object.keys(seriesRef.current);
      for (const key of existingKeys) {
        try {
          chartRef.current.removeSeries(seriesRef.current[key]);
        } catch {}
        delete seriesRef.current[key];
      }
      return;
    }
    
    // Check if we already loaded this exact configuration AND all series exist
    const loadKey = `${tf}-${symbols.sort().join(',')}`;
    const allSeriesExist = symbols.every(symbol => seriesRef.current[symbol] !== undefined);
    
    if (loadedRef.current === loadKey && allSeriesExist) {
      return; // Already loaded this configuration
    }
    
    // If we have existing data and series are missing, try to recreate from existing data first
    if (currentData && !allSeriesExist) {
      renderChartData(currentData, symbols);
      loadedRef.current = loadKey;
      return;
    }
    
    setLoading(true);
    loadingRef.current = true;
    setError(null);
    
    // Remove any series that are no longer selected
    const existingKeys = Object.keys(seriesRef.current);
    for (const key of existingKeys) {
      if (!symbols.includes(key)) {
        try {
          chartRef.current.removeSeries(seriesRef.current[key]);
        } catch {}
        delete seriesRef.current[key];
      }
    }
    
    // Fetch data for the current timeframe only - no fallback to prevent wrong data
    let payload: any | null = null;
    
    try {
      const shouldClearCache = loadedRef.current === '';
      const res = await fetchCurrencyStrengthSelected(tf, symbols, 'EURUSD', shouldClearCache);
      
      const maybe = (res && typeof res === 'object' && 'data' in res) ? (res as any).data : res;
      
      const hasSome = maybe && Array.isArray(maybe.cslabel) && (symbols.length === 0 || symbols.some(c => Array.isArray(maybe[c]) && (maybe[c] as any[]).length > 0));
      if (hasSome) { 
        payload = maybe; 
      }
    } catch (e) {
      console.error('[CurrencyStrength] Failed to fetch data for timeframe:', tf, e);
    }
    
    if (!payload) {
      setLoading(false);
      loadingRef.current = false;
      setError('No data returned for the selected timeframe.');
      
      // Even on error, check for pending refresh
      if (pendingRefreshRef.current) {
        const pending = pendingRefreshRef.current;
        pendingRefreshRef.current = null;
        loadedRef.current = '';
        setTimeout(() => loadDataImmediate(pending.symbols), 50);
      }
      return;
    }
    
    // Update current data state
    setCurrentData(payload);
    
    // Render chart with data
    renderChartData(payload, symbols);
    
    setLoading(false);
    loadingRef.current = false;
    
    // Check if there's a pending refresh that came in while we were loading
    if (pendingRefreshRef.current) {
      const pending = pendingRefreshRef.current;
      pendingRefreshRef.current = null;
      // Reset loadedRef to force a fresh fetch
      loadedRef.current = '';
      // Use setTimeout to avoid immediate recursion
      setTimeout(() => {
        loadDataImmediate(pending.symbols);
      }, 50);
      return;
    }
    
    // Mark this configuration as successfully loaded
    loadedRef.current = loadKey;
  }

  // Update latest values from current data
  const updateLatestValues = (payload: any, symbols: string[]) => {
    const newLatestValues: Record<string, number> = {};
    
    symbols.forEach(cur => {
      const arr = Array.isArray(payload?.[cur]) ? payload[cur] : Array.isArray(payload?.values?.[cur]) ? payload.values[cur] : [];
      if (arr.length > 0) {
        const lastValue = arr[arr.length - 1];
        const val = (lastValue && typeof lastValue === 'object' && 'value' in lastValue) 
          ? Number(lastValue.value) 
          : Number(lastValue ?? 0);
        newLatestValues[cur] = val;
      }
    });
    
    setLatestValues(newLatestValues);
    setLastUpdateTime(new Date());
  }

  // Handle real-time WebSocket data updates
  const handleRealtimeDataUpdate = (data: any) => {
    if (!data || typeof data !== 'object') return;
    
    // Check if this is currency strength data
    const hasCurrencyData = selected.some(currency => 
      data[currency] !== undefined || 
      (data.values && data.values[currency] !== undefined)
    );
    
    if (hasCurrencyData) {
      // Only update the displayed latest values, don't add points to the chart
      // Adding individual points causes timestamp mismatches - rely on full data refresh instead
      const newLatestValues: Record<string, number> = {};
      
      selected.forEach(currency => {
        // Try different data structures
        let value: number | undefined;
        
        if (data[currency] !== undefined) {
          value = typeof data[currency] === 'number' ? data[currency] : Number(data[currency]);
        } else if (data.values && data.values[currency] !== undefined) {
          value = typeof data.values[currency] === 'number' ? data.values[currency] : Number(data.values[currency]);
        } else if (data.currencies && data.currencies[currency] !== undefined) {
          value = typeof data.currencies[currency] === 'number' ? data.currencies[currency] : Number(data.currencies[currency]);
        }
        
        if (value !== undefined && !isNaN(value)) {
          newLatestValues[currency] = value;
        }
      });
      
      if (Object.keys(newLatestValues).length > 0) {
        setLatestValues(prev => ({ ...prev, ...newLatestValues }));
        setLastUpdateTime(new Date());
      }
    }
  };

  // Render chart data (extracted for reuse)
  function renderChartData(payload: any, symbols: string[]) {
    if (!chartRef.current) return;
    
    // Remove any series that are no longer in the symbols array
    const existingKeys = Object.keys(seriesRef.current);
    for (const key of existingKeys) {
      if (!symbols.includes(key)) {
        try {
          chartRef.current.removeSeries(seriesRef.current[key]);
        } catch (e) {
          // Ignore removal errors
        }
        delete seriesRef.current[key];
      }
    }
    
    let labelsRaw: any[] = Array.isArray(payload?.cslabel) ? payload.cslabel : (Array.isArray(payload?.labels) ? payload.labels : []);
    
    // Console log last 10 raw data points for debugging
    console.log('📊 [CurrencyStrength] Last 10 raw timestamps from API:', labelsRaw.slice(-10));
    if (symbols.length > 0) {
      const firstCurrency = symbols[0];
      const currencyData = Array.isArray(payload?.[firstCurrency]) ? payload[firstCurrency] : [];
      console.log(`📊 [CurrencyStrength] Last 10 raw ${firstCurrency} data points:`, currencyData.slice(-10));
    }
    
    // Normalize time to seconds for lightweight-charts
    const labels: number[] = labelsRaw.map((t: any) => {
      const raw = (t && typeof t === 'object' && 'label' in t) ? (t as any).label : t;
      const n = Number(raw);
      if (Number.isFinite(n)) {
        if (n > 1e12) return Math.floor(n / 1000); // ms → s
        if (n > 1e10 && n < 1e13) return Math.floor(n / 1000); // ms range safeguard
        return n; // seconds
      }
      // try ISO/date string
      const d = new Date(String(raw)).getTime();
      return Number.isFinite(d) ? Math.floor(d / 1000) : NaN;
    }).filter((v) => Number.isFinite(v));
    
    console.log('📊 [CurrencyStrength] Last 10 processed timestamps (seconds):', labels.slice(-10));
    
    // For each selected currency, extract its series array and render
    for (const cur of symbols) {
      const arr: any[] = Array.isArray(payload?.[cur]) ? payload[cur] : Array.isArray(payload?.values?.[cur]) ? payload.values[cur] : [];
      const points: Point[] = labels
        .map((t: number, i: number) => {
          const vraw = arr[i];
          const val = (vraw && typeof vraw === 'object' && 'value' in vraw) ? Number(vraw.value) : Number(vraw ?? 0);
          return { time: t as Time, value: val };
        })
        .filter(p => Number.isFinite(p.time as number) && Number.isFinite(p.value as number))
        .sort((a, b) => (a.time as number) - (b.time as number));
      
      if (!seriesRef.current[cur]) {
        if (!chartRef.current) return;
        seriesRef.current[cur] = chartRef.current.addLineSeries({ 
          color: DEFAULT_COLORS[cur] || '#8b5cf6', 
          priceLineVisible: false,
          lastValueVisible: true,
          title: cur,
        });
      }
      seriesRef.current[cur].setData(points);
    }
    
    // Final null check before fitting content
    if (chartRef.current) {
      // Store the data time range for zoom detection
      // Use the labels array which has the actual timestamps
      const allTimes: number[] = labels.length > 0 ? [...labels] : [];
      
      if (allTimes.length > 0) {
        const minTime = Math.min(...allTimes);
        const maxTime = Math.max(...allTimes);
        dataTimeRangeRef.current = { from: minTime, to: maxTime };
        
        // Create single grey dashed zero line spanning full width
        // Remove existing zero line if it exists
        if (zeroSeriesRef.current) {
          try {
            chartRef.current?.removeSeries(zeroSeriesRef.current);
          } catch (e) {
            // Ignore errors
          }
          zeroSeriesRef.current = null;
        }
        
        // Remove any existing dash segments
        zeroDashSegmentsRef.current.forEach((segment) => {
          try {
            chartRef.current?.removeSeries(segment);
          } catch (e) {
            // Ignore errors
          }
        });
        zeroDashSegmentsRef.current = [];
        
        // Create custom dashed zero line with longer dashes and bigger gaps
        const timeRange = maxTime - minTime;
        // Only extend backwards, not into the future
        const timePadding = Math.max(timeRange * 0.5, 86400 * 7); // 50% padding or at least 7 days
        const extendedMinTime = minTime - timePadding;
        const extendedMaxTime = maxTime; // Don't extend into the future
        const totalRange = extendedMaxTime - extendedMinTime;
        
        // Create dashes with LONGER dashes and BIGGER gaps
        const dashCount = 1; // Fewer dashes = longer individual dashes
        const dashRatio = 0.1; // 10% dash, 90% gap (much longer dashes with much more space)
        const segmentDuration = totalRange / dashCount;
        const dashDuration = segmentDuration * dashRatio; // Longer dashes
        const gapDuration = segmentDuration * (1 - dashRatio); // Bigger gaps
        
        for (let i = 0; i < dashCount; i++) {
          const segmentStart = extendedMinTime + (i * segmentDuration);
          let dashStart = segmentStart;
          let dashEnd = dashStart + dashDuration;
          
          // For the last dash, extend it to maxTime to ensure full coverage
          if (i === dashCount - 1) {
            dashEnd = extendedMaxTime;
          }
          
          // Ensure dash is within bounds
          dashStart = Math.max(dashStart, extendedMinTime);
          dashEnd = Math.min(dashEnd, extendedMaxTime);
          
          // Only create dash if it's valid
          if (dashEnd > dashStart) {
            // Create a separate line series for each dash segment
            const dashSegment = chartRef.current.addLineSeries({
              color: '#6b7280', // Darker grey color
              lineWidth: 1,
              lineStyle: 0, // Solid (we're creating dashes manually)
              priceLineVisible: false,
              lastValueVisible: false,
            });
            
            dashSegment.setData([
              { time: dashStart as Time, value: 0 },
              { time: dashEnd as Time, value: 0 }
            ]);
            
            zeroDashSegmentsRef.current.push(dashSegment);
          }
        }
      }
      
      chartRef.current.timeScale().fitContent();
      
      // Reset zoom state after fitting content
      setTimeout(() => {
        isZoomedInRef.current = false;
        chartRef.current?.applyOptions({
          timeScale: {
            fixLeftEdge: true,
            fixRightEdge: true,
          },
          handleScroll: {
            mouseWheel: false,
            pressedMouseMove: false,
            horzTouchDrag: false,
            vertTouchDrag: true,
          },
        });
      }, 100);
    }
    
    // Update latest values for real-time display
    updateLatestValues(payload, symbols);
  }

  // Use a stable string representation of selected currencies
  const selectedKey = useMemo(() => [...selected].sort().join(','), [selected]);
  
  // Render initial SSR data if available
  useEffect(() => {
    if (initialData && chartRef.current && !loading) {
      renderChartData(initialData, selected);
      loadedRef.current = `${tf}-${selected.sort().join(',')}`;
    }
  }, [initialData, selected, tf]);

  useEffect(() => { 
    if (isResizingRef.current) return;
    
    // Only load data if we don't have SSR data or if timeframe/currencies changed
    if (!initialData || tf !== ssrTimeframe || selectedKey !== (ssrCurrencies?.sort().join(',') || '')) {
      const timeoutId = setTimeout(() => loadDataImmediate(selected), 100);
      return () => clearTimeout(timeoutId);
    }
  }, [tf, selectedKey]);

  // WebSocket connection management
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Set up real-time data listener for detailed WebSocket data
    const handleRealtimeData = (event: Event) => {
      const customEvent = event as CustomEvent<{
        widgetName: string;
        data: any;
        rawData: string;
        timestamp: string;
      }>;
      
      const { widgetName, data } = customEvent.detail;
      
      // Use refs to get current values (avoids stale closures)
      const currentTf = tfRef.current;
      const currentRefreshKey = refreshKeyRef.current;
      const currentSelected = selectedRef.current;
      
      // Check if this is currency-related data
      const isCurrencyUpdate = widgetName.toLowerCase().includes('currency') || 
                             widgetName.toLowerCase().includes('strength') ||
                             widgetName === 'DXM' ||
                             widgetName.includes('CurrencyStrength');
      
      if (!isCurrencyUpdate) return;
      
      // Check if this update matches our current timeframe
      const timeframeMatch = widgetName === currentRefreshKey;
      
      // IMPORTANT: Only process data if it matches the current timeframe
      // This prevents data from other timeframes (e.g., 7d) from overwriting the current view
      if (!timeframeMatch) {
        return;
      }
      
      if (data) {
        handleRealtimeDataUpdate(data);
      } else {
        // Debounce WebSocket refreshes - prevent duplicate refreshes within 500ms
        const now = Date.now();
        if (now - lastWsRefreshTimeRef.current < 500) {
          return;
        }
        lastWsRefreshTimeRef.current = now;
        
        // When we get a timeframe-specific notification without data, trigger a full data refresh
        if (!isResizingRef.current) {
          console.log('🔄 [CurrencyStrength] WebSocket refresh for', currentTf);
          loadedRef.current = '';
          loadDataDebounced(currentSelected, 100);
        }
      }
    };

    const connectWebSocket = async () => {
      try {
        // Set up connection status callback
        widgetDataWebSocket.onConnectionStatus((status) => {
          setWsConnectionStatus(status);
        });

        // Set up widget update callback
        widgetDataWebSocket.onWidgetUpdate((widgetName) => {
          // Use refs to get current values (avoids stale closures)
          const currentRefreshKey = refreshKeyRef.current;
          const currentSelected = selectedRef.current;
          
          // Check if this is a currency-related update
          const isCurrencyUpdate = widgetName.toLowerCase().includes('currency') || 
                                 widgetName.toLowerCase().includes('strength') ||
                                 widgetName === 'DXM' ||
                                 widgetName.includes('CurrencyStrength');
          
          if (!isCurrencyUpdate) return;
          
          // Check if this update matches our current timeframe
          const timeframeMatch = widgetName === currentRefreshKey;
          
          // IMPORTANT: Only process updates that match the current timeframe
          // This prevents updates from other timeframes (e.g., CurrencyStrength7d) from triggering refreshes
          if (!timeframeMatch) {
            return;
          }
          
          if (isResizingRef.current) return;
          
          // Debounce WebSocket refreshes - prevent duplicate refreshes within 500ms
          const now = Date.now();
          if (now - lastWsRefreshTimeRef.current < 500) return;
          lastWsRefreshTimeRef.current = now;
          
          console.log('🔄 [CurrencyStrength] WebSocket refresh for', tfRef.current);
          loadedRef.current = '';
          loadDataDebounced(currentSelected, 200);
        });

        // Add event listener
        window.addEventListener('pmt-widget-data', handleRealtimeData);

        // Connect to WebSocket with timeout handling
        await widgetDataWebSocket.connect();
      } catch (error) {
        console.error('❌ [CurrencyStrength] Failed to connect to WebSocket:', error);
        setWsConnectionStatus('error');
      }
    };

    // Add a small delay to ensure component is fully mounted
    const timeoutId = setTimeout(() => {
      connectWebSocket();
    }, 500);

    // Cleanup on unmount
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('pmt-widget-data', handleRealtimeData);
      // Don't disconnect the WebSocket here as other widgets might be using it
      // The singleton will handle cleanup when no widgets are using it
    };
  }, []); // Empty dependency array - we use refs for all values that need to stay current

  // Legacy event listeners for backward compatibility
  useEffect(() => {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<{ timeline: string }>;
      const receivedTimeline = customEvent.detail.timeline;
      
      // Use refs for current values
      const currentTf = tfRef.current;
      const currentSelected = selectedRef.current;
      
      // Map WebSocket timeline names to our timeframe values
      const timelineMap: Record<string, Timeframe> = {
        '30d': '30d', 
        '7d': '7d', 
        '5d': '5d', 
        '24h': '1d', 
        '8h': '8h', 
        'today': 'today', 
        'weekly': 'CurrentWeek',
      };
      
      const mappedTf = timelineMap[receivedTimeline];
      
      if (mappedTf && mappedTf === currentTf) {
        loadDataDebounced(currentSelected, 100); // WebSocket updates can be debounced
      }
    };
    
    // Listen for ALL RTS events and log them, refresh if relevant
    const debugHandler = (event: Event) => {
      const customEvent = event as CustomEvent<string>;
      const widgetName = customEvent.detail;
      
      // Use ref for current selected
      const currentSelected = selectedRef.current;
      const currentRefreshKey = refreshKeyRef.current;
      
      // Only refresh if this is specifically a DXM update OR if the currency update matches our timeframe
      // This prevents CurrencyStrengthtoday from triggering a refresh when we're on 8H, etc.
      const isDXM = widgetName === 'DXM';
      const isMatchingCurrencyUpdate = widgetName === currentRefreshKey;
      
      if (isDXM || isMatchingCurrencyUpdate) {
        if (isResizingRef.current) return;
        loadDataDebounced(currentSelected, 200);
      }
    };
    
    window.addEventListener('pmt-cs-refresh', handler);
    window.addEventListener('pmt-rts', debugHandler);
    
    return () => {
      window.removeEventListener('pmt-cs-refresh', handler);
      window.removeEventListener('pmt-rts', debugHandler);
    };
  }, []); // Empty dependency array - use refs for all values

  // Legacy initialization removed - now using React implementation

  // Legacy pattern implementation removed - now using React implementation

  // Get current values for each currency to display on the chart
  const getCurrentValues = useMemo(() => {
    if (!currentData || !currentData.cslabel) return {};
    
    const values: Record<string, number> = {};
    const labelsRaw = currentData.cslabel;
    
    selected.forEach(cur => {
      const arr = Array.isArray(currentData[cur]) ? currentData[cur] : [];
      if (arr.length > 0) {
        const lastValue = arr[arr.length - 1];
        const val = (lastValue && typeof lastValue === 'object' && 'value' in lastValue) 
          ? Number(lastValue.value) 
          : Number(lastValue ?? 0);
        values[cur] = val;
      }
    });
    
    return values;
  }, [currentData, selected]);

  // Bloomberg-style UI implementation
  
  return (
    <div className="flex flex-col h-full bg-widget-body border border-border rounded-none overflow-hidden">
      {/* Header - Bloomberg Style */}
      <WidgetHeader
        title="Currency Strength"
        onRemove={onRemove}
        onFullscreen={onFullscreen}
        helpContent="Displays the relative strength of major currencies over time. Higher values indicate stronger currency performance. Use the timeframe buttons to view different periods and toggle currencies on/off to focus on specific pairs."
      >
        {/* WebSocket Connection Status Indicator */}
        <div className="flex items-center gap-1 mr-2">
          <div 
            className={`w-2 h-2 rounded-full ${
              wsConnectionStatus === 'connected' ? 'bg-green-500' :
              wsConnectionStatus === 'connecting' ? 'bg-yellow-500' :
              wsConnectionStatus === 'error' ? 'bg-red-500' :
              'bg-gray-500'
            }`}
            title={`WebSocket: ${wsConnectionStatus}`}
          />
          {wsConnectionStatus === 'connected' && (
            <span className="text-xs text-green-500 hidden sm:inline">Live</span>
          )}
        </div>
        {/* Timeframe Selector - Bloomberg style buttons */}
        <div className="flex gap-1 mr-2">
          {[
            { value: 'TD', label: 'TD' },
            { value: 'TW', label: 'TW' },
            { value: '8h', label: '8H' },
            { value: '1d', label: '1D' },
            { value: '5d', label: '5D' },
            { value: '7d', label: '7D' },
            { value: '30d', label: '1M' }
          ].map((timeframeOption) => (
            <button
              key={timeframeOption.value}
              onClick={() => {
                const newTf = timeframeOption.value as Timeframe;
                setTf(newTf);
                loadedRef.current = '';
                // Save settings to database when timeframe changes
                saveSettingsToDatabase(selected, newTf);
              }}
              className={`h-7 px-2 rounded text-xs transition-colors ${
                tf === timeframeOption.value
                  ? 'bg-primary/20 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              {timeframeOption.label}
            </button>
          ))}
        </div>
      </WidgetHeader>

      {/* Currency toggles - Bloomberg style */}
      <div className="border-b border-border bg-widget-header px-3 py-2 flex flex-wrap items-center gap-x-4 gap-y-2">
        {DEFAULT_CURRENCIES.map((currency) => {
          const isSelected = selected.includes(currency);
          return (
          <button
            key={currency}
            onClick={() => {
              setSelected((prev) => {
                  const isCurrentlySelected = prev.includes(currency);
                  const next = isCurrentlySelected 
                  ? prev.filter((x) => x !== currency)
                  : Array.from(new Set([...prev, currency]));
                loadedRef.current = '';
                // Save settings to database when currencies change
                saveSettingsToDatabase(next, tf);
                return next;
              });
            }}
            className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
          >
            <div
              className="w-4 h-0.5 rounded transition-opacity"
              style={{
                backgroundColor: DEFAULT_COLORS[currency],
                  opacity: isSelected ? 1 : 0.3
              }}
            ></div>
            <span
              className="text-xs transition-opacity"
              style={{ 
                  opacity: isSelected ? 1 : 0.5,
                  color: isSelected ? 'var(--foreground)' : 'var(--muted-foreground)'
              }}
            >
              {currency}
            </span>
          </button>
          );
        })}
      </div>

      {/* Chart Container */}
      <div className="flex-1 min-h-0 relative">
        {error ? (
          <div className="h-full flex items-center justify-center text-muted-foreground text-sm">{error}</div>
        ) : (
          <>
            <div ref={containerRef} className="h-full w-full relative" style={{ position: 'relative' }} />
            
            {/* Floating Tooltip */}
            <div
              ref={tooltipRef}
                      style={{
                position: 'absolute',
                display: 'none',
                backgroundColor: 'rgba(26, 26, 26, 0.95)',
                border: '1px solid rgba(42, 42, 42, 0.8)',
                borderRadius: '6px',
                padding: '8px 12px',
                fontSize: '11px',
                pointerEvents: 'none',
                zIndex: 1000,
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
              }}
            />
          </>
        )}
        
        {loading && (
          <div className="absolute right-3 bottom-3 text-xs text-muted-foreground bg-widget-header/90 px-2 py-1 rounded border border-border">
            Loading…
          </div>
        )}
      </div>
    </div>
  );
}

export default CurrencyStrengthWidget;
