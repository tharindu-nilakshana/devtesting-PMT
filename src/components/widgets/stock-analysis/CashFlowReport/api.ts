// Client-side API functions for Cash Flow Report widget

export interface ApiCashFlowItem {
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

export interface ApiCashFlowResponse {
  success: boolean;
  symbol: string;
  type: string;
  headerDates: string[];
  data: ApiCashFlowItem[];
}

export interface ApiCashFlowApiResponse {
  success: boolean;
  data: ApiCashFlowResponse;
}

export interface CashFlowRow {
  metric: string;
  values: {
    [year: string]: number | null;
  };
  category?: 'header' | 'spacer' | 'data';
  isBold?: boolean;
  indent?: boolean;
}

// Transform API response to component format
export function transformApiCashFlowResponse(apiData: ApiCashFlowResponse): {
  data: CashFlowRow[];
  years: string[];
} {
  const headerDates = apiData.headerDates || [];
  const apiItems = apiData.data || [];
  
  const transformedData: CashFlowRow[] = [];
  let currentCategory: string | null = null;
  let previousItemWasHeader = false;
  
  apiItems.forEach((item, index) => {
    // Handle category headers (Cash, Operating Activities, Investing Activities, etc.)
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
    const descriptionLower = item.Description.toLowerCase();
    const isBold = descriptionLower.includes('net cash') || 
                   descriptionLower.includes('net change') ||
                   descriptionLower.includes('cash at end') ||
                   descriptionLower.includes('free cash flow') ||
                   descriptionLower.includes('net income');
    
    // Items that should be indented (sub-items under categories)
    const shouldIndent = !isBold && (
      descriptionLower.includes('depreciation') ||
      descriptionLower.includes('amortization') ||
      descriptionLower.includes('deferred') ||
      descriptionLower.includes('stock based') ||
      descriptionLower.includes('compensation') ||
      descriptionLower.includes('working capital') ||
      descriptionLower.includes('receivable') ||
      descriptionLower.includes('inventory') ||
      descriptionLower.includes('payable') ||
      descriptionLower.includes('capex') ||
      descriptionLower.includes('acquisition') ||
      descriptionLower.includes('purchase') ||
      descriptionLower.includes('sale') ||
      descriptionLower.includes('maturity') ||
      descriptionLower.includes('debt') ||
      descriptionLower.includes('repurchase') ||
      descriptionLower.includes('dividend') ||
      descriptionLower.includes('interest') ||
      descriptionLower.includes('other')
    );
    
    // Map values from API format to component format
    const values: { [key: string]: number | null } = {};
    headerDates.forEach(date => {
      values[date] = item.values?.[date] ?? null;
    });
    
    transformedData.push({
      metric: item.Description,
      category: 'data',
      values: values,
      isBold: isBold,
      indent: shouldIndent,
    });
  });
  
  return {
    data: transformedData,
    years: headerDates,
  };
}

// Fetch cash flow report data
export async function fetchCashFlowReport(
  symbol: string,
  CustomDashboardWidgetID: number = 123,
  TemplateName: string = 'Details'
): Promise<ApiCashFlowApiResponse | null> {
  try {
    console.log('📊 [Cash Flow Report API] Fetching cash flow for:', symbol);
    const response = await fetch('/api/pmt/get-cash-flow-report', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ symbol, CustomDashboardWidgetID, TemplateName }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ [Cash Flow Report API] HTTP error:', response.status, errorData.error);
      return null;
    }

    const result = await response.json();
    console.log('📊 [Cash Flow Report API] Response received:', result);
    
    if (!result.success || !result.data) {
      console.error('❌ [Cash Flow Report API] Unsuccessful response:', result);
      return null;
    }

    console.log('✅ [Cash Flow Report API] Data extracted:', result.data);
    return result;
  } catch (error) {
    console.error('❌ [Cash Flow Report API] Fetch error:', error);
    return null;
  }
}

