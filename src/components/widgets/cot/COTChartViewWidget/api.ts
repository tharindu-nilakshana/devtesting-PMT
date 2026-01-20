import { cookies } from 'next/headers';
import { API_CONFIG } from '../../../../lib/api';

export interface COTChartData {
  seriesname: string;
  Categories: string[];
  OpenInterest?: number[];
  NetPosition?: number[];
  NetPercent?: number[];
  LongPosition?: number[];
  ShortPosition?: number[];
  LongPercent?: number[];
  ShortPercent?: number[];
  // Additional metadata from the API
  symbolPart?: string;
  owner?: string;
  type?: string;
  interval?: string;
  summary?: string;
}

export interface COTChartResponse {
  success: boolean;
  data: COTChartData;
  additionalSettings: string;
  templateName: string;
  timestamp: number;
}

export async function getCOTChartData(
  additionalSettings?: string,
  templateName?: string
): Promise<COTChartResponse | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('pmt_auth_token')?.value;
    
    if (!token) {
      console.warn('No authentication token found for COT Chart data');
      return null;
    }

    // Parse additional settings to extract chart type
    const settingsArray = (additionalSettings || '').split('|');
    const templateIndex = templateName === 'Details' ? 5 : 4;
    const chartType = settingsArray[templateIndex] || 'Bar Chart';

    // Prepare request data
    const requestData = {
      GetCOTHistoryChart: true,
      WidgetID: 'cot_history_chart',
      AdditionalSettings: additionalSettings || '',
      TemplateName: templateName || 'Dashboard',
      ChartType: chartType,
    };

    // Call external API using centralized configuration
    const response = await fetch(`${API_CONFIG.UPSTREAM_API}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: new URLSearchParams(Object.entries(requestData).map(([key, value]) => [key, String(value)])).toString(),
      // Add timeout to prevent hanging requests
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });

    if (!response.ok) {
      console.error('Failed to fetch COT Chart data:', response.status);
      return null;
    }

    const data = await response.json();
    
    // Process the response data
    const chartData: COTChartData = {
      seriesname: data.seriesname || 'OpenInterest',
      Categories: data.Categories || [],
      OpenInterest: data.OpenInterest || [],
      NetPosition: data.NetPosition || [],
      NetPercent: data.NetPercent || [],
      LongPosition: data.LongPosition || [],
      ShortPosition: data.ShortPosition || [],
      LongPercent: data.LongPercent || [],
      ShortPercent: data.ShortPercent || [],
    };
    
    return {
      success: true,
      data: chartData,
      additionalSettings: additionalSettings || '',
      templateName: templateName || 'Dashboard',
      timestamp: Date.now()
    };

  } catch (error) {
    if (error instanceof Error && error.name === 'TimeoutError') {
      console.warn('COT Chart data fetch timed out after 5 seconds');
    } else {
      console.error('Error fetching COT Chart data:', error);
    }
    return null;
  }
}

// SSR-specific function for data processing
export async function getCOTChartDataForSSR(
  additionalSettings?: string,
  templateName?: string
): Promise<COTChartData | null> {
  const result = await getCOTChartData(additionalSettings, templateName);
  return result?.data || null;
}

// NEW: SSR function using settings popup parameters (additive - no breaking changes)
export async function getCOTChartDataWithSettings(
  currency?: string,
  dataType?: string,
  owner?: string,
  duration?: string
): Promise<COTChartResponse | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('pmt_auth_token')?.value;
    
    if (!token) {
      console.warn('No authentication token found for COT Chart data with settings');
      return null;
    }

    // Map owner values to API format
    const mapOwnerToAPI = (owner: string): string => {
      switch (owner) {
        case 'Dealer Intermediary':
          return 'Dealer';
        case 'Asset Manager / Institutional':
          return 'AssetManager';
        case 'Leveraged Funds':
          return 'Leveraged';
        // Backward compatibility for old saved values
        case 'Dealer':
          return 'Dealer';
        case 'AssetManager':
          return 'AssetManager';
        case 'Leveraged':
          return 'Leveraged';
        default:
          return 'Dealer';
      }
    };

    // Convert '7300' (UI value for "All") to 'All' for API, or use default '1825' (5 years)
    const apiInterval = duration === '7300' ? 'All' : (duration || '1825');
    
    // Prepare request data
    const requestData = {
      symbolPart: currency || 'USD',
      owner: mapOwnerToAPI(owner || 'Dealer Intermediary'),
      type: dataType || 'NetPercent',
      interval: apiInterval,
      typ: 'optional'
    };

    // Call external API
    const response = await fetch(`${API_CONFIG.UPSTREAM_API}getCOTChartView`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(requestData),
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });

    if (!response.ok) {
      console.error('Failed to fetch COT Chart data with settings:', response.status);
      return null;
    }

    const data = await response.json();
    
    if (!data.success) {
      console.error('API returned unsuccessful response for COT Chart with settings');
      return null;
    }
    
    // Process the response data
    const chartData: COTChartData = {
      seriesname: data.seriesname || 'OpenInterest',
      Categories: data.Categories || [],
      OpenInterest: data.OpenInterest || [],
      NetPosition: data.NetPosition || [],
      NetPercent: data.NetPercent || [],
      LongPosition: data.LongPosition || [],
      ShortPosition: data.ShortPosition || [],
      LongPercent: data.LongPercent || [],
      ShortPercent: data.ShortPercent || [],
      // Additional metadata from the API
      symbolPart: data.symbolPart,
      owner: data.owner,
      type: data.type,
      interval: data.interval,
      summary: data.summary
    };
    
    return {
      success: true,
      data: chartData,
      additionalSettings: `${currency}|${owner}|${duration}|0|Bar Chart`,
      templateName: 'Dashboard',
      timestamp: Date.now()
    };

  } catch (error) {
    if (error instanceof Error && error.name === 'TimeoutError') {
      console.warn('COT Chart data fetch with settings timed out after 5 seconds');
    } else {
      console.error('Error fetching COT Chart data with settings:', error);
    }
    return null;
  }
}

// NEW: SSR-specific function for settings-based data processing (additive - no breaking changes)
export async function getCOTChartDataWithSettingsForSSR(
  currency?: string,
  dataType?: string,
  owner?: string,
  duration?: string
): Promise<COTChartData | null> {
  const result = await getCOTChartDataWithSettings(currency, dataType, owner, duration);
  return result?.data || null;
}
