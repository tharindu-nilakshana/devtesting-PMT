export interface COTPositioningData {
  label: string;
  value: number;
  color?: string;
}

export interface COTPositioningResponse {
  success: boolean;
  data?: {
    long: number;
    short: number;
    chartdata?: COTPositioningData[];
  };
  chartdata?: COTPositioningData[];
  long?: number;
  short?: number;
  error?: string;
  fallback?: boolean;
}

// Client-side function that calls the Next.js API route
export async function getCOTPositioningData(
  symbolPart?: string,
  owner?: string
): Promise<COTPositioningResponse | null> {
  // Ensure we're on the client side
  if (typeof window === 'undefined') {
    console.log('[COT API] Skipping fetch during SSR');
    return null;
  }

  try {
    console.log('[COT API] Fetching data:', { symbolPart, owner });
    
    // Call our Next.js API route which handles authentication
    const response = await fetch('/api/cot/cot-positioning', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Ensure cookies are sent
      body: JSON.stringify({
        symbolPart: symbolPart || 'EUR',
        owner: owner || 'Dealer'
      }),
    });

    console.log('[COT API] Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error('[COT API] Failed to fetch:', response.status, errorText);
      return {
        success: false,
        error: `API returned ${response.status}`,
        fallback: true
      };
    }

    const data = await response.json();
    console.log('[COT API] Response data:', data);
    
    return {
      success: true,
      ...data,
      // Ensure we have the expected structure
      data: data.data || {
        long: data.long || 0,
        short: data.short || 0,
        chartdata: data.chartdata || []
      },
      chartdata: data.chartdata || [],
      long: data.long,
      short: data.short,
      error: data.error,
      fallback: data.fallback
    };

  } catch (error) {
    if (error instanceof Error && error.name === 'TimeoutError') {
      console.warn('[COT API] Fetch timed out after 15 seconds');
    } else {
      console.error('[COT API] Error fetching data:', error);
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      fallback: true
    };
  }
}

// Client-side function for data processing
export async function getCOTPositioningDataForClient(
  symbolPart?: string,
  owner?: string
): Promise<COTPositioningData[] | null> {
  const result = await getCOTPositioningData(symbolPart, owner);
  
  if (!result || !result.success) {
    return null;
  }

  // Extract chart data from various possible response formats
  if (result.chartdata && Array.isArray(result.chartdata)) {
    return result.chartdata;
  }
  
  if (result.data?.chartdata && Array.isArray(result.data.chartdata)) {
    return result.data.chartdata;
  }
  
  // Fallback: create chart data from long/short values
  if (result.long !== undefined && result.short !== undefined) {
    return [
      { label: 'Long', value: result.long, color: '#01B298' },
      { label: 'Short', value: result.short, color: '#FD2E64' }
    ];
  }
  
  if (result.data?.long !== undefined && result.data?.short !== undefined) {
    return [
      { label: 'Long', value: result.data.long, color: '#01B298' },
      { label: 'Short', value: result.data.short, color: '#FD2E64' }
    ];
  }
  
  return null;
}
