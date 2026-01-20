import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { API_CONFIG } from '../../../../lib/api';

const UPSTREAM = API_CONFIG.UPSTREAM_API;

/**
 * Transform API response to component format
 * 
 * API Response Structure:
 * {
 *   Status: "Success",
 *   symbol: "EURUSD",
 *   AveragePositive: number,
 *   AverageNegative: number,
 *   PositiveReturnFrequency: number,
 *   NegativeReturnFrequency: number,
 *   ZeroReturnFrequency: number,
 *   OTOall: number[],  // Array of open-to-open percentage values
 *   otoweekdays: number[]  // Array of 6 values (average per day of week)
 * }
 */
function transformApiResponse(apiData: any, mode: 'open-to-open' | 'close-to-close') {
  // Get the data array based on mode
  // Note: API only returns OTOall (open-to-open), so we use that for both modes
  // If close-to-close data is needed, it would need to come from a different API field
  const dataArray = apiData.OTOall || [];
  
  console.log('📊 [Transform] Data array length:', dataArray.length);
  console.log('📊 [Transform] Data array type:', Array.isArray(dataArray));
  console.log('📊 [Transform] First few values:', dataArray.slice(0, 10));
  
  if (!Array.isArray(dataArray) || dataArray.length === 0) {
    console.warn('⚠️ [Transform] Empty or invalid data array');
    return {
      bellCurve: [],
      histogram: [],
      statistics: {
        mean: 0,
        stdDev: 0,
        currentPrice: 0,
        skewness: 0
      }
    };
  }
  
  // Filter out any invalid values (null, undefined, NaN)
  const validDataArray = dataArray.filter((val: any) => 
    typeof val === 'number' && !isNaN(val) && isFinite(val)
  );
  
  if (validDataArray.length === 0) {
    console.warn('⚠️ [Transform] No valid numeric values found');
    return {
      bellCurve: [],
      histogram: [],
      statistics: {
        mean: 0,
        stdDev: 0,
        currentPrice: 0,
        skewness: 0
      }
    };
  }
  
  console.log('📊 [Transform] Valid data array length:', validDataArray.length);

  // Calculate statistics using valid data
  const mean = validDataArray.reduce((sum: number, val: number) => sum + val, 0) / validDataArray.length;
  const variance = validDataArray.reduce((sum: number, val: number) => sum + Math.pow(val - mean, 2), 0) / validDataArray.length;
  const stdDev = Math.sqrt(variance);
  
  // Calculate skewness (only if stdDev > 0 to avoid division by zero)
  let skewness = 0;
  if (stdDev > 0) {
    skewness = validDataArray.reduce((sum: number, val: number) => {
      return sum + Math.pow((val - mean) / stdDev, 3);
    }, 0) / validDataArray.length;
  }

  // Get current price (most recent value or average)
  const currentPrice = validDataArray[validDataArray.length - 1] || mean;
  
  console.log('📊 [Transform] Calculated statistics:', { mean, stdDev, currentPrice, skewness });

  // Create histogram bins
  // MOCK DATA: Used absolute values from -4 to +4, 25 bins evenly spaced
  // REAL DATA: Use the same approach - absolute values from -4 to +4
  const numBins = 25;
  const binStart = -4;  // Absolute value, matching mock data
  const binEnd = 4;     // Absolute value, matching mock data
  const binWidth = (binEnd - binStart) / numBins; // 8 / 25 = 0.32

  const histogram: Array<{ value: number; count: number }> = [];
  const binCounts = new Array(numBins).fill(0);

  // Count values in each bin (map actual data values to absolute bins)
  validDataArray.forEach((value: number) => {
    // Map the actual data value to a bin index in the -4 to +4 range
    let binIndex = Math.floor((value - binStart) / binWidth);
    // Handle edge cases: clamp to valid range
    if (binIndex < 0) binIndex = 0;
    if (binIndex >= numBins) binIndex = numBins - 1;
    binCounts[binIndex]++;
  });

  // Create histogram data points with absolute values from -4 to +4
  // MOCK DATA: value = -4 + (i / (numBars - 1)) * 8
  for (let i = 0; i < numBins; i++) {
    const binValue = binStart + (i / (numBins - 1)) * (binEnd - binStart);
    histogram.push({
      value: binValue,  // Absolute value from -4 to +4, matching mock data
      count: binCounts[i]
    });
  }
  
  console.log('📊 [Transform] Histogram summary:', {
    totalBins: histogram.length,
    binsWithData: histogram.filter(b => b.count > 0).length,
    maxCount: Math.max(...histogram.map(b => b.count)),
    totalCount: histogram.reduce((sum, b) => sum + b.count, 0),
    sampleBars: histogram.slice(0, 5).map(b => ({ value: b.value.toFixed(2), count: b.count })),
    middleBars: histogram.slice(10, 15).map(b => ({ value: b.value.toFixed(2), count: b.count }))
  });

  // Generate bell curve points
  // MOCK DATA: Used absolute values from -4 to +4 (not relative to mean)
  // REAL DATA: We need to use the same approach - absolute values from -4 to +4
  // This ensures X-axis labels at -3σ, -2σ, etc. align correctly
  const bellCurve: Array<{ value: number; frequency: number }> = [];
  
  // Only generate bell curve if stdDev > 0
  if (stdDev > 0) {
    // Use absolute values from -4 to +4 like mock data (not mean + i * stdDev)
    // This matches the mock data structure where X-axis labels are at -3, -2, -1, 0, 1, 2, 3
    for (let i = -4; i <= 4; i += 0.1) {
      const x = i; // Absolute value, not mean + i * stdDev
      // Calculate frequency using the actual mean and stdDev
      const exponent = -Math.pow((x - mean) / stdDev, 2) / 2;
      const frequency = (1 / (stdDev * Math.sqrt(2 * Math.PI))) * Math.exp(exponent);
      bellCurve.push({
        value: x,
        frequency: frequency
      });
    }
  } else {
    // If stdDev is 0, create a single point at the mean
    bellCurve.push({
      value: mean,
      frequency: 1
    });
  }

  return {
    bellCurve,
    histogram,
    statistics: {
      mean,
      stdDev,
      currentPrice,
      skewness
    }
  };
}

