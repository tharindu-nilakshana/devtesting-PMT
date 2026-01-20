/* eslint-disable @typescript-eslint/no-explicit-any */

// Response interface for Liquidity Range API
export interface LiquidityRangeData {
  session: string; // "Asian", "London", "New York"
  high: number;
  low: number;
  open: number;
  close: number;
  datetime: string;
}

// Response interface for Open Values API
export interface OpenValuesData {
  session: string; // "Asian", "London", "New York"
  open: number;
  datetime: string;
}

export interface LiquidityRangeRequest {
  day: string; // Format: "YYYY-MM-DD HH:MM:SS"
  symbol: string; // e.g., "EURUSD", "GBPUSD", "AAPL"
}

export interface OpenValuesRequest {
  sdate: string; // Format: "YYYY-MM-DD"
  symbol: string; // e.g., "EURUSD", "GBPUSD", "AAPL"
}

// API response wrapper interface
interface ApiResponse<T> {
  status: string;
  message: string;
  symbol?: string;
  data: T[];
  count: number;
}

/**
 * Fetch liquidity range data from the API
 * @param request - Contains day (datetime in YYYY-MM-DD HH:MM:SS format) and symbol
 * @returns Array of liquidity range data for each session
 */
export async function fetchLiquidityRange(
  request: LiquidityRangeRequest
): Promise<LiquidityRangeData[]> {
  // Build query string manually to avoid over-encoding
  // The API expects: day=2024-12-10 10:00:00&symbol=EURUSD
  const queryString = `day=${encodeURIComponent(request.day)}&symbol=${encodeURIComponent(request.symbol)}`;

  const response = await fetch(`/api/pmt/getLiquidityRange?${queryString}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch liquidity range: ${response.status} ${errorText}`);
  }

  const result: ApiResponse<LiquidityRangeData> = await response.json();
  
  // Extract data array from response
  if (result.status !== 'success') {
    throw new Error(result.message || 'Failed to fetch liquidity range');
  }
  
  return result.data || [];
}

/**
 * Fetch open values data from the API
 * @param request - Contains sdate (date in YYYY-MM-DD format) and symbol
 * @returns Array of open values data for each session
 */
export async function fetchOpenValues(
  request: OpenValuesRequest
): Promise<OpenValuesData[]> {
  const params = new URLSearchParams({
    sdate: request.sdate,
    symbol: request.symbol,
  });

  const response = await fetch(`/api/pmt/getOpenValues?${params.toString()}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch open values: ${response.status} ${errorText}`);
  }

  const result: ApiResponse<OpenValuesData> = await response.json();
  
  // Extract data array from response
  if (result.status !== 'success') {
    throw new Error(result.message || 'Failed to fetch open values');
  }
  
  return result.data || [];
}

// Period open value interface
export interface PeriodOpenValue {
  period: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  label: string;
  open: number;
  startDate: Date;
}

/**
 * Get the start date for weekly open (Monday of current week)
 */
