import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { API_CONFIG } from '../../../../lib/api';

const UPSTREAM = API_CONFIG.UPSTREAM_API;

// Proxies frontendapi getNextAndPreviousEvent using the user's saved auth token
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { currencies = ['USD'] } = body || {};

    const cookieStore = await cookies();
    const authToken = cookieStore.get('pmt_auth_token')?.value;

    if (!authToken) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const upstreamUrl = new URL('getNextAndPreviousEvent', UPSTREAM).toString();

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const upstreamResp = await fetch(upstreamUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({ currencies }),
      signal: controller.signal,
      cache: 'no-store',
    }).finally(() => clearTimeout(timeout));

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


