import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { API_CONFIG } from '@/lib/api';

const UPSTREAM = API_CONFIG.UPSTREAM_API;

export async function GET(request: NextRequest) {
    try {
        // Get query parameters
        const searchParams = request.nextUrl.searchParams;
        const sdate = searchParams.get('sdate') || new Date().toISOString().split('T')[0];
        const symbol = searchParams.get('symbol') || 'EURUSD';

        // Get authentication token
        const cookieStore = await cookies();
        const authToken = cookieStore.get('pmt_auth_token')?.value;

        if (!authToken) {
            console.error('❌ [PercentMonthlyTargets API] No auth token found');
            return NextResponse.json({
                success: false,
                error: 'Authentication required',
                timestamp: Date.now()
            }, { status: 401 });
        }

        // Build upstream URL with query parameters
        const upstreamUrl = new URL('getPercentMonthlyTargets', UPSTREAM);
        upstreamUrl.searchParams.set('sdate', sdate);
        upstreamUrl.searchParams.set('symbol', symbol);

        console.log('🔍 [PercentMonthlyTargets API] Fetching from:', upstreamUrl.toString());

        // Call external API using centralized config
        const externalResponse = await fetch(upstreamUrl.toString(), {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            signal: AbortSignal.timeout(15000), // 15 second timeout
        });

        if (!externalResponse.ok) {
            console.error('❌ [PercentMonthlyTargets API] External API error:', externalResponse.status);

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
        console.error('❌ [PercentMonthlyTargets API] Error:', error);

        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: Date.now()
        }, { status: 500 });
    }
}
