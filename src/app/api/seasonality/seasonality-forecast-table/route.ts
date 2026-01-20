/* eslint-disable @next/next/no-assign-module-variable */
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { API_CONFIG } from '@/lib/api';

interface SeasonalForecastData {
  symbol: string;
  horizon: string;
  date: string;
  probability: number;
  prognosis: number;
  changeValue: string;
  trend: 'bullish' | 'bearish' | 'neutral';
}

function determineTrend(prognosis: number): 'bullish' | 'bearish' | 'neutral' {
  const threshold = 0.05;
  if (prognosis > threshold) return 'bullish';
  if (prognosis < -threshold) return 'bearish';
  return 'neutral';
}

function mapUpstreamToRows(payload: unknown, symbol: string): SeasonalForecastData[] {
  const root = (payload as { data?: unknown; symbol?: string }) || {};
  const data: unknown = (root && typeof root === 'object' && 'data' in root)
    ? (root as { data?: unknown }).data
    : payload;
  
  // Use symbol from upstream response if available, otherwise use request symbol
  let responseSymbol: string = symbol;
  if (root && typeof root === 'object' && 'symbol' in root) {
    const symVal = (root as { symbol?: unknown }).symbol;
    if (typeof symVal === 'string' && symVal) {
      responseSymbol = symVal;
    }
  }

  const asRecord = (obj: unknown): Record<string, unknown> => (obj as Record<string, unknown>) || {};
  const getArray = (obj: unknown, key: string): unknown[] => {
    const rec = asRecord(obj);
    const val = rec[key];
    return Array.isArray(val) ? (val as unknown[]) : [];
  };

  const horizonsUnknown = getArray(data, 'ForecastHorizon').length > 0
    ? getArray(data, 'ForecastHorizon')
    : getArray(data, 'ForecastHorizons');
  const datesUnknown = getArray(data, 'SeasonalityDate');
  const probabilitiesUnknown = getArray(data, 'Probability');
  const prognosisUnknown = getArray(data, 'SeasonalPrognosis');
  const changeValuesUnknown = getArray(data, 'ChangeValues');

  const horizons: string[] = horizonsUnknown.map((v) => String(v));
  const dates: string[] = datesUnknown.map((v) => String(v));
  const probabilities: string[] = probabilitiesUnknown.map((v) => String(v));
  const prognosisArr: string[] = prognosisUnknown.map((v) => String(v));
  const changeValues: string[] = changeValuesUnknown.map((v) => String(v));

  if (!Array.isArray(horizons) || horizons.length === 0) {
    return [];
  }

  return horizons.map((h: unknown, idx: number) => {
    // Keep original values as strings/numbers from API without transformation
    const prob = probabilities[idx] ?? '0';
    const prog = prognosisArr[idx] ?? '0';
    const date = dates[idx] || '';
    const change = changeValues[idx] || '0 Pips';
    
    // Convert prognosis to number for trend determination only
    const progNum = parseFloat(String(prog)) || 0;
    
    return {
      symbol: responseSymbol,
      horizon: String(h),
      date,
      probability: prob, // Keep as original from API
      prognosis: prog, // Keep as original from API
      changeValue: change,
      trend: determineTrend(progNum), // Use numeric value only for trend calculation
    };
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    
    // Only extract what we need for upstream API
    const symbol: string = body?.symbol || 'EURUSD';
    const module: string = body?.module || 'Forex';

    // Optional: Add validation
    if (!symbol) {
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

    // Minimal request data - only what upstream needs
    const requestData = {
      GetSeasonalityForecastTable: true,
      symbol,
      module,
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const endpoint = 'getSeasonalityForecastTable';    

    const res = await fetch(`${API_CONFIG.UPSTREAM_API}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(requestData),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      return NextResponse.json({ 
        success: false, 
        error: `Upstream error: ${res.status}` 
      }, { status: 502 });
    }

    const upstream = await res.json().catch(() => null);
    if (!upstream) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid upstream response' 
      }, { status: 502 });
    }

    const rows = mapUpstreamToRows(upstream?.data ?? upstream, symbol);

    return NextResponse.json({
      success: true,
      data: rows,
      meta: {
        symbol,
        module,
        totalRecords: rows.length,
        timestamp: Date.now(),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ 
      success: false, 
      error: message 
    }, { status: 500 });
  }
}