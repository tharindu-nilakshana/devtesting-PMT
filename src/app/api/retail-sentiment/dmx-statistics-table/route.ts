import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { API_CONFIG } from '../../../../lib/api';

const ENDPOINT = 'getDmxTable';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const {
      symbol = '',
      symbols = '',
      module = 'single_currency',
      additionalSettings = '',
    } = body ?? {};

    if (!symbol && !symbols) {
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
      symbol: symbols || symbol,
      Symbols: symbols || symbol,
    };

    if (module) {
      payload.Module = module;
    }

    if (additionalSettings) {
      payload.AdditionalSettings = additionalSettings;
    }

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
      console.error('DMX Statistics Table upstream error', upstreamResponse.status);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch DMX statistics table data' },
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
    console.error('DMX Statistics Table API route error', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

