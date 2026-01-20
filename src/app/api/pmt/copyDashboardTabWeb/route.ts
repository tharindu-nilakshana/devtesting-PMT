import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { API_CONFIG } from '@/lib/api';

export async function POST(request: NextRequest) {
  try {
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error('❌ [CopyDashboardTab API] Failed to parse request body:', parseError);
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }
    
    const { TabID, TabName, WgID } = body;

    // Validate required fields
    if (!TabID || !TabName || !WgID) {
      return NextResponse.json(
        { error: 'TabID, TabName, and WgID are required' },
        { status: 400 }
      );
    }

    // Get authentication token from cookies
    const cookieStore = await cookies();
    const authToken = cookieStore.get('pmt_auth_token')?.value;

    // Use fallback token when no auth token is found
    const tokenToUse = authToken || API_CONFIG.API_TOKEN;
    
    if (!authToken) {
      console.log('⚠️ [CopyDashboardTab API] No auth token found, using fallback token');
    }

    const baseUrl = API_CONFIG.BASE_URL.endsWith('/') 
      ? API_CONFIG.BASE_URL 
      : `${API_CONFIG.BASE_URL}/`;
    const apiUrl = `${baseUrl}copyDashboardTabWeb`;

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const requestBody = {
        TabID: Number(TabID),
        TabName: String(TabName),
        WgID: Number(WgID)
      };

      console.log('📡 [CopyDashboardTab API] Calling external API:', {
        url: apiUrl,
        requestBody,
        hasAuth: !!authToken
      });

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenToUse}`,
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [CopyDashboardTab API] External API error:', errorText);
        
        return NextResponse.json(
          { 
            error: 'Failed to copy dashboard tab',
            details: errorText,
            status: response.status
          },
          { status: response.status }
        );
      }

      const result = await response.json();
      console.log('✅ [CopyDashboardTab API] Dashboard tab copied successfully:', result);

      return NextResponse.json(result);

    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        console.error('❌ [CopyDashboardTab API] Request timeout');
        return NextResponse.json(
          { error: 'Request timeout' },
          { status: 408 }
        );
      }
      
      console.error('❌ [CopyDashboardTab API] Fetch error:', fetchError);
      return NextResponse.json(
        { error: 'Failed to connect to tab widget service' },
        { status: 502 }
      );
    }

  } catch (error) {
    console.error('❌ [CopyDashboardTab API] Error copying dashboard tab:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}




