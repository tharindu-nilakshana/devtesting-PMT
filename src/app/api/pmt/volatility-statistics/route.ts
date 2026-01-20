import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { API_CONFIG } from '@/lib/api';

/**
 * Transform API response to match component's expected format
 */
function transformApiResponse(apiData: any): any[] {
  if (!apiData.Volatility || !Array.isArray(apiData.Volatility)) {
    return [];
  }

  return apiData.Volatility.map((item: any) => ({
    date: item.date || '',
    last: item.close?.toString() || '0',
    open: item.open?.toString() || '0',
    high: item.high?.toString() || '0',
    low: item.low?.toString() || '0',
    percent: item.CloseToOpen || 0,
    openToOpen: item.OpenToOpen || 0,
    highToLow: item.HighToLow || 0,
    atr: item.ATR || 0,
  }));
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { symbol } = body;

    if (!symbol) {
      return NextResponse.json(
        { success: false, error: 'Symbol is required' },
        { status: 400 }
      );
    }

    // Get auth token from cookies
    const cookieStore = await cookies();
    const authToken = cookieStore.get('pmt_auth_token')?.value;

    if (!authToken) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Call external API
    const UPSTREAM = API_CONFIG.UPSTREAM_API;
    const endpoint = new URL('/getVolatilityStatistics', UPSTREAM).toString();

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({ symbol }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [Volatility Statistics API] Error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });
      return NextResponse.json(
        { success: false, error: `API returned ${response.status}` },
        { status: response.status }
      );
    }

    const apiData = await response.json();

    if (apiData.Status !== 'Success') {
      return NextResponse.json(
        { success: false, error: apiData.message || 'API returned unsuccessful status' },
        { status: 400 }
      );
    }

    // Transform the data
    const transformedData = transformApiResponse(apiData);

    return NextResponse.json({
      success: true,
      data: transformedData,
    });
  } catch (error) {
    console.error('❌ [Volatility Statistics API] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

