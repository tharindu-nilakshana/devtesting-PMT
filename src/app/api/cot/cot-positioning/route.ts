import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { API_CONFIG } from '@/lib/api';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { symbolPart, owner } = body;

    console.log('🔄 [COT Route] Received request body:', JSON.stringify(body));
    console.log('🔄 [COT Route] Parsed values:', { symbolPart, owner, symbolPartType: typeof symbolPart, ownerType: typeof owner });

    // Ensure we have valid values
    const finalSymbolPart = symbolPart || 'EUR';
    const finalOwner = owner || 'Dealer';
    
    console.log('🔄 [COT Route] Final values to send:', { finalSymbolPart, finalOwner });

    // Get authentication token from cookies
    const cookieStore = await cookies();
    const token = cookieStore.get('pmt_auth_token')?.value;

    console.log('🔐 [COT API] Auth check:', { 
      hasToken: !!token, 
      tokenLength: token?.length || 0
    });

    if (!token) {
      console.log('❌ [COT API] No auth token found');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Proxy the request to the actual API with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

    const requestPayload = {
      symbolPart: finalSymbolPart,
      owner: finalOwner
    };
    
    console.log('🔄 [COT Route] Sending to upstream API:', requestPayload);

    const response = await fetch(`${API_CONFIG.UPSTREAM_API}getCOTPositioning`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(requestPayload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    console.log('📡 [COT API] External API response:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    });

    if (!response.ok) {
      // Try to get error details from response
      let errorDetails = '';
      try {
        const errorData = await response.json();
        errorDetails = errorData.error || errorData.message || 'Unknown error';
        console.log('❌ [COT API] External API error details:', errorData);
      } catch {
        errorDetails = `HTTP ${response.status}: ${response.statusText}`;
      }
      
      return NextResponse.json(
        { 
          success: false, 
          error: `External API error: ${errorDetails}`,
          status: response.status,
          fallback: true
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('📊 [COT API] External API success response:', data);
    console.log('📊 [COT API] Response structure:', {
      hasLong: 'long' in data,
      hasShort: 'short' in data,
      hasChartdata: 'chartdata' in data,
      hasData: 'data' in data,
      longValue: data.long,
      shortValue: data.short,
      chartdataType: Array.isArray(data.chartdata) ? 'array' : typeof data.chartdata,
      chartdataLength: Array.isArray(data.chartdata) ? data.chartdata.length : 'N/A'
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ COT API proxy error:', error);
    
    // Handle specific error types
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Request timeout - API took too long to respond',
            fallback: true
          },
          { status: 408 }
        );
      } else if (error.message.includes('fetch failed') || error.message.includes('ConnectTimeoutError')) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Connection failed - API server may be unavailable',
            fallback: true
          },
          { status: 503 }
        );
      }
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch COT positioning data',
        details: error instanceof Error ? error.message : 'Unknown error',
        fallback: true
      },
      { status: 500 }
    );
  }
}
