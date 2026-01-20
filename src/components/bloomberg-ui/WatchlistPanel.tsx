"use client";

import { X, Plus, TrendingUp, TrendingDown, Loader2, Settings2, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { useState, useEffect, useCallback, useRef } from "react";
import { 
  getWatchlists, 
  saveWatchlistSymbols,
  deleteWatchlistSymbol,
  updateWatchlistSymbol,
  type WatchlistSymbol, 
  type Watchlist 
} from "../widgets/utilities/Watchlist/api";

interface WatchlistPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

interface WatchlistItem {
  id: string;
  symbol: string;
  fullName: string;
  atPrice: string;
  currPrice: string;
  change: string;
  changePercent: string;
  direction: "Buy" | "Sell";
  orderType: "Market" | "Buy Limit" | "Sell Limit" | "Buy Stop" | "Sell Stop";
  entryPrice: string;
  status: "Pending" | "Idea" | "Active";
  watchlistSymbolID: string;
  symbolID?: string;
}

type OrderType = "Market" | "Buy Limit" | "Sell Limit" | "Buy Stop" | "Sell Stop";
type Direction = "Buy" | "Sell";
type Status = "Pending" | "Idea" | "Active";

// Helper function to map OrderType from API
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
  return "Market";
};

// Helper function to map Direction from API
const mapDirection = (direction: string): Direction => {
  if (!direction || direction.trim() === "") {
    return "Buy";
  }
  const normalized = direction.toLowerCase().trim();
  if (normalized === "sell" || normalized === "short") {
    return "Sell";
  }
  return "Buy";
};

// Helper function to get symbol name from symbol code
const getSymbolName = (symbol: string): string => {
  if (symbol.length === 6 && !symbol.includes("/")) {
    return `${symbol.substring(0, 3)}/${symbol.substring(3, 6)}`;
  }
  if (symbol.includes("/")) {
    return symbol;
  }
  return symbol;
};

// Transform API data to WatchlistItem interface
const transformWatchlistSymbolToItem = (symbol: WatchlistSymbol): WatchlistItem => {
  const currentPrice = symbol.CurrentPrice || 0;
  const addedAtPrice = symbol.AddedAtPrice || 0;
  const change = currentPrice - addedAtPrice;
  const changePercent = addedAtPrice !== 0 ? (change / addedAtPrice) * 100 : 0;
  
  const symbolName = getSymbolName(symbol.Symbol);
  
  return {
    id: symbol.WatchlistSymbolID,
    symbol: symbolName,
    fullName: symbol.Symbol,
    atPrice: addedAtPrice.toFixed(4),
    currPrice: currentPrice.toFixed(4),
    change: `${change >= 0 ? "+" : ""}${change.toFixed(4)}`,
    changePercent: `${changePercent >= 0 ? "+" : ""}${changePercent.toFixed(2)}%`,
    direction: mapDirection(symbol.Direction),
    orderType: mapOrderType(symbol.OrderType),
    entryPrice: symbol.Entry || "",
    status: "Active" as Status,
    watchlistSymbolID: symbol.WatchlistSymbolID,
    symbolID: symbol.SymbolUrl || symbol.Symbol,
  };
};

