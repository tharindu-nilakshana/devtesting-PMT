import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { API_CONFIG } from '../../../../lib/api';

const ENDPOINT = 'getImpliedForwardCurve';
const DEFAULT_SYMBOL = 'USDOIS';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { symbol = DEFAULT_SYMBOL } = body ?? {};

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
      body: JSON.stringify({ symbol }),
    });

    if (!upstreamResponse.ok) {
      console.error('Implied forward curve upstream error', upstreamResponse.status);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch implied forward curve data' },
        { status: upstreamResponse.status }
      );
    }

    const data = await upstreamResponse.json();

    return NextResponse.json({
      success: true,
      data,
      symbol,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Implied forward curve API route error', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

