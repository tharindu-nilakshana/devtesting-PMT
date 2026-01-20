"use client";

import { WidgetHeader } from "@/components/bloomberg-ui/WidgetHeader";
import { useState, useEffect } from "react";
import { ChevronDown, ChevronRight, TrendingUp, TrendingDown } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  fetchAvailableDateRanges,
  fetchSmartBiasTrackerDataByDateRange,
  formatWeekDateRange,
  getWeekDateRange,
  transformApiResponseToSmartBiasData,
  fetchSmartBiasSummaryByDateRange,
  parseSummaryContent,
  type DateRange,
  type SmartBiasData,
  type SummaryData,
  type ParsedSummary,
} from "./api";
import { widgetDataCache } from '@/lib/widgetDataCache';

interface SmartBiasProps {
  onSettings?: () => void;
  onRemove?: () => void;
  onFullscreen?: () => void;
  settings?: Record<string, unknown>;
  onSaveSettings?: (settings: Record<string, any>) => void;
}

type BiasValue = 
  | "Very Bullish"
  | "Bullish" 
  | "Neutral"
  | "Bearish"
  | "Very Bearish"
  | "Weak Bullish"
  | "Weak Bearish"
  | "Uptrend"
  | "Downtrend"
  | "Range";

interface CurrencyBias {
  [key: string]: BiasValue;
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
  SEK: "🇸🇪",
  NOK: "🇳🇴",
  DKK: "🇩🇰",
  SGD: "🇸🇬",
  HKD: "🇭🇰",
  CNY: "🇨🇳",
  MXN: "🇲🇽",
};

const allCurrencies = ["USD", "EUR", "GBP", "CAD", "AUD", "NZD", "JPY", "CHF", "SEK", "NOK", "DKK", "SGD", "HKD", "CNY", "MXN"];

// Empty initial state objects - will be populated by API data
const defaultFundamentalData: Record<string, CurrencyBias> = {};
const defaultBankResearch: Record<string, CurrencyBias> = {};
const defaultMonetaryPolicy: CurrencyBias = {};
const defaultTrend: CurrencyBias = {};
const defaultSeasonality: CurrencyBias = {};
const defaultOverall: CurrencyBias = {};


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
    case "Uptrend":
      return "bg-[#059669] text-white";
    case "Downtrend":
      return "bg-[#dc2626] text-white";
    case "Range":
      return "bg-[#6b7280] text-white";
    default:
      return "bg-muted text-foreground";
  }
};

const getImpactColor = (impact: "high" | "medium" | "low" | undefined): string => {
  switch (impact) {
    case "high":
      return "bg-destructive/20 text-destructive border-destructive/30";
    case "medium":
      return "bg-warning/20 text-warning border-warning/30";
    case "low":
      return "bg-muted/50 text-muted-foreground border-border";
    default:
      return "bg-muted/50 text-muted-foreground border-border";
  }
};