export function WatchlistPanel({ isOpen, onClose }: WatchlistPanelProps) {
  const [allWatchlists, setAllWatchlists] = useState<Watchlist[]>([]);

  // Notify other panels when opening
  useEffect(() => {
    if (isOpen) {
      window.dispatchEvent(new CustomEvent('panel-opening', { detail: { panel: 'watchlist' } }));
    }
  }, [isOpen]);

  // Listen for other panels opening
  useEffect(() => {
    const handlePanelOpening = (event: Event) => {
      const customEvent = event as CustomEvent<{ panel: string }>;
      if (customEvent.detail.panel !== 'watchlist' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('panel-opening', handlePanelOpening);
    return () => window.removeEventListener('panel-opening', handlePanelOpening);
  }, [isOpen, onClose]);
  const [selectedWatchlistId, setSelectedWatchlistId] = useState<string | null>(null);
  const [watchlistItems, setWatchlistItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [isSettingsClosing, setIsSettingsClosing] = useState(false);
  const [isSettingsAnimating, setIsSettingsAnimating] = useState(true); // Start as true so element always starts off-screen
  const [showOverlay, setShowOverlay] = useState(false);

  // Handle opening animation - ensure element starts off-screen, then animates in
  useEffect(() => {
    if (showSettings && !isSettingsClosing) {
      // Element is now in DOM, start off-screen
      setIsSettingsAnimating(true);
      // Animate in immediately
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsSettingsAnimating(false);
          // Show overlay when panel animation starts (same time or slightly after)
          setShowOverlay(true);
        });
      });
    }
    // Reset when closing
    if (!showSettings) {
      setIsSettingsAnimating(true);
      // Keep overlay visible during closing animation, then remove
      setTimeout(() => {
        setShowOverlay(false);
      }, 150); // Remove after fade-out completes
    }
  }, [showSettings, isSettingsClosing]);
  const [isAddSymbolOpen, setIsAddSymbolOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedSymbol, setExpandedSymbol] = useState<string | null>(null);
  const [newSymbolInput, setNewSymbolInput] = useState("");
  
  // Available symbols for autocomplete
  const [availableSymbols, setAvailableSymbols] = useState<Array<{ symbol: string; symbolID: number | null; name: string | null }>>([]);
  const [symbolSuggestions, setSymbolSuggestions] = useState<typeof availableSymbols>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionRef = useRef<HTMLDivElement>(null);

  // Helper function to normalize symbol for matching
  const normalizeSymbolForMatching = (symbol: string): string => {
    return symbol.replace(/\//g, '').toUpperCase().trim();
  };

  // Fetch symbols from API for autocomplete
  useEffect(() => {
    const fetchSymbols = async () => {
      try {
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
              if (result.success && result.data?.symbolData) {
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
                
                if (symbolsWithIDs.length > 0) {
                  allSymbols.push(...symbolsWithIDs);
                }
              }
            }
          } catch (err) {
            console.warn(`[WatchlistPanel] Error fetching symbols for ${module}:`, err);
          }
        }
        
        const uniqueSymbols = allSymbols.reduce((acc, current) => {
          const normalized = normalizeSymbolForMatching(current.symbol);
          if (!acc.find(item => normalizeSymbolForMatching(item.symbol) === normalized)) {
            acc.push(current);
          }
          return acc;
        }, [] as typeof allSymbols);
        
        setAvailableSymbols(uniqueSymbols);
      } catch (err) {
        console.error('[WatchlistPanel] Error fetching symbols:', err);
      }
    };
    
    if (isOpen) {
      fetchSymbols();
    }
  }, [isOpen]);

  // Fetch all watchlists
  const fetchAllWatchlists = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await getWatchlists("-1");
      
      if (!response || !response.Watchlists || response.Watchlists.length === 0) {
        setAllWatchlists([]);
        setWatchlistItems([]);
        setSelectedWatchlistId(null);
        setLoading(false);
        return;
      }
      
      setAllWatchlists(response.Watchlists);
      
      // Select first watchlist with symbols, or first watchlist
      let watchlistToSelect = response.Watchlists.find(
        (w: Watchlist) => w.Symbols && Array.isArray(w.Symbols) && w.Symbols.length > 0
      ) || response.Watchlists[0];
      
      if (watchlistToSelect) {
        setSelectedWatchlistId(watchlistToSelect.WatchlistID);
        loadWatchlistItems(watchlistToSelect);
      } else {
        setSelectedWatchlistId(null);
        setWatchlistItems([]);
      }
    } catch (err) {
      console.error('[WatchlistPanel] Error fetching watchlists:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load watchlists';
      setError(errorMessage);
      setAllWatchlists([]);
      setWatchlistItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load items for a specific watchlist
  const loadWatchlistItems = useCallback((watchlist: Watchlist) => {
    if (!watchlist.Symbols || watchlist.Symbols.length === 0) {
      setWatchlistItems([]);
      return;
    }
    
    const symbolIDsArray = watchlist.SymbolIDs 
      ? watchlist.SymbolIDs.split(',').map((id: string) => parseInt(id.trim())).filter((id: number) => !isNaN(id))
      : [];
    
    const transformedItems = watchlist.Symbols.map((symbol: WatchlistSymbol, index: number) => {
      const item = transformWatchlistSymbolToItem(symbol);
      if (symbolIDsArray[index]) {
        item.symbolID = symbolIDsArray[index].toString();
      } else {
        const found = availableSymbols.find(s => 
          s.symbol === symbol.Symbol || 
          s.symbol.replace(/\//g, '') === symbol.Symbol.replace(/\//g, '')
        );
        if (found && found.symbolID) {
          item.symbolID = found.symbolID.toString();
        }
      }
      return item;
    });
    
    setWatchlistItems(transformedItems);
  }, [availableSymbols]);

  // Load data when panel opens
  useEffect(() => {
    if (isOpen) {
      fetchAllWatchlists();
    }
  }, [isOpen, fetchAllWatchlists]);

  // Reload items when selected watchlist changes
  useEffect(() => {
    if (selectedWatchlistId && allWatchlists.length > 0) {
      const watchlist = allWatchlists.find(w => w.WatchlistID === selectedWatchlistId);
      if (watchlist) {
        loadWatchlistItems(watchlist);
      }
    }
  }, [selectedWatchlistId, allWatchlists, loadWatchlistItems]);

  // Handle watchlist selection
  const handleWatchlistChange = (watchlistId: string) => {
    setSelectedWatchlistId(watchlistId);
    setShowSettings(false);
  };

  // Handle symbol input change for autocomplete
  const handleSymbolInputChange = (value: string) => {
    setNewSymbolInput(value);
    
    if (value.trim().length > 0 && availableSymbols.length > 0) {
      const filtered = availableSymbols
        .filter(item => 
          item.symbol?.toLowerCase().includes(value.toLowerCase()) ||
          item.name?.toLowerCase().includes(value.toLowerCase())
        )
        .slice(0, 10);
      
      setSymbolSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setSymbolSuggestions([]);
      setShowSuggestions(false);
    }
  };

  // Get logo and color for symbol (helper function)
  const getSymbolLogo = (symbol: string): { logo: string; color: string } => {
    // Simple logo extraction - first character
    const logo = symbol.charAt(0);
    
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

  // Handle adding symbol from suggestion (immediately saves)
  const handleAddSymbolFromSuggestion = async (selectedSymbol: { symbol: string; symbolID: number | null; name: string | null }) => {
    if (!selectedWatchlistId) {
      setError('No watchlist selected. Please select a watchlist first.');
      return;
    }

    const symbolInput = selectedSymbol.symbol.trim().toUpperCase();
    const normalizedInput = normalizeSymbolForMatching(symbolInput);
    
    if (watchlistItems.some(s => normalizeSymbolForMatching(s.symbol) === normalizedInput)) {
      setError(`${symbolInput} is already in the watchlist`);
      setTimeout(() => setError(null), 3000);
      return;
    }
    
    if (!selectedSymbol.symbolID) {
      setError(`Symbol ID not found for ${selectedSymbol.symbol}.`);
      setTimeout(() => setError(null), 5000);
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      
      const symbolIDNum = Number(selectedSymbol.symbolID);
      if (isNaN(symbolIDNum) || symbolIDNum <= 0) {
        setError(`Invalid Symbol ID for ${selectedSymbol.symbol}.`);
        setTimeout(() => setError(null), 5000);
        return;
      }
      
      let existingSymbolIDs: string[] = [];
      try {
        const currentWatchlistResponse = await getWatchlists(selectedWatchlistId.toString());
        if (currentWatchlistResponse && currentWatchlistResponse.Watchlists && currentWatchlistResponse.Watchlists.length > 0) {
          const currentWatchlist = currentWatchlistResponse.Watchlists.find(
            (w: any) => w.WatchlistID?.toString() === selectedWatchlistId.toString()
          ) || currentWatchlistResponse.Watchlists[0];
          
          if (currentWatchlist && currentWatchlist.SymbolIDs) {
            existingSymbolIDs = currentWatchlist.SymbolIDs.split(',')
              .map((id: string) => id.trim())
              .filter((id: string) => id && id.length > 0);
          }
        }
      } catch (err) {
        console.warn('[WatchlistPanel] Could not fetch existing symbols:', err);
      }
      
      const allSymbolIDs = [...new Set([...existingSymbolIDs, symbolIDNum.toString()])];
      const symbolsString = allSymbolIDs.join(',');
      
      await saveWatchlistSymbols({
        SaveWatchlistSymbols: parseInt(selectedWatchlistId),
        Symbols: symbolsString,
      });
      
      await fetchAllWatchlists();
      
    setIsAddSymbolOpen(false);
      setNewSymbolInput("");
      setShowSuggestions(false);
    } catch (err) {
      console.error('[WatchlistPanel] Failed to add symbol:', err);
      setError(err instanceof Error ? err.message : 'Failed to add symbol');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveSymbol = async (item: WatchlistItem) => {
    if (!selectedWatchlistId) {
      setError('No watchlist selected');
      return;
    }

    try {
      setIsSaving(true);
      
      let symbolID: number | null = null;
      const foundSymbol = availableSymbols.find(s => 
        s.symbol === item.symbol || 
        s.symbol === item.fullName ||
        s.symbol.replace(/\//g, '') === item.symbol.replace(/\//g, '')
      );
      
      if (foundSymbol && foundSymbol.symbolID) {
        symbolID = foundSymbol.symbolID;
      } else if (item.symbolID) {
        const parsed = parseInt(item.symbolID);
        if (parsed && !isNaN(parsed) && parsed > 0) {
          symbolID = parsed;
        }
      }
      
      if (!symbolID) {
        setError(`Symbol ID not found for ${item.symbol}.`);
        setIsSaving(false);
        return;
      }
      
      await deleteWatchlistSymbol({
        WatchlistID: parseInt(item.watchlistSymbolID),
        SymbolID: symbolID,
      });
      
      await fetchAllWatchlists();
    } catch (err) {
      console.error('[WatchlistPanel] Failed to delete symbol:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete symbol');
      await fetchAllWatchlists();
    } finally {
      setIsSaving(false);
    }
  };

  const handleDirectionChange = async (item: WatchlistItem, direction: Direction) => {
    try {
      setIsSaving(true);
      await updateWatchlistSymbol({
        UpdateWatchlistSymbol: parseInt(item.watchlistSymbolID),
        Field: "Direction",
        Val: direction === "Buy" ? "Long" : "Short",
      });
      await fetchAllWatchlists();
    } catch (err) {
      console.error('[WatchlistPanel] Failed to update direction:', err);
      setError(err instanceof Error ? err.message : 'Failed to update direction');
    } finally {
      setIsSaving(false);
    }
  };

  const handleOrderTypeChange = async (item: WatchlistItem, orderType: OrderType) => {
    try {
      setIsSaving(true);
      await updateWatchlistSymbol({
        UpdateWatchlistSymbol: parseInt(item.watchlistSymbolID),
        Field: "OrderType",
        Val: orderType,
      });
      await fetchAllWatchlists();
    } catch (err) {
      console.error('[WatchlistPanel] Failed to update order type:', err);
      setError(err instanceof Error ? err.message : 'Failed to update order type');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEntryPriceChange = async (item: WatchlistItem, entryPrice: string) => {
    if (entryPrice.trim() === "") {
      try {
        setIsSaving(true);
        await updateWatchlistSymbol({
          UpdateWatchlistSymbol: parseInt(item.watchlistSymbolID),
          Field: "Entry",
          Val: "",
        });
        await fetchAllWatchlists();
      } catch (err) {
        console.error('[WatchlistPanel] Failed to clear entry price:', err);
        setError(err instanceof Error ? err.message : 'Failed to clear entry price');
      } finally {
        setIsSaving(false);
      }
      return;
    }

    const numericValue = parseFloat(entryPrice);
    if (isNaN(numericValue)) {
      return;
    }

    try {
      setIsSaving(true);
      await updateWatchlistSymbol({
        UpdateWatchlistSymbol: parseInt(item.watchlistSymbolID),
        Field: "Entry",
        Val: numericValue,
      });
      await fetchAllWatchlists();
    } catch (err) {
      console.error('[WatchlistPanel] Failed to update entry price:', err);
      setError(err instanceof Error ? err.message : 'Failed to update entry price');
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusColor = (status: Status) => {
    switch (status) {
      case "Active":
        return "text-[#22c55e]";
      case "Pending":
        return "text-[#f59e0b]";
      case "Idea":
        return "text-[#3b82f6]";
      default:
        return "text-muted-foreground";
    }
  };

  const getRowBackground = (status: Status) => {
    if (status === "Active") {
      return "bg-[#22c55e]/10";
    }
    return "";
  };

  const toggleExpand = (symbol: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedSymbol(expandedSymbol === symbol ? null : symbol);
  };

  const selectedWatchlist = allWatchlists.find(w => w.WatchlistID === selectedWatchlistId);

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 top-[42px] bg-black/40 z-40 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Panel */}
      <div
        className={`fixed top-[42px] right-0 bottom-0 w-[460px] bg-widget-header border-l border-border z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Settings Slide-in - Inside the Panel */}
        {(showSettings || isSettingsClosing) && (
          <div className="absolute inset-0 z-50 flex">
            <div
              className={`flex-1 bg-black/50 backdrop-blur-sm transition-opacity duration-150 ${
                isSettingsClosing ? "opacity-0" : "opacity-100"
              }`}
              onClick={() => {
                setIsSettingsClosing(true);
                setIsSettingsAnimating(false); // Reset animation state
                setTimeout(() => {
                  setShowSettings(false);
                  setIsSettingsClosing(false);
                }, 150);
              }}
            />
            <div 
              className={`w-80 bg-widget-body border-l border-border flex flex-col transform transition-transform duration-150 ease-in-out ${
                isSettingsClosing 
                  ? "translate-x-full" 
                  : isSettingsAnimating 
                  ? "translate-x-full" 
                  : "translate-x-0"
              }`}
            >
              <div className="p-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Settings2 className="w-4 h-4 text-primary" />
                  <span className="text-foreground text-sm font-medium">Watchlist Settings</span>
                </div>
                <button
                  onClick={() => {
                    setIsSettingsClosing(true);
                    setIsSettingsAnimating(false); // Reset animation state
                    setTimeout(() => {
                      setShowSettings(false);
                      setIsSettingsClosing(false);
                    }, 300);
                  }}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-auto p-4 space-y-4">
                <div>
                  <label className="text-xs text-muted-foreground mb-2 block">
                    Select Watchlist
                  </label>
                  
                  <div className="space-y-2">
                    {/* FILTER: Hide watchlists with 0 symbols - can be removed later */}
                    {allWatchlists
                      .filter((watchlist) => (watchlist.Symbols?.length || 0) > 0)
                      .map((watchlist) => (
                      <div
                        key={watchlist.WatchlistID}
                        className={`flex items-center gap-2 p-2 rounded border transition-colors ${
                          selectedWatchlistId === watchlist.WatchlistID
                            ? 'bg-primary/20 text-primary border-primary'
                            : 'bg-widget-header/50 text-foreground hover:bg-widget-header border-transparent'
                        }`}
                      >
                        <button
                          onClick={() => {
                            handleWatchlistChange(watchlist.WatchlistID);
                            setIsSettingsClosing(true);
                            setIsSettingsAnimating(false); // Reset animation state
                            setTimeout(() => {
                              setShowSettings(false);
                              setIsSettingsClosing(false);
                            }, 300);
                          }}
                          className="flex-1 text-left"
                        >
                          <span className="text-sm truncate block">{watchlist.WatchlistName}</span>
                          <span className="text-xs text-muted-foreground">
                            {watchlist.Symbols?.length || 0} symbols
                          </span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* Header */}
        <div className="h-12 px-4 flex items-center justify-between border-b border-border bg-widget-header shrink-0">
          <div className="flex items-center gap-2">
            <h2 className="text-foreground text-lg font-semibold">
              Watchlist
              {selectedWatchlistId && (() => {
                const selectedWatchlist = allWatchlists.find(w => w.WatchlistID === selectedWatchlistId);
                return selectedWatchlist ? (
                  <>
                    <span className="text-muted-foreground mx-1">|</span>
                    <span className="text-primary">{selectedWatchlist.WatchlistName}</span>
                  </>
                ) : null;
              })()}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => {
                setIsSettingsClosing(false);
                setShowSettings(true);
              }}
            >
              <Settings2 className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onClose}
            >
            <X className="w-4 h-4" />
          </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">{/* Add Symbol Button */}
          {isAddSymbolOpen ? (
            <div className="px-4 py-3 bg-primary/10 border-b border-primary">
              <div className="relative">
                <Input
                  type="text"
                  value={newSymbolInput}
                  onChange={(e) => handleSymbolInputChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      setIsAddSymbolOpen(false);
                      setNewSymbolInput("");
                      setShowSuggestions(false);
                    }
                  }}
                  placeholder="Type symbol name..."
                  className="h-9 bg-widget-header border-primary text-base"
                  autoFocus
                  disabled={isSaving}
                />
                {showSuggestions && symbolSuggestions.length > 0 && (
                  <div
                    ref={suggestionRef}
                    className="absolute top-full left-0 right-0 z-50 bg-widget-body border border-primary rounded mt-1 max-h-64 overflow-y-auto shadow-lg"
                    onMouseDown={(e) => {
                      e.preventDefault();
                    }}
                  >
                    {symbolSuggestions.map((item) => {
                      const { logo, color } = getSymbolLogo(item.symbol);
                      return (
                        <div
                          key={item.symbol}
                          className="p-2 cursor-pointer hover:bg-primary/10 border-b border-border/30 last:border-0 transition-colors"
                          onClick={async (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            await handleAddSymbolFromSuggestion(item);
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-7 h-7 rounded-full flex items-center justify-center text-white text-sm font-semibold shrink-0"
                              style={{ backgroundColor: color }}
                            >
                              {logo}
                  </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-foreground text-sm font-medium truncate">{item.symbol}</div>
                              {item.name && item.name !== item.symbol && (
                                <div className="text-muted-foreground text-xs truncate">{item.name}</div>
                              )}
                </div>
                </div>
              </div>
                      );
                    })}
                  </div>
                )}
                </div>
              <div className="flex gap-2 mt-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setIsAddSymbolOpen(false);
                    setNewSymbolInput("");
                    setShowSuggestions(false);
                  }}
                  className="h-7 px-2 text-xs"
                  disabled={isSaving}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
          <button 
              className="w-full px-4 py-3 text-sm font-medium text-muted-foreground hover:text-primary hover:bg-popover transition-colors flex items-center gap-2 border-b border-border"
            onClick={() => setIsAddSymbolOpen(true)}
              disabled={loading || isSaving}
          >
            <Plus className="w-4 h-4" />
            Add Symbol
          </button>
          )}

          {/* Loading State */}
          {loading ? (
            <div className="flex items-center justify-center h-full py-12">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Loading watchlist...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full py-12 px-4">
              <div className="flex flex-col items-center gap-3 max-w-md text-center">
                <p className="text-sm text-destructive font-medium">{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchAllWatchlists}
                  className="text-xs mt-2"
                >
                  Retry
                </Button>
              </div>
            </div>
          ) : watchlistItems.length === 0 ? (
            <div className="flex items-center justify-center h-full min-h-[200px] py-12 px-4 text-center">
              <div className="flex flex-col items-center gap-3">
                <p className="text-sm font-medium text-foreground">No watchlist items found</p>
                <p className="text-xs text-muted-foreground max-w-sm">
                  Your watchlist is empty. Add symbols to your watchlist to see them here.
                </p>
              </div>
            </div>
          ) : (
            watchlistItems.map((item, index) => (
              <div key={item.id}>
                <div 
                  className={`px-4 py-3 border-b border-border hover:bg-popover transition-colors ${
                    index % 2 === 0 ? 'bg-[#22c55e]/5' : 'bg-black'
                  }`}
                >
                  {/* Compact Header */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => toggleExpand(item.symbol, e)}
                        className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                      >
                        {expandedSymbol === item.symbol ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </button>
                      {(() => {
                        const { logo, color } = getSymbolLogo(item.symbol);
                        return (
                          <div 
                            className="w-7 h-7 rounded-full flex items-center justify-center text-white text-sm font-semibold shrink-0"
                            style={{ backgroundColor: color }}
                          >
                            {logo}
                          </div>
                        );
                      })()}
                      <div>
                        <div className="text-base font-semibold text-foreground">{item.symbol}</div>
                        <div className="text-xs text-muted-foreground truncate">{item.fullName}</div>
        </div>
      </div>

                    <div className="text-lg font-semibold text-foreground">
                      ${item.currPrice}
                    </div>

                    <div className="flex items-center gap-2">
                      <div className={`flex items-center gap-1 px-2 py-1 rounded text-sm font-medium ${
                        parseFloat(item.change) >= 0 
                          ? 'bg-[#22c55e]/40 text-[#22c55e]' 
                          : 'bg-[#ef4444]/40 text-[#ef4444]'
                      }`}>
                        {parseFloat(item.change) >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                        {item.changePercent}
                      </div>
                    </div>
                  </div>

                  {/* Controls Grid */}
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div onClick={(e) => e.stopPropagation()}>
                      <div className="text-muted-foreground mb-1 text-xs font-medium">Direction</div>
                      <Select 
                        value={item.direction} 
                        onValueChange={(value: Direction) => handleDirectionChange(item, value)}
                        disabled={isSaving}
                      >
                        <SelectTrigger className="h-7 !bg-black border-border/50 text-sm px-2 font-medium">
                          <div className="flex items-center gap-1.5">
                            {item.direction === "Buy" ? (
                              <TrendingUp className="w-3.5 h-3.5 text-[#22c55e]" />
                            ) : (
                              <TrendingDown className="w-3.5 h-3.5 text-[#ef4444]" />
                            )}
                            <span className="text-sm font-medium">{item.direction}</span>
                          </div>
                        </SelectTrigger>
                        <SelectContent className="!bg-black">
                          <SelectItem value="Buy" className="!bg-black hover:!bg-black/80">
                            <div className="flex items-center gap-2">
                              <TrendingUp className="w-3.5 h-3.5 text-[#22c55e]" />
                              <span>Buy</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="Sell" className="!bg-black hover:!bg-black/80">
                            <div className="flex items-center gap-2">
                              <TrendingDown className="w-3.5 h-3.5 text-[#ef4444]" />
                              <span>Sell</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
            </div>

                    <div onClick={(e) => e.stopPropagation()}>
                      <div className="text-muted-foreground mb-1 text-xs font-medium">Order</div>
              <Select
                        value={item.orderType} 
                        onValueChange={(value: OrderType) => handleOrderTypeChange(item, value)}
                        disabled={isSaving}
                      >
                        <SelectTrigger className="h-7 !bg-black border-border/50 text-sm px-2 font-medium">
                          <span className="text-foreground text-sm truncate font-medium">{item.orderType}</span>
                </SelectTrigger>
                <SelectContent className="!bg-black">
                          <SelectItem value="Market" className="!bg-black hover:!bg-black/80">Market</SelectItem>
                          <SelectItem value="Buy Limit" className="!bg-black hover:!bg-black/80">Buy Limit</SelectItem>
                          <SelectItem value="Sell Limit" className="!bg-black hover:!bg-black/80">Sell Limit</SelectItem>
                          <SelectItem value="Buy Stop" className="!bg-black hover:!bg-black/80">Buy Stop</SelectItem>
                          <SelectItem value="Sell Stop" className="!bg-black hover:!bg-black/80">Sell Stop</SelectItem>
                </SelectContent>
              </Select>
            </div>

                    <div onClick={(e) => e.stopPropagation()}>
                      <div className="text-muted-foreground mb-1 text-xs font-medium">Entry</div>
              <Input
                        type="text"
                        value={item.entryPrice}
                        onChange={(e) => {
                          // Optimistic update
                          setWatchlistItems(watchlistItems.map(i => 
                            i.id === item.id ? { ...i, entryPrice: e.target.value } : i
                          ));
                        }}
                        onBlur={(e) => {
                          if (e.target.value !== item.entryPrice) {
                            handleEntryPriceChange(item, e.target.value);
                          }
                        }}
                        placeholder={item.orderType === "Market" ? "—" : "0.00"}
                        disabled={item.orderType === "Market" || isSaving}
                        className="h-7 bg-widget-header border-border/50 text-foreground text-sm font-medium disabled:opacity-50 px-2"
              />
            </div>
          </div>
                </div>

                {/* Expanded Section - Placeholder for future chart */}
                {expandedSymbol === item.symbol && (
                  <div className="px-4 py-4 bg-widget-header/30 border-b border-border min-h-[100px]">
                    <div className="text-xs text-muted-foreground mb-3 border-b border-border pb-2">
                      Chart View - {item.symbol}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Chart implementation coming soon
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

    </>
  );
}
