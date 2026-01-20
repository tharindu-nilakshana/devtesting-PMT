import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  avatar?: string;
}

export async function getServerUser(request?: NextRequest): Promise<User | null> {
  try {
    // First try to get from cookies (existing approach)
    const cookieStore = await cookies();
    const userData = cookieStore.get('pmt_user_data')?.value;
    const token = cookieStore.get('pmt_auth_token')?.value;

    if (userData && token) {
      // Basic token validation
      const isValidToken = token && token.length > 50 && token.includes('-');
      
      if (isValidToken) {
        return JSON.parse(userData);
      }
    }

    // If no cookies or invalid, try Authorization header (for testing)
    if (request) {
      const authHeader = request.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        
        // Basic token validation
        const isValidToken = token && token.length > 50 && token.includes('-');
        
        if (isValidToken) {
          return null;
        }
      }
    }

    return null;
  } catch (error) {
    console.error('Error getting server user:', error);
    return null;
  }
}

export async function isServerAuthenticated(): Promise<boolean> {
  const user = await getServerUser();
  return user !== null;
}