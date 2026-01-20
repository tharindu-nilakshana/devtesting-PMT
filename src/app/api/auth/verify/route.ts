import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('pmt_auth_token')?.value;
    const userData = cookieStore.get('pmt_user_data')?.value;

    if (!token || !userData) {
      return NextResponse.json(
        { authenticated: false },
        { status: 401 }
      );
    }

    // Basic token validation (you can enhance this with actual API call)
    const isValidToken = token && token.length > 50 && token.includes('-');
    
    if (!isValidToken) {
      // Clear invalid cookies
      const response = NextResponse.json(
        { authenticated: false },
        { status: 401 }
      );
      
      response.cookies.delete('pmt_auth_token');
      response.cookies.delete('pmt_user_data');
      
      return response;
    }

    // Parse user data
    const user = JSON.parse(userData);

    return NextResponse.json({
      authenticated: true,
      user: user
    });

  } catch (error) {
    console.error('Token verification error:', error);
    
    // Clear cookies on error
    const response = NextResponse.json(
      { authenticated: false },
      { status: 401 }
    );
    
    response.cookies.delete('pmt_auth_token');
    response.cookies.delete('pmt_user_data');
    
    return response;
  }
}

export async function POST() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('pmt_auth_token')?.value;

    if (!token) {
      return NextResponse.json(
        { authenticated: false },
        { status: 401 }
      );
    }

    // Enhanced token validation with external API call
    // Uncomment this section if you have a token validation endpoint:
    /*
    const response = await fetch(`${API_CONFIG.UPSTREAM_API}validateToken`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      const errorResponse = NextResponse.json(
        { authenticated: false },
        { status: 401 }
      );
      
      errorResponse.cookies.delete('pmt_auth_token');
      errorResponse.cookies.delete('pmt_user_data');
      
      return errorResponse;
    }
    */

    // For now, use basic validation
    const isValidToken = token && token.length > 50 && token.includes('-');
    
    if (!isValidToken) {
      const response = NextResponse.json(
        { authenticated: false },
        { status: 401 }
      );
      
      response.cookies.delete('pmt_auth_token');
      response.cookies.delete('pmt_user_data');
      
      return response;
    }

    return NextResponse.json({
      authenticated: true
    });

  } catch (error) {
    console.error('Token validation error:', error);
    
    const response = NextResponse.json(
      { authenticated: false },
      { status: 401 }
    );
    
    response.cookies.delete('pmt_auth_token');
    response.cookies.delete('pmt_user_data');
    
    return response;
  }
}
