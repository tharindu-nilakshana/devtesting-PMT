// Client-side API functions for Smart Bias Tracker widget

export interface DateRange {
  weekFirstDate: string;
  formattedDate: string;
  currencyCount: number;
  lastUpdated: string;
}

export interface AvailableDateRangesResponse {
  success: boolean;
  data: DateRange[];
  error?: string;
}

export interface ApiCurrencyData {
  ID: number;
  CurrencyName: string;
  GDP_Sentiment: string;
  GDP_Scoring?: string | number;
  Inflation_Sentiment: string;
  Inflation_Scoring?: string | number;
  Consumer_Sentiment: string;
  Consumer_Scoring?: string | number;
  Service_PMI: string;
  Service_PMI_Scoring?: string | number;
  HousingStarts: string;
  HousingStarts_Scoring?: string | number;
  BuildingPermits: string;
  BuildingPermits_Scoring?: string | number;
  RetailSales: string;
  RetailSales_Scoring?: string | number;
  Manufactoring_PMI_Sentiment: string;
  Manufactoring_PMI_Scoring?: string | number;
  Fundemental_Overview: string;
  Hedgefunds_Positioning: string;
  Hedgefunds_Positioning_Scoring?: string | number;
  Retail_Positioning: string;
  Retail_Positioning_Scoring?: string | number;
  Monetary_Policy_Sentiment: string;
  Trend_Sentiment: string;
  Seasonality: string;
  BankSentiment: string;
  Bank_Overview: string;
  Overall_Sentiment: string;
  CreatedAt: string;
  WeekFirstDate: string;
}

export type BiasValue = 
  | "Very Bullish"
  | "Bullish" 
  | "Neutral"
  | "Bearish"
  | "Very Bearish"
  | "Weak Bullish"
  | "Weak Bearish"
  | "Uptrend"
  | "Downtrend"
  | "Range";

export interface CurrencyBias {
  [key: string]: BiasValue;
}

export interface CurrencyScoring {
  [key: string]: string | number;
}

export interface IndicatorData {
  sentiment: BiasValue;
  scoring?: string | number;
}

export interface CurrencyIndicatorData {
  [key: string]: IndicatorData;
}

export interface SmartBiasData {
  fundamentalData: Record<string, CurrencyBias>;
  fundamentalScoring: Record<string, CurrencyScoring>;
  bankResearch: Record<string, CurrencyBias>;
  bankResearchScoring: Record<string, CurrencyScoring>;
  monetaryPolicy: CurrencyBias;
  trend: CurrencyBias;
  seasonality: CurrencyBias;
  overall: CurrencyBias;
  fundamentalOverview: CurrencyBias; // Store Fundemental_Overview for each currency
}

// Helper function to normalize API sentiment values to component BiasValue format
function normalizeBiasValue(apiValue: string): BiasValue {
  if (!apiValue) return "Neutral";
  
  const lower = apiValue.toLowerCase().trim();
  
  // Map API values to component format
  if (lower === "very bullish") return "Very Bullish";
  if (lower === "bullish") return "Bullish";
  if (lower === "weak bullish") return "Weak Bullish";
  if (lower === "neutral") return "Neutral";
  if (lower === "weak bearish") return "Weak Bearish";
  if (lower === "bearish") return "Bearish";
  if (lower === "very bearish") return "Very Bearish";
  if (lower === "uptrend") return "Uptrend";
  if (lower === "downtrend") return "Downtrend";
  if (lower === "range") return "Range";
  
  return "Neutral";
}

