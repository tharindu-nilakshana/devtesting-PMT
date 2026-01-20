import { SavedTemplate } from '../types';

export const DEFAULT_GRID_SIZES: { [key: string]: number[] } = {
  'two-vertical': [50, 50],
  'two-horizontal': [50, 50],
  'three-vertical': [33.33, 33.33, 33.34],
  'three-horizontal': [33.33, 33.33, 33.34],
  'three-left-right': [50, 25, 25],
  'three-top-bottom': [25, 25, 50],
  'three-left-stack': [25, 25, 50],
  'three-right-stack': [50, 25, 25],
  'four-grid': [50, 50, 50, 50, 50, 50], // [top height, topLeft width, topRight width, bottomLeft width, bottomRight width, bottom height]
  '4-grid': [50, 50, 50, 50, 50, 50], // [top height, topLeft width, topRight width, bottomLeft width, bottomRight width, bottom height]
  'four-vertical': [25, 25, 25, 25],
  'four-horizontal': [25, 25, 25, 25],
  'five-grid': [20, 20, 20, 20, 20],
  'five-vertical': [20, 20, 20, 20, 20],
  'five-horizontal': [20, 20, 20, 20, 20]
};

export const MOCK_SAVED_TEMPLATES: SavedTemplate[] = [
  { id: 1, name: "Default Layout", description: "Balanced view with all essential widgets", layout: "four-grid" },
  { id: 2, name: "Day Trading", description: "Fast-paced trading with quick order execution", layout: "three-left-right" },
  { id: 3, name: "Swing Trading", description: "Multi-day positions with technical analysis", layout: "three-vertical" },
  { id: 4, name: "Crypto Focus", description: "24/7 crypto market monitoring", layout: "four-grid" },
  { id: 5, name: "Forex Trading", description: "Currency pairs with live spreads", layout: "three-horizontal" },
  { id: 6, name: "Multi Chart", description: "Multiple timeframes and instruments", layout: "five-grid" },
  { id: 7, name: "Scalping View", description: "Ultra-fast micro trading setup", layout: "two-horizontal" },
  { id: 8, name: "Options Trading", description: "Options chains and Greeks analysis", layout: "four-vertical" },
  { id: 9, name: "Market Overview", description: "Broad market sentiment and indicators", layout: "three-left-right" },
  { id: 10, name: "Technical Analysis", description: "Advanced charting and indicators", layout: "three-vertical" },
  { id: 11, name: "News Focus", description: "News-driven trading setup", layout: "two-horizontal" },
  { id: 12, name: "Portfolio Manager", description: "Track and manage your positions", layout: "five-grid" },
];
