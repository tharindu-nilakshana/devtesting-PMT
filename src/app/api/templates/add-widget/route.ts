/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { API_CONFIG } from '../../../../lib/api';
import { cookies } from 'next/headers';

const UPSTREAM = API_CONFIG.UPSTREAM_API;

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const url = new URL('addWidgetToTemplateWeb', UPSTREAM).toString();
    
    // Get authentication from headers first, then fallback to cookies
    let incomingAuth = req.headers.get('authorization') || '';
    
    // If no auth header, try to get from cookies
    if (!incomingAuth) {
      try {
        const cookieStore = await cookies();
        const token = cookieStore.get('pmt_auth_token')?.value;
        if (token) {
          incomingAuth = `Bearer ${token}`;
        }
      } catch (error) {
        console.warn('Failed to get auth token from cookies:', error);
      }
    }
    
    const jsonBody = await req.json().catch(() => ({} as Record<string, unknown>));

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(incomingAuth ? { Authorization: incomingAuth } : {}),
        ...(process.env.NEXT_PUBLIC_API_KEY ? { 'x-api-key': process.env.NEXT_PUBLIC_API_KEY } : {}),
      },
      body: JSON.stringify(jsonBody),
      cache: 'no-store',
    });

    const text = await res.text();
    const contentType = res.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      return new NextResponse(text, { status: res.status, headers: { 'content-type': 'application/json' } });
    }
    // Fallback: attempt to JSON-parse; otherwise return as text
    try {
      JSON.parse(text);
      return new NextResponse(text, { status: res.status, headers: { 'content-type': 'application/json' } });
    } catch {
      return new NextResponse(text, { status: res.status, headers: { 'content-type': 'text/plain' } });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Proxy error' }, { status: 500 });
  }
}
