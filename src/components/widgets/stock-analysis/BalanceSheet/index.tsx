'use client';

import React, { useState, useEffect } from "react";
import { WidgetHeader } from "@/components/bloomberg-ui/WidgetHeader";
import { WidgetSettingsSlideIn } from "@/components/bloomberg-ui/WidgetSettingsSlideIn";
import {
  fetchBalanceSheet,
  transformApiBalanceSheetResponse,
  type BalanceSheetData
} from './api';
import { widgetDataCache } from '@/lib/widgetDataCache';

type WidgetSettings = Record<string, unknown>;

// Years will be determined from API data
const years: string[] = [];

interface BalanceSheetProps {
  onSettings?: () => void;
  onRemove?: () => void;
  onFullscreen?: () => void;
  settings?: WidgetSettings;
}

export function BalanceSheet({ onSettings, onRemove, onFullscreen, settings = {} }: BalanceSheetProps) {
  const [isSettingsPanelOpen, setIsSettingsPanelOpen] = useState(false);
  const [localSettings, setLocalSettings] = useState(settings);
  const [balanceSheetData, setBalanceSheetData] = useState<BalanceSheetData[]>([]);
  const [years, setYears] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sync localSettings with external settings prop when it changes
  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  // Get symbol from localSettings (which updates when user saves from slide-in menu)
  // Note: API expects symbol without exchange prefix (e.g., "AAPL" not "NASDAQ:AAPL")
  const symbolWithPrefix = (localSettings.symbol as string) || 'NASDAQ:AAL';
  const symbol = symbolWithPrefix.replace(/^[^:]+:/, ''); // Remove exchange prefix for API

  // Fetch balance sheet when symbol changes
  useEffect(() => {
    const loadBalanceSheet = async () => {
      const cacheKey = widgetDataCache.generateKey('balance-sheet', { symbol });
      const cachedData = widgetDataCache.get<{ data: BalanceSheetData[]; years: string[] }>(cacheKey);
      
      if (cachedData) {
        setBalanceSheetData(cachedData.data);
        setYears(cachedData.years);
        setIsLoading(false);
        return;
      }

      console.log('🔄 [Balance Sheet Component] Starting to load balance sheet for:', symbol);
      setIsLoading(true);
      setError(null);
      
      try {
        const apiResponse = await fetchBalanceSheet(symbol);
        
        if (!apiResponse) {
          console.error('❌ [Balance Sheet Component] API response is null');
          setError('Failed to load balance sheet: No response');
          setIsLoading(false);
          return;
        }
        
        if (!apiResponse.success || !apiResponse.data) {
          console.error('❌ [Balance Sheet Component] API response not successful');
          setError('Failed to load balance sheet: API returned error');
          setIsLoading(false);
          return;
        }
        
        console.log('✅ [Balance Sheet Component] Transforming data');
        const transformed = transformApiBalanceSheetResponse(apiResponse.data);
        console.log('✅ [Balance Sheet Component] Transformed data:', transformed);
        
        setBalanceSheetData(transformed.data);
        setYears(transformed.years);
        widgetDataCache.set(cacheKey, { data: transformed.data, years: transformed.years });
        setIsLoading(false);
      } catch (err) {
        console.error('❌ [Balance Sheet Component] Error loading balance sheet:', err);
        setError(err instanceof Error ? err.message : 'Failed to load balance sheet');
        setIsLoading(false);
      }
    };

    loadBalanceSheet();
  }, [symbol]);

  const formatValue = (value: number | null): string => {
    if (value === null) return "-";
    if (value < 0) return `(${Math.abs(value).toLocaleString()})`;
    return value.toLocaleString();
  };

  const calculateYoY = (currentValue: number | null, previousValue: number | null): number | null => {
    if (currentValue === null || previousValue === null || previousValue === 0) return null;
    return ((currentValue - previousValue) / Math.abs(previousValue)) * 100;
  };

  const formatYoY = (yoy: number | null): string => {
    if (yoy === null) return "-";
    return `${yoy >= 0 ? '+' : ''}${yoy.toFixed(1)}%`;
  };

  const handleSaveSettings = (newSettings: Record<string, unknown>) => {
    setLocalSettings(newSettings);
    setIsSettingsPanelOpen(false);
  };

  return (
    <div className="w-full h-full bg-widget-body border border-border flex flex-col">
      <WidgetHeader 
        title="Balance Sheet"
        subtitle={symbolWithPrefix ? `[@${symbolWithPrefix.replace(/^[^:]+:/, '')}]` : ''}
        onSettings={() => setIsSettingsPanelOpen(true)}
        onRemove={onRemove}
        onFullscreen={onFullscreen}
        helpContent="Annual balance sheet showing assets, liabilities, and shareholders' equity. All values in millions USD. Parentheses indicate negative values."
      />
      
      <WidgetSettingsSlideIn
        isOpen={isSettingsPanelOpen}
        onClose={() => setIsSettingsPanelOpen(false)}
        widgetType="balance-sheet"
        widgetPosition=""
        currentSettings={localSettings}
        onSave={handleSaveSettings}
      />
      
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-sm text-muted-foreground">Loading balance sheet...</div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-sm text-destructive">{error}</div>
          </div>
        ) : balanceSheetData.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-sm text-muted-foreground">No balance sheet data available</div>
          </div>
        ) : (
        <table className="w-full">
          <thead className="sticky top-0 bg-widget-body z-10 border-b border-border">
            <tr>
              <th className="text-left px-4 py-3 text-lg text-muted-foreground">Metric</th>
              {years.map(year => (
                <th key={year} className="text-right px-4 py-3 text-lg text-muted-foreground">
                  {year}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {balanceSheetData.map((row, index) => {
              // Handle spacer rows
              if (row.category === "spacer") {
                return (
                  <tr key={`spacer-${index}`}>
                    <td colSpan={years.length + 1} className="h-3"></td>
                  </tr>
                );
              }

              // Handle header rows
              if (row.category === "header") {
                return (
                  <tr key={index} className="border-t border-border">
                    <td 
                      colSpan={years.length + 1} 
                      className="px-4 py-2 text-lg text-primary uppercase tracking-wide"
                    >
                      {row.metric}
                    </td>
                  </tr>
                );
              }

              return (
                <tr 
                  key={index}
                  className="border-b border-border/20 hover:bg-accent/5 transition-colors"
                >
                  <td 
                    className={`px-4 py-2 text-lg ${
                      row.isSubItem ? 'pl-8 text-foreground/80' : ''
                    } ${
                      row.isBold ? 'font-semibold text-foreground' : ''
                    }`}
                  >
                    {row.metric}
                  </td>
                  {years.map((year, idx) => {
                    const value = row.values[year];
                    const isNegative = value !== null && value < 0;

                    // Calculate YoY if not first year
                    const previousYear = idx > 0 ? years[idx - 1] : null;
                    const previousValue = previousYear ? row.values[previousYear] : null;
                    const yoyChange = previousYear ? calculateYoY(value, previousValue) : null;

                    return (
                      <td 
                        key={year}
                        className={`px-4 py-2 text-lg text-right tabular-nums transition-all duration-300 ${
                          row.isBold ? 'font-semibold' : ''
                        } ${
                          isNegative ? 'text-destructive' : ''
                        }`}
                      >
                        {value !== null ? (
                          <span className="inline-flex items-center gap-1.5">
                            <span className={`inline-block px-2 py-0.5 rounded ${
                              row.isBold ? 'bg-primary/10' : ''
                            }`}>
                              {formatValue(value)}
                            </span>
                            {yoyChange !== null && (
                              <span className={`text-sm px-1.5 py-0.5 rounded-full ${
                                yoyChange >= 0 
                                  ? 'bg-green-500/20 text-green-500' 
                                  : 'bg-red-500/20 text-red-500'
                              }`}>
                                {formatYoY(yoyChange)}
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
        )}
      </div>

      {/* Footer info */}
      <div className="border-t border-border px-4 py-2 text-muted-foreground text-center text-xl">
        Values in millions USD
      </div>
    </div>
  );
}

export default BalanceSheet;

