import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { API_CONFIG } from '@/lib/api';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { TabID } = body;

    console.log('🖥️ [SERVER] getTabGridPositionsByTabIdWeb API called:', {
      TabID,
      timestamp: new Date().toISOString()
    });

    // Validate required fields
    if (!TabID) {
      console.log('❌ [SERVER] Missing TabID in request');
      return NextResponse.json(
        { error: 'TabID is required' },
        { status: 400 }
      );
    }

    // Get authentication token from cookies
    const cookieStore = await cookies();
    const authToken = cookieStore.get('pmt_auth_token')?.value;

    // Use fallback token when no auth token is found (like other endpoints)
    const tokenToUse = authToken || API_CONFIG.API_TOKEN;
    
    if (!authToken) {
      console.log('⚠️ [GetTabGridPositions API] No auth token found, using fallback token');
    }

    // Use BASE_URL (which already has trailing slash) - this should be https://frontendapi.primemarket-terminal.com/
    // Ensure proper URL construction
    const baseUrl = API_CONFIG.BASE_URL.endsWith('/') 
      ? API_CONFIG.BASE_URL 
      : `${API_CONFIG.BASE_URL}/`;
    const apiUrl = `${baseUrl}getTabGridPositionsByTabIdWeb`;

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

    try {
      const requestBody = {
        TabID: Number(TabID)
      };

      console.log('📡 [GetTabGridPositions API] Calling external API:', {
        url: apiUrl,
        requestBody,
        hasAuth: !!authToken
      });

      // Forward the request to the actual endpoint with authentication
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
        console.error('❌ [GetTabGridPositions API] External API error:', errorText);
        
        return NextResponse.json(
          { 
            error: 'Failed to get tab grid positions',
            details: errorText,
            status: response.status
          },
          { status: response.status }
        );
      }

      const result = await response.json();
      
      // Map GridPositions to Data for consistency with the expected response format
      // The API returns GridPositions but our code expects Data
      const mappedResult = {
        ...result,
        Data: result.GridPositions || result.Data || [],
        Count: result.GridPositions?.length || result.Count || result.Data?.length || 0
      };
      
      // console.log('✅ [SERVER] Tab grid positions fetched successfully:', {
      //   TabID,
      //   status: mappedResult.Status,
      //   count: mappedResult.Count,
      //   hasData: mappedResult.Data.length > 0,
      //   gridPositionsCount: result.GridPositions?.length || 0
      // });

      return NextResponse.json(mappedResult);

    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        console.error('❌ [GetTabGridPositions API] Request timeout');
        return NextResponse.json(
          { error: 'Request timeout' },
          { status: 408 }
        );
      }
      
      console.error('❌ [GetTabGridPositions API] Fetch error:', fetchError);
      return NextResponse.json(
        { error: 'Failed to connect to tab grid positions service' },
        { status: 502 }
      );
    }

  } catch (error) {
    console.error('❌ [GetTabGridPositions API] Error getting tab grid positions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

