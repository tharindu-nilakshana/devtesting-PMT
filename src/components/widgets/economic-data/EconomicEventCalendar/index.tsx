/* eslint-disable @next/next/no-img-element */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import widgetDataWebSocket from '@/utils/widgetWebSocket';
import { fetchEventCalendarDataFromAPI, EventCalendarRequest, EventCalendarResponse, EventCalendarEvent, processEventCalendarData, groupEventsByDate, EventCalendarConfig } from './api';
import { WidgetHeader } from '@/components/bloomberg-ui/WidgetHeader';
import { ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { getUserTimezoneSync } from '@/utils/systemVariablesClient';
import '@/styles/economic-data/EventCalendarWidget/styles/dark.scss';

// Function to convert country codes to ISO 2-letter codes for flag images
function getCountryCode(countryCode?: string): string {
  if (!countryCode) return 'xx';
  
  // Map common country codes to ISO 2-letter codes
  const countryMap: Record<string, string> = {
    'US': 'us',
    'JP': 'jp', 
    'DE': 'de',
    'GB': 'gb',
    'CN': 'cn',
    'AU': 'au',
    'CA': 'ca',
    'CH': 'ch',
    'NZ': 'nz',
    'FR': 'fr',
    'IT': 'it',
    'ES': 'es',
    'NL': 'nl',
    'SE': 'se',
    'NO': 'no',
    'DK': 'dk',
    'FI': 'fi',
    'PL': 'pl',
    'CZ': 'cz',
    'HU': 'hu',
    'RU': 'ru',
    'IN': 'in',
    'KR': 'kr',
    'SG': 'sg',
    'MY': 'my',
    'TH': 'th',
    'ID': 'id',
    'PH': 'ph',
    'VN': 'vn',
    'BR': 'br',
    'MX': 'mx',
    'AR': 'ar',
    'CL': 'cl',
    'CO': 'co',
    'PE': 'pe',
    'ZA': 'za',
    'EG': 'eg',
    'NG': 'ng',
    'KE': 'ke',
    'MA': 'ma',
    'TR': 'tr',
    'IL': 'il',
    'AE': 'ae',
    'SA': 'sa',
    'KW': 'kw',
    'QA': 'qa',
    'BH': 'bh',
    'OM': 'om',
    'JO': 'jo',
    'LB': 'lb',
    'PK': 'pk',
    'BD': 'bd',
    'LK': 'lk',
    'MM': 'mm',
    'KH': 'kh',
    'LA': 'la',
    'MN': 'mn',
    'KZ': 'kz',
    'UZ': 'uz',
    'KG': 'kg',
    'TJ': 'tj',
    'TM': 'tm',
    'AF': 'af',
    'IR': 'ir',
    'IQ': 'iq',
    'SY': 'sy',
    'YE': 'ye',
    'ET': 'et',
    'UG': 'ug',
    'TZ': 'tz',
    'GH': 'gh',
    'CI': 'ci',
    'SN': 'sn',
    'ML': 'ml',
    'BF': 'bf',
    'NE': 'ne',
    'TD': 'td',
    'SD': 'sd',
    'ER': 'er',
    'DJ': 'dj',
    'SO': 'so',
    'CM': 'cm',
    'CF': 'cf',
    'CG': 'cg',
    'CD': 'cd',
    'AO': 'ao',
    'ZM': 'zm',
    'ZW': 'zw',
    'BW': 'bw',
    'NA': 'na',
    'SZ': 'sz',
    'LS': 'ls',
    'MG': 'mg',
    'MU': 'mu',
    'SC': 'sc',
    'KM': 'km',
    'YT': 'yt',
    'RE': 're',
    'MZ': 'mz',
    'MW': 'mw',
    'BI': 'bi',
    'RW': 'rw',
    'SS': 'ss'
  };
  
  return countryMap[countryCode.toUpperCase()] || countryCode.toLowerCase();
}

// Function to get emoji flags as fallback
function getEmojiFlag(countryCode?: string): string {
  if (!countryCode) return '🏳️';
  
  const emojiMap: Record<string, string> = {
    'US': '🇺🇸',
    'JP': '🇯🇵',
    'DE': '🇩🇪',
    'GB': '🇬🇧',
    'CN': '🇨🇳',
    'AU': '🇦🇺',
    'CA': '🇨🇦',
    'CH': '🇨🇭',
    'NZ': '🇳🇿',
    'FR': '🇫🇷',
    'IT': '🇮🇹',
    'ES': '🇪🇸',
    'NL': '🇳🇱',
    'SE': '🇸🇪',
    'NO': '🇳🇴',
    'DK': '🇩🇰',
    'FI': '🇫🇮',
    'PL': '🇵🇱',
    'CZ': '🇨🇿',
    'HU': '🇭🇺',
    'RU': '🇷🇺',
    'IN': '🇮🇳',
    'KR': '🇰🇷',
    'SG': '🇸🇬',
    'MY': '🇲🇾',
    'TH': '🇹🇭',
    'ID': '🇮🇩',
    'PH': '🇵🇭',
    'VN': '🇻🇳',
    'BR': '🇧🇷',
    'MX': '🇲🇽',
    'AR': '🇦🇷',
    'CL': '🇨🇱',
    'CO': '🇨🇴',
    'PE': '🇵🇪',
    'ZA': '🇿🇦',
    'EG': '🇪🇬',
    'NG': '🇳🇬',
    'KE': '🇰🇪',
    'MA': '🇲🇦',
    'TR': '🇹🇷',
    'IL': '🇮🇱',
    'AE': '🇦🇪',
    'SA': '🇸🇦',
    'KW': '🇰🇼',
    'QA': '🇶🇦',
    'BH': '🇧🇭',
    'OM': '🇴🇲',
    'JO': '🇯🇴',
    'LB': '🇱🇧',
    'PK': '🇵🇰',
    'BD': '🇧🇩',
    'LK': '🇱🇰',
    'MM': '🇲🇲',
    'KH': '🇰🇭',
    'LA': '🇱🇦',
    'MN': '🇲🇳',
    'KZ': '🇰🇿',
    'UZ': '🇺🇿',
    'KG': '🇰🇬',
    'TJ': '🇹🇯',
    'TM': '🇹🇲',
    'AF': '🇦🇫',
    'IR': '🇮🇷',
    'IQ': '🇮🇶',
    'SY': '🇸🇾',
    'YE': '🇾🇪',
    'ET': '🇪🇹',
    'UG': '🇺🇬',
    'TZ': '🇹🇿',
    'GH': '🇬🇭',
    'CI': '🇨🇮',
    'SN': '🇸🇳',
    'ML': '🇲🇱',
    'BF': '🇧🇫',
    'NE': '🇳🇪',
    'TD': '🇹🇩',
    'SD': '🇸🇩',
    'ER': '🇪🇷',
    'DJ': '🇩🇯',
    'SO': '🇸🇴',
    'CM': '🇨🇲',
    'CF': '🇨🇫',
    'CG': '🇨🇬',
    'CD': '🇨🇩',
    'AO': '🇦🇴',
    'ZM': '🇿🇲',
    'ZW': '🇿🇼',
    'BW': '🇧🇼',
    'NA': '🇳🇦',
    'SZ': '🇸🇿',
    'LS': '🇱🇸',
    'MG': '🇲🇬',
    'MU': '🇲🇺',
    'SC': '🇸🇨',
    'KM': '🇰🇲',
    'YT': '🇾🇹',
    'RE': '🇷🇪',
    'MZ': '🇲🇿',
    'MW': '🇲🇼',
    'BI': '🇧🇮',
    'RW': '🇷🇼',
    'SS': '🇸🇸'
  };
  
  return emojiMap[countryCode.toUpperCase()] || '🏳️';
}

interface EventCalendarWidgetProps {
  wgid: string;
  wght?: number;
  additionalSettings?: string;
  templateName?: string;
  initialData?: any;
  isStandalone?: boolean; // New prop to indicate if it's standalone or in dashboard
  onRemove?: () => void; // Close button functionality
  onSettings?: () => void; // Settings button functionality
  onFullscreen?: () => void; // Fullscreen functionality
  settings?: any; // Widget settings from settings slide-in
}

export default function EventCalendarWidget({
  wgid,
  additionalSettings = '',
  templateName = 'Default',
  initialData,
  isStandalone = false,
  onRemove,
  onSettings,
  onFullscreen,
  settings = {}
}: EventCalendarWidgetProps) {
  const [rawEvents, setRawEvents] = useState<EventCalendarEvent[]>([]);
  const [events, setEvents] = useState<EventCalendarEvent[]>([]);
  const [groupedEvents, setGroupedEvents] = useState<Record<string, EventCalendarEvent[]>>({});
  const [subtitle, setSubtitle] = useState<string>("[--/--/---- - --/--/---- | Vertical]");
  const [flashingKeys, setFlashingKeys] = useState<Set<string>>(new Set());
  const flashTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const [loading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentSymbol, setCurrentSymbol] = useState<string>('ALL');
  const [config, setConfig] = useState<EventCalendarConfig | null>(null);
  
  // Refs to track fetch state and prevent duplicate API calls
  const isFetchingRef = useRef(false);
  const hasFetchedInitialDataRef = useRef(false);
  const configRef = useRef<EventCalendarConfig | null>(null);
  const prevSettingsRef = useRef<string>('');
  const [isWidgetSelectorOpen, setIsWidgetSelectorOpen] = useState(false);
  const tableRef = useRef<HTMLTableElement>(null);
  const horizontalScrollRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const [userTimezone, setUserTimezone] = useState<string>(getUserTimezoneSync);
  
  // Bloomberg-style filter state
  const [selectedImpact, setSelectedImpact] = useState<"all" | "high" | "medium" | "low">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedEventKey, setExpandedEventKey] = useState<string | null>(null);
  const [activeSpecsTab, setActiveSpecsTab] = useState<"Description" | "Impact" | "Frequency" | "Source">("Description");
  const [activeViewTab, setActiveViewTab] = useState<"Chart" | "Table">("Chart");
  const [chartTimeframe, setChartTimeframe] = useState<"1Y" | "2Y" | "3Y" | "5Y" | "10Y" | "All">("All");
  
  // Horizontal scroll state
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  
  // Responsive breakpoints based on container width
  const isVeryNarrow = containerWidth > 0 && containerWidth < 900;
  const isNarrow = containerWidth > 0 && containerWidth < 1200;
  const isMedium = containerWidth > 0 && containerWidth < 1400;
  
  // Progressive text adjustments
  const currencyLabel = isVeryNarrow ? "Curr" : isNarrow ? "Curr." : "Currency";
  const countryLabel = isVeryNarrow ? "Ctry" : isNarrow ? "Cntry" : "Country";
  const fontSize = isVeryNarrow ? "9px" : isNarrow ? "10px" : "10px";
  
  // ResizeObserver to track container width for responsive behavior
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);
  
  // Listen for widget selector state changes to pause refresh cycles
  useEffect(() => {
    const handleWidgetSelectorStateChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ isOpen: boolean }>;
      setIsWidgetSelectorOpen(customEvent.detail.isOpen);
    };

    window.addEventListener('widget-selector-state-change', handleWidgetSelectorStateChange);
    return () => {
      window.removeEventListener('widget-selector-state-change', handleWidgetSelectorStateChange);
    };
  }, []);

  // Listen for timezone changes from profile settings
  useEffect(() => {
    const handleTimezoneChange = (event: CustomEvent) => {
      const { timezoneName } = event.detail;
      if (timezoneName) {
        setUserTimezone(timezoneName);
        // Refresh events with new timezone
        const fetchData = async () => {
          try {
            const response = await fetchEventCalendarDataFromAPI({
              current_time: new Date().toISOString(),
              timezone: timezoneName
            });
            if (response?.events) {
              const processedEvents = processEventCalendarData(response);
              setRawEvents(processedEvents);
            }
          } catch (error) {
            console.error('Error refreshing events after timezone change:', error);
          }
        };
        fetchData();
      }
    };

    window.addEventListener('timezoneChanged', handleTimezoneChange as EventListener);
    return () => window.removeEventListener('timezoneChanged', handleTimezoneChange as EventListener);
  }, []);

  // Helper function to format date as DD/MM/YYYY (for settings)
  const formatDateForSettings = (date: Date): string => {
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };

  // Helper function to get date range from settings
  const getDateRangeFromSettings = (): string => {
    const dateRangeType = settings?.dateRangeType || 'thisWeek';
    const customStartDate = settings?.customStartDate || '';
    const customEndDate = settings?.customEndDate || '';

    if (dateRangeType === 'custom' && customStartDate && customEndDate) {
      return `${customStartDate} - ${customEndDate}`;
    }

    if (dateRangeType === 'today') {
      const today = new Date();
      const todayStr = formatDateForSettings(today);
      return `${todayStr} - ${todayStr}`;
    }

    if (dateRangeType === 'thisWeek') {
      const today = new Date();
      const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - dayOfWeek); // Go to Sunday
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6); // Go to Saturday
      return `${formatDateForSettings(startOfWeek)} - ${formatDateForSettings(endOfWeek)}`;
    }

    if (dateRangeType === 'lastWeek') {
      const today = new Date();
      const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
      const startOfLastWeek = new Date(today);
      startOfLastWeek.setDate(today.getDate() - dayOfWeek - 7); // Go to last Sunday
      const endOfLastWeek = new Date(startOfLastWeek);
      endOfLastWeek.setDate(startOfLastWeek.getDate() + 6); // Go to last Saturday
      return `${formatDateForSettings(startOfLastWeek)} - ${formatDateForSettings(endOfLastWeek)}`;
    }

    if (dateRangeType === 'thisMonth') {
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      return `${formatDateForSettings(startOfMonth)} - ${formatDateForSettings(endOfMonth)}`;
    }

    // Default to "this week"
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - dayOfWeek); // Go to Sunday
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6); // Go to Saturday
    return `${formatDateForSettings(startOfWeek)} - ${formatDateForSettings(endOfWeek)}`;
  };

  // Auto-update logic for "This Week" when autoUpdate is enabled
  useEffect(() => {
    const dateRangeType = settings?.dateRangeType;
    const autoUpdate = settings?.autoUpdate;

    if (autoUpdate && dateRangeType === 'thisWeek') {
      // Update dates to current week when auto-update is enabled
      const today = new Date();
      const dayOfWeek = today.getDay();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - dayOfWeek);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);

      // Only update if dates have changed
      const newStart = formatDateForSettings(startOfWeek);
      const newEnd = formatDateForSettings(endOfWeek);
      
      if (settings?.customStartDate !== newStart || settings?.customEndDate !== newEnd) {
        // This will trigger a re-render, but we can't directly update settings here
        // The settings should be updated by the parent component
        // For now, we'll rely on the getDateRangeFromSettings function to calculate it dynamically
      }
    }
  }, [settings?.autoUpdate, settings?.dateRangeType]);

  // Parse additional settings and immediately set config
  useEffect(() => {
    // Create a serialized version of relevant settings for comparison
    const settingsKey = JSON.stringify({
      orientation: settings?.orientation,
      dateRangeType: settings?.dateRangeType,
      customStartDate: settings?.customStartDate,
      customEndDate: settings?.customEndDate,
      autoUpdate: settings?.autoUpdate,
      currency: settings?.currency
    });
    
    // Check if this is a settings change (not initial load)
    const isSettingsChange = prevSettingsRef.current !== '' && prevSettingsRef.current !== settingsKey && config !== null;
    
    // Skip if settings haven't actually changed (deep comparison)
    if (prevSettingsRef.current === settingsKey && config !== null) {
      return;
    }
    prevSettingsRef.current = settingsKey;
    
    // Always create a default config to ensure the widget works
    try {
      let symbols = ['USD', 'EUR', 'JPY', 'GBP'];
      let dateRange = getDateRangeFromSettings();
      let eventOrientation: 'horizontal' | 'vertical' = 'vertical';
      let autoUpdateSettings = { 
        enabled: settings?.autoUpdate ?? false, 
        interval: 30000 
      };

      // Use orientation from settings if available, otherwise from additionalSettings
      if (settings?.orientation) {
        eventOrientation = settings.orientation;
      } else if (additionalSettings) {
        const parts = additionalSettings.split('|');
        symbols = parts[0] ? parts[0].split(',') : symbols;
        // Only use additionalSettings dateRange if settings don't have dateRangeType
        if (!settings?.dateRangeType) {
          dateRange = parts[1] || dateRange;
        }
        eventOrientation = (parts[2] as 'horizontal' | 'vertical') || eventOrientation;
        if (!settings?.autoUpdate) {
          autoUpdateSettings = parts[3] ? JSON.parse(parts[3]) : autoUpdateSettings;
        }
      }

      const newConfig = {
        symbols,
        dateRange,
        eventOrientation,
        autoUpdateSettings,
        templateName,
        wgid,
        isSpecialWidget: wgid === '221684'
      };

      console.log('📅 [EventCalendarWidget] Setting config:', newConfig);
      configRef.current = newConfig;
      setConfig(newConfig);

      // Set initial symbol to ALL to show all events
      setCurrentSymbol('ALL');

      // If this is a settings change (not initial load), reset fetch flag and trigger refetch
      if (isSettingsChange) {
        console.log('📅 [EventCalendarWidget] Settings changed, triggering data refetch');
        hasFetchedInitialDataRef.current = false;
        // The refetch will be triggered by the next useEffect that depends on config
      }

    } catch (error) {
      console.error('❌ [EventCalendarWidget] Error parsing config:', error);
      setError('Invalid configuration');
    }
  }, [additionalSettings, templateName, wgid, settings, config]);

  // Process event data
  const processEventData = useCallback((data: any) => {
    // Use ref for config to avoid dependency on config object
    const currentConfig = configRef.current;
    
    console.log('📅 [EventCalendarWidget] Processing data:', {
      hasEvents: !!data.events,
      hasInvestingNews: !!data.InvestingNews,
      eventCount: data.events?.length || data.InvestingNews?.length || 0,
      dataKeys: Object.keys(data),
      sampleEvent: data.events?.[0] || data.InvestingNews?.[0]
    });

    // Handle both formats: legacy InvestingNews and new events format
    const eventData: any = {
      events: data.InvestingNews || data.events || [],
      current_time: data.current_time || new Date().toISOString(),
      timezone: data.timezone || userTimezone
    };

    console.log('📅 [EventCalendarWidget] Created eventData:', {
      eventsCount: eventData.events.length,
      sampleEvent: eventData.events[0]
    });

    // Store raw events
    setRawEvents(eventData.events);
    
    // Process events with current symbol
    const processedEvents = processEventCalendarData(eventData, currentConfig, currentSymbol);
    setEvents(processedEvents);
    
    const grouped = groupEventsByDate(processedEvents);
    setGroupedEvents(grouped);
    // Update subtitle to reflect effective API date range if provided
    try {
      const dr = data?.date_range;
      const first = dr?.firstDate;
      const second = dr?.secondDate;
      const orientation = (currentConfig?.eventOrientation || 'vertical');
      if (first && second) {
        setSubtitle(`[${first} - ${second} | ${orientation.charAt(0).toUpperCase()+orientation.slice(1)}]`);
      } else {
        // Fallback: derive from processed events
        const dates = Object.keys(grouped);
        if (dates.length > 0) {
          const start = dates[0];
          const end = dates[dates.length - 1];
          setSubtitle(`[${start} - ${end} | ${orientation.charAt(0).toUpperCase()+orientation.slice(1)}]`);
        }
      }
    } catch {}
    
    console.log('📅 [EventCalendarWidget] Processed events:', {
      total: processedEvents.length,
      groupedDates: Object.keys(grouped).length
    });
    
    // Auto-scroll disabled - user requested no automatic scrolling
  }, [currentSymbol, userTimezone]);

  // Fetch event calendar data
  const fetchEventCalendarData = useCallback(async () => {
    // Use ref for config to avoid dependency on config object
    const currentConfig = configRef.current;
    
    console.log('📅 [EventCalendarWidget] fetchEventCalendarData called:', {
      hasInitialData: !!initialData,
      initialDataKeys: initialData ? Object.keys(initialData) : [],
      eventsCount: initialData?.events?.length || 0,
      isWidgetSelectorOpen,
      isFetching: isFetchingRef.current
    });
    
    // Prevent duplicate fetches
    if (isFetchingRef.current) {
      console.log('📅 [EventCalendarWidget] Already fetching, skipping duplicate request');
      return;
    }
    
    // Pause data fetching when widget selector is open
    if (isWidgetSelectorOpen) {
      console.log('📅 [EventCalendarWidget] Widget selector is open, pausing data fetch');
      return;
    }
    
    if (initialData) {
      processEventData(initialData);
      return;
    }

    if (!currentConfig) {
      console.log('📅 [EventCalendarWidget] Config not ready yet');
      return;
    }

    // Skip loading state for dummy data - it's instant
    setError(null);
    isFetchingRef.current = true;

    try {
      const request: EventCalendarRequest = {
        symbols: currentConfig.symbols,
        dateRange: currentConfig.dateRange,
        eventOrientation: currentConfig.eventOrientation,
        autoUpdateSettings: currentConfig.autoUpdateSettings,
        templateName: currentConfig.templateName,
        wgid: currentConfig.wgid,
        isSpecialWidget: currentConfig.isSpecialWidget
      };

      const result: EventCalendarResponse = await fetchEventCalendarDataFromAPI(request);
      
      console.log('📅 [EventCalendarWidget] API Result:', {
        success: result.success,
        hasData: !!result.data,
        eventCount: result.data?.events?.length || result.data?.InvestingNews?.length || 0,
        isFallbackData: result.isFallbackData
      });
      
      if (result.success) {
        processEventData(result.data);
      } else if (result.isAborted) {
        // Request was aborted - this is expected when component unmounts or re-renders
        console.log('📅 [EventCalendarWidget] Request was aborted (expected during navigation/re-render)');
        return;
      } else {
        throw new Error(result.error || 'Failed to fetch event calendar data');
      }
    } catch (err) {
      // Handle aborted requests silently - this is expected when component unmounts or re-renders
      if (err instanceof Error && (err.name === 'AbortError' || err.message === 'The user aborted a request.' || err.message === 'Request aborted')) {
        console.log('📅 [EventCalendarWidget] Request was aborted (expected during navigation/re-render)');
        return;
      }
      console.error('Error fetching event calendar data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      isFetchingRef.current = false;
    }
  }, [initialData, isWidgetSelectorOpen, processEventData]);

  // Auto-scroll to next event

  // Initial data fetch - runs when config is ready or when settings change
  useEffect(() => {
    console.log('📅 [EventCalendarWidget] Data fetch useEffect triggered:', {
      hasConfig: !!config,
      configSymbols: config?.symbols,
      hasInitialData: !!initialData,
      hasFetchedInitial: hasFetchedInitialDataRef.current
    });
    
    // Skip if we've already fetched initial data (unless reset by settings change)
    if (hasFetchedInitialDataRef.current) {
      return;
    }
    
    if (config && !initialData) {
      console.log('📅 [EventCalendarWidget] Calling fetchEventCalendarData...');
      hasFetchedInitialDataRef.current = true;
      fetchEventCalendarData();
    } else if (initialData) {
      console.log('📅 [EventCalendarWidget] Using initialData...');
      hasFetchedInitialDataRef.current = true;
      processEventData(initialData);
    }
  }, [config, fetchEventCalendarData, initialData, processEventData]);

  // Force data fetch removed - no delay needed for dummy data

  // Re-process data when currentSymbol changes
  useEffect(() => {
    const currentConfig = configRef.current;
    if (rawEvents.length > 0 && currentConfig) {
      console.log('📅 [EventCalendarWidget] Re-processing data for currency change:', currentSymbol);
      const eventData = {
        events: rawEvents,
        InvestingNews: [], // Empty fallback news data
        current_time: new Date().toISOString(),
        timezone: userTimezone
      };
      
      const processedEvents = processEventCalendarData(eventData, currentConfig, currentSymbol);
      setEvents(processedEvents);
      
      const grouped = groupEventsByDate(processedEvents);
      setGroupedEvents(grouped);
      
      console.log('📅 [EventCalendarWidget] Re-processed events:', {
        total: processedEvents.length,
        groupedDates: Object.keys(grouped).length
      });
    }
  }, [currentSymbol, rawEvents, userTimezone]);

  // Update subtitle when orientation changes
  useEffect(() => {
    if (!config?.eventOrientation) return;
    
    // Update subtitle with current date range and orientation
    const dates = Object.keys(groupedEvents);
    if (dates.length > 0) {
      const start = dates[0];
      const end = dates[dates.length - 1];
      const orientation = config.eventOrientation;
      setSubtitle(`[${start} - ${end} | ${orientation.charAt(0).toUpperCase()+orientation.slice(1)}]`);
    }
  }, [config?.eventOrientation, groupedEvents]);

  // Auto-update functionality
  useEffect(() => {
    const currentConfig = configRef.current;
    if (!currentConfig?.autoUpdateSettings?.enabled) return;

    const interval = setInterval(() => {
      // Don't auto-update when widget selector is open
      if (isWidgetSelectorOpen) {
        console.log('📅 [EventCalendarWidget] Auto-update paused - widget selector is open');
        return;
      }
      fetchEventCalendarData();
    }, currentConfig.autoUpdateSettings.interval);

    return () => clearInterval(interval);
  }, [config?.autoUpdateSettings?.enabled, config?.autoUpdateSettings?.interval, fetchEventCalendarData, isWidgetSelectorOpen]);

  // Helper to apply notifications-style updates locally and trigger flash
  const applyNotifications = useCallback((updates: any[]) => {
    if (!Array.isArray(updates) || updates.length === 0) return;
    setRawEvents(prevRaw => {
      const nextRaw = [...prevRaw];
      const normalizeCountry = (c?: string) => (c || '').replaceAll('_', ' ');
      const updatesApplied: string[] = [];

      for (const u of updates) {
        const title = String(u.event_title || '').trim();
        const currency = String(u.event_currency || '').trim();
        const country = normalizeCountry(u.event_country);
        if (!title || !currency) continue;

        const idx = nextRaw.findIndex(ev =>
          String(ev.Event).trim() === title &&
          String(ev.Currency).trim() === currency &&
          normalizeCountry(ev.Country) === country
        );
        if (idx >= 0) {
          const ev = nextRaw[idx];
          const patched: EventCalendarEvent = {
            ...ev,
            Actual: (u.event_actual ?? ev.Actual) || ev.Actual,
            Forecast: (u.event_forecast ?? ev.Forecast) || ev.Forecast,
            Previous: (u.event_previous ?? ev.Previous) || ev.Previous,
            High: (u.event_high ?? ev.High) || ev.High,
            Low: (u.event_low ?? ev.Low) || ev.Low,
          };
          nextRaw[idx] = patched;

          const key = `${patched.NewsDay}|${patched.NewsTime}|${patched.Event}|${patched.Currency}`;
          updatesApplied.push(key);
        }
      }

      if (updatesApplied.length > 0) {
        setFlashingKeys(prev => {
          const next = new Set(prev);
          for (const k of updatesApplied) {
            next.add(k);
            if (flashTimersRef.current[k]) clearTimeout(flashTimersRef.current[k]);
            flashTimersRef.current[k] = setTimeout(() => {
              setFlashingKeys(p => {
                const n = new Set(p);
                n.delete(k);
                return n;
              });
            }, 3000);
          }
          return next;
        });
      }

      // Recompute processed/grouped after raw update using updated array
      const eventData = {
        events: nextRaw,
        InvestingNews: [],
        current_time: new Date().toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      } as any;
      const processed = processEventCalendarData(eventData, configRef.current, currentSymbol);
      setEvents(processed);
      setGroupedEvents(groupEventsByDate(processed));

      return nextRaw;
    });
  }, [currentSymbol]);

  // WebSocket subscription: listen for 'event_calendar' keyword and trigger action
  const handleEventCalendarTrigger = useCallback(() => {
    if (isWidgetSelectorOpen) return;
    // Fetch notifications and patch rows
    const patchFromNotifications = async () => {
      try {
        const resp = await fetch('/api/economic-data/event-notifications', { method: 'POST' });
        if (!resp.ok) return;
        const result = await resp.json();
        const payload = result?.data;

        // Extract array of updates
        const updates: any[] = Array.isArray(payload)
          ? payload
          : (payload?.notifications || payload?.events || payload?.data || payload?.Items || payload?.items || []);
        applyNotifications(updates);

        // processed/grouped recomputed above

      } catch (e) {
        console.error('Failed to fetch notifications:', e);
      }
    };
    patchFromNotifications();
  }, [applyNotifications, isWidgetSelectorOpen]);


  // WebSocket connection - only set up once, not on every config change
  useEffect(() => {
    // Client-side only
    if (typeof window === 'undefined') return;

    let isMounted = true;

    const onWidgetUpdate = (widgetName: string) => {
      if (!isMounted) return;
      try {
        const key = String(widgetName || '').toLowerCase();
        console.log('📨 [EventCalendar] WS update:', widgetName);
        if (key.includes('event_calendar') || key === 'event_calendar') {
          console.log('✅ [EventCalendar] Matched WS key: event_calendar → triggering fetch');
          handleEventCalendarTrigger();
        }
      } catch {}
    };

    const onDetailed = (evt: Event) => {
      if (!isMounted) return;
      try {
        const detail = (evt as CustomEvent).detail || {};
        const name = String(detail.widgetName || '').toLowerCase();
        console.log('📨 [EventCalendar] window event pmt-widget-data:', detail);
        if (name.includes('event_calendar') || name === 'event_calendar') {
          console.log('✅ [EventCalendar] Matched window event key: event_calendar → triggering fetch');
          handleEventCalendarTrigger();
        }
      } catch {}
    };

    // Register callbacks - update callback if it changes, but don't reconnect
    widgetDataWebSocket.onWidgetUpdate(onWidgetUpdate);
    widgetDataWebSocket.onConnectionStatus(() => {});
    window.addEventListener('pmt-widget-data', onDetailed);
    
    // Only connect if not already connected
    if (!widgetDataWebSocket.isConnected()) {
      const connectionStatus = widgetDataWebSocket.getConnectionStatus();
      if (connectionStatus !== 'connected' && connectionStatus !== 'connecting') {
        console.log('🔗 [EventCalendar] Subscribing to widget WebSocket (event_calendar)');
        widgetDataWebSocket.connect().then(() => {
          if (isMounted) {
            console.log('✅ [EventCalendar] WebSocket connected');
          }
        }).catch((e) => {
          if (isMounted) {
            console.warn('❌ [EventCalendar] WebSocket connect failed', e);
          }
        });
      } else {
        console.log('⏸️ [EventCalendar] WebSocket connection in progress, skipping');
      }
    } else {
      console.log('✅ [EventCalendar] WebSocket already connected, skipping reconnect');
    }

    return () => {
      isMounted = false;
      window.removeEventListener('pmt-widget-data', onDetailed);
      // Don't disconnect WebSocket here - it's shared across widgets
      // Just remove the callback
      widgetDataWebSocket.onWidgetUpdate(() => {});
    };
  }, [handleEventCalendarTrigger]);

  // Bloomberg-style impact indicator
  const getImpactIndicator = (impact: string) => {
    const impactNum = parseInt(impact);
    const circles = impactNum === 3 ? 3 : impactNum === 2 ? 2 : 1;
    return (
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className={`w-1.5 h-1.5 rounded-full ${
              i < circles ? "bg-foreground" : "bg-muted-foreground/30"
            }`}
          />
        ))}
      </div>
    );
  };

  // Get currency filter from settings (default to "all")
  const selectedCurrency = (settings?.currency as string) || "all";

  // Bloomberg-style filtering logic
  const filteredEvents = events.filter(event => {
    const impactMatch = selectedImpact === "all" || 
      (selectedImpact === "high" && parseInt(event.Impact) === 3) ||
      (selectedImpact === "medium" && parseInt(event.Impact) === 2) ||
      (selectedImpact === "low" && parseInt(event.Impact) === 1);
    const currencyMatch = selectedCurrency === "all" || event.Currency === selectedCurrency;
    const searchMatch = searchQuery === "" || 
      event.Event.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.Country.toLowerCase().includes(searchQuery.toLowerCase());
    return impactMatch && currencyMatch && searchMatch;
  });

  // Format date to match original design
  const formatDate = (dateStr: string) => {
    const [day, month, year] = dateStr.split('/');
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  // Get country flag URL
  const getCountryFlagUrl = (countryCode: string) => {
    return `/assets/img/logos/Event/${countryCode}.svg`;
  };

  // Get impact level icons - show multiple globes based on impact level
  const getImpactIcons = (impact: string) => {
    const impactNum = parseInt(impact);
    const icons = [];
    
    for (let i = 0; i < impactNum; i++) {
      icons.push(
        <i key={i} className="fas fa-globe" style={{ color: '#ffffff', marginRight: '2px' }}></i>
      );
    }
    
    return icons;
  };

  // Negative number styling helpers
  const isNegative = (val?: string | null) => {
    if (!val) return false;
    const s = String(val).trim();
    return s.startsWith('-');
  };

  const valueClass = (val?: string | null) =>
    isNegative(val) ? 'text-red-500' : 'text-foreground';

  if (loading) {
    return (
      <div className="event-calendar-widget">
        <div className="loading">Loading events...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="event-calendar-widget">
        <div className="error">Error: {error}</div>
      </div>
    );
  }

  // Group filtered events by date
  const groupedFilteredEvents = filteredEvents.reduce((acc, event) => {
    if (!acc[event.NewsDay]) {
      acc[event.NewsDay] = [];
    }
    acc[event.NewsDay].push(event);
    return acc;
  }, {} as Record<string, EventCalendarEvent[]>);

  // Horizontal scroll functions
  const scrollLeft = () => {
    if (horizontalScrollRef.current) {
      horizontalScrollRef.current.scrollBy({ left: -300, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (horizontalScrollRef.current) {
      horizontalScrollRef.current.scrollBy({ left: 300, behavior: 'smooth' });
    }
  };

  // Check horizontal scroll position
  useEffect(() => {
    const handleScroll = () => {
      if (!horizontalScrollRef.current) return;
      
      const { scrollLeft, scrollWidth, clientWidth } = horizontalScrollRef.current;
      setCanScrollLeft(scrollLeft > 10);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    };

    const container = horizontalScrollRef.current;
    if (container && config?.eventOrientation === 'horizontal') {
      handleScroll(); // Initial check
      container.addEventListener('scroll', handleScroll);
      
      // Also check on resize
      const resizeObserver = new ResizeObserver(() => {
        requestAnimationFrame(handleScroll);
      });
      resizeObserver.observe(container);
      
      return () => {
        container.removeEventListener('scroll', handleScroll);
        resizeObserver.disconnect();
      };
    }
  }, [config?.eventOrientation, groupedFilteredEvents]);

  return (
    <div ref={containerRef} className="w-full h-full bg-widget-body border border-border rounded-none flex flex-col overflow-hidden">
      {/* Header - Bloomberg Style */}
      <WidgetHeader
        title="Economic Calendar"
        subtitle={subtitle}
        onSettings={onSettings}
        onRemove={onRemove}
        onFullscreen={onFullscreen}
        helpContent="Today's economic events and data releases with impact ratings. Shows actual vs. forecast vs. previous values. High-impact events (3 circles) can cause significant market volatility. Filter by impact level or currency to focus on specific events."
      />

      {/* Filters - Bloomberg Style */}
      <div className="border-b border-border bg-widget-header px-3 py-1.5 flex items-center gap-3">
        {/* Impact Filter */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setSelectedImpact("all")}
            className={`px-2 py-0.5 rounded text-sm transition-colors ${
              selectedImpact === "all"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setSelectedImpact("high")}
            className={`px-2 py-0.5 rounded text-sm transition-colors flex items-center gap-1 ${
              selectedImpact === "high"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            High
          </button>
          <button
            onClick={() => setSelectedImpact("medium")}
            className={`px-2 py-0.5 rounded text-sm transition-colors ${
              selectedImpact === "medium"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Med
          </button>
          <button 
            onClick={() => setSelectedImpact("low")}
            className={`px-2 py-0.5 rounded text-sm transition-colors ${
              selectedImpact === "low"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Low
          </button>
        </div>

        <div className="w-px h-3 bg-border"></div>

        {/* Search Field */}
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search events..."
          className="px-2 py-0.5 rounded text-sm bg-transparent border border-border text-foreground placeholder:text-muted-foreground hover:bg-muted/50 focus:bg-muted/50 transition-colors outline-none focus:border-primary w-[340px]"
        />

        {/* Live status */}
        <div className="ml-auto flex items-center gap-2">
          <div
            className="px-2 py-0.5 rounded text-xs font-medium border inline-flex items-center gap-1 text-green-500 border-green-600/40 bg-green-500/10"
            title="WebSocket live updates active"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
            LIVE
          </div>
        </div>
      </div>

      {/* Calendar Content - Vertical Layout */}
      {(!config?.eventOrientation || config?.eventOrientation === 'vertical') && (
        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-widget-header border-b border-border z-10">
              <tr>
                <th className="text-left px-2 py-1.5 text-muted-foreground uppercase tracking-wide" style={{ fontSize }}>Time</th>
                <th className="text-center px-1 py-1.5 text-muted-foreground uppercase tracking-wide" style={{ fontSize }}>{countryLabel}</th>
                <th className="text-left px-2 py-1.5 text-muted-foreground uppercase tracking-wide" style={{ fontSize }}>{currencyLabel}</th>
                <th className="text-center px-2 py-1.5 text-muted-foreground uppercase tracking-wide" style={{ fontSize }}>Impact</th>
                <th className="text-left px-2 py-1.5 text-muted-foreground uppercase tracking-wide" style={{ fontSize }}>Event</th>
                <th className="text-right px-2 py-1.5 text-muted-foreground uppercase tracking-wide whitespace-nowrap" style={{ fontSize }}>Actual</th>
                <th className="text-right px-2 py-1.5 text-muted-foreground uppercase tracking-wide whitespace-nowrap" style={{ fontSize }}>High</th>
                <th className="text-right px-2 py-1.5 text-muted-foreground uppercase tracking-wide whitespace-nowrap" style={{ fontSize }}>Forecast</th>
                <th className="text-right px-2 py-1.5 text-muted-foreground uppercase tracking-wide whitespace-nowrap" style={{ fontSize }}>Low</th>
                <th className="text-right px-2 py-1.5 text-muted-foreground uppercase tracking-wide whitespace-nowrap" style={{ fontSize }}>Previous</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(groupedFilteredEvents).map(([date, dateEvents]) => (
                <React.Fragment key={`date-group-${date}`}>
                  {/* Date Separator */}
                  <tr>
                    <td colSpan={10} className="px-2 py-1.5 border-y border-border transition-colors" style={{ backgroundColor: '#fe9800' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#323539'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fe9800'}>
                      <span className="text-sm font-bold">{formatDate(date)}</span>
                    </td>
                  </tr>
                  {/* Events */}
                  {dateEvents.map((event, idx) => {
                    const rowKey = `${event.NewsDay}|${event.NewsTime}|${event.Event}|${event.Currency}`;
                    const flashClass = flashingKeys.has(rowKey) ? 'animate-flash bg-primary/10' : '';
                    const isExpanded = expandedEventKey === rowKey;
                    return (
                    <React.Fragment key={`${event.NewsDay}-${event.NewsTime}-${idx}`}>
                    <tr
                      onClick={() => setExpandedEventKey(isExpanded ? null : rowKey)}
                      className={`border-b border-border hover:bg-primary/10 transition-colors cursor-pointer ${idx % 2 === 0 ? "bg-widget-body" : "bg-card/30"} ${flashClass} ${isExpanded ? "bg-muted/50" : ""}`}
                    >
                      <td className="px-2 py-2 text-foreground" style={{ fontSize }}>
                        <div className="flex items-center gap-1">
                          {isExpanded ? (
                            <ChevronUp className="w-3 h-3 text-primary" />
                          ) : (
                            <ChevronDown className="w-3 h-3 text-muted-foreground" />
                          )}
                          {event.NewsTime}
                        </div>
                      </td>
                      <td className="px-1 py-2 text-center">
                        <div className="flex items-center justify-center">
                          <div className="flag-container">
                            {/* Real flag images using Flagpedia CDN */}
                            <img 
                              src={`https://flagcdn.com/w20/${getCountryCode(event.CountryCode).toLowerCase()}.png`}
                              alt={event.CountryCode}
                              className="flag-image"
                              style={{ 
                                width: '16px', 
                                height: '12px', 
                                objectFit: 'cover',
                                borderRadius: '2px',
                                border: '1px solid rgba(255,255,255,0.1)'
                              }}
                              onError={(e) => {
                                // Fallback to emoji if image fails to load
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                const parent = target.parentElement;
                                if (parent) {
                                  parent.innerHTML = `<span style="font-size: 14px;">${getEmojiFlag(event.CountryCode)}</span>`;
                                }
                              }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-2 py-2 text-foreground" style={{ fontSize }}>{event.Currency}</td>
                      <td className="px-2 py-2">
                        <div className="flex justify-center">
                          {getImpactIndicator(event.Impact)}
                        </div>
                      </td>
                      <td className="px-2 py-2 text-foreground max-w-[300px]" style={{ fontSize }}>{event.Event}</td>
                      <td className="px-2 py-2 text-right whitespace-nowrap">
                        <span className={`font-bold ${valueClass(event.Actual)}`} style={{ fontSize }}>{event.Actual || '–'}</span>
                      </td>
                      <td className="px-2 py-2 text-right whitespace-nowrap" style={{ fontSize }}>
                        <span className={valueClass(event.High)}>{event.High || '–'}</span>
                      </td>
                      <td className="px-2 py-2 text-right whitespace-nowrap" style={{ fontSize }}>
                        <span className={valueClass(event.Forecast)}>{event.Forecast || '–'}</span>
                      </td>
                      <td className="px-2 py-2 text-right whitespace-nowrap" style={{ fontSize }}>
                        <span className={valueClass(event.Low)}>{event.Low || '–'}</span>
                      </td>
                      <td className="px-2 py-2 text-right whitespace-nowrap" style={{ fontSize }}>
                        <span className={valueClass(event.Previous)}>{event.Previous || '–'}</span>
                      </td>
                    </tr>
                    {/* Expanded Detail View */}
                    {isExpanded && (
                      <tr>
                        <td colSpan={10} className="p-0 bg-card/50 border-b border-border">
                          <div className="p-4 grid grid-cols-2 gap-6">
                            {/* Left Column - Tabbed Specs */}
                            <div className="space-y-3">
                              {/* Specs Tab Menu */}
                              <div className="flex gap-2 border-b border-border mb-3">
                                {(["Description", "Impact", "Frequency", "Source"] as const).map((tab) => (
                                  <button
                                    key={tab}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveSpecsTab(tab);
                                    }}
                                    className={`px-3 py-1.5 text-sm font-medium transition-colors relative ${
                                      activeSpecsTab === tab
                                        ? "text-primary"
                                        : "text-muted-foreground hover:text-foreground"
                                    }`}
                                  >
                                    {tab}
                                    {activeSpecsTab === tab && (
                                      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary"></div>
                                    )}
                                  </button>
                                ))}
                              </div>
                              
                              {/* Tab Content */}
                              <div className="space-y-4 min-h-[200px]">
                                {activeSpecsTab === "Description" && (
                                  <div className="space-y-4">
                                    <div>
                                      <div className="text-foreground mb-3 text-base font-semibold">{event.Event}</div>
                                    </div>
                                    
                                    {event.measures && (
                                      <div>
                                        <div className="text-primary mb-2 uppercase tracking-wide text-xs font-semibold">What it Measures</div>
                                        <div className="text-foreground text-sm leading-relaxed">{event.measures}</div>
                                      </div>
                                    )}
                                    
                                    {event.whyTradersCare && (
                                      <div>
                                        <div className="text-primary mb-2 uppercase tracking-wide text-xs font-semibold">Why Traders Care</div>
                                        <div className="text-foreground text-sm leading-relaxed">{event.whyTradersCare}</div>
                                      </div>
                                    )}
                                    
                                    {event.ffNotes && (
                                      <div>
                                        <div className="text-primary mb-2 uppercase tracking-wide text-xs font-semibold">Additional Notes</div>
                                        <div className="text-foreground text-sm leading-relaxed">{event.ffNotes}</div>
                                      </div>
                                    )}
                                    
                                    {!event.measures && !event.whyTradersCare && !event.ffNotes && (
                                      <div className="text-muted-foreground text-sm italic">
                                        No detailed description available for this event.
                                      </div>
                                    )}
                                  </div>
                                )}
                                
                                {activeSpecsTab === "Impact" && (
                                  <div className="space-y-4">
                                    {event.usualEffect && (
                                      <div>
                                        <div className="text-muted-foreground mb-2 text-xs font-medium">Usual Effect</div>
                                        <div className="text-foreground text-sm leading-relaxed">{event.usualEffect}</div>
                                      </div>
                                    )}
                                    <div>
                                      <div className="text-muted-foreground mb-2 text-xs font-medium">Impact Level</div>
                                      <div className="flex items-center gap-2">
                                        {getImpactIndicator(event.Impact)}
                                        <span className="text-foreground text-sm capitalize font-medium">
                                          {parseInt(event.Impact) === 3 ? 'high' : parseInt(event.Impact) === 2 ? 'medium' : 'low'}
                                        </span>
                                      </div>
                                    </div>
                                    {!event.usualEffect && (
                                      <div className="text-muted-foreground text-sm italic">
                                        No additional impact information available.
                                      </div>
                                    )}
                                  </div>
                                )}
                                
                                {activeSpecsTab === "Frequency" && (
                                  <div className="space-y-4">
                                    {event.frequency && (
                                      <div>
                                        <div className="text-muted-foreground mb-2 text-xs font-medium">Release Schedule</div>
                                        <div className="text-foreground text-sm leading-relaxed">{event.frequency}</div>
                                      </div>
                                    )}
                                    {event.nextRelease && (
                                      <div>
                                        <div className="text-muted-foreground mb-2 text-xs font-medium">Next Release</div>
                                        <div className="text-accent text-sm underline cursor-pointer hover:text-primary transition-colors">{event.nextRelease}</div>
                                      </div>
                                    )}
                                    {!event.frequency && !event.nextRelease && (
                                      <div className="text-muted-foreground text-sm italic">
                                        No frequency information available.
                                      </div>
                                    )}
                                  </div>
                                )}
                                
                                {activeSpecsTab === "Source" && (
                                  <div className="space-y-4">
                                    {event.source && (
                                      <div>
                                        <div className="text-muted-foreground mb-2 text-xs font-medium">Data Source</div>
                                        <div className="text-foreground text-sm leading-relaxed">{event.source}</div>
                                      </div>
                                    )}
                                    <div>
                                      <div className="text-muted-foreground mb-2 text-xs font-medium">Country</div>
                                      <div className="text-foreground text-sm flex items-center gap-2">
                                        <span className="text-lg">{getEmojiFlag(event.CountryCode)}</span>
                                        <span className="font-medium">{event.Country}</span>
                                      </div>
                                    </div>
                                    <div>
                                      <div className="text-muted-foreground mb-2 text-xs font-medium">Currency</div>
                                      <div className="text-foreground text-sm font-medium">{event.Currency}</div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            {/* Right Column - Chart/Table */}
                            <div className="space-y-3">
                              {/* Chart/Table Tab Menu */}
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex gap-2 border-b border-border">
                                  {(["Chart", "Table"] as const).map((tab) => (
                                    <button
                                      key={tab}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveViewTab(tab);
                                      }}
                                      className={`px-3 py-1.5 text-sm font-medium transition-colors relative ${
                                        activeViewTab === tab
                                          ? "text-primary"
                                          : "text-muted-foreground hover:text-foreground"
                                      }`}
                                    >
                                      {tab}
                                      {activeViewTab === tab && (
                                        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary"></div>
                                      )}
                                    </button>
                                  ))}
                                </div>
                                
                                {/* Timeframe buttons - only show for Chart view */}
                                {activeViewTab === "Chart" && (
                                  <div className="flex gap-1 shrink-0">
                                    {(["1Y", "2Y", "3Y", "5Y", "10Y", "All"] as const).map((tf) => (
                                      <button
                                        key={tf}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setChartTimeframe(tf);
                                        }}
                                        className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                                          chartTimeframe === tf
                                            ? "bg-primary text-primary-foreground"
                                            : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                                        }`}
                                      >
                                        {tf}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                              
                              {/* Chart View */}
                              {activeViewTab === "Chart" && (
                                <div className="h-[220px] bg-background rounded border border-border p-3">
                                  {event.historicalData && event.historicalData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                      <LineChart data={event.historicalData.map(h => ({
                                        period: h.period,
                                        actual: typeof h.actual === 'string' ? parseFloat(h.actual.replace(/[^0-9.-]/g, '')) || 0 : (typeof h.actual === 'number' ? h.actual : 0)
                                      }))}>
                                        <XAxis 
                                          dataKey="period" 
                                          stroke="var(--muted-foreground)"
                                          tick={{ fontSize: 12 }}
                                          tickLine={false}
                                        />
                                        <YAxis 
                                          stroke="var(--muted-foreground)"
                                          tick={{ fontSize: 12 }}
                                          tickLine={false}
                                          tickFormatter={(value) => {
                                            if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
                                            return value.toFixed(0);
                                          }}
                                        />
                                        <Tooltip
                                          contentStyle={{
                                            backgroundColor: "var(--popover)",
                                            border: "1px solid var(--border)",
                                            borderRadius: "6px",
                                            fontSize: "12px",
                                            padding: "8px"
                                          }}
                                        />
                                        <Line 
                                          type="monotone" 
                                          dataKey="actual" 
                                          stroke="var(--primary)" 
                                          strokeWidth={2}
                                          dot={false}
                                        />
                                      </LineChart>
                                    </ResponsiveContainer>
                                  ) : (
                                    <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                                      No chart data available
                                    </div>
                                  )}
                                </div>
                              )}
                              
                              {/* Table View */}
                              {activeViewTab === "Table" && (
                                <div className="h-[220px] bg-background rounded border border-border overflow-auto">
                                  <table className="w-full text-sm">
                                    <thead className="sticky top-0 bg-widget-header border-b border-border">
                                      <tr>
                                        <th className="text-left px-3 py-2 text-muted-foreground text-xs font-semibold uppercase tracking-wide">Period</th>
                                        <th className="text-right px-3 py-2 text-muted-foreground text-xs font-semibold uppercase tracking-wide">Actual</th>
                                        <th className="text-right px-3 py-2 text-muted-foreground text-xs font-semibold uppercase tracking-wide">Forecast</th>
                                        <th className="text-right px-3 py-2 text-muted-foreground text-xs font-semibold uppercase tracking-wide">Previous</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {event.historicalData && event.historicalData.length > 0 ? (
                                        event.historicalData.slice(0, 15).map((row, rowIdx) => (
                                          <tr 
                                            key={rowIdx}
                                            className={`border-b border-border ${
                                              rowIdx % 2 === 0 ? "bg-widget-body" : "bg-card/30"
                                            }`}
                                          >
                                            <td className="px-3 py-2 text-foreground text-sm">{row.period}</td>
                                            <td className="px-3 py-2 text-right text-foreground text-sm font-semibold">
                                              {typeof row.actual === 'number' ? row.actual.toLocaleString() : row.actual}
                                            </td>
                                            <td className="px-3 py-2 text-right text-muted-foreground text-sm">
                                              {typeof row.forecast === 'number' ? row.forecast.toLocaleString() : row.forecast}
                                            </td>
                                            <td className="px-3 py-2 text-right text-muted-foreground text-sm">
                                              {typeof row.previous === 'number' ? row.previous.toLocaleString() : row.previous}
                                            </td>
                                          </tr>
                                        ))
                                      ) : (
                                        <tr>
                                          <td colSpan={4} className="px-3 py-4 text-center text-muted-foreground text-sm">
                                            No historical data available
                                          </td>
                                        </tr>
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                    </React.Fragment>
                    );
                  })}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Calendar Content - Horizontal Layout */}
      {config?.eventOrientation === 'horizontal' && (
        <div className="flex-1 relative overflow-hidden">
          {/* Left Scroll Button */}
          {canScrollLeft && (
            <button
              onClick={scrollLeft}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-20 bg-widget-header/95 hover:bg-widget-header border border-border rounded-full p-2 shadow-lg transition-all hover:scale-110"
            >
              <ChevronLeft className="w-5 h-5 text-foreground" />
            </button>
          )}
          
          {/* Right Scroll Button */}
          {canScrollRight && (
            <button
              onClick={scrollRight}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-20 bg-widget-header/95 hover:bg-widget-header border border-border rounded-full p-2 shadow-lg transition-all hover:scale-110"
            >
              <ChevronRight className="w-5 h-5 text-foreground" />
            </button>
          )}

          <div 
            ref={horizontalScrollRef}
            className="flex-1 h-full overflow-x-auto overflow-y-auto custom-scrollbar"
          >
            <div className="flex gap-0 min-w-full">
              {Object.entries(groupedFilteredEvents).map(([date, dateEvents]) => (
                <div 
                  key={`day-${date}`} 
                  className="flex-shrink-0 border-r border-border last:border-r-0"
                  style={{ width: "320px", minWidth: "280px" }}
                >
                  {/* Date Header */}
                  <div className="sticky top-0 px-3 py-2 border-b border-border z-10 transition-colors" style={{ backgroundColor: '#fe9800' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#323539'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fe9800'}>
                    <span className="text-base font-bold">{formatDate(date)}</span>
                  </div>
                  
                  {/* Events for this date */}
                  <div className="space-y-0">
                    {dateEvents.map((event, idx) => {
                      const rowKey = `${event.NewsDay}|${event.NewsTime}|${event.Event}|${event.Currency}`;
                      const flashClass = flashingKeys.has(rowKey) ? 'animate-flash bg-primary/10' : '';
                      const isExpanded = expandedEventKey === rowKey;
                      return (
                        <div
                          key={event.NewsDay + '-' + event.NewsTime + '-' + idx}
                          onClick={() => setExpandedEventKey(isExpanded ? null : rowKey)}
                          className={`px-3 py-3 border-b border-border hover:bg-primary/10 cursor-pointer transition-all ${
                            idx % 2 === 0 ? "bg-widget-body" : "bg-card/30"
                          } ${isExpanded ? "bg-muted/50" : ""} ${flashClass}`}
                        >
                          {/* Event Row */}
                          <div className="space-y-2">
                            {/* Time & Country & Impact */}
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="text-foreground text-sm">{event.NewsTime}</span>
                                <div className="flag-container">
                                  <img 
                                    src={`https://flagcdn.com/w20/${getCountryCode(event.CountryCode).toLowerCase()}.png`}
                                    alt={event.CountryCode}
                                    className="flag-image"
                                    style={{ 
                                      width: '16px', 
                                      height: '12px', 
                                      objectFit: 'cover',
                                      borderRadius: '2px',
                                      border: '1px solid rgba(255,255,255,0.1)'
                                    }}
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement;
                                      target.style.display = 'none';
                                      const parent = target.parentElement;
                                      if (parent) {
                                        parent.innerHTML = `<span style="font-size: 16px;">${getEmojiFlag(event.CountryCode)}</span>`;
                                      }
                                    }}
                                  />
                                </div>
                                <span className="text-foreground text-sm">{event.Currency}</span>
                              </div>
                              {getImpactIndicator(event.Impact)}
                            </div>
                            
                            {/* Event Name */}
                            <div className="text-foreground text-sm line-clamp-2">{event.Event}</div>
                            
                            {/* Data Values */}
                            <div className="grid grid-cols-3 gap-2 text-sm">
                              <div>
                                <div className="text-muted-foreground mb-0.5 text-xs">Actual</div>
                                <div className={`font-bold text-sm ${valueClass(event.Actual)}`}>{event.Actual || '–'}</div>
                              </div>
                              <div>
                                <div className="text-muted-foreground mb-0.5 text-xs">Forecast</div>
                                <div className={`text-sm ${valueClass(event.Forecast)}`}>{event.Forecast || '–'}</div>
                              </div>
                              <div>
                                <div className="text-muted-foreground mb-0.5 text-xs">Previous</div>
                                <div className={`text-sm ${valueClass(event.Previous)}`}>{event.Previous || '–'}</div>
                              </div>
                            </div>
                            
                            {/* Expand indicator */}
                            <div className="flex justify-center pt-1">
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4 text-primary" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-muted-foreground" />
                              )}
                            </div>
                          </div>
                          
                          {/* Expanded Detail View */}
                          {isExpanded && (
                            <div className="mt-3 pt-3 border-t border-border space-y-3 text-base">
                              {/* Tabbed Specs */}
                              <div className="space-y-3">
                                {/* Specs Tab Menu */}
                                <div className="flex gap-2 border-b border-border">
                                  {(["Description", "Impact", "Frequency", "Source"] as const).map((tab) => (
                                    <button
                                      key={tab}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveSpecsTab(tab);
                                      }}
                                      className={`px-2 py-1 text-sm font-medium transition-colors relative ${
                                        activeSpecsTab === tab
                                          ? "text-primary"
                                          : "text-muted-foreground hover:text-foreground"
                                      }`}
                                    >
                                      {tab}
                                      {activeSpecsTab === tab && (
                                        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary"></div>
                                      )}
                                    </button>
                                  ))}
                                </div>
                                
                                {/* Tab Content */}
                                <div className="min-h-[100px] text-sm">
                                  {activeSpecsTab === "Description" && (
                                    <div className="space-y-3">
                                      {event.measures && (
                                        <div>
                                          <div className="text-primary mb-1.5 uppercase tracking-wide text-xs font-semibold">What it Measures</div>
                                          <div className="text-foreground leading-relaxed">{event.measures}</div>
                                        </div>
                                      )}
                                      {event.whyTradersCare && (
                                        <div>
                                          <div className="text-primary mb-1.5 uppercase tracking-wide text-xs font-semibold">Why Traders Care</div>
                                          <div className="text-foreground leading-relaxed">{event.whyTradersCare}</div>
                                        </div>
                                      )}
                                      {event.ffNotes && (
                                        <div>
                                          <div className="text-primary mb-1.5 uppercase tracking-wide text-xs font-semibold">Additional Notes</div>
                                          <div className="text-foreground leading-relaxed">{event.ffNotes}</div>
                                        </div>
                                      )}
                                      {!event.measures && !event.whyTradersCare && !event.ffNotes && (
                                        <div className="text-muted-foreground italic">No detailed description available.</div>
                                      )}
                                    </div>
                                  )}
                                  
                                  {activeSpecsTab === "Impact" && (
                                    <div className="space-y-3">
                                      {event.usualEffect && (
                                        <div>
                                          <div className="text-muted-foreground mb-1 text-xs font-medium">Usual Effect</div>
                                          <div className="text-foreground">{event.usualEffect}</div>
                                        </div>
                                      )}
                                      <div>
                                        <div className="text-muted-foreground mb-1 text-xs font-medium">Impact Level</div>
                                        <div className="flex items-center gap-2">
                                          {getImpactIndicator(event.Impact)}
                                          <span className="text-foreground capitalize">
                                            {parseInt(event.Impact) === 3 ? 'high' : parseInt(event.Impact) === 2 ? 'medium' : 'low'}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                  
                                  {activeSpecsTab === "Frequency" && (
                                    <div className="space-y-3">
                                      {event.frequency && (
                                        <div>
                                          <div className="text-muted-foreground mb-1 text-xs font-medium">Release Schedule</div>
                                          <div className="text-foreground">{event.frequency}</div>
                                        </div>
                                      )}
                                      {event.nextRelease && (
                                        <div>
                                          <div className="text-muted-foreground mb-1 text-xs font-medium">Next Release</div>
                                          <div className="text-accent underline cursor-pointer hover:text-primary transition-colors">{event.nextRelease}</div>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                  
                                  {activeSpecsTab === "Source" && (
                                    <div className="space-y-3">
                                      {event.source && (
                                        <div>
                                          <div className="text-muted-foreground mb-1 text-xs font-medium">Data Source</div>
                                          <div className="text-foreground">{event.source}</div>
                                        </div>
                                      )}
                                      <div>
                                        <div className="text-muted-foreground mb-1 text-xs font-medium">Country</div>
                                        <div className="text-foreground flex items-center gap-2">
                                          <span className="text-lg">{getEmojiFlag(event.CountryCode)}</span>
                                          <span>{event.Country}</span>
                                        </div>
                                      </div>
                                      <div>
                                        <div className="text-muted-foreground mb-1 text-xs font-medium">Currency</div>
                                        <div className="text-foreground">{event.Currency}</div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}