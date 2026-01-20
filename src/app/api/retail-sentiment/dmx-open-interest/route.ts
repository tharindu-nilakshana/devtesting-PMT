import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { API_CONFIG } from '../../../../lib/api';

const ENDPOINT = 'getDmxOpenInterest';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const {
      additionalSettings = 'All|1d',
      getDetailWidget = true,
      curSymbol = '',
    } = body ?? {};

    const cookieStore = await cookies();
    const token = cookieStore.get('pmt_auth_token')?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const payload: Record<string, unknown> = {
      AdditionalSettings: additionalSettings,
      GetDetailWidget: getDetailWidget,
    };

    if (curSymbol) {
      payload.cur_symbol = curSymbol;
    }

    console.log('📊 [DMX Open Interest API] Request:', payload);

    const upstreamResponse = await fetch(`${API_CONFIG.UPSTREAM_API}${ENDPOINT}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!upstreamResponse.ok) {
      console.error('DMX Open Interest upstream error', upstreamResponse.status);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch DMX open interest data' },
        { status: upstreamResponse.status }
      );
    }

    const data = await upstreamResponse.json();

    console.log('📊 [DMX Open Interest API] Response:', {
      status: data.status,
      categoriesCount: data.Categories?.length || 0,
      dataSetCount: data.DataSet?.length || 0,
    });

    return NextResponse.json({
      success: true,
      data,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('DMX Open Interest API route error', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

