import { cookies } from 'next/headers';
import { API_CONFIG } from '@/lib/api';

export interface COTTableRow {
  date: string;
  openInterest: string;
  positions: {
    long: string;
    longChange: string;
    short: string;
    shortChange: string;
    spreading: string;
    spreadingChange: string;
    totalPosition: string;
    netPosition: string;
  };
  percentOfOpenInterest: {
    long: string;
    short: string;
    spreading: string;
    net: string;
  };
  numberOfTraders: {
    long: string;
    short: string;
    spreading: string;
    totalTraders: string;
    netTraders: string;
  };
}

export interface COTTableData {
  success: boolean;
  data: COTTableRow[];
  maxid: string;
  error?: string;
}

export interface COTTableViewResponse {
  success: boolean;
  data: COTTableRow[];
  maxid: string;
  symbolPart: string;
  owner: string;
  timestamp: number;
}

export async function getCOTTableViewData(
  symbolPart?: string,
  owner?: string,
  maxId?: string
): Promise<COTTableViewResponse | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('pmt_auth_token')?.value;
    
    if (!token) {
      console.warn('No authentication token found for COT Table View data');
      return null;
    }

    // Prepare request data
    const requestData = {
      symbolPart: symbolPart || 'EUR',
      owner: owner || 'Dealer',
      symbolSelection: '1',
      maxId: maxId || '0'
    };

    // Call external API using centralized configuration
    const response = await fetch(`${API_CONFIG.UPSTREAM_API}getCOTTableViewRawData`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(requestData),
      // Add timeout to prevent hanging requests
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });

    if (!response.ok) {
      console.error('Failed to fetch COT Table View data:', response.status);
      return null;
    }

    const data = await response.json();
    
    // Parse the JSON data into COTTableRow format
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parsedRows: COTTableRow[] = data.data?.map((row: any) => ({
      date: row.date || '',
      openInterest: row.openInterest || '',
      positions: {
        long: row.positions?.long || '',
        longChange: row.positions?.longChange || '',
        short: row.positions?.short || '',
        shortChange: row.positions?.shortChange || '',
        spreading: row.positions?.spreading || '',
        spreadingChange: row.positions?.spreadingChange || '',
        totalPosition: row.positions?.totalPosition || '',
        netPosition: row.positions?.netPosition || '',
      },
      percentOfOpenInterest: {
        long: row.percentOfOpenInterest?.long || '',
        short: row.percentOfOpenInterest?.short || '',
        spreading: row.percentOfOpenInterest?.spreading || '',
        net: row.percentOfOpenInterest?.net || '',
      },
      numberOfTraders: {
        long: row.numberOfTraders?.long || '',
        short: row.numberOfTraders?.short || '',
        spreading: row.numberOfTraders?.spreading || '',
        totalTraders: row.numberOfTraders?.totalTraders || '',
        netTraders: row.numberOfTraders?.netTraders || '',
      },
    })) || [];
    
    return {
      success: true,
      data: parsedRows,
      maxid: data.maxid || '0',
      symbolPart: symbolPart || 'EUR',
      owner: owner || 'Dealer',
      timestamp: Date.now()
    };

  } catch (error) {
    if (error instanceof Error && error.name === 'TimeoutError') {
      console.warn('COT Table View data fetch timed out after 5 seconds');
    } else {
      console.error('Error fetching COT Table View data:', error);
    }
    return null;
  }
}

// SSR-specific function for data processing
export async function getCOTTableViewDataForSSR(
  symbolPart?: string,
  owner?: string,
  maxId?: string
): Promise<COTTableRow[] | null> {
  const result = await getCOTTableViewData(symbolPart, owner, maxId);
  return result?.data || null;
}
