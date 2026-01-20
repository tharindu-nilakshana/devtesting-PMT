// Client-side API functions for Analyst Recommendations widget

export interface ApiAnalystRecommendationsResponse {
  success: boolean;
  symbol: string;
  Date: Array<{ label: string }>;
  buy: Array<{ value: string }>;
  hold: Array<{ value: string }>;
  sell: Array<{ value: string }>;
  strongBuy: Array<{ value: string; showValue?: number }>;
  strongSell: Array<{ value: string; showValue?: number }>;
}

export interface ApiRecommendationsResponse {
  success: boolean;
  data: ApiAnalystRecommendationsResponse;
}

export interface RatingCounts {
  'Strong Buy': number;
  'Buy': number;
  'Hold': number;
  'Sell': number;
  'Strong Sell': number;
}

export interface HistoricalDataPoint {
  date: string;
  strongBuy: number;
  buy: number;
  hold: number;
  sell: number;
  strongSell: number;
}

export interface TransformedRecommendations {
  ratingCounts: RatingCounts;
  consensusRating: string;
  historicalData: HistoricalDataPoint[];
}

// Format date from API format (YYYY-MM-DD) to display format (MMM YYYY)
export function formatDateForDisplay(dateString: string): string {
  try {
    const date = new Date(dateString);
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const year = date.getFullYear();
    return `${month} ${year}`;
  } catch (error) {
    return dateString;
  }
}

// Calculate consensus rating from rating counts
export function calculateConsensusRating(ratingCounts: RatingCounts): string {
  const { 'Strong Buy': strongBuy, 'Buy': buy, 'Hold': hold, 'Sell': sell, 'Strong Sell': strongSell } = ratingCounts;
  
  // Calculate weighted score
  const score = (strongBuy * 2) + (buy * 1) + (hold * 0) - (sell * 1) - (strongSell * 2);
  const total = strongBuy + buy + hold + sell + strongSell;
  
  if (total === 0) return 'Hold';
  
  const averageScore = score / total;
  
  if (averageScore >= 1.5) return 'Strong Buy';
  if (averageScore >= 0.5) return 'Buy';
  if (averageScore >= -0.5) return 'Hold';
  if (averageScore >= -1.5) return 'Sell';
  return 'Strong Sell';
}

// Transform API response to component format
export function transformApiRecommendationsResponse(apiData: ApiAnalystRecommendationsResponse): TransformedRecommendations {
  // Get the most recent data point (last index) for current rating counts
  const lastIndex = apiData.Date.length - 1;
  
  const ratingCounts: RatingCounts = {
    'Strong Buy': parseInt(apiData.strongBuy[lastIndex]?.value || '0', 10),
    'Buy': parseInt(apiData.buy[lastIndex]?.value || '0', 10),
    'Hold': parseInt(apiData.hold[lastIndex]?.value || '0', 10),
    'Sell': parseInt(apiData.sell[lastIndex]?.value || '0', 10),
    'Strong Sell': parseInt(apiData.strongSell[lastIndex]?.value || '0', 10),
  };
  
  const consensusRating = calculateConsensusRating(ratingCounts);
  
  // Transform historical data
  const historicalData: HistoricalDataPoint[] = apiData.Date.map((dateItem, index) => ({
    date: formatDateForDisplay(dateItem.label),
    strongBuy: parseInt(apiData.strongBuy[index]?.value || '0', 10),
    buy: parseInt(apiData.buy[index]?.value || '0', 10),
    hold: parseInt(apiData.hold[index]?.value || '0', 10),
    sell: parseInt(apiData.sell[index]?.value || '0', 10),
    strongSell: parseInt(apiData.strongSell[index]?.value || '0', 10),
  }));
  
  return {
    ratingCounts,
    consensusRating,
    historicalData,
  };
}

// Fetch analyst recommendations data
export async function fetchAnalystRecommendations(symbol: string): Promise<ApiRecommendationsResponse | null> {
  try {
    console.log('📊 [Analyst Recommendations API] Fetching recommendations for:', symbol);
    const response = await fetch('/api/pmt/get-analyst-recommendations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ symbol }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ [Analyst Recommendations API] HTTP error:', response.status, errorData.error);
      return null;
    }

    const result = await response.json();
    console.log('📊 [Analyst Recommendations API] Response received:', result);
    
    if (!result.success || !result.data) {
      console.error('❌ [Analyst Recommendations API] Unsuccessful response:', result);
      return null;
    }

    console.log('✅ [Analyst Recommendations API] Data extracted:', result.data);
    return result;
  } catch (error) {
    console.error('❌ [Analyst Recommendations API] Fetch error:', error);
    return null;
  }
}

