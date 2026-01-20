// Client-side API functions for Week Ahead widget

export interface WeekAheadApiEvent {
  id: number;
  datetime: string; // Format: "YYYY-MM-DD"
  headline: string;
  description: string;
}

export interface WeekAheadApiResponse {
  success: boolean;
  dataType: string;
  data: WeekAheadApiEvent[];
}

export interface WeekEvent {
  day: number;
  month: string;
  dayName: string;
  events: {
    title: string;
    description: string;
    priority?: 'high' | 'medium' | 'low';
  }[];
  isToday?: boolean;
}

// Helper function to parse date and extract day, month, dayName
function parseDate(dateString: string): { day: number; month: string; dayName: string; date: Date } {
  const date = new Date(dateString + 'T00:00:00'); // Add time to avoid timezone issues
  
  const day = date.getDate();
  const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const month = monthNames[date.getMonth()];
  const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const dayName = dayNames[date.getDay()];
  
  return { day, month, dayName, date };
}

// Helper function to determine priority from headline/description
function inferPriority(headline: string, description: string): 'high' | 'medium' | 'low' {
  const text = (headline + ' ' + description).toLowerCase();
  
  // High priority keywords
  const highPriorityKeywords = [
    'fed', 'fomc', 'cpi', 'inflation', 'nfp', 'jobs report', 'employment',
    'ecb', 'boe', 'rba', 'rbnz', 'central bank', 'rate decision', 'monetary policy',
    'gdp', 'retail sales', 'budget', 'fiscal'
  ];
  
  // Medium priority keywords
  const mediumPriorityKeywords = [
    'pmi', 'manufacturing', 'confidence', 'sentiment', 'industrial',
    'trade', 'balance', 'export', 'import'
  ];
  
  if (highPriorityKeywords.some(keyword => text.includes(keyword))) {
    return 'high';
  }
  
  if (mediumPriorityKeywords.some(keyword => text.includes(keyword))) {
    return 'medium';
  }
  
  return 'low';
}

// Helper function to check if a date is today
function isToday(date: Date): boolean {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

// Transform API response to component data structure
export function transformApiResponseToWeekEvents(apiData: WeekAheadApiEvent[]): WeekEvent[][] {
  if (!apiData || apiData.length === 0) {
    return [];
  }

  // Group events by date
  const eventsByDate = new Map<string, WeekAheadApiEvent[]>();
  
  apiData.forEach((event) => {
    const dateKey = event.datetime;
    if (!eventsByDate.has(dateKey)) {
      eventsByDate.set(dateKey, []);
    }
    eventsByDate.get(dateKey)!.push(event);
  });

  // Convert to WeekEvent array with dates, sorted by date
  const daysWithDates: Array<{ day: WeekEvent; date: Date; dateKey: string }> = [];
  const sortedDates = Array.from(eventsByDate.keys()).sort();
  
  sortedDates.forEach((dateKey) => {
    const events = eventsByDate.get(dateKey)!;
    const { day, month, dayName, date } = parseDate(dateKey);
    
    daysWithDates.push({
      day: {
        day,
        month,
        dayName,
        isToday: isToday(date),
        events: events.map((event) => ({
          title: event.headline,
          description: event.description,
          priority: inferPriority(event.headline, event.description),
        })),
      },
      date,
      dateKey,
    });
  });

  // Group days into weeks
  // A week starts on Monday and ends on Sunday, or if there's a gap > 1 day, start a new week
  const weeks: WeekEvent[][] = [];
  let currentWeek: WeekEvent[] = [];
  let previousDate: Date | null = null;
  
  daysWithDates.forEach(({ day, date }) => {
    // Check if we should start a new week:
    // 1. First day
    // 2. If previous day was Sunday (start new week on Monday)
    // 3. If there's a gap of more than 1 day between dates
    const shouldStartNewWeek = 
      previousDate === null ||
      (previousDate.getDay() === 0 && date.getDay() === 1) || // Previous was Sunday, current is Monday
      (date.getTime() - previousDate.getTime() > 86400000 * 1); // Gap of more than 1 day
    
    if (shouldStartNewWeek && currentWeek.length > 0) {
      weeks.push([...currentWeek]);
      currentWeek = [];
    }
    
    currentWeek.push(day);
    previousDate = date;
  });
  
  // Add the last week if it has days
  if (currentWeek.length > 0) {
    weeks.push(currentWeek);
  }
  
  return weeks;
}

// Client-side function to fetch Week Ahead data
export async function fetchWeekAheadData(
  dataType: 'graphic' | 'detailed_text' = 'graphic'
): Promise<WeekEvent[][] | null> {
  try {
    const response = await fetch('/api/pmt/week-ahead', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ DataType: dataType }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.warn('⚠️ [Week Ahead] API returned error:', response.status, errorData.error);
      return null;
    }

    const result: WeekAheadApiResponse = await response.json();
    if (!result.success || !result.data) {
      console.warn('⚠️ [Week Ahead] API returned unsuccessful response:', result);
      return null;
    }

    // Transform API data to component format
    const weekEvents = transformApiResponseToWeekEvents(result.data);
    return weekEvents;
  } catch (error) {
    console.warn('⚠️ [Week Ahead] Error fetching data:', error);
    return null;
  }
}

