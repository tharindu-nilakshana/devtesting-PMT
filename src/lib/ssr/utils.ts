/* eslint-disable @typescript-eslint/no-explicit-any */
import { cookies } from 'next/headers';
import { API_CONFIG } from '@/lib/api';
import type { SSRFetchConfig, SSRFetchResult } from './types';

/**
 * Get SSR configuration from cookies
 */
export async function getSSRConfig(): Promise<SSRFetchConfig | null> {
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get('pmt_auth_token')?.value;
    
    if (!authToken) {
      console.log('❌ [SSR] No auth token found');
      return null;
    }

    return {
      authToken,
      timeout: 8000,
    };
  } catch (error) {
    console.error('❌ [SSR] Error getting config:', error);
    return null;
  }
}

/**
 * Generic SSR fetch wrapper with error handling
 */
export async function ssrFetch<T = any>(
  endpoint: string,
  body: Record<string, any>,
  config: SSRFetchConfig,
  processor?: (data: any) => T
): Promise<SSRFetchResult<T>> {
  try {
    const response = await fetch(`${API_CONFIG.UPSTREAM_API}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.authToken}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(config.timeout || 8000),
    });

    if (!response.ok) {
      return {
        success: false,
        data: null,
        error: `HTTP ${response.status}`,
      };
    }

    const rawData = await response.json();
    const processedData = processor ? processor(rawData) : rawData;

    return {
      success: true,
      data: processedData,
    };
  } catch (error) {
    console.error(`❌ [SSR] Error fetching ${endpoint}:`, error);
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
