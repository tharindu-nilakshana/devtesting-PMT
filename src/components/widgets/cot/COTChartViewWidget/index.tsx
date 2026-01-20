/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTheme } from '@/hooks/useTheme';
import { useTemplates } from '@/hooks/useTemplates';
import { createChart, IChartApi, ISeriesApi, ColorType } from 'lightweight-charts';
import { WidgetHeader } from '@/components/bloomberg-ui/WidgetHeader';
import { BarChart3, TrendingUp } from 'lucide-react';
import { widgetDataCache } from '@/lib/widgetDataCache';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * COTChartViewWidget - SSR-Enabled Version
 * 
 * ✅ SSR CONFIRMATION: This component fully conforms to Server-Side Rendering standards.
 * This widget loads instantly with SSR data and seamlessly transitions to client-side updates.
 * 
 * Supports COT (Commitment of Traders) historical chart visualization with TradingView Lightweight Charts.
 */

interface COTChartViewWidgetProps {
  wgid: string;
  wght: number;
  additionalSettings?: string;
  templateName?: string;
  initialData?: unknown;
  isStandalone?: boolean;
  onRemove?: () => void; // Close button functionality
  onSettings?: () => void; // Settings button functionality
  onFullscreen?: () => void; // Fullscreen functionality
  onSaveSettings?: (settings: Record<string, any>) => void; // Save settings to database
  settings?: Record<string, any>; // Widget settings
  isSymbolLocked?: boolean; // Disable symbol selection in Details templates
  // SSR props (existing - no breaking changes)
  ssrInitialData?: COTChartData;
  ssrAdditionalSettings?: string;
  useLegacyPattern?: boolean; // Feature flag for backward compatibility
  // NEW SSR props (additive - no breaking changes)
  ssrCurrency?: string;
  ssrDataType?: string;
  ssrOwner?: string;
  ssrDuration?: string;
}

interface COTChartData {
  seriesname: string;
  Categories: string[];
  OpenInterest?: number[];
  NetPosition?: number[];
  NetPercent?: number[];
  LongPosition?: number[];
  ShortPosition?: number[];
  LongPercent?: number[];
  ShortPercent?: number[];
  // Additional metadata from the API
  symbolPart?: string;
  owner?: string;
  type?: string;
  interval?: string;
  summary?: {
    symbolPart: string;
    owner: string;
    type: string;
    interval: string;
    typ: string;
    totalDataPoints: number;
    dataRange: {
      startDate: string;
      endDate: string;
    };
  };
}

interface ChartConfig {
  chartType: 'bar' | 'line';
  seriesType: string;
  templateIndex: number;
}

