 
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { API_CONFIG } from '@/lib/api';

export interface ChartDataPoint {
  open: number;
  high: number;
  low: number;
  close: number;
  color?: string;
}

export interface SeasonalityForecastChartResponse {
  success: boolean;
  symbol: string;
  baseYear: number;
  category: Array<{ label: string }>;
  chartData: ChartDataPoint[];
  summary?: {
    historicalDataPoints: number;
    predictionDataPoints: number;
    totalDataPoints: number;
    latestPrice: {
      open: number;
      high: number;
      low: number;
      close: number;
      date: string;
    };
    dateRange: {
      historicalStart: string;
      historicalEnd: string;
      predictionStart: string;
      predictionEnd: string;
    };
  };
  error?: string;
}

// The API should return the data directly in the expected format
// No mapping needed since the upstream API returns the correct structure

export async function POST(request: Request) {
  // console.log('🚀 [SeasonalityForecastChart API] Starting request...');
  
  try {
    const body = await request.json().catch(() => ({}));
    // console.log('📥 [SeasonalityForecastChart API] Request body:', body);
    
    // Extract parameters with defaults
    const symbol: string = body?.symbol || 'EURUSD';
    const baseYear: string = body?.baseYear || '5d';

    // console.log('📋 [SeasonalityForecastChart API] Parameters:', { symbol, baseYear });

    // Validation
    if (!symbol) {
      console.log('❌ [SeasonalityForecastChart API] Symbol validation failed');
      return NextResponse.json(
        { error: 'Symbol is required' },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const token = cookieStore.get('pmt_auth_token')?.value;

    // console.log('🔐 [SeasonalityForecastChart API] Auth check:', { 
    //   hasToken: !!token, 
    //   tokenLength: token?.length || 0
    // });

    if (!token) {
      console.log('❌ [SeasonalityForecastChart API] No auth token found');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Request data for forecast chart using the correct endpoint
    const requestData = {
      symbol,
      baseYear, // Pass as string (e.g., "5d", "1w", "8h", etc.)
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const endpoint = 'getSeasonalityForecastChart';
    const fullUrl = `${API_CONFIG.UPSTREAM_API}${endpoint}`;
    // console.log('🌐 [SeasonalityForecastChart API] Making upstream request:', {
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

    // console.log('📡 [SeasonalityForecastChart API] Upstream response:', {
    //   status: res.status,
    //   statusText: res.statusText,
    //   ok: res.ok,
    //   duration: `${fetchDuration}ms`,
    //   headers: Object.fromEntries(res.headers.entries())
    // });

    if (!res.ok) {
      console.log('❌ [SeasonalityForecastChart API] Upstream request failed:', res.status, res.statusText);
      const errorText = await res.text().catch(() => '');
      console.log('❌ [SeasonalityForecastChart API] Error response body:', errorText);
      return NextResponse.json({ 
        success: false, 
        error: `Upstream error: ${res.status} ${res.statusText}` 
      }, { status: 502 });
    }

    const upstreamResponse = await res.json().catch((parseError) => {
      console.log('❌ [SeasonalityForecastChart API] Failed to parse JSON:', parseError);
      return null;
    });

    if (!upstreamResponse) {
      console.log('❌ [SeasonalityForecastChart API] Invalid upstream response - could not parse JSON');
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid upstream response - could not parse JSON' 
      }, { status: 502 });
    }

    // console.log('📊 [SeasonalityForecastChart API] Upstream response structure:', {
    //   success: upstreamResponse.success,
    //   symbol: upstreamResponse.symbol,
    //   baseYear: upstreamResponse.baseYear,
    //   categoryLength: upstreamResponse.category?.length,
    //   chartDataLength: upstreamResponse.chartData?.length,
    //   hasSummary: !!upstreamResponse.summary,
    //   responseKeys: Object.keys(upstreamResponse)
    // });

    // Return the response directly since it should already be in the correct format
    const response: SeasonalityForecastChartResponse = {
      success: upstreamResponse.success || true,
      symbol: upstreamResponse.symbol || symbol,
      baseYear: upstreamResponse.baseYear || (typeof baseYear === 'string' ? parseInt(baseYear) || baseYear : baseYear),
      category: upstreamResponse.category || [],
      chartData: upstreamResponse.chartData || [],
      summary: upstreamResponse.summary,
    };

    // console.log('🎯 [SeasonalityForecastChart API] Final response:', {
    //   success: response.success,
    //   symbol: response.symbol,
    //   baseYear: response.baseYear,
    //   categoryLength: response.category.length,
    //   chartDataLength: response.chartData.length,
    //   hasSummary: !!response.summary
    // });

    return NextResponse.json(response);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ [SeasonalityForecastChart API] Unhandled error:', {
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
