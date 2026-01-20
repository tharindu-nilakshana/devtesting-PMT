import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { API_CONFIG } from '@/lib/api';

// Handle both GET and POST requests
export async function GET(request: NextRequest) {
  return handleRiskSentimentRequest(request, 'GET');
}

export async function POST(request: NextRequest) {
  return handleRiskSentimentRequest(request, 'POST');
}

async function handleRiskSentimentRequest(request: NextRequest, method: 'GET' | 'POST') {
  try {
    // Handle requests without body gracefully
    let body: { widgetType?: string; currentRegion?: string } = {};
    
    if (method === 'POST') {
      try {
        body = await request.json();
      } catch {
        console.log('⚠️ [RiskSentiment API] No JSON body provided, using defaults');
        body = {};
      }
    } else if (method === 'GET') {
      // Extract parameters from URL for GET requests
      const url = new URL(request.url);
      body = {
        widgetType: url.searchParams.get('widgetType') || 'chart',
        currentRegion: url.searchParams.get('currentRegion') || undefined
      };
    }
    
    const { widgetType = 'chart', currentRegion } = body;

    // Get authentication token from cookies
    const cookieStore = await cookies();
    const token = cookieStore.get('pmt_auth_token')?.value;

    console.log('🔐 [RiskSentiment API] Auth check:', { 
      hasToken: !!token, 
      tokenLength: token?.length || 0,
      allCookies: Array.from(cookieStore.getAll()).map(c => c.name)
    });

    if (!token) {
      console.log('❌ [RiskSentiment API] No auth token found');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Determine current market session if not provided
    const region = currentRegion || getActiveMarketSession();

    // Prepare request data for external API (matching curl command format)
    const timezoneOffset = new Date().getTimezoneOffset();
    const offsetHours = Math.floor(Math.abs(timezoneOffset) / 60);
    const offsetMinutes = Math.abs(timezoneOffset) % 60;
    const offsetSign = timezoneOffset <= 0 ? '+' : '-';
    const formattedOffset = `${offsetSign}${offsetHours.toString().padStart(2, '0')}:${offsetMinutes.toString().padStart(2, '0')}`;
    
    const requestData = {
      GetRiskSentiment: true,
      widget_type: widgetType === 'risk_indicator' ? 'risk_indicator' : 'chart',
      current_region: `${region} Overview`,
      LoggedInTimeOffset: formattedOffset
    };

    // Create AbortController for timeout handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

    // Call external PMT API using the correct Risk Sentiment endpoint
    console.log('🌐 [RiskSentiment API] Calling external API:', {
      url: `${API_CONFIG.UPSTREAM_API}getRiskSentimentData`,
      requestData,
      tokenLength: token.length
    });

    const response = await fetch(`${API_CONFIG.UPSTREAM_API}getRiskSentimentData`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(requestData),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    console.log('📡 [RiskSentiment API] External API response:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    });

    if (!response.ok) {
      console.error('❌ [RiskSentiment API] External API failed:', response.status, response.statusText);
      return NextResponse.json(
        { error: 'Failed to fetch risk sentiment data' },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    console.log('📊 [RiskSentiment API] Raw response data:', {
      dataType: typeof data,
      dataKeys: Object.keys(data || {}),
      hasAllRecords: !!data?.allRecords,
      allRecordsLength: data?.allRecords?.length || 0,
      hasLatestRecord: !!data?.latestRecord,
      sampleData: data?.allRecords?.[0] || 'No records',
      fullDataStructure: data,
      dataFieldContent: data?.data,
      dataFieldKeys: data?.data ? Object.keys(data.data) : 'No data field',
      dataFieldType: typeof data?.data
    });

    // Check if we have actual data
    const hasData = data?.data?.latestRecord && data?.data?.allRecords?.length > 0;
    
    if (!hasData) {
      console.log('⚠️ [RiskSentiment API] No data available from external API');
      return NextResponse.json({
        success: false,
        error: 'No data available from external API',
        data: null
      });
    }

    return NextResponse.json({
      success: true,
      data: data.data, // Return the nested data directly to match fallback structure
      widgetType: widgetType,
      currentRegion: region,
      timestamp: Date.now()
    });

  } catch (error) {
    console.error('Error fetching risk sentiment data:', error);
    
    // Handle specific error types
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        console.log('⏰ [RiskSentiment API] Request timeout');
        return NextResponse.json(
          { error: 'Request timeout - external API is not responding' },
          { status: 408 }
        );
      }
      
      if (error.message.includes('fetch failed') || error.message.includes('ConnectTimeoutError')) {
        console.log('🌐 [RiskSentiment API] Connection failed');
        return NextResponse.json(
          { error: 'Unable to connect to external API - please try again later' },
          { status: 503 }
        );
      }
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to determine active market session
function getActiveMarketSession(): string {
  const now = new Date();
  const utcHour = now.getUTCHours();
  
  // Market session logic based on UTC hours
  if (utcHour >= 0 && utcHour < 8) {
    return 'Asia';
  } else if (utcHour >= 8 && utcHour < 16) {
    return 'Europe';
  } else {
    return 'US';
  }
}
