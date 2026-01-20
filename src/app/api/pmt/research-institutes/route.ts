import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { API_CONFIG } from '../../../../lib/api';

const UPSTREAM = API_CONFIG.UPSTREAM_API;

export async function POST(request: NextRequest) {
  console.log('🏛️ [Research Institutes API] Request received');
  
  try {
    // Get authentication token
    const cookieStore = await cookies();
    const authToken = cookieStore.get('pmt_auth_token')?.value;
    
    if (!authToken) {
      console.error('❌ [Research Institutes API] No auth token found');
      return NextResponse.json({
        success: false,
        error: 'Authentication required',
      }, { status: 401 });
    }
    
    // Call external API using centralized config
    const upstreamUrl = new URL('getResearchFilesInstitutes', UPSTREAM).toString();
    const externalResponse = await fetch(upstreamUrl, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      signal: AbortSignal.timeout(15000),
    });
    
    console.log('🏛️ [Research Institutes API] External API response status:', externalResponse.status);
    
    if (!externalResponse.ok) {
      console.error('❌ [Research Institutes API] External API error:', externalResponse.status);
      return NextResponse.json({
        success: false,
        error: `External API returned ${externalResponse.status}`,
      }, { status: externalResponse.status });
    }
    
    const responseData = await externalResponse.json();
    console.log('🏛️ [Research Institutes API] External API response received, institute count:', responseData?.length || 0);
    
    return NextResponse.json({
      success: true,
      data: responseData,
      timestamp: Date.now()
    });

  } catch (error) {
    console.error('❌ [Research Institutes API] Error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: Date.now()
    }, { status: 500 });
  }
}

