// Centralized API client for PMT
// Reads auth token from localStorage (pmt_auth_token) and supports both JSON API and legacy form API

import { API_CONFIG } from '../lib/api';
import { handle401Response } from './auth-redirect';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

// Use centralized API configuration
const DEFAULT_API_ROOT = API_CONFIG.PMT_API_ROOT;

export function getAuthToken(): string | null {
  try {
    // First try localStorage (for backward compatibility)
    const localToken = typeof window !== 'undefined' ? localStorage.getItem('pmt_auth_token') : null;
    
    // console.log('getAuthToken: Checking localStorage:', {
    //   hasWindow: typeof window !== 'undefined',
    //   token: localToken ? `Found (${localToken.substring(0, 20)}...)` : 'Not found',
    //   fullToken: localToken, // Log full token for debugging
    //   allKeys: typeof window !== 'undefined' ? Object.keys(localStorage) : 'No window'
    // });
    
    if (localToken) {
      return localToken;
    }
    
    // If no localStorage token, the server-side PMT route will handle cookies
    // This allows the PMT API route to get the token from cookies
    return null;
  } catch (error) {
    console.error('getAuthToken: Error accessing localStorage:', error);
    return null;
  }
}

function buildUrl(path: string, base: string): string {
  try {
    // If base is absolute, use URL API
    if (/^https?:\/\//i.test(base)) return new URL(path, base).toString();
    // Otherwise, treat base as app-relative
    const normalizedBase = base.endsWith('/') ? base.slice(0, -1) : base;
    const normalizedPath = path.startsWith('/') ? path.substring(1) : path;
    return `${normalizedBase}/${normalizedPath}`;
  } catch {
    // Fallback to simple concatenation
    return `${base}${path}`;
  }
}

export async function postJSON<T>(path: string, body: unknown, init?: RequestInit): Promise<T> {
  const token = getAuthToken();
  const url = buildUrl(path, DEFAULT_API_ROOT);
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(process.env.NEXT_PUBLIC_API_KEY ? { 'x-api-key': process.env.NEXT_PUBLIC_API_KEY } : {}),
    },
    body: JSON.stringify(body ?? {}),
    credentials: 'include',
    ...init,
  });
  if (!res.ok) {
    // Handle 401 Unauthorized - redirect to login
    handle401Response(res);
    const text = await res.text().catch(() => '');
    throw new Error(`POST ${path} failed: ${res.status} ${res.statusText} ${text}`);
  }
  return (await res.json()) as T;
}

// Specific API wrappers

