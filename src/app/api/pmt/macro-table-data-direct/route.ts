import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { API_CONFIG } from '../../../../lib/api';

const UPSTREAM = API_CONFIG.UPSTREAM_API;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { country, tab, event } = body || {};

    const cookieStore = await cookies();
    const authToken = cookieStore.get('pmt_auth_token')?.value;
    if (!authToken) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const upstreamUrl = new URL('getMacroTableData', UPSTREAM).toString();
    const resp = await fetch(upstreamUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({ country, tab, event }),
      signal: controller.signal,
      cache: 'no-store',
    }).finally(() => clearTimeout(timeout));

    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      return NextResponse.json({ success: false, error: `Upstream ${resp.status}`, details: text }, { status: resp.status });
    }

    const data = await resp.json();
    return NextResponse.json({ success: true, data, timestamp: Date.now() });
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 });
  }
}


