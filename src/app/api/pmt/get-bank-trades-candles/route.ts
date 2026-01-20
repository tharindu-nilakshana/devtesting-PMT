import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { API_CONFIG } from '../../../../lib/api';

const UPSTREAM = API_CONFIG.UPSTREAM_API;

export async function POST(request: NextRequest) {
  console.log('📊 [Bank Trades Candles API] Request received');
  
  try {
    let body: any = {};
    try {
      body = await request.json();
    } catch (error) {
      console.warn('⚠️ [Bank Trades Candles API] Failed to parse request body:', error instanceof Error ? error.message : String(error));
      body = {};
    }
    
    const { symbol } = body;
    
    if (!symbol || typeof symbol !== 'string' || symbol.trim().length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Symbol is required and must be a non-empty string',
      }, { status: 400 });
    }
    
    // Get authentication token
    const cookieStore = await cookies();
    const authToken = cookieStore.get('pmt_auth_token')?.value;
    
    if (!authToken) {
      console.error('❌ [Bank Trades Candles API] No auth token found');
      return NextResponse.json({
        success: false,
        error: 'Authentication required',
      }, { status: 401 });
    }
    
    const requestData = {
      symbol: symbol.trim().toUpperCase(),
    };
    
    console.log('📊 [Bank Trades Candles API] External API request data:', requestData);
    
    // Call external API
    const upstreamUrl = new URL('getBankTradesCandles', UPSTREAM).toString();
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
    
    console.log('📊 [Bank Trades Candles API] External API response status:', externalResponse.status);
    
    if (!externalResponse.ok) {
      console.error('❌ [Bank Trades Candles API] External API error:', externalResponse.status);
      const errorText = await externalResponse.text().catch(() => '');
      return NextResponse.json({
        success: false,
        error: `External API returned ${externalResponse.status}`,
        details: errorText,
      }, { status: externalResponse.status });
    }
    
    const responseData = await externalResponse.json();
    console.log('📊 [Bank Trades Candles API] External API response received:', {
      success: responseData?.success,
      count: responseData?.count || 0,
      dataLength: responseData?.data?.length || 0
    });
    
    return NextResponse.json({
      success: true,
      data: responseData,
      timestamp: Date.now()
    });

  } catch (error) {
    console.error('❌ [Bank Trades Candles API] Error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: Date.now()
    }, { status: 500 });
  }
}



