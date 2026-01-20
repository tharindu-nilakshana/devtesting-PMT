import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { API_CONFIG } from '../../../../lib/api';

const ENDPOINT = 'getDmxOverview';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const {
      dataType = 'Percentage',
      interval = '1h',
      symbols = '',
    } = body ?? {};

    if (!symbols) {
      return NextResponse.json(
        { success: false, error: 'Symbols are required' },
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

    const upstreamResponse = await fetch(`${API_CONFIG.UPSTREAM_API}${ENDPOINT}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        DataType: dataType,
        Interval: interval,
        Symbols: symbols,
      }),
    });

    if (!upstreamResponse.ok) {
      console.error('DMX Overview upstream error', upstreamResponse.status);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch DMX overview data' },
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
    console.error('DMX Overview API route error', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

