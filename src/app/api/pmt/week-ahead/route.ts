import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { API_CONFIG } from '../../../../lib/api';

const UPSTREAM = API_CONFIG.UPSTREAM_API;

export async function POST(request: NextRequest) {
  console.log('📅 [Week Ahead API] Request received');
  
  try {
    let body: any = {};
    try {
      body = await request.json();
    } catch (error) {
      console.warn('⚠️ [Week Ahead API] Failed to parse request body, using defaults:', error instanceof Error ? error.message : String(error));
      body = {};
    }
    
    const { DataType = 'graphic' } = body;
    
    // Get authentication token
    const cookieStore = await cookies();
    const authToken = cookieStore.get('pmt_auth_token')?.value;
    
    if (!authToken) {
      console.error('❌ [Week Ahead API] No auth token found');
      return NextResponse.json({
        success: false,
        error: 'Authentication required',
      }, { status: 401 });
    }
    
    const requestData = {
      DataType: DataType || 'graphic',
    };
    
    console.log('📅 [Week Ahead API] External API request data:', requestData);
    
    // Call external API using centralized config
    const upstreamUrl = new URL('getWeekAheadData', UPSTREAM).toString();
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
    
    console.log('📅 [Week Ahead API] External API response status:', externalResponse.status);
    
    if (!externalResponse.ok) {
      console.error('❌ [Week Ahead API] External API error:', externalResponse.status);
      const errorText = await externalResponse.text().catch(() => '');
      return NextResponse.json({
        success: false,
        error: `External API returned ${externalResponse.status}`,
        details: errorText,
      }, { status: externalResponse.status });
    }
    
    const responseData = await externalResponse.json();
    console.log('📅 [Week Ahead API] External API response received, event count:', responseData?.data?.length || 0);
    
    return NextResponse.json({
      success: responseData.success || true,
      dataType: responseData.dataType || DataType,
      data: responseData.data || [],
      timestamp: Date.now()
    });

  } catch (error) {
    console.error('❌ [Week Ahead API] Error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: Date.now()
    }, { status: 500 });
  }
}



