// Client-side API functions for Recent Analyst Actions widget

// API Response structure from getRecentAnalystActions endpoint
export interface ApiAnalystAction {
  Date: string;                    // Date in "YYYY-MM-DD" format
  company: string;                  // Firm/company name
  fromGrade: string;                // Previous rating (can be empty string)
  toGrade: string;                  // Current rating
  action: 'main' | 'init' | 'down' | 'up' | 'reit';  // Action type
  actionDisplay: string;            // Display text for action
  actionColor: string;               // Hex color for action
}

export interface ApiRecentAnalystActionsResponse {
  success: boolean;
  count: number;
  data: ApiAnalystAction[];
}

// Widget data structure
export interface Recommendation {
  firm: string;
  analyst: string;
  date: string;
  rating: 'Strong Buy' | 'Buy' | 'Hold' | 'Sell' | 'Strong Sell';
  priceTarget: number;
  change?: 'upgrade' | 'downgrade' | 'maintain';
}

export interface RecentAnalystActionsData {
  recommendations: Recommendation[];
  currentPrice: number;  // Not provided by API, will be 0
}

// Map API action to widget change type
function mapActionToChange(action: string): 'upgrade' | 'downgrade' | 'maintain' | undefined {
  switch (action) {
    case 'up':
      return 'upgrade';
    case 'down':
      return 'downgrade';
    case 'main':
      return 'maintain';
    case 'init':
      return 'upgrade'; // Initializing is treated as upgrade
    case 'reit':
      return 'maintain'; // Reit is treated as maintain
    default:
      return undefined;
  }
}

// Map API grade to widget rating type
function mapGradeToRating(grade: string): 'Strong Buy' | 'Buy' | 'Hold' | 'Sell' | 'Strong Sell' {
  const normalizedGrade = grade.trim().toLowerCase();
  
  // Strong Buy
  if (normalizedGrade.includes('strong buy') || normalizedGrade === 'strong buy') {
    return 'Strong Buy';
  }
  
  // Strong Sell
  if (normalizedGrade.includes('strong sell') || normalizedGrade === 'strong sell') {
    return 'Strong Sell';
  }
  
  // Buy equivalents
  if (
    normalizedGrade === 'buy' ||
    normalizedGrade.includes('outperform') ||
    normalizedGrade.includes('overweight') ||
    normalizedGrade.includes('positive') ||
    normalizedGrade.includes('sector outperform')
  ) {
    return 'Buy';
  }
  
  // Sell equivalents
  if (
    normalizedGrade === 'sell' ||
    normalizedGrade.includes('underperform') ||
    normalizedGrade.includes('underweight') ||
    normalizedGrade.includes('negative')
  ) {
    return 'Sell';
  }
  
  // Hold equivalents (default)
  if (
    normalizedGrade === 'hold' ||
    normalizedGrade === 'neutral' ||
    normalizedGrade === ''
  ) {
    return 'Hold';
  }
  
  // Default to Hold if no match
  return 'Hold';
}

// Transform API response to widget data structure
export function transformApiResponse(apiData: ApiRecentAnalystActionsResponse): RecentAnalystActionsData | null {
  if (!apiData.success || !apiData.data || !Array.isArray(apiData.data)) {
    return null;
  }

  const recommendations: Recommendation[] = apiData.data.map((action) => ({
    firm: action.company || 'N/A',
    analyst: '', // API doesn't provide analyst name
    date: action.Date || '',
    rating: mapGradeToRating(action.toGrade || ''),
    priceTarget: 0, // API doesn't provide price target
    change: mapActionToChange(action.action),
  }));

  return {
    recommendations,
    currentPrice: 0, // API doesn't provide current price
  };
}

// Fetch recent analyst actions data
export async function fetchRecentAnalystActions(): Promise<RecentAnalystActionsData | null> {
  try {
    console.log('📋 [Recent Analyst Actions] Fetching data...');

    const response = await fetch('/api/pmt/get-recent-analyst-actions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({}),
      signal: AbortSignal.timeout(15000), // 15 second timeout
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        console.warn('🔐 [Recent Analyst Actions] Authentication required');
        throw new Error('Authentication required. Please log in to view recent analyst actions.');
      }
      
      if (response.status === 408) {
        console.warn('⏰ [Recent Analyst Actions] Request timeout');
        throw new Error('Request timeout - please try again');
      }

      const errorData = await response.json().catch(() => ({}));
      console.error('❌ [Recent Analyst Actions] API returned error:', response.status, errorData.error);
      throw new Error(errorData.error || `Failed to fetch recent analyst actions: ${response.status}`);
    }

    const result = await response.json();
    
    if (!result.success || !result.data) {
      console.warn('⚠️ [Recent Analyst Actions] API returned unsuccessful response:', result);
      return null;
    }

    // Transform the API response
    const transformedData = transformApiResponse(result.data);
    
    if (!transformedData) {
      console.warn('⚠️ [Recent Analyst Actions] Failed to transform API response');
      return null;
    }

    console.log('✅ [Recent Analyst Actions] Data fetched successfully:', {
      recommendationsCount: transformedData.recommendations.length,
    });

    return transformedData;
  } catch (error) {
    if (error instanceof Error && error.name === 'TimeoutError') {
      console.error('⏰ [Recent Analyst Actions] Request timeout');
      throw new Error('Request timeout - please try again');
    }
    console.error('❌ [Recent Analyst Actions] Error fetching data:', error);
    throw error;
  }
}

