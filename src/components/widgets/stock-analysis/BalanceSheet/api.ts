// Client-side API functions for Balance Sheet widget

export interface ApiBalanceSheetItem {
  isCategoryHeader?: boolean;
  Level2?: string;
  ID?: number;
  Level1?: string;
  Description?: string;
  Type?: string;
  values?: {
    [period: string]: number;
  };
  yoyGrowth?: {
    [period: string]: number;
  };
}

export interface ApiBalanceSheetResponse {
  success: boolean;
  symbol: string;
  type: string;
  headerDates: string[];
  data: ApiBalanceSheetItem[];
}

export interface ApiBalanceSheetApiResponse {
  success: boolean;
  data: ApiBalanceSheetResponse;
}

export interface BalanceSheetData {
  metric: string;
  category?: string;
  values: {
    [year: string]: number | null;
  };
  isSubItem?: boolean;
  isBold?: boolean;
}

// Transform API response to component format
export function transformApiBalanceSheetResponse(apiData: ApiBalanceSheetResponse): {
  data: BalanceSheetData[];
  years: string[];
} {
  const headerDates = apiData.headerDates || [];
  const apiItems = apiData.data || [];
  
  const transformedData: BalanceSheetData[] = [];
  let currentCategory: string | null = null;
  let previousItemWasHeader = false;
  
  apiItems.forEach((item, index) => {
    // Handle category headers (Assets, Liabilities, Totals)
    if (item.isCategoryHeader && item.Level2) {
      // Add spacer before new category (except first one)
      if (index > 0 && !previousItemWasHeader) {
        const spacerValues: { [key: string]: number | null } = {};
        headerDates.forEach(date => {
          spacerValues[date] = null;
        });
        transformedData.push({
          metric: '',
          category: 'spacer',
          values: spacerValues,
        });
      }
      
      // Add category header
      const headerValues: { [key: string]: number | null } = {};
      headerDates.forEach(date => {
        headerValues[date] = null;
      });
      transformedData.push({
        metric: item.Level2,
        category: 'header',
        values: headerValues,
        isBold: true,
      });
      
      currentCategory = item.Level2;
      previousItemWasHeader = true;
      return;
    }
    
    previousItemWasHeader = false;
    
    // Skip items without Description
    if (!item.Description) return;
    
    // Determine if this is a sub-item (indented) or bold (total/summary)
    // Typically, items with "Total" in name are bold, others are sub-items
    const isBold = item.Description.toLowerCase().includes('total') || 
                   item.Description.toLowerCase().includes('equity') ||
                   item.Description === 'Cash Short Term Investments';
    const isSubItem = !isBold;
    
    // Map values from API format to component format
    const values: { [key: string]: number | null } = {};
    headerDates.forEach(date => {
      values[date] = item.values?.[date] ?? null;
    });
    
    transformedData.push({
      metric: item.Description,
      category: currentCategory || undefined,
      values: values,
      isSubItem: isSubItem,
      isBold: isBold,
    });
  });
  
  return {
    data: transformedData,
    years: headerDates,
  };
}

// Fetch balance sheet data
export async function fetchBalanceSheet(
  symbol: string,
  CustomDashboardWidgetID: number = 123,
  TemplateName: string = 'Details'
): Promise<ApiBalanceSheetApiResponse | null> {
  try {
    console.log('📊 [Balance Sheet API] Fetching balance sheet for:', symbol);
    const response = await fetch('/api/pmt/get-balance-sheet', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ symbol, CustomDashboardWidgetID, TemplateName }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ [Balance Sheet API] HTTP error:', response.status, errorData.error);
      return null;
    }

    const result = await response.json();
    console.log('📊 [Balance Sheet API] Response received:', result);
    
    if (!result.success || !result.data) {
      console.error('❌ [Balance Sheet API] Unsuccessful response:', result);
      return null;
    }

    console.log('✅ [Balance Sheet API] Data extracted:', result.data);
    return result;
  } catch (error) {
    console.error('❌ [Balance Sheet API] Fetch error:', error);
    return null;
  }
}

