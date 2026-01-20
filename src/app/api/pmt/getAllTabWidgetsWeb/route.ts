import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { API_CONFIG } from '@/lib/api';

export async function POST(request: NextRequest) {
  try {
    // Get authentication token from cookies
    const cookieStore = await cookies();
    const authToken = cookieStore.get('pmt_auth_token')?.value;

    // Use fallback token when no auth token is found (like other endpoints)
    const tokenToUse = authToken || API_CONFIG.API_TOKEN;
    
    if (!authToken) {
      console.log('⚠️ [GetAllTabWidgets API] No auth token found, using fallback token');
    }

    // Use BASE_URL (which already has trailing slash) - this should be https://frontendapi.primemarket-terminal.com/
    // Ensure proper URL construction
    const baseUrl = API_CONFIG.BASE_URL.endsWith('/') 
      ? API_CONFIG.BASE_URL 
      : `${API_CONFIG.BASE_URL}/`;
    const apiUrl = `${baseUrl}getAllTabWidgetsWeb`;

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

    try {
      // Parse request body to get TabWidgetID if provided
      const body = await request.json().catch(() => ({}));
      
      console.log('📡 [GetAllTabWidgets API] Calling external API:', {
        url: apiUrl,
        hasAuth: !!authToken,
        tabWidgetId: body.TabWidgetID
      });

      // Forward the request to the actual endpoint with authentication
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenToUse}`,
        },
        body: JSON.stringify(body), // Forward TabWidgetID if provided
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [GetAllTabWidgets API] External API error:', errorText);
        
        return NextResponse.json(
          { 
            error: 'Failed to get all tab widgets',
            details: errorText,
            status: response.status
          },
          { status: response.status }
        );
      }

      const result = await response.json();
      // console.log('✅ [GetAllTabWidgets API] All tab widgets fetched successfully:', {
      //   count: result.Count || result.Data?.length || 0
      // });

      return NextResponse.json(result);

    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        console.error('❌ [GetAllTabWidgets API] Request timeout');
        return NextResponse.json(
          { error: 'Request timeout' },
          { status: 408 }
        );
      }
      
      console.error('❌ [GetAllTabWidgets API] Fetch error:', fetchError);
      return NextResponse.json(
        { error: 'Failed to connect to tab widget service' },
        { status: 502 }
      );
    }

  } catch (error) {
    console.error('❌ [GetAllTabWidgets API] Error getting all tab widgets:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}





