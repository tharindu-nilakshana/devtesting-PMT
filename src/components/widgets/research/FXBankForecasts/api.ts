// Client-side API functions for FX Bank Forecasts widget

export interface ApiBankForecast {
  BankTargetID: number;
  BankName: string;
  Currency: string;
  Date1: string;
  Date2: string;
  Date3: string;
  Date4: string;
  Date5: string;
  Date6: string;
  Date7: string;
  Date8: string;
  Date9: string;
  Date10: string;
  Date1Value: number | null;
  Date2Value: number | null;
  Date3Value: number | null;
  Date4Value: number | null;
  Date5Value: number | null;
  Date6Value: number | null;
  Date7Value: number | null;
  Date8Value: number | null;
  Date9Value: number | null;
  Date10Value: number | null;
}

export interface ApiResponse {
  success: boolean;
  symbol: string;
  count: number;
  data: ApiBankForecast[];
}

export interface BankForecast {
  bank: string;
  logo: string;
  color: string;
  lastRevised: string;
  forecasts: {
    quarter: string;
    value: number | null;
  }[];
}

// Map bank names to logos and colors
const bankMetadata: Record<string, { logo: string; color: string }> = {
  "Bank of America": { logo: "BAC", color: "#8B5CF6" },
  "TD Bank": { logo: "TD", color: "#3B82F6" },
  "Danske": { logo: "DAN", color: "#F97316" },
  "Societe Generale": { logo: "SG", color: "#10B981" },
  "Westpac": { logo: "WBC", color: "#EF4444" },
  "SEB": { logo: "SEB", color: "#6366F1" },
  "CIBC": { logo: "CIBC", color: "#EC4899" },
  "Scotiabank": { logo: "BNS", color: "#F59E0B" },
  "Credit Agricole CIB": { logo: "CA", color: "#14B8A6" },
  "BMO": { logo: "BMO", color: "#EF4444" },
  "ABN-AMRO": { logo: "ABN", color: "#10B981" },
  "Nordea": { logo: "NDA", color: "#3B82F6" },
  "ING": { logo: "ING", color: "#F97316" },
  "ANZ": { logo: "ANZ", color: "#3B82F6" },
  "Goldman Sachs": { logo: "GS", color: "#6366F1" },
  "MUFG": { logo: "MUFG", color: "#059669" },
  "HSBC": { logo: "HSBC", color: "#DC2626" },
  "Morgan Stanley": { logo: "MS", color: "#8B5CF6" },
  "UOB": { logo: "UOB", color: "#10B981" },
  "RBC": { logo: "RBC", color: "#EF4444" },
  "Average": { logo: "AVG", color: "#6B7280" },
  "MAX": { logo: "MAX", color: "#10B981" },
  "MIN": { logo: "MIN", color: "#EF4444" },
};

// Generate logo from bank name if not in metadata
const getBankLogo = (bankName: string): string => {
  const metadata = bankMetadata[bankName];
  if (metadata) return metadata.logo;
  
  // Generate logo from first letters of words
  const words = bankName.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return bankName.substring(0, 3).toUpperCase();
};

