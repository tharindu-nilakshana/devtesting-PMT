'use client';

import React, { useState, useEffect } from 'react';
import { WidgetHeader } from '@/components/bloomberg-ui/WidgetHeader';
import { WidgetSettingsSlideIn } from '@/components/bloomberg-ui/WidgetSettingsSlideIn';
import { getUserTimezoneSync } from '@/utils/systemVariablesClient';
import {
  fetchInstitutionalShareholders,
  transformApiShareholdersResponse,
  type Shareholder
} from './api';
import { widgetDataCache } from '@/lib/widgetDataCache';

type WidgetSettings = Record<string, unknown>;

interface InstitutionalShareholdersProps {
  onSettings?: () => void;
  onRemove?: () => void;
  onFullscreen?: () => void;
  settings?: WidgetSettings;
}

export function InstitutionalShareholders({ onSettings, onRemove, onFullscreen, settings = {} }: InstitutionalShareholdersProps) {
  const [isSettingsPanelOpen, setIsSettingsPanelOpen] = useState(false);
  const [localSettings, setLocalSettings] = useState(settings);
  const [shareholders, setShareholders] = useState<Shareholder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sync localSettings with external settings prop when it changes
  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  // Get symbol from localSettings (which updates when user saves from slide-in menu)
  const symbol = (localSettings.symbol as string) || 'NASDAQ:AAL';

  // Fetch institutional shareholders when symbol changes
  useEffect(() => {
    const loadShareholders = async () => {
      const cacheKey = widgetDataCache.generateKey('institutional-shareholders', { symbol });
      const cachedData = widgetDataCache.get<Shareholder[]>(cacheKey);
      
      if (cachedData) {
        setShareholders(cachedData);
        setIsLoading(false);
        return;
      }

      console.log('🔄 [Institutional Shareholders Component] Starting to load shareholders for:', symbol);
      setIsLoading(true);
      setError(null);
      
      try {
        const apiResponse = await fetchInstitutionalShareholders(symbol);
        
        if (!apiResponse) {
          console.error('❌ [Institutional Shareholders Component] API response is null');
          setError('Failed to load institutional shareholders: No response');
          setIsLoading(false);
          return;
        }
        
        if (!apiResponse.success || !apiResponse.data) {
          console.error('❌ [Institutional Shareholders Component] API response not successful');
          setError('Failed to load institutional shareholders: API returned error');
          setIsLoading(false);
          return;
        }
        
        console.log('✅ [Institutional Shareholders Component] Transforming data');
        const transformed = transformApiShareholdersResponse(apiResponse.data);
        console.log('✅ [Institutional Shareholders Component] Transformed data:', transformed);
        
        setShareholders(transformed);
        widgetDataCache.set(cacheKey, transformed);
        setIsLoading(false);
      } catch (err) {
        console.error('❌ [Institutional Shareholders Component] Error loading shareholders:', err);
        setError(err instanceof Error ? err.message : 'Failed to load institutional shareholders');
        setIsLoading(false);
      }
    };

    loadShareholders();
  }, [symbol]);

  const [userTimezone, setUserTimezone] = useState<string>(getUserTimezoneSync);

  // Listen for timezone changes
  useEffect(() => {
    const handleTimezoneChange = (event: CustomEvent) => {
      const { timezoneId } = event.detail;
      if (timezoneId) {
        setUserTimezone(timezoneId);
        // Force re-render with new timezone
        setShareholders(prevShareholders => [...prevShareholders]);
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
    if (num >= 1000000000) {
      return `$${(num / 1000000000).toFixed(2)}B`;
    }
    if (num >= 1000000) {
      return `$${(num / 1000000).toFixed(2)}M`;
    }
    return `$${num.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { timeZone: userTimezone, month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Calculate totals only when we have data
  const totalInstitutionalOwnership = shareholders.length > 0 
    ? shareholders.reduce((sum, sh) => sum + sh.percentOfShares, 0)
    : 0;
  const othersPercentage = Math.max(0, 100 - totalInstitutionalOwnership);

  // Pie chart calculations - only when we have data
  const chartData = shareholders.length > 0 ? [
    ...shareholders.slice(0, 5).map(sh => ({
      name: sh.name.split(' ')[0], // First word only for chart
      value: sh.percentOfShares,
      fullName: sh.name
    })),
    {
      name: 'Others',
      value: othersPercentage + shareholders.slice(5).reduce((sum, sh) => sum + sh.percentOfShares, 0),
      fullName: 'Other Institutions'
    }
  ] : [];

  const colors = ['#f97316', '#fb923c', '#fdba74', '#fed7aa', '#ffedd5', '#6b7280'];
  
  // Calculate pie chart paths - only when we have data
  const size = 160;
  const center = size / 2;
  const radius = size / 2 - 10;
  
  let currentAngle = -90; // Start from top
  const paths = chartData.length > 0 ? chartData.map((data, index) => {
    const angle = (data.value / 100) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    
    const x1 = center + radius * Math.cos((startAngle * Math.PI) / 180);
    const y1 = center + radius * Math.sin((startAngle * Math.PI) / 180);
    const x2 = center + radius * Math.cos((endAngle * Math.PI) / 180);
    const y2 = center + radius * Math.sin((endAngle * Math.PI) / 180);
    
    const largeArc = angle > 180 ? 1 : 0;
    
    const pathData = [
      `M ${center} ${center}`,
      `L ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
      'Z'
    ].join(' ');
    
    currentAngle = endAngle;
    
    return {
      path: pathData,
      color: colors[index % colors.length],
      ...data
    };
  }) : [];

  const handleSaveSettings = (newSettings: Record<string, unknown>) => {
    setLocalSettings(newSettings);
    setIsSettingsPanelOpen(false);
  };

  return (
    <div className="h-full flex flex-col bg-widget-body border border-border overflow-hidden">
      <WidgetHeader
        title="Institutional Shareholders"
        subtitle={symbol ? `[@${symbol.replace(/^[^:]+:/, '')}]` : ''}
        onSettings={() => setIsSettingsPanelOpen(true)}
        onRemove={onRemove}
        onFullscreen={onFullscreen}
        helpContent="Top institutional shareholders with ownership distribution pie chart and detailed holdings table."
      />
      
      <WidgetSettingsSlideIn
        isOpen={isSettingsPanelOpen}
        onClose={() => setIsSettingsPanelOpen(false)}
        widgetType="institutional-shareholders"
        widgetPosition=""
        currentSettings={localSettings}
        onSave={handleSaveSettings}
      />
      
      <div className="flex-1 overflow-auto p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-sm text-muted-foreground">Loading institutional shareholders...</div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-sm text-destructive">{error}</div>
          </div>
        ) : shareholders.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-sm text-muted-foreground">No institutional shareholders data available</div>
          </div>
        ) : (
        <div className="grid grid-cols-[300px,1fr] gap-6 h-full">
          {/* Left side - Pie Chart */}
          <div className="flex flex-col">
            <div className="text-sm text-muted-foreground mb-4 uppercase tracking-wide">Ownership Distribution</div>
            
            {/* Pie Chart */}
            <div className="flex items-center justify-center mb-4">
              <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                {paths.map((item, index) => (
                  <g key={index}>
                    <path
                      d={item.path}
                      fill={item.color}
                      stroke="#000"
                      strokeWidth="1"
                      className="transition-opacity hover:opacity-80 cursor-pointer"
                    />
                  </g>
                ))}
                {/* Center circle for donut effect */}
                <circle
                  cx={center}
                  cy={center}
                  r={radius * 0.5}
                  fill="#09090b"
                  stroke="#27272a"
                  strokeWidth="2"
                />
                {/* Center text */}
                <text
                  x={center}
                  y={center - 8}
                  textAnchor="middle"
                  className="text-sm fill-muted-foreground"
                >
                  Total
                </text>
                <text
                  x={center}
                  y={center + 8}
                  textAnchor="middle"
                  className="text-base fill-primary font-semibold"
                >
                  {totalInstitutionalOwnership.toFixed(1)}%
                </text>
              </svg>
            </div>

            {/* Legend */}
            <div className="space-y-2">
              {chartData.map((item, index) => (
                <div key={index} className="flex items-center justify-between gap-2 text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <div 
                      className="w-3 h-3 rounded-sm flex-shrink-0" 
                      style={{ backgroundColor: colors[index % colors.length] }}
                    ></div>
                    <span className="text-muted-foreground truncate" title={item.fullName}>
                      {item.name}
                    </span>
                  </div>
                  <span className="tabular-nums">{item.value.toFixed(2)}%</span>
                </div>
              ))}
            </div>

            {/* Summary Stats */}
            <div className="mt-4 pt-4 border-t border-border space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Total Institutions:</span>
                <span className="tabular-nums">{shareholders.length}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Institutional %:</span>
                <span className="tabular-nums">{totalInstitutionalOwnership.toFixed(2)}%</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Float:</span>
                <span className="tabular-nums">{othersPercentage.toFixed(2)}%</span>
              </div>
            </div>
          </div>

          {/* Right side - Table */}
          <div className="flex flex-col min-w-0">
            <div className="text-sm text-muted-foreground mb-4 uppercase tracking-wide">Top Institutional Holders</div>
            
            <div className="flex-1 overflow-auto">
              <table className="w-full">
                <thead className="sticky top-0 bg-widget-body z-10 border-b border-border">
                  <tr>
                    <th className="text-left px-3 py-2.5 text-sm text-muted-foreground uppercase tracking-wide border-b border-border">
                      Institution
                    </th>
                    <th className="text-right px-3 py-2.5 text-sm text-muted-foreground uppercase tracking-wide border-b border-border">
                      Shares
                    </th>
                    <th className="text-right px-3 py-2.5 text-sm text-muted-foreground uppercase tracking-wide border-b border-border">
                      Value
                    </th>
                    <th className="text-right px-3 py-2.5 text-sm text-muted-foreground uppercase tracking-wide border-b border-border">
                      % of Shares
                    </th>
                    <th className="text-right px-3 py-2.5 text-sm text-muted-foreground uppercase tracking-wide border-b border-border">
                      Change
                    </th>
                    <th className="text-right px-3 py-2.5 text-sm text-muted-foreground uppercase tracking-wide border-b border-border">
                      Date Reported
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {shareholders.map((shareholder) => (
                    <tr 
                      key={shareholder.id}
                      className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-3 py-3 text-base">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs text-primary flex-shrink-0">
                            {shareholder.id}
                          </div>
                          <span className="truncate">{shareholder.name}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right text-sm tabular-nums">
                        {formatNumber(shareholder.shares)}
                      </td>
                      <td className="px-3 py-3 text-right text-sm tabular-nums">
                        {formatCurrency(shareholder.value)}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <span className="inline-block px-2 py-0.5 rounded bg-primary/10 text-primary text-sm tabular-nums">
                          {shareholder.percentOfShares.toFixed(2)}%
                        </span>
                      </td>
                      <td className={`px-3 py-3 text-right transition-all duration-300 ${
                        shareholder.flash ? 'bg-primary/20 scale-105' : ''
                      }`}>
                        <span className={`inline-block px-2 py-0.5 rounded text-sm tabular-nums ${
                          shareholder.change > 0 
                            ? 'bg-green-500/10 text-green-500' 
                            : shareholder.change < 0
                            ? 'bg-red-500/10 text-red-500'
                            : 'bg-muted/30 text-muted-foreground'
                        }`}>
                          {shareholder.change > 0 ? '+' : ''}{shareholder.change.toFixed(2)}%
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right text-sm text-muted-foreground tabular-nums">
                        {formatDate(shareholder.dateReported)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}

export default InstitutionalShareholders;

