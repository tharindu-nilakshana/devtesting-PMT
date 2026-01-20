import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { API_CONFIG } from '@/lib/api'

export async function GET() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('pmt_auth_token')?.value

    if (!token) {
      return NextResponse.json(
        { Status: 'Error', error: 'Missing auth token' },
        { status: 401 }
      )
    }

    const upstream = await fetch(`${API_CONFIG.UPSTREAM_API}getReferralEarnings`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      cache: 'no-store',
    })

    const data = await upstream.json()

    if (!upstream.ok) {
      return NextResponse.json(
        { Status: 'Error', error: data?.error || 'Failed to fetch referral earnings' },
        { status: upstream.status }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in getReferralEarnings proxy:', error)
    return NextResponse.json(
      { Status: 'Error', error: 'Internal server error' },
      { status: 500 }
    )
  }
}

