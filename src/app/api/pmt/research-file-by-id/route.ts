import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { API_CONFIG } from '../../../../lib/api';

const UPSTREAM = API_CONFIG.UPSTREAM_API;

export async function POST(request: NextRequest) {
  console.log('📄 [Research File By ID API] Request received');
  
  try {
    let body: any = {};
    try {
      body = await request.json();
    } catch (error) {
      console.warn('⚠️ [Research File By ID API] Failed to parse request body, using defaults:', error instanceof Error ? error.message : String(error));
      body = {};
    }
    
    const { FileID } = body;
    
    if (!FileID) {
      console.error('❌ [Research File By ID API] No FileID provided');
      return NextResponse.json({
        success: false,
        error: 'FileID is required',
      }, { status: 400 });
    }
    
    // Get authentication token
    const cookieStore = await cookies();
    const authToken = cookieStore.get('pmt_auth_token')?.value;
    
    if (!authToken) {
      console.error('❌ [Research File By ID API] No auth token found');
      return NextResponse.json({
        success: false,
        error: 'Authentication required',
      }, { status: 401 });
    }
    
    console.log('📄 [Research File By ID API] Fetching file with ID:', FileID);
    
    // Call external API using centralized config
    const upstreamUrl = new URL('getResearchFileById', UPSTREAM).toString();
    const externalResponse = await fetch(upstreamUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': '*/*',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ FileID }),
      signal: AbortSignal.timeout(30000), // 30 seconds timeout for file downloads
    });
    
    console.log('📄 [Research File By ID API] External API response status:', externalResponse.status);
    
    if (!externalResponse.ok) {
      console.error('❌ [Research File By ID API] External API error:', externalResponse.status);
      const errorText = await externalResponse.text();
      return NextResponse.json({
        success: false,
        error: `External API returned ${externalResponse.status}: ${errorText}`,
      }, { status: externalResponse.status });
    }
    
    // Check content type to determine if it's a PDF or JSON
    const contentType = externalResponse.headers.get('content-type') || '';
    console.log('📄 [Research File By ID API] Content-Type:', contentType);
    
    if (contentType.includes('application/json')) {
      // If JSON, return as JSON (might contain URL or base64 data)
      const jsonData = await externalResponse.json();
      console.log('📄 [Research File By ID API] Received JSON response');
      return NextResponse.json({
        success: true,
        data: jsonData,
        timestamp: Date.now()
      });
    } else if (contentType.includes('application/pdf') || contentType.includes('binary')) {
      // If PDF, return as blob
      const pdfBlob = await externalResponse.blob();
      console.log('📄 [Research File By ID API] Received PDF blob, size:', pdfBlob.size);
      
      return new NextResponse(pdfBlob, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `inline; filename="research-file-${FileID}.pdf"`,
          'Cache-Control': 'public, max-age=3600',
        },
      });
    } else {
      // Generic binary response
      const blob = await externalResponse.blob();
      console.log('📄 [Research File By ID API] Received binary response, size:', blob.size);
      
      return new NextResponse(blob, {
        status: 200,
        headers: {
          'Content-Type': contentType || 'application/octet-stream',
          'Content-Disposition': `inline; filename="research-file-${FileID}"`,
        },
      });
    }

  } catch (error) {
    console.error('❌ [Research File By ID API] Error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: Date.now()
    }, { status: 500 });
  }
}

