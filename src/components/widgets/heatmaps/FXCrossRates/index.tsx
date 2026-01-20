"use client";

import React, { useState, useEffect, useRef } from 'react';
import { WidgetHeader } from '@/components/bloomberg-ui/WidgetHeader';
import tradingViewWebSocket from '@/utils/tradingViewWebSocket';
import { ConnectionStatusCallback } from '@/utils/tradingViewWebSocket';

interface Props { 
  onRemove?: () => void;
  onSettings?: () => void;
  onFullscreen?: () => void;
  settings?: Record<string, unknown>;
}

const CURRENCIES = [
  { code: "EUR", name: "Euro", flag: "🇪🇺" },
  { code: "USD", name: "US Dollar", flag: "🇺🇸" },
  { code: "JPY", name: "Japanese Yen", flag: "🇯🇵" },
  { code: "GBP", name: "British Pound", flag: "🇬🇧" },
  { code: "CHF", name: "Swiss Franc", flag: "🇨🇭" },
  { code: "AUD", name: "Australian Dollar", flag: "🇦🇺" },
  { code: "CAD", name: "Canadian Dollar", flag: "🇨🇦" },
  { code: "NZD", name: "New Zealand Dollar", flag: "🇳🇿" },
];

interface RateData {
  base: string;
  quote: string;
  rate: number;
  flash: "up" | "down" | null;
}

// Generate all major currency pair symbols to subscribe to via websocket
// These are all possible combinations of the 8 currencies in the grid
const generateAllSymbols = (): string[] => {
  // Include all pairs for the 8 currencies: EUR, USD, JPY, GBP, CHF, AUD, CAD, NZD
  // This ensures we get real-time updates for all pairs displayed in the grid
  const majorPairs = [
    // Major EUR pairs (7 pairs)
    'EURUSD', 'EURGBP', 'EURJPY', 'EURCHF', 'EURAUD', 'EURCAD', 'EURNZD',
    // Major USD pairs (6 pairs, EURUSD already counted)
    'USDJPY', 'USDCAD', 'USDCHF', 'AUDUSD', 'NZDUSD', 'GBPUSD',
    // Major GBP pairs (5 pairs, EURGBP and GBPUSD already counted)
    'GBPJPY', 'GBPCHF', 'GBPAUD', 'GBPCAD', 'GBPNZD',
    // Major JPY pairs (4 pairs, EURJPY, USDJPY, GBPJPY already counted)
    'AUDJPY', 'CADJPY', 'CHFJPY', 'NZDJPY',
    // Major AUD pairs (3 pairs, EURAUD, USDAUD, GBPAUD, AUDJPY already counted)
    'AUDCAD', 'AUDCHF', 'AUDNZD',
    // Major CAD pairs (2 pairs, EURCAD, USDCAD, GBPCAD, CADJPY, AUDCAD already counted)
    'CADCHF', 'CADNZD',
    // Major CHF pairs (1 pair, EURCHF, USDCHF, GBPCHF, CHFJPY, AUDCHF, CADCHF already counted)
    'CHFNZD',
    // Major NZD pairs (already all counted: EURNZD, USDNZD, GBPNZD, NZDJPY, AUDNZD, NZDCAD, NZDCHF, CADNZD, CHFNZD)
    // Total: 7 + 6 + 5 + 4 + 3 + 2 + 1 = 28 unique pairs
  ];
  
  // Remove duplicates and return
  return Array.from(new Set(majorPairs));
};

