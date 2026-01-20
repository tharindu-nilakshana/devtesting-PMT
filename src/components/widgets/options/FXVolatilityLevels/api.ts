interface ApiVolatilityLevel {
  ID: number;
  datetime: string;
  symbol: string;
  dailyLow: string;
  dailyHigh: string;
  weeklyLow: string;
  weeklyHigh: string;
  monthlyLow: string;
  monthlyHigh: string;
  ivolDiff1M: string;
  ivolDailyLow: string;
  ivolDailyHigh: string;
}

interface ApiResponse {
  success: boolean;
  data: ApiVolatilityLevel[];
}

export interface VolatilityLevel {
  symbol: string;
  datetime: string;
  dailyLow: number;
  dailyHigh: number;
  weeklyLow: number;
  weeklyHigh: number;
  monthlyLow: number;
  monthlyHigh: number;
  ivolDiff1M: number;
  ivolDailyLow: number;
  ivolDailyHigh: number;
}

export async function fetchAllFxVolatilityLevels(limit: number = 1000, offset: number = 0): Promise<VolatilityLevel[]> {
  const response = await fetch('/api/pmt/fx-volatility-levels', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ limit, offset }),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch FX volatility levels: ${response.statusText}`);
  }

  const result: ApiResponse = await response.json();
  
  if (!result.success || !result.data) {
    throw new Error('Invalid response from API');
  }

  return result.data.map(item => ({
    symbol: item.symbol,
    datetime: item.datetime,
    dailyLow: parseFloat(item.dailyLow),
    dailyHigh: parseFloat(item.dailyHigh),
    weeklyLow: parseFloat(item.weeklyLow),
    weeklyHigh: parseFloat(item.weeklyHigh),
    monthlyLow: parseFloat(item.monthlyLow),
    monthlyHigh: parseFloat(item.monthlyHigh),
    ivolDiff1M: parseFloat(item.ivolDiff1M),
    ivolDailyLow: parseFloat(item.ivolDailyLow),
    ivolDailyHigh: parseFloat(item.ivolDailyHigh),
  }));
}

export async function fetchFxVolatilityLevelsBySymbol(symbol: string, limit: number = 1000, offset: number = 0): Promise<VolatilityLevel[]> {
  const response = await fetch('/api/pmt/fx-volatility-levels', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ symbol, limit, offset }),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch FX volatility levels for ${symbol}: ${response.statusText}`);
  }

  const result: ApiResponse = await response.json();
  
  if (!result.success || !result.data) {
    throw new Error('Invalid response from API');
  }

  return result.data.map(item => ({
    symbol: item.symbol,
    datetime: item.datetime,
    dailyLow: parseFloat(item.dailyLow),
    dailyHigh: parseFloat(item.dailyHigh),
    weeklyLow: parseFloat(item.weeklyLow),
    weeklyHigh: parseFloat(item.weeklyHigh),
    monthlyLow: parseFloat(item.monthlyLow),
    monthlyHigh: parseFloat(item.monthlyHigh),
    ivolDiff1M: parseFloat(item.ivolDiff1M),
    ivolDailyLow: parseFloat(item.ivolDailyLow),
    ivolDailyHigh: parseFloat(item.ivolDailyHigh),
  }));
}

