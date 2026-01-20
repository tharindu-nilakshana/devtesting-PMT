// Client-side API functions for Bank Trades widget

export interface ApiBankTrade {
  BankTradeID: number;
  NameOfBank: string;
  Currency: string;
  TradeDateF: string;
  TradeEntry: number;
  TradeStopLoss: number;
  TradeTakeProfit: number;
  TradeStatus: string;
  AddedOn: string;
  OrderType: string;
  // Expected from API (not simulated)
  Direction?: string; // 'Long' or 'Short'
  RiskLevel?: string; // e.g., 'MACRO - MEDIUM-TERM — [OPEN]'
  Rationale?: string; // Actual analyst rationale
  TradeHistory?: Array<{
    Date: string;
    Description: string;
  }>;
}

export interface ApiTradesTableResponse {
  success: boolean;
  BankTrades: ApiBankTrade[];
}

export interface ApiCandleData {
  open: number;
  high: number;
  low: number;
  close: number;
  datetime: string;
  volume?: number; // Optional volume from API
}

export interface ApiCandlesResponse {
  success: boolean;
  symbol: string;
  count: number;
  data: ApiCandleData[];
}

export interface BankTrade {
  id: string;
  bank: string;
  orderType: string;
  currency: string;
  date: string;
  entry: number;
  takeProfit: number;
  stopLoss: number;
  status: 'Active' | 'Closed' | 'Pending';
  direction?: 'Long' | 'Short'; // Optional - from API
  tradeHistory?: TradeHistoryItem[]; // Optional - from API
  rationale?: string; // Optional - from API
  riskLevel?: string; // Optional - from API
}

export interface TradeHistoryItem {
  date: string;
  description: string;
}

// Note: Direction, RiskLevel, Rationale, and TradeHistory should come from the API
// If they're not provided, they will be undefined and handled gracefully in the UI

// Format currency pair for display (EURUSD -> EUR/USD)
export function formatCurrencyForDisplay(currency: string): string {
  if (!currency || currency.length < 6) return currency;
  if (currency.includes('/')) return currency;
  return `${currency.substring(0, 3)}/${currency.substring(3)}`;
}

// Format currency pair for API (EUR/USD -> EURUSD)
export function formatCurrencyForApi(currency: string): string {
  return currency.replace('/', '').toUpperCase();
}

// Transform API response to component format
export function transformApiTradesResponse(apiData: ApiBankTrade[]): BankTrade[] {
  return apiData.map((trade) => {
    // Transform trade history if provided by API
    const tradeHistory = trade.TradeHistory?.map(h => ({
      date: h.Date,
      description: h.Description
    }));
    
    return {
      id: trade.BankTradeID.toString(),
      bank: trade.NameOfBank,
      orderType: trade.OrderType,
      currency: formatCurrencyForDisplay(trade.Currency),
      date: trade.TradeDateF,
      entry: trade.TradeEntry,
      takeProfit: trade.TradeTakeProfit || 0,
      stopLoss: trade.TradeStopLoss,
      status: (trade.TradeStatus as 'Active' | 'Closed' | 'Pending') || 'Active',
      // These should come from API - no simulation
      direction: trade.Direction as 'Long' | 'Short' | undefined,
      tradeHistory: tradeHistory,
      rationale: trade.Rationale,
      riskLevel: trade.RiskLevel,
    };
  });
}

// Transform candles API response to chart data format
export function transformCandlesResponse(apiData: ApiCandleData[]): Array<{ time: string; price: number; volume: number }> {
  if (!apiData || apiData.length === 0) return [];
  
  // Sort by datetime (oldest first for chart)
  const sorted = [...apiData].sort((a, b) => {
    const dateA = new Date(a.datetime).getTime();
    const dateB = new Date(b.datetime).getTime();
    return dateA - dateB;
  });
  
  return sorted.map((candle) => {
    // Format time as HH:MM
    const date = new Date(candle.datetime);
    const time = date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
    
    return {
      time: time,
      price: candle.close,
      volume: candle.volume || 0, // Use volume from API, or 0 if not provided
    };
  });
}

// Fetch bank trades table data
export async function fetchBankTradesTable(): Promise<ApiTradesTableResponse | null> {
  try {
    console.log('📡 [Bank Trades API] Fetching trades table...');
    const response = await fetch('/api/pmt/get-bank-trades-table', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ [Bank Trades API] HTTP error:', response.status, errorData.error);
      return null;
    }

    const result = await response.json();
    console.log('📡 [Bank Trades API] Response received:', result);
    
    if (!result.success || !result.data) {
      console.error('❌ [Bank Trades API] Unsuccessful response:', result);
      return null;
    }

    console.log('✅ [Bank Trades API] Data extracted:', result.data);
    return result.data;
  } catch (error) {
    console.error('❌ [Bank Trades API] Fetch error:', error);
    return null;
  }
}

// Fetch bank trades candles data
export async function fetchBankTradesCandles(symbol: string): Promise<ApiCandlesResponse | null> {
  try {
    console.log('📊 [Bank Trades Candles API] Fetching candles for:', symbol);
    const response = await fetch('/api/pmt/get-bank-trades-candles', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ symbol: formatCurrencyForApi(symbol) }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ [Bank Trades Candles API] HTTP error:', response.status, errorData.error);
      return null;
    }

    const result = await response.json();
    console.log('📊 [Bank Trades Candles API] Response received:', result);
    
    if (!result.success || !result.data) {
      console.error('❌ [Bank Trades Candles API] Unsuccessful response:', result);
      return null;
    }

    return result.data;
  } catch (error) {
    console.error('❌ [Bank Trades Candles API] Fetch error:', error);
    return null;
  }
}



