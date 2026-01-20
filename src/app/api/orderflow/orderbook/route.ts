import { NextRequest, NextResponse } from 'next/server';
import { API_CONFIG } from '../../../../lib/api';
import { cookies } from 'next/headers';

const UPSTREAM = API_CONFIG.UPSTREAM_API;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol') || 'EURUSD';
    const widgetTitle = searchParams.get('widgetTitle') || 'orderbook';

    // Get authentication token from cookies
    let authToken = '';
    try {
      const cookieStore = await cookies();
      const token = cookieStore.get('pmt_auth_token')?.value;
      if (token) {
        authToken = token;
      }
    } catch (error) {
      console.warn('Failed to get auth token from cookies:', error);
    }

    // Call real PMT API
    const apiUrl = new URL('getPositionbookOrderbook', UPSTREAM).toString();
    
    console.log('📊 [Orderbook API] Calling real API:', {
      url: apiUrl,
      symbol,
      widgetTitle,
      hasAuth: !!authToken
    });

    const apiResponse = await fetch(`${apiUrl}?Symbols=${symbol}&WidgetTitle=${widgetTitle}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      cache: 'no-store',
    });

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      console.error('❌ [Orderbook API] Real API error:', {
        status: apiResponse.status,
        statusText: apiResponse.statusText,
        error: errorText
      });
      throw new Error(`API request failed: ${apiResponse.status} ${apiResponse.statusText}`);
    }

    const apiData = await apiResponse.json();
    
    console.log('✅ [Orderbook API] Real API response received:', {
      hasData: !!apiData,
      status: apiData?.status,
      count: apiData?.count
    });

    return NextResponse.json(apiData);

  } catch (error) {
    console.error('❌ [Orderbook API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

