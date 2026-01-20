"use client";

import { useState, useEffect } from "react";
import { WidgetHeader } from "@/components/bloomberg-ui/WidgetHeader";
import { getSymbolShortFormat } from "@/utils/symbolMapping";
import { widgetDataCache } from '@/lib/widgetDataCache';

interface DistributionChartProps {
  onSettings?: () => void;
  onRemove?: () => void;
  onFullscreen?: () => void;
  settings?: {
    symbol?: string;
  };
}

interface DataPoint {
  value: number;
  frequency: number;
}

interface BarData {
  value: number;
  count: number;
}

/**
 * Distribution Chart Widget
 * 
 * Expected API Response Structure:
 * {
 *   bellCurve: DataPoint[],      // Array of { value: number, frequency: number } for bell curve
 *   histogram: BarData[],        // Array of { value: number, count: number } for histogram bars
 *   statistics: {
 *     mean: number,               // Mean percentage (e.g., 0.15 or -0.05)
 *     stdDev: number,             // Standard deviation percentage (e.g., 1.2 or 0.9)
 *     currentPrice: number,       // Current price percentage (e.g., 0.35 or -0.12)
 *     skewness: number            // Skewness value (e.g., 0.12 or -0.08)
 *   }
 * }
 * 
 * The API should return different data based on the selected mode:
 * - "open-to-open": Data for open-to-open price changes
 * - "close-to-close": Data for close-to-close price changes
 */
