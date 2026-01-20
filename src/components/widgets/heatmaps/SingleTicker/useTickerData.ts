'use client';

/**
 * useTickerData Hook
 *
 * Manages real-time ticker data using the tradingViewWebSocket singleton.
 * Handles symbol subscription, price updates, and flash animations.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import tradingViewWebSocket, { PriceUpdateCallback, ConnectionStatusCallback } from '@/utils/tradingViewWebSocket';
import { TickerData, FlashState, ConnectionStatus } from './types';

interface UseTickerDataOptions {
  symbol: string;
  enabled?: boolean;
}

interface UseTickerDataReturn {
  data: TickerData | null;
  status: ConnectionStatus;
  error: Error | null;
  flashState: FlashState;
  reconnect: () => void;
}

// Helper to safely get number from various field names
const getNumber = (obj: Record<string, unknown>, ...keys: string[]): number => {
  for (const key of keys) {
    if (obj[key] !== undefined && obj[key] !== null) {
      const val = Number(obj[key]);
      if (!isNaN(val)) return val;
    }
  }
  return 0;
};

export function useTickerData({
  symbol,
  enabled = true,
}: UseTickerDataOptions): UseTickerDataReturn {
  const [data, setData] = useState<TickerData | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [error, setError] = useState<Error | null>(null);
  const [flashState, setFlashState] = useState<FlashState>(null);
  const previousPriceRef = useRef<number | null>(null);
  const openPriceRef = useRef<number | null>(null);
  const flashTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previousSymbolRef = useRef<string>(symbol);
  const mountedRef = useRef(true);

  // Handle incoming price updates
  const handlePriceUpdate: PriceUpdateCallback = useCallback((messageData: Record<string, unknown>) => {
    if (!mountedRef.current) return;

    // Debug: log incoming messages
    console.log('🔔 [SingleTicker] WebSocket raw message:', messageData);

    if (!messageData || typeof messageData !== 'object') return;

    const msg = messageData;
    let tickerUpdate: Partial<TickerData & { open?: number }> | null = null;

    // Check symbol in various formats
    const symbolVariants = [
      symbol,
      symbol.toLowerCase(),
      symbol.toUpperCase(),
      symbol.slice(0, 3) + '/' + symbol.slice(3),
      (symbol.slice(0, 3) + '/' + symbol.slice(3)).toLowerCase(),
      (symbol.slice(0, 3) + '/' + symbol.slice(3)).toUpperCase(),
    ];
    const msgSymbol = (msg.symbol || msg.Symbol || msg.s || msg.S || '') as string;

    console.log('🔔 [SingleTicker] Symbol check:', {
      msgSymbol,
      targetSymbol: symbol,
      variants: symbolVariants,
      matches: symbolVariants.includes(msgSymbol) || symbolVariants.includes(msgSymbol.toUpperCase())
    });

    // Check if it's a direct ticker update
    if (symbolVariants.includes(msgSymbol) || symbolVariants.includes(msgSymbol.toUpperCase())) {
      tickerUpdate = {
        symbol: (msg.symbol || msg.Symbol || msg.s || msg.S) as string,
        price: getNumber(msg, 'price', 'Price', 'p', 'last', 'Last', 'c', 'lp', 'lastPrice', 'close', 'Close'),
        bid: getNumber(msg, 'bid', 'Bid', 'b', 'bidPrice'),
        ask: getNumber(msg, 'ask', 'Ask', 'a', 'askPrice'),
        high: getNumber(msg, 'high', 'High', 'h', 'dayHigh'),
        low: getNumber(msg, 'low', 'Low', 'l', 'dayLow'),
        open: getNumber(msg, 'open', 'Open', 'o', 'dayOpen', 'openPrice'),
        change: getNumber(msg, 'change', 'Change', 'chg', 'netChange', 'priceChange', 'netchange'),
        changePercent: getNumber(msg, 'changePercent', 'ChangePercent', 'changepct', 'chgPct', 'pct', 'percentChange', 'priceChangePercent'),
        timestamp: getNumber(msg, 'timestamp', 't', 'time') || Date.now(),
      };
    }

    // Check nested data structure
    if (msg.data && typeof msg.data === 'object') {
      const nestedData = msg.data as Record<string, unknown>;
      const nestedSymbol = (nestedData.symbol || nestedData.Symbol || nestedData.s || '') as string;
      if (symbolVariants.includes(nestedSymbol) || symbolVariants.includes(nestedSymbol.toUpperCase())) {
        tickerUpdate = {
          symbol: nestedSymbol,
          price: getNumber(nestedData, 'price', 'Price', 'p', 'last', 'Last', 'c', 'lp', 'lastPrice'),
          bid: getNumber(nestedData, 'bid', 'Bid', 'b', 'bidPrice'),
          ask: getNumber(nestedData, 'ask', 'Ask', 'a', 'askPrice'),
          high: getNumber(nestedData, 'high', 'High', 'h', 'dayHigh'),
          low: getNumber(nestedData, 'low', 'Low', 'l', 'dayLow'),
          open: getNumber(nestedData, 'open', 'Open', 'o', 'dayOpen', 'openPrice'),
          change: getNumber(nestedData, 'change', 'Change', 'chg', 'netChange', 'priceChange', 'netchange'),
          changePercent: getNumber(nestedData, 'changePercent', 'ChangePercent', 'changepct', 'chgPct', 'pct', 'percentChange', 'priceChangePercent'),
          timestamp: getNumber(nestedData, 'timestamp', 't', 'time') || Date.now(),
        };
      }
    }

    if (tickerUpdate && tickerUpdate.price && tickerUpdate.price > 0) {
      console.log('✅ [SingleTicker] Valid ticker update found:', tickerUpdate);

      const newPrice = tickerUpdate.price;
      const prevPrice = previousPriceRef.current;

      // Store open price if provided
      if (tickerUpdate.open && tickerUpdate.open > 0) {
        openPriceRef.current = tickerUpdate.open;
      }

      // Get change values from API
      let change = tickerUpdate.change || 0;
      let changePercent = tickerUpdate.changePercent || 0;

      // Calculate open price from percentage if not available
      if (changePercent !== 0 && !openPriceRef.current) {
        openPriceRef.current = newPrice / (1 + changePercent / 100);
      }

      // Calculate change from open price
      if (openPriceRef.current && openPriceRef.current > 0) {
        change = newPrice - openPriceRef.current;
        changePercent = ((newPrice - openPriceRef.current) / openPriceRef.current) * 100;
      }

      console.log('💰 [SingleTicker] Calculated values:', {
        price: newPrice,
        open: openPriceRef.current,
        change,
        changePercent,
        apiChangePct: tickerUpdate.changePercent
      });

      // Determine flash state based on price change
      if (prevPrice !== null && newPrice !== prevPrice) {
        if (flashTimeoutRef.current) {
          clearTimeout(flashTimeoutRef.current);
        }

        const newFlashState: FlashState = newPrice > prevPrice ? 'up' : 'down';
        setFlashState(newFlashState);

        flashTimeoutRef.current = setTimeout(() => {
          setFlashState(null);
        }, 400);
      }

      previousPriceRef.current = newPrice;

      setData({
        symbol: tickerUpdate.symbol || symbol,
        price: newPrice,
        bid: tickerUpdate.bid || 0,
        ask: tickerUpdate.ask || 0,
        high: tickerUpdate.high || 0,
        low: tickerUpdate.low || 0,
        open: openPriceRef.current || 0,
        change,
        changePercent,
        timestamp: tickerUpdate.timestamp || Date.now(),
      });
    }
  }, [symbol]);

  // Handle connection status changes
  const handleConnectionStatus: ConnectionStatusCallback = useCallback((newStatus) => {
    if (!mountedRef.current) return;
    console.log('🔗 [SingleTicker] Connection status:', newStatus);
    setStatus(newStatus);

    if (newStatus === 'error') {
      setError(new Error('WebSocket connection error'));
    } else {
      setError(null);
    }
  }, []);

  // Manual reconnect function
  const reconnect = useCallback(() => {
    console.log('🔄 [SingleTicker] Manual reconnect triggered');
    tradingViewWebSocket.connect().catch(err => {
      console.error('🔴 [SingleTicker] Reconnect failed:', err);
    });
  }, []);

  // Connect and subscribe on mount
  useEffect(() => {
    if (!enabled) return;

    mountedRef.current = true;

    const connect = async () => {
      try {
        console.log('🔗 [SingleTicker] Connecting to tradingViewWebSocket...');
        await tradingViewWebSocket.connect();

        // Register callbacks
        tradingViewWebSocket.onPriceUpdate(handlePriceUpdate);
        tradingViewWebSocket.onConnectionStatus(handleConnectionStatus);

        // Subscribe to symbol
        console.log('📤 [SingleTicker] Subscribing to:', symbol);
        tradingViewWebSocket.subscribe([symbol]);

      } catch (err) {
        console.error('🔴 [SingleTicker] Connection failed:', err);
        if (mountedRef.current) {
          setStatus('error');
          setError(err instanceof Error ? err : new Error('Connection failed'));
        }
      }
    };

    connect();

    return () => {
      mountedRef.current = false;

      // Remove callbacks
      tradingViewWebSocket.removePriceUpdateCallback(handlePriceUpdate);
      tradingViewWebSocket.removeConnectionStatusCallback(handleConnectionStatus);

      // Unsubscribe from symbol
      console.log('📤 [SingleTicker] Unsubscribing from:', symbol);
      tradingViewWebSocket.unsubscribe([symbol]);

      // Disconnect (decrements consumer count)
      tradingViewWebSocket.disconnect();
    };
  }, [enabled, symbol, handlePriceUpdate, handleConnectionStatus]);

  // Handle symbol change
  useEffect(() => {
    if (previousSymbolRef.current !== symbol) {
      console.log('🔄 [SingleTicker] Symbol changed from', previousSymbolRef.current, 'to', symbol);

      // Clear data immediately when symbol changes
      setData(null);
      setFlashState(null);
      previousPriceRef.current = null;
      openPriceRef.current = null;

      // Unsubscribe from old symbol and subscribe to new
      tradingViewWebSocket.unsubscribe([previousSymbolRef.current]);
      tradingViewWebSocket.subscribe([symbol]);

      previousSymbolRef.current = symbol;
    }
  }, [symbol]);

  // Cleanup flash timeout on unmount
  useEffect(() => {
    return () => {
      if (flashTimeoutRef.current) {
        clearTimeout(flashTimeoutRef.current);
      }
    };
  }, []);

  return {
    data,
    status,
    error,
    flashState,
    reconnect,
  };
}
