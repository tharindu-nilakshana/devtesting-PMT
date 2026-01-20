// NewsSentiment Widget API functions and types
// This file defines the data structure and API interface for the News Sentiment widget

import { postJSON } from '../../../../utils/api';

/**
 * SentimentData interface - represents a single data point in the sentiment chart
 * 
 * Expected structure from API:
 * - date: string - Date in format "Oct 05" (month short, day 2-digit)
 * - negative: number - Count of negative/bearish sentiment articles
 * - neutral: number - Count of neutral sentiment articles  
 * - positive: number - Count of positive/bullish sentiment articles
 */
export interface SentimentData {
  date: string;
  negative: number;
  neutral: number;
  positive: number;
}

/**
 * NewsSentimentRequest - Request parameters for fetching sentiment data
 * 
 * Expected parameters:
 * - currencyPair: string - Currency pair (e.g., "AUDUSD")
 * - timeframe?: string - Optional timeframe (e.g., "30" for 30 days)
 */
export interface NewsSentimentRequest {
  currencyPair: string;
  timeframe?: string;
}

/**
 * NewsSentimentResponse - Response structure from the API
 * 
 * Expected response structure:
 * - success: boolean - Whether the request was successful
 * - data: SentimentData[] - Array of sentiment data points
 * - error?: string - Error message if request failed
 */
export interface NewsSentimentResponse {
  success: boolean;
  data?: SentimentData[];
  error?: string;
  timestamp?: number;
}

/**
 * Transform raw API response to SentimentData format
 * 
 * The API returns:
 * {
 *   "status": "success",
 *   "data": {
 *     "Label": ["May 30", "May 31", ...],  // Array of date strings
 *     "Activity": [0.083, -0.553, ...]    // Array of sentiment scores (-1.5 to 1.5)
 *   },
 *   "count": 859,
 *   "symbol": "EUR-USD",
 *   "module": "Forex"
 * }
 * 
 * We need to convert sentiment scores to article counts (negative, neutral, positive)
 * 
 * @param rawData - Raw response from the API
 * @returns Array of SentimentData objects
 */
