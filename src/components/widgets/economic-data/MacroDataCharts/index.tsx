"use client";

import { WidgetHeader } from "@/components/bloomberg-ui/WidgetHeader";
import { createChart, type IChartApi, type ISeriesApi, ColorType, type Time } from "lightweight-charts";
import { useState, useEffect, useRef, useCallback } from "react";
import { AreaChart as AreaChartIcon, LineChart as LineChartIcon, BarChart3, Plus, Search } from "lucide-react";

interface MacroDataChartsProps {
  onSettings?: () => void;
  onRemove?: () => void;
  onFullscreen?: () => void;
  settings?: Record<string, unknown>;
}

const timeframes = ["1Y", "2Y", "3Y", "5Y", "10Y", "All"];
const tabs = ["gdp", "inflation", "employment", "interest", "trade"];
const chartTypes = [
  { id: "Area", icon: AreaChartIcon },
  { id: "Line", icon: LineChartIcon },
  { id: "Bar", icon: BarChart3 },
] as const;

type ChartType = "Area" | "Line" | "Bar";

const COUNTRY_MAP: Record<string, string> = {
  "United Kingdom": "UK",
  "United States": "US",
  "Germany": "DE",
  "Japan": "JP",
  "France": "FR",
  "China": "CN",
  "India": "IN",
  "Canada": "CA",
  "Australia": "AU",
  "Brazil": "BR",
  "South Korea": "KR",
  "Italy": "IT",
  "Spain": "ES",
  "Mexico": "MX",
  "Russia": "RU",
  "Netherlands": "NL",
  "Switzerland": "CH",
  "Sweden": "SE",
  "Poland": "PL",
  "Belgium": "BE",
  "Norway": "NO",
  "Austria": "AT",
  "Singapore": "SG",
  "Ireland": "IE",
  "Denmark": "DK",
};

interface DataSeries {
  id: string;
  name: string;
  country: string;
  indicator: string;
  color: string;
  visible: boolean;
  tab?: string;
}

// localStorage keys for persisting series and settings
const STORAGE_KEY = 'macro-data-charts-series';
const SETTINGS_STORAGE_KEY = 'macro-data-charts-settings';

// Removed hardcoded available series (populated via API later)
const AVAILABLE_SERIES: Array<{ country: string; indicator: string; color: string }> = [];

// Removed hardcoded searchable series list
const ALL_SEARCHABLE_SERIES: Array<{ country: string; indicator: string; color: string }> = [];

const SERIES_COLORS = [
  "#f97316", "#3b82f6", "#22c55e", "#a855f7", 
  "#eab308", "#06b6d4", "#ec4899", "#8b5cf6"
];

// Helper function to load saved series from localStorage
const loadSavedSeries = (): DataSeries[] => {
  if (typeof window === 'undefined') return [];
  
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return [];
    
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [];
    
    // Restore series with new IDs (to avoid conflicts)
    return parsed.map((s: any, index: number) => ({
      id: `${s.country.toLowerCase().replace(/\s+/g, "-")}-${s.indicator.toLowerCase().replace(/\s+/g, "-")}-${s.tab?.toLowerCase().replace(/\s+/g, "-") || "default"}-${Date.now()}-${index}`,
      name: `${s.country} - ${s.indicator}`,
      country: s.country,
      indicator: s.indicator,
      color: s.color || SERIES_COLORS[index % SERIES_COLORS.length],
      visible: s.visible !== false, // default to true if not specified
      tab: s.tab || '',
    }));
  } catch (error) {
    console.error('Error loading saved series from localStorage:', error);
    return [];
  }
};

// Helper function to save series to localStorage
const saveSeries = (series: DataSeries[], skipIfEmpty: boolean = false) => {
  if (typeof window === 'undefined') return;
  
  try {
    // Don't save empty array if skipIfEmpty is true (prevents clearing saved data on initial mount)
    if (skipIfEmpty && series.length === 0) {
      const existing = localStorage.getItem(STORAGE_KEY);
      if (existing && existing !== '[]') {
        return; // Keep existing data, don't overwrite with empty array
      }
    }
    
    // Save simplified version (without id, name - we'll regenerate those on load)
    const toSave = series.map(s => ({
      country: s.country,
      indicator: s.indicator,
      color: s.color,
      visible: s.visible,
      tab: s.tab || '',
    }));
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch (error) {
    console.error('Error saving series to localStorage:', error);
  }
};

// Helper function to load saved settings from localStorage
const loadSavedSettings = (): { country: string; tab: string; event: string } | null => {
  if (typeof window === 'undefined') return null;
  
  try {
    const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!saved) return null;
    
    const parsed = JSON.parse(saved);
    return {
      country: parsed.country || '',
      tab: parsed.tab || '',
      event: parsed.event || '',
    };
  } catch (error) {
    console.error('Error loading saved settings from localStorage:', error);
    return null;
  }
};

// Helper function to save settings to localStorage
const saveSettings = (country: string, tab: string, event: string) => {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({
      country,
      tab,
      event,
    }));
  } catch (error) {
    console.error('Error saving settings to localStorage:', error);
  }
};

// Generate sample data for different countries
const generateCountryData = (baseValue: number, volatility: number = 1) => {
  return {
    "1Y": Array.from({ length: 12 }, (_, i) => ({
      date: ["Oct '24", "Nov '24", "Dec '24", "Jan '25", "Feb '25", "Mar '25", "Apr '25", "May '25", "Jun '25", "Jul '25", "Aug '25", "Sep '25"][i],
      value: Math.round(baseValue + (i * 10 * volatility) + (Math.random() * 20 - 10)),
    })),
    "2Y": Array.from({ length: 8 }, (_, i) => ({
      date: ["Oct '23", "Jan '24", "Apr '24", "Jul '24", "Oct '24", "Jan '25", "Apr '25", "Jul '25"][i],
      value: Math.round(baseValue - 150 + (i * 25 * volatility) + (Math.random() * 30 - 15)),
    })),
    "3Y": Array.from({ length: 6 }, (_, i) => ({
      date: ["Oct '22", "Apr '23", "Oct '23", "Apr '24", "Oct '24", "Apr '25"][i],
      value: Math.round(baseValue - 300 + (i * 60 * volatility) + (Math.random() * 40 - 20)),
    })),
    "5Y": Array.from({ length: 6 }, (_, i) => ({
      date: ["2020", "2021", "2022", "2023", "2024", "2025"][i],
      value: Math.round(baseValue - 700 + (i * 120 * volatility) + (Math.random() * 50 - 25)),
    })),
    "10Y": Array.from({ length: 6 }, (_, i) => ({
      date: ["2015", "2017", "2019", "2021", "2023", "2025"][i],
      value: Math.round(baseValue - 1000 + (i * 160 * volatility) + (Math.random() * 60 - 30)),
    })),
    "All": Array.from({ length: 9 }, (_, i) => ({
      date: ["2010", "2012", "2014", "2016", "2018", "2020", "2022", "2024", "2025"][i],
      value: Math.round(baseValue - 1200 + (i * 150 * volatility) + (Math.random() * 70 - 35)),
    })),
  };
};

