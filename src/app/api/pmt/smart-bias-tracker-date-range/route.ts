import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { API_CONFIG } from '../../../../lib/api';

const UPSTREAM = API_CONFIG.UPSTREAM_API;

export async function POST(request: NextRequest) {
  console.log('📊 [Smart Bias Tracker Date Range API] Request received');
  
  try {
    let body: any = {};
    try {
      body = await request.json();
    } catch (error) {
      console.warn('⚠️ [Smart Bias Tracker Date Range API] Failed to parse request body:', error instanceof Error ? error.message : String(error));
      body = {};
    }
    
    const { startDate, endDate } = body;
    
    if (!startDate || !endDate) {
      console.error('❌ [Smart Bias Tracker Date Range API] Missing startDate or endDate');
      return NextResponse.json({
        success: false,
        error: 'startDate and endDate are required',
      }, { status: 400 });
    }
    
    // Get authentication token
    const cookieStore = await cookies();
    const authToken = cookieStore.get('pmt_auth_token')?.value;
    
    if (!authToken) {
      console.error('❌ [Smart Bias Tracker Date Range API] No auth token found');
      return NextResponse.json({
        success: false,
        error: 'Authentication required',
      }, { status: 401 });
    }
    
    console.log('📊 [Smart Bias Tracker Date Range API] Fetching data for date range:', startDate, 'to', endDate);
    
    // Call external API
    const apiUrl = new URL('getSmartBiasTrackerDataByDateRange', UPSTREAM).toString();
    const externalResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ startDate, endDate }),
    });
    
    console.log('📊 [Smart Bias Tracker Date Range API] External API response status:', externalResponse.status);
    
    if (!externalResponse.ok) {
      console.error('❌ [Smart Bias Tracker Date Range API] External API error:', externalResponse.status);
      const errorText = await externalResponse.text();
      return NextResponse.json({
        success: false,
        error: `External API returned ${externalResponse.status}: ${errorText}`,
        data: null,
      }, { status: externalResponse.status });
    }
    
    const responseData = await externalResponse.json();
    console.log('📊 [Smart Bias Tracker Date Range API] Received response');
    
    return NextResponse.json({
      success: true,
      data: responseData.data || responseData,
      timestamp: Date.now()
    });

  } catch (error) {
    console.error('❌ [Smart Bias Tracker Date Range API] Error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      data: null,
      timestamp: Date.now()
    }, { status: 500 });
  }
}