function getWeekStartDate(): Date {
  const date = new Date();
  const dayOfWeek = date.getUTCDay();
  
  // If Sunday (0), go back 6 days to Monday
  // Otherwise, go back (dayOfWeek - 1) days
  if (dayOfWeek === 0) {
    date.setUTCDate(date.getUTCDate() - 6);
  } else {
    date.setUTCDate(date.getUTCDate() - dayOfWeek + 1);
  }
  
  // Adjust for weekend
  const adjustedDay = date.getUTCDay();
  if (adjustedDay === 6) {
    date.setUTCDate(date.getUTCDate() + 2);
  } else if (adjustedDay === 0) {
    date.setUTCDate(date.getUTCDate() + 1);
  }
  
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

/**
 * Get the start date for monthly open (1st of current month, adjusted for weekends)
 */
function getMonthStartDate(): Date {
  const date = new Date();
  const currentDay = date.getUTCDate();
  
  date.setUTCDate(1);
  const firstDayOfMonth = new Date(date);
  const dayOfWeek = firstDayOfMonth.getUTCDay();
  
  // Complex weekend handling matching original logic
  if (dayOfWeek === 6) { // Saturday
    // If we're past the 2nd of the month, use the 3rd
    if (currentDay > firstDayOfMonth.getUTCDate() + 1) {
      date.setUTCDate(3);
    } else {
      // Otherwise, go to last trading day of previous month
      const month = date.getUTCMonth();
      date.setUTCMonth(date.getUTCMonth() - 1);
      
      // Determine last day based on month
      if ([0, 2, 4, 6, 7, 9, 11].includes(month - 1)) { // 31-day months
        date.setUTCDate(31);
      } else if (month - 1 === 1) { // February
        date.setUTCDate(28);
      } else { // 30-day months
        date.setUTCDate(30);
      }
    }
  } else if (dayOfWeek === 0) { // Sunday
    // If we're past the 1st of the month, use the 2nd
    if (currentDay > firstDayOfMonth.getUTCDate()) {
      date.setUTCDate(2);
    } else {
      // Otherwise, go to last trading day of previous month
      const month = date.getUTCMonth();
      date.setUTCMonth(date.getUTCMonth() - 1);
      
      // Determine last day based on month
      if ([0, 2, 4, 6, 7, 9, 11].includes(month - 1)) { // 31-day months
        date.setUTCDate(30);
      } else if (month - 1 === 1) { // February
        date.setUTCDate(27);
      } else { // 30-day months
        date.setUTCDate(29);
      }
    }
  }
  
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

/**
 * Get the start date for quarterly open (1st of quarter start month)
 */
function getQuarterStartDate(): Date {
  const date = new Date();
  const month = date.getMonth(); // Note: using getMonth() not getUTCMonth() to match original
  
  // Determine quarter start month (1=Feb, 4=May, 7=Aug, 10=Nov)
  // Original logic uses months 1, 4, 7, 10 (matching JavaScript 0-indexed: Jan=0, Feb=1, etc.)
  let quarterMonth: number;
  if (month === 1 || month === 2 || month === 3) {
    quarterMonth = 1; // Q1: February
  } else if (month === 4 || month === 5 || month === 6) {
    quarterMonth = 4; // Q2: May
  } else if (month === 7 || month === 8 || month === 9) {
    quarterMonth = 7; // Q3: August
  } else {
    quarterMonth = 10; // Q4: November
  }
  
  date.setMonth(quarterMonth);
  date.setDate(1);
  
  // Adjust for weekend - simpler logic matching original
  const dayOfWeek = date.getDay();
  let dateDay = 1;
  if (dayOfWeek === 6) {
    dateDay = 3;
  } else if (dayOfWeek === 0) {
    dateDay = 2;
  }
  
  date.setDate(dateDay);
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

/**
 * Format date as YYYY-M-D or YYYY-MM-DD for API request
 * Note: Matches original which doesn't always pad month
 */
function formatDateForApi(date: Date): string {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  return `${year}-${month}-${day}`;
}

/**
 * Fetch open value for a specific date
 */
async function fetchOpenValueForDate(dateString: string, symbol: string): Promise<number | null> {
  try {
    const params = new URLSearchParams({
      sdate: dateString,
      symbol: symbol,
    });

    const response = await fetch(`/api/pmt/getOpenValues?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      return null;
    }

    const result: ApiResponse<OpenValuesData> = await response.json();
    
    if (result.status === 'success' && result.data && result.data.length > 0) {
      return result.data[0].open;
    }
    
    return null;
  } catch {
    return null;
  }
}

/**
 * Fetch all period open values (daily, weekly, monthly, quarterly)
 * @param symbol - The trading symbol
 * @returns Array of period open values
 */
export async function fetchAllPeriodOpenValues(symbol: string): Promise<PeriodOpenValue[]> {
  const results: PeriodOpenValue[] = [];
  
  // Get dates for each period
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  
  // Adjust today for weekend
  const todayDay = today.getUTCDay();
  if (todayDay === 6) {
    today.setUTCDate(today.getUTCDate() - 1); // Saturday -> Friday
  } else if (todayDay === 0) {
    today.setUTCDate(today.getUTCDate() - 2); // Sunday -> Friday
  }
  
  const weekStart = getWeekStartDate();
  const monthStart = getMonthStartDate();
  const quarterStart = getQuarterStartDate();
  
  // Fetch all open values in parallel
  const [dailyOpen, weeklyOpen, monthlyOpen, quarterlyOpen] = await Promise.all([
    fetchOpenValueForDate(formatDateForApi(today), symbol),
    fetchOpenValueForDate(formatDateForApi(weekStart), symbol),
    fetchOpenValueForDate(formatDateForApi(monthStart), symbol),
    fetchOpenValueForDate(formatDateForApi(quarterStart), symbol),
  ]);
  
  if (dailyOpen !== null) {
    results.push({
      period: 'daily',
      label: 'Daily Open',
      open: dailyOpen,
      startDate: today,
    });
  }
  
  if (weeklyOpen !== null) {
    results.push({
      period: 'weekly',
      label: 'Weekly Open',
      open: weeklyOpen,
      startDate: weekStart,
    });
  }
  
  if (monthlyOpen !== null) {
    results.push({
      period: 'monthly',
      label: 'Monthly Open',
      open: monthlyOpen,
      startDate: monthStart,
    });
  }
  
  if (quarterlyOpen !== null) {
    results.push({
      period: 'quarterly',
      label: 'Quarterly Open',
      open: quarterlyOpen,
      startDate: quarterStart,
    });
  }
  
  return results;
}
