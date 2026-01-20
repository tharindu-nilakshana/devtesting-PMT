import { NextRequest, NextResponse } from 'next/server';
import { API_CONFIG } from '../../../../lib/api';
import { cookies } from 'next/headers';

const UPSTREAM = API_CONFIG.UPSTREAM_API;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { timeframe, currencies, symbol = 'EURUSD' } = body;

    // Validate input
    if (!timeframe) {
      return NextResponse.json(
        { error: 'Timeframe is required' },
        { status: 400 }
      );
    }

    // Map frontend timeframes to backend timeframes
    const timeframeMap: Record<string, string> = {
      'TW': 'CurrentWeek',
      'TD': 'today',
    };
    const mappedTimeframe = timeframeMap[timeframe] || timeframe;

    const defaultCurrencies = ['USD','EUR','JPY','GBP','AUD','CHF','CAD','NZD'];
    const selectedCurrencies = currencies || defaultCurrencies;

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

    // Call real PMT API through the proxy endpoint
    const apiUrl = new URL('getCurrencyStrength', UPSTREAM).toString();
    
    console.log('📊 [Currency Strength API] Calling real API:', {
      url: apiUrl,
      timeframe,
      mappedTimeframe,
      symbol,
      requestBody: { symbol, Timeframe: mappedTimeframe },
      hasAuth: !!authToken
    });

    const apiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      body: JSON.stringify({
        symbol,
        Timeframe: mappedTimeframe
      }),
      cache: 'no-store',
    });

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      console.error('❌ [Currency Strength API] Real API error:', {
        status: apiResponse.status,
        statusText: apiResponse.statusText,
        error: errorText
      });
      throw new Error(`API request failed: ${apiResponse.status} ${apiResponse.statusText}`);
    }

    const apiData = await apiResponse.json();
    
    console.log('✅ [Currency Strength API] Real API response received:', {
      hasData: !!apiData,
      hasCslabel: !!apiData?.cslabel,
      currencies: Object.keys(apiData || {}).filter(k => k !== 'cslabel' && k !== 'ValueMD5')
    });

    return NextResponse.json({
      success: true,
      data: apiData,
      timeframe: timeframe,
      currencies: selectedCurrencies,
      timestamp: Date.now()
    });

  } catch (error) {
    console.error('❌ [Currency Strength API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