// Generate color from bank name if not in metadata
const getBankColor = (bankName: string): string => {
  const metadata = bankMetadata[bankName];
  if (metadata) return metadata.color;
  
  // Generate a consistent color based on bank name hash
  const colors = [
    "#10B981", "#3B82F6", "#EF4444", "#F59E0B", "#8B5CF6",
    "#EC4899", "#14B8A6", "#F97316", "#6366F1", "#DC2626",
    "#059669", "#6B7280"
  ];
  let hash = 0;
  for (let i = 0; i < bankName.length; i++) {
    hash = bankName.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

// Parse date string like "25 Dec" to quarter format
const parseDateToQuarter = (dateStr: string): string | null => {
  if (!dateStr || dateStr.trim() === "") return null;
  
  // Format: "25 Dec" -> "Q4 '25"
  const parts = dateStr.trim().split(/\s+/);
  if (parts.length !== 2) return null;
  
  const [day, month] = parts;
  const year = day.length === 2 ? `'${day}` : day;
  
  // Map month to quarter
  const monthToQuarter: Record<string, string> = {
    "Dec": "Q4",
    "Mar": "Q1",
    "Jun": "Q2",
    "Sep": "Q3",
  };
  
  const quarter = monthToQuarter[month];
  if (!quarter) return null;
  
  return `${quarter} ${year}`;
};

// Parse date string to extract quarter info for UI
export interface QuarterInfo {
  label: string; // "Q4"
  subLabel: string; // "'25"
  month: string; // "DEC"
  quarterStr: string; // "Q4 '25"
  sortKey: number; // For sorting (year * 4 + quarter number)
}

export function parseDateToQuarterInfo(dateStr: string): QuarterInfo | null {
  if (!dateStr || dateStr.trim() === "") return null;
  
  const parts = dateStr.trim().split(/\s+/);
  if (parts.length !== 2) return null;
  
  const [day, month] = parts;
  const year = parseInt(day.length === 2 ? `20${day}` : day);
  
  // Map month to quarter
  const monthToQuarter: Record<string, { label: string; quarterNum: number }> = {
    "Dec": { label: "Q4", quarterNum: 4 },
    "Mar": { label: "Q1", quarterNum: 1 },
    "Jun": { label: "Q2", quarterNum: 2 },
    "Sep": { label: "Q3", quarterNum: 3 },
  };
  
  const quarterInfo = monthToQuarter[month];
  if (!quarterInfo) return null;
  
  const subLabel = day.length === 2 ? `'${day}` : day;
  const sortKey = year * 4 + quarterInfo.quarterNum;
  
  return {
    label: quarterInfo.label,
    subLabel: subLabel,
    month: month.toUpperCase(),
    quarterStr: `${quarterInfo.label} ${subLabel}`,
    sortKey: sortKey,
  };
}

// Extract unique quarters from API data
export function extractQuartersFromApiData(apiData: ApiBankForecast[]): QuarterInfo[] {
  if (!apiData || apiData.length === 0) return [];
  
  // Get dates from first bank (all banks should have same date structure)
  const firstBank = apiData[0];
  const dates = [
    firstBank.Date1,
    firstBank.Date2,
    firstBank.Date3,
    firstBank.Date4,
    firstBank.Date5,
    firstBank.Date6,
    firstBank.Date7,
    firstBank.Date8,
    firstBank.Date9,
    firstBank.Date10,
  ].filter(date => date && date.trim() !== "");
  
  // Parse and deduplicate quarters
  const quarterMap = new Map<string, QuarterInfo>();
  
  dates.forEach(date => {
    const quarterInfo = parseDateToQuarterInfo(date);
    if (quarterInfo) {
      quarterMap.set(quarterInfo.quarterStr, quarterInfo);
    }
  });
  
  // Sort by sortKey (chronologically)
  const quarters = Array.from(quarterMap.values()).sort((a, b) => a.sortKey - b.sortKey);
  
  return quarters;
}

// Transform API response to component format
export function transformApiResponse(apiData: ApiBankForecast[]): BankForecast[] {
  // Filter out special entries like "Average", "MAX", "MIN" if needed
  // For now, we'll include them but you can filter them out if desired
  const filteredData = apiData.filter(bank => {
    const name = bank.BankName.trim();
    // Optionally filter out Average, MAX, MIN
    // return name !== "Average" && name !== "MAX" && name !== "MIN";
    return true; // Include all for now
  });

  return filteredData.map((bank) => {
    const bankName = bank.BankName.trim();
    
    // Extract forecasts from Date1-Date10
    const forecasts = [
      { date: bank.Date1, value: bank.Date1Value },
      { date: bank.Date2, value: bank.Date2Value },
      { date: bank.Date3, value: bank.Date3Value },
      { date: bank.Date4, value: bank.Date4Value },
      { date: bank.Date5, value: bank.Date5Value },
      { date: bank.Date6, value: bank.Date6Value },
      { date: bank.Date7, value: bank.Date7Value },
      { date: bank.Date8, value: bank.Date8Value },
      { date: bank.Date9, value: bank.Date9Value },
      { date: bank.Date10, value: bank.Date10Value },
    ]
      .map(({ date, value }) => ({
        quarter: parseDateToQuarter(date) || "",
        value: value,
      }))
      .filter(f => f.quarter !== ""); // Remove invalid quarters

    // Get last revised date (use Date1 as it's typically the earliest/most recent)
    const lastRevised = bank.Date1 ? formatLastRevised(bank.Date1) : "";

    return {
      bank: bankName,
      logo: getBankLogo(bankName),
      color: getBankColor(bankName),
      lastRevised: lastRevised,
      forecasts: forecasts,
    };
  });
}

// Format date like "25 Dec" to "Dec 25" or similar format
function formatLastRevised(dateStr: string): string {
  if (!dateStr || dateStr.trim() === "") return "";
  
  const parts = dateStr.trim().split(/\s+/);
  if (parts.length !== 2) return dateStr;
  
  const [day, month] = parts;
  return `${month} ${day}`;
}

// Convert currency pair format (EUR/USD -> EURUSD)
export function formatSymbolForApi(pair: string): string {
  return pair.replace("/", "").toUpperCase();
}

// Fetch bank forecasts data
export async function fetchBankForecasts(symbol: string): Promise<ApiResponse | null> {
  try {
    const response = await fetch('/api/pmt/get-bank-table-data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ Symbol: symbol }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.warn('⚠️ [FX Bank Forecasts] API returned error:', response.status, errorData.error);
      return null;
    }

    const result = await response.json();
    if (!result.success || !result.data) {
      console.warn('⚠️ [FX Bank Forecasts] API returned unsuccessful response:', result);
      return null;
    }

    return result.data;
  } catch (error) {
    console.warn('⚠️ [FX Bank Forecasts] Error fetching bank forecasts:', error);
    return null;
  }
}

