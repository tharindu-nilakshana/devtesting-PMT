import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { API_CONFIG } from '../../../../lib/api';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { limit = 15 } = body;

    // Get authentication token from cookies
    const cookieStore = await cookies();
    const token = cookieStore.get('pmt_auth_token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Prepare request data
    const requestData = {
      limit: limit
    };

    // Call external PMT API
    const response = await fetch(`${API_CONFIG.UPSTREAM_API}getNewsTagCloud`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(requestData),
    });

    if (!response.ok) {
      console.error('Failed to fetch trending topics data:', response.status);
      return NextResponse.json(
        { error: 'Failed to fetch trending topics data' },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      data: data,
      timestamp: Date.now()
    });

  } catch (error) {
    console.error('Error in trending topics API route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

