/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Centralized API Configuration
 * 
 * This file provides a single source of truth for all API endpoints
 * and handles environment-based URL switching for development and production.
 */

import { handle401Response } from '../utils/auth-redirect';

// Environment-based API configuration
export const API_CONFIG = {
  // Base URLs for different environments
  BASE_URL: process.env.API_BASE_URL ? `${process.env.API_BASE_URL}/` : 'https://frontendapi.primemarket-terminal.com/',
  // PMT API endpoints (routed through Next.js API)
  PMT_API_ROOT: process.env.NEXT_PUBLIC_API_SERVER_ROOT || '/api/pmt/',
  // External API endpoints
  UPSTREAM_API: process.env.FRONTAPI_URL_INTERNAL ? `${process.env.FRONTAPI_URL_INTERNAL}/` : 'https://frontendapi.primemarket-terminal.com/',
  CTRL_UPSTREAM: process.env.NEXT_PUBLIC_CTRL_UPSTREAM || 'https://dev64.primemarket-terminal.com/',
  
  // WebSocket endpoints
  WS_RTS: process.env.NEXT_PUBLIC_WS_RTS || 'wss://dws.primemarket-terminal.com:65345', // Data Update Websocket
  WS_TRADINGVIEW: process.env.NEXT_PUBLIC_WS_TRADINGVIEW || 'wss://pws.primemarket-terminal.com:8081', // Price data Websocket
  
  // AI API endpoint
  AI_API: process.env.NEXT_PUBLIC_AI_API || 'https://ai.primemarket-terminal.com/query',
  
  // API Token (centralized)
  API_TOKEN: process.env.NEXT_PUBLIC_API_TOKEN || 'b2fae2b6ad3eeb6707f2b0b67bce24e7-5f9c927fd163f36ee1e4e4986d75b262-847d5cc6a12c8df9abb3985f158d8deb-61466056b5fa4c5699fc00c3cf0cbf08',

  // Bond Yields API Token
  BOND_YIELDS_TOKEN: process.env.BOND_YIELDS_TOKEN || 'bbeecd4e9e170e8066bba2dc55741f99-35cbcd2e43016920ba6f5ea1558c3c58-ed7ed71f8bda85a8bd933fca416ae03e-9bcc84441260e35d42616caa8b9cb236',
} as const;

// Helper function to build API URLs
export function buildApiUrl(endpoint: string, baseUrl?: string): string {
  const base = baseUrl || API_CONFIG.BASE_URL;
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  return `${base}/${cleanEndpoint}`;
}

// Helper function to build PMT API URLs
export function buildPmtApiUrl(endpoint: string): string {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  return `${API_CONFIG.PMT_API_ROOT}${cleanEndpoint}`;
}

// Helper function to build external API URLs
export function buildExternalApiUrl(endpoint: string, baseUrl?: string): string {
  const base = baseUrl || API_CONFIG.UPSTREAM_API;
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  return `${base}${cleanEndpoint}`;
}

// Common API request configuration
export const API_DEFAULTS = {
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds
} as const;

// API request wrapper with error handling
export async function apiRequest<T = any>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const config: RequestInit = {
    ...API_DEFAULTS,
    ...options,
    headers: {
      ...API_DEFAULTS.headers,
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, config);
    
    if (!response.ok) {
      // Handle 401 Unauthorized - redirect to login
      handle401Response(response);
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('API request error:', error);
    throw error;
  }
}

// Specific API functions for common operations
export const api = {
  // User preferences
  getUserPreferences: (userId: string) => 
    apiRequest(buildApiUrl(`user/${userId}/preferences`)),
  
  updateUserPreferences: (userId: string, data: any, token?: string) =>
    // Upstream expects POST to updateUserPreferences with Bearer token
    apiRequest(buildExternalApiUrl('updateUserPreferences'), {
      method: 'POST',
      body: JSON.stringify({ userId, ...data }),
      headers: token ? { 'Authorization': `Bearer ${token}` } : undefined,
    }),
  
  // Authentication
  login: (credentials: any) =>
    apiRequest(buildApiUrl('auth/login'), {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),
  
  getUserSystemVariables: (token: string) =>
    apiRequest(buildApiUrl('user/system-variables'), {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }),
  
  // PMT API calls
  pmtRequest: (endpoint: string, data: any, token?: string) =>
    apiRequest(buildPmtApiUrl(endpoint), {
      method: 'POST',
      body: JSON.stringify(data),
      headers: token ? {
        'Authorization': `Bearer ${token}`,
      } : {},
    }),
  
  // External API calls
  externalRequest: (endpoint: string, data: any) =>
    apiRequest(buildExternalApiUrl(endpoint), {
      method: 'POST',
      body: JSON.stringify(data),
    }),
} as const;

// Environment detection helpers
export const isDevelopment = process.env.NODE_ENV === 'development';
export const isProduction = process.env.NODE_ENV === 'production';
export const isLocalhost = typeof window !== 'undefined' && window.location.hostname === 'localhost';

// Logging helper for debugging
export function logApiCall(url: string, method: string = 'GET', data?: any) {
  if (isDevelopment) {
    console.log(`🌐 [API] ${method} ${url}`, data ? { data } : '');
  }
}

export default API_CONFIG;
