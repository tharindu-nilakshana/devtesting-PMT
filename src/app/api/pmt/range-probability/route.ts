import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { API_CONFIG } from '@/lib/api';

const UPSTREAM = API_CONFIG.UPSTREAM_API;

interface HistogramEntry {
  date: string;
  HighToLow: number;
  ATR: number;
}

interface HistogramRow {
  startValue: number;
  endValue: number;
  count: number;
  probability: number;
  cumulativeProbability: number;
}

interface RangeProbabilityApiResponse {
  Status: string;
  symbol?: string;
  TotalRecords?: number;
  AverageHighToLow?: number;
  AverageATR?: number;
  HistogramData?: HistogramEntry[];
}

function transformToHistogramBins(entries: HistogramEntry[]): HistogramRow[] {
  // Extract HighToLow values
  const highToLowValues = entries
    .map((entry) => Number(entry.HighToLow) || 0)
    .filter((val) => !Number.isNaN(val) && val > 0);

  if (highToLowValues.length === 0) {
    return [];
  }

  // Calculate average HighToLow
  const average = highToLowValues.reduce((sum, val) => sum + val, 0) / highToLowValues.length;

  // Calculate percentage changes from average: ((value - average) / average) * 100
  const percentageChanges = highToLowValues.map((val) => {
    if (average === 0) return 0;
    return ((val - average) / average) * 100;
  });

  // Define bin ranges - use similar approach to mock data
  // Mock data shows bins with approximately 0.345 width
  // Calculate dynamic range from actual percentage changes
  const minChange = Math.min(...percentageChanges);
  const maxChange = Math.max(...percentageChanges);
  
  // Round to create nice bin boundaries
  // Extend range slightly to ensure all values are included
  const rangeMin = Math.floor(minChange * 100) / 100 - 0.05;
  const rangeMax = Math.ceil(maxChange * 100) / 100 + 0.05;
  
  // Use bin width similar to mock data (~0.345, but adjusted for data range)
  // Create approximately 15-16 bins (similar to mock data which has 15 bins)
  const targetBinWidth = 0.345;
  const numBins = Math.max(10, Math.min(20, Math.ceil((rangeMax - rangeMin) / targetBinWidth)));
  const binWidth = (rangeMax - rangeMin) / numBins;

  // Create bins and count values
  const bins: Array<{ start: number; end: number; count: number }> = [];
  for (let i = 0; i < numBins; i++) {
    const start = rangeMin + i * binWidth;
    const end = rangeMin + (i + 1) * binWidth;
    bins.push({ start, end, count: 0 });
  }

  // Count values in each bin
  percentageChanges.forEach((change) => {
    // For the last bin, include values at the upper boundary
    let binIndex = Math.floor((change - rangeMin) / binWidth);
    if (binIndex < 0) binIndex = 0;
    if (binIndex >= numBins) binIndex = numBins - 1;
    // Special case: if change equals rangeMax, put it in the last bin
    if (change >= rangeMax && binIndex === numBins - 1) {
      // Already in correct bin
    } else if (change === rangeMax) {
      binIndex = numBins - 1;
    }
    bins[binIndex].count++;
  });

  // Calculate probabilities and cumulative probabilities
  const totalCount = highToLowValues.length;
  let cumulativeProbability = 0;

  const histogramRows: HistogramRow[] = bins.map((bin) => {
    const probability = totalCount > 0 ? (bin.count / totalCount) * 100 : 0;
    cumulativeProbability += probability;

    return {
      startValue: bin.start,
      endValue: bin.end,
      count: bin.count,
      probability,
      cumulativeProbability,
    };
  });

  return histogramRows;
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

    const upstreamUrl = new URL('getRangeProbability', UPSTREAM).toString();
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

    const responseData: RangeProbabilityApiResponse = await externalResponse.json();

    if (responseData.Status !== 'Success' || !responseData.HistogramData || !Array.isArray(responseData.HistogramData)) {
      return NextResponse.json(
        { success: false, error: 'Invalid response from API', data: null },
        { status: 400 }
      );
    }

    // Transform the histogram data into bins
    const histogramData = transformToHistogramBins(responseData.HistogramData);

    return NextResponse.json({
      success: true,
      data: {
        histogramData,
        symbol: responseData.symbol || symbol,
        totalRecords: responseData.TotalRecords || responseData.HistogramData.length,
        averageHighToLow: responseData.AverageHighToLow,
        averageATR: responseData.AverageATR,
      },
    });
  } catch (error) {
    console.error('Error in Range Probability API route:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error occurred', data: null },
      { status: 500 }
    );
  }
}

