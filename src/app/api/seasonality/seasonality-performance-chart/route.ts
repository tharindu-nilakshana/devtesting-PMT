import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { API_CONFIG } from '@/lib/api';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { symbol = 'EURUSD', additionalSettings, baseYear } = body;

    // Extract first 3 letters from symbol (e.g., EURUSD -> EUR, AUDCAD -> AUD)
    const symbolPart = symbol.substring(0, 3).toUpperCase();

    // Get authentication token from cookies
    const cookieStore = await cookies();
    const authToken = cookieStore.get('pmt_auth_token')?.value;

    // Use fallback token when no auth token is found
    const tokenToUse = authToken || 'b4ea98d0c6a780900de46f3185efad1c-b4c510fedcd2c9d7f9cef6f8f665092b-cebc4481afe5e4d7e3b8bea5df2c2169-20306e6c5ecafd55baf3bfc72ab61360';
    
    if (!authToken) {
      console.log('⚠️ [Seasonality Performance Chart API] Using fallback token');
    }

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

    try {
      // Use the working API endpoint with real data
      const apiUrl = `${API_CONFIG.UPSTREAM_API}getSeasonalityPerformanceChart`;
      // console.log('🌐 [Seasonality Performance Chart API] Calling external API:', {
      //   url: apiUrl,
      //   originalSymbol: symbol,
      //   symbolPart,
      //   additionalSettings
      // });
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenToUse}`,
        },
        body: JSON.stringify({
          GetSeasonalityPerformanceChart: true,
          symbol: symbolPart, // Send only the first 3 letters
          chartType: additionalSettings || 'bar', // Include chart type
          baseYear: baseYear || '5d', // Include timeline parameter
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Seasonality Performance Chart API error:', response.status, errorText);
        
        return NextResponse.json({
          success: false,
          error: `API returned ${response.status}: ${errorText}`,
        }, { status: response.status });
      }

      const responseText = await response.text();
      const data = JSON.parse(responseText);
      
      // console.log('Seasonality Performance Chart API response:', {
      //   hasData: !!data,
      //   hasCslabel: !!data.cslabel,
      //   cslabelLength: data.cslabel?.length || 0,
      //   hasCurrentval: !!data.currentval,
      //   currentvalLength: data.currentval?.length || 0,
      //   responseKeys: Object.keys(data),
      //   dataPreview: data.cslabel ? `Labels: ${data.cslabel.length}, Current: ${data.currentval?.length || 0}` : 'No data'
      // });

      return NextResponse.json({
        success: true,
        data: data, // Use the entire response as data
        meta: {
          symbol,
          symbolPart,
          chartType: additionalSettings || 'bar',
          module: 'Forex',
          timestamp: Date.now(),
        }
      });

    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        console.error('Seasonality Performance Chart API timeout');
        return NextResponse.json({
          success: false,
          error: 'Request timeout - please try again',
        }, { status: 408 });
      }
      
      console.error('Seasonality Performance Chart API fetch error:', fetchError);
      return NextResponse.json({
        success: false,
        error: `Fetch error: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`,
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Error in seasonality performance chart API:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
