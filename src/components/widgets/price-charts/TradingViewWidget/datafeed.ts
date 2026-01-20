/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import {
    fetchTradingViewData,
    CandleData,
    AVAILABLE_SYMBOLS,
} from './api';
import tradingViewWebSocket from '@/utils/tradingViewWebSocket';

// TradingView Datafeed Adapter for Advanced Charts
// Implements the UDF (Universal Data Feed) interface

// Type definitions for TradingView Advanced Charts
export interface Bar {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume?: number;
}

export interface LibrarySymbolInfo {
    name: string;
    ticker: string;
    description: string;
    type: string;
    session: string;
    timezone: string;
    exchange: string;
    minmov: number;
    pricescale: number;
    has_intraday: boolean;
    has_daily: boolean;
    has_weekly_and_monthly: boolean;
    supported_resolutions: string[];
    volume_precision: number;
    data_status: string;
}

export interface DatafeedConfiguration {
    supported_resolutions: string[];
    exchanges: Array<{ value: string; name: string; desc: string }>;
    symbols_types: Array<{ name: string; value: string }>;
}

export interface HistoryMetadata {
    noData: boolean;
    nextTime?: number;
}

type OnReadyCallback = (config: DatafeedConfiguration) => void;
type ResolveCallback = (symbolInfo: LibrarySymbolInfo) => void;
type ErrorCallback = (reason: string) => void;
type HistoryCallback = (bars: Bar[], meta: HistoryMetadata) => void;
type SubscribeBarsCallback = (bar: Bar) => void;

interface ResolutionBackValues {
    from: number;
    to: number;
}

// Convert TradingView resolution to our API timeframe format
function convertResolutionToTimeframe(resolution: string): string {
    const resolutionMap: Record<string, string> = {
        '1': '1',
        '5': '5',
        '15': '15',
        '30': '30',
        '60': '60',
        '240': '240',
        'D': '1D',
        '1D': '1D',
        'W': '1W',
        '1W': '1W',
        'M': '1M',
        '1M': '1M',
    };

    return resolutionMap[resolution] || '60';
}

// Convert our API timeframe to TradingView resolution
function convertTimeframeToResolution(timeframe: string): string {
    const timeframeMap: Record<string, string> = {
        '1m': '1',
        '5m': '5',
        '15m': '15',
        '30m': '30',
        '1h': '60',
        '4h': '240',
        '1d': 'D',
        '1w': 'W',
        '1M': 'M',
    };

    return timeframeMap[timeframe] || '60';
}

// Get appropriate date range based on resolution
function getResolutionBackValues(resolution: string): ResolutionBackValues {
    const now = Math.floor(Date.now() / 1000);
    // Historical start date: January 1, 1971 (Unix timestamp)
    const historicalStart = 30844800; // Fixed historical start

    // Use historicalStart for all resolutions to ensure consistent data range
    return { from: historicalStart, to: now };
}

// Convert API candle data to TradingView bar format
function convertCandleToBar(candle: CandleData): Bar {
    const time = Number(candle.intervals);
    const timeInSeconds = time > 1e12 ? Math.floor(time / 1000) : time;

    return {
        time: timeInSeconds * 1000, // TradingView expects milliseconds
        open: Number(candle.open),
        high: Number(candle.high),
        low: Number(candle.low),
        close: Number(candle.close),
        volume: Number(candle.volume) || 0,
    };
}

// Datafeed class implementing TradingView's UDF interface
export class TradingViewDatafeed {
    private subscribers: Map<string, SubscribeBarsCallback> = new Map();
    private lastBars: Map<string, Bar> = new Map();
    private subscriberCounter = 0; // Counter to ensure unique subscriber IDs
    // Map each subscriberUID to a Set of unique subscriber keys (supports multiple widgets with same UID)
    private subscriberUIDMap: Map<string, Set<string>> = new Map();

    constructor() {
        console.log('📊 [DATAFEED] Constructor called - registering price update callback');
        // Set up WebSocket price update handler
        tradingViewWebSocket.onPriceUpdate((data: Record<string, unknown>) => {
            console.log('📊 [DATAFEED] Price update callback FIRED - calling handlePriceUpdate');
            this.handlePriceUpdate(data);
        });
        console.log('📊 [DATAFEED] Price update callback registered successfully');
    }

