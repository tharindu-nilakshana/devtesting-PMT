"use client";

import { useState, useEffect } from "react";
import { WidgetHeader } from "@/components/bloomberg-ui/WidgetHeader";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  fetchSmartBiasChartData,
  transformApiResponseToWeekData,
  WeekData,
  BiasValue,
} from "./api";
import { widgetDataCache } from '@/lib/widgetDataCache';

interface SmartBiasChartProps {
  onSettings?: () => void;
  onRemove?: () => void;
  onFullscreen?: () => void;
  settings?: Record<string, unknown>;
  onSaveSettings?: (settings: Record<string, any>) => void;
}

// Currency flags
const currencyFlags: Record<string, string> = {
  USD: "🇺🇸",
  EUR: "🇪🇺",
  GBP: "🇬🇧",
  CAD: "🇨🇦",
  AUD: "🇦🇺",
  NZD: "🇳🇿",
  JPY: "🇯🇵",
  CHF: "🇨🇭",
};

const currencies = ["USD", "EUR", "GBP", "CAD", "AUD", "NZD", "JPY", "CHF"];

const getBiasColor = (bias: BiasValue): string => {
  switch (bias) {
    case "Very Bullish":
      return "bg-[#047857] text-white";
    case "Bullish":
      return "bg-[#059669] text-white";
    case "Weak Bullish":
      return "bg-[#10b981] text-white";
    case "Neutral":
      return "bg-[#6b7280] text-white";
    case "Bearish":
      return "bg-[#dc2626] text-white";
    case "Very Bearish":
      return "bg-[#991b1b] text-white";
    case "Weak Bearish":
      return "bg-[#ef4444] text-white";
    default:
      return "bg-muted text-foreground";
  }
};