export async function POST(request: NextRequest) {
  console.log('📊 [Distribution Chart API] Request received');
  
  try {
    const body = await request.json();
    const { symbol = 'EURUSD', mode = 'open-to-open' } = body;
    
    // Get authentication token
    const cookieStore = await cookies();
    const authToken = cookieStore.get('pmt_auth_token')?.value;
    
    if (!authToken) {
      console.error('❌ [Distribution Chart API] No auth token found');
      return NextResponse.json({
        success: false,
        error: 'Authentication required',
      }, { status: 401 });
    }
    
    console.log('📊 [Distribution Chart API] Fetching data for symbol:', symbol, 'mode:', mode);
    
    // Call external API using centralized config
    const upstreamUrl = new URL('getDistributionChart', UPSTREAM).toString();
    const externalResponse = await fetch(upstreamUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ symbol }),
      signal: AbortSignal.timeout(30000),
    });
    
    console.log('📊 [Distribution Chart API] External API response status:', externalResponse.status);
    
    if (!externalResponse.ok) {
      console.error('❌ [Distribution Chart API] External API error:', externalResponse.status);
      const errorText = await externalResponse.text();
      return NextResponse.json({
        success: false,
        error: `External API returned ${externalResponse.status}: ${errorText}`,
        data: null,
      }, { status: externalResponse.status });
    }
    
    const responseData = await externalResponse.json();
    console.log('📊 [Distribution Chart API] Received response');
    console.log('📊 [Distribution Chart API] Response keys:', Object.keys(responseData));
    console.log('📊 [Distribution Chart API] OTOall length:', responseData?.OTOall?.length || 0);
    console.log('📊 [Distribution Chart API] OTOall first 5 values:', responseData?.OTOall?.slice(0, 5));
    
    // Transform the API response to match our component's expected format
    const transformedData = transformApiResponse(responseData, mode);
    console.log('📊 [Distribution Chart API] Transformed data stats:', {
      bellCurveLength: transformedData.bellCurve.length,
      histogramLength: transformedData.histogram.length,
      mean: transformedData.statistics.mean,
      stdDev: transformedData.statistics.stdDev,
      currentPrice: transformedData.statistics.currentPrice,
      skewness: transformedData.statistics.skewness
    });
    
    return NextResponse.json({
      success: true,
      data: transformedData,
      timestamp: Date.now()
    });

  } catch (error) {
    console.error('❌ [Distribution Chart API] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      data: null,
    }, { status: 500 });
  }
}