    // Handle real-time price updates from WebSocket
    private handlePriceUpdate(data: Record<string, unknown>) {
        try {
            const symbol = String(data.symbol || data.Symbol || data.S || data.s || '').toUpperCase();
            const price = Number(data.price ?? data.Price ?? data.last ?? data.Last ?? data.close ?? data.Close ?? data.c);

            if (!symbol || isNaN(price)) {
                return;
            }

            let updateCount = 0;
            
            // Update all subscribers for this symbol
            this.subscribers.forEach((callback, subscriberKey) => {
                const [subSymbol, resolution, ...rest] = subscriberKey.split('_');

                if (subSymbol === symbol) {
                    // Try subscriber-specific lastBar first, then fall back to shared
                    let lastBar = this.lastBars.get(subscriberKey);

                    if (!lastBar) {
                        // Fall back to shared lastBar
                        const sharedKey = `${symbol}_${resolution}_shared`;
                        const sharedLastBar = this.lastBars.get(sharedKey);
                        
                        if (sharedLastBar) {
                            lastBar = { ...sharedLastBar };
                            this.lastBars.set(subscriberKey, lastBar);
                        } else {
                            console.warn(`📊 [DATAFEED] No lastBar found for ${subscriberKey}`);
                            return;
                        }
                    }

                    // Get current timestamp
                    let tickTime = Math.floor(Date.now() / 1000);
                    const rawTs = Number(data.timestamp ?? data.ts ?? data.T ?? data.time);
                    if (!isNaN(rawTs) && rawTs > 0) {
                        tickTime = rawTs > 1e12 ? Math.floor(rawTs / 1000) : rawTs;
                    }

                    // Extract timeframe for bar duration calculation
                    const timeframe = convertResolutionToTimeframe(resolution);

                    // Calculate bar duration in seconds
                    const barDuration = this.getBarDuration(timeframe);
                    const barStartTime = Math.floor(lastBar.time / 1000);
                    const nextBarTime = barStartTime + barDuration;

                    let updatedBar: Bar;

                    if (tickTime >= nextBarTime) {
                        // Create new bar
                        updatedBar = {
                            time: nextBarTime * 1000,
                            open: lastBar.close,
                            high: price,
                            low: price,
                            close: price,
                            volume: 0,
                        };
                    } else {
                        // Update existing bar
                        updatedBar = {
                            ...lastBar,
                            high: Math.max(lastBar.high, price),
                            low: Math.min(lastBar.low, price),
                            close: price,
                        };
                    }

                    // Update last bar and notify subscriber
                    this.lastBars.set(subscriberKey, updatedBar);
                    
                    try {
                        callback(updatedBar);
                        updateCount++;
                    } catch (error) {
                        console.error(`📊 [DATAFEED] ❌ Error calling callback for ${subscriberKey}:`, error);
                    }
                }
            });
            
            // Only log if there were issues or for debugging
            if (updateCount === 0 && this.subscribers.size > 0) {
                console.warn(`📊 [DATAFEED] No subscribers updated for ${symbol} (${this.subscribers.size} total subscribers)`);
            }
        } catch (error) {
            console.error('📊 [DATAFEED] Error in handlePriceUpdate:', error);
        }
    }

    private getBarDuration(timeframe: string): number {
        const durations: Record<string, number> = {
            '1m': 60,
            '5m': 5 * 60,
            '15m': 15 * 60,
            '30m': 30 * 60,
            '1h': 60 * 60,
            '4h': 4 * 60 * 60,
            '1d': 24 * 60 * 60,
            '1w': 7 * 24 * 60 * 60,
            '1M': 30 * 24 * 60 * 60,
        };
        return durations[timeframe] || 60 * 60;
    }

    // UDF Interface Methods