// Transform API response to component data structure
export function transformApiResponseToSmartBiasData(apiData: ApiCurrencyData[]): SmartBiasData {
  const fundamentalData: Record<string, CurrencyBias> = {
    "Economic Growth": {},
    "Rising Prices": {},
    "Consumer Confidence": {},
    "Factory Activity": {},
    "Service Activity": {},
    "New Homes Started": {},
    "Building Permits": {},
    "Retail Sales": {},
  };

  const fundamentalScoring: Record<string, CurrencyScoring> = {
    "Economic Growth": {},
    "Rising Prices": {},
    "Consumer Confidence": {},
    "Factory Activity": {},
    "Service Activity": {},
    "New Homes Started": {},
    "Building Permits": {},
    "Retail Sales": {},
  };

  const bankResearch: Record<string, CurrencyBias> = {
    "Hedge Fund Positioning": {},
    "Retail Positioning": {},
  };

  const bankResearchScoring: Record<string, CurrencyScoring> = {
    "Hedge Fund Positioning": {},
    "Retail Positioning": {},
  };

  const monetaryPolicy: CurrencyBias = {};
  const trend: CurrencyBias = {};
  const seasonality: CurrencyBias = {};
  const overall: CurrencyBias = {};
  const fundamentalOverview: CurrencyBias = {};

  // Process each currency's data
  apiData.forEach((currencyData) => {
    const currency = currencyData.CurrencyName;
    
    // Debug: Log available fields to check for scoring
    if (currency === "USD") {
      console.log('🔍 [Smart Bias] API Data fields for USD:', Object.keys(currencyData));
      console.log('🔍 [Smart Bias] Sample scoring fields:', {
        GDP_Scoring: currencyData.GDP_Scoring,
        Inflation_Scoring: currencyData.Inflation_Scoring,
        Hedgefunds_Positioning_Scoring: currencyData.Hedgefunds_Positioning_Scoring,
      });
    }
    
    // Map fundamental data with sentiment and scoring
    fundamentalData["Economic Growth"][currency] = normalizeBiasValue(currencyData.GDP_Sentiment);
    if (currencyData.GDP_Scoring !== undefined && currencyData.GDP_Scoring !== null) {
      fundamentalScoring["Economic Growth"][currency] = currencyData.GDP_Scoring;
    }
    
    fundamentalData["Rising Prices"][currency] = normalizeBiasValue(currencyData.Inflation_Sentiment);
    if (currencyData.Inflation_Scoring !== undefined && currencyData.Inflation_Scoring !== null) {
      fundamentalScoring["Rising Prices"][currency] = currencyData.Inflation_Scoring;
    }
    
    fundamentalData["Consumer Confidence"][currency] = normalizeBiasValue(currencyData.Consumer_Sentiment);
    if (currencyData.Consumer_Scoring !== undefined && currencyData.Consumer_Scoring !== null) {
      fundamentalScoring["Consumer Confidence"][currency] = currencyData.Consumer_Scoring;
    }
    
    fundamentalData["Factory Activity"][currency] = normalizeBiasValue(currencyData.Manufactoring_PMI_Sentiment);
    if (currencyData.Manufactoring_PMI_Scoring !== undefined && currencyData.Manufactoring_PMI_Scoring !== null) {
      fundamentalScoring["Factory Activity"][currency] = currencyData.Manufactoring_PMI_Scoring;
    }
    
    fundamentalData["Service Activity"][currency] = normalizeBiasValue(currencyData.Service_PMI);
    if (currencyData.Service_PMI_Scoring !== undefined && currencyData.Service_PMI_Scoring !== null) {
      fundamentalScoring["Service Activity"][currency] = currencyData.Service_PMI_Scoring;
    }
    
    fundamentalData["New Homes Started"][currency] = normalizeBiasValue(currencyData.HousingStarts);
    if (currencyData.HousingStarts_Scoring !== undefined && currencyData.HousingStarts_Scoring !== null) {
      fundamentalScoring["New Homes Started"][currency] = currencyData.HousingStarts_Scoring;
    }
    
    fundamentalData["Building Permits"][currency] = normalizeBiasValue(currencyData.BuildingPermits);
    if (currencyData.BuildingPermits_Scoring !== undefined && currencyData.BuildingPermits_Scoring !== null) {
      fundamentalScoring["Building Permits"][currency] = currencyData.BuildingPermits_Scoring;
    }
    
    fundamentalData["Retail Sales"][currency] = normalizeBiasValue(currencyData.RetailSales);
    if (currencyData.RetailSales_Scoring !== undefined && currencyData.RetailSales_Scoring !== null) {
      fundamentalScoring["Retail Sales"][currency] = currencyData.RetailSales_Scoring;
    }
    
    // Map bank research with sentiment and scoring
    bankResearch["Hedge Fund Positioning"][currency] = normalizeBiasValue(currencyData.Hedgefunds_Positioning);
    if (currencyData.Hedgefunds_Positioning_Scoring !== undefined && currencyData.Hedgefunds_Positioning_Scoring !== null) {
      bankResearchScoring["Hedge Fund Positioning"][currency] = currencyData.Hedgefunds_Positioning_Scoring;
    }
    
    bankResearch["Retail Positioning"][currency] = normalizeBiasValue(currencyData.Retail_Positioning);
    if (currencyData.Retail_Positioning_Scoring !== undefined && currencyData.Retail_Positioning_Scoring !== null) {
      bankResearchScoring["Retail Positioning"][currency] = currencyData.Retail_Positioning_Scoring;
    }
    
    // Map other fields
    monetaryPolicy[currency] = normalizeBiasValue(currencyData.Monetary_Policy_Sentiment);
    trend[currency] = normalizeBiasValue(currencyData.Trend_Sentiment);
    seasonality[currency] = normalizeBiasValue(currencyData.Seasonality);
    overall[currency] = normalizeBiasValue(currencyData.Overall_Sentiment);
    fundamentalOverview[currency] = normalizeBiasValue(currencyData.Fundemental_Overview);
  });

  return {
    fundamentalData,
    fundamentalScoring,
    bankResearch,
    bankResearchScoring,
    monetaryPolicy,
    trend,
    seasonality,
    overall,
    fundamentalOverview,
  };
}

