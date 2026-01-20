import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { API_CONFIG } from '../../../../lib/api';

const UPSTREAM = API_CONFIG.UPSTREAM_API;

export async function POST(request: NextRequest) {
  console.log('📊 [News Sentiment API] Request received');
  
  let body: any = {};
  try {
    body = await request.json();
  } catch (error) {
    console.warn('⚠️ [News Sentiment API] Failed to parse request body, using defaults:', error instanceof Error ? error.message : String(error));
    body = {};
  }
  
  const { Module, Symbols, WidgetTitle } = body;
  
  try {
    console.log('📊 [News Sentiment API] Request data:', { Module, Symbols, WidgetTitle });
    
    // Get authentication token
    const cookieStore = await cookies();
    const authToken = cookieStore.get('pmt_auth_token')?.value;
    
    if (!authToken) {
      console.error('❌ [News Sentiment API] No auth token found');
      return NextResponse.json({
        success: false,
        error: 'Authentication required',
      }, { status: 401 });
    }
    
    const requestData = {
      Module: Module || 'Forex',
      Symbols: Symbols || 'EURUSD',
      WidgetTitle: WidgetTitle || 'sentiment_score',
    };
    
    console.log('📊 [News Sentiment API] External API request data:', requestData);
    
    // Call external API
    const upstreamUrl = new URL('getNewsSentiment', UPSTREAM).toString();
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
    
    console.log('📊 [News Sentiment API] External API response status:', externalResponse.status);
    
    if (!externalResponse.ok) {
      console.error('❌ [News Sentiment API] External API error:', externalResponse.status);
      const errorText = await externalResponse.text().catch(() => '');
      return NextResponse.json({
        success: false,
        error: `External API returned ${externalResponse.status}: ${errorText}`,
        data: null,
      }, { status: externalResponse.status });
    }
    
    const responseData = await externalResponse.json();
    
    // Log the response structure to learn the data format
    console.log('📊 [News Sentiment API] Raw response data:', {
      dataType: typeof responseData,
      isArray: Array.isArray(responseData),
      dataKeys: responseData && typeof responseData === 'object' ? Object.keys(responseData) : 'Not an object',
      sampleItem: Array.isArray(responseData) ? responseData[0] : responseData,
      fullResponse: JSON.stringify(responseData, null, 2).substring(0, 2000) // First 2000 chars for inspection
    });
    
    return NextResponse.json({
      success: true,
      data: responseData,
      timestamp: Date.now()
    });

  } catch (error) {
    console.error('❌ [News Sentiment API] Error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      data: null,
      timestamp: Date.now()
    }, { status: 500 });
  }
}

