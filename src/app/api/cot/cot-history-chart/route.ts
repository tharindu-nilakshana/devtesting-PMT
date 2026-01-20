import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { API_CONFIG } from '@/lib/api';

export async function POST(request: NextRequest) {
  try {
    console.log('📡 [COT Chart API] Request received');
    
    const body = await request.json();
    
    // Parse request parameters
    const { widgetId, symbolPart, type, owner, interval, typ } = body;
    
    console.log('📡 [COT Chart API] Request data:', { widgetId, symbolPart, type, owner, interval, typ });
    
    // Get authentication token
    const cookieStore = await cookies();
    const authToken = cookieStore.get('pmt_auth_token')?.value;
    
    console.log('🔐 [COT Chart API] Auth token status:', {
      hasToken: !!authToken,
      tokenLength: authToken?.length || 0,
      tokenPreview: authToken ? `${authToken.substring(0, 20)}...` : 'None'
    });
    
    if (!authToken) {
      console.warn('⚠️ [COT Chart API] No auth token found, returning mock data');
      
      // Return mock data for development
      const mockData = {
        seriesname: type || 'NetPercent',
        Categories: ['2025-01-01', '2025-01-02', '2025-01-03', '2025-01-04', '2025-01-05'],
        OpenInterest: [100000, 105000, 98000, 110000, 102000],
        NetPosition: [5000, -2000, 8000, -3000, 4000],
        NetPercent: [5.0, -1.9, 8.2, -2.7, 3.9],
        LongPosition: [60000, 62000, 58000, 65000, 61000],
        ShortPosition: [40000, 42000, 38000, 45000, 41000],
        LongPercent: [60.0, 59.0, 59.2, 59.1, 59.8],
        ShortPercent: [40.0, 41.0, 40.8, 40.9, 40.2],
        symbolPart: symbolPart || 'USD',
        owner: owner || 'Dealer',
        type: type || 'NetPercent',
        interval: interval === '7300' ? 'All' : (interval || '1825'),
      };
      
      return NextResponse.json({
        success: true,
        data: mockData,
        error: null
      });
    }
    
    // Convert '7300' (UI value for "All") to 'All' for API, or use default '1825' (5 years)
    const apiInterval = interval === '7300' ? 'All' : (interval || '1825');
    
    // Prepare request data for external API
    const requestData = {
      symbolPart: symbolPart || 'USD',
      owner: owner || 'Dealer',
      type: type || 'NetPercent',
      interval: apiInterval,
      typ: typ || 'optional'
    };
    
    console.log('📡 [COT Chart API] External API request data:', requestData);
    
    // Call external API
    const externalResponse = await fetch(`${API_CONFIG.UPSTREAM_API}getCOTChartView`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify(requestData),
      signal: AbortSignal.timeout(15000), // 15 second timeout
    });
    
    console.log('📡 [COT Chart API] External API response status:', externalResponse.status);
    
    if (!externalResponse.ok) {
      console.error('❌ [COT Chart API] External API error:', externalResponse.status);
      
      // Return mock data on API error
      const mockData = {
        seriesname: 'OpenInterest',
        Categories: ['2025-01-01', '2025-01-02', '2025-01-03', '2025-01-04', '2025-01-05'],
        OpenInterest: [100000, 105000, 98000, 110000, 102000],
        NetPosition: [5000, -2000, 8000, -3000, 4000],
        NetPercent: [5.0, -1.9, 8.2, -2.7, 3.9],
        LongPosition: [60000, 62000, 58000, 65000, 61000],
        ShortPosition: [40000, 42000, 38000, 45000, 41000],
        LongPercent: [60.0, 59.0, 59.2, 59.1, 59.8],
        ShortPercent: [40.0, 41.0, 40.8, 40.9, 40.2],
      };
      
      return NextResponse.json({
        success: true,
        data: mockData,
        error: null
      });
    }
    
    const responseData = await externalResponse.json();
    console.log('📡 [COT Chart API] External API response data:', {
      success: responseData.success,
      seriesName: responseData.seriesname,
      type: responseData.type,
      hasCategories: !!responseData.Categories,
      categoriesLength: responseData.Categories?.length || 0,
      dataKeys: Object.keys(responseData).filter(key => Array.isArray(responseData[key]))
    });
    
    if (!responseData.success) {
      throw new Error('API returned unsuccessful response');
    }
    
    // Process the response data based on the actual API structure
    const chartData = {
      seriesname: responseData.seriesname || 'OpenInterest',
      Categories: responseData.Categories || [],
      OpenInterest: responseData.OpenInterest || [],
      NetPosition: responseData.NetPosition || [],
      NetPercent: responseData.NetPercent || [],
      LongPosition: responseData.LongPosition || [],
      ShortPosition: responseData.ShortPosition || [],
      LongPercent: responseData.LongPercent || [],
      ShortPercent: responseData.ShortPercent || [],
      // Additional metadata from the API
      symbolPart: responseData.symbolPart,
      owner: responseData.owner,
      type: responseData.type,
      interval: responseData.interval,
      summary: responseData.summary
    };
    
    return NextResponse.json({
      success: true,
      data: chartData,
      error: null
    });
    
  } catch (error) {
    console.error('❌ [COT Chart API] Error:', error);
    
    if (error instanceof Error && error.name === 'TimeoutError') {
      return NextResponse.json({
        success: false,
        data: null,
        error: 'Request timed out after 15 seconds'
      }, { status: 408 });
    }
    
    return NextResponse.json({
      success: false,
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