export function FXCrossRatesWidget({ 
  onRemove,
  onSettings,
  onFullscreen
}: Props) {
  const [rates, setRates] = useState<Record<string, RateData>>({});
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const flashTimeoutRef = useRef<Record<string, NodeJS.Timeout>>({});
  const allSymbols = generateAllSymbols();
  const initialFetchedRef = useRef(false);

  // Fetch initial rates from TradingView API to avoid showing "---" on launch
  // Only fetch the most liquid pairs to minimize API calls
  useEffect(() => {
    const fetchInitialRates = async () => {
      if (initialFetchedRef.current) return;
      initialFetchedRef.current = true;

      try {
        const now = Math.floor(Date.now() / 1000);
        const startOfToday = Math.floor(now / (24 * 60 * 60)) * (24 * 60 * 60);
        
        // Only fetch most critical pairs - these will populate the entire grid via inverse calculations
        const criticalPairs = ['EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD', 'NZDUSD'];
        
        // Fetch latest price for critical pairs only
        const fetchPromises = criticalPairs.map(async (symbol) => {
          try {
            const response = await fetch('/api/pmt/getIQFeedHistoricalData', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({
                sym: symbol,
                res: '1h',
                frm: startOfToday,
                to: now
              }),
            });

            if (!response.ok) return null;

            const result = await response.json();
            
            // Handle both direct array and wrapped responses
            const data = Array.isArray(result) ? result : (result?.data || []);
            
            if (!Array.isArray(data) || data.length === 0) return null;

            // Get the last candle's close price
            const lastCandle = data[data.length - 1];
            const price = parseFloat(lastCandle?.close || lastCandle?.Close || '');

            if (isNaN(price) || price === 0) return null;

            return { symbol, price };
          } catch (error) {
            return null;
          }
        });

        const results = await Promise.all(fetchPromises);
        
        // Build initial rates from fetched data
        const initialRates: Record<string, RateData> = {};
        
        results.forEach((result) => {
          if (!result) return;

          const baseCurrency = result.symbol.substring(0, 3);
          const quoteCurrency = result.symbol.substring(3, 6);
          const key = `${baseCurrency}/${quoteCurrency}`;

          initialRates[key] = {
            base: baseCurrency,
            quote: quoteCurrency,
            rate: result.price,
            flash: null,
          };
        });

        // Populate all remaining pairs using direct inverses and cross-rate calculations
        // This allows us to fill the entire grid from just 6 API calls
        Object.keys(initialRates).forEach((key) => {
          const [base, quote] = key.split('/');
          const inverseKey = `${quote}/${base}`;
          
          // Add inverse pair
          if (!initialRates[inverseKey] && initialRates[key] && initialRates[key].rate > 0) {
            initialRates[inverseKey] = {
              base: quote,
              quote: base,
              rate: 1 / initialRates[key].rate,
              flash: null,
            };
          }
        });
        
        // Calculate cross rates for remaining pairs (e.g., EUR/GBP = EUR/USD * USD/GBP)
        CURRENCIES.forEach((base) => {
          CURRENCIES.forEach((quote) => {
            const key = `${base.code}/${quote.code}`;
            
            // Skip if already exists or is diagonal
            if (initialRates[key] || base.code === quote.code) return;
            
            // Try to calculate via USD as intermediary
            if (base.code !== 'USD' && quote.code !== 'USD') {
              const baseUSDKey = `${base.code}/USD`;
              const quoteUSDKey = `${quote.code}/USD`;
              const usdBaseKey = `USD/${base.code}`;
              const usdQuoteKey = `USD/${quote.code}`;
              
              // Case 1: Both have USD quotes
              if (initialRates[baseUSDKey] && initialRates[quoteUSDKey]) {
                initialRates[key] = {
                  base: base.code,
                  quote: quote.code,
                  rate: initialRates[baseUSDKey].rate / initialRates[quoteUSDKey].rate,
                  flash: null,
                };
              }
              // Case 2: Both have USD bases
              else if (initialRates[usdBaseKey] && initialRates[usdQuoteKey]) {
                initialRates[key] = {
                  base: base.code,
                  quote: quote.code,
                  rate: initialRates[usdBaseKey].rate / initialRates[usdQuoteKey].rate,
                  flash: null,
                };
              }
              // Case 3: One has USD base, other has USD quote
              else if (initialRates[baseUSDKey] && initialRates[usdQuoteKey]) {
                initialRates[key] = {
                  base: base.code,
                  quote: quote.code,
                  rate: initialRates[baseUSDKey].rate * initialRates[usdQuoteKey].rate,
                  flash: null,
                };
              }
              else if (initialRates[usdBaseKey] && initialRates[quoteUSDKey]) {
                initialRates[key] = {
                  base: base.code,
                  quote: quote.code,
                  rate: initialRates[usdBaseKey].rate / initialRates[quoteUSDKey].rate,
                  flash: null,
                };
              }
            }
          });
        });

        setRates(initialRates);
      } catch (error) {
        // Silent error - will show "---" until WebSocket data arrives
      }
    };

    fetchInitialRates();
  }, []);

  // WebSocket connection and subscription
  useEffect(() => {
    const handleConnectionStatus: ConnectionStatusCallback = (status) => {
      setConnectionStatus(status);
    };

    const handlePriceUpdate = (data: Record<string, unknown>) => {
      try {
        const symbol = String(data.symbol || data.Symbol || data.S || data.s || '').toUpperCase();
        const price = parseFloat(String(data.price || data.Price || data.last || data.Last || data.close || data.Close || data.c || 0));
        
        if (!symbol || symbol.length < 6 || !price || isNaN(price) || price <= 0) {
          return;
        }

        // Extract base and quote currencies from symbol (e.g., "EURUSD" -> base: "EUR", quote: "USD")
        const baseCurrency = symbol.substring(0, 3);
        const quoteCurrency = symbol.substring(3, 6);
        const key = `${baseCurrency}/${quoteCurrency}`;

        setRates((prevRates) => {
          const currentRate = prevRates[key];
          const newRate = price;
          
          // Determine flash direction
          let flash: "up" | "down" | null = null;
          if (currentRate && currentRate.rate > 0) {
            flash = newRate > currentRate.rate ? "up" : newRate < currentRate.rate ? "down" : null;
          }

          // Clear previous timeout for this key
          if (flashTimeoutRef.current[key]) {
            clearTimeout(flashTimeoutRef.current[key]);
          }

          // Clear flash after animation (longer duration for better visibility)
          if (flash) {
            flashTimeoutRef.current[key] = setTimeout(() => {
              setRates((prev) => {
                if (prev[key]) {
                  return {
                    ...prev,
                    [key]: { ...prev[key], flash: null },
                  };
                }
                return prev;
              });
            }, 600); // Increased from 400ms to 600ms for better visibility
          }

          // Update the direct pair
          const updatedRates: Record<string, RateData> = {
            ...prevRates,
            [key]: {
              base: baseCurrency,
              quote: quoteCurrency,
              rate: newRate,
              flash: flash || (currentRate?.flash || null),
            },
          };

          // Also update the inverse pair if it exists
          const inverseKey = `${quoteCurrency}/${baseCurrency}`;
          if (prevRates[inverseKey] && newRate > 0) {
            const inverseRate = 1 / newRate;
            const inverseCurrentRate = prevRates[inverseKey].rate;
            const inverseFlash = inverseRate > inverseCurrentRate ? "up" : inverseRate < inverseCurrentRate ? "down" : null;
            
            updatedRates[inverseKey] = {
              ...prevRates[inverseKey],
              rate: inverseRate,
              flash: inverseFlash || prevRates[inverseKey].flash,
            };

            // Clear flash for inverse pair too
            if (inverseFlash && flashTimeoutRef.current[inverseKey]) {
              clearTimeout(flashTimeoutRef.current[inverseKey]);
            }
            if (inverseFlash) {
              flashTimeoutRef.current[inverseKey] = setTimeout(() => {
                setRates((prev) => {
                  if (prev[inverseKey]) {
                    return {
                      ...prev,
                      [inverseKey]: { ...prev[inverseKey], flash: null },
                    };
                  }
                  return prev;
                });
              }, 600);
            }
          }

          // Recalculate cross rates that depend on this pair (only for USD pairs to avoid excessive recalculations)
          // This ensures related cross rates update when major USD pairs change
          if (baseCurrency === 'USD' || quoteCurrency === 'USD') {
            CURRENCIES.forEach((base) => {
              CURRENCIES.forEach((quote) => {
                if (base.code === quote.code) return;
                
                const crossKey = `${base.code}/${quote.code}`;
                
                // Skip if this is the direct pair or inverse we already updated
                if (crossKey === key || crossKey === inverseKey) return;
                
                // Only recalculate if the pair doesn't exist or has no valid rate
                // This avoids overriding direct websocket rates with calculated ones
                if (updatedRates[crossKey] && updatedRates[crossKey].rate > 0) {
                  // Check if this is a direct pair (one we subscribe to)
                  const isDirectPair = allSymbols.some(sym => {
                    const symBase = sym.substring(0, 3);
                    const symQuote = sym.substring(3, 6);
                    return (symBase === base.code && symQuote === quote.code) ||
                           (symBase === quote.code && symQuote === base.code);
                  });
                  // Skip if it's a direct pair (will be updated by websocket)
                  if (isDirectPair) return;
                }
                
                // Try to calculate via USD as intermediary
                if (base.code !== 'USD' && quote.code !== 'USD') {
                  const baseUSDKey = `${base.code}/USD`;
                  const quoteUSDKey = `${quote.code}/USD`;
                  const usdBaseKey = `USD/${base.code}`;
                  const usdQuoteKey = `USD/${quote.code}`;
                  
                  // Case 1: Both have USD quotes
                  if (updatedRates[baseUSDKey] && updatedRates[quoteUSDKey] && 
                      updatedRates[baseUSDKey].rate > 0 && updatedRates[quoteUSDKey].rate > 0) {
                    updatedRates[crossKey] = {
                      base: base.code,
                      quote: quote.code,
                      rate: updatedRates[baseUSDKey].rate / updatedRates[quoteUSDKey].rate,
                      flash: null,
                    };
                  }
                  // Case 2: Both have USD bases
                  else if (updatedRates[usdBaseKey] && updatedRates[usdQuoteKey] &&
                           updatedRates[usdBaseKey].rate > 0 && updatedRates[usdQuoteKey].rate > 0) {
                    updatedRates[crossKey] = {
                      base: base.code,
                      quote: quote.code,
                      rate: updatedRates[usdBaseKey].rate / updatedRates[usdQuoteKey].rate,
                      flash: null,
                    };
                  }
                  // Case 3: One has USD base, other has USD quote
                  else if (updatedRates[baseUSDKey] && updatedRates[usdQuoteKey] &&
                           updatedRates[baseUSDKey].rate > 0 && updatedRates[usdQuoteKey].rate > 0) {
                    updatedRates[crossKey] = {
                      base: base.code,
                      quote: quote.code,
                      rate: updatedRates[baseUSDKey].rate * updatedRates[usdQuoteKey].rate,
                      flash: null,
                    };
                  }
                  else if (updatedRates[usdBaseKey] && updatedRates[quoteUSDKey] &&
                           updatedRates[usdBaseKey].rate > 0 && updatedRates[quoteUSDKey].rate > 0) {
                    updatedRates[crossKey] = {
                      base: base.code,
                      quote: quote.code,
                      rate: updatedRates[usdBaseKey].rate / updatedRates[quoteUSDKey].rate,
                      flash: null,
                    };
                  }
                }
              });
            });
          }

          return updatedRates;
        });
      } catch (error) {
        // Silent error handling - price update failed
        console.error('[FXCrossRates] Error handling price update:', error);
      }
    };

    // Connect to WebSocket
    const connectWebSocket = async () => {
      try {
        // Register callbacks
        tradingViewWebSocket.onPriceUpdate(handlePriceUpdate);
        tradingViewWebSocket.onConnectionStatus(handleConnectionStatus);

        // Connect
        await tradingViewWebSocket.connect();

        // Subscribe to all currency pairs - batching is handled by the WebSocket manager
        tradingViewWebSocket.subscribe(allSymbols);

        setConnectionStatus('connected');
      } catch (error) {
        setConnectionStatus('error');
      }
    };

    connectWebSocket();

    // Cleanup
    return () => {
      // Clear all flash timeouts
      Object.values(flashTimeoutRef.current).forEach(clearTimeout);
      
      // Unsubscribe and remove callbacks
      tradingViewWebSocket.unsubscribe(allSymbols);
      tradingViewWebSocket.removePriceUpdateCallback(handlePriceUpdate);
      tradingViewWebSocket.removeConnectionStatusCallback(handleConnectionStatus);
      
      // Note: Don't call disconnect() here - let other widgets keep using it
    };
  }, []); // Empty dependency array - only run once on mount

  const formatRate = (rate: number, quoteCurrency: string) => {
    // JPY rates need different precision
    if (quoteCurrency === "JPY") {
      return rate.toFixed(3);
    } else if (rate < 0.01) {
      return rate.toFixed(6);
    } else if (rate < 1) {
      return rate.toFixed(5);
    } else {
      return rate.toFixed(5);
    }
  };

  const getCellClass = (flash: "up" | "down" | null) => {
    if (flash === "up") {
      return "fx-flash-up";
    } else if (flash === "down") {
      return "fx-flash-down";
    }
    return "";
  };

  return (
    <div className="flex flex-col h-full bg-widget-body border border-border rounded-none overflow-hidden">
      {/* Header */}
      <WidgetHeader
        title="FX Cross Rates"
        onRemove={onRemove}
        onFullscreen={onFullscreen}
        helpContent="Real-time foreign exchange cross rates matrix. Green flash indicates price increase, red flash indicates price decrease."
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

      <div className="flex-1 overflow-auto custom-scrollbar min-h-0">
        <style>{`
          @keyframes flashGreen {
            0%, 100% { 
              background-color: transparent; 
            }
            50% { 
              background-color: rgba(34, 197, 94, 0.25); 
            }
          }
          @keyframes flashRed {
            0%, 100% { 
              background-color: transparent; 
            }
            50% { 
              background-color: rgba(239, 68, 68, 0.25); 
            }
          }
          .fx-flash-up {
            animation: flashGreen 0.6s ease-out;
          }
          .fx-flash-down {
            animation: flashRed 0.6s ease-out;
          }
        `}</style>
        <div className="min-w-max h-full">
          <table className="w-full h-full border-collapse">
            {/* Header Row */}
            <thead>
              <tr>
                <th className="sticky top-0 left-0 z-20 bg-widget-header border-b border-r border-border p-2 text-xs text-muted-foreground"></th>
                {CURRENCIES.map((currency) => (
              <th
                key={currency.code}
                className="sticky top-0 z-10 bg-widget-header border-b border-border p-2 text-xs text-foreground font-medium min-w-[90px]"
              >
                <div className="flex items-center justify-center gap-1.5">
                  <span className="text-xl leading-none">{currency.flag}</span>
                  <span className="text-sm uppercase tracking-wide font-bold">{currency.code}</span>
                </div>
              </th>
                ))}
              </tr>
            </thead>

            {/* Body Rows */}
            <tbody>
              {CURRENCIES.map((baseCurrency) => (
                <tr key={baseCurrency.code}>
                  {/* Row Header */}
                  <td className="sticky left-0 z-10 bg-widget-header border-r border-b border-border p-2 text-xs text-foreground font-medium">
                    <div className="flex items-center justify-center gap-1.5">
                      <span className="text-xl leading-none">{baseCurrency.flag}</span>
                      <span className="text-sm uppercase tracking-wide font-bold">{baseCurrency.code}</span>
                    </div>
                  </td>

                  {/* Rate Cells */}
                  {CURRENCIES.map((quoteCurrency) => {
                    if (baseCurrency.code === quoteCurrency.code) {
                      // Diagonal cell (same currency)
                      return (
                        <td
                          key={quoteCurrency.code}
                          className="border-b border-border p-2 text-center bg-muted/20"
                        >
                        </td>
                      );
                    }

                    const key = `${baseCurrency.code}/${quoteCurrency.code}`;
                    const rateData = rates[key];

                    return (
                      <td
                        key={quoteCurrency.code}
                        className={`border-b border-border p-2 text-center transition-all duration-150 hover:bg-primary/10 hover:border-primary/30 cursor-pointer ${getCellClass(
                          rateData?.flash || null
                        )}`}
                      >
                        <span 
                          className={`tabular-nums font-semibold transition-colors duration-300 ${
                            rateData?.flash === "up" 
                              ? "text-green-400" 
                              : rateData?.flash === "down" 
                              ? "text-red-400" 
                              : "text-foreground"
                          }`}
                          style={{
                            fontFamily: 'SF Mono, Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace', 
                            fontSize: '13px',
                            animation: rateData?.flash 
                              ? rateData.flash === "up" 
                                ? "flashGreen 0.6s ease-out" 
                                : "flashRed 0.6s ease-out"
                              : "none"
                          }}
                        >
                          {rateData && typeof rateData.rate === 'number' && !isNaN(rateData.rate) 
                            ? formatRate(rateData.rate, quoteCurrency.code) 
                            : "---"}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default FXCrossRatesWidget;

