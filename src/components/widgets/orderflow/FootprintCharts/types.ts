/**
 * @file types.ts
 * @description Type definitions for the Footprint Charts widget
 */

// ==================================================================================
// TRADE DATA TYPES
// ==================================================================================

export interface Trade {
  orderflow_id: number;
  symbol: string;
  datetime: string;
  price: number;
  trade_condition: number; // 1 = Buy (Ask), 2 = Sell (Bid)
  trade_size: number;
}

export interface PriceLevel {
  price: number;
  buyVolume: number;
  sellVolume: number;
  totalVolume: number;
  imbalance: 'none' | 'buy' | 'sell';
  delta: number;
}

export interface FootprintCandle {
  time: number;
  timeLabel: string;
  open: number;
  high: number;
  low: number;
  close: number;
  totalVolume: number;
  buyVolume: number;
  sellVolume: number;
  delta: number;
  volumeProfile: Map<string, PriceLevel>;
  poc: number[];
  vah: number;
  val: number;
  stackedBuyImbalances: number;
  stackedSellImbalances: number;
}

// ==================================================================================
// CHART CONFIGURATION TYPES
// ==================================================================================

export type ChartType = 'bid_ask' | 'volume' | 'delta' | 'bid_ask_delta' | 'dots';
export type Timeframe = 1 | 5 | 15 | 30 | 60;
export type DrawingTool = 'cursor' | 'trendline' | 'horizontal' | 'rect' | 'ray' | 'pen' | 'fib';

export interface ChartConfig {
  instrumentTickSizes: Record<string, number>;
  mainChart: {
    margin: { top: number; right: number; bottom: number; left: number };
  };
  features: {
    imbalanceRatio: number;
    valueAreaPercentage: number;
  };
}

export const DEFAULT_CONFIG: ChartConfig = {
  instrumentTickSizes: {
    '@ES#': 0.25,
    '@DX#': 0.005,
    '@JY#': 0.0000005,
    '@SF#': 0.0001,
    '@NE#': 0.0001,
    '@CD#': 0.0001,
    '@AD#': 0.0001,
    '@EU#': 0.0001,
    '@BP#': 0.0001,
    'default': 0.0001
  },
  mainChart: {
    margin: { top: 20, right: 70, bottom: 30, left: 0 }
  },
  features: {
    imbalanceRatio: 3,
    valueAreaPercentage: 0.70
  }
};

export const INSTRUMENTS = ['@EU#', '@ES#', '@AD#', '@DX#', '@BP#', '@JY#', '@NE#', '@SF#', '@CD#'];

// ==================================================================================
// THEME TYPES
// ==================================================================================

export interface Theme {
  id: string;
  name: string;
  colors: {
    backgroundPrimary: string;
    backgroundSecondary: string;
    backgroundHover: string;
    textPrimary: string;
    textSecondary: string;
    borderPrimary: string;
    accent: string;
    up: string;
    down: string;
    poc: string;
    wick: string;
  };
}

export const DEFAULT_THEMES: Theme[] = [
  {
    id: 'dark',
    name: 'Seasonality Dark',
    colors: {
      backgroundPrimary: '#181B23', // Seasonality chart dark background
      backgroundSecondary: '#232634', // Slightly lighter for panels
      backgroundHover: '#23273A',
      textPrimary: '#D9D9D9',
      textSecondary: '#A7B1BC',
      borderPrimary: '#232634',
      accent: '#FFB300',
      up: '#26A69A',
      down: '#EF5350',
      poc: '#FFB300',
      wick: '#555c6e'
    }
  },
  {
    id: 'light',
    name: 'TradingView Light',
    colors: {
      backgroundPrimary: '#FFFFFF', // TradingView light chart background
      backgroundSecondary: '#F7F9FA', // TradingView light panel background
      backgroundHover: '#F1F3F6',
      textPrimary: '#131722',
      textSecondary: '#6A798A',
      borderPrimary: '#E0E3EB',
      accent: '#2962ff',
      up: '#089981',
      down: '#f23645',
      poc: '#f59e0b',
      wick: '#6b7280'
    }
  }
];

// ==================================================================================
// DRAWING TYPES
// ==================================================================================

export interface DrawingPoint {
  price: number;
  time: number;
  timeLabel?: string;
}

export interface Drawing {
  id: string;
  type: DrawingTool;
  points: DrawingPoint[];
  color: string;
  selected: boolean;
  locked: boolean;
  visible: boolean;
}

// ==================================================================================
// CHART SETTINGS & STATE
// ==================================================================================

export interface ChartSettings {
  instrument: string;
  chartType: ChartType;
  timeframe: Timeframe;
  tickMultiplier: number;
  showHeatmap: boolean;
  showCandlesticks: boolean;
  showDOM: boolean;
  showPOC: boolean;
  showValueArea: boolean;
  showImbalances: boolean;
  activeTool: DrawingTool;
  drawings: Drawing[];
  theme: Theme;
}

export interface ViewState {
  viewOffset: number;
  viewCount: number;
  yDomain: [number, number] | null;
}

// ==================================================================================
// WEBSOCKET TYPES
// ==================================================================================

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting' | 'error';

export interface WebSocketConfig {
  url: string;
  symbols: string[];
  reconnectAttempts: number;
  reconnectDelay: number;
  heartbeatInterval: number;
  bufferFlushInterval: number;
}

// ==================================================================================
// WORKER MESSAGE TYPES
// ==================================================================================

export interface WorkerAggregateRequest {
  type: 'aggregate';
  trades: Trade[];
  instrument: string;
  timeframe: Timeframe;
  tickMultiplier: number;
  imbalanceRatio: number;
}

export interface WorkerAggregateResponse {
  type: 'aggregated';
  candles: FootprintCandle[];
}

export type WorkerMessage = WorkerAggregateRequest;
export type WorkerResponse = WorkerAggregateResponse;

// ==================================================================================
// WIDGET PROPS
// ==================================================================================

export interface FootprintChartsProps {
  onSettings?: () => void;
  onRemove?: () => void;
  onFullscreen?: () => void;
  settings?: Partial<ChartSettings>;
}
