// Client-side API functions for Institutional Shareholders widget

export interface ApiInstitutionalShareholder {
  name: string;
  date: string; // YYYY-MM-DD format
  totalShares: number; // Percentage of total shares
  totalAssets: number;
  currentShares: number; // Number of shares held
  change: number; // Change in shares (can be positive or negative)
  change_p: number; // Change percentage (can be positive or negative)
}

export interface ApiInstitutionalShareholdersResponse {
  success: boolean;
  symbol: string;
  Fundamentals: {
    Holders: {
      Institutions: {
        [key: string]: ApiInstitutionalShareholder;
      };
    };
  };
}

export interface ApiShareholdersResponse {
  success: boolean;
  data: ApiInstitutionalShareholdersResponse;
}

export interface Shareholder {
  id: number;
  name: string;
  shares: number;
  value: number;
  percentOfShares: number;
  change: number;
  dateReported: string;
  flash?: boolean;
}

// Decode HTML entities (e.g., &#39; -> ')
export function decodeHtmlEntities(text: string): string {
  if (!text) return text;
  return text
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

// Transform API response to component format
export function transformApiShareholdersResponse(apiData: ApiInstitutionalShareholdersResponse): Shareholder[] {
  console.log('🔄 [Transform] Input data:', apiData);
  console.log('🔄 [Transform] Fundamentals:', apiData.Fundamentals);
  console.log('🔄 [Transform] Holders:', apiData.Fundamentals?.Holders);
  console.log('🔄 [Transform] Institutions:', apiData.Fundamentals?.Holders?.Institutions);
  
  const institutionsObject = apiData.Fundamentals?.Holders?.Institutions;
  if (!institutionsObject) {
    console.warn('⚠️ [Transform] No institutions object found');
    return [];
  }
  
  console.log('✅ [Transform] Found institutions object with', Object.keys(institutionsObject).length, 'entries');
  
  // Convert object with numeric keys to array
  const shareholdersArray = Object.entries(institutionsObject)
    .map(([key, institution], index) => {
      // Decode HTML entities in name
      const institutionName = decodeHtmlEntities(institution.name || '');
      
      // Calculate value (we don't have price, so we'll set it to 0 or calculate from totalAssets if needed)
      // For now, we'll set value to 0 since we don't have share price
      // If needed, we could calculate: value = currentShares * pricePerShare
      const value = 0; // TODO: Calculate if price data becomes available
      
      return {
        id: parseInt(key, 10) || index,
        name: institutionName,
        shares: institution.currentShares || 0,
        value: value,
        percentOfShares: institution.totalShares || 0,
        change: institution.change_p || 0, // Using change_p (percentage change)
        dateReported: institution.date || '',
      };
    })
    // Sort by percentOfShares descending (largest holders first)
    .sort((a, b) => {
      return b.percentOfShares - a.percentOfShares;
    });
  
  console.log('✅ [Transform] Transformed', shareholdersArray.length, 'shareholders');
  return shareholdersArray;
}

// Fetch institutional shareholders data
export async function fetchInstitutionalShareholders(symbol: string): Promise<ApiShareholdersResponse | null> {
  try {
    console.log('📊 [Institutional Shareholders API] Fetching shareholders for:', symbol);
    const response = await fetch('/api/pmt/get-institutional-shareholders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ symbol }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ [Institutional Shareholders API] HTTP error:', response.status, errorData.error);
      return null;
    }

    const result = await response.json();
    console.log('📊 [Institutional Shareholders API] Response received:', result);
    
    if (!result.success || !result.data) {
      console.error('❌ [Institutional Shareholders API] Unsuccessful response:', result);
      return null;
    }

    console.log('✅ [Institutional Shareholders API] Data extracted:', result.data);
    return result;
  } catch (error) {
    console.error('❌ [Institutional Shareholders API] Fetch error:', error);
    return null;
  }
}

