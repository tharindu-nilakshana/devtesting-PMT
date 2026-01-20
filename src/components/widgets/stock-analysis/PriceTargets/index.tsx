'use client';

import React, { useState, useEffect, useRef } from 'react';
import { WidgetHeader } from '@/components/bloomberg-ui/WidgetHeader';
import { WidgetSettingsSlideIn } from '@/components/bloomberg-ui/WidgetSettingsSlideIn';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { createChart, ColorType, type IChartApi, type ISeriesApi, type Time } from 'lightweight-charts';
import { fetchPriceTargets, type PriceTargetsData } from './api';
import { widgetDataCache } from '@/lib/widgetDataCache';

type WidgetSettings = Record<string, unknown>;

interface PriceTargetsProps {
  onSettings?: () => void;
  onRemove?: () => void;
  onFullscreen?: () => void;
  settings?: WidgetSettings;
}

export function PriceTargets({ onSettings, onRemove, onFullscreen, settings = {} }: PriceTargetsProps) {
  const [isSettingsPanelOpen, setIsSettingsPanelOpen] = useState(false);
  const [localSettings, setLocalSettings] = useState(settings);
  
  // State to hold API data
  const [priceTargetsData, setPriceTargetsData] = useState<PriceTargetsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Chart refs
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const historicalSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const highTargetSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const avgTargetSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const lowTargetSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  // Sync localSettings with external settings prop when it changes
  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  // Get symbol and module from localSettings (which updates when user saves from slide-in menu)
  const symbol = (localSettings.symbol as string) || 'NASDAQ:AAL';
  const module = (localSettings.module as string) || 'US Stocks';

  // Fetch price targets data
  useEffect(() => {
    const loadPriceTargets = async () => {
      const cacheKey = widgetDataCache.generateKey('price-targets', { symbol, module });
      const cachedData = widgetDataCache.get<PriceTargetsData>(cacheKey);
      
      if (cachedData) {
        setPriceTargetsData(cachedData);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);
      
      try {
        const data = await fetchPriceTargets(symbol, module);
        if (data) {
          setPriceTargetsData(data);
          widgetDataCache.set(cacheKey, data);
        } else {
          setError('Failed to load price targets data');
        }
      } catch (err) {
        console.error('❌ [Price Targets] Error loading data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setIsLoading(false);
      }
    };

    loadPriceTargets();
  }, [symbol, module]);

  // Calculate upside/downside percentage from API data
  const upside = priceTargetsData 
    ? ((priceTargetsData.targetPriceData.average - priceTargetsData.targetPriceData.current) / priceTargetsData.targetPriceData.current) * 100
    : 0;

  // Initialize chart and update data when priceTargetsData is available
  useEffect(() => {
    if (!chartContainerRef.current || !priceTargetsData) return;

    const container = chartContainerRef.current;
    const historicalPrices = priceTargetsData.historicalPrices;
    
    if (historicalPrices.length === 0) return;

    // Initialize chart if not already created
    if (!chartRef.current) {
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
    }

    const chart = chartRef.current;
    if (!chart) return;

    // Remove existing series (only if they exist and are valid)
    const removeSeriesSafely = (seriesRef: React.MutableRefObject<ISeriesApi<'Line'> | null>) => {
      if (seriesRef.current && chart) {
        try {
          chart.removeSeries(seriesRef.current);
        } catch (error) {
          // Series might not exist or already removed, ignore
          console.warn('⚠️ [Price Targets] Error removing series:', error);
        }
        seriesRef.current = null;
      }
    };

    removeSeriesSafely(historicalSeriesRef);
    removeSeriesSafely(highTargetSeriesRef);
    removeSeriesSafely(avgTargetSeriesRef);
    removeSeriesSafely(lowTargetSeriesRef);

    // Create historical price line series
    const historicalSeries = chart.addLineSeries({
      color: '#f97316',
      lineWidth: 2,
      priceScaleId: 'right',
    });
    historicalSeriesRef.current = historicalSeries;

    // Convert historical prices to chart data format
    // Use sequential timestamps (days ago from now)
    const now = Math.floor(Date.now() / 1000);
    const historicalData = historicalPrices.map((price, index) => ({
      time: (now - (historicalPrices.length - index - 1) * 86400) as Time, // One day per point
      value: price,
    }));

    historicalSeries.setData(historicalData);

    // Get the last time point for projections
    const lastTime = historicalData[historicalData.length - 1].time;
    const projectionTime = (typeof lastTime === 'number' ? lastTime : parseFloat(String(lastTime))) + (30 * 86400); // 30 days ahead

    // Create projection lines (dashed)
    const highTargetSeries = chart.addLineSeries({
      color: '#22c55e',
      lineWidth: 2,
      lineStyle: 2, // Dashed
      priceScaleId: 'right',
      lastValueVisible: true,
      priceLineVisible: false,
    });
    highTargetSeriesRef.current = highTargetSeries;

    const avgTargetSeries = chart.addLineSeries({
      color: '#f97316',
      lineWidth: 2,
      lineStyle: 2, // Dashed
      priceScaleId: 'right',
      lastValueVisible: true,
      priceLineVisible: false,
    });
    avgTargetSeriesRef.current = avgTargetSeries;

    const lowTargetSeries = chart.addLineSeries({
      color: '#ef4444',
      lineWidth: 2,
      lineStyle: 2, // Dashed
      priceScaleId: 'right',
      lastValueVisible: true,
      priceLineVisible: false,
    });
    lowTargetSeriesRef.current = lowTargetSeries;

    // Set projection data (from current price to target)
    const currentPrice = priceTargetsData.targetPriceData.current;
    
    highTargetSeries.setData([
      { time: lastTime, value: currentPrice },
      { time: projectionTime as Time, value: priceTargetsData.targetPriceData.high },
    ]);

    avgTargetSeries.setData([
      { time: lastTime, value: currentPrice },
      { time: projectionTime as Time, value: priceTargetsData.targetPriceData.average },
    ]);

    lowTargetSeries.setData([
      { time: lastTime, value: currentPrice },
      { time: projectionTime as Time, value: priceTargetsData.targetPriceData.low },
    ]);

    return () => {
      // Clean up series first
      const removeSeriesSafely = (seriesRef: React.MutableRefObject<ISeriesApi<'Line'> | null>) => {
        if (seriesRef.current && chartRef.current) {
          try {
            chartRef.current.removeSeries(seriesRef.current);
          } catch (error) {
            // Ignore cleanup errors
          }
          seriesRef.current = null;
        }
      };

      removeSeriesSafely(historicalSeriesRef);
      removeSeriesSafely(highTargetSeriesRef);
      removeSeriesSafely(avgTargetSeriesRef);
      removeSeriesSafely(lowTargetSeriesRef);

      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      }
      if (chartRef.current) {
        try {
          chartRef.current.remove();
        } catch (error) {
          // Chart might already be removed, ignore
        }
        chartRef.current = null;
      }
    };
  }, [priceTargetsData]);

  const handleSaveSettings = (newSettings: any) => {
    setLocalSettings(newSettings);
    setIsSettingsPanelOpen(false);
  };

  return (
    <div className="h-full bg-widget-body border border-border rounded-none flex flex-col">
      <WidgetHeader 
        title="Price Targets"
        subtitle={symbol ? `[@${symbol.replace(/^[^:]+:/, '')}]` : ''}
        onSettings={() => setIsSettingsPanelOpen(true)}
        onRemove={onRemove}
        onFullscreen={onFullscreen}
        helpContent="Analyst price targets with historical price chart and projection lines showing high, average, and low targets."
      />
      
      <WidgetSettingsSlideIn
        isOpen={isSettingsPanelOpen}
        onClose={() => setIsSettingsPanelOpen(false)}
        widgetType="price-targets"
        widgetPosition=""
        currentSettings={localSettings}
        onSave={handleSaveSettings}
      />
      
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {isLoading && (
          <div className="flex items-center justify-center h-64">
            <div className="text-sm text-muted-foreground">Loading price targets data...</div>
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center h-64">
            <div className="text-sm text-destructive">{error}</div>
          </div>
        )}

        {!isLoading && !error && priceTargetsData && (
          <>
            <div className="bg-background border border-border rounded-lg p-4">
              <div className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wide">Analyst Price Targets</div>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <div className="text-sm text-muted-foreground mb-2">Current Price</div>
                  <div className="text-xl font-semibold">
                    {priceTargetsData.targetPriceData.current < 1 
                      ? priceTargetsData.targetPriceData.current.toFixed(5)
                      : priceTargetsData.targetPriceData.current.toFixed(2)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-2">Avg Target</div>
                  <div className="text-xl font-semibold text-primary">
                    {priceTargetsData.targetPriceData.average < 1 
                      ? priceTargetsData.targetPriceData.average.toFixed(5)
                      : priceTargetsData.targetPriceData.average.toFixed(2)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-2">High</div>
                  <div className="text-base">
                    <span className="inline-block px-3 py-1.5 rounded bg-green-500/10 text-green-500 font-semibold text-base">
                      {priceTargetsData.targetPriceData.high < 1 
                        ? priceTargetsData.targetPriceData.high.toFixed(5)
                        : priceTargetsData.targetPriceData.high.toFixed(2)}
                    </span>
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-2">Low</div>
                  <div className="text-base">
                    <span className="inline-block px-3 py-1.5 rounded bg-red-500/10 text-red-500 font-semibold text-base">
                      {priceTargetsData.targetPriceData.low < 1 
                        ? priceTargetsData.targetPriceData.low.toFixed(5)
                        : priceTargetsData.targetPriceData.low.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

          {/* Upside Indicator */}
          <div className={`flex items-center justify-between px-4 py-3 rounded ${
            upside >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'
          }`}>
            <span className="text-sm font-medium text-muted-foreground">Avg Upside/Downside</span>
            <span className={`text-base font-semibold flex items-center gap-2 ${
              upside >= 0 ? 'text-green-500' : 'text-red-500'
            }`}>
              {upside >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              {upside >= 0 ? '+' : ''}{upside.toFixed(2)}%
            </span>
          </div>
        </div>

        {/* Price Target Projection Chart */}
        <div className="bg-background border border-border rounded-lg p-4">
          <div className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wide">Price Target Projection</div>
          
          {/* Legend */}
          <div className="flex items-center gap-4 mb-4 flex-wrap text-sm">
            <div className="flex items-center gap-2">
              <div className="w-5 h-0.5 bg-primary"></div>
              <span className="text-muted-foreground">Historical Price</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-0.5 bg-green-500 border-t-2 border-dashed border-green-500"></div>
              <span className="text-muted-foreground">High Target</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-0.5 bg-primary border-t-2 border-dashed border-primary"></div>
              <span className="text-muted-foreground">Avg Target</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-0.5 bg-red-500 border-t-2 border-dashed border-red-500"></div>
              <span className="text-muted-foreground">Low Target</span>
            </div>
          </div>

          <div 
            ref={chartContainerRef} 
            className="w-full" 
            style={{ minHeight: '300px', height: '300px' }}
          />
        </div>
          </>
        )}
      </div>
    </div>
  );
}

export default PriceTargets;

