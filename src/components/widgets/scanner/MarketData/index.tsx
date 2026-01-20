'use client';

import { useState, useEffect, useRef } from "react";
import { WidgetHeader } from "@/components/bloomberg-ui/WidgetHeader";
import { ScrollArea } from "@/components/ui/scroll-area";

type WidgetSettings = Record<string, unknown>;

interface MarketDataProps {
  onSettings?: () => void;
  onRemove?: () => void;
  onFullscreen?: () => void;
  settings?: WidgetSettings;
}

interface MarketDataItem {
  id: string;
  category: "INDICES" | "FUTURES" | "BONDS" | "COMMODITIES" | "FOREX" | "CRYPTO";
  name: string;
  icon: string;
  iconBg: string;
  value: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  perf1W: number;
  perf4W: number;
  perf3M: number;
}

// Generate mock market data
const generateMarketData = (): MarketDataItem[] => {
  return [
    // INDICES
    {
      id: "spx",
      category: "INDICES",
      name: "S&P 500",
      icon: "500",
      iconBg: "bg-red-600",
      value: 6876.0,
      change: -10.0,
      changePercent: -0.14,
      open: 6885.9,
      high: 6921.9,
      low: 6836.4,
      perf1W: 2.34,
      perf4W: 5.67,
      perf3M: 12.45,
    },
    {
      id: "us100",
      category: "INDICES",
      name: "US 100",
      icon: "100",
      iconBg: "bg-blue-600",
      value: 25992.2,
      change: -86.6,
      changePercent: -0.33,
      open: 26078.8,
      high: 26257.5,
      low: 25801.8,
      perf1W: -1.25,
      perf4W: 3.45,
      perf3M: 8.92,
    },
    {
      id: "dow",
      category: "INDICES",
      name: "Dow 30",
      icon: "30",
      iconBg: "bg-blue-500",
      value: 47865.8,
      change: 268.5,
      changePercent: 0.56,
      open: 47597.3,
      high: 47865.8,
      low: 47387.9,
      perf1W: 1.89,
      perf4W: 4.23,
      perf3M: 9.76,
    },
    {
      id: "nikkei",
      category: "INDICES",
      name: "Nikkei 225",
      icon: "225",
      iconBg: "bg-purple-600",
      value: 51325.14,
      change: 17.96,
      changePercent: 0.04,
      open: 51146.27,
      high: 51657.28,
      low: 50972.56,
      perf1W: -0.56,
      perf4W: 2.18,
      perf3M: 7.34,
    },
    {
      id: "dax",
      category: "INDICES",
      name: "DAX Index",
      icon: "X",
      iconBg: "bg-blue-700",
      value: 24308.72,
      change: 68.89,
      changePercent: 0.28,
      open: 24332.85,
      high: 24348.59,
      low: 24185.84,
      perf1W: 3.12,
      perf4W: 6.45,
      perf3M: 11.23,
    },
    {
      id: "ftse",
      category: "INDICES",
      name: "UK 100",
      icon: "100",
      iconBg: "bg-purple-700",
      value: 9722.9,
      change: -24.8,
      changePercent: -0.25,
      open: 9747.7,
      high: 9774.1,
      low: 9689.1,
      perf1W: -1.45,
      perf4W: 1.89,
      perf3M: 5.67,
    },
    
    // FUTURES
    {
      id: "spx-fut",
      category: "FUTURES",
      name: "S&P 500",
      icon: "500",
      iconBg: "bg-red-600",
      value: 6873.25,
      change: -50.25,
      changePercent: -0.73,
      open: 6925.0,
      high: 6925.0,
      low: 6873.25,
      perf1W: 2.11,
      perf4W: 5.34,
      perf3M: 12.78,
    },
    {
      id: "euro-fut",
      category: "FUTURES",
      name: "Euro",
      icon: "€",
      iconBg: "bg-blue-600",
      value: 6246.7,
      change: -36.8,
      changePercent: -0.59,
      open: 6246.7,
      high: 6246.7,
      low: 6246.7,
      perf1W: -2.34,
      perf4W: -1.56,
      perf3M: 3.45,
    },
    {
      id: "gold-fut",
      category: "FUTURES",
      name: "Gold",
      icon: "⚡",
      iconBg: "bg-amber-500",
      value: 3988.77,
      change: 58.4,
      changePercent: 1.49,
      open: 3932.31,
      high: 4011.57,
      low: 3915.54,
      perf1W: 4.56,
      perf4W: 8.92,
      perf3M: 18.34,
    },
    {
      id: "oil-fut",
      category: "FUTURES",
      name: "WTI Crude Oil",
      icon: "🛢",
      iconBg: "bg-slate-700",
      value: 65.54232,
      change: -1.81272,
      changePercent: -2.69,
      open: 67.35504,
      high: 67.49504,
      low: 65.03455,
      perf1W: -3.45,
      perf4W: -5.67,
      perf3M: -8.92,
    },
    {
      id: "corn-fut",
      category: "FUTURES",
      name: "Corn",
      icon: "🌽",
      iconBg: "bg-yellow-600",
      value: 68.32,
      change: -0.09,
      changePercent: -0.13,
      open: 68.49,
      high: 68.76,
      low: 68.15,
      perf1W: 1.23,
      perf4W: -2.34,
      perf3M: 4.56,
    },
    
    // BONDS
    {
      id: "us10y",
      category: "BONDS",
      name: "US 10Y Treasury",
      icon: "10Y",
      iconBg: "bg-emerald-700",
      value: 4.238,
      change: 0.012,
      changePercent: 0.28,
      open: 4.226,
      high: 4.245,
      low: 4.218,
      perf1W: 0.45,
      perf4W: 1.23,
      perf3M: 2.67,
    },
    {
      id: "us30y",
      category: "BONDS",
      name: "US 30Y Treasury",
      icon: "30Y",
      iconBg: "bg-emerald-600",
      value: 4.512,
      change: 0.008,
      changePercent: 0.18,
      open: 4.504,
      high: 4.518,
      low: 4.498,
      perf1W: 0.56,
      perf4W: 1.45,
      perf3M: 3.12,
    },
    {
      id: "de10y",
      category: "BONDS",
      name: "German 10Y Bund",
      icon: "DE",
      iconBg: "bg-slate-600",
      value: 2.456,
      change: -0.015,
      changePercent: -0.61,
      open: 2.471,
      high: 2.478,
      low: 2.451,
      perf1W: -0.89,
      perf4W: 0.23,
      perf3M: 1.56,
    },
    {
      id: "uk10y",
      category: "BONDS",
      name: "UK 10Y Gilt",
      icon: "UK",
      iconBg: "bg-blue-800",
      value: 4.687,
      change: 0.023,
      changePercent: 0.49,
      open: 4.664,
      high: 4.695,
      low: 4.658,
      perf1W: 0.78,
      perf4W: 1.67,
      perf3M: 3.45,
    },
    
    // COMMODITIES
    {
      id: "gold",
      category: "COMMODITIES",
      name: "Gold Spot",
      icon: "AU",
      iconBg: "bg-amber-500",
      value: 3985.42,
      change: 45.23,
      changePercent: 1.15,
      open: 3940.19,
      high: 4002.67,
      low: 3928.55,
      perf1W: 4.23,
      perf4W: 8.76,
      perf3M: 17.89,
    },
    {
      id: "silver",
      category: "COMMODITIES",
      name: "Silver Spot",
      icon: "AG",
      iconBg: "bg-slate-400",
      value: 32.45,
      change: 0.87,
      changePercent: 2.75,
      open: 31.58,
      high: 32.68,
      low: 31.42,
      perf1W: 5.67,
      perf4W: 12.34,
      perf3M: 23.45,
    },
    {
      id: "oil",
      category: "COMMODITIES",
      name: "Crude Oil WTI",
      icon: "OIL",
      iconBg: "bg-slate-700",
      value: 65.89,
      change: -1.45,
      changePercent: -2.15,
      open: 67.34,
      high: 67.82,
      low: 65.12,
      perf1W: -3.21,
      perf4W: -6.45,
      perf3M: -9.87,
    },
    {
      id: "natgas",
      category: "COMMODITIES",
      name: "Natural Gas",
      icon: "NG",
      iconBg: "bg-cyan-700",
      value: 3.124,
      change: 0.086,
      changePercent: 2.83,
      open: 3.038,
      high: 3.156,
      low: 3.021,
      perf1W: 6.78,
      perf4W: -2.34,
      perf3M: 14.56,
    },
    
    // FOREX
    {
      id: "eurusd",
      category: "FOREX",
      name: "EUR/USD",
      icon: "€/$",
      iconBg: "bg-blue-600",
      value: 1.0842,
      change: 0.0012,
      changePercent: 0.11,
      open: 1.0830,
      high: 1.0856,
      low: 1.0825,
      perf1W: -1.23,
      perf4W: 2.45,
      perf3M: 4.67,
    },
    {
      id: "gbpusd",
      category: "FOREX",
      name: "GBP/USD",
      icon: "£/$",
      iconBg: "bg-purple-700",
      value: 1.2735,
      change: -0.0023,
      changePercent: -0.18,
      open: 1.2758,
      high: 1.2768,
      low: 1.2728,
      perf1W: -0.89,
      perf4W: 1.34,
      perf3M: 3.56,
    },
    {
      id: "usdjpy",
      category: "FOREX",
      name: "USD/JPY",
      icon: "$/¥",
      iconBg: "bg-red-600",
      value: 149.86,
      change: 0.45,
      changePercent: 0.30,
      open: 149.41,
      high: 150.12,
      low: 149.28,
      perf1W: 2.12,
      perf4W: -1.56,
      perf3M: 5.78,
    },
    
    // CRYPTO
    {
      id: "btc",
      category: "CRYPTO",
      name: "Bitcoin",
      icon: "₿",
      iconBg: "bg-orange-500",
      value: 98234.56,
      change: 2345.78,
      changePercent: 2.45,
      open: 95888.78,
      high: 98756.34,
      low: 95234.12,
      perf1W: 8.45,
      perf4W: 15.67,
      perf3M: 45.23,
    },
    {
      id: "eth",
      category: "CRYPTO",
      name: "Ethereum",
      icon: "Ξ",
      iconBg: "bg-indigo-600",
      value: 3456.89,
      change: -123.45,
      changePercent: -3.45,
      open: 3580.34,
      high: 3612.78,
      low: 3421.56,
      perf1W: -2.34,
      perf4W: 12.45,
      perf3M: 38.67,
    },
    {
      id: "bnb",
      category: "CRYPTO",
      name: "Binance Coin",
      icon: "BNB",
      iconBg: "bg-amber-600",
      value: 678.45,
      change: 12.34,
      changePercent: 1.85,
      open: 666.11,
      high: 682.90,
      low: 664.23,
      perf1W: 4.56,
      perf4W: 9.23,
      perf3M: 28.45,
    },
  ];
};

