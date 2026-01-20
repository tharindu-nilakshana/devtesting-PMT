import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { API_CONFIG } from '@/lib/api';

export async function POST(request: NextRequest) {
  try {
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error('❌ [RenameDashboardTab API] Failed to parse request body:', parseError);
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }
    
    const { RenameDashboardTab, NewName } = body;

    // Validate required fields
    if (!RenameDashboardTab || !NewName) {
      return NextResponse.json(
        { error: 'RenameDashboardTab and NewName are required' },
        { status: 400 }
      );
    }

    // Get authentication token from cookies
    const cookieStore = await cookies();
    const authToken = cookieStore.get('pmt_auth_token')?.value;

    // Use fallback token when no auth token is found
    const tokenToUse = authToken || API_CONFIG.API_TOKEN;
    
    if (!authToken) {
      console.log('⚠️ [RenameDashboardTab API] No auth token found, using fallback token');
    }

    const baseUrl = API_CONFIG.BASE_URL.endsWith('/') 
      ? API_CONFIG.BASE_URL 
      : `${API_CONFIG.BASE_URL}/`;
    const apiUrl = `${baseUrl}renameDashboardTabWeb`;

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const requestBody = {
        RenameDashboardTab: Number(RenameDashboardTab),
        NewName: String(NewName)
      };

      console.log('📡 [RenameDashboardTab API] Calling external API:', {
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
        console.error('❌ [RenameDashboardTab API] External API error:', errorText);
        
        return NextResponse.json(
          { 
            error: 'Failed to rename dashboard tab',
            details: errorText,
            status: response.status
          },
          { status: response.status }
        );
      }

      const result = await response.json();
      console.log('✅ [RenameDashboardTab API] Dashboard tab renamed successfully:', result);

      return NextResponse.json(result);

    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        console.error('❌ [RenameDashboardTab API] Request timeout');
        return NextResponse.json(
          { error: 'Request timeout' },
          { status: 408 }
        );
      }
      
      console.error('❌ [RenameDashboardTab API] Fetch error:', fetchError);
      return NextResponse.json(
        { error: 'Failed to connect to tab widget service' },
        { status: 502 }
      );
    }

  } catch (error) {
    console.error('❌ [RenameDashboardTab API] Error renaming dashboard tab:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}




