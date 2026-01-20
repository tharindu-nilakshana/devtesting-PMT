'use client';

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { WidgetHeader } from "@/components/bloomberg-ui/WidgetHeader";
import { Button } from "@/components/ui/button";
import { getAuthToken } from "@/utils/api";
import { widgetDataCache } from '@/lib/widgetDataCache';

type WidgetSettings = Record<string, unknown>;

interface OverviewListProps {
  onSettings?: () => void;
  onRemove?: () => void;
  onFullscreen?: () => void;
  settings?: WidgetSettings;
}

interface OverviewItem {
  id: string;
  symbol: string;
  ticker: string;
  flag: string;
  logoImageUrl: string | null;
  lastPrice: number | null;
  lastPriceImageUrl: string | null;
  change: number | null;
  changePercent: number | null;
  seasonalityImageUrl: string | null;
  patternImageUrl: string | null;
  dmxImageUrl: string | null;
  dmx: "very-bullish" | "bullish" | "neutral" | "bearish" | "very-bearish" | null;
  fundamentals: string | null;
  fundamentalsStyle: string | null; // Style from API
  bankResearch: string | null;
  bankResearchStyle: string | null; // Style from API
  smartBias: string | null;
  smartBiasStyle: string | null; // Style from API
  perf1m: number | null;
  perf3m: number | null;
  perf12m: number | null;
  trend: number[] | null;
  trendImages: { red: string | null; green: string | null } | null;
  marketStatus: string | null;
  marketStatusHtml: string | null; // Raw HTML for market status icon
  strength: number | null;
  strengthColor: string | null;
  socialSentiment: string | null;
  marketCapital: string | null;
  ebitda: string | null;
  news: string | null;
  newsHtml: string | null; // Raw HTML for news with clickable links
  symbolLink: string | null; // Link URL for symbol name
}

// API Response Interfaces
interface ApiTableCell {
  class: string;
  val: string; // HTML string
  style?: string; // Optional inline style
}

interface ApiOverviewListResponse {
  thead: string[];
  trdata: ApiTableCell[][];
}

// Helper function to extract text from HTML
const extractTextFromHtml = (html: string): string => {
  if (!html) return '';
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
};

// Helper function to extract image src from HTML
const extractImageSrc = (html: string): string | null => {
  if (!html) return null;
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match ? match[1] : null;
};

// Helper function to extract number from image filename (e.g., "last_price_1.png" -> 1)
const extractNumberFromImage = (html: string): number | null => {
  const imgSrc = extractImageSrc(html);
  if (!imgSrc) return null;
  const match = imgSrc.match(/_(\d+)\.(png|jpg|jpeg|gif)/i);
  return match ? parseInt(match[1], 10) : null;
};

// Helper function to get flag emoji from currency pair
const getFlagFromSymbol = (symbol: string): string => {
  const flags: Record<string, string> = {
    'AUD': '🇦🇺', 'CAD': '🇨🇦', 'CHF': '🇨🇭', 'EUR': '🇪🇺',
    'GBP': '🇬🇧', 'JPY': '🇯🇵', 'NZD': '🇳🇿', 'USD': '🇺🇸',
  };
  const parts = symbol.split('/');
  return flags[parts[0]] || '🌐';
};

// Helper function to determine DMX status from image number (optional - can be null if not determinable)
const getDMXFromImageNumber = (num: number | null): "very-bullish" | "bullish" | "neutral" | "bearish" | "very-bearish" | null => {
  if (num === null) return null;
  // Assuming: 1-2 = very-bullish, 3-4 = bullish, 5-6 = neutral, 7-8 = bearish, 9+ = very-bearish
  if (num <= 2) return "very-bullish";
  if (num <= 4) return "bullish";
  if (num <= 6) return "neutral";
  if (num <= 8) return "bearish";
  return "very-bearish";
};

