/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTheme } from '@/hooks/useTheme';
import { useDateFormat } from '@/hooks/useDateFormat';
import { useTemplates } from '@/hooks/useTemplates';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { WidgetHeader } from '@/components/bloomberg-ui/WidgetHeader';
import { widgetDataCache } from '@/lib/widgetDataCache';

/**
 * COTTableViewWidget - SSR-Enabled Version
 * 
 * ✅ SSR CONFIRMATION: This component fully conforms to Server-Side Rendering standards.
 * This widget loads instantly with SSR data and seamlessly transitions to client-side updates.
 * 
 * Supports COT (Commitment of Traders) historical data display with infinite scroll.
 */

interface COTTableViewWidgetProps {
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
  settings?: Record<string, any>; // Widget settings from database
  // SSR props
  ssrInitialData?: COTTableRow[];
  ssrSymbolPart?: string;
  ssrOwner?: string;
  useLegacyPattern?: boolean; // Feature flag for backward compatibility
}

// Dropdown options arrays - copied from Bloomberg mock
const INSTRUMENTS = ["CAD", "EUR", "GBP", "JPY", "AUD", "CHF", "USD", "NZD"];
const REPORTERS = [
  "Dealer Intermediary",
  "Asset Manager / Institutional",
  "Leveraged Funds"
];

// Map reporter display names to API values
const mapReporterToAPI = (reporter: string): string => {
  const mapping: Record<string, string> = {
    "Dealer Intermediary": "Dealer",
    "Asset Manager / Institutional": "AssetManager",
    "Leveraged Funds": "Leveraged"
  };
  return mapping[reporter] || reporter;
};

// Map API values back to display names
const mapAPIToReporter = (apiValue: string): string => {
  const mapping: Record<string, string> = {
    "Dealer": "Dealer Intermediary",
    "AssetManager": "Asset Manager / Institutional",
    "Leveraged": "Leveraged Funds"
  };
  return mapping[apiValue] || apiValue;
};

interface COTTableData {
  error: string;
  success: any;
  data: any[]; // JSON array of table rows
  maxid: string;
}

interface COTTableRow {
  date: string;
  openInterest: string;
  positions: {
    long: string;
    longChange: string;
    short: string;
    shortChange: string;
    spreading: string;
    spreadingChange: string;
    totalPosition: string;
    netPosition: string;
  };
  percentOfOpenInterest: {
    long: string;
    short: string;
    spreading: string;
    net: string;
  };
  numberOfTraders: {
    long: string;
    short: string;
    spreading: string;
    totalTraders: string;
    netTraders: string;
  };
}

