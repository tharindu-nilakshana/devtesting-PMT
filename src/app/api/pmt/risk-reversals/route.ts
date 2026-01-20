import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { API_CONFIG } from '@/lib/api';

const UPSTREAM = API_CONFIG.UPSTREAM_API;

interface RiskReversalApiResponse {
  MRR: {
    datetime: string[];
    value: number[];
  };
  MO: {
    datetime: string[];
    value: number[];
  };
  M1HMRR?: {
    datetime: string[];
    value: number[];
  };
  M1HMO?: {
    datetime: string[];
    value: number[];
  };
  M5HMRR?: {
    datetime: string[];
    value: number[];
  };
  M5HMO?: {
    datetime: string[];
    value: number[];
  };
}

interface RiskReversalDataPoint {
  date: string;
  put: number;
  call: number;
}

function parseDate(dateStr: string): Date {
  // Parse date in format "MM/DD/YYYY" or "YYYY-MM-DD HH:mm:ss"
  if (dateStr.includes('/')) {
    // Format: "04/04/2025"
    const [month, day, year] = dateStr.split('/').map(Number);
    return new Date(year, month - 1, day);
  } else if (dateStr.includes('-')) {
    // Format: "2025-11-09 20:00:00"
    return new Date(dateStr);
  } else {
    // Fallback: try to parse as-is
    return new Date(dateStr);
  }
}

function formatDate(dateStr: string): string {
  // Parse and format as "MMM DD" (e.g., "Apr 4")
  const date = parseDate(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function transformRiskReversalData(response: RiskReversalApiResponse): RiskReversalDataPoint[] {
  const { MRR, MO } = response;
  
  if (!MRR || !MO || !MRR.datetime || !MRR.value || !MO.datetime || !MO.value) {
    return [];
  }
  
  // Create a map with original date string as key to handle potential mismatches
  const dataMap = new Map<string, { date: Date; formattedDate: string; put: number; call: number }>();
  
  // Process MRR (put) data
  MRR.datetime.forEach((dateStr, index) => {
    const date = parseDate(dateStr);
    const formattedDate = formatDate(dateStr);
    const putValue = typeof MRR.value[index] === 'number' ? MRR.value[index] : 0;
    
    if (!dataMap.has(dateStr)) {
      dataMap.set(dateStr, {
        date,
        formattedDate,
        put: putValue,
        call: 0,
      });
    } else {
      const entry = dataMap.get(dateStr)!;
      entry.put = putValue;
    }
  });
  
  // Process MO (call) data
  MO.datetime.forEach((dateStr, index) => {
    const date = parseDate(dateStr);
    const formattedDate = formatDate(dateStr);
    const callValue = typeof MO.value[index] === 'number' ? MO.value[index] : 0;
    
    if (!dataMap.has(dateStr)) {
      dataMap.set(dateStr, {
        date,
        formattedDate,
        put: 0,
        call: callValue,
      });
    } else {
      const entry = dataMap.get(dateStr)!;
      entry.call = callValue;
    }
  });
  
  // Convert map to array, sort by date, and return formatted data
  const dataPoints: RiskReversalDataPoint[] = Array.from(dataMap.values())
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map((entry) => ({
      date: entry.formattedDate,
      put: parseFloat(entry.put.toFixed(3)),
      call: parseFloat(entry.call.toFixed(3)),
    }));
  
  return dataPoints;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { symbol = 'EUR' } = body as { symbol?: string };
    
    // Extract base currency if symbol is a pair (e.g., "EURUSD" -> "EUR")
    let currency = symbol.toUpperCase();
    if (currency.length > 3) {
      currency = currency.substring(0, 3);
    }
    
    if (!currency) {
      return NextResponse.json(
        { success: false, error: 'Currency symbol is required', data: null },
        { status: 400 }
      );
    }
    
    const cookieStore = await cookies();
    const authToken = cookieStore.get('pmt_auth_token')?.value;
    
    if (!authToken) {
      return NextResponse.json(
        { success: false, error: 'Authentication required', data: null },
        { status: 401 }
      );
    }
    
    const upstreamUrl = new URL('getFxOptionsRiskReversals', UPSTREAM).toString();
    const externalResponse = await fetch(upstreamUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({ symbol: currency }),
      signal: AbortSignal.timeout(30000),
    });
    
    if (!externalResponse.ok) {
      const errorText = await externalResponse.text();
      return NextResponse.json(
        { success: false, error: `External API returned ${externalResponse.status}: ${errorText}` },
        { status: externalResponse.status }
      );
    }
    
    const responseData: RiskReversalApiResponse = await externalResponse.json();
    
    // Transform the response to match widget data structure
    const transformedData = transformRiskReversalData(responseData);
    
    return NextResponse.json({
      success: true,
      data: {
        dataPoints: transformedData,
        currency,
      },
    });
  } catch (error) {
    console.error('Error in Risk Reversals API route:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        data: null,
      },
      { status: 500 }
    );
  }
}

