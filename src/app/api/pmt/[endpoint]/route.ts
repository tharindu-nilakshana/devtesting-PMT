/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { API_CONFIG } from '../../../../lib/api';
import { cookies } from 'next/headers';

const UPSTREAM = API_CONFIG.UPSTREAM_API;
const CTRL_UPSTREAM = API_CONFIG.CTRL_UPSTREAM;

export const runtime = 'nodejs';

export async function POST(req: NextRequest, { params }: { params: Promise<{ endpoint: string }> }) {
  try {
    const { endpoint } = await params;
    const isCtrl = false;
    const base = isCtrl ? CTRL_UPSTREAM : UPSTREAM;
    const url = new URL(endpoint, base).toString();
    
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
    
    // Check if request is FormData (multipart/form-data)
    const requestContentType = req.headers.get('content-type') || '';
    const isFormData = requestContentType.includes('multipart/form-data');
    
    let body: BodyInit;
    let headers: HeadersInit = {
      'Accept': 'application/json',
      ...(incomingAuth ? { Authorization: incomingAuth } : {}),
      ...(process.env.NEXT_PUBLIC_API_KEY ? { 'x-api-key': process.env.NEXT_PUBLIC_API_KEY } : {}),
    };

    if (isFormData) {
      // Handle FormData - parse and reconstruct to ensure compatibility
      const incomingFormData = await req.formData();
      
      // Reconstruct FormData for forwarding - this ensures proper format
      const forwardFormData = new FormData();
      for (const [key, value] of incomingFormData.entries()) {
        if (value instanceof File) {
          // File object - append with the file itself
          forwardFormData.append(key, value);
        } else if (value instanceof Blob) {
          // Blob object
          forwardFormData.append(key, value);
        } else {
          // String or number value - convert to string
          forwardFormData.append(key, String(value));
        }
      }
      
      body = forwardFormData;
      // Do NOT set Content-Type header - let fetch() automatically set it with correct boundary
      // Removing Content-Type from headers will let fetch() handle multipart/form-data properly
    } else {
      // Handle JSON
    const jsonBody = await req.json().catch(() => ({} as Record<string, unknown>));
      
      if (isCtrl) {
        const form = new URLSearchParams(jsonBody as Record<string, string>);
        headers['Content-Type'] = 'application/x-www-form-urlencoded;charset=UTF-8';
        body = form.toString();
      } else {
        headers['Content-Type'] = 'application/json';
        body = JSON.stringify(jsonBody);
      }
    }

    let res: Response;
      res = await fetch(url, {
        method: 'POST',
        headers,
        ...(isFormData ? {} : { credentials: 'include' }), // credentials not needed for FormData in server-side fetch
        body,
        cache: 'no-store',
      });

    const text = await res.text();
    const responseContentType = res.headers.get('content-type') || '';

    if (responseContentType.includes('application/json')) {
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

export async function GET(req: NextRequest, { params }: { params: Promise<{ endpoint: string }> }) {
  try {
    const { endpoint } = await params;
    const base = UPSTREAM;
    
    // Get the raw query string from the request URL to preserve encoding
    const queryString = req.nextUrl.search; // includes the '?' prefix
    
    // Build the target URL with the original query string
    const baseUrl = new URL(endpoint, base);
    const finalUrl = `${baseUrl.origin}${baseUrl.pathname}${queryString}`;
    
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

    const res = await fetch(finalUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        ...(incomingAuth ? { Authorization: incomingAuth } : {}),
        ...(process.env.NEXT_PUBLIC_API_KEY ? { 'x-api-key': process.env.NEXT_PUBLIC_API_KEY } : {}),
      },
      cache: 'no-store',
    });

    const text = await res.text();
    const responseContentType = res.headers.get('content-type') || '';

    if (responseContentType.includes('application/json')) {
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

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ endpoint: string }> }) {
  try {
    const { endpoint } = await params;
    const isCtrl = false;
    const base = isCtrl ? CTRL_UPSTREAM : UPSTREAM;
    const url = new URL(endpoint, base).toString();
    
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
      method: 'DELETE',
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
    const responseContentType = res.headers.get('content-type') || '';

    if (responseContentType.includes('application/json')) {
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