// Client-side API functions for Income Statement widget

export interface ApiIncomeStatementItem {
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

export interface ApiIncomeStatementResponse {
  success: boolean;
  symbol: string;
  type: string;
  headerDates: string[];
  data: ApiIncomeStatementItem[];
}

export interface ApiIncomeStatementApiResponse {
  success: boolean;
  data: ApiIncomeStatementResponse;
}

export interface IncomeRow {
  metric: string;
  values: {
    [year: string]: number | null;
  };
  category?: 'header' | 'spacer' | 'data';
  isBold?: boolean;
  indent?: boolean;
}

// Transform API response to component format
export function transformApiIncomeStatementResponse(apiData: ApiIncomeStatementResponse): {
  data: IncomeRow[];
  years: string[];
} {
  const headerDates = apiData.headerDates || [];
  const apiItems = apiData.data || [];
  
  const transformedData: IncomeRow[] = [];
  let currentCategory: string | null = null;
  let previousItemWasHeader = false;
  
  apiItems.forEach((item, index) => {
    // Handle category headers (Revenue, Expenses, Income, etc.)
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
    // Typically, items with "Total" in name are bold, others might be indented
    const descriptionLower = item.Description.toLowerCase();
    const isBold = descriptionLower.includes('total') || 
                   descriptionLower.includes('revenue') ||
                   descriptionLower.includes('income') ||
                   descriptionLower.includes('profit') ||
                   descriptionLower.includes('eps') ||
                   descriptionLower.includes('earnings per share');
    
    // Items that should be indented (sub-items under categories)
    const shouldIndent = !isBold && (
      descriptionLower.includes('research') ||
      descriptionLower.includes('development') ||
      descriptionLower.includes('sales') ||
      descriptionLower.includes('general') ||
      descriptionLower.includes('admin') ||
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

// Fetch income statement data
export async function fetchIncomeStatement(
  symbol: string,
  CustomDashboardWidgetID: number = 123,
  TemplateName: string = 'Details'
): Promise<ApiIncomeStatementApiResponse | null> {
  try {
    console.log('📊 [Income Statement API] Fetching income statement for:', symbol);
    const response = await fetch('/api/pmt/get-income-statement', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ symbol, CustomDashboardWidgetID, TemplateName }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ [Income Statement API] HTTP error:', response.status, errorData.error);
      return null;
    }

    const result = await response.json();
    console.log('📊 [Income Statement API] Response received:', result);
    
    if (!result.success || !result.data) {
      console.error('❌ [Income Statement API] Unsuccessful response:', result);
      return null;
    }

    console.log('✅ [Income Statement API] Data extracted:', result.data);
    return result;
  } catch (error) {
    console.error('❌ [Income Statement API] Fetch error:', error);
    return null;
  }
}