export function DistributionChart({ onSettings, onRemove, onFullscreen, settings }: DistributionChartProps) {
  const [selectedMode, setSelectedMode] = useState<"open-to-open" | "close-to-close">("close-to-close");
  const [hoveredPoint, setHoveredPoint] = useState<{ value: number; frequency: number; x: number; y: number } | null>(null);
  const [symbol, setSymbol] = useState<string>(settings?.symbol || "EURUSD");
  
  // Data states - will be populated from API
  const [data, setData] = useState<DataPoint[]>([]);
  const [barData, setBarData] = useState<BarData[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Statistics states - will be populated from API
  const [mean, setMean] = useState<number>(0);
  const [stdDev, setStdDev] = useState<number>(0);
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [skewness, setSkewness] = useState<number>(0);

  // Sync with settings changes
  useEffect(() => {
    if (settings?.symbol && settings.symbol !== symbol) {
      setSymbol(settings.symbol);
    }
  }, [settings?.symbol, symbol]);

  // Fetch data from API
  useEffect(() => {
    const fetchData = async () => {
      const cacheKey = widgetDataCache.generateKey('distribution-chart', { symbol, mode: selectedMode });
      const cachedData = widgetDataCache.get<any>(cacheKey);
      
      if (cachedData) {
        setData(cachedData.bellCurve || []);
        setBarData(cachedData.histogram || []);
        setMean(cachedData.statistics?.mean || 0);
        setStdDev(cachedData.statistics?.stdDev || 0);
        setCurrentPrice(cachedData.statistics?.currentPrice || 0);
        setSkewness(cachedData.statistics?.skewness || 0);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch('/api/pmt/distribution-chart', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            symbol: symbol,
            mode: selectedMode
          }),
        });

        if (!response.ok) {
          throw new Error(`API returned ${response.status}`);
        }

        const result = await response.json();
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to fetch data');
        }

        const apiData = result.data;
        
        console.log('📊 [DistributionChart] Received API data:', {
          hasBellCurve: !!apiData.bellCurve,
          bellCurveLength: apiData.bellCurve?.length || 0,
          hasHistogram: !!apiData.histogram,
          histogramLength: apiData.histogram?.length || 0,
          statistics: apiData.statistics
        });
        
        // Update state with API data
        setData(apiData.bellCurve || []);
        setBarData(apiData.histogram || []);
        setMean(apiData.statistics?.mean || 0);
        setStdDev(apiData.statistics?.stdDev || 0);
        setCurrentPrice(apiData.statistics?.currentPrice || 0);
        setSkewness(apiData.statistics?.skewness || 0);
        
        widgetDataCache.set(cacheKey, apiData);
        
        console.log('📊 [DistributionChart] Updated state:', {
          dataLength: apiData.bellCurve?.length || 0,
          barDataLength: apiData.histogram?.length || 0,
          mean: apiData.statistics?.mean || 0,
          stdDev: apiData.statistics?.stdDev || 0,
          currentPrice: apiData.statistics?.currentPrice || 0,
          skewness: apiData.statistics?.skewness || 0,
          histogramSample: apiData.histogram?.slice(0, 5),
          histogramCounts: apiData.histogram?.map((b: any) => b.count).slice(0, 10),
          maxHistogramCount: Math.max(...(apiData.histogram?.map((b: any) => b.count) || [0]))
        });
        
      } catch (err) {
        console.error('Error fetching distribution chart data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedMode, symbol]);

  // Calculate chart dimensions
  const width = 200;
  const height = 100;
  // Increased bottom padding to make room for X-axis labels (prevent clipping)
  const padding = { top: 5, right: 5, bottom: 18, left: 10 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Get min/max values - MOCK DATA used fixed -4 to +4 range
  // REAL DATA: Use the same fixed range to match mock data exactly
  const minValue = -4;  // Fixed, matching mock data
  const maxValue = 4;   // Fixed, matching mock data
  
  const maxFrequency = data.length > 0 ? Math.max(...data.map(d => d.frequency)) : 1;
  const maxBarCount = barData.length > 0 ? Math.max(...barData.map(d => d.count)) : 1;
  
  // Debug X-axis positioning
  useEffect(() => {
    if (data.length > 0 && stdDev > 0) {
      console.log('📊 [X-Axis Debug]', {
        mean,
        stdDev,
        minValue,
        maxValue,
        sigmaPositions: [-3, -2, -1, 0, 1, 2, 3].map(sigma => ({
          sigma,
          value: mean + sigma * stdDev,
          x: padding.left + ((mean + sigma * stdDev - minValue) / (maxValue - minValue)) * chartWidth
        }))
      });
    }
  }, [data.length, mean, stdDev, minValue, maxValue]);

  // Create path for bell curve
  const createPath = () => {
    return data.map((point, i) => {
      const x = padding.left + ((point.value - minValue) / (maxValue - minValue)) * chartWidth;
      const y = padding.top + chartHeight - (point.frequency / maxFrequency) * chartHeight;
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');
  };

  // Create area path (for fill)
  const createAreaPath = () => {
    const path = createPath();
    const lastPoint = data[data.length - 1];
    const lastX = padding.left + ((lastPoint.value - minValue) / (maxValue - minValue)) * chartWidth;
    const firstX = padding.left;
    const bottomY = padding.top + chartHeight;
    
    return `${path} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
  };

  // Calculate min/max values for chart rendering
  // These will be calculated from the API data once loaded

  return (
    <div className="h-full w-full flex flex-col bg-widget border border-border rounded-sm overflow-y-auto">
      <WidgetHeader
        title={
          <span>
            Distribution Chart <span className="text-muted-foreground"> | </span> <span className="text-primary">[{getSymbolShortFormat(symbol)}]</span>
          </span>
        }
        widgetName="Distribution Chart"
        onSettings={onSettings}
        onRemove={onRemove}
        onFullscreen={onFullscreen}
        helpContent="Distribution chart showing price distribution with bell curve overlay, histogram bars, and statistical indicators."
      >
      </WidgetHeader>

      {/* Statistics Bar */}
      {loading ? (
        <div className="border-b border-border/50 bg-background/30 px-3 py-2 flex items-center justify-center">
          <span className="text-sm text-muted-foreground">Loading...</span>
        </div>
      ) : error ? (
        <div className="border-b border-border/50 bg-background/30 px-3 py-2 flex items-center justify-center">
          <span className="text-sm text-red-400">Error: {error}</span>
        </div>
      ) : (
        <div className="border-b border-border/50 bg-background/30 px-3 py-2 flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground uppercase tracking-wide">Mean:</span>
            <span className={`text-sm tabular-nums ${mean >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {mean >= 0 ? '+' : ''}{mean.toFixed(2)}%
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground uppercase tracking-wide">Std Dev:</span>
            <span className="text-sm text-foreground tabular-nums">{stdDev.toFixed(2)}%</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground uppercase tracking-wide">Current:</span>
            <span className={`text-sm tabular-nums ${currentPrice >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {currentPrice >= 0 ? '+' : ''}{currentPrice.toFixed(2)}%
            </span>
          </div>
        </div>
      )}

      {/* Chart */}
      <div className="flex-1 p-4 relative overflow-visible min-h-0">
        {loading ? (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-sm text-muted-foreground">Loading chart data...</span>
          </div>
        ) : error ? (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-sm text-red-400">Error loading chart: {error}</span>
          </div>
        ) : data.length === 0 ? (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-sm text-muted-foreground">No data available</span>
          </div>
        ) : (
          <svg 
            viewBox={`0 0 ${width} ${height + 3}`} 
            className="w-full h-full"
            onMouseLeave={() => setHoveredPoint(null)}
            style={{ overflow: 'visible' }}
          >
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = padding.top + chartHeight * ratio;
            return (
              <line
                key={ratio}
                x1={padding.left}
                y1={y}
                x2={width - padding.right}
                y2={y}
                stroke="#1a1a1a"
                strokeWidth="0.2"
              />
            );
          })}

          {/* X-axis grid */}
          {/* MOCK DATA: X-axis labels were at absolute values -3, -2, -1, 0, 1, 2, 3 */}
          {/* REAL DATA: Use the same approach - absolute values, not mean + sigma * stdDev */}
          {[-3, -2, -1, 0, 1, 2, 3].map((value) => {
            // Use absolute value directly, just like mock data
            // Position on chart based on absolute value
            const valueRange = maxValue - minValue;
            const x = valueRange !== 0 
              ? padding.left + ((value - minValue) / valueRange) * chartWidth
              : padding.left + chartWidth / 2;
            
            return (
              <g key={value}>
                <line
                  x1={x}
                  y1={padding.top}
                  x2={x}
                  y2={height - padding.bottom}
                  stroke="#1a1a1a"
                  strokeWidth="0.2"
                />
                <text
                  x={x}
                  y={height - padding.bottom + 3}
                  textAnchor="middle"
                  fill="#999999"
                  style={{ 
                    fontSize: '2.5px', 
                    fontFamily: 'system-ui, sans-serif',
                    pointerEvents: 'none'
                  }}
                >
                  {value}σ
                </text>
              </g>
            );
          })}

          {/* Histogram Bars */}
          {barData.map((bar, i) => {
            const barWidth = chartWidth / barData.length;
            const x = padding.left + ((bar.value - minValue) / (maxValue - minValue)) * chartWidth - barWidth / 2;
            
            // Bar height calculation - match mock data exactly
            // Mock: barHeight = (bar.count / maxBarCount) * chartHeight * (maxFrequency / maxBarCount) * 0.95
            const barHeight = maxBarCount > 0 
              ? (bar.count / maxBarCount) * chartHeight * 0.95
              : 0;
            const y = padding.top + chartHeight - barHeight;
            
            // Debug: log all bars to see what's happening
            if (i < 5 || bar.count > 0) {
              console.log(`📊 [Histogram Bar ${i}]`, {
                value: bar.value.toFixed(2),
                count: bar.count,
                maxBarCount,
                barHeight: barHeight.toFixed(2),
                x: x.toFixed(2),
                y: y.toFixed(2),
                width: (barWidth * 0.9).toFixed(2),
                minValue,
                maxValue
              });
            }
            
            // Always render bars, even if small (minimum 0.5px height for visibility)
            const minBarHeight = 0.5;
            const finalBarHeight = Math.max(barHeight, minBarHeight);
            const finalY = barHeight > 0 ? y : padding.top + chartHeight - minBarHeight;
            
            return (
              <rect
                key={i}
                x={x}
                y={finalY}
                width={barWidth * 0.9}
                height={finalBarHeight}
                fill="#333333"
                stroke="#555555"
                strokeWidth="0.2"
                opacity={bar.count > 0 ? "0.8" : "0.2"}
                style={{ pointerEvents: 'none' }}
              />
            );
          })}

          {/* Bell curve area */}
          {data.length > 0 && (
            <path
              d={createAreaPath()}
              fill="url(#bellGradient)"
              opacity="0.2"
            />
          )}

          {/* Bell curve line */}
          {data.length > 0 && (
            <path
              d={createPath()}
              fill="none"
              stroke="#f97316"
              strokeWidth="0.5"
            />
          )}

          {/* Current price indicator */}
          {data.length > 0 && (() => {
            const x = padding.left + ((currentPrice - minValue) / (maxValue - minValue)) * chartWidth;
            // Find the frequency at current price
            const closestPoint = data.reduce((prev, curr) => 
              Math.abs(curr.value - currentPrice) < Math.abs(prev.value - currentPrice) ? curr : prev
            );
            const y = padding.top + chartHeight - (closestPoint.frequency / maxFrequency) * chartHeight;
            
            return (
              <>
                <line
                  x1={x}
                  y1={padding.top}
                  x2={x}
                  y2={height - padding.bottom}
                  stroke={currentPrice >= 0 ? "#22c55e" : "#ef4444"}
                  strokeWidth="0.3"
                  strokeDasharray="1,1"
                />
                <circle
                  cx={x}
                  cy={y}
                  r="1"
                  fill={currentPrice >= 0 ? "#22c55e" : "#ef4444"}
                  stroke="white"
                  strokeWidth="0.2"
                />
              </>
            );
          })()}

          {/* Mean indicator */}
          {data.length > 0 && (() => {
            const x = padding.left + ((mean - minValue) / (maxValue - minValue)) * chartWidth;
            return (
              <line
                x1={x}
                y1={padding.top}
                x2={x}
                y2={height - padding.bottom}
                stroke="#f97316"
                strokeWidth="0.3"
                strokeDasharray="1,1"
                opacity="0.5"
              />
            );
          })()}

          {/* Standard deviation regions */}
          {data.length > 0 && stdDev > 0 && [-1, 1].map((sigma) => {
            const value = mean + sigma * stdDev;
            const x = padding.left + ((value - minValue) / (maxValue - minValue)) * chartWidth;
            return (
              <rect
                key={sigma}
                x={x - 0.1}
                y={padding.top}
                width="0.2"
                height={chartHeight}
                fill="#f97316"
                opacity="0.2"
              />
            );
          })}

          {/* Gradient definition */}
          <defs>
            <linearGradient id="bellGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f97316" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#f97316" stopOpacity="0.1" />
            </linearGradient>
          </defs>
        </svg>
        )}

        {/* Legend */}
        {data.length > 0 && (
          <div className="absolute bottom-2 right-2 flex flex-col gap-1">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-2 bg-[#333333] border border-[#444444] opacity-70"></div>
            <span className="text-xs text-muted-foreground">Histogram</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-[1px] bg-primary"></div>
            <span className="text-xs text-muted-foreground">Bell Curve</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-[1px] bg-primary opacity-50 border-t border-dashed"></div>
            <span className="text-xs text-muted-foreground">Mean</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className={`w-3 h-[1px] ${currentPrice >= 0 ? 'bg-green-400' : 'bg-red-400'} border-t border-dashed`}></div>
            <span className="text-xs text-muted-foreground">Current</span>
          </div>
          </div>
        )}
      </div>

      {/* Info Footer */}
      <div className="border-t border-border/50 bg-background/30 px-3 py-2 flex-shrink-0">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">68% Range</div>
            <div className="text-sm text-foreground tabular-nums">
              {(mean - stdDev).toFixed(2)}% to {(mean + stdDev).toFixed(2)}%
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">95% Range</div>
            <div className="text-sm text-foreground tabular-nums">
              {(mean - 2 * stdDev).toFixed(2)}% to {(mean + 2 * stdDev).toFixed(2)}%
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Skewness</div>
            <div className={`text-sm tabular-nums ${skewness >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {skewness >= 0 ? '+' : ''}{skewness.toFixed(2)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DistributionChart;

