import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { API_CONFIG } from '../../../../lib/api';

const ENDPOINT = 'getDmxChart';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const {
      symbol = '',
      symbols = '',
      dataType = 'Lot',
      interval = '15min',
      timeRange = '',
      barType = '',
      chartType = '',
      loggedInTimezoneID = '',
      module = '',
      additionalSettings = '',
    } = body ?? {};

    const finalSymbol = symbols || symbol;

    if (!finalSymbol) {
      return NextResponse.json(
        { success: false, error: 'Symbol is required' },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const token = cookieStore.get('pmt_auth_token')?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const payload: Record<string, string> = {
      Symbol: finalSymbol,
      Symbols: finalSymbol,
      DataType: dataType,
      Interval: interval,
    };

    if (timeRange) payload.TimeRange = timeRange;
    if (barType) payload.BarType = barType;
    if (chartType) payload.ChartType = chartType;
    if (loggedInTimezoneID) payload.LoggedInTimezoneID = loggedInTimezoneID;
    if (module) payload.Module = module;
    if (additionalSettings) payload.AdditionalSettings = additionalSettings;

    const upstreamResponse = await fetch(`${API_CONFIG.UPSTREAM_API}${ENDPOINT}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!upstreamResponse.ok) {
      console.error('DMX Chart upstream error', upstreamResponse.status);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch DMX chart data' },
        { status: upstreamResponse.status }
      );
    }

    const data = await upstreamResponse.json();

    return NextResponse.json({
      success: true,
      data,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('DMX Chart API route error', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}


