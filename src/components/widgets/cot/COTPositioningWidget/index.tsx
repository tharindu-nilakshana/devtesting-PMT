/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { getCOTPositioningDataForClient } from './api';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { WidgetHeader } from '@/components/bloomberg-ui/WidgetHeader';
import { widgetDataCache } from '@/lib/widgetDataCache';
import { useTemplates } from '@/hooks/useTemplates';

interface COTPositioningData {
  name: string;
  value: number;
  color?: string;
}

interface COTPositioningWidgetProps {
  wgid: string;
  wght?: number;
  additionalSettings?: string;
  templateName?: string;
  initialData?: COTPositioningData[];
  currency?: string;
  owner?: string;
  onRemove?: () => void; // Close button functionality
  onSettings?: () => void; // Settings button functionality
  onFullscreen?: () => void; // Fullscreen functionality
  onSaveSettings?: (settings: Record<string, any>) => void; // Save settings to database
  settings?: Record<string, any>; // Widget settings from database
  isSymbolLocked?: boolean; // Disable symbol selection in Details templates
}

const INSTRUMENTS = ["CAD", "EUR", "GBP", "JPY", "AUD", "CHF", "USD", "NZD"];
const REPORTERS = [
  { value: "Dealer", label: "Dealer Intermediary" },
  { value: "AssetManager", label: "Asset Manager / Institutional" },
  { value: "Leveraged", label: "Leveraged Funds" }
];

// Colors for the chart - matching Bloomberg style
const COLORS = {
  short: "#ff4d6d", // Pink/Red
  long: "#06d6a0", // Teal/Cyan
};

