import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { API_CONFIG } from '@/lib/api';

const UPSTREAM = API_CONFIG.UPSTREAM_API;

export async function POST(request: NextRequest) {
  console.log('📊 [TradingView API] Request received');
  
  const body = await request.json();
  const { sym: symbol, res: timeframe, frm: from, to } = body;
  
  try {
    
    console.log('📊 [TradingView API] Request data:', { symbol, timeframe, from, to });
    
    // Get authentication token
    const cookieStore = await cookies();
    const authToken = cookieStore.get('pmt_auth_token')?.value;
    
    console.log('🔐 [TradingView API] Auth token status:', {
      hasToken: !!authToken,
      tokenLength: authToken?.length || 0,
      tokenPreview: authToken ? `${authToken.substring(0, 20)}...` : 'None'
    });
    
    if (!authToken) {
      console.error('❌ [TradingView API] No auth token found');
      return NextResponse.json({
        success: false,
        error: 'Authentication required',
        symbol,
        timeframe,
        from,
        to,
        timestamp: Date.now()
      }, { status: 401 });
    }
    
    // Prepare request data for external API - Fetch all available historical data
    const now = Math.floor(Date.now() / 1000);
    
    const requestData = {
      sym: symbol || 'EURUSD',
      res: timeframe || '1h',
      frm: from || 0, // No limit on historical data - fetch all available
      to: to || now // Current time
    };
    
    console.log('📊 [TradingView API] External API request data:', requestData);
    
    // Call external API using centralized config
    const upstreamUrl = new URL('getIQFeedHistoricalData', UPSTREAM).toString();
    const externalResponse = await fetch(upstreamUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(requestData),
      signal: AbortSignal.timeout(15000), // 15 second timeout
    });
    
    console.log('📊 [TradingView API] External API response status:', externalResponse.status);
    
    if (!externalResponse.ok) {
      console.error('❌ [TradingView API] External API error:', externalResponse.status);
      
      return NextResponse.json({
        success: false,
        error: `External API returned ${externalResponse.status}`,
        symbol,
        timeframe,
        from,
        to,
        timestamp: Date.now()
      }, { status: externalResponse.status });
    }
    
    const responseData = await externalResponse.json();
    console.log('📊 [TradingView API] External API response data length:', Array.isArray(responseData) ? responseData.length : 'Not an array');
    
    // Ensure we return the data in the expected format
    const formattedData = Array.isArray(responseData) ? responseData : [];
    
    return NextResponse.json({
      success: true,
      data: formattedData,
      symbol,
      timeframe,
      from,
      to,
      timestamp: Date.now()
    });

  } catch (error) {
    console.error('❌ [TradingView API] Error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      symbol: symbol || 'EURUSD',
      timeframe: timeframe || '1h',
      from: from || Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60),
      to: to || Math.floor(Date.now() / 1000),
      timestamp: Date.now()
    }, { status: 500 });
  }
}
