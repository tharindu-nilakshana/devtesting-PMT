import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { API_CONFIG } from '@/lib/api';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { deviceId } = body;

    if (!deviceId) {
      return NextResponse.json(
        { error: 'Device ID is required' },
        { status: 400 }
      );
    }

    // Get authentication token from cookies
    const cookieStore = await cookies();
    const authToken = cookieStore.get('pmt_auth_token')?.value;

    console.log('🔐 [FCM Delete API] Auth check:', { 
      hasToken: !!authToken, 
      tokenLength: authToken?.length || 0,
      deviceId
    });

    // Use fallback token when no auth token is found (like other endpoints)
    const tokenToUse = authToken || API_CONFIG.API_TOKEN;
    
    if (!authToken) {
      console.log('⚠️ [FCM Delete API] No auth token found, using fallback token');
    }

    // Use the proper API configuration like other endpoints
    const apiUrl = `${API_CONFIG.UPSTREAM_API}deleteUserFcmTokenWeb`;

    console.log('🔄 [FCM Delete API] Deleting token from:', apiUrl);

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

    try {
      // Forward the request to the actual FCM delete endpoint with authentication
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenToUse}`,
        },
        body: JSON.stringify({
          deviceId
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      console.log('📡 [FCM Delete API] External API response:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [FCM Delete API] External API error:', errorText);
        
        return NextResponse.json(
          { 
            error: 'Failed to delete FCM token',
            details: errorText,
            status: response.status
          },
          { status: response.status }
        );
      }

      const result = await response.json();
      console.log('✅ [FCM Delete API] Token deleted successfully:', result);

      return NextResponse.json(result);

    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        console.error('❌ [FCM Delete API] Request timeout');
        return NextResponse.json(
          { error: 'Request timeout' },
          { status: 408 }
        );
      }
      
      console.error('❌ [FCM Delete API] Fetch error:', fetchError);
      return NextResponse.json(
        { error: 'Failed to connect to FCM service' },
        { status: 502 }
      );
    }

  } catch (error) {
    console.error('❌ [FCM Delete API] Error deleting FCM token:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

