import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { API_CONFIG } from '@/lib/api';

const UPSTREAM = API_CONFIG.UPSTREAM_API;

export async function DELETE(request: NextRequest) {
  try {
    console.log('🗑️ [TradingView Cache API] Cache clear request received');
    
    const body = await request.json();
    const { sym: symbol, res: timeframe } = body;
    
    console.log('🗑️ [TradingView Cache API] Cache clear data:', { symbol, timeframe });
    
    // Get authentication token
    const cookieStore = await cookies();
    const authToken = cookieStore.get('pmt_auth_token')?.value;
    
    console.log('🔐 [TradingView Cache API] Auth token status:', {
      hasToken: !!authToken,
      tokenLength: authToken?.length || 0,
      tokenPreview: authToken ? `${authToken.substring(0, 20)}...` : 'None'
    });
    
    if (!authToken) {
      console.error('❌ [TradingView Cache API] No auth token found');
      return NextResponse.json({
        success: false,
        error: 'Authentication required',
        symbol,
        timeframe,
        timestamp: Date.now()
      }, { status: 401 });
    }
    
    // Prepare request data for external API
    const requestData = {
      sym: symbol || 'EURUSD',
      res: timeframe || '1h'
    };
    
    console.log('🗑️ [TradingView Cache API] External API request data:', requestData);
    
    // Call external API using centralized config
    const upstreamUrl = new URL('cleanIQFeedCache', UPSTREAM).toString();
    const externalResponse = await fetch(upstreamUrl, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(requestData),
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });
    
    console.log('🗑️ [TradingView Cache API] External API response status:', externalResponse.status);
    
    if (!externalResponse.ok) {
      console.error('❌ [TradingView Cache API] External API error:', externalResponse.status);
      
      return NextResponse.json({
        success: false,
        error: `External API returned ${externalResponse.status}`,
        symbol,
        timeframe,
        timestamp: Date.now()
      });
    }
    
    const responseData = await externalResponse.json();
    console.log('🗑️ [TradingView Cache API] External API response:', responseData);
    
    return NextResponse.json({
      success: true,
      message: 'Cache cleared successfully',
      symbol,
      timeframe,
      timestamp: Date.now(),
      externalResponse: responseData
    });

  } catch (error) {
    console.error('❌ [TradingView Cache API] Error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      symbol: 'EURUSD',
      timeframe: '1h',
      timestamp: Date.now()
    });
  }
}
