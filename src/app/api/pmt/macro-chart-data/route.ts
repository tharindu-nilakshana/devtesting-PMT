import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { API_CONFIG } from '../../../../lib/api';

const UPSTREAM = API_CONFIG.UPSTREAM_API;

export async function POST(request: NextRequest) {
  console.log('📊 [Macro Chart API] Request received');
  
  let body: any = {};
  try {
    // Try to parse the request body as JSON
    body = await request.json();
  } catch (error) {
    // If body is empty or malformed, use empty object (will fall back to defaults)
    console.warn('⚠️ [Macro Chart API] Failed to parse request body (empty or malformed), using defaults:', error instanceof Error ? error.message : String(error));
    body = {};
  }
  
  const { country, tab, event, tabName, macroEvent } = body;
  
  try {
    console.log('📊 [Macro Chart API] Request data:', { country, tab, event, tabName, macroEvent });
    
    // Get authentication token
    const cookieStore = await cookies();
    const authToken = cookieStore.get('pmt_auth_token')?.value;
    
    if (!authToken) {
      console.error('❌ [Macro Chart API] No auth token found');
      return NextResponse.json({
        success: false,
        error: 'Authentication required',
      }, { status: 401 });
    }
    
    const requestData = {
      country: country || 'US',
      tabName: (tabName || tab) || 'gdp',
      macroEvent: (macroEvent || event) || 'GDP',
    };
    
    console.log('📊 [Macro Chart API] External API request data:', requestData);
    
    // Call external API using centralized config
    const upstreamUrl = new URL('getMacroChartData', UPSTREAM).toString();
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
    
    console.log('📊 [Macro Chart API] External API response status:', externalResponse.status);
    
    if (!externalResponse.ok) {
      console.error('❌ [Macro Chart API] External API error:', externalResponse.status);
      return NextResponse.json({
        success: false,
        error: `External API returned ${externalResponse.status}`,
      }, { status: externalResponse.status });
    }
    
    const responseData = await externalResponse.json();
    console.log('📊 [Macro Chart API] External API response data received');
    
    return NextResponse.json({
      success: true,
      data: responseData,
      timestamp: Date.now()
    });

  } catch (error) {
    console.error('❌ [Macro Chart API] Error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: Date.now()
    }, { status: 500 });
  }
}

