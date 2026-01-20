"use client";

import { useEffect, useState, useRef } from "react";
import { WidgetHeader } from "@/components/bloomberg-ui/WidgetHeader";
import { createChart, type IChartApi, type ISeriesApi, type Time } from "lightweight-charts";

interface RiskReversalsProps {
  onSettings?: () => void;
  onRemove?: () => void;
  onFullscreen?: () => void;
  settings?: {
    symbol?: string;
    timespan?: string; // '5D', '10D', '1M'
  };
}

interface RiskReversalDataPoint {
  date: string;
  put: number;
  call: number;
}

interface ChartDataPoint {
  time: Time;
  value: number;
}

export function RiskReversals({
  onSettings,
  onRemove,
  onFullscreen,
  settings,
}: RiskReversalsProps) {
  const [data, setData] = useState<RiskReversalDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [visibleLines, setVisibleLines] = useState({
    put: true,
    call: true,
  });

  // Chart refs
  const chartContainerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const putSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const callSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const priceLinesRef = useRef<Array<{ line: any; series: ISeriesApi<'Line'> }>>([]);

  const symbol = settings?.symbol ?? "EUR";
  const timespan = settings?.timespan ?? "10D"; // Default to 10 days
  
  // Extract base currency if symbol is a pair (e.g., "EURUSD" -> "EUR") or use as-is
  const currency = symbol.length > 3 ? symbol.substring(0, 3).toUpperCase() : symbol.toUpperCase();

  // Filter data based on timespan
  const filterDataByTimespan = (dataPoints: RiskReversalDataPoint[]): RiskReversalDataPoint[] => {
    if (!dataPoints.length) return dataPoints;
    
    // If "All" is selected, return all data without filtering
    if (timespan === 'All') {
      return dataPoints;
    }
    
    const now = Date.now() / 1000; // Current time in seconds (Unix timestamp)
    let daysBack = 10; // Default to 10 days
    
    if (timespan === '5D') {
      daysBack = 5;
    } else if (timespan === '10D') {
      daysBack = 10;
    } else if (timespan === '1M') {
      daysBack = 30;
    }
    
    const cutoffTime = now - (daysBack * 24 * 60 * 60); // Cutoff time in seconds
    
    return dataPoints.filter((point) => {
      const pointTime = parseDate(point.date);
      // parseDate returns Unix timestamp in seconds
      return pointTime >= cutoffTime;
    });
  };

  // Convert date string to Unix timestamp
  // API returns dates in "MMM DD" format (e.g., "Apr 4", "Jan 15")
  const parseDate = (dateStr: string): number => {
    const months: Record<string, number> = {
      'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
      'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
    };
    
    // Parse "MMM DD" format (e.g., "Apr 4", "Jan 15")
    const parts = dateStr.trim().split(' ');
    if (parts.length === 2) {
      const monthStr = parts[0];
      const dayStr = parts[1];
      const month = months[monthStr];
      const day = parseInt(dayStr);
      
      if (month !== undefined && !isNaN(day)) {
        const now = new Date();
        const year = now.getFullYear();
        const date = new Date(year, month, day);
        // If the date is in the future (e.g., we're in Dec but date is Jan), use previous year
        if (date > now) {
          return Math.floor(new Date(year - 1, month, day).getTime() / 1000);
        }
        return Math.floor(date.getTime() / 1000);
      }
    }
    
    // Try parsing as ISO string or other formats
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return Math.floor(date.getTime() / 1000);
    }
    
    // Fallback to current time
    return Math.floor(Date.now() / 1000);
  };

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch('/api/pmt/risk-reversals', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ symbol: currency }),
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch data: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to load data');
        }
        
        const dataPoints = result.data?.dataPoints || [];
        setData(dataPoints);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load data");
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currency]);

  // Initialize chart - EXACT match to Currency Strength pattern
  useEffect(() => {
    if (!chartContainerRef.current) return;
    
    chartRef.current = createChart(chartContainerRef.current, {
      layout: { background: { color: '#000000' }, textColor: '#9ca3af' },
      grid: { vertLines: { color: '#0a0a0a' }, horzLines: { color: '#0a0a0a' } },
      leftPriceScale: { 
        borderColor: '#374151',
        scaleMargins: { top: 0.1, bottom: 0.1 },
        visible: true,
      },
      rightPriceScale: { 
        borderColor: '#374151',
        scaleMargins: { top: 0.1, bottom: 0.1 },
        visible: true,
      },
      timeScale: { 
        rightOffset: 2, 
        fixLeftEdge: true, 
        borderColor: '#374151',
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: { mode: 0 },
      autoSize: true,
    });

    // Add MRR (put) line series - red, attached to left price scale
    putSeriesRef.current = chartRef.current.addLineSeries({
      color: '#ef4444',
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
      priceScaleId: 'left',
      priceFormat: {
        type: 'price',
        precision: 3,
        minMove: 0.001,
      },
    });

    // Add MO (call) line series - green, attached to right price scale
    callSeriesRef.current = chartRef.current.addLineSeries({
      color: '#22c55e',
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
      priceScaleId: 'right',
      priceFormat: {
        type: 'price',
        precision: 3,
        minMove: 0.001,
      },
    });

    const resize = () => {
      chartRef.current?.timeScale().fitContent();
    };
    
    const ro = new ResizeObserver(() => resize());
    ro.observe(chartContainerRef.current);
    
    resizeObserverRef.current = ro;
    
    return () => { 
      ro.disconnect(); 
      // Clear price lines
      priceLinesRef.current = [];
      chartRef.current?.remove(); 
      chartRef.current = null; 
      putSeriesRef.current = null;
      callSeriesRef.current = null;
    };
  }, []);

  // Setup crosshair move handler for tooltip (separate effect to access latest visibleLines)
  useEffect(() => {
    if (!chartRef.current) return;

    chartRef.current.subscribeCrosshairMove(param => {
      if (!tooltipRef.current || !chartContainerRef.current) return;
      
      if (param.point === undefined || !param.time || param.point.x < 0 || param.point.x > chartContainerRef.current.clientWidth || 
          param.point.y < 0 || param.point.y > chartContainerRef.current.clientHeight) {
        tooltipRef.current.style.display = 'none';
      } else {
        const tooltip = tooltipRef.current;
        tooltip.style.display = 'block';
        // Position tooltip near cursor, offset to the right
        tooltip.style.left = `${param.point.x + 20}px`;
        tooltip.style.top = `${param.point.y - 10}px`;
        
        // Format the date from the time parameter
        let dateStr = '';
        if (param.time) {
          const timeValue = typeof param.time === 'number' ? param.time : (param.time as any).timestamp || Date.now() / 1000;
          const date = new Date(timeValue * 1000);
          dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }
        
        // Get data for all visible series at this time point
        let tooltipContent = '';
        
        // Add date header
        if (dateStr) {
          tooltipContent += `<div style="margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid rgba(42, 42, 42, 0.8); font-size: 11px; color: #9ca3af; font-weight: 500;">${dateStr}</div>`;
        }
        
        // MRR (put) line - red
        if (visibleLines.put && putSeriesRef.current) {
          const putData = putSeriesRef.current.data();
          const putPointAtTime = putData.find((d: any) => d.time === param.time);
          
          if (putPointAtTime && 'value' in putPointAtTime) {
            const value = putPointAtTime.value;
            tooltipContent += `<div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
              <div style="width: 12px; height: 2px; background-color: #ef4444"></div>
              <span style="color: #ef4444; font-size: 11px;">MRR: ${value.toFixed(3)}</span>
            </div>`;
          }
        }
        
        // MO (call) line - green
        if (visibleLines.call && callSeriesRef.current) {
          const callData = callSeriesRef.current.data();
          const callPointAtTime = callData.find((d: any) => d.time === param.time);
          
          if (callPointAtTime && 'value' in callPointAtTime) {
            const value = callPointAtTime.value;
            tooltipContent += `<div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
              <div style="width: 12px; height: 2px; background-color: #22c55e"></div>
              <span style="color: #22c55e; font-size: 11px;">MO: ${value.toFixed(3)}</span>
            </div>`;
          }
        }
        
        if (tooltipContent) {
          tooltip.innerHTML = tooltipContent;
        } else {
          tooltip.style.display = 'none';
        }
      }
    });
  }, [visibleLines]);

  // Filter data based on timespan
  const filteredData = filterDataByTimespan(data);

  // Update chart data when data, visibility, or timespan changes
  useEffect(() => {
    if (!chartRef.current || !filteredData.length || loading) return;
    
    // Ensure series are initialized
    if (!putSeriesRef.current || !callSeriesRef.current) {
      return;
    }

    // Convert data to chart format
    const putData: ChartDataPoint[] = [];
    const callData: ChartDataPoint[] = [];

    filteredData.forEach((point) => {
      const time = parseDate(point.date) as Time;

      if (visibleLines.put) {
        putData.push({ time, value: point.put });
      }
      
      if (visibleLines.call) {
        callData.push({ time, value: point.call });
      }
    });

    // Update series data
    try {
      // Remove existing price lines
      priceLinesRef.current.forEach(({ line, series }) => {
        try {
          series.removePriceLine(line);
        } catch (err) {
          // Ignore errors if line was already removed
        }
      });
      priceLinesRef.current = [];

      if (putSeriesRef.current) {
        if (visibleLines.put && putData.length > 0) {
          putSeriesRef.current.setData(putData);
          
          // Add price line at end point for MRR
          const lastPutValue = putData[putData.length - 1].value;
          
          const endLine = putSeriesRef.current.createPriceLine({
            price: lastPutValue,
            color: '#ef4444',
            lineWidth: 1,
            lineStyle: 2, // Dashed
            axisLabelVisible: true,
            axisLabelColor: '#ef4444',
          });
          priceLinesRef.current.push({ line: endLine, series: putSeriesRef.current });
        } else {
          putSeriesRef.current.setData([]);
        }
      }

      if (callSeriesRef.current) {
        if (visibleLines.call && callData.length > 0) {
          callSeriesRef.current.setData(callData);
          
          // Add price line at end point for MO
          const lastCallValue = callData[callData.length - 1].value;
          
          const endLine = callSeriesRef.current.createPriceLine({
            price: lastCallValue,
            color: '#22c55e',
            lineWidth: 1,
            lineStyle: 2, // Dashed
            axisLabelVisible: true,
            axisLabelColor: '#22c55e',
          });
          priceLinesRef.current.push({ line: endLine, series: callSeriesRef.current });
        } else {
          callSeriesRef.current.setData([]);
        }
      }

      // Fit content to show all data
      if (chartRef.current) {
        chartRef.current.timeScale().fitContent();
      }
    } catch (err) {
      // Error updating chart data
    }
  }, [filteredData, visibleLines, loading]);

  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded border border-border bg-widget-body">
      <WidgetHeader
        title={
          <span>
            Risk Reversals <span className="text-primary">[{currency}]</span>
          </span>
        }
        onSettings={onSettings}
        onRemove={onRemove}
        onFullscreen={onFullscreen}
      />

      {/* Legends - Bloomberg style */}
      <div className="border-b border-border bg-widget-header px-3 py-2 flex flex-wrap items-center gap-x-4 gap-y-2">
        <button
          onClick={() =>
            setVisibleLines((prev) => ({ ...prev, put: !prev.put }))
          }
          className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
          type="button"
        >
          <div
            className="w-4 h-0.5 rounded transition-opacity"
            style={{
              backgroundColor: '#ef4444',
              opacity: visibleLines.put ? 1 : 0.3
            }}
          ></div>
          <span
            className="text-xs transition-opacity"
            style={{ 
              opacity: visibleLines.put ? 1 : 0.5,
              color: visibleLines.put ? 'var(--foreground)' : 'var(--muted-foreground)'
            }}
          >
            MRR
          </span>
        </button>
        <button
          onClick={() =>
            setVisibleLines((prev) => ({ ...prev, call: !prev.call }))
          }
          className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
          type="button"
        >
          <div
            className="w-4 h-0.5 rounded transition-opacity"
            style={{
              backgroundColor: '#22c55e',
              opacity: visibleLines.call ? 1 : 0.3
            }}
          ></div>
          <span
            className="text-xs transition-opacity"
            style={{ 
              opacity: visibleLines.call ? 1 : 0.5,
              color: visibleLines.call ? 'var(--foreground)' : 'var(--muted-foreground)'
            }}
          >
            MO
          </span>
        </button>
      </div>

            {/* Chart Container */}
            <div className="flex-1 p-3 min-h-0 relative">
              {error ? (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">{error}</div>
              ) : (
                <>
                  <div ref={chartContainerRef} className="h-full w-full relative" style={{ position: 'relative' }} />
                  
                  {/* Floating Tooltip */}
                  <div
                    ref={tooltipRef}
                    style={{
                      position: 'absolute',
                      display: 'none',
                      backgroundColor: 'rgba(26, 26, 26, 0.95)',
                      border: '1px solid rgba(42, 42, 42, 0.8)',
                      borderRadius: '6px',
                      padding: '8px 12px',
                      fontSize: '11px',
                      pointerEvents: 'none',
                      zIndex: 1000,
                      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
                    }}
                  />
                </>
              )}
            </div>
    </div>
  );
}

export default RiskReversals;
