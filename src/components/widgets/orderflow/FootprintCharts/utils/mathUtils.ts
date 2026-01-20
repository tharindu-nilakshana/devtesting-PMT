/**
 * @file mathUtils.ts
 * @description Mathematical utilities for footprint chart calculations
 * Ported from the stable Footprint-d3.js implementation
 */

import { Trade, PriceLevel, FootprintCandle, DEFAULT_CONFIG } from '../types';

// ==================================================================================
// PRICE UTILITIES
// ==================================================================================

/**
 * Snaps a price to the nearest tick size
 */
export const snapToTickSize = (price: number, tickSize: number): number => {
  if (!tickSize || tickSize <= 0) return price;
  return Math.round((price + 1e-9) / tickSize) * tickSize;
};

/**
 * Formats a price for display
 */
export const formatPrice = (price: number, decimals: number = 5): string => {
  return price.toFixed(decimals);
};

/**
 * Formats volume for compact display
 */
export const formatVolume = (num: number): string => {
  if (!num) return '';
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
  return num.toString();
};

/**
 * Gets the tick size for an instrument
 */
export const getTickSize = (instrument: string): number => {
  return DEFAULT_CONFIG.instrumentTickSizes[instrument] || DEFAULT_CONFIG.instrumentTickSizes.default;
};

// ==================================================================================
// POC & VALUE AREA CALCULATION
// ==================================================================================

interface PocValueAreaResult {
  poc: number[];
  vah: number;
  val: number;
}

/**
 * Calculates the Point of Control (POC) and Value Area for a volume profile
 * POC is the price level with highest volume
 * Value Area contains 70% of the total volume centered around POC
 */
export const calculatePocAndValueArea = (
  volumeProfile: Map<string, PriceLevel>,
  totalCandleVolume: number
): PocValueAreaResult => {
  if (volumeProfile.size === 0) {
    return { poc: [], vah: 0, val: 0 };
  }

  const profileArray = Array.from(volumeProfile.values()).sort((a, b) => a.price - b.price);

  // 1. Find the Point of Control (POC) - price level(s) with highest volume
  let maxVolume = 0;
  profileArray.forEach((level) => {
    if (level.totalVolume > maxVolume) {
      maxVolume = level.totalVolume;
    }
  });

  const pocLevels = profileArray
    .filter((level) => level.totalVolume === maxVolume)
    .map((level) => level.price);
  const pocPrice = pocLevels[0];

  // 2. Calculate Value Area (70% of volume)
  const vaVolumeTarget = totalCandleVolume * DEFAULT_CONFIG.features.valueAreaPercentage;
  let currentVaVolume = maxVolume;
  let highIndex = profileArray.findIndex((p) => p.price === pocPrice);
  let lowIndex = highIndex;

  while (currentVaVolume < vaVolumeTarget && (lowIndex > 0 || highIndex < profileArray.length - 1)) {
    const nextHighVolume =
      highIndex < profileArray.length - 1 ? profileArray[highIndex + 1].totalVolume : 0;
    const nextLowVolume = lowIndex > 0 ? profileArray[lowIndex - 1].totalVolume : 0;

    if (nextHighVolume >= nextLowVolume) {
      currentVaVolume += nextHighVolume;
      highIndex++;
    } else {
      currentVaVolume += nextLowVolume;
      lowIndex--;
    }
  }

  return {
    poc: pocLevels,
    vah: profileArray[highIndex]?.price ?? pocPrice,
    val: profileArray[lowIndex]?.price ?? pocPrice
  };
};

// ==================================================================================
// IMBALANCE CALCULATION
// ==================================================================================

interface ImbalanceResult {
  updatedProfile: Map<string, PriceLevel>;
  stackedBuyImbalances: number;
  stackedSellImbalances: number;
}

/**
 * Analyzes a volume profile to detect diagonal imbalances
 * Buy imbalance: Ask volume at price N is >= ratio * Bid volume at price N-1
 * Sell imbalance: Bid volume at price N is >= ratio * Ask volume at price N+1
 */