// Generate indicator-specific data - makes different indicators show different values
const generateCountryIndicatorData = (baseValue: number, volatility: number = 1, indicator: string = "GDP") => {
  let adjustedBase = baseValue;
  
  if (indicator === "CPI" || indicator.includes("CPI") || indicator.includes("Consumer Price")) {
    adjustedBase = 110 + (baseValue % 40);
  } else if (indicator === "Unemployment Rate" || indicator.includes("Unemployment")) {
    adjustedBase = 3.5 + ((baseValue % 500) / 100);
  } else if (indicator === "Interest Rate" || indicator.includes("Interest")) {
    adjustedBase = 2 + ((baseValue % 400) / 100);
  } else if (indicator === "Trade Balance" || indicator.includes("Trade")) {
    adjustedBase = baseValue * 0.15;
  }
  
  return {
    "1Y": Array.from({ length: 12 }, (_, i) => ({
      date: ["Oct '24", "Nov '24", "Dec '24", "Jan '25", "Feb '25", "Mar '25", "Apr '25", "May '25", "Jun '25", "Jul '25", "Aug '25", "Sep '25"][i],
      value: Math.round((adjustedBase + (i * 10 * volatility) + (Math.random() * 20 - 10)) * 100) / 100,
    })),
    "2Y": Array.from({ length: 8 }, (_, i) => ({
      date: ["Oct '23", "Jan '24", "Apr '24", "Jul '24", "Oct '24", "Jan '25", "Apr '25", "Jul '25"][i],
      value: Math.round((adjustedBase - 150 + (i * 25 * volatility) + (Math.random() * 30 - 15)) * 100) / 100,
    })),
    "3Y": Array.from({ length: 6 }, (_, i) => ({
      date: ["Oct '22", "Apr '23", "Oct '23", "Apr '24", "Oct '24", "Apr '25"][i],
      value: Math.round((adjustedBase - 300 + (i * 60 * volatility) + (Math.random() * 40 - 20)) * 100) / 100,
    })),
    "5Y": Array.from({ length: 6 }, (_, i) => ({
      date: ["2020", "2021", "2022", "2023", "2024", "2025"][i],
      value: Math.round((adjustedBase - 700 + (i * 120 * volatility) + (Math.random() * 50 - 25)) * 100) / 100,
    })),
    "10Y": Array.from({ length: 6 }, (_, i) => ({
      date: ["2015", "2017", "2019", "2021", "2023", "2025"][i],
      value: Math.round((adjustedBase - 1000 + (i * 160 * volatility) + (Math.random() * 60 - 30)) * 100) / 100,
    })),
    "All": Array.from({ length: 9 }, (_, i) => ({
      date: ["2010", "2012", "2014", "2016", "2018", "2020", "2022", "2024", "2025"][i],
      value: Math.round((adjustedBase - 1200 + (i * 150 * volatility) + (Math.random() * 70 - 35)) * 100) / 100,
    })),
  };
};

// Helper to get country base values and volatilities
const getCountryConfig = (country: string): { baseValue: number; volatility: number } => {
  const configs: Record<string, { baseValue: number; volatility: number }> = {
    "United Kingdom": { baseValue: 3564, volatility: 1 },
    "United States": { baseValue: 21000, volatility: 1.2 },
    "Germany": { baseValue: 3800, volatility: 0.8 },
    "Japan": { baseValue: 5000, volatility: 0.9 },
    "France": { baseValue: 2700, volatility: 0.85 },
    "China": { baseValue: 14000, volatility: 1.5 },
    "India": { baseValue: 2800, volatility: 1.3 },
    "Canada": { baseValue: 1800, volatility: 1.1 },
    "Australia": { baseValue: 1400, volatility: 1.0 },
    "Brazil": { baseValue: 1800, volatility: 1.1 },
    "South Korea": { baseValue: 1600, volatility: 0.9 },
    "Italy": { baseValue: 1900, volatility: 0.8 },
    "Spain": { baseValue: 1400, volatility: 0.85 },
    "Mexico": { baseValue: 1200, volatility: 1.0 },
    "Russia": { baseValue: 1700, volatility: 0.9 },
    "Netherlands": { baseValue: 900, volatility: 0.85 },
    "Switzerland": { baseValue: 800, volatility: 0.9 },
    "Sweden": { baseValue: 600, volatility: 0.85 },
    "Poland": { baseValue: 600, volatility: 1.1 },
    "Belgium": { baseValue: 500, volatility: 0.85 },
    "Norway": { baseValue: 450, volatility: 0.9 },
    "Austria": { baseValue: 420, volatility: 0.85 },
    "Singapore": { baseValue: 400, volatility: 1.0 },
    "Ireland": { baseValue: 380, volatility: 0.9 },
    "Denmark": { baseValue: 350, volatility: 0.85 },
  };
  return configs[country] || { baseValue: 1000, volatility: 1 };
};

// Removed mock country datasets
const COUNTRY_DATA_SETS: Record<string, unknown> = {};

// Helper function to get default series for a tab
const getDefaultSeriesForTab = (_tab: string): DataSeries[] => {
  // No defaults; wait for real data selection via settings
  return [];
};

