import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { API_CONFIG } from '@/lib/api';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { CustomDashboardTabID } = body;

    console.log('🖥️ [SERVER] deleteTabWidgetWeb API called:', {
      CustomDashboardTabID,
      timestamp: new Date().toISOString()
    });

    // Validate required fields
    if (!CustomDashboardTabID) {
      console.log('❌ [SERVER] Missing CustomDashboardTabID in request');
      return NextResponse.json(
        { error: 'CustomDashboardTabID is required' },
        { status: 400 }
      );
    }

    // Get authentication token from cookies
    const cookieStore = await cookies();
    const authToken = cookieStore.get('pmt_auth_token')?.value;

    // Use fallback token when no auth token is found (like other endpoints)
    const tokenToUse = authToken || API_CONFIG.API_TOKEN;
    
    if (!authToken) {
      console.log('⚠️ [DeleteTabWidget API] No auth token found, using fallback token');
    }

    // Use BASE_URL (which already has trailing slash) - this should be https://frontendapi.primemarket-terminal.com/
    // Ensure proper URL construction
    const baseUrl = API_CONFIG.BASE_URL.endsWith('/') 
      ? API_CONFIG.BASE_URL 
      : `${API_CONFIG.BASE_URL}/`;
    const apiUrl = `${baseUrl}deleteTabWidgetWeb`;

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

    try {
      console.log('📡 [DeleteTabWidget API] Calling external API:', {
        url: apiUrl,
        CustomDashboardTabID,
        hasAuth: !!authToken
      });

      // Forward the request to the actual endpoint with authentication
      // Note: The external API expects DELETE method, not POST
      const response = await fetch(apiUrl, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenToUse}`,
        },
        body: JSON.stringify({
          CustomDashboardTabID: Number(CustomDashboardTabID)
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [DeleteTabWidget API] External API error:', errorText);
        
        return NextResponse.json(
          { 
            error: 'Failed to delete tab widget',
            details: errorText,
            status: response.status
          },
          { status: response.status }
        );
      }

      const result = await response.json();
      console.log('✅ [SERVER] Tab widget deleted successfully:', {
        CustomDashboardTabID,
        status: result.Status,
        message: result.Message
      });

      return NextResponse.json(result);

    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        console.error('❌ [DeleteTabWidget API] Request timeout');
        return NextResponse.json(
          { error: 'Request timeout' },
          { status: 408 }
        );
      }
      
      console.error('❌ [DeleteTabWidget API] Fetch error:', fetchError);
      return NextResponse.json(
        { error: 'Failed to connect to tab widget service' },
        { status: 502 }
      );
    }

  } catch (error) {
    console.error('❌ [DeleteTabWidget API] Error deleting tab widget:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

