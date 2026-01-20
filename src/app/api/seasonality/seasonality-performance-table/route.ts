import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { API_CONFIG } from '@/lib/api';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { symbol = 'EURUSD' } = body;

    // Get authentication token from cookies
    const cookieStore = await cookies();
    const authToken = cookieStore.get('pmt_auth_token')?.value;

    // Log current auth token for debugging
    // console.log('🔐 [Seasonality Performance Table API] Current auth token:', {
    //   hasToken: !!authToken,
    //   tokenLength: authToken?.length || 0,
    //   tokenPreview: authToken ? `${authToken.substring(0, 20)}...` : 'None',
    //   tokenEnd: authToken ? `...${authToken.substring(authToken.length - 20)}` : 'None',
    //   fullToken: authToken || 'None' // Log full token for debugging
    // });

    // Use fallback token when no auth token is found
    const tokenToUse = authToken || 'b4ea98d0c6a780900de46f3185efad1c-b4c510fedcd2c9d7f9cef6f8f665092b-cebc4481afe5e4d7e3b8bea5df2c2169-20306e6c5ecafd55baf3bfc72ab61360';
    
    if (!authToken) {
    }

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

    try {
      // Use the working API endpoint with real data
      const apiUrl = `${API_CONFIG.UPSTREAM_API}getSeasonalityPerformanceTable`;
      // console.log('🌐 [Seasonality Performance Table API] Calling external API:', {
      //   url: apiUrl,
      //   symbol
      // });
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenToUse}`,
        },
        body: JSON.stringify({
          GetSeasonalityPerformanceTable: true,
          symbol: symbol,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Seasonality Performance Table API error:', response.status, errorText);
        
        return NextResponse.json({
          success: false,
          error: `API returned ${response.status}: ${errorText}`,
        }, { status: response.status });
      }

      const responseText = await response.text();
      const data = JSON.parse(responseText);
      
      // console.log('Seasonality Performance Table API response:', {
      //   hasData: !!data.data,
      //   dataLength: data.data?.length || 0,
      //   responseKeys: Object.keys(data),
      //   dataPreview: data.data ? data.data.substring(0, 200) + '...' : 'No data'
      // });

      return NextResponse.json({
        success: true,
        data: data.data, // Use data from the API response
        meta: {
          symbol,
          timestamp: Date.now(),
        }
      });

    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      if (fetchError instanceof Error) {
        if (fetchError.name === 'AbortError') {
          console.error('Seasonality Performance Table API timeout');
          return NextResponse.json({
            success: false,
            error: 'Request timeout - API took too long to respond',
            fallback: true,
          }, { status: 408 });
        }
        
        if (fetchError.message.includes('fetch failed') || fetchError.message.includes('ConnectTimeoutError')) {
          console.error('Seasonality Performance Table API connection error:', fetchError.message);
          return NextResponse.json({
            success: false,
            error: 'Connection failed - Unable to reach API server',
            fallback: true,
          }, { status: 503 });
        }
      }
      
      console.error('Seasonality Performance Table API request error:', fetchError);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch seasonality performance data',
        fallback: true,
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Seasonality Performance Table API route error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
    }, { status: 500 });
  }
}