export default function COTPositioningWidget({
  wgid,
  additionalSettings = '',
  initialData,
  currency = 'EUR',
  owner = 'Dealer',
  onRemove,
  onSettings,
  onFullscreen,
  onSaveSettings,
  settings,
  isSymbolLocked = false
}: COTPositioningWidgetProps) {
  // Get the templates hook for API calls
  const { activeTemplateId, updateWidgetFields } = useTemplates();
  
  // Parse additionalSettings to get initial values - support both JSON and pipe-separated formats
  const getInitialValues = () => {
    
    // First check settings prop (from parsed JSON in BloombergDashboard)
    if (settings?.symbol || settings?.owner) {
      return {
        currency: (settings.symbol as string)?.toUpperCase() || currency,
        owner: (settings.owner as string) || owner
      };
    }
    
    // Then try to parse additionalSettings
    if (additionalSettings) {
      // Try JSON format first
      try {
        const parsed = JSON.parse(additionalSettings);
        if (parsed && typeof parsed === 'object') {
          return {
            currency: (parsed.symbol as string)?.toUpperCase() || currency,
            owner: (parsed.owner as string) || owner
          };
        }
      } catch {
        // Fall back to pipe-separated format
        const [curr, own] = additionalSettings.split('|');
        // Only use the parsed currency if it's a valid COT currency (in INSTRUMENTS list)
        const validCurrency = curr && INSTRUMENTS.includes(curr.toUpperCase()) ? curr.toUpperCase() : currency;
        const validOwner = own || owner;
        return {
          currency: validCurrency,
          owner: validOwner
        };
      }
    }
    return { currency, owner };
  };
  
  const initialValues = getInitialValues();
  
  const [data, setData] = useState<COTPositioningData[]>(initialData || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCurrency, setSelectedCurrency] = useState(initialValues.currency);
  const [selectedOwner, setSelectedOwner] = useState(initialValues.owner);

  // Track if we have pending settings to save (for newly created widgets without customDashboardWidgetID)
  const [pendingSave, setPendingSave] = useState<{ symbol: string; owner: string } | null>(null);

  // When customDashboardWidgetID becomes available, save any pending settings
  useEffect(() => {
    if (pendingSave && settings?.customDashboardWidgetID) {
      saveSettingsToDatabase(pendingSave.symbol, pendingSave.owner);
      setPendingSave(null);
    }
  }, [settings?.customDashboardWidgetID, pendingSave]);

  // Save settings to database
  const saveSettingsToDatabase = async (symbolValue: string, ownerValue: string) => {
    // Try to get customDashboardWidgetID from settings (when inside TabbedWidget or other containers)
    // or use wgid if it's a direct numeric widget ID
    let widgetIdForApi: string | null = null;
    
    if (settings?.customDashboardWidgetID) {
      widgetIdForApi = String(settings.customDashboardWidgetID);
    } else if (wgid) {
      // Check if wgid contains hyphens (composite key like "123-tab-1-0")
      // If it does, it's NOT a direct widget ID and we should skip the API call
      if (wgid.includes('-')) {
        // Skip - composite key
      } else {
        // It's a simple numeric string, safe to use
        const numericWgid = parseInt(wgid, 10);
        if (!isNaN(numericWgid)) {
          widgetIdForApi = wgid;
        }
      }
    }
    
    if (!widgetIdForApi || !activeTemplateId) {
      // If inside a TabbedWidget and no customDashboardWidgetID, widget is newly added and not yet saved
      if (wgid && wgid.includes('-') && !settings?.customDashboardWidgetID) {
        // Store settings to save once customDashboardWidgetID becomes available
        setPendingSave({ symbol: symbolValue, owner: ownerValue });
      }
      return;
    }
    
    try {
      // Create JSON format additionalSettings
      const additionalSettingsObj = {
        symbol: symbolValue,
        owner: ownerValue
      };
      
      const updateFields = {
        additionalSettings: JSON.stringify(additionalSettingsObj),
      };
      
      await updateWidgetFields(widgetIdForApi, activeTemplateId, updateFields);
    } catch (error) {
      console.error('❌ [COT Positioning] Error saving settings to database:', error);
    }
  };

  // Update state if settings prop changes after mount (e.g., when TabbedWidget merges template data)
  useEffect(() => {
    // Check for symbol in settings (from parsed additionalSettings JSON)
    if (settings?.symbol) {
      const symbolValue = (settings.symbol as string).toUpperCase();
      if (INSTRUMENTS.includes(symbolValue) && symbolValue !== selectedCurrency) {
        setSelectedCurrency(symbolValue);
      }
    }
    // Check for owner in settings
    if (settings?.owner) {
      const ownerValue = settings.owner as string;
      if (ownerValue !== selectedOwner) {
        setSelectedOwner(ownerValue);
      }
    }
  }, [settings?.symbol, settings?.owner]);

  // Update state if additionalSettings prop changes after mount (handles both JSON and pipe formats)
  useEffect(() => {
    if (additionalSettings) {
      // Try JSON format first
      try {
        const parsed = JSON.parse(additionalSettings);
        if (parsed && typeof parsed === 'object') {
          if (parsed.symbol) {
            const symbolValue = (parsed.symbol as string).toUpperCase();
            if (INSTRUMENTS.includes(symbolValue) && symbolValue !== selectedCurrency) {
              setSelectedCurrency(symbolValue);
            }
          }
          if (parsed.owner && parsed.owner !== selectedOwner) {
            setSelectedOwner(parsed.owner);
          }
          return; // Successfully parsed JSON, don't try pipe format
        }
      } catch {
        // Fall back to pipe-separated format
      }
      
      // Legacy pipe-separated format
      const [curr, own] = additionalSettings.split('|');
      // Only update currency if it's a valid COT currency (in INSTRUMENTS list)
      if (curr && INSTRUMENTS.includes(curr.toUpperCase()) && curr.toUpperCase() !== selectedCurrency) {
        setSelectedCurrency(curr.toUpperCase());
      }
      if (own && own !== selectedOwner) {
        setSelectedOwner(own);
      }
    }
  }, [additionalSettings]);

  // Fetch COT data
  const fetchCOTData = async (currencyToFetch: string, ownerToFetch: string) => {
    const cacheKey = widgetDataCache.generateKey('cot-positioning', { currency: currencyToFetch, owner: ownerToFetch });
    const cachedData = widgetDataCache.get<COTPositioningData[]>(cacheKey);
    
    if (cachedData) {
      setData(cachedData);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const result = await getCOTPositioningDataForClient(currencyToFetch, ownerToFetch);
      
      if (result && Array.isArray(result)) {
        // Transform data to use 'name' and add colors
        let coloredData = result.map(item => ({
          name: item.label || item.name || 'Unknown',
          value: typeof item.value === 'string' ? parseFloat(item.value) || 0 : (item.value || 0),
          color: (item.label || item.name || '').toLowerCase().includes('short') ? COLORS.short : COLORS.long
        }));
        
        // Ensure both short and long are always present, even if one is missing or zero
        const hasShort = coloredData.some(d => d.name.toLowerCase().includes('short'));
        const hasLong = coloredData.some(d => d.name.toLowerCase().includes('long'));
        
        if (!hasShort) {
          coloredData.push({ name: 'Short', value: 0, color: COLORS.short });
        }
        if (!hasLong) {
          coloredData.push({ name: 'Long', value: 0, color: COLORS.long });
        }
        
        // Ensure we have exactly one short and one long entry
        const shortEntry = coloredData.find(d => d.name.toLowerCase().includes('short'));
        const longEntry = coloredData.find(d => d.name.toLowerCase().includes('long'));
        
        coloredData = [
          { name: 'Short', value: shortEntry?.value || 0, color: COLORS.short },
          { name: 'Long', value: longEntry?.value || 0, color: COLORS.long }
        ];
        
        setData(coloredData);
        widgetDataCache.set(cacheKey, coloredData);
        setError(null);
      } else {
        setError('No data available');
        // Fallback to initial data if available
        if (initialData) {
          setData(initialData);
        }
      }
    } catch (err) {
      console.error('❌ [COT Positioning] Error fetching data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
      // Use initial data as fallback
      if (initialData) {
        setData(initialData);
      }
    } finally {
      setLoading(false);
    }
  };

  // Fetch data on mount and when currency/owner changes (client-side only)
  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;
    
    // Small delay to ensure auth cookies are available after page refresh
    const timeoutId = setTimeout(() => {
      fetchCOTData(selectedCurrency, selectedOwner);
    }, 100);
    
    return () => clearTimeout(timeoutId);
  }, [selectedCurrency, selectedOwner]);

  // Calculate statistics
  const shortData = data.find(d => d.name.toLowerCase().includes('short'));
  const longData = data.find(d => d.name.toLowerCase().includes('long'));
  
  const shortValue = shortData?.value || 0;
  const longValue = longData?.value || 0;
  const total = shortValue + longValue;
  const shortPercent = total > 0 ? ((shortValue / total) * 100).toFixed(1) : "0";
  const longPercent = total > 0 ? ((longValue / total) * 100).toFixed(1) : "0";

  const formatValue = (value: number): string => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toString();
  };

  const CustomLegend = () => {
    return (
      <div className="absolute top-3 left-3 z-10 flex items-center gap-4 px-3 py-2 rounded bg-widget-header/90 backdrop-blur-sm border border-border shadow-lg">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-sm"
            style={{ backgroundColor: COLORS.short }}
          ></div>
          <span className="text-xs text-foreground">Short</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-sm"
            style={{ backgroundColor: COLORS.long }}
          ></div>
          <span className="text-xs text-foreground">Long</span>
        </div>
      </div>
    );
  };

  const CustomLabel = ({ cx, cy, midAngle, outerRadius, percent, name, value }: any) => {
    const RADIAN = Math.PI / 180;
    // Position labels outside the chart
    const radius = outerRadius + 25;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    // Always show the full label with value for all segments
    // For very small segments, use slightly smaller text
    const isSmallSegment = percent < 0.01;
    
    return (
      <text
        x={x}
        y={y}
        fill="currentColor"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        className={isSmallSegment ? "text-xs fill-foreground opacity-80" : "text-sm fill-foreground"}
      >
        {`${name} ${formatValue(value)}`}
      </text>
    );
  };

  // Get reporter label from value
  const getReporterLabel = (value: string) => {
    const reporter = REPORTERS.find(r => r.value === value);
    return reporter?.label || value;
  };

  return (
    <div className="flex flex-col h-full w-full bg-widget-body border border-border rounded-none overflow-hidden">
      {/* Header - Bloomberg Style */}
      <WidgetHeader
        title="COT Positioning"
        onRemove={onRemove}
        onFullscreen={onFullscreen}
        helpContent="Shows the positioning breakdown of COT (Commitment of Traders) data for institutional traders. Displays the distribution between long and short positions as a pie chart. Select different currencies and reporter categories to analyze smart money positioning."
      >
        {/* Instrument and Reporter Selectors */}
        <div className="flex gap-2 mr-2">
          {/* Instrument Dropdown */}
          <Select 
            value={selectedCurrency} 
            onValueChange={(value) => {
              setSelectedCurrency(value);
              // Save settings - use onSaveSettings if provided (e.g., by TabbedWidget), otherwise use direct API
              const settingsToSave = { symbol: value, owner: selectedOwner };
              if (onSaveSettings) {
                onSaveSettings(settingsToSave);
              } else {
                saveSettingsToDatabase(value, selectedOwner);
              }
            }}
            disabled={isSymbolLocked}
          >
            <SelectTrigger className="h-7 w-[80px] bg-widget-header border-border text-base">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border">
              {INSTRUMENTS.map((instrument) => (
                <SelectItem
                  key={instrument}
                  value={instrument}
                  className="text-base cursor-pointer"
                >
                  {instrument}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Reporter Dropdown */}
          <Select value={selectedOwner} onValueChange={(value) => {
            setSelectedOwner(value);
            // Save settings - use onSaveSettings if provided (e.g., by TabbedWidget), otherwise use direct API
            const settingsToSave = { symbol: selectedCurrency, owner: value };
            if (onSaveSettings) {
              onSaveSettings(settingsToSave);
            } else {
              saveSettingsToDatabase(selectedCurrency, value);
            }
          }}>
            <SelectTrigger className="h-7 w-[240px] bg-widget-header border-border text-base">
              <SelectValue>
                {getReporterLabel(selectedOwner)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-popover border-border">
              {REPORTERS.map((reporter) => (
                <SelectItem
                  key={reporter.value}
                  value={reporter.value}
                  className="text-base cursor-pointer"
                >
                  {reporter.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </WidgetHeader>

      {/* Chart Content */}
      <div className="flex-1 p-6 flex flex-col items-center justify-center relative min-h-0">
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading COT data...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center gap-2">
            <p className="text-sm text-destructive">Error: {error}</p>
              <button
              onClick={fetchCOTData}
              className="text-xs text-primary hover:underline"
              >
              Retry
              </button>
            </div>
        ) : data.length === 0 ? (
          <div className="flex items-center justify-center">
            <p className="text-sm text-muted-foreground">No data available</p>
          </div>
        ) : (
          <>
            {/* Legend Overlay */}
            <CustomLegend />
            
            <div className="w-full h-full max-w-4xl max-h-[450px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 20, right: 100, bottom: 20, left: 100 }}>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius="60%"
                    outerRadius="85%"
                    paddingAngle={1}
                    minAngle={0.5}
                    dataKey="value"
                    nameKey="name"
                    label={CustomLabel}
                  >
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color || COLORS.long} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Summary Stats */}
            <div className="mt-6 grid grid-cols-3 gap-6 w-full max-w-lg">
              <div className="text-center">
                <div className="text-sm text-muted-foreground mb-1">Short Positions</div>
                <div className="text-lg font-semibold" style={{ color: COLORS.short }}>
                  {formatValue(shortValue)}
                </div>
                <div className="text-xs text-muted-foreground">{shortPercent}%</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-muted-foreground mb-1">Long Positions</div>
                <div className="text-lg font-semibold" style={{ color: COLORS.long }}>
                  {formatValue(longValue)}
                </div>
                <div className="text-xs text-muted-foreground">{longPercent}%</div>
            </div>
              <div className="text-center">
                <div className="text-sm text-muted-foreground mb-1">Net Position</div>
                <div
                  className="text-lg font-semibold"
                  style={{
                    color: shortValue > longValue ? COLORS.short : COLORS.long,
                  }}
                >
                  {shortValue > longValue ? "Bearish" : "Bullish"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatValue(Math.abs(shortValue - longValue))}
            </div>
          </div>
        </div>
          </>
      )}
      </div>
    </div>
  );
}
