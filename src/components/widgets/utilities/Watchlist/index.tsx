import { TrendingUp, TrendingDown, Plus, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WidgetHeader } from "@/components/bloomberg-ui/WidgetHeader";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/bloomberg-ui/ConfirmDialog";
import { useState, useEffect, useRef, useCallback } from "react";
import { 
  getWatchlists, 
  updateWatchlistSymbol,
  deleteWatchlistSymbol,
  saveWatchlistSymbols,
  createWatchlistAndAddToDashboard,
  type WatchlistSymbol, 
  type Watchlist 
} from "./api";

type OrderType = "Market" | "Buy Limit" | "Sell Limit" | "Buy Stop" | "Sell Stop";
type Direction = "Buy" | "Sell";
type Status = "Pending" | "Idea" | "Active";

interface Stock {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: string;
  direction: Direction;
  orderType: OrderType;
  entryPrice: string;
  logo: string;
  logoColor: string;
  status: Status;
  watchlistSymbolID: string; // For API updates/deletes
  symbolID?: string; // Symbol ID for deletion
}

// Helper function to map OrderType from API to our OrderType
const mapOrderType = (orderType: string): OrderType => {
  if (!orderType || orderType.trim() === "") {
    return "Market";
  }
  const normalized = orderType.toLowerCase().trim();
  if (normalized.includes("market")) {
    return "Market";
  }
  if (normalized.includes("buy limit")) {
    return "Buy Limit";
  }
  if (normalized.includes("sell limit")) {
    return "Sell Limit";
  }
  if (normalized.includes("buy stop")) {
    return "Buy Stop";
  }
  if (normalized.includes("sell stop")) {
    return "Sell Stop";
  }
  return "Market"; // Default fallback
};

// Helper function to map Direction from API to our Direction
const mapDirection = (direction: string): Direction => {
  if (!direction || direction.trim() === "") {
    return "Buy"; // Default to Buy
  }
  const normalized = direction.toLowerCase().trim();
  if (normalized === "sell" || normalized === "short") {
    return "Sell";
  }
  return "Buy";
};

// Helper function to get symbol name from symbol code
const getSymbolName = (symbol: string): string => {
  // For forex pairs, return formatted name
  if (symbol.length === 6 && !symbol.includes("/")) {
    return `${symbol.substring(0, 3)}/${symbol.substring(3, 6)}`;
  }
  // For symbols with slash, return as is
  if (symbol.includes("/")) {
    return symbol;
  }
  // For stock symbols, return symbol
  return symbol;
};

