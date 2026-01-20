import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { API_CONFIG } from '@/lib/api';

export async function POST(request: NextRequest) {
  try {
    console.log('📅 [Event Calendar API] Request received');
    
    const body = await request.json();
    console.log('📅 [Event Calendar API] Request body:', {
      symbols: body.symbols,
      dateRange: body.dateRange,
      eventOrientation: body.eventOrientation,
      templateName: body.templateName,
      wgid: body.wgid
    });

    // Fetch real data only (no mock/fallback)
    const realData = await fetchRealEventCalendarData(request, body);
      if (realData && realData.success) {
        console.log('📅 [Event Calendar API] Using real API data');
        return NextResponse.json(realData);
      }
    
    console.error('❌ [Event Calendar API] Upstream API returned unsuccessful response', realData?.error);
    return NextResponse.json(
      { success: false, error: realData?.error || 'Upstream API returned unsuccessful response' },
      { status: 502 }
    );

  } catch (error) {
    console.error('❌ [Event Calendar API] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Fetch real event calendar data from PMT API
async function fetchRealEventCalendarData(req: NextRequest, requestBody: Record<string, unknown>) {
  const { wgid, symbols, dateRange, templateName } = requestBody;
  
  console.log('📅 [Event Calendar API] Attempting real API call:', {
    wgid,
    symbols,
    dateRange,
    templateName
  });

  // Get authentication token from cookies or Authorization header
  const cookieToken = await getAuthTokenFromCookies();
  const headerAuth = req.headers.get('authorization') || '';
  const bearerMatch = headerAuth.match(/^Bearer\s+(.+)$/i);
  const headerToken = bearerMatch ? bearerMatch[1] : null;
  const token = headerToken || cookieToken;
  console.log('📅 [Event Calendar API] Auth token available:', !!token);

  // Prepare request data (align with upstream contract observed via curl)
  const { firstDate, secondDate } = buildDateRange(String(dateRange || '14'));
  const wgidStr = String(wgid || '');
  const calendarId = /^\d+$/.test(wgidStr) ? wgidStr : '573344';
  const requestData: Record<string, string> = {
    getEventCalendar: calendarId,
    templateName: String(templateName || 'any'),
    firstDate,
    secondDate,
  };

  console.log('📅 [Event Calendar API] Request data:', requestData);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout for dummy data

  try {
    // Use upstream API base + endpoint path
    const send = async (payload: Record<string, string>) => fetch(`${API_CONFIG.UPSTREAM_API}getEventCalendarData`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    let response = await send(requestData);

    clearTimeout(timeoutId);

    console.log('📅 [Event Calendar API] Response status:', response.status);
    console.log('📅 [Event Calendar API] Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('📅 [Event Calendar API] API Error:', {
        status: response.status,
        statusText: response.statusText,
        errorText: errorText.substring(0, 500)
      });
      return {
        success: false,
        data: undefined,
        isFallbackData: false,
        error: `Upstream ${response.status} ${response.statusText}: ${errorText.substring(0, 500)}`
      };
    }

    let upstream = await response.json();
    let effectiveFirstDate = requestData.firstDate;
    let effectiveSecondDate = requestData.secondDate;
    // If no events returned, retry with a broader window (today → +30 days)
    if ((!upstream?.events || upstream.events.length === 0)) {
      console.log('📅 [Event Calendar API] No events in initial range, retrying with 30-day window');
      const wider = buildDateRange('30');
      const retryReq = { ...requestData, firstDate: wider.firstDate, secondDate: wider.secondDate };
      response = await send(retryReq);
      if (response.ok) {
        upstream = await response.json();
        effectiveFirstDate = wider.firstDate;
        effectiveSecondDate = wider.secondDate;
      }
    }
    console.log('📅 [Event Calendar API] API Response data keys:', Object.keys(upstream));
    console.log('📅 [Event Calendar API] Sample data:', JSON.stringify(upstream).substring(0, 1000));
    
    // Deep log first event to see all available fields
    if (upstream?.events && upstream.events.length > 0) {
      console.log('📅 [Event Calendar API] First event ALL fields:', JSON.stringify(upstream.events[0], null, 2));
      console.log('📅 [Event Calendar API] First event keys:', Object.keys(upstream.events[0]));
    }

    const normalized = normalizeUpstreamToWidgetData(upstream);
    // Attach effective date range for UI subtitle display
    (normalized as any).date_range = { firstDate: effectiveFirstDate, secondDate: effectiveSecondDate };

    return {
      success: true,
      data: normalized,
      isFallbackData: false
    };

  } catch (error) {
    clearTimeout(timeoutId);
    console.error('📅 [Event Calendar API] Fetch error:', error);
    return {
      success: false,
      data: undefined as unknown as Record<string, unknown>,
      isFallbackData: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Normalize upstream payload to widget data shape
function normalizeUpstreamToWidgetData(upstream: any) {
  const events = Array.isArray(upstream?.events) ? upstream.events : [];
  const mapped = events.map((e: any) => {
    const suffix: string | undefined = e?.suffix || undefined;
    const withSuffix = (v?: string) => (v ? (suffix ? `${v} ${suffix}` : v) : null);
    const toDDMMYYYY = (iso: string) => {
      const d = new Date(iso);
      const dd = String(d.getUTCDate()).padStart(2, '0');
      const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
      const yyyy = d.getUTCFullYear();
      return `${dd}/${mm}/${yyyy}`;
    };
    const mapCountryCodeFromCurrency = (cur?: string) => {
      const map: Record<string, string> = {
        USD: 'US', EUR: 'EU', GBP: 'GB', JPY: 'JP', AUD: 'AU',
        CHF: 'CH', CAD: 'CA', NZD: 'NZ', ITL: 'IT', ESP: 'ES'
      };
      const c = (cur || '').toUpperCase();
      return map[c] || c.slice(0, 2);
    };

    return {
      NewsDay: e?.newsDate ? toDDMMYYYY(e.newsDate) : (e?.newsDayC || ''),
      NewsTime: e?.newsTimeC || e?.newsTime || '',
      NewsHeader: e?.newsHeader || '',
      Currency: e?.currency || '',
      Country: (e?.country || '').replaceAll('_', ' '),
      CountryCode: mapCountryCodeFromCurrency(e?.currency),
      Impact: String(e?.sentiment ?? '1'),
      Event: e?.newsHeader || '',
      Actual: withSuffix(e?.actual),
      Forecast: withSuffix(e?.forecast),
      Previous: withSuffix(e?.previous),
      High: withSuffix(e?.high),
      Low: withSuffix(e?.low),
      // Map expanded detail fields from API
      measures: e?.measures || e?.whatItMeasures || e?.description || undefined,
      whyTradersCare: e?.whyTradersCare || e?.whyTradersCareText || undefined,
      ffNotes: e?.ffNotes || e?.notes || e?.additionalNotes || undefined,
      usualEffect: e?.usualEffect || e?.effect || undefined,
      frequency: e?.frequency || e?.releaseSchedule || undefined,
      nextRelease: e?.nextRelease || e?.nextReleaseDate || undefined,
      source: e?.source || e?.dataSource || undefined,
      historicalData: e?.historicalData || e?.history || e?.chartData || undefined,
      event_id: String(e?.investingNewsID ?? e?.newsID ?? ''),
      event_country: (e?.country || '').replaceAll('_', ' '),
      event_title: e?.newsHeader || '',
      event_actual: withSuffix(e?.actual) || undefined,
      event_forecast: withSuffix(e?.forecast) || undefined,
      event_previous: withSuffix(e?.previous) || undefined,
      event_currency: e?.currency || '',
      updated_on: new Date().toISOString()
    };
      });
  
  return {
    events: mapped,
    InvestingNews: mapped,
    current_time: new Date().toISOString(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  };
}

// Build date range for upstream (expects DD/MM/YYYY strings)
function buildDateRange(dateRange: string): { firstDate: string; secondDate: string } {
  const format = (d: Date) => {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };

  // If already in 'DD/MM/YYYY - DD/MM/YYYY'
  if (dateRange.includes('/')) {
    const parts = dateRange.split('-').map(p => p.trim());
    if (parts.length === 2) {
      return { firstDate: parts[0], secondDate: parts[1] };
  }
  }

  // Treat as number of days forward from today
  const days = Math.max(parseInt(dateRange || '7', 10) || 7, 1);
  const start = new Date();
  const end = new Date();
  end.setDate(start.getDate() + days);
  return { firstDate: format(start), secondDate: format(end) };
  }
  
// Get authentication token from cookies
async function getAuthTokenFromCookies(): Promise<string | null> {
  try {
  const cookieStore = await cookies();
  // Align with other widgets: token cookie is 'pmt_auth_token'
  const token = cookieStore.get('pmt_auth_token')?.value || null;
    return token;
  } catch {
  return null;
  }
  }
  
// Mock data removed: getFallbackEventCalendarData and generateRealisticValue