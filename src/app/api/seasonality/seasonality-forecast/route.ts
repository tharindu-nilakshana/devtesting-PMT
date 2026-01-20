import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { API_CONFIG } from '@/lib/api';

export interface SeasonalityForecastResponse {
  success: boolean;
  symbol: string;
  baseYear: string;
  dataCount: number;
  chartDate: string[];
  maxval: number;
  minval: number;
  chartData: string[];
  summary: {
    totalPredictions: number;
    maxSeasonalPrognosis: number;
    minSeasonalPrognosis: number;
    dateRange: {
      startDate: string;
      endDate: string;
    };
  };
  error?: string;
}

export async function POST(request: Request) {
  // console.log('🚀 [SeasonalityForecast API] Starting request...');
  
  try {
    const body = await request.json().catch(() => ({}));
    console.log('📥 [SeasonalityForecast API] Request body:', body);
    
    // Extract parameters with defaults
    const symbol: string = body?.symbol || 'EURUSD';
    const baseYear: string = body?.baseYear || '5d';

    // console.log('📋 [SeasonalityForecast API] Parameters:', { symbol, baseYear });

    // Validation
    if (!symbol) {
      console.log('❌ [SeasonalityForecast API] Symbol validation failed');
      return NextResponse.json(
        { error: 'Symbol is required' },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const token = cookieStore.get('pmt_auth_token')?.value;

    // console.log('🔐 [SeasonalityForecast API] Auth check:', { 
    //   hasToken: !!token, 
    //   tokenLength: token?.length || 0
    // });

    if (!token) {
      console.log('❌ [SeasonalityForecast API] No auth token found');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Request data for seasonality forecast using the correct endpoint
    const requestData = {
      getSeasonalityForecast: '1',
      symbol,
      baseYear,
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const endpoint = 'getSeasonalityForecast';
    const fullUrl = `${API_CONFIG.UPSTREAM_API}${endpoint}`;
    // console.log('🌐 [SeasonalityForecast API] Making upstream request:', {
    //   url: fullUrl,
    //   requestData,
    //   hasAuth: !!token
    // });

    // const fetchStart = Date.now();
    const res = await fetch(fullUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(requestData),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    // const fetchDuration = Date.now() - fetchStart;

    // console.log('📡 [SeasonalityForecast API] Upstream response:', {
    //   status: res.status,
    //   statusText: res.statusText,
    //   ok: res.ok,
    //   duration: `${fetchDuration}ms`,
    //   headers: Object.fromEntries(res.headers.entries())
    // });

    if (!res.ok) {
      console.log('❌ [SeasonalityForecast API] Upstream request failed:', res.status, res.statusText);
      const errorText = await res.text().catch(() => '');
      console.log('❌ [SeasonalityForecast API] Error response body:', errorText);
      return NextResponse.json({ 
        success: false, 
        error: `Upstream error: ${res.status} ${res.statusText}` 
      }, { status: 502 });
    }

    const upstreamResponse = await res.json().catch((parseError) => {
      console.log('❌ [SeasonalityForecast API] Failed to parse JSON:', parseError);
      return null;
    });

    if (!upstreamResponse) {
      console.log('❌ [SeasonalityForecast API] Invalid upstream response - could not parse JSON');
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid upstream response - could not parse JSON' 
      }, { status: 502 });
    }

    // console.log('📊 [SeasonalityForecast API] Upstream response structure:', {
    //   success: upstreamResponse.success,
    //   symbol: upstreamResponse.symbol,
    //   baseYear: upstreamResponse.baseYear,
    //   dataCount: upstreamResponse.dataCount,
    //   chartDateLength: upstreamResponse.chartDate?.length,
    //   chartDataLength: upstreamResponse.chartData?.length,
    //   maxval: upstreamResponse.maxval,
    //   minval: upstreamResponse.minval,
    //   responseKeys: Object.keys(upstreamResponse)
    // });

    // Return the response directly since it should already be in the correct format
    const response: SeasonalityForecastResponse = {
      success: upstreamResponse.success || true,
      symbol: upstreamResponse.symbol || symbol,
      baseYear: upstreamResponse.baseYear || baseYear,
      dataCount: upstreamResponse.dataCount || 0,
      chartDate: upstreamResponse.chartDate || [],
      maxval: upstreamResponse.maxval || 0,
      minval: upstreamResponse.minval || 0,
      chartData: upstreamResponse.chartData || [],
      summary: upstreamResponse.summary || {
        totalPredictions: 0,
        maxSeasonalPrognosis: 0,
        minSeasonalPrognosis: 0,
        dateRange: {
          startDate: '',
          endDate: ''
        }
      },
    };

    // console.log('🎯 [SeasonalityForecast API] Final response:', {
    //   success: response.success,
    //   symbol: response.symbol,
    //   baseYear: response.baseYear,
    //   dataCount: response.dataCount,
    //   chartDateLength: response.chartDate.length,
    //   chartDataLength: response.chartData.length,
    //   maxval: response.maxval,
    //   minval: response.minval
    // });

    return NextResponse.json(response);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ [SeasonalityForecast API] Unhandled error:', {
      message,
      stack: error instanceof Error ? error.stack : undefined,
      error
    });
    return NextResponse.json({ 
      success: false, 
      error: message 
    }, { status: 500 });
  }
}