// API function to fetch overview list
async function fetchOverviewList(module: string): Promise<ApiOverviewListResponse> {
  const token = getAuthToken();
  const response = await fetch('/api/pmt/GetOverviewList', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      module: module,
      DashboardCustomList: "Ticker,Last Price,Seasonality,Pattern,DXM,Fundamentals,Research,Bias,Social Sentiment,1 Mnt,3 Mnt,12 Mnt,Trend,Market,Strength,Market Capital,EBITDA,Latest News",
    }),
    cache: 'no-store',
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(text || `Request failed: ${response.status}`);
  }
  return (await response.json()) as ApiOverviewListResponse;
}

// Helper to extract numeric value from text (e.g., "1.2345" or "+2.5%" or "-1.2%")
function extractNumericValue(text: string | null): number | null {
  if (!text) return null;
  const cleaned = text.replace(/[^\d.-]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

// Transform API response to OverviewItem format
function transformApiDataToOverviewItems(apiData: ApiOverviewListResponse): OverviewItem[] {
  return apiData.trdata.map((row, index) => {
    // Helper function to find cells by class name (handles multi-class names like "tdChange1Month MonthlyChangePos")
    const findCellByClass = (classNames: string[]): ApiTableCell | undefined => {
      return row.find(cell => {
        const cellClass = cell.class || '';
        return classNames.some(name => cellClass === name || cellClass.includes(name));
      });
    };
    
    // Find cells by class name - try various possible class names
    const logoCell = findCellByClass(['tdLogo', 'Logo']);
    const nameCell = findCellByClass(['tdNameToDisplay', 'NameToDisplay', 'Symbol']);
    const tickerCell = findCellByClass(['tdTicker', 'Ticker']);
    const lastPriceCell = findCellByClass(['tdLastPrice', 'LastPrice', 'Last Price']);
    const changeCell = findCellByClass(['tdChange', 'Change']);
    const changePercentCell = findCellByClass(['tdChangePercent', 'ChangePercent', 'Change %']);
    const seasonalityCell = findCellByClass(['tdSeasonalPrediction', 'SeasonalPrediction', 'Seasonality']);
    const patternCell = findCellByClass(['tdPattern', 'Pattern']);
    const dmxCell = findCellByClass(['tdDXM', 'DXM']);
    // New API format: tdFundamentals, tdBankResearch, tdSmartBias (with bullish/bearish classes)
    const fundamentalsCell = findCellByClass(['tdFundamentals', 'Fundamentals', 'Fund.']);
    const researchCell = findCellByClass(['tdBankResearch', 'tdResearch', 'Research', 'BankResearch']);
    const biasCell = findCellByClass(['tdSmartBias', 'tdBias', 'Bias', 'SmartBias']);
    // New API format: tdChange1Month, tdChange3Month, tdChange12Month (with MonthlyChangePos/Neg classes)
    // The class can be "tdChange1Month MonthlyChangePos" so we need to check if it includes the base class
    const perf1mCell = findCellByClass(['tdChange1Month', 'td1M', '1M', '1M %']);
    const perf3mCell = findCellByClass(['tdChange3Month', 'td3M', '3M', '3M %']);
    const perf12mCell = findCellByClass(['tdChange12Month', 'td12M', '12M', '12M %']);
    const trendCell = findCellByClass(['tdTrend', 'Trend']);
    // New API format: tdMarket (not tdStatus)
    const statusCell = findCellByClass(['tdMarket', 'tdStatus', 'Status', 'MarketStatus']);
    const strengthCell = findCellByClass(['tdStrength', 'Strength']);
    // New API format: tdNewsHeading (not tdNews)
    const newsCell = findCellByClass(['tdNewsHeading', 'tdNews', 'News', 'LatestNews']);
    // New fields
    const socialSentimentCell = findCellByClass(['tdSocialSentiment', 'SocialSentiment', 'Social Sentiment']);
    const marketCapitalCell = findCellByClass(['tdMarketCapital', 'MarketCapital', 'Market Capital']);
    const ebitdaCell = findCellByClass(['tdEBITDA', 'EBITDA']);

    // Extract data from cells
    const symbolHtml = nameCell?.val || '';
    const ticker = extractTextFromHtml(symbolHtml) || ''; // e.g., "AUDCAD"
    const symbol = extractTextFromHtml(tickerCell?.val || '') || ticker; // e.g., "AUD/CAD"
    
    // Extract link from symbol HTML if present
    const symbolLinkMatch = symbolHtml.match(/href=["']([^"']+)["']/);
    const symbolLink = symbolLinkMatch ? symbolLinkMatch[1] : null;
    
    // Extract image URLs
    const logoImageUrl = extractImageSrc(logoCell?.val || '');
    const lastPriceImageUrl = extractImageSrc(lastPriceCell?.val || '');
    const seasonalityImageUrl = extractImageSrc(seasonalityCell?.val || '');
    const patternImageUrl = extractImageSrc(patternCell?.val || '');
    const dmxImageUrl = extractImageSrc(dmxCell?.val || '');
    
    // Extract numeric/text values
    // Last price can be either an image or text - if it's an image, don't try to extract a number
    const lastPriceText = extractTextFromHtml(lastPriceCell?.val || '');
    const hasLastPriceImage = lastPriceCell?.val && lastPriceCell.val.includes('<img');
    const lastPriceNum = hasLastPriceImage ? null : (lastPriceText ? extractNumericValue(lastPriceText) : null);
    const changeText = extractTextFromHtml(changeCell?.val || '');
    const changePercentText = extractTextFromHtml(changePercentCell?.val || '');
    const fundamentalsText = extractTextFromHtml(fundamentalsCell?.val || '');
    const researchText = extractTextFromHtml(researchCell?.val || '');
    const biasText = extractTextFromHtml(biasCell?.val || '');
    // Performance values are plain text (e.g., "0.35%"), extract directly
    const perf1mText = perf1mCell?.val || '';
    const perf3mText = perf3mCell?.val || '';
    const perf12mText = perf12mCell?.val || '';
    const statusText = extractTextFromHtml(statusCell?.val || '');
    const strengthText = extractTextFromHtml(strengthCell?.val || '');
    const newsText = extractTextFromHtml(newsCell?.val || '');
    const socialSentimentText = extractTextFromHtml(socialSentimentCell?.val || '');
    const marketCapitalText = extractTextFromHtml(marketCapitalCell?.val || '');
    const ebitdaText = extractTextFromHtml(ebitdaCell?.val || '');
    
    // Extract DMX status from image number (optional)
    const dmxNum = extractNumberFromImage(dmxCell?.val || '');
    
    // Extract trend images (trend_red and trend_green)
    let trendImages: { red: string | null; green: string | null } | null = null;
    if (trendCell?.val) {
      const trendHtml = trendCell.val;
      // Extract all image src attributes from the HTML
      const imgMatches = trendHtml.matchAll(/<img[^>]+src=["']([^"']+)["']/gi);
      let redSrc: string | null = null;
      let greenSrc: string | null = null;
      
      for (const match of imgMatches) {
        const src = match[1];
        if (src.includes('trend_red_')) {
          redSrc = src;
        } else if (src.includes('trend_green_')) {
          greenSrc = src;
        }
      }
      
      if (redSrc || greenSrc) {
        trendImages = { red: redSrc, green: greenSrc };
      }
    }
    
    // Parse strength value and color (format: "7|#01B298")
    let strengthValue: number | null = null;
    let strengthColor: string | null = null;
    if (strengthText) {
      const strengthMatch = strengthText.match(/^(\d+)\|(.+)$/);
      if (strengthMatch) {
        strengthValue = parseInt(strengthMatch[1], 10);
        strengthColor = strengthMatch[2];
      } else {
        // Fallback: try to extract just the number
        strengthValue = extractNumericValue(strengthText);
      }
    }
    
    return {
      id: `pair-${index}`,
      symbol: symbol, // Display format: "AUD/CAD"
      ticker: ticker, // Symbol code: "AUDCAD"
      flag: getFlagFromSymbol(symbol),
      logoImageUrl,
      lastPrice: lastPriceNum !== null ? lastPriceNum : null,
      lastPriceImageUrl,
      change: changeText ? extractNumericValue(changeText) : null,
      changePercent: changePercentText ? extractNumericValue(changePercentText) : null,
      seasonalityImageUrl,
      patternImageUrl,
      dmxImageUrl,
      dmx: getDMXFromImageNumber(dmxNum),
      fundamentals: fundamentalsText || null,
      fundamentalsStyle: fundamentalsCell?.style || null,
      bankResearch: researchText || null,
      bankResearchStyle: researchCell?.style || null,
      smartBias: biasText || null,
      smartBiasStyle: biasCell?.style || null,
      perf1m: perf1mText ? extractNumericValue(perf1mText) : null,
      perf3m: perf3mText ? extractNumericValue(perf3mText) : null,
      perf12m: perf12mText ? extractNumericValue(perf12mText) : null,
      trend: null, // Trend data would need special parsing if available
      trendImages,
      marketStatus: statusText || null,
      marketStatusHtml: statusCell?.val || null, // Store raw HTML for icon
      strength: strengthValue,
      strengthColor,
      socialSentiment: socialSentimentText || null,
      marketCapital: marketCapitalText || null,
      ebitda: ebitdaText || null,
      news: newsText || null,
      newsHtml: newsCell?.val || null, // Store raw HTML for clickable links
      symbolLink: symbolLink || null,
    };
  });
}

export function OverviewList({ onSettings, onRemove, onFullscreen, settings }: OverviewListProps) {
  const [data, setData] = useState<OverviewItem[]>([]);
  const listType = (settings?.listType as string) || "Forex";
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Map listType to API module name
  const getModuleName = (type: string): string => {
    const moduleMap: Record<string, string> = {
      'Forex': 'Forex',
      'Stocks': 'US Stocks',
      'Crypto': 'Custom', // Crypto might need special handling
      'Commodities': 'Commodities',
    };
    return moduleMap[type] || 'Forex';
  };

  // Fetch data from API
  useEffect(() => {
    const loadData = async () => {
      const module = getModuleName(listType);
      const cacheKey = widgetDataCache.generateKey('overview-list', { module });
      const cachedData = widgetDataCache.get<OverviewItem[]>(cacheKey);
      
      if (cachedData) {
        setData(cachedData);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      
      try {
        const apiData = await fetchOverviewList(module);
        const transformedData = transformApiDataToOverviewItems(apiData);
        setData(transformedData);
        widgetDataCache.set(cacheKey, transformedData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [listType]);



  // Helper to build image URL from relative path
  // Backend dev: base URL is https://frontendapi.primemarket-terminal.com/api/images/assets/img/listimage/last_price_1.png
  // Try relative paths first, then fallback to full URL
  // Helper function to determine text color based on background color
  const getTextColorForBackground = (bgColor: string | undefined): string | undefined => {
    if (!bgColor) return undefined;
    
    const bgLower = bgColor.toLowerCase().trim();
    
    // Check for green (bullish) - #1a8c1a or similar green shades
    if (bgLower.includes('#1a8c1a') || bgLower.includes('green') || 
        (bgLower.startsWith('#1') && bgLower.length === 7) || 
        (bgLower.startsWith('#2') && bgLower.length === 7)) {
      return "#22c55e"; // Green text for green background
    } 
    // Check for yellow/amber (neutral) - #f59e0b, #fbbf24, or similar amber/yellow colors
    else if (bgLower.includes('f59e0b') || bgLower.includes('fbbf24') || 
             bgLower.includes('yellow') || bgLower.includes('amber') || 
             (bgLower.startsWith('#f5') && bgLower.length === 7) || 
             (bgLower.startsWith('#fb') && bgLower.length === 7) ||
             (bgLower.startsWith('#ff') && bgLower.includes('f59e0b'))) {
      return "#000000"; // Black text for yellow background
    } 
    // Check for orange/red (bearish) - #ef4444, #dc2626, or similar red/orange colors
    else if (bgLower.includes('#ef') || bgLower.includes('#dc') || 
             bgLower.includes('red') || bgLower.includes('orange') ||
             (bgLower.startsWith('#ff') && !bgLower.includes('f59e0b'))) {
      return "#ffffff"; // White text for orange/red background
    }
    
    return undefined;
  };

  const getImageUrl = (relativePath: string | null): string | null => {
    if (!relativePath) return null;
    // If already absolute URL, return as-is
    if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
      return relativePath;
    }
    // Remove query string if present (e.g., ?v=20241113014244)
    const pathWithoutQuery = relativePath.split('?')[0];
    
    // Normalize path (remove leading slash if present for consistency)
    const normalizedPath = pathWithoutQuery.startsWith('/') ? pathWithoutQuery.slice(1) : pathWithoutQuery;
    
    // Construct full URL as specified by backend dev
    // Format: https://frontendapi.primemarket-terminal.com/api/images/{path}
    return `https://frontendapi.primemarket-terminal.com/api/images/${normalizedPath}`;
  };

  return (
    <div className="h-full w-full flex flex-col bg-widget border border-border rounded-sm overflow-hidden">
      <WidgetHeader
        title={
          <span>
            Overview List <span className="text-primary">[{listType}]</span>
          </span>
        }
        widgetName="Overview List"
        onSettings={onSettings}
        onRemove={onRemove}
        onFullscreen={onFullscreen}
        helpContent="Overview List provides a comprehensive market scanner with technical indicators, fundamentals, performance metrics, and real-time market analysis across multiple assets."
      />

      {/* Table */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Table Header */}
        <div className="border-b border-border bg-[#1a1a1a] sticky top-0 z-10 overflow-x-auto">
          <div className="flex items-center min-w-max text-sm text-muted-foreground font-semibold">
            <div className="w-[77px] px-3 py-1.5 border-r border-border/50">Symbol</div>
            <div className="w-[100px] px-3 py-1.5 border-r border-border/50 text-right">Last Price</div>
            <div className="w-[90px] px-3 py-1.5 border-r border-border/50 text-right">Change %</div>
            <div className="w-[75px] px-3 py-1.5 border-r border-border/50 text-center">Seasonal</div>
            <div className="w-[75px] px-3 py-1.5 border-r border-border/50 text-center">Pattern</div>
            <div className="w-[65px] px-3 py-1.5 border-r border-border/50 text-center">DMX</div>
            <div className="w-[90px] px-3 py-1.5 border-r border-border/50 text-center">Fund.</div>
            <div className="w-[90px] px-3 py-1.5 border-r border-border/50 text-center">Research</div>
            <div className="w-[90px] px-3 py-1.5 border-r border-border/50 text-center">Bias</div>
            <div className="w-[75px] px-3 py-1.5 border-r border-border/50 text-center">1M %</div>
            <div className="w-[75px] px-3 py-1.5 border-r border-border/50 text-center">3M %</div>
            <div className="w-[75px] px-3 py-1.5 border-r border-border/50 text-center">12M %</div>
            <div className="w-[110px] px-3 py-1.5 border-r border-border/50 text-center">Trend</div>
            <div className="w-[65px] px-3 py-1.5 border-r border-border/50 text-center">Status</div>
            <div className="w-[100px] px-3 py-1.5 border-r border-border/50 text-center">Strength</div>
            <div className="flex-1 min-w-[250px] px-3 py-1.5">Latest News</div>
          </div>
        </div>

        {/* Table Body */}
        <div className="flex-1 overflow-x-auto overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full py-12">
              <div className="text-center">
                <p className="text-sm text-destructive mb-2">{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={loading}
                  onClick={async () => {
                    setLoading(true);
                    setError(null);
                    try {
                      const module = getModuleName(listType);
                      const apiData = await fetchOverviewList(module);
                      const transformedData = transformApiDataToOverviewItems(apiData);
                      setData(transformedData);
                      setError(null);
                    } catch (err) {
                      setError(err instanceof Error ? err.message : 'Failed to load data');
                    } finally {
                      setLoading(false);
                    }
                  }}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    'Retry'
                  )}
                </Button>
              </div>
            </div>
          ) : data.length === 0 ? (
            <div className="flex items-center justify-center h-full py-12">
              <p className="text-sm text-muted-foreground">No data available</p>
            </div>
          ) : (
            <div className="min-w-max">
              {data.map((item, idx) => (
              <div
                key={item.id}
                className={`flex items-center border-b border-border/30 hover:bg-primary/5 transition-all duration-200 group ${
                  idx % 2 === 0 ? "bg-black/20" : "bg-black/10"
                }`}
              >
                {/* Symbol */}
                <div className="w-[77px] px-3 py-1.5 border-r border-border/30">
                  <div className="flex items-center gap-2">
                    {item.logoImageUrl ? (
                      <img 
                        src={getImageUrl(item.logoImageUrl) || ''} 
                        alt={item.symbol}
                        className="w-5 h-5 object-contain"
                        onError={(e) => {
                          // Fallback to flag if image fails to load
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <span className="text-lg">{item.flag}</span>
                    )}
                    {item.symbolLink ? (
                      <a
                        href={item.symbolLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-foreground hover:text-primary transition-colors"
                      >
                        {item.symbol}
                      </a>
                    ) : (
                    <span className="text-sm text-foreground">
                      {item.symbol}
                    </span>
                    )}
                  </div>
                </div>

                {/* Last Price */}
                <div className="w-[100px] px-3 py-1.5 border-r border-border/30 text-right">
                  {item.lastPriceImageUrl ? (
                    <img 
                      src={getImageUrl(item.lastPriceImageUrl) || ''} 
                      alt="Last Price"
                      className="max-h-6 object-contain ml-auto"
                    />
                  ) : item.lastPrice !== null ? (
                    <span className="text-sm text-foreground tabular-nums">
                      {item.lastPrice.toFixed(5)}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">N/A</span>
                  )}
                </div>

                {/* Change */}
                <div className="w-[90px] px-2 py-1.5 border-r border-border/30">
                  {item.changePercent !== null ? (
                    <div className="bg-slate-500/10 rounded px-2 py-1 text-center">
                      <span className={`text-sm tabular-nums ${
                        item.changePercent >= 0 ? "text-green-400" : "text-red-400"
                      }`}>
                        {item.changePercent >= 0 ? "+" : ""}{item.changePercent.toFixed(2)}%
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">N/A</span>
                  )}
                </div>

                {/* Seasonality */}
                <div className="w-[75px] px-2 py-1.5 border-r border-border/30 flex items-center justify-center">
                  {item.seasonalityImageUrl ? (
                    <img 
                      src={getImageUrl(item.seasonalityImageUrl) || ''} 
                      alt="Seasonality"
                      className="max-h-6 object-contain"
                    />
                  ) : (
                    <span className="text-xs text-muted-foreground">N/A</span>
                  )}
                </div>

                {/* Pattern */}
                <div className="w-[75px] px-2 py-1.5 border-r border-border/30 flex items-center justify-center">
                  {item.patternImageUrl ? (
                    <img 
                      src={getImageUrl(item.patternImageUrl) || ''} 
                      alt="Pattern"
                      className="max-h-6 object-contain"
                    />
                  ) : (
                    <span className="text-xs text-muted-foreground">N/A</span>
                  )}
                </div>

                {/* DMX */}
                <div className="w-[65px] px-2 py-1.5 border-r border-border/30 flex items-center justify-center">
                  {item.dmxImageUrl ? (
                    <img 
                      src={getImageUrl(item.dmxImageUrl) || ''} 
                      alt="DMX"
                      className="max-h-6 object-contain"
                    />
                  ) : item.dmx ? (
                    <div className="bg-black/30 rounded p-1">
                      {(() => {
                        let segments: { color: string; percentage: number }[] = [];
                        
                        switch (item.dmx) {
                          case "very-bullish":
                            segments = [
                              { color: "#10b981", percentage: 85 },
                              { color: "#34d399", percentage: 15 },
                            ];
                            break;
                          case "bullish":
                            segments = [
                              { color: "#10b981", percentage: 65 },
                              { color: "#f59e0b", percentage: 35 },
                            ];
                            break;
                          case "neutral":
                            segments = [
                              { color: "#f59e0b", percentage: 50 },
                              { color: "#6b7280", percentage: 50 },
                            ];
                            break;
                          case "bearish":
                            segments = [
                              { color: "#ef4444", percentage: 65 },
                              { color: "#f59e0b", percentage: 35 },
                            ];
                            break;
                          case "very-bearish":
                            segments = [
                              { color: "#dc2626", percentage: 85 },
                              { color: "#ef4444", percentage: 15 },
                            ];
                            break;
                          default:
                            segments = [{ color: "#6b7280", percentage: 100 }];
                        }
                        
                        const size = 20;
                        const center = size / 2;
                        const radius = size / 2;
                        
                        let cumulativePercent = 0;
                        
                        const createArc = (percent: number, startPercent: number) => {
                          const startAngle = (startPercent / 100) * 2 * Math.PI - Math.PI / 2;
                          const endAngle = ((startPercent + percent) / 100) * 2 * Math.PI - Math.PI / 2;
                          
                          const x1 = center + radius * Math.cos(startAngle);
                          const y1 = center + radius * Math.sin(startAngle);
                          const x2 = center + radius * Math.cos(endAngle);
                          const y2 = center + radius * Math.sin(endAngle);
                          
                          const largeArc = percent > 50 ? 1 : 0;
                          
                          return `M ${center},${center} L ${x1},${y1} A ${radius},${radius} 0 ${largeArc},1 ${x2},${y2} Z`;
                        };
                        
                        return (
                          <svg width={size} height={size}>
                            {segments.map((segment, idx) => {
                              const path = createArc(segment.percentage, cumulativePercent);
                              const currentPercent = cumulativePercent;
                              cumulativePercent += segment.percentage;
                              
                              return (
                                <path
                                  key={idx}
                                  d={path}
                                  fill={segment.color}
                                  opacity={0.9}
                                />
                              );
                            })}
                            <circle
                              cx={center}
                              cy={center}
                              r={radius * 0.35}
                              fill="#0a0a0a"
                            />
                          </svg>
                        );
                      })()}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">N/A</span>
                  )}
                </div>

                {/* Fundamentals */}
                <div className="w-[90px] px-2 py-1.5 border-r border-border/30">
                  {item.fundamentals ? (
                    <div 
                      className="rounded px-2 py-1 text-center"
                      style={(() => {
                        if (!item.fundamentalsStyle) return undefined;
                        const bgColor = item.fundamentalsStyle.match(/background-color:\s*([^;!]+)/)?.[1]?.trim();
                        if (!bgColor) return undefined;
                        
                        const textColor = getTextColorForBackground(bgColor);
                        
                        return {
                          backgroundColor: bgColor,
                          color: textColor
                        };
                      })()}
                    >
                      <div className="text-xs font-medium">{item.fundamentals}</div>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">N/A</span>
                  )}
                </div>

                {/* Research */}
                <div className="w-[90px] px-2 py-1.5 border-r border-border/30">
                  {item.bankResearch ? (
                    <div 
                      className="rounded px-2 py-1 text-center"
                      style={(() => {
                        if (!item.bankResearchStyle) return undefined;
                        const bgColor = item.bankResearchStyle.match(/background-color:\s*([^;!]+)/)?.[1]?.trim();
                        if (!bgColor) return undefined;
                        
                        const textColor = getTextColorForBackground(bgColor);
                        
                        return {
                          backgroundColor: bgColor,
                          color: textColor
                        };
                      })()}
                    >
                      <div className="text-xs font-medium">{item.bankResearch}</div>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">N/A</span>
                  )}
                </div>

                {/* Smart Bias */}
                <div className="w-[90px] px-2 py-1.5 border-r border-border/30">
                  {item.smartBias ? (
                    <div 
                      className="rounded px-2 py-1 text-center"
                      style={(() => {
                        if (!item.smartBiasStyle) return undefined;
                        const bgColor = item.smartBiasStyle.match(/background-color:\s*([^;!]+)/)?.[1]?.trim();
                        if (!bgColor) return undefined;
                        
                        const textColor = getTextColorForBackground(bgColor);
                        
                        return {
                          backgroundColor: bgColor,
                          color: textColor
                        };
                      })()}
                    >
                      <div className="text-xs font-medium">{item.smartBias}</div>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">N/A</span>
                  )}
                </div>

                {/* 1 Month Performance */}
                <div className="w-[75px] px-2 py-1.5 border-r border-border/30">
                  {item.perf1m !== null ? (
                    <div className={`${
                      item.perf1m >= 0 ? "bg-emerald-500/20" : "bg-red-500/20"
                    } rounded px-2 py-1 text-center`}>
                      <span className={`text-sm tabular-nums ${
                        item.perf1m >= 0 ? "text-emerald-400" : "text-red-400"
                      }`}>
                        {item.perf1m >= 0 ? "+" : ""}{item.perf1m.toFixed(2)}%
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">N/A</span>
                  )}
                </div>

                {/* 3 Month Performance */}
                <div className="w-[75px] px-2 py-1.5 border-r border-border/30">
                  {item.perf3m !== null ? (
                    <div className={`${
                      item.perf3m >= 0 ? "bg-emerald-500/20" : "bg-red-500/20"
                    } rounded px-2 py-1 text-center`}>
                      <span className={`text-sm tabular-nums ${
                        item.perf3m >= 0 ? "text-emerald-400" : "text-red-400"
                      }`}>
                        {item.perf3m >= 0 ? "+" : ""}{item.perf3m.toFixed(2)}%
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">N/A</span>
                  )}
                </div>

                {/* 12 Month Performance */}
                <div className="w-[75px] px-2 py-1.5 border-r border-border/30">
                  {item.perf12m !== null ? (
                    <div className={`${
                      item.perf12m >= 0 ? "bg-emerald-500/20" : "bg-red-500/20"
                    } rounded px-2 py-1 text-center`}>
                      <span className={`text-sm tabular-nums ${
                        item.perf12m >= 0 ? "text-emerald-400" : "text-red-400"
                      }`}>
                        {item.perf12m >= 0 ? "+" : ""}{item.perf12m.toFixed(2)}%
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">N/A</span>
                  )}
                </div>

                {/* Trend */}
                <div className="w-[110px] px-2 py-1.5 border-r border-border/30 flex items-center justify-center gap-1">
                  {item.trendImages ? (
                    <div className="flex items-center gap-0.5">
                      {item.trendImages.red && (
                        <img 
                          src={getImageUrl(item.trendImages.red) || ''} 
                          alt="Trend Red"
                          className="max-h-5 object-contain"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      )}
                      {item.trendImages.green && (
                        <img 
                          src={getImageUrl(item.trendImages.green) || ''} 
                          alt="Trend Green"
                          className="max-h-5 object-contain"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">N/A</span>
                  )}
                </div>

                {/* Market Status */}
                <div className="w-[65px] px-2 py-1.5 border-r border-border/30 flex items-center justify-center">
                  {item.marketStatusHtml ? (
                    <div 
                      className="bg-slate-500/10 rounded px-2 py-1 flex items-center justify-center [&_i]:text-xs"
                      dangerouslySetInnerHTML={{ __html: item.marketStatusHtml }}
                    />
                  ) : (
                    <span className="text-xs text-muted-foreground">N/A</span>
                  )}
                </div>

                {/* Strength */}
                <div className="w-[100px] px-2 py-1.5 border-r border-border/30">
                  {item.strength !== null ? (
                    <div className="bg-slate-500/10 rounded px-2 py-1">
                      <div className="w-full h-1 bg-black/50 rounded-full overflow-hidden">
                        <div
                          className="h-full transition-all duration-500"
                          style={{
                            width: `${Math.min(100, Math.max(0, item.strength))}%`,
                            backgroundColor: item.strengthColor || (
                              item.strength > 70 ? "#10b981" :
                                           item.strength > 50 ? "#34d399" :
                              item.strength > 30 ? "#f59e0b" : "#ef4444"
                            ),
                          }}
                        />
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">N/A</span>
                  )}
                </div>

                {/* Latest News */}
                <div className="flex-1 min-w-[250px] px-3 py-1.5">
                  {item.newsHtml ? (
                    <div 
                      className="text-sm text-muted-foreground whitespace-nowrap [&_a]:text-primary [&_a]:hover:text-primary/80 [&_a]:underline [&_a]:cursor-pointer [&_i]:mr-1"
                      dangerouslySetInnerHTML={{ __html: item.newsHtml }}
                    />
                  ) : item.news ? (
                    <span className="text-sm text-muted-foreground whitespace-nowrap">{item.news}</span>
                  ) : (
                    <span className="text-xs text-muted-foreground">N/A</span>
                  )}
                </div>
              </div>
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}

export default OverviewList;

