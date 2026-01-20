import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { API_CONFIG } from '@/lib/api';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('pmt_auth_token')?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Missing auth token' },
        { status: 401 }
      );
    }

    // Parse the request body
    const body = await request.json();
    const { currentPassword, newPassword, confirmPassword } = body;

    // Validate required fields
    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json(
        { success: false, error: 'All password fields are required' },
        { status: 400 }
      );
    }

    // Validate that new passwords match
    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { success: false, error: 'New passwords do not match' },
        { status: 400 }
      );
    }

    // Validate password strength (optional - add your own rules)
    if (newPassword.length < 6) {
      return NextResponse.json(
        { success: false, error: 'New password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    console.log('reset-password: Calling upstream API');

    // Call upstream API with the expected format
    const upstream = await fetch(`${API_CONFIG.UPSTREAM_API}resetPassword`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        Password: currentPassword,
        Password1: newPassword,
        Password2: confirmPassword,
      }),
      cache: 'no-store',
    });

    const data = await upstream.json();

    console.log('reset-password: Upstream response:', data);

    if (!upstream.ok) {
      return NextResponse.json(
        { success: false, error: data?.error || data?.message || 'Failed to reset password' },
        { status: upstream.status }
      );
    }

    // Check if the API response indicates an error
    if (data.error) {
      return NextResponse.json(
        { success: false, error: data.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Password updated successfully',
      data: data,
    });
  } catch (error) {
    console.error('Error in reset-password proxy:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

