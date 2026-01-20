/**
 * @file aggregator.worker.ts
 * @description Web Worker for processing trade data off the main thread
 * Handles aggregation, imbalance calculation, and POC/Value Area computation
 */

import {
  Trade,
  FootprintCandle,
  PriceLevel,
  WorkerMessage,
  WorkerResponse,
  DEFAULT_CONFIG
} from '../types';

// ==================================================================================
// UTILITY FUNCTIONS (Duplicated to avoid import issues in worker context)
// ==================================================================================

const snapToTickSize = (price: number, tickSize: number): number => {
  if (!tickSize || tickSize <= 0) return price;
  return Math.round((price + 1e-9) / tickSize) * tickSize;
};

const formatTimeLabel = (timestamp: number): string => {
  const date = new Date(timestamp);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

const calculatePocAndValueArea = (
  volumeProfile: Map<string, PriceLevel>,
  totalCandleVolume: number
): { poc: number[]; vah: number; val: number } => {
  if (volumeProfile.size === 0) {
    return { poc: [], vah: 0, val: 0 };
  }

  const profileArray = Array.from(volumeProfile.values()).sort((a, b) => a.price - b.price);

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

  const vaVolumeTarget = totalCandleVolume * 0.7;
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

const calculateImbalances = (
  volumeProfile: Map<string, PriceLevel>,
  imbalanceRatio: number
): { updatedProfile: Map<string, PriceLevel>; stackedBuyImbalances: number; stackedSellImbalances: number } => {
  if (volumeProfile.size < 2) {
    return { updatedProfile: volumeProfile, stackedBuyImbalances: 0, stackedSellImbalances: 0 };
  }

  const sortedProfile = Array.from(volumeProfile.values()).sort((a, b) => b.price - a.price);

  let consecutiveBuys = 0;
  let maxConsecutiveBuys = 0;
  let consecutiveSells = 0;
  let maxConsecutiveSells = 0;

  for (let i = 0; i < sortedProfile.length - 1; i++) {
    const currentLevel = sortedProfile[i];
    const lowerLevel = sortedProfile[i + 1];

    currentLevel.imbalance = 'none';
    lowerLevel.imbalance = 'none';

    if (lowerLevel.sellVolume > 0 && currentLevel.buyVolume >= lowerLevel.sellVolume * imbalanceRatio) {
      currentLevel.imbalance = 'buy';
      consecutiveBuys++;
      consecutiveSells = 0;
    } else if (currentLevel.buyVolume > 0 && lowerLevel.sellVolume >= currentLevel.buyVolume * imbalanceRatio) {
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
// MAIN AGGREGATION FUNCTION
// ==================================================================================

const aggregateTrades = (
  rawTrades: Trade[],
  symbol: string,
  timeframeMinutes: number,
  tickSize: number,
  tickMultiplier: number,
  imbalanceRatio: number
): FootprintCandle[] => {
  const symbolTrades = rawTrades.filter((trade) => trade.symbol === symbol);
  if (symbolTrades.length === 0) return [];

  symbolTrades.sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime());

  const candles: FootprintCandle[] = [];
  const bucketMs = timeframeMinutes * 60 * 1000;
  let currentCandle: FootprintCandle | null = null;

  const effectiveTickSize = tickSize * tickMultiplier;

  for (const trade of symbolTrades) {
    const tradeTime = new Date(trade.datetime).getTime();
    const bucketTimestamp = Math.floor(tradeTime / bucketMs) * bucketMs;
    const snappedPrice = snapToTickSize(trade.price, effectiveTickSize);

    if (!currentCandle || currentCandle.time !== bucketTimestamp) {
      if (currentCandle) {
        finalizeCandle(currentCandle, imbalanceRatio);
        candles.push(currentCandle);
      }

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

    currentCandle.high = Math.max(currentCandle.high, snappedPrice);
    currentCandle.low = Math.min(currentCandle.low, snappedPrice);
    currentCandle.close = snappedPrice;
    currentCandle.totalVolume += trade.trade_size;

    const priceKey = snappedPrice.toString();
    const priceLevel = currentCandle.volumeProfile.get(priceKey) || {
      price: snappedPrice,
      buyVolume: 0,
      sellVolume: 0,
      totalVolume: 0,
      imbalance: 'none' as const,
      delta: 0
    };

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

  if (currentCandle) {
    finalizeCandle(currentCandle, imbalanceRatio);
    candles.push(currentCandle);
  }

  return candles;
};

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

// ==================================================================================
// SERIALIZATION HELPERS (Maps cannot be transferred directly)
// ==================================================================================

interface SerializedCandle extends Omit<FootprintCandle, 'volumeProfile'> {
  volumeProfile: [string, PriceLevel][];
}

const serializeCandles = (candles: FootprintCandle[]): SerializedCandle[] => {
  return candles.map((candle) => ({
    ...candle,
    volumeProfile: Array.from(candle.volumeProfile.entries())
  }));
};

// ==================================================================================
// WORKER MESSAGE HANDLER
// ==================================================================================

self.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const message = event.data;

  if (message.type === 'aggregate') {
    const tickSize =
      DEFAULT_CONFIG.instrumentTickSizes[message.instrument] ||
      DEFAULT_CONFIG.instrumentTickSizes.default;

    const candles = aggregateTrades(
      message.trades,
      message.instrument,
      message.timeframe,
      tickSize,
      message.tickMultiplier,
      message.imbalanceRatio
    );

    // Serialize Map objects for transfer
    const serializedCandles = serializeCandles(candles);

    const response: WorkerResponse = {
      type: 'aggregated',
      candles: serializedCandles as unknown as FootprintCandle[]
    };

    self.postMessage(response);
  }
};

// Export empty to make TypeScript happy with module
export {};
