import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { API_CONFIG } from '../../../../lib/api';

const UPSTREAM = API_CONFIG.UPSTREAM_API;

export async function POST(request: NextRequest) {
  console.log('📊 [Macro Table API] Request received');
  
  const body = await request.json();
  const { country, tab, event, page, pageSize } = body;
  
  try {
    console.log('📊 [Macro Table API] Request data:', { country, tab, event, page, pageSize });
    
    // Get authentication token
    const cookieStore = await cookies();
    const authToken = cookieStore.get('pmt_auth_token')?.value;
    
    if (!authToken) {
      console.error('❌ [Macro Table API] No auth token found');
      return NextResponse.json({
        success: false,
        error: 'Authentication required',
      }, { status: 401 });
    }
    
    const requestData: Record<string, unknown> = {
      country: country || 'US',
      tab: tab || 'gdp',
      event: event || 'GDP',
    };
    
    // Add pagination if provided
    if (page !== undefined) {
      requestData.page = page;
    }
    if (pageSize !== undefined) {
      requestData.pageSize = pageSize;
    }
    
    console.log('📊 [Macro Table API] External API request data:', requestData);
    
    // Use paginated endpoint if page/pageSize provided, otherwise use regular endpoint
    const endpoint = (page !== undefined || pageSize !== undefined) 
      ? 'getMacroTableDataPaginated' 
      : 'getMacroTableData';
    
    // Call external API using centralized config
    const upstreamUrl = new URL(endpoint, UPSTREAM).toString();
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
    
    console.log('📊 [Macro Table API] External API response status:', externalResponse.status);
    
    if (!externalResponse.ok) {
      const errorText = await externalResponse.text();
      console.error('❌ [Macro Table API] External API error:', externalResponse.status, errorText);
      return NextResponse.json({
        success: false,
        error: `External API returned ${externalResponse.status}: ${errorText}`,
      }, { status: externalResponse.status });
    }
    
    const responseData = await externalResponse.json();
    console.log('📊 [Macro Table API] External API response data received');
    
    return NextResponse.json({
      success: true,
      data: responseData,
      timestamp: Date.now()
    });

  } catch (error) {
    console.error('❌ [Macro Table API] Error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: Date.now()
    }, { status: 500 });
  }
}

