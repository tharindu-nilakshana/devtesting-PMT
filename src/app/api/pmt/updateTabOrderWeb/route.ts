import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { API_CONFIG } from '@/lib/api';

export async function POST(request: NextRequest) {
  try {
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error('❌ [UpdateTabOrder API] Failed to parse request body:', parseError);
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }
    
    const { UpdateTabOrder } = body;

    // Validate required fields
    if (!UpdateTabOrder || !Array.isArray(UpdateTabOrder) || UpdateTabOrder.length === 0) {
      return NextResponse.json(
        { error: 'UpdateTabOrder array is required and must not be empty' },
        { status: 400 }
      );
    }

    // Validate each item in the array
    for (const item of UpdateTabOrder) {
      if (typeof item.tabid !== 'number' || typeof item.order !== 'number') {
        return NextResponse.json(
          { error: 'Each item in UpdateTabOrder must have tabid (number) and order (number)' },
          { status: 400 }
        );
      }
    }

    // Get authentication token from cookies
    const cookieStore = await cookies();
    const authToken = cookieStore.get('pmt_auth_token')?.value;

    // Use fallback token when no auth token is found
    const tokenToUse = authToken || API_CONFIG.API_TOKEN;
    
    if (!authToken) {
      console.log('⚠️ [UpdateTabOrder API] No auth token found, using fallback token');
    }

    const baseUrl = API_CONFIG.BASE_URL.endsWith('/') 
      ? API_CONFIG.BASE_URL 
      : `${API_CONFIG.BASE_URL}/`;
    const apiUrl = `${baseUrl}updateTabOrderWeb`;

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      console.log('📡 [UpdateTabOrder API] Calling external API:', {
        url: apiUrl,
        UpdateTabOrder,
        hasAuth: !!authToken
      });

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenToUse}`,
        },
        body: JSON.stringify({ UpdateTabOrder }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [UpdateTabOrder API] External API error:', errorText);
        
        return NextResponse.json(
          { 
            error: 'Failed to update tab order',
            details: errorText,
            status: response.status
          },
          { status: response.status }
        );
      }

      const result = await response.json();
      console.log('✅ [UpdateTabOrder API] Tab order updated successfully:', result);

      return NextResponse.json(result);

    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        console.error('❌ [UpdateTabOrder API] Request timeout');
        return NextResponse.json(
          { error: 'Request timeout' },
          { status: 408 }
        );
      }
      
      console.error('❌ [UpdateTabOrder API] Fetch error:', fetchError);
      return NextResponse.json(
        { error: 'Failed to connect to tab widget service' },
        { status: 502 }
      );
    }

  } catch (error) {
    console.error('❌ [UpdateTabOrder API] Error updating tab order:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}




