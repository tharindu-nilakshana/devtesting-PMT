'use client';

import React, { useState, useEffect } from 'react';
import { WidgetHeader } from '@/components/bloomberg-ui/WidgetHeader';
import { WidgetSettingsSlideIn } from '@/components/bloomberg-ui/WidgetSettingsSlideIn';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { getUserTimezoneSync } from '@/utils/systemVariablesClient';
import {
  fetchInsiderTransactions,
  transformApiTransactionsResponse,
  type Transaction
} from './api';
import { widgetDataCache } from '@/lib/widgetDataCache';

type WidgetSettings = Record<string, unknown>;

interface InsiderTransactionsProps {
  onSettings?: () => void;
  onRemove?: () => void;
  onFullscreen?: () => void;
  settings?: WidgetSettings;
}

export function InsiderTransactions({ onSettings, onRemove, onFullscreen, settings = {} }: InsiderTransactionsProps) {
  const [isSettingsPanelOpen, setIsSettingsPanelOpen] = useState(false);
  const [localSettings, setLocalSettings] = useState(settings);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sync localSettings with external settings prop when it changes
  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  // Get symbol from localSettings (which updates when user saves from slide-in menu)
  const symbol = (localSettings.symbol as string) || 'NASDAQ:AAL';
  const [userTimezone, setUserTimezone] = useState<string>(getUserTimezoneSync);

  // Fetch insider transactions when symbol changes
  useEffect(() => {
    const loadTransactions = async () => {
      const cacheKey = widgetDataCache.generateKey('insider-transactions', { symbol });
      const cachedData = widgetDataCache.get<Transaction[]>(cacheKey);
      
      if (cachedData) {
        setTransactions(cachedData);
        setIsLoading(false);
        return;
      }

      console.log('🔄 [Insider Transactions Component] Starting to load transactions for:', symbol);
      setIsLoading(true);
      setError(null);
      
      try {
        const apiResponse = await fetchInsiderTransactions(symbol);
        
        if (!apiResponse) {
          console.error('❌ [Insider Transactions Component] API response is null');
          setError('Failed to load insider transactions: No response');
          setIsLoading(false);
          return;
        }
        
        if (!apiResponse.success || !apiResponse.data) {
          console.error('❌ [Insider Transactions Component] API response not successful');
          setError('Failed to load insider transactions: API returned error');
          setIsLoading(false);
          return;
        }
        
        console.log('✅ [Insider Transactions Component] Transforming data');
        const transformed = transformApiTransactionsResponse(apiResponse.data);
        console.log('✅ [Insider Transactions Component] Transformed data:', transformed);
        
        setTransactions(transformed);
        widgetDataCache.set(cacheKey, transformed);
        setIsLoading(false);
      } catch (err) {
        console.error('❌ [Insider Transactions Component] Error loading transactions:', err);
        setError(err instanceof Error ? err.message : 'Failed to load insider transactions');
        setIsLoading(false);
      }
    };

    loadTransactions();
  }, [symbol]);

  // Listen for timezone changes
  useEffect(() => {
    const handleTimezoneChange = (event: CustomEvent) => {
      const { timezoneId } = event.detail;
      if (timezoneId) {
        setUserTimezone(timezoneId);
        // Force re-render with new timezone
        setTransactions(prevTransactions => [...prevTransactions]);
      }
    };

    window.addEventListener('timezoneChanged', handleTimezoneChange as EventListener);
    return () => {
      window.removeEventListener('timezoneChanged', handleTimezoneChange as EventListener);
    };
  }, []);

  const formatNumber = (num: number) => {
    return num.toLocaleString('en-US', { maximumFractionDigits: 0 });
  };

  const formatCurrency = (num: number) => {
    if (num >= 1000000) {
      return `$${(num / 1000000).toFixed(2)}M`;
    }
    return `$${num.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { timeZone: userTimezone, month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleSaveSettings = (newSettings: Record<string, unknown>) => {
    setLocalSettings(newSettings);
    setIsSettingsPanelOpen(false);
  };

  return (
    <div className="h-full flex flex-col bg-widget-body border border-border overflow-hidden">
      <WidgetHeader
        title="Insider Transactions"
        subtitle={symbol ? `[@${symbol.replace(/^[^:]+:/, '')}]` : ''}
        onSettings={() => setIsSettingsPanelOpen(true)}
        onRemove={onRemove}
        onFullscreen={onFullscreen}
        helpContent="Recent insider trading transactions showing buys and sells by company executives and insiders."
      />
      
      <WidgetSettingsSlideIn
        isOpen={isSettingsPanelOpen}
        onClose={() => setIsSettingsPanelOpen(false)}
        widgetType="insider-transactions"
        widgetPosition=""
        currentSettings={localSettings}
        onSave={handleSaveSettings}
      />
      
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-sm text-muted-foreground">Loading insider transactions...</div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-sm text-destructive">{error}</div>
          </div>
        ) : transactions.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-sm text-muted-foreground">No insider transactions available</div>
          </div>
        ) : (
        <div className="min-w-full">
          <table className="w-full">
            <thead className="sticky top-0 bg-widget-body z-10 border-b border-border">
              <tr>
                  <th className="text-left px-3 py-2.5 text-sm text-muted-foreground uppercase tracking-wide border-b border-border">
                  Date
                </th>
                  <th className="text-left px-3 py-2.5 text-sm text-muted-foreground uppercase tracking-wide border-b border-border">
                  Insider
                </th>
                  <th className="text-left px-3 py-2.5 text-sm text-muted-foreground uppercase tracking-wide border-b border-border">
                  Title
                </th>
                  <th className="text-center px-3 py-2.5 text-sm text-muted-foreground uppercase tracking-wide border-b border-border">
                  Type
                </th>
                  <th className="text-right px-3 py-2.5 text-sm text-muted-foreground uppercase tracking-wide border-b border-border">
                  Shares
                </th>
                  <th className="text-right px-3 py-2.5 text-sm text-muted-foreground uppercase tracking-wide border-b border-border">
                  Price
                </th>
                  <th className="text-right px-3 py-2.5 text-sm text-muted-foreground uppercase tracking-wide border-b border-border">
                  Value
                </th>
                  <th className="text-right px-3 py-2.5 text-sm text-muted-foreground uppercase tracking-wide border-b border-border">
                  Shares Owned
                </th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((transaction) => (
                <tr 
                  key={transaction.id}
                  className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                >
                  <td className="px-3 py-3 text-sm text-muted-foreground whitespace-nowrap">
                    {formatDate(transaction.date)}
                  </td>
                  <td className="px-3 py-3 text-sm whitespace-nowrap">
                    {transaction.insider}
                  </td>
                  <td className="px-3 py-3 text-sm text-muted-foreground whitespace-nowrap">
                    {transaction.title}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-sm ${
                      transaction.type === 'Buy' 
                        ? 'bg-green-500/10 text-green-500' 
                        : 'bg-red-500/10 text-red-500'
                    }`}>
                      {transaction.type === 'Buy' ? (
                        <TrendingUp className="w-3.5 h-3.5" />
                      ) : (
                        <TrendingDown className="w-3.5 h-3.5" />
                      )}
                      {transaction.type}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right text-sm tabular-nums">
                    {formatNumber(transaction.shares)}
                  </td>
                  <td className="px-3 py-3 text-right text-sm tabular-nums">
                    ${transaction.price.toFixed(2)}
                  </td>
                  <td className="px-3 py-3 text-right">
                    <span className={`inline-block px-2 py-0.5 rounded text-sm tabular-nums ${
                      transaction.type === 'Buy' 
                        ? 'bg-green-500/10 text-green-500' 
                        : 'bg-red-500/10 text-red-500'
                    }`}>
                      {formatCurrency(transaction.value)}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right text-sm text-muted-foreground tabular-nums">
                    {formatNumber(transaction.sharesOwned)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
      </div>

      {/* Summary Footer */}
      <div className="border-t border-border bg-muted/30 px-4 py-3 flex items-center justify-between text-base">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Total Buys:</span>
            <span className="inline-block px-2 py-0.5 rounded bg-green-500/10 text-green-500">
              {transactions.filter(t => t.type === 'Buy').length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Total Sells:</span>
            <span className="inline-block px-2 py-0.5 rounded bg-red-500/10 text-red-500">
              {transactions.filter(t => t.type === 'Sell').length}
            </span>
          </div>
        </div>
        <div className="text-muted-foreground">
          Showing {transactions.length} transactions
        </div>
      </div>
    </div>
  );
}

export default InsiderTransactions;

