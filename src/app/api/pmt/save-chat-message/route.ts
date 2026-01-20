import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { API_CONFIG } from '../../../../lib/api';

const UPSTREAM = API_CONFIG.UPSTREAM_API;

export async function POST(request: NextRequest) {
  console.log('💾 [Save Chat Message API] Request received');
  
  try {
    let body: any = {};
    try {
      body = await request.json();
    } catch (error) {
      console.warn('⚠️ [Save Chat Message API] Failed to parse request body:', error instanceof Error ? error.message : String(error));
      body = {};
    }
    
    const { WidgetID, messages } = body;
    
    if (!WidgetID || typeof WidgetID !== 'number') {
      return NextResponse.json({
        success: false,
        error: 'WidgetID is required and must be a number',
      }, { status: 400 });
    }
    
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Messages is required and must be a non-empty array',
      }, { status: 400 });
    }
    
    // Validate message structure
    for (const msg of messages) {
      if (!msg.role || !['user', 'assistant', 'system'].includes(msg.role)) {
        return NextResponse.json({
          success: false,
          error: 'Each message must have a valid role (user, assistant, or system)',
        }, { status: 400 });
      }
      if (!msg.content || typeof msg.content !== 'string') {
        return NextResponse.json({
          success: false,
          error: 'Each message must have a non-empty content string',
        }, { status: 400 });
      }
    }
    
    // Get authentication token
    const cookieStore = await cookies();
    const authToken = cookieStore.get('pmt_auth_token')?.value;
    
    if (!authToken) {
      console.error('❌ [Save Chat Message API] No auth token found');
      return NextResponse.json({
        success: false,
        error: 'Authentication required',
      }, { status: 401 });
    }
    
    const requestData = {
      WidgetID,
      messages,
    };
    
    console.log('💾 [Save Chat Message API] External API request data:', { 
      WidgetID, 
      messageCount: messages.length,
      messages: messages.map(msg => ({
        role: msg.role,
        contentLength: msg.content?.length || 0,
        hasSources: !!msg.sources,
        sourcesCount: msg.sources?.length || 0,
        sources: msg.sources
      }))
    });
    
    // Call external API using centralized config
    const upstreamUrl = new URL('saveChatMessage', UPSTREAM).toString();
    const externalResponse = await fetch(upstreamUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(requestData),
      signal: AbortSignal.timeout(15000),
    });
    
    console.log('💾 [Save Chat Message API] External API response status:', externalResponse.status);
    
    if (!externalResponse.ok) {
      console.error('❌ [Save Chat Message API] External API error:', externalResponse.status);
      const errorText = await externalResponse.text().catch(() => '');
      return NextResponse.json({
        success: false,
        error: `External API returned ${externalResponse.status}`,
        details: errorText,
      }, { status: externalResponse.status });
    }
    
    const responseData = await externalResponse.json();
    console.log('💾 [Save Chat Message API] External API response received, saved:', responseData?.saved || 0);
    
    return NextResponse.json({
      success: true,
      data: responseData,
      timestamp: Date.now()
    });

  } catch (error) {
    console.error('❌ [Save Chat Message API] Error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: Date.now()
    }, { status: 500 });
  }
}

