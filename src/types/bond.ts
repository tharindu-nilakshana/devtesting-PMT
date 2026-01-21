// API Request types
export interface BondYieldsRequest {
  Symbol: string;
  startDate: string;     // Format: 'YYYY-MM-DD'
  endDate: string;       // Format: 'YYYY-MM-DD'
  limit: number;
  offset: number;
}

// API Response types - actual fields from API
export interface BondYieldDataPoint {
  ID: number;
  Symbol: string;
  Date: string;          // 'YYYY-MM-DD'
  Open: string;          // Opening yield as string
  High: string;          // High yield as string
  Low: string;           // Low yield as string
  Close: string;         // Closing yield as string (main value)
  AddedOn?: string;
}

export interface BondYieldsResponse {
  status: string;
  data: BondYieldDataPoint[];
  count: number;
  total: number;
  pagination: {
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

// Chart data format for TradingView Lightweight Charts
export interface ChartDataPoint {
  time: string;          // 'YYYY-MM-DD' format for LineData
  value: number;
}

// Widget stats
export interface BondStats {
  current: number;
  high: number;
  low: number;
  change: number;
  changePercent: number;
  roc: number;           // Rate of Change
}

// Widget state types
export type BondDataStatus = 'idle' | 'loading' | 'success' | 'error';

// Time range presets
export type TimeRangePreset = '1D' | '1W' | '1M' | '3M' | '6M' | '1Y' | 'YTD' | 'ALL';

export const TIME_RANGE_PRESETS: { value: TimeRangePreset; label: string }[] = [
  { value: '1D', label: '1D' },
  { value: '1W', label: '1W' },
  { value: '1M', label: '1M' },
  { value: '3M', label: '3M' },
  { value: '6M', label: '6M' },
  { value: '1Y', label: '1Y' },
  { value: 'YTD', label: 'YTD' },
  { value: 'ALL', label: 'ALL' },
];

// Bond symbol interface
export interface BondSymbol {
  id: string;
  name: string;
  country: string;
  maturity: string;
}

// All available bond symbols
export const BOND_SYMBOLS: BondSymbol[] = [
  // Australia
  { id: 'GACGB1Y:IND', name: 'Australia 1Y', country: 'Australia', maturity: '1Y' },
  { id: 'GACGB2Y:IND', name: 'Australia 2Y', country: 'Australia', maturity: '2Y' },
  { id: 'GACGB3Y:IND', name: 'Australia 3Y', country: 'Australia', maturity: '3Y' },
  { id: 'GACGB5Y:IND', name: 'Australia 5Y', country: 'Australia', maturity: '5Y' },
  { id: 'GACGB7Y:IND', name: 'Australia 7Y', country: 'Australia', maturity: '7Y' },
  { id: 'GACGB10:IND', name: 'Australia 10Y', country: 'Australia', maturity: '10Y' },
  { id: 'GACGB20Y:IND', name: 'Australia 20Y', country: 'Australia', maturity: '20Y' },
  { id: 'GACGB30Y:IND', name: 'Australia 30Y', country: 'Australia', maturity: '30Y' },
  // Greece
  { id: 'GBTPGR1M:IND', name: 'Greece 1M', country: 'Greece', maturity: '1M' },
  { id: 'GBTPGR3M:IND', name: 'Greece 3M', country: 'Greece', maturity: '3M' },
  { id: 'GBTPGR6M:IND', name: 'Greece 6M', country: 'Greece', maturity: '6M' },
  { id: 'GBTPGR1Y:IND', name: 'Greece 1Y', country: 'Greece', maturity: '1Y' },
  { id: 'GBTPGR2Y:IND', name: 'Greece 2Y', country: 'Greece', maturity: '2Y' },
  { id: 'GBTPGR3Y:IND', name: 'Greece 3Y', country: 'Greece', maturity: '3Y' },
  { id: 'GBTPGR5Y:IND', name: 'Greece 5Y', country: 'Greece', maturity: '5Y' },
  { id: 'GBTPGR7Y:IND', name: 'Greece 7Y', country: 'Greece', maturity: '7Y' },
  { id: 'GBTPGR10:IND', name: 'Greece 10Y', country: 'Greece', maturity: '10Y' },
  { id: 'GBTPGR15Y:IND', name: 'Greece 15Y', country: 'Greece', maturity: '15Y' },
  { id: 'GBTPGR20Y:IND', name: 'Greece 20Y', country: 'Greece', maturity: '20Y' },
  { id: 'GBTPGR30Y:IND', name: 'Greece 30Y', country: 'Greece', maturity: '30Y' },
  // Canada
  { id: 'GCAN1M:IND', name: 'Canada 1M', country: 'Canada', maturity: '1M' },
  { id: 'GCAN1Y:IND', name: 'Canada 1Y', country: 'Canada', maturity: '1Y' },
  { id: 'GCAN2Y:IND', name: 'Canada 2Y', country: 'Canada', maturity: '2Y' },
  { id: 'GCAN10YR:IND', name: 'Canada 10Y', country: 'Canada', maturity: '10Y' },
  { id: 'GCAN20Y:IND', name: 'Canada 20Y', country: 'Canada', maturity: '20Y' },
];

// Get symbol by ID
export function getSymbolById(symbolId: string): BondSymbol | undefined {
  return BOND_SYMBOLS.find(s => s.id === symbolId);
}

// Get all symbols
export function getAllSymbols(): BondSymbol[] {
  return BOND_SYMBOLS;
}

// Get default symbol
export function getDefaultSymbol(): string {
  return 'GACGB10:IND'; // Australia 10Y
}
