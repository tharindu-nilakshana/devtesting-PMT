import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { API_CONFIG } from '../../../../lib/api';

const UPSTREAM = API_CONFIG.UPSTREAM_API;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { currencyName } = body;

    if (!currencyName) {
      return NextResponse.json({ success: false, error: 'Currency name is required' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const authToken = cookieStore.get('pmt_auth_token')?.value;

    if (!authToken) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const upstreamUrl = new URL('getSmartBiasSummaryOverview', UPSTREAM).toString();

    const upstreamResp = await fetch(upstreamUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({ currencyName }),
      cache: 'no-store',
    });

    if (!upstreamResp.ok) {
      const text = await upstreamResp.text().catch(() => '');
      return NextResponse.json({ success: false, error: `Upstream ${upstreamResp.status}`, details: text }, { status: upstreamResp.status });
    }

    const data = await upstreamResp.json();
    return NextResponse.json({ success: true, data, timestamp: Date.now() });
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 });
  }
}

