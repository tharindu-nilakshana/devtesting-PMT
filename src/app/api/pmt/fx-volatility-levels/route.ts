import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { API_CONFIG } from '../../../../lib/api';

const UPSTREAM = API_CONFIG.UPSTREAM_API;

export async function POST(request: NextRequest) {
  console.log('📊 [FX Volatility Levels API] Request received');
  
  try {
    let body: any = {};
    try {
      body = await request.json();
    } catch (error) {
      console.warn('⚠️ [FX Volatility Levels API] Failed to parse request body:', error instanceof Error ? error.message : String(error));
      body = {};
    }
    
    const { symbol, limit = 1000, offset = 0 } = body;
    
    // Get authentication token
    const cookieStore = await cookies();
    const authToken = cookieStore.get('pmt_auth_token')?.value;
    
    if (!authToken) {
      console.error('❌ [FX Volatility Levels API] No auth token found');
      return NextResponse.json({
        success: false,
        error: 'Authentication required',
      }, { status: 401 });
    }
    
    // Determine endpoint based on whether symbol is provided
    const endpoint = symbol 
      ? 'getFxOptionsVolatilityLevelsBySymbol'
      : 'getAllFxOptionsVolatilityLevels';
    
    const requestData = symbol 
      ? { symbol, limit, offset }
      : { limit, offset };
    
    console.log('📊 [FX Volatility Levels API] Fetching data:', { endpoint, symbol, limit, offset });
    
    // Call external API
    const upstreamUrl = new URL(endpoint, UPSTREAM).toString();
    const externalResponse = await fetch(upstreamUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(requestData),
      signal: AbortSignal.timeout(30000),
    });
    
    console.log('📊 [FX Volatility Levels API] External API response status:', externalResponse.status);
    
    if (!externalResponse.ok) {
      console.error('❌ [FX Volatility Levels API] External API error:', externalResponse.status);
      const errorText = await externalResponse.text();
      return NextResponse.json({
        success: false,
        error: `External API returned ${externalResponse.status}: ${errorText}`,
        data: null,
      }, { status: externalResponse.status });
    }
    
    const responseData = await externalResponse.json();
    console.log('📊 [FX Volatility Levels API] Received response');
    
    // Extract data array from response (API already returns { success: true, data: [...] })
    const dataArray = responseData.data || responseData;
    
    return NextResponse.json({
      success: true,
      data: dataArray,
      timestamp: Date.now()
    });

  } catch (error) {
    console.error('❌ [FX Volatility Levels API] Error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      data: null,
      timestamp: Date.now()
    }, { status: 500 });
  }
}