export function SmartBiasChart({ onSettings, onRemove, onFullscreen, settings, onSaveSettings }: SmartBiasChartProps) {
  const [hoveredColumn, setHoveredColumn] = useState<number | null>(null);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [weeklyData, setWeeklyData] = useState<WeekData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Configuration state - initialize from settings prop or defaults
  // Note: weeksBack in settings is stored as string (e.g., "4", "8", "16")
  const [weeksBack, setWeeksBack] = useState<number>(() => {
    const settingsWeeksBack = settings?.weeksBack;
    if (typeof settingsWeeksBack === 'number') return settingsWeeksBack;
    if (typeof settingsWeeksBack === 'string') return parseInt(settingsWeeksBack, 10) || 16;
    return 16;
  });
  const [selectedCurrency, setSelectedCurrency] = useState<string>(
    (settings?.symbol as string) || ''
  );

  // Get currencies to display - filter if currency is selected
  const displayCurrencies = selectedCurrency 
    ? [selectedCurrency].filter(c => currencies.includes(c))
    : currencies;

  // Fetch chart data when weeksBack changes
  useEffect(() => {
    const loadChartData = async () => {
      const cacheKey = widgetDataCache.generateKey('smart-bias-chart', { weeksBack, currency: selectedCurrency });
      const cachedData = widgetDataCache.get<WeekData[]>(cacheKey);
      
      if (cachedData) {
        setWeeklyData(cachedData);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      
      try {
        const apiResponse = await fetchSmartBiasChartData(weeksBack, selectedCurrency);
        
        if (!apiResponse) {
          setError('Failed to load chart data');
          setLoading(false);
          return;
        }

        const transformedData = transformApiResponseToWeekData(apiResponse);
        
        if (transformedData.length === 0) {
          setError('No chart data available');
        } else {
          setWeeklyData(transformedData);
          widgetDataCache.set(cacheKey, transformedData);
        }
      } catch (err) {
        console.error('Error loading Smart Bias Chart data:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    loadChartData();
  }, [weeksBack, selectedCurrency]);

  return (
    <div className="flex flex-col h-full bg-widget-body border border-border rounded-none overflow-hidden">
      <WidgetHeader 
        title="Smart Bias History"
        onRemove={onRemove}
        onFullscreen={onFullscreen}
      >
        {/* Configuration Controls */}
        <div className="flex items-center gap-2 mr-2">
          {/* Currency Filter */}
          <Select 
            value={selectedCurrency || 'all'} 
            onValueChange={(value) => {
              const newCurrency = value === 'all' ? '' : value;
              setSelectedCurrency(newCurrency);
              if (onSaveSettings) {
                onSaveSettings({ currency: newCurrency || 'all', weeksBack });
              }
            }}
          >
            <SelectTrigger className="h-7 w-[90px] bg-widget-header border-border text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border">
              <SelectItem value="all" className="text-xs cursor-pointer">All</SelectItem>
              {currencies.map((currency) => (
                <SelectItem key={currency} value={currency} className="text-xs cursor-pointer">
                  {currencyFlags[currency]} {currency}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {/* Weeks Back Selector */}
          <Select 
            value={weeksBack.toString()} 
            onValueChange={(value) => {
              const newWeeksBack = parseInt(value, 10);
              setWeeksBack(newWeeksBack);
              if (onSaveSettings) {
                onSaveSettings({ currency: selectedCurrency || 'all', weeksBack: newWeeksBack });
              }
            }}
          >
            <SelectTrigger className="h-7 w-[100px] bg-widget-header border-border text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border">
              <SelectItem value="4" className="text-xs cursor-pointer">4 Weeks</SelectItem>
              <SelectItem value="8" className="text-xs cursor-pointer">8 Weeks</SelectItem>
              <SelectItem value="12" className="text-xs cursor-pointer">12 Weeks</SelectItem>
              <SelectItem value="16" className="text-xs cursor-pointer">16 Weeks</SelectItem>
              <SelectItem value="20" className="text-xs cursor-pointer">20 Weeks</SelectItem>
              <SelectItem value="24" className="text-xs cursor-pointer">24 Weeks</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </WidgetHeader>

      <div className="flex-1 overflow-auto custom-scrollbar">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-base text-muted-foreground">Loading chart data...</div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-base text-destructive">Error: {error}</div>
          </div>
        ) : weeklyData.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-base text-muted-foreground">No chart data available</div>
          </div>
        ) : (
        <table className="w-full text-sm border-collapse">
          <thead className="sticky top-0 bg-widget-header z-10">
            <tr>
              <th className="text-left px-3 py-2 border-b border-r border-border text-sm text-muted-foreground min-w-[100px]">
                Currency
              </th>
              {weeklyData.map((weekData, index) => (
                <th 
                  key={weekData.week}
                  onMouseEnter={() => setHoveredColumn(index)}
                  onMouseLeave={() => setHoveredColumn(null)}
                  className={`text-center px-3 py-2 border-b border-r text-muted-foreground whitespace-nowrap min-w-[100px] transition-colors ${
                    index === 0 ? "border-l-2 border-r-2 border-t-2 border-primary" : "border-border"
                  } ${hoveredColumn === index ? "bg-primary/10" : ""}`}
                >
                  <div className="flex flex-col items-center gap-0.5">
                    {index === 0 && (
                      <span className="text-xs text-primary uppercase tracking-wide">Latest</span>
                    )}
                    <span className="text-sm">{weekData.week}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayCurrencies.map((currency, currencyIndex) => (
              <tr 
                key={currency} 
                className="transition-colors"
                onMouseEnter={() => setHoveredRow(currency)}
                onMouseLeave={() => setHoveredRow(null)}
              >
                <td className={`px-3 py-3 border-b border-r border-border min-w-[100px] transition-colors ${
                  hoveredRow === currency ? "bg-primary/10" : ""
                }`}>
                  <div className="flex items-center gap-2">
                    <span className="flag-container">
                      <span className="flag-emoji">{currencyFlags[currency]}</span>
                    </span>
                    <span className="font-medium text-base">{currency}</span>
                  </div>
                </td>
                {weeklyData.map((weekData, index) => {
                  const bias = weekData.data[currency];
                  const isLastRow = currencyIndex === displayCurrencies.length - 1;
                  
                  return (
                    <td 
                      key={`${currency}-${weekData.week}`}
                      onMouseEnter={() => setHoveredColumn(index)}
                      onMouseLeave={() => setHoveredColumn(null)}
                      className={`text-center px-0 py-0 border-r ${getBiasColor(bias)} min-w-[100px] transition-all ${
                        index === 0 
                          ? `border-l-2 border-r-2 border-primary ${isLastRow ? "border-b-2" : "border-b"}` 
                          : `border-border ${isLastRow ? "border-b" : "border-b"}`
                      } ${hoveredColumn === index ? "brightness-125 shadow-lg" : ""} ${
                        hoveredRow === currency ? "brightness-110" : ""
                      }`}
                    >
                      <div className="h-full w-full flex items-center justify-center px-2 py-4">
                        <span className="text-sm font-medium">{bias}</span>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        )}
      </div>


    </div>
  );
}

export default SmartBiasChart;

