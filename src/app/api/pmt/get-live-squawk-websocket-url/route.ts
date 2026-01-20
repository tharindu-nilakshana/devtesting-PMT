import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { API_CONFIG } from '../../../../lib/api';

const UPSTREAM = API_CONFIG.UPSTREAM_API;

export async function POST(request: NextRequest) {
  console.log('📻 [Live Squawk WebSocket URL API] Request received');
  
  try {
    // Get authentication token
    const cookieStore = await cookies();
    const authToken = cookieStore.get('pmt_auth_token')?.value;
    
    if (!authToken) {
      console.error('❌ [Live Squawk WebSocket URL API] No auth token found');
      return NextResponse.json({
        success: false,
        error: 'Authentication required',
      }, { status: 401 });
    }
    
    console.log('📻 [Live Squawk WebSocket URL API] Calling external API');
    
    // Call external API using centralized config
    const upstreamUrl = new URL('getLiveSquawkWebSocketUrl', UPSTREAM).toString();
    const externalResponse = await fetch(upstreamUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({}),
      signal: AbortSignal.timeout(15000),
    });
    
    console.log('📻 [Live Squawk WebSocket URL API] External API response status:', externalResponse.status);
    
    if (!externalResponse.ok) {
      console.error('❌ [Live Squawk WebSocket URL API] External API error:', externalResponse.status);
      const errorText = await externalResponse.text().catch(() => '');
      return NextResponse.json({
        success: false,
        error: `External API returned ${externalResponse.status}`,
        details: errorText,
      }, { status: externalResponse.status });
    }
    
    const responseData = await externalResponse.json();
    console.log('📻 [Live Squawk WebSocket URL API] External API response received:', {
      success: responseData?.success,
      hasWebSocketUrl: !!responseData?.websocketUrl
    });
    
    return NextResponse.json({
      success: true,
      data: responseData,
      timestamp: Date.now()
    });

  } catch (error) {
    console.error('❌ [Live Squawk WebSocket URL API] Error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: Date.now()
    }, { status: 500 });
  }
}

