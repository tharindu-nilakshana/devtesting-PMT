import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { API_CONFIG } from '@/lib/api';

// Handle both GET and POST requests
export async function GET(request: NextRequest) {
  return handleMainGridPropertiesRequest(request, 'GET');
}

export async function POST(request: NextRequest) {
  return handleMainGridPropertiesRequest(request, 'POST');
}

async function handleMainGridPropertiesRequest(request: NextRequest, method: 'GET' | 'POST') {
  try {
    // Get authentication token from cookies
    const cookieStore = await cookies();
    const token = cookieStore.get('pmt_auth_token')?.value;

    console.log('🔐 [MainGridProperties API] Auth check:', { 
      hasToken: !!token, 
      tokenLength: token?.length || 0,
      method
    });

    if (!token) {
      console.log('❌ [MainGridProperties API] No auth token found');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Handle GET request - fetch grid positions by template ID
    if (method === 'GET') {
      const url = new URL(request.url);
      const templateId = url.searchParams.get('templateId');

      if (!templateId) {
        return NextResponse.json(
          { error: 'Template ID is required' },
          { status: 400 }
        );
      }

      const templateIdNum = parseInt(templateId, 10);
      if (isNaN(templateIdNum)) {
        return NextResponse.json(
          { error: 'Invalid template ID' },
          { status: 400 }
        );
      }

      console.log('📥 [MainGridProperties API] Fetching grid positions for template:', templateIdNum);

      const response = await fetch(`${API_CONFIG.UPSTREAM_API}getMainGridPositionByTemplateWeb`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          TemplateID: templateIdNum
        }),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        console.error('❌ [MainGridProperties API] Failed to fetch grid positions:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        });
        return NextResponse.json(
          { error: 'Failed to fetch grid positions', details: errorText },
          { status: response.status }
        );
      }

      const data = await response.json();
      console.log('✅ [MainGridProperties API] Grid positions fetched successfully');

      return NextResponse.json({
        success: true,
        data: data,
        timestamp: Date.now()
      });
    }

    // Handle POST request - save grid positions
    if (method === 'POST') {
      let body: {
        templateId?: number;
        top?: string;
        left?: string;
        height?: string;
        width?: string;
      } = {};

      try {
        body = await request.json();
      } catch {
        console.log('⚠️ [MainGridProperties API] No JSON body provided');
        return NextResponse.json(
          { error: 'Request body is required' },
          { status: 400 }
        );
      }

      const { templateId, top, left, height, width } = body;

      if (!templateId || top === undefined || left === undefined || height === undefined || width === undefined) {
        return NextResponse.json(
          { error: 'Missing required fields: templateId, top, left, height, width' },
          { status: 400 }
        );
      }

      const templateIdNum = parseInt(String(templateId), 10);
      if (isNaN(templateIdNum)) {
        return NextResponse.json(
          { error: 'Invalid template ID' },
          { status: 400 }
        );
      }

      console.log('💾 [MainGridProperties API] Saving grid positions:', {
        templateId: templateIdNum,
        top: top.substring(0, 50) + '...',
        left: left.substring(0, 50) + '...',
        height: height.substring(0, 50) + '...',
        width: width.substring(0, 50) + '...'
      });

      const response = await fetch(`${API_CONFIG.UPSTREAM_API}insertMainGridPositionWeb`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          TemplateID: templateIdNum,
          Top: top,
          Left: left,
          Height: height,
          Width: width
        }),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        console.error('❌ [MainGridProperties API] Failed to save grid positions:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        });
        return NextResponse.json(
          { error: 'Failed to save grid positions', details: errorText },
          { status: response.status }
        );
      }

      const data = await response.json();
      console.log('✅ [MainGridProperties API] Grid positions saved successfully');

      return NextResponse.json({
        success: true,
        data: data,
        timestamp: Date.now()
      });
    }

    return NextResponse.json(
      { error: 'Method not allowed' },
      { status: 405 }
    );

  } catch (error) {
    console.error('❌ [MainGridProperties API] Error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('fetch failed') || error.message.includes('ConnectTimeoutError')) {
        console.log('🌐 [MainGridProperties API] Connection failed');
        return NextResponse.json(
          { error: 'Unable to connect to external API - please try again later' },
          { status: 503 }
        );
      }
    }
    
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}



