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
      console.log('⚠️ [GetTabWidgetsByTabWidgetID API] No auth token found, using fallback token');
    }

    // Use BASE_URL (which already has trailing slash) - this should be https://frontendapi.primemarket-terminal.com/
    // Ensure proper URL construction
    const baseUrl = API_CONFIG.BASE_URL.endsWith('/') 
      ? API_CONFIG.BASE_URL 
      : `${API_CONFIG.BASE_URL}/`;
    const apiUrl = `${baseUrl}getTabWidgetsByTabWidgetIDWeb`;

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

    try {
      // Parse request body to get TabWidgetID if provided
      const body = await request.json().catch(() => ({}));
      
      console.log('📡 [GetTabWidgetsByTabWidgetID API] Calling external API:', {
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
        console.error('❌ [GetTabWidgetsByTabWidgetID API] External API error:', errorText);
        
        return NextResponse.json(
          { 
            error: 'Failed to get tab widgets by TabWidgetID',
            details: errorText,
            status: response.status
          },
          { status: response.status }
        );
      }

      const result = await response.json();
      // console.log('✅ [GetTabWidgetsByTabWidgetID API] Tab widgets fetched successfully:', {
      //   count: result.Count || result.Data?.length || 0
      // });

      return NextResponse.json(result);

    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        console.error('❌ [GetTabWidgetsByTabWidgetID API] Request timeout');
        return NextResponse.json(
          { error: 'Request timeout' },
          { status: 408 }
        );
      }
      
      console.error('❌ [GetTabWidgetsByTabWidgetID API] Fetch error:', fetchError);
      return NextResponse.json(
        { error: 'Failed to connect to tab widget service' },
        { status: 502 }
      );
    }

  } catch (error) {
    console.error('❌ [GetTabWidgetsByTabWidgetID API] Error getting tab widgets:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

