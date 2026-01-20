import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { API_CONFIG } from '../../../../lib/api';

const UPSTREAM = API_CONFIG.UPSTREAM_API;

export async function POST(request: NextRequest) {
  console.log('🤖 [Query AI API] Request received');
  
  try {
    let body: any = {};
    try {
      body = await request.json();
    } catch (error) {
      console.warn('⚠️ [Query AI API] Failed to parse request body:', error instanceof Error ? error.message : String(error));
      body = {};
    }
    
    const { question } = body;
    
    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Question is required and must be a non-empty string',
      }, { status: 400 });
    }
    
    // Get authentication token
    const cookieStore = await cookies();
    const authToken = cookieStore.get('pmt_auth_token')?.value;
    
    if (!authToken) {
      console.error('❌ [Query AI API] No auth token found');
      return NextResponse.json({
        success: false,
        error: 'Authentication required',
      }, { status: 401 });
    }
    
    const requestData = {
      question: question.trim(),
    };
    
    console.log('🤖 [Query AI API] External API request data:', { question: requestData.question.substring(0, 100) + '...' });
    
    // Call external API using centralized config
    const upstreamUrl = new URL('queryAI', UPSTREAM).toString();
    const externalResponse = await fetch(upstreamUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(requestData),
      signal: AbortSignal.timeout(30000), // 30 second timeout for AI queries
    });
    
    console.log('🤖 [Query AI API] External API response status:', externalResponse.status);
    
    if (!externalResponse.ok) {
      console.error('❌ [Query AI API] External API error:', externalResponse.status);
      const errorText = await externalResponse.text().catch(() => '');
      return NextResponse.json({
        success: false,
        error: `External API returned ${externalResponse.status}`,
        details: errorText,
      }, { status: externalResponse.status });
    }
    
    const responseData = await externalResponse.json();
    console.log('🤖 [Query AI API] External API response received, sources count:', responseData?.sources?.length || 0);
    
    return NextResponse.json({
      success: true,
      data: responseData,
      timestamp: Date.now()
    });

  } catch (error) {
    console.error('❌ [Query AI API] Error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: Date.now()
    }, { status: 500 });
  }
}

