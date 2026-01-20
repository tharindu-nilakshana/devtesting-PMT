import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { API_CONFIG } from '../../../../lib/api';

const UPSTREAM = API_CONFIG.UPSTREAM_API;

export async function POST(request: NextRequest) {
  console.log('📖 [Analyst Report Read API] Request received');
  
  try {
    let body: any = {};
    try {
      body = await request.json();
    } catch (error) {
      console.warn('⚠️ [Analyst Report Read API] Failed to parse request body:', error instanceof Error ? error.message : String(error));
      body = {};
    }
    
    const { FileID } = body;
    
    if (!FileID) {
      console.error('❌ [Analyst Report Read API] No FileID provided');
      return NextResponse.json({
        success: false,
        error: 'FileID is required',
      }, { status: 400 });
    }
    
    // Get authentication token
    const cookieStore = await cookies();
    const authToken = cookieStore.get('pmt_auth_token')?.value;
    
    if (!authToken) {
      console.error('❌ [Analyst Report Read API] No auth token found');
      return NextResponse.json({
        success: false,
        error: 'Authentication required',
      }, { status: 401 });
    }
    
    console.log('📖 [Analyst Report Read API] Marking analyst report as read:', FileID);
    
    // Call external API
    const upstreamUrl = new URL('markAnalystReportAsRead', UPSTREAM).toString();
    const externalResponse = await fetch(upstreamUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ FileID }),
      signal: AbortSignal.timeout(15000),
    });
    
    console.log('📖 [Analyst Report Read API] External API response status:', externalResponse.status);
    
    if (!externalResponse.ok) {
      console.error('❌ [Analyst Report Read API] External API error:', externalResponse.status);
      const errorText = await externalResponse.text();
      return NextResponse.json({
        success: false,
        error: `External API returned ${externalResponse.status}: ${errorText}`,
      }, { status: externalResponse.status });
    }
    
    const responseData = await externalResponse.json().catch(() => ({}));
    console.log('📖 [Analyst Report Read API] Analyst report marked as read successfully');
    
    return NextResponse.json({
      success: true,
      data: responseData,
      timestamp: Date.now()
    });

  } catch (error) {
    console.error('❌ [Analyst Report Read API] Error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: Date.now()
    }, { status: 500 });
  }
}

