import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { API_CONFIG } from '@/lib/api';

export async function POST(request: NextRequest) {
  try {
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error('❌ [UpdateTabWidget API] Failed to parse request body:', parseError);
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const {
      CustomDashboardTabID,
      TabWidgetID,
      TabIcon,
      TabName,
      TabGrid,
      TabWidgetGap,
      TabOrder,
      IsPredefined,
      TabColor,
      IsFavourite
    } = body;

    const parsedCustomDashboardTabID = Number(CustomDashboardTabID);
    const parsedTabWidgetID = Number(TabWidgetID);
    const parsedTabOrder = TabOrder !== undefined ? Number(TabOrder) : undefined;
    const parsedIsPredefined = IsPredefined !== undefined ? Number(IsPredefined) : undefined;
    const parsedIsFavourite = IsFavourite !== undefined ? Number(IsFavourite) : undefined;

    if (!Number.isFinite(parsedCustomDashboardTabID) || parsedCustomDashboardTabID <= 0) {
      return NextResponse.json(
        { error: 'CustomDashboardTabID must be a positive number' },
        { status: 400 }
      );
    }

    if (!Number.isFinite(parsedTabWidgetID) || parsedTabWidgetID <= 0) {
      return NextResponse.json(
        { error: 'TabWidgetID must be a positive number' },
        { status: 400 }
      );
    }

    if (!TabName || typeof TabName !== 'string' || TabName.trim() === '') {
      return NextResponse.json(
        { error: 'TabName is required' },
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

    const cookieStore = await cookies();
    const authToken = cookieStore.get('pmt_auth_token')?.value;
    const tokenToUse = authToken || API_CONFIG.API_TOKEN;

    if (!authToken) {
      console.log('⚠️ [UpdateTabWidget API] No auth token found, using fallback token');
    }

    const baseUrl = API_CONFIG.BASE_URL.endsWith('/')
      ? API_CONFIG.BASE_URL
      : `${API_CONFIG.BASE_URL}/`;
    const apiUrl = `${baseUrl}updateTabWidgetWeb`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const requestBody: Record<string, unknown> = {
        CustomDashboardTabID: parsedCustomDashboardTabID,
        TabWidgetID: parsedTabWidgetID,
        TabName: String(TabName).trim()
      };

      if (TabIcon !== undefined) requestBody.TabIcon = TabIcon;
      if (TabGrid !== undefined) requestBody.TabGrid = String(TabGrid);
      if (TabWidgetGap !== undefined) requestBody.TabWidgetGap = String(TabWidgetGap);
      if (parsedTabOrder !== undefined) requestBody.TabOrder = parsedTabOrder;
      if (parsedIsPredefined !== undefined) requestBody.IsPredefined = parsedIsPredefined;
      if (TabColor !== undefined) requestBody.TabColor = TabColor;
      if (parsedIsFavourite !== undefined) requestBody.IsFavourite = parsedIsFavourite;

      console.log('📡 [UpdateTabWidget API] Calling external API:', {
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
        console.error('❌ [UpdateTabWidget API] External API error:', errorText);
        return NextResponse.json(
          {
            error: 'Failed to update tab widget',
            details: errorText,
            status: response.status
          },
          { status: response.status }
        );
      }

      const result = await response.json();
      console.log('✅ [UpdateTabWidget API] Tab widget updated successfully:', result);

      return NextResponse.json(result);
    } catch (fetchError) {
      clearTimeout(timeoutId);

      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        console.error('❌ [UpdateTabWidget API] Request timeout');
        return NextResponse.json(
          { error: 'Request timeout' },
          { status: 408 }
        );
      }

      console.error('❌ [UpdateTabWidget API] Fetch error:', fetchError);
      return NextResponse.json(
        { error: 'Failed to connect to tab widget service' },
        { status: 502 }
      );
    }
  } catch (error) {
    console.error('❌ [UpdateTabWidget API] Error updating tab widget:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}




