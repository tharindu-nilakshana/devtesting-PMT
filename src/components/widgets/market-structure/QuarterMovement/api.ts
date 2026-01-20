/* eslint-disable @typescript-eslint/no-explicit-any */

export interface QuarterMovementByDateResponse {
  status: string;
  message: string;
  symbol: string;
  date: string;
  data: Array<{
    open: number;
    close: number;
  }>;
  count: number;
}

export interface QuarterMovementByRangeResponse {
  status: string;
  message: string;
  symbol: string;
  startDate: string;
  endDate: string;
  data: Array<{
    high: number;
    low: number;
  }>;
  count: number;
}

export interface QuarterData {
  quarter: string;
  startPrice: number;
  endPrice: number;
  high: number;
  low: number;
  movement: number;
  movementPercent: number;
  timestamp: number;
  endTimestamp: number;
}

export interface QuarterMovementData {
  quarters: QuarterData[];
  currentQuarter: {
    quarter: string;
    startPrice: number;
    currentPrice: number;
    movement: number;
    movementPercent: number;
    high: number;
    low: number;
    startTimestamp: number;
  };
}

/**
 * Fetch data for a specific date (returns open/close)
 */
export async function fetchQuarterByDate(
  symbol: string,
  date: string
): Promise<QuarterMovementByDateResponse> {
  const params = new URLSearchParams({
    symbol,
    date,
  });

  const response = await fetch(`/api/pmt/getQuarterMovementByDate?${params.toString()}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch quarter data: ${response.status} ${errorText}`);
  }

  return response.json();
}

/**
 * Fetch data for a date range (returns high/low)
 */
export async function fetchQuarterByRange(
  symbol: string,
  startDate: string,
  endDate: string
): Promise<QuarterMovementByRangeResponse> {
  const params = new URLSearchParams({
    symbol,
    startDate,
    endDate,
  });

  const response = await fetch(`/api/pmt/getQuarterMovementByRange?${params.toString()}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch quarter range: ${response.status} ${errorText}`);
  }

  return response.json();
}
