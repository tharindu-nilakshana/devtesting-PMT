"use client";

import React, { useState, useEffect, useRef } from 'react';
import { WidgetHeader } from '@/components/bloomberg-ui/WidgetHeader';
import { Plus, Search, BarChart3 } from 'lucide-react';

interface Props {
  onRemove?: () => void;
  onSettings?: () => void;
  onFullscreen?: () => void;
  settings?: Record<string, unknown>;
}

interface DataPoint {
  date: string;
  actual: number;
}

interface DataColumn {
  id: string;
  country: string;
  indicator: string;
  color: string;
  visible: boolean;
}

const COLUMN_COLORS = [
  "#f97316", "#3b82f6", "#22c55e", "#a855f7", 
  "#eab308", "#06b6d4", "#ec4899", "#8b5cf6"
];

// localStorage keys for persisting columns and settings
const STORAGE_KEY = 'macro-data-table-columns';
const SETTINGS_STORAGE_KEY = 'macro-data-table-settings';

// Helper function to load saved columns from localStorage
const loadSavedColumns = (): DataColumn[] => {
  if (typeof window === 'undefined') return [];
  
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return [];
    
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [];
    
    // Restore columns with new IDs (to avoid conflicts)
    return parsed.map((c: any, index: number) => ({
      id: `${c.country.toLowerCase().replace(/\s+/g, "-")}-${c.indicator.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}-${index}`,
      country: c.country,
      indicator: c.indicator,
      color: c.color || COLUMN_COLORS[index % COLUMN_COLORS.length],
      visible: c.visible !== false, // default to true if not specified
    }));
  } catch (error) {
    console.error('Error loading saved columns from localStorage:', error);
    return [];
  }
};

// Helper function to save columns to localStorage
const saveColumns = (columns: DataColumn[], skipIfEmpty: boolean = false) => {
  if (typeof window === 'undefined') return;
  
  try {
    // Don't save empty array if skipIfEmpty is true (prevents clearing saved data on initial mount)
    if (skipIfEmpty && columns.length === 0) {
      const existing = localStorage.getItem(STORAGE_KEY);
      if (existing && existing !== '[]') {
        return; // Keep existing data, don't overwrite with empty array
      }
    }
    
    // Save simplified version (without id - we'll regenerate those on load)
    const toSave = columns.map(c => ({
      country: c.country,
      indicator: c.indicator,
      color: c.color,
      visible: c.visible,
    }));
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch (error) {
    console.error('Error saving columns to localStorage:', error);
  }
};

// Helper function to load saved settings from localStorage
const loadSavedSettings = (): { country: string; category: string; event: string } | null => {
  if (typeof window === 'undefined') return null;
  
  try {
    const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!saved) return null;
    
    const parsed = JSON.parse(saved);
    return {
      country: parsed.country || '',
      category: parsed.category || '',
      event: parsed.event || '',
    };
  } catch (error) {
    console.error('Error loading saved settings from localStorage:', error);
    return null;
  }
};

// Helper function to save settings to localStorage
const saveSettings = (country: string, category: string, event: string) => {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({
      country,
      category,
      event,
    }));
  } catch (error) {
    console.error('Error saving settings to localStorage:', error);
  }
};

