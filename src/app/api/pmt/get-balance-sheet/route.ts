import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { API_CONFIG } from '../../../../lib/api';

const UPSTREAM = API_CONFIG.UPSTREAM_API;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { symbol, CustomDashboardWidgetID, TemplateName } = body as { 
      symbol: string; 
      CustomDashboardWidgetID?: number; 
      TemplateName?: string; 
    };

    const cookieStore = await cookies();
    const authToken = cookieStore.get('pmt_auth_token')?.value;

    if (!authToken) {
      return NextResponse.json({ success: false, error: 'Authentication required', data: null }, { status: 401 });
    }

    const upstreamUrl = new URL('getBalanceSheet', UPSTREAM).toString();
    const externalResponse = await fetch(upstreamUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({ 
        symbol,
        CustomDashboardWidgetID: CustomDashboardWidgetID || 123,
        TemplateName: TemplateName || 'Details'
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!externalResponse.ok) {
      const errorText = await externalResponse.text();
      return NextResponse.json({
        success: false,
        error: `External API returned ${externalResponse.status}: ${errorText}`,
        details: errorText,
      }, { status: externalResponse.status });
    }

    const responseData = await externalResponse.json();

    return NextResponse.json({
      success: true,
      data: responseData,
      timestamp: Date.now(),
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: Date.now(),
    }, { status: 500 });
  }
}

