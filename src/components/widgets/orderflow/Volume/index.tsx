"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { WidgetHeader } from "@/components/bloomberg-ui/WidgetHeader";
import { createChart, type IChartApi, type ISeriesApi, type Time, ColorType, type IPriceLine } from "lightweight-charts";
import { getSymbolShortFormat } from "@/utils/symbolMapping";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Settings2, X, Check } from "lucide-react";
import { getUserTimezoneSync } from "@/utils/systemVariablesClient";

interface VolumeProps {
  onSettings?: () => void;
  onRemove?: () => void;
  onFullscreen?: () => void;
  settings?: {
    symbol?: string;
    timeFrame?: TimeFrame;
    colorMode?: ColorMode;
  };
}

interface VolumeDataPoint {
  time: Time;
  value: number;
  color: string;
}

type TimeFrame = "1min" | "1hour" | "1day" | "1week";
type ColorMode = "orange" | "greenred";

const TIME_FRAMES = [
  { value: "1min" as TimeFrame, label: "1 Minute" },
  { value: "1hour" as TimeFrame, label: "1 Hour" },
  { value: "1day" as TimeFrame, label: "1 Day" },
  { value: "1week" as TimeFrame, label: "1 Week" },
];

const COLOR_MODES = [
  { value: "orange" as ColorMode, label: "All Orange" },
  { value: "greenred" as ColorMode, label: "Green / Red" },
];

// Generate volume data based on timeframe
const generateVolumeData = (tf: TimeFrame, colorMode: ColorMode): VolumeDataPoint[] => {
  const data: VolumeDataPoint[] = [];
  const now = new Date();
  let intervals = 120;
  let intervalMs = 60000; // 1 minute

  switch (tf) {
    case "1min":
      intervals = 120;
      intervalMs = 60000; // 1 minute
      break;
    case "1hour":
      intervals = 168; // 7 days
      intervalMs = 3600000; // 1 hour
      break;
    case "1day":
      intervals = 90; // 90 days
      intervalMs = 86400000; // 1 day
      break;
    case "1week":
      intervals = 52; // 52 weeks
      intervalMs = 604800000; // 1 week
      break;
  }

  let prevVolume = 150000 + Math.random() * 100000;

  for (let i = intervals - 1; i >= 0; i--) {
    const time = new Date(now.getTime() - i * intervalMs);
    
    // Generate random volume with some patterns
    const baseVolume = 150000 + Math.random() * 100000;
    const spike = Math.random() > 0.92 ? Math.random() * 200000 : 0;
    const volume = Math.floor(baseVolume + spike);
    
    // Determine if volume is up or down for color coding
    const isUp = volume >= prevVolume;
    prevVolume = volume;

    // Determine color based on mode
    const color = colorMode === "orange" 
      ? "#f97316" 
      : (isUp ? "#22c55e" : "#ef4444");

    // Convert to Unix timestamp in seconds for lightweight-charts
    const unixTime = Math.floor(time.getTime() / 1000) as Time;

    data.push({
      time: unixTime,
      value: volume,
      color,
    });
  }

  return data;
};

// Calculate average
const calculateAverage = (data: VolumeDataPoint[]) => {
  if (data.length === 0) return 0;
  const sum = data.reduce((acc, d) => acc + d.value, 0);
  return sum / data.length;
};

