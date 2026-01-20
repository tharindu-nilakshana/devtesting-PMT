import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { API_CONFIG } from '../../../../lib/api';

const UPSTREAM = API_CONFIG.UPSTREAM_API;

export async function POST(request: NextRequest) {
  console.log('📄 [Research Files API] Request received');
  
  try {
    let body: any = {};
    try {
      body = await request.json();
    } catch (error) {
      console.warn('⚠️ [Research Files API] Failed to parse request body, using defaults:', error instanceof Error ? error.message : String(error));
      body = {};
    }
    
    const { SearchString, FileType, Institute, sortby, sortorder } = body;
    
    // Get authentication token
    const cookieStore = await cookies();
    const authToken = cookieStore.get('pmt_auth_token')?.value;
    
    if (!authToken) {
      console.error('❌ [Research Files API] No auth token found');
      return NextResponse.json({
        success: false,
        error: 'Authentication required',
      }, { status: 401 });
    }
    
    const requestData = {
      SearchString: SearchString || '',
      FileType: FileType || 'research paper',
      Institute: Institute || '',
      sortby: sortby || 'Date',
      sortorder: sortorder || 'desc',
    };
    
    console.log('📄 [Research Files API] External API request data:', requestData);
    
    // Call external API using centralized config
    const upstreamUrl = new URL('getResearchFiles', UPSTREAM).toString();
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
    
    console.log('📄 [Research Files API] External API response status:', externalResponse.status);
    
    if (!externalResponse.ok) {
      console.error('❌ [Research Files API] External API error:', externalResponse.status);
      return NextResponse.json({
        success: false,
        error: `External API returned ${externalResponse.status}`,
      }, { status: externalResponse.status });
    }
    
    const responseData = await externalResponse.json();
    console.log('📄 [Research Files API] External API response received, file count:', responseData?.FileList?.length || 0);
    
    return NextResponse.json({
      success: true,
      data: responseData,
      timestamp: Date.now()
    });

  } catch (error) {
    console.error('❌ [Research Files API] Error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: Date.now()
    }, { status: 500 });
  }
}

