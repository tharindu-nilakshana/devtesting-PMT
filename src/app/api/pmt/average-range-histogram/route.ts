import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { API_CONFIG } from '@/lib/api';

const UPSTREAM = API_CONFIG.UPSTREAM_API;

type PeriodType = 'daily' | 'weekly' | 'monthly';

interface HistogramEntry {
  date: string;
  HighToLow: number;
  ATR: number;
}

function transformHistogramData(entries: HistogramEntry[], period: PeriodType) {
  const sanitized = entries
    .map((entry) => ({
      date: entry.date,
      highToLow: Number(entry.HighToLow) || 0,
      atr: Number(entry.ATR) || 0,
    }))
    .filter((entry) => !Number.isNaN(entry.highToLow) && !Number.isNaN(entry.atr));

  if (sanitized.length === 0) {
    return [];
  }

  if (period === 'daily') {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const groups = dayNames.map(() => ({ sumHL: 0, sumATR: 0, count: 0 }));

    sanitized.forEach((entry) => {
      const parsed = new Date(entry.date);
      if (!isNaN(parsed.getTime())) {
        const dayIndex = parsed.getUTCDay();
        groups[dayIndex].sumHL += entry.highToLow;
        groups[dayIndex].sumATR += entry.atr;
        groups[dayIndex].count += 1;
      }
    });

    return groups.map((group, index) => ({
      label: dayNames[index],
      highToLow: group.count > 0 ? group.sumHL / group.count : 0,
      atr: group.count > 0 ? group.sumATR / group.count : 0,
    }));
  }

  if (period === 'weekly') {
    const weekLabels = ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5'];
    const groups = weekLabels.map(() => ({ sumHL: 0, sumATR: 0, count: 0 }));

    sanitized.forEach((entry) => {
      const parsed = new Date(entry.date);
      if (!isNaN(parsed.getTime())) {
        const dayOfMonth = parsed.getUTCDate();
        const weekIndex = Math.min(4, Math.floor((dayOfMonth - 1) / 7));
        groups[weekIndex].sumHL += entry.highToLow;
        groups[weekIndex].sumATR += entry.atr;
        groups[weekIndex].count += 1;
      }
    });

    return groups.map((group, index) => ({
      label: weekLabels[index],
      highToLow: group.count > 0 ? group.sumHL / group.count : 0,
      atr: group.count > 0 ? group.sumATR / group.count : 0,
    }));
  }

  // Monthly: aggregate by month of year (Jan-Dec)
  const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthGroups = monthLabels.map(() => ({ sumHL: 0, sumATR: 0, count: 0 }));

  sanitized.forEach((entry) => {
    const parsed = new Date(entry.date);
    if (!isNaN(parsed.getTime())) {
      const monthIndex = parsed.getUTCMonth();
      monthGroups[monthIndex].sumHL += entry.highToLow;
      monthGroups[monthIndex].sumATR += entry.atr;
      monthGroups[monthIndex].count += 1;
    }
  });

  return monthGroups.map((group, index) => ({
    label: monthLabels[index],
    highToLow: group.count > 0 ? group.sumHL / group.count : 0,
    atr: group.count > 0 ? group.sumATR / group.count : 0,
  }));
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { symbol = 'EURUSD', period = 'daily' } = body as { symbol?: string; period?: PeriodType };

    if (!symbol) {
      return NextResponse.json({ success: false, error: 'Symbol is required', data: null }, { status: 400 });
    }

    const cookieStore = await cookies();
    const authToken = cookieStore.get('pmt_auth_token')?.value;

    if (!authToken) {
      return NextResponse.json({ success: false, error: 'Authentication required', data: null }, { status: 401 });
    }

    const upstreamUrl = new URL('getAverageDailyHistogram', UPSTREAM).toString();
    const upstreamResponse = await fetch(upstreamUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({ symbol, period }),
      signal: AbortSignal.timeout(30000),
    });

    if (!upstreamResponse.ok) {
      const errorText = await upstreamResponse.text();
      return NextResponse.json({
        success: false,
        error: `Upstream API returned ${upstreamResponse.status}: ${errorText}`,
        data: null,
      }, { status: upstreamResponse.status });
    }

    const responseData = await upstreamResponse.json();
    const histogramData = Array.isArray(responseData?.HistogramData)
      ? transformHistogramData(responseData.HistogramData, period as PeriodType)
      : [];

    return NextResponse.json({
      success: true,
      data: {
        histogramData,
      },
      timestamp: Date.now(),
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      data: null,
    }, { status: 500 });
  }
}