export function Volume({ onSettings, onRemove, onFullscreen, settings }: VolumeProps) {
  const [timeFrame, setTimeFrame] = useState<TimeFrame>(settings?.timeFrame || "1min");
  const [colorMode, setColorMode] = useState<ColorMode>(settings?.colorMode || "orange");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [averageVolume, setAverageVolume] = useState(0);

  // Chart refs
  const chartContainerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const volumeDataRef = useRef<VolumeDataPoint[]>([]);
  const averageLineRef = useRef<IPriceLine | null>(null);
  const [userTimezone, setUserTimezone] = useState<string>(getUserTimezoneSync);

  const symbol = settings?.symbol || "EURUSD";

  // Format volume for display
  const formatVolume = (value: number): string => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(2)}M`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}K`;
    }
    return value.toString();
  };

  // Listen for timezone changes
  useEffect(() => {
    const handleTimezoneChange = (event: CustomEvent) => {
      const { timezoneId } = event.detail;
      if (timezoneId) {
        setUserTimezone(timezoneId);
      }
    };

    window.addEventListener('timezoneChanged', handleTimezoneChange as EventListener);
    return () => {
      window.removeEventListener('timezoneChanged', handleTimezoneChange as EventListener);
    };
  }, []);

  // Initialize chart - only run once on mount
  useEffect(() => {
    if (!chartContainerRef.current) return;

    chartRef.current = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#9ca3af",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      },
      grid: {
        vertLines: { color: "rgba(100, 100, 100, 0.1)" },
        horzLines: { color: "rgba(100, 100, 100, 0.2)" },
      },
      rightPriceScale: {
        borderColor: "#374151",
        scaleMargins: { top: 0.1, bottom: 0.05 },
        visible: true,
      },
      timeScale: {
        rightOffset: 2,
        fixLeftEdge: true,
        borderColor: "#374151",
        timeVisible: true,
        secondsVisible: false, // Will be updated by separate effect based on timeFrame
      },
      crosshair: {
        mode: 1,
        vertLine: {
          color: "rgba(255, 255, 255, 0.2)",
          width: 1,
          style: 3,
          labelBackgroundColor: "#374151",
        },
        horzLine: {
          color: "rgba(255, 255, 255, 0.2)",
          width: 1,
          style: 3,
          labelBackgroundColor: "#374151",
        },
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: false,
      },
      handleScale: {
        mouseWheel: true,
        pinch: true,
        axisPressedMouseMove: true,
      },
    });

    // Add volume histogram series
    volumeSeriesRef.current = chartRef.current.addHistogramSeries({
      color: "#f97316",
      priceFormat: {
        type: "volume",
      },
      priceLineVisible: false,
      lastValueVisible: true,
    });

    // Resize observer
    const resize = () => {
      if (chartRef.current && chartContainerRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
        chartRef.current.timeScale().fitContent();
      }
    };

    const ro = new ResizeObserver(() => resize());
    ro.observe(chartContainerRef.current);
    resizeObserverRef.current = ro;

    // Initial resize
    resize();

    return () => {
      ro.disconnect();
      if (averageLineRef.current && volumeSeriesRef.current) {
        try {
          volumeSeriesRef.current.removePriceLine(averageLineRef.current);
        } catch {
          // Ignore
        }
      }
      chartRef.current?.remove();
      chartRef.current = null;
      volumeSeriesRef.current = null;
    };
  }, []);

  // Update time scale options when timeframe changes
  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.timeScale().applyOptions({
        secondsVisible: timeFrame === "1min",
      });
    }
  }, [timeFrame]);

  // Setup crosshair move handler for tooltip
  useEffect(() => {
    if (!chartRef.current) return;

    chartRef.current.subscribeCrosshairMove((param) => {
      if (!tooltipRef.current || !chartContainerRef.current) return;

      if (
        param.point === undefined ||
        !param.time ||
        param.point.x < 0 ||
        param.point.x > chartContainerRef.current.clientWidth ||
        param.point.y < 0 ||
        param.point.y > chartContainerRef.current.clientHeight
      ) {
        tooltipRef.current.style.display = "none";
      } else {
        const tooltip = tooltipRef.current;
        tooltip.style.display = "block";

        // Position tooltip near cursor
        const x = param.point.x + 20;
        const y = param.point.y - 10;

        // Keep tooltip within bounds
        const containerRect = chartContainerRef.current.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();
        
        let finalX = x;
        let finalY = y;

        if (x + tooltipRect.width > containerRect.width) {
          finalX = param.point.x - tooltipRect.width - 20;
        }
        if (y + tooltipRect.height > containerRect.height) {
          finalY = param.point.y - tooltipRect.height - 10;
        }

        tooltip.style.left = `${finalX}px`;
        tooltip.style.top = `${finalY}px`;

        // Format the date/time from the time parameter
        let dateStr = "";
        if (param.time) {
          const timeValue = typeof param.time === "number" ? param.time : Date.now() / 1000;
          const date = new Date(timeValue * 1000);
          
          switch (timeFrame) {
            case "1min":
              dateStr = date.toLocaleTimeString("en-US", {
                timeZone: userTimezone,
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              });
              break;
            case "1hour":
              dateStr = date.toLocaleDateString("en-US", {
                timeZone: userTimezone,
                month: "short",
                day: "numeric",
                hour: "2-digit",
              });
              break;
            case "1day":
              dateStr = date.toLocaleDateString("en-US", {
                timeZone: userTimezone,
                month: "short",
                day: "numeric",
                year: "numeric",
              });
              break;
            case "1week":
              dateStr = `Week of ${date.toLocaleDateString("en-US", {
                timeZone: userTimezone,
                month: "short",
                day: "numeric",
              })}`;
              break;
          }
        }

        // Get volume data at this time point
        if (volumeSeriesRef.current) {
          const volumeData = volumeSeriesRef.current.data();
          const dataPoint = volumeData.find((d) => d.time === param.time) as VolumeDataPoint | undefined;

          if (dataPoint && "value" in dataPoint) {
            const volume = dataPoint.value;
            const color = dataPoint.color || "#f97316";
            
            tooltip.innerHTML = `
              <div style="margin-bottom: 6px; padding-bottom: 4px; border-bottom: 1px solid rgba(55, 65, 81, 0.8); font-size: 10px; color: #9ca3af; font-weight: 500;">
                ${dateStr}
              </div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <div style="width: 10px; height: 10px; background-color: ${color}; border-radius: 2px;"></div>
                <span style="font-size: 11px; color: #e5e7eb;">Volume: <span style="color: ${color}; font-weight: 600;">${formatVolume(volume)}</span></span>
              </div>
            `;
          } else {
            tooltip.style.display = "none";
          }
        }
      }
    });
  }, [timeFrame, userTimezone]);

  // Generate and update volume data
  const updateVolumeData = useCallback(() => {
    const data = generateVolumeData(timeFrame, colorMode);
    volumeDataRef.current = data;
    
    const avg = calculateAverage(data);
    setAverageVolume(avg);

    if (volumeSeriesRef.current) {
      volumeSeriesRef.current.setData(data);

      // Remove existing average line
      if (averageLineRef.current) {
        try {
          volumeSeriesRef.current.removePriceLine(averageLineRef.current);
        } catch {
          // Ignore
        }
      }

      // Add average line
      averageLineRef.current = volumeSeriesRef.current.createPriceLine({
        price: avg,
        color: "#f97316",
        lineWidth: 2,
        lineStyle: 2, // Dashed
        axisLabelVisible: true,
        title: "AVG",
      });
    }

    if (chartRef.current) {
      chartRef.current.timeScale().fitContent();
    }
  }, [timeFrame, colorMode]);

  // Initial data load and when timeframe/colorMode changes
  useEffect(() => {
    updateVolumeData();
  }, [updateVolumeData]);

  // Update volume data periodically (simulate real-time updates)
  useEffect(() => {
    const interval = setInterval(() => {
      if (!volumeSeriesRef.current || !chartRef.current) return;

      const prevData = volumeDataRef.current;
      if (prevData.length === 0) return;

      // Remove oldest data point
      const newData = [...prevData.slice(1)];

      // Add new data point
      const now = new Date();
      const lastPoint = prevData[prevData.length - 1];
      const baseVolume = 150000 + Math.random() * 100000;
      const spike = Math.random() > 0.92 ? Math.random() * 200000 : 0;
      const volume = Math.floor(baseVolume + spike);

      const prevVolume = lastPoint?.value || 0;
      const isUp = volume >= prevVolume;
      const color = colorMode === "orange" ? "#f97316" : (isUp ? "#22c55e" : "#ef4444");

      const unixTime = Math.floor(now.getTime() / 1000) as Time;

      newData.push({
        time: unixTime,
        value: volume,
        color,
      });

      volumeDataRef.current = newData;
      volumeSeriesRef.current.setData(newData);

      // Update average
      const avg = calculateAverage(newData);
      setAverageVolume(avg);

      // Update average line
      if (averageLineRef.current) {
        try {
          volumeSeriesRef.current.removePriceLine(averageLineRef.current);
        } catch {
          // Ignore
        }
      }

      averageLineRef.current = volumeSeriesRef.current.createPriceLine({
        price: avg,
        color: "#f97316",
        lineWidth: 2,
        lineStyle: 2,
        axisLabelVisible: true,
        title: "AVG",
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [colorMode]);

  return (
    <div className="flex flex-col h-full bg-widget border border-border rounded-sm overflow-hidden relative">
      <div
        className={`flex flex-col h-full w-full transition-all duration-300 ${
          isSettingsOpen ? "blur-sm pointer-events-none" : "blur-0"
        }`}
      >
        <WidgetHeader
          title="Volume"
          subtitle={`[${getSymbolShortFormat(symbol)}]`}
          onSettings={onSettings}
          onRemove={onRemove}
          onFullscreen={onFullscreen}
          helpContent="Volume chart displays trading volume with real-time updates. Spikes indicate periods of high market activity. The dashed orange line shows the average volume."
        >
          {/* Timeframe selector */}
          <div className="flex items-center gap-1.5 mr-2">
            {TIME_FRAMES.map((tf, idx) => (
              <span key={tf.value} className="flex items-center">
                <button
                  onClick={() => setTimeFrame(tf.value)}
                  className={`text-xs tracking-wide transition-all px-1 ${
                    timeFrame === tf.value
                      ? "text-primary font-medium"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tf.value.replace("1", "").toUpperCase()}
                </button>
                {idx < TIME_FRAMES.length - 1 && (
                  <span className="text-xs text-border ml-1">|</span>
                )}
              </span>
            ))}
          </div>
          {/* Settings button */}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
          >
            <Settings2 className="w-4 h-4" />
          </Button>
        </WidgetHeader>

        {/* Chart Area */}
        <div className="flex-1 relative min-h-0">
          <div ref={chartContainerRef} className="absolute inset-0" />
          
          {/* Custom Tooltip */}
          <div
            ref={tooltipRef}
            className="absolute z-50 pointer-events-none hidden"
            style={{
              backgroundColor: "rgba(23, 23, 23, 0.95)",
              border: "1px solid rgba(55, 65, 81, 0.8)",
              borderRadius: "6px",
              padding: "10px 12px",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
              minWidth: "140px",
            }}
          />
        </div>

        {/* Footer stats */}
        <div className="px-3 py-2 border-t border-border bg-widget-header flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-sm" 
                style={{ backgroundColor: colorMode === "orange" ? "#f97316" : "#22c55e" }} 
              />
              <span className="text-[10px] text-muted-foreground">
                {colorMode === "orange" ? "Volume" : "Up"}
              </span>
            </div>
            {colorMode === "greenred" && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-red-500" />
                <span className="text-[10px] text-muted-foreground">Down</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div 
              className="w-4 h-0.5"
              style={{ 
                backgroundImage: "repeating-linear-gradient(to right, #f97316 0, #f97316 4px, transparent 4px, transparent 8px)" 
              }}
            />
            <span className="text-[10px] text-muted-foreground">
              Avg: <span className="text-foreground tabular-nums">{formatVolume(averageVolume)}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Settings Slide-in Panel */}
      <div
        className={`absolute top-0 right-0 h-full w-[280px] bg-card border-l border-border z-50 transition-transform duration-300 ease-out ${
          isSettingsOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-border bg-widget-header">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-primary" />
              <h3 className="text-[13px] text-foreground font-medium">Chart Settings</h3>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={() => setIsSettingsOpen(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">Volume • {symbol}</p>
        </div>

        {/* Content */}
        <ScrollArea className="h-[calc(100%-120px)]">
          <div className="p-4 space-y-6">
            {/* Time Frame */}
            <div className="space-y-3">
              <Label className="text-[12px] text-foreground">Time Frame</Label>
              <div className="space-y-2">
                {TIME_FRAMES.map((tf) => (
                  <button
                    key={tf.value}
                    onClick={() => setTimeFrame(tf.value)}
                    className={`w-full px-3 py-2.5 rounded border text-left transition-colors ${
                      timeFrame === tf.value
                        ? "bg-primary/10 border-primary text-primary"
                        : "bg-input border-border text-foreground hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[12px]">{tf.label}</span>
                      {timeFrame === tf.value && (
                        <Check className="w-3 h-3 text-primary" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <Separator className="bg-border" />

            {/* Color Mode */}
            <div className="space-y-3">
              <Label className="text-[12px] text-foreground">Color Mode</Label>
              <div className="space-y-2">
                {COLOR_MODES.map((mode) => (
                  <button
                    key={mode.value}
                    onClick={() => setColorMode(mode.value)}
                    className={`w-full px-3 py-2.5 rounded border text-left transition-colors ${
                      colorMode === mode.value
                        ? "bg-primary/10 border-primary text-primary"
                        : "bg-input border-border text-foreground hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[12px]">{mode.label}</span>
                      {colorMode === mode.value && (
                        <Check className="w-3 h-3 text-primary" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
              {colorMode === "greenred" && (
                <p className="text-[10px] text-muted-foreground mt-2">
                  Green bars indicate volume increasing from the previous bar, red bars indicate decreasing volume.
                </p>
              )}
            </div>

            <Separator className="bg-border" />

            {/* Average Line Info */}
            <div className="space-y-2">
              <Label className="text-[12px] text-foreground">Average Line</Label>
              <div className="bg-widget-header rounded p-3 border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <div 
                    className="w-6 h-0.5 rounded" 
                    style={{ 
                      backgroundImage: "repeating-linear-gradient(to right, #f97316 0, #f97316 4px, transparent 4px, transparent 8px)" 
                    }}
                  />
                  <span className="text-[11px] text-foreground">Average Volume</span>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  The dashed orange line represents the average volume across all visible bars.
                </p>
                <div className="mt-2 pt-2 border-t border-border">
                  <span className="text-[11px] text-muted-foreground">Current: </span>
                  <span className="text-[11px] text-primary tabular-nums font-medium">
                    {formatVolume(averageVolume)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border bg-widget-header">
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => setIsSettingsOpen(false)}
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

export default Volume;
