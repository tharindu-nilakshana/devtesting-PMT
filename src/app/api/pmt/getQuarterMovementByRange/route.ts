import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { API_CONFIG } from '@/lib/api';

const UPSTREAM = API_CONFIG.UPSTREAM_API;

export async function GET(request: NextRequest) {

    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    try {

        const cookieStore = await cookies();
        const authToken = cookieStore.get('pmt_auth_token')?.value;

        if (!authToken) {
            console.error('❌ [QuarterMovementByRange API] No auth token found');
            return NextResponse.json({
                success: false,
                error: 'Authentication required',
                timestamp: Date.now()
            }, { status: 401 });
        }

        const params = new URLSearchParams({
            symbol: symbol || 'EURUSD',
            startDate: startDate || new Date().toISOString().split('T')[0],
            endDate: endDate || new Date().toISOString().split('T')[0],
        });

        const upstreamUrl = new URL(`getQuarterMovementByRange?${params.toString()}`, UPSTREAM).toString();
        console.log('📊 [QuarterMovementByRange API] Calling:', upstreamUrl);
        
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
            console.error('❌ [QuarterMovementByRange API] External API error:', externalResponse.status);

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
        console.error('❌ [QuarterMovementByRange API] Error:', error);

        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: Date.now()
        }, { status: 500 });
    }
}
