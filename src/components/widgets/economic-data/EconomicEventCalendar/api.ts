// Economic Data API functions and types
// Event Calendar API functions

import { widgetDataCache } from '@/lib/widgetDataCache';

export interface EventCalendarEvent {
  // Primary Event Calendar fields (from GetEventCalendar endpoint)
  NewsDay: string;
  NewsTime: string;
  NewsHeader: string;
  Currency: string;
  Country: string;
  CountryCode?: string;
  Impact: string;
  Event: string;
  Actual: string | null;
  Forecast: string | null;
  Previous: string | null;
  High: string | null;
  Low: string | null;
  // Expanded detail fields (from API)
  measures?: string;
  whyTradersCare?: string;
  ffNotes?: string;
  usualEffect?: string;
  frequency?: string;
  nextRelease?: string;
  source?: string;
  historicalData?: Array<{
    period: string;
    actual: string | number;
    forecast: string | number;
    previous: string | number;
  }>;
  // Legacy fields for backward compatibility
  event_id?: string;
  event_country?: string;
  event_title?: string;
  event_actual?: string;
  event_forecast?: string;
  event_previous?: string;
  event_currency?: string;
  updated_on?: string;
}

export interface EventCalendarData {
  events: EventCalendarEvent[];
  InvestingNews: unknown[]; // Fallback news data
  current_time: string;
  timezone: string;
}

export interface EventCalendarConfig {
  symbols: string[];
  dateRange: string;
  eventOrientation: 'horizontal' | 'vertical';
  autoUpdateSettings: { enabled: boolean; interval: number };
  templateName: string;
  wgid: string;
  isSpecialWidget: boolean;
}

export interface EventCalendarResponse {
  success: boolean;
  data: EventCalendarData;
  isFallbackData?: boolean;
  message?: string;
  error?: string;
  isAborted?: boolean;
}

export interface EventCalendarRequest {
  symbols: string[];
  dateRange: string;
  eventOrientation: 'horizontal' | 'vertical';
  autoUpdateSettings: {
    enabled: boolean;
    interval: number;
  };
  templateName: string;
  wgid: string;
  isSpecialWidget: boolean;
}

// Client-side function that calls the Next.js API route
export async function fetchEventCalendarDataFromAPI(
  request: EventCalendarRequest,
  forceRefresh: boolean = false
): Promise<EventCalendarResponse> {
  try {
    // Generate cache key based on request parameters
    const cacheKey = widgetDataCache.generateKey('event-calendar', {
      symbols: request.symbols.sort().join(','),
      dateRange: request.dateRange
    });
    
    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cachedData = widgetDataCache.get<EventCalendarResponse>(cacheKey);
      if (cachedData) {
        console.log('📦 [EventCalendar API] Using cached data, skipping API call');
        return cachedData;
      }
    }
    
    console.log('📅 [EventCalendar API] Fetching data:', {
      symbols: request.symbols,
      dateRange: request.dateRange,
      wgid: request.wgid
    });

    const response = await fetch('/api/economic-data/event-calendar', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
      // Add timeout to prevent hanging requests
      signal: AbortSignal.timeout(15000), // 15 second timeout
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [EventCalendar API] Request failed:', {
        status: response.status,
        statusText: response.statusText,
        errorText: errorText.substring(0, 500)
      });
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    console.log('✅ [EventCalendar API] Response received:', {
      success: data.success,
      hasData: !!data.data,
      eventCount: data.data?.events?.length || data.data?.InvestingNews?.length || 0,
      isFallbackData: data.isFallbackData
    });

    const result: EventCalendarResponse = {
      success: data.success,
      data: data.data,
      isFallbackData: data.isFallbackData,
      message: data.message,
      error: data.error
    };
    
    // Cache the result if successful
    if (result.success) {
      widgetDataCache.set(cacheKey, result);
    }

    return result;

  } catch (error) {
    // Handle aborted requests silently - this is expected behavior when component unmounts or re-renders
    if (error instanceof Error && (error.name === 'AbortError' || error.message === 'The user aborted a request.')) {
      console.log('📅 [EventCalendar API] Request was aborted (component unmounted or navigation occurred)');
      return {
        success: false,
        data: {
          events: [],
          InvestingNews: [],
          current_time: new Date().toISOString(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        error: 'Request aborted',
        isAborted: true
      };
    }
    
    if (error instanceof Error && error.name === 'TimeoutError') {
      console.warn('📅 [EventCalendar API] Request timed out after 15 seconds');
    } else {
      console.error('❌ [EventCalendar API] Error:', error);
    }
    
    // Return fallback data structure
    return {
      success: false,
      data: {
        events: [],
        InvestingNews: [],
        current_time: new Date().toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Process event calendar data
export function processEventCalendarData(
  data: EventCalendarData,
  config: EventCalendarConfig | null,
  currentSymbol: string
): EventCalendarEvent[] {
  if (!data.events || !Array.isArray(data.events)) {
    console.warn('📅 [EventCalendar] No events data available');
    return [];
  }

  console.log('📅 [EventCalendar] Processing events:', {
    totalEvents: data.events.length,
    currentSymbol,
    configSymbols: config?.symbols
  });

  // Filter events by currency if specified
  let filteredEvents = data.events;
  
  if (currentSymbol && currentSymbol !== 'ALL') {
    filteredEvents = data.events.filter(event => 
      event.Currency === currentSymbol
    );
    
    console.log('📅 [EventCalendar] Filtered by currency:', {
      originalCount: data.events.length,
      filteredCount: filteredEvents.length,
      currency: currentSymbol
    });
  }

  // Sort events by date and time
  const sortedEvents = filteredEvents.sort((a, b) => {
    // First sort by date
    const dateA = new Date(a.NewsDay.split('/').reverse().join('-'));
    const dateB = new Date(b.NewsDay.split('/').reverse().join('-'));
    
    if (dateA.getTime() !== dateB.getTime()) {
      return dateA.getTime() - dateB.getTime();
    }
    
    // Then sort by time
    const timeA = a.NewsTime.split(':').map(Number);
    const timeB = b.NewsTime.split(':').map(Number);
    
    return (timeA[0] * 60 + timeA[1]) - (timeB[0] * 60 + timeB[1]);
  });

  console.log('📅 [EventCalendar] Sorted events:', {
    count: sortedEvents.length,
    sampleEvent: sortedEvents[0]
  });

  return sortedEvents;
}

// Group events by date
export function groupEventsByDate(events: EventCalendarEvent[]): Record<string, EventCalendarEvent[]> {
  const grouped: Record<string, EventCalendarEvent[]> = {};
  
  events.forEach(event => {
    const date = event.NewsDay;
    if (!grouped[date]) {
      grouped[date] = [];
    }
    grouped[date].push(event);
  });
  
  // Sort dates
  const sortedDates = Object.keys(grouped).sort((a, b) => {
    const dateA = new Date(a.split('/').reverse().join('-'));
    const dateB = new Date(b.split('/').reverse().join('-'));
    return dateA.getTime() - dateB.getTime();
  });
  
  const sortedGrouped: Record<string, EventCalendarEvent[]> = {};
  sortedDates.forEach(date => {
    sortedGrouped[date] = grouped[date];
  });
  
  return sortedGrouped;
}
