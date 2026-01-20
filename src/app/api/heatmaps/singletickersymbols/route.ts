import { NextRequest, NextResponse } from 'next/server';

const API_ENDPOINT = 'https://frontendapi.primemarket-terminal.com/getSymbols';
const AUTH_TOKEN = 'bbeecd4e9e170e8066bba2dc55741f99-35cbcd2e43016920ba6f5ea1558c3c58-ed7ed71f8bda85a8bd933fca416ae03e-9bcc84441260e35d42616caa8b9cb236';

const AUTH_HEADERS = [
  { name: 'Authorization', value: AUTH_TOKEN },
  { name: 'Authorization', value: `Bearer ${AUTH_TOKEN}` },
  { name: 'token', value: AUTH_TOKEN },
  { name: 'Token', value: AUTH_TOKEN },
  { name: 'x-api-key', value: AUTH_TOKEN },
  { name: 'X-API-Key', value: AUTH_TOKEN },
  { name: 'apikey', value: AUTH_TOKEN },
  { name: 'ApiKey', value: AUTH_TOKEN },
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Symbols API - Request Body:', body);

    // Try each auth header until one works
    for (const authHeader of AUTH_HEADERS) {
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
          console.log(`Symbols API - SUCCESS with header: ${authHeader.name}`);
          return NextResponse.json(data);
        }

        if (response.status !== 401) {
          return NextResponse.json(data, { status: response.status });
        }

        console.log(`Symbols API - Failed with ${authHeader.name}: ${data.error || 'Unauthorized'}`);
      } catch (err) {
        console.log(`Symbols API - Error with ${authHeader.name}:`, err);
      }
    }

    return NextResponse.json(
      { error: 'Unauthorized: All authentication methods failed' },
      { status: 401 }
    );
  } catch (error) {
    console.error('Symbols API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch symbols' },
      { status: 500 }
    );
  }
}
