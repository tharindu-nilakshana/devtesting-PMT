import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { API_CONFIG } from '../../../../lib/api';

const UPSTREAM = API_CONFIG.UPSTREAM_API;

export async function POST(request: NextRequest) {
  console.log('📄 [Research File Summary API] Request received');
  
  try {
    let body: any = {};
    try {
      body = await request.json();
    } catch (error) {
      console.warn('⚠️ [Research File Summary API] Failed to parse request body:', error instanceof Error ? error.message : String(error));
      body = {};
    }
    
    const { FileID } = body;
    
    if (!FileID) {
      console.error('❌ [Research File Summary API] No FileID provided');
      return NextResponse.json({
        success: false,
        error: 'FileID is required',
      }, { status: 400 });
    }
    
    // Get authentication token
    const cookieStore = await cookies();
    const authToken = cookieStore.get('pmt_auth_token')?.value;
    
    if (!authToken) {
      console.error('❌ [Research File Summary API] No auth token found');
      return NextResponse.json({
        success: false,
        error: 'Authentication required',
      }, { status: 401 });
    }
    
    console.log('📄 [Research File Summary API] Fetching summary for FileID:', FileID);
    
    // Call external API using centralized config
    const upstreamUrl = new URL('getResearchFilesSummary', UPSTREAM).toString();
    const externalResponse = await fetch(upstreamUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ FileID }),
    });
    
    console.log('📄 [Research File Summary API] External API response status:', externalResponse.status);
    
    if (!externalResponse.ok) {
      console.error('❌ [Research File Summary API] External API error:', externalResponse.status);
      const errorText = await externalResponse.text();
      return NextResponse.json({
        success: false,
        error: `External API returned ${externalResponse.status}: ${errorText}`,
        data: null,
      }, { status: externalResponse.status });
    }
    
    const responseData = await externalResponse.json();
    console.log('📄 [Research File Summary API] Received response');
    
    return NextResponse.json({
      success: true,
      data: responseData,
      timestamp: Date.now()
    });

  } catch (error) {
    console.error('❌ [Research File Summary API] Error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      data: null,
      timestamp: Date.now()
    }, { status: 500 });
  }
}

