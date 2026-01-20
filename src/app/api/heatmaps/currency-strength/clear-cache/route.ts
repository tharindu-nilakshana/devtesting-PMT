import { NextRequest, NextResponse } from 'next/server';
import { API_CONFIG } from '../../../../../lib/api';
import { cookies } from 'next/headers';

const UPSTREAM = API_CONFIG.UPSTREAM_API;

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { res: timeframe } = body;

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

    // Get API key from request headers
    const apiKey = request.headers.get('x-api-key');

    // Call real PMT API to clear cache
    const apiUrl = new URL('cleanCurrencyStrengthCache', UPSTREAM).toString();
    
    console.log('🗑️ [Currency Strength Cache Clear] Calling real API:', {
      url: apiUrl,
      timeframe,
      mappedTimeframe,
      hasAuth: !!authToken,
      hasApiKey: !!apiKey
    });

    const apiResponse = await fetch(apiUrl, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        ...(apiKey ? { 'x-api-key': apiKey } : {}),
      },
      body: JSON.stringify({
        res: mappedTimeframe
      }),
      cache: 'no-store',
    });

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      console.error('❌ [Currency Strength Cache Clear] Real API error:', {
        status: apiResponse.status,
        statusText: apiResponse.statusText,
        error: errorText
      });
      throw new Error(`Cache clear API request failed: ${apiResponse.status} ${apiResponse.statusText}`);
    }

    const apiData = await apiResponse.json();
    
    console.log('✅ [Currency Strength Cache Clear] Real API response received:', {
      success: true,
      timeframe
    });

    return NextResponse.json({
      success: true,
      timeframe: timeframe,
      timestamp: Date.now()
    });

  } catch (error) {
    console.error('❌ [Currency Strength Cache Clear] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
