import { NextRequest, NextResponse } from 'next/server';
import { API_CONFIG } from '@/lib/api';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Call external API
    const response = await fetch(`${API_CONFIG.UPSTREAM_API}userLogin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_CONFIG.API_TOKEN}`
      },
      body: JSON.stringify({
        email: email,
        password: password
      })
    });

    const data = await response.json();

    // Check if the API returned an error
    if (data.error) {
      return NextResponse.json(
        { error: data.error },
        { status: 401 }
      );
    }

    // Check for successful login
    if (response.ok && data.loginToken && data.userEmail) {
      const ud = data.userData || {};
      const profilePicture = ud.LoggedInProfilePicture
        ? `${API_CONFIG.UPSTREAM_API}uploads/profile/${ud.LoggedInProfilePicture}`
        : undefined;
      const user = {
        id: String(ud.LoggedInUserID ?? Buffer.from(data.userEmail).toString('base64').slice(0, 8)),
        email: data.userEmail,
        name: ud.LoggedInName || data.userEmail.split('@')[0],
        role: ud.LoggedInPlanName || 'Platform User',
        avatar: profilePicture,
        timezone: ud.LoggedInTimezone || ud.LoggedInTVTimezone,
        tvTimezone: ud.LoggedInTVTimezone,
        timeOffset: ud.LoggedInTimeOffset,
      };

      // Create response
      const loginResponse = NextResponse.json({
        success: true,
        user: user,
        token: data.loginToken, // Include token in response for client-side storage
        message: 'Login successful'
      });

      // Set HTTP-only cookie for server-side auth
      loginResponse.cookies.set('pmt_auth_token', data.loginToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/'
      });

      // Set user data cookie (non-httpOnly for client-side access)
      loginResponse.cookies.set('pmt_user_data', JSON.stringify(user), {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/'
      });

      return loginResponse;
    } else {
      return NextResponse.json(
        { error: 'Authentication failed - invalid response format' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Login API error:', error);
    return NextResponse.json(
      { error: 'Network error. Please check your connection and try again.' },
      { status: 500 }
    );
  }
}
