import { NextRequest, NextResponse } from 'next/server';
import { API_CONFIG } from '@/lib/api';

const API_ENDPOINT = `${API_CONFIG.UPSTREAM_API}getBondYieldsData`;

// Bearer token works - put it first
const getAuthHeaders = () => {
  const token = API_CONFIG.BOND_YIELDS_TOKEN;
  return [
    { name: 'Authorization', value: `Bearer ${token}` },
  ];
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('[Bond Yields API] Request Body:', body);

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
          console.log(`[Bond Yields API] SUCCESS with header: ${authHeader.name}`);
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

        console.log(`[Bond Yields API] Failed with ${authHeader.name}: ${data.error}`);
      } catch (err) {
        console.log(`[Bond Yields API] Error with ${authHeader.name}:`, err);
      }
    }

    // All headers failed
    return NextResponse.json(
      { success: false, error: 'Unauthorized: All authentication methods failed' },
      { status: 401 }
    );
  } catch (error) {
    console.error('[Bond Yields API] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to fetch bond data' },
      { status: 500 }
    );
  }
}
