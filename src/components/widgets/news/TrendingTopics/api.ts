// TrendingTopics Widget API functions and types
// This file defines the data structure and API interface for the Trending Topics widget

import { postJSON } from '../../../../utils/api';

/**
 * Tag interface - represents a trending topic
 */
export interface Tag {
  id: string;
  text: string;
  weight: number; // 1-5, determines size and importance
  category: string;
}

/**
 * API Response structure from getNewsTagCloud
 */
interface NewsTagCloudResponse {
  status: string;
  data: Array<{
    tags: string; // Comma-separated string of tags
    category: string;
  }>;
  count: number;
}

/**
 * TrendingTopicsResponse - Response structure from our API route
 */
export interface TrendingTopicsResponse {
  success: boolean;
  data?: Tag[];
  error?: string;
  timestamp?: number;
}

/**
 * Transform raw API response to Tag[] format
 * 
 * The API returns:
 * {
 *   "status": "success",
 *   "data": [
 *     {
 *       "tags": "INWT,Inwit,guidance cut,dividend,EBITDA,...",
 *       "category": "Stocks"
 *     },
 *     ...
 *   ],
 *   "count": 15
 * }
 * 
 * We need to:
 * 1. Parse comma-separated tags into individual tags
 * 2. Assign weights (1-5) based on position/frequency
 * 3. Create Tag objects with id, text, weight, category
 * 
 * @param rawData - Raw response from the API
 * @returns Array of Tag objects
 */
export function transformTagCloudData(rawData: unknown): Tag[] {
  if (!rawData || typeof rawData !== 'object') {
    return [];
  }

  const dataObj = rawData as Record<string, unknown>;

  // Check if we have the expected structure
  if (dataObj.data && Array.isArray(dataObj.data)) {
    const apiData = dataObj.data as Array<{ tags: string; category: string }>;
    const transformed: Tag[] = [];
    let tagIdCounter = 1;

    // Track tag frequency across all entries to determine weights
    const tagFrequency: Record<string, number> = {};
    const tagCategories: Record<string, string> = {};

    // First pass: collect all tags and their frequencies
    apiData.forEach((entry) => {
      const tags = entry.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
      tags.forEach((tag) => {
        tagFrequency[tag] = (tagFrequency[tag] || 0) + 1;
        // Use the first category we encounter for each tag
        if (!tagCategories[tag]) {
          tagCategories[tag] = entry.category;
        }
      });
    });

    // Calculate max frequency for weight normalization
    const maxFrequency = Math.max(...Object.values(tagFrequency), 1);

    // Second pass: create Tag objects with weights based on frequency
    Object.entries(tagFrequency).forEach(([tag, frequency]) => {
      // Normalize frequency to weight (1-5)
      // More frequent tags get higher weights
      let weight: number;
      if (frequency >= maxFrequency * 0.8) {
        weight = 5; // Highest frequency
      } else if (frequency >= maxFrequency * 0.6) {
        weight = 4;
      } else if (frequency >= maxFrequency * 0.4) {
        weight = 3;
      } else if (frequency >= maxFrequency * 0.2) {
        weight = 2;
      } else {
        weight = 1;
      }

      transformed.push({
        id: tagIdCounter.toString(),
        text: tag,
        weight: weight,
        category: tagCategories[tag] || 'general'
      });

      tagIdCounter++;
    });

    return transformed;
  }

  return [];
}

/**
 * Fetch trending topics from the API
 * 
 * @param limit - Maximum number of tag cloud entries to fetch (default: 15)
 * @returns Promise<TrendingTopicsResponse>
 */
export async function getTrendingTopicsData(
  limit: number = 15
): Promise<TrendingTopicsResponse> {
  try {
    // Call our Next.js API route which handles authentication
    const response = await fetch('/api/news/trending-topics', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        limit: limit
      }),
      signal: AbortSignal.timeout(15000), // 15 second timeout
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error('Authentication required. Please log in to view trending topics.');
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
    const transformedData = transformTagCloudData(result.data);

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