const COTTableViewWidget: React.FC<COTTableViewWidgetProps> = ({
  wgid,
  wght,
  additionalSettings = '',
  templateName = 'Dashboard',
  initialData: _initialData,
  isStandalone = false,
  onRemove,
  onFullscreen,
  onSaveSettings,
  settings,
  // SSR props
  ssrInitialData,
  ssrSymbolPart,
  ssrOwner,
  useLegacyPattern = false,
}) => {
  console.log('🎯 [COT Table Widget] Component rendered with props:', { wgid, wght, additionalSettings, templateName, isStandalone, hasSSRData: !!ssrInitialData });
  const { isDark } = useTheme();
  const { activeTemplateId, updateWidgetFields, templates } = useTemplates();
  
  // Debug: Log the settings object to see what we're receiving
  useEffect(() => {
    console.log('🔧 [COT Table] Widget mounted/updated with:', {
      wgid,
      settings,
      settingsKeys: settings ? Object.keys(settings) : [],
      symbol: settings?.symbol,
      owner: settings?.owner,
      customDashboardWidgetID: settings?.customDashboardWidgetID,
      hasCustomDashboardWidgetID: !!settings?.customDashboardWidgetID,
      hasOnSaveSettings: !!onSaveSettings,
      additionalSettings
    });
  }, [wgid, settings, additionalSettings, onSaveSettings]);
  
  // Parse additionalSettings to get initial values - support both JSON and pipe-separated formats
  const getInitialValues = () => {
    console.log('🔧 [COT Table] getInitialValues called with:', {
      'settings?.symbol': settings?.symbol,
      'settings?.owner': settings?.owner,
      additionalSettings,
      ssrSymbolPart,
      ssrOwner
    });
    
    // First check settings prop (from parsed JSON in BloombergDashboard or TabbedWidget)
    if (settings?.symbol || settings?.owner) {
      console.log('🔧 [COT Table] Using values from settings prop');
      const symbol = (settings.symbol as string)?.toUpperCase() || 'EUR';
      const owner = (settings.owner as string) || 'Dealer';
      // Validate
      return {
        symbolPart: INSTRUMENTS.includes(symbol) ? symbol : 'EUR',
        owner: ['Dealer', 'AssetManager', 'Leveraged'].includes(owner) ? owner : 'Dealer'
      };
    }
    
    // Then try to parse additionalSettings
    if (additionalSettings) {
      // Try JSON format first
      try {
        const parsed = JSON.parse(additionalSettings);
        if (parsed && typeof parsed === 'object') {
          const symbol = (parsed.symbol as string)?.toUpperCase() || 'EUR';
          const owner = (parsed.owner as string) || 'Dealer';
          console.log('🔧 [COT Table] Parsed additionalSettings (JSON format):', { parsed, symbol, owner });
          return {
            symbolPart: INSTRUMENTS.includes(symbol) ? symbol : 'EUR',
            owner: ['Dealer', 'AssetManager', 'Leveraged'].includes(owner) ? owner : 'Dealer'
          };
        }
      } catch {
        // Fall back to pipe-separated format
        const parsedSettings = additionalSettings.split('|');
        const parsedSymbol = parsedSettings[0];
        const parsedOwner = parsedSettings[1];
        console.log('🔧 [COT Table] Parsed additionalSettings (pipe format):', { additionalSettings, parsedSymbol, parsedOwner });
        return {
          symbolPart: parsedSymbol && INSTRUMENTS.includes(parsedSymbol) ? parsedSymbol : 'EUR',
          owner: parsedOwner && ['Dealer', 'AssetManager', 'Leveraged'].includes(parsedOwner) ? parsedOwner : 'Dealer'
        };
      }
    }
    
    // Fall back to SSR props or defaults
    return {
      symbolPart: ssrSymbolPart && INSTRUMENTS.includes(ssrSymbolPart) ? ssrSymbolPart : 'EUR',
      owner: ssrOwner && ['Dealer', 'AssetManager', 'Leveraged'].includes(ssrOwner) ? ssrOwner : 'Dealer'
    };
  };
  
  const initialValues = getInitialValues();
  const symbolPart = initialValues.symbolPart;
  const owner = initialValues.owner;
  
  console.log('🔧 [COT Table Widget] Initial values:', { 
    symbolPart, 
    owner,
    additionalSettings
  });
  
  // Save settings to database when dropdowns change
  const saveSettingsToDatabase = useCallback(async (instrument: string, reporter: string) => {
    // Try to get customDashboardWidgetID from settings (when inside TabbedWidget or other containers)
    // or use wgid if it's a direct numeric widget ID
    let widgetIdForApi: string | null = null;
    
    if (settings?.customDashboardWidgetID) {
      widgetIdForApi = String(settings.customDashboardWidgetID);
      console.log('📊 [COT Table] Using customDashboardWidgetID from settings:', widgetIdForApi);
    } else if (wgid) {
      // Check if wgid contains hyphens (composite key like "123-tab-1-0")
      // If it does, it's NOT a direct widget ID and we should skip the API call
      if (wgid.includes('-')) {
        console.log('📊 [COT Table] wgid is composite key:', wgid, '- skipping direct API call (customDashboardWidgetID needed)');
      } else {
        // It's a simple numeric string, safe to use
        const numericWgid = parseInt(wgid, 10);
        if (!isNaN(numericWgid)) {
          widgetIdForApi = wgid;
          console.log('📊 [COT Table] Using wgid:', widgetIdForApi);
        }
      }
    }
    
    // Skip if no valid widget ID or no active template
    if (!widgetIdForApi || !activeTemplateId) {
      console.log('📊 [COT Table] Cannot save settings - no valid widget ID or missing activeTemplateId', { 
        wgid, 
        widgetIdForApi, 
        activeTemplateId,
        hasCustomDashboardWidgetID: !!settings?.customDashboardWidgetID
      });
      return;
    }
    
    try {
      // Create JSON format additionalSettings with symbol and owner (API format)
      const additionalSettingsObj = {
        symbol: instrument,
        owner: mapReporterToAPI(reporter)
      };
      
      const updateFields = {
        additionalSettings: JSON.stringify(additionalSettingsObj),
      };
      
      console.log('📡 [COT Table] Calling updateWidgetFields API:', {
        widgetId: widgetIdForApi,
        templateId: activeTemplateId,
        additionalSettings: additionalSettingsObj,
        updateFields
      });
      
      const result = await updateWidgetFields(widgetIdForApi, activeTemplateId, updateFields);
      
      if (result.success) {
        console.log('✅ [COT Table] Settings saved to database');
      } else {
        console.warn('⚠️ [COT Table] Failed to save settings:', result.message);
      }
    } catch (error) {
      console.error('❌ [COT Table] Error saving settings to database:', error);
    }
  }, [wgid, settings?.customDashboardWidgetID, activeTemplateId, templates, updateWidgetFields]);
  
  const [selectedInstrument, setSelectedInstrument] = useState<string>(symbolPart);
  const [selectedReporter, setSelectedReporter] = useState<string>(mapAPIToReporter(owner));
  
  // Update state if settings prop changes after mount (e.g., when template data loads on refresh)
  useEffect(() => {
    // Check for symbol in settings (from parsed additionalSettings JSON)
    if (settings?.symbol) {
      const symbolValue = (settings.symbol as string).toUpperCase();
      if (INSTRUMENTS.includes(symbolValue) && symbolValue !== selectedInstrument) {
        console.log('📊 [COT Table] Syncing instrument from settings:', symbolValue);
        setSelectedInstrument(symbolValue);
      }
    }
    // Check for owner in settings
    if (settings?.owner) {
      const ownerValue = settings.owner as string;
      const displayOwner = mapAPIToReporter(ownerValue);
      if (displayOwner !== selectedReporter) {
        console.log('📊 [COT Table] Syncing reporter from settings:', displayOwner);
        setSelectedReporter(displayOwner);
      }
    }
  }, [settings?.symbol, settings?.owner]);
  
  // Update state if additionalSettings prop changes after mount (handles both JSON and pipe formats)
  useEffect(() => {
    if (additionalSettings) {
      // Try JSON format first
      try {
        const parsed = JSON.parse(additionalSettings);
        if (parsed && typeof parsed === 'object') {
          if (parsed.symbol) {
            const symbolValue = (parsed.symbol as string).toUpperCase();
            if (INSTRUMENTS.includes(symbolValue) && symbolValue !== selectedInstrument) {
              console.log('📊 [COT Table] Syncing instrument from additionalSettings JSON:', symbolValue);
              setSelectedInstrument(symbolValue);
            }
          }
          if (parsed.owner) {
            const ownerValue = parsed.owner as string;
            const displayOwner = mapAPIToReporter(ownerValue);
            if (displayOwner !== selectedReporter) {
              console.log('📊 [COT Table] Syncing reporter from additionalSettings JSON:', displayOwner);
              setSelectedReporter(displayOwner);
            }
          }
        }
      } catch {
        // Fall back to pipe-separated format
        const parts = additionalSettings.split('|');
        if (parts.length >= 2) {
          const symbolValue = parts[0];
          const ownerValue = parts[1];
          if (symbolValue && INSTRUMENTS.includes(symbolValue) && symbolValue !== selectedInstrument) {
            console.log('📊 [COT Table] Syncing instrument from additionalSettings pipe:', symbolValue);
            setSelectedInstrument(symbolValue);
          }
          if (ownerValue) {
            const displayOwner = mapAPIToReporter(ownerValue);
            if (displayOwner !== selectedReporter) {
              console.log('📊 [COT Table] Syncing reporter from additionalSettings pipe:', displayOwner);
              setSelectedReporter(displayOwner);
            }
          }
        }
      }
    }
  }, [additionalSettings]);
  
  // Initialize state with SSR data for immediate rendering
  const [data, setData] = useState<COTTableRow[]>(ssrInitialData || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [maxId, setMaxId] = useState<string>('0');
  const [loadedDates, setLoadedDates] = useState<Set<string>>(new Set());
  const [hasMoreData, setHasMoreData] = useState(true);
  
  const tableRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isLoadingRef = useRef(false);
  const isInitialMountRef = useRef(true);
  const hasInitializedRef = useRef(false);
  const previousInstrumentRef = useRef<string>(symbolPart);
  const previousReporterRef = useRef<string>(mapAPIToReporter(owner));
  
  // Debug log after state declarations
  console.log('🎯 [COT Table Widget] Current data state:', { dataLength: data.length, loading, error, hasSSRData: !!ssrInitialData });
  
  // Log client-side auth token for debugging
  const clientToken = typeof window !== 'undefined' ? localStorage.getItem('pmt_auth_token') : null;
  console.log('🔐 [COT Table Widget] Client-side auth token:', {
    hasToken: !!clientToken,
    tokenLength: clientToken?.length || 0,
    tokenPreview: clientToken ? `${clientToken.substring(0, 20)}...` : 'None',
    tokenEnd: clientToken ? `...${clientToken.substring(clientToken.length - 20)}` : 'None',
    fullToken: clientToken || 'None'
  });

  // Format date according to user preferences using centralized hook
  const { format: formatDate, dateFormat, isLoading: prefsLoading } = useDateFormat();
  
  // Create stable formatDate reference that updates when dateFormat changes
  const formatDateRef = React.useRef(formatDate);
  React.useEffect(() => {
    formatDateRef.current = formatDate;
  }, [formatDate, dateFormat]);
  
  // Force re-render when date format preference changes (matches SeasonalityForecastTableWidget pattern)
  const [, forceUpdate] = React.useReducer((x: number) => x + 1, 0);
  
  React.useEffect(() => {
    // Re-render table when date format changes
    forceUpdate();
  }, [dateFormat]);
  
  // Debug: Log when dateFormat changes
  console.log('📅 [COT Table] Date format:', { dateFormat, prefsLoading, sampleDate: data[0]?.date, formatted: data[0]?.date ? formatDate(data[0].date) : 'N/A' });

  // Memoize formatted data based on dateFormat to ensure re-render on format change
  const formattedData = React.useMemo(() => {
    console.log('📅 [COT Table] Recalculating formatted data with dateFormat:', dateFormat);
    return data.map(row => ({
      ...row,
      formattedDate: formatDate(row.date)
    }));
  }, [data, dateFormat, formatDate]);

  // Parse API data into structured format
  // Parse JSON data from API response (updated for real API)
  const parseTableData = useCallback((jsonData: any[]): COTTableRow[] => {
    if (!jsonData || !Array.isArray(jsonData)) return [];
    
    console.log('🔍 [COT Table] Parsing JSON rows:', { totalRows: jsonData.length, firstRow: jsonData[0] });
    
    return jsonData.map((row, index) => {
      // Handle different possible data structures from the API
      if (typeof row === 'object' && row !== null) {
        // Map the exact field names from the API response
        return {
          date: row.date || '',
          openInterest: row.openInterest || '',
          positions: {
            long: row.longPosition || '',
            longChange: row.changeLong || '',
            short: row.shortPosition || '',
            shortChange: row.changeShort || '',
            spreading: row.spreadingPosition || '',
            spreadingChange: row.changeSpreading || '',
            totalPosition: row.totalPosition || '',
            netPosition: row.netPosition || '',
          },
          percentOfOpenInterest: {
            long: row.longPercent || '',
            short: row.shortPercent || '',
            spreading: row.spreadingPercent || '',
            net: row.netPercent || '',
          },
          numberOfTraders: {
            long: row.tradersLong || '',
            short: row.tradersShort || '',
            spreading: row.tradersSpreading || '',
            totalTraders: row.tradersTotal || '',
            netTraders: row.tradersNet || '',
          },
        };
      } else if (Array.isArray(row)) {
        // If it's an array of values
        return {
          date: row[0] || '',
          openInterest: row[1] || '',
          positions: {
            long: row[2] || '',
            longChange: row[3] || '',
            short: row[4] || '',
            shortChange: row[5] || '',
            spreading: row[6] || '',
            spreadingChange: row[7] || '',
            totalPosition: row[8] || '',
            netPosition: row[9] || '',
          },
          percentOfOpenInterest: {
            long: row[10] || '',
            short: row[11] || '',
            spreading: row[12] || '',
            net: row[13] || '',
          },
          numberOfTraders: {
            long: row[14] || '',
            short: row[15] || '',
            spreading: row[16] || '',
            totalTraders: row[17] || '',
            netTraders: row[18] || '',
          },
        };
      } else {
        console.warn('⚠️ [COT Table] Unknown row format:', row);
        return null;
      }
    }).filter(Boolean) as COTTableRow[];
  }, []);

  // Fetch COT history table data
  const fetchCOTHistoryData = useCallback(async (isInitial = false, instrument?: string, reporter?: string) => {
    // Use provided values or fall back to state
    const currentInstrument = instrument || selectedInstrument;
    const currentReporter = reporter || selectedReporter;
    const apiReporter = mapReporterToAPI(currentReporter);
    
    console.log('🚀 [COT Table] Starting fetchCOTHistoryData:', { 
      isInitial, 
      wgid, 
      instrument: currentInstrument, 
      reporter: currentReporter,
      apiReporter,
      maxId 
    });
    
    // Check cache for initial load only
    if (isInitial) {
      const cacheKey = widgetDataCache.generateKey('cot-history-table', {
        symbolPart: currentInstrument,
        owner: apiReporter,
        maxId: '0'
      });
      const cachedData = widgetDataCache.get<COTTableData>(cacheKey);
      
      if (cachedData && cachedData.success) {
        console.log('📦 [COT Table] Using cached data');
        const parsedRows = parseTableData(cachedData.data);
        setData(parsedRows);
        setMaxId(cachedData.maxid || '0');
        setHasMoreData(false); // API returns all data at once
        setLoading(false);
        isLoadingRef.current = false;
        return;
      }
    }
    
    if (isLoadingRef.current) {
      console.log('⏸️ [COT Table] Already loading, skipping request');
      return;
    }
    
    isLoadingRef.current = true;
    setLoading(true);
    setError(null);

    const requestBody = {
      widgetId: wgid,
      symbolPart: currentInstrument,
      owner: apiReporter,
      symbolSelection: '1',
      maxId: isInitial ? '0' : maxId,
      templateName,
    };
    
    console.log('📤 [COT Table] Sending API request with payload:', {
      symbolPart: currentInstrument,
      owner: apiReporter,
      symbolSelection: '1',
      displayReporter: currentReporter,
      mappedCorrectly: mapReporterToAPI(currentReporter) === apiReporter
    });

    try {
      const response = await fetch('/api/cot/cot-history-table', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const result: COTTableData = await response.json();      
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch COT history data');
      }

      // Cache the result for initial loads only
      if (isInitial) {
        const cacheKey = widgetDataCache.generateKey('cot-history-table', {
          symbolPart: currentInstrument,
          owner: apiReporter,
          maxId: '0'
        });
        widgetDataCache.set(cacheKey, result);
      }

      console.log('📥 [COT Table] Received API response:', {
        success: result.success,
        dataLength: result.data?.length || 0,
        maxid: result.maxid,
        sampleRow: result.data?.[5] || 'No data',
        requestParams: { instrument: currentInstrument, reporter: currentReporter, apiReporter }
      });

      const newRows = parseTableData(result.data);
      console.log('🔄 [COT Table] Parsed rows:', { 
        newRowsLength: newRows.length, 
        firstRow: newRows[0],
        sampleRow5: newRows[5] 
      });
      
      // For initial load, use all rows. For subsequent loads, filter duplicates
      const uniqueRows = isInitial ? newRows : newRows.filter(row => !loadedDates.has(row.date));
      
      if (uniqueRows.length > 0) {
        console.log('✅ [COT Table] Setting data:', { 
          isInitial, 
          uniqueRowsLength: uniqueRows.length, 
          firstRow: uniqueRows[0],
          loadedDatesSize: loadedDates.size
        });
        setData(prevData => isInitial ? uniqueRows : [...prevData, ...uniqueRows]);
        setLoadedDates(prev => new Set([...prev, ...uniqueRows.map(row => row.date)]));
        setMaxId(result.maxid);
        
        // Since we're getting all data at once (1006 rows), set hasMoreData to false
        // to prevent infinite loading
        setHasMoreData(false);
      } else if (isInitial) {
        console.log('❌ [COT Table] No data on initial load');
        setData([]);
        setHasMoreData(false);
      } else {
        console.log('ℹ️ [COT Table] No new unique rows for pagination');
      }

    } catch (err) {
      console.error('❌ [COT Table] Error fetching COT history data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  }, [wgid, selectedInstrument, selectedReporter, maxId, templateName, parseTableData]);

  // Handle scroll for infinite loading
  const handleScroll = useCallback(() => {
    if (!scrollRef.current || !hasMoreData || loading) {
      console.log('⏸️ [COT Table] Scroll handler skipped:', { hasMoreData, loading });
      return;
    }
    
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const isNearBottom = scrollTop + clientHeight >= scrollHeight - 100;
    
    if (isNearBottom) {
      console.log('📜 [COT Table] Near bottom, loading more data');
      fetchCOTHistoryData(false);
    }
  }, [hasMoreData, loading, fetchCOTHistoryData]);

  // Component mount/unmount tracking
  useEffect(() => {
    console.log('🆕 [COT Table] Component mounted:', { 
      wgid, 
      symbolPart, 
      owner,
      selectedInstrument,
      selectedReporter,
      additionalSettings,
      timestamp: new Date().toISOString()
    });
    return () => {
      console.log('🗑️ [COT Table] Component unmounting:', { wgid, symbolPart, owner });
    };
  }, []);

  // Initial data load - fetch on mount
  useEffect(() => {
    // Get the current values from state/props at mount time
    const instrumentToFetch = symbolPart;
    const reporterToFetch = mapAPIToReporter(owner);
    
    console.log('🔄 [COT Table] Initial load effect running:', { 
      symbolPart, 
      owner, 
      instrumentToFetch,
      reporterToFetch,
      wgid,
      additionalSettings,
      timestamp: new Date().toISOString()
    });
    
    // Mark as initialized
    hasInitializedRef.current = true;
    isInitialMountRef.current = false;
    
    // Update previous values to match initial state
    previousInstrumentRef.current = instrumentToFetch;
    previousReporterRef.current = reporterToFetch;
    
    // Direct API call to avoid stale closure issues
    const loadInitialData = async () => {
      const apiReporter = mapReporterToAPI(reporterToFetch);
      
      console.log('📡 [COT Table] Making initial API call:', { 
        instrument: instrumentToFetch, 
        reporter: reporterToFetch,
        apiReporter,
        wgid
      });
      
      isLoadingRef.current = true;
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch('/api/cot/cot-history-table', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            widgetId: wgid,
            symbolPart: instrumentToFetch,
            owner: apiReporter,
            symbolSelection: '1',
            maxId: '0',
            templateName,
          }),
        });

        if (!response.ok) {
          throw new Error(`API request failed: ${response.status}`);
        }

        const result = await response.json();
        
        console.log('📥 [COT Table] Initial load response:', {
          success: result.success,
          dataLength: result.data?.length || 0,
        });
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to fetch COT history data');
        }

        const newRows = parseTableData(result.data);
        
        if (newRows.length > 0) {
          setData(newRows);
          setMaxId(result.maxid || '0');
          const dates = new Set(newRows.map((row: COTTableRow) => row.date));
          setLoadedDates(dates);
          setHasMoreData(false); // API returns all data at once
        } else {
          setData([]);
          setHasMoreData(false);
        }
      } catch (err) {
        console.error('❌ [COT Table] Initial load error:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
      } finally {
        setLoading(false);
        isLoadingRef.current = false;
      }
    };
    
    loadInitialData();
  }, []); // Empty deps - run only once on mount

  // Watch for dropdown changes and refresh data (only after initial mount)
  useEffect(() => {
    // Skip if not yet initialized or still on initial mount
    if (isInitialMountRef.current || !hasInitializedRef.current) {
      console.log('⏸️ [COT Table] Skipping dropdown change - not yet initialized');
      // Update refs for initial values
      previousInstrumentRef.current = selectedInstrument;
      previousReporterRef.current = selectedReporter;
      return;
    }

    // Skip if currently loading
    if (isLoadingRef.current) {
      console.log('⏸️ [COT Table] Skipping dropdown change - already loading');
      return;
    }

    // Check if dropdown values actually changed from previous values
    if (selectedInstrument === previousInstrumentRef.current && selectedReporter === previousReporterRef.current) {
      console.log('⏸️ [COT Table] Dropdown values unchanged, skipping fetch');
      return;
    }

    console.log('🔄 [COT Table] Dropdown changed, refreshing data:', {
      selectedInstrument,
      selectedReporter,
      previousInstrument: previousInstrumentRef.current,
      previousReporter: previousReporterRef.current
    });

    // Update previous values
    previousInstrumentRef.current = selectedInstrument;
    previousReporterRef.current = selectedReporter;

    // Reset state for new filter
    setData([]);
    setMaxId('0');
    setLoadedDates(new Set());
    setHasMoreData(true);

    // Fetch new data with selected values
    fetchCOTHistoryData(true, selectedInstrument, selectedReporter);
  }, [selectedInstrument, selectedReporter, fetchCOTHistoryData]);

  // Add scroll listener
  useEffect(() => {
    const scrollElement = scrollRef.current;
    if (scrollElement) {
      scrollElement.addEventListener('scroll', handleScroll);
      return () => scrollElement.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  // Helper functions for formatting table data
  const formatNumber = (value: string | number): string => {
    if (value === '' || value === null || value === undefined) return '-';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '-';
    return num.toLocaleString('en-US', { maximumFractionDigits: 0 });
  };

  const formatPercent = (value: string | number): string => {
    if (value === '' || value === null || value === undefined) return '-';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '-';
    return num.toFixed(1) + '%';
  };

  // Get net column class for conditional coloring
  const getNetColumnClass = (value: string | number): string => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '';
    
    if (num < 0) {
      return 'bg-[#ff4d6d]/15 text-[#ff4d6d]'; // Red for negative
    } else if (num > 0) {
      return 'bg-[#06d6a0]/15 text-[#06d6a0]'; // Green for positive
    } else {
      return 'bg-muted/5 text-foreground'; // Neutral for zero
    }
  };

  // Bloomberg-style UI implementation
  return (
    <div className="flex flex-col h-full bg-widget-body border border-border rounded-none overflow-hidden" style={{ minHeight: isStandalone ? '100vh' : '600px' }}>
      {/* WidgetHeader with close button - Copied from Bloomberg mock */}
      <WidgetHeader
        title="COT History Table"
        onRemove={onRemove}
        onFullscreen={onFullscreen}
        helpContent="Displays historical Commitment of Traders (COT) data in a detailed table format. Shows positions, changes, percentages, and trader counts over time."
      >
        {/* Instrument and Reporter Selectors */}
        <div className="flex gap-2 mr-2">
          {/* Instrument Dropdown */}
          <Select value={selectedInstrument} onValueChange={(value) => {
            setSelectedInstrument(value);
            // Save settings - use onSaveSettings if provided (e.g., by TabbedWidget), otherwise use direct API
            const settingsToSave = { symbol: value, owner: mapReporterToAPI(selectedReporter) };
            console.log('📊 [COT Table] Instrument changed:', { value, hasOnSaveSettings: !!onSaveSettings, settingsToSave });
            if (onSaveSettings) {
              console.log('📊 [COT Table] Calling onSaveSettings callback');
              onSaveSettings(settingsToSave);
            } else {
              console.log('📊 [COT Table] Calling saveSettingsToDatabase directly');
              saveSettingsToDatabase(value, selectedReporter);
            }
          }}>
            <SelectTrigger className="h-7 w-[80px] bg-widget-header border-border text-base">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border">
              {INSTRUMENTS.map((instrument) => (
                <SelectItem
                  key={instrument}
                  value={instrument}
                  className="text-base cursor-pointer"
                >
                  {instrument}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Reporter Dropdown */}
          <Select value={selectedReporter} onValueChange={(value) => {
            setSelectedReporter(value);
            // Save settings - use onSaveSettings if provided (e.g., by TabbedWidget), otherwise use direct API
            const settingsToSave = { symbol: selectedInstrument, owner: mapReporterToAPI(value) };
            if (onSaveSettings) {
              onSaveSettings(settingsToSave);
            } else {
              saveSettingsToDatabase(selectedInstrument, value);
            }
          }}>
            <SelectTrigger className="h-7 w-[240px] bg-widget-header border-border text-base">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border">
              {REPORTERS.map((reporter) => (
                <SelectItem
                  key={reporter}
                  value={reporter}
                  className="text-base cursor-pointer"
                >
                  {reporter}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </WidgetHeader>

      {/* Table Container */}
      <div ref={tableRef} className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {/* Loading/Error States */}
        {loading && data.length === 0 && (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
            Loading COT history data...
          </div>
        )}

        {error && (
          <div className="flex-1 flex items-center justify-center text-destructive text-sm">
            Error: {error}
          </div>
        )}

        {!loading && !error && (
          <div ref={scrollRef} className="flex-1 overflow-auto custom-scrollbar">
            <table className="w-full text-lg border-collapse" style={{ minWidth: '1200px' }}>
            {/* Multi-level Headers */}
              <thead className="sticky top-0 bg-widget-header z-10">
                <tr>
                  <th rowSpan={2} className="px-3 pt-3 pb-1 text-center text-muted-foreground whitespace-nowrap">Date</th>
                  <th rowSpan={2} className="px-3 pt-3 pb-1 text-center text-muted-foreground whitespace-nowrap">Open<br/>Interest</th>
                  <th colSpan={8} className="px-3 pt-3 pb-1 text-center text-muted-foreground whitespace-nowrap">Positions</th>
                  <th colSpan={4} className="px-3 pt-3 pb-1 text-center text-muted-foreground whitespace-nowrap">Percent of Open Interest</th>
                  <th colSpan={5} className="px-3 pt-3 pb-1 text-center text-muted-foreground whitespace-nowrap">Number of Traders</th>
              </tr>
                <tr className="border-b-2 border-border">
                {/* Positions sub-headers */}
                  <th className="px-3 py-1 text-center text-muted-foreground whitespace-nowrap border-b border-border">Long</th>
                  <th className="px-3 py-1 text-center text-muted-foreground whitespace-nowrap border-b border-border">Long<br/>Change</th>
                  <th className="px-3 py-1 text-center text-muted-foreground whitespace-nowrap border-b border-border">Short</th>
                  <th className="px-3 py-1 text-center text-muted-foreground whitespace-nowrap border-b border-border">Short<br/>Change</th>
                  <th className="px-3 py-1 text-center text-muted-foreground whitespace-nowrap border-b border-border">Spreading</th>
                  <th className="px-3 py-1 text-center text-muted-foreground whitespace-nowrap border-b border-border">Spreading<br/>Change</th>
                  <th className="px-3 py-1 text-center text-muted-foreground whitespace-nowrap border-b border-border">Total<br/>Position</th>
                  <th className="px-3 py-1 text-center text-muted-foreground whitespace-nowrap border-b-2 border-border bg-muted/10 font-bold">Net<br/>Position</th>
                
                {/* Percent of Open Interest sub-headers */}
                  <th className="px-3 py-1 text-center text-muted-foreground whitespace-nowrap border-b border-border">Long<br/>%</th>
                  <th className="px-3 py-1 text-center text-muted-foreground whitespace-nowrap border-b border-border">Short<br/>%</th>
                  <th className="px-3 py-1 text-center text-muted-foreground whitespace-nowrap border-b border-border">Spreading<br/>%</th>
                  <th className="px-3 py-1 text-center text-muted-foreground whitespace-nowrap border-b-2 border-border bg-muted/10 font-bold">Net<br/>%</th>
                
                {/* Number of Traders sub-headers */}
                  <th className="px-3 py-1 text-center text-muted-foreground whitespace-nowrap border-b border-border">Long<br/>Traders</th>
                  <th className="px-3 py-1 text-center text-muted-foreground whitespace-nowrap border-b border-border">Short<br/>Traders</th>
                  <th className="px-3 py-1 text-center text-muted-foreground whitespace-nowrap border-b border-border">Spreading<br/>Traders</th>
                  <th className="px-3 py-1 text-center text-muted-foreground whitespace-nowrap border-b border-border">Total<br/>Traders</th>
                  <th className="px-3 py-1 text-center text-muted-foreground whitespace-nowrap border-b-2 border-border bg-muted/10 font-bold">Net<br/>Traders</th>
              </tr>
            </thead>
            
            <tbody key={`tbody-${dateFormat}`}>
              {formattedData.length === 0 && !loading ? (
                <tr>
                    <td colSpan={19} className="px-3 py-8 text-center text-muted-foreground">
                    No COT History data available
                  </td>
                </tr>
              ) : (
                formattedData.map((row, index) => (
                    <tr
                      key={`${row.date}-${index}-${dateFormat}`}
                      className={`border-b border-border/30 hover:bg-primary/10 transition-colors ${
                        index % 2 === 0 ? "bg-widget-body" : "bg-muted/10"
                      }`}
                    >
                      <td className={`px-3 py-2 text-center text-foreground whitespace-nowrap ${
                        index % 2 === 0 ? "bg-widget-body" : "bg-muted/10"
                      } hover:bg-primary/10`}>{row.formattedDate}</td>
                      <td className="px-3 py-2 text-center text-foreground">{formatNumber(row.openInterest)}</td>
                    
                    {/* Positions */}
                      <td className="px-3 py-2 text-center text-foreground">{formatNumber(row.positions.long)}</td>
                      <td className="px-3 py-2 text-center text-foreground">{formatNumber(row.positions.longChange)}</td>
                      <td className="px-3 py-2 text-center text-foreground">{formatNumber(row.positions.short)}</td>
                      <td className="px-3 py-2 text-center text-foreground">{formatNumber(row.positions.shortChange)}</td>
                      <td className="px-3 py-2 text-center text-foreground">{formatNumber(row.positions.spreading)}</td>
                      <td className="px-3 py-2 text-center text-foreground">{formatNumber(row.positions.spreadingChange)}</td>
                      <td className="px-3 py-2 text-center text-foreground">{formatNumber(row.positions.totalPosition)}</td>
                      <td className={`px-3 py-2 text-center border-b-2 border-border font-bold ${getNetColumnClass(row.positions.netPosition)} ${index < 2 ? 'font-extrabold text-[19px]' : ''}`}>
                        {formatNumber(row.positions.netPosition)}
                      </td>
                    
                    {/* Percent of Open Interest */}
                      <td className="px-3 py-2 text-center text-foreground">{formatPercent(row.percentOfOpenInterest.long)}</td>
                      <td className="px-3 py-2 text-center text-foreground">{formatPercent(row.percentOfOpenInterest.short)}</td>
                      <td className="px-3 py-2 text-center text-foreground">{formatPercent(row.percentOfOpenInterest.spreading)}</td>
                      <td className={`px-3 py-2 text-center border-b-2 border-border font-bold ${getNetColumnClass(row.percentOfOpenInterest.net)} ${index < 2 ? 'font-extrabold text-[19px]' : ''}`}>
                        {formatPercent(row.percentOfOpenInterest.net)}
                      </td>
                    
                    {/* Number of Traders */}
                      <td className="px-3 py-2 text-center text-foreground">{formatNumber(row.numberOfTraders.long)}</td>
                      <td className="px-3 py-2 text-center text-foreground">{formatNumber(row.numberOfTraders.short)}</td>
                      <td className="px-3 py-2 text-center text-foreground">{formatNumber(row.numberOfTraders.spreading)}</td>
                      <td className="px-3 py-2 text-center text-foreground">{formatNumber(row.numberOfTraders.totalTraders)}</td>
                      <td className={`px-3 py-2 text-center border-b-2 border-border font-bold ${getNetColumnClass(row.numberOfTraders.netTraders)} ${index < 2 ? 'font-extrabold text-[19px]' : ''}`}>
                        {formatNumber(row.numberOfTraders.netTraders)}
                      </td>
                  </tr>
                ))
              )}
              
              {/* Loading indicator for infinite scroll */}
              {loading && data.length > 0 && (
                <tr>
                    <td colSpan={19} className="px-3 py-4 text-center text-muted-foreground">
                    Loading more data...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        )}
      </div>
    </div>
  );
};

export default COTTableViewWidget;