// Map country names to country codes
const COUNTRY_MAP: Record<string, string> = {
  "United Kingdom": "GBR",
  "United States": "USA",
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

// Map indicators to tabs and events
const INDICATOR_MAP: Record<string, { tab: string; event: string }> = {
  "GDP": { tab: "GDP", event: "GDP" },
  "CPI": { tab: "INFLATION", event: "CPI" },
  "Unemployment Rate": { tab: "EMPLOYMENT", event: "Unemployment Rate" },
  "Employed Persons": { tab: "EMPLOYMENT", event: "Employed Persons" },
  // Add more mappings as needed
};

// Available series menu (purely to let users add columns; data comes only from API)
const ALL_AVAILABLE_SERIES = [
  { country: "Australia", indicator: "Employed Persons" },
  { country: "Australia", indicator: "GDP" },
  { country: "United States", indicator: "GDP" },
  { country: "United States", indicator: "Unemployment Rate" },
  { country: "United States", indicator: "CPI" },
  { country: "United Kingdom", indicator: "GDP" },
  { country: "United Kingdom", indicator: "Unemployment Rate" },
  { country: "Germany", indicator: "GDP" },
  { country: "Germany", indicator: "Unemployment Rate" },
];

export function MacroDataTableWidget({
  onRemove,
  onSettings,
  onFullscreen
}: Props) {
  const [dataColumns, setDataColumns] = useState<DataColumn[]>([]);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [apiDataCache, setApiDataCache] = useState<Record<string, DataPoint[]>>({});
  const [isLoading, setIsLoading] = useState(false);
  const loadingRef = useRef<Record<string, boolean>>({});
  const [allCountries, setAllCountries] = useState<string[]>([]);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [availableEvents, setAvailableEvents] = useState<string[]>([]);
  
  // Track if this is the initial mount to prevent overwriting saved data
  const isInitialMountRef = useRef(true);

  // Settings slide-out state (reuse existing widget settings pattern)
  const [showSettings, setShowSettings] = useState(false);
  // Load saved settings on mount
  const [selectedCountry, setSelectedCountry] = useState<string>(() => {
    const saved = loadSavedSettings();
    return saved?.country || '';
  });
  const [selectedCategory, setSelectedCategory] = useState<string>(() => {
    const saved = loadSavedSettings();
    return saved?.category || '';
  });
  const [selectedEvent, setSelectedEvent] = useState<string>(() => {
    const saved = loadSavedSettings();
    return saved?.event || '';
  });
  const UNIT_MAP: Record<string, string> = {
    GDP: "Billion $",
    INFLATION: "Index",
    EMPLOYMENT: "%",
  };

  // Reload columns from localStorage on mount (handles widget switching)
  useEffect(() => {
    console.log('🔄 [MacroDataTable] Mount effect running, loading from localStorage...');
    const saved = loadSavedColumns();
    const savedSettings = loadSavedSettings();
    
    console.log('📊 [MacroDataTable] Loaded from localStorage:', { 
      savedColumns: saved.length, 
      savedSettings: savedSettings 
    });
    
    if (saved.length > 0) {
      // Always reload saved columns on mount (widget switching)
      console.log('📊 [MacroDataTable] Reloading columns from localStorage:', saved);
      setDataColumns(saved);
    }
    
    // Restore settings panel values
    if (savedSettings) {
      console.log('📊 [MacroDataTable] Restoring settings:', savedSettings);
      if (savedSettings.country) {
        setSelectedCountry(savedSettings.country);
      }
      if (savedSettings.category) {
        setSelectedCategory(savedSettings.category);
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

  // Bootstrap countries and categories from API (same as MacroDataCharts)
  useEffect(() => {
    const bootstrap = async () => {
      try {
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
            // Only set default country if we don't have a restored one
            const hasSavedSettings = typeof window !== 'undefined' && localStorage.getItem(SETTINGS_STORAGE_KEY);
            setSelectedCountry(prev => {
              if (!prev && !hasSavedSettings && countries.length > 0) {
                const usa = countries.find((c: string) => c.toUpperCase() === 'USA');
                return usa || countries[0];
              }
              return prev;
            });
          }
        }
        // Categories/tabs
        const tabsResp = await fetch('/api/pmt/macro-tabs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
        if (tabsResp.ok) {
          const j = await tabsResp.json();
          const tabs: string[] = j?.data?.tabs || j?.data?.Tabnames || j?.data?.tabnames || j?.data || [];
          if (Array.isArray(tabs) && tabs.length > 0) {
            setAvailableCategories(tabs);
            // Only set default category if we don't have a restored one
            const hasSavedSettings = typeof window !== 'undefined' && localStorage.getItem(SETTINGS_STORAGE_KEY);
            setSelectedCategory(prev => {
              if (!prev && !hasSavedSettings && tabs.length > 0) {
                const gdp = tabs.find((t: string) => t.toUpperCase() === 'GDP');
                return gdp || tabs[0];
              }
              return prev;
            });
          }
        }
      } catch (e) {
        // ignore
      }
    };
    bootstrap();
  }, []);

  // Fetch events when country and category are selected
  useEffect(() => {
    const fetchEvents = async () => {
      if (!selectedCategory || !selectedCountry) {
        setAvailableEvents([]);
        return;
      }
      
      console.log('🔍 [MacroDataTable] Fetching events for:', { category: selectedCategory, country: selectedCountry });
      
      try {
        const resp = await fetch('/api/pmt/macro-events-by-tab', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tabname: selectedCategory, country: selectedCountry }),
        });
        
        console.log('📡 [MacroDataTable] API response status:', resp.status, resp.ok);
        
        if (resp.ok) {
          const j = await resp.json();
          console.log('📦 [MacroDataTable] API response data:', j);
          
          // Try multiple possible response structures
          // Check if data is directly in response or nested
          let raw = j?.data?.events || j?.data?.EventNames || j?.data?.eventNames;
          
          // If not found, check if data itself is an array
          if (!raw && Array.isArray(j?.data)) {
            raw = j.data;
          }
          
          // If still not found, check if response itself is an array
          if (!raw && Array.isArray(j)) {
            raw = j;
          }
          
          // Fallback to empty array
          if (!raw) {
            raw = [];
          }
          
          console.log('📋 [MacroDataTable] Raw events data:', raw, 'Type:', typeof raw, 'IsArray:', Array.isArray(raw));
          
          // Handle both string arrays and object arrays
          const events: string[] = Array.isArray(raw)
            ? raw.map((e: any) => {
                if (typeof e === 'string') return e;
                // Try multiple possible property names (checking common variations)
                const eventName = e?.eventName || e?.EventName || e?.name || e?.Name || e?.event || e?.Event || e?.event_name;
                if (eventName) return String(eventName);
                // Last resort: try to stringify the object
                return String(e);
              }).filter((s: string) => !!s && s !== 'undefined' && s !== 'null')
            : [];
          
          console.log('✅ [MacroDataTable] Processed events:', events);
          
          if (events.length > 0) {
            setAvailableEvents(events);
            // Auto-select first event if none selected and we have events
            setSelectedEvent(prev => {
              if (!prev && events.length > 0) {
                return events[0];
              }
              return prev;
            });
          } else {
            console.warn('⚠️ [MacroDataTable] No events found in response');
            setAvailableEvents([]);
            setSelectedEvent('');
          }
        } else {
          const errorText = await resp.text().catch(() => '');
          console.error('❌ [MacroDataTable] API error:', resp.status, errorText);
          setAvailableEvents([]);
          setSelectedEvent('');
        }
      } catch (e) {
        console.error('❌ [MacroDataTable] Error fetching events:', e);
        setAvailableEvents([]);
        setSelectedEvent('');
      }
    };
    
    fetchEvents();
  }, [selectedCountry, selectedCategory]);

  // Always refresh events when settings panel opens (if country and category are already selected)
  useEffect(() => {
    if (showSettings && selectedCountry && selectedCategory) {
      const fetchEvents = async () => {
        console.log('🔄 [MacroDataTable] Refreshing events on panel open:', { category: selectedCategory, country: selectedCountry });
        try {
          const resp = await fetch('/api/pmt/macro-events-by-tab', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tabname: selectedCategory, country: selectedCountry }),
          });
          
          if (resp.ok) {
            const j = await resp.json();
            console.log('📦 [MacroDataTable] Panel open - API response:', j);
            
            // Try multiple possible response structures
            // Check if data is directly in response or nested
            let raw = j?.data?.events || j?.data?.EventNames || j?.data?.eventNames;
            
            // If not found, check if data itself is an array
            if (!raw && Array.isArray(j?.data)) {
              raw = j.data;
            }
            
            // If still not found, check if response itself is an array
            if (!raw && Array.isArray(j)) {
              raw = j;
            }
            
            // Fallback to empty array
            if (!raw) {
              raw = [];
            }
            
            // Handle both string arrays and object arrays
            const events: string[] = Array.isArray(raw)
              ? raw.map((e: any) => {
                  if (typeof e === 'string') return e;
                  // Try multiple possible property names (checking common variations)
                  const eventName = e?.eventName || e?.EventName || e?.name || e?.Name || e?.event || e?.Event || e?.event_name;
                  if (eventName) return String(eventName);
                  // Last resort: try to stringify the object
                  return String(e);
                }).filter((s: string) => !!s && s !== 'undefined' && s !== 'null')
              : [];
            
            console.log('✅ [MacroDataTable] Panel open - Processed events:', events);
            
            if (events.length > 0) {
              setAvailableEvents(events);
            } else {
              console.warn('⚠️ [MacroDataTable] Panel open - No events found');
              setAvailableEvents([]);
            }
          } else {
            const errorText = await resp.text().catch(() => '');
            console.error('❌ [MacroDataTable] Panel open - API error:', resp.status, errorText);
            setAvailableEvents([]);
          }
        } catch (e) {
          console.error('❌ [MacroDataTable] Panel open - Error fetching events:', e);
          setAvailableEvents([]);
        }
      };
      
      fetchEvents();
    }
  }, [showSettings, selectedCountry, selectedCategory]);

  // Reset category and event when country changes (but not on initial mount or when restoring saved settings)
  const prevCountryRef = useRef<string>('');
  useEffect(() => {
    if (selectedCountry && prevCountryRef.current && prevCountryRef.current !== selectedCountry) {
      // Country actually changed (user selected a different one)
      setSelectedCategory('');
      setSelectedEvent('');
    }
    prevCountryRef.current = selectedCountry;
  }, [selectedCountry]);

  // Reset event when category changes (but not on initial mount or when restoring saved settings)
  const prevCategoryRef = useRef<string>('');
  useEffect(() => {
    if (selectedCategory && prevCategoryRef.current && prevCategoryRef.current !== selectedCategory) {
      // Category actually changed (user selected a different one)
      setSelectedEvent('');
    }
    prevCategoryRef.current = selectedCategory;
  }, [selectedCategory]);

  // Fetch data from API for a specific column
  useEffect(() => {
    const fetchColumnData = async (column: DataColumn) => {
      const cacheKey = `${column.country}-${column.indicator}`;
      
      // Skip if already in cache or currently loading
      if (apiDataCache[cacheKey]?.length > 0 || loadingRef.current[cacheKey]) {
        return;
      }
      
      // Check if we have mapping for this indicator
      const indicatorInfo = INDICATOR_MAP[column.indicator];
      if (!indicatorInfo) {
        // Fall back to hardcoded data
        return;
      }
      
      const countryCode = COUNTRY_MAP[column.country] || column.country;
      loadingRef.current[cacheKey] = true;
      setIsLoading(true);
      
      try {
        const response = await fetch('/api/pmt/macro-table-data-direct', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            country: countryCode,
            tab: indicatorInfo.tab,
            event: indicatorInfo.event,
          }),
        });
        
        if (response.ok) {
          const result = await response.json();
          
          if (result.success && result.data) {
            let transformedData: DataPoint[] = [];
            // Expected direct response: { success, data: { data: [ {date, value, forecast, comment}, ... ] } }
            const payload = result.data?.data || result.data?.Data || [];
            if (Array.isArray(payload)) {
              transformedData = payload.map((row: any) => ({
                date: String(row.date || row.Date || ''),
                actual: parseFloat(row.value || row.actual || '0') || 0,
              })).filter((d: DataPoint) => d.date);
            }
            
            if (transformedData.length > 0) {
              setApiDataCache(prev => ({
                ...prev,
                [cacheKey]: transformedData,
              }));
            }
          }
        }
      } catch (error) {
        console.error(`Error fetching data for ${column.country} - ${column.indicator}:`, error);
      } finally {
        loadingRef.current[cacheKey] = false;
        setIsLoading(false);
      }
    };
    
    // Fetch data for all columns
    dataColumns.forEach(column => {
      fetchColumnData(column);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataColumns]);

  const getDataForColumn = (country: string, indicator: string): DataPoint[] => {
    const cacheKey = `${country}-${indicator}`;
    
    // Use only API cache (no dummy fallback)
    if (apiDataCache[cacheKey] && apiDataCache[cacheKey].length > 0) {
      return apiDataCache[cacheKey];
    }
    return [];
  };

  const getAllDates = (): string[] => {
    const visibleColumns = dataColumns.filter(col => col.visible);
    if (visibleColumns.length === 0) return [];

    const allDates = new Set<string>();
    visibleColumns.forEach(col => {
      const data = getDataForColumn(col.country, col.indicator);
      data.forEach(point => allDates.add(point.date));
    });

    return Array.from(allDates).sort((a, b) => b.localeCompare(a));
  };

  const getValueForDate = (date: string, country: string, indicator: string): number | null => {
    const data = getDataForColumn(country, indicator);
    const point = data.find(p => p.date === date);
    return point ? point.actual : null;
  };

  const toggleColumn = (id: string) => {
    setDataColumns(prev => prev.map(col => (col.id === id ? { ...col, visible: !col.visible } : col)));
  };

  const addNewColumn = (country: string, indicator: string) => {
    if (dataColumns.length >= 8) return;
    
    const exists = dataColumns.some(col => col.country === country && col.indicator === indicator);
    if (exists) {
      setShowAddMenu(false);
      setSearchQuery("");
      setShowSettings(false);
      return;
    }

    const newColumn: DataColumn = {
      id: `${country.toLowerCase().replace(/\s+/g, "-")}-${indicator.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`,
      country,
      indicator,
      color: COLUMN_COLORS[dataColumns.length % COLUMN_COLORS.length],
      visible: true,
    };
    
    setDataColumns(prev => [...prev, newColumn]);
    setShowAddMenu(false);
    setSearchQuery("");
    setShowSettings(false);
  };

  const removeColumn = (id: string) => {
    setDataColumns(prev => prev.filter(col => col.id !== id));
  };

  // Save columns to localStorage whenever dataColumns changes
  useEffect(() => {
    // Skip saving on initial mount to avoid overwriting with empty array
    if (isInitialMountRef.current) {
      return;
    }
    
    // If all columns are deleted, clear both columns and settings from localStorage
    if (dataColumns.length === 0) {
      console.log('📊 [MacroDataTable] All columns deleted, clearing localStorage');
      if (typeof window !== 'undefined') {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(SETTINGS_STORAGE_KEY);
      }
      return;
    }
    
    // Save to localStorage (skipIfEmpty prevents clearing on first render)
    saveColumns(dataColumns, true);
  }, [dataColumns]);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    // Skip saving on initial mount
    if (isInitialMountRef.current) {
      return;
    }
    
    // Save settings to localStorage
    if (selectedCountry || selectedCategory || selectedEvent) {
      saveSettings(selectedCountry, selectedCategory, selectedEvent);
    }
  }, [selectedCountry, selectedCategory, selectedEvent]);

  const getFilteredSeries = () => {
    const query = searchQuery.toLowerCase();
    return ALL_AVAILABLE_SERIES.filter(
      series => !dataColumns.some(col => col.country === series.country && col.indicator === series.indicator) &&
        (series.country.toLowerCase().includes(query) || series.indicator.toLowerCase().includes(query))
    );
  };

  const allDates = getAllDates();
  const visibleColumns = dataColumns.filter(col => col.visible);

  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* Backdrop - Click to Close */}
      {showSettings && (
        <div
          className="absolute inset-0 z-40 transition-opacity duration-500"
          onClick={() => setShowSettings(false)}
        />
      )}

      {/* Content with Blur Effect */}
      <div className={`flex flex-col h-full bg-widget-body border border-border rounded-none overflow-hidden transition-all duration-500 ${showSettings ? 'blur-sm' : 'blur-0'}`}> 
        <WidgetHeader 
        title="Macro Data Table"
        onRemove={onRemove}
        onFullscreen={onFullscreen}
        helpContent="Macroeconomic data table with multiple country and indicator columns."
        />

      {/* Columns Legend */}
      <div className="px-4 py-2 bg-widget-header border-b border-border flex flex-wrap items-center gap-x-4 gap-y-2">
        {dataColumns.map((column) => (
          <div key={column.id} className="flex items-center gap-2">
            <button onClick={() => toggleColumn(column.id)} className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity">
              <div className="w-4 h-0.5 rounded transition-opacity" style={{ backgroundColor: column.color, opacity: column.visible ? 1 : 0.3 }}></div>
              <span className="text-xs transition-opacity font-semibold" style={{ opacity: column.visible ? 1 : 0.5 }}>{column.country} - {column.indicator}</span>
            </button>
            <button onClick={() => removeColumn(column.id)} className="text-xs text-muted-foreground hover:text-destructive transition-colors ml-1" title="Remove column">×</button>
          </div>
        ))}
        
        {dataColumns.length < 8 && (
          <button onClick={() => setShowSettings(true)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors">
            <Plus className="w-3.5 h-3.5" />
            <span>Add Column</span>
          </button>
        )}

        <div className="flex-1"></div>
        {dataColumns.length > 0 && (
          <div className="text-xs text-muted-foreground">{allDates.length} records</div>
        )}
      </div>

      {/* Empty State or Table */}
      {dataColumns.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
          <div className="text-muted-foreground mb-4">
            <BarChart3 className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No Data Columns</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Add indicators to visualize macroeconomic data
            </p>
            <button
              onClick={() => setShowSettings(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Add Indicator
            </button>
          </div>
        </div>
      ) : (
        /* Table */
        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full">
            <thead className="sticky top-0 z-10 bg-widget-header border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 text-muted-foreground sticky left-0 bg-widget-header z-20 font-semibold" style={{fontSize: '14px'}}>Date</th>
                {visibleColumns.map((column) => (
                  <th key={column.id} className="text-right px-4 py-3 whitespace-nowrap font-semibold" style={{ color: column.color, fontSize: '14px' }}>
                    {column.country} - {column.indicator}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {allDates.map((date, index) => (
                <tr key={`${date}-${index}`} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-2.5 sticky left-0 bg-widget-body z-10 font-semibold" style={{fontSize: '14px'}}>{date}</td>
                  {visibleColumns.map((column) => {
                    const value = getValueForDate(date, column.country, column.indicator);
                    return (
                      <td key={column.id} className="px-4 py-2.5 text-right tabular-nums font-semibold" style={{fontFamily: 'SF Mono, Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace', fontSize: '14px'}}>
                        {value !== null ? value.toLocaleString() : <span className="text-muted-foreground">—</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      </div>

      {/* Settings Slide-in Panel (includes Add Column form) */}
      <div
        className={`absolute top-0 right-0 h-full w-[360px] bg-card border-l border-border z-50 transition-all duration-500 ease-in-out ${
          showSettings ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
        }`}
      >
        <div className="px-4 py-4 border-b border-border bg-widget-header flex items-center justify-between">
          <h3 className="text-lg text-foreground font-semibold">Settings</h3>
          <button className="h-7 w-7 flex items-center justify-center text-muted-foreground hover:text-foreground rounded-none hover:bg-muted" onClick={() => setShowSettings(false)}>×</button>
        </div>
        <div className="h-[calc(100%-120px)] overflow-y-auto p-4">
          <div className="space-y-4">
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
              <select 
                value={selectedCategory} 
                onChange={(e) => { 
                  setSelectedCategory(e.target.value); 
                  setSelectedEvent(""); 
                }} 
                className="w-full bg-input border border-border px-3 py-2.5 text-base outline-none"
                disabled={!selectedCountry}
              >
                <option value="">{selectedCountry ? "Select a category..." : "Select a country first..."}</option>
                {availableCategories.map(cat => (<option key={cat} value={cat}>{cat}</option>))}
              </select>
              <div className="text-sm text-muted-foreground mt-1">Unit: {UNIT_MAP[selectedCategory as keyof typeof UNIT_MAP] || ""}</div>
            </div>
            <div className="space-y-1">
              <div className="text-sm text-foreground font-medium">Event</div>
              <select 
                value={selectedEvent} 
                onChange={(e) => setSelectedEvent(e.target.value)} 
                className="w-full bg-input border border-border px-3 py-2.5 text-base outline-none"
                disabled={!selectedCategory || !selectedCountry}
              >
                <option value="">{selectedCategory && selectedCountry ? "Select an indicator..." : "Select category first..."}</option>
                {availableEvents.map((ev, idx) => (<option key={`event-${idx}-${ev}`} value={ev}>{ev}</option>))}
              </select>
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border bg-card">
          <div className="flex gap-2">
            <button
              className="flex-1 px-4 py-3 text-base font-semibold border border-border bg-background hover:bg-muted rounded-none"
              onClick={() => setShowSettings(false)}
            >
              Cancel
            </button>
            <button
              className="flex-1 bg-primary text-primary-foreground px-4 py-3 text-base font-semibold disabled:opacity-50 rounded-none"
              disabled={!selectedCountry || !selectedEvent}
              onClick={() => addNewColumn(selectedCountry, selectedEvent)}
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MacroDataTableWidget;

