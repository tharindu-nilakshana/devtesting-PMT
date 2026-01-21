import { BondYieldsRequest, BondYieldsResponse, ChartDataPoint, TimeRangePreset } from '@/types/bond';

// Use local API route to handle CORS
const API_ENDPOINT = '/api/fixedincome/bondyields';

export async function fetchBondYields(params: BondYieldsRequest): Promise<BondYieldsResponse> {
  console.log('API Request URL:', API_ENDPOINT);
  console.log('API Request Body:', JSON.stringify(params));

  const response = await fetch(API_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });

  const data = await response.json();
  console.log('API Response Status:', response.status);
  console.log('API Response Data:', data);

  if (!response.ok) {
    throw new Error(data.error || `API Error: ${response.status} ${response.statusText}`);
  }

  return data;
}

// Transform API response to chart-compatible format
export function transformToChartData(response: BondYieldsResponse): ChartDataPoint[] {
  if (!response.data || !Array.isArray(response.data)) {
    console.log('No data array in response');
    return [];
  }

  // Log first item to see actual field names
  if (response.data.length > 0) {
    console.log('First data point:', response.data[0]);
  }

  return response.data
    .map(point => {
      // API returns: Date, Close, Open, High, Low (Close is the yield value)
      const p = point as unknown as Record<string, unknown>;
      const dateValue = p.Date || p.date || '';
      // Use Close as the yield value (it's a string like '3.6090')
      const yieldValue = p.Close || p.close || p.Yield || p.yield || 0;

      return {
        time: String(dateValue),
        value: parseFloat(String(yieldValue)),
      };
    })
    .filter(point => point.time && !isNaN(point.value) && point.value !== 0)
    .sort((a, b) => a.time.localeCompare(b.time)); // Ensure chronological order
}

// Helper to format date as YYYY-MM-DD
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

// Helper to get date range based on preset
export function getDateRange(preset: TimeRangePreset): { start: string; end: string } {
  const end = new Date();
  const start = new Date();

  switch (preset) {
    case '1D':
      start.setDate(start.getDate() - 1);
      break;
    case '1W':
      start.setDate(start.getDate() - 7);
      break;
    case '1M':
      start.setMonth(start.getMonth() - 1);
      break;
    case '3M':
      start.setMonth(start.getMonth() - 3);
      break;
    case '6M':
      start.setMonth(start.getMonth() - 6);
      break;
    case '1Y':
      start.setFullYear(start.getFullYear() - 1);
      break;
    case 'YTD':
      start.setMonth(0, 1); // January 1st of current year
      break;
    case 'ALL':
      start.setFullYear(start.getFullYear() - 5); // 5 years back for ALL
      break;
  }

  return {
    start: formatDate(start),
    end: formatDate(end),
  };
}