export const calculateImbalances = (
  volumeProfile: Map<string, PriceLevel>,
  imbalanceRatio: number
): ImbalanceResult => {
  if (volumeProfile.size < 2) {
    return { updatedProfile: volumeProfile, stackedBuyImbalances: 0, stackedSellImbalances: 0 };
  }

  // Sort by price descending
  const sortedProfile = Array.from(volumeProfile.values()).sort((a, b) => b.price - a.price);

  let consecutiveBuys = 0;
  let maxConsecutiveBuys = 0;
  let consecutiveSells = 0;
  let maxConsecutiveSells = 0;

  for (let i = 0; i < sortedProfile.length - 1; i++) {
    const currentLevel = sortedProfile[i];
    const lowerLevel = sortedProfile[i + 1];

    // Reset imbalance state
    currentLevel.imbalance = 'none';
    lowerLevel.imbalance = 'none';

    // Check for Buy Imbalance: Ask at current price vs Bid at price below
    if (lowerLevel.sellVolume > 0 && currentLevel.buyVolume >= lowerLevel.sellVolume * imbalanceRatio) {
      currentLevel.imbalance = 'buy';
      consecutiveBuys++;
      consecutiveSells = 0;
    }
    // Check for Sell Imbalance: Bid at current price vs Ask at price above
    else if (currentLevel.buyVolume > 0 && lowerLevel.sellVolume >= currentLevel.buyVolume * imbalanceRatio) {
      lowerLevel.imbalance = 'sell';
      consecutiveSells++;
      consecutiveBuys = 0;
    } else {
      consecutiveBuys = 0;
      consecutiveSells = 0;
    }

    if (consecutiveBuys > maxConsecutiveBuys) maxConsecutiveBuys = consecutiveBuys;
    if (consecutiveSells > maxConsecutiveSells) maxConsecutiveSells = consecutiveSells;
  }

  // Update the map with imbalance data
  sortedProfile.forEach((level) => {
    volumeProfile.set(level.price.toString(), level);
  });

  return {
    updatedProfile: volumeProfile,
    stackedBuyImbalances: maxConsecutiveBuys,
    stackedSellImbalances: maxConsecutiveSells
  };
};

// ==================================================================================
// DATA AGGREGATION
// ==================================================================================

/**
 * Aggregates raw trades into FootprintCandle objects
 * This is the core data processing function
 */
export const aggregateTrades = (
  rawTrades: Trade[],
  symbol: string,
  timeframeMinutes: number,
  tickSize: number,
  tickMultiplier: number,
  imbalanceRatio: number
): FootprintCandle[] => {
  const symbolTrades = rawTrades.filter((trade) => trade.symbol === symbol);
  if (symbolTrades.length === 0) return [];

  // Sort by time
  symbolTrades.sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime());

  const candles: FootprintCandle[] = [];
  const bucketMs = timeframeMinutes * 60 * 1000;
  let currentCandle: FootprintCandle | null = null;

  // Calculate the effective tick size for aggregation
  const effectiveTickSize = tickSize * tickMultiplier;

  for (const trade of symbolTrades) {
    const tradeTime = new Date(trade.datetime).getTime();
    const bucketTimestamp = Math.floor(tradeTime / bucketMs) * bucketMs;

    // Snap price to the effective grid
    const snappedPrice = snapToTickSize(trade.price, effectiveTickSize);

    if (!currentCandle || currentCandle.time !== bucketTimestamp) {
      if (currentCandle) {
        // Finalize the completed candle
        finalizeCandle(currentCandle, imbalanceRatio);
        candles.push(currentCandle);
      }

      // Initialize new candle
      currentCandle = {
        time: bucketTimestamp,
        timeLabel: formatTimeLabel(bucketTimestamp),
        open: snappedPrice,
        high: snappedPrice,
        low: snappedPrice,
        close: snappedPrice,
        totalVolume: 0,
        buyVolume: 0,
        sellVolume: 0,
        delta: 0,
        poc: [],
        vah: 0,
        val: 0,
        volumeProfile: new Map(),
        stackedBuyImbalances: 0,
        stackedSellImbalances: 0
      };
    }

    // Update current candle with trade data
    currentCandle.high = Math.max(currentCandle.high, snappedPrice);
    currentCandle.low = Math.min(currentCandle.low, snappedPrice);
    currentCandle.close = snappedPrice;
    currentCandle.totalVolume += trade.trade_size;

    // Update volume profile
    const priceKey = snappedPrice.toString();
    const priceLevel = currentCandle.volumeProfile.get(priceKey) || {
      price: snappedPrice,
      buyVolume: 0,
      sellVolume: 0,
      totalVolume: 0,
      imbalance: 'none' as const,
      delta: 0
    };

    // trade_condition: 1 = at ask (buy), 2 = at bid (sell)
    if (trade.trade_condition === 1) {
      priceLevel.buyVolume += trade.trade_size;
      currentCandle.buyVolume += trade.trade_size;
    } else if (trade.trade_condition === 2) {
      priceLevel.sellVolume += trade.trade_size;
      currentCandle.sellVolume += trade.trade_size;
    }

    priceLevel.totalVolume += trade.trade_size;
    priceLevel.delta = priceLevel.buyVolume - priceLevel.sellVolume;
    currentCandle.volumeProfile.set(priceKey, priceLevel);
  }

  // Finalize the last candle
  if (currentCandle) {
    finalizeCandle(currentCandle, imbalanceRatio);
    candles.push(currentCandle);
  }

  return candles;
};