// Client-side function to fetch available date ranges
export async function fetchAvailableDateRanges(): Promise<AvailableDateRangesResponse> {
  try {
    const response = await fetch('/api/pmt/smart-bias-tracker-date-ranges', {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch date ranges: ${response.status}`);
    }

    const result = await response.json();
    return {
      success: result.success,
      data: result.data || [],
      error: result.error,
    };
  } catch (error) {
    console.error('Error fetching available date ranges:', error);
    return {
      success: false,
      data: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Client-side function to fetch Smart Bias Tracker data by date range
export async function fetchSmartBiasTrackerDataByDateRange(
  startDate: string,
  endDate: string
): Promise<ApiCurrencyData[] | null> {
  try {
    const response = await fetch('/api/pmt/smart-bias-tracker-date-range', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ startDate, endDate }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.warn('⚠️ [Smart Bias Tracker] API returned error:', response.status, errorData.error);
      return null;
    }

    const result = await response.json();
    if (!result.success) {
      console.warn('⚠️ [Smart Bias Tracker] API returned unsuccessful response:', result.error);
      return null;
    }

    return result.data || null;
  } catch (error) {
    console.warn('⚠️ [Smart Bias Tracker] Error fetching data:', error);
    return null;
  }
}

// Helper function to format week date range from weekFirstDate
export function formatWeekDateRange(weekFirstDate: string): string {
  try {
    const date = new Date(weekFirstDate);
    const nextWeek = new Date(date);
    nextWeek.setDate(date.getDate() + 6);
    
    const formatDate = (d: Date) => {
      const month = d.toLocaleString('en-US', { month: 'short' });
      const day = d.getDate();
      return `${month} ${day}`;
    };
    
    return `${formatDate(date)} - ${formatDate(nextWeek)}, ${date.getFullYear()}`;
  } catch (error) {
    console.error('Error formatting date range:', error);
    return weekFirstDate;
  }
}

// Helper function to get week date range (start and end dates)
export function getWeekDateRange(weekFirstDate: string): { startDate: string; endDate: string } {
  try {
    const startDate = new Date(weekFirstDate);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    
    const formatDate = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    
    return {
      startDate: formatDate(startDate),
      endDate: formatDate(endDate),
    };
  } catch (error) {
    console.error('Error getting week date range:', error);
    return {
      startDate: weekFirstDate,
      endDate: weekFirstDate,
    };
  }
}

// Summary API interfaces
export interface SummaryData {
  Overview: string;
  WeekFirstDate: string;
  CreatedAt: string;
}

export interface ParsedSummary {
  overview: string;
  keyEvents: Array<{
    day: string;
    event: string;
    impact?: "high" | "medium" | "low";
  }>;
}

// Helper function to parse Overview HTML and extract Key Risk Events
export function parseSummaryContent(overview: string): ParsedSummary {
  // Decode HTML entities first
  let decodedOverview = overview
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  const keyEvents: Array<{ day: string; event: string; impact?: "high" | "medium" | "low" }> = [];
  
  // Find the "Key Risk Events for the Week Ahead" section
  const keyEventsMatch = decodedOverview.match(
    /<strong[^>]*>Key Risk Events for the Week Ahead<\/strong>\s*<\/p>\s*<ul>(.*?)<\/ul>/is
  );
  
  if (keyEventsMatch) {
    // Extract the list items
    const listItems = keyEventsMatch[1].match(/<li>(.*?)<\/li>/gis);
    if (listItems) {
      keyEvents.push(...listItems.map(item => {
        // Remove HTML tags
        let cleanItem = item
          .replace(/<li>/g, '')
          .replace(/<\/li>/g, '')
          .replace(/<strong>/g, '')
          .replace(/<\/strong>/g, '')
          .trim();
        
        // Parse day and event (format: "Monday: Event Description")
        const colonIndex = cleanItem.indexOf(':');
        let day = '';
        let event = cleanItem;
        
        if (colonIndex > 0) {
          day = cleanItem.substring(0, colonIndex).trim();
          event = cleanItem.substring(colonIndex + 1).trim();
        }
        
        // Try to infer impact from event content (optional, can be enhanced)
        let impact: "high" | "medium" | "low" | undefined = undefined;
        const eventLower = event.toLowerCase();
        if (eventLower.includes('fomc') || eventLower.includes('fed') || eventLower.includes('cpi') || 
            eventLower.includes('nfp') || eventLower.includes('jobs') || eventLower.includes('employment')) {
          impact = 'high';
        } else if (eventLower.includes('retail') || eventLower.includes('sales') || 
                   eventLower.includes('claims') || eventLower.includes('sentiment')) {
          impact = 'medium';
        } else {
          impact = 'low';
        }
        
        return { day, event, impact };
      }));
    }
    
    // Remove the Key Risk Events section from the overview
    decodedOverview = decodedOverview.replace(
      /<strong[^>]*>Key Risk Events for the Week Ahead<\/strong>\s*<\/p>\s*<ul>.*?<\/ul>\s*<p>/is,
      '</p><p>'
    );
  }
  
  return {
    overview: decodedOverview,
    keyEvents,
  };
}

export interface SummaryOverviewResponse {
  success: boolean;
  data: {
    overview: string;
    weekFirstDate: string;
    createdAt: string;
  };
  summary: {
    currencyName: string;
    hasOverview: boolean;
    timeOffset: string;
    latestWeekFirstDate: string;
  };
}

export interface SummaryDataResponse {
  success: boolean;
  data: SummaryData[];
  summary: {
    currencyName: string;
    totalRecords: number;
    timeOffset: string;
    latestWeekFirstDate: string;
  };
}

// Client-side function to fetch summary data by date range
export async function fetchSmartBiasSummaryByDateRange(
  currencyName: string,
  startDate: string,
  endDate: string
): Promise<SummaryData | null> {
  try {
    const response = await fetch('/api/pmt/smart-bias-summary-date-range', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ currencyName, startDate, endDate }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.warn('⚠️ [Smart Bias Summary] API returned error:', response.status, errorData.error);
      return null;
    }

    const result = await response.json();
    if (!result.success || !result.data) {
      console.warn('⚠️ [Smart Bias Summary] API returned unsuccessful response:', result.error);
      return null;
    }

    // The API route wraps the external API response in result.data
    // The external API response has its own data array
    const externalResponse = result.data;
    console.log('📊 [Smart Bias Summary] External API response:', externalResponse);
    
    if (!externalResponse.success || !externalResponse.data || externalResponse.data.length === 0) {
      console.warn('⚠️ [Smart Bias Summary] No summary data available');
      return null;
    }

    // Find the summary for the selected week (should match the weekFirstDate)
    // Return the first one if multiple, or try to match by date
    const summary = externalResponse.data[0];
    console.log('📊 [Smart Bias Summary] Returning summary:', summary?.Overview?.substring(0, 100) + '...');
    return summary || null;
  } catch (error) {
    console.warn('⚠️ [Smart Bias Summary] Error fetching summary:', error);
    return null;
  }
}

// Client-side function to fetch summary overview (latest)
export async function fetchSmartBiasSummaryOverview(
  currencyName: string
): Promise<SummaryOverviewResponse | null> {
  try {
    const response = await fetch('/api/pmt/smart-bias-summary-overview', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ currencyName }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.warn('⚠️ [Smart Bias Summary Overview] API returned error:', response.status, errorData.error);
      return null;
    }

    const result = await response.json();
    if (!result.success) {
      console.warn('⚠️ [Smart Bias Summary Overview] API returned unsuccessful response:', result.error);
      return null;
    }

    return result.data || null;
  } catch (error) {
    console.warn('⚠️ [Smart Bias Summary Overview] Error fetching summary:', error);
    return null;
  }
}

