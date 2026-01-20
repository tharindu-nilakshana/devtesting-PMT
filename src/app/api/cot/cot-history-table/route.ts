import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { API_CONFIG } from '@/lib/api';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { symbolPart, owner, symbolSelection = '1' } = body;

    // Get authentication token from cookies
    const cookieStore = await cookies();
    const authToken = cookieStore.get('pmt_auth_token')?.value;

    // Log current auth token for debugging
    console.log('🔐 [COT Table API] Current auth token:', {
      hasToken: !!authToken,
      tokenLength: authToken?.length || 0,
      tokenPreview: authToken ? `${authToken.substring(0, 20)}...` : 'None',
      tokenEnd: authToken ? `...${authToken.substring(authToken.length - 20)}` : 'None',
      fullToken: authToken || 'None' // Log full token for debugging
    });

    // Use fallback token when no auth token is found
    const tokenToUse = authToken || 'b4ea98d0c6a780900de46f3185efad1c-b4c510fedcd2c9d7f9cef6f8f665092b-cebc4481afe5e4d7e3b8bea5df2c2169-20306e6c5ecafd55baf3bfc72ab61360';
    
    if (!authToken) {
    }

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

    try {
      // Use the working API endpoint with real data
      const response = await fetch(`${API_CONFIG.UPSTREAM_API}getCOTTableViewRawData`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenToUse}`,
        },
        body: JSON.stringify({
          symbolPart: symbolPart,
          owner: owner,
          symbolSelection: symbolSelection
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('COT Table View API error:', response.status, errorText);
        
        return NextResponse.json({
          success: false,
          error: `API returned ${response.status}: ${errorText}`,
        }, { status: response.status });
      }

      const responseText = await response.text();
      const data = JSON.parse(responseText);
      
      console.log('COT Table View API response:', {
        hasTableData: !!data.tableData,
        tableDataLength: data.tableData?.length || 0,
        hasMaxid: !!data.maxid,
        maxid: data.maxid,
        responseKeys: Object.keys(data),
        firstRow: data.tableData?.[0]
      });

      return NextResponse.json({
        success: true,
        data: data.tableData, // Use tableData from the API response
        maxid: data.maxid || '0',
      });

    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      if (fetchError instanceof Error) {
        if (fetchError.name === 'AbortError') {
          console.error('COT Table View API timeout');
          return NextResponse.json({
            success: false,
            error: 'Request timeout - API took too long to respond',
            fallback: true,
          }, { status: 408 });
        }
        
        if (fetchError.message.includes('fetch failed') || fetchError.message.includes('ConnectTimeoutError')) {
          console.error('COT Table View API connection error:', fetchError.message);
          return NextResponse.json({
            success: false,
            error: 'Connection failed - Unable to reach API server',
            fallback: true,
          }, { status: 503 });
        }
      }
      
      console.error('COT Table View API request error:', fetchError);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch COT history data',
        fallback: true,
      }, { status: 500 });
    }

  } catch (error) {
    console.error('COT Table View API route error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
    }, { status: 500 });
  }
}
