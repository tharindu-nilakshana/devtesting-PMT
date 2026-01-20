import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { API_CONFIG } from '@/lib/api';

const UPSTREAM = API_CONFIG.UPSTREAM_API;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { Module = 'Forex' } = body as { Module?: string };

    console.log(`[get-symbols] Fetching symbols for Module: ${Module}`);

    const cookieStore = await cookies();
    const authToken = cookieStore.get('pmt_auth_token')?.value;

    if (!authToken) {
      console.error('[get-symbols] No authentication token found');
      return NextResponse.json({ success: false, error: 'Authentication required', data: null }, { status: 401 });
    }

    const upstreamUrl = new URL('getSymbols', UPSTREAM).toString();
    console.log(`[get-symbols] Upstream URL: ${upstreamUrl}`);

    const upstreamResponse = await fetch(upstreamUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({ Module }),
      signal: AbortSignal.timeout(30000),
    });

    if (!upstreamResponse.ok) {
      const errorText = await upstreamResponse.text();
      console.error(`[get-symbols] Upstream API error: ${upstreamResponse.status} - ${errorText}`);
      return NextResponse.json({
        success: false,
        error: `Upstream API returned ${upstreamResponse.status}: ${errorText}`,
        data: null,
      }, { status: upstreamResponse.status });
    }

    const responseData = await upstreamResponse.json();
    console.log(`[get-symbols] Successfully fetched ${responseData?.data?.length || 0} symbols for ${Module}`);
    
    // Return the original upstream response structure
    // Response structure: { status: "success", data: [{ Symbol: "EURUSD", SymbolID: 123, NameToDisplay: "EURUSD", Module: "Forex" }, ...] }
    return NextResponse.json(responseData);
  } catch (error) {
    console.error('[get-symbols] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      data: null,
    }, { status: 500 });
  }
}
