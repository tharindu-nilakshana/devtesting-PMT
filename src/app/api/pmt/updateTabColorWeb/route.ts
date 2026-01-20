import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { API_CONFIG } from '@/lib/api';

export async function POST(request: NextRequest) {
  try {
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error('❌ [UpdateTabColor API] Failed to parse request body:', parseError);
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const { CustomDashboardTabID, TabColor } = body ?? {};

    if (!CustomDashboardTabID || typeof TabColor !== 'string' || TabColor.trim() === '') {
      console.warn('⚠️ [UpdateTabColor API] Missing required fields:', {
        CustomDashboardTabID,
        TabColor
      });
      return NextResponse.json(
        { error: 'CustomDashboardTabID and TabColor are required' },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const authToken = cookieStore.get('pmt_auth_token')?.value;
    const tokenToUse = authToken || API_CONFIG.API_TOKEN;

    if (!authToken) {
      console.log('⚠️ [UpdateTabColor API] No auth token found, using fallback token');
    }

    const baseUrl = API_CONFIG.BASE_URL.endsWith('/')
      ? API_CONFIG.BASE_URL
      : `${API_CONFIG.BASE_URL}/`;
    const apiUrl = `${baseUrl}updateTabColorWeb`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const requestBody = {
        CustomDashboardTabID: Number(CustomDashboardTabID),
        TabColor: String(TabColor)
      };

      console.log('📡 [UpdateTabColor API] Calling external API:', {
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
        console.error('❌ [UpdateTabColor API] External API error:', errorText);
        return NextResponse.json(
          {
            error: 'Failed to update tab color',
            details: errorText,
            status: response.status
          },
          { status: response.status }
        );
      }

      const result = await response.json();
      console.log('✅ [UpdateTabColor API] Tab color updated successfully:', result);

      return NextResponse.json(result);
    } catch (fetchError) {
      clearTimeout(timeoutId);

      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        console.error('❌ [UpdateTabColor API] Request timeout');
        return NextResponse.json(
          { error: 'Request timeout' },
          { status: 408 }
        );
      }

      console.error('❌ [UpdateTabColor API] Fetch error:', fetchError);
      return NextResponse.json(
        { error: 'Failed to connect to tab widget service' },
        { status: 502 }
      );
    }
  } catch (error) {
    console.error('❌ [UpdateTabColor API] Error updating tab color:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}




