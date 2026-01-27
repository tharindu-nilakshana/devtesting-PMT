import { NextRequest, NextResponse } from 'next/server';
import { API_CONFIG } from '@/lib/api';

// Use centralized API configuration
const API_ENDPOINT = `${API_CONFIG.UPSTREAM_API}getSymbols`;

// Get auth headers using centralized token
const getAuthHeaders = () => {
  const token = API_CONFIG.API_TOKEN;
  return [
    { name: 'Authorization', value: `Bearer ${token}` },
  ];
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('[SingleTicker Symbols API] Request Body:', body);

    const authHeaders = getAuthHeaders();

    // Try each auth header until one works
    for (const authHeader of authHeaders) {
      try {
        const response = await fetch(API_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            [authHeader.name]: authHeader.value,
          },
          body: JSON.stringify(body),
        });

        const data = await response.json();

        if (response.ok) {
          console.log(`[SingleTicker Symbols API] SUCCESS with header: ${authHeader.name}`);
          return NextResponse.json({
            success: true,
            ...data,
            timestamp: Date.now(),
          });
        }

        // If not unauthorized, return the error
        if (response.status !== 401) {
          return NextResponse.json({
            success: false,
            error: data.error || `External API returned ${response.status}`,
          }, { status: response.status });
        }

        console.log(`[SingleTicker Symbols API] Failed with ${authHeader.name}: ${data.error || 'Unauthorized'}`);
      } catch (err) {
        console.log(`[SingleTicker Symbols API] Error with ${authHeader.name}:`, err);
      }
    }

    // All headers failed
    return NextResponse.json(
      { success: false, error: 'Unauthorized: All authentication methods failed' },
      { status: 401 }
    );
  } catch (error) {
    console.error('[SingleTicker Symbols API] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch symbols' },
      { status: 500 }
    );
  }
}
