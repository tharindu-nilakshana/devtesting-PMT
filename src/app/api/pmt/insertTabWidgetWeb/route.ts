import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { API_CONFIG } from '@/lib/api';

export async function POST(request: NextRequest) {
  try {
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error('❌ [InsertTabWidget API] Failed to parse request body:', parseError);
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }
    
    const { TabWidgetID, TabIcon, TabName, TabGrid, TabWidgetGap, TabOrder, IsPredefined, IsFavourite, TabColor } = body;

    const parsedTabWidgetID = Number(TabWidgetID);
    const parsedTabGrid = TabGrid !== undefined ? Number(TabGrid) : undefined;
    const parsedTabWidgetGap = TabWidgetGap !== undefined ? Number(TabWidgetGap) : undefined;
    const parsedTabOrder = TabOrder !== undefined ? Number(TabOrder) : undefined;
    const parsedIsPredefined = IsPredefined !== undefined ? Number(IsPredefined) : undefined;
    const parsedIsFavourite = IsFavourite !== undefined ? Number(IsFavourite) : undefined;

    // Validate required fields
    if (!Number.isFinite(parsedTabWidgetID) || !TabName) {
      return NextResponse.json(
        { error: 'TabWidgetID and TabName are required' },
        { status: 400 }
      );
    }

    if (parsedTabGrid !== undefined && !Number.isFinite(parsedTabGrid)) {
      return NextResponse.json(
        { error: 'TabGrid must be a number if provided' },
        { status: 400 }
      );
    }

    if (parsedTabWidgetGap !== undefined && !Number.isFinite(parsedTabWidgetGap)) {
      return NextResponse.json(
        { error: 'TabWidgetGap must be a number if provided' },
        { status: 400 }
      );
    }

    if (parsedTabOrder !== undefined && !Number.isFinite(parsedTabOrder)) {
      return NextResponse.json(
        { error: 'TabOrder must be a number if provided' },
        { status: 400 }
      );
    }

    if (parsedIsPredefined !== undefined && !Number.isFinite(parsedIsPredefined)) {
      return NextResponse.json(
        { error: 'IsPredefined must be a number if provided' },
        { status: 400 }
      );
    }

    if (parsedIsFavourite !== undefined && !Number.isFinite(parsedIsFavourite)) {
      return NextResponse.json(
        { error: 'IsFavourite must be a number if provided' },
        { status: 400 }
      );
    }

    // Get authentication token from cookies
    const cookieStore = await cookies();
    const authToken = cookieStore.get('pmt_auth_token')?.value;

    // Use fallback token when no auth token is found (like other endpoints)
    const tokenToUse = authToken || API_CONFIG.API_TOKEN;
    
    if (!authToken) {
      console.log('⚠️ [InsertTabWidget API] No auth token found, using fallback token');
    }

    // Use BASE_URL (which already has trailing slash) - this should be https://frontendapi.primemarket-terminal.com/
    // Ensure proper URL construction
    if (!API_CONFIG.BASE_URL) {
      console.error('❌ [InsertTabWidget API] BASE_URL is not defined');
      return NextResponse.json(
        { error: 'API configuration error: BASE_URL is not defined' },
        { status: 500 }
      );
    }
    
    const baseUrl = API_CONFIG.BASE_URL.endsWith('/') 
      ? API_CONFIG.BASE_URL 
      : `${API_CONFIG.BASE_URL}/`;
    const apiUrl = `${baseUrl}insertTabWidgetWeb`;
    
    console.log('🔍 [InsertTabWidget API] URL construction:', {
      BASE_URL: API_CONFIG.BASE_URL,
      baseUrl,
      apiUrl
    });

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

    try {
      // Prepare request body with only provided fields
      const requestBody: Record<string, unknown> = {
        TabWidgetID: parsedTabWidgetID,
        TabName: TabName
      };

      // Add optional fields only if provided
      if (TabIcon !== undefined) requestBody.TabIcon = TabIcon;
      if (parsedTabGrid !== undefined) requestBody.TabGrid = parsedTabGrid.toString();
      if (parsedTabWidgetGap !== undefined) requestBody.TabWidgetGap = parsedTabWidgetGap.toString();
      if (parsedTabOrder !== undefined) requestBody.TabOrder = parsedTabOrder;
      if (parsedIsPredefined !== undefined) requestBody.IsPredefined = parsedIsPredefined;
      if (parsedIsFavourite !== undefined) requestBody.IsFavourite = parsedIsFavourite;
      if (TabColor !== undefined) requestBody.TabColor = TabColor;

      console.log('📡 [InsertTabWidget API] Calling external API:', {
        url: apiUrl,
        requestBody,
        requestBodyString: JSON.stringify(requestBody),
        hasAuth: !!authToken,
        tokenPreview: tokenToUse ? `${tokenToUse.substring(0, 20)}...` : 'No token'
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

      // Log response details
      console.log('📥 [InsertTabWidget API] External API response:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [InsertTabWidget API] External API HTTP error:', {
          status: response.status,
          statusText: response.statusText,
          errorText
        });
        
        return NextResponse.json(
          { 
            error: 'Failed to insert tab widget',
            details: errorText,
            status: response.status
          },
          { status: response.status }
        );
      }

      const result = await response.json();
      
      // Check if the response indicates an error even with HTTP 200
      if (result.Status === 'Error' || result.status === 'Error') {
        console.error('❌ [InsertTabWidget API] External API returned error in response body:', result);
        return NextResponse.json(
          { 
            error: 'Failed to insert tab widget',
            details: JSON.stringify(result),
            status: 500
          },
          { status: 500 }
        );
      }
      
      console.log('✅ [InsertTabWidget API] Tab widget inserted successfully:', result);

      return NextResponse.json(result);

    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        console.error('❌ [InsertTabWidget API] Request timeout');
        return NextResponse.json(
          { error: 'Request timeout' },
          { status: 408 }
        );
      }
      
      console.error('❌ [InsertTabWidget API] Fetch error:', fetchError);
      return NextResponse.json(
        { error: 'Failed to connect to tab widget service' },
        { status: 502 }
      );
    }

  } catch (error) {
    console.error('❌ [InsertTabWidget API] Error inserting tab widget:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('❌ [InsertTabWidget API] Error details:', {
      message: errorMessage,
      stack: errorStack,
      BASE_URL: API_CONFIG.BASE_URL
    });
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: errorMessage,
        details: process.env.NODE_ENV === 'development' ? errorStack : undefined
      },
      { status: 500 }
    );
  }
}

