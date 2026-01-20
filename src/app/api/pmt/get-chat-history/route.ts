import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { API_CONFIG } from '../../../../lib/api';

const UPSTREAM = API_CONFIG.UPSTREAM_API;

export async function POST(request: NextRequest) {
  console.log('📜 [Chat History API] Request received');
  
  try {
    let body: any = {};
    try {
      body = await request.json();
    } catch (error) {
      console.warn('⚠️ [Chat History API] Failed to parse request body:', error instanceof Error ? error.message : String(error));
      body = {};
    }
    
    const { WidgetID, limit = 100, order = 'asc' } = body;
    
    if (!WidgetID || typeof WidgetID !== 'number') {
      return NextResponse.json({
        success: false,
        error: 'WidgetID is required and must be a number',
      }, { status: 400 });
    }
    
    // Validate limit
    const validLimit = Math.min(Math.max(1, limit || 100), 500);
    const validOrder = order === 'desc' ? 'desc' : 'asc';
    
    // Get authentication token
    const cookieStore = await cookies();
    const authToken = cookieStore.get('pmt_auth_token')?.value;
    
    if (!authToken) {
      console.error('❌ [Chat History API] No auth token found');
      return NextResponse.json({
        success: false,
        error: 'Authentication required',
      }, { status: 401 });
    }
    
    const requestData = {
      WidgetID,
      limit: validLimit,
      order: validOrder,
    };
    
    console.log('📜 [Chat History API] External API request data:', requestData);
    
    // Call external API using centralized config
    const upstreamUrl = new URL('getChatHistory', UPSTREAM).toString();
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
    
    console.log('📜 [Chat History API] External API response status:', externalResponse.status);
    
    if (!externalResponse.ok) {
      console.error('❌ [Chat History API] External API error:', externalResponse.status);
      const errorText = await externalResponse.text().catch(() => '');
      return NextResponse.json({
        success: false,
        error: `External API returned ${externalResponse.status}`,
        details: errorText,
      }, { status: externalResponse.status });
    }
    
    const responseData = await externalResponse.json();
    console.log('📜 [Chat History API] External API response received:', {
      itemsCount: responseData?.items?.length || 0,
      items: responseData?.items?.map((item: any) => ({
        role: item.role,
        contentLength: item.content?.length || 0,
        hasSources: !!(item.sources || item.Sources),
        sourcesCount: (item.sources || item.Sources)?.length || 0,
        sources: item.sources || item.Sources,
        hasSourcesField: 'sources' in item,
        hasSourcesFieldCapital: 'Sources' in item
      })) || []
    });
    
    return NextResponse.json({
      success: true,
      data: responseData,
      timestamp: Date.now()
    });

  } catch (error) {
    console.error('❌ [Chat History API] Error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: Date.now()
    }, { status: 500 });
  }
}

