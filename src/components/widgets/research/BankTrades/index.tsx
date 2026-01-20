'use client';

import React, { useState, useEffect, useRef } from 'react';
import { TrendingUp, TrendingDown, BarChart3, ChevronDown, ChevronRight } from 'lucide-react';
import { WidgetHeader } from '@/components/bloomberg-ui/WidgetHeader';
import { createChart, ColorType, type IChartApi, type ISeriesApi, type Time } from 'lightweight-charts';
import { 
  fetchBankTradesTable, 
  fetchBankTradesCandles,
  transformApiTradesResponse,
  transformCandlesResponse,
  formatCurrencyForApi,
  type BankTrade,
  type ApiCandleData
} from './api';
import { widgetDataCache } from '@/lib/widgetDataCache';

interface BankTradesProps {
  id: string;
  onRemove: () => void;
  onSettings: () => void;
  onFullscreen?: () => void;
}

export function BankTrades({ id, onRemove, onSettings, onFullscreen }: BankTradesProps) {
  const [trades, setTrades] = useState<BankTrade[]>([]);
  const [selectedChart, setSelectedChart] = useState<string | null>(null);
  const [chartData, setChartData] = useState<Array<{ time: string; price: number; volume: number }>>([]);
  const [rawCandleData, setRawCandleData] = useState<ApiCandleData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingChart, setIsLoadingChart] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedTrade, setExpandedTrade] = useState<string | null>(null);
  const [chartWidth, setChartWidth] = useState(340);
  const [isResizing, setIsResizing] = useState(false);
  const [chartHeight, setChartHeight] = useState<number | null>(null);
  const [minHeight, setMinHeight] = useState<number>(0);

  // Chart refs
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const priceSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const resizeHandleRef = useRef<HTMLDivElement>(null);
  const tableSectionRef = useRef<HTMLDivElement>(null);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active':
        return 'text-green-400';
      case 'Closed':
        return 'text-gray-500';
      case 'Pending':
        return 'text-yellow-400';
      default:
        return 'text-gray-400';
    }
  };

  const formatNumber = (num: number, decimals: number = 4) => {
    return num.toFixed(decimals);
  };

  // Handle resize drag
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      
      const container = chartContainerRef.current?.closest('.flex.flex-1');
      if (!container) return;
      
      const containerRect = container.getBoundingClientRect();
      const newWidth = containerRect.right - e.clientX;
      
      // Constrain width between 200px and 70% of container width
      const minWidth = 200;
      const maxWidth = containerRect.width * 0.7;
      const constrainedWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
      
      setChartWidth(constrainedWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);

  const maxPrice = chartData.length > 0 ? Math.max(...chartData.map(d => d.price)) : 0;
  const minPrice = chartData.length > 0 ? Math.min(...chartData.map(d => d.price)) : 0;
  const currentPrice = chartData[chartData.length - 1]?.price || 0;
  const firstPrice = chartData[0]?.price || 0;
  const priceChange = currentPrice - firstPrice;
  const priceChangePercent = firstPrice > 0 ? (priceChange / firstPrice) * 100 : 0;

  // Convert datetime string to Time for lightweight-charts
  const datetimeToTime = (datetime: string): Time => {
    const date = new Date(datetime);
    return Math.floor(date.getTime() / 1000) as Time;
  };

  // Fetch trades on mount
  useEffect(() => {
    const loadTrades = async () => {
      const cacheKey = widgetDataCache.generateKey('bank-trades-table', {});
      const cachedData = widgetDataCache.get<BankTrade[]>(cacheKey);
      
      if (cachedData) {
        console.log('✅ [Bank Trades Component] Using cached trades:', cachedData.length);
        setTrades(cachedData);
        setFilteredTrades(cachedData);
        setIsLoading(false);
        return;
      }

      console.log('🔄 [Bank Trades Component] Starting to load trades...');
      setIsLoading(true);
      setError(null);
      
      try {
        const apiResponse = await fetchBankTradesTable();
        console.log('🔄 [Bank Trades Component] API response received:', apiResponse);
        
        if (!apiResponse) {
          console.error('❌ [Bank Trades Component] API response is null');
          setError('Failed to load trades: No response');
          setIsLoading(false);
          return;
        }
        
        if (!apiResponse.success) {
          console.error('❌ [Bank Trades Component] API response not successful');
          setError('Failed to load trades: API returned error');
          setIsLoading(false);
          return;
        }
        
        if (!apiResponse.BankTrades) {
          console.error('❌ [Bank Trades Component] No BankTrades in response');
          setError('Failed to load trades: No data');
          setIsLoading(false);
          return;
        }
        
        console.log('✅ [Bank Trades Component] Transforming', apiResponse.BankTrades.length, 'trades');
        const transformed = transformApiTradesResponse(apiResponse.BankTrades);
        console.log('✅ [Bank Trades Component] Transformed trades:', transformed);
        setTrades(transformed);
        
        // Auto-select first trade's chart
        if (transformed.length > 0) {
          console.log('✅ [Bank Trades Component] Auto-selecting first chart:', transformed[0].id);
          setSelectedChart(transformed[0].id);
        }
        
        setIsLoading(false);
      } catch (err) {
        console.error('❌ [Bank Trades Component] Error loading trades:', err);
        setError(err instanceof Error ? err.message : 'Failed to load trades');
        setIsLoading(false);
      }
    };
    
    loadTrades();
  }, []);

  // Fetch chart data when a trade is selected
  useEffect(() => {
    if (!selectedChart) {
      setChartData([]);
      return;
    }
    
    const selectedTrade = trades.find(t => t.id === selectedChart);
    if (!selectedTrade) {
      setChartData([]);
      return;
    }
    
    const loadChartData = async () => {
      const symbol = formatCurrencyForApi(selectedTrade.currency);
      const cacheKey = widgetDataCache.generateKey('bank-trades-candles', { symbol });
      const cachedData = widgetDataCache.get<ApiCandleData[]>(cacheKey);
      
      if (cachedData) {
        const transformed = transformCandlesResponse(cachedData);
        setChartData(transformed);
        setRawCandleData(cachedData);
        setIsLoadingChart(false);
        return;
      }

      setIsLoadingChart(true);
      
      try {
        const apiResponse = await fetchBankTradesCandles(symbol);
        
        if (!apiResponse || !apiResponse.success || !apiResponse.data) {
          setChartData([]);
          setIsLoadingChart(false);
          return;
        }
        
        const transformed = transformCandlesResponse(apiResponse.data);
        setChartData(transformed);
        setRawCandleData(apiResponse.data);
        widgetDataCache.set(cacheKey, apiResponse.data);
        setIsLoadingChart(false);
      } catch (err) {
        console.error('❌ [Bank Trades] Error loading chart data:', err);
        setChartData([]);
        setIsLoadingChart(false);
      }
    };
    
    loadChartData();
  }, [selectedChart, trades]);

  // Calculate minimum height (50vh) on mount and window resize
  useEffect(() => {
    const updateMinHeight = () => {
      setMinHeight(window.innerHeight * 0.5);
    };
    
    updateMinHeight();
    window.addEventListener('resize', updateMinHeight);
    
    return () => {
      window.removeEventListener('resize', updateMinHeight);
    };
  }, []);

  // Update chart height to match table height
  useEffect(() => {
    const updateChartHeight = () => {
      if (!tableSectionRef.current || !selectedChart) {
        setChartHeight(null);
        return;
      }

      // Use requestAnimationFrame to ensure DOM is fully rendered
      requestAnimationFrame(() => {
        if (!tableSectionRef.current) return;
        
        const element = tableSectionRef.current;
        
        // Temporarily remove height constraints to measure natural height
        const savedHeight = element.style.height;
        const savedMaxHeight = element.style.maxHeight;
        element.style.height = 'auto';
        element.style.maxHeight = 'none';
        
        // Force reflow
        void element.offsetHeight;
        
        // Get the natural content height
        const tableRect = element.getBoundingClientRect();
        const naturalHeight = tableRect.height;
        
        // Restore saved styles
        element.style.height = savedHeight;
        element.style.maxHeight = savedMaxHeight;
        
        // Use the larger of natural height or minimum height
        const finalHeight = Math.max(naturalHeight, minHeight);
        
        setChartHeight(finalHeight);
      });
    };

    // Initial measurement with multiple attempts to ensure DOM is ready
    const timeoutId1 = setTimeout(updateChartHeight, 0);
    const timeoutId2 = setTimeout(updateChartHeight, 100);
    const timeoutId3 = setTimeout(updateChartHeight, 300);

    // Update on window resize
    window.addEventListener('resize', updateChartHeight);

    // Update when trades or expanded state changes
    const resizeObserver = new ResizeObserver(() => {
      updateChartHeight();
    });

    if (tableSectionRef.current) {
      resizeObserver.observe(tableSectionRef.current);
    }

    // Also observe the table body for content changes
    const tableBody = tableSectionRef.current?.querySelector('.flex-1.overflow-y-auto');
    if (tableBody) {
      resizeObserver.observe(tableBody);
    }

    return () => {
      clearTimeout(timeoutId1);
      clearTimeout(timeoutId2);
      clearTimeout(timeoutId3);
      window.removeEventListener('resize', updateChartHeight);
      resizeObserver.disconnect();
    };
  }, [selectedChart, trades, expandedTrade, minHeight]);

  // Clean up chart when selectedChart is cleared
  useEffect(() => {
    if (!selectedChart) {
      // Clean up chart when no chart is selected
      if (chartRef.current) {
        try {
          chartRef.current.remove();
        } catch (error) {
          // Ignore cleanup errors
        }
        chartRef.current = null;
      }
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      }
      priceSeriesRef.current = null;
      candlestickSeriesRef.current = null;
      volumeSeriesRef.current = null;
      setRawCandleData([]);
      setChartData([]);
      setChartHeight(null);
    }
  }, [selectedChart]);

  // Initialize chart with lightweight-charts when container and data are available
  useEffect(() => {
    if (!chartContainerRef.current || !selectedChart || rawCandleData.length === 0) return;

    const container = chartContainerRef.current;

    // Clean up existing chart if it exists
    if (chartRef.current) {
      try {
        chartRef.current.remove();
      } catch (error) {
        // Ignore cleanup errors
      }
      chartRef.current = null;
    }

    if (resizeObserverRef.current) {
      resizeObserverRef.current.disconnect();
      resizeObserverRef.current = null;
    }
    
    const chart = createChart(container, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: 'rgba(138, 138, 138, 0.8)',
      },
      grid: {
        vertLines: { color: 'rgba(42, 42, 42, 0.5)', visible: false },
        horzLines: { color: 'rgba(42, 42, 42, 0.5)' },
      },
      rightPriceScale: {
        borderColor: 'rgba(42, 42, 42, 0.8)',
        visible: true,
        autoScale: true,
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
      },
      leftPriceScale: {
        visible: false,
      },
      timeScale: {
        borderColor: 'rgba(42, 42, 42, 0.8)',
        timeVisible: false,
      },
      crosshair: {
        mode: 1,
      },
    });

    chartRef.current = chart;

    // Setup resize observer
    resizeObserverRef.current = new ResizeObserver(entries => {
      if (chart && entries.length > 0) {
        const rect = entries[0].contentRect;
        chart.applyOptions({
          width: rect.width,
          height: rect.height,
        });
      }
    });

    resizeObserverRef.current.observe(container);

    // Remove existing series
    const removeSeriesSafely = (seriesRef: React.MutableRefObject<ISeriesApi<'Line' | 'Candlestick' | 'Histogram'> | null>) => {
      if (seriesRef.current && chart) {
        try {
          chart.removeSeries(seriesRef.current);
        } catch (error) {
          // Ignore errors
        }
        seriesRef.current = null;
      }
    };

    removeSeriesSafely(priceSeriesRef);
    removeSeriesSafely(candlestickSeriesRef);
    removeSeriesSafely(volumeSeriesRef);

    // Sort candles by datetime
    const sortedCandles = [...rawCandleData].sort((a, b) => {
      return new Date(a.datetime).getTime() - new Date(b.datetime).getTime();
    });

    // Create candlestick series
    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderVisible: true,
      borderUpColor: '#22c55e',
      borderDownColor: '#ef4444',
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
      priceScaleId: 'right',
    });
    candlestickSeriesRef.current = candlestickSeries;

    // Convert candles to candlestick data format (OHLC)
    const candlestickData = sortedCandles.map(candle => ({
      time: datetimeToTime(candle.datetime),
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
    }));

    candlestickSeries.setData(candlestickData);

    // Add price lines for entry, stop loss, and take profit
    const selectedTrade = trades.find(t => t.id === selectedChart);
    if (selectedTrade) {
      // Entry line (blue) - dashed and thin
      candlestickSeries.createPriceLine({
        price: selectedTrade.entry,
        color: '#3b82f6',
        lineWidth: 1,
        lineStyle: 2, // Dashed
        axisLabelVisible: true,
        title: 'Entry',
      });

      // Stop Loss line (red) - dashed and thin
      candlestickSeries.createPriceLine({
        price: selectedTrade.stopLoss,
        color: '#ef4444',
        lineWidth: 1,
        lineStyle: 2, // Dashed
        axisLabelVisible: true,
        title: 'Stop Loss',
      });

      // Take Profit line (green) - dashed and thin
      candlestickSeries.createPriceLine({
        price: selectedTrade.takeProfit,
        color: '#22c55e',
        lineWidth: 1,
        lineStyle: 2, // Dashed
        axisLabelVisible: true,
        title: 'Take Profit',
      });
    }

    // Create volume histogram if volume data exists
    const hasVolume = sortedCandles.some(c => c.volume && c.volume > 0);
    if (hasVolume) {
      const volumeSeries = chart.addHistogramSeries({
        color: '#FF6B00',
        priceFormat: {
          type: 'volume',
        },
        priceScaleId: '',
        scaleMargins: {
          top: 0.8,
          bottom: 0,
        },
      });
      volumeSeriesRef.current = volumeSeries;

      const volumeData = sortedCandles.map(candle => ({
        time: datetimeToTime(candle.datetime),
        value: candle.volume || 0,
        color: 'rgba(255, 107, 0, 0.2)',
      }));

      volumeSeries.setData(volumeData);
    }

    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      }
      if (chart) {
        try {
          chart.remove();
        } catch (error) {
          // Ignore cleanup errors
        }
        chartRef.current = null;
      }
    };
  }, [selectedChart, rawCandleData, trades]);

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] text-white">
      <WidgetHeader 
        title="Bank Trades"
        onRemove={onRemove}
        onFullscreen={onFullscreen}
      />
      <div className="flex flex-1 overflow-hidden items-start">
      {/* Table Section */}
      <div ref={tableSectionRef} className="flex-1 flex flex-col min-w-0" style={{ 
        minHeight: minHeight > 0 ? `${minHeight}px` : 'auto',
        height: chartHeight ? `${chartHeight}px` : 'auto',
        maxHeight: chartHeight ? `${chartHeight}px` : 'none',
        overflowY: 'auto'
      }}>
        {/* Table Header */}
        <div className="flex flex-wrap gap-2 px-3 py-2 bg-[#1a1a1a] border-b border-gray-800 text-sm text-gray-400 flex-shrink-0 sticky top-0 z-10">
          <div className="w-[30px] flex-shrink-0"></div>
          <div className="min-w-[120px] flex-1">Name of Bank</div>
          <div className="min-w-[100px] flex-1">Order Type</div>
          <div className="min-w-[80px] flex-1">Currency ▼</div>
          <div className="min-w-[80px] flex-1">Date ▼</div>
          <div className="text-right min-w-[70px] flex-1">Entry</div>
          <div className="text-right min-w-[80px] flex-1">Take Profit</div>
          <div className="text-right min-w-[80px] flex-1">Stop Loss</div>
          <div className="min-w-[70px] flex-1">Status</div>
          <div className="text-center w-[50px] flex-shrink-0">Show chart</div>
        </div>

        {/* Table Body */}
        <div className="flex-1 min-h-0">
          {trades.length === 0 ? (
            <div className="py-8 text-center text-gray-400">
              {isLoading ? 'Loading trades...' : error || 'No trades available'}
            </div>
          ) : (
            trades.map((trade) => (
            <div key={trade.id}>
              {/* Main Row */}
              <div
                className="flex flex-wrap gap-2 px-3 py-2 border-b border-gray-800/50 hover:bg-white/5 transition-colors text-sm items-center cursor-pointer"
                onClick={() => setExpandedTrade(expandedTrade === trade.id ? null : trade.id)}
              >
                <div className="w-[30px] flex-shrink-0 flex justify-center">
                  {expandedTrade === trade.id ? (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  )}
                </div>
                <div className="text-gray-300 min-w-[120px] flex-1">{trade.bank}</div>
                <div className="text-gray-400 min-w-[100px] flex-1">{trade.orderType}</div>
                <div className="text-white min-w-[80px] flex-1">{trade.currency}</div>
                <div className="text-gray-400 min-w-[80px] flex-1">{trade.date}</div>
                <div className="text-right text-white min-w-[70px] flex-1">{formatNumber(trade.entry)}</div>
                <div className="text-right text-white min-w-[80px] flex-1">{formatNumber(trade.takeProfit)}</div>
                <div className="text-right text-white min-w-[80px] flex-1">{formatNumber(trade.stopLoss)}</div>
                <div className={`${getStatusColor(trade.status)} min-w-[70px] flex-1`}>{trade.status}</div>
                <div className="w-[50px] flex-shrink-0 flex justify-center" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => setSelectedChart(selectedChart === trade.id ? null : trade.id)}
                    className={`p-1 rounded transition-colors ${
                      selectedChart === trade.id
                        ? 'bg-[#FF6B00] text-white'
                        : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                    }`}
                  >
                    <BarChart3 className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Expanded Details */}
              {expandedTrade === trade.id && (
                <div className="bg-[#0f0f0f] border-b border-gray-800/50 px-6 py-4">
                  <div className="grid grid-cols-3 gap-4">
                    {/* Trade Details */}
                    <div className="space-y-3 pr-4 border-r border-gray-800/50">
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                        <div className="text-gray-400">Currency Pair</div>
                        <div className="text-white text-right">{trade.currency}</div>
                        
                        {trade.direction && (
                          <>
                            <div className="text-gray-400">
                              <span className={trade.direction === 'Long' ? 'text-blue-400' : 'text-red-400'}>
                                {trade.direction}
                              </span> from
                            </div>
                            <div className="text-white text-right">{formatNumber(trade.entry)}</div>
                          </>
                        )}
                        
                        <div className="text-gray-400">Target</div>
                        <div className="text-white text-right">{formatNumber(trade.takeProfit)}</div>
                        
                        <div className="text-gray-400">Stop/Loss</div>
                        <div className="text-white text-right">{formatNumber(trade.stopLoss)}</div>
                      </div>
                    </div>

                    {/* Latest Rationale */}
                    <div className="pr-4 border-r border-gray-800/50">
                      {trade.riskLevel && (
                        <div className="text-blue-400 mb-2 text-xs">{trade.riskLevel}</div>
                      )}
                      <div className="text-[#FF6B00] mb-2 text-xs">Latest Rationale</div>
                      <div className="text-base text-gray-300 leading-relaxed whitespace-pre-line">
                        {trade.rationale || 'No rationale available from API'}
                      </div>
                    </div>

                    {/* Trade History */}
                    <div className="flex flex-col">
                      <div className="text-[#FF6B00] mb-2 text-xs">Trade History</div>
                      <div className="space-y-2 overflow-y-auto max-h-[200px] pr-2">
                        {trade.tradeHistory && trade.tradeHistory.length > 0 ? (
                          trade.tradeHistory.map((history, idx) => (
                            <div key={idx} className="bg-[#1a1a1a] p-2 rounded">
                              <div className="text-base text-gray-400 mb-1">{history.date}</div>
                              <div className="text-base text-gray-300">{history.description}</div>
                            </div>
                          ))
                        ) : (
                          <div className="text-base text-gray-400 italic">No trade history available from API</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            ))
          )}
        </div>
      </div>

      {/* Resize Handle */}
      {selectedChart && (
        <div
          ref={resizeHandleRef}
          onMouseDown={(e) => {
            e.preventDefault();
            setIsResizing(true);
          }}
          className="w-1 bg-gray-800 hover:bg-[#FF6B00] cursor-col-resize transition-colors flex-shrink-0"
          style={{ 
            minWidth: '4px',
            height: chartHeight ? `${chartHeight}px` : 'auto',
            minHeight: minHeight > 0 ? `${minHeight}px` : 'auto'
          }}
        />
      )}

      {/* Chart Section */}
      {selectedChart && (
        <div 
          className="border-l border-gray-800 bg-[#0f0f0f] flex flex-col flex-shrink-0 overflow-hidden"
          style={{ 
            width: `${chartWidth}px`, 
            minWidth: '200px',
            height: chartHeight ? `${chartHeight}px` : 'auto',
            minHeight: minHeight > 0 ? `${minHeight}px` : 'auto'
          }}
        >
          {/* Chart Header */}
          <div className="px-4 py-3 border-b border-gray-800">
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="text-base text-gray-400">{selectedChart && trades.find(t => t.id === selectedChart)?.currency || '—'}</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-lg text-white">{formatNumber(currentPrice)}</span>
                  <span className={`text-base flex items-center gap-1 ${priceChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {priceChange >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {priceChange >= 0 ? '+' : ''}{formatNumber(priceChange)} ({priceChangePercent >= 0 ? '+' : ''}{priceChangePercent.toFixed(2)}%)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Mini Chart */}
          <div className="flex-1 p-4 relative overflow-hidden">
            {isLoadingChart ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-sm text-gray-400">Loading chart...</div>
              </div>
            ) : (
              <div 
                ref={chartContainerRef} 
                className="w-full h-full" 
                style={{ minHeight: '200px' }}
              />
            )}
          </div>

          {/* Chart Legend */}
          <div className="px-4 py-3 border-t border-gray-800">
            <div className="grid grid-cols-2 gap-2 text-base">
              <div>
                <div className="text-gray-500">High</div>
                <div className="text-white">{formatNumber(maxPrice)}</div>
              </div>
              <div>
                <div className="text-gray-500">Low</div>
                <div className="text-white">{formatNumber(minPrice)}</div>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

export default BankTrades;
