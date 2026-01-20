'use client';

import React, { useState, useEffect } from 'react';
import { WidgetHeader } from '@/components/bloomberg-ui/WidgetHeader';
import { WidgetSettingsSlideIn } from '@/components/bloomberg-ui/WidgetSettingsSlideIn';
import {
  fetchCashFlowReport,
  transformApiCashFlowResponse,
  type CashFlowRow
} from './api';
import { widgetDataCache } from '@/lib/widgetDataCache';

type WidgetSettings = Record<string, unknown>;

interface CashFlowReportProps {
  onSettings?: () => void;
  onRemove?: () => void;
  onFullscreen?: () => void;
  settings?: WidgetSettings;
}

export function CashFlowReport({ onSettings, onRemove, onFullscreen, settings = {} }: CashFlowReportProps) {
  const [isSettingsPanelOpen, setIsSettingsPanelOpen] = useState(false);
  const [localSettings, setLocalSettings] = useState(settings);
  const [cashFlowData, setCashFlowData] = useState<CashFlowRow[]>([]);
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

  // Fetch cash flow report when symbol changes
  useEffect(() => {
    const loadCashFlowReport = async () => {
      const cacheKey = widgetDataCache.generateKey('cash-flow-report', { symbol });
      const cachedData = widgetDataCache.get<{ data: CashFlowRow[]; years: string[] }>(cacheKey);
      
      if (cachedData) {
        setCashFlowData(cachedData.data);
        setYears(cachedData.years);
        setIsLoading(false);
        return;
      }

      console.log('🔄 [Cash Flow Report Component] Starting to load cash flow for:', symbol);
      setIsLoading(true);
      setError(null);
      
      try {
        const apiResponse = await fetchCashFlowReport(symbol);
        
        if (!apiResponse) {
          console.error('❌ [Cash Flow Report Component] API response is null');
          setError('Failed to load cash flow report: No response');
          setIsLoading(false);
          return;
        }
        
        if (!apiResponse.success || !apiResponse.data) {
          console.error('❌ [Cash Flow Report Component] API response not successful');
          setError('Failed to load cash flow report: API returned error');
          setIsLoading(false);
          return;
        }
        
        console.log('✅ [Cash Flow Report Component] Transforming data');
        const transformed = transformApiCashFlowResponse(apiResponse.data);
        console.log('✅ [Cash Flow Report Component] Transformed data:', transformed);
        
        setCashFlowData(transformed.data);
        setYears(transformed.years);
        widgetDataCache.set(cacheKey, { data: transformed.data, years: transformed.years });
        setIsLoading(false);
      } catch (err) {
        console.error('❌ [Cash Flow Report Component] Error loading cash flow report:', err);
        setError(err instanceof Error ? err.message : 'Failed to load cash flow report');
        setIsLoading(false);
      }
    };
    
    loadCashFlowReport();
  }, [symbol]);

  const formatValue = (value: number | null): string => {
    if (value === null) return '-';
    
    const absValue = Math.abs(value);
    
    // Format as thousands with commas
    const formatted = absValue.toLocaleString('en-US', {
      maximumFractionDigits: 0
    });
    
    return value < 0 ? `(${formatted})` : formatted;
  };

  const calculateYoY = (current: number | null, previous: number | null): number | null => {
    if (current === null || previous === null || previous === 0) return null;
    return ((current - previous) / Math.abs(previous)) * 100;
  };

  const formatYoY = (value: number | null): string => {
    if (value === null) return '-';
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  };

  const handleSaveSettings = (newSettings: Record<string, unknown>) => {
    setLocalSettings(newSettings);
    setIsSettingsPanelOpen(false);
  };

  return (
    <div className="h-full bg-widget-body border border-border rounded-none flex flex-col">
      <WidgetHeader 
        title="Cash Flow Report"
        subtitle={symbolWithPrefix ? `[@${symbolWithPrefix.replace(/^[^:]+:/, '')}]` : ''}
        onSettings={() => setIsSettingsPanelOpen(true)}
        onRemove={onRemove}
        onFullscreen={onFullscreen}
        helpContent="Annual cash flow statement showing operating, investing, and financing activities. All values in millions USD."
      />
      
      <WidgetSettingsSlideIn
        isOpen={isSettingsPanelOpen}
        onClose={() => setIsSettingsPanelOpen(false)}
        widgetType="cash-flow-report"
        widgetPosition=""
        currentSettings={localSettings}
        onSave={handleSaveSettings}
      />
      
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-sm text-muted-foreground">Loading cash flow report...</div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-sm text-destructive">{error}</div>
          </div>
        ) : cashFlowData.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-sm text-muted-foreground">No cash flow data available</div>
          </div>
        ) : (
        <table className="w-full text-lg">
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
            {cashFlowData.map((row, index) => {
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

              // Regular data rows
              return (
                <tr key={index} className="hover:bg-muted/5 transition-colors">
                  <td className={`px-4 py-2 text-lg ${
                    row.indent ? 'pl-8' : ''
                  } ${
                    row.isBold ? 'font-semibold' : ''
                  }`}>
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
    </div>
  );
}

export default CashFlowReport;

