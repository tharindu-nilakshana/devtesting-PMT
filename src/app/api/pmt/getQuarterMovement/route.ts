import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { API_CONFIG } from '@/lib/api';

const UPSTREAM = API_CONFIG.UPSTREAM_API;

export async function GET(request: NextRequest) {

    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');
    const date = searchParams.get('date');

    try {

        const cookieStore = await cookies();
        const authToken = cookieStore.get('pmt_auth_token')?.value;

        if (!authToken) {
            console.error('❌ [QuarterMovement API] No auth token found');
            return NextResponse.json({
                success: false,
                error: 'Authentication required',
                timestamp: Date.now()
            }, { status: 401 });
        }

        const params = new URLSearchParams({
            symbol: symbol || 'EURUSD',
            date: date || new Date().toISOString().split('T')[0],
        });

        const upstreamUrl = new URL(`getQuarterMovementByDate?${params.toString()}`, UPSTREAM).toString();
        const externalResponse = await fetch(upstreamUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            signal: AbortSignal.timeout(15000),
        });

        if (!externalResponse.ok) {
            console.error('❌ [QuarterMovement API] External API error:', externalResponse.status);

            const errorText = await externalResponse.text();
            return NextResponse.json({
                success: false,
                error: `External API returned ${externalResponse.status}: ${errorText}`,
                timestamp: Date.now()
            }, { status: externalResponse.status });
        }

        const responseData = await externalResponse.json();

        return NextResponse.json(responseData);

    } catch (error) {
        console.error('❌ [QuarterMovement API] Error:', error);

        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: Date.now()
        }, { status: 500 });
    }
}