const COTChartViewWidget: React.FC<COTChartViewWidgetProps> = ({
  wgid,
  wght,
  additionalSettings = '',
  templateName = 'Dashboard',
  initialData: _initialData,
  isStandalone = false,
  onRemove,
  onSettings,
  onFullscreen,
  onSaveSettings,
  settings: widgetSettings = {},
  isSymbolLocked = false,
  // SSR props (existing - no breaking changes)
  ssrInitialData,
  ssrAdditionalSettings,
  useLegacyPattern = false,
  // NEW SSR props (additive - no breaking changes)
  ssrCurrency,
  ssrDataType,
  ssrOwner,
  ssrDuration,
}) => {
  console.log('🎯 [COT Chart Widget] Component rendered with props:', { 
    wgid, wght, additionalSettings, templateName, isStandalone, hasSSRData: !!ssrInitialData,
    hasOnSaveSettings: !!onSaveSettings
  });
  
  const { isDark } = useTheme();
  const { activeTemplateId, templates, updateWidgetFields } = useTemplates();
  
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<any>[]>([]);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const crosshairHandlerAttached = useRef<boolean>(false);
  
  // Initialize state with SSR data for immediate rendering
  const [data, setData] = useState<COTChartData | null>(ssrInitialData || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chartConfig, setChartConfig] = useState<ChartConfig | null>(null);
  const [chartType, setChartType] = useState<'bar' | 'area'>(() => {
    const saved = widgetSettings.chartType as string;
    if (saved === 'bar chart' || saved === 'bar') return 'bar';
    if (saved === 'area chart' || saved === 'area') return 'area';
    return 'bar';
  });
  const [tooltipData, setTooltipData] = useState<{
    visible: boolean;
    x: number;
    y: number;
    content: string;
  }>({ visible: false, x: 0, y: 0, content: '' });
  
  // Chart configuration state - read from settings prop
  // Settings can come from: widgetSettings (prop) or saved JSON with keys: symbol, time, chartType
  const getInitialCurrency = () => {
    if (ssrCurrency) return ssrCurrency;
    if (widgetSettings.symbol) return widgetSettings.symbol;
    if (widgetSettings.cotCurrency) return widgetSettings.cotCurrency;
    return 'USD';
  };
  
  const getInitialDuration = () => {
    if (ssrDuration) return ssrDuration;
    // Map time strings to duration values
    const timeValue = widgetSettings.time as string;
    if (timeValue) {
      const timeMap: Record<string, string> = {
        '1 year': '365',
        '2 years': '730',
        '3 years': '1095',
        '4 years': '1460',
        '5 years': '1825',
        'all': '7300', // UI uses '7300' for "All", but API expects 'All'
      };
      return timeMap[timeValue] || '1825';
    }
    if (widgetSettings.cotDuration) return widgetSettings.cotDuration;
    return '1825'; // 5 years default
  };
  
  const getInitialChartType = (): 'bar' | 'area' => {
    const saved = widgetSettings.chartType as string;
    if (saved === 'bar chart' || saved === 'bar') return 'bar';
    if (saved === 'area chart' || saved === 'area') return 'area';
    return 'bar';
  };
  
  const [selectedCurrency, setSelectedCurrency] = useState(getInitialCurrency());
  const [selectedDataType, setSelectedDataType] = useState(ssrDataType || widgetSettings.cotDataType || 'NetPercent');
  const [selectedOwner, setSelectedOwner] = useState(ssrOwner || widgetSettings.cotOwner || 'Dealer Intermediary');
  const [selectedDuration, setSelectedDuration] = useState(getInitialDuration());
  
  // Save settings directly to database API
  const saveSettingsToDatabase = useCallback(async (settingsToSave: {
    symbol: string;
    chartType: string;
    cotDataType: string;
    cotOwner: string;
    cotDuration: string;
  }) => {
    // Get widget ID from settings or wgid
    const customDashboardWidgetID = widgetSettings?.customDashboardWidgetID;
    console.log('[COT Chart] saveSettingsToDatabase called', {
      settingsToSave,
      customDashboardWidgetID,
      wgid,
      activeTemplateId,
      templates,
      updateWidgetFieldsType: typeof updateWidgetFields,
      updateWidgetFieldsIsFunction: typeof updateWidgetFields === 'function',
    });

    if (!customDashboardWidgetID && !wgid) {
      console.warn('⚠️ [COT Chart] No widget ID available for saving');
      return;
    }

    if (!activeTemplateId) {
      console.warn('⚠️ [COT Chart] No active template ID for saving');
      return;
    }

    // Check if template is saved
    const activeTemplate = templates.find(t => t.id === activeTemplateId);
    if (!activeTemplate) {
      console.warn('⚠️ [COT Chart] No active template found for ID', activeTemplateId);
      return;
    }
    if (!activeTemplate.saved) {
      console.log('ℹ️ [COT Chart] Template not saved, skipping database save');
      return;
    }

    if (typeof updateWidgetFields !== 'function') {
      console.error('❌ [COT Chart] updateWidgetFields is not a function!', { updateWidgetFields });
      return;
    }

    try {
      const additionalSettings = JSON.stringify(settingsToSave);
      const updateFields = { additionalSettings };

      const widgetIdToUse = customDashboardWidgetID ? String(customDashboardWidgetID) : wgid;
      
      console.log('📡 [COT Chart] Calling updateWidgetFields API:', {
        widgetId: widgetIdToUse,
        templateId: activeTemplateId,
        updateFields
      });

      const result = await updateWidgetFields(widgetIdToUse, activeTemplateId, updateFields);

      if (result && result.success) {
        console.log('✅ [COT Chart] Settings saved to database');
      } else {
        console.warn('⚠️ [COT Chart] Failed to save settings:', result && result.message);
      }
    } catch (error) {
      console.error('❌ [COT Chart] Error saving settings to database:', error);
    }
  }, [wgid, widgetSettings?.customDashboardWidgetID, activeTemplateId, templates, updateWidgetFields]);
  
  // Update state when settings change
  useEffect(() => {
    if (widgetSettings.cotCurrency !== undefined) {
      setSelectedCurrency(widgetSettings.cotCurrency);
    }
    if (widgetSettings.cotDataType !== undefined) {
      setSelectedDataType(widgetSettings.cotDataType);
    }
    if (widgetSettings.cotOwner !== undefined) {
      setSelectedOwner(widgetSettings.cotOwner);
    }
    if (widgetSettings.cotDuration !== undefined) {
      setSelectedDuration(widgetSettings.cotDuration);
    }
  }, [widgetSettings]);
  
  // Parse additional settings to determine chart configuration
  const parseAdditionalSettings = useCallback((settings: string, template: string): ChartConfig => {
    // Try to parse as JSON first (new format)
    try {
      const parsed = JSON.parse(settings);
      if (parsed && typeof parsed === 'object') {
        const chartTypeValue = parsed.chartType || 'bar chart';
        const chartType = chartTypeValue === 'bar chart' || chartTypeValue === 'bar' ? 'bar' : 'line';
        
        return {
          chartType,
          seriesType: chartTypeValue,
          templateIndex: 0
        };
      }
    } catch (e) {
      // Not JSON, fall back to pipe-delimited format (legacy)
    }
    
    // Legacy pipe-delimited format for backward compatibility
    const settingsArray = settings.split('|');
    
    // Template-specific parsing: Details template uses index 5, Dashboard template uses index 4
    const templateIndex = template === 'Details' ? 5 : 4;
    const chrt = settingsArray[templateIndex] || 'Bar Chart';
    
    // Chart type mapping: Bar Chart → chartType = "bar", others → chartType = "line"
    const chartType = chrt === 'Bar Chart' ? 'bar' : 'line';
    
    return {
      chartType,
      seriesType: chrt,
      templateIndex
    };
  }, []);
  
  // Convert date from dd.mm.yyyy to yyyy-mm-dd format
  const convertDateFormat = useCallback((dateStr: string): string => {
    if (!dateStr) return '';
    
    // Check if it's already in yyyy-mm-dd format
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr;
    }
    
    // Convert from dd.mm.yyyy to yyyy-mm-dd
    if (/^\d{2}\.\d{2}\.\d{4}$/.test(dateStr)) {
      const [day, month, year] = dateStr.split('.');
      return `${year}-${month}-${day}`;
    }
    
    // Fallback: try to parse as is
    return dateStr;
  }, []);

  // Process currency data for TradingView format
  const processCurrencyData = useCallback((chartData: COTChartData): any[] => {
    if (!chartData.Categories || !Array.isArray(chartData.Categories)) {
      return [];
    }
    
    return chartData.Categories.map((category, index) => ({
      time: convertDateFormat(category),
      value: chartData.OpenInterest?.[index] || 0
    }));
  }, [convertDateFormat]);
  
  // Process currency bar data for histogram series
  const processCurrencyBarData = useCallback((chartData: COTChartData, seriesName: string): any[] => {
    if (!chartData.Categories || !Array.isArray(chartData.Categories)) {
      return [];
    }
    
    const dataArray = chartData[seriesName as keyof COTChartData] as number[];
    if (!dataArray || !Array.isArray(dataArray)) {
      return [];
    }
    
    return chartData.Categories.map((category, index) => ({
      time: convertDateFormat(category),
      value: dataArray[index] || 0
    }));
  }, [convertDateFormat]);
  
  // Initialize TradingView chart
  const initializeChart = useCallback(() => {
    if (!chartContainerRef.current || chartRef.current) return;
    
    console.log('🔍 [Chart] Initializing chart with container:', chartContainerRef.current);
    
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: isDark ? '#0A0A0A' : '#ffffff' },
        textColor: isDark ? '#9D9D9D' : '#4b5563',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
      },
      grid: {
        vertLines: { color: isDark ? '#1C2227' : '#e5e7eb' },
        horzLines: { color: isDark ? '#1C2227' : '#e5e7eb' },
      },
      rightPriceScale: {
        visible: false,
      },
      leftPriceScale: {
        visible: true,
        borderVisible: true,
        borderColor: isDark ? '#374151' : '#d1d5db',
      },
      timeScale: {
        borderVisible: true,
        borderColor: isDark ? '#374151' : '#d1d5db',
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: {
        mode: 1,
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: false,
      },
      handleScale: {
        axisPressedMouseMove: true,
        axisMouseWheel: true,
        mouseWheel: true,
        pinch: true,
      },
    });
    
    chartRef.current = chart;
    
    console.log('🔍 [Chart] Chart created successfully:', chart);
    
    // Tooltip functionality will be attached after data is loaded
    
    // Don't attach crosshair handler here - will attach after data is loaded
    console.log('🔍 [Chart] Chart initialized, waiting for data to attach crosshair handler');
    
    // Add resize observer
    const resizeObserver = new ResizeObserver(() => {
      if (chartRef.current && chartContainerRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    });
    
    resizeObserver.observe(chartContainerRef.current);
    
    return () => {
      resizeObserver.disconnect();
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
        crosshairHandlerAttached.current = false; // Reset flag when chart is removed
      }
    };
  }, [isDark, data]); // Removed dateFormat dependency
  
  // Map owner values to API format
  const mapOwnerToAPI = useCallback((owner: string): string => {
    switch (owner) {
      case 'Dealer Intermediary':
        return 'Dealer';
      case 'Asset Manager / Institutional':
        return 'AssetManager';
      case 'Leveraged Funds':
        return 'Leveraged';
      // Backward compatibility for old saved values
      case 'Dealer':
        return 'Dealer';
      case 'AssetManager':
        return 'AssetManager';
      case 'Leveraged':
        return 'Leveraged';
      default:
        return 'Dealer';
    }
  }, []);

  // Map owner to display format for subtitle
  const getOwnerDisplayName = useCallback((owner: string): string => {
    switch (owner) {
      case 'Dealer Intermediary':
        return 'Dealer';
      case 'Asset Manager / Institutional':
        return 'AssetManager';
      case 'Leveraged Funds':
        return 'Leveraged';
      case 'Dealer':
        return 'Dealer';
      case 'AssetManager':
        return 'AssetManager';
      case 'Leveraged':
        return 'Leveraged';
      default:
        return 'Dealer';
    }
  }, []);

  // Fetch COT chart data
  const fetchCOTChartData = useCallback(async (forceRefresh: boolean = false) => {
    console.log('🚀 [COT Chart] Starting fetchCOTChartData:', { 
      selectedCurrency, selectedDataType, selectedOwner, selectedDuration, forceRefresh 
    });
    
    // Convert '7300' (UI value for "All") to 'All' for API
    const apiInterval = selectedDuration === '7300' ? 'All' : selectedDuration;
    
    // Generate cache key based on widget parameters
    const cacheKey = widgetDataCache.generateKey('cot-history-chart', {
      symbolPart: selectedCurrency,
      type: selectedDataType,
      owner: mapOwnerToAPI(selectedOwner),
      interval: apiInterval
    });
    
    // Check cache first (unless force refresh is requested)
    if (!forceRefresh) {
      const cachedData = widgetDataCache.get<COTChartData>(cacheKey);
      if (cachedData) {
        console.log('📦 [COT Chart] Using cached data, skipping API call');
        setData(cachedData);
        setLoading(false);
        return;
      }
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/cot/cot-history-chart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          widgetId: wgid,
          symbolPart: selectedCurrency,
          type: selectedDataType,
          owner: mapOwnerToAPI(selectedOwner),
          interval: apiInterval,
          typ: 'optional'
        }),
      });
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }
      
      const result = await response.json();
      
      console.log('📊 [COT Chart] API Response:', { 
        success: result.success, 
        hasData: !!result.data,
        seriesName: result.data?.seriesname,
        error: result.error
      });
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch COT chart data');
      }
      
      // Cache the result for future use
      widgetDataCache.set(cacheKey, result.data);
      setData(result.data);
      
    } catch (err) {
      console.error('❌ [COT Chart] Error fetching data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [wgid, selectedCurrency, selectedDataType, selectedOwner, selectedDuration, mapOwnerToAPI]);
  
  // Initial data load - handle both legacy and new SSR data (additive - no breaking changes)
  useEffect(() => {
    console.log('🔄 [COT Chart] useEffect triggered for initial load:', { 
      selectedCurrency, selectedDataType, selectedOwner, selectedDuration, 
      hasLegacySSRData: !!ssrInitialData,
      hasNewSSRData: !!(ssrCurrency && ssrDataType && ssrOwner && ssrDuration)
    });
    
    // Parse chart configuration
    const config = parseAdditionalSettings(
      ssrAdditionalSettings || additionalSettings, 
      templateName
    );
    setChartConfig(config);
    
    // Handle SSR data priority (additive - no breaking changes)
    if (ssrInitialData) {
      // Existing SSR data logic - NO CHANGES
      console.log('🔄 [COT Chart] Using legacy SSR data, skipping initial fetch');
    } else if (ssrCurrency && ssrDataType && ssrOwner && ssrDuration) {
      // NEW SSR data logic - additive only
      console.log('🔄 [COT Chart] Using new SSR settings, skipping initial fetch');
      // Settings are already initialized from SSR props, no need to fetch
    } else {
      // Existing client-side fetch logic - NO CHANGES
      console.log('🔄 [COT Chart] No SSR data, fetching data');
      fetchCOTChartData();
    }
  }, [fetchCOTChartData, ssrInitialData, ssrAdditionalSettings, parseAdditionalSettings, templateName, ssrCurrency, ssrDataType, ssrOwner, ssrDuration]);
  
  // Initialize chart when component mounts
  useEffect(() => {
    const cleanup = initializeChart();
    return cleanup;
  }, [initializeChart]);
  
  // Update chart theme when isDark changes
  useEffect(() => {
    if (!chartRef.current) return;

    chartRef.current.applyOptions({
      layout: {
        background: { type: ColorType.Solid, color: isDark ? '#0A0A0A' : '#ffffff' },
        textColor: isDark ? '#9D9D9D' : '#4b5563',
      },
      grid: {
        vertLines: { color: isDark ? '#1C2227' : '#e5e7eb' },
        horzLines: { color: isDark ? '#1C2227' : '#e5e7eb' },
      },
      leftPriceScale: {
        borderColor: isDark ? '#374151' : '#d1d5db',
      },
      timeScale: {
        borderColor: isDark ? '#374151' : '#d1d5db',
      },
    });
  }, [isDark]);
  
  // Render chart when data or chart type changes
  useEffect(() => {
    if (!chartRef.current || !data || !chartConfig) return;
    
    // Clear existing series
    seriesRef.current.forEach(series => {
      if (series && chartRef.current) {
        try {
          chartRef.current.removeSeries(series);
        } catch (error) {
          console.warn('Error removing series:', error);
        }
      }
    });
    seriesRef.current = [];
    
    // Add series based on data type and current chart type
    const seriesName = data.seriesname;
    console.log('📊 [COT Chart] Rendering chart:', { seriesName, chartType, dataKeys: Object.keys(data) });
    
    // Double-check chart is still valid before adding series
    if (!chartRef.current) {
      console.warn('🔄 [COT Chart] Chart became invalid during series addition');
      return;
    }
    
    try {
      if (seriesName === 'OpenInterest' && data.OpenInterest) {
      const seriesData = processCurrencyData(data);
      
      if (chartType === 'bar') {
         const series = chartRef.current.addHistogramSeries({
           color: '#FF9800',
           priceLineVisible: false,
           lastValueVisible: false,
         });
        series.setData(seriesData);
        seriesRef.current.push(series);
      } else {
        const series = chartRef.current.addAreaSeries({
          lineColor: '#FF9800',
          topColor: '#FF9800',
          bottomColor: 'rgba(255, 152, 0, 0.10)',
          priceLineVisible: false,
          lastValueVisible: false,
        });
        series.setData(seriesData);
        seriesRef.current.push(series);
      }
    }
    
    else if (seriesName === 'NetPosition' && data.NetPosition) {
      const seriesData = data.Categories.map((category, index) => ({
        time: convertDateFormat(category),
        value: data.NetPosition![index] || 0
      }));
      
      if (chartType === 'bar') {
        // Split data into positive and negative values
        const positiveData = seriesData.map(item => ({
          time: item.time,
          value: item.value >= 0 ? item.value : 0
        }));
        const negativeData = seriesData.map(item => ({
          time: item.time,
          value: item.value < 0 ? item.value : 0
        }));
        
        // Positive values (teal/green)
        const positiveSeries = chartRef.current.addHistogramSeries({
          color: '#26A69A',
          priceLineVisible: false,
          lastValueVisible: false,
        });
        positiveSeries.setData(positiveData);
        seriesRef.current.push(positiveSeries);
        
        // Negative values (red)
        const negativeSeries = chartRef.current.addHistogramSeries({
          color: '#EF5350',
          priceLineVisible: false,
          lastValueVisible: false,
        });
        negativeSeries.setData(negativeData);
        seriesRef.current.push(negativeSeries);
      } else {
        const series = chartRef.current.addBaselineSeries({
          baseValue: { type: 'price', price: 0 },
          topLineColor: '#26A69A',
          topFillColor1: 'rgba(38, 166, 154, 0.4)',
          topFillColor2: 'rgba(38, 166, 154, 0.0)',
          bottomFillColor1: 'rgba(38, 166, 154, 0.0)',
          bottomFillColor2: 'rgba(239, 83, 80, 0.4)',
          priceLineVisible: false,
          lastValueVisible: false,
        });
        series.setData(seriesData);
        seriesRef.current.push(series);
      }
    }
    
    else if (seriesName === 'NetPercent' && data.NetPercent) {
      const seriesData = data.Categories.map((category, index) => ({
        time: convertDateFormat(category),
        value: data.NetPercent![index] || 0
      }));
      
      if (chartType === 'bar') {
        // Split data into positive and negative values
        const positiveData = seriesData.map(item => ({
          time: item.time,
          value: item.value >= 0 ? item.value : 0
        }));
        const negativeData = seriesData.map(item => ({
          time: item.time,
          value: item.value < 0 ? item.value : 0
        }));
        
        // Positive values (teal/green)
        const positiveSeries = chartRef.current.addHistogramSeries({
          color: '#26A69A',
          priceLineVisible: false,
          lastValueVisible: false,
        });
        positiveSeries.setData(positiveData);
        seriesRef.current.push(positiveSeries);
        
        // Negative values (red)
        const negativeSeries = chartRef.current.addHistogramSeries({
          color: '#EF5350',
          priceLineVisible: false,
          lastValueVisible: false,
        });
        negativeSeries.setData(negativeData);
        seriesRef.current.push(negativeSeries);
      } else {
        const series = chartRef.current.addBaselineSeries({
          baseValue: { type: 'price', price: 0 },
          topLineColor: '#26A69A',
          topFillColor1: 'rgba(38, 166, 154, 0.4)',
          topFillColor2: 'rgba(38, 166, 154, 0.0)',
          bottomFillColor1: 'rgba(38, 166, 154, 0.0)',
          bottomFillColor2: 'rgba(239, 83, 80, 0.4)',
          priceLineVisible: false,
          lastValueVisible: false,
        });
        series.setData(seriesData);
        seriesRef.current.push(series);
        
        // Add yellow line at y=0 for Line chart
        try {
          series.createPriceLine({
            price: 0,
            color: '#FF9800', // Yellow/Orange color
            lineWidth: 2,
            lineStyle: 0, // Solid line
            axisLabelVisible: true, // Show label on y-axis
            title: '',
          });
        } catch (error) {
          console.error('Error adding yellow zero line:', error);
        }
      }
    }
    
    else if (seriesName === 'LongShortPosition' && data.LongPosition && data.ShortPosition) {
      // Long positions (positive)
      const longData = data.Categories.map((category, index) => ({
        time: convertDateFormat(category),
        value: data.LongPosition![index] || 0
      }));
      
      // Short positions (negative)
      const shortData = data.Categories.map((category, index) => ({
        time: convertDateFormat(category),
        value: -(data.ShortPosition![index] || 0) // Make negative for visualization
      }));
      
      if (chartType === 'bar') {
        // Long positions histogram
         const longSeries = chartRef.current.addHistogramSeries({
           color: '#01b298',
           priceLineVisible: false,
           lastValueVisible: false,
         });
        longSeries.setData(longData);
        seriesRef.current.push(longSeries);
        
        // Short positions histogram (negative)
        const shortSeries = chartRef.current.addHistogramSeries({
          color: '#FD2E64',
          priceLineVisible: false,
          lastValueVisible: false,
        });
        shortSeries.setData(shortData);
        seriesRef.current.push(shortSeries);
      } else {
        // Long positions area
        const longSeries = chartRef.current.addAreaSeries({
          lineColor: '#01b298',
          topColor: '#01b298',
          bottomColor: 'rgba(1, 178, 152, 0.10)',
          priceLineVisible: false,
          lastValueVisible: false,
        });
        longSeries.setData(longData);
        seriesRef.current.push(longSeries);
        
        // Short positions area (negative)
        const shortSeries = chartRef.current.addAreaSeries({
          lineColor: '#FD2E64',
          topColor: '#FD2E64',
          bottomColor: 'rgba(253, 46, 100, 0.10)',
          priceLineVisible: false,
          lastValueVisible: false,
        });
        shortSeries.setData(shortData);
        seriesRef.current.push(shortSeries);
      }
    }
    
    else if (seriesName === 'LongShortPercent' && data.LongPercent && data.ShortPercent) {
      // Long positions (positive)
      const longData = data.Categories.map((category, index) => ({
        time: convertDateFormat(category),
        value: data.LongPercent![index] || 0
      }));
      
      // Short positions (negative)
      const shortData = data.Categories.map((category, index) => ({
        time: convertDateFormat(category),
        value: -(data.ShortPercent![index] || 0) // Make negative for visualization
      }));
      
      if (chartType === 'bar') {
        // Long positions histogram
         const longSeries = chartRef.current.addHistogramSeries({
           color: '#01b298',
           priceLineVisible: false,
           lastValueVisible: false,
         });
        longSeries.setData(longData);
        seriesRef.current.push(longSeries);
        
        // Short positions histogram (negative)
        const shortSeries = chartRef.current.addHistogramSeries({
          color: '#FD2E64',
          priceLineVisible: false,
          lastValueVisible: false,
        });
        shortSeries.setData(shortData);
        seriesRef.current.push(shortSeries);
      } else {
        // Long positions area
        const longSeries = chartRef.current.addAreaSeries({
          lineColor: '#01b298',
          topColor: '#01b298',
          bottomColor: 'rgba(1, 178, 152, 0.10)',
          priceLineVisible: false,
          lastValueVisible: false,
        });
        longSeries.setData(longData);
        seriesRef.current.push(longSeries);
        
        // Short positions area (negative)
        const shortSeries = chartRef.current.addAreaSeries({
          lineColor: '#FD2E64',
          topColor: '#FD2E64',
          bottomColor: 'rgba(253, 46, 100, 0.10)',
          priceLineVisible: false,
          lastValueVisible: false,
        });
        shortSeries.setData(shortData);
        seriesRef.current.push(shortSeries);
      }
    }
    
    // Fit content
    chartRef.current.timeScale().fitContent();
    
    // Attach crosshair handler after data is loaded (only once)
    if (chartRef.current && data && !crosshairHandlerAttached.current) {
      const handleCrosshairMove = (param: any) => {
        console.log('🔍 [Tooltip] Crosshair move:', { param, hasChart: !!chartRef.current, hasData: !!data, hasCategories: !!data?.Categories });
        
        if (!chartRef.current || !data || !data.Categories) {
          console.log('🔍 [Tooltip] Early return:', { hasChart: !!chartRef.current, hasData: !!data, hasCategories: !!data?.Categories });
          return;
        }
        
        const { time, point } = param;
        if (!time || !point) {
          console.log('🔍 [Tooltip] No time or point - hiding tooltip:', { time, point });
          setTooltipData({ visible: false, x: 0, y: 0, content: '' });
          return;
        }
        
        // Find the data point for this time
        const timeIndex = data.Categories.findIndex(category => {
          const convertedDate = convertDateFormat(category);
          return convertedDate === time;
        });
        
        console.log('🔍 [Tooltip] Time index search:', { time, timeIndex, categoriesLength: data.Categories.length });
        
        if (timeIndex === -1) {
          console.log('🔍 [Tooltip] Time index not found');
          return;
        }
        
        // Generate tooltip content based on data type
        let tooltipContent = '';
        const dateStr = data.Categories[timeIndex];
        
        if (data.seriesname === 'LongShortPosition') {
          const longValue = data.LongPosition?.[timeIndex] || 0;
          const shortValue = data.ShortPosition?.[timeIndex] || 0;
          tooltipContent = `
            <div style="color: #01b298; font-weight: bold;">Long: ${longValue.toFixed(0)}</div>
            <div style="color: #FD2E64; font-weight: bold;">Short: ${shortValue.toFixed(0)}</div>
            <div style="color: #9D9D9D; margin-top: 4px;">Date: ${dateStr}</div>
          `;
        } else if (data.seriesname === 'LongShortPercent') {
          const longValue = data.LongPercent?.[timeIndex] || 0;
          const shortValue = data.ShortPercent?.[timeIndex] || 0;
          tooltipContent = `
            <div style="color: #01b298; font-weight: bold;">Long: ${longValue.toFixed(1)}%</div>
            <div style="color: #FD2E64; font-weight: bold;">Short: ${shortValue.toFixed(1)}%</div>
            <div style="color: #9D9D9D; margin-top: 4px;">Date: ${dateStr}</div>
          `;
        } else if (data.seriesname === 'NetPosition') {
          const netValue = data.NetPosition?.[timeIndex] || 0;
          const color = netValue >= 0 ? '#01b298' : '#FD2E64';
          tooltipContent = `
            <div style="color: ${color}; font-weight: bold;">Net: ${netValue.toFixed(0)}</div>
            <div style="color: #9D9D9D; margin-top: 4px;">Date: ${dateStr}</div>
          `;
        } else if (data.seriesname === 'NetPercent') {
          const netValue = data.NetPercent?.[timeIndex] || 0;
          const color = netValue >= 0 ? '#01b298' : '#FD2E64';
          tooltipContent = `
            <div style="color: ${color}; font-weight: bold;">Net: ${netValue.toFixed(1)}%</div>
            <div style="color: #9D9D9D; margin-top: 4px;">Date: ${dateStr}</div>
          `;
        } else if (data.seriesname === 'OpenInterest') {
          const openInterestValue = data.OpenInterest?.[timeIndex] || 0;
          tooltipContent = `
            <div style="color: #E68200; font-weight: bold;">Open Interest: ${openInterestValue.toFixed(0)}</div>
            <div style="color: #9D9D9D; margin-top: 4px;">Date: ${dateStr}</div>
          `;
        }
        
        // Position tooltip
        const chartRect = chartContainerRef.current?.getBoundingClientRect();
        if (!chartRect) {
          console.log('🔍 [Tooltip] No chart rect');
          return;
        }
        
        const tooltipX = point.x + chartRect.left;
        const tooltipY = point.y + chartRect.top;
        
        console.log('🔍 [Tooltip] Setting tooltip data:', { 
          visible: true, 
          x: tooltipX, 
          y: tooltipY, 
          content: tooltipContent,
          point,
          chartRect: { left: chartRect.left, top: chartRect.top }
        });
        
        setTooltipData({
          visible: true,
          x: tooltipX,
          y: tooltipY,
          content: tooltipContent
        });
        console.log('🔍 [Tooltip] Tooltip state updated:', { visible: true, x: tooltipX, y: tooltipY });
      };
      
      chartRef.current.subscribeCrosshairMove(handleCrosshairMove);
      crosshairHandlerAttached.current = true;
      console.log('🔍 [Tooltip] Crosshair subscription attached after data load');
    }
    
    } catch (error) {
      console.error('Error rendering chart series:', error);
    }
    
  }, [data, chartConfig, processCurrencyData, convertDateFormat, chartType]);
  
  return (
    <div className="flex flex-col h-full w-full bg-widget-body border border-border rounded-none overflow-hidden" style={{ minHeight: '400px' }}>
      {/* Widget Header - Bloomberg Style */}
      <WidgetHeader
        title="COT Chart View"
        subtitle={`${selectedDataType || data?.type || chartConfig?.seriesType || 'Loading...'} | ${getOwnerDisplayName(selectedOwner)}`}
        onSettings={onSettings}
        onRemove={onRemove}
        onFullscreen={onFullscreen}
        helpContent="Displays Commitment of Traders (COT) data as interactive charts. Shows long/short positions, net positions, and open interest over time. Use chart type toggle to switch between bar and area views."
      >
        {/* Currency, Duration Selector and Chart Type Icons */}
        <div className="flex items-center gap-2 mr-2">
          {/* Currency Dropdown */}
          <Select 
            value={selectedCurrency} 
            onValueChange={(value) => {
              setSelectedCurrency(value);
              const settingsToSave = { 
                symbol: value,
                chartType: chartType === 'bar' ? 'bar chart' : 'area chart',
                cotDataType: selectedDataType,
                cotOwner: selectedOwner,
                cotDuration: selectedDuration
              };
              if (onSaveSettings) {
                onSaveSettings(settingsToSave);
              } else {
                saveSettingsToDatabase(settingsToSave);
              }
            }}
            disabled={isSymbolLocked}
          >
            <SelectTrigger className="h-7 w-[80px] bg-widget-header border-border text-base">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border">
              {['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'NZD'].map((currency) => (
                <SelectItem
                  key={currency}
                  value={currency}
                  className="text-base cursor-pointer"
                >
                  {currency}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {/* Duration Selector */}
          <div className="flex bg-background border border-border rounded p-0.5 gap-0.5">
            {[
              { value: '365', label: '1Y' },
              { value: '1095', label: '3Y' },
              { value: '1825', label: '5Y' },
              { value: '3650', label: '10Y' },
              { value: '5475', label: '15Y' },
              { value: '7300', label: 'All' }
            ].map((duration) => (
              <button
                key={duration.value}
                onClick={() => {
                  setSelectedDuration(duration.value);
                  const settingsToSave = { 
                    symbol: selectedCurrency,
                    chartType: chartType === 'bar' ? 'bar chart' : 'area chart',
                    cotDataType: selectedDataType,
                    cotOwner: selectedOwner,
                    cotDuration: duration.value
                  };
                  if (onSaveSettings) {
                    onSaveSettings(settingsToSave);
                  } else {
                    saveSettingsToDatabase(settingsToSave);
                  }
                }}
                className={`px-2.5 py-1.5 text-xs font-medium border-none rounded cursor-pointer transition-all duration-200 ${
                  selectedDuration === duration.value
                    ? 'bg-orange-500/20 text-orange-500' 
                    : 'bg-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
                title={duration.label}
              >
                {duration.label}
              </button>
            ))}
          </div>
          
          {/* Chart Type Segmented Control - Icon Buttons */}
          <div className="flex bg-background border border-border rounded p-0.5">
            <button
              onClick={() => {
                setChartType('bar');
                const settingsToSave = { 
                  symbol: selectedCurrency,
                  chartType: 'bar chart',
                  cotDataType: selectedDataType,
                  cotOwner: selectedOwner,
                  cotDuration: selectedDuration
                };
                if (onSaveSettings) {
                  onSaveSettings(settingsToSave);
                } else {
                  saveSettingsToDatabase(settingsToSave);
                }
              }}
              className={`p-2 rounded cursor-pointer transition-all duration-200 flex items-center justify-center ${
                chartType === 'bar' 
                  ? 'bg-orange-500/20 text-orange-500' 
                  : 'bg-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
              title="Bar Chart"
            >
              <BarChart3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setChartType('area');
                const settingsToSave = { 
                  symbol: selectedCurrency,
                  chartType: 'area chart',
                  cotDataType: selectedDataType,
                  cotOwner: selectedOwner,
                  cotDuration: selectedDuration
                };
                if (onSaveSettings) {
                  onSaveSettings(settingsToSave);
                } else {
                  saveSettingsToDatabase(settingsToSave);
                }
              }}
              className={`p-2 rounded cursor-pointer transition-all duration-200 flex items-center justify-center ${
                chartType === 'area' 
                  ? 'bg-orange-500/20 text-orange-500' 
                  : 'bg-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
              title="Area Chart"
            >
              <TrendingUp className="w-4 h-4" />
            </button>
          </div>
        </div>
      </WidgetHeader>
      
      {/* Chart Container */}
      <div 
        ref={chartContainerRef}
        style={{ 
          flex: 1, 
          width: '100%',
          height: '100%',
          minHeight: '300px',
          backgroundColor: isDark ? '#000000' : '#ffffff'
        }}
      />
      
      {/* Custom Tooltip */}
      <div
        ref={tooltipRef}
        style={{
          display: tooltipData.visible ? 'block' : 'none',
          position: 'fixed',
          left: tooltipData.x + 10,
          top: tooltipData.y - 10,
          backgroundColor: isDark ? 'rgba(0, 0, 0, 0.9)' : 'rgba(255, 255, 255, 0.95)',
          border: isDark ? '1px solid #2C2C2C' : '1px solid #d1d5db',
          borderRadius: '6px',
          padding: '8px 12px',
          fontSize: '12px',
          fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
          zIndex: 1000,
          pointerEvents: 'none',
          boxShadow: isDark ? '0 4px 12px rgba(0, 0, 0, 0.3)' : '0 4px 12px rgba(0, 0, 0, 0.1)',
          minWidth: '120px',
        }}
        dangerouslySetInnerHTML={{ __html: tooltipData.content }}
      />
    </div>
  );
};

export default COTChartViewWidget;