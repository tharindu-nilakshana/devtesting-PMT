"use client";

import { useState, useEffect, useRef } from "react";
import { WidgetHeader } from "@/components/bloomberg-ui/WidgetHeader";
import tradingViewWebSocket from '@/utils/tradingViewWebSocket';
import { ConnectionStatusCallback } from '@/utils/tradingViewWebSocket';
import { createChart, type IChartApi, type ISeriesApi, type Time, type CandlestickData } from 'lightweight-charts';

interface FXOptionsExpiryProps {
  onSettings?: () => void;
  onRemove?: () => void;
  onFullscreen?: () => void;
}

/**
 * Data structure for individual option strike and amount
 */
export interface OptionData {
  strike: number;
  amount: string; // Formatted string like "706.5m" or "1.42bn"
}

/**
 * Data structure for expiry date with options for each currency pair
 * Expected API response structure:
 * {
 *   date: string;        // Format: "DD/MM" (e.g., "31/10")
 *   day: string;         // Day name (e.g., "Friday")
 *   pairs: {
 *     [currencyPair: string]: OptionData[];  // e.g., "EURUSD": [{ strike: 1.1575, amount: "706.5m" }, ...]
 *   };
 * }
 */
export interface ExpiryDate {
  date: string;
  day: string;
  pairs: {
    [key: string]: OptionData[];
  };
}

/**
 * Expected API response structure for current prices
 * {
 *   [currencyPair: string]: number;  // e.g., "EURUSD": 1.15876
 * }
 */
export interface CurrentPrices {
  [key: string]: number;
}

  const currencyPairs = [
    { pair: "EURUSD", flag: "🇪🇺" },
    { pair: "USDJPY", flag: "🇺🇸" },
    { pair: "GBPUSD", flag: "🇬🇧" },
    { pair: "USDCHF", flag: "🇺🇸" },
    { pair: "USDCAD", flag: "🇺🇸" },
    { pair: "AUDUSD", flag: "🇦🇺" },
  ];
  
interface CandleData {
  time: number; // Unix timestamp
  open: number;
  high: number;
  low: number;
  close: number;
}

export function FXOptionsExpiry({ onSettings, onRemove, onFullscreen }: FXOptionsExpiryProps) {
  // State for expiry data from API
  const [expiryData, setExpiryData] = useState<ExpiryDate[]>([]);
  
  // State for current prices from API
  const [currentPrices, setCurrentPrices] = useState<CurrentPrices>({});
  
  // Loading and error states
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // WebSocket connection status
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  
  // Price update animation states
  const [flashingPairs, setFlashingPairs] = useState<Set<string>>(new Set());
  const [priceDirections, setPriceDirections] = useState<{ [key: string]: "up" | "down" }>({});
  const [previousPrices, setPreviousPrices] = useState<CurrentPrices>({});
  
  // Chart state
  const [selectedPair, setSelectedPair] = useState<string | null>(null);
  const [candlestickData, setCandlestickData] = useState<CandleData[]>([]);
  const [chartLoading, setChartLoading] = useState<boolean>(false);
  const [chartError, setChartError] = useState<string | null>(null);
  
  // Chart refs
  const chartContainerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const strikeLinesRef = useRef<Map<number, ISeriesApi<'Line'>>>(new Map());
  const strikePriceLinesRef = useRef<Map<number, any>>(new Map()); // Price lines for highlighting
  const priceLabelOverlaysRef = useRef<Map<number, HTMLDivElement>>(new Map()); // HTML overlays for price labels
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  // Fetch data from API
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch('/api/pmt/fx-options-expiry', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({}),
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch FX options expiry data: ${response.statusText}`);
        }
        
        const result = await response.json();
        if (!result.success || !result.data) {
          throw new Error('Invalid response from API');
        }
        
        setExpiryData(result.data.expiryData || []);
        setCurrentPrices(result.data.currentPrices || {});
      } catch (err) {
        console.error('Error fetching FX options expiry data:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // WebSocket connection for real-time price updates
  useEffect(() => {
    // CRITICAL: Only connect WebSocket on client-side to avoid SSR issues
    if (typeof window === 'undefined') {
      console.log('🚫 [FX Options Expiry] Skipping WebSocket connection during SSR');
      return;
    }

    const handleConnectionStatus: ConnectionStatusCallback = (status) => {
      console.log('🔗 [FX Options Expiry] WebSocket status:', status);
      setConnectionStatus(status);
    };

    const handlePriceUpdate = (data: Record<string, unknown>) => {
      try {
        const symbol = String(data.symbol || data.Symbol || data.S || data.s || '').toUpperCase();
        const price = parseFloat(String(
          data.price || data.Price || data.last || data.Last || 
          data.close || data.Close || data.c || 0
        ));
        
        if (!symbol || symbol.length < 6 || isNaN(price) || price <= 0) {
          return;
        }

        // Only update if this is one of our tracked currency pairs
        const trackedPairs = currencyPairs.map(cp => cp.pair);
        if (!trackedPairs.includes(symbol)) {
          return;
        }

        console.log('💰 [FX Options Expiry] Price update received:', { symbol, price });

        // Update current prices state
        setCurrentPrices((prev) => ({
          ...prev,
          [symbol]: price
        }));
      } catch (error) {
        // Silent error handling - price update failed
        console.error('❌ [FX Options Expiry] Error processing price update:', error);
      }
    };

    // Connect to WebSocket
    const connectWebSocket = async () => {
      try {
        console.log('🔗 [FX Options Expiry] Setting up WebSocket connection...');
        
        // Register callbacks
        tradingViewWebSocket.onPriceUpdate(handlePriceUpdate);
        tradingViewWebSocket.onConnectionStatus(handleConnectionStatus);
        
        // Connect
        await tradingViewWebSocket.connect();

        // Subscribe to currency pairs - batching is handled by the WebSocket manager
        const symbols = currencyPairs.map(cp => cp.pair);
        console.log('📊 [FX Options Expiry] Subscribing to symbols:', symbols);
        tradingViewWebSocket.subscribe(symbols);
      } catch (error) {
        console.error('❌ [FX Options Expiry] WebSocket connection failed:', error);
        setConnectionStatus('error');
        // Don't throw - allow widget to function without WebSocket
      }
    };

    connectWebSocket();

    // Cleanup on unmount
    return () => {
      console.log('🧹 [FX Options Expiry] Cleaning up WebSocket...');
      const symbols = currencyPairs.map(cp => cp.pair);
      tradingViewWebSocket.unsubscribe(symbols);
      tradingViewWebSocket.removePriceUpdateCallback(handlePriceUpdate);
      tradingViewWebSocket.removeConnectionStatusCallback(handleConnectionStatus);
      // Don't disconnect - other widgets might be using it
    };
  }, []);
        
  // Monitor price changes for flash animation
  useEffect(() => {
    if (Object.keys(previousPrices).length === 0) {
      setPreviousPrices(currentPrices);
      return;
    }

    currencyPairs.forEach(({ pair }) => {
      const prevPrice = previousPrices[pair];
      const currentPrice = currentPrices[pair];
      
      if (prevPrice !== undefined && currentPrice !== undefined && prevPrice !== currentPrice) {
        const direction = currentPrice > prevPrice ? "up" : "down";
        setPriceDirections((prev) => ({ ...prev, [pair]: direction }));
        setFlashingPairs((prev) => new Set(prev).add(pair));
        
        setTimeout(() => {
          setFlashingPairs((prev) => {
            const newSet = new Set(prev);
            newSet.delete(pair);
            return newSet;
          });
        }, 600);
      }
    });

    setPreviousPrices(currentPrices);
  }, [currentPrices, previousPrices]);

  const formatPrice = (pair: string, price: number) => {
    if (price === undefined || price === null || isNaN(price)) {
      return "—";
    }
    // USDJPY uses 2-3 decimal places, others use 4-5
    const decimals = pair === "USDJPY" ? 3 : 5;
    return price.toFixed(decimals);
  };

  // Get strike prices for selected pair from the latest expiry date only
  // If the latest expiry doesn't have data, return empty array (don't show previous days)
  const getStrikePrices = (pair: string): number[] => {
    // Only check the first expiry date (latest/most recent)
    // If it doesn't have data for this pair, return empty array
    if (expiryData.length === 0) {
      return [];
    }
    
    const latestExpiry = expiryData[0];
    const options = latestExpiry.pairs[pair] || [];
    
    // Only return strikes if the latest expiry has data for this pair
    if (options.length === 0) {
      return [];
    }
    
    // Get strikes from the latest expiry only
    return options.map(option => option.strike).sort((a, b) => a - b);
  };

  // Fetch historical candlestick data for selected pair
  useEffect(() => {
    if (!selectedPair) {
      setCandlestickData([]);
      return;
    }

    const fetchCandlestickData = async () => {
      setChartLoading(true);
      setChartError(null);
      
      try {
        const now = Math.floor(Date.now() / 1000);
        const daysAgo = 7; // Show last 7 days
        const from = now - (daysAgo * 24 * 60 * 60);
        
        const response = await fetch('/api/pmt/getIQFeedHistoricalData', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            sym: selectedPair,
            res: "4h", // 4 hour resolution
            frm: from.toString(),
            to: now.toString(),
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch candlestick data: ${response.statusText}`);
        }

        const result = await response.json();
        const rawCandleData: any[] = Array.isArray(result) ? result : (result?.data || []);
        
        if (rawCandleData.length === 0) {
          setCandlestickData([]);
          return;
        }

        // Transform API data to CandleData format
        const transformedCandles: CandleData[] = rawCandleData.map((candle: any, index: number) => {
          const open = parseFloat(String(candle.open || candle.Open || '0'));
          const high = parseFloat(String(candle.high || candle.High || '0'));
          const low = parseFloat(String(candle.low || candle.Low || '0'));
          const close = parseFloat(String(candle.close || candle.Close || '0'));
          
          // Convert time to Unix timestamp
          let time: number;
          const datetimeStr = candle.datetime || candle.time;
          if (datetimeStr && typeof datetimeStr === 'string') {
            const date = new Date(datetimeStr);
            if (!isNaN(date.getTime())) {
              time = Math.floor(date.getTime() / 1000);
            } else {
              const resolution = 14400; // 4 hours in seconds
              time = from + (index * resolution);
            }
          } else {
            const resolution = 14400; // 4 hours in seconds
            time = from + (index * resolution);
          }

          return {
            time,
            open,
            high,
            low,
            close,
          };
        }).filter(c => c.open > 0 && c.high > 0 && c.low > 0 && c.close > 0 && c.time > 0);

        // Sort by time ascending
        transformedCandles.sort((a, b) => a.time - b.time);
        setCandlestickData(transformedCandles);
      } catch (err) {
        console.error('Error fetching candlestick data:', err);
        setChartError(err instanceof Error ? err.message : 'Failed to fetch chart data');
      } finally {
        setChartLoading(false);
      }
    };

    fetchCandlestickData();
  }, [selectedPair]);

  // Initialize chart when container is available
  useEffect(() => {
    if (!selectedPair || chartRef.current) return;

    // Wait for container to be rendered in DOM
    const initializeChart = () => {
      const container = chartContainerRef.current;
      if (!container) {
        // Container not yet in DOM, try again on next frame
        requestAnimationFrame(initializeChart);
        return;
      }

      // Double-check chart doesn't already exist
      if (chartRef.current) return;

      // Create chart
      chartRef.current = createChart(container, {
        layout: {
          background: { color: '#0b0f14' },
          textColor: '#9ca3af',
        },
        grid: {
          vertLines: { color: '#1C2227' },
          horzLines: { color: '#1C2227' },
        },
        rightPriceScale: {
          borderColor: '#374151',
          visible: true,
          scaleMargins: {
            top: 0.1,
            bottom: 0.1,
          },
        },
        timeScale: {
          rightOffset: 2,
          fixLeftEdge: true,
          borderColor: '#374151',
          timeVisible: true,
          secondsVisible: false,
          hoursVisible: true,
        },
        crosshair: {
          mode: 1,
          vertLine: {
            width: 1,
            color: '#FFB02E',
            style: 2,
          },
          horzLine: {
            width: 1,
            color: '#FFB02E',
            style: 2,
          },
        },
        autoSize: true,
      });

      // Add candlestick series with 4-5 decimal places
      const decimals = selectedPair === "USDJPY" ? 3 : 5;
      candlestickSeriesRef.current = chartRef.current.addCandlestickSeries({
        upColor: '#22c55e',
        downColor: '#ef4444',
        borderVisible: true,
        borderUpColor: '#22c55e',
        borderDownColor: '#ef4444',
        wickUpColor: '#22c55e',
        wickDownColor: '#ef4444',
        priceLineVisible: false,
        lastValueVisible: false,
        priceFormat: {
          type: 'price',
          precision: decimals,
          minMove: decimals === 3 ? 0.001 : 0.0001,
        },
      });

      // Handle resize
      resizeObserverRef.current = new ResizeObserver(() => {
        if (chartRef.current && container) {
          chartRef.current.applyOptions({ 
            width: container.clientWidth, 
            height: container.clientHeight 
          });
          // Update price labels after resize
          setTimeout(() => {
            const updateLabels = (container as any)._updatePriceLabels;
            if (updateLabels && typeof updateLabels === 'function') {
              updateLabels();
            }
          }, 50);
        }
      });

      resizeObserverRef.current.observe(container);
    };

    // Start initialization - wait for next frame to ensure container is in DOM
    requestAnimationFrame(initializeChart);

    // Cleanup on unmount
    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      }
      // Clean up price label overlays
      priceLabelOverlaysRef.current.forEach((overlay) => {
        overlay.remove();
      });
      priceLabelOverlaysRef.current.clear();
      
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
        candlestickSeriesRef.current = null;
        strikeLinesRef.current.clear();
        strikePriceLinesRef.current.clear();
      }
    };
  }, [selectedPair]);

  // Update chart data when candlestick data or strike prices change
  useEffect(() => {
    if (!selectedPair || !chartRef.current || !candlestickSeriesRef.current || candlestickData.length === 0) {
      return;
    }

    // Update candlestick data
    const chartData: CandlestickData[] = candlestickData.map(candle => ({
      time: candle.time as Time,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
    }));

    candlestickSeriesRef.current.setData(chartData);

    // Get strike prices for selected pair and get latest expiry for volume info
    const strikes = getStrikePrices(selectedPair);
    const latestExpiry = expiryData.length > 0 ? expiryData[0] : null;
    const latestExpiryOptions = latestExpiry?.pairs[selectedPair] || [];
    
    // Remove old strike lines and price lines
    strikeLinesRef.current.forEach((series) => {
      chartRef.current?.removeSeries(series);
    });
    strikeLinesRef.current.clear();
    
    strikePriceLinesRef.current.forEach((priceLine) => {
      candlestickSeriesRef.current?.removePriceLine(priceLine);
    });
    strikePriceLinesRef.current.clear();
    
    // Remove old price label overlays
    priceLabelOverlaysRef.current.forEach((overlay) => {
      overlay.remove();
    });
    priceLabelOverlaysRef.current.clear();

    // Add new strike lines and price line labels
    if (candlestickData.length > 0) {
      const firstTime = candlestickData[0].time;
      const lastTime = candlestickData[candlestickData.length - 1].time;
      const decimals = selectedPair === "USDJPY" ? 3 : 5;

      strikes.forEach((strike) => {
        // Add horizontal line across the chart
        const lineSeries = chartRef.current!.addLineSeries({
          color: '#FFB02E', // Orange/yellow color for strike lines
          lineWidth: 1,
          lineStyle: 2, // Dashed line
          priceLineVisible: false,
          lastValueVisible: false,
          priceFormat: {
            type: 'price',
            precision: decimals,
            minMove: decimals === 3 ? 0.001 : 0.0001,
          },
        });

        lineSeries.setData([
          { time: firstTime as Time, value: strike },
          { time: lastTime as Time, value: strike },
        ]);

        strikeLinesRef.current.set(strike, lineSeries);

        // Add price line for y-axis label
        const priceLine = candlestickSeriesRef.current!.createPriceLine({
          price: strike,
          color: '#FFB02E',
          lineWidth: 1,
          lineStyle: 2, // Dashed
          axisLabelVisible: true,
          axisLabelColor: '#FFB02E',
        });
        
        strikePriceLinesRef.current.set(strike, priceLine);
      });
      
      // Function to update price label overlays
      const updatePriceLabels = () => {
        if (!chartRef.current || !chartContainerRef.current) return;
        
        // Remove old overlays first
        priceLabelOverlaysRef.current.forEach((overlay) => {
          overlay.remove();
        });
        priceLabelOverlaysRef.current.clear();
        
        const container = chartContainerRef.current;
        const priceScale = chartRef.current.priceScale('right');
        
        // Wait for chart to finish rendering
        requestAnimationFrame(() => {
          strikes.forEach((strike) => {
            try {
              // Use lightweight-charts coordinate conversion
              const coordinate = priceScale.priceToCoordinate(strike);
              if (coordinate === null) return;
              
              // Create overlay element
              const overlay = document.createElement('div');
              overlay.style.position = 'absolute';
              overlay.style.right = '4px';
              overlay.style.top = `${coordinate - 10}px`;
              overlay.style.backgroundColor = '#9333EA'; // Purple background
              overlay.style.color = '#FFFFFF';
              overlay.style.padding = '2px 6px';
              overlay.style.borderRadius = '3px';
              overlay.style.fontSize = '11px';
              overlay.style.fontWeight = '600';
              overlay.style.pointerEvents = 'none';
              overlay.style.zIndex = '100';
              overlay.style.whiteSpace = 'nowrap';
              overlay.textContent = strike.toFixed(decimals);
              
              if (container.style.position !== 'relative') {
                container.style.position = 'relative';
              }
              container.appendChild(overlay);
              priceLabelOverlaysRef.current.set(strike, overlay);
            } catch (e) {
              // Ignore errors if price is out of range
            }
          });
        });
      };
      
      // Initial update after a short delay to ensure chart is rendered
      setTimeout(updatePriceLabels, 200);
      
      // Update labels when chart resizes (using existing resize observer)
      const existingObserver = resizeObserverRef.current;
      if (existingObserver && chartContainerRef.current) {
        const originalObserve = existingObserver.observe.bind(existingObserver);
        // The resize observer will handle updates, but we'll also update labels
        const updateOnResize = () => {
          setTimeout(updatePriceLabels, 50);
        };
        // Store update function to call it later
        (chartContainerRef.current as any)._updatePriceLabels = updatePriceLabels;
      }
    }

    // Fit content
    if (chartRef.current) {
      chartRef.current.timeScale().fitContent();
      chartRef.current.priceScale('right').applyOptions({
        autoScale: true,
      });
    }
  }, [candlestickData, selectedPair, expiryData]);

  return (
    <div className="h-full w-full flex flex-col bg-widget border border-border rounded-sm overflow-hidden">
      <WidgetHeader
        title="Options Expiry"
        onSettings={onSettings}
        onRemove={onRemove}
        onFullscreen={onFullscreen}
        helpContent="FX Options Expiry displays upcoming expiry dates and strike prices with their corresponding notional amounts across major currency pairs."
      >
        {/* WebSocket Connection Status Indicator */}
        <div className="flex items-center gap-1 mr-2">
          <div 
            className={`w-2 h-2 rounded-full ${
              connectionStatus === 'connected' ? 'bg-green-500' :
              connectionStatus === 'connecting' ? 'bg-yellow-500' :
              connectionStatus === 'error' ? 'bg-red-500' :
              'bg-gray-500'
            }`}
            title={`WebSocket: ${connectionStatus}`}
          />
          {connectionStatus === 'connected' && (
            <span className="text-xs text-green-500 hidden sm:inline">Live</span>
          )}
        </div>
      </WidgetHeader>

      {/* Main Content: Split layout when pair is selected */}
      <div className={`flex-1 flex ${selectedPair ? 'flex-row' : 'flex-col'} overflow-hidden`}>
        {/* Table Section */}
        <div className={`${selectedPair ? 'w-1/2 border-r border-border' : 'w-full'} flex flex-col overflow-hidden`}>
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <span className="text-sm text-muted-foreground">Loading options expiry data...</span>
            </div>
          ) : error ? (
            <div className="flex-1 flex items-center justify-center">
              <span className="text-sm text-destructive">Error: {error}</span>
            </div>
          ) : (
            <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 z-10">
            {/* Currency Pair Headers */}
            <tr className="bg-widget-header border-b border-border">
              <th className="text-left px-3 py-2 border-r border-border w-[120px]">
                      <span className="text-xs text-muted-foreground uppercase tracking-wider">Expiry Date</span>
              </th>
              {currencyPairs.map((item) => (
                      <th 
                        key={item.pair} 
                        className={`text-center px-3 py-2 border-r border-border last:border-r-0 min-w-[140px] cursor-pointer transition-colors ${
                          selectedPair === item.pair 
                            ? 'bg-primary/20 hover:bg-primary/30' 
                            : 'hover:bg-background/50'
                        }`}
                        onClick={() => setSelectedPair(selectedPair === item.pair ? null : item.pair)}
                      >
                  <div className="flex items-center justify-center gap-1.5">
                          <span className="text-base">{item.flag}</span>
                          <span className={`text-sm uppercase tracking-wide ${
                            selectedPair === item.pair ? 'text-primary font-semibold' : 'text-primary'
                          }`}>
                            {item.pair}
                          </span>
                  </div>
                </th>
              ))}
            </tr>

            {/* Current Price Row */}
                  <tr className="bg-background/30 border-b-2 border-border">
              <td className="px-3 py-2 border-r border-border">
                      <span className="text-xs text-muted-foreground uppercase tracking-wider">Current Price</span>
              </td>
              {currencyPairs.map((item) => (
                <td key={item.pair} className="text-center px-3 py-2 border-r border-border last:border-r-0">
                  <div className="inline-block bg-slate-500/10 rounded px-2 py-1">
                    <span 
                            className={`text-base text-foreground tabular-nums transition-all duration-300 ${
                        flashingPairs.has(item.pair)
                          ? priceDirections[item.pair] === "up"
                            ? "text-green-400 scale-110"
                            : "text-red-400 scale-110"
                          : ""
                      }`}
                      style={{
                        animation: flashingPairs.has(item.pair)
                          ? priceDirections[item.pair] === "up"
                            ? "flashGreen 0.6s ease-out"
                            : "flashRed 0.6s ease-out"
                          : "none",
                      }}
                    >
                      {formatPrice(item.pair, currentPrices[item.pair])}
                    </span>
                  </div>
                </td>
              ))}
            </tr>
          </thead>

          <tbody>
            {expiryData.map((expiry, idx) => (
                    <tr key={idx} className="border-b border-border hover:bg-background/30">
                      <td className="px-3 py-2.5 border-r border-border bg-background/20">
                  <div className="flex flex-col">
                          <span className="text-base text-foreground font-semibold">{expiry.day}</span>
                          <span className="text-sm text-muted-foreground font-semibold">{expiry.date}</span>
                  </div>
                </td>
                {currencyPairs.map((item) => {
                  const options = expiry.pairs[item.pair] || [];
                  return (
                    <td key={item.pair} className="px-3 py-2.5 border-r border-border last:border-r-0">
                      {options.length > 0 ? (
                        <div className="flex flex-col gap-1.5">
                          {options.map((option, optIdx) => (
                            <div key={optIdx} className="flex items-center justify-between gap-2">
                                    <span className="text-sm text-muted-foreground tabular-nums">
                                {formatPrice(item.pair, option.strike)}
                              </span>
                              <div className="bg-primary/10 rounded px-2 py-0.5">
                                      <span className={`text-sm text-primary tabular-nums ${option.amount.includes('bn') ? 'font-semibold' : ''}`}>
                                  {option.amount}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div 
                          className="h-full flex items-center justify-center min-h-[40px]"
                          style={{
                            backgroundImage: `repeating-linear-gradient(
                              45deg,
                              transparent,
                              transparent 5px,
                              rgba(120, 120, 120, 0.18) 5px,
                              rgba(120, 120, 120, 0.18) 10px
                            )`
                          }}
                        >
                                <span className="text-xs text-muted-foreground/40">—</span>
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
            </div>
          )}
        </div>

        {/* Chart Section - Only show when pair is selected */}
        {selectedPair && (
          <div className="w-1/2 flex flex-col border-l border-border">
            <div className="px-3 py-2 border-b border-border bg-widget-header flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-primary uppercase font-semibold">{selectedPair}</span>
                <span className="text-xs text-muted-foreground">Strike Prices</span>
              </div>
              <button
                onClick={() => setSelectedPair(null)}
                className="text-xs text-muted-foreground hover:text-foreground px-2 py-1"
              >
                ✕ Close
              </button>
            </div>
            <div className="flex-1 relative overflow-hidden">
              {chartLoading ? (
                <div className="flex items-center justify-center h-full">
                  <span className="text-sm text-muted-foreground">Loading chart...</span>
                </div>
              ) : chartError ? (
                <div className="flex items-center justify-center h-full">
                  <span className="text-sm text-red-400">Error: {chartError}</span>
                </div>
              ) : candlestickData.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <span className="text-sm text-muted-foreground">No chart data available</span>
                </div>
              ) : (
                <div ref={chartContainerRef} className="w-full h-full" />
              )}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes flashGreen {
          0%, 100% { background-color: transparent; }
          50% { background-color: rgba(16, 185, 129, 0.2); }
        }
        @keyframes flashRed {
          0%, 100% { background-color: transparent; }
          50% { background-color: rgba(239, 68, 68, 0.2); }
        }
      `}</style>
    </div>
  );
}

export default FXOptionsExpiry;


