import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { API_CONFIG } from '../../../../lib/api';

const UPSTREAM = API_CONFIG.UPSTREAM_API;

export async function POST(request: NextRequest) {
  console.log('📊 [Macro Chart Raw API] Request received');
  
  const body = await request.json();
  const { country, tab, event } = body;
  
  try {
    console.log('📊 [Macro Chart Raw API] Request data:', { country, tab, event });
    
    // Get authentication token
    const cookieStore = await cookies();
    const authToken = cookieStore.get('pmt_auth_token')?.value;
    
    if (!authToken) {
      console.error('❌ [Macro Chart Raw API] No auth token found');
      return NextResponse.json({
        success: false,
        error: 'Authentication required',
      }, { status: 401 });
    }
    
    const requestData = {
      country: country || 'US',
      tabName: tab || 'gdp',
      macroEvent: event || 'GDP',
    };
    
    // Call external API using centralized config
    const upstreamUrl = new URL('getMacroChartRawData', UPSTREAM).toString();
    const externalResponse = await fetch(upstreamUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(requestData),
      signal: AbortSignal.timeout(15000),
    });
    
    if (!externalResponse.ok) {
      return NextResponse.json({
        success: false,
        error: `External API returned ${externalResponse.status}`,
      }, { status: externalResponse.status });
    }
    
    const responseData = await externalResponse.json();
    
    return NextResponse.json({
      success: true,
      data: responseData,
      timestamp: Date.now()
    });

  } catch (error) {
    console.error('❌ [Macro Chart Raw API] Error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: Date.now()
    }, { status: 500 });
  }
}

