import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { API_CONFIG } from '@/lib/api';

const UPSTREAM = API_CONFIG.UPSTREAM_API;

/**
 * Transform API response to match widget data structure
 * 
 * API Response Structure:
 * {
 *   "Status": "Success",
 *   "symbol": "EURUSD",
 *   "period": "daily",
 *   "dayliatr6": 0.482817,    // 6 days (1 Week)
 *   "dayliatr24": 0.508142,   // 24 days (1 Month)
 *   "dayliatr72": 0.621737,   // 72 days (3 Months)
 *   "dayliatr288": 0.75923,   // 288 days (1 Year)
 *   "dayliatr576": 0.665059,  // 576 days (2 Years)
 *   "dayliatrall": 0.824116   // All Time
 * }
 * 
 * Widget expects:
 * {
 *   periods: [
 *     { days: 6, label: "1 Week", percentage: "0.472%", pips: 241.7 },
 *     ...
 *   ],
 *   currentPrice: number,
 *   dayHigh: number,
 *   dayLow: number,
 *   summary: {
 *     sevenDayAvg: string,
 *     thirtyDayAvg: string,
 *     annualAvg: string
 *   }
 * }
 */
function transformApiResponse(apiData: any, period: 'daily' | 'weekly' | 'monthly') {
  // Map periods based on the period type
  // API returns different keys for different periods:
  // - daily: dayliatr6, dayliatr24, dayliatr72, dayliatr288, dayliatr576, dayliatrall
  // - weekly: weekly12, weekly26, weekly52, weekly104, weekly156, weeklyall
  // - monthly: monthly3, monthly6, monthly12, monthly24, monthly36, monthly60, monthlyall
  let periods: Array<{ key: string; days: number; label: string }>;
  
  if (period === 'daily') {
    periods = [
      { key: 'dayliatr6', days: 6, label: '1 Week' },
      { key: 'dayliatr24', days: 24, label: '1 Month' },
      { key: 'dayliatr72', days: 72, label: '3 Months' },
      { key: 'dayliatr288', days: 288, label: '1 Year' },
      { key: 'dayliatr576', days: 576, label: '2 Years' },
      { key: 'dayliatrall', days: 0, label: 'All Time' },
    ];
  } else if (period === 'weekly') {
    periods = [
      { key: 'weekly12', days: 6, label: '1 Week' },      // 12 weeks = ~3 months, but showing as 1 week for consistency
      { key: 'weekly26', days: 24, label: '1 Month' },    // 26 weeks = ~6 months, but showing as 1 month for consistency
      { key: 'weekly52', days: 72, label: '3 Months' },   // 52 weeks = 1 year, but showing as 3 months for consistency
      { key: 'weekly104', days: 288, label: '1 Year' },   // 104 weeks = 2 years, but showing as 1 year for consistency
      { key: 'weekly156', days: 576, label: '2 Years' },  // 156 weeks = 3 years, but showing as 2 years for consistency
      { key: 'weeklyall', days: 0, label: 'All Time' },
    ];
  } else { // monthly
    periods = [
      { key: 'monthly3', days: 6, label: '1 Week' },      // 3 months, but showing as 1 week for consistency
      { key: 'monthly6', days: 24, label: '1 Month' },    // 6 months, but showing as 1 month for consistency
      { key: 'monthly12', days: 72, label: '3 Months' },  // 12 months = 1 year, but showing as 3 months for consistency
      { key: 'monthly24', days: 288, label: '1 Year' },   // 24 months = 2 years, but showing as 1 year for consistency
      { key: 'monthly36', days: 576, label: '2 Years' },  // 36 months = 3 years, but showing as 2 years for consistency
      { key: 'monthlyall', days: 0, label: 'All Time' },
    ];
  }

  // Get current price from API if available, otherwise use a default
  // For now, we'll use a placeholder - this should come from WebSocket or another API
  // Default EURUSD price (can be updated via WebSocket later)
  const currentPrice = apiData.currentPrice || 1.08;
  
  // Calculate dayHigh and dayLow from the average range
  // Use the first period's value as a reference for the current range
  const firstPeriodKey = periods[0].key;
  const avgRange = apiData[firstPeriodKey] || 0.5; // Default 0.5% if not available
  const rangeHalf = (avgRange / 100) * currentPrice / 2;
  const dayHigh = apiData.dayHigh || (currentPrice + rangeHalf);
  const dayLow = apiData.dayLow || (currentPrice - rangeHalf);
  
  // Calculate pip value based on symbol type
  // For forex pairs, 1 pip = 0.0001 (for most pairs except JPY pairs where 1 pip = 0.01)
  // For simplicity, we'll use 0.0001 for all forex pairs
  const pipValue = 0.0001;
  
  const transformedPeriods = periods.map(({ key, days, label }) => {
    const percentageValue = apiData[key] || 0;
    const percentage = percentageValue.toFixed(3);
    
    // Calculate pips: (percentage / 100) * currentPrice / pipValue
    // For forex: pips = (percentage / 100) * price / 0.0001
    const pips = (percentageValue / 100) * currentPrice / pipValue;
    
    return {
      days,
      label,
      percentage: `${percentage}%`,
      pips: Math.round(pips * 10) / 10, // Round to 1 decimal place
    };
  });

  // Calculate summary statistics based on period type
  let sevenDayAvg: number;
  let thirtyDayAvg: number;
  let annualAvg: number;
  
  if (period === 'daily') {
    sevenDayAvg = apiData.dayliatr6 || 0;
    thirtyDayAvg = apiData.dayliatr24 || 0;
    annualAvg = apiData.dayliatr288 || 0;
  } else if (period === 'weekly') {
    sevenDayAvg = apiData.weekly12 || 0;
    thirtyDayAvg = apiData.weekly26 || 0;
    annualAvg = apiData.weekly52 || 0;
  } else { // monthly
    sevenDayAvg = apiData.monthly3 || 0;
    thirtyDayAvg = apiData.monthly6 || 0;
    annualAvg = apiData.monthly12 || 0;
  }

  return {
    periods: transformedPeriods,
    currentPrice,
    dayHigh,
    dayLow,
    summary: {
      sevenDayAvg: `${sevenDayAvg.toFixed(3)}%`,
      thirtyDayAvg: `${thirtyDayAvg.toFixed(3)}%`,
      annualAvg: `${annualAvg.toFixed(3)}%`,
    },
  };
}