    onReady(callback: OnReadyCallback) {
        setTimeout(() => {
            callback({
                supported_resolutions: ['1', '5', '15', '30', '60', '240', 'D', 'W', 'M'],
                exchanges: [
                    { value: 'FX', name: 'Forex', desc: 'Foreign Exchange' },
                ],
                symbols_types: [
                    { name: 'Forex', value: 'forex' },
                ],
            });
        }, 0);
    }

    searchSymbols(
        userInput: string,
        exchange: string,
        symbolType: string,
        onResultReadyCallback: (symbols: any[]) => void
    ) {
        const symbols = AVAILABLE_SYMBOLS
            .filter(s => s.toLowerCase().includes(userInput.toLowerCase()))
            .map(s => ({
                symbol: s,
                full_name: s,
                description: s,
                exchange: 'FX',
                ticker: s,
                type: 'forex',
            }));

        onResultReadyCallback(symbols);
    }

    resolveSymbol(
        symbolName: string,
        onSymbolResolvedCallback: ResolveCallback,
        onResolveErrorCallback: ErrorCallback
    ) {
        const symbolInfo: LibrarySymbolInfo = {
            name: symbolName,
            ticker: symbolName,
            description: symbolName,
            type: 'forex',
            session: '24x7',
            timezone: 'Etc/UTC',
            exchange: 'FX',
            minmov: 1,
            pricescale: 100000,
            has_intraday: true,
            has_daily: true,
            has_weekly_and_monthly: true,
            supported_resolutions: ['1', '5', '15', '30', '60', '240', 'D', 'W', 'M'],
            volume_precision: 2,
            data_status: 'streaming',
        };

        setTimeout(() => {
            onSymbolResolvedCallback(symbolInfo);
        }, 0);
    }

    async getBars(
        symbolInfo: LibrarySymbolInfo,
        resolution: string,
        periodParams: { from: number; to: number; firstDataRequest: boolean },
        onHistoryCallback: HistoryCallback,
        onErrorCallback: ErrorCallback
    ) {
        try {
            const timeframe = convertResolutionToTimeframe(resolution);
            
            // For longer timeframes (D, W, M), always use historical range on first request
            // to ensure we fetch all available data from 1993
            const isLongTimeframe = ['D', 'W', 'M'].includes(resolution);
            const useHistoricalRange = periodParams.firstDataRequest || isLongTimeframe;
            
            let from: number;
            let to: number;
            
            if (useHistoricalRange) {
                const backValues = getResolutionBackValues(resolution);
                // Use the earlier of the two (our historical start or periodParams.from)
                from = Math.min(backValues.from, periodParams.from);
                to = Math.max(backValues.to, periodParams.to);
            } else {
                from = periodParams.from;
                to = periodParams.to;
            }

            const response = await fetchTradingViewData(
                symbolInfo.name,
                timeframe,
                from,
                to,
                true // Clear cache for fresh data
            );

            if (!response.success || !response.data || response.data.length === 0) {
                onHistoryCallback([], { noData: true });
                return;
            }

            const bars = response.data
                .map(convertCandleToBar)
                .sort((a, b) => a.time - b.time);

            // Store the last bar for real-time updates (shared key for initial setup)
            if (bars.length > 0) {
                const sharedKey = `${symbolInfo.name}_${resolution}_shared`;
                this.lastBars.set(sharedKey, bars[bars.length - 1]);
            }

            onHistoryCallback(bars, { noData: false });
        } catch (error) {
            onErrorCallback(String(error));
        }
    }

