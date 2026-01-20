// Client-side API functions for Event Trades Scenarios widget

export interface ApiEventTrade {
  id: number;
  headline: string;
  utc_datetime: string;
  datetime: string;
  event: string; // HTML content
}

export interface ApiEventTradesResponse {
  success: boolean;
  data: ApiEventTrade[];
}

export interface EventScenario {
  id: string;
  date: string;
  time: string;
  event: string;
  currency: string;
  impact: "high" | "medium" | "low";
  actual?: string;
  high?: string;
  forecast?: string;
  low?: string;
  previous?: string;
  description: string;
  strengtheningScenario: {
    description: string;
    metrics: string[];
    tradePairs: string;
  };
  weakeningScenario: {
    description: string;
    metrics: string[];
    tradePairs: string;
  };
  additionalNotes?: string;
}

// Extract economic indicator values from text
function extractEconomicData(text: string): {
  actual?: string;
  forecast?: string;
  previous?: string;
  high?: string;
  low?: string;
} {
  const result: any = {};
  
  // Pattern 1: "increased X percent ... up from Y percent ... expectations of Z percent"
  const pattern1 = /(?:increased|rose|climbed|fell|dropped)\s+([\d.]+)\s*(?:percent|%|bps).*?(?:up from|down from|from)\s+([\d.]+)\s*(?:percent|%|bps).*?(?:expectations|forecast|expected).*?\s+([\d.]+)\s*(?:percent|%|bps)/i;
  const match1 = text.match(pattern1);
  if (match1) {
    result.actual = match1[1] + '%';
    result.previous = match1[2] + '%';
    result.forecast = match1[3] + '%';
  }
  
  // Pattern 2: For rate decisions - "to X% ... held at Y%"
  const pattern2 = /(?:to|at)\s+([\d.]+)%.*?(?:held at|current|previous)\s+([\d.]+)%/i;
  const match2 = text.match(pattern2);
  if (match2 && !result.forecast) {
    result.forecast = match2[1] + '%';
    result.previous = match2[2] + '%';
  }
  
  // Pattern 3: Direct mention - "actual X, forecast Y, previous Z"
  const actualMatch = text.match(/actual[:\s]+([\d.]+)\s*(?:%|percent|bps)/i);
  if (actualMatch) result.actual = actualMatch[1] + '%';
  
  const forecastMatch = text.match(/forecast[:\s]+([\d.]+)\s*(?:%|percent|bps)/i);
  if (forecastMatch && !result.forecast) result.forecast = forecastMatch[1] + '%';
  
  const previousMatch = text.match(/previous[:\s]+([\d.]+)\s*(?:%|percent|bps)/i);
  if (previousMatch && !result.previous) result.previous = previousMatch[1] + '%';
  
  // Pattern 4: For high/low ranges in strengthening/weakening scenarios
  const highMatch = text.match(/at\s+([\d.]+)\s*(?:%|percent|K|M)\s+or higher/i);
  if (highMatch) result.high = highMatch[1];
  
  const lowMatch = text.match(/at\s+([\d.]+)\s*(?:%|percent|K|M)\s+or lower/i);
  if (lowMatch) result.low = lowMatch[1];
  
  return result;
}

