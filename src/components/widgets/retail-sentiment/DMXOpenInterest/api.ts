/**
 * DMX Open Interest API
 * 
 * Fetches open interest data from the getDmxOpenInterest API endpoint.
 */

// API Response types
export interface DMXOpenInterestResponse {
  status: string;
  Categories: { label: string }[];
  DataSet: {
    seriesname: string;
    initiallyHidden: string;
    data: { value: string }[];
  }[];
}

// Chart data point for Recharts
export interface OpenInterestDataPoint {
  date: string;
  [pair: string]: string | number;
}

// Request parameters
export interface FetchOpenInterestParams {
  dataType?: string;      // "All", "EURXXX", "XXXUSD", "Top 10 longVolume", etc.
  interval?: string;      // "1h", "4h", "1d", "1m"
  curSymbol?: string;     // Optional current symbol
}

/**
 * Map widget timeframe to API interval
 */
export const mapTimeframeToInterval = (timeframe: string): string => {
  switch (timeframe) {
    case 'monthly':
      return '1m';
    case 'daily':
      return '1d';
    case '4h':
      return '4h';
    case '1h':
      return '1h';
    default:
      return '1d';
  }
};

/**
 * Map widget filter mode to API DataType
 */
export const mapFilterModeToDataType = (
  filterMode: string,
  baseCurrency: string,
  quoteCurrency: string
): string => {
  // Handle top N filters
  if (filterMode === 'top5-long') return 'Top 5 longVolume';
  if (filterMode === 'top5-short') return 'Top 5 shortVolume';
  if (filterMode === 'top10-long') return 'Top 10 longVolume';
  if (filterMode === 'top10-short') return 'Top 10 shortVolume';
  
  // Handle currency-based filters with XXX (e.g., "USDXXX", "XXXUSD")
  if (filterMode.endsWith('XXX') && filterMode.length === 6) {
    // Format: "USDXXX" - filter by base currency
    return filterMode;
  }
  if (filterMode.startsWith('XXX') && filterMode.length === 6) {
    // Format: "XXXUSD" - filter by quote currency
    return filterMode;
  }
  
  // Handle currency-based filters
  if (filterMode === 'all') {
    // If both base and quote are set (not XXX), it's a specific pair - return 'All' to get all data
    // The widget will filter to show only that specific pair
    if (baseCurrency && baseCurrency !== 'XXX' && quoteCurrency && quoteCurrency !== 'XXX') {
      // Specific pair selected - return 'All' and let widget filter the pairs
      return 'All';
    }
    // If base currency is set (not XXX), filter by base currency
    if (baseCurrency && baseCurrency !== 'XXX') {
      return `${baseCurrency}XXX`;
    }
    // If quote currency is set, filter by quote currency
    if (quoteCurrency && quoteCurrency !== 'XXX') {
      return `XXX${quoteCurrency}`;
    }
    return 'All';
  }
  
  // Single pair filter - use base currency filter
  if (filterMode.length === 6 && !filterMode.includes('XXX')) {
    // It's a currency pair like EURUSD
    return `${filterMode.substring(0, 3)}XXX`;
  }
  
  return 'All';
};

/**
 * Fetch DMX Open Interest data from API
 */
export async function fetchOpenInterestData(
  params: FetchOpenInterestParams
): Promise<OpenInterestDataPoint[]> {
  const { dataType = 'All', interval = '1d', curSymbol } = params;
  
  const additionalSettings = `${dataType}|${interval}`;
  
  console.log('📊 [DMX Open Interest] Fetching data:', { additionalSettings, curSymbol });
  
  try {
    const response = await fetch('/api/retail-sentiment/dmx-open-interest', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        additionalSettings,
        getDetailWidget: true,
        curSymbol: curSymbol || '',
      }),
    });

    if (!response.ok) {
      console.error('📊 [DMX Open Interest] API error:', response.status);
      return [];
    }

    const result = await response.json();
    
    if (!result.success || !result.data) {
      console.error('📊 [DMX Open Interest] API error:', result.error);
      return [];
    }

    const apiData: DMXOpenInterestResponse = result.data;
    
    if (apiData.status !== 'success') {
      console.error('📊 [DMX Open Interest] API returned error status');
      return [];
    }

    // Transform API response to chart format
    return transformToChartData(apiData);
  } catch (error) {
    console.error('📊 [DMX Open Interest] Error:', error);
    return [];
  }
}

/**
 * Transform API response to Recharts-compatible format
 */
function transformToChartData(apiData: DMXOpenInterestResponse): OpenInterestDataPoint[] {
  const { Categories, DataSet } = apiData;
  
  if (!Categories || !DataSet || Categories.length === 0) {
    return [];
  }

  console.log('📊 [DMX Open Interest] Transforming data:', {
    categories: Categories.length,
    series: DataSet.length,
  });

  // Build chart data - one point per date with all series values
  const chartData: OpenInterestDataPoint[] = Categories.map((cat, index) => {
    const point: OpenInterestDataPoint = {
      date: cat.label,
    };

    // Add each series value for this date
    DataSet.forEach((series) => {
      const value = series.data[index]?.value;
      point[series.seriesname] = value ? parseFloat(value) : 0;
    });

    return point;
  });

  console.log('📊 [DMX Open Interest] Chart data built:', chartData.length, 'points');
  
  return chartData;
}

/**
 * Get list of series names from data
 */
export function getSeriesNames(data: OpenInterestDataPoint[]): string[] {
  if (data.length === 0) return [];
  
  const firstPoint = data[0];
  return Object.keys(firstPoint).filter(key => key !== 'date');
}