    subscribeBars(
        symbolInfo: LibrarySymbolInfo,
        resolution: string,
        onRealtimeCallback: SubscribeBarsCallback,
        subscriberUID: string,
        onResetCacheNeededCallback: () => void
    ) {
        console.log(`📊 [DATAFEED] subscribeBars called for ${symbolInfo.name}, resolution: ${resolution}, subscriberUID: ${subscriberUID}`);
        
        // Always create a new unique ID for each subscription
        // Multiple widgets can have the same subscriberUID (same symbol + resolution)
        const uniqueSubscriberID = `${subscriberUID}_${++this.subscriberCounter}`;
        console.log(`📊 [DATAFEED] Creating unique ID for ${subscriberUID}: ${uniqueSubscriberID}`);
        
        // Track this unique ID under the subscriberUID for cleanup
        if (!this.subscriberUIDMap.has(subscriberUID)) {
            this.subscriberUIDMap.set(subscriberUID, new Set());
        }
        this.subscriberUIDMap.get(subscriberUID)!.add(uniqueSubscriberID);
        
        const subscriberKey = `${symbolInfo.name}_${resolution}_${uniqueSubscriberID}`;
        
        console.log(`📊 [DATAFEED] Subscriber key: ${subscriberKey}`);
        this.subscribers.set(subscriberKey, onRealtimeCallback);
        
        console.log(`📊 [DATAFEED] Total subscribers now: ${this.subscribers.size}`);
        console.log(`📊 [DATAFEED] Subscriber keys:`, Array.from(this.subscribers.keys()));

        // Copy shared last bar to this subscriber's key for real-time updates
        const sharedKey = `${symbolInfo.name}_${resolution}_shared`;
        const sharedLastBar = this.lastBars.get(sharedKey);
        if (sharedLastBar) {
            this.lastBars.set(subscriberKey, { ...sharedLastBar });
            console.log(`📊 [DATAFEED] Copied shared lastBar for ${subscriberKey}`);
        } else {
            console.log(`📊 [DATAFEED] No shared lastBar found for ${sharedKey}`);
        }

        // Connect to WebSocket and subscribe to symbol
        console.log(`📊 [DATAFEED] Connecting to WebSocket for ${symbolInfo.name}...`);
        tradingViewWebSocket.connect().then(() => {
            console.log(`📊 [DATAFEED] WebSocket connected, subscribing to ${symbolInfo.name}`);
            tradingViewWebSocket.subscribe([symbolInfo.name]);
        }).catch((error) => {
            console.error(`📊 [DATAFEED] WebSocket connection error for ${symbolInfo.name}:`, error);
        });
    }

    unsubscribeBars(subscriberUID: string) {
        console.log(`📊 [DATAFEED] unsubscribeBars called for subscriberUID: ${subscriberUID}`);
        
        // Get all unique IDs for this subscriber
        const uniqueSubscriberIDs = this.subscriberUIDMap.get(subscriberUID);
        
        if (!uniqueSubscriberIDs || uniqueSubscriberIDs.size === 0) {
            console.warn(`📊 [DATAFEED] No mapping found for subscriberUID: ${subscriberUID}`);
            return;
        }
        
        console.log(`📊 [DATAFEED] Found ${uniqueSubscriberIDs.size} unique ID(s) for ${subscriberUID}`);
        
        // Remove all subscriber keys associated with these unique IDs
        const keysToRemove: string[] = [];
        uniqueSubscriberIDs.forEach(uniqueSubscriberID => {
            this.subscribers.forEach((_, key) => {
                if (key.includes(uniqueSubscriberID)) {
                    keysToRemove.push(key);
                }
            });
        });
        
        keysToRemove.forEach(key => {
            const [symbol] = key.split('_');
            this.subscribers.delete(key);
            this.lastBars.delete(key);
            console.log(`📊 [DATAFEED] Removed subscriber: ${key}`);

            // Unsubscribe from WebSocket if no more subscribers for this symbol
            const hasOtherSubscribers = Array.from(this.subscribers.keys()).some(k => k.startsWith(symbol + '_'));
            if (!hasOtherSubscribers) {
                console.log(`📊 [DATAFEED] No more subscribers for ${symbol}, unsubscribing from WebSocket`);
                tradingViewWebSocket.unsubscribe([symbol]);
            } else {
                console.log(`📊 [DATAFEED] Other subscribers exist for ${symbol}, keeping WebSocket subscription`);
            }
        });
        
        // Remove the mapping
        this.subscriberUIDMap.delete(subscriberUID);
        console.log(`📊 [DATAFEED] Removed UID mapping for ${subscriberUID}`);
        
        console.log(`📊 [DATAFEED] Total subscribers remaining: ${this.subscribers.size}`);
        console.log(`📊 [DATAFEED] Remaining subscriber keys:`, Array.from(this.subscribers.keys()));
    }
}

// Create singleton instance
export const datafeed = new TradingViewDatafeed();