export function MarketData({ onSettings, onRemove, onFullscreen, settings }: MarketDataProps) {
  const [data, setData] = useState<MarketDataItem[]>(generateMarketData());
  const [flashingItems, setFlashingItems] = useState<Set<string>>(new Set());
  const [priceDirections, setPriceDirections] = useState<Record<string, "up" | "down">>({});
  const previousPrices = useRef<Record<string, number>>({});

  // Initialize previous prices
  useEffect(() => {
    data.forEach((item) => {
      previousPrices.current[item.id] = item.value;
    });
  }, []);

  // Simulate live price updates
  useEffect(() => {
    const interval = setInterval(() => {
      setData((prevData) => {
        const newFlashing = new Set<string>();
        const newDirections: Record<string, "up" | "down"> = {};

        const updatedData = prevData.map((item) => {
          const changeAmount = (Math.random() - 0.5) * (item.value * 0.001);
          const newValue = Math.max(0.01, item.value + changeAmount);
          const newChange = newValue - item.open;
          const newChangePercent = (newChange / item.open) * 100;

          // Check if price changed
          if (previousPrices.current[item.id] !== undefined) {
            if (newValue > previousPrices.current[item.id]) {
              newFlashing.add(item.id);
              newDirections[item.id] = "up";
            } else if (newValue < previousPrices.current[item.id]) {
              newFlashing.add(item.id);
              newDirections[item.id] = "down";
            }
          }

          previousPrices.current[item.id] = newValue;

          return {
            ...item,
            value: newValue,
            change: newChange,
            changePercent: newChangePercent,
            high: Math.max(item.high, newValue),
            low: Math.min(item.low, newValue),
          };
        });

        setFlashingItems(newFlashing);
        setPriceDirections(newDirections);

        // Clear flashing after animation
        setTimeout(() => {
          setFlashingItems(new Set());
        }, 600);

        return updatedData;
      });
    }, 2500);

    return () => clearInterval(interval);
  }, []);

  const formatValue = (value: number, decimals: number = 2): string => {
    return value.toLocaleString("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  const formatChange = (value: number, decimals: number = 2): string => {
    const formatted = formatValue(Math.abs(value), decimals);
    return value >= 0 ? `+${formatted}` : `-${formatted}`;
  };

  const getChangeColor = (value: number): string => {
    if (value > 0) return "text-emerald-400";
    if (value < 0) return "text-red-400";
    return "text-muted-foreground";
  };

  const categories = ["INDICES", "FUTURES", "BONDS", "COMMODITIES", "FOREX", "CRYPTO"] as const;

  return (
    <div className="h-full flex flex-col bg-widget border border-border">
      <WidgetHeader title="Market Data" onSettings={onSettings} onRemove={onRemove} onFullscreen={onFullscreen} />

      {/* Table Header */}
      <div className="border-b border-border bg-[#1a1a1a] sticky top-0 z-10">
        <div className="flex items-center text-[11px] text-muted-foreground font-semibold">
          <div className="w-[200px] px-3 py-1.5 border-r border-border/50">Name</div>
          <div className="w-[120px] px-3 py-1.5 border-r border-border/50 text-right">Value</div>
          <div className="w-[100px] px-3 py-1.5 border-r border-border/50 text-right">Change</div>
          <div className="w-[90px] px-3 py-1.5 border-r border-border/50 text-right">Chg%</div>
          <div className="w-[180px] px-3 py-1.5 border-r border-border/50 text-center">Day Range</div>
          <div className="w-[120px] px-3 py-1.5 border-r border-border/50 text-right">Open</div>
          <div className="w-[120px] px-3 py-1.5 border-r border-border/50 text-right">High</div>
          <div className="w-[120px] px-3 py-1.5 border-r border-border/50 text-right">Low</div>
          <div className="w-[90px] px-3 py-1.5 border-r border-border/50 text-center">1W %</div>
          <div className="w-[90px] px-3 py-1.5 border-r border-border/50 text-center">4W %</div>
          <div className="w-[90px] px-3 py-1.5 text-center">3M %</div>
        </div>
      </div>

      {/* Table Body */}
      <ScrollArea className="flex-1">
        <div>
          {categories.map((category) => {
            const categoryItems = data.filter((item) => item.category === category);
            if (categoryItems.length === 0) return null;

            return (
              <div key={category}>
                {/* Category Header */}
                <div className="bg-[#1a1a1a] border-b border-border/50 px-3 py-1.5">
                  <span className="text-[11px] font-semibold text-muted-foreground tracking-wide">
                    {category}
                  </span>
                </div>

                {/* Category Items */}
                {categoryItems.map((item, idx) => (
                  <div
                    key={item.id}
                    className={`flex items-center border-b border-border/30 hover:bg-primary/5 transition-all duration-200 ${
                      idx % 2 === 0 ? "bg-black/20" : "bg-black/10"
                    }`}
                  >
                    {/* Name with Icon */}
                    <div className="w-[200px] px-3 py-1.5 border-r border-border/30">
                      <div className="flex items-center gap-2">
                        <div
                          className={`${item.iconBg} rounded px-1.5 py-0.5 text-[10px] text-white font-semibold min-w-[32px] text-center flex items-center justify-center`}
                        >
                          {item.icon}
                        </div>
                        <span className="text-[11px] text-foreground">{item.name}</span>
                      </div>
                    </div>

                    {/* Value */}
                    <div className="w-[120px] px-3 py-1.5 border-r border-border/30 text-right">
                      <span
                        className={`text-[11px] text-foreground tabular-nums transition-all duration-300 ${
                          flashingItems.has(item.id)
                            ? priceDirections[item.id] === "up"
                              ? "text-green-400 scale-110"
                              : "text-red-400 scale-110"
                            : ""
                        }`}
                        style={{
                          animation: flashingItems.has(item.id)
                            ? priceDirections[item.id] === "up"
                              ? "flashGreen 0.6s ease-out"
                              : "flashRed 0.6s ease-out"
                            : "none",
                        }}
                      >
                        {formatValue(item.value, item.value > 1000 ? 2 : item.value > 10 ? 3 : 5)}
                      </span>
                    </div>

                    {/* Change */}
                    <div className="w-[100px] px-2 py-1.5 border-r border-border/30">
                      <div className="bg-slate-500/10 rounded px-2 py-1 text-center">
                        <span
                          className={`text-[11px] tabular-nums transition-all duration-300 ${getChangeColor(
                            item.change
                          )} ${
                            flashingItems.has(item.id)
                              ? priceDirections[item.id] === "up"
                                ? "scale-110"
                                : "scale-110"
                              : ""
                          }`}
                          style={{
                            animation: flashingItems.has(item.id)
                              ? priceDirections[item.id] === "up"
                                ? "flashGreen 0.6s ease-out"
                                : "flashRed 0.6s ease-out"
                              : "none",
                          }}
                        >
                          {formatChange(item.change, item.value > 1000 ? 2 : item.value > 10 ? 3 : 5)}
                        </span>
                      </div>
                    </div>

                    {/* Change % */}
                    <div className="w-[90px] px-2 py-1.5 border-r border-border/30">
                      <div className="bg-slate-500/10 rounded px-2 py-1 text-center">
                        <span
                          className={`text-[11px] tabular-nums transition-all duration-300 ${getChangeColor(
                            item.changePercent
                          )} ${
                            flashingItems.has(item.id)
                              ? priceDirections[item.id] === "up"
                                ? "scale-110"
                                : "scale-110"
                              : ""
                          }`}
                          style={{
                            animation: flashingItems.has(item.id)
                              ? priceDirections[item.id] === "up"
                                ? "flashGreen 0.6s ease-out"
                                : "flashRed 0.6s ease-out"
                              : "none",
                          }}
                        >
                          {formatChange(item.changePercent, 2)}%
                        </span>
                      </div>
                    </div>

                    {/* Day Range Bar */}
                    <div className="w-[180px] px-3 py-1.5 border-r border-border/30">
                      <div className="flex flex-col gap-0.5">
                        {/* Price range labels */}
                        <div className="flex justify-between text-[9px] text-muted-foreground tabular-nums">
                          <span>{formatValue(item.low, item.value > 1000 ? 1 : item.value > 10 ? 2 : 4)}</span>
                          <span>{formatValue(item.high, item.value > 1000 ? 1 : item.value > 10 ? 2 : 4)}</span>
                        </div>
                        {/* Range bar */}
                        <div className="relative h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
                          {/* Calculate position percentage */}
                          {(() => {
                            const range = item.high - item.low;
                            const position = range > 0 ? ((item.value - item.low) / range) * 100 : 50;
                            const isPositive = item.change >= 0;
                            
                            return (
                              <>
                                {/* Bar fill based on direction */}
                                <div 
                                  className={`absolute h-full ${isPositive ? 'bg-emerald-500/30' : 'bg-red-500/30'} transition-all duration-300`}
                                  style={{ 
                                    left: isPositive ? '50%' : `${position}%`,
                                    right: isPositive ? `${100 - position}%` : '50%'
                                  }}
                                />
                                {/* Current position marker */}
                                <div 
                                  className="absolute top-0 h-full w-0.5 transition-all duration-300"
                                  style={{ 
                                    left: `${position}%`,
                                    backgroundColor: isPositive ? '#10b981' : '#ef4444'
                                  }}
                                />
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    </div>

                    {/* Open */}
                    <div className="w-[120px] px-2 py-1.5 border-r border-border/30">
                      <div className="bg-slate-500/10 rounded px-2 py-1 text-center">
                        <span className="text-[11px] text-muted-foreground tabular-nums">
                          {formatValue(item.open, item.value > 1000 ? 2 : item.value > 10 ? 3 : 5)}
                        </span>
                      </div>
                    </div>

                    {/* High */}
                    <div className="w-[120px] px-2 py-1.5 border-r border-border/30">
                      <div className="bg-slate-500/10 rounded px-2 py-1 text-center">
                        <span className="text-[11px] text-muted-foreground tabular-nums">
                          {formatValue(item.high, item.value > 1000 ? 2 : item.value > 10 ? 3 : 5)}
                        </span>
                      </div>
                    </div>

                    {/* Low */}
                    <div className="w-[120px] px-2 py-1.5 border-r border-border/30">
                      <div className="bg-slate-500/10 rounded px-2 py-1 text-center">
                        <span className="text-[11px] text-muted-foreground tabular-nums">
                          {formatValue(item.low, item.value > 1000 ? 2 : item.value > 10 ? 3 : 5)}
                        </span>
                      </div>
                    </div>

                    {/* 1W Performance */}
                    <div className="w-[90px] px-2 py-1.5 border-r border-border/30">
                      <div
                        className={`${
                          item.perf1W >= 0
                            ? "bg-emerald-500/20"
                            : "bg-red-500/20"
                        } rounded px-2 py-1 text-center`}
                      >
                        <span
                          className={`text-[11px] tabular-nums ${
                            item.perf1W >= 0 ? "text-emerald-400" : "text-red-400"
                          }`}
                        >
                          {formatChange(item.perf1W, 2)}%
                        </span>
                      </div>
                    </div>

                    {/* 4W Performance */}
                    <div className="w-[90px] px-2 py-1.5 border-r border-border/30">
                      <div
                        className={`${
                          item.perf4W >= 0
                            ? "bg-emerald-500/20"
                            : "bg-red-500/20"
                        } rounded px-2 py-1 text-center`}
                      >
                        <span
                          className={`text-[11px] tabular-nums ${
                            item.perf4W >= 0 ? "text-emerald-400" : "text-red-400"
                          }`}
                        >
                          {formatChange(item.perf4W, 2)}%
                        </span>
                      </div>
                    </div>

                    {/* 3M Performance */}
                    <div className="w-[90px] px-2 py-1.5">
                      <div
                        className={`${
                          item.perf3M >= 0
                            ? "bg-emerald-500/20"
                            : "bg-red-500/20"
                        } rounded px-2 py-1 text-center`}
                      >
                        <span
                          className={`text-[11px] tabular-nums ${
                            item.perf3M >= 0 ? "text-emerald-400" : "text-red-400"
                          }`}
                        >
                          {formatChange(item.perf3M, 2)}%
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </ScrollArea>

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

export default MarketData;

