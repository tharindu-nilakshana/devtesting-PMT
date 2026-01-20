import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { API_CONFIG } from '@/lib/api';

const UPSTREAM = API_CONFIG.UPSTREAM_API;

interface DistributionStatsApiResponse {
  Status: string;
  symbol?: string;
  AveragePositive?: number;
  AverageNegative?: number;
  PositiveReturnFrequency?: number;
  NegativeReturnFrequency?: number;
  ZeroReturnFrequency?: number;
  Min?: number;
  Max?: number;
  Mean?: number;
  Median?: number;
  StdDev?: number;
  TotalRecords?: number;
  OTOall?: number[];
}

interface StatRow {
  label: string;
  value: string;
}

function transformApiResponse(apiData: DistributionStatsApiResponse): StatRow[] {
  const stats: StatRow[] = [];

  // Mean
  if (apiData.Mean !== undefined) {
    stats.push({ label: 'Mean', value: apiData.Mean.toFixed(3) });
  }

  // Median
  if (apiData.Median !== undefined) {
    stats.push({ label: 'Median', value: apiData.Median.toFixed(3) });
  }

  // Mode - not in API, calculate from OTOall array (most frequent value)
  if (apiData.OTOall && apiData.OTOall.length > 0) {
    const frequencyMap = new Map<number, number>();
    apiData.OTOall.forEach((val) => {
      const rounded = Math.round(val * 1000) / 1000; // Round to 3 decimal places
      frequencyMap.set(rounded, (frequencyMap.get(rounded) || 0) + 1);
    });
    let maxFreq = 0;
    let mode = 0;
    frequencyMap.forEach((freq, val) => {
      if (freq > maxFreq) {
        maxFreq = freq;
        mode = val;
      }
    });
    stats.push({ label: 'Mode', value: mode.toFixed(3) });
  } else {
    stats.push({ label: 'Mode', value: '0.000' });
  }

  // Standard Deviation
  if (apiData.StdDev !== undefined) {
    stats.push({ label: 'Standard Deviation', value: apiData.StdDev.toFixed(3) });
  }

  // Sample Variance = StdDev^2
  if (apiData.StdDev !== undefined) {
    const variance = Math.pow(apiData.StdDev, 2);
    stats.push({ label: 'Sample Variance', value: variance.toFixed(3) });
  }

  // Kurtosis - not in API, calculate from OTOall array
  if (apiData.OTOall && apiData.OTOall.length > 0 && apiData.Mean !== undefined && apiData.StdDev !== undefined && apiData.StdDev > 0) {
    const mean = apiData.Mean;
    const stdDev = apiData.StdDev;
    const n = apiData.OTOall.length;
    const kurtosis = apiData.OTOall.reduce((sum, val) => {
      return sum + Math.pow((val - mean) / stdDev, 4);
    }, 0) / n - 3; // Excess kurtosis
    stats.push({ label: 'Kurtosis', value: kurtosis.toFixed(3) });
  } else {
    stats.push({ label: 'Kurtosis', value: '0.000' });
  }

  // Skewness - not in API, calculate from OTOall array
  if (apiData.OTOall && apiData.OTOall.length > 0 && apiData.Mean !== undefined && apiData.StdDev !== undefined && apiData.StdDev > 0) {
    const mean = apiData.Mean;
    const stdDev = apiData.StdDev;
    const n = apiData.OTOall.length;
    const skewness = apiData.OTOall.reduce((sum, val) => {
      return sum + Math.pow((val - mean) / stdDev, 3);
    }, 0) / n;
    stats.push({ label: 'Skewness', value: skewness.toFixed(3) });
  } else {
    stats.push({ label: 'Skewness', value: '0.000' });
  }

  // Range = Max - Min
  if (apiData.Max !== undefined && apiData.Min !== undefined) {
    const range = apiData.Max - apiData.Min;
    stats.push({ label: 'Range', value: range.toFixed(3) });
  }

  // Minimum
  if (apiData.Min !== undefined) {
    stats.push({ label: 'Minimum', value: apiData.Min.toFixed(3) });
  }

  // Maximum
  if (apiData.Max !== undefined) {
    stats.push({ label: 'Maximum', value: apiData.Max.toFixed(3) });
  }

  // Sum - calculate from OTOall array
  if (apiData.OTOall && apiData.OTOall.length > 0) {
    const sum = apiData.OTOall.reduce((acc, val) => acc + val, 0);
    stats.push({ label: 'Sum', value: sum.toFixed(3) });
  } else {
    stats.push({ label: 'Sum', value: '0.000' });
  }

  // Count
  if (apiData.TotalRecords !== undefined) {
    stats.push({ label: 'Count', value: apiData.TotalRecords.toFixed(3) });
  }

  // Average Positive
  if (apiData.AveragePositive !== undefined) {
    stats.push({ label: 'Average Positive', value: apiData.AveragePositive.toFixed(3) });
  }

  // Average Negative
  if (apiData.AverageNegative !== undefined) {
    stats.push({ label: 'Average Negative', value: apiData.AverageNegative.toFixed(3) });
  }

  // Positive Return Frequency
  if (apiData.PositiveReturnFrequency !== undefined) {
    stats.push({ label: 'Positive Return Frequency', value: `${apiData.PositiveReturnFrequency.toFixed(3)}%` });
  }

  // Negative Return Frequency
  if (apiData.NegativeReturnFrequency !== undefined) {
    stats.push({ label: 'Negative Return Frequency', value: `${apiData.NegativeReturnFrequency.toFixed(3)}%` });
  }

  return stats;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { symbol = 'EURUSD' } = body as { symbol?: string };

    if (!symbol) {
      return NextResponse.json({ success: false, error: 'Symbol is required', data: null }, { status: 400 });
    }

    const cookieStore = await cookies();
    const authToken = cookieStore.get('pmt_auth_token')?.value;

    if (!authToken) {
      return NextResponse.json({ success: false, error: 'Authentication required', data: null }, { status: 401 });
    }

    const upstreamUrl = new URL('getDistributionStats', UPSTREAM).toString();
    const externalResponse = await fetch(upstreamUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({ symbol }),
      signal: AbortSignal.timeout(30000),
    });

    if (!externalResponse.ok) {
      const errorText = await externalResponse.text();
      return NextResponse.json(
        { success: false, error: `External API returned ${externalResponse.status}: ${errorText}` },
        { status: externalResponse.status }
      );
    }

    const responseData: DistributionStatsApiResponse = await externalResponse.json();

    if (responseData.Status !== 'Success') {
      return NextResponse.json(
        { success: false, error: 'Invalid response from API', data: null },
        { status: 400 }
      );
    }

    // Transform the API response to StatRow format
    const stats = transformApiResponse(responseData);

    return NextResponse.json({
      success: true,
      data: {
        stats,
        symbol: responseData.symbol || symbol,
        totalRecords: responseData.TotalRecords,
      },
    });
  } catch (error) {
    console.error('Error in Distribution Statistics API route:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error occurred', data: null },
      { status: 500 }
    );
  }
}