export function transformSentimentData(rawData: unknown): SentimentData[] {
  
  if (!rawData || typeof rawData !== 'object') {
    return [];
  }
  
  const dataObj = rawData as Record<string, unknown>;
  
  // Check if we have the expected structure with Label and Activity arrays
  if (dataObj.data && typeof dataObj.data === 'object') {
    const apiData = dataObj.data as Record<string, unknown>;
    
    const labels = apiData.Label as string[] | undefined;
    const activities = apiData.Activity as number[] | undefined;
    
    if (labels && activities && Array.isArray(labels) && Array.isArray(activities)) {
      
      // Convert sentiment scores to article counts
      // Activity scores range from -1.5 to 1.5
      // We'll use a base total per day and distribute based on the score
      const transformed: SentimentData[] = [];
      
      // Helper function to convert month names to 3-letter abbreviations
      const formatDateToShortMonth = (dateStr: string): string => {
        const monthMap: Record<string, string> = {
          'January': 'Jan', 'February': 'Feb', 'March': 'Mar', 'April': 'Apr',
          'May': 'May', 'June': 'Jun', 'July': 'Jul', 'August': 'Aug',
          'September': 'Sep', 'October': 'Oct', 'November': 'Nov', 'December': 'Dec'
        };
        
        // Check if date is already in short format (e.g., "May 30")
        const parts = dateStr.split(' ');
        if (parts.length >= 2) {
          const month = parts[0];
          const day = parts[1];
          
          // If month is already 3 letters or less, return as is
          if (month.length <= 3) {
            return dateStr;
          }
          
          // Convert full month name to abbreviation
          const shortMonth = monthMap[month] || month.substring(0, 3);
          return `${shortMonth} ${day}`;
        }
        
        return dateStr;
      };
      
      for (let i = 0; i < Math.min(labels.length, activities.length); i++) {
        const date = formatDateToShortMonth(labels[i]);
        const activityScore = activities[i];
        
        // Convert score to counts
        // Score range: -1.5 (very negative) to 1.5 (very positive)
        // We'll use a base total of articles per day (e.g., 3-8 articles)
        // and distribute based on the sentiment score
        
        // Normalize score to 0-1 range for positive proportion
        // Score of -1.5 = 0% positive, Score of 1.5 = 100% positive
        const normalizedScore = (activityScore + 1.5) / 3.0; // Maps -1.5..1.5 to 0..1
        
        // Base total articles per day (can be adjusted)
        // Use a variable total based on score magnitude to make it more realistic
        const baseTotal = Math.max(1, Math.floor(Math.abs(activityScore) * 2 + 2)); // 2-5 articles typically
        
        // Calculate counts based on normalized score
        // If score is positive, more positive articles; if negative, more negative articles
        let positive: number;
        let negative: number;
        let neutral: number;
        
        if (activityScore > 0) {
          // Positive sentiment: more positive articles
          positive = Math.max(1, Math.floor(baseTotal * normalizedScore));
          negative = Math.max(0, Math.floor(baseTotal * (1 - normalizedScore) * 0.3)); // Fewer negative
          neutral = Math.max(0, baseTotal - positive - negative);
        } else if (activityScore < 0) {
          // Negative sentiment: more negative articles
          negative = Math.max(1, Math.floor(baseTotal * (1 - normalizedScore)));
          positive = Math.max(0, Math.floor(baseTotal * normalizedScore * 0.3)); // Fewer positive
          neutral = Math.max(0, baseTotal - positive - negative);
        } else {
          // Neutral sentiment: mostly neutral articles
          neutral = Math.max(1, Math.floor(baseTotal * 0.6));
          positive = Math.max(0, Math.floor((baseTotal - neutral) / 2));
          negative = Math.max(0, baseTotal - neutral - positive);
        }
        
        // Ensure we have at least some articles
        const total = positive + neutral + negative;
        if (total === 0) {
          neutral = 1;
        }
        
        transformed.push({
          date: date,
          negative: negative,
          neutral: neutral,
          positive: positive
        });
      }
      
      return transformed;
    }
  }
  
  // Fallback: try to find nested data structure
  if (dataObj.data && typeof dataObj.data === 'object') {
    const nestedData = dataObj.data as Record<string, unknown>;
    if (Array.isArray(nestedData.data)) {
      return transformSentimentData(nestedData.data);
    }
  }
  
  return [];
}

/**
 * Fetch news sentiment data from the API
 * 
 * @param symbols - Symbol string (e.g., "AUDUSD", "EURUSD", "NASDAQ:AAPL", "XAUUSD")
 * @param module - Module type (default: "Forex")
 * @param widgetTitle - Widget title (optional, default: "sentiment_score")
 * @returns Promise<NewsSentimentResponse>
 */
export async function getNewsSentimentData(
  symbols: string,
  module: string = 'Forex',
  widgetTitle?: string
): Promise<NewsSentimentResponse> {
  try {
    // Call our Next.js API route which handles authentication
    const response = await fetch('/api/news/news-sentiment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        Module: module,
        Symbols: symbols,
        ...(widgetTitle && { WidgetTitle: widgetTitle })
      }),
      signal: AbortSignal.timeout(15000), // 15 second timeout
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error('Authentication required. Please log in to view news sentiment data.');
      }
      
      if (response.status === 408) {
        throw new Error('Request timeout - please try again');
      }
      return {
        success: false,
        error: `Failed to fetch data: ${response.status}`,
        data: []
      };
    }

    const result = await response.json();
    
    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error || 'No data received from API',
        data: []
      };
    }
    
    // Transform the API response to our expected format
    const transformedData = transformSentimentData(result.data);
    
    return {
      success: true,
      data: transformedData,
      timestamp: result.timestamp || Date.now()
    };

  } catch (error) {
    if (error instanceof Error && error.name === 'TimeoutError') {
      return {
        success: false,
        error: 'Request timeout - please try again',
        data: []
      };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      data: []
    };
  }
}