// Parse HTML content to extract description and scenarios
function parseEventContent(htmlContent: string): {
  description: string;
  strengtheningDescription: string;
  strengtheningMetrics: string[];
  strengtheningTradePairs: string;
  weakeningDescription: string;
  weakeningMetrics: string[];
  weakeningTradePairs: string;
  additionalNotes?: string;
  economicData: {
    actual?: string;
    forecast?: string;
    previous?: string;
    high?: string;
    low?: string;
  };
} {
  // Remove HTML tags but keep structure
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = htmlContent;
  
  const fullText = tempDiv.textContent || tempDiv.innerText || '';
  
  // Split by scenario headers
  const strengtheningMarker = 'Strengthening Scenario';
  const weakeningMarker = 'Weakening Scenario';
  
  const strengtheningIndex = fullText.indexOf(strengtheningMarker);
  const weakeningIndex = fullText.indexOf(weakeningMarker);
  
  // Extract main description (before Strengthening Scenario)
  const description = strengtheningIndex > 0 
    ? fullText.substring(0, strengtheningIndex).trim()
    : fullText.trim();
  
  // Extract strengthening scenario content
  let strengtheningDescription = '';
  let strengtheningMetrics: string[] = [];
  let strengtheningTradePairs = '';
  
  if (strengtheningIndex > 0 && weakeningIndex > 0) {
    const strengtheningContent = fullText.substring(strengtheningIndex + strengtheningMarker.length, weakeningIndex).trim();
    
    // Extract trade pairs
    const pairsMatch = strengtheningContent.match(/Possible Pairs:([^]*?)(?=\n|$)/);
    strengtheningTradePairs = pairsMatch ? pairsMatch[0].trim() : '';
    
    // Description is everything before metrics or pairs
    const beforePairs = pairsMatch 
      ? strengtheningContent.substring(0, strengtheningContent.indexOf('Possible Pairs:')).trim()
      : strengtheningContent.trim();
    
    // Split into lines to find description and metrics
    const lines = beforePairs.split('\n').filter(l => l.trim());
    if (lines.length > 0) {
      // First line(s) are description, lines that look like metrics go into metrics array
      const descLines = [];
      const metricLines = [];
      
      for (const line of lines) {
        // If line contains "at", "or", "%", looks like a metric
        if (line.includes(' at ') || line.includes(' or ') || line.includes('%') || line.match(/^[A-Z]/)) {
          metricLines.push(line.trim());
        } else {
          descLines.push(line.trim());
        }
      }
      
      strengtheningDescription = descLines.join(' ');
      strengtheningMetrics = metricLines.length > 0 ? metricLines : [beforePairs];
    }
  }
  
  // Extract weakening scenario content
  let weakeningDescription = '';
  let weakeningMetrics: string[] = [];
  let weakeningTradePairs = '';
  
  if (weakeningIndex > 0) {
    const weakeningContent = fullText.substring(weakeningIndex + weakeningMarker.length).trim();
    
    // Extract trade pairs
    const pairsMatch = weakeningContent.match(/Possible Pairs:([^]*?)(?=Don't forget|$)/);
    weakeningTradePairs = pairsMatch ? pairsMatch[0].trim() : '';
    
    // Extract additional notes
    let additionalNotes: string | undefined;
    const notesMatch = fullText.match(/Don't forget to monitor([^]*?)$/);
    if (notesMatch) {
      additionalNotes = notesMatch[0].trim();
    }
    
    // Description is everything before metrics or pairs
    const beforePairs = pairsMatch 
      ? weakeningContent.substring(0, weakeningContent.indexOf('Possible Pairs:')).trim()
      : weakeningContent.replace(/Don't forget.*$/s, '').trim();
    
    // Split into lines
    const lines = beforePairs.split('\n').filter(l => l.trim());
    if (lines.length > 0) {
      const descLines = [];
      const metricLines = [];
      
      for (const line of lines) {
        if (line.includes(' at ') || line.includes(' or ') || line.includes('%') || line.match(/^[A-Z]/)) {
          metricLines.push(line.trim());
        } else {
          descLines.push(line.trim());
        }
      }
      
      weakeningDescription = descLines.join(' ');
      weakeningMetrics = metricLines.length > 0 ? metricLines : [beforePairs];
    }
  }
  
  // Extract additional notes
  const notesMatch = fullText.match(/Don't forget to monitor([^]*?)$/);
  const additionalNotes = notesMatch ? notesMatch[0].trim() : undefined;
  
  // Extract economic data from the entire text
  const economicData = extractEconomicData(fullText);
  
  return {
    description,
    strengtheningDescription,
    strengtheningMetrics,
    strengtheningTradePairs,
    weakeningDescription,
    weakeningMetrics,
    weakeningTradePairs,
    additionalNotes,
    economicData
  };
}

// Extract currency from headline
function extractCurrency(headline: string): string {
  const currencyMap: Record<string, string> = {
    'rbnz': 'NZD',
    'rba': 'AUD',
    'boe': 'GBP',
    'bank of england': 'GBP',
    'ecb': 'EUR',
    'eurozone': 'EUR',
    'fed': 'USD',
    'fomc': 'USD',
    'nonfarm': 'USD',
    'tokyo': 'JPY',
    'boj': 'JPY',
    'japan': 'JPY',
    'us ': 'USD',
    'cad': 'CAD',
    'canada': 'CAD',
    'ism': 'USD',
  };
  
  const lowerHeadline = headline.toLowerCase();
  for (const [key, currency] of Object.entries(currencyMap)) {
    if (lowerHeadline.includes(key)) {
      return currency;
    }
  }
  
  return 'USD'; // Default
}

// Format date from API format to display format
function formatDate(datetimeStr: string): { date: string; time: string } {
  // Input format: "26.11.2025 06:30"
  const [datePart, timePart] = datetimeStr.split(' ');
  const [day, month, year] = datePart.split('.');
  
  const date = new Date(`${year}-${month}-${day}T${timePart || '00:00'}:00`);
  
  const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
  const monthName = date.toLocaleDateString('en-US', { month: 'long' });
  const dayNum = date.getDate();
  
  const formattedDate = `${dayName}, ${monthName} ${dayNum}, ${year}`;
  const formattedTime = timePart || '00:00';
  
  return {
    date: formattedDate,
    time: formattedTime
  };
}

// Transform API response to component format
export function transformApiEventTradesResponse(apiData: ApiEventTrade[]): EventScenario[] {
  return apiData.map((trade) => {
    const parsed = parseEventContent(trade.event);
    const { date, time } = formatDate(trade.datetime);
    const currency = extractCurrency(trade.headline);
    
    return {
      id: trade.id.toString(),
      date,
      time,
      event: trade.headline,
      currency,
      impact: 'high' as const, // API doesn't provide this, defaulting to high
      description: parsed.description,
      // Economic indicators extracted from HTML
      actual: parsed.economicData.actual,
      forecast: parsed.economicData.forecast,
      previous: parsed.economicData.previous,
      high: parsed.economicData.high,
      low: parsed.economicData.low,
      strengtheningScenario: {
        description: parsed.strengtheningDescription,
        metrics: parsed.strengtheningMetrics,
        tradePairs: parsed.strengtheningTradePairs
      },
      weakeningScenario: {
        description: parsed.weakeningDescription,
        metrics: parsed.weakeningMetrics,
        tradePairs: parsed.weakeningTradePairs
      },
      additionalNotes: parsed.additionalNotes
    };
  });
}

// Fetch event trades data
export async function fetchEventTrades(): Promise<ApiEventTradesResponse | null> {
  try {
    console.log('📡 [Event Trades API] Fetching event trades...');
    const response = await fetch('/api/pmt/get-all-trades', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ [Event Trades API] HTTP error:', response.status, errorData.error);
      return null;
    }

    const result = await response.json();
    console.log('📡 [Event Trades API] Response received:', result);
    
    if (!result.success || !result.data) {
      console.error('❌ [Event Trades API] Unsuccessful response:', result);
      return null;
    }

    return result.data;
  } catch (error) {
    console.error('❌ [Event Trades API] Fetch error:', error);
    return null;
  }
}

