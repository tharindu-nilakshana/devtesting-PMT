import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { API_CONFIG } from '@/lib/api';

const UPSTREAM = API_CONFIG.UPSTREAM_API;

export async function POST(request: NextRequest) {


    const body = await request.json();
    const { Symbol, TVSymbol, Interval } = body;

    try {



        // Get authentication token
        const cookieStore = await cookies();
        const authToken = cookieStore.get('pmt_auth_token')?.value;

        if (!authToken) {
            console.error('❌ [HighLowPoints API] No auth token found');
            return NextResponse.json({
                success: false,
                error: 'Authentication required',
                timestamp: Date.now()
            }, { status: 401 });
        }

        // Prepare request data for external API
        const requestData = {
            Symbol: Symbol || 'AUDCAD',
            TVSymbol: TVSymbol || 'FX:AUDCAD',
            Interval: Interval || '1d',
        };



        // Call external API using centralized config
        const upstreamUrl = new URL('getHighLowPoints', UPSTREAM).toString();
        const externalResponse = await fetch(upstreamUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(requestData),
            signal: AbortSignal.timeout(15000), // 15 second timeout
        });



        if (!externalResponse.ok) {
            console.error('❌ [HighLowPoints API] External API error:', externalResponse.status);

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
        console.error('❌ [HighLowPoints API] Error:', error);

        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: Date.now()
        }, { status: 500 });
    }
}