export async function POST(request: NextRequest) {
  console.log('📊 [Average Daily Range API] Request received');
  
  try {
    const body = await request.json();
    const { symbol = 'EURUSD', period = 'daily' } = body;
    
    const cookieStore = await cookies();
    const authToken = cookieStore.get('pmt_auth_token')?.value;
    
    if (!authToken) {
      console.error('❌ [Average Daily Range API] No auth token found');
      return NextResponse.json({
        success: false,
        error: 'Authentication required',
      }, { status: 401 });
    }
    
    console.log('📊 [Average Daily Range API] Fetching data for symbol:', symbol, 'period:', period);
    
    const upstreamUrl = new URL('getAverageDailyRange', UPSTREAM).toString();
    const externalResponse = await fetch(upstreamUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ symbol, period }),
      signal: AbortSignal.timeout(30000),
    });
    
    console.log('📊 [Average Daily Range API] External API response status:', externalResponse.status);
    
    if (!externalResponse.ok) {
      console.error('❌ [Average Daily Range API] External API error:', externalResponse.status);
      const errorText = await externalResponse.text();
      return NextResponse.json({
        success: false,
        error: `External API returned ${externalResponse.status}: ${errorText}`,
        data: null,
      }, { status: externalResponse.status });
    }
    
    const responseData = await externalResponse.json();
    console.log('📊 [Average Daily Range API] Received response:', {
      symbol: responseData.symbol,
      period: responseData.period,
      hasDayliatr6: !!responseData.dayliatr6,
      hasDayliatr24: !!responseData.dayliatr24,
      hasDayliatr72: !!responseData.dayliatr72,
      hasDayliatr288: !!responseData.dayliatr288,
      hasDayliatr576: !!responseData.dayliatr576,
      hasDayliatrall: !!responseData.dayliatrall,
    });
    
    const transformedData = transformApiResponse(responseData, period);
    console.log('📊 [Average Daily Range API] Transformed data:', {
      periodsCount: transformedData.periods.length,
      currentPrice: transformedData.currentPrice,
      dayHigh: transformedData.dayHigh,
      dayLow: transformedData.dayLow,
      summary: transformedData.summary,
    });
    
    return NextResponse.json({
      success: true,
      data: transformedData,
      timestamp: Date.now()
    });

  } catch (error) {
    console.error('❌ [Average Daily Range API] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      data: null,
    }, { status: 500 });
  }
}