/**
 * Finalizes a candle by calculating POC, Value Area, and Imbalances
 */
const finalizeCandle = (candle: FootprintCandle, imbalanceRatio: number): void => {
  const { poc, vah, val } = calculatePocAndValueArea(candle.volumeProfile, candle.totalVolume);
  candle.poc = poc;
  candle.vah = vah;
  candle.val = val;

  const { updatedProfile, stackedBuyImbalances, stackedSellImbalances } = calculateImbalances(
    candle.volumeProfile,
    imbalanceRatio
  );
  candle.volumeProfile = updatedProfile;
  candle.stackedBuyImbalances = stackedBuyImbalances;
  candle.stackedSellImbalances = stackedSellImbalances;

  candle.delta = candle.buyVolume - candle.sellVolume;
};

/**
 * Formats a timestamp to a time label
 */
const formatTimeLabel = (timestamp: number): string => {
  const date = new Date(timestamp);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

// ==================================================================================
// GEOMETRY UTILITIES
// ==================================================================================

/**
 * Calculate distance between two points
 */
export const distance = (x1: number, y1: number, x2: number, y2: number): number => {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
};

/**
 * Calculate distance from a point to a line segment
 */
export const distanceToSegment = (
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number => {
  const l2 = (x2 - x1) ** 2 + (y2 - y1) ** 2;
  if (l2 === 0) return distance(px, py, x1, y1);
  let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
  t = Math.max(0, Math.min(1, t));
  return distance(px, py, x1 + t * (x2 - x1), y1 + t * (y2 - y1));
};

/**
 * Calculate distance from a point to a polyline
 */
export const distanceToPolyline = (
  px: number,
  py: number,
  points: { x: number; y: number }[]
): number => {
  if (points.length < 2) return 9999;
  let minDist = 9999;
  for (let i = 0; i < points.length - 1; i++) {
    const d = distanceToSegment(px, py, points[i].x, points[i].y, points[i + 1].x, points[i + 1].y);
    if (d < minDist) minDist = d;
  }
  return minDist;
};

/**
 * Get Fibonacci retracement levels
 */
export const getFibLevels = (y1: number, y2: number): { level: number; y: number }[] => {
  const diff = y2 - y1;
  const levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
  return levels.map((l) => ({ level: l, y: y1 + diff * l }));
};

// ==================================================================================
// TIME / INDEX MAPPING
// ==================================================================================

/**
 * Convert index to time (linear extrapolation)
 */
export const getTimeFromIndex = (
  index: number,
  data: FootprintCandle[],
  intervalMs: number
): number => {
  if (data.length === 0) return Date.now() + index * intervalMs;
  const firstTime = data[0].time;
  return firstTime + index * intervalMs;
};

/**
 * Convert time to index (linear extrapolation)
 */
export const getIndexFromTime = (
  time: number,
  data: FootprintCandle[],
  intervalMs: number
): number => {
  if (data.length === 0) return 0;
  const firstTime = data[0].time;
  return (time - firstTime) / intervalMs;
};