export function SmartBias({ onSettings, onRemove, onFullscreen, settings, onSaveSettings }: SmartBiasProps) {
  // Initialize from settings or defaults
  const initialView = (settings?.view as string) || "scanner";
  const initialWeek = (settings?.week as string) || "";
  
  const [activeTab, setActiveTab] = useState<string>(initialView);
  const [selectedWeek, setSelectedWeek] = useState<string>(initialWeek);
  const [fundamentalExpanded, setFundamentalExpanded] = useState(true);
  const [bankResearchExpanded, setBankResearchExpanded] = useState(true);
  const [activeCurrencies, setActiveCurrencies] = useState<string[]>(["USD", "EUR", "GBP", "CAD", "AUD", "NZD", "JPY", "CHF"]);
  const [fundamentalDetailsExpanded, setFundamentalDetailsExpanded] = useState(false);
  
  // API data states
  const [dateRanges, setDateRanges] = useState<DateRange[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [fundamentalData, setFundamentalData] = useState<Record<string, CurrencyBias>>(defaultFundamentalData);
  const [fundamentalScoring, setFundamentalScoring] = useState<Record<string, Record<string, string | number>>>({});
  const [bankResearch, setBankResearch] = useState<Record<string, CurrencyBias>>(defaultBankResearch);
  const [bankResearchScoring, setBankResearchScoring] = useState<Record<string, Record<string, string | number>>>({});
  const [monetaryPolicy, setMonetaryPolicy] = useState<CurrencyBias>(defaultMonetaryPolicy);
  const [trend, setTrend] = useState<CurrencyBias>(defaultTrend);
  const [seasonality, setSeasonality] = useState<CurrencyBias>(defaultSeasonality);
  const [overall, setOverall] = useState<CurrencyBias>(defaultOverall);
  const [fundamentalOverview, setFundamentalOverview] = useState<CurrencyBias>({});
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  const [parsedSummary, setParsedSummary] = useState<ParsedSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState<boolean>(false);
  
  // Fetch available date ranges on mount
  useEffect(() => {
    const loadDateRanges = async () => {
      try {
        const result = await fetchAvailableDateRanges();
        if (result.success && result.data && result.data.length > 0) {
          setDateRanges(result.data);
          // Use saved week from settings if available, otherwise use latest week
          if (!selectedWeek) {
            const latestWeek = formatWeekDateRange(result.data[0].weekFirstDate);
            setSelectedWeek(latestWeek);
          }
        } else {
          setError('Failed to load available date ranges');
          setLoading(false);
        }
      } catch (err) {
        console.error('Error loading date ranges:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setLoading(false);
      }
    };
    
    loadDateRanges();
  }, []);
  
  // Fetch data when week changes
  useEffect(() => {
    if (!selectedWeek || dateRanges.length === 0) return;
    
    const loadData = async () => {
      // Find the selected week's date range
      const selectedDateRange = dateRanges.find(range => 
        formatWeekDateRange(range.weekFirstDate) === selectedWeek
      );
      
      if (!selectedDateRange) {
        setError('Selected week not found');
        setLoading(false);
        return;
      }
      
      const { startDate, endDate } = getWeekDateRange(selectedDateRange.weekFirstDate);
      
      const cacheKey = widgetDataCache.generateKey('smart-bias-tracker', { startDate, endDate });
      const cachedData = widgetDataCache.get<ReturnType<typeof transformApiResponseToSmartBiasData>>(cacheKey);
      
      if (cachedData) {
        setFundamentalData(cachedData.fundamentalData);
        setFundamentalScoring(cachedData.fundamentalScoring);
        setBankResearch(cachedData.bankResearch);
        setBankResearchScoring(cachedData.bankResearchScoring);
        setMonetaryPolicy(cachedData.monetaryPolicy);
        setTrend(cachedData.trend);
        setSeasonality(cachedData.seasonality);
        setOverall(cachedData.overall);
        setFundamentalOverview(cachedData.fundamentalOverview);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      
      try {
        const rawData = await fetchSmartBiasTrackerDataByDateRange(startDate, endDate);
        
        if (rawData && rawData.length > 0) {
          // Transform API response to component format
          const transformedData = transformApiResponseToSmartBiasData(rawData);
          
          // Update state with transformed data
          setFundamentalData(transformedData.fundamentalData);
          setFundamentalScoring(transformedData.fundamentalScoring);
          setBankResearch(transformedData.bankResearch);
          setBankResearchScoring(transformedData.bankResearchScoring);
          setMonetaryPolicy(transformedData.monetaryPolicy);
          setTrend(transformedData.trend);
          setSeasonality(transformedData.seasonality);
          setOverall(transformedData.overall);
          setFundamentalOverview(transformedData.fundamentalOverview);
          
          widgetDataCache.set(cacheKey, transformedData);
          
          // Debug: Log scoring data
          console.log('🔍 [Smart Bias] Fundamental Scoring:', transformedData.fundamentalScoring);
          console.log('🔍 [Smart Bias] Bank Research Scoring:', transformedData.bankResearchScoring);
        } else {
          console.warn('⚠️ [Smart Bias Tracker] No data returned from API');
          setError('No data available for selected week');
        }
      } catch (err) {
        console.error('Error loading Smart Bias Tracker data:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [selectedWeek, dateRanges]);

  // Fetch summary data when currency or week changes (only for currency analysis view)
  useEffect(() => {
    if (activeTab === "scanner" || !selectedWeek || dateRanges.length === 0) {
      setSummaryData(null);
      return;
    }

    // activeTab is the currency when not "scanner"
    const currency = activeTab;
    
    const loadSummary = async () => {
      // Find the selected week's date range
      const selectedDateRange = dateRanges.find(range => 
        formatWeekDateRange(range.weekFirstDate) === selectedWeek
      );
      
      if (!selectedDateRange) {
        setSummaryData(null);
        setLoadingSummary(false);
        return;
      }
      
      const { startDate, endDate } = getWeekDateRange(selectedDateRange.weekFirstDate);
      
      const cacheKey = widgetDataCache.generateKey('smart-bias-summary', { currency, startDate, endDate });
      const cachedSummary = widgetDataCache.get<SummaryData>(cacheKey);
      
      if (cachedSummary) {
        setSummaryData(cachedSummary);
        if (cachedSummary && cachedSummary.Overview) {
          const parsed = parseSummaryContent(cachedSummary.Overview);
          setParsedSummary(parsed);
        } else {
          setParsedSummary(null);
        }
        setLoadingSummary(false);
        return;
      }

      setLoadingSummary(true);
      
      try {
        console.log('📊 [Smart Bias Summary] Fetching summary for:', { currency, startDate, endDate });
        const summary = await fetchSmartBiasSummaryByDateRange(currency, startDate, endDate);
        console.log('📊 [Smart Bias Summary] Received summary:', summary ? 'Summary found' : 'No summary');
        setSummaryData(summary);
        
        if (summary) {
          widgetDataCache.set(cacheKey, summary);
        }
        
        // Parse the summary to extract Key Risk Events
        if (summary && summary.Overview) {
          const parsed = parseSummaryContent(summary.Overview);
          setParsedSummary(parsed);
        } else {
          setParsedSummary(null);
        }
      } catch (err) {
        console.error('Error loading summary:', err);
        setSummaryData(null);
      } finally {
        setLoadingSummary(false);
      }
    };
    
    loadSummary();
  }, [activeTab, selectedWeek, dateRanges]);

  // Helper function to determine if bias is bullish or bearish
  const getBiasDirection = (bias: BiasValue): "bullish" | "bearish" | "neutral" => {
    if (bias.includes("Bullish") || bias === "Uptrend") return "bullish";
    if (bias.includes("Bearish") || bias === "Downtrend") return "bearish";
    return "neutral";
  };

  // Helper function to get bias summary for a currency from API data
  const getBiasSummaryForCurrency = (currency: string) => {
    // Use Fundemental_Overview from API
    const fundamental = fundamentalOverview[currency] || "Neutral";
    
    // Technical = Trend
    const technical = trend[currency] || "Neutral";
    
    // Sentiment = Overall sentiment
    const sentiment = overall[currency] || "Neutral";
    
    // Overall
    const overallBias = overall[currency] || "Neutral";
    
    return {
      fundamental: fundamental as BiasValue,
      technical: technical as BiasValue,
      sentiment: sentiment as BiasValue,
      overall: overallBias as BiasValue,
    };
  };

  // Render Currency Analysis View
  const renderCurrencyAnalysis = (currency: string) => {
    // Get bias summary from API data
    const biasSummary = getBiasSummaryForCurrency(currency);

    return (
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Bias Summary (30%) */}
        <div className="w-[30%] border-r border-border bg-widget-header overflow-auto custom-scrollbar">
          <div className="p-4">
            <h3 className="text-sm mb-3">Bias Summary</h3>
            
            <div className="space-y-2">
              {/* Fundamental Section - Collapsible */}
              <div className="border border-border bg-widget-body">
                <button
                  onClick={() => setFundamentalDetailsExpanded(!fundamentalDetailsExpanded)}
                  className="w-full flex items-center justify-between p-2 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {fundamentalDetailsExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                    )}
                    <span className="text-xs text-muted-foreground">Fundamental</span>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium ${getBiasColor(biasSummary.fundamental)}`}>
                    {biasSummary.fundamental}
                  </span>
                </button>
                
                {fundamentalDetailsExpanded && (
                  <div className="px-3 pb-2 space-y-1.5 border-t border-border">
                    {Object.entries(fundamentalData).map(([indicator, biases]) => {
                      const sentiment = biases[currency] || "Neutral";
                      const scoring = fundamentalScoring[indicator]?.[currency];
                      return (
                        <div key={indicator} className="flex items-center justify-between py-1.5">
                          <span className="text-xs text-muted-foreground">{indicator}</span>
                          <div className="flex items-center gap-2">
                            <span className={`px-1.5 py-0.5 text-xs font-medium ${getBiasColor(sentiment)}`}>
                              {sentiment}
                            </span>
                            {scoring !== undefined && (
                              <span className="text-xs text-muted-foreground">
                                ({typeof scoring === 'number' ? scoring.toFixed(2) : scoring})
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              
              <div className="flex items-center justify-between p-2 bg-widget-body border border-border">
                <span className="text-xs text-muted-foreground">Technical</span>
                <span className={`px-2 py-1 text-xs font-medium ${getBiasColor(biasSummary.technical)}`}>
                  {biasSummary.technical}
                </span>
              </div>
              
              <div className="flex items-center justify-between p-2 bg-widget-body border border-border">
                <span className="text-xs text-muted-foreground">Sentiment</span>
                <span className={`px-2 py-1 text-xs font-medium ${getBiasColor(biasSummary.sentiment)}`}>
                  {biasSummary.sentiment}
                </span>
              </div>

              <div className="flex items-center justify-between p-2 bg-widget-body border border-border">
                <span className="text-xs text-muted-foreground">Monetary Policy</span>
                <span className={`px-2 py-1 text-xs font-medium ${getBiasColor(monetaryPolicy[currency] || "Neutral")}`}>
                  {monetaryPolicy[currency] || "Neutral"}
                </span>
              </div>

              <div className="flex items-center justify-between p-2 bg-widget-body border border-border">
                <span className="text-xs text-muted-foreground">Trend</span>
                <span className={`px-2 py-1 text-xs font-medium ${getBiasColor(trend[currency] || "Neutral")}`}>
                  {trend[currency] || "Neutral"}
                </span>
              </div>

              <div className="flex items-center justify-between p-2 bg-widget-body border border-border">
                <span className="text-xs text-muted-foreground">Seasonality</span>
                <span className={`px-2 py-1 text-xs font-medium ${getBiasColor(seasonality[currency] || "Neutral")}`}>
                  {seasonality[currency] || "Neutral"}
                </span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-primary/10 border-2 border-primary/30 mt-4">
                <span className="text-xs">Overall</span>
                <span className={`px-3 py-1.5 text-xs font-semibold ${getBiasColor(biasSummary.overall)}`}>
                  {biasSummary.overall}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Summary Content */}
        <div className="flex-1 overflow-auto custom-scrollbar">
          {loadingSummary ? (
            <div className="p-4 flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Loading summary...</p>
              </div>
            </div>
          ) : parsedSummary && parsedSummary.overview ? (
            <>
              <style dangerouslySetInnerHTML={{__html: `
                .summary-content strong[style*="rgb(226, 139, 65)"],
                .summary-content strong[style*="rgb(226,139,65)"] {
                  font-size: 1.125rem !important;
                  font-weight: 600 !important;
                  display: block;
                  margin-bottom: 0.75rem;
                  margin-top: 1rem;
                }
                .summary-content p {
                  margin-bottom: 1rem !important;
                  margin-top: 0 !important;
                }
                .summary-content p:first-child {
                  margin-top: 0 !important;
                }
                .summary-content p:last-child {
                  margin-bottom: 0 !important;
                }
              `}} />
              <div className="p-4 space-y-6">
                {/* Main Overview Content */}
                <div className="prose prose-sm max-w-none prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-ul:text-foreground prose-li:text-foreground">
                  <div 
                    className="summary-content text-xs leading-relaxed text-foreground/90"
                    dangerouslySetInnerHTML={{ 
                      __html: parsedSummary.overview
                    }} 
                    style={{
                      lineHeight: '1.6',
                    }}
                  />
                </div>

              {/* Key Risk Events Section at Bottom */}
              {parsedSummary.keyEvents && parsedSummary.keyEvents.length > 0 && (
            <div>
              <h3 className="text-sm mb-3 pb-2 border-b border-border">Key Risk Events for the Week Ahead</h3>
              <div className="space-y-2">
                    {parsedSummary.keyEvents.map((eventItem, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 p-3 bg-muted/20 border border-border hover:bg-muted/30 transition-colors"
                  >
                    <div className="w-20 flex-shrink-0">
                          <span className="text-xs text-muted-foreground">{eventItem.day}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                          <p className="text-xs text-foreground/90">{eventItem.event}</p>
                    </div>
                        {eventItem.impact && (
                    <div className="flex-shrink-0">
                            <span className={`px-4 py-1.5 text-sm font-medium border ${getImpactColor(eventItem.impact)}`}>
                              {eventItem.impact.toUpperCase()}
                      </span>
                    </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
          ) : (
            <div className="p-4 flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  Summary not available for this currency and week
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Bias summary data is loaded from API for {currency}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render Scanner Table View
  const renderScannerTable = () => {
    return (
      <div className="flex-1 overflow-auto custom-scrollbar">
        <table className="w-full text-sm border-collapse">
          <thead className="sticky top-0 bg-widget-header z-10">
            <tr>
              <th className="text-left px-3 py-2 border-b border-r border-border text-sm text-muted-foreground min-w-[180px]">
                Indicators
              </th>
              {activeCurrencies.map((currency) => (
                <th 
                  key={currency} 
                  className="text-center px-2 py-2 border-b border-r border-border text-sm text-muted-foreground whitespace-nowrap"
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span className="flag-container">
                      <span className="flag-emoji">{currencyFlags[currency]}</span>
                    </span>
                    <span>{currency}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Fundamental Data Section */}
            <tr className="bg-widget-header">
              <td 
                className="px-3 py-2 border-b border-r border-border cursor-pointer hover:bg-muted/30 transition-colors text-sm"
                onClick={() => setFundamentalExpanded(!fundamentalExpanded)}
              >
                <div className="flex items-center gap-2">
                  {fundamentalExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5" />
                  )}
                  <span className="font-medium">Fundamental Data</span>
                </div>
              </td>
              {activeCurrencies.map((currency) => (
                <td key={currency} className="border-b border-r border-border"></td>
              ))}
            </tr>

            {fundamentalExpanded && Object.entries(fundamentalData).map(([indicator, biases]) => (
              <tr key={indicator} className="hover:bg-muted/20 transition-colors">
                <td className="px-3 py-2 border-b border-r border-border pl-8 text-sm">
                  {indicator}
                </td>
                {activeCurrencies.map((currency) => {
                  const sentiment = biases[currency] || "Neutral";
                  const scoring = fundamentalScoring[indicator]?.[currency];
                  return (
                    <td key={currency} className={`text-center px-0 py-0 border-b border-r border-border ${getBiasColor(sentiment)}`}>
                      <div className="px-2 py-2.5 text-sm font-medium">
                        <div>{sentiment}</div>
                        {scoring !== undefined && (
                          <div className="text-xs opacity-75 mt-0.5">
                            {typeof scoring === 'number' ? scoring.toFixed(2) : scoring}
                          </div>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}

            {/* Bank Research Section */}
            <tr className="bg-widget-header">
              <td 
                className="px-3 py-2 border-b border-r border-border cursor-pointer hover:bg-muted/30 transition-colors text-sm"
                onClick={() => setBankResearchExpanded(!bankResearchExpanded)}
              >
                <div className="flex items-center gap-2">
                  {bankResearchExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5" />
                  )}
                  <span className="font-medium">Bank Research</span>
                </div>
              </td>
              {activeCurrencies.map((currency) => (
                <td key={currency} className="border-b border-r border-border"></td>
              ))}
            </tr>

            {bankResearchExpanded && Object.entries(bankResearch).map(([indicator, biases]) => (
              <tr key={indicator} className="hover:bg-muted/20 transition-colors">
                <td className="px-3 py-2 border-b border-r border-border pl-8 text-sm">
                  {indicator}
                </td>
                {activeCurrencies.map((currency) => {
                  const sentiment = biases[currency] || "Neutral";
                  const scoring = bankResearchScoring[indicator]?.[currency];
                  return (
                    <td key={currency} className={`text-center px-0 py-0 border-b border-r border-border ${getBiasColor(sentiment)}`}>
                      <div className="px-2 py-2.5 text-sm font-medium">
                        <div>{sentiment}</div>
                        {scoring !== undefined && (
                          <div className="text-xs opacity-75 mt-0.5">
                            {typeof scoring === 'number' ? scoring.toFixed(2) : scoring}
                          </div>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}

            {/* Monetary Policy */}
            <tr className="hover:bg-muted/20 transition-colors">
              <td className="px-3 py-2 border-b border-r border-border text-sm">
                <span className="font-medium">Monetary Policy</span>
              </td>
              {activeCurrencies.map((currency) => (
                <td key={currency} className={`text-center px-0 py-0 border-b border-r border-border ${getBiasColor(monetaryPolicy[currency] || "Neutral")}`}>
                  <div className="px-2 py-2.5 text-sm font-medium">
                    {monetaryPolicy[currency] || "Neutral"}
                  </div>
                </td>
              ))}
            </tr>

            {/* Trend */}
            <tr className="hover:bg-muted/20 transition-colors">
              <td className="px-3 py-2 border-b border-r border-border text-sm">
                <span className="font-medium">Trend</span>
              </td>
              {activeCurrencies.map((currency) => (
                <td key={currency} className={`text-center px-0 py-0 border-b border-r border-border ${getBiasColor(trend[currency] || "Neutral")}`}>
                  <div className="px-2 py-2.5 text-sm font-medium">
                    {trend[currency] || "Neutral"}
                  </div>
                </td>
              ))}
            </tr>

            {/* Seasonality */}
            <tr className="hover:bg-muted/20 transition-colors">
              <td className="px-3 py-2 border-b border-r border-border text-sm">
                <span className="font-medium">Seasonality</span>
              </td>
              {activeCurrencies.map((currency) => (
                <td key={currency} className={`text-center px-0 py-0 border-b border-r border-border ${getBiasColor(seasonality[currency] || "Neutral")}`}>
                  <div className="px-2 py-2.5 text-sm font-medium">
                    {seasonality[currency] || "Neutral"}
                  </div>
                </td>
              ))}
            </tr>

            {/* Overall - Highlighted */}
            <tr className="bg-primary/10 hover:bg-primary/15 transition-colors border-t-2 border-primary/30">
              <td className="px-3 py-3 border-b-2 border-r border-primary/30">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-6 bg-primary"></div>
                  <span className="font-medium text-sm">Overall Conclusion</span>
                </div>
              </td>
              {activeCurrencies.map((currency) => {
                const biasValue = overall[currency] || "Neutral";
                const biasDirection = getBiasDirection(biasValue);
                return (
                  <td key={currency} className={`text-center px-0 py-0 border-b-2 border-r border-primary/30 ${getBiasColor(biasValue)}`}>
                    <div className="px-3 py-3 text-sm font-semibold shadow-sm flex items-center justify-center gap-1.5">
                      {biasDirection === "bullish" && <TrendingUp className="w-3.5 h-3.5" />}
                      {biasDirection === "bearish" && <TrendingDown className="w-3.5 h-3.5" />}
                      <span>{biasValue}</span>
                    </div>
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-widget-body border border-border rounded-none overflow-hidden">
      <WidgetHeader 
        title="Smart Bias Tracker"
        onRemove={onRemove}
        onFullscreen={onFullscreen}
      >
        {/* View and Week Selectors - COT Style */}
        <div className="flex gap-2 mr-2">
          {/* View Selector (Scanner/Currencies) */}
          <Select value={activeTab} onValueChange={(value) => {
            setActiveTab(value);
            if (onSaveSettings) {
              onSaveSettings({ view: value, week: selectedWeek });
            }
          }}>
            <SelectTrigger className="h-8 w-[100px] bg-widget-header border-border text-base">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border">
              <SelectItem
                value="scanner"
                className="text-base cursor-pointer"
              >
                <span>Scanner</span>
              </SelectItem>
              {activeCurrencies.map((currency) => (
                <SelectItem
                  key={currency}
                  value={currency}
                  className="text-base cursor-pointer"
                >
                  <span>{currency}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Week Selector */}
          <Select value={selectedWeek} onValueChange={(value) => {
            setSelectedWeek(value);
            if (onSaveSettings) {
              onSaveSettings({ view: activeTab, week: value });
            }
          }} disabled={loading || dateRanges.length === 0}>
            <SelectTrigger className="h-8 w-[180px] bg-widget-header border-border text-base">
              <SelectValue placeholder={loading ? "Loading..." : "Select week"} />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border">
              {dateRanges.slice(0, 17).map((range) => {
                const weekLabel = formatWeekDateRange(range.weekFirstDate);
                return (
                <SelectItem
                    key={range.weekFirstDate}
                    value={weekLabel}
                    className="text-base cursor-pointer"
                >
                  <span>{weekLabel}</span>
                </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      </WidgetHeader>

      {/* Loading State */}
      {loading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-sm text-muted-foreground">Loading Smart Bias Tracker data...</div>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-sm text-destructive">Error: {error}</div>
        </div>
      )}

      {/* Content Area */}
      {!loading && !error && (
        <>
      {activeTab === "scanner" ? renderScannerTable() : renderCurrencyAnalysis(activeTab)}
        </>
      )}
    </div>
  );
}

export default SmartBias;

