// Client-side API functions for Smart Bias Chart widget

export interface ApiHistoryDataPoint {
  time: number; // Unix timestamp in seconds
  value: number; // 1-5 numeric value
}

export interface ApiHistoryDataResponse {
  success: boolean;
  data: {
    [currency: string]: ApiHistoryDataPoint[];
  };
}

export type BiasValue = 
  | "Very Bullish"
  | "Bullish" 
  | "Neutral"
  | "Bearish"
  | "Very Bearish"
  | "Weak Bullish"
  | "Weak Bearish";

export interface WeekData {
  week: string;
  data: Record<string, BiasValue>;
}

// Map numeric value (1-5) to BiasValue string
// Based on API analysis:
// 1 = Very Bearish
// 2 = Bearish
// 3 = Neutral
// 4 = Bullish
// 5 = Very Bullish
export function mapNumericValueToBias(value: number): BiasValue {
  switch (value) {
    case 1:
      return "Very Bearish";
    case 2:
      return "Bearish";
    case 3:
      return "Neutral";
    case 4:
      return "Bullish";
    case 5:
      return "Very Bullish";
    default:
      return "Neutral";
  }
}

// Format timestamp to week label (e.g., "13-19 Oct")
export function formatWeekLabel(timestamp: number): string {
  const date = new Date(timestamp * 1000); // Convert seconds to milliseconds
  
  // Get the start of the week (Monday)
  const startOfWeek = new Date(date);
  const day = startOfWeek.getDay();
  const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
  startOfWeek.setDate(diff);
  
  // Get end of week (Sunday)
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  
  // Format: "13-19 Oct" or "28 Oct-3 Nov" if crosses month
  const formatDay = (d: Date) => d.getDate();
  const formatMonth = (d: Date) => d.toLocaleString('en-US', { month: 'short' });
  
  const startDay = formatDay(startOfWeek);
  const endDay = formatDay(endOfWeek);
  const startMonth = formatMonth(startOfWeek);
  const endMonth = formatMonth(endOfWeek);
  
  if (startMonth === endMonth) {
    return `${startDay}-${endDay} ${startMonth}`;
  } else {
    return `${startDay} ${startMonth}-${endDay} ${endMonth}`;
  }
}

// Transform API response to WeekData[] format
export function transformApiResponseToWeekData(apiData: ApiHistoryDataResponse): WeekData[] {
  if (!apiData.success || !apiData.data) {
    return [];
  }

  const currencies = Object.keys(apiData.data);
  if (currencies.length === 0) {
    return [];
  }

  // Get all unique timestamps from all currencies
  const allTimestamps = new Set<number>();
  currencies.forEach(currency => {
    apiData.data[currency].forEach(point => {
      allTimestamps.add(point.time);
    });
  });

  // Sort timestamps (most recent first)
  const sortedTimestamps = Array.from(allTimestamps).sort((a, b) => b - a);

  // Build WeekData array
  const weekData: WeekData[] = sortedTimestamps.map(timestamp => {
    const weekLabel = formatWeekLabel(timestamp);
    const weekDataPoint: WeekData = {
      week: weekLabel,
      data: {},
    };

    // For each currency, find the value for this timestamp
    currencies.forEach(currency => {
      const dataPoint = apiData.data[currency].find(p => p.time === timestamp);
      if (dataPoint) {
        weekDataPoint.data[currency] = mapNumericValueToBias(dataPoint.value);
      } else {
        // If no data for this timestamp, set to Neutral
        weekDataPoint.data[currency] = "Neutral";
      }
    });

    return weekDataPoint;
  });

  return weekData;
}

// Client-side function to fetch Smart Bias Chart data
export async function fetchSmartBiasChartData(
  weeksBack: number = 16,
  currency: string = ''
): Promise<ApiHistoryDataResponse | null> {
  try {
    const response = await fetch('/api/pmt/smart-bias-chart-data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ weeksBack, currency }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.warn('⚠️ [Smart Bias Chart] API returned error:', response.status, errorData.error);
      return null;
    }

    const result = await response.json();
    if (!result.success || !result.data) {
      console.warn('⚠️ [Smart Bias Chart] API returned unsuccessful response:', result.error);
      return null;
    }

    // The API route wraps the external API response in result.data
    return result.data || null;
  } catch (error) {
    console.warn('⚠️ [Smart Bias Chart] Error fetching data:', error);
    return null;
  }
}

