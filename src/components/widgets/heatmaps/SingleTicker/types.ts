/**
 * SingleTicker Widget Types
 *
 * Type definitions for the SingleTicker real-time price widget.
 */

// Layout options for price display
export type LayoutType = 'below' | 'right';

// Flash state for price change animation
export type FlashState = 'up' | 'down' | null;

// Connection status for WebSocket
export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

/**
 * Real-time ticker data received from WebSocket
 */
export interface TickerData {
  symbol: string;
  price: number;
  bid: number;
  ask: number;
  high: number;
  low: number;
  open: number;
  change: number;
  changePercent: number;
  timestamp: number;
}

/**
 * Symbol metadata for display
 */
export interface SymbolInfo {
  symbol: string;
  description: string;
  baseCurrency: string;
  quoteCurrency: string;
}

/**
 * Widget settings interface - extends WidgetSettings from bloomberg-ui
 */
export interface SingleTickerSettings {
  symbol: string;
  layout: LayoutType;
  module: string;
}

/**
 * Default widget settings
 */
export const DEFAULT_SETTINGS: SingleTickerSettings = {
  symbol: 'EURUSD',
  layout: 'below',
  module: 'Forex',
};

/**
 * Currency/asset emoji mappings for visual display
 */
export const EMOJI_MAP: Record<string, string> = {
  // Fiat currencies
  EUR: '\u{1F1EA}\u{1F1FA}',
  GBP: '\u{1F1EC}\u{1F1E7}',
  USD: '\u{1F1FA}\u{1F1F8}',
  JPY: '\u{1F1EF}\u{1F1F5}',
  AUD: '\u{1F1E6}\u{1F1FA}',
  CAD: '\u{1F1E8}\u{1F1E6}',
  CHF: '\u{1F1E8}\u{1F1ED}',
  NZD: '\u{1F1F3}\u{1F1FF}',
  // Crypto
  BTC: '\u{20BF}',
  ETH: '\u{039E}',
  // Commodities
  XAU: '\u{1F947}',
  XAG: '\u{1F948}',
};

/**
 * Predefined symbol information for common trading pairs
 */
export const SYMBOL_INFO: Record<string, SymbolInfo> = {
  BTCUSD: {
    symbol: 'BTCUSD',
    description: 'BITCOIN / U.S. DOLLAR',
    baseCurrency: 'BTC',
    quoteCurrency: 'USD',
  },
  ETHUSD: {
    symbol: 'ETHUSD',
    description: 'ETHEREUM / U.S. DOLLAR',
    baseCurrency: 'ETH',
    quoteCurrency: 'USD',
  },
  EURUSD: {
    symbol: 'EURUSD',
    description: 'EURO / U.S. DOLLAR',
    baseCurrency: 'EUR',
    quoteCurrency: 'USD',
  },
  GBPUSD: {
    symbol: 'GBPUSD',
    description: 'POUND / U.S. DOLLAR',
    baseCurrency: 'GBP',
    quoteCurrency: 'USD',
  },
  XAUUSD: {
    symbol: 'XAUUSD',
    description: 'GOLD / U.S. DOLLAR',
    baseCurrency: 'XAU',
    quoteCurrency: 'USD',
  },
  USDJPY: {
    symbol: 'USDJPY',
    description: 'U.S. DOLLAR / JAPANESE YEN',
    baseCurrency: 'USD',
    quoteCurrency: 'JPY',
  },
  AUDUSD: {
    symbol: 'AUDUSD',
    description: 'AUSTRALIAN DOLLAR / U.S. DOLLAR',
    baseCurrency: 'AUD',
    quoteCurrency: 'USD',
  },
  USDCAD: {
    symbol: 'USDCAD',
    description: 'U.S. DOLLAR / CANADIAN DOLLAR',
    baseCurrency: 'USD',
    quoteCurrency: 'CAD',
  },
  USDCHF: {
    symbol: 'USDCHF',
    description: 'U.S. DOLLAR / SWISS FRANC',
    baseCurrency: 'USD',
    quoteCurrency: 'CHF',
  },
  NZDUSD: {
    symbol: 'NZDUSD',
    description: 'NEW ZEALAND DOLLAR / U.S. DOLLAR',
    baseCurrency: 'NZD',
    quoteCurrency: 'USD',
  },
};

/**
 * Helper to get symbol info with fallback for unknown symbols
 */
export function getSymbolInfo(symbol: string): SymbolInfo {
  return SYMBOL_INFO[symbol] || {
    symbol,
    description: symbol,
    baseCurrency: symbol.substring(0, 3),
    quoteCurrency: symbol.substring(3),
  };
}

/**
 * Helper to get emoji for a currency
 */
export function getCurrencyEmoji(currency: string): string {
  return EMOJI_MAP[currency] || currency.substring(0, 2);
}