export function MacroDataCharts({ onSettings, onRemove, onFullscreen }: MacroDataChartsProps) {
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>("10Y");
  // Initialize selectedTab from restored series if available
  const [selectedTab, setSelectedTab] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].tab) {
          return parsed[0].tab;
        }
      }
    } catch (error) {
      console.error('Error reading saved tab from localStorage:', error);
    }
    return '';
  });
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [chartType, setChartType] = useState<ChartType>("Area");
  const [dataSeries, setDataSeries] = useState<DataSeries[]>([]);
  
  // Track if we restored series from localStorage
  const [hasRestoredSeries] = useState(() => {
    if (typeof window === 'undefined') return false;
    const saved = localStorage.getItem(STORAGE_KEY);
    return !!saved && saved !== '[]';
  });
  
  // Track if this is the initial mount to prevent overwriting saved data
  const isInitialMountRef = useRef(true);
  
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [apiDataCache, setApiDataCache] = useState<Record<string, any[]>>({});
  const [availableEvents, setAvailableEvents] = useState<Record<string, string[]>>({}); // country -> events[]
  const [allCountries, setAllCountries] = useState<string[]>([]);
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  // Load saved settings on mount
  const [selectedCountry, setSelectedCountry] = useState<string>(() => {
    const saved = loadSavedSettings();
    return saved?.country || '';
  });
  const [selectedEvent, setSelectedEvent] = useState<string>(() => {
    const saved = loadSavedSettings();
    return saved?.event || '';
  });
  
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesMapRef = useRef<Map<string, ISeriesApi<any>>>(new Map());
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const hasApiDataRef = useRef<boolean>(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const dataSeriesRef = useRef<DataSeries[]>(dataSeries);
  const abortControllerRef = useRef<AbortController | null>(null);
  const fetchInProgressRef = useRef<Set<string>>(new Set());
  const fetchFailedRef = useRef<Set<string>>(new Set());
  const prevSeriesKeyRef = useRef<string>('');
  const isFetchingRef = useRef<boolean>(false);
  const lastAddedSeriesRef = useRef<{ country: string; tab: string; indicator: string } | null>(null);
  const addSeriesTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const addingSeriesRef = useRef<Set<string>>(new Set());

  // Listen for Add Series events coming from global settings drawer
  useEffect(() => {
    const handler = (evt: any) => {
      try {
        const detail = evt?.detail || {};
        const country: string = detail.country;
        const tab: string | undefined = detail.tab;
        const indicator: string = detail.indicator;
        if (!country || !indicator) {
          console.warn('❌ [MacroCharts] Missing country or indicator in add-series event', detail);
          return;
        }
        if (!tab) {
          console.warn('❌ [MacroCharts] Missing tab in add-series event', detail);
          return;
        }

        // Create a unique key for this series
        const key = `${country.toLowerCase()}-${tab.toLowerCase()}-${indicator.toLowerCase()}`;
        
        // Check if we're already adding this exact series
        if (addingSeriesRef.current.has(key)) {
          console.warn('⚠️ [MacroCharts] Series already being added, ignoring duplicate event:', { country, tab, indicator });
          return;
        }

        // Mark as being added immediately
        addingSeriesRef.current.add(key);
        
        // Clear the flag after a delay to allow state updates
        setTimeout(() => {
          addingSeriesRef.current.delete(key);
        }, 1000);
        
        console.log('📊 [MacroCharts] Adding series:', { country, tab, indicator });
        if (tab) setSelectedTab(tab);
        addNewSeries({ country, indicator, tab, color: SERIES_COLORS[(dataSeriesRef.current.length) % SERIES_COLORS.length] });
      } catch (error) {
        console.error('❌ [MacroCharts] Error handling add-series event:', error);
      }
    };
    window.addEventListener('macro-charts:add-series', handler as any);
    return () => {
      window.removeEventListener('macro-charts:add-series', handler as any);
      if (addSeriesTimeoutRef.current) {
        clearTimeout(addSeriesTimeoutRef.current);
      }
    };
  }, []);

  // Convert various date formats to yyyy-mm-dd for lightweight-charts
  const dateToTimestamp = (dateStr: string): Time => {
    const s = String(dateStr).trim();
    // Format: DD/MM/YYYY
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
      const [dd, mm, yyyy] = s.split('/') as [string, string, string];
      return `${yyyy}-${mm.padStart(2,'0')}-${dd.padStart(2,'0')}` as Time;
    }
    // Format: DD-MM-YYYY
    if (/^\d{2}-\d{2}-\d{4}$/.test(s)) {
      const [dd, mm, yyyy] = s.split('-') as [string, string, string];
      return `${yyyy}-${mm.padStart(2,'0')}-${dd.padStart(2,'0')}` as Time;
    }
    // Format: YYYY-??-?? (normalize to YYYY-MM-DD)
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      const [yyyy, a, b] = s.split('-');
      let mm = parseInt(a, 10);
      let dd = parseInt(b, 10);
      // If middle looks like day (e.g., 31), swap
      if (mm > 12 && dd <= 12) {
        const tmp = mm; mm = dd; dd = tmp;
      }
      // Clamp ranges and repad
      mm = Math.max(1, Math.min(12, mm));
      dd = Math.max(1, Math.min(31, dd));
      return `${yyyy}-${String(mm).padStart(2,'0')}-${String(dd).padStart(2,'0')}` as Time;
    }
    // Format: Mon 'YY
    if (s.includes("'")) {
      const [month, year] = s.split(" '");
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const monthIndex = monthNames.indexOf(month);
      const yearNum = 2000 + parseInt(year, 10);
      return `${yearNum}-${String(monthIndex + 1).padStart(2, '0')}-01` as Time;
    }
    // Format: YYYY
    if (/^\d{4}$/.test(s)) {
      return `${s}-01-01` as Time;
    }
    // Fallback: try Date parse
    const d = new Date(s);
    if (!isNaN(d.getTime())) {
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` as Time;
    }
    // As a last resort, return epoch start to avoid crashes
    return '1970-01-01' as Time;
  };

  // Initialize chart with lightweight-charts - re-run when container becomes available
  useEffect(() => {
    if (!chartContainerRef.current || chartRef.current) return;

    const container = chartContainerRef.current;
    
    // Use a small delay to ensure container has dimensions (especially on first render)
    const initTimer = setTimeout(() => {
      if (!chartContainerRef.current || chartRef.current) return;
      
      const container = chartContainerRef.current;
      
      // If still no dimensions, try to get them from parent
      if (container.clientWidth === 0 || container.clientHeight === 0) {
        const parent = container.parentElement;
        if (parent) {
          const rect = parent.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) {
            console.log('📊 [Chart] Container and parent have no dimensions yet, will retry...');
            return;
          }
        }
      }
      
      chartRef.current = createChart(container, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: 'rgba(138, 138, 138, 0.8)',
      },
      grid: {
        vertLines: { color: 'rgba(42, 42, 42, 0.5)', style: 2 },
        horzLines: { color: 'rgba(42, 42, 42, 0.5)', style: 2 },
      },
      rightPriceScale: {
        borderColor: 'rgba(42, 42, 42, 0.8)',
        visible: true,
      },
      timeScale: {
        borderColor: 'rgba(42, 42, 42, 0.8)',
        timeVisible: true,
        secondsVisible: false,
        fixLeftEdge: false,
        fixRightEdge: false,
      },
      crosshair: {
        mode: 1, // Show crosshair
      },
    });

    // Setup resize observer
    resizeObserverRef.current = new ResizeObserver(entries => {
      if (chartRef.current && entries.length > 0) {
        const rect = entries[0].contentRect;
        chartRef.current.applyOptions({
          width: rect.width,
          height: rect.height,
        });
      }
    });

    resizeObserverRef.current.observe(container);

    // Setup crosshair move handler for tooltip
    chartRef.current.subscribeCrosshairMove(param => {
      if (!tooltipRef.current || !chartContainerRef.current) return;
      
      if (param.point === undefined || !param.time || param.point.x < 0 || param.point.x > chartContainerRef.current.clientWidth || 
          param.point.y < 0 || param.point.y > chartContainerRef.current.clientHeight) {
        tooltipRef.current.style.display = 'none';
      } else {
        const tooltip = tooltipRef.current;
        tooltip.style.display = 'block';
        tooltip.style.left = `${param.point.x + 20}px`;
        tooltip.style.top = `${param.point.y}px`;
        
        // Get data for all series at this time point - use ref to get current dataSeries
        let tooltipContent = '';
        
        dataSeriesRef.current.filter(s => s.visible).forEach(series => {
          const seriesInstance = seriesMapRef.current.get(series.id);
          if (!seriesInstance) return;
          
          const data = seriesInstance.data();
          const pointAtTime = data.find((d: any) => d.time === param.time);
          
          if (pointAtTime) {
            // Use series.indicator directly instead of series.name to ensure it's always current
            const displayName = `${series.country} - ${series.indicator}`;
            tooltipContent += `<div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
              <div style="width: 12px; height: 2px; background-color: ${series.color}"></div>
              <span style="color: ${series.color}; font-size: 11px;">${displayName}: ${pointAtTime.value.toLocaleString()}</span>
            </div>`;
          }
        });
        
        if (tooltipContent) {
          tooltip.innerHTML = tooltipContent;
        }
      }
    });
    }, 100); // Small delay to ensure container is ready

    // Cleanup function
    return () => {
      clearTimeout(initTimer);
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
      if (chartRef.current) {
        try {
          // Clear series map before removing chart
          seriesMapRef.current.clear();
          chartRef.current.remove();
        } catch (error) {
          console.error('Error cleaning up chart:', error);
        }
        chartRef.current = null;
      }
    };
  }, [dataSeries.length]); // Re-run when dataSeries changes to ensure container is available

  // Reload series from localStorage on mount (handles widget switching)
  useEffect(() => {
    console.log('🔄 [MacroCharts] Mount effect running, loading from localStorage...');
    const saved = loadSavedSeries();
    const savedSettings = loadSavedSettings();
    
    console.log('📊 [MacroCharts] Loaded from localStorage:', { 
      savedSeries: saved.length, 
      savedSettings: savedSettings 
    });
    
    // Clear previous series key ref to force API fetch
    prevSeriesKeyRef.current = '';
    
    if (saved.length > 0) {
      // Always reload saved series on mount (widget switching)
      console.log('📊 [MacroCharts] Reloading series from localStorage:', saved);
      setDataSeries(saved);
      
      // Also restore the selectedTab from saved data
      if (saved[0]?.tab) {
        console.log('📊 [MacroCharts] Restoring tab from saved series:', saved[0].tab);
        setSelectedTab(saved[0].tab);
      }
    }
    
    // Restore settings panel values
    if (savedSettings) {
      console.log('📊 [MacroCharts] Restoring settings:', savedSettings);
      if (savedSettings.country) {
        setSelectedCountry(savedSettings.country);
      }
      if (savedSettings.tab && !saved[0]?.tab) {
        // Only set tab from settings if we don't have a tab from series
        setSelectedTab(prev => prev || savedSettings.tab);
      }
      if (savedSettings.event) {
        setSelectedEvent(savedSettings.event);
      }
    }
    
    // Mark initial mount as complete after a short delay to allow state updates
    setTimeout(() => {
      isInitialMountRef.current = false;
    }, 100);
  }, []); // Run only on mount

  // Keep dataSeriesRef in sync with dataSeries state
  useEffect(() => {
    dataSeriesRef.current = dataSeries;
  }, [dataSeries]);

  // Save series to localStorage whenever dataSeries changes
  useEffect(() => {
    // Skip saving on initial mount to avoid overwriting with empty array
    if (isInitialMountRef.current) {
      return;
    }
    
    // If all series are deleted, clear both series and settings from localStorage
    if (dataSeries.length === 0) {
      console.log('📊 [MacroCharts] All series deleted, clearing localStorage');
      if (typeof window !== 'undefined') {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(SETTINGS_STORAGE_KEY);
      }
      return;
    }
    
    // Save to localStorage (skipIfEmpty prevents clearing on first render)
    saveSeries(dataSeries, true);
  }, [dataSeries]);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    // Skip saving on initial mount
    if (isInitialMountRef.current) {
      return;
    }
    
    // Save settings to localStorage
    if (selectedCountry || selectedTab || selectedEvent) {
      saveSettings(selectedCountry, selectedTab, selectedEvent);
    }
  }, [selectedCountry, selectedTab, selectedEvent]);

  // Preserve countries when tab changes - convert existing series to new tab
  // Skip this logic if we just restored series (to avoid overwriting restored data)
  useEffect(() => {
    // Don't run if we're still loading or if there are no series
    if (!selectedTab || dataSeries.length === 0) return;
    
    // Don't run if we just restored series and the tab matches (avoid overwriting restored data)
    if (hasRestoredSeries) {
      const hasSeriesForTab = dataSeries.some(s => s.tab === selectedTab);
      if (hasSeriesForTab) return; // Already have series for this tab, don't modify
    }
    
    setDataSeries(prev => {
      const currentTabSeries = prev.filter(s => s.tab === selectedTab);
      
      // If we already have series for this tab, don't modify anything
      if (currentTabSeries.length > 0) {
        return prev;
      }
      
      // Get default indicator for new tab
      const defaultIndicator = selectedTab === 'gdp' ? 'GDP' 
        : selectedTab === 'inflation' ? 'CPI'
        : selectedTab === 'employment' ? 'Unemployment Rate'
        : selectedTab === 'interest' ? 'Interest Rate'
        : selectedTab === 'trade' ? 'Trade Balance'
        : 'GDP';
      
      // Convert all existing series to the new tab with appropriate indicator
      if (prev.length > 0) {
        let counter = 0;
        return prev.map(series => ({
          ...series,
          tab: selectedTab,
          indicator: defaultIndicator,
          name: `${series.country} - ${defaultIndicator}`,
          id: `${series.id}-${selectedTab}-preserved-${counter++}`,
        }));
      }
      
      return prev;
    });
  }, [selectedTab, hasRestoredSeries, dataSeries]);

  // Bootstrap dropdowns: countries and categories
  useEffect(() => {
    const bootstrap = async () => {
      try {
      setLoading(true);
        // Countries/currencies
        const dd = await fetch('/api/pmt/macro-dropdown', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
        if (dd.ok) {
          const j = await dd.json();
          // Derive unique country codes from tabs.events[].country
          const tabs = j?.data?.tabs || j?.data?.Tabs || [];
          const derived: string[] = Array.isArray(tabs)
            ? Array.from(new Set(
                tabs.flatMap((t: any) => Array.isArray(t?.events) ? t.events.map((e: any) => String(e?.country || '').trim()).filter(Boolean) : [])
              ))
            : [];
          const countries: string[] = (j?.data?.countries || j?.data?.Countries || j?.data?.country || derived).filter(Boolean);
          if (Array.isArray(countries) && countries.length > 0) {
            setAllCountries(countries);
            if (!selectedCountry) {
              const usa = countries.find((c: string) => c.toUpperCase() === 'USA');
              setSelectedCountry(usa || countries[0]);
            }
          }
        }
        // Categories/tabs
        const tabsResp = await fetch('/api/pmt/macro-tabs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
        if (tabsResp.ok) {
          const j = await tabsResp.json();
          const tabs: string[] = j?.data?.tabs || j?.data?.Tabnames || j?.data?.tabnames || j?.data || [];
          if (Array.isArray(tabs)) {
            setAvailableCategories(tabs);
            // Only set default tab if we don't have a restored tab
            // Check localStorage directly to avoid closure issues
            const hasSavedData = typeof window !== 'undefined' && localStorage.getItem(STORAGE_KEY);
            setSelectedTab(prevTab => {
              if (!prevTab && !hasSavedData && tabs.length > 0) {
                const gdp = tabs.find((t: string) => t.toUpperCase() === 'GDP');
                return gdp || tabs[0];
              }
              return prevTab;
            });
          }
        }
      } finally {
        setLoading(false);
      }
    };
    bootstrap();
  }, []);

  // Fetch events for selected country and tab
  useEffect(() => {
    const fetchEvents = async () => {
      if (!selectedTab || !selectedCountry) return;
        try {
        const resp = await fetch('/api/pmt/macro-events-by-tab', {
            method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tabname: selectedTab, country: selectedCountry }),
          });
        if (resp.ok) {
          const j = await resp.json();
          const raw = j?.data?.events || j?.data?.EventNames || j?.data || [];
          const events: string[] = Array.isArray(raw)
            ? raw.map((e: any) => (typeof e === 'string' ? e : (e?.eventName || e?.name || ''))).filter((s: string) => !!s)
            : [];
          if (events.length > 0) {
            setAvailableEvents(prev => ({ ...prev, [selectedCountry]: events }));
          }
        }
      } catch (e) {
        // ignore
      }
    };
    fetchEvents();
  }, [selectedTab, selectedCountry]);

  // Removed auto-add and series modification logic - user must manually add series
  // This useEffect is intentionally removed to prevent any automatic series addition

  // Fetch API data when series or tab changes
  useEffect(() => {
    // Calculate current series key
    const currentSeriesKey = dataSeries.map(s => `${s.country}-${s.indicator}-${s.tab || selectedTab}`).sort().join('|');
    
    // Skip if nothing changed
    if (prevSeriesKeyRef.current === currentSeriesKey) {
      console.log('📊 [API] Series key unchanged, skipping fetch');
      return;
    }

    // Prevent running if already fetching
    if (isFetchingRef.current) {
      console.log('📊 [API] Fetch already in progress, skipping...');
      return;
    }

    // Cancel any previous requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    // Clear failed cache and update key reference BEFORE fetching
    fetchFailedRef.current.clear();
    prevSeriesKeyRef.current = currentSeriesKey;

    const fetchApiData = async () => {
      // Mark as fetching
      isFetchingRef.current = true;

      const visibleSeries = dataSeries.filter(s => s.visible);
      
      if (visibleSeries.length === 0) {
        setLoading(false);
        isFetchingRef.current = false;
        return;
      }

      setLoading(true);
        for (const series of visibleSeries) {
        // Use series.tab instead of selectedTab to match the tab when series was created
        const seriesTab = series.tab || selectedTab;
        const cacheKey = `${series.country}-${series.indicator}-${seriesTab}`;
        
        // Skip if already in cache
        if (apiDataCache[cacheKey]) {
          console.log(`📊 [API] Cache hit for ${cacheKey}`);
          continue;
        }
        
        // Skip if already in progress
        if (fetchInProgressRef.current.has(cacheKey)) {
          console.log(`📊 [API] Fetch already in progress for ${cacheKey}`);
          continue;
        }

        // Skip if previously failed (prevent infinite retries)
        if (fetchFailedRef.current.has(cacheKey)) {
          console.warn(`⚠️ [API] Skipping previously failed fetch for ${cacheKey}`);
          continue;
        }

        fetchInProgressRef.current.add(cacheKey);
        
        try {
          if (signal.aborted) break;

          const countryCode = COUNTRY_MAP[series.country] || series.country;
          const apiPayload = {
            country: countryCode,
            tabName: seriesTab,
            macroEvent: series.indicator,
          };
          console.log(`📊 [API] Fetching data for series:`, {
            originalCountry: series.country,
            mappedCountry: countryCode,
            tab: seriesTab,
            indicator: series.indicator,
            seriesId: series.id,
            apiPayload
          });
          
          const response = await fetch('/api/pmt/macro-chart-data', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            signal,
            body: JSON.stringify(apiPayload),
          });

          if (signal.aborted) break;
          
          if (response.ok) {
            const result = await response.json();
            console.log(`📊 [API] Response for ${cacheKey}:`, {
              hasData: !!result.data,
              categoriesLength: result.data?.Categories?.length || 0,
              hasCOT1: !!result.data?.COT1,
              cot1Length: result.data?.COT1?.length || 0,
            });
            
            // Check if we got actual data (not empty arrays)
            if (result.data && result.data.Categories && result.data.Categories.length > 0) {
              hasApiDataRef.current = true;
              
              // Transform API data to chart format
            // Transform, dedupe by time, and sort ascending for lightweight-charts
            const rawPoints = result.data.Categories.map((date: string, index: number) => ({
                time: dateToTimestamp(date),
                value: result.data.COT1?.[index] || result.data.actual?.[index] || result.data.values?.[index] || 0,
              }));
            const timeToPoint = new Map<string | number, { time: any; value: number }>();
            for (const p of rawPoints) {
              timeToPoint.set(p.time as any, p); // last write wins
            }
            const transformedData = Array.from(timeToPoint.values()).sort((a, b) => {
              const at = typeof a.time === 'string' ? Date.parse(a.time as string) : (a.time as number);
              const bt = typeof b.time === 'string' ? Date.parse(b.time as string) : (b.time as number);
              return at - bt;
            });
              
              console.log(`✅ [API] Transformed ${transformedData.length} data points for ${cacheKey}`, transformedData.slice(0, 3));
              
              setApiDataCache(prev => ({
                ...prev,
                [cacheKey]: transformedData,
              }));
            } else {
              console.log(`⚠️ [API] No data returned for ${cacheKey}, will use mock data`);
            }
          } else {
            console.warn(`⚠️ [API] Error ${response.status} for ${cacheKey}`);
            // Mark as failed to prevent infinite retries
            fetchFailedRef.current.add(cacheKey);
          }
        } catch (error) {
          if (error instanceof Error && error.name === 'AbortError') {
            console.log(`📊 [API] Fetch cancelled for ${cacheKey}`);
            // Don't mark aborted requests as failed
          } else {
            console.error(`❌ [API] Error fetching chart data for ${cacheKey}:`, error);
            // Mark as failed to prevent infinite retries
            fetchFailedRef.current.add(cacheKey);
          }
        } finally {
          fetchInProgressRef.current.delete(cacheKey);
        }
      }
      setLoading(false);
      isFetchingRef.current = false;
    };
    
    fetchApiData();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      fetchInProgressRef.current.clear();
      isFetchingRef.current = false;
      // Don't clear failed cache on cleanup - let it persist to prevent retries
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataSeries, selectedTab]);

  // Update chart data
  useEffect(() => {
    if (!chartRef.current) return;

    const chart = chartRef.current;
    
    // Clear existing series - remove all valid series
    try {
      for (const series of seriesMapRef.current.values()) {
        if (series) {
          chart.removeSeries(series);
        }
      }
      seriesMapRef.current.clear();
    } catch (error) {
      console.error('Error clearing series:', error);
      seriesMapRef.current.clear();
    }

    const visibleSeries = dataSeries.filter(s => s.visible);
    
    if (visibleSeries.length === 0) return;

    // Decide primary indicator: first visible series' indicator
    const primaryIndicator = visibleSeries[0]?.indicator || '';

    // Ensure both left and right price scales are visible
    try {
      chart.priceScale('left').applyOptions({ visible: true });
      chart.priceScale('right').applyOptions({ visible: true });
    } catch {}

    // Create series for each visible data series
    visibleSeries.forEach((series) => {
      // Check if we have API data for this series - use series.tab to match cache
      const seriesTab = series.tab || selectedTab;
      const cacheKey = `${series.country}-${series.indicator}-${seriesTab}`;
      let chartData: Array<{time: Time, value: number}> = [];
      
      // Check if we have data in cache for this series
      if (apiDataCache[cacheKey] && apiDataCache[cacheKey].length > 0) {
        // Use API data if available
        console.log(`📊 [Chart] Using API data for ${series.country} - ${series.indicator}`, apiDataCache[cacheKey].length, 'points');
        chartData = apiDataCache[cacheKey];
      } else {
        // No data available yet - skip series until API provides data
        console.warn(`⚠️ [Chart] No API data for ${series.country} - ${series.indicator} (cacheKey: ${cacheKey}), skipping. Available cache keys:`, Object.keys(apiDataCache));
        return;
      }

      // Filter data based on selected timeframe
      if (selectedTimeframe !== "All") {
        const now = Date.now();
        let yearsAgo = 0;
        
        if (selectedTimeframe === "1Y") yearsAgo = 1;
        else if (selectedTimeframe === "2Y") yearsAgo = 2;
        else if (selectedTimeframe === "3Y") yearsAgo = 3;
        else if (selectedTimeframe === "5Y") yearsAgo = 5;
        else if (selectedTimeframe === "10Y") yearsAgo = 10;
        
        if (yearsAgo > 0) {
          const cutoffDate = now - (yearsAgo * 365.25 * 24 * 60 * 60 * 1000); // Use 365.25 for leap years
          
          const originalLength = chartData.length;
          chartData = chartData.filter((point) => {
            let pointTime: number;
            
            if (typeof point.time === 'string') {
              // Parse date string - handle YYYY-MM-DD format or try Date.parse
              const parsed = Date.parse(point.time);
              if (!isNaN(parsed)) {
                pointTime = parsed;
              } else {
                // Try parsing as YYYY-MM-DD explicitly
                const dateMatch = point.time.match(/^(\d{4})-(\d{2})-(\d{2})$/);
                if (dateMatch) {
                  pointTime = new Date(parseInt(dateMatch[1]), parseInt(dateMatch[2]) - 1, parseInt(dateMatch[3])).getTime();
                } else {
                  console.warn(`⚠️ [Chart] Could not parse date: ${point.time}`);
                  return true; // Keep if we can't parse
                }
              }
            } else if (typeof point.time === 'number') {
              // Already a timestamp (in seconds, convert to milliseconds if needed)
              pointTime = point.time < 10000000000 ? point.time * 1000 : point.time;
            } else {
              console.warn(`⚠️ [Chart] Unknown time format:`, point.time);
              return true; // Keep if we can't parse
            }
            
            // Check if point is within the timeframe (within the last N years)
            const isWithinRange = pointTime >= cutoffDate;
            return isWithinRange;
          });
          
          console.log(`📊 [Chart] Filtered to ${selectedTimeframe}: ${chartData.length} points from ${originalLength} original points (cutoff: ${new Date(cutoffDate).toISOString()})`);
          
          // If filtering resulted in no data, log warning but don't skip - let chart handle empty data
          if (chartData.length === 0) {
            console.warn(`⚠️ [Chart] No data points after filtering for ${selectedTimeframe}. Original data had ${originalLength} points.`);
          }
        }
      }

      let chartSeries: ISeriesApi<any>;

      const priceScaleId = series.indicator === primaryIndicator ? 'right' : 'left';

      if (chartType === "Area") {
        chartSeries = chart.addAreaSeries({
          lineColor: series.color,
          topColor: series.color,
          bottomColor: `rgba(${parseInt(series.color.slice(1, 3), 16)}, ${parseInt(series.color.slice(3, 5), 16)}, ${parseInt(series.color.slice(5, 7), 16)}, 0.1)`,
          lineWidth: 2,
          priceScaleId,
        });
      } else if (chartType === "Line") {
        chartSeries = chart.addLineSeries({
          color: series.color,
          lineWidth: 2,
          priceScaleId,
        });
      } else {
        chartSeries = chart.addHistogramSeries({
          color: series.color,
          priceScaleId,
        });
      }

      // Ensure strict ascending order and no duplicate times before setting
      // Normalize all times to YYYY-MM-DD format for lightweight-charts
      const normalized = chartData.map((p) => {
        if (typeof p.time === 'string') {
          // Already in string format, ensure it's properly formatted
          const normalizedTime = dateToTimestamp(p.time);
          return { time: normalizedTime, value: p.value };
        } else if (typeof p.time === 'number') {
          // Convert timestamp to YYYY-MM-DD format
          const date = new Date(p.time < 10000000000 ? p.time * 1000 : p.time);
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          return { time: `${year}-${month}-${day}` as Time, value: p.value };
        }
        return p as { time: Time; value: number };
      });
      
      // Remove duplicates by time
      const uniq = new Map<string, { time: Time; value: number }>();
      for (const p of normalized) {
        const timeKey = String(p.time);
        if (!uniq.has(timeKey)) {
          uniq.set(timeKey, p);
        }
      }
      
      // Sort by time
      const ordered = Array.from(uniq.values()).sort((a, b) => {
        const at = typeof a.time === 'string' ? Date.parse(a.time as string) : (a.time as number);
        const bt = typeof b.time === 'string' ? Date.parse(b.time as string) : (b.time as number);
        if (isNaN(at) || isNaN(bt)) {
          console.warn(`⚠️ [Chart] Invalid time values:`, a.time, b.time);
          return 0;
        }
        return at - bt;
      });
      
      console.log(`📊 [Chart] Setting ${ordered.length} data points for ${series.country} - ${series.indicator} (${selectedTimeframe})`);
      
      if (ordered.length > 0) {
        chartSeries.setData(ordered as any);
        seriesMapRef.current.set(series.id, chartSeries);
      } else {
        console.warn(`⚠️ [Chart] No data to set for ${series.country} - ${series.indicator} (${selectedTimeframe})`);
        // Remove the series if there's no data
        try {
          chart.removeSeries(chartSeries);
        } catch (e) {
          // Series might not have been added yet, ignore error
        }
        return; // Skip this series
      }
    });

    // Only fit content if we have series with data
    if (seriesMapRef.current.size > 0) {
      chart.timeScale().fitContent();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataSeries, selectedTimeframe, chartType, apiDataCache]);

  // Get current value for badge
  const currentValue = (() => {
    const visible = dataSeries.filter(s => s.visible);
    if (visible.length === 0) return 0;
    const s = visible[0];
    const seriesTab = s.tab || selectedTab;
    const cacheKey = `${s.country}-${s.indicator}-${seriesTab}`;
    const pts = apiDataCache[cacheKey];
    if (!pts || pts.length === 0) return 0;
    return pts[pts.length - 1]?.value || 0;
  })();

  const toggleSeries = (id: string) => {
    setDataSeries(prev =>
      prev.map(s => (s.id === id ? { ...s, visible: !s.visible } : s))
    );
  };

  const removeSeries = (id: string) => {
    try {
      const inst = seriesMapRef.current.get(id);
      if (inst && chartRef.current) {
        try { chartRef.current.removeSeries(inst); } catch {}
      }
      seriesMapRef.current.delete(id);
    } catch {}
    setDataSeries(prev => prev.filter(s => s.id !== id));
  };

  const addNewSeries = (seriesConfig: { country: string; indicator: string; color: string; tab?: string }) => {
    if (dataSeries.length >= 8) return;
    
    const tab = seriesConfig.tab || selectedTab;
    
    // Check for duplicate series (same country, indicator, and tab)
    const existing = dataSeries.find(s => 
      s.country.toLowerCase() === seriesConfig.country.toLowerCase() &&
      s.indicator.toLowerCase() === seriesConfig.indicator.toLowerCase() &&
      (s.tab || selectedTab).toLowerCase() === tab.toLowerCase()
    );
    
    if (existing) {
      console.warn(`⚠️ [MacroCharts] Series already exists: ${seriesConfig.country} - ${seriesConfig.indicator} (${tab})`);
      return;
    }
    
    const newSeries: DataSeries = {
      id: `${seriesConfig.country.toLowerCase().replace(/\s+/g, "-")}-${seriesConfig.indicator.toLowerCase().replace(/\s+/g, "-")}-${tab.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`,
      name: `${seriesConfig.country} - ${seriesConfig.indicator}`,
      country: seriesConfig.country,
      indicator: seriesConfig.indicator,
      color: seriesConfig.color || SERIES_COLORS[dataSeries.length % SERIES_COLORS.length],
      visible: true,
      tab: tab,
    };
    
    console.log('📊 [MacroCharts] Created new series:', newSeries);
    setDataSeries(prev => [...prev, newSeries]);
    setShowAddMenu(false);
    setSearchQuery("");
  };

  // Generate available series dynamically from API events (no hardcoded fallback)
  const getAvailableSeries = () => {
    const series: Array<{ country: string; indicator: string; color: string }> = [];
    const colors = [...SERIES_COLORS];
    let colorIndex = 0;
    
    allCountries.forEach((country) => {
      const countryEvents = availableEvents[country];
      
      if (countryEvents && countryEvents.length > 0) {
        countryEvents.forEach((event) => {
          series.push({
            country,
            indicator: event,
            color: colors[colorIndex % colors.length],
          });
          colorIndex++;
        });
      }
    });
    
    return series;
  };

  // Filter series based on search query
  const getFilteredSeries = () => {
    const availableSeries = getAvailableSeries();
    
    // Filter out series that already exist for current tab (same country + indicator combination)
    const currentTabSeries = dataSeries.filter(s => s.tab === selectedTab);
    
    if (!searchQuery.trim()) {
      return availableSeries.filter(
        (s) => !currentTabSeries.some((ds) => ds.country === s.country && ds.indicator === s.indicator)
      );
    }
    
    const query = searchQuery.toLowerCase();
    return availableSeries.filter(
      (s) => 
        !currentTabSeries.some((ds) => ds.country === s.country && ds.indicator === s.indicator) &&
        (s.country.toLowerCase().includes(query) || 
         s.indicator.toLowerCase().includes(query))
    );
  };


  return (
    <div className="flex flex-col h-full bg-widget-body border border-border rounded-none overflow-hidden">
      <WidgetHeader 
        title="Macro Charts"
        onRemove={onRemove}
        onFullscreen={onFullscreen}
        helpContent="Macroeconomic data visualization with multiple chart types and customizable series."
      >
        {/* Chart Type Selector - Icons */}
        <div className="flex gap-0 mr-2 border border-border rounded overflow-hidden">
          {chartTypes.map((type) => {
            const Icon = type.icon;
            return (
              <button
                key={type.id}
                onClick={() => setChartType(type.id)}
                className={`h-7 w-8 flex items-center justify-center transition-all border-r border-border last:border-r-0 ${
                  chartType === type.id
                    ? "bg-primary/20 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
                title={`${type.id} Chart`}
              >
                <Icon className="w-4 h-4" />
              </button>
            );
          })}
        </div>

        {/* Category/Tab Selector removed per request */}

        {/* Timeframe Selector */}
        <div className="flex gap-1 mr-2">
          {timeframes.map((tf) => (
            <button
              key={tf}
              onClick={() => setSelectedTimeframe(tf)}
              className={`h-7 px-3 rounded transition-colors ${
                selectedTimeframe === tf
                  ? "bg-primary/20 text-primary"
                  : "text-foreground/90 hover:text-primary hover:bg-muted/50"
              }`}
              style={{
                fontSize: '12px',
                fontWeight: '600',
              }}
            >
              {tf}
            </button>
          ))}
        </div>
      </WidgetHeader>

      {/* Series Legend */}
      <div className="border-b border-border bg-widget-header px-3 py-2 flex flex-wrap items-center gap-x-4 gap-y-2">
        {dataSeries.map((series) => (
          <div key={series.id} className="flex items-center gap-2">
          <button
              aria-label="Remove series"
              onClick={(e) => { e.stopPropagation(); removeSeries(series.id); }}
              className="leading-none text-base text-muted-foreground hover:text-foreground"
              title="Remove"
            >
              ×
            </button>
            <button
            onClick={() => toggleSeries(series.id)}
            className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
              title={series.visible ? 'Hide' : 'Show'}
          >
            <div
              className="w-4 h-0.5 rounded transition-opacity"
              style={{
                backgroundColor: series.color,
                opacity: series.visible ? 1 : 0.3,
              }}
            ></div>
            <span
              className="text-xs transition-opacity"
              style={{ opacity: series.visible ? 1 : 0.5 }}
            >
              {series.name}
            </span>
          </button>
          </div>
        ))}
        
        {/* Add Series Button -> open global Settings */}
        {dataSeries.length < 8 && (
          <button
            onClick={() => { onSettings && onSettings(); }}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add</span>
          </button>
        )}
      </div>
      
      <div className="flex-1 relative overflow-hidden">
        {/* Chart Container - Always render so chart can initialize */}
        <div 
          ref={chartContainerRef} 
          className="w-full h-full" 
          style={{ 
            visibility: dataSeries.length === 0 ? 'hidden' : 'visible',
            position: 'absolute',
            inset: 0
          }} 
        />
        
        {/* Empty State */}
        {dataSeries.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 z-10">
            <div className="text-muted-foreground mb-4">
              <BarChart3 className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No Data Series</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Add indicators to visualize macroeconomic data
              </p>
              <button
                onClick={() => { onSettings && onSettings(); }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                Add Indicator
              </button>
            </div>
          </div>
        )}
        
        {/* Current Value Badge - Only show when there are series */}
        {dataSeries.length > 0 && (
          <div className="absolute top-3 right-16 z-10 bg-primary px-2 py-1 rounded text-xs text-primary-foreground">
            {currentValue.toLocaleString()}
          </div>
        )}

        {/* Tooltip */}
        <div
          ref={tooltipRef}
          style={{
            position: 'absolute',
            display: 'none',
            backgroundColor: 'rgba(26, 26, 26, 0.95)',
            border: '1px solid rgba(42, 42, 42, 0.8)',
            borderRadius: '4px',
            padding: '8px 12px',
            fontSize: '11px',
            pointerEvents: 'none',
            zIndex: 1000,
          }}
        />
      </div>
    
      {/* Slide-out Settings Panel for Add */}
      {showSettingsPanel && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowSettingsPanel(false)} />
          <div className="fixed right-0 top-0 bottom-0 z-50 w-[360px] max-w-[92vw] bg-card border-l border-border flex flex-col">
            <div className="px-4 py-4 border-b border-border bg-widget-header flex items-center justify-between">
              <h3 className="text-lg text-foreground font-semibold">Settings</h3>
              <button className="h-7 w-7 flex items-center justify-center text-muted-foreground hover:text-foreground rounded-none hover:bg-muted" onClick={() => setShowSettingsPanel(false)}>×</button>
            </div>
            <div className="p-4 space-y-4 flex-1 overflow-auto">
              <div className="text-base text-foreground font-semibold">Add Indicator</div>
              <div className="space-y-1">
                <div className="text-sm text-foreground font-medium">Country</div>
                <select value={selectedCountry} onChange={(e) => setSelectedCountry(e.target.value)} className="w-full bg-input border border-border px-3 py-2.5 text-base outline-none">
                  <option value="">Select a country...</option>
                  {allCountries.map(c => (<option key={c} value={c}>{c}</option>))}
                </select>
              </div>
              <div className="space-y-1">
                <div className="text-sm text-foreground font-medium">Category</div>
                <select value={selectedTab} onChange={(e) => setSelectedTab(e.target.value)} className="w-full bg-input border border-border px-3 py-2.5 text-base outline-none">
                  {(availableCategories || []).map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <div className="text-sm text-foreground font-medium">Event</div>
                <select value={selectedEvent} onChange={(e) => setSelectedEvent(e.target.value)} className="w-full bg-input border border-border px-3 py-2.5 text-base outline-none">
                  <option value="">Select an indicator...</option>
                  {(availableEvents[selectedCountry] || [])
                    .filter((v, i, a)=>a.indexOf(v)===i)
                    .map(ev => (<option key={ev} value={ev}>{ev}</option>))}
                </select>
              </div>
            </div>
            <div className="p-4 border-t border-border">
              <button
                className="w-full bg-primary text-primary-foreground px-4 py-3 text-base font-semibold disabled:opacity-50"
                disabled={!selectedCountry || !selectedEvent}
                onClick={() => { addNewSeries({ country: selectedCountry, indicator: selectedEvent, color: SERIES_COLORS[dataSeries.length % SERIES_COLORS.length] }); setShowSettingsPanel(false); }}
              >
                Add Indicator
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default MacroDataCharts;