// Helper function to get logo and color from symbol
const getSymbolLogo = (symbol: string): { logo: string; color: string } => {
  // Extract first character or first 3 chars for currency pairs
  let logo: string;
  if (symbol.length === 6 && !symbol.includes("/")) {
    logo = symbol.substring(0, 1);
  } else if (symbol.includes("/")) {
    logo = symbol.substring(0, 1);
  } else {
    logo = symbol.charAt(0);
  }
  
  // Array of different colors for symbols
  const colors = [
    "#f59e0b", // Orange
    "#3b82f6", // Blue
    "#8b5cf6", // Purple
    "#ec4899", // Pink
    "#10b981", // Green
    "#ef4444", // Red
    "#06b6d4", // Cyan
    "#f97316", // Orange-red
    "#6366f1", // Indigo
    "#14b8a6", // Teal
    "#a855f7", // Purple
    "#eab308", // Yellow
  ];
  
  // Use symbol's hash to consistently assign a color
  let hash = 0;
  for (let i = 0; i < symbol.length; i++) {
    hash = symbol.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colorIndex = Math.abs(hash) % colors.length;
  const color = colors[colorIndex];
  
  return { logo, color };
};

// Transform API data to Stock interface
const transformWatchlistSymbolToStock = (symbol: WatchlistSymbol, watchlistColor: string): Stock => {
  const currentPrice = symbol.CurrentPrice || 0;
  const addedAtPrice = symbol.AddedAtPrice || 0;
  const change = currentPrice - addedAtPrice;
  const changePercent = addedAtPrice !== 0 ? (change / addedAtPrice) * 100 : 0;
  
  const symbolName = getSymbolName(symbol.Symbol);
  
  const { logo, color } = getSymbolLogo(symbol.Symbol);
  return {
    symbol: symbolName,
    name: symbol.Symbol, // Use original symbol as name
    price: currentPrice,
    change: change,
    changePercent: changePercent,
    volume: "", // Volume not available in API
    direction: mapDirection(symbol.Direction),
    orderType: mapOrderType(symbol.OrderType),
    entryPrice: symbol.Entry || "",
    logo: logo,
    logoColor: color,
    status: "Active" as Status, // Default to Active since not in API
    watchlistSymbolID: symbol.WatchlistSymbolID, // Store for API updates
    symbolID: symbol.SymbolUrl || symbol.Symbol, // Store symbol ID for deletion
  };
};

interface WatchlistProps {
  wgid?: string;
  onSettings?: () => void;
  onRemove?: () => void;
  onFullscreen?: () => void;
  settings?: Record<string, any>;
}

// Symbol database for autocomplete (can be enhanced with API later)
const SYMBOL_DATABASE: Array<{ symbol: string; name: string; logo: string; logoColor: string }> = [
  // Forex
  { symbol: "EUR/USD", name: "Euro / US Dollar", logo: "€", logoColor: "#003399" },
  { symbol: "GBP/USD", name: "British Pound / US Dollar", logo: "£", logoColor: "#012169" },
  { symbol: "USD/JPY", name: "US Dollar / Japanese Yen", logo: "¥", logoColor: "#BC002D" },
  { symbol: "AUD/USD", name: "Australian Dollar / US Dollar", logo: "$", logoColor: "#00008B" },
  { symbol: "USD/CAD", name: "US Dollar / Canadian Dollar", logo: "$", logoColor: "#FF0000" },
  { symbol: "USD/CHF", name: "US Dollar / Swiss Franc", logo: "Fr", logoColor: "#FF0000" },
  { symbol: "NZD/USD", name: "New Zealand Dollar / US Dollar", logo: "$", logoColor: "#00008B" },
  { symbol: "EUR/GBP", name: "Euro / British Pound", logo: "€", logoColor: "#003399" },
  { symbol: "EUR/JPY", name: "Euro / Japanese Yen", logo: "€", logoColor: "#003399" },
  { symbol: "GBP/JPY", name: "British Pound / Japanese Yen", logo: "£", logoColor: "#012169" },
  { symbol: "AUD/CAD", name: "Australian Dollar / Canadian Dollar", logo: "$", logoColor: "#00008B" },
  { symbol: "CAD/CHF", name: "Canadian Dollar / Swiss Franc", logo: "$", logoColor: "#FF0000" },
  { symbol: "CHF/JPY", name: "Swiss Franc / Japanese Yen", logo: "Fr", logoColor: "#FF0000" },
  // Crypto
  { symbol: "BTC/USD", name: "Bitcoin", logo: "₿", logoColor: "#F7931A" },
  { symbol: "ETH/USD", name: "Ethereum", logo: "Ξ", logoColor: "#627EEA" },
  { symbol: "BNB/USD", name: "Binance Coin", logo: "B", logoColor: "#F3BA2F" },
  { symbol: "SOL/USD", name: "Solana", logo: "S", logoColor: "#14F195" },
  { symbol: "ADA/USD", name: "Cardano", logo: "A", logoColor: "#0033AD" },
  { symbol: "XRP/USD", name: "Ripple", logo: "X", logoColor: "#23292F" },
  { symbol: "DOGE/USD", name: "Dogecoin", logo: "Ð", logoColor: "#C2A633" },
  // Stocks
  { symbol: "AAPL", name: "Apple Inc.", logo: "", logoColor: "#555555" },
  { symbol: "MSFT", name: "Microsoft Corp.", logo: "M", logoColor: "#00A4EF" },
  { symbol: "GOOGL", name: "Alphabet Inc.", logo: "G", logoColor: "#4285F4" },
  { symbol: "AMZN", name: "Amazon.com Inc.", logo: "a", logoColor: "#FF9900" },
  { symbol: "META", name: "Meta Platforms Inc.", logo: "f", logoColor: "#0866FF" },
  { symbol: "NVDA", name: "NVIDIA Corp.", logo: "N", logoColor: "#76B900" },
  { symbol: "TSLA", name: "Tesla Inc.", logo: "T", logoColor: "#E82127" },
  { symbol: "AMD", name: "Advanced Micro Devices", logo: "A", logoColor: "#ED1C24" },
  { symbol: "NFLX", name: "Netflix Inc.", logo: "N", logoColor: "#E50914" },
  { symbol: "ADBE", name: "Adobe Inc.", logo: "A", logoColor: "#FF0000" },
];

export default function Watchlist({ onSettings, onRemove, onFullscreen, settings, wgid = "watchlist-1" }: WatchlistProps) {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentWatchlistId, setCurrentWatchlistId] = useState<string | null>(null);
  const [currentWatchlistName, setCurrentWatchlistName] = useState<string | null>(null);
  const [apiWidgetID, setApiWidgetID] = useState<string | null>(null); // WidgetID from createWatchlistAndAddToDashboard API response
  const [isSaving, setIsSaving] = useState(false);
  const [isAddingSymbol, setIsAddingSymbol] = useState(false);
  const [newSymbolInput, setNewSymbolInput] = useState("");
  const isFetchingRef = useRef(false); // Prevent multiple simultaneous fetches
  const hasFetchedRef = useRef(false); // Track if we've fetched on mount
  const lastFetchedWatchlistIdRef = useRef<string | number | undefined>(undefined); // Track last fetched watchlistId
  const [symbolSuggestions, setSymbolSuggestions] = useState<typeof SYMBOL_DATABASE>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionRef = useRef<HTMLDivElement>(null);
  const hasAttemptedCreateRef = useRef(false);
  const [symbolToDelete, setSymbolToDelete] = useState<Stock | null>(null); // Track symbol to delete for confirmation dialog

  console.log('[Watchlist] Component rendered', { loading, error, stocksCount: stocks.length, wgid });

  // Extract WidgetID from wgid prop (similar to Ticklist pattern)
  const getWidgetID = useCallback((): string | undefined => {
    // First priority: use widgetID from API response (createWatchlistAndAddToDashboard)
    if (apiWidgetID) {
      return apiWidgetID;
    }
    // Second priority: use wgid directly (it's the widget instance identifier)
    if (wgid) {
      return wgid;
    }
    // Fallback: try to get from settings
    if (settings?.widgetID) {
      return typeof settings.widgetID === 'string' ? settings.widgetID : String(settings.widgetID);
    }
    if (settings?.customDashboardWidgetID) {
      return typeof settings.customDashboardWidgetID === 'string' 
        ? settings.customDashboardWidgetID 
        : String(settings.customDashboardWidgetID);
    }
    return undefined;
  }, [apiWidgetID, wgid, settings]);

  // Get template ID (same pattern as Ticklist)
  // IMPORTANT: If wgid is just a number (no dash), it's a widget instance ID, not template ID
  // Only extract template ID from wgid if it contains a dash (format: "templateId-position")
  const getTemplateId = useCallback((): number | null => {
    const parseNumeric = (value: unknown): number | null => {
      if (value === undefined || value === null) return null;
      const parsed = typeof value === "number" ? value : parseInt(String(value), 10);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
    };

    // Only extract from wgid if it contains a dash (format: "templateId-position")
    // If wgid is just a number, it's a widget instance ID, not template ID
    if (wgid && wgid.includes("-")) {
      const templatePart = wgid.split("-")[0];
      const parsedFromWgid = parseNumeric(templatePart);
      if (parsedFromWgid) {
        return parsedFromWgid;
      }
    }

    // Try settings first
    const parsedFromSettings =
      parseNumeric(settings?.templateId) ??
      parseNumeric(settings?.dashboardTemplateId) ??
      parseNumeric(settings?.templateID) ??
      parseNumeric(settings?.dashboardTemplateID);
    if (parsedFromSettings) {
      return parsedFromSettings;
    }

    // Fallback to localStorage (most reliable for actual template ID)
    if (typeof window !== "undefined") {
      try {
        const storedActiveTemplateId = window.localStorage.getItem("pmt_active_template_id");
        const parsedFromStorage = parseNumeric(storedActiveTemplateId ?? undefined);
        if (parsedFromStorage) {
          return parsedFromStorage;
        }
      } catch (storageError) {
        console.warn("Watchlist: Unable to read active template ID from localStorage", storageError);
      }
    }

    return null;
  }, [wgid, settings]);

  // Fetch watchlist data from API
  const fetchWatchlistData = useCallback(async () => {
    // Prevent multiple simultaneous fetches
    if (isFetchingRef.current) {
      console.log('[Watchlist] Already fetching, skipping duplicate call');
      return;
    }
    
    try {
      isFetchingRef.current = true;
      setLoading(true);
      setError(null);
      
      console.log('[Watchlist] Fetching watchlist data...', { watchlistId: settings?.watchlistId });
      
      // Priority 1: If we have a watchlist ID in settings, use it directly
      if (settings?.watchlistId) {
        const settingsWatchlistId = String(settings.watchlistId);
        console.log('[Watchlist] Using watchlist ID from settings:', settingsWatchlistId);
        
        // Fetch the specific watchlist
        const response = await getWatchlists(settingsWatchlistId);
        if (response && response.Watchlists && response.Watchlists.length > 0) {
          const watchlist = response.Watchlists.find(
            (w: any) => w.WatchlistID?.toString() === settingsWatchlistId
          ) || response.Watchlists[0];
          
          if (watchlist) {
            setCurrentWatchlistId(watchlist.WatchlistID);
            setCurrentWatchlistName(watchlist.WatchlistName || null);
            const watchlistColor = watchlist.Color || "#555555";
            
            if (watchlist.Symbols && watchlist.Symbols.length > 0) {
              // Parse SymbolIDs from watchlist (comma-separated string)
              const symbolIDsArray = watchlist.SymbolIDs 
                ? watchlist.SymbolIDs.split(',').map((id: string) => parseInt(id.trim())).filter((id: number) => !isNaN(id))
                : [];
              
              const transformedStocks = watchlist.Symbols.map((symbol: any, index: number) => {
                const stock = transformWatchlistSymbolToStock(symbol, watchlistColor);
                // Try to get SymbolID from parsed array (by index) or look up from availableSymbols
                if (symbolIDsArray[index]) {
                  stock.symbolID = symbolIDsArray[index].toString();
                } else {
                  // Fallback: look up from availableSymbols
                  const found = availableSymbols.find(s => 
                    s.symbol === symbol.Symbol || 
                    s.symbol.replace(/\//g, '') === symbol.Symbol.replace(/\//g, '')
                  );
                  if (found && found.symbolID) {
                    stock.symbolID = found.symbolID.toString();
                  }
                }
                return stock;
              });
              
              setStocks(transformedStocks);
              console.log('[Watchlist] Successfully loaded', transformedStocks.length, 'stocks from settings watchlist');
            } else {
              setStocks([]);
            }
            setLoading(false);
            return;
          }
        }
        // If watchlist not found, continue to fallback logic below
      }
      
      // Priority 2: If we don't have a watchlist ID in settings, try to create one
      // Only create if template is saved (has numeric ID, not "fresh-" or "local-")
      // Only attempt once to prevent infinite loops
      if (!settings?.watchlistId && !currentWatchlistId && !hasAttemptedCreateRef.current) {
        const templateId = getTemplateId();
        // Check if template ID is numeric (saved template) - unsaved templates have string IDs like "fresh-123"
        const isTemplateSaved = templateId !== null && !isNaN(templateId) && templateId > 0;
        
        if (templateId && isTemplateSaved) {
          hasAttemptedCreateRef.current = true; // Mark that we've attempted creation
          console.log('[Watchlist] No watchlist ID found, creating new watchlist for saved template:', templateId);
          console.log('[Watchlist] Template ID validation:', {
            templateId,
            type: typeof templateId,
            isNumeric: !isNaN(templateId),
            isPositive: templateId > 0,
            wgid,
            settingsKeys: Object.keys(settings || {})
          });
          try {
            const createResponse = await createWatchlistAndAddToDashboard({
              TemplateId: templateId,
              WatchlistName: "My Watchlist",
              WidgetID: getWidgetID(), // Add WidgetID (wgid)
              Color: "#FF5733",
              TopPos: typeof settings?.TopPos === 'number' ? settings.TopPos : (typeof settings?.topPos === 'number' ? settings.topPos : 0),
              LeftPos: typeof settings?.LeftPos === 'number' ? settings.LeftPos : (typeof settings?.leftPos === 'number' ? settings.leftPos : 0),
              Height: typeof settings?.Height === 'number' ? settings.Height : (typeof settings?.height === 'number' ? settings.height : 200),
              Width: typeof settings?.Width === 'number' ? settings.Width : (typeof settings?.width === 'number' ? settings.width : 300),
              position: typeof settings?.position === 'string' ? settings.position : '',
              zIndex: typeof settings?.zIndex === 'number' ? settings.zIndex : 0,
              CustomTabsID: typeof settings?.customTabsID === 'number' ? settings.customTabsID : (typeof settings?.CustomTabsID === 'number' ? settings.CustomTabsID : 0),
            });
            
            console.log('[Watchlist] Create watchlist response:', createResponse);
            
            // Check if template was not found (likely unsaved template)
            if (createResponse?.templateNotFound || createResponse?.error?.includes('Template not found')) {
              console.log('[Watchlist] Template not found (likely unsaved template). Will use existing watchlists.');
              // Don't try to create again - just continue to fetch existing watchlists
            } else if (createResponse?.Message === 'No Access' || createResponse?.message === 'No Access') {
              console.log('[Watchlist] No access to create watchlist for this template. Will use existing watchlists.');
              // Don't try to create again - just continue to fetch existing watchlists
            } else if (createResponse?.success === true) {
              // Extract widgetID from API response (required for subsequent API calls)
              const newWidgetID = 
                createResponse?.widgetID?.toString() || 
                createResponse?.data?.WidgetID?.toString() || 
                createResponse?.WidgetID?.toString() || // Legacy fallback
                null;
              
              // Extract watchlist ID from watchlistId or data.WatchlistID
              const newWatchlistId = 
                createResponse?.watchlistId?.toString() || 
                createResponse?.data?.WatchlistID?.toString() || 
                createResponse?.WatchlistID?.toString() || // Legacy fallback
                null;
              
              if (newWatchlistId) {
                console.log('[Watchlist] Created new watchlist with ID:', newWatchlistId);
                console.log('[Watchlist] Received widgetID from API:', newWidgetID);
                
                // Store widgetID from API response (this is the correct widgetID to use)
                if (newWidgetID) {
                  setApiWidgetID(newWidgetID);
                }
                
                setCurrentWatchlistId(newWatchlistId);
                // Use the newly created watchlist ID for fetching
                const response = await getWatchlists(newWatchlistId);
                if (response && response.Watchlists && response.Watchlists.length > 0) {
                  const watchlist = response.Watchlists[0];
                  setCurrentWatchlistId(watchlist.WatchlistID);
                  setCurrentWatchlistName(watchlist.WatchlistName || null);
                  setStocks([]); // New watchlist will be empty
                  setLoading(false);
                  return;
                }
              } else {
                console.log('[Watchlist] No watchlistId in response, will fetch existing watchlists');
              }
            } else {
              console.log('[Watchlist] Watchlist creation was not successful, will fetch existing watchlists');
            }
          } catch (createError: any) {
            // Silently handle API errors - log but don't throw (similar to MoodBoard pattern)
            console.log('[Watchlist] API creation failed, will try to fetch existing watchlists:', createError?.message || 'Unknown error');
            // Continue to try fetching with "-1" (all watchlists) as fallback
          }
        } else if (templateId && !isTemplateSaved) {
          console.log('[Watchlist] Template is not saved yet, skipping watchlist creation. Will fetch existing watchlists.');
          // For unsaved templates, continue to fetch existing watchlists instead of showing empty
        } else {
          console.warn('[Watchlist] No template ID available, cannot create watchlist. Will fetch existing watchlists.');
        }
      }
      
      const watchlistId = settings?.watchlistId || currentWatchlistId || "-1";
      const response = await getWatchlists(watchlistId);
      
      console.log('[Watchlist] API Response:', response);
      
      if (!response || !response.Watchlists || response.Watchlists.length === 0) {
        console.log('[Watchlist] No watchlists found in response');
        setStocks([]);
        setLoading(false);
        return;
      }
      
      // If we requested a specific watchlist ID, try to find it in the response
      // Otherwise, find the first watchlist with symbols, or use the first watchlist
      let watchlist: any = null;
      if (watchlistId !== "-1" && watchlistId) {
        const requestedId = watchlistId.toString();
        const foundWatchlist = response.Watchlists.find(
          (w: any) => w.WatchlistID?.toString() === requestedId
        );
        if (foundWatchlist) {
          watchlist = foundWatchlist;
          console.log('[Watchlist] Found requested watchlist:', watchlist);
        } else {
          console.warn('[Watchlist] Requested watchlist ID', watchlistId, 'not found in response, searching for watchlist with symbols');
        }
      }
      
      // If no specific watchlist found, find the first one with symbols
      if (!watchlist) {
        watchlist = response.Watchlists.find(
          (w: any) => w.Symbols && Array.isArray(w.Symbols) && w.Symbols.length > 0
        );
        if (watchlist) {
          console.log('[Watchlist] Found watchlist with symbols:', watchlist.WatchlistID, 'with', watchlist.Symbols.length, 'symbols');
        } else {
          // Fallback to first watchlist if none have symbols
          watchlist = response.Watchlists[0];
          console.log('[Watchlist] No watchlist with symbols found, using first watchlist:', watchlist?.WatchlistID);
        }
      }
      
      if (!watchlist) {
        console.warn('[Watchlist] No watchlist found in response');
        setStocks([]);
        setLoading(false);
        return;
      }
      
      console.log('[Watchlist] Using watchlist:', watchlist.WatchlistID, 'with', watchlist.Symbols?.length || 0, 'symbols');
      
      // Store the watchlist ID and name for future operations
      setCurrentWatchlistId(watchlist.WatchlistID);
      setCurrentWatchlistName(watchlist.WatchlistName || null);
      
      if (!watchlist.Symbols || watchlist.Symbols.length === 0) {
        console.log('[Watchlist] No symbols found in watchlist', watchlist.WatchlistID);
        setStocks([]);
        setLoading(false);
        return;
      }
      
      const watchlistColor = watchlist.Color || "#555555";
      
      // Parse SymbolIDs from watchlist (comma-separated string)
      const symbolIDsArray = watchlist.SymbolIDs 
        ? watchlist.SymbolIDs.split(',').map((id: string) => parseInt(id.trim())).filter((id: number) => !isNaN(id))
        : [];
      
      // Transform all symbols from the watchlist
      const transformedStocks = watchlist.Symbols.map((symbol: any, index: number) => {
        const stock = transformWatchlistSymbolToStock(symbol, watchlistColor);
        // Try to get SymbolID from parsed array (by index) or look up from availableSymbols
        if (symbolIDsArray[index]) {
          stock.symbolID = symbolIDsArray[index].toString();
        } else {
          // Fallback: look up from availableSymbols
          const found = availableSymbols.find(s => 
            s.symbol === symbol.Symbol || 
            s.symbol.replace(/\//g, '') === symbol.Symbol.replace(/\//g, '')
          );
          if (found && found.symbolID) {
            stock.symbolID = found.symbolID.toString();
          }
        }
        return stock;
      });
      
      console.log('[Watchlist] Transformed stocks:', transformedStocks);
      
      setStocks(transformedStocks);
      console.log('[Watchlist] Successfully loaded', transformedStocks.length, 'stocks');
      
    } catch (err) {
      console.error('[Watchlist] Error fetching watchlist data:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load watchlist data';
      setError(errorMessage);
      
      // Fallback to empty array - user will see error message
      setStocks([]);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings?.watchlistId]); // Only depend on watchlistId - callbacks are stable

  // Load data on mount and when watchlistId changes
  useEffect(() => {
    const currentWatchlistId = settings?.watchlistId;
    
    // Skip if we're already fetching
    if (isFetchingRef.current) {
      return;
    }
    
    // Skip if watchlistId hasn't changed
    if (hasFetchedRef.current && lastFetchedWatchlistIdRef.current === currentWatchlistId) {
      return;
    }
    
    // Mark as fetched and store the watchlistId
    hasFetchedRef.current = true;
    lastFetchedWatchlistIdRef.current = currentWatchlistId;
    
    fetchWatchlistData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings?.watchlistId]); // Only depend on watchlistId


  const handleDirectionChange = async (stock: Stock, direction: Direction) => {
    // Optimistically update UI
    setStocks(stocks.map(s => 
      s.symbol === stock.symbol ? { ...s, direction } : s
    ));

    // Update via API
    try {
      setIsSaving(true);
      await updateWatchlistSymbol({
        UpdateWatchlistSymbol: parseInt(stock.watchlistSymbolID),
        Field: "Direction",
        Val: direction === "Buy" ? "Long" : "Short", // API expects "Long" or "Short"
        WidgetID: getWidgetID(), // Add WidgetID (wgid)
      });
      console.log('[Watchlist] Direction updated successfully');
    } catch (err) {
      console.error('[Watchlist] Failed to update direction:', err);
      // Revert on error
      setStocks(stocks.map(s => 
        s.symbol === stock.symbol ? { ...s, direction: stock.direction } : s
      ));
      setError(err instanceof Error ? err.message : 'Failed to update direction');
    } finally {
      setIsSaving(false);
    }
  };

  const handleOrderTypeChange = async (stock: Stock, orderType: OrderType) => {
    // Optimistically update UI
    setStocks(stocks.map(s => 
      s.symbol === stock.symbol ? { ...s, orderType } : s
    ));

    // Update via API
    try {
      setIsSaving(true);
      await updateWatchlistSymbol({
        UpdateWatchlistSymbol: parseInt(stock.watchlistSymbolID),
        Field: "OrderType",
        Val: orderType,
        WidgetID: getWidgetID(), // Add WidgetID (wgid)
      });
      console.log('[Watchlist] Order type updated successfully');
    } catch (err) {
      console.error('[Watchlist] Failed to update order type:', err);
      // Revert on error
      setStocks(stocks.map(s => 
        s.symbol === stock.symbol ? { ...s, orderType: stock.orderType } : s
      ));
      setError(err instanceof Error ? err.message : 'Failed to update order type');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEntryPriceChange = async (stock: Stock, entryPrice: string) => {
    // Update via API (only if not empty and valid number)
    if (entryPrice.trim() === "") {
      // Allow clearing entry price
      try {
        setIsSaving(true);
        await updateWatchlistSymbol({
          UpdateWatchlistSymbol: parseInt(stock.watchlistSymbolID),
          Field: "Entry",
          Val: "",
          WidgetID: getWidgetID(), // Add WidgetID (wgid)
        });
        console.log('[Watchlist] Entry price cleared successfully');
      } catch (err) {
        console.error('[Watchlist] Failed to clear entry price:', err);
        setError(err instanceof Error ? err.message : 'Failed to clear entry price');
      } finally {
        setIsSaving(false);
      }
      return;
    }

    const numericValue = parseFloat(entryPrice);
    if (isNaN(numericValue)) {
      // Invalid number, revert to original
      setStocks(stocks.map(s => 
        s.symbol === stock.symbol ? { ...s, entryPrice: stock.entryPrice } : s
      ));
      return;
    }

    try {
      setIsSaving(true);
      await updateWatchlistSymbol({
        UpdateWatchlistSymbol: parseInt(stock.watchlistSymbolID),
        Field: "Entry",
        Val: numericValue,
        WidgetID: getWidgetID(), // Add WidgetID (wgid)
      });
      console.log('[Watchlist] Entry price updated successfully');
    } catch (err) {
      console.error('[Watchlist] Failed to update entry price:', err);
      // Revert on error
      setStocks(stocks.map(s => 
        s.symbol === stock.symbol ? { ...s, entryPrice: stock.entryPrice } : s
      ));
      setError(err instanceof Error ? err.message : 'Failed to update entry price');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSymbol = (stock: Stock) => {
    // Open confirmation dialog
    setSymbolToDelete(stock);
  };

  const confirmDeleteSymbol = async () => {
    const stock = symbolToDelete;
    if (!stock) return;

    if (!currentWatchlistId) {
      setError('Watchlist ID not available');
      setSymbolToDelete(null);
      return;
    }

    try {
      setIsSaving(true);
      
      // Get SymbolID from availableSymbols by matching symbol name
      let symbolID: number | null = null;
      const foundSymbol = availableSymbols.find(s => 
        s.symbol === stock.symbol || 
        s.symbol === stock.name ||
        s.symbol.replace(/\//g, '') === stock.symbol.replace(/\//g, '')
      );
      
      if (foundSymbol && foundSymbol.symbolID) {
        symbolID = foundSymbol.symbolID;
      } else {
        // Fallback: try to parse from stock.symbolID if it's a number
        const parsed = stock.symbolID ? parseInt(stock.symbolID) : null;
        if (parsed && !isNaN(parsed) && parsed > 0) {
          symbolID = parsed;
        }
      }
      
      if (!symbolID) {
        setError(`Symbol ID not found for ${stock.symbol}. Cannot delete.`);
        setIsSaving(false);
        return;
      }
      
      console.log('[Watchlist] Deleting symbol:', {
        symbol: stock.symbol,
        watchlistSymbolID: stock.watchlistSymbolID,
        symbolID: symbolID,
      });
      
      // Note: API uses WatchlistID field as WatchlistSymbolID in the query
      await deleteWatchlistSymbol({
        WatchlistID: parseInt(stock.watchlistSymbolID),
        SymbolID: symbolID,
        WidgetID: getWidgetID(), // Add WidgetID (wgid)
      });
      
      // Remove from UI immediately for better UX
      setStocks(stocks.filter(s => s.symbol !== stock.symbol));
      
      // Refresh data to ensure sync
      await fetchWatchlistData();
      
      console.log('[Watchlist] Symbol deleted successfully');
      setSymbolToDelete(null);
    } catch (err) {
      console.error('[Watchlist] Failed to delete symbol:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete symbol');
      // Refresh to restore correct state on error
      await fetchWatchlistData();
      setSymbolToDelete(null);
    } finally {
      setIsSaving(false);
    }
  };

  const cancelDeleteSymbol = () => {
    setSymbolToDelete(null);
  };

  // Fetch symbols from API for autocomplete
  const [availableSymbols, setAvailableSymbols] = useState<Array<{ symbol: string; symbolID: number | null; name: string | null }>>([]);
  const [symbolsLoading, setSymbolsLoading] = useState(false);

  // Helper function to normalize symbol for matching (remove slashes, uppercase)
  const normalizeSymbolForMatching = (symbol: string): string => {
    return symbol.replace(/\//g, '').toUpperCase().trim();
  };

  // Fetch symbols from API on mount
  useEffect(() => {
    const fetchSymbols = async () => {
      setSymbolsLoading(true);
      try {
        // Fetch from multiple modules
        const modules = ['Forex', 'Stocks', 'Commodities', 'Indices'];
        const allSymbols: Array<{ symbol: string; symbolID: number | null; name: string | null }> = [];
        
        for (const module of modules) {
          try {
            const response = await fetch('/api/pmt/get-symbols', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({ Module: module }),
            });
            
            if (response.ok) {
              const result = await response.json();
              console.log(`[Watchlist] Fetched symbols for ${module}:`, {
                success: result.success,
                hasData: !!result.data,
                hasSymbolData: !!result.data?.symbolData,
                symbolDataLength: result.data?.symbolData?.length || 0,
              });
              
              if (result.success && result.data?.symbolData) {
                // Filter and validate symbols with IDs
                const symbolsWithIDs = result.data.symbolData
                  .filter((item: any) => {
                    const hasValidID = item.symbolID !== null && 
                                      item.symbolID !== undefined && 
                                      !isNaN(Number(item.symbolID)) &&
                                      Number(item.symbolID) > 0;
                    const hasSymbol = item.symbol && typeof item.symbol === 'string' && item.symbol.trim().length > 0;
                    return hasValidID && hasSymbol;
                  })
                  .map((item: any) => ({
                    symbol: item.symbol.trim(),
                    symbolID: Number(item.symbolID),
                    name: item.name || item.symbol,
                  }));
                
                console.log(`[Watchlist] Valid symbols with IDs for ${module}:`, symbolsWithIDs.length);
                if (symbolsWithIDs.length > 0) {
                  allSymbols.push(...symbolsWithIDs);
                }
              } else {
                console.warn(`[Watchlist] Invalid response structure for ${module}:`, result);
              }
            } else {
              const errorText = await response.text().catch(() => 'Unknown error');
              console.warn(`[Watchlist] Failed to fetch symbols for ${module}:`, response.status, errorText);
            }
          } catch (err) {
            console.warn(`[Watchlist] Error fetching symbols for ${module}:`, err);
          }
        }
        
        // Remove duplicates (by symbol name, case-insensitive)
        const uniqueSymbols = allSymbols.reduce((acc, current) => {
          const normalized = normalizeSymbolForMatching(current.symbol);
          if (!acc.find(item => normalizeSymbolForMatching(item.symbol) === normalized)) {
            acc.push(current);
          }
          return acc;
        }, [] as typeof allSymbols);
        
        console.log('[Watchlist] Total unique symbols with IDs loaded:', uniqueSymbols.length);
        if (uniqueSymbols.length === 0) {
          console.warn('[Watchlist] No symbols with valid IDs were loaded. Symbol autocomplete and manual add may not work.');
        }
        setAvailableSymbols(uniqueSymbols);
      } catch (err) {
        console.error('[Watchlist] Error fetching symbols:', err);
        setError('Failed to load symbols. Please refresh the page.');
      } finally {
        setSymbolsLoading(false);
      }
    };
    
    fetchSymbols();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle symbol input change for autocomplete
  const handleSymbolInputChange = (value: string) => {
    setNewSymbolInput(value);
    
    if (value.trim().length > 0) {
      // First try to filter from API symbols
      let filtered: Array<{ symbol: string; name: string; logo: string; logoColor: string; symbolID?: number | null }> = [];
      
      if (availableSymbols.length > 0) {
        filtered = availableSymbols
          .filter(item => 
            item.symbol?.toLowerCase().includes(value.toLowerCase()) ||
            item.name?.toLowerCase().includes(value.toLowerCase())
          )
          .slice(0, 10)
          .map(item => {
            const dbItem = SYMBOL_DATABASE.find(db => db.symbol === item.symbol);
            return {
              symbol: item.symbol,
              name: item.name || dbItem?.name || item.symbol,
              logo: dbItem?.logo || item.symbol.charAt(0),
              logoColor: dbItem?.logoColor || "#555555",
              symbolID: item.symbolID,
            };
          });
      }
      
      // Fallback to local database if API symbols not available or no matches
      // BUT: Only show these if they have Symbol IDs from API, otherwise warn user
      if (filtered.length === 0) {
        const fallbackSymbols = SYMBOL_DATABASE.filter(item => 
          item.symbol.toLowerCase().includes(value.toLowerCase()) ||
          item.name.toLowerCase().includes(value.toLowerCase())
        ).slice(0, 10);
        
        // Try to match fallback symbols with API symbols by symbol name
        const matchedSymbols = fallbackSymbols.map(fallback => {
          // Try to find matching symbol in availableSymbols (case-insensitive, with/without slashes)
          const normalizedFallback = fallback.symbol.replace(/\//g, '').toUpperCase();
          const apiMatch = availableSymbols.find(api => 
            api.symbol.replace(/\//g, '').toUpperCase() === normalizedFallback
          );
          
          if (apiMatch && apiMatch.symbolID) {
            return {
              ...fallback,
              symbolID: apiMatch.symbolID,
              name: apiMatch.name || fallback.name,
            };
          }
          
          return { ...fallback, symbolID: null };
        });
        
        filtered = matchedSymbols;
      }
      
      // Log suggestions with their Symbol IDs for debugging
      if (filtered.length > 0) {
        console.log('[Watchlist] Symbol suggestions for "' + value + '":', filtered.map(f => ({
          symbol: f.symbol,
          symbolID: f.symbolID,
          hasSymbolID: !!f.symbolID
        })));
      }
      
      setSymbolSuggestions(filtered as any);
      setShowSuggestions(filtered.length > 0);
    } else {
      setSymbolSuggestions([]);
      setShowSuggestions(false);
    }
  };

  // Handle adding symbol from suggestion
  const handleAddSymbolFromSuggestion = async (selectedSymbol: { symbol: string; name: string; logo: string; logoColor: string; symbolID?: number | null }) => {
    if (!currentWatchlistId) {
      setError('Watchlist ID not available. Please wait for watchlist to load.');
      return;
    }

    // Check if symbol already exists
    if (stocks.some(s => s.symbol === selectedSymbol.symbol)) {
      setError(`${selectedSymbol.symbol} is already in the watchlist`);
      setTimeout(() => setError(null), 3000);
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      
      // Check if we have Symbol ID
      if (!selectedSymbol.symbolID || selectedSymbol.symbolID === null || selectedSymbol.symbolID === undefined) {
        console.error('[Watchlist] No Symbol ID for symbol:', selectedSymbol);
        setError(`Symbol ID not found for ${selectedSymbol.symbol}. This symbol may not be available in the API. Please try selecting a symbol from the suggestions that have Symbol IDs.`);
        setTimeout(() => setError(null), 5000);
        return;
      }
      
      // Validate Symbol ID is a valid number
      const symbolIDNum = Number(selectedSymbol.symbolID);
      if (isNaN(symbolIDNum) || symbolIDNum <= 0) {
        console.error('[Watchlist] Invalid Symbol ID:', selectedSymbol.symbolID);
        setError(`Invalid Symbol ID for ${selectedSymbol.symbol}. Please try a different symbol.`);
        setTimeout(() => setError(null), 5000);
        return;
      }
      
      console.log('[Watchlist] Adding symbol:', {
        symbol: selectedSymbol.symbol,
        symbolID: symbolIDNum,
        symbolIDType: typeof selectedSymbol.symbolID,
        watchlistId: currentWatchlistId,
      });
      
      // Get existing Symbol IDs from current watchlist to append, not replace
      let existingSymbolIDs: string[] = [];
      try {
        const currentWatchlistResponse = await getWatchlists(currentWatchlistId.toString());
        if (currentWatchlistResponse && currentWatchlistResponse.Watchlists && currentWatchlistResponse.Watchlists.length > 0) {
          const currentWatchlist = currentWatchlistResponse.Watchlists.find(
            (w: any) => w.WatchlistID?.toString() === currentWatchlistId.toString()
          ) || currentWatchlistResponse.Watchlists[0];
          
          if (currentWatchlist && currentWatchlist.SymbolIDs) {
            // Parse existing Symbol IDs from comma-separated string
            existingSymbolIDs = currentWatchlist.SymbolIDs.split(',')
              .map((id: string) => id.trim())
              .filter((id: string) => id && id.length > 0);
            console.log('[Watchlist] Found existing Symbol IDs:', existingSymbolIDs);
          }
        }
      } catch (err) {
        console.warn('[Watchlist] Could not fetch existing symbols, will append anyway:', err);
      }
      
      // Combine existing Symbol IDs with the new one (avoid duplicates)
      const allSymbolIDs = [...new Set([...existingSymbolIDs, symbolIDNum.toString()])];
      const symbolsString = allSymbolIDs.join(',');
      
      // Save symbol to watchlist via API
      // IMPORTANT: The API expects Symbol IDs in the Symbols field, not symbol names
      // We send ALL Symbol IDs (existing + new) to append, not replace
      const requestPayload: any = {
        SaveWatchlistSymbols: parseInt(currentWatchlistId),
        Symbols: symbolsString, // Comma-separated Symbol IDs (e.g., "2,3") - includes existing + new
        WidgetID: getWidgetID(), // Add WidgetID (wgid)
      };
      
      console.log('[Watchlist] API request payload:', JSON.stringify(requestPayload, null, 2));
      console.log('[Watchlist] Adding symbol from suggestion:', {
        symbolName: selectedSymbol.symbol,
        symbolID: symbolIDNum,
        existingSymbolIDs,
        allSymbolIDs,
        watchlistId: currentWatchlistId,
        widgetID: getWidgetID(),
        note: 'API expects Symbol IDs in Symbols field, sending all (existing + new) to append',
      });
      
      await saveWatchlistSymbols(requestPayload);
      
      console.log('[Watchlist] Symbol added successfully:', selectedSymbol.symbol);
      
      // Refresh watchlist data to show the new symbol
      // Force refresh using currentWatchlistId to ensure we get the updated data
      if (currentWatchlistId) {
        const response = await getWatchlists(currentWatchlistId.toString());
        if (response && response.Watchlists && response.Watchlists.length > 0) {
          const watchlist = response.Watchlists.find(
            (w: any) => w.WatchlistID?.toString() === currentWatchlistId.toString()
          ) || response.Watchlists[0];
          
          if (watchlist) {
            const watchlistColor = watchlist.Color || "#555555";
            
            if (watchlist.Symbols && watchlist.Symbols.length > 0) {
              // Parse SymbolIDs from watchlist (comma-separated string)
              const symbolIDsArray = watchlist.SymbolIDs 
                ? watchlist.SymbolIDs.split(',').map((id: string) => parseInt(id.trim())).filter((id: number) => !isNaN(id))
                : [];
              
              const transformedStocks = watchlist.Symbols.map((symbol: any, index: number) => {
                const stock = transformWatchlistSymbolToStock(symbol, watchlistColor);
                // Try to get SymbolID from parsed array (by index) or look up from availableSymbols
                if (symbolIDsArray[index]) {
                  stock.symbolID = symbolIDsArray[index].toString();
                } else {
                  // Fallback: look up from availableSymbols
                  const found = availableSymbols.find(s => 
                    s.symbol === symbol.Symbol || 
                    s.symbol.replace(/\//g, '') === symbol.Symbol.replace(/\//g, '')
                  );
                  if (found && found.symbolID) {
                    stock.symbolID = found.symbolID.toString();
                  }
                }
                return stock;
              });
              setStocks(transformedStocks);
              console.log('[Watchlist] Refreshed watchlist with', transformedStocks.length, 'symbols after adding');
            } else {
              setStocks([]);
            }
          }
        }
      } else {
        // Fallback to full refresh if currentWatchlistId is not available
        await fetchWatchlistData();
      }
      
      // Close add UI
      setIsAddingSymbol(false);
      setNewSymbolInput("");
      setShowSuggestions(false);
      
    } catch (err) {
      console.error('[Watchlist] Failed to add symbol:', err);
      setError(err instanceof Error ? err.message : 'Failed to add symbol');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle manual symbol add (when user types and presses Enter)
  const handleAddSymbol = async () => {
    if (!newSymbolInput.trim()) {
      return;
    }

    if (!currentWatchlistId) {
      setError('Watchlist ID not available. Please wait for watchlist to load.');
      return;
    }

    const symbolInput = newSymbolInput.trim().toUpperCase();
    const normalizedInput = normalizeSymbolForMatching(symbolInput);
    
    // Check if symbol already exists (normalize for comparison)
    if (stocks.some(s => normalizeSymbolForMatching(s.symbol) === normalizedInput)) {
      setError(`${symbolInput} is already in the watchlist`);
      setTimeout(() => setError(null), 3000);
      return;
    }

    // Try to find the symbol in available symbols (with normalization)
    // First try exact match, then normalized match
    let foundSymbol = availableSymbols.find(s => 
      s.symbol === symbolInput || 
      s.symbol.toUpperCase() === symbolInput ||
      normalizeSymbolForMatching(s.symbol) === normalizedInput
    );
    
    // If still not found, try case-insensitive match
    if (!foundSymbol) {
      foundSymbol = availableSymbols.find(s => 
        s.symbol.toUpperCase() === symbolInput.toUpperCase() ||
        normalizeSymbolForMatching(s.symbol) === normalizedInput
      );
    }
    
    if (!foundSymbol || !foundSymbol.symbolID) {
      setError(`Symbol "${symbolInput}" not found or Symbol ID unavailable. Please select from suggestions.`);
      setTimeout(() => setError(null), 5000);
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      
      // Use the actual symbol format from API (not the normalized input)
      const symbolToSend = foundSymbol.symbol;
      
      // Validate Symbol ID
      const symbolIDNum = Number(foundSymbol.symbolID);
      if (isNaN(symbolIDNum) || symbolIDNum <= 0) {
        console.error('[Watchlist] Invalid Symbol ID:', foundSymbol.symbolID);
        setError(`Invalid Symbol ID for ${symbolToSend}. Please try a different symbol.`);
        setTimeout(() => setError(null), 5000);
        return;
      }
      
      // Get existing Symbol IDs from current watchlist to append, not replace
      let existingSymbolIDs: string[] = [];
      try {
        const currentWatchlistResponse = await getWatchlists(currentWatchlistId.toString());
        if (currentWatchlistResponse && currentWatchlistResponse.Watchlists && currentWatchlistResponse.Watchlists.length > 0) {
          const currentWatchlist = currentWatchlistResponse.Watchlists.find(
            (w: any) => w.WatchlistID?.toString() === currentWatchlistId.toString()
          ) || currentWatchlistResponse.Watchlists[0];
          
          if (currentWatchlist && currentWatchlist.SymbolIDs) {
            // Parse existing Symbol IDs from comma-separated string
            existingSymbolIDs = currentWatchlist.SymbolIDs.split(',')
              .map((id: string) => id.trim())
              .filter((id: string) => id && id.length > 0);
            console.log('[Watchlist] Found existing Symbol IDs:', existingSymbolIDs);
          }
        }
      } catch (err) {
        console.warn('[Watchlist] Could not fetch existing symbols, will append anyway:', err);
      }
      
      // Combine existing Symbol IDs with the new one (avoid duplicates)
      const allSymbolIDs = [...new Set([...existingSymbolIDs, symbolIDNum.toString()])];
      const symbolsString = allSymbolIDs.join(',');
      
      // Save symbol to watchlist via API
      // IMPORTANT: The API expects Symbol IDs in the Symbols field, not symbol names
      // We send ALL Symbol IDs (existing + new) to append, not replace
      const requestPayload: any = {
        SaveWatchlistSymbols: parseInt(currentWatchlistId),
        Symbols: symbolsString, // Comma-separated Symbol IDs (e.g., "2,3") - includes existing + new
        WidgetID: getWidgetID(), // Add WidgetID (wgid)
      };
      
      console.log('[Watchlist] Manual add API request payload:', JSON.stringify(requestPayload, null, 2));
      console.log('[Watchlist] Adding symbol:', {
        input: symbolInput,
        normalized: normalizedInput,
        symbolName: symbolToSend,
        symbolID: symbolIDNum,
        existingSymbolIDs,
        allSymbolIDs,
        watchlistId: currentWatchlistId,
        note: 'API expects Symbol IDs in Symbols field, sending all (existing + new) to append',
      });
      
      await saveWatchlistSymbols(requestPayload);
      
      console.log('[Watchlist] Symbol added successfully:', symbolToSend);
      
      // Refresh watchlist data to show the new symbol
      // Force refresh using currentWatchlistId to ensure we get the updated data
      if (currentWatchlistId) {
        const response = await getWatchlists(currentWatchlistId.toString());
        if (response && response.Watchlists && response.Watchlists.length > 0) {
          const watchlist = response.Watchlists.find(
            (w: any) => w.WatchlistID?.toString() === currentWatchlistId.toString()
          ) || response.Watchlists[0];
          
          if (watchlist) {
            const watchlistColor = watchlist.Color || "#555555";
            
            if (watchlist.Symbols && watchlist.Symbols.length > 0) {
              // Parse SymbolIDs from watchlist (comma-separated string)
              const symbolIDsArray = watchlist.SymbolIDs 
                ? watchlist.SymbolIDs.split(',').map((id: string) => parseInt(id.trim())).filter((id: number) => !isNaN(id))
                : [];
              
              const transformedStocks = watchlist.Symbols.map((symbol: any, index: number) => {
                const stock = transformWatchlistSymbolToStock(symbol, watchlistColor);
                // Try to get SymbolID from parsed array (by index) or look up from availableSymbols
                if (symbolIDsArray[index]) {
                  stock.symbolID = symbolIDsArray[index].toString();
                } else {
                  // Fallback: look up from availableSymbols
                  const found = availableSymbols.find(s => 
                    s.symbol === symbol.Symbol || 
                    s.symbol.replace(/\//g, '') === symbol.Symbol.replace(/\//g, '')
                  );
                  if (found && found.symbolID) {
                    stock.symbolID = found.symbolID.toString();
                  }
                }
                return stock;
              });
              setStocks(transformedStocks);
              console.log('[Watchlist] Refreshed watchlist with', transformedStocks.length, 'symbols after adding');
            } else {
              setStocks([]);
            }
          }
        }
      } else {
        // Fallback to full refresh if currentWatchlistId is not available
        await fetchWatchlistData();
      }
      
      // Close add UI
      setIsAddingSymbol(false);
      setNewSymbolInput("");
      setShowSuggestions(false);
      
    } catch (err) {
      console.error('[Watchlist] Failed to add symbol:', err);
      setError(err instanceof Error ? err.message : 'Failed to add symbol');
    } finally {
      setIsSaving(false);
    }
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionRef.current && !suggestionRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    if (showSuggestions) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showSuggestions]);

  const handleStatusChange = (symbol: string, status: Status) => {
    setStocks(stocks.map(stock => 
      stock.symbol === symbol ? { ...stock, status } : stock
    ));
  };

  const getStatusColor = (status: Status) => {
    switch (status) {
      case "Active":
        return "text-green-500";
      case "Pending":
        return "text-amber-500";
      case "Idea":
        return "text-blue-500";
      default:
        return "text-muted-foreground";
    }
  };

  const getRowBackground = (status: Status) => {
    if (status === "Active") {
      return "bg-green-500/10";
    }
    return "";
  };

  return (
    <div className="w-full h-full bg-widget-body border border-border rounded-none flex flex-col">
      {/* Header */}
      <WidgetHeader 
        title={
          currentWatchlistName 
            ? <span>Watchlist <span className="text-muted-foreground">|</span> <span className="text-primary">{currentWatchlistName}</span></span>
            : <span>Watchlist</span>
        }
        widgetName="Watchlist"
        onSettings={onSettings}
        onRemove={onRemove}
        onFullscreen={onFullscreen}
      >
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-7 px-2 mr-2 text-muted-foreground hover:text-foreground"
          onClick={() => setIsAddingSymbol(true)}
          disabled={isSaving || loading}
        >
          <Plus className="w-4 h-4 mr-1" />
          Add
        </Button>
      </WidgetHeader>
      
      {/* Column Headers */}
      <div className="grid grid-cols-[minmax(140px,1fr)_90px_140px_70px_90px_90px_130px_100px_40px] gap-3 px-4 py-2 border-b border-border text-muted-foreground bg-widget-header text-base font-semibold">
        <div>Symbol</div>
        <div className="text-right">Price</div>
        <div className="text-right">Change</div>
        <div className="text-right">Volume</div>
        <div>Status</div>
        <div>Direction</div>
        <div>Order Type</div>
        <div>Entry Price</div>
        <div></div>
      </div>

      {/* Watchlist Content */}
      <div className="flex-1 overflow-auto">
        {/* Add Symbol Row */}
        {isAddingSymbol && (
          <div className="grid grid-cols-[minmax(140px,1fr)_90px_140px_70px_90px_90px_130px_100px_40px] gap-3 px-4 py-3 bg-primary/10 border-b border-primary relative">
            <div className="flex items-center gap-2 relative">
              <Input
                type="text"
                value={newSymbolInput}
                onChange={(e) => handleSymbolInputChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isSaving) {
                    handleAddSymbol();
                  } else if (e.key === "Escape") {
                    setIsAddingSymbol(false);
                    setNewSymbolInput("");
                    setShowSuggestions(false);
                  } else if (e.key === "ArrowDown" && symbolSuggestions.length > 0) {
                    e.preventDefault();
                    // Could implement keyboard navigation here
                  }
                }}
                placeholder="Type symbol name..."
                className="h-8 bg-widget-header border-primary text-base"
                autoFocus
                disabled={isSaving}
              />
              {showSuggestions && symbolSuggestions.length > 0 && (
                <div
                  ref={suggestionRef}
                  className="absolute top-full left-0 z-50 bg-widget-body border border-primary rounded mt-1 w-[400px] max-h-64 overflow-y-auto shadow-lg"
                  onMouseDown={(e) => {
                    // Prevent input blur from closing dropdown before click registers
                    e.preventDefault();
                  }}
                >
                  {symbolSuggestions.map((item: any) => (
                    <div
                      key={item.symbol}
                      className="p-2 cursor-pointer hover:bg-primary/10 border-b border-border/30 last:border-0 transition-colors"
                      onClick={async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        // Immediately save when dropdown option is selected
                        await handleAddSymbolFromSuggestion(item);
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white shrink-0 text-sm font-semibold"
                          style={{ backgroundColor: item.logoColor }}
                        >
                          {item.logo || item.symbol.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-foreground text-sm font-medium truncate">{item.symbol}</div>
                          <div className="text-muted-foreground text-xs truncate">{item.name}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="col-span-7 flex items-center gap-2">
              <Button
                size="sm"
                onClick={handleAddSymbol}
                disabled={isSaving || !newSymbolInput.trim()}
                className="h-8 px-3 bg-primary hover:bg-primary/90 text-sm"
              >
                Add
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setIsAddingSymbol(false);
                  setNewSymbolInput("");
                  setShowSuggestions(false);
                }}
                disabled={isSaving}
                className="h-8 px-2 text-sm"
              >
                Cancel
              </Button>
            </div>
            <div></div>
          </div>
        )}
        
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Loading watchlist...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full py-12">
            <div className="flex flex-col items-center gap-3 px-4 max-w-md">
              <p className="text-base text-destructive text-center font-medium">{error}</p>
              <p className="text-xs text-muted-foreground text-center">
                Check the browser console for more details
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchWatchlistData}
                className="text-sm mt-2"
              >
                Retry
              </Button>
            </div>
          </div>
        ) : stocks.length === 0 ? (
          <div className="flex items-center justify-center h-full min-h-[200px] py-12">
            <div className="flex flex-col items-center gap-3 px-4 text-center">
              <p className="text-base font-medium text-foreground">No watchlist items found</p>
              <p className="text-sm text-muted-foreground max-w-sm">
                Your watchlist is empty. Add symbols to your watchlist to see them here.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // TODO: Implement add symbol functionality
                  console.log('[Watchlist] Add button clicked');
                }}
                className="mt-2"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Symbol
              </Button>
            </div>
          </div>
        ) : (
          stocks.map((stock, index) => (
          <div 
            key={stock.symbol}
            className={`grid grid-cols-[minmax(140px,1fr)_90px_140px_70px_90px_90px_130px_100px_40px] gap-3 px-4 py-3 hover:bg-muted/50 border-b border-border/50 last:border-0 items-center cursor-pointer transition-colors group ${
              index % 2 === 0 ? 'bg-[#22c55e]/5' : 'bg-black'
            }`}
          >
            <div className="flex items-center gap-2">
              <div 
                className="w-8 h-8 rounded-full flex items-center justify-center text-white shrink-0 text-lg font-semibold"
                style={{ backgroundColor: stock.logoColor }}
              >
                {stock.logo || stock.symbol.charAt(0)}
              </div>
              <div>
                <div className="text-foreground text-base font-medium">{stock.symbol}</div>
                <div className="text-muted-foreground text-sm">{stock.name}</div>
              </div>
            </div>
            
            <div className="text-right text-foreground whitespace-nowrap text-base">
              ${stock.price.toFixed(2)}
            </div>
            
            <div className={`text-right flex items-center gap-1 justify-end whitespace-nowrap text-base ${
              stock.change >= 0 ? 'text-green-500' : 'text-red-500'
            }`}>
              {stock.change >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              {stock.change >= 0 ? '+' : ''}{stock.change.toFixed(2)} ({stock.changePercent.toFixed(2)}%)
            </div>
            
            <div className="text-right text-muted-foreground whitespace-nowrap text-base">
              {stock.volume}
            </div>
            
            <Select 
              value={stock.status} 
              onValueChange={(value: Status) => handleStatusChange(stock.symbol, value)}
            >
              <SelectTrigger className="h-8 !bg-black border-border/50 text-base">
                <span className={getStatusColor(stock.status)}>{stock.status}</span>
              </SelectTrigger>
              <SelectContent className="!bg-black">
                <SelectItem value="Pending" className="!bg-black hover:!bg-black/80">
                  <span className="text-amber-500">Pending</span>
                </SelectItem>
                <SelectItem value="Idea" className="!bg-black hover:!bg-black/80">
                  <span className="text-blue-500">Idea</span>
                </SelectItem>
                <SelectItem value="Active" className="!bg-black hover:!bg-black/80">
                  <span className="text-green-500">Active</span>
                </SelectItem>
              </SelectContent>
            </Select>
            
            <Select 
              value={stock.direction} 
              onValueChange={(value: Direction) => handleDirectionChange(stock, value)}
              disabled={isSaving}
            >
              <SelectTrigger className="h-8 !bg-black border-border/50 text-base">
                <div className="flex items-center gap-2">
                  {stock.direction === "Buy" ? (
                    <TrendingUp className="w-4 h-4 text-green-500" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-500" />
                  )}
                  <span>{stock.direction}</span>
                </div>
              </SelectTrigger>
              <SelectContent className="!bg-black">
                <SelectItem value="Buy" className="!bg-black hover:!bg-black/80">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-green-500" />
                    <span>Buy</span>
                  </div>
                </SelectItem>
                <SelectItem value="Sell" className="!bg-black hover:!bg-black/80">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="w-4 h-4 text-red-500" />
                    <span>Sell</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            
            <Select 
              value={stock.orderType} 
              onValueChange={(value: OrderType) => handleOrderTypeChange(stock, value)}
              disabled={isSaving}
            >
              <SelectTrigger className="h-8 !bg-black border-border/50 text-base">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="!bg-black">
                <SelectItem value="Market" className="!bg-black hover:!bg-black/80">Market</SelectItem>
                <SelectItem value="Buy Limit" className="!bg-black hover:!bg-black/80">Buy Limit</SelectItem>
                <SelectItem value="Sell Limit" className="!bg-black hover:!bg-black/80">Sell Limit</SelectItem>
                <SelectItem value="Buy Stop" className="!bg-black hover:!bg-black/80">Buy Stop</SelectItem>
                <SelectItem value="Sell Stop" className="!bg-black hover:!bg-black/80">Sell Stop</SelectItem>
              </SelectContent>
            </Select>
            
            <div className="flex items-center gap-1">
            <Input
              type="text"
              value={stock.entryPrice}
                onChange={(e) => {
                  // Update locally immediately for better UX
                  setStocks(stocks.map(s => 
                    s.symbol === stock.symbol ? { ...s, entryPrice: e.target.value } : s
                  ));
                }}
                onBlur={(e) => {
                  // Save on blur if value changed
                  if (e.target.value !== stock.entryPrice) {
                    handleEntryPriceChange(stock, e.target.value);
                  }
                }}
              placeholder={stock.orderType === "Market" ? "—" : "0.00"}
                disabled={stock.orderType === "Market" || isSaving}
                className="h-8 bg-widget-header border-border/50 text-foreground disabled:opacity-50 text-base flex-1"
              />
            </div>
            
            {/* Delete Button */}
            <div className="flex items-center justify-center">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => handleDeleteSymbol(stock)}
                disabled={isSaving}
                title="Remove symbol from watchlist"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
          ))
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={symbolToDelete !== null}
        onClose={cancelDeleteSymbol}
        onConfirm={confirmDeleteSymbol}
        title="Remove Symbol"
        message={symbolToDelete ? `Are you sure you want to remove "${symbolToDelete.symbol}" from the watchlist? This action cannot be undone.` : ''}
        confirmText="Remove"
        cancelText="Cancel"
        isLoading={isSaving}
        sharpCorners
      />
    </div>
  );
}